(() => {
  // src/lib/post.js
  var VS = `
attribute vec2 p; varying vec2 uv;
void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
  var FS_HI = `
precision highp float; varying vec2 uv; uniform sampler2D src; uniform vec2 texel;
void main(){
  // box-average a 4x4 block (INTER_AREA downsample), then keep only what is above ~120/255
  vec3 s = vec3(0.0);
  for (int j = 0; j < 4; j++) for (int i = 0; i < 4; i++)
    s += texture2D(src, uv + (vec2(float(i), float(j)) - 1.5) * texel).rgb;
  s /= 16.0;
  vec3 hl = clamp((s - 120.0/255.0) / (135.0/255.0), 0.0, 1.0) * s;
  gl_FragColor = vec4(hl, 1.0);
}`;
  var FS_BLUR = `
precision highp float; varying vec2 uv; uniform sampler2D src; uniform vec2 dir; uniform float sigma;
void main(){
  vec3 acc = vec3(0.0); float wsum = 0.0;
  for (int k = -48; k <= 48; k++) {
    float x = float(k);
    if (abs(x) > sigma * 3.0) continue;
    float w = exp(-0.5 * x * x / (sigma * sigma));
    acc += texture2D(src, uv + dir * x).rgb * w; wsum += w;
  }
  gl_FragColor = vec4(acc / wsum, 1.0);
}`;
  var FS_FINAL = `
precision highp float; varying vec2 uv;
uniform sampler2D src; uniform sampler2D b5; uniform sampler2D b16;
uniform float t; uniform float frame; uniform float fade; uniform vec2 res;
uniform float halo; uniform float grainAmt;
float h(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
float gauss(vec2 p){ // ~N(0,1) from four hashes (Irwin-Hall), decorrelated per frame
  float s = h(p + frame * 1.37) + h(p * 1.13 + 7.1 + frame * 2.11) + h(p * 0.87 + 3.3 + frame * 0.73) + h(p * 1.31 + 11.7 + frame * 1.91);
  return (s - 2.0) * 1.732;
}
void main(){
  vec3 f = texture2D(src, uv).rgb;
  // halation: screen blend with 0.5 * soft highlights
  vec3 hb = 0.6 * texture2D(b5, uv).rgb + 0.4 * texture2D(b16, uv).rgb;
  f = 1.0 - (1.0 - f) * (1.0 - halo * hb);
  // filmic S-curve
  f = f * (1.0 - 0.35) + 0.35 * (f * f * (3.0 - 2.0 * f));
  // vignette
  vec2 q = (uv - 0.5) * 2.0;
  float r = clamp((q.x * q.x + q.y * q.y) / 2.0, 0.0, 1.0);
  f *= 1.0 - 0.38 * pow(r, 1.15);
  // exposure flicker
  f *= 1.0 + 0.018 * sin(t * 6.2831853 * 0.9) + 0.012 * sin(t * 6.2831853 * 2.3 + 1.0);
  // grain: softly blurred gaussian, a little stronger in the midtones
  vec2 px = uv * res;
  float n = (gauss(px) * 0.4 + gauss(px + vec2(1.0, 0.0)) * 0.2 + gauss(px + vec2(0.0, 1.0)) * 0.2 + gauss(px + vec2(1.0, 1.0)) * 0.2);
  float L = (f.r + f.g + f.b) / 3.0;
  f += n * grainAmt * (0.55 + 0.45 * (1.0 - abs(2.0 * L - 1.0)));
  f *= fade;
  gl_FragColor = vec4(clamp(f, 0.0, 1.0), 1.0);
}`;
  function compile(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(gl, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, "p");
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }
  function target(gl, w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fb, w, h };
  }
  function createPost(canvas) {
    const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
    const W = canvas.width, H = canvas.height, qw = Math.round(W / 4), qh = Math.round(H / 4);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const pHi = program(gl, FS_HI), pBlur = program(gl, FS_BLUR), pFin = program(gl, FS_FINAL);
    const srcTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, srcTex);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    const hi = target(gl, qw, qh), tA = target(gl, qw, qh), b5 = target(gl, qw, qh), b16 = target(gl, qw, qh);
    const draw = (prog, out, uniforms) => {
      gl.useProgram(prog);
      gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.fb : null);
      gl.viewport(0, 0, out ? out.w : W, out ? out.h : H);
      let unit = 0;
      for (const [name, v] of Object.entries(uniforms)) {
        const loc = gl.getUniformLocation(prog, name);
        if (v && v.tex !== void 0) {
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, v.tex);
          gl.uniform1i(loc, unit++);
        } else if (Array.isArray(v)) gl.uniform2f(loc, v[0], v[1]);
        else gl.uniform1f(loc, v);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    const blur = (from, sigma) => {
      draw(pBlur, tA, { src: from, dir: [1 / qw, 0], sigma });
      const out = sigma < 10 ? b5 : b16;
      draw(pBlur, out, { src: tA, dir: [0, 1 / qh], sigma });
    };
    return function grade(paint, t, opts = {}) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, srcTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, paint);
      const src = { tex: srcTex };
      draw(pHi, hi, { src, texel: [1 / W, 1 / H] });
      blur(hi, 5);
      blur(hi, 16);
      draw(pFin, null, {
        src,
        b5,
        b16,
        t,
        frame: Math.round(t * 25),
        fade: opts.fade ?? 1,
        res: [W, H],
        halo: opts.halo ?? 0.5,
        grainAmt: opts.grain ?? 6 / 255
      });
    };
  }

  // src/lib/rng.js
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = a + 1831565813 >>> 0;
      let t = a;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function hash(...n) {
    let h = 2166136261;
    for (const v of n) {
      h ^= v | 0;
      h = Math.imul(h, 16777619);
    }
    h ^= h >>> 13;
    h = Math.imul(h, 1540483477);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
  }
  var fade = (t) => t * t * (3 - 2 * t);
  function noise1(x, seed = 0) {
    const i = Math.floor(x), f = x - i;
    const a = hash(i, seed) * 2 - 1, b = hash(i + 1, seed) * 2 - 1;
    return a + (b - a) * fade(f);
  }
  function noise2(x, y, seed = 0) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
    const u = fade(fx), v = fade(fy);
    return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
  }
  var clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;

  // src/lib/ink.js
  var INK = "#f2f0ea";
  function taper(ctx, pts, w, color = INK) {
    if (pts.length < 2) return;
    const L = [], R = [];
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const d = Math.hypot(dx, dy) || 1;
      dx /= d;
      dy /= d;
      const hw = (typeof w === "function" ? w(i / (n - 1)) : w) / 2;
      L.push([p[0] - dy * hw, p[1] + dx * hw]);
      R.push([p[0] + dy * hw, p[1] - dx * hw]);
    }
    ctx.beginPath();
    ctx.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(L[i][0], L[i][1]);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  // src/lib/paths.js
  function smoothPath(ctx, pts, closed = false, tension = 0.5) {
    const n = pts.length;
    if (n < 2) return;
    const P = (i) => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    ctx.moveTo(pts[0][0], pts[0][1]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const k = tension / 3;
      ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1]);
    }
    if (closed) ctx.closePath();
  }
  function sampleCurve(pts, per = 8, closed = false) {
    const n = pts.length, out = [];
    const P = (i) => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      for (let j = 0; j < per; j++) {
        const t = j / per, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
      }
    }
    out.push(closed ? pts[0] : pts[n - 1]);
    return out;
  }

  // src/lib/sites.js
  var font = (ctx, spec, stretch = "normal") => {
    ctx.font = spec;
    ctx.fontStretch = stretch;
  };
  var PAGE_W = 2206;
  var PAGE_H = 946;
  var SOKO_BG = "#030303";
  var FRAMED = {
    x: 162.36,
    y: 132.85,
    sx: 0.842616,
    sy: 0.847317,
    w: PAGE_W * 0.842616,
    h: PAGE_H * 0.847317,
    quad: { a: 160.083837, b: 0.8487982, c: -29e-7 },
    screen: { x0: 144, y0: 128.5, x1: 2023, y1: 946 },
    glowRect: { x0: 137, y0: 121.5, x1: 2030, y1: 946 }
  };
  var toFramed = (px, py) => [FRAMED.x + FRAMED.sx * px, FRAMED.y + FRAMED.sy * py];
  var HEADER = { x: 36.96, y: 62.14, w: 2114.23, h: 207.12 };
  var HEADER_FRAMED = (() => {
    const [x0, y0] = toFramed(HEADER.x, HEADER.y), [x1, y1] = toFramed(HEADER.x + HEADER.w, HEADER.y + HEADER.h);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  })();
  var NAV = [
    // icon x, label x, label, sub-label
    [1275, 1302, "objects", "IN 1 \xB7 instruments / tools / spares"],
    [1550, 1577, "radio", "IN 2 \xB7 live / archive / zine"],
    [1785, 1812, "store", "IN 3 \xB7 cart / offers / gift"],
    [2013, 2041, "index", "IN 4 \xB7 manuals / support"]
  ];
  function drawSokoRail(ctx) {
    ctx.save();
    ctx.fillStyle = "#e4e4e1";
    ctx.beginPath();
    ctx.arc(31, 26, 17, 0, Math.PI * 2);
    ctx.fill();
    roundRect(ctx, 46, 7.5, 18.5, 37.5, 2.2);
    ctx.fill();
    ctx.fillStyle = "#d8cf2a";
    ctx.fillRect(30.6, 13.5, 2.4, 8.5);
    font(ctx, "300 17.75px Geist");
    ctx.letterSpacing = "0.5px";
    ctx.fillStyle = "rgba(226,226,223,0.86)";
    ctx.fillText("s\u014Dko", 77, 23);
    ctx.fillText("objects", 77, 41.5);
    for (const [ix, lx, label, sub3] of NAV) {
      const g = ctx.createRadialGradient(ix, 25.5, 4, ix, 25.5, 16);
      g.addColorStop(0, "rgba(90,92,92,0.9)");
      g.addColorStop(0.55, "rgba(34,36,36,0.95)");
      g.addColorStop(1, "rgba(10,10,10,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(ix, 25.5, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(120,122,122,0.55)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(ix, 26, 12.5, 0.35, Math.PI - 0.35);
      ctx.stroke();
      ctx.fillStyle = "rgba(225,228,228,0.35)";
      ctx.beginPath();
      ctx.arc(ix, 25.5, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e2e5e6";
      ctx.beginPath();
      ctx.arc(ix, 25.5, 6.4, 0, Math.PI * 2);
      ctx.fill();
      font(ctx, "400 16.5px Geist");
      ctx.letterSpacing = "0.5px";
      ctx.fillStyle = "rgba(228,228,225,0.82)";
      ctx.fillText(label, lx, 24.5);
      font(ctx, "400 9.3px 'Geist Mono'");
      ctx.letterSpacing = "0px";
      ctx.fillStyle = "rgba(160,162,160,0.62)";
      ctx.fillText(sub3, lx + 1, 39.5);
    }
    ctx.fillStyle = "rgba(200,202,200,0.8)";
    ctx.beginPath();
    ctx.arc(2203, 26, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.letterSpacing = "0px";
    ctx.restore();
  }
  function drawSokoHeadline(ctx, { color = "#f1f0ec" } = {}) {
    ctx.save();
    font(ctx, "900 79px Archivo", "expanded");
    ctx.letterSpacing = "-1.75px";
    ctx.fillStyle = color;
    ctx.fillText("MIXING DOWN,", 64, 148);
    ctx.fillText("LATE AT NIGHT.", 64, 222);
    ctx.letterSpacing = "0px";
    ctx.restore();
  }
  function drawSokoCounter(ctx, { counter = "000.0" } = {}) {
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(1900, 158, 190, 8);
    ctx.fillStyle = "#1b1c14";
    ctx.fillRect(1900, 90, 190, 72);
    ctx.strokeStyle = "rgba(60,62,50,0.6)";
    ctx.lineWidth = 1;
    ctx.strokeRect(1900.5, 90.5, 189, 71);
    font(ctx, "400 49.25px 'Geist Mono'");
    ctx.letterSpacing = "1.75px";
    ctx.fillStyle = "#efebd6";
    ctx.shadowColor = "rgba(240,236,214,0.35)";
    ctx.shadowBlur = 6;
    ctx.save();
    ctx.translate(0, 110);
    ctx.scale(1, 0.95);
    ctx.translate(0, -110);
    ctx.fillText(counter, 1919, 147);
    ctx.restore();
    ctx.shadowBlur = 0;
    ctx.letterSpacing = "0px";
    ctx.fillStyle = "#f5da0c";
    roundRect(ctx, 1904, 174.5, 47, 45, 5.5);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    roundRect(ctx, 1906, 176, 43, 8, 4);
    ctx.fill();
    ctx.fillStyle = "rgba(255,252,230,0.85)";
    ctx.beginPath();
    ctx.moveTo(1921.5, 191);
    ctx.lineTo(1930, 196.5);
    ctx.lineTo(1921.5, 202);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // src/shots/s17/ill.js
  var PW = 2206;
  var PH = 946;
  var PI = Math.PI;
  var BLK = "#040404";
  var W1 = "rgba(236,235,230,0.95)";
  var clamp2 = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  var lerp = (a, b, t) => a + (b - a) * t;
  var sstep = (a, b, x) => {
    const t = clamp2((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  var grey = (v, a = 1) => {
    const c = Math.round(clamp2(v) * 255);
    return a >= 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`;
  };
  var P2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  var bil = (q, u, v) => P2(P2(q[0], q[1], u), P2(q[3], q[2], u), v);
  var dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  var polyPath = (g, pts) => {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
  };
  var blobPath = (g, pts) => {
    g.beginPath();
    smoothPath(g, pts, true);
  };
  var TA = null;
  var TB = null;
  function scratch(c, w, h) {
    if (!c || c.width < w || c.height < h) {
      c = document.createElement("canvas");
      c.width = Math.max(w, c ? c.width : 0);
      c.height = Math.max(h, c ? c.height : 0);
    }
    return c;
  }
  function blurDraw(g, bb, blur, draw) {
    const m = g.getTransform(), pad = blur * 3 + 2, xs = [], ys = [];
    for (const [x, y] of [[bb[0] - pad, bb[1] - pad], [bb[2] + pad, bb[1] - pad], [bb[0] - pad, bb[3] + pad], [bb[2] + pad, bb[3] + pad]]) {
      xs.push(m.a * x + m.c * y + m.e);
      ys.push(m.b * x + m.d * y + m.f);
    }
    const dx = Math.floor(Math.min(...xs)), dy = Math.floor(Math.min(...ys)), w = Math.ceil(Math.max(...xs)) - dx, h = Math.ceil(Math.max(...ys)) - dy;
    if (w <= 0 || h <= 0) return;
    TA = scratch(TA, w, h);
    TB = scratch(TB, w, h);
    const a = TA.getContext("2d", { willReadFrequently: true }), b = TB.getContext("2d", { willReadFrequently: true });
    a.setTransform(1, 0, 0, 1, 0, 0);
    a.clearRect(0, 0, w, h);
    a.setTransform(m.a, m.b, m.c, m.d, m.e - dx, m.f - dy);
    draw(a);
    b.setTransform(1, 0, 0, 1, 0, 0);
    b.clearRect(0, 0, w, h);
    b.filter = `blur(${(blur * Math.hypot(m.a, m.b)).toFixed(2)}px)`;
    b.drawImage(TA, 0, 0, w, h, 0, 0, w, h);
    b.filter = "none";
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(TB, 0, 0, w, h, dx, dy, w, h);
    g.restore();
  }
  var bboxOf = (pts, pad = 0) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of pts) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
  };
  var E = (x, y, rx, ry, a = 0) => Object.assign((c) => c.ellipse(x, y, rx, ry, a, 0, PI * 2), { bb: [x - Math.max(rx, ry), y - Math.max(rx, ry), x + Math.max(rx, ry), y + Math.max(rx, ry)] });
  var Rc = (x, y, w, h) => Object.assign((c) => c.rect(x, y, w, h), { bb: [x, y, x + w, y + h] });
  function fillPoly(g, pts, color = BLK) {
    polyPath(g, pts);
    g.fillStyle = color;
    g.fill();
  }
  function fillBlob(g, pts, color = BLK) {
    blobPath(g, pts);
    g.fillStyle = color;
    g.fill();
  }
  function dot(g, x, y, r, color = W1) {
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, y, r, 0, PI * 2);
    g.fill();
  }
  function ring(g, x, y, r, w, color = W1, a0 = 0, a1 = PI * 2) {
    g.strokeStyle = color;
    g.lineWidth = w;
    g.beginPath();
    g.arc(x, y, r, a0, a1);
    g.stroke();
  }
  function ink(g, pts, w = 2, color = BLK, { closed = false, seed = 1, ends = 0.7, jit = 0.4 } = {}) {
    const r = rng(seed);
    const q = closed ? [...pts, pts[0]] : pts;
    const dense = [];
    for (let i = 0; i < q.length - 1; i++) {
      const [x0, y0] = q[i], [x1, y1] = q[i + 1], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6));
      for (let k = 0; k < n; k++) dense.push([x0 + (x1 - x0) * (k / n) + (r() - 0.5) * jit, y0 + (y1 - y0) * (k / n) + (r() - 0.5) * jit]);
    }
    dense.push(q[q.length - 1]);
    taper(g, dense, (u) => w * (ends + (1 - ends) * Math.sin(PI * u)), color);
  }
  function curve(g, pts, w = 2, color = BLK, { closed = false, seed = 1, ends = 0.4, jit = 0.3 } = {}) {
    const r = rng(seed);
    const q = sampleCurve(pts, 8, closed).map(([x, y]) => [x + (r() - 0.5) * jit, y + (r() - 0.5) * jit]);
    taper(g, q, (u) => w * (ends + (1 - ends) * Math.pow(Math.sin(PI * u), 0.5)), color);
  }
  function stripes(g, q, { per = 5, cov = 0.5, lum = 0.92, seed = 1, dir = "v", jit = 0.3, brk = 0.5, wav = 0.5, lumJit = 0.22, base = true } = {}) {
    if (base) fillPoly(g, q);
    const r = rng(seed);
    const cf = typeof cov === "number" ? () => cov : cov;
    const [A2, B2, Cc, D2] = dir === "v" ? q : [q[0], q[3], q[2], q[1]];
    const lenS = (dist(A2, B2) + dist(D2, Cc)) / 2, lenT = (dist(A2, D2) + dist(B2, Cc)) / 2;
    const n = Math.max(1, Math.round(lenS / per));
    const step = 2.5, m = Math.max(2, Math.ceil(lenT / step));
    g.save();
    polyPath(g, q);
    g.clip();
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5 + (r() - 0.5) * jit) / n;
      const wMul = 0.78 + r() * 0.4, lm = lum * (1 - lumJit + lumJit * r()), ph = r() * 100, ph2 = r() * 100, ph3 = r() * 100;
      let seg = [], ws = [];
      const flush = () => {
        if (seg.length > 1) taper(g, seg, (s) => ws[Math.min(ws.length - 1, Math.round(s * (ws.length - 1)))], grey(lm));
        seg = [];
        ws = [];
      };
      for (let k = 0; k <= m; k++) {
        const t = k / m, L = t * lenT;
        const p0 = dir === "v" ? bil(q, u, t) : bil(q, t, u);
        const c = clamp2(cf(u, t) * wMul * (1 + 0.28 * noise1(L / 34 + ph3, i + 3 * seed)));
        const b = noise1(L / (per * 5) + ph, i + seed);
        const gap = c < 0.9 && b > 1 - brk * 0.55 * (1 - c);
        const off = noise1(L / 26 + ph2, seed + 7) * wav;
        const nx = dir === "v" ? off : 0, ny = dir === "v" ? 0 : off;
        if (c < 0.04 || gap) {
          flush();
          continue;
        }
        seg.push([p0[0] + nx, p0[1] + ny]);
        ws.push(Math.min(per * 1.05, per * c));
      }
      flush();
    }
    g.restore();
  }
  var VAL = null;
  var VALD = null;
  function valCtx() {
    if (!VAL) {
      VAL = document.createElement("canvas");
      VAL.width = PW;
      VAL.height = PH;
    }
    VALD = null;
    const v = VAL.getContext("2d", { willReadFrequently: true });
    return v;
  }
  function valPrepare(x0, y0, x1, y1) {
    x0 = Math.max(0, Math.floor(x0) - 4);
    y0 = Math.max(0, Math.floor(y0) - 4);
    x1 = Math.min(PW, Math.ceil(x1) + 4);
    y1 = Math.min(PH, Math.ceil(y1) + 4);
    VALD = { x0, y0, w: x1 - x0, h: y1 - y0, d: VAL.getContext("2d", { willReadFrequently: true }).getImageData(x0, y0, x1 - x0, y1 - y0).data };
  }
  function valAt(x, y) {
    const D2 = VALD;
    const xi = Math.max(0, Math.min(D2.w - 1, Math.round(x) - D2.x0)), yi = Math.max(0, Math.min(D2.h - 1, Math.round(y) - D2.y0));
    return D2.d[(yi * D2.w + xi) * 4] / 255;
  }
  function hatch2(g, clipPts, { ang, per = 4, lum = 0.95, seed = 1, step = 2.2, jit = 0.35, gamma = 1, wMax = 1.08, base = true, baseV = 0, smooth = true, lumJit = 0.18, inv = false, alpha = 1, brk = 0, wn = 0 } = {}) {
    const angF = typeof ang === "number" ? () => ang : ang;
    if (base) {
      if (smooth) fillBlob(g, clipPts, grey(baseV));
      else fillPoly(g, clipPts, grey(baseV));
    }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of clipPts) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, a0 = angF(cx, cy), nx = -Math.sin(a0), ny = Math.cos(a0);
    const half = Math.hypot(x1 - x0, y1 - y0) / 2 + per;
    valPrepare(x0, y0, x1, y1);
    const r = rng(seed);
    g.save();
    g.beginPath();
    if (smooth) smoothPath(g, clipPts, true);
    else {
      g.moveTo(clipPts[0][0], clipPts[0][1]);
      for (const p of clipPts.slice(1)) g.lineTo(p[0], p[1]);
      g.closePath();
    }
    g.clip();
    const inBox = (x, y) => x > x0 - 4 && x < x1 + 4 && y > y0 - 4 && y < y1 + 4;
    for (let s = -half; s <= half; s += per) {
      const off = s + (r() - 0.5) * per * jit;
      const sx = cx + nx * off, sy = cy + ny * off;
      const wMul = 0.85 + r() * 0.3, lm = lum * (1 - lumJit + lumJit * r());
      const pts = [];
      for (const dir of [-1, 1]) {
        let x = sx, y = sy;
        const seg = [];
        for (let k = 0; k < 2e3 && inBox(x, y); k++) {
          const a = angF(x, y);
          x += Math.cos(a) * step * dir;
          y += Math.sin(a) * step * dir;
          seg.push([x, y]);
        }
        if (dir < 0) pts.push(...seg.reverse(), [sx, sy]);
        else pts.push(...seg);
      }
      let run = [], ws = [];
      const flush = () => {
        if (run.length > 1) taper(g, run, (u) => ws[Math.min(ws.length - 1, Math.round(u * (ws.length - 1)))], grey(lm, alpha));
        run = [];
        ws = [];
      };
      const ph = r() * 100, li = Math.round(s / per);
      for (let k = 0; k < pts.length; k++) {
        const [x, y] = pts[k];
        const vv = inv ? 1 - valAt(x, y) : valAt(x, y);
        let w = per * Math.min(wMax, Math.pow(vv, gamma) * wMul * (1 + wn * noise1(k * step / 14 + ph, li + seed)));
        if (brk && vv < 0.92 && noise1(k * step / (per * 4) + ph * 2, li * 7 + seed) > 1 - brk * 1.3 * (1 - vv)) w = 0;
        if (w < 0.22) {
          flush();
          continue;
        }
        run.push([x, y]);
        ws.push(w);
      }
      flush();
    }
    g.restore();
  }
  function curveField(curves, [x0, y0, x1, y1], cell = 6, fallback = PI / 2) {
    const samples = [];
    for (const c of curves) {
      const q = sampleCurve(c, 6);
      for (let i = 0; i < q.length - 1; i++) {
        const dx = q[i + 1][0] - q[i][0], dy = q[i + 1][1] - q[i][1], a = Math.atan2(dy, dx);
        samples.push([q[i][0], q[i][1], Math.cos(2 * a), Math.sin(2 * a)]);
      }
    }
    const nx = Math.ceil((x1 - x0) / cell) + 1, ny = Math.ceil((y1 - y0) / cell) + 1, grid = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = x0 + i * cell, y = y0 + j * cell;
      let sc = 0, ss = 0;
      for (const [px, py, c2, s2] of samples) {
        const w = 1 / ((px - x) ** 2 + (py - y) ** 2 + 40);
        sc += c2 * w;
        ss += s2 * w;
      }
      grid[j * nx + i] = samples.length ? Math.atan2(ss, sc) / 2 : fallback;
    }
    return (x, y) => {
      const fi = clamp2((x - x0) / cell, 0, nx - 1), fj = clamp2((y - y0) / cell, 0, ny - 1), i = Math.round(fi), j = Math.round(fj);
      return grid[j * nx + i];
    };
  }
  function vFill(v, pts, val, { blur = 0, smooth = true, alpha = 1 } = {}) {
    VALD = null;
    const draw = (c) => {
      c.beginPath();
      if (smooth) smoothPath(c, pts, true);
      else {
        c.moveTo(pts[0][0], pts[0][1]);
        for (const p of pts.slice(1)) c.lineTo(p[0], p[1]);
        c.closePath();
      }
      c.fillStyle = typeof val === "number" ? grey(val) : val;
      c.fill();
    };
    v.save();
    v.globalAlpha = alpha;
    if (blur) blurDraw(v, bboxOf(pts), blur, draw);
    else draw(v);
    v.restore();
  }
  function vLine(v, pts, w, val, blur = 0, alpha = 1) {
    VALD = null;
    const draw = (c) => curve(c, pts, w, grey(val), { seed: 5, ends: 0.25, jit: 0 });
    v.save();
    v.globalAlpha = alpha;
    if (blur) blurDraw(v, bboxOf(pts, w), blur, draw);
    else draw(v);
    v.restore();
  }
  var vg = (a, b, e = 1) => (u, v) => lerp(a, b, Math.pow(v, e));
  var ug = (a, b, e = 1) => (u, v) => lerp(a, b, Math.pow(u, e));
  var bl = (tl, tr, br, bl_) => (u, v) => lerp(lerp(tl, tr, u), lerp(bl_, br, u), v);
  var fadeEdges = (f, top = 0.08, bot = 0.12, left = 0, right = 0) => (u, v) => f(u, v) * sstep(0, top, v) * (1 - sstep(1 - bot, 1, v)) * (left ? sstep(0, left, u) : 1) * (right ? 1 - sstep(1 - right, 1, u) : 1);
  function carton(g, front, { cov, per = 5, lum = 0.92, seed = 1, side = null, sideCov = 0, top = null, topCov = 0.5, topLum = 0.85, rim = 0.5, dir = "v", brk = 0.5 } = {}) {
    if (top) stripes(g, top, { per: 3.2, cov: topCov, lum: topLum, seed: seed + 3, dir: "h", brk: 0.3, jit: 0.2 });
    if (side) {
      if (sideCov) stripes(g, side, { per, cov: sideCov, lum: lum * 0.8, seed: seed + 5, brk });
      else fillPoly(g, side);
    }
    stripes(g, front, { per, cov, lum, seed, dir, brk });
    if (rim > 0) ink(g, [front[0], front[1]], 1.6, grey(0.9, rim), { seed: seed + 9 });
  }
  function leftBack(g) {
    stripes(g, [[12, 150], [80, 150], [80, 250], [12, 246]], { cov: fadeEdges(bl(0.28, 0.4, 0.34, 0.22), 0.02, 0.02), lum: 0.62, seed: 11 });
    stripes(g, [[80, 150], [332, 150], [332, 318], [80, 305]], { cov: fadeEdges(bl(0.3, 0.42, 0.4, 0.3), 0.02, 0.02), lum: 0.62, seed: 12 });
    stripes(g, [[18, 244], [84, 258], [84, 302], [16, 316]], { cov: fadeEdges(bl(0.7, 0.45, 0.3, 0.55), 0.06, 0.06), lum: 0.82, seed: 13 });
    ink(g, [[18, 244], [84, 258]], 1.6, BLK, { seed: 131 });
    stripes(g, [[16, 317], [219, 289], [219, 420], [14, 420]], { cov: fadeEdges(bl(0.22, 0.32, 0.26, 0.16), 0.04, 0.02), lum: 0.6, seed: 14 });
    ink(g, [[16, 317], [219, 289]], 1.8, BLK, { seed: 141 });
    stripes(g, [[100, 306], [136, 303], [136, 344], [100, 346]], { cov: fadeEdges(vg(0.7, 0.4), 0.05, 0.05), lum: 0.8, seed: 15 });
    ink(g, [[100, 346], [136, 344]], 1.3, grey(0.75), { seed: 151 });
    ink(g, [[130, 281], [181, 278], [182, 298], [131, 300]], 1.3, "rgba(215,215,205,0.6)", { closed: true, seed: 16 });
    stripes(g, [[219, 289], [320, 319], [322, 400], [219, 400]], { cov: fadeEdges(bl(1, 0.8, 0.55, 0.85), 0.02, 0), lum: 0.96, seed: 17, per: 5.5 });
    ink(g, [[219, 289], [320, 319]], 2, BLK, { seed: 18 });
    curve(g, [[330, 232], [338, 280], [334, 330], [340, 380]], 3, "rgba(70,70,68,0.7)", { seed: 191 });
    g.strokeStyle = "rgba(90,90,88,0.6)";
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(352, 276, 14, 20, 0.3, 0.3, 4.6);
    g.stroke();
    curve(g, [[414, 180], [410, 205], [404, 232], [410, 262], [410, 272]], 1.1, "rgba(150,150,145,0.55)", { seed: 19 });
    leaf(g, 402, 226, 1.62, 32, 0.74, 20);
    leaf(g, 428, 236, 1.5, 26, 0.7, 21);
    leaf(g, 412, 272, 1.55, 33, 0.78, 22);
  }
  function leaf(g, x, y, ang, s, v = 0.72, seed = 1) {
    const pts = [];
    for (let i = 0; i < 20; i++) {
      const t = i / 20 * PI * 2;
      const lx = (1 - Math.cos(t)) * 0.5 * s;
      const k = lx / s;
      const wdt = s * 0.36 * Math.sin(t) * (k < 0.25 ? 0.7 + k * 1.2 : 1 - 0.55 * Math.pow((k - 0.25) / 0.75, 1.6));
      pts.push([x + lx * Math.cos(ang) - wdt * Math.sin(ang), y + lx * Math.sin(ang) + wdt * Math.cos(ang)]);
    }
    blobPath(g, pts);
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    const gr = g.createLinearGradient(x + nx * s * 0.35, y + ny * s * 0.35, x - nx * s * 0.35, y - ny * s * 0.35);
    gr.addColorStop(0, grey(v * 0.45));
    gr.addColorStop(0.45, grey(v));
    gr.addColorStop(0.55, grey(v * 0.9));
    gr.addColorStop(1, grey(v * 0.7));
    g.fillStyle = gr;
    g.fill();
    g.strokeStyle = "rgba(8,8,8,0.9)";
    g.lineWidth = 1.2;
    g.stroke();
    const tip = [x + s * Math.cos(ang), y + s * Math.sin(ang)];
    curve(g, [[x, y], P2([x, y], tip, 0.5), P2([x, y], tip, 0.9)], Math.max(0.8, s * 0.05), "rgba(15,15,15,0.85)", { seed, ends: 0.3 });
    for (let k = 1; k <= 2; k++) for (const sd of [-1, 1]) {
      const a = P2([x, y], tip, 0.22 + k * 0.22), l = s * 0.2;
      ink(g, [a, [a[0] + Math.cos(ang + sd * 0.8) * l, a[1] + Math.sin(ang + sd * 0.8) * l]], 0.7, "rgba(20,20,20,0.55)", { seed: seed + k * 3 + sd });
    }
  }
  function guitarCase(g) {
    const front = [[43, 400], [55, 389], [70, 384], [90, 383], [100, 390], [100, 447], [90, 547], [77, 650], [4, 652], [10, 540], [14, 503]];
    fillBlob(g, front, "#080808");
    stripes(g, [[40, 410], [98, 410], [80, 646], [8, 648]], { cov: fadeEdges(vg(0.22, 0.12), 0.05, 0.05, 0.15, 0.15), lum: 0.55, seed: 30, per: 6, base: false });
    curve(g, [[14, 503], [26, 450], [43, 400], [60, 386], [90, 383], [100, 392], [100, 447], [90, 547], [77, 650]], 2.2, "rgba(225,225,220,0.85)", { seed: 31, ends: 0.6 });
    const side = [[100, 390], [120, 394], [140, 400], [143, 447], [133, 547], [127, 650], [77, 650], [90, 547], [100, 447]];
    fillPoly(g, side, "#060606");
    curve(g, [[103, 393], [140, 400], [143, 447], [133, 547], [127, 648]], 2, "rgba(220,220,215,0.8)", { seed: 32 });
    ink(g, [[120, 397], [123, 450], [118, 550], [113, 650]], 2.4, "rgba(235,235,230,0.9)", { seed: 33 });
    ink(g, [[130, 400], [132, 450], [127, 550], [122, 650]], 1.8, "rgba(210,210,205,0.75)", { seed: 34 });
    for (const [x0, y0, x1, y1] of [[120, 428, 147, 455], [105, 572, 145, 602]]) {
      fillPoly(g, [[x0, y0], [x1, y0 + 2], [x1, y1], [x0, y1 - 1]], grey(0.78));
      ink(g, [[x0, y0], [x1, y0 + 2], [x1, y1], [x0, y1 - 1]], 1.6, BLK, { closed: true, seed: x0 });
      fillPoly(g, [[x0 + 6, y0 + 7], [x1 - 6, y0 + 8], [x1 - 6, y1 - 7], [x0 + 6, y1 - 7]], grey(0.3));
    }
    ink(g, [[143, 510], [143, 527]], 2, grey(0.8), { seed: 35 });
  }
  function plantLeft(g) {
    fillBlob(g, [[355, 390], [390, 380], [430, 384], [432, 400], [360, 402]], grey(0.12));
    const pot = [[435, 362], [488, 360], [484, 395], [440, 398]];
    polyPath(g, pot);
    const pg = g.createLinearGradient(435, 0, 488, 0);
    pg.addColorStop(0, grey(0.3));
    pg.addColorStop(0.65, grey(0.78));
    pg.addColorStop(1, grey(0.45));
    g.fillStyle = pg;
    g.fill();
    ink(g, pot, 1.4, BLK, { closed: true, seed: 40 });
    g.fillStyle = grey(0.7);
    g.beginPath();
    g.ellipse(461, 361, 28, 4, -0.03, 0, PI * 2);
    g.fill();
    const L = [
      [452, 345, -2.1, 26],
      [468, 342, -1.4, 26],
      [480, 345, -0.9, 24],
      [440, 350, -2.8, 26],
      [490, 350, -0.3, 24],
      [458, 352, -1.8, 22],
      [495, 336, -0.8, 25],
      [448, 328, -1.95, 22],
      [470, 330, -1.2, 22],
      [428, 342, 3, 22],
      [420, 356, 2.8, 18],
      [504, 348, 0.2, 24],
      [512, 362, 1, 22],
      [528, 360, 1.3, 22],
      [510, 400, 1.35, 24],
      [520, 422, 1.45, 24],
      [522, 446, 1.5, 21],
      [515, 466, 1.6, 18],
      [540, 392, 1.3, 26],
      [548, 428, 1.45, 24],
      [546, 452, 1.55, 20],
      [500, 322, -0.6, 22],
      [436, 318, -2.2, 22]
    ];
    L.forEach(([x, y, a, s], i) => leaf(g, x, y, a, s, 0.56 + i % 4 * 0.06, 50 + i * 3));
    curve(g, [[488, 362], [514, 380], [528, 404], [530, 440], [520, 470]], 1.1, "rgba(160,160,155,0.6)", { seed: 49 });
  }
  function leftMid(g) {
    carton(g, [[367, 350], [405, 348], [406, 392], [368, 394]], { cov: fadeEdges(vg(0.35, 0.2)), lum: 0.65, seed: 60, rim: 0.3 });
    for (const x of [373, 386]) fillPoly(g, [[x, 352], [x + 8, 351], [x + 8, 359], [x, 360]], grey(0.85));
    const tray = [[228, 399], [360, 396], [374, 411], [248, 424]];
    stripes(g, tray, { dir: "h", per: 3, cov: bl(0.95, 0.95, 0.85, 0.85), lum: 0.96, seed: 61, brk: 0.2 });
    ink(g, tray, 1.8, BLK, { closed: true, seed: 62 });
    fillPoly(g, [[248, 424], [374, 411], [375, 421], [249, 434]], grey(0.3));
    stripes(g, [[374, 399], [500, 398], [503, 408], [375, 410]], { dir: "h", per: 3, cov: 0.8, lum: 0.92, seed: 63, brk: 0.2 });
    stripes(g, [[375, 410], [430, 409], [431, 482], [376, 484]], { cov: fadeEdges(bl(0.7, 0.6, 0.4, 0.45), 0.02, 0.05), lum: 0.9, seed: 64 });
    wood(g, [[430, 409], [503, 408], [506, 480], [431, 482]], { v0: 0.64, v1: 0.5, dir: "v", grain: 0.28, per: 3, seed: 641, edge: 0 });
    fillPoly(g, [[431, 409], [452, 409], [452, 433], [431, 434]], "#050505");
    fillPoly(g, [[477, 410], [498, 410], [498, 432], [477, 432]], "#070707");
    ink(g, [[431, 409], [452, 409], [452, 433], [431, 434]], 1.2, "rgba(220,220,215,0.75)", { closed: true, seed: 65 });
    ink(g, [[452, 434], [452, 482]], 2, grey(0.95), { seed: 651 });
    stripes(g, [[243, 423], [297, 425], [297, 560], [243, 560]], { cov: fadeEdges(bl(0.12, 0.16, 0.1, 0.08), 0.03, 0.02), lum: 0.6, seed: 66 });
    ink(g, [[247, 432], [247, 500], [290, 500]], 1.6, grey(0.55), { seed: 661 });
    stripes(g, [[297, 425], [387, 423], [388, 560], [297, 560]], { cov: fadeEdges(bl(0.9, 0.8, 0.6, 0.7), 0.03, 0.02), lum: 0.95, seed: 67 });
    ink(g, [[230, 423], [387, 422]], 1.6, BLK, { seed: 671 });
  }
  function keyboardLeft(g) {
    fillPoly(g, [[335, 472], [380, 472], [380, 560], [335, 560]], "#080808");
    ink(g, [[335, 472], [380, 472]], 1.4, grey(0.5), { seed: 701 });
    wood(g, [[380, 472], [505, 480], [508, 560], [380, 560]], { v0: 0.66, v1: 0.48, dir: "h", grain: 0.28, per: 2.8, seed: 702, edge: 0 });
    ink(g, [[380, 472], [505, 480], [508, 560], [380, 560]], 1.8, BLK, { closed: true, seed: 703 });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) {
      const x = 395 + c * 16.3, y = 491.5 + r * 24.5 + c * 0.35;
      dot(g, x, y + 1, 6.2, "#050505");
      ring(g, x, y, 5, 1.2, "rgba(150,150,145,0.8)");
      dot(g, x - 1.5, y - 2, 1.4, "rgba(240,240,235,0.9)");
    }
    for (const [x, dx] of [[411, 8], [445, 12], [461, 20], [477, 30]]) curve(g, [[x, 544], [x + 2, 560], [x + dx * 0.5, 590], [x + dx, 640], [x + dx + 6, 700]], 2.6, "#030303", { seed: x, ends: 0.8 });
    fillPoly(g, [[147, 552], [422, 552], [424, 600], [150, 610]], "#060606");
    stripes(g, [[170, 552], [422, 552], [422, 572], [170, 572]], { dir: "h", per: 3.5, cov: 0.22, lum: 0.7, seed: 704 });
    for (let i = 0; i < 15; i++) {
      const x = 180 + i * 16.5;
      dot(g, x, 563, 3.4, "#0a0a0a");
      dot(g, x, 561, 2.2, "rgba(225,225,220,0.85)");
    }
    const kx0 = 172, kx1 = 422, nw = 22, kw = (kx1 - kx0) / nw;
    polyPath(g, [[kx0, 577], [kx1, 577], [kx1, 598], [kx0, 598]]);
    const kg = g.createLinearGradient(0, 577, 0, 598);
    kg.addColorStop(0, grey(0.97));
    kg.addColorStop(1, grey(0.78));
    g.fillStyle = kg;
    g.fill();
    for (let i = 0; i <= nw; i++) ink(g, [[kx0 + i * kw, 578], [kx0 + i * kw, 598]], 1.1, "rgba(20,20,20,0.9)", { seed: 710 + i, jit: 0.1 });
    for (let i = 0; i < nw; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) {
      const x = kx0 + (i + 1) * kw - kw * 0.32;
      fillPoly(g, [[x, 571], [x + kw * 0.64, 571], [x + kw * 0.64, 589], [x, 589]], "#070707");
      ink(g, [[x + 1, 572], [x + kw * 0.64 - 1, 572]], 1.4, "rgba(220,220,215,0.8)", { seed: 720 + i, jit: 0.1 });
    }
    ink(g, [[kx0, 598], [kx1, 598]], 1.6, BLK, { seed: 730 });
    fillPoly(g, [[150, 598], [424, 598], [424, 612], [152, 614]], grey(0.12));
    fillPoly(g, [[147, 552], [172, 552], [172, 600], [160, 612], [150, 606]], "#0b0b0b");
    ink(g, [[160, 580], [227, 607]], 2.2, grey(0.6), { seed: 731 });
    fillPoly(g, [[422, 585], [492, 583], [494, 624], [423, 626]], "#0c0c0c");
    ink(g, [[422, 585], [492, 583]], 1.6, grey(0.8), { seed: 732 });
    for (let i = 0; i < 4; i++) {
      dot(g, 437 + i * 16.5, 582, 3.2, "#0a0a0a");
      dot(g, 437 + i * 16.5, 580.5, 2, grey(0.9));
    }
    stripes(g, [[492, 560], [516, 560], [516, 622], [494, 622]], { cov: fadeEdges(vg(0.7, 0.5)), lum: 0.85, seed: 733 });
    stripes(g, [[147, 624], [500, 621], [500, 641], [147, 646]], { dir: "h", per: 3.4, cov: bl(0.7, 0.95, 0.9, 0.6), lum: 0.95, seed: 740, brk: 0.25 });
    ink(g, [[147, 646], [500, 641]], 1.6, BLK, { seed: 741 });
    fillPoly(g, [[340, 645], [475, 642], [475, 760], [340, 760]], "#030303");
    for (const [x0, x1, y1, s] of [[323, 340, 822, 742], [475, 492, 780, 743]]) {
      stripes(g, [[x0, 642], [x1, 642], [x1, y1], [x0, y1]], { per: 3.4, cov: fadeEdges(ug(0.95, 0.45), 0, 0.06), lum: 0.93, seed: s, brk: 0.2 });
      ink(g, [[x1, 642], [x1, y1]], 1.4, BLK, { seed: s + 1 });
    }
    for (const [pts, bx, by] of [[[[296, 628], [352, 626], [352, 660], [330, 666], [300, 650]], 333, 641], [[[471, 623], [493, 622], [493, 660], [474, 658]], 486, 631]]) {
      fillPoly(g, pts, grey(0.85));
      ink(g, pts, 1.6, BLK, { closed: true, seed: bx });
      dot(g, bx, by, 4.5, "#101010");
      dot(g, bx - 1, by - 1, 1.6, grey(0.8));
    }
    fillPoly(g, [[147, 626], [165, 626], [165, 646], [147, 646]], grey(0.7));
    curve(g, [[153, 534], [172, 540], [180, 560]], 2.4, "rgba(215,215,210,0.8)", { seed: 750 });
    curve(g, [[172, 652], [196, 660], [206, 690], [204, 722], [198, 746]], 3.4, "#040404", { seed: 751, ends: 0.9 });
    curve(g, [[171, 651], [195, 659], [205, 690], [203, 722], [197, 746]], 1.6, "rgba(220,220,215,0.85)", { seed: 752 });
  }
  function leftLow(g) {
    stripes(g, [[14, 656], [72, 655], [72, 752], [14, 752]], { cov: fadeEdges(bl(0.5, 0.55, 0.45, 0.4), 0.02, 0.02), lum: 0.78, seed: 800 });
    stripes(g, [[72, 655], [172, 655], [172, 752], [72, 752]], { cov: fadeEdges(bl(0.95, 0.75, 0.6, 0.85), 0.02, 0.02), lum: 0.95, seed: 801 });
    ink(g, [[14, 656], [172, 655]], 1.8, grey(0.9), { seed: 802 });
    ink(g, [[72, 656], [72, 752]], 1.6, BLK, { seed: 803 });
    fillPoly(g, [[145, 648], [200, 650], [202, 680], [148, 678]], grey(0.2));
    ink(g, [[145, 648], [200, 650]], 1.4, grey(0.8), { seed: 804 });
    stripes(g, [[14, 753], [232, 752], [232, 870], [14, 870]], { cov: fadeEdges((u, v) => (u < 0.28 ? 0.55 : 0.9) * lerp(1, 0.7, v), 0.02, 0.04), lum: 0.95, seed: 805 });
    ink(g, [[14, 753], [232, 752]], 1.8, grey(0.9), { seed: 806 });
    ink(g, [[75, 753], [75, 870]], 1.6, BLK, { seed: 807 });
    stripes(g, [[95, 745], [210, 744], [215, 754], [98, 755]], { dir: "h", per: 3, cov: 0.85, lum: 0.92, seed: 808 });
    fillPoly(g, [[250, 826], [290, 824], [291, 862], [251, 863]], grey(0.55));
    ink(g, [[250, 826], [290, 824], [291, 862], [251, 863]], 1.3, BLK, { closed: true, seed: 809 });
    dot(g, 280, 815, 4, grey(0.75));
    stripes(g, [[272, 812], [366, 812], [368, 830], [270, 830]], { dir: "h", per: 3, cov: 0.8, lum: 0.9, seed: 810 });
    stripes(g, [[270, 830], [368, 830], [370, 862], [272, 862]], { dir: "h", per: 3, cov: 0.9, lum: 0.9, seed: 811 });
    ink(g, [[270, 830], [368, 830]], 1.4, BLK, { seed: 812 });
    for (const x of [281, 305, 320, 343]) {
      fillPoly(g, [[x - 6, 800], [x + 6, 800], [x + 6, 816], [x - 6, 816]], "#0b0b0b");
      g.fillStyle = grey(0.85);
      g.beginPath();
      g.ellipse(x, 800, 6, 2.4, 0, 0, PI * 2);
      g.fill();
    }
    for (const x of [290, 306, 348, 362]) dot(g, x, 846, 3, "#111");
    stripes(g, [[368, 712], [400, 710], [400, 846], [370, 846]], { cov: fadeEdges(ug(0.45, 0.7), 0.02, 0.02), lum: 0.85, seed: 820 });
    stripes(g, [[400, 710], [432, 712], [432, 845], [400, 846]], { cov: fadeEdges(vg(0.98, 0.8), 0.01, 0.02), lum: 0.97, seed: 821, per: 4 });
    ink(g, [[368, 712], [432, 712], [432, 845], [370, 846]], 1.6, BLK, { closed: true, seed: 822 });
    fillPoly(g, [[440, 716], [584, 716], [584, 736], [440, 736]], "#070707");
    fillPoly(g, [[515, 724], [556, 724], [556, 736], [515, 736]], grey(0.75));
    stripes(g, [[432, 736], [584, 736], [584, 848], [432, 848]], { cov: fadeEdges(bl(0.97, 0.95, 0.85, 0.9), 0, 0.03), lum: 0.97, seed: 823, per: 3.4, brk: 0.15, lumJit: 0.12 });
    ink(g, [[432, 736], [584, 736]], 1.4, BLK, { seed: 824 });
    ink(g, [[433, 778], [584, 776]], 1.2, "rgba(40,40,40,0.7)", { seed: 825 });
    ink(g, [[470, 766], [475, 755], [481, 766]], 1.6, "rgba(30,30,30,0.9)", { seed: 826 });
    ink(g, [[472, 762], [479, 762]], 1.2, "rgba(30,30,30,0.9)", { seed: 827 });
    ink(g, [[432, 736], [432, 848]], 1.6, BLK, { seed: 828 });
    curve(g, [[372, 834], [410, 800], [456, 742], [470, 712]], 6, "#030303", { seed: 829, ends: 0.9 });
    curve(g, [[371, 832], [409, 798], [455, 740], [469, 711]], 1.4, "rgba(210,210,205,0.7)", { seed: 830 });
    curve(g, [[470, 850], [520, 836], [562, 822]], 5, "#030303", { seed: 831, ends: 0.9 });
  }
  function wood(g, q, { v0 = 0.45, v1 = 0.3, dir = "h", grain = 0.22, per = 2.6, seed = 1, lit = 0, litW = 1.4, edge = 1.2, jit = 0.5 } = {}) {
    const [A2, B2, C2, D2] = dir === "h" ? q : [q[0], q[3], q[2], q[1]];
    const r = rng(seed);
    polyPath(g, q);
    const gr = g.createLinearGradient((A2[0] + B2[0]) / 2, (A2[1] + B2[1]) / 2, (D2[0] + C2[0]) / 2, (D2[1] + C2[1]) / 2);
    gr.addColorStop(0, grey(v0));
    gr.addColorStop(1, grey(v1));
    g.fillStyle = gr;
    g.fill();
    g.save();
    polyPath(g, q);
    g.clip();
    const across = (dist(A2, D2) + dist(B2, C2)) / 2, n = Math.max(2, Math.round(across / per));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5 + (r() - 0.5) * jit) / n;
      const p0 = P2(A2, D2, t), p1 = P2(B2, C2, t), L = dist(p0, p1), m = Math.max(3, Math.ceil(L / 8));
      const pts = [];
      for (let k = 0; k <= m; k++) {
        const u = k / m, p = P2(p0, p1, u), off = noise1(u * L / 30 + i * 3.1, seed) * 0.8;
        pts.push(dir === "h" ? [p[0], p[1] + off] : [p[0] + off, p[1]]);
      }
      const lite = r() < 0.5, val = lerp(v0, v1, t);
      taper(g, pts, (u) => (0.5 + r() * 0.7) * Math.pow(Math.sin(PI * u), 0.3), grey(lite ? Math.min(1, val + 0.28) : Math.max(0, val - 0.25), grain * (0.6 + 0.8 * r())));
    }
    g.restore();
    if (lit) ink(g, [A2, B2], litW, grey(0.92, lit), { seed: seed + 5 });
    if (edge) ink(g, q, edge, BLK, { closed: true, seed: seed + 7 });
  }
  function book(g, pts, { lum = 0.95, cov = 0.85, seed = 1, spine = 0.25, k = 1 } = {}) {
    const v = Math.min(0.92, k * cov * lum);
    const [A2, B2, C2, D2] = pts;
    polyPath(g, pts);
    const gu = g.createLinearGradient(A2[0], A2[1], B2[0], B2[1]);
    gu.addColorStop(0, grey(v * spine * 1.4));
    gu.addColorStop(0.16, grey(v * 0.85));
    gu.addColorStop(0.7, grey(v));
    gu.addColorStop(1, grey(v * 0.8));
    g.fillStyle = gu;
    g.fill();
    g.save();
    polyPath(g, pts);
    g.clip();
    const gv2 = g.createLinearGradient(0, Math.min(A2[1], B2[1]), 0, Math.max(C2[1], D2[1]));
    gv2.addColorStop(0, "rgba(255,255,255,0.12)");
    gv2.addColorStop(0.5, "rgba(0,0,0,0)");
    gv2.addColorStop(1, "rgba(0,0,0,0.35)");
    g.fillStyle = gv2;
    g.fillRect(Math.min(A2[0], D2[0]) - 2, Math.min(A2[1], B2[1]) - 2, Math.max(B2[0], C2[0]) - Math.min(A2[0], D2[0]) + 4, Math.max(C2[1], D2[1]) - Math.min(A2[1], B2[1]) + 4);
    const r = rng(seed), h = (dist(A2, D2) + dist(B2, C2)) / 2, n = Math.max(2, Math.round(h / 2.6));
    for (let i = 1; i < n; i++) {
      const t = i / n + (r() - 0.5) * 0.05;
      ink(g, [P2(P2(A2, D2, t), P2(B2, C2, t), 0.1 + 0.05 * r()), P2(P2(A2, D2, t), P2(B2, C2, t), 0.97)], 0.8, grey(r() < 0.5 ? Math.min(1, v + 0.2) : v * 0.5, 0.45), { seed: seed + i, jit: 0.3 });
    }
    g.restore();
    ink(g, [A2, B2], 1.2, grey(Math.min(1, v + 0.25), 0.85), { seed: seed + 2 });
    ink(g, pts, 1.2, BLK, { closed: true, seed: seed + 1 });
  }
  function speakerL(g) {
    book(g, [[555, 443], [650, 441], [652, 460], [556, 461]], { seed: 1001, k: 0.62 });
    book(g, [[530, 460], [655, 458], [657, 478], [531, 479]], { seed: 1003, k: 0.62 });
    book(g, [[535, 478], [665, 477], [666, 493], [536, 494]], { seed: 1005, k: 0.62 });
    book(g, [[525, 493], [670, 492], [671, 506], [526, 507]], { seed: 1007, lum: 0.9, k: 0.62 });
    stripes(g, [[522, 506], [632, 506], [632, 704], [522, 704]], { per: 4.2, cov: fadeEdges(bl(0.15, 0.2, 0.12, 0.08), 0.02, 0.02), lum: 0.6, seed: 1010 });
    stripes(g, [[632, 506], [700, 512], [700, 612], [632, 612]], { per: 4.6, cov: fadeEdges(bl(0.9, 0.8, 0.7, 0.85), 0.02, 0), lum: 0.95, seed: 1011 });
    ink(g, [[632, 506], [632, 612]], 1.6, BLK, { seed: 1012 });
    ink(g, [[522, 506], [632, 506], [700, 512]], 1.8, grey(0.85), { seed: 1013 });
    driver(g, 578, 543, 20, "tweeter");
    driver(g, 578, 613, 46, "woofer");
    stripes(g, [[678, 447], [710, 447], [712, 640], [680, 640]], { per: 3.4, cov: fadeEdges(ug(0.75, 0.35)), lum: 0.9, seed: 1020 });
    ink(g, [[678, 447], [710, 447], [712, 640], [680, 640]], 1.5, BLK, { closed: true, seed: 1021 });
    for (const y of [490, 506, 560, 600]) {
      dot(g, 692, y, 4, "#0a0a0a");
      ring(g, 692, y, 4.2, 1.2, grey(0.85));
    }
  }
  function driver(g, cx, cy, r, kind) {
    if (kind === "woofer") {
      dot(g, cx, cy, r, "#070707");
      ring(g, cx, cy, r - 1, 2, grey(0.75));
      ring(g, cx, cy, r * 0.86, 1.2, grey(0.35));
      const gr = g.createRadialGradient(cx - r * 0.12, cy - r * 0.15, r * 0.2, cx, cy, r * 0.78);
      gr.addColorStop(0, grey(0.98));
      gr.addColorStop(0.7, grey(0.9));
      gr.addColorStop(1, grey(0.55));
      g.fillStyle = gr;
      g.beginPath();
      g.arc(cx, cy, r * 0.76, 0, PI * 2);
      g.fill();
      for (let k = 0; k < 4; k++) ring(g, cx, cy, r * (0.42 + k * 0.09), 0.8, "rgba(60,60,60,0.35)");
      dot(g, cx, cy, r * 0.29, "#060606");
      dot(g, cx - r * 0.07, cy - r * 0.09, r * 0.05, grey(0.9));
    } else {
      dot(g, cx, cy, r, "#080808");
      ring(g, cx, cy, r - 1, 1.6, grey(0.7));
      const gr = g.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r * 0.8);
      gr.addColorStop(0, grey(0.45));
      gr.addColorStop(1, grey(0.08));
      g.fillStyle = gr;
      g.beginPath();
      g.arc(cx, cy, r * 0.75, 0, PI * 2);
      g.fill();
      dot(g, cx - r * 0.1, cy - r * 0.15, r * 0.14, grey(0.95));
    }
  }
  function crateAndBooks(g) {
    book(g, [[635, 628], [765, 626], [766, 643], [636, 644]], { seed: 1101, k: 0.72 });
    book(g, [[640, 643], [770, 642], [771, 665], [641, 666]], { seed: 1103, k: 0.72 });
    book(g, [[640, 665], [760, 664], [761, 683], [641, 684]], { seed: 1105, k: 0.72 });
    book(g, [[630, 683], [765, 682], [766, 700], [631, 701]], { seed: 1107, lum: 0.9, k: 0.72 });
    fillPoly(g, [[675, 610], [760, 610], [761, 628], [676, 628]], grey(0.62));
    ink(g, [[675, 610], [760, 610], [761, 628], [676, 628]], 1.3, BLK, { closed: true, seed: 1109 });
    fillPoly(g, [[688, 615], [704, 615], [704, 623], [688, 623]], "#080808");
    for (let i = 0; i < 3; i++) dot(g, 691 + i * 5, 619, 1.2, grey(0.9));
    fillPoly(g, [[628, 700], [765, 700], [765, 815], [628, 815]], "#050505");
    stripes(g, [[628, 700], [765, 700], [765, 714], [628, 714]], { dir: "h", per: 2.8, cov: 0.8, lum: 0.9, seed: 1110, brk: 0.1 });
    for (const [x0, x1] of [[636, 656], [668, 700], [710, 740], [750, 760]]) fillPoly(g, [[x0, 702], [x1, 702], [x1, 711], [x0, 711]], "#070707");
    g.save();
    g.beginPath();
    g.rect(642, 714, 108, 90);
    g.clip();
    for (let i = -3; i < 7; i++) {
      ink(g, [[642 + i * 30, 804], [642 + i * 30 + 90, 714]], 2.2, grey(0.7), { seed: 1120 + i, jit: 0.2 });
      ink(g, [[642 + i * 30, 714], [642 + i * 30 + 90, 804]], 2.2, grey(0.7), { seed: 1140 + i, jit: 0.2 });
    }
    g.restore();
    fillBlob(g, [[676, 716], [720, 716], [724, 728], [672, 728]], "#040404");
    ink(g, [[676, 716], [720, 716], [724, 728], [672, 728]], 1.2, grey(0.7), { closed: true, seed: 1160 });
    for (const [x0, x1] of [[628, 642], [750, 765]]) stripes(g, [[x0, 714], [x1, 714], [x1, 815], [x0, 815]], { per: 3, cov: ug(0.85, 0.5), lum: 0.9, seed: 1161 + x0 });
    ink(g, [[628, 815], [765, 815]], 1.4, grey(0.5), { seed: 1165 });
    g.save();
    g.beginPath();
    g.rect(766, 700, 34, 110);
    g.clip();
    for (let i = 0; i < 4; i++) ink(g, [[766, 720 + i * 26], [800, 700 + i * 26]], 1.4, grey(0.35), { seed: 1170 + i });
    g.restore();
  }
  function pedalboard(g) {
    fillPoly(g, [[572, 830], [692, 828], [694, 870], [570, 872]], "#070707");
    ink(g, [[572, 832], [692, 830]], 2, grey(0.8), { seed: 1201 });
    ink(g, [[692, 830], [694, 870]], 1.4, grey(0.5), { seed: 1202 });
    for (let i = 0; i < 7; i++) {
      const x = 588 + i * 15;
      g.fillStyle = grey(0.82);
      g.beginPath();
      g.ellipse(x, 826, 5, 2.4, 0, 0, PI * 2);
      g.fill();
    }
    for (const [x, y] of [[640, 853], [700, 856], [730, 850]]) {
      dot(g, x, y, 3.5, grey(0.25));
      ring(g, x, y, 3.8, 1, grey(0.7));
    }
    for (const [x0, y0, w, h] of [[740, 806, 40, 26], [782, 810, 22, 22]]) {
      fillPoly(g, [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], grey(0.78));
      ink(g, [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], 1.2, BLK, { closed: true, seed: x0 });
      dot(g, x0 + 10, y0 + 8, 3, "#111");
    }
  }
  function doNotKnock(g) {
    const sgn = [[600, 194], [817, 171], [827, 270], [611, 293]];
    fillPoly(g, sgn, "#060606");
    ink(g, sgn, 2.6, grey(0.8), { closed: true, seed: 1301 });
    g.save();
    g.translate(611, 293);
    g.rotate(-0.106);
    for (const [x, y] of [[10, -12], [206, -12]]) ring(g, x, y, 3.3, 1.3, grey(0.78));
    g.font = "400 32px Geist";
    g.fontStretch = "condensed";
    g.fillStyle = grey(0.72);
    g.letterSpacing = "1px";
    g.save();
    g.scale(0.74, 1.02);
    g.fillText("DO NOT KNOCK.", 17, -28);
    g.restore();
    g.font = "500 16px Geist";
    g.fillStyle = grey(0.5, 0.55);
    g.fillText("MIXING.", 112, -76);
    g.letterSpacing = "0px";
    g.fontStretch = "normal";
    g.restore();
  }
  function wallLight(g) {
    g.save();
    g.beginPath();
    g.ellipse(1330, 382, 42, 52, 0, 0, PI * 2);
    g.clip();
    const r = rng(1401);
    for (let i = 0; i < 300; i++) {
      const a = r() * PI * 2, d = Math.sqrt(r()) * 52;
      const x = 1330 + Math.cos(a) * d * 0.8, y = 382 + Math.sin(a) * d;
      const fall = clamp2(1 - Math.hypot(x - 1345, y - 365) / 70);
      g.strokeStyle = grey(0.25 + 0.45 * fall, 0.15 + 0.55 * fall);
      g.lineWidth = 0.8 + fall * 0.5;
      g.beginPath();
      g.arc(x, y, 1.8 + r() * 3.2, r() * 6, r() * 6 + 3.8);
      g.stroke();
    }
    g.restore();
  }
  function deskUnder(g) {
    wood(g, [[1030, 646], [1135, 646], [1138, 668], [1028, 668]], { v0: 0.28, v1: 0.1, dir: "h", grain: 0.25, seed: 1410, edge: 0 });
    wood(g, [[823, 545], [845, 545], [838, 858], [813, 858]], { v0: 0.52, v1: 0.2, dir: "v", grain: 0.3, per: 2.4, seed: 1411, edge: 0 });
    ink(g, [[845, 545], [838, 858]], 1.4, BLK, { seed: 1412 });
    wood(g, [[843, 574], [878, 546], [890, 548], [845, 590]], { v0: 0.45, v1: 0.25, dir: "h", grain: 0.3, seed: 1413, edge: 0 });
    stripes(g, [[891, 588], [899, 588], [898, 800], [890, 800]], { per: 3, cov: 0.3, lum: 0.6, seed: 1414 });
    stripes(g, [[840, 800], [895, 800], [895, 812], [840, 812]], { dir: "h", per: 3, cov: 0.5, lum: 0.75, seed: 1415 });
    dot(g, 831, 614, 5.5, "#0c0c0c");
    ring(g, 831, 614, 5.5, 1.4, grey(0.85));
    dot(g, 831, 614, 2, grey(0.8));
    wood(g, [[1298, 556], [1320, 556], [1280, 832], [1258, 830]], { v0: 0.5, v1: 0.2, dir: "v", grain: 0.3, per: 2.4, seed: 1420, edge: 0 });
    stripes(g, [[1342, 552], [1356, 552], [1350, 700], [1338, 700]], { per: 3.2, cov: 0.35, lum: 0.7, seed: 1421 });
    stripes(g, [[1395, 562], [1405, 556], [1436, 600], [1430, 608]], { dir: "h", per: 3, cov: 0.5, lum: 0.75, seed: 1422 });
    wood(g, [[1433, 548], [1457, 548], [1465, 865], [1446, 865]], { v0: 0.56, v1: 0.25, dir: "v", grain: 0.3, per: 2.4, seed: 1423, edge: 0 });
    ink(g, [[1457, 548], [1465, 865]], 1.4, BLK, { seed: 1424 });
    dot(g, 1444, 617, 5.5, "#0c0c0c");
    ring(g, 1444, 617, 5.5, 1.4, grey(0.85));
    dot(g, 1444, 617, 2, grey(0.8));
  }
  function soft(g, path, fill, blur = 0, alpha = 1) {
    const draw = (c) => {
      c.beginPath();
      path(c);
      c.fillStyle = fill;
      c.fill();
    };
    g.save();
    g.globalAlpha = alpha;
    if (blur && path.bb) blurDraw(g, path.bb, blur, draw);
    else {
      if (blur) g.filter = `blur(${blur}px)`;
      draw(g);
    }
    g.restore();
  }
  var pth = (pts, smooth = true) => Object.assign((g) => {
    if (smooth) smoothPath(g, pts, true);
    else {
      g.moveTo(pts[0][0], pts[0][1]);
      for (const p of pts.slice(1)) g.lineTo(p[0], p[1]);
      g.closePath();
    }
  }, { bb: bboxOf(pts, 4) });
  var lg = (g, x0, y0, x1, y1, stops) => {
    const r = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([o, v]) => r.addColorStop(o, typeof v === "number" ? grey(v) : v));
    return r;
  };
  var rg = (g, x, y, r0, r1, stops, sy = 1) => {
    const r = g.createRadialGradient(x, y, r0, x, y, r1);
    stops.forEach(([o, v]) => r.addColorStop(o, typeof v === "number" ? grey(v) : v));
    return r;
  };
  function pants(g) {
    const v = valCtx();
    v.fillStyle = "#000";
    v.fillRect(0, 0, PW, PH);
    const L = [[929, 548], [1030, 548], [1048, 600], [1056, 640], [1060, 706], [1066, 745], [1062, 772], [1020, 778], [975, 772], [935, 772], [928, 755], [924, 700], [926, 625]];
    const R = [[1135, 548], [1250, 550], [1272, 590], [1282, 630], [1285, 687], [1270, 735], [1256, 760], [1250, 772], [1210, 777], [1170, 772], [1131, 774], [1129, 762], [1135, 706], [1141, 625]];
    const legs = [
      {
        pts: L,
        box: [920, 550, 1070, 780],
        seed: 1500,
        hi: [
          [[940, 572], [955, 600], [972, 630], [990, 662], [1008, 695], [1030, 722], [1055, 738]],
          [[962, 560], [985, 590], [1004, 620], [1020, 650], [1040, 690], [1058, 718]],
          [[932, 610], [936, 650], [942, 690], [950, 720]],
          [[1e3, 700], [1025, 712], [1052, 730]],
          [[930, 738], [970, 745], [1010, 752], [1052, 748]],
          [[945, 762], [990, 768], [1040, 770]],
          [[1012, 566], [1030, 590], [1044, 620]]
        ],
        lo: [[[955, 612], [975, 645], [995, 680], [1015, 712]], [[935, 700], [960, 725], [990, 740]], [[990, 575], [1005, 600], [1022, 630]], [[1040, 650], [1052, 690]], [[935, 755], [990, 758], [1050, 760]]]
      },
      {
        pts: R,
        box: [1115, 555, 1290, 780],
        seed: 1520,
        hi: [
          [[1255, 585], [1235, 615], [1215, 648], [1195, 680], [1172, 712], [1145, 738]],
          [[1228, 570], [1210, 600], [1192, 632], [1176, 662], [1160, 690]],
          [[1280, 625], [1279, 660], [1272, 700], [1262, 735]],
          [[1175, 700], [1155, 720], [1135, 738]],
          [[1135, 745], [1180, 750], [1225, 752], [1268, 748]],
          [[1140, 765], [1190, 770], [1248, 772]],
          [[1150, 575], [1142, 610], [1138, 650]]
        ],
        lo: [[[1240, 600], [1222, 630], [1205, 662], [1188, 695], [1170, 722]], [[1262, 650], [1255, 690], [1244, 725]], [[1200, 570], [1188, 592]], [[1140, 758], [1200, 760], [1260, 758]]]
      }
    ];
    for (const leg of legs) {
      const r = rng(leg.seed);
      vFill(v, leg.pts, lg(v, 0, 556, 0, 775, [[0, 0.14], [0.3, 0.27], [0.75, 0.31], [1, 0.27]]), { smooth: false });
      v.save();
      polyPath(v, leg.pts);
      v.clip();
      for (const f2 of leg.hi) {
        vLine(v, f2, 13, 0.55, 5);
        vLine(v, f2, 4, 0.95, 1.3);
      }
      for (const f2 of leg.lo) vLine(v, f2, 7, 0.03, 2.5);
      v.restore();
      const fieldCurves = [...leg.hi, ...leg.lo];
      const f = curveField(fieldCurves, leg.box);
      hatch2(g, leg.pts, { ang: (x, y) => f(x, y) + 0.1 * noise2(x / 24, y / 24, leg.seed), per: 2.4, seed: leg.seed + 1, smooth: false, baseV: 0.14, gamma: 1.2, brk: 0.15, wn: 0.5, lum: 0.9 });
      for (const [i, c] of leg.lo.entries()) curve(g, c, 2, BLK, { seed: leg.seed + 10 + i, ends: 0.1 });
      curve(g, leg.pts, 1.6, BLK, { closed: true, seed: leg.seed + 30, ends: 0.9 });
    }
    const flap = [[1249, 567], [1276, 599], [1285, 640], [1281, 667], [1262, 655], [1252, 610]];
    vFill(v, flap, lg(v, 1249, 567, 1285, 667, [[0, 0.95], [1, 0.35]]), { smooth: false });
    hatch2(g, flap, { ang: 1.75, per: 3.2, seed: 1541, smooth: false });
    ink(g, flap, 1.4, BLK, { closed: true, seed: 1540 });
    wood(g, [[1040, 649], [1145, 649], [1145, 667], [1040, 667]], { v0: 0.3, v1: 0.12, dir: "h", grain: 0.25, seed: 1541, lit: 0.4, edge: 0 });
    fillPoly(g, [[1072, 668], [1090, 668], [1088, 767], [1074, 767]], grey(0.08));
  }
  function shoe(g, cx, m, k, seed) {
    const X = (x) => cx + (x - 982) * m * k;
    const P = (pts) => pts.map(([x, y]) => [X(x), y]);
    const v = valCtx();
    const up = P([[925, 848], [930, 812], [952, 792], [990, 784], [1026, 788], [1052, 804], [1060, 846]]);
    vFill(v, up, rg(v, X(990), 805, 5, 70, [[0, 0.3], [0.7, 0.16], [1, 0.1]]));
    vFill(v, P([[1030, 800], [1052, 808], [1058, 845], [1040, 846]]), 0.42, { blur: 5 });
    hatch2(g, up, { ang: m > 0 ? 1.9 : PI - 1.9, per: 2.3, seed, lum: 0.82, baseV: 0.08, wn: 0.5, gamma: 1.2 });
    curve(g, up, 1.5, BLK, { closed: true, seed: seed + 1, ends: 0.9 });
    soft(g, pth(P([[955, 794], [972, 782], [1010, 780], [1036, 790], [1030, 800], [1e3, 792], [968, 798]])), grey(0.38));
    curve(g, P([[955, 794], [972, 782], [1010, 780], [1036, 790]]), 1.4, grey(0.8, 0.8), { seed: seed + 3 });
    soft(g, pth(P([[975, 774], [1004, 774], [1006, 792], [974, 792]])), lg(g, 0, 774, 0, 792, [[0, 0.6], [1, 0.35]]));
    fillBlob(g, P([[982, 778], [998, 778], [998, 785], [982, 785]]), grey(0.85));
    const lw = grey(0.86);
    for (let i = 0; i < 4; i++) {
      const y = 812 + i * 7.5, w = 26 - i * 1.5;
      curve(g, P([[990 - w, y + 4], [990, y], [990 + w * 0.8, y + 3]]), 1.8, lw, { seed: seed + 6 + i });
      curve(g, P([[990 - w * 0.9, y + 0.5], [990, y + 4], [990 + w * 0.85, y - 0.5]]), 1.6, grey(0.7), { seed: seed + 16 + i });
    }
    curve(g, P([[988, 803], [972, 796], [958, 800], [966, 808], [986, 806]]), 1.9, lw, { seed: seed + 2 });
    curve(g, P([[992, 803], [1006, 795], [1022, 800], [1014, 810], [994, 806]]), 1.9, lw, { seed: seed + 4 });
    curve(g, P([[987, 806], [976, 818], [968, 828]]), 1.7, lw, { seed: seed + 5 });
    curve(g, P([[992, 806], [1002, 820], [1006, 830]]), 1.7, lw, { seed: seed + 12 });
    const toe = P([[908, 852], [914, 832], [938, 824], [968, 826], [982, 842], [962, 852]]);
    vFill(v, toe, lg(v, X(908), 826, X(982), 850, [[0, 0.95], [1, 0.62]]));
    hatch2(g, toe, { ang: m > 0 ? 0.35 : PI - 0.35, per: 2.2, seed: seed + 10, baseV: 0.35, lum: 0.92, gamma: 0.9 });
    curve(g, toe, 1.3, BLK, { closed: true, seed: seed + 11, ends: 0.9 });
    const sole = P([[900, 850], [1060, 843], [1063, 866], [1050, 876], [1e3, 878], [905, 878], [897, 864]]);
    vFill(v, sole, lg(v, X(900), 0, X(1063), 0, [[0, 0.92], [0.55, 0.75], [1, 0.62]]), { smooth: false });
    vFill(v, P([[900, 852], [1062, 846], [1062, 852], [900, 858]]), 0.98, { blur: 1.5, smooth: false });
    hatch2(g, sole, { ang: 0.02, per: 2.4, seed: seed + 12, smooth: false, baseV: 0.3, lum: 0.9, gamma: 0.9 });
    const rr = rng(seed + 40);
    for (let i = 0; i < 17; i++) {
      const x = lerp(906, 1056, i / 16) + (rr() - 0.5) * 2;
      ink(g, P([[x, 866 + rr() * 2], [x + (rr() - 0.5) * 2, 878]]), 2.4 + rr(), grey(0.05, 0.85), { seed: seed + 14 + i });
    }
    ink(g, P([[901, 851], [1061, 845]]), 1.6, BLK, { seed: seed + 13 });
    ink(g, sole, 1.3, BLK, { closed: true, seed: seed + 30 });
    const hem = P([[943, 757], [1062, 760], [1066, 800], [1040, 793], [1e3, 786], [965, 782], [945, 774]]);
    vFill(v, hem, lg(v, 0, 757, 0, 800, [[0, 0.5], [0.5, 0.25], [1, 0.4]]));
    for (const f of [[[948, 766], [990, 772], [1030, 770], [1060, 776]], [[955, 778], [1e3, 781], [1045, 786]]]) vLine(v, P(f), 3, 0.9, 1);
    hatch2(g, hem, { ang: m > 0 ? 0.25 : PI - 0.25, per: 2.4, seed: seed + 31, baseV: 0.12, gamma: 1.2, wn: 0.5 });
    curve(g, hem, 1.3, BLK, { closed: true, seed: seed + 32, ends: 0.9 });
  }
  function torso(g) {
    const T = [[914, 525], [916, 452], [925, 416], [940, 398], [962, 388], [990, 378], [1010, 371], [1060, 368], [1130, 372], [1165, 380], [1190, 392], [1206, 410], [1216, 432], [1230, 455], [1242, 470], [1256, 482], [1264, 494], [1262, 522]];
    const v = valCtx();
    v.fillStyle = "#000";
    v.fillRect(900, 360, 380, 170);
    vFill(v, T, rg(v, 1060, 470, 20, 230, [[0, 0.98], [0.4, 0.92], [0.75, 0.82], [1, 0.62]]));
    vFill(v, [[916, 440], [930, 405], [960, 392], [985, 400], [975, 460], [918, 470]], 0.95, { blur: 10, alpha: 0.7 });
    vFill(v, [[1150, 392], [1195, 400], [1222, 440], [1250, 492], [1225, 510], [1170, 470]], 0.72, { blur: 10, alpha: 0.6 });
    vFill(v, [[1100, 460], [1150, 470], [1160, 522], [1105, 522]], 0.55, { blur: 10, alpha: 0.6 });
    vFill(v, [[1020, 372], [1110, 372], [1105, 400], [1025, 400]], 0.62, { blur: 8, alpha: 0.6 });
    const sf = [
      [[942, 402], [950, 425], [958, 448]],
      [[1003, 382], [1008, 408], [1014, 432]],
      [[1122, 380], [1126, 405], [1136, 432], [1146, 448]],
      [[1180, 410], [1196, 432], [1210, 452]],
      [[1150, 440], [1165, 462], [1180, 478]],
      [[1145, 472], [1175, 480], [1205, 484]],
      [[1210, 458], [1226, 474], [1240, 486]],
      [[1112, 440], [1120, 470], [1126, 500], [1130, 520]],
      [[1188, 488], [1215, 490], [1240, 494]],
      [[962, 430], [970, 455], [976, 480]]
    ];
    v.save();
    v.beginPath();
    smoothPath(v, T, true);
    v.clip();
    for (const f of sf) vLine(v, f, 7, 0.45, 3, 0.8);
    v.restore();
    const flow = [[[930, 520], [935, 460], [950, 410], [985, 385]], [[1e3, 380], [1008, 420], [1016, 470]], [[1060, 380], [1062, 450], [1064, 520]], [[1120, 380], [1135, 440], [1150, 500]], [[1170, 390], [1205, 430], [1240, 480]], ...sf];
    const fld = curveField(flow, [900, 360, 1280, 530], 6, PI / 2);
    hatch2(g, T, { ang: (x, y) => {
      const a = fld(x, y);
      const d = Math.atan2(Math.sin(2 * (a - PI / 2)), Math.cos(2 * (a - PI / 2))) / 2;
      return PI / 2 + clamp2(d, -0.45, 0.45) * 0.7 + 0.08 * noise2(x / 20, y / 20, 1612);
    }, per: 2.1, seed: 1612, baseV: 0.25, gamma: 0.85, wMax: 1.15, lum: 0.95, lumJit: 0.08, brk: 0.05, wn: 0.3 });
    g.save();
    g.beginPath();
    smoothPath(g, T, true);
    g.clip();
    const inkF = [
      [[1e3, 378], [1004, 400], [1008, 420], [1012, 432]],
      [[1118, 378], [1122, 400], [1128, 420], [1138, 444]],
      [[1100, 420], [1106, 445], [1112, 480], [1116, 520]],
      [[1176, 408], [1192, 430], [1204, 450]],
      [[1146, 466], [1170, 476], [1196, 482]],
      [[944, 404], [952, 430]],
      [[1216, 462], [1232, 476], [1246, 488]]
    ];
    for (const [i, f] of inkF.entries()) curve(g, f, 1.3, grey(0.2, 0.8), { seed: 1610 + i, ends: 0.15 });
    g.restore();
    const arm = [[1150, 500], [1195, 490], [1236, 482], [1262, 494], [1260, 522], [1150, 522]];
    soft(g, pth(arm, false), lg(g, 0, 484, 0, 522, [[0, 0.9], [1, 0.7]]));
    curve(g, [[1152, 500], [1195, 490], [1236, 483]], 1.3, grey(0.25, 0.8), { seed: 1609 });
    curve(g, T.slice(0, -1), 1.8, grey(0.1), { seed: 1611, ends: 0.8 });
    fillPoly(g, [[908, 520], [915, 494], [926, 487], [931, 520]], grey(0.86));
    g.save();
    g.globalCompositeOperation = "lighter";
    g.translate(1075, 440);
    g.scale(1, 110 / 190);
    const hr = g.createRadialGradient(0, 0, 0, 0, 0, 230);
    hr.addColorStop(0, grey(0.06));
    hr.addColorStop(0.6, grey(0.035));
    hr.addColorStop(1, grey(0));
    g.fillStyle = hr;
    g.beginPath();
    g.arc(0, 0, 230, 0, PI * 2);
    g.fill();
    g.restore();
  }
  function head(g, gaze, eye = {}) {
    const down = gaze !== "owl";
    const edx = eye.dx || 0, elid = eye.lid || 0;
    curve(g, [[1004, 386], [1030, 370], [1070, 366], [1110, 368], [1136, 384]], 4, grey(0.05), { seed: 1700 });
    soft(g, pth([[1048, 360], [1098, 360], [1102, 406], [1073, 416], [1044, 406]]), lg(g, 0, 362, 0, 414, [[0, 0.22], [0.35, 0.5], [0.7, 0.72], [1, 0.9]]));
    soft(g, pth([[1048, 364], [1060, 366], [1058, 402], [1046, 400]]), grey(0.42), 4, 0.65);
    soft(g, pth([[1086, 366], [1098, 364], [1101, 402], [1090, 402]]), grey(0.5), 4, 0.55);
    const hairBack = [[994, 258], [990, 292], [993, 322], [998, 342], [1008, 356], [1020, 352], [1030, 334], [1070, 300], [1112, 334], [1124, 352], [1138, 358], [1150, 342], [1154, 308], [1152, 270], [1070, 244]];
    fillBlob(g, hairBack, grey(0.03));
    for (const [pts, seed] of [[[[1020, 302], [1009, 300], [1005, 310], [1008, 324], [1016, 333], [1022, 330]], 1702], [[[1126, 302], [1136, 299], [1141, 308], [1139, 320], [1132, 330], [1126, 328]], 1703]]) {
      soft(g, pth(pts), lg(g, pts[1][0], 0, pts[4][0], 0, [[0, 0.42], [1, 0.62]]));
      curve(g, pts, 1, grey(0.12, 0.8), { closed: true, seed, ends: 0.8 });
    }
    const F2 = [[1019, 274], [1018, 300], [1021, 322], [1028, 342], [1040, 359], [1056, 372], [1070, 378], [1084, 376], [1099, 367], [1111, 352], [1118, 334], [1122, 310], [1123, 286], [1121, 262], [1070, 252], [1022, 258]];
    fillBlob(g, F2, grey(0.55));
    g.save();
    g.beginPath();
    smoothPath(g, F2, true);
    g.clip();
    soft(g, pth(F2), rg(g, 1068, 326, 8, 72, [[0, 0.97], [0.55, 0.92], [0.85, 0.8], [1, 0.62]]));
    soft(g, Rc(1e3, 244, 150, 24), grey(0.55), 6, 0.8);
    soft(g, pth([[1106, 292], [1129, 288], [1130, 330], [1116, 354], [1106, 334]]), grey(0.6), 7, 0.75);
    soft(g, pth([[1016, 296], [1027, 298], [1031, 344], [1020, 334]]), grey(0.66), 6, 0.7);
    soft(g, pth([[1098, 312], [1114, 308], [1112, 346], [1100, 340]]), grey(0.74), 6, 0.55);
    for (const [x, w] of [[1037, 22], [1104, 23]]) {
      soft(g, E(x, 283, w, 11, 0), grey(0.6), 4, 0.7);
      soft(g, E(x + 1, 297.5, w * 0.8, 5, 0), grey(0.42), 3.5, 0.62);
      soft(g, E(x + 3, 301, w * 0.6, 3, 0), grey(0.55), 2.5, 0.5);
    }
    soft(g, pth([[1054, 292], [1061, 292], [1063, 322], [1055, 318]]), grey(0.66), 2.6, 0.75);
    soft(g, pth([[1081, 300], [1087, 304], [1089, 326], [1081, 324]]), grey(0.7), 2.6, 0.6);
    soft(g, E(1073, 333.5, 15, 3.2, 0), grey(0.5), 2, 0.85);
    soft(g, E(1072, 322, 6, 5, 0), grey(1), 3, 0.7);
    soft(g, E(1072, 356, 15, 3.6, 0), grey(0.62), 2.2, 0.8);
    soft(g, E(1071, 368, 20, 6, 0), grey(0.82), 4, 0.5);
    soft(g, E(1072, 380, 40, 8, 0), grey(0.42), 5, 0.85);
    const v = valCtx();
    v.fillStyle = "#fff";
    v.fillRect(1e3, 244, 140, 140);
    vFill(v, [[1106, 292], [1129, 288], [1130, 330], [1116, 354], [1106, 334]], 0.5, { blur: 5 });
    vFill(v, [[1016, 296], [1027, 296], [1031, 342], [1020, 334]], 0.55, { blur: 5 });
    vFill(v, [[1e3, 244], [1140, 244], [1140, 270], [1e3, 270]], 0.45, { blur: 5, smooth: false });
    vFill(v, [[1030, 362], [1112, 360], [1112, 384], [1030, 384]], 0.55, { blur: 4, smooth: false });
    soft(g, pth([[1022, 300], [1034, 318], [1040, 345], [1030, 344]]), grey(0.6), 5, 0.45);
    soft(g, pth([[1100, 322], [1116, 318], [1114, 350], [1100, 356]]), grey(0.55), 5, 0.5);
    {
      const rs = rng(1707);
      for (let i = 0; i < 520; i++) {
        const x = 1022 + rs() * 104, y = 290 + rs() * 90, jaw = Math.max(0, (y - 338) / 40);
        if (rs() > 0.25 + 0.75 * jaw) continue;
        g.fillStyle = grey(0.35, 0.18 + 0.25 * jaw);
        g.fillRect(x, y, 1, 1);
      }
    }
    g.restore();
    curve(g, [[1021, 322], [1028, 342], [1040, 359], [1056, 372], [1070, 378], [1084, 376], [1099, 367], [1111, 352], [1118, 334]], 1, grey(0.2, 0.6), { seed: 1710, ends: 0.3 });
    const eyes = [
      { x0: 1020, x1: 1053, cx: 1037, ix: (down ? 1038.5 : 1032.5) + edx, seed: 1720, side: -1 },
      { x0: 1087, x1: 1122, cx: 1104, ix: (down ? 1103 : 1096) + edx, seed: 1730, side: 1 }
    ];
    for (const { x0, x1, cx, ix, seed, side } of eyes) {
      const lid = (down ? 1.8 : 0) + elid;
      const top = (x) => {
        const u = (x - x0) / (x1 - x0);
        return 287 - 6.2 * Math.sin(Math.PI * Math.pow(u, side < 0 ? 0.85 : 1.15)) + lid * Math.sin(Math.PI * u);
      };
      const bot = (x) => {
        const u = (x - x0) / (x1 - x0);
        return 287.5 + 4.6 * Math.sin(Math.PI * Math.pow(u, side < 0 ? 1.2 : 0.8));
      };
      const eyePts = [];
      for (let i = 0; i <= 12; i++) {
        const x = x0 + (x1 - x0) * i / 12;
        eyePts.push([x, top(x)]);
      }
      for (let i = 12; i >= 0; i--) {
        const x = x0 + (x1 - x0) * i / 12;
        eyePts.push([x, bot(x)]);
      }
      polyPath(g, eyePts);
      g.fillStyle = grey(0.68);
      g.fill();
      g.save();
      polyPath(g, eyePts);
      g.clip();
      soft(g, E(ix + 12, 288.5, 9, 3, 0), grey(0.85), 2, 0.75);
      const iy = 287.5 + (down ? 1.6 : 0) + elid * 0.4;
      dot(g, ix, iy, 6.2, grey(0.3));
      dot(g, ix, iy, 4.8, grey(0.14));
      dot(g, ix, iy, 2.4, grey(0.02));
      dot(g, ix + 1.8, iy - 2.2, 1.1, grey(0.92));
      soft(g, Rc(x0, 276, x1 - x0, 5.6 + lid), grey(0.08), 1.3, 0.75);
      g.restore();
      const up = [];
      for (let i = 0; i <= 10; i++) {
        const x = x0 - 2 + (x1 - x0 + 4) * i / 10;
        up.push([x, top(Math.max(x0, Math.min(x1, x))) - 0.3]);
      }
      curve(g, up, 2.6, grey(0.04), { seed, ends: 0.25 });
      const ox = side < 0 ? x0 : x1;
      for (let k = 0; k < 3; k++) ink(g, [[ox + side * (1 - k * 2.2), 287 - k * 1.6], [ox + side * (4.5 - k * 1.5), 283.5 - k * 2]], 0.9, grey(0.05, 0.85), { seed: seed + 10 + k });
      const lo = [];
      for (let i = 1; i < 10; i++) {
        const x = x0 + (x1 - x0) * i / 10;
        lo.push([x, bot(x) + 0.4]);
      }
      curve(g, lo, 1.2, grey(0.2, 0.85), { seed: seed + 2 });
      curve(g, [[x0 + 2, 279], [cx - 6, 274.5], [cx + 7, 274.5], [x1 - 2, 279.5]], 1.1, grey(0.22, 0.75), { seed: seed + 1, ends: 0.3 });
      curve(g, [[x0 + 3, 297], [cx, 302.5], [x1 - 4, 297.5]], 1.3, grey(0.2, 0.6), { seed: seed + 3 });
    }
    curve(g, [[1024, 270.5], [1036, 267], [1052, 264.5]], 2.8, grey(0.05), { seed: 1740, ends: 0.25 });
    curve(g, [[1084, 266], [1098, 265.5], [1114, 268]], 2.8, grey(0.05), { seed: 1741, ends: 0.25 });
    blurDraw(g, [1050, 288, 1068, 326], 1.2, (c) => curve(c, [[1058, 292], [1058, 306], [1059, 318]], 1.6, grey(0.45, 0.5), { seed: 1742 }));
    blurDraw(g, [1052, 316, 1094, 338], 0.8, (c) => {
      curve(c, [[1057, 320], [1058, 327], [1064, 331]], 1.4, grey(0.3, 0.7), { seed: 1743 });
      curve(c, [[1082, 331], [1087, 327], [1087, 320]], 1.4, grey(0.3, 0.7), { seed: 1748 });
      curve(c, [[1066, 332], [1073, 333.5], [1080, 332]], 1.2, grey(0.35, 0.6), { seed: 1749 });
    });
    soft(g, E(1066, 330, 2.6, 1.3, 0.2), grey(0.2), 0.9, 0.7);
    soft(g, E(1080, 330, 2.6, 1.3, -0.2), grey(0.2), 0.9, 0.7);
    soft(g, pth([[1056, 346], [1066, 343], [1072, 344.5], [1078, 343], [1089, 346.5], [1072, 348]]), grey(0.62), 1.2, 0.6);
    curve(g, [[1052, 349.5], [1061, 347.6], [1071, 348], [1082, 347.6], [1091, 349.5]], 1.3, grey(0.25, 0.85), { seed: 1745, ends: 0.2 });
    soft(g, E(1072, 353.5, 13, 3, 0), grey(0.86), 1.5, 0.6);
    curve(g, [[1062, 357.5], [1072, 359], [1083, 357.5]], 1.1, grey(0.4, 0.55), { seed: 1747 });
    for (const [x, y, l] of [[1032, 316, 6], [1105, 334, 5], [1109, 322, 4], [1046, 258, 3], [1095, 256, 3]]) {
      ink(g, [[x, y], [x + 0.4, y + l]], 1.6, grey(0.3, 0.75), { seed: x });
      dot(g, x + 0.4, y + l, 1.2, grey(0.95, 0.85));
    }
    const B2 = [[993, 277], [990, 244], [993, 215], [999, 195], [1010, 178], [1028, 165], [1052, 158], [1080, 158], [1106, 164], [1125, 177], [1137, 195], [1144, 215], [1148, 244], [1147, 281], [1132, 262], [1112, 251], [1090, 246], [1070, 245], [1050, 247], [1030, 252], [1010, 262]];
    fillBlob(g, B2, grey(0.22));
    g.save();
    g.beginPath();
    smoothPath(g, B2, true);
    g.clip();
    soft(g, pth(B2), rg(g, 1062, 185, 8, 125, [[0, 0.3], [0.55, 0.24], [1, 0.14]]));
    soft(g, pth([[1115, 170], [1152, 200], [1152, 285], [1126, 260], [1115, 220]]), grey(0.1), 12, 0.55);
    const rb = rng(1750);
    for (let i = 0; i < 68; i++) {
      const x = 990 + i * 2.35 + rb() * 0.5, d = (x - 1068) / 78;
      ink(g, [[1068 + (x - 1068) * 0.72, 162 + d * d * 26], [x, 204]], 0.8, grey(0.36, 0.16 + 0.1 * rb()), { seed: 1751 + i });
      ink(g, [[x + 0.9, 212], [x + 0.9 + d * 1.5, 280]], 0.95, grey(0.38, 0.2 + 0.12 * rb()), { seed: 1830 + i });
      ink(g, [[x - 0.3, 212], [x - 0.3 + d * 1.5, 280]], 0.7, grey(0.05, 0.4), { seed: 1900 + i });
    }
    for (let i = 0; i < 900; i++) {
      const x = 990 + rb() * 160, y = 158 + rb() * 125;
      g.fillStyle = grey(rb() < 0.5 ? 0.42 : 0.05, 0.25);
      g.fillRect(x, y, 1.2, 1.6);
    }
    soft(g, pth([[990, 210], [1072, 204], [1152, 212], [1152, 230], [1072, 222], [990, 228]]), grey(0.32), 5, 0.5);
    soft(g, pth([[990, 211], [1030, 204], [1072, 200], [1110, 203], [1152, 212], [1152, 217], [1110, 208], [1072, 205.5], [1030, 209], [990, 217]]), grey(0.04), 1.2, 0.9);
    soft(g, pth([[990, 248], [1070, 238], [1152, 250], [1152, 290], [990, 290]]), grey(0.08), 6, 0.5);
    g.restore();
    curve(g, B2, 1.1, grey(0.28, 0.7), { closed: true, seed: 1901, ends: 0.9 });
    const lock = (pts, w, sheen = 0.35) => {
      const q = sampleCurve(pts, 8).map(([x, y], i, a) => {
        const u = i / (a.length - 1);
        return [x + Math.sin(u * PI * 2.2 + pts[0][0] * 0.13) * w * 0.25 * u, y];
      });
      taper(g, q, (u) => w * Math.pow(1 - u, 0.8) + 0.35, grey(0.02));
      if (sheen > 0) {
        const s2 = q.slice(1, Math.floor(q.length * 0.75)).map(([x, y], i, a) => {
          const b = a[Math.min(a.length - 1, i + 1)], c = a[Math.max(0, i - 1)], dx = b[0] - c[0], dy = b[1] - c[1], L = Math.hypot(dx, dy) || 1;
          return [x - dy / L * w * 0.2, y + dx / L * w * 0.2];
        });
        if (s2.length > 2) taper(g, s2, (u) => 0.9 * Math.sin(Math.PI * u), grey(0.5, sheen));
      }
    };
    curve(g, [[994, 268], [1012, 262], [1030, 253], [1050, 248], [1070, 246.5], [1090, 247.5], [1112, 252], [1132, 263], [1146, 280]], 5, grey(0.02), { seed: 1902, ends: 0.8 });
    const locks = [
      // the big clump falling between his eyes, crossing to the left of the nose
      [[[1063, 245], [1066, 262], [1061, 281], [1055, 296], [1050, 307]], 10],
      [[[1070, 246], [1072, 262], [1068, 278]], 5],
      [[[1049, 248], [1041, 262], [1033, 273]], 7],
      [[[1040, 250], [1032, 262], [1026, 272]], 5],
      [[[1026, 253], [1018, 272], [1014, 292]], 8],
      [[[1016, 258], [1010, 280], [1008, 300]], 9],
      [[[1004, 262], [1002, 290], [1004, 318], [1002, 342]], 12],
      [[[1014, 280], [1016, 306], [1013, 330], [1006, 348]], 7],
      [[[1087, 247], [1094, 261], [1100, 274]], 6],
      [[[1097, 248], [1106, 262], [1112, 277]], 6],
      [[[1110, 251], [1119, 266], [1125, 284], [1127, 304]], 8],
      [[[1122, 256], [1131, 280], [1134, 306], [1131, 330], [1126, 348]], 10],
      [[[1136, 266], [1142, 292], [1145, 318], [1140, 344]], 10],
      [[[1019, 264], [1022, 286], [1022, 306]], 5],
      [[[1030, 256], [1027, 276], [1027, 290]], 4],
      [[[1118, 264], [1118, 288], [1120, 308]], 5],
      [[[1106, 256], [1111, 276], [1112, 290]], 4]
    ];
    const rh = rng(1905);
    for (const [pts, w] of locks) {
      lock(pts, w);
      lock(pts.map(([x, y], i) => [x + (rh() - 0.5) * 5 * i, y + (rh() - 0.3) * 3 * i]), w * 0.45, 0);
    }
    for (const side of [-1, 1]) for (let i = 0; i < 10; i++) {
      const x = side < 0 ? 1e3 + rh() * 14 : 1128 + rh() * 16, y = 290 + rh() * 40, len = 18 + rh() * 26, out = (rh() - 0.2) * 12;
      lock([[x, y], [x + side * out * 0.3, y + len * 0.5], [x + side * out, y + len]], 3 + rh() * 3, 0.2);
    }
    for (let i = 0; i < 18; i++) {
      const side = i % 2 ? 1 : -1, x = side < 0 ? 996 + rh() * 22 : 1124 + rh() * 22, y = 262 + rh() * 30;
      const q = sampleCurve([[x, y], [x + side * 3, y + 20 + rh() * 12], [x + side * (5 + rh() * 8), y + 34 + rh() * 20]], 8);
      taper(g, q, (u) => (1 + rh() * 0.6) * Math.sin(Math.PI * u), grey(0.35 + rh() * 0.2, 0.6));
    }
    for (const [cx, cy, rx, ry, a, sd] of [[1030, 398, 24, 40, 0.06, -1], [1119, 392, 20, 35, -0.08, 1]]) {
      g.save();
      g.translate(cx, cy);
      g.rotate(a);
      soft(g, E(0, 0, rx, ry, 0), grey(0.06));
      const fx = sd * rx * 0.28, frx = rx * 0.66, fry = ry * 0.92;
      soft(g, E(fx, 0, frx, fry, 0), lg(g, fx - frx, -fry, fx + frx, fry, [[0, 0.68], [0.5, 0.48], [1, 0.25]]));
      for (const k of [0.75, 0.5]) {
        g.strokeStyle = grey(0.5, 0.5);
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(fx + sd * frx * (1 - k) * 0.3, 0, frx * k, fry * k, 0, 0, PI * 2);
        g.stroke();
      }
      g.strokeStyle = grey(0.92, 0.9);
      g.lineWidth = 2.2;
      g.beginPath();
      g.ellipse(fx, 0, frx, fry, 0, sd < 0 ? 1.7 : -1.4, sd < 0 ? 4.6 : 1.4);
      g.stroke();
      g.strokeStyle = grey(0.05, 0.9);
      g.lineWidth = 1.2;
      g.beginPath();
      g.ellipse(fx, 0, frx, fry, 0, 0, PI * 2);
      g.stroke();
      const cxn = -sd * rx * 0.55;
      g.save();
      g.beginPath();
      g.ellipse(cxn, 0, rx * 0.45, ry * 0.95, 0, 0, PI * 2);
      g.clip();
      g.fillStyle = grey(0.18);
      g.fillRect(-rx * 2, -ry, rx * 4, ry * 2);
      for (let k = -ry; k < ry; k += 3.2) {
        g.strokeStyle = grey(0.7, 0.8);
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(cxn - rx * 0.45, k);
        g.lineTo(cxn + rx * 0.45, k + 1);
        g.stroke();
      }
      g.restore();
      g.strokeStyle = grey(0.03);
      g.lineWidth = 1.4;
      g.beginPath();
      g.ellipse(0, 0, rx, ry, 0, 0, PI * 2);
      g.stroke();
      g.restore();
    }
  }
  function laptop(g) {
    const lid = [[914, 449], [1083, 449], [1112, 521], [898, 521]];
    fillPoly(g, lid, "#050505");
    ink(g, [[914, 449], [1083, 449]], 3.2, grey(0.95), { seed: 2001 });
    ink(g, [[1083, 449], [1112, 521]], 2.4, grey(0.92), { seed: 2002 });
    ink(g, [[914, 449], [898, 521]], 1.2, grey(0.5), { seed: 2003 });
    dot(g, 1010, 491, 9.5, grey(0.97));
  }
  function deskTop(g) {
    wood(g, [[770, 523], [1512, 522], [1512, 542], [770, 543]], { v0: 0.56, v1: 0.36, dir: "h", grain: 0.3, per: 2.4, seed: 2010, lit: 0.9, litW: 1.6, edge: 0 });
    ink(g, [[770, 543], [1512, 542]], 1.6, BLK, { seed: 2012 });
    fillPoly(g, [[772, 544], [1510, 543], [1508, 556], [774, 557]], "#040404");
  }
  function mug(g) {
    const body = [[816, 473], [818, 470], [869, 470], [871, 473], [868, 520], [820, 520]];
    polyPath(g, body);
    const bg = g.createLinearGradient(816, 0, 871, 0);
    bg.addColorStop(0, grey(0.38));
    bg.addColorStop(0.18, grey(0.55));
    bg.addColorStop(0.4, grey(0.88));
    bg.addColorStop(0.65, grey(0.95));
    bg.addColorStop(0.9, grey(0.93));
    bg.addColorStop(1, grey(0.78));
    g.fillStyle = bg;
    g.fill();
    g.save();
    polyPath(g, body);
    g.clip();
    soft(g, Rc(816, 508, 56, 14), grey(0.55), 4, 0.35);
    soft(g, Rc(826, 474, 6, 44), grey(0.62), 3, 0.35);
    g.restore();
    g.fillStyle = grey(0.84);
    g.beginPath();
    g.ellipse(843.5, 471, 26.5, 2.2, 0, 0, PI * 2);
    g.fill();
    ink(g, [[820, 471], [843, 469.4], [867, 471]], 0.9, grey(0.5, 0.7), { seed: 2024 });
    ink(g, body, 1.2, BLK, { closed: true, seed: 2025 });
    g.lineCap = "round";
    g.strokeStyle = grey(0.05);
    g.lineWidth = 5.6;
    g.beginPath();
    g.ellipse(870, 498.5, 13, 14.5, 0, -PI * 0.5, PI * 0.5);
    g.stroke();
    g.strokeStyle = grey(0.92);
    g.lineWidth = 3.6;
    g.beginPath();
    g.ellipse(870, 498.5, 13, 14.5, 0, -PI * 0.5, PI * 0.5);
    g.stroke();
    g.strokeStyle = grey(0.32, 0.9);
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(817, 500, 12, 11.5, 0, PI * 0.5, PI * 1.5);
    g.stroke();
  }
  function lampAndGear(g) {
    ink(g, [[1426, 330], [1424, 424]], 2.2, grey(0.6), { seed: 2040 });
    ink(g, [[1433, 318], [1497, 388]], 2.6, grey(0.72), { seed: 2041 });
    ink(g, [[1440, 314], [1503, 382]], 1.6, grey(0.6), { seed: 2042 });
    ink(g, [[1495, 394], [1472, 440]], 2.4, grey(0.62), { seed: 2043 });
    dot(g, 1496, 392, 7, "#0b0b0b");
    ring(g, 1496, 392, 6.5, 1.6, grey(0.85));
    dot(g, 1496, 392, 2, grey(0.8));
    dot(g, 1434, 318, 4.5, grey(0.7));
    const shade = [[1396, 284], [1380, 292], [1356, 305], [1336, 320], [1322, 336], [1340, 362], [1368, 378], [1398, 382], [1408, 360], [1414, 336], [1420, 308]];
    soft(g, pth(shade), lg(g, 1330, 300, 1415, 370, [[0, 0.45], [0.35, 0.22], [0.7, 0.1], [1, 0.05]]));
    g.save();
    g.beginPath();
    smoothPath(g, shade, true);
    g.clip();
    for (const [pts, w, v] of [[[[1392, 290], [1366, 302], [1340, 322]], 3, 0.85], [[[1398, 296], [1376, 312], [1352, 334]], 1.6, 0.55], [[[1410, 312], [1396, 336], [1380, 360]], 1.2, 0.35]]) blurDraw(g, bboxOf(pts, 6), 1.2, (c) => curve(c, pts, w, grey(v, 0.9), { seed: 2044, ends: 0.2, jit: 0 }));
    g.restore();
    curve(g, shade, 1.3, BLK, { closed: true, seed: 2045, ends: 0.9 });
    fillPoly(g, [[1392, 280], [1412, 270], [1424, 292], [1406, 304]], grey(0.14));
    ink(g, [[1392, 280], [1412, 270]], 1.6, grey(0.75), { seed: 2046 });
    ink(g, [[1392, 280], [1412, 270], [1424, 292], [1406, 304]], 1.1, BLK, { closed: true, seed: 2047 });
    g.save();
    g.translate(1361, 354);
    g.rotate(0.6);
    g.fillStyle = grey(0.97);
    g.beginPath();
    g.ellipse(0, 0, 42, 15, 0, 0, PI * 2);
    g.fill();
    g.strokeStyle = grey(0.15);
    g.lineWidth = 2.2;
    g.beginPath();
    g.ellipse(0, 0, 42, 15, 0, 0, PI * 2);
    g.stroke();
    g.strokeStyle = grey(0.7, 0.8);
    g.lineWidth = 1;
    g.beginPath();
    g.ellipse(2, -1, 34, 11, 0, PI * 1.05, PI * 1.95);
    g.stroke();
    g.fillStyle = grey(1);
    g.beginPath();
    g.ellipse(4, -2, 14, 7, 0, 0, PI * 2);
    g.fill();
    g.strokeStyle = grey(0.6, 0.7);
    g.lineWidth = 0.9;
    g.beginPath();
    g.ellipse(4, -2, 14, 7, 0, 0, PI * 2);
    g.stroke();
    g.restore();
    for (const [x0, y0, x1, y1] of [[1300, 455, 1293, 418], [1307, 455, 1306, 420], [1314, 455, 1318, 416], [1320, 455, 1330, 424], [1326, 455, 1338, 432], [1303, 455, 1290, 430]]) ink(g, [[x0, y0], [x1, y1]], 2.4, grey(0.85), { seed: x1 * 7 });
    const cup = [[1296, 453], [1331, 453], [1330, 500], [1297, 500]];
    polyPath(g, cup);
    {
      const cg = g.createLinearGradient(1296, 0, 1331, 0);
      cg.addColorStop(0, grey(0.18));
      cg.addColorStop(0.3, grey(0.5));
      cg.addColorStop(0.45, grey(0.3));
      cg.addColorStop(1, grey(0.08));
      g.fillStyle = cg;
      g.fill();
    }
    g.save();
    polyPath(g, cup);
    g.clip();
    for (let i = 0; i < 12; i++) ink(g, [[1296, 458 + i * 3.8], [1331, 458 + i * 3.8]], 0.7, grey(0.6, 0.18), { seed: 2052 + i });
    g.restore();
    g.fillStyle = grey(0.6);
    g.beginPath();
    g.ellipse(1313.5, 453.5, 17.5, 2.6, 0, 0, PI * 2);
    g.fill();
    ink(g, cup, 1.3, BLK, { closed: true, seed: 2051 });
    book(g, [[1236, 490], [1296, 488], [1297, 505], [1237, 506]], { seed: 2060 });
    book(g, [[1232, 505], [1300, 504], [1301, 521], [1233, 522]], { seed: 2062 });
    book(g, [[1360, 424], [1430, 422], [1432, 440], [1361, 441]], { seed: 2070 });
    stripes(g, [[1348, 440], [1478, 438], [1480, 458], [1349, 459]], { dir: "h", per: 3, cov: 0.8, lum: 0.9, seed: 2072, brk: 0.2 });
    ink(g, [[1348, 440], [1478, 438], [1480, 458], [1349, 459]], 1.3, BLK, { closed: true, seed: 2073 });
    const rx = [[1353, 459], [1486, 457], [1488, 522], [1353, 523]];
    stripes(g, rx, { dir: "h", per: 3.4, cov: (u, v) => lerp(0.2, 0.1, u), lum: 0.55, seed: 2074, brk: 0.2 });
    ink(g, rx, 1.4, grey(0.85), { closed: true, seed: 2075 });
    ink(g, [[1353, 490], [1486, 489]], 1, grey(0.3), { seed: 2076 });
    for (const [x, r] of [[1365, 7], [1412, 8], [1435, 7]]) {
      dot(g, x, 473, r, grey(0.1));
      ring(g, x, 473, r, 1.6, grey(0.9));
      dot(g, x - 1.5, 471, 1.6, grey(0.9));
    }
    fillPoly(g, [[1380, 468], [1396, 468], [1396, 478], [1380, 478]], grey(0.6));
    fillPoly(g, [[1455, 467], [1476, 467], [1476, 480], [1455, 480]], grey(0.85));
    ink(g, [[1455, 467], [1476, 467], [1476, 480], [1455, 480]], 1.2, BLK, { closed: true, seed: 2077 });
    for (const x of [1367, 1388, 1414, 1435, 1466]) {
      dot(g, x, 503, 6, grey(0.06));
      ring(g, x, 503, 6.5, 1.5, grey(0.85));
    }
  }
  function cable(g, pts, w = 5, seed = 1, lit = 0.75) {
    w *= 1.45;
    curve(g, pts, w, "#030303", { seed, ends: 0.85 });
    curve(g, pts.map(([x, y]) => [x - w * 0.2, y - w * 0.1]), Math.max(1.2, w * 0.26), grey(0.88, lit), { seed: seed + 1, ends: 0.4 });
  }
  function cables(g) {
    cable(g, [[922, 520], [912, 545], [904, 562], [900, 620], [897, 687], [879, 781], [854, 850], [826, 874], [790, 880]], 5.5, 2100);
    cable(g, [[944, 520], [936, 548], [928, 600], [920, 660], [912, 720], [900, 770], [884, 812], [860, 846]], 5, 2102);
    cable(g, [[926, 522], [934, 548], [952, 562]], 4, 2104);
    cable(g, [[841, 794], [822, 850], [785, 875], [740, 884]], 4, 2106, 0.6);
    for (const [pts, w, sd] of [
      [[[1325, 520], [1318, 580], [1305, 670], [1300, 760], [1310, 850], [1330, 880]], 4.6, 2110],
      [[[1367, 509], [1372, 560], [1380, 600], [1390, 700], [1410, 800], [1440, 870]], 4.6, 2112],
      [[[1388, 509], [1395, 560], [1418, 620], [1440, 690], [1462, 760], [1476, 850]], 4.4, 2114],
      [[[1414, 509], [1420, 560], [1430, 620], [1438, 700], [1446, 790], [1452, 860]], 4.2, 2116],
      [[[1435, 509], [1446, 560], [1470, 620], [1480, 700], [1490, 830], [1500, 870]], 4.4, 2118],
      [[[1466, 509], [1476, 560], [1486, 620], [1496, 700]], 4.2, 2120],
      [[[1300, 525], [1290, 600], [1270, 690], [1262, 760]], 4, 2122],
      [[[1250, 525], [1258, 580], [1262, 640]], 3.6, 2124]
    ]) cable(g, pts, w, sd);
    cable(g, [[1500, 782], [1560, 752], [1620, 748], [1700, 758], [1760, 786], [1800, 800]], 4, 2130, 0.6);
    cable(g, [[1280, 872], [1360, 884], [1440, 876], [1520, 888], [1600, 880], [1680, 890], [1760, 884]], 4.2, 2132, 0.5);
    cable(g, [[1300, 860], [1380, 868], [1460, 860], [1540, 872]], 3.6, 2134, 0.45);
    cable(g, [[520, 870], [600, 884], [680, 876], [760, 890], [840, 884], [900, 892]], 4.2, 2136, 0.5);
    cable(g, [[600, 690], [612, 740], [604, 790], [590, 830]], 9, 2138, 0.8);
    cable(g, [[420, 600], [440, 660], [470, 720], [500, 760], [530, 800], [560, 830]], 4, 2140);
    cable(g, [[445, 600], [480, 650], [520, 690], [556, 720], [590, 760]], 3.8, 2142);
    cable(g, [[477, 600], [500, 640], [530, 670], [560, 690]], 3.6, 2144);
    cable(g, [[1650, 740], [1700, 780], [1750, 800], [1800, 830]], 3.6, 2146, 0.5);
  }
  function rightCentre(g) {
    stripes(g, [[1340, 703], [1520, 702], [1520, 712], [1340, 713]], { dir: "h", per: 2.8, cov: 0.9, lum: 0.9, seed: 2200 });
    stripes(g, [[1340, 713], [1520, 712], [1520, 728], [1340, 729]], { dir: "h", per: 3, cov: 0.55, lum: 0.75, seed: 2201 });
    stripes(g, [[1320, 742], [1525, 741], [1525, 768], [1320, 769]], { dir: "h", per: 3, cov: bl(0.8, 0.9, 0.6, 0.5), lum: 0.88, seed: 2202 });
    for (const x of [1360, 1510]) {
      stripes(g, [[x, 769], [x + 15, 769], [x + 15, 852], [x, 852]], { per: 3, cov: ug(0.9, 0.4), lum: 0.9, seed: 2203 + x });
      for (const y of [780, 840]) ink(g, [[x - 2, y], [x + 17, y]], 2, grey(0.85), { seed: y + x });
    }
    stripes(g, [[1494, 550], [1612, 550], [1612, 565], [1494, 565]], { dir: "h", per: 2.8, cov: 0.85, lum: 0.92, seed: 2210 });
    stripes(g, [[1494, 565], [1612, 565], [1612, 790], [1494, 790]], { per: 4.2, cov: fadeEdges(bl(0.6, 0.35, 0.25, 0.45), 0.01, 0.03), lum: 0.8, seed: 2211 });
    ink(g, [[1494, 550], [1612, 550], [1612, 790], [1494, 790]], 1.6, BLK, { closed: true, seed: 2212 });
    driver(g, 1553, 613, 15, "tweeter");
    driver(g, 1550, 688, 47, "woofer");
    dot(g, 1553, 770, 22, "#070707");
    ring(g, 1553, 770, 22, 1.4, grey(0.5));
  }
  function darkBox(g, pts, edge = 0.35, seed = 1) {
    stripes(g, pts, { per: 5, cov: fadeEdges(bl(0.12, 0.08, 0.05, 0.08), 0.05, 0.05), lum: 0.5, seed });
    ink(g, [pts[0], pts[1]], 1.3, grey(0.6, edge), { seed: seed + 1 });
  }
  function rightBack(g) {
    stripes(g, [[1822, 128], [1905, 118], [1905, 242], [1822, 246]], { per: 5, cov: fadeEdges(bl(0.35, 0.3, 0.3, 0.3), 0.02, 0.02), lum: 0.6, seed: 2300 });
    ink(g, [[2090, 95], [2165, 95], [2165, 215]], 1.2, grey(0.3), { seed: 2301 });
    darkBox(g, [[1722, 246], [1796, 250], [1798, 332], [1722, 332]], 0.4, 2302);
    darkBox(g, [[1688, 330], [1800, 334], [1802, 420], [1688, 420]], 0.3, 2303);
    darkBox(g, [[1726, 405], [1812, 413], [1812, 470], [1726, 470]], 0.7, 2304);
    stripes(g, [[1800, 415], [1845, 418], [1845, 450], [1800, 450]], { per: 4, cov: 0.55, lum: 0.8, seed: 2305 });
    const S = [
      [[[1586, 287], [1720, 250], [1721, 330], [1587, 358]], 0.95, 2310],
      [[[1619, 354], [1687, 331], [1687, 418], [1620, 428]], 0.92, 2311],
      [[[1588, 437], [1725, 406], [1726, 552], [1588, 560]], 0.9, 2312]
    ];
    for (const [q, v, seed] of S) {
      stripes(g, q, { per: 5, cov: fadeEdges(bl(v * 0.8, v * 0.68, v * 0.46, v * 0.56), 0.03, 0.03), lum: 0.92, seed });
      ink(g, [q[0], q[1]], 1.8, grey(0.92), { seed: seed + 1 });
    }
    fillPoly(g, [[1570, 360], [1604, 356], [1606, 450], [1572, 452]], grey(0.26));
    ink(g, [[1570, 360], [1604, 356], [1606, 450], [1572, 452]], 1.4, grey(0.8), { closed: true, seed: 2314 });
    dot(g, 1588, 408, 11, grey(0.12));
    ring(g, 1588, 408, 11, 2, grey(0.85));
    ring(g, 1588, 408, 6, 1.2, grey(0.6));
    for (const [cx, cy, rx, ry, a] of [[1650, 232, 20, 24, -0.2], [1695, 226, 17, 22, 0.25]]) {
      g.save();
      g.translate(cx, cy);
      g.rotate(a);
      dot(g, 0, 0, rx, "#070707");
      for (let k = 0; k < 4; k++) {
        g.strokeStyle = grey(k % 2 ? 0.15 : 0.55);
        g.lineWidth = 1.6;
        g.beginPath();
        g.ellipse(0, 0, rx - k * 3, ry - k * 3.5, 0, 0, PI * 2);
        g.stroke();
      }
      g.restore();
    }
    curve(g, [[1628, 236], [1640, 212], [1672, 205], [1712, 210], [1735, 228]], 4, grey(0.35), { seed: 2316 });
    const r = rng(2320);
    for (let i = 0; i < 12; i++) {
      const x0 = 1745 + r() * 100, y0 = 245 + r() * 20, dx = (r() - 0.3) * 60;
      cable(g, [[x0, y0], [x0 + dx * 0.3 + 10, y0 + 60 + r() * 20], [x0 + dx * 0.7, y0 + 120 + r() * 40], [x0 + dx, y0 + 170 + r() * 60]], 2.4 + r() * 1.6, 2321 + i, 0.55);
    }
    for (let i = 0; i < 3; i++) {
      g.strokeStyle = grey(0.45, 0.7);
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(1800 + i * 10, 330, 34 - i * 6, 56 - i * 8, 0.2, 0.2, 5.8);
      g.stroke();
    }
    ink(g, [[1780, 413], [1893, 413]], 1.4, grey(0.5), { seed: 2325 });
    stripes(g, [[1880, 245], [1937, 225], [1938, 405], [1881, 408]], { per: 5, cov: fadeEdges(bl(0.85, 0.75, 0.55, 0.6), 0.03, 0.02), lum: 0.93, seed: 2330 });
    ink(g, [[1880, 245], [1937, 225]], 1.6, grey(0.9), { seed: 2331 });
    stripes(g, [[1932, 378], [2085, 330], [2086, 455], [1932, 487]], { per: 5, cov: fadeEdges(bl(0.95, 0.85, 0.72, 0.8), 0.02, 0), lum: 0.95, seed: 2332 });
    ink(g, [[1932, 378], [2085, 330]], 1.8, grey(0.92), { seed: 2333 });
    stripes(g, [[1932, 487], [2086, 455], [2087, 552], [1932, 556]], { per: 5, cov: fadeEdges(bl(0.85, 0.8, 0.6, 0.65), 0.02, 0), lum: 0.92, seed: 2334 });
    ink(g, [[1932, 487], [2086, 455]], 1.6, BLK, { seed: 2335 });
    fillPoly(g, [[1968, 356], [2010, 344], [2012, 356], [1970, 368]], grey(0.8));
    stripes(g, [[2105, 335], [2155, 335], [2155, 356], [2105, 356]], { per: 4, cov: 0.4, lum: 0.7, seed: 2336 });
    stripes(g, [[2130, 460], [2165, 460], [2165, 492], [2130, 492]], { per: 4, cov: 0.4, lum: 0.7, seed: 2337 });
    ink(g, [[2060, 336], [2176, 334]], 2.4, grey(0.7), { seed: 2340 });
    const pot = [[2084, 288], [2150, 286], [2145, 332], [2090, 334]];
    stripes(g, pot, { dir: "h", per: 3.4, cov: (u, v) => lerp(0.4, 0.95, Math.sin(PI * clamp2(u))), lum: 0.9, seed: 2341, brk: 0.2 });
    ink(g, pot, 1.4, BLK, { closed: true, seed: 2342 });
    const RL = [
      [2095, 280, -1.75, 30],
      [2118, 276, -1.3, 30],
      [2140, 280, -0.8, 30],
      [2078, 282, -2.2, 28],
      [2160, 288, -0.3, 26],
      [2066, 272, -2.7, 28],
      [2102, 262, -1.6, 28],
      [2130, 258, -1.1, 26],
      [2150, 250, -0.7, 26],
      [2080, 256, -2.1, 28],
      [2050, 262, -2.6, 26],
      [2168, 270, 0.1, 22],
      [2030, 285, 2.9, 26],
      [2010, 300, 2.6, 24],
      [2040, 300, 1.9, 24],
      [2112, 240, -1.5, 22],
      [2155, 305, 0.6, 24]
    ];
    RL.forEach(([x, y, a, s], i) => leaf(g, x, y, a, s, 0.66 + i % 3 * 0.08, 2350 + i * 3));
    curve(g, [[2046, 300], [2040, 340], [2046, 380], [2040, 420], [2046, 450]], 1.1, grey(0.5, 0.6), { seed: 2349 });
    [[2040, 318, 2.6, 22], [2046, 340, 1, 22], [2040, 362, 2.2, 22], [2046, 385, 1.2, 22], [2040, 408, 2, 20], [2046, 430, 1.4, 20]].forEach(([x, y, a, s], i) => leaf(g, x, y, a, s, 0.72, 2400 + i * 3));
  }
  function uprightSynth(g) {
    fillPoly(g, [[1560, 440], [1590, 440], [1590, 550], [1560, 550]], grey(0.12));
    for (let i = 0; i < 4; i++) {
      dot(g, 1575, 455 + i * 24, 4, grey(0.08));
      ring(g, 1575, 455 + i * 24, 4, 1.2, grey(0.7));
    }
    const TL = [1650, 488], TR = [1766, 445], BR = [1752, 760], BLc = [1632, 746];
    const Q = [TL, TR, BR, BLc], at = (u, v) => bil(Q, u, v);
    const quad = (u0, v0, u1, v1) => [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
    fillPoly(g, Q, "#060606");
    for (let i = 0; i < 12; i++) {
      const [x, y] = at(0.1, 0.06 + i * 0.078);
      g.fillStyle = grey(0.88);
      g.beginPath();
      g.ellipse(x, y, 4.5, 2.6, 0, 0, PI * 2);
      g.fill();
      dot(g, x, y + 0.6, 1.4, grey(0.05));
    }
    stripes(g, quad(0.2, 0.08, 0.42, 1), { per: 3.2, cov: 0.35, lum: 0.72, seed: 2502, brk: 0.2 });
    for (let i = 0; i < 16; i++) for (const uu of [0.26, 0.36]) {
      const [x, y] = at(uu, 0.1 + i * 0.056);
      dot(g, x, y, 2.8, grey(0.05));
      ring(g, x, y, 3, 0.9, grey(0.7));
    }
    stripes(g, quad(0.35, 0, 0.98, 0.2), { dir: "h", per: 3, cov: 0.4, lum: 0.75, seed: 2503, brk: 0.2 });
    for (const [uu, vv] of [[0.48, 0.07], [0.72, 0.05], [0.52, 0.15], [0.78, 0.13]]) {
      const [x, y] = at(uu, vv);
      dot(g, x, y, 7, grey(0.07));
      ring(g, x, y, 7, 1.6, grey(0.85));
      dot(g, x - 2, y - 2, 1.6, grey(0.9));
    }
    const k0 = 0.2, k1 = 0.99, nk = 20;
    fillPoly(g, quad(0.46, k0, 0.9, k1), grey(0.95));
    for (let i = 0; i <= nk; i++) {
      const v = k0 + (k1 - k0) * (i / nk);
      ink(g, [at(0.46, v), at(0.9, v)], 1.1, grey(0.12), { seed: 2510 + i, jit: 0.1 });
    }
    for (let i = 0; i < nk; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) {
      const v = k0 + (k1 - k0) * ((i + 0.7) / nk), h = (k1 - k0) * 0.6 / nk;
      fillPoly(g, quad(0.46, v, 0.68, v + h), "#060606");
    }
    ink(g, [at(0.9, 0.2), at(0.9, 1)], 2.4, grey(0.55), { seed: 2540 });
    ink(g, [TR, BR], 2, grey(0.75), { seed: 2541 });
    ink(g, [TL, TR], 2, grey(0.8), { seed: 2542 });
    fillPoly(g, [[1592, 762], [1662, 760], [1664, 800], [1594, 802]], grey(0.22));
    ink(g, [[1592, 762], [1662, 760], [1664, 800], [1594, 802]], 1.2, grey(0.7), { closed: true, seed: 2543 });
    dot(g, 1620, 776, 8, grey(0.1));
    ring(g, 1620, 776, 8, 1.4, grey(0.8));
    fillPoly(g, [[1618, 800], [1682, 798], [1684, 842], [1620, 844]], grey(0.8));
    ink(g, [[1618, 800], [1682, 798], [1684, 842], [1620, 844]], 1.3, BLK, { closed: true, seed: 2544 });
    fillPoly(g, [[1632, 810], [1664, 809], [1664, 826], [1632, 827]], grey(0.2));
    stripes(g, [[1682, 792], [1722, 792], [1722, 842], [1682, 842]], { per: 4.5, cov: 0.8, lum: 0.9, seed: 2545 });
    stripes(g, [[1752, 830], [1778, 829], [1779, 860], [1753, 861]], { dir: "h", per: 3, cov: 0.9, lum: 0.95, seed: 2546 });
    dot(g, 1761, 846, 2.6, grey(0.05));
    stripes(g, [[1530, 862], [1600, 860], [1602, 878], [1532, 880]], { dir: "h", per: 3, cov: 0.9, lum: 0.9, seed: 2547 });
  }
  function metalBar(g, a, b, w, seed) {
    ink(g, [a, b], w, grey(0.9), { seed, jit: 0.2, ends: 0.95 });
    const n = [-(b[1] - a[1]), b[0] - a[0]], l = Math.hypot(n[0], n[1]);
    const off = (k) => [[a[0] + n[0] / l * k, a[1] + n[1] / l * k], [b[0] + n[0] / l * k, b[1] + n[1] / l * k]];
    ink(g, off(-w * 0.28), w * 0.22, grey(1), { seed: seed + 1, jit: 0.2, ends: 0.95 });
    ink(g, off(w * 0.12), w * 0.12, grey(0.3), { seed: seed + 2, jit: 0.2, ends: 0.95 });
    ink(g, off(w * 0.42), w * 0.1, grey(0.2), { seed: seed + 3, jit: 0.2, ends: 0.95 });
  }
  function rightLow(g) {
    const body = [[1797, 510], [1968, 516], [1992, 540], [1998, 600], [1990, 650], [1797, 654]];
    fillBlob(g, body, "#050505");
    curve(g, [[1968, 516], [1990, 536], [1998, 600], [1990, 650]], 2, grey(0.55), { seed: 2600 });
    metalBar(g, [1800, 528], [1962, 535], 9, 2601);
    metalBar(g, [1800, 587], [1962, 590], 12, 2602);
    metalBar(g, [1807, 528], [1807, 652], 12, 2603);
    metalBar(g, [1958, 535], [1958, 648], 9, 2604);
    fillPoly(g, [[1850, 512], [1918, 513], [1918, 522], [1850, 521]], grey(0.7));
    ink(g, [[1850, 512], [1918, 513]], 1.2, grey(0.95), { seed: 2605 });
    for (const [x, y] of [[1806, 530], [1960, 536]]) {
      fillPoly(g, [[x - 11, y - 10], [x + 11, y - 10], [x + 11, y + 12], [x - 11, y + 12]], grey(0.78));
      ink(g, [[x - 11, y - 10], [x + 11, y - 10], [x + 11, y + 12], [x - 11, y + 12]], 1.2, BLK, { closed: true, seed: x });
      dot(g, x, y + 1, 2.8, "#111");
    }
    fillPoly(g, [[1900, 570], [1933, 570], [1933, 612], [1900, 612]], grey(0.82));
    ink(g, [[1900, 570], [1933, 570], [1933, 612], [1900, 612]], 1.6, BLK, { closed: true, seed: 2610 });
    fillPoly(g, [[1907, 579], [1926, 579], [1926, 603], [1907, 603]], grey(0.3));
    const lid = [[1990, 550], [2082, 545], [2078, 650], [1996, 652]];
    stripes(g, lid, { dir: "v", per: 3.5, cov: (u, v) => lerp(0.95, 0.72, v), lum: 0.97, seed: 2620, brk: 0.4 });
    ink(g, lid, 1.4, BLK, { closed: true, seed: 2621 });
    stripes(g, [[1776, 652], [1858, 650], [1860, 830], [1778, 832]], { per: 5, cov: fadeEdges(bl(0.8, 0.62, 0.42, 0.58), 0.01, 0.02), lum: 0.92, seed: 2630 });
    ink(g, [[1776, 652], [1858, 650]], 1.6, grey(0.9), { seed: 2631 });
    for (let i = 0; i < 8; i++) {
      const y = 758 + i * 11.5, x0 = 1900 + i % 3 * 5, x1 = 2090 - i * 7 % 4 * 4;
      book(g, [[x0, y], [x1, y - 1], [x1 + 2, y + 10], [x0 + 1, y + 11]], { seed: 2640 + i * 2, lum: 0.9 - i * 0.02 });
    }
    const bp = [[2016, 700], [2024, 655], [2046, 626], [2080, 612], [2108, 610], [2140, 620], [2160, 646], [2172, 690], [2178, 760], [2176, 830], [2150, 858], [2090, 866], [2050, 858], [2030, 830], [2020, 770]];
    fillBlob(g, bp, grey(0.06));
    g.save();
    g.beginPath();
    smoothPath(g, bp, true);
    g.clip();
    const rb = rng(2650);
    for (let i = 0; i < 140; i++) {
      const x = 2022 + rb() * 158, y = 612 + rb() * 250, len = 10 + rb() * 20, a = -0.15 + rb() * 0.3;
      const lit = clamp2(1 - Math.abs(x - 2105) / 85) * 0.55 + 0.15;
      ink(g, [[x, y], [x + Math.cos(a) * len, y + Math.sin(a) * len]], 1.2 + rb() * 1.4, grey(0.12 + lit * 0.45, 0.6), { seed: 2651 + i, ends: 0.3 });
    }
    g.restore();
    const strap = (pts, w, seed) => {
      curve(g, pts, w, grey(0.1), { seed, ends: 0.9 });
      curve(g, pts.map(([x, y]) => [x - w * 0.18, y]), w * 0.5, grey(0.36), { seed: seed + 1, ends: 0.8 });
      curve(g, pts.map(([x, y]) => [x - w * 0.28, y]), w * 0.14, grey(0.8, 0.85), { seed: seed + 2, ends: 0.6 });
      const q = sampleCurve(pts, 8);
      for (let i = 4; i < q.length - 2; i += 6) {
        const [x, y] = q[i];
        ink(g, [[x - w * 0.45, y], [x + w * 0.45, y + 2]], 1.2, grey(0.05, 0.9), { seed: seed + i });
      }
    };
    strap([[2036, 700], [2040, 652], [2062, 630], [2090, 640], [2100, 700], [2104, 780], [2102, 850]], 22, 2660);
    strap([[2106, 640], [2120, 620], [2146, 628], [2160, 680], [2166, 760], [2160, 845]], 22, 2670);
    curve(g, bp, 1.4, grey(0.4, 0.8), { closed: true, seed: 2680, ends: 0.8 });
    fillPoly(g, [[2130, 455], [2175, 455], [2175, 490], [2130, 490]], grey(0.3));
  }
  function floor(g) {
    const r = rng(2700);
    g.save();
    g.beginPath();
    g.rect(0, 856, PW, PH - 856);
    g.clip();
    for (let i = -40; i <= 40; i++) {
      const xt = 1080 + i * 24, xb = 1080 + i * 80;
      const a = clamp2(0.42 - Math.abs(i) * 9e-3) * (0.5 + r() * 0.7);
      ink(g, [[xt, 856], [xb, 946]], 1 + r() * 1.8, grey(0.6, a), { seed: 2701 + i, jit: 1 });
    }
    g.restore();
  }
  function roomLight(g) {
    const c = document.createElement("canvas");
    c.width = Math.round(PW / 4);
    c.height = Math.round(PH / 4);
    const t = c.getContext("2d", { willReadFrequently: true });
    t.scale(0.25, 0.25);
    t.fillStyle = "#fff";
    t.fillRect(0, 0, PW, PH);
    t.save();
    t.translate(1e3, 470);
    t.scale(1, 0.55);
    const r = t.createRadialGradient(0, 0, 0, 0, 0, 1150);
    r.addColorStop(0, grey(1));
    r.addColorStop(0.36, grey(1));
    r.addColorStop(0.66, grey(0.82));
    r.addColorStop(0.88, grey(0.72));
    r.addColorStop(1, grey(0.7));
    t.fillStyle = r;
    t.fillRect(-1300, -1800, 2600, 3600);
    t.restore();
    const b = t.createLinearGradient(0, 780, 0, 946);
    b.addColorStop(0, "rgba(0,0,0,0)");
    b.addColorStop(1, "rgba(0,0,0,0.3)");
    t.fillStyle = b;
    t.fillRect(0, 780, PW, 166);
    g.save();
    g.globalCompositeOperation = "multiply";
    g.imageSmoothingQuality = "low";
    g.drawImage(c, 0, 0, PW, PH);
    g.restore();
  }
  function steps(g, { gaze = "owl", eye = {} } = {}) {
    return [
      () => wallLight(g),
      () => floor(g),
      () => rightBack(g),
      () => leftBack(g),
      () => leftMid(g),
      () => keyboardLeft(g),
      () => guitarCase(g),
      () => leftLow(g),
      () => plantLeft(g),
      () => speakerL(g),
      () => crateAndBooks(g),
      () => pedalboard(g),
      () => doNotKnock(g),
      () => uprightSynth(g),
      () => rightLow(g),
      () => rightCentre(g),
      () => deskUnder(g),
      () => roomLight(g),
      () => pants(g),
      () => shoe(g, 982, 1, 1, 1560),
      () => shoe(g, 1186, -1, 0.8, 1580),
      () => torso(g),
      () => head(g, gaze, eye),
      () => laptop(g),
      () => deskTop(g),
      () => mug(g),
      () => lampAndGear(g),
      () => cables(g)
    ];
  }
  function paintS17Ill(g, opts = {}) {
    g.fillStyle = "#000";
    g.fillRect(0, 0, PW, PH);
    for (const f of steps(g, opts)) f();
  }
  var illCache = /* @__PURE__ */ new Map();
  var SOFTEN = 0.55;
  function soften(c, scale) {
    const out = document.createElement("canvas");
    out.width = c.width;
    out.height = c.height;
    const og = out.getContext("2d", { willReadFrequently: true });
    og.filter = `blur(${(SOFTEN * scale).toFixed(2)}px)`;
    og.drawImage(c, 0, 0);
    og.filter = "none";
    return out;
  }
  function s17IllCanvas({ scale = 1 } = {}) {
    const key = `ill:${scale}`;
    if (illCache.has(key)) return illCache.get(key);
    const c = document.createElement("canvas");
    c.width = Math.round(PW * scale);
    c.height = Math.round(PH * scale);
    const g = c.getContext("2d", { willReadFrequently: true });
    g.scale(scale, scale);
    paintS17Ill(g, { gaze: "owl" });
    const out = soften(c, scale);
    out.__scale = scale;
    illCache.set(key, out);
    return out;
  }
  var EYE_BOX = [1010, 256, 1134, 306];
  var EYE_PAD = 16;
  function s17EyePatch(dx, lid = 0) {
    const key = `eye:${dx}:${lid}`;
    if (illCache.has(key)) return illCache.get(key);
    const [x0, y0, x1, y1] = EYE_BOX, pad = EYE_PAD;
    const c = document.createElement("canvas");
    c.width = x1 - x0 + 2 * pad;
    c.height = y1 - y0 + 2 * pad;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(s17IllCanvas({ scale: 1 }), x0 - pad, y0 - pad, c.width, c.height, 0, 0, c.width, c.height);
    g.save();
    g.translate(pad - x0, pad - y0);
    g.beginPath();
    g.rect(x0 - 4, y0 - 4, x1 - x0 + 8, y1 - y0 + 8);
    g.clip();
    head(g, "owl", { dx, lid });
    g.restore();
    const out = { canvas: soften(c, 1), x: x0 - pad, y: y0 - pad };
    illCache.set(key, out);
    return out;
  }
  function releaseS17Ill() {
    illCache.clear();
    VAL = null;
    VALD = null;
  }

  // src/lib/owlInk.js
  var LINE = "#0f0e0d";
  var gv = (v, a = 1) => {
    const c = Math.round(clamp(v) * 255);
    return a >= 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`;
  };
  var V = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
    mul: (a, k) => [a[0] * k, a[1] * k],
    len: (a) => Math.hypot(a[0], a[1]),
    nrm: (a) => {
      const l = Math.hypot(a[0], a[1]) || 1;
      return [a[0] / l, a[1] / l];
    },
    perp: (a) => [-a[1], a[0]],
    rot: (a, t) => {
      const c = Math.cos(t), s = Math.sin(t);
      return [a[0] * c - a[1] * s, a[0] * s + a[1] * c];
    },
    mix: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
  };
  var { add, sub, mul, nrm, perp } = V;
  var TAU = Math.PI * 2;
  var PPU = 1;
  function setPPU(v) {
    PPU = v;
  }
  var MINW = 0.7;
  var wmin = (w) => Math.max(w, MINW / PPU);
  function ink2(g, pts, w, color = LINE, { per = 6, end = 0.2, bias = 0.5, pow = 0.55 } = {}) {
    if (pts.length < 2) return;
    const q = sampleCurve(pts.length > 2 ? pts : [pts[0], pts[1]], pts.length > 2 ? per : 4);
    const W = wmin(w);
    taper(g, q, (u) => {
      const k = Math.pow(Math.sin(Math.PI * clamp(u < bias ? u / bias * 0.5 : 0.5 + (u - bias) / (1 - bias) * 0.5)), pow);
      return W * (end + (1 - end) * k);
    }, color);
  }
  function flick(g, p, dir, L, w, color, curve2 = 0.12) {
    const n = perp(dir);
    const q = [p, add(add(p, mul(dir, L * 0.5)), mul(n, L * curve2)), add(p, mul(dir, L))];
    const W = wmin(w);
    taper(g, sampleCurve(q, 4), (u) => W * Math.pow(1 - u, 0.7) * Math.min(1, 0.35 + u * 5), color);
  }
  function walk(poly, step, seed, fn, { from = 0, to = 1, jitter = 0.6 } = {}) {
    const L = [0];
    for (let i2 = 1; i2 < poly.length; i2++) L.push(L[i2 - 1] + Math.hypot(poly[i2][0] - poly[i2 - 1][0], poly[i2][1] - poly[i2 - 1][1]));
    const total = L[L.length - 1];
    if (total <= 0) return;
    const r = rng(seed);
    let d = from * total + step * r(), i = 1;
    while (d < to * total) {
      while (i < L.length - 1 && L[i] < d) i++;
      const a = poly[i - 1], b = poly[i], f = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
      fn([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], nrm(sub(b, a)), d / total, r);
      d += step * (1 - jitter / 2 + jitter * r());
    }
  }
  function area(pts) {
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return s / 2;
  }
  var inward = (t, cw) => cw ? [-t[1], t[0]] : [t[1], -t[0]];
  function rimHatch(g, outline, o = {}) {
    const { light = [-0.55, -0.83], thr = 0.05, step = 4, len = 20, w = 1, color = gv(0.33, 0.55), flow = [0, 1], bend = 0.35, seed = 9, closed = true, from = 0, to = 1, density = 1 } = o;
    const poly = sampleCurve(outline, 6, closed);
    const cw = area(poly) > 0;
    const fl = nrm(flow);
    walk(poly, step, seed, (p, t, u, r) => {
      const n = inward(t, cw);
      const facing = n[0] * light[0] + n[1] * light[1];
      const k = (facing - thr) / (1 - thr);
      if (k <= 0 || r() > density * (0.25 + 0.75 * k)) return;
      const d = nrm(add(mul(n, 1 - bend), mul(fl, bend)));
      flick(g, add(p, mul(n, 0.5 + r() * 2)), V.rot(d, (r() - 0.5) * 0.35), len * (0.35 + 0.9 * k) * (0.6 + 0.7 * r()), w * (0.7 + 0.6 * r()), color, (r() - 0.5) * 0.25);
    }, { from, to });
  }
  function plumage(g, path, o = {}) {
    const { base = 0.97, shade = 0.8, light = [-0.55, -0.83], depth = 30, blur = 12, keep = null } = o;
    g.save();
    g.beginPath();
    path(g);
    g.clip();
    g.fillStyle = gv(shade);
    g.fill();
    g.filter = `blur(${Math.max(0.4, blur * PPU).toFixed(2)}px)`;
    g.fillStyle = gv(base);
    for (const off of keep ? [[light[0] * depth, light[1] * depth], [light[0] * depth * 0.4 + keep[0], light[1] * depth * 0.4 + keep[1]]] : [[light[0] * depth, light[1] * depth]]) {
      g.save();
      g.translate(off[0], off[1]);
      g.beginPath();
      path(g);
      g.fill();
      g.restore();
    }
    g.filter = "none";
    g.restore();
  }
  function softShade(g, clipPath, shape, value, alpha, blur) {
    g.save();
    g.beginPath();
    clipPath(g);
    g.clip();
    g.filter = `blur(${Math.max(0.4, blur * PPU).toFixed(2)}px)`;
    g.fillStyle = gv(value, alpha);
    g.beginPath();
    shape(g);
    g.fill();
    g.filter = "none";
    g.restore();
  }
  var GRAIN = null;
  function grainTile() {
    if (GRAIN) return GRAIN;
    const N = 128, r = rng(907), a = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) a[i] = r() - 0.5;
    const box = (src, rad) => {
      const o = new Float32Array(N * N);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        let t = 0, c = 0;
        for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
          t += src[(y + dy + N) % N * N + (x + dx + N) % N];
          c++;
        }
        o[y * N + x] = t / c;
      }
      return o;
    };
    const norm = (b) => {
      let v = 0;
      for (let i = 0; i < N * N; i++) v += b[i] * b[i];
      v = Math.sqrt(v / (N * N)) || 1;
      for (let i = 0; i < N * N; i++) b[i] /= v;
      return b;
    };
    const fine = norm(box(a, 1)), blob = norm(box(box(a, 2), 2)), out = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) out[i] = 0.62 * fine[i] + 0.78 * Math.max(-0.6, blob[i]);
    return GRAIN = norm(out);
  }
  function screentone(canvas, { pitch = 4.2, amp = 0.2, white = 0.93, range = 0.3, x = 0, y = 0, w = canvas.width, h = canvas.height, grain = 0, cross = 1 } = {}) {
    const g = canvas.getContext("2d");
    w = Math.min(w, canvas.width - x);
    h = Math.min(h, canvas.height - y);
    if (w <= 0 || h <= 0) return;
    const img = g.getImageData(x, y, w, h), d = img.data;
    const k = 1 / (pitch * Math.SQRT2), G2 = grain ? grainTile() : null;
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const o = (j * w + i) * 4;
        if (d[o + 3] < 8) continue;
        const L = d[o] / 255;
        const X = i + x, Y = j + y;
        const gr = grain && L > 0.8 ? grain * G2[(Y & 127) * 128 + (X & 127)] * Math.min(1, (L - 0.8) / 0.12) : 0;
        if (L > white || L < 0.22) {
          if (gr) d[o] = d[o + 1] = d[o + 2] = Math.max(0, Math.min(255, (L + gr) * 255));
          continue;
        }
        const t = Math.min(1, (white - L) / range) * Math.min(1, (L - 0.22) / 0.2);
        const fa = Math.abs((X + Y) * k % 1 - 0.5) * 2, fb = Math.abs((X - Y + 8192) * k % 1 - 0.5) * 2;
        const m = Math.max(cross * (1 - Math.min(1, fa * 2.6)), 1 - Math.min(1, fb * 2.6));
        const v = Math.max(0, Math.min(255, (L + gr - amp * t * (m - 0.3)) * 255));
        d[o] = d[o + 1] = d[o + 2] = v;
      }
    }
    g.putImageData(img, x, y);
  }
  function headGeom(h) {
    const { x = 0, y = 0, rx = 109, ry = 100, yaw = 0, pitch = 0, roll = 0, square = 2.6, jowl = 0.05 } = h;
    const cr = Math.cos(roll), sr = Math.sin(roll);
    const toFrame = (px, py) => [x + px * cr - py * sr, y + px * sr + py * cr];
    const P = (az, el, lift = 1) => {
      const nx = Math.sin(az) * Math.cos(el), ny = -Math.sin(el), nz = Math.cos(az) * Math.cos(el);
      const x1 = nx * Math.cos(yaw) + nz * Math.sin(yaw), z1 = -nx * Math.sin(yaw) + nz * Math.cos(yaw);
      const y2 = ny * Math.cos(pitch) - z1 * Math.sin(pitch), z2 = ny * Math.sin(pitch) + z1 * Math.cos(pitch);
      const p = toFrame(x1 * rx * lift, y2 * ry * lift);
      return { x: p[0], y: p[1], nx: x1, ny: y2, nz: z2 };
    };
    const shape = (t) => {
      const c = Math.cos(t), s = Math.sin(t), n = s < 0 ? square : 2.15;
      let px = Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * rx;
      const py = Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * ry;
      if (s > 0) px *= 1 + jowl * Math.sin(Math.PI * s);
      return [px, py];
    };
    const out = [];
    const N = 56;
    for (let i = 0; i < N; i++) {
      const q = shape(i / N * TAU - Math.PI / 2);
      out.push(toFrame(q[0], q[1]));
    }
    const at = (phi) => {
      const t = phi - Math.PI / 2, a = shape(t), b = shape(t + 0.01);
      const tan = V.rot(nrm(sub(b, a)), roll);
      return { p: toFrame(a[0], a[1]), n: [tan[1], -tan[0]] };
    };
    return { x, y, rx, ry, yaw, pitch, roll, P, out, at, toFrame };
  }
  function bodyOutline(b) {
    const { x = 0, y = 0, a = 150, b: hb = 100, rot = 0, egg = 0, sag = 0 } = b;
    const pts = [];
    const N = 44;
    for (let i = 0; i < N; i++) {
      const t = i / N * TAU;
      let v = Math.sin(t) * hb * (1 - egg * Math.cos(t));
      if (v > 0) v *= 1 + sag * Math.sin(Math.PI * (0.5 + 0.5 * Math.cos(t)));
      pts.push(add([x, y], V.rot([Math.cos(t) * a, v], rot)));
    }
    return pts;
  }
  var EYE_STATES = {
    stare: { pupil: 0.8, lid: 0.2, curve: 0.35, slant: 0.35, lidW: 0.2, low: 0, ext: 0.22 },
    glare: { pupil: 0.82, lid: 0.34, curve: 0.2, slant: 0.34, lidW: 0.17, low: 0, ext: 0.1 },
    half: { pupil: 0.76, lid: 0.46, curve: 0.06, slant: 0, lidW: 0.15, low: 0, ext: 0 },
    angry: { pupil: 0.62, lid: 0.42, curve: 0, slant: 0.5, lidW: 0.18, low: 0.06, brow: 1, ext: 0 },
    smug: { pupil: 0.58, lid: 0.52, curve: -0.04, slant: 0.1, lidW: 0.16, low: 0.2, brow: 0.6, ext: 0 },
    sleepy: { pupil: 0.66, lid: 0.56, curve: 0.12, slant: -0.1, lidW: 0.13, low: 0.04, ext: 0 },
    wide: { pupil: 0.62, lid: 0, curve: 0.2, slant: 0.1, lidW: 0.1, low: 0, ext: 0 },
    startled: { pupil: 0.12, lid: 0, curve: 0.2, slant: 0, lidW: 0.07, low: 0, scale: 1.12, ext: 0 },
    closed: { closed: true }
  };
  function drawEye(g, e) {
    const st = { ...EYE_STATES[e.state || "stare"] };
    for (const k of ["lid", "pupil", "slant", "curve", "brow", "low", "lidW", "ext", "peak"]) if (e[k] !== void 0) st[k] = e[k];
    const r = e.r * (st.scale || 1), side = e.side || 1, sx = e.sx ?? 1, outer = side > 0 ? 1 : -1;
    const PPU0 = PPU;
    PPU = PPU0 * r;
    const u = (w) => wmin(w / r);
    g.save();
    g.translate(e.x, e.y);
    g.rotate(e.rot || 0);
    g.scale(sx * r, r);
    g.lineCap = "round";
    g.lineJoin = "round";
    if (st.closed) {
      ink2(g, [[-1.05, 0.02], [-0.45, 0.26], [0.15, 0.3], [0.65, 0.16], [1.05, -0.08]].map(([a, b]) => [a * outer, b]), u(4.4), LINE, { end: 0.1, bias: 0.45 });
      ink2(g, [[1, -0.04], [1.18, -0.2]].map(([a, b]) => [a * outer, b]), u(1.6), LINE, { end: 0.1 });
      g.globalAlpha = 0.3;
      ink2(g, [[-0.95, -0.25], [-0.5, -0.75], [0.2, -0.9], [0.85, -0.55]], u(1.4), gv(0.35));
      g.globalAlpha = 1;
      g.restore();
      PPU = PPU0;
      return;
    }
    const ey = (x) => -1 + 2 * st.lid - st.curve * (1 - x * x) + st.slant * x * -side;
    const ext = st.ext ?? 0.22;
    const ringTop = (xx) => -Math.sqrt(Math.max(0, 1 - xx * xx));
    const topY = (xx) => Math.min(Math.sqrt(Math.max(0, 1 - xx * xx)), Math.max(ey(xx), ringTop(xx) - ext * (1 - xx * xx)));
    const xOut = outer * (st.outX ?? 0.94), xIn = -outer * 0.99;
    const N = 28;
    const lidPts = [];
    for (let i = 0; i <= N; i++) {
      const xx = xIn + (xOut - xIn) * i / N;
      lidPts.push([xx, topY(xx)]);
    }
    const opening = (c) => {
      c.moveTo(lidPts[0][0], lidPts[0][1]);
      for (const p of lidPts) c.lineTo(p[0], p[1]);
      const aO = Math.atan2(Math.max(lidPts[N][1], -0.99), lidPts[N][0]), aI = Math.atan2(Math.max(0, lidPts[0][1]), lidPts[0][0]);
      const steps2 = 30;
      for (let i = 0; i <= steps2; i++) {
        let a;
        if (outer > 0) {
          const A0 = aO, A1 = aI + (aI < A0 ? TAU : 0);
          a = A0 + (A1 - A0) * i / steps2;
        } else {
          const A0 = aO, A1 = aI - (aI > A0 ? TAU : 0);
          a = A0 + (A1 - A0) * i / steps2;
        }
        c.lineTo(Math.cos(a), Math.sin(a));
      }
      c.closePath();
    };
    g.fillStyle = gv(0.97);
    g.beginPath();
    opening(g);
    g.fill();
    const pr = st.pupil, look = e.look || [0, 0];
    const lg2 = e.lookGain ?? 1, px = look[0] * (1 - pr) * 0.95 * lg2, py = look[1] * (1 - pr) * 0.95 * lg2;
    g.save();
    g.beginPath();
    opening(g);
    g.clip();
    g.fillStyle = "#060606";
    g.beginPath();
    g.arc(px, py, pr, 0, TAU);
    g.fill();
    const hood = e.hood ?? st.hood ?? 0;
    if (hood > 0) {
      g.beginPath();
      g.ellipse(px - side * 0.1 * hood, py - 0.3 * hood, pr * (0.95 + 0.05 * hood), pr * (0.92 + 0.12 * hood), 0, 0, TAU);
      g.fill();
      g.beginPath();
      g.moveTo(px - side * pr, py);
      g.lineTo(-side * 1.05, -1.2);
      g.lineTo(side * 0.2 * (1 - hood), -1.25);
      g.lineTo(px + side * pr * 0.2, py - pr * 0.6);
      g.closePath();
      g.fill();
    }
    if (st.scale) {
      g.strokeStyle = LINE;
      g.lineWidth = u(1.1);
      g.beginPath();
      g.arc(px, py, pr * 1.9, 0, TAU);
      g.stroke();
      g.fillStyle = gv(0.97);
      g.beginPath();
      g.arc(px - pr * 0.3, py - pr * 0.3, pr * 0.3, 0, TAU);
      g.fill();
    }
    if (st.low > 0) {
      g.fillStyle = gv(e.plumage ?? 0.95);
      g.fillRect(-1.3, 1 - 2 * st.low, 2.6, 2 * st.low + 0.4);
    }
    g.restore();
    const arcPts = (a0, a1, rr, n = 20) => {
      const q = [];
      for (let i = 0; i <= n; i++) {
        const a = a0 + (a1 - a0) * i / n;
        q.push([Math.cos(a) * rr, Math.sin(a) * rr]);
      }
      return q;
    };
    const rw = u(e.ringW ?? 2.3);
    const aOut = Math.atan2(lidPts[N][1], lidPts[N][0]);
    const rimPts = outer > 0 ? arcPts(aOut, Math.PI + 0.05, 1, 34) : arcPts(aOut < 0 ? aOut + TAU : aOut, -0.05, 1, 34);
    taper(g, rimPts, (t) => rw * (0.45 + 0.95 * Math.pow(Math.sin(Math.PI * t), 1.3)), LINE);
    if (!st.scale) taper(g, arcPts(0.55, 1.65, 0.9, 14).map(([a, b]) => [-a * outer, b]), (t) => rw * 0.45 * Math.sin(Math.PI * t), LINE);
    const p0 = lidPts[0], p1 = lidPts[N], q1 = lidPts[N - 3];
    const td = nrm(sub(p1, q1));
    const seq = [[p0[0] - outer * 0.17, p0[1] + 0.1], ...lidPts, add(p1, add(mul(td, 0.1), [0, -0.06])), add(p1, add(mul(td, 0.2), [outer * 0.06, -0.2]))];
    const pk = st.peak ?? 0.45;
    taper(g, seq, (t) => {
      const k = t < pk ? Math.pow(t / pk, 0.8) : t > 0.86 ? Math.pow(Math.max(0, (1 - t) / 0.14), 0.8) : 1 - 0.3 * (t - pk) / (0.86 - pk);
      return st.lidW * (0.05 + 0.95 * k) + u(0.35);
    }, "#070707");
    if (st.low > 0) ink2(g, [[-0.9, 1 - 2 * st.low + 0.12], [0, 1 - 2 * st.low - 0.02], [0.9, 1 - 2 * st.low + 0.12]], u(1.8), LINE, { end: 0.1 });
    g.restore();
    PPU = PPU0;
    if (st.brow) {
      g.save();
      g.translate(e.x, e.y);
      g.rotate(e.rot || 0);
      const b = st.brow, inner = -side;
      const y0 = -r * (1.25 - 0.2 * b), yIn = y0 + r * 0.5 * b * (st.slant > 0.2 ? 1 : 0.3);
      ink2(g, [[-inner * r * 1.05 * sx, y0 - r * 0.08], [0, y0 + (yIn - y0) * 0.4], [inner * r * 0.95 * sx, yIn]], r * 0.14 * b + 1.2, LINE, { end: 0.25, bias: 0.6 });
      g.restore();
    }
  }
  function headphoneGeom(H, HP) {
    const yaw = HP.yaw ?? H.yaw, dx = HP.dx ?? 0, dy = HP.dy ?? 0, tilt = HP.tilt ?? 0.15;
    const lift = HP.lift ?? 1.3, bR = HP.bandR ?? 1.3, bH = HP.bandH ?? 1.6, pw = HP.bandPow ?? 0.6;
    const proj = (X, Y, Z2) => {
      const x1 = X * Math.cos(yaw) + Z2 * Math.sin(yaw), z1 = -X * Math.sin(yaw) + Z2 * Math.cos(yaw);
      const y2 = Y * Math.cos(H.pitch) - z1 * Math.sin(H.pitch), z2 = Y * Math.sin(H.pitch) + z1 * Math.cos(H.pitch);
      return { p: H.toFrame((x1 + dx) * H.rx, (y2 + dy) * H.ry), z: z2 };
    };
    const band = [];
    const N = 40, cupTop = (HP.r ?? 50) / H.ry * 0.85;
    for (let i = 0; i <= N; i++) {
      const ph = -Math.PI / 2 + i / N * Math.PI;
      const X = Math.sin(ph) * bR, Yv = -(cupTop + Math.pow(Math.cos(ph), pw) * (bH - cupTop));
      band.push(proj(X, Yv * Math.cos(tilt), Yv * Math.sin(tilt)));
    }
    const segs = [];
    let cur = null;
    for (let i = 0; i <= N; i++) {
      const front = band[i].z >= 0;
      if (!cur || cur.front !== front) {
        if (cur) cur.pts.push(band[i].p);
        cur = { front, pts: i > 0 ? [band[i - 1].p] : [] };
        segs.push(cur);
      }
      cur.pts.push(band[i].p);
    }
    segs.forEach((sg, k) => {
      sg.ends = [k === 0, k === segs.length - 1];
      if (sg.pts.length < 2) sg.pts.push(sg.pts[0]);
    });
    const cups = [-1, 1].map((sd) => {
      const c = proj(sd * lift, -Math.sin(HP.cupEl ?? 0), 0), o = proj(0, -Math.sin(HP.cupEl ?? 0), 0);
      return { sd, x: c.p[0], y: c.p[1], z: c.z, side: c.p[0] >= o.p[0] ? 1 : -1, open: HP.open ?? clamp(0.5 + 0.8 * Math.abs(Math.sin(yaw)), 0.4, 0.85) };
    });
    return { band, segs, cups };
  }
  var SIT3Q_V1 = {
    light: [-0.85, -0.5],
    head: { x: -126, y: -122, rx: 109, ry: 100, yaw: -0.25, pitch: 0, roll: -0.136, square: 2.6, jowl: 0.05 },
    tufts: [{ at: -0.44, size: 30, width: 0.26, lean: 0.35, second: 0.45, curl: 0.12 }, { at: 0.98, size: 52, width: 0.34, lean: -0.42, second: 0.5, curl: 0.3 }],
    body: { x: -6, y: -8, a: 170, b: 99, rot: 0.384, egg: 0, sag: 0 },
    tail: { base: [134, 40], tip: [247, 76], w: 26, n: 2, spread: 0 },
    wings: [{ type: "folded", layer: "front", S: [-31, -75], T: [171, 52], width: 58, back: 55, dir: 1 }],
    feet: [{ x: -60, y: 86, rot: 0.65, size: 26, mode: "perch", toes: 4, spread: 0.35, seed: 4 }, { x: 30, y: 98, rot: 0.4, size: 28, mode: "perch", toes: 4, spread: 0.35, seed: 9 }],
    eyes: { state: "stare", r: 27.3, spread: 0.4365, el: -0.19, look: [-0.55, -0.6], left: { slant: 0.2, pupil: 0.84, look: [0.45, -0.5] } },
    beak: { el: -0.41, lift: 1.32, w: 32, l: 40 },
    bandage: { az: -0.55, el: 0.82, size: 80, rot: -0.5 },
    headphones: { on: true, yaw: -0.8, dx: 0.38, dy: 0.02, lift: 1.3, r: 50, bandR: 1.3, bandH: 2, tilt: 0.15, open: 0.72, cupEl: -0.02, w: 19 },
    flow: [-0.35, 1],
    disc: 1
  };
  var SIT3Q = {
    light: [-0.85, -0.5],
    head: { x: -115.76, y: -122.32, rx: 119.29, ry: 97, yaw: -0.348, pitch: 0, roll: -0.279, square: 2.433, jowl: 0.101 },
    tufts: [{ at: -0.459, size: 30.8, width: 0.178, lean: 0.439, second: 0.594, curl: 0.095 }, { at: 0.95, size: 46, width: 0.28, lean: -0.62, second: 0.45, curl: 0.3 }],
    body: { x: 5.54, y: -4.92, a: 165.5, b: 94.3, rot: 0.31, egg: 0.118, sag: 0.118 },
    tail: { base: [164.4, 47.7], tip: [254.2, 78.4], w: 25.5, n: 3, spread: 0 },
    wings: [{ type: "folded", layer: "front", S: [-2.5, -81.7], T: [176, 53.2], width: 67.7, back: 45.5, dir: 1 }],
    feet: [{ x: -60, y: 86, rot: 0.65, size: 26, mode: "perch", toes: 4, spread: 0.35, seed: 4 }, { x: 30, y: 98, rot: 0.4, size: 28, mode: "perch", toes: 4, spread: 0.35, seed: 9 }],
    eyes: { state: "stare", r: 25, spread: 0.3977, el: -0.1089, look: [-0.45, -0.3], right: { off: [0.1, 6.5], sx: 1.08, pupil: 0.83, hood: 0.8, lidW: 0.26 }, left: { off: [-0.1, -6.5], r: 21.5, sx: 0.99, slant: 0.2, pupil: 0.86, look: [0.5, -0.3], hood: 0.9, lidW: 0.24 } },
    beak: { el: -0.322, lift: 1.332, w: 31, l: 39.6, rot: 0.153 },
    bandage: { az: -0.542, el: 1.01, size: 73.5, rot: -0.259 },
    headphones: { on: true, yaw: -0.933, dx: 0.292, dy: 0.108, lift: 1.287, r: 51, bandR: 1.308, bandH: 2.235, tilt: 0.207, open: 0.85, cupEl: -0.129, w: 21 },
    flow: [-0.35, 1],
    disc: 1
  };
  function mergePose(a, b) {
    if (!b) return a;
    const out = Array.isArray(a) ? [...a] : { ...a };
    for (const k of Object.keys(b)) {
      const v = b[k];
      out[k] = v && typeof v === "object" && !Array.isArray(v) && a && typeof a[k] === "object" && a[k] && !Array.isArray(a[k]) ? mergePose(a[k], v) : v;
    }
    return out;
  }
  var POSES = {
    sit3q: SIT3Q,
    // sitting, facing us (on his shoulder, 20–29 s)
    front: {
      light: [-0.5, -0.86],
      head: { x: 0, y: -118, rx: 108, ry: 96, yaw: 0, pitch: 0, roll: 0, square: 2.6, jowl: 0.05 },
      tufts: [{ at: -0.8, size: 28, width: 0.3, lean: -0.1, second: 0.5, curl: 0.12 }, { at: 0.8, size: 28, width: 0.3, lean: 0.1, second: 0.5, curl: 0.12 }],
      body: { x: 0, y: 10, a: 118, b: 104, rot: Math.PI / 2, egg: -0.1, sag: 0 },
      tail: null,
      wings: [
        { type: "folded", layer: "front", S: [-86, -34], T: [-70, 110], width: 30, back: 14, dir: -1 },
        { type: "folded", layer: "front", S: [86, -34], T: [70, 110], width: 30, back: 14, dir: 1 }
      ],
      feet: [{ x: -34, y: 116, rot: 0, size: 16, mode: "perch", seed: 2 }, { x: 34, y: 116, rot: 0, size: 16, mode: "perch", seed: 5 }],
      eyes: { state: "stare", r: 25, spread: 0.42, el: -0.12, look: [0, -0.3] },
      beak: { el: -0.5, lift: 1.25, w: 26, l: 34 },
      bandage: { az: -0.5, el: 0.78, size: 64, rot: -0.55 },
      headphones: { on: true, lift: 1.12, r: 46, tilt: 0.25, bandR: 1.12, bandH: 1.3, cupEl: 0.1, w: 15, open: 0.5 },
      flow: [0, 1],
      disc: 1
    }
  };
  POSES.frontStand = mergePose(POSES.front, { feet: [{ x: -38, y: 108, rot: 0.15, size: 15, mode: "stand", leg: 24, seed: 2 }, { x: 38, y: 108, rot: -0.15, size: 15, mode: "stand", leg: 24, seed: 5 }], body: { a: 110 } });
  POSES.hips = mergePose(POSES.frontStand, {
    eyes: { state: "angry", look: [0.2, 0.15] },
    wings: [
      { type: "arm", layer: "front", S: [-84, -40], Wr: [-132, 26], T: [-80, 62], len: 30 },
      { type: "arm", layer: "front", S: [84, -40], Wr: [132, 26], T: [80, 62], len: 30 }
    ],
    beak: { smirk: 1 }
  });
  POSES.smirk = mergePose(POSES.frontStand, { eyes: { state: "smug", look: [0.6, 0.1] }, head: { roll: 0.08, yaw: 0.12 }, beak: { smirk: 1 } });
  POSES.startled = mergePose(POSES.front, {
    eyes: { state: "startled", look: [0, 0] },
    beak: { open: 0.8 },
    wings: [
      { type: "spread", layer: "back", S: [-80, -40], Wr: [-160, -110], T: [-230, -160], trail: [0.3, 1], len: 60, spread: 0.7 },
      { type: "spread", layer: "back", S: [80, -40], Wr: [160, -110], T: [230, -160], trail: [-0.3, 1], len: 60, spread: 0.7 }
    ]
  });
  POSES.fly = mergePose(POSES.front, {
    eyes: { state: "stare", look: [0, 0.1] },
    body: { a: 104, b: 94, y: 0 },
    feet: [{ x: -26, y: 104, rot: 0.1, size: 13, mode: "dangle", seed: 2 }, { x: 26, y: 104, rot: -0.1, size: 13, mode: "dangle", seed: 5 }],
    wings: [
      { type: "spread", layer: "back", S: [-78, -46], Wr: [-190, -120], T: [-330, -110], trail: [0.2, 1], len: 78, spread: 1 },
      { type: "spread", layer: "back", S: [78, -46], Wr: [190, -120], T: [330, -110], trail: [-0.2, 1], len: 78, spread: 1 }
    ]
  });
  POSES.flyDown = mergePose(POSES.fly, {
    wings: [
      { type: "spread", layer: "back", S: [-78, -40], Wr: [-190, 10], T: [-300, 120], trail: [0.5, 0.8], len: 70, spread: 0.8 },
      { type: "spread", layer: "back", S: [78, -40], Wr: [190, 10], T: [300, 120], trail: [-0.5, 0.8], len: 70, spread: 0.8 }
    ]
  });
  POSES.angry = mergePose(POSES.fly, { eyes: { state: "angry", look: [-0.2, 0.2] }, head: { yaw: -0.2, roll: -0.12 }, beak: { open: 0.35 } });
  POSES.walk = mergePose(SIT3Q_V1, {
    light: [-0.6, -0.8],
    head: { x: 18, y: -128, rx: 100, ry: 92, yaw: 0.55, roll: 0.04 },
    tufts: [{ at: -0.62, size: 24, width: 0.28, lean: -0.1, second: 0.45, curl: 0.1 }, { at: 0.72, size: 26, width: 0.3, lean: 0.1, second: 0.45, curl: 0.12 }],
    body: { x: 0, y: 6, a: 112, b: 96, rot: 2.1, egg: 0.08, sag: 0 },
    tail: { base: [-58, 70], tip: [-150, 150], w: 22, n: 2 },
    wings: [{ type: "folded", layer: "front", S: [18, -62], T: [-96, 118], width: 34, back: 26, dir: -1 }],
    feet: [{ x: -14, y: 100, rot: -0.35, size: 14, mode: "stand", leg: 22, seed: 2 }, { x: 38, y: 94, rot: -0.1, size: 14, mode: "stand", leg: 16, seed: 5 }],
    eyes: { state: "stare", r: 24, spread: 0.42, el: -0.12, look: [0.7, 0], left: null },
    beak: { el: -0.45, lift: 1.28, w: 26, l: 34 },
    bandage: { az: -0.5, el: 0.78, size: 60, rot: -0.55 },
    headphones: { on: true, yaw: 0.55, dx: 0, dy: 0, lift: 1.12, r: 44, bandR: 1.12, bandH: 1.35, tilt: 0.2, open: null, cupEl: 0.1, w: 15 },
    flow: [0.3, 1]
  });
  POSES.carry = mergePose(POSES.frontStand, {
    wings: [
      { type: "spread", layer: "back", S: [-80, -40], Wr: [-150, -150], T: [-120, -250], trail: [-0.9, 0.3], len: 56, spread: 0.6 },
      { type: "spread", layer: "back", S: [80, -40], Wr: [150, -150], T: [120, -250], trail: [0.9, 0.3], len: 56, spread: 0.6 }
    ],
    eyes: { state: "stare", look: [0, -0.8] },
    head: { pitch: 0.12 }
  });
  POSES.wingUp = mergePose(POSES.front, {
    eyes: { state: "startled", look: [0, 0] },
    beak: { open: 0.7 },
    wings: [
      { type: "folded", layer: "front", S: [-86, -34], T: [-70, 110], width: 30, back: 14, dir: -1 },
      { type: "spread", layer: "back", S: [80, -40], Wr: [170, -120], T: [240, -200], trail: [-0.35, 1], len: 62, spread: 0.75 }
    ]
  });
  POSES.tumble = mergePose(POSES.startled, {
    rot: 2.3,
    wings: [
      { type: "spread", layer: "back", S: [-80, -30], Wr: [-170, -40], T: [-250, 10], trail: [0.3, 1], len: 60, spread: 0.6 },
      { type: "spread", layer: "back", S: [80, -40], Wr: [150, -140], T: [190, -240], trail: [-0.5, 0.9], len: 56, spread: 0.8 }
    ],
    feet: [{ x: -26, y: 104, rot: 0.6, size: 13, mode: "dangle", seed: 2 }, { x: 26, y: 104, rot: -0.4, size: 13, mode: "dangle", seed: 5 }]
  });
  POSES.hold = mergePose(POSES.frontStand, {
    wings: [
      { type: "arm", layer: "front", S: [-84, -40], Wr: [-110, 30], T: [-40, 40], len: 26 },
      { type: "arm", layer: "front", S: [84, -40], Wr: [110, 30], T: [40, 40], len: 26 }
    ],
    eyes: { state: "stare", look: [0, 0.5] },
    head: { pitch: -0.08 }
  });
  POSES.sleep = mergePose(SIT3Q, { eyes: { state: "closed" }, head: { x: SIT3Q.head.x - 8.7, y: SIT3Q.head.y + 21.4, roll: SIT3Q.head.roll - 0.0899 }, headphones: { dy: 0.108 + 0.2 } });
  POSES.glare = mergePose(SIT3Q, { eyes: { state: "glare" }, head: { x: SIT3Q.head.x - 5, y: SIT3Q.head.y + 10.6, roll: SIT3Q.head.roll - 0.0459 }, headphones: { dy: 0.108 + 0.1 } });

  // src/shots/s17/owl.js
  function mixPose(a, b, u) {
    if (typeof a === "number" && typeof b === "number") return a + (b - a) * u;
    if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.map((v, i) => mixPose(v, b[i], u));
    if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
      const o = {};
      for (const k of /* @__PURE__ */ new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (!(k in a)) o[k] = b[k];
        else if (!(k in b)) o[k] = a[k];
        else o[k] = mixPose(a[k], b[k], u);
      }
      return o;
    }
    return u < 0.5 ? a : b;
  }
  var ROUND = { pupil: 0.3, lid: 0, curve: 0, slant: 0, lidW: 0.05, low: 0, ext: 0 };
  var A = {
    root: [735, 505],
    s: 0.4,
    head: { x: 706.6, y: 458.9, r: 40.3, yaw: 0.866, pitch: 0, roll: -0.366, square: 2.1 },
    body: { x: 735, y: 500, a: 56, b: 44, rot: 0.15 },
    tail: { base: [737, 530], dir: [0.1, 1], len: 2, n: 5, spread: 0.8, w: 7 },
    wings: [
      { lead: [[745, 452], [753, 436], [775, 434], [796, 460]], tips: [[800, 484], [792, 484], [783, 479], [773, 473], [763, 467], [754, 461], [748, 456]] },
      { lead: [[695, 487], [670, 503], [648, 525], [630, 543]], tips: [[625, 548], [640, 547], [658, 545], [675, 540], [690, 535], [703, 530], [712, 525]] }
    ],
    // the feet hook over the desk's front edge: long pale toes curling down to y ~545 (source 48.7–50.4)
    feet: [
      { x: 776, y: 515, rot: 0.08, size: 28, fat: 0.24, toes: 3, spread: 0.42, curl: -0.22, seed: 2, leg: [-2, -6], claw: 0.16 },
      { x: 795, y: 518, rot: -1.5, size: 22, fat: 0.24, toes: 3, spread: 0.9, curl: 0.35, seed: 5, leg: [-10, -2], claw: 0.16 }
    ],
    order: ["farHP", "wing:0", "tail", "body", "wing:1", "head", "nearHP", "foot:0", "foot:1"],
    eyes: { r: 10.9, spread: 0.4, el: -0.18, look: [0.6, -0.6] },
    beak: { az: 0, el: -0.43, lift: 1.05, w: 9.6, l: 11.2, open: 0 },
    plaster: { az: 0.25, el: 0.93, w: 14.4, h: 4.4 },
    headphones: { yaw: 0.866, dx: 0, dy: 0.05, lift: 1, r: 17, bandR: 0.96, bandH: 1.24, tilt: 0.1, open: 0.9, cupEl: 0, w: 5.6 },
    tuft: { dx: -36, dy: -8, ang: 3.55, len: 13, n: 3, spread: 0.7 }
  };
  var B = mergePose(A, {
    head: { x: 706.6, y: 457.4, r: 39.7, yaw: 0.873, roll: -0.388 },
    headphones: { yaw: 0.873 },
    wings: [
      { lead: [[753, 445], [765, 424], [790, 422], [815, 428]], tips: [[822, 432], [818, 442], [811, 451], [802, 459], [792, 466], [782, 471], [772, 474]] },
      { lead: [[693, 487], [670, 495], [640, 507], [605, 523]], tips: [[597, 527], [605, 534], [620, 537], [637, 538], [660, 537], [685, 532], [700, 527]] }
    ],
    feet: [{ x: 775, y: 516, rot: 0.08, size: 28, fat: 0.24, toes: 3, spread: 0.42, curl: -0.22, seed: 2, leg: [-2, -6], claw: 0.16 }, { x: 796, y: 518, rot: -1.5, size: 22, fat: 0.24, toes: 3, spread: 0.9, curl: 0.35, seed: 5, leg: [-10, -2], claw: 0.16 }],
    eyes: { el: -0.17 },
    beak: { el: -0.5 }
  });
  var C = mergePose(B, {
    head: { x: 706.9, y: 454.2, r: 40.7, yaw: 0.816, roll: -0.437 },
    headphones: { yaw: 0.816 },
    body: { x: 740, y: 503, a: 56, b: 46, rot: 0.3 },
    tail: { base: [738, 533], dir: [0.1, 1], len: 22, n: 5, spread: 0.8, w: 8 },
    wings: [
      { lead: [[748, 460], [755, 425], [775, 402], [805, 384]], tips: [[809, 381], [815, 395], [810, 410], [808, 425], [803, 440], [795, 452], [785, 462]] },
      { lead: [[700, 485], [670, 482], [630, 485], [590, 492]], tips: [[575, 495], [583, 510], [600, 520], [620, 528], [640, 533], [662, 535], [685, 532]] }
    ],
    feet: [{ x: 773, y: 517, rot: 0.1, size: 27, fat: 0.24, toes: 3, spread: 0.45, curl: -0.2, seed: 2, leg: [-2, -6], claw: 0.16 }, { x: 796, y: 517, rot: -1.45, size: 22, fat: 0.24, toes: 3, spread: 0.9, curl: 0.35, seed: 5, leg: [-10, -2], claw: 0.16 }],
    eyes: { el: -0.15, look: [0.6, -0.5] },
    beak: { el: -0.57 }
  });
  var D = mergePose(C, {
    head: { x: 705.6, y: 451.2, r: 42.1, yaw: 0.793, roll: -0.387 },
    headphones: { yaw: 0.793 },
    body: { x: 740, y: 500, a: 52, b: 48, rot: 0.8 },
    tail: { base: [733, 532], dir: [0, 1], len: 36, n: 5, spread: 1.3, w: 8 },
    wings: [
      { lead: [[748, 465], [750, 430], [758, 398], [774, 358]], tips: [[779, 356], [795, 368], [802, 388], [802, 410], [800, 428], [793, 445], [783, 462]] },
      { lead: [[690, 480], [655, 468], [620, 458], [578, 446]], tips: [[572, 445], [572, 470], [588, 494], [606, 510], [632, 522], [660, 527], [690, 527]] }
    ],
    feet: [{ x: 762, y: 527, rot: 0.05, size: 17, fat: 0.22, toes: 3, spread: 0.7, curl: 0.7, seed: 2, leg: [0, -7] }, { x: 793, y: 520, rot: -1.6, size: 18, fat: 0.22, toes: 3, spread: 0.75, curl: 0.4, seed: 5, leg: [-12, -3] }],
    eyes: { r: 11, el: -0.09, look: [0.4, -0.2] },
    beak: { el: -0.44 }
  });
  var E2 = mergePose(D, {
    head: { x: 704.6, y: 441, r: 43.7, yaw: 0.62, roll: -0.395 },
    headphones: { yaw: 0.62 },
    body: { x: 742, y: 503, a: 50, b: 48, rot: 1.4 },
    tail: { base: [728, 530], dir: [0, 1], len: 40, n: 5, spread: 1.4, w: 9 },
    wings: [
      { lead: [[750, 470], [748, 430], [752, 390], [760, 346]], tips: [[763, 342], [780, 350], [795, 375], [801, 398], [801, 420], [795, 440], [785, 460]] },
      { lead: [[690, 476], [660, 460], [620, 442], [585, 420]], tips: [[580, 417], [574, 450], [582, 470], [600, 484], [620, 504], [645, 514], [675, 520]] }
    ],
    feet: [{ x: 755, y: 520, rot: 0, size: 17, fat: 0.22, toes: 3, spread: 0.7, curl: 0.7, seed: 2, leg: [0, -7] }, { x: 790, y: 510, rot: -1.3, size: 18, fat: 0.22, toes: 3, spread: 0.8, curl: 0.3, seed: 5, leg: [-12, -3] }],
    eyes: { r: 12, el: -0.09, look: [0.2, 0] },
    beak: { el: -0.52, open: 0.5 }
  });
  var F = mergePose(E2, {
    head: { x: 707.2, y: 430.1, r: 43.3, yaw: 0.462, roll: -0.375 },
    headphones: { yaw: 0.462 },
    body: { x: 739, y: 498, a: 46, b: 47, rot: 1.5 },
    tail: { base: [722, 530], dir: [-0.1, 1], len: 40, n: 5, spread: 1.6, w: 9 },
    wings: [
      { lead: [[762, 468], [758, 420], [757, 385], [758, 338]], tips: [[758, 332], [777, 340], [792, 362], [802, 388], [803, 415], [795, 440], [785, 460]] },
      { lead: [[690, 470], [655, 450], [620, 428], [590, 405]], tips: [[583, 398], [573, 428], [582, 455], [600, 482], [622, 500], [650, 510], [682, 514]] }
    ],
    feet: [{ x: 752, y: 517, rot: 0, size: 17, fat: 0.22, toes: 3, spread: 0.7, curl: 0.7, seed: 2, leg: [0, -7] }, { x: 790, y: 507, rot: -1.25, size: 18, fat: 0.22, toes: 3, spread: 0.8, curl: 0.3, seed: 5, leg: [-12, -3] }],
    eyes: { r: 13.5, el: -0.09, look: [-0.15, 0] },
    beak: { el: -0.53, open: 0.6 }
  });
  var G = mergePose(F, {
    head: { x: 706.8, y: 415, r: 46, yaw: 0.446, roll: -0.257, pitch: 0.12 },
    headphones: { yaw: 0.446 },
    body: { x: 735, y: 485, a: 48, b: 46, rot: 1.5 },
    tail: { base: [718, 520], dir: [-0.1, 1], len: 40, n: 5, spread: 1.6, w: 10 },
    wings: [
      { lead: [[767, 455], [759, 420], [759, 370], [760, 327]], tips: [[760, 322], [777, 325], [793, 348], [803, 377], [805, 405], [800, 428], [790, 445]] },
      { lead: [[690, 460], [655, 440], [620, 415], [590, 380]], tips: [[585, 373], [575, 402], [580, 432], [596, 466], [618, 490], [648, 500], [680, 505]] }
    ],
    feet: [{ x: 740, y: 510, rot: 0, size: 17, fat: 0.22, toes: 3, spread: 0.7, curl: 0.7, seed: 2, leg: [0, -7] }, { x: 785, y: 495, rot: -1.3, size: 18, fat: 0.22, toes: 3, spread: 0.8, curl: 0.3, seed: 5, leg: [-12, -3] }],
    eyes: { r: 15.5, el: -0.075, look: [0, 0.1] },
    beak: { el: -0.52, open: 0.6 }
  });
  var feetU = (d, g) => [
    { x: d[0], y: d[1], rot: d[2], size: 17, fat: 0.22, toes: 3, spread: 0.7, curl: 0.7, seed: 2, leg: [0, -7] },
    { x: g[0], y: g[1], rot: g[2], size: 18, fat: 0.22, toes: 3, spread: 0.8, curl: 0.3, seed: 5, leg: [-12, -3] }
  ];
  var L1 = mergePose(G, {
    head: { x: 713, y: 413, r: 47, yaw: 0.35, roll: -0.2, pitch: 0.05 },
    headphones: { yaw: 0.35 },
    body: { x: 742, y: 478, a: 48, b: 45, rot: 1.5 },
    tail: { base: [725, 512], dir: [-0.3, 1], len: 34, n: 5, spread: 1.4, w: 10 },
    wings: [
      { lead: [[765, 452], [757, 420], [755, 370], [756, 320]], tips: [[756, 315], [778, 321], [796, 344], [807, 373], [805, 405], [798, 430], [787, 452]] },
      { lead: [[690, 455], [655, 440], [620, 410], [595, 378]], tips: [[591, 385], [578, 410], [582, 435], [596, 460], [621, 472], [650, 490], [679, 498]] }
    ],
    feet: feetU([740, 512, 0], [785, 495, -1.3]),
    eyes: { r: 15, look: [-0.6, -0.6] }
  });
  var L2 = mergePose(L1, {
    head: { x: 727, y: 419, r: 48, yaw: 0.35, roll: 0.05, pitch: 0 },
    headphones: { yaw: 0.35 },
    body: { x: 752, y: 482, a: 48, b: 44, rot: 1.6 },
    tail: { base: [735, 512], dir: [-0.2, 1], len: 28, n: 5, spread: 1.3, w: 10 },
    wings: [
      { lead: [[776, 452], [768, 420], [765, 370], [764, 318]], tips: [[763, 313], [783, 322], [805, 355], [817, 391], [812, 420], [800, 440], [790, 455]] },
      { lead: [[700, 460], [665, 440], [630, 410], [612, 375]], tips: [[609, 383], [592, 410], [600, 439], [621, 464], [654, 483], [685, 501], [704, 512]] }
    ],
    feet: feetU([754, 518, 0.1], [800, 500, -1.2]),
    eyes: { r: 14, look: [-0.2, 0.05] }
  });
  var L3 = mergePose(L2, {
    head: { x: 742, y: 440, r: 47, yaw: 0.3, roll: 0.1, pitch: 0 },
    headphones: { yaw: 0.3 },
    body: { x: 750, y: 490, a: 44, b: 46, rot: 1.7 },
    tail: { base: [735, 522], dir: [-0.4, 1], len: 22, n: 5, spread: 1.3, w: 10 },
    wings: [
      { lead: [[778, 465], [774, 420], [772, 370], [772, 325]], tips: [[772, 321], [788, 333], [804, 366], [816, 405], [812, 434], [802, 450], [788, 462]] },
      { lead: [[715, 470], [680, 440], [650, 400], [622, 372]], tips: [[618, 383], [623, 414], [632, 453], [654, 482], [679, 498], [700, 511], [715, 518]] }
    ],
    feet: feetU([745, 522, 0.2], [790, 512, -1.3]),
    eyes: { r: 13, look: [-0.3, 0.1] }
  });
  var L4X = 20;
  var sh4 = (p) => [p[0] + L4X, p[1]];
  var L4 = mergePose(L3, {
    head: { x: 760 + L4X, y: 438, r: 47, yaw: 0.05, roll: 0.05 },
    headphones: { yaw: 0.05 },
    body: { x: 772 + L4X, y: 492, a: 62, b: 36, rot: 0.05 },
    tail: { base: sh4([835, 505]), dir: [1, 0.3], len: 14, n: 4, spread: 0.8, w: 10 },
    wings: [
      { lead: [[808, 452], [835, 432], [865, 415], [895, 405]].map(sh4), tips: [[898, 405], [890, 420], [880, 431], [868, 440], [855, 447], [840, 452], [825, 455]].map(sh4) },
      { lead: [[752, 462], [722, 452], [690, 445], [658, 440]].map(sh4), tips: [[655, 441], [662, 453], [672, 463], [684, 471], [698, 477], [712, 480], [726, 480]].map(sh4) }
    ],
    feet: feetU([778, 528, 0.1], [822, 526, -0.3]),
    eyes: { look: [0, 0.6], over: { lid: 0.62, lidW: 0.15 } },
    blur: [8, 1.5]
  });
  var NEAR = {
    BMID: { lead: [[45, 8], [85, -2], [120, -12], [150, -20]], tips: [[153, -20], [150, -8], [142, 2], [132, 10], [118, 16], [100, 20], [82, 22]] },
    FWD: { lead: [[4, 28], [-28, 34], [-60, 40], [-92, 46]], tips: [[-98, 52], [-88, 60], [-74, 64], [-58, 66], [-42, 64], [-26, 60], [-10, 54]] },
    UP: { lead: [[56, 9], [62, -30], [72, -70], [82, -103]], tips: [[83, -107], [105, -90], [117, -67], [125, -40], [132, -15], [128, 2], [115, 10]] },
    BUP: { lead: [[45, 5], [75, -10], [105, -25], [132, -36]], tips: [[135, -37], [142, -24], [145, -10], [143, 5], [135, 15], [120, 20], [100, 22]] },
    BACK: { lead: [[45, 10], [90, 5], [130, 5], [165, 9]], tips: [[167, 11], [160, 18], [150, 22], [138, 25], [122, 27], [104, 27], [85, 26]] },
    DOWN: { lead: [[12, 30], [-12, 44], [-38, 56], [-60, 64]], tips: [[-64, 68], [-54, 76], [-42, 80], [-30, 80], [-18, 78], [-6, 72], [5, 64]] }
  };
  var FAR = {
    BACKF: { lead: [[45, 4], [90, -2], [130, -4], [165, -2]], tips: [[167, 0], [160, 8], [150, 13], [138, 16], [122, 18], [104, 18], [85, 17]] },
    UP: { lead: [[14, -30], [6, -40], [-4, -48], [-14, -54]], tips: [[-34, -84], [-26, -92], [-17, -95], [-8, -93], [0, -87], [7, -78]], sub: 0, cw: 0.2, fw: 0.9, rmax: 0.9 },
    SPK: { lead: [[36, -8], [42, -14], [48, -20], [53, -25]], tips: [[74, -40], [71, -50], [64, -57], [56, -58], [49, -54]], sub: 0, cw: 0.2, fw: 0.8, rmax: 0.9 },
    BK: { lead: [[40, 0], [62, 4], [86, 8], [112, 10]], tips: [[116, 10], [110, 15], [103, 17], [96, 18], [89, 18], [82, 17], [75, 16]] }
  };
  function flyKey(hx, hy, near, far, o = {}, ns = 0) {
    if (near === "DOWN") o = mergePose({
      body: { x: hx + 62, y: hy + 42, a: 60, b: 44, rot: 0.3 },
      feet: [
        { x: hx + 100, y: hy + 80, rot: -0.7, size: 14, fat: 0.22, toes: 3, spread: 0.5, curl: 0.6, seed: 2, leg: [-6, -8] },
        { x: hx + 112, y: hy + 74, rot: -0.9, size: 14, fat: 0.22, toes: 3, spread: 0.5, curl: 0.6, seed: 5, leg: [-6, -8] }
      ]
    }, o);
    const rel = (p) => [hx + p[0], hy + p[1]];
    const W = (w, sh = 0) => ({ ...w, lead: w.lead.map((p, i) => rel([p[0] + sh * (0.6 + 0.4 * i / (w.lead.length - 1)), p[1]])), tips: w.tips.map((p) => rel([p[0] + sh, p[1]])) });
    return mergePose({
      root: [hx + 62, hy + 30],
      s: 0.45,
      head: { x: hx, y: hy + 2, r: 40, sx: 1.08, yaw: -0.35, pitch: 0, roll: -0.29, square: 2.1 },
      body: { x: hx + 60, y: hy + 38, a: 58, b: 42, rot: 0.3 },
      tail: { base: rel([106, 56]), dir: [1, 0.55], len: 15, n: 4, spread: 0.7, w: 9 },
      wings: [W(FAR[far]), W(NEAR[near], ns)],
      feet: [
        { x: hx + 98, y: hy + 66, rot: -0.7, size: 14, fat: 0.22, toes: 3, spread: 0.5, curl: 0.6, seed: 2, leg: [-6, -8] },
        { x: hx + 110, y: hy + 60, rot: -0.9, size: 14, fat: 0.22, toes: 3, spread: 0.5, curl: 0.6, seed: 5, leg: [-6, -8] }
      ],
      order: ["farHP", "wing:0", "tail", "body", "foot:0", "foot:1", "head", "nearHP", "wing:1"],
      eyes: { r: 11, spread: 0.4, el: -0.15, look: [-0.8, 0.05] },
      beak: { az: 0, el: -0.45, lift: 1.05, w: 10, l: 11.5, open: 0.35 },
      plaster: { az: 0.1, el: 1, w: 15, h: 4.6 },
      headphones: { yaw: -0.35, dx: 0, dy: 0, lift: 1, r: 15, bandR: 1, bandH: 1.02, tilt: 0.1, open: 0.8, cupEl: 0, w: 5.5 },
      tuft: { dx: 44, dy: -22, ang: -0.45, len: 20, n: 5, spread: 1.5, w: 0.3 },
      blur: [4, 0]
    }, o);
  }
  var FLY = [
    [52.68, 740, 443, "FWD", "BACKF", 0, 0, { head: { r: 46 }, body: { x: 800, y: 482, a: 80, b: 42, rot: 0.06 }, tail: { base: [868, 494], dir: [1, 0.2], len: 20 } }],
    [52.72, 705, 453, "DOWN", "BK"],
    [52.76, 677, 453, "BUP", "SPK"],
    [52.8, 647, 450, "UP", "UP"],
    [52.84, 612, 445, "BUP", "SPK"],
    [52.88, 590, 445, "DOWN", "BK", 0, 7],
    [52.92, 570, 447, "BUP", "SPK"],
    [52.96, 537, 449, "UP", "UP"],
    [53, 512, 448, "BUP", "SPK"],
    [53.04, 512, 448, "BUP", "SPK"],
    [53.08, 480, 447, "DOWN", "BK", 0, 7],
    [53.12, 452, 452, "BACK", "SPK", 0, 7],
    [53.16, 428, 450, "UP", "UP"],
    [53.2, 400, 452, "BMID", "SPK"]
  ];
  var KEYS = [
    { t: 48.72, p: A },
    { t: 49.08, p: A },
    { t: 49.88, p: B, ease: (u) => u * u },
    { t: 50.4, p: C },
    { t: 50.88, p: D },
    { t: 51.36, p: E2 },
    { t: 51.8, p: F },
    { t: 52.44, p: G }
  ];
  var ONES = [[52.52, L1], [52.56, L2], [52.6, L3], [52.64, L4], ...FLY.map(([t, x, y, n, f, ns, bl2, o]) => [t, flyKey(x, y, n, f, { ...o || {}, ...bl2 ? { blur: [bl2, 0] } : {} }, ns || 0)])];
  var DRAW = [];
  for (let k = 0; ; k++) {
    const t = +(47.84 + 0.08 * k).toFixed(2);
    if (t > 49.53) break;
    DRAW.push(t);
  }
  for (const [a, b] of [[49.64, 50.53], [50.64, 51.53], [51.64, 52.45]]) for (let t = a; t < b; t += 0.08) DRAW.push(+t.toFixed(2));
  function drawTick(t) {
    if (t >= 52.52 - 1e-6) return Math.abs(t - 53.04) < 0.01 ? 53 : t;
    let d = DRAW[0];
    for (const x of DRAW) if (x <= t + 1e-6) d = x;
    return d;
  }
  function drawingTime(t) {
    const d = drawTick(t);
    return d < 49.12 - 1e-6 ? 48.72 : d;
  }
  function owlFrame(t) {
    if (t >= 52.52 - 1e-6) {
      let k = ONES[0][1];
      for (const [tt, p] of ONES) if (tt <= t + 1e-6) k = p;
      return toUnits(k);
    }
    return owlAt(drawingTime(t));
  }
  function toUnits(K) {
    const s = K.s, R = K.root, u = (p) => [(p[0] - R[0]) / s, (p[1] - R[1]) / s], d = (v) => v / s;
    const h = K.head, hr = d(h.r);
    const hc = u([h.x, h.y]);
    return {
      x: R[0],
      y: R[1],
      s,
      rot: K.rot || 0,
      light: [-0.55, -0.83],
      head: { x: hc[0], y: hc[1], rx: hr * (h.sx ?? 1), ry: hr, yaw: h.yaw, pitch: h.pitch || 0, roll: h.roll || 0, square: h.square ?? 2.1, jowl: 0.04 },
      body: K.body ? { x: u([K.body.x, K.body.y])[0], y: u([K.body.x, K.body.y])[1], a: d(K.body.a), b: d(K.body.b), rot: K.body.rot || 0, egg: K.body.egg || 0, sag: 0 } : null,
      tail: K.tail && K.tail.len > 3 ? { base: u(K.tail.base), dir: K.tail.dir, len: d(K.tail.len), n: K.tail.n, spread: K.tail.spread, w: d(K.tail.w) } : null,
      wings: K.wings.map((w) => ({ ...w, lead: w.lead.map(u), tips: w.tips.map(u) })),
      feet: K.feet.map((f) => ({ ...f, x: u([f.x, f.y])[0], y: u([f.x, f.y])[1], size: d(f.size), leg: f.leg ? [d(f.leg[0]), d(f.leg[1])] : null })),
      order: K.order,
      eyes: { state: "wide", r: d(K.eyes.r), spread: K.eyes.spread, el: K.eyes.el, look: K.eyes.look, over: { ...ROUND, ...K.eyes.over || {} }, left: K.eyes.left, right: K.eyes.right },
      beak: { ...K.beak, w: d(K.beak.w), l: d(K.beak.l) },
      plaster: { ...K.plaster, w: d(K.plaster.w), h: d(K.plaster.h) },
      headphones: { on: true, ...K.headphones, r: d(K.headphones.r), w: d(K.headphones.w) },
      tuft: K.tuft ? { ...K.tuft, dx: d(K.tuft.dx), dy: d(K.tuft.dy), len: d(K.tuft.len) } : null,
      disc: 1,
      blur: K.blur,
      flip: K.flip
    };
  }
  function owlAt(t) {
    const K = KEYS;
    let k;
    if (t <= K[0].t) k = K[0].p;
    else if (t >= K[K.length - 1].t) k = K[K.length - 1].p;
    else {
      for (let i = 1; i < K.length; i++) {
        if (t <= K[i].t) {
          const a = K[i - 1], b = K[i], u = (t - a.t) / (b.t - a.t);
          k = mixPose(a.p, b.p, b.ease ? b.ease(u) : u);
          break;
        }
      }
    }
    return toUnits(k);
  }

  // src/shots/s17/owlDraw.js
  var { add: add2, sub: sub2, mul: mul2, nrm: nrm2, perp: perp2 } = V;
  var TAU2 = Math.PI * 2;
  var blobPath2 = (pts) => (c) => smoothPath(c, pts, true);
  var PPU2 = 1;
  var SPX = 1;
  var wmin2 = (w) => Math.max(w, 0.7 / PPU2);
  var PX = (v) => v / SPX;
  function wingGeom(w) {
    const { lead: L0, tips: T0, cw = 0.36, fw = 1, rmax = 0.62, sub: subd = 1 } = w;
    let tips = T0;
    if (subd) {
      tips = [];
      for (let i = 0; i < T0.length; i++) {
        tips.push(T0[i]);
        if (i < T0.length - 1) {
          const m = V.mix(T0[i], T0[i + 1], 0.5), c = V.mix(L0[0], L0[L0.length - 1], 0.5 + 0.5 * (1 - i / (T0.length - 1)) - 0.25);
          tips.push(V.mix(m, c, 0.1));
        }
      }
    }
    const lead = sampleCurve(L0, 8);
    const acc = [0];
    for (let i = 1; i < lead.length; i++) acc.push(acc[i - 1] + V.len(sub2(lead[i], lead[i - 1])));
    const total = acc[acc.length - 1] || 1;
    const at = (f) => {
      const d = clamp(f) * total;
      let i = 1;
      while (i < acc.length - 1 && acc[i] < d) i++;
      const u = (d - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]);
      return V.mix(lead[i - 1], lead[i], clamp(u));
    };
    const n = tips.length;
    const feathers = tips.map((tip, i) => {
      const f = n === 1 ? 1 : 1 - i / (n - 1);
      return { root: at(0.04 + rmax * f), tip, point: 0.75 + 0.25 * f, kind: f > 0.45 ? 1 : 0 };
    });
    let trs = [0, 0], Ls = 0;
    for (let i = 0; i < n; i++) {
      const f = feathers[i], L = V.len(sub2(f.tip, f.root));
      const a = feathers[Math.max(0, i - 1)].tip, b = feathers[Math.min(n - 1, i + 1)].tip;
      const sp = V.len(sub2(b, a)) / (i > 0 && i < n - 1 ? 2 : 1);
      f.w = clamp(sp * 2.2, L * 0.2, L * 0.38) * fw;
      trs = add2(trs, nrm2(sub2(f.tip, f.root)));
      Ls += L;
    }
    for (let i = 0; i < n; i++) {
      const f = feathers[i], u = nrm2(sub2(f.tip, f.root));
      let nn = perp2(u);
      const ref = i < n - 1 ? feathers[i + 1].tip : V.mix(f.root, f.tip, 0.5);
      const side = i < n - 1 ? sub2(ref, f.tip) : sub2(feathers[Math.max(0, i - 1)].tip, f.tip);
      if ((nn[0] * side[0] + nn[1] * side[1]) * (i < n - 1 ? 1 : -1) < 0) nn = mul2(nn, -1);
      f.off = mul2(nn, f.w * (i === 0 ? 0.42 : 0.22));
    }
    const cov = feathers.map((f) => V.mix(f.root, f.tip, cw));
    return { lead, cov, feathers, tr: nrm2(trs), len: Ls / Math.max(1, n) };
  }
  function leaf2(f) {
    const d = sub2(f.tip, f.root), L = V.len(d) || 1, u = mul2(d, 1 / L), n = perp2(u), w = f.w, p = f.point;
    const o = f.off || [0, 0];
    const sh = (q, k) => add2(q, mul2(o, k));
    return [
      sh(add2(f.root, mul2(n, -w * 0.3)), 1),
      sh(add2(add2(f.root, mul2(u, L * 0.4)), mul2(n, -w * 0.5)), 0.85),
      sh(add2(add2(f.root, mul2(u, L * (0.78 + 0.08 * p))), mul2(n, -w * (0.36 - 0.12 * p))), 0.45),
      f.tip,
      sh(add2(add2(f.root, mul2(u, L * (0.78 + 0.08 * p))), mul2(n, w * (0.36 - 0.12 * p))), 0.45),
      sh(add2(add2(f.root, mul2(u, L * 0.4)), mul2(n, w * 0.5)), 0.85),
      sh(add2(f.root, mul2(n, w * 0.3)), 1)
    ];
  }
  function paintWing(g, G2, plu, dl, seed = 1) {
    const r0 = rng(300 + seed * 31);
    for (let i = 0; i < G2.feathers.length; i++) {
      const f0 = G2.feathers[i], vw = 0.78 + 0.44 * r0(), vl = 0.9 + 0.1 * r0();
      const f = { ...f0, w: f0.w * vw, tip: V.mix(f0.root, f0.tip, vl), off: f0.off ? mul2(f0.off, vw) : null };
      const sh = leaf2(f), path = blobPath2(sh);
      plumage(g, path, { base: 0.95, shade: f.kind ? 0.72 : 0.7, depth: f.w * 0.32, blur: f.w * 0.2, ...plu });
      if (dl > 0.3) {
        softShade(g, path, (c) => {
          const m = V.mix(f.root, f.tip, 0.28);
          c.ellipse(m[0], m[1], V.len(sub2(f.tip, f.root)) * 0.35, f.w * 0.6, Math.atan2(f.tip[1] - f.root[1], f.tip[0] - f.root[0]), 0, TAU2);
        }, 0.62, 0.45, f.w * 0.25);
      }
      ink2(g, sh.slice(1, 6), PX(1), gv(0.3, 0.8), { end: 0.15, bias: 0.6 });
      if (dl > 0.4) {
        const d = nrm2(sub2(f.tip, f.root)), L = V.len(sub2(f.tip, f.root)), nn = perp2(d);
        ink2(g, [add2(f.root, mul2(d, L * 0.3)), add2(f.root, mul2(d, L * (0.7 + 0.15 * r0())))], PX(0.7), gv(0.5, 0.4), { end: 0.1 });
        const r = rng(900 + i * 7 + seed * 101);
        for (let k = 0; k < 6; k++) {
          const u = 0.25 + 0.6 * r(), p0 = add2(add2(f.root, mul2(d, L * u)), mul2(nn, f.w * (0.05 + 0.2 * r())));
          flick(g, p0, nrm2(add2(d, mul2(nn, 0.5))), f.w * (0.3 + 0.2 * r()), PX(0.7), gv(0.48, 0.35), 0.1);
        }
      }
    }
    const band = [...G2.lead, ...G2.cov];
    const bp = blobPath2(band);
    plumage(g, bp, { base: 0.96, shade: 0.8, depth: G2.len * 0.15, blur: G2.len * 0.08, ...plu });
    const covIn = [...G2.cov].reverse();
    const mid = G2.lead.map((p, i) => V.mix(p, G2.cov[Math.min(G2.cov.length - 1, Math.round(i * (G2.cov.length - 1) / Math.max(1, G2.lead.length - 1)))], 0.5)).reverse();
    if (dl > 0.3) {
      for (const row of [covIn, mid]) softShade(g, bp, (c) => {
        const q = sampleCurve(row, 3);
        c.moveTo(q[0][0], q[0][1]);
        for (const p of q) c.lineTo(p[0], p[1]);
        for (let k = q.length - 1; k >= 0; k--) c.lineTo(q[k][0] - G2.tr[0] * G2.len * 0.08, q[k][1] - G2.tr[1] * G2.len * 0.08);
        c.closePath();
      }, 0.6, 0.5, G2.len * 0.05);
    }
    scallops(g, covIn, G2.tr, G2.len * 0.12, PX(1), gv(0.38, 0.7));
    scallops(g, mid, G2.tr, G2.len * 0.09, PX(0.8), gv(0.45, 0.55));
    ink2(g, G2.lead, PX(1.5), gv(0.2, 0.9), { end: 0.25, bias: 0.4 });
  }
  function scallops(g, pts, dir, r, w, color) {
    const q = sampleCurve(pts, 4);
    let acc = 0, last = q[0];
    const marks = [q[0]];
    for (let i = 1; i < q.length; i++) {
      acc += V.len(sub2(q[i], q[i - 1]));
      if (acc >= r * 1.7) {
        marks.push(q[i]);
        acc = 0;
      }
      last = q[i];
    }
    if (V.len(sub2(marks[marks.length - 1], last)) > r * 0.8) marks.push(last);
    for (let i = 1; i < marks.length; i++) {
      const a = marks[i - 1], b = marks[i], m = add2(V.mix(a, b, 0.5), mul2(dir, r * 0.9));
      ink2(g, [a, m, b], w, color, { end: 0.25 });
    }
  }
  function tailGeom(t) {
    const { base, dir, len = 60, n = 5, spread = 0.9, w = 26, seed = 7 } = t;
    const d0 = nrm2(dir), r = rng(seed), out = [];
    const nb = perp2(d0);
    for (let i = 0; i < n; i++) {
      const f = n === 1 ? 0 : i / (n - 1) - 0.5;
      const d = V.rot(d0, f * spread);
      const root = add2(base, mul2(nb, f * w * 0.8));
      out.push({ root, tip: add2(root, mul2(d, len * (1 - 0.18 * Math.abs(f) * 2) * (0.95 + 0.1 * r()))), w, point: 0.35, kind: 1 });
    }
    out.sort((a, b) => Math.abs(V.len(sub2(b.root, base))) - Math.abs(V.len(sub2(a.root, base))));
    return out;
  }
  function drawCupS(g, c) {
    const { x, y, r = 45, rot = 0, open = 0.85, side = 1 } = c;
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    const s = side, rx = r * open, ry = r;
    const rimX = -s * r * 0.1, RX = rx * 0.98 + r * 0.08, RY = ry;
    g.fillStyle = gv(0.42);
    g.beginPath();
    g.ellipse(rimX, 0, RX, RY, 0, 0, TAU2);
    g.fill();
    g.save();
    g.beginPath();
    g.ellipse(rimX, 0, RX, RY, 0, 0, TAU2);
    g.clip();
    g.lineCap = "butt";
    for (let i = 0; i < 40; i++) {
      const a = i / 40 * TAU2;
      g.strokeStyle = i % 2 ? gv(0.72, 0.85) : gv(0.22, 0.85);
      g.lineWidth = wmin2(r * 0.06);
      g.beginPath();
      g.moveTo(rimX + Math.cos(a) * RX * 0.72, Math.sin(a) * RY * 0.72);
      g.lineTo(rimX + Math.cos(a) * RX * 1.02, Math.sin(a) * RY * 1.03);
      g.stroke();
    }
    g.restore();
    const fx = s * r * 0.14, PX_ = rx * 0.8, PY = ry * 0.86;
    const pg = g.createLinearGradient(fx - PX_, -PY, fx + PX_, PY);
    pg.addColorStop(0, gv(0.78));
    pg.addColorStop(0.45, gv(0.6));
    pg.addColorStop(1, gv(0.4));
    g.fillStyle = pg;
    g.beginPath();
    g.ellipse(fx, 0, PX_, PY, 0, 0, TAU2);
    g.fill();
    g.save();
    g.beginPath();
    g.ellipse(fx, 0, PX_, PY, 0, 0, TAU2);
    g.clip();
    g.filter = `blur(${Math.max(0.4, r * 0.12 * PPU2).toFixed(2)}px)`;
    g.fillStyle = gv(0.86, 0.75);
    g.beginPath();
    g.ellipse(fx - s * PX_ * 0.3, -PY * 0.35, PX_ * 0.35, PY * 0.32, 0, 0, TAU2);
    g.fill();
    g.fillStyle = gv(0.3, 0.6);
    g.beginPath();
    g.ellipse(fx + s * PX_ * 0.5, PY * 0.5, PX_ * 0.45, PY * 0.45, 0, 0, TAU2);
    g.fill();
    g.filter = "none";
    g.restore();
    for (const k of [0.66, 0.4]) {
      g.strokeStyle = gv(0.3, 0.7);
      g.lineWidth = wmin2(PX(0.8));
      g.beginPath();
      g.ellipse(fx + s * PX_ * (1 - k) * 0.2, PY * (1 - k) * 0.08, PX_ * k, PY * k, 0, 0, TAU2);
      g.stroke();
    }
    g.strokeStyle = gv(0.25, 0.9);
    g.lineWidth = wmin2(PX(1.3));
    g.beginPath();
    g.ellipse(fx, 0, PX_, PY, 0, 0, TAU2);
    g.stroke();
    g.strokeStyle = gv(0.27);
    g.lineWidth = wmin2(PX(2.5));
    g.beginPath();
    g.ellipse(rimX, 0, RX, RY, 0, 0, TAU2);
    g.stroke();
    g.restore();
  }
  function drawFootS(g, f) {
    const { x, y, rot = 0, size = 40, toes = 3, spread = 0.8, curl = 0.4, claw = 0.3, fat = 0.22, seed = 3, palm = 0.2 } = f;
    const r = rng(seed);
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.lineCap = "round";
    g.lineJoin = "round";
    const tw = size * fat, ol = wmin2(PX(1.1));
    const stroke = (q, w, c) => {
      g.strokeStyle = c;
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(q[0][0], q[0][1]);
      for (const p of q) g.lineTo(p[0], p[1]);
      g.stroke();
    };
    if (f.leg) {
      const L = V.rot(f.leg, -rot), q = [L, V.mix(L, [0, 0], 0.5), [0, 0]];
      stroke(q, tw * 1.25 + ol * 2, gv(0.18));
      stroke(q, tw * 1.25, gv(0.92));
    }
    const toeP = [];
    for (let i = 0; i < toes; i++) {
      const f0 = toes === 1 ? 0 : i / (toes - 1) - 0.5;
      let d = V.rot([0, 1], f0 * spread * 2);
      const L = size * (1 - Math.abs(f0) * 0.25) * (0.92 + 0.16 * r());
      const pts = [mul2(perp2(d), -f0 * tw * 0.8)];
      for (let k = 0; k < 3; k++) {
        pts.push(add2(pts[pts.length - 1], mul2(d, L / 3)));
        d = V.rot(d, curl * (0.35 + 0.25 * k));
      }
      toeP.push({ q: sampleCurve(pts, 4), f0, d });
    }
    const order = toeP.map((t, i) => i).sort((a, b) => Math.abs(toeP[b].f0) - Math.abs(toeP[a].f0));
    for (const i of order) {
      const { q, d } = toeP[i];
      const e = q[q.length - 1], tip = add2(e, mul2(d, size * claw));
      stroke([e, tip], tw * 0.7 + ol * 2, gv(0.12));
      stroke([e, V.mix(e, tip, 0.6)], tw * 0.6, gv(0.55));
      stroke(q, tw + ol * 2, gv(0.15));
      stroke(q, tw, gv(0.92 - 0.04 * r()));
      for (const k of [0.36, 0.68]) {
        const j = Math.floor((q.length - 1) * k), p = q[j], tt = nrm2(sub2(q[Math.min(q.length - 1, j + 1)], q[Math.max(0, j - 1)])), n = perp2(tt);
        ink2(g, [add2(p, mul2(n, -tw * 0.45)), add2(p, mul2(tt, tw * 0.15)), add2(p, mul2(n, tw * 0.45))], size * 0.02, gv(0.35, 0.7), { end: 0.3 });
      }
    }
    const pr = size * palm;
    g.fillStyle = gv(0.92);
    g.beginPath();
    g.ellipse(0, pr * 0.2, pr * 0.9, pr * 0.75, 0, 0, TAU2);
    g.fill();
    g.restore();
  }
  function drawBandS(g, pts, w) {
    if (pts.length < 2) return;
    const q = sampleCurve(pts, 6);
    const nrmAt = (i) => {
      const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)];
      return perp2(nrm2(sub2(b, a)));
    };
    const line = (off, lw, c) => {
      const p = q.map((pp, i) => add2(pp, mul2(nrmAt(i), off)));
      g.strokeStyle = c;
      g.lineWidth = lw;
      g.lineCap = "round";
      g.lineJoin = "round";
      g.beginPath();
      g.moveTo(p[0][0], p[0][1]);
      for (const pp of p) g.lineTo(pp[0], pp[1]);
      g.stroke();
    };
    const W = Math.min(w, PX(4.2));
    line(0, W, gv(0.14));
    line(0, W * 0.45, gv(0.55));
    line(-W * 0.12, W * 0.16, gv(0.85, 0.8));
  }
  function drawBeakS(g, b) {
    const { x, y, w = 26, l = 30, rot = 0, turn = 0, open = 0 } = b;
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    const k = clamp(turn, -1, 1), o = clamp(open, 0, 1);
    const tip = [w * 0.05 + k * w * 0.06, l * (0.95 - 0.1 * o)];
    const upper = [[-w * 0.46, 0], [-w * 0.5, l * 0.32], [-w * 0.3, l * 0.7], tip, [w * 0.3, l * 0.66], [w * 0.5, l * 0.3], [w * 0.4, -l * 0.02], [0, -l * 0.08]];
    if (o > 0.02) {
      const mouth = [[-w * 0.36, l * 0.55], [0, l * (0.72 + 0.1 * o)], [w * 0.38, l * 0.5], [w * 0.3, l * (0.85 + 0.45 * o)], [0, l * (1 + 0.55 * o)], [-w * 0.3, l * (0.85 + 0.45 * o)]];
      g.fillStyle = gv(0.1);
      g.beginPath();
      smoothPath(g, mouth, true);
      g.fill();
      const lower = [[-w * 0.26, l * (0.8 + 0.42 * o)], [0, l * (0.9 + 0.42 * o)], [w * 0.26, l * (0.8 + 0.42 * o)], [w * 0.2, l * (0.95 + 0.5 * o)], [0, l * (1.02 + 0.55 * o)], [-w * 0.2, l * (0.95 + 0.5 * o)]];
      g.fillStyle = gv(0.72);
      g.beginPath();
      smoothPath(g, lower, true);
      g.fill();
      ink2(g, [...mouth, mouth[0]], PX(0.9), gv(0.15, 0.85), { end: 0.4 });
    }
    const up = blobPath2(upper);
    g.save();
    g.beginPath();
    up(g);
    g.clip();
    const bg = g.createLinearGradient(-w * 0.5, 0, w * 0.5, l);
    bg.addColorStop(0, gv(0.86));
    bg.addColorStop(0.55, gv(0.66));
    bg.addColorStop(1, gv(0.45));
    g.fillStyle = bg;
    g.fillRect(-w, -l, w * 2, l * 3);
    g.restore();
    ink2(g, [...upper, upper[0]], PX(1.1), gv(0.2, 0.9), { end: 0.5 });
    g.fillStyle = gv(0.2, 0.9);
    g.beginPath();
    g.ellipse(-w * 0.12 - k * w * 0.1, l * 0.18, Math.max(PX(0.7), w * 0.06), Math.max(PX(0.5), w * 0.045), 0, 0, TAU2);
    g.fill();
    g.restore();
  }
  function drawPlaster(g, { x, y, w = 36, h = 11, rot = 0, sx = 1 }) {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(sx, 1);
    g.fillStyle = gv(0.78);
    g.beginPath();
    g.roundRect(-w / 2, -h / 2, w, h, h * 0.45);
    g.fill();
    g.strokeStyle = gv(0.25, 0.9);
    g.lineWidth = wmin2(1.3);
    g.stroke();
    g.fillStyle = gv(0.62);
    g.beginPath();
    g.roundRect(-w * 0.18, -h * 0.34, w * 0.36, h * 0.68, h * 0.2);
    g.fill();
    g.restore();
  }
  var ORDER = ["farHP", "wing:0", "tail", "body", "foot:0", "wing:1", "head", "nearHP", "foot:1"];
  function owlS17Layer(P, canvas) {
    const s = P.s ?? 1, res = P.res ?? 1, rot = P.rot ?? 0, fl = P.flip ? -1 : 1;
    const ca = Math.cos(rot), sa = Math.sin(rot);
    const toF = ([ux, uy]) => [P.x + s * (ca * fl * ux - sa * uy), P.y + s * (sa * fl * ux + ca * uy)];
    const Lf = P.light || [-0.55, -0.83];
    const Lu = nrm2([fl * (ca * Lf[0] + sa * Lf[1]), -sa * Lf[0] + ca * Lf[1]]);
    const dl = P.detail ?? clamp(s * res / 1, 0.2, 1);
    const H = headGeom(P.head);
    const body = P.body ? bodyOutline(P.body) : null;
    const wings = (P.wings || []).map((w) => wingGeom(w));
    const tail = P.tail ? tailGeom(P.tail) : [];
    const E3 = P.eyes || {};
    const eyes = [-1, 1].map((sd) => {
      const q = H.P(sd * (E3.spread ?? 0.4) + (E3.az ?? 0), E3.el ?? -0.1);
      const nz = Math.max(0.05, q.nz);
      return { x: q.x, y: q.y, nz, side: sd, r: (E3.r ?? 27) * (1 - 0.55 * (1 - nz)), sx: 0.2 + 0.8 * nz };
    });
    const B2 = P.beak || {};
    const bq = H.P(B2.az ?? 0, B2.el ?? -0.45, B2.lift ?? 1.05);
    const HP = P.headphones || {};
    const hp = HP.on ? headphoneGeom(H, HP) : null;
    const all = [...H.out];
    if (body) all.push(...body);
    wings.forEach((G2) => {
      all.push(...G2.lead);
      G2.feathers.forEach((f) => all.push(f.tip));
    });
    tail.forEach((f) => all.push(f.tip, f.root));
    (P.feet || []).forEach((f) => {
      const z = (f.size || 15) * 2.4;
      all.push([f.x - z, f.y - z], [f.x + z, f.y + z]);
    });
    if (hp) {
      hp.band.forEach((b) => all.push(b.p));
      hp.cups.forEach((c) => {
        const r = (HP.r ?? 45) * 1.2;
        all.push([c.x - r, c.y - r], [c.x + r, c.y + r]);
      });
    }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of all) {
      const f = toF(p);
      x0 = Math.min(x0, f[0]);
      y0 = Math.min(y0, f[1]);
      x1 = Math.max(x1, f[0]);
      y1 = Math.max(y1, f[1]);
    }
    const bl2 = P.blur ? Math.hypot(P.blur[0], P.blur[1]) : 0;
    const m = 12 * s + 6 + bl2;
    x0 = Math.floor(x0 - m);
    y0 = Math.floor(y0 - m);
    x1 = Math.ceil(x1 + m);
    y1 = Math.ceil(y1 + m);
    const cw = Math.max(1, Math.round((x1 - x0) * res)), ch = Math.max(1, Math.round((y1 - y0) * res));
    const cv = canvas || document.createElement("canvas");
    if (cv.width !== cw || cv.height !== ch) {
      cv.width = cw;
      cv.height = ch;
    }
    const g = cv.getContext("2d", { willReadFrequently: true });
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, cw, ch);
    g.setTransform(res * s * fl * ca, res * s * fl * sa, -res * s * sa, res * s * ca, res * (P.x - x0), res * (P.y - y0));
    PPU2 = s * res;
    setPPU(PPU2);
    SPX = s;
    const plu = { light: Lu };
    const hatchCol = gv(0.3, 0.45);
    const layers = {
      farHP() {
        if (!hp) return;
        for (const sg of hp.segs) if (!sg.front) drawBandS(g, sg.pts, HP.w ?? 13);
        for (const c of hp.cups) if (c.z < -0.02) drawCupS(g, { x: c.x, y: c.y, r: (HP.r ?? 45) * (HP.farR ?? 0.92), rot: H.roll, open: c.open, side: c.side });
      },
      tail() {
        tail.slice().reverse().forEach((f) => {
          const sh = leaf2(f);
          plumage(g, blobPath2(sh), { base: 0.95, shade: 0.76, depth: f.w * 0.3, blur: f.w * 0.2, ...plu });
          ink2(g, sh.slice(1, 6), PX(1.1), gv(0.22, 0.85), { end: 0.2 });
        });
      },
      body() {
        if (!body) return;
        const bp = blobPath2(body), b = P.body;
        const at = (u, v) => add2([b.x || 0, b.y || 0], V.rot([b.a * u, b.b * v], b.rot));
        plumage(g, bp, { base: 0.96, shade: 0.74, depth: b.a * 0.3, blur: b.a * 0.1, ...plu });
        softShade(g, bp, (c) => {
          const q = at(0.1, 0.95);
          c.ellipse(q[0], q[1], b.a * 0.9, b.b * 0.35, b.rot, 0, TAU2);
        }, 0.6, 0.4, b.b * 0.2);
        softShade(g, bp, (c) => {
          const q = at(-0.55, 0.55);
          c.ellipse(q[0], q[1], b.a * 0.55, b.b * 0.55, b.rot, 0, TAU2);
        }, 0.6, 0.5, b.b * 0.25);
        if (dl > 0.25) {
          rimHatch(g, body, { light: Lu, flow: [0, 1], len: b.a * 0.08, step: 3.6, w: PX(0.8), color: hatchCol, seed: 12, density: 0.8, bend: 0.6 });
          const r = rng(19);
          g.save();
          g.beginPath();
          bp(g);
          g.clip();
          for (let i = 0; i < 140; i++) {
            const a = r() * TAU2, d = Math.sqrt(r());
            const q = at(Math.cos(a) * d, Math.sin(a) * d);
            const lower = Math.sin(a) * d, left = -Math.cos(a) * d;
            if (lower < -0.2 && r() < 0.7) continue;
            flick(g, q, nrm2([0.25 * (r() - 0.5), 1]), b.a * 0.1 * (0.6 + 0.8 * r()), PX(0.8), gv(0.45, 0.22 + 0.18 * Math.max(0, lower) + 0.12 * Math.max(0, left)), 0.15);
          }
          g.restore();
          for (let i = 0; i < 30; i++) {
            const a = r() * TAU2, d = Math.sqrt(r()) * 0.75;
            const c = at(Math.cos(a) * d, Math.sin(a) * d);
            const L = b.a * 0.05 * (0.7 + 0.6 * r());
            ink2(g, [add2(c, [-L, -L * 0.5]), c, add2(c, [L, -L * 0.5])], PX(0.8), gv(0.45, 0.4), { end: 0.2 });
          }
        }
        ink2(g, [...body, body[0]], PX(1.4), gv(0.28, 0.7), { end: 0.6, per: 3 });
      },
      head() {
        const hpth = blobPath2(H.out);
        if (P.tuft) {
          const tf = P.tuft, r = rng(tf.seed ?? 44), root = [H.x + tf.dx, H.y + tf.dy];
          for (let k = 0; k < (tf.n ?? 3); k++) {
            const f = (tf.n ?? 3) === 1 ? 0 : k / ((tf.n ?? 3) - 1) - 0.5;
            const d = [Math.cos(tf.ang + f * (tf.spread ?? 0.6)), Math.sin(tf.ang + f * (tf.spread ?? 0.6))];
            const L = tf.len * (1 - 0.35 * Math.abs(f)) * (0.9 + 0.2 * r()), w = tf.len * (tf.w ?? 0.34);
            const b0 = add2(root, mul2(perp2(d), -w / 2)), b1 = add2(root, mul2(perp2(d), w / 2)), tip = add2(root, mul2(d, L));
            const sh = [b0, add2(V.mix(b0, tip, 0.55), mul2(perp2(d), -w * 0.12)), tip, add2(V.mix(b1, tip, 0.55), mul2(perp2(d), w * 0.1)), b1];
            plumage(g, blobPath2(sh), { base: 0.97, shade: 0.88, depth: 3, blur: 2, ...plu });
            ink2(g, sh.slice(0, 4), PX(0.9), gv(0.3, 0.8), { end: 0.2 });
          }
        }
        plumage(g, hpth, { base: 0.96, shade: 0.76, depth: H.ry * 0.36, blur: H.ry * 0.1, keep: [0, H.ry * 0.5], ...plu });
        if (hp) {
          const nc = hp.cups.find((c) => c.z >= 0);
          if (nc) softShade(g, hpth, (c) => c.ellipse(nc.x - nc.side * (HP.r ?? 45) * 0.7, nc.y + 4, (HP.r ?? 45) * 0.5, (HP.r ?? 45) * 1.2, H.roll, 0, TAU2), 0.66, 0.45, 12);
        }
        if (dl > 0.25) rimHatch(g, H.out, { light: Lu, flow: [0, 1], len: H.ry * 0.14, step: 3, w: PX(0.8), color: hatchCol, seed: 22, density: 0.7, thr: 0.15 });
        ink2(g, [...H.out, H.out[0]], PX(1.4), gv(0.28, 0.65), { end: 0.6, per: 3 });
        if (P.disc ?? 1) {
          const top = H.P(E3.az ?? 0, (E3.el ?? -0.1) + 0.5, 1);
          const discs = [];
          for (const e of eyes) {
            if (e.nz < 0.25) continue;
            const sd = e.side, R = e.r;
            discs.push([
              [top.x, top.y],
              add2([e.x, e.y], V.rot([sd * R * 0.35 * e.sx, -R * 1.75], H.roll)),
              add2([e.x, e.y], V.rot([sd * R * 1.65 * e.sx, -R * 0.95], H.roll)),
              add2([e.x, e.y], V.rot([sd * R * 1.95 * e.sx, R * 0.55], H.roll)),
              add2([e.x, e.y], V.rot([sd * R * 1.2 * e.sx, R * 1.85], H.roll))
            ]);
          }
          if (dl > 0.3) {
            g.save();
            g.beginPath();
            hpth(g);
            g.clip();
            g.filter = `blur(${Math.max(0.5, PX(1.6) * PPU2).toFixed(2)}px)`;
            for (const q of discs) {
              const o = sampleCurve(q, 5);
              g.strokeStyle = gv(0.62, 0.5);
              g.lineWidth = PX(4);
              g.lineCap = "round";
              g.beginPath();
              o.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
              g.stroke();
            }
            g.filter = "none";
            g.restore();
          }
          for (const q of discs) ink2(g, q, PX(1.1), gv(0.35, 0.8), { end: 0.15, bias: 0.4 });
          const vis = eyes.filter((e) => e.nz >= 0.25);
          if (vis.length === 2) {
            const [a, b2] = vis, m2 = V.mix([a.x, a.y], [b2.x, b2.y], 0.5);
            const up = V.rot([0, -1], H.roll), R = (a.r + b2.r) / 2;
            const v0 = add2(m2, mul2(up, R * 1.05));
            for (const e of vis) {
              const toE = nrm2(sub2([e.x, e.y], m2));
              ink2(g, [add2(v0, mul2(toE, R * 0.1)), add2(add2(v0, mul2(toE, R * 0.45)), mul2(up, R * 0.18)), add2(add2(v0, mul2(toE, R * 0.75)), mul2(up, R * 0.24))], PX(0.8), gv(0.42, 0.55), { end: 0.2 });
            }
          }
        }
        for (const e of eyes) {
          if (e.nz < 0.12) continue;
          drawEye(g, { x: e.x, y: e.y, r: e.r, sx: e.sx, rot: H.roll, side: e.side, state: E3.state || "wide", look: E3.look, ringW: PX(2), ...E3.over || {}, ...e.side < 0 ? E3.left : E3.right });
          if (!(E3.state === "closed")) {
            const lk = (e.side < 0 ? E3.left?.look : E3.right?.look) || E3.look || [0, 0], pr = E3.over?.pupil ?? 0.3;
            const px = e.x + lk[0] * (1 - pr) * 0.95 * e.r * e.sx, py = e.y + lk[1] * (1 - pr) * 0.95 * e.r;
            g.fillStyle = gv(0.97, 0.95);
            g.beginPath();
            g.arc(px - e.r * pr * 0.3, py - e.r * pr * 0.35, Math.max(e.r * pr * 0.28, 0.5 / PPU2), 0, TAU2);
            g.fill();
          }
        }
        drawBeakS(g, { x: bq.x, y: bq.y, w: B2.w ?? 26, l: B2.l ?? 30, rot: H.roll + (B2.rot ?? 0), turn: B2.turn ?? H.yaw * 1.5, open: B2.open ?? 0 });
        if (P.plaster) {
          const pl = P.plaster, q = H.P(pl.az ?? 0, pl.el ?? 0.9, 1);
          if (q.nz > 0) drawPlaster(g, { x: q.x, y: q.y, w: pl.w ?? 36, h: pl.h ?? 11, rot: H.roll + (pl.rot ?? 0), sx: 0.4 + 0.6 * Math.max(0, Math.cos(H.yaw - (pl.az ?? 0))) });
        }
        if (P.freckles !== false) {
          for (const e of eyes) {
            if (e.nz < 0.5) continue;
            const c = add2([e.x, e.y], V.rot([-e.side * e.r * 0.9 * e.sx, e.r * 1.35], H.roll));
            g.fillStyle = gv(0.4, 0.6);
            for (const [dx, dy] of [[0, 0], [-3.5, 2.5]]) {
              g.beginPath();
              g.arc(c[0] + dx * e.side, c[1] + dy, Math.max(1.1, 0.6 / PPU2), 0, TAU2);
              g.fill();
            }
          }
        }
      },
      nearHP() {
        if (!hp) return;
        for (const sg of hp.segs) if (sg.front) drawBandS(g, sg.pts, HP.w ?? 13);
        for (const c of hp.cups) if (c.z >= -0.02) drawCupS(g, { x: c.x, y: c.y, r: HP.r ?? 45, rot: H.roll + (HP.cupRot ?? 0), open: HP.open ?? c.open, side: c.side });
      }
    };
    wings.forEach((G2, i) => {
      layers["wing:" + i] = () => paintWing(g, G2, plu, dl, i + 1);
    });
    (P.feet || []).forEach((f, i) => {
      layers["foot:" + i] = () => drawFootS(g, f);
    });
    const order = P.order || ORDER;
    for (const name of order) if (layers[name]) layers[name]();
    PPU2 = 1;
    setPPU(1);
    if (P.tone === true && dl > 0.3) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      screentone(cv, { pitch: 4.2 * res });
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    return { canvas: cv, x: x0, y: y0, w: x1 - x0, h: y1 - y0, toF, H, eyes, bq, cups: hp ? hp.cups : [] };
  }
  var SCR = null;
  var SCR2 = null;
  var SOFT_PX = 0.25;
  function drawOwlS17(ctx, P) {
    if (!SCR) SCR = document.createElement("canvas");
    const L = owlS17Layer(P, SCR);
    const bl2 = P.blur ? Math.hypot(P.blur[0], P.blur[1]) : 0;
    if (bl2 > 1) {
      if (!SCR2) SCR2 = document.createElement("canvas");
      const pad = Math.ceil(bl2 / 2) + 2, w = L.canvas.width + 2 * pad, h = L.canvas.height + 2 * pad;
      if (SCR2.width !== w || SCR2.height !== h) {
        SCR2.width = w;
        SCR2.height = h;
      }
      const g = SCR2.getContext("2d");
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 1;
      g.clearRect(0, 0, w, h);
      g.globalCompositeOperation = "lighter";
      const n = 7, wts = [];
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1) - 0.5;
        wts.push(Math.exp(-f * f * 6));
      }
      const ws = wts.reduce((a, b) => a + b, 0);
      const sx = L.canvas.width / L.w;
      for (let i = 0; i < n; i++) {
        const f = i / (n - 1) - 0.5;
        g.globalAlpha = wts[i] / ws;
        g.drawImage(L.canvas, pad + P.blur[0] * f * sx, pad + P.blur[1] * f * sx);
      }
      g.globalCompositeOperation = "source-over";
      g.globalAlpha = 1;
      ctx.save();
      ctx.filter = `blur(${SOFT_PX}px)`;
      ctx.drawImage(SCR2, L.x - pad / sx, L.y - pad / sx, w / sx, h / sx);
      ctx.restore();
    } else {
      ctx.save();
      ctx.filter = `blur(${SOFT_PX}px)`;
      ctx.drawImage(L.canvas, L.x, L.y, L.w, L.h);
      ctx.restore();
    }
    return L;
  }

  // src/shots/s17/steam.js
  var STEAM_BOX = [808, 352, 872, 467];
  var MUG_TOP = 466;
  function drawSteam(ctx, t, bg = "#030303") {
    const [x0, y0, x1, y1] = STEAM_BOX;
    ctx.save();
    ctx.fillStyle = bg;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    const td = t;
    for (let i = 0; i < 2; i++) {
      const top = 98 - 6 * i, lam = 52, ph = 0.4 + 0.25 * i;
      const pts = [];
      for (let h = 0; h <= top; h += 2) {
        const f = Math.min(1, h / top);
        const A2 = 3 + 9 * Math.pow(f, 0.8);
        const x = 834 + 8.5 * i + A2 * Math.sin(2 * Math.PI * h / lam - 3.4 * td + ph) + 3 * Math.sin(0.7 * td + 0.4 * i) * f;
        pts.push([x, MUG_TOP - h]);
      }
      const q = sampleCurve(pts, 2);
      const n = q.length;
      const lowEnd = Math.floor(n * 0.28);
      const brk = ((0.35 * td + 0.5 * i) % 1 + 1) % 1;
      const seg = (a, b, alpha, wk) => {
        const s = q.slice(a, b);
        if (s.length > 3) taper(ctx, s, (u) => wk * 3.2 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.15 + 0.85 * u)), 0.45), `rgba(215,215,215,${alpha})`);
      };
      const d0 = Math.floor(lowEnd * (0.1 + 0.3 * brk)), d1 = Math.floor(lowEnd * (0.55 + 0.25 * brk));
      seg(d0, d0 + 4, 0.45, 0.7);
      seg(d1, Math.min(lowEnd, d1 + 5), 0.6, 0.8);
      seg(lowEnd, n, 0.9, 1);
    }
    ctx.restore();
  }

  // src/shots/s17.js
  var Z = [
    [-0.04, 2.1718],
    [0, 1.9529],
    [0.04, 1.7763],
    [0.08, 1.6346],
    [0.12, 1.5126],
    [0.16, 1.4111],
    [0.2, 1.3299],
    [0.24, 1.2619],
    [0.28, 1.207],
    [0.32, 1.1592],
    [0.36, 1.122],
    [0.4, 1.0911],
    [0.44, 1.0673],
    [0.48, 1.0471],
    [0.52, 1.0319],
    [0.56, 1.0204],
    [0.6, 1.0124],
    [0.64, 1.0066],
    [0.68, 1.0029],
    [0.72, 1]
  ];
  var FX = 865;
  var FY = 341;
  function zoomAt(t) {
    if (t <= Z[0][0]) return Z[0][1];
    for (let i = 1; i < Z.length; i++) if (t <= Z[i][0]) {
      const [a, va] = Z[i - 1], [b, vb] = Z[i];
      return va + (vb - va) * ((t - a) / (b - a));
    }
    return 1;
  }
  function eyeShift(t) {
    return t < 52.78 ? 0 : t < 52.82 ? -1 : t < 52.86 ? -1.5 : t < 52.9 ? -2 : t < 52.94 ? -2.5 : -3;
  }
  function eyeLid(t) {
    return t < 52.86 ? 0 : 1;
  }
  var TONE = [[0, 0], [12, 11], [72, 70], [147, 152], [201, 205], [237, 240], [255, 255]];
  function toneMatch(g, w, h) {
    const lut = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) {
      let i = 1;
      while (i < TONE.length - 1 && TONE[i][0] < v) i++;
      const [a, va] = TONE[i - 1], [b, vb] = TONE[i];
      lut[v] = Math.round(va + (vb - va) * (v - a) / (b - a));
    }
    const img = g.getImageData(0, 0, w, h), d = img.data;
    for (let k = 0; k < d.length; k += 4) {
      d[k] = lut[d[k]];
      d[k + 1] = lut[d[k + 1]];
      d[k + 2] = lut[d[k + 2]];
    }
    g.putImageData(img, 0, 0);
  }
  function finish(c, scale) {
    const o = document.createElement("canvas");
    o.width = c.width;
    o.height = c.height;
    const og = o.getContext("2d", { willReadFrequently: true });
    og.filter = `blur(${(0.5 * scale).toFixed(2)}px)`;
    og.drawImage(c, 0, 0);
    og.filter = "none";
    c.width = c.height = 0;
    toneMatch(og, o.width, o.height);
    return o;
  }
  var EYES = /* @__PURE__ */ new Map();
  function eyePatch(dx, lid) {
    const key = dx + ":" + lid;
    let c = EYES.get(key);
    if (!c) {
      const p = s17EyePatch(dx, lid);
      const src = document.createElement("canvas");
      src.width = p.canvas.width;
      src.height = p.canvas.height;
      src.getContext("2d").drawImage(p.canvas, 0, 0);
      const f = finish(src, 1);
      c = document.createElement("canvas");
      c.width = EYE_BOX[2] - EYE_BOX[0];
      c.height = EYE_BOX[3] - EYE_BOX[1];
      c.getContext("2d").drawImage(f, EYE_PAD, EYE_PAD, c.width, c.height, 0, 0, c.width, c.height);
      EYES.set(key, c);
    }
    return c;
  }
  var PAGES = /* @__PURE__ */ new Map();
  function s17Page(scale) {
    let c = PAGES.get(scale);
    if (!c) {
      c = document.createElement("canvas");
      c.width = Math.round(PAGE_W * scale);
      c.height = Math.round(PAGE_H * scale);
      const g = c.getContext("2d");
      g.scale(scale, scale);
      g.fillStyle = SOKO_BG;
      g.fillRect(0, 0, PAGE_W, PAGE_H);
      g.drawImage(s17IllCanvas({ scale }), 0, 0, PAGE_W, PAGE_H);
      drawSokoHeadline(g);
      drawSokoCounter(g, { counter: "000.0" });
      drawSokoRail(g);
      c = finish(c, scale);
      PAGES.set(scale, c);
    }
    return c;
  }
  var SHUTTER = 5e-3;
  var NBLUR = 3;
  var CS = 2;
  var COMP = null;
  function composite(t, page2) {
    if (!COMP) {
      COMP = document.createElement("canvas");
      COMP.width = PAGE_W * CS;
      COMP.height = PAGE_H * CS;
    }
    const g = COMP.getContext("2d");
    g.setTransform(CS, 0, 0, CS, 0, 0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = "source-over";
    g.imageSmoothingQuality = "high";
    g.drawImage(page2, 0, 0, PAGE_W, PAGE_H);
    drawSteam(g, drawTick(t));
    const p = owlFrame(t);
    if (p) drawOwlS17(g, { ...p, res: CS });
    g.setTransform(1, 0, 0, 1, 0, 0);
    return COMP;
  }
  function openBlur(local) {
    return local < 0.02 ? 1.5 : local < 0.06 ? 1 : local < 0.1 ? 0.5 : 0;
  }
  var SOFT = null;
  function softCanvas() {
    if (!SOFT) {
      SOFT = document.createElement("canvas");
      SOFT.width = PAGE_W;
      SOFT.height = PAGE_H;
    }
    return SOFT.getContext("2d");
  }
  var shot = {
    draw(ctx, local, t0) {
      const t = Math.ceil(t0 * 25 - 0.01) / 25;
      local = t - 47.84;
      const z = zoomAt(local);
      if (local < 0.7) {
        const comp = composite(t, s17Page(CS));
        const sig = openBlur(local);
        const dst = sig > 0 ? softCanvas() : ctx;
        if (sig > 0) {
          dst.setTransform(1, 0, 0, 1, 0, 0);
          dst.globalAlpha = 1;
          dst.fillStyle = "#000";
          dst.fillRect(0, 0, PAGE_W, PAGE_H);
        }
        dst.save();
        dst.imageSmoothingQuality = "high";
        for (let i = 0; i < NBLUR; i++) {
          const zi = zoomAt(local + (i / (NBLUR - 1) - 0.5) * SHUTTER);
          dst.setTransform(zi, 0, 0, zi, FX - zi * FX, FY - zi * FY);
          dst.globalAlpha = 1 / (i + 1);
          dst.drawImage(comp, 0, 0, PAGE_W, PAGE_H);
        }
        dst.restore();
        if (sig > 0) {
          ctx.save();
          ctx.filter = `blur(${sig}px)`;
          ctx.drawImage(SOFT, 0, 0);
          ctx.restore();
        }
        return;
      }
      if (COMP) {
        COMP.width = COMP.height = 0;
        COMP = null;
      }
      if (SOFT) {
        SOFT.width = SOFT.height = 0;
        SOFT = null;
      }
      const page = s17Page(1);
      ctx.save();
      ctx.translate(FX, FY);
      ctx.scale(z, z);
      ctx.translate(-FX, -FY);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(page, 0, 0, PAGE_W, PAGE_H);
      drawSteam(ctx, drawTick(t));
      const ex = eyeShift(t);
      if (ex) ctx.drawImage(eyePatch(ex, eyeLid(t)), EYE_BOX[0], EYE_BOX[1]);
      ctx.restore();
      const p = owlFrame(t);
      if (p) {
        const q = { ...p, x: FX + z * (p.x - FX), y: FY + z * (p.y - FY), s: p.s * z };
        if (p.blur) q.blur = [p.blur[0] * z, p.blur[1] * z];
        drawOwlS17(ctx, q);
      }
    },
    release() {
      PAGES.clear();
      EYES.clear();
      releaseS17Ill();
      if (COMP) {
        COMP.width = COMP.height = 0;
        COMP = null;
      }
    }
  };

  // snapshots/s17-lab/shotlab.js
  (async () => {
    await Promise.all(["900 100px Archivo", "400 20px Geist", "300 20px Geist", "500 20px 'Geist Mono'"].map((f) => document.fonts.load(f)));
    await document.fonts.ready;
    const L = window.LAB, W = 2206, H = 946;
    const [x0, y0, x1, y1] = L.crop || [0, 0, W, H];
    const sc = L.scale, tw = Math.round((x1 - x0) * sc), th = Math.round((y1 - y0) * sc), cols = L.cols;
    const paint = document.createElement("canvas");
    paint.width = W;
    paint.height = H;
    const g = paint.getContext("2d");
    const out = document.createElement("canvas");
    out.width = W;
    out.height = H;
    const grade = createPost(out);
    const sheet = document.getElementById("c");
    sheet.width = tw * cols;
    sheet.height = th * Math.ceil(L.times.length / cols);
    const sg = sheet.getContext("2d");
    sg.fillStyle = "#000";
    sg.fillRect(0, 0, sheet.width, sheet.height);
    const T0 = performance.now();
    const times = [];
    L.times.forEach((t, i) => {
      const a = performance.now();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.fillStyle = "#000";
      g.fillRect(0, 0, W, H);
      g.save();
      shot.draw(g, t - 47.84, t);
      g.restore();
      if (L.grade !== false) grade(paint, t, { fade: 1 });
      times.push(Math.round(performance.now() - a));
      const c = i % cols, r = Math.floor(i / cols);
      sg.drawImage(L.grade !== false ? out : paint, x0, y0, x1 - x0, y1 - y0, c * tw, r * th, tw, th);
    });
    document.title = "ms " + times.join(",");
    const pre = document.createElement("pre");
    pre.id = "o";
    pre.textContent = JSON.stringify(times);
    pre.style.display = "none";
    document.body.appendChild(pre);
  })();
})();
