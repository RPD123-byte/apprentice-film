// s14 layer compositor (WebGL2). The room is painted as flat layers in the coordinates of the 40.00 s source frame
// ("R40"). Each layer carries an inverse-depth plane w(u,v) = a*u + b*v + c (w = 1 is the depth of the keyboard).
// A camera that dollies forward by d (same depth units) toward the focus of expansion C maps a layer point p to
//     p' = C + (p - C) / (1 - d*w(p))        (a homography, since w is affine in p)
// which the vertex shader does in homogeneous coordinates, so the texture is perspective-correct and points that
// pass behind the camera are clipped by the GPU. After the dolly a 2D similarity (s, tx, ty) can be applied (the
// long-lens zoom before 40.0 s). The final pass multiplies by a soft elliptical mask (the lit gap in the dark).
//
// fix pass 1 (review 1: "the traced lines become thick marker scribbles as the dolly magnifies the plates"):
//  - a layer no longer carries a baked picture. It carries its value study, stroke directions, contour overlay and
//    occlusion (s14/paint.js packLayer), and the charcoal finish (hatching, dry-brush marks, scratches) is computed
//    here per screen pixel in the layer's own coordinates. Those line patterns are octave-blended by the local
//    magnification, so they stick to the surfaces but keep a fine screen pitch as the camera closes in (the source's
//    detail does not grow with the dolly). Mottling and tone stay on the surface.
//  - the floor's print halftone is a screen-space dot (5.6 px, 45 degrees), not a texture that magnifies.
//  - every ink line (the traced strokes, contours, grain, hatching) is a centre line re-stroked each frame through
//    the layer's mapping: its screen width grows with sqrt(magnification) and is capped (~3.5 px); solid things
//    (cables) scale with the surface.
const MAP = `
uniform vec3 plane;    // a b c
uniform vec2 kk;       // depth factors for x and y motion (constant-depth layers only; 1,1 = rigid)
uniform float d;
uniform vec2 C;
uniform vec3 sim;      // s tx ty
uniform vec2 res;
vec4 mapH(vec2 p){
  float w = plane.x * p.x + plane.y * p.y + plane.z;
  if (abs(kk.x - kk.y) > 1e-4) {
    // a flat layer square to the lens whose sideways parallax differs from its vertical one (the source's desk):
    // scale about C separately in x and y (an affine map, exact for a constant-depth layer)
    vec2 S = vec2(1.0 / max(0.02, 1.0 - d * w * kk.x), 1.0 / max(0.02, 1.0 - d * w * kk.y));
    vec2 X = sim.x * (C + (p - C) * S) + sim.yz;
    return vec4(2.0 * X.x / res.x - 1.0, 1.0 - 2.0 * X.y / res.y, 0.0, 1.0);
  }
  float Wh = 1.0 - d * w;
  vec2 X = p - d * w * C;
  X = sim.x * X + sim.yz * Wh;
  return vec4(2.0 * X.x / res.x - Wh, Wh - 2.0 * X.y / res.y, 0.0, Wh);
}
vec2 scr(vec4 c){ return vec2((c.x / c.w + 1.0) * 0.5 * res.x, (1.0 - c.y / c.w) * 0.5 * res.y); }
`;
const VS = `#version 300 es
in vec2 qv;
uniform vec4 rect;     // x0 y0 x1 y1 (R40 px) of this slice
uniform vec4 uvr;      // the slice's texture sub-rectangle (a layer can be drawn in vertical slices so a depth
                       // that varies across it maps piecewise-correctly, e.g. the receding desk plank)
${MAP}
out vec2 uv; out vec2 q;
void main(){
  vec2 p = mix(rect.xy, rect.zw, qv);
  uv = mix(uvr.xy, uvr.zw, qv);
  q = p;
  gl_Position = mapH(p);
}`;
const NOISE = `
float h21(vec2 p){ p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }
float vn(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y);
}
float fbm(vec2 p){ return (0.5 * vn(p) + 0.3 * vn(p * 2.07 + 5.3) + 0.2 * vn(p * 4.3 + 1.7)); }
`;
// the charcoal finish (was s14/paint.js's bake pass): value tone, cloudy mottling, dry-brush drift and marks,
// scratches, white-line hatching in the shadows; line patterns octave-blended by the magnification m
const FS = `#version 300 es
precision highp float;
in vec2 uv; in vec2 q; out vec4 o;
uniform sampler2D tA, tB, tI;
uniform ivec2 tsz;
uniform float gid[256];   // per-fill tone gain for this frame (fix pass 1: fitted per fill over the dolly)
uniform float lg, seed, contrast, hatchK, streakK, mottleK, occK, scratchK, lift, fadeLo, dotK;
${NOISE}
// a family of white lines (engraving): width follows w (0 = none, 1 = solid white)
float family(vec2 q, float ang, float sp, float w){
  vec2 n = vec2(-sin(ang), cos(ang)), t = vec2(cos(ang), sin(ang));
  float c = dot(q, n) / sp;
  c += (vn(q * 0.004 + seed) - 0.5) * 0.4 + (vn(q * 0.05 + seed * 1.7) - 0.5) * 0.18;
  float row = floor(c), rh = h21(vec2(row, seed));
  float brk = vn(vec2(dot(q, t) / (sp * (4.0 + rh * 5.0)) + rh * 40.0, row * 3.1));
  float ww = clamp(w * (0.8 + 0.4 * rh) + (brk - 0.5) * 0.7 * (1.0 - w) * min(1.0, w * 3.0), 0.0, 1.0);
  float f = abs(fract(c) - 0.5) * 2.0;
  float aa = max(fwidth(c) * 1.8, 0.03);
  return (1.0 - smoothstep(ww - aa, ww + aa, f)) * smoothstep(0.0, 0.06, ww);
}
float hatchAt(vec2 q, float style, float ang, float sp, float v){
  if (style == 1.0) {
    // shadow cross-hatch: a main family along the surface and a sparser, broken one across it
    float cv = 1.0 - sqrt(max(0.0, 1.0 - v));
    return max(family(q, ang + 0.2, sp, cv), family(q, ang + 1.57, sp * 1.35, cv * 0.75) * step(0.45, vn(q / (sp * 6.0) + seed)));
  }
  return family(q, ang, sp, v);
}
void main(){
  vec4 A = texture(tA, uv);
  float cov = A.a;
  if (cov < 0.003) discard;
  vec4 B = texture(tB, uv);
  ivec2 ti = clamp(ivec2(uv * vec2(tsz)), ivec2(0), tsz - ivec2(1));
  vec4 N = texelFetch(tA, ti, 0);
  float v = A.r / max(cov, 1.0 / 255.0);
  int pk = int(N.b * 255.0 + 0.5);
  float style = float(pk / 32), spn = float(pk - (pk / 32) * 32) / 31.0;
  v = clamp((v - 0.5) * contrast + 0.5, 0.0, 1.0);
  float ang = N.g * 3.14159265;
  vec2 t = vec2(cos(ang), sin(ang)), n = vec2(-t.y, t.x);
  float a = dot(q, t), c = dot(q, n);
  // magnification (screen px per layer px) and the octave pair for the line patterns
  vec2 qx = dFdx(q), qy = dFdy(q);
  float m = inversesqrt(max(1e-8, abs(qx.x * qy.y - qx.y * qy.x)));
  float lv = log2(max(m, 1.0)), o0 = floor(lv), f = lv - o0;
  float k0 = exp2(o0), k1 = k0 * 2.0;
  float fade = smoothstep(fadeLo, fadeLo + 0.3, m);     // minified (the gap view): the pattern averages out
  float bell = clamp(4.0 * v * (1.0 - v), 0.0, 1.0);
  // charcoal gathers along the contours and into the corners of every shape
  float occl = occK * B.b + occK * 0.6 * (1.0 - B.a);
  v *= 1.0 - clamp(occl, 0.0, 0.75);
  // cloudy mottling: soft blotches at two scales (the source's cardboard and walls are clouded, never striped)
  float mo = 0.65 * (fbm(q / 26.0 + seed) - 0.5) + 0.35 * (vn(q / 9.0 + seed * 2.3) - 0.5);
  v += mo * mottleK * (0.25 + bell);
  // dry-brush: a broad drift along the grain plus sparse long marks (octave-blended across the grain)
  float drift = vn(vec2(a / 200.0, c / 40.0) + seed * 1.3) - 0.5;
  float mk0 = vn(vec2(a / 150.0, c * k0 / 4.5) + seed * 3.1), mk1 = vn(vec2(a / 150.0, c * k1 / 4.5) + seed * 3.1);
  float mw = 0.4 + 0.6 * vn(vec2(a / 45.0, c / 9.0) + seed);
  float marks = mix(smoothstep(0.74, 0.92, mk0), smoothstep(0.74, 0.92, mk1), f) * mw * fade;
  float sk = style == 0.0 ? 1.5 : (style == 1.0 ? 0.8 : 1.0);
  v += drift * streakK * sk * (0.3 + bell);
  v -= marks * streakK * sk * 0.7 * (0.15 + bell);
  if (style == 0.0) {
    float l0 = smoothstep(0.66, 0.9, vn(vec2(a / 90.0, c * k0 / 2.6) + seed * 7.7)), l1 = smoothstep(0.66, 0.9, vn(vec2(a / 90.0, c * k1 / 2.6) + seed * 7.7));
    v += mix(l0, l1, f) * fade * streakK * 0.8 * (0.2 + bell);
  }
  // long dark scratches of the dry brush
  float s0 = smoothstep(0.8, 0.92, vn(vec2(a / 150.0, c * k0 / 1.6) + seed * 5.0)), s1 = smoothstep(0.8, 0.92, vn(vec2(a / 150.0, c * k1 / 1.6) + seed * 5.0));
  v *= 1.0 - scratchK * mix(s0, s1, f) * fade * smoothstep(0.06, 0.3, v);
  v = clamp(v * lift, 0.0, 1.0);
  float white = v;
  if (style == 1.0 || (style == 0.0 && v < 0.5)) {
    float sp = 4.2 * mix(0.55, 1.9, spn);
    float x0 = hatchAt(q * k0, style, ang, sp, v), x1 = hatchAt(q * k1, style, ang, sp, v);
    float xh = mix(x0, x1, f);
    float kh = (style == 1.0 ? hatchK : hatchK * 0.6 * smoothstep(0.5, 0.2, v)) * fade;
    white = mix(v, xh * min(1.0, v * 1.6 + 0.25), kh);
  }
  if (style == 4.0) {
    // the floor's print halftone, in screen space: a 45-degree round dot at 5.6 px (the source's stays that size
    // through the dolly), a small swing about the tone
    vec2 hr = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / 5.6;
    float dd = length(fract(hr) - 0.5);
    float dotk = 1.0 - smoothstep(0.36, 0.44, dd);
    white = v * (1.0 + dotK * (0.45 - dotk));
  }
  white *= gid[int(texelFetch(tI, ti, 0).r * 255.0 + 0.5)];
  vec3 col = vec3(0.949, 0.941, 0.918) * white;
  // the baked overlay (arcs, dots, small parts): premultiplied luma + alpha; the ink breaks up a little
  float ob = 0.82 + 0.36 * (vn(q / 3.0 + seed * 9.0) - 0.5);
  float oa = clamp(B.g * ob, 0.0, 1.0);
  col = mix(col, vec3(B.r / max(B.g, 1.0 / 255.0)), oa);
  o = vec4(col * lg * cov, cov);
}`;
// ink strokes: each vertex is a centre-line point p with its unit normal n (layer px), side +-1, width w (layer px;
// negative = a solid object that scales with the surface), luma, alpha
const VSS = `#version 300 es
in vec4 a0; in vec4 a1;
${MAP}
uniform vec4 rect;
uniform sampler2D tA;
uniform float wcap, wk, texFade;
out float vAc; out float vHw; out vec2 vCol; out float vOk;
void main(){
  vec2 p = a0.xy, n = a0.zw;
  float side = a1.x, w0 = abs(a1.y);
  vec4 c0 = mapH(p);
  vOk = c0.w > 0.04 ? 1.0 : 0.0;
  vec2 s0 = scr(c0), s1 = scr(mapH(p + n));
  float m = clamp(length(s1 - s0), 1e-3, 60.0);
  float ws = a1.y < 0.0 ? w0 * m : min(w0 * wk * sqrt(max(m, 1e-3)), max(w0 * wk * min(m, 1.0), wcap));
  float al = a1.w, lu = a1.z;
  // texture marks (short traced strokes): they were fine grain at 40.00 and must not grow into scribbles
  if (lu >= 2.0) { lu -= 2.0; al *= clamp((texFade - m) / (texFade - 1.0), 0.0, 1.0); }
  if (ws < 1.0) { al *= max(ws, 0.0); ws = 1.0; }
  float E = ws * 0.5 + 1.0;
  gl_Position = mapH(p + n * side * E / m);
  vAc = side * E; vHw = ws * 0.5;
  vec2 u = (p - rect.xy) / (rect.zw - rect.xy);
  float cv = textureLod(tA, u, 0.0).a;
  vCol = vec2(lu, al * smoothstep(0.05, 0.4, cv));
}`;
const FSS = `#version 300 es
precision highp float;
in float vAc; in float vHw; in vec2 vCol; in float vOk;
uniform float lg;
out vec4 o;
void main(){
  if (vOk < 0.999) discard;
  float k = clamp(vHw + 0.5 - abs(vAc), 0.0, 1.0) * vCol.y;
  o = vec4(vec3(vCol.x * lg * k), k);
}`;
// full-screen pass: copy an accumulation texture with a weight (motion blur) or apply the mask (final)
const VS2 = `#version 300 es
in vec2 qv; out vec2 uv;
void main(){ uv = qv; gl_Position = vec4(qv * 2.0 - 1.0, 0.0, 1.0); }`;
const FS2 = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D tex; uniform float k; uniform vec2 res;
uniform vec4 mask;     // cx cy rx ry (frame px); rx <= 0 disables
uniform vec2 soft;     // inner, outer (in ellipse radii)
uniform float pw;      // superellipse exponent (3 = rounded rectangle, 2 = ellipse)
uniform float gain;
uniform float tilt;     // gain ramp across the gap (brighter toward the lit side)
uniform vec3 curve;     // highlight expansion: out = in^curve.x * curve.y (in 0..1), mixed by curve.z
uniform vec3 curve0;    // a first curve of the same form (the room's own, before the gap's)
uniform vec4 glow;      // an additive soft glow inside the mask: cx cy r (frame px), strength
void main(){
  vec4 c = texture(tex, uv) * k;
  if (glow.w > 0.0) {
    vec2 px = vec2(uv.x * res.x, (1.0 - uv.y) * res.y);
    vec2 e = (px - glow.xy) / vec2(glow.z * 0.75, glow.z);
    float r2 = dot(e, e);
    c.rgb += vec3(0.93) * glow.w * (exp(-r2 * 9.0) * 0.7 + exp(-r2 * 2.5) * 0.3);
  }
  if (mask.z > 0.0) {
    vec2 px = vec2(uv.x * res.x, (1.0 - uv.y) * res.y);
    vec2 e = abs(px - mask.xy) / mask.zw;
    float r = pow(pow(e.x, pw) + pow(e.y, pw), 1.0 / pw);   // superellipse (p = 3 rounded rectangle, 2 ellipse)
    float m = 1.0 - smoothstep(soft.x, soft.y, r);
    c.rgb *= m * gain * max(0.0, 1.0 + tilt * (px.x - mask.x) / mask.z);
  } else c.rgb *= gain;
  if (curve0.z > 0.0) c.rgb = mix(c.rgb, min(vec3(1.0), pow(max(c.rgb, 0.0), vec3(curve0.x)) * curve0.y), curve0.z);
  if (curve.z > 0.0) c.rgb = mix(c.rgb, min(vec3(1.0), pow(max(c.rgb, 0.0), vec3(curve.x)) * curve.y), curve.z);
  o = vec4(c.rgb, 1.0);
}`;

export function createCompositor(W, H) {
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const gl = cv.getContext("webgl2", { preserveDrawingBuffer: true, premultipliedAlpha: true, antialias: true, alpha: false });
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = (vs, fs, attrs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); attrs.forEach((a, i) => gl.bindAttribLocation(p, i, a)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
  const P1 = prog(VS, FS, ["qv"]), P2 = prog(VS2, FS2, ["qv"]), P3 = prog(VSS, FSS, ["a0", "a1"]);
  const uni = (p, names) => { const U = {}; for (const n of names) U[n] = gl.getUniformLocation(p, n); return U; };
  const MAPU = ["plane", "kk", "d", "C", "sim", "res", "rect"];
  const U1 = uni(P1, [...MAPU, "uvr", "tA", "tB", "tI", "gid", "tsz", "lg", "seed", "contrast", "hatchK", "streakK", "mottleK", "occK", "scratchK", "lift", "fadeLo", "dotK"]);
  const U2 = uni(P2, ["tex", "k", "res", "mask", "soft", "gain", "tilt", "pw", "curve", "curve0", "glow"]);
  const U3 = uni(P3, [...MAPU, "tA", "wcap", "wk", "lg", "texFade"]);
  const quadVAO = gl.createVertexArray(); gl.bindVertexArray(quadVAO);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  // two render targets: one sub-frame composite, one accumulator
  // (fix pass 1: the accumulator is half-float where the GPU can render to it: 14 sub-samples at 1/14 each rounded
  // to 8 bits per channel printed a colour cast into the smeared desk)
  const fbf = !!gl.getExtension("EXT_color_buffer_float") || !!gl.getExtension("EXT_color_buffer_half_float");
  const target = (hf = false) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    if (hf && fbf) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, W, H, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return { t, f };
  };
  const A = target(), B = target(true);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const ext = gl.getExtension("EXT_texture_filter_anisotropic");

  const texOf = (data, w, h) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    return t;
  };
  const texR8 = (data, w, h) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, w, h, 0, gl.RED, gl.UNSIGNED_BYTE, data || new Uint8Array(w * h));
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    return t;
  };
  // the recorded strokes of a layer -> one indexed triangle list (2 vertices per centre-line point)
  const strokeVAO = (vec) => {
    let nv = 0; for (const s of vec) nv += s.p.length;   // p holds x,y pairs: 2 vertices per point
    if (!nv) return null;
    const V = new Float32Array(nv * 8), I = [];
    let k = 0, base = 0;
    for (const s of vec) {
      const n = s.p.length / 2;
      for (let i = 0; i < n; i++) {
        const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
        let dx = s.p[2 * b] - s.p[2 * a], dy = s.p[2 * b + 1] - s.p[2 * a + 1];
        const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
        const w = s.k ? -Math.max(0.01, s.w[i]) : s.w[i];
        for (const side of [-1, 1]) { V.set([s.p[2 * i], s.p[2 * i + 1], -dy, dx, side, w, s.l, s.a], k); k += 8; }
        if (i < n - 1) { const v0 = base + 2 * i; I.push(v0, v0 + 1, v0 + 2, v0 + 1, v0 + 3, v0 + 2); }
      }
      base += 2 * n;
    }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, V, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 16);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(I), gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    return { vao, vb, ib, n: I.length };
  };

  const layers = [];
  // pk: s14/paint.js packLayer() output { A, B, w, h, vec }; rect in R40 px, plane [a,b,c(,kx,ky)]; fin: finish params
  function addLayer(pk, rect, plane, name = "", blurK = 1, slices = 1, fin = {}) {
    const tA = texOf(pk.A, pk.w, pk.h), tB = texOf(pk.B, pk.w, pk.h), tI = texR8(pk.I, pk.w, pk.h);
    layers.push({ tA, tB, tI, tw: pk.w, th: pk.h, rect, plane, name, blurK, slices, fin, sv: strokeVAO(pk.vec || []) });
  }
  const setMap = (U, L, d, C, sim) => {
    gl.uniform2f(U.res, W, H); gl.uniform2f(U.C, C[0], C[1]); gl.uniform1f(U.d, d);
    gl.uniform3f(U.sim, sim[0], sim[1], sim[2]);
    gl.uniform3f(U.plane, L.plane[0], L.plane[1], L.plane[2]);
    gl.uniform2f(U.kk, L.plane[3] ?? 1, L.plane[4] ?? 1);
  };

  // d0: the frame's sharp dolly position; each layer is drawn at d0 + (d - d0) * blurK, so near layers smear and
  // far ones stay crisp (the source blurs only the near desk and boxes)
  const ONES = new Float32Array(256).fill(1);
  function drawLayers(d, C, sim, d0 = d, Cmap = null, Gmap = null, Bmap = null, fadeLo = 0.5, ink = {}, Fmap = null, Dmap = null) {
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    for (const L of layers) {
      // a layer can move about its own focus of expansion (the near desk: the camera rises a little as it closes in)
      const Cl = (Cmap && Cmap[L.name]) || C;
      const lg = (Gmap && Gmap[L.name]) ?? 1;
      const dl = d0 + (d - d0) * ((Bmap && Bmap[L.name]) ?? L.blurK) + ((Dmap && Dmap[L.name]) ?? 0);
      const F = L.fin;
      gl.useProgram(P1);
      gl.bindVertexArray(quadVAO);
      setMap(U1, L, dl, Cl, sim);
      gl.uniform1f(U1.lg, lg);
      for (const k of ["seed", "contrast", "hatchK", "streakK", "mottleK", "occK", "scratchK", "lift"]) gl.uniform1f(U1[k], F[k] ?? 0);
      gl.uniform1f(U1.fadeLo, fadeLo); gl.uniform1f(U1.dotK, F.dotK ?? 0.1);
      gl.uniform2i(U1.tsz, L.tw, L.th);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, L.tA); gl.uniform1i(U1.tA, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, L.tB); gl.uniform1i(U1.tB, 1);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, L.tI); gl.uniform1i(U1.tI, 2);
      gl.uniform1fv(U1.gid, (Fmap && Fmap[L.name]) || ONES);
      const [x0, y0, x1, y1] = L.rect;
      for (let k = 0; k < L.slices; k++) {
        const u0 = k / L.slices, u1 = (k + 1) / L.slices;
        gl.uniform4f(U1.rect, x0 + (x1 - x0) * u0, y0, x0 + (x1 - x0) * u1, y1);
        gl.uniform4f(U1.uvr, u0, 0, u1, 1);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      if (L.sv && (ink.on ?? true)) {
        gl.useProgram(P3);
        gl.bindVertexArray(L.sv.vao);
        setMap(U3, L, dl, Cl, sim);
        gl.uniform4f(U3.rect, x0, y0, x1, y1);
        gl.uniform1f(U3.lg, lg); gl.uniform1f(U3.wcap, ink.cap ?? 3.5); gl.uniform1f(U3.wk, ink.wk ?? 1); gl.uniform1f(U3.texFade, ink.texFade ?? 2.6);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, L.tA); gl.uniform1i(U3.tA, 0);
        gl.drawElements(gl.TRIANGLES, L.sv.n, gl.UNSIGNED_INT, 0);
      }
    }
    gl.bindVertexArray(null);
  }

  // Render: ds = list of dolly positions to average (motion blur; one value = sharp). Returns the canvas.
  function render({ ds = [0], d0 = null, C = [1104.5, 642.9], sim = [1, 0, 0], mask = null, gain = 1, tilt = 0, Cmap = null, Gmap = null, Bmap = null, fadeLo = 0.5, ink = {}, curve = null, Fmap = null, Dmap = null, glow = null, curve0 = null }) {
    gl.viewport(0, 0, W, H);
    // accumulate the sub-frames into B
    gl.bindFramebuffer(gl.FRAMEBUFFER, B.f); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    for (const d of ds) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, A.f); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      drawLayers(d, C, sim, d0 ?? d, Cmap, Gmap, Bmap, fadeLo, ink, Fmap, Dmap);
      gl.bindFramebuffer(gl.FRAMEBUFFER, B.f);
      gl.useProgram(P2); gl.bindVertexArray(quadVAO);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A.t);
      gl.uniform1i(U2.tex, 0); gl.uniform1f(U2.k, 1 / ds.length); gl.uniform2f(U2.res, W, H);
      gl.uniform4f(U2.mask, 0, 0, 0, 0); gl.uniform2f(U2.soft, 0, 1); gl.uniform1f(U2.gain, 1); gl.uniform1f(U2.tilt, 0); gl.uniform1f(U2.pw, 3);
      gl.uniform3f(U2.curve, 1, 1, 0); gl.uniform3f(U2.curve0, 1, 1, 0); gl.uniform4f(U2.glow, 0, 0, 1, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    // final: B -> screen with the mask (the FBO is y-up, the screen pass samples it the same way)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.disable(gl.BLEND);
    gl.useProgram(P2); gl.bindVertexArray(quadVAO);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, B.t);
    gl.uniform1i(U2.tex, 0); gl.uniform1f(U2.k, 1); gl.uniform2f(U2.res, W, H);
    if (mask) { gl.uniform4f(U2.mask, mask[0], mask[1], mask[2], mask[3]); gl.uniform2f(U2.soft, mask[4], mask[5]); }
    else { gl.uniform4f(U2.mask, 0, 0, 0, 0); gl.uniform2f(U2.soft, 0, 1); }
    gl.uniform1f(U2.pw, mask && mask[6] ? mask[6] : 3);
    gl.uniform1f(U2.gain, gain); gl.uniform1f(U2.tilt, tilt);
    gl.uniform3f(U2.curve, curve ? curve[0] : 1, curve ? curve[1] : 1, curve ? (curve[2] ?? 1) : 0);
    gl.uniform3f(U2.curve0, curve0 ? curve0[0] : 1, curve0 ? curve0[1] : 1, curve0 ? (curve0[2] ?? 1) : 0);
    if (glow) gl.uniform4f(U2.glow, glow[0], glow[1], glow[2], glow[3]); else gl.uniform4f(U2.glow, 0, 0, 1, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
    return cv;
  }

  function dispose() {
    for (const L of layers) {
      gl.deleteTexture(L.tA); gl.deleteTexture(L.tB); gl.deleteTexture(L.tI);
      if (L.sv) { gl.deleteVertexArray(L.sv.vao); gl.deleteBuffer(L.sv.vb); gl.deleteBuffer(L.sv.ib); }
    }
    layers.length = 0;
    for (const T of [A, B]) { gl.deleteTexture(T.t); gl.deleteFramebuffer(T.f); }
    const lose = gl.getExtension("WEBGL_lose_context"); if (lose) lose.loseContext();
  }
  return { canvas: cv, addLayer, render, dispose, layers };
}
