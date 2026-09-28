// s14 layer compositor (WebGL2). The room is painted as flat layers in the coordinates of the 40.00 s source frame
// ("R40"). Each layer carries an inverse-depth plane w(u,v) = a*u + b*v + c (w = 1 is the depth of the keyboard).
// A camera that dollies forward by d (same depth units) toward the focus of expansion C maps a layer point p to
//     p' = C + (p - C) / (1 - d*w(p))        (a homography, since w is affine in p)
// which the vertex shader does in homogeneous coordinates, so the texture is perspective-correct and points that
// pass behind the camera are clipped by the GPU. After the dolly a 2D similarity (s, tx, ty) can be applied (the
// long-lens zoom before 40.0 s). The final pass multiplies by a soft elliptical mask (the lit gap in the dark).
const VS = `#version 300 es
in vec2 q;
uniform vec4 rect;     // x0 y0 x1 y1 (R40 px) of this slice
uniform vec4 uvr;      // the slice's texture sub-rectangle (a layer can be drawn in vertical slices so a depth
                       // that varies across it maps piecewise-correctly, e.g. the receding desk plank)
uniform vec3 plane;    // a b c
uniform vec2 kk;       // depth factors for x and y motion (constant-depth layers only; 1,1 = rigid)
uniform float d;
uniform vec2 C;
uniform vec3 sim;      // s tx ty
uniform vec2 res;
out vec2 uv;
void main(){
  vec2 p = mix(rect.xy, rect.zw, q);
  float w = plane.x * p.x + plane.y * p.y + plane.z;
  uv = mix(uvr.xy, uvr.zw, q);
  if (abs(kk.x - kk.y) > 1e-4) {
    // a flat layer square to the lens whose sideways parallax differs from its vertical one (the source's desk):
    // scale about C separately in x and y (an affine map, exact for a constant-depth layer)
    vec2 S = vec2(1.0 / max(0.02, 1.0 - d * w * kk.x), 1.0 / max(0.02, 1.0 - d * w * kk.y));
    vec2 X = sim.x * (C + (p - C) * S) + sim.yz;
    gl_Position = vec4(2.0 * X.x / res.x - 1.0, 1.0 - 2.0 * X.y / res.y, 0.0, 1.0);
    return;
  }
  float Wh = 1.0 - d * w;
  vec2 X = p - d * w * C;
  X = sim.x * X + sim.yz * Wh;
  gl_Position = vec4(2.0 * X.x / res.x - Wh, Wh - 2.0 * X.y / res.y, 0.0, Wh);
}`;
const FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D tex; uniform float alpha;
void main(){ vec4 c = texture(tex, uv); o = c * alpha; }`;
// full-screen pass: copy an accumulation texture with a weight (motion blur) or apply the mask (final)
const VS2 = `#version 300 es
in vec2 q; out vec2 uv;
void main(){ uv = q; gl_Position = vec4(q * 2.0 - 1.0, 0.0, 1.0); }`;
const FS2 = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D tex; uniform float k; uniform vec2 res;
uniform vec4 mask;     // cx cy rx ry (frame px); rx <= 0 disables
uniform vec2 soft;     // inner, outer (in ellipse radii)
uniform float pw;      // superellipse exponent (3 = rounded rectangle, 2 = ellipse)
uniform float gain;
uniform float tilt;     // gain ramp across the gap (brighter toward the lit side)
void main(){
  vec4 c = texture(tex, uv) * k;
  if (mask.z > 0.0) {
    vec2 px = vec2(uv.x * res.x, (1.0 - uv.y) * res.y);
    vec2 e = abs(px - mask.xy) / mask.zw;
    float r = pow(pow(e.x, pw) + pow(e.y, pw), 1.0 / pw);   // superellipse (p = 3 rounded rectangle, 2 ellipse)
    float m = 1.0 - smoothstep(soft.x, soft.y, r);
    c.rgb *= m * gain * max(0.0, 1.0 + tilt * (px.x - mask.x) / mask.z);
  } else c.rgb *= gain;
  o = vec4(c.rgb, 1.0);
}`;

