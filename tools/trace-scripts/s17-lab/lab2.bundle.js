(() => {
  // ../../src/lib/post.js
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
    const tex2 = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex2);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex2, 0);
    return { tex: tex2, fb, w, h };
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

  // ../../src/lib/rng.js
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
  var clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;

  // ../../src/lib/ink.js
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

  // ../../src/lib/paths.js
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

  // ../../src/lib/sokoIll.js
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
  function gaussBlurRGBA(d, w, h, sigma) {
    if (!(sigma > 0.05)) return d;
    const r = Math.max(1, Math.ceil(sigma * 3)), k = new Float32Array(2 * r + 1);
    let sum = 0;
    for (let i = -r; i <= r; i++) {
      k[i + r] = Math.exp(-0.5 * (i * i) / (sigma * sigma));
      sum += k[i + r];
    }
    for (let i = 0; i < k.length; i++) k[i] /= sum;
    const tmp = new Float32Array(w * h * 4);
    for (let y = 0; y < h; y++) {
      const row = y * w * 4;
      for (let x = 0; x < w; x++) {
        let a0 = 0, a1 = 0, a2 = 0, a3 = 0;
        const lo = Math.max(-r, -x), hi = Math.min(r, w - 1 - x);
        for (let i = lo; i <= hi; i++) {
          const kk = k[i + r], j = row + (x + i) * 4;
          a0 += d[j] * kk;
          a1 += d[j + 1] * kk;
          a2 += d[j + 2] * kk;
          a3 += d[j + 3] * kk;
        }
        const o = row + x * 4;
        tmp[o] = a0;
        tmp[o + 1] = a1;
        tmp[o + 2] = a2;
        tmp[o + 3] = a3;
      }
    }
    const W4 = w * 4;
    for (let y = 0; y < h; y++) {
      const lo = Math.max(-r, -y), hi = Math.min(r, h - 1 - y);
      for (let x = 0; x < w; x++) {
        let a0 = 0, a1 = 0, a2 = 0, a3 = 0;
        const c = x * 4;
        for (let i = lo; i <= hi; i++) {
          const kk = k[i + r], j = (y + i) * W4 + c;
          a0 += tmp[j] * kk;
          a1 += tmp[j + 1] * kk;
          a2 += tmp[j + 2] * kk;
          a3 += tmp[j + 3] * kk;
        }
        const o = y * W4 + c;
        d[o] = a0;
        d[o + 1] = a1;
        d[o + 2] = a2;
        d[o + 3] = a3;
      }
    }
    return d;
  }
  function blurCanvas(c, sigma) {
    if (!(sigma > 0.05)) return c;
    const g = c.getContext("2d", { willReadFrequently: true });
    const id = g.getImageData(0, 0, c.width, c.height);
    gaussBlurRGBA(id.data, c.width, c.height, sigma);
    g.putImageData(id, 0, 0);
    return c;
  }
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
    const id = a.getImageData(0, 0, w, h);
    gaussBlurRGBA(id.data, w, h, blur * Math.hypot(m.a, m.b));
    b.putImageData(id, 0, 0);
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
  var hI = (a, b, s) => {
    let h = Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(s | 0, 1442695041);
    h = Math.imul(h ^ h >>> 13, 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  function vn2(x, y, s) {
    const ix = Math.floor(x), iy = Math.floor(y);
    let fx = x - ix, fy = y - iy;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);
    const a = hI(ix, iy, s), b = hI(ix + 1, iy, s), c = hI(ix, iy + 1, s), d = hI(ix + 1, iy + 1, s);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }
  function invBil(px, py, q) {
    const [a, b, c, d] = q;
    const ex = b[0] - a[0], ey = b[1] - a[1], fx = d[0] - a[0], fy = d[1] - a[1];
    const gx = a[0] - b[0] + c[0] - d[0], gy = a[1] - b[1] + c[1] - d[1], hx = px - a[0], hy = py - a[1];
    const k2 = gx * fy - gy * fx, k1 = ex * fy - ey * fx + hx * gy - hy * gx, k0 = hx * ey - hy * ex;
    if (Math.abs(k2) < 1e-3) {
      const v2 = -k0 / k1;
      return [(hx - fx * v2) / (ex + gx * v2 || 1e-6), v2];
    }
    let w = k1 * k1 - 4 * k0 * k2;
    if (w < 0) w = 0;
    w = Math.sqrt(w);
    const ik2 = 0.5 / k2;
    let v = (-k1 - w) * ik2, u = (hx - fx * v) / (ex + gx * v || 1e-6);
    if (u < -0.01 || u > 1.01 || v < -0.01 || v > 1.01) {
      v = (-k1 + w) * ik2;
      u = (hx - fx * v) / (ex + gx * v || 1e-6);
    }
    return [u, v];
  }
  var EM = null;
  var EV = null;
  var EO = null;
  function scr2(c, w, h) {
    if (!c || c.width < w || c.height < h) {
      const n = document.createElement("canvas");
      n.width = Math.max(w, c ? c.width : 0, 64);
      n.height = Math.max(h, c ? c.height : 0, 64);
      return n;
    }
    return c;
  }
  var shapePath = (shape, smooth) => Array.isArray(shape) ? smooth ? (c) => smoothPath(c, shape, true) : (c) => {
    c.moveTo(shape[0][0], shape[0][1]);
    for (let i = 1; i < shape.length; i++) c.lineTo(shape[i][0], shape[i][1]);
    c.closePath();
  } : shape;
  function tex(g, shape, val, ang, o = {}) {
    const {
      per = 5,
      wExp = 0.8,
      soft: soft2 = 1,
      wav = 0.1,
      wavL = 10,
      wj = 0.22,
      lj = 0.12,
      brk = 0.3,
      brkL = 8,
      bg = 0.05,
      lum = 0.95,
      gain = 1,
      gamma = 1,
      seed = 1,
      alpha = 1,
      smooth = false,
      coord = null,
      vfn = null,
      maxW = 0.97,
      over = false
    } = o;
    const path = shapePath(shape, smooth);
    const bb = Array.isArray(shape) ? bboxOf(shape, 2) : shape.bb;
    const m = g.getTransform(), sx = m.a, sy = m.d;
    const X0 = Math.max(0, Math.floor(bb[0] * sx + m.e)), Y0 = Math.max(0, Math.floor(bb[1] * sy + m.f));
    const X1 = Math.min(g.canvas.width, Math.ceil(bb[2] * sx + m.e)), Y1 = Math.min(g.canvas.height, Math.ceil(bb[3] * sy + m.f));
    const w = X1 - X0, h = Y1 - Y0;
    if (w <= 0 || h <= 0) return;
    EM = scr2(EM, w, h);
    EO = scr2(EO, w, h);
    const mc = EM.getContext("2d", { willReadFrequently: true });
    mc.setTransform(1, 0, 0, 1, 0, 0);
    mc.clearRect(0, 0, w, h);
    mc.setTransform(sx, 0, 0, sy, m.e - X0, m.f - Y0);
    mc.beginPath();
    path(mc);
    mc.fillStyle = "#fff";
    mc.fill();
    const M = mc.getImageData(0, 0, w, h).data;
    let V2 = null;
    if (typeof val === "function") {
      EV = scr2(EV, w, h);
      const vc = EV.getContext("2d", { willReadFrequently: true });
      vc.setTransform(1, 0, 0, 1, 0, 0);
      vc.globalAlpha = 1;
      vc.globalCompositeOperation = "source-over";
      vc.filter = "none";
      vc.fillStyle = "#000";
      vc.fillRect(0, 0, w, h);
      vc.setTransform(sx, 0, 0, sy, m.e - X0, m.f - Y0);
      vc.save();
      val(vc, bb);
      vc.restore();
      V2 = vc.getImageData(0, 0, w, h).data;
    }
    const vconst = typeof val === "number" ? val : 0;
    const oc = EO.getContext("2d", { willReadFrequently: true });
    const out = oc.createImageData(w, h), O = out.data;
    const ca = Math.cos(ang || 0), sa = Math.sin(ang || 0);
    const aa = Math.max(0.02, soft2 / (per * sx));
    const L255 = lum * 255;
    for (let j = 0; j < h; j++) {
      const py = (Y0 + j + 0.5 - m.f) / sy;
      for (let i = 0; i < w; i++) {
        const k = (j * w + i) * 4, ma = M[k + 3];
        if (!ma) continue;
        const px = (X0 + i + 0.5 - m.e) / sx;
        let v = vfn ? vfn(px, py) : V2 ? V2[k] / 255 : vconst;
        v *= gain;
        if (gamma !== 1 && v > 0) v = Math.pow(v, gamma);
        if (v > 1) v = 1;
        let res = 0, cov = 0;
        if (v > 3e-3) {
          let s, t;
          if (coord) {
            const r = coord(px, py);
            s = r[0];
            t = r[1];
          } else {
            s = -sa * px + ca * py;
            t = ca * px + sa * py;
          }
          let c = s / per;
          if (wav) c += wav * (vn2(t / (per * wavL), c * 0.3, seed) - 0.5) * 2;
          const row = Math.floor(c), rh = hI(row, 17, seed), rh2 = hI(row, 29, seed);
          let wv = Math.pow(v, wExp) * (1 + wj * (rh - 0.5) * 2);
          if (brk) {
            const bn = vn2(t / (per * brkL) + rh * 37, row * 1.7, seed + 3);
            wv *= 1 - brk * (1 - v) * sstep(0.55, 0.9, bn);
          }
          if (wv > maxW) wv = maxW;
          const f = Math.abs(c - row - 0.5) * 2;
          const lo = Math.max(f - aa, -wv), hi = Math.min(f + aa, wv);
          cov = hi > lo ? (hi - lo) / (2 * aa) : 0;
          if (cov > 1) cov = 1;
          const b = Math.min(1, v / Math.max(0.03, wv)) * (1 - lj * rh2);
          res = over ? b : cov * b + (1 - cov) * bg * v;
        }
        const lv = res * L255;
        O[k] = lv;
        O[k + 1] = lv;
        O[k + 2] = lv;
        O[k + 3] = (over ? cov : 1) * ma * alpha;
      }
    }
    oc.putImageData(out, 0, 0);
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(EO, 0, 0, w, h, X0, Y0, w, h);
    g.restore();
  }
  var BV = null;
  function brush(g, shape, val, angF, o = {}) {
    const { len = 14, w = 2.2, gap = 2, seed = 1, jit = 0.25, base = 0.45, lj = 0.14, smooth = false, blur = 0, gain = 1, dark = 0 } = o;
    const path = shapePath(shape, smooth);
    const bb = Array.isArray(shape) ? bboxOf(shape, 2) : shape.bb;
    const X0 = Math.floor(bb[0]), Y0 = Math.floor(bb[1]), W = Math.ceil(bb[2]) - X0, H = Math.ceil(bb[3]) - Y0;
    if (W <= 0 || H <= 0) return;
    BV = scr2(BV, W, H);
    const vc = BV.getContext("2d", { willReadFrequently: true });
    vc.setTransform(1, 0, 0, 1, 0, 0);
    vc.globalAlpha = 1;
    vc.globalCompositeOperation = "source-over";
    vc.filter = "none";
    vc.fillStyle = "#000";
    vc.fillRect(0, 0, W, H);
    vc.translate(-X0, -Y0);
    vc.save();
    if (typeof val === "number") {
      vc.fillStyle = grey(val);
      vc.fillRect(X0, Y0, W, H);
    } else val(vc, bb);
    vc.restore();
    const V2 = vc.getImageData(0, 0, W, H).data;
    const at = (x, y) => {
      const i = Math.min(W - 1, Math.max(0, Math.round(x - X0))), j = Math.min(H - 1, Math.max(0, Math.round(y - Y0)));
      return Math.min(1, V2[(j * W + i) * 4] / 255 * gain);
    };
    const af = typeof angF === "number" ? () => angF : angF;
    g.save();
    g.beginPath();
    path(g);
    g.clip();
    g.save();
    g.globalAlpha = 1;
    g.drawImage(BV, 0, 0, W, H, X0, Y0, W, H);
    g.fillStyle = `rgba(0,0,0,${1 - base})`;
    g.fillRect(X0, Y0, W, H);
    g.restore();
    const r = rng(seed);
    for (let y = Y0; y < Y0 + H; y += gap) {
      for (let x = X0 + r() * gap * 2; x < X0 + W; x += gap * (1.4 + r() * 0.8)) {
        const px = x + (r() - 0.5) * gap, py = y + (r() - 0.5) * gap;
        const v = at(px, py);
        if (v < 0.03) continue;
        const a = af(px, py) + (r() - 0.5) * jit, L = len * (0.55 + r() * 0.9), c = Math.cos(a) * L / 2, sn = Math.sin(a) * L / 2;
        const bend = (r() - 0.5) * L * 0.08, nx = -Math.sin(a) * bend, ny = Math.cos(a) * bend;
        const pts = [[px - c, py - sn], [px - c * 0.33 + nx, py - sn * 0.33 + ny], [px + c * 0.33 + nx, py + sn * 0.33 + ny], [px + c, py + sn]];
        let lv = clamp2(Math.pow(v, 0.85) * (1 + lj * (r() - 0.5) * 2));
        const ww = w * (0.7 + r() * 0.6) * (0.55 + 0.45 * v);
        if (dark && r() < dark) lv *= 0.15;
        taper(g, pts, (u) => ww * Math.pow(Math.sin(PI * clamp2(u, 0.02, 0.98)), 0.6), grey(lv));
      }
    }
    g.restore();
  }
  var quadFn = (q, fn) => (x, y) => {
    const [u, v] = invBil(x, y, q);
    return fn(clamp2(u), clamp2(v));
  };
  function stripes(g, q, { per = 6.2, cov = 0.5, lum = 0.92, seed = 1, dir = "v", jit = 0.3, brk = 0.5, wav = 0.5, lumJit = 0.22, base = true, wExp = 1 } = {}) {
    const [A2, B2, Cc, D2] = q;
    const ang = dir === "v" ? Math.atan2(D2[1] - A2[1] + Cc[1] - B2[1], D2[0] - A2[0] + Cc[0] - B2[0]) : Math.atan2(B2[1] - A2[1] + Cc[1] - D2[1], B2[0] - A2[0] + Cc[0] - D2[0]);
    const cf = typeof cov === "number" ? () => cov : cov;
    tex(g, q, null, ang, { per, seed, vfn: quadFn(q, (u, v) => Math.min(1, cf(u, v) * lum * (1 + 0.14 * brk))), lum: 1, brk: brk * 0.75, brkL: 5, wav: 0.1 + wav * 0.2, wavL: 7, wj: 0.2 + jit * 0.5, lj: lumJit * 1.1, over: !base, wExp, bg: 0.02 });
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
    stripes(g, [[18, 244], [84, 258], [84, 302], [16, 316]], { cov: bl(0.33, 0.13, 0.13, 0.3), lum: 1, seed: 13 });
    ink(g, [[18, 244], [84, 258]], 1.6, BLK, { seed: 131 });
    stripes(g, [[16, 317], [219, 289], [219, 420], [14, 420]], { cov: fadeEdges(bl(0.22, 0.32, 0.26, 0.16), 0.04, 0.02), lum: 0.6, seed: 14 });
    ink(g, [[16, 317], [219, 289]], 1.8, BLK, { seed: 141 });
    stripes(g, [[100, 306], [136, 303], [136, 344], [100, 346]], { cov: bl(0.23, 0.25, 0.29, 0.29), lum: 1, seed: 15 });
    ink(g, [[100, 346], [136, 344]], 1.3, grey(0.75), { seed: 151 });
    ink(g, [[130, 281], [181, 278], [182, 298], [131, 300]], 1.3, "rgba(215,215,205,0.6)", { closed: true, seed: 16 });
    stripes(g, [[219, 289], [320, 319], [322, 400], [219, 400]], { cov: bl(0.5, 0.44, 0.49, 0.8), lum: 1, seed: 17, per: 6.2 });
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
    const half = [[0.02, 0], [-0.06, 0.16], [-0.02, 0.33], [0.14, 0.42], [0.36, 0.38], [0.6, 0.26], [0.82, 0.12], [1, 0]];
    const loc = [...half, ...half.slice(1, -1).reverse().map(([u, w]) => [u, -w])];
    const pts = loc.map(([u, w]) => [x + u * s * Math.cos(ang) - w * s * Math.sin(ang), y + u * s * Math.sin(ang) + w * s * Math.cos(ang)]);
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    const litSide = nx < 0 ? 1 : -1;
    blobPath(g, pts);
    const gr = g.createLinearGradient(x - nx * s * 0.4 * litSide, y - ny * s * 0.4 * litSide, x + nx * s * 0.4 * litSide, y + ny * s * 0.4 * litSide);
    gr.addColorStop(0, grey(v));
    gr.addColorStop(0.46, grey(v * 0.85));
    gr.addColorStop(0.54, grey(v * 0.45));
    gr.addColorStop(1, grey(v * 0.3));
    g.fillStyle = gr;
    g.fill();
    g.strokeStyle = "rgba(6,6,6,0.9)";
    g.lineWidth = 1.1;
    g.stroke();
    const tip = [x + s * Math.cos(ang), y + s * Math.sin(ang)];
    curve(g, [[x, y], P2([x, y], tip, 0.5), P2([x, y], tip, 0.92)], Math.max(0.8, s * 0.045), grey(0.9, 0.7), { seed, ends: 0.3 });
    for (let k = 1; k <= 3; k++) for (const sd of [-1, 1]) {
      const a = P2([x, y], tip, 0.12 + k * 0.2), l = s * (0.24 - k * 0.04);
      ink(g, [a, [a[0] + Math.cos(ang + sd * 0.9) * l, a[1] + Math.sin(ang + sd * 0.9) * l]], 0.7, grey(0.85, 0.45), { seed: seed + k * 3 + sd });
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
    stripes(g, [[375, 410], [430, 409], [431, 482], [376, 484]], { cov: bl(0.33, 0.32, 0.26, 0.36), lum: 1, seed: 64 });
    stripes(g, [[430, 409], [503, 408], [506, 480], [431, 482]], { cov: fadeEdges(bl(0.75, 0.7, 0.55, 0.6), 0.02, 0.05), lum: 0.88, seed: 641, per: 3.2, brk: 0.2 });
    fillPoly(g, [[431, 409], [452, 409], [452, 433], [431, 434]], "#050505");
    fillPoly(g, [[477, 410], [498, 410], [498, 432], [477, 432]], "#070707");
    ink(g, [[431, 409], [452, 409], [452, 433], [431, 434]], 1.2, "rgba(220,220,215,0.75)", { closed: true, seed: 65 });
    ink(g, [[452, 434], [452, 482]], 2, grey(0.95), { seed: 651 });
    stripes(g, [[243, 423], [297, 425], [297, 560], [243, 560]], { cov: fadeEdges(bl(0.12, 0.16, 0.1, 0.08), 0.03, 0.02), lum: 0.6, seed: 66 });
    ink(g, [[247, 432], [247, 500], [290, 500]], 1.6, grey(0.55), { seed: 661 });
    face(g, [[297, 425], [387, 423], [388, 560], [297, 560]], [0.88, 0.62, 0.45, 0.66], "v", { seed: 67 });
    ink(g, [[230, 423], [387, 422]], 1.6, BLK, { seed: 671 });
  }
  function keyboardLeft(g) {
    fillPoly(g, [[334, 474], [370, 470], [370, 560], [334, 560]], grey(0.04));
    ink(g, [[334, 474], [370, 470]], 1.3, grey(0.4), { seed: 701 });
    brush(g, [[370, 470], [508, 476], [508, 560], [370, 560]], (v) => {
      v.fillStyle = lg(v, 370, 470, 508, 560, [[0, 0.5], [0.6, 0.38], [1, 0.2]]);
      v.fillRect(368, 468, 142, 94);
    }, 0.05, { len: 18, w: 2, gap: 1.6, seed: 702, jit: 0.1, base: 0.8 });
    ink(g, [[370, 470], [508, 476], [508, 560], [370, 560]], 1.6, BLK, { closed: true, seed: 703 });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) {
      const x = 394 + c * 16.5, y = 490 + r * 25 + c * 0.3;
      dot(g, x + 0.5, y + 1.5, 6.4, grey(0.02));
      ring(g, x, y, 5, 1.2, grey(0.4, 0.9));
      soft(g, E(x - 1, y - 1.5, 3, 2.4, 0), grey(0.5));
      dot(g, x - 1.8, y - 2.4, 1.3, grey(0.95));
    }
    for (const [x, dx, dy] of [[411, 8, 0], [429, 14, 10], [446, 22, -4], [477, 30, 6], [493, 10, 20]]) cable(g, [[x, 546], [x + 2, 562], [x + dx * 0.5, 594 + dy], [x + dx, 640 + dy], [x + dx + 6, 700]], 2.2, x, 0.6);
    fillPoly(g, [[172, 558], [428, 556], [430, 600], [426, 626], [236, 626], [190, 624], [174, 602]], grey(0.03));
    face(g, [[174, 558], [428, 556], [428, 572], [236, 574]], [0.1, 0.18, 0.15, 0.14], "h", { per: 3, seed: 704 });
    for (let i = 0; i < 17; i++) {
      const x = 186 + i * 14.4, y = 569 - i * 0.1;
      fillPoly(g, [[x - 3.2, y - 7], [x + 3.2, y - 7], [x + 3.2, y + 2], [x - 3.2, y + 2]], grey(0.1));
      ink(g, [[x - 2.2, y - 6], [x - 2.2, y + 1]], 1, grey(0.5, 0.7), { seed: 760 + i });
      g.fillStyle = grey(0.75);
      g.beginPath();
      g.ellipse(x, y - 7, 3.2, 1.3, 0, 0, PI * 2);
      g.fill();
    }
    const K = [[236, 576], [424, 574], [424, 598], [238, 600]], at = (u, v) => bil(K, u, v), nw = 14;
    fillPoly(g, K, grey(0.03));
    for (let i = 0; i < nw; i++) {
      const u0 = (i + 0.08) / nw, u1 = (i + 0.92) / nw, lit = 0.62 + 0.3 * Math.sin(PI * clamp2(i / nw * 1.1));
      soft(g, pth([at(u0, 0.05), at(u1, 0.05), at(u1, 1), at(u0, 1)], false), lg(g, 0, 574, 0, 598, [[0, grey(lit * 0.6)], [0.5, grey(lit)], [1, grey(lit * 0.95)]]));
    }
    for (let i = 0; i < nw - 1; i++) if ([0, 1, 3, 4, 5].includes((i + 2) % 7)) {
      const u = (i + 1) / nw, w = 0.3 / nw;
      fillPoly(g, [at(u - w, 0), at(u + w, 0), at(u + w, 0.6), at(u - w, 0.6)], grey(0.02));
      ink(g, [at(u - w * 0.7, 0.58), at(u + w * 0.7, 0.58)], 1.1, grey(0.55, 0.8), { seed: 720 + i });
    }
    face(g, [[240, 598], [424, 597], [424, 626], [236, 626]], [0.16, 0.26, 0.34, 0.08], "h", { per: 3, seed: 730 });
    ink(g, [[240, 598], [424, 597]], 1.2, grey(0.75, 0.8), { seed: 731 });
    face(g, [[172, 558], [238, 574], [240, 626], [190, 624]], [0.22, 0.25, 0.1, 0.02], "v", { per: 3.4, seed: 732 });
    ink(g, [[172, 558], [238, 574]], 1.4, grey(0.7), { seed: 733 });
    ink(g, [[172, 558], [176, 602], [190, 624]], 1.2, grey(0.45), { seed: 734 });
    fillPoly(g, [[424, 585], [492, 583], [494, 624], [426, 626]], grey(0.05));
    ink(g, [[424, 585], [492, 583]], 1.4, grey(0.6), { seed: 735 });
    for (let i = 0; i < 4; i++) {
      dot(g, 437 + i * 16.5, 582, 3, grey(0.04));
      dot(g, 437 + i * 16.5, 580.5, 1.8, grey(0.8));
    }
    face(g, [[146, 626], [488, 622], [490, 644], [146, 648]], [0.09, 0.28, 0.17, 0.16], "h", { per: 3.2, seed: 740, brk: 0.3 });
    ink(g, [[146, 626], [488, 622]], 1.3, grey(0.8), { seed: 741 });
    ink(g, [[146, 648], [490, 644]], 1.5, BLK, { seed: 742 });
    face(g, [[312, 648], [338, 648], [340, 826], [314, 826]], [0.8, 0.62, 0.45, 0.62], "v", { per: 3, seed: 743, brk: 0.25 });
    ink(g, [[338, 648], [340, 826]], 1.4, BLK, { seed: 744 });
    for (const [pts, bx, by] of [[[[298, 624], [352, 622], [354, 648], [340, 664], [318, 666], [300, 650]], 333, 638], [[[470, 622], [492, 621], [492, 660], [474, 658]], 484, 632]]) {
      soft(g, pth(pts, false), lg(g, pts[0][0], 622, pts[1][0], 664, [[0, 0.9], [1, 0.55]]));
      ink(g, pts, 1.5, BLK, { closed: true, seed: bx });
      dot(g, bx, by, 4.5, grey(0.07));
      ring(g, bx, by, 4.5, 1.2, grey(0.5));
      dot(g, bx - 1, by - 1, 1.4, grey(0.85));
    }
    fillPoly(g, [[146, 628], [164, 628], [164, 648], [146, 648]], grey(0.65));
    curve(g, [[153, 534], [172, 540], [180, 560]], 2.4, "rgba(215,215,210,0.8)", { seed: 750 });
    cable(g, [[172, 652], [196, 660], [206, 690], [204, 722], [198, 746]], 3.4, 751, 0.8);
  }
  function face(g, q, [a, b, c, d], dir = "v", o = {}) {
    stripes(g, q, { cov: bl(a, b, c, d), lum: 1, dir, ...o });
  }
  function leftLow(g) {
    face(g, [[14, 656], [72, 655], [72, 752], [14, 752]], [0.16, 0.18, 0.16, 0.12], "v", { seed: 800 });
    face(g, [[72, 655], [172, 655], [172, 752], [72, 752]], [0.66, 0.46, 0.42, 0.62], "v", { seed: 801 });
    ink(g, [[14, 656], [172, 655]], 1.8, grey(0.9), { seed: 802 });
    ink(g, [[72, 656], [72, 752]], 1.6, BLK, { seed: 803 });
    fillPoly(g, [[145, 648], [200, 650], [202, 680], [148, 678]], grey(0.2));
    ink(g, [[145, 648], [200, 650]], 1.4, grey(0.8), { seed: 804 });
    face(g, [[14, 753], [75, 752], [75, 870], [14, 870]], [0.14, 0.16, 0.1, 0.1], "v", { seed: 804 });
    face(g, [[75, 752], [232, 752], [232, 870], [75, 870]], [0.5, 0.5, 0.36, 0.4], "v", { seed: 805 });
    ink(g, [[14, 753], [232, 752]], 1.8, grey(0.9), { seed: 806 });
    ink(g, [[75, 753], [75, 870]], 1.6, BLK, { seed: 807 });
    stripes(g, [[95, 745], [210, 744], [215, 754], [98, 755]], { dir: "h", per: 3, cov: bl(0.44, 0.33, 0.42, 0.44), lum: 1, seed: 808 });
    fillPoly(g, [[250, 826], [290, 824], [291, 862], [251, 863]], grey(0.55));
    ink(g, [[250, 826], [290, 824], [291, 862], [251, 863]], 1.3, BLK, { closed: true, seed: 809 });
    dot(g, 280, 815, 4, grey(0.75));
    stripes(g, [[272, 812], [366, 812], [368, 830], [270, 830]], { dir: "h", per: 3, cov: bl(0.1, 0.06, 0.2, 0.14), lum: 1, seed: 810 });
    stripes(g, [[270, 830], [368, 830], [370, 862], [272, 862]], { dir: "h", per: 3, cov: bl(0.3, 0.54, 0.25, 0.34), lum: 1, seed: 811 });
    ink(g, [[270, 830], [368, 830]], 1.4, BLK, { seed: 812 });
    for (const x of [281, 305, 320, 343]) {
      fillPoly(g, [[x - 6, 800], [x + 6, 800], [x + 6, 816], [x - 6, 816]], "#0b0b0b");
      g.fillStyle = grey(0.85);
      g.beginPath();
      g.ellipse(x, 800, 6, 2.4, 0, 0, PI * 2);
      g.fill();
    }
    for (const x of [290, 306, 348, 362]) dot(g, x, 846, 3, "#111");
  }
  function ampGroup(g) {
    face(g, [[368, 708], [390, 708], [390, 845], [370, 845]], [0.24, 0.4, 0.18, 0.05], "v", { per: 3.4, seed: 820 });
    brush(g, [[390, 708], [447, 708], [447, 845], [390, 845]], (v) => {
      v.fillStyle = lg(v, 0, 708, 0, 845, [[0, 0.8], [0.6, 0.62], [1, 0.4]]);
      v.fillRect(388, 706, 62, 142);
    }, PI / 2, { len: 24, w: 2, gap: 1.6, seed: 821, jit: 0.06, base: 0.8 });
    ink(g, [[368, 708], [447, 708], [447, 845], [370, 845]], 1.5, BLK, { closed: true, seed: 822 });
    ink(g, [[390, 708], [390, 845]], 1.2, grey(0.3, 0.8), { seed: 823 });
    fillPoly(g, [[437, 718], [590, 718], [592, 738], [440, 738]], grey(0.05));
    stripes(g, [[480, 709], [563, 709], [566, 720], [478, 721]], { dir: "h", per: 2.6, cov: bl(0.45, 0.27, 0.4, 0.36), lum: 1, seed: 824 });
    fillPoly(g, [[500, 727], [517, 727], [517, 736], [500, 736]], grey(0.7));
    face(g, [[440, 738], [467, 738], [467, 847], [443, 847]], [0.23, 0.35, 0.41, 0.32], "v", { per: 3, seed: 825 });
    brush(g, [[467, 738], [590, 738], [590, 847], [467, 847]], (v) => {
      v.fillStyle = lg(v, 467, 738, 590, 847, [[0, 0.97], [0.6, 0.9], [1, 0.72]]);
      v.fillRect(465, 736, 128, 114);
    }, PI / 2, { len: 20, w: 2, gap: 1.5, seed: 826, jit: 0.08, base: 0.82 });
    ink(g, [[440, 738], [590, 738], [590, 847], [443, 847]], 1.5, BLK, { closed: true, seed: 827 });
    ink(g, [[467, 738], [467, 847]], 1.1, grey(0.35, 0.8), { seed: 828 });
    ink(g, [[443, 777], [590, 776]], 1.2, grey(0.3, 0.8), { seed: 829 });
    ink(g, [[474, 767], [480, 756], [486, 767]], 1.5, grey(0.2, 0.9), { seed: 830 });
    ink(g, [[476, 763], [484, 763]], 1.1, grey(0.2, 0.9), { seed: 831 });
    fillPoly(g, [[560, 756], [583, 755], [583, 760], [560, 761]], grey(0.15));
    cable(g, [[532, 712], [538, 684], [556, 668], [584, 666], [606, 676], [616, 700], [620, 740], [612, 790], [602, 812]], 7, 832, 0.85);
    soft(g, E(540, 690, 9, 14, 0.3), grey(0.08));
    ring(g, 540, 690, 8, 1.4, grey(0.5));
    cable(g, [[372, 840], [410, 806], [456, 752], [490, 712], [512, 688]], 5.5, 834, 0.6);
    cable(g, [[470, 852], [520, 838], [570, 826], [620, 820], [690, 812]], 4.5, 836, 0.5);
  }
  function book(g, pts, { lum = 0.95, cov = 0.85, seed = 1, spine = 0.25, k = 1 } = {}) {
    stripes(g, pts, { dir: "h", per: 2.6, cov: (u, v) => k * cov * lerp(spine / cov, 1, sstep(0, 0.18, u)) * (1 - 0.25 * v), lum, seed, brk: 0.2, jit: 0.2, wav: 0.2 });
    ink(g, pts, 1.3, BLK, { closed: true, seed: seed + 1 });
  }
  function speakerL(g) {
    book(g, [[553, 447], [648, 445], [650, 461], [554, 462]], { seed: 1001, k: 0.75 });
    book(g, [[532, 461], [655, 459], [657, 476], [533, 477]], { seed: 1003, k: 0.8 });
    book(g, [[537, 476], [664, 475], [666, 490], [538, 491]], { seed: 1005, k: 0.75 });
    book(g, [[527, 490], [668, 489], [669, 503], [528, 504]], { seed: 1007, lum: 0.9, k: 0.7 });
    brush(
      g,
      [[521, 505], [633, 505], [633, 704], [521, 704]],
      (v) => {
        v.fillStyle = lg(v, 521, 0, 633, 0, [[0, 0.2], [0.5, 0.16], [1, 0.12]]);
        v.fillRect(520, 504, 115, 202);
      },
      PI / 2,
      { len: 26, w: 2.2, gap: 2, seed: 1010, jit: 0.06, base: 0.6 }
    );
    face(g, [[633, 505], [700, 511], [700, 628], [633, 628]], [0.62, 0.6, 0.5, 0.58], "v", { per: 4, seed: 1011, brk: 0.3 });
    stripes(g, [[521, 499], [633, 499], [700, 505], [633, 505]], { dir: "h", per: 2.6, cov: bl(0.27, 0.29, 0.13, 0.22), lum: 1, seed: 1014 });
    ink(g, [[633, 505], [633, 704]], 1.5, BLK, { seed: 1012 });
    ink(g, [[521, 505], [633, 505], [700, 511]], 1.4, grey(0.75), { seed: 1013 });
    ink(g, [[521, 505], [521, 704]], 1.2, grey(0.35), { seed: 1015 });
    driver(g, 577, 540, 15, "tweeter");
    driver(g, 577, 613, 45, "woofer");
    face(g, [[678, 447], [710, 447], [712, 515], [680, 515]], [0.45, 0.3, 0.3, 0.4], "v", { per: 3.4, seed: 1020 });
    ink(g, [[678, 447], [710, 447], [712, 515], [680, 515]], 1.4, BLK, { closed: true, seed: 1021 });
    for (const y of [470, 490]) {
      dot(g, 693, y, 4, "#0a0a0a");
      ring(g, 693, y, 4.2, 1.2, grey(0.7));
    }
  }
  function driver(g, cx, cy, r, kind) {
    if (kind === "woofer") {
      dot(g, cx, cy, r, grey(0.05));
      ring(g, cx, cy, r - 1.5, 2, grey(0.35));
      ring(g, cx, cy, r * 0.82, 3, grey(0.12));
      soft(g, E(cx, cy, r * 0.74, r * 0.74, 0), rg(g, cx - r * 0.2, cy - r * 0.25, r * 0.1, r * 0.8, [[0, 0.9], [0.55, 0.78], [1, 0.4]]));
      g.save();
      g.beginPath();
      g.arc(cx, cy, r * 0.74, 0, PI * 2);
      g.clip();
      const rr = rng(Math.round(cx * 7 + cy));
      for (let i = 0; i < 70; i++) {
        const a = rr() * PI * 2, l0 = r * (0.3 + rr() * 0.15), l1 = r * (0.55 + rr() * 0.2);
        ink(g, [[cx + Math.cos(a) * l0, cy + Math.sin(a) * l0], [cx + Math.cos(a) * l1, cy + Math.sin(a) * l1]], 1, grey(rr() < 0.5 ? 0.3 : 0.95, 0.35), { seed: 3e3 + i });
      }
      g.restore();
      dot(g, cx, cy, r * 0.3, grey(0.05));
      soft(g, E(cx - r * 0.08, cy - r * 0.1, r * 0.12, r * 0.09, 0), grey(0.35));
      ring(g, cx, cy, r * 0.74, 1.2, grey(0.25));
    } else {
      dot(g, cx, cy, r, grey(0.05));
      ring(g, cx, cy, r - 1, 1.4, grey(0.3));
      soft(g, E(cx, cy, r * 0.62, r * 0.62, 0), rg(g, cx - r * 0.25, cy - r * 0.25, 1, r * 0.7, [[0, 0.4], [1, 0.08]]));
      dot(g, cx - r * 0.12, cy - r * 0.15, r * 0.14, grey(0.9));
    }
  }
  function crateAndBooks(g) {
    book(g, [[635, 628], [765, 626], [766, 643], [636, 644]], { seed: 1101 });
    book(g, [[640, 643], [770, 642], [771, 665], [641, 666]], { seed: 1103 });
    book(g, [[640, 665], [760, 664], [761, 683], [641, 684]], { seed: 1105 });
    book(g, [[630, 683], [765, 682], [766, 700], [631, 701]], { seed: 1107, lum: 0.9 });
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
    ink(g, [[622, 190], [706, 150], [800, 173]], 1.1, grey(0.3, 0.7), { seed: 1300 });
    fillPoly(g, sgn, "#070707");
    blurDraw(g, [590, 160, 840, 300], 0.6, (c) => {
      ink(c, sgn, 2.4, grey(0.62), { closed: true, seed: 1301 });
      c.save();
      c.translate(611, 293);
      c.rotate(-0.106);
      for (const [x, y] of [[10, -12], [206, -12]]) ring(c, x, y, 3.3, 1.3, grey(0.6));
      c.font = "400 32px Geist";
      c.fontStretch = "condensed";
      c.fillStyle = grey(0.5);
      c.letterSpacing = "1px";
      c.save();
      c.scale(0.74, 1.02);
      c.fillText("DO NOT KNOCK.", 17, -28);
      c.restore();
      c.font = "500 16px Geist";
      c.fillStyle = grey(0.36, 0.7);
      c.fillText("MIXING.", 112, -76);
      c.letterSpacing = "0px";
      c.fontStretch = "normal";
      c.restore();
    });
  }
  function wallLight(g) {
    g.save();
    g.beginPath();
    g.ellipse(1338, 388, 58, 58, 0, 0, PI * 2);
    g.clip();
    const r = rng(1401);
    for (let i = 0; i < 520; i++) {
      const a = r() * PI * 2, d = Math.sqrt(r()) * 60;
      const x = 1338 + Math.cos(a) * d, y = 388 + Math.sin(a) * d;
      const fall = clamp2(1 - Math.hypot(x - 1350, y - 372) / 66);
      g.strokeStyle = grey(0.2 + 0.55 * fall, 0.2 + 0.6 * fall);
      g.lineWidth = 0.9 + fall * 0.6;
      const rr = 2 + r() * 3.5, a0 = r() * 6;
      g.beginPath();
      g.arc(x, y, rr, a0, a0 + 3.2 + r() * 1.5);
      g.stroke();
    }
    g.restore();
  }
  function deskUnder(g) {
    stripes(g, [[1030, 646], [1135, 646], [1138, 668], [1028, 668]], { per: 4, cov: 0.35, lum: 0.6, seed: 1410 });
    stripes(g, [[823, 545], [845, 545], [838, 858], [813, 858]], { per: 3.2, cov: bl(0.15, 0.3, 0.21, 0.57), lum: 1, seed: 1411, brk: 0.2 });
    ink(g, [[845, 545], [838, 858]], 1.4, BLK, { seed: 1412 });
    face(g, [[892, 560], [908, 560], [906, 840], [890, 840]], [0.3, 0.2, 0.12, 0.2], "v", { per: 3, seed: 1414 });
    face(g, [[848, 590], [890, 558], [896, 566], [852, 600]], [0.4, 0.3, 0.2, 0.3], "h", { per: 3, seed: 1416 });
    stripes(g, [[840, 800], [895, 800], [895, 812], [840, 812]], { dir: "h", per: 3, cov: 0.5, lum: 0.75, seed: 1415 });
    dot(g, 831, 614, 5.5, "#0c0c0c");
    ring(g, 831, 614, 5.5, 1.4, grey(0.85));
    dot(g, 831, 614, 2, grey(0.8));
    stripes(g, [[1298, 556], [1320, 556], [1280, 832], [1258, 830]], { dir: "v", per: 3.2, cov: bl(0.07, 0.09, 0.24, 0.19), lum: 1, seed: 1420, brk: 0.2 });
    stripes(g, [[1342, 552], [1356, 552], [1350, 700], [1338, 700]], { per: 3.2, cov: 0.35, lum: 0.7, seed: 1421 });
    stripes(g, [[1395, 562], [1405, 556], [1436, 600], [1430, 608]], { dir: "h", per: 3, cov: 0.5, lum: 0.75, seed: 1422 });
    stripes(g, [[1433, 548], [1457, 548], [1465, 865], [1446, 865]], { per: 3.2, cov: fadeEdges(ug(0.95, 0.5), 0, 0.03), lum: 0.93, seed: 1423, brk: 0.2 });
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
    else if (blur) blurDraw(g, [0, 0, PW, PH], blur, draw);
    else draw(g);
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
    const legs = [
      {
        pts: [
          [936, 552],
          [1e3, 556],
          [1040, 558],
          [1034, 580],
          [1026, 610],
          [1030, 640],
          [1036, 670],
          [1042, 695],
          [1058, 722],
          [1060, 745],
          [1064, 768],
          [1060, 786],
          [1030, 792],
          [990, 790],
          [955, 786],
          [938, 776],
          [928, 750],
          [921, 725],
          [917, 690],
          [918, 640],
          [921, 600],
          [928, 572]
        ],
        box: [912, 548, 1070, 796],
        seed: 1500,
        hi: [[
          [942, 640],
          [954, 671],
          [966, 684],
          [981, 707],
          [995, 715],
          [977, 737],
          [965, 749],
          [986, 761],
          [1005, 761],
          [1026, 770],
          [995, 749],
          [1015, 737],
          [1050, 730],
          [1057, 724],
          [1001, 655],
          [1019, 688],
          [1043, 721],
          [1021, 722],
          [1009, 719],
          [1020, 705],
          [975, 662],
          [967, 675]
        ], [[1020, 750], [1041, 765], [1030, 772], [1037, 782], [1018, 782], [1049, 795], [1052, 777], [1056, 765], [1032, 747]], [[1005, 624], [1011, 638], [1020, 635], [1011, 622]]],
        folds: [[[930, 575], [950, 610], [972, 648], [992, 690]], [[962, 562], [984, 600], [1004, 634]], [[1e3, 562], [1014, 590], [1022, 616]], [[925, 700], [940, 730], [952, 752]]],
        lo: [[[922, 600], [924, 650], [926, 700]], [[1002, 648], [986, 628], [968, 598]], [[996, 718], [1016, 730], [1040, 740]], [[960, 758], [990, 770], [1018, 778]], [[986, 700], [976, 718], [966, 736]]]
      },
      {
        pts: [
          [1158, 552],
          [1215, 552],
          [1265, 556],
          [1272, 585],
          [1280, 615],
          [1288, 640],
          [1286, 665],
          [1272, 690],
          [1262, 715],
          [1250, 740],
          [1254, 765],
          [1240, 786],
          [1200, 792],
          [1160, 792],
          [1124, 790],
          [1122, 770],
          [1130, 745],
          [1132, 722],
          [1150, 695],
          [1154, 670],
          [1160, 630],
          [1162, 595],
          [1162, 570]
        ],
        box: [1116, 548, 1292, 796],
        seed: 1520,
        hi: [
          [[1220, 665], [1206, 683], [1193, 699], [1180, 724], [1161, 734], [1149, 750], [1134, 761], [1143, 765], [1167, 748], [1204, 742], [1231, 757], [1224, 767], [1251, 768], [1237, 720], [1233, 748], [1206, 734], [1218, 700]],
          [[1190, 656], [1178, 669], [1154, 703], [1152, 718], [1163, 718], [1187, 693], [1192, 665]],
          [[1242, 641], [1230, 667], [1228, 683], [1244, 695], [1266, 704], [1260, 687], [1242, 683]],
          [[1196, 608], [1182, 628], [1175, 633], [1188, 637], [1200, 613]],
          [[1250, 617], [1276, 645], [1278, 640], [1272, 632]],
          [[1174, 761], [1203, 769], [1212, 766], [1199, 761]]
        ],
        folds: [[[1250, 566], [1232, 604], [1214, 640], [1196, 676]], [[1214, 560], [1196, 596], [1180, 630]], [[1180, 562], [1170, 590], [1164, 616]], [[1276, 690], [1262, 720], [1252, 746]]],
        lo: [[[1276, 600], [1284, 640], [1280, 670]], [[1170, 650], [1182, 628], [1196, 600]], [[1188, 730], [1170, 742], [1146, 752]], [[1150, 772], [1190, 776], [1226, 774]], [[1216, 700], [1224, 720], [1232, 738]]]
      }
    ];
    for (const leg of legs) {
      const f = curveField([...leg.folds, ...leg.lo, ...leg.hi.map((h) => h.slice(0, 3))], leg.box, 6);
      const painter = (v) => {
        v.fillStyle = lg(v, 0, 548, 0, 796, [[0, 0.2], [0.25, 0.28], [0.55, 0.3], [1, 0.24]]);
        v.fillRect(leg.box[0] - 10, 540, 200, 262);
        for (const c of leg.folds) vLineC(v, c, 7, 0.45, 2.5);
        for (const h of leg.hi) blurDraw(v, bboxOf(h, 8), 2.5, (c) => {
          c.beginPath();
          smoothPath(c, h, true);
          c.fillStyle = grey(0.6);
          c.fill();
        });
        clothFolds(v, leg.pts, (x, y) => f(x, y), 300, leg.seed + 7, { hi: 0.72, light: (x, y) => 0.7 + 0.3 * sstep(560, 700, y), wMin: 1, wMax: 3, darkFrac: 0.45 });
        for (const h of leg.hi) blurDraw(v, bboxOf(h, 4), 1, (c) => {
          c.beginPath();
          smoothPath(c, h, true);
          c.fillStyle = grey(0.72);
          c.fill();
        });
        for (const c of leg.lo) vLineC(v, c, 8, 0.03, 2.5);
      };
      brush(g, leg.pts, painter, (x, y) => f(x, y), { len: 22, w: 1.5, gap: 1.15, seed: leg.seed + 1, jit: 0.22, base: 0.35, lj: 0.45, dark: 0.2, gain: 1.1 });
      const rs = rng(leg.seed + 60);
      for (const h of leg.hi) {
        const hb = bboxOf(h), n = Math.round((hb[2] - hb[0]) * (hb[3] - hb[1]) / 75);
        g.save();
        g.beginPath();
        smoothPath(g, h, true);
        g.clip();
        for (let k = 0; k < n; k++) {
          let x = lerp(hb[0], hb[2], rs()), y = lerp(hb[1], hb[3], rs());
          const q = [[x, y]], L = 10 + rs() * 30;
          for (let t = 0; t < L; t += 3) {
            const an = f(x, y) + (rs() - 0.5) * 0.12;
            x += Math.cos(an) * 3;
            y += Math.sin(an) * 3;
            q.push([x, y]);
          }
          const w = 0.9 + rs() * 1.8;
          taper(g, q, (u) => w * Math.pow(Math.sin(PI * clamp2(u, 0.02, 0.98)), 0.7), grey(0.7 + rs() * 0.22, 0.85));
        }
        g.restore();
      }
      for (const [i, c] of leg.lo.entries()) curve(g, c, 2, grey(0.02, 0.85), { seed: leg.seed + 10 + i, ends: 0.1 });
      for (const [i, h] of leg.hi.entries()) curve(g, h, 1.1, grey(0.03, 0.55), { closed: true, seed: leg.seed + 40 + i, ends: 0.6 });
      curve(g, leg.pts, 1.8, grey(0.02), { closed: true, seed: leg.seed + 30, ends: 0.9 });
    }
    const flap = [[1242, 612], [1270, 606], [1284, 640], [1282, 690], [1268, 712], [1248, 700], [1240, 660]];
    curve(g, flap, 1.5, grey(0.03, 0.9), { closed: true, seed: 1540, ends: 0.9 });
    const lap = [[1040, 552], [1160, 552], [1160, 600], [1150, 640], [1036, 640], [1030, 600]];
    brush(g, lap, (v) => {
      v.fillStyle = lg(v, 0, 552, 0, 640, [[0, 0.22], [0.5, 0.12], [1, 0.05]]);
      v.fillRect(1026, 548, 140, 96);
    }, (x, y) => x < 1095 ? 0.9 : 2.2, { len: 18, w: 1.6, gap: 1.4, seed: 1545, smooth: true, jit: 0.3, base: 0.4, lj: 0.4, dark: 0.2 });
    stripes(g, [[1046, 652], [1138, 652], [1140, 671], [1044, 671]], { per: 3.4, cov: bl(0.42, 0.5, 0.3, 0.25), lum: 0.9, seed: 1541, dir: "h", brk: 0.2 });
    ink(g, [[1046, 652], [1138, 652]], 1.2, grey(0.7), { seed: 1542 });
    fillPoly(g, [[1078, 672], [1096, 672], [1094, 770], [1080, 770]], grey(0.05));
  }
  function clothFolds(v, pts, f, n, seed, { hi = 0.7, lo = 0.02, light = () => 1, lenMin = 16, lenMax = 60, wMin = 1.4, wMax = 4, darkFrac = 0.4 } = {}) {
    const r = rng(seed), [x0, y0, x1, y1] = bboxOf(pts);
    const inside = (x, y) => {
      let c = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    blurDraw(v, [x0, y0, x1, y1], 0.9, (c) => {
      for (let k = 0; k < n; k++) {
        let x = lerp(x0, x1, r()), y = lerp(y0, y1, r());
        if (!inside(x, y)) continue;
        const L = lerp(lenMin, lenMax, r()), q = [[x, y]], dir = r() < 0.5 ? -1 : 1;
        for (let t = 0; t < L; t += 3) {
          const a = f(x, y) + (r() - 0.5) * 0.15;
          x += Math.cos(a) * 3 * dir;
          y += Math.sin(a) * 3 * dir;
          q.push([x, y]);
        }
        const dk = r() < darkFrac, w = lerp(wMin, wMax, r());
        const val = dk ? lo : hi * light(q[0][0], q[0][1]) * (0.6 + 0.4 * r());
        taper(c, q, (u) => w * Math.pow(Math.sin(PI * clamp2(u, 0.02, 0.98)), 0.7), grey(val));
      }
    });
  }
  function vLineC(v, pts, w, val, blur) {
    blurDraw(v, bboxOf(pts, w), blur, (c) => curve(c, pts, w, grey(val), { seed: 5, ends: 0.3, jit: 0 }));
  }
  function shoes(g) {
    const S = [
      {
        up: [[936, 830], [938, 806], [950, 790], [975, 783], [1e3, 783], [1030, 786], [1052, 792], [1062, 810], [1064, 836]],
        randTop: [[903, 850], [912, 838], [932, 830], [968, 829], [1e3, 834], [1032, 838], [1064, 836]],
        randBot: [[1066, 848], [1012, 853], [960, 855], [902, 855]],
        soleBot: [[1064, 874], [1010, 880], [950, 881], [902, 879]],
        toeX: 935,
        tongue: [[978, 772], [1010, 771], [1012, 790], [976, 791]],
        laces: [[[955, 800], [980, 795], [1004, 800]], [[950, 808], [976, 803], [1004, 808]], [[952, 816], [978, 812], [1006, 816]], [[958, 823], [982, 820], [1006, 824]]],
        bow: [[[986, 798], [972, 791], [962, 795], [970, 801], [984, 799]], [[990, 797], [1002, 790], [1014, 794], [1006, 802], [992, 799]]],
        tails: [[[985, 800], [977, 808], [971, 816]], [[991, 800], [997, 809], [1e3, 818]]],
        lit: [0.3, 0.16],
        seed: 1560
      },
      {
        up: [[1124, 842], [1122, 806], [1131, 789], [1160, 781], [1195, 780], [1225, 786], [1240, 798], [1247, 820], [1247, 842]],
        randTop: [[1120, 846], [1150, 843], [1190, 837], [1225, 837], [1244, 845], [1252, 855]],
        randBot: [[1253, 861], [1180, 864], [1120, 859]],
        soleBot: [[1254, 883], [1190, 886], [1124, 882]],
        toeX: 1225,
        tongue: [[1166, 772], [1200, 771], [1203, 792], [1162, 793]],
        laces: [[[1150, 804], [1178, 799], [1206, 804]], [[1146, 812], [1175, 807], [1208, 812]], [[1150, 820], [1178, 816], [1210, 820]], [[1156, 828], [1182, 825], [1212, 829]]],
        bow: [[[1182, 802], [1168, 795], [1156, 799], [1164, 806], [1180, 803]], [[1188, 801], [1202, 794], [1216, 798], [1208, 806], [1190, 803]]],
        tails: [[[1182, 804], [1172, 813], [1166, 822]], [[1190, 804], [1198, 813], [1202, 823]]],
        lit: [0.26, 0.14],
        seed: 1580
      }
    ];
    for (const s of S) {
      const [x0, , x1] = bboxOf(s.up), cx = (x0 + x1) / 2;
      const sole = [...[...s.randBot].reverse(), ...[...s.soleBot].reverse()];
      fillBlob(g, sole, grey(0.04));
      const lb = bboxOf(sole), n = Math.round((lb[2] - lb[0]) / 7.5);
      for (let i = 0; i < n; i++) {
        const xa = lerp(lb[0] + 2, lb[2] - 2, i / n), xb = lerp(lb[0] + 2, lb[2] - 2, (i + 0.72) / n), lit = 0.55 + 0.4 * Math.exp(-(((xa - s.toeX) / 80) ** 2));
        g.save();
        g.beginPath();
        smoothPath(g, sole, true);
        g.clip();
        soft(g, pth([[xa, lb[1]], [xb, lb[1]], [xb - 0.5, lb[3] - 2], [xa + 0.5, lb[3] - 1.5]], false), lg(g, 0, lb[1], 0, lb[3], [[0, grey(lit)], [0.75, grey(lit * 0.8)], [1, grey(0.1)]]), 0.5);
        g.restore();
      }
      const upper = [...s.up, ...[...s.randTop].reverse()];
      brush(
        g,
        upper,
        (v) => {
          v.fillStyle = lg(v, 0, 780, 0, 845, [[0, s.lit[0] + 0.08], [0.4, s.lit[0]], [1, s.lit[1]]]);
          v.fillRect(x0 - 5, 775, x1 - x0 + 10, 75);
        },
        (x, y) => Math.atan2(y - 770, x - cx) + PI / 2,
        { len: 8, w: 1.8, gap: 1.3, seed: s.seed, smooth: false, jit: 0.5, base: 0.6, lj: 0.35, dark: 0.15 }
      );
      curve(g, s.up, 1.5, grey(0.02), { seed: s.seed + 1, ends: 0.9 });
      const rand = [...s.randTop, ...s.randBot];
      const rb = bboxOf(rand);
      brush(g, rand, (v) => {
        v.fillStyle = lg(v, 0, rb[1], 0, rb[3], [[0, 0.95], [0.6, 0.78], [1, 0.5]]);
        v.fillRect(rb[0], rb[1], rb[2] - rb[0], rb[3] - rb[1]);
        v.globalCompositeOperation = "multiply";
        v.fillStyle = rg(v, s.toeX, rb[1] + 8, 10, 120, [[0, grey(1)], [0.6, grey(0.7)], [1, grey(0.45)]]);
        v.fillRect(rb[0], rb[1], rb[2] - rb[0], rb[3] - rb[1]);
      }, 0.1, { len: 10, w: 2, gap: 1.3, seed: s.seed + 11, smooth: false, jit: 0.4, base: 0.75, lj: 0.2 });
      curve(g, s.randTop, 1.3, grey(0.04, 0.9), { seed: s.seed + 12, ends: 0.6 });
      curve(g, s.randBot, 1, grey(0.04, 0.7), { seed: s.seed + 13, ends: 0.6 });
      fillBlob(g, s.tongue, grey(0.2));
      curve(g, s.tongue, 1.1, grey(0.03), { closed: true, seed: s.seed + 2 });
      const tx = (s.tongue[0][0] + s.tongue[1][0]) / 2, ty = (s.tongue[0][1] + s.tongue[2][1]) / 2;
      fillBlob(g, [[tx - 8, ty - 5], [tx + 8, ty - 5], [tx + 8, ty + 2], [tx - 8, ty + 2]], grey(0.62));
      const lw = grey(0.93);
      const big = (c) => {
        const m = c.reduce((a, p) => [a[0] + p[0] / c.length, a[1] + p[1] / c.length], [0, 0]);
        return c.map(([x, y]) => [m[0] + (x - m[0]) * 1.35, m[1] + (y - m[1]) * 1.35]);
      };
      for (const c of s.laces) {
        curve(g, c, 3.4, grey(0.03), { seed: s.seed + 3 });
        curve(g, c, 2, lw, { seed: s.seed + 4 });
      }
      for (const c of [...s.bow.map(big), ...s.tails]) {
        curve(g, c, 3.6, grey(0.03), { seed: s.seed + 5 });
        curve(g, c, 2.2, lw, { seed: s.seed + 6 });
      }
    }
  }
  function torso(g) {
    const T = [
      [920, 525],
      [920, 480],
      [921, 452],
      [924, 432],
      [929, 412],
      [937, 395],
      [950, 381],
      [966, 371],
      [984, 365],
      [1002, 360],
      [1070, 356],
      [1134, 356],
      [1150, 362],
      [1167, 372],
      [1184, 384],
      [1198, 400],
      [1206, 418],
      [1212, 438],
      [1220, 455],
      [1231, 468],
      [1242, 481],
      [1248, 495],
      [1250, 510],
      [1250, 525]
    ];
    fillBlob(g, T, grey(0.62));
    g.save();
    g.beginPath();
    smoothPath(g, T, true);
    g.clip();
    soft(g, pth(T), rg(g, 1070, 490, 20, 230, [[0, 0.98], [0.3, 0.95], [0.55, 0.88], [0.8, 0.78], [1, 0.68]]));
    soft(g, pth([[912, 440], [930, 400], [950, 384], [946, 430], [936, 480], [930, 530], [912, 530]]), grey(0.55), 8, 0.7);
    soft(g, pth([[1186, 396], [1212, 430], [1244, 482], [1254, 530], [1222, 530], [1200, 470], [1180, 420]]), grey(0.6), 8, 0.75);
    const tee = [[1040, 372], [1100, 370], [1112, 400], [1104, 428], [1090, 446], [1072, 452], [1054, 444], [1040, 424], [1034, 398]];
    soft(g, pth(tee), lg(g, 0, 372, 0, 452, [[0, 0.72], [0.25, 0.97], [0.75, 0.97], [1, 0.84]]), 3);
    soft(g, pth([[1004, 360], [1e3, 392], [998, 420], [1014, 438], [1034, 420], [1040, 380]]), grey(0.9), 2, 0.8);
    soft(g, pth([[1134, 356], [1138, 392], [1136, 420], [1122, 440], [1106, 424], [1102, 380]]), grey(0.86), 2, 0.8);
    soft(g, pth([[960, 432], [1180, 432], [1180, 456], [960, 456]]), grey(0.7), 5, 0.75);
    const sf = [
      [[944, 398], [970, 386], [1e3, 378]],
      [[1150, 372], [1172, 382], [1194, 398]],
      [[1160, 400], [1180, 424], [1200, 450]],
      [[1150, 420], [1168, 448], [1188, 474]],
      [[1196, 452], [1214, 470], [1232, 484]],
      [[1142, 452], [1160, 478], [1172, 500]],
      [[958, 410], [948, 436], [944, 466]],
      [[978, 400], [968, 426], [962, 450]],
      [[936, 450], [932, 488], [930, 520]],
      [[1118, 446], [1116, 480], [1114, 516]],
      [[1170, 468], [1196, 480], [1226, 490]]
    ];
    for (const f of sf) blurDraw(g, bboxOf(f, 6), 2.4, (c) => curve(c, f, 5, grey(0.42, 0.55), { seed: 7, ends: 0.2, jit: 0 }));
    g.restore();
    for (const [f, s, a, w] of [
      [[[1004, 362], [1e3, 392], [998, 420], [1014, 438]], 1620, 0.85, 1.6],
      [[[1014, 438], [1030, 424], [1038, 404]], 1621, 0.6, 1.2],
      [[[1134, 358], [1138, 392], [1136, 420], [1123, 440]], 1622, 0.85, 1.6],
      [[[1123, 440], [1110, 426], [1104, 404]], 1623, 0.55, 1.2],
      [[[1127, 440], [1118, 470], [1113, 490], [1108, 510]], 1624, 0.7, 1.4],
      [[[943, 398], [970, 388], [1e3, 378]], 1625, 0.7, 1.4],
      [[[930, 423], [926, 438], [923, 452]], 1650, 0.6, 1.2],
      [[[967, 390], [975, 412], [983, 437]], 1651, 0.55, 1.1],
      [[[983, 400], [990, 412], [997, 423]], 1652, 0.5, 1],
      [[[1153, 380], [1168, 402], [1183, 423]], 1626, 0.7, 1.4],
      [[[1167, 407], [1180, 428], [1190, 450]], 1627, 0.7, 1.4],
      [[[1147, 437], [1160, 458], [1173, 480]], 1628, 0.65, 1.3],
      [[[1190, 457], [1205, 468], [1220, 480]], 1629, 0.7, 1.3],
      [[[1193, 417], [1202, 428], [1210, 440]], 1653, 0.6, 1.1],
      [[[1233, 480], [1210, 490], [1190, 497], [1170, 501], [1153, 503]], 1654, 0.6, 1.2],
      [[[1180, 394], [1194, 410], [1204, 428]], 1655, 0.45, 1],
      [[[1136, 470], [1146, 488], [1152, 500]], 1656, 0.45, 1],
      [[[950, 440], [946, 470], [944, 500]], 1657, 0.4, 1]
    ]) curve(g, f, w, grey(0.18, a), { seed: s, ends: 0.25 });
    g.save();
    g.beginPath();
    smoothPath(g, T, true);
    g.clip();
    g.globalCompositeOperation = "multiply";
    g.lineJoin = "round";
    for (const [w, a] of [[26, 0.1], [14, 0.12], [6, 0.15]]) {
      g.strokeStyle = grey(0.55, a * 2.2);
      g.lineWidth = w;
      g.beginPath();
      smoothPath(g, T, true);
      g.stroke();
    }
    g.restore();
    curve(g, T.slice(0, 10), 1.9, grey(0.1, 0.9), { seed: 1611, ends: 0.8 });
    curve(g, T.slice(12), 1.9, grey(0.1, 0.9), { seed: 1612, ends: 0.8 });
    const fa = [[1236, 472], [1247, 488], [1236, 500], [1206, 506], [1182, 512], [1156, 518], [1138, 516], [1134, 507], [1150, 500], [1178, 494], [1208, 486]];
    soft(g, pth(fa), lg(g, 0, 472, 0, 518, [[0, 0.98], [1, 0.84]]));
    curve(g, [[1176, 494], [1204, 487], [1232, 476]], 1.4, grey(0.2, 0.75), { seed: 1640 });
    curve(g, [[1180, 511], [1206, 505], [1234, 499]], 1.2, grey(0.25, 0.6), { seed: 1641 });
    for (const [f, sd] of [[[[1188, 496], [1196, 502], [1200, 508]], 1642], [[[1212, 489], [1220, 494], [1224, 500]], 1643]]) curve(g, f, 1, grey(0.3, 0.6), { seed: sd });
    curve(g, [[1172, 496], [1174, 504], [1176, 513]], 1.6, grey(0.25, 0.7), { seed: 1644 });
    for (const [f, sd] of [[[[1136, 507], [1146, 504], [1160, 503]], 1645], [[[1138, 512], [1150, 510], [1164, 509]], 1646], [[[1146, 516], [1156, 514], [1168, 514]], 1647]]) curve(g, f, 0.9, grey(0.3, 0.55), { seed: sd });
    soft(g, pth([[906, 522], [908, 500], [914, 489], [924, 487], [930, 496], [931, 522]]), grey(0.84));
    curve(g, [[908, 500], [914, 490], [924, 488]], 1.1, grey(0.2, 0.8), { seed: 1632 });
    g.save();
    g.globalCompositeOperation = "lighter";
    g.translate(1075, 440);
    g.scale(1, 110 / 190);
    const hr = g.createRadialGradient(0, 0, 0, 0, 0, 230);
    hr.addColorStop(0, grey(0.05));
    hr.addColorStop(0.6, grey(0.03));
    hr.addColorStop(1, grey(0));
    g.fillStyle = hr;
    g.beginPath();
    g.arc(0, 0, 230, 0, PI * 2);
    g.fill();
    g.restore();
  }
  function headphones(g) {
    const fade = (y0, y1, a0 = 1) => {
      const gr = g.createLinearGradient(0, y0, 0, y1);
      gr.addColorStop(0, `rgba(8,8,8,${a0})`);
      gr.addColorStop(0.55, `rgba(8,8,8,${a0 * 0.75})`);
      gr.addColorStop(1, "rgba(8,8,8,0)");
      return gr;
    };
    const arc = (cx, cy, rx, ry, a0, a1, w, st) => {
      g.strokeStyle = st;
      g.lineWidth = w;
      g.beginPath();
      g.ellipse(cx, cy, rx, ry, 0, a0, a1);
      g.stroke();
    };
    g.save();
    g.lineCap = "round";
    for (const [pts, w] of [
      [[[1004, 352], [1008, 366], [1012, 378]], 9],
      [[[1016, 356], [1020, 368], [1024, 380]], 7],
      [[[1030, 360], [1030, 370], [1027, 380]], 5],
      [[[1136, 350], [1134, 364], [1130, 378]], 9],
      [[[1124, 356], [1120, 368], [1116, 380]], 7],
      [[[1110, 360], [1110, 370], [1112, 380]], 5]
    ]) strand(g, pts, w, 0.5, grey(0.03));
    soft(g, pth([[1006, 372], [1022, 366], [1040, 372], [1046, 400], [1040, 432], [1022, 446], [1006, 438], [1e3, 405]]), lg(g, 0, 366, 0, 446, [[0, grey(0.3)], [0.55, grey(0.55)], [1, grey(0.85, 0)]]), 3, 0.9);
    arc(1031, 407, 26, 38, PI * 0.62, PI * 1.45, 5, fade(368, 446));
    arc(1031, 407, 20, 32, PI * 0.6, PI * 1.45, 2, fade(372, 440, 0.85));
    arc(1033, 409, 14, 25, PI * 0.58, PI * 1.42, 3.4, fade(380, 436, 0.9));
    arc(1033, 409, 9, 19, PI * 0.6, PI * 1.4, 1.2, fade(386, 430, 0.6));
    for (let k = 0; k < 11; k++) {
      const y = 376 + k * 5.2, a = clamp2(1 - (y - 380) / 60);
      ink(g, [[1041 + k * 0.2, y], [1049 + k * 0.2, y + 2]], 1.3, `rgba(20,20,20,${0.8 * a})`, { seed: 1705 + k });
    }
    arc(1046, 404, 6, 32, -PI * 0.45, PI * 0.45, 1.6, fade(372, 440, 0.8));
    soft(g, pth([[1100, 368], [1124, 366], [1134, 390], [1130, 420], [1118, 440], [1102, 436], [1098, 400]]), lg(g, 0, 366, 0, 440, [[0, grey(0.25)], [0.6, grey(0.5)], [1, grey(0.85, 0)]]), 3, 0.85);
    for (let k = 0; k < 13; k++) {
      const y = 372 + k * 5.2, a = clamp2(1 - (y - 376) / 70);
      ink(g, [[1104, y], [1122, y + 1.5]], 2.6, `rgba(14,14,14,${0.85 * a})`, { seed: 1725 + k });
      ink(g, [[1105, y + 2.6], [1121, y + 3.8]], 1.3, `rgba(235,235,232,${0.7 * a})`, { seed: 1745 + k });
    }
    arc(1100, 404, 5, 34, PI * 0.55, PI * 1.45, 1.8, fade(368, 440, 0.8));
    arc(1113, 402, 22, 38, -PI * 0.45, PI * 0.45, 4.6, fade(364, 442));
    arc(1113, 402, 17, 33, -PI * 0.42, PI * 0.42, 1.6, fade(368, 436, 0.8));
    arc(1113, 402, 26, 40, -PI * 0.3, PI * 0.2, 1.4, fade(366, 420, 0.7));
    g.restore();
  }
  var strand = (g, pts, w0, w1, col, per = 8) => {
    const q = sampleCurve(pts, per);
    taper(g, q, (u) => lerp(w0, w1, u), col);
  };
  function head(g, gaze) {
    const down = gaze !== "owl";
    const HK = grey(0.03);
    const neck = [[1040, 358], [1104, 358], [1105, 380], [1110, 404], [1072, 414], [1034, 404], [1039, 380]];
    soft(g, pth(neck), lg(g, 0, 366, 0, 400, [[0, 0.3], [0.3, 0.5], [0.6, 0.8], [1, 0.95]]));
    soft(g, pth([[1088, 362], [1104, 362], [1108, 400], [1094, 402]]), grey(0.45), 5, 0.6);
    soft(g, pth([[1040, 362], [1052, 362], [1050, 400], [1036, 402]]), grey(0.55), 5, 0.5);
    const F2 = [
      [1019, 262],
      [1020, 280],
      [1020, 300],
      [1020, 320],
      [1021, 336],
      [1026, 350],
      [1034, 362],
      [1048, 373],
      [1065, 378.5],
      [1075, 378.5],
      [1090, 373.5],
      [1105, 362],
      [1115, 350],
      [1121, 338],
      [1122, 320],
      [1122, 300],
      [1123, 280],
      [1124, 262],
      [1100, 246],
      [1045, 246]
    ];
    fillBlob(g, F2, grey(0.7));
    g.save();
    g.beginPath();
    smoothPath(g, F2, true);
    g.clip();
    soft(g, pth(F2), rg(g, 1071, 320, 10, 62, [[0, 0.96], [0.6, 0.93], [0.85, 0.84], [1, 0.7]]));
    g.lineJoin = "round";
    blurDraw(g, bboxOf(F2, 10), 4, (c) => {
      c.beginPath();
      smoothPath(c, F2, true);
      c.strokeStyle = grey(0.62, 0.7);
      c.lineWidth = 9;
      c.stroke();
    });
    soft(g, pth([[1010, 248], [1140, 248], [1140, 266], [1010, 266]]), grey(0.38), 5, 0.9);
    soft(g, pth([[1014, 344], [1026, 348], [1036, 362], [1044, 378], [1026, 378], [1012, 360]]), grey(0.55), 3.5, 0.75);
    soft(g, pth([[1128, 338], [1119, 346], [1110, 360], [1100, 378], [1118, 378], [1130, 356]]), grey(0.5), 3.5, 0.8);
    for (const [cx, cy] of [[1037, 284], [1101, 284]]) {
      soft(g, E(cx, cy, 19, 12, 0), grey(0.6), 3.5, 0.85);
      soft(g, E(cx, cy + 9, 15, 4.5, 0), grey(0.5), 2.5, 0.7);
    }
    soft(g, pth([[1060, 298], [1064, 300], [1061, 318], [1057, 326], [1056, 316]]), grey(0.66), 2.5, 0.7);
    soft(g, pth([[1078, 300], [1083, 302], [1087, 322], [1084, 327], [1080, 318]]), grey(0.66), 2.5, 0.75);
    soft(g, E(1071, 332.5, 13, 2.6, 0), grey(0.62), 1.8, 0.7);
    soft(g, E(1071, 343, 13, 3, 0), grey(0.8), 2, 0.6);
    soft(g, E(1073, 357.5, 12, 2, 0), grey(0.64), 1.6, 0.75);
    soft(g, pth([[1056, 330], [1052, 340], [1050, 348], [1054, 348], [1057, 336]]), grey(0.82), 2, 0.5);
    g.restore();
    curve(g, [[1021, 336], [1026, 350], [1034, 362], [1048, 373.5], [1065, 379], [1075, 379], [1090, 374], [1105, 362.5], [1115, 350.5], [1121, 338]], 1.3, grey(0.25, 0.6), { seed: 1710, ends: 0.3 });
    const EY = [
      {
        o: [1022.6, 285.4],
        i: [1052, 287],
        up: [[1030.8, 281.8], [1040.8, 281.2], [1048.3, 283]],
        lo: [[1024, 289], [1037, 290.5], [1049.5, 289]],
        iris: down ? [1040, 286.4] : [1029.8, 285.4],
        crease: [[1024, 278.5], [1035, 275.5], [1049, 277.5]],
        bag: [[1023, 291], [1037, 295.5], [1051, 291.5]],
        side: -1,
        seed: 1720,
        ir: 5.2,
        ik: 0.03
      },
      {
        o: [1117.6, 285.6],
        i: [1085, 285.8],
        up: [[1112, 282], [1102, 280.6], [1092, 281.6]],
        lo: [[1115.8, 288.5], [1099.5, 290], [1087, 288.5]],
        iris: down ? [1104.5, 286] : [1094.5, 285.4],
        crease: [[1114, 278], [1100, 275.5], [1086, 280]],
        bag: [[1116, 291], [1100, 295.8], [1086, 291]],
        side: 1,
        seed: 1730,
        ir: 5.2,
        ik: 0.05
      }
    ];
    for (const e of EY) {
      const lidDrop = down ? 1.6 : 0;
      const up = e.up.map(([x, y], k) => [x, y + lidDrop * (k === 1 ? 1 : 0.8)]);
      soft(g, pth([e.o, ...e.crease, e.i, ...[...up].reverse()]), grey(0.52), 1.2, 0.85);
      soft(g, pth([[e.bag[0][0], e.bag[0][1] - 2.5], [e.bag[1][0], e.bag[1][1] - 4.5], [e.bag[2][0], e.bag[2][1] - 2.5], ...[...e.bag].reverse().map(([x, y]) => [x, y + 2.2])]), grey(0.36), 1.4, 0.9);
      const eye = [e.o, ...up, e.i, ...[...e.lo].reverse()];
      fillBlob(g, eye, grey(0.84));
      g.save();
      g.beginPath();
      smoothPath(g, eye, true);
      g.clip();
      soft(g, E((e.o[0] + e.i[0]) / 2 + 3, 288, 10, 2.5, 0), grey(0.86), 2, 0.6);
      const [ix, iy] = e.iris;
      soft(g, E(ix, iy, e.ir, e.ir, 0), grey(0.16), 0.6);
      soft(g, E(ix, iy, e.ir * 0.65, e.ir * 0.65, 0), grey(e.ik), 0.5);
      dot(g, ix + 1.9, iy - 1.2, 1.2, grey(0.96));
      soft(g, pth([[e.o[0] - 2, 270], [e.i[0] + 2, 270], [e.i[0] + 2, up[1][1] + 1.6], [e.o[0] - 2, up[0][1] + 1.6]]), grey(0.2), 1, 0.6);
      soft(g, E(e.o[0] - e.side * 3.5, e.o[1] + 1.5, 4, 3, 0), grey(0.22), 1.2, 0.8);
      soft(g, E(e.i[0] - e.side * -2, e.i[1], 3, 3, 0), grey(0.35), 1.5, 0.7);
      g.restore();
      taper(g, sampleCurve([e.o, ...up, e.i], 6), (u) => (e.side < 0 ? lerp(3, 1.2, u) : lerp(1.2, 3, u)) * (0.6 + 0.4 * Math.sin(PI * u)), grey(0.03));
      curve(g, [[e.o[0], e.o[1] + 0.6], [e.o[0] - e.side * 0.2 + (e.i[0] - e.o[0]) * 0.1, e.o[1] - 1.4]], 1.7, grey(0.03), { seed: e.seed + 5 });
      curve(g, e.crease, 1.4, grey(0.18, 0.85), { seed: e.seed + 1, ends: 0.3 });
      curve(g, e.lo, 1, grey(0.22, 0.85), { seed: e.seed + 2, ends: 0.3 });
      curve(g, e.bag, 1.3, grey(0.18, 0.8), { seed: e.seed + 3, ends: 0.2 });
    }
    blurDraw(g, [1024, 258, 1122, 276], 0.8, (c) => {
      curve(c, [[1030, 268.5], [1042, 266.4], [1055, 269.2]], 2.6, grey(0.1), { seed: 1740, ends: 0.25 });
      curve(c, [[1082, 268.2], [1092, 264.4], [1104, 263.6], [1115, 266.2]], 3.6, grey(0.08), { seed: 1741, ends: 0.3 });
    });
    blurDraw(g, [1052, 312, 1092, 336], 0.7, (c) => curve(c, [[1058.5, 320], [1059, 325], [1062, 328.5], [1066, 329.8], [1071.7, 330.6], [1077.5, 329.6], [1082, 328.4], [1085.5, 325], [1085.5, 320]], 1.2, grey(0.3, 0.7), { seed: 1743 }));
    soft(g, E(1063.5, 327.6, 2.5, 1.3, 0.3), grey(0.08), 0.6, 0.9);
    soft(g, E(1080.8, 327.6, 2.5, 1.3, -0.3), grey(0.08), 0.6, 0.9);
    blurDraw(g, [1044, 340, 1098, 356], 0.6, (c) => curve(c, [[1050, 349.5], [1058, 347.6], [1065, 347.2], [1070, 348], [1075, 347.3], [1082, 347.6], [1091.7, 350]], 2.2, grey(0.16), { seed: 1745, ends: 0.2 }));
    curve(g, [[1061, 342.4], [1071, 341.5], [1081, 342.4]], 0.9, grey(0.45, 0.4), { seed: 1746 });
    curve(g, [[1063, 356.2], [1073, 357.8], [1084, 356.2]], 1, grey(0.35, 0.55), { seed: 1747 });
    fillBlob(g, [[992, 262], [1012, 254], [1018, 266], [1016, 296], [1004, 300], [1004, 322], [1012, 330], [1016, 350], [1004, 362], [994, 352], [988, 320], [989, 285]], HK);
    fillBlob(g, [[1124, 252], [1146, 262], [1150, 285], [1151, 312], [1148, 334], [1140, 350], [1128, 344], [1130, 322], [1138, 318], [1136, 298], [1126, 294], [1124, 272]], HK);
    for (const [pts, seed] of [[[[1019, 304], [1012, 302], [1007, 308], [1008, 316], [1013, 321], [1019, 319]], 1690], [[[1123, 299], [1131, 298], [1137, 303], [1137, 312], [1132, 318], [1124, 316]], 1691]]) {
      soft(g, pth(pts), grey(0.24), 1);
      curve(g, pts.slice(1, 5), 1.1, grey(0.55, 0.7), { seed, ends: 0.3 });
    }
    const rh = rng(1905);
    const LK = [
      // his right side (our left): [root, mid, tip], root width
      [[996, 264], [991, 304], [993, 340], [996, 362], 10],
      [[1003, 266], [1e3, 300], [1002, 334], [1006, 368], 9],
      [[1012, 262], [1016, 280], [1017, 298], 7],
      [[1008, 318], [1015, 338], [1022, 360], 8],
      [[1014, 322], [1022, 342], [1030, 358], 5],
      [[994, 330], [988, 350], [983, 366], 5],
      [[1e3, 300], [998, 322], [1001, 344], 6],
      // his left side (our right)
      [[1146, 264], [1150, 300], [1149, 332], [1143, 354], 10],
      [[1140, 262], [1142, 295], [1140, 330], [1135, 356], 8],
      [[1130, 258], [1127, 280], [1125, 297], 6],
      [[1128, 318], [1124, 338], [1116, 354], 6],
      [[1135, 318], [1133, 340], [1128, 359], 6],
      [[1150, 290], [1156, 318], [1161, 344], 5],
      [[1142, 300], [1144, 324], [1141, 346], 5]
    ];
    for (const l of LK) {
      const w = l[l.length - 1], pts = l.slice(0, -1);
      strand(g, pts, w, 0.3, HK);
      strand(g, pts.map(([x, y], i) => [x + (i ? (rh() - 0.5) * 3 : 0), y]), w * 0.25, 0.1, grey(0.3, 0.5));
    }
    for (const [side, x0, x1, y1] of [[-1, 990, 1018, 330], [1, 1124, 1150, 320]]) {
      for (let i = 0; i < 16; i++) {
        const x = lerp(x0, x1, rh()), y = 260 + rh() * (y1 - 275), len = 24 + rh() * 36, out = side * (1 + rh() * 6);
        strand(g, [[x, y], [x + out * 0.3, y + len * 0.5], [x + out, y + len]], 0.7 + rh() * 0.9, 0.15, grey(0.2 + rh() * 0.18, 0.6));
      }
    }
    for (let i = 0; i < 14; i++) {
      const t = i / 13, yL = 270 + t * 70, yR = 266 + t * 72;
      const xl = lerp(1017, 1022, t) + rh() * 2, xr = lerp(1125, 1120, t) - rh() * 2;
      if (i % 2) strand(g, [[xl - 3, yL], [xl + rh() * 2, yL + 12], [xl + 1 + rh() * 3, yL + 20 + rh() * 8]], 1.2 + rh() * 1.2, 0.2, HK);
      else strand(g, [[xr + 3, yR], [xr - rh() * 2, yR + 12], [xr - 1 - rh() * 3, yR + 20 + rh() * 8]], 1.2 + rh() * 1.2, 0.2, HK);
    }
    const B2 = [
      [991, 284],
      [989, 262],
      [989, 240],
      [992, 218],
      [999, 197],
      [1010, 181],
      [1025, 169],
      [1045, 162],
      [1068, 159.5],
      [1090, 161.5],
      [1110, 168],
      [1126, 178],
      [1137, 193],
      [1143, 210],
      [1146, 230],
      [1147, 250],
      [1147, 270],
      [1142, 276],
      [1132, 264],
      [1112, 252],
      [1085, 245],
      [1060, 244],
      [1035, 247],
      [1015, 256],
      [1001, 272]
    ];
    const fold = [[990, 223], [1015, 212], [1035, 206], [1067, 202], [1100, 205], [1125, 211], [1146, 222]];
    fillBlob(g, B2, grey(0.2));
    g.save();
    g.beginPath();
    smoothPath(g, B2, true);
    g.clip();
    soft(g, pth(B2), rg(g, 1068, 196, 10, 95, [[0, 0.27], [0.5, 0.22], [0.8, 0.15], [1, 0.08]]));
    soft(g, pth([[985, 204], [1070, 196], [1150, 204], [1150, 222], [1070, 214], [985, 224]]), grey(0.3), 4, 0.6);
    soft(g, pth([[985, 250], [1070, 238], [1150, 250], [1150, 290], [985, 290]]), grey(0.12), 6, 0.6);
    const rb = rng(1750);
    for (let i = 0; i < 68; i++) {
      const x = 991 + i * 2.35 + rb() * 0.6, d = (x - 1068) / 80;
      curve(g, [[1068 + (x - 1068) * 0.5, 162 + d * d * 22], [1068 + (x - 1068) * 0.85, 184 + d * d * 14], [x, 204]], 0.7, grey(0.08, 0.14), { seed: 1751 + i, ends: 0.4 });
      ink(g, [[x, 214], [x + d * 2, 290]], 0.9, grey(rb() < 0.35 ? 0.3 : 0.06, 0.22), { seed: 1830 + i });
    }
    g.restore();
    curve(g, fold, 1.8, grey(0.04, 0.8), { seed: 1900, ends: 0.3 });
    curve(g, B2, 1.2, grey(0.3, 0.6), { closed: true, seed: 1902, ends: 0.9 });
    const FR = [
      [[1010, 252], [1030, 245], [1046, 245], [1046, 250], [1040, 257], [1035, 263], [1030, 268], [1027, 273], [1024, 280], [1021, 288], [1020, 302], [1010, 302]],
      [[1099, 246], [1116, 247], [1136, 255], [1136, 302], [1124, 302], [1124, 290], [1120, 282], [1116, 274], [1112, 268], [1108, 262], [1104, 256], [1099, 251]],
      [[1046, 243], [1083, 242], [1082, 249], [1072, 252.5], [1062, 251.5], [1055, 252.5], [1046, 250]],
      [[1063.5, 248], [1062.5, 258], [1062.5, 266], [1061, 276], [1058, 284], [1055, 290], [1052, 298], [1053.5, 299], [1056.5, 292], [1059.5, 286], [1063.5, 280], [1067, 272], [1068.5, 262], [1069.5, 252], [1070.5, 246]]
    ];
    const L = [
      [[[1026, 248], [1031, 258], [1034, 266]], 5, 0.4],
      [[[1034, 247], [1038, 254], [1040, 259]], 4, 0.3],
      [[[1018, 250], [1024, 262], [1027, 274]], 5, 0.4],
      [[[1075, 248], [1075, 256], [1073, 263]], 4, 0.3],
      [[[1104, 250], [1108, 258], [1112, 266], [1115, 274]], 4, 0.4],
      [[[1112, 250], [1117, 260], [1120, 270], [1121, 282]], 5, 0.4]
    ];
    blurDraw(g, [1e3, 236, 1142, 312], 0.45, (c) => {
      for (const f of FR) fillBlob(c, f, HK);
      for (const [pts, w0, w1] of L) strand(c, pts, w0, w1, HK);
      strand(c, [[1057, 250], [1056, 262], [1053, 272], [1050, 282]], 3, 0.5, grey(0.22));
    });
    for (const [pts, w0] of L) strand(g, pts.map(([x, y], i) => [x - 0.6, y + (i ? 0.5 : 0)]), w0 * 0.22, 0.1, grey(0.34, 0.5));
    blurDraw(g, [1040, 240, 1100, 310], 0.4, (c) => {
      for (const [pts, w] of [
        [[[1070, 250], [1068, 266], [1064, 282], [1060, 296]], 1.8],
        [[[1074, 250], [1074, 264], [1071, 278]], 1.4],
        [[[1066, 252], [1061, 270], [1056, 288], [1054, 302]], 1.6],
        [[[1078, 250], [1080, 262], [1079, 274]], 1.3],
        [[[1052, 252], [1048, 262], [1044, 270]], 1.4],
        [[[1084, 252], [1088, 262], [1092, 270]], 1.3]
      ]) strand(c, pts, w, 0.25, grey(0.04, 0.9));
    });
    for (const [x0, y0, x1, y1] of [[1014, 262, 1016, 286], [1066, 252, 1061, 280], [1064, 256, 1058, 286], [1128, 262, 1130, 296]]) strand(g, [[x0, y0], [(x0 + x1) / 2 + 1, (y0 + y1) / 2], [x1, y1]], 1, 0.2, grey(0.32, 0.5));
    for (const [x, y, r] of [[1047.5, 252.5, 1.5], [1089, 255, 1.5], [1040.5, 319, 1.4], [1106, 336, 1.6], [1084, 300.5, 1.1]]) {
      soft(g, E(x, y + 0.6, r * 0.8, r * 1.1, 0), grey(0.35), 0.5, 0.7);
      dot(g, x - 0.3, y, r * 0.35, grey(0.97, 0.9));
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
    const pl = [[772, 522], [1510, 521], [1514, 530], [1512, 543], [772, 544], [768, 533]];
    brush(
      g,
      pl,
      (v) => {
        v.fillStyle = lg(v, 770, 0, 1514, 0, [[0, 0.42], [0.2, 0.62], [0.5, 0.7], [0.8, 0.62], [1, 0.45]]);
        v.fillRect(766, 518, 752, 30);
        v.globalCompositeOperation = "multiply";
        v.fillStyle = lg(v, 0, 521, 0, 544, [[0, grey(1)], [0.6, grey(0.9)], [1, grey(0.65)]]);
        v.fillRect(766, 518, 752, 30);
      },
      0,
      { len: 60, w: 2, gap: 1.4, seed: 2010, jit: 0.03, base: 0.5, gain: 0.9 }
    );
    const r = rng(2014);
    for (let i = 0; i < 5; i++) {
      const x = 800 + r() * 690, y = 530 + r() * 10;
      soft(g, E(x, y, 4 + r() * 5, 1.2, 0), grey(0.2), 0.8, 0.5);
    }
    ink(g, [[772, 522], [1510, 521]], 1.6, grey(0.95), { seed: 2011 });
    ink(g, [[772, 544], [1512, 543]], 1.6, BLK, { seed: 2012 });
    fillPoly(g, [[772, 544], [1510, 543], [1508, 556], [774, 557]], "#040404");
  }
  function mug(g) {
    const body = [[818, 472], [870, 472], [866, 521], [822, 521]];
    soft(g, pth(body, false), lg(g, 818, 0, 870, 0, [[0, 0.6], [0.35, 0.97], [0.7, 0.93], [1, 0.7]]));
    for (let i = 0; i < 5; i++) ink(g, [[826 + i * 9, 478], [827 + i * 9, 516]], 1, grey(0.5, 0.35), { seed: 2020 + i });
    ink(g, [[818, 472], [822, 521], [866, 521], [870, 472]], 1.5, BLK, { seed: 2025 });
    g.fillStyle = grey(0.85);
    g.beginPath();
    g.ellipse(844, 472, 26, 4.5, 0, 0, PI * 2);
    g.fill();
    g.fillStyle = grey(0.12);
    g.beginPath();
    g.ellipse(844, 473, 22, 3, 0, 0, PI * 2);
    g.fill();
    g.lineCap = "round";
    for (const [x, s] of [[818, -1], [870, 1]]) {
      g.strokeStyle = grey(0.1);
      g.lineWidth = 6;
      g.beginPath();
      g.ellipse(x, 500, 13, 14, 0, s < 0 ? PI * 0.5 : -PI * 0.5, s < 0 ? PI * 1.5 : PI * 0.5);
      g.stroke();
      g.strokeStyle = grey(0.9);
      g.lineWidth = 3.4;
      g.beginPath();
      g.ellipse(x, 500, 13, 14, 0, s < 0 ? PI * 0.5 : -PI * 0.5, s < 0 ? PI * 1.5 : PI * 0.5);
      g.stroke();
    }
    for (const [pts, seed] of [[[[841, 469], [830, 451], [837, 434], [829, 417], [821, 400], [830, 383]], 2030], [[[844, 466], [839, 446], [846, 426], [836, 411], [837, 391], [850, 371]], 2031]]) {
      blurDraw(g, bboxOf(pts, 3), 0.7, (c) => curve(c, pts, 2.6, grey(0.8, 0.8), { seed, ends: 0.1 }));
    }
  }
  function lampAndGear(g) {
    for (const [a, b, w, v] of [[[1425, 335], [1422, 422], 1.4, 0.22], [[1432, 322], [1492, 388], 1.4, 0.3], [[1440, 318], [1498, 384], 1, 0.2], [[1488, 400], [1473, 432], 1.6, 0.28], [[1496, 402], [1480, 434], 1, 0.2]])
      ink(g, [a, b], w, grey(v), { seed: a[0] * 3 + a[1] });
    dot(g, 1494, 391, 8, grey(0.05));
    ring(g, 1494, 391, 7, 1.4, grey(0.28));
    dot(g, 1494, 391, 2.2, grey(0.35));
    dot(g, 1435, 318, 5, grey(0.08));
    ring(g, 1435, 318, 5, 1.1, grey(0.25));
    const neck = [[1385, 300], [1409, 284], [1420, 300], [1397, 314]];
    soft(g, pth(neck, false), lg(g, 1385, 284, 1420, 314, [[0, 0.5], [0.4, 0.85], [0.7, 0.35], [1, 0.12]]));
    curve(g, neck, 1.2, grey(0.03), { closed: true, seed: 2046, ends: 0.9 });
    fillPoly(g, [[1406, 285], [1418, 278], [1424, 287], [1412, 294]], grey(0.4));
    const rimC = [1361.5, 355], rimA = 0.588, rx = 45, ry = 9.5;
    const rimPt = (t) => [rimC[0] + Math.cos(t) * rx * Math.cos(rimA) - Math.sin(t) * ry * Math.sin(rimA), rimC[1] + Math.cos(t) * rx * Math.sin(rimA) + Math.sin(t) * ry * Math.cos(rimA)];
    const shade = [rimPt(PI), [1340, 318], [1362, 305], [1386, 300], [1400, 306], [1408, 318], [1410, 340], [1404, 362], rimPt(0)];
    soft(g, pth(shade), lg(g, 1330, 300, 1410, 380, [[0, 0.3], [0.35, 0.16], [1, 0.05]]));
    blurDraw(g, [1340, 300, 1405, 345], 2, (c) => curve(c, [[1352, 322], [1372, 311], [1394, 306]], 5, grey(0.75, 0.8), { seed: 2044, ends: 0.3 }));
    curve(g, shade, 1.3, grey(0.02), { seed: 2045, ends: 0.8 });
    g.save();
    g.translate(rimC[0], rimC[1]);
    g.rotate(rimA);
    soft(g, E(3, -9, 34, 16, 0), grey(0.9), 3, 0.9);
    g.fillStyle = grey(0.97);
    g.beginPath();
    g.ellipse(0, 0, rx, ry, 0, 0, PI * 2);
    g.fill();
    g.strokeStyle = grey(0.35);
    g.lineWidth = 1.2;
    g.beginPath();
    g.ellipse(0, 0, rx, ry, 0, 0, PI * 2);
    g.stroke();
    g.strokeStyle = grey(0.55, 0.8);
    g.lineWidth = 1.2;
    g.beginPath();
    g.ellipse(-4, -2, 13, 5, 0, 0.2, PI - 0.2);
    g.stroke();
    g.restore();
    for (const [x0, y0, x1, y1] of [[1297, 452, 1291, 418], [1304, 452, 1300, 412], [1311, 452, 1311, 416], [1318, 452, 1322, 414], [1325, 452, 1333, 422], [1302, 452, 1286, 428]]) {
      ink(g, [[x0, y0], [x1, y1]], 2.8, grey(0.03), { seed: x1 * 7 });
      ink(g, [[x0, y0], [x1, y1]], 1.8, grey(0.8), { seed: x1 * 7 + 1 });
    }
    const cup = [[1293, 452], [1332, 452], [1331, 500], [1294, 500]];
    tex(g, cup, (v) => {
      v.fillStyle = lg(v, 1293, 0, 1332, 0, [[0, 0.12], [0.35, 0.35], [0.5, 0.8], [0.62, 0.3], [1, 0.1]]);
      v.fillRect(1290, 450, 45, 52);
    }, 0, { per: 2.6, seed: 2050, wExp: 0.6, bg: 0.35 });
    ink(g, cup, 1.2, grey(0.03), { closed: true, seed: 2051 });
    g.fillStyle = grey(0.7);
    g.beginPath();
    g.ellipse(1312.5, 452, 19.5, 3, 0, 0, PI * 2);
    g.fill();
    g.fillStyle = grey(0.1);
    g.beginPath();
    g.ellipse(1312.5, 452.5, 16, 2, 0, 0, PI * 2);
    g.fill();
    stripes(g, [[1282, 500], [1340, 500], [1344, 516], [1280, 516]], { dir: "h", per: 3, cov: bl(0.19, 0.18, 0.08, 0.26), lum: 1, seed: 2052 });
    book(g, [[1196, 490], [1262, 488], [1264, 505], [1197, 506]], { seed: 2060, k: 0.9 });
    book(g, [[1190, 505], [1270, 504], [1271, 521], [1191, 522]], { seed: 2062, k: 0.85 });
    book(g, [[1352, 437], [1482, 434], [1484, 456], [1353, 458]], { seed: 2070, k: 0.8 });
    const nb = [[1356, 423], [1418, 420], [1434, 426], [1436, 437], [1356, 438]];
    tex(g, nb, (v) => {
      v.fillStyle = lg(v, 0, 420, 0, 438, [[0, 0.92], [1, 0.62]]);
      v.fillRect(1350, 418, 90, 22);
    }, 0, { per: 2.2, seed: 2071, smooth: false, wExp: 0.6, bg: 0.4 });
    curve(g, nb, 1.2, grey(0.03), { closed: true, seed: 2072, ends: 0.9 });
    curve(g, [[1400, 421], [1420, 418], [1432, 424]], 1.4, grey(0.9), { seed: 2073 });
    const rx0 = 1355, rx1 = 1486, ry0 = 457, ry1 = 520;
    brush(g, [[rx0, ry0], [rx1, ry0], [rx1, ry1], [rx0, ry1]], (v) => {
      v.fillStyle = lg(v, rx0, 0, rx1, 0, [[0, 0.2], [0.5, 0.26], [1, 0.15]]);
      v.fillRect(rx0, ry0, rx1 - rx0, ry1 - ry0);
    }, PI / 2, { len: 10, w: 2, gap: 1.8, seed: 2074, jit: 0.2, base: 0.6 });
    ink(g, [[rx0, ry0], [rx1, ry0], [rx1, ry1], [rx0, ry1]], 1.4, grey(0.03), { closed: true, seed: 2075 });
    ink(g, [[rx0, ry0 + 1], [rx1, ry0 + 1]], 1.2, grey(0.8), { seed: 2076 });
    ink(g, [[rx0 + 2, 485], [rx1 - 2, 485]], 1.1, grey(0.45), { seed: 2077 });
    for (const [x, y, r, lit] of [[1368, 472, 6.5, 0.6], [1412, 475, 7.5, 0.95], [1436, 473, 6, 0.55]]) {
      dot(g, x, y, r, grey(0.05));
      ring(g, x, y, r - 1, 1.4, grey(0.55));
      soft(g, E(x - 1, y - 1.5, r * 0.55, r * 0.45, 0), grey(lit));
      dot(g, x - 1.5, y - 2.5, 1.3, grey(0.95));
    }
    fillPoly(g, [[1373, 466], [1386, 466], [1386, 470], [1373, 470]], grey(0.6));
    fillPoly(g, [[1450, 467], [1476, 467], [1476, 483], [1450, 483]], grey(0.9));
    fillPoly(g, [[1453, 470], [1473, 470], [1473, 480], [1453, 480]], grey(0.35));
    for (const x of [1366, 1388, 1411, 1436, 1466]) {
      dot(g, x, 503, 6.5, grey(0.04));
      ring(g, x, 503, 6, 1.5, grey(0.6));
      dot(g, x, 503, 2.5, grey(0.02));
    }
  }
  function cable(g, pts, w = 5, seed = 1, lit = 0.75) {
    w *= 1.4;
    curve(g, pts, w, "#030303", { seed, ends: 0.85 });
    curve(g, pts.map(([x, y]) => [x - w * 0.22, y - w * 0.1]), Math.max(0.9, w * 0.2), grey(0.8, lit * 0.55), { seed: seed + 1, ends: 0.3 });
  }
  function cables(g) {
    cable(g, [[918, 506], [912, 520], [908, 540], [904, 580], [898, 630], [886, 700], [862, 780], [842, 840], [832, 872]], 5.5, 2100);
    cable(g, [[926, 510], [938, 520], [948, 534], [950, 548], [940, 564], [926, 592], [914, 640], [904, 700], [886, 770], [856, 820], [812, 840], [768, 836]], 5, 2102);
    cable(g, [[926, 522], [934, 548], [952, 562]], 4, 2104);
    cable(g, [[841, 794], [822, 850], [785, 875], [740, 884]], 4, 2106, 0.6);
    for (const [pts, w, sd] of [
      [[[1367, 509], [1372, 560], [1380, 600], [1390, 700], [1410, 800], [1440, 870]], 4.6, 2112],
      [[[1388, 509], [1395, 560], [1418, 620], [1440, 690], [1462, 760], [1476, 850]], 4.4, 2114],
      [[[1414, 509], [1420, 560], [1430, 620], [1438, 700], [1446, 790], [1452, 860]], 4.2, 2116],
      [[[1435, 509], [1446, 560], [1470, 620], [1480, 700], [1490, 830], [1500, 870]], 4.4, 2118],
      [[[1466, 509], [1476, 560], [1486, 620], [1496, 700]], 4.2, 2120]
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
    stripes(g, [[1340, 703], [1520, 702], [1520, 712], [1340, 713]], { dir: "h", per: 2.8, cov: bl(0.06, 0.17, 0.36, 0.06), lum: 1, seed: 2200 });
    stripes(g, [[1340, 713], [1520, 712], [1520, 728], [1340, 729]], { dir: "h", per: 3, cov: bl(0.06, 0.37, 0.15, 0.04), lum: 1, seed: 2201 });
    stripes(g, [[1320, 742], [1525, 741], [1525, 768], [1320, 769]], { dir: "h", per: 3, cov: bl(0.17, 0.28, 0.32, 0.19), lum: 1, seed: 2202 });
    for (const x of [1360, 1510]) {
      stripes(g, [[x, 769], [x + 15, 769], [x + 15, 852], [x, 852]], { per: 3, cov: ug(0.9, 0.4), lum: 0.9, seed: 2203 + x });
      for (const y of [780, 840]) ink(g, [[x - 2, y], [x + 17, y]], 2, grey(0.85), { seed: y + x });
    }
    const cab = [[1498, 576], [1608, 576], [1612, 590], [1612, 760], [1606, 770], [1500, 770], [1494, 760], [1494, 590]];
    brush(g, cab, (v) => {
      v.fillStyle = lg(v, 1494, 0, 1612, 0, [[0, 0.24], [0.45, 0.32], [1, 0.2]]);
      v.fillRect(1490, 572, 126, 202);
    }, PI / 2, { len: 22, w: 2.2, gap: 1.8, seed: 2211, jit: 0.08, base: 0.6 });
    curve(g, cab, 1.6, grey(0.02), { closed: true, seed: 2212, ends: 0.9 });
    face(g, [[1502, 553], [1596, 553], [1606, 576], [1496, 576]], [0.66, 0.6, 0.45, 0.5], "h", { per: 2.8, seed: 2210 });
    ink(g, [[1502, 553], [1596, 553]], 1.3, grey(0.9), { seed: 2213 });
    ink(g, [[1496, 576], [1606, 576]], 1.4, BLK, { seed: 2214 });
    driver(g, 1552, 612, 13, "tweeter");
    dot(g, 1550, 686, 50, grey(0.05));
    ring(g, 1550, 686, 48, 2, grey(0.22));
    ring(g, 1550, 686, 38, 8, grey(0.16));
    soft(g, E(1550, 686, 33, 33, 0), rg(g, 1545, 680, 10, 34, [[0, 0.85], [0.6, 0.72], [1, 0.4]]));
    g.save();
    g.beginPath();
    g.arc(1550, 686, 33, 0, PI * 2);
    g.clip();
    const rw = rng(2215);
    for (let i = 0; i < 60; i++) {
      const a = rw() * PI * 2, l0 = 16 + rw() * 5, l1 = 26 + rw() * 7;
      ink(g, [[1550 + Math.cos(a) * l0, 686 + Math.sin(a) * l0], [1550 + Math.cos(a) * l1, 686 + Math.sin(a) * l1]], 1, grey(rw() < 0.5 ? 0.35 : 1, 0.35), { seed: 2216 + i });
    }
    g.restore();
    dot(g, 1550, 686, 14, grey(0.04));
    dot(g, 1549, 684, 1.6, grey(0.8));
    ring(g, 1550, 686, 33, 1.2, grey(0.2));
    dot(g, 1551, 776, 20, grey(0.04));
    ring(g, 1551, 776, 19, 1.4, grey(0.4));
  }
  function darkBox(g, pts, edge = 0.35, seed = 1) {
    stripes(g, pts, { per: 6.2, cov: fadeEdges(bl(0.12, 0.08, 0.05, 0.08), 0.05, 0.05), lum: 0.5, seed });
    ink(g, [pts[0], pts[1]], 1.3, grey(0.6, edge), { seed: seed + 1 });
  }
  function rightBack(g) {
    stripes(g, [[1822, 128], [1905, 118], [1905, 242], [1822, 246]], { per: 6.2, cov: fadeEdges(bl(0.35, 0.3, 0.3, 0.3), 0.02, 0.02), lum: 0.6, seed: 2300 });
    ink(g, [[2090, 95], [2165, 95], [2165, 215]], 1.2, grey(0.3), { seed: 2301 });
    darkBox(g, [[1722, 246], [1796, 250], [1798, 332], [1722, 332]], 0.4, 2302);
    darkBox(g, [[1688, 330], [1800, 334], [1802, 420], [1688, 420]], 0.3, 2303);
    darkBox(g, [[1726, 405], [1812, 413], [1812, 470], [1726, 470]], 0.7, 2304);
    stripes(g, [[1800, 415], [1845, 418], [1845, 450], [1800, 450]], { per: 4, cov: bl(0.16, 0.17, 0.13, 0.11), lum: 1, seed: 2305 });
    const S = [
      [[[1586, 287], [1720, 250], [1721, 330], [1587, 358]], 0.95, 2310],
      [[[1619, 354], [1687, 331], [1687, 418], [1620, 428]], 0.92, 2311],
      [[[1588, 437], [1725, 406], [1726, 552], [1588, 560]], 0.9, 2312]
    ];
    for (const [q, v, seed] of S) {
      stripes(g, q, { per: 6.2, cov: fadeEdges(bl(v * 0.8, v * 0.68, v * 0.46, v * 0.56), 0.03, 0.03), lum: 0.92, seed });
      ink(g, [q[0], q[1]], 1.8, grey(0.92), { seed: seed + 1 });
    }
    fillPoly(g, [[1570, 360], [1604, 356], [1606, 450], [1572, 452]], grey(0.26));
    ink(g, [[1570, 360], [1604, 356], [1606, 450], [1572, 452]], 1.4, grey(0.8), { closed: true, seed: 2314 });
    dot(g, 1588, 408, 11, grey(0.12));
    ring(g, 1588, 408, 11, 2, grey(0.85));
    ring(g, 1588, 408, 6, 1.2, grey(0.6));
    for (const [cx, cy, rx, ry, a] of [[1655, 236, 22, 14, -0.15], [1702, 228, 20, 13, 0.1]]) {
      g.save();
      g.translate(cx, cy);
      g.rotate(a);
      soft(g, E(0, 0, rx, ry, 0), grey(0.05));
      g.strokeStyle = grey(0.32, 0.9);
      g.lineWidth = 1.6;
      g.beginPath();
      g.ellipse(0, -1, rx - 2, ry - 2, 0, PI * 1.05, PI * 1.95);
      g.stroke();
      g.strokeStyle = grey(0.22, 0.8);
      g.lineWidth = 1.2;
      g.beginPath();
      g.ellipse(0, 0, rx * 0.6, ry * 0.55, 0, PI * 1.1, PI * 1.9);
      g.stroke();
      for (let k = 0; k < 5; k++) {
        const t = PI * (1.15 + k * 0.15);
        ink(g, [[Math.cos(t) * (rx - 3), Math.sin(t) * (ry - 3)], [Math.cos(t) * (rx + 0.5), Math.sin(t) * (ry + 0.5)]], 1, grey(0.4, 0.7), { seed: 2317 + k });
      }
      g.restore();
    }
    cable(g, [[1636, 234], [1644, 214], [1676, 204], [1712, 208], [1728, 222]], 3.2, 2316, 0.5);
    const r = rng(2320);
    for (let i = 0; i < 12; i++) {
      const x0 = 1745 + r() * 100, y0 = 245 + r() * 20, dx = (r() - 0.3) * 60;
      cable(g, [[x0, y0], [x0 + dx * 0.3 + 10, y0 + 60 + r() * 20], [x0 + dx * 0.7, y0 + 120 + r() * 40], [x0 + dx, y0 + 170 + r() * 60]], 2.4 + r() * 1.6, 2321 + i, 0.55);
    }
    for (const [pts, w, sd] of [
      [[[1770, 250], [1760, 290], [1776, 332], [1810, 352], [1840, 332], [1846, 290], [1830, 262]], 3, 2326],
      [[[1790, 262], [1782, 300], [1796, 336], [1822, 346], [1836, 310]], 2.6, 2327],
      [[[1850, 240], [1858, 280], [1850, 330], [1862, 380], [1880, 412]], 3, 2328],
      [[[1868, 236], [1880, 300], [1872, 360], [1890, 410]], 2.4, 2329]
    ]) cable(g, pts, w, sd, 0.5);
    ink(g, [[1780, 413], [1893, 413]], 1.4, grey(0.5), { seed: 2325 });
    stripes(g, [[1880, 245], [1937, 225], [1938, 405], [1881, 408]], { per: 6.2, cov: bl(0.16, 0.14, 0.27, 0.33), lum: 1, seed: 2330 });
    ink(g, [[1880, 245], [1937, 225]], 1.6, grey(0.9), { seed: 2331 });
    stripes(g, [[1932, 378], [2085, 330], [2086, 455], [1932, 487]], { per: 6.2, cov: bl(0.44, 0.37, 0.37, 0.5), lum: 1, seed: 2332 });
    ink(g, [[1932, 378], [2085, 330]], 1.8, grey(0.92), { seed: 2333 });
    stripes(g, [[1932, 487], [2086, 455], [2087, 552], [1932, 556]], { per: 6.2, cov: bl(0.5, 0.56, 0.34, 0.2), lum: 1, seed: 2334 });
    ink(g, [[1932, 487], [2086, 455]], 1.6, BLK, { seed: 2335 });
    fillPoly(g, [[1968, 356], [2010, 344], [2012, 356], [1970, 368]], grey(0.8));
    stripes(g, [[2105, 335], [2155, 335], [2155, 356], [2105, 356]], { per: 4, cov: bl(0.07, 0.05, 0.1, 0.11), lum: 1, seed: 2336 });
    stripes(g, [[2130, 460], [2165, 460], [2165, 492], [2130, 492]], { per: 4, cov: 0.4, lum: 0.7, seed: 2337 });
    ink(g, [[2060, 336], [2176, 334]], 2.4, grey(0.7), { seed: 2340 });
    const pot = [[2084, 288], [2150, 286], [2145, 332], [2090, 334]];
    stripes(g, pot, { dir: "h", per: 3.4, cov: (u, v) => lerp(0.15, 0.62, Math.sin(PI * clamp2(u * 0.8 + 0.1))) * (1 - 0.3 * u), lum: 0.9, seed: 2341, brk: 0.2 });
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
    RL.forEach(([x, y, a, s], i) => {
      const out = Math.atan2(y - 300, x - 2115), dn = PI / 2, m = 0.55;
      const ang = Math.atan2(Math.sin(out) * (1 - m) + Math.sin(dn) * m, Math.cos(out) * (1 - m) + Math.cos(dn) * m);
      leaf(g, x, y - 12, ang, s * 1.15, 0.5 + i % 3 * 0.08, 2350 + i * 3);
    });
    curve(g, [[2046, 300], [2040, 340], [2046, 380], [2040, 420], [2046, 450]], 1.1, grey(0.5, 0.6), { seed: 2349 });
    [[2040, 318, 2.6, 22], [2046, 340, 1, 22], [2040, 362, 2.2, 22], [2046, 385, 1.2, 22], [2040, 408, 2, 20], [2046, 430, 1.4, 20]].forEach(([x, y, a, s], i) => leaf(g, x, y, a, s * 1.3, 0.7, 2400 + i * 3));
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
    stripes(g, quad(0.35, 0, 0.98, 0.2), { dir: "h", per: 3, cov: 0.22, lum: 0.75, seed: 2503, brk: 0.2 });
    for (const [uu, vv] of [[0.48, 0.07], [0.72, 0.05], [0.52, 0.15], [0.78, 0.13]]) {
      const [x, y] = at(uu, vv);
      dot(g, x, y, 7, grey(0.07));
      ring(g, x, y, 7, 1.6, grey(0.85));
      dot(g, x - 2, y - 2, 1.6, grey(0.9));
    }
    const k0 = 0.22, k1 = 0.99, nk = 22;
    soft(g, pth(quad(0.5, k0, 0.86, k1), false), lg(g, 1690, 0, 1740, 0, [[0, grey(0.72)], [0.5, grey(0.9)], [1, grey(0.8)]]));
    for (let i = 0; i <= nk; i++) {
      const v = k0 + (k1 - k0) * (i / nk);
      ink(g, [at(0.5, v), at(0.86, v)], 0.9, grey(0.35, 0.6), { seed: 2510 + i, jit: 0.1 });
    }
    for (let i = 0; i < nk; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) {
      const v = k0 + (k1 - k0) * ((i + 0.7) / nk), h = (k1 - k0) * 0.6 / nk;
      fillPoly(g, quad(0.5, v, 0.7, v + h), "#060606");
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
    stripes(g, [[1682, 792], [1722, 792], [1722, 842], [1682, 842]], { per: 4.5, cov: bl(0.25, 0.39, 0.43, 0.41), lum: 1, seed: 2545 });
    stripes(g, [[1752, 830], [1778, 829], [1779, 860], [1753, 861]], { dir: "h", per: 3, cov: bl(0.7, 0.47, 0.25, 0.37), lum: 1, seed: 2546 });
    dot(g, 1761, 846, 2.6, grey(0.05));
    stripes(g, [[1530, 862], [1600, 860], [1602, 878], [1532, 880]], { dir: "h", per: 3, cov: bl(0.51, 0.76, 0.24, 0.16), lum: 1, seed: 2547 });
  }
  function metalBar(g, a, b, w, seed) {
    ink(g, [a, b], w, grey(0.62), { seed, jit: 0.2, ends: 0.95 });
    const n = [-(b[1] - a[1]), b[0] - a[0]], l = Math.hypot(n[0], n[1]);
    const off = (k) => [[a[0] + n[0] / l * k, a[1] + n[1] / l * k], [b[0] + n[0] / l * k, b[1] + n[1] / l * k]];
    ink(g, off(-w * 0.28), w * 0.22, grey(0.85), { seed: seed + 1, jit: 0.2, ends: 0.95 });
    ink(g, off(w * 0.12), w * 0.12, grey(0.3), { seed: seed + 2, jit: 0.2, ends: 0.95 });
    ink(g, off(w * 0.42), w * 0.1, grey(0.2), { seed: seed + 3, jit: 0.2, ends: 0.95 });
  }
  function rightLow(g) {
    const body = [[1797, 510], [1968, 516], [1992, 540], [1998, 600], [1990, 650], [1797, 654]];
    fillBlob(g, body, "#050505");
    curve(g, [[1968, 516], [1990, 536], [1998, 600], [1990, 650]], 2, grey(0.55), { seed: 2600 });
    metalBar(g, [1818, 530], [1952, 530], 11, 2601);
    metalBar(g, [1800, 586], [1964, 586], 20, 2602);
    metalBar(g, [1809, 526], [1809, 650], 18, 2603);
    metalBar(g, [1956, 530], [1956, 650], 14, 2604);
    fillPoly(g, [[1852, 513], [1920, 513], [1920, 523], [1852, 523]], grey(0.75));
    ink(g, [[1852, 513], [1920, 513]], 1.2, grey(0.95), { seed: 2605 });
    ink(g, [[1852, 523], [1920, 523]], 1.2, BLK, { seed: 2606 });
    for (const [x, y] of [[1812, 535], [1951, 538], [1812, 586], [1952, 586]]) {
      fillPoly(g, [[x - 12, y - 11], [x + 12, y - 11], [x + 12, y + 12], [x - 12, y + 12]], grey(0.72));
      ink(g, [[x - 12, y - 11], [x + 12, y - 11], [x + 12, y + 12], [x - 12, y + 12]], 1.3, BLK, { closed: true, seed: x + y });
      dot(g, x - 3, y - 3, 2.6, grey(0.1));
      dot(g, x - 3.5, y - 3.5, 1, grey(0.9));
    }
    fillPoly(g, [[1900, 568], [1932, 568], [1932, 614], [1900, 614]], grey(0.8));
    ink(g, [[1900, 568], [1932, 568], [1932, 614], [1900, 614]], 1.6, BLK, { closed: true, seed: 2610 });
    fillPoly(g, [[1906, 576], [1926, 576], [1926, 606], [1906, 606]], grey(0.25));
    fillPoly(g, [[1909, 590], [1923, 590], [1923, 600], [1909, 600]], grey(0.6));
    const lid = [[1992, 553], [2085, 543], [2082, 630], [2e3, 650]];
    brush(g, lid, (v) => {
      v.fillStyle = lg(v, 1992, 545, 2085, 650, [[0, 0.82], [0.6, 0.7], [1, 0.45]]);
      v.fillRect(1988, 540, 100, 114);
    }, 2, { len: 20, w: 2, gap: 1.6, seed: 2620, jit: 0.15, base: 0.55 });
    ink(g, lid, 1.4, BLK, { closed: true, seed: 2621 });
    ink(g, [lid[0], lid[1]], 1.2, grey(0.9), { seed: 2622 });
    face(g, [[1776, 650], [1857, 650], [1858, 834], [1778, 836]], [0.45, 0.62, 0.5, 0.25], "v", { seed: 2630 });
    ink(g, [[1776, 650], [1857, 650]], 1.6, grey(0.9), { seed: 2631 });
    for (let i = 0; i < 8; i++) {
      const y = 757 + i * 11.8, x0 = 1900 + i * 5 % 11, x1 = 2088 - i * 7 % 12;
      const k = 0.95 - i * 0.03;
      stripes(g, [[x0, y], [x1, y - 1], [x1 + 2, y + 10.5], [x0 + 1, y + 11.5]], { dir: "h", per: 2.4, cov: (u, v) => k * lerp(0.95, 0.35, sstep(0.25, 0.9, u)) * (1 - 0.35 * v), lum: 0.95, seed: 2640 + i * 2, brk: 0.3 });
      ink(g, [[x0, y], [x1, y - 1], [x1 + 2, y + 10.5], [x0 + 1, y + 11.5]], 1.1, BLK, { closed: true, seed: 2641 + i * 2 });
    }
    const bp = [[2010, 650], [2025, 626], [2050, 614], [2080, 614], [2110, 618], [2134, 630], [2156, 670], [2172, 730], [2178, 800], [2172, 835], [2140, 845], [2105, 850], [2075, 848], [2050, 830], [2030, 780], [2016, 720]];
    brush(g, bp, (v) => {
      v.fillStyle = lg(v, 2010, 0, 2178, 0, [[0, 0.08], [0.45, 0.14], [0.8, 0.2], [1, 0.1]]);
      v.fillRect(2006, 610, 176, 244);
      for (let i = 0; i < 7; i++) vLineC(v, [[2078, 660 + i * 26], [2112, 654 + i * 26], [2146, 662 + i * 26]], 3, 0.32, 1.5);
    }, 1.5, { len: 12, w: 2, gap: 1.6, seed: 2650, smooth: true, jit: 0.35, base: 0.5, gain: 0.45, lj: 0.4, dark: 0.25 });
    for (let i = 0; i < 7; i++) curve(g, [[2080, 668 + i * 26], [2112, 662 + i * 26], [2150, 670 + i * 26]], 1.4, grey(0.02, 0.8), { seed: 2655 + i });
    const strap = (L, R, seed, v0, v1) => {
      const shp = [...L, ...[...R].reverse()];
      brush(g, shp, (v) => {
        v.fillStyle = lg(v, 0, 612, 0, 850, [[0, v0], [1, v1]]);
        v.fillRect(2e3, 606, 186, 250);
      }, 1.35, { len: 11, w: 2, gap: 1.4, seed, smooth: true, jit: 0.3, base: 0.6 });
      curve(g, L, 1.4, grey(0.02), { seed: seed + 1 });
      curve(g, R, 1.4, grey(0.02), { seed: seed + 2 });
      const q = sampleCurve(L, 8), q2 = sampleCurve(R, 8);
      for (let i = 3; i < Math.min(q.length, q2.length) - 2; i += 5) ink(g, [P2(q[i], q2[i], 0.12), P2(q[i], q2[i], 0.88)], 1, grey(0.04, 0.8), { seed: seed + 10 + i });
      curve(g, q.map((p, i) => P2(p, q2[Math.min(i, q2.length - 1)], 0.2)), 1, grey(0.6, 0.45), { seed: seed + 3 });
    };
    strap([[2020, 650], [2040, 715], [2060, 790], [2075, 842]], [[2064, 636], [2072, 690], [2086, 750], [2100, 810], [2106, 846]], 2660, 0.3, 0.12);
    strap([[2104, 638], [2124, 690], [2140, 750], [2150, 810]], [[2108, 620], [2132, 632], [2156, 682], [2170, 740], [2176, 800]], 2670, 0.26, 0.1);
    curve(g, [[2012, 648], [2026, 626], [2050, 614], [2080, 614], [2110, 618], [2134, 630]], 1.6, grey(0.55, 0.8), { seed: 2672, ends: 0.6 });
    curve(g, bp.slice(0, 8), 1.1, grey(0.25, 0.5), { seed: 2690, ends: 0.8 });
    fillPoly(g, [[2130, 455], [2175, 455], [2175, 490], [2130, 490]], grey(0.2));
  }
  function floor(g) {
    const vx = 1075, vy = 700;
    tex(g, [[0, 850], [PW, 850], [PW, PH], [0, PH]], (v) => {
      v.fillStyle = lg(v, 0, 850, 0, PH, [[0, 0], [0.25, 0.03], [0.45, 0.1], [0.62, 0.11], [0.8, 0.05], [1, 0]]);
      v.fillRect(0, 850, PW, 96);
      v.globalCompositeOperation = "multiply";
      v.fillStyle = lg(v, 0, 0, PW, 0, [[0, grey(0.35)], [0.3, grey(0.8)], [0.5, grey(1)], [0.7, grey(0.8)], [1, grey(0.35)]]);
      v.fillRect(0, 850, PW, 96);
    }, 0, { per: 6.5, seed: 2701, wExp: 1.1, brk: 1.4, brkL: 2, wav: 0.05, bg: 0, coord: (x, y) => {
      const a = Math.atan2(x - vx, y - vy);
      return [a * 260, Math.hypot(x - vx, y - vy)];
    } });
    for (const [pts, w, sd] of [
      [[[140, 880], [260, 872], [380, 884], [470, 872], [560, 886]], 3.6, 2710],
      [[[520, 868], [600, 882], [680, 874], [760, 890], [840, 884], [900, 892]], 4, 2711],
      [[[600, 858], [650, 846], [700, 858], [690, 876], [640, 872], [620, 858]], 3, 2712],
      [[[1280, 872], [1360, 884], [1440, 876], [1520, 888], [1600, 880], [1680, 890], [1760, 884]], 4, 2713],
      [[[1300, 860], [1380, 868], [1460, 860], [1540, 872]], 3.4, 2714],
      [[[1560, 850], [1600, 864], [1660, 858], [1700, 870], [1780, 862], [1850, 874]], 3.4, 2715],
      [[[1720, 846], [1760, 858], [1800, 850], [1790, 866], [1750, 868]], 2.8, 2716],
      [[[380, 864], [420, 876], [480, 868], [520, 880]], 3, 2717],
      [[[1860, 866], [1930, 872], [2e3, 866], [2080, 876]], 3, 2718]
    ]) cable(g, pts, w, sd, 0.6);
  }
  function paintSokoIll(g, { gaze = "owl" } = {}) {
    const steps = [
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
      () => ampGroup(g),
      () => pedalboard(g),
      () => doNotKnock(g),
      () => uprightSynth(g),
      () => rightLow(g),
      () => rightCentre(g),
      () => deskUnder(g),
      () => pants(g),
      () => shoes(g),
      () => torso(g),
      () => head(g, gaze),
      () => headphones(g),
      () => laptop(g),
      () => deskTop(g),
      () => mug(g),
      () => lampAndGear(g),
      () => cables(g)
    ];
    g.fillStyle = "#000";
    g.fillRect(0, 0, PW, PH);
    for (const f of steps) f();
  }
  var illCache = /* @__PURE__ */ new Map();
  function sokoIllCanvas({ gaze = "owl", scale = 1 } = {}) {
    const key = `${gaze}:${scale}`;
    if (illCache.has(key)) return illCache.get(key);
    const c = document.createElement("canvas");
    c.width = Math.round(PW * scale);
    c.height = Math.round(PH * scale);
    const g = c.getContext("2d", { willReadFrequently: true });
    g.scale(scale, scale);
    paintSokoIll(g, { gaze });
    const out = c;
    out.__scale = scale;
    illCache.set(key, out);
    return out;
  }

  // ../../src/lib/sites.js
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
  function headerTornPoints({ seed = 7, amp = 3.5, inset = 0 } = {}) {
    const r = rng(seed), pts = [];
    const x0 = HEADER.x - inset, y0 = HEADER.y - inset, x1 = HEADER.x + HEADER.w + inset, y1 = HEADER.y + HEADER.h + inset;
    const edge = (ax, ay, bx, by) => {
      const L = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.round(L / 24)), nx = -(by - ay) / L, ny = (bx - ax) / L;
      for (let i = 0; i < n; i++) {
        const t = (i + (i ? (r() - 0.5) * 0.5 : 0)) / n, j = i ? (r() - 0.5) * 2 * amp : 0;
        pts.push([ax + (bx - ax) * t + nx * j, ay + (by - ay) * t + ny * j]);
      }
    };
    edge(x0, y0, x1, y0);
    edge(x1, y0, x1, y1);
    edge(x1, y1, x0, y1);
    edge(x0, y1, x0, y0);
    return pts;
  }
  function headerTornPath(ctx, opts) {
    const p = headerTornPoints(opts);
    ctx.moveTo(p[0][0], p[0][1]);
    for (const q of p.slice(1)) ctx.lineTo(q[0], q[1]);
    ctx.closePath();
  }
  function drawHeaderHole(ctx, { seed = 7, rim = true, fill = "#070807" } = {}) {
    ctx.save();
    ctx.beginPath();
    headerTornPath(ctx, { seed });
    ctx.fillStyle = fill;
    ctx.fill();
    if (rim) {
      ctx.lineJoin = "round";
      ctx.strokeStyle = "rgba(236,236,230,0.93)";
      ctx.lineWidth = 4.5;
      ctx.stroke();
    }
    ctx.restore();
  }
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
  function drawSokoPage(ctx, { header = true, hole = "torn", rail = true, ui = true, ill = true, gaze = "owl", counter = "000.0", scale = 1 } = {}) {
    ctx.save();
    ctx.fillStyle = SOKO_BG;
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);
    if (ill) ctx.drawImage(sokoIllCanvas({ gaze, scale }), 0, 0, PAGE_W, PAGE_H);
    if (ui) {
      drawSokoHeadline(ctx);
      drawSokoCounter(ctx, { counter });
    }
    if (rail) drawSokoRail(ctx);
    if (!header) drawHeaderHole(ctx, { rim: hole === "torn" });
    ctx.restore();
  }
  var SOKO_SOFT = 0.65;
  var SOKO_CACHE = /* @__PURE__ */ new Map();
  function sokoCached(key, w, h, scale, draw, soft2 = 0) {
    let c = SOKO_CACHE.get(key);
    if (!c) {
      c = document.createElement("canvas");
      c.width = Math.round(w * scale);
      c.height = Math.round(h * scale);
      const g = c.getContext("2d", { willReadFrequently: true });
      g.scale(scale, scale);
      draw(g);
      if (soft2 > 0) blurCanvas(c, soft2 * scale);
      c.__scale = scale;
      SOKO_CACHE.set(key, c);
    }
    return c;
  }
  function sokoPageCanvas(opts = {}) {
    const { header = true, hole = "torn", rail = true, ui = true, ill = true, gaze = "owl", counter = "000.0", scale = 1, soft: soft2 = SOKO_SOFT } = opts;
    const key = `page:${header}:${hole}:${rail}:${ui}:${ill}:${gaze}:${counter}:${scale}:${soft2}`;
    return sokoCached(key, PAGE_W, PAGE_H, scale, (g) => drawSokoPage(g, { header, hole, rail, ui, ill, gaze, counter, scale }), soft2);
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

  // ../../src/shots/s17/page.js
  var PI2 = Math.PI;
  var clamp3 = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  var grey2 = (v, a = 1) => {
    const c = Math.round(clamp3(v) * 255);
    return a >= 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`;
  };
  var polyPath2 = (g, pts) => {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
  };
  function ink2(g, pts, w = 2, color = "#040404", { closed = false, seed = 1, ends = 0.7, jit = 0.4 } = {}) {
    const r = rng(seed);
    const q = closed ? [...pts, pts[0]] : pts;
    const dense = [];
    for (let i = 0; i < q.length - 1; i++) {
      const [x0, y0] = q[i], [x1, y1] = q[i + 1], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6));
      for (let k = 0; k < n; k++) dense.push([x0 + (x1 - x0) * (k / n) + (r() - 0.5) * jit, y0 + (y1 - y0) * (k / n) + (r() - 0.5) * jit]);
    }
    dense.push(q[q.length - 1]);
    taper(g, dense, (u) => w * (ends + (1 - ends) * Math.sin(PI2 * u)), color);
  }
  function softRect(g, x, y, w, h, fill, blur, alpha, scale) {
    const pad = Math.ceil(blur * 3 + 2);
    const c = document.createElement("canvas");
    c.width = Math.ceil((w + 2 * pad) * scale);
    c.height = Math.ceil((h + 2 * pad) * scale);
    const t = c.getContext("2d", { willReadFrequently: true });
    t.scale(scale, scale);
    t.fillStyle = fill;
    t.fillRect(pad, pad, w, h);
    blurCanvas(c, blur * scale);
    g.save();
    g.globalAlpha = alpha;
    g.drawImage(c, x - pad, y - pad, w + 2 * pad, h + 2 * pad);
    g.restore();
    c.width = c.height = 0;
  }
  var MUG_BOX = [798, 462, 890, 522];
  function paintMug(g, scale) {
    const body = [[816, 473], [818, 470], [869, 470], [871, 473], [868, 520], [820, 520]];
    polyPath2(g, body);
    const bg = g.createLinearGradient(816, 0, 871, 0);
    bg.addColorStop(0, grey2(0.4));
    bg.addColorStop(0.025, grey2(0.5));
    bg.addColorStop(0.06, grey2(0.33));
    bg.addColorStop(0.15, grey2(0.34));
    bg.addColorStop(0.22, grey2(0.5));
    bg.addColorStop(0.29, grey2(0.7));
    bg.addColorStop(0.38, grey2(0.86));
    bg.addColorStop(0.5, grey2(0.93));
    bg.addColorStop(0.65, grey2(0.95));
    bg.addColorStop(0.9, grey2(0.93));
    bg.addColorStop(1, grey2(0.78));
    g.fillStyle = bg;
    g.fill();
    g.save();
    polyPath2(g, body);
    g.clip();
    softRect(g, 816, 508, 56, 14, grey2(0.55), 4, 0.35, scale);
    softRect(g, 826, 474, 6, 44, grey2(0.62), 3, 0.35, scale);
    g.restore();
    g.fillStyle = grey2(0.95);
    g.beginPath();
    g.ellipse(843.5, 471, 26.5, 2, 0, 0, PI2 * 2);
    g.fill();
    ink2(g, [[819, 472.4], [843, 473.2], [868, 472.4]], 0.8, grey2(0.62, 0.8), { seed: 2024 });
    ink2(g, [[818, 470.6], [843, 469.4], [869, 470.6]], 1, grey2(0.98, 0.9), { seed: 2026 });
    ink2(g, body, 1.2, "#040404", { closed: true, seed: 2025 });
    g.lineCap = "round";
    g.strokeStyle = grey2(0.05);
    g.lineWidth = 5.6;
    g.beginPath();
    g.ellipse(870, 498.5, 13, 14.5, 0, -PI2 * 0.5, PI2 * 0.5);
    g.stroke();
    g.strokeStyle = grey2(0.92);
    g.lineWidth = 3.6;
    g.beginPath();
    g.ellipse(870, 498.5, 13, 14.5, 0, -PI2 * 0.5, PI2 * 0.5);
    g.stroke();
    g.strokeStyle = grey2(0.32, 0.9);
    g.lineWidth = 2;
    g.beginPath();
    g.ellipse(817, 500, 12, 11.5, 0, PI2 * 0.5, PI2 * 1.5);
    g.stroke();
  }
  function coverMug(g) {
    const X0 = 796, X1 = 894, Y0 = 332, Y1 = 521, F2 = 8;
    g.fillStyle = "#000";
    g.fillRect(X0 + F2, Y0 + F2, X1 - X0 - 2 * F2, Y1 - Y0 - F2);
    const ramp2 = (x0, y0, x1, y1, gx0, gy0, gx1, gy1) => {
      const gr = g.createLinearGradient(gx0, gy0, gx1, gy1);
      gr.addColorStop(0, "rgba(0,0,0,0)");
      gr.addColorStop(1, "rgba(0,0,0,1)");
      g.fillStyle = gr;
      g.fillRect(x0, y0, x1 - x0, y1 - y0);
    };
    ramp2(X0, Y0 + F2, X0 + F2, Y1, X0, 0, X0 + F2, 0);
    ramp2(X1 - F2, Y0 + F2, X1, Y1, X1, 0, X1 - F2, 0);
    g.save();
    g.beginPath();
    g.moveTo(X0, Y0);
    g.lineTo(X1, Y0);
    g.lineTo(X1 - F2, Y0 + F2);
    g.lineTo(X0 + F2, Y0 + F2);
    g.closePath();
    g.clip();
    ramp2(X0, Y0, X1, Y0 + F2, 0, Y0, 0, Y0 + F2);
    g.restore();
  }
  var MUGS = /* @__PURE__ */ new Map();
  function mugLayer(scale = 1) {
    let c = MUGS.get(scale);
    if (!c) {
      const [x0, y0, x1, y1] = MUG_BOX;
      c = document.createElement("canvas");
      c.width = Math.round((x1 - x0) * scale);
      c.height = Math.round((y1 - y0) * scale);
      const g = c.getContext("2d", { willReadFrequently: true });
      g.scale(scale, scale);
      g.translate(-x0, -y0);
      paintMug(g, scale);
      blurCanvas(c, SOKO_SOFT * scale);
      MUGS.set(scale, c);
    }
    return c;
  }
  function drawS17Page(g, scale = 1, ui = true, alpha = 1) {
    const f = sokoPageCanvas({ gaze: "owl", scale, ui });
    g.save();
    g.globalAlpha = alpha;
    g.drawImage(f, 0, 0, PAGE_W, PAGE_H);
    coverMug(g);
    const [x0, y0, x1, y1] = MUG_BOX;
    g.drawImage(mugLayer(scale), x0, y0, x1 - x0, y1 - y0);
    g.restore();
  }
  var HEAD_BOX = [966, 140, 1172, 400];
  var EYES = [
    [[1022.6, 285.4], [1030.8, 281.8], [1040.8, 281.2], [1048.3, 283], [1052, 287], [1049.5, 289], [1037, 290.5], [1024, 289]],
    [[1117.6, 285.6], [1112, 282], [1102, 280.6], [1092, 281.6], [1085, 285.8], [1087, 288.5], [1099.5, 290], [1115.8, 288.5]]
  ];
  var HEAD_MASK = [
    [975, 148],
    [1162, 148],
    [1163, 250],
    [1158, 300],
    [1150, 336],
    [1136, 360],
    [1112, 378],
    [1090, 385],
    [1072, 388],
    [1052, 385],
    [1030, 378],
    [1008, 360],
    [993, 336],
    [984, 300],
    [977, 250]
  ];
  var MASK = null;
  function headMask() {
    if (MASK) return MASK;
    const [x0, y0, x1, y1] = HEAD_BOX;
    MASK = document.createElement("canvas");
    MASK.width = x1 - x0;
    MASK.height = y1 - y0;
    const g = MASK.getContext("2d", { willReadFrequently: true });
    g.translate(-x0, -y0);
    g.fillStyle = "#fff";
    g.beginPath();
    smoothPath(g, HEAD_MASK, true);
    g.fill();
    blurCanvas(MASK, 2.5);
    return MASK;
  }
  var PATCH = /* @__PURE__ */ new Map();
  function headPatch(hdx, edx) {
    const key = hdx.toFixed(2) + ":" + edx.toFixed(2);
    let out = PATCH.get(key);
    if (out) return out;
    const [x0, y0, x1, y1] = HEAD_BOX, page = sokoPageCanvas({ gaze: "owl", scale: 1 }), w = x1 - x0, h = y1 - y0;
    const T = document.createElement("canvas");
    T.width = w;
    T.height = h;
    const t = T.getContext("2d");
    t.drawImage(page, x0, y0, w, h, 0, 0, w, h);
    t.translate(-x0, -y0);
    if (edx) for (const shape of EYES) {
      const xs = shape.map((p) => p[0]), xa = Math.min(...xs), xb = Math.max(...xs);
      t.save();
      t.beginPath();
      smoothPath(t, shape, true);
      t.clip();
      t.beginPath();
      t.rect(xa - 2, 270, xb - xa - Math.abs(edx) + 1, 26);
      t.clip();
      t.drawImage(page, xa - 4, 270, xb - xa + 8, 26, xa - 4 + edx, 270, xb - xa + 8, 26);
      t.restore();
    }
    const S = document.createElement("canvas");
    S.width = w;
    S.height = h;
    const sg = S.getContext("2d");
    sg.drawImage(page, x0 + 8, y0, w, h, 8, 0, w, h);
    sg.fillStyle = "#000";
    sg.globalCompositeOperation = "source-over";
    sg.drawImage(T, hdx, 0);
    sg.globalCompositeOperation = "destination-in";
    sg.drawImage(headMask(), hdx, 0);
    sg.globalCompositeOperation = "source-over";
    out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const o = out.getContext("2d");
    o.drawImage(page, x0, y0, w, h, 0, 0, w, h);
    o.drawImage(S, 0, 0);
    T.width = T.height = S.width = S.height = 0;
    PATCH.set(key, out);
    return out;
  }
  function releaseS17Page() {
    MUGS.clear();
    PATCH.clear();
    MASK = null;
  }

  // ../../src/lib/owlInk.js
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
  function ink3(g, pts, w, color = LINE, { per = 6, end = 0.2, bias = 0.5, pow = 0.55 } = {}) {
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

  // ../../src/shots/s17/wing_data.js
  var WINGS = { "49.12": { "L": [678.1, 494.9, 664.1, 509.6, 661.6, 515.6, 658.9, 518.4, 653.1, 528.4, 645.1, 533.6, 644.4, 540.6, 636.1, 544.4, 629.4, 544.9, 628.9, 546.9, 629.6, 547.9, 636.1, 548.4, 657.1, 544.1, 668.4, 538.9, 670.4, 534.6, 673.4, 533.9, 682.1, 527.1, 686.1, 522.1, 688.1, 518.1, 688.1, 515.9, 683.6, 508.1, 680.4, 495.9, 679.6, 494.9], "R": [730.4, 426.9, 729.6, 428.1, 730.1, 431.4, 735.4, 435.6, 745.4, 446.4, 745.9, 450.1, 749.6, 459.4, 751.4, 461.4, 758.9, 464.4, 764.6, 464.6, 767.1, 469.1, 776.6, 468.6, 777.9, 471.6, 780.4, 473.4, 783.1, 481.4, 784.9, 482.4, 787.1, 481.6, 788.4, 478.6, 794.6, 478.1, 796.4, 473.6, 803.1, 473.6, 801.1, 467.9, 796.1, 459.9, 782.6, 446.1, 781.1, 442.9, 774.1, 436.9, 766.1, 432.9, 761.1, 431.6, 754.6, 433.1, 752.9, 435.9, 754.6, 446.9, 753.6, 448.4, 751.1, 448.6, 749.1, 447.1, 745.1, 438.9, 741.1, 433.6, 734.1, 427.9], "M": [689.4, 414.6, 681.9, 418.6, 674.9, 425.9, 671.6, 431.4, 668.1, 444.4, 663.6, 446.6, 657.1, 446.1, 661.4, 450.9, 661.4, 454.1, 659.6, 455.6, 653.6, 455.4, 653.9, 458.1, 660.4, 460.9, 660.9, 465.4, 667.4, 468.9, 669.9, 475.1, 672.6, 478.4, 670.6, 481.6, 671.6, 483.1, 678.6, 489.9, 682.6, 489.4, 683.6, 490.4, 682.6, 493.1, 676.9, 495.6, 668.6, 505.4, 670.6, 513.6, 676.9, 525.1, 681.1, 528.1, 687.6, 518.9, 690.6, 517.4, 693.6, 520.4, 692.1, 523.9, 694.4, 524.9, 694.9, 527.1, 700.9, 522.6, 703.1, 522.6, 702.6, 526.6, 706.9, 532.4, 716.9, 539.1, 724.4, 542.4, 733.4, 544.4, 745.6, 544.4, 750.4, 542.4, 759.6, 541.4, 764.9, 536.6, 766.6, 536.4, 768.6, 539.4, 769.9, 545.1, 773.1, 546.1, 771.4, 542.6, 771.4, 535.4, 773.6, 530.9, 778.1, 528.4, 780.9, 524.6, 785.6, 524.4, 790.4, 521.4, 795.4, 524.9, 799.9, 513.4, 796.6, 511.1, 796.4, 508.4, 797.4, 507.4, 799.9, 507.9, 801.4, 505.6, 799.1, 502.9, 796.9, 503.6, 794.6, 507.4, 794.6, 513.6, 793.4, 516.1, 789.6, 516.1, 788.1, 512.9, 785.4, 510.6, 785.4, 498.4, 783.4, 491.4, 776.1, 475.9, 772.6, 472.1, 772.4, 469.4, 773.9, 465.6, 775.6, 465.4, 777.4, 466.9, 776.9, 471.1, 782.4, 477.9, 782.9, 481.1, 786.6, 483.9, 788.4, 482.4, 784.4, 475.6, 784.9, 473.6, 787.1, 473.6, 794.9, 479.9, 794.1, 476.9, 778.1, 459.6, 761.4, 450.1, 753.9, 435.1, 752.6, 437.6, 754.6, 444.4, 754.6, 450.6, 752.4, 451.6, 742.4, 434.9, 730.6, 425.6, 724.4, 425.6, 718.6, 422.6, 708.4, 422.6, 699.4, 424.6, 681.9, 433.9, 680.4, 439.1, 677.9, 439.4, 677.4, 433.4, 683.6, 421.9, 690.9, 415.4] }, "49.20": { "L": [677.9, 494.6, 670.9, 500.6, 663.9, 508.9, 657.1, 520.4, 653.1, 524.6, 651.1, 529.4, 642.9, 533.4, 641.4, 540.6, 639.1, 542.4, 626.4, 544.9, 626.4, 547.1, 636.1, 547.4, 657.9, 543.1, 668.1, 538.1, 671.4, 533.6, 679.4, 528.9, 682.1, 526.1, 687.9, 518.4, 688.1, 515.9, 683.6, 508.1, 680.4, 495.9], "R": [730.4, 426.9, 729.6, 428.1, 730.1, 431.4, 735.4, 435.6, 745.4, 446.4, 747.9, 455.1, 750.1, 460.4, 751.4, 461.4, 759.9, 465.1, 763.6, 465.6, 766.1, 468.1, 776.6, 467.6, 778.1, 471.4, 786.1, 481.1, 788.1, 480.6, 789.4, 476.6, 795.6, 477.1, 797.4, 471.6, 804.1, 471.6, 802.1, 465.9, 797.1, 458.9, 793.4, 455.1, 789.6, 453.6, 788.9, 450.6, 782.6, 444.1, 780.9, 440.6, 777.1, 437.9, 764.1, 431.9, 756.1, 431.9, 753.6, 434.9, 753.6, 442.1, 754.6, 446.9, 753.6, 448.4, 751.1, 448.6, 749.1, 447.1, 745.1, 438.9, 741.1, 433.6, 734.1, 427.9], "M": [689.4, 414.6, 681.9, 418.6, 674.9, 425.9, 671.6, 431.4, 668.1, 444.4, 663.6, 446.6, 657.9, 445.9, 657.9, 448.1, 661.6, 451.4, 661.4, 454.1, 659.6, 455.6, 653.6, 455.4, 653.9, 458.1, 661.4, 460.9, 661.6, 462.6, 660.1, 464.4, 667.4, 469.9, 672.6, 478.4, 670.6, 481.6, 671.6, 483.1, 678.6, 489.9, 681.6, 489.4, 682.6, 490.4, 682.1, 493.4, 676.9, 494.9, 668.6, 503.4, 668.6, 507.6, 670.6, 513.6, 676.9, 525.1, 680.4, 527.9, 687.4, 518.9, 690.6, 517.4, 692.6, 519.4, 691.9, 524.1, 695.6, 526.4, 700.4, 523.4, 702.1, 523.6, 702.9, 527.1, 706.9, 532.4, 716.9, 539.1, 724.4, 542.4, 733.4, 544.4, 745.6, 544.4, 750.4, 542.4, 759.6, 541.4, 764.9, 536.6, 766.6, 536.4, 769.9, 545.1, 773.1, 546.1, 771.4, 542.6, 771.4, 535.4, 773.6, 530.9, 778.1, 528.4, 780.9, 524.6, 785.6, 524.4, 790.4, 521.4, 795.4, 524.9, 799.9, 513.4, 796.6, 511.1, 796.4, 508.4, 797.4, 507.4, 799.9, 507.9, 801.4, 505.6, 799.1, 502.9, 796.9, 503.6, 794.6, 507.4, 794.6, 513.6, 793.4, 516.1, 789.6, 516.1, 788.1, 512.9, 785.4, 510.6, 785.4, 498.4, 783.4, 491.4, 778.4, 480.6, 778.4, 478.4, 772.6, 472.1, 772.4, 469.4, 774.6, 461.9, 777.1, 461.6, 777.6, 470.6, 787.4, 482.4, 789.4, 481.4, 783.6, 473.1, 783.6, 470.9, 786.1, 470.6, 791.9, 476.1, 792.9, 476.1, 792.1, 473.9, 778.1, 459.6, 761.4, 450.1, 753.9, 435.1, 752.6, 436.6, 754.6, 444.4, 754.6, 450.6, 751.9, 451.4, 742.4, 434.9, 730.6, 425.6, 724.4, 425.6, 718.6, 422.6, 708.4, 422.6, 699.4, 424.6, 681.9, 433.9, 680.4, 439.1, 677.9, 439.4, 676.4, 434.4, 684.4, 420.9, 690.9, 415.4] }, "49.28": { "L": [678.1, 493.9, 671.6, 498.9, 661.9, 509.4, 661.1, 512.4, 657.1, 515.6, 655.4, 520.1, 651.9, 523.4, 651.4, 527.6, 645.6, 529.1, 640.1, 533.6, 639.6, 539.9, 638.6, 541.4, 634.4, 541.4, 632.6, 538.9, 631.6, 538.9, 630.1, 542.4, 625.4, 543.9, 625.1, 545.9, 636.1, 546.4, 657.9, 542.1, 660.6, 539.9, 664.9, 539.1, 668.4, 536.9, 671.6, 531.9, 680.1, 527.1, 686.9, 517.4, 687.4, 514.9, 683.6, 508.1, 680.1, 494.4], "R": [730.4, 426.9, 729.6, 428.1, 730.1, 431.4, 734.4, 434.6, 745.4, 446.4, 747.9, 455.1, 750.1, 460.4, 751.4, 461.4, 761.9, 466.1, 768.1, 466.4, 770.9, 467.4, 772.6, 467.1, 775.9, 464.4, 781.1, 464.6, 795.1, 475.1, 797.1, 474.6, 797.4, 471.1, 798.4, 469.6, 805.1, 469.6, 804.9, 466.6, 798.1, 456.9, 794.4, 453.1, 790.4, 452.4, 788.9, 448.6, 779.1, 437.9, 769.1, 432.9, 762.1, 430.9, 755.1, 431.9, 752.6, 435.9, 754.6, 447.9, 753.6, 449.4, 751.1, 449.6, 749.6, 448.6, 745.1, 438.9, 742.1, 434.9, 734.1, 427.9], "M": [689.4, 414.6, 681.9, 418.6, 674.9, 425.9, 671.6, 431.4, 668.1, 444.4, 663.6, 446.6, 657.9, 445.9, 657.9, 448.1, 661.6, 451.4, 661.4, 454.1, 659.6, 455.6, 653.6, 455.4, 654.9, 458.1, 661.4, 460.9, 661.6, 462.6, 660.1, 464.4, 664.1, 465.6, 667.4, 469.9, 672.6, 478.4, 670.9, 482.1, 678.6, 490.1, 677.6, 494.1, 668.1, 502.6, 670.6, 513.6, 676.9, 525.1, 680.1, 527.1, 685.6, 518.9, 689.6, 517.4, 693.6, 519.4, 692.6, 522.6, 694.1, 526.9, 699.1, 524.1, 700.9, 521.6, 703.1, 521.6, 702.6, 526.6, 705.6, 531.1, 718.4, 540.4, 733.4, 544.4, 744.6, 544.4, 749.4, 542.4, 759.6, 541.4, 764.9, 536.6, 766.6, 536.4, 769.9, 545.1, 773.1, 546.1, 771.4, 542.6, 771.4, 535.4, 773.6, 529.9, 777.1, 529.1, 780.9, 524.6, 786.6, 524.4, 790.4, 521.4, 795.4, 524.9, 799.9, 513.4, 796.6, 512.1, 796.4, 508.4, 797.4, 507.4, 799.9, 507.9, 801.4, 505.6, 799.1, 502.9, 796.6, 503.9, 794.6, 507.4, 794.6, 513.6, 792.6, 516.6, 789.9, 516.4, 788.1, 512.9, 785.6, 511.1, 785.4, 498.4, 778.4, 481.6, 778.6, 479.9, 781.4, 478.4, 778.1, 474.9, 773.9, 473.6, 771.4, 470.6, 773.4, 467.6, 774.6, 460.9, 777.9, 459.6, 761.4, 450.1, 754.1, 434.9, 752.9, 434.9, 752.6, 437.6, 754.6, 444.4, 754.6, 450.6, 752.4, 451.6, 749.6, 449.1, 745.1, 438.9, 739.1, 431.6, 730.6, 425.6, 723.4, 425.6, 719.9, 424.4, 718.6, 422.6, 708.4, 422.6, 696.4, 425.6, 681.9, 433.9, 680.4, 439.1, 677.9, 439.4, 676.4, 434.4, 684.4, 420.9, 690.9, 415.4] }, "49.36": { "L": [678.1, 492.9, 662.9, 505.9, 655.1, 517.4, 651.1, 520.6, 649.6, 526.4, 645.9, 526.9, 641.9, 528.9, 640.1, 530.6, 638.6, 535.4, 630.9, 536.4, 628.6, 541.4, 621.4, 542.9, 621.1, 544.9, 634.1, 545.4, 652.9, 542.1, 658.4, 539.9, 661.1, 537.6, 664.4, 536.9, 666.4, 532.6, 669.4, 531.9, 680.1, 525.1, 682.1, 523.1, 684.6, 518.1, 686.9, 516.4, 687.1, 514.1, 683.6, 508.1, 680.1, 493.4], "R": [730.4, 426.9, 729.6, 428.1, 730.1, 431.4, 734.4, 434.6, 745.4, 446.4, 747.9, 455.1, 750.1, 460.4, 751.4, 461.4, 759.9, 465.1, 766.1, 465.4, 771.6, 467.1, 774.9, 464.6, 774.6, 459.4, 776.1, 458.4, 778.6, 458.6, 779.6, 460.1, 779.6, 462.9, 778.1, 465.6, 779.9, 469.1, 786.6, 475.9, 790.1, 478.1, 792.1, 477.6, 792.4, 474.1, 793.4, 472.6, 800.1, 472.6, 800.4, 468.1, 801.4, 466.6, 808.1, 466.6, 807.9, 464.6, 803.1, 458.6, 795.4, 451.1, 790.4, 450.4, 788.9, 445.6, 780.1, 436.9, 769.1, 431.9, 764.1, 430.6, 756.9, 430.9, 754.9, 431.9, 752.6, 434.9, 754.6, 447.9, 753.6, 449.4, 751.1, 449.6, 749.1, 448.1, 745.1, 438.9, 741.1, 433.6, 734.1, 427.9], "M": [689.4, 414.6, 681.9, 418.6, 674.9, 425.9, 671.6, 431.4, 668.1, 444.4, 663.6, 446.6, 657.9, 445.9, 657.9, 448.1, 661.6, 451.4, 661.4, 454.1, 659.6, 455.6, 653.6, 455.4, 654.9, 458.1, 661.4, 460.9, 661.6, 462.6, 660.1, 464.1, 660.9, 465.1, 663.6, 465.4, 666.4, 467.9, 672.6, 478.4, 670.6, 481.6, 671.6, 483.1, 677.9, 489.1, 682.6, 490.4, 682.1, 492.4, 677.9, 492.9, 667.6, 502.4, 670.6, 513.6, 676.9, 525.1, 680.1, 525.1, 684.6, 517.9, 688.6, 516.4, 692.6, 519.4, 693.4, 527.1, 702.6, 521.4, 703.6, 522.4, 702.6, 526.6, 706.9, 532.4, 716.9, 539.1, 724.4, 542.4, 733.4, 544.4, 741.6, 544.4, 754.4, 541.4, 759.6, 541.4, 764.9, 536.6, 766.6, 536.4, 769.9, 545.1, 773.1, 546.1, 771.4, 542.6, 771.4, 535.4, 773.6, 529.9, 778.1, 528.4, 781.9, 523.6, 785.6, 524.4, 790.4, 521.4, 795.4, 524.9, 799.4, 514.4, 796.9, 513.4, 795.1, 510.6, 796.9, 506.6, 800.1, 507.6, 801.4, 505.6, 799.1, 502.9, 796.9, 503.6, 794.6, 507.4, 794.9, 511.9, 793.4, 516.1, 789.6, 516.1, 788.1, 512.9, 785.4, 510.6, 784.4, 494.4, 777.4, 479.6, 778.4, 477.4, 781.9, 477.9, 777.4, 472.1, 775.6, 473.6, 772.9, 472.6, 770.4, 468.4, 774.1, 465.1, 775.1, 462.4, 777.9, 462.4, 779.9, 469.1, 786.9, 476.1, 791.6, 478.4, 792.1, 475.9, 782.6, 467.1, 782.4, 464.4, 780.4, 461.9, 775.1, 461.6, 774.1, 456.9, 761.4, 450.1, 753.4, 434.1, 752.6, 438.6, 754.6, 444.4, 754.6, 450.6, 752.4, 451.6, 749.6, 449.1, 742.4, 434.9, 730.6, 425.6, 725.4, 426.6, 717.6, 422.6, 708.4, 422.6, 699.4, 424.6, 681.9, 433.9, 680.4, 439.1, 677.9, 439.4, 676.4, 434.4, 683.4, 421.9, 690.9, 415.4] }, "49.44": { "L": [677.9, 492.6, 669.9, 497.9, 659.1, 507.6, 655.4, 514.1, 647.9, 520.4, 647.6, 523.9, 646.6, 525.4, 640.9, 527.4, 638.4, 532.1, 632.9, 532.6, 629.9, 533.9, 627.1, 536.6, 626.6, 539.1, 625.1, 540.9, 619.4, 541.9, 619.1, 543.9, 624.9, 545.1, 634.1, 544.4, 639.9, 542.4, 646.1, 542.4, 649.9, 540.6, 657.9, 539.1, 660.6, 536.9, 663.6, 536.1, 665.4, 531.6, 668.4, 530.9, 671.6, 527.9, 676.1, 526.1, 680.1, 523.1, 683.6, 518.1, 687.1, 515.6, 687.1, 514.1, 683.6, 508.1, 680.1, 493.4], "R": [730.4, 426.9, 729.6, 428.1, 730.1, 431.4, 738.9, 438.6, 745.1, 445.6, 749.6, 459.4, 752.9, 462.1, 758.9, 464.4, 765.1, 464.4, 769.9, 466.4, 773.4, 463.1, 773.6, 457.4, 775.1, 456.4, 778.6, 456.6, 779.6, 458.1, 779.9, 466.6, 785.4, 469.9, 788.9, 474.1, 790.9, 475.1, 793.1, 474.6, 793.4, 471.1, 794.4, 469.6, 801.6, 470.1, 803.4, 463.6, 810.1, 463.6, 809.1, 459.9, 801.4, 451.9, 795.9, 447.9, 790.4, 447.4, 789.1, 443.4, 777.4, 433.6, 764.1, 429.6, 759.9, 429.6, 754.9, 431.4, 752.6, 434.9, 754.6, 447.9, 753.6, 449.4, 751.1, 449.6, 749.1, 448.1, 747.1, 442.9, 741.1, 433.6, 732.4, 427.1], "M": [689.4, 414.6, 681.9, 418.6, 674.9, 425.9, 671.6, 431.4, 668.1, 444.4, 664.6, 446.6, 657.9, 445.9, 657.9, 448.1, 661.6, 450.9, 662.4, 454.1, 659.6, 455.6, 653.6, 455.4, 653.9, 458.1, 656.6, 458.4, 660.6, 461.1, 660.9, 465.1, 664.1, 465.6, 667.4, 468.9, 669.9, 475.1, 672.6, 478.4, 670.9, 482.1, 678.9, 490.6, 678.1, 492.4, 667.6, 500.4, 668.6, 507.6, 673.9, 520.1, 677.4, 524.9, 681.4, 522.1, 683.9, 517.6, 688.6, 516.4, 693.6, 520.4, 692.9, 527.1, 702.6, 521.4, 703.6, 522.4, 702.6, 526.6, 705.9, 531.1, 711.9, 536.1, 724.4, 542.4, 728.6, 542.4, 733.4, 544.4, 741.6, 544.4, 753.4, 541.4, 758.6, 541.4, 766.6, 536.4, 769.9, 545.1, 773.1, 546.1, 770.4, 539.4, 774.6, 525.9, 776.6, 525.4, 779.1, 527.1, 781.9, 523.6, 785.6, 524.4, 790.4, 521.4, 792.6, 521.4, 796.1, 524.1, 799.4, 514.4, 796.9, 513.4, 795.1, 510.6, 796.9, 507.6, 799.9, 507.9, 801.4, 505.6, 798.9, 503.1, 795.9, 504.9, 794.6, 507.4, 794.6, 513.6, 792.6, 516.6, 789.9, 516.4, 788.1, 512.9, 785.6, 511.1, 784.4, 494.4, 776.4, 477.6, 777.4, 475.4, 780.4, 476.4, 782.4, 475.4, 777.4, 470.1, 776.4, 473.1, 774.4, 473.6, 770.4, 469.6, 772.6, 464.9, 774.9, 463.9, 773.4, 461.6, 774.1, 456.9, 761.4, 450.1, 753.4, 434.1, 752.6, 438.6, 754.6, 444.4, 754.6, 450.6, 752.4, 451.6, 749.6, 449.1, 743.1, 435.9, 739.1, 431.6, 730.6, 425.6, 727.6, 426.6, 722.4, 425.1, 719.4, 425.6, 717.6, 422.6, 708.4, 422.6, 696.4, 425.6, 682.9, 433.6, 680.4, 439.1, 678.4, 439.6, 676.4, 434.4, 683.4, 421.9, 690.9, 415.4] }, "49.52": { "L": [675.4, 483.9, 674.9, 485.9, 676.6, 488.9, 676.4, 491.6, 664.9, 499.9, 661.4, 504.1, 655.1, 507.9, 653.4, 511.1, 649.1, 515.4, 645.1, 517.6, 643.6, 523.4, 640.1, 523.9, 631.9, 527.9, 628.1, 531.4, 621.9, 534.4, 620.9, 535.4, 620.4, 538.6, 616.9, 540.4, 617.9, 542.6, 619.9, 543.4, 628.1, 543.4, 638.9, 540.4, 653.1, 538.1, 658.4, 535.9, 661.4, 530.6, 668.4, 528.9, 671.6, 524.9, 675.4, 523.9, 686.1, 514.6, 681.4, 501.1, 679.1, 485.4, 677.1, 483.9], "R": [730.4, 426.9, 729.6, 428.1, 730.1, 431.4, 745.4, 445.1, 745.9, 449.1, 750.1, 460.4, 757.9, 464.1, 765.1, 464.4, 768.9, 466.4, 771.6, 466.1, 774.4, 461.1, 775.6, 456.4, 778.9, 455.4, 780.6, 457.1, 781.1, 462.4, 790.9, 470.1, 794.6, 471.1, 796.4, 464.6, 799.1, 464.4, 801.9, 465.4, 804.1, 464.6, 803.4, 459.1, 804.4, 457.6, 807.1, 457.4, 809.9, 458.4, 812.1, 457.6, 811.9, 455.6, 802.1, 446.9, 797.1, 443.9, 790.4, 443.4, 788.9, 439.6, 780.1, 432.9, 772.1, 429.9, 765.1, 428.6, 758.9, 428.9, 755.6, 430.1, 753.1, 432.6, 752.6, 439.1, 754.6, 446.9, 753.6, 448.4, 750.4, 448.4, 746.6, 443.9, 745.9, 440.6, 741.1, 433.6, 734.1, 427.9], "M": [689.9, 414.9, 682.9, 417.9, 674.9, 425.9, 671.6, 431.4, 668.1, 444.4, 663.6, 446.6, 657.9, 445.9, 657.9, 448.1, 661.6, 451.4, 661.4, 454.1, 659.6, 455.6, 653.6, 455.4, 654.9, 458.1, 664.4, 460.9, 664.1, 463.4, 660.1, 464.4, 664.1, 465.6, 666.4, 467.9, 672.6, 478.4, 670.9, 482.1, 677.6, 489.4, 676.1, 492.4, 667.6, 498.4, 668.6, 507.6, 673.9, 520.1, 676.4, 522.9, 682.9, 516.6, 686.6, 515.4, 687.9, 517.1, 694.4, 519.9, 693.4, 526.1, 699.1, 524.1, 700.9, 521.6, 702.6, 521.4, 703.6, 522.4, 702.6, 526.6, 706.9, 532.4, 716.9, 539.1, 724.4, 542.4, 733.4, 544.4, 741.6, 544.4, 753.4, 541.4, 758.6, 541.4, 766.6, 536.4, 769.9, 545.1, 772.4, 546.4, 771.4, 535.4, 774.6, 525.9, 777.1, 525.6, 778.4, 527.9, 781.4, 523.9, 785.6, 524.4, 790.4, 521.4, 796.1, 524.1, 799.4, 515.6, 799.1, 513.9, 796.4, 512.6, 796.4, 507.4, 798.6, 506.4, 800.1, 507.6, 801.4, 505.6, 799.1, 502.9, 796.6, 503.9, 794.6, 507.4, 794.6, 513.6, 792.6, 516.6, 789.9, 516.4, 788.1, 512.9, 785.6, 511.1, 784.4, 494.4, 780.1, 483.9, 774.4, 474.6, 775.4, 472.4, 781.1, 473.9, 780.9, 467.6, 779.9, 466.6, 779.1, 468.4, 775.9, 468.9, 773.6, 471.6, 770.4, 469.6, 770.6, 467.9, 773.4, 465.6, 773.6, 462.9, 775.9, 461.9, 775.1, 457.9, 761.4, 450.1, 753.4, 434.1, 752.6, 439.6, 754.6, 444.4, 754.6, 449.6, 751.4, 450.6, 743.1, 435.9, 738.1, 430.6, 730.6, 425.6, 720.4, 425.6, 718.6, 422.6, 708.4, 422.6, 693.4, 426.6, 682.9, 433.6, 680.1, 439.4, 677.9, 439.4, 676.4, 434.4, 682.6, 422.9, 690.6, 415.6] }, "49.64": { "L": [675.4, 483.9, 675.6, 490.1, 673.1, 493.4, 664.9, 497.9, 661.4, 503.1, 657.9, 503.9, 653.1, 506.9, 649.9, 511.4, 644.1, 515.6, 641.6, 520.4, 638.9, 520.9, 627.9, 526.9, 618.9, 533.4, 617.4, 538.1, 612.4, 538.9, 612.1, 540.9, 616.9, 542.4, 623.1, 542.4, 625.9, 541.4, 632.1, 541.4, 637.9, 539.4, 652.1, 537.1, 657.4, 534.9, 660.4, 529.6, 663.9, 529.1, 668.4, 526.9, 671.6, 522.9, 675.4, 521.9, 684.4, 514.9, 685.4, 511.9, 681.4, 501.1, 679.4, 486.1, 678.1, 484.4], "R": [730.4, 426.9, 729.6, 428.1, 730.1, 431.4, 738.1, 437.6, 745.1, 445.6, 750.1, 460.4, 757.9, 464.1, 765.1, 464.4, 769.9, 466.4, 773.1, 465.6, 775.4, 460.1, 775.4, 454.9, 776.6, 450.4, 779.9, 449.4, 781.6, 451.1, 782.1, 460.4, 787.1, 462.6, 791.9, 466.1, 797.6, 468.1, 797.4, 462.1, 798.4, 460.6, 801.1, 460.4, 803.9, 461.4, 807.1, 460.6, 805.4, 456.1, 806.4, 452.6, 809.1, 452.4, 811.9, 453.4, 814.1, 452.6, 813.1, 450.4, 803.1, 442.9, 797.1, 439.9, 792.4, 439.4, 790.1, 436.4, 782.6, 433.1, 780.1, 430.9, 773.1, 428.6, 768.9, 428.6, 766.1, 427.6, 757.9, 428.6, 753.1, 431.6, 751.9, 433.9, 751.9, 436.1, 753.6, 444.9, 752.6, 446.4, 750.1, 446.6, 748.1, 445.1, 741.1, 433.6, 734.1, 427.9], "M": [689.4, 414.6, 681.9, 418.6, 674.9, 425.9, 671.6, 431.4, 668.1, 444.4, 664.6, 446.6, 657.9, 445.9, 657.9, 448.1, 661.6, 451.4, 661.4, 454.1, 659.6, 455.6, 653.6, 455.4, 653.9, 458.1, 664.4, 460.9, 664.1, 463.4, 660.1, 464.4, 664.1, 465.6, 666.4, 467.9, 671.6, 477.4, 670.6, 481.6, 676.6, 488.4, 676.1, 491.4, 667.6, 496.4, 668.6, 507.6, 673.9, 520.1, 675.6, 521.4, 682.9, 515.6, 685.6, 515.4, 686.9, 517.1, 690.6, 517.4, 692.4, 518.9, 693.1, 526.9, 702.6, 521.4, 703.6, 522.4, 702.6, 526.6, 707.9, 533.4, 724.4, 542.4, 733.4, 544.4, 741.6, 544.4, 758.6, 541.4, 762.1, 539.4, 763.9, 536.6, 766.6, 536.4, 769.9, 545.1, 772.4, 546.4, 770.4, 537.4, 773.6, 529.9, 777.1, 529.1, 782.4, 523.4, 785.6, 524.4, 791.6, 521.4, 796.1, 524.1, 799.4, 515.6, 799.4, 513.9, 796.4, 512.6, 796.4, 508.4, 797.4, 507.4, 799.9, 507.9, 801.4, 505.6, 798.9, 503.1, 795.9, 504.9, 794.6, 507.4, 794.6, 514.6, 792.6, 516.6, 789.9, 516.4, 785.4, 510.6, 784.4, 494.4, 780.1, 483.9, 774.4, 474.6, 774.4, 472.4, 775.4, 471.4, 781.4, 472.4, 780.4, 469.6, 781.4, 467.4, 785.9, 469.1, 786.6, 468.4, 780.6, 463.6, 779.1, 467.4, 775.9, 467.9, 773.6, 470.6, 770.9, 470.4, 769.4, 467.4, 774.1, 465.1, 774.4, 462.4, 776.4, 460.6, 775.4, 457.9, 761.6, 450.1, 752.9, 433.1, 751.6, 435.6, 754.6, 445.4, 754.6, 450.6, 751.9, 451.4, 742.4, 434.9, 730.6, 425.6, 719.4, 425.6, 717.6, 422.6, 702.4, 423.6, 687.9, 429.9, 681.9, 433.9, 680.1, 439.4, 677.9, 439.4, 676.4, 434.4, 683.4, 421.9, 690.9, 415.4] }, "49.72": { "L": [675.4, 483.9, 674.1, 490.4, 672.4, 492.1, 664.9, 495.9, 663.1, 497.6, 660.6, 503.4, 652.6, 504.1, 646.1, 510.4, 639.9, 513.4, 639.6, 516.9, 638.6, 518.4, 634.9, 518.9, 624.1, 525.4, 609.9, 531.4, 608.9, 533.6, 612.4, 535.4, 612.9, 538.6, 614.1, 539.4, 629.1, 539.4, 637.9, 536.4, 648.1, 536.4, 651.4, 535.4, 658.4, 531.9, 660.4, 526.6, 664.4, 525.9, 674.4, 519.9, 677.9, 516.6, 684.6, 514.1, 685.4, 511.9, 681.4, 501.1, 679.4, 485.9, 678.1, 484.4], "R": [760.9, 426.6, 753.6, 430.1, 751.9, 432.9, 751.6, 437.1, 753.6, 442.9, 753.4, 445.6, 751.9, 446.6, 749.4, 446.4, 746.6, 443.9, 746.1, 440.9, 743.1, 435.9, 737.1, 429.9, 732.1, 426.9, 730.4, 426.9, 729.6, 428.1, 729.9, 430.6, 735.6, 435.9, 738.6, 436.6, 741.9, 442.1, 745.4, 445.1, 750.1, 460.4, 757.9, 464.1, 765.1, 464.4, 770.6, 466.1, 774.1, 462.6, 774.4, 455.9, 776.1, 451.1, 775.4, 438.9, 776.1, 436.9, 778.1, 435.4, 781.9, 435.4, 783.6, 437.1, 782.6, 450.1, 781.6, 452.9, 782.1, 456.4, 796.9, 463.1, 801.1, 462.6, 801.1, 461.4, 797.6, 458.6, 797.4, 456.1, 798.4, 454.6, 801.1, 454.4, 803.9, 455.4, 810.1, 454.6, 809.1, 452.4, 805.6, 450.6, 805.4, 448.1, 806.4, 446.6, 809.1, 446.4, 811.9, 447.4, 816.1, 446.6, 816.1, 445.1, 814.6, 443.6, 799.1, 435.9, 786.4, 435.4, 784.6, 430.9, 777.1, 426.9], "M": [688.9, 414.9, 681.9, 418.6, 673.9, 426.9, 670.6, 434.4, 668.4, 444.1, 663.6, 446.6, 657.9, 445.9, 657.9, 448.1, 661.6, 451.4, 661.4, 454.1, 659.6, 455.6, 653.6, 455.4, 654.9, 458.1, 660.4, 460.4, 662.1, 460.1, 662.9, 456.6, 665.4, 456.9, 665.4, 462.1, 660.1, 464.4, 664.1, 465.6, 667.4, 468.9, 669.9, 475.1, 672.6, 478.4, 670.6, 481.6, 675.6, 487.4, 675.4, 490.1, 669.9, 492.9, 667.6, 495.4, 668.6, 507.6, 673.1, 518.6, 674.4, 519.9, 677.9, 516.6, 683.6, 514.4, 686.9, 517.1, 691.6, 518.9, 693.1, 525.9, 695.4, 524.4, 698.6, 524.4, 700.9, 521.6, 702.6, 521.4, 703.6, 522.4, 702.6, 526.6, 707.9, 533.1, 717.4, 539.4, 733.4, 544.4, 740.6, 544.4, 757.6, 541.4, 762.4, 538.1, 763.9, 534.6, 765.6, 534.4, 770.1, 545.6, 771.1, 546.9, 772.4, 546.4, 770.4, 541.6, 770.4, 536.4, 773.6, 528.9, 777.4, 528.9, 781.9, 523.6, 785.6, 524.4, 790.4, 521.4, 796.1, 524.1, 799.4, 516.6, 799.1, 513.9, 796.4, 513.1, 793.1, 516.4, 790.4, 516.6, 785.6, 511.1, 784.4, 494.4, 779.1, 481.9, 775.1, 474.9, 770.4, 469.6, 771.4, 467.4, 778.4, 470.4, 782.6, 470.4, 783.1, 468.9, 780.1, 464.9, 775.6, 464.1, 774.1, 456.9, 761.6, 450.1, 759.4, 443.4, 753.1, 432.9, 751.6, 433.4, 751.6, 437.6, 754.6, 445.4, 754.6, 449.6, 751.4, 450.6, 742.4, 434.9, 730.6, 425.6, 719.4, 425.6, 717.6, 422.6, 708.4, 422.6, 695.4, 425.6, 681.9, 433.9, 680.4, 439.1, 677.9, 439.4, 676.4, 434.4, 681.6, 423.9, 690.6, 415.1] }, "49.80": { "L": [675.4, 483.9, 673.4, 490.1, 660.9, 496.4, 660.6, 500.9, 659.6, 502.4, 650.1, 502.9, 644.9, 507.4, 639.6, 510.1, 636.6, 515.4, 633.9, 515.9, 616.1, 525.4, 605.6, 529.1, 604.9, 531.6, 608.4, 533.4, 608.9, 537.6, 610.1, 538.4, 620.1, 538.4, 626.1, 537.4, 632.1, 536.1, 639.9, 532.4, 643.6, 532.6, 645.4, 535.1, 646.9, 535.1, 658.4, 529.9, 660.4, 524.6, 663.9, 524.1, 666.4, 521.6, 669.4, 520.9, 674.1, 515.6, 682.1, 514.4, 686.6, 516.1, 687.1, 514.1, 683.6, 508.1, 681.4, 501.1, 680.1, 487.9, 678.1, 484.4], "R": [765.9, 424.6, 759.9, 425.9, 755.9, 427.9, 752.1, 431.6, 751.6, 436.1, 753.6, 442.9, 753.6, 445.9, 751.9, 447.6, 748.6, 446.6, 743.1, 435.9, 737.1, 429.9, 732.1, 426.6, 730.4, 426.9, 729.6, 428.1, 729.9, 430.6, 734.9, 435.1, 738.6, 436.6, 741.9, 442.1, 745.4, 445.1, 750.1, 460.4, 757.9, 464.1, 768.9, 465.4, 771.6, 461.9, 775.1, 460.6, 774.4, 453.9, 776.4, 446.9, 778.4, 443.9, 776.4, 440.1, 776.4, 435.1, 777.4, 433.6, 781.9, 433.4, 783.6, 435.1, 783.6, 447.1, 781.6, 450.1, 782.4, 453.1, 783.9, 454.4, 799.9, 459.4, 803.1, 458.6, 803.1, 457.4, 799.6, 454.6, 799.4, 452.1, 800.4, 450.6, 810.9, 450.4, 812.1, 449.6, 811.1, 447.4, 804.6, 444.6, 804.4, 442.1, 805.4, 440.6, 812.1, 440.4, 814.9, 441.4, 819.1, 440.6, 819.1, 439.4, 817.1, 437.9, 801.1, 431.9, 796.9, 431.6, 792.1, 432.6, 789.1, 429.4, 781.9, 427.4, 777.1, 424.9], "M": [688.9, 414.9, 678.9, 420.6, 673.9, 426.9, 670.6, 434.4, 670.6, 437.6, 668.6, 440.4, 668.4, 444.1, 663.6, 446.6, 657.9, 445.9, 658.6, 448.1, 662.6, 451.4, 661.6, 454.1, 659.6, 455.6, 653.6, 455.4, 654.9, 458.1, 664.4, 460.9, 664.1, 463.4, 660.1, 464.4, 664.1, 465.6, 666.4, 467.9, 668.9, 474.1, 672.6, 478.4, 670.6, 481.6, 675.6, 487.4, 675.1, 489.4, 667.1, 493.6, 668.6, 507.6, 671.9, 516.1, 682.6, 514.4, 687.4, 517.4, 689.6, 517.4, 692.6, 520.4, 692.4, 526.1, 695.4, 524.4, 698.6, 524.4, 700.9, 521.6, 702.6, 521.4, 703.6, 522.4, 702.6, 526.6, 707.9, 533.4, 724.4, 542.4, 733.4, 544.4, 747.6, 543.4, 752.4, 541.4, 757.6, 541.4, 761.1, 539.4, 763.9, 535.6, 765.6, 535.4, 769.9, 546.1, 772.4, 546.4, 770.4, 542.6, 770.4, 536.4, 773.6, 527.9, 775.6, 527.4, 777.4, 528.9, 782.4, 522.4, 785.6, 524.4, 791.6, 521.4, 796.1, 524.1, 799.4, 516.6, 799.1, 513.9, 796.1, 512.1, 796.6, 507.9, 800.1, 507.6, 798.9, 503.1, 795.6, 505.4, 794.6, 509.6, 795.9, 512.1, 793.1, 516.4, 789.9, 516.4, 785.6, 511.1, 785.4, 499.4, 781.4, 486.4, 775.1, 474.9, 767.4, 467.6, 768.4, 465.4, 776.4, 468.4, 784.6, 468.4, 785.1, 466.9, 780.6, 462.6, 776.4, 462.6, 774.1, 465.4, 771.6, 465.1, 771.6, 461.9, 775.4, 460.6, 774.1, 456.9, 761.6, 450.1, 756.1, 436.9, 752.4, 432.1, 751.6, 436.6, 754.6, 445.4, 754.6, 449.6, 751.4, 450.6, 745.1, 438.9, 738.1, 430.6, 730.6, 425.6, 724.4, 425.6, 722.4, 424.1, 719.4, 425.6, 716.6, 421.6, 695.4, 425.6, 681.9, 433.9, 680.4, 439.1, 677.9, 439.4, 676.4, 434.4, 681.6, 423.9, 690.4, 415.1] }, "49.88": { "L": [674.4, 482.9, 672.4, 489.1, 657.9, 495.4, 657.6, 499.9, 656.6, 501.4, 645.9, 501.9, 637.6, 506.1, 635.4, 510.1, 611.1, 521.4, 601.4, 524.9, 601.1, 527.4, 604.4, 529.4, 604.9, 534.6, 606.1, 535.4, 619.1, 535.4, 628.9, 533.4, 630.4, 534.4, 630.9, 537.6, 633.1, 538.1, 637.9, 535.4, 641.1, 535.1, 647.4, 532.4, 651.9, 529.6, 658.4, 527.9, 660.4, 521.6, 663.6, 521.1, 666.1, 518.6, 669.6, 518.1, 672.4, 514.6, 679.1, 514.4, 684.9, 516.4, 686.6, 516.1, 686.9, 513.6, 682.4, 508.9, 682.4, 503.9, 680.4, 496.1, 680.1, 486.9, 677.1, 483.6], "R": [775.9, 421.6, 761.9, 423.9, 755.9, 426.9, 751.9, 430.9, 750.6, 435.1, 753.6, 442.9, 753.4, 445.6, 751.9, 446.6, 748.6, 445.6, 746.1, 439.9, 739.1, 430.9, 731.9, 425.9, 729.9, 426.4, 729.6, 429.9, 730.9, 431.6, 738.6, 436.6, 745.4, 445.4, 750.6, 460.9, 759.9, 465.1, 766.1, 464.4, 775.9, 466.4, 783.9, 466.4, 785.4, 464.9, 785.6, 460.4, 787.1, 459.4, 790.6, 459.1, 792.4, 453.6, 803.9, 453.4, 805.1, 452.6, 804.1, 450.4, 796.6, 447.6, 796.4, 445.1, 797.4, 443.6, 810.1, 444.4, 814.1, 442.6, 813.6, 440.9, 805.6, 438.6, 805.4, 436.1, 806.4, 434.6, 817.1, 434.4, 818.9, 433.4, 819.1, 431.4, 816.1, 429.9, 798.1, 425.6, 793.1, 427.6, 786.1, 427.6, 784.6, 426.6, 783.6, 423.9], "M": [688.4, 414.6, 679.9, 419.6, 674.9, 424.9, 671.6, 430.4, 668.4, 444.1, 664.6, 445.6, 657.9, 445.9, 658.6, 448.1, 662.6, 451.4, 661.6, 454.1, 659.6, 455.6, 653.6, 455.4, 654.9, 458.1, 664.4, 460.9, 664.1, 463.4, 660.1, 464.4, 664.1, 465.6, 666.4, 467.9, 668.9, 474.1, 671.6, 477.4, 670.6, 481.6, 674.6, 486.4, 674.1, 488.4, 666.1, 491.6, 667.6, 494.4, 667.6, 502.6, 670.9, 514.1, 672.4, 515.4, 679.6, 514.4, 690.1, 517.6, 691.6, 519.4, 692.1, 525.9, 694.4, 524.4, 697.6, 524.4, 700.9, 520.6, 703.1, 520.6, 703.6, 522.6, 701.6, 525.6, 704.6, 530.1, 714.9, 538.1, 724.4, 542.4, 733.4, 544.4, 741.6, 544.4, 758.6, 541.4, 763.9, 536.6, 765.6, 536.4, 767.6, 539.4, 768.9, 545.1, 771.4, 546.9, 770.4, 535.4, 772.6, 529.9, 776.4, 529.9, 782.4, 523.4, 786.6, 524.4, 790.4, 521.4, 796.1, 524.1, 799.4, 516.6, 799.1, 514.9, 796.1, 512.1, 796.1, 509.6, 799.4, 505.6, 798.9, 503.1, 795.6, 506.4, 795.9, 512.1, 793.1, 516.4, 789.9, 516.4, 785.4, 510.6, 784.4, 494.4, 775.4, 475.6, 775.9, 472.6, 779.1, 472.1, 779.1, 470.9, 775.6, 469.1, 775.6, 466.9, 783.9, 465.6, 774.1, 456.9, 761.6, 450.1, 755.1, 434.9, 752.4, 432.1, 750.9, 432.9, 750.6, 435.6, 754.6, 445.4, 754.6, 449.6, 752.4, 450.6, 749.6, 448.1, 746.1, 439.9, 740.1, 431.6, 731.6, 425.6, 724.4, 425.6, 722.6, 424.6, 719.4, 425.6, 717.6, 421.6, 706.4, 422.6, 695.4, 425.6, 681.9, 433.6, 680.1, 439.4, 676.9, 439.4, 676.4, 433.4, 682.6, 421.9, 689.9, 415.4] }, "49.96": { "L": [675.4, 484.9, 672.4, 487.6, 654.4, 493.9, 652.6, 500.4, 641.9, 500.6, 632.4, 503.9, 630.6, 507.4, 608.1, 517.4, 597.6, 520.6, 596.1, 521.6, 595.9, 523.6, 597.1, 524.4, 602.9, 524.4, 604.4, 525.4, 604.4, 528.6, 601.9, 530.4, 602.9, 532.4, 605.9, 533.4, 612.1, 533.4, 620.9, 531.4, 625.9, 531.4, 627.4, 532.4, 627.9, 535.6, 629.1, 536.4, 633.1, 536.1, 650.9, 527.4, 655.6, 527.6, 656.9, 530.6, 658.9, 530.9, 659.9, 519.6, 667.9, 517.1, 671.9, 514.4, 675.9, 514.4, 677.6, 516.1, 677.4, 518.6, 673.9, 522.1, 672.9, 525.9, 673.4, 528.1, 677.9, 526.4, 684.9, 526.1, 688.1, 522.9, 688.4, 515.9, 683.4, 507.1, 681.4, 497.1, 681.1, 487.4, 677.1, 484.9], "R": [772.9, 419.6, 760.9, 422.9, 753.9, 427.6, 750.6, 432.9, 750.9, 436.1, 752.6, 439.9, 752.4, 442.6, 750.9, 443.6, 748.4, 443.4, 747.1, 442.1, 744.1, 435.9, 738.1, 429.9, 731.9, 425.9, 729.9, 426.4, 729.6, 429.1, 731.9, 432.1, 738.1, 436.6, 745.4, 444.9, 748.4, 451.9, 750.6, 460.9, 760.9, 465.1, 769.1, 465.6, 775.6, 470.9, 777.9, 471.4, 779.4, 469.9, 779.6, 465.4, 786.6, 463.1, 787.6, 457.4, 793.1, 455.6, 791.4, 452.1, 792.4, 448.6, 803.1, 448.4, 804.9, 447.4, 804.6, 444.9, 796.6, 442.6, 796.4, 440.1, 797.4, 438.6, 807.1, 438.4, 814.1, 436.6, 814.1, 434.4, 812.9, 433.6, 800.4, 433.4, 799.4, 431.9, 799.6, 429.4, 801.1, 428.4, 807.1, 428.4, 817.1, 426.4, 818.9, 425.4, 819.1, 423.4, 811.1, 421.6, 795.9, 421.6, 790.9, 422.6, 787.1, 420.6], "M": [689.9, 413.9, 681.9, 417.9, 673.9, 425.9, 670.6, 432.4, 668.1, 443.4, 664.6, 445.6, 657.6, 445.6, 658.6, 448.1, 662.6, 451.4, 661.6, 454.1, 659.6, 455.6, 652.6, 454.6, 653.9, 458.1, 659.4, 459.9, 660.9, 465.1, 663.6, 465.4, 666.4, 467.9, 670.6, 476.4, 670.6, 481.6, 673.6, 485.4, 673.1, 487.4, 664.6, 490.6, 668.6, 495.4, 668.6, 503.6, 671.9, 514.1, 675.6, 513.4, 678.4, 515.4, 682.6, 515.4, 685.6, 517.4, 684.6, 519.6, 678.4, 518.6, 675.9, 519.9, 676.9, 524.1, 680.1, 525.6, 681.6, 528.4, 687.4, 524.1, 688.6, 518.9, 690.6, 518.4, 692.1, 525.9, 694.4, 524.4, 698.1, 524.1, 700.4, 521.4, 702.1, 521.6, 701.6, 526.6, 707.9, 533.4, 723.4, 542.4, 732.4, 544.4, 745.6, 544.4, 754.4, 541.4, 758.6, 541.4, 762.9, 537.6, 765.6, 537.4, 767.6, 540.4, 768.9, 546.1, 772.1, 548.1, 772.4, 546.4, 769.4, 540.6, 771.6, 531.9, 776.1, 530.4, 780.9, 524.6, 786.6, 524.4, 790.4, 521.4, 796.4, 524.9, 800.4, 515.6, 800.1, 513.9, 797.4, 513.6, 796.1, 512.1, 796.4, 509.1, 799.4, 505.6, 798.9, 503.1, 795.6, 506.4, 795.9, 512.1, 793.1, 516.4, 789.9, 516.4, 785.4, 510.6, 784.4, 494.4, 781.4, 485.4, 774.4, 473.6, 774.9, 471.6, 779.6, 471.4, 780.4, 470.4, 775.6, 467.1, 775.6, 464.9, 782.9, 463.6, 774.1, 456.9, 761.6, 450.1, 760.4, 443.4, 757.1, 436.9, 752.4, 431.1, 750.6, 432.4, 750.6, 435.6, 754.6, 445.4, 754.6, 448.6, 751.4, 449.6, 744.1, 435.9, 739.1, 430.6, 730.6, 424.6, 724.4, 425.6, 717.6, 421.6, 704.4, 422.6, 694.4, 425.6, 682.9, 432.6, 680.6, 435.4, 680.1, 439.4, 676.9, 439.4, 676.4, 433.4, 681.6, 422.9, 690.6, 414.6] }, "50.04": { "L": [675.9, 484.6, 670.1, 486.6, 661.9, 487.9, 649.6, 492.1, 647.6, 499.4, 634.9, 498.9, 617.1, 507.4, 590.9, 515.9, 588.9, 517.4, 588.9, 518.6, 592.9, 520.4, 600.9, 520.4, 602.4, 521.4, 602.4, 524.6, 596.9, 527.4, 597.9, 529.6, 599.9, 530.4, 610.1, 530.4, 612.9, 529.4, 618.9, 529.4, 620.4, 530.4, 620.9, 534.6, 622.1, 535.4, 630.1, 534.1, 638.9, 529.4, 643.6, 529.6, 645.4, 532.1, 646.9, 532.1, 650.9, 529.4, 658.6, 530.1, 660.4, 527.6, 665.9, 527.4, 668.4, 530.1, 669.9, 530.1, 675.9, 527.4, 681.9, 528.1, 686.9, 524.4, 692.6, 524.1, 693.1, 521.4, 688.6, 519.6, 688.1, 513.9, 683.6, 504.1, 682.4, 498.1, 682.1, 488.1, 680.1, 485.9], "R": [808.9, 414.6, 806.1, 415.6, 792.9, 415.6, 790.1, 417.6, 773.9, 416.6, 765.9, 418.9, 757.9, 422.9, 751.9, 428.9, 750.6, 431.9, 750.6, 436.9, 748.9, 438.6, 746.4, 438.4, 739.1, 429.9, 733.4, 426.1, 730.9, 426.4, 730.6, 429.1, 732.9, 432.4, 739.1, 436.6, 744.4, 442.9, 747.4, 448.9, 750.6, 460.9, 760.9, 465.4, 769.6, 465.6, 772.9, 469.1, 777.1, 470.4, 781.1, 468.6, 781.4, 464.1, 782.4, 462.6, 788.9, 460.4, 789.1, 458.4, 786.4, 457.4, 785.4, 455.9, 786.4, 452.6, 796.9, 451.9, 796.6, 449.9, 792.6, 448.6, 792.4, 446.1, 793.4, 444.6, 806.1, 441.6, 806.1, 440.4, 804.1, 438.9, 797.4, 438.4, 796.4, 436.9, 796.6, 434.4, 798.1, 433.4, 813.1, 431.1, 815.9, 429.4, 816.1, 427.4, 814.9, 426.6, 809.1, 427.6, 802.1, 427.6, 800.6, 426.6, 800.4, 424.1, 801.4, 422.6, 816.1, 419.1, 820.1, 416.6, 820.1, 415.4, 818.9, 414.6], "M": [689.4, 413.6, 680.9, 417.9, 676.6, 421.9, 671.6, 429.4, 669.6, 438.6, 665.1, 445.4, 657.9, 444.9, 657.9, 447.1, 661.6, 450.4, 660.4, 455.1, 652.6, 454.6, 653.9, 458.1, 659.4, 459.9, 660.9, 465.1, 665.6, 466.9, 670.6, 477.4, 671.4, 486.1, 662.1, 488.4, 669.6, 495.4, 670.6, 509.6, 675.6, 515.4, 674.6, 518.6, 676.9, 523.1, 681.4, 528.4, 688.4, 522.4, 690.1, 522.6, 691.6, 525.4, 700.6, 523.4, 704.6, 530.1, 712.9, 537.1, 723.4, 542.4, 731.4, 544.4, 746.6, 544.4, 758.6, 541.4, 762.1, 538.1, 762.6, 535.9, 764.6, 535.4, 768.9, 546.1, 772.1, 548.1, 772.4, 546.4, 769.4, 541.6, 769.4, 537.4, 771.6, 531.9, 776.1, 530.4, 780.9, 524.6, 786.1, 524.6, 790.4, 521.4, 793.1, 522.4, 796.4, 526.9, 801.4, 513.6, 797.9, 513.4, 796.1, 510.6, 797.9, 506.6, 799.6, 506.4, 801.1, 507.9, 802.4, 506.6, 802.1, 504.9, 799.4, 502.6, 796.6, 504.9, 795.6, 506.4, 795.6, 512.9, 792.6, 516.6, 789.9, 516.4, 785.4, 510.6, 784.4, 494.4, 781.4, 485.4, 774.4, 473.6, 774.9, 470.6, 781.9, 468.4, 778.4, 465.6, 778.6, 462.9, 780.9, 461.6, 762.6, 451.1, 760.4, 443.4, 752.4, 430.1, 750.6, 431.4, 750.6, 435.6, 754.6, 445.4, 754.4, 449.1, 752.4, 449.6, 749.6, 447.1, 745.1, 436.9, 740.1, 430.6, 729.6, 423.6, 723.4, 424.6, 722.1, 422.9, 715.6, 420.6, 696.4, 424.6, 681.9, 432.9, 680.4, 438.1, 678.6, 439.6, 676.9, 439.4, 676.4, 433.4, 682.4, 421.9, 690.9, 414.4] }, "50.12": { "L": [672.9, 484.6, 659.9, 486.6, 646.9, 490.4, 645.6, 492.9, 648.6, 495.9, 648.6, 498.1, 647.6, 499.4, 644.9, 499.6, 635.1, 496.6, 628.9, 496.6, 614.1, 503.4, 586.1, 511.9, 584.9, 513.1, 584.9, 514.6, 589.9, 516.4, 597.9, 516.4, 599.4, 517.4, 599.4, 520.6, 592.9, 524.4, 593.4, 526.1, 595.9, 527.1, 604.1, 527.4, 612.9, 525.4, 615.6, 525.6, 616.6, 527.1, 615.9, 532.6, 617.1, 533.4, 625.1, 532.1, 635.9, 528.4, 638.6, 528.6, 640.4, 532.1, 646.4, 530.4, 650.9, 527.4, 654.6, 527.6, 656.4, 530.1, 657.9, 530.1, 661.9, 526.4, 664.6, 526.6, 665.9, 530.6, 667.9, 531.1, 672.9, 527.4, 680.9, 528.1, 685.1, 524.6, 692.6, 524.1, 693.1, 520.4, 689.6, 518.6, 689.1, 514.9, 686.6, 510.1, 683.6, 500.1, 683.1, 490.1, 679.4, 485.1], "R": [813.9, 406.6, 797.1, 410.6, 791.9, 410.9, 788.1, 413.6, 775.9, 413.6, 763.9, 417.9, 759.9, 419.9, 753.9, 424.9, 750.9, 429.9, 750.4, 436.6, 748.9, 437.6, 745.6, 437.1, 739.4, 429.9, 733.1, 425.9, 730.9, 426.4, 730.6, 429.1, 732.9, 432.1, 740.4, 437.6, 745.4, 443.9, 751.4, 461.1, 760.9, 465.1, 767.1, 464.4, 773.9, 469.1, 778.1, 469.1, 780.9, 467.4, 781.4, 462.1, 782.4, 460.6, 790.1, 457.6, 788.4, 454.1, 788.6, 450.4, 790.1, 449.4, 795.1, 449.1, 798.1, 447.6, 797.6, 445.9, 792.9, 444.4, 792.6, 440.4, 794.1, 439.4, 802.1, 438.1, 808.1, 435.6, 806.9, 433.6, 797.4, 433.4, 796.4, 431.9, 796.6, 429.4, 799.9, 427.6, 804.1, 427.1, 813.1, 424.1, 815.9, 422.4, 816.1, 420.4, 814.9, 419.6, 804.1, 421.6, 801.4, 421.4, 800.4, 419.9, 801.4, 416.6, 815.1, 411.1, 816.9, 409.4, 817.1, 407.4], "M": [689.9, 412.9, 681.9, 416.9, 673.9, 424.9, 670.6, 431.4, 670.6, 435.6, 667.6, 440.4, 667.4, 443.1, 663.6, 445.6, 657.9, 444.9, 661.6, 450.4, 660.4, 455.1, 652.6, 454.6, 653.9, 458.1, 659.4, 459.9, 660.9, 465.1, 665.4, 466.9, 667.6, 473.6, 670.6, 477.4, 671.4, 485.1, 661.1, 487.4, 669.4, 494.9, 670.6, 497.4, 670.6, 505.6, 676.9, 522.1, 681.4, 527.4, 688.4, 522.4, 690.1, 522.6, 691.6, 525.4, 700.6, 523.4, 704.6, 530.1, 712.9, 537.1, 723.4, 542.4, 731.4, 544.4, 745.6, 544.4, 754.4, 541.4, 758.1, 541.6, 764.6, 537.4, 766.6, 540.4, 767.9, 546.1, 771.1, 548.1, 771.9, 546.6, 769.4, 543.6, 769.4, 535.4, 770.6, 532.9, 776.1, 530.4, 780.9, 524.6, 785.4, 524.9, 789.4, 522.4, 794.1, 523.4, 796.4, 528.9, 797.4, 522.4, 801.4, 513.9, 797.9, 513.4, 796.1, 510.6, 797.9, 507.6, 801.4, 507.9, 803.4, 506.6, 803.1, 504.9, 800.9, 504.4, 800.1, 502.9, 797.9, 503.6, 795.6, 506.4, 795.6, 512.9, 792.6, 516.6, 789.9, 516.4, 789.1, 513.9, 785.6, 511.1, 784.4, 494.4, 781.4, 485.4, 773.4, 471.6, 773.9, 469.6, 777.6, 469.4, 782.1, 467.1, 781.1, 464.9, 778.4, 463.6, 779.6, 460.9, 771.1, 454.9, 762.6, 451.1, 760.4, 442.4, 757.1, 435.9, 752.1, 429.9, 750.9, 429.9, 749.6, 432.6, 754.6, 445.4, 754.4, 449.1, 752.4, 449.6, 744.1, 434.9, 738.1, 428.6, 730.6, 423.6, 724.4, 424.6, 723.1, 422.9, 720.4, 422.6, 717.6, 420.6, 706.4, 421.6, 695.4, 424.6, 681.9, 432.6, 679.4, 439.1, 677.1, 441.4, 674.9, 441.4, 674.4, 439.4, 676.4, 437.6, 676.4, 432.4, 681.6, 421.9, 691.4, 413.1] }, "50.20": { "L": [672.9, 483.6, 670.1, 484.6, 653.9, 485.6, 639.6, 489.1, 638.9, 490.1, 639.4, 492.1, 646.1, 493.6, 648.4, 495.4, 648.6, 498.1, 646.9, 499.6, 640.9, 498.4, 636.1, 495.6, 624.9, 493.6, 599.1, 502.4, 590.9, 503.6, 583.9, 505.9, 581.4, 506.9, 580.9, 508.6, 586.9, 511.4, 599.6, 511.6, 600.6, 513.1, 600.4, 515.6, 590.9, 519.4, 589.6, 521.1, 589.9, 522.6, 591.1, 523.4, 605.1, 523.4, 611.9, 522.4, 613.6, 524.1, 613.6, 526.1, 611.9, 528.4, 611.9, 529.6, 613.1, 530.4, 620.1, 530.4, 628.9, 527.4, 632.6, 527.6, 633.9, 530.6, 635.1, 531.4, 641.1, 530.1, 647.9, 527.4, 651.6, 527.6, 653.4, 530.1, 655.1, 530.1, 660.9, 526.4, 663.6, 526.6, 664.9, 529.6, 667.1, 530.4, 674.9, 525.4, 677.1, 525.4, 679.4, 527.1, 680.9, 527.1, 686.9, 522.6, 692.6, 522.1, 693.4, 519.9, 686.6, 508.1, 684.4, 498.1, 683.9, 490.6, 678.6, 483.9], "R": [813.9, 397.6, 786.9, 406.6, 784.6, 410.4, 777.9, 409.6, 772.9, 410.9, 764.9, 414.9, 758.9, 418.9, 753.9, 423.9, 749.9, 430.9, 748.6, 435.4, 744.6, 435.1, 740.1, 429.9, 736.1, 426.9, 732.9, 424.9, 730.9, 425.4, 730.9, 429.6, 735.6, 433.9, 740.4, 436.6, 745.4, 442.9, 749.4, 452.9, 751.4, 461.1, 760.9, 465.1, 768.1, 464.4, 773.9, 468.4, 781.1, 466.1, 783.1, 464.6, 783.9, 458.6, 790.1, 454.9, 790.1, 453.4, 788.4, 451.1, 788.9, 447.6, 799.1, 442.6, 798.6, 440.9, 793.4, 440.4, 792.4, 438.9, 792.6, 436.4, 801.1, 433.1, 806.1, 429.9, 806.1, 428.4, 804.9, 427.6, 795.4, 428.4, 794.4, 426.9, 794.6, 424.4, 807.1, 419.1, 816.1, 413.6, 816.1, 412.4, 814.9, 411.6, 804.1, 414.6, 801.4, 414.4, 800.4, 412.9, 800.6, 410.4, 801.9, 409.1, 811.1, 404.1, 815.9, 400.4, 816.1, 398.4], "M": [689.4, 412.6, 678.9, 418.6, 672.9, 425.9, 669.6, 432.4, 669.6, 436.6, 667.1, 443.4, 663.6, 444.6, 657.9, 443.9, 657.9, 446.1, 662.6, 450.4, 660.4, 455.1, 657.4, 455.6, 652.6, 453.6, 651.6, 454.4, 652.9, 458.1, 655.6, 458.4, 659.4, 460.9, 660.9, 465.1, 665.4, 465.9, 667.6, 473.6, 670.6, 477.4, 671.1, 484.4, 661.4, 484.6, 660.1, 486.4, 671.4, 497.9, 673.6, 513.6, 679.9, 525.1, 681.6, 526.4, 687.4, 522.4, 692.6, 522.4, 694.4, 525.4, 700.6, 523.4, 703.6, 529.1, 715.9, 539.1, 731.4, 544.4, 745.6, 544.4, 750.4, 542.4, 756.6, 542.4, 760.1, 540.4, 761.6, 535.9, 763.6, 535.4, 766.9, 545.1, 770.4, 548.4, 771.4, 547.4, 768.4, 542.6, 769.4, 534.4, 770.9, 531.6, 776.1, 530.4, 780.9, 524.6, 786.6, 524.4, 789.4, 522.4, 792.6, 522.4, 795.4, 524.9, 795.6, 528.6, 796.9, 529.9, 798.4, 527.6, 797.4, 522.4, 801.4, 513.9, 797.9, 513.4, 796.1, 510.6, 798.4, 507.4, 803.1, 508.1, 803.4, 505.4, 799.4, 502.6, 797.6, 503.9, 795.6, 507.4, 795.6, 512.9, 792.6, 516.6, 789.9, 516.4, 789.1, 513.9, 785.6, 511.1, 784.4, 493.4, 777.1, 476.9, 772.4, 470.6, 772.9, 468.6, 780.6, 466.4, 783.4, 464.4, 779.6, 462.1, 779.1, 459.9, 762.6, 450.1, 760.4, 441.4, 754.4, 430.9, 751.6, 428.6, 749.6, 431.4, 754.6, 444.4, 753.6, 448.6, 750.6, 447.1, 745.1, 435.9, 741.1, 430.6, 731.6, 423.6, 723.4, 424.6, 722.1, 421.9, 717.6, 420.6, 703.4, 421.6, 689.9, 426.9, 680.9, 432.9, 679.4, 438.1, 676.1, 442.4, 674.4, 442.6, 673.4, 439.4, 675.4, 436.6, 675.4, 433.4, 681.4, 421.9, 684.9, 417.6, 690.9, 413.4] }, "50.28": { "L": [660.9, 483.6, 658.1, 484.6, 644.9, 484.6, 632.4, 487.9, 631.4, 492.6, 629.9, 493.6, 626.9, 493.4, 623.1, 491.6, 618.9, 491.6, 595.1, 498.4, 590.9, 498.6, 579.1, 501.6, 577.9, 502.4, 577.6, 503.9, 579.9, 506.1, 585.9, 507.4, 597.6, 507.6, 598.6, 509.1, 597.6, 512.4, 586.6, 516.1, 585.9, 518.6, 591.9, 520.4, 598.1, 520.4, 600.9, 519.4, 609.6, 519.6, 610.6, 522.9, 607.9, 526.1, 607.9, 527.6, 609.1, 528.4, 615.1, 528.4, 622.9, 526.4, 626.9, 526.4, 628.4, 527.4, 629.4, 531.1, 632.1, 531.4, 641.9, 528.1, 645.9, 525.4, 649.6, 525.6, 650.9, 528.6, 652.1, 529.4, 660.9, 527.4, 663.4, 530.1, 665.1, 530.4, 669.4, 528.9, 672.9, 525.4, 675.6, 525.6, 677.4, 528.1, 678.9, 528.1, 685.9, 522.4, 691.1, 522.4, 693.4, 524.1, 695.1, 523.6, 695.1, 521.9, 689.6, 513.1, 686.6, 506.1, 685.4, 500.1, 685.1, 492.1, 677.9, 483.9], "R": [808.9, 390.9, 782.9, 403.4, 780.6, 406.4, 775.9, 406.9, 763.9, 412.9, 754.9, 420.9, 749.9, 429.9, 749.6, 433.9, 748.6, 435.4, 745.4, 435.4, 737.1, 426.9, 733.1, 424.9, 730.9, 425.4, 731.1, 429.4, 734.6, 432.9, 739.1, 434.6, 745.9, 443.1, 747.9, 443.9, 748.6, 441.4, 750.1, 440.4, 753.4, 441.4, 753.6, 443.9, 752.6, 445.4, 748.1, 445.1, 747.6, 446.4, 751.6, 460.9, 759.9, 464.4, 767.1, 463.4, 772.9, 467.4, 776.1, 467.1, 783.1, 463.6, 783.6, 457.4, 789.1, 454.1, 791.1, 451.9, 791.1, 450.4, 788.6, 448.6, 788.6, 445.4, 799.1, 438.6, 798.6, 436.9, 795.1, 436.6, 793.6, 435.6, 793.6, 432.4, 807.1, 423.6, 807.1, 422.4, 805.9, 421.6, 799.1, 423.6, 796.4, 423.4, 795.4, 421.9, 795.6, 419.4, 798.9, 416.6, 806.1, 413.1, 814.1, 405.9, 813.6, 403.9, 811.9, 403.9, 803.1, 408.4, 800.1, 408.6, 798.6, 407.6, 798.9, 403.6, 810.1, 395.1, 811.1, 391.4], "M": [689.9, 411.9, 681.9, 415.9, 673.9, 423.9, 669.6, 431.4, 669.6, 435.6, 667.4, 442.1, 663.6, 444.6, 657.9, 443.9, 662.6, 450.4, 660.6, 454.9, 657.4, 455.6, 652.6, 453.6, 651.6, 454.4, 652.9, 458.1, 659.4, 459.9, 660.9, 465.1, 665.4, 465.9, 667.9, 474.1, 673.6, 480.4, 673.4, 482.1, 670.6, 483.6, 660.4, 483.6, 659.1, 485.4, 672.4, 498.9, 673.6, 511.6, 680.9, 526.1, 684.4, 523.4, 686.1, 523.6, 687.1, 525.4, 689.4, 522.4, 692.1, 522.6, 693.6, 525.4, 701.6, 520.4, 702.6, 521.4, 701.6, 525.6, 704.6, 530.1, 715.9, 539.1, 723.4, 542.4, 732.4, 544.4, 745.6, 544.4, 752.4, 542.4, 757.6, 542.4, 761.9, 537.6, 763.6, 537.4, 766.9, 546.1, 769.4, 548.4, 770.9, 547.9, 768.4, 543.6, 769.4, 533.4, 771.4, 531.4, 776.1, 530.1, 780.9, 524.6, 786.6, 524.4, 789.4, 522.4, 792.6, 522.4, 795.4, 524.9, 795.6, 528.6, 797.9, 530.9, 798.9, 528.6, 797.4, 523.4, 802.1, 514.1, 801.9, 513.1, 798.4, 513.6, 797.4, 512.6, 797.4, 508.4, 800.4, 503.4, 799.4, 502.6, 797.9, 503.6, 795.6, 507.4, 795.6, 513.6, 794.1, 516.4, 789.9, 516.4, 789.1, 513.9, 785.6, 511.1, 784.4, 493.4, 776.1, 474.9, 772.4, 469.6, 772.9, 467.6, 782.9, 463.6, 778.1, 458.9, 763.6, 451.1, 760.4, 440.4, 753.1, 428.9, 750.9, 427.9, 749.6, 433.6, 754.6, 443.4, 753.6, 448.6, 750.6, 447.1, 746.1, 436.9, 738.1, 427.6, 730.6, 422.6, 724.4, 423.6, 723.1, 421.9, 720.4, 421.6, 717.6, 419.6, 701.4, 421.6, 688.9, 426.9, 680.6, 432.9, 678.4, 439.1, 674.4, 441.6, 673.4, 439.4, 675.4, 435.6, 675.4, 432.4, 679.6, 423.9, 682.4, 419.9, 690.6, 412.6] }, "50.36": { "L": [650.9, 481.6, 648.1, 482.6, 635.9, 482.6, 607.1, 488.6, 589.9, 490.6, 575.4, 493.9, 574.6, 495.9, 575.9, 497.6, 579.9, 499.1, 592.4, 500.9, 593.6, 502.9, 593.4, 505.6, 582.9, 509.4, 581.9, 511.6, 583.9, 513.1, 590.9, 514.4, 605.6, 514.6, 606.6, 517.9, 602.9, 521.4, 603.4, 523.1, 611.1, 524.4, 622.9, 522.4, 624.4, 523.4, 624.9, 527.6, 626.1, 528.4, 632.1, 528.4, 637.9, 525.6, 642.9, 525.4, 644.4, 526.4, 645.4, 530.1, 647.1, 530.1, 654.9, 526.4, 658.9, 526.4, 660.4, 527.4, 661.4, 530.1, 663.1, 530.4, 671.9, 525.4, 674.1, 525.4, 678.1, 527.4, 683.9, 524.4, 694.6, 523.1, 695.1, 521.1, 689.6, 512.6, 689.1, 509.1, 687.4, 506.1, 686.4, 502.1, 686.1, 493.1, 677.6, 482.9], "R": [806.1, 382.9, 778.9, 399.9, 760.6, 412.9, 754.9, 418.9, 751.9, 423.9, 749.9, 427.9, 749.6, 432.9, 748.6, 434.4, 745.4, 434.4, 740.4, 428.9, 735.1, 424.9, 733.1, 423.9, 730.9, 424.4, 731.1, 429.4, 733.6, 431.9, 740.4, 434.9, 746.4, 442.9, 749.4, 450.9, 751.6, 460.9, 761.1, 464.4, 768.4, 469.1, 779.1, 465.1, 784.1, 461.6, 783.6, 455.4, 789.1, 452.1, 792.1, 448.9, 791.6, 446.9, 788.6, 445.6, 788.6, 442.4, 799.1, 434.9, 798.6, 432.9, 795.1, 432.6, 793.6, 431.6, 793.9, 427.6, 802.1, 422.1, 806.1, 417.9, 805.6, 415.9, 800.1, 417.6, 797.4, 417.4, 796.4, 415.9, 796.6, 413.1, 808.1, 404.1, 813.1, 398.9, 812.6, 396.9, 810.9, 396.9, 797.1, 404.6, 793.6, 403.6, 793.6, 400.4, 807.1, 387.1, 808.1, 383.4], "M": [689.9, 410.9, 680.9, 415.9, 673.9, 422.9, 669.6, 430.4, 669.6, 433.6, 667.6, 437.4, 668.4, 442.1, 661.6, 443.6, 657.9, 443.1, 658.9, 446.1, 662.6, 449.4, 660.9, 453.1, 664.4, 454.9, 664.4, 457.1, 662.4, 457.6, 652.6, 453.6, 651.6, 454.4, 652.9, 458.1, 659.1, 459.6, 659.9, 464.1, 665.4, 466.9, 667.9, 474.1, 673.6, 480.4, 672.6, 482.6, 664.4, 482.6, 662.6, 481.6, 657.1, 482.4, 673.4, 499.9, 674.6, 512.6, 680.9, 525.1, 684.6, 524.4, 687.1, 526.1, 688.6, 522.9, 690.6, 522.4, 692.6, 525.4, 699.1, 522.1, 699.6, 519.9, 701.6, 519.4, 702.6, 520.4, 701.6, 525.6, 702.9, 528.1, 707.9, 533.4, 716.4, 539.4, 731.4, 544.4, 746.6, 544.4, 751.4, 542.4, 756.6, 542.4, 760.9, 537.6, 762.6, 537.4, 764.6, 540.4, 765.9, 546.1, 768.4, 548.4, 770.4, 547.4, 767.4, 542.6, 767.4, 537.4, 769.6, 531.9, 773.4, 531.9, 779.9, 525.6, 783.6, 526.4, 789.4, 522.4, 792.6, 522.4, 795.4, 524.9, 796.9, 530.1, 799.1, 531.1, 797.4, 523.4, 802.1, 513.4, 797.9, 513.4, 797.4, 509.4, 799.4, 506.4, 805.1, 509.4, 805.4, 504.4, 803.9, 503.9, 803.1, 505.4, 801.1, 505.6, 800.1, 502.9, 797.6, 503.9, 795.6, 507.4, 795.6, 513.6, 793.6, 516.6, 789.9, 516.4, 789.1, 513.9, 785.6, 511.1, 784.4, 493.4, 781.4, 484.4, 775.4, 473.6, 775.9, 471.6, 779.4, 470.4, 776.4, 467.9, 776.6, 465.9, 781.1, 464.1, 782.4, 462.4, 775.1, 456.9, 763.6, 451.1, 760.4, 439.4, 753.1, 427.9, 750.6, 426.6, 749.6, 432.6, 754.6, 443.4, 753.6, 447.6, 751.6, 447.1, 746.1, 435.9, 739.1, 427.6, 731.1, 422.4, 719.4, 421.6, 716.6, 418.6, 707.4, 419.6, 692.9, 423.9, 680.9, 431.6, 677.4, 439.1, 674.4, 440.6, 673.4, 438.4, 674.6, 431.9, 681.6, 419.9, 691.4, 411.1] }, "50.44": { "L": [646.9, 478.9, 643.1, 480.6, 626.9, 479.6, 624.1, 480.6, 615.9, 480.6, 604.1, 482.6, 578.9, 483.6, 572.4, 484.9, 571.9, 486.9, 578.9, 491.1, 587.9, 493.4, 591.9, 493.4, 593.4, 494.4, 593.6, 497.1, 592.4, 499.1, 578.9, 502.6, 577.9, 504.6, 583.9, 507.4, 604.6, 508.6, 605.6, 510.1, 605.4, 512.6, 598.9, 516.4, 599.6, 518.9, 614.1, 519.4, 620.9, 518.4, 622.4, 519.4, 623.4, 525.1, 633.1, 525.4, 636.9, 523.4, 639.9, 523.4, 641.4, 524.4, 642.4, 529.1, 645.1, 529.4, 650.9, 526.6, 654.9, 526.4, 656.4, 527.4, 656.9, 530.6, 659.1, 531.1, 669.9, 525.4, 672.6, 525.6, 674.4, 528.1, 675.9, 528.1, 683.9, 523.4, 695.6, 523.1, 696.1, 520.9, 689.4, 511.1, 689.4, 506.9, 687.4, 502.1, 686.1, 493.1, 677.4, 483.1, 671.1, 481.6, 664.9, 481.6, 658.1, 479.6], "R": [801.9, 376.9, 767.9, 403.9, 758.9, 412.6, 753.9, 418.9, 750.9, 424.9, 748.6, 432.4, 744.6, 432.1, 734.9, 423.9, 731.9, 424.4, 732.1, 429.4, 734.6, 431.9, 738.4, 432.9, 744.4, 438.9, 748.4, 446.9, 750.6, 453.9, 750.6, 458.9, 751.9, 460.6, 761.9, 465.1, 763.6, 465.1, 765.9, 463.4, 768.1, 463.4, 772.1, 466.1, 775.1, 466.1, 783.1, 462.1, 784.9, 460.4, 784.6, 453.4, 793.9, 446.4, 794.1, 444.4, 790.6, 442.6, 790.4, 439.9, 798.9, 431.4, 799.1, 429.4, 794.4, 428.4, 793.4, 426.9, 793.6, 424.1, 802.4, 417.1, 806.1, 412.9, 805.6, 410.9, 800.1, 412.6, 797.4, 412.4, 796.4, 408.9, 810.1, 392.9, 810.1, 391.4, 808.1, 390.9, 798.9, 397.4, 796.1, 397.6, 794.6, 396.6, 794.4, 393.9, 795.6, 390.9, 799.1, 387.1, 804.1, 379.1, 804.1, 377.4], "M": [690.9, 409.9, 681.9, 413.9, 672.9, 422.9, 668.6, 431.4, 667.6, 436.4, 668.4, 441.1, 657.9, 442.9, 661.6, 448.4, 661.1, 452.4, 664.4, 453.9, 664.4, 456.1, 661.4, 456.6, 652.6, 453.6, 651.6, 454.4, 652.9, 458.1, 659.4, 459.9, 658.9, 464.1, 664.4, 465.9, 667.9, 474.1, 672.6, 479.4, 671.6, 481.6, 664.4, 481.6, 658.6, 479.6, 656.1, 480.4, 659.6, 486.1, 673.4, 499.9, 674.6, 508.6, 679.9, 522.1, 681.6, 523.9, 684.6, 522.4, 685.9, 525.1, 687.1, 525.1, 689.4, 521.4, 691.4, 521.9, 692.1, 524.9, 699.6, 522.4, 703.6, 529.1, 715.9, 539.1, 731.4, 544.4, 744.6, 544.4, 750.4, 542.4, 756.6, 542.4, 759.9, 538.6, 762.6, 538.4, 765.9, 547.1, 768.4, 549.4, 769.4, 547.4, 766.4, 541.6, 767.4, 535.4, 768.9, 533.6, 773.1, 532.4, 779.9, 525.6, 783.6, 526.4, 789.4, 522.4, 792.6, 522.4, 795.6, 525.4, 795.9, 529.1, 799.1, 531.1, 797.4, 523.4, 801.9, 514.1, 797.6, 513.1, 797.4, 509.4, 799.6, 508.4, 804.4, 510.9, 805.4, 504.4, 803.9, 503.9, 801.4, 505.6, 800.1, 502.9, 797.6, 503.9, 795.6, 508.4, 795.6, 513.6, 793.6, 516.6, 789.9, 516.4, 788.4, 512.9, 785.6, 511.1, 784.4, 492.4, 775.4, 472.6, 775.9, 470.6, 779.6, 470.4, 780.1, 468.9, 773.4, 469.6, 772.4, 468.6, 772.9, 466.6, 781.1, 463.1, 781.9, 461.6, 763.6, 450.1, 761.4, 441.4, 755.4, 429.9, 751.4, 426.1, 749.6, 428.4, 749.6, 431.6, 755.6, 444.4, 754.6, 447.6, 751.6, 446.1, 745.1, 432.9, 740.1, 427.6, 731.6, 421.6, 723.4, 422.6, 717.6, 418.6, 708.4, 418.6, 694.4, 422.6, 679.9, 431.6, 676.6, 439.1, 672.4, 440.6, 671.4, 438.4, 674.4, 434.6, 674.4, 431.4, 678.6, 422.9, 685.9, 414.4, 691.6, 410.6] }, "50.52": { "L": [572.1, 474.6, 570.9, 475.4, 570.6, 477.1, 572.9, 480.1, 585.9, 485.1, 592.6, 486.6, 593.6, 488.1, 592.6, 491.4, 576.9, 493.9, 574.9, 495.4, 574.9, 496.6, 578.9, 499.1, 591.9, 502.4, 600.6, 502.6, 601.6, 504.1, 601.4, 506.6, 594.9, 509.4, 593.9, 511.6, 595.9, 513.1, 600.9, 514.4, 618.6, 514.6, 619.6, 518.1, 617.9, 520.4, 618.4, 522.1, 629.1, 522.4, 631.9, 521.4, 636.9, 521.4, 638.4, 522.4, 638.9, 526.6, 640.1, 527.4, 646.1, 526.4, 649.9, 524.4, 652.9, 524.4, 654.4, 525.4, 654.9, 529.6, 657.1, 530.4, 663.4, 527.9, 668.9, 524.4, 671.6, 524.6, 673.4, 527.1, 674.9, 527.1, 682.9, 522.6, 694.1, 523.1, 696.1, 521.6, 695.1, 516.4, 690.4, 511.1, 690.4, 507.9, 688.4, 504.1, 687.9, 494.6, 680.6, 488.1, 675.9, 481.9, 666.9, 480.6, 648.1, 475.6, 641.9, 475.6, 639.1, 474.6, 634.1, 475.6, 589.9, 475.6, 587.1, 474.6], "R": [797.1, 371.9, 758.9, 409.9, 753.1, 418.6, 749.9, 426.9, 749.9, 431.1, 753.4, 436.9, 754.6, 440.9, 754.6, 446.1, 752.6, 448.9, 752.9, 459.6, 761.6, 463.6, 769.9, 469.4, 776.9, 470.1, 779.9, 469.4, 780.9, 462.6, 786.1, 458.6, 784.4, 455.1, 784.6, 452.4, 794.1, 443.9, 793.6, 441.9, 790.6, 440.6, 790.6, 437.1, 800.1, 426.9, 799.6, 424.9, 796.1, 424.6, 794.6, 423.6, 794.4, 420.9, 802.1, 412.1, 804.9, 408.4, 805.1, 406.4, 803.1, 405.9, 797.9, 409.4, 795.1, 409.6, 793.6, 408.6, 793.4, 405.9, 802.1, 396.1, 805.9, 390.4, 806.4, 388.1, 804.9, 386.6, 802.6, 387.1, 793.9, 395.4, 791.1, 395.6, 789.4, 393.9, 789.9, 390.6, 794.1, 385.1, 799.1, 375.1, 799.1, 372.4], "M": [688.4, 409.6, 676.9, 416.6, 672.9, 421.9, 669.6, 427.4, 666.6, 436.4, 667.4, 440.1, 658.1, 442.1, 662.6, 447.4, 661.1, 450.9, 666.4, 452.9, 666.4, 457.1, 663.4, 457.6, 650.6, 453.6, 652.6, 457.4, 652.9, 461.4, 654.4, 458.4, 659.1, 459.6, 658.9, 464.1, 660.4, 465.4, 662.9, 464.1, 664.4, 464.9, 667.9, 474.1, 671.6, 478.4, 670.6, 480.6, 663.4, 479.6, 662.4, 478.6, 663.4, 474.4, 662.1, 472.6, 653.4, 469.1, 652.9, 470.1, 661.4, 474.9, 661.1, 478.4, 655.6, 477.6, 655.6, 479.6, 659.6, 486.1, 665.4, 490.9, 675.4, 502.9, 676.6, 511.6, 681.9, 523.1, 685.6, 524.4, 689.6, 522.4, 692.6, 524.4, 695.4, 522.4, 699.6, 522.4, 704.6, 530.1, 715.9, 539.1, 731.4, 544.4, 743.6, 544.4, 750.4, 542.4, 755.6, 542.4, 758.9, 538.6, 761.6, 538.4, 767.4, 549.4, 768.9, 548.4, 766.4, 544.6, 766.4, 536.4, 767.6, 532.9, 771.4, 532.9, 779.9, 524.6, 784.6, 525.4, 789.4, 522.4, 792.6, 522.4, 795.4, 524.9, 795.6, 527.6, 797.9, 530.9, 798.9, 528.6, 797.4, 523.4, 801.9, 514.4, 797.4, 512.6, 797.4, 509.4, 800.4, 503.4, 798.9, 502.9, 796.6, 505.4, 795.6, 513.6, 794.1, 516.4, 789.9, 516.4, 788.4, 512.9, 785.6, 511.1, 784.4, 492.4, 781.4, 483.4, 775.4, 472.6, 775.9, 470.6, 778.6, 470.4, 781.1, 468.1, 781.1, 466.9, 778.6, 466.1, 778.4, 464.4, 781.4, 461.4, 765.6, 450.1, 764.4, 440.4, 758.4, 430.9, 751.4, 425.1, 749.6, 427.4, 749.6, 430.6, 755.6, 443.4, 755.4, 446.1, 753.4, 446.6, 744.4, 430.9, 732.1, 420.9, 729.6, 419.6, 727.6, 421.6, 724.4, 421.6, 722.6, 418.6, 708.4, 417.6, 689.9, 423.9, 680.9, 429.9, 675.6, 439.1, 672.4, 440.6, 671.4, 437.4, 673.4, 434.6, 673.6, 429.9, 680.4, 418.9, 689.9, 410.4] }, "50.64": { "L": [571.1, 465.6, 569.9, 466.4, 569.9, 467.9, 573.9, 472.1, 585.9, 478.1, 593.1, 480.4, 594.6, 482.1, 594.4, 484.6, 592.9, 485.6, 574.9, 485.6, 573.1, 486.6, 572.9, 488.6, 579.9, 493.1, 590.9, 496.4, 598.1, 497.1, 599.6, 499.1, 599.4, 501.6, 592.4, 503.9, 591.9, 506.6, 593.9, 508.1, 602.9, 510.4, 616.6, 510.6, 617.6, 514.1, 615.9, 517.1, 616.4, 519.1, 635.6, 518.6, 636.6, 522.1, 634.9, 525.6, 636.1, 526.4, 640.1, 526.1, 649.9, 522.4, 651.9, 522.4, 653.4, 523.4, 653.6, 527.9, 655.1, 529.4, 657.9, 529.1, 667.9, 523.4, 670.6, 523.6, 671.9, 526.6, 674.1, 527.1, 680.9, 522.6, 693.1, 522.4, 697.1, 520.6, 695.6, 515.9, 692.6, 513.6, 691.6, 506.9, 688.6, 504.6, 688.1, 494.4, 681.6, 489.4, 675.6, 481.9, 663.9, 479.4, 642.1, 472.6, 622.9, 471.6, 620.1, 470.6, 608.9, 470.6, 606.1, 469.6, 599.9, 469.6, 590.1, 467.6], "R": [792.1, 367.9, 768.4, 397.1, 760.9, 404.9, 755.1, 413.6, 749.6, 426.9, 749.9, 429.9, 754.4, 436.9, 756.6, 444.9, 757.1, 460.4, 759.9, 462.1, 767.9, 461.6, 777.1, 469.4, 780.1, 468.6, 780.9, 462.6, 786.1, 457.9, 786.1, 456.4, 784.4, 454.1, 784.6, 451.4, 794.1, 442.9, 793.6, 440.9, 789.6, 439.6, 789.4, 436.9, 797.9, 427.4, 798.4, 425.1, 797.6, 423.9, 793.4, 423.4, 792.4, 419.9, 803.4, 405.1, 803.1, 403.4, 801.1, 402.9, 795.9, 406.4, 793.1, 406.6, 791.6, 405.6, 791.4, 402.9, 801.1, 390.1, 804.1, 384.1, 803.6, 381.9, 801.6, 382.1, 791.4, 392.1, 788.1, 392.6, 786.4, 390.9, 786.6, 388.1, 794.1, 374.1, 794.4, 369.1, 793.6, 367.9], "M": [689.9, 407.9, 677.9, 414.6, 671.9, 421.9, 666.6, 434.4, 667.4, 440.1, 657.9, 440.9, 659.9, 444.4, 663.4, 445.9, 663.6, 447.6, 661.1, 450.4, 666.4, 451.9, 666.4, 456.1, 663.4, 457.6, 652.6, 453.6, 651.1, 454.1, 652.6, 457.4, 652.1, 461.9, 654.4, 458.4, 659.1, 459.6, 660.1, 464.1, 660.4, 461.1, 663.4, 460.9, 665.6, 469.6, 671.6, 478.4, 671.1, 480.4, 668.4, 480.6, 656.6, 476.6, 654.1, 476.1, 653.9, 477.1, 667.6, 495.1, 676.4, 502.9, 677.6, 509.6, 681.9, 520.1, 685.6, 523.4, 687.9, 520.6, 689.6, 520.4, 692.4, 523.9, 700.6, 519.4, 701.6, 520.4, 701.4, 525.1, 705.9, 531.4, 714.9, 538.1, 731.4, 544.4, 741.6, 544.4, 747.4, 542.4, 754.6, 542.4, 757.1, 541.1, 757.9, 538.6, 760.6, 538.4, 766.4, 549.4, 768.4, 548.4, 765.4, 544.6, 765.4, 536.4, 766.9, 532.6, 770.4, 532.9, 777.1, 528.1, 779.9, 524.6, 785.6, 524.4, 790.4, 521.4, 794.6, 523.9, 797.1, 529.6, 798.4, 527.6, 797.4, 525.6, 798.4, 519.4, 800.9, 515.4, 797.6, 513.1, 797.4, 509.4, 800.4, 503.4, 799.4, 502.6, 797.9, 503.9, 795.6, 508.4, 795.6, 513.6, 794.1, 516.4, 789.9, 516.4, 788.4, 512.9, 785.6, 511.1, 784.4, 492.4, 781.4, 483.4, 775.4, 471.6, 775.9, 469.6, 779.6, 469.4, 781.9, 467.4, 777.4, 465.6, 777.6, 463.9, 781.4, 461.4, 776.1, 455.6, 770.6, 452.1, 769.4, 440.4, 763.4, 429.9, 756.1, 423.9, 752.4, 422.1, 750.9, 422.9, 749.6, 429.6, 755.6, 440.4, 755.6, 445.6, 753.4, 446.6, 747.1, 433.9, 739.1, 424.9, 729.6, 418.6, 727.6, 420.6, 723.4, 420.6, 722.1, 418.9, 719.4, 418.6, 716.6, 416.6, 711.4, 416.6, 694.4, 420.6, 686.9, 424.9, 678.9, 430.9, 674.4, 441.1, 672.4, 441.6, 668.4, 438.9, 668.6, 436.9, 672.1, 434.1, 672.4, 430.4, 680.6, 416.9, 690.1, 409.1, 690.9, 408.1] }, "50.72": { "L": [572.1, 457.6, 570.9, 458.4, 570.9, 460.9, 574.9, 465.1, 591.1, 474.1, 592.4, 475.4, 592.6, 477.9, 590.9, 479.6, 573.9, 478.6, 571.9, 479.4, 570.9, 481.6, 581.9, 488.1, 599.4, 493.4, 599.6, 495.9, 598.6, 497.4, 589.4, 498.9, 588.6, 500.9, 589.9, 502.6, 595.9, 505.1, 602.9, 506.4, 616.6, 506.6, 617.6, 509.9, 613.9, 513.4, 614.4, 516.1, 632.6, 516.6, 633.6, 518.1, 632.9, 523.6, 634.1, 524.4, 639.1, 524.4, 642.9, 522.6, 649.9, 521.4, 651.4, 522.4, 651.6, 526.9, 653.1, 528.4, 656.9, 528.1, 661.9, 524.4, 666.9, 524.4, 669.4, 527.1, 671.1, 527.1, 674.4, 525.9, 677.9, 522.6, 681.9, 520.6, 689.1, 520.4, 693.1, 521.4, 697.1, 519.6, 696.4, 516.4, 693.6, 513.6, 693.4, 508.9, 692.1, 505.4, 688.6, 503.6, 688.1, 494.4, 681.6, 489.4, 674.4, 481.6, 664.1, 477.9, 656.9, 476.4, 649.1, 472.9, 633.1, 468.6, 600.9, 464.6, 595.1, 463.4, 592.1, 461.6], "R": [788.1, 362.9, 777.4, 380.1, 757.9, 406.9, 751.9, 418.9, 749.9, 425.9, 749.9, 428.1, 753.1, 432.6, 759.4, 445.9, 759.9, 457.6, 771.6, 463.4, 776.9, 468.4, 781.1, 467.6, 781.6, 461.4, 787.1, 456.9, 787.1, 455.4, 785.4, 453.1, 785.6, 450.1, 791.1, 445.4, 794.1, 441.1, 794.1, 439.4, 790.6, 437.6, 790.4, 434.9, 798.1, 424.1, 799.1, 420.4, 794.4, 419.4, 793.4, 415.9, 800.1, 406.1, 802.4, 401.1, 802.1, 399.4, 800.1, 398.9, 794.1, 403.6, 791.4, 403.4, 790.4, 401.9, 790.9, 398.6, 795.1, 393.1, 800.1, 384.1, 801.4, 380.1, 800.6, 377.9, 799.1, 377.9, 796.6, 379.9, 788.4, 390.1, 785.1, 390.6, 783.6, 389.6, 783.6, 385.9, 788.1, 377.1, 790.4, 368.1, 790.1, 363.4], "M": [711.4, 415.6, 691.9, 420.9, 678.9, 429.9, 673.6, 440.6, 669.4, 439.1, 658.9, 439.9, 660.9, 443.1, 665.4, 443.9, 665.4, 446.1, 662.1, 448.9, 665.4, 449.9, 666.6, 454.6, 664.1, 457.4, 662.4, 457.6, 650.9, 453.6, 652.6, 457.4, 651.6, 461.4, 653.1, 461.1, 654.4, 458.4, 659.1, 459.6, 659.1, 463.4, 664.4, 465.9, 670.6, 478.6, 667.4, 479.6, 654.1, 474.9, 653.1, 475.1, 653.6, 476.6, 665.6, 493.1, 677.4, 503.9, 680.6, 516.6, 684.1, 522.9, 686.1, 522.1, 688.4, 518.4, 690.4, 518.9, 691.6, 522.4, 693.4, 521.4, 696.4, 521.9, 698.9, 518.6, 700.6, 518.4, 701.6, 519.4, 700.6, 523.6, 704.9, 530.1, 714.9, 538.1, 721.4, 541.4, 724.6, 541.4, 730.4, 544.4, 737.6, 544.4, 753.6, 542.4, 759.6, 538.4, 763.9, 548.1, 766.6, 549.4, 767.4, 548.4, 764.4, 544.6, 764.4, 536.4, 765.9, 532.6, 769.6, 533.4, 776.1, 528.4, 778.9, 524.6, 785.6, 524.4, 790.4, 521.4, 793.1, 521.6, 795.6, 525.4, 795.9, 528.1, 797.1, 528.1, 797.4, 522.4, 801.4, 514.6, 797.4, 512.6, 797.4, 508.4, 800.4, 503.6, 799.4, 502.6, 797.9, 503.9, 795.6, 508.4, 795.6, 513.6, 792.6, 516.6, 790.9, 516.4, 789.1, 512.9, 785.4, 510.6, 784.4, 492.4, 782.4, 485.4, 775.4, 471.6, 775.9, 469.6, 778.6, 469.4, 782.9, 466.4, 778.4, 464.6, 778.6, 462.9, 781.4, 460.4, 773.6, 453.1, 773.4, 445.4, 771.4, 437.4, 768.1, 430.9, 762.1, 424.6, 754.6, 420.6, 752.4, 420.6, 750.6, 422.4, 749.6, 427.6, 753.6, 433.4, 756.6, 442.4, 756.1, 444.4, 753.4, 444.6, 746.1, 430.9, 739.1, 423.9, 729.6, 417.6, 727.6, 419.6, 719.4, 419.6, 717.1, 415.9] }, "50.80": { "L": [571.4, 449.9, 570.6, 452.1, 572.9, 455.4, 581.6, 462.9, 592.1, 469.1, 593.4, 470.4, 593.6, 472.9, 592.6, 474.4, 589.9, 474.6, 579.1, 472.6, 571.1, 472.6, 569.9, 473.4, 570.1, 475.4, 577.9, 481.1, 597.4, 488.4, 597.6, 491.1, 596.4, 493.1, 587.9, 493.9, 585.9, 495.4, 586.9, 497.6, 600.9, 502.4, 613.1, 502.4, 615.1, 503.1, 616.6, 505.1, 616.4, 507.6, 611.1, 510.6, 611.4, 513.1, 616.9, 514.4, 630.6, 514.6, 631.6, 516.1, 630.9, 521.9, 632.9, 523.4, 641.1, 522.1, 647.9, 519.4, 650.6, 519.6, 651.6, 521.1, 650.9, 526.6, 652.1, 527.4, 657.9, 526.1, 661.9, 523.4, 666.6, 523.6, 667.9, 526.6, 669.9, 527.1, 678.9, 521.4, 695.9, 520.4, 697.1, 519.6, 696.6, 515.9, 693.4, 512.9, 692.9, 505.6, 689.4, 504.4, 687.6, 502.1, 688.1, 494.4, 680.9, 489.4, 674.4, 481.1, 667.9, 479.4, 663.1, 476.9, 657.9, 476.4, 650.1, 472.9, 625.1, 464.9, 615.1, 462.6, 608.9, 462.6, 604.9, 459.9], "R": [783.4, 359.9, 771.4, 383.1, 759.9, 400.9, 753.9, 412.9, 749.9, 424.9, 749.9, 426.9, 751.9, 430.1, 758.4, 436.9, 761.4, 441.9, 762.6, 445.9, 761.6, 450.9, 762.1, 457.4, 772.1, 463.6, 777.9, 468.4, 780.1, 468.1, 782.1, 466.6, 782.9, 460.6, 788.9, 455.4, 789.1, 453.4, 787.4, 451.1, 787.6, 448.1, 794.1, 440.9, 794.1, 438.4, 790.6, 436.6, 790.4, 432.9, 796.1, 425.1, 799.1, 419.9, 799.1, 418.4, 793.4, 417.4, 792.4, 413.9, 798.1, 405.1, 801.4, 398.1, 800.6, 395.9, 798.6, 396.1, 794.1, 399.6, 791.4, 399.4, 790.4, 397.9, 790.6, 394.9, 796.1, 384.1, 798.1, 378.1, 797.6, 373.9, 795.6, 374.1, 792.9, 376.9, 785.6, 387.4, 783.1, 387.6, 781.6, 386.6, 781.4, 383.9, 785.4, 370.1, 785.4, 361.1, 784.6, 359.9], "M": [709.4, 414.6, 694.4, 418.6, 679.9, 427.9, 674.6, 436.4, 673.6, 440.6, 668.6, 438.6, 666.6, 439.6, 660.4, 438.6, 659.1, 439.6, 660.9, 442.4, 664.6, 444.4, 664.4, 446.1, 661.9, 446.9, 661.1, 448.4, 665.4, 449.9, 665.6, 453.6, 662.6, 456.6, 650.9, 453.6, 652.6, 457.4, 651.1, 460.4, 652.4, 461.9, 653.9, 458.6, 657.1, 458.6, 658.6, 460.4, 658.1, 463.4, 664.4, 465.9, 670.6, 478.6, 668.4, 479.6, 663.9, 477.4, 662.1, 475.1, 662.1, 471.9, 658.6, 470.6, 656.4, 471.1, 661.1, 473.6, 661.6, 475.9, 658.4, 476.6, 653.6, 474.6, 653.6, 476.6, 667.6, 496.1, 678.4, 504.9, 680.6, 514.6, 684.1, 521.9, 687.4, 518.4, 689.4, 518.9, 690.6, 522.4, 693.4, 520.4, 696.4, 521.4, 699.6, 519.4, 700.6, 523.6, 704.9, 530.1, 720.9, 541.1, 728.4, 543.4, 736.6, 544.4, 752.6, 542.4, 758.6, 538.4, 762.9, 548.1, 766.1, 550.1, 766.4, 548.4, 763.4, 543.6, 764.6, 533.9, 769.1, 533.1, 776.1, 528.1, 778.9, 524.6, 785.6, 524.4, 789.4, 521.4, 793.1, 521.6, 796.1, 527.4, 800.4, 515.6, 800.1, 513.9, 797.4, 511.6, 797.6, 507.9, 800.4, 506.6, 800.1, 502.9, 796.9, 504.9, 795.6, 513.6, 793.1, 516.4, 789.9, 516.4, 788.1, 511.9, 785.4, 510.6, 784.4, 491.4, 781.4, 482.4, 775.4, 471.6, 775.9, 468.6, 779.6, 468.4, 783.4, 465.6, 779.6, 464.1, 779.4, 462.4, 781.9, 459.6, 775.4, 453.6, 775.4, 439.4, 774.4, 436.4, 770.1, 428.9, 764.1, 422.6, 752.4, 418.6, 749.6, 426.6, 756.6, 439.4, 756.6, 443.6, 754.4, 444.6, 752.4, 442.6, 749.1, 433.9, 741.1, 423.9, 729.6, 416.6, 727.6, 418.6, 723.4, 418.6, 721.6, 415.6] }, "50.88": { "L": [574.1, 442.6, 572.6, 444.1, 573.1, 446.4, 580.9, 455.1, 591.6, 462.6, 592.6, 465.9, 590.9, 467.6, 586.9, 467.6, 571.1, 464.6, 569.9, 465.4, 570.1, 467.4, 576.9, 474.1, 597.4, 483.4, 597.6, 485.9, 596.6, 487.4, 585.4, 487.9, 584.6, 490.1, 585.6, 491.9, 591.6, 495.4, 596.9, 497.1, 612.9, 499.4, 614.4, 500.4, 614.1, 504.4, 609.9, 507.4, 610.9, 509.6, 617.9, 511.4, 629.6, 511.6, 630.6, 515.1, 628.9, 519.6, 631.9, 521.1, 644.9, 518.4, 648.6, 518.6, 649.6, 520.1, 649.6, 524.9, 651.1, 526.4, 656.1, 525.1, 660.9, 522.4, 663.9, 522.4, 665.4, 523.4, 665.9, 526.6, 668.1, 527.1, 671.6, 523.9, 676.9, 521.6, 682.1, 521.4, 685.9, 519.4, 692.1, 520.1, 697.1, 518.6, 696.6, 514.9, 693.4, 511.9, 693.1, 505.4, 688.6, 503.6, 688.1, 494.4, 685.4, 492.1, 682.4, 491.4, 673.1, 480.4, 635.9, 468.4, 629.4, 465.6, 625.1, 461.6, 615.4, 461.4, 613.1, 457.6, 592.9, 450.4, 579.1, 443.9], "R": [778.1, 357.9, 775.9, 360.9, 772.4, 372.1, 768.4, 381.1, 755.9, 405.9, 750.6, 420.9, 751.1, 427.4, 761.4, 435.9, 764.4, 440.9, 763.9, 457.6, 772.4, 462.9, 777.1, 468.1, 779.1, 468.1, 783.1, 465.6, 783.6, 459.4, 789.1, 453.9, 789.1, 452.4, 787.4, 450.1, 787.6, 447.1, 796.1, 436.9, 795.6, 434.9, 791.6, 433.6, 791.4, 430.9, 799.1, 417.1, 798.6, 414.9, 795.1, 414.6, 793.6, 413.6, 793.4, 409.9, 800.1, 394.1, 799.6, 391.9, 797.6, 392.1, 793.1, 395.6, 790.4, 395.4, 789.4, 393.9, 789.6, 390.9, 794.4, 377.1, 794.6, 369.9, 793.1, 369.6, 791.4, 370.9, 782.6, 384.4, 780.1, 384.6, 778.6, 383.6, 778.4, 379.9, 781.4, 367.1, 781.4, 361.9, 780.1, 358.4], "M": [712.4, 412.6, 696.4, 416.6, 684.9, 422.9, 677.9, 428.9, 674.1, 435.6, 674.6, 438.6, 673.6, 439.6, 670.4, 439.6, 667.9, 437.1, 665.6, 438.6, 660.1, 438.1, 664.6, 444.4, 664.4, 446.1, 662.6, 447.1, 665.4, 448.9, 665.6, 451.6, 661.6, 456.6, 650.9, 453.6, 652.6, 458.9, 650.1, 460.4, 652.4, 461.9, 653.4, 459.1, 655.6, 458.4, 658.4, 459.9, 658.6, 463.4, 661.4, 461.4, 663.1, 461.6, 664.6, 467.6, 670.6, 477.6, 668.4, 478.6, 652.1, 474.4, 665.6, 494.1, 671.9, 500.4, 679.4, 504.9, 680.6, 513.6, 683.6, 519.9, 686.6, 519.4, 688.4, 521.9, 693.4, 519.4, 696.4, 519.9, 697.9, 517.6, 700.1, 517.6, 701.9, 525.1, 707.9, 532.4, 715.9, 538.1, 728.4, 543.4, 735.4, 544.4, 743.6, 543.4, 749.4, 541.4, 753.6, 541.4, 755.9, 538.6, 757.6, 538.4, 761.9, 548.1, 765.1, 550.1, 765.4, 548.4, 763.6, 547.1, 762.4, 543.6, 762.4, 536.4, 763.9, 532.6, 765.6, 532.4, 767.4, 533.9, 776.1, 527.4, 777.9, 524.6, 784.6, 524.4, 790.4, 520.4, 793.1, 521.4, 795.9, 524.9, 799.4, 517.6, 799.4, 513.4, 797.4, 511.6, 797.4, 508.4, 799.9, 502.1, 797.9, 502.9, 795.6, 507.4, 795.6, 512.6, 794.1, 515.4, 789.9, 515.4, 788.4, 511.9, 785.4, 509.6, 784.4, 491.4, 776.4, 471.6, 776.9, 468.6, 784.4, 464.6, 780.6, 463.1, 781.9, 458.6, 777.9, 454.4, 778.4, 438.4, 777.4, 435.4, 773.1, 427.9, 767.1, 421.6, 753.1, 416.1, 749.6, 424.6, 756.6, 436.4, 756.6, 442.6, 754.4, 443.6, 747.1, 428.9, 740.1, 421.9, 732.9, 418.4, 728.6, 414.6, 726.6, 417.6, 722.4, 417.6, 721.1, 414.9, 715.6, 412.6] }, "50.96": { "L": [575.4, 436.9, 574.6, 440.1, 577.9, 445.1, 583.9, 452.1, 594.4, 460.4, 594.6, 462.9, 593.6, 464.4, 590.9, 464.6, 587.1, 462.9, 574.1, 459.6, 571.4, 459.9, 570.9, 462.9, 581.9, 472.1, 597.4, 479.4, 597.6, 481.9, 596.6, 483.4, 586.9, 483.9, 583.9, 485.4, 584.9, 487.6, 597.9, 494.1, 606.9, 496.4, 611.9, 496.4, 613.4, 497.4, 613.1, 501.4, 608.9, 504.4, 609.6, 506.9, 613.9, 508.4, 627.6, 509.6, 628.6, 511.1, 627.9, 517.6, 630.9, 519.1, 633.1, 519.4, 643.9, 516.4, 647.6, 516.6, 648.6, 520.1, 646.9, 523.6, 648.1, 524.4, 652.1, 524.4, 659.9, 521.4, 662.9, 521.4, 664.4, 522.4, 664.9, 525.6, 667.1, 526.1, 676.9, 520.4, 691.1, 519.4, 696.9, 517.4, 697.1, 515.1, 694.4, 511.9, 694.4, 507.9, 693.1, 504.4, 689.4, 503.4, 688.4, 501.9, 689.1, 492.4, 681.9, 488.4, 674.4, 480.1, 664.1, 475.9, 656.9, 475.4, 632.9, 467.4, 630.6, 465.6, 629.6, 459.9, 605.9, 451.4, 584.1, 439.9], "R": [774.1, 354.6, 772.6, 356.1, 766.4, 379.1, 755.9, 402.9, 750.6, 420.9, 750.6, 424.1, 753.9, 428.1, 757.1, 429.6, 761.4, 433.9, 764.4, 438.9, 764.6, 446.1, 762.6, 450.9, 762.9, 460.6, 768.1, 465.1, 774.1, 465.4, 779.1, 467.4, 782.9, 465.4, 783.9, 458.6, 789.9, 453.4, 790.1, 451.4, 788.4, 449.1, 788.6, 446.1, 796.4, 436.1, 795.6, 433.9, 791.6, 432.6, 791.4, 429.9, 798.1, 418.1, 799.1, 413.4, 793.4, 412.4, 792.4, 410.9, 792.4, 407.9, 797.1, 398.1, 799.1, 389.4, 796.6, 389.1, 791.6, 394.4, 789.1, 394.6, 787.6, 393.6, 787.4, 390.9, 790.4, 381.1, 792.1, 370.1, 792.1, 367.9, 790.6, 365.9, 788.4, 366.9, 781.9, 380.1, 779.9, 381.6, 776.6, 380.6, 777.4, 358.9, 776.1, 355.4], "M": [710.4, 411.6, 695.4, 415.6, 682.9, 422.9, 676.9, 428.9, 673.6, 435.4, 673.1, 439.4, 669.9, 439.4, 667.4, 435.6, 665.1, 438.4, 662.9, 438.6, 664.6, 444.4, 664.6, 451.6, 662.1, 456.4, 650.6, 452.6, 649.6, 453.6, 652.6, 458.9, 648.9, 459.9, 652.4, 462.4, 654.4, 458.4, 658.1, 459.6, 658.9, 462.4, 659.9, 460.6, 662.1, 460.6, 666.9, 472.1, 672.4, 476.4, 679.1, 477.1, 680.4, 466.4, 683.1, 465.1, 683.9, 461.6, 686.1, 461.6, 687.6, 464.9, 692.1, 464.6, 692.6, 466.6, 689.1, 477.4, 689.9, 479.1, 696.4, 481.9, 696.4, 486.1, 694.6, 487.6, 689.9, 487.4, 687.6, 480.6, 680.4, 481.6, 669.4, 478.6, 663.6, 475.6, 657.4, 475.6, 652.6, 473.6, 651.6, 474.6, 654.6, 480.1, 666.6, 493.1, 671.9, 498.4, 679.4, 502.9, 680.6, 511.6, 683.6, 518.9, 686.6, 517.4, 687.6, 518.4, 687.1, 520.9, 688.1, 521.1, 690.4, 519.4, 695.6, 519.4, 697.9, 516.6, 700.1, 516.6, 700.6, 522.6, 705.9, 530.4, 718.9, 539.1, 728.4, 543.4, 742.6, 543.4, 752.6, 541.4, 754.9, 538.6, 756.6, 538.4, 760.9, 548.1, 764.6, 550.4, 765.4, 549.4, 761.4, 542.6, 761.4, 537.4, 763.9, 529.6, 766.1, 529.6, 767.6, 533.4, 775.1, 528.1, 778.9, 523.6, 783.6, 524.4, 789.4, 520.4, 793.1, 521.4, 795.4, 525.9, 799.4, 516.6, 797.4, 508.4, 798.6, 504.9, 800.4, 503.6, 800.1, 501.9, 796.9, 503.9, 795.6, 512.6, 792.6, 515.6, 789.9, 515.4, 788.1, 511.9, 784.4, 508.6, 785.4, 505.6, 784.4, 491.4, 776.4, 468.4, 782.1, 466.1, 785.1, 464.1, 785.1, 462.9, 780.6, 462.1, 780.4, 460.4, 781.9, 458.6, 776.9, 453.9, 778.4, 450.6, 777.4, 433.4, 773.1, 425.9, 767.1, 419.6, 761.6, 416.6, 753.4, 414.6, 750.6, 420.4, 750.6, 424.6, 755.4, 430.9, 757.6, 437.4, 756.4, 442.1, 754.4, 442.6, 750.1, 432.9, 743.4, 422.9, 731.9, 416.4, 731.1, 413.9, 727.4, 413.6, 726.1, 415.4, 723.4, 415.6, 721.6, 412.6] }, "51.04": { "L": [576.4, 430.9, 575.9, 433.1, 580.1, 441.4, 584.1, 446.4, 592.1, 453.6, 592.6, 456.9, 591.6, 458.4, 588.9, 458.6, 574.1, 453.6, 571.4, 453.9, 570.9, 456.9, 578.4, 464.1, 596.4, 475.4, 596.6, 477.9, 595.6, 479.4, 584.4, 479.9, 583.9, 481.9, 585.9, 484.1, 594.9, 489.1, 614.4, 494.4, 614.6, 496.9, 613.6, 498.4, 606.9, 501.4, 607.9, 503.6, 616.9, 506.4, 626.6, 506.6, 627.6, 510.1, 625.9, 514.6, 627.9, 516.1, 635.1, 516.4, 643.9, 514.4, 646.6, 514.6, 647.6, 518.1, 645.6, 521.9, 647.1, 523.4, 660.9, 520.4, 662.4, 521.4, 662.9, 524.6, 665.1, 525.1, 674.9, 519.6, 681.1, 519.4, 683.9, 518.4, 693.9, 518.4, 695.6, 517.1, 696.1, 514.4, 694.4, 512.1, 693.9, 505.6, 689.4, 504.4, 688.4, 502.9, 688.6, 496.4, 692.6, 495.1, 692.9, 492.6, 680.9, 485.4, 676.1, 479.9, 670.9, 478.4, 664.1, 474.9, 654.4, 474.4, 653.4, 472.9, 653.1, 468.4, 650.1, 465.9, 640.1, 460.9, 626.9, 456.4, 610.9, 449.4, 584.9, 435.4, 582.1, 432.9], "R": [769.4, 351.9, 764.4, 376.1, 759.4, 392.1, 756.9, 396.9, 750.9, 422.1, 753.9, 426.1, 758.1, 428.6, 761.4, 431.9, 764.4, 437.9, 764.6, 444.1, 761.6, 449.9, 761.9, 459.9, 772.1, 468.1, 774.4, 471.1, 775.4, 471.1, 777.4, 466.6, 781.1, 466.1, 783.9, 464.4, 784.6, 457.4, 790.1, 451.9, 790.1, 450.4, 788.4, 448.1, 788.6, 445.1, 797.1, 434.1, 796.6, 431.9, 793.1, 431.6, 791.6, 430.6, 791.4, 427.9, 799.1, 413.1, 799.4, 411.1, 798.6, 409.9, 793.1, 410.6, 791.4, 408.9, 791.6, 405.9, 797.1, 392.1, 797.1, 386.4, 794.6, 386.1, 789.9, 391.6, 787.4, 391.4, 786.4, 389.9, 789.4, 371.1, 788.1, 362.4, 786.4, 361.9, 785.4, 362.9, 778.9, 380.1, 776.9, 381.6, 774.4, 381.4, 773.4, 379.9, 774.4, 373.1, 774.4, 360.9, 771.6, 352.9], "M": [712.4, 409.6, 695.4, 413.6, 679.6, 423.9, 673.6, 433.4, 673.6, 439.6, 676.6, 441.4, 677.1, 448.4, 675.4, 448.6, 670.6, 445.1, 670.4, 440.4, 668.6, 439.1, 667.1, 433.9, 665.9, 433.9, 663.6, 436.4, 663.1, 442.6, 664.6, 444.4, 664.6, 449.6, 661.4, 455.1, 657.4, 455.6, 649.6, 452.6, 648.1, 453.1, 651.6, 455.9, 652.6, 458.6, 651.6, 459.6, 648.6, 458.6, 647.9, 460.1, 650.9, 460.4, 652.4, 462.4, 658.4, 463.4, 659.9, 460.6, 662.1, 460.6, 667.6, 472.1, 673.4, 475.4, 679.4, 474.6, 680.9, 458.6, 683.6, 458.4, 685.4, 459.9, 686.9, 465.4, 688.9, 462.6, 691.1, 462.6, 691.6, 466.6, 687.1, 479.4, 680.4, 480.6, 671.4, 478.6, 648.4, 465.1, 647.6, 467.6, 648.6, 470.6, 652.9, 479.1, 659.9, 486.4, 665.1, 488.6, 670.9, 495.4, 680.4, 501.9, 681.6, 513.6, 682.9, 517.1, 685.1, 517.6, 685.9, 520.1, 698.6, 516.4, 700.6, 522.6, 703.6, 527.1, 713.9, 536.1, 726.4, 542.4, 739.4, 542.9, 744.4, 541.4, 751.6, 541.4, 752.9, 539.6, 755.6, 539.4, 759.9, 548.1, 763.6, 550.4, 764.4, 549.4, 760.4, 542.6, 760.4, 536.4, 761.9, 532.6, 765.6, 533.4, 770.9, 528.6, 774.1, 527.4, 775.9, 524.6, 778.4, 523.4, 782.6, 524.4, 789.4, 519.4, 793.6, 521.9, 795.4, 525.9, 799.4, 515.6, 799.4, 513.4, 797.4, 511.6, 797.4, 507.4, 798.6, 503.9, 800.4, 502.6, 799.9, 501.1, 796.9, 502.9, 795.6, 511.6, 791.6, 515.6, 789.9, 515.4, 787.4, 510.9, 784.4, 508.6, 785.4, 501.6, 784.4, 499.6, 784.4, 490.4, 776.4, 468.4, 783.1, 465.1, 785.4, 462.6, 781.9, 461.4, 781.1, 457.9, 776.4, 453.6, 778.4, 447.6, 778.4, 435.4, 776.4, 429.4, 772.4, 422.9, 767.1, 417.9, 761.6, 414.6, 752.9, 412.9, 750.6, 421.6, 757.6, 434.4, 757.4, 440.1, 754.4, 440.6, 749.1, 428.9, 740.1, 418.9, 734.6, 415.6, 731.9, 415.4, 730.6, 412.6, 727.6, 411.6, 725.6, 414.6, 721.4, 414.6, 720.1, 411.9] }, "51.12": { "L": [577.4, 426.9, 576.9, 430.1, 583.1, 441.4, 593.4, 451.4, 593.6, 453.9, 592.6, 455.4, 589.9, 455.6, 574.1, 450.6, 571.9, 451.4, 571.9, 453.9, 580.9, 463.1, 596.4, 472.4, 596.6, 474.9, 595.6, 476.4, 583.4, 476.9, 582.9, 478.9, 585.9, 482.1, 593.6, 486.4, 612.1, 490.6, 615.4, 492.4, 615.6, 494.9, 614.6, 496.4, 609.9, 496.9, 605.9, 499.4, 606.9, 501.6, 616.9, 504.4, 624.4, 504.9, 625.6, 506.9, 624.6, 512.9, 626.1, 514.4, 633.1, 515.4, 639.9, 513.4, 644.6, 513.6, 645.6, 515.1, 644.6, 520.9, 646.1, 522.4, 652.1, 521.4, 655.6, 519.4, 660.9, 518.4, 662.4, 519.4, 662.9, 522.6, 665.1, 523.4, 675.9, 517.4, 688.1, 518.1, 694.1, 516.6, 694.4, 512.9, 696.4, 510.1, 696.1, 507.4, 692.9, 504.9, 689.4, 504.4, 688.4, 502.9, 688.6, 496.4, 692.6, 495.1, 693.4, 493.9, 692.4, 490.1, 687.9, 488.4, 677.4, 479.1, 668.6, 476.6, 664.1, 473.9, 659.4, 473.4, 657.1, 469.4, 648.1, 462.9, 611.9, 447.4, 579.4, 427.1], "R": [766.4, 349.9, 763.6, 370.1, 759.4, 388.1, 754.6, 401.9, 751.6, 415.9, 751.6, 421.1, 753.9, 424.1, 757.1, 425.6, 761.4, 429.9, 764.6, 436.9, 764.4, 442.9, 759.6, 448.9, 758.9, 457.9, 769.1, 465.6, 774.6, 471.9, 776.6, 472.1, 777.6, 467.4, 785.1, 462.6, 785.9, 455.6, 792.1, 449.9, 792.1, 448.4, 789.6, 446.6, 789.4, 443.9, 796.1, 435.1, 797.1, 431.4, 792.4, 430.4, 791.4, 426.9, 798.1, 414.1, 800.1, 406.4, 798.4, 405.9, 795.1, 408.6, 792.4, 408.4, 791.4, 406.9, 791.6, 403.9, 796.4, 390.1, 796.1, 383.4, 794.4, 382.9, 789.6, 389.4, 786.4, 389.4, 785.4, 387.9, 785.4, 382.9, 787.4, 373.1, 787.4, 365.9, 786.1, 360.4, 784.4, 359.9, 782.9, 361.9, 777.9, 377.1, 775.9, 378.6, 773.4, 378.4, 772.4, 376.9, 772.4, 361.9, 771.4, 356.9, 768.9, 350.6], "M": [709.4, 408.6, 694.4, 412.6, 677.9, 423.9, 672.6, 434.4, 672.9, 438.1, 675.6, 438.4, 677.6, 440.4, 675.1, 445.4, 672.4, 445.6, 670.6, 444.1, 668.1, 435.9, 666.1, 432.9, 664.9, 432.9, 662.6, 440.4, 664.6, 446.6, 660.4, 455.1, 657.4, 455.6, 646.9, 452.1, 651.6, 455.9, 652.6, 458.9, 650.1, 459.6, 646.6, 458.6, 646.6, 468.6, 650.9, 477.1, 655.9, 483.4, 660.9, 487.1, 668.1, 489.6, 680.4, 499.9, 681.6, 511.6, 685.9, 519.1, 689.4, 517.4, 693.6, 517.4, 695.9, 514.6, 698.1, 514.6, 698.6, 518.6, 704.6, 528.1, 714.9, 536.1, 725.4, 541.9, 725.4, 544.1, 722.9, 545.9, 717.9, 553.9, 717.6, 556.4, 722.4, 558.4, 726.6, 557.4, 727.9, 560.1, 732.4, 561.4, 734.1, 561.1, 735.6, 556.9, 737.6, 556.4, 738.9, 562.1, 742.6, 562.4, 745.9, 557.6, 750.4, 557.9, 752.1, 556.1, 752.1, 545.9, 750.4, 545.6, 747.6, 547.6, 737.4, 547.6, 728.4, 545.6, 727.6, 542.9, 749.6, 541.4, 754.6, 538.4, 759.9, 549.1, 762.9, 550.1, 759.4, 542.6, 759.4, 536.4, 761.6, 528.9, 764.4, 528.9, 765.4, 532.9, 776.9, 523.6, 780.6, 524.4, 788.4, 519.4, 793.4, 520.9, 795.1, 526.4, 797.4, 522.6, 797.4, 518.4, 799.4, 515.6, 799.1, 511.9, 796.9, 511.4, 796.1, 509.6, 798.6, 503.9, 800.4, 502.6, 800.4, 500.6, 799.6, 500.1, 796.9, 502.9, 795.6, 505.4, 795.9, 510.1, 793.1, 514.4, 788.9, 514.4, 787.1, 509.9, 784.4, 508.6, 784.4, 491.4, 776.4, 467.4, 785.4, 462.4, 775.4, 452.6, 778.4, 445.6, 778.4, 434.4, 772.4, 420.9, 766.1, 414.9, 759.6, 411.6, 752.9, 410.9, 750.6, 419.6, 757.6, 432.4, 757.6, 438.6, 755.4, 439.6, 753.6, 438.1, 747.1, 423.9, 741.1, 417.9, 729.6, 410.6, 727.4, 410.6, 725.6, 412.6, 722.4, 412.6, 720.4, 409.6, 717.4, 410.6, 715.6, 408.6] }, "51.20": { "L": [578.4, 422.9, 577.9, 426.1, 581.9, 434.1, 588.9, 444.1, 592.4, 447.4, 592.6, 449.9, 591.6, 451.4, 587.9, 451.6, 575.1, 446.6, 571.4, 446.9, 570.9, 449.1, 573.9, 453.4, 580.9, 460.1, 584.6, 462.9, 588.4, 463.9, 596.4, 469.4, 596.4, 472.6, 594.9, 473.6, 581.4, 471.9, 580.9, 474.1, 582.1, 476.1, 592.9, 483.1, 613.4, 489.4, 613.1, 493.4, 605.4, 495.9, 604.9, 497.9, 605.6, 498.9, 612.9, 501.4, 625.6, 502.6, 626.6, 505.9, 624.1, 508.6, 623.9, 510.9, 627.9, 513.1, 633.1, 513.4, 640.9, 511.4, 644.6, 511.6, 645.6, 515.1, 643.9, 519.6, 645.1, 520.4, 659.9, 517.4, 661.4, 518.4, 661.9, 521.6, 664.1, 522.1, 669.4, 519.9, 673.9, 516.4, 683.1, 516.4, 688.1, 517.4, 692.1, 515.6, 692.9, 512.6, 696.1, 509.6, 696.4, 508.1, 693.4, 505.1, 688.6, 503.6, 688.4, 497.1, 689.4, 495.6, 694.1, 494.6, 694.4, 490.9, 693.4, 489.1, 687.9, 486.4, 678.4, 478.1, 670.9, 476.4, 662.9, 472.4, 647.1, 460.9, 622.9, 450.4, 602.6, 439.1, 580.4, 423.1], "R": [763.4, 347.9, 762.6, 349.1, 761.6, 369.1, 759.6, 381.1, 754.6, 398.9, 751.6, 418.1, 753.9, 421.9, 758.1, 424.6, 762.4, 429.9, 764.6, 434.9, 764.6, 439.1, 763.4, 442.1, 760.1, 445.4, 754.9, 447.4, 754.6, 455.9, 755.4, 457.1, 764.1, 461.6, 775.4, 472.1, 776.6, 472.1, 777.6, 466.4, 787.1, 460.6, 786.6, 454.4, 792.1, 448.9, 792.1, 447.4, 790.4, 445.1, 790.4, 442.9, 796.1, 435.1, 798.4, 430.1, 797.6, 427.9, 793.6, 426.6, 793.4, 422.9, 797.1, 415.1, 800.1, 404.4, 794.1, 404.6, 792.4, 402.9, 792.4, 398.9, 796.4, 384.1, 796.1, 380.4, 793.4, 379.9, 788.6, 387.4, 786.1, 387.6, 784.6, 386.6, 785.4, 360.9, 784.1, 357.4, 782.4, 356.9, 780.9, 358.9, 775.4, 378.6, 773.9, 379.6, 771.4, 379.4, 770.4, 377.9, 771.4, 368.9, 769.1, 354.9, 767.1, 349.9, 765.4, 348.1], "M": [709.4, 406.6, 691.9, 411.9, 677.6, 422.9, 672.6, 432.4, 672.9, 436.1, 677.6, 438.4, 674.1, 443.4, 671.4, 443.6, 669.6, 442.1, 666.4, 436.6, 666.4, 431.4, 664.9, 430.9, 663.6, 432.4, 662.6, 439.4, 664.6, 445.6, 660.6, 450.4, 660.1, 455.4, 645.6, 451.6, 645.9, 453.1, 650.1, 454.6, 653.9, 458.1, 662.1, 460.4, 666.6, 469.1, 671.4, 472.4, 676.6, 472.4, 679.1, 471.1, 679.4, 461.4, 680.9, 456.6, 683.4, 456.9, 684.9, 461.1, 686.1, 461.1, 686.9, 458.6, 689.1, 458.6, 689.6, 467.6, 684.1, 477.4, 676.4, 477.6, 669.4, 475.6, 645.4, 460.1, 644.6, 462.6, 645.6, 467.6, 649.9, 477.1, 655.9, 483.4, 664.4, 488.4, 670.1, 489.6, 681.4, 498.9, 681.6, 508.6, 684.9, 517.1, 693.4, 516.4, 693.6, 511.9, 696.1, 511.6, 697.6, 513.4, 698.6, 519.6, 701.6, 524.1, 708.9, 531.1, 724.4, 540.9, 724.4, 543.1, 720.9, 545.9, 715.9, 556.1, 721.4, 558.4, 725.6, 556.4, 726.6, 560.4, 731.6, 561.4, 734.6, 555.9, 736.6, 555.4, 737.6, 556.4, 737.9, 562.1, 740.6, 562.4, 744.9, 557.6, 749.4, 557.9, 751.1, 556.1, 751.1, 544.9, 746.6, 546.6, 736.4, 546.6, 727.9, 544.4, 727.6, 541.9, 747.6, 541.4, 750.1, 540.1, 750.6, 536.9, 752.6, 536.4, 757.9, 547.1, 760.4, 549.4, 762.1, 549.1, 758.4, 542.6, 759.6, 532.9, 764.6, 532.4, 776.9, 522.6, 780.6, 523.4, 787.4, 519.4, 792.1, 519.6, 795.1, 526.4, 797.4, 517.4, 799.4, 514.6, 799.1, 511.9, 796.4, 509.6, 796.4, 507.1, 800.4, 500.6, 797.9, 499.9, 792.6, 513.6, 788.9, 513.4, 787.4, 509.9, 783.4, 506.6, 784.4, 492.4, 781.4, 479.4, 777.4, 471.6, 776.4, 466.4, 784.1, 463.1, 784.9, 461.6, 774.4, 451.6, 778.4, 442.6, 778.4, 432.4, 777.4, 428.4, 771.4, 417.9, 767.1, 413.9, 759.6, 409.6, 752.9, 408.9, 751.6, 418.6, 757.6, 429.4, 757.6, 437.6, 755.4, 438.6, 746.4, 420.9, 735.1, 411.9, 732.4, 411.6, 728.6, 408.6, 726.4, 408.6, 724.1, 411.4, 721.4, 411.6, 719.9, 408.1, 715.4, 408.6, 713.6, 406.6] }, "51.28": { "L": [579.4, 419.9, 578.9, 423.9, 583.9, 433.1, 591.1, 442.6, 591.4, 446.6, 589.9, 447.6, 585.9, 447.6, 573.1, 442.9, 571.4, 442.9, 570.6, 445.1, 572.9, 449.1, 581.9, 458.1, 587.6, 461.9, 593.4, 463.9, 595.4, 466.1, 595.6, 468.9, 593.9, 470.6, 581.4, 469.9, 580.9, 471.9, 583.6, 475.1, 585.9, 477.1, 595.9, 482.1, 613.4, 487.4, 613.6, 489.9, 612.1, 491.9, 605.9, 492.9, 603.9, 494.4, 604.6, 496.9, 611.9, 499.4, 623.6, 500.6, 624.6, 504.1, 622.6, 508.9, 623.4, 510.1, 625.9, 511.1, 643.6, 510.6, 644.6, 513.9, 641.9, 517.1, 641.9, 518.6, 643.1, 519.4, 647.1, 519.1, 654.9, 516.4, 658.9, 516.4, 660.4, 517.4, 660.9, 520.6, 663.1, 521.4, 672.9, 515.4, 677.9, 516.4, 688.1, 516.4, 689.9, 515.4, 691.6, 511.9, 696.1, 508.6, 696.1, 507.4, 693.4, 504.1, 693.4, 497.1, 696.4, 493.9, 696.1, 490.9, 694.4, 488.1, 690.4, 487.4, 688.1, 484.4, 678.9, 476.9, 671.9, 476.6, 666.4, 474.6, 654.1, 463.9, 648.9, 461.4, 645.1, 457.9, 605.9, 438.4, 587.1, 423.9, 581.4, 420.1], "R": [761.4, 344.9, 760.6, 346.1, 760.6, 364.1, 759.6, 366.9, 759.6, 374.1, 757.6, 386.1, 754.6, 395.9, 751.9, 416.9, 761.4, 425.9, 764.4, 432.9, 764.6, 437.1, 763.4, 440.1, 760.1, 443.4, 754.1, 445.6, 753.6, 455.1, 754.6, 456.9, 762.1, 460.6, 769.1, 465.6, 776.4, 473.1, 777.4, 473.1, 778.1, 472.6, 777.6, 465.4, 786.9, 460.4, 787.6, 453.1, 792.1, 447.9, 792.1, 446.4, 790.4, 444.1, 790.6, 441.1, 799.1, 429.1, 798.6, 426.9, 795.1, 426.6, 793.6, 425.6, 793.4, 421.9, 797.1, 414.1, 800.1, 402.4, 798.1, 401.9, 795.9, 403.4, 793.1, 403.6, 791.4, 401.9, 795.4, 385.1, 795.1, 377.4, 793.1, 376.9, 792.1, 377.6, 787.6, 385.4, 785.1, 385.6, 783.6, 384.6, 784.4, 362.9, 782.1, 354.4, 780.4, 353.9, 778.9, 356.9, 775.4, 372.6, 773.9, 373.6, 770.4, 373.4, 769.4, 371.9, 769.4, 361.9, 768.1, 355.9, 765.1, 347.9, 762.6, 344.9], "M": [709.4, 404.6, 691.9, 409.9, 677.6, 420.9, 672.6, 430.4, 672.6, 434.6, 679.1, 436.6, 679.6, 438.6, 674.9, 439.9, 674.1, 443.4, 671.9, 443.4, 666.6, 438.1, 665.9, 429.1, 663.9, 428.9, 662.6, 431.4, 663.6, 444.6, 660.6, 447.4, 659.1, 454.4, 655.4, 454.6, 645.6, 450.6, 644.6, 451.6, 655.4, 458.4, 661.1, 458.6, 666.6, 468.1, 672.4, 471.4, 678.1, 470.1, 679.4, 467.6, 679.4, 459.4, 680.9, 457.6, 683.1, 457.6, 684.6, 459.9, 685.9, 457.6, 688.1, 457.6, 688.6, 464.6, 683.1, 476.4, 669.4, 474.6, 644.6, 457.6, 643.6, 458.4, 643.6, 465.6, 646.6, 469.4, 646.6, 472.6, 648.9, 477.1, 655.9, 484.4, 664.4, 488.4, 671.6, 489.4, 683.1, 497.6, 682.6, 507.6, 683.6, 515.6, 684.9, 517.1, 691.1, 515.1, 691.9, 511.6, 696.1, 510.6, 698.9, 520.1, 708.9, 530.4, 721.4, 538.9, 721.6, 542.6, 714.1, 555.4, 719.4, 558.4, 723.6, 556.4, 724.9, 560.1, 729.4, 561.4, 731.1, 561.1, 733.6, 555.9, 735.6, 555.4, 736.6, 556.4, 736.9, 562.1, 739.6, 562.4, 743.9, 557.6, 748.4, 557.9, 750.1, 556.1, 751.4, 551.6, 751.1, 544.9, 734.4, 545.6, 727.9, 543.4, 727.6, 540.9, 744.6, 541.4, 748.1, 540.1, 749.6, 535.9, 751.6, 535.4, 756.9, 547.1, 759.4, 549.4, 761.1, 549.1, 757.4, 541.6, 757.4, 535.4, 758.9, 531.6, 764.1, 531.6, 775.9, 521.6, 780.6, 522.4, 787.4, 518.4, 792.1, 519.4, 794.9, 526.4, 795.6, 525.9, 796.4, 519.4, 799.9, 511.4, 796.6, 510.1, 796.4, 507.4, 800.1, 506.1, 800.4, 499.4, 798.9, 498.9, 795.9, 501.9, 794.6, 509.6, 793.4, 512.1, 790.6, 513.6, 788.9, 513.4, 787.1, 508.9, 783.4, 506.6, 784.4, 500.6, 783.4, 486.4, 776.4, 465.4, 780.6, 464.4, 784.4, 461.4, 772.9, 450.9, 777.4, 443.6, 778.4, 431.4, 776.4, 424.4, 772.4, 416.9, 766.1, 410.9, 759.6, 407.6, 754.4, 406.6, 752.9, 407.9, 751.6, 416.6, 754.4, 419.9, 758.6, 430.4, 757.6, 436.6, 755.4, 437.6, 747.1, 419.9, 741.1, 413.9, 728.6, 406.6, 725.4, 406.6, 724.1, 408.4, 721.4, 408.6, 719.6, 406.6, 715.4, 406.6, 713.6, 404.6] }, "51.36": { "L": [579.4, 415.9, 578.9, 419.1, 583.9, 429.1, 593.4, 441.4, 593.6, 443.9, 592.6, 445.4, 589.9, 445.6, 574.1, 439.6, 571.4, 439.9, 570.9, 441.9, 574.9, 447.4, 581.9, 454.1, 591.9, 461.1, 597.4, 463.4, 597.4, 466.6, 595.9, 467.6, 581.4, 466.9, 580.9, 468.9, 582.9, 471.4, 585.9, 474.1, 597.9, 480.1, 612.4, 485.4, 612.6, 487.9, 611.6, 489.4, 604.9, 490.9, 602.9, 492.4, 603.9, 494.6, 611.9, 497.4, 617.1, 497.4, 622.6, 498.6, 623.6, 502.1, 620.9, 505.4, 620.9, 506.6, 622.9, 508.1, 626.9, 509.4, 641.6, 508.6, 642.6, 512.1, 640.9, 516.6, 642.1, 517.4, 647.1, 517.4, 654.9, 514.4, 657.6, 514.6, 658.9, 518.6, 660.1, 519.4, 663.1, 519.1, 671.9, 514.4, 685.1, 516.1, 688.1, 514.6, 689.4, 511.6, 691.9, 511.1, 693.9, 509.4, 693.9, 505.6, 689.4, 504.4, 688.4, 501.1, 689.4, 499.6, 696.1, 496.6, 696.4, 490.1, 694.1, 487.9, 690.4, 487.4, 689.1, 483.4, 685.1, 479.9, 679.1, 475.6, 669.9, 475.6, 665.6, 474.1, 660.9, 470.4, 658.1, 465.9, 651.6, 459.9, 610.9, 438.4, 592.9, 425.4, 584.1, 417.9], "R": [759.4, 342.9, 758.6, 344.1, 758.6, 375.1, 757.6, 377.9, 757.6, 383.1, 754.6, 393.9, 752.6, 416.1, 753.6, 417.9, 760.4, 422.9, 763.4, 427.9, 764.6, 434.1, 761.4, 440.1, 754.9, 443.4, 754.6, 456.1, 755.6, 457.9, 760.1, 459.6, 770.1, 466.6, 775.6, 472.9, 777.6, 473.1, 777.6, 464.4, 783.1, 462.1, 787.9, 458.4, 788.6, 451.4, 793.4, 446.1, 791.4, 442.1, 791.6, 439.1, 797.1, 432.1, 800.1, 426.1, 799.6, 423.9, 796.1, 423.6, 794.6, 422.6, 794.4, 418.9, 799.1, 407.1, 800.4, 400.1, 799.6, 398.9, 798.4, 398.9, 796.1, 400.6, 794.1, 400.6, 792.4, 398.9, 792.4, 393.9, 795.4, 380.1, 794.6, 375.9, 793.6, 374.9, 791.4, 375.9, 787.6, 383.4, 785.1, 383.6, 783.6, 382.6, 783.4, 360.9, 781.1, 352.4, 779.1, 351.9, 777.9, 353.1, 776.6, 363.1, 774.4, 371.6, 772.9, 372.6, 770.4, 372.4, 768.4, 366.1, 767.4, 355.9, 765.1, 348.9, 763.1, 344.9, 761.4, 343.1], "M": [709.4, 402.6, 695.4, 406.6, 682.9, 413.9, 678.6, 417.9, 673.6, 426.4, 672.1, 432.4, 679.1, 435.6, 680.6, 438.6, 679.6, 439.6, 676.6, 439.1, 675.1, 442.4, 673.4, 442.6, 670.1, 439.9, 666.6, 439.1, 665.4, 435.6, 665.9, 427.1, 662.9, 426.9, 662.6, 441.6, 659.6, 447.4, 660.1, 455.4, 657.4, 455.6, 646.6, 450.6, 642.9, 450.1, 642.9, 451.1, 651.1, 455.4, 653.4, 458.4, 661.1, 458.6, 667.9, 467.4, 672.4, 469.4, 675.6, 469.4, 679.1, 466.1, 679.9, 455.6, 682.1, 455.6, 683.9, 458.4, 684.9, 456.6, 687.1, 456.6, 687.6, 464.6, 683.1, 474.4, 676.4, 474.6, 666.4, 471.6, 652.1, 459.9, 643.4, 455.1, 642.6, 465.6, 652.4, 470.9, 651.6, 473.6, 646.6, 471.6, 645.6, 472.6, 649.6, 479.1, 656.9, 485.1, 666.4, 488.4, 672.6, 488.4, 683.4, 495.9, 683.9, 516.1, 688.1, 515.1, 688.9, 511.6, 696.1, 509.6, 696.9, 515.1, 704.9, 526.1, 719.6, 536.9, 720.6, 540.6, 712.9, 555.1, 718.6, 557.9, 722.6, 555.4, 723.9, 560.1, 727.4, 561.4, 733.6, 557.4, 734.9, 562.1, 737.6, 562.4, 742.9, 556.6, 746.6, 557.9, 748.1, 557.1, 750.4, 550.6, 750.4, 544.4, 734.4, 544.6, 726.9, 542.4, 726.6, 539.9, 743.6, 540.4, 751.6, 537.4, 756.6, 547.1, 760.1, 548.1, 756.4, 540.6, 756.4, 535.4, 757.9, 531.6, 763.1, 531.1, 776.4, 520.4, 779.6, 521.4, 788.4, 517.4, 792.4, 518.9, 794.1, 525.6, 795.1, 526.9, 796.1, 526.1, 796.4, 518.4, 800.4, 510.6, 800.4, 498.4, 798.4, 497.6, 796.9, 498.9, 794.6, 503.4, 794.6, 507.6, 790.6, 512.6, 787.9, 512.4, 787.1, 508.9, 783.4, 505.6, 783.4, 486.4, 776.4, 465.4, 783.1, 462.1, 783.9, 460.6, 771.9, 450.4, 777.4, 440.6, 777.4, 425.4, 771.4, 413.9, 764.1, 407.9, 759.6, 405.6, 753.9, 404.9, 752.6, 414.6, 750.6, 416.6, 753.9, 422.1, 757.1, 423.6, 758.6, 426.4, 758.6, 433.6, 755.4, 435.6, 747.1, 417.9, 741.1, 411.9, 733.6, 407.6, 730.9, 407.4, 728.6, 404.6, 724.6, 404.1, 723.1, 407.4, 720.4, 407.6, 718.6, 403.6] }, "51.44": { "L": [580.4, 412.9, 579.6, 415.1, 580.9, 419.1, 583.9, 425.1, 593.1, 437.6, 593.6, 440.9, 592.6, 442.4, 589.9, 442.6, 575.1, 437.6, 572.4, 437.9, 571.9, 439.9, 573.9, 443.1, 582.6, 452.1, 595.4, 461.4, 595.6, 463.9, 594.6, 465.4, 581.4, 463.9, 581.1, 466.4, 584.9, 470.1, 593.9, 476.1, 609.1, 481.6, 611.4, 483.4, 611.6, 485.9, 610.6, 487.4, 605.9, 487.9, 602.9, 489.4, 603.6, 491.9, 608.9, 494.1, 622.6, 496.6, 623.6, 499.9, 620.6, 503.9, 621.9, 506.4, 624.9, 507.4, 641.6, 506.6, 642.6, 510.1, 640.9, 514.6, 642.1, 515.4, 647.1, 515.4, 655.9, 513.4, 657.4, 514.4, 658.4, 518.1, 663.1, 517.1, 669.9, 513.4, 684.1, 515.4, 688.6, 510.9, 692.9, 509.4, 693.1, 505.1, 688.6, 502.6, 688.4, 499.9, 689.6, 497.9, 695.6, 496.1, 696.4, 493.9, 694.9, 488.6, 689.6, 486.6, 689.4, 482.1, 688.1, 480.4, 682.6, 477.1, 679.6, 473.9, 671.9, 473.6, 663.9, 470.4, 655.9, 462.4, 655.6, 454.9, 653.4, 454.9, 651.1, 456.6, 647.9, 456.4, 626.9, 445.4, 624.1, 442.9, 608.9, 434.4, 584.1, 413.9], "R": [758.4, 341.9, 757.6, 343.1, 757.6, 378.1, 754.6, 391.9, 753.6, 410.1, 752.6, 413.9, 761.4, 421.9, 763.6, 426.9, 763.6, 434.1, 760.1, 438.4, 754.9, 440.4, 753.6, 447.9, 753.6, 455.9, 754.9, 457.6, 765.1, 462.6, 770.1, 466.6, 775.6, 472.9, 777.6, 473.1, 778.4, 471.9, 777.4, 468.1, 777.6, 464.4, 789.1, 456.6, 788.6, 450.4, 794.1, 444.9, 794.1, 443.4, 791.6, 441.6, 791.6, 438.1, 795.1, 434.1, 800.4, 425.1, 799.6, 422.9, 795.4, 422.4, 794.4, 420.9, 794.6, 416.9, 799.1, 406.1, 800.4, 398.1, 799.6, 396.9, 798.4, 396.9, 795.1, 399.6, 791.6, 398.6, 791.4, 395.9, 794.4, 384.1, 794.4, 373.1, 793.6, 371.9, 791.4, 372.9, 787.6, 380.4, 785.1, 380.6, 783.6, 379.6, 783.4, 365.9, 780.1, 350.4, 778.1, 349.6, 776.6, 351.1, 773.4, 372.6, 771.9, 373.6, 769.4, 373.4, 768.4, 371.9, 768.4, 365.9, 766.1, 352.9, 762.1, 343.9, 760.4, 342.1], "M": [710.4, 400.6, 693.4, 405.6, 682.9, 411.9, 677.6, 416.9, 671.6, 430.6, 679.1, 434.6, 680.6, 437.6, 676.9, 438.9, 675.1, 441.4, 664.6, 439.1, 665.4, 435.4, 664.4, 427.4, 665.4, 425.6, 662.9, 424.9, 661.6, 427.4, 662.6, 439.6, 659.6, 444.4, 659.4, 454.1, 655.4, 454.6, 645.4, 450.6, 642.6, 454.4, 642.6, 460.6, 644.9, 467.1, 650.4, 469.9, 650.4, 472.1, 648.1, 473.4, 653.9, 480.4, 661.4, 484.4, 671.6, 486.4, 681.6, 492.9, 682.6, 494.4, 683.9, 515.1, 686.1, 514.4, 688.9, 510.6, 692.1, 510.1, 694.4, 507.4, 696.1, 507.6, 696.6, 513.6, 702.6, 523.1, 720.4, 536.9, 720.4, 539.1, 711.9, 553.1, 717.4, 556.4, 721.6, 554.4, 722.9, 558.1, 725.4, 559.4, 728.6, 559.4, 730.9, 556.6, 732.6, 556.4, 733.9, 561.1, 736.6, 561.4, 740.1, 559.1, 741.9, 555.6, 743.6, 555.4, 745.6, 557.4, 747.1, 556.1, 749.4, 550.6, 749.4, 543.4, 747.4, 542.6, 744.6, 544.6, 741.6, 543.6, 735.4, 544.6, 725.9, 541.4, 725.6, 538.9, 741.6, 539.4, 746.1, 538.1, 747.6, 534.9, 749.6, 534.4, 754.9, 546.1, 759.1, 548.1, 759.4, 546.4, 756.6, 544.1, 755.4, 540.6, 755.4, 534.4, 756.9, 530.6, 760.6, 531.4, 774.9, 520.6, 779.4, 520.9, 786.4, 517.4, 791.1, 517.6, 792.6, 519.4, 793.9, 525.1, 795.1, 525.1, 796.4, 515.4, 799.4, 510.6, 799.1, 508.9, 796.4, 507.6, 796.6, 505.9, 799.4, 504.6, 799.4, 497.6, 796.9, 497.9, 794.9, 500.9, 793.6, 508.6, 790.6, 511.6, 787.9, 511.4, 786.4, 507.9, 782.4, 504.6, 783.4, 501.6, 783.4, 488.4, 776.4, 464.4, 783.4, 460.4, 769.9, 448.9, 775.1, 443.1, 777.4, 437.6, 777.4, 423.4, 772.4, 412.9, 765.1, 405.9, 758.6, 402.6, 753.9, 401.9, 753.6, 410.6, 749.6, 413.6, 754.9, 422.1, 758.6, 424.4, 758.6, 432.6, 755.4, 433.6, 747.1, 416.9, 739.1, 408.9, 733.6, 405.6, 730.9, 405.4, 727.6, 402.6, 723.4, 402.6, 722.4, 405.1, 720.4, 405.6, 719.1, 402.9, 714.4, 402.6] }, "51.52": { "L": [581.4, 408.9, 580.6, 412.1, 582.6, 417.4, 587.9, 427.1, 594.1, 434.6, 594.6, 437.9, 592.9, 439.6, 588.9, 439.6, 575.1, 433.6, 572.9, 434.4, 572.9, 436.1, 575.9, 442.1, 579.6, 446.1, 586.9, 452.1, 594.1, 456.1, 595.6, 458.1, 595.4, 460.6, 593.9, 461.6, 581.4, 459.9, 580.6, 461.1, 581.1, 463.4, 587.9, 469.1, 595.6, 473.9, 610.4, 479.4, 610.6, 481.9, 609.1, 483.9, 603.1, 485.6, 603.6, 488.9, 620.6, 493.6, 621.6, 495.1, 621.6, 498.1, 619.6, 502.1, 621.1, 504.1, 628.1, 504.4, 630.9, 505.4, 634.9, 504.4, 640.6, 504.6, 641.6, 508.1, 639.9, 512.6, 641.1, 513.4, 647.1, 513.4, 652.9, 511.4, 655.9, 511.4, 657.4, 512.4, 658.4, 516.1, 662.4, 515.4, 667.9, 512.4, 682.1, 514.4, 686.1, 512.6, 688.4, 509.6, 692.1, 508.6, 692.1, 504.4, 688.6, 502.6, 688.4, 498.1, 689.4, 496.6, 695.1, 495.6, 695.4, 490.9, 693.4, 488.1, 689.6, 486.6, 688.6, 478.9, 683.9, 476.4, 679.4, 472.1, 668.9, 470.4, 659.9, 464.4, 657.6, 461.9, 657.4, 456.1, 656.1, 454.4, 653.4, 453.9, 651.1, 455.6, 648.9, 455.6, 639.9, 451.9, 637.4, 447.1, 619.9, 438.4, 607.9, 430.4, 583.4, 409.1], "R": [757.4, 339.9, 756.6, 341.1, 756.6, 353.1, 757.6, 355.9, 757.6, 376.1, 754.6, 389.9, 753.6, 411.1, 762.1, 420.6, 764.4, 425.9, 764.6, 429.1, 761.4, 435.1, 753.9, 439.1, 753.6, 455.9, 754.4, 457.1, 766.1, 463.6, 771.4, 468.1, 777.6, 475.9, 779.6, 476.1, 780.1, 473.9, 776.6, 467.1, 776.6, 463.4, 789.1, 455.6, 788.6, 449.4, 795.1, 442.9, 795.1, 441.4, 792.6, 439.6, 792.6, 436.1, 796.1, 432.1, 801.1, 423.1, 800.6, 420.9, 796.4, 420.4, 795.4, 418.9, 795.4, 414.9, 799.1, 405.1, 800.4, 397.1, 799.6, 395.9, 794.1, 396.6, 792.4, 394.9, 792.4, 389.9, 794.4, 381.1, 794.4, 372.9, 793.4, 371.1, 791.4, 370.9, 790.4, 371.9, 786.6, 380.4, 784.1, 380.6, 782.6, 379.6, 782.4, 360.9, 779.1, 348.4, 777.1, 347.6, 775.6, 349.1, 773.4, 367.6, 771.9, 368.6, 768.4, 368.4, 767.4, 366.9, 766.4, 355.9, 763.1, 345.9, 759.9, 340.6], "M": [710.4, 398.6, 695.4, 402.6, 685.9, 407.9, 677.9, 414.9, 673.6, 422.4, 672.1, 428.4, 678.6, 432.9, 681.6, 437.4, 681.1, 439.4, 678.9, 439.4, 677.4, 436.6, 674.6, 440.6, 663.9, 437.4, 663.1, 435.9, 664.4, 433.6, 664.4, 428.4, 663.4, 425.4, 664.9, 423.1, 663.4, 422.6, 661.6, 424.4, 661.6, 433.6, 662.9, 436.9, 659.6, 441.4, 659.6, 450.6, 661.6, 453.4, 661.6, 455.6, 667.9, 464.4, 674.6, 465.4, 677.1, 463.1, 678.4, 458.6, 677.6, 450.9, 680.6, 450.4, 683.1, 452.1, 683.9, 450.6, 686.1, 450.6, 686.6, 459.6, 682.1, 471.4, 672.4, 470.6, 662.9, 466.4, 656.4, 460.6, 658.4, 457.6, 658.1, 455.9, 651.6, 452.6, 648.6, 454.6, 643.9, 453.9, 643.6, 459.6, 647.6, 469.4, 650.6, 469.4, 655.4, 471.9, 654.6, 474.6, 651.1, 473.9, 653.9, 477.4, 662.4, 482.4, 672.1, 484.6, 682.4, 491.9, 681.6, 506.6, 683.9, 513.1, 687.1, 512.1, 688.4, 509.4, 692.1, 509.1, 693.4, 506.6, 692.1, 503.9, 688.4, 502.6, 688.6, 496.9, 695.4, 496.9, 696.9, 514.1, 705.9, 525.4, 718.6, 535.4, 718.6, 538.6, 710.9, 551.1, 716.4, 554.4, 720.6, 552.4, 722.9, 557.1, 727.4, 558.4, 729.9, 554.6, 731.6, 554.4, 732.9, 559.1, 736.6, 559.4, 741.4, 553.4, 743.4, 553.9, 743.9, 556.1, 746.1, 555.1, 748.4, 550.6, 748.4, 542.4, 746.4, 541.6, 738.6, 543.6, 731.4, 542.6, 725.6, 540.1, 725.4, 538.4, 726.9, 536.6, 740.6, 538.4, 744.6, 537.4, 746.9, 534.6, 748.6, 534.4, 753.9, 545.1, 756.4, 547.4, 758.1, 547.1, 754.4, 539.6, 755.6, 529.9, 760.1, 530.1, 775.4, 518.4, 778.4, 519.9, 785.4, 516.4, 791.1, 517.4, 794.1, 524.6, 795.4, 522.6, 795.4, 517.4, 798.4, 510.6, 798.1, 507.9, 795.4, 506.6, 795.4, 503.4, 796.9, 500.6, 799.1, 500.1, 799.4, 498.4, 797.9, 496.1, 795.9, 497.9, 793.6, 502.4, 793.6, 506.6, 789.6, 511.6, 786.6, 510.1, 786.1, 506.9, 782.4, 503.6, 782.4, 483.4, 780.4, 478.6, 780.4, 474.4, 776.4, 466.6, 777.4, 462.4, 779.6, 463.1, 779.9, 465.1, 781.9, 464.9, 780.4, 461.4, 782.4, 459.4, 767.9, 447.9, 773.4, 443.1, 777.4, 435.6, 777.4, 420.4, 771.4, 408.9, 766.1, 403.6, 760.6, 400.6, 755.4, 399.6, 753.9, 400.9, 753.6, 409.6, 750.1, 411.4, 754.9, 418.1, 758.4, 418.9, 759.6, 422.4, 758.6, 430.6, 755.4, 431.6, 745.1, 411.9, 736.1, 404.9, 730.4, 403.6, 727.6, 400.6, 723.4, 400.6, 721.1, 403.4, 719.4, 403.6, 718.1, 400.9, 714.4, 400.6] }, "51.64": { "L": [582.4, 405.9, 581.6, 410.1, 583.9, 416.1, 588.9, 425.1, 596.1, 433.6, 596.4, 437.6, 594.9, 438.6, 591.9, 438.4, 576.1, 430.6, 573.4, 430.9, 572.9, 432.9, 578.9, 442.1, 582.9, 446.1, 590.9, 452.1, 595.1, 454.1, 596.6, 456.1, 596.4, 458.6, 594.9, 459.6, 581.4, 456.9, 580.6, 459.1, 582.1, 462.4, 585.4, 463.9, 589.9, 468.1, 610.4, 477.4, 610.6, 479.9, 609.6, 481.4, 602.9, 483.4, 601.9, 485.6, 603.9, 487.1, 618.9, 491.4, 621.1, 491.4, 623.9, 489.4, 627.6, 489.6, 628.6, 491.1, 628.1, 494.4, 620.6, 497.1, 618.9, 499.1, 619.1, 501.4, 624.9, 503.4, 639.6, 502.6, 640.6, 506.1, 638.6, 510.9, 640.1, 512.4, 643.1, 512.4, 653.9, 509.4, 657.4, 510.4, 658.4, 514.1, 666.9, 511.4, 672.9, 512.4, 682.1, 512.4, 685.4, 510.9, 688.4, 505.1, 688.6, 496.4, 690.1, 495.4, 693.6, 495.1, 695.4, 492.1, 694.4, 489.1, 689.4, 488.4, 688.4, 486.9, 688.6, 482.9, 691.1, 479.6, 691.1, 478.4, 679.4, 470.1, 667.9, 467.4, 660.9, 463.4, 654.4, 457.1, 648.9, 455.9, 646.4, 451.1, 632.1, 441.9, 623.9, 438.4, 615.9, 433.4, 599.9, 420.4, 584.4, 406.1], "R": [756.4, 337.9, 755.6, 339.1, 755.6, 346.1, 756.6, 348.9, 756.6, 381.1, 754.6, 388.9, 754.6, 401.1, 753.6, 407.1, 761.4, 415.9, 763.6, 420.9, 763.6, 427.1, 759.4, 432.1, 755.6, 433.1, 752.9, 436.1, 752.6, 442.1, 751.6, 444.9, 751.6, 454.9, 752.9, 456.6, 762.1, 460.6, 766.1, 463.6, 773.4, 470.6, 777.4, 476.1, 779.6, 477.1, 780.4, 474.9, 776.6, 466.1, 776.6, 462.4, 788.9, 455.4, 788.6, 448.4, 795.1, 441.9, 795.1, 440.4, 792.6, 438.6, 792.6, 435.1, 796.1, 431.1, 801.4, 422.1, 800.6, 419.9, 796.4, 419.4, 795.4, 417.9, 795.6, 413.9, 800.4, 399.1, 800.4, 395.1, 799.6, 393.9, 798.4, 393.9, 796.4, 396.1, 793.1, 396.6, 791.4, 394.9, 794.4, 380.1, 794.4, 370.1, 793.6, 368.9, 792.1, 368.6, 790.4, 369.9, 788.4, 376.1, 786.6, 378.4, 784.1, 378.6, 782.6, 377.6, 782.4, 361.9, 778.1, 345.4, 776.4, 344.9, 774.6, 347.9, 774.6, 355.1, 772.4, 368.6, 770.9, 369.6, 768.4, 369.4, 767.4, 367.9, 767.4, 362.9, 765.4, 352.9, 763.1, 345.9, 758.9, 338.6], "M": [755.1, 395.1, 753.6, 408.6, 751.6, 410.6, 754.9, 416.1, 758.1, 416.6, 759.6, 419.4, 759.6, 427.6, 757.6, 430.6, 754.6, 430.1, 745.4, 410.9, 740.1, 405.9, 727.6, 398.6, 722.4, 398.6, 720.6, 401.6, 718.9, 401.4, 717.4, 398.6, 711.4, 402.6, 710.4, 400.4, 711.9, 398.1, 706.4, 397.6, 696.4, 400.6, 683.9, 407.6, 676.9, 414.9, 671.6, 426.4, 676.1, 429.4, 681.6, 436.4, 681.4, 439.1, 679.4, 439.6, 678.1, 435.9, 675.9, 435.9, 676.6, 440.6, 675.6, 441.6, 663.4, 434.9, 664.4, 421.4, 663.4, 420.6, 661.9, 421.9, 661.6, 432.6, 662.6, 435.9, 659.6, 440.4, 658.6, 446.6, 662.6, 457.6, 669.4, 463.4, 674.6, 463.4, 677.4, 459.6, 677.6, 449.9, 685.1, 449.6, 686.6, 455.6, 683.1, 469.4, 675.4, 469.6, 668.4, 467.6, 658.4, 461.1, 657.4, 455.6, 655.6, 454.6, 650.4, 455.6, 649.1, 452.9, 645.6, 450.6, 644.6, 451.4, 645.6, 459.6, 650.6, 469.1, 654.6, 472.9, 658.1, 472.6, 658.1, 475.9, 660.9, 478.1, 670.1, 480.6, 681.4, 488.9, 681.6, 509.6, 683.1, 511.9, 687.9, 507.6, 690.9, 507.9, 692.4, 505.6, 691.1, 502.9, 688.4, 501.6, 688.6, 495.9, 691.6, 495.4, 695.4, 496.9, 696.9, 514.1, 705.9, 524.4, 718.6, 534.4, 710.1, 549.4, 715.4, 552.4, 719.6, 551.4, 720.9, 554.1, 726.6, 555.9, 728.1, 555.1, 729.6, 550.9, 731.6, 550.4, 732.6, 551.4, 731.6, 554.4, 732.4, 557.4, 737.6, 557.4, 740.4, 553.4, 743.4, 555.4, 745.1, 555.1, 747.4, 549.6, 747.4, 541.4, 746.4, 540.6, 734.4, 542.6, 726.9, 540.4, 723.6, 538.1, 723.9, 535.6, 739.6, 537.4, 744.1, 536.1, 745.6, 532.9, 747.6, 532.4, 752.9, 544.1, 756.6, 546.4, 757.4, 545.4, 753.4, 538.6, 753.4, 533.4, 754.9, 529.6, 758.6, 530.4, 773.9, 518.6, 780.6, 518.4, 786.4, 515.4, 791.4, 516.9, 793.1, 522.4, 797.4, 510.6, 796.9, 496.1, 794.6, 498.4, 793.6, 505.6, 789.6, 510.6, 787.9, 510.4, 785.4, 505.9, 781.6, 503.1, 782.4, 483.4, 780.4, 478.6, 780.4, 474.4, 777.4, 467.6, 777.9, 464.6, 781.9, 463.9, 780.4, 461.6, 780.9, 458.6, 776.1, 453.6, 765.4, 446.6, 765.6, 444.9, 774.4, 437.1, 776.4, 433.6, 777.4, 430.6, 776.4, 414.4, 771.1, 404.9, 766.1, 399.6, 758.6, 395.6] }, "51.72": { "L": [583.1, 402.6, 581.9, 403.4, 582.9, 408.1, 586.9, 417.1, 595.4, 429.9, 595.4, 433.6, 593.9, 434.6, 590.9, 434.4, 576.1, 426.9, 574.4, 426.9, 573.6, 429.1, 574.9, 432.1, 579.4, 436.9, 582.9, 442.4, 594.1, 450.6, 594.6, 453.9, 593.6, 455.4, 590.9, 455.6, 581.1, 453.6, 579.9, 454.4, 579.9, 455.9, 586.6, 462.9, 609.4, 474.4, 609.1, 478.4, 607.1, 479.6, 602.6, 480.1, 601.9, 482.6, 606.9, 486.1, 611.1, 486.4, 618.9, 489.1, 628.6, 488.6, 629.6, 490.1, 628.6, 493.4, 621.9, 493.9, 617.9, 496.4, 618.9, 498.6, 621.9, 500.1, 638.1, 500.4, 639.4, 499.1, 639.4, 495.1, 640.4, 493.6, 645.1, 493.4, 649.1, 495.1, 650.6, 497.1, 650.4, 499.6, 648.9, 500.6, 641.4, 500.9, 640.4, 504.6, 637.9, 507.1, 637.9, 508.6, 639.1, 509.4, 646.1, 509.4, 651.9, 507.4, 654.9, 507.4, 656.4, 508.4, 656.9, 511.6, 659.1, 512.4, 665.9, 510.4, 680.1, 511.4, 685.9, 508.1, 688.4, 503.1, 688.6, 496.4, 690.1, 495.4, 693.6, 495.1, 695.1, 491.1, 694.6, 488.9, 690.1, 488.6, 688.6, 487.6, 688.6, 482.4, 690.1, 481.4, 695.6, 481.1, 696.1, 478.4, 686.6, 474.1, 678.1, 467.6, 669.9, 466.4, 661.9, 462.4, 652.1, 452.9, 643.1, 445.9, 635.1, 440.9, 626.9, 437.4, 613.9, 428.4, 602.6, 419.4, 588.1, 404.9], "R": [755.4, 335.9, 754.6, 340.1, 756.6, 352.9, 756.6, 379.1, 754.6, 387.9, 754.6, 405.1, 760.4, 411.9, 763.4, 417.9, 763.6, 424.1, 761.4, 428.1, 754.6, 431.1, 751.9, 433.4, 750.6, 454.1, 752.4, 456.4, 760.1, 459.6, 767.1, 464.6, 774.4, 471.9, 777.1, 476.4, 779.6, 477.1, 780.1, 474.9, 777.4, 466.1, 777.6, 463.4, 780.1, 461.6, 781.9, 458.1, 789.9, 453.4, 789.6, 446.4, 795.1, 440.9, 795.1, 439.4, 792.6, 437.6, 792.6, 434.1, 799.1, 425.1, 801.4, 420.1, 800.6, 417.9, 796.4, 417.4, 795.4, 415.9, 795.6, 411.9, 800.4, 398.1, 800.4, 393.1, 799.6, 391.9, 798.4, 391.9, 796.1, 393.6, 794.1, 393.6, 792.4, 391.9, 792.4, 386.9, 794.4, 377.1, 794.4, 368.9, 793.6, 366.9, 792.6, 365.9, 790.4, 366.9, 788.4, 373.1, 786.6, 375.4, 784.1, 375.6, 782.6, 374.6, 782.4, 361.9, 780.4, 350.9, 777.9, 343.6, 775.4, 342.9, 774.6, 344.1, 772.4, 366.6, 770.9, 367.6, 768.4, 367.4, 767.4, 365.9, 765.4, 352.9, 763.1, 345.9, 759.1, 337.9, 757.4, 336.1], "M": [755.1, 392.1, 754.6, 404.6, 751.1, 408.4, 754.9, 414.1, 758.1, 414.6, 759.6, 417.4, 759.6, 426.6, 758.1, 429.4, 754.6, 429.1, 747.1, 411.9, 741.1, 404.9, 726.6, 396.6, 722.4, 396.6, 721.4, 399.1, 719.4, 399.6, 718.1, 396.9, 709.4, 394.6, 690.9, 400.9, 683.9, 405.6, 676.9, 412.9, 671.6, 423.6, 678.6, 430.4, 678.1, 432.4, 674.9, 432.4, 677.6, 437.1, 677.1, 439.4, 673.4, 439.6, 669.1, 434.9, 663.4, 433.6, 660.9, 435.9, 660.6, 438.6, 658.6, 441.4, 658.6, 444.6, 662.9, 456.1, 669.4, 461.4, 673.6, 461.4, 676.1, 459.1, 676.9, 447.6, 678.6, 447.4, 680.4, 449.4, 683.4, 447.4, 685.4, 447.9, 685.6, 455.6, 682.1, 467.4, 675.4, 467.6, 667.4, 465.6, 660.9, 461.6, 647.1, 448.9, 644.6, 448.6, 646.6, 458.6, 651.6, 467.1, 658.9, 474.1, 668.1, 477.6, 681.4, 486.9, 680.6, 503.6, 681.9, 510.1, 686.1, 508.1, 688.4, 503.6, 688.6, 495.9, 695.4, 495.9, 696.9, 514.1, 717.6, 533.4, 709.9, 545.9, 709.9, 548.1, 715.6, 550.9, 718.6, 550.4, 719.9, 552.1, 725.4, 554.4, 729.6, 552.4, 731.4, 555.4, 737.6, 555.4, 740.4, 552.4, 742.1, 552.6, 743.4, 554.9, 746.4, 548.6, 747.4, 541.4, 745.6, 539.6, 743.6, 540.6, 730.4, 540.6, 722.6, 537.1, 722.4, 535.4, 723.9, 533.6, 733.4, 536.4, 739.6, 536.4, 744.1, 535.1, 744.6, 531.9, 746.6, 531.4, 751.9, 543.1, 755.6, 545.4, 756.4, 544.4, 752.4, 537.6, 752.4, 532.4, 753.9, 528.6, 758.1, 529.1, 768.1, 522.4, 774.4, 516.4, 777.4, 518.4, 779.6, 518.4, 785.4, 514.4, 788.6, 514.4, 791.4, 516.9, 791.9, 520.1, 793.1, 520.1, 797.4, 504.6, 795.4, 501.6, 797.1, 494.9, 795.9, 494.9, 793.9, 497.9, 793.6, 503.6, 789.6, 509.6, 786.9, 509.4, 784.1, 503.9, 781.4, 501.6, 782.4, 486.4, 779.4, 470.4, 776.4, 464.6, 777.4, 462.4, 780.4, 463.4, 781.9, 462.4, 781.4, 459.4, 777.1, 454.6, 764.4, 445.6, 764.6, 441.9, 773.4, 436.1, 777.4, 428.6, 777.4, 415.4, 771.4, 402.9, 763.1, 394.9] }, "51.80": { "L": [583.4, 399.9, 582.6, 402.1, 586.9, 414.1, 596.1, 427.6, 596.4, 431.6, 594.9, 432.6, 591.9, 432.4, 583.1, 426.9, 576.1, 423.9, 574.4, 423.9, 573.6, 426.1, 584.1, 440.4, 594.4, 447.9, 595.6, 449.9, 595.4, 452.6, 593.9, 453.6, 581.1, 451.6, 579.9, 452.4, 580.1, 454.4, 588.9, 462.1, 610.4, 472.4, 610.6, 474.9, 609.1, 476.9, 602.9, 477.9, 600.9, 479.4, 600.9, 480.6, 604.9, 483.1, 611.9, 485.4, 626.1, 486.6, 629.4, 487.9, 632.9, 491.1, 641.1, 492.4, 647.6, 494.6, 648.6, 496.1, 647.6, 499.4, 641.6, 500.6, 638.9, 502.9, 637.6, 506.9, 639.1, 508.4, 653.9, 506.4, 655.4, 507.4, 655.9, 510.6, 658.1, 511.4, 666.9, 508.4, 669.1, 508.4, 671.4, 510.1, 673.1, 510.1, 679.1, 509.4, 681.9, 507.4, 685.4, 506.9, 688.1, 503.1, 689.6, 496.4, 693.4, 494.9, 694.4, 493.1, 693.9, 488.6, 688.6, 486.6, 688.6, 482.4, 690.1, 481.4, 695.6, 481.1, 696.4, 479.9, 696.1, 476.4, 686.6, 472.1, 677.9, 465.9, 671.9, 465.4, 665.9, 463.4, 660.9, 460.4, 647.1, 446.9, 637.4, 440.1, 632.9, 438.4, 619.9, 430.4, 603.6, 417.4, 589.1, 402.9, 585.4, 400.1], "R": [755.4, 334.9, 754.6, 336.1, 754.6, 342.1, 756.6, 352.9, 756.6, 378.1, 754.6, 386.9, 754.6, 402.1, 760.4, 408.9, 762.4, 412.9, 763.6, 416.9, 763.6, 422.1, 756.6, 429.4, 753.1, 429.9, 751.9, 431.1, 749.6, 443.9, 749.6, 453.9, 750.9, 455.6, 758.1, 458.6, 767.1, 464.6, 773.4, 470.9, 777.4, 477.1, 779.6, 478.1, 780.4, 475.9, 778.4, 468.1, 778.6, 463.4, 781.1, 461.6, 782.6, 456.9, 789.9, 452.4, 789.6, 445.4, 796.1, 438.9, 796.1, 437.4, 793.6, 435.6, 793.6, 432.1, 800.1, 423.1, 802.1, 418.1, 801.6, 415.9, 797.1, 415.6, 795.4, 413.9, 795.6, 410.9, 800.4, 397.1, 801.1, 390.4, 799.1, 389.9, 796.9, 391.4, 794.1, 391.6, 792.4, 389.9, 794.4, 376.1, 794.4, 366.9, 792.6, 363.9, 790.4, 364.9, 788.4, 372.1, 786.6, 374.4, 784.1, 374.6, 782.6, 373.6, 781.4, 355.9, 777.6, 341.9, 775.4, 340.9, 773.9, 343.9, 772.6, 363.9, 771.6, 365.4, 769.1, 365.6, 767.4, 363.9, 765.4, 352.9, 762.1, 342.9, 757.9, 335.6], "M": [755.4, 389.6, 754.6, 404.6, 751.1, 406.4, 754.9, 412.1, 759.6, 415.4, 760.6, 421.6, 758.1, 427.4, 754.6, 427.1, 752.4, 420.4, 746.1, 408.9, 735.1, 398.9, 726.6, 394.6, 722.4, 394.6, 721.4, 398.1, 718.4, 398.6, 716.6, 394.6, 706.4, 393.6, 696.4, 396.6, 687.9, 400.9, 682.9, 404.6, 675.9, 412.9, 671.6, 422.6, 678.6, 429.4, 678.1, 431.4, 675.6, 431.9, 676.1, 439.4, 672.9, 439.4, 669.1, 433.6, 664.6, 431.6, 660.6, 434.4, 658.6, 443.6, 662.6, 454.6, 665.9, 458.1, 670.4, 460.4, 674.4, 459.1, 676.4, 455.6, 676.9, 445.6, 679.1, 445.6, 680.6, 448.4, 682.4, 447.4, 685.4, 447.9, 685.6, 452.6, 682.6, 460.4, 682.1, 465.4, 672.4, 465.6, 666.4, 463.6, 659.9, 459.6, 648.1, 447.6, 646.6, 446.6, 645.6, 447.4, 647.6, 456.6, 651.6, 464.1, 659.9, 472.1, 668.1, 475.6, 681.4, 484.9, 680.6, 505.6, 681.9, 508.1, 687.1, 505.1, 689.9, 495.6, 695.4, 495.9, 696.9, 514.1, 716.6, 531.4, 716.4, 534.1, 708.9, 546.1, 723.4, 552.4, 725.6, 552.4, 727.9, 549.6, 729.6, 549.4, 730.6, 550.4, 730.1, 552.9, 734.4, 554.4, 737.1, 554.1, 739.4, 550.4, 741.4, 550.9, 742.1, 553.9, 744.1, 552.1, 745.4, 548.6, 745.1, 538.9, 730.4, 539.6, 721.9, 536.4, 721.9, 533.6, 727.6, 533.4, 732.4, 535.4, 738.6, 535.4, 743.1, 534.1, 743.6, 530.9, 745.6, 530.4, 750.9, 542.1, 754.4, 545.4, 755.4, 544.4, 752.6, 541.1, 751.4, 536.6, 752.9, 527.6, 757.6, 528.4, 759.9, 525.6, 768.1, 521.1, 772.9, 516.6, 779.6, 517.4, 785.4, 513.4, 789.1, 514.4, 792.1, 519.4, 796.4, 505.6, 796.4, 503.4, 794.4, 501.6, 796.4, 496.6, 795.9, 494.1, 792.6, 499.4, 792.6, 504.6, 789.1, 508.4, 785.9, 508.4, 785.1, 504.9, 781.6, 502.1, 781.4, 479.4, 777.4, 463.4, 781.1, 462.1, 781.9, 460.6, 777.1, 454.6, 763.4, 445.6, 764.6, 438.9, 769.1, 437.1, 774.4, 432.1, 777.4, 425.6, 777.4, 413.4, 775.4, 407.4, 771.4, 399.9, 764.1, 392.6] }, "51.88": { "L": [584.4, 396.9, 583.6, 400.1, 585.9, 407.1, 592.9, 420.1, 597.1, 424.6, 597.4, 428.6, 595.9, 429.6, 591.9, 429.4, 577.1, 421.6, 574.9, 422.4, 574.9, 424.1, 580.9, 433.1, 589.9, 442.1, 594.4, 444.9, 595.6, 446.9, 595.4, 449.6, 593.9, 450.6, 590.9, 450.6, 585.1, 448.6, 581.4, 448.9, 580.6, 450.1, 581.1, 452.4, 592.6, 461.9, 596.9, 462.6, 599.9, 465.1, 609.4, 469.4, 609.1, 473.4, 607.1, 474.6, 601.9, 475.4, 600.9, 476.4, 601.1, 478.4, 612.9, 483.1, 621.9, 485.4, 626.9, 485.6, 629.1, 489.4, 631.9, 491.1, 647.1, 493.6, 651.9, 496.1, 660.6, 498.6, 661.6, 500.1, 661.4, 502.6, 656.4, 504.6, 654.9, 506.1, 654.9, 508.6, 656.1, 509.4, 660.1, 509.4, 664.9, 507.4, 669.9, 508.1, 679.1, 507.4, 686.4, 503.9, 688.1, 501.1, 688.6, 496.4, 692.6, 495.1, 693.4, 493.9, 693.1, 488.4, 688.9, 486.4, 688.6, 482.4, 690.1, 481.4, 695.6, 481.1, 696.4, 479.9, 696.1, 475.4, 682.6, 469.1, 676.9, 463.9, 667.9, 462.4, 660.9, 458.4, 646.1, 443.9, 617.9, 426.4, 604.6, 415.4, 588.4, 398.9, 586.4, 397.1], "R": [754.4, 332.9, 753.6, 335.1, 756.6, 353.9, 756.6, 377.1, 754.6, 387.9, 754.6, 402.1, 760.4, 408.9, 762.4, 412.9, 763.6, 420.1, 762.4, 423.1, 760.1, 425.4, 756.6, 428.4, 753.9, 428.9, 751.9, 430.4, 751.6, 436.1, 749.6, 443.9, 749.6, 452.1, 751.4, 454.4, 759.1, 457.6, 766.1, 462.6, 772.4, 468.9, 777.4, 477.1, 779.6, 478.1, 780.4, 475.9, 777.4, 465.1, 777.6, 461.4, 780.1, 459.6, 781.6, 455.9, 790.1, 450.6, 789.6, 444.1, 796.1, 437.9, 796.1, 436.4, 793.6, 434.6, 793.6, 430.9, 800.1, 422.1, 802.4, 417.1, 801.6, 414.9, 797.1, 414.6, 795.4, 412.9, 795.6, 409.9, 800.1, 398.1, 801.4, 389.1, 800.6, 387.9, 799.4, 387.9, 797.4, 390.1, 794.1, 390.6, 792.4, 388.9, 792.4, 384.9, 794.4, 376.1, 794.4, 364.9, 793.4, 363.1, 791.4, 362.9, 790.4, 363.9, 786.6, 373.4, 784.1, 373.6, 782.6, 372.6, 781.4, 353.9, 777.6, 340.9, 775.1, 339.9, 773.6, 341.9, 773.6, 355.1, 772.4, 363.6, 770.9, 364.6, 768.4, 364.4, 767.4, 362.9, 764.1, 346.9, 761.4, 339.6, 756.4, 333.1], "M": [755.1, 389.1, 754.6, 403.6, 752.1, 405.4, 755.9, 412.1, 759.1, 412.6, 760.6, 416.4, 760.6, 421.6, 758.1, 426.4, 754.6, 426.1, 748.1, 409.9, 745.4, 405.9, 737.1, 398.9, 725.6, 392.6, 721.6, 392.6, 721.4, 396.1, 718.4, 396.6, 716.6, 392.6, 706.4, 391.6, 699.4, 393.6, 686.9, 399.9, 676.9, 408.9, 671.6, 420.6, 677.6, 425.9, 681.4, 431.9, 682.6, 435.4, 682.1, 438.4, 679.6, 438.1, 676.9, 431.9, 676.1, 432.4, 677.6, 438.6, 676.6, 439.6, 672.9, 439.4, 669.4, 432.9, 664.6, 429.6, 660.9, 430.9, 660.1, 432.6, 660.6, 435.6, 658.6, 440.4, 659.6, 445.6, 662.9, 453.1, 668.4, 457.4, 671.4, 458.4, 674.1, 457.4, 675.4, 455.6, 676.6, 445.9, 680.4, 446.4, 681.9, 443.6, 684.4, 443.9, 684.6, 452.6, 682.6, 457.4, 682.1, 464.4, 671.4, 463.6, 663.9, 460.4, 647.1, 444.6, 645.6, 443.6, 644.6, 444.6, 646.6, 453.6, 652.6, 464.1, 658.9, 470.1, 667.1, 473.6, 672.9, 479.4, 681.1, 484.1, 680.9, 506.1, 682.6, 506.4, 687.1, 503.1, 688.9, 495.6, 695.4, 495.9, 696.9, 513.1, 716.6, 530.4, 708.1, 544.4, 721.4, 550.4, 725.4, 550.9, 726.9, 548.6, 728.6, 548.4, 730.4, 552.4, 735.6, 552.4, 738.4, 549.4, 740.1, 549.6, 740.9, 552.1, 742.1, 552.1, 744.4, 548.6, 745.1, 537.9, 729.4, 538.6, 719.9, 534.4, 719.9, 531.6, 725.6, 531.4, 736.6, 534.4, 742.1, 533.1, 742.6, 529.9, 744.6, 529.4, 749.9, 541.1, 754.4, 544.4, 754.4, 542.4, 751.6, 540.1, 750.4, 535.6, 752.9, 524.6, 755.1, 524.6, 756.1, 526.9, 757.6, 526.4, 767.1, 520.4, 773.4, 514.4, 776.6, 516.4, 781.1, 515.1, 784.4, 512.4, 786.6, 512.4, 790.4, 514.9, 790.9, 517.1, 792.1, 517.1, 795.4, 506.6, 793.1, 502.9, 795.4, 497.6, 795.1, 494.6, 792.6, 498.4, 792.9, 502.4, 788.6, 507.6, 785.9, 507.4, 784.1, 502.9, 780.6, 500.1, 781.4, 481.4, 779.4, 470.4, 776.4, 462.4, 782.4, 459.4, 776.1, 452.6, 763.9, 444.4, 764.6, 438.9, 773.4, 432.1, 776.4, 426.6, 775.4, 407.4, 771.4, 399.9, 764.1, 392.6, 758.6, 389.6] }, "51.96": { "L": [585.1, 393.6, 583.9, 394.4, 583.6, 396.1, 585.9, 403.1, 590.9, 414.1, 597.1, 421.6, 597.4, 425.6, 595.9, 426.6, 591.9, 426.4, 577.1, 418.9, 575.4, 418.9, 574.9, 421.1, 579.9, 429.1, 594.6, 443.9, 594.4, 446.6, 592.9, 447.6, 581.4, 445.9, 580.6, 447.1, 581.1, 449.4, 590.9, 458.1, 596.1, 461.1, 601.1, 462.4, 609.4, 467.4, 609.6, 469.9, 608.1, 471.9, 600.9, 473.4, 601.1, 476.4, 608.9, 480.1, 625.6, 483.6, 627.1, 488.4, 629.9, 490.1, 633.9, 491.4, 644.1, 492.4, 648.9, 495.1, 660.4, 497.9, 661.6, 499.9, 661.4, 502.6, 659.9, 503.6, 654.6, 504.1, 653.6, 506.9, 655.1, 508.4, 659.1, 508.1, 664.9, 505.4, 679.1, 506.4, 686.4, 502.9, 688.9, 496.6, 693.1, 493.1, 693.1, 489.4, 688.6, 487.6, 688.4, 482.1, 689.4, 480.6, 694.1, 479.6, 694.1, 474.4, 682.6, 468.1, 676.4, 463.1, 662.9, 458.4, 643.1, 439.9, 623.9, 428.4, 608.9, 416.4, 587.4, 394.1], "R": [754.4, 330.9, 753.6, 334.1, 756.6, 351.9, 756.6, 376.1, 755.6, 378.9, 754.6, 402.1, 759.4, 407.9, 762.4, 413.9, 762.6, 421.1, 756.6, 427.4, 753.9, 427.9, 751.9, 429.4, 751.6, 437.1, 750.6, 439.9, 750.6, 451.1, 751.6, 452.9, 758.1, 455.6, 766.4, 461.6, 772.4, 467.9, 777.4, 476.1, 779.4, 477.1, 780.1, 474.9, 777.4, 464.1, 777.6, 460.4, 780.1, 458.6, 781.6, 454.9, 788.9, 450.4, 789.6, 443.1, 795.4, 437.1, 793.4, 433.1, 793.6, 429.9, 802.4, 416.1, 801.6, 413.9, 797.1, 413.6, 795.4, 411.9, 795.6, 408.9, 799.1, 400.1, 801.4, 388.1, 800.6, 386.9, 799.4, 386.9, 794.9, 391.6, 791.6, 390.6, 791.4, 387.9, 794.4, 375.1, 794.4, 363.1, 792.9, 361.6, 790.4, 362.9, 786.6, 372.4, 784.1, 372.6, 782.6, 371.6, 781.4, 351.9, 777.6, 338.9, 775.1, 337.9, 773.6, 339.9, 773.6, 354.1, 772.4, 362.6, 770.9, 363.6, 768.4, 363.4, 766.4, 358.1, 764.1, 345.9, 761.1, 337.9, 758.1, 332.9, 756.4, 331.1], "M": [755.4, 388.6, 754.6, 401.6, 752.1, 403.4, 756.1, 409.9, 759.4, 409.9, 760.6, 414.4, 760.6, 420.6, 757.6, 425.6, 754.6, 425.1, 747.1, 406.9, 740.1, 398.9, 727.6, 391.6, 721.4, 390.6, 720.4, 394.1, 718.4, 394.6, 717.1, 391.9, 711.4, 391.6, 708.4, 389.6, 700.4, 391.6, 688.9, 396.9, 680.9, 402.9, 675.9, 408.9, 671.6, 419.6, 676.4, 422.9, 678.9, 428.1, 680.4, 428.9, 682.6, 434.4, 682.1, 439.4, 679.6, 439.1, 676.6, 428.6, 675.6, 428.9, 675.6, 431.6, 677.6, 437.4, 676.9, 440.6, 671.6, 438.1, 671.1, 434.9, 666.1, 428.9, 662.4, 428.6, 659.6, 431.4, 660.1, 435.9, 662.4, 436.9, 662.6, 438.6, 658.9, 439.9, 658.6, 441.6, 660.9, 448.1, 666.9, 455.1, 669.4, 456.4, 672.6, 456.4, 674.1, 455.1, 675.4, 452.6, 676.1, 441.4, 678.1, 441.6, 679.6, 444.9, 682.4, 443.4, 684.4, 443.9, 684.6, 448.6, 681.6, 456.4, 682.1, 462.4, 673.4, 462.6, 662.9, 458.4, 649.1, 444.6, 644.6, 442.6, 646.6, 452.6, 653.6, 464.1, 680.4, 482.9, 679.6, 500.6, 680.9, 505.1, 687.1, 502.1, 689.9, 495.6, 695.4, 495.9, 696.9, 513.1, 700.1, 514.6, 702.9, 518.1, 705.1, 518.6, 716.6, 530.4, 716.4, 532.1, 711.9, 535.9, 707.9, 543.1, 715.4, 547.4, 722.4, 549.4, 724.6, 549.4, 727.6, 547.4, 728.9, 550.1, 731.4, 551.4, 734.6, 551.4, 737.4, 548.4, 739.4, 548.9, 739.9, 551.1, 742.1, 550.1, 743.4, 547.6, 744.1, 536.9, 728.4, 537.6, 720.9, 534.4, 719.4, 532.6, 719.9, 530.6, 723.6, 530.4, 736.6, 533.4, 741.1, 532.1, 741.6, 528.9, 743.6, 528.4, 748.9, 540.1, 753.4, 543.9, 753.9, 542.6, 750.6, 539.1, 749.4, 534.6, 752.9, 519.6, 755.4, 519.9, 756.4, 525.9, 772.4, 514.4, 775.6, 515.4, 785.6, 511.4, 791.1, 515.6, 794.4, 506.6, 793.4, 500.1, 795.4, 496.6, 794.9, 493.1, 792.6, 496.4, 791.6, 503.6, 788.6, 506.6, 784.9, 506.4, 784.1, 502.9, 779.4, 498.6, 781.4, 489.6, 781.4, 483.4, 779.4, 469.4, 776.4, 460.4, 782.4, 458.4, 774.1, 449.6, 764.4, 442.6, 764.6, 437.9, 773.4, 431.1, 776.4, 424.6, 775.4, 408.4, 771.1, 399.9, 766.1, 393.6, 757.6, 388.6] }, "52.04": { "L": [585.4, 390.9, 584.6, 395.1, 585.9, 399.1, 591.9, 412.1, 597.4, 419.1, 597.4, 422.6, 595.9, 423.6, 591.9, 423.4, 576.9, 414.9, 575.4, 414.9, 574.6, 417.1, 576.9, 422.1, 580.9, 427.1, 595.6, 441.9, 595.4, 444.6, 593.9, 445.6, 582.1, 442.6, 579.9, 443.4, 580.1, 445.4, 591.9, 456.1, 599.6, 460.9, 604.1, 461.6, 610.4, 465.4, 610.6, 467.9, 609.6, 469.4, 600.4, 470.9, 600.1, 473.4, 603.9, 476.1, 620.6, 480.6, 621.6, 482.1, 621.4, 484.6, 617.9, 486.4, 616.6, 488.1, 617.1, 490.4, 618.9, 491.4, 621.6, 491.1, 624.1, 488.4, 627.1, 488.6, 630.9, 490.4, 642.1, 491.4, 648.9, 495.1, 657.1, 496.6, 660.1, 498.1, 662.6, 501.9, 667.6, 502.6, 669.4, 505.1, 679.1, 504.4, 685.6, 501.1, 688.6, 495.4, 691.6, 494.1, 692.4, 492.9, 692.1, 490.4, 688.6, 488.6, 688.4, 482.1, 689.4, 480.6, 694.1, 479.6, 694.1, 473.4, 679.9, 465.4, 675.4, 461.1, 668.9, 459.4, 660.9, 455.4, 646.4, 440.1, 643.6, 439.1, 616.9, 420.4, 603.6, 408.4, 589.4, 392.9, 587.4, 391.1], "R": [754.4, 328.9, 753.6, 332.1, 756.6, 349.9, 756.6, 375.1, 755.6, 377.9, 754.6, 400.1, 761.4, 411.9, 762.6, 419.1, 759.9, 424.4, 756.6, 427.4, 753.1, 427.9, 751.9, 429.1, 750.6, 449.1, 751.6, 450.9, 759.1, 454.6, 764.4, 458.6, 772.4, 466.9, 777.4, 476.1, 779.4, 477.1, 780.1, 474.9, 778.1, 464.9, 776.4, 461.1, 776.6, 458.4, 780.1, 456.6, 781.6, 452.9, 789.9, 448.4, 789.6, 441.4, 796.1, 434.9, 796.1, 433.4, 793.6, 431.6, 793.6, 428.1, 799.1, 421.1, 802.4, 415.1, 801.6, 411.9, 797.4, 411.4, 796.4, 409.9, 796.4, 405.9, 799.1, 399.1, 801.4, 390.1, 801.4, 386.1, 800.6, 384.9, 799.4, 384.9, 795.9, 388.6, 793.4, 388.4, 792.4, 386.9, 792.4, 382.9, 794.4, 375.1, 794.4, 361.1, 793.6, 359.9, 790.9, 360.4, 786.6, 371.4, 784.1, 371.6, 782.6, 370.6, 781.4, 349.9, 777.6, 336.9, 775.4, 335.9, 773.6, 338.9, 773.6, 351.1, 772.6, 353.9, 772.4, 360.6, 770.9, 361.6, 768.4, 361.4, 767.4, 359.9, 766.1, 350.9, 761.1, 335.9, 758.1, 330.9, 756.4, 329.1], "M": [709.4, 387.6, 700.4, 389.6, 685.9, 396.9, 677.9, 403.9, 671.6, 415.4, 671.9, 417.1, 678.4, 423.9, 683.6, 437.4, 683.6, 450.6, 680.1, 459.4, 673.4, 460.6, 660.9, 455.4, 645.6, 439.6, 644.6, 440.4, 644.6, 446.6, 649.9, 458.1, 657.9, 466.4, 664.1, 469.6, 669.9, 475.4, 680.4, 481.9, 679.6, 501.6, 680.9, 503.1, 686.1, 503.1, 688.9, 494.6, 695.4, 495.9, 696.9, 512.1, 705.1, 517.6, 715.6, 528.4, 707.1, 541.4, 719.4, 547.4, 723.4, 548.4, 726.6, 546.4, 727.9, 549.1, 732.4, 550.4, 734.1, 550.1, 735.6, 546.9, 737.6, 546.4, 739.4, 549.9, 742.4, 546.6, 743.1, 535.9, 728.4, 536.6, 718.9, 532.4, 718.6, 529.9, 724.6, 529.4, 735.6, 532.4, 739.1, 531.1, 740.6, 527.9, 742.6, 527.4, 747.9, 539.1, 752.4, 542.4, 752.9, 541.6, 749.4, 537.6, 749.4, 526.4, 752.6, 516.9, 754.9, 516.4, 755.6, 517.4, 753.6, 522.4, 754.6, 525.4, 758.9, 521.6, 766.1, 518.1, 771.4, 513.4, 774.6, 514.4, 785.6, 510.4, 790.4, 513.9, 793.4, 506.6, 792.1, 500.6, 794.4, 496.6, 794.4, 493.6, 792.6, 494.4, 791.6, 501.9, 788.6, 505.6, 784.9, 505.4, 783.1, 500.9, 779.6, 498.1, 780.4, 475.4, 778.4, 465.4, 775.4, 458.4, 776.4, 457.4, 779.6, 458.4, 781.9, 456.6, 772.1, 446.6, 764.4, 441.6, 764.6, 437.9, 771.4, 433.1, 775.4, 425.6, 775.4, 409.4, 768.4, 395.9, 763.1, 390.9, 756.6, 387.6, 755.6, 388.4, 754.6, 399.6, 751.6, 401.6, 755.9, 408.6, 757.4, 407.4, 759.4, 407.9, 760.6, 419.6, 758.1, 423.4, 755.4, 423.6, 747.1, 404.9, 742.1, 398.6, 737.1, 394.9, 729.9, 392.4, 727.6, 389.6, 721.6, 389.1, 719.6, 392.6, 717.6, 392.1, 716.9, 389.1, 714.4, 389.6, 712.4, 393.1, 710.4, 393.6, 709.4, 392.6, 710.4, 388.4] }, "52.12": { "L": [585.4, 387.9, 584.6, 391.1, 587.9, 401.1, 591.9, 409.1, 598.1, 417.6, 598.4, 421.6, 596.9, 422.6, 594.1, 422.4, 579.1, 412.9, 575.4, 412.9, 574.9, 415.1, 581.9, 426.1, 596.1, 438.1, 597.4, 439.4, 597.6, 441.9, 596.6, 443.4, 593.9, 443.6, 585.1, 440.6, 581.1, 440.6, 579.9, 441.4, 579.9, 442.9, 586.9, 450.1, 593.9, 455.1, 602.9, 460.1, 611.9, 461.4, 613.6, 463.1, 613.6, 465.9, 612.6, 467.4, 602.9, 467.9, 599.9, 469.4, 599.9, 471.6, 606.9, 475.1, 619.6, 478.6, 620.6, 480.1, 620.4, 482.6, 616.9, 484.4, 615.6, 486.1, 615.9, 487.6, 617.9, 489.1, 626.1, 488.4, 634.9, 490.4, 640.9, 490.4, 645.9, 494.1, 655.1, 495.6, 660.6, 498.6, 662.6, 500.9, 666.1, 501.4, 668.9, 503.4, 678.1, 503.4, 686.4, 498.9, 688.6, 494.4, 691.6, 493.1, 692.4, 491.9, 692.1, 489.4, 688.6, 487.6, 688.4, 482.1, 689.4, 480.6, 693.1, 479.6, 692.9, 471.6, 680.9, 465.4, 674.4, 459.1, 667.9, 457.4, 661.9, 454.4, 648.1, 439.9, 619.9, 420.4, 607.6, 409.4, 589.4, 389.9, 587.4, 388.1], "R": [754.4, 326.9, 753.6, 330.1, 756.6, 347.9, 756.6, 373.1, 755.6, 375.9, 755.6, 391.1, 754.6, 393.9, 754.6, 398.1, 759.4, 406.9, 761.4, 412.9, 761.6, 420.1, 759.4, 424.1, 754.1, 425.9, 752.9, 427.1, 750.6, 439.9, 750.6, 447.9, 751.9, 449.6, 758.1, 452.6, 766.4, 459.1, 774.4, 468.9, 777.9, 476.6, 779.4, 477.1, 780.4, 474.9, 778.1, 463.9, 776.4, 460.1, 776.6, 457.4, 779.6, 456.1, 781.9, 452.1, 790.9, 446.4, 791.6, 439.1, 797.1, 432.9, 797.1, 431.4, 794.6, 429.6, 794.6, 426.1, 799.1, 420.1, 803.1, 412.1, 802.6, 409.9, 798.1, 409.6, 796.4, 407.9, 796.6, 404.9, 801.4, 391.1, 802.1, 383.4, 799.6, 383.1, 796.1, 386.6, 792.6, 385.6, 792.4, 382.9, 794.4, 375.1, 794.4, 359.1, 793.6, 357.9, 790.9, 358.4, 786.6, 369.4, 784.1, 369.6, 782.6, 368.6, 781.4, 346.9, 777.6, 334.9, 775.1, 333.9, 773.6, 335.9, 773.6, 350.1, 772.6, 352.9, 772.4, 359.6, 770.9, 360.6, 768.4, 360.4, 767.4, 358.9, 766.1, 348.9, 761.1, 333.9, 758.1, 328.9, 756.4, 327.1], "M": [705.4, 386.6, 693.4, 390.6, 684.9, 395.6, 675.9, 404.9, 671.4, 413.9, 671.1, 415.4, 676.6, 419.9, 678.6, 423.4, 677.9, 425.6, 675.9, 425.4, 675.1, 423.9, 673.6, 424.6, 676.9, 436.1, 679.4, 435.4, 677.4, 427.4, 679.6, 426.4, 683.6, 437.4, 683.6, 446.6, 680.1, 458.4, 671.4, 458.6, 661.9, 454.4, 649.1, 440.6, 644.4, 437.1, 643.6, 441.6, 645.6, 448.6, 651.6, 459.1, 663.1, 467.4, 670.9, 475.4, 679.4, 480.9, 679.9, 502.1, 683.6, 504.4, 685.1, 503.4, 689.4, 494.4, 695.4, 495.9, 696.9, 512.1, 705.1, 516.6, 706.6, 520.1, 714.6, 527.4, 714.4, 529.1, 711.6, 530.9, 706.9, 537.9, 706.9, 540.1, 720.4, 546.4, 725.6, 546.4, 728.4, 548.4, 733.6, 548.4, 736.6, 546.4, 739.6, 548.4, 742.4, 544.6, 743.4, 536.4, 742.1, 534.9, 727.4, 535.6, 718.9, 531.4, 717.4, 529.6, 717.6, 527.9, 721.6, 527.4, 725.4, 529.4, 736.6, 531.4, 740.1, 530.1, 740.6, 527.9, 742.6, 527.4, 747.9, 539.1, 751.6, 541.4, 752.4, 540.4, 749.6, 538.1, 748.4, 533.6, 748.4, 527.4, 750.6, 519.9, 753.4, 519.9, 752.6, 523.4, 754.6, 524.4, 760.9, 519.6, 765.1, 518.1, 770.4, 513.4, 778.6, 512.4, 783.4, 509.4, 789.9, 512.9, 793.4, 502.6, 792.4, 500.9, 793.1, 493.6, 791.4, 500.4, 786.6, 505.6, 784.6, 505.1, 783.1, 499.9, 779.6, 497.1, 780.4, 474.4, 776.4, 458.4, 781.9, 455.6, 776.1, 448.6, 764.4, 439.6, 765.6, 436.9, 772.1, 431.1, 775.4, 423.6, 775.4, 411.4, 769.4, 396.9, 762.1, 389.9, 756.4, 387.6, 754.4, 398.1, 750.1, 398.1, 755.6, 406.9, 759.4, 406.9, 760.6, 411.4, 760.6, 417.6, 758.1, 422.4, 755.4, 422.6, 747.1, 402.9, 737.1, 392.9, 730.4, 390.6, 726.6, 387.6, 720.9, 387.9, 719.6, 391.6, 716.9, 391.4, 716.9, 388.1, 715.9, 387.9, 712.9, 388.9, 712.4, 391.1, 710.4, 391.6, 709.4, 390.6, 710.1, 386.9] }, "52.20": { "L": [585.4, 383.9, 584.6, 387.1, 587.9, 397.1, 591.9, 406.1, 598.4, 415.1, 598.4, 418.6, 596.9, 419.6, 594.1, 419.4, 583.1, 411.9, 577.1, 408.9, 575.4, 408.9, 574.9, 411.1, 578.9, 419.1, 582.9, 424.1, 588.9, 430.1, 595.4, 434.9, 596.6, 436.9, 596.4, 439.6, 594.9, 440.6, 582.1, 437.6, 579.9, 438.4, 580.1, 440.4, 583.1, 444.4, 590.9, 451.1, 609.4, 460.4, 609.6, 462.9, 608.6, 464.4, 599.4, 465.9, 599.1, 468.4, 607.9, 473.1, 618.6, 475.6, 619.6, 477.1, 619.4, 479.9, 614.9, 483.1, 615.1, 485.4, 617.9, 487.1, 629.1, 487.4, 630.9, 488.1, 637.9, 487.4, 639.4, 488.4, 639.9, 491.6, 640.9, 492.4, 646.9, 494.4, 653.1, 494.4, 658.9, 498.4, 665.9, 498.4, 669.1, 501.4, 677.1, 501.4, 680.9, 499.6, 685.6, 499.1, 687.9, 493.6, 691.6, 492.1, 692.4, 490.9, 691.6, 488.9, 688.6, 487.6, 688.4, 482.9, 689.6, 480.9, 693.1, 479.6, 693.1, 470.4, 686.6, 468.1, 677.9, 462.4, 673.4, 457.1, 665.6, 454.6, 661.9, 452.4, 650.1, 439.9, 642.1, 432.9, 624.9, 421.4, 617.6, 415.4, 599.6, 398.1, 587.4, 384.1], "R": [754.4, 324.9, 753.6, 328.1, 756.6, 344.9, 756.6, 373.1, 755.6, 375.9, 755.6, 391.1, 754.6, 396.1, 759.4, 404.9, 761.6, 418.1, 760.1, 422.4, 757.6, 425.4, 752.9, 426.4, 752.6, 433.1, 751.6, 435.9, 751.6, 446.9, 752.9, 448.6, 764.1, 455.6, 768.4, 459.9, 773.4, 466.9, 777.9, 476.6, 779.4, 477.1, 780.1, 474.9, 778.4, 464.9, 776.4, 459.1, 776.6, 456.4, 781.1, 454.6, 782.6, 449.9, 790.9, 445.4, 790.6, 438.1, 797.1, 431.9, 797.1, 430.4, 794.6, 428.6, 794.6, 425.1, 799.1, 419.1, 803.4, 411.1, 802.6, 408.9, 798.1, 408.6, 796.4, 406.9, 802.4, 385.1, 802.4, 382.1, 801.6, 380.9, 800.4, 380.9, 795.9, 385.6, 792.6, 384.6, 792.4, 381.9, 795.4, 367.1, 794.4, 356.1, 793.6, 354.9, 791.4, 355.9, 787.6, 365.4, 785.1, 365.6, 783.6, 364.6, 782.4, 360.1, 782.4, 349.9, 779.1, 335.9, 777.6, 332.9, 775.4, 331.9, 774.6, 333.1, 772.4, 356.6, 770.9, 357.6, 768.4, 357.4, 767.4, 355.9, 766.4, 346.9, 763.1, 335.9, 756.9, 325.6], "M": [705.4, 384.6, 693.4, 388.6, 684.9, 393.6, 675.9, 402.9, 671.4, 411.9, 671.1, 413.4, 675.6, 416.9, 676.9, 420.1, 678.4, 420.9, 683.6, 436.4, 683.6, 442.6, 681.6, 451.6, 679.9, 452.9, 679.1, 456.4, 671.4, 456.6, 664.9, 454.4, 644.4, 435.1, 643.6, 441.6, 649.6, 455.1, 656.9, 462.4, 662.1, 465.4, 667.9, 472.4, 679.4, 479.9, 678.6, 494.6, 679.9, 500.1, 684.1, 502.1, 688.4, 493.4, 695.4, 495.9, 696.6, 503.4, 695.9, 512.9, 700.1, 512.6, 712.6, 525.4, 711.4, 529.1, 705.1, 537.9, 721.4, 545.4, 730.4, 547.4, 732.6, 547.4, 735.6, 545.4, 736.9, 547.1, 739.6, 547.4, 741.4, 543.6, 741.1, 533.9, 732.4, 534.6, 725.4, 533.6, 716.9, 529.4, 716.6, 526.9, 720.6, 526.4, 734.6, 530.4, 741.6, 526.4, 746.9, 538.1, 750.6, 540.4, 751.4, 539.4, 748.6, 537.1, 747.4, 532.6, 748.6, 522.9, 754.1, 523.1, 756.9, 520.6, 763.1, 518.1, 770.4, 511.4, 774.6, 512.4, 784.6, 508.4, 789.1, 511.6, 792.4, 502.6, 793.4, 492.6, 791.6, 493.4, 790.4, 501.1, 787.6, 503.6, 783.9, 503.4, 782.1, 497.9, 778.4, 495.6, 780.4, 484.6, 780.4, 475.4, 778.4, 464.4, 775.4, 456.4, 781.4, 454.4, 774.1, 445.6, 765.4, 438.6, 765.6, 435.9, 771.4, 431.1, 774.4, 424.6, 774.4, 408.4, 769.4, 396.9, 761.1, 388.9, 755.9, 386.9, 754.6, 395.6, 751.1, 397.4, 755.9, 406.1, 759.4, 406.9, 760.6, 409.4, 760.6, 415.6, 758.1, 420.4, 755.4, 420.6, 748.1, 402.9, 745.4, 398.9, 735.1, 389.9, 730.4, 388.6, 726.6, 385.6, 711.4, 386.6, 709.6, 384.6] }, "52.28": { "L": [586.1, 381.6, 584.9, 382.4, 584.6, 384.1, 587.9, 395.1, 592.9, 405.1, 597.4, 411.1, 597.4, 414.6, 595.9, 415.6, 592.1, 415.4, 581.4, 408.1, 577.1, 406.6, 574.9, 407.4, 574.9, 409.1, 580.9, 419.1, 597.6, 435.1, 597.4, 437.6, 595.9, 438.6, 592.9, 438.6, 582.1, 435.6, 580.9, 436.4, 581.9, 440.1, 585.6, 444.9, 592.9, 450.1, 609.4, 458.4, 609.6, 461.1, 608.4, 463.1, 600.1, 463.6, 598.9, 464.4, 598.9, 465.6, 603.9, 469.1, 619.4, 474.4, 619.4, 477.6, 614.9, 480.4, 614.6, 482.1, 615.6, 483.9, 619.9, 485.4, 636.6, 486.6, 638.4, 492.1, 644.9, 493.4, 651.9, 493.4, 655.6, 497.4, 657.9, 498.1, 664.9, 497.4, 667.4, 500.1, 670.9, 499.4, 677.1, 500.1, 681.1, 496.6, 685.6, 496.1, 688.4, 490.1, 688.6, 481.4, 691.6, 480.1, 692.4, 478.9, 692.1, 469.4, 678.9, 462.4, 672.4, 455.1, 666.9, 453.4, 659.9, 449.4, 652.9, 440.6, 643.1, 431.9, 623.9, 418.4, 614.6, 410.4, 599.6, 395.1, 590.1, 383.9, 588.4, 382.1], "R": [754.4, 322.9, 753.6, 325.1, 757.6, 352.9, 757.6, 365.1, 755.6, 374.9, 755.6, 396.1, 753.9, 399.6, 757.4, 400.9, 759.6, 403.6, 760.6, 406.9, 760.6, 419.1, 757.6, 425.4, 752.9, 426.4, 752.6, 433.1, 751.6, 435.9, 751.6, 445.1, 752.6, 446.9, 758.1, 449.6, 766.4, 456.6, 773.4, 465.9, 776.4, 473.1, 778.6, 474.1, 779.4, 470.9, 778.4, 468.1, 778.4, 463.9, 776.4, 458.1, 776.6, 455.4, 780.6, 454.1, 781.9, 449.6, 791.1, 443.6, 790.6, 437.1, 797.4, 430.1, 797.1, 428.4, 794.6, 426.6, 794.6, 423.1, 799.1, 418.1, 803.1, 411.1, 802.6, 407.9, 798.1, 407.6, 796.4, 405.9, 802.4, 385.1, 802.4, 381.1, 801.6, 379.9, 800.4, 379.9, 796.9, 383.6, 794.4, 383.4, 793.4, 381.9, 793.4, 377.9, 795.4, 369.1, 795.4, 355.9, 793.6, 352.9, 791.6, 353.9, 788.4, 363.6, 786.9, 364.6, 783.6, 363.6, 782.4, 345.9, 777.9, 330.6, 776.9, 329.9, 774.9, 330.4, 773.6, 337.9, 773.6, 348.1, 772.4, 352.6, 769.1, 353.6, 767.4, 351.9, 767.4, 348.9, 763.1, 333.9, 758.1, 324.9, 756.4, 323.1], "M": [707.4, 382.6, 699.4, 384.6, 685.9, 390.9, 677.6, 398.9, 671.6, 409.4, 671.9, 412.1, 674.6, 413.9, 678.6, 420.4, 678.4, 422.1, 676.4, 422.6, 673.4, 419.1, 672.6, 419.6, 674.6, 423.4, 676.6, 432.6, 677.6, 433.9, 678.9, 433.4, 678.4, 428.4, 680.6, 427.4, 683.6, 435.4, 682.6, 444.6, 679.1, 454.4, 670.4, 454.6, 667.4, 453.6, 658.9, 448.6, 653.1, 440.9, 643.4, 432.1, 642.6, 436.6, 644.6, 444.6, 650.6, 455.1, 655.9, 460.4, 660.1, 462.6, 668.9, 472.4, 678.4, 477.9, 678.6, 496.6, 682.4, 497.9, 682.1, 500.9, 684.1, 500.1, 688.4, 491.4, 690.4, 491.9, 691.9, 495.1, 695.4, 495.9, 696.6, 508.6, 692.6, 511.1, 696.1, 512.9, 700.1, 511.6, 711.6, 523.4, 711.6, 525.6, 704.9, 537.1, 713.4, 541.4, 726.4, 545.4, 738.6, 545.4, 740.4, 543.6, 741.4, 536.6, 740.1, 532.9, 729.4, 533.6, 725.4, 532.6, 716.9, 528.4, 716.9, 525.6, 720.6, 525.4, 733.4, 529.4, 740.6, 526.4, 743.6, 530.4, 745.9, 537.1, 749.9, 539.9, 750.4, 538.4, 747.6, 536.1, 746.4, 530.6, 747.6, 522.9, 749.4, 521.4, 752.4, 522.9, 764.1, 516.1, 770.4, 510.4, 774.6, 511.4, 781.4, 508.4, 785.6, 508.4, 788.4, 509.9, 792.4, 498.6, 792.1, 492.6, 790.6, 498.6, 786.6, 503.6, 783.6, 503.1, 782.1, 497.9, 778.4, 494.6, 779.4, 470.4, 778.4, 463.4, 775.4, 455.4, 781.4, 453.4, 772.1, 442.6, 765.4, 437.6, 774.4, 423.6, 773.4, 406.4, 769.1, 396.9, 765.4, 391.9, 756.1, 386.1, 755.6, 392.6, 754.4, 395.1, 752.1, 396.1, 755.9, 404.1, 760.6, 406.4, 760.6, 414.6, 758.4, 419.1, 756.4, 419.6, 753.4, 415.6, 751.4, 408.4, 746.1, 397.9, 741.1, 392.6, 733.6, 387.6, 729.9, 387.4, 728.6, 384.6, 721.4, 383.6, 720.4, 387.1, 718.4, 387.6, 717.1, 383.9, 711.4, 384.6, 710.1, 382.9] }, "52.36": { "L": [586.4, 377.9, 585.6, 383.1, 586.9, 388.1, 591.1, 398.4, 597.4, 408.9, 597.4, 412.6, 595.9, 413.6, 593.1, 413.4, 579.1, 403.9, 575.4, 403.9, 574.9, 406.1, 580.9, 416.1, 591.6, 427.1, 598.4, 432.4, 598.6, 434.9, 597.6, 436.4, 593.9, 436.6, 582.1, 431.9, 580.4, 431.9, 579.9, 433.9, 583.9, 440.1, 587.9, 444.1, 596.6, 449.9, 608.4, 455.4, 608.6, 457.9, 607.6, 459.4, 601.1, 459.9, 599.9, 461.1, 599.9, 463.1, 602.9, 466.1, 617.1, 471.6, 617.4, 475.6, 614.1, 477.6, 614.1, 480.4, 616.9, 482.1, 621.9, 483.4, 633.6, 483.6, 634.6, 485.1, 634.4, 491.1, 638.9, 492.4, 650.9, 492.4, 654.1, 496.4, 664.1, 496.4, 666.4, 498.1, 672.1, 497.4, 676.1, 498.4, 680.6, 493.9, 685.6, 493.1, 688.1, 488.1, 688.6, 481.4, 691.6, 480.1, 692.4, 478.9, 691.9, 468.6, 679.9, 462.4, 670.6, 452.6, 659.9, 447.4, 640.1, 426.9, 619.6, 412.4, 603.6, 396.4, 588.9, 378.6], "R": [755.4, 321.9, 754.6, 327.1, 757.6, 345.9, 757.6, 366.1, 755.6, 378.9, 755.6, 394.1, 760.6, 404.9, 760.6, 418.1, 758.4, 424.6, 752.9, 426.4, 751.6, 443.9, 752.9, 445.6, 761.1, 450.6, 766.4, 455.6, 772.4, 463.9, 776.4, 473.1, 778.6, 474.1, 779.4, 470.9, 776.4, 457.1, 776.6, 453.4, 780.6, 452.1, 781.6, 448.4, 782.9, 447.1, 789.1, 444.1, 790.9, 442.4, 790.6, 435.4, 797.1, 428.9, 797.1, 427.4, 794.6, 425.6, 794.6, 422.1, 800.1, 415.1, 803.1, 409.1, 802.6, 405.9, 798.4, 405.4, 797.4, 403.9, 797.6, 398.9, 802.4, 385.1, 802.4, 380.1, 801.6, 378.9, 800.4, 378.9, 798.4, 381.1, 795.1, 381.6, 793.4, 379.9, 795.4, 369.1, 795.4, 353.1, 794.6, 351.9, 793.1, 351.6, 791.4, 352.9, 787.6, 363.4, 785.1, 363.6, 783.6, 362.6, 782.4, 342.9, 777.6, 327.9, 775.4, 326.9, 774.6, 328.1, 773.6, 350.9, 772.6, 352.4, 770.1, 352.6, 768.6, 351.6, 767.6, 349.1, 763.1, 330.9, 760.1, 324.9, 757.4, 322.1], "M": [706.4, 380.6, 694.4, 384.6, 684.9, 389.6, 676.9, 397.9, 671.6, 407.4, 671.9, 410.1, 674.6, 411.9, 679.6, 420.4, 683.6, 435.4, 683.6, 438.6, 678.1, 452.4, 670.4, 452.6, 662.9, 449.4, 658.9, 446.6, 643.4, 430.1, 642.6, 437.6, 644.6, 443.6, 650.6, 454.1, 659.1, 460.6, 669.9, 472.4, 678.4, 477.9, 677.6, 489.6, 678.9, 495.4, 681.4, 492.4, 684.6, 493.9, 686.1, 493.1, 688.4, 487.6, 688.9, 480.6, 691.6, 480.4, 696.4, 482.9, 696.4, 488.1, 692.4, 487.6, 690.6, 489.4, 690.9, 494.1, 695.6, 496.4, 696.6, 503.4, 696.4, 509.1, 692.1, 510.9, 696.4, 512.4, 700.1, 511.6, 710.6, 521.4, 710.6, 524.6, 703.9, 535.1, 716.4, 541.4, 728.4, 544.4, 737.6, 544.4, 740.4, 539.6, 740.4, 533.4, 739.1, 531.9, 733.4, 532.6, 725.4, 531.6, 717.9, 528.4, 716.4, 526.6, 716.9, 524.6, 720.6, 524.4, 731.4, 527.4, 739.6, 525.4, 741.4, 526.9, 745.9, 537.1, 749.4, 538.9, 749.9, 537.6, 746.4, 533.6, 746.4, 521.4, 747.6, 517.9, 750.4, 517.9, 751.6, 522.4, 765.1, 514.1, 770.4, 508.4, 773.4, 510.4, 776.6, 510.4, 783.6, 506.4, 787.9, 508.9, 791.4, 498.6, 792.1, 490.6, 790.9, 491.9, 789.4, 499.1, 785.6, 502.6, 782.6, 501.1, 781.1, 495.9, 778.4, 493.6, 779.4, 470.4, 775.4, 453.4, 780.9, 451.6, 779.4, 448.9, 765.4, 435.6, 771.1, 429.1, 773.4, 424.6, 773.4, 407.4, 771.4, 401.4, 766.4, 392.9, 756.6, 385.6, 755.6, 386.4, 755.4, 393.1, 751.1, 393.1, 756.6, 403.4, 760.6, 404.4, 760.6, 412.6, 758.1, 417.4, 755.4, 417.6, 748.1, 398.9, 741.1, 390.6, 733.6, 385.6, 729.9, 385.4, 729.1, 382.9, 725.6, 381.6, 721.6, 381.6, 721.4, 385.1, 718.4, 385.6, 716.6, 381.6, 711.4, 382.6, 709.6, 380.6] }, "52.44": { "L": [586.4, 375.9, 585.6, 380.1, 586.9, 385.1, 589.9, 393.1, 597.4, 406.1, 597.4, 410.6, 595.9, 411.6, 592.6, 411.1, 582.1, 402.9, 578.1, 400.9, 575.4, 400.9, 574.9, 403.1, 578.9, 411.1, 582.9, 416.1, 590.6, 424.1, 598.4, 430.4, 598.4, 433.6, 596.9, 434.6, 593.9, 434.4, 582.1, 429.9, 579.9, 430.4, 580.9, 434.1, 589.9, 443.1, 600.6, 449.9, 604.4, 450.9, 607.4, 453.4, 607.6, 455.9, 606.6, 457.4, 598.4, 458.9, 597.9, 460.6, 603.6, 464.9, 615.1, 468.6, 617.4, 470.4, 617.4, 473.6, 614.6, 475.1, 613.6, 476.9, 614.9, 479.6, 619.9, 481.4, 626.1, 481.4, 632.6, 482.6, 633.6, 484.1, 632.9, 489.9, 634.1, 491.1, 648.9, 491.4, 652.1, 495.4, 664.1, 494.4, 666.4, 496.1, 672.1, 495.4, 674.9, 496.4, 677.4, 495.9, 681.4, 491.6, 685.6, 491.1, 688.1, 487.1, 688.6, 481.1, 691.4, 477.9, 691.1, 467.4, 679.9, 461.4, 674.6, 456.9, 670.4, 451.1, 662.6, 448.1, 658.6, 445.1, 643.4, 427.9, 619.6, 410.4, 604.6, 395.4, 590.1, 377.9, 588.4, 376.1], "R": [755.4, 319.9, 754.6, 324.1, 757.6, 340.9, 757.6, 366.1, 756.6, 368.9, 755.6, 393.1, 759.1, 398.6, 760.6, 402.9, 760.6, 415.1, 758.4, 423.6, 754.4, 424.9, 753.6, 426.1, 752.6, 429.9, 752.6, 442.9, 753.9, 444.6, 759.1, 447.6, 768.4, 456.9, 774.4, 466.9, 776.9, 474.6, 778.4, 475.1, 779.4, 472.9, 776.4, 457.1, 776.6, 452.4, 780.1, 450.6, 781.6, 446.9, 789.1, 443.1, 790.9, 441.4, 790.6, 434.4, 797.1, 427.9, 797.1, 426.4, 794.6, 424.6, 794.6, 421.1, 798.1, 417.1, 803.4, 408.1, 802.6, 404.9, 798.4, 404.4, 797.4, 402.9, 797.6, 398.9, 802.4, 384.1, 803.1, 377.4, 800.6, 377.1, 797.1, 380.6, 794.4, 380.4, 793.4, 378.9, 796.4, 358.1, 794.6, 349.9, 792.4, 350.9, 790.9, 353.9, 788.4, 362.6, 786.9, 363.6, 783.6, 362.6, 783.4, 344.9, 780.1, 330.9, 778.6, 327.9, 776.1, 326.9, 774.6, 328.9, 774.6, 341.1, 773.6, 343.9, 773.4, 351.6, 771.9, 352.6, 769.4, 352.4, 763.1, 328.9, 760.1, 322.9, 757.4, 320.1], "M": [704.4, 379.6, 695.4, 382.6, 681.9, 390.6, 676.9, 395.9, 671.6, 405.4, 671.1, 407.9, 677.4, 414.9, 680.6, 422.4, 679.9, 424.6, 677.9, 424.4, 675.1, 417.9, 672.6, 416.6, 676.6, 429.6, 677.9, 430.9, 678.6, 425.9, 681.1, 425.6, 683.6, 434.4, 683.6, 437.6, 681.6, 440.4, 678.1, 451.4, 671.4, 451.6, 662.9, 448.4, 657.6, 444.1, 642.4, 427.1, 641.6, 431.6, 642.6, 437.6, 648.6, 450.1, 659.4, 459.9, 664.9, 467.4, 677.4, 475.9, 677.6, 492.6, 678.6, 493.9, 681.4, 491.4, 686.1, 491.1, 688.4, 486.6, 688.9, 480.6, 691.6, 480.4, 696.4, 482.9, 695.4, 487.1, 692.4, 487.6, 690.6, 489.4, 690.9, 494.1, 695.6, 496.4, 696.6, 503.4, 696.4, 508.1, 693.4, 508.6, 691.6, 510.4, 693.6, 511.4, 695.1, 509.4, 697.6, 509.4, 700.1, 510.6, 709.4, 519.9, 709.6, 522.6, 703.1, 533.4, 720.4, 541.4, 730.4, 543.4, 737.6, 543.4, 739.4, 537.6, 739.1, 530.9, 732.4, 531.6, 724.4, 530.6, 717.9, 527.4, 716.4, 525.6, 716.9, 523.6, 720.6, 523.4, 729.4, 526.4, 735.6, 526.4, 736.6, 523.9, 738.6, 523.4, 744.9, 536.1, 747.9, 537.9, 748.4, 536.4, 745.4, 532.6, 745.4, 522.4, 746.9, 517.6, 749.1, 517.6, 750.6, 521.4, 763.1, 514.1, 769.4, 508.4, 776.6, 509.4, 781.4, 506.4, 784.6, 506.4, 786.9, 507.9, 789.4, 502.6, 790.1, 495.4, 787.1, 501.4, 783.4, 501.6, 781.1, 495.9, 777.4, 492.6, 779.4, 472.4, 775.4, 452.4, 780.9, 450.6, 779.4, 447.9, 765.9, 435.4, 772.4, 425.6, 773.4, 408.4, 770.4, 399.4, 767.1, 393.9, 757.6, 385.6, 755.6, 385.6, 755.4, 392.1, 751.9, 392.1, 756.6, 401.4, 760.6, 402.4, 760.6, 411.6, 758.1, 416.4, 755.4, 416.6, 747.1, 395.9, 743.4, 390.9, 737.1, 385.9, 729.9, 383.4, 727.6, 380.6, 722.6, 379.6, 719.6, 383.6, 717.9, 383.4, 716.6, 380.6] }, "48.80": { "L": [678.1, 495.9, 672.9, 500.9, 666.1, 509.6, 660.4, 521.1, 655.1, 526.6, 654.4, 530.6, 647.1, 534.6, 644.6, 538.9, 644.4, 542.6, 638.1, 545.6, 631.4, 545.9, 630.6, 547.1, 631.4, 549.1, 642.1, 548.4, 657.9, 545.1, 661.1, 542.6, 664.9, 542.1, 668.1, 540.1, 669.9, 538.4, 671.4, 534.6, 675.4, 533.9, 683.1, 527.1, 686.9, 522.4, 688.4, 516.9, 683.6, 508.1, 681.1, 497.9, 679.6, 495.9], "R": [730.4, 426.9, 729.6, 428.1, 730.1, 431.4, 745.1, 445.6, 745.9, 450.1, 750.6, 460.9, 759.9, 465.1, 763.6, 465.6, 766.9, 468.4, 775.1, 468.4, 777.9, 470.4, 780.9, 470.6, 783.4, 472.9, 784.9, 475.9, 791.1, 481.1, 793.1, 480.6, 794.4, 476.6, 800.1, 475.6, 799.1, 470.9, 793.1, 460.9, 790.6, 457.9, 786.9, 456.4, 785.9, 452.6, 777.9, 441.6, 773.1, 437.9, 762.1, 432.9, 755.6, 433.1, 753.6, 435.9, 754.6, 447.9, 753.6, 449.4, 751.1, 449.6, 749.1, 448.1, 746.1, 440.9, 742.1, 434.9, 734.1, 427.9], "M": [689.9, 414.9, 681.9, 418.9, 674.9, 425.9, 670.6, 434.4, 668.1, 444.4, 664.6, 446.6, 657.9, 445.9, 658.9, 449.1, 662.4, 451.9, 662.4, 454.1, 659.6, 455.6, 653.6, 455.4, 654.9, 458.1, 661.4, 460.9, 661.6, 462.6, 660.1, 464.1, 660.9, 465.1, 664.1, 465.6, 667.4, 468.9, 671.6, 477.4, 670.6, 480.4, 671.6, 483.1, 678.6, 489.9, 682.6, 489.4, 683.6, 490.4, 682.4, 494.1, 677.9, 495.6, 668.6, 506.4, 670.6, 513.6, 676.9, 525.1, 681.4, 528.9, 687.1, 522.1, 688.4, 518.9, 691.6, 517.4, 693.6, 519.4, 692.9, 524.1, 695.9, 526.6, 699.9, 522.6, 703.1, 522.6, 702.6, 526.6, 707.9, 533.4, 724.4, 542.4, 733.4, 544.4, 748.6, 543.4, 754.4, 541.4, 759.6, 541.4, 763.9, 536.4, 766.6, 535.4, 770.9, 546.1, 773.1, 546.1, 771.4, 542.6, 771.4, 535.4, 773.6, 529.9, 777.1, 529.1, 780.9, 524.6, 786.6, 524.4, 790.4, 521.4, 795.4, 524.9, 799.4, 515.6, 799.1, 513.9, 796.4, 512.6, 796.6, 507.9, 799.9, 507.9, 801.4, 505.6, 799.1, 502.9, 796.9, 503.6, 794.6, 507.4, 794.6, 513.6, 793.1, 516.4, 789.9, 516.4, 785.4, 510.6, 785.4, 498.4, 781.4, 486.4, 786.4, 485.4, 783.4, 478.6, 784.4, 476.4, 786.1, 476.6, 790.9, 481.1, 793.4, 481.4, 789.1, 470.9, 777.1, 458.9, 761.4, 450.1, 754.1, 435.6, 753.6, 441.6, 755.6, 448.6, 754.1, 451.4, 750.9, 451.4, 746.1, 440.9, 741.4, 433.9, 730.6, 425.6, 725.4, 426.6, 723.1, 423.9, 717.6, 422.6, 703.4, 423.6, 692.9, 426.9, 682.9, 433.6, 680.6, 436.4, 680.1, 439.4, 677.9, 439.4, 676.4, 434.4, 682.6, 422.9, 690.6, 415.6] } };

  // ../../src/shots/s17/sil_data.js
  var SIL = { "48.80": [[697.1, 411.6, 695.9, 412.6, 694.1, 412.6, 686.1, 415.6, 677.6, 421.9, 673.6, 427.1, 670.6, 433.1, 670.6, 434.9, 669.6, 436.1, 669.6, 440.9, 668.6, 442.1, 669.1, 444.1, 665.9, 446.6, 662.1, 446.6, 660.9, 445.6, 659.1, 445.6, 657.6, 447.1, 657.6, 448.9, 662.6, 452.9, 662.6, 454.6, 659.6, 456.1, 657.1, 455.6, 653.9, 453.6, 652.1, 453.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 650.9, 456.4, 654.1, 459.4, 660.1, 462.4, 662.9, 462.4, 664.4, 460.9, 663.9, 458.9, 665.1, 458.6, 665.6, 462.9, 663.6, 465.9, 664.6, 467.9, 668.6, 471.1, 668.6, 473.9, 671.6, 478.1, 672.1, 480.4, 670.6, 482.9, 679.1, 491.4, 683.6, 491.4, 684.1, 492.4, 681.9, 494.6, 680.1, 494.6, 678.9, 495.6, 668.6, 507.1, 665.6, 511.1, 665.6, 512.9, 663.6, 515.1, 660.6, 521.9, 654.6, 528.1, 655.1, 530.4, 653.9, 531.6, 652.1, 531.6, 650.1, 534.1, 648.1, 533.6, 646.6, 535.1, 647.1, 537.4, 643.9, 539.6, 642.1, 539.6, 640.6, 541.1, 641.6, 543.9, 639.9, 545.6, 629.1, 546.6, 627.6, 548.9, 629.1, 550.4, 634.9, 551.4, 636.1, 550.4, 643.9, 550.4, 645.1, 549.4, 648.9, 549.4, 650.1, 548.4, 658.9, 547.4, 661.1, 545.4, 663.9, 545.4, 670.1, 541.4, 673.1, 537.4, 674.9, 537.4, 679.1, 533.4, 681.9, 532.4, 689.4, 522.9, 691.1, 519.4, 692.9, 519.4, 694.6, 521.1, 692.6, 524.1, 694.1, 526.4, 695.9, 526.4, 697.1, 527.4, 700.9, 526.4, 704.6, 532.9, 713.1, 539.4, 725.1, 545.4, 726.9, 545.4, 728.1, 546.4, 732.9, 546.4, 734.1, 547.4, 747.9, 547.4, 749.1, 546.4, 760.9, 545.4, 764.1, 542.4, 767.1, 540.9, 770.6, 548.1, 773.1, 550.4, 774.9, 550.4, 776.4, 548.9, 776.4, 546.1, 774.4, 543.9, 773.4, 538.1, 775.4, 534.1, 776.1, 533.4, 777.9, 533.4, 783.6, 525.9, 787.9, 526.4, 792.9, 524.4, 795.1, 525.9, 794.6, 528.9, 796.6, 532.1, 799.1, 534.4, 801.9, 534.4, 803.4, 532.1, 798.9, 526.4, 800.4, 523.9, 800.4, 520.1, 804.4, 514.1, 809.9, 510.4, 811.4, 508.1, 809.9, 506.6, 808.1, 506.6, 807.4, 505.9, 807.4, 503.1, 805.9, 501.6, 799.1, 501.6, 795.6, 504.9, 793.6, 508.1, 793.6, 514.9, 792.4, 516.1, 788.4, 510.9, 788.4, 500.1, 787.4, 498.9, 787.4, 496.1, 786.4, 494.9, 784.9, 488.9, 785.6, 488.4, 787.9, 489.4, 789.4, 487.9, 789.4, 485.1, 788.4, 483.9, 788.9, 481.6, 794.1, 485.4, 796.4, 483.9, 796.4, 480.1, 794.4, 476.6, 794.9, 475.6, 801.1, 481.4, 802.9, 481.4, 804.4, 479.9, 804.4, 478.1, 800.4, 468.1, 791.4, 455.1, 785.4, 449.1, 785.4, 446.1, 784.4, 444.9, 776.9, 438.6, 766.9, 432.6, 765.1, 432.6, 763.9, 431.6, 757.1, 431.6, 755.1, 432.6, 752.6, 436.1, 752.6, 442.9, 754.6, 448.1, 754.6, 449.9, 753.4, 450.6, 752.4, 449.9, 752.4, 448.1, 746.4, 437.1, 738.1, 428.6, 729.9, 423.6, 727.1, 423.6, 725.9, 422.6, 721.1, 422.6, 719.9, 421.6, 704.1, 422.6, 702.9, 423.6, 695.1, 425.6, 682.9, 432.6, 682.4, 431.1, 686.4, 424.1, 690.9, 419.4, 695.1, 416.4, 696.9, 416.4, 698.1, 415.4, 702.9, 415.4, 708.1, 417.4, 711.9, 416.4, 714.1, 418.4, 715.9, 418.4, 717.4, 416.9, 715.9, 414.6, 708.9, 411.6]], "49.12": [[697.1, 411.6, 695.9, 412.6, 694.1, 412.6, 686.1, 415.6, 677.6, 421.9, 673.6, 427.1, 670.6, 433.1, 670.6, 434.9, 669.6, 436.1, 669.6, 440.9, 668.6, 442.1, 668.6, 443.9, 666.9, 445.6, 664.9, 446.6, 658.1, 445.6, 656.6, 447.1, 657.6, 449.1, 662.4, 452.9, 662.6, 453.9, 660.9, 455.6, 655.1, 454.6, 644.9, 449.6, 640.1, 448.6, 636.9, 446.6, 635.1, 446.6, 627.9, 443.6, 626.1, 443.6, 624.6, 445.1, 626.1, 447.4, 628.1, 448.4, 631.9, 448.4, 635.1, 450.4, 642.9, 452.4, 650.9, 456.4, 654.1, 459.4, 658.9, 461.4, 660.1, 462.6, 659.6, 464.9, 663.1, 468.4, 664.9, 468.4, 667.6, 470.1, 667.6, 471.9, 669.6, 475.9, 673.1, 479.6, 670.6, 482.9, 679.1, 491.4, 682.9, 491.4, 683.6, 492.4, 681.9, 494.6, 679.1, 494.6, 677.9, 495.6, 665.6, 508.9, 662.6, 514.9, 658.6, 519.1, 658.6, 520.9, 656.6, 523.9, 653.6, 526.1, 653.6, 529.1, 646.6, 532.9, 645.6, 534.1, 645.6, 535.9, 640.6, 540.1, 641.1, 542.4, 640.1, 543.4, 638.9, 543.1, 639.4, 541.1, 637.1, 539.6, 635.9, 540.6, 631.1, 541.6, 629.6, 543.1, 630.1, 545.1, 627.1, 545.6, 625.6, 547.9, 627.1, 549.4, 629.9, 549.4, 631.1, 550.4, 637.9, 550.4, 639.1, 549.4, 643.9, 549.4, 645.1, 548.4, 648.9, 548.4, 650.1, 547.4, 657.9, 546.4, 662.1, 543.4, 664.9, 543.4, 670.1, 540.4, 672.1, 536.4, 675.9, 535.4, 679.1, 531.4, 680.9, 531.4, 682.1, 530.4, 689.4, 521.9, 689.4, 520.1, 690.1, 519.4, 691.9, 519.4, 693.6, 521.1, 691.6, 524.9, 693.9, 526.4, 696.1, 529.4, 696.9, 529.4, 699.1, 526.4, 700.9, 526.4, 706.1, 534.4, 719.1, 543.4, 721.9, 543.4, 728.1, 546.4, 732.9, 546.4, 734.1, 547.4, 748.9, 547.4, 750.1, 546.4, 754.9, 546.4, 756.1, 545.4, 759.9, 545.4, 766.6, 541.4, 767.6, 542.1, 769.6, 547.1, 773.1, 550.4, 774.9, 550.4, 777.4, 547.1, 774.4, 543.9, 773.4, 538.1, 774.4, 536.1, 778.4, 533.1, 783.6, 525.9, 787.9, 526.4, 792.9, 524.4, 794.6, 526.1, 794.6, 528.9, 796.6, 532.1, 799.1, 534.4, 801.9, 534.4, 803.4, 532.1, 799.4, 526.9, 799.4, 525.1, 800.4, 523.9, 800.4, 520.1, 804.4, 514.1, 809.9, 510.4, 811.4, 508.1, 809.9, 506.6, 808.1, 506.6, 807.4, 505.9, 807.4, 503.1, 805.9, 501.6, 804.1, 501.6, 802.9, 502.6, 799.1, 501.6, 794.6, 506.1, 793.6, 508.1, 793.6, 514.9, 791.9, 516.1, 791.4, 514.1, 788.4, 510.9, 788.4, 501.1, 787.4, 499.9, 787.4, 496.1, 783.4, 485.9, 785.9, 485.4, 787.1, 486.4, 789.9, 486.4, 791.4, 484.9, 791.4, 483.1, 789.4, 479.6, 789.9, 478.6, 796.1, 483.4, 798.1, 482.4, 799.4, 480.1, 796.4, 474.6, 796.9, 473.6, 803.1, 478.4, 805.9, 478.4, 807.4, 476.1, 802.4, 466.1, 798.4, 460.1, 794.4, 454.9, 786.4, 448.1, 784.4, 442.9, 774.9, 435.6, 766.9, 431.6, 765.1, 431.6, 763.9, 430.6, 757.1, 430.6, 752.6, 435.1, 752.6, 442.9, 754.6, 448.1, 754.6, 449.9, 753.4, 450.6, 752.4, 449.9, 752.4, 448.1, 746.4, 437.1, 738.1, 428.6, 732.9, 424.6, 727.1, 423.6, 725.9, 422.6, 722.1, 422.6, 720.9, 421.6, 711.1, 421.6, 709.9, 422.6, 704.1, 422.6, 699.9, 424.6, 697.1, 424.6, 689.1, 428.6, 683.4, 432.6, 682.4, 431.1, 686.4, 424.1, 690.9, 419.4, 695.1, 416.4, 696.9, 416.4, 698.1, 415.4, 702.9, 415.4, 708.1, 417.4, 711.9, 416.4, 714.1, 418.4, 715.9, 418.4, 717.4, 416.9, 715.9, 414.6, 708.9, 411.6]], "49.20": [[697.1, 411.6, 695.9, 412.6, 694.1, 412.6, 686.1, 415.6, 677.6, 421.9, 673.6, 427.1, 670.6, 433.1, 670.6, 434.9, 669.6, 436.1, 669.6, 440.9, 668.6, 442.1, 669.4, 443.9, 668.9, 444.6, 664.9, 446.6, 663.1, 446.6, 661.9, 445.6, 658.1, 445.6, 656.6, 447.1, 657.6, 449.1, 662.4, 452.9, 662.6, 453.9, 660.9, 455.6, 655.1, 454.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 650.9, 456.4, 654.1, 459.4, 657.9, 460.4, 659.6, 461.9, 659.6, 464.9, 663.1, 468.4, 664.9, 468.4, 667.6, 470.1, 667.6, 471.9, 669.6, 475.9, 673.1, 479.6, 670.6, 482.9, 679.1, 492.4, 681.1, 491.4, 682.6, 491.4, 683.1, 492.4, 681.9, 493.6, 678.1, 494.6, 669.6, 502.9, 667.6, 506.1, 663.6, 510.1, 663.6, 511.9, 657.6, 519.1, 657.6, 520.9, 652.6, 525.1, 652.6, 527.9, 651.1, 530.1, 649.1, 529.6, 647.1, 530.6, 644.6, 533.1, 645.1, 535.1, 639.4, 539.1, 636.1, 538.6, 631.1, 540.6, 629.6, 542.1, 630.1, 544.1, 627.1, 544.6, 624.6, 547.9, 626.1, 549.4, 637.9, 549.4, 639.1, 548.4, 643.9, 548.4, 645.1, 547.4, 648.9, 547.4, 650.1, 546.4, 654.9, 546.4, 656.1, 545.4, 658.9, 545.4, 661.1, 543.4, 663.9, 543.4, 670.1, 539.4, 672.1, 535.4, 675.9, 534.4, 679.1, 531.4, 681.9, 530.4, 690.6, 518.9, 693.6, 521.1, 691.6, 524.9, 696.1, 528.4, 699.1, 526.4, 700.9, 526.4, 706.1, 534.4, 719.1, 543.4, 721.9, 543.4, 728.1, 546.4, 732.9, 546.4, 734.1, 547.4, 748.9, 547.4, 750.1, 546.4, 760.9, 545.4, 767.1, 540.9, 769.6, 547.1, 773.1, 550.4, 774.9, 550.4, 776.4, 548.9, 776.4, 546.1, 774.4, 543.9, 773.4, 538.1, 774.4, 536.1, 778.4, 533.1, 783.6, 525.9, 787.9, 526.4, 792.9, 524.4, 794.6, 526.1, 794.6, 528.9, 796.6, 532.1, 799.1, 534.4, 801.9, 534.4, 803.4, 532.1, 799.4, 526.9, 799.4, 525.1, 800.4, 523.9, 800.4, 520.1, 804.4, 514.1, 808.1, 511.4, 810.4, 508.1, 807.4, 505.9, 807.4, 503.1, 805.9, 501.6, 804.1, 501.6, 802.9, 502.6, 799.1, 501.6, 794.6, 506.1, 793.6, 508.1, 793.6, 514.9, 791.9, 516.1, 791.4, 514.1, 788.4, 510.9, 788.4, 501.1, 787.4, 499.9, 787.4, 496.1, 782.9, 484.6, 784.1, 483.4, 785.9, 483.4, 788.1, 485.4, 790.9, 485.4, 792.4, 483.9, 792.4, 482.1, 790.4, 478.6, 790.9, 477.6, 796.1, 481.4, 798.9, 481.4, 800.4, 479.9, 800.4, 478.1, 796.4, 471.6, 796.9, 470.6, 801.1, 474.4, 806.1, 477.4, 808.4, 475.9, 808.4, 474.1, 803.4, 464.1, 795.4, 453.9, 786.4, 446.1, 786.4, 443.1, 785.4, 441.9, 776.9, 435.6, 770.9, 432.6, 769.1, 432.6, 765.9, 430.6, 759.1, 429.6, 755.1, 431.6, 752.6, 434.1, 752.6, 442.9, 754.6, 448.1, 754.6, 449.9, 753.4, 450.6, 752.4, 449.9, 752.4, 448.1, 746.4, 437.1, 738.1, 428.6, 732.9, 424.6, 727.1, 423.6, 725.9, 422.6, 722.1, 422.6, 720.9, 421.6, 712.1, 421.6, 710.9, 422.6, 704.1, 422.6, 699.9, 424.6, 697.1, 424.6, 689.1, 428.6, 683.4, 432.6, 682.4, 431.1, 686.4, 424.1, 690.9, 419.4, 695.1, 416.4, 696.9, 416.4, 698.1, 415.4, 704.9, 415.4, 708.1, 417.4, 711.9, 416.4, 714.1, 418.4, 715.9, 418.4, 717.4, 416.9, 715.9, 414.6, 709.9, 411.6]], "49.28": [[697.1, 411.6, 695.9, 412.6, 693.1, 412.6, 689.9, 414.6, 686.1, 415.6, 677.6, 421.9, 673.6, 427.1, 670.6, 433.1, 670.6, 434.9, 669.6, 436.1, 669.6, 440.9, 668.6, 442.1, 669.4, 444.1, 664.9, 446.6, 659.1, 445.6, 657.6, 447.1, 657.6, 448.9, 662.6, 453.4, 660.9, 455.6, 658.1, 455.6, 656.9, 454.6, 652.1, 453.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 650.9, 456.4, 656.1, 460.4, 657.9, 460.4, 661.1, 462.4, 665.4, 462.1, 664.4, 464.1, 662.1, 463.6, 660.6, 465.9, 663.1, 468.4, 664.9, 468.4, 667.6, 470.1, 667.6, 471.9, 672.1, 479.6, 670.6, 482.1, 671.6, 484.1, 676.6, 488.9, 679.1, 492.4, 681.1, 491.4, 682.6, 491.4, 683.1, 492.4, 681.9, 493.6, 679.1, 493.6, 674.9, 496.6, 662.6, 508.9, 661.6, 510.1, 661.6, 511.9, 656.6, 517.1, 655.6, 520.9, 651.6, 524.1, 651.6, 526.9, 649.9, 528.6, 647.1, 528.6, 640.6, 532.9, 639.6, 534.1, 639.6, 537.9, 641.6, 540.1, 640.9, 541.6, 638.4, 541.6, 638.4, 539.1, 636.9, 537.6, 634.1, 537.6, 630.9, 539.6, 629.1, 539.6, 627.6, 541.1, 627.6, 543.6, 623.1, 544.6, 621.6, 546.9, 623.1, 548.4, 638.9, 548.4, 640.1, 547.4, 643.9, 547.4, 645.1, 546.4, 649.9, 546.4, 651.1, 545.4, 658.9, 544.4, 662.1, 541.4, 665.9, 541.4, 668.9, 539.4, 671.4, 536.9, 671.4, 535.1, 673.1, 533.4, 674.9, 533.4, 678.1, 530.4, 679.9, 530.4, 681.1, 529.4, 684.4, 525.9, 686.4, 521.9, 689.6, 518.9, 693.6, 521.1, 694.6, 523.1, 693.6, 526.9, 695.1, 528.4, 696.9, 528.4, 699.1, 526.4, 700.9, 526.4, 701.6, 527.1, 701.6, 528.9, 706.1, 534.4, 719.1, 543.4, 721.9, 543.4, 728.1, 546.4, 732.9, 546.4, 734.1, 547.4, 748.9, 547.4, 750.1, 546.4, 760.9, 545.4, 767.1, 540.9, 769.6, 547.1, 773.1, 550.4, 774.9, 550.4, 776.4, 548.9, 776.4, 546.1, 774.4, 543.9, 773.4, 538.1, 774.4, 536.1, 778.4, 533.1, 783.6, 525.9, 787.9, 526.4, 792.9, 524.4, 795.1, 525.9, 794.6, 528.9, 796.6, 532.1, 799.1, 534.4, 801.9, 534.4, 803.4, 532.1, 799.4, 526.9, 799.4, 525.1, 800.4, 523.9, 800.4, 520.1, 804.4, 514.1, 808.1, 511.4, 810.4, 508.1, 807.4, 505.9, 807.4, 503.1, 805.9, 501.6, 804.1, 501.6, 802.9, 502.6, 799.1, 501.6, 794.6, 506.1, 793.6, 508.1, 793.6, 514.9, 791.9, 515.4, 788.4, 510.9, 788.4, 501.1, 787.4, 499.9, 787.4, 496.1, 784.4, 489.9, 783.4, 485.1, 781.9, 483.4, 782.4, 482.4, 783.9, 482.4, 785.6, 480.9, 789.1, 483.4, 791.9, 483.4, 793.4, 481.9, 793.4, 479.1, 791.4, 476.6, 791.9, 475.6, 798.1, 479.4, 799.9, 479.4, 801.4, 477.9, 801.4, 475.1, 797.6, 470.1, 797.9, 468.6, 806.1, 474.4, 807.9, 474.4, 809.4, 472.9, 809.4, 470.1, 808.4, 468.1, 800.4, 456.9, 792.1, 448.6, 786.4, 444.1, 786.4, 441.1, 784.9, 439.6, 782.1, 438.6, 776.9, 434.6, 775.1, 434.6, 769.9, 431.6, 767.1, 431.6, 762.9, 429.6, 758.1, 429.6, 756.1, 430.6, 753.6, 432.9, 751.6, 436.1, 751.6, 437.9, 752.6, 439.1, 752.6, 442.9, 754.6, 448.1, 754.6, 449.9, 753.6, 450.6, 752.4, 449.9, 752.4, 448.1, 745.4, 435.9, 736.9, 427.6, 732.9, 424.6, 731.1, 424.6, 729.9, 423.6, 722.1, 422.6, 720.9, 421.6, 712.1, 421.6, 710.9, 422.6, 704.1, 422.6, 699.9, 424.6, 697.1, 424.6, 689.1, 428.6, 683.4, 432.6, 682.4, 431.1, 686.4, 424.1, 690.9, 419.4, 695.1, 416.4, 696.9, 416.4, 698.1, 415.4, 702.9, 415.4, 708.1, 417.4, 711.9, 416.4, 714.1, 418.4, 715.9, 418.4, 717.4, 416.9, 715.9, 414.6, 709.9, 411.6]], "49.36": [[697.1, 411.6, 695.9, 412.6, 694.1, 412.6, 686.1, 415.6, 677.6, 421.9, 673.6, 427.1, 670.6, 433.1, 670.6, 434.9, 669.6, 436.1, 669.6, 440.9, 668.6, 442.1, 669.4, 444.1, 664.9, 446.6, 659.1, 445.6, 657.6, 447.1, 657.6, 448.9, 658.6, 450.1, 662.6, 453.1, 661.1, 455.6, 657.1, 455.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 650.9, 456.4, 654.1, 459.4, 657.9, 460.4, 661.6, 462.9, 664.4, 460.9, 663.9, 458.9, 665.4, 458.9, 665.6, 462.9, 663.6, 465.9, 664.6, 467.9, 667.6, 470.1, 667.6, 471.9, 669.6, 475.9, 673.1, 479.6, 670.6, 482.9, 677.9, 490.4, 679.1, 491.4, 681.6, 490.4, 682.6, 491.1, 682.6, 492.6, 679.1, 492.6, 673.9, 496.6, 669.1, 501.6, 665.9, 503.6, 656.6, 515.1, 655.6, 517.9, 650.6, 522.1, 650.6, 524.9, 648.9, 526.6, 647.1, 526.6, 641.9, 529.6, 639.6, 532.1, 639.6, 534.6, 637.9, 535.6, 633.1, 534.6, 630.9, 537.6, 627.1, 538.6, 625.6, 540.1, 625.6, 542.6, 622.1, 542.6, 620.6, 544.1, 620.6, 545.9, 622.1, 547.4, 636.9, 547.4, 638.1, 546.4, 643.9, 546.4, 645.1, 545.4, 653.9, 544.4, 656.1, 542.4, 658.9, 542.4, 661.1, 540.4, 663.9, 540.4, 668.4, 536.9, 668.4, 534.4, 669.9, 534.4, 673.1, 531.4, 674.9, 531.4, 678.1, 528.4, 679.9, 528.4, 681.1, 527.4, 688.1, 518.4, 689.9, 518.4, 694.1, 521.6, 693.6, 525.9, 692.6, 527.1, 694.1, 529.4, 696.9, 528.4, 699.1, 526.4, 700.9, 526.4, 701.6, 527.1, 701.6, 528.9, 708.9, 536.4, 719.1, 543.4, 721.9, 543.4, 725.1, 545.4, 726.9, 545.4, 728.1, 546.4, 731.9, 546.4, 733.1, 547.4, 747.9, 547.4, 749.1, 546.4, 754.9, 546.4, 756.1, 545.4, 759.9, 545.4, 767.1, 540.9, 769.6, 547.1, 773.1, 550.4, 774.9, 550.4, 776.4, 548.9, 776.4, 546.1, 774.4, 543.9, 774.4, 542.1, 773.4, 540.9, 773.4, 537.1, 778.4, 533.1, 781.4, 528.1, 783.6, 525.9, 787.9, 526.4, 792.9, 524.4, 795.1, 525.9, 794.6, 528.9, 796.6, 532.1, 799.1, 534.4, 801.9, 534.4, 803.4, 532.1, 798.9, 526.4, 800.4, 523.9, 800.4, 520.1, 804.4, 514.1, 808.1, 511.4, 810.4, 508.1, 807.4, 505.9, 807.4, 503.1, 805.9, 501.6, 804.1, 501.6, 802.9, 502.6, 799.1, 501.6, 794.6, 506.1, 793.6, 508.1, 793.6, 514.9, 791.9, 516.1, 791.4, 514.1, 788.4, 510.9, 788.4, 501.1, 787.4, 499.9, 787.4, 496.1, 786.4, 494.9, 784.4, 487.1, 781.4, 482.4, 785.4, 479.9, 784.4, 477.6, 784.9, 476.6, 789.1, 480.4, 791.1, 481.4, 793.9, 481.4, 795.4, 479.9, 795.4, 477.1, 793.4, 474.9, 793.9, 473.4, 799.1, 476.4, 802.9, 476.4, 804.4, 474.1, 800.4, 468.9, 799.6, 467.1, 800.1, 466.4, 809.1, 471.4, 811.4, 469.9, 811.4, 467.1, 810.4, 465.1, 802.4, 454.9, 791.9, 445.6, 788.1, 443.6, 786.4, 441.9, 786.4, 439.1, 784.9, 437.6, 777.9, 433.6, 773.1, 432.6, 769.9, 430.6, 763.1, 429.6, 761.9, 428.6, 757.1, 429.6, 751.6, 435.1, 751.6, 438.9, 753.6, 444.1, 754.1, 449.1, 753.4, 449.6, 746.4, 437.1, 738.1, 428.6, 729.9, 423.6, 727.1, 423.6, 725.9, 422.6, 722.1, 422.6, 720.9, 421.6, 712.1, 421.6, 710.9, 422.6, 704.1, 422.6, 699.9, 424.6, 697.1, 424.6, 682.9, 432.6, 682.4, 431.1, 686.4, 424.1, 690.9, 419.4, 695.1, 416.4, 696.9, 416.4, 698.1, 415.4, 705.9, 415.4, 708.1, 417.4, 711.9, 416.4, 714.1, 418.4, 715.9, 418.4, 717.4, 416.9, 715.9, 414.6, 709.9, 411.6]], "49.44": [[697.1, 411.6, 695.9, 412.6, 694.1, 412.6, 686.1, 415.6, 681.9, 418.6, 674.6, 425.9, 669.6, 435.1, 669.6, 438.9, 668.6, 440.1, 668.6, 442.9, 669.4, 444.1, 665.9, 446.6, 662.1, 446.6, 660.9, 445.6, 659.1, 445.6, 657.6, 447.1, 657.6, 448.9, 658.6, 450.1, 662.6, 453.1, 661.1, 455.6, 657.1, 455.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 650.9, 456.4, 654.1, 459.4, 657.9, 460.4, 661.6, 462.9, 664.4, 460.9, 663.9, 458.9, 665.4, 458.9, 665.6, 462.9, 663.6, 465.9, 664.6, 467.9, 667.6, 470.1, 667.6, 471.9, 669.6, 475.9, 673.1, 479.6, 670.6, 482.9, 677.9, 490.4, 679.1, 491.4, 681.6, 490.4, 682.6, 491.1, 682.6, 492.6, 678.1, 492.6, 674.9, 495.6, 671.1, 497.6, 659.6, 507.9, 655.6, 514.9, 647.6, 521.1, 648.1, 523.4, 647.1, 524.6, 642.1, 526.6, 639.1, 530.1, 637.1, 529.6, 635.1, 532.4, 633.1, 531.6, 627.9, 536.6, 625.1, 537.6, 623.6, 539.1, 623.6, 541.6, 620.1, 541.6, 618.1, 542.6, 616.6, 544.9, 618.1, 546.4, 624.9, 546.4, 626.1, 547.4, 628.9, 547.4, 630.1, 546.4, 635.9, 546.4, 639.6, 544.9, 642.9, 545.4, 644.1, 544.4, 647.9, 544.4, 650.6, 542.9, 652.9, 543.4, 656.1, 541.4, 658.9, 541.4, 662.1, 538.4, 664.9, 538.4, 666.1, 537.4, 667.4, 535.9, 666.9, 533.9, 669.9, 533.4, 673.1, 529.4, 675.9, 529.4, 679.1, 526.4, 680.9, 526.4, 684.4, 522.9, 684.4, 521.1, 685.4, 519.9, 688.6, 517.9, 691.1, 520.4, 693.9, 520.4, 694.6, 521.4, 693.6, 523.1, 693.6, 525.9, 692.6, 527.1, 694.1, 529.4, 698.1, 526.4, 700.9, 526.4, 701.6, 527.1, 701.6, 528.9, 708.9, 536.4, 719.1, 543.4, 721.9, 543.4, 725.1, 545.4, 732.9, 546.4, 734.1, 547.4, 747.9, 547.4, 749.1, 546.4, 754.9, 546.4, 757.1, 544.4, 759.9, 545.4, 767.1, 540.9, 767.6, 543.9, 769.6, 547.1, 773.1, 550.4, 774.9, 550.4, 776.4, 548.9, 776.4, 546.1, 772.9, 541.4, 773.4, 537.1, 778.4, 533.1, 781.4, 528.1, 783.6, 525.9, 787.9, 526.4, 789.1, 525.4, 793.9, 524.4, 795.1, 525.6, 794.6, 528.9, 795.6, 530.9, 799.1, 534.4, 801.9, 534.4, 803.4, 532.1, 799.4, 527.9, 798.9, 526.4, 800.4, 523.9, 800.4, 520.1, 804.4, 514.1, 808.1, 511.4, 810.4, 508.1, 807.4, 505.9, 807.4, 503.1, 805.9, 501.6, 804.1, 501.6, 802.9, 502.6, 799.1, 501.6, 794.6, 506.1, 793.6, 508.1, 793.6, 514.9, 791.9, 516.1, 791.4, 514.1, 788.4, 510.9, 788.4, 501.1, 787.4, 499.9, 787.4, 496.1, 786.4, 494.9, 784.4, 487.1, 781.4, 482.9, 780.4, 479.9, 783.9, 479.4, 785.4, 477.9, 785.9, 474.4, 786.9, 474.4, 792.1, 478.4, 795.9, 478.4, 797.4, 476.1, 794.4, 471.9, 793.6, 470.1, 794.1, 469.4, 801.1, 473.4, 804.9, 473.4, 806.4, 471.1, 804.4, 467.9, 799.6, 462.9, 800.6, 462.4, 802.9, 463.4, 807.1, 466.4, 812.9, 467.4, 814.4, 465.1, 810.4, 458.9, 800.1, 448.6, 793.9, 443.6, 787.9, 440.6, 786.4, 438.9, 786.4, 437.1, 784.9, 435.6, 783.1, 435.6, 778.9, 432.6, 777.1, 432.6, 766.9, 428.6, 758.1, 428.6, 754.9, 430.6, 751.6, 434.1, 751.6, 439.9, 753.6, 445.1, 753.1, 449.1, 746.4, 437.1, 738.1, 428.6, 729.9, 423.6, 727.1, 423.6, 725.9, 422.6, 722.1, 422.6, 720.9, 421.6, 712.1, 421.6, 710.9, 422.6, 704.1, 422.6, 699.9, 424.6, 697.1, 424.6, 689.1, 428.6, 683.4, 432.6, 682.4, 431.1, 685.4, 425.1, 690.9, 419.4, 695.1, 416.4, 696.9, 416.4, 698.1, 415.4, 706.9, 415.4, 709.1, 417.4, 711.9, 416.4, 715.1, 418.4, 717.4, 416.9, 715.9, 414.6, 709.9, 411.6]], "49.52": [[697.1, 411.6, 695.9, 412.6, 693.1, 412.6, 689.9, 414.6, 688.1, 414.6, 684.1, 416.6, 677.6, 421.9, 670.6, 432.1, 670.6, 433.9, 669.6, 435.1, 669.6, 440.9, 668.6, 442.1, 669.4, 444.1, 664.9, 446.6, 659.1, 445.6, 657.6, 447.1, 657.6, 448.9, 658.6, 450.1, 662.6, 453.1, 661.1, 455.6, 657.1, 455.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 650.9, 456.4, 654.1, 459.4, 657.9, 460.4, 661.6, 462.9, 664.4, 460.9, 663.9, 458.9, 665.4, 458.9, 665.6, 462.9, 663.6, 465.9, 664.6, 467.9, 667.6, 470.1, 667.6, 471.9, 669.6, 475.9, 673.1, 479.6, 670.6, 482.9, 677.6, 489.9, 678.1, 491.4, 673.9, 494.6, 671.1, 495.6, 664.9, 500.6, 661.9, 504.6, 660.1, 504.6, 656.1, 507.6, 652.6, 513.1, 644.6, 519.1, 645.1, 521.4, 644.1, 523.1, 642.1, 522.6, 638.9, 525.6, 637.1, 525.6, 630.1, 529.6, 625.9, 533.6, 624.1, 533.6, 620.1, 535.6, 618.6, 537.1, 619.1, 539.1, 615.1, 540.6, 613.6, 542.9, 615.1, 544.4, 617.9, 544.4, 619.1, 545.4, 629.9, 545.4, 631.1, 544.4, 635.9, 544.4, 639.1, 542.4, 643.9, 542.4, 645.1, 541.4, 653.9, 540.4, 657.1, 538.4, 658.9, 538.4, 661.1, 536.4, 663.9, 536.4, 666.4, 533.9, 666.4, 532.1, 667.1, 531.4, 668.9, 531.4, 670.1, 530.4, 673.1, 526.4, 676.9, 526.4, 679.1, 523.4, 681.1, 522.4, 686.1, 517.4, 689.1, 519.4, 691.9, 519.4, 695.1, 521.9, 693.6, 524.1, 693.6, 525.9, 695.1, 527.4, 700.9, 526.4, 701.6, 527.1, 701.6, 528.9, 706.1, 534.4, 719.1, 543.4, 721.9, 543.4, 728.1, 546.4, 732.9, 546.4, 734.1, 547.4, 747.9, 547.4, 749.1, 546.4, 754.9, 546.4, 757.1, 544.4, 759.9, 545.4, 767.1, 540.9, 767.6, 543.9, 769.6, 547.1, 773.1, 550.4, 774.9, 550.4, 776.4, 548.9, 776.4, 546.1, 773.4, 541.9, 773.4, 537.1, 778.4, 533.1, 783.4, 525.4, 785.1, 526.4, 787.9, 526.4, 789.1, 525.4, 793.9, 524.4, 795.1, 525.6, 794.6, 528.9, 795.6, 530.9, 799.1, 534.4, 801.9, 534.4, 803.4, 532.1, 798.9, 526.4, 800.4, 523.9, 800.4, 520.1, 804.4, 514.1, 809.9, 510.4, 811.4, 508.1, 809.9, 506.6, 808.1, 506.6, 807.4, 505.9, 807.4, 503.1, 805.9, 501.6, 799.1, 501.6, 794.6, 506.1, 793.6, 508.1, 793.6, 514.9, 791.9, 516.1, 791.4, 514.1, 788.4, 510.9, 788.4, 501.1, 787.4, 499.9, 787.4, 496.1, 786.4, 494.9, 784.4, 487.1, 781.4, 482.9, 779.4, 477.9, 782.9, 477.4, 785.1, 475.4, 786.9, 475.4, 788.4, 473.9, 788.9, 471.4, 796.1, 475.4, 797.9, 475.4, 800.4, 472.1, 794.6, 466.1, 795.1, 465.4, 803.1, 468.4, 806.9, 468.4, 808.4, 466.9, 808.4, 465.1, 806.4, 462.1, 801.9, 457.9, 802.6, 457.4, 810.1, 461.4, 814.9, 462.4, 816.4, 460.9, 816.4, 458.1, 815.4, 456.9, 802.9, 445.6, 796.9, 441.6, 785.1, 435.6, 781.9, 431.6, 780.1, 431.6, 776.9, 429.6, 770.1, 428.6, 768.9, 427.6, 758.1, 427.6, 752.6, 432.1, 751.6, 434.1, 751.6, 439.9, 753.6, 445.1, 753.1, 449.1, 746.4, 437.1, 738.1, 428.6, 732.9, 424.6, 727.1, 423.6, 725.9, 422.6, 722.1, 422.6, 720.9, 421.6, 712.1, 421.6, 710.9, 422.6, 704.1, 422.6, 699.9, 424.6, 697.1, 424.6, 689.1, 428.6, 683.4, 432.6, 682.4, 431.1, 685.4, 425.1, 689.1, 420.4, 695.1, 416.4, 696.9, 416.4, 698.1, 415.4, 703.9, 415.4, 708.1, 417.4, 711.9, 416.4, 714.1, 418.4, 715.9, 418.4, 717.4, 416.9, 714.9, 413.6, 713.1, 413.6, 708.9, 411.6]], "49.64": [[697.1, 411.6, 695.9, 412.6, 693.1, 412.6, 689.9, 414.6, 688.1, 414.6, 684.1, 416.6, 677.6, 421.9, 670.6, 432.1, 670.6, 433.9, 669.6, 435.1, 669.6, 440.9, 668.6, 442.1, 669.4, 444.1, 665.9, 446.6, 659.1, 445.6, 657.6, 447.1, 657.6, 448.9, 662.6, 453.4, 661.1, 455.6, 659.6, 456.1, 656.9, 454.6, 652.1, 453.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 650.9, 456.4, 654.1, 459.4, 657.9, 460.4, 661.1, 462.4, 662.9, 462.4, 664.4, 460.9, 663.9, 458.9, 665.4, 458.9, 665.6, 462.9, 663.6, 465.9, 664.6, 467.9, 667.6, 470.1, 667.6, 471.9, 671.6, 478.1, 672.1, 480.4, 670.6, 482.9, 676.6, 488.9, 677.6, 490.1, 677.4, 491.1, 664.9, 498.6, 662.6, 501.1, 662.1, 504.4, 659.1, 503.6, 654.1, 506.6, 649.1, 512.6, 645.6, 514.9, 644.6, 516.1, 644.6, 517.9, 641.9, 520.6, 640.1, 520.6, 627.1, 527.6, 621.9, 532.6, 615.1, 534.6, 613.6, 536.1, 614.1, 538.1, 611.6, 539.9, 610.6, 541.9, 612.1, 543.4, 615.9, 543.4, 617.1, 544.4, 624.9, 544.4, 626.1, 543.4, 633.9, 543.4, 638.1, 541.4, 643.9, 541.4, 645.1, 540.4, 652.9, 539.4, 660.9, 535.4, 662.4, 533.9, 661.4, 531.6, 661.9, 530.9, 664.9, 531.4, 667.1, 529.4, 668.9, 529.4, 673.4, 524.4, 675.9, 525.4, 682.9, 518.4, 685.6, 516.9, 688.1, 519.4, 691.9, 519.4, 693.6, 521.1, 692.6, 523.1, 692.6, 526.9, 694.1, 528.4, 698.1, 526.4, 700.9, 526.4, 701.6, 527.1, 701.6, 528.9, 706.1, 534.4, 719.1, 543.4, 721.9, 543.4, 728.1, 546.4, 732.9, 546.4, 734.1, 547.4, 747.9, 547.4, 749.1, 546.4, 754.9, 546.4, 756.1, 545.4, 759.9, 545.4, 767.1, 540.9, 767.6, 543.9, 770.6, 549.1, 772.1, 550.4, 774.9, 550.4, 776.4, 548.9, 776.4, 547.1, 774.4, 544.9, 774.4, 543.1, 772.9, 541.4, 773.4, 537.1, 778.4, 533.1, 783.6, 525.9, 787.9, 526.4, 792.9, 524.4, 795.1, 525.9, 794.6, 528.9, 796.6, 532.1, 799.1, 534.4, 801.9, 534.4, 803.4, 532.1, 798.9, 526.4, 800.4, 523.9, 800.4, 521.1, 804.4, 514.1, 809.9, 510.4, 811.4, 508.1, 809.9, 506.6, 808.1, 506.6, 807.4, 505.9, 807.4, 503.1, 805.9, 501.6, 800.1, 501.6, 796.9, 503.6, 794.6, 506.1, 794.6, 507.9, 793.6, 509.1, 793.6, 515.9, 791.9, 516.4, 791.4, 514.1, 788.4, 510.9, 788.4, 501.1, 787.4, 499.9, 787.4, 496.1, 786.4, 494.9, 784.4, 487.1, 781.4, 482.9, 778.4, 476.4, 779.1, 475.4, 783.9, 475.4, 786.4, 472.4, 788.9, 473.4, 791.4, 470.9, 790.6, 469.1, 791.1, 468.4, 797.1, 471.4, 800.9, 471.4, 802.4, 469.9, 802.4, 468.1, 797.6, 463.1, 798.1, 462.4, 800.1, 463.4, 803.9, 463.4, 805.1, 464.4, 809.9, 464.4, 811.4, 462.9, 811.4, 461.1, 810.4, 459.9, 803.9, 453.9, 804.6, 453.4, 815.1, 457.4, 816.9, 457.4, 819.4, 454.9, 818.4, 452.9, 809.9, 445.6, 798.9, 438.6, 787.1, 433.6, 783.9, 430.6, 779.9, 428.6, 775.1, 428.6, 770.9, 426.6, 760.1, 426.6, 758.9, 427.6, 757.1, 427.6, 751.6, 433.1, 751.6, 440.9, 753.6, 445.1, 753.1, 449.1, 746.4, 437.1, 738.1, 428.6, 732.9, 424.6, 727.1, 423.6, 725.9, 422.6, 722.1, 422.6, 720.9, 421.6, 712.1, 421.6, 710.9, 422.6, 704.1, 422.6, 699.9, 424.6, 697.1, 424.6, 682.9, 432.6, 682.4, 431.1, 685.4, 425.1, 691.9, 418.4, 695.1, 416.4, 696.9, 416.4, 698.1, 415.4, 706.9, 415.4, 709.1, 417.4, 711.9, 416.4, 714.1, 418.4, 715.9, 418.4, 717.4, 416.9, 715.9, 414.6, 709.9, 411.6]], "49.72": [[702.1, 410.6, 700.9, 411.6, 697.1, 411.6, 695.9, 412.6, 690.1, 413.6, 681.1, 418.6, 676.6, 422.9, 670.6, 432.1, 670.6, 433.9, 669.6, 435.1, 669.6, 440.9, 668.6, 442.1, 669.4, 444.1, 664.9, 446.6, 659.1, 445.6, 657.6, 447.1, 657.6, 448.9, 658.6, 450.1, 662.6, 453.1, 661.1, 455.6, 659.6, 456.1, 656.9, 454.6, 652.1, 453.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 650.9, 456.4, 654.1, 459.4, 657.9, 460.4, 661.6, 462.9, 664.4, 460.9, 663.9, 458.9, 665.4, 458.9, 665.6, 462.9, 663.6, 465.9, 664.6, 467.9, 667.6, 470.1, 667.6, 471.9, 669.6, 475.9, 673.4, 479.9, 670.6, 482.1, 670.6, 482.9, 676.6, 489.6, 672.9, 492.6, 669.1, 493.6, 663.6, 497.9, 662.6, 499.1, 662.1, 504.4, 661.1, 504.6, 659.9, 503.6, 654.1, 503.6, 651.1, 505.6, 647.9, 509.6, 644.9, 511.6, 641.1, 512.6, 639.6, 514.1, 639.6, 517.9, 638.9, 518.6, 636.1, 518.6, 627.1, 523.6, 624.9, 525.6, 623.1, 525.6, 616.9, 529.6, 610.1, 531.6, 608.6, 533.1, 608.6, 534.9, 610.1, 536.4, 612.1, 536.9, 609.6, 539.1, 611.1, 541.4, 620.9, 542.4, 622.1, 541.4, 630.9, 541.4, 632.1, 540.4, 634.9, 540.4, 638.1, 538.4, 640.9, 538.4, 643.1, 540.4, 645.1, 539.4, 647.9, 539.4, 651.1, 537.4, 652.9, 537.4, 655.1, 535.4, 657.9, 535.4, 661.4, 531.9, 661.4, 528.4, 664.9, 528.4, 667.1, 526.4, 670.9, 525.4, 673.1, 522.4, 676.9, 521.4, 683.1, 516.4, 684.9, 516.4, 688.1, 519.4, 690.9, 519.4, 692.6, 521.1, 692.6, 525.9, 691.6, 527.9, 693.1, 529.4, 693.9, 529.4, 696.1, 526.4, 699.9, 526.4, 701.6, 529.1, 708.9, 536.4, 719.1, 543.4, 721.9, 543.4, 724.1, 545.4, 726.9, 545.4, 728.1, 546.4, 731.9, 546.4, 733.1, 547.4, 738.9, 547.4, 740.1, 548.4, 741.9, 548.4, 743.1, 547.4, 747.9, 547.4, 749.1, 546.4, 754.9, 546.4, 756.1, 545.4, 759.9, 545.4, 767.1, 540.9, 767.6, 543.9, 770.6, 549.1, 772.1, 550.4, 774.9, 550.4, 776.4, 548.9, 776.4, 547.1, 772.4, 540.9, 773.4, 537.1, 778.4, 533.1, 781.4, 528.1, 783.6, 525.9, 787.9, 526.4, 792.9, 524.4, 795.4, 525.9, 794.6, 528.9, 797.9, 533.4, 799.1, 534.4, 801.9, 534.4, 803.4, 532.9, 798.9, 525.6, 800.4, 523.9, 800.4, 521.1, 804.4, 514.1, 809.9, 510.4, 811.4, 508.1, 809.9, 506.6, 808.1, 506.6, 807.4, 505.9, 807.4, 503.1, 805.9, 501.6, 803.9, 502.6, 800.1, 501.6, 796.9, 503.6, 794.6, 506.1, 794.6, 507.9, 793.6, 509.1, 793.6, 515.9, 792.6, 516.6, 791.4, 515.9, 791.4, 514.1, 788.4, 510.9, 788.4, 501.1, 787.4, 499.9, 787.4, 496.1, 786.4, 494.9, 784.4, 487.1, 778.4, 476.9, 778.4, 474.1, 779.1, 473.4, 785.9, 473.4, 787.4, 471.9, 786.6, 468.9, 790.9, 468.4, 792.4, 466.9, 790.6, 464.1, 791.1, 463.4, 798.1, 466.4, 802.9, 466.4, 804.4, 464.9, 804.4, 462.1, 801.9, 459.6, 799.1, 458.4, 799.1, 457.4, 802.9, 457.4, 804.1, 458.4, 811.9, 458.4, 814.4, 455.9, 810.9, 451.6, 807.1, 450.6, 804.9, 448.9, 807.9, 448.4, 813.1, 450.4, 819.9, 450.4, 821.4, 448.9, 820.4, 446.9, 815.9, 442.6, 813.1, 441.6, 810.9, 439.6, 809.1, 439.6, 794.9, 432.6, 787.1, 430.6, 785.1, 429.6, 782.9, 426.6, 779.1, 426.6, 777.9, 425.6, 769.1, 425.6, 767.9, 424.6, 766.1, 424.6, 764.9, 425.6, 760.1, 425.6, 754.9, 428.6, 750.6, 434.1, 750.6, 437.9, 751.6, 439.1, 751.6, 441.9, 753.6, 446.1, 753.1, 449.1, 750.4, 444.9, 749.4, 441.1, 743.4, 432.9, 732.9, 424.6, 730.9, 423.6, 728.1, 423.6, 726.9, 422.6, 722.1, 422.6, 720.9, 421.6, 709.1, 421.6, 707.9, 422.6, 704.1, 422.6, 699.9, 424.6, 694.1, 425.6, 682.9, 432.4, 682.4, 431.4, 683.4, 429.1, 688.4, 420.9, 697.1, 415.4, 706.9, 415.4, 709.1, 417.4, 711.9, 416.4, 714.1, 418.4, 715.9, 418.4, 717.4, 416.9, 714.9, 413.6, 713.1, 413.6, 709.9, 411.6, 705.1, 411.6, 703.9, 410.6]], "49.80": [[701.1, 410.6, 699.9, 411.6, 696.1, 411.6, 694.9, 412.6, 687.1, 414.6, 681.1, 418.6, 676.6, 422.9, 670.6, 432.1, 670.6, 433.9, 669.6, 435.1, 669.6, 438.9, 668.6, 440.1, 669.1, 444.1, 664.9, 446.6, 659.1, 445.6, 657.6, 447.1, 658.6, 449.1, 663.1, 452.9, 661.1, 455.6, 659.6, 456.1, 656.9, 454.6, 652.1, 453.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 650.9, 456.4, 654.1, 459.4, 657.9, 460.4, 661.6, 462.9, 663.9, 461.6, 664.6, 462.1, 663.6, 465.9, 664.6, 467.9, 667.6, 470.1, 668.6, 474.9, 672.1, 479.6, 670.6, 482.9, 676.1, 489.1, 660.6, 496.9, 659.6, 498.9, 662.6, 501.1, 662.1, 504.4, 661.1, 504.6, 657.9, 502.6, 651.1, 502.6, 643.9, 508.6, 639.9, 510.6, 638.6, 512.1, 638.6, 513.9, 636.9, 515.6, 632.1, 516.6, 629.9, 518.6, 616.9, 525.6, 615.1, 525.6, 611.9, 527.6, 609.1, 527.6, 605.9, 529.6, 604.1, 529.6, 602.6, 531.9, 605.1, 534.4, 608.9, 534.4, 610.4, 533.4, 613.1, 533.9, 608.1, 535.6, 606.6, 537.1, 607.6, 539.1, 609.1, 540.4, 622.9, 540.4, 624.1, 539.4, 632.9, 538.4, 638.1, 535.4, 640.6, 535.4, 640.6, 537.9, 642.1, 539.4, 643.9, 539.4, 645.1, 538.4, 646.9, 538.4, 651.1, 535.4, 654.9, 534.4, 657.1, 532.4, 658.9, 532.4, 661.4, 529.9, 661.9, 525.9, 664.9, 526.4, 667.9, 522.9, 669.9, 523.4, 676.1, 516.4, 678.9, 517.4, 682.6, 515.9, 688.1, 519.4, 690.9, 519.4, 692.1, 520.6, 691.6, 522.9, 692.6, 524.1, 692.6, 525.9, 694.1, 527.4, 697.6, 525.9, 699.9, 526.4, 706.1, 534.4, 719.1, 543.4, 721.9, 543.4, 724.1, 545.4, 731.9, 546.4, 733.1, 547.4, 738.9, 547.4, 740.9, 548.4, 742.1, 547.4, 754.9, 546.4, 756.6, 544.9, 759.9, 545.4, 762.1, 543.4, 766.6, 541.4, 767.6, 542.1, 767.6, 544.9, 769.6, 548.1, 772.1, 550.4, 774.9, 550.4, 776.4, 548.9, 776.4, 547.1, 773.4, 543.9, 772.4, 539.1, 773.4, 537.1, 778.4, 533.1, 783.4, 525.4, 785.1, 526.4, 787.9, 526.4, 792.9, 524.4, 795.6, 526.4, 794.6, 528.9, 796.6, 532.1, 799.1, 534.4, 801.9, 534.4, 803.4, 532.1, 798.9, 526.4, 800.4, 523.9, 800.4, 521.1, 805.4, 513.1, 809.9, 510.4, 811.4, 508.1, 809.9, 506.6, 807.6, 506.1, 808.4, 503.1, 806.9, 501.6, 805.1, 501.6, 803.9, 502.6, 800.1, 501.6, 795.6, 505.1, 793.6, 510.1, 793.6, 515.9, 792.6, 516.6, 791.4, 515.9, 791.4, 514.1, 788.4, 510.9, 788.4, 501.1, 787.4, 499.9, 787.4, 496.1, 784.4, 489.9, 784.4, 487.1, 778.9, 477.4, 780.4, 474.1, 777.9, 471.9, 786.9, 471.4, 788.4, 469.9, 788.4, 468.1, 786.6, 466.1, 787.1, 465.4, 792.9, 466.4, 794.4, 464.9, 794.4, 463.1, 792.6, 461.1, 793.1, 460.4, 803.9, 462.4, 806.4, 459.9, 806.4, 458.1, 803.9, 455.6, 799.1, 453.4, 799.1, 452.6, 801.9, 452.4, 803.1, 453.4, 812.9, 453.4, 816.4, 450.9, 816.4, 449.1, 814.9, 447.6, 810.9, 445.6, 808.1, 445.6, 804.6, 443.9, 816.9, 443.4, 818.1, 444.4, 820.9, 444.4, 823.4, 441.9, 822.4, 439.9, 819.9, 437.6, 813.1, 435.6, 809.9, 433.6, 808.1, 433.6, 797.9, 429.6, 795.1, 429.6, 793.9, 428.6, 789.1, 428.6, 787.9, 427.6, 786.1, 427.6, 782.9, 424.6, 780.1, 424.6, 778.9, 423.6, 765.1, 423.6, 763.9, 424.6, 758.1, 425.6, 753.9, 428.6, 750.6, 433.1, 750.6, 437.9, 751.6, 439.1, 751.6, 441.9, 753.6, 446.1, 753.1, 449.1, 749.4, 442.9, 749.4, 441.1, 743.4, 432.9, 732.9, 424.6, 727.9, 422.6, 723.1, 422.6, 721.9, 421.6, 709.1, 421.6, 707.9, 422.6, 704.1, 422.6, 702.9, 423.6, 700.1, 423.6, 698.9, 424.6, 694.1, 425.6, 682.9, 432.4, 682.4, 430.1, 688.4, 420.9, 697.1, 415.4, 700.9, 415.4, 702.1, 414.4, 704.1, 415.4, 710.9, 415.4, 715.1, 418.4, 717.4, 416.9, 716.1, 414.6, 712.9, 412.6, 707.1, 411.6, 705.9, 410.6]], "49.88": [[699.1, 410.6, 697.9, 411.6, 695.1, 411.6, 693.9, 412.6, 689.1, 413.6, 685.1, 415.6, 680.9, 418.6, 674.6, 424.9, 669.6, 434.1, 669.6, 437.9, 668.6, 439.1, 669.1, 444.1, 667.1, 444.6, 664.9, 446.6, 662.9, 445.6, 659.1, 445.6, 657.6, 447.1, 658.6, 449.1, 663.1, 452.9, 661.1, 455.6, 659.6, 456.1, 656.9, 454.6, 652.1, 453.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 650.9, 456.4, 654.1, 459.4, 657.9, 460.4, 661.6, 462.9, 663.6, 461.9, 664.6, 462.4, 663.6, 465.9, 667.6, 471.1, 668.6, 474.9, 671.6, 478.1, 672.1, 480.4, 670.6, 482.9, 675.1, 488.1, 672.9, 489.6, 668.1, 490.6, 657.6, 495.9, 656.6, 497.9, 658.1, 499.4, 662.6, 501.1, 662.6, 503.9, 661.6, 504.6, 657.9, 502.6, 655.1, 502.6, 653.9, 501.6, 647.1, 501.6, 643.9, 503.6, 642.1, 503.6, 639.9, 505.6, 636.1, 506.6, 634.6, 508.1, 635.1, 510.1, 632.9, 511.6, 628.9, 513.6, 627.1, 513.6, 611.9, 521.6, 610.1, 521.6, 606.9, 523.6, 599.1, 525.6, 597.6, 527.9, 599.1, 529.4, 600.9, 529.4, 602.1, 530.4, 607.9, 530.4, 609.1, 529.4, 614.1, 529.9, 610.9, 531.6, 606.1, 532.6, 603.6, 535.9, 605.1, 537.4, 621.9, 537.4, 627.1, 535.4, 630.9, 535.4, 631.4, 536.1, 629.6, 538.9, 631.1, 540.4, 633.9, 540.4, 640.1, 537.4, 642.9, 537.4, 645.1, 535.4, 646.9, 535.4, 651.1, 532.4, 652.9, 532.4, 656.1, 530.4, 658.9, 530.4, 662.4, 526.9, 660.9, 524.4, 661.6, 522.9, 664.9, 523.4, 667.4, 520.4, 669.9, 521.4, 673.1, 517.4, 674.9, 517.4, 679.1, 515.4, 682.1, 517.4, 689.9, 518.4, 691.1, 519.4, 692.1, 520.6, 691.6, 526.9, 693.1, 528.4, 696.6, 525.9, 699.9, 526.4, 706.9, 535.4, 710.9, 537.4, 717.1, 542.4, 720.9, 543.4, 724.1, 545.4, 731.9, 546.4, 733.1, 547.4, 736.6, 547.4, 736.6, 549.9, 738.1, 551.4, 738.9, 551.4, 742.1, 547.4, 747.9, 547.4, 749.1, 546.4, 754.9, 546.4, 756.1, 545.4, 759.9, 545.4, 762.1, 543.4, 765.6, 541.9, 766.6, 542.4, 766.6, 543.9, 769.6, 548.9, 771.1, 550.4, 773.9, 550.4, 775.4, 548.9, 775.4, 547.1, 773.4, 544.9, 772.4, 537.1, 773.1, 536.4, 774.9, 536.4, 778.4, 533.1, 783.4, 525.4, 785.1, 526.4, 787.9, 526.4, 792.9, 524.4, 795.6, 526.1, 795.6, 530.9, 796.6, 532.1, 799.1, 534.4, 801.9, 534.4, 803.4, 532.1, 798.9, 526.4, 800.4, 523.9, 800.4, 521.1, 805.4, 513.1, 809.9, 510.4, 811.4, 508.1, 809.9, 506.6, 807.6, 506.1, 808.4, 503.1, 806.9, 501.6, 805.1, 501.6, 803.9, 502.6, 800.1, 501.6, 798.1, 502.6, 794.6, 507.1, 794.6, 512.9, 793.6, 514.1, 793.6, 515.9, 791.9, 516.4, 791.4, 514.1, 788.4, 510.9, 788.4, 501.1, 787.4, 499.9, 787.4, 495.1, 785.4, 491.9, 784.4, 487.1, 778.4, 476.4, 779.1, 475.4, 781.9, 475.4, 783.4, 473.9, 780.9, 470.4, 781.4, 469.4, 785.9, 469.4, 787.1, 468.4, 788.9, 468.4, 790.4, 466.9, 790.4, 465.1, 788.9, 463.4, 789.4, 462.4, 795.9, 462.4, 797.4, 460.9, 797.4, 459.1, 793.1, 456.4, 793.1, 455.6, 795.9, 455.4, 797.1, 456.4, 805.9, 456.4, 809.4, 453.9, 805.9, 449.6, 803.9, 448.6, 801.1, 448.6, 798.1, 447.4, 798.1, 446.6, 802.9, 446.4, 804.1, 447.4, 809.9, 447.4, 811.1, 446.4, 815.9, 446.4, 818.4, 443.9, 818.4, 442.1, 816.9, 440.6, 811.1, 439.6, 809.9, 438.6, 806.6, 438.6, 806.1, 437.6, 816.9, 437.4, 818.1, 436.4, 821.9, 436.4, 824.4, 433.9, 823.4, 431.9, 821.9, 430.6, 820.1, 430.6, 815.9, 428.6, 813.1, 428.6, 811.9, 427.6, 809.1, 427.6, 803.9, 425.6, 800.1, 425.6, 798.9, 424.6, 795.1, 424.6, 793.9, 423.6, 786.1, 423.6, 781.9, 420.6, 776.1, 420.6, 774.9, 421.6, 768.1, 421.6, 766.9, 422.6, 762.1, 422.6, 753.9, 427.6, 749.6, 434.1, 751.6, 441.9, 753.6, 445.1, 753.6, 447.4, 752.9, 448.1, 746.4, 436.1, 741.1, 430.6, 731.9, 423.6, 726.1, 422.6, 724.9, 421.6, 721.1, 421.6, 719.9, 420.6, 714.1, 420.6, 712.9, 421.6, 707.1, 421.6, 705.9, 422.6, 703.1, 422.6, 698.9, 424.6, 696.1, 424.6, 682.1, 432.4, 682.4, 430.1, 686.4, 422.9, 691.1, 418.4, 696.1, 415.4, 697.9, 415.4, 699.1, 414.4, 704.9, 414.4, 708.1, 417.4, 709.9, 417.4, 711.6, 415.9, 714.9, 417.4, 716.4, 415.9, 713.9, 412.6, 712.1, 412.6, 707.9, 410.6], [680.1, 519.6, 674.6, 523.1, 674.6, 524.9, 673.6, 526.1, 673.6, 529.9, 675.1, 531.4, 677.4, 529.9, 678.9, 526.9, 680.9, 527.4, 684.1, 525.9, 686.1, 528.4, 686.9, 528.4, 690.4, 523.9, 690.4, 522.1, 687.9, 519.6, 685.4, 521.1, 682.9, 519.6]], "49.96": [[698.1, 410.6, 696.9, 411.6, 691.1, 412.6, 683.1, 416.6, 676.6, 421.9, 672.6, 427.1, 669.6, 433.1, 669.6, 436.9, 668.6, 438.1, 669.1, 444.1, 664.4, 446.1, 658.1, 444.6, 656.6, 446.1, 657.6, 448.1, 663.1, 452.9, 660.1, 456.1, 656.9, 454.6, 655.1, 454.6, 651.9, 452.6, 650.1, 452.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 650.9, 456.4, 654.1, 459.4, 657.9, 460.4, 661.6, 462.9, 664.1, 461.9, 664.6, 463.9, 663.6, 465.9, 667.6, 471.1, 668.6, 474.9, 672.1, 479.6, 670.6, 482.9, 674.1, 486.6, 673.6, 487.6, 663.1, 490.6, 656.9, 493.6, 655.1, 493.6, 652.6, 496.1, 654.1, 498.4, 661.9, 500.4, 662.6, 501.1, 662.6, 503.6, 661.6, 504.1, 658.9, 502.6, 651.1, 501.6, 649.9, 500.6, 642.1, 500.6, 638.9, 502.6, 633.1, 503.6, 631.6, 505.1, 631.6, 506.9, 630.9, 507.6, 622.9, 511.6, 616.1, 513.6, 605.9, 518.6, 595.1, 521.6, 593.6, 523.9, 596.1, 526.4, 603.9, 527.4, 605.1, 526.4, 609.9, 526.4, 611.1, 525.4, 614.1, 525.9, 611.9, 527.6, 609.1, 527.6, 607.9, 528.6, 603.1, 529.6, 601.1, 530.6, 599.6, 532.9, 601.1, 534.4, 603.9, 534.4, 605.1, 535.4, 613.9, 535.4, 615.1, 534.4, 619.9, 534.4, 621.1, 533.4, 628.9, 532.4, 629.4, 533.1, 627.1, 534.6, 625.6, 536.9, 628.1, 539.4, 629.9, 539.4, 631.1, 538.4, 633.9, 538.4, 638.1, 535.4, 642.9, 534.4, 645.1, 532.4, 646.9, 532.4, 651.1, 529.4, 656.1, 528.9, 656.6, 532.9, 658.9, 534.4, 661.4, 531.9, 661.9, 529.6, 664.9, 530.4, 668.1, 527.4, 669.9, 527.4, 671.9, 525.6, 672.6, 526.1, 672.6, 529.9, 674.1, 531.4, 679.1, 527.4, 682.9, 530.4, 687.1, 527.4, 690.4, 523.9, 690.4, 521.1, 688.9, 519.4, 689.6, 518.4, 692.1, 520.6, 691.6, 525.9, 693.1, 527.4, 695.6, 525.9, 700.1, 525.9, 700.6, 527.9, 705.9, 534.4, 717.1, 542.4, 720.9, 543.4, 724.1, 545.4, 735.6, 547.4, 735.6, 551.9, 737.1, 553.4, 740.4, 551.1, 742.1, 547.4, 751.9, 547.4, 756.1, 545.4, 759.9, 545.4, 762.1, 543.4, 765.6, 541.9, 766.6, 542.4, 767.6, 546.9, 768.6, 548.1, 771.1, 550.4, 773.9, 550.4, 775.4, 548.9, 775.4, 547.1, 773.4, 544.9, 773.4, 543.1, 771.9, 541.4, 772.4, 537.1, 776.1, 535.4, 783.6, 525.9, 787.9, 526.4, 792.9, 524.4, 795.6, 526.1, 795.6, 529.9, 797.6, 533.1, 799.1, 534.4, 801.9, 534.4, 803.4, 532.1, 799.4, 526.9, 800.4, 522.1, 804.4, 515.1, 809.1, 511.4, 811.4, 508.1, 808.4, 505.9, 808.4, 503.1, 806.9, 501.6, 804.9, 502.6, 800.1, 501.6, 798.1, 502.6, 794.6, 507.1, 794.6, 513.9, 792.6, 516.1, 788.4, 510.9, 788.4, 501.1, 787.4, 499.9, 787.4, 495.1, 784.4, 488.9, 784.4, 486.1, 782.4, 483.9, 777.9, 474.9, 780.9, 474.4, 783.4, 471.9, 783.4, 470.1, 780.9, 468.1, 781.1, 467.6, 784.1, 466.4, 788.9, 466.4, 792.4, 463.9, 791.4, 461.9, 788.9, 460.1, 789.1, 459.6, 797.9, 458.4, 799.4, 456.9, 798.1, 454.6, 793.1, 452.4, 793.1, 451.6, 803.9, 451.4, 805.1, 450.4, 807.9, 450.4, 811.4, 447.9, 808.9, 444.6, 801.1, 443.6, 799.9, 442.6, 797.6, 442.6, 797.1, 441.6, 807.9, 441.4, 809.1, 440.4, 814.9, 440.4, 820.4, 436.9, 820.4, 435.1, 818.9, 433.6, 814.1, 433.6, 812.9, 432.6, 801.6, 432.6, 800.9, 431.9, 807.9, 431.4, 809.1, 430.4, 814.9, 430.4, 816.1, 429.4, 821.9, 428.4, 824.4, 425.9, 823.4, 423.9, 821.9, 422.6, 819.1, 422.6, 817.9, 421.6, 809.1, 421.6, 807.9, 420.6, 797.1, 420.6, 795.9, 419.6, 790.1, 419.6, 788.9, 420.6, 787.1, 420.6, 785.9, 419.6, 783.6, 420.1, 780.9, 418.6, 773.1, 418.6, 771.9, 419.6, 768.1, 419.6, 766.9, 420.6, 762.1, 421.6, 756.9, 424.6, 751.6, 429.9, 749.6, 433.1, 749.6, 436.9, 751.6, 440.1, 751.6, 441.9, 753.6, 446.4, 752.9, 448.1, 747.4, 437.1, 738.1, 427.6, 729.9, 422.6, 727.1, 422.6, 725.9, 421.6, 722.1, 421.6, 720.9, 420.6, 706.1, 421.6, 704.9, 422.6, 702.1, 422.6, 700.9, 423.6, 695.1, 424.6, 683.1, 432.4, 682.1, 432.4, 682.4, 430.1, 686.4, 422.9, 692.1, 417.4, 696.1, 415.4, 697.9, 415.4, 699.1, 414.4, 705.9, 414.4, 709.1, 417.4, 711.6, 415.9, 715.9, 417.4, 717.4, 415.9, 714.9, 412.6, 713.1, 412.6, 709.9, 410.6]], "50.04": [[701.1, 409.6, 699.9, 410.6, 696.1, 410.6, 694.9, 411.6, 690.1, 412.6, 684.1, 415.6, 675.6, 422.9, 669.6, 433.1, 669.6, 436.9, 668.6, 438.1, 668.6, 440.9, 667.6, 442.9, 664.9, 445.6, 659.1, 444.6, 657.6, 446.1, 657.6, 447.9, 662.6, 452.4, 659.9, 455.6, 655.1, 454.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 647.1, 455.4, 650.9, 456.4, 654.1, 459.4, 657.9, 460.4, 661.6, 462.9, 664.1, 462.6, 664.6, 463.9, 663.6, 465.9, 666.6, 469.1, 667.6, 471.1, 667.6, 473.9, 670.6, 477.1, 671.1, 479.4, 669.6, 481.9, 672.6, 485.1, 671.9, 486.6, 663.1, 487.6, 659.9, 489.6, 651.1, 491.6, 647.6, 494.1, 649.1, 496.4, 653.1, 498.4, 655.9, 498.4, 659.1, 500.4, 661.9, 500.4, 662.6, 501.1, 662.6, 503.6, 661.6, 504.1, 656.1, 502.6, 654.9, 501.6, 647.1, 500.6, 642.9, 498.6, 636.1, 498.6, 617.9, 507.6, 613.1, 508.6, 609.9, 510.6, 604.1, 511.6, 600.9, 513.6, 599.1, 513.6, 594.9, 515.6, 591.1, 515.6, 588.6, 518.1, 588.6, 519.9, 590.1, 521.4, 591.9, 521.4, 593.1, 522.4, 604.9, 522.4, 606.1, 521.4, 611.4, 521.9, 596.1, 527.6, 594.6, 529.1, 596.1, 531.4, 598.9, 531.4, 600.1, 532.4, 611.9, 532.4, 613.1, 531.4, 616.9, 531.4, 618.1, 530.4, 624.9, 529.4, 625.4, 530.1, 619.6, 535.1, 621.1, 537.4, 627.9, 537.4, 629.1, 536.4, 633.9, 535.4, 639.1, 531.4, 642.4, 531.9, 640.6, 534.9, 642.9, 536.4, 647.9, 534.4, 651.1, 531.4, 652.9, 531.4, 655.4, 529.4, 656.1, 529.9, 655.6, 531.9, 657.1, 533.4, 658.9, 533.4, 663.1, 529.4, 664.9, 529.4, 668.9, 526.4, 669.4, 527.1, 666.6, 531.1, 666.6, 532.9, 668.9, 534.4, 673.1, 530.4, 674.9, 530.4, 679.4, 526.4, 680.1, 527.4, 678.6, 529.9, 680.1, 531.4, 681.9, 531.4, 688.1, 526.4, 691.1, 522.9, 691.6, 523.6, 690.6, 525.9, 692.1, 527.4, 693.9, 527.4, 695.6, 525.9, 698.9, 526.4, 706.9, 535.4, 710.9, 537.4, 717.1, 542.4, 720.9, 543.4, 724.1, 545.4, 726.9, 545.4, 728.1, 546.4, 734.6, 547.4, 734.6, 551.9, 733.6, 553.9, 735.1, 555.4, 736.9, 555.4, 738.4, 554.1, 742.4, 547.4, 743.1, 547.9, 742.6, 550.9, 744.9, 552.4, 747.4, 549.9, 747.4, 547.4, 753.9, 547.4, 756.1, 545.4, 759.9, 545.4, 765.1, 541.4, 766.6, 542.1, 766.6, 544.9, 768.6, 548.9, 770.1, 550.4, 772.9, 551.4, 775.4, 548.9, 775.4, 547.1, 771.4, 540.9, 772.4, 537.1, 776.1, 535.4, 781.9, 527.9, 784.9, 529.4, 787.1, 526.4, 788.9, 526.4, 792.1, 524.4, 795.6, 526.1, 795.6, 530.9, 799.1, 534.4, 801.9, 534.4, 803.4, 532.9, 799.4, 526.9, 800.4, 522.1, 805.4, 514.1, 810.9, 510.4, 812.4, 508.1, 810.9, 506.6, 808.6, 506.1, 809.4, 503.1, 807.9, 501.6, 806.1, 501.6, 804.9, 502.6, 800.1, 501.6, 798.1, 502.6, 794.6, 507.1, 794.6, 514.9, 792.6, 516.1, 788.4, 510.9, 788.4, 500.1, 787.4, 498.9, 787.4, 495.1, 785.4, 491.9, 784.4, 486.1, 781.4, 481.9, 777.9, 473.9, 780.1, 472.4, 783.9, 471.4, 785.4, 469.9, 785.4, 468.1, 783.9, 466.6, 782.1, 466.4, 782.1, 465.6, 790.9, 463.4, 793.4, 460.9, 792.1, 458.6, 787.1, 456.4, 787.1, 455.6, 797.9, 455.4, 801.4, 452.9, 801.4, 451.1, 799.9, 449.6, 797.9, 448.6, 793.6, 448.6, 793.1, 447.6, 795.9, 447.4, 797.1, 446.4, 800.9, 446.4, 802.1, 445.4, 806.9, 445.4, 812.4, 441.9, 810.9, 439.6, 808.9, 438.6, 803.1, 438.6, 801.9, 437.6, 798.6, 437.6, 797.9, 436.9, 801.9, 436.4, 803.1, 435.4, 812.9, 434.4, 819.9, 431.4, 821.4, 429.9, 821.4, 428.1, 819.9, 426.6, 802.6, 426.6, 801.9, 425.9, 805.1, 424.4, 807.9, 424.4, 809.1, 423.4, 812.9, 423.4, 820.9, 420.4, 823.4, 417.9, 823.4, 416.1, 822.4, 414.9, 820.9, 413.6, 815.1, 413.6, 813.9, 414.6, 793.1, 414.6, 791.9, 415.6, 786.1, 415.6, 784.9, 416.6, 782.9, 415.6, 775.1, 415.6, 773.9, 416.6, 771.1, 416.6, 769.9, 417.6, 765.1, 418.6, 759.1, 421.6, 755.1, 424.6, 749.6, 432.1, 749.6, 436.9, 752.6, 443.4, 752.1, 445.4, 746.4, 435.1, 741.1, 429.6, 731.9, 422.6, 730.1, 422.6, 728.9, 421.6, 725.1, 421.6, 723.9, 420.6, 709.1, 420.6, 707.9, 421.6, 704.1, 421.6, 702.9, 422.6, 695.1, 424.6, 682.9, 431.6, 682.4, 429.1, 687.4, 421.1, 693.1, 416.4, 697.1, 414.4, 702.9, 414.4, 704.1, 415.4, 707.9, 415.4, 709.1, 416.4, 711.9, 415.4, 715.1, 417.4, 716.9, 417.4, 718.4, 415.9, 717.1, 413.6, 713.9, 411.6, 708.1, 410.6, 706.9, 409.6]], "50.12": [[815.1, 405.6, 813.9, 406.6, 805.1, 407.6, 799.9, 409.6, 790.1, 410.6, 787.9, 412.6, 785.1, 412.6, 783.9, 413.6, 781.9, 412.6, 777.1, 412.6, 775.9, 413.6, 770.1, 414.6, 766.9, 416.6, 765.1, 416.6, 761.1, 418.6, 753.6, 424.9, 749.6, 431.1, 749.6, 436.9, 751.6, 440.4, 751.1, 442.4, 743.4, 430.9, 736.9, 425.6, 729.9, 421.6, 727.1, 421.6, 725.9, 420.6, 721.1, 420.6, 719.9, 419.6, 707.1, 420.6, 705.9, 421.6, 699.1, 422.6, 690.1, 426.6, 681.9, 432.1, 681.4, 431.4, 682.4, 429.9, 682.4, 428.1, 686.4, 421.9, 691.1, 417.4, 696.1, 414.4, 698.9, 414.4, 700.1, 413.4, 703.9, 413.4, 705.9, 414.4, 707.9, 413.4, 709.1, 414.4, 711.9, 414.4, 715.1, 416.4, 717.4, 414.9, 714.9, 411.6, 713.1, 411.6, 709.9, 409.6, 698.1, 409.6, 696.9, 410.6, 691.1, 411.6, 683.1, 415.6, 672.6, 426.1, 669.6, 432.1, 669.6, 433.9, 668.6, 435.1, 669.1, 437.4, 667.6, 440.1, 667.6, 442.9, 666.6, 444.1, 664.9, 445.6, 659.1, 444.6, 657.6, 446.1, 658.6, 448.1, 662.6, 452.1, 661.1, 454.6, 659.9, 455.6, 658.1, 455.6, 651.9, 452.6, 650.1, 452.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 647.1, 455.4, 650.9, 456.4, 654.1, 459.4, 657.9, 460.4, 661.6, 462.9, 664.1, 462.6, 664.6, 463.9, 663.6, 465.9, 666.6, 470.1, 666.6, 472.9, 671.1, 478.6, 669.6, 481.9, 672.1, 484.6, 671.6, 485.6, 666.1, 485.6, 664.9, 486.6, 661.1, 486.6, 659.9, 487.6, 656.6, 487.1, 654.9, 488.6, 649.1, 489.6, 644.6, 493.1, 646.1, 495.4, 648.1, 496.4, 649.9, 496.4, 653.1, 498.4, 655.9, 498.4, 657.1, 499.4, 661.9, 500.4, 662.6, 501.1, 662.6, 502.9, 661.9, 503.6, 656.1, 502.6, 654.9, 501.6, 652.1, 501.6, 650.9, 500.6, 648.1, 500.6, 646.9, 499.6, 644.1, 499.6, 636.9, 496.6, 629.1, 496.6, 623.9, 499.6, 622.1, 499.6, 616.9, 502.6, 609.1, 504.6, 605.9, 506.6, 603.1, 506.6, 599.9, 508.6, 597.1, 508.6, 589.9, 511.6, 587.1, 511.6, 585.1, 512.6, 583.6, 514.9, 586.1, 517.4, 588.9, 517.4, 590.1, 518.4, 603.9, 518.4, 605.1, 517.4, 609.1, 517.9, 605.9, 519.6, 604.1, 519.6, 602.9, 520.6, 601.1, 520.6, 593.1, 523.6, 591.6, 525.1, 591.6, 526.9, 593.1, 528.4, 595.9, 528.4, 597.1, 529.4, 605.9, 529.4, 607.1, 528.4, 611.9, 528.4, 613.1, 527.4, 616.9, 527.4, 618.1, 526.4, 623.9, 525.6, 623.9, 526.4, 619.1, 528.6, 614.6, 532.1, 614.6, 533.9, 616.1, 535.4, 621.9, 535.4, 623.1, 534.4, 625.9, 534.4, 627.1, 533.4, 634.9, 531.4, 639.1, 528.4, 640.6, 528.4, 641.1, 529.4, 638.6, 532.9, 640.1, 534.4, 642.9, 534.4, 647.9, 532.4, 651.1, 529.4, 655.6, 526.9, 656.4, 527.1, 656.4, 528.1, 651.6, 532.1, 651.6, 532.9, 653.9, 534.4, 656.1, 532.4, 658.9, 532.4, 662.1, 528.4, 664.9, 528.4, 666.9, 526.6, 667.6, 527.1, 667.4, 528.1, 663.6, 532.1, 663.6, 532.9, 665.9, 534.4, 667.1, 533.4, 668.9, 533.4, 672.1, 530.4, 673.9, 530.4, 677.9, 526.6, 678.6, 527.1, 678.6, 529.9, 680.9, 531.4, 682.9, 530.4, 686.1, 526.4, 690.1, 523.9, 690.6, 525.9, 692.1, 527.4, 695.1, 525.4, 697.1, 526.4, 700.1, 525.9, 700.6, 527.9, 706.9, 535.4, 710.9, 537.4, 717.1, 542.4, 727.1, 546.4, 734.6, 547.4, 735.1, 548.4, 732.6, 554.1, 732.6, 555.9, 734.1, 557.4, 738.4, 553.9, 741.1, 547.4, 743.1, 547.9, 741.6, 550.1, 741.6, 552.9, 743.9, 554.4, 747.4, 549.9, 747.4, 548.1, 748.1, 547.4, 752.9, 547.4, 755.1, 545.4, 759.9, 545.4, 764.6, 541.9, 765.6, 542.4, 765.6, 543.9, 768.6, 549.1, 771.1, 551.4, 772.9, 551.4, 775.4, 548.1, 772.4, 544.9, 772.4, 543.1, 771.4, 541.9, 771.4, 537.1, 777.1, 534.4, 781.9, 527.9, 784.9, 529.4, 787.1, 526.4, 788.9, 526.4, 792.1, 524.4, 795.6, 526.1, 795.6, 529.9, 797.6, 533.1, 799.1, 534.4, 801.9, 534.4, 803.4, 532.1, 799.4, 526.9, 801.4, 520.1, 805.4, 514.1, 812.4, 508.9, 810.9, 506.6, 808.6, 506.1, 809.4, 503.1, 807.9, 501.6, 806.1, 501.6, 804.9, 502.6, 800.1, 501.6, 795.6, 506.1, 794.6, 508.1, 794.6, 514.9, 793.4, 516.1, 792.4, 515.6, 788.4, 510.9, 788.4, 500.1, 787.4, 498.9, 787.4, 495.1, 786.4, 493.9, 786.4, 492.1, 784.4, 488.9, 784.4, 486.1, 781.4, 481.9, 776.9, 472.9, 779.1, 471.4, 782.9, 470.4, 785.4, 467.9, 785.4, 466.1, 783.9, 464.6, 782.1, 464.4, 782.1, 463.6, 790.9, 461.4, 794.4, 457.9, 793.1, 455.6, 791.9, 454.6, 789.6, 454.6, 789.1, 453.6, 791.1, 452.4, 795.9, 452.4, 797.1, 451.4, 798.9, 451.4, 802.4, 448.9, 802.4, 447.1, 800.9, 445.6, 798.9, 444.6, 793.4, 444.6, 792.9, 443.6, 794.1, 442.4, 798.9, 442.4, 800.1, 441.4, 805.9, 440.4, 809.9, 438.4, 812.4, 435.9, 812.4, 434.1, 810.9, 432.6, 799.6, 432.6, 798.9, 431.9, 802.1, 430.4, 807.9, 429.4, 811.1, 427.4, 812.9, 427.4, 818.9, 424.4, 822.4, 420.9, 820.9, 418.6, 813.1, 418.6, 811.9, 419.6, 808.1, 419.6, 806.9, 420.6, 803.1, 420.6, 801.6, 421.6, 799.9, 421.1, 802.4, 419.4, 803.9, 419.4, 807.1, 417.4, 808.9, 417.4, 812.1, 415.4, 815.9, 414.4, 821.4, 409.9, 821.4, 407.1, 819.9, 405.6]], "50.20": [[819.1, 395.6, 817.9, 396.6, 815.1, 396.6, 804.9, 400.6, 802.1, 400.6, 798.9, 402.6, 797.1, 402.6, 792.9, 404.6, 790.1, 404.6, 788.9, 405.6, 787.1, 405.6, 785.9, 406.6, 772.1, 410.6, 760.1, 417.6, 753.6, 423.9, 749.6, 430.1, 749.6, 436.9, 751.6, 439.4, 752.6, 442.4, 752.1, 444.4, 750.4, 441.6, 750.1, 439.6, 746.4, 434.1, 742.1, 429.6, 732.9, 422.6, 730.9, 421.6, 728.1, 421.6, 726.9, 420.6, 722.1, 420.6, 720.9, 419.6, 710.1, 419.6, 708.9, 420.6, 705.1, 420.6, 703.9, 421.6, 701.1, 421.6, 699.9, 422.6, 695.1, 423.6, 681.9, 431.4, 681.4, 430.4, 686.4, 421.1, 693.1, 415.4, 697.1, 413.4, 702.4, 412.9, 704.1, 414.4, 705.9, 414.4, 707.1, 413.4, 711.9, 413.4, 716.1, 416.4, 718.4, 414.9, 715.9, 411.6, 707.9, 408.6, 701.1, 408.6, 699.9, 409.6, 696.1, 409.6, 694.9, 410.6, 690.1, 411.6, 679.9, 417.6, 671.6, 427.1, 669.6, 431.1, 668.6, 436.9, 667.6, 438.1, 668.1, 443.1, 664.4, 445.1, 661.1, 444.6, 659.9, 443.6, 658.1, 443.6, 656.6, 445.1, 657.6, 447.1, 663.1, 451.6, 660.1, 455.6, 655.1, 454.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 650.9, 456.4, 654.1, 459.4, 657.9, 460.4, 661.6, 462.9, 664.1, 462.6, 664.1, 465.4, 665.6, 467.1, 666.6, 472.9, 672.1, 480.4, 670.6, 482.1, 670.6, 484.6, 662.1, 484.6, 660.9, 485.6, 654.1, 485.6, 652.9, 486.6, 648.1, 486.6, 646.9, 487.6, 644.1, 487.6, 642.9, 488.6, 638.1, 489.6, 636.6, 491.9, 638.1, 493.4, 643.9, 494.4, 645.1, 495.4, 646.9, 495.4, 648.1, 496.4, 661.9, 500.4, 662.6, 501.1, 662.6, 502.9, 661.9, 503.6, 656.1, 502.6, 654.9, 501.6, 651.1, 501.6, 647.9, 499.6, 645.1, 499.6, 640.9, 497.6, 638.1, 497.6, 629.9, 493.6, 625.1, 493.6, 609.9, 499.6, 607.1, 499.6, 602.9, 501.6, 600.1, 501.6, 594.9, 503.6, 591.1, 503.6, 589.9, 504.6, 582.1, 506.6, 580.6, 508.1, 580.6, 509.9, 582.1, 511.4, 587.1, 513.4, 605.9, 513.4, 607.4, 512.4, 609.9, 512.6, 609.9, 513.4, 603.9, 515.6, 593.1, 518.6, 589.1, 520.6, 587.6, 522.9, 591.1, 525.4, 606.9, 525.4, 608.1, 524.4, 611.9, 524.4, 613.1, 523.4, 616.9, 523.4, 618.1, 522.4, 619.6, 522.4, 620.1, 523.4, 618.9, 524.6, 614.1, 526.6, 610.6, 530.1, 612.1, 532.4, 621.9, 532.4, 623.1, 531.4, 633.9, 528.4, 634.4, 529.1, 630.6, 532.1, 630.6, 533.9, 632.9, 535.4, 639.1, 532.4, 641.9, 532.4, 645.1, 530.4, 647.9, 530.4, 651.1, 527.4, 652.9, 527.4, 653.4, 528.1, 650.6, 531.1, 650.6, 532.9, 652.9, 534.4, 655.1, 532.4, 657.9, 531.4, 662.1, 527.4, 663.9, 527.4, 667.1, 524.9, 667.4, 526.1, 661.6, 532.1, 663.1, 534.4, 664.9, 534.4, 668.9, 532.4, 673.1, 528.4, 675.6, 527.9, 677.9, 525.6, 678.6, 526.6, 676.6, 529.9, 678.1, 531.4, 679.9, 531.4, 682.9, 529.4, 686.1, 525.4, 690.9, 523.4, 693.1, 524.9, 692.6, 526.9, 694.1, 528.4, 699.1, 525.4, 700.1, 525.6, 700.6, 527.9, 705.9, 534.4, 717.1, 542.4, 720.9, 543.4, 723.1, 545.4, 724.9, 545.4, 726.1, 546.4, 730.9, 546.4, 732.1, 547.4, 733.6, 547.4, 734.1, 548.4, 731.6, 554.1, 731.6, 556.9, 733.1, 558.4, 735.1, 557.4, 739.1, 552.6, 741.1, 555.4, 742.9, 555.4, 745.4, 552.9, 747.1, 547.4, 752.9, 547.4, 755.1, 545.4, 759.9, 545.4, 764.6, 541.9, 765.6, 542.4, 765.6, 545.9, 767.6, 548.9, 769.1, 550.4, 771.9, 551.4, 774.4, 548.1, 772.4, 545.9, 770.4, 540.9, 771.4, 537.1, 775.9, 535.4, 783.1, 526.4, 788.9, 526.4, 792.9, 524.4, 795.6, 526.1, 795.6, 529.9, 799.1, 534.4, 802.9, 534.4, 804.4, 532.9, 804.4, 532.1, 800.4, 528.9, 799.4, 525.1, 803.4, 517.1, 808.9, 511.4, 812.4, 508.9, 810.9, 506.6, 808.6, 506.1, 809.4, 503.1, 807.9, 501.6, 806.1, 501.6, 804.9, 502.6, 800.1, 501.6, 795.6, 506.1, 794.6, 508.1, 794.6, 514.9, 793.4, 516.1, 792.4, 515.6, 788.4, 510.9, 788.4, 500.1, 787.4, 498.9, 787.4, 495.1, 786.4, 493.9, 784.4, 486.1, 781.4, 481.9, 780.4, 478.1, 778.9, 476.4, 780.4, 473.1, 777.9, 470.9, 785.9, 467.4, 787.4, 465.9, 787.4, 464.1, 785.9, 462.6, 783.9, 462.1, 785.1, 460.4, 786.9, 460.4, 792.9, 457.4, 795.4, 454.9, 792.9, 451.6, 787.6, 451.6, 786.9, 450.9, 792.9, 449.4, 796.1, 447.4, 797.9, 447.4, 803.4, 442.9, 800.9, 439.6, 794.6, 439.6, 793.9, 438.9, 805.9, 434.4, 808.1, 432.4, 810.9, 431.4, 813.4, 428.9, 811.9, 426.6, 803.1, 426.6, 801.9, 427.6, 797.6, 427.6, 796.9, 426.9, 804.1, 423.4, 805.9, 423.4, 817.9, 416.4, 820.4, 413.9, 820.4, 412.1, 818.9, 410.6, 814.1, 410.6, 809.9, 412.6, 807.1, 412.6, 803.9, 414.6, 801.1, 414.6, 797.6, 416.6, 796.9, 415.6, 811.9, 407.4, 820.9, 400.4, 822.4, 398.1]], "50.28": [[812.1, 388.6, 807.9, 391.6, 806.1, 391.6, 790.9, 399.6, 789.1, 399.6, 767.1, 410.6, 760.1, 415.6, 754.6, 420.9, 751.6, 425.1, 748.6, 431.1, 748.6, 433.9, 749.6, 435.4, 749.1, 437.4, 738.1, 425.6, 733.9, 422.6, 729.9, 420.6, 727.1, 420.6, 725.9, 419.6, 720.1, 419.6, 718.9, 418.6, 707.1, 419.6, 705.9, 420.6, 703.1, 420.6, 698.9, 422.6, 696.1, 422.6, 690.1, 425.6, 681.6, 431.6, 680.9, 431.1, 681.4, 429.1, 686.4, 420.9, 692.1, 415.4, 698.1, 412.4, 704.9, 412.4, 707.1, 414.4, 712.9, 413.4, 715.1, 415.4, 717.4, 413.9, 714.9, 410.6, 709.9, 408.6, 698.1, 408.6, 696.9, 409.6, 691.1, 410.6, 683.1, 414.6, 673.6, 423.9, 670.6, 428.1, 668.6, 433.1, 668.6, 436.9, 667.6, 438.1, 667.6, 441.9, 666.6, 443.1, 664.4, 445.1, 661.9, 443.6, 659.1, 443.6, 657.6, 445.1, 658.6, 447.1, 663.1, 451.6, 660.1, 455.6, 655.1, 454.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 650.9, 456.4, 654.1, 459.4, 657.9, 460.4, 661.6, 462.9, 664.1, 462.6, 664.1, 465.4, 665.6, 467.1, 665.6, 469.9, 667.6, 474.9, 674.4, 482.1, 671.9, 483.6, 661.1, 483.6, 659.9, 484.6, 646.1, 484.6, 644.9, 485.6, 641.1, 485.6, 636.9, 487.6, 633.1, 487.6, 630.6, 490.1, 632.1, 492.4, 634.1, 493.4, 639.9, 493.4, 641.1, 494.4, 643.9, 494.4, 645.1, 495.4, 646.9, 495.4, 648.1, 496.4, 649.9, 496.4, 654.1, 498.4, 656.9, 498.4, 660.1, 500.4, 661.9, 500.4, 662.6, 501.1, 662.6, 503.6, 661.6, 504.1, 658.9, 502.6, 656.1, 502.6, 654.9, 501.6, 651.1, 501.6, 649.9, 500.6, 639.1, 497.6, 635.9, 495.6, 629.1, 494.6, 624.9, 491.6, 619.1, 491.6, 614.9, 493.6, 611.1, 493.6, 606.9, 495.6, 603.1, 495.6, 595.9, 498.6, 591.1, 498.6, 589.9, 499.6, 587.1, 499.6, 585.9, 500.6, 583.1, 500.6, 577.9, 502.6, 576.6, 504.1, 577.9, 506.4, 581.1, 508.4, 584.9, 508.4, 586.1, 509.4, 604.9, 509.4, 606.4, 508.4, 610.1, 508.9, 602.9, 511.6, 600.1, 511.6, 589.9, 515.6, 588.1, 515.6, 584.6, 518.1, 584.6, 519.9, 586.1, 521.4, 589.9, 521.4, 591.1, 522.4, 599.9, 522.4, 601.1, 521.4, 607.9, 521.4, 609.1, 520.4, 613.9, 520.4, 615.1, 519.4, 617.4, 519.4, 617.9, 520.4, 610.1, 524.6, 606.6, 528.9, 608.1, 530.4, 616.9, 530.4, 618.1, 529.4, 621.9, 529.4, 623.1, 528.4, 624.9, 528.4, 632.9, 525.4, 633.4, 526.1, 627.6, 531.1, 629.1, 533.4, 633.9, 533.4, 637.1, 531.4, 642.9, 530.4, 645.1, 528.4, 648.9, 527.4, 651.4, 525.4, 652.1, 526.4, 645.6, 532.1, 647.1, 534.4, 648.9, 534.4, 651.1, 532.4, 653.9, 532.4, 656.1, 530.4, 657.9, 530.4, 663.4, 525.4, 664.4, 526.1, 661.6, 530.1, 661.6, 532.9, 663.9, 534.4, 666.1, 532.4, 669.9, 531.4, 673.1, 527.4, 675.1, 526.4, 676.1, 526.4, 676.6, 527.9, 674.6, 530.9, 676.9, 532.4, 683.1, 528.4, 686.1, 524.4, 689.9, 525.4, 692.1, 523.9, 692.6, 525.9, 694.1, 527.4, 700.1, 524.9, 701.6, 528.9, 704.6, 533.1, 714.1, 540.4, 724.1, 545.4, 730.9, 546.4, 733.1, 547.9, 731.6, 553.9, 730.6, 555.1, 730.6, 557.9, 732.1, 559.4, 733.9, 559.4, 735.1, 558.4, 738.9, 552.9, 739.6, 553.6, 739.6, 555.9, 741.9, 557.4, 744.4, 554.9, 746.4, 550.9, 746.9, 547.6, 748.6, 548.1, 748.6, 550.9, 750.9, 552.4, 753.4, 549.9, 753.4, 547.1, 755.1, 545.4, 757.9, 546.4, 763.6, 542.9, 764.6, 543.4, 764.6, 544.9, 766.6, 548.1, 770.1, 551.4, 771.9, 551.4, 773.4, 549.9, 773.4, 547.1, 771.4, 544.9, 770.4, 537.1, 771.1, 536.4, 773.9, 536.4, 775.1, 535.4, 778.4, 531.1, 781.4, 528.9, 781.4, 527.1, 782.6, 525.9, 788.9, 526.4, 792.6, 524.9, 794.9, 525.4, 795.6, 526.1, 795.6, 529.9, 796.6, 531.9, 799.1, 534.4, 801.9, 535.4, 804.4, 532.1, 800.4, 528.9, 799.4, 525.1, 804.4, 516.1, 808.9, 511.4, 810.9, 510.4, 812.4, 508.1, 810.9, 506.6, 808.9, 506.1, 809.4, 503.1, 807.9, 501.6, 806.1, 501.6, 804.9, 502.6, 802.9, 501.6, 800.1, 501.6, 795.6, 506.1, 795.6, 507.9, 794.6, 509.1, 794.6, 514.9, 793.4, 516.1, 792.4, 515.6, 788.4, 510.9, 788.4, 500.1, 787.4, 498.9, 787.4, 494.1, 785.4, 490.9, 784.4, 486.1, 778.9, 475.4, 781.4, 472.1, 777.9, 469.9, 786.9, 465.4, 788.4, 463.1, 784.9, 459.6, 793.9, 454.4, 796.4, 451.9, 793.9, 448.6, 790.6, 448.6, 789.9, 447.9, 795.1, 444.4, 799.9, 442.4, 804.4, 437.9, 802.9, 435.6, 796.1, 435.6, 794.6, 436.6, 792.9, 435.9, 801.9, 431.4, 810.9, 425.4, 813.4, 422.9, 813.4, 421.1, 811.9, 419.6, 809.1, 419.6, 807.9, 420.6, 805.1, 420.6, 800.9, 422.6, 798.1, 422.6, 796.6, 423.6, 794.9, 423.1, 802.1, 418.4, 806.9, 416.4, 812.1, 412.4, 819.4, 404.9, 818.4, 402.9, 816.1, 401.6, 811.1, 403.6, 806.9, 406.6, 805.1, 406.6, 795.6, 411.6, 794.9, 411.1, 795.9, 409.6, 799.9, 407.4, 804.1, 403.4, 810.1, 399.4, 813.4, 395.9, 815.4, 392.9, 815.4, 390.1, 813.9, 388.6]], "50.36": [[808.1, 381.6, 801.9, 385.6, 797.1, 387.6, 790.9, 392.6, 779.9, 399.6, 777.1, 400.6, 762.9, 410.6, 753.6, 420.1, 751.6, 424.9, 749.6, 427.1, 748.1, 434.4, 738.1, 424.6, 733.9, 421.6, 728.9, 419.6, 722.1, 419.6, 720.9, 418.6, 708.1, 418.6, 706.9, 419.6, 704.1, 419.6, 696.9, 422.6, 694.1, 422.6, 680.9, 431.1, 680.4, 430.4, 681.4, 428.9, 681.4, 427.1, 685.4, 420.9, 692.1, 414.4, 696.1, 412.4, 697.9, 412.4, 699.1, 411.4, 702.9, 411.4, 705.1, 413.4, 709.9, 413.4, 711.1, 412.4, 712.9, 412.4, 715.1, 414.4, 716.9, 414.4, 718.4, 412.9, 716.9, 410.6, 713.1, 409.6, 709.9, 407.6, 699.1, 407.6, 697.9, 408.6, 695.1, 408.6, 693.9, 409.6, 689.1, 410.6, 685.1, 412.6, 677.1, 418.6, 670.6, 427.1, 668.6, 431.1, 668.6, 434.9, 666.6, 438.1, 666.6, 439.9, 669.1, 442.1, 664.1, 442.6, 662.9, 443.6, 659.1, 442.6, 657.6, 444.1, 657.6, 445.9, 658.6, 447.1, 663.1, 450.6, 660.6, 453.9, 661.6, 455.1, 664.6, 456.1, 664.1, 458.1, 659.9, 455.6, 658.1, 455.6, 651.9, 452.6, 650.1, 452.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 647.1, 455.4, 650.9, 456.4, 654.1, 459.4, 657.9, 460.4, 661.6, 462.9, 664.1, 462.6, 664.6, 463.9, 663.6, 465.9, 665.6, 468.1, 666.6, 472.9, 671.6, 479.9, 674.1, 481.9, 673.9, 482.4, 665.1, 482.6, 663.9, 481.6, 651.1, 481.6, 649.9, 482.6, 636.1, 482.6, 634.9, 483.6, 631.1, 483.6, 629.9, 484.6, 624.1, 484.6, 622.9, 485.6, 619.1, 485.6, 613.9, 487.6, 609.1, 487.6, 607.9, 488.6, 604.1, 488.6, 602.9, 489.6, 598.1, 489.6, 596.9, 490.6, 593.4, 491.1, 591.1, 490.6, 589.9, 491.6, 586.1, 491.6, 584.9, 492.6, 580.1, 492.6, 578.9, 493.6, 576.1, 493.6, 573.6, 496.9, 578.1, 500.4, 579.9, 500.4, 581.1, 501.4, 584.9, 501.4, 586.1, 502.4, 591.9, 502.4, 593.1, 503.4, 603.1, 503.9, 602.4, 504.6, 599.1, 504.6, 597.9, 505.6, 595.1, 505.6, 593.9, 506.6, 591.1, 506.6, 586.9, 508.6, 584.1, 508.6, 580.6, 511.1, 580.6, 512.9, 584.1, 515.4, 589.9, 515.4, 591.1, 516.4, 602.9, 516.4, 604.1, 515.4, 612.4, 515.4, 612.9, 516.4, 604.1, 520.6, 601.6, 523.9, 603.1, 525.4, 612.9, 526.4, 614.1, 525.4, 619.9, 525.4, 621.1, 524.4, 623.9, 524.4, 627.1, 522.4, 628.9, 522.4, 629.4, 523.1, 623.6, 528.1, 625.1, 530.4, 632.9, 530.4, 639.1, 527.4, 641.9, 527.4, 644.1, 525.4, 645.9, 525.4, 647.4, 524.4, 648.1, 525.4, 643.6, 530.9, 645.1, 532.4, 648.9, 532.4, 655.1, 528.4, 657.9, 528.4, 662.4, 524.4, 663.1, 525.4, 661.6, 527.9, 659.4, 529.1, 657.6, 531.9, 659.1, 533.4, 662.9, 533.4, 667.1, 530.4, 668.9, 530.4, 674.4, 525.4, 675.4, 526.1, 673.6, 529.9, 675.1, 531.4, 676.9, 531.4, 679.1, 529.4, 680.9, 529.4, 684.6, 525.9, 687.9, 528.4, 691.4, 523.4, 692.1, 523.9, 691.6, 525.9, 693.1, 527.4, 696.1, 525.4, 698.9, 525.4, 705.9, 534.4, 710.9, 537.4, 714.1, 540.4, 724.1, 545.4, 730.9, 546.4, 732.1, 547.6, 731.6, 550.9, 728.6, 558.1, 731.1, 561.4, 735.4, 558.1, 737.9, 553.9, 738.6, 554.6, 738.6, 557.9, 740.1, 559.4, 744.4, 555.9, 745.4, 552.1, 746.6, 550.9, 747.6, 551.4, 747.6, 552.9, 749.9, 554.4, 753.4, 550.9, 753.4, 547.1, 755.1, 545.4, 757.9, 546.4, 762.6, 542.9, 764.6, 544.1, 765.6, 547.9, 767.9, 550.4, 769.1, 551.4, 771.9, 551.4, 773.4, 549.9, 773.4, 548.1, 770.4, 544.9, 770.4, 537.4, 772.9, 537.4, 774.1, 536.4, 781.9, 526.9, 784.9, 529.4, 787.1, 526.4, 792.6, 524.9, 794.9, 525.4, 795.6, 526.1, 795.6, 530.9, 796.6, 532.1, 799.1, 534.4, 802.9, 534.4, 804.4, 532.1, 800.4, 528.9, 799.4, 526.9, 800.4, 523.1, 804.4, 516.1, 806.9, 513.4, 810.1, 511.4, 812.4, 508.1, 809.4, 505.9, 809.4, 503.1, 807.9, 501.6, 805.9, 502.6, 800.1, 501.6, 795.6, 506.1, 795.6, 507.9, 794.6, 509.1, 794.6, 514.9, 792.9, 516.1, 788.4, 510.9, 788.4, 499.1, 787.4, 497.9, 787.4, 494.1, 786.4, 492.9, 784.4, 485.1, 782.4, 482.9, 778.9, 474.9, 783.4, 470.9, 781.9, 468.6, 779.9, 467.9, 786.9, 464.4, 789.4, 461.9, 789.4, 460.1, 787.9, 458.6, 785.6, 458.6, 784.9, 457.9, 790.9, 454.4, 797.4, 447.9, 795.9, 445.6, 789.6, 445.1, 796.1, 440.4, 798.9, 439.4, 804.4, 433.9, 804.4, 432.1, 802.9, 430.6, 801.1, 430.6, 799.9, 431.6, 796.1, 431.6, 794.6, 432.6, 792.6, 432.1, 804.1, 424.4, 811.4, 417.9, 812.4, 415.9, 810.9, 413.6, 808.1, 413.6, 799.9, 417.6, 798.1, 417.6, 796.6, 418.6, 795.9, 417.6, 810.1, 406.4, 815.4, 401.1, 817.4, 397.9, 815.9, 395.6, 812.1, 395.6, 798.1, 403.6, 795.9, 405.6, 791.6, 407.6, 790.6, 407.1, 799.9, 398.4, 803.1, 396.4, 805.4, 392.9, 810.4, 387.9, 811.4, 385.9, 811.4, 383.1, 809.9, 381.6]], "50.44": [[804.1, 374.6, 762.6, 408.1, 761.6, 410.1, 756.6, 414.9, 752.6, 420.1, 750.6, 424.1, 750.6, 425.9, 748.6, 429.1, 748.1, 433.4, 739.1, 424.6, 734.9, 421.6, 730.9, 419.6, 728.1, 419.6, 726.9, 418.6, 722.1, 418.6, 720.9, 417.6, 710.1, 417.6, 708.9, 418.6, 705.1, 418.6, 697.9, 421.6, 695.1, 421.6, 679.9, 431.1, 679.4, 430.4, 680.4, 428.1, 684.4, 421.1, 688.9, 416.4, 694.1, 412.4, 695.9, 412.4, 700.1, 410.4, 707.9, 410.4, 709.1, 411.4, 712.9, 411.4, 715.1, 413.4, 716.9, 413.4, 718.4, 411.9, 716.9, 409.6, 709.9, 406.6, 699.1, 406.6, 697.9, 407.6, 695.1, 407.6, 693.9, 408.6, 689.1, 409.6, 685.1, 411.6, 680.9, 414.6, 673.6, 421.9, 670.6, 426.1, 667.6, 432.1, 667.6, 435.9, 666.6, 437.1, 667.1, 441.1, 664.9, 442.6, 659.1, 442.6, 657.6, 444.1, 662.1, 449.6, 660.6, 452.9, 662.6, 455.1, 665.1, 455.9, 664.4, 457.1, 657.9, 454.6, 655.1, 454.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 650.9, 456.4, 654.1, 459.4, 657.9, 460.4, 660.1, 461.9, 658.6, 464.9, 661.1, 467.4, 664.6, 467.4, 667.6, 474.9, 672.6, 479.9, 673.4, 480.9, 672.9, 481.6, 664.1, 481.6, 659.9, 479.6, 650.1, 479.6, 648.1, 478.6, 644.9, 480.6, 643.1, 480.6, 641.9, 479.6, 627.1, 479.6, 625.9, 480.6, 617.1, 480.6, 615.9, 481.6, 607.1, 481.6, 605.9, 482.6, 594.1, 482.6, 592.9, 483.6, 579.1, 483.6, 577.9, 484.6, 573.1, 484.6, 571.6, 486.1, 571.6, 487.9, 577.1, 492.4, 582.9, 493.4, 584.1, 494.4, 586.9, 494.4, 588.1, 495.4, 593.9, 495.4, 595.1, 496.4, 604.1, 496.9, 603.4, 497.6, 598.1, 497.6, 596.9, 498.6, 594.1, 498.6, 588.9, 500.6, 581.1, 501.6, 577.6, 504.1, 577.6, 505.9, 581.1, 508.4, 582.9, 508.4, 584.1, 509.4, 589.9, 509.4, 591.1, 510.4, 612.4, 510.4, 613.1, 510.9, 612.4, 511.6, 610.1, 511.6, 600.1, 515.6, 597.6, 518.9, 601.1, 521.4, 615.9, 521.4, 617.1, 520.4, 621.9, 520.4, 623.1, 519.4, 625.9, 519.4, 627.4, 518.4, 628.1, 519.4, 621.6, 525.1, 623.1, 527.4, 633.9, 527.4, 637.1, 525.4, 642.9, 524.4, 646.1, 522.9, 646.6, 523.6, 645.6, 525.1, 640.6, 529.1, 642.1, 531.4, 646.9, 531.4, 652.1, 528.4, 653.9, 528.4, 656.1, 526.4, 659.4, 525.1, 661.6, 522.9, 662.4, 523.1, 662.4, 524.1, 658.1, 527.4, 656.6, 530.1, 656.6, 531.9, 658.1, 533.4, 664.9, 531.4, 673.1, 524.4, 674.6, 525.4, 672.6, 529.1, 674.1, 531.4, 675.9, 531.4, 679.1, 528.4, 680.9, 528.4, 683.9, 525.6, 686.1, 528.4, 686.9, 528.4, 690.6, 523.9, 691.6, 524.4, 691.6, 525.9, 693.1, 527.4, 696.1, 525.4, 698.9, 525.4, 705.9, 534.4, 710.9, 537.4, 714.1, 540.4, 717.1, 542.4, 720.9, 543.4, 723.1, 545.4, 726.9, 545.4, 728.1, 546.4, 729.9, 546.4, 731.1, 547.6, 730.6, 550.9, 727.6, 558.1, 727.6, 560.9, 729.1, 562.4, 730.9, 562.4, 732.1, 561.4, 735.4, 557.9, 736.9, 554.9, 737.6, 555.6, 737.6, 558.9, 739.1, 560.4, 740.9, 560.4, 742.4, 558.9, 745.9, 552.9, 748.1, 555.4, 749.9, 555.4, 753.4, 550.9, 753.4, 547.6, 754.1, 546.6, 754.6, 547.9, 756.9, 549.4, 758.4, 547.9, 758.4, 546.1, 762.6, 542.9, 763.6, 543.4, 764.6, 547.9, 765.6, 549.1, 768.1, 551.4, 770.9, 551.4, 772.4, 549.9, 772.4, 548.1, 770.4, 545.9, 770.4, 544.1, 769.4, 542.9, 769.4, 537.1, 770.6, 535.9, 773.9, 536.4, 781.1, 528.4, 784.9, 529.4, 787.1, 526.4, 793.4, 524.9, 795.6, 526.1, 795.6, 530.9, 796.6, 532.1, 799.1, 534.4, 802.9, 534.4, 804.4, 532.1, 800.4, 528.9, 799.4, 526.9, 800.4, 523.1, 805.4, 515.1, 810.1, 511.4, 812.4, 508.1, 809.6, 506.1, 810.4, 503.1, 808.9, 501.6, 807.1, 501.6, 805.9, 502.6, 800.1, 501.6, 796.6, 505.1, 794.6, 509.1, 794.6, 515.9, 793.6, 516.6, 792.4, 515.9, 791.4, 513.1, 788.4, 510.9, 788.4, 499.1, 787.4, 497.9, 787.4, 494.1, 786.4, 492.9, 784.4, 485.1, 781.4, 480.9, 781.4, 479.1, 778.9, 473.9, 780.9, 473.4, 783.4, 470.9, 783.4, 469.1, 780.9, 466.9, 786.9, 463.4, 790.4, 459.9, 789.1, 457.6, 785.9, 455.9, 792.9, 451.4, 797.4, 446.9, 797.4, 445.1, 794.9, 442.6, 792.9, 443.6, 790.6, 443.6, 789.9, 442.9, 799.9, 435.4, 804.4, 429.9, 804.4, 428.1, 802.9, 426.6, 798.1, 427.6, 794.9, 429.6, 793.1, 429.6, 792.6, 428.9, 795.1, 426.4, 800.1, 423.4, 811.4, 411.9, 811.4, 410.1, 809.9, 408.6, 807.1, 408.6, 799.1, 412.6, 796.9, 414.6, 794.6, 415.6, 793.9, 414.6, 809.4, 399.1, 813.4, 393.9, 813.4, 390.1, 811.9, 388.6, 803.1, 393.6, 790.1, 403.4, 788.6, 403.1, 792.9, 399.6, 805.4, 382.9, 807.4, 378.9, 807.4, 377.1], [652.1, 468.6, 650.6, 470.1, 652.1, 472.4, 658.9, 474.4, 663.1, 479.4, 665.4, 477.9, 665.4, 475.1, 661.9, 471.6, 659.1, 471.6, 653.9, 468.6]], "50.52": [[799.1, 369.6, 766.1, 402.6, 762.6, 404.9, 753.6, 417.1, 749.6, 425.1, 748.1, 432.4, 746.4, 431.1, 744.1, 427.6, 733.9, 419.6, 728.9, 417.6, 726.1, 417.6, 724.9, 416.6, 722.9, 417.6, 721.1, 417.6, 719.9, 416.6, 711.1, 416.6, 709.9, 417.6, 705.1, 417.6, 697.9, 420.6, 695.1, 420.6, 686.1, 425.6, 678.9, 431.4, 678.4, 430.4, 683.4, 421.1, 692.1, 412.4, 699.1, 409.4, 704.9, 409.4, 707.1, 411.4, 713.9, 410.4, 716.9, 412.4, 718.4, 410.9, 717.4, 408.9, 710.9, 405.6, 699.1, 405.6, 697.9, 406.6, 694.1, 406.6, 683.1, 411.6, 678.9, 414.6, 671.6, 423.1, 667.6, 431.1, 667.6, 433.9, 665.6, 437.1, 667.1, 440.1, 664.9, 441.6, 661.1, 441.6, 659.1, 440.6, 657.6, 442.1, 660.6, 447.1, 663.1, 448.9, 661.6, 451.9, 664.1, 454.4, 666.9, 454.4, 667.6, 455.1, 667.6, 456.9, 665.6, 458.1, 660.9, 455.6, 658.1, 455.6, 651.9, 452.6, 650.1, 452.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 650.9, 456.4, 654.1, 459.4, 659.6, 461.4, 660.1, 462.4, 658.6, 464.9, 661.1, 467.4, 664.6, 467.4, 664.6, 468.9, 667.6, 474.9, 673.1, 480.6, 672.9, 481.4, 667.1, 480.6, 662.9, 478.6, 659.1, 478.6, 654.9, 476.6, 651.1, 476.6, 649.9, 475.6, 642.1, 475.6, 640.9, 474.6, 637.1, 474.6, 635.9, 475.6, 590.1, 475.6, 588.9, 474.6, 572.1, 474.6, 569.6, 477.9, 576.1, 483.4, 579.9, 484.4, 583.1, 486.4, 589.9, 487.4, 594.1, 489.4, 600.9, 489.4, 604.1, 490.9, 603.4, 491.6, 591.1, 491.6, 589.9, 492.6, 583.1, 492.6, 581.9, 493.6, 578.1, 493.6, 576.9, 494.6, 575.1, 494.6, 573.6, 496.9, 576.1, 499.4, 580.1, 501.4, 582.9, 501.4, 584.1, 502.4, 586.9, 502.4, 592.1, 504.4, 610.4, 504.4, 611.1, 504.9, 610.4, 505.6, 603.1, 506.6, 595.1, 509.6, 593.6, 511.1, 593.6, 512.9, 595.1, 514.4, 597.1, 515.4, 599.9, 515.4, 601.1, 516.4, 617.9, 516.4, 619.1, 515.4, 623.6, 515.4, 624.1, 516.4, 622.9, 517.6, 619.1, 519.6, 616.6, 522.1, 618.1, 524.4, 631.9, 524.4, 633.1, 523.4, 635.9, 523.4, 640.1, 521.4, 642.9, 521.4, 643.4, 521.9, 637.6, 527.1, 639.1, 529.4, 643.9, 529.4, 645.1, 528.4, 647.9, 528.4, 650.1, 526.4, 656.9, 524.4, 657.4, 525.1, 654.6, 529.1, 654.6, 530.9, 656.1, 532.4, 658.9, 532.4, 661.1, 530.4, 663.9, 530.4, 673.1, 523.9, 673.6, 524.6, 672.6, 526.9, 670.6, 529.1, 670.6, 529.9, 672.9, 531.4, 674.1, 530.4, 675.9, 530.4, 679.1, 527.4, 683.6, 524.9, 686.9, 526.4, 690.1, 523.6, 690.6, 525.9, 692.9, 527.4, 696.1, 524.4, 698.9, 524.4, 704.6, 533.1, 714.1, 540.4, 724.1, 545.4, 726.9, 545.4, 730.4, 546.9, 728.6, 553.9, 725.6, 560.1, 725.6, 562.9, 727.1, 564.4, 731.1, 562.4, 734.4, 558.9, 735.9, 555.9, 736.6, 557.6, 735.6, 559.9, 738.9, 562.4, 742.4, 558.9, 744.9, 552.9, 745.6, 553.6, 745.6, 555.9, 747.1, 557.4, 748.9, 557.4, 752.4, 553.9, 753.9, 550.9, 756.9, 551.4, 758.4, 549.9, 759.4, 547.9, 758.9, 544.9, 761.6, 542.9, 762.6, 543.4, 762.6, 544.9, 764.6, 548.9, 766.9, 551.4, 768.1, 552.4, 770.9, 551.4, 772.4, 549.1, 769.4, 545.9, 769.4, 544.1, 768.4, 542.9, 768.4, 541.1, 769.4, 539.9, 769.4, 536.4, 772.9, 536.4, 774.1, 535.4, 779.4, 530.1, 780.4, 528.9, 780.4, 527.1, 781.4, 526.4, 784.9, 529.4, 787.1, 526.4, 789.1, 525.4, 794.9, 525.4, 795.6, 526.1, 795.6, 529.9, 797.6, 533.1, 799.1, 534.4, 802.9, 534.4, 804.4, 532.1, 800.4, 528.9, 799.4, 526.9, 800.4, 523.1, 805.4, 515.1, 810.1, 511.4, 812.4, 508.1, 809.6, 506.1, 810.4, 503.1, 808.9, 501.6, 807.1, 501.6, 805.9, 502.6, 800.1, 501.6, 796.6, 505.1, 794.6, 509.1, 794.6, 514.9, 793.4, 516.1, 792.4, 515.6, 791.4, 513.1, 788.4, 510.9, 788.4, 498.1, 787.4, 496.9, 787.4, 493.1, 785.4, 489.9, 784.4, 485.1, 780.4, 477.9, 780.4, 476.1, 778.9, 474.4, 780.1, 472.4, 782.9, 471.4, 785.4, 468.9, 783.9, 466.6, 782.4, 466.6, 781.9, 465.6, 788.1, 461.4, 791.4, 457.9, 789.9, 455.6, 786.6, 455.6, 785.9, 454.9, 792.1, 450.4, 796.4, 446.1, 798.4, 442.9, 796.9, 440.6, 793.1, 440.6, 791.6, 441.6, 789.6, 441.1, 802.4, 429.1, 804.4, 425.9, 804.4, 424.1, 802.9, 422.6, 799.1, 423.6, 793.6, 426.6, 792.6, 425.9, 800.4, 418.9, 809.4, 406.9, 809.4, 405.1, 807.9, 403.6, 806.1, 403.6, 803.9, 405.6, 799.1, 407.6, 795.9, 410.6, 793.6, 411.6, 792.6, 411.1, 799.4, 404.1, 807.4, 393.9, 810.4, 387.9, 810.4, 385.1, 808.9, 383.6, 805.1, 384.6, 797.1, 392.6, 790.9, 397.6, 789.1, 398.4, 788.4, 397.9, 797.4, 385.9, 801.4, 377.9, 801.4, 376.1, 802.4, 374.9, 802.4, 371.1, 800.9, 369.6]], "50.64": [[794.1, 364.6, 785.6, 375.1, 782.6, 380.1, 778.6, 383.9, 776.6, 387.1, 772.6, 390.9, 770.6, 394.1, 766.6, 397.9, 757.6, 409.1, 750.6, 422.1, 748.1, 431.4, 737.9, 421.6, 728.9, 416.6, 720.1, 416.6, 718.9, 415.6, 713.1, 415.6, 711.9, 416.6, 706.1, 416.6, 704.9, 417.6, 702.1, 417.6, 700.9, 418.6, 693.1, 420.6, 682.1, 427.6, 676.9, 432.1, 676.4, 431.4, 683.4, 419.1, 687.9, 414.4, 692.1, 411.4, 698.1, 408.4, 705.9, 408.4, 708.1, 410.4, 710.9, 410.4, 712.1, 409.4, 713.9, 409.4, 715.4, 407.9, 713.9, 405.6, 711.9, 404.6, 698.1, 404.6, 696.9, 405.6, 691.1, 406.6, 678.9, 413.6, 670.6, 423.1, 667.6, 429.1, 667.6, 432.9, 665.6, 435.1, 665.6, 437.9, 667.1, 440.1, 659.1, 440.6, 657.6, 442.1, 661.1, 446.4, 665.4, 446.9, 661.6, 451.9, 663.1, 453.4, 665.9, 453.4, 667.6, 455.1, 666.6, 457.1, 664.6, 458.1, 660.9, 455.6, 655.1, 454.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 650.9, 456.4, 654.1, 459.4, 657.9, 460.4, 661.1, 462.4, 663.6, 462.4, 665.6, 471.9, 672.4, 479.9, 671.9, 480.6, 665.1, 479.6, 663.9, 478.6, 662.1, 478.6, 648.9, 473.6, 644.1, 473.6, 642.9, 472.6, 636.1, 472.6, 634.9, 471.6, 623.1, 471.6, 621.9, 470.6, 609.1, 470.6, 607.9, 469.6, 601.1, 469.6, 599.9, 468.6, 593.1, 468.6, 591.9, 467.6, 585.1, 467.6, 583.9, 466.6, 577.1, 466.6, 575.9, 465.6, 571.1, 465.6, 569.6, 467.1, 569.6, 468.9, 575.1, 474.4, 587.1, 480.4, 588.9, 480.4, 590.1, 481.4, 602.1, 484.9, 601.4, 485.6, 574.1, 485.6, 571.6, 488.9, 577.1, 493.4, 587.1, 497.4, 589.9, 497.4, 591.1, 498.4, 597.9, 498.4, 599.1, 499.4, 608.9, 499.6, 609.1, 500.1, 606.9, 501.6, 602.1, 501.6, 600.9, 502.6, 596.1, 502.6, 594.9, 503.6, 593.1, 503.6, 591.6, 505.1, 591.6, 507.9, 595.1, 510.4, 600.9, 511.4, 602.1, 512.4, 618.9, 512.4, 620.1, 511.4, 624.4, 511.4, 624.9, 512.4, 623.1, 512.6, 615.9, 516.6, 614.6, 518.1, 614.6, 519.9, 616.1, 521.4, 629.9, 521.4, 631.1, 520.4, 640.9, 519.4, 641.4, 520.1, 639.9, 521.6, 634.6, 525.1, 634.6, 526.9, 636.1, 528.4, 641.9, 528.4, 645.1, 526.4, 647.9, 526.4, 650.1, 524.4, 656.9, 522.4, 657.4, 523.1, 652.6, 529.9, 654.1, 531.4, 658.9, 531.4, 661.1, 529.4, 664.9, 528.4, 673.1, 521.9, 673.6, 522.6, 672.6, 524.9, 668.6, 529.1, 668.6, 529.9, 670.9, 531.4, 679.9, 526.4, 683.9, 522.6, 686.1, 525.4, 690.1, 522.6, 690.6, 524.9, 692.1, 526.4, 695.6, 523.9, 697.9, 524.4, 699.1, 523.6, 699.6, 525.9, 706.1, 534.4, 709.9, 536.4, 717.1, 542.4, 718.9, 542.4, 724.1, 545.4, 727.9, 545.4, 730.1, 546.9, 726.6, 554.1, 725.6, 558.9, 723.6, 562.1, 723.6, 563.9, 725.1, 565.4, 727.9, 565.4, 729.1, 564.4, 734.9, 556.9, 735.6, 558.6, 734.6, 560.1, 734.6, 562.9, 736.1, 564.4, 737.9, 564.4, 740.4, 562.1, 743.9, 554.9, 745.6, 558.1, 747.9, 559.4, 752.4, 554.9, 752.9, 552.6, 755.9, 553.4, 758.4, 550.9, 759.4, 548.9, 758.9, 544.6, 760.6, 542.9, 762.6, 545.1, 762.6, 546.9, 764.6, 550.1, 767.1, 552.4, 768.9, 552.4, 771.4, 549.1, 768.4, 545.9, 768.4, 538.1, 769.9, 535.9, 772.9, 536.4, 774.1, 535.4, 781.1, 526.4, 787.9, 526.4, 792.9, 524.4, 795.6, 526.1, 795.6, 529.9, 797.6, 533.1, 799.1, 534.4, 801.9, 534.4, 803.4, 532.1, 800.4, 528.9, 799.4, 525.1, 804.4, 516.1, 806.9, 513.4, 810.1, 511.4, 812.4, 508.1, 809.6, 506.1, 810.4, 503.1, 808.9, 501.6, 807.1, 501.6, 805.9, 502.6, 800.1, 501.6, 797.6, 503.9, 795.6, 507.1, 795.6, 508.9, 794.6, 510.1, 794.6, 515.9, 793.6, 516.6, 792.4, 515.9, 791.4, 513.1, 788.4, 510.9, 788.4, 498.1, 787.4, 496.9, 787.4, 493.1, 786.4, 491.9, 784.4, 484.1, 782.4, 481.9, 781.4, 478.1, 778.9, 473.4, 779.4, 472.4, 780.9, 472.4, 785.4, 468.9, 785.4, 467.1, 782.9, 464.6, 788.9, 460.4, 791.4, 456.9, 789.9, 454.6, 786.6, 454.6, 785.9, 453.9, 791.1, 450.4, 796.4, 445.1, 798.4, 441.9, 798.4, 440.1, 796.9, 438.6, 795.1, 438.6, 790.6, 440.6, 789.9, 439.6, 799.4, 430.1, 804.4, 422.9, 802.9, 420.6, 800.1, 420.6, 793.9, 424.6, 791.9, 425.1, 791.4, 424.4, 801.4, 413.9, 808.4, 402.9, 808.4, 401.1, 806.9, 399.6, 805.1, 399.6, 792.1, 409.4, 790.6, 409.1, 798.4, 399.9, 804.4, 390.9, 808.4, 382.9, 808.4, 380.1, 806.9, 378.6, 805.1, 378.6, 803.9, 379.6, 800.1, 383.6, 796.9, 385.6, 789.9, 393.6, 786.1, 396.4, 785.4, 395.9, 791.4, 386.9, 797.4, 374.9, 797.4, 367.1]], "50.72": [[789.1, 361.6, 786.6, 364.1, 783.6, 369.9, 779.6, 375.1, 778.6, 377.9, 770.6, 388.1, 767.6, 393.9, 763.6, 398.1, 761.6, 401.9, 756.6, 408.1, 751.6, 418.1, 748.1, 430.4, 744.1, 425.6, 737.9, 420.6, 735.1, 419.6, 729.9, 415.6, 720.1, 415.6, 718.9, 414.6, 713.1, 414.6, 711.9, 415.6, 706.1, 415.6, 704.9, 416.6, 702.1, 416.6, 700.9, 417.6, 693.1, 419.6, 682.1, 426.6, 676.9, 431.6, 675.9, 431.4, 675.4, 430.1, 678.4, 426.9, 683.4, 417.1, 693.1, 409.4, 698.1, 407.4, 700.9, 407.4, 702.4, 405.9, 700.9, 403.6, 698.1, 403.6, 696.9, 404.6, 691.1, 405.6, 683.1, 409.6, 678.9, 412.6, 673.6, 417.9, 667.6, 427.1, 666.6, 432.9, 665.6, 434.1, 666.1, 439.1, 662.1, 439.6, 660.9, 438.6, 659.1, 438.6, 657.6, 440.1, 658.6, 442.1, 662.1, 445.4, 664.9, 445.4, 665.6, 446.4, 664.9, 447.6, 663.1, 447.6, 661.6, 449.1, 663.1, 451.4, 664.9, 451.4, 667.1, 453.6, 665.6, 457.1, 663.6, 458.1, 659.9, 455.6, 655.1, 454.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 650.9, 456.4, 654.1, 459.4, 657.9, 460.4, 661.1, 462.4, 663.1, 461.9, 663.6, 462.6, 662.6, 464.9, 665.6, 470.1, 665.6, 471.9, 672.1, 479.6, 671.9, 480.4, 655.1, 475.6, 649.9, 472.6, 647.1, 472.6, 645.9, 471.6, 639.1, 470.6, 634.9, 468.6, 630.1, 468.6, 628.9, 467.6, 622.1, 467.6, 620.9, 466.6, 614.1, 466.6, 612.9, 465.6, 601.1, 464.6, 599.9, 463.6, 596.1, 463.6, 593.9, 461.6, 590.1, 461.6, 588.9, 460.6, 585.1, 460.6, 583.9, 459.6, 581.1, 459.6, 575.9, 457.6, 572.1, 457.6, 569.6, 460.9, 576.1, 467.4, 583.9, 471.4, 586.1, 473.4, 599.1, 479.1, 583.1, 479.6, 581.9, 478.6, 573.1, 478.6, 571.1, 479.6, 569.6, 481.9, 575.1, 486.4, 583.1, 490.4, 584.9, 490.4, 589.1, 492.4, 591.9, 492.4, 593.1, 493.4, 595.9, 493.4, 597.1, 494.4, 599.9, 494.4, 601.1, 495.4, 607.9, 495.6, 607.4, 496.6, 602.1, 496.6, 600.9, 497.6, 594.1, 497.6, 592.9, 498.6, 590.1, 498.6, 587.6, 501.9, 590.1, 504.4, 594.1, 506.4, 595.9, 506.4, 597.1, 507.4, 600.9, 507.4, 602.1, 508.4, 622.9, 508.6, 623.1, 509.1, 620.9, 510.6, 619.1, 510.6, 613.1, 513.6, 611.6, 515.1, 613.1, 517.4, 615.1, 518.4, 634.9, 518.4, 636.1, 517.4, 639.9, 516.6, 640.1, 517.4, 639.1, 518.4, 636.1, 519.6, 631.6, 523.1, 631.6, 524.9, 633.1, 526.4, 640.9, 526.4, 642.1, 525.4, 646.9, 524.4, 652.1, 521.4, 656.9, 520.4, 657.4, 521.1, 656.6, 522.1, 650.6, 528.1, 652.1, 530.4, 657.9, 530.4, 659.9, 529.4, 662.1, 526.4, 664.9, 526.4, 667.1, 524.4, 669.9, 523.4, 670.4, 524.1, 667.6, 527.1, 667.6, 529.9, 669.9, 531.4, 673.1, 528.4, 676.9, 527.4, 679.1, 524.4, 681.1, 523.9, 683.1, 526.4, 685.9, 525.4, 689.4, 521.9, 689.9, 519.9, 690.6, 520.6, 690.6, 523.9, 692.1, 525.4, 695.1, 523.4, 697.1, 524.4, 699.1, 523.9, 702.6, 529.9, 709.1, 536.4, 716.1, 541.4, 724.1, 545.4, 726.9, 545.4, 728.1, 546.6, 725.6, 553.1, 725.6, 554.9, 723.6, 558.1, 723.6, 559.9, 720.6, 564.1, 723.1, 567.4, 729.1, 564.4, 732.9, 558.9, 733.6, 559.6, 733.6, 561.9, 732.6, 563.1, 732.6, 564.9, 734.1, 566.4, 735.9, 566.4, 740.4, 561.9, 742.9, 555.9, 743.6, 556.6, 743.6, 559.9, 745.1, 561.4, 746.9, 561.4, 752.6, 554.9, 754.9, 555.4, 758.4, 551.9, 757.9, 544.9, 759.6, 543.9, 761.6, 545.1, 762.6, 548.9, 764.9, 551.4, 766.1, 552.4, 768.9, 552.4, 770.4, 550.9, 770.4, 549.1, 767.4, 545.9, 766.4, 541.1, 768.4, 537.9, 774.1, 534.4, 781.6, 525.9, 787.9, 526.4, 789.1, 525.4, 793.9, 524.4, 795.6, 526.1, 795.6, 529.9, 796.6, 531.9, 799.1, 534.4, 801.9, 534.4, 803.4, 532.1, 800.4, 528.9, 799.4, 525.1, 803.4, 517.1, 806.9, 513.4, 810.1, 511.4, 812.4, 508.1, 809.6, 506.1, 810.4, 503.1, 808.9, 501.6, 807.1, 501.6, 805.9, 502.6, 800.1, 501.6, 797.6, 503.9, 795.6, 507.1, 795.6, 508.9, 794.6, 510.1, 794.6, 514.9, 793.4, 516.1, 792.4, 515.6, 792.4, 514.1, 788.4, 509.9, 788.4, 498.1, 787.4, 496.9, 787.4, 493.1, 785.4, 489.9, 785.4, 486.1, 780.4, 476.9, 780.4, 475.1, 778.9, 473.4, 779.4, 472.4, 783.1, 470.4, 786.4, 466.9, 784.9, 464.6, 782.9, 463.9, 788.1, 460.4, 792.4, 455.9, 792.4, 454.1, 790.9, 452.6, 789.1, 452.6, 787.6, 453.6, 786.9, 452.6, 795.4, 445.1, 799.4, 438.9, 797.9, 436.6, 796.1, 436.6, 791.6, 438.6, 790.6, 437.9, 799.4, 427.9, 803.4, 420.9, 803.4, 419.1, 801.9, 417.6, 800.1, 417.6, 793.1, 422.4, 792.1, 422.6, 791.6, 421.9, 799.4, 412.9, 806.4, 400.9, 806.4, 397.1, 804.1, 395.6, 799.9, 398.6, 793.9, 404.6, 791.1, 406.4, 790.4, 405.9, 798.4, 393.9, 803.4, 383.9, 803.4, 382.1, 804.4, 380.9, 804.4, 376.1, 802.9, 374.6, 800.9, 375.6, 792.6, 383.9, 784.1, 394.4, 783.4, 393.9, 791.4, 377.9, 791.4, 375.1, 792.4, 373.9, 792.4, 367.1, 793.4, 365.1, 790.9, 361.6]], "50.80": [[784.1, 358.6, 781.6, 361.1, 766.6, 390.9, 757.6, 404.1, 751.6, 417.1, 751.6, 418.9, 750.6, 420.1, 750.6, 421.9, 748.1, 428.4, 741.9, 422.6, 733.9, 416.6, 729.9, 414.6, 720.1, 414.6, 718.9, 413.6, 711.1, 413.6, 709.9, 414.6, 706.1, 414.6, 704.9, 415.6, 702.1, 415.6, 700.9, 416.6, 693.1, 418.6, 678.4, 428.1, 675.9, 432.1, 675.4, 429.1, 677.4, 426.9, 677.4, 425.1, 679.4, 422.9, 682.4, 417.1, 686.9, 412.4, 692.1, 408.4, 693.9, 408.4, 697.1, 406.4, 699.9, 406.4, 702.4, 404.9, 706.9, 405.4, 708.1, 406.4, 712.9, 406.4, 720.9, 410.4, 722.4, 408.1, 719.9, 405.6, 716.1, 404.6, 712.9, 402.6, 710.1, 402.6, 708.9, 401.6, 703.1, 401.6, 701.4, 403.1, 697.1, 402.6, 695.9, 403.6, 690.1, 404.6, 684.1, 407.6, 674.6, 414.9, 668.6, 423.1, 666.6, 427.1, 666.6, 430.9, 664.6, 433.1, 664.6, 435.9, 666.1, 438.1, 665.4, 438.6, 663.9, 437.6, 659.1, 437.6, 657.6, 439.1, 661.9, 444.4, 665.1, 445.9, 661.6, 448.1, 661.6, 449.9, 663.1, 451.4, 665.6, 451.4, 666.6, 453.1, 665.6, 455.1, 662.6, 457.1, 659.9, 455.6, 655.1, 454.6, 651.9, 452.6, 650.1, 452.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 650.9, 456.4, 654.1, 459.4, 658.4, 460.9, 657.6, 463.9, 660.1, 466.4, 663.6, 466.4, 664.6, 469.9, 666.6, 472.1, 666.6, 473.9, 671.4, 478.9, 670.9, 479.6, 669.1, 479.6, 663.9, 476.6, 659.1, 476.6, 650.9, 472.6, 645.1, 471.6, 631.9, 466.6, 629.1, 466.6, 625.9, 464.6, 623.1, 464.6, 621.9, 463.6, 617.1, 463.6, 615.9, 462.6, 609.1, 462.6, 605.9, 459.6, 603.1, 459.6, 601.9, 458.6, 600.1, 458.6, 598.9, 457.6, 597.1, 457.6, 595.9, 456.6, 594.1, 456.6, 592.9, 455.6, 591.1, 455.6, 589.9, 454.6, 588.1, 454.6, 574.9, 449.6, 572.1, 449.6, 570.6, 451.1, 570.6, 453.9, 571.6, 455.1, 577.9, 461.4, 583.1, 465.4, 585.9, 466.4, 589.1, 469.4, 597.9, 473.4, 600.1, 475.1, 597.1, 475.6, 595.9, 474.6, 582.1, 473.6, 580.9, 472.6, 571.1, 472.6, 569.6, 474.1, 569.6, 475.9, 572.9, 479.4, 577.1, 482.4, 581.1, 484.4, 582.9, 484.4, 586.1, 486.4, 587.9, 486.4, 595.1, 489.4, 598.9, 489.4, 600.1, 490.4, 604.9, 490.4, 606.1, 491.4, 609.9, 491.6, 609.4, 492.6, 588.1, 493.6, 585.6, 496.1, 585.6, 497.9, 591.1, 501.4, 592.9, 501.4, 597.1, 503.4, 599.9, 503.4, 601.1, 504.4, 614.9, 504.4, 616.1, 505.4, 622.9, 505.6, 622.4, 506.6, 615.1, 508.6, 611.1, 510.6, 609.6, 512.9, 612.1, 515.4, 615.9, 515.4, 617.1, 516.4, 633.9, 516.4, 635.4, 515.4, 638.1, 515.6, 637.9, 516.4, 634.1, 517.6, 629.6, 522.1, 631.1, 524.4, 633.1, 525.4, 635.9, 525.4, 637.1, 524.4, 641.9, 524.4, 645.1, 522.4, 647.9, 522.4, 650.1, 520.4, 652.9, 520.4, 655.1, 519.4, 655.4, 521.1, 652.6, 522.9, 650.6, 526.1, 650.6, 527.9, 652.1, 529.4, 658.9, 528.4, 662.1, 525.4, 664.9, 525.4, 668.4, 522.4, 669.1, 523.4, 666.6, 527.1, 666.6, 528.9, 668.1, 530.4, 669.9, 530.4, 673.1, 527.4, 674.9, 527.4, 679.1, 523.4, 680.6, 523.9, 680.6, 525.9, 682.9, 527.4, 689.4, 519.4, 690.6, 520.4, 689.6, 522.9, 691.1, 524.4, 692.9, 524.4, 694.9, 521.9, 697.1, 523.4, 699.1, 522.9, 702.6, 529.9, 706.9, 534.4, 716.1, 541.4, 717.9, 541.4, 722.1, 544.4, 723.9, 544.4, 727.1, 545.9, 724.6, 552.1, 724.6, 553.9, 722.6, 557.1, 722.6, 558.9, 718.6, 565.1, 718.6, 566.9, 720.1, 568.4, 722.9, 568.4, 726.1, 566.4, 730.4, 561.9, 731.9, 558.9, 732.6, 560.6, 731.6, 562.1, 731.6, 566.9, 733.1, 568.4, 738.4, 564.1, 741.4, 559.9, 741.9, 557.9, 742.6, 558.6, 742.6, 561.9, 744.1, 563.4, 745.9, 563.4, 750.4, 559.1, 751.9, 555.9, 754.1, 557.4, 756.4, 555.9, 758.4, 551.9, 757.9, 544.6, 758.6, 543.9, 760.6, 545.1, 760.6, 546.9, 762.6, 550.1, 766.9, 553.4, 769.4, 550.9, 769.4, 549.1, 766.4, 544.9, 766.4, 540.1, 771.1, 535.4, 773.9, 534.4, 780.1, 526.4, 786.9, 526.4, 791.1, 524.4, 793.9, 524.4, 795.6, 526.1, 795.6, 529.9, 796.6, 531.9, 799.1, 534.4, 801.9, 534.4, 803.4, 532.1, 799.4, 526.9, 800.4, 522.1, 804.4, 515.9, 808.1, 512.4, 811.9, 510.4, 813.4, 508.1, 811.9, 506.6, 809.6, 506.1, 810.4, 503.1, 808.9, 501.6, 806.1, 501.6, 804.9, 502.6, 802.9, 501.6, 800.1, 501.6, 795.6, 506.1, 795.6, 507.9, 794.6, 509.1, 794.6, 514.9, 793.1, 515.6, 791.4, 513.9, 788.4, 509.9, 788.4, 498.1, 787.4, 496.9, 787.4, 493.1, 785.4, 488.9, 785.4, 486.1, 784.4, 484.9, 784.4, 483.1, 781.4, 478.9, 781.4, 477.1, 778.9, 471.9, 782.9, 470.4, 786.4, 466.9, 784.4, 463.1, 793.4, 454.9, 793.4, 453.1, 791.9, 451.6, 789.1, 451.6, 788.6, 450.9, 796.4, 443.1, 799.4, 438.9, 799.4, 436.1, 797.9, 434.6, 791.6, 437.6, 790.6, 436.9, 799.4, 425.9, 804.4, 416.1, 802.9, 414.6, 801.1, 414.6, 796.1, 417.6, 792.4, 421.1, 791.4, 420.4, 798.4, 410.9, 801.4, 404.1, 803.4, 401.9, 805.4, 396.9, 805.4, 394.1, 803.9, 392.6, 802.1, 392.6, 798.1, 396.6, 796.1, 397.6, 789.1, 405.4, 788.4, 404.9, 792.4, 398.9, 799.4, 384.9, 799.4, 382.1, 801.4, 377.9, 801.4, 373.1, 799.9, 371.6, 798.1, 371.6, 796.9, 372.6, 792.6, 376.9, 784.6, 388.9, 781.9, 391.4, 781.4, 390.4, 784.4, 384.9, 784.4, 383.1, 786.4, 378.9, 786.4, 376.1, 787.4, 374.9, 787.4, 372.1, 788.4, 370.9, 788.4, 361.1, 785.9, 358.6]], "50.88": [[779.1, 355.6, 775.6, 360.1, 774.6, 364.9, 772.6, 368.1, 772.6, 369.9, 769.6, 376.1, 769.6, 377.9, 763.6, 389.1, 763.6, 390.9, 760.6, 396.9, 758.6, 399.1, 754.6, 407.1, 754.6, 408.9, 753.6, 410.1, 753.6, 411.9, 752.6, 413.1, 752.6, 414.9, 751.6, 416.1, 751.6, 417.9, 750.6, 419.1, 750.6, 420.9, 748.1, 427.4, 743.9, 422.6, 730.9, 413.6, 723.1, 413.6, 721.9, 412.6, 708.1, 412.6, 706.9, 413.6, 704.1, 413.6, 702.9, 414.6, 695.1, 416.6, 691.1, 418.6, 678.9, 426.6, 676.6, 429.1, 675.9, 431.4, 674.9, 427.6, 677.4, 424.9, 677.4, 423.1, 679.4, 420.9, 682.4, 415.1, 685.9, 411.4, 690.1, 408.4, 699.1, 404.4, 710.9, 404.4, 712.1, 405.4, 714.9, 405.4, 716.4, 403.1, 712.9, 400.6, 699.1, 400.6, 697.9, 401.6, 695.1, 401.6, 693.9, 402.6, 689.1, 403.6, 680.1, 408.6, 671.6, 416.9, 665.6, 427.1, 664.6, 434.9, 666.1, 437.1, 665.4, 437.6, 663.9, 436.6, 660.1, 436.6, 658.6, 438.1, 659.6, 440.1, 665.6, 446.1, 664.6, 448.9, 666.1, 452.4, 664.6, 455.1, 661.6, 457.1, 657.9, 454.6, 655.1, 454.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 650.9, 456.4, 654.1, 459.4, 660.1, 462.4, 662.4, 461.9, 663.6, 463.1, 663.6, 466.9, 664.6, 468.1, 664.6, 469.9, 670.4, 477.9, 669.9, 478.6, 664.9, 476.6, 660.1, 476.6, 653.9, 473.6, 652.1, 473.6, 648.9, 471.6, 645.1, 471.6, 643.9, 470.6, 639.1, 469.6, 635.9, 467.6, 631.1, 466.6, 628.1, 462.6, 624.9, 460.6, 623.1, 460.6, 620.9, 462.6, 619.1, 462.6, 618.4, 461.9, 618.4, 460.1, 614.9, 457.6, 607.1, 455.6, 603.9, 453.6, 602.1, 453.6, 599.9, 451.6, 597.1, 451.6, 593.9, 449.6, 592.1, 449.6, 577.9, 442.6, 573.1, 442.6, 571.6, 444.1, 571.6, 445.9, 572.6, 447.1, 580.9, 456.4, 591.1, 464.4, 592.9, 464.4, 599.1, 469.1, 597.4, 469.6, 595.9, 468.6, 592.1, 468.6, 590.9, 467.6, 587.1, 467.6, 585.9, 466.6, 579.1, 466.6, 574.9, 464.6, 570.1, 464.6, 568.6, 466.1, 568.6, 467.9, 578.1, 476.4, 588.1, 481.4, 592.9, 482.4, 599.1, 485.4, 601.9, 485.4, 604.9, 486.6, 604.4, 487.6, 586.1, 487.6, 583.6, 490.1, 583.6, 491.9, 585.1, 493.4, 598.1, 499.4, 619.9, 502.6, 619.4, 503.6, 615.1, 504.6, 611.1, 506.6, 609.6, 508.1, 609.6, 509.9, 613.1, 512.4, 616.9, 512.4, 618.1, 513.4, 633.6, 513.4, 634.1, 514.4, 632.9, 515.6, 627.6, 519.1, 630.1, 522.4, 633.9, 523.4, 635.1, 522.4, 643.9, 521.4, 645.1, 520.4, 652.9, 518.4, 653.4, 519.1, 650.6, 522.9, 647.6, 525.1, 647.6, 526.9, 649.1, 528.4, 653.9, 528.4, 655.1, 527.4, 657.9, 527.4, 661.1, 524.4, 663.9, 524.4, 667.1, 521.6, 667.6, 522.6, 664.6, 527.9, 666.1, 529.4, 668.9, 529.4, 675.9, 525.4, 678.9, 522.6, 679.6, 523.1, 679.6, 524.9, 681.9, 526.4, 686.9, 521.6, 689.1, 524.4, 689.9, 524.4, 694.6, 520.9, 699.1, 520.9, 699.6, 524.9, 707.1, 534.4, 710.9, 536.4, 715.1, 540.4, 723.1, 544.4, 724.9, 544.4, 726.1, 545.6, 724.6, 550.9, 716.6, 566.1, 719.1, 569.4, 722.9, 568.4, 729.9, 560.9, 730.6, 562.6, 729.6, 564.1, 729.6, 567.9, 731.1, 569.4, 732.9, 569.4, 734.1, 568.4, 738.4, 563.9, 740.6, 559.9, 741.6, 560.4, 741.6, 563.9, 743.9, 565.4, 750.9, 557.9, 753.9, 558.4, 756.4, 555.9, 757.4, 553.9, 757.4, 550.1, 758.4, 548.9, 758.4, 546.1, 757.4, 544.6, 757.9, 543.9, 759.4, 544.9, 759.6, 546.9, 761.6, 550.1, 765.1, 553.4, 766.9, 553.4, 769.4, 550.1, 765.4, 544.9, 765.4, 540.1, 768.1, 538.4, 771.1, 534.4, 776.9, 530.4, 780.6, 525.9, 786.9, 526.4, 792.1, 523.4, 795.6, 526.1, 795.6, 529.9, 797.6, 533.1, 799.1, 534.4, 801.9, 534.4, 803.4, 532.1, 799.4, 526.9, 800.4, 522.1, 805.4, 514.1, 810.1, 510.4, 811.9, 510.4, 813.4, 508.9, 811.9, 506.6, 810.1, 506.6, 809.4, 505.9, 810.4, 502.1, 808.9, 500.6, 805.4, 502.1, 802.9, 500.6, 801.1, 500.6, 797.9, 502.6, 795.6, 506.1, 795.6, 507.9, 794.6, 509.1, 794.6, 513.9, 793.4, 515.1, 791.4, 513.9, 787.9, 509.4, 788.4, 500.1, 787.4, 498.9, 787.4, 492.1, 785.4, 488.9, 784.4, 483.1, 779.4, 472.9, 781.1, 470.4, 783.9, 469.4, 787.4, 465.9, 787.4, 464.1, 784.9, 461.9, 789.9, 458.4, 794.4, 452.9, 792.9, 450.6, 789.1, 450.6, 788.6, 449.9, 792.4, 447.1, 800.4, 435.9, 800.4, 434.1, 798.9, 432.6, 795.1, 433.6, 792.6, 435.6, 791.6, 434.9, 798.4, 425.9, 803.4, 415.9, 803.4, 413.1, 801.9, 411.6, 800.1, 411.6, 795.9, 415.6, 794.1, 416.4, 793.4, 415.9, 801.4, 400.9, 801.4, 399.1, 803.4, 394.9, 803.4, 390.1, 801.1, 388.6, 790.9, 398.6, 789.1, 401.4, 788.4, 400.9, 795.4, 385.9, 795.4, 383.1, 797.4, 377.9, 797.4, 368.1, 795.9, 366.6, 794.1, 366.6, 792.6, 367.9, 781.4, 387.1, 779.9, 388.1, 779.4, 387.4, 781.4, 382.9, 781.4, 379.1, 783.4, 373.9, 783.4, 368.1, 784.4, 366.9, 784.4, 365.1, 783.4, 363.9, 783.4, 359.1, 782.4, 357.1, 780.9, 355.6]], "50.96": [[774.1, 352.6, 772.6, 354.1, 772.6, 355.9, 771.6, 357.1, 771.6, 359.9, 770.6, 361.1, 770.6, 363.9, 768.6, 368.1, 767.6, 374.9, 763.6, 383.1, 763.6, 384.9, 760.6, 391.1, 760.6, 392.9, 755.6, 402.1, 755.6, 403.9, 751.6, 414.1, 751.6, 417.9, 749.6, 421.1, 749.6, 423.9, 748.4, 425.1, 746.9, 424.6, 743.1, 420.6, 730.9, 411.6, 719.1, 411.6, 717.9, 410.6, 712.1, 410.6, 710.9, 411.6, 706.1, 411.6, 698.9, 414.6, 696.1, 414.6, 689.9, 418.6, 685.1, 420.6, 677.6, 426.9, 674.4, 433.1, 671.6, 435.1, 669.9, 433.9, 673.1, 432.4, 674.4, 429.9, 674.4, 426.1, 676.4, 423.9, 678.4, 419.1, 682.4, 413.1, 685.1, 410.4, 691.1, 406.4, 701.1, 402.4, 708.9, 402.4, 710.1, 403.4, 713.9, 403.4, 715.4, 401.9, 713.9, 399.6, 711.1, 399.6, 709.9, 398.6, 702.1, 398.6, 700.9, 399.6, 696.1, 399.6, 694.9, 400.6, 690.1, 401.6, 682.1, 405.6, 672.6, 413.9, 668.6, 419.1, 665.6, 425.1, 665.6, 427.9, 663.6, 431.1, 663.6, 434.1, 660.1, 434.6, 658.6, 436.1, 658.6, 437.9, 663.6, 442.1, 663.6, 443.9, 665.1, 445.6, 664.6, 448.9, 665.6, 450.9, 662.6, 456.6, 661.6, 457.1, 657.9, 454.6, 655.1, 454.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 650.9, 456.4, 654.1, 459.4, 656.9, 460.4, 658.1, 461.6, 657.6, 463.9, 659.1, 465.4, 661.4, 463.9, 662.1, 461.9, 663.6, 465.1, 663.6, 466.9, 667.6, 474.9, 671.1, 477.6, 670.4, 478.6, 663.9, 475.6, 660.1, 476.6, 653.9, 473.6, 652.1, 473.6, 649.9, 471.9, 652.4, 469.9, 652.4, 469.1, 650.9, 467.6, 644.9, 464.6, 640.1, 463.6, 636.9, 461.6, 635.1, 461.6, 627.9, 458.6, 625.1, 458.6, 622.9, 456.6, 617.1, 455.6, 611.9, 452.6, 607.1, 451.6, 601.1, 448.6, 598.9, 446.6, 597.1, 446.6, 593.1, 444.6, 583.9, 438.6, 577.9, 435.6, 575.1, 435.6, 573.6, 437.1, 573.6, 439.9, 581.6, 451.1, 591.1, 459.4, 597.1, 463.4, 598.9, 463.4, 601.4, 465.1, 597.1, 465.6, 595.9, 464.6, 590.1, 464.6, 587.9, 462.6, 580.1, 461.6, 575.9, 459.6, 571.1, 459.6, 569.6, 461.1, 570.6, 463.9, 572.9, 466.4, 583.1, 474.4, 593.1, 479.4, 600.9, 481.4, 603.1, 482.9, 602.4, 483.6, 588.1, 483.6, 586.9, 484.6, 585.1, 484.6, 583.6, 486.1, 583.6, 487.9, 588.1, 491.4, 599.1, 496.4, 606.9, 497.4, 608.1, 498.4, 612.9, 498.4, 614.1, 499.4, 619.9, 499.6, 619.4, 500.6, 615.1, 501.6, 609.1, 504.6, 607.6, 506.9, 609.1, 508.4, 614.1, 510.4, 621.9, 510.4, 623.1, 511.4, 632.9, 511.6, 632.9, 512.4, 630.1, 513.6, 626.6, 517.1, 626.6, 518.9, 628.1, 520.4, 634.9, 521.4, 636.1, 520.4, 638.9, 520.4, 640.1, 519.4, 642.9, 519.4, 644.1, 518.4, 646.9, 518.4, 648.1, 517.4, 651.9, 516.6, 651.6, 518.9, 645.6, 524.1, 648.1, 527.4, 652.9, 527.4, 656.1, 525.4, 657.9, 525.4, 662.1, 522.4, 663.9, 522.4, 667.1, 519.9, 667.6, 520.6, 664.6, 524.1, 663.6, 526.9, 665.1, 528.4, 668.9, 528.4, 673.1, 524.4, 674.9, 524.4, 678.9, 521.6, 679.6, 522.6, 678.6, 524.9, 680.9, 526.4, 685.9, 520.6, 686.6, 521.1, 686.6, 522.9, 688.9, 524.4, 693.1, 520.4, 696.9, 521.4, 699.1, 518.9, 699.6, 523.9, 702.6, 529.1, 704.9, 530.4, 707.9, 534.4, 714.1, 539.4, 718.9, 541.4, 721.1, 543.4, 724.9, 544.4, 725.6, 545.4, 723.6, 548.1, 723.6, 549.9, 720.6, 555.9, 717.6, 560.1, 716.6, 563.9, 714.6, 566.1, 714.6, 567.9, 716.1, 569.4, 720.9, 569.4, 724.9, 566.4, 727.6, 562.9, 728.6, 563.4, 727.6, 568.9, 730.1, 571.4, 735.1, 568.4, 738.9, 562.9, 742.1, 566.4, 743.9, 566.4, 748.4, 562.1, 749.9, 559.6, 752.9, 560.4, 756.4, 556.9, 756.4, 555.1, 757.4, 553.9, 757.4, 546.1, 756.4, 544.6, 756.9, 543.9, 758.4, 544.9, 758.6, 546.9, 760.6, 550.1, 764.1, 553.4, 765.9, 553.4, 768.4, 550.1, 765.4, 546.9, 765.4, 545.1, 764.4, 543.9, 764.4, 539.1, 765.1, 538.4, 766.9, 538.4, 771.9, 534.4, 775.1, 530.4, 777.4, 529.1, 780.1, 525.4, 782.1, 526.4, 785.9, 526.4, 791.1, 523.4, 792.9, 523.4, 795.1, 525.6, 794.6, 528.9, 797.6, 533.1, 799.1, 534.4, 801.9, 534.4, 803.4, 532.9, 803.4, 531.1, 800.4, 528.9, 799.4, 526.9, 800.4, 521.1, 805.4, 513.9, 812.4, 508.9, 812.4, 508.1, 809.4, 505.9, 810.4, 502.1, 808.9, 500.6, 807.1, 500.6, 805.9, 501.6, 800.1, 500.6, 795.6, 505.1, 795.6, 506.9, 794.6, 508.1, 794.6, 513.9, 792.6, 515.1, 791.4, 513.9, 791.4, 512.1, 787.4, 508.9, 787.4, 505.1, 788.4, 503.9, 788.4, 502.1, 787.4, 500.9, 787.4, 492.1, 785.4, 487.9, 784.4, 482.1, 781.4, 476.9, 781.4, 474.1, 779.4, 471.4, 785.9, 467.4, 788.4, 464.9, 788.4, 463.1, 785.9, 460.6, 789.1, 458.4, 795.4, 451.9, 793.9, 449.6, 790.4, 449.6, 789.9, 448.6, 797.4, 440.9, 801.4, 433.9, 799.9, 431.6, 797.1, 431.6, 792.6, 434.6, 791.6, 433.9, 796.4, 427.9, 803.4, 412.9, 803.4, 410.1, 801.1, 408.6, 796.9, 412.6, 794.1, 414.4, 793.4, 413.9, 795.4, 409.9, 795.4, 408.1, 799.4, 400.9, 799.4, 399.1, 801.4, 394.9, 801.4, 392.1, 802.4, 390.9, 802.4, 387.1, 800.1, 385.6, 792.6, 392.9, 789.1, 397.4, 788.4, 396.9, 792.4, 386.9, 792.4, 383.1, 793.4, 381.9, 793.4, 378.1, 794.4, 376.9, 794.4, 365.1, 792.9, 363.6, 791.1, 363.6, 787.6, 367.1, 787.6, 368.9, 781.6, 380.9, 778.6, 385.1, 778.4, 381.1, 779.4, 379.9, 779.4, 374.1, 780.4, 372.9, 780.4, 360.1, 777.4, 353.9, 775.9, 352.6]], "51.04": [[770.1, 349.6, 767.6, 353.1, 767.6, 357.9, 766.6, 359.1, 766.6, 363.9, 765.6, 365.1, 765.6, 368.9, 764.6, 370.1, 763.6, 377.9, 762.6, 379.1, 758.6, 392.9, 756.6, 396.1, 756.6, 397.9, 753.6, 405.1, 753.6, 408.9, 751.6, 413.1, 751.6, 416.9, 750.6, 418.1, 750.6, 419.9, 747.9, 422.6, 740.1, 417.6, 732.9, 411.6, 731.1, 411.6, 729.9, 410.6, 724.1, 410.6, 722.9, 409.6, 709.1, 409.6, 707.9, 410.6, 700.1, 411.6, 698.9, 412.6, 694.1, 413.6, 680.1, 422.6, 675.6, 428.1, 671.9, 435.1, 669.9, 431.9, 672.4, 430.1, 674.4, 426.9, 673.9, 423.6, 676.4, 420.9, 681.4, 412.1, 687.1, 406.4, 688.9, 406.4, 695.1, 402.4, 700.9, 401.4, 702.1, 400.4, 707.9, 400.4, 710.1, 402.4, 712.1, 401.4, 714.9, 401.4, 719.1, 404.4, 720.9, 404.4, 722.1, 405.4, 724.4, 403.9, 722.9, 401.6, 719.9, 399.6, 718.1, 399.6, 714.9, 397.6, 711.1, 397.6, 709.9, 396.6, 703.1, 396.6, 701.9, 397.6, 697.1, 397.6, 695.9, 398.6, 693.1, 398.6, 682.1, 403.6, 678.1, 406.6, 670.6, 413.9, 667.6, 418.1, 665.6, 422.1, 665.6, 425.9, 663.6, 428.1, 664.1, 433.1, 663.4, 433.6, 661.1, 432.6, 659.6, 434.1, 659.6, 436.9, 663.6, 441.1, 663.6, 443.9, 664.6, 445.1, 665.1, 448.6, 661.6, 455.6, 660.6, 456.1, 655.1, 454.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 650.9, 456.4, 654.1, 459.4, 656.9, 460.4, 657.6, 461.9, 656.6, 463.9, 658.1, 465.4, 659.9, 465.4, 661.4, 463.9, 660.9, 461.9, 662.1, 461.6, 662.6, 464.9, 664.6, 467.1, 665.6, 470.9, 670.6, 476.1, 673.1, 477.4, 679.9, 477.4, 681.4, 475.9, 681.4, 469.1, 682.4, 467.9, 682.9, 458.6, 684.6, 459.1, 686.1, 461.6, 685.6, 463.9, 687.1, 465.4, 688.9, 465.4, 691.1, 462.9, 691.6, 467.9, 690.6, 469.1, 690.6, 471.9, 688.6, 475.1, 688.1, 479.6, 685.1, 479.6, 683.9, 480.6, 676.1, 479.6, 674.9, 478.6, 672.4, 478.6, 664.9, 474.6, 663.1, 474.6, 660.9, 476.6, 657.6, 475.6, 656.6, 474.9, 658.9, 474.4, 660.4, 472.1, 650.9, 465.6, 640.9, 460.6, 639.1, 460.6, 635.9, 458.6, 628.1, 456.6, 613.9, 449.6, 612.1, 449.6, 596.1, 440.6, 590.9, 436.6, 586.1, 434.6, 582.9, 431.6, 578.9, 429.6, 577.1, 429.6, 574.6, 432.1, 574.6, 433.9, 576.6, 437.9, 584.6, 448.1, 588.1, 450.4, 594.1, 456.4, 604.1, 462.9, 603.4, 463.6, 601.1, 463.6, 596.9, 460.6, 586.1, 457.6, 582.9, 455.6, 577.1, 454.6, 575.9, 453.6, 571.1, 453.6, 569.6, 455.1, 570.6, 457.9, 574.9, 462.4, 576.9, 463.4, 579.1, 466.4, 580.9, 466.4, 584.1, 469.4, 589.9, 472.4, 592.1, 474.4, 596.1, 476.4, 597.9, 476.4, 601.1, 478.4, 602.9, 478.4, 605.1, 479.9, 604.4, 480.6, 601.1, 480.6, 599.9, 479.6, 584.1, 479.6, 582.6, 481.9, 587.1, 486.4, 596.1, 491.4, 597.9, 491.4, 605.1, 494.4, 609.9, 494.4, 611.1, 495.4, 614.9, 495.4, 616.1, 496.4, 619.9, 496.6, 619.9, 497.4, 616.9, 498.6, 613.1, 498.6, 611.9, 499.6, 607.1, 500.6, 605.6, 502.9, 610.1, 506.4, 615.9, 507.4, 617.1, 508.4, 632.9, 508.6, 632.9, 509.4, 629.1, 510.6, 624.6, 514.1, 624.6, 515.9, 626.1, 517.4, 627.9, 517.4, 629.1, 518.4, 636.9, 518.4, 638.1, 517.4, 642.9, 517.4, 647.1, 515.4, 651.9, 514.6, 652.1, 515.4, 650.6, 517.1, 644.6, 522.1, 644.6, 523.9, 646.1, 525.4, 652.9, 525.4, 664.9, 519.4, 665.4, 520.1, 662.6, 523.1, 662.6, 525.9, 664.1, 527.4, 665.9, 527.4, 667.1, 526.4, 668.9, 526.4, 672.1, 523.4, 677.9, 520.6, 678.6, 521.1, 678.6, 522.9, 680.9, 524.4, 685.6, 518.9, 686.6, 519.6, 685.6, 521.9, 687.9, 523.4, 691.1, 520.4, 695.9, 520.4, 698.4, 517.9, 699.6, 519.1, 699.6, 523.9, 700.6, 525.9, 702.6, 528.9, 705.6, 531.1, 706.6, 533.1, 716.1, 540.4, 717.9, 540.4, 720.1, 542.4, 724.1, 543.9, 715.6, 561.9, 712.6, 566.1, 715.1, 569.4, 717.9, 569.4, 721.9, 567.4, 726.6, 561.9, 727.6, 562.4, 727.6, 563.9, 726.6, 565.1, 726.6, 569.9, 728.1, 571.4, 729.9, 571.4, 731.1, 570.4, 737.9, 562.9, 741.1, 567.4, 743.9, 566.4, 749.1, 560.4, 751.9, 561.4, 755.4, 557.9, 755.4, 556.1, 756.4, 554.9, 756.9, 544.6, 759.6, 550.1, 763.1, 553.4, 764.9, 553.4, 767.4, 550.1, 764.4, 546.9, 764.4, 545.1, 763.4, 543.9, 763.4, 539.1, 767.1, 537.4, 769.4, 534.9, 770.4, 532.1, 774.9, 530.4, 779.1, 525.4, 781.1, 526.4, 784.9, 526.4, 791.9, 522.4, 794.6, 525.1, 794.6, 528.9, 796.6, 531.9, 798.1, 533.4, 800.9, 533.4, 802.4, 531.9, 802.4, 530.1, 799.4, 526.9, 799.4, 525.1, 800.4, 523.9, 800.4, 520.1, 804.4, 514.1, 809.1, 510.4, 811.9, 509.4, 813.4, 507.1, 811.9, 505.6, 810.1, 505.6, 809.4, 504.9, 809.4, 502.1, 807.9, 500.6, 804.1, 500.6, 802.9, 499.6, 801.1, 499.6, 797.9, 501.6, 795.6, 504.1, 795.6, 505.9, 794.6, 507.1, 794.6, 512.9, 792.9, 514.6, 791.4, 513.9, 791.4, 512.1, 787.4, 508.9, 787.4, 492.1, 785.4, 487.9, 784.4, 482.1, 781.4, 476.9, 779.9, 471.4, 781.1, 469.4, 786.9, 466.4, 789.4, 463.9, 789.4, 462.1, 785.9, 459.9, 796.4, 449.9, 794.9, 447.6, 793.1, 447.6, 791.9, 448.6, 790.4, 448.6, 789.9, 447.6, 796.4, 440.9, 801.4, 432.9, 801.4, 430.1, 799.9, 428.6, 797.1, 429.6, 794.9, 431.6, 792.9, 432.1, 792.4, 431.4, 796.4, 425.9, 801.4, 415.9, 801.4, 414.1, 803.4, 409.9, 803.4, 407.1, 801.1, 405.6, 799.1, 406.6, 794.9, 411.6, 793.4, 411.1, 794.4, 407.1, 796.4, 403.9, 796.4, 402.1, 799.4, 395.9, 799.4, 393.1, 800.4, 391.9, 800.4, 384.1, 798.9, 382.6, 797.1, 382.6, 795.9, 383.6, 788.4, 394.9, 787.9, 395.4, 787.4, 394.6, 787.4, 392.1, 788.4, 390.9, 788.4, 389.1, 790.4, 384.9, 790.4, 382.1, 791.4, 380.9, 791.4, 363.1, 788.9, 359.6, 784.6, 363.1, 784.6, 364.9, 782.6, 368.1, 782.6, 370.9, 780.6, 374.1, 779.6, 378.9, 776.6, 383.1, 776.4, 374.1, 777.4, 372.9, 777.4, 363.1, 776.4, 361.9, 776.4, 358.1, 773.4, 351.1, 771.9, 349.6]], "51.12": [[767.1, 347.6, 764.6, 351.1, 763.6, 366.9, 762.6, 368.1, 762.6, 371.9, 761.6, 373.1, 761.6, 376.9, 760.6, 378.1, 760.6, 380.9, 759.6, 382.1, 758.6, 388.9, 757.6, 390.1, 756.6, 394.9, 754.6, 398.1, 754.6, 401.9, 753.6, 403.1, 753.6, 406.9, 751.6, 412.1, 751.6, 415.9, 749.6, 420.9, 748.4, 422.1, 746.9, 421.6, 743.1, 417.6, 737.1, 413.6, 732.9, 409.6, 730.1, 409.6, 728.9, 408.6, 722.1, 408.6, 720.9, 407.6, 710.1, 407.6, 708.9, 408.6, 701.1, 409.6, 691.1, 413.6, 680.9, 420.6, 675.6, 426.1, 674.6, 428.9, 672.6, 431.1, 672.6, 432.6, 671.6, 433.1, 669.4, 430.4, 672.4, 427.9, 672.4, 426.1, 673.4, 424.9, 672.9, 422.6, 680.4, 411.9, 680.4, 410.1, 689.1, 403.4, 695.1, 400.4, 700.9, 399.4, 702.6, 397.9, 705.1, 399.4, 713.9, 399.4, 722.1, 403.4, 724.4, 401.9, 722.9, 399.6, 719.9, 397.6, 718.1, 397.6, 713.9, 395.6, 710.1, 395.6, 708.9, 394.6, 704.1, 394.6, 702.4, 396.1, 697.1, 395.6, 684.1, 400.6, 676.9, 405.6, 668.6, 414.1, 664.6, 422.1, 664.6, 423.9, 662.6, 428.1, 663.4, 431.1, 661.1, 431.6, 659.6, 433.1, 662.6, 437.1, 662.6, 442.9, 665.6, 446.1, 660.6, 454.9, 659.9, 455.6, 658.1, 455.6, 644.9, 449.6, 642.6, 451.1, 644.1, 453.4, 650.9, 456.4, 654.1, 459.4, 659.1, 461.4, 661.1, 460.9, 664.6, 466.1, 665.6, 469.9, 669.9, 474.4, 673.1, 476.4, 678.9, 476.4, 681.4, 473.9, 681.4, 466.1, 682.4, 464.9, 681.9, 459.6, 682.9, 456.9, 685.6, 461.1, 685.6, 462.9, 687.1, 464.4, 689.4, 462.9, 690.1, 460.9, 690.6, 467.9, 689.6, 469.1, 689.6, 471.9, 686.6, 476.1, 686.6, 478.6, 681.1, 479.6, 679.9, 478.6, 675.1, 478.6, 673.9, 477.6, 669.1, 476.6, 646.9, 461.6, 643.1, 460.6, 635.9, 456.6, 631.1, 455.6, 627.9, 453.6, 621.1, 451.6, 613.1, 447.6, 579.9, 425.6, 578.1, 425.6, 575.6, 428.1, 577.6, 434.9, 583.6, 443.1, 591.9, 451.4, 600.4, 458.1, 598.1, 458.6, 594.9, 456.6, 592.1, 456.6, 586.9, 453.6, 584.1, 453.6, 582.9, 452.6, 581.1, 452.6, 576.9, 450.6, 574.1, 450.6, 572.9, 449.6, 570.6, 451.1, 570.6, 453.9, 582.1, 465.4, 584.9, 466.4, 588.1, 469.4, 606.1, 477.9, 604.4, 478.6, 602.9, 477.6, 598.1, 477.6, 596.9, 476.6, 583.1, 476.6, 581.6, 478.1, 582.6, 480.1, 587.1, 484.4, 591.9, 486.4, 594.1, 488.4, 595.9, 488.4, 600.1, 490.4, 603.9, 490.4, 608.1, 492.4, 611.9, 492.4, 613.1, 493.4, 615.9, 493.4, 617.1, 494.4, 619.9, 494.6, 619.9, 495.4, 616.9, 496.6, 612.1, 496.6, 610.9, 497.6, 606.1, 498.6, 604.6, 500.9, 609.1, 504.4, 612.9, 504.4, 617.1, 506.4, 623.9, 506.4, 625.1, 507.4, 629.9, 507.6, 629.9, 508.4, 627.1, 509.6, 623.6, 513.1, 626.1, 516.4, 628.9, 516.4, 630.1, 517.4, 634.9, 517.4, 640.1, 515.4, 643.9, 515.4, 645.1, 514.4, 650.9, 513.6, 651.1, 514.4, 647.9, 516.6, 643.6, 521.1, 646.1, 524.4, 653.9, 523.4, 657.1, 521.4, 658.9, 521.4, 662.1, 518.4, 663.9, 518.4, 664.4, 519.1, 661.6, 523.1, 661.6, 524.9, 663.1, 526.4, 665.9, 526.4, 668.1, 524.4, 669.9, 524.4, 673.1, 521.4, 676.9, 519.6, 679.1, 522.4, 680.9, 522.4, 684.6, 517.9, 685.6, 518.4, 685.6, 519.9, 687.1, 521.4, 690.1, 519.4, 694.9, 519.4, 696.4, 517.1, 694.4, 514.9, 694.4, 513.4, 696.1, 513.4, 698.6, 516.1, 699.6, 523.9, 701.6, 527.1, 715.1, 539.4, 721.9, 542.4, 723.1, 543.6, 715.6, 558.9, 710.6, 566.1, 713.1, 569.4, 716.9, 569.4, 718.9, 568.4, 725.9, 560.9, 726.6, 562.6, 725.6, 564.1, 725.6, 569.9, 727.1, 571.4, 728.9, 571.4, 730.1, 570.4, 736.6, 562.9, 740.1, 567.4, 742.9, 566.4, 746.4, 563.1, 747.9, 560.6, 751.9, 561.4, 753.4, 559.9, 755.4, 555.9, 755.4, 548.1, 756.4, 547.4, 758.6, 549.1, 759.9, 551.4, 763.9, 553.4, 766.4, 550.1, 763.4, 546.9, 763.4, 545.1, 762.4, 543.9, 762.4, 537.4, 765.9, 537.4, 770.4, 532.9, 770.4, 531.1, 771.1, 530.4, 773.9, 530.4, 777.1, 526.4, 783.9, 526.4, 788.1, 523.4, 791.9, 522.4, 794.6, 525.1, 794.6, 528.9, 796.6, 531.9, 798.1, 533.4, 800.9, 533.4, 802.4, 531.9, 802.4, 530.1, 798.9, 526.4, 799.4, 522.1, 804.4, 513.9, 812.4, 507.9, 810.9, 505.6, 808.9, 505.1, 810.4, 501.9, 808.9, 499.6, 805.1, 500.6, 802.9, 498.6, 799.1, 499.6, 796.6, 502.1, 794.6, 506.1, 794.6, 510.9, 792.4, 514.1, 787.4, 507.9, 787.4, 493.1, 786.4, 491.9, 786.4, 488.1, 784.4, 483.9, 784.4, 481.1, 781.4, 475.9, 781.4, 474.1, 783.4, 471.1, 780.9, 468.9, 785.9, 466.4, 790.4, 461.9, 788.9, 459.6, 787.4, 459.6, 786.9, 458.6, 794.4, 452.1, 796.4, 448.9, 794.9, 446.6, 792.1, 446.6, 790.6, 447.6, 789.9, 446.6, 793.4, 443.9, 797.4, 438.9, 802.4, 429.1, 800.9, 427.6, 799.1, 427.6, 793.4, 431.1, 792.4, 430.4, 800.4, 416.9, 800.4, 415.1, 803.4, 407.9, 803.4, 405.1, 801.9, 403.6, 800.1, 403.6, 793.1, 411.4, 792.4, 410.9, 798.4, 394.9, 798.4, 392.1, 799.4, 390.9, 799.4, 381.1, 797.9, 379.6, 796.1, 379.6, 794.9, 380.6, 790.6, 387.1, 788.4, 392.1, 787.4, 393.1, 786.6, 392.9, 787.4, 388.1, 788.4, 386.9, 788.4, 383.1, 789.4, 381.9, 789.4, 374.1, 790.4, 372.9, 790.4, 368.1, 789.4, 366.9, 789.4, 360.1, 786.9, 357.6, 785.1, 357.6, 783.6, 359.1, 780.6, 366.1, 780.6, 368.9, 779.6, 370.1, 778.6, 374.9, 775.9, 380.4, 775.4, 367.1, 774.4, 365.9, 774.4, 358.1, 771.4, 351.1]], "51.20": [[764.1, 345.6, 762.6, 347.1, 762.6, 348.9, 761.6, 350.1, 761.6, 363.9, 760.6, 365.1, 760.6, 372.9, 759.6, 374.1, 759.6, 378.9, 758.6, 380.1, 758.6, 383.9, 757.6, 385.1, 756.6, 391.9, 755.6, 393.1, 754.6, 398.9, 753.6, 400.1, 753.6, 403.9, 752.6, 405.1, 752.6, 409.9, 751.6, 411.1, 751.1, 417.4, 748.1, 416.6, 746.9, 417.6, 745.1, 417.6, 739.9, 413.6, 736.9, 409.6, 734.1, 409.6, 730.9, 407.6, 725.1, 407.6, 723.9, 406.6, 720.1, 406.6, 718.9, 405.6, 710.1, 405.6, 708.9, 406.6, 701.1, 407.6, 694.9, 410.6, 693.1, 410.6, 681.1, 418.6, 676.6, 422.9, 672.6, 430.1, 671.1, 438.4, 670.4, 437.4, 670.4, 431.1, 668.9, 428.9, 671.4, 426.9, 672.4, 424.9, 671.9, 420.9, 674.4, 418.9, 679.4, 409.1, 683.1, 405.4, 695.1, 398.4, 700.9, 397.4, 702.1, 396.4, 704.1, 397.4, 711.9, 397.4, 713.1, 398.4, 717.9, 398.4, 723.1, 401.4, 725.4, 399.9, 723.9, 397.6, 719.9, 395.6, 718.1, 395.6, 714.9, 393.6, 705.1, 392.6, 702.9, 394.6, 700.9, 393.6, 694.1, 394.6, 687.9, 397.6, 686.1, 397.6, 678.1, 402.6, 669.6, 410.9, 665.6, 417.1, 664.6, 419.1, 664.6, 421.9, 662.6, 425.1, 662.6, 427.9, 664.1, 430.1, 661.6, 432.1, 662.6, 434.1, 662.6, 442.9, 665.1, 446.1, 662.6, 447.9, 660.6, 451.1, 660.6, 455.6, 659.6, 456.1, 657.9, 454.6, 653.1, 453.6, 644.9, 449.6, 642.6, 451.1, 645.1, 454.4, 646.9, 454.4, 650.9, 456.4, 655.1, 460.4, 656.9, 460.4, 658.1, 461.4, 661.4, 460.9, 662.6, 462.1, 662.6, 463.9, 665.6, 468.9, 671.1, 474.4, 678.9, 474.4, 680.1, 473.4, 681.4, 471.9, 681.4, 459.1, 683.1, 457.9, 684.6, 460.1, 684.6, 461.9, 686.9, 463.4, 688.4, 461.9, 688.4, 459.6, 689.1, 458.9, 689.6, 469.9, 685.6, 475.1, 685.6, 477.6, 677.1, 477.6, 675.9, 476.6, 670.4, 475.6, 664.1, 472.6, 652.9, 463.6, 650.1, 462.6, 647.9, 460.6, 643.9, 458.6, 642.1, 458.6, 632.9, 453.6, 628.1, 452.6, 608.1, 441.6, 604.9, 438.6, 592.1, 430.6, 584.9, 424.6, 579.9, 421.6, 576.6, 424.1, 576.6, 426.9, 580.6, 434.9, 588.6, 445.1, 600.4, 455.1, 599.4, 455.6, 597.9, 454.6, 596.1, 454.6, 592.9, 452.6, 588.1, 451.6, 584.9, 449.6, 583.1, 449.6, 576.9, 446.6, 571.1, 446.6, 569.6, 448.1, 575.6, 456.9, 582.1, 462.4, 587.1, 465.4, 588.9, 465.4, 592.1, 468.4, 603.1, 473.9, 602.4, 474.6, 600.1, 474.6, 598.9, 473.6, 592.1, 473.6, 590.9, 472.6, 585.1, 472.6, 583.9, 471.6, 581.1, 471.6, 579.6, 473.9, 581.6, 477.1, 590.1, 483.4, 594.1, 485.4, 595.9, 485.4, 602.1, 488.4, 605.9, 488.4, 610.1, 490.4, 613.9, 490.4, 615.1, 491.4, 616.9, 491.4, 618.1, 492.6, 617.6, 493.6, 614.1, 493.6, 612.9, 494.6, 605.1, 495.6, 603.6, 497.1, 603.6, 498.9, 609.1, 502.4, 611.9, 502.4, 613.1, 503.4, 618.9, 503.4, 620.1, 504.4, 628.6, 504.4, 628.6, 506.1, 622.6, 511.1, 624.1, 513.4, 629.1, 515.4, 634.9, 515.4, 636.1, 514.4, 640.9, 514.4, 642.1, 513.4, 648.6, 512.4, 649.4, 512.9, 641.6, 520.1, 643.1, 522.4, 649.9, 522.4, 651.1, 521.4, 653.9, 521.4, 658.9, 519.4, 662.1, 516.4, 663.9, 516.4, 664.4, 517.1, 660.6, 522.9, 662.1, 524.4, 665.9, 524.4, 668.1, 522.4, 669.9, 522.4, 677.4, 516.4, 678.1, 517.4, 676.6, 519.9, 678.1, 521.4, 683.1, 517.4, 684.1, 517.6, 686.1, 520.4, 691.1, 518.4, 693.9, 519.4, 695.4, 517.1, 693.4, 514.1, 695.9, 512.4, 697.6, 514.1, 697.6, 517.9, 700.6, 525.9, 711.1, 535.4, 721.6, 542.1, 721.6, 543.9, 718.6, 549.9, 709.6, 564.1, 709.6, 566.9, 711.1, 568.4, 715.9, 568.4, 717.9, 567.4, 724.1, 561.6, 724.6, 564.9, 723.6, 566.1, 723.6, 568.9, 725.1, 570.4, 727.9, 570.4, 732.4, 566.9, 735.6, 561.9, 736.6, 562.4, 736.6, 564.9, 738.1, 566.4, 740.9, 566.4, 747.1, 560.4, 750.9, 561.4, 754.4, 555.9, 754.9, 547.6, 755.9, 547.4, 761.1, 552.4, 763.9, 552.4, 765.4, 550.9, 765.4, 549.1, 761.4, 543.9, 761.4, 537.4, 763.9, 537.4, 766.9, 535.4, 771.1, 530.4, 773.9, 529.4, 777.1, 525.4, 782.9, 526.4, 784.1, 525.4, 785.9, 525.4, 788.1, 522.4, 791.6, 521.4, 794.6, 526.1, 794.6, 528.9, 795.6, 530.1, 798.1, 532.4, 800.9, 532.4, 802.4, 530.1, 798.9, 526.4, 799.4, 521.1, 804.4, 512.9, 807.1, 510.4, 810.1, 508.4, 811.9, 508.4, 813.4, 506.9, 811.9, 504.6, 808.9, 504.1, 809.4, 501.1, 807.9, 499.6, 804.1, 499.6, 802.9, 498.6, 799.1, 498.6, 796.6, 501.1, 794.6, 505.1, 794.6, 508.9, 793.6, 510.1, 793.6, 511.9, 792.4, 513.1, 790.4, 511.9, 786.4, 506.9, 786.4, 502.1, 787.4, 500.9, 786.4, 488.1, 784.4, 483.9, 784.4, 480.1, 780.9, 472.9, 783.4, 470.9, 781.9, 467.9, 785.1, 465.4, 787.9, 464.4, 791.4, 460.9, 787.9, 456.9, 797.4, 447.9, 797.4, 446.1, 795.9, 444.6, 794.1, 444.6, 792.6, 445.6, 791.9, 444.6, 800.4, 433.9, 803.4, 427.1, 801.9, 425.6, 799.1, 425.6, 794.6, 428.6, 793.6, 427.9, 795.4, 424.1, 797.4, 421.9, 799.4, 417.9, 799.4, 416.1, 801.4, 412.9, 801.4, 410.1, 803.4, 405.9, 803.4, 403.1, 801.9, 401.6, 800.1, 401.6, 792.9, 409.4, 792.4, 408.6, 795.4, 400.9, 795.4, 398.1, 797.4, 393.9, 797.4, 391.1, 798.4, 389.9, 798.4, 378.1, 796.9, 376.6, 795.1, 376.6, 791.6, 381.1, 787.4, 389.9, 786.6, 389.9, 787.4, 379.1, 788.4, 377.9, 788.4, 363.1, 787.4, 361.9, 787.4, 358.1, 786.4, 356.1, 784.9, 354.6, 783.1, 354.6, 780.6, 357.1, 779.6, 362.9, 778.6, 364.1, 778.6, 366.9, 776.6, 371.1, 776.6, 373.9, 773.9, 380.1, 773.4, 362.1, 772.4, 360.9, 772.4, 356.1, 768.4, 348.1, 765.9, 345.6]], "51.28": [[761.1, 343.6, 759.6, 345.1, 759.6, 367.9, 758.6, 369.1, 758.6, 378.9, 757.6, 380.1, 756.6, 388.9, 755.6, 390.1, 754.6, 395.9, 753.6, 397.1, 753.6, 401.9, 752.6, 403.1, 752.6, 408.9, 751.6, 410.1, 751.1, 415.4, 750.1, 415.6, 747.9, 413.6, 743.1, 413.6, 739.4, 410.9, 739.4, 409.1, 737.9, 407.6, 735.1, 408.6, 729.9, 405.6, 726.1, 405.6, 724.9, 404.6, 718.1, 404.6, 716.9, 403.6, 711.1, 403.6, 709.9, 404.6, 706.1, 404.6, 704.9, 405.6, 702.1, 405.6, 695.9, 408.6, 694.1, 408.6, 679.9, 417.6, 675.6, 422.1, 670.9, 433.1, 670.4, 429.1, 668.9, 427.4, 671.4, 423.9, 670.9, 418.9, 672.9, 418.4, 674.4, 416.9, 674.4, 415.1, 679.4, 406.9, 687.1, 400.4, 698.1, 395.4, 713.9, 395.4, 715.1, 396.4, 717.9, 396.4, 724.1, 400.4, 726.4, 398.9, 725.1, 396.6, 720.9, 393.6, 719.1, 393.6, 714.9, 391.6, 711.1, 391.6, 709.9, 390.6, 698.1, 391.6, 696.9, 392.6, 694.1, 392.6, 687.9, 395.6, 686.1, 395.6, 679.1, 399.6, 667.6, 411.1, 666.6, 413.9, 664.6, 416.1, 664.6, 418.9, 662.6, 422.1, 662.6, 425.9, 663.6, 427.9, 661.6, 432.1, 661.6, 439.9, 663.6, 443.1, 663.6, 444.9, 660.6, 448.1, 660.6, 450.9, 659.6, 452.1, 659.1, 455.1, 653.1, 453.6, 642.9, 448.6, 641.1, 448.6, 637.9, 446.6, 636.1, 446.6, 625.9, 442.6, 623.6, 444.1, 625.4, 447.1, 624.4, 447.6, 622.1, 446.6, 616.1, 443.6, 609.9, 438.6, 604.1, 435.6, 594.9, 428.6, 590.9, 424.6, 581.9, 418.6, 579.1, 418.6, 577.6, 420.1, 577.6, 424.9, 579.6, 427.1, 582.6, 433.9, 586.6, 439.1, 593.1, 446.4, 600.4, 452.1, 598.4, 452.6, 587.9, 447.6, 583.1, 446.6, 579.9, 444.6, 578.1, 444.6, 573.9, 442.6, 572.1, 442.6, 570.6, 444.1, 570.6, 446.9, 571.6, 448.9, 581.9, 459.4, 589.1, 464.4, 593.9, 465.4, 597.1, 468.4, 598.9, 468.4, 601.1, 470.4, 602.6, 470.4, 605.1, 471.9, 603.4, 472.6, 601.9, 471.6, 597.1, 471.6, 595.9, 470.6, 582.1, 469.6, 580.6, 471.1, 580.6, 472.9, 586.1, 478.4, 597.1, 484.4, 598.9, 484.4, 606.1, 487.4, 608.9, 487.4, 610.1, 488.4, 613.9, 488.4, 615.1, 489.4, 616.9, 489.4, 618.1, 490.6, 617.6, 491.6, 612.1, 491.6, 610.9, 492.6, 607.1, 492.6, 605.9, 493.6, 604.1, 493.6, 602.6, 495.1, 602.6, 496.9, 606.1, 499.4, 611.9, 500.4, 613.1, 501.4, 617.9, 501.4, 619.1, 502.4, 626.9, 502.4, 628.1, 504.1, 626.1, 504.6, 621.6, 508.1, 621.6, 509.9, 624.1, 512.4, 626.1, 513.4, 635.9, 513.4, 637.1, 512.4, 640.9, 512.4, 642.1, 511.4, 646.9, 511.4, 647.4, 512.1, 646.6, 513.1, 641.6, 518.1, 641.6, 519.9, 643.1, 521.4, 648.9, 521.4, 655.1, 518.4, 657.9, 518.4, 661.1, 515.4, 663.4, 514.4, 664.1, 515.4, 659.6, 520.1, 659.6, 521.9, 661.1, 523.4, 664.9, 523.4, 676.4, 515.4, 677.1, 516.4, 674.6, 519.1, 676.1, 521.4, 682.6, 516.9, 685.1, 519.4, 689.9, 518.4, 692.4, 515.9, 692.4, 514.1, 696.4, 511.9, 697.6, 513.1, 697.6, 517.9, 700.6, 525.1, 704.9, 528.4, 707.9, 532.4, 712.9, 535.4, 717.1, 539.4, 720.6, 541.1, 720.6, 542.9, 718.6, 545.1, 715.6, 551.9, 713.6, 554.1, 711.6, 558.9, 708.6, 562.1, 707.6, 565.9, 709.1, 567.4, 714.9, 567.4, 723.1, 560.9, 723.6, 562.9, 722.6, 564.1, 722.6, 568.9, 724.1, 570.4, 725.9, 570.4, 729.1, 568.4, 733.4, 563.9, 734.9, 560.9, 735.6, 561.6, 735.6, 564.9, 737.1, 566.4, 739.9, 566.4, 745.9, 559.9, 748.1, 561.4, 749.9, 561.4, 753.4, 555.9, 753.4, 548.1, 754.6, 546.9, 759.1, 551.4, 761.1, 552.4, 763.1, 551.4, 764.4, 549.1, 761.4, 545.9, 761.4, 544.1, 760.4, 542.9, 760.4, 536.4, 763.9, 536.4, 766.9, 534.4, 774.1, 526.4, 776.1, 525.4, 783.9, 525.4, 787.1, 523.6, 789.1, 526.4, 794.1, 525.6, 794.6, 528.9, 795.6, 530.1, 799.9, 532.4, 801.4, 530.9, 801.4, 529.1, 798.4, 525.1, 799.4, 523.9, 799.4, 520.1, 800.4, 518.9, 800.4, 517.1, 804.9, 511.4, 809.1, 508.4, 810.9, 508.4, 812.4, 506.9, 811.4, 504.9, 808.6, 503.1, 809.4, 500.1, 807.9, 498.6, 800.1, 497.6, 796.6, 500.1, 794.6, 504.1, 793.6, 510.9, 791.9, 512.6, 790.4, 511.9, 790.4, 510.1, 786.4, 505.9, 786.4, 488.1, 784.4, 483.9, 784.4, 480.1, 781.4, 474.9, 780.9, 472.4, 781.4, 471.4, 782.9, 471.4, 784.4, 469.9, 782.9, 466.6, 787.9, 463.4, 791.4, 459.9, 791.4, 458.1, 788.9, 455.6, 798.4, 445.9, 796.9, 443.6, 793.1, 443.6, 792.6, 442.9, 799.4, 434.9, 803.4, 426.9, 803.4, 425.1, 801.9, 423.6, 800.1, 423.6, 795.1, 427.4, 793.9, 427.1, 794.4, 425.1, 796.4, 422.9, 799.4, 416.9, 799.4, 415.1, 801.4, 411.9, 802.4, 405.1, 803.4, 403.9, 803.4, 400.1, 801.1, 398.6, 797.6, 401.1, 793.1, 407.4, 792.4, 406.9, 795.4, 398.9, 796.4, 392.1, 797.4, 390.9, 797.4, 387.1, 798.4, 385.9, 798.4, 379.1, 797.4, 377.9, 797.4, 376.1, 795.9, 374.6, 794.1, 374.6, 792.6, 376.1, 787.4, 386.9, 786.4, 386.9, 786.4, 380.1, 787.4, 378.9, 787.4, 365.1, 786.4, 363.9, 786.4, 358.1, 785.4, 356.9, 785.4, 355.1, 782.9, 352.6, 781.1, 352.6, 778.6, 355.1, 777.6, 362.9, 776.6, 364.1, 776.6, 366.9, 775.6, 368.1, 775.6, 370.9, 774.6, 372.1, 774.6, 374.9, 772.9, 379.1, 772.4, 365.1, 771.4, 363.9, 771.4, 358.1, 770.4, 356.9, 770.4, 354.1, 768.4, 350.9, 768.4, 349.1, 765.4, 344.9, 763.9, 343.6]], "51.36": [[760.1, 341.6, 758.6, 343.1, 758.6, 365.9, 757.6, 367.1, 757.6, 378.9, 756.6, 380.1, 756.6, 385.9, 755.6, 387.1, 755.6, 389.9, 753.6, 395.1, 753.6, 401.9, 752.6, 403.1, 752.6, 411.9, 751.4, 413.1, 746.9, 410.6, 743.6, 412.1, 737.9, 407.6, 726.9, 402.6, 718.1, 402.6, 716.9, 401.6, 711.1, 401.6, 709.9, 402.6, 702.1, 403.6, 690.1, 408.6, 682.9, 413.6, 676.6, 419.9, 670.6, 432.1, 670.6, 433.9, 673.6, 436.4, 672.6, 438.6, 671.6, 439.1, 669.4, 436.9, 669.4, 427.1, 666.9, 423.9, 668.9, 423.4, 671.4, 420.9, 671.4, 417.1, 676.4, 409.9, 676.4, 408.1, 678.4, 405.1, 682.1, 401.4, 684.9, 400.4, 690.1, 396.4, 691.9, 396.4, 698.1, 393.4, 700.9, 393.4, 702.6, 391.9, 706.1, 393.4, 714.9, 393.4, 716.1, 394.4, 718.9, 394.4, 725.1, 398.4, 727.4, 396.9, 724.9, 393.6, 718.9, 390.6, 713.1, 389.6, 711.9, 388.6, 704.1, 388.6, 702.4, 390.1, 697.1, 389.6, 695.9, 390.6, 690.1, 391.6, 682.1, 395.6, 673.9, 401.6, 667.6, 409.1, 664.6, 414.1, 664.6, 416.9, 661.6, 421.1, 661.6, 423.9, 663.1, 425.6, 661.6, 428.1, 661.6, 439.9, 663.1, 442.4, 660.6, 445.1, 660.6, 446.9, 659.6, 448.1, 659.6, 453.9, 660.4, 455.9, 659.6, 456.1, 657.9, 454.6, 656.1, 454.6, 654.9, 453.6, 653.1, 453.6, 642.9, 448.6, 640.6, 450.1, 641.6, 452.1, 650.9, 456.4, 652.6, 458.1, 653.4, 459.9, 652.9, 460.6, 650.9, 459.6, 648.4, 456.9, 627.9, 446.6, 626.1, 446.6, 619.1, 442.6, 594.1, 424.6, 590.1, 420.6, 581.9, 414.6, 580.1, 414.6, 577.6, 417.1, 578.6, 421.9, 581.6, 427.9, 589.6, 439.1, 596.1, 444.4, 600.4, 449.1, 599.4, 449.6, 597.9, 448.6, 596.1, 448.6, 588.9, 444.6, 587.1, 444.6, 581.9, 441.6, 580.1, 441.6, 575.9, 439.6, 572.1, 439.6, 570.6, 441.1, 570.6, 442.9, 572.6, 445.9, 581.9, 455.4, 588.1, 460.4, 590.9, 461.4, 593.1, 463.4, 597.9, 464.4, 601.1, 467.4, 604.1, 468.9, 602.4, 469.6, 600.9, 468.6, 596.1, 468.6, 594.9, 467.6, 590.1, 467.6, 588.9, 466.6, 582.1, 466.6, 580.6, 468.1, 580.6, 469.9, 587.1, 476.4, 599.1, 482.4, 600.9, 482.4, 611.1, 486.4, 614.9, 486.4, 617.9, 487.6, 617.4, 488.6, 614.1, 488.6, 612.9, 489.6, 605.1, 490.6, 603.1, 491.6, 601.6, 493.9, 604.1, 496.4, 609.1, 498.4, 611.9, 498.4, 613.1, 499.4, 618.9, 499.4, 620.1, 500.4, 625.9, 500.4, 626.4, 502.1, 620.6, 506.1, 620.6, 507.9, 622.1, 509.4, 626.1, 511.4, 634.9, 511.4, 636.1, 510.4, 641.9, 510.4, 643.1, 509.4, 645.9, 509.4, 646.4, 510.1, 645.6, 511.1, 639.6, 517.1, 641.1, 519.4, 648.9, 519.4, 658.9, 515.4, 662.4, 512.4, 663.1, 513.4, 661.6, 515.9, 657.6, 519.1, 659.1, 521.4, 663.9, 521.4, 669.9, 518.4, 673.1, 515.4, 675.1, 515.9, 674.6, 517.9, 676.1, 519.4, 680.1, 516.4, 681.9, 516.4, 684.1, 518.4, 685.9, 518.4, 689.1, 516.4, 691.1, 513.4, 692.9, 513.4, 696.1, 510.9, 696.6, 513.9, 699.6, 520.1, 699.6, 521.9, 701.6, 525.1, 704.9, 527.4, 708.9, 532.4, 712.9, 534.4, 719.6, 540.1, 715.6, 548.9, 707.6, 561.1, 706.6, 564.9, 708.1, 566.4, 713.9, 566.4, 722.1, 559.9, 722.6, 560.6, 721.6, 562.1, 721.6, 564.9, 720.6, 566.1, 720.6, 567.9, 722.1, 569.4, 724.9, 569.4, 728.1, 567.4, 732.4, 562.9, 733.9, 559.9, 734.6, 560.6, 734.6, 563.9, 736.1, 565.4, 738.9, 565.4, 744.6, 559.9, 747.9, 561.4, 751.4, 557.9, 751.4, 556.1, 752.4, 554.9, 752.4, 548.1, 753.9, 545.9, 759.1, 551.4, 761.9, 551.4, 763.4, 549.9, 763.4, 548.1, 760.4, 544.9, 760.4, 543.1, 759.4, 541.9, 759.4, 536.4, 761.9, 536.4, 767.9, 532.4, 772.1, 526.4, 773.9, 526.4, 776.6, 524.9, 781.9, 525.4, 787.1, 521.4, 789.1, 520.4, 791.9, 520.4, 792.6, 521.1, 792.6, 523.9, 794.1, 525.6, 793.6, 527.9, 796.1, 530.4, 799.9, 531.4, 801.4, 529.9, 801.4, 528.1, 798.9, 525.4, 799.4, 518.1, 804.9, 510.4, 809.1, 507.4, 810.9, 507.4, 812.4, 505.9, 810.9, 503.6, 809.1, 503.6, 808.4, 502.9, 809.4, 499.1, 807.9, 497.6, 803.6, 498.1, 801.9, 496.6, 799.1, 496.6, 795.6, 500.1, 793.6, 504.1, 793.6, 508.9, 792.6, 510.9, 791.4, 512.1, 790.4, 511.6, 790.4, 510.1, 785.9, 505.4, 786.4, 488.1, 784.4, 483.9, 784.4, 479.1, 781.4, 473.9, 780.9, 471.4, 785.4, 467.9, 783.9, 464.9, 789.9, 461.4, 792.4, 458.9, 792.4, 457.1, 790.9, 455.6, 789.4, 455.6, 788.9, 454.6, 795.4, 449.1, 798.4, 444.9, 798.4, 443.1, 796.9, 441.6, 794.9, 442.6, 793.4, 442.6, 792.9, 441.6, 800.4, 432.9, 804.4, 423.9, 802.9, 421.6, 801.1, 421.6, 796.9, 424.6, 795.1, 425.4, 794.4, 424.9, 799.4, 415.9, 799.4, 414.1, 801.4, 410.9, 802.4, 404.1, 803.4, 402.9, 803.4, 398.1, 801.9, 396.6, 800.1, 396.6, 796.6, 400.1, 794.4, 404.1, 793.4, 405.1, 792.4, 404.4, 795.4, 396.9, 796.4, 389.1, 797.4, 387.9, 797.4, 374.1, 794.9, 371.6, 792.9, 372.6, 789.6, 378.1, 788.6, 381.9, 786.9, 384.4, 786.4, 383.9, 786.4, 362.1, 785.4, 360.9, 784.4, 353.1, 780.9, 349.6, 777.6, 352.1, 777.6, 353.9, 776.6, 355.1, 776.6, 360.9, 775.6, 362.1, 774.6, 369.9, 772.9, 374.1, 771.4, 371.9, 771.4, 362.1, 770.4, 360.9, 770.4, 356.1, 769.4, 354.9, 768.4, 350.1, 765.4, 344.9, 761.9, 341.6]], "51.44": [[758.1, 339.6, 756.6, 341.1, 756.6, 351.9, 757.6, 353.1, 757.6, 365.9, 756.6, 367.1, 756.6, 381.9, 755.6, 383.1, 755.6, 387.9, 753.6, 393.1, 753.6, 400.9, 752.6, 402.1, 752.1, 411.4, 751.1, 411.6, 746.9, 408.6, 743.6, 410.1, 737.9, 405.6, 736.1, 405.6, 731.9, 402.6, 726.1, 401.6, 724.9, 400.6, 717.1, 400.6, 715.9, 399.6, 713.1, 399.6, 711.9, 400.6, 702.1, 401.6, 690.1, 406.6, 682.9, 411.6, 676.6, 417.9, 673.6, 422.1, 670.6, 429.1, 670.6, 432.9, 673.1, 434.9, 672.6, 437.9, 671.9, 438.4, 670.1, 437.6, 668.4, 434.9, 668.4, 425.1, 665.9, 422.6, 670.4, 418.9, 670.4, 415.1, 673.4, 411.9, 677.4, 404.1, 683.1, 398.4, 692.1, 393.4, 693.9, 393.4, 698.1, 391.4, 700.9, 391.4, 702.1, 390.4, 711.9, 390.4, 716.1, 392.4, 718.9, 392.4, 725.1, 396.4, 727.4, 394.9, 723.9, 390.6, 720.1, 389.6, 716.9, 387.6, 713.1, 387.6, 711.9, 386.6, 702.1, 386.6, 700.9, 387.6, 697.1, 387.6, 695.9, 388.6, 690.1, 389.6, 680.1, 394.6, 674.9, 398.6, 668.6, 404.9, 665.6, 409.1, 663.6, 413.1, 663.6, 415.9, 661.6, 418.1, 661.6, 421.9, 662.6, 423.9, 660.6, 428.1, 660.6, 435.9, 662.6, 440.9, 659.6, 445.1, 659.1, 455.4, 656.1, 454.6, 652.9, 452.6, 651.1, 452.6, 647.9, 450.6, 645.6, 452.1, 646.4, 454.1, 645.4, 454.6, 628.1, 445.6, 624.9, 442.6, 620.1, 440.6, 616.9, 437.6, 606.1, 430.6, 588.9, 416.6, 586.1, 413.6, 582.9, 411.6, 580.1, 411.6, 578.6, 413.1, 578.6, 416.9, 580.6, 420.1, 581.6, 423.9, 590.6, 437.1, 601.4, 447.1, 600.4, 447.6, 586.9, 440.6, 585.1, 440.6, 576.9, 436.6, 572.1, 436.6, 570.6, 438.1, 570.6, 439.9, 581.1, 452.4, 595.1, 462.4, 601.9, 464.4, 603.6, 465.9, 604.1, 467.1, 602.1, 467.6, 600.9, 466.6, 597.1, 466.6, 595.9, 465.6, 592.1, 465.6, 590.9, 464.6, 586.1, 464.6, 584.9, 463.6, 582.1, 463.6, 580.6, 465.1, 580.6, 466.9, 590.1, 475.4, 592.9, 476.4, 595.1, 478.4, 611.1, 484.4, 613.9, 484.4, 615.1, 485.4, 617.9, 485.6, 617.4, 486.6, 613.1, 486.6, 611.9, 487.6, 607.1, 487.6, 605.9, 488.6, 604.1, 488.6, 602.6, 490.1, 602.6, 491.9, 605.1, 494.4, 610.1, 496.4, 617.9, 497.4, 619.1, 498.4, 626.6, 498.4, 627.1, 499.4, 625.9, 500.6, 623.1, 501.6, 619.6, 505.1, 622.1, 508.4, 624.1, 509.4, 636.9, 509.4, 642.1, 507.4, 645.6, 507.4, 645.6, 509.1, 639.6, 515.1, 642.1, 518.4, 643.9, 518.4, 645.1, 517.4, 648.9, 517.4, 650.1, 516.4, 652.9, 516.4, 661.4, 511.4, 662.1, 512.4, 657.6, 517.1, 657.6, 518.9, 659.1, 520.4, 664.9, 519.4, 672.1, 514.4, 673.9, 514.4, 676.1, 516.4, 680.9, 515.4, 683.1, 517.4, 684.9, 517.4, 688.4, 515.1, 689.9, 511.9, 692.9, 512.4, 696.1, 509.9, 696.6, 513.9, 698.6, 517.1, 699.6, 521.9, 706.6, 528.1, 708.9, 531.4, 714.9, 535.4, 718.6, 539.1, 714.6, 547.9, 710.6, 553.1, 705.6, 562.1, 705.6, 563.9, 709.1, 566.4, 715.9, 563.4, 720.6, 558.9, 721.6, 559.6, 719.6, 564.1, 719.6, 566.9, 721.1, 568.4, 723.9, 568.4, 725.9, 567.4, 731.6, 560.9, 735.1, 565.4, 736.9, 565.4, 740.1, 563.4, 743.9, 558.9, 746.1, 560.4, 747.9, 560.4, 751.4, 554.9, 752.9, 545.9, 755.9, 549.4, 759.1, 551.4, 762.4, 548.9, 762.4, 547.1, 758.4, 541.9, 758.4, 536.1, 759.1, 535.4, 761.9, 535.4, 767.1, 531.4, 771.1, 526.4, 772.9, 526.4, 775.6, 523.9, 781.9, 524.4, 787.1, 520.4, 790.4, 519.9, 792.6, 522.1, 792.6, 523.9, 794.6, 528.1, 797.1, 530.4, 799.9, 530.4, 801.4, 528.1, 798.4, 524.9, 798.4, 519.1, 803.4, 510.9, 806.1, 508.4, 809.1, 506.4, 810.9, 506.4, 812.4, 504.9, 810.9, 502.6, 809.1, 502.6, 808.4, 501.9, 809.4, 498.1, 807.9, 496.6, 805.1, 496.6, 803.1, 497.6, 800.1, 495.6, 795.6, 499.1, 793.6, 503.1, 793.6, 507.9, 792.6, 509.9, 791.4, 511.1, 789.4, 509.9, 789.4, 508.1, 785.4, 504.9, 785.4, 501.1, 786.4, 499.9, 786.4, 491.1, 785.4, 489.9, 785.4, 484.1, 783.4, 479.9, 783.4, 476.1, 780.4, 470.9, 781.1, 469.4, 782.9, 469.4, 785.4, 466.9, 783.9, 463.9, 789.9, 460.4, 793.4, 456.9, 792.4, 454.9, 789.9, 452.9, 797.4, 446.1, 799.4, 442.1, 797.9, 440.6, 795.1, 440.6, 793.6, 441.6, 792.9, 440.6, 798.4, 434.9, 804.4, 423.9, 804.4, 421.1, 802.9, 419.6, 796.9, 423.6, 795.4, 423.1, 799.4, 414.9, 799.4, 413.1, 802.4, 405.9, 802.4, 403.1, 803.4, 401.9, 803.4, 396.1, 801.9, 394.6, 800.1, 394.6, 798.9, 395.6, 794.4, 401.9, 793.9, 402.4, 793.4, 401.6, 794.4, 395.1, 795.4, 393.9, 795.4, 391.1, 796.4, 389.9, 796.4, 386.1, 797.4, 384.9, 797.4, 373.1, 794.9, 369.6, 793.1, 369.6, 789.6, 375.1, 789.6, 376.9, 786.6, 382.1, 786.4, 383.9, 785.6, 383.9, 785.4, 360.1, 784.4, 358.9, 784.4, 355.1, 783.4, 353.9, 782.4, 349.1, 779.1, 346.6, 776.6, 349.1, 776.6, 350.9, 775.6, 352.1, 775.6, 357.9, 774.6, 359.1, 773.6, 368.9, 772.6, 370.1, 772.6, 374.4, 771.9, 375.1, 771.4, 368.1, 770.4, 366.9, 770.4, 361.1, 769.4, 359.9, 769.4, 355.1, 768.4, 353.9, 767.4, 349.1, 764.4, 343.9, 759.9, 339.6]], "51.52": [[757.1, 337.6, 755.6, 339.1, 755.6, 350.9, 756.6, 352.1, 756.6, 378.9, 755.6, 380.1, 755.6, 385.9, 754.6, 387.1, 754.6, 390.9, 753.6, 392.1, 753.6, 402.9, 752.6, 404.1, 752.6, 408.6, 750.1, 408.6, 746.9, 406.6, 742.1, 407.6, 739.4, 404.9, 740.4, 402.1, 734.9, 396.6, 732.6, 398.1, 734.4, 400.9, 733.9, 401.6, 728.9, 399.6, 725.1, 399.6, 723.9, 398.6, 717.1, 398.6, 715.9, 397.6, 713.1, 397.6, 711.9, 398.6, 707.1, 398.6, 705.9, 399.6, 703.1, 399.6, 701.9, 400.6, 694.1, 402.6, 684.1, 408.6, 676.6, 416.1, 670.6, 428.1, 670.6, 429.9, 672.6, 432.1, 671.6, 435.6, 670.6, 436.1, 668.4, 433.9, 668.4, 423.1, 666.9, 421.6, 665.4, 421.6, 664.9, 420.6, 669.4, 417.9, 670.4, 415.9, 670.4, 412.1, 674.4, 406.9, 675.4, 404.1, 678.4, 399.9, 684.1, 395.4, 694.1, 390.4, 696.9, 390.4, 701.1, 388.4, 712.9, 388.4, 714.1, 389.4, 719.9, 390.4, 726.1, 394.4, 728.4, 392.9, 725.9, 389.6, 719.9, 386.6, 718.1, 386.6, 716.9, 385.6, 713.1, 385.6, 711.9, 384.6, 702.1, 384.6, 700.9, 385.6, 696.1, 385.6, 683.1, 390.6, 675.9, 395.6, 667.6, 403.9, 663.6, 410.1, 663.6, 412.9, 661.6, 416.1, 661.6, 419.9, 662.6, 421.9, 660.6, 424.1, 660.6, 434.9, 662.1, 438.4, 659.6, 442.1, 659.6, 452.9, 661.6, 455.1, 661.1, 457.1, 657.9, 454.6, 652.9, 452.6, 650.6, 454.1, 651.4, 455.9, 650.9, 456.6, 645.9, 453.6, 642.1, 452.6, 640.9, 451.4, 641.4, 449.1, 639.9, 447.6, 625.1, 440.6, 615.9, 433.6, 609.1, 429.6, 583.9, 407.6, 582.1, 407.6, 579.6, 410.1, 580.6, 415.9, 586.6, 427.9, 590.6, 433.1, 600.4, 443.1, 599.4, 443.6, 595.9, 441.6, 594.1, 441.6, 591.9, 439.6, 581.9, 434.6, 580.1, 434.6, 575.9, 432.6, 572.1, 432.6, 570.6, 434.1, 574.6, 441.9, 581.9, 449.4, 601.1, 462.4, 603.1, 463.4, 607.4, 463.9, 607.4, 464.9, 606.6, 465.1, 602.4, 464.6, 600.9, 463.6, 596.1, 463.6, 593.9, 461.6, 586.1, 460.6, 584.9, 459.6, 582.1, 459.6, 580.6, 461.1, 580.6, 462.9, 587.9, 470.4, 592.1, 473.4, 605.1, 479.4, 607.9, 479.4, 609.1, 480.4, 613.9, 481.4, 616.1, 482.9, 615.4, 483.6, 610.1, 483.6, 608.9, 484.6, 605.1, 484.6, 603.9, 485.6, 602.1, 485.6, 600.6, 487.9, 605.1, 491.4, 606.9, 491.4, 614.1, 494.4, 616.9, 494.4, 618.1, 495.4, 622.9, 495.4, 624.1, 496.4, 627.1, 496.6, 626.9, 497.4, 621.1, 499.6, 618.6, 502.1, 622.1, 506.4, 625.9, 506.4, 627.1, 507.4, 632.9, 507.4, 634.1, 506.4, 639.9, 506.4, 641.1, 505.4, 644.6, 505.4, 644.6, 507.1, 638.6, 513.1, 640.1, 515.4, 642.1, 516.4, 643.9, 516.4, 645.1, 515.4, 648.9, 515.4, 650.1, 514.4, 652.9, 514.4, 657.1, 511.4, 659.4, 511.9, 656.6, 515.1, 656.6, 516.9, 658.1, 518.4, 663.9, 517.4, 668.1, 514.4, 669.9, 514.4, 671.1, 513.4, 674.1, 515.4, 679.4, 514.9, 681.1, 516.4, 683.9, 516.4, 687.1, 514.4, 689.6, 510.9, 692.9, 511.4, 694.4, 509.9, 695.4, 507.9, 694.4, 505.1, 692.9, 503.6, 690.9, 504.1, 689.4, 501.9, 689.4, 500.1, 691.4, 497.4, 693.1, 498.4, 695.1, 497.9, 695.6, 501.9, 696.6, 503.1, 696.6, 514.9, 698.6, 517.1, 700.6, 522.9, 717.6, 537.1, 717.6, 538.9, 714.6, 544.9, 708.6, 553.1, 703.6, 561.9, 706.1, 564.4, 710.9, 564.4, 720.1, 556.9, 720.6, 557.6, 718.6, 562.1, 718.6, 565.9, 720.1, 567.4, 722.9, 567.4, 725.9, 565.4, 730.6, 559.9, 731.6, 560.4, 731.6, 561.9, 732.9, 563.4, 734.1, 564.4, 735.9, 564.4, 740.1, 561.4, 742.6, 557.9, 745.1, 559.4, 746.9, 559.4, 750.4, 553.9, 750.4, 552.1, 751.4, 550.9, 750.9, 547.6, 751.9, 544.9, 757.1, 550.4, 759.9, 550.4, 761.4, 548.9, 761.4, 547.1, 758.4, 543.9, 758.4, 542.1, 757.4, 540.9, 757.4, 536.1, 766.9, 530.4, 770.1, 526.4, 772.9, 525.4, 775.6, 522.9, 781.9, 523.4, 787.1, 519.4, 790.9, 519.4, 791.6, 520.1, 791.6, 522.9, 793.6, 525.1, 794.6, 527.9, 796.1, 529.4, 798.9, 529.4, 800.4, 527.9, 798.4, 523.9, 798.4, 518.1, 799.4, 516.9, 799.4, 515.1, 804.9, 508.4, 809.1, 505.4, 810.9, 505.4, 812.4, 503.9, 810.9, 501.6, 807.9, 501.1, 809.4, 497.9, 807.9, 495.6, 803.4, 497.1, 800.9, 495.6, 798.1, 495.6, 796.9, 496.6, 793.6, 501.1, 792.6, 508.9, 790.9, 510.6, 789.4, 509.9, 789.4, 508.1, 788.4, 506.9, 784.4, 503.6, 785.4, 501.9, 785.4, 485.1, 783.4, 479.9, 783.4, 475.1, 780.4, 469.4, 781.1, 468.4, 782.9, 468.4, 785.4, 465.9, 783.9, 462.9, 789.9, 459.4, 793.4, 455.9, 793.4, 454.1, 789.9, 451.9, 797.4, 445.1, 799.4, 441.9, 797.9, 439.6, 794.1, 439.6, 793.6, 438.9, 798.4, 433.9, 802.4, 427.9, 803.4, 424.1, 805.4, 420.9, 803.9, 418.6, 801.1, 418.6, 797.9, 421.6, 796.1, 422.4, 795.4, 421.9, 799.4, 413.9, 799.4, 412.1, 802.4, 404.9, 802.4, 400.1, 803.4, 398.9, 803.4, 394.1, 801.9, 392.6, 800.1, 392.6, 797.6, 395.1, 795.6, 398.9, 794.1, 400.4, 793.4, 399.9, 793.4, 397.1, 795.4, 392.9, 795.4, 389.1, 796.4, 387.9, 796.4, 383.1, 797.4, 381.9, 797.4, 374.1, 796.4, 372.9, 796.4, 369.1, 793.9, 366.6, 791.6, 368.1, 789.6, 372.1, 789.6, 373.9, 787.6, 377.1, 786.6, 381.4, 785.6, 381.9, 785.4, 363.1, 784.4, 361.9, 783.4, 352.1, 781.4, 347.1, 778.1, 344.6, 775.6, 347.1, 775.6, 348.9, 774.6, 350.1, 774.6, 356.9, 773.6, 358.1, 773.6, 362.9, 772.6, 364.1, 772.6, 369.9, 770.9, 371.1, 770.4, 363.1, 769.4, 361.9, 769.4, 357.1, 768.4, 355.9, 768.4, 353.1, 765.4, 346.9, 765.4, 345.1, 760.1, 338.6, 758.9, 337.6]], "51.64": [[756.1, 335.6, 754.6, 337.1, 754.6, 345.9, 755.6, 347.1, 755.6, 358.9, 756.6, 360.1, 756.6, 374.9, 755.6, 376.1, 755.6, 383.9, 754.6, 385.1, 754.6, 389.9, 753.6, 391.1, 753.6, 404.9, 752.1, 407.4, 751.1, 407.6, 748.9, 405.6, 747.1, 405.6, 745.9, 404.6, 742.6, 406.1, 736.9, 401.6, 735.1, 401.6, 731.9, 398.6, 730.1, 398.6, 728.9, 397.6, 725.1, 397.6, 723.9, 396.6, 708.1, 396.6, 706.9, 397.6, 700.1, 398.6, 689.1, 403.6, 677.6, 412.9, 674.6, 417.1, 669.6, 428.1, 671.1, 430.4, 673.1, 430.9, 670.9, 434.4, 668.4, 432.9, 668.4, 422.1, 664.9, 418.6, 669.4, 414.9, 671.4, 408.1, 675.4, 402.9, 676.4, 400.1, 681.1, 395.4, 694.1, 388.4, 699.9, 387.4, 701.6, 385.9, 712.9, 386.4, 717.1, 388.4, 719.9, 388.4, 726.1, 392.4, 726.9, 392.4, 728.4, 390.1, 726.1, 387.6, 722.9, 385.6, 721.1, 385.6, 717.9, 383.6, 714.1, 383.6, 712.9, 382.6, 703.1, 382.6, 701.4, 384.1, 697.1, 383.6, 695.9, 384.6, 693.1, 384.6, 677.1, 392.6, 670.6, 397.9, 664.6, 406.1, 663.6, 408.1, 663.6, 410.9, 660.6, 416.1, 660.6, 417.9, 662.1, 419.6, 660.6, 422.1, 660.6, 434.9, 661.6, 436.9, 659.6, 439.1, 659.6, 441.9, 658.6, 443.1, 658.6, 448.9, 659.6, 450.1, 659.6, 451.9, 662.1, 454.6, 661.6, 456.9, 662.6, 458.9, 669.1, 465.4, 675.9, 465.4, 677.1, 464.4, 679.4, 461.9, 679.4, 451.4, 685.1, 450.9, 686.6, 453.1, 686.6, 456.9, 685.6, 458.1, 685.6, 461.9, 683.6, 465.1, 683.6, 469.6, 676.1, 469.6, 674.9, 468.6, 672.1, 468.6, 665.1, 465.6, 658.9, 460.4, 660.4, 457.1, 657.9, 454.6, 657.1, 454.6, 655.1, 457.1, 650.1, 456.6, 648.9, 455.4, 649.4, 453.1, 645.9, 449.6, 620.1, 434.6, 599.9, 418.6, 584.9, 404.6, 582.1, 404.6, 580.6, 406.1, 580.6, 410.9, 581.6, 412.1, 581.6, 413.9, 587.6, 425.9, 591.6, 431.1, 600.4, 440.1, 599.4, 440.6, 597.1, 439.6, 574.9, 428.6, 573.1, 428.6, 571.6, 430.1, 571.6, 433.9, 578.6, 443.1, 582.9, 447.4, 592.1, 454.4, 596.9, 456.4, 604.1, 461.4, 608.1, 462.9, 607.4, 463.6, 604.1, 463.6, 599.9, 460.6, 597.1, 460.6, 595.9, 459.6, 593.1, 459.6, 588.9, 457.6, 585.1, 457.6, 583.9, 456.6, 581.1, 456.6, 579.6, 458.1, 579.6, 459.9, 580.6, 461.1, 591.1, 470.4, 601.1, 475.4, 602.9, 475.4, 606.1, 477.4, 607.9, 477.4, 612.1, 479.4, 614.9, 479.4, 617.1, 480.9, 616.4, 481.6, 609.1, 481.6, 607.9, 482.6, 602.1, 483.6, 600.6, 485.9, 603.1, 488.4, 611.1, 491.4, 617.9, 492.4, 619.1, 493.4, 622.9, 493.4, 624.4, 491.9, 624.4, 490.1, 625.9, 489.4, 630.1, 492.4, 634.9, 492.4, 636.1, 493.4, 644.9, 494.4, 653.1, 498.4, 655.9, 498.4, 657.1, 499.4, 661.9, 499.4, 662.6, 500.1, 662.6, 503.6, 661.6, 504.1, 658.9, 502.6, 656.1, 502.6, 654.9, 501.6, 648.1, 501.6, 643.9, 498.6, 642.1, 498.6, 635.9, 495.6, 633.1, 495.6, 631.9, 494.6, 628.1, 494.6, 620.1, 497.6, 617.6, 500.9, 620.1, 503.4, 625.1, 505.4, 643.1, 504.4, 643.4, 506.1, 640.9, 507.6, 637.6, 511.1, 640.1, 514.4, 645.9, 514.4, 647.1, 513.4, 652.9, 512.4, 656.1, 510.4, 657.6, 510.4, 658.1, 511.4, 656.6, 513.1, 656.6, 515.9, 658.1, 517.4, 659.9, 517.4, 662.1, 515.4, 663.9, 515.4, 667.1, 513.4, 670.6, 512.9, 673.1, 515.4, 678.1, 513.4, 681.9, 515.4, 686.9, 512.4, 688.9, 509.6, 691.9, 510.4, 693.4, 508.9, 694.4, 505.1, 692.9, 503.6, 690.4, 503.6, 690.4, 501.1, 689.4, 499.1, 690.9, 496.9, 694.9, 497.4, 695.6, 498.1, 695.6, 502.9, 696.6, 504.1, 696.6, 514.9, 698.6, 517.1, 700.6, 521.9, 717.1, 535.6, 712.6, 544.9, 709.6, 548.1, 707.6, 552.9, 703.6, 558.1, 702.6, 561.9, 704.1, 563.4, 709.9, 563.4, 719.1, 555.9, 719.6, 556.6, 717.6, 561.1, 717.6, 564.9, 719.1, 566.4, 721.9, 566.4, 723.9, 565.4, 729.6, 558.9, 733.1, 563.4, 735.9, 563.4, 741.9, 556.9, 744.9, 559.4, 748.4, 555.9, 748.4, 554.1, 750.4, 550.9, 750.9, 543.9, 756.1, 549.4, 758.9, 549.4, 760.4, 547.9, 760.4, 546.1, 757.4, 542.9, 757.4, 541.1, 756.4, 539.9, 756.4, 535.1, 757.1, 534.4, 758.9, 534.4, 764.9, 530.4, 775.1, 521.4, 777.1, 522.4, 781.9, 522.4, 787.1, 518.4, 790.9, 518.4, 791.6, 519.1, 791.6, 523.9, 795.9, 528.4, 797.9, 529.4, 800.4, 526.9, 799.4, 524.1, 797.4, 521.9, 799.4, 514.1, 805.1, 507.4, 808.1, 505.4, 810.9, 505.4, 812.4, 503.9, 811.1, 501.6, 807.9, 500.1, 809.4, 496.9, 807.9, 494.6, 803.4, 496.1, 800.9, 494.6, 798.1, 494.6, 793.6, 499.1, 793.6, 500.9, 792.6, 502.1, 792.6, 506.9, 791.6, 508.9, 790.1, 509.6, 788.4, 507.9, 784.4, 502.9, 784.4, 500.1, 785.4, 498.9, 785.4, 485.1, 783.4, 479.9, 783.4, 475.1, 780.4, 468.9, 781.1, 467.4, 782.9, 467.4, 786.4, 464.9, 783.9, 461.9, 788.9, 459.4, 793.4, 454.9, 793.4, 453.1, 789.9, 450.9, 798.4, 443.1, 800.4, 439.9, 798.9, 437.6, 797.1, 437.6, 795.9, 438.6, 794.1, 438.6, 793.6, 437.9, 799.4, 431.9, 805.4, 420.9, 805.4, 418.1, 803.9, 416.6, 801.1, 417.6, 798.9, 419.6, 797.1, 420.4, 796.4, 419.9, 798.4, 415.9, 799.4, 411.1, 801.4, 407.9, 801.4, 405.1, 802.4, 403.9, 802.4, 399.1, 803.4, 397.9, 803.4, 392.1, 801.1, 390.6, 797.6, 393.9, 794.4, 398.9, 793.4, 398.9, 793.4, 396.1, 795.4, 391.9, 795.4, 388.1, 796.4, 386.9, 796.4, 381.1, 797.4, 379.9, 797.4, 372.1, 796.4, 370.9, 796.4, 367.1, 793.9, 364.6, 791.6, 366.1, 789.6, 370.1, 789.6, 371.9, 787.6, 375.1, 786.6, 379.4, 785.6, 379.9, 785.4, 365.1, 784.4, 363.9, 784.4, 357.1, 783.4, 355.9, 782.4, 349.1, 779.4, 343.9, 777.1, 342.6, 774.6, 345.1, 774.6, 347.9, 773.6, 349.1, 773.6, 358.9, 772.6, 360.1, 772.6, 364.9, 771.6, 366.1, 771.6, 372.4, 770.9, 373.1, 770.4, 365.1, 769.4, 363.9, 769.4, 359.1, 768.4, 357.9, 767.4, 350.1, 762.4, 340.1, 757.9, 335.6]], "51.72": [[755.1, 333.6, 753.6, 335.1, 753.6, 339.9, 754.6, 341.1, 754.6, 350.9, 755.6, 352.1, 755.6, 381.9, 754.6, 383.1, 754.6, 387.9, 753.6, 389.1, 753.1, 406.1, 751.1, 405.6, 746.9, 402.6, 741.1, 403.6, 736.9, 399.6, 728.9, 395.6, 725.1, 395.6, 723.9, 394.6, 717.1, 394.6, 715.9, 393.6, 711.1, 393.6, 709.9, 394.6, 703.1, 395.6, 701.9, 396.6, 697.1, 397.6, 689.1, 401.6, 677.6, 410.9, 670.6, 423.1, 670.6, 426.9, 671.6, 428.9, 670.6, 430.9, 669.1, 431.6, 667.4, 429.9, 667.4, 418.1, 664.9, 415.9, 666.9, 415.4, 668.4, 413.9, 669.4, 411.9, 669.4, 408.1, 672.4, 404.9, 675.4, 399.1, 679.1, 394.4, 689.1, 388.4, 690.9, 388.4, 694.1, 386.4, 699.9, 385.4, 701.1, 384.4, 711.9, 384.4, 716.1, 386.4, 720.9, 386.4, 726.1, 390.4, 727.9, 390.4, 729.4, 388.1, 726.9, 385.6, 722.9, 383.6, 721.1, 383.6, 717.9, 381.6, 715.1, 381.6, 713.9, 380.6, 702.1, 380.6, 700.9, 381.6, 696.1, 381.6, 691.9, 383.6, 689.1, 383.6, 678.1, 389.6, 672.9, 393.6, 664.6, 403.1, 663.6, 405.1, 663.6, 407.9, 660.6, 413.1, 660.6, 414.9, 663.1, 417.1, 660.6, 419.1, 660.6, 420.9, 659.6, 422.1, 659.6, 423.9, 660.6, 425.1, 661.1, 434.4, 658.6, 439.1, 658.6, 446.9, 663.6, 458.9, 669.1, 463.4, 675.9, 463.4, 677.4, 461.9, 678.4, 459.9, 678.4, 457.1, 679.4, 455.9, 679.4, 454.1, 678.4, 452.9, 678.9, 447.9, 681.1, 451.4, 682.9, 451.4, 685.1, 448.9, 685.6, 456.9, 684.6, 458.1, 684.6, 460.9, 682.6, 464.1, 683.1, 467.4, 682.4, 468.1, 675.1, 467.6, 673.9, 466.6, 671.1, 466.6, 664.1, 463.6, 654.1, 453.6, 643.9, 445.6, 641.1, 444.6, 632.9, 438.6, 623.1, 433.6, 610.9, 423.6, 606.1, 420.6, 590.1, 404.6, 584.9, 400.6, 583.1, 400.6, 580.6, 404.1, 582.6, 410.9, 588.6, 422.9, 594.6, 431.1, 599.4, 436.1, 598.4, 436.6, 596.1, 435.6, 586.1, 430.6, 583.9, 428.6, 580.1, 427.6, 576.9, 425.6, 574.1, 425.6, 572.6, 427.1, 572.6, 430.9, 577.6, 438.1, 587.1, 447.4, 603.4, 458.1, 601.4, 458.6, 599.9, 457.6, 597.1, 457.6, 589.9, 454.6, 586.1, 454.6, 584.9, 453.6, 580.1, 453.6, 578.6, 455.1, 579.6, 457.1, 586.9, 464.4, 588.1, 465.4, 589.9, 465.4, 593.1, 468.4, 601.1, 472.4, 602.9, 472.4, 606.1, 474.4, 607.9, 474.4, 611.1, 476.4, 612.9, 476.4, 616.1, 477.9, 615.4, 478.6, 610.1, 478.6, 608.9, 479.6, 604.1, 479.6, 600.6, 482.1, 601.9, 484.4, 606.1, 487.4, 607.9, 487.4, 609.1, 488.4, 612.9, 488.4, 614.1, 489.4, 619.9, 490.4, 621.1, 491.4, 624.1, 489.4, 625.9, 489.4, 627.1, 490.4, 633.9, 491.4, 636.1, 493.4, 643.9, 494.4, 645.1, 495.4, 649.9, 496.4, 653.1, 498.4, 655.9, 498.4, 662.6, 501.1, 662.6, 503.9, 661.1, 504.6, 658.9, 502.6, 656.1, 502.6, 650.9, 500.6, 646.1, 500.6, 643.4, 502.1, 636.6, 509.1, 638.1, 511.4, 643.9, 512.4, 645.1, 511.4, 647.9, 511.4, 652.1, 509.4, 656.1, 509.4, 656.6, 510.9, 655.6, 512.1, 655.6, 513.9, 657.1, 515.4, 658.9, 515.4, 665.1, 512.4, 667.9, 512.4, 669.6, 510.9, 670.6, 511.4, 670.6, 512.9, 672.1, 514.4, 674.9, 513.4, 677.1, 511.4, 680.9, 513.4, 683.1, 511.4, 684.9, 511.4, 689.4, 506.9, 690.4, 504.9, 690.4, 498.1, 689.6, 496.1, 690.4, 495.9, 692.1, 497.4, 694.9, 497.4, 695.6, 498.1, 695.6, 501.9, 696.6, 503.1, 696.6, 513.9, 698.6, 516.1, 701.6, 522.1, 716.1, 534.6, 711.6, 543.9, 708.6, 547.1, 707.6, 549.9, 701.6, 558.1, 701.6, 559.9, 704.1, 562.4, 707.9, 562.4, 711.9, 560.4, 717.1, 555.6, 717.6, 558.9, 716.6, 560.1, 716.6, 563.9, 718.1, 565.4, 720.9, 565.4, 728.6, 557.9, 732.1, 562.4, 734.9, 562.4, 740.6, 556.9, 743.9, 558.4, 746.4, 556.1, 748.4, 552.9, 748.4, 551.1, 749.4, 549.9, 749.4, 545.1, 750.4, 544.4, 755.1, 548.4, 757.9, 548.4, 759.4, 546.9, 759.4, 545.1, 756.4, 541.9, 756.4, 540.1, 755.4, 538.9, 755.4, 534.1, 756.1, 533.4, 758.9, 533.4, 762.1, 530.4, 768.9, 526.4, 774.6, 520.9, 781.9, 521.4, 786.1, 517.4, 789.9, 517.4, 791.6, 521.1, 791.6, 523.9, 796.1, 527.4, 797.9, 527.4, 800.4, 524.9, 800.4, 524.1, 797.4, 521.9, 797.4, 516.1, 798.4, 514.1, 803.9, 507.4, 808.6, 503.9, 810.9, 504.4, 812.4, 502.9, 809.9, 499.6, 807.6, 500.6, 806.9, 500.1, 807.4, 498.1, 809.4, 495.9, 807.9, 493.6, 803.4, 495.1, 800.9, 493.6, 797.1, 493.6, 794.6, 496.1, 792.6, 500.1, 792.6, 503.9, 791.6, 505.1, 791.6, 506.9, 789.9, 508.6, 788.4, 507.9, 787.4, 505.1, 784.4, 501.9, 784.4, 494.1, 785.4, 492.9, 785.4, 488.1, 784.4, 486.9, 784.4, 481.1, 782.4, 475.9, 782.4, 471.1, 780.4, 467.9, 782.1, 465.4, 783.9, 465.4, 786.4, 462.9, 785.4, 460.1, 787.1, 458.4, 791.1, 456.4, 794.4, 452.9, 793.4, 450.9, 790.9, 448.9, 797.4, 443.1, 800.4, 438.9, 800.4, 437.1, 798.9, 435.6, 796.9, 436.6, 795.1, 436.6, 794.6, 435.9, 798.4, 431.9, 805.4, 419.9, 805.4, 416.1, 803.9, 414.6, 800.1, 416.6, 797.1, 419.4, 795.9, 419.1, 799.4, 411.9, 799.4, 410.1, 802.4, 402.9, 802.4, 400.1, 803.4, 398.9, 803.4, 390.1, 801.9, 388.6, 797.6, 391.9, 794.1, 397.1, 793.4, 396.4, 794.4, 393.9, 794.4, 391.1, 795.4, 389.9, 795.4, 386.1, 796.4, 384.9, 796.4, 378.1, 797.4, 376.9, 797.4, 369.1, 796.4, 367.9, 796.4, 366.1, 793.9, 362.6, 791.9, 363.6, 788.6, 369.1, 786.6, 376.4, 785.6, 376.9, 785.4, 365.1, 784.4, 363.9, 784.4, 357.1, 783.4, 355.9, 783.4, 352.1, 779.4, 342.1, 777.9, 340.6, 776.1, 340.6, 773.6, 343.1, 773.6, 353.9, 772.6, 355.1, 772.6, 361.9, 771.6, 363.1, 771.6, 369.4, 770.9, 370.1, 770.4, 366.1, 769.4, 364.9, 769.4, 359.1, 768.4, 357.9, 768.4, 354.1, 767.4, 352.9, 766.4, 347.1, 760.4, 336.9, 756.9, 333.6], [623.1, 493.6, 617.6, 497.1, 617.6, 498.9, 620.1, 501.4, 621.9, 501.4, 623.1, 502.4, 640.9, 502.4, 642.4, 500.9, 641.1, 498.6, 635.9, 495.6, 634.1, 495.6, 629.9, 493.6]], "51.80": [[755.1, 331.6, 752.6, 334.1, 753.6, 336.1, 753.6, 340.9, 754.6, 342.1, 754.6, 350.9, 755.6, 352.1, 755.6, 380.9, 754.6, 382.1, 754.6, 389.9, 753.6, 391.1, 753.1, 404.1, 751.1, 403.6, 748.9, 401.6, 744.1, 401.6, 742.1, 402.6, 737.9, 398.6, 727.9, 393.6, 724.1, 393.6, 722.9, 392.6, 708.1, 392.6, 706.9, 393.6, 703.1, 393.6, 701.9, 394.6, 697.1, 395.6, 689.1, 399.6, 677.6, 409.1, 670.6, 421.1, 670.6, 424.9, 673.1, 427.1, 669.9, 430.4, 667.4, 428.9, 667.4, 417.1, 664.9, 413.9, 666.9, 413.4, 668.4, 411.9, 669.4, 409.9, 669.4, 406.1, 672.4, 402.9, 675.4, 397.1, 679.1, 392.4, 689.1, 386.4, 690.9, 386.4, 701.1, 382.4, 711.9, 382.4, 716.1, 384.4, 720.9, 384.4, 726.1, 388.4, 727.9, 388.4, 729.4, 386.1, 722.9, 381.6, 721.1, 381.6, 717.9, 379.6, 714.1, 379.6, 712.9, 378.6, 702.1, 378.6, 700.9, 379.6, 693.1, 380.6, 686.9, 383.6, 685.1, 383.6, 678.1, 387.6, 668.6, 395.9, 663.6, 403.1, 663.6, 405.9, 660.6, 411.1, 660.6, 412.9, 663.1, 415.1, 660.6, 417.1, 659.6, 419.1, 659.6, 426.9, 660.6, 428.1, 661.1, 432.4, 658.6, 436.1, 658.6, 445.9, 662.6, 455.9, 666.9, 460.4, 670.1, 462.4, 674.9, 462.4, 677.4, 459.9, 678.4, 457.9, 678.9, 446.9, 681.1, 450.4, 682.9, 450.4, 685.1, 448.9, 685.6, 453.9, 684.6, 455.1, 684.6, 457.9, 682.6, 461.1, 682.6, 463.9, 684.1, 465.6, 683.6, 466.6, 681.1, 466.6, 679.9, 465.6, 673.1, 465.6, 671.9, 464.6, 667.1, 463.6, 662.1, 460.6, 655.9, 453.6, 653.9, 452.6, 647.9, 446.6, 643.9, 443.6, 641.1, 442.6, 636.9, 438.6, 621.1, 429.6, 605.9, 417.6, 591.1, 402.6, 584.9, 397.6, 581.6, 400.1, 581.6, 403.9, 584.6, 410.1, 584.6, 411.9, 586.6, 415.1, 586.6, 416.9, 593.6, 426.9, 600.4, 434.1, 599.4, 434.6, 591.1, 430.6, 588.9, 428.6, 587.1, 428.6, 581.9, 424.6, 580.1, 424.6, 575.9, 422.6, 574.1, 422.6, 572.6, 424.1, 572.6, 426.9, 577.6, 435.1, 587.1, 444.4, 604.4, 456.1, 602.4, 456.6, 597.9, 454.6, 595.1, 454.6, 589.9, 452.6, 586.1, 452.6, 584.9, 451.6, 581.1, 451.6, 579.6, 453.1, 579.6, 454.9, 580.6, 456.1, 590.1, 464.4, 593.9, 465.4, 597.1, 468.4, 598.9, 468.4, 604.1, 471.4, 605.9, 471.4, 609.1, 473.4, 613.9, 474.4, 616.1, 475.9, 615.4, 476.6, 610.1, 476.6, 608.9, 477.6, 604.1, 477.6, 602.9, 478.6, 601.1, 478.6, 599.6, 480.1, 600.9, 482.4, 606.1, 485.4, 611.9, 486.4, 613.1, 487.4, 615.9, 487.4, 617.1, 488.4, 626.9, 488.4, 628.1, 489.4, 629.9, 489.4, 632.1, 492.4, 634.1, 493.4, 639.9, 493.4, 641.1, 494.4, 643.9, 494.4, 645.1, 495.4, 649.9, 496.4, 653.1, 498.4, 655.9, 498.4, 662.6, 501.1, 662.6, 503.9, 661.9, 504.6, 659.1, 504.6, 654.9, 501.6, 651.1, 501.6, 649.9, 500.6, 647.1, 500.6, 645.1, 499.6, 641.1, 501.6, 636.6, 507.1, 636.6, 508.9, 638.1, 510.4, 644.9, 510.4, 646.1, 509.4, 653.9, 508.4, 655.9, 507.4, 656.4, 508.1, 655.6, 509.1, 655.6, 511.9, 657.1, 513.4, 659.9, 513.4, 668.9, 509.6, 669.6, 510.1, 669.6, 511.9, 671.1, 513.4, 673.9, 512.4, 676.6, 509.9, 679.9, 512.4, 682.1, 509.4, 684.9, 509.4, 689.4, 505.9, 689.4, 504.1, 690.4, 502.9, 690.4, 497.1, 691.1, 496.6, 692.1, 497.4, 694.9, 497.4, 696.6, 499.1, 695.6, 501.1, 696.6, 503.1, 696.6, 513.9, 700.6, 520.1, 715.6, 533.4, 712.6, 539.9, 699.6, 558.9, 702.1, 561.4, 706.9, 561.4, 710.9, 559.4, 717.1, 553.9, 717.6, 554.6, 715.6, 559.1, 715.6, 562.9, 717.1, 564.4, 719.9, 564.4, 721.9, 563.4, 727.6, 556.9, 731.1, 561.4, 733.9, 561.4, 739.6, 555.9, 742.9, 557.4, 746.4, 553.9, 748.4, 549.9, 748.4, 544.1, 749.4, 543.4, 755.9, 548.4, 758.4, 545.9, 758.4, 544.1, 754.4, 538.9, 754.4, 533.4, 756.9, 533.4, 759.9, 531.4, 763.1, 528.4, 771.1, 523.4, 773.1, 520.4, 778.9, 521.4, 780.1, 520.4, 781.9, 520.4, 785.1, 517.4, 788.9, 516.4, 790.6, 518.1, 791.6, 523.9, 795.1, 526.4, 797.9, 526.4, 799.4, 524.9, 799.4, 523.1, 797.4, 520.9, 796.9, 518.6, 797.4, 515.1, 799.4, 511.1, 805.1, 505.4, 808.1, 503.4, 810.9, 503.4, 812.4, 501.9, 810.9, 499.6, 806.9, 499.1, 808.4, 495.9, 806.9, 493.6, 802.6, 494.1, 800.9, 492.6, 797.1, 492.6, 793.6, 496.1, 791.6, 501.1, 791.6, 505.9, 789.4, 508.1, 783.4, 500.9, 784.4, 498.9, 784.4, 480.1, 782.4, 475.9, 782.4, 471.1, 780.4, 467.9, 780.4, 466.1, 782.1, 464.4, 783.9, 464.4, 785.4, 463.1, 786.4, 461.9, 785.4, 459.1, 787.1, 457.4, 791.1, 455.4, 794.4, 451.9, 793.4, 449.9, 790.9, 447.9, 798.4, 441.1, 800.4, 437.9, 800.4, 436.1, 798.9, 434.6, 796.9, 435.6, 795.1, 435.6, 794.6, 434.9, 801.4, 426.9, 805.4, 418.9, 805.4, 415.1, 803.9, 413.6, 801.1, 414.6, 797.1, 418.4, 795.9, 418.1, 802.4, 402.9, 802.4, 399.1, 803.4, 397.9, 803.4, 392.1, 804.4, 390.9, 804.4, 389.1, 801.1, 386.6, 798.6, 389.1, 794.4, 395.9, 793.4, 395.4, 794.4, 392.9, 794.4, 390.1, 795.4, 388.9, 795.4, 385.1, 796.4, 383.9, 796.4, 377.1, 797.4, 375.9, 797.4, 368.1, 796.4, 366.9, 796.4, 364.1, 793.9, 360.6, 791.6, 361.9, 789.6, 365.1, 786.6, 375.4, 785.6, 375.9, 785.4, 365.1, 784.4, 363.9, 784.4, 357.1, 783.4, 355.9, 782.4, 348.1, 781.4, 346.9, 780.4, 342.1, 776.1, 338.6, 773.6, 341.1, 773.6, 348.9, 772.6, 350.1, 772.6, 359.9, 771.6, 361.1, 771.6, 366.4, 770.9, 367.1, 769.4, 363.9, 769.4, 359.1, 768.4, 357.9, 767.4, 350.1, 764.4, 343.9, 764.4, 342.1, 759.4, 334.9]], "51.88": [[754.1, 330.6, 752.6, 332.1, 752.6, 334.9, 753.6, 336.1, 753.6, 341.9, 754.6, 343.1, 754.6, 351.9, 755.6, 353.1, 755.6, 379.9, 754.6, 381.1, 754.6, 388.9, 753.6, 390.1, 753.1, 403.1, 747.9, 399.6, 744.1, 399.6, 742.1, 400.6, 737.9, 396.6, 727.9, 391.6, 723.1, 391.6, 721.9, 390.6, 708.1, 390.6, 706.9, 391.6, 700.1, 392.6, 688.1, 398.6, 683.9, 401.6, 675.6, 409.9, 670.6, 419.1, 670.6, 422.9, 673.1, 424.9, 670.6, 427.1, 672.6, 430.4, 672.1, 431.1, 667.4, 426.9, 667.4, 425.1, 666.4, 423.9, 666.4, 415.1, 664.9, 413.6, 662.1, 413.6, 659.6, 416.1, 659.6, 425.9, 660.6, 427.1, 661.1, 430.4, 658.6, 434.1, 657.6, 439.9, 658.6, 441.1, 658.6, 444.9, 659.6, 446.1, 660.6, 450.9, 662.6, 454.1, 666.1, 457.4, 671.1, 460.4, 673.9, 460.4, 676.4, 458.1, 678.4, 454.9, 678.4, 448.4, 681.9, 448.4, 684.1, 444.9, 684.6, 453.9, 682.6, 458.1, 682.6, 464.6, 681.1, 464.6, 679.9, 463.6, 672.1, 463.6, 662.1, 458.6, 645.9, 442.6, 642.1, 440.6, 635.9, 435.6, 633.1, 434.6, 619.1, 425.6, 615.1, 421.6, 611.9, 419.6, 594.4, 403.1, 591.1, 398.6, 585.9, 394.6, 584.1, 394.6, 582.6, 396.1, 582.6, 400.9, 583.6, 402.1, 583.6, 404.9, 585.6, 408.1, 585.6, 409.9, 591.6, 420.9, 601.4, 432.1, 600.4, 432.6, 590.9, 426.6, 575.9, 419.6, 574.1, 419.6, 572.6, 421.1, 572.6, 422.9, 575.6, 428.9, 580.6, 435.1, 587.1, 441.4, 604.4, 453.1, 602.4, 453.6, 600.9, 452.6, 598.1, 452.6, 593.9, 450.6, 591.1, 450.6, 586.9, 448.6, 581.1, 447.6, 579.6, 449.1, 579.6, 450.9, 581.6, 454.1, 585.9, 458.4, 593.1, 463.4, 595.1, 464.4, 597.9, 464.4, 601.1, 467.4, 605.1, 469.4, 609.9, 470.4, 615.1, 472.9, 614.4, 473.6, 610.1, 473.6, 608.9, 474.6, 604.1, 474.6, 602.9, 475.6, 601.1, 475.6, 599.6, 477.1, 599.6, 478.9, 601.1, 480.4, 614.1, 485.4, 621.9, 486.4, 623.1, 487.4, 627.9, 487.4, 629.9, 491.4, 634.1, 493.4, 644.9, 494.4, 651.1, 497.4, 661.9, 500.4, 662.6, 501.1, 662.1, 504.1, 659.1, 503.6, 656.4, 505.1, 654.6, 507.1, 654.6, 509.9, 656.1, 511.4, 660.9, 511.4, 665.9, 509.4, 668.1, 507.4, 669.6, 508.1, 669.6, 509.9, 671.1, 511.4, 676.6, 507.9, 679.9, 510.4, 682.1, 508.4, 683.9, 508.4, 689.4, 503.9, 690.9, 496.9, 695.9, 497.4, 696.6, 498.1, 696.6, 512.9, 700.6, 519.1, 706.1, 523.4, 714.6, 532.1, 709.6, 541.9, 700.6, 554.1, 699.6, 557.9, 702.1, 560.4, 707.9, 559.4, 716.1, 552.9, 716.6, 553.6, 714.6, 558.1, 714.6, 561.9, 716.1, 563.4, 718.9, 563.4, 721.9, 561.4, 726.6, 555.9, 730.1, 560.4, 732.9, 560.4, 738.9, 554.9, 741.1, 556.4, 742.9, 556.4, 745.4, 553.9, 747.4, 549.9, 747.4, 543.1, 748.4, 542.4, 752.1, 546.4, 755.9, 547.4, 758.4, 544.1, 754.4, 539.9, 754.4, 538.1, 753.4, 536.9, 753.4, 533.1, 754.1, 532.4, 755.9, 532.4, 767.9, 524.4, 773.1, 519.4, 775.1, 520.4, 777.9, 520.4, 782.9, 518.4, 786.1, 515.4, 787.9, 515.4, 790.6, 518.1, 791.6, 523.9, 795.1, 526.4, 797.9, 526.4, 799.4, 524.9, 799.4, 523.1, 796.4, 519.9, 796.4, 515.1, 798.4, 511.1, 805.1, 504.4, 808.1, 502.4, 809.9, 502.4, 811.4, 500.9, 809.9, 498.6, 806.9, 498.1, 808.4, 494.9, 806.9, 492.6, 802.6, 493.1, 800.9, 491.6, 797.1, 491.6, 793.6, 495.1, 791.6, 499.1, 791.6, 503.9, 789.9, 506.6, 787.4, 506.6, 787.4, 504.1, 783.4, 499.9, 783.4, 493.1, 784.4, 491.9, 784.4, 483.1, 783.4, 481.9, 783.4, 477.1, 782.4, 475.9, 782.4, 470.1, 779.9, 464.9, 784.9, 462.4, 786.4, 460.9, 786.4, 456.9, 790.9, 454.4, 794.4, 450.9, 794.4, 449.1, 792.9, 447.6, 791.4, 447.6, 790.9, 446.6, 798.4, 440.1, 801.4, 435.9, 799.9, 433.6, 797.1, 433.6, 795.6, 434.6, 794.9, 433.6, 802.4, 423.9, 806.4, 414.9, 804.9, 412.6, 802.1, 412.6, 798.9, 415.6, 797.1, 416.4, 796.4, 415.9, 802.4, 401.9, 802.4, 399.1, 803.4, 397.9, 803.4, 392.1, 804.4, 390.9, 804.4, 387.1, 802.9, 385.6, 801.1, 385.6, 797.6, 389.1, 794.4, 394.9, 793.4, 394.4, 794.4, 391.9, 794.4, 389.1, 795.4, 387.9, 795.4, 384.1, 796.4, 382.9, 796.4, 377.1, 797.4, 375.9, 797.4, 366.1, 796.4, 364.9, 796.4, 362.1, 793.9, 358.6, 791.6, 359.9, 788.6, 366.1, 787.6, 371.9, 786.4, 373.9, 785.6, 373.9, 785.4, 364.1, 784.4, 362.9, 784.4, 355.1, 783.4, 353.9, 782.4, 346.1, 779.4, 339.1, 776.9, 336.6, 775.1, 336.6, 773.6, 338.1, 772.6, 357.9, 771.6, 359.1, 771.6, 365.4, 770.9, 366.1, 770.4, 363.1, 769.4, 361.9, 769.4, 357.1, 768.4, 355.9, 768.4, 353.1, 767.4, 351.9, 766.4, 345.1, 761.4, 335.9, 755.9, 330.6], [641.1, 499.6, 635.6, 504.1, 635.6, 505.9, 639.1, 508.4, 648.9, 507.4, 653.9, 505.4, 655.4, 503.9, 653.9, 501.6, 651.1, 501.6, 646.9, 499.6], [619.1, 490.6, 616.6, 493.1, 616.6, 494.9, 619.1, 497.4, 621.9, 497.4, 623.1, 498.4, 631.9, 498.4, 633.4, 496.9, 631.9, 494.6, 627.9, 492.6, 626.1, 492.6, 622.9, 490.6]], "51.96": [[754.1, 328.6, 752.6, 330.1, 752.6, 334.9, 753.6, 336.1, 753.6, 340.9, 754.6, 342.1, 754.6, 349.9, 755.6, 351.1, 755.6, 367.9, 756.6, 369.9, 755.6, 371.1, 755.6, 378.9, 754.6, 380.1, 754.6, 392.9, 753.6, 394.1, 753.1, 401.1, 747.9, 397.6, 744.1, 397.6, 742.1, 398.6, 737.9, 394.6, 736.1, 394.6, 729.9, 390.6, 727.1, 390.6, 725.9, 389.6, 716.1, 389.6, 714.9, 388.6, 710.1, 388.6, 708.9, 389.6, 701.1, 390.6, 688.1, 396.6, 682.9, 400.6, 676.6, 406.9, 673.6, 411.1, 669.6, 420.1, 671.1, 422.6, 669.6, 425.1, 671.6, 428.4, 671.1, 429.4, 666.4, 424.9, 666.4, 413.1, 664.9, 411.6, 662.1, 411.6, 659.6, 414.1, 659.6, 425.9, 660.6, 427.1, 660.6, 429.9, 658.6, 432.1, 658.6, 433.9, 657.6, 435.1, 657.6, 439.9, 658.6, 441.1, 659.6, 446.9, 662.6, 451.9, 667.9, 457.4, 669.1, 458.4, 673.9, 458.4, 677.4, 454.9, 676.9, 451.6, 677.6, 443.1, 678.4, 443.1, 678.6, 445.9, 680.1, 447.4, 681.9, 447.4, 684.1, 443.9, 684.6, 449.9, 683.6, 451.1, 683.6, 453.9, 681.6, 457.1, 681.6, 459.9, 683.1, 461.6, 682.6, 462.6, 674.1, 462.6, 664.1, 458.6, 643.1, 438.6, 635.9, 433.6, 628.1, 429.6, 623.9, 425.6, 620.1, 423.6, 616.1, 419.6, 612.9, 417.6, 608.1, 412.6, 604.9, 410.6, 603.4, 408.1, 599.9, 405.6, 586.9, 391.6, 585.1, 391.6, 582.6, 394.1, 583.6, 400.9, 586.6, 407.1, 586.6, 408.9, 589.6, 414.9, 596.6, 424.1, 602.4, 430.1, 600.9, 430.4, 588.9, 422.6, 580.9, 418.6, 579.1, 418.6, 575.9, 416.6, 574.1, 416.6, 572.6, 418.1, 572.6, 419.9, 578.6, 430.1, 588.9, 440.4, 604.4, 451.1, 601.1, 451.6, 597.9, 449.6, 596.1, 449.6, 588.9, 446.6, 586.1, 446.6, 584.9, 445.6, 581.1, 445.6, 579.6, 447.1, 579.6, 448.9, 580.6, 450.1, 592.1, 460.4, 594.9, 461.4, 597.1, 463.4, 599.9, 463.4, 601.9, 464.4, 605.1, 467.4, 609.9, 468.4, 615.1, 470.9, 614.4, 471.6, 609.1, 471.6, 607.9, 472.6, 602.1, 472.6, 600.1, 473.6, 598.6, 475.9, 603.1, 479.4, 606.9, 480.4, 610.1, 482.4, 612.9, 482.4, 618.1, 484.4, 621.9, 484.4, 623.1, 485.4, 626.6, 485.4, 626.6, 488.9, 631.1, 492.4, 632.9, 492.4, 634.1, 493.4, 640.9, 493.4, 642.1, 494.4, 645.9, 494.4, 654.1, 498.4, 661.9, 499.4, 662.6, 500.1, 662.1, 504.4, 656.1, 503.6, 652.6, 507.1, 655.1, 510.4, 659.9, 510.4, 667.1, 506.4, 668.1, 506.4, 670.1, 509.4, 671.9, 509.4, 675.6, 506.9, 678.1, 508.4, 680.9, 508.4, 688.4, 503.1, 690.4, 499.9, 690.9, 496.9, 695.9, 497.4, 696.6, 498.1, 696.6, 512.9, 701.9, 519.4, 703.1, 520.4, 705.6, 520.4, 705.6, 521.9, 707.6, 525.1, 714.1, 530.9, 708.6, 540.9, 699.6, 553.1, 698.6, 556.9, 701.1, 559.4, 702.9, 559.4, 707.9, 557.4, 715.1, 551.9, 715.6, 552.6, 713.6, 557.1, 713.6, 560.9, 715.1, 562.4, 717.9, 562.4, 719.9, 561.4, 725.6, 554.9, 726.6, 555.4, 726.6, 557.9, 729.1, 560.4, 731.9, 559.4, 737.9, 553.9, 740.1, 555.4, 741.9, 555.4, 744.4, 552.9, 746.4, 548.9, 746.4, 543.1, 747.6, 541.9, 748.4, 541.9, 751.1, 545.4, 753.1, 546.4, 755.9, 546.4, 757.4, 544.9, 757.4, 543.1, 753.4, 539.9, 752.4, 533.1, 754.1, 531.4, 755.9, 531.4, 759.1, 528.4, 765.9, 524.4, 773.1, 518.4, 776.9, 519.4, 778.1, 518.4, 780.9, 518.4, 784.1, 515.4, 788.9, 515.4, 790.6, 519.1, 790.6, 520.9, 792.6, 524.1, 794.1, 525.4, 797.9, 525.4, 799.4, 523.9, 799.4, 522.1, 796.4, 519.9, 796.4, 514.1, 797.4, 512.9, 797.4, 511.1, 802.1, 505.4, 808.1, 501.4, 809.9, 501.4, 811.4, 499.9, 809.9, 497.6, 806.6, 497.1, 806.4, 496.1, 808.4, 493.9, 806.9, 491.6, 802.6, 492.1, 800.9, 490.6, 797.1, 490.6, 792.6, 495.1, 791.6, 497.1, 790.6, 504.9, 788.9, 506.6, 787.4, 505.9, 787.4, 504.1, 785.4, 500.9, 782.4, 498.6, 783.4, 496.9, 783.4, 491.1, 784.4, 489.9, 784.4, 488.1, 783.4, 486.9, 783.4, 476.1, 782.4, 474.9, 782.4, 469.1, 779.4, 463.4, 780.1, 462.4, 782.9, 462.4, 784.9, 461.4, 786.4, 459.9, 785.6, 455.9, 791.9, 452.4, 794.4, 449.9, 794.4, 448.1, 792.9, 446.6, 791.4, 446.6, 790.9, 445.6, 798.4, 439.1, 801.4, 434.9, 801.4, 433.1, 799.9, 431.6, 797.9, 432.6, 796.1, 432.6, 795.6, 431.9, 802.4, 422.9, 806.4, 414.9, 806.4, 412.1, 804.9, 410.6, 803.1, 410.6, 797.1, 415.4, 796.4, 414.9, 801.4, 403.9, 801.4, 401.1, 803.4, 396.9, 803.4, 393.1, 804.4, 391.9, 804.4, 385.1, 802.9, 383.6, 801.1, 383.6, 795.4, 392.1, 794.4, 393.1, 793.4, 392.4, 794.4, 390.9, 794.4, 388.1, 795.4, 386.9, 795.4, 383.1, 796.4, 381.9, 796.4, 377.1, 797.4, 375.9, 797.4, 365.1, 796.4, 363.9, 796.4, 360.1, 793.9, 356.6, 791.6, 358.1, 790.6, 361.9, 788.6, 365.1, 787.6, 370.9, 786.4, 372.9, 785.6, 372.9, 785.4, 363.1, 784.4, 361.9, 784.4, 354.1, 783.4, 352.9, 783.4, 349.1, 782.4, 347.9, 781.4, 341.1, 778.4, 336.1, 776.9, 334.6, 775.1, 334.6, 773.6, 336.1, 773.6, 344.9, 772.6, 346.1, 772.6, 356.9, 771.6, 358.1, 771.6, 364.4, 770.9, 365.1, 769.4, 361.9, 769.4, 356.1, 768.4, 354.9, 768.4, 351.1, 767.4, 349.9, 767.4, 347.1, 764.4, 340.9, 764.4, 339.1, 760.4, 332.9, 755.9, 328.6]], "52.04": [[754.1, 326.6, 752.6, 328.1, 752.6, 332.9, 753.6, 334.1, 754.6, 347.9, 755.6, 349.1, 755.6, 376.9, 754.6, 378.1, 754.6, 395.9, 753.1, 399.1, 747.9, 395.6, 744.1, 395.6, 742.1, 396.6, 738.9, 393.6, 734.1, 391.6, 731.9, 389.6, 726.1, 388.6, 724.9, 387.6, 716.1, 387.6, 714.9, 386.6, 711.1, 386.6, 709.9, 387.6, 706.1, 387.6, 704.9, 388.6, 702.1, 388.6, 700.9, 389.6, 696.1, 390.6, 688.1, 394.6, 684.1, 397.6, 674.6, 407.1, 669.6, 417.1, 669.6, 418.9, 672.1, 420.9, 669.6, 423.1, 671.6, 426.4, 670.6, 427.1, 666.4, 422.9, 666.4, 410.1, 663.9, 408.1, 668.4, 403.9, 668.4, 400.1, 672.4, 395.9, 675.4, 390.1, 679.1, 386.4, 684.9, 383.4, 687.1, 381.4, 688.9, 381.4, 692.1, 379.4, 693.9, 379.4, 698.1, 377.4, 700.9, 377.4, 702.4, 375.1, 700.9, 373.6, 698.1, 373.6, 696.9, 374.6, 694.1, 374.6, 692.9, 375.6, 688.1, 376.6, 680.1, 380.6, 670.9, 387.6, 664.6, 395.1, 663.6, 397.1, 663.6, 399.9, 660.6, 404.1, 660.6, 406.9, 662.1, 409.1, 659.6, 411.1, 659.6, 423.9, 661.1, 426.4, 658.6, 429.1, 658.6, 430.9, 657.6, 432.1, 657.6, 439.9, 658.6, 441.1, 659.6, 445.9, 662.4, 447.9, 661.6, 449.9, 670.1, 456.4, 673.9, 456.4, 675.4, 454.9, 677.4, 451.9, 677.6, 443.1, 680.9, 445.4, 682.4, 443.9, 682.4, 441.6, 683.1, 440.9, 684.6, 446.9, 683.6, 448.1, 683.6, 451.9, 681.6, 455.1, 682.1, 460.1, 681.4, 460.6, 679.9, 459.6, 677.9, 460.6, 670.1, 459.6, 662.1, 455.6, 646.1, 438.6, 628.9, 426.6, 626.1, 425.6, 615.9, 417.6, 586.9, 388.6, 585.1, 388.6, 582.6, 392.1, 584.6, 399.9, 587.6, 405.1, 587.6, 406.9, 590.6, 412.9, 596.6, 421.1, 602.4, 427.1, 600.9, 427.4, 588.9, 419.6, 587.1, 419.6, 584.9, 417.6, 576.9, 413.6, 575.1, 413.6, 573.6, 415.1, 573.6, 418.9, 578.6, 427.1, 589.9, 438.4, 597.9, 443.4, 603.4, 447.9, 602.4, 448.6, 591.9, 444.6, 589.1, 444.6, 583.9, 442.6, 581.1, 442.6, 579.6, 444.1, 579.6, 445.9, 584.1, 451.4, 593.1, 458.4, 602.1, 463.4, 605.9, 463.4, 609.1, 466.4, 613.9, 467.4, 616.1, 468.9, 615.4, 469.6, 605.1, 469.6, 603.9, 470.6, 601.1, 470.6, 598.6, 473.9, 605.1, 478.4, 606.9, 478.4, 611.1, 480.4, 613.9, 480.4, 615.1, 481.4, 617.9, 481.4, 619.1, 482.4, 622.9, 482.4, 624.9, 483.6, 624.4, 484.6, 618.1, 486.6, 615.6, 489.1, 619.1, 493.4, 622.9, 494.4, 624.4, 492.9, 624.4, 490.1, 625.1, 489.4, 626.9, 489.4, 631.1, 492.4, 634.9, 492.4, 636.1, 493.4, 643.9, 493.4, 648.1, 496.4, 649.9, 496.4, 654.1, 498.4, 658.9, 498.4, 662.6, 501.1, 662.6, 503.9, 664.1, 505.4, 667.1, 504.4, 667.6, 506.9, 669.1, 508.4, 671.9, 507.4, 675.1, 504.4, 676.1, 504.6, 678.1, 507.4, 680.9, 506.4, 688.1, 501.4, 691.1, 496.4, 696.6, 497.4, 696.6, 512.9, 698.9, 514.4, 703.1, 519.4, 705.6, 519.4, 706.6, 522.9, 713.1, 529.6, 712.6, 531.9, 700.6, 549.9, 697.6, 553.1, 697.6, 554.9, 700.1, 557.4, 704.9, 557.4, 714.1, 549.9, 714.6, 550.6, 711.6, 558.1, 714.1, 561.4, 717.9, 560.4, 725.1, 552.6, 725.6, 556.9, 728.1, 559.4, 730.9, 558.4, 736.6, 552.9, 739.1, 554.4, 740.9, 554.4, 743.4, 551.9, 745.4, 547.9, 745.4, 544.1, 746.9, 540.9, 750.1, 544.4, 752.1, 545.4, 754.9, 545.4, 756.4, 543.1, 752.4, 537.9, 751.4, 532.1, 753.1, 530.4, 754.9, 530.4, 758.1, 527.4, 764.9, 523.4, 772.1, 517.4, 774.1, 518.4, 776.1, 517.4, 779.9, 517.4, 783.1, 514.4, 786.9, 513.4, 789.6, 516.1, 789.6, 518.9, 791.6, 522.9, 795.1, 525.4, 796.9, 525.4, 799.4, 522.1, 795.4, 517.9, 795.4, 514.1, 798.4, 508.1, 802.1, 504.4, 810.4, 498.9, 808.9, 496.6, 805.9, 496.1, 807.4, 492.9, 805.9, 490.6, 801.6, 491.1, 799.9, 489.6, 797.1, 489.6, 793.6, 492.1, 791.6, 495.1, 790.6, 502.9, 788.4, 505.1, 782.4, 497.9, 782.4, 495.1, 783.4, 493.9, 783.4, 476.1, 782.4, 474.9, 782.4, 470.1, 781.4, 468.9, 781.4, 466.1, 779.4, 462.4, 782.1, 460.4, 785.9, 459.4, 787.4, 457.1, 784.9, 454.9, 786.9, 454.4, 795.4, 447.9, 794.1, 445.6, 790.9, 443.9, 800.4, 435.1, 801.4, 433.9, 801.4, 432.1, 799.9, 430.6, 797.1, 430.6, 795.6, 431.6, 794.9, 430.6, 802.4, 421.9, 806.4, 413.9, 806.4, 410.1, 804.9, 408.6, 801.1, 410.6, 798.1, 413.4, 796.9, 413.1, 799.4, 407.9, 799.4, 406.1, 801.4, 402.9, 801.4, 400.1, 803.4, 395.9, 803.4, 392.1, 804.4, 390.9, 804.4, 383.1, 802.1, 381.6, 797.6, 386.1, 794.4, 391.9, 793.4, 391.4, 794.4, 387.1, 795.4, 385.9, 795.4, 383.1, 796.4, 381.9, 796.4, 376.1, 797.4, 374.9, 797.4, 361.1, 795.1, 356.6, 793.9, 355.6, 791.9, 356.6, 790.6, 358.1, 790.6, 359.9, 789.6, 361.1, 786.6, 371.4, 785.6, 371.9, 785.4, 359.1, 784.4, 357.9, 784.4, 351.1, 783.4, 349.9, 783.4, 346.1, 782.4, 344.9, 780.4, 337.1, 777.1, 333.6, 775.1, 332.6, 773.6, 334.1, 773.6, 343.9, 772.6, 345.1, 772.6, 353.9, 771.6, 355.1, 771.6, 362.4, 770.9, 363.1, 770.4, 359.1, 769.4, 357.9, 769.4, 353.1, 768.4, 351.9, 768.4, 349.1, 767.4, 347.9, 766.4, 342.1, 764.4, 338.9, 764.4, 337.1, 759.4, 329.9, 755.9, 326.6]], "52.12": [[754.1, 324.6, 752.6, 326.1, 752.6, 330.9, 753.6, 332.1, 754.6, 345.9, 755.6, 347.1, 755.6, 362.9, 756.6, 364.1, 756.6, 365.9, 755.6, 367.1, 755.6, 375.9, 754.6, 377.1, 754.6, 394.9, 753.1, 397.1, 748.9, 394.6, 741.1, 394.6, 736.9, 390.6, 735.1, 390.6, 732.9, 388.6, 727.9, 386.6, 724.1, 386.6, 722.9, 385.6, 707.1, 385.6, 705.9, 386.6, 703.1, 386.6, 701.9, 387.6, 694.1, 389.6, 690.1, 391.6, 681.9, 397.6, 674.6, 405.1, 669.6, 415.1, 669.6, 416.9, 671.1, 419.1, 668.1, 422.4, 666.4, 420.9, 665.9, 417.4, 666.4, 409.1, 664.9, 407.6, 661.1, 407.6, 659.6, 409.1, 659.6, 410.9, 658.6, 412.1, 658.6, 418.9, 659.6, 420.1, 659.6, 422.9, 660.6, 424.9, 657.6, 428.1, 657.6, 439.9, 659.6, 443.1, 659.6, 444.9, 661.1, 446.4, 663.4, 445.4, 664.9, 445.6, 665.1, 446.1, 662.6, 448.1, 663.6, 450.1, 668.1, 454.4, 670.1, 455.4, 672.9, 455.4, 676.4, 451.9, 675.9, 447.6, 677.4, 445.9, 677.4, 443.4, 680.9, 443.4, 683.1, 440.9, 683.6, 448.9, 681.6, 453.9, 679.6, 456.1, 679.6, 458.6, 672.1, 458.6, 663.1, 454.6, 646.1, 436.6, 641.1, 433.6, 636.9, 429.6, 627.9, 423.6, 625.1, 422.6, 619.9, 418.6, 611.1, 409.6, 607.9, 407.6, 602.4, 402.1, 600.4, 398.9, 593.4, 392.1, 591.4, 388.9, 586.9, 385.6, 583.6, 388.1, 583.6, 392.9, 584.6, 394.1, 585.6, 398.9, 590.6, 409.9, 600.4, 423.1, 599.4, 423.6, 595.1, 421.6, 591.9, 418.6, 576.9, 410.6, 574.1, 410.6, 572.6, 412.1, 575.6, 419.9, 581.6, 428.1, 592.9, 438.4, 599.9, 442.4, 602.4, 444.9, 601.9, 445.6, 600.1, 445.6, 598.9, 444.6, 597.1, 444.6, 586.9, 440.6, 584.1, 440.6, 582.9, 439.6, 581.1, 439.6, 579.6, 441.1, 579.6, 443.9, 586.9, 451.4, 595.1, 457.4, 599.9, 459.4, 604.1, 462.4, 606.9, 462.4, 608.1, 463.4, 613.1, 463.4, 613.6, 464.9, 616.1, 466.9, 615.4, 467.6, 604.1, 467.6, 602.9, 468.6, 600.1, 468.6, 598.6, 470.1, 598.6, 471.9, 601.1, 474.4, 604.9, 475.4, 608.1, 477.4, 613.9, 478.4, 615.1, 479.4, 617.9, 479.4, 619.1, 480.4, 622.9, 480.4, 624.1, 481.6, 623.6, 482.6, 619.1, 483.6, 614.6, 487.1, 617.1, 490.4, 621.1, 492.4, 625.1, 489.4, 629.1, 491.4, 632.9, 491.4, 634.1, 492.4, 642.1, 491.9, 644.1, 494.4, 648.1, 496.4, 649.9, 496.4, 651.1, 497.4, 656.9, 497.4, 660.1, 500.4, 661.9, 500.4, 664.1, 503.4, 667.1, 502.6, 667.6, 504.9, 669.1, 506.4, 671.9, 505.4, 674.1, 503.4, 677.1, 505.4, 679.9, 505.4, 682.1, 503.4, 685.9, 505.4, 688.4, 502.9, 687.9, 500.6, 690.9, 495.9, 696.4, 497.9, 695.6, 502.9, 696.6, 504.1, 696.6, 512.9, 698.9, 514.4, 703.1, 519.4, 705.1, 518.9, 707.6, 523.1, 712.6, 528.1, 709.6, 533.9, 702.6, 543.1, 699.6, 548.9, 696.6, 552.1, 696.6, 554.9, 698.1, 556.4, 703.9, 556.4, 707.1, 554.4, 713.1, 548.6, 713.6, 550.9, 710.6, 557.1, 713.1, 560.4, 714.9, 560.4, 718.1, 558.4, 724.9, 550.9, 725.6, 552.6, 724.6, 554.9, 727.1, 558.4, 731.9, 556.4, 736.1, 552.4, 739.9, 553.4, 742.4, 551.1, 744.4, 547.9, 745.9, 539.9, 749.1, 543.4, 751.1, 544.4, 753.9, 544.4, 755.4, 542.9, 755.4, 541.1, 752.4, 537.9, 752.4, 536.1, 751.4, 534.9, 751.4, 529.4, 753.9, 529.4, 755.9, 528.4, 771.6, 516.9, 775.9, 517.4, 777.1, 516.4, 779.9, 516.4, 783.1, 513.4, 787.9, 513.4, 789.6, 517.1, 789.6, 518.9, 791.6, 522.1, 794.1, 524.4, 796.9, 524.4, 798.4, 522.9, 798.4, 521.1, 795.4, 517.9, 795.4, 513.1, 798.4, 507.1, 806.1, 500.4, 809.9, 500.4, 811.4, 498.9, 809.9, 496.6, 806.4, 494.9, 807.4, 491.1, 805.9, 489.6, 802.1, 490.6, 799.9, 488.6, 797.1, 488.6, 793.6, 491.1, 790.6, 497.1, 790.6, 501.9, 787.9, 504.6, 786.4, 503.9, 786.4, 501.1, 782.4, 496.9, 782.4, 491.1, 783.4, 489.9, 783.4, 475.1, 782.4, 473.9, 782.4, 469.1, 781.4, 467.9, 781.4, 465.1, 779.4, 461.4, 782.1, 459.4, 785.9, 458.4, 787.4, 456.1, 784.9, 453.9, 789.9, 451.4, 795.4, 445.9, 793.9, 443.6, 791.6, 443.6, 790.9, 442.9, 801.4, 432.9, 802.4, 430.1, 800.9, 428.6, 799.1, 428.6, 797.9, 429.6, 796.1, 429.6, 795.6, 428.9, 802.4, 420.9, 807.4, 409.9, 805.9, 407.6, 804.1, 407.6, 798.9, 411.6, 797.4, 411.1, 800.4, 404.9, 800.4, 403.1, 803.4, 395.9, 803.4, 392.1, 804.4, 390.9, 804.4, 382.1, 802.9, 380.6, 798.6, 383.9, 794.9, 389.4, 794.4, 388.9, 794.4, 386.1, 796.4, 380.9, 796.4, 377.1, 797.4, 375.9, 797.4, 359.1, 796.4, 357.9, 796.4, 356.1, 793.1, 353.6, 790.6, 357.1, 790.6, 358.9, 788.6, 362.1, 787.6, 367.9, 786.4, 370.9, 785.6, 370.9, 785.4, 356.1, 784.4, 354.9, 784.4, 348.1, 783.4, 346.9, 783.4, 344.1, 782.4, 342.9, 781.4, 337.1, 778.4, 331.9, 776.1, 330.6, 773.6, 333.1, 773.6, 341.9, 772.6, 343.1, 772.6, 353.9, 771.6, 355.1, 771.6, 361.4, 770.9, 362.1, 770.4, 357.1, 769.4, 355.9, 769.4, 351.1, 768.4, 349.9, 768.4, 347.1, 767.4, 345.9, 766.4, 340.1, 764.4, 336.9, 764.4, 335.1, 759.4, 327.9, 756.9, 325.6]], "52.20": [[754.1, 322.6, 752.6, 324.1, 752.6, 328.9, 753.6, 330.1, 753.6, 334.9, 754.6, 336.1, 754.6, 342.9, 755.6, 344.1, 755.6, 354.9, 756.6, 356.1, 756.6, 367.9, 755.6, 369.1, 755.6, 374.9, 754.6, 376.1, 754.1, 395.4, 753.1, 395.6, 748.9, 392.6, 741.1, 392.6, 737.9, 389.6, 727.9, 384.6, 724.1, 384.6, 722.9, 383.6, 721.1, 383.6, 719.9, 384.6, 717.9, 383.6, 707.1, 383.6, 705.9, 384.6, 703.1, 384.6, 690.1, 389.6, 682.9, 394.6, 675.6, 401.9, 672.6, 407.9, 670.6, 410.1, 669.6, 414.9, 671.1, 417.1, 668.6, 419.1, 669.4, 421.1, 668.4, 421.6, 666.4, 418.9, 666.4, 417.1, 665.4, 415.9, 665.4, 411.1, 666.4, 409.9, 666.4, 407.1, 663.9, 403.6, 668.4, 399.9, 667.9, 396.6, 672.4, 391.9, 674.4, 387.1, 679.1, 382.4, 688.1, 377.4, 689.9, 377.4, 693.1, 375.4, 698.9, 374.4, 700.1, 373.4, 712.9, 373.4, 714.1, 374.4, 717.9, 374.4, 719.1, 375.4, 721.9, 375.4, 727.1, 379.4, 729.4, 377.9, 729.4, 376.1, 724.9, 372.6, 723.1, 372.6, 719.9, 370.6, 716.1, 370.6, 714.9, 369.6, 699.1, 369.6, 697.9, 370.6, 695.1, 370.6, 693.9, 371.6, 688.1, 372.6, 680.1, 376.6, 671.9, 382.6, 664.6, 391.1, 662.6, 395.1, 662.6, 396.9, 660.6, 400.1, 660.6, 402.9, 662.1, 405.1, 658.6, 408.1, 658.6, 417.9, 659.6, 419.1, 660.1, 422.4, 657.6, 426.1, 657.6, 428.9, 656.6, 430.1, 657.6, 439.9, 662.1, 445.4, 664.4, 444.9, 665.6, 446.1, 664.6, 448.9, 668.1, 452.4, 671.9, 452.4, 676.4, 448.9, 676.9, 440.9, 680.9, 441.4, 682.1, 440.4, 683.1, 440.6, 683.6, 443.9, 682.6, 445.1, 682.6, 450.9, 679.6, 454.1, 679.6, 456.6, 672.1, 456.6, 670.9, 455.6, 666.1, 454.6, 661.9, 451.6, 647.9, 435.6, 637.9, 427.6, 635.1, 426.6, 619.9, 415.6, 594.4, 390.1, 592.4, 386.9, 587.9, 382.6, 586.1, 382.6, 583.6, 385.1, 583.6, 388.9, 584.6, 390.1, 586.6, 397.9, 592.6, 409.9, 595.6, 414.1, 600.6, 419.1, 601.4, 421.1, 600.4, 421.6, 595.1, 418.6, 589.9, 414.6, 587.1, 413.6, 583.9, 410.6, 579.9, 408.6, 575.1, 407.6, 573.6, 409.1, 573.6, 411.9, 577.6, 419.9, 582.6, 426.1, 588.9, 432.4, 603.4, 442.9, 602.9, 443.6, 601.1, 443.6, 597.9, 441.6, 593.1, 440.6, 590.9, 438.6, 585.1, 437.6, 583.9, 436.6, 580.1, 436.6, 578.6, 438.1, 578.6, 439.9, 582.6, 445.1, 592.1, 453.4, 602.9, 458.4, 605.1, 460.4, 606.9, 460.4, 611.1, 462.4, 620.1, 462.9, 617.9, 464.6, 606.1, 464.6, 604.9, 465.6, 600.1, 465.6, 598.6, 467.1, 598.6, 468.9, 599.9, 470.4, 607.1, 474.4, 625.1, 478.9, 624.4, 479.6, 622.1, 479.6, 618.9, 481.6, 617.1, 481.6, 615.6, 482.9, 614.6, 484.1, 614.6, 485.9, 617.1, 488.4, 619.1, 489.4, 623.9, 489.4, 625.9, 488.4, 627.1, 489.4, 630.9, 489.4, 632.1, 490.4, 634.1, 489.4, 639.6, 489.4, 639.6, 492.9, 641.1, 494.4, 643.9, 494.4, 648.1, 496.4, 654.9, 496.4, 657.1, 499.4, 662.9, 500.4, 664.1, 501.4, 666.4, 500.4, 667.1, 500.9, 666.6, 502.9, 668.1, 504.4, 669.9, 504.4, 672.1, 502.4, 674.1, 501.9, 676.1, 504.4, 681.1, 502.4, 681.6, 503.9, 683.9, 505.4, 687.4, 501.9, 689.4, 495.1, 690.4, 494.4, 693.1, 497.4, 694.9, 497.4, 696.1, 498.6, 695.6, 502.9, 696.6, 504.1, 696.6, 511.9, 698.9, 513.4, 703.1, 518.4, 704.9, 518.4, 706.6, 520.1, 707.6, 522.9, 710.9, 525.4, 711.6, 526.9, 709.6, 530.9, 695.6, 551.1, 695.6, 552.9, 698.1, 555.4, 701.9, 555.4, 705.9, 553.4, 712.1, 547.9, 712.6, 548.6, 709.6, 555.1, 709.6, 556.9, 712.1, 559.4, 713.9, 559.4, 717.1, 557.4, 723.9, 549.9, 724.6, 550.6, 724.6, 554.9, 726.1, 556.4, 728.9, 556.4, 733.1, 553.4, 734.9, 550.9, 737.1, 552.4, 738.9, 552.4, 742.4, 548.9, 744.4, 544.9, 744.9, 537.9, 748.1, 542.4, 750.1, 543.4, 752.9, 543.4, 754.4, 541.9, 754.4, 540.1, 751.4, 536.9, 751.4, 535.1, 750.4, 533.9, 750.4, 528.4, 752.9, 528.4, 760.1, 523.4, 764.9, 521.4, 771.1, 515.4, 773.1, 516.4, 775.1, 515.4, 779.9, 515.4, 783.1, 512.4, 787.9, 512.4, 788.6, 513.1, 788.6, 516.9, 790.6, 520.1, 794.1, 523.4, 796.9, 523.4, 798.4, 521.9, 798.4, 520.1, 795.4, 516.9, 794.9, 514.6, 795.4, 511.1, 797.4, 507.1, 803.1, 501.4, 806.1, 499.4, 808.9, 499.4, 810.4, 497.9, 807.9, 494.6, 805.6, 494.1, 807.4, 490.9, 805.9, 488.6, 804.1, 488.6, 800.9, 490.1, 798.9, 487.6, 795.1, 488.6, 792.6, 491.1, 790.6, 495.1, 790.6, 498.9, 789.6, 500.1, 789.6, 501.9, 787.9, 503.6, 786.4, 502.9, 786.4, 501.1, 784.4, 497.9, 781.4, 495.9, 781.4, 494.1, 782.4, 492.9, 782.4, 472.1, 781.4, 470.9, 781.4, 465.1, 778.9, 458.9, 784.9, 457.4, 786.1, 456.4, 787.4, 454.1, 785.9, 451.9, 790.9, 449.4, 795.4, 444.9, 791.9, 440.6, 799.4, 434.1, 802.4, 429.9, 800.9, 427.6, 797.1, 427.6, 796.6, 426.9, 803.4, 417.9, 807.4, 408.9, 807.4, 407.1, 805.1, 405.6, 798.1, 410.4, 797.4, 409.9, 800.4, 403.9, 800.4, 402.1, 803.4, 394.9, 803.4, 392.1, 804.4, 390.9, 804.4, 386.1, 805.4, 384.9, 805.4, 381.1, 802.1, 378.6, 798.6, 382.1, 795.4, 387.9, 794.4, 387.4, 795.4, 384.9, 795.4, 381.1, 796.4, 379.9, 796.4, 376.1, 797.4, 374.9, 797.4, 368.1, 798.4, 366.9, 797.4, 356.1, 794.9, 352.6, 793.1, 352.6, 791.6, 353.9, 790.6, 355.1, 787.6, 365.9, 786.4, 368.9, 785.6, 368.9, 785.4, 351.1, 784.4, 349.9, 784.4, 346.1, 783.4, 344.9, 783.4, 342.1, 782.4, 340.9, 781.4, 335.1, 778.4, 329.9, 776.1, 328.6, 773.6, 331.1, 772.6, 352.9, 771.6, 354.1, 771.6, 359.4, 770.9, 360.1, 769.4, 348.1, 768.4, 346.9, 768.4, 344.1, 767.4, 342.9, 766.4, 338.1, 764.4, 334.9, 764.4, 333.1, 759.4, 325.9, 756.9, 323.6]], "52.28": [[754.1, 320.6, 752.6, 322.1, 752.6, 325.9, 753.6, 327.1, 753.6, 331.9, 754.6, 333.1, 754.6, 339.9, 755.6, 341.1, 755.6, 350.9, 756.6, 352.1, 756.6, 368.9, 755.6, 370.1, 755.6, 375.9, 754.6, 377.1, 754.1, 394.1, 748.9, 390.6, 744.1, 390.6, 742.1, 391.6, 737.9, 387.6, 734.1, 386.6, 731.9, 384.6, 726.9, 382.6, 709.1, 381.6, 707.9, 382.6, 700.1, 383.6, 696.9, 385.6, 695.1, 385.6, 687.1, 389.6, 681.9, 393.6, 675.6, 400.1, 668.6, 413.1, 670.1, 415.4, 672.4, 415.4, 673.1, 416.1, 670.1, 416.6, 668.1, 419.4, 665.4, 415.9, 665.4, 409.1, 666.4, 407.9, 666.4, 405.1, 664.9, 403.6, 662.1, 403.6, 658.6, 406.1, 658.6, 416.9, 659.6, 418.1, 660.1, 421.4, 657.6, 424.1, 657.6, 426.9, 656.6, 428.1, 657.6, 437.9, 660.6, 443.9, 662.1, 445.4, 664.9, 445.4, 665.6, 446.1, 665.6, 448.9, 667.1, 450.4, 668.9, 450.4, 670.1, 451.4, 672.9, 451.4, 675.4, 448.9, 676.4, 446.9, 676.9, 440.6, 677.9, 440.4, 679.1, 441.4, 682.1, 440.9, 682.6, 445.9, 681.6, 447.1, 681.6, 453.9, 680.9, 454.6, 671.1, 454.6, 664.1, 451.6, 659.9, 448.6, 654.4, 440.9, 644.1, 430.6, 637.9, 425.6, 625.1, 417.6, 620.1, 412.6, 616.9, 410.6, 587.9, 379.6, 586.1, 379.6, 583.6, 383.1, 584.6, 388.9, 585.6, 390.1, 587.6, 397.9, 591.6, 405.9, 595.6, 411.9, 600.6, 417.1, 600.6, 418.1, 599.1, 418.6, 584.9, 408.6, 576.9, 404.6, 575.1, 404.6, 573.6, 406.1, 573.6, 409.9, 575.6, 413.9, 581.6, 422.1, 591.9, 432.4, 603.1, 440.6, 602.4, 441.6, 596.9, 438.6, 595.1, 438.6, 588.9, 435.6, 586.1, 435.6, 581.1, 433.6, 578.6, 436.9, 585.6, 446.1, 594.1, 452.4, 608.1, 459.4, 609.9, 459.4, 613.1, 461.4, 619.9, 461.4, 621.1, 462.6, 620.6, 463.6, 619.1, 463.6, 617.9, 462.6, 611.1, 462.6, 609.9, 463.6, 600.1, 463.6, 598.6, 465.1, 598.6, 466.9, 600.1, 468.4, 605.1, 471.4, 606.9, 471.4, 613.1, 474.4, 615.9, 474.4, 617.1, 475.4, 619.9, 475.4, 621.1, 476.4, 625.1, 476.9, 624.4, 477.6, 621.1, 477.6, 619.9, 478.6, 618.1, 478.6, 614.9, 480.6, 613.6, 482.1, 613.6, 483.9, 615.1, 485.4, 620.1, 487.4, 626.9, 487.4, 628.1, 488.4, 633.9, 488.4, 635.1, 487.4, 639.4, 487.4, 640.1, 488.1, 636.6, 491.1, 638.1, 493.4, 640.1, 494.4, 643.9, 494.4, 645.1, 495.4, 652.9, 495.4, 655.1, 498.4, 659.1, 500.4, 665.1, 499.4, 667.1, 502.4, 669.9, 502.4, 672.1, 500.4, 674.1, 499.9, 676.1, 502.4, 677.9, 502.4, 681.1, 500.6, 681.6, 501.9, 683.9, 503.4, 687.4, 499.9, 687.4, 498.1, 689.4, 494.9, 689.4, 492.6, 690.4, 492.1, 691.6, 495.9, 693.1, 497.4, 694.9, 497.4, 695.6, 498.1, 695.6, 501.9, 696.6, 503.1, 696.6, 511.9, 704.9, 518.4, 710.6, 525.1, 708.6, 529.9, 700.6, 541.1, 699.6, 543.9, 695.6, 548.1, 694.6, 551.9, 696.1, 553.4, 701.9, 553.4, 705.9, 551.4, 711.1, 546.6, 711.6, 548.9, 708.6, 554.1, 708.6, 555.9, 711.1, 558.4, 715.9, 556.4, 722.6, 549.9, 723.6, 550.4, 723.6, 553.9, 725.1, 555.4, 727.9, 555.4, 729.9, 554.4, 734.1, 550.4, 736.1, 551.4, 738.9, 551.4, 742.4, 546.9, 742.4, 545.1, 743.4, 543.9, 743.4, 539.1, 744.4, 538.4, 749.1, 542.4, 751.9, 542.4, 753.4, 540.9, 753.4, 539.1, 750.4, 535.9, 750.4, 534.1, 749.4, 532.9, 749.4, 528.1, 750.1, 527.4, 752.9, 527.4, 755.1, 525.4, 757.9, 524.4, 761.1, 521.4, 766.9, 518.4, 770.6, 514.9, 777.9, 515.4, 783.1, 511.4, 786.9, 511.4, 788.6, 513.1, 788.6, 516.9, 790.6, 520.1, 793.1, 522.4, 795.9, 522.4, 797.4, 520.9, 797.4, 519.1, 795.4, 516.9, 794.4, 513.1, 797.4, 506.1, 806.1, 498.4, 808.9, 498.4, 810.4, 496.9, 808.9, 494.6, 805.6, 494.1, 806.4, 490.1, 804.9, 488.6, 800.9, 489.1, 798.9, 486.6, 796.1, 486.6, 791.6, 491.1, 790.6, 493.1, 790.6, 495.9, 789.6, 497.1, 789.6, 500.9, 787.9, 502.6, 786.4, 501.9, 785.4, 499.1, 781.4, 494.9, 781.4, 491.1, 782.4, 489.9, 782.4, 472.1, 781.4, 470.9, 781.4, 464.1, 778.9, 457.9, 785.9, 455.4, 787.4, 453.9, 785.9, 450.9, 791.9, 447.4, 795.4, 443.9, 795.4, 442.1, 793.9, 440.6, 791.6, 440.6, 790.9, 439.9, 795.1, 437.4, 802.4, 428.9, 802.4, 427.1, 800.9, 425.6, 798.9, 426.6, 797.1, 426.6, 796.6, 425.9, 802.4, 418.9, 807.4, 408.9, 807.4, 406.1, 805.9, 404.6, 804.1, 404.6, 798.4, 409.1, 797.4, 408.4, 802.4, 397.9, 802.4, 395.1, 804.4, 390.9, 804.4, 387.1, 805.4, 385.9, 805.4, 379.1, 803.9, 377.6, 802.1, 377.6, 799.6, 380.1, 795.4, 386.9, 794.4, 386.4, 795.4, 383.9, 795.4, 381.1, 796.4, 379.9, 796.4, 377.1, 797.4, 375.9, 797.4, 370.1, 798.4, 368.9, 798.4, 358.1, 797.4, 356.9, 797.4, 353.1, 794.9, 350.6, 793.1, 350.6, 791.6, 352.1, 791.6, 353.9, 788.6, 360.1, 788.6, 362.9, 785.9, 369.1, 785.4, 366.4, 786.4, 364.9, 786.4, 363.1, 785.4, 361.9, 785.4, 347.1, 784.4, 345.9, 784.4, 342.1, 782.4, 337.9, 782.4, 335.1, 779.4, 329.1, 777.9, 327.6, 775.1, 327.6, 773.6, 329.1, 773.6, 339.9, 772.6, 341.1, 772.6, 353.9, 770.9, 355.1, 770.4, 350.1, 769.4, 348.9, 769.4, 345.1, 767.4, 340.9, 766.4, 335.1, 760.4, 324.9, 755.9, 320.6]], "52.36": [[755.1, 318.6, 752.6, 321.1, 753.6, 323.1, 753.6, 326.9, 754.6, 328.1, 754.6, 334.9, 755.6, 336.1, 755.6, 342.9, 756.6, 344.1, 756.6, 368.9, 755.6, 370.1, 755.6, 378.9, 754.6, 380.1, 754.1, 392.1, 748.9, 388.6, 744.1, 388.6, 742.1, 389.6, 737.9, 385.6, 730.9, 381.6, 728.1, 381.6, 726.9, 380.6, 718.1, 380.6, 716.9, 379.6, 709.1, 379.6, 707.9, 380.6, 704.1, 380.6, 702.9, 381.6, 695.1, 383.6, 687.1, 387.6, 681.9, 391.6, 672.6, 403.1, 669.6, 410.1, 670.1, 413.1, 666.9, 415.6, 665.4, 414.9, 665.4, 406.1, 666.4, 404.9, 666.4, 403.1, 664.9, 401.6, 661.1, 401.6, 658.6, 404.1, 658.6, 415.9, 660.1, 419.4, 657.6, 422.1, 657.6, 423.9, 656.6, 425.1, 657.6, 436.9, 662.9, 444.4, 664.1, 445.4, 665.9, 445.4, 668.1, 448.4, 671.9, 449.4, 675.4, 444.9, 675.4, 442.1, 676.6, 440.9, 679.9, 441.4, 681.4, 439.9, 681.4, 435.6, 682.1, 434.9, 682.6, 441.9, 681.6, 443.1, 681.6, 445.9, 679.6, 449.1, 679.6, 452.6, 671.1, 452.6, 664.1, 449.6, 659.9, 446.6, 655.4, 440.1, 649.4, 434.1, 647.1, 430.6, 632.9, 419.6, 630.1, 418.6, 626.9, 415.6, 621.9, 412.6, 605.4, 396.1, 603.4, 392.9, 597.4, 387.1, 591.4, 378.9, 588.9, 376.6, 586.1, 376.6, 584.6, 378.1, 584.6, 384.9, 585.6, 386.1, 587.6, 393.9, 593.6, 405.9, 601.4, 416.1, 599.9, 416.4, 590.9, 409.6, 576.9, 401.6, 575.1, 401.6, 573.6, 403.1, 574.6, 408.9, 580.6, 418.1, 593.9, 431.4, 598.9, 434.4, 601.4, 436.9, 600.9, 437.6, 599.1, 437.6, 595.9, 435.6, 594.1, 435.6, 590.9, 433.6, 586.1, 432.6, 582.9, 430.6, 580.1, 430.6, 578.6, 432.1, 578.6, 434.9, 580.6, 437.9, 587.9, 445.4, 592.1, 448.4, 613.4, 459.1, 601.1, 459.6, 599.1, 460.6, 597.6, 462.9, 600.9, 466.4, 604.1, 468.4, 605.9, 468.4, 609.1, 470.4, 610.9, 470.4, 615.1, 472.4, 625.1, 473.9, 621.9, 475.6, 616.1, 476.6, 614.6, 477.9, 613.6, 479.1, 613.6, 480.9, 616.1, 483.4, 618.1, 484.4, 620.9, 484.4, 622.1, 485.4, 637.6, 485.4, 638.1, 486.4, 633.6, 490.1, 633.6, 491.9, 635.1, 493.4, 639.9, 493.4, 641.1, 494.4, 649.9, 494.4, 651.4, 493.4, 652.1, 493.9, 651.6, 496.9, 653.1, 498.4, 657.9, 498.4, 659.9, 499.4, 665.1, 496.9, 665.6, 498.9, 667.1, 500.4, 668.9, 500.4, 672.6, 497.9, 675.1, 500.4, 677.9, 500.4, 681.4, 496.9, 682.9, 493.9, 685.1, 495.4, 686.9, 495.4, 690.4, 489.9, 690.6, 494.9, 693.1, 497.4, 694.9, 497.4, 695.6, 498.1, 695.6, 501.9, 696.6, 503.1, 696.6, 509.9, 700.6, 515.1, 703.1, 517.4, 704.9, 517.4, 709.6, 523.1, 709.6, 524.9, 701.6, 536.1, 699.6, 540.9, 693.6, 548.1, 693.6, 549.9, 697.1, 552.4, 698.9, 552.4, 703.9, 550.4, 710.1, 545.9, 710.6, 546.6, 707.6, 552.1, 707.6, 553.9, 710.1, 556.4, 712.9, 556.4, 719.1, 551.4, 721.9, 547.9, 722.6, 548.6, 722.6, 552.9, 724.1, 554.4, 726.9, 554.4, 728.9, 553.4, 733.6, 548.9, 736.1, 550.4, 737.9, 550.4, 740.4, 547.9, 742.4, 543.9, 742.4, 539.1, 743.6, 537.9, 745.1, 538.4, 748.1, 541.4, 751.9, 541.4, 753.4, 539.1, 749.4, 534.9, 748.4, 528.1, 750.1, 526.4, 753.9, 525.4, 759.1, 521.4, 764.9, 518.4, 770.1, 513.4, 772.1, 514.4, 776.9, 514.4, 782.1, 510.4, 786.9, 510.4, 787.6, 511.1, 787.6, 514.9, 789.6, 518.1, 793.1, 521.4, 795.9, 521.4, 797.4, 519.9, 797.4, 518.1, 794.4, 514.9, 794.4, 510.1, 795.4, 508.9, 795.4, 507.1, 800.1, 501.4, 806.1, 497.4, 808.9, 497.4, 810.4, 495.9, 808.9, 493.6, 804.9, 493.1, 805.4, 491.1, 807.4, 488.9, 805.9, 486.6, 800.9, 488.1, 798.9, 485.6, 795.1, 486.6, 790.6, 491.1, 789.6, 493.1, 789.6, 497.9, 786.9, 501.6, 785.4, 500.9, 785.4, 499.1, 783.4, 495.9, 780.4, 493.6, 781.4, 491.9, 781.4, 487.1, 782.4, 485.9, 782.4, 472.1, 781.4, 470.9, 781.4, 464.1, 780.4, 462.9, 780.4, 460.1, 778.4, 456.4, 779.1, 455.4, 782.9, 455.4, 786.1, 453.4, 787.4, 451.9, 786.6, 448.9, 789.9, 447.4, 795.4, 441.9, 794.4, 439.9, 791.9, 437.9, 800.4, 430.1, 802.4, 426.9, 800.9, 424.6, 798.1, 424.6, 796.6, 425.6, 795.9, 424.6, 801.4, 418.9, 807.4, 406.9, 807.4, 404.1, 805.1, 402.6, 799.1, 407.4, 797.6, 407.1, 798.4, 404.1, 802.4, 396.9, 803.4, 391.1, 804.4, 389.9, 804.4, 386.1, 805.4, 384.9, 805.4, 377.1, 803.9, 375.6, 802.1, 375.6, 796.4, 383.9, 795.9, 384.4, 795.4, 383.6, 795.4, 380.1, 796.4, 378.9, 797.4, 371.1, 798.4, 369.9, 798.4, 354.1, 796.1, 349.6, 794.9, 348.6, 792.9, 349.6, 790.6, 353.1, 790.6, 354.9, 787.6, 362.1, 787.6, 364.4, 786.6, 364.9, 786.4, 352.1, 785.4, 350.9, 785.4, 344.1, 784.4, 342.9, 784.4, 340.1, 783.4, 338.9, 782.4, 332.1, 780.4, 328.1, 777.9, 325.6, 776.1, 325.6, 773.6, 328.1, 773.6, 344.9, 772.6, 346.1, 772.6, 353.4, 771.9, 354.1, 770.4, 350.9, 769.4, 342.1, 768.4, 340.9, 767.4, 335.1, 765.4, 331.9, 765.4, 330.1, 761.4, 323.9, 757.1, 319.6]], "52.44": [[755.1, 316.6, 753.6, 318.1, 753.6, 324.9, 754.6, 326.1, 754.6, 331.9, 755.6, 333.1, 755.6, 338.9, 756.6, 340.1, 756.6, 368.9, 755.6, 370.1, 755.6, 382.9, 754.6, 384.1, 754.1, 391.1, 749.9, 387.6, 741.1, 387.6, 731.9, 380.6, 730.1, 380.6, 728.9, 379.6, 726.1, 379.6, 724.9, 378.6, 719.1, 379.6, 717.9, 378.6, 714.1, 378.6, 712.1, 377.6, 710.9, 378.6, 706.1, 378.6, 704.9, 379.6, 702.1, 379.6, 700.9, 380.6, 696.1, 381.6, 684.9, 387.6, 674.6, 398.1, 670.6, 405.1, 670.6, 406.9, 668.6, 409.1, 670.1, 412.4, 668.1, 415.4, 665.4, 412.9, 665.4, 401.1, 663.9, 399.6, 662.1, 399.6, 658.6, 402.1, 658.6, 414.9, 660.1, 417.4, 656.6, 422.1, 656.6, 430.9, 657.6, 432.1, 658.6, 437.9, 663.9, 444.4, 669.1, 447.4, 671.9, 447.4, 674.4, 445.1, 675.4, 443.9, 675.4, 441.1, 676.9, 438.9, 679.1, 440.4, 681.1, 439.9, 681.6, 443.9, 678.6, 449.1, 678.6, 451.6, 672.1, 451.6, 665.9, 448.6, 664.1, 448.6, 660.1, 445.6, 650.4, 432.9, 643.1, 425.6, 621.9, 410.6, 608.4, 397.1, 606.4, 393.9, 598.4, 386.1, 592.4, 377.9, 587.9, 373.6, 586.1, 373.6, 584.6, 375.1, 584.6, 381.9, 585.6, 383.1, 588.6, 393.9, 592.6, 401.9, 596.6, 407.9, 600.6, 412.1, 600.6, 413.1, 599.1, 413.6, 583.9, 402.6, 575.9, 398.6, 573.6, 400.1, 573.6, 403.9, 577.6, 411.9, 581.6, 416.1, 584.6, 420.9, 601.4, 434.9, 600.9, 435.6, 599.1, 435.6, 595.9, 433.6, 594.1, 433.6, 590.9, 431.6, 586.1, 430.6, 582.9, 428.6, 579.1, 428.6, 577.6, 430.1, 579.6, 434.9, 584.9, 440.4, 595.1, 448.4, 599.9, 450.4, 602.1, 452.4, 604.9, 452.4, 607.1, 454.4, 613.1, 456.9, 612.4, 457.6, 602.1, 457.6, 600.9, 458.6, 599.1, 458.6, 597.6, 460.1, 597.6, 461.9, 605.1, 467.4, 606.9, 467.4, 617.1, 471.4, 620.9, 471.4, 622.1, 472.6, 621.6, 473.6, 616.1, 474.6, 612.6, 477.1, 612.6, 478.9, 615.1, 481.4, 620.1, 483.4, 637.6, 483.4, 638.1, 484.4, 631.6, 490.1, 633.1, 492.4, 635.1, 493.4, 646.9, 493.4, 651.4, 491.4, 652.1, 492.4, 650.6, 494.1, 650.6, 495.9, 652.1, 497.4, 654.9, 497.4, 656.9, 498.4, 664.1, 495.6, 664.6, 497.9, 666.1, 499.4, 672.6, 495.9, 673.6, 496.4, 673.6, 497.9, 675.9, 499.4, 679.1, 497.4, 682.1, 493.4, 686.9, 493.4, 689.4, 489.9, 690.9, 481.6, 691.9, 481.4, 696.6, 484.1, 696.6, 488.6, 692.1, 488.6, 690.6, 490.1, 690.6, 494.9, 693.1, 497.4, 694.9, 497.4, 695.6, 498.1, 695.6, 501.9, 696.6, 503.1, 696.6, 508.9, 700.6, 514.1, 706.6, 519.1, 708.6, 522.1, 708.6, 523.9, 705.6, 529.9, 702.6, 532.1, 699.6, 537.9, 695.6, 543.1, 695.6, 544.9, 692.6, 547.1, 692.6, 548.9, 694.1, 550.4, 700.9, 550.4, 709.1, 544.9, 709.6, 545.6, 706.6, 552.1, 709.1, 555.4, 712.9, 554.4, 718.1, 550.4, 720.6, 546.9, 721.6, 547.4, 721.6, 551.9, 723.1, 553.4, 725.9, 553.4, 727.9, 552.4, 732.6, 547.9, 735.9, 550.4, 739.4, 546.9, 741.4, 542.9, 741.4, 538.1, 742.6, 536.9, 744.1, 537.4, 747.1, 540.4, 749.9, 541.4, 752.4, 538.1, 748.4, 533.9, 748.4, 531.1, 747.4, 529.9, 748.4, 526.1, 753.9, 524.4, 760.1, 519.4, 762.9, 518.4, 770.1, 512.4, 772.1, 513.4, 777.9, 513.4, 781.1, 510.4, 783.1, 509.4, 785.9, 509.4, 787.6, 512.1, 787.6, 515.9, 793.1, 521.4, 794.9, 521.4, 797.4, 518.1, 793.4, 513.9, 793.4, 511.1, 796.4, 504.1, 800.1, 500.4, 805.6, 496.9, 808.9, 497.4, 810.4, 495.9, 807.9, 492.6, 804.9, 492.1, 806.4, 488.9, 804.9, 486.6, 801.1, 487.6, 798.9, 485.6, 795.1, 485.6, 791.6, 488.9, 789.6, 492.1, 788.6, 498.9, 786.4, 501.1, 785.4, 500.6, 784.4, 497.1, 780.4, 492.9, 780.4, 490.1, 781.4, 488.9, 781.4, 480.1, 782.4, 478.9, 782.4, 474.1, 781.4, 472.9, 781.4, 468.1, 780.4, 466.9, 780.4, 460.1, 778.4, 456.9, 778.4, 455.1, 779.1, 454.4, 781.9, 454.4, 786.1, 452.4, 787.4, 450.9, 786.6, 447.9, 789.9, 446.4, 795.4, 440.9, 794.4, 438.9, 791.9, 436.9, 800.4, 429.1, 802.4, 425.9, 800.9, 423.6, 798.1, 423.6, 796.6, 424.6, 795.9, 423.6, 803.4, 414.9, 807.4, 406.9, 807.4, 403.1, 805.9, 401.6, 799.9, 405.6, 798.4, 405.1, 803.4, 392.9, 803.4, 390.1, 805.4, 384.9, 805.4, 379.1, 806.4, 377.9, 806.4, 376.1, 804.9, 374.6, 803.1, 374.6, 799.6, 377.9, 796.4, 382.9, 795.4, 382.9, 796.4, 379.9, 796.4, 375.1, 798.4, 369.9, 798.4, 351.1, 794.9, 346.6, 792.6, 348.1, 789.6, 356.1, 789.6, 357.9, 788.6, 359.1, 788.6, 360.9, 787.6, 362.1, 787.6, 364.4, 786.6, 364.9, 786.4, 347.1, 785.4, 345.9, 785.4, 341.1, 784.4, 339.9, 784.4, 337.1, 783.4, 335.9, 782.4, 330.1, 779.4, 324.9, 777.9, 323.6, 776.1, 323.6, 774.6, 325.1, 774.6, 331.9, 773.6, 333.1, 773.6, 344.9, 772.6, 346.1, 772.6, 353.4, 771.9, 354.1, 771.4, 349.1, 770.4, 347.9, 770.4, 344.1, 769.4, 342.9, 769.4, 340.1, 768.4, 338.9, 768.4, 336.1, 767.4, 334.9, 766.4, 330.1, 762.4, 322.9, 757.1, 317.6]], "52.52": [[756.1, 314.6, 754.6, 316.1, 754.6, 320.9, 755.6, 322.1, 755.6, 327.9, 756.6, 329.1, 757.6, 338.9, 758.6, 340.1, 758.6, 366.9, 757.6, 368.1, 757.1, 390.1, 750.9, 385.6, 748.1, 385.6, 745.1, 387.6, 740.9, 383.6, 738.1, 382.6, 734.9, 379.6, 729.9, 377.6, 719.1, 377.6, 717.9, 376.6, 711.1, 376.6, 709.9, 377.6, 706.1, 377.6, 704.9, 378.6, 697.1, 380.6, 694.9, 382.6, 688.1, 385.6, 683.1, 389.6, 676.6, 397.1, 671.6, 407.1, 673.1, 409.6, 671.6, 412.1, 672.6, 414.4, 672.1, 415.4, 668.4, 410.9, 668.4, 399.1, 666.9, 397.6, 665.1, 397.6, 661.6, 400.1, 661.6, 413.9, 662.6, 415.9, 659.6, 419.1, 658.6, 426.9, 659.6, 428.1, 659.6, 431.9, 662.6, 437.1, 662.6, 438.9, 670.1, 445.4, 674.9, 445.4, 678.4, 441.9, 679.4, 438.4, 681.9, 438.4, 684.1, 435.9, 684.6, 441.9, 681.6, 447.1, 682.1, 448.6, 684.1, 449.9, 683.4, 450.6, 680.9, 449.6, 674.1, 449.6, 664.9, 445.6, 660.4, 439.1, 648.9, 425.6, 646.9, 424.6, 641.9, 419.6, 638.1, 417.6, 625.1, 407.6, 621.9, 403.6, 617.4, 400.1, 615.4, 396.9, 608.4, 390.1, 603.4, 383.9, 597.4, 374.9, 593.9, 371.6, 591.1, 371.6, 588.6, 375.1, 589.6, 380.9, 590.6, 382.1, 590.6, 384.9, 597.6, 400.9, 606.1, 412.1, 604.9, 412.4, 589.9, 400.6, 580.9, 395.6, 577.6, 398.1, 579.6, 404.9, 586.6, 415.9, 603.4, 430.9, 602.9, 431.6, 601.1, 431.6, 599.9, 430.6, 598.1, 430.6, 585.9, 424.6, 583.1, 425.6, 581.6, 427.1, 582.6, 429.9, 594.1, 441.4, 606.1, 449.4, 615.1, 453.9, 614.4, 454.6, 609.1, 454.6, 607.9, 455.6, 604.1, 455.6, 601.6, 458.9, 605.1, 462.4, 607.1, 463.4, 609.9, 463.4, 613.1, 466.4, 627.1, 469.9, 626.4, 470.6, 623.1, 470.6, 618.9, 472.6, 616.6, 475.1, 616.6, 476.9, 618.1, 478.4, 626.1, 481.4, 633.9, 481.4, 635.1, 480.4, 644.9, 480.6, 644.9, 481.4, 641.9, 482.6, 639.1, 482.6, 637.1, 483.6, 633.6, 487.9, 636.1, 490.4, 638.9, 490.4, 640.1, 491.4, 647.4, 491.9, 649.1, 490.4, 651.9, 490.4, 652.4, 491.1, 650.6, 493.9, 655.1, 497.4, 660.9, 496.4, 666.6, 492.9, 667.6, 493.6, 666.6, 495.9, 668.1, 497.4, 670.9, 497.4, 673.6, 495.9, 676.1, 497.4, 677.9, 497.4, 681.4, 494.9, 681.4, 493.1, 682.1, 492.4, 684.1, 492.9, 683.6, 494.9, 685.9, 496.4, 688.4, 493.9, 690.4, 488.9, 690.4, 482.1, 691.9, 481.4, 696.6, 484.1, 696.6, 489.9, 693.6, 492.1, 693.6, 493.9, 696.6, 496.1, 696.6, 498.9, 699.6, 505.1, 699.6, 507.9, 701.1, 509.4, 704.9, 509.4, 705.6, 510.1, 706.6, 513.9, 711.6, 518.1, 711.6, 520.9, 708.6, 525.9, 701.6, 534.1, 695.6, 542.9, 698.1, 545.4, 703.9, 545.4, 707.9, 543.4, 712.1, 539.6, 712.6, 541.9, 710.6, 545.1, 710.6, 547.9, 712.1, 549.4, 715.9, 549.4, 720.1, 546.4, 723.9, 541.9, 724.6, 542.6, 724.6, 546.9, 726.1, 548.4, 729.9, 547.4, 734.6, 543.9, 737.1, 545.4, 739.9, 545.4, 743.4, 540.9, 743.4, 538.1, 744.4, 536.9, 744.9, 533.9, 747.9, 538.4, 749.1, 539.4, 750.9, 539.4, 753.4, 536.9, 753.4, 535.1, 750.4, 531.9, 750.4, 524.1, 754.9, 522.4, 763.1, 516.4, 768.9, 513.4, 772.1, 510.4, 774.1, 511.4, 780.9, 511.4, 785.1, 508.4, 787.9, 508.4, 788.6, 509.1, 788.6, 511.9, 789.6, 513.1, 789.6, 515.9, 794.1, 520.4, 796.9, 520.4, 798.4, 518.9, 798.4, 517.1, 795.4, 513.9, 795.4, 510.1, 796.4, 508.9, 796.4, 507.1, 800.1, 503.4, 809.9, 498.4, 811.4, 496.9, 809.9, 494.6, 807.6, 494.1, 808.4, 491.1, 805.9, 488.6, 801.9, 489.1, 799.9, 486.6, 798.1, 486.6, 794.6, 489.1, 791.6, 495.1, 791.6, 498.9, 789.9, 500.6, 788.4, 499.9, 787.4, 496.1, 783.4, 491.9, 784.4, 484.1, 785.4, 482.9, 785.4, 468.1, 783.4, 462.9, 783.4, 458.1, 781.4, 453.9, 782.1, 452.4, 785.9, 451.4, 789.1, 449.4, 790.4, 447.1, 788.9, 444.9, 792.1, 442.4, 794.9, 441.4, 798.4, 437.9, 797.4, 435.9, 794.9, 433.9, 803.4, 426.1, 805.4, 422.9, 805.4, 421.1, 803.9, 419.6, 801.9, 420.6, 800.1, 420.6, 799.6, 419.9, 803.4, 415.9, 806.4, 410.1, 808.4, 407.9, 810.4, 402.9, 810.4, 400.1, 808.9, 398.6, 807.1, 398.6, 801.1, 403.4, 800.4, 402.4, 804.4, 394.9, 804.4, 392.1, 806.4, 387.9, 807.4, 380.1, 808.4, 378.9, 808.4, 372.1, 806.9, 370.6, 805.1, 370.6, 801.6, 374.1, 798.4, 379.9, 797.6, 379.9, 798.4, 372.1, 800.4, 366.9, 800.4, 348.1, 798.1, 344.6, 796.9, 343.6, 795.1, 343.6, 792.6, 347.1, 791.6, 352.9, 790.6, 354.1, 790.6, 356.9, 789.4, 359.9, 788.6, 359.9, 788.4, 347.1, 787.4, 345.9, 787.4, 339.1, 786.4, 337.9, 785.4, 331.1, 783.4, 327.9, 783.4, 326.1, 781.4, 321.9, 778.9, 319.6, 777.1, 319.6, 775.6, 321.1, 775.6, 327.9, 774.6, 329.1, 774.6, 334.9, 775.6, 336.1, 775.6, 338.9, 774.6, 340.1, 774.6, 348.4, 773.9, 349.1, 773.4, 346.1, 772.4, 344.9, 771.4, 337.1, 769.4, 333.9, 768.4, 328.1, 765.4, 322.1, 759.1, 315.6, 757.9, 314.6]], "52.56": [[763.1, 311.6, 760.6, 314.1, 760.6, 315.9, 761.6, 317.1, 761.6, 319.9, 762.6, 321.1, 762.6, 323.9, 763.6, 325.1, 763.6, 327.9, 765.6, 333.1, 766.6, 342.9, 767.6, 344.1, 767.6, 352.9, 768.6, 354.1, 768.6, 365.9, 767.6, 367.1, 767.6, 375.9, 768.6, 377.1, 768.6, 385.9, 769.6, 387.1, 769.6, 388.9, 768.1, 389.6, 763.1, 386.6, 761.6, 388.1, 761.6, 389.9, 760.1, 390.6, 755.9, 386.6, 746.9, 381.6, 745.1, 381.6, 743.9, 380.6, 740.1, 380.6, 736.9, 378.6, 733.1, 378.6, 731.9, 377.6, 726.1, 377.6, 724.9, 378.6, 720.1, 378.6, 718.9, 379.6, 713.1, 380.6, 699.1, 387.6, 691.6, 393.9, 686.6, 401.1, 685.6, 403.1, 685.6, 405.9, 690.6, 412.1, 691.6, 414.4, 691.1, 415.4, 684.9, 410.6, 683.1, 410.6, 682.4, 409.9, 682.4, 404.1, 683.4, 402.9, 683.4, 400.1, 681.9, 398.6, 678.1, 398.6, 675.6, 402.1, 676.1, 415.4, 672.6, 419.1, 672.6, 422.9, 671.6, 424.1, 671.6, 426.9, 672.6, 428.1, 672.6, 433.9, 676.6, 440.1, 678.9, 441.4, 680.9, 444.4, 684.1, 446.4, 685.9, 446.4, 689.1, 444.4, 692.4, 439.9, 692.4, 438.1, 695.1, 435.4, 696.1, 435.6, 696.6, 441.9, 695.6, 443.1, 695.6, 444.9, 693.6, 447.1, 693.6, 448.9, 695.1, 450.6, 694.4, 451.6, 692.9, 450.6, 688.1, 450.6, 686.9, 449.6, 682.1, 448.6, 678.9, 446.6, 674.4, 441.9, 673.4, 439.1, 668.4, 433.9, 665.4, 428.9, 656.1, 419.6, 645.9, 411.6, 636.4, 402.1, 618.4, 379.9, 613.4, 371.1, 609.9, 367.6, 607.1, 367.6, 604.6, 370.1, 604.6, 377.9, 605.6, 379.1, 605.6, 381.9, 606.6, 383.1, 607.6, 388.9, 609.6, 391.1, 610.6, 394.9, 612.6, 397.1, 616.6, 404.9, 615.9, 405.4, 613.1, 403.6, 608.1, 398.6, 596.9, 390.6, 593.1, 390.6, 591.6, 392.1, 592.6, 397.9, 595.6, 403.9, 598.6, 407.1, 601.6, 412.1, 615.4, 425.9, 614.4, 426.6, 599.9, 419.6, 596.1, 419.6, 594.6, 421.1, 594.6, 423.9, 604.9, 435.4, 613.9, 441.4, 618.1, 445.4, 622.9, 447.4, 625.4, 449.9, 624.9, 450.6, 623.1, 450.6, 621.9, 449.6, 615.1, 449.6, 612.6, 452.1, 612.6, 453.9, 627.1, 463.4, 632.9, 463.4, 634.1, 464.4, 635.9, 464.4, 639.1, 466.4, 642.9, 467.4, 647.1, 470.6, 646.6, 471.6, 645.1, 471.6, 643.9, 470.6, 639.1, 469.6, 635.9, 467.6, 632.1, 467.6, 630.9, 466.6, 629.1, 466.6, 625.6, 470.1, 627.1, 472.4, 630.1, 474.4, 635.9, 475.4, 640.1, 477.4, 649.9, 477.6, 650.1, 478.1, 644.6, 482.9, 643.6, 484.9, 646.1, 487.4, 659.9, 487.4, 661.1, 486.4, 662.6, 486.4, 663.1, 487.4, 660.6, 490.1, 660.6, 491.9, 662.1, 493.4, 671.9, 493.4, 679.9, 489.6, 683.1, 493.4, 686.9, 493.4, 690.4, 488.9, 690.4, 482.1, 691.9, 481.4, 695.9, 483.4, 697.1, 484.6, 696.6, 490.9, 698.9, 492.4, 703.4, 489.9, 704.6, 491.1, 707.6, 497.9, 710.6, 501.1, 712.6, 504.9, 718.9, 511.4, 722.1, 513.6, 712.9, 520.6, 706.6, 526.9, 705.6, 528.9, 706.9, 530.4, 710.1, 532.4, 713.9, 532.4, 721.1, 528.6, 721.6, 529.6, 719.6, 533.1, 719.6, 534.9, 722.1, 537.4, 724.9, 537.4, 730.9, 534.4, 734.6, 530.9, 735.6, 531.4, 735.6, 532.9, 736.9, 534.4, 738.1, 535.4, 739.9, 535.4, 747.1, 530.4, 750.9, 530.4, 751.6, 531.1, 751.6, 535.9, 753.6, 539.1, 756.1, 541.4, 758.9, 541.4, 760.4, 539.9, 759.4, 530.1, 763.4, 526.1, 765.4, 522.9, 765.4, 519.1, 762.9, 516.4, 763.1, 515.6, 765.9, 516.4, 767.1, 515.4, 768.9, 515.4, 778.9, 510.4, 781.1, 508.4, 790.9, 508.4, 794.1, 506.4, 795.9, 506.4, 796.6, 507.1, 796.6, 509.9, 797.6, 511.1, 797.6, 513.9, 798.6, 515.9, 802.1, 519.4, 803.9, 519.4, 805.4, 517.9, 805.4, 510.1, 808.4, 505.9, 812.1, 503.4, 817.9, 503.4, 819.4, 501.9, 819.4, 499.1, 818.4, 497.9, 814.9, 494.6, 810.9, 492.6, 808.1, 492.6, 803.6, 496.9, 801.4, 500.1, 798.4, 498.9, 798.4, 496.1, 796.4, 492.9, 796.4, 487.1, 797.4, 485.9, 797.4, 482.1, 798.4, 480.9, 798.4, 468.1, 797.4, 466.9, 797.4, 463.1, 796.4, 461.9, 796.4, 457.1, 793.4, 450.9, 793.4, 448.1, 792.4, 446.9, 793.1, 445.4, 794.9, 445.4, 800.4, 442.1, 801.4, 440.9, 801.4, 438.1, 808.4, 431.9, 805.9, 428.9, 815.4, 419.9, 815.4, 418.1, 813.9, 416.6, 811.4, 416.6, 810.9, 415.6, 814.4, 411.9, 821.4, 398.9, 821.4, 395.1, 819.9, 393.6, 817.1, 394.6, 813.1, 398.4, 811.9, 398.1, 815.4, 388.9, 815.4, 387.1, 816.4, 385.9, 816.4, 384.1, 817.4, 382.9, 817.4, 380.1, 818.4, 378.9, 818.4, 367.1, 816.9, 365.6, 815.1, 365.6, 812.6, 368.1, 808.4, 374.9, 807.6, 374.9, 808.4, 367.1, 809.4, 365.9, 809.4, 357.1, 810.4, 355.9, 810.4, 349.1, 809.4, 347.9, 809.4, 344.1, 805.9, 338.6, 804.1, 338.6, 802.9, 339.6, 800.6, 344.1, 800.6, 346.9, 798.6, 352.1, 798.6, 355.4, 797.6, 355.9, 797.4, 344.1, 796.4, 342.9, 796.4, 338.1, 794.4, 333.9, 794.4, 331.1, 792.4, 327.9, 791.4, 322.1, 789.4, 319.9, 788.4, 317.1, 784.9, 314.6, 781.6, 317.1, 781.6, 326.9, 782.6, 328.1, 782.6, 342.4, 781.9, 343.1, 778.4, 331.1, 776.4, 327.9, 776.4, 326.1, 774.4, 323.9, 774.4, 322.1, 768.1, 314.6]], "52.60": [[779.1, 319.6, 777.6, 321.1, 777.6, 323.9, 778.6, 325.1, 778.6, 327.9, 780.6, 332.1, 780.6, 334.9, 782.6, 339.1, 783.6, 346.9, 784.6, 348.1, 784.6, 352.9, 785.6, 354.1, 785.6, 389.9, 786.6, 391.1, 786.6, 400.4, 785.9, 401.1, 779.9, 394.6, 777.6, 396.1, 779.6, 401.4, 778.9, 402.4, 773.9, 397.6, 762.9, 392.6, 758.1, 392.6, 756.9, 391.6, 742.1, 391.6, 740.9, 392.6, 738.1, 392.6, 736.9, 393.6, 732.1, 394.6, 719.1, 401.6, 709.6, 410.9, 706.9, 415.4, 703.9, 410.6, 701.1, 410.6, 699.9, 411.6, 697.6, 414.1, 697.6, 419.9, 696.6, 421.1, 697.1, 425.4, 694.6, 428.1, 694.6, 430.9, 693.6, 432.1, 693.6, 439.9, 694.6, 441.1, 694.6, 444.9, 697.6, 449.1, 700.1, 455.6, 705.1, 458.4, 709.1, 456.4, 712.1, 452.4, 713.9, 451.6, 714.6, 452.1, 714.6, 454.9, 710.6, 461.6, 699.9, 457.4, 695.4, 453.1, 682.4, 433.9, 666.4, 418.1, 662.4, 412.1, 657.4, 406.9, 656.4, 404.1, 650.4, 396.9, 648.4, 392.1, 643.4, 385.9, 638.4, 375.1, 633.9, 370.6, 631.1, 370.6, 629.6, 372.1, 628.6, 374.1, 628.6, 380.9, 629.6, 382.1, 629.6, 385.9, 630.6, 387.1, 631.6, 393.9, 634.6, 400.1, 634.6, 401.9, 636.6, 404.1, 636.6, 406.1, 635.1, 406.6, 633.9, 405.6, 629.4, 399.9, 627.1, 398.6, 624.1, 394.6, 619.9, 391.6, 616.1, 390.6, 614.6, 392.1, 614.6, 396.9, 616.6, 400.1, 617.6, 404.9, 620.6, 410.9, 623.6, 414.1, 625.6, 418.1, 630.6, 422.9, 632.1, 425.6, 635.4, 428.9, 634.9, 429.6, 633.9, 429.4, 629.9, 425.6, 617.9, 419.6, 616.1, 419.6, 614.6, 421.1, 615.6, 425.9, 621.6, 434.1, 625.9, 438.4, 643.1, 452.4, 646.4, 454.1, 644.4, 454.6, 642.9, 453.6, 640.1, 453.6, 638.9, 452.6, 632.1, 452.6, 629.6, 455.9, 636.1, 461.4, 653.6, 470.1, 654.4, 472.9, 653.9, 473.6, 652.1, 473.6, 648.9, 471.6, 645.1, 471.6, 643.6, 473.1, 643.6, 474.9, 644.6, 476.1, 650.1, 479.4, 652.9, 479.4, 658.1, 481.4, 662.9, 481.4, 664.1, 483.1, 662.1, 483.6, 658.6, 487.1, 658.6, 488.9, 662.1, 491.4, 672.9, 491.4, 674.1, 492.4, 675.9, 492.4, 677.1, 491.4, 682.1, 490.6, 682.1, 493.1, 679.1, 492.6, 677.6, 494.1, 677.6, 495.9, 680.1, 498.4, 687.9, 498.4, 690.1, 496.4, 692.9, 497.4, 696.1, 495.9, 696.6, 498.9, 698.1, 500.4, 701.9, 500.4, 704.1, 503.4, 707.9, 503.4, 712.1, 501.4, 715.9, 501.4, 719.1, 499.4, 720.1, 499.6, 722.6, 506.9, 730.1, 516.1, 728.1, 516.6, 719.9, 522.6, 717.1, 523.6, 715.6, 525.1, 715.6, 526.9, 716.6, 528.1, 721.1, 530.4, 725.9, 530.4, 727.1, 529.4, 731.1, 528.6, 731.6, 529.9, 729.6, 532.1, 729.6, 534.9, 733.1, 537.4, 736.9, 537.4, 742.1, 534.4, 746.1, 537.4, 749.9, 537.4, 753.1, 535.4, 760.9, 536.4, 761.6, 537.1, 761.6, 539.9, 760.6, 541.1, 760.6, 544.9, 763.1, 548.4, 766.9, 548.4, 768.4, 546.9, 768.4, 543.1, 770.4, 540.9, 769.4, 538.9, 769.4, 533.1, 771.4, 530.1, 768.6, 528.1, 769.1, 526.4, 774.9, 526.4, 776.1, 525.4, 778.9, 525.4, 782.1, 523.4, 788.9, 521.4, 797.1, 516.4, 806.6, 515.9, 807.6, 516.4, 807.6, 517.9, 805.6, 521.1, 805.6, 523.9, 808.1, 526.4, 809.9, 526.4, 812.4, 523.9, 812.4, 522.1, 813.4, 520.9, 818.1, 516.4, 819.9, 516.4, 823.1, 514.4, 829.9, 514.4, 832.4, 511.9, 832.4, 509.1, 831.1, 507.6, 827.9, 505.6, 824.1, 505.6, 821.9, 502.6, 819.6, 504.1, 819.6, 505.9, 816.9, 509.6, 814.9, 510.6, 812.1, 510.6, 811.4, 509.9, 811.4, 506.1, 810.4, 504.9, 810.4, 499.1, 813.4, 494.9, 813.4, 492.1, 814.4, 490.9, 814.4, 474.1, 813.4, 472.9, 812.4, 465.1, 808.4, 455.4, 809.1, 454.4, 812.9, 453.4, 816.4, 451.1, 817.4, 449.9, 816.9, 446.6, 824.4, 440.9, 822.4, 437.1, 826.1, 434.4, 832.4, 427.9, 832.4, 425.1, 830.9, 423.6, 829.4, 423.6, 828.9, 422.6, 831.4, 419.9, 837.4, 409.9, 838.4, 403.1, 836.1, 401.6, 830.9, 405.6, 829.9, 405.6, 829.4, 404.1, 832.4, 398.9, 832.4, 397.1, 834.4, 392.9, 834.4, 390.1, 835.4, 388.9, 835.4, 384.1, 836.4, 382.9, 836.4, 377.1, 833.9, 373.6, 832.1, 373.6, 826.4, 381.9, 825.6, 381.9, 826.4, 374.1, 827.4, 372.9, 827.4, 368.1, 828.4, 366.9, 828.4, 357.1, 827.4, 355.9, 827.4, 351.1, 823.9, 345.6, 822.1, 345.6, 820.6, 346.9, 818.6, 351.1, 818.6, 355.9, 817.6, 357.1, 816.6, 363.4, 815.6, 363.9, 815.4, 354.1, 814.4, 352.9, 814.4, 346.1, 813.4, 344.9, 813.4, 342.1, 810.4, 335.9, 810.4, 333.1, 805.4, 324.1, 801.9, 321.6, 798.6, 324.1, 798.6, 327.9, 799.6, 329.1, 799.6, 336.9, 800.6, 338.1, 800.6, 351.4, 799.9, 352.1, 798.4, 348.9, 798.4, 346.1, 796.4, 342.9, 796.4, 341.1, 794.4, 336.9, 794.4, 335.1, 792.4, 332.9, 791.4, 330.1, 784.1, 321.6, 780.9, 319.6], [624.1, 442.6, 621.6, 445.1, 624.1, 448.4, 631.1, 451.4, 632.9, 451.4, 634.4, 449.9, 630.9, 445.6, 627.9, 443.6]], "52.64": [[772.1, 401.6, 770.9, 402.6, 757.1, 402.6, 752.9, 404.6, 747.1, 405.6, 741.1, 408.6, 737.9, 412.6, 735.6, 413.9, 732.9, 417.6, 728.1, 421.4, 725.9, 424.6, 723.1, 424.6, 721.1, 423.6, 716.6, 428.1, 716.6, 431.9, 713.6, 438.1, 713.6, 458.9, 716.9, 464.4, 718.1, 465.4, 720.9, 465.4, 721.6, 466.1, 721.6, 467.9, 719.9, 469.6, 718.1, 469.6, 714.1, 467.6, 705.9, 461.6, 701.9, 459.6, 700.1, 459.6, 697.9, 457.6, 696.1, 457.6, 688.9, 453.6, 682.1, 451.6, 674.9, 446.6, 668.9, 443.6, 667.1, 443.6, 659.9, 439.6, 657.1, 439.6, 654.6, 442.1, 654.6, 443.9, 657.6, 448.1, 665.9, 456.4, 674.1, 462.9, 673.4, 463.6, 671.1, 463.6, 669.6, 465.9, 676.1, 470.4, 677.9, 470.4, 679.1, 471.4, 682.1, 470.9, 685.6, 475.1, 685.4, 476.1, 681.6, 479.1, 685.1, 484.4, 687.9, 485.4, 689.4, 483.9, 689.9, 480.9, 697.6, 483.4, 698.1, 484.4, 696.6, 486.1, 696.6, 490.9, 698.6, 493.9, 701.1, 496.4, 705.9, 496.4, 709.1, 500.4, 717.9, 500.4, 724.1, 497.4, 725.1, 497.6, 727.1, 500.4, 728.9, 500.4, 730.4, 498.9, 728.9, 495.6, 731.1, 493.4, 732.9, 493.4, 734.6, 497.1, 740.1, 501.4, 746.9, 508.4, 757.1, 514.9, 755.9, 516.6, 750.1, 517.6, 748.6, 519.1, 747.6, 521.1, 747.6, 523.9, 748.6, 525.1, 752.1, 527.4, 761.9, 527.4, 764.1, 526.4, 764.6, 527.9, 763.6, 529.1, 763.6, 531.9, 766.1, 534.4, 769.9, 533.4, 775.4, 528.9, 774.9, 526.6, 776.1, 525.4, 778.9, 525.4, 781.1, 523.4, 783.1, 523.9, 780.6, 527.1, 781.6, 529.1, 783.1, 530.4, 786.9, 530.4, 789.1, 527.4, 796.9, 526.4, 798.4, 524.9, 796.9, 522.4, 797.4, 521.4, 798.9, 521.4, 800.1, 520.4, 803.9, 520.4, 805.1, 519.4, 807.9, 519.4, 816.1, 515.4, 823.9, 514.4, 825.1, 513.4, 826.4, 511.9, 826.4, 510.1, 828.4, 506.1, 832.4, 499.9, 834.4, 492.1, 836.4, 488.9, 836.4, 487.1, 838.4, 482.9, 838.4, 474.1, 839.1, 473.4, 840.9, 473.4, 843.1, 471.4, 852.9, 471.4, 856.1, 469.4, 860.9, 469.4, 862.1, 468.4, 863.9, 468.4, 865.4, 466.9, 864.9, 464.6, 866.1, 463.4, 867.9, 463.4, 871.9, 461.4, 873.4, 459.9, 873.4, 458.1, 875.1, 456.4, 882.9, 453.4, 888.4, 447.9, 888.4, 445.1, 886.9, 443.6, 885.1, 443.6, 883.6, 444.6, 881.9, 443.9, 887.1, 440.4, 894.4, 433.1, 899.4, 425.9, 899.4, 424.1, 897.9, 422.6, 894.1, 422.6, 888.4, 425.1, 887.4, 424.4, 892.4, 419.9, 899.4, 408.9, 899.4, 407.1, 898.4, 405.9, 896.9, 404.6, 895.1, 404.6, 891.1, 406.6, 883.1, 412.6, 877.9, 417.6, 873.1, 419.6, 865.9, 424.6, 850.1, 431.6, 843.9, 435.6, 839.1, 436.6, 830.9, 443.6, 826.9, 445.1, 824.4, 438.9, 824.4, 437.1, 825.4, 435.9, 825.4, 433.1, 824.4, 431.1, 833.4, 419.9, 833.4, 417.1, 831.9, 415.6, 828.1, 415.6, 821.9, 418.6, 819.1, 418.6, 817.9, 417.6, 816.4, 415.1, 819.4, 411.9, 819.4, 409.1, 818.4, 407.9, 818.4, 405.1, 816.9, 403.6, 812.1, 403.6, 810.9, 404.6, 804.1, 405.6, 801.6, 408.1, 801.6, 410.6, 798.1, 410.6, 790.9, 405.6, 789.1, 405.6, 783.9, 402.6, 775.1, 402.6, 773.9, 401.6], [764.1, 387.6, 762.9, 388.6, 753.1, 388.6, 751.9, 389.6, 746.1, 390.6, 735.1, 397.6, 723.6, 411.1, 721.6, 415.1, 721.6, 420.9, 723.9, 422.4, 726.9, 420.6, 731.4, 411.9, 731.4, 410.1, 738.1, 402.4, 747.1, 396.4, 748.9, 396.4, 753.1, 394.4, 756.9, 394.4, 758.1, 393.4, 772.9, 393.4, 774.1, 394.4, 776.9, 394.4, 778.1, 395.4, 782.9, 396.4, 785.1, 398.4, 790.9, 401.4, 796.1, 406.4, 798.9, 407.4, 800.4, 405.1, 798.4, 401.9, 798.4, 400.1, 790.9, 392.6, 784.9, 389.6, 779.1, 388.6, 777.9, 387.6]], "52.68": [[747.1, 396.6, 745.9, 397.6, 742.1, 397.6, 740.9, 398.6, 736.1, 398.6, 734.9, 399.6, 727.1, 400.6, 716.1, 405.6, 711.9, 408.6, 702.6, 419.1, 701.6, 421.1, 701.6, 423.9, 703.1, 425.4, 707.4, 421.9, 707.4, 420.1, 710.4, 416.1, 716.1, 411.4, 730.1, 404.4, 733.9, 404.4, 735.1, 403.4, 738.9, 403.4, 740.1, 402.4, 746.9, 402.4, 748.1, 403.4, 751.9, 403.4, 753.1, 404.4, 755.9, 404.4, 757.1, 405.4, 761.9, 406.4, 765.4, 410.1, 744.1, 410.6, 742.9, 411.6, 740.1, 411.6, 738.9, 412.6, 737.1, 412.6, 735.9, 413.6, 734.1, 413.6, 732.9, 414.6, 731.1, 414.6, 720.6, 418.6, 719.6, 417.9, 721.4, 415.1, 719.9, 413.6, 717.1, 414.6, 713.6, 419.1, 714.6, 421.9, 710.1, 426.6, 706.6, 428.9, 704.1, 432.6, 702.9, 433.4, 702.4, 431.1, 699.9, 428.6, 696.6, 431.1, 697.6, 440.9, 696.6, 442.1, 695.6, 449.9, 693.6, 452.9, 696.6, 457.1, 696.6, 460.9, 697.6, 462.1, 697.6, 464.9, 699.6, 469.1, 700.6, 476.9, 699.1, 477.6, 696.9, 475.6, 691.1, 475.6, 689.1, 476.6, 687.4, 474.9, 687.4, 472.1, 688.4, 470.9, 687.4, 468.9, 685.9, 467.6, 683.1, 467.6, 681.6, 469.1, 681.6, 481.9, 680.6, 483.9, 683.1, 487.4, 687.9, 488.4, 690.4, 484.9, 690.4, 482.4, 691.4, 481.9, 695.1, 483.4, 697.9, 483.4, 699.1, 484.4, 702.9, 484.4, 709.1, 489.4, 712.9, 490.4, 715.1, 491.9, 710.9, 493.6, 701.1, 494.6, 696.6, 498.1, 696.6, 502.9, 703.1, 506.9, 699.6, 509.1, 699.6, 510.9, 704.1, 514.4, 707.9, 512.4, 711.1, 508.4, 719.9, 508.4, 723.9, 506.4, 728.4, 502.1, 729.4, 500.1, 730.9, 499.4, 740.9, 509.4, 746.1, 513.4, 750.1, 515.4, 751.9, 515.4, 756.1, 517.4, 758.9, 517.4, 763.1, 519.4, 765.9, 519.4, 767.1, 520.4, 772.9, 520.4, 774.1, 521.4, 798.9, 521.4, 800.1, 520.4, 804.9, 520.4, 815.1, 516.4, 817.9, 516.4, 819.1, 515.4, 821.9, 515.4, 823.1, 514.4, 828.9, 513.4, 834.4, 509.1, 835.4, 507.1, 833.4, 504.9, 832.9, 499.6, 836.4, 495.9, 836.4, 494.1, 837.4, 492.9, 837.4, 487.1, 834.9, 484.6, 832.9, 483.9, 834.9, 483.4, 840.1, 477.4, 841.9, 477.4, 843.4, 475.9, 843.4, 472.4, 856.9, 472.4, 858.1, 473.4, 862.9, 473.4, 864.1, 474.4, 866.9, 474.4, 871.1, 477.4, 873.9, 477.4, 875.1, 476.4, 882.9, 476.4, 894.9, 471.4, 905.4, 462.9, 905.4, 460.1, 903.9, 458.6, 889.1, 459.4, 888.9, 458.9, 891.4, 456.9, 891.4, 455.1, 889.9, 453.6, 872.1, 453.6, 870.9, 452.6, 864.1, 452.6, 862.9, 451.6, 857.1, 450.6, 847.9, 445.6, 846.1, 445.6, 840.9, 442.6, 839.1, 442.6, 836.9, 440.6, 834.9, 441.6, 832.1, 441.6, 830.9, 440.6, 828.1, 440.6, 825.9, 438.6, 820.9, 440.6, 808.1, 439.6, 806.1, 438.6, 805.4, 437.1, 809.4, 433.9, 809.4, 428.1, 816.4, 419.1, 814.9, 417.6, 810.1, 417.6, 797.9, 424.6, 794.1, 423.6, 792.9, 422.4, 793.4, 420.9, 799.4, 415.9, 797.9, 413.6, 796.4, 413.6, 795.9, 412.6, 801.4, 407.9, 801.4, 406.1, 799.9, 404.6, 797.1, 404.6, 790.9, 408.6, 784.1, 408.6, 780.9, 410.6, 777.1, 410.6, 772.1, 403.6, 764.9, 398.6, 759.1, 397.6, 757.9, 396.6], [825.1, 515.6, 823.6, 517.1, 823.6, 518.9, 821.6, 522.1, 821.6, 523.9, 823.1, 525.6, 822.6, 527.9, 824.1, 529.4, 826.9, 529.4, 830.1, 525.4, 831.9, 525.4, 833.1, 526.4, 836.9, 526.4, 838.4, 524.9, 838.4, 523.1, 835.9, 520.6, 831.1, 518.6, 827.9, 515.6]], "52.72": [[711.1, 400.6, 709.9, 401.6, 703.1, 401.6, 701.9, 402.6, 698.1, 402.6, 696.9, 403.6, 692.1, 403.6, 690.9, 404.6, 689.1, 404.6, 681.1, 408.6, 675.6, 414.1, 675.6, 414.9, 677.9, 416.4, 681.1, 413.4, 689.1, 409.4, 690.9, 409.4, 695.1, 407.4, 697.9, 407.4, 699.1, 406.4, 706.9, 406.4, 708.1, 407.4, 712.9, 407.4, 714.1, 408.4, 716.9, 408.4, 718.1, 409.4, 722.9, 410.4, 729.4, 415.1, 724.1, 415.6, 722.9, 414.6, 709.1, 414.6, 707.9, 415.6, 704.1, 415.6, 699.9, 417.6, 697.1, 417.6, 690.9, 420.6, 685.1, 421.6, 678.9, 424.6, 674.6, 430.1, 667.6, 437.1, 665.6, 440.1, 664.6, 445.9, 661.6, 448.1, 660.6, 450.1, 659.6, 456.9, 662.6, 462.1, 662.6, 467.9, 663.6, 469.1, 663.6, 472.9, 668.6, 483.1, 668.6, 487.9, 662.6, 496.1, 662.6, 503.9, 661.9, 504.6, 659.1, 504.6, 657.6, 506.1, 656.6, 508.1, 656.6, 511.9, 652.6, 517.1, 650.6, 521.1, 650.6, 522.9, 647.6, 526.1, 647.6, 527.9, 644.6, 533.1, 644.6, 534.9, 640.6, 540.1, 640.6, 541.9, 641.6, 543.1, 643.1, 544.4, 647.9, 544.4, 649.4, 542.9, 650.4, 540.1, 659.4, 532.9, 661.4, 526.1, 665.1, 523.4, 666.9, 520.9, 667.6, 521.6, 667.6, 523.9, 663.6, 529.1, 662.6, 532.9, 660.6, 536.1, 662.1, 538.4, 664.9, 538.4, 671.4, 531.9, 673.4, 525.1, 677.4, 520.9, 677.4, 517.1, 680.1, 515.4, 682.1, 514.9, 683.6, 517.1, 679.6, 523.1, 679.6, 527.9, 681.9, 529.4, 685.4, 525.9, 685.4, 524.1, 688.4, 521.9, 688.4, 520.1, 692.4, 516.9, 691.6, 513.9, 696.6, 509.9, 698.9, 510.4, 701.1, 507.4, 703.9, 507.4, 708.1, 512.4, 710.9, 513.4, 713.1, 515.4, 719.1, 518.4, 727.9, 520.4, 731.1, 522.4, 738.9, 523.4, 740.1, 524.4, 753.9, 524.4, 755.1, 523.4, 756.1, 523.6, 756.6, 525.9, 755.6, 527.1, 753.6, 534.9, 751.6, 538.1, 749.6, 544.9, 747.6, 547.1, 747.6, 548.9, 750.1, 551.4, 755.9, 551.4, 764.6, 545.9, 768.1, 548.4, 769.9, 548.4, 772.9, 546.4, 775.1, 543.4, 780.9, 543.4, 782.4, 541.1, 785.4, 538.9, 787.4, 534.9, 787.4, 533.1, 790.4, 528.9, 789.9, 526.6, 792.4, 523.9, 794.4, 519.1, 798.1, 516.4, 799.6, 517.1, 799.6, 521.9, 798.6, 523.9, 800.1, 525.4, 805.9, 526.4, 809.1, 530.4, 810.9, 530.4, 812.4, 528.9, 812.4, 527.1, 813.1, 526.4, 815.9, 526.4, 817.4, 524.9, 817.4, 523.1, 814.9, 520.6, 810.9, 518.6, 808.4, 515.9, 808.4, 513.1, 809.4, 511.9, 811.1, 510.4, 812.9, 510.4, 814.4, 508.9, 814.4, 507.1, 812.9, 505.6, 810.9, 504.6, 807.6, 504.9, 808.4, 500.1, 815.4, 490.9, 817.4, 484.1, 819.1, 481.4, 820.9, 481.4, 825.1, 479.4, 828.9, 479.4, 832.9, 477.4, 834.4, 475.9, 833.4, 473.9, 834.1, 472.4, 836.9, 472.4, 838.1, 471.4, 840.9, 471.4, 842.9, 470.4, 848.4, 464.9, 848.4, 463.1, 846.9, 461.6, 839.1, 461.6, 836.9, 458.6, 834.9, 459.6, 831.1, 459.6, 829.9, 460.6, 826.1, 460.6, 820.9, 462.6, 818.1, 462.6, 810.9, 456.6, 809.1, 456.6, 791.9, 447.6, 790.1, 447.6, 785.9, 445.6, 782.1, 445.6, 780.9, 444.6, 774.1, 444.6, 772.4, 441.9, 772.4, 440.1, 777.4, 433.1, 775.9, 431.6, 771.4, 431.6, 770.9, 430.6, 774.4, 426.1, 777.4, 423.9, 777.4, 421.1, 775.9, 419.6, 774.1, 419.6, 763.9, 424.6, 757.1, 426.6, 754.4, 423.1, 760.4, 417.9, 757.9, 414.4, 760.4, 410.9, 760.4, 409.1, 758.9, 407.6, 756.1, 407.6, 752.9, 409.6, 745.1, 411.6, 742.9, 413.6, 740.1, 413.6, 731.9, 405.6, 723.9, 401.6, 721.1, 401.6, 719.9, 400.6]], "52.76": [[674.1, 401.6, 671.9, 403.6, 663.1, 404.6, 661.9, 405.6, 657.1, 406.6, 652.9, 409.6, 651.1, 409.6, 647.1, 412.6, 641.6, 418.1, 637.6, 426.1, 639.1, 428.4, 641.4, 426.9, 647.4, 418.1, 650.1, 415.4, 659.1, 410.4, 660.9, 410.4, 665.1, 408.4, 667.9, 408.4, 669.1, 407.4, 680.9, 407.4, 682.1, 408.4, 685.9, 408.4, 694.1, 413.4, 695.1, 414.6, 694.6, 415.6, 676.1, 415.6, 674.9, 416.6, 672.1, 416.6, 670.9, 417.6, 663.1, 419.6, 656.6, 422.6, 655.9, 422.1, 656.4, 420.1, 654.9, 418.6, 652.1, 418.6, 647.6, 424.1, 647.6, 426.9, 646.6, 428.9, 640.1, 435.6, 638.9, 436.1, 638.4, 434.1, 636.9, 432.6, 633.6, 435.1, 633.6, 438.9, 636.1, 441.4, 634.6, 444.9, 632.6, 447.1, 632.6, 448.9, 629.6, 456.1, 629.6, 460.9, 632.1, 463.4, 638.1, 466.4, 641.9, 466.4, 643.1, 465.4, 644.9, 465.4, 648.4, 470.9, 647.9, 471.6, 643.1, 471.6, 637.9, 468.6, 635.1, 468.6, 633.6, 470.1, 633.6, 473.9, 640.1, 480.6, 639.6, 484.9, 641.6, 489.1, 649.9, 493.4, 655.1, 497.4, 661.9, 499.4, 666.1, 503.4, 672.9, 505.4, 678.9, 511.4, 683.1, 514.4, 694.1, 519.4, 698.9, 520.4, 702.1, 522.4, 705.9, 522.4, 707.1, 523.4, 712.9, 524.4, 714.1, 525.4, 735.9, 525.4, 737.1, 524.4, 739.9, 524.4, 750.1, 520.4, 752.9, 520.4, 755.1, 518.4, 757.1, 519.4, 769.9, 519.4, 771.1, 518.4, 772.9, 518.4, 775.6, 521.1, 775.6, 523.9, 780.6, 527.1, 780.6, 528.9, 785.9, 534.4, 789.9, 536.4, 791.4, 534.9, 791.4, 532.1, 794.4, 529.9, 791.9, 526.9, 794.9, 526.4, 796.4, 524.1, 794.9, 522.6, 793.1, 522.6, 791.9, 521.6, 787.1, 521.6, 785.4, 519.9, 784.4, 515.1, 785.9, 514.4, 787.4, 512.1, 784.9, 509.6, 782.1, 510.6, 778.9, 515.6, 775.6, 515.1, 775.4, 514.1, 777.4, 511.9, 777.4, 510.1, 778.4, 508.9, 778.4, 502.1, 780.4, 499.9, 781.4, 497.1, 784.4, 493.9, 786.4, 489.1, 790.1, 483.4, 794.9, 483.4, 807.9, 478.4, 809.4, 476.9, 809.4, 474.1, 814.9, 471.4, 819.4, 466.9, 819.4, 463.1, 817.9, 461.6, 814.1, 461.6, 812.9, 462.6, 811.1, 462.6, 808.9, 460.6, 805.1, 460.6, 799.9, 463.6, 794.1, 464.6, 788.9, 467.6, 787.1, 467.6, 783.9, 465.6, 777.9, 458.9, 780.1, 457.4, 784.9, 457.4, 786.4, 455.9, 786.4, 454.1, 783.9, 451.9, 788.9, 451.4, 790.9, 450.4, 792.4, 448.9, 790.9, 446.4, 791.4, 445.4, 793.1, 444.4, 796.9, 444.4, 798.1, 443.4, 799.9, 443.4, 801.4, 441.9, 801.4, 440.1, 799.9, 438.4, 800.4, 437.4, 809.9, 434.4, 811.4, 432.9, 811.4, 431.1, 809.9, 429.6, 804.9, 427.9, 808.9, 427.4, 812.1, 425.4, 815.9, 424.4, 817.4, 422.9, 817.4, 421.1, 815.9, 419.6, 814.1, 419.6, 812.9, 418.6, 802.1, 418.6, 800.9, 419.6, 793.1, 419.6, 791.9, 420.6, 788.1, 420.6, 782.9, 422.6, 773.1, 423.6, 771.9, 424.6, 767.1, 425.6, 755.1, 431.6, 752.9, 433.6, 750.1, 434.6, 745.6, 438.6, 744.9, 437.6, 746.4, 435.9, 746.4, 434.1, 744.9, 432.6, 741.1, 432.6, 739.6, 433.6, 738.9, 433.1, 746.4, 424.9, 746.4, 422.1, 744.9, 420.6, 741.1, 420.6, 739.9, 421.6, 738.1, 421.6, 727.9, 428.6, 726.1, 428.6, 724.4, 425.9, 723.9, 423.9, 726.9, 422.4, 729.4, 419.9, 726.9, 415.6, 731.4, 409.9, 731.4, 408.1, 729.9, 406.6, 728.1, 406.6, 720.9, 411.6, 716.1, 411.6, 709.9, 415.6, 708.1, 415.6, 705.9, 417.1, 705.4, 415.1, 707.4, 412.1, 703.1, 407.6, 696.9, 403.6, 695.1, 403.6, 690.9, 401.6]], "52.80": [[747.1, 351.6, 743.6, 356.1, 743.6, 357.9, 739.6, 365.1, 738.6, 369.9, 733.6, 379.9, 719.6, 400.1, 717.6, 404.9, 709.6, 416.9, 701.1, 422.6, 699.1, 425.1, 697.4, 423.9, 695.9, 419.9, 701.4, 414.9, 699.4, 411.1, 703.4, 406.9, 703.4, 404.1, 701.9, 402.6, 697.1, 404.6, 692.9, 407.6, 686.1, 407.6, 681.9, 410.6, 680.1, 410.6, 674.1, 403.6, 667.9, 399.6, 666.1, 399.6, 662.9, 397.6, 658.1, 397.6, 656.9, 396.6, 647.4, 396.6, 647.4, 394.1, 645.1, 390.6, 643.9, 389.6, 639.9, 390.1, 638.4, 387.9, 638.4, 382.1, 636.4, 376.9, 634.9, 375.6, 632.1, 375.6, 628.9, 379.1, 628.4, 376.1, 627.4, 374.9, 627.4, 370.1, 626.4, 368.1, 624.9, 366.6, 622.1, 366.6, 620.6, 367.9, 618.6, 373.1, 618.6, 377.9, 615.6, 382.1, 615.6, 383.9, 614.6, 385.1, 614.6, 387.9, 612.6, 392.1, 612.6, 397.9, 610.6, 402.1, 611.6, 406.9, 613.6, 409.1, 613.6, 410.9, 608.6, 421.1, 608.6, 422.9, 610.1, 424.4, 612.4, 422.9, 617.4, 415.1, 620.1, 412.4, 622.9, 412.4, 631.1, 406.4, 632.9, 406.4, 637.1, 404.4, 639.9, 404.4, 644.1, 402.4, 650.9, 402.4, 652.1, 403.4, 656.9, 403.4, 660.1, 405.4, 661.9, 405.4, 668.1, 410.4, 674.9, 413.4, 676.6, 415.6, 675.1, 416.6, 666.9, 411.6, 644.1, 411.6, 642.9, 412.6, 641.1, 412.6, 627.9, 417.6, 626.1, 417.6, 623.1, 415.6, 620.6, 418.1, 620.6, 419.9, 617.6, 424.1, 610.1, 431.6, 606.6, 434.1, 606.6, 436.9, 604.6, 439.1, 604.6, 440.9, 602.6, 443.1, 602.6, 444.9, 601.6, 446.1, 601.6, 456.9, 606.6, 463.1, 605.6, 465.1, 605.6, 468.9, 610.6, 479.9, 617.9, 487.4, 621.1, 489.4, 626.9, 489.4, 635.1, 493.4, 640.9, 493.4, 642.1, 494.4, 644.9, 494.4, 651.1, 497.4, 653.9, 497.4, 660.1, 500.4, 661.9, 500.4, 662.6, 501.1, 662.6, 503.9, 661.6, 504.6, 657.9, 502.6, 655.1, 502.6, 653.9, 501.6, 650.1, 501.6, 648.9, 500.6, 647.1, 500.6, 645.6, 502.9, 648.6, 507.1, 656.1, 511.4, 661.9, 512.4, 664.1, 514.4, 666.9, 514.4, 670.1, 517.4, 673.1, 515.9, 673.6, 517.9, 675.1, 519.4, 678.9, 519.4, 682.1, 521.4, 684.9, 520.4, 686.1, 521.4, 691.9, 521.4, 698.1, 524.4, 703.9, 524.4, 706.1, 522.4, 709.9, 522.4, 711.1, 521.4, 712.9, 521.4, 718.1, 518.4, 719.9, 518.4, 725.1, 515.4, 726.9, 515.4, 731.1, 512.4, 746.9, 512.4, 748.1, 511.4, 753.9, 511.4, 755.1, 512.4, 758.6, 517.1, 758.6, 518.9, 760.6, 522.9, 763.9, 526.4, 767.1, 528.4, 770.9, 526.4, 777.4, 520.9, 777.4, 519.1, 775.9, 517.6, 774.1, 517.6, 770.1, 515.6, 766.4, 511.9, 766.4, 510.1, 765.4, 508.9, 765.4, 505.1, 768.4, 502.9, 768.4, 501.1, 766.9, 499.6, 764.1, 499.6, 759.1, 505.6, 756.4, 507.1, 755.4, 506.6, 755.4, 496.1, 761.4, 488.9, 762.4, 486.1, 766.1, 481.4, 780.9, 477.4, 782.4, 475.9, 781.9, 472.6, 783.1, 471.4, 784.9, 471.4, 790.1, 468.4, 796.4, 461.9, 796.4, 460.1, 794.9, 458.6, 787.1, 458.6, 785.9, 457.6, 781.1, 457.6, 777.9, 459.6, 776.1, 459.6, 774.9, 460.6, 770.1, 460.6, 768.9, 461.6, 767.1, 461.6, 762.9, 464.6, 760.1, 464.6, 756.4, 460.9, 756.4, 459.1, 755.4, 457.9, 755.4, 454.1, 754.4, 452.1, 749.4, 447.9, 747.9, 445.4, 748.4, 444.4, 751.9, 443.4, 756.1, 440.4, 757.4, 438.1, 755.9, 435.9, 758.9, 434.4, 762.4, 430.9, 759.9, 427.6, 757.4, 427.6, 756.9, 426.6, 764.4, 420.1, 767.4, 415.1, 764.9, 412.6, 761.1, 412.6, 759.6, 413.6, 758.6, 412.9, 763.4, 405.9, 768.4, 400.9, 773.4, 391.1, 770.9, 388.6, 768.1, 388.6, 763.1, 391.6, 759.9, 394.6, 758.4, 394.1, 759.4, 391.1, 765.4, 382.9, 767.4, 378.9, 767.4, 377.1, 769.4, 373.9, 770.4, 368.1, 767.9, 365.6, 764.1, 365.6, 762.9, 366.6, 751.6, 380.1, 749.6, 383.9, 748.4, 385.1, 747.4, 384.6, 747.4, 383.1, 750.4, 377.9, 750.4, 375.1, 752.4, 371.9, 752.4, 369.1, 754.4, 364.9, 754.4, 355.1, 750.9, 351.6]], "52.84": [[623.1, 394.6, 620.9, 396.6, 611.1, 397.6, 598.1, 402.6, 593.9, 405.6, 586.6, 412.9, 582.6, 419.1, 582.6, 420.9, 584.9, 422.4, 587.4, 419.9, 588.4, 417.1, 595.1, 409.4, 599.9, 407.4, 604.1, 404.4, 605.9, 404.4, 612.1, 401.4, 627.9, 401.4, 629.1, 402.4, 631.9, 402.4, 633.1, 403.4, 634.9, 403.4, 643.6, 409.4, 642.6, 410.1, 639.9, 408.6, 620.1, 408.6, 618.9, 409.6, 611.1, 411.6, 602.9, 415.6, 601.1, 415.6, 598.9, 413.6, 597.1, 413.6, 595.6, 414.9, 593.6, 420.1, 581.6, 432.1, 579.6, 436.9, 577.6, 439.1, 577.6, 443.9, 575.6, 449.1, 575.6, 451.9, 579.6, 460.1, 579.6, 462.9, 582.1, 465.6, 580.6, 468.1, 580.6, 471.9, 584.6, 479.1, 591.1, 485.4, 596.9, 488.4, 600.1, 491.4, 601.9, 491.4, 606.1, 494.4, 607.9, 494.4, 613.1, 497.4, 614.9, 497.4, 618.9, 499.4, 624.9, 506.4, 630.1, 510.4, 643.1, 515.4, 650.9, 516.4, 653.1, 518.4, 657.9, 518.4, 659.1, 519.4, 661.9, 518.4, 663.1, 519.4, 667.9, 519.4, 669.1, 520.4, 676.9, 520.4, 680.1, 517.4, 684.9, 517.4, 686.1, 518.4, 689.9, 518.4, 691.1, 517.4, 692.9, 517.4, 694.4, 515.9, 693.9, 513.6, 694.6, 512.9, 697.1, 514.4, 698.9, 514.4, 700.1, 513.4, 701.9, 513.4, 703.4, 511.9, 703.4, 510.1, 704.1, 509.4, 705.9, 509.4, 709.1, 513.4, 721.9, 513.4, 723.6, 516.1, 723.6, 517.9, 725.6, 520.1, 725.6, 521.9, 728.6, 529.9, 733.1, 533.4, 736.9, 533.4, 738.4, 531.9, 738.4, 529.4, 741.9, 529.4, 743.4, 527.9, 741.9, 524.6, 745.1, 522.4, 746.4, 520.1, 744.9, 518.6, 739.1, 518.6, 736.4, 515.9, 736.4, 513.1, 740.4, 507.9, 739.4, 505.9, 737.9, 504.6, 735.1, 504.6, 729.9, 510.6, 727.9, 511.6, 725.1, 511.6, 724.4, 510.1, 726.4, 507.9, 726.4, 505.1, 727.4, 503.9, 727.4, 498.1, 731.4, 494.9, 739.4, 481.9, 741.1, 480.4, 748.9, 479.4, 754.9, 476.4, 758.4, 472.9, 758.4, 471.1, 759.1, 470.4, 762.9, 469.4, 765.9, 467.4, 771.4, 461.9, 768.9, 458.6, 764.1, 458.6, 762.4, 459.6, 759.9, 456.6, 757.1, 456.6, 755.9, 457.6, 751.1, 458.6, 745.9, 461.6, 744.1, 461.6, 739.6, 463.6, 738.9, 463.1, 742.4, 459.9, 743.4, 457.9, 740.9, 454.9, 748.9, 451.4, 753.4, 446.9, 751.9, 444.6, 748.6, 444.6, 747.9, 443.9, 751.1, 441.4, 755.9, 439.4, 764.4, 430.9, 764.4, 429.1, 762.9, 427.6, 759.1, 427.6, 754.1, 429.6, 751.9, 431.6, 750.1, 431.6, 746.6, 433.6, 745.6, 433.1, 757.4, 421.1, 761.4, 415.1, 759.9, 413.6, 757.1, 413.6, 753.1, 415.6, 743.9, 422.6, 741.1, 423.6, 736.9, 427.6, 730.1, 430.6, 727.9, 432.6, 726.1, 432.6, 716.9, 437.6, 715.1, 437.6, 711.9, 439.6, 705.1, 441.6, 702.9, 443.6, 696.1, 446.6, 692.9, 443.6, 687.1, 442.6, 683.9, 440.4, 688.4, 433.9, 692.4, 429.9, 689.9, 426.6, 688.1, 426.6, 686.9, 427.6, 684.9, 427.1, 691.4, 419.9, 693.4, 415.9, 692.4, 413.9, 690.9, 412.6, 688.9, 413.6, 686.1, 413.6, 683.9, 415.6, 678.1, 418.6, 674.9, 421.6, 672.1, 421.6, 669.4, 419.9, 669.4, 418.1, 670.4, 416.9, 674.4, 413.9, 674.4, 412.1, 671.9, 409.6, 674.4, 406.9, 676.4, 402.9, 676.4, 401.1, 674.9, 399.6, 672.1, 400.6, 666.9, 404.6, 665.1, 404.6, 663.9, 405.6, 659.1, 404.6, 657.1, 405.6, 654.9, 408.6, 651.1, 408.6, 649.9, 407.4, 650.4, 405.1, 648.4, 402.1, 643.9, 398.6, 637.9, 395.6, 635.1, 395.6, 633.9, 394.6]], "52.88": [[597.1, 392.6, 595.9, 393.6, 587.1, 394.6, 585.9, 395.6, 583.1, 395.6, 581.9, 396.6, 577.1, 397.6, 565.1, 403.6, 561.6, 406.9, 559.6, 410.1, 561.1, 412.4, 562.9, 412.4, 567.9, 407.4, 575.1, 402.4, 576.9, 402.4, 581.1, 400.4, 583.9, 400.4, 585.1, 399.4, 597.9, 399.4, 599.1, 400.4, 603.9, 400.4, 611.1, 404.4, 614.9, 404.4, 616.1, 405.4, 617.9, 405.4, 620.1, 408.4, 623.1, 410.1, 620.1, 410.6, 615.9, 407.6, 613.1, 407.6, 611.9, 406.6, 595.1, 406.6, 593.9, 407.6, 587.1, 408.6, 576.9, 412.6, 575.1, 412.6, 572.9, 410.6, 571.1, 410.6, 567.6, 412.9, 566.6, 414.1, 566.6, 417.1, 558.1, 425.6, 556.6, 426.1, 554.9, 424.6, 553.1, 424.6, 550.6, 427.1, 550.6, 429.9, 549.6, 431.1, 550.6, 433.9, 546.6, 443.1, 546.6, 451.9, 550.6, 457.1, 550.6, 459.9, 551.6, 461.1, 551.6, 463.9, 553.6, 468.1, 554.6, 473.9, 562.1, 484.4, 563.9, 484.4, 567.6, 487.1, 574.1, 490.4, 575.9, 490.4, 577.4, 492.1, 575.1, 492.6, 573.9, 491.6, 572.1, 491.6, 563.9, 486.6, 560.1, 486.6, 554.6, 491.9, 550.6, 498.1, 548.6, 502.1, 548.6, 503.9, 544.6, 510.1, 544.6, 511.9, 542.6, 514.1, 542.6, 515.9, 540.6, 519.9, 537.6, 523.1, 534.6, 528.9, 531.6, 532.1, 530.6, 534.9, 528.6, 537.1, 528.6, 539.9, 530.1, 541.4, 532.9, 541.4, 536.9, 539.4, 546.9, 530.6, 547.6, 531.1, 547.6, 533.9, 549.1, 535.4, 551.9, 535.4, 555.1, 532.4, 561.1, 529.4, 565.4, 524.9, 566.4, 522.1, 570.6, 516.9, 571.6, 517.6, 569.6, 521.1, 569.6, 525.9, 571.1, 527.4, 572.9, 527.4, 576.1, 525.4, 592.4, 503.9, 590.1, 500.6, 580.1, 494.4, 580.1, 493.4, 581.6, 493.4, 589.9, 497.4, 593.4, 501.9, 606.1, 510.4, 607.9, 510.4, 611.1, 512.4, 612.9, 512.4, 623.1, 516.4, 627.9, 516.4, 630.1, 517.9, 625.6, 527.9, 616.6, 541.1, 616.6, 542.9, 618.1, 544.4, 621.9, 545.4, 625.9, 543.4, 629.9, 539.4, 631.9, 538.4, 635.4, 533.9, 639.4, 526.1, 644.4, 520.9, 645.9, 517.9, 646.6, 519.6, 645.6, 521.1, 645.6, 522.9, 641.6, 528.1, 638.6, 534.1, 638.6, 536.9, 640.1, 538.4, 642.9, 538.4, 648.1, 534.4, 653.4, 527.9, 655.4, 523.1, 659.4, 518.9, 660.4, 515.1, 662.1, 512.4, 665.9, 512.4, 669.1, 515.4, 671.1, 514.4, 674.9, 514.4, 678.1, 516.4, 682.9, 516.4, 685.4, 513.9, 685.4, 511.1, 689.4, 504.9, 689.4, 497.1, 690.1, 496.4, 695.9, 496.4, 700.9, 494.4, 702.4, 492.9, 703.4, 490.1, 706.4, 487.9, 709.4, 481.1, 712.1, 478.4, 716.9, 478.4, 718.1, 477.4, 721.9, 477.4, 723.1, 476.4, 728.9, 475.4, 732.4, 471.9, 732.4, 469.4, 734.1, 468.4, 736.9, 468.4, 743.4, 461.9, 740.9, 458.6, 737.1, 458.6, 735.1, 459.6, 731.1, 456.6, 729.9, 457.6, 725.1, 457.6, 721.9, 459.6, 715.1, 460.6, 710.9, 463.6, 708.1, 463.6, 706.4, 461.9, 704.4, 457.9, 699.9, 453.6, 696.9, 451.6, 695.1, 451.6, 687.1, 447.6, 684.9, 445.6, 680.1, 444.6, 676.9, 442.6, 674.1, 442.6, 672.9, 441.6, 667.1, 441.6, 660.9, 438.6, 657.1, 438.6, 656.4, 437.1, 665.4, 426.9, 665.4, 425.1, 663.9, 423.6, 658.9, 423.1, 665.4, 415.9, 665.4, 413.1, 663.9, 411.6, 660.1, 411.6, 658.9, 412.6, 657.1, 412.6, 654.9, 414.6, 650.1, 416.6, 645.9, 419.6, 643.1, 419.6, 641.4, 417.1, 646.4, 411.9, 643.9, 407.6, 647.4, 403.9, 649.4, 399.9, 647.9, 397.6, 646.1, 397.6, 639.9, 402.6, 632.1, 402.6, 628.9, 405.6, 625.6, 407.1, 622.4, 404.1, 620.4, 400.1, 617.9, 397.6, 606.9, 392.6]], "52.92": [[567.1, 395.6, 560.9, 398.6, 554.1, 398.6, 552.9, 399.6, 550.1, 399.6, 547.9, 401.6, 546.1, 401.6, 540.1, 404.6, 535.9, 407.6, 531.6, 412.1, 530.6, 415.9, 532.1, 417.4, 532.9, 417.4, 540.1, 409.4, 554.1, 402.4, 563.9, 402.4, 565.9, 401.4, 567.1, 402.4, 570.9, 402.4, 572.1, 403.4, 577.9, 403.4, 582.1, 406.4, 583.9, 406.4, 585.1, 407.4, 588.9, 407.4, 589.6, 408.1, 589.6, 409.9, 588.1, 410.6, 586.9, 409.6, 574.1, 409.6, 572.9, 408.6, 570.1, 408.6, 568.9, 409.6, 565.1, 409.6, 560.9, 411.6, 555.1, 412.6, 547.9, 416.6, 546.4, 415.9, 546.4, 413.1, 544.1, 411.6, 538.6, 416.1, 537.6, 418.1, 537.6, 421.9, 532.6, 426.9, 528.1, 433.4, 527.1, 433.4, 526.9, 432.6, 528.4, 428.1, 526.9, 426.6, 524.6, 427.9, 522.6, 431.1, 523.6, 436.9, 519.6, 443.1, 519.6, 448.9, 518.6, 450.9, 519.6, 452.1, 519.6, 455.9, 522.6, 460.1, 522.6, 461.9, 523.6, 463.1, 523.6, 470.9, 527.4, 476.9, 528.6, 480.6, 526.9, 481.6, 526.4, 478.1, 524.1, 474.6, 520.1, 472.6, 515.9, 468.6, 514.1, 468.6, 510.1, 470.6, 506.6, 474.1, 506.6, 475.9, 507.6, 477.1, 509.9, 478.4, 514.4, 475.4, 515.4, 476.1, 514.6, 477.9, 506.6, 487.1, 506.6, 489.9, 509.1, 492.4, 511.9, 492.4, 513.9, 491.4, 523.4, 483.4, 524.4, 483.9, 523.6, 486.9, 527.1, 490.4, 528.9, 490.4, 530.1, 489.4, 531.4, 487.9, 531.4, 486.1, 532.9, 485.4, 538.9, 488.4, 544.1, 492.4, 552.1, 496.4, 553.9, 496.4, 564.9, 502.4, 574.1, 511.4, 580.1, 514.4, 581.9, 514.4, 588.1, 517.4, 590.9, 517.4, 598.1, 520.4, 605.9, 521.4, 607.1, 522.4, 625.9, 522.4, 627.1, 521.4, 630.9, 521.4, 639.1, 516.4, 641.9, 516.4, 643.9, 515.4, 645.4, 513.9, 645.9, 511.9, 649.1, 513.4, 650.9, 513.4, 653.1, 515.4, 656.9, 515.4, 658.1, 516.4, 659.9, 516.4, 661.6, 514.9, 663.9, 515.4, 666.1, 513.4, 668.9, 513.4, 671.4, 510.9, 671.4, 503.1, 670.4, 501.1, 678.4, 489.1, 681.4, 485.9, 681.4, 483.1, 683.1, 481.4, 686.9, 482.4, 689.1, 480.4, 700.9, 478.4, 702.4, 476.9, 702.4, 473.4, 711.9, 468.4, 716.4, 463.9, 716.4, 462.1, 713.9, 459.6, 711.1, 459.6, 706.9, 461.6, 703.9, 459.6, 699.1, 459.6, 690.9, 463.6, 685.1, 463.6, 681.6, 468.1, 675.1, 464.6, 667.9, 458.4, 668.4, 457.4, 672.9, 456.4, 674.4, 454.9, 674.4, 452.4, 678.9, 452.4, 680.1, 451.4, 682.9, 451.4, 684.4, 449.1, 680.6, 445.9, 681.1, 445.4, 683.1, 444.4, 686.9, 444.4, 688.1, 443.4, 691.9, 443.4, 693.9, 442.4, 695.4, 440.9, 695.4, 439.1, 693.9, 437.6, 691.1, 437.4, 691.1, 436.6, 694.9, 436.4, 700.1, 434.4, 702.9, 434.4, 706.1, 432.4, 707.4, 430.1, 705.9, 428.6, 703.9, 427.6, 697.6, 427.6, 696.9, 426.9, 700.9, 426.4, 702.1, 425.4, 705.9, 425.4, 709.9, 423.4, 712.4, 420.9, 709.9, 417.6, 692.1, 417.6, 690.9, 418.6, 685.1, 418.6, 683.9, 419.6, 680.1, 419.6, 678.9, 420.6, 675.1, 420.6, 673.9, 421.6, 669.1, 421.6, 667.9, 422.6, 661.1, 423.6, 656.9, 425.6, 654.1, 425.6, 643.1, 431.6, 629.9, 442.1, 629.6, 440.9, 636.4, 430.9, 636.4, 428.1, 634.9, 426.6, 631.4, 426.6, 630.9, 425.6, 636.4, 418.9, 637.4, 415.1, 634.1, 412.6, 620.1, 420.6, 617.9, 422.6, 615.1, 422.6, 613.4, 420.9, 613.4, 419.1, 618.4, 414.9, 618.4, 413.1, 616.9, 410.6, 621.4, 403.9, 621.4, 402.1, 619.9, 400.6, 617.1, 401.6, 611.9, 405.6, 609.1, 405.6, 607.9, 406.6, 603.1, 406.6, 599.1, 409.6, 592.1, 401.6, 582.9, 396.6, 581.1, 396.6, 579.9, 395.6]], "52.96": [[643.1, 348.6, 638.6, 354.1, 636.6, 358.1, 636.6, 359.9, 630.6, 369.1, 627.6, 375.9, 623.6, 381.1, 623.6, 382.9, 618.6, 389.1, 613.6, 397.9, 610.6, 401.1, 605.6, 411.1, 605.6, 412.9, 603.6, 416.9, 602.4, 418.1, 600.1, 417.6, 596.1, 419.6, 590.9, 423.6, 587.1, 423.6, 584.9, 420.6, 591.4, 415.9, 588.9, 411.6, 593.4, 405.9, 593.4, 404.1, 591.9, 402.6, 588.1, 403.6, 582.9, 407.6, 578.1, 407.6, 573.9, 409.6, 570.1, 409.6, 566.9, 407.6, 561.1, 401.6, 557.9, 399.6, 556.1, 399.6, 554.9, 398.6, 548.1, 398.6, 546.9, 397.6, 543.1, 397.6, 540.9, 395.6, 539.1, 395.6, 538.4, 394.9, 538.4, 390.1, 537.4, 388.9, 537.4, 386.1, 533.9, 382.6, 532.1, 382.6, 530.6, 384.1, 529.1, 388.1, 526.9, 384.6, 525.1, 384.6, 523.4, 382.9, 522.4, 380.9, 522.4, 379.1, 523.4, 377.9, 522.4, 375.9, 522.4, 371.1, 520.4, 367.9, 517.1, 365.6, 515.6, 367.1, 515.6, 372.9, 514.6, 374.1, 514.6, 377.9, 513.6, 379.1, 513.6, 385.4, 512.9, 386.1, 510.9, 383.6, 510.1, 383.6, 507.6, 386.1, 507.6, 389.9, 506.6, 391.1, 506.6, 400.9, 507.6, 402.1, 507.6, 406.9, 501.6, 413.1, 498.6, 419.1, 498.6, 420.9, 496.6, 424.1, 498.1, 426.4, 501.4, 423.9, 507.4, 412.1, 513.4, 407.1, 517.1, 400.4, 523.9, 400.4, 527.1, 398.4, 533.4, 398.4, 534.1, 399.1, 525.1, 401.6, 518.1, 405.6, 515.6, 408.1, 517.1, 410.4, 525.1, 407.4, 526.9, 407.4, 530.1, 405.4, 532.9, 405.4, 534.1, 404.4, 547.4, 403.9, 556.1, 409.4, 562.9, 409.4, 563.6, 410.1, 563.6, 411.9, 567.1, 415.1, 565.1, 415.6, 561.9, 413.6, 560.1, 413.6, 555.9, 411.6, 536.1, 411.6, 534.9, 412.6, 532.1, 412.6, 527.9, 415.6, 525.1, 415.6, 523.9, 416.6, 518.1, 416.6, 512.1, 422.6, 509.1, 422.6, 507.6, 424.1, 502.6, 430.9, 499.6, 432.9, 495.6, 438.1, 495.6, 440.9, 491.6, 447.1, 491.6, 450.9, 489.6, 456.1, 490.9, 458.4, 495.6, 461.1, 496.6, 469.9, 502.6, 484.1, 509.1, 489.4, 515.1, 493.4, 519.9, 495.4, 522.1, 497.4, 523.9, 497.4, 527.1, 499.4, 531.9, 500.4, 539.9, 506.4, 542.9, 510.4, 547.1, 513.4, 548.9, 513.4, 552.1, 515.4, 553.9, 515.4, 567.1, 521.4, 569.9, 521.4, 574.1, 523.4, 577.9, 523.4, 579.1, 524.4, 584.9, 524.4, 586.1, 525.4, 589.9, 525.4, 591.1, 524.4, 597.9, 524.4, 622.1, 512.4, 629.9, 512.4, 631.1, 511.4, 640.9, 510.4, 642.1, 509.4, 646.4, 504.9, 646.4, 503.1, 645.4, 501.9, 632.9, 494.6, 626.1, 492.6, 624.4, 490.9, 624.6, 489.9, 626.9, 489.4, 629.1, 491.4, 634.1, 493.4, 641.9, 493.4, 643.1, 492.4, 644.9, 492.4, 652.4, 485.9, 652.4, 484.1, 653.1, 483.4, 658.9, 483.4, 668.9, 478.4, 670.4, 476.9, 669.6, 473.9, 673.9, 472.4, 678.1, 469.4, 681.4, 465.9, 682.4, 463.1, 684.4, 460.9, 682.9, 458.6, 674.1, 458.6, 672.9, 459.6, 666.1, 460.6, 659.9, 463.6, 653.1, 463.6, 649.6, 467.1, 646.1, 465.6, 641.9, 461.6, 632.9, 458.1, 633.4, 456.1, 636.4, 452.9, 636.4, 450.4, 642.9, 450.4, 646.4, 447.9, 646.4, 446.1, 644.9, 444.6, 640.6, 444.6, 640.1, 443.6, 646.1, 441.4, 648.9, 441.4, 652.4, 438.9, 652.4, 437.1, 650.9, 435.6, 646.6, 435.6, 645.9, 434.9, 649.1, 432.4, 651.9, 431.4, 656.4, 426.9, 654.9, 424.6, 651.4, 424.6, 650.9, 423.6, 659.4, 415.1, 662.4, 410.1, 658.9, 407.6, 657.1, 407.6, 653.9, 409.6, 652.4, 409.6, 651.9, 408.6, 661.4, 397.9, 666.4, 388.9, 666.4, 387.1, 663.1, 384.6, 659.1, 386.6, 651.1, 393.4, 649.9, 393.1, 655.4, 384.9, 657.4, 380.1, 659.4, 377.9, 659.4, 376.1, 662.4, 370.9, 662.4, 366.1, 659.9, 363.6, 657.1, 363.6, 654.6, 365.9, 641.4, 384.1, 640.4, 385.1, 639.6, 384.9, 640.4, 381.1, 644.4, 372.9, 644.4, 370.1, 647.4, 363.9, 647.4, 359.1, 648.4, 357.9, 648.4, 351.1, 644.9, 348.6]], "53.00": [[516.1, 395.6, 514.6, 397.1, 514.6, 399.6, 513.1, 399.6, 511.9, 398.6, 502.1, 399.6, 497.1, 401.6, 495.6, 403.1, 497.1, 405.4, 499.9, 405.4, 501.1, 404.4, 506.9, 403.4, 508.1, 402.4, 510.9, 402.4, 512.1, 403.4, 514.9, 403.6, 515.1, 404.4, 513.1, 404.6, 509.6, 408.1, 509.6, 409.9, 510.6, 411.1, 509.9, 412.6, 502.1, 413.6, 498.9, 415.6, 496.1, 415.6, 493.9, 413.6, 489.1, 414.6, 485.6, 418.1, 486.1, 421.1, 475.6, 431.1, 475.6, 432.9, 474.6, 434.1, 474.6, 468.9, 475.6, 470.1, 475.6, 473.9, 472.6, 477.9, 473.6, 479.9, 476.6, 482.1, 477.6, 484.9, 481.1, 487.4, 487.9, 489.4, 492.1, 493.4, 495.9, 494.4, 498.1, 496.4, 504.9, 498.4, 514.9, 508.4, 520.1, 512.4, 524.1, 514.4, 525.9, 514.4, 533.1, 518.4, 534.9, 518.4, 540.1, 521.4, 542.9, 521.4, 550.1, 524.4, 554.9, 524.4, 556.1, 525.4, 564.9, 525.4, 566.1, 524.4, 571.9, 524.4, 573.1, 523.4, 575.9, 523.4, 578.1, 521.4, 584.1, 518.4, 585.9, 518.4, 589.1, 516.4, 591.9, 516.4, 594.1, 514.4, 601.9, 514.4, 607.9, 511.4, 611.1, 514.4, 612.9, 514.4, 617.6, 518.9, 618.6, 520.1, 618.6, 522.9, 620.1, 524.4, 626.9, 526.4, 628.4, 524.1, 631.4, 521.9, 633.4, 517.1, 629.9, 514.6, 626.1, 513.6, 624.4, 511.9, 623.4, 509.9, 623.4, 506.1, 624.1, 505.4, 627.9, 505.4, 629.9, 504.4, 631.4, 502.9, 631.4, 501.1, 629.9, 499.6, 628.1, 499.6, 624.9, 501.6, 622.1, 500.6, 618.6, 504.1, 618.6, 505.9, 615.9, 508.6, 611.9, 507.1, 611.9, 503.6, 621.4, 491.9, 623.4, 488.9, 623.4, 487.1, 625.9, 484.4, 631.1, 481.4, 632.9, 481.4, 636.1, 478.4, 639.9, 478.4, 641.9, 477.4, 645.4, 473.1, 643.9, 471.6, 637.9, 468.6, 632.1, 467.6, 628.9, 465.6, 617.1, 465.6, 615.9, 466.6, 612.9, 466.6, 610.9, 462.9, 614.9, 462.4, 616.1, 461.4, 623.9, 461.4, 626.1, 459.4, 630.1, 457.4, 631.9, 457.4, 633.4, 455.1, 636.4, 452.9, 633.9, 449.9, 638.9, 448.4, 644.4, 443.9, 644.4, 442.1, 642.9, 440.6, 637.6, 442.6, 635.6, 442.1, 645.1, 436.4, 650.4, 430.9, 650.4, 428.1, 648.9, 426.6, 646.1, 426.6, 634.6, 432.6, 633.6, 431.9, 646.4, 420.1, 649.4, 414.1, 647.9, 412.6, 645.1, 412.6, 643.1, 413.6, 639.9, 416.6, 637.1, 417.6, 633.9, 420.6, 628.1, 423.6, 621.9, 428.6, 617.1, 430.6, 607.9, 436.6, 606.1, 436.6, 602.1, 438.6, 598.9, 441.6, 593.1, 444.6, 586.9, 449.4, 586.4, 447.1, 584.9, 445.6, 579.1, 444.6, 574.9, 442.1, 583.4, 431.9, 583.4, 430.1, 581.9, 428.6, 578.4, 428.6, 577.9, 427.6, 578.4, 426.1, 582.4, 421.9, 584.4, 417.1, 582.9, 415.6, 579.1, 415.6, 571.1, 419.6, 563.9, 424.6, 561.4, 422.9, 561.4, 421.1, 565.4, 416.9, 565.4, 415.1, 563.4, 412.1, 569.4, 404.9, 566.9, 401.6, 564.1, 402.6, 558.9, 406.6, 553.1, 407.6, 549.9, 409.6, 546.1, 410.6, 544.9, 409.6, 543.1, 409.6, 537.1, 401.6, 530.9, 397.6, 529.1, 397.6, 527.9, 396.6, 524.1, 396.6, 522.9, 395.6], [482.1, 410.6, 478.6, 414.9, 475.6, 417.1, 475.6, 422.9, 477.1, 424.4, 478.9, 424.4, 480.4, 422.9, 482.4, 419.1, 487.4, 413.9, 484.9, 410.6]], "53.08": [[534.1, 403.6, 528.9, 407.6, 523.1, 407.6, 521.9, 408.6, 520.1, 408.6, 515.6, 413.1, 516.4, 416.1, 513.9, 417.6, 509.9, 416.1, 510.4, 413.1, 508.9, 411.6, 501.1, 411.6, 499.9, 410.6, 481.1, 411.6, 476.6, 413.9, 474.6, 417.1, 474.6, 454.9, 478.6, 459.9, 475.6, 463.1, 476.1, 468.4, 474.6, 470.1, 474.6, 473.9, 473.9, 474.6, 470.6, 474.9, 469.6, 476.1, 469.6, 478.9, 468.9, 479.6, 467.1, 479.6, 464.9, 477.6, 472.4, 471.9, 472.4, 461.1, 471.4, 459.9, 471.4, 458.1, 469.4, 455.9, 468.9, 453.4, 470.4, 449.9, 470.4, 446.1, 471.4, 444.9, 471.4, 443.1, 468.4, 439.9, 468.4, 432.1, 472.4, 428.9, 472.4, 418.1, 470.9, 416.6, 466.4, 414.9, 466.4, 410.1, 464.1, 408.6, 459.6, 413.1, 458.6, 415.1, 459.4, 418.1, 452.9, 422.6, 449.1, 427.6, 446.4, 429.1, 443.9, 427.6, 441.6, 428.9, 440.6, 430.1, 440.6, 438.9, 437.6, 442.1, 437.6, 446.9, 436.6, 448.1, 436.6, 454.9, 437.6, 456.1, 437.6, 457.9, 442.6, 471.1, 442.6, 475.9, 444.6, 479.9, 451.9, 487.4, 456.4, 490.1, 449.1, 491.6, 445.6, 495.1, 444.6, 497.9, 435.6, 510.1, 435.6, 511.9, 432.6, 514.1, 428.6, 521.9, 425.6, 525.1, 425.6, 526.9, 417.6, 537.1, 417.6, 540.9, 419.1, 542.4, 421.9, 543.4, 431.1, 536.4, 432.4, 534.1, 436.9, 530.6, 437.6, 531.1, 437.6, 533.9, 436.6, 535.1, 436.6, 536.9, 438.1, 538.4, 440.9, 538.4, 448.4, 531.9, 449.4, 529.1, 455.4, 522.9, 457.4, 518.9, 457.4, 517.1, 460.1, 513.4, 461.1, 513.6, 461.6, 514.9, 459.6, 517.1, 459.6, 519.9, 456.6, 525.9, 459.1, 528.4, 460.9, 528.4, 467.4, 521.9, 468.4, 518.1, 471.1, 514.4, 474.9, 515.4, 476.4, 514.1, 477.4, 512.9, 477.4, 511.1, 481.4, 506.9, 481.9, 504.6, 488.1, 510.4, 491.9, 511.4, 499.1, 515.4, 506.9, 517.4, 510.1, 519.4, 513.9, 519.4, 515.1, 520.4, 518.9, 520.4, 519.6, 521.1, 519.6, 522.9, 518.6, 524.1, 517.6, 528.9, 515.6, 532.1, 515.6, 533.9, 511.6, 541.1, 511.6, 542.9, 507.6, 549.1, 507.6, 551.9, 509.1, 553.4, 512.9, 553.4, 514.1, 552.4, 515.9, 552.4, 531.9, 537.6, 532.6, 538.6, 528.6, 546.9, 530.1, 548.4, 531.9, 548.4, 536.9, 545.4, 547.4, 535.1, 549.4, 531.9, 553.4, 527.9, 554.4, 525.1, 558.6, 519.9, 559.6, 520.4, 559.6, 526.9, 557.6, 530.1, 557.6, 532.9, 561.1, 536.4, 562.9, 536.4, 565.4, 533.9, 565.4, 525.1, 566.4, 523.9, 566.4, 519.1, 571.1, 515.4, 572.9, 515.4, 576.1, 517.4, 579.4, 517.9, 579.6, 518.9, 578.6, 520.1, 578.6, 529.9, 580.6, 532.1, 580.6, 533.9, 583.9, 536.4, 586.1, 539.4, 587.9, 539.4, 593.4, 535.9, 593.4, 529.1, 591.9, 527.6, 590.1, 527.6, 588.9, 526.6, 586.4, 522.1, 589.1, 519.9, 592.1, 523.4, 594.1, 524.4, 596.9, 524.4, 600.4, 521.9, 600.4, 519.1, 596.9, 516.6, 592.1, 516.6, 589.9, 518.1, 587.9, 515.6, 585.9, 514.6, 584.4, 512.9, 585.4, 505.1, 590.4, 498.1, 593.4, 495.9, 593.4, 494.1, 597.4, 488.9, 600.1, 483.4, 602.9, 483.4, 604.1, 482.4, 609.9, 482.4, 611.1, 481.4, 612.9, 481.4, 614.4, 479.9, 613.9, 476.6, 615.1, 475.4, 621.9, 473.4, 625.4, 469.9, 625.4, 468.1, 622.9, 465.6, 611.1, 465.6, 607.9, 467.6, 605.1, 467.6, 603.9, 468.6, 596.1, 468.6, 591.1, 464.6, 589.4, 461.9, 581.9, 454.6, 575.9, 451.6, 573.1, 451.6, 568.9, 449.6, 558.9, 450.1, 556.9, 447.6, 553.9, 445.6, 546.1, 442.6, 544.9, 440.9, 548.9, 439.4, 550.4, 437.9, 553.4, 433.9, 553.4, 432.1, 555.4, 429.9, 553.9, 427.6, 548.9, 427.1, 552.4, 421.1, 555.4, 417.9, 555.4, 416.1, 553.9, 414.6, 552.1, 414.6, 541.1, 419.6, 535.9, 423.6, 533.1, 423.6, 531.1, 422.6, 530.6, 420.9, 535.4, 416.9, 535.4, 415.1, 532.9, 412.6, 536.4, 409.1, 538.4, 405.9, 536.9, 403.6]], "53.12": [[511.1, 406.6, 507.9, 408.6, 504.1, 408.6, 498.4, 412.1, 496.1, 411.6, 492.9, 413.6, 487.1, 413.6, 485.1, 414.6, 483.6, 416.9, 486.1, 418.9, 485.4, 420.1, 478.9, 414.6, 477.1, 414.6, 475.6, 416.1, 474.6, 418.1, 474.6, 436.9, 475.6, 438.1, 475.6, 447.9, 477.1, 449.4, 478.9, 449.4, 479.6, 450.1, 480.6, 453.9, 487.1, 459.4, 488.9, 459.4, 490.1, 460.4, 490.9, 460.4, 492.4, 458.1, 485.4, 452.9, 485.4, 450.1, 486.4, 449.4, 489.9, 450.4, 497.1, 456.4, 503.9, 456.4, 507.9, 451.9, 508.6, 452.6, 508.6, 454.9, 504.6, 461.1, 504.6, 462.9, 499.9, 466.6, 498.1, 466.6, 494.9, 468.6, 489.1, 467.6, 484.1, 465.6, 481.4, 463.1, 479.4, 459.9, 476.1, 457.6, 474.6, 459.1, 474.6, 473.9, 473.9, 474.6, 470.9, 474.1, 472.4, 471.9, 472.4, 455.1, 471.4, 453.9, 471.4, 447.1, 470.4, 445.9, 470.4, 442.1, 467.4, 438.9, 467.4, 437.1, 468.4, 435.9, 467.4, 431.1, 471.4, 427.9, 471.4, 424.1, 472.4, 422.9, 471.4, 420.9, 471.4, 417.1, 468.9, 414.6, 461.1, 413.6, 459.9, 414.6, 454.1, 414.6, 452.9, 415.6, 450.1, 415.6, 448.9, 416.6, 436.9, 420.1, 436.4, 419.4, 437.4, 417.9, 437.4, 416.1, 435.9, 414.6, 434.1, 414.6, 432.9, 415.6, 427.6, 422.1, 427.6, 425.9, 426.6, 427.1, 421.6, 431.1, 416.9, 437.6, 415.1, 437.6, 413.6, 439.1, 413.6, 442.9, 410.6, 446.1, 410.6, 450.9, 409.6, 452.1, 409.6, 454.6, 407.1, 454.6, 405.6, 456.1, 405.6, 457.9, 407.1, 459.4, 409.4, 458.9, 411.6, 462.1, 411.6, 464.9, 412.6, 466.1, 412.6, 470.9, 413.6, 472.1, 413.6, 475.9, 416.1, 479.1, 410.1, 480.6, 401.6, 488.9, 398.6, 493.9, 394.6, 498.1, 393.6, 503.9, 395.1, 505.4, 396.9, 505.4, 402.9, 499.4, 409.4, 494.4, 410.1, 495.4, 408.6, 499.1, 408.6, 502.9, 410.1, 504.4, 415.1, 501.4, 417.4, 497.9, 420.9, 494.6, 421.6, 495.6, 420.6, 497.1, 420.6, 500.9, 422.1, 502.4, 423.9, 502.4, 429.4, 497.1, 430.4, 495.1, 431.9, 494.4, 443.1, 500.4, 449.9, 502.4, 455.6, 507.9, 458.1, 511.4, 462.1, 514.4, 465.9, 515.4, 471.1, 518.4, 472.9, 518.4, 476.1, 520.4, 480.9, 521.4, 483.1, 523.4, 486.9, 523.4, 488.1, 524.4, 495.9, 525.4, 497.1, 526.4, 506.6, 526.4, 507.1, 527.4, 503.6, 533.1, 506.1, 536.4, 507.9, 536.4, 511.9, 534.4, 518.9, 527.4, 522.1, 525.4, 523.9, 525.4, 527.1, 523.4, 533.9, 523.4, 535.1, 522.4, 536.9, 522.4, 540.4, 519.9, 545.9, 521.4, 547.1, 522.4, 554.9, 522.4, 557.6, 526.1, 557.6, 528.9, 556.6, 530.1, 556.6, 535.9, 558.6, 539.9, 560.1, 541.4, 561.9, 541.4, 563.1, 540.4, 565.1, 541.4, 568.9, 541.4, 573.4, 535.1, 570.9, 532.6, 568.1, 531.6, 565.4, 527.9, 565.4, 522.1, 567.4, 519.1, 565.9, 517.6, 564.1, 517.6, 559.9, 520.6, 557.9, 520.1, 561.4, 514.9, 561.4, 511.1, 562.4, 509.9, 562.4, 506.1, 561.4, 504.9, 561.4, 503.1, 569.4, 491.1, 573.1, 487.4, 584.9, 486.4, 589.9, 484.4, 591.4, 482.9, 591.4, 480.4, 598.9, 477.4, 602.4, 474.1, 603.4, 472.1, 600.9, 469.6, 592.1, 469.6, 590.9, 468.6, 588.1, 468.6, 586.9, 469.6, 573.1, 470.6, 570.9, 472.6, 569.1, 472.6, 562.9, 467.6, 559.6, 467.6, 558.9, 466.9, 566.9, 465.4, 568.4, 463.9, 568.4, 461.4, 572.9, 461.4, 574.1, 460.4, 577.9, 460.4, 579.1, 459.4, 580.9, 459.4, 583.4, 456.1, 581.9, 454.6, 578.1, 454.4, 578.6, 453.4, 592.9, 453.4, 594.4, 451.9, 593.4, 449.9, 590.9, 447.6, 587.6, 447.6, 586.9, 446.9, 594.9, 446.4, 598.9, 444.4, 600.4, 442.1, 596.9, 438.6, 593.1, 438.6, 591.9, 437.6, 566.1, 437.6, 564.9, 438.6, 557.1, 438.6, 555.9, 439.6, 551.1, 439.6, 549.9, 440.6, 547.1, 440.6, 545.9, 441.6, 541.1, 442.6, 527.1, 450.6, 523.9, 447.6, 521.1, 447.6, 518.9, 445.6, 525.4, 437.1, 528.4, 434.9, 525.9, 431.6, 521.9, 431.1, 527.4, 423.9, 528.4, 420.1, 526.9, 418.6, 521.1, 419.6, 517.1, 421.6, 508.9, 427.6, 507.1, 427.6, 505.4, 425.9, 505.4, 423.1, 507.1, 421.4, 509.9, 421.4, 511.4, 419.9, 511.4, 419.1, 508.4, 416.9, 509.4, 413.1, 513.4, 408.9, 513.4, 408.1]], "53.16": [[533.1, 361.6, 529.6, 365.9, 524.6, 370.1, 524.6, 371.9, 521.6, 377.1, 521.6, 379.9, 515.6, 388.1, 512.6, 394.9, 509.6, 398.1, 507.6, 402.1, 507.6, 403.9, 502.6, 407.9, 499.6, 412.1, 495.6, 420.1, 493.6, 426.9, 489.9, 431.6, 486.9, 432.4, 483.4, 427.9, 483.9, 424.6, 487.9, 425.4, 490.4, 422.9, 490.4, 421.1, 489.1, 419.6, 487.9, 418.6, 486.1, 418.6, 483.4, 420.1, 481.9, 422.6, 479.9, 422.1, 480.9, 420.4, 488.4, 413.9, 486.9, 411.6, 483.1, 411.6, 477.1, 414.6, 474.6, 417.1, 474.6, 427.9, 475.6, 429.1, 476.1, 434.6, 474.6, 437.1, 474.6, 456.9, 476.1, 458.4, 477.9, 458.4, 480.4, 456.1, 482.4, 452.9, 482.4, 443.1, 481.4, 441.9, 481.9, 439.9, 484.6, 442.1, 484.6, 449.9, 483.6, 451.1, 483.6, 457.9, 479.6, 464.1, 479.6, 466.9, 475.6, 470.1, 475.6, 471.9, 473.9, 474.6, 470.1, 474.6, 465.9, 470.6, 462.1, 470.6, 460.1, 469.6, 453.4, 462.9, 450.4, 456.9, 450.4, 453.1, 453.1, 449.4, 454.9, 449.4, 455.6, 450.1, 455.6, 451.9, 457.9, 453.4, 459.4, 451.9, 460.9, 447.9, 464.1, 450.4, 466.4, 448.9, 466.4, 447.1, 467.4, 445.9, 467.4, 431.1, 470.4, 428.9, 470.4, 425.1, 468.9, 422.9, 471.4, 420.9, 471.4, 419.1, 469.9, 417.6, 465.1, 417.6, 460.9, 414.6, 458.9, 415.4, 458.4, 414.4, 459.4, 412.1, 457.4, 408.9, 449.9, 404.6, 448.1, 404.6, 443.9, 402.6, 434.1, 402.6, 432.9, 403.6, 429.1, 403.6, 428.6, 402.9, 429.4, 401.1, 428.4, 399.9, 424.4, 397.9, 423.4, 395.9, 423.4, 391.1, 421.4, 387.1, 418.9, 384.6, 417.1, 384.6, 415.6, 386.1, 415.6, 394.4, 414.9, 395.1, 414.4, 391.1, 413.4, 389.9, 413.4, 387.1, 412.4, 385.9, 411.4, 370.1, 407.9, 366.6, 406.1, 366.6, 404.9, 367.6, 403.6, 369.1, 403.6, 372.9, 402.6, 374.1, 401.6, 387.4, 400.9, 388.1, 400.4, 386.1, 398.9, 384.6, 397.1, 384.6, 395.6, 386.1, 395.6, 388.9, 394.6, 390.1, 394.6, 410.9, 398.4, 413.9, 394.6, 418.1, 394.6, 419.9, 393.6, 421.1, 393.6, 423.9, 395.1, 425.4, 397.4, 423.9, 402.9, 416.4, 411.1, 411.4, 412.4, 409.9, 411.4, 407.1, 413.1, 405.4, 417.1, 403.4, 419.1, 404.6, 417.6, 407.1, 417.6, 408.9, 419.1, 410.4, 421.1, 409.4, 426.9, 409.4, 428.1, 408.4, 436.9, 408.4, 438.1, 409.4, 443.9, 410.4, 453.1, 415.4, 454.9, 415.4, 456.1, 416.4, 458.1, 415.6, 458.6, 417.9, 460.1, 419.4, 462.4, 419.4, 463.1, 420.1, 460.9, 421.6, 459.1, 421.6, 456.9, 419.6, 453.1, 418.6, 449.9, 416.6, 434.1, 416.6, 432.9, 417.6, 430.1, 417.6, 426.9, 419.6, 423.1, 419.6, 421.4, 420.6, 420.4, 419.1, 422.4, 415.9, 422.4, 414.1, 420.9, 412.6, 418.1, 412.6, 405.1, 421.6, 400.6, 428.1, 399.6, 430.9, 393.6, 437.1, 391.6, 440.9, 388.6, 444.1, 387.6, 446.9, 384.6, 450.1, 384.6, 456.9, 385.6, 458.1, 386.6, 469.9, 389.1, 475.6, 388.6, 482.9, 391.6, 487.1, 397.1, 492.4, 401.1, 494.4, 402.9, 494.4, 406.1, 497.4, 412.1, 500.4, 417.9, 501.4, 421.1, 503.4, 422.9, 503.4, 425.6, 507.1, 431.6, 512.1, 432.9, 514.4, 437.1, 517.4, 440.9, 518.4, 444.1, 520.4, 445.9, 520.4, 451.1, 523.4, 454.9, 523.4, 458.1, 525.4, 460.9, 525.4, 466.1, 527.4, 469.9, 527.4, 471.1, 528.4, 485.9, 528.4, 496.1, 524.4, 503.9, 524.4, 510.1, 520.4, 515.9, 519.4, 519.1, 517.4, 521.9, 517.4, 523.1, 518.4, 534.9, 518.4, 540.1, 515.4, 542.4, 512.1, 541.4, 510.9, 541.4, 508.1, 539.4, 503.1, 543.4, 498.9, 547.4, 491.9, 553.1, 488.4, 562.9, 486.4, 565.1, 483.4, 571.1, 480.4, 572.9, 480.4, 576.4, 476.9, 576.4, 474.1, 574.9, 472.6, 570.1, 471.6, 567.9, 469.6, 566.1, 469.6, 559.9, 472.6, 549.1, 473.6, 544.1, 475.6, 539.1, 468.6, 527.9, 459.6, 525.9, 459.1, 529.9, 452.4, 535.9, 449.4, 538.4, 446.9, 536.9, 444.6, 535.1, 444.6, 532.9, 442.9, 536.9, 441.4, 543.4, 435.9, 544.4, 433.1, 542.9, 431.6, 540.6, 431.6, 539.9, 430.9, 547.4, 424.1, 549.4, 420.9, 549.4, 419.1, 547.9, 417.6, 545.1, 417.6, 541.6, 419.6, 540.6, 418.9, 550.4, 405.9, 554.4, 397.9, 551.9, 394.6, 548.1, 395.6, 545.1, 397.6, 538.1, 405.4, 537.4, 404.9, 542.4, 397.9, 543.4, 394.1, 545.4, 391.9, 545.4, 390.1, 547.4, 387.9, 548.4, 384.1, 550.4, 380.9, 551.4, 377.1, 548.9, 374.6, 545.1, 374.6, 543.9, 375.6, 531.6, 392.9, 529.4, 395.1, 528.6, 394.9, 531.4, 388.9, 531.4, 387.1, 533.4, 383.9, 533.4, 382.1, 535.4, 378.9, 535.4, 377.1, 536.4, 375.9, 536.4, 372.1, 537.4, 370.9, 537.4, 364.1, 534.9, 361.6]], "53.20": [[459.1, 411.6, 450.9, 417.6, 447.9, 415.6, 446.1, 415.6, 442.1, 417.6, 439.6, 420.1, 439.6, 421.9, 438.9, 422.6, 433.9, 424.6, 431.1, 424.6, 424.9, 418.6, 406.1, 418.6, 404.9, 419.6, 397.1, 420.6, 384.9, 425.6, 383.4, 424.6, 384.4, 422.1, 382.9, 420.6, 379.1, 422.6, 377.6, 424.1, 377.6, 429.1, 369.6, 436.1, 367.6, 439.1, 367.6, 440.9, 363.6, 445.1, 363.6, 452.9, 365.9, 454.4, 367.4, 452.9, 367.4, 449.6, 368.1, 448.9, 368.6, 457.9, 372.6, 461.1, 372.6, 462.9, 374.1, 464.4, 376.6, 462.9, 377.6, 463.4, 377.6, 467.9, 374.6, 470.1, 374.6, 471.9, 372.9, 473.6, 370.1, 473.6, 365.9, 469.6, 364.1, 469.6, 361.6, 472.1, 361.6, 474.9, 363.6, 479.1, 363.6, 481.9, 367.6, 490.1, 371.1, 493.4, 373.9, 494.4, 381.1, 499.4, 382.9, 499.4, 388.9, 502.4, 391.1, 504.4, 398.9, 506.4, 407.1, 516.4, 421.1, 523.4, 422.9, 523.4, 426.1, 525.4, 427.9, 525.4, 438.1, 529.4, 444.9, 529.4, 446.1, 530.4, 465.9, 530.4, 467.1, 529.4, 470.9, 529.4, 478.1, 526.4, 481.9, 526.4, 485.1, 524.4, 486.9, 524.4, 488.9, 521.4, 490.9, 521.4, 492.1, 522.4, 497.9, 522.4, 499.1, 521.4, 502.9, 521.4, 505.1, 519.4, 506.9, 519.4, 508.1, 518.4, 510.4, 515.9, 510.4, 505.1, 515.4, 500.1, 519.1, 494.4, 526.9, 494.4, 533.1, 490.4, 537.9, 489.4, 539.4, 487.9, 539.4, 485.4, 545.9, 483.4, 550.4, 478.9, 547.9, 475.6, 541.6, 476.1, 539.9, 474.6, 535.1, 474.6, 533.9, 475.6, 531.1, 475.6, 525.9, 477.6, 521.1, 477.6, 518.9, 479.6, 515.1, 479.6, 510.9, 476.6, 508.6, 477.6, 507.9, 477.1, 512.1, 473.4, 515.1, 471.4, 518.9, 470.4, 521.4, 467.9, 519.9, 465.6, 516.9, 465.1, 518.1, 463.4, 521.9, 461.4, 524.4, 458.9, 524.4, 457.1, 522.9, 455.6, 520.6, 455.1, 525.1, 452.4, 531.4, 446.1, 534.4, 441.9, 532.9, 439.6, 530.9, 440.6, 528.1, 440.6, 524.9, 443.6, 523.1, 443.6, 515.6, 447.6, 514.6, 447.1, 529.4, 433.1, 532.4, 427.1, 530.9, 425.6, 528.1, 425.6, 513.9, 435.6, 511.1, 436.6, 499.9, 444.6, 497.1, 445.6, 487.9, 452.6, 477.1, 458.6, 474.6, 462.1, 474.6, 470.9, 475.6, 472.1, 475.6, 474.9, 474.9, 475.6, 472.1, 475.6, 470.9, 473.6, 472.4, 470.9, 472.4, 468.1, 470.9, 466.6, 469.1, 466.6, 467.6, 467.6, 466.6, 467.1, 469.4, 463.9, 469.4, 456.1, 464.9, 451.4, 468.4, 447.9, 467.4, 445.9, 467.4, 443.1, 464.9, 441.1, 467.4, 437.9, 468.4, 430.1, 466.9, 428.6, 464.1, 428.6, 457.9, 433.6, 455.1, 433.6, 451.4, 429.9, 452.1, 428.4, 455.9, 427.4, 458.4, 424.9, 455.9, 421.6, 462.4, 413.9, 460.9, 411.6], [409.1, 404.6, 407.9, 405.6, 401.1, 405.6, 399.9, 406.6, 393.1, 407.6, 389.6, 410.1, 391.1, 412.4, 393.1, 411.4, 395.9, 411.4, 397.1, 410.4, 406.9, 410.4, 408.9, 409.4, 410.1, 410.4, 413.9, 410.4, 415.1, 411.4, 416.9, 411.4, 419.1, 413.4, 421.9, 414.4, 425.1, 417.4, 430.6, 417.4, 430.6, 420.9, 432.1, 422.4, 433.9, 422.4, 436.4, 419.9, 434.9, 417.4, 435.4, 415.1, 428.9, 408.6, 420.9, 404.6]] };

  // ../../src/shots/s17/owl.js
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
    head: { x: 711.6, y: 464.9, r: 40.3, yaw: 0.866, pitch: 0, roll: -0.366, square: 2.1 },
    body: { x: 735, y: 500, a: 56, b: 44, rot: 0.15 },
    tail: { base: [737, 530], dir: [0.1, 1], len: 2, n: 5, spread: 0.8, w: 7 },
    wings: [
      { lead: [[745, 452], [753, 436], [775, 434], [796, 460]], tips: [[800, 484], [792, 484], [783, 479], [773, 473], [763, 467], [754, 461], [748, 456]] },
      { lead: [[695, 487], [670, 503], [648, 525], [630, 543]], tips: [[625, 548], [640, 547], [658, 545], [675, 540], [690, 535], [703, 530], [712, 525]] }
    ],
    // the feet hook over the desk's front edge: long pale toes curling down to y ~545 (source 48.7–50.4)
    feet: [{ palm: [769, 533], heel: [772, 547], toes: [[763, 518], [770, 515], [777, 518]] }, { palm: [795, 520], heel: [800, 531], toes: [[797, 502], [803, 500], [809, 503]], leg: [782, 519] }],
    order: ["farHP", "wing:0", "tail", "body", "wing:1", "head", "nearHP", "foot:0", "foot:1"],
    eyes: { fix: [[722, 456.2, 10.5, 11.2, 727, 453, 2.3], [743, 451, 4, 10, 743.5, 451, 2]], r: 10.9, spread: 0.4, el: -0.18, look: [0.6, -0.6] },
    plasterAt: [725, 426, 14, 4.2, 0.25],
    beak: { pos: [745, 462], az: 0, el: -0.43, lift: 1.05, w: 9.6, l: 11.2, open: 0.5 },
    plaster: { az: 0.25, el: 0.93, w: 14.4, h: 4.4 },
    headphones: { nearAt: [683, 472], open: 1, r: 17, yaw: 0.866, dx: 0, dy: 0.05, lift: 1, bandR: 0.96, bandH: 1.31, tilt: 0.1, cupEl: 0, w: 5.6 },
    tuft: { dx: -36, dy: -8, ang: 3.55, len: 13, n: 3, spread: 0.7 }
  };
  var B = mergePose(A, {
    head: { x: 711.6, y: 463.4, r: 39.7, yaw: 0.873, roll: -0.388 },
    headphones: { nearAt: [683, 471.5], open: 1, r: 17, bandH: 1.3, yaw: 0.873 },
    wings: [
      { lead: [[753, 445], [765, 424], [790, 422], [815, 428]], tips: [[822, 432], [818, 442], [811, 451], [802, 459], [792, 466], [782, 471], [772, 474]] },
      { lead: [[693, 487], [670, 495], [640, 507], [605, 523]], tips: [[597, 527], [605, 534], [620, 537], [637, 538], [660, 537], [685, 532], [700, 527]] }
    ],
    feet: [{ palm: [768, 534], heel: [772, 548], toes: [[762, 520], [768, 517], [776, 519]] }, { palm: [795, 520], heel: [800, 531], toes: [[797, 503], [803, 500], [809, 503]], leg: [782, 519] }],
    eyes: { fix: [[721.6, 456.2, 10.4, 11.2, 726.6, 453.1, 2.3], [743, 450, 4.2, 9.8, 743.5, 449, 1.9]], el: -0.17 },
    plasterAt: [725, 425.5, 14, 4.2, 0.25],
    beak: { pos: [745, 461.5], el: -0.5 }
  });
  var C = mergePose(B, {
    head: { x: 709.9, y: 461.2, r: 40.7, yaw: 0.816, roll: -0.437 },
    headphones: { nearAt: [681, 469], open: 1, r: 17, farAt: [736, 451.6], bandH: 1.35, yaw: 0.816 },
    body: { x: 740, y: 503, a: 56, b: 46, rot: 0.3 },
    tail: { base: [738, 533], dir: [0.1, 1], len: 22, n: 5, spread: 0.8, w: 8 },
    wings: [
      { lead: [[748, 460], [755, 425], [775, 402], [805, 384]], tips: [[809, 381], [815, 395], [810, 410], [808, 425], [803, 440], [795, 452], [785, 462]] },
      { lead: [[700, 485], [670, 482], [630, 485], [590, 492]], tips: [[575, 495], [583, 510], [600, 520], [620, 528], [640, 533], [662, 535], [685, 532]] }
    ],
    feet: [{ palm: [764, 535], heel: [768, 549], toes: [[758, 521], [764, 515], [772, 518]] }, { palm: [796, 520], heel: [800, 531], toes: [[798, 503], [804, 500], [810, 503]], leg: [783, 519] }],
    eyes: { fix: [[720.2, 453.8, 10.2, 11.2, 725, 452.5, 2.3], [743, 445, 4.5, 9.5, 743.5, 443, 1.8]], el: -0.15, look: [0.6, -0.5] },
    plasterAt: [724.5, 421, 18, 4.4, 0.15],
    beak: { pos: [743.5, 460], el: -0.57 }
  });
  var D = mergePose(C, {
    head: { x: 707.6, y: 458.2, r: 42.1, yaw: 0.793, roll: -0.387 },
    headphones: { nearAt: [677, 465], open: 0.94, r: 17, farAt: [747, 444], bandH: 1.45, yaw: 0.793 },
    body: { x: 740, y: 500, a: 52, b: 48, rot: 0.8 },
    tail: { base: [733, 532], dir: [0, 1], len: 36, n: 5, spread: 1.3, w: 8 },
    wings: [
      { lead: [[748, 465], [750, 430], [758, 398], [774, 358]], tips: [[779, 356], [795, 368], [802, 388], [802, 410], [800, 428], [793, 445], [783, 462]] },
      { lead: [[690, 480], [655, 468], [620, 458], [578, 446]], tips: [[572, 445], [572, 470], [588, 494], [606, 510], [632, 522], [660, 527], [690, 527]] }
    ],
    feet: [{ palm: [759, 534], heel: [765, 548], toes: [[751, 522], [758, 517], [766, 520]] }, { palm: [797, 520], heel: [802, 531], toes: [[799, 503], [805, 500], [811, 503]], leg: [784, 518] }],
    eyes: { fix: [[716.5, 450, 11.5, 12, 719.8, 448.8, 2.8], [742, 444, 6, 12, 742, 439.8, 2.3]], r: 11, el: -0.09, look: [0.4, -0.2] },
    plasterAt: [724, 417, 21, 4.6, 0.1],
    beak: { pos: [741, 455], el: -0.44 }
  });
  var E2 = mergePose(D, {
    head: { x: 711.6, y: 447, r: 43.7, yaw: 0.62, roll: -0.395 },
    headphones: { nearAt: [670.5, 460.5], open: 1, r: 17.5, farAt: [745, 432], bandH: 1.39, yaw: 0.62 },
    body: { x: 742, y: 503, a: 50, b: 48, rot: 1.4 },
    tail: { base: [728, 530], dir: [0, 1], len: 40, n: 5, spread: 1.4, w: 9 },
    wings: [
      { lead: [[750, 470], [748, 430], [752, 390], [760, 346]], tips: [[763, 342], [780, 350], [795, 375], [801, 398], [801, 420], [795, 440], [785, 460]] },
      { lead: [[690, 476], [660, 460], [620, 442], [585, 420]], tips: [[580, 417], [574, 450], [582, 470], [600, 484], [620, 504], [645, 514], [675, 520]] }
    ],
    feet: [{ palm: [752, 533], heel: [758, 548], toes: [[746, 520], [754, 513], [762, 516]] }, { palm: [794, 517], heel: [800, 529], toes: [[798, 498], [806, 497], [810, 503]], leg: [780, 514] }],
    eyes: { fix: [[710.5, 441.7, 11.9, 12.5, 713, 440.4, 3.2], [740.7, 430.1, 7.8, 11.5, 740, 428.5, 2.8]], r: 12, el: -0.09, look: [0.2, 0] },
    plasterAt: [724, 406.5, 23, 4.8, 0.12],
    beak: { pos: [737, 447.5], el: -0.52, open: 0.85 }
  });
  var F = mergePose(E2, {
    head: { x: 708.2, y: 436.1, r: 43.3, yaw: 0.462, roll: -0.375 },
    headphones: { nearAt: [671, 448.5], open: 0.8, r: 17.5, farAt: [747, 416], bandH: 1.35, yaw: 0.462 },
    body: { x: 739, y: 498, a: 46, b: 47, rot: 1.5 },
    tail: { base: [722, 530], dir: [-0.1, 1], len: 40, n: 5, spread: 1.6, w: 9 },
    wings: [
      { lead: [[762, 468], [758, 420], [757, 385], [758, 338]], tips: [[758, 332], [777, 340], [792, 362], [802, 388], [803, 415], [795, 440], [785, 460]] },
      { lead: [[690, 470], [655, 450], [620, 428], [590, 405]], tips: [[583, 398], [573, 428], [582, 455], [600, 482], [622, 500], [650, 510], [682, 514]] }
    ],
    feet: [{ palm: [748, 531], heel: [754, 546], toes: [[741, 520], [748, 514], [755, 516]] }, { palm: [792, 514], heel: [797, 524], toes: [[795, 497], [802, 494], [807, 498]], leg: [777, 510] }],
    eyes: { fix: [[707, 432.7, 13, 13.2, 708, 432, 3.8], [738, 420.5, 8, 11.5, 739.5, 420.5, 3.2]], r: 13.5, el: -0.09, look: [-0.15, 0] },
    plasterAt: [719.5, 396.5, 21, 4.8, 0],
    beak: { pos: [733, 440], el: -0.53, open: 0.9 }
  });
  var G = mergePose(F, {
    head: { x: 707.8, y: 426, r: 46, yaw: 0.446, roll: -0.257, pitch: 0.12 },
    headphones: { nearAt: [667.5, 432], open: 0.76, r: 19, farAt: [743, 412], bandH: 1.42, yaw: 0.446 },
    body: { x: 735, y: 485, a: 48, b: 46, rot: 1.5 },
    tail: { base: [718, 520], dir: [-0.1, 1], len: 40, n: 5, spread: 1.6, w: 10 },
    wings: [
      { lead: [[767, 455], [759, 420], [759, 370], [760, 327]], tips: [[760, 322], [777, 325], [793, 348], [803, 377], [805, 405], [800, 428], [790, 445]] },
      { lead: [[690, 460], [655, 440], [620, 415], [590, 380]], tips: [[585, 373], [575, 402], [580, 432], [596, 466], [618, 490], [648, 500], [680, 505]] }
    ],
    feet: [{ palm: [744, 522], heel: [748, 537], toes: [[733, 511], [742, 502], [752, 505]] }, { palm: [789, 507], heel: [795, 518], toes: [[790, 490], [798, 487], [805, 492]], leg: [774, 502] }],
    eyes: { fix: [[704, 419.5, 14, 14.5, 708.3, 418, 4.4], [738.3, 409.7, 8.3, 12.7, 740.8, 408.6, 3.8]], r: 15.5, el: -0.075, look: [0, 0.1] },
    plasterAt: [720, 382, 21, 5, 0.05],
    beak: { pos: [731, 421], el: -0.52, open: 0.95 }
  });
  function shiftWing(K, i, dx, dy) {
    const sh = (p) => [p[0] + dx, p[1] + dy];
    K.wings = K.wings.map((w, j) => j === i ? { ...w, lead: w.lead.map(sh), tips: w.tips.map(sh) } : w);
  }
  shiftWing(D, 0, 1, 6);
  shiftWing(E2, 0, 4, 3);
  shiftWing(F, 0, 2, 3);
  shiftWing(G, 0, 2, 1);
  shiftWing(D, 1, 0, 3);
  shiftWing(E2, 1, 0, 2);
  shiftWing(F, 1, 0, 3);
  var L1 = mergePose(G, {
    head: { x: 713, y: 413, r: 47, yaw: 0.35, roll: -0.2, pitch: 0.05 },
    headphones: { yaw: 0.35 },
    body: { x: 742, y: 478, a: 48, b: 45, rot: 1.5 },
    tail: { base: [725, 512], dir: [-0.3, 1], len: 34, n: 5, spread: 1.4, w: 10 },
    wings: [
      { lead: [[765, 452], [757, 420], [755, 370], [756, 320]], tips: [[756, 315], [778, 321], [796, 344], [807, 373], [805, 405], [798, 430], [787, 452]] },
      { lead: [[690, 455], [655, 440], [620, 410], [595, 378]], tips: [[591, 385], [578, 410], [582, 435], [596, 460], [621, 472], [650, 490], [679, 498]] }
    ],
    feet: [{ palm: [743, 522], heel: [749, 535], toes: [[735, 507], [742, 504], [752, 505]] }, { palm: [791, 504], heel: [795, 518], toes: [[797, 490], [803, 488], [809, 495]], leg: [782, 500] }],
    // measured on 8x grids of the source (52.52): eye rings, pupils, the beak's top (page px)
    eyes: { fix: [[705.5, 418.5, 12.5, 13.5, 707, 418, 3.4], [739.5, 412, 10.5, 12, 741, 410, 3.4]], r: 15, look: [-0.6, -0.6] },
    // (fix pass 1) the plaster rides the crown just under the band (source 52.52: x 712–735, y 378–385)
    plasterAt: [724, 381.5, 23, 4.6, 0.1],
    // (fix pass 1) the band hugs the crown (outer edge at y 363 over x 705) and the near cup sits at (672, 422)
    headphones: { farAt: null, nearAt: [672, 422], open: 0.9, r: 17, bandH: 1.06 },
    beak: { pos: [733, 425] }
  });
  var L2 = mergePose(L1, {
    head: { x: 727, y: 419, r: 48, yaw: 0.35, roll: -0.18, pitch: 0 },
    headphones: { yaw: 0.35 },
    body: { x: 752, y: 482, a: 48, b: 44, rot: 1.6 },
    tail: { base: [735, 512], dir: [-0.2, 1], len: 28, n: 5, spread: 1.3, w: 10 },
    wings: [
      { lead: [[776, 452], [768, 420], [765, 370], [764, 318]], tips: [[763, 313], [783, 322], [805, 355], [817, 391], [812, 420], [800, 440], [790, 455]] },
      { lead: [[700, 460], [665, 440], [630, 410], [612, 375]], tips: [[609, 383], [592, 410], [600, 439], [621, 464], [654, 483], [685, 501], [704, 512]] }
    ],
    feet: [{ palm: [756, 522], heel: [756, 535], toes: [[751, 512], [755, 509], [760, 511]] }, { palm: [799, 507], heel: [802, 518], toes: [[803, 495], [810, 494], [815, 498]], leg: [788, 503] }],
    // (fix pass 1) 52.56 squints: the upper lids come down over the top half of both eyes, the pupils under them
    eyes: { fix: [[720, 424, 13.5, 12.5, 720, 426, 3], [752, 416, 10, 11, 752.5, 415, 3.6]], r: 14, look: [-0.2, 0.05], over: { lid: 0.38 } },
    headphones: { yaw: 0.35, nearAt: [683, 432], bandH: 1.07 },
    plasterAt: [733, 387.5, 23, 4.6, 0.12],
    beak: { pos: [741, 429] }
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
    feet: [{ palm: [764, 532], heel: [764, 546], toes: [[760, 524], [765, 522], [771, 525]] }, { palm: [808, 514], heel: [810, 524], toes: [[818, 506], [824, 507], [829, 511]], leg: [796, 512] }],
    eyes: { fix: [[738, 443, 13, 13, 740, 444, 3.4], [771, 434, 10, 12, 770, 435.5, 3.4]], r: 13, look: [-0.3, 0.1], over: { lid: 0.24 } },
    headphones: { yaw: 0.3, nearAt: [702, 441], bandH: 1.23 },
    plasterAt: [757, 401.5, 24, 4.6, 0.18],
    beak: { pos: [758, 447] }
  });
  var L4X = 20;
  var sh4 = (p) => [p[0] + L4X, p[1]];
  var L4 = mergePose(L3, {
    // (fix pass 1) the source's 52.64 is a smeared downward turn: head centre ~(765, 440), face pitched down, eyes shut
    head: { x: 765, y: 440, r: 47, yaw: 0.05, roll: 0.05, pitch: 0.5 },
    headphones: { yaw: 0.05 },
    body: { x: 772 + L4X, y: 492, a: 62, b: 36, rot: 0.05 },
    tail: { base: sh4([835, 505]), dir: [1, 0.3], len: 14, n: 4, spread: 0.8, w: 10 },
    wings: [
      { lead: [[808, 452], [835, 432], [865, 415], [895, 405]].map(sh4), tips: [[898, 405], [890, 420], [880, 431], [868, 440], [855, 447], [840, 452], [825, 455]].map(sh4) },
      { lead: [[752, 462], [722, 452], [690, 445], [658, 440]].map(sh4), tips: [[655, 441], [662, 453], [672, 463], [684, 471], [698, 477], [712, 480], [726, 480]].map(sh4) }
    ],
    feet: [{ palm: [782, 522], heel: [784, 533], toes: [[776, 512], [781, 510], [787, 512]] }, { palm: [818, 518], heel: [822, 528], toes: [[822, 506], [828, 506], [833, 510]], leg: [806, 515] }],
    eyes: { fix: null, look: [0, 0.6], over: { lid: 1, lidW: 0.15 } },
    plasterAt: [768, 400, 24, 4.6, 0.1],
    beak: { pos: null },
    blur: [10, 1.5]
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
      head: { x: hx - 4, y: hy + 3, r: 46, sx: 1.06, yaw: -0.35, pitch: 0, roll: -0.29, square: 2.1 },
      body: { x: hx + 60, y: hy + 38, a: 58, b: 42, rot: 0.3 },
      tail: { base: rel([106, 56]), dir: [1, 0.55], len: 15, n: 4, spread: 0.7, w: 9 },
      wings: [W(FAR[far]), W(NEAR[near], ns)],
      feet: [
        { x: hx + 98, y: hy + 66, rot: -0.7, size: 14, fat: 0.22, toes: 3, spread: 0.5, curl: 0.6, seed: 2, leg: [-6, -8] },
        { x: hx + 110, y: hy + 60, rot: -0.9, size: 14, fat: 0.22, toes: 3, spread: 0.5, curl: 0.6, seed: 5, leg: [-6, -8] }
      ],
      order: ["farHP", "wing:0", "tail", "body", "foot:0", "foot:1", "head", "nearHP", "wing:1"],
      eyes: { r: 11, spread: 0.4, el: -0.15, look: [-0.8, 0.05] },
      beak: { az: 0, el: -0.45, lift: 1.05, w: 10, l: 11.5, open: 0.85 },
      plaster: { az: 0.1, el: 1, w: 15, h: 4.6 },
      headphones: { yaw: -0.35, dx: 0, dy: 0, lift: 1, r: 17, bandR: 1, bandH: 1.02, tilt: 0.1, open: 1, face: 1, farCup: false, cupEl: 0, w: 5.5 },
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
    [53.08, 480, 447, "DOWN", "BK", 0, 7],
    [53.12, 452, 452, "BACK", "SPK", 0, 7],
    [53.16, 428, 450, "UP", "UP"],
    [53.2, 400, 452, "BMID", "SPK"]
  ];
  var DASH_FACE = {
    52.68: { near: [740, 460, 16], np: [736.4, 458.3, 2.3], far: [712, 462], beak: [722, 476], cup: [777, 441, 20], farLid: 0.6 },
    52.72: { near: [712, 463, 17], np: [703, 462, 2.4], far: [648, 467], beak: [672, 482], cup: [745, 445, 22] },
    52.76: { near: [680, 468, 17], np: [669.7, 465.4, 2.4], far: [628, 468], beak: [650, 487], cup: [712, 450, 22] },
    52.8: { near: [648, 470, 17], np: [640.8, 463, 2.4], far: [594, 468], beak: [620, 484], cup: [680, 452, 22] },
    52.84: { near: [616, 467, 18], np: [612, 460, 2.7], far: [577, 465], beak: [590, 480], cup: [648, 437, 22] },
    52.88: { near: [590, 463, 18], np: [586.2, 458, 2.5], far: [545, 462], beak: [561, 480], cup: [625, 437, 22] },
    52.92: { near: [565, 462, 17], np: [558.4, 458.8, 2.5], far: [523, 466], beak: [540, 482], cup: [600, 440, 23] },
    52.96: { near: [536, 465, 17], np: [530.9, 460, 2.8], far: [492, 474], beak: [515, 488], cup: [572, 440, 22] },
    53: { near: [515, 463, 18], np: [505.8, 459.9, 2.9], far: [474, 468], beak: [495, 486], cup: [548, 440, 22] },
    53.08: { near: [484, 465, 18], np: [475.5, 460, 2.6], far: [453, 468], beak: [468, 490], cup: [514, 442, 23] },
    53.12: { near: [451, 466, 18], np: [447.9, 462.5, 3], far: [422, 468], beak: [440, 492], cup: [484, 447, 23] },
    53.16: { near: [427, 470, 17], np: [420.3, 465.1, 2.8], far: [397, 474], beak: [412, 492], cup: [462, 448, 22] },
    53.2: { near: [398, 468, 18], np: [395.1, 468, 3], far: [370, 470], beak: [386, 490], cup: [440, 447, 22] }
  };
  function dashFace(t) {
    const m = DASH_FACE[t.toFixed(2)];
    if (!m) return {};
    const [nx, ny, nr] = m.near, [fx, fy] = m.far, [cx, cy, cr] = m.cup;
    return {
      eyes: { fix: [[fx + 1, fy, 4.5, 7, fx, fy, 2.4], [nx, ny, nr * 0.95, nr, ...m.np]], ...m.farLid ? { left: { lid: m.farLid } } : {} },
      beak: { pos: m.beak },
      // (fix pass 1: 4x checks at 52.88 / 53.08 put the face-on cup's ring centre 5 px right of these, and the cup is
      // foreshortened to ~0.88 of its height across)
      headphones: { nearAt: [cx + 5, cy + 1], r: cr * 0.98, faceW: 0.88 }
    };
  }
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
  var ONES = [[52.52, L1], [52.56, L2], [52.6, L3], [52.64, L4], ...FLY.map(([t, x, y, n, f, ns, bl2, o]) => [t, flyKey(x, y, n, f, mergePose(dashFace(t), { ...o || {}, ...bl2 ? { blur: [bl2, 0] } : {} }), ns || 0)])];
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
  var MUG = [805, 460, 884, 524];
  function withSil(P, tick) {
    const S = SIL[tick.toFixed(2)];
    if (!S) return P;
    const u = (a) => {
      const o = [];
      for (let i = 0; i < a.length; i += 2) o.push([(a[i] - P.x) / P.s, (a[i + 1] - P.y) / P.s]);
      return o;
    };
    P.silPoly = S.map(u);
    P.silTrace = P.silPoly.slice();
    const [x0, y0, x1, y1] = MUG;
    P.silPoly.push(u([x0, y0, x1, y0, x1, y1, x0, y1]));
    const HU = { "52.68": [735, 462, 44] }[tick.toFixed(2)];
    if (HU) {
      const q = [];
      for (let i = 0; i < 32; i++) {
        const a = i / 32 * Math.PI * 2;
        q.push([HU[0] + Math.cos(a) * HU[2], HU[1] + Math.sin(a) * HU[2]]);
      }
      P.silPoly.push(u(q.flat()));
    }
    return P;
  }
  function owlFrame(t) {
    if (Math.abs(t - 53.04) < 0.01) t = 53;
    if (t >= 52.52 - 1e-6) {
      let k = ONES[0][1], kt = ONES[0][0];
      for (const [tt, p] of ONES) if (tt <= t + 1e-6) {
        k = p;
        kt = tt;
      }
      return withSil(toUnits(k), kt);
    }
    const d = drawingTime(t), P = owlAt(d);
    const W = WINGS[(d < 49.1 ? 48.8 : d).toFixed(2)];
    if (W) {
      const u = (a) => {
        const o = [];
        for (let i = 0; i < a.length; i += 2) o.push([(a[i] - P.x) / P.s, (a[i + 1] - P.y) / P.s]);
        return o;
      };
      P.wingPoly = [W.R ? u(W.R) : null, W.L ? u(W.L) : null];
      const k = Math.max(0, Math.min(1, (d - 50.8) / 0.5));
      P.wingTone = [0.42 * (1 - k), 0];
      if (W.M) P.massPoly = u(W.M);
    }
    return withSil(P, d < 49.1 ? 48.8 : d);
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
      feet: K.feet.map((f) => f.palm ? { palm: u(f.palm), heel: u(f.heel), toes: f.toes.map(u), leg: f.leg ? u(f.leg) : null, w: d(f.w ?? (f.leg ? 2.5 : 3.1)) } : { ...f, x: u([f.x, f.y])[0], y: u([f.x, f.y])[1], size: d(f.size), leg: f.leg ? [d(f.leg[0]), d(f.leg[1])] : null }),
      order: K.order,
      eyes: { fix: K.eyes.fix ? K.eyes.fix.map((e) => [...u([e[0], e[1]]), d(e[2]), d(e[3]), ...u([e[4], e[5]]), d(e[6])]) : null, state: "wide", r: d(K.eyes.r), spread: K.eyes.spread, el: K.eyes.el, look: K.eyes.look, over: { ...ROUND, ...K.eyes.over || {} }, left: K.eyes.left, right: K.eyes.right },
      beak: { ...K.beak, w: d(K.beak.w), l: d(K.beak.l), pos: K.beak.pos ? u(K.beak.pos) : null },
      plasterAt: K.plasterAt ? [...u([K.plasterAt[0], K.plasterAt[1]]), d(K.plasterAt[2]), d(K.plasterAt[3]), K.plasterAt[4]] : null,
      plaster: { ...K.plaster, w: d(K.plaster.w), h: d(K.plaster.h) },
      headphones: { on: true, ...K.headphones, r: d(K.headphones.r), w: d(K.headphones.w), farAt: K.headphones.farAt ? u(K.headphones.farAt) : null, nearAt: K.headphones.nearAt ? u(K.headphones.nearAt) : null },
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

  // ../../src/shots/s17/owlDraw.js
  var { add: add2, sub: sub2, mul: mul2, nrm: nrm2, perp: perp2 } = V;
  var lerpN = (a, b, t) => a + (b - a) * t;
  var TAU2 = Math.PI * 2;
  var blobPath2 = (pts) => (c) => smoothPath(c, pts, true);
  var PPU2 = 1;
  var SPX = 1;
  var wmin2 = (w) => Math.max(w, 0.6 / PPU2);
  var PX = (v) => v / SPX;
  var KEY = 0.44;
  var RIM = 0.56;
  function wingGeom(w) {
    const { lead: L0, tips: T0, cw = 0.42, fw = 1, rmax = 0.62, sub: subd = 0, gap = 1 } = w;
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
      const fo = n === 1 ? 1 : 1 - i / (n - 1);
      f.w = clamp(sp * (fo > 0.5 && gap ? 1.5 : 2), L * 0.16, L * 0.32) * fw;
      trs = add2(trs, nrm2(sub2(f.tip, f.root)));
      Ls += L;
    }
    for (let i = 0; i < n; i++) {
      const f = feathers[i], u = nrm2(sub2(f.tip, f.root));
      let nn = perp2(u);
      const ref = i < n - 1 ? feathers[i + 1].tip : V.mix(f.root, f.tip, 0.5);
      const side = i < n - 1 ? sub2(ref, f.tip) : sub2(feathers[Math.max(0, i - 1)].tip, f.tip);
      if ((nn[0] * side[0] + nn[1] * side[1]) * (i < n - 1 ? 1 : -1) < 0) nn = mul2(nn, -1);
      f.nn = nn;
      f.off = mul2(nn, f.w * (i === 0 ? 0.42 : 0.22));
    }
    const cov = feathers.map((f) => V.mix(f.root, f.tip, cw));
    return { lead, cov, feathers, tr: nrm2(trs), len: Ls / Math.max(1, n) };
  }
  function leaf2(f) {
    const d = sub2(f.tip, f.root), L = V.len(d) || 1, u = mul2(d, 1 / L), n = perp2(u), w = f.w;
    const o = f.off || [0, 0];
    const sh = (q, k) => add2(q, mul2(o, k));
    const P = (a, b, k) => sh(add2(add2(f.root, mul2(u, L * a)), mul2(n, w * b)), k);
    return [P(0, -0.34, 1), P(0.36, -0.5, 0.85), P(0.7, -0.42, 0.55), P(0.9, -0.2, 0.3), f.tip, P(0.9, 0.2, 0.3), P(0.7, 0.42, 0.55), P(0.36, 0.5, 0.85), P(0, 0.34, 1)];
  }
  var area2 = (pts) => {
    let a = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      a += p[0] * q[1] - q[0] * p[1];
    }
    return a;
  };
  function paintWing(g, G2, plu, dl, seed = 1, poly = null) {
    const r0 = rng(300 + seed * 31);
    const fs = G2.feathers.map((f0) => {
      const vw = 0.88 + 0.24 * r0(), vl = 0.94 + 0.06 * r0();
      return { ...f0, w: f0.w * vw, tip: V.mix(f0.root, f0.tip, vl), off: f0.off ? mul2(f0.off, vw) : null };
    });
    const shapes = fs.map((f) => leaf2(f));
    const band = [...G2.lead, ...G2.cov];
    const sgn = Math.sign(area2(shapes[0]) || 1);
    const bandO = Math.sign(area2(band)) === sgn ? band : [...band].reverse();
    const union = poly ? (c) => {
      c.moveTo(poly[0][0], poly[0][1]);
      for (const p of poly) c.lineTo(p[0], p[1]);
      c.closePath();
    } : (c) => {
      for (const sh of shapes) smoothPath(c, sh, true);
      smoothPath(c, bandO, true);
    };
    G2.union = union;
    if (poly) {
      paintWingPoly(g, G2, plu, dl, poly, union, G2.tone || 0);
      return;
    }
    plumage(g, union, { base: 0.97, shade: 0.8, depth: G2.len * 0.22, blur: G2.len * 0.1, ...plu });
    if (dl > 0.3) {
      const covIn = [...G2.cov].reverse();
      softShade(g, union, (c) => {
        const q = sampleCurve(covIn, 3);
        c.moveTo(q[0][0], q[0][1]);
        for (const p of q) c.lineTo(p[0], p[1]);
        for (let k = q.length - 1; k >= 0; k--) c.lineTo(q[k][0] + G2.tr[0] * G2.len * 0.14, q[k][1] + G2.tr[1] * G2.len * 0.14);
        c.closePath();
      }, 0.7, 0.45, G2.len * 0.05);
    }
    for (let i = fs.length - 1; i >= 0; i--) {
      const sh = shapes[i];
      ink3(g, sh.slice(4, 8), PX(0.8), gv(KEY + 0.08, 0.75), { end: 0.1, bias: 0.3 });
      if (i < fs.length - 1) ink3(g, sh.slice(1, 5), PX(0.7), gv(KEY + 0.18, 0.5), { end: 0.1, bias: 0.7 });
    }
    covertArcs(g, G2, dl);
    ink3(g, G2.lead, PX(1), gv(RIM, 0.6), { end: 0.3, bias: 0.4 });
  }
  function covertArcs(g, G2, dl) {
    if (dl <= 0.3) return;
    const covIn = sampleCurve([...G2.cov].reverse(), 4), nA = 4, m = covIn.length;
    for (let j = 0; j < nA; j++) {
      const a = covIn[Math.floor(j * (m - 1) / nA)], b = covIn[Math.floor((j + 1) * (m - 1) / nA)];
      const mid = add2(V.mix(a, b, 0.5), mul2(G2.tr, V.len(sub2(b, a)) * 0.28));
      ink3(g, [a, mid, b], PX(0.85), gv(0.66, 0.55), { end: 0.2 });
    }
  }
  function resampleClosed(poly, step) {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length], L = V.len(sub2(b, a)), n = Math.max(1, Math.round(L / step));
      for (let k = 0; k < n; k++) out.push(V.mix(a, b, k / n));
    }
    return out;
  }
  function inPoly(pt, q) {
    let c = false;
    for (let i = 0, j = q.length - 1; i < q.length; j = i++) {
      const a = q[i], b = q[j];
      if (a[1] > pt[1] !== b[1] > pt[1] && pt[0] < (b[0] - a[0]) * (pt[1] - a[1]) / (b[1] - a[1]) + a[0]) c = !c;
    }
    return c;
  }
  function outlineFeatures(poly) {
    const P = resampleClosed(poly, PX(1)), n = P.length, at = (i) => P[(i % n + n) % n];
    if (n < 20) return { P, notches: [], tips: [] };
    let im = 0;
    for (let i = 1; i < n; i++) if (P[i][0] < P[im][0]) im = i;
    const turn = (i, k2) => {
      const a = at(i - k2), p = at(i), b = at(i + k2);
      return (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0]);
    };
    const cs = Math.sign(turn(im, 3)) || 1;
    const k = 5, D2 = new Array(n);
    for (let i = 0; i < n; i++) {
      const a = at(i - k), b = at(i + k), p = P[i], ab = sub2(b, a), L = V.len(ab) || 1;
      const d = Math.abs(ab[0] * (p[1] - a[1]) - ab[1] * (p[0] - a[0])) / L;
      D2[i] = (Math.sign(turn(i, k)) === cs ? 1 : -1) * d;
    }
    const ext = (sgn, thr) => {
      const out = [];
      for (let i = 0; i < n; i++) {
        const v = sgn * D2[i];
        if (v < thr) continue;
        let best = true;
        for (let j = -4; j <= 4 && best; j++) if (j && sgn * D2[((i + j) % n + n) % n] > v) best = false;
        if (best && !(out.length && i - out[out.length - 1].i < 3)) out.push({ i, p: P[i], d: v });
      }
      return out;
    };
    const dirIn = (i) => {
      const m = V.mix(at(i - 2 * k), at(i + 2 * k), 0.5);
      return nrm2(sub2(P[i], m));
    };
    const notches = ext(-1, PX(1.3)).map((o) => ({ ...o, dir: dirIn(o.i) }));
    const tips = ext(1, PX(1.2)).map((o) => ({ ...o, dir: mul2(dirIn(o.i), -1) }));
    return { P, notches, tips };
  }
  function paintWingPoly(g, G2, plu, dl, poly, union, tone = 0) {
    plumage(g, union, { base: 0.99, shade: 0.84, depth: G2.len * 0.22, blur: G2.len * 0.1, ...plu });
    if (tone > 0) {
      g.save();
      g.beginPath();
      union(g);
      g.clip();
      g.fillStyle = gv(0.72, tone);
      g.fillRect(-5e3, -5e3, 1e4, 1e4);
      g.restore();
    }
    const root = G2.lead[0];
    const F2 = outlineFeatures(poly);
    g.save();
    g.beginPath();
    union(g);
    g.clip();
    if (dl > 0.3) {
      const covIn = [...G2.cov].reverse();
      softShade(g, union, (c) => {
        const q = sampleCurve(covIn, 3);
        c.moveTo(q[0][0], q[0][1]);
        for (const p of q) c.lineTo(p[0], p[1]);
        for (let k = q.length - 1; k >= 0; k--) c.lineTo(q[k][0] + G2.tr[0] * G2.len * 0.14, q[k][1] + G2.tr[1] * G2.len * 0.14);
        c.closePath();
      }, 0.72, 0.35, G2.len * 0.05);
    }
    const cutP = G2.cutPolys || [], inCut = (p) => cutP.some((q) => inPoly(p, q));
    for (const nt of F2.notches) {
      const dr = V.len(sub2(root, nt.p));
      if (dr < PX(10) || inCut(nt.p)) continue;
      let sp = 1e9;
      for (const o of F2.notches) if (o !== nt) sp = Math.min(sp, V.len(sub2(o.p, nt.p)));
      if (sp > 1e8) sp = PX(20);
      const Ls = clamp(1.3 * sp + 1.5 * nt.d, PX(5), Math.min(0.55 * dr, PX(44)));
      const toRoot = nrm2(sub2(root, nt.p));
      const nP = F2.P.length, fwd = (i) => ((i - nt.i) % nP + nP) % nP;
      let tA = null, tB = null;
      for (const tp of F2.tips) {
        const k = fwd(tp.i);
        if (!tA || k < fwd(tA.i)) tA = tp;
        if (!tB || k > fwd(tB.i)) tB = tp;
      }
      let d1 = nt.dir;
      if (tA && tB && tA !== tB && fwd(tA.i) < nP / 3 && nP - fwd(tB.i) < nP / 3) {
        const g0 = sub2(nt.p, V.mix(tA.p, tB.p, 0.5));
        if (V.len(g0) > PX(1.5)) d1 = nrm2(add2(nrm2(g0), mul2(nt.dir, 0.3)));
      }
      const d2 = nrm2(add2(d1, mul2(toRoot, 0.12)));
      const p1 = add2(nt.p, mul2(d1, Ls * 0.5)), p2 = add2(p1, mul2(d2, Ls * 0.5));
      const q = sampleCurve([add2(nt.p, mul2(d1, -PX(0.5))), p1, p2], 6);
      g.save();
      g.filter = `blur(${Math.max(0.4, PX(1.3) * PPU2).toFixed(2)}px)`;
      taper(g, q, (u) => PX(3.2) * (1 - 0.55 * u), gv(0.74, 0.45));
      g.restore();
      taper(g, q, (u) => PX(1.15) * (1 - 0.65 * u), gv(0.46, 0.8));
      taper(g, q.slice(0, Math.ceil(q.length * 0.3)), (u) => PX(1.3) * (1 - 0.8 * u), gv(0.3, 0.85));
    }
    for (const tp of F2.tips) {
      const dr = V.len(sub2(root, tp.p));
      if (dr < PX(18) || inCut(tp.p)) continue;
      const toRoot = nrm2(sub2(root, tp.p)), d1 = tp.dir, d2 = nrm2(add2(d1, mul2(toRoot, 0.5)));
      const L = clamp(0.4 * dr, PX(6), PX(26));
      const s0 = add2(tp.p, mul2(d1, PX(3.5))), s1 = add2(s0, mul2(d1, L * 0.5)), s2 = add2(s1, mul2(d2, L * 0.5));
      ink3(g, [s0, s1, s2], PX(0.65), gv(0.66, 0.7), { end: 0.15, bias: 0.25 });
    }
    covertArcs(g, G2, dl);
    g.restore();
    g.save();
    if (G2.cut) {
      g.beginPath();
      g.rect(-5e3, -5e3, 1e4, 1e4);
      G2.cut(g);
      g.clip("evenodd");
    }
    ink3(g, [...poly, poly[0]], PX(0.9), gv(RIM + 0.06, 0.55), { end: 0.8, per: 2 });
    g.restore();
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
    const { x, y, r = 45, rot = 0, open = 0.85, side = 1, far = false, face: face2 = 0, faceW = 1 } = c;
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    const s = side, fo = clamp(face2, 0, 1);
    const W = r * lerpN(clamp(open, 0.2, 1.2), faceW, fo);
    const lw = wmin2(PX(1.2));
    const cx = -s * W * 0.3 * (1 - fo), crx = W * lerpN(0.68, 1, fo), cry = r;
    if (far) g.fillStyle = gv(0.3);
    else {
      const cg = g.createLinearGradient(crx * 0.7, -cry * 0.7, -crx * 0.7, cry * 0.7);
      cg.addColorStop(0, gv(lerpN(0.5, 0.8, fo)));
      cg.addColorStop(0.55, gv(lerpN(0.5, 0.58, fo)));
      cg.addColorStop(1, gv(lerpN(0.5, 0.32, fo)));
      g.fillStyle = cg;
    }
    g.beginPath();
    g.ellipse(cx, 0, crx, cry, 0, 0, TAU2);
    g.fill();
    if (!far) {
      g.save();
      g.beginPath();
      g.ellipse(cx, 0, crx, cry, 0, 0, TAU2);
      g.clip();
      g.lineCap = "butt";
      const ra = 1 - fo;
      if (ra > 0.02) for (let i = 0; i < 26; i++) {
        const yy = -cry + (i + 0.5) * (2 * cry / 26);
        const hw = crx * Math.sqrt(Math.max(0, 1 - (yy / cry) ** 2));
        g.strokeStyle = i % 2 ? gv(0.56, 0.7 * ra) : gv(0.4, 0.6 * ra);
        g.lineWidth = wmin2(PX(0.7));
        g.beginPath();
        g.moveTo(cx - hw, yy);
        g.lineTo(cx + hw, yy);
        g.stroke();
      }
      g.filter = `blur(${Math.max(0.4, r * 0.18 * PPU2).toFixed(2)}px)`;
      g.fillStyle = gv(0.2, 0.45 * ra);
      g.beginPath();
      g.ellipse(cx + s * crx * 0.1, cry * 0.5, crx * 0.9, cry * 0.5, 0, 0, TAU2);
      g.fill();
      g.filter = "none";
      g.restore();
    }
    g.strokeStyle = gv(lerpN(0.14, 0.24, fo));
    g.lineWidth = lw;
    g.beginPath();
    g.ellipse(cx, 0, crx, cry, 0, 0, TAU2);
    g.stroke();
    const fx = s * W * 0.26 * (1 - fo), frx = W * lerpN(0.68, 0.7, fo), fry = r * lerpN(0.95, 0.7, fo);
    const pg = fo > 0.5 ? g.createLinearGradient(fx + frx, -fry, fx - frx, fry) : g.createLinearGradient(fx - frx, -fry, fx + frx, fry);
    pg.addColorStop(0, gv(far ? 0.45 : lerpN(0.82, 0.8, fo)));
    pg.addColorStop(0.6, gv(far ? 0.36 : lerpN(0.7, 0.6, fo)));
    pg.addColorStop(1, gv(far ? 0.28 : lerpN(0.54, 0.46, fo)));
    g.fillStyle = pg;
    g.beginPath();
    g.ellipse(fx, 0, frx, fry, 0, 0, TAU2);
    g.fill();
    if (!far && fo < 0.5) for (const k of [0.58]) {
      g.strokeStyle = gv(0.5, 0.8);
      g.lineWidth = wmin2(PX(0.6));
      g.beginPath();
      g.ellipse(fx + s * frx * (1 - k) * 0.25, 0, frx * k, fry * k, 0, 0, TAU2);
      g.stroke();
    }
    g.strokeStyle = gv(lerpN(0.16, 0.3, fo));
    g.lineWidth = lw;
    g.beginPath();
    g.ellipse(fx, 0, frx, fry, 0, 0, TAU2);
    g.stroke();
    g.restore();
  }
  function drawFootS(g, f) {
    const { x, y, rot = 0, size = 40, toes = 3, spread = 0.8, curl = 0.4, claw = 0.18, seed = 3, palm = 0.26 } = f;
    const fat = Math.max(f.fat ?? 0.3, 0.3);
    const r = rng(seed);
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.lineCap = "round";
    g.lineJoin = "round";
    const tw = size * fat, ol = wmin2(PX(0.9));
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
      stroke(q, tw * 1.5 + ol * 2, gv(0.55));
      stroke(q, tw * 1.5, gv(0.95));
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
      stroke([e, tip], tw * 0.55 + ol, gv(0.2));
      stroke(q, tw + ol * 2, gv(0.4));
      stroke(q, tw, gv(0.94 - 0.03 * r()));
      for (const k of [0.4, 0.72]) {
        const j = Math.floor((q.length - 1) * k), p = q[j], tt = nrm2(sub2(q[Math.min(q.length - 1, j + 1)], q[Math.max(0, j - 1)])), n = perp2(tt);
        ink3(g, [add2(p, mul2(n, -tw * 0.42)), add2(p, mul2(tt, tw * 0.12)), add2(p, mul2(n, tw * 0.42))], PX(0.6), gv(0.55, 0.6), { end: 0.3 });
      }
    }
    const pr = size * palm;
    g.fillStyle = gv(0.94);
    g.beginPath();
    g.ellipse(0, pr * 0.2, pr * 0.9, pr * 0.75, 0, 0, TAU2);
    g.fill();
    g.restore();
  }
  function clubPath(c, q, hw) {
    const n = q.length, L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = q[Math.max(0, i - 1)], b = q[Math.min(n - 1, i + 1)], t = nrm2(sub2(b, a)), nn = perp2(t), h = hw(i / (n - 1));
      L.push(add2(q[i], mul2(nn, h)));
      R.push(add2(q[i], mul2(nn, -h)));
    }
    const t1 = nrm2(sub2(q[n - 1], q[n - 2])), a1 = Math.atan2(t1[1], t1[0]), h1 = hw(1);
    const t0 = nrm2(sub2(q[1], q[0])), a0 = Math.atan2(t0[1], t0[0]), h0 = hw(0);
    c.moveTo(L[0][0], L[0][1]);
    for (let i = 1; i < n; i++) c.lineTo(L[i][0], L[i][1]);
    c.arc(q[n - 1][0], q[n - 1][1], h1, a1 + Math.PI / 2, a1 - Math.PI / 2, true);
    for (let i = n - 1; i >= 0; i--) c.lineTo(R[i][0], R[i][1]);
    c.arc(q[0][0], q[0][1], h0, a0 - Math.PI / 2, a0 + Math.PI / 2, true);
    c.closePath();
  }
  function clubToe(g, q, hw, ol, fill = 0.95, line = 0.3) {
    g.fillStyle = gv(line);
    g.beginPath();
    clubPath(g, q, (u) => hw(u) + ol);
    g.fill();
    g.fillStyle = gv(fill);
    g.beginPath();
    clubPath(g, q, hw);
    g.fill();
  }
  function drawFootT(g, f) {
    const { palm, heel, toes, leg } = f;
    const ol = wmin2(PX(1));
    const ax = nrm2(sub2(V.mix(toes[0], toes[toes.length - 1], 0.5), palm)), pn = perp2(ax);
    const hd = nrm2(sub2(heel, palm));
    const hq = sampleCurve([palm, add2(V.mix(palm, heel, 0.5), mul2(perp2(hd), PX(0.5))), heel], 4);
    const hw = leg ? (u) => PX(2.3 - 0.2 * u) : (u) => PX(3 - 0.7 * u);
    let palmBlob = null;
    if (leg) {
      const d = sub2(palm, leg), L = V.len(d) || 1, a = Math.atan2(d[1], d[0]), c = V.mix(leg, palm, 0.5);
      g.fillStyle = gv(0.94);
      g.beginPath();
      g.ellipse(c[0], c[1], L * 0.62, PX(4.4), a, 0, TAU2);
      g.fill();
      ink3(g, [add2(leg, V.rot([0, PX(4.6)], a)), add2(c, V.rot([0, PX(4.8)], a)), add2(palm, V.rot([PX(1), PX(3.8)], a))], PX(1), gv(0.32, 0.85), { end: 0.4 });
      clubToe(g, hq, hw, ol);
      palmBlob = [add2(palm, mul2(pn, PX(2.6))), add2(palm, mul2(pn, -PX(2.6)))];
      clubToe(g, palmBlob, () => PX(3), ol);
    } else {
      clubToe(g, hq, hw, ol);
    }
    const n = toes.length;
    const idx = leg ? toes.map((_, i) => i) : toes.map((_, i) => i).sort((p, q) => Math.abs(q - (n - 1) / 2) - Math.abs(p - (n - 1) / 2));
    const marks = [];
    for (const i of idx) {
      const tp = toes[i], k = i - (n - 1) / 2;
      const top = leg ? PX(1.05) : PX(3.1), base = leg ? PX(1.3) : PX(1.7);
      const b = add2(add2(palm, mul2(pn, k * (leg ? PX(1.6) : PX(2.2)))), mul2(ax, leg ? PX(0.8) : PX(0.5)));
      const u = nrm2(sub2(tp, b));
      const e = sub2(tp, mul2(u, top));
      const m = add2(V.mix(b, e, 0.5), mul2(perp2(u), k * PX(0.7)));
      if (leg) {
        let side = perp2(u);
        if (side[0] < 0) side = mul2(side, -1);
        const hk = add2(e, add2(mul2(side, PX(1.6)), mul2(u, -PX(0.8))));
        const q = sampleCurve([b, m, e, hk], 4);
        clubToe(g, q, (s) => base + (top - base) * s, ol);
        const cd = nrm2(add2(mul2(side, 0.5), mul2(u, -1)));
        marks.push(() => taper(g, sampleCurve([hk, add2(hk, mul2(cd, PX(1.8))), add2(add2(hk, mul2(cd, PX(3))), mul2(u, -PX(0.6)))], 3), (s) => PX(1.3) * (1 - 0.85 * s), gv(0.22)));
      } else {
        const q = sampleCurve([b, m, e], 4);
        clubToe(g, q, (s) => base + (top - base) * Math.pow(s, 0.7), ol);
        const nn = perp2(u), r0 = top * 0.5;
        const arc = [];
        for (let j = 0; j <= 8; j++) {
          const a = Math.PI * j / 8;
          arc.push(add2(e, add2(mul2(nn, -Math.cos(a) * r0), mul2(u, Math.sin(a) * r0 - top * 0.1))));
        }
        const pts = [add2(arc[0], mul2(u, -top * 0.6)), ...arc, add2(arc[8], mul2(u, -top * 0.6))];
        marks.push(() => {
          ink3(g, pts, PX(0.8), gv(0.32, 0.85), { end: 0.2, per: 2 });
          g.fillStyle = gv(0.2);
          g.beginPath();
          g.ellipse(...add2(e, mul2(u, -top * 0.5)), PX(0.75), PX(1.2), Math.atan2(u[1], u[0]) + Math.PI / 2, 0, TAU2);
          g.fill();
        });
      }
    }
    g.fillStyle = gv(0.95);
    if (palmBlob) {
      g.beginPath();
      clubPath(g, palmBlob, () => PX(2.1));
      g.fill();
    } else {
      g.beginPath();
      clubPath(g, hq.slice(0, Math.ceil(hq.length * 0.6)), (u) => hw(u * 0.6) - PX(0.1));
      g.fill();
    }
    for (const f2 of marks) f2();
  }
  function drawBandS(g, pts, w, far = false, hc = null) {
    if (pts.length < 2) return;
    const q = sampleCurve(pts, 6);
    const W = Math.min(w, PX(5.2));
    const n = q.map((p, i) => {
      const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)];
      let nn = perp2(nrm2(sub2(b, a)));
      if (hc && nn[0] * (p[0] - hc[0]) + nn[1] * (p[1] - hc[1]) < 0) nn = mul2(nn, -1);
      return nn;
    });
    const line = (off, lw, c) => {
      g.strokeStyle = c;
      g.lineWidth = lw;
      g.lineCap = "butt";
      g.lineJoin = "round";
      g.beginPath();
      q.forEach((p, i) => {
        const x = p[0] + n[i][0] * off, y = p[1] + n[i][1] * off;
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      });
      g.stroke();
    };
    line(0, W, gv(far ? 0.14 : 0.2));
    line(W * 0.08, W * 0.6, gv(far ? 0.3 : 0.38));
    line(W * 0.3, W * 0.28, gv(far ? 0.5 : 0.82));
  }
  function drawSlider(g, a, b, w) {
    const d = nrm2(sub2(b, a)), n = perp2(d), L = V.len(sub2(b, a)), hw = Math.min(w, PX(6)) * 0.62;
    const P = [add2(a, mul2(n, hw)), add2(add2(a, mul2(d, L)), mul2(n, hw * 0.85)), add2(add2(a, mul2(d, L)), mul2(n, -hw * 0.85)), add2(a, mul2(n, -hw))];
    const gr = g.createLinearGradient(...add2(a, mul2(n, -hw)), ...add2(a, mul2(n, hw)));
    gr.addColorStop(0, gv(0.55));
    gr.addColorStop(0.5, gv(0.85));
    gr.addColorStop(1, gv(0.62));
    g.fillStyle = gr;
    g.beginPath();
    P.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
    g.closePath();
    g.fill();
    g.strokeStyle = gv(0.16);
    g.lineWidth = wmin2(PX(1));
    g.stroke();
    for (const k of [0.3, 0.62]) {
      const m = add2(a, mul2(d, L * k));
      ink3(g, [add2(m, mul2(n, hw)), add2(m, mul2(n, -hw))], PX(0.7), gv(0.3, 0.85), { end: 0.6 });
    }
  }
  function drawBeakS(g, b) {
    const { x, y, w = 26, l = 30, rot = 0, turn = 0, open = 0 } = b;
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    const k = clamp(turn, -1, 1), o = clamp(open, 0, 1);
    const tip = [w * 0.06 + k * w * 0.12, l * 0.86];
    const upper = [[-w * 0.46, 0.05 * l], [-w * 0.34, l * 0.42], tip, [w * 0.36, l * 0.4], [w * 0.48, 0.02 * l], [0, -l * 0.1]];
    if (o > 0.02) {
      const y0 = l * 0.3, y1 = l * (0.86 + 0.5 * o), yl = l * (0.86 + 0.28 * o);
      const mouth = [[-w * 0.44, y0], [w * 0.46, y0 - l * 0.02], [w * 0.36, (y0 + y1) * 0.55], [0.05 * w, y1], [-w * 0.36, (y0 + y1) * 0.55]];
      g.fillStyle = gv(0.12);
      g.beginPath();
      smoothPath(g, mouth, true);
      g.fill();
      const lower = [[-w * 0.3, yl], [w * 0.3, yl - l * 0.02], [w * 0.2, yl + l * 0.3 * o], [0.04 * w, yl + l * 0.4 * o], [-w * 0.16, yl + l * 0.3 * o]];
      g.fillStyle = gv(0.82);
      g.beginPath();
      smoothPath(g, lower, true);
      g.fill();
      ink3(g, [lower[4], lower[3], lower[2]], PX(0.8), gv(0.3, 0.85), { end: 0.4 });
      ink3(g, [...mouth, mouth[0]], PX(0.7), gv(0.2, 0.7), { end: 0.5 });
    }
    const up = blobPath2(upper);
    g.save();
    g.beginPath();
    up(g);
    g.clip();
    const bg = g.createLinearGradient(-w * 0.5, 0, w * 0.3, l);
    bg.addColorStop(0, gv(0.93));
    bg.addColorStop(0.6, gv(0.84));
    bg.addColorStop(1, gv(0.7));
    g.fillStyle = bg;
    g.fillRect(-w, -l, w * 2, l * 3);
    g.restore();
    ink3(g, [...upper, upper[0]], PX(0.9), gv(0.32, 0.9), { end: 0.6 });
    g.restore();
  }
  function drawPlaster(g, { x, y, w = 36, h = 11, rot = 0, sx = 1 }) {
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(sx, 1);
    const bow = h * 0.5, pts = [];
    for (let i = 0; i <= 10; i++) {
      const u = i / 10 - 0.5;
      pts.push([u * w, bow * (4 * u * u - 1) * 0.5]);
    }
    const q = pts, n = q.length, top = q.map(([a, b]) => [a, b - h / 2]), bot = q.map(([a, b]) => [a, b + h / 2]).reverse();
    const shape = [...top, ...bot];
    g.beginPath();
    smoothPath(g, shape, true);
    g.fillStyle = gv(0.86);
    g.fill();
    g.strokeStyle = gv(0.38, 0.9);
    g.lineWidth = wmin2(PX(0.9));
    g.stroke();
    g.fillStyle = gv(0.74, 0.8);
    g.beginPath();
    g.ellipse(0, -bow * 0.5, w * 0.16, h * 0.3, 0, 0, TAU2);
    g.fill();
    g.restore();
    void n;
  }
  function drawEyeS(g, e) {
    const { x, y, r, sx = 1, rot = 0, look = [0, 0], pupil = 0.33, lid = 0, ring: ring2 = 1.35 } = e;
    g.save();
    g.translate(x, y);
    g.rotate(rot);
    g.scale(sx, 1);
    g.fillStyle = gv(0.975);
    g.beginPath();
    g.arc(0, 0, r, 0, TAU2);
    g.fill();
    g.save();
    g.beginPath();
    g.arc(0, 0, r, 0, TAU2);
    g.clip();
    let pr = r * pupil, px = look[0] * (r - pr) * 0.92, py = look[1] * (r - pr) * 0.92;
    if (e.pp) {
      const d = V.rot([e.pp[0] - x, e.pp[1] - y], -rot);
      px = d[0] / sx;
      py = d[1];
      pr = e.pr;
    }
    g.fillStyle = gv(0.05);
    g.beginPath();
    g.ellipse(px, py, pr / sx, pr, 0, 0, TAU2);
    g.fill();
    g.fillStyle = gv(0.97, 0.95);
    g.beginPath();
    g.ellipse(px - pr * 0.32 / sx, py - pr * 0.36, Math.max(pr * 0.3, 0.45 / PPU2) / sx, Math.max(pr * 0.3, 0.45 / PPU2), 0, 0, TAU2);
    g.fill();
    if (lid > 0.01 && lid < 0.95) {
      const ly = -r + 2 * r * lid;
      g.fillStyle = gv(0.95);
      g.fillRect(-r * 1.2, -r * 1.2, r * 2.4, ly + r * 1.2);
      ink3(g, [[-r, ly + r * 0.18], [-r * 0.5, ly + r * 0.02], [0, ly - r * 0.02], [r * 0.5, ly + r * 0.02], [r, ly + r * 0.18]], PX(1.3), gv(0.2), { end: 0.3 });
    }
    g.restore();
    if (lid >= 0.95) {
      g.fillStyle = gv(0.95);
      g.beginPath();
      g.arc(0, 0, r * 1.05, 0, TAU2);
      g.fill();
      ink3(g, [[-r * 0.95, r * 0.05], [-r * 0.45, r * 0.32], [0, r * 0.38], [r * 0.45, r * 0.32], [r * 0.95, r * 0.05]], PX(1.5), gv(0.22), { end: 0.25 });
      g.restore();
      return;
    }
    const rw = wmin2(PX(ring2));
    const squint = lid > 0.3;
    if (squint) {
      ink3(g, [[-r * 0.85, r * 0.35], [-r * 0.3, r * 0.62], [r * 0.3, r * 0.62], [r * 0.85, r * 0.35]], PX(1), gv(0.3, 0.85), { end: 0.2 });
    }
    g.beginPath();
    g.ellipse(0, 0, Math.max(0.1, r - rw / 2 / sx), Math.max(0.1, r - rw / 2), 0, 0, TAU2);
    g.restore();
    g.strokeStyle = gv(0.34, squint ? 0.35 : 1);
    g.lineWidth = rw;
    g.stroke();
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
      const e = { x: q.x, y: q.y, nz, side: sd, r: (E3.r ?? 27) * (1 - 0.3 * (1 - nz)), sx: 0.3 + 0.7 * nz };
      const F2 = E3.fix && E3.fix[sd < 0 ? 0 : 1];
      if (F2) Object.assign(e, { x: F2[0], y: F2[1], r: F2[3], sx: F2[2] / F2[3], nz: Math.min(1, 0.3 + F2[2] / F2[3]), pp: [F2[4], F2[5]], pr: F2[6] });
      return e;
    });
    const B2 = P.beak || {};
    const bq = B2.pos ? { x: B2.pos[0], y: B2.pos[1] } : H.P(B2.az ?? 0, B2.el ?? -0.45, B2.lift ?? 1.05);
    const HP = P.headphones || {};
    const hp = HP.on ? headphoneGeom(H, HP) : null;
    if (hp && (HP.farAt || HP.nearAt)) {
      const N = hp.band.length - 1;
      for (const [c, at] of [[hp.cups.find((c2) => c2.z < 0), HP.farAt], [hp.cups.find((c2) => c2.z >= 0), HP.nearAt]]) {
        if (!c || !at) continue;
        const d = sub2(at, [c.x, c.y]);
        c.x = at[0];
        c.y = at[1];
        hp.band.forEach((b, i) => {
          const u = c.sd > 0 ? i / N : 1 - i / N, w = clamp((u - 0.55) / 0.45);
          const k = w * w * (3 - 2 * w);
          b.p[0] += d[0] * k;
          b.p[1] += d[1] * k;
        });
      }
    }
    const all = [...H.out];
    if (body) all.push(...body);
    wings.forEach((G2) => {
      all.push(...G2.lead);
      G2.feathers.forEach((f) => all.push(f.tip));
    });
    if (P.wingPoly) {
      for (const w of P.wingPoly) if (w) all.push(...w);
    }
    if (P.massPoly) all.push(...P.massPoly);
    if (P.silTrace) for (const q of P.silTrace) all.push(...q);
    tail.forEach((f) => all.push(f.tip, f.root));
    (P.feet || []).forEach((f) => {
      if (f.palm) {
        const z2 = f.w * 2;
        for (const p of [f.palm, f.heel, ...f.toes, ...f.leg ? [f.leg] : []]) all.push([p[0] - z2, p[1] - z2], [p[0] + z2, p[1] + z2]);
        return;
      }
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
    const bodyP = body ? blobPath2(body) : null;
    const outsideBody = (fn) => {
      g.save();
      if (bodyP) {
        g.beginPath();
        g.rect(-5e3, -5e3, 1e4, 1e4);
        bodyP(g);
        g.clip("evenodd");
      }
      fn();
      g.restore();
    };
    const painted = [];
    const keyline = (pts, w, soft2, dark, clipOut) => {
      const draw = (col) => ink3(g, pts, w, col, { end: 0.6, per: 3 });
      if (clipOut) clipOut(() => draw(soft2));
      else draw(soft2);
      for (const u of painted) {
        g.save();
        g.beginPath();
        u(g);
        g.clip();
        if (clipOut) clipOut(() => draw(dark));
        else draw(dark);
        g.restore();
      }
    };
    const layers = {
      mass() {
        const polys = P.silTrace || (P.massPoly ? [P.massPoly] : null);
        if (!polys) return;
        const s0 = Math.sign(area2(polys[0]));
        const path = (c) => {
          for (const q0 of polys) {
            const q = Math.sign(area2(q0)) === s0 ? q0 : [...q0].reverse();
            c.moveTo(q[0][0], q[0][1]);
            for (const p of q) c.lineTo(p[0], p[1]);
            c.closePath();
          }
        };
        g.save();
        const feet = (P.feet || []).map((f) => f.palm ? f.palm : [f.x, f.y]);
        if (feet.length) {
          g.beginPath();
          g.rect(-5e3, -5e3, 1e4, 1e4);
          for (const q of feet) {
            g.moveTo(q[0] + PX(16), q[1]);
            g.arc(q[0], q[1], PX(16), 0, TAU2, true);
          }
          g.clip();
        }
        plumage(g, path, { base: 0.95, shade: 0.8, depth: PX(12), blur: PX(5), ...plu });
        g.restore();
      },
      farHP() {
        if (!hp) return;
        for (const sg of hp.segs) if (!sg.front) drawBandS(g, sg.pts, HP.w ?? 13, true, [H.x, H.y]);
        if (HP.farCup !== false) {
          for (const c of hp.cups) if (c.z < -0.02) drawCupS(g, { x: c.x, y: c.y, r: (HP.r ?? 45) * (HP.farR ?? 0.92), rot: H.roll, open: c.open, side: c.side, far: true });
        }
      },
      tail() {
        tail.slice().reverse().forEach((f) => {
          const sh = leaf2(f);
          plumage(g, blobPath2(sh), { base: 0.97, shade: 0.82, depth: f.w * 0.3, blur: f.w * 0.2, ...plu });
          ink3(g, sh.slice(1, 6), PX(0.85), gv(KEY, 0.85), { end: 0.15 });
        });
      },
      body() {
        if (!body) return;
        const b = P.body;
        const at = (u, v) => add2([b.x || 0, b.y || 0], V.rot([b.a * u, b.b * v], b.rot));
        plumage(g, bodyP, { base: 0.975, shade: 0.8, depth: b.a * 0.26, blur: b.a * 0.1, ...plu });
        softShade(g, bodyP, (c) => {
          const q = at(0.1, 0.98);
          c.ellipse(q[0], q[1], b.a * 0.9, b.b * 0.32, b.rot, 0, TAU2);
        }, 0.62, 0.5, b.b * 0.2);
        softShade(g, bodyP, (c) => {
          const q = at(-0.6, 0.55);
          c.ellipse(q[0], q[1], b.a * 0.5, b.b * 0.5, b.rot, 0, TAU2);
        }, 0.64, 0.45, b.b * 0.25);
        softShade(g, bodyP, (c) => {
          const q = at(0.75, 0.3);
          c.ellipse(q[0], q[1], b.a * 0.35, b.b * 0.6, b.rot, 0, TAU2);
        }, 0.66, 0.4, b.b * 0.2);
        if (dl > 0.25) {
          const r = rng(19);
          g.save();
          g.beginPath();
          bodyP(g);
          g.clip();
          for (let i = 0; i < 90; i++) {
            const a = r() * TAU2, d = Math.sqrt(r());
            const q = at(Math.cos(a) * d, Math.sin(a) * d);
            const lower = Math.sin(a) * d;
            if (lower < -0.1 && r() < 0.8) continue;
            flick(g, q, nrm2([0.25 * (r() - 0.5), 1]), b.a * 0.09 * (0.6 + 0.8 * r()), PX(0.8), gv(0.56, 0.32 + 0.25 * Math.max(0, lower)), 0.15);
          }
          const r2 = rng(29);
          for (let i = 0; i < 22; i++) {
            const a = r2() * TAU2, d = 0.35 + 0.6 * Math.sqrt(r2());
            const low = Math.sin(a) * d;
            if (low < -0.2 && r2() < 0.75) continue;
            const c = at(Math.cos(a) * d * 0.9, Math.sin(a) * d * 0.85 + 0.08);
            const L = PX(4 + 6 * r2()), ang = (r2() - 0.5) * 1.2 + (Math.cos(a) > 0 ? 0.35 : -0.35), dir = [Math.cos(ang), Math.sin(ang)];
            const bend = mul2(perp2(dir), L * (0.12 + 0.2 * r2()) * (r2() < 0.5 ? 1 : -1));
            const p0 = add2(c, mul2(dir, -L / 2)), p2 = add2(c, mul2(dir, L / 2)), p1 = add2(c, bend);
            ink3(g, [p0, p1, p2], PX(0.6 + 0.4 * r2()), gv(0.7 + 0.1 * r2(), 0.55 + 0.3 * r2()), { end: 0.15, bias: 0.4 });
          }
          g.restore();
        }
        keyline([...body, body[0]], PX(1.15), gv(RIM, 0.8), gv(0.4, 0.9), null);
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
            ink3(g, sh.slice(0, 4), PX(0.8), gv(KEY, 0.8), { end: 0.2 });
          }
        }
        plumage(g, hpth, { base: 0.975, shade: 0.82, depth: H.ry * 0.3, blur: H.ry * 0.1, keep: [0, H.ry * 0.5], ...plu });
        if (hp) {
          const nc = hp.cups.find((c) => c.z >= 0);
          if (nc) softShade(g, hpth, (c) => c.ellipse(nc.x - nc.side * (HP.r ?? 45) * 0.5, nc.y + 4, (HP.r ?? 45) * 0.45, (HP.r ?? 45) * 1.1, H.roll, 0, TAU2), 0.72, 0.4, 12);
        }
        keyline([...H.out, H.out[0]], PX(1.15), gv(RIM, 0.8), gv(0.36, 0.9), outsideBody);
        if (P.disc ?? 1) {
          const up = V.rot([0, -1], H.roll), rg2 = V.rot([1, 0], H.roll);
          const [eL, eR] = eyes, Rm = (eL.r + eR.r) / 2;
          const vp = add2(V.mix([eL.x, eL.y], [eR.x, eR.y], 0.5), mul2(up, Rm * 1.62));
          const at = (e, a, b) => add2([e.x, e.y], add2(mul2(rg2, e.side * a * e.r * e.sx), mul2(up, b * e.r)));
          for (const e of eyes) {
            if (e.nz < 0.2) continue;
            const brow = [vp, at(e, 0.3, 1.85), at(e, 1, 1.62), at(e, 1.55, 1)];
            const side = [at(e, 1.55, 1), at(e, 1.68, 0.1), at(e, 1.5, -0.9), at(e, 1, -1.6)];
            if (dl > 0.3) {
              g.save();
              g.beginPath();
              hpth(g);
              g.clip();
              g.filter = `blur(${Math.max(0.5, PX(1.4) * PPU2).toFixed(2)}px)`;
              const o = sampleCurve([...brow, ...side.slice(1)], 5);
              g.strokeStyle = gv(0.84, 0.4);
              g.lineWidth = PX(3);
              g.lineCap = "round";
              g.beginPath();
              o.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
              g.stroke();
              g.filter = "none";
              g.restore();
            }
            ink3(g, brow, PX(0.8), gv(0.62, 0.85), { end: 0.2, bias: 0.5 });
            ink3(g, side, PX(0.8), gv(0.64, 0.75), { end: 0.1, bias: 0.2 });
          }
        }
        for (const e of eyes) {
          if (e.nz < 0.12) continue;
          const ov = { ...E3.over || {}, ...e.side < 0 ? E3.left : E3.right };
          const lk = ov.look || E3.look || [0, 0];
          drawEyeS(g, { x: e.x, y: e.y, r: e.r, sx: e.sx, rot: H.roll, look: lk, pupil: ov.pupil ?? 0.33, lid: ov.lid ?? 0, pp: e.pp, pr: e.pr });
        }
        drawBeakS(g, { x: bq.x, y: bq.y, w: (B2.w ?? 26) * 1, l: (B2.l ?? 30) * 0.86, rot: H.roll + (B2.rot ?? 0), turn: B2.turn ?? H.yaw * 1.5, open: B2.open ?? 0 });
        if (P.plasterAt) {
          const [px, py, pw, ph, pr] = P.plasterAt;
          drawPlaster(g, { x: px, y: py, w: pw, h: ph, rot: pr });
        } else if (P.plaster) {
          const pl = P.plaster, q = H.P(pl.az ?? 0, pl.el ?? 0.9, 1);
          if (q.nz > 0) drawPlaster(g, { x: q.x, y: q.y, w: pl.w ?? 36, h: pl.h ?? 11, rot: H.roll + (pl.rot ?? 0), sx: 0.4 + 0.6 * Math.max(0, Math.cos(H.yaw - (pl.az ?? 0))) });
        }
        if (P.freckles !== false) {
          for (const e of eyes) {
            if (e.nz < 0.5 || e.side > 0) continue;
            const c = add2([e.x, e.y], V.rot([-e.side * e.r * 0.2 * e.sx, e.r * 1.45], H.roll));
            g.fillStyle = gv(0.5, 0.7);
            g.beginPath();
            g.arc(c[0], c[1], Math.max(PX(0.9), 0.5 / PPU2), 0, TAU2);
            g.fill();
          }
        }
      },
      nearHP() {
        if (!hp) return;
        for (const sg of hp.segs) if (sg.front) drawBandS(g, sg.pts, HP.w ?? 13, false, [H.x, H.y]);
        for (const c of hp.cups) if (c.z >= -0.02) {
          const R = HP.r ?? 45;
          const b = hp.band, end = V.len(sub2(b[0].p, [c.x, c.y])) < V.len(sub2(b[b.length - 1].p, [c.x, c.y])) ? 0 : b.length - 1;
          const top = add2([c.x, c.y], V.rot([0, -R * 0.95], H.roll)), up = b[end === 0 ? 5 : b.length - 6].p;
          drawSlider(g, top, V.mix(top, up, 0.9), HP.w ?? 13);
          drawCupS(g, { x: c.x, y: c.y, r: R, rot: H.roll + (HP.cupRot ?? 0), open: HP.open ?? c.open, side: c.side, face: HP.face ?? 0, faceW: HP.faceW ?? 1 });
        }
      }
    };
    const cutPath = (c) => {
      if (body) smoothPath(c, body.map((p) => add2(p, mul2(nrm2(sub2(p, [P.body.x || 0, P.body.y || 0])), PX(3)))), true);
      smoothPath(c, H.out.map((p) => add2(p, mul2(nrm2(sub2(p, [H.x, H.y])), PX(3)))), true);
    };
    const cutPolys = [...body ? [body.map((p) => add2(p, mul2(nrm2(sub2(p, [P.body.x || 0, P.body.y || 0])), PX(7))))] : [], H.out.map((p) => add2(p, mul2(nrm2(sub2(p, [H.x, H.y])), PX(7))))];
    wings.forEach((G2, i) => {
      G2.cut = cutPath;
      G2.cutPolys = cutPolys;
      G2.tone = P.wingTone ? P.wingTone[i] : 0;
    });
    wings.forEach((G2, i) => {
      layers["wing:" + i] = () => {
        paintWing(g, G2, plu, dl, i + 1, P.wingPoly ? P.wingPoly[i] : null);
        painted.push(G2.union);
      };
    });
    (P.feet || []).forEach((f, i) => {
      layers["foot:" + i] = () => f.palm ? drawFootT(g, f) : drawFootS(g, f);
    });
    const order = P.massPoly || P.silTrace ? ["mass", ...P.order || ORDER, "keyline"] : P.order || ORDER;
    layers.keyline = () => {
      const polys = P.silTrace;
      if (!polys) return;
      g.save();
      g.beginPath();
      g.rect(-5e3, -5e3, 1e4, 1e4);
      if (hp) {
        for (const c of hp.cups) if (c.z >= -0.02) {
          const R = (HP.r ?? 45) * 1.15;
          g.moveTo(c.x + R, c.y);
          g.ellipse(c.x, c.y, R, R, 0, 0, TAU2, true);
        }
      }
      for (const f of P.feet || []) {
        const q = f.palm || [f.x, f.y], R = PX(15);
        g.moveTo(q[0] + R, q[1]);
        g.arc(q[0], q[1], R, 0, TAU2, true);
      }
      g.clip();
      for (const q of polys) ink3(g, [...q, q[0]], PX(1.3), gv(0.3, 0.85), { end: 0.9, per: 2 });
      g.restore();
    };
    const only = (globalThis.__S17 || {}).only;
    const sil = P.silPoly, clipped = (name) => sil && (name === "body" || name === "head" || name === "tail" || name === "mass" || name.startsWith("wing"));
    const silO = sil ? sil.map((q) => Math.sign(area2(q)) === Math.sign(area2(sil[0])) ? q : [...q].reverse()) : null;
    const silPath = (c) => {
      for (const q of silO) {
        c.moveTo(q[0][0], q[0][1]);
        for (const p of q) c.lineTo(p[0], p[1]);
        c.closePath();
      }
    };
    for (const name of order) {
      if (!layers[name] || only && !only.includes(name)) continue;
      if (clipped(name)) {
        g.save();
        g.beginPath();
        silPath(g);
        g.clip();
        layers[name]();
        g.restore();
      } else layers[name]();
    }
    PPU2 = 1;
    setPPU(1);
    g.setTransform(1, 0, 0, 1, 0, 0);
    return { canvas: cv, x: x0, y: y0, w: x1 - x0, h: y1 - y0, toF, H, eyes, bq, cups: hp ? hp.cups : [] };
  }
  var SCR = null;
  var SCR2 = null;
  var SOFT_PX = 0.35;
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

  // ../../src/shots/s17/steam_data.js
  var STEAM = { "47.84": [[796.9, 460.9, 3.5, 0.1, 796.9, 454.2, 1.2, 0.09, 794.6, 447.6, 1, 0.08, 794.6, 440.9, 2.2, 0.06, 796.8, 434.3, 3.5, 0.03, 796.1, 427.6, 2.8, 0.04, 796, 421, 1.5, 0.01, 796, 414.3, 2.2, 0.01, 795.5, 407.7, 3.5, 0.01, 794.5, 401, 0.8, 0.01, 795, 394.4, 3.5, 0, 796.7, 387.7, 2.2, 0, 796.7, 381.1, 3.5, 0, 796.7, 374.4, 2.5, 0.02, 795.7, 367.8, 3.5, 0.01, 796.7, 361.1, 3.5, 0, 794.7, 354.5, 2, 0, 794.7, 347.8, 0.6, 0, 796.6, 341.2, 3.5, 0, 796.6, 334.5, 3.5, 0, 796.6, 328, 3.5, 0, 796.7, 326.6, 3.5, 0, 797.5, 326.6, 3.5, 0, 804.3, 325.4, 1.5, 0.01, 811.3, 325.9, 1.5, 0.01, 818.2, 326.6, 3.5, 0, 825.2, 326.6, 3.5, 0, 832.1, 324.6, 3.5, 0, 839.1, 324.6, 2.8, 0, 846, 324.6, 2.2, 0, 853, 324.6, 3.5, 0, 859.9, 324.6, 1, 0.02, 866.9, 326.6, 2.8, 0.01, 873.8, 326.6, 3.5, 0, 880.8, 326.6, 3.5, 0, 887.7, 326.6, 2.5, 0, 894.7, 326.6, 3, 0, 901.5, 326.6, 3.5, 0, 902.2, 326.6, 3, 0, 902.1, 326.6, 2.8, 0, 902.4, 333.1, 2.2, 0, 902.1, 339.8, 3.5, 0.01, 902.4, 346.6, 3.5, 0, 902.1, 353.3, 2, 0.02, 902.1, 360.1, 2.2, 0.01, 902.9, 366.8, 3.5, 0.04, 902.1, 373.5, 3, 0.02, 902.1, 380.3, 2.8, 0.05, 902.9, 387, 3.5, 0.07, 902.4, 393.8, 2.5, 0.05, 902.4, 400.5, 2.8, 0.08, 902.9, 407.2, 3.5, 0.07, 904.4, 414, 1.2, 0.08, 904.4, 420.7, 1, 0.09, 904.4, 427.4, 0.8, 0.12, 904.1, 434.2, 1.2, 0.1, 904.4, 440.9, 0.6, 0.08, 902.1, 447.6, 3.5, 0.09, 904.4, 454.4, 3.5, 0.07, 904.1, 461.1, 1.2, 0.07], [816.4, 381.6, 1.2, 0.13, 813.4, 385.1, 0.8, 0.35, 812.2, 388.6, 2, 0.73, 813.1, 390, 2.5, 0.85, 813.7, 391.5, 2.5, 0.77, 815.2, 393.1, 2.2, 0.61, 820.9, 396.8, 2.5, 0.03, 827.7, 397.8, 1.8, 0.41, 830.8, 398.6, 1.5, 0.53, 835.6, 400.3, 2, 0.67, 839.2, 403.3, 2, 0.63, 841.4, 405.3, 2.5, 0.4, 840.8, 408, 2, 0.43, 837.9, 411.9, 1.2, 0.36, 835, 415.5, 1, 0.33, 831.4, 418.3, 1.2, 0.71, 827.1, 421.4, 1.2, 0.6, 822.9, 424.7, 1.2, 0.73, 820.7, 427.7, 1.2, 0.96, 819, 430.8, 1.8, 1, 818.7, 433.3, 1.8, 0.98, 819.2, 435.5, 2, 0.81, 823.7, 440.1, 2.2, 0.36, 827.2, 442.3, 2.2, 0.45, 827.4, 443, 2, 0.38], [824.1, 383.4, 1.2, 0.74, 825.3, 377.9, 1.2, 0.7, 828.5, 373.6, 1.2, 0.98, 833.6, 368.9, 0.6, 0.55, 839.4, 365.6, 1.5, 0.2], [833.4, 461.7, 1.2, 0.45, 836.7, 456.7, 1.2, 0.23, 838.9, 451.9, 1, 0.78, 839, 446.7, 1.8, 0.91, 838.1, 443.9, 2.5, 0.7, 833.3, 439.9, 2.2, 0.67, 829.1, 435.5, 2.2, 0.88, 828.9, 433.8, 2, 0.96, 828.9, 431.9, 1.5, 1, 829.8, 430, 1.5, 1, 832, 427, 1.5, 1, 834.9, 424.7, 1.5, 0.83, 840.5, 421.1, 1.5, 0.38, 846.2, 417.6, 2, 0.21, 849.2, 414.1, 1.5, 0.49, 851.6, 410.4, 1.2, 0.79, 853.6, 404.4, 1.2, 0.25, 853.3, 400.5, 1.8, 0.16, 851.6, 397.5, 1, 0.14]], "47.92": [[794.9, 461.1, 1.2, 0.12, 795.1, 454.5, 3.5, 0.1, 796.8, 447.8, 3.5, 0.06, 795.6, 441.1, 3.5, 0.04, 795.6, 434.5, 3.5, 0.02, 796.1, 427.8, 3.5, 0.02, 794.8, 421.2, 1, 0.05, 795.3, 414.5, 1, 0.01, 795, 407.8, 1.8, 0.02, 795, 401.2, 1.2, 0.02, 796.5, 394.5, 2.2, 0, 796.7, 387.8, 1.2, 0, 796.2, 381.2, 3.5, 0, 796, 374.5, 1.2, 0.01, 796.7, 367.8, 3.5, 0, 795.2, 361.2, 1, 0.01, 794.7, 354.5, 3.5, 0, 796.7, 347.9, 1.2, 0, 795.1, 341.2, 1.2, 0.01, 796.6, 334.5, 3, 0, 796.1, 328, 3.5, 0, 796.1, 326.1, 3.2, 0.01, 797.5, 325.9, 2, 0.01, 804.3, 325.9, 3.2, 0.01, 811.3, 325.9, 3.2, 0.01, 818.2, 325.1, 1.2, 0.01, 825.2, 324.6, 0.6, 0.01, 832.1, 326.6, 3.5, 0, 839.1, 326.6, 2.2, 0, 846, 326.6, 3.5, 0, 853, 324.9, 1, 0.01, 859.9, 326.6, 2.8, 0, 866.9, 326.6, 3.5, 0, 873.8, 326.1, 2.2, 0, 880.8, 326.4, 3.5, 0.02, 887.7, 326.4, 2.5, 0.01, 894.7, 326.6, 2.8, 0, 901.6, 324.9, 3.5, 0, 903.6, 325.5, 1.8, 0.01, 902.6, 332.2, 3.5, 0.01, 902.1, 339, 3.5, 0, 903.9, 345.8, 1.2, 0.01, 904.4, 352.6, 1, 0.02, 903.7, 359.4, 1, 0.01, 903.2, 366.2, 2.2, 0.01, 904.4, 372.9, 1, 0.03, 904.5, 379.7, 0.8, 0.01, 903, 386.5, 3.5, 0.03, 904.2, 393.3, 1.2, 0.05, 904.5, 400.1, 3.5, 0.06, 904.3, 406.9, 2.5, 0.06, 904, 413.6, 3.5, 0.07, 902, 420.4, 3.5, 0.08, 904.3, 427.2, 0.8, 0.09, 904.3, 434, 3.5, 0.1, 902.1, 440.8, 3.5, 0.09, 902.1, 447.6, 3.5, 0.07, 902.6, 454.3, 3, 0.07, 902.1, 461.1, 2.5, 0.03], [816.1, 381.4, 1.2, 0.08, 814.4, 383.8, 2, 0.12, 813.1, 387.3, 2.5, 0.88, 813.9, 388.5, 2.8, 0.83, 816.2, 390.3, 1.8, 0.54, 819.4, 393, 2.2, 0.13, 823.5, 394, 1.8, 0.1, 827.6, 395.6, 1.5, 0.33, 831.8, 396.6, 1.5, 0.54, 837.9, 398.9, 1.8, 0.74, 841.5, 402.6, 3.2, 0.36, 841.6, 403.5, 3.5, 0.33, 841.3, 407.6, 1.8, 0.4, 839.2, 410.6, 1.5, 0.3, 834.1, 414.7, 1.2, 0.6, 828.9, 418.8, 1.5, 0.49, 823.9, 423.1, 1.2, 0.68, 820.2, 429, 1.8, 0.97, 819.8, 431.6, 1.5, 0.91, 820.6, 434.7, 2.5, 0.34, 825.5, 437.9, 2.5, 0.22, 828.4, 440.1, 2.2, 0.4], [825.6, 381.4, 1.2, 0.61, 825.6, 380.9, 1.2, 0.73, 826.6, 376.1, 1.2, 0.51, 829.2, 372.3, 1.2, 0.99, 831.8, 369.6, 1, 0.78, 834.6, 367.1, 1, 0.25, 839.6, 364.1, 1, 0.17], [834.4, 460.7, 1.5, 0.18, 835.3, 457.9, 1.2, 0.41, 839.1, 452.9, 1.2, 0.38, 840.7, 449.1, 1.2, 0.73, 841.1, 445.2, 1.8, 0.88, 839.3, 441.5, 2.2, 0.78, 835.1, 437.5, 2, 0.46, 830.7, 433.7, 2.2, 0.73, 830.1, 432.3, 2, 0.84, 830.3, 430.2, 1.5, 1, 831.3, 427.7, 1.8, 0.93, 835.4, 423.6, 1.5, 0.94, 839.3, 420.7, 1.8, 0.56, 843.7, 418.5, 1, 0.21, 847.7, 415.6, 1.8, 0.24, 851.3, 411.4, 1.2, 0.56, 852.9, 409.1, 1.5, 0.72, 853.9, 406.6, 1.2, 0.78, 854.9, 401.6, 2.5, 0.1, 854.4, 398.5, 1.5, 0.13, 852.4, 396.4, 2.5, 0.08]], "48.00": [[794.6, 460.9, 0.6, 0.12, 794.6, 454.2, 1.5, 0.08, 796.8, 447.6, 3.5, 0.07, 796.8, 440.9, 3.2, 0.02, 794.6, 434.3, 0.8, 0.05, 796.1, 427.6, 2.5, 0.06, 794.6, 421, 3.5, 0.04, 794.5, 414.3, 0.6, 0.01, 795.3, 407.7, 1.5, 0.02, 796.8, 401, 3.5, 0.02, 794.5, 394.4, 0.8, 0.01, 796.7, 387.7, 2.2, 0.01, 795.7, 381.1, 3.5, 0.03, 794.7, 374.4, 0.8, 0.01, 796.7, 367.8, 2.5, 0, 796.4, 361.1, 1, 0.01, 794.9, 354.5, 3, 0, 796.4, 347.8, 2.8, 0.01, 796.6, 341.2, 3.2, 0.01, 796.6, 334.5, 2.2, 0.01, 796.4, 328, 1.5, 0.01, 795.5, 325.6, 2.5, 0.01, 797.5, 326.1, 0.6, 0, 804.3, 326.6, 3.5, 0, 811.3, 324.6, 1, 0.01, 818.2, 325.1, 1.2, 0.01, 825.2, 326.4, 2.8, 0.01, 832.1, 326.6, 3.5, 0, 839.1, 326.6, 2.5, 0, 846, 326.6, 3.5, 0, 853, 324.6, 1.5, 0, 859.9, 324.6, 1.5, 0, 866.9, 326.6, 3, 0, 873.8, 325.1, 1.2, 0.01, 880.8, 325.1, 1.2, 0.01, 887.7, 326.4, 3.5, 0, 894.7, 325.6, 3.5, 0, 901.6, 325.6, 2, 0.01, 902.9, 325.6, 1, 0, 902.1, 326.6, 1.2, 0, 902.1, 333.1, 3.5, 0, 903.1, 339.8, 3.5, 0.01, 902.1, 346.6, 1.8, 0.02, 902.1, 353.3, 2.8, 0.01, 903.9, 360.1, 2, 0.01, 903.4, 366.8, 3.5, 0.01, 902.1, 373.5, 3.5, 0.01, 904.4, 380.3, 3.5, 0.04, 902.1, 387, 2.8, 0.04, 902.4, 393.8, 3.5, 0.06, 904.4, 400.5, 2.5, 0.06, 903.1, 407.2, 3.5, 0.07, 902.1, 414, 3.5, 0.07, 904.1, 420.7, 1.2, 0.09, 902.1, 427.4, 3.5, 0.06, 903.4, 434.2, 2, 0.09, 903.6, 440.9, 3.5, 0.08, 903.1, 447.6, 2.8, 0.07, 903.1, 454.4, 3.5, 0.08, 904.1, 461.1, 3.5, 0.06], [815.9, 381.7, 2, 0.09, 814.3, 385.4, 2, 0.72, 814.8, 387.1, 2.2, 0.93, 816.4, 388.9, 2, 0.71, 820.5, 391.4, 2, 0.21, 824.8, 393.7, 2.8, 0.05, 829.2, 394.7, 1.8, 0.34, 833.6, 395.7, 1.5, 0.46, 838.9, 397.8, 2, 0.76, 843.8, 400.9, 3.5, 0.34], [826.4, 380.2, 1.8, 0.59, 826.4, 379.4, 1.8, 0.66, 827.5, 374.9, 1.2, 0.31, 828.1, 373.1, 1.5, 0.84, 831.5, 369.3, 1.5, 0.71, 835.2, 366.4, 1.2, 0.23, 838.7, 363.4, 2.2, 0.06], [828.8, 438.3, 2, 0.53, 825.5, 436.1, 2.2, 0.23, 822.2, 432.5, 1.8, 0.45, 821.4, 430, 1.8, 0.95, 821.5, 427.8, 2, 0.96, 823.9, 423.4, 1.5, 0.69, 826.1, 421.1, 1.5, 0.58, 830.9, 417.1, 1.5, 0.47, 835.9, 413.3, 1.2, 0.36, 840.5, 409.1, 1.5, 0.27, 843.5, 405.3, 2.2, 0.29, 844.4, 401.5, 3.5, 0.38], [829.3, 438.3, 3.5, 0.51, 831.9, 437.2, 3.5, 0.07, 833, 434.5, 2.8, 0.58, 831.4, 430.4, 2, 0.86, 832.4, 427.5, 1.5, 1, 835.8, 423.4, 1.8, 0.95, 839.9, 420, 1.5, 0.72, 843.1, 417.6, 1.2, 0.3, 848.5, 414.3, 1.5, 0.18, 852, 411.1, 1.2, 0.34, 854.9, 407.4, 1.8, 0.75, 856.4, 402.1, 2, 0.12, 856.4, 399, 1.8, 0.09, 854.9, 396.3, 1.2, 0.16, 854.9, 395.9, 1.8, 0.15], [832.4, 433.5, 1.8, 0.69, 836.7, 437.3, 1.5, 0.59, 841, 441.1, 1.8, 0.87, 842.5, 443.6, 1.8, 0.71, 841.8, 449.8, 1.2, 0.58, 839.3, 454.1, 1.2, 0.21, 836.2, 458.1, 1.5, 0.41, 835.6, 460.8, 1.5, 0.21], [835.3, 444.7, 2.8, 0.15, 835.6, 444.1, 2.5, 0.21, 836.8, 444.3, 2.2, 0.34, 838.2, 449.6, 2, 0.32, 841.5, 449.6, 3.5, 0.52]], "48.08": [[794.6, 460.9, 1.5, 0.15, 795.1, 454.2, 3.5, 0.1, 795.8, 447.6, 3.5, 0.08, 794.6, 440.9, 3, 0.06, 795.8, 434.3, 2.2, 0.06, 796.1, 427.6, 2.8, 0.05, 794.6, 421, 1, 0.03, 796, 414.3, 2.8, 0.04, 795.8, 407.7, 1.5, 0.02, 795.5, 401, 3.5, 0.01, 796, 394.4, 3.5, 0.01, 796.7, 387.7, 2.8, 0.01, 796, 381.1, 3.5, 0, 795.2, 374.4, 1.2, 0.01, 795.9, 367.8, 2, 0.01, 796.7, 361.1, 1.8, 0, 796.7, 354.5, 3.2, 0.01, 794.7, 347.8, 3.5, 0, 796.4, 341.2, 3.2, 0.01, 794.9, 334.5, 3.5, 0.01, 796.6, 328, 3.5, 0.02, 795.9, 325.9, 2, 0.01, 797.5, 326.4, 3.5, 0.01, 804.3, 326.6, 3.5, 0, 811.3, 324.6, 1.2, 0.01, 818.2, 326.4, 3, 0.02, 825.2, 326.4, 2.2, 0.01, 832.1, 324.6, 3.5, 0, 839.1, 326.1, 3.2, 0.01, 846, 326.6, 3.2, 0, 853, 324.6, 3, 0, 859.9, 326.6, 2.2, 0.01, 866.9, 326.6, 3.2, 0.01, 873.8, 326.6, 3.5, 0, 880.8, 326.6, 2.2, 0, 887.7, 324.9, 1, 0, 894.7, 325.6, 1.8, 0, 901.5, 326.6, 1.2, 0.01, 902.5, 326.2, 3.5, 0.01, 902.1, 326.6, 3.5, 0.01, 902.1, 333.1, 3.5, 0.01, 904.4, 339.8, 3.2, 0, 902.1, 346.6, 2.2, 0, 902.1, 353.3, 3.5, 0.02, 903.9, 360.1, 2, 0.02, 903.9, 366.8, 1.2, 0.01, 902.1, 373.5, 2.5, 0.01, 902.1, 380.3, 3.5, 0.03, 902.1, 387, 3.5, 0.04, 902.1, 393.8, 3, 0.04, 903.9, 400.5, 2, 0.08, 904.4, 407.2, 3, 0.07, 904.4, 414, 1.2, 0.08, 903.1, 420.7, 3.5, 0.06, 904.4, 427.4, 3.5, 0.07, 904.4, 434.2, 3.5, 0.08, 904.1, 440.9, 3.5, 0.08, 903.9, 447.6, 3, 0.07, 904.4, 454.4, 1.8, 0.06, 904.4, 461.1, 1, 0.04], [814.9, 384.1, 2.2, 0.68, 817.1, 387.3, 2, 0.6, 823.1, 390.6, 1.5, 0.13, 826.6, 391.9, 1.8, 0.11, 830.1, 392.7, 1.8, 0.35, 835.6, 393.9, 1.2, 0.52, 840.3, 396, 1.5, 0.79, 841.9, 397.2, 1.5, 0.62, 845.4, 399.8, 3.5, 0.35, 844.8, 402.8, 3.2, 0.3, 842.6, 405.9, 1.5, 0.31, 840.2, 408.7, 1.5, 0.13, 837.7, 411.6, 1.8, 0.15, 833.5, 414.1, 1.5, 0.4, 829.8, 417.2, 1.2, 0.33, 827.2, 419.5, 1.5, 0.43, 824.7, 422, 1.5, 0.67, 823.5, 423.2, 1.8, 0.77, 821.8, 427.7, 2.2, 0.91, 822.3, 430.3, 2, 0.65, 825.1, 434.1, 2, 0.21, 828.2, 436.3, 2, 0.37, 831.4, 438.1, 2, 0.39, 835.6, 440.3, 1.8, 0.13, 837.7, 442.3, 2, 0.26, 838.5, 444.6, 2, 0.39, 838.9, 449.4, 1.8, 0.35], [827.4, 377.9, 1.5, 0.54, 828.9, 371.7, 1.5, 0.58, 830.8, 369, 1.5, 0.7, 834.4, 365.6, 2, 0.22], [836.4, 460.4, 1.5, 0.27, 837, 457.6, 1.8, 0.39, 839.9, 453.6, 1.8, 0.17, 842.7, 449.5, 1.8, 0.51, 843.7, 445.1, 1.5, 0.66, 843.4, 443.7, 1.8, 0.82, 842.4, 441.4, 1.8, 0.9, 841.8, 440.4, 1.8, 0.91, 837.4, 435.9, 1.2, 0.55, 832.9, 431.5, 2, 0.8, 832.3, 429.8, 1.8, 0.91, 832.6, 427.2, 1.8, 1, 833.6, 425.5, 2, 0.97, 836.4, 422.4, 1.8, 0.89, 839.5, 419.6, 1.5, 0.92, 844.7, 415.9, 1.2, 0.19, 850.3, 412.7, 1.5, 0.15, 854.5, 407.5, 1.8, 0.6, 856.7, 402.3, 2, 0.57, 857, 399.9, 2, 0.12, 857.1, 397.3, 1.8, 0.12, 855.4, 393.5, 1.5, 0.1]], "48.16": [[796.1, 460.9, 2, 0.16, 796.9, 454.2, 2.8, 0.1, 794.6, 447.6, 0.8, 0.08, 794.6, 440.9, 3.5, 0.05, 796.8, 434.3, 3.5, 0.03, 794.6, 427.6, 3, 0.03, 794.6, 421, 0.8, 0.02, 796, 414.3, 3.5, 0.04, 794.5, 407.7, 1.5, 0.02, 794.5, 401, 2.8, 0.01, 794.5, 394.4, 0.8, 0.01, 794.7, 387.7, 0.6, 0.01, 794.7, 381.1, 0.8, 0.03, 796.7, 374.4, 1.5, 0.01, 794.7, 367.8, 0.6, 0, 796.7, 361.1, 3.5, 0.01, 796.7, 354.5, 3.2, 0.01, 795.4, 347.8, 3.5, 0.01, 795.6, 341.2, 3.5, 0.01, 796.6, 334.5, 2.8, 0.01, 794.6, 327.9, 3, 0, 796.7, 326.6, 2.8, 0, 797.5, 326.6, 2.2, 0, 804.3, 326.6, 3.2, 0, 811.3, 325.1, 1.5, 0.01, 818.2, 325.6, 2.5, 0.02, 825.2, 326.6, 3.5, 0.02, 832.1, 326.6, 3.5, 0, 839.1, 324.6, 3.5, 0.01, 846, 325.4, 1.8, 0.01, 853, 324.6, 0.8, 0.02, 859.9, 326.4, 2.2, 0, 866.9, 326.1, 3.2, 0.02, 873.8, 326.6, 3.5, 0, 880.8, 326.6, 3.2, 0.01, 887.7, 325.1, 1.5, 0.01, 894.7, 324.6, 3, 0.01, 901.5, 326.6, 3.5, 0.01, 903.1, 325.4, 1.2, 0.01, 903.4, 326.4, 3.5, 0.01, 902.9, 333.1, 2.2, 0.01, 903.6, 339.8, 3.5, 0, 903.6, 346.6, 3.5, 0, 902.1, 353.3, 3, 0.01, 904.3, 360.1, 3.5, 0, 904.3, 366.8, 3.5, 0.01, 904.3, 373.5, 0.8, 0.02, 902, 380.3, 3.5, 0.03, 903.8, 387, 3.5, 0.06, 903.8, 393.7, 3.5, 0.02, 904.5, 400.5, 3.5, 0.08, 904, 407.2, 2.5, 0.06, 903.5, 414, 3.5, 0.06, 904.2, 420.7, 2.8, 0.1, 902.4, 427.4, 3.5, 0.1, 901.9, 434.2, 3.5, 0.06, 903.9, 440.9, 2, 0.08, 903.9, 447.6, 2.5, 0.07, 903.4, 454.4, 2.2, 0.06, 903.1, 461.1, 2, 0.08], [823.8, 389.4, 1, 0.13, 828.4, 390.8, 1.5, 0.19, 833.2, 391.5, 1.5, 0.28, 837.8, 392.9, 1.2, 0.72, 841.5, 394.6, 1.8, 0.74, 845.9, 398.4, 3.5, 0.36], [827.6, 376.4, 1.8, 0.37, 828.7, 372.2, 1.8, 0.13, 828.9, 370.1, 1.8, 0.51, 832.1, 366.8, 1.2, 0.57, 835.6, 363.5, 2, 0.11], [845.9, 398.4, 2.8, 0.36, 844.9, 402.7, 2.5, 0.31, 842.3, 406.4, 2, 0.25, 839.6, 409.1, 2, 0.14, 835.7, 412.1, 1.5, 0.31, 831.8, 415.1, 1.5, 0.34, 827.9, 418, 1.5, 0.37, 825.1, 420.6, 1.5, 0.63, 823.3, 423.7, 2, 0.86, 822.5, 426.4, 1.8, 0.91, 822.7, 428.5, 1.5, 0.87, 824.8, 431.7, 1.8, 0.23, 827.9, 434.8, 2, 0.34, 831, 436.9, 1.8, 0.66, 834.4, 438.5, 2, 0.09, 838.1, 442, 2.2, 0.29, 839.6, 445.1, 1.8, 0.43, 839.4, 448.9, 2, 0.37], [836.6, 460.4, 1.5, 0.25, 837.7, 457, 1.5, 0.29, 841.1, 452.6, 1.8, 0.27, 843.3, 448.8, 1.5, 0.55, 844.7, 443.6, 1.8, 0.76, 843.9, 441, 2, 0.81, 842.9, 439.5, 1.8, 0.86, 838.3, 435.2, 1.5, 0.67, 834.1, 430.5, 2, 0.86, 833, 428.8, 2.2, 0.98, 833.3, 426.2, 2.2, 1, 833.9, 425.1, 1.8, 1, 836.8, 421.4, 2, 0.96, 840.4, 418.4, 2, 0.74, 844.7, 415.9, 1.5, 0.35, 849.1, 413.6, 3.5, 0.08, 852.5, 410.2, 1.8, 0.23, 855.3, 406.4, 1.5, 0.53, 856.9, 403.8, 1.8, 0.7, 858, 399.6, 2, 0.18, 858.6, 397.4, 2.2, 0.11, 858.1, 395.1, 3.2, 0.08]], "48.24": [[794.6, 460.9, 0.6, 0.24, 796.9, 454.2, 2.5, 0.08, 795.3, 447.6, 3.5, 0.1, 795.1, 440.9, 3.5, 0.07, 795.8, 434.3, 2.5, 0.05, 794.6, 427.6, 0.6, 0.03, 796.8, 421, 2.8, 0.02, 796, 414.3, 3, 0.02, 795, 407.7, 1.8, 0.03, 794.5, 401, 1, 0.01, 794.5, 394.4, 0.8, 0.01, 794.7, 387.7, 0.6, 0.01, 795.2, 381.1, 1.2, 0.01, 795.2, 374.4, 3.5, 0.01, 794.7, 367.8, 3.5, 0.01, 795.4, 361.1, 3.5, 0, 795.4, 354.5, 3.5, 0, 795.7, 347.8, 3.5, 0.01, 796.4, 341.2, 3, 0.01, 796.4, 334.5, 1.2, 0.01, 796.6, 328, 3.5, 0.01, 796.7, 326.6, 2.2, 0.01, 797.4, 324.6, 0.6, 0.01, 804.3, 326.6, 3.5, 0.01, 811.3, 326.6, 3.5, 0, 818.2, 325.9, 2.2, 0, 825.2, 324.9, 3.5, 0, 832.1, 326.6, 3.2, 0, 839.1, 326.6, 3.2, 0.01, 846, 326.4, 3.5, 0, 853, 326.1, 2.8, 0.03, 859.9, 326.1, 2.2, 0, 866.9, 324.9, 2, 0.01, 873.8, 326.6, 1.5, 0, 880.8, 326.6, 3.5, 0.01, 887.7, 324.6, 1.2, 0.02, 894.7, 325.1, 1.2, 0.01, 901.6, 324.6, 0.6, 0.02, 903.1, 325.4, 2, 0.01, 903.9, 326.4, 1.5, 0.01, 903.9, 333.1, 2.8, 0.01, 902.4, 339.8, 3.2, 0.01, 902.1, 346.6, 1.8, 0.01, 904.4, 353.3, 2, 0.02, 902.6, 360.1, 3.5, 0, 902.1, 366.8, 3, 0.02, 902.6, 373.5, 3.5, 0.02, 902.4, 380.3, 3, 0.02, 903.4, 387, 3.5, 0.03, 904.4, 393.8, 0.6, 0.03, 904.4, 400.5, 1, 0.06, 902.9, 407.2, 3, 0.08, 902.1, 414, 2.5, 0.07, 902.1, 420.7, 3, 0.05, 902.1, 427.4, 1.8, 0.06, 903.6, 434.2, 3.2, 0.09, 904.4, 440.9, 1.5, 0.08, 904.4, 447.6, 2.2, 0.07, 904.4, 454.4, 2.5, 0.06, 902.9, 461.1, 2.5, 0.05], [823.9, 386.9, 1.2, 0.12, 827.5, 388, 2, 0.1, 831.1, 389.2, 1.8, 0.36, 834.6, 389.5, 1.5, 0.43, 839.9, 391.9, 1.8, 0.76, 843, 393.9, 2, 0.56, 846, 396.2, 3.5, 0.31], [827.9, 374.6, 2.2, 0.33, 828.1, 373.8, 2, 0.37, 829.6, 368.7, 1.5, 0.43, 832.2, 365.3, 1.5, 0.55, 834.8, 362.8, 2, 0.13], [836.9, 460.7, 2, 0.21, 837.8, 456.9, 1.8, 0.48, 841.6, 452, 2, 0.29, 843.8, 448.3, 2, 0.52, 845.1, 442.3, 1.8, 0.76, 844.5, 440.5, 2, 0.84, 843.9, 439, 2, 0.85, 839, 434.1, 1.8, 0.66, 834.3, 429, 2, 0.85, 833.7, 427.8, 1.8, 1, 833.5, 425.5, 2, 0.97, 835.5, 421.6, 2, 0.93, 838.8, 418.5, 1.8, 0.89, 842.9, 415.3, 1.8, 0.51, 847.3, 412.5, 1.8, 0.12, 851.8, 409.7, 1.8, 0.16, 856.2, 404.2, 2, 0.56, 857.2, 402.3, 2, 0.7, 858.9, 396.4, 2.2, 0.11, 858.8, 394.3, 3, 0.1, 856.2, 390.8, 2.5, 0.09], [839.6, 448.6, 1.8, 0.43, 839.9, 444.1, 2, 0.46, 839.3, 442.4, 1.8, 0.45, 836.4, 438.4, 3.5, 0.13, 832.3, 436.2, 1.8, 0.58, 828.4, 433.8, 2, 0.35, 824.9, 430.6, 1.8, 0.26, 823.1, 427.8, 1.8, 0.73, 822.9, 424.2, 2, 0.87, 824.8, 420.3, 1.8, 0.67, 827.6, 416.9, 1.8, 0.39, 831.8, 413.7, 1.2, 0.29, 835.8, 410.3, 2, 0.21, 840.1, 407.3, 2.2, 0.12, 843.8, 403.4, 2, 0.27, 846.1, 400, 2.5, 0.27, 846.6, 396.7, 3.5, 0.32]], "48.32": [[794.6, 460.9, 0.6, 0.17, 796.4, 454.2, 3.5, 0.1, 796.1, 447.6, 3.5, 0.07, 794.6, 440.9, 0.8, 0.04, 796.8, 434.3, 3.5, 0.03, 796.8, 427.6, 3, 0.05, 796.8, 421, 2.5, 0.03, 794.8, 414.3, 1.5, 0.04, 796.8, 407.7, 2.8, 0.02, 796, 401, 2, 0.01, 796.7, 394.4, 3.5, 0.01, 796.7, 387.7, 2.5, 0.01, 794.7, 381.1, 2, 0.01, 796.7, 374.4, 3, 0, 796.7, 367.8, 3.5, 0, 796.7, 361.1, 3.5, 0, 796.7, 354.5, 2.5, 0.01, 796.7, 347.8, 3.5, 0, 795.6, 341.2, 3.5, 0.01, 796.6, 334.5, 3.5, 0.01, 795.4, 327.9, 3.5, 0.01, 795.7, 325.8, 3.5, 0.01, 797.4, 324.6, 3.5, 0.01, 804.3, 324.6, 3.5, 0, 811.3, 325.1, 2.5, 0, 818.2, 325.4, 1.8, 0.01, 825.2, 324.6, 2.2, 0, 832.1, 326.6, 2.8, 0, 839.1, 326.6, 2.5, 0, 846, 326.6, 2.5, 0, 853, 324.6, 1, 0.03, 859.9, 326.6, 3, 0.01, 866.9, 325.9, 3.5, 0, 873.8, 326.6, 3.5, 0.01, 880.8, 326.6, 2.2, 0.01, 887.7, 325.4, 3.5, 0.02, 894.7, 326.6, 3.5, 0.01, 901.6, 326.1, 3.5, 0.01, 902.2, 326.6, 3, 0.01, 902.1, 326.6, 2.8, 0.01, 902.4, 333.1, 1.8, 0.01, 903.6, 339.8, 1.8, 0.01, 903.6, 346.6, 3.5, 0.01, 903.1, 353.3, 3.5, 0, 904.4, 360.1, 1, 0.02, 904.1, 366.8, 2.5, 0.01, 902.6, 373.5, 2.8, 0.01, 902.1, 380.3, 3.5, 0.04, 902.1, 387, 3.5, 0.02, 904.4, 393.8, 1, 0.03, 904.4, 400.5, 1, 0.06, 904.4, 407.2, 1.2, 0.05, 902.1, 414, 3.5, 0.07, 904.4, 420.7, 1, 0.06, 904.4, 427.4, 3.5, 0.07, 904.4, 434.2, 3.5, 0.07, 904.4, 440.9, 3.5, 0.08, 904.4, 447.6, 2.5, 0.06, 903.1, 454.4, 3.5, 0.04, 902.1, 461.1, 3.5, 0.08], [824.8, 385.9, 1.2, 0.13, 828.2, 386.7, 1.8, 0.11, 831.6, 387.8, 1.8, 0.3, 834.8, 388.7, 1.8, 0.38, 839.3, 389.7, 1.8, 0.69, 842.2, 391.2, 1.8, 0.73, 846.5, 394, 3.5, 0.27], [828.1, 372.8, 2, 0.34, 829.5, 367.1, 2, 0.43, 831.6, 364.1, 1.5, 0.5, 833.7, 361.1, 1.2, 0.12], [837.1, 460.4, 1.8, 0.22, 838.1, 457, 2, 0.55, 841.8, 451.6, 1.8, 0.25, 844.3, 448, 1.8, 0.5, 846, 443.9, 2, 0.69, 845.6, 440.9, 2, 0.75, 844.9, 439.4, 1.5, 0.82, 843, 437, 1.8, 0.85, 838.8, 432.6, 1.8, 0.66, 834.6, 428.2, 2, 0.86, 833.9, 426.5, 2, 1, 833.8, 424.5, 2.2, 0.98, 835.3, 421.5, 2, 1, 839.1, 417.5, 1.8, 0.83, 843.6, 414, 1.8, 0.5, 848.1, 410.8, 2.5, 0.09, 852.9, 407.7, 1.5, 0.16, 856, 403.6, 1.8, 0.47, 858.6, 398.8, 1.8, 0.65, 858.4, 396.4, 2.5, 0.11, 858.5, 393, 2.2, 0.1, 856.6, 389.8, 2.5, 0.15], [839.9, 448.4, 1.8, 0.49, 840.2, 442.9, 1.8, 0.57, 839.3, 441.3, 2.2, 0.46, 835.8, 437.8, 3.5, 0.12, 831.9, 435, 1.8, 0.64, 829.1, 433.6, 1.8, 0.43, 825.6, 430.9, 1.8, 0.24, 823.1, 427, 1.8, 0.75, 823.2, 423.4, 2.2, 0.94, 823.6, 421.9, 2.2, 0.89, 826.1, 417.6, 1.8, 0.52, 830.9, 413.5, 1.5, 0.29, 835.5, 410.1, 1.8, 0.29, 840.1, 406.7, 2.2, 0.09, 844.4, 402.4, 1.8, 0.27, 846.4, 399.1, 2.5, 0.32, 847.4, 394.6, 3.5, 0.26]], "48.40": [[794.6, 460.9, 0.6, 0.21, 796.4, 454.2, 3.5, 0.11, 796.3, 447.6, 2, 0.08, 796.8, 440.9, 3.5, 0.06, 794.6, 434.3, 3.5, 0.06, 794.6, 427.6, 2, 0.06, 796.8, 421, 3.5, 0.05, 795.5, 414.3, 1.5, 0.03, 795.3, 407.7, 3.5, 0.03, 796.3, 401, 3, 0.03, 794.5, 394.4, 0.8, 0.01, 794.7, 387.7, 2.5, 0.01, 796.7, 381.1, 2.8, 0.01, 796.2, 374.4, 2.5, 0.01, 795.9, 367.8, 3.5, 0.01, 796.7, 361.1, 2.5, 0, 794.7, 354.5, 0.8, 0, 796.7, 347.8, 3.2, 0.01, 795.1, 341.2, 1.5, 0.02, 795.1, 334.5, 3.5, 0.01, 794.6, 327.9, 3.5, 0.01, 794.8, 325, 3.5, 0.01, 797.4, 324.6, 3.5, 0.01, 804.3, 326.6, 3.5, 0, 811.3, 325.1, 1.5, 0, 818.2, 324.9, 3, 0.01, 825.2, 326.6, 2.2, 0, 832.1, 326.6, 2.5, 0, 839.1, 326.6, 2.5, 0, 846, 325.6, 3.5, 0, 853, 326.6, 3.5, 0.02, 859.9, 326.4, 1.5, 0, 866.9, 326.6, 3, 0.01, 873.8, 326.6, 1.5, 0, 880.8, 326.6, 3.5, 0.01, 887.7, 326.4, 1.8, 0.01, 894.7, 325.9, 2.8, 0.03, 901.6, 324.6, 2.2, 0.01, 903.6, 324.6, 0.8, 0.02, 904.4, 326.4, 1, 0.01, 904.4, 333.1, 0.6, 0.01, 902.4, 339.8, 2.8, 0.01, 903.9, 346.6, 3.5, 0.01, 903.4, 353.3, 3.5, 0.01, 903.1, 360.1, 2, 0.01, 903.1, 366.8, 1.2, 0.02, 902.4, 373.5, 3.5, 0.02, 904.4, 380.3, 1, 0.04, 904.4, 387, 1.2, 0.03, 904.4, 393.8, 0.8, 0.04, 902.1, 400.5, 3.5, 0.05, 904.4, 407.2, 1, 0.05, 904.4, 414, 1.5, 0.05, 904.4, 420.7, 1, 0.08, 902.6, 427.4, 3.2, 0.06, 904.4, 434.2, 2.5, 0.08, 902.1, 440.9, 3.5, 0.05, 902.4, 447.6, 3, 0.04, 902.1, 454.4, 3.5, 0.06, 902.1, 461.1, 3.5, 0.06], [825.3, 384.9, 2, 0.12, 830.9, 386.3, 1.8, 0.18, 837.5, 387.6, 1.8, 0.56, 843.1, 390.3, 1.5, 0.59, 846.7, 393, 3.2, 0.33], [828.4, 371.5, 1.8, 0.29, 828.4, 370.9, 2, 0.3, 829.7, 366.2, 1.8, 0.36, 833, 360.6, 1.8, 0.17], [836.9, 461.7, 2.8, 0.21, 837.4, 460.5, 2, 0.22, 838.3, 456.2, 2, 0.49, 840.8, 453.4, 2.2, 0.16, 842.6, 450.4, 2.2, 0.29, 844.6, 447.5, 2, 0.46, 846.3, 442.3, 1.8, 0.68, 845.8, 439.7, 2.2, 0.73, 845, 437.4, 2, 0.81, 840.4, 432.4, 2, 0.59, 835.4, 428, 1.8, 0.79, 833.8, 425.3, 2, 0.97, 834.1, 422.7, 2.2, 0.96, 834.6, 421.6, 2.2, 0.93, 837, 418.1, 2, 0.88, 840.2, 415.3, 2, 0.77, 844.4, 412.8, 1.8, 0.42, 848.4, 409.9, 2.2, 0.09], [840.1, 447.6, 2.2, 0.5, 840.3, 442.4, 2, 0.54, 839.7, 440.3, 2, 0.44, 836, 437.1, 2, 0.11, 832, 434.2, 2, 0.62, 828.8, 431.9, 2, 0.34, 825.9, 429.6, 2, 0.25, 823.4, 425.8, 1.8, 0.65, 823.3, 421.7, 2, 0.94, 823.9, 419.8, 1.8, 0.82, 826.6, 416.2, 1.8, 0.43, 830.9, 412.5, 2, 0.25, 834.5, 409.6, 1.8, 0.28, 838.5, 407.3, 2, 0.08, 841.8, 404.1, 1.8, 0.11, 844.8, 400.6, 2, 0.3, 846.6, 397.7, 2.8, 0.32, 846.9, 393.6, 3.5, 0.32], [852.6, 406.6, 1.8, 0.1, 856.9, 402, 2, 0.55, 859.1, 396.6, 2.2, 0.38, 858.7, 391.9, 2.5, 0.11, 858.1, 390, 2.2, 0.07, 856.8, 388, 2.5, 0.1]], "48.48": [[794.6, 460.9, 0.6, 0.18, 795.6, 454.2, 3.5, 0.1, 796.3, 447.6, 1.8, 0.08, 796.6, 440.9, 3.5, 0.05, 796.6, 434.3, 3.5, 0.06, 796.8, 427.6, 3.2, 0.06, 796.5, 421, 2, 0.05, 794.5, 414.3, 1.8, 0.03, 794.5, 407.7, 1, 0.02, 796.8, 401, 3.5, 0.03, 796.7, 394.4, 2.8, 0.02, 794.7, 387.7, 3.5, 0.02, 796.7, 381.1, 2.5, 0.01, 795.5, 374.4, 3.5, 0.01, 795.9, 367.8, 3.5, 0.01, 796.7, 361.1, 2.8, 0.01, 796.7, 354.5, 2.8, 0.01, 796.7, 347.8, 2.8, 0, 796.6, 341.2, 2, 0.01, 794.6, 334.5, 0.8, 0, 796.4, 328, 3.2, 0, 796.7, 326.6, 1.2, 0, 797.5, 326.1, 2, 0, 804.3, 324.6, 2.8, 0, 811.3, 325.1, 3.5, 0, 818.2, 325.1, 1.2, 0.01, 825.2, 324.6, 2.2, 0, 832.1, 326.6, 2.5, 0, 839.1, 326.6, 2.5, 0, 846, 326.6, 2.5, 0, 853, 326.6, 3.5, 0, 859.9, 324.9, 1.2, 0.01, 866.9, 326.6, 3, 0.01, 873.8, 326.6, 2.2, 0.01, 880.8, 325.1, 3.5, 0.01, 887.7, 326.6, 2.5, 0.01, 894.7, 324.6, 0.8, 0.01, 901.6, 324.6, 0.6, 0, 903.5, 324.8, 1.5, 0.01, 903.9, 326.4, 1.2, 0, 904.4, 333.1, 3.5, 0.01, 902.9, 339.8, 2.2, 0, 902.6, 346.6, 1.5, 0.01, 903.1, 353.3, 3, 0.01, 902.6, 360.1, 2.2, 0.01, 902.1, 366.8, 3.5, 0.01, 903.4, 373.5, 3.5, 0.02, 902.4, 380.3, 3.2, 0.03, 902.1, 387, 3.5, 0.07, 904.4, 393.8, 1, 0.05, 902.1, 400.5, 3.5, 0.03, 904.4, 407.2, 3.2, 0.05, 902.1, 414, 3.2, 0.05, 904.1, 420.7, 3.5, 0.08, 903.1, 427.4, 2.5, 0.07, 902.9, 434.2, 3.5, 0.07, 902.1, 440.9, 3.5, 0.07, 902.1, 447.6, 3.5, 0.06, 904.4, 454.4, 0.8, 0.04, 902.1, 461.1, 3.5, 0.05], [826.1, 383.6, 1.2, 0.15, 831.8, 385.6, 1.8, 0.2, 835.6, 386, 2.2, 0.29, 838.5, 386.9, 1.8, 0.62, 843.9, 389.6, 2.2, 0.58, 845.8, 391.2, 2.2, 0.43, 847, 392.6, 2.5, 0.36, 846.7, 397.2, 2.8, 0.33, 845.3, 399.6, 2.2, 0.34, 842.4, 402.9, 1.8, 0.13, 839.3, 406.1, 2.5, 0.12, 834.6, 408.6, 1.8, 0.28, 830.2, 412.4, 1.8, 0.22, 826.1, 416.3, 2, 0.51, 823.4, 421, 2, 0.86, 823.3, 425.4, 1.8, 0.53, 824.7, 427.2, 1.5, 0.32, 827.9, 430.6, 1.8, 0.27, 832.4, 433.3, 2.2, 0.56, 835.4, 435.6, 2, 0.05, 838.7, 437.5, 2, 0.23, 840.4, 440.4, 2, 0.42, 841.1, 443.1, 2.2, 0.45], [837.1, 461.9, 2.8, 0.23, 837.4, 460.5, 2.5, 0.22, 838.3, 456.2, 1.8, 0.46, 841, 453.4, 2.8, 0.15, 843.9, 449.1, 2.2, 0.33], [844.4, 448.7, 2.2, 0.38, 845.9, 445.4, 2, 0.47, 846.8, 442.1, 2, 0.71, 845.9, 437.5, 1.8, 0.77, 844.9, 435.6, 2, 0.85, 840, 431.2, 1.8, 0.54, 835.1, 426.7, 2, 0.76, 834.1, 424.8, 2, 0.9, 834, 422.1, 2, 0.91, 834.3, 420.8, 2, 0.91, 836.9, 417.5, 1.8, 0.88, 841.9, 413.2, 2, 0.58, 847.6, 409.6, 2.2, 0.12, 853.1, 405.6, 2.2, 0.14, 857.1, 401, 1.8, 0.57, 859, 396.4, 2.2, 0.52, 859.1, 394.6, 2, 0.22, 858.9, 390.6, 2.2, 0.09, 857.1, 387.3, 2.2, 0.14]], "48.56": [[794.6, 460.9, 0.6, 0.27, 796.9, 454.2, 3.5, 0.1, 796.1, 447.6, 3.2, 0.08, 794.6, 440.9, 1.2, 0.05, 794.6, 434.3, 0.8, 0.04, 796.1, 427.6, 3.5, 0.04, 796.5, 421, 3.5, 0.04, 794.5, 414.3, 3.5, 0.03, 794.5, 407.7, 1.5, 0.02, 794.5, 401, 3.5, 0.02, 796.7, 394.4, 3, 0.01, 794.7, 387.7, 3.5, 0.03, 796.7, 381.1, 3.2, 0.02, 796.7, 374.4, 3.5, 0.01, 796.2, 367.8, 2, 0.01, 796.7, 361.1, 3.5, 0, 796.4, 354.5, 3.2, 0.01, 796.7, 347.8, 3.5, 0, 795.6, 341.2, 2, 0.01, 794.6, 334.5, 1.2, 0.01, 796.6, 328, 3.2, 0.01, 795.7, 325.8, 1.5, 0, 797.5, 325.9, 3.5, 0, 804.3, 325.9, 1.2, 0, 811.3, 324.6, 0.6, 0, 818.2, 325.9, 3.5, 0.01, 825.2, 325.9, 3.5, 0.01, 832.1, 325.1, 1.8, 0, 839.1, 326.6, 3.5, 0, 846, 326.6, 3.5, 0, 853, 326.6, 3.5, 0, 859.9, 324.6, 0.8, 0.02, 866.9, 325.6, 3.5, 0, 873.8, 326.6, 3.5, 0.02, 880.8, 324.6, 1, 0.01, 887.7, 325.6, 2, 0, 894.7, 324.6, 1.2, 0.01, 901.6, 324.6, 1, 0, 903.1, 325.4, 2, 0.01, 903.4, 326.4, 2, 0.01, 902.1, 333.1, 3.5, 0.01, 902.9, 339.8, 1.8, 0.01, 903.1, 346.6, 3.5, 0.01, 902.1, 353.3, 3.5, 0.01, 902.1, 360.1, 3.5, 0.03, 902.9, 366.8, 3.5, 0.01, 904.4, 373.5, 3.5, 0.01, 902.9, 380.3, 3.5, 0.03, 904.4, 387, 0.8, 0.03, 904.4, 393.8, 1, 0.01, 904.4, 400.5, 3, 0.05, 902.1, 407.2, 3.5, 0.04, 902.1, 414, 3.5, 0.04, 902.1, 420.7, 3.5, 0.04, 902.6, 427.4, 2.8, 0.09, 902.1, 434.2, 3.5, 0.07, 902.4, 440.9, 3.5, 0.08, 902.6, 447.6, 3.5, 0.04, 902.1, 454.4, 3.5, 0.04, 904.4, 461.1, 0.6, 0.03], [827.1, 382.4, 2, 0.12, 832.3, 383.9, 1.8, 0.12, 837.5, 384.6, 2, 0.41, 841.5, 386.2, 2, 0.45, 845.1, 388.3, 2, 0.5, 846.4, 389.6, 2.2, 0.46, 846.8, 390.6, 2.2, 0.44, 846.8, 395.4, 2.2, 0.32, 845.3, 397.7, 2.2, 0.29, 842.6, 401.1, 1.8, 0.14, 839.6, 404.3, 2.5, 0.12, 835.8, 406.7, 1.2, 0.2, 831.9, 409.2, 2, 0.26, 829, 411.7, 1.8, 0.29, 826.1, 414.2, 2, 0.48, 823.2, 420.3, 2.2, 0.84, 823.7, 422.9, 2.2, 0.6, 826, 427.6, 2.2, 0.21, 829.8, 430.3, 1.8, 0.32, 833.7, 432.9, 1.8, 0.36, 837.6, 435.6, 2, 0.14, 840.5, 439.1, 1.8, 0.49, 841.2, 441.4, 2.2, 0.49, 840.4, 445.6, 2.2, 0.47], [836.8, 461.5, 3.5, 0.24, 836.9, 460.4, 2, 0.24, 838.8, 455.2, 2, 0.4, 842.3, 450.2, 2.8, 0.17, 846.1, 445.5, 2.2, 0.44, 847.1, 443.1, 2.2, 0.58, 847.7, 440.4, 2, 0.76, 846.9, 436.4, 1.8, 0.82, 845.5, 434.2, 2, 0.79, 842.1, 431, 1.8, 0.58, 838.4, 427.9, 2, 0.48, 835.1, 424.5, 2, 0.73, 834.2, 422, 2, 0.87, 834.2, 420, 2, 0.94, 835.4, 417.5, 2, 0.86, 840.1, 412.9, 2, 0.78, 845.6, 409.2, 1.8, 0.25, 851.4, 405.6, 3.5, 0.11, 854.6, 401.9, 1.8, 0.25, 857.7, 398.3, 2, 0.59, 859.2, 393.4, 2.5, 0.29, 858.9, 389.1, 2.5, 0.09, 856.7, 384.8, 2, 0.07]], "48.64": [[794.6, 460.9, 0.6, 0.31, 794.6, 454.2, 0.8, 0.08, 794.6, 447.6, 0.8, 0.08, 796.8, 440.9, 3.5, 0.06, 796.8, 434.3, 3.5, 0.05, 796.3, 427.6, 3.5, 0.06, 796, 421, 3.5, 0.02, 796.5, 414.3, 2.8, 0.04, 796.8, 407.7, 3.5, 0.02, 795.8, 401, 2.5, 0.02, 796.2, 394.4, 3.2, 0.01, 794.7, 387.7, 3.5, 0.04, 796.7, 381.1, 3.5, 0.01, 796.2, 374.4, 3.5, 0.01, 795.7, 367.8, 2.8, 0.03, 796.7, 361.1, 3.5, 0, 795.9, 354.5, 3, 0.01, 796.7, 347.8, 3, 0.01, 796.6, 341.2, 3.5, 0.01, 796.6, 334.5, 2.5, 0.01, 795.1, 327.9, 2, 0, 796.7, 326.6, 3.5, 0, 797.5, 325.9, 3.5, 0, 804.3, 326.6, 3.2, 0, 811.3, 324.6, 0.6, 0, 818.2, 326.6, 2.5, 0, 825.2, 325.4, 3.2, 0, 832.1, 324.6, 2, 0, 839.1, 326.6, 3.5, 0, 846, 326.6, 3.2, 0, 853, 325.4, 3.5, 0, 859.9, 324.6, 3.5, 0, 866.9, 324.6, 1.2, 0.01, 873.8, 324.6, 0.6, 0, 880.8, 326.6, 3.5, 0.01, 887.7, 326.6, 2.5, 0.01, 894.7, 326.6, 3.5, 0, 901.6, 325.6, 3.5, 0, 902.3, 326.4, 3, 0, 902.6, 326.5, 1.2, 0, 902.9, 333.1, 1.5, 0.01, 902.1, 339.8, 2.8, 0.01, 902.1, 346.6, 2.8, 0.01, 902.1, 353.3, 2.5, 0, 904.4, 360.1, 0.6, 0, 904.4, 366.8, 1, 0.01, 902.1, 373.5, 2.8, 0.01, 902.1, 380.3, 3.5, 0, 902.1, 387, 2.8, 0.02, 902.1, 393.8, 3.2, 0.03, 902.4, 400.5, 3, 0.06, 904.4, 407.2, 3.5, 0.07, 904.4, 414, 3.2, 0.06, 904.4, 420.7, 2, 0.08, 904.4, 427.4, 2.5, 0.06, 902.1, 434.2, 3.5, 0.08, 902.4, 440.9, 2.8, 0.06, 904.4, 447.6, 1.2, 0.06, 904.4, 454.4, 0.6, 0.03, 902.9, 461.1, 2, 0.03], [827.1, 381.6, 2, 0.11, 832.6, 382.9, 1.8, 0.15, 838.1, 383.7, 1.8, 0.4, 841.7, 385.3, 2, 0.38, 845.1, 387.3, 1.8, 0.5, 846.3, 388.6, 2, 0.49, 846.8, 389.6, 2.2, 0.48, 846.8, 394.7, 2, 0.42, 845.8, 396.9, 1.8, 0.34, 842.3, 399.9, 1.5, 0.11, 839.3, 403.5, 2, 0.1, 836, 405.3, 2, 0.2, 832.7, 407.1, 2, 0.29, 829.6, 410.2, 1.8, 0.26, 826.4, 413.2, 1.8, 0.42, 823.2, 419, 2.2, 0.89, 823.2, 422.9, 2, 0.59, 825.9, 426.9, 2.2, 0.19, 828.6, 429, 2, 0.27, 832, 430.8, 2.5, 0.52, 834.4, 432.3, 1.8, 0.26, 838.1, 435, 2, 0.19, 840, 437.2, 2.2, 0.44, 841, 440.6, 2.2, 0.48, 840.4, 444.3, 2.2, 0.49, 840, 445.2, 2, 0.5, 839.5, 447.1, 2, 0.26, 839.6, 447.6, 2.5, 0.2], [836.9, 460.7, 2, 0.21, 838.8, 454.7, 2, 0.39, 842.5, 449.5, 2.5, 0.17, 846.5, 444.5, 2.2, 0.44, 848.2, 439.1, 2, 0.74, 847.2, 435.2, 2, 0.75, 846.1, 433.7, 2, 0.84, 842.6, 429.8, 1.8, 0.54, 838.4, 426.7, 1.8, 0.49, 835, 423, 2.2, 0.71, 834, 420.6, 2, 0.88, 834.3, 418.2, 2, 0.95, 835.2, 417, 2, 0.87, 839.5, 412.2, 2, 0.81, 843.7, 409, 1.8, 0.46, 848.2, 406.3, 3.5, 0.06, 852.4, 402.9, 2.5, 0.15, 854.9, 400.4, 1.8, 0.27, 857, 397.6, 2, 0.59, 858.6, 394.1, 2.2, 0.55, 858.9, 390.1, 3, 0.07, 858, 387.1, 2.2, 0.08, 856.8, 384.4, 2, 0.13]], "48.72": [[794.6, 460.9, 0.6, 0.32, 794.6, 454.2, 2, 0.09, 796.8, 447.6, 3.5, 0.09, 796.8, 440.9, 3.2, 0.09, 796.8, 434.3, 2.8, 0.06, 794.6, 427.6, 0.8, 0.05, 794.6, 421, 1.5, 0.06, 796.8, 414.3, 3.2, 0.02, 796.5, 407.7, 3.5, 0.02, 795.5, 401, 3.5, 0.02, 796.7, 394.4, 3.5, 0.03, 794.7, 387.7, 2.2, 0.02, 796.2, 381.1, 3.5, 0, 796, 374.4, 2.8, 0.01, 794.7, 367.8, 1, 0.02, 794.9, 361.1, 1.8, 0, 794.7, 354.5, 2.2, 0.01, 795.9, 347.8, 2, 0.01, 796.6, 341.2, 2, 0.01, 796.6, 334.5, 2.5, 0.02, 794.6, 327.9, 3.5, 0.01, 795.7, 325.8, 1.5, 0, 797.5, 326.6, 2.8, 0.01, 804.3, 326.6, 3.5, 0.03, 811.3, 326.6, 3.5, 0.01, 818.2, 324.6, 0.8, 0.01, 825.2, 324.6, 3, 0.01, 832.1, 324.6, 1, 0.01, 839.1, 326.6, 2, 0.01, 846, 326.6, 3.5, 0, 853, 326.6, 2.8, 0, 859.9, 324.6, 0.8, 0.02, 866.9, 326.4, 3.5, 0, 873.8, 324.6, 1, 0.01, 880.8, 326.6, 3.5, 0, 887.7, 326.6, 2.8, 0, 894.7, 326.1, 2.8, 0.01, 901.5, 326.6, 1.5, 0.01, 903.5, 324.8, 3.5, 0.01, 903.4, 326.4, 3, 0.01, 904.4, 333.1, 2.5, 0.02, 904.4, 339.8, 0.6, 0, 903.4, 346.6, 3.5, 0.01, 902.1, 353.3, 2.5, 0.01, 904.4, 360.1, 0.8, 0, 904.4, 366.8, 3.5, 0.01, 902.1, 373.5, 3.5, 0, 902.1, 380.3, 3.5, 0.01, 904.4, 387, 2.8, 0.03, 902.9, 393.8, 2.8, 0.05, 904.4, 400.5, 0.8, 0.05, 904.4, 407.2, 3.5, 0.05, 904.4, 414, 2, 0.07, 902.9, 420.7, 3.5, 0.06, 903.4, 427.4, 2.8, 0.08, 902.1, 434.2, 3.5, 0.06, 902.1, 440.9, 3.5, 0.06, 904.4, 447.6, 2.8, 0.05, 902.6, 454.4, 3.5, 0.04, 902.1, 461.1, 3.5, 0.03], [836, 461.5, 3, 0.22, 836.4, 460.4, 2.2, 0.22, 838, 454.5, 2, 0.36, 842.8, 449.9, 3, 0.16, 844.5, 446.5, 3.5, 0.21, 847.1, 443.6, 2.2, 0.42, 848.5, 437.4, 2.2, 0.72, 847.6, 434.3, 2.2, 0.77, 846.9, 432.8, 2, 0.81, 843.6, 429.1, 1.8, 0.67, 840.2, 426.6, 1.8, 0.46, 836.9, 424.1, 1.8, 0.56, 834.1, 420.9, 2.2, 0.72, 833.5, 419.1, 2.5, 0.82, 833.7, 417.2, 2.2, 0.85, 836.9, 412.1, 1.8, 0.87, 841.9, 408.1, 1.8, 0.55, 847, 404.8, 1.8, 0.17, 852.1, 401.6, 2.2, 0.13, 854.9, 399, 2, 0.24, 857.1, 396, 2, 0.56, 858.7, 391.7, 2.5, 0.44, 858.5, 386.6, 2.5, 0.08, 856.9, 382.8, 2, 0.14, 857.1, 382.8, 2, 0.13], [839, 446.4, 2.2, 0.26, 840.1, 444, 2.2, 0.51, 840.4, 442.9, 2.2, 0.5, 840.8, 438.8, 2.2, 0.52, 839.7, 435.9, 2.2, 0.41, 836.3, 432.1, 3.5, 0.08, 830.9, 429.6, 2, 0.43, 826.1, 426.1, 2, 0.18, 823.4, 423, 2.2, 0.4, 822.7, 419.1, 2.2, 0.79, 823.2, 416.9, 2, 0.84, 825.9, 412.6, 1.8, 0.47, 830.9, 407.8, 1.8, 0.27, 834.8, 405.1, 2, 0.21, 838.8, 402.5, 2.5, 0.06, 842.3, 399.2, 1.8, 0.07, 845.1, 396.1, 2, 0.22, 846.8, 394.2, 2.2, 0.31, 847.1, 389.1, 1.8, 0.57, 846.3, 386.8, 2.2, 0.63, 844.8, 385.5, 2, 0.38, 841.1, 383.2, 1.5, 0.25, 837, 381.9, 1.5, 0.15]], "48.80": [[794.6, 460.9, 0.6, 0.32, 794.6, 454.2, 3.5, 0.1, 795.1, 447.6, 3.5, 0.08, 796.8, 440.9, 3.5, 0.06, 794.6, 434.3, 2.5, 0.07, 794.8, 427.6, 2.5, 0.06, 796.3, 421, 3.2, 0.05, 796.3, 414.3, 3.5, 0.03, 794.5, 407.7, 1.5, 0.03, 796.8, 401, 3.5, 0.02, 796.7, 394.4, 2.8, 0.02, 796.7, 387.7, 3.5, 0.02, 796.7, 381.1, 3.5, 0, 796, 374.4, 3.5, 0.02, 794.7, 367.8, 1.2, 0.02, 794.9, 361.1, 3.5, 0, 794.7, 354.5, 2.2, 0.01, 795.9, 347.8, 2, 0.01, 796.6, 341.2, 2, 0.01, 794.6, 334.5, 3.5, 0.01, 796.6, 328, 3.5, 0.01, 795.7, 325.8, 3.5, 0.01, 797.5, 326.4, 3.2, 0.01, 804.3, 326.6, 2.2, 0, 811.3, 324.6, 3.5, 0, 818.2, 326.6, 3, 0, 825.2, 326.6, 3.5, 0.02, 832.1, 326.6, 3.5, 0.01, 839.1, 326.6, 3.5, 0.01, 846, 324.6, 1, 0.01, 853, 324.6, 2, 0, 859.9, 324.6, 3.5, 0, 866.9, 326.6, 3.5, 0.01, 873.8, 326.6, 3, 0.01, 880.8, 324.6, 1, 0.01, 887.7, 326.6, 2.5, 0, 894.7, 325.9, 1, 0, 901.6, 326.1, 2.5, 0.01, 903.5, 324.8, 3.5, 0.01, 902.1, 326.6, 3.5, 0.01, 903.9, 333.1, 1.5, 0.02, 902.1, 339.8, 2.8, 0, 903.6, 346.6, 3.5, 0.01, 904.3, 353.3, 1.2, 0.02, 902.1, 360.1, 3.5, 0.01, 904.3, 366.8, 3.5, 0.01, 902.8, 373.5, 3.5, 0.02, 902, 380.3, 3.2, 0.01, 904, 387, 1, 0.01, 902.8, 393.7, 3.5, 0.02, 904.2, 400.5, 2.5, 0.07, 904.5, 407.2, 3.5, 0.04, 902, 414, 3.5, 0.05, 902, 420.7, 3.5, 0.07, 904.4, 427.4, 3.5, 0.06, 903.9, 434.2, 3, 0.07, 901.9, 440.9, 3.5, 0.08, 902.9, 447.6, 3.5, 0.05, 903.1, 454.4, 2.2, 0.05, 903.1, 461.1, 2.2, 0.06], [836.4, 460.7, 2, 0.21, 837.5, 455.3, 2, 0.31, 840, 452.5, 1.8, 0.41, 843.2, 449.1, 2.5, 0.15, 844.5, 445.3, 3.2, 0.14, 847.5, 442.6, 2.5, 0.39, 849.1, 437.1, 2, 0.77, 847.6, 431.7, 2, 0.78, 846.5, 430.2, 2, 0.83, 842.6, 426.3, 1.8, 0.53, 838.1, 423.5, 2, 0.44, 834.6, 420.1, 1.8, 0.62, 833.7, 418, 2.2, 0.82, 833.4, 415.9, 2, 0.89, 834.6, 413.4, 1.8, 0.86, 838.9, 408.7, 1.8, 0.74, 844.4, 404.6, 1.8, 0.35, 846.7, 403.3, 2.5, 0.14, 851.5, 400.7, 2, 0.1, 856.1, 396.2, 2, 0.39, 857.1, 394.5, 2, 0.56, 858.4, 390.9, 2.2, 0.5], [836.7, 402.2, 2.2, 0.08, 831.6, 405.6, 2, 0.3, 828.8, 408.1, 2, 0.29, 825.9, 410.6, 1.8, 0.44, 823, 415, 2, 0.86, 822.5, 418.3, 2.2, 0.82, 823.5, 421.9, 2, 0.38, 825.6, 424.6, 2, 0.21, 829.6, 427.5, 2, 0.28, 833.7, 430.2, 1.8, 0.3, 837.6, 433.1, 2, 0.18, 839.6, 435, 2, 0.48, 840.9, 438, 2.2, 0.58], [841.8, 398.1, 2, 0.05, 846.1, 393.4, 2.8, 0.29, 847.1, 387.6, 2, 0.57, 847, 386.5, 2, 0.71, 845.8, 385.1, 2, 0.58, 844.3, 383.9, 1.2, 0.28, 842.8, 383.9, 1.2, 0.16]], "48.88": [[794.6, 461.2, 0.8, 0.58, 794.6, 456.1, 1.5, 0.14, 794.6, 449.4, 3.5, 0.08, 794.6, 442.6, 1, 0.06, 795.9, 435.9, 3.5, 0.08, 796.6, 429.1, 2.8, 0.02, 796.6, 422.4, 3.2, 0.04, 796.6, 415.6, 2.5, 0, 794.9, 408.9, 1.8, 0.02, 794.6, 402.1, 1, 0.02, 794.6, 395.4, 3.5, 0.02, 795.4, 388.6, 3.5, 0.01, 796.1, 381.9, 3.5, 0.01, 795.9, 375.1, 3.5, 0.02, 796.6, 368.4, 3.5, 0.01, 794.6, 361.6, 0.6, 0.01, 794.9, 354.9, 3.5, 0.01, 795.9, 348.1, 1.2, 0.01, 796.1, 341.4, 3.2, 0.01, 795.1, 334.6, 1.2, 0.01, 794.6, 327.9, 3.5, 0.01, 795.3, 325.5, 2, 0.01, 797.4, 324.6, 3.5, 0.01, 804.3, 326.6, 2.8, 0.02, 811.3, 324.6, 0.6, 0.01, 818.2, 326.4, 3.2, 0.01, 825.2, 324.6, 0.6, 0, 832.1, 326.6, 3, 0.01, 839.1, 326.6, 2, 0.01, 846, 326.6, 3.5, 0.01, 853, 326.4, 3.5, 0.02, 859.9, 326.6, 3.5, 0.01, 866.9, 325.9, 3.5, 0, 873.8, 324.9, 1.2, 0.01, 880.8, 324.6, 1, 0.01, 887.7, 325.9, 3.5, 0.01, 894.7, 325.6, 3.5, 0.01, 901.5, 326.1, 2.2, 0.01, 901.9, 326, 3.5, 0.01, 904.4, 332.2, 1.8, 0.02, 902.6, 339, 3, 0.01, 901.9, 345.8, 3, 0.01, 904.4, 352.6, 0.6, 0, 901.9, 359.4, 3.5, 0.01, 901.9, 366.2, 3.5, 0.01, 902.9, 372.9, 2.2, 0.02, 904.5, 379.7, 3.5, 0.02, 902, 386.5, 2.5, 0.01, 902, 393.3, 3.5, 0.03, 903, 400.1, 3.5, 0.06, 903.5, 406.9, 3.5, 0.04, 904.3, 413.6, 0.6, 0.04, 904, 420.4, 3.5, 0.1, 904.1, 427.2, 3, 0.08, 902.3, 434, 2.2, 0.06, 904.1, 440.8, 1.2, 0.06, 904.3, 447.6, 2.8, 0.06, 904.4, 454.3, 2.5, 0.05, 904.4, 461.1, 1.2, 0.04], [835.4, 401.4, 2, 0.12, 832.1, 404, 2.2, 0.32, 828.9, 406.5, 1.5, 0.27, 824.9, 410.8, 1.5, 0.51, 822.3, 415, 2.2, 0.78, 822.2, 416.8, 2.2, 0.76, 822.6, 420.1, 2.2, 0.48, 825.1, 423.4, 1.8, 0.23, 829.1, 426.5, 1.8, 0.2, 833.9, 429.4, 1.8, 0.24, 838.5, 432.5, 1.5, 0.35, 839.5, 433.7, 2, 0.46, 840.5, 436.5, 2.2, 0.54, 840.5, 440.9, 2, 0.51, 836.8, 446.7, 2.2, 0.17], [836.1, 461.1, 2, 0.15, 836.5, 457.4, 2.5, 0.29, 836.8, 454.7, 2.2, 0.33, 839, 452.4, 1.8, 0.4, 842.4, 449.2, 2, 0.3, 845.4, 445.6, 2.2, 0.06, 847.9, 442.2, 2.2, 0.28, 849.4, 437.1, 2.2, 0.86, 848.5, 430.9, 2.2, 0.67, 847.2, 428.5, 1.8, 0.74, 843.6, 425.6, 1.8, 0.53, 840.4, 423.5, 2, 0.3, 836.9, 420.9, 1.8, 0.47, 833.3, 416.4, 2.2, 0.72, 833.4, 413.7, 2, 0.89, 836.9, 408.5, 1.8, 0.87, 840.3, 405.5, 1.8, 0.69, 844.1, 403.1, 2.2, 0.38, 848.2, 400.8, 2, 0.11, 852.5, 398.7, 2, 0.16, 856.4, 394.1, 1.8, 0.36, 858.5, 388.6, 2.2, 0.39, 858.2, 383.1, 2.5, 0.08, 856.8, 380.5, 2.2, 0.14], [842.4, 396.4, 1.5, 0.06, 846.5, 391.9, 2, 0.31, 847.9, 387.1, 2, 0.54, 846.8, 384.4, 1.8, 0.72, 843.3, 381.8, 1.5, 0.09]], "48.96": [[794.7, 462.8, 2, 0.95, 794.6, 460.9, 0.8, 0.62, 794.6, 455.9, 1.5, 0.14, 794.6, 449.1, 3.5, 0.08, 794.6, 442.4, 0.8, 0.07, 795.9, 435.7, 3.2, 0.09, 796.6, 428.9, 2.8, 0.06, 795.6, 422.2, 2, 0.02, 796.6, 415.5, 3, 0.01, 795.6, 408.7, 2.2, 0.05, 795.1, 402, 2, 0.01, 796.6, 395.2, 3.5, 0.01, 795.9, 388.5, 2.5, 0.01, 796.6, 381.8, 3, 0.02, 796.6, 375, 3.5, 0.02, 794.6, 368.3, 2.8, 0.03, 796.6, 361.6, 3.5, 0.01, 796.6, 354.8, 3.5, 0.01, 795.6, 348.1, 2.2, 0.01, 796.1, 341.3, 1.8, 0.01, 795.1, 334.6, 1.2, 0.01, 796.6, 328, 3.5, 0.01, 796.7, 326.6, 3.2, 0.01, 797.5, 326.6, 3.5, 0.01, 804.3, 326.6, 3.5, 0.03, 811.3, 324.6, 1, 0.01, 818.2, 325.9, 2, 0, 825.2, 324.6, 0.6, 0, 832.1, 326.6, 3, 0.01, 839.1, 326.1, 3.2, 0, 846, 325.6, 2, 0.01, 853, 324.6, 2, 0, 859.9, 326.6, 2.8, 0, 866.9, 325.9, 2, 0, 873.8, 326.1, 3.5, 0.01, 880.8, 326.6, 3, 0.01, 887.7, 326.6, 3.2, 0.01, 894.7, 324.6, 1, 0.01, 901.5, 326.4, 3, 0.01, 901.9, 326, 3.5, 0.01, 903.6, 332.2, 3.5, 0.01, 903.9, 339, 1.2, 0.01, 904.4, 345.8, 3.5, 0, 903.9, 352.6, 2.5, 0.01, 904.4, 359.4, 2, 0.01, 904.4, 366.2, 1, 0.02, 904.4, 372.9, 0.8, 0.01, 902, 379.7, 2.5, 0.01, 902, 386.5, 3.2, 0.02, 903, 393.3, 3.5, 0.05, 903.3, 400.1, 2.8, 0.07, 904, 406.9, 1.8, 0.09, 902.8, 413.6, 3.5, 0.05, 904, 420.4, 3, 0.07, 903.3, 427.2, 3, 0.06, 902.1, 434, 3.2, 0.04, 904.3, 440.8, 1.2, 0.07, 904.3, 447.6, 1, 0.06, 904.4, 454.3, 1.2, 0.08, 903.1, 461.1, 3.5, 0.06], [833.9, 400.9, 1.8, 0.16, 829.1, 404.9, 2, 0.25, 824.7, 409.4, 1.8, 0.49, 822.7, 413.1, 2, 0.81, 822, 416.1, 2.2, 0.75, 822.4, 419.1, 2.5, 0.48, 824.9, 422.4, 1.8, 0.24, 828.9, 425.5, 1.8, 0.21, 833.4, 428.2, 2, 0.28, 837.9, 430.9, 2, 0.29, 839.5, 432.6, 2, 0.46, 840.9, 437.1, 2, 0.51, 840.5, 439.9, 2.2, 0.51, 838.4, 443.1, 2.2, 0.39, 836.3, 446.4, 2.8, 0.11], [836.1, 460.9, 1.8, 0.17, 836.2, 458.1, 2, 0.28, 836.7, 454.7, 2, 0.33, 838.7, 452.1, 1.8, 0.39, 841.7, 449, 2, 0.33, 844.7, 445.9, 3.5, 0.14, 848.4, 441.6, 2.5, 0.25, 849.4, 437.8, 2.2, 0.8, 850.1, 435.1, 2, 0.85, 849.2, 431.2, 1.8, 0.51, 847.8, 427.5, 1.5, 0.54, 845.1, 424.7, 1.8, 0.46, 840.9, 421.9, 1.8, 0.31, 836.6, 419.1, 1.8, 0.44, 833.2, 414.5, 2.2, 0.72, 833.2, 412.5, 2, 0.86, 836.6, 407.2, 2, 0.82, 840.1, 404.2, 2, 0.72, 843.9, 401.5, 1.8, 0.38, 847.5, 400.5, 3, 0.14, 852.3, 397.4, 2.5, 0.13, 855.6, 393.4, 1.5, 0.23, 857.4, 391, 1.8, 0.34, 858.7, 387.1, 2.5, 0.37, 857.8, 383.1, 2.8, 0.08, 856.4, 379.2, 2.8, 0.06], [842.9, 395.1, 1.8, 0.09, 846.8, 390.9, 2, 0.32, 848.1, 386.1, 2, 0.56, 847.9, 383.9, 2, 0.65, 847.2, 382.6, 1.8, 0.64, 843, 379.8, 2.2, 0.09]], "49.04": [[795.9, 456.9, 1.2, 0.12, 794.6, 450.1, 3.5, 0.09, 796.8, 443.3, 3.5, 0.07, 794.6, 436.5, 1, 0.07, 794.6, 429.7, 3.5, 0.03, 796.1, 422.9, 3.5, 0.05, 796.8, 416.1, 3.5, 0.03, 796, 409.3, 2.8, 0.02, 796, 402.6, 3.5, 0.03, 794.5, 395.8, 2, 0.02, 794.7, 389, 2, 0.01, 796.7, 382.2, 3.5, 0.02, 795.2, 375.4, 1.5, 0.01, 796.7, 368.6, 1.5, 0.01, 795.7, 361.8, 2, 0.01, 795.9, 355, 3.5, 0.01, 795.7, 348.2, 2, 0.01, 796.7, 341.5, 2, 0.01, 794.6, 334.7, 1.8, 0, 795.9, 327.9, 2, 0, 795.9, 325.9, 3.5, 0, 797.5, 326.4, 1.5, 0, 804.3, 326.6, 2.5, 0.01, 811.3, 324.9, 2.2, 0.02, 818.2, 324.6, 2.8, 0.01, 825.2, 326.6, 2.5, 0, 832.1, 325.1, 3.5, 0, 839.1, 324.6, 1, 0.01, 846, 325.9, 3.5, 0.01, 853, 325.9, 2, 0, 859.9, 326.1, 3.2, 0.01, 866.9, 326.6, 3.5, 0.01, 873.8, 326.6, 3, 0.01, 880.8, 326.1, 3.5, 0.01, 887.7, 324.6, 0.6, 0, 894.7, 326.4, 3.2, 0.01, 901.5, 326.6, 2.8, 0, 903.6, 324.6, 1.2, 0.01, 902.1, 326.6, 2.8, 0, 904.4, 333.1, 2, 0.01, 904.4, 339.8, 1, 0.02, 902.6, 346.6, 3.5, 0.02, 903.9, 353.3, 2, 0.01, 902.6, 360.1, 3, 0.01, 903.1, 366.8, 2.5, 0.01, 902.1, 373.5, 3.5, 0.02, 904.4, 380.3, 3.5, 0.03, 902.9, 387, 3.5, 0.05, 904.4, 393.8, 0.8, 0.04, 903.4, 400.5, 2.8, 0.06, 902.1, 407.2, 3.5, 0.03, 902.1, 414, 3.5, 0.05, 902.1, 420.7, 3.2, 0.08, 902.6, 427.4, 3.5, 0.06, 902.4, 434.2, 2.8, 0.06, 902.9, 440.9, 3.5, 0.06, 904.4, 447.6, 3.5, 0.06, 904.4, 454.4, 1.2, 0.05, 904.4, 461.1, 3.5, 0.04], [834.2, 399.7, 1.2, 0.09, 831.1, 401.9, 2, 0.32, 827.8, 405.2, 2, 0.3, 824.4, 408.4, 1.8, 0.48, 822.1, 412.8, 2, 0.77, 821.9, 416.1, 2, 0.73, 822.2, 418, 2, 0.61, 825.1, 422, 1.8, 0.3, 830.6, 425.8, 1.8, 0.28, 832.8, 426.9, 2, 0.32, 837.3, 430, 2, 0.28, 839.6, 432.2, 2.2, 0.52, 840.9, 435.9, 2.2, 0.5, 839.4, 440.3, 2.5, 0.52, 835.7, 445.2, 1.8, 0.14], [836.6, 462, 3.5, 0.18, 836.1, 460.8, 2.2, 0.2, 836, 457.9, 2, 0.3, 836.8, 453.8, 1.8, 0.35, 838.8, 451.4, 1.8, 0.39, 841.4, 448.6, 2.2, 0.35, 844.5, 446.3, 1.8, 0.21, 848.6, 441.4, 2.5, 0.21, 849.8, 436.9, 2.2, 0.82, 850.4, 435.4, 2, 0.83, 849.7, 429.9, 2, 0.37, 847.9, 425.5, 1.5, 0.4, 844.9, 422.9, 1.5, 0.39, 839, 419.7, 1.8, 0.27, 836.1, 417.1, 1.8, 0.44, 833.3, 413.6, 2, 0.65, 833.2, 411.7, 1.8, 0.83, 835.7, 407, 1.8, 0.84, 838.1, 404.1, 1.8, 0.78, 841.9, 401.3, 1.5, 0.48, 847.9, 397.9, 2, 0.15, 853.6, 394.1, 2.2, 0.19, 855.3, 392.4, 1.8, 0.23, 858, 386.5, 2, 0.53, 857, 383.9, 3, 0.06, 859.2, 380.8, 2.5, 0.08, 857.8, 378.3, 2.2, 0.14], [844.1, 393.4, 1.8, 0.12, 846.3, 391.1, 2, 0.25, 848.6, 385.6, 2.2, 0.53, 848.2, 382.5, 2, 0.7, 846.9, 380.4, 2, 0.4, 848, 382, 3.5, 0.7]], "49.12": [[795.9, 454.9, 2.5, 0.15, 794.6, 448.2, 3.5, 0.09, 794.6, 441.5, 1.2, 0.09, 796.8, 434.8, 3.5, 0.07, 796.8, 428.1, 3.5, 0.05, 794.6, 421.5, 1, 0.03, 795.3, 414.8, 3, 0.02, 794.8, 408.1, 1.5, 0.02, 796.8, 401.4, 2.8, 0.02, 796.3, 394.7, 3.5, 0.01, 796.7, 388, 3.5, 0.01, 795.2, 381.3, 2, 0.01, 796.7, 374.7, 2, 0.02, 794.7, 368, 1, 0.01, 794.7, 361.3, 3.5, 0.03, 796.4, 354.6, 3.5, 0.02, 796.7, 347.9, 3, 0.01, 796.7, 341.2, 2.8, 0.01, 795.6, 334.6, 2, 0.01, 796.6, 328, 3.2, 0.01, 796.7, 326.6, 2.8, 0.01, 797.5, 326.6, 3, 0.01, 804.3, 324.6, 3.5, 0.01, 811.3, 324.6, 2.8, 0.01, 818.2, 326.6, 1.5, 0.01, 825.2, 324.6, 3.5, 0.01, 832.1, 324.6, 2.5, 0.01, 839.1, 326.6, 3, 0.01, 846, 326.6, 2.5, 0, 853, 324.6, 3.5, 0.01, 859.9, 326.6, 3.2, 0.01, 866.9, 326.6, 2.5, 0.01, 873.8, 326.6, 3.5, 0.01, 880.8, 326.6, 3.5, 0.01, 887.7, 326.1, 3.5, 0, 894.7, 326.6, 2.5, 0.01, 901.6, 324.6, 0.8, 0.01, 903.1, 325.4, 2, 0.01, 903.9, 326.4, 1.8, 0.01, 903.4, 333.1, 2, 0.01, 904.1, 339.8, 1.2, 0.01, 902.1, 346.6, 3.5, 0.02, 904.4, 353.3, 3.2, 0.01, 904.4, 360.1, 1, 0.01, 902.1, 366.8, 2.8, 0.01, 902.6, 373.5, 3, 0.03, 903.6, 380.3, 3.5, 0.04, 902.1, 387, 2.8, 0.02, 904.4, 393.8, 3.5, 0.04, 902.4, 400.5, 3.5, 0.06, 904.4, 407.2, 2.8, 0.06, 902.9, 414, 3.5, 0.06, 902.4, 420.7, 3, 0.07, 902.1, 427.4, 3.5, 0.06, 904.4, 434.2, 0.8, 0.06, 902.1, 440.9, 3.5, 0.02, 902.9, 447.6, 3, 0.04, 902.6, 454.4, 3.5, 0.04, 904.4, 461.1, 1.2, 0.04], [838.3, 462.5, 2, 0.32, 836.9, 460.8, 2, 0.21, 836.1, 459.2, 2, 0.23, 836.2, 455.6, 1.8, 0.35, 836.7, 453.6, 2, 0.36, 838, 451.6, 1.8, 0.43, 840.7, 449, 2, 0.38, 843, 446, 2.2, 0.3, 845.9, 442.6, 3, 0.12, 849.1, 439.4, 2.2, 0.31, 850.8, 435.8, 2.2, 0.87, 851, 433.2, 2.2, 0.73, 850.2, 427.3, 2, 0.35, 847.5, 423.6, 1.8, 0.28, 845.6, 421.8, 2, 0.3, 841.5, 419.3, 1.8, 0.2, 837.4, 416.8, 1.5, 0.3, 833.6, 412.9, 2, 0.53, 833.2, 411.1, 2, 0.75, 835.1, 406.2, 2, 0.85, 837.9, 402.8, 2, 0.77, 841.5, 400.2, 1.5, 0.51, 847.5, 397.1, 2, 0.17, 853.1, 393.4, 2.2, 0.18, 854.7, 391.9, 1.5, 0.24, 857.2, 388.7, 2.2, 0.14, 858.6, 384.8, 2, 0.42, 857.3, 381, 3, 0.08, 856.9, 377.1, 1.8, 0.09], [833.9, 399.1, 1.2, 0.17, 831.2, 400.5, 1.5, 0.32, 828.1, 403.5, 1.5, 0.27, 825, 406.4, 1.8, 0.42, 822.1, 411.3, 1.8, 0.79, 821.5, 414.6, 2.2, 0.77, 822.4, 417.7, 1.8, 0.62, 825.1, 421.1, 1.8, 0.3, 829.3, 424.1, 1.8, 0.22, 833.9, 426.4, 2, 0.29, 838.1, 429.3, 2, 0.35, 839.8, 431.7, 2.2, 0.53, 840.6, 434.4, 2.2, 0.53, 839.4, 439.5, 2.2, 0.53, 836, 443.7, 1.8, 0.15], [843.1, 392.4, 2, 0.07, 844.6, 391.7, 1.5, 0.15, 846.3, 390.1, 2, 0.27, 849, 385.5, 2.2, 0.43, 848.7, 381.9, 2, 0.65, 847.9, 380.1, 2, 0.68, 847.3, 379.5, 2.2, 0.48]], "49.20": [[796.1, 452.6, 2.8, 0.14, 795.4, 445.7, 3.5, 0.08, 795.1, 438.8, 3.5, 0.06, 794.6, 431.8, 0.8, 0.06, 794.6, 424.9, 1.2, 0.04, 796.1, 418, 3.5, 0.02, 796.6, 411, 2, 0.02, 796.6, 404.1, 3.5, 0.02, 796.1, 397.2, 3.2, 0.01, 794.6, 390.2, 2, 0.01, 794.9, 383.3, 3.5, 0.02, 795.4, 376.4, 3.5, 0.01, 794.6, 369.5, 2.8, 0.01, 795.6, 362.5, 1.8, 0, 796.6, 355.6, 3.5, 0.01, 796.6, 348.7, 3, 0.01, 796.6, 341.7, 2, 0.01, 794.6, 334.8, 1.5, 0, 796.6, 328, 3.5, 0, 796.1, 326.1, 3.5, 0, 797.5, 326.6, 1.5, 0, 804.3, 324.6, 3.5, 0.01, 811.3, 324.6, 1.5, 0.01, 818.2, 326.6, 3, 0.01, 825.2, 326.6, 3.5, 0, 832.1, 325.1, 3.5, 0, 839.1, 326.6, 3, 0.01, 846, 326.6, 3, 0.01, 853, 324.6, 2.8, 0, 859.9, 326.6, 1.5, 0, 866.9, 326.1, 3.5, 0.01, 873.8, 324.6, 3.5, 0.01, 880.8, 326.6, 2.5, 0, 887.7, 326.6, 3, 0, 894.7, 326.6, 3, 0, 901.6, 324.6, 0.8, 0.01, 903.1, 325.4, 2, 0.01, 903.9, 326.4, 1.8, 0.01, 903.4, 333.1, 2, 0.01, 903.1, 339.8, 2.5, 0.02, 902.1, 346.6, 2.2, 0, 902.4, 353.3, 2.8, 0.01, 902.6, 360, 3.5, 0.03, 904.4, 366.7, 1, 0.01, 904.4, 373.4, 0.8, 0.01, 904.4, 380.2, 3.5, 0.01, 902.1, 386.9, 3, 0.04, 902.4, 393.6, 3.5, 0.03, 903.1, 400.4, 3.5, 0.06, 902.1, 407.1, 3.2, 0.04, 903.1, 413.8, 3.5, 0.05, 904.4, 420.5, 3.5, 0.08, 904.4, 427.2, 3.5, 0.06, 904.4, 434, 3.5, 0.06, 902.4, 440.7, 3.2, 0.07, 904.4, 447.4, 3.5, 0.04, 904.4, 454.2, 3.5, 0.03, 904.1, 460.9, 3.5, 0.04], [831.1, 448.1, 3, 0.12, 829.2, 454.6, 2.2, 0.38, 830.1, 456.7, 1.8, 0.52, 831.1, 458.4, 1.8, 0.37], [831.2, 457.2, 3.5, 0.36, 834.3, 457.2, 2.5, 0.12, 835.9, 456.8, 2.2, 0.35, 836.3, 452.8, 2.2, 0.41, 837.6, 450.9, 2, 0.43, 839.9, 448.2, 1.8, 0.4, 843.2, 445.4, 2, 0.3, 846.7, 442.8, 2.5, 0.1, 849.7, 438.4, 2.2, 0.21, 851.6, 433.4, 2.2, 0.8, 852.2, 432.1, 2, 0.78, 851.3, 427.6, 2, 0.28, 848.8, 422.9, 1.8, 0.28, 845.9, 420.1, 2.2, 0.32, 841.4, 417.4, 1.8, 0.16, 836.9, 414.7, 1.8, 0.29, 833.6, 411.1, 1.8, 0.5, 833.2, 409.7, 1.8, 0.71, 834.9, 404.7, 2, 0.77, 837.8, 400.8, 2, 0.74, 843.1, 397, 1.8, 0.49, 848.9, 394.1, 2.2, 0.09], [833.1, 397.4, 1.5, 0.13, 829.9, 400.3, 1.5, 0.35, 826.6, 403.2, 1.8, 0.32, 824.2, 405.9, 1.8, 0.4, 822.1, 409, 2, 0.61, 821.7, 410, 2, 0.66, 821.1, 412.1, 2, 0.72, 821.8, 415.8, 1.8, 0.69, 824.4, 419.6, 1.8, 0.47, 828.7, 422.6, 1.8, 0.33, 833.3, 425, 1.8, 0.24, 837.6, 428.1, 2.2, 0.26, 839.8, 430.3, 2, 0.51, 840.1, 431.6, 2.5, 0.5, 840.2, 436.4, 2, 0.47, 837.6, 440.6, 2, 0.44, 835.6, 443, 1.8, 0.13], [844.1, 391.1, 1.8, 0.12, 846, 389.9, 2.2, 0.28, 848.9, 385.5, 1.8, 0.4, 849.3, 381.1, 2.2, 0.6, 849.1, 380, 1.8, 0.68, 847.9, 378, 1.8, 0.47], [853.8, 391.7, 1.8, 0.08, 856.5, 388, 1.8, 0.17, 858.7, 383.4, 2, 0.37, 858.2, 380.1, 1.8, 0.11, 857.1, 376.1, 1.8, 0.1]], "49.28": [[796.6, 449.6, 3.5, 0.1, 796.6, 442.9, 3.5, 0.08, 795.1, 436.1, 2, 0.07, 796.6, 429.3, 3.5, 0.05, 795.1, 422.6, 3.5, 0.05, 796.6, 415.8, 3.2, 0.03, 796.1, 409, 1.8, 0.04, 796.4, 402.3, 3.5, 0.02, 794.6, 395.5, 1.5, 0.03, 794.6, 388.8, 3.5, 0.01, 796.6, 382, 3.5, 0.01, 796.6, 375.2, 3.5, 0.01, 794.6, 368.5, 0.6, 0, 795.1, 361.7, 1.5, 0.01, 796.6, 354.9, 2.8, 0.01, 795.9, 348.2, 3, 0.02, 794.6, 341.4, 0.6, 0, 795.4, 334.6, 3.5, 0, 796.6, 328, 3.5, 0, 794.6, 324.8, 0.8, 0.01, 797.4, 324.6, 0.6, 0.01, 804.3, 326.6, 3.5, 0, 811.3, 326.1, 3.5, 0, 818.2, 324.6, 0.6, 0.01, 825.2, 324.6, 1, 0.03, 832.1, 325.6, 3.5, 0.02, 839.1, 325.9, 2, 0, 846, 326.6, 2.8, 0, 853, 324.6, 3.5, 0, 859.9, 326.6, 3.5, 0.01, 866.9, 324.6, 3.5, 0, 873.8, 326.1, 2.8, 0.01, 880.8, 326.6, 3.5, 0.01, 887.7, 324.6, 3.5, 0.01, 894.7, 326.4, 2, 0.01, 901.6, 324.6, 0.8, 0.01, 903.1, 325.4, 2, 0.01, 903.9, 326.4, 1.8, 0.01, 903.4, 333.1, 2, 0.01, 904.3, 339.9, 2, 0.01, 902.8, 346.6, 3.5, 0.01, 904.3, 353.3, 2.5, 0.02, 903.3, 360.1, 2.5, 0.01, 904.3, 366.8, 1.8, 0.02, 904.3, 373.5, 0.8, 0.02, 904.3, 380.3, 3.5, 0.03, 904.3, 387, 3.5, 0.03, 902.5, 393.7, 2, 0.05, 903, 400.5, 3.5, 0.06, 904.5, 407.2, 1.5, 0.06, 903.7, 414, 3.5, 0.06, 903.2, 420.7, 2.8, 0.06, 903.7, 427.4, 2.5, 0.12, 901.9, 434.2, 3.2, 0.07, 904.4, 440.9, 3.5, 0.06, 904.4, 447.7, 0.8, 0.06, 902.1, 454.4, 3.5, 0.04, 903.9, 461.1, 3, 0.05], [829.4, 449.2, 3.5, 0.07, 829, 453.1, 2.2, 0.4, 829.7, 455.4, 1.8, 0.6, 831, 457.3, 2.2, 0.43, 833.3, 458.9, 1.8, 0.13], [833.1, 396.1, 1.5, 0.12, 829.5, 399.4, 2, 0.35, 826, 402.6, 1.8, 0.33, 822.2, 407.5, 2, 0.61, 821.7, 409.2, 2, 0.67, 821.1, 411.9, 2, 0.73, 821.8, 414.8, 2, 0.68, 824.7, 418.6, 1.8, 0.46, 828.7, 421.7, 1.8, 0.34, 833.2, 424.2, 2, 0.34, 837.6, 426.9, 2.2, 0.31, 839.8, 429.8, 2.2, 0.49, 840.6, 434.4, 2.8, 0.44, 839.6, 436.5, 2.5, 0.52, 837.5, 439.3, 2, 0.46, 835.1, 441.9, 2.2, 0.15], [846.9, 393.1, 2.2, 0.17, 843.7, 394.8, 1.8, 0.41, 840.9, 396.8, 1.8, 0.58, 838.3, 399.3, 1.8, 0.72, 835.9, 402, 2, 0.72, 833.2, 407.7, 1.8, 0.72, 833.9, 410, 1.8, 0.46, 836.7, 413.7, 1.5, 0.32, 840.1, 415.8, 2, 0.24, 845.6, 418.5, 2, 0.32, 848.9, 421.1, 1.8, 0.28, 851.7, 425, 2, 0.29, 852.7, 429.4, 2, 0.41, 851.9, 433.7, 1.8, 0.82, 850.4, 437.2, 2, 0.34, 848.5, 440.4, 3.2, 0.09, 846.5, 442.9, 2.5, 0.12, 842.8, 445.5, 2, 0.35, 839.4, 448.4, 2, 0.39, 836.4, 452.1, 2, 0.44, 836.1, 455.6, 1.8, 0.42, 836.5, 457.1, 2, 0.4, 838.1, 460.2, 1.8, 0.41, 839.5, 462.2, 2.2, 0.45], [844.3, 390.3, 2, 0.11, 846.3, 388.8, 1.8, 0.29, 849.1, 384.8, 1.8, 0.41, 849.9, 379.1, 2.2, 0.62, 849.4, 378.1, 2, 0.6, 848.8, 377.8, 2.2, 0.54]], "49.36": [[794.6, 447.7, 0.6, 0.18, 795.1, 446.3, 3.5, 0.11, 796.6, 439.4, 3, 0.08, 795.9, 432.4, 2.2, 0.07, 796.6, 425.5, 3.5, 0.06, 796.6, 418.5, 3.5, 0.02, 794.6, 411.5, 3.5, 0.03, 795.1, 404.6, 3.5, 0.02, 796.6, 397.6, 3.5, 0.02, 796.4, 390.6, 3.5, 0.01, 796.1, 383.6, 3.5, 0.01, 795.9, 376.7, 3.5, 0.01, 794.6, 369.7, 0.6, 0.01, 795.4, 362.7, 3.5, 0, 796.6, 355.8, 3.5, 0, 795.9, 348.8, 1.5, 0.01, 794.6, 341.8, 3.5, 0, 794.6, 334.8, 0.6, 0, 794.6, 327.9, 3.5, 0.01, 796.7, 326.6, 2.8, 0.01, 797.5, 326.6, 3.2, 0.01, 804, 326.6, 3, 0.02, 810.5, 325.9, 3.5, 0.01, 817.1, 326.6, 2.8, 0.01, 823.7, 325.7, 3.5, 0.01, 830.3, 325.9, 2, 0.01, 836.8, 325.9, 3.5, 0, 843.4, 324.9, 1.8, 0.03, 850, 324.9, 3.5, 0, 856.6, 326.7, 2.5, 0, 863.2, 326.7, 3.5, 0, 869.7, 325.5, 3.5, 0.01, 876.3, 325.2, 1.5, 0.01, 882.9, 326.7, 3.5, 0.01, 889.5, 326, 3.5, 0.01, 896, 324.7, 3.5, 0, 902.6, 324.7, 3.5, 0, 904.4, 324.6, 0.6, 0, 903.6, 326.4, 2.8, 0, 902.9, 333.1, 3.5, 0, 902.9, 339.8, 3.5, 0, 903.1, 346.6, 3.5, 0.02, 902.1, 353.3, 2.8, 0.02, 904.4, 360.1, 3.5, 0.01, 902.1, 366.8, 2.8, 0.01, 904.4, 373.5, 0.6, 0.02, 904.4, 380.3, 0.6, 0.01, 902.9, 387, 3.5, 0.02, 902.9, 393.8, 3.5, 0.04, 903.4, 400.5, 2.2, 0.06, 904.4, 407.2, 3.5, 0.05, 903.1, 414, 2.5, 0.06, 902.1, 420.7, 3.5, 0.06, 902.1, 427.4, 3.5, 0.05, 903.4, 434.2, 2.2, 0.06, 904.4, 440.9, 3.5, 0.06, 903.1, 447.6, 1.8, 0.03, 903.1, 454.4, 2.5, 0.04, 903.1, 461.1, 2.5, 0.03], [833.4, 393.9, 1.5, 0.1, 830.1, 397.5, 1.8, 0.33, 825.9, 401.1, 1.8, 0.3, 822.1, 405.9, 1.8, 0.55, 821.3, 407.7, 1.8, 0.62, 820.9, 410.4, 2, 0.67, 821.8, 414, 2, 0.65, 824.6, 417.6, 1.8, 0.43, 828.1, 420.3, 1.8, 0.42, 833.1, 422.8, 2, 0.32, 837.9, 425.8, 2, 0.34, 839.1, 427.3, 2, 0.48, 840, 428.9, 2.5, 0.48, 840.8, 432.3, 2.2, 0.44, 839.3, 435.6, 2.2, 0.53, 836.4, 439.1, 2, 0.36, 832.8, 442.2, 3, 0.1, 829, 446.9, 2.2, 0.13, 828, 450.6, 2.8, 0.3, 828.7, 453.5, 2, 0.58, 830.7, 455.9, 2.2, 0.41, 832.2, 457.3, 3.5, 0.26, 836.3, 456.4, 3.5, 0.48, 836.4, 451.1, 2, 0.44, 837.3, 449.6, 2, 0.46, 840.1, 446.5, 2, 0.41, 843.8, 443.4, 2.2, 0.32, 847.2, 440, 3.5, 0.09, 849.5, 437.4, 2.2, 0.12, 851.3, 434.2, 2, 0.46, 852.5, 431.1, 2.2, 0.75, 852.4, 425.6, 2.2, 0.33, 851.1, 422.1, 2, 0.24, 849.8, 420.1, 1.8, 0.26, 845.4, 416.2, 2, 0.31, 840.4, 413.8, 2, 0.21, 836.7, 411.7, 1.5, 0.31, 833.8, 408.4, 1.5, 0.4, 833, 406.4, 1.8, 0.67, 833.5, 404.1, 2.2, 0.67, 835.6, 400.4, 2, 0.71, 837.9, 397.6, 1.8, 0.74, 840.4, 394.9, 1.8, 0.62, 843.9, 392.5, 1.5, 0.38, 845.8, 391.1, 2.8, 0.24, 845.5, 387.9, 2, 0.27, 848.1, 385.3, 2.2, 0.29, 849.9, 382.1, 1.5, 0.39, 850, 378.4, 1.8, 0.51, 849.6, 375.6, 1.8, 0.42, 849.6, 374.8, 2, 0.26]], "49.44": [[794.6, 442.6, 3, 0.11, 796.6, 435.9, 3.5, 0.08, 795.6, 429.1, 3.2, 0.11, 794.6, 422.4, 3.5, 0.03, 796.6, 415.6, 3.5, 0.02, 796.6, 408.9, 3.5, 0.02, 794.6, 402.1, 1, 0.02, 796.6, 395.4, 3.5, 0.04, 794.6, 388.6, 0.6, 0.01, 795.4, 381.9, 2, 0.01, 796.6, 375.1, 3.5, 0.01, 794.6, 368.4, 0.8, 0.02, 796.6, 361.6, 2, 0.01, 794.6, 354.9, 0.6, 0, 796.6, 348.1, 3.5, 0.01, 794.6, 341.4, 1.8, 0.01, 796.1, 334.6, 1.8, 0, 796.4, 328, 3.2, 0.01, 796.7, 326.6, 2.8, 0, 797.5, 326.6, 2.2, 0, 804, 326.6, 3, 0.01, 810.5, 326.4, 3.2, 0.01, 817.1, 325.9, 3, 0.01, 823.7, 326.2, 1.5, 0, 830.3, 326.2, 1.8, 0.01, 836.8, 325.9, 2, 0, 843.4, 325.7, 1.8, 0, 850, 324.7, 1, 0.01, 856.6, 324.7, 2, 0, 863.2, 326.7, 2.5, 0, 869.7, 326.7, 3.5, 0.01, 876.3, 326.7, 3.2, 0.01, 882.9, 324.7, 0.6, 0.01, 889.5, 326.7, 3, 0.02, 896, 324.7, 2.5, 0.01, 902.5, 326.2, 3.5, 0.01, 904.4, 324.6, 3.5, 0.01, 902.9, 326.4, 3.2, 0.01, 902.1, 333.1, 3.5, 0.02, 902.1, 339.8, 3.5, 0.02, 902.1, 346.6, 2.2, 0, 903.3, 353.3, 2, 0, 904.3, 360.1, 1, 0.02, 903.1, 366.8, 2, 0, 902, 373.5, 2.8, 0.02, 903, 380.3, 2.5, 0.03, 904, 387, 3.5, 0.05, 904, 393.8, 3.5, 0.05, 902, 400.5, 3.5, 0.07, 904.5, 407.2, 1.5, 0.05, 903, 414, 1.2, 0.09, 902, 420.7, 3.5, 0.07, 901.9, 427.4, 3, 0.06, 901.9, 434.2, 3.5, 0.07, 904.4, 440.9, 0.8, 0.07, 904.4, 447.7, 0.6, 0.04, 902.9, 454.4, 3.5, 0.04, 903.4, 461.1, 2.5, 0.08], [833.1, 457.9, 2.5, 0.18, 829.4, 454.2, 2, 0.52, 827.9, 451.6, 2, 0.53, 827.9, 449.6, 2.2, 0.32, 829, 446.1, 2.2, 0.13, 831.2, 443.5, 3, 0.14, 835.3, 439.1, 2.2, 0.22, 839.2, 434.6, 2.2, 0.52, 840.9, 430.9, 2.5, 0.45, 839.7, 426.9, 2.8, 0.5, 838.6, 425.7, 2, 0.49, 834.9, 422.9, 1.8, 0.27, 830.9, 420.5, 1.8, 0.35, 826.9, 418.1, 2, 0.36, 822.7, 413.9, 2, 0.61, 821.9, 412.4, 2, 0.68, 820.9, 409.1, 2, 0.66, 821.3, 406.4, 2, 0.61, 822, 405, 2, 0.57, 825.9, 399.9, 1.8, 0.3, 830.3, 395.8, 2, 0.34, 833.3, 392.3, 1.8, 0.09], [851.3, 435, 2, 0.17, 852.9, 430.7, 2, 0.72, 853.4, 429.1, 2.2, 0.72, 853.2, 424.4, 2.2, 0.37, 851.5, 420.1, 1.8, 0.24, 848.5, 416.4, 2, 0.29, 843.7, 413.8, 2, 0.23, 838.9, 411.5, 1.8, 0.2, 835.9, 409.3, 1.5, 0.29, 834, 406.7, 1.5, 0.39, 833, 405.1, 1.8, 0.64, 833.4, 402.9, 2, 0.65, 835.6, 398.8, 1.8, 0.65, 837.9, 395.9, 2, 0.69, 840.4, 393.2, 1.8, 0.61, 845.7, 389.5, 2, 0.34, 846, 386.4, 2.2, 0.29, 849.9, 382, 2, 0.34, 851, 378.9, 2, 0.28, 850.9, 375.9, 2, 0.39, 849.9, 374.1, 2.2, 0.26, 849.6, 373.4, 2, 0.19], [847.4, 440.2, 3.5, 0.12, 843.3, 442.9, 2, 0.37, 839.7, 446.1, 1.8, 0.41, 837.3, 448.7, 2, 0.45, 836.4, 450.8, 1.8, 0.46, 836.1, 453.6, 1.8, 0.48, 836.3, 455.3, 2, 0.5, 839.6, 459.5, 1.8, 0.49, 840.7, 460.4, 3.5, 0.48, 840, 457.7, 3.5, 0.12]], "49.52": [[795.1, 438.4, 2.5, 0.12, 795.9, 431.5, 3, 0.08, 795.9, 424.6, 3.5, 0.06, 796.4, 417.7, 3.5, 0.04, 795.4, 410.8, 2.2, 0.04, 794.6, 403.8, 1.8, 0.02, 794.6, 396.9, 2.8, 0.01, 796.6, 390, 3.5, 0.03, 796.6, 383.1, 3.5, 0.02, 796.6, 376.2, 3.5, 0.01, 794.6, 369.3, 3.5, 0.01, 796.6, 362.4, 3.5, 0.01, 796.6, 355.5, 2.5, 0, 794.6, 348.6, 3.5, 0, 796.6, 341.7, 3.5, 0, 796.6, 334.8, 1.5, 0, 796.6, 328, 3.5, 0, 796.7, 326.6, 3.5, 0, 797.4, 324.9, 3.5, 0, 804, 326.6, 3, 0.01, 810.5, 326.6, 2.2, 0.01, 817.1, 324.6, 1, 0.01, 823.7, 326.7, 3.5, 0, 830.3, 325.9, 1.8, 0.01, 836.8, 324.7, 3.5, 0.01, 843.4, 325.7, 2.2, 0.01, 850, 326.7, 3.5, 0, 856.6, 326.7, 3, 0, 863.2, 326.7, 3.5, 0, 869.7, 326.7, 3.5, 0.01, 876.3, 326.7, 3.5, 0.01, 882.9, 326.7, 3.2, 0.02, 889.5, 324.7, 1, 0.01, 896, 326.7, 2.5, 0, 902.5, 326.7, 2.8, 0.02, 902.2, 326.6, 2.8, 0.02, 902.1, 326.5, 3.2, 0.02, 902.1, 333.1, 2.8, 0, 904.4, 339.8, 0.6, 0, 902.1, 346.6, 2.5, 0.01, 902.4, 353.3, 3.5, 0.01, 902.9, 360.1, 3.5, 0.01, 902.4, 366.8, 2.8, 0.03, 904.4, 373.5, 1.2, 0.02, 903.4, 380.3, 2, 0.03, 904.1, 387, 1, 0.02, 902.9, 393.8, 3.2, 0.04, 903.4, 400.5, 2.2, 0.07, 902.1, 407.2, 3.5, 0.07, 902.1, 414, 2.2, 0.05, 904.1, 420.7, 2.5, 0.06, 904.4, 427.4, 2.2, 0.09, 903.4, 434.2, 3.5, 0.07, 902.1, 440.9, 3.5, 0.05, 902.4, 447.6, 3, 0.06, 902.1, 454.4, 3.5, 0.04, 903.1, 461.1, 2.8, 0.04], [832, 456.1, 2, 0.28, 830.5, 455.2, 2, 0.37, 828.1, 451.7, 2, 0.59, 827.5, 450.1, 2, 0.62, 827.1, 448.6, 2.5, 0.48, 828.8, 444.3, 2.2, 0.17, 830.2, 442.6, 2, 0.18, 833.8, 438.9, 1.8, 0.28, 837.7, 435.6, 1.5, 0.51, 839.6, 432.8, 2.2, 0.48, 841.1, 429.3, 2.8, 0.4, 840, 425.7, 3, 0.48, 839, 424.8, 2.5, 0.54, 835.4, 421.5, 1.8, 0.38, 831.3, 419.5, 2, 0.34, 827.4, 417.1, 2.2, 0.37, 824.6, 415, 1.5, 0.47, 822.5, 412.1, 2, 0.66, 821.7, 410.7, 1.8, 0.75, 820.9, 406.6, 2, 0.73, 821.3, 404.7, 2, 0.62, 823.2, 401.6, 1.8, 0.41, 825.4, 398.6, 1.8, 0.28, 828.1, 396.2, 1.5, 0.29, 830.8, 393.8, 1.8, 0.25, 832.2, 390.8, 1.5, 0.12], [851.1, 371.3, 2, 0.14, 851.9, 373.8, 2, 0.27, 852, 377.3, 2.2, 0.22, 848.8, 383.1, 2.5, 0.31, 844.6, 387.4, 1.8, 0.44, 840, 391.4, 1.8, 0.61, 835.9, 395.9, 1.5, 0.67, 834.2, 399.2, 1.8, 0.54, 833, 402.7, 2, 0.63, 833.4, 404.2, 1.8, 0.44, 836.1, 407.8, 1.5, 0.31, 839.1, 409.8, 2, 0.22, 844, 412.2, 2, 0.28, 847.3, 413.9, 1.8, 0.36, 850.1, 416.2, 1.8, 0.29, 852.2, 418.9, 1.8, 0.25, 853.6, 423.4, 2.2, 0.37, 853.6, 428.8, 2.2, 0.68, 851.4, 433.2, 2.2, 0.19, 847.7, 439, 2, 0.18, 843.6, 441.6, 2, 0.35, 839.9, 444.6, 1.8, 0.39, 836.8, 449.1, 2, 0.55, 836.1, 452.3, 2, 0.63, 837.1, 454.9, 1.8, 0.68, 840.4, 459.1, 2, 0.55]], "49.64": [[795.9, 434.4, 3, 0.09, 796.6, 427.7, 3.5, 0.07, 794.6, 421.1, 3, 0.06, 794.6, 414.4, 1, 0.05, 796.6, 407.8, 2.8, 0.02, 794.9, 401.1, 2.5, 0.01, 794.6, 394.4, 3.5, 0.01, 795.4, 387.8, 3.5, 0.02, 796.6, 381.1, 3.5, 0.02, 796.6, 374.5, 1.8, 0.01, 796.6, 367.8, 3.5, 0.01, 796.6, 361.2, 3.5, 0.03, 796.6, 354.5, 2.8, 0, 795.1, 347.8, 3.5, 0.01, 796.6, 341.2, 3.5, 0, 794.6, 334.5, 3.5, 0.01, 796.1, 328, 1, 0.01, 796.7, 326.6, 2.8, 0, 797.5, 326.1, 3.5, 0.01, 804, 326.1, 2.5, 0.01, 810.6, 326.6, 2.5, 0.01, 817.2, 326.2, 3.5, 0.01, 823.7, 326.7, 2.5, 0, 830.3, 326.2, 3.5, 0, 836.9, 326.7, 3.5, 0.01, 843.5, 324.9, 2, 0.02, 850.1, 326.7, 2.5, 0.01, 856.7, 325, 2.2, 0.02, 863.3, 326.7, 3.5, 0, 869.9, 326.7, 2.5, 0, 876.5, 325.7, 2.2, 0, 883.1, 325, 3.5, 0.02, 889.7, 324.5, 2, 0.01, 896.3, 326.5, 3, 0.01, 902.7, 326.8, 3.2, 0.01, 902.5, 326.5, 2.5, 0.01, 902.6, 326.4, 3.5, 0.01, 902.4, 333.1, 3, 0.01, 902.1, 339.8, 2.8, 0.01, 902.6, 346.6, 3.5, 0.01, 903.6, 353.3, 3.5, 0.01, 902.8, 360.1, 3, 0.02, 903.1, 366.8, 2, 0.02, 903, 373.5, 2.5, 0.02, 904, 380.3, 1.8, 0.05, 903, 387, 3.5, 0.04, 902.5, 393.7, 3.5, 0.03, 903.2, 400.5, 3.5, 0.07, 902.7, 407.2, 2.8, 0.06, 902, 414, 3.5, 0.06, 902.2, 420.7, 3.5, 0.07, 904.4, 427.4, 3.5, 0.05, 902.4, 434.2, 3.5, 0.07, 901.9, 440.9, 3.5, 0.07, 904.4, 447.7, 2.2, 0.05, 904.1, 454.4, 2.2, 0.05, 904.1, 461.1, 3, 0.06], [851.9, 370, 2, 0.15, 852.6, 372.4, 2.5, 0.18, 852.2, 376.4, 1.8, 0.22, 850.7, 379.6, 1.8, 0.28, 848.6, 382.6, 2, 0.37, 845.3, 384.9, 2, 0.45, 842.4, 387.5, 1.8, 0.43, 839.1, 390.3, 1.5, 0.6, 836.5, 393.7, 2, 0.61, 835.1, 394.8, 3.5, 0.57, 831.4, 392.4, 2.2, 0.23, 829.9, 393.5, 1.8, 0.28, 827.1, 396.2, 2, 0.22, 824.5, 399, 1.8, 0.27, 821, 404.2, 2.2, 0.68, 820.9, 406.1, 2, 0.76, 821.7, 409.4, 2, 0.74, 824.3, 413.3, 1.8, 0.52, 827.4, 415.7, 2, 0.37, 831.6, 418.1, 2, 0.35, 835.9, 420.4, 2, 0.45, 839.4, 423.4, 2.5, 0.56, 839.9, 424.7, 2.8, 0.46, 841.1, 428.6, 2.8, 0.39, 839.9, 431.7, 2.8, 0.45, 836.8, 435.4, 1.8, 0.49, 833, 438.4, 1.5, 0.3, 829.7, 441.9, 3, 0.2, 828.2, 443.8, 2.2, 0.16, 827.1, 447.6, 2, 0.43, 827.2, 449.4, 2, 0.61, 827.6, 450.7, 2, 0.6, 830.5, 454.5, 1.8, 0.34, 832.3, 455.1, 2, 0.28], [835.8, 394.1, 1.8, 0.61, 834.1, 397.2, 1.5, 0.49, 832.8, 400.6, 2, 0.62, 833.4, 402.2, 2, 0.44, 837.4, 406.8, 2.2, 0.26, 842.5, 409.9, 2, 0.21, 847.9, 412.5, 2, 0.39, 851, 415.1, 2, 0.29, 853.6, 419.3, 2, 0.26, 854.1, 422.1, 2.2, 0.38, 854.1, 426.6, 2.2, 0.64, 853.1, 430.2, 2, 0.44, 851.4, 433.6, 2.5, 0.12, 847.1, 438, 2.5, 0.19, 843.8, 440.7, 2, 0.36, 840.4, 443.4, 1.8, 0.41, 836.6, 448.3, 1.8, 0.55], [836.8, 453.1, 1.8, 0.62, 840.3, 458.1, 1.8, 0.59, 841.1, 459.3, 2, 0.52, 840.9, 460.2, 2.2, 0.44]], "49.72": [[796.6, 430.1, 3.5, 0.1, 794.6, 423.3, 3.5, 0.06, 794.9, 416.5, 3.5, 0.02, 794.9, 409.7, 3, 0.04, 796.6, 402.9, 3, 0.04, 794.6, 396, 0.6, 0, 796.6, 389.2, 3.5, 0.02, 794.6, 382.4, 1, 0.02, 794.6, 375.6, 3.5, 0.02, 796.6, 368.8, 3, 0.01, 796.1, 362, 3.5, 0, 794.6, 355.1, 0.6, 0, 794.6, 348.3, 3.5, 0.01, 795.4, 341.5, 3.5, 0.01, 794.6, 334.7, 1.5, 0, 796.6, 328, 2, 0.01, 796.8, 326.4, 3, 0.02, 797.4, 325.9, 3.5, 0.02, 804, 324.6, 1.2, 0.01, 810.6, 324.9, 3.5, 0.02, 817.2, 326.7, 3, 0.01, 823.7, 326.7, 2.5, 0, 830.3, 326.7, 2.5, 0.01, 836.9, 324.7, 3.5, 0.01, 843.5, 326.7, 3.5, 0, 850.1, 324.7, 1.5, 0.01, 856.7, 326.7, 3, 0.01, 863.3, 326.7, 3, 0, 869.9, 324.7, 3.5, 0.01, 876.5, 325, 3.5, 0.01, 883.1, 324.8, 3.5, 0, 889.7, 326.8, 2.8, 0.01, 896.3, 324.5, 1, 0.01, 902.9, 325, 1.8, 0.01, 904.4, 325, 2.5, 0.01, 903.1, 326.4, 1, 0.01, 902.1, 333.1, 2.8, 0, 902.9, 339.9, 3.5, 0, 902.1, 346.6, 2.8, 0.01, 902.1, 353.4, 3.5, 0.01, 904.1, 360.1, 1, 0.01, 902.9, 366.9, 3.5, 0.01, 903.1, 373.6, 3.5, 0.05, 904.4, 380.4, 1.8, 0.02, 904.1, 387.1, 2.5, 0.08, 904.4, 393.9, 3.5, 0.03, 904.1, 400.6, 2.2, 0.07, 902.1, 407.4, 3.2, 0.07, 904.4, 414.1, 1, 0.06, 904.4, 420.9, 2.5, 0.07, 902.1, 427.6, 2.5, 0.1, 902.9, 434.4, 3.5, 0.07, 902.1, 441.1, 3.2, 0.07, 902.9, 447.9, 3.5, 0.04, 902.1, 454.6, 3.2, 0.05, 902.9, 461.4, 3.5, 0.03], [831.4, 390.9, 1.8, 0.21, 828.2, 393.3, 1.5, 0.25, 825.4, 396.1, 1.8, 0.27, 821.7, 401.5, 2, 0.47, 820.6, 404.4, 2.2, 0.73, 821.2, 407.8, 2, 0.73, 822.1, 409.2, 2, 0.71, 825.5, 413.5, 1.5, 0.42, 830.4, 416.2, 2, 0.37, 835.4, 418.7, 1.8, 0.51, 839.4, 422.5, 2.8, 0.54], [834.3, 456.2, 2.2, 0.17, 830.3, 453.5, 2, 0.28, 827.3, 449.7, 2, 0.58, 826.9, 448.4, 2.2, 0.59, 827.2, 446.3, 2.2, 0.44, 828.2, 442.4, 2.5, 0.18, 830.2, 439.6, 3, 0.15, 835.1, 435.4, 1.8, 0.38, 839.6, 430.6, 2.5, 0.46], [851.9, 369.1, 2, 0.18, 852.1, 369.6, 2.2, 0.2, 852.7, 373.7, 2.2, 0.18, 851.7, 376.7, 2, 0.28, 850, 379.6, 1.8, 0.3, 848.1, 381.7, 1.8, 0.4, 844.8, 383.9, 1.8, 0.36, 841.4, 386.2, 1.5, 0.51, 838.6, 389.2, 1.5, 0.61, 835.9, 392, 1.5, 0.59, 833.8, 395.3, 1.8, 0.44, 832.8, 399.1, 2, 0.52, 833.8, 402.8, 1.5, 0.22, 836.4, 404.9, 1.2, 0.28, 842.4, 408.1, 2, 0.24, 848.4, 411.3, 1.8, 0.37, 850.1, 412.6, 1.8, 0.31, 852.8, 416.1, 2, 0.25, 854.3, 420.4, 2.5, 0.38, 854.2, 426.8, 2, 0.69, 851.4, 432.8, 2.2, 0.08, 848.7, 436, 2.5, 0.18, 843.7, 439.3, 1.8, 0.36, 839.4, 443.4, 2, 0.42, 836.7, 447.4, 1.8, 0.56, 836.2, 449.6, 2, 0.65, 836.8, 451.8, 2, 0.63, 838.6, 455, 2, 0.63, 840.8, 457.9, 2, 0.61, 841.6, 460.1, 2.2, 0.39]], "49.80": [[794.9, 426.8, 2.2, 0.08, 794.6, 426.1, 1.2, 0.09, 795.4, 419.6, 3.5, 0.06, 794.6, 413, 3.5, 0.06, 796.6, 406.5, 2.5, 0.03, 796.1, 399.9, 3.5, 0.01, 796.4, 393.4, 3.5, 0.02, 795.6, 386.8, 3, 0.06, 795.1, 380.3, 3.5, 0.02, 794.6, 373.7, 2.2, 0.02, 796.4, 367.2, 3, 0.01, 794.6, 360.6, 3.5, 0.01, 796.6, 354.1, 3.5, 0.01, 795.9, 347.5, 3.2, 0.02, 796.6, 341, 3.5, 0, 796.1, 334.4, 1.5, 0, 794.6, 327.9, 3.5, 0, 796.8, 326.4, 3.5, 0, 797.4, 324.6, 0.6, 0, 804, 324.6, 1, 0.01, 810.6, 326.6, 1.5, 0.01, 817.2, 326.7, 3.2, 0.01, 823.8, 324.7, 0.6, 0, 830.3, 324.7, 0.8, 0.01, 836.9, 324.7, 3.5, 0, 843.5, 325.4, 2, 0.01, 850.1, 324.7, 1, 0.01, 856.7, 326.7, 3.5, 0.01, 863.3, 325.7, 2.2, 0.01, 869.9, 324.7, 2, 0, 876.5, 324.5, 0.8, 0.01, 883.1, 326.8, 2.5, 0, 889.7, 326.8, 2.8, 0, 896.3, 324.5, 1, 0.01, 902.9, 324.5, 1, 0.02, 903.8, 325.5, 1.8, 0.01, 904.4, 326.4, 3.5, 0.01, 903.1, 333.1, 2.8, 0.02, 902.1, 339.8, 3, 0.01, 902.8, 346.6, 3.5, 0.03, 904.3, 353.3, 0.6, 0.01, 904.3, 360.1, 0.8, 0.01, 902.8, 366.8, 1.5, 0.01, 902.8, 373.5, 3.5, 0, 903.3, 380.3, 2.8, 0.03, 902.8, 387, 3.5, 0.02, 904.5, 393.8, 2.2, 0.04, 904.5, 400.5, 2.5, 0.07, 902.5, 407.2, 3, 0.07, 904.2, 414, 2.8, 0.06, 904.4, 420.7, 3.5, 0.06, 903.4, 427.4, 3.5, 0.09, 903.2, 434.2, 2.2, 0.06, 902.9, 440.9, 3.5, 0.07, 901.9, 447.6, 3.5, 0.05, 901.9, 454.4, 3, 0.06, 902.4, 461.1, 3, 0.04], [834.6, 455.3, 2.2, 0.17, 830.6, 452.6, 2, 0.25, 827.4, 449, 2.2, 0.59, 826.8, 447.9, 2.2, 0.59, 827.1, 445, 2, 0.44, 829.2, 439.6, 1.8, 0.25, 832.8, 436.2, 2, 0.34, 836.6, 433.1, 1.8, 0.51, 840.2, 429.4, 2, 0.48, 840.9, 426.9, 2.8, 0.38, 840.2, 421.9, 3, 0.41, 838.6, 420.1, 2, 0.61, 834, 416.7, 1.8, 0.41, 829.1, 413.9, 2, 0.36, 824.4, 410.7, 1.8, 0.49, 821.7, 407.1, 2, 0.73, 820.5, 404.3, 2, 0.72, 820.8, 401.6, 2.2, 0.59, 823.2, 397.1, 1.8, 0.38, 826.5, 393, 1.8, 0.23, 830.6, 389.6, 1.8, 0.25], [838.1, 459.9, 3.5, 0.24, 841.3, 459.5, 2.2, 0.39, 841.1, 457.6, 2, 0.55, 838.6, 454.1, 2, 0.64, 836.3, 450.5, 2.2, 0.64, 836.1, 447.6, 2, 0.62, 837.6, 444.6, 1.8, 0.48, 839.6, 442.1, 2, 0.42, 842.6, 439.2, 1.8, 0.41, 848.4, 435.3, 2.2, 0.17, 852.5, 429.9, 2.2, 0.19, 854.6, 424.8, 2.2, 0.66, 854.5, 419.6, 2.2, 0.38, 853.7, 414.4, 2.2, 0.26, 851.1, 411.6, 1.8, 0.3, 847.6, 409.1, 1.8, 0.47, 843.1, 407, 1.8, 0.23, 838.5, 405.2, 2, 0.18, 836.1, 403.3, 1.8, 0.27, 833.4, 401, 1.8, 0.19, 832.4, 397.4, 2, 0.48, 834.7, 392, 2, 0.49, 835.8, 390.3, 2, 0.58, 838.2, 387.5, 1.5, 0.6, 840.9, 385, 1.8, 0.5, 844.9, 382.1, 2, 0.35, 848.7, 379.1, 2, 0.36, 850.5, 377.4, 1.8, 0.27, 851.9, 375, 1.8, 0.23, 852.9, 371.2, 1.8, 0.15, 852.9, 369.2, 2, 0.14, 851.4, 367.4, 1.8, 0.11]], "49.88": [[794.6, 421.1, 3.5, 0.05, 796.4, 414.5, 3.5, 0.06, 794.6, 407.8, 2.8, 0.05, 795.9, 401.1, 3.5, 0.04, 796.6, 394.5, 2.8, 0.03, 794.6, 387.8, 1.5, 0.06, 796.1, 381.2, 3.5, 0.01, 796.6, 374.5, 2.5, 0.02, 796.6, 367.8, 2.5, 0.01, 796.6, 361.2, 3.5, 0.01, 794.6, 354.5, 3.5, 0.01, 794.6, 347.9, 0.6, 0.01, 796.6, 341.2, 3, 0.02, 796.6, 334.5, 2.8, 0, 796.6, 328, 3.5, 0.01, 796.1, 325.8, 1.5, 0.01, 797.4, 324.6, 2, 0.01, 804, 326.4, 3, 0.01, 810.6, 324.7, 0.6, 0, 817.2, 326.4, 3.2, 0.01, 823.8, 326.7, 2.5, 0, 830.4, 326.7, 2, 0.01, 837, 324.7, 3.5, 0, 843.6, 324.7, 0.6, 0, 850.2, 326.2, 3.2, 0.01, 856.9, 326.3, 2, 0.01, 863.5, 326, 3.5, 0.01, 870.1, 326.8, 3.5, 0.01, 876.7, 324.6, 1.2, 0.01, 883.3, 324.6, 3.5, 0.01, 889.9, 326.3, 3.5, 0.01, 896.5, 326.9, 3.5, 0, 903.2, 324.6, 1.2, 0.01, 902.1, 326.6, 2.8, 0.01, 903.1, 333.1, 2, 0, 903.1, 339.8, 3.5, 0.01, 902.9, 346.6, 3.5, 0.02, 902.9, 353.3, 1.2, 0.01, 904.4, 360.1, 1, 0.01, 903.6, 366.8, 3.2, 0.02, 902.9, 373.5, 3.5, 0.02, 902.1, 380.3, 2.8, 0.02, 904.4, 387, 1.5, 0.03, 904.1, 393.8, 3.5, 0.04, 902.1, 400.5, 3.5, 0.04, 904.4, 407.2, 1.2, 0.06, 902.4, 414, 3.5, 0.07, 904.4, 420.7, 3.5, 0.04, 903.6, 427.4, 3, 0.08, 902.6, 434.2, 3.5, 0.07, 902.9, 440.9, 3.5, 0.06, 902.9, 447.6, 3.5, 0.04, 902.9, 454.4, 3.5, 0.05, 902.6, 461.1, 2.2, 0.03], [832.9, 453.3, 2.8, 0.25, 830.6, 451.5, 1.8, 0.3, 826.9, 447.3, 1.8, 0.6, 827, 441.6, 2.5, 0.32, 827.8, 439.1, 2, 0.25, 832.4, 435.1, 1.8, 0.36, 836.5, 431.6, 1.5, 0.47, 840.2, 427.8, 2.2, 0.54, 841.1, 425.6, 2.8, 0.39, 840.6, 420.6, 3, 0.43], [830.4, 388.1, 2, 0.28, 825.6, 392.4, 1.8, 0.26, 822.9, 395.6, 2, 0.34, 820.5, 399.1, 2, 0.52, 820.1, 401.4, 2, 0.7, 820.9, 404.7, 1.8, 0.81, 821.6, 406.4, 2, 0.75, 824.6, 409.5, 1.5, 0.45, 827.6, 411.7, 1.8, 0.38, 831.6, 414, 2, 0.46, 835.9, 415.8, 1.5, 0.54, 839.2, 418.5, 2.2, 0.59, 840.3, 420.8, 2.8, 0.43], [836.4, 445.1, 2.2, 0.61, 837.7, 442.6, 2, 0.5, 839.9, 440.2, 1.8, 0.43, 845.2, 436.1, 2, 0.42, 850.5, 431.8, 3.5, 0.1, 853, 428.1, 2.5, 0.21, 855.2, 422.9, 2, 0.64, 855.1, 419.3, 2, 0.45, 854.7, 415.8, 2.5, 0.31, 852.8, 411.9, 2, 0.34, 847.6, 407.4, 2, 0.44, 841.8, 404.4, 2, 0.21, 835.9, 401.3, 1.5, 0.27, 833.3, 399.3, 1.5, 0.18, 832.2, 396.1, 2, 0.48, 834.3, 390.1, 2, 0.5, 836.3, 387.4, 1.8, 0.62, 840.6, 383.3, 1.8, 0.47, 844.9, 380.2, 2, 0.41, 849.1, 377, 2, 0.34, 850.4, 375.6, 1.8, 0.25, 853, 371.3, 2.2, 0.13, 853, 367.9, 2, 0.19, 852.4, 366.3, 1.8, 0.14], [836.7, 450.1, 2.5, 0.68, 839, 452.8, 2, 0.66, 841.1, 455.6, 1.8, 0.57, 841.9, 458.1, 2, 0.37, 839, 459.7, 2.8, 0.23]], "49.96": [[794.6, 416.9, 0.6, 0.02, 794.6, 410, 2.2, 0.09, 794.6, 403.2, 1.8, 0.06, 796.6, 396.3, 3.5, 0.04, 794.6, 389.5, 3.5, 0.03, 796.6, 382.6, 3.5, 0.02, 794.6, 375.8, 1, 0.02, 794.6, 369, 1, 0.01, 795.6, 362.1, 2.5, 0.01, 794.6, 355.3, 0.6, 0, 796.6, 348.4, 3.5, 0.03, 796.6, 341.6, 2.5, 0.01, 794.6, 334.7, 2, 0.02, 796.6, 328, 2.5, 0, 795.1, 325, 1.8, 0.01, 797.4, 325.9, 2, 0.01, 804, 326.6, 2.5, 0.01, 810.6, 324.7, 1, 0.01, 817.2, 324.7, 3.5, 0, 823.8, 326.7, 1.5, 0, 830.4, 326, 2, 0, 837, 326.7, 3.5, 0, 843.6, 325.2, 1.2, 0, 850.2, 326.7, 2, 0.01, 856.9, 326.8, 3.5, 0.01, 863.5, 326.8, 3.2, 0.01, 870.1, 324.8, 1, 0.01, 876.7, 325.8, 3.5, 0, 883.3, 324.6, 0.6, 0, 889.9, 326.8, 2.8, 0.01, 896.5, 326.9, 2.5, 0.01, 902.7, 326.8, 3, 0.01, 902.4, 326.6, 3.5, 0.01, 902.1, 333.1, 3.5, 0.01, 904.4, 339.8, 3.2, 0.01, 902.1, 346.6, 2.5, 0.01, 903.1, 353.3, 1.2, 0.01, 903.1, 360.1, 3.5, 0.02, 902.6, 366.8, 2.5, 0.03, 904.4, 373.5, 2, 0.02, 904.4, 380.3, 1.2, 0.03, 903.1, 387, 3.5, 0.04, 902.1, 393.8, 3.5, 0.05, 902.4, 400.5, 3, 0.07, 904.4, 407.2, 1.5, 0.05, 904.4, 414, 2.8, 0.08, 902.1, 420.7, 3.5, 0.06, 902.1, 427.4, 3.5, 0.08, 902.1, 434.2, 3.5, 0.08, 904.4, 440.9, 1, 0.05, 904.4, 447.6, 2.2, 0.06, 902.1, 454.4, 3.5, 0.04, 904.4, 461.1, 0.6, 0.03], [840.9, 419.1, 3.2, 0.4, 841.4, 423.9, 2.8, 0.38, 840.4, 426, 2.5, 0.51, 836.9, 429.8, 1.8, 0.5, 832.8, 433.2, 2, 0.41, 829, 436.9, 1.8, 0.33, 827.1, 439.3, 2, 0.28, 826.3, 443.3, 2.5, 0.58, 826.5, 445.5, 2.2, 0.65, 827.2, 447.2, 2.2, 0.57, 830.2, 451, 1.8, 0.31, 833.9, 453.1, 2.5, 0.24], [830.5, 386.7, 2, 0.27, 828.6, 388.4, 2, 0.29, 824.6, 392.1, 1.8, 0.25, 820.6, 397.8, 2.5, 0.57, 820, 399.9, 2.2, 0.69, 820.6, 402.7, 2, 0.79, 821.4, 404.6, 2, 0.75, 826.1, 409.1, 2.2, 0.36, 830.8, 411.8, 2, 0.35, 835.6, 414, 1.8, 0.58, 839.4, 417.1, 1.8, 0.59, 840.9, 419, 3.2, 0.4], [841.4, 459.1, 2.2, 0.22, 841.9, 458.4, 2, 0.3, 841.5, 455.2, 2, 0.55, 838.8, 452.2, 1.8, 0.65, 836.5, 448.8, 2.2, 0.67, 836.1, 444.6, 2, 0.64, 839.4, 439.4, 2, 0.45, 843.8, 435.4, 2, 0.44, 848.6, 431.9, 2.2, 0.17, 852.6, 427, 2.8, 0.21, 855, 421.6, 2.2, 0.65, 855, 416.6, 2, 0.41, 853.6, 411.4, 2, 0.32, 850.6, 408.1, 2, 0.37, 845.3, 404.9, 1.8, 0.43, 840.8, 402.7, 2.2, 0.17, 836.4, 400.3, 1.8, 0.26, 833.4, 397.8, 1.8, 0.19, 832.2, 394.6, 1.8, 0.48, 834.2, 389, 1.8, 0.49, 835.3, 387.3, 1.8, 0.58, 838, 384.3, 1.8, 0.6, 840.9, 381.5, 1.8, 0.47, 845.1, 378.7, 1.8, 0.37, 849.1, 375.5, 1.8, 0.33, 851, 373.1, 1.8, 0.27, 852.7, 370.8, 2, 0.18, 852.9, 368.6, 2, 0.16, 852.9, 365.9, 1.8, 0.19, 852.4, 364.6, 1.8, 0.18, 851.6, 363.9, 1.8, 0.12]], "50.04": [[795.1, 411.4, 3.5, 0.07, 794.9, 404.4, 3.5, 0.07, 796.4, 397.5, 3.5, 0.06, 794.6, 390.5, 3.5, 0.03, 796.1, 383.5, 3.5, 0.02, 795.1, 376.6, 3.5, 0.02, 794.6, 369.6, 1, 0.01, 794.6, 362.7, 0.6, 0, 796.6, 355.7, 3.5, 0.05, 795.9, 348.8, 3.5, 0, 794.6, 341.8, 1, 0.01, 796.4, 334.8, 3.2, 0.01, 794.6, 327.9, 1.5, 0.02, 794.6, 325.8, 3.5, 0.02, 796.4, 326.8, 3.2, 0.01, 797.5, 326.6, 2.5, 0.01, 804, 326.6, 2.5, 0.02, 810.6, 326.7, 2.8, 0.01, 817.2, 326.7, 2.8, 0.02, 823.8, 326.7, 2, 0.02, 830.4, 324.7, 1, 0.02, 837, 326, 3.5, 0, 843.6, 325.2, 2, 0.01, 850.2, 326.7, 3.5, 0.01, 856.9, 324.5, 3, 0.01, 863.5, 326.5, 3.5, 0.01, 870.1, 326.5, 2, 0.01, 876.7, 324.6, 0.8, 0.01, 883.3, 326.6, 2.5, 0.02, 889.9, 324.6, 1, 0.01, 896.5, 326.6, 1.8, 0.01, 902.8, 326.6, 3.5, 0.01, 902.9, 326.5, 1.2, 0.01, 903.4, 333.1, 2.5, 0.01, 902.1, 339.8, 3.2, 0.01, 904.4, 346.6, 2.8, 0.02, 904.4, 353.3, 3.5, 0.01, 903.1, 360.1, 3.5, 0.01, 902.1, 366.8, 3.5, 0.03, 903.1, 373.5, 2.8, 0.01, 904.4, 380.3, 3.5, 0.03, 902.1, 387, 2.8, 0.02, 904.4, 393.8, 1.2, 0.06, 902.4, 400.5, 3.5, 0.06, 904.1, 407.2, 1.2, 0.09, 904.4, 414, 1.8, 0.04, 902.1, 420.7, 3.5, 0.06, 904.4, 427.4, 3.5, 0.08, 902.4, 434.2, 3.5, 0.08, 904.4, 440.9, 3.5, 0.06, 902.4, 447.6, 3.5, 0.06, 902.1, 454.4, 3.5, 0.03, 902.1, 461.1, 3.5, 0.04], [829.7, 385.4, 2, 0.3, 827.4, 387.4, 1.8, 0.28, 823.1, 391.6, 1.8, 0.27, 820.1, 395.9, 2, 0.54, 819.4, 398.6, 2.2, 0.71, 820.9, 402.4, 2, 0.86, 821.4, 403.1, 2, 0.78, 824.2, 406, 1.8, 0.5, 827.4, 408.3, 2, 0.32, 831.9, 410.1, 1.8, 0.43, 836.1, 412.3, 1.8, 0.6, 839, 414.4, 2, 0.62, 841.3, 417.3, 3.2, 0.44], [840.8, 463, 3.5, 0.16, 841.3, 461.2, 3.5, 0.17, 841.6, 459.7, 2.8, 0.19, 842.1, 456.6, 2, 0.36, 841.8, 454.2, 2, 0.53, 839, 450.9, 1.8, 0.64, 836.4, 447.4, 2, 0.67, 836, 445.8, 2, 0.72, 835.8, 443.1, 2, 0.72, 839, 438.4, 2.2, 0.47, 844, 433.9, 2, 0.48, 849.4, 429.9, 2, 0.15, 852.7, 425.9, 2.8, 0.2, 855.1, 420.3, 2, 0.68, 855.2, 414.6, 2.2, 0.4, 853.9, 409.9, 2, 0.31, 851.9, 407.2, 1.8, 0.36, 848.6, 404.8, 1.8, 0.49, 845.1, 402.8, 1.2, 0.44, 840.4, 400.8, 2, 0.2, 835.9, 398.4, 2, 0.27, 832.4, 395, 1.8, 0.29, 831.8, 393.1, 1.8, 0.5, 832.6, 389.7, 2, 0.26, 834.2, 386.5, 1.8, 0.6, 836.6, 383.4, 1.8, 0.65, 839.5, 380.5, 1.8, 0.56, 844.4, 377.2, 1.8, 0.38, 849.1, 373.7, 1.8, 0.29, 851.1, 371.4, 1.8, 0.23, 853, 367.9, 1.8, 0.13, 852.8, 364.2, 2, 0.2, 852.1, 362.6, 1.8, 0.17], [835.8, 452.8, 1.5, 0.17, 830.4, 449.5, 1.8, 0.3, 827.1, 446, 1.8, 0.54, 826.2, 444.2, 2, 0.67, 825.8, 442.7, 2, 0.66, 826.8, 438.6, 2, 0.36, 828.5, 435.9, 2, 0.37, 832.6, 431.9, 2, 0.45, 837.1, 428.3, 1.8, 0.49, 841.2, 424.4, 2.2, 0.52, 841.6, 422.9, 2.8, 0.46, 841.4, 417.1, 3.2, 0.43]], "50.12": [[796.6, 406.1, 3.5, 0.09, 794.6, 399.6, 1.8, 0.06, 796.6, 393.1, 3.5, 0.03, 796.1, 386.6, 3.5, 0.04, 794.6, 380, 1.5, 0.03, 796.6, 373.5, 3.5, 0.01, 794.6, 367, 0.8, 0.01, 796.6, 360.5, 3, 0.01, 796.6, 354, 3.5, 0.01, 796.6, 347.4, 3.5, 0.01, 796.4, 340.9, 3.5, 0.01, 795.1, 334.4, 3, 0.01, 796.6, 327.9, 3.5, 0.02, 796.6, 326.4, 3.5, 0.02, 796.1, 326.4, 3.5, 0.02, 797.4, 326.1, 3, 0.02, 804.3, 324.6, 1, 0.02, 811.3, 324.6, 1, 0, 818.2, 324.6, 1.2, 0.01, 825.2, 324.6, 3.5, 0.01, 832.1, 326.6, 2.8, 0.01, 839.1, 326.6, 2.5, 0, 846, 326.6, 3, 0.01, 853, 324.6, 3.5, 0.02, 859.9, 326.6, 3.5, 0.01, 866.9, 324.6, 3.5, 0, 873.8, 326.6, 3.5, 0.01, 880.8, 325.4, 3.5, 0.01, 887.7, 326.6, 3.5, 0, 894.7, 326.6, 2.5, 0, 901.5, 326.6, 3, 0.01, 903.5, 324.8, 1.5, 0.02, 902.1, 326.6, 3, 0.01, 903.9, 333.1, 1.8, 0.02, 903.4, 339.8, 2.8, 0.02, 904.4, 346.6, 0.6, 0.01, 902.1, 353.3, 3.5, 0.01, 904.4, 360.1, 0.6, 0, 903.1, 366.8, 3.2, 0.02, 903.9, 373.5, 2.2, 0.02, 902.1, 380.3, 3.5, 0.04, 902.1, 387, 3.5, 0.04, 904.4, 393.8, 3.5, 0.05, 903.1, 400.5, 3.5, 0.07, 904.4, 407.2, 3.5, 0.06, 903.1, 414, 3.5, 0.06, 902.1, 420.7, 3.5, 0.07, 903.1, 427.4, 3.5, 0.07, 902.1, 434.2, 3.5, 0.07, 904.4, 440.9, 1.2, 0.06, 904.4, 447.6, 0.6, 0.04, 902.9, 454.4, 3.5, 0.04, 903.1, 461.1, 3.5, 0.05], [834.8, 383.7, 3.5, 0.62, 832.5, 385.8, 3.5, 0.21, 830.6, 383.8, 2.2, 0.17, 828.4, 385, 2.2, 0.31, 824.7, 388.9, 1.8, 0.27, 821.1, 392.9, 2, 0.43, 819.7, 395.8, 2, 0.61, 819.5, 397.3, 2.2, 0.71, 820.3, 400.3, 2.2, 0.82, 821.9, 402.6, 1.8, 0.64, 825, 404.8, 1.8, 0.42, 828.2, 406.9, 2, 0.26, 834.5, 409.8, 1.8, 0.54, 837.4, 411, 1.5, 0.7, 840.4, 413.6, 2, 0.54, 842, 415.9, 2.5, 0.42, 842.1, 421.6, 2.5, 0.46, 841.5, 422.8, 2.2, 0.52, 837.9, 426.4, 1.8, 0.51, 833.9, 429.6, 1.8, 0.42, 829.9, 432.9, 2, 0.44, 826.9, 436.9, 2, 0.37, 825.9, 440.9, 2, 0.6, 826.2, 442.8, 2, 0.65, 827.2, 445, 2.2, 0.51, 830.9, 448.9, 2.2, 0.34, 835.7, 451.7, 2, 0.17], [841.3, 461.4, 2.5, 0.17, 842.4, 458.9, 2.5, 0.19, 842.6, 454.1, 2.2, 0.38, 841.6, 452.5, 2, 0.53, 838.9, 449.3, 2, 0.57, 836.3, 445.9, 2, 0.68, 835.8, 444.1, 2.2, 0.72, 836.1, 441.7, 2, 0.71, 837.4, 438.5, 2, 0.54, 839.9, 435.9, 1.8, 0.5, 844.4, 432.5, 1.8, 0.52, 848.9, 429.1, 2.2, 0.24, 853.3, 424.9, 2.8, 0.19, 855.6, 419.1, 2.2, 0.69, 856, 414.3, 2, 0.42, 854.2, 408.4, 2, 0.31, 852.6, 406.1, 1.8, 0.36, 849.1, 403.4, 2, 0.47, 845.4, 401.1, 1.8, 0.5, 840.4, 399.2, 2, 0.19, 835.9, 396.9, 2, 0.28, 832.4, 393.5, 1.8, 0.27, 831.7, 391.9, 1.8, 0.51, 833.6, 386, 1.8, 0.5, 835.7, 383.3, 2, 0.67, 839.7, 378.8, 1.8, 0.54, 844, 375.5, 1.8, 0.35, 848.6, 372.6, 1.8, 0.32, 850.9, 370.1, 2, 0.24, 853, 366.4, 2.2, 0.14, 852.4, 361.9, 2.2, 0.13]], "50.20": [[796.1, 399.1, 3.5, 0.09, 794.6, 392.6, 1.8, 0.05, 796.6, 386.2, 3.5, 0.06, 794.9, 379.7, 1.5, 0.02, 795.4, 373.2, 3.5, 0.02, 796.6, 366.7, 3.5, 0.03, 796.6, 360.3, 2.2, 0.01, 795.9, 353.8, 3.5, 0.02, 796.1, 347.3, 3.5, 0.01, 796.6, 340.8, 3.5, 0.01, 796.6, 334.4, 3.5, 0.01, 796.6, 327.9, 3.2, 0.01, 796.8, 326.4, 2.5, 0.01, 795.2, 324.6, 1.5, 0.01, 797.4, 324.9, 3, 0.02, 804.3, 324.6, 1, 0.02, 811.3, 324.6, 0.8, 0.01, 818.2, 326.6, 3.5, 0.02, 825.2, 326.6, 2.5, 0, 832.1, 325.9, 2, 0, 839.1, 326.6, 2.5, 0, 846, 325.6, 2, 0.01, 853, 324.9, 3.5, 0.01, 859.9, 326.4, 2, 0.01, 866.9, 326.1, 3.5, 0, 873.8, 326.6, 2.5, 0, 880.8, 326.6, 3, 0.01, 887.7, 326.6, 3.2, 0.01, 894.7, 324.6, 3.5, 0.01, 901.5, 326.6, 2.8, 0.02, 902.2, 326.6, 3, 0.02, 902.1, 326.6, 3.5, 0.02, 902.1, 333.1, 3.2, 0.02, 903.1, 339.8, 2.5, 0.01, 902.9, 346.6, 3.5, 0.03, 903.6, 353.3, 2.5, 0.02, 902.1, 360.1, 3.5, 0.03, 904.4, 366.8, 1.5, 0.03, 902.1, 373.5, 3.5, 0.02, 902.1, 380.3, 3.5, 0.02, 902.1, 387, 3.5, 0.03, 903.9, 393.8, 3.5, 0.05, 902.9, 400.5, 1.8, 0.06, 904.4, 407.2, 2, 0.05, 902.1, 414, 3.5, 0.06, 902.1, 420.7, 3.5, 0.06, 902.1, 427.4, 3.5, 0.07, 903.1, 434.2, 3.5, 0.07, 902.9, 440.9, 3.5, 0.06, 903.4, 447.6, 3, 0.06, 902.9, 454.4, 3.5, 0.07, 904.4, 461.1, 3.5, 0.04], [796.6, 449.6, 2.8, 0.11, 795, 455.4, 1.2, 0.14, 794.6, 461.1, 2, 0.12], [819.6, 392.6, 2.2, 0.43, 822.6, 388.4, 1.8, 0.28, 827.4, 384, 2, 0.3, 828.9, 383.7, 1.8, 0.15, 832.6, 384.1, 3.5, 0.35], [819.9, 398.3, 2.2, 0.84, 822, 401, 2, 0.55, 823.4, 402.1, 1.5, 0.42, 828.9, 405.1, 2, 0.24, 833, 406.7, 1.5, 0.42, 837.4, 408.6, 1.5, 0.63, 840.1, 410.5, 1.8, 0.59, 842.4, 413.3, 3, 0.42], [831.4, 390.7, 2, 0.51, 832.4, 386.6, 2.2, 0.23, 833.9, 382.8, 2, 0.59, 837.9, 378.2, 1.8, 0.6, 841.7, 375.1, 1.8, 0.38, 845.9, 372.4, 2, 0.33, 848.9, 370.2, 1.8, 0.12, 851.7, 367.8, 1.5, 0.12, 853.2, 365.2, 2.2, 0.1, 852.4, 361.4, 2.2, 0.1], [831.4, 390.5, 2.8, 0.53, 834, 393.5, 1.5, 0.24, 837.1, 395.8, 1.8, 0.2, 842, 398.2, 1.8, 0.17, 847.1, 400.1, 1.2, 0.44, 850, 402.1, 2, 0.38, 852.9, 404.2, 1.8, 0.4, 854.1, 405.9, 2, 0.33, 855.1, 408.6, 2, 0.28, 856.2, 415.4, 2.2, 0.59, 855.4, 417.9, 2.2, 0.66, 852.3, 423.9, 2.2, 0.12, 849.9, 426.5, 2.2, 0.1, 844.5, 430.4, 1.8, 0.52, 839.4, 434.7, 1.8, 0.58, 836.7, 437.9, 2, 0.64, 835.6, 440.4, 2, 0.68, 836, 443.2, 2.2, 0.78, 837.4, 446.4, 2, 0.58, 841.9, 451.2, 2, 0.51, 842.8, 452.6, 2.2, 0.39, 842.7, 458.5, 2.5, 0.23, 841.5, 461.3, 2.8, 0.2, 840.4, 462.1, 2, 0.24], [833.4, 448.6, 2.5, 0.35, 829.1, 446.3, 1.8, 0.32, 825.9, 442.2, 2.2, 0.64, 825.5, 440.4, 2, 0.67, 826, 437.1, 2.2, 0.41, 827.9, 433.1, 2, 0.52, 832.3, 429.1, 2, 0.47, 837.1, 425.4, 1.8, 0.46, 841.5, 421.3, 2.2, 0.48, 843, 417.9, 2.8, 0.36, 842.4, 413.4, 3, 0.42]], "50.28": [[794.9, 392.6, 2, 0.08, 796.6, 386.2, 3, 0.05, 795.1, 379.7, 3.5, 0.03, 795.9, 373.2, 2.2, 0.04, 794.9, 366.7, 2, 0.05, 796.4, 360.2, 3.2, 0.03, 794.6, 353.8, 2, 0.02, 794.9, 347.3, 1, 0.01, 795.6, 340.8, 2.2, 0.02, 794.6, 334.4, 2.8, 0.01, 794.6, 327.9, 1, 0.01, 794.6, 325.8, 1, 0.01, 795.3, 324.8, 1.5, 0.01, 797.4, 324.6, 1.5, 0.01, 804.3, 324.9, 3.5, 0.01, 811.3, 325.4, 3.5, 0.02, 818.2, 325.9, 3.5, 0.01, 825.2, 325.1, 3.5, 0.01, 832.1, 325.6, 2, 0, 839.1, 326.6, 2.5, 0, 846, 326.4, 3.5, 0.01, 853, 325.9, 2, 0.01, 859.9, 324.6, 1.2, 0.01, 866.9, 326.1, 3.5, 0, 873.8, 326.6, 3, 0.01, 880.8, 324.6, 1.8, 0.01, 887.7, 324.9, 1.2, 0.02, 894.7, 326.1, 3.2, 0.01, 901.6, 326.1, 3.5, 0.01, 902.9, 325.6, 3.5, 0.01, 902.9, 326.5, 3.5, 0.01, 903.1, 333.1, 1.8, 0.02, 903.1, 339.9, 3.5, 0.01, 902.1, 346.6, 3.5, 0.01, 902.6, 353.4, 3.5, 0.01, 904.4, 360.1, 3.5, 0.01, 904.4, 366.9, 2.2, 0.03, 903.1, 373.6, 2.8, 0.03, 903.4, 380.4, 2.8, 0.03, 902.1, 387.1, 3.5, 0.06, 902.1, 393.9, 2.5, 0.02, 902.4, 400.6, 3, 0.07, 904.1, 407.4, 3.2, 0.04, 903.1, 414.1, 3.5, 0.04, 903.1, 420.9, 2.5, 0.06, 903.1, 427.6, 3.5, 0.1, 902.1, 434.4, 3, 0.07, 904.4, 441.1, 3, 0.07, 904.4, 447.9, 2.2, 0.06, 902.9, 454.6, 3.2, 0.02, 902.1, 461.4, 3.5, 0.05], [795.9, 461.1, 3.5, 0.13, 795, 457.5, 3, 0.13, 794.6, 453.9, 1, 0.14, 794.6, 450.5, 0.8, 0.46], [832.5, 382.4, 3.5, 0.43, 828.7, 382.3, 2.5, 0.21, 823.2, 386, 1.5, 0.21, 820.2, 390.2, 2, 0.44, 818.9, 394.9, 2.2, 0.81, 820.7, 398, 2, 0.85, 821.3, 398.6, 2, 0.77, 824.8, 401.4, 2, 0.3, 828.6, 403.5, 2, 0.18, 833, 404.9, 1.5, 0.35, 837.3, 406.6, 1.8, 0.67, 841.7, 409.4, 2, 0.62, 842.4, 410.5, 2.5, 0.54, 843.7, 416.2, 2.8, 0.36, 841.9, 419.4, 2.2, 0.39, 838.4, 423, 1.8, 0.4, 833.4, 426.9, 2, 0.46, 828.6, 431, 2, 0.49, 825.9, 435.4, 2, 0.44, 825.4, 439.4, 2.2, 0.73, 825.9, 441.2, 2, 0.66, 829.1, 445.2, 2.2, 0.32, 831, 446.9, 2.2, 0.38, 833.1, 447.4, 2, 0.31], [831.1, 388.9, 2, 0.65, 833, 382.3, 2.2, 0.5, 835.3, 379, 1.8, 0.69, 838.1, 376.1, 1.8, 0.64, 842.7, 373, 1.8, 0.34, 847.1, 369.6, 2, 0.28], [831.2, 388.5, 2.5, 0.7, 833.5, 391.9, 1.8, 0.18, 836.8, 394.2, 1.8, 0.16, 843.1, 396.8, 2, 0.19, 849.3, 399.8, 1.8, 0.24, 852.9, 402.1, 1.8, 0.4, 854.5, 404.1, 2.2, 0.33, 855.6, 406.6, 2.2, 0.27, 856.4, 410.2, 2.2, 0.31, 856.5, 413.8, 2.2, 0.61, 854.8, 418.4, 2.2, 0.51, 851.7, 423.4, 2.5, 0.17, 848.4, 426.2, 1.8, 0.23, 845.1, 428.5, 1.8, 0.51, 841.9, 430.8, 2, 0.64, 838.8, 433.4, 1.8, 0.64, 836.3, 436.5, 1.8, 0.69, 835.3, 439.1, 2.2, 0.7, 836.4, 443.2, 1.8, 0.68, 837.6, 445.2, 2, 0.58, 842.4, 449.9, 1.8, 0.46, 843.3, 452.6, 2.2, 0.33, 843.5, 454.7, 2, 0.29, 842.5, 457.7, 2.2, 0.24, 840.9, 460.5, 2.2, 0.25, 840, 462.2, 3.5, 0.2]], "50.36": [[794.6, 384.4, 1.8, 0.06, 795.9, 378.1, 2, 0.02, 796.6, 371.8, 3.5, 0.01, 796.6, 365.5, 3.5, 0.02, 796.6, 359.3, 2.8, 0.01, 796.4, 353, 3.5, 0.01, 794.9, 346.7, 3.5, 0.01, 794.6, 340.4, 0.6, 0, 796.6, 334.2, 2.2, 0.01, 796.6, 327.9, 3.5, 0.01, 796.8, 326.5, 3, 0.01, 795.9, 326.9, 2.8, 0.01, 802.3, 326.1, 3, 0.01, 808.9, 324.6, 0.8, 0.02, 815.5, 324.6, 1.5, 0.01, 822.1, 326.3, 3.5, 0.01, 828.8, 325.8, 1.8, 0.01, 835.4, 324.5, 0.6, 0, 842, 326, 3.5, 0.01, 848.6, 326.8, 2.8, 0.02, 855.3, 324.7, 1.5, 0.01, 861.9, 326.7, 3, 0.01, 868.5, 326.7, 3.5, 0.01, 875.1, 325.9, 3.5, 0, 881.8, 326.7, 3.5, 0.01, 888.4, 326.7, 1.8, 0.02, 895, 326.6, 3.2, 0.01, 901.6, 324.6, 2.2, 0.01, 903.6, 324.6, 3, 0.01, 904.4, 326.4, 1.8, 0.02, 902.1, 333.1, 2.8, 0.01, 902.1, 339.8, 2.5, 0.01, 902.1, 346.6, 1.5, 0.01, 902.9, 353.3, 3.5, 0.02, 902.9, 360.1, 3.5, 0.01, 903.6, 366.8, 1.8, 0.01, 902.6, 373.5, 3.5, 0.01, 904.4, 380.3, 1, 0.03, 903.6, 387, 3.5, 0.05, 904.1, 393.8, 2.8, 0.06, 904.4, 400.5, 1, 0.09, 902.9, 407.2, 3.5, 0.06, 903.4, 414, 3, 0.06, 902.6, 420.7, 3.5, 0.08, 904.4, 427.4, 1.8, 0.06, 902.1, 434.2, 3.5, 0.08, 902.1, 440.9, 3.5, 0.07, 902.4, 447.6, 3.5, 0.06, 902.1, 454.4, 3.5, 0.06, 903.4, 461.1, 3.5, 0.04], [796.9, 461.1, 3.5, 0.14, 794.5, 456.4, 2.5, 0.12, 794.6, 451.6, 1.2, 0.13, 794.6, 447.3, 1, 0.69, 794.7, 446.2, 1.2, 0.71], [807.7, 413.1, 2.8, 0.36, 808.8, 413.1, 2.5, 0.4, 809.9, 414, 3, 0.66, 810.6, 415, 2.8, 0.5, 810.4, 415.7, 2.8, 0.39], [831.9, 380.4, 3.2, 0.33, 827.9, 380.3, 2, 0.16, 823.6, 383.6, 1.8, 0.13, 819.7, 388.2, 2, 0.39, 818.5, 393.1, 2.2, 0.91, 819.9, 395.5, 2, 0.9, 822.9, 398.6, 2, 0.43, 827, 400.2, 2.2, 0.17, 830.8, 402.4, 2.2, 0.24, 834.6, 403.1, 1.5, 0.49, 838, 404.6, 2, 0.71, 841.9, 407.3, 1.8, 0.63, 842.9, 408.4, 2.2, 0.54, 844.1, 414, 2.8, 0.36, 842, 416.7, 2, 0.36, 838.1, 421.2, 1.8, 0.42, 833.4, 424.8, 2, 0.46, 828.6, 428.5, 1.5, 0.47, 825.2, 434.2, 1.8, 0.63, 825.2, 437.3, 2, 0.83, 826, 439.6, 2, 0.52, 829.9, 444, 1.8, 0.36, 832.7, 446.1, 2.2, 0.41], [836.1, 434.3, 2.2, 0.79, 839.4, 430.6, 1.8, 0.77, 842.9, 427.8, 1.8, 0.67, 847.4, 425.1, 2, 0.27, 851.6, 421.4, 1.8, 0.2, 854.8, 417.4, 2.5, 0.46, 856.4, 412.6, 2.2, 0.65, 856.1, 405.9, 2, 0.27, 853.8, 401.3, 2, 0.42, 850.4, 398.6, 1.2, 0.09, 847.4, 396.6, 1.8, 0.18, 844.1, 395.1, 1.8, 0.25, 838.9, 393.2, 2, 0.11, 834.5, 390.9, 1.8, 0.2, 830.7, 386.6, 2.2, 0.61, 832.2, 381, 2, 0.35, 834.1, 378, 2, 0.67, 838.5, 373.4, 1.8, 0.58, 842.5, 370.7, 1.8, 0.32, 846.6, 368.1, 1.2, 0.27], [836.4, 441.6, 3.5, 0.72, 837, 442.7, 2, 0.59, 839.7, 445.6, 1.8, 0.51, 842.5, 448.4, 1.8, 0.46, 844.1, 452.5, 1.8, 0.42, 842.9, 456.9, 1.8, 0.27, 840.4, 460.9, 2.5, 0.21, 839.9, 462.1, 3, 0.22]], "50.44": [[794.6, 376.6, 3.5, 0.05, 794.6, 369.7, 2.8, 0.03, 794.6, 362.7, 1.2, 0.03, 794.6, 355.7, 1, 0.02, 795.6, 348.8, 3.5, 0.02, 796.6, 341.8, 3.2, 0.02, 796.4, 334.8, 3, 0.02, 795.9, 327.9, 3.5, 0.01, 796.3, 326.4, 2, 0.01, 795.9, 326.4, 3.5, 0.01, 802.3, 325.9, 3.5, 0.01, 808.9, 326.4, 3.5, 0.02, 815.5, 324.6, 1.5, 0.01, 822.2, 326.6, 3.5, 0.01, 828.8, 326.1, 3, 0.01, 835.4, 326, 3.5, 0, 842, 326.8, 3.5, 0, 848.6, 324.5, 3.5, 0.01, 855.3, 324.7, 0.6, 0.01, 861.9, 325.2, 3, 0.02, 868.5, 325.5, 2, 0, 875.1, 324.7, 1, 0.01, 881.8, 326.7, 2.8, 0, 888.4, 326.7, 1.5, 0, 895, 326.6, 2.8, 0, 901.6, 324.6, 0.6, 0.01, 903.3, 325.5, 2.2, 0.02, 904.4, 326.4, 1.8, 0.02, 902.1, 333.1, 2.2, 0.01, 902.4, 339.8, 3, 0.01, 902.9, 346.6, 3.5, 0.02, 902.9, 353.3, 3.5, 0.01, 903.1, 360.1, 3.5, 0.03, 902.1, 366.8, 3, 0.02, 904.4, 373.5, 1.8, 0.03, 904.4, 380.3, 1.5, 0.01, 902.1, 387, 3.2, 0.04, 902.1, 393.8, 3.5, 0.03, 902.9, 400.5, 3.5, 0.05, 904.4, 407.2, 0.8, 0.04, 904.4, 414, 2.2, 0.07, 903.4, 420.7, 3.5, 0.07, 904.4, 427.4, 2.5, 0.09, 903.1, 434.2, 3.5, 0.08, 902.1, 440.9, 3.5, 0.08, 904.4, 447.6, 3.5, 0.05, 902.9, 454.4, 3.5, 0.05, 902.1, 461.1, 3.5, 0.05], [795.1, 439.5, 2.2, 0.13, 795.9, 440, 2.5, 0.12, 794.7, 444.2, 1.5, 0.97, 794.6, 449.9, 3.5, 0.12, 796.7, 455.5, 3.5, 0.11, 796.9, 461.1, 3.5, 0.13], [831.4, 379.1, 3.2, 0.33, 827.6, 379, 2, 0.19, 823.6, 382.1, 1.5, 0.14, 819.8, 386.3, 1.8, 0.41, 818.1, 391.4, 2.2, 0.89, 819.6, 394, 2, 0.96, 822.9, 396.8, 1.8, 0.45, 827, 398.5, 2.5, 0.16, 830.9, 400.6, 2.2, 0.3, 834.6, 401.4, 1.8, 0.47, 838, 402.8, 1.8, 0.74, 842, 405.5, 1.8, 0.66, 843.5, 407, 2.8, 0.46, 844.3, 412.4, 2.8, 0.34, 842.4, 415.6, 2.2, 0.33, 838.4, 419.5, 1.8, 0.39, 834.5, 422.4, 1.8, 0.45, 830.6, 425.2, 1.5, 0.38, 828.4, 427.4, 1.8, 0.47, 825.7, 431.3, 2, 0.58, 824.6, 433.9, 2.2, 0.71, 824.9, 436.5, 2, 0.79, 825.1, 438, 2, 0.62, 828.4, 441.5, 1.8, 0.31, 832.7, 444.8, 2.2, 0.39], [838, 372.3, 1.8, 0.6, 834.7, 375.9, 1.8, 0.65, 831.8, 379.7, 1.8, 0.39, 830.6, 384.2, 2, 0.59, 830.8, 385.5, 2, 0.51, 833, 388.3, 1.8, 0.11, 835.6, 390, 1.8, 0.17, 840.2, 392, 1.8, 0.08, 844.9, 393.8, 1.8, 0.24, 849.3, 396.3, 2.8, 0.1, 853.7, 399.4, 1.8, 0.4, 854.9, 401, 1.8, 0.37, 856.6, 404.3, 2.2, 0.24, 857, 410.1, 2.2, 0.57, 855.7, 415.1, 2.2, 0.58, 852.4, 419.4, 1.8, 0.22, 847.4, 423.6, 1.8, 0.24, 843.2, 426.4, 1.8, 0.58, 839.1, 429.3, 2.2, 0.79, 835.6, 434, 2.2, 0.79, 834.9, 437.1, 2, 0.83, 836.5, 440.7, 1.8, 0.69, 839.3, 443.9, 1.8, 0.51, 842.3, 446.9, 2, 0.49, 844, 451.1, 1.8, 0.43, 844, 453.4, 1.8, 0.41, 843.4, 456, 1.8, 0.31, 840.8, 459.9, 2, 0.21, 839.5, 461.7, 3.2, 0.18], [837.9, 372.3, 2, 0.6, 841.8, 369.5, 1.8, 0.32, 845.9, 367.1, 1.2, 0.29, 846.6, 367.1, 1.5, 0.19]], "50.52": [[796.6, 367.4, 3.5, 0.03, 796.4, 360.8, 3, 0.03, 794.6, 354.2, 0.6, 0.01, 796.6, 347.6, 3.5, 0.02, 795.6, 341, 2, 0.02, 796.4, 334.5, 3.2, 0.01, 796.6, 327.9, 2.5, 0, 796.5, 326.4, 3.5, 0.01, 795.8, 326.1, 1.5, 0.01, 802.3, 326.9, 2.5, 0.02, 808.9, 326.9, 3, 0.01, 815.5, 326.9, 3.5, 0.01, 822.1, 326.3, 3.5, 0.02, 828.8, 326.6, 2, 0.01, 835.4, 326.8, 3, 0, 842, 325.5, 3.5, 0.01, 848.6, 326.8, 3.5, 0.01, 855.3, 326.7, 3.5, 0.01, 861.9, 326.2, 3.2, 0.01, 868.5, 326.7, 3.5, 0, 875.1, 324.7, 1, 0.01, 881.8, 324.7, 2.8, 0, 888.4, 324.7, 1, 0.01, 895, 325.4, 3.5, 0.01, 901.6, 324.6, 1.8, 0, 903, 325.9, 2.2, 0, 904.1, 326.4, 1.5, 0, 904.4, 333.1, 0.6, 0, 902.6, 339.8, 3.5, 0.01, 904.4, 346.6, 2, 0.01, 902.1, 353.3, 3.2, 0.01, 902.1, 360, 2.5, 0.02, 902.6, 366.7, 3.5, 0.03, 902.1, 373.4, 3.5, 0.01, 904.4, 380.2, 0.6, 0.01, 902.1, 386.9, 3.5, 0.01, 904.4, 393.6, 1.2, 0.03, 904.4, 400.4, 2.5, 0.07, 902.1, 407.1, 3.5, 0.05, 903.9, 413.8, 3.5, 0.05, 904.4, 420.5, 3.5, 0.06, 902.9, 427.2, 3.5, 0.08, 902.4, 434, 3.5, 0.07, 902.9, 440.7, 3.5, 0.06, 902.1, 447.4, 3, 0.06, 903.1, 454.2, 3.5, 0.06, 903.1, 460.9, 2, 0.06], [795.6, 436.4, 2, 0.15, 795.2, 439.8, 2.2, 0.27, 794.7, 441.8, 2, 1, 794.7, 443.8, 1, 0.76, 796.6, 448.4, 3.5, 0.1, 794.5, 454.8, 1, 0.1, 795.6, 461.1, 2, 0.12], [826.9, 377.4, 2.2, 0.18, 823.1, 381, 1.5, 0.15, 819.4, 384.6, 2, 0.35, 817.8, 389.1, 2.5, 0.78, 819, 391.5, 2, 0.98, 823.1, 395.2, 2, 0.4, 827.8, 397.7, 2.2, 0.16, 833.3, 398.8, 1.8, 0.42, 838.5, 400.8, 1.8, 0.77, 842.5, 403.6, 2, 0.63, 844.1, 406.1, 2.8, 0.39, 845, 409.7, 2.8, 0.33, 843.2, 412.6, 2, 0.35, 840.4, 415.7, 2, 0.3, 837.4, 418.5, 1.8, 0.41, 832.8, 422.2, 1.8, 0.43, 828.1, 425.9, 1.8, 0.45, 825.6, 429.3, 2, 0.61, 824.5, 432.7, 2, 0.78, 824.4, 434.6, 2, 0.84, 825.5, 436.9, 1.8, 0.47, 828.2, 440.2, 2.2, 0.31, 832.1, 442.8, 2, 0.44, 833.1, 443.2, 2.5, 0.35, 833.7, 442.3, 3, 0.17, 835.8, 439.7, 3.5, 0.44], [853.2, 396.8, 1.8, 0.17, 855.4, 399.5, 2.2, 0.3, 857, 403.4, 2.2, 0.24, 857.1, 408.6, 2, 0.6, 855.9, 413.1, 1.8, 0.62, 853.3, 416.4, 2, 0.28, 850.4, 419.4, 1.8, 0.2, 846.5, 422.5, 1.5, 0.28, 842.1, 425.1, 1.8, 0.68, 838.4, 428.4, 2.2, 0.82, 835.6, 431.8, 2, 0.83, 834.8, 433.4, 1.8, 0.83, 834.8, 436, 1.8, 0.82, 837.1, 439.9, 2, 0.62, 839.7, 442.5, 2, 0.49, 842.4, 444.9, 2.2, 0.53, 844.1, 449, 1.8, 0.51, 843.9, 453.6, 1.8, 0.39, 842, 457.4, 2.2, 0.25, 839.6, 460.9, 3, 0.21, 839.2, 462.1, 3, 0.27], [845.7, 365.8, 1.8, 0.23, 841.4, 367.9, 1.2, 0.33, 837.4, 370.4, 2, 0.58, 835, 373.2, 1.8, 0.72, 832.3, 375.9, 1.8, 0.66, 831.1, 378.4, 1.8, 0.23, 830.2, 382.6, 1.8, 0.64, 832.4, 386, 1.8, 0.09, 835.3, 388.2, 1.8, 0.15, 841, 390.5, 2, 0.07, 846.9, 392.6, 1.8, 0.11]], "50.64": [[795.9, 382.2, 3.5, 0.1, 794.5, 376.9, 0.8, 0.15, 794.6, 371.6, 1, 0.85, 794.7, 367.6, 1.2, 0.94, 794.7, 365.2, 1, 0.71, 795.9, 361.6, 3, 0.06, 796.6, 354.9, 3.5, 0.05, 795.1, 348.1, 1.2, 0.03, 794.6, 341.4, 1.2, 0.02, 794.9, 334.6, 1.8, 0.01, 796.4, 327.9, 3.5, 0.01, 796.8, 326.5, 3, 0.01, 795.9, 326.9, 1.2, 0.01, 802.3, 324.9, 2, 0, 808.9, 324.6, 1, 0.01, 815.5, 324.6, 0.6, 0.01, 822.1, 324.6, 3.5, 0.01, 828.8, 326.8, 3.2, 0.01, 835.4, 325, 3.5, 0.01, 842, 326, 2, 0.01, 848.6, 324.5, 0.8, 0, 855.3, 324.7, 1.2, 0.01, 861.9, 324.7, 1.8, 0, 868.5, 326.5, 3.2, 0.01, 875.1, 326.4, 3.2, 0.01, 881.8, 324.7, 1, 0.01, 888.4, 326.7, 2.5, 0, 895, 325.9, 3.5, 0, 901.6, 325.1, 1.5, 0, 903.7, 324.9, 1.8, 0.01, 902.1, 326.5, 1.5, 0, 903.1, 333.1, 3.5, 0.01, 902.1, 339.8, 3, 0.01, 902.1, 346.6, 2.2, 0.01, 904.4, 353.3, 2, 0.01, 904.4, 360.1, 0.6, 0.01, 902.1, 366.8, 2.8, 0.04, 904.1, 373.5, 3.5, 0.02, 902.9, 380.3, 3.5, 0.03, 902.1, 387, 3.5, 0.04, 902.6, 393.8, 2.2, 0.03, 903.9, 400.5, 2.5, 0.05, 903.4, 407.2, 3.5, 0.06, 904.4, 414, 1.2, 0.06, 904.4, 420.7, 3.5, 0.07, 904.4, 427.4, 3.5, 0.07, 903.1, 434.2, 3.5, 0.06, 904.4, 440.9, 0.6, 0.06, 904.4, 447.6, 3.5, 0.06, 902.1, 454.4, 3.5, 0.04, 902.1, 461.1, 2.8, 0.05], [796.1, 434.6, 1.5, 0.12, 795.7, 438, 2.5, 0.35, 794.7, 440, 2.2, 1, 794.7, 442.1, 1.2, 0.85, 794.6, 447.1, 1.2, 0.12, 794.7, 451.8, 0.6, 0.1, 796.8, 456.4, 3.5, 0.09, 794.6, 461.1, 2.2, 0.12], [831.1, 375.6, 3, 0.36, 827.4, 375.8, 2, 0.15, 824.8, 377.9, 1.5, 0.13, 822.1, 380.4, 1.8, 0.15, 819.4, 383, 2, 0.28, 818, 388.3, 2.2, 0.88, 819.7, 390.6, 1.8, 0.89, 823.2, 393.5, 2, 0.35, 828, 395.8, 2.2, 0.15, 831.8, 397.3, 1.8, 0.35, 835.8, 398.4, 1.8, 0.5, 841.3, 400.5, 1.8, 0.72, 843.1, 402.5, 2, 0.53, 844.8, 404.7, 3, 0.32, 845.6, 406.1, 3, 0.3, 845.3, 408.2, 2.8, 0.27, 843.3, 411.4, 2.2, 0.3, 840.9, 414.1, 1.8, 0.27, 838.1, 416.5, 1.5, 0.32, 833.4, 420.2, 2, 0.45, 828.6, 423.9, 1.8, 0.44, 825.4, 428, 2, 0.59, 824, 431.9, 2.2, 0.82, 824.3, 433.2, 2.2, 0.8, 824.8, 434.7, 2, 0.6, 827.1, 437.9, 2.2, 0.27, 830.1, 440.2, 2, 0.3, 833.2, 442, 2.2, 0.37, 835.3, 438.6, 2.8, 0.15, 838.3, 440.2, 3.5, 0.5], [845.4, 363.9, 1.8, 0.11, 841.4, 366.6, 1.5, 0.22, 837.3, 369.1, 2, 0.56, 834.7, 372.2, 1.8, 0.69, 831.8, 375.1, 1.8, 0.62, 830.9, 377.7, 2.2, 0.15, 830, 381.4, 1.8, 0.55, 830.5, 382.5, 1.5, 0.34, 834.4, 386, 1.8, 0.19, 840, 388.4, 1.8, 0.07], [853.6, 396.1, 1.8, 0.14, 854.1, 395.9, 2, 0.16, 855.3, 397.7, 2, 0.21, 857.5, 402.1, 2.2, 0.21, 857.4, 407.1, 2, 0.5, 856, 411.9, 2, 0.62, 853.1, 415.4, 1.8, 0.29, 849.6, 418.7, 2.2, 0.18, 844.4, 422.3, 1.8, 0.42, 839.3, 426.2, 2, 0.79, 835.9, 429.8, 2, 0.77, 835, 430.7, 2, 0.77, 834.6, 433.4, 2, 0.83, 835.5, 436, 2, 0.77, 837.2, 438.6, 1.8, 0.61, 840, 441.3, 2, 0.48, 842.8, 444, 2, 0.56, 844.6, 447.9, 2, 0.51, 844.7, 450.7, 2, 0.48, 843.7, 453.6, 2, 0.36, 841.7, 457, 2.8, 0.17, 839.4, 460.1, 2.5, 0.22, 838.6, 462.1, 3, 0.27]], "50.72": [[796.1, 375.1, 3.5, 0.13, 796.1, 368.4, 3.5, 0.06, 794.6, 361.6, 0.6, 0.05, 795.6, 354.9, 3, 0.05, 796.4, 348.1, 2.2, 0.04, 795.9, 341.4, 2.5, 0.02, 794.6, 334.6, 2.8, 0.03, 796.6, 327.9, 2.5, 0.01, 796.8, 326.5, 2.5, 0.02, 795.7, 324.9, 1, 0.01, 802.3, 324.6, 1.5, 0.01, 808.9, 324.6, 1, 0.01, 815.5, 324.6, 0.8, 0.02, 822.2, 326.8, 1.5, 0.01, 828.8, 326.8, 3.2, 0.01, 835.4, 325, 3.5, 0.01, 842, 324.8, 1, 0.01, 848.6, 324.5, 0.8, 0.01, 855.3, 324.7, 1.2, 0.01, 861.9, 324.7, 3.5, 0, 868.5, 326.5, 3.2, 0.01, 875.1, 325.9, 1, 0, 881.8, 326.7, 2.8, 0, 888.4, 326.7, 2.5, 0, 895, 325.1, 3.5, 0.01, 901.5, 326.6, 2.5, 0, 904, 324.5, 1.5, 0, 904.4, 326.4, 1, 0, 904.4, 333.1, 0.6, 0.01, 902.1, 339.8, 3.5, 0.01, 902.1, 346.6, 2.8, 0.01, 903.4, 353.3, 3.5, 0.03, 902.6, 360.1, 2, 0.01, 903.9, 366.8, 1.5, 0.02, 902.1, 373.5, 3.5, 0.02, 904.4, 380.3, 3.5, 0.01, 902.1, 387, 3.5, 0.04, 902.9, 393.8, 1.8, 0.04, 902.6, 400.5, 3.5, 0.05, 902.9, 407.2, 3.5, 0.05, 902.1, 414, 3.5, 0.06, 902.9, 420.7, 3.5, 0.06, 902.1, 427.4, 3, 0.04, 904.4, 434.2, 3, 0.05, 902.1, 440.9, 3.5, 0.06, 904.4, 447.6, 2.2, 0.06, 902.1, 454.4, 3.5, 0.03, 903.4, 461.1, 2.8, 0.03], [794.6, 432.4, 0.6, 0.11, 795.7, 436, 2.8, 0.36, 795.7, 438.4, 2.8, 1, 794.5, 440.6, 1.5, 0.92, 794.9, 446.4, 1.5, 0.14, 795, 451.3, 2, 0.1, 794.8, 456.2, 3, 0.11, 794.9, 461.1, 2.2, 0.13], [826.5, 374.7, 2, 0.24, 822.4, 378.6, 1.8, 0.12, 818.4, 382.7, 1.8, 0.22, 817.4, 386.1, 2.2, 0.73, 818.5, 388, 2.2, 0.91, 822.6, 391.7, 1.8, 0.36, 826.9, 393.8, 2, 0.16, 830.9, 395.2, 1.8, 0.3, 836.4, 396.3, 1.8, 0.46, 841, 398.4, 1.8, 0.68, 843.7, 400.4, 2, 0.52, 845.3, 403.6, 3, 0.3, 845, 406.6, 2.8, 0.3, 843.3, 409.6, 1.8, 0.27, 840, 413.2, 2.2, 0.24, 836.2, 416.1, 1.8, 0.52, 832.4, 419.3, 2, 0.38, 828.4, 422.4, 1.8, 0.45, 825.2, 426.3, 2, 0.61, 823.8, 430.4, 2.5, 0.82, 824.1, 432.5, 2, 0.75, 827.1, 436.6, 2, 0.26, 829.9, 438.7, 1.8, 0.35, 832.9, 440.2, 2.2, 0.44, 835, 436, 3.5, 0.44], [826.4, 374.6, 2, 0.24, 831.3, 373.9, 2.2, 0.48, 833.7, 371.1, 2, 0.7, 836.6, 367.8, 1.8, 0.55, 840, 365.7, 1.8, 0.24, 843.4, 363.3, 2, 0.19, 844.4, 362.9, 2, 0.14, 845.2, 362.9, 2, 0.1], [831.4, 374.2, 1.8, 0.45, 829.6, 379.1, 2, 0.43, 829.7, 380.5, 2.2, 0.54, 832.8, 383.9, 1.8, 0.15, 838, 385.7, 1.8, 0.08], [854.6, 394.6, 2.2, 0.13, 857.5, 399.3, 2.2, 0.19, 857.8, 404.8, 2, 0.38, 856.2, 410.5, 2, 0.61, 852.4, 415, 1.8, 0.31, 849, 417.9, 1.8, 0.14, 845.6, 419.7, 2, 0.29, 842.4, 421.6, 2, 0.63, 838.8, 424.5, 1.5, 0.82, 835.7, 427.6, 2.2, 0.85, 834.1, 430.9, 2, 0.83, 834.5, 432.8, 2.2, 0.85, 836.5, 436.1, 1.8, 0.71, 839.7, 439.1, 2, 0.5, 842.9, 442.3, 2, 0.6, 844.5, 445.6, 2, 0.52, 844.9, 448.9, 1.8, 0.56, 844.3, 450.5, 2, 0.44, 841.5, 455.6, 2, 0.17, 838.1, 460.4, 2.5, 0.28]], "50.80": [[796.1, 368.4, 3.5, 0.05, 795.6, 361.6, 2.5, 0.04, 796.6, 354.9, 3.5, 0.02, 796.6, 348.1, 3.5, 0.04, 796.6, 341.4, 3, 0.02, 796.6, 334.6, 3.5, 0.01, 795.6, 327.9, 2.8, 0.02, 795.3, 326, 3, 0.01, 795.6, 324.7, 3.5, 0.01, 802.3, 326.1, 2, 0.01, 808.9, 325.4, 3.5, 0.01, 815.5, 324.6, 1.5, 0.01, 822.2, 326.8, 1.5, 0.01, 828.8, 326.8, 3.2, 0.01, 835.4, 326, 3.5, 0.01, 842, 326.3, 2, 0.01, 848.6, 324.5, 1.8, 0, 855.3, 326.7, 3.5, 0, 861.9, 326.7, 3.5, 0.01, 868.5, 324.7, 3.5, 0.01, 875.1, 324.7, 1.2, 0.02, 881.8, 325.4, 2, 0, 888.4, 326.7, 3.5, 0.01, 895, 324.6, 1.5, 0.01, 901.6, 325.9, 3.5, 0.01, 904, 324.5, 1.2, 0.01, 904.1, 326.4, 1, 0.01, 904.1, 333.1, 3.5, 0.01, 903.1, 339.8, 3.5, 0.01, 904.3, 346.6, 0.8, 0.01, 904.3, 353.3, 1, 0.01, 902.3, 360.1, 3, 0.02, 904, 366.8, 1, 0.02, 902.8, 373.5, 3.5, 0.03, 903, 380.3, 2, 0.03, 903, 387, 3.5, 0.04, 904.2, 393.8, 3.5, 0.04, 903.5, 400.5, 2.2, 0.06, 902, 407.2, 3.2, 0.04, 904.5, 414, 1.2, 0.06, 902.2, 420.7, 3.5, 0.06, 904.4, 427.4, 0.6, 0.05, 904.4, 434.2, 3.5, 0.09, 901.9, 440.9, 3.5, 0.06, 902.2, 447.6, 3.5, 0.07, 902.9, 454.4, 2.2, 0.03, 904.1, 461.1, 3.5, 0.06], [796.6, 461.1, 3.5, 0.12, 796.8, 455.3, 2, 0.12, 794.7, 449.6, 1, 0.13, 795.9, 444, 3.5, 0.12, 794.6, 442.8, 0.6, 0.22], [799.1, 390.9, 2.2, 0.15, 803.3, 392.3, 3, 0.49, 803.6, 392.7, 3, 0.47, 804.1, 393.8, 2.5, 0.21], [845.1, 401.1, 3.2, 0.32, 843, 398.7, 2, 0.58, 839.9, 396.4, 1.8, 0.67, 835.7, 394.6, 1.8, 0.41, 831.1, 393.7, 1.8, 0.29, 826.5, 392.2, 2, 0.13, 821.5, 389.7, 1.8, 0.43, 817.9, 385.8, 2, 0.95, 817.1, 384.3, 2.2, 0.68, 818.8, 380.7, 2, 0.22, 822.2, 377.6, 1.5, 0.11, 825.1, 374, 1.8, 0.13, 826.9, 372.8, 1.8, 0.17, 830.9, 372.6, 2.8, 0.41], [844.9, 360.9, 2, 0.12, 842.7, 362, 2, 0.22, 839.4, 364.3, 1.5, 0.3, 836.1, 366.6, 1.8, 0.61, 833.5, 369.9, 1.8, 0.7, 831.2, 373.5, 1.8, 0.37, 829.7, 378.1, 2, 0.51, 830.1, 379.1, 2.2, 0.39, 833.1, 381.9, 2, 0.13, 836.7, 383.7, 2, 0.11], [832.9, 439.1, 2, 0.45, 829.4, 437.4, 2, 0.33, 826.3, 435.3, 2.2, 0.25, 824.1, 430.7, 1.8, 0.74, 823.9, 427.9, 2, 0.77, 825.1, 425.3, 2, 0.55, 828.9, 420.6, 1.8, 0.42, 833.8, 416.8, 2, 0.46, 838.6, 413, 1.5, 0.22, 843.2, 408.8, 2, 0.28, 845.2, 405.5, 2.5, 0.3, 845.1, 401.3, 3.2, 0.31], [832.7, 438.6, 3.5, 0.42, 836.6, 435.2, 2.5, 0.66, 834.4, 430.3, 2.2, 0.87, 835.4, 426.9, 2, 0.87, 839.1, 422.8, 2, 0.83, 844.7, 419.1, 1.8, 0.38, 850.1, 415.3, 2, 0.17, 854.1, 411.2, 2, 0.32, 856.8, 407.3, 2.2, 0.62, 857.8, 403.8, 2, 0.47, 858.2, 399.3, 2, 0.22, 856.6, 395.6, 2, 0.21, 854.9, 393.5, 1.8, 0.13], [836.4, 435, 2, 0.68, 838.4, 436.8, 1.8, 0.51, 843.1, 441.1, 2, 0.58, 844.2, 442.6, 2, 0.64, 845, 445.6, 1.8, 0.59, 843.9, 451.9, 2.2, 0.39, 841.9, 455.2, 1.8, 0.18, 839.4, 458, 2.8, 0.23, 837.9, 460.2, 2.5, 0.26, 837.4, 460.9, 3.5, 0.17], [839.3, 443.1, 2.5, 0.15, 840.7, 446.5, 2.2, 0.22, 840, 450.9, 2.2, 0.21, 844.2, 451.2, 3.5, 0.45]], "50.88": [[795.6, 388.6, 2.5, 0.12, 794.7, 384, 0.6, 0.15, 794.5, 379.3, 0.6, 0.39, 794.6, 374.6, 1, 0.84, 794.6, 368.7, 1.2, 0.98], [796.9, 461.1, 3.5, 0.12, 796.3, 455, 3.5, 0.14, 794.7, 449, 1, 0.15, 796.1, 443, 1.5, 0.2, 794.6, 441.8, 0.6, 0.23], [794.6, 369.7, 1.8, 1, 794.6, 367.9, 1, 0.87, 794.6, 363.4, 3.5, 0.04, 796.6, 357.5, 3.5, 0.04, 796.6, 351.5, 2.8, 0.03, 794.6, 345.6, 1.2, 0.04, 794.6, 339.7, 0.6, 0.01, 796.6, 333.8, 2.8, 0.01, 795.6, 327.9, 2.2, 0.02, 796.8, 326.5, 3.5, 0.02, 795.9, 326.9, 2.2, 0.02, 802.3, 326.9, 3.5, 0.02, 808.9, 326.4, 3.5, 0.01, 815.5, 324.6, 0.8, 0.01, 822.2, 326.8, 1.5, 0.01, 828.8, 326.8, 3.2, 0.01, 835.4, 325, 3.5, 0.01, 842, 324.8, 1, 0.01, 848.6, 324.5, 2.8, 0.01, 855.3, 324.7, 2.8, 0.01, 861.9, 325, 3.5, 0.01, 868.5, 326.5, 3.2, 0.01, 875.1, 325.9, 1, 0, 881.8, 326.7, 2.8, 0, 888.4, 326.7, 2.5, 0, 895, 325.1, 3.5, 0.01, 901.5, 326.6, 2.5, 0, 904, 324.5, 1.5, 0, 904.4, 326.4, 1, 0, 904.4, 333.1, 0.6, 0.01, 902.1, 339.8, 3.5, 0.01, 902.1, 346.6, 2.8, 0.01, 903.6, 353.3, 2.5, 0.02, 902.6, 360.1, 3.5, 0.02, 904.4, 366.8, 1, 0.01, 902.1, 373.5, 3, 0.02, 902.6, 380.3, 2.2, 0.04, 904.4, 387, 3.5, 0.05, 903.9, 393.8, 3.5, 0.04, 902.4, 400.5, 3.5, 0.06, 902.1, 407.2, 3.5, 0.06, 902.6, 414, 3.5, 0.06, 902.1, 420.7, 3.5, 0.05, 904.4, 427.4, 3.5, 0.07, 904.4, 434.2, 2.2, 0.07, 902.1, 440.9, 3.5, 0.06, 904.4, 447.6, 3.5, 0.07, 904.4, 454.4, 3.5, 0.07, 903.1, 461.1, 3.5, 0.04], [821.2, 376.7, 1.5, 0.11, 818.6, 378.5, 1.8, 0.23, 817.2, 382.3, 2.2, 0.61, 817.6, 383.8, 2.2, 0.96, 818.6, 385.1, 2, 0.9, 822.5, 387.9, 1.8, 0.27, 826.4, 390, 1.8, 0.12, 830.9, 391.7, 1.8, 0.28, 835.8, 392.9, 1.8, 0.43, 839.8, 394.2, 1.8, 0.7, 842.7, 396.7, 2, 0.61, 844.6, 398.8, 3.2, 0.36, 844.4, 404.9, 2.5, 0.33, 839.9, 409.9, 1.8, 0.23, 835.9, 413.2, 1.8, 0.52, 831.7, 416.3, 1.8, 0.39, 827.9, 419.9, 1.8, 0.45, 824.9, 423.8, 1.8, 0.59, 823.9, 427.2, 2, 0.79, 824, 429.7, 1.8, 0.74, 826.1, 433.8, 1.8, 0.26, 828.1, 435.4, 2, 0.29, 833.9, 438.9, 2, 0.26], [837.2, 382.2, 1.5, 0.08, 832.6, 379.9, 1.8, 0.15, 830.2, 377.2, 2, 0.33, 829.5, 376.1, 2, 0.51, 830.9, 371.7, 1.8, 0.33, 831.6, 369.6, 1.8, 0.66, 835.8, 364.9, 2, 0.48, 841.4, 361.2, 1.8, 0.17, 844.1, 360.1, 1.8, 0.11], [838.3, 458, 2.2, 0.33, 842, 453.9, 1.5, 0.2, 843.8, 451.1, 2, 0.39, 844.6, 449.1, 1.8, 0.45, 845, 443.9, 2, 0.6, 843.9, 440.7, 2.2, 0.67, 841.1, 437.6, 2, 0.46, 837.9, 434.9, 1.8, 0.53, 834.9, 430.8, 2, 0.83, 834.2, 429.1, 2, 0.91, 834.7, 426.3, 1.8, 0.91, 835.4, 424.8, 1.8, 0.84, 839.4, 420.5, 1.8, 0.77, 845.1, 416.9, 2, 0.34, 850.6, 412.9, 2, 0.19, 854, 409.3, 2, 0.33, 857, 405.4, 2.2, 0.62, 858.1, 400.3, 2, 0.3, 858.5, 397.6, 2.2, 0.17, 857.2, 394.5, 2, 0.14, 855.1, 392.4, 1.8, 0.1]], "50.96": [[796.1, 384.1, 3.5, 0.1, 796.6, 377.9, 3.5, 0.09, 795.9, 371.6, 3.5, 0.08, 795.1, 365.4, 1.5, 0.06, 795.9, 359.1, 2.2, 0.05, 794.6, 352.9, 2.5, 0.04, 796.6, 346.6, 2.8, 0.02, 796.1, 340.4, 3.5, 0.03, 796.6, 334.1, 3.2, 0.02, 796.6, 327.9, 2.5, 0.01, 795.8, 326.2, 2.8, 0.02, 795.8, 325.9, 2.2, 0.02, 802.3, 325.9, 3.5, 0.01, 808.9, 324.6, 3.5, 0.01, 815.5, 324.6, 3.5, 0.01, 822.2, 326.8, 3.2, 0.01, 828.8, 324.8, 1.2, 0.01, 835.4, 325.5, 3.5, 0, 842, 324.5, 3.5, 0.01, 848.6, 325.3, 3.5, 0, 855.3, 324.7, 1, 0.01, 861.9, 326.7, 3.5, 0, 868.5, 326.7, 3.5, 0, 875.1, 325.7, 3, 0, 881.8, 326.7, 3.5, 0.01, 888.4, 324.7, 3.5, 0.01, 895, 326.1, 3.2, 0.01, 901.5, 326.6, 3.5, 0.01, 902.2, 326.6, 2.5, 0.01, 902.1, 326.6, 2.8, 0.01, 903.1, 333.1, 3.5, 0, 904.1, 339.9, 2.2, 0.02, 902.1, 346.6, 2.2, 0.01, 904.4, 353.4, 0.6, 0.01, 902.1, 360.1, 3.5, 0.02, 902.9, 366.9, 2.5, 0.02, 904.4, 373.6, 3.5, 0.02, 902.1, 380.4, 3.5, 0.06, 902.1, 387.1, 3.5, 0.04, 903.9, 393.9, 1.5, 0.04, 902.1, 400.6, 3.5, 0.06, 902.4, 407.4, 3.5, 0.07, 903.1, 414.1, 2.8, 0.07, 904.4, 420.9, 0.6, 0.04, 903.1, 427.6, 3.5, 0.08, 902.1, 434.4, 3.5, 0.06, 904.4, 441.1, 3.5, 0.08, 903.1, 447.9, 2.5, 0.04, 903.1, 454.6, 2.5, 0.07, 902.1, 461.4, 3, 0.04], [796.9, 442.4, 2.2, 0.18, 794.6, 448.6, 1, 0.19, 794.6, 454.9, 3.5, 0.13, 796.9, 461.1, 2.8, 0.13], [820.9, 375.1, 1.8, 0.12, 818.4, 377.3, 2, 0.2, 817.6, 381, 2, 0.61, 817.7, 382.2, 1.8, 0.89, 818.5, 383.3, 2, 0.87, 822.5, 386.2, 1.8, 0.26, 826.2, 388.1, 2, 0.12, 830.1, 389.7, 2, 0.23, 835, 390.9, 1.8, 0.38, 839.8, 392.3, 2, 0.7, 842.7, 394.3, 1.8, 0.62, 845, 397.1, 3.5, 0.36], [834.4, 437.2, 2, 0.23, 831.1, 435.8, 2, 0.46, 828.1, 433.9, 2, 0.29, 826.2, 432.1, 1.8, 0.25, 823.9, 428.2, 1.8, 0.71, 823.6, 425.2, 2, 0.85, 824.6, 422.1, 1.8, 0.61, 827.1, 419.1, 2, 0.46, 830.5, 416.2, 1.5, 0.38, 835.1, 412.7, 1.8, 0.54, 839.8, 409.2, 2.2, 0.22, 844.3, 404.1, 1.8, 0.33, 845.4, 402.2, 2.2, 0.33, 844.6, 397.1, 3.5, 0.36], [836.4, 380.4, 2.2, 0.08, 832.5, 378.4, 2.5, 0.09, 830, 375.9, 1.8, 0.34, 829.5, 374.6, 2, 0.52, 830.8, 370.5, 2, 0.25, 832.7, 366.8, 1.8, 0.63, 835.4, 363.7, 1.8, 0.53, 840.1, 360, 1.8, 0.11, 843.6, 358.4, 1.8, 0.12], [838.3, 457.8, 2.5, 0.29, 842.3, 453.4, 2, 0.2, 844, 450, 2, 0.41, 845.7, 446.4, 2, 0.52, 845.9, 442.4, 2, 0.68, 843.9, 438.6, 2, 0.68, 839.6, 434.6, 2, 0.49, 835.3, 430.7, 2, 0.79, 834.1, 427.8, 2, 0.91, 834.1, 425.9, 2, 0.87, 834.8, 424.5, 1.8, 0.91, 838.8, 419.6, 1.8, 0.81, 843.8, 416.2, 1.8, 0.45, 848.9, 413, 1.8, 0.14, 853.1, 409.4, 2, 0.3, 856.7, 404.8, 2, 0.64, 858, 401.2, 2.2, 0.64, 858.9, 397.4, 2, 0.16, 857.8, 394.1, 2, 0.16, 855.4, 390.6, 1.8, 0.11], [840.1, 441, 3, 0.16, 840.4, 444.4, 2.2, 0.18, 840.1, 449.9, 2, 0.28]], "51.04": [[795.1, 379.1, 3.5, 0.08, 796.8, 372.7, 3.5, 0.07, 794.6, 366.3, 1, 0.06, 796.3, 359.9, 3.5, 0.06, 796.7, 353.5, 2.8, 0.03, 796.7, 347.1, 3.5, 0.04, 794.9, 340.7, 3.5, 0, 796.7, 334.3, 2.8, 0.03, 794.6, 327.9, 0.6, 0, 794.6, 325.8, 1.2, 0.01, 795.6, 324.7, 1.2, 0.02, 802.3, 326.9, 3.5, 0.01, 808.9, 324.6, 1.2, 0.01, 815.5, 324.6, 1.2, 0.01, 822.1, 324.6, 1.8, 0.01, 828.8, 324.6, 3.5, 0.01, 835.4, 326.5, 2.2, 0.01, 842, 325.5, 2.2, 0, 848.6, 326.8, 3.5, 0, 855.3, 326.5, 1.8, 0.01, 861.9, 326.7, 1.5, 0, 868.5, 326.7, 3.5, 0, 875.1, 326.7, 2.8, 0.01, 881.8, 326.7, 3.5, 0.01, 888.4, 324.7, 2, 0.01, 895, 326.6, 3, 0.01, 901.6, 324.6, 3.5, 0, 903.1, 325.7, 2.2, 0, 904.1, 326.4, 1.8, 0, 904.1, 333.1, 1, 0.01, 902.1, 339.8, 3.5, 0.01, 904.1, 346.6, 1.2, 0.01, 902.1, 353.3, 3.5, 0.01, 904.4, 360.1, 3.5, 0.02, 902.4, 366.8, 3, 0.01, 903.1, 373.5, 2.8, 0.01, 903.1, 380.3, 3.5, 0.05, 903.1, 387, 3.5, 0.05, 902.9, 393.8, 1.8, 0.05, 902.1, 400.5, 3.2, 0.04, 902.9, 407.2, 3.5, 0.05, 902.4, 414, 2.2, 0.06, 902.1, 420.7, 3.5, 0.06, 904.4, 427.4, 3.5, 0.05, 904.4, 434.2, 2.2, 0.09, 904.4, 440.9, 0.6, 0.06, 904.1, 447.6, 2.5, 0.06, 904.4, 454.4, 1.5, 0.04, 904.1, 461.1, 1.2, 0.03], [796.9, 441.4, 3.5, 0.16, 794.6, 448, 0.6, 0.38, 796.9, 454.5, 3.5, 0.12, 796.9, 461.1, 3.5, 0.14], [845.5, 395.6, 3.5, 0.39, 842.9, 392.7, 2, 0.57, 839.7, 390.6, 1.8, 0.67, 836.8, 389.4, 1.5, 0.42, 830.4, 387.8, 1.8, 0.25, 827, 386.7, 2, 0.11, 823.7, 385.2, 2, 0.15, 819.3, 382.5, 1.8, 0.71, 817.4, 380.2, 2, 0.83, 817, 379.1, 2.8, 0.57, 818, 375.3, 2, 0.2, 821.2, 372.6, 1.5, 0.11, 824, 369.6, 1.8, 0.07, 826.5, 367.7, 2, 0.13, 830.4, 366.9, 2.2, 0.52], [836.2, 377.9, 2.2, 0.09, 832.3, 376.6, 2.5, 0.11, 829.7, 373.3, 2, 0.44, 829.1, 372.6, 2, 0.51, 830, 367.7, 2, 0.39, 832.7, 364.5, 1.5, 0.69, 834.8, 362.2, 1.8, 0.48, 839.6, 358.5, 2, 0.14, 843.1, 357.1, 1.8, 0.11], [845.1, 395.6, 3.5, 0.39, 845.7, 399.7, 2.5, 0.32, 843.6, 402.9, 2.2, 0.28, 840, 406.6, 2.2, 0.15, 835.7, 410.2, 1.8, 0.54, 831.1, 413.5, 1.5, 0.39, 826.8, 417.2, 1.8, 0.48, 824.3, 420.1, 2, 0.62, 823.5, 424.2, 2.2, 0.88, 823.7, 426.5, 2.5, 0.66, 826.4, 431, 2, 0.25, 830.1, 433.8, 2, 0.36, 836.7, 435.5, 1.8, 0.12, 839.5, 439.6, 3.5, 0.19, 840.3, 443.6, 2.2, 0.2, 840.1, 448.4, 2.2, 0.35], [837.1, 460.7, 2.2, 0.18, 838.1, 456.4, 2.8, 0.32, 842.1, 451.7, 2, 0.18, 844.3, 448, 2, 0.4, 845.9, 445.1, 1.8, 0.58, 846.1, 441.6, 1.8, 0.7, 845.7, 439.7, 2, 0.74, 843.9, 436.8, 1.8, 0.72, 840.2, 433.5, 2, 0.46, 836.4, 430.3, 1.8, 0.63, 834.6, 427.7, 2.2, 0.82, 834, 426.3, 2.2, 0.86, 833.8, 424.7, 2.5, 0.89, 835.3, 421.1, 1.8, 0.86, 838, 418.4, 1.8, 0.87, 843.2, 414.7, 1.8, 0.62, 848.5, 411, 1.5, 0.16, 853.3, 407.1, 2, 0.31, 857, 402.4, 2, 0.64, 858.1, 398.3, 2, 0.57, 858.7, 395.1, 2.2, 0.18, 857.3, 391.4, 2, 0.14, 855.1, 388.4, 2, 0.08]], "51.12": [[796.6, 375.9, 3.2, 0.09, 796.4, 369, 3.5, 0.06, 796.6, 362.2, 3.2, 0.05, 796.1, 355.3, 3.5, 0.04, 796.6, 348.4, 2.2, 0.05, 794.6, 341.6, 3.5, 0.01, 795.6, 334.7, 3.5, 0.03, 794.6, 327.9, 3.5, 0.02, 794.6, 325.8, 1.5, 0.03, 795.6, 324.7, 1.5, 0.03, 802.3, 326.9, 3.5, 0.01, 808.9, 324.6, 2.5, 0.01, 815.5, 325.1, 3.5, 0.01, 822.1, 326.1, 3.5, 0.01, 828.8, 326.3, 3.5, 0.01, 835.4, 326.1, 3, 0.01, 842, 324.5, 3, 0.02, 848.6, 326.8, 3.5, 0.01, 855.3, 324.8, 1.5, 0.01, 861.9, 325.2, 3.5, 0.01, 868.5, 326.7, 3.5, 0, 875.1, 326, 3, 0, 881.8, 326.7, 3.5, 0, 888.4, 324.9, 1, 0, 895, 326.6, 2.5, 0, 901.6, 324.6, 0.6, 0, 903, 325.9, 3.5, 0, 902.9, 326.5, 3.5, 0, 902.1, 333.1, 3.5, 0, 902.1, 339.8, 3.5, 0.01, 902.1, 346.6, 2.5, 0.01, 902.4, 353.3, 2.8, 0.01, 904.1, 360.1, 1.8, 0.02, 902.9, 366.8, 3.5, 0.01, 902.9, 373.5, 3.5, 0.03, 904.4, 380.3, 3.5, 0.03, 903.9, 387, 3.5, 0.06, 902.6, 393.8, 3.5, 0.05, 903.1, 400.5, 3.5, 0.06, 904.4, 407.2, 2.5, 0.05, 903.1, 414, 2.2, 0.06, 903.1, 420.7, 2.5, 0.06, 902.4, 427.4, 3.5, 0.08, 904.4, 434.2, 2.5, 0.09, 904.4, 440.9, 0.6, 0.06, 904.4, 447.6, 2.5, 0.04, 904.4, 454.4, 3.5, 0.04, 903.6, 461.1, 3.5, 0.03], [796.1, 440.6, 3.5, 0.16, 794.6, 447.5, 0.8, 0.64, 796.6, 454.3, 3.5, 0.13, 796.1, 461.1, 3.5, 0.13], [820.3, 371.8, 2, 0.07, 818.1, 373.4, 2.2, 0.13, 816.8, 377.6, 2, 0.46, 817.9, 379, 1.8, 0.76, 819.3, 380.6, 2, 0.54, 821.7, 382.1, 1.8, 0.15, 825.4, 384.5, 2.8, 0.08, 829.5, 385.9, 2.2, 0.19, 833.7, 386.8, 2.2, 0.25, 837.8, 387.7, 1.8, 0.55, 841.9, 389.9, 1.8, 0.59, 845.2, 393.3, 2.8, 0.4], [843.5, 354.8, 2.5, 0.15, 838.9, 357.7, 2, 0.1, 834.5, 360.9, 2, 0.36, 832, 363.1, 1.8, 0.61, 830.6, 366.5, 1.8, 0.32, 829, 370.9, 2.2, 0.36, 830.9, 374, 1.2, 0.08], [833.4, 433.9, 2, 0.37, 830.6, 433, 2, 0.46, 825.6, 428.9, 2, 0.29, 823.6, 425.2, 2, 0.65, 823.1, 422.2, 2, 0.87, 824.4, 418.6, 1.8, 0.63, 826.5, 415.9, 1.8, 0.48, 831.4, 411.5, 1.5, 0.41, 835.8, 408.4, 2, 0.54, 840.1, 405.3, 2, 0.15, 844, 400.9, 2.2, 0.3, 845.6, 397.8, 2.2, 0.41, 845.1, 393.4, 3.5, 0.4], [836.8, 461.1, 3.5, 0.21, 836.9, 460.3, 2.5, 0.2, 838.3, 455.9, 2.5, 0.33, 842.6, 450.7, 2, 0.23, 845.1, 446.9, 1.8, 0.42, 846.4, 443.1, 2, 0.65, 846.5, 439.7, 2, 0.76, 845.9, 437.9, 1.8, 0.81, 843.8, 435.2, 2, 0.73, 841.4, 432.4, 2, 0.52, 838.2, 430.4, 2, 0.46, 834.6, 426.2, 2, 0.78, 834, 424.5, 2.2, 0.89, 833.8, 422.7, 2.2, 0.92, 835.4, 419.5, 2, 0.86, 839.5, 415.3, 1.8, 0.8, 843.9, 412.6, 1.5, 0.49, 848.4, 409.8, 1.8, 0.16, 853.1, 405.8, 2, 0.31, 857, 400.9, 2, 0.64, 858.2, 396.1, 2.2, 0.43, 858.7, 393.6, 2.2, 0.18, 857.5, 389.5, 2, 0.14, 855.1, 386.9, 1.8, 0.09], [839.4, 438.1, 3.5, 0.16, 840.9, 443.1, 2.5, 0.21, 840.1, 447.7, 2, 0.42]], "51.20": [[795.1, 373.9, 3.5, 0.1, 796.8, 367.3, 3.5, 0.08, 796.8, 360.7, 2.8, 0.07, 796.8, 354.1, 3.5, 0.04, 796.7, 347.6, 3.5, 0.05, 794.9, 341, 1.5, 0.01, 796.7, 334.4, 3, 0.02, 796.6, 327.9, 3.5, 0.04, 796.1, 326.3, 3.5, 0.04, 795.9, 326.9, 3.5, 0.04, 802.3, 324.6, 0.8, 0.01, 808.9, 326.6, 3.5, 0.03, 815.5, 326.9, 2.5, 0.01, 822.1, 326.1, 3.5, 0.01, 828.8, 326.1, 1.8, 0.01, 835.4, 325.8, 3.5, 0, 842, 324.5, 1.2, 0.01, 848.6, 325, 3.5, 0.01, 855.3, 326.7, 3.5, 0.01, 861.9, 326.7, 3.5, 0.02, 868.5, 325.2, 3, 0.02, 875.1, 325.7, 2, 0.01, 881.8, 326.7, 3.5, 0.01, 888.4, 326.7, 3.2, 0.01, 895, 324.6, 3.5, 0.01, 901.6, 324.9, 1, 0, 904, 324.5, 2.2, 0.01, 902.9, 326.5, 1.2, 0.01, 904.4, 333.1, 0.6, 0.01, 902.9, 339.8, 3.5, 0.02, 904.3, 346.6, 0.6, 0, 903.6, 353.3, 3.5, 0.01, 902.1, 360.1, 3.5, 0.01, 904.3, 366.8, 0.6, 0, 904.3, 373.5, 1.5, 0.01, 904.3, 380.3, 2.8, 0.05, 902, 387, 3.5, 0.05, 902, 393.7, 3.5, 0.04, 904.5, 400.5, 3.5, 0.06, 902.5, 407.2, 3.5, 0.07, 904.5, 414, 1, 0.07, 903.5, 420.7, 3.5, 0.07, 901.9, 427.4, 3.5, 0.08, 902.9, 434.2, 2, 0.07, 904.4, 440.9, 0.8, 0.08, 901.9, 447.6, 3.5, 0.03, 904.4, 454.4, 0.8, 0.04, 903.4, 461.1, 2.5, 0.05], [794.9, 440.1, 3.5, 0.14, 794.6, 441.6, 3.2, 0.14, 794.7, 445.5, 1.2, 0.87, 795.6, 450.4, 3.5, 0.14, 796, 455.7, 3.5, 0.15, 794.6, 461.1, 1.8, 0.14], [817.6, 376.5, 2, 0.55, 818, 377, 1.8, 0.64, 819.4, 378.7, 2, 0.41, 823, 380.1, 2, 0.1, 826, 382.6, 2, 0.09, 830.6, 384.1, 1.5, 0.25, 836.1, 385.1, 1.5, 0.38, 840.4, 386.9, 1.8, 0.58, 843.5, 389.1, 2, 0.53, 846.4, 391.6, 3.2, 0.5], [828.9, 369.4, 2, 0.36, 830.2, 364.5, 2.2, 0.23, 832, 361.1, 1.5, 0.59, 835.4, 358, 1.8, 0.22, 839.1, 355.1, 2.2, 0.13, 842.5, 353.6, 2.2, 0.16, 843.1, 352.8, 2, 0.13], [835, 432.9, 1.5, 0.17, 833.4, 432.6, 2.2, 0.39, 831.9, 432.2, 1.8, 0.55, 826.6, 428.6, 2.2, 0.26, 823.2, 423.7, 2, 0.75, 822.8, 422.3, 2, 0.97, 822.8, 420.7, 2.2, 0.96, 824.5, 416.6, 1.8, 0.66, 826.6, 413.8, 1.5, 0.52, 830.9, 410, 1.2, 0.38, 835.2, 406.8, 1.8, 0.58, 839.6, 403.5, 2.2, 0.21, 843.8, 399.4, 1.8, 0.28, 846.1, 395.9, 2.5, 0.37, 846.6, 391.9, 3.2, 0.5], [836.6, 460.4, 2.5, 0.24, 837.8, 455.4, 2.2, 0.31, 840.4, 452.5, 2.2, 0.25, 842.8, 449.5, 2.2, 0.19, 845.9, 444.8, 2.2, 0.47, 846.9, 442.3, 1.8, 0.75, 847.2, 439.6, 2.2, 0.79, 846.3, 436.3, 2, 0.86, 845.6, 434.8, 2, 0.83, 841.9, 431, 1.8, 0.56, 837.6, 427.8, 2, 0.49, 834.4, 423.5, 2, 0.87, 834, 422, 2, 1, 833.8, 420.3, 2.2, 0.95, 835, 417.4, 1.8, 0.96, 838.1, 414.2, 2, 0.89, 842.9, 410.8, 1.8, 0.61, 848.1, 408.1, 2.2, 0.17, 853.1, 403.8, 2, 0.3, 856.8, 398.5, 1.8, 0.71, 858.1, 393.4, 1.8, 0.26, 858.7, 390.5, 2.5, 0.19, 857.4, 387.3, 2, 0.14, 855.9, 385.6, 2, 0.11], [838.9, 436.1, 1.8, 0.18, 840.6, 439.9, 2, 0.46, 840.1, 446.1, 2, 0.48]], "51.28": [[796.1, 397.9, 3.5, 0.16, 794.7, 391, 0.8, 0.6, 794.7, 384.1, 1.5, 0.97, 794.7, 377.2, 1.5, 0.98, 796.6, 370.5, 2.2, 0.09, 794.6, 364.5, 3, 0.08, 796.6, 358.4, 3.2, 0.07, 796.1, 352.3, 2.8, 0.03, 796.6, 346.2, 2.5, 0.05, 795.1, 340.1, 1.2, 0.01, 796.6, 334, 3.5, 0.02, 796.6, 327.9, 2.8, 0.01, 796.8, 326.4, 3.5, 0.01, 795.6, 325.2, 1.8, 0.01, 797.5, 326.6, 3.5, 0.01, 804.3, 326.6, 3.5, 0.01, 811.3, 326.4, 2, 0.01, 818.2, 326.4, 3.5, 0.02, 825.2, 324.6, 1, 0.01, 832.1, 324.6, 1.8, 0.01, 839.1, 326.6, 2.5, 0.01, 846, 325.1, 1.5, 0.01, 853, 325.1, 3.5, 0, 859.9, 325.1, 3.5, 0.03, 866.9, 326.6, 3.5, 0, 873.8, 326.6, 3.5, 0.01, 880.8, 325.4, 3.5, 0.01, 887.7, 325.9, 3.5, 0.01, 894.7, 326.6, 2.8, 0.01, 901.6, 324.6, 0.8, 0.01, 903.2, 325.2, 1.8, 0.01, 903.9, 326.4, 1.5, 0.01, 903.1, 333.1, 2.8, 0.02, 904.1, 339.8, 2.2, 0.01, 904.4, 346.6, 1.2, 0.01, 904.4, 353.3, 1, 0.02, 904.4, 360.1, 1, 0.02, 904.4, 366.8, 1.2, 0.02, 902.6, 373.5, 3.2, 0.03, 902.1, 380.3, 2.8, 0.01, 903.1, 387, 2.5, 0.05, 904.4, 393.8, 1, 0.04, 904.4, 400.5, 2.5, 0.06, 903.1, 407.2, 2.8, 0.06, 904.4, 414, 1.8, 0.07, 904.4, 420.7, 2.5, 0.06, 902.1, 427.4, 3.5, 0.06, 903.6, 434.2, 3.5, 0.1, 904.4, 440.9, 1, 0.07, 904.4, 447.6, 2.5, 0.05, 902.9, 454.4, 3.5, 0.03, 904.4, 461.1, 1, 0.06], [796.1, 439.1, 3.5, 0.14, 795.9, 442.3, 3.2, 0.22, 794.7, 444.6, 1.8, 1, 795.4, 449.9, 2.2, 0.16, 796.2, 455.5, 3.5, 0.14, 794.6, 461.1, 3.5, 0.14], [823.7, 363.3, 2.2, 0.07, 825.6, 361.8, 2, 0.15, 829.8, 361.3, 2, 0.49, 831.8, 358.9, 1.8, 0.49, 836.6, 355.1, 2, 0.06], [830.9, 382.6, 3.5, 0.1, 835.5, 383.5, 1.8, 0.21, 840, 384.7, 1.5, 0.52, 845.5, 388.5, 2, 0.54, 846.6, 389.9, 2.2, 0.56, 846.5, 394.1, 2.8, 0.37, 844.6, 397.4, 1.8, 0.29, 840.2, 401.2, 2, 0.17, 835.6, 404.7, 2, 0.53, 831, 408.2, 2, 0.34, 826.6, 412, 1.8, 0.5, 824, 415.4, 2, 0.66, 822.6, 419.4, 2.2, 0.93, 823.2, 422.2, 2.2, 0.7, 825.1, 425.9, 1.8, 0.3, 828.5, 428.9, 2, 0.31, 832.5, 430.9, 2.2, 0.57, 837.1, 432.1, 3.5, 0.06, 840, 437, 2.2, 0.44, 840.6, 439.1, 2.2, 0.43, 839.6, 445.1, 2.5, 0.43], [836.4, 460.7, 2, 0.24, 836.3, 457.8, 2, 0.26, 837.8, 454.7, 2, 0.32, 840.5, 451.6, 2, 0.3, 843, 448.3, 2, 0.2, 845.5, 445.5, 1.8, 0.33, 847, 442.2, 2.2, 0.73, 848, 437.6, 2, 0.8, 846.9, 434.6, 1.8, 0.9, 846.2, 433.1, 1.8, 0.86, 842.6, 429.3, 1.8, 0.56, 838, 426.2, 2.2, 0.46, 834.3, 422, 2.2, 0.89, 833.8, 420.5, 2.2, 1, 833.9, 418.4, 2.2, 1, 835.6, 414.9, 2, 0.88, 838.5, 412.2, 1.8, 0.88, 844.1, 408.3, 2, 0.34, 849.9, 404.6, 2, 0.13, 853.8, 401.2, 2, 0.29, 856.9, 397.1, 2, 0.71, 858.1, 393.8, 1.8, 0.66, 859.6, 390.1, 3.5, 0.06, 857.9, 387.4, 2, 0.15, 856.6, 384, 1.8, 0.13]], "51.36": [[796.1, 395.7, 3.2, 0.19, 794.5, 390, 0.8, 0.46, 794.6, 384.4, 1, 0.89], [795.9, 438.9, 3.5, 0.14, 795.4, 441, 1, 0.26, 795.7, 443, 2.5, 1, 794.7, 445.1, 1, 0.84, 795.4, 449.1, 2.8, 0.16, 796.2, 455.1, 3.5, 0.13, 794.6, 461.1, 3.5, 0.14], [794.7, 376.3, 1.2, 0.98, 794.6, 375.2, 1, 0.92, 796.6, 369.1, 3.2, 0.1, 796.6, 362.2, 3.5, 0.08, 795.6, 355.4, 2.2, 0.07, 795.1, 348.5, 3.5, 0.03, 795.4, 341.6, 3.5, 0.02, 796.6, 334.8, 3, 0.03, 795.9, 327.9, 3.2, 0.02, 794.6, 325.8, 1.5, 0.03, 795.7, 325.4, 3.5, 0.02, 802.3, 325.9, 2.8, 0.02, 808.9, 325.4, 2.2, 0.02, 815.5, 326.9, 3, 0.01, 822.1, 324.6, 1, 0.01, 828.8, 326.8, 3.5, 0.01, 835.4, 326, 3.5, 0.01, 842, 326.8, 2.8, 0.01, 848.6, 325.5, 2, 0.01, 855.3, 325.7, 2.8, 0, 861.9, 326.7, 3.5, 0.02, 868.5, 324.7, 1.2, 0.01, 875.1, 325.7, 2, 0.01, 881.8, 325.4, 3.5, 0.01, 888.4, 325.2, 1.2, 0.01, 895, 324.6, 0.6, 0, 901.6, 324.6, 0.6, 0, 902.7, 326.4, 3.5, 0, 904.4, 326.4, 0.6, 0, 904.4, 333.1, 3.5, 0.01, 903.1, 339.8, 3.5, 0.01, 904.1, 346.6, 3.5, 0.01, 904.4, 353.3, 1, 0.01, 902.6, 360.1, 3.5, 0.02, 903.1, 366.8, 3.5, 0.01, 902.1, 373.5, 3.5, 0.01, 904.4, 380.3, 0.8, 0.01, 904.4, 387, 2.2, 0.02, 904.4, 393.8, 0.8, 0.04, 903.1, 400.5, 3.5, 0.09, 902.6, 407.2, 3.2, 0.04, 904.4, 414, 1.8, 0.06, 903.1, 420.7, 3.5, 0.07, 902.1, 427.4, 3.5, 0.06, 902.9, 434.2, 2, 0.07, 904.4, 440.9, 3.5, 0.06, 902.1, 447.6, 3.2, 0.04, 904.4, 454.4, 2, 0.04, 904.4, 461.1, 2.2, 0.03], [838.2, 382.4, 2.5, 0.16, 840.4, 382.9, 1.5, 0.19, 843.1, 383.9, 2, 0.17, 846.4, 387, 2, 0.73, 847.1, 389.1, 2, 0.61, 846.6, 393, 2, 0.43, 844.6, 395.6, 2, 0.31, 842.6, 397.6, 2, 0.25, 839, 400.8, 1.8, 0.14, 835.6, 403.2, 1.5, 0.53, 832.3, 405.4, 1.5, 0.46, 829.3, 407.9, 1.5, 0.34, 825.1, 412.1, 2, 0.58, 823.1, 415.2, 1.8, 0.72, 822.1, 418.7, 2.2, 0.96, 822.9, 421, 2, 0.71, 825, 424.7, 2.5, 0.33, 829.1, 427.8, 1.8, 0.37, 833.7, 430, 2, 0.31, 837.8, 433.1, 2, 0.18, 840.1, 436, 1.8, 0.57, 840.8, 438.1, 1.8, 0.47, 839.9, 443, 2.2, 0.51, 837.3, 445.5, 2, 0.29, 836.9, 445.9, 2.2, 0.23], [836.1, 460.7, 2, 0.24, 836.1, 458.4, 2, 0.3, 836.6, 455.8, 2, 0.26, 839.9, 451.4, 1.8, 0.38, 842.6, 448.7, 2, 0.19, 845, 445.8, 1.8, 0.21, 847.1, 442.5, 2, 0.55, 848.5, 439.2, 2.2, 0.89, 848.9, 437.2, 2.2, 0.83, 846.5, 431.2, 1.8, 0.84, 841.6, 426.4, 1.5, 0.46, 836, 422.3, 2, 0.62, 833.9, 418.9, 2.2, 0.83, 833.4, 416.4, 2, 0.94, 833.9, 415, 2, 0.9, 837.6, 410.5, 1.8, 0.93, 840.3, 408.2, 1.8, 0.74, 844.1, 405.8, 2, 0.31, 848.4, 404, 1.8, 0.11, 851.1, 401.2, 1.8, 0.15, 854.3, 399, 1.8, 0.33, 856.6, 395.5, 2, 0.63, 858.1, 391.1, 2, 0.6, 858.6, 388.1, 2.8, 0.13, 857.8, 385.4, 2, 0.15, 856.4, 383.2, 1.8, 0.13]], "51.44": [[795.9, 393.9, 3.5, 0.18, 794.6, 387.3, 0.6, 0.38, 794.6, 380.7, 1, 0.83, 794.6, 374.1, 1, 0.81, 795.9, 367.5, 3.5, 0.09, 795.6, 360.9, 3.5, 0.08, 794.6, 354.3, 2, 0.05, 794.9, 347.7, 2.8, 0.05, 794.9, 341.1, 1.5, 0.06, 796.6, 334.5, 3.5, 0.04, 796.1, 327.9, 3.5, 0.01, 796.3, 326.3, 3.5, 0.01, 796.4, 326.8, 3.5, 0.01, 797.5, 326.6, 2.8, 0.02, 804.3, 326.1, 2.8, 0.02, 811.3, 325.9, 2.8, 0.03, 818.2, 326.1, 3.2, 0.01, 825.2, 325.6, 2, 0.01, 832.1, 326.6, 3.5, 0, 839.1, 326.1, 3.5, 0.01, 846, 324.6, 2, 0.02, 853, 324.6, 3.5, 0, 859.9, 326.1, 2.5, 0.02, 866.9, 326.6, 3.5, 0.01, 873.8, 326.4, 2.2, 0.01, 880.8, 324.6, 3.5, 0.01, 887.7, 326.1, 3.5, 0.02, 894.7, 324.6, 3, 0.01, 901.6, 325.9, 2, 0, 902.8, 325.8, 2.2, 0, 904.4, 326.4, 1.5, 0, 903.6, 333.1, 3.5, 0.03, 904.1, 339.8, 1.5, 0.01, 904.4, 346.6, 0.8, 0.01, 904.4, 353.3, 3.2, 0.01, 904.4, 360.1, 0.8, 0.02, 904.4, 366.8, 0.6, 0.01, 904.4, 373.5, 1.8, 0.03, 902.6, 380.3, 3.5, 0.02, 903.6, 387, 3.5, 0.05, 904.4, 393.8, 1.5, 0.04, 902.6, 400.5, 2.5, 0.05, 903.4, 407.2, 2.5, 0.07, 904.4, 414, 2, 0.07, 904.4, 420.7, 3.5, 0.07, 904.4, 427.4, 3.5, 0.08, 904.4, 434.2, 2.5, 0.09, 904.4, 440.9, 3.5, 0.06, 902.1, 447.6, 3.5, 0.05, 904.4, 454.4, 3.5, 0.05, 903.4, 461.1, 2.5, 0.05], [794.6, 461.1, 1.2, 0.15, 795, 454.9, 1.5, 0.13, 795.1, 448.6, 2.5, 0.18, 794.6, 443.8, 1.2, 0.97, 795.9, 442, 3, 1], [837.1, 444.9, 2, 0.27, 839.4, 442.5, 2, 0.51, 840.2, 441.1, 2.2, 0.49, 840.7, 435.5, 2.2, 0.51, 840, 434.3, 1.8, 0.54, 837.9, 431.6, 2.2, 0.21, 833.5, 428.7, 2, 0.32, 828.9, 426.1, 1.8, 0.36, 824.5, 423.2, 2, 0.36, 822.6, 419.8, 2, 0.71, 821.9, 416.9, 2, 0.89, 822.5, 415.4, 2.2, 0.81, 825.6, 409.6, 1.8, 0.51, 829.4, 406.2, 1.8, 0.32, 833.4, 402.9, 1.8, 0.45, 837.9, 399.8, 1.5, 0.13, 842.5, 396.7, 1.5, 0.22, 845.3, 393.6, 1.8, 0.32, 847, 390.9, 2.2, 0.45, 847.4, 386.9, 2.2, 0.66, 846.7, 384.5, 2, 0.66, 844, 382.1, 1.8, 0.13, 838, 380.1, 2, 0.13, 837.4, 380.1, 3.5, 0.08], [836.9, 462.2, 2.5, 0.24, 836.4, 460.9, 2.2, 0.23, 836.1, 458.9, 2, 0.33, 836.7, 455, 2.2, 0.31, 839, 451.9, 1.8, 0.37, 841.8, 449, 2.2, 0.31, 844.2, 445.8, 2.2, 0.16, 847.9, 441, 2.2, 0.57, 849.4, 437.1, 2.2, 0.87, 848.2, 430.7, 2, 0.84, 847.4, 429.5, 1.8, 0.82, 843.4, 425.4, 2, 0.53, 839.7, 423.2, 2.2, 0.37, 836.4, 420.6, 1.8, 0.56, 833.5, 417, 2, 0.86, 833.3, 414.9, 2.2, 0.91, 834.6, 411.3, 2, 0.87, 838.5, 407.3, 1.8, 0.76, 843.5, 403.9, 1.8, 0.34, 847.7, 402.1, 1.8, 0.09], [851.5, 398.5, 2.2, 0.12, 856.4, 393.7, 1.8, 0.52, 858.2, 389.2, 2, 0.6, 858.6, 384.3, 2.5, 0.16, 856.3, 380.5, 1.8, 0.12]], "51.52": [[795.9, 391.9, 1.8, 0.16, 794.5, 386.9, 0.6, 0.32, 794.7, 381.9, 0.8, 0.6, 794.6, 376.9, 1, 0.83, 794.6, 371.6, 0.8, 0.63, 794.6, 366.4, 0.6, 0.1, 794.6, 360, 1.2, 0.08, 796.6, 353.5, 3.5, 0.04, 795.1, 347.1, 3.5, 0.03, 794.6, 340.7, 3.5, 0.03, 794.6, 334.3, 0.8, 0.04, 795.6, 327.9, 2.8, 0.04, 796.3, 326.3, 2.5, 0.04, 796.4, 326.8, 3.5, 0.04, 797.5, 326.6, 2.8, 0.03, 804.3, 324.6, 1.2, 0.02, 811.3, 326.4, 3.5, 0.03, 818.2, 326.6, 3.2, 0.02, 825.2, 325.6, 2, 0.01, 832.1, 325.1, 3.5, 0, 839.1, 324.6, 1, 0.01, 846, 326.6, 3.5, 0.01, 853, 325.1, 3.5, 0, 859.9, 326.6, 3, 0.02, 866.9, 324.6, 1, 0.01, 873.8, 326.6, 3.5, 0.01, 880.8, 326.6, 3.5, 0.01, 887.7, 324.6, 3.5, 0, 894.7, 324.6, 0.8, 0, 901.5, 326.6, 3, 0.01, 902.8, 325.8, 3.5, 0.01, 903.9, 326.4, 2, 0.02, 903.1, 333.1, 2.8, 0.02, 902.1, 339.8, 3.5, 0.03, 904.3, 346.6, 1.2, 0.01, 904.3, 353.3, 1, 0.01, 904.3, 360.1, 0.8, 0.02, 904.3, 366.8, 2.8, 0.01, 902.5, 373.5, 3.5, 0.01, 904, 380.3, 1.2, 0.01, 902.5, 387, 3.5, 0.05, 904.5, 393.8, 2, 0.08, 902, 400.5, 3, 0.06, 903, 407.2, 3.5, 0.07, 904.5, 414, 2.8, 0.07, 902, 420.7, 3.5, 0.05, 904.4, 427.4, 3.5, 0.08, 904.4, 434.2, 3.5, 0.07, 901.9, 440.9, 3.5, 0.06, 901.9, 447.6, 3.5, 0.06, 901.9, 454.4, 3.5, 0.05, 904.4, 461.1, 1.5, 0.06], [795.4, 447.1, 2.8, 0.17, 795.6, 451.8, 3.5, 0.16, 795.4, 456.5, 2.5, 0.13, 794.6, 461.1, 0.8, 0.14], [846.7, 399.9, 1.2, 0.12, 843, 401.5, 2, 0.36, 839.9, 403.4, 1.8, 0.65, 837.1, 405.7, 2, 0.79, 834.6, 408.8, 1.8, 0.71, 833, 412.4, 2.2, 0.81, 833.7, 414.7, 2, 0.68, 836.5, 418.8, 2, 0.49, 840.4, 421.5, 2, 0.36, 844.4, 424, 2, 0.45, 848.1, 428, 2.2, 0.54, 850, 431, 2, 0.44, 850.3, 434.6, 2.2, 0.86, 849.7, 437.8, 2, 0.79, 846.1, 443.6, 2.2, 0.14, 842.9, 447.2, 2.2, 0.29, 839.4, 450.4, 1.8, 0.37, 836.7, 453.8, 2.5, 0.37, 836, 455.8, 1.8, 0.37, 836.1, 458.4, 1.8, 0.37, 836.3, 460.5, 2.2, 0.29, 837.5, 462.4, 2.2, 0.35], [837.1, 443.6, 2, 0.33, 839, 441.2, 1.8, 0.52, 840, 439.3, 2.5, 0.47, 840.9, 434.9, 2.2, 0.54, 839.8, 433.4, 1.8, 0.56, 837.9, 430.6, 1.8, 0.32, 832.6, 427.2, 2, 0.4, 829.1, 425.2, 1.8, 0.33, 824.1, 421.5, 1.5, 0.46, 822.2, 417.9, 1.8, 0.8, 821.8, 414.9, 2, 0.83, 822.1, 413, 2, 0.75, 824.3, 408.9, 2.2, 0.57, 827.6, 405.5, 1.5, 0.38, 831, 402.8, 1.8, 0.38, 834.4, 400, 1.5, 0.41, 839.3, 397.8, 1.5, 0.14, 842.8, 394.5, 1.8, 0.2, 846.2, 391.1, 1.8, 0.35, 847.6, 388.4, 2.5, 0.43, 848.1, 384.9, 2, 0.69, 847.7, 383, 2.2, 0.57, 846.4, 381.1, 1.8, 0.29], [851.6, 395.9, 2, 0.1, 854.6, 393.6, 1.8, 0.3, 857.4, 390, 1.8, 0.24, 858.9, 383.1, 2.2, 0.17, 856.9, 379.4, 2, 0.11]], "51.64": [[795.9, 390.7, 1.5, 0.17, 794.7, 385.5, 0.6, 0.3, 794.6, 380.4, 0.8, 0.59, 794.7, 375.3, 1, 0.82, 794.7, 368.6, 0.8, 0.56, 794.9, 361.8, 1.5, 0.07, 796.1, 355, 2.5, 0.08, 796.8, 348.2, 3.5, 0.06, 796, 341.4, 3.5, 0.04, 794.7, 334.7, 1.2, 0.03, 794.6, 327.9, 0.6, 0.02, 794.9, 325.9, 1.8, 0.02, 795.3, 324.6, 1.5, 0.04, 797.6, 324.6, 3.2, 0.03, 804.6, 325.9, 2.5, 0.02, 811.5, 325.1, 3.5, 0.02, 818.4, 324.6, 1.5, 0.02, 825.4, 325.1, 2.8, 0.02, 832.3, 325.6, 3.5, 0.01, 839.2, 326.6, 3.5, 0.02, 846.2, 326.6, 3.5, 0.01, 853.1, 324.6, 2, 0.01, 860, 324.6, 0.6, 0, 867, 326.6, 2.8, 0.01, 873.9, 326.6, 3.5, 0.01, 880.8, 326.6, 3, 0.01, 887.8, 326.6, 2.5, 0, 894.7, 324.9, 1.8, 0.01, 901.6, 324.6, 1.8, 0, 902.8, 325.8, 0.8, 0.01, 903.1, 326.5, 1, 0.01, 904.4, 333.1, 1, 0.01, 904.1, 339.8, 1.8, 0.02, 902.1, 346.6, 3.5, 0.01, 902.6, 353.3, 3.5, 0.01, 904.1, 360.1, 1.8, 0.01, 902.1, 366.8, 2.5, 0, 904.4, 373.5, 2, 0.02, 904.4, 380.3, 1, 0.02, 902.1, 387, 3.5, 0.05, 904.4, 393.8, 1, 0.02, 902.1, 400.5, 2, 0.07, 903.1, 407.2, 3.5, 0.04, 902.1, 414, 3.5, 0.07, 902.1, 420.7, 2.8, 0.06, 903.1, 427.4, 3.5, 0.07, 903.4, 434.2, 3.2, 0.09, 902.4, 440.9, 3.2, 0.06, 902.4, 447.6, 3.5, 0.06, 902.9, 454.4, 3.5, 0.03, 902.9, 461.1, 2.8, 0.04], [795.9, 446.1, 2.2, 0.17, 796.1, 451.1, 3.5, 0.16, 794.6, 456.1, 2.8, 0.14, 794.6, 461.1, 1, 0.15], [846.7, 397.9, 1.5, 0.17, 841.3, 400.2, 1.8, 0.57, 836.9, 404.2, 2, 0.77, 834.2, 407.4, 2, 0.65, 833.1, 411.2, 2, 0.74, 833.3, 412.9, 2.2, 0.63, 835.2, 415.7, 2.2, 0.42, 840.4, 419, 2, 0.3, 845.6, 422.4, 2, 0.44, 848.5, 425.1, 1.8, 0.41, 849.7, 427.1, 2.2, 0.36, 851.2, 433.1, 2.2, 0.82, 850.4, 436.9, 2.2, 0.76, 847.3, 441.9, 2.2, 0.13, 844.6, 444.7, 2.2, 0.19, 841.9, 447, 2.2, 0.36, 839.4, 449.6, 1.8, 0.37, 836.4, 453.3, 1.8, 0.39, 836.2, 456.4, 1.8, 0.37, 836.4, 459, 2.2, 0.32, 837.6, 461, 2, 0.42, 839, 462.7, 2, 0.46], [836.1, 397.4, 3.5, 0.08, 831.1, 400.8, 1.5, 0.38, 827.9, 403.7, 1.8, 0.35, 824.9, 406.8, 1.8, 0.5, 822, 411, 2, 0.73, 821.6, 412.4, 2.2, 0.78, 822.2, 417.2, 2, 0.82, 823, 419, 2.2, 0.67, 826.7, 422.9, 1.8, 0.23, 829.8, 424.9, 1.8, 0.31, 833, 426.4, 2, 0.33, 835.8, 428.9, 2, 0.18, 839.1, 430.8, 2.5, 0.54, 839.9, 431.8, 2.2, 0.55, 840.9, 434.9, 2.2, 0.47, 839.8, 438.6, 2.5, 0.52, 838.9, 440.6, 2, 0.53, 836.4, 442.9, 2.2, 0.25, 836.4, 443.7, 2.2, 0.19], [841.1, 394.4, 1.8, 0.09, 845.4, 390.9, 2, 0.31, 848, 386.7, 2, 0.44, 848.4, 381.9, 2.2, 0.64, 847.7, 380.3, 2, 0.49, 846.8, 380, 2, 0.33], [852.9, 393.6, 1.8, 0.15, 856.5, 389.9, 2, 0.23, 858.2, 384.3, 2.2, 0.24, 858.9, 381.5, 2.5, 0.14, 857.6, 378.3, 2.2, 0.11]], "51.72": [[794.9, 388.6, 0.8, 0.14, 794.6, 381.9, 0.6, 0.4, 794.6, 375.1, 0.8, 0.74, 794.6, 368.4, 0.8, 0.71, 794.9, 361.6, 3, 0.09, 794.6, 354.9, 1.5, 0.08, 796.6, 348.1, 3.5, 0.07, 796.6, 341.4, 3, 0.04, 794.6, 334.6, 1.2, 0.05, 794.6, 327.9, 2.8, 0.01, 796.8, 326.4, 1.8, 0.02, 795.2, 324.6, 0.8, 0.01, 797.4, 326.1, 1.8, 0.02, 804.3, 326.4, 3.5, 0.01, 811.3, 324.9, 2.5, 0.03, 818.2, 325.1, 3.5, 0.02, 825.2, 326.6, 3.5, 0.01, 832.1, 325.1, 3, 0.02, 839.1, 326.6, 3, 0.02, 846, 324.6, 3.5, 0.01, 853, 324.6, 0.8, 0.02, 859.9, 326.6, 3.5, 0.01, 866.9, 324.6, 0.6, 0.01, 873.8, 324.6, 3.5, 0, 880.8, 326.6, 3, 0.01, 887.7, 326.6, 3.5, 0, 894.7, 324.6, 1.2, 0.01, 901.6, 324.6, 3, 0.02, 903.6, 324.6, 3.5, 0.01, 902.6, 326.5, 3.2, 0.01, 902.9, 333.1, 3.5, 0.01, 902.1, 339.8, 3.5, 0.03, 904.4, 346.6, 3.5, 0.01, 902.6, 353.3, 3.5, 0.02, 904.4, 360.1, 0.6, 0, 904.4, 366.8, 1.2, 0.01, 904.4, 373.5, 1.2, 0.03, 902.1, 380.3, 3.2, 0.02, 904.1, 387, 3.5, 0.06, 904.4, 393.8, 3.5, 0.04, 903.1, 400.5, 3.5, 0.07, 903.9, 407.2, 1.8, 0.05, 902.1, 414, 3.5, 0.07, 902.4, 420.7, 3.5, 0.07, 904.4, 427.4, 3.5, 0.07, 902.1, 434.2, 3.5, 0.06, 904.4, 440.9, 0.8, 0.05, 902.1, 447.6, 3.5, 0.07, 902.1, 454.4, 3, 0.04, 902.9, 461.1, 3.5, 0.03], [795.9, 445.1, 2.5, 0.18, 796.1, 450.4, 3.5, 0.17, 794.6, 455.6, 3.5, 0.14, 794.6, 460.9, 1.5, 0.13], [830.6, 457.9, 2.2, 0.41, 829.3, 455.8, 2, 0.52, 828.8, 452.1, 3, 0.22, 831.9, 447.1, 2.2, 0.21, 834.5, 442.7, 3.5, 0.14, 838.3, 439.4, 1.8, 0.54, 840, 436.6, 2.2, 0.49, 840.3, 431.6, 2.2, 0.51, 839.1, 429.5, 2.5, 0.49, 837.6, 427.8, 2.2, 0.34, 833.3, 425.1, 2, 0.36, 828.8, 422.7, 1.8, 0.27, 824.6, 419.7, 1.8, 0.4, 822.7, 416.6, 2, 0.71, 821, 412.6, 2, 0.8, 822, 409.8, 2.2, 0.69, 824.5, 405.3, 1.8, 0.52, 828.6, 401.4, 1.8, 0.31, 832.9, 397.6, 2, 0.27], [846.3, 394.9, 2, 0.15, 844.5, 395.9, 2.2, 0.29, 841.8, 397.4, 2, 0.5, 839.1, 399.7, 1.5, 0.64, 836.6, 402, 1.8, 0.79, 833.8, 405.9, 1.8, 0.61, 832.8, 409.4, 2, 0.7, 833.5, 410.6, 1.8, 0.59, 836.1, 414.3, 1.8, 0.33, 841.2, 417.4, 1.8, 0.23, 846.4, 420.6, 2, 0.39, 849.6, 423.4, 2, 0.44, 850.4, 425.4, 2, 0.38, 852, 431.9, 2, 0.72, 851.4, 434.2, 2, 0.83, 848.4, 440.1, 2.2, 0.15, 846.1, 442.8, 2.2, 0.16, 842.2, 446, 2, 0.44, 838.6, 449.6, 1.8, 0.41, 836.1, 452.8, 2.2, 0.47, 836.1, 455.9, 2, 0.45, 836.3, 457.7, 2, 0.41, 837.8, 460.2, 2, 0.42, 839.4, 462, 2.5, 0.42], [844.1, 390.9, 2.8, 0.23, 846.8, 388.4, 1.8, 0.36, 848.3, 385.8, 2, 0.46, 848.6, 379.1, 2.2, 0.47, 848, 378.7, 1.8, 0.39]], "51.80": [[794.9, 387.1, 2, 0.15, 794.6, 380.5, 0.6, 0.37, 794.6, 374, 0.8, 0.73, 794.6, 367.4, 0.8, 0.71, 794.6, 360.8, 0.6, 0.08, 794.6, 354.2, 3.5, 0.08, 796.6, 347.6, 2.5, 0.05, 794.6, 341, 1.2, 0.06, 794.6, 334.5, 3.5, 0.04, 796.6, 327.9, 3.5, 0.06, 796.8, 326.4, 3.5, 0.05, 796.3, 326.5, 3, 0.05, 797.2, 326.6, 3.5, 0.06, 804.1, 324.6, 1.2, 0.02, 811.1, 325.9, 2, 0.01, 818, 326.6, 3, 0.03, 825, 326.6, 3.2, 0.03, 832, 324.6, 0.6, 0.01, 838.9, 324.6, 1, 0.03, 845.9, 326.6, 3.5, 0.02, 852.9, 324.6, 1.5, 0.02, 859.8, 326.6, 3.2, 0.02, 866.8, 324.6, 1, 0.01, 873.8, 324.6, 1, 0.01, 880.7, 325.4, 3.5, 0.01, 887.7, 326.1, 3.5, 0.01, 894.7, 326.6, 3, 0.01, 901.6, 326.1, 1.8, 0.01, 903.5, 324.8, 1.2, 0.01, 904.4, 326.4, 0.6, 0, 903.1, 333.1, 3.5, 0.01, 903.4, 339.8, 2.8, 0.01, 902.6, 346.6, 3.5, 0.02, 904.1, 353.3, 1.2, 0.01, 903.6, 360.1, 1.8, 0.01, 904.4, 366.8, 2.2, 0.03, 904.4, 373.5, 3.5, 0.03, 904.4, 380.3, 0.8, 0.02, 904.4, 387, 3.5, 0.03, 904.4, 393.8, 0.6, 0.01, 904.4, 400.5, 1.8, 0.05, 903.9, 407.2, 1.8, 0.04, 902.1, 414, 2.8, 0.06, 904.4, 420.7, 3.5, 0.06, 902.1, 427.4, 3, 0.08, 904.4, 434.2, 1.2, 0.07, 904.4, 440.9, 1.2, 0.1, 902.1, 447.6, 2.8, 0.04, 904.1, 454.4, 1.2, 0.09, 902.1, 461.1, 3.5, 0.03], [795.6, 444.6, 2.2, 0.18, 796, 450.1, 3, 0.16, 796.8, 455.6, 3.5, 0.15, 795.9, 461.1, 3.5, 0.14], [830.9, 457.4, 2.2, 0.34, 829.3, 455.4, 1.8, 0.51, 828.7, 451.8, 2, 0.42, 828.6, 450, 3.2, 0.18, 830.4, 446.6, 2.5, 0.16, 833.1, 443.1, 2.2, 0.16, 836.3, 440, 1.8, 0.38, 838.3, 438.1, 2, 0.54, 840.7, 434.1, 2.5, 0.45, 840.4, 430.4, 2.2, 0.53, 838, 427.5, 2.2, 0.41, 833.6, 424.2, 2.2, 0.35, 828.5, 421.7, 1.8, 0.29, 824.1, 418.1, 1.8, 0.51, 822, 414.5, 2, 0.77, 821.1, 411.9, 2, 0.76, 821.6, 408.5, 2, 0.65, 823.9, 404.8, 2, 0.54, 828.4, 400, 2, 0.29, 833.1, 395.4, 2, 0.18], [840.2, 462.4, 2.5, 0.42, 838.8, 460.1, 2, 0.41, 836.2, 456.5, 2, 0.49, 836.7, 451.8, 2, 0.49, 838.6, 448.9, 1.8, 0.46, 842.3, 445.2, 1.8, 0.44, 846.2, 441.8, 2, 0.16, 849, 438.5, 1.8, 0.16, 851.1, 435.6, 2, 0.44, 852.4, 432.3, 2.2, 0.83, 852.5, 427.6, 2.2, 0.39, 851.2, 424, 2.2, 0.4, 849.6, 421.4, 1.8, 0.42, 844.9, 417.8, 1.5, 0.45, 840.4, 415.1, 1.8, 0.24, 835.9, 412.5, 1.8, 0.3, 833.9, 410.4, 2, 0.35, 833.2, 407.9, 2, 0.62, 833.8, 404, 1.8, 0.59, 836.3, 400.7, 1.5, 0.78, 840.3, 396.7, 1.5, 0.59, 845, 393.6, 2.2, 0.25], [844.9, 389.6, 2.2, 0.23, 847.1, 387.1, 1.5, 0.34, 849.3, 383.2, 1.8, 0.45, 850, 379.1, 1.8, 0.5, 849.6, 376.8, 1.8, 0.28]], "51.88": [[794.6, 385.9, 1.8, 0.17, 794.6, 379.4, 0.6, 0.49, 794.6, 373, 0.8, 0.74, 794.6, 366.5, 0.8, 0.7, 794.6, 360.1, 0.6, 0.2, 796.6, 353.7, 3.2, 0.07, 794.6, 347.2, 1, 0.08, 796.6, 340.8, 3, 0.05, 796.6, 334.3, 2.8, 0.01, 795.6, 327.9, 2.2, 0.04, 795.6, 326.1, 2.2, 0.04, 795.8, 326.1, 3.5, 0.04, 802.3, 324.6, 1.5, 0.03, 808.9, 324.6, 3.5, 0.01, 815.5, 325.1, 2.5, 0.04, 822.2, 326.8, 1.5, 0.02, 828.8, 324.6, 1, 0.01, 835.4, 325.8, 2.5, 0.01, 842, 326, 1, 0.01, 848.6, 326.8, 3.5, 0.01, 855.3, 324.7, 1.5, 0.01, 861.9, 326.7, 3.5, 0, 868.5, 326.7, 3.5, 0.01, 875.1, 324.7, 3.5, 0, 881.8, 326.7, 3, 0.01, 888.4, 325.9, 3.5, 0.01, 895, 324.6, 1, 0.01, 901.5, 326.6, 3, 0.01, 903.6, 324.6, 1.2, 0.01, 902.1, 326.6, 2.5, 0.01, 902.1, 333.1, 3.5, 0.02, 904.4, 339.8, 2.5, 0.02, 902.1, 346.6, 3.2, 0.02, 903.1, 353.3, 3.5, 0.02, 904.4, 360.1, 0.8, 0.01, 902.1, 366.8, 3.2, 0.02, 904.4, 373.5, 1.5, 0.02, 903.1, 380.3, 3.5, 0.04, 903.1, 387, 3.5, 0.04, 903.1, 393.8, 2.2, 0.03, 903.1, 400.5, 3.2, 0.07, 902.9, 407.2, 3.5, 0.04, 904.4, 414, 1, 0.05, 903.1, 420.7, 2.2, 0.05, 904.4, 427.4, 0.8, 0.08, 902.1, 434.2, 3.5, 0.06, 902.1, 440.9, 2.8, 0.06, 904.4, 447.6, 3.2, 0.08, 904.4, 454.4, 1, 0.04, 903.1, 461.1, 2.5, 0.04], [795.9, 443.1, 2.8, 0.18, 794.6, 449.1, 0.8, 0.17, 796.4, 455.1, 3.5, 0.15, 794.6, 461.1, 2.8, 0.15], [832.1, 457.7, 2.5, 0.19, 829.2, 454.5, 2.2, 0.54, 828, 450.4, 2.2, 0.36, 829.1, 446.6, 2.2, 0.14, 832.3, 442.5, 1.8, 0.24, 835.5, 439.5, 2, 0.28, 838.5, 436.5, 2.2, 0.54, 840.7, 433.7, 2.5, 0.49, 840.4, 428.7, 2.5, 0.5, 838.4, 426.1, 2.2, 0.39, 833.6, 422.8, 2, 0.37, 830.8, 422, 1.8, 0.41, 827.5, 419.5, 2, 0.27, 824.3, 417.1, 1.8, 0.47, 822.4, 414.5, 2, 0.64, 820.8, 409.6, 2.2, 0.75, 821.7, 407.1, 2.2, 0.64, 823.5, 403.2, 2, 0.53, 828.1, 398.6, 1.5, 0.29, 832.6, 394.1, 1.8, 0.17], [840.4, 461.7, 2.2, 0.4, 839.1, 459.6, 2.2, 0.47, 836.5, 456, 2, 0.5, 836.1, 453.9, 2, 0.55, 836.3, 451.3, 2.2, 0.53, 838.9, 447.6, 2, 0.45, 842.2, 444.3, 2, 0.41, 845.9, 441.3, 2.8, 0.21, 849.4, 438.1, 2.2, 0.13, 852.7, 432.5, 2.2, 0.73, 853, 429.6, 2, 0.66, 852.9, 426.1, 2, 0.39, 851.8, 422.7, 2, 0.34, 851, 420.6, 2, 0.39, 845.9, 416.3, 1.8, 0.41, 842.6, 414.6, 1.8, 0.26, 839.4, 413, 1.8, 0.24, 835.4, 410.3, 1.8, 0.31, 833.7, 408.4, 2, 0.37, 832.8, 405.9, 1.8, 0.65, 833.7, 402.6, 1.8, 0.53, 835.9, 398.9, 2, 0.68, 839.4, 394.9, 1.8, 0.59, 844.7, 390.8, 2, 0.3, 845.2, 387.2, 3.5, 0.2, 849.3, 382.6, 2, 0.36, 850.4, 380.7, 2, 0.34, 850.7, 376.9, 2, 0.43, 849.9, 375.3, 1.8, 0.33, 849.8, 375.1, 2.2, 0.31]], "51.96": [[794.9, 384.6, 2, 0.16, 794.5, 379.4, 0.6, 0.43, 794.7, 374.2, 0.8, 0.69, 794.6, 369, 1.2, 0.88, 794.6, 363.4, 0.8, 0.67, 794.6, 357.9, 0.6, 0.14, 796.6, 351.9, 2, 0.06, 796.6, 345.9, 3, 0.05, 796.6, 339.9, 3.5, 0.04, 796.6, 333.9, 3.5, 0.03, 795.6, 327.9, 3.5, 0.02, 794.6, 325.8, 1.5, 0.03, 795.6, 324.7, 1.8, 0.03, 802.3, 326.9, 3.2, 0.03, 808.9, 324.6, 1.2, 0.04, 815.5, 326.9, 3.2, 0.02, 822.1, 325.1, 1.5, 0.02, 828.8, 324.6, 0.6, 0, 835.4, 326.8, 3.2, 0.02, 842, 326.8, 3.5, 0.03, 848.6, 326.8, 2, 0.01, 855.3, 324.7, 0.6, 0, 861.9, 325.2, 3.5, 0.02, 868.5, 326.7, 3.5, 0.03, 875.1, 325.7, 2, 0.01, 881.8, 324.7, 3.5, 0.01, 888.4, 326.7, 3.5, 0.01, 895, 325.1, 3.5, 0.01, 901.5, 326.6, 3.2, 0.01, 902.2, 326.6, 2.5, 0.01, 902.1, 326.6, 3.2, 0.01, 902.4, 333.1, 3.2, 0.01, 903.6, 339.8, 3.5, 0.02, 904.1, 346.6, 1.2, 0.01, 904.4, 353.3, 1, 0.01, 904.4, 360.1, 3.5, 0.01, 904.4, 366.8, 1.2, 0.01, 904.4, 373.5, 1.2, 0.01, 902.1, 380.3, 2.5, 0.01, 902.1, 387, 3.5, 0.04, 902.9, 393.8, 3.5, 0.03, 904.4, 400.5, 3.5, 0.07, 902.9, 407.2, 3.5, 0.04, 904.4, 414, 3, 0.08, 903.1, 420.7, 3.5, 0.05, 903.1, 427.4, 3, 0.07, 904.4, 434.2, 2.5, 0.06, 904.4, 440.9, 0.6, 0.05, 904.4, 447.6, 1, 0.05, 902.1, 454.4, 3.5, 0.01, 902.6, 461.1, 3.5, 0.04], [795.6, 442.4, 2.5, 0.17, 795, 448.6, 2, 0.15, 794.5, 454.9, 3.5, 0.14, 795.9, 461.1, 2.2, 0.13], [831.6, 456.6, 2, 0.23, 828.2, 452.3, 1.8, 0.61, 827.8, 449.6, 2, 0.47, 828.6, 445.9, 2.5, 0.17, 832.9, 440.9, 1.8, 0.28, 835.6, 438.7, 2, 0.3, 838.1, 436.3, 2.2, 0.52, 840.4, 433.6, 2.5, 0.54], [832.2, 392.9, 2.8, 0.19, 827.6, 397.4, 2, 0.3, 823.2, 402.1, 2, 0.5, 821.6, 405.5, 2, 0.63, 821.1, 409.3, 2, 0.73, 822.3, 413, 2.2, 0.67, 824.7, 415.9, 2, 0.46, 829.3, 419.4, 1.5, 0.27, 834.5, 422.2, 2, 0.36, 839.4, 425.3, 2.5, 0.47, 840.4, 427.4, 2.5, 0.52, 840.4, 433.4, 3, 0.54], [840.3, 461.4, 2.5, 0.4, 839.4, 459.4, 2.2, 0.45, 836.5, 454.6, 2.2, 0.53, 836.1, 453.4, 2, 0.55, 836.5, 450.9, 2.2, 0.52, 840.1, 445.4, 1.8, 0.47, 845.2, 441.3, 2, 0.32, 849.9, 436.9, 2, 0.14, 852.9, 431.5, 2, 0.71, 853.5, 427.9, 2.2, 0.62, 852.6, 421.6, 2, 0.31, 850.7, 418.4, 1.8, 0.4, 847.6, 415.7, 2, 0.42, 843.5, 413.3, 2, 0.27, 839.3, 411.2, 2, 0.24, 835.4, 408.5, 2, 0.32, 833.1, 405.9, 1.8, 0.5, 832.8, 404.2, 2, 0.65, 834.4, 399.7, 1.8, 0.55, 837, 395.1, 1.8, 0.77, 839.5, 392.9, 1.8, 0.65, 845, 388.8, 2, 0.32, 847.4, 384.8, 2.2, 0.32, 850.1, 381, 1.8, 0.39, 851, 378.9, 2.2, 0.35, 851.1, 375.4, 2, 0.42, 850.6, 373.4, 2, 0.31]], "52.04": [[794.6, 383.4, 2, 0.18, 794.5, 378, 0.6, 0.45, 794.7, 372.7, 1, 0.75, 794.6, 367.4, 1.2, 0.89, 794.6, 361.6, 0.8, 0.76, 794.6, 355.9, 0.6, 0.11, 794.6, 350.3, 0.8, 0.07, 796.6, 344.7, 3.5, 0.06, 794.6, 339.1, 3.2, 0.06, 796.4, 333.5, 3.5, 0.05, 795.9, 327.9, 3.5, 0.01, 796.5, 326.5, 3.2, 0.02, 795.6, 324.7, 2.5, 0.03, 802.3, 326.9, 2.5, 0.01, 808.9, 326.9, 3.5, 0.02, 815.5, 325.1, 3.5, 0.02, 822.2, 326.9, 2.8, 0.01, 828.8, 326.8, 3.5, 0.01, 835.4, 326.6, 3.5, 0.02, 842, 324.5, 1, 0.01, 848.6, 326, 3.5, 0.01, 855.3, 326.8, 1.5, 0, 861.9, 325.5, 3, 0.01, 868.5, 326.7, 3, 0.01, 875.1, 326.5, 3.5, 0.02, 881.8, 324.9, 1.5, 0.01, 888.4, 324.7, 1, 0.01, 895, 326.4, 3.5, 0.01, 901.5, 326.6, 2.8, 0, 902.8, 325.8, 2.2, 0, 904.1, 326.4, 1.8, 0, 902.9, 333.1, 3.5, 0.01, 903.9, 339.8, 1.5, 0.01, 902.1, 346.6, 3.5, 0.02, 903.8, 353.3, 1.2, 0.01, 902.8, 360.1, 3.5, 0.01, 902.1, 366.8, 2.8, 0.02, 902, 373.5, 3.5, 0.03, 903.3, 380.3, 3.5, 0.04, 904, 387, 3.5, 0.03, 904.5, 393.8, 1.8, 0.04, 904.5, 400.5, 0.8, 0.04, 902, 407.2, 2.8, 0.02, 904.2, 414, 2.2, 0.07, 904.4, 420.7, 2.5, 0.08, 901.9, 427.4, 3.5, 0.06, 902.4, 434.2, 3.5, 0.07, 904.4, 440.9, 2, 0.07, 901.9, 447.6, 3, 0.04, 904.4, 454.4, 1, 0.04, 902.4, 461.1, 3.5, 0.04], [796.1, 440.6, 3.2, 0.16, 794.6, 447.5, 0.6, 0.14, 794.6, 454.3, 1.8, 0.15, 796.9, 461.1, 3.5, 0.14], [832.1, 391.4, 2.8, 0.18, 827.7, 395.9, 1.8, 0.28, 823.3, 400.4, 1.8, 0.49, 821, 404.5, 2.2, 0.65, 820.7, 407, 2.5, 0.71, 822.3, 411.8, 2.2, 0.66, 824.4, 414.5, 1.8, 0.44, 828.9, 417.8, 1.8, 0.37, 834.2, 420.5, 1.8, 0.38, 839.1, 423.8, 2.2, 0.46, 840.2, 425.4, 2.8, 0.53, 841, 428.9, 2.8, 0.47, 839.3, 433.3, 2.2, 0.55, 838.1, 435, 2, 0.54, 835, 437.6, 2, 0.43, 831.9, 440.2, 1.8, 0.37, 828.3, 444.4, 2.2, 0.24, 827.4, 448.9, 2.2, 0.44, 827.9, 450.8, 1.8, 0.62, 829.6, 454.1, 2, 0.44, 832.5, 456.3, 3.5, 0.13, 835.6, 458.3, 1.8, 0.22], [841.2, 461.7, 3.5, 0.36, 840.9, 460.6, 2.5, 0.44, 837.3, 454.9, 2, 0.62, 836, 451.6, 2, 0.59, 836.1, 449.6, 2, 0.6, 840.1, 444.1, 1.8, 0.52, 844.8, 440.4, 1.8, 0.36, 849.5, 436.6, 2.8, 0.12, 853, 430.6, 2, 0.61, 853.8, 427.6, 2, 0.71, 853.7, 421.8, 2, 0.34, 852.7, 418.6, 2, 0.41, 850.4, 415.9, 1.8, 0.42, 845.9, 412.5, 1.8, 0.41, 841.2, 410.2, 1.8, 0.23, 836.6, 407.9, 1.8, 0.31, 833.5, 404.9, 1.8, 0.38, 832.7, 402.6, 2.2, 0.62, 833.3, 398.5, 2, 0.49, 836.7, 393.3, 2, 0.69, 841.4, 388.5, 1.8, 0.45, 845.9, 385, 2.5, 0.38, 849.9, 380.4, 2, 0.3, 851.2, 377.6, 1.8, 0.29, 851.9, 374.9, 1.8, 0.23, 851.6, 372.9, 2, 0.25, 851.1, 370.8, 2, 0.13]], "52.12": [[794.6, 382.1, 0.8, 0.21, 794.5, 377.4, 0.6, 0.48, 794.7, 372.6, 0.8, 0.73, 794.6, 367.9, 1.2, 0.89, 794.7, 363.2, 1.2, 0.9, 794.5, 358.6, 0.8, 0.71, 794.6, 353.9, 0.6, 0.11, 794.6, 347.4, 1, 0.06, 796.6, 340.9, 3.5, 0.07, 794.6, 334.4, 2.2, 0.05, 796.6, 327.9, 3.5, 0.04, 796.5, 326.4, 3.5, 0.05, 795.9, 326.4, 3.5, 0.03, 802.3, 326.9, 2.8, 0.03, 808.9, 326.6, 3.5, 0.04, 815.5, 326.9, 3.5, 0.02, 822.1, 325.1, 2.2, 0.03, 828.8, 324.6, 3.5, 0.01, 835.4, 324.5, 3.5, 0.01, 842, 324.5, 3.5, 0.01, 848.6, 324.5, 0.8, 0.01, 855.3, 325.2, 3.5, 0.01, 861.9, 325.5, 3.5, 0.01, 868.5, 326.7, 2.2, 0.01, 875.1, 326.7, 3.5, 0.01, 881.8, 326.7, 3.5, 0.01, 888.4, 326.7, 1.8, 0.01, 895, 326.6, 2, 0.01, 901.5, 326.6, 3.2, 0.02, 902.5, 326.6, 3.2, 0.02, 902.9, 326.5, 3.5, 0.02, 903.6, 333.1, 2.8, 0.01, 902.1, 339.8, 3.5, 0.01, 902.6, 346.6, 3.5, 0.01, 903.4, 353.3, 3.5, 0.01, 903.6, 360.1, 3.5, 0.01, 903.4, 366.8, 2.2, 0.02, 904.4, 373.5, 0.6, 0.01, 902.1, 380.3, 3, 0.02, 904.1, 387, 3.5, 0.04, 904.4, 393.8, 1.8, 0.04, 904.4, 400.5, 3.5, 0.05, 903.1, 407.2, 2, 0.09, 902.4, 414, 3.5, 0.07, 902.1, 420.7, 3.5, 0.07, 903.4, 427.4, 2.5, 0.08, 904.4, 434.2, 3.5, 0.1, 904.4, 440.9, 2.8, 0.09, 903.6, 447.6, 3.5, 0.06, 904.4, 454.4, 1.5, 0.04, 902.6, 461.1, 3.5, 0.04], [794.6, 439.9, 2.5, 0.16, 794.7, 445.2, 0.6, 0.19, 794.8, 450.5, 1.2, 0.14, 795.8, 455.8, 2.5, 0.13, 794.6, 461.1, 2.5, 0.14], [832.2, 389.2, 2.8, 0.2, 829, 393, 2.2, 0.24, 825.4, 396.5, 2, 0.34, 822.4, 400.5, 2, 0.54, 820.6, 404.9, 2.2, 0.75, 820.5, 406.6, 2.5, 0.76, 822.2, 410.5, 2, 0.68, 823.8, 412.8, 1.8, 0.52, 828.4, 416.3, 1.8, 0.37, 834.1, 419.6, 1.8, 0.38, 839.6, 423.3, 2.5, 0.53, 840.9, 425.9, 2.8, 0.49, 840.1, 431.4, 2.5, 0.56], [836.1, 458.1, 2.2, 0.23, 832.4, 455.3, 2.2, 0.15, 828.9, 452.2, 2, 0.57, 827.9, 450.2, 2.2, 0.65, 827.5, 448.2, 2.2, 0.51, 828, 443.2, 2, 0.23, 829.4, 441.9, 1.8, 0.28, 832.9, 438.3, 2, 0.39, 836.9, 435.2, 2, 0.5, 840, 431.3, 2.5, 0.56], [840.6, 459.3, 2.2, 0.43, 838.1, 455.7, 1.8, 0.54, 836.1, 452, 2.2, 0.59, 836.2, 450.1, 2, 0.63, 836.5, 448.3, 2, 0.55, 840.4, 443.1, 1.8, 0.54, 845.5, 439.1, 2, 0.35, 850.6, 435, 2, 0.14, 852, 431.5, 2, 0.32, 853.9, 428.5, 2.2, 0.71, 854, 425.9, 2.2, 0.65, 853.8, 422, 2, 0.39, 853.1, 418.1, 2, 0.41, 851.7, 415.6, 2, 0.44, 846.9, 411.6, 1.8, 0.44, 841.1, 408.5, 1.8, 0.22, 835.4, 405.4, 1.8, 0.33, 832.9, 402.2, 2, 0.51, 832.3, 400.6, 2.2, 0.6, 833.6, 396, 1.8, 0.53, 836.8, 391.1, 1.8, 0.74, 840.6, 387.2, 1.8, 0.62, 844.1, 384.5, 1.8, 0.41, 847.6, 381.9, 1.8, 0.36, 850.8, 378.4, 2, 0.28, 852.2, 375.9, 1.8, 0.37, 852.4, 373.4, 2, 0.23, 852.1, 369.9, 1.5, 0.21, 851.6, 369.1, 1.8, 0.13]], "52.20": [[794.6, 380.6, 0.6, 0.25, 794.6, 374.6, 0.8, 0.65, 794.6, 368.6, 1.2, 0.93, 794.5, 361.8, 1.5, 0.98, 794.7, 355, 0.8, 0.72, 794.9, 348.2, 1.5, 0.08, 796.5, 341.4, 3.5, 0.08, 796.5, 334.6, 3.5, 0.05, 794.6, 327.9, 1.2, 0.04, 794.6, 325.8, 2.2, 0.03, 795.6, 324.7, 1.5, 0.03, 802.3, 326.9, 3.5, 0.03, 808.9, 326.9, 3.5, 0.03, 815.5, 326.9, 3.5, 0.02, 822.1, 324.6, 1.2, 0.04, 828.8, 324.6, 3.5, 0.04, 835.4, 326.6, 3.5, 0.02, 842, 326.3, 3.5, 0, 848.6, 326.8, 1.5, 0.01, 855.3, 326.8, 2.8, 0.01, 861.9, 326, 3.5, 0.01, 868.5, 325, 2.8, 0.03, 875.1, 326.7, 2.5, 0, 881.8, 326.7, 2.8, 0.02, 888.4, 324.9, 1, 0.01, 895, 326.6, 3.5, 0.01, 901.6, 324.9, 1.5, 0.01, 904, 324.5, 1.5, 0.01, 904.4, 326.4, 1, 0.01, 902.9, 333.1, 3.5, 0.01, 903.1, 339.8, 1.5, 0.01, 903.4, 346.6, 2.2, 0.01, 902.1, 353.3, 3, 0.02, 903.1, 360.1, 3.5, 0.01, 902.4, 366.8, 2, 0.01, 904.4, 373.5, 3.5, 0.02, 904.4, 380.3, 0.6, 0.01, 903.4, 387, 3.5, 0.05, 903.4, 393.8, 2.8, 0.03, 902.6, 400.5, 3, 0.06, 902.6, 407.2, 3.5, 0.07, 902.9, 414, 3.5, 0.06, 902.1, 420.7, 3.5, 0.07, 903.1, 427.4, 3.5, 0.11, 903.1, 434.2, 2.8, 0.07, 902.1, 440.9, 3, 0.07, 904.4, 447.6, 3.5, 0.05, 904.1, 454.4, 1.2, 0.03, 902.1, 461.1, 3.2, 0.04], [795.1, 438.1, 3.2, 0.16, 794.6, 443.9, 0.6, 0.24, 796.9, 449.6, 3.2, 0.13, 796.1, 455.4, 3.5, 0.13, 794.6, 461.1, 1.5, 0.14], [830, 390.1, 2, 0.32, 829.7, 391, 1.8, 0.3, 825.6, 394.8, 2, 0.32, 822, 399.1, 2.2, 0.52, 820.3, 404.9, 2.2, 0.77, 822.2, 409.5, 1.8, 0.67, 824.4, 412.3, 1.8, 0.45, 827.7, 415, 1.5, 0.39, 833.2, 417.4, 1.5, 0.41, 838.1, 420.9, 2.2, 0.49, 839.4, 422, 2.5, 0.54, 840, 422.9, 2.8, 0.51, 840.6, 428.7, 2.8, 0.5, 839.4, 431.2, 2.2, 0.53, 836, 434.4, 1.8, 0.44, 832.4, 437.5, 1.5, 0.42, 828.8, 441, 1.5, 0.31, 827.4, 442.7, 2.2, 0.19, 827, 447.4, 2.2, 0.57, 827.5, 449.5, 2.2, 0.64, 829.9, 453, 2, 0.42, 834.1, 455.7, 2.8, 0.23, 837.9, 459, 2.5, 0.36], [838.1, 459.8, 3.5, 0.3, 840.9, 460, 2.5, 0.37, 840.9, 458, 2, 0.43, 838.4, 454.5, 1.8, 0.61, 836.2, 450.9, 2.2, 0.65, 836.1, 448.9, 2, 0.61, 836, 447, 1.8, 0.59, 839.1, 442.9, 1.8, 0.5, 842.8, 439.7, 2, 0.39, 846.9, 436.9, 2, 0.29, 851.1, 433, 1.8, 0.13, 854, 427, 2.2, 0.72, 854.5, 420.3, 2.2, 0.46, 853.4, 415.8, 2, 0.41, 850.1, 412.4, 1.8, 0.5, 847.4, 410.2, 1.8, 0.46, 844, 408.7, 2, 0.28, 840.6, 407.1, 2, 0.23, 835.9, 404.1, 2, 0.35, 832.8, 401, 1.8, 0.49, 832, 399.4, 2, 0.67, 833, 394.8, 2, 0.52, 836.9, 389.2, 1.8, 0.81, 840.1, 385.7, 1.8, 0.6, 844.1, 382.9, 2, 0.44, 847.9, 379.9, 1.8, 0.42, 849.8, 378.1, 1.8, 0.38, 851.7, 375.7, 2, 0.32, 852, 373.6, 2, 0.23, 852.6, 370.1, 2, 0.22, 851.6, 367.3, 1.8, 0.12]], "52.28": [[794.6, 379.9, 0.6, 0.28, 794.6, 373.4, 1, 0.78, 794.5, 366.9, 1.5, 0.97, 794.7, 360.4, 1.8, 1, 794.7, 354.4, 1.2, 0.9, 796.6, 348.3, 2.5, 0.06, 795.9, 341.5, 3.5, 0.07, 795.6, 334.7, 2.5, 0.06, 794.6, 327.9, 3.5, 0.03, 794.6, 325.8, 1.2, 0.04, 795.6, 324.7, 2, 0.03, 802.3, 324.6, 1.2, 0.07, 808.9, 326.6, 3.5, 0.01, 815.5, 326.9, 3, 0.02, 822.1, 324.6, 3.5, 0.02, 828.8, 326.6, 3.2, 0.01, 835.4, 324.5, 3.5, 0.01, 842, 324.5, 1.2, 0.01, 848.6, 324.5, 0.6, 0.01, 855.3, 324.7, 3.5, 0, 861.9, 325.7, 2, 0.01, 868.5, 324.7, 1, 0.01, 875.1, 324.7, 1.5, 0.01, 881.8, 326.7, 3.2, 0.01, 888.4, 324.7, 1.2, 0.02, 895, 325.1, 3, 0.01, 901.6, 324.6, 3.5, 0.01, 904, 324.5, 1, 0.01, 904.4, 326.4, 0.8, 0.01, 902.1, 333.1, 3.2, 0.01, 902.1, 339.8, 3.5, 0.01, 903.9, 346.6, 2.8, 0.03, 903.9, 353.3, 3.5, 0.01, 902.6, 360.1, 3.5, 0.01, 902.1, 366.8, 2.2, 0.01, 903.1, 373.5, 3.5, 0.02, 902.1, 380.3, 3.5, 0.02, 904.1, 387, 3.5, 0.06, 904.4, 393.8, 0.8, 0.05, 904.4, 400.5, 3.2, 0.07, 904.4, 407.2, 1.5, 0.08, 904.4, 414, 0.6, 0.05, 903.1, 420.7, 3.5, 0.06, 903.1, 427.4, 3, 0.07, 902.6, 434.2, 3, 0.06, 904.4, 440.9, 3, 0.07, 904.1, 447.6, 3.5, 0.07, 903.1, 454.4, 3.5, 0.06, 902.1, 461.1, 3, 0.03], [794.9, 437.1, 3.2, 0.16, 794.6, 443.1, 0.6, 0.18, 796.9, 449.1, 3.5, 0.13, 796.1, 455.1, 3.5, 0.14, 794.6, 461.1, 3.5, 0.14], [832, 386.9, 3.2, 0.13, 829.8, 388.8, 2.2, 0.28, 825.7, 393.3, 2, 0.33, 823.2, 395.9, 2, 0.44, 821.2, 398.9, 2, 0.61, 820.7, 400, 2.2, 0.64, 820, 403.6, 2.2, 0.81, 821.9, 407.6, 2, 0.73, 822.9, 409.4, 2, 0.57, 827.4, 413, 1.8, 0.42, 833.6, 416.1, 2, 0.44, 839.2, 420.3, 2.2, 0.54, 840.2, 421.2, 2.8, 0.55, 840.6, 427.6, 2.5, 0.56, 840.1, 429, 2, 0.61, 838.6, 431.2, 1.8, 0.58, 833.7, 435.6, 1.8, 0.43, 828.7, 439.9, 1.8, 0.32, 827.1, 441.7, 2.8, 0.18, 826.9, 446.4, 2, 0.61, 827.1, 448.3, 2, 0.64, 829.5, 451.3, 2, 0.45, 834.6, 455.3, 2.5, 0.23, 836.2, 456.7, 1.8, 0.41], [832.1, 398.4, 2, 0.63, 833.2, 393.4, 2, 0.53, 836.9, 387.7, 2, 0.8, 840.6, 383.6, 1.8, 0.56, 844.8, 380.6, 2, 0.43, 848.9, 377.5, 2, 0.44, 851.3, 374.6, 1.5, 0.3, 852.6, 371.4, 1.8, 0.2, 852.7, 367.6, 2, 0.23, 851.9, 365.3, 1.8, 0.17], [832.2, 398.5, 2.5, 0.63, 836.5, 403.2, 1.5, 0.34, 841.1, 405.7, 2, 0.23, 847.3, 408.6, 1.8, 0.46, 850.6, 411, 1.8, 0.51, 853.5, 414.7, 2.2, 0.45, 854.5, 419.6, 2.2, 0.48, 854.5, 425.8, 2.5, 0.68, 852.7, 429.1, 2, 0.28, 850.9, 432.5, 2, 0.13, 847, 435.5, 2, 0.27, 843.8, 438.3, 2, 0.42, 840.4, 440.9, 1.8, 0.52, 837.5, 443.9, 2.2, 0.55, 836.2, 446.5, 2, 0.62, 836.2, 448.4, 1.8, 0.61, 836.2, 450.4, 2.5, 0.65, 840, 456.1, 1.8, 0.53, 840.8, 458.1, 2, 0.43, 840.8, 460.2, 3, 0.35, 838, 459.5, 3.2, 0.3]], "52.36": [[794.6, 378.6, 0.6, 0.3, 794.6, 372.4, 1, 0.81, 794.6, 370, 1.2, 0.95], [794.6, 436.1, 2.8, 0.18, 794.7, 442.4, 0.6, 0.13, 794.8, 448.6, 3.5, 0.13, 796.3, 454.9, 3.5, 0.14, 794.6, 461.1, 3.5, 0.14], [797, 352.1, 3.2, 0.19, 795, 352.8, 3.2, 0.92, 794.6, 350.5, 1, 0.81, 794.6, 346.1, 3.2, 0.1, 796.1, 340, 3, 0.06, 794.6, 334, 1, 0.09, 794.9, 327.9, 2, 0.06, 795.9, 326, 3.5, 0.05, 796.1, 326.8, 3.2, 0.05, 802.5, 326.6, 3.5, 0.04, 809.1, 326.8, 3.2, 0.03, 815.7, 326.8, 3, 0.02, 822.3, 326.8, 3.5, 0.02, 828.9, 326.8, 1.2, 0.01, 835.5, 326.7, 3.5, 0.02, 842.1, 324.7, 1, 0.02, 848.8, 326.7, 3.5, 0.01, 855.4, 325.5, 3.5, 0.01, 862, 326.4, 3.2, 0.01, 868.6, 325.2, 1.5, 0.01, 875.2, 324.7, 3.5, 0.05, 881.8, 326.7, 1.5, 0, 888.4, 326.1, 3.5, 0.01, 895, 325.4, 3.5, 0.01, 901.6, 324.9, 3.5, 0.01, 903, 326.3, 3.5, 0.01, 903.1, 326.4, 2.2, 0.01, 902.1, 333.1, 2.5, 0, 904.4, 339.8, 2, 0.01, 904.1, 346.6, 1.2, 0.01, 904.4, 353.3, 0.6, 0, 902.9, 360.1, 2.8, 0.01, 904.4, 366.8, 3, 0.01, 903.1, 373.5, 2, 0.02, 903.6, 380.3, 2.8, 0.07, 902.9, 387, 2, 0.05, 902.1, 393.8, 3.5, 0.07, 904.1, 400.5, 1.2, 0.06, 904.4, 407.2, 1.5, 0.09, 904.4, 414, 0.8, 0.05, 904.4, 420.7, 2.5, 0.06, 904.4, 427.4, 3.2, 0.08, 902.1, 434.2, 3.5, 0.08, 902.9, 440.9, 3.5, 0.07, 902.1, 447.6, 3.5, 0.05, 904.4, 454.4, 1.2, 0.05, 902.1, 461.1, 3.5, 0.04], [841, 458.2, 3.5, 0.39, 835.3, 455, 2, 0.37, 831.1, 452.4, 2.2, 0.28, 827.5, 448.9, 2, 0.65, 826.8, 447.5, 2, 0.64, 826.4, 445.4, 2.2, 0.57, 827.2, 440.9, 2.2, 0.26, 828.6, 438.4, 2, 0.35, 832.4, 434.8, 2, 0.45, 836.3, 431.4, 2, 0.51, 839.8, 427.8, 2, 0.56, 841.4, 422.6, 3, 0.49, 840.4, 420.3, 2.5, 0.54, 839.3, 418.9, 2.2, 0.53, 835.6, 415.8, 1.5, 0.48, 831.5, 413.7, 1.8, 0.45, 827.4, 411.5, 2, 0.39, 823.4, 408.5, 1.8, 0.5, 821.3, 406, 1.8, 0.7, 819.6, 402, 2.5, 0.78, 819.5, 400.9, 2.5, 0.78, 821, 396.4, 2, 0.54, 825.2, 391.4, 1.8, 0.32, 828.2, 388.4, 1.8, 0.24, 831.3, 385.6, 2.2, 0.1], [852.1, 362.5, 1.8, 0.12, 852.9, 365.6, 2, 0.24, 852.9, 369.7, 1.8, 0.2, 852.2, 371.8, 1.5, 0.31, 849.1, 375.3, 2, 0.43, 844.5, 378.9, 2, 0.42, 839.8, 382.3, 1.8, 0.66, 837.4, 384.8, 1.8, 0.75, 834.8, 388, 2, 0.6, 832.8, 391.6, 1.8, 0.53, 831.8, 396.3, 1.8, 0.7, 832.7, 397.5, 2, 0.46, 835.6, 400.9, 2, 0.37, 839.7, 403.1, 2, 0.22, 843.6, 405.2, 1.8, 0.3, 847.6, 407, 1.8, 0.52, 850.9, 409.5, 1.8, 0.48, 853.7, 412.9, 2.2, 0.41, 854.8, 418.1, 2.2, 0.46, 854.9, 424.1, 2.2, 0.66, 854, 426.5, 1.8, 0.51, 850.7, 432, 2, 0.13, 846.7, 434.9, 2, 0.37, 842.6, 437.8, 1.8, 0.45, 838.7, 440.9, 2, 0.53, 836.2, 444.9, 2, 0.6, 835.8, 446.6, 2, 0.62, 836, 448.6, 2, 0.69, 837.2, 451.1, 1.8, 0.61, 839.9, 454.9, 1.8, 0.5, 841.4, 457.7, 2, 0.39]], "52.44": [[794.6, 435.1, 2.5, 0.18, 794.7, 441.6, 3.5, 0.13, 796.2, 448.1, 2.2, 0.13, 796.1, 454.6, 2.2, 0.13, 794.6, 461.1, 3.5, 0.13], [794.6, 348.1, 1, 0.85, 794.5, 341.5, 2.2, 0.09, 794.7, 334.8, 1, 0.08, 796.4, 328.2, 3.5, 0.06, 796.6, 326.2, 3.2, 0.07, 796.3, 326.3, 3.5, 0.07, 802.7, 324.5, 3, 0.04, 809.3, 324.5, 3, 0.02, 815.9, 326.8, 3.5, 0.01, 822.5, 324.5, 2, 0.01, 829.1, 325.2, 1.2, 0.01, 835.7, 324.7, 1.2, 0.01, 842.3, 326.2, 2, 0.01, 848.9, 324.7, 0.6, 0.01, 855.5, 326.4, 3.5, 0.01, 862.1, 326.7, 2.5, 0.01, 868.7, 326.7, 2.5, 0.01, 875.2, 324.7, 2.5, 0.02, 881.8, 324.7, 3.5, 0.01, 888.4, 326.6, 1.8, 0.01, 895, 326.6, 3.5, 0.01, 901.6, 324.9, 2.8, 0.02, 902.6, 326.9, 3.5, 0.01, 902.1, 326.5, 3.5, 0.01, 902.9, 333.1, 3.2, 0.01, 904.4, 339.8, 3.5, 0.01, 903.4, 346.6, 3.2, 0.03, 902.4, 353.3, 2, 0.01, 903.6, 360.1, 3.5, 0.01, 904.1, 366.8, 1.5, 0.01, 902.1, 373.5, 3.5, 0.02, 902.1, 380.3, 3.5, 0.04, 904.4, 387, 3.2, 0.05, 902.6, 393.8, 3.5, 0.03, 902.9, 400.5, 2.5, 0.06, 903.1, 407.2, 2.8, 0.06, 904.4, 414, 3.5, 0.04, 903.1, 420.7, 3.5, 0.07, 904.4, 427.4, 3.5, 0.07, 904.4, 434.2, 0.8, 0.05, 902.1, 440.9, 3.5, 0.06, 902.9, 447.6, 3.5, 0.05, 902.1, 454.4, 3, 0.05, 903.1, 461.1, 3.5, 0.05], [840.9, 456.4, 3, 0.41, 837.9, 456.4, 2.5, 0.4, 832.9, 452.8, 2.2, 0.24, 827.9, 449.1, 2, 0.57, 826.7, 446.7, 2.5, 0.63, 826.1, 444.4, 2.2, 0.56, 826.7, 439.5, 2.5, 0.28, 828.3, 437.6, 2, 0.35, 831.6, 434.1, 2, 0.44, 835.4, 431.2, 1.8, 0.46, 839.1, 428.2, 2, 0.6, 840.4, 426.3, 2.2, 0.57, 841.1, 422.9, 3, 0.46, 839.9, 418.3, 2.5, 0.55, 839.3, 417.5, 2.5, 0.54, 835.4, 414.3, 1.8, 0.49, 831.5, 412.4, 2.2, 0.46, 827.6, 410.5, 2, 0.39, 824.1, 408, 2, 0.45, 820.4, 403.7, 2, 0.68, 819.5, 401.3, 2.2, 0.72, 819.6, 398.9, 2.2, 0.7, 821.1, 395.1, 2.2, 0.53, 823.8, 391.2, 2, 0.33, 827.4, 387.9, 2, 0.25, 830.9, 384.6, 3.5, 0.16], [841.1, 457.3, 2.5, 0.39, 840.4, 454.9, 2, 0.46, 838.2, 451.5, 1.8, 0.56, 836.2, 448, 2, 0.64, 835.9, 446.4, 2.2, 0.63, 835.9, 444.4, 2, 0.59, 838.5, 440, 2, 0.56, 844, 435.8, 1.8, 0.44, 849.6, 431.7, 2.2, 0.14, 852.6, 428.1, 1.8, 0.22, 854.9, 424.1, 2, 0.71, 855, 417.6, 2.2, 0.47, 853.7, 411.7, 2.2, 0.4, 851.3, 408.4, 1.8, 0.48, 847.9, 405.3, 1.8, 0.48, 843.4, 403.3, 1.8, 0.25, 839, 401.1, 2.2, 0.24, 834.6, 398.7, 2, 0.35, 832.4, 396, 1.8, 0.52, 831.8, 394.2, 1.8, 0.7, 833.1, 389.6, 1.8, 0.51, 835.2, 386.4, 1.8, 0.63, 837.5, 383.3, 1.5, 0.79, 839.7, 381.2, 2, 0.69, 844.3, 377.3, 2, 0.43, 849.1, 373.8, 2, 0.43, 851.5, 370.9, 1.8, 0.29, 853.2, 366.4, 1.8, 0.21, 853.1, 363.4, 2.2, 0.25, 852.9, 361.1, 2, 0.18]], "52.52": [[796.6, 339.6, 3.5, 0.1, 795.9, 333.8, 3.5, 0.07, 794.9, 327.9, 3.2, 0.09, 796.4, 326.1, 3.5, 0.05, 796.3, 326.7, 3.5, 0.06, 802.7, 324.7, 2.2, 0.04, 809.3, 326.2, 3.5, 0.01, 815.9, 326.7, 3.5, 0.02, 822.5, 326.7, 3, 0.02, 829.1, 325.7, 2.2, 0.03, 835.7, 325.2, 3.5, 0.02, 842.3, 324.7, 3, 0.02, 848.9, 326.4, 3.2, 0.01, 855.5, 324.7, 1, 0, 862.1, 326.7, 3.2, 0.01, 868.7, 325.2, 3.5, 0.01, 875.3, 326.7, 2.8, 0.01, 881.8, 326.6, 3, 0.02, 888.4, 326.6, 3, 0.02, 895, 324.6, 1.2, 0.01, 901.6, 324.6, 0.6, 0.01, 903.1, 326.1, 2.2, 0.01, 904.1, 326.4, 1, 0.01, 903.9, 333.1, 2.8, 0.01, 904.4, 339.8, 1.8, 0.01, 904.4, 346.6, 3.5, 0.02, 904.4, 353.3, 1, 0.01, 903.6, 360.1, 2.2, 0.01, 904.4, 366.8, 1, 0.02, 902.6, 373.5, 3.5, 0.02, 903.1, 380.3, 3.5, 0.01, 903.9, 387, 1.5, 0.07, 903.9, 393.8, 2.8, 0.05, 903.1, 400.5, 2.5, 0.07, 902.9, 407.2, 3, 0.09, 902.9, 414, 3.5, 0.08, 902.1, 420.7, 3.5, 0.08, 903.1, 427.4, 2.8, 0.09, 902.9, 434.2, 3.5, 0.09, 904.4, 440.9, 3.5, 0.09, 902.1, 447.6, 3.5, 0.06, 904.4, 454.4, 2.8, 0.04, 902.1, 461.1, 3.5, 0.05], [796.6, 461.1, 2.8, 0.12, 794.6, 454.8, 3.5, 0.17, 794.6, 448.5, 1.5, 0.16, 795.6, 442.2, 3.5, 0.16, 794.6, 437.3, 1.5, 0.95, 795.5, 436.3, 2.8, 0.89], [852.9, 360.1, 2, 0.13, 853.5, 362.6, 2.2, 0.19, 853, 365.6, 2, 0.15, 852.6, 367.7, 2, 0.19, 850.5, 370.3, 2, 0.23, 845.5, 374.5, 1.8, 0.38, 840.1, 378.2, 1.8, 0.58, 837.6, 380.9, 2, 0.72, 835.1, 383.6, 2.2, 0.67, 830.3, 383.2, 2.8, 0.19, 827.7, 384.6, 2.2, 0.24, 824.2, 388.7, 1.8, 0.32, 820.8, 392.8, 2.2, 0.54, 819.2, 398.2, 2.2, 0.71, 819.4, 399.3, 2.2, 0.73, 819.7, 400.5, 2, 0.75, 821.7, 403.9, 2, 0.6, 824.4, 406.5, 2.2, 0.46, 828.4, 409.1, 1.8, 0.39, 832.4, 410.6, 1.8, 0.41, 836.1, 412.6, 1.8, 0.51, 839.8, 415.6, 2.2, 0.52, 840.9, 417.2, 2.8, 0.53, 841.3, 421.4, 3.2, 0.45, 839.9, 425.2, 2, 0.54, 836, 429, 2, 0.43, 831.7, 432.4, 2.2, 0.44, 827.6, 436, 2, 0.35, 826.7, 438.5, 2.5, 0.34, 825.9, 443.3, 2.2, 0.63, 825.8, 444.7, 2.2, 0.69, 826.7, 445.8, 2, 0.68, 829.4, 449.3, 2, 0.38, 832.4, 451.4, 2.2, 0.23, 835.5, 453.3, 2, 0.3, 841.6, 457.3, 3.5, 0.31], [834.6, 384.2, 2, 0.64, 832, 390.6, 2.2, 0.55, 831.6, 392.1, 2.2, 0.63, 832.1, 393.7, 1.8, 0.46, 833.6, 395.9, 2, 0.3, 837.4, 398.7, 1.8, 0.27, 842.6, 401.2, 1.8, 0.23, 847.9, 403.7, 2, 0.48, 851.9, 406.9, 1.8, 0.46, 854.3, 410.2, 2.5, 0.38, 855.5, 414.7, 2.8, 0.39, 855.7, 419.4, 2.5, 0.65, 855.1, 422.3, 2.2, 0.66, 853.6, 425.9, 2, 0.29, 851.1, 429.1, 2, 0.13, 845.7, 433.2, 1.8, 0.42, 840.1, 437.2, 1.8, 0.55, 835.9, 442.3, 2, 0.59, 835.9, 444.6, 2, 0.64, 836.5, 447.4, 1.8, 0.66, 839, 451.1, 2.2, 0.54, 841.7, 454.8, 2, 0.36, 841.7, 457.2, 2.5, 0.32, 838.8, 457.4, 3.5, 0.28]], "52.56": [[796.4, 446.8, 3.2, 0.21, 795.7, 451.6, 2.5, 0.22, 794.5, 456.4, 0.6, 0.38, 794.6, 461.2, 0.8, 0.58, 794.6, 462.9, 1.5, 0.67], [794.6, 345.1, 1, 0.79, 794.5, 339.4, 0.6, 0.46, 795, 333.6, 2.2, 0.13, 796.1, 327.9, 3.5, 0.1, 796.6, 326.2, 3.5, 0.11, 796.1, 325, 3.5, 0.11, 802.7, 324.8, 3.5, 0.09, 809.3, 324.7, 3, 0.06, 815.9, 324.7, 3.5, 0.04, 822.5, 325.5, 2.2, 0.03, 829.1, 324.7, 1.2, 0.04, 835.7, 326.7, 3, 0.03, 842.3, 326.7, 2.5, 0.01, 848.9, 326.7, 1.5, 0.01, 855.5, 326.7, 3.5, 0.01, 862.1, 326.7, 3.5, 0.03, 868.7, 326.7, 3.5, 0, 875.3, 325.9, 1.2, 0, 881.8, 326.7, 3.5, 0.01, 888.4, 324.6, 1, 0.02, 895, 326.4, 3, 0.03, 901.5, 326.4, 3, 0.01, 903.1, 326.1, 3.5, 0.01, 903.1, 326.4, 2, 0.01, 902.1, 333.1, 2.8, 0, 902.6, 339.8, 3.5, 0.01, 903.1, 346.6, 3.5, 0.04, 903.6, 353.3, 2.2, 0.03, 902.1, 360.1, 3.5, 0.01, 902.8, 366.8, 1.8, 0.02, 902, 373.5, 2.5, 0.01, 904.3, 380.3, 1, 0.01, 903.3, 387, 3.5, 0.07, 904.2, 393.8, 3.5, 0.06, 904.5, 400.5, 2.5, 0.05, 903.7, 407.2, 3.2, 0.11, 904.5, 414, 2.2, 0.09, 904.4, 420.7, 3.5, 0.06, 904.4, 427.4, 3.5, 0.09, 904.4, 434.2, 1.5, 0.08, 901.9, 440.9, 3.5, 0.06, 902.9, 447.6, 3.2, 0.04, 902.9, 454.4, 3.5, 0.04, 904.4, 461.1, 2.2, 0.05], [821.6, 390.6, 1.8, 0.44, 825.4, 386.5, 1.8, 0.3, 829.3, 382.5, 2.8, 0.28, 834.4, 383.4, 3.5, 0.59], [823.1, 404.1, 2.5, 0.41, 826.1, 406.5, 2, 0.41, 830, 408.9, 1.5, 0.44, 834.6, 410.4, 1.8, 0.51, 839.1, 413.6, 2.2, 0.53, 840.2, 414.5, 2.2, 0.57, 841.1, 416.1, 2.5, 0.54, 841.4, 418.7, 3.2, 0.45, 840.3, 424, 1.8, 0.57, 836.1, 427.6, 1.8, 0.46, 831.9, 431.3, 2, 0.47, 827.8, 435.1, 2, 0.36, 826.7, 437.1, 2.5, 0.32, 825.3, 441.6, 2.5, 0.59, 826.1, 444.2, 2, 0.69, 826.9, 445.3, 2.2, 0.67, 831.4, 449.7, 2, 0.25, 836.7, 453.1, 1.8, 0.35, 841.9, 457.1, 3.5, 0.31], [853.1, 359.1, 2.2, 0.11, 853.5, 364.4, 2.2, 0.12, 852.1, 367.6, 1.8, 0.12, 848, 371.3, 2.2, 0.33, 843.9, 374.1, 1.8, 0.39, 839.9, 377.1, 1.5, 0.6, 837.4, 379.6, 1.8, 0.78, 835.4, 382.5, 2.2, 0.74, 832.3, 387.5, 2, 0.48, 831.8, 391.4, 2, 0.59, 832.2, 393, 2.2, 0.43, 836.1, 396.9, 1.8, 0.34, 841.6, 399.5, 2, 0.2, 847.1, 402.1, 1.8, 0.43, 851.6, 405.2, 1.8, 0.51, 854.4, 408.7, 2, 0.45, 855.8, 414.4, 2.2, 0.43, 855.6, 420.6, 2, 0.69, 852.5, 425.7, 2, 0.16, 850.4, 428.4, 2, 0.15, 845.1, 432.5, 2, 0.48, 839.7, 436.3, 2, 0.56, 836.2, 441, 2, 0.62, 836, 443.8, 2.2, 0.68, 836.9, 447.2, 2, 0.68, 840.8, 452.1, 2, 0.49, 841.8, 454.1, 2, 0.37, 841.9, 456.6, 3.5, 0.32, 841.3, 458.6, 2.2, 0.29]], "52.60": [[794.6, 340.6, 0.6, 0.43, 795.7, 334, 2.5, 0.11, 795.9, 327.4, 2, 0.11, 795.6, 325.3, 1.8, 0.1, 795.6, 324.8, 1.8, 0.09], [808.6, 324.6, 3.5, 0.05, 815.3, 324.9, 1.8, 0.06, 821.9, 326.6, 3.5, 0.04, 828.6, 326.4, 3.5, 0.04, 835.2, 324.6, 1.2, 0.04, 841.8, 326.6, 2.8, 0.03, 848.5, 326.6, 3.5, 0.03, 855.1, 326.6, 2.2, 0.02, 861.8, 325.9, 2.5, 0.01, 868.4, 324.6, 2, 0.03, 875.1, 326.6, 2.5, 0.01, 881.7, 324.6, 0.6, 0, 888.3, 324.6, 3.2, 0.01, 895, 324.9, 3.5, 0.04, 901.4, 326.6, 2.5, 0.01, 901.9, 326, 3, 0.01, 902.1, 332.3, 3, 0, 901.9, 339.1, 3.5, 0.02, 903.9, 345.8, 3, 0.03, 903.9, 352.6, 2, 0.02, 901.9, 359.4, 3.5, 0.02, 902.9, 366.2, 3.5, 0.02, 901.9, 373, 2.8, 0.03, 904.5, 379.8, 1, 0.02, 904.2, 386.6, 3.5, 0.05, 904.5, 393.4, 0.6, 0.04, 903, 400.2, 3.5, 0.05, 904.3, 407, 2, 0.07, 902.8, 413.8, 2, 0.11, 904.3, 420.6, 3.5, 0.07, 903.1, 427.4, 3.5, 0.09, 902.1, 434.2, 3.5, 0.08, 902.1, 441, 3.5, 0.08, 902.3, 447.8, 3.5, 0.06, 902.9, 454.6, 3.5, 0.05, 902.1, 461.4, 3.5, 0.03], [826.7, 444.5, 2, 0.65, 830.9, 448.9, 2.8, 0.33, 836, 452, 2.8, 0.29, 839.1, 455.7, 2.2, 0.33], [831, 431.9, 2.8, 0.25, 831.8, 430.3, 1.8, 0.37, 835.9, 426.8, 2.2, 0.42, 839.7, 423.6, 2, 0.56, 840.8, 421.9, 2.2, 0.47, 841.6, 418.9, 3.5, 0.43], [839.5, 461.4, 2.2, 0.25, 841.9, 457.5, 2.2, 0.29, 842.2, 454.6, 2.2, 0.35, 841.2, 451.9, 1.8, 0.45, 837.3, 447.1, 2, 0.65, 835.8, 443.4, 2, 0.71, 836.3, 439.7, 2.2, 0.63, 839.7, 435.7, 2, 0.61, 843.4, 433.1, 2, 0.54, 847.4, 430, 2.2, 0.29, 851.3, 426.9, 2.8, 0.15, 853.8, 424.2, 2.2, 0.26, 855, 420.7, 2.2, 0.67, 856.1, 418.2, 2.5, 0.63, 856.2, 413.8, 2.2, 0.48, 854.3, 407.7, 2.2, 0.47, 852.1, 404.9, 2.2, 0.52, 849.4, 402.6, 2, 0.5, 846.2, 400.9, 1.5, 0.33, 842.8, 399.9, 1.2, 0.2], [837.8, 411.5, 2.5, 0.51, 840.1, 413, 2.2, 0.58, 841.6, 418.7, 3, 0.44], [839.9, 376.4, 2, 0.61, 844.6, 372.6, 2, 0.41, 847.8, 370.3, 2.5, 0.33, 852.3, 367, 2.2, 0.12, 853.8, 364.4, 2.5, 0.11, 853.4, 361.6, 2.5, 0.1]], "52.64": [[794.6, 394.9, 1.5, 0.18, 796.6, 388.2, 3.5, 0.06, 796.8, 381.5, 3.5, 0.05, 795, 374.8, 3.5, 0.06, 794.5, 368.1, 2, 0.01, 794.5, 361.4, 3.2, 0.02, 794.7, 354.7, 1.2, 0.03, 796.7, 348, 3.5, 0.02, 796.7, 341.3, 2.8, 0.01, 794.6, 334.6, 1.2, 0.01, 794.6, 327.9, 3.5, 0.01, 794.6, 325.8, 0.6, 0, 796.4, 326.8, 2.8, 0.01, 797.5, 326.6, 2.5, 0, 804.3, 326.6, 2.5, 0, 811.3, 326.6, 2.5, 0.01, 818.2, 324.6, 1.8, 0, 825.2, 324.6, 3.2, 0.02, 832.1, 324.6, 1.8, 0, 839.1, 326.6, 3, 0, 846, 326.6, 3.5, 0, 853, 325.6, 1.8, 0, 859.9, 326.1, 3.5, 0.01, 866.9, 325.1, 3.5, 0.01, 873.8, 326.6, 3.5, 0.02, 880.8, 326.4, 3, 0.01, 887.7, 324.6, 3.5, 0.02, 894.7, 326.6, 2.5, 0.01, 901.5, 326.6, 3, 0.01, 903.1, 325.4, 3.5, 0.01, 903.1, 326.5, 3.5, 0.01, 904.1, 333.1, 1, 0.01, 902.1, 339.8, 3.5, 0.01, 903.4, 346.6, 2.5, 0.02, 902.1, 353.3, 3, 0.01, 902.9, 360.1, 3, 0.01, 904.1, 366.8, 1.2, 0.03, 902.9, 373.5, 2.8, 0.02, 902.9, 380.3, 3.5, 0.03, 903.9, 387, 2.8, 0.06, 902.9, 393.8, 3.5, 0.06, 902.1, 400.5, 3.5, 0.1, 902.1, 407.2, 3.5, 0.1, 904.4, 414, 3, 0.09, 902.1, 420.7, 3.5, 0.12, 902.1, 427.4, 3.5, 0.11, 903.4, 434.2, 2.2, 0.13, 902.4, 440.9, 3.2, 0.12, 904.4, 447.6, 1.5, 0.08, 904.4, 454.4, 3.5, 0.09, 902.6, 461.1, 3.5, 0.05], [818.9, 398.4, 2.5, 0.95, 818.6, 393.9, 2.2, 0.47, 819.3, 391.9, 2.2, 0.41, 821.5, 389.3, 1.8, 0.32, 823.6, 386.3, 2, 0.19, 826.5, 384.1, 3.5, 0.21, 828.1, 382.3, 2.5, 0.26], [818.8, 398.5, 2.2, 0.95, 820.1, 400.1, 2, 0.85, 822.9, 402.7, 2, 0.5, 825.9, 405, 2.5, 0.27, 830.6, 407.2, 2.2, 0.24, 834.2, 408.4, 1.8, 0.33, 837.6, 409.9, 1.8, 0.7, 841.4, 413.3, 2.8, 0.58, 842.5, 417.4, 3.2, 0.45, 841.5, 421.2, 2, 0.51, 839.5, 423.7, 2.2, 0.52, 836, 426.2, 2, 0.43, 832.9, 428.9, 2, 0.42, 831.4, 430.9, 3.5, 0.3], [845.4, 430.3, 2.5, 0.36, 847.4, 429.1, 2.2, 0.22, 851.2, 426.7, 3, 0.21, 854.3, 423.2, 1.5, 0.34, 855.8, 418.9, 2.5, 0.63, 856.1, 417.6, 2.5, 0.66, 856.4, 413.9, 2.2, 0.54, 855, 408, 2.2, 0.4, 852.5, 404.4, 2, 0.49, 848.6, 401.2, 1.8, 0.45, 844.2, 399.1, 2, 0.24, 839.9, 396.9, 3.5, 0.11, 835.6, 394.8, 3.5, 0.12, 831.5, 390.9, 1.5, 0.26, 830.8, 389.3, 1.8, 0.57, 832.7, 383.3, 2, 0.44, 836.4, 378.1, 1.8, 0.77, 841.7, 373.7, 2, 0.42, 847.2, 369.7, 2.2, 0.33]], "52.68": [[796.6, 401.4, 3.5, 0.1, 794.6, 394.7, 3, 0.06, 794.6, 388, 0.8, 0.03, 796.6, 381.3, 2.8, 0.02, 794.6, 374.6, 1, 0.03, 796.6, 368, 3.5, 0.03, 796.6, 361.3, 3, 0.01, 796.6, 354.6, 3.5, 0.01, 796.6, 347.9, 3.5, 0.02, 795.6, 341.2, 3, 0.03, 794.9, 334.6, 1.2, 0.01, 794.6, 327.9, 1, 0.01, 794.6, 325.8, 0.6, 0, 796.4, 326.8, 3.5, 0, 797.4, 325.6, 3.5, 0, 804, 324.9, 2.5, 0.01, 810.6, 326.4, 3.2, 0.01, 817.2, 326.7, 1.2, 0, 823.8, 324.9, 1.8, 0, 830.4, 324.7, 1.8, 0.02, 837, 326.2, 2.2, 0.01, 843.6, 325.2, 1.8, 0.01, 850.2, 325.2, 2.8, 0.02, 856.9, 324.5, 0.6, 0, 863.5, 324.8, 3.2, 0.02, 870.1, 324.5, 3, 0.01, 876.7, 326.8, 2, 0.01, 883.3, 324.6, 3.5, 0.01, 889.9, 326.8, 2.8, 0.01, 896.5, 326.9, 3.5, 0.02, 902.7, 326.8, 3.5, 0.01, 902.1, 326.6, 2.8, 0.02, 902.9, 333.2, 3.5, 0, 904.4, 339.9, 1.5, 0.01, 902.9, 346.7, 3.5, 0.01, 902.9, 353.5, 2.2, 0.01, 902.1, 360.3, 3.5, 0.03, 904.1, 367, 1, 0.01, 902.1, 373.8, 2.8, 0.01, 903.4, 380.6, 2.5, 0.02, 902.1, 387.4, 3.5, 0.05, 904.4, 394.1, 1.2, 0.06, 902.1, 400.9, 3, 0.05, 904.4, 407.7, 1.8, 0.05, 903.4, 414.5, 2.2, 0.1, 903.6, 421.2, 3.5, 0.09, 902.1, 428, 2.8, 0.06, 903.6, 434.8, 3.5, 0.09, 902.1, 441.6, 3.5, 0.09, 904.4, 448.3, 1.5, 0.08, 904.4, 455.1, 0.8, 0.11], [825.4, 435.9, 2.8, 0.41, 828.3, 431.8, 2, 0.46, 832, 428.3, 2.2, 0.42, 835.9, 425.6, 2.2, 0.37, 839.6, 422.6, 2, 0.42, 842.8, 418, 3, 0.41], [827.9, 381.4, 2.2, 0.2, 824, 385.4, 1.8, 0.14, 820, 389.4, 2, 0.41, 818.1, 394.8, 2.5, 0.66, 818, 396.3, 2, 1, 819.5, 398, 2, 0.94, 822.9, 401.9, 1.8, 0.5, 827.5, 404.4, 2, 0.25, 832.4, 406.5, 2, 0.37, 835.8, 407.8, 1.8, 0.58, 841, 411.4, 2.2, 0.55, 842.1, 413.2, 2.2, 0.5, 842.9, 417.6, 3, 0.41], [848.2, 367.9, 2.2, 0.11, 844.9, 370.2, 2, 0.29, 841.6, 372.6, 2.2, 0.43, 838.7, 375.1, 2, 0.62, 835.9, 377.8, 2.2, 0.76, 832.2, 383.2, 1.8, 0.34, 830.6, 388.5, 2, 0.52, 835, 393.4, 3, 0.14, 839.9, 396.2, 1.8, 0.09, 845.6, 398.6, 2, 0.23, 849.5, 400.5, 1.8, 0.32, 852.5, 403.1, 2, 0.46, 854.8, 406.2, 2.8, 0.43, 855.5, 406.9, 2.8, 0.42, 856.3, 412, 2.2, 0.41, 856.3, 417.1, 2.5, 0.74, 855.6, 419.5, 2.2, 0.68, 853.4, 423, 2.2, 0.32, 851, 426.5, 2.2, 0.21, 848.1, 428.3, 2.2, 0.27, 844.7, 430.9, 1.8, 0.53, 841.1, 433.2, 2.5, 0.77, 838.6, 435.6, 2, 0.75]], "52.72": [[796.4, 446.4, 3.5, 0.13, 794.9, 439.4, 3.5, 0.11, 796.6, 432.4, 3.5, 0.06, 795.1, 425.5, 3.5, 0.07, 794.6, 418.5, 3.5, 0.05, 796.6, 411.5, 3.5, 0.04, 795.6, 404.6, 3.5, 0.06, 794.9, 397.6, 1.2, 0.01, 794.6, 390.6, 1, 0.02, 796.1, 383.6, 3.2, 0.03, 796.6, 376.7, 3.5, 0.01, 794.6, 369.7, 2, 0.01, 796.6, 362.7, 3.5, 0.01, 796.6, 355.8, 3.2, 0.02, 796.6, 348.8, 2.2, 0.03, 796.6, 341.8, 2.8, 0.01, 796.6, 334.8, 2.5, 0, 796.6, 328, 3.5, 0, 796.7, 326.6, 3.5, 0, 797.4, 324.6, 1.5, 0, 804, 324.6, 3.5, 0, 810.5, 326.1, 3.5, 0, 817.1, 326.1, 3.5, 0, 823.7, 324.7, 2.8, 0.03, 830.3, 325.7, 1.8, 0, 836.8, 326.7, 3, 0, 843.4, 326.7, 3.5, 0, 850, 326.7, 3, 0.01, 856.6, 326.4, 2.5, 0, 863.2, 326.7, 3, 0.02, 869.7, 326.2, 3.5, 0, 876.3, 326.7, 2.8, 0.01, 882.9, 326.5, 3.2, 0.01, 889.5, 325.5, 3.5, 0, 896, 326.7, 3.5, 0.02, 902.6, 324.7, 1.2, 0.01, 904.4, 324.6, 1, 0.01, 902.1, 326.5, 2.5, 0, 903.9, 333.1, 3.5, 0, 903.4, 339.8, 2, 0.01, 903.1, 346.6, 1.8, 0, 902.1, 353.3, 3.5, 0.01, 902.1, 360.1, 3.5, 0.01, 904.4, 366.8, 1.8, 0.02, 903.6, 373.5, 3.5, 0.01, 902.1, 380.3, 3.5, 0.02, 902.9, 387, 3.5, 0.04, 904.4, 393.8, 0.8, 0.03, 903.6, 400.5, 3.5, 0.04, 904.4, 407.2, 0.6, 0.05, 904.4, 414, 1.5, 0.06, 904.4, 420.7, 2.2, 0.08, 902.1, 427.4, 3.5, 0.06, 902.1, 434.2, 3.5, 0.06, 902.9, 440.9, 3.5, 0.08, 902.1, 447.6, 3.5, 0.06, 902.1, 454.4, 2, 0.03, 904.4, 461.1, 1.2, 0.04], [827.4, 380.9, 2, 0.21, 822.6, 385.1, 1.8, 0.2, 819.2, 389.1, 2, 0.41, 817.3, 393.6, 2.2, 0.66, 818.2, 395.7, 1.8, 1, 819.2, 397.2, 2, 0.95, 821.9, 400.1, 2, 0.59, 825.7, 402.3, 1.8, 0.3, 829.2, 403.8, 2, 0.19, 832.5, 405.7, 2, 0.35, 836.5, 406.9, 1.8, 0.59, 840.6, 409.4, 1.8, 0.68, 843, 412.4, 2.5, 0.48, 843.1, 416.6, 3, 0.42], [847, 367.9, 1.2, 0.25, 843.9, 369.9, 2.2, 0.3, 840.9, 372.1, 2.2, 0.42, 836.7, 375.6, 2.2, 0.69, 834.2, 378.8, 2, 0.69, 832, 382.2, 2, 0.37, 830.6, 386.9, 2, 0.51, 830.9, 388.5, 2.2, 0.31, 835, 392.4, 3.2, 0.14, 839.9, 395.2, 1.8, 0.09, 845.9, 397.7, 2, 0.22, 851.3, 401.4, 1.8, 0.31, 853.4, 402.6, 1.8, 0.45, 855.6, 406.2, 2.2, 0.4, 856.9, 410.8, 2.2, 0.38, 856.7, 415.6, 2.5, 0.7, 855.5, 418.5, 2, 0.7, 853.7, 422.2, 2, 0.31, 851.2, 425.5, 2.2, 0.14, 845.7, 428.9, 1.8, 0.38, 840.5, 432.7, 2, 0.71, 836.4, 437.1, 2.2, 0.74, 835.1, 439.4, 2, 0.7, 835.5, 441.8, 2, 0.73, 836.6, 445, 2, 0.61, 839.6, 448.1, 1.8, 0.48, 842.3, 451.5, 2, 0.46, 843.9, 455.2, 2, 0.24], [843.1, 417, 2.8, 0.42, 839.4, 421.4, 1.8, 0.36, 835.5, 425.1, 2, 0.34, 831.1, 428.3, 1.8, 0.49, 827.1, 432, 1.8, 0.43, 824.6, 435.8, 2.2, 0.44, 824.1, 439.4, 2, 0.74, 824.6, 441, 2, 0.63, 825.5, 441.8, 2.2, 0.61, 830, 446.8, 2, 0.44, 833.8, 449.1, 2.5, 0.27, 837.6, 452.3, 3, 0.19, 838.8, 457.5, 3.2, 0.27]], "52.76": [[796.6, 415.9, 3.5, 0.08, 796.6, 409.1, 3.2, 0.06, 796.6, 402.3, 3.5, 0.03, 796.1, 395.6, 3.5, 0.06, 796.4, 388.8, 3.5, 0.03, 796.1, 382, 3.2, 0.01, 794.6, 375.3, 0.6, 0.01, 796.1, 368.5, 3.5, 0.01, 794.6, 361.7, 1, 0.02, 794.9, 355, 3.5, 0.01, 796.6, 348.2, 3, 0, 794.6, 341.4, 3.5, 0, 794.6, 334.6, 1.5, 0.01, 795.1, 327.9, 3.5, 0.01, 794.7, 324.6, 2, 0.02, 797.6, 324.9, 1.5, 0.02, 804.2, 326.4, 3.2, 0.02, 810.8, 324.7, 3.5, 0.01, 817.4, 325.4, 1.8, 0.01, 824, 324.7, 3.5, 0.01, 830.6, 324.7, 1.2, 0.01, 837.2, 325.7, 3.5, 0.01, 843.8, 325.5, 3.5, 0, 850.4, 325.7, 2.5, 0.02, 857, 326.5, 3, 0.01, 863.6, 326.8, 2.8, 0.01, 870.2, 324.8, 3.5, 0.01, 876.7, 326.8, 2.8, 0.01, 883.3, 326.8, 3.5, 0, 889.9, 325.8, 1.2, 0.01, 896.5, 326.4, 3.5, 0.01, 902.7, 326.8, 3.5, 0.01, 902.6, 326.6, 2, 0.01, 904.4, 333.1, 2.8, 0.01, 903.4, 339.8, 2, 0.01, 903.1, 346.6, 1.8, 0, 902.1, 353.3, 3.5, 0.02, 902.1, 360.1, 3.2, 0.02, 903.1, 366.8, 1.8, 0.01, 903.4, 373.5, 2.2, 0.02, 904.4, 380.3, 1.8, 0.02, 902.9, 387, 3.5, 0.03, 904.4, 393.8, 1.2, 0.07, 902.9, 400.5, 3.5, 0.04, 904.4, 407.2, 3.5, 0.06, 904.4, 414, 0.6, 0.05, 902.1, 420.7, 2.8, 0.04, 902.1, 427.4, 3.2, 0.04, 903.1, 434.2, 2.5, 0.05, 902.1, 440.9, 3.5, 0.06, 904.4, 447.6, 2.2, 0.05, 903.4, 454.4, 3.5, 0.05, 902.1, 461.1, 2.8, 0.03], [794.6, 446.4, 1.5, 0.16, 796.6, 451.3, 3.5, 0.14, 796.6, 456.2, 3.5, 0.16, 794.6, 461.1, 1.5, 0.1, 794.8, 462, 1, 0.11], [827.1, 379.9, 3, 0.15, 823.2, 384.1, 2, 0.16, 819.3, 388.4, 2, 0.42, 817.7, 393.3, 2.5, 0.74, 817.6, 394.3, 2, 1, 818.6, 396.2, 2, 0.96, 821.6, 399.3, 1.8, 0.53, 825.5, 401.5, 1.8, 0.3, 831.6, 404.3, 2.2, 0.33, 836, 405.7, 2, 0.54, 839.7, 407.8, 1.8, 0.7, 842.4, 410.4, 2.2, 0.5, 843.1, 412.1, 2.8, 0.44, 843, 416.1, 2.8, 0.4, 840, 420.4, 2, 0.42, 836.4, 423.9, 1.8, 0.31, 832.2, 426.7, 1.8, 0.44, 828.4, 430.1, 2, 0.42, 825.3, 433.7, 2, 0.44, 824.2, 436.6, 1.8, 0.64, 824.1, 439.4, 2, 0.75, 824.8, 441.2, 2, 0.6, 828.9, 445.5, 2.8, 0.4, 832.5, 448.1, 2.8, 0.37], [846.6, 367.6, 1.8, 0.21, 841.1, 370.8, 2, 0.42, 836.3, 374.9, 2.2, 0.69, 834.1, 378, 2, 0.66, 831.8, 381.2, 1.8, 0.36, 830.4, 386.4, 2.2, 0.49, 830.9, 387.9, 2.2, 0.3, 834.9, 391.6, 3.2, 0.15, 840.7, 394.8, 2, 0.09, 846.8, 397.4, 2, 0.22, 852.5, 400.9, 1.8, 0.44, 855.7, 404.7, 2.2, 0.41, 856.8, 410.4, 2.2, 0.39, 856.7, 415.3, 2.5, 0.73, 853.5, 421.4, 2.2, 0.3, 850.1, 425, 2.5, 0.17, 844.4, 428.8, 1.8, 0.59, 841.4, 431.3, 2, 0.7, 838.4, 433.9, 2, 0.68, 836.1, 436.6, 2, 0.77, 835.1, 438.9, 2, 0.73, 835.2, 440.3, 2, 0.74, 836.2, 443.3, 1.8, 0.66, 838.9, 447.4, 2.5, 0.52, 842.3, 450.9, 2, 0.47, 843.4, 452.9, 2, 0.33, 843.6, 456.7, 1.8, 0.22, 842.1, 460.1, 2, 0.2, 841.7, 461.2, 2.5, 0.19]], "52.80": [[794.6, 459.1, 1, 0.55, 795.6, 452.2, 2.2, 0.07, 796.1, 445.3, 3.5, 0.04, 794.6, 438.4, 1, 0.04, 794.6, 431.5, 3.5, 0.03, 795.8, 424.6, 2.8, 0.05, 796, 417.7, 3.5, 0.02, 794.5, 410.8, 2.5, 0.04, 794.8, 403.9, 1.2, 0.01, 794.5, 397, 1.5, 0.05, 794.7, 390, 1.5, 0.02, 796.7, 383.1, 3.5, 0.04, 795.5, 376.2, 1.8, 0, 794.7, 369.3, 0.8, 0.02, 796.7, 362.4, 3.5, 0.02, 794.7, 355.5, 3.5, 0.02, 796.7, 348.6, 3.5, 0.02, 796.7, 341.7, 3.5, 0.01, 794.6, 334.8, 1.2, 0.02, 794.6, 327.9, 0.6, 0.01, 795.9, 325.9, 3, 0.01, 797.5, 326.1, 2.2, 0.01, 804.3, 326.6, 2.2, 0.01, 811.3, 326.6, 2.5, 0.01, 818.2, 324.6, 3, 0, 825.2, 326.6, 3.5, 0.02, 832.1, 326.6, 2.5, 0, 839.1, 325.4, 3.5, 0.01, 846, 326.6, 2, 0.01, 853, 326.6, 3, 0.01, 859.9, 326.1, 2.8, 0.01, 866.9, 326.4, 3, 0.01, 873.8, 324.6, 1.8, 0.01, 880.8, 326.6, 3.5, 0, 887.7, 325.1, 3.5, 0, 894.7, 324.6, 1, 0.01, 901.6, 324.6, 0.8, 0.01, 903.2, 325.2, 1.5, 0, 904.1, 326.4, 1.5, 0, 902.1, 333.1, 3.5, 0, 903.4, 339.9, 2, 0.01, 904.4, 346.6, 0.6, 0, 902.1, 353.4, 3, 0.01, 902.1, 360.1, 3, 0.01, 903.4, 366.9, 2, 0.01, 903.9, 373.6, 3, 0.02, 903.9, 380.4, 1.2, 0.01, 903.1, 387.1, 3.5, 0.02, 903.1, 393.9, 3.5, 0.04, 904.4, 400.6, 2.8, 0.06, 902.1, 407.4, 3.5, 0.04, 904.4, 414.1, 3.5, 0.1, 902.1, 420.9, 3.5, 0.04, 902.4, 427.6, 2.8, 0.07, 904.4, 434.4, 0.8, 0.05, 904.4, 441.1, 3.5, 0.06, 904.4, 447.9, 2.5, 0.04, 903.9, 454.6, 1.5, 0.05, 904.1, 461.4, 3.5, 0.02], [843.9, 414.4, 3, 0.38, 843, 409.5, 2.2, 0.49, 840.2, 406.6, 1.8, 0.74, 837, 404.7, 1.8, 0.6, 831.3, 402.8, 2.2, 0.28, 825.6, 400.6, 2, 0.27, 822.2, 398.7, 1.8, 0.48, 819.3, 396.2, 2, 0.85, 818.5, 394.6, 2, 1, 817.3, 392.4, 2.2, 0.74, 819.2, 387.8, 2, 0.42, 823.2, 383.3, 2.2, 0.12, 827.4, 378.9, 2, 0.21], [846.1, 366.6, 2.2, 0.29, 842.9, 368.7, 2, 0.29, 839.8, 370.9, 2, 0.45, 836.6, 373.5, 2, 0.68, 834, 376.6, 2, 0.7, 831.8, 380.5, 1.8, 0.34, 830.1, 385.6, 2, 0.58, 831.4, 387.7, 1.8, 0.14, 835, 390.3, 2.8, 0.14, 840.8, 393.2, 2, 0.12, 846.6, 395.9, 1.8, 0.23, 847.4, 396.6, 1.5, 0.14], [832.9, 448, 2.8, 0.27, 832.7, 447.3, 2.8, 0.32, 829.1, 445, 2.8, 0.35, 825, 440.5, 2.2, 0.59, 824.4, 438.6, 2.2, 0.75, 824.2, 435.9, 2, 0.65, 825.3, 432.7, 2.2, 0.42, 828.1, 429.4, 2, 0.44, 832, 425.8, 2, 0.45, 836.5, 422.8, 2, 0.33, 840.2, 419.1, 1.8, 0.36, 843.8, 414.8, 3, 0.39], [851.8, 399.9, 1.2, 0.26, 853.6, 400.6, 1.8, 0.4, 856.1, 404.5, 2.2, 0.37, 857.1, 408.6, 2, 0.34, 857.2, 412.9, 2.5, 0.61, 856.3, 415.7, 2.2, 0.73, 854.7, 419.7, 1.8, 0.34, 852, 423.1, 2.2, 0.14, 847.9, 425.6, 2.2, 0.24, 844.1, 428.4, 2.2, 0.61, 840.3, 431.2, 2, 0.74, 836.1, 435.9, 2, 0.8, 835, 438.2, 2, 0.76, 835.1, 440.3, 2.2, 0.77, 835.7, 441.8, 2.2, 0.7, 838.9, 446.2, 2, 0.51, 842.6, 450.1, 1.5, 0.47, 843.4, 451.7, 2, 0.36, 844.1, 454.1, 1.5, 0.29, 843.2, 457.1, 2, 0.2, 841.9, 459.6, 2.8, 0.19, 840.7, 461.5, 3.2, 0.18]], "52.84": [[794.6, 461.1, 3.5, 0.03, 796.9, 454.5, 3.5, 0.04, 794.6, 447.8, 0.8, 0.01, 796.8, 441.1, 3.5, 0.02, 796.8, 434.5, 3.5, 0.02, 796.8, 427.8, 3.5, 0.01, 794.6, 421.2, 2.2, 0.02, 795.3, 414.5, 2.2, 0.02, 796.8, 407.8, 2.5, 0.02, 795.5, 401.2, 3.2, 0.02, 795.2, 394.5, 1.5, 0.01, 794.7, 387.8, 1.2, 0.01, 794.7, 381.2, 1, 0.01, 796.5, 374.5, 2, 0, 796.7, 367.8, 3.5, 0, 795.7, 361.2, 2, 0.01, 795.7, 354.5, 2.8, 0.01, 794.7, 347.9, 3.5, 0, 796.4, 341.2, 3.5, 0, 794.9, 334.5, 3.5, 0.01, 795.9, 327.9, 3, 0.02, 794.6, 324.8, 0.8, 0.01, 797.4, 324.6, 3.5, 0.01, 804.3, 324.6, 1.8, 0, 811.3, 326.6, 3.2, 0.02, 818.2, 326.1, 1.8, 0, 825.2, 326.6, 3.5, 0.01, 832.1, 326.6, 2.5, 0, 839.1, 325.1, 3.5, 0, 846, 324.9, 1.8, 0, 853, 324.6, 1.2, 0.01, 859.9, 326.6, 3.5, 0.01, 866.9, 326.4, 2.8, 0.02, 873.8, 324.9, 3.5, 0.01, 880.8, 326.6, 3, 0, 887.7, 326.6, 3.5, 0, 894.7, 326.6, 1.5, 0, 901.6, 324.6, 0.6, 0.01, 903.6, 324.6, 3.5, 0.01, 902.1, 326.6, 3.5, 0.01, 903.4, 333.1, 2.2, 0.01, 903.4, 339.9, 2.5, 0, 902.4, 346.6, 3, 0, 904.4, 353.4, 3.5, 0.01, 902.1, 360.1, 3.5, 0.01, 902.1, 366.9, 3.5, 0.01, 903.4, 373.6, 2, 0.01, 902.1, 380.4, 3.5, 0.01, 903.1, 387.1, 3.5, 0.02, 904.4, 393.9, 1.5, 0.02, 904.4, 400.6, 1.2, 0.06, 902.1, 407.4, 3.2, 0.03, 904.1, 414.1, 2.2, 0.07, 902.1, 420.9, 3.5, 0.02, 903.4, 427.6, 2.5, 0.07, 904.4, 434.4, 2.2, 0.05, 904.1, 441.1, 3.5, 0.07, 902.1, 447.9, 3.5, 0.04, 902.9, 454.6, 2.2, 0.02, 904.4, 461.4, 1, 0.04], [829.9, 384.6, 2, 0.55, 831.6, 379.2, 1.5, 0.32, 833.9, 375.8, 2, 0.71, 836.5, 372.4, 2, 0.69, 839.4, 369.8, 1.8, 0.46, 842.4, 368, 1.8, 0.31, 845.4, 366.1, 2.2, 0.26], [831.8, 377.1, 3, 0.49, 828.3, 377.2, 2.5, 0.12, 826, 378.9, 2, 0.12, 822.7, 382.8, 1.8, 0.12, 819, 386.4, 1.8, 0.34, 817.4, 391.6, 2.2, 0.85, 819, 394, 2, 0.97, 823, 397.6, 1.8, 0.37, 828, 400.3, 2.5, 0.17, 833.5, 402.1, 1.8, 0.41, 838.8, 404.2, 1.8, 0.73, 841.6, 406.1, 1.8, 0.63, 843.7, 408.9, 2.5, 0.44, 844.1, 413.3, 2.8, 0.37, 842.2, 416.4, 1.5, 0.4, 837.6, 420.7, 1.8, 0.34, 833.2, 424.2, 1.8, 0.47, 828.7, 427.6, 1.8, 0.41, 825.6, 431.2, 2.2, 0.4, 824.2, 434.6, 1.8, 0.61, 824.1, 437.4, 2, 0.76, 824.7, 439, 2, 0.6, 827.6, 442.9, 2.2, 0.31, 832.5, 446.3, 2.5, 0.34, 832.7, 447.2, 3, 0.26], [841.1, 461.1, 2.8, 0.18, 843.6, 456.2, 2, 0.25, 844.1, 453.4, 1.5, 0.31, 843.6, 450.6, 2, 0.35, 842.5, 448.9, 1.5, 0.45, 839, 445.4, 2, 0.51, 835.9, 441.7, 2, 0.68, 834.8, 439.3, 2, 0.81, 834.9, 438, 2, 0.8, 836.3, 434.5, 2.2, 0.84, 838.4, 431.6, 2.2, 0.71, 841.2, 429.3, 2, 0.69, 845.9, 425.8, 1.8, 0.4, 850.6, 422.3, 2, 0.17, 853.5, 419, 1.5, 0.31, 856, 415.4, 2, 0.68, 857.3, 412.1, 2.5, 0.69, 857.3, 407.7, 2.2, 0.29, 856.3, 403.4, 2.2, 0.31, 854.8, 401.1, 2, 0.31, 852.1, 398.9, 2, 0.16]], "52.88": [[796.9, 461.1, 3.5, 0.03, 796.6, 454.5, 3.2, 0.01, 796.3, 447.8, 3, 0.01, 796.8, 441.1, 3.5, 0.02, 796.1, 434.5, 2.8, 0.01, 794.6, 427.8, 2, 0.01, 794.6, 421.2, 1, 0.01, 794.5, 414.5, 1.8, 0.01, 796, 407.8, 1.2, 0.01, 796.5, 401.2, 3, 0.01, 796, 394.5, 3.5, 0, 794.7, 387.8, 1, 0.01, 796.7, 381.2, 3.5, 0, 796.2, 374.5, 2, 0.01, 794.7, 367.8, 1, 0.01, 796.7, 361.2, 3.2, 0.01, 794.7, 354.5, 1, 0.02, 796.7, 347.9, 3.5, 0, 796.4, 341.2, 2, 0.01, 796.6, 334.5, 3, 0, 795.4, 327.9, 3, 0.01, 796.3, 326.3, 2.2, 0.01, 797.5, 326.1, 3.2, 0, 804.3, 324.6, 2.2, 0.01, 811.3, 324.6, 3.5, 0.01, 818.2, 326.6, 2.5, 0.01, 825.2, 324.6, 3.5, 0.01, 832.1, 324.6, 1, 0.01, 839.1, 325.1, 3.2, 0, 846, 326.6, 3, 0, 853, 326.6, 3.5, 0, 859.9, 326.6, 2.5, 0, 866.9, 324.6, 1.8, 0.02, 873.8, 326.6, 3.5, 0.01, 880.8, 325.9, 3.5, 0, 887.7, 324.6, 1, 0.01, 894.7, 324.6, 2, 0, 901.4, 326.6, 3.5, 0.03, 901.9, 326, 3.5, 0.02, 902.4, 332.2, 2.8, 0.01, 903.1, 339, 2.2, 0.02, 901.9, 345.8, 2.2, 0, 904.4, 352.6, 3.5, 0.02, 902.9, 359.4, 3.5, 0.02, 904.4, 366.2, 1, 0.01, 904.4, 372.9, 0.6, 0.02, 902, 379.7, 3, 0.01, 902, 386.5, 3.5, 0.05, 904.5, 393.3, 2.5, 0.02, 902.3, 400.1, 3.5, 0.04, 903.8, 406.9, 2, 0.05, 904.3, 413.6, 3.5, 0.1, 902.5, 420.4, 3.5, 0.06, 902.1, 427.2, 3.5, 0.07, 903.1, 434, 2.8, 0.06, 902.1, 440.8, 3.5, 0.05, 904.3, 447.6, 1, 0.06, 902.9, 454.3, 3.5, 0.04, 902.1, 461.1, 3.5, 0.03], [829.9, 383.6, 2, 0.55, 831.6, 378.2, 1.5, 0.32, 833.9, 374.8, 2, 0.71, 836.5, 371.4, 2, 0.69, 839.4, 368.8, 1.8, 0.46, 842.4, 367, 1.8, 0.31, 845.4, 365.1, 2.2, 0.26], [831.8, 376.1, 3, 0.49, 828.3, 376.2, 2.5, 0.12, 826, 377.9, 2, 0.12, 822.6, 381.8, 1.8, 0.12, 818.9, 385.4, 2, 0.34, 817.4, 390.6, 2.2, 0.85, 819, 393, 2, 0.97, 823, 396.5, 1.8, 0.37, 827.9, 398.9, 1.8, 0.19, 833, 400.8, 2, 0.43, 838.3, 402.6, 2, 0.75, 841.8, 404.9, 2, 0.62, 844.2, 408.1, 2, 0.41, 844.4, 412.2, 2.5, 0.36, 842, 415.2, 2, 0.36, 838.6, 419, 1.8, 0.31, 833.4, 423, 2, 0.46, 828.2, 427.1, 1.8, 0.4, 825, 431.4, 2.2, 0.44, 823.8, 434.6, 2, 0.73, 824.3, 436.9, 2.2, 0.74, 826, 439.7, 1.8, 0.39, 829.1, 443.3, 2.2, 0.33, 832.5, 445.3, 2.5, 0.35, 832.6, 446, 2.5, 0.31], [853.4, 398.9, 1.8, 0.24, 853.6, 398.8, 1.8, 0.27, 854.8, 399.7, 2.2, 0.23, 857.3, 404.6, 2.5, 0.23, 857.4, 411.1, 2.5, 0.65, 856.2, 414.6, 2.2, 0.71, 853.8, 418.5, 2, 0.3, 850.6, 421.8, 2.2, 0.16, 845.9, 424.9, 1.8, 0.38, 841.5, 428.5, 1.8, 0.68, 836.6, 432.6, 2.2, 0.85, 835.5, 434, 2.2, 0.8, 834.9, 436.5, 2, 0.88, 834.8, 438.6, 2, 0.89, 835.8, 440.7, 2.2, 0.67, 839, 444.6, 2, 0.5, 842.6, 448.1, 1.5, 0.46, 843.8, 450.4, 2, 0.35, 843.9, 452.9, 1.5, 0.3, 843, 455.8, 2, 0.28, 840.4, 460.6, 3, 0.15, 839.9, 461.5, 2.8, 0.15]], "52.92": [[796.9, 461.1, 2.8, 0.01, 796.1, 454.5, 1.5, 0, 794.6, 447.8, 0.6, 0, 796.8, 441.1, 2.8, 0.02, 796.8, 434.5, 3.5, 0.01, 794.6, 427.8, 2, 0, 794.8, 421.2, 1, 0.01, 796.8, 414.5, 2.5, 0.01, 796, 407.8, 3.5, 0.01, 795.8, 401.2, 2, 0, 796.7, 394.5, 3.5, 0, 795.7, 387.8, 2, 0.01, 796.5, 381.2, 3.2, 0.01, 796.7, 374.5, 2.5, 0.01, 796.7, 367.8, 2.5, 0, 796.4, 361.2, 3.2, 0.01, 796.7, 354.5, 3.5, 0.01, 796.7, 347.9, 3.5, 0, 796.4, 341.2, 3.5, 0, 794.6, 334.5, 0.6, 0, 795.9, 327.9, 3.5, 0, 796.7, 326.6, 3.5, 0, 797.4, 325.1, 3.5, 0, 804.3, 324.6, 3.5, 0.01, 811.3, 326.6, 3.2, 0.03, 818.2, 324.6, 0.6, 0.01, 825.2, 326.6, 2.5, 0, 832.1, 324.6, 1, 0.01, 839.1, 325.1, 3.5, 0, 846, 326.6, 3, 0, 853, 326.6, 3.5, 0, 859.9, 326.6, 2.5, 0, 866.9, 326.6, 3.5, 0.01, 873.8, 326.6, 3, 0.01, 880.8, 324.6, 3.5, 0, 887.7, 324.9, 1, 0.01, 894.7, 324.6, 0.6, 0, 901.6, 325.6, 2, 0, 902.3, 326.4, 1.2, 0, 903.4, 326.4, 2.2, 0, 902.9, 333.1, 1.5, 0.01, 903.9, 339.9, 3.5, 0, 904.4, 346.6, 0.8, 0.01, 903.4, 353.4, 3.5, 0.01, 902.1, 360.1, 3.2, 0.03, 902.1, 366.9, 3.5, 0.01, 904.4, 373.6, 2.2, 0.01, 902.1, 380.4, 2.8, 0.01, 903.6, 387.1, 3.5, 0.06, 904.4, 393.9, 2.8, 0.06, 902.1, 400.6, 3.5, 0.04, 902.9, 407.4, 2.8, 0.05, 903.4, 414.1, 2.8, 0.07, 902.1, 420.9, 3.5, 0.07, 902.1, 427.6, 3.5, 0.06, 903.1, 434.4, 2.8, 0.05, 902.1, 441.1, 3.5, 0.05, 904.4, 447.9, 2.2, 0.04, 904.4, 454.6, 1.8, 0.05, 902.1, 461.4, 3, 0.02], [830.5, 384.2, 2, 0.19, 829.9, 383.2, 1.8, 0.53, 829.8, 382.1, 1.8, 0.48, 831.4, 377.7, 1.8, 0.24, 833, 374, 1.8, 0.72, 835.7, 371.5, 2, 0.69, 838.1, 368.9, 2, 0.51, 841.5, 366.9, 1.8, 0.3, 844.7, 364.7, 2, 0.3, 845.4, 364.1, 2.2, 0.25], [831.4, 376.1, 3, 0.43, 827.6, 375.7, 2.2, 0.12, 824.6, 378.1, 1.8, 0.04, 821.8, 381.3, 2, 0.12, 818.9, 384.4, 1.8, 0.34, 817.5, 389.9, 2, 0.89, 819, 392, 2, 0.97, 823, 395.5, 1.8, 0.37, 827.3, 397.9, 1.5, 0.18, 831.9, 399.5, 2, 0.34, 835.7, 400.3, 1.8, 0.5, 839.3, 401.8, 2, 0.79, 841.7, 403.5, 2, 0.72, 843.8, 405.9, 2, 0.45, 844.7, 411.2, 3, 0.31, 843.2, 413.4, 2, 0.31, 838.9, 417.7, 1.8, 0.29, 833.6, 421.8, 2, 0.48, 828.4, 425.9, 1.8, 0.39, 825, 430.4, 2.2, 0.44, 823.5, 433.6, 2.2, 0.73, 824, 435.7, 2.2, 0.75, 825.1, 438.4, 1.8, 0.45, 828.6, 442, 2.5, 0.32, 832.5, 444.6, 2.2, 0.36], [854.4, 398.4, 2, 0.2, 856.1, 400.4, 2.2, 0.3, 857.3, 403.6, 2.5, 0.23, 857.4, 410.1, 2.5, 0.65, 856.2, 413.6, 2.2, 0.71, 853.8, 417.5, 2, 0.3, 850.6, 420.8, 2.2, 0.16, 846.3, 423.9, 2, 0.38, 841.8, 426.9, 2, 0.68, 837.8, 430.4, 2, 0.77, 835.6, 433, 2.2, 0.81, 834.9, 435, 2, 0.81, 834.7, 436.5, 2.2, 0.82, 835.7, 439.7, 2, 0.69, 839.1, 443.4, 2, 0.47, 842.5, 447.1, 1.5, 0.46, 843.8, 449.9, 1.8, 0.35, 843.8, 453.1, 2, 0.25, 843.1, 455.6, 2.2, 0.26, 840.3, 460.8, 3, 0.15, 839.7, 461.5, 3.5, 0.17]], "52.96": [[794.6, 461.1, 1.5, 0.01, 796.9, 454.5, 3.5, 0.01, 794.6, 447.8, 1.5, 0.01, 796.8, 441.1, 2.8, 0.01, 796.8, 434.5, 3.5, 0.01, 794.6, 427.8, 2, 0.01, 794.6, 421.2, 1, 0.01, 794.5, 414.5, 1.8, 0.01, 796, 407.8, 1.2, 0.01, 796.8, 401.2, 1.5, 0.01, 796, 394.5, 3.5, 0, 794.7, 387.8, 1, 0.01, 796.7, 381.2, 3.5, 0.01, 795.2, 374.5, 2.8, 0.01, 796.7, 367.8, 2.5, 0.01, 796.4, 361.2, 3.2, 0.01, 796.2, 354.5, 2, 0.01, 794.7, 347.9, 3.5, 0, 794.6, 341.2, 3.5, 0, 796.6, 334.5, 3.5, 0, 796.6, 328, 3.5, 0, 796.7, 326.6, 3.2, 0, 797.5, 326.6, 3.5, 0, 804.3, 326.6, 3, 0.01, 811.3, 326.6, 3.2, 0.03, 818.2, 326.6, 2.5, 0, 825.2, 325.9, 3.5, 0, 832.1, 326.6, 3, 0.01, 839.1, 324.6, 1, 0.01, 846, 324.6, 2, 0, 853, 325.9, 2, 0, 859.9, 326.4, 3.5, 0.01, 866.9, 326.6, 3.2, 0.01, 873.8, 326.6, 3.5, 0.01, 880.8, 324.6, 3.5, 0, 887.7, 324.6, 1.2, 0, 894.7, 325.4, 1.8, 0, 901.6, 325.6, 1.8, 0, 902.3, 326.4, 3, 0, 902.6, 326.5, 2.2, 0, 902.1, 333.1, 2.5, 0, 902.1, 339.9, 3.5, 0, 902.6, 346.6, 2.2, 0.01, 903.9, 353.4, 2, 0.01, 903.9, 360.1, 1, 0.01, 904.4, 366.9, 3.5, 0.01, 902.9, 373.6, 1.5, 0.01, 904.4, 380.4, 1, 0.01, 904.4, 387.1, 2.2, 0.04, 904.4, 393.9, 2.8, 0.03, 904.4, 400.6, 1.5, 0.07, 902.1, 407.4, 3.5, 0.04, 903.6, 414.1, 2.2, 0.07, 902.1, 420.9, 3.5, 0.07, 902.9, 427.6, 3.5, 0.05, 903.1, 434.4, 2.8, 0.05, 904.4, 441.1, 3, 0.06, 902.1, 447.9, 3.5, 0.03, 904.4, 454.6, 1.5, 0.05, 902.9, 461.4, 3.5, 0.03], [827.1, 374.9, 2.2, 0.12, 824.1, 377.4, 1.5, 0.07, 821.5, 380.8, 2.2, 0.09, 818.4, 383.9, 2, 0.3, 816.8, 387.3, 2, 0.61, 817.8, 389.8, 2.2, 1, 818.9, 391.2, 2, 0.95, 823.9, 394.9, 1.5, 0.32, 828, 396.6, 2.2, 0.2, 832.1, 398.3, 2, 0.43, 836.4, 399, 2, 0.56, 840.1, 401.1, 2, 0.79, 843.1, 403.4, 2.2, 0.56, 844.8, 406.6, 3, 0.4, 845.1, 409.8, 2.2, 0.33, 843.1, 412.6, 2.2, 0.29, 839.6, 416, 1.2, 0.3, 835.7, 419.1, 2, 0.41, 831.7, 421.9, 1.8, 0.43, 827.9, 425.1, 1.8, 0.41, 824.8, 429.4, 2.2, 0.44, 823.5, 432.4, 2.2, 0.73, 823.9, 434.3, 2.2, 0.74, 824.7, 435.8, 2.2, 0.56, 827.9, 440.1, 2.8, 0.28, 830.8, 442.1, 2.2, 0.35, 832.1, 443, 2.2, 0.41, 833.1, 442.9, 3.2, 0.25, 836, 440.2, 3.5, 0.48], [831.4, 384.8, 3.5, 0.04, 830.5, 382.2, 2, 0.39, 829.6, 381.1, 2, 0.55, 831.5, 375.4, 2, 0.55, 833.9, 372, 2, 0.75, 836.6, 369, 1.8, 0.63, 840.1, 366.3, 2, 0.34, 844.5, 363.7, 2.2, 0.3, 844.6, 363, 2.2, 0.26], [855.1, 397.9, 2.2, 0.19, 856.5, 399.7, 2, 0.33, 857.5, 402.4, 2.5, 0.22, 857.8, 405.9, 2, 0.3, 857.5, 409.3, 2.5, 0.75, 856.7, 412.2, 2, 0.71, 853.8, 415.9, 1.5, 0.29, 850.8, 419.7, 2, 0.16, 846.5, 422.7, 1.8, 0.35, 842, 425.5, 1.8, 0.66, 837.9, 428.7, 2, 0.78, 835.1, 432.3, 2.2, 0.84, 834.7, 434, 2, 0.79, 834.6, 435.7, 2, 0.81, 835.9, 438.9, 2, 0.7, 839.4, 442.3, 2.2, 0.48, 842.5, 446.1, 1.5, 0.47, 844, 449.4, 1.8, 0.4, 844.1, 452.9, 1.8, 0.36, 843.4, 455.1, 2.8, 0.26, 840.1, 460, 3.5, 0.16, 839, 462.4, 3, 0.24]], "53.00": [[796.9, 461.1, 3.5, 0.01, 795.4, 454.5, 3.5, 0.01, 795.6, 447.8, 2.2, 0.01, 796.8, 441.1, 2.2, 0.01, 795.8, 434.5, 3.5, 0.01, 796.6, 427.8, 3, 0.01, 795.3, 421.1, 3.5, 0.01, 796.8, 414.5, 3.5, 0, 796.8, 407.8, 3.5, 0, 796.8, 401.2, 3.5, 0.01, 796, 394.5, 1.5, 0.01, 794.7, 387.8, 0.6, 0.01, 796.5, 381.2, 3.5, 0, 794.7, 374.5, 1, 0.01, 795.2, 367.8, 3.5, 0, 796.7, 361.2, 3.5, 0.01, 796.7, 354.5, 3.5, 0.02, 796.7, 347.9, 3.5, 0, 794.6, 341.2, 3.5, 0, 796.6, 334.5, 3.5, 0.01, 796.6, 328, 3.5, 0.01, 794.6, 324.8, 1.2, 0.01, 797.4, 324.6, 1.2, 0.01, 804.3, 326.6, 3, 0.01, 811.3, 326.6, 3.2, 0.01, 818.2, 326.6, 2.5, 0, 825.2, 325.9, 3.5, 0, 832.1, 326.6, 3, 0.01, 839.1, 324.6, 1, 0.01, 846, 324.6, 1.8, 0, 853, 324.6, 0.6, 0, 859.9, 326.6, 3, 0.01, 866.9, 324.6, 1, 0.01, 873.8, 326.6, 3.5, 0.01, 880.8, 326.1, 3.5, 0.01, 887.7, 324.9, 1.2, 0.01, 894.7, 324.6, 3.5, 0.01, 901.6, 324.6, 2.2, 0.01, 901.9, 326, 2.8, 0.01, 903.4, 332.2, 3.5, 0.01, 901.9, 339, 3.5, 0, 901.9, 345.8, 2.5, 0, 904.4, 352.6, 1, 0.01, 904.4, 359.4, 3.5, 0, 902.7, 366.2, 3, 0.02, 904.4, 372.9, 3.5, 0.01, 902, 379.7, 3.5, 0.03, 902, 386.5, 3.5, 0.05, 902, 393.3, 3.5, 0.03, 902, 400.1, 3.2, 0.04, 902, 406.9, 3.5, 0.05, 904, 413.6, 2.2, 0.09, 904.3, 420.4, 2.5, 0.07, 902.3, 427.2, 3.5, 0.04, 904.3, 434, 3.5, 0.04, 902.1, 440.8, 3.5, 0.05, 903.1, 447.6, 3.2, 0.06, 903.4, 454.3, 3.5, 0.05, 904.4, 461.1, 3, 0.03], [827.1, 373.9, 2.2, 0.12, 824.1, 376.4, 1.5, 0.07, 821.5, 379.8, 2.2, 0.09, 818.4, 382.9, 2.2, 0.3, 817.1, 386.7, 2.2, 0.68, 817.8, 388.4, 1.8, 1, 819.4, 390.2, 2, 0.87, 824.4, 394.1, 1.8, 0.31, 828.3, 395.9, 2, 0.2, 832.4, 397.2, 2.2, 0.43, 836.3, 398.3, 1.8, 0.6, 840.1, 400.1, 2, 0.79, 843.8, 403.3, 2, 0.46, 845.4, 406.9, 3.2, 0.31, 844.3, 409.9, 2.2, 0.37, 842.9, 411.9, 1.8, 0.28, 839.9, 414.8, 1.5, 0.28, 834.2, 418.5, 1.8, 0.52, 831.1, 421.2, 2, 0.43, 828, 423.9, 1.8, 0.39, 824.9, 427.9, 2.2, 0.44, 823.6, 431.7, 2.2, 0.8, 824, 433.9, 2.2, 0.68, 825.5, 436.9, 1.5, 0.3, 828.6, 440, 2.2, 0.31, 833.4, 442.5, 2.8, 0.31], [830.4, 381.4, 1.8, 0.34, 829.6, 380.6, 2.2, 0.59, 831.1, 376, 1.5, 0.18, 833, 371.9, 2, 0.74, 837.5, 367.4, 1.8, 0.52, 841, 364.6, 1.8, 0.26, 844.7, 362.2, 2.2, 0.25], [855.1, 396.4, 2, 0.15, 856.5, 398.5, 2.2, 0.29, 857.5, 401.4, 2.2, 0.23, 857.9, 407.6, 2.2, 0.7, 856.6, 411.2, 2, 0.69, 853.6, 414.8, 1.8, 0.28, 850.5, 418.5, 2, 0.16, 846.4, 421.1, 1.8, 0.34, 842.4, 423.9, 2, 0.69, 838.6, 426.9, 2, 0.86, 835.6, 429.9, 2.2, 0.88, 834.1, 432.8, 2, 0.8, 834.4, 434.8, 2, 0.92, 835.1, 436.7, 2, 0.81, 838.5, 440.7, 2, 0.51, 842.3, 444.3, 1.8, 0.48, 844, 447.9, 2, 0.43, 844.1, 451.4, 1.8, 0.37, 843.2, 454.9, 2, 0.29, 840.7, 458.2, 2.2, 0.15, 838.8, 461.8, 3, 0.22]], "53.08": [[796.9, 461.1, 3.5, 0.02, 794.9, 454.5, 3.5, 0.01, 796.8, 447.8, 2.8, 0.03, 796.8, 441.1, 3.2, 0.01, 795.6, 434.5, 2, 0.01, 794.6, 427.8, 2.5, 0.04, 796.8, 421.1, 3.5, 0, 796.3, 414.5, 3.5, 0, 796.3, 407.8, 2, 0.01, 796, 401.2, 3.5, 0.01, 796.2, 394.5, 1.2, 0, 794.7, 387.8, 0.6, 0, 796.7, 381.2, 3.5, 0, 796.7, 374.5, 3.5, 0.01, 796.7, 367.8, 3.5, 0.01, 796.7, 361.2, 2.2, 0.01, 794.7, 354.5, 3, 0.01, 796.7, 347.9, 2.5, 0.01, 795.6, 341.2, 2, 0.01, 794.6, 334.5, 1, 0.02, 796.1, 328, 3.5, 0, 795, 325.1, 2.2, 0, 797.5, 326.6, 2.8, 0, 804.3, 326.6, 1.5, 0.01, 811.3, 326.6, 3.5, 0, 818.2, 324.6, 3.5, 0.01, 825.2, 326.4, 3.5, 0.01, 832.1, 325.1, 2.5, 0, 839.1, 325.4, 2, 0.01, 846, 324.6, 1, 0.01, 853, 326.6, 3, 0, 859.9, 324.6, 1.8, 0, 866.9, 324.6, 1, 0.01, 873.8, 326.4, 3.2, 0.01, 880.8, 326.6, 3.5, 0.01, 887.7, 326.6, 2.2, 0.02, 894.7, 326.6, 3.5, 0.01, 901.6, 324.6, 3.2, 0.01, 902.9, 325.7, 3.5, 0.01, 904.4, 332.2, 3, 0.01, 904.1, 339, 1, 0.01, 901.9, 345.8, 3.5, 0.01, 902.7, 352.6, 3.5, 0.01, 904.4, 359.4, 2, 0.02, 904.4, 366.2, 3.5, 0.01, 903.2, 372.9, 3.5, 0.02, 902.7, 379.7, 3.2, 0.02, 904.2, 386.5, 3.5, 0.04, 904.5, 393.3, 2, 0.03, 904.5, 400.1, 3, 0.06, 904.3, 406.9, 2.5, 0.07, 902.5, 413.6, 3.5, 0.06, 904.3, 420.4, 3.5, 0.07, 904.3, 427.2, 1, 0.05, 902.1, 434, 3.5, 0.06, 902.6, 440.8, 3.5, 0.07, 904.1, 447.6, 2.5, 0.04, 902.9, 454.3, 3.5, 0.02, 902.1, 461.1, 2.5, 0.04], [821.1, 378.4, 2.2, 0.08, 818.1, 382.1, 2.2, 0.26, 816.9, 385.4, 2, 0.62, 817.5, 386.7, 2.2, 0.92, 818.3, 388, 2.2, 0.93, 822.1, 391.7, 2, 0.41, 825.9, 393.7, 2, 0.19, 830.6, 395.4, 2.2, 0.21, 835.4, 396.6, 2, 0.52, 839.9, 398.5, 1.8, 0.82, 843.4, 401.1, 2.2, 0.54, 844.8, 403.4, 2.5, 0.38, 845.5, 406.7, 3, 0.33, 843.5, 409.9, 2, 0.32, 839.1, 414.3, 1.8, 0.26, 833.9, 418.1, 2, 0.53, 830.5, 420.3, 2.2, 0.42, 827.6, 423.1, 2, 0.42, 824.9, 426.6, 2.2, 0.44, 823.6, 430.7, 2.2, 0.8, 824.1, 432.9, 2.2, 0.68, 825.5, 435.9, 1.5, 0.3, 828.6, 439, 2.2, 0.31, 833.4, 441.5, 2.8, 0.31], [855.9, 395.6, 2.2, 0.21, 856.2, 396.6, 2, 0.28, 857.9, 399.3, 2.2, 0.18, 858.4, 403.9, 2, 0.3, 857.8, 406.8, 2.5, 0.7, 856.7, 410.5, 2, 0.66, 853.9, 413.8, 2, 0.3, 850.9, 416.9, 2, 0.16, 846.7, 419.8, 1.8, 0.32, 842.6, 422.9, 2, 0.68, 838.6, 425.9, 2, 0.89, 835.7, 429, 1.8, 0.89, 834.1, 432, 2.2, 0.79, 834, 433.1, 2, 0.96, 834.9, 435.5, 2, 0.8, 837.9, 439.1, 2, 0.5, 842.1, 443.1, 2.2, 0.47, 844, 447.1, 1.8, 0.43, 844.2, 450.4, 1.8, 0.38, 843.1, 454, 2.2, 0.28, 840.8, 457.5, 2.5, 0.17, 838.5, 461.2, 3.2, 0.25, 837.5, 461.6, 2.2, 0.24], [837, 385.6, 1.8, 0.07, 833.8, 383.1, 2.8, 0.12, 830.2, 380.1, 1.8, 0.45, 829.6, 378.9, 2.2, 0.5, 830.9, 375, 1.8, 0.21, 832.2, 371.9, 2, 0.73, 835.8, 367.9, 2, 0.63, 839.9, 364.3, 2.2, 0.32, 844.7, 361.2, 2.2, 0.25]], "53.12": [[794.6, 461.1, 1, 0.02, 794.6, 454.5, 2.2, 0.01, 796.6, 447.8, 1.8, 0.01, 796.6, 441.1, 3.5, 0.01, 796.8, 434.5, 3, 0.01, 796.3, 427.8, 3.5, 0.01, 796.8, 421.1, 2, 0.01, 796.8, 414.5, 3, 0.01, 796.8, 407.8, 3.5, 0.01, 796.8, 401.2, 3.5, 0.01, 796.2, 394.5, 1.5, 0, 794.7, 387.8, 0.6, 0, 796.5, 381.2, 3.5, 0, 794.7, 374.5, 0.8, 0.01, 796.7, 367.8, 2.5, 0.01, 796.7, 361.2, 3.2, 0.01, 794.7, 354.5, 2.5, 0.01, 796.7, 347.9, 2.5, 0.01, 795.6, 341.2, 2, 0.01, 795.9, 334.5, 1.8, 0, 794.6, 327.9, 3.5, 0, 794.6, 324.8, 0.8, 0, 797.5, 326.6, 3.5, 0, 804.3, 326.6, 1.5, 0.01, 811.3, 325.1, 3.5, 0, 818.2, 324.6, 2.8, 0, 825.2, 326.6, 3.5, 0, 832.1, 326.6, 3.2, 0.01, 839.1, 324.6, 1, 0.01, 846, 325.6, 2, 0.01, 853, 324.6, 3.5, 0, 859.9, 324.6, 0.6, 0, 866.9, 324.6, 1, 0.01, 873.8, 326.4, 3.2, 0.01, 880.8, 324.6, 1, 0.01, 887.7, 326.6, 2.8, 0.01, 894.7, 325.1, 1.8, 0.01, 901.6, 324.6, 0.6, 0.01, 903.1, 325.7, 1.5, 0.01, 903.1, 332.2, 3.5, 0.01, 904.4, 339, 0.6, 0, 903.4, 345.8, 2.5, 0.01, 902.9, 352.6, 3.5, 0.01, 901.9, 359.4, 3.5, 0.01, 904.4, 366.2, 1.2, 0.02, 904.4, 372.9, 2.5, 0.02, 903, 379.7, 1.8, 0.03, 903.2, 386.5, 3.5, 0.04, 902, 393.3, 3.5, 0.03, 902, 400.1, 3.5, 0.04, 902, 406.9, 3.5, 0.04, 902, 413.6, 3.2, 0.06, 902.8, 420.4, 3.5, 0.05, 904.3, 427.2, 2, 0.04, 902.1, 434, 3, 0.05, 904.3, 440.8, 3.5, 0.06, 904.3, 447.6, 2.5, 0.05, 904.4, 454.3, 1.2, 0.09, 903.6, 461.1, 2, 0.04], [821.1, 377.4, 2.2, 0.08, 818.2, 381.1, 2, 0.26, 816.8, 384.1, 2.2, 0.55, 817.3, 385.8, 2, 0.94, 818.3, 387.2, 1.8, 0.93, 821.4, 390.4, 1.8, 0.47, 825.5, 392.3, 2, 0.25, 830.1, 394.5, 2.2, 0.18, 835, 395.5, 2, 0.51, 839.6, 397.4, 1.8, 0.86, 843.4, 400.1, 2, 0.54, 844.8, 402.4, 2.5, 0.38, 845.4, 406.2, 2.2, 0.33, 842.9, 409.6, 1.8, 0.28, 838.9, 413.5, 1.8, 0.25, 834.5, 416.4, 1.8, 0.5, 831.6, 418.6, 1.8, 0.44, 828.9, 420.9, 1.8, 0.38, 825.1, 425, 2.2, 0.4, 824.1, 426.9, 2, 0.52, 823.5, 430.9, 2.2, 0.77, 824.3, 433.4, 2.2, 0.5, 828.6, 438, 2.2, 0.31, 833.7, 440.7, 2.5, 0.22], [837, 384.6, 1.8, 0.07, 833.8, 382.1, 2.8, 0.12, 830.2, 379.1, 1.8, 0.45, 829.6, 377.9, 2.2, 0.5, 830.9, 374, 1.8, 0.21, 831.9, 371.4, 2, 0.74, 835.6, 367.1, 2, 0.67, 839.9, 363.3, 2.2, 0.32, 844.7, 360.2, 2.2, 0.25], [837.3, 461.3, 2, 0.19, 838.2, 460.3, 3.5, 0.27, 840.3, 457.1, 3.5, 0.15, 842.7, 454.1, 2.2, 0.23, 844.1, 451.4, 1.8, 0.31, 844.1, 448.1, 1.8, 0.45, 844.1, 445.3, 1.8, 0.45, 842.8, 442.9, 2, 0.47, 838.5, 438.9, 2, 0.52, 834.8, 434.5, 2, 0.8, 834.2, 432, 1.8, 0.94, 834.3, 430.3, 2.2, 0.8, 834.8, 428.8, 2, 0.89, 837.7, 425.6, 2, 0.79, 840.9, 422.7, 2, 0.77, 843.9, 420.8, 1.5, 0.55, 847.8, 417.9, 1.5, 0.18, 851.8, 415.2, 1.5, 0.16, 854.3, 412.3, 1.8, 0.31, 856.7, 409.5, 2, 0.66, 857.9, 405.8, 2.5, 0.7, 858.4, 402.9, 2, 0.3, 857.9, 398.3, 2.2, 0.18, 856.2, 395.6, 2, 0.28, 855.9, 394.6, 2, 0.21]], "53.16": [[796.9, 461.1, 2.8, 0.02, 796.9, 454.5, 2.5, 0.01, 796.8, 447.8, 3, 0.01, 796.8, 441.1, 3, 0.01, 796.8, 434.5, 3, 0.01, 796.8, 427.8, 3.5, 0, 796.8, 421.1, 2.8, 0, 794.8, 414.5, 1, 0.01, 795.8, 407.8, 2, 0, 794.5, 401.2, 3.5, 0, 796.7, 394.5, 3.5, 0, 796.7, 387.8, 3.5, 0, 796.7, 381.2, 2.8, 0, 796.7, 374.5, 3.5, 0, 796.4, 367.8, 3.2, 0.01, 795.4, 361.2, 3.5, 0, 794.7, 354.5, 0.8, 0.01, 796.7, 347.9, 3.5, 0, 796.4, 341.2, 3.5, 0, 794.6, 334.5, 3.5, 0, 796.6, 328, 2.2, 0.01, 796.7, 326.6, 3.5, 0.01, 797.5, 326.6, 3.2, 0.01, 804.3, 326.6, 3.5, 0.01, 811.3, 326.1, 3.5, 0.01, 818.2, 326.1, 3.2, 0.01, 825.2, 326.6, 2.8, 0, 832.1, 324.6, 2.5, 0.01, 839.1, 324.6, 3.5, 0.01, 846, 325.1, 3.5, 0, 853, 324.9, 1, 0.01, 859.9, 326.1, 3.5, 0.01, 866.9, 324.6, 2, 0, 873.8, 326.6, 2.5, 0, 880.8, 326.6, 3.2, 0.01, 887.7, 326.6, 3.5, 0.01, 894.7, 326.6, 3, 0, 901.6, 324.6, 0.6, 0.01, 904.3, 325.3, 1, 0.01, 904.4, 332.2, 3.5, 0.01, 902.9, 339, 3.5, 0, 904.4, 345.8, 3.5, 0.01, 904.2, 352.6, 3, 0.01, 901.9, 359.4, 3.5, 0.01, 901.9, 366.2, 3.5, 0.01, 901.9, 372.9, 3.5, 0.02, 902, 379.7, 2.5, 0.01, 902, 386.5, 3.5, 0.04, 902, 393.3, 3.2, 0.03, 902, 400.1, 3.5, 0.05, 902, 406.9, 3.5, 0.04, 904.3, 413.6, 3.5, 0.08, 904.3, 420.4, 2.8, 0.04, 904.3, 427.2, 0.6, 0.05, 904.3, 434, 1.8, 0.06, 902.1, 440.8, 3.5, 0.06, 904.3, 447.6, 1.2, 0.06, 904.4, 454.3, 3.5, 0.02, 904.1, 461.1, 3.5, 0.03], [821.2, 376.2, 2, 0.07, 818.2, 380.1, 2, 0.25, 817.1, 383.7, 2.2, 0.64, 817.4, 384.7, 2, 0.96, 818.5, 386, 2, 1, 821.9, 389.2, 1.8, 0.39, 826, 391, 2.2, 0.17, 830.6, 392.8, 2, 0.28, 835.5, 394, 2, 0.56, 839.9, 396.2, 2, 0.79, 843, 398.4, 1.8, 0.52, 845.2, 401.6, 2.8, 0.39, 845.1, 405.4, 2.8, 0.32, 843.3, 407.7, 2, 0.28, 840.4, 411, 1.5, 0.26, 834.6, 414.9, 2, 0.5, 831.9, 417.4, 1.8, 0.44, 828.9, 419.6, 1.8, 0.37, 825.1, 423.7, 2.2, 0.41, 824.1, 425.6, 2, 0.52, 823.5, 428.9, 2.5, 0.79, 823.9, 430.4, 2.2, 0.71, 825.9, 434.4, 1.5, 0.24, 828.4, 436.8, 2.2, 0.31, 831, 438.8, 2, 0.38, 832.6, 439.2, 2.2, 0.41, 833.7, 438.5, 3.5, 0.21, 836.9, 436.3, 3.5, 0.53], [832, 380.7, 3, 0.04, 830.1, 378.9, 1.8, 0.22, 829.6, 377.1, 2.2, 0.52, 830.9, 372.9, 1.5, 0.2, 832.2, 370, 1.8, 0.73, 836.1, 365, 1.8, 0.58, 840.4, 361.8, 1.8, 0.25, 844.6, 359.4, 2.2, 0.26], [855.9, 393.9, 2.5, 0.18, 857.2, 395.6, 1.8, 0.27, 858.4, 399.1, 2.2, 0.25, 858.1, 403.6, 2.2, 0.56, 857.2, 407.5, 2, 0.69, 854.3, 410.9, 1.5, 0.34, 851.3, 414.5, 1.5, 0.13, 846.1, 418, 1.8, 0.34, 841, 421.6, 2, 0.72, 837.6, 424.3, 2, 0.78, 834.9, 428, 2, 0.85, 834.1, 429.2, 2.2, 0.79, 834.2, 431.6, 2, 0.86, 835.4, 434.4, 2, 0.7, 838.7, 437.8, 2, 0.47, 842.1, 441.2, 2, 0.45, 844.1, 444.9, 1.8, 0.46, 844.1, 448.9, 1.8, 0.38, 843, 452.3, 2, 0.29, 841.3, 455.6, 2, 0.2, 838.9, 458.6, 2.5, 0.19, 838, 459.9, 3, 0.25, 837.6, 460.6, 2.5, 0.24]], "53.20": [[796, 459.6, 3.5, 0.05, 796.4, 461, 3.5, 0.04, 796.4, 454.5, 3.5, 0.03, 794.9, 447.8, 3.5, 0.02, 794.6, 441.1, 3.5, 0.01, 794.6, 434.5, 1.5, 0.01, 794.6, 427.8, 3.5, 0, 796.6, 421.2, 3.5, 0, 794.6, 414.5, 1, 0.01, 795.9, 407.8, 2, 0, 796.6, 401.2, 3, 0.01, 795.6, 394.5, 2, 0, 794.9, 387.8, 1.5, 0.02, 794.6, 381.2, 1, 0.01, 795.4, 374.5, 3, 0.01, 794.6, 367.8, 1.2, 0, 794.6, 361.2, 3.5, 0, 796.6, 354.5, 3, 0.01, 796.6, 347.9, 3, 0.01, 796.6, 341.2, 3.5, 0.01, 796.6, 334.5, 2.5, 0, 795.9, 327.9, 3.5, 0, 794.6, 324.8, 0.8, 0.01, 797.5, 326.6, 3.5, 0, 804.3, 326.6, 1.5, 0.01, 811.3, 325.1, 3.5, 0, 818.2, 324.6, 3.5, 0.01, 825.2, 326.6, 2.8, 0, 832.1, 324.6, 2.5, 0.01, 839.1, 324.6, 3.5, 0.01, 846, 325.1, 3.5, 0, 853, 324.9, 1, 0.01, 859.9, 326.1, 3.5, 0.01, 866.9, 326.6, 3, 0.01, 873.8, 326.4, 3.5, 0.02, 880.8, 326.6, 2.5, 0, 887.7, 325.9, 3.5, 0.01, 894.7, 326.6, 3.5, 0.01, 901.6, 324.6, 1, 0.01, 904.3, 325.3, 1.5, 0.01, 902.6, 332.2, 3.5, 0, 901.9, 339, 3.5, 0, 904.4, 345.8, 3.5, 0.01, 902.7, 352.6, 3.5, 0.01, 904.4, 359.4, 0.6, 0.01, 902.4, 366.2, 3.2, 0.03, 903.4, 372.9, 2.8, 0.02, 904.5, 379.7, 3.2, 0.03, 902.2, 386.5, 3.5, 0.05, 902, 393.3, 2.2, 0.02, 903.8, 400.1, 3.5, 0.06, 902, 406.9, 3.5, 0.04, 902, 413.6, 3.5, 0.06, 902, 420.4, 2.8, 0.03, 904.3, 427.2, 0.6, 0.05, 904.3, 434, 3.5, 0.06, 903.3, 440.8, 2.5, 0.06, 904.3, 447.6, 3.5, 0.05, 903.6, 454.3, 2.2, 0.03, 904.1, 461.1, 1.2, 0.03], [821.4, 375.1, 2.2, 0.07, 817.5, 379.7, 2.2, 0.21, 817, 382.9, 2, 0.77, 818.2, 384.5, 1.8, 1, 821.9, 388, 1.8, 0.4, 825.9, 390, 2.2, 0.17, 830.6, 391.5, 2, 0.29, 835.4, 393.1, 1.8, 0.52, 839.9, 395, 1.8, 0.84, 843.7, 397.6, 2, 0.53, 845, 401.6, 3, 0.32, 844.5, 404.6, 2.5, 0.35, 842.3, 407.7, 2.2, 0.31, 837.6, 411.9, 2, 0.29, 834.3, 414.1, 1.8, 0.53, 831.4, 416.2, 1.8, 0.45, 828.6, 418.5, 1.8, 0.38, 825.5, 422.1, 2, 0.39, 824, 424.6, 2.2, 0.54, 823.5, 427.9, 2.5, 0.8, 824.1, 430.5, 2.2, 0.55, 827.4, 434.9, 2.2, 0.26, 830.4, 437, 2.2, 0.33, 833.7, 438.7, 2.8, 0.23], [830.1, 377.5, 1.5, 0.29, 829.6, 375.6, 2.2, 0.49, 830.9, 371.5, 1.5, 0.24, 833.3, 366.8, 2, 0.7, 835.8, 364, 1.8, 0.53, 838.9, 361.8, 2.2, 0.33, 843.1, 359.1, 1.8, 0.35, 843.9, 359.1, 2, 0.27], [839.5, 461.1, 2.8, 0.24, 839.1, 460.3, 2.2, 0.23, 838.9, 457.5, 2.2, 0.19, 842.5, 452.5, 2, 0.24, 843.8, 450.1, 1.8, 0.32, 844.1, 443.6, 1.8, 0.47, 842.1, 440.1, 2.2, 0.47, 838.4, 436.6, 1.8, 0.54, 835.2, 432.7, 2, 0.8, 833.8, 429.8, 2.2, 0.86, 834.1, 428, 2, 0.79, 834.9, 426.1, 2, 0.89, 837.4, 423, 2.2, 0.79, 840.6, 420.6, 2, 0.79, 843.1, 418.9, 1.8, 0.62, 847.2, 415.8, 1.5, 0.22, 851.5, 413, 1.5, 0.15, 854.6, 409.7, 1.8, 0.36, 857, 406.1, 2, 0.66, 858.2, 403.6, 2.2, 0.66, 858.6, 398.4, 2.2, 0.2, 857.4, 394.6, 1.8, 0.28, 856.7, 393.5, 2, 0.26, 856.1, 392.9, 2.2, 0.18]] };

  // ../../src/shots/s17/steam.js
  var KEYS2 = Object.keys(STEAM).map(Number).sort((a, b) => a - b);
  function strandsAt(tick) {
    let k = KEYS2[0];
    for (const x of KEYS2) if (x <= tick + 1e-6) k = x;
    return STEAM[k.toFixed(2)] || [];
  }
  var grey3 = (v) => {
    const c = Math.round(Math.max(0, Math.min(1, v)) * 255);
    return `rgb(${c},${c},${c})`;
  };
  var BOX = [795, 325, 905, 470];
  var SCR3 = null;
  function drawSteam(ctx, tick) {
    const S = strandsAt(tick);
    const m = ctx.getTransform(), k = Math.hypot(m.a, m.b);
    const pad = 3, [bx0, by0, bx1, by1] = BOX;
    const dx = Math.floor(m.a * (bx0 - pad) + m.e), dy = Math.floor(m.d * (by0 - pad) + m.f);
    const w = Math.ceil((bx1 - bx0 + 2 * pad) * k) + 2, h = Math.ceil((by1 - by0 + 2 * pad) * k) + 2;
    if (!SCR3) SCR3 = document.createElement("canvas");
    if (SCR3.width !== w || SCR3.height !== h) {
      SCR3.width = w;
      SCR3.height = h;
    }
    const g = SCR3.getContext("2d", { willReadFrequently: true });
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, w, h);
    g.setTransform(m.a, m.b, m.c, m.d, m.e - dx, m.f - dy);
    g.lineCap = "round";
    g.lineJoin = "round";
    for (const st of S) {
      const n = st.length / 4;
      for (let i = 0; i + 1 < n; i++) {
        const a = i * 4, b = a + 4;
        const lw = 0.5 * (st[a + 2] + st[b + 2]), v = 0.5 * (st[a + 3] + st[b + 3]);
        if (v < 0.04) continue;
        g.strokeStyle = grey3(v);
        g.lineWidth = Math.max(0.6, lw * 0.85);
        g.beginPath();
        g.moveTo(st[a], st[a + 1]);
        g.lineTo(st[b], st[b + 1]);
        g.stroke();
      }
    }
    blurCanvas(SCR3, 0.45 * k);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(SCR3, dx, dy);
    ctx.restore();
  }

  // ../../src/shots/s17.js
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
  var HEAD_DX = [[52.8, -0.25], [52.84, -1], [52.88, -2], [52.92, -2.5], [52.96, -3], [53, -3.5], [53.08, -3.6], [53.12, -3.75]];
  var EYE_DX = [[52.8, -0.55], [52.84, -0.9], [52.88, -1.05], [52.92, -1.1], [52.96, -1.2]];
  var stepAt = (T, t) => {
    let v = 0;
    for (const [a, d] of T) if (t >= a - 1e-6) v = d;
    return v;
  };
  var HEAD_A = [[47.76, 0], [47.8, 0.07], [47.84, 0.25], [47.88, 0.43], [47.92, 0.59], [47.96, 0.69], [48, 0.8], [48.04, 0.87], [48.08, 0.93], [48.12, 0.96], [48.16, 1]];
  function ramp(T, t) {
    if (t <= T[0][0]) return T[0][1];
    for (let i = 1; i < T.length; i++) if (t <= T[i][0] + 1e-6) {
      const [a, va] = T[i - 1], [b, vb] = T[i];
      return va + (vb - va) * (t - a) / (b - a);
    }
    return 1;
  }
  function drawPageOpening(g, t, scale) {
    const ha = ramp(HEAD_A, t);
    if (ha >= 1) {
      drawS17Page(g, scale);
      return;
    }
    drawS17Page(g, scale, false);
    if (ha > 0) drawS17Page(g, scale, true, ha);
  }
  var SHUTTER = 5e-3;
  var NBLUR = 3;
  var CS = 2;
  var DBG = () => globalThis.__S17 || {};
  var COMP = null;
  function composite(t) {
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
    drawPageOpening(g, t, CS);
    drawSteam(g, drawTick(t));
    const p = DBG().noowl ? null : owlFrame(t);
    if (p) drawOwlS17(g, { ...p, res: CS });
    g.setTransform(1, 0, 0, 1, 0, 0);
    return COMP;
  }
  function openGain(local) {
    return local < 0 ? 1.02 + 0.06 * Math.min(1, -local / 0.04) : 1 + 0.02 * Math.max(0, 1 - local / 0.16);
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
        const comp = composite(t);
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
        const gain = openGain(local);
        if (gain > 1.001) {
          dst.save();
          dst.setTransform(1, 0, 0, 1, 0, 0);
          dst.globalCompositeOperation = "lighter";
          dst.globalAlpha = gain - 1;
          dst.drawImage(dst.canvas, 0, 0);
          dst.restore();
        }
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
      ctx.save();
      ctx.translate(FX, FY);
      ctx.scale(z, z);
      ctx.translate(-FX, -FY);
      ctx.imageSmoothingQuality = "high";
      drawS17Page(ctx, 1);
      drawSteam(ctx, drawTick(t));
      const hx = stepAt(HEAD_DX, t);
      if (hx) ctx.drawImage(headPatch(hx, stepAt(EYE_DX, t)), HEAD_BOX[0], HEAD_BOX[1]);
      ctx.restore();
      const p = DBG().noowl ? null : owlFrame(t);
      if (p) {
        const q = { ...p, x: FX + z * (p.x - FX), y: FY + z * (p.y - FY), s: p.s * z };
        if (p.blur) q.blur = [p.blur[0] * z, p.blur[1] * z];
        drawOwlS17(ctx, q);
      }
    },
    release() {
      releaseS17Page();
      if (COMP) {
        COMP.width = COMP.height = 0;
        COMP = null;
      }
    }
  };

  // lab2.js
  (async () => {
    await Promise.all(["900 100px Archivo", "400 20px Geist", "300 20px Geist", "500 20px 'Geist Mono'"].map((f) => document.fonts.load(f)));
    await document.fonts.ready;
    const L = window.LAB, W = 2206, H = 946;
    globalThis.__S17 = L.dbg || {};
    const paint = document.createElement("canvas");
    paint.width = W;
    paint.height = H;
    const g = paint.getContext("2d");
    const out = document.createElement("canvas");
    out.width = W;
    out.height = H;
    const grade = createPost(out);
    const [x0, y0, x1, y1] = L.crop;
    const sheet = document.getElementById("c");
    const tw = x1 - x0, th = y1 - y0;
    sheet.width = tw;
    sheet.height = th * L.times.length;
    const sg = sheet.getContext("2d");
    const times = [];
    for (let i = 0; i < L.times.length; i++) {
      const t = L.times[i];
      const a = performance.now();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1;
      g.fillStyle = "#000";
      g.fillRect(0, 0, W, H);
      g.save();
      try {
        shot.draw(g, t - 47.84, t);
      } catch (e) {
        g.restore();
        g.save();
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.fillStyle = "#f00";
        g.font = "30px sans-serif";
        g.fillText(String(e && e.stack || e).slice(0, 160), 20, 100);
        console.error(e);
      }
      g.restore();
      if (L.grade !== false) grade(paint, t, { fade: 1, grain: L.grain ?? void 0 });
      times.push(Math.round(performance.now() - a));
      await new Promise((r) => setTimeout(r, 30));
      sg.drawImage(L.grade !== false ? out : paint, x0, y0, tw, th, 0, i * th, tw, th);
    }
    document.title = "ms " + times.join(",");
  })();
})();
