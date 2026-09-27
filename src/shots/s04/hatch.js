// s04: pen hatching over the traced keys' mid-tones (fix2 rewrite of fix1's generator).
// The source builds the lit figure's shading with fine, low-contrast pen strokes laid in bundles that follow the form
// (the hoodie's folds, the shading round his eyes and down the sides of his face). fix1 drew them from each key's own
// measured texture field at full ink-to-ground contrast: the review found that too strong (mid-tone fine texture
// 1.5-2.5x the source's), mechanical (cross-hatch cells, a 'brick wall' on the beanie) and boiling (every key cut the
// pattern afresh). fix2:
//   - ONE field for the whole shot: the stroke direction is the hold key's (20.56, K2056.dv), and the pattern is laid
//     in the hold frame's coordinates (the anchor below, chained by the measured frame-to-frame motion), so bundle
//     directions, phases and weights stay fixed on the figure from key to key;
//   - WHERE: hand-placed regions in the hold frame's coordinates (face, hoodie, beanie; the owl left clear), and only in
//     mid-tones of the key's value study;
//   - HOW DARK: low contrast, lines about 25 paint levels under the local value and the gaps a little over it (the
//     mean value is kept), 3 px apart on the face, 4.5 px on the hoodie; one family only (no crossings);
//   - the beanie keeps its traced knit ribs: only a fine diagonal hatch in its shadowed parts;
//   - WHEN: per key (s04.js hatchWeight): off where the camera moves faster than ~20 px per frame (the glide's pan
//     19.12-19.32 and the swing from 21.56), where the source itself is soft and motion-blurred.
// One WebGL2 pass over the key canvas; the result (value + alpha = hatch weight) is laid over the study.
const VS = `#version 300 es
in vec2 pos; out vec2 q;
uniform vec2 size;
void main(){ q = (pos * 0.5 + 0.5) * size; gl_Position = vec4(pos, 0.0, 1.0); }`;
const FS = `#version 300 es
precision highp float;
in vec2 q; out vec4 o;
uniform sampler2D tone;   // the value study (key canvas)
uniform sampler2D field;  // the hold key's direction field (nx x ny, frame px of 20.56): r,g = doubled angle
uniform sampler2D region; // hand-placed regions in 20.56 coordinates: r = weight, g = spacing code, b = beanie
uniform sampler2D anchor; // anx x any (RG32F): the drawing's content offset at each 'aS' px node
uniform vec2 an; uniform float aS;
uniform vec4 rgeo;        // region texture: origin x, y and size x, y (frame px)
uniform vec4 xr;          // a rectangle (frame px of the key) kept clear (x0, y0, x1, y1)
uniform vec2 size, fn;
uniform float gstep, M, cell, seed, D, lw, pOn, wob, wvar, jit, wk, lo0, lo1, hi0, hi1, hH0, hH1, bHi0, bHi1, bAng;
float h1(vec2 p){ p = fract(p * vec2(0.1031, 0.1030) + seed * 0.0137); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
float h2(vec2 p, float k){ return h1(p + vec2(k * 17.13, k * 5.71)); }
vec4 fieldAt(vec2 p){ vec2 uv = (p / gstep + 0.5) / fn; return texture(field, uv); }
vec4 regionAt(vec2 p){ return texture(region, (p - rgeo.xy) / rgeo.zw); }
// ink (0..1) of one bundle at pattern point p: cell c (centre cc), direction th, line spacing s0
float bundle(vec2 p, vec2 c, vec2 cc, float th, float s0){
  vec2 t = vec2(cos(th), sin(th)), n = vec2(-t.y, t.x);
  vec2 d = p - cc;
  float s = dot(d, t);
  float u = dot(d, n) / s0 + h2(c, 4.0) + wob * sin(s * 0.045 + 6.2832 * h2(c, 5.0));
  float k = floor(u), f = abs(fract(u) - 0.5) * s0;
  // each line is a chain of strokes of its own length and phase, tapered over 5 px at both ends
  float S = cell * (0.7 + 0.6 * h2(c + k, 6.0)), r = fract(s / S + h2(c + k, 7.0));
  float e = clamp(min(r, 1.0 - r) * S / 5.0, 0.0, 1.0);
  float on = step(h2(c + k, 9.0), pOn);
  float w = lw * (1.0 - wvar + 2.0 * wvar * h2(c + k, 8.0)) * sqrt(e) * on;
  return min(w, 1.0) * clamp(max(w, 1.0) * 0.5 + 0.5 - f, 0.0, 1.0);
}
vec2 anchorAt(vec2 p){
  vec2 f = clamp(p / aS, vec2(0.0), an - 1.001); ivec2 i = ivec2(floor(f)); vec2 u = f - vec2(i);
  vec2 a = texelFetch(anchor, i, 0).rg, b = texelFetch(anchor, i + ivec2(1, 0), 0).rg;
  vec2 c = texelFetch(anchor, i + ivec2(0, 1), 0).rg, d = texelFetch(anchor, i + ivec2(1, 1), 0).rg;
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
void main(){
  vec2 px = vec2(q.x, size.y - q.y);           // key canvas pixel (y down)
  vec2 pf = px - M;                             // frame px of the key
  vec2 p = pf + anchorAt(pf);                   // the hold frame's coordinates (the pattern's plane)
  vec4 R = regionAt(p);
  float wt = R.r * wk;
  if (pf.x > xr.x && pf.x < xr.z && pf.y > xr.y && pf.y < xr.w) wt = 0.0;
  float v = texture(tone, px / size).r;
  float hood = smoothstep(0.4, 0.6, R.g);        // the hoodie's lit cloth is hatched up to near white
  wt *= smoothstep(lo0, lo1, v) * (1.0 - smoothstep(mix(hi0, hH0, hood), mix(hi1, hH1, hood), v));
  wt *= 1.0 - R.b * smoothstep(bHi0, bHi1, v);   // beanie: its shadowed parts only
  if (wt < 0.01) { o = vec4(0.0); return; }
  float s0 = 3.0 + 2.0 * R.g;                    // line spacing: 3 px (face) .. 5 px
  // soft Voronoi of jittered cells: the nearest two bundles, blended across their border
  vec2 g = floor(p / cell);
  float d1 = 1e9, d2 = 1e9; vec2 c1c = vec2(0.0), c1p = vec2(0.0), c2c = vec2(0.0), c2p = vec2(0.0);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 c = g + vec2(float(i), float(j));
    vec2 cc = (c + 0.5 + 0.7 * (vec2(h2(c, 1.0), h2(c, 2.0)) - 0.5)) * cell;
    float dd = length(p - cc);
    if (dd < d1) { d2 = d1; c2c = c1c; c2p = c1p; d1 = dd; c1c = c; c1p = cc; }
    else if (dd < d2) { d2 = dd; c2c = c; c2p = cc; }
  }
  float inkA = 0.0, inkB = 0.0;
  for (int b = 0; b < 2; b++) {
    vec2 c = b == 0 ? c1c : c2c, cc = b == 0 ? c1p : c2p;
    vec4 Fc = fieldAt(cc);
    float th = 0.5 * atan(Fc.g * 2.0 - 1.0, Fc.r * 2.0 - 1.0);
    th = mix(th, bAng, step(0.5, regionAt(cc).b)) + jit * (h2(c, 11.0) - 0.5);
    float a = bundle(p, c, cc, th, s0);
    if (b == 0) inkA = a; else inkB = a;
  }
  float wb = 0.5 + 0.5 * smoothstep(0.0, 10.0, d2 - d1);
  float ink = inkA * wb + inkB * (1.0 - wb);
  float c0 = min(1.0, lw / s0) * pOn * 0.85;      // the pattern's mean ink: the value's mean is kept
  float val = clamp(v - D * (ink - c0), 0.0, 1.0);
  o = vec4(vec3(val) * wt, wt);   // premultiplied
}`;

