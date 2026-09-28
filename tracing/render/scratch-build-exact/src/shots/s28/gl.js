// WebGL1 renderer for s28: key drawings re-projected to the orbiting camera.
// Each key drawing (a canvas painted from measured vector data) carries a depth grid over its own image; the grid is
// lifted to 3D with the key's camera (world = the final camera's frame) and drawn with the current camera, textured
// by the key canvas. Keys are composited "over" (premultiplied), farthest-in-time first; a key can be restricted to
// the part of the frame that the key drawn above it could not see (behind its laptop lid), see `hole`.
// Deterministic: same inputs, same pixels.
const VS = `
precision highp float;
attribute vec3 X; attribute vec2 uv;
uniform mat3 R; uniform vec3 C; uniform vec3 K; uniform vec2 size;
uniform vec4 cp[5]; uniform vec4 dsp[5];    // control points (x, y, sigma) and displacement (now.xy - key.xy)
varying vec2 vUV; varying vec3 vX;
void main(){
  vUV = uv; vX = X;
  vec3 q = R * (X - C);
  vec2 p = vec2(K.x * q.x / q.z + K.y, K.x * q.y / q.z + K.z);
  float ws = 0.0; vec2 d = vec2(0.0);
  for (int i = 0; i < 5; i++) {
    vec2 e = p - cp[i].xy;
    float w = exp(-dot(e, e) / (2.0 * cp[i].z * cp[i].z)) + 1e-6;
    ws += w; d += w * dsp[i].xy;
  }
  p += d / ws;
  float z = q.z, n = 0.05, f = 20.0;
  gl_Position = vec4((p.x / size.x * 2.0 - 1.0) * z, (1.0 - p.y / size.y * 2.0) * z, (z * (f + n) - 2.0 * f * n) / (f - n), z);
}`;
const FS = `
precision highp float;
varying vec2 vUV; varying vec3 vX;
uniform sampler2D tex; uniform float alpha; uniform float keep;
uniform float useHole; uniform mat3 RH; uniform vec3 CH; uniform vec3 K; uniform vec2 L0; uniform vec2 L1; uniform vec2 L2; uniform vec2 L3;
uniform vec2 N0; uniform vec2 N1; uniform vec2 N2; uniform vec2 N3; uniform float band; uniform float fh;
float side(vec2 a, vec2 b, vec2 p){ return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x); }
void main(){
  vec4 c = texture2D(tex, vUV);
  float k = 1.0;
  if (useHole > 0.5) {
    vec3 q = RH * (vX - CH);
    vec2 p = vec2(K.x * q.x / q.z + K.y, K.x * q.y / q.z + K.z);
    float s0 = side(L0, L1, p), s1 = side(L1, L2, p), s2 = side(L2, L3, p), s3 = side(L3, L0, p);
    float inq = step(0.0, s0) * step(0.0, s1) * step(0.0, s2) * step(0.0, s3);
    // and only in a band next to the current lid (N0..N3, screen px): the strip the lid has just uncovered
    vec2 f = vec2(gl_FragCoord.x, fh - gl_FragCoord.y);
    float e0 = side(N0, N1, f) / length(N1 - N0), e1 = side(N1, N2, f) / length(N2 - N1);
    float e2 = side(N2, N3, f) / length(N3 - N2), e3 = side(N3, N0, f) / length(N0 - N3);
    float out_ = -min(min(e0, e1), min(e2, e3));          // > 0 outside the quad: distance to the nearest edge (approx)
    float near = 1.0 - smoothstep(band * 0.6, band, out_);
    k = max(keep, inq * near);
  }
  gl_FragColor = c * (alpha * k);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
const m3 = (R) => new Float32Array([R[0][0], R[1][0], R[2][0], R[0][1], R[1][1], R[2][1], R[0][2], R[1][2], R[2][2]]);

export function createGL(W, H) {
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: true, premultipliedAlpha: true, alpha: true });
  if (!gl) throw new Error("webgl unavailable");
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
  gl.bindAttribLocation(prog, 0, "X"); gl.bindAttribLocation(prog, 1, "uv");
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  const U = {};
  for (const n of ["R", "C", "K", "size", "cp", "dsp", "tex", "alpha", "keep", "useHole", "RH", "CH", "L0", "L1", "L2", "L3", "N0", "N1", "N2", "N3", "band", "fh"]) U[n] = gl.getUniformLocation(prog, n);
  const texs = new Map();          // canvas -> texture (uploaded once)
  const meshes = new Map();        // key object -> GPU buffers
  function texture(c) {
    let t = texs.get(c);
    if (t) return t;
    t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    texs.set(c, t);
    return t;
  }
  function dropTexture(c) { const t = texs.get(c); if (t) { gl.deleteTexture(t); texs.delete(c); } }
  // mesh: { pos Float32Array (xyz), uv Float32Array, idx Uint16Array }
  function buffers(mesh) {
    let b = meshes.get(mesh);
    if (b) return b;
    b = { pos: gl.createBuffer(), uv: gl.createBuffer(), idx: gl.createBuffer(), n: mesh.idx.length };
    gl.bindBuffer(gl.ARRAY_BUFFER, b.pos); gl.bufferData(gl.ARRAY_BUFFER, mesh.pos, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.uv); gl.bufferData(gl.ARRAY_BUFFER, mesh.uv, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.idx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.idx, gl.STATIC_DRAW);
    meshes.set(mesh, b);
    return b;
  }
  function begin(bg) {
    gl.viewport(0, 0, W, H);
    gl.clearColor(bg[0], bg[1], bg[2], bg[3]); gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(prog);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
  }
  // draw one key: { mesh, canvas }, current camera, options { alpha, disp:[[dx,dy]x5], cps, hole: {cam, quad, keep} }
  function draw(key, cam, o = {}) {
    gl.clear(gl.DEPTH_BUFFER_BIT);
    const b = buffers(key.mesh);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.pos); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, b.uv); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.idx);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture(key.canvas)); gl.uniform1i(U.tex, 0);
    gl.uniformMatrix3fv(U.R, false, m3(cam.R)); gl.uniform3fv(U.C, cam.C);
    gl.uniform3f(U.K, cam.f, cam.cx, cam.cy); gl.uniform2f(U.size, W, H);
    const cps = o.cps || [[0, 0, 100], [0, 0, 100], [0, 0, 100], [0, 0, 100], [0, 0, 100]];
    const disp = o.disp || [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];
    const cpv = new Float32Array(20), dv = new Float32Array(20);
    for (let i = 0; i < 5; i++) { cpv.set([cps[i][0], cps[i][1], cps[i][2], 0], i * 4); dv.set([disp[i][0], disp[i][1], 0, 0], i * 4); }
    gl.uniform4fv(U.cp, cpv); gl.uniform4fv(U.dsp, dv);
    gl.uniform1f(U.alpha, o.alpha ?? 1);
    if (o.hole) {
      gl.uniform1f(U.useHole, 1); gl.uniform1f(U.keep, o.hole.keep);
      gl.uniformMatrix3fv(U.RH, false, m3(o.hole.cam.R)); gl.uniform3fv(U.CH, o.hole.cam.C);
      const q = o.hole.quad;
      gl.uniform2f(U.L0, q[0], q[1]); gl.uniform2f(U.L1, q[2], q[3]); gl.uniform2f(U.L2, q[4], q[5]); gl.uniform2f(U.L3, q[6], q[7]);
      const n = o.hole.now;
      gl.uniform2f(U.N0, n[0], n[1]); gl.uniform2f(U.N1, n[2], n[3]); gl.uniform2f(U.N2, n[4], n[5]); gl.uniform2f(U.N3, n[6], n[7]);
      gl.uniform1f(U.band, o.hole.band ?? 50); gl.uniform1f(U.fh, H);
    } else gl.uniform1f(U.useHole, 0);
    gl.drawElements(gl.TRIANGLES, b.n, gl.UNSIGNED_SHORT, 0);
  }
  function release() {
    for (const t of texs.values()) gl.deleteTexture(t);
    for (const b of meshes.values()) { gl.deleteBuffer(b.pos); gl.deleteBuffer(b.uv); gl.deleteBuffer(b.idx); }
    texs.clear(); meshes.clear();
    const ext = gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext();
  }
  return { begin, draw, dropTexture, release, canvas };
}
