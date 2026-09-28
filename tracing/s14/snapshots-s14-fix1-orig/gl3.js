// s14 layer compositor, round 3 (WebGL2). The room is drawn as flat layers in the coordinates of the 40.00 s source
// frame ("R40"), each a finished Canvas2D picture (s14/room3.js). Each layer carries an inverse-depth plane
// w(u,v) = a*u + b*v + c (w = 1 is the depth of the keyboard). A camera that dollies forward by d (same depth units)
// toward the focus of expansion C maps a layer point p to
//     p' = C + (p - C) / (1 - d*w(p))        (a homography, since w is affine in p)
// done in homogeneous coordinates in the vertex shader (perspective-correct texturing; points that pass behind the
// camera are clipped). After the dolly a 2D similarity (s, tx, ty) can be applied (the long-lens zoom before 40.0 s).
// Sub-frames are averaged into a half-float accumulator (motion blur); the final pass applies the soft mask of the
// lit gap, a gain and a tone curve.
const MAP = `
uniform vec3 plane;    // a b c
uniform vec2 kk;       // depth factors for x and y motion (constant-depth layers only; 1,1 = rigid)
uniform float d;
uniform vec2 C;
uniform vec3 sim;      // s tx ty
uniform vec2 res;
uniform vec2 E;        // camera side-shift (px at w = 1): p' = C + (p - C - w E) / (1 - d w)
vec4 mapH(vec2 p){
  float w = plane.x * p.x + plane.y * p.y + plane.z;
  if (abs(kk.x - kk.y) > 1e-4) {
    vec2 S = vec2(1.0 / max(0.02, 1.0 - d * w * kk.x), 1.0 / max(0.02, 1.0 - d * w * kk.y));
    vec2 X = sim.x * (C + (p - C - w * E) * S) + sim.yz;
    return vec4(2.0 * X.x / res.x - 1.0, 1.0 - 2.0 * X.y / res.y, 0.0, 1.0);
  }
  float Wh = 1.0 - d * w;
  vec2 X = p - w * (d * C + E);
  X = sim.x * X + sim.yz * Wh;
  return vec4(2.0 * X.x / res.x - Wh, Wh - 2.0 * X.y / res.y, 0.0, Wh);
}`;
const VS = `#version 300 es
in vec2 qv;
uniform vec4 rect;
uniform vec4 uvr;
${MAP}
out vec2 uv; out vec2 q;
void main(){
  vec2 p = mix(rect.xy, rect.zw, qv);
  uv = mix(uvr.xy, uvr.zw, qv);
  q = p;
  gl_Position = mapH(p);
}`;
// a layer: its picture (premultiplied), a gain field (lg * (1 + gx*(x-cx) + gy*(y-cy)) in screen px, for the light
// that changes as the camera moves) and, for the floor, the print's screen-space halftone dot
const FS = `#version 300 es
precision highp float;
in vec2 uv; in vec2 q; out vec4 o;
float h21(vec2 p){ p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }
float vn(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y);
}
uniform float streakK;
uniform sampler2D tex;
uniform highp usampler2D tI;
uniform float gid[256];  // per-face gain for this frame (face-id map tI)
uniform float lg, dotK, sharpK;
uniform vec4 gf;       // gain field: gx gy cx cy
uniform vec2 texel;
void main(){
  vec4 c = texture(tex, uv);
  if (c.a < 0.002) discard;
  if (sharpK > 0.0) {
    // unsharp mask in texture space (a magnified plate reads softer than the source's redrawn detail)
    vec4 b = 0.25 * (texture(tex, uv + vec2(texel.x, 0.0)) + texture(tex, uv - vec2(texel.x, 0.0)) + texture(tex, uv + vec2(0.0, texel.y)) + texture(tex, uv - vec2(0.0, texel.y)));
    c.rgb = max(vec3(0.0), c.rgb + sharpK * (c.rgb - b.rgb));
  }
  ivec2 isz = textureSize(tI, 0);
  uint fid = texelFetch(tI, clamp(ivec2(uv * vec2(isz)), ivec2(0), isz - ivec2(1)), 0).r;
  float g = gid[int(fid)] * lg * max(0.0, 1.0 + gf.x * (gl_FragCoord.x - gf.z) + gf.y * ((${"RESY"} - gl_FragCoord.y) - gf.w));
  vec3 col = c.rgb * g;
  if (streakK > 0.0) {
    // the floor's plank hatching: dark streaks along the rays from the vanishing point, in the layer's own
    // coordinates (rays stay rays through the dolly, so the streaks keep their screen density)
    vec2 r = q - vec2(1104.5, 642.9);
    float th = atan(r.y, r.x), rho = log(max(length(r), 2.0));
    float n1 = vn(vec2(th * 70.0, rho * 7.0)) * 0.65 + vn(vec2(th * 160.0 + 3.1, rho * 11.0)) * 0.35;
    float st = smoothstep(0.55, 0.78, n1);
    col *= 1.0 - streakK * st;
    float n2 = vn(vec2(th * 110.0 + 7.7, rho * 9.0));
    col *= 1.0 + streakK * 0.5 * smoothstep(0.7, 0.9, n2);
  }
  if (dotK > 0.0) {
    vec2 hr = mat2(0.7071, -0.7071, 0.7071, 0.7071) * gl_FragCoord.xy / 5.6;
    float dd = length(fract(hr) - 0.5);
    float dk = 1.0 - smoothstep(0.30, 0.42, dd);
    col *= 1.0 + dotK * (0.38 - dk);
  }
  o = vec4(col, c.a);
}`;
const VS2 = `#version 300 es
in vec2 qv; out vec2 uv;
void main(){ uv = qv; gl_Position = vec4(qv * 2.0 - 1.0, 0.0, 1.0); }`;
const FS2 = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D tex; uniform float k; uniform vec2 res;
uniform vec4 mask;     // cx cy rx ry (frame px); rx <= 0 disables
uniform vec2 soft;     // inner, outer (in superellipse radii)
uniform float pw;      // superellipse exponent
uniform float gain, tilt;
uniform vec3 curve;    // out = in^curve.x * curve.y, mixed by curve.z
uniform vec4 glow;     // additive glow inside the mask: cx cy r strength
void main(){
  vec4 c = texture(tex, uv) * k;
  vec2 px = vec2(uv.x * res.x, (1.0 - uv.y) * res.y);
  if (glow.w > 0.0) {
    vec2 e = (px - glow.xy) / vec2(glow.z * 0.75, glow.z);
    float r2 = dot(e, e);
    c.rgb += vec3(0.93) * glow.w * (exp(-r2 * 9.0) * 0.7 + exp(-r2 * 2.5) * 0.3);
  }
  if (mask.z > 0.0) {
    vec2 e = abs(px - mask.xy) / mask.zw;
    float r = pow(pow(e.x, pw) + pow(e.y, pw), 1.0 / pw);
    float m = 1.0 - smoothstep(soft.x, soft.y, r);
    c.rgb *= m * gain * max(0.0, 1.0 + tilt * (px.x - mask.x) / mask.z);
  } else c.rgb *= gain;
  if (curve.z > 0.0) c.rgb = mix(c.rgb, min(vec3(1.0), pow(max(c.rgb, 0.0), vec3(curve.x)) * curve.y), curve.z);
  o = vec4(c.rgb, 1.0);
}`;

export function createCompositor(W, H) {
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const gl = cv.getContext("webgl2", { preserveDrawingBuffer: true, premultipliedAlpha: true, antialias: true, alpha: false });
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = (vs, fs, attrs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); attrs.forEach((a, i) => gl.bindAttribLocation(p, i, a)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
  const P1 = prog(VS, FS.replace("RESY", H.toFixed(1)), ["qv"]), P2 = prog(VS2, FS2, ["qv"]);
  const uni = (p, names) => { const U = {}; for (const n of names) U[n] = gl.getUniformLocation(p, n); return U; };
  const U1 = uni(P1, ["E", "plane", "kk", "d", "C", "sim", "res", "rect", "uvr", "tex", "lg", "dotK", "sharpK", "streakK", "gf", "texel", "tI", "gid"]);
  const U2 = uni(P2, ["tex", "k", "res", "mask", "soft", "gain", "tilt", "pw", "curve", "glow"]);
  const quadVAO = gl.createVertexArray(); gl.bindVertexArray(quadVAO);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);
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
  const A = target(true), B = target(true);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  const ext = gl.getExtension("EXT_texture_filter_anisotropic");
  const texOf = (canvas) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    return t;
  };
  const layers = [];
  // L: { canvas, rect [x0 y0 x1 y1] (R40 px), plane [a b c (kx ky)], name, blurK, slices, dotK, sharpK }
  const ONES = new Float32Array(256).fill(1);
  function addLayer(L) {
    const tex = texOf(L.canvas);
    const ti = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, ti);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8UI, L.canvas.width, L.canvas.height, 0, gl.RED_INTEGER, gl.UNSIGNED_BYTE, L.idData || new Uint8Array(L.canvas.width * L.canvas.height));
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
    layers.push({ ...L, tex, ti, tw: L.canvas.width, th: L.canvas.height, canvas: null, idData: null });
  }
  const NOF = [0, 0, 0, 0];
  function drawLayers(d, C, sim, d0, o) {
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(P1);
    gl.bindVertexArray(quadVAO);
    for (const L of layers) {
      if (o.only && !o.only.includes(L.name)) continue;
      const Cl = (o.Cmap && o.Cmap[L.name]) || C;
      const lg = (o.Gmap && o.Gmap[L.name]) ?? 1;
      if (lg <= 0) continue;
      const dl = d0 + (d - d0) * ((o.Bmap && o.Bmap[L.name]) ?? L.blurK ?? 1) + ((o.Dmap && o.Dmap[L.name]) ?? 0);
      const gf = (o.Fmap && o.Fmap[L.name]) || NOF;
      gl.uniform2f(U1.res, W, H); gl.uniform2f(U1.C, Cl[0], Cl[1]); gl.uniform1f(U1.d, dl);
      gl.uniform3f(U1.sim, sim[0], sim[1], sim[2]);
      const Ev = (o.Emap && o.Emap[L.name]) || o.E || [0, 0]; gl.uniform2f(U1.E, Ev[0], Ev[1]);
      gl.uniform3f(U1.plane, L.plane[0], L.plane[1], L.plane[2]);
      gl.uniform2f(U1.kk, L.plane[3] ?? 1, L.plane[4] ?? 1);
      gl.uniform1f(U1.lg, lg);
      gl.uniform1f(U1.dotK, (o.dots ?? 1) * (L.dotK ?? 0));
      gl.uniform1f(U1.sharpK, L.sharpK ?? 0);
      gl.uniform1f(U1.streakK, L.streakK ?? 0);
      gl.uniform4f(U1.gf, gf[0], gf[1], gf[2], gf[3]);
      gl.uniform2f(U1.texel, 1 / L.tw, 1 / L.th);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, L.tex); gl.uniform1i(U1.tex, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, L.ti); gl.uniform1i(U1.tI, 1);
      gl.uniform1fv(U1.gid, (o.Imap && o.Imap[L.name]) || ONES);
      gl.activeTexture(gl.TEXTURE0);
      const [x0, y0, x1, y1] = L.rect, n = L.slices ?? 1;
      for (let k = 0; k < n; k++) {
        const u0 = k / n, u1 = (k + 1) / n;
        gl.uniform4f(U1.rect, x0 + (x1 - x0) * u0, y0, x0 + (x1 - x0) * u1, y1);
        gl.uniform4f(U1.uvr, u0, 0, u1, 1);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }
    gl.bindVertexArray(null);
  }
  const blit = (tex, k, o = {}) => {
    gl.useProgram(P2); gl.bindVertexArray(quadVAO);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(U2.tex, 0); gl.uniform1f(U2.k, k); gl.uniform2f(U2.res, W, H);
    const m = o.mask;
    if (m) { gl.uniform4f(U2.mask, m[0], m[1], m[2], m[3]); gl.uniform2f(U2.soft, m[4], m[5]); gl.uniform1f(U2.pw, m[6] ?? 3); }
    else { gl.uniform4f(U2.mask, 0, 0, 0, 0); gl.uniform2f(U2.soft, 0, 1); gl.uniform1f(U2.pw, 3); }
    gl.uniform1f(U2.gain, o.gain ?? 1); gl.uniform1f(U2.tilt, o.tilt ?? 0);
    const c = o.curve; gl.uniform3f(U2.curve, c ? c[0] : 1, c ? c[1] : 1, c ? (c[2] ?? 1) : 0);
    const g = o.glow; if (g) gl.uniform4f(U2.glow, g[0], g[1], g[2], g[3]); else gl.uniform4f(U2.glow, 0, 0, 1, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
  };
  // ds: dolly positions to average (motion blur; one value = sharp); d0: the frame's sharp position (each layer is
  // drawn at d0 + (d - d0) * blurK, so near layers smear more than far ones)
  function render(o) {
    const ds = o.ds ?? [0], C = o.C ?? [1104.5, 642.9], sim = o.sim ?? [1, 0, 0];
    gl.viewport(0, 0, W, H);
    gl.bindFramebuffer(gl.FRAMEBUFFER, B.f); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    for (const d of ds) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, A.f); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      drawLayers(d, C, sim, o.d0 ?? d, o);
      gl.bindFramebuffer(gl.FRAMEBUFFER, B.f);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      blit(A.t, 1 / ds.length);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.disable(gl.BLEND);
    blit(B.t, 1, o);
    return cv;
  }
  function dispose() {
    for (const L of layers) { gl.deleteTexture(L.tex); gl.deleteTexture(L.ti); }
    layers.length = 0;
    for (const T of [A, B]) { gl.deleteTexture(T.t); gl.deleteFramebuffer(T.f); }
    const lose = gl.getExtension("WEBGL_lose_context"); if (lose) lose.loseContext();
  }
  return { canvas: cv, addLayer, render, dispose, layers };
}