export class Hatcher {
  constructor() {
    const c = document.createElement("canvas"); c.width = 16; c.height = 16;
    const gl = c.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true });
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.bindAttribLocation(pr, 0, "pos"); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    this.c = c; this.gl = gl; this.pr = pr;
    this.buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.tTone = gl.createTexture(); this.tField = gl.createTexture(); this.tRegion = gl.createTexture(); this.tAnchor = gl.createTexture();
    this.fieldSet = null; this.regionSet = null;
  }
  // tone: the value-study canvas (key size); field: the hold key's direction field {nx, ny, step, data}; region:
  // {canvas, geo: [x0, y0, w, h]}; anchor: this key's anchor; opts: see defaults
  run(tone, field, region, M, anchor, opts = {}) {
    const gl = this.gl, c = this.c;
    if (c.width !== tone.width || c.height !== tone.height) { c.width = tone.width; c.height = tone.height; }
    gl.viewport(0, 0, c.width, c.height);
    gl.useProgram(this.pr);
    const bind = (t, unit, linear) => {
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
      const f = linear ? gl.LINEAR : gl.NEAREST;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    };
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    bind(this.tTone, 0, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tone);
    bind(this.tField, 1, true);
    if (this.fieldSet !== field) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, field.nx, field.ny, 0, gl.RGBA, gl.UNSIGNED_BYTE, field.data); this.fieldSet = field; }
    bind(this.tRegion, 2, true);
    if (this.regionSet !== region) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, region.canvas); this.regionSet = region; }
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, this.tAnchor);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG32F, anchor.nx, anchor.ny, 0, gl.RG, gl.FLOAT, anchor.data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const U = (n) => gl.getUniformLocation(this.pr, n);
    gl.uniform1i(U("tone"), 0); gl.uniform1i(U("field"), 1); gl.uniform1i(U("region"), 2); gl.uniform1i(U("anchor"), 3);
    gl.uniform2f(U("an"), anchor.nx, anchor.ny); gl.uniform1f(U("aS"), anchor.S);
    gl.uniform4f(U("rgeo"), ...region.geo);
    gl.uniform2f(U("size"), c.width, c.height); gl.uniform2f(U("fn"), field.nx, field.ny);
    gl.uniform1f(U("gstep"), field.step); gl.uniform1f(U("M"), M);
    const o = { cell: 56, seed: 7, D: 60, lw: 1.1, pOn: 0.8, wob: 0.15, wvar: 0.2, jit: 0.08, wk: 1, lo0: 62, lo1: 100, hi0: 196, hi1: 226, hH0: 232, hH1: 250, bHi0: 105, bHi1: 140, bAng: -0.95, xr: [0, 0, 0, 0], ...opts };
    for (const k of ["cell", "seed", "lw", "pOn", "wob", "wvar", "jit", "wk", "bAng"]) gl.uniform1f(U(k), o[k]);
    for (const k of ["D", "lo0", "lo1", "hi0", "hi1", "hH0", "hH1", "bHi0", "bHi1"]) gl.uniform1f(U(k), o[k] / 255);
    gl.uniform4f(U("xr"), ...o.xr);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disable(gl.BLEND); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return c;
  }
}
let HATCHER = null;
export const hatcher = () => (HATCHER ||= new Hatcher());