export function createCompositor(W, H) {
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const gl = cv.getContext("webgl2", { preserveDrawingBuffer: true, premultipliedAlpha: true, antialias: true, alpha: false });
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = (vs, fs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.bindAttribLocation(p, 0, "q"); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
  const P1 = prog(VS, FS), P2 = prog(VS2, FS2);
  const U1 = {}, U2 = {};
  for (const n of ["rect", "uvr", "plane", "kk", "d", "C", "sim", "res", "tex", "alpha"]) U1[n] = gl.getUniformLocation(P1, n);
  for (const n of ["tex", "k", "res", "mask", "soft", "gain", "tilt", "pw"]) U2[n] = gl.getUniformLocation(P2, n);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // two render targets: one sub-frame composite, one accumulator
  const target = () => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return { t, f };
  };
  const A = target(), B = target();
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  const layers = [];
  // canvas: the layer image (premultiplied RGBA), rect in R40 px, plane [a,b,c]
  function addLayer(canvas, rect, plane, name = "", blurK = 1, slices = 1) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const ext = gl.getExtension("EXT_texture_filter_anisotropic");
    if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    layers.push({ t, rect, plane, name, blurK, slices });
  }

  // d0: the frame's sharp dolly position; each layer is drawn at d0 + (d - d0) * blurK, so near layers smear and
  // far ones stay crisp (the source blurs only the near desk and boxes)
  function drawLayers(d, C, sim, d0 = d) {
    gl.useProgram(P1);
    gl.uniform2f(U1.res, W, H); gl.uniform2f(U1.C, C[0], C[1]);
    gl.uniform3f(U1.sim, sim[0], sim[1], sim[2]); gl.uniform1i(U1.tex, 0); gl.uniform1f(U1.alpha, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    for (const L of layers) {
      gl.uniform1f(U1.d, d0 + (d - d0) * L.blurK);
      gl.bindTexture(gl.TEXTURE_2D, L.t);
      gl.uniform3f(U1.plane, L.plane[0], L.plane[1], L.plane[2]);
      gl.uniform2f(U1.kk, L.plane[3] ?? 1, L.plane[4] ?? 1);
      const [x0, y0, x1, y1] = L.rect;
      for (let k = 0; k < L.slices; k++) {
        const u0 = k / L.slices, u1 = (k + 1) / L.slices;
        gl.uniform4f(U1.rect, x0 + (x1 - x0) * u0, y0, x0 + (x1 - x0) * u1, y1);
        gl.uniform4f(U1.uvr, u0, 0, u1, 1);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }
  }

  // Render: ds = list of dolly positions to average (motion blur; one value = sharp). Returns the canvas.
  function render({ ds = [0], d0 = null, C = [1104.5, 642.9], sim = [1, 0, 0], mask = null, gain = 1, tilt = 0 }) {
    gl.viewport(0, 0, W, H);
    // accumulate the sub-frames into B
    gl.bindFramebuffer(gl.FRAMEBUFFER, B.f); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    for (const d of ds) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, A.f); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      drawLayers(d, C, sim, d0 ?? d);
      gl.bindFramebuffer(gl.FRAMEBUFFER, B.f);
      gl.useProgram(P2);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, A.t);
      gl.uniform1i(U2.tex, 0); gl.uniform1f(U2.k, 1 / ds.length); gl.uniform2f(U2.res, W, H);
      gl.uniform4f(U2.mask, 0, 0, 0, 0); gl.uniform2f(U2.soft, 0, 1); gl.uniform1f(U2.gain, 1); gl.uniform1f(U2.tilt, 0); gl.uniform1f(U2.pw, 3);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    // final: B -> screen with the mask (the FBO is y-up, the screen pass samples it the same way)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.disable(gl.BLEND);
    gl.useProgram(P2);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, B.t);
    gl.uniform1i(U2.tex, 0); gl.uniform1f(U2.k, 1); gl.uniform2f(U2.res, W, H);
    if (mask) { gl.uniform4f(U2.mask, mask[0], mask[1], mask[2], mask[3]); gl.uniform2f(U2.soft, mask[4], mask[5]); }
    else { gl.uniform4f(U2.mask, 0, 0, 0, 0); gl.uniform2f(U2.soft, 0, 1); }
    gl.uniform1f(U2.pw, mask && mask[6] ? mask[6] : 3);
    gl.uniform1f(U2.gain, gain); gl.uniform1f(U2.tilt, tilt);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return cv;
  }

  function dispose() {
    for (const L of layers) gl.deleteTexture(L.t);
    layers.length = 0;
    for (const T of [A, B]) { gl.deleteTexture(T.t); gl.deleteFramebuffer(T.f); }
    const lose = gl.getExtension("WEBGL_lose_context"); if (lose) lose.loseContext();
  }
  return { canvas: cv, addLayer, render, dispose, layers };
}