// the hold key's measured stroke direction (dv: the structure-tensor direction of the 20.56 frame's fine texture, 24 px
// grid) as texture data, the doubled-angle vectors smoothed over the neighbouring nodes (one direction per bundle)
let HOLD = null;
export function holdField(K, d1) {
  if (HOLD && HOLD.K === K) return HOLD.F;
  const [nx, ny, step] = K.dgrid, cx = new Float32Array(nx * ny), sx = new Float32Array(nx * ny);
  for (let k = 0; k < nx * ny; k++) { const th = (d1(K.dv, k) / 90) * Math.PI; cx[k] = Math.cos(2 * th); sx[k] = Math.sin(2 * th); }
  const data = new Uint8Array(nx * ny * 4);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    let a = 0, b = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const ii = Math.max(0, Math.min(nx - 1, i + di)), jj = Math.max(0, Math.min(ny - 1, j + dj)), w = di || dj ? (di && dj ? 0.5 : 1) : 2;
      a += w * cx[jj * nx + ii]; b += w * sx[jj * nx + ii];
    }
    const L = Math.hypot(a, b) || 1, k = 4 * (j * nx + i);
    data[k] = Math.round((a / L * 0.5 + 0.5) * 255); data[k + 1] = Math.round((b / L * 0.5 + 0.5) * 255); data[k + 3] = 255;
  }
  HOLD = { K, F: { nx, ny, step, data } };
  return HOLD.F;
}

// The regions, drawn by hand on the hold frame (20.56, frame px; checked against its source frame on a grid):
// weight (r), spacing code (g: 0 -> 3 px, 0.75 -> 4.5 px) and the beanie (b). Painted at 1/4 scale and softened.
const REG = {
  face: [[650, 330], [700, 230], [780, 160], [880, 110], [1000, 95], [1150, 105], [1260, 150], [1330, 230], [1360, 330], [1350, 450], [1320, 560], [1290, 660], [1240, 750], [1150, 810], [1000, 835], [880, 810], [790, 740], [730, 650], [690, 550], [655, 440]],
  hoodL: [[-40, 990], [-40, 650], [80, 575], [200, 515], [330, 475], [470, 450], [560, 440], [615, 470], [655, 560], [705, 650], [765, 735], [805, 810], [815, 990]],
  hoodR: [[1245, 990], [1255, 760], [1295, 650], [1335, 560], [1380, 515], [1440, 535], [1520, 575], [1640, 600], [1760, 615], [1840, 700], [1890, 800], [1960, 990]],
  beanie: [[550, -40], [1510, -40], [1505, 290], [1445, 300], [1400, 200], [1350, 150], [1300, 125], [1200, 100], [1100, 84], [1000, 82], [900, 86], [800, 100], [700, 125], [650, 150], [612, 190], [605, 300], [565, 335]],
  // kept clear: the owl on his shoulder (with its headphones and feet), and the laptop's lid
  owl: [[1430, 300], [1445, 175], [1515, 115], [1645, 115], [1705, 165], [1765, 185], [1810, 300], [1840, 420], [1860, 520], [1815, 610], [1700, 620], [1575, 620], [1460, 600], [1425, 500]],
  lid: [[220, 812], [1890, 812], [1890, 990], [220, 990]],
};
let REGION = null;
export function hatchRegion(W, H) {
  if (REGION) return REGION;
  const pad = 240, s = 0.25, cw = Math.round((W + 2 * pad) * s), ch = Math.round((H + 2 * pad) * s);
  const c = document.createElement("canvas"); c.width = cw; c.height = ch;
  const g = c.getContext("2d", { willReadFrequently: true });
  const poly = (P) => { g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo((x + pad) * s, (y + pad) * s) : g.moveTo((x + pad) * s, (y + pad) * s))); g.closePath(); };
  const layer = (fn) => { const l = document.createElement("canvas"); l.width = cw; l.height = ch; const lg = l.getContext("2d"); fn(lg); return l; };
  // each channel painted on its own, then softened (a 16 px soft edge at full scale)
  const paint = (items) => layer((lg) => { lg.fillStyle = "#000"; lg.fillRect(0, 0, cw, ch);
    for (const [P, v] of items) { lg.beginPath(); P.forEach(([x, y], i) => (i ? lg.lineTo((x + pad) * s, (y + pad) * s) : lg.moveTo((x + pad) * s, (y + pad) * s))); lg.closePath(); lg.fillStyle = `rgb(${v},${v},${v})`; lg.fill(); } });
  const clear = [[REG.owl, 0], [REG.lid, 0]];
  const Wt = paint([[REG.face, 255], [REG.hoodL, 255], [REG.hoodR, 255], [REG.beanie, 150], ...clear]);
  const Sp = paint([[REG.hoodL, 191], [REG.hoodR, 191], [REG.beanie, 64], [REG.face, 0]]);
  const Bn = paint([[REG.beanie, 255], [REG.face, 0]]);
  const soft = (l) => layer((lg) => { lg.filter = "blur(4px)"; lg.drawImage(l, 0, 0); lg.filter = "none"; });
  const [a, b, d] = [soft(Wt), soft(Sp), soft(Bn)].map((l) => l.getContext("2d").getImageData(0, 0, cw, ch).data);
  const id = g.createImageData(cw, ch);
  for (let k = 0; k < cw * ch * 4; k += 4) { id.data[k] = a[k]; id.data[k + 1] = b[k]; id.data[k + 2] = d[k]; id.data[k + 3] = 255; }
  g.putImageData(id, 0, 0);
  void poly;
  REGION = { canvas: c, geo: [-pad, -pad, W + 2 * pad, H + 2 * pad] };
  return REGION;
}

// The hatching's anchor: the pattern is generated in the drawing's own coordinates, so it moves with the figure and
// the room instead of sliding under them as the camera arcs (each swing key is traced on its own frame). Chained from
// the hold frame 514 (20.56: offset 0) outward through the measured frame-to-frame motion (s04/hatchflow.js):
// O_f(p) = O_g(p + d_f(p)) + d_f(p), g the neighbour nearer 514. Computed once, for all frames, in a fixed order.
let ANCH = null;
export function anchorFor(fi, HF, d2dec) {
  if (!ANCH) {
    const { S, nx, ny } = HF, N = nx * ny;
    const dec = (s) => { const f = new Float32Array(2 * N); let i = 0;
      for (let plane = 0; plane < 2; plane++) { let v = 0; for (let k = 0; k < N; k++) { const c = d2dec.d1(s, i); if (c < 81) { v += c - 40; i += 1; } else { v = d2dec.d2(s, i + 1) - 4000; i += 3; } f[2 * k + plane] = v / 4; } }
      return f; };
    const samp = (O, x, y) => {
      let fx = Math.max(0, Math.min(nx - 1.001, x / S)), fy = Math.max(0, Math.min(ny - 1.001, y / S));
      const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, k = j * nx + i;
      const g = (o) => (O[2 * k + o] * (1 - u) + O[2 * (k + 1) + o] * u) * (1 - v) + (O[2 * (k + nx) + o] * (1 - u) + O[2 * (k + nx + 1) + o] * u) * v;
      return [g(0), g(1)];
    };
    ANCH = { 514: new Float32Array(2 * N) };
    const step = (f, g) => {
      const d = HF.f[String(f)] ? dec(HF.f[String(f)]) : new Float32Array(2 * N), Og = ANCH[g], O = new Float32Array(2 * N);
      for (let j = 0, k = 0; j < ny; j++) for (let i = 0; i < nx; i++, k++) {
        const x = i * S, y = j * S, dx = d[2 * k], dy = d[2 * k + 1], o = samp(Og, x + dx, y + dy);
        O[2 * k] = o[0] + dx; O[2 * k + 1] = o[1] + dy;
      }
      ANCH[f] = O;
    };
    for (let f = 515; f <= 580; f++) step(f, f - 1);
    for (let f = 513; f >= 474; f--) step(f, f + 1);
    ANCH.meta = { S, nx, ny };
  }
  const O = ANCH[Math.max(474, Math.min(580, fi))];
  return { S: ANCH.meta.S, nx: ANCH.meta.nx, ny: ANCH.meta.ny, data: O };
}


// the drawing's anchored coordinate of frame point (x, y) at frame fi (for tests in those coordinates)
export function contentMap(fi, HF, d2dec) {
  const { S, nx, ny, data } = anchorFor(fi, HF, d2dec);
  return (x, y) => {
    const fx = Math.max(0, Math.min(nx - 1.001, x / S)), fy = Math.max(0, Math.min(ny - 1.001, y / S));
    const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, k = j * nx + i;
    const g = (o) => (data[2 * k + o] * (1 - u) + data[2 * (k + 1) + o] * u) * (1 - v) + (data[2 * (k + nx) + o] * (1 - u) + data[2 * (k + nx + 1) + o] * u) * v;
    return [x + g(0), y + g(1)];
  };
}
