// s27 compositor: a small WebGL2 (WebGL1 fallback) renderer that lays code-painted canvases onto the frame through
// homographies (perspective-correct single quads) and through triangle meshes (non-rigid warps), in painter's order,
// with premultiplied alpha. Everything drawn here is a texture made by our own Canvas2D painting code.
//   const G = getGL(W, H);  G.begin();  G.quadH(tex, H, {alpha});  G.mesh(tex, xy, uv, idx, {alpha});  G.end() -> canvas
// Optional post passes: G.beginFBO() ... G.endFBO() then G.zoomBlur(center, amount, {mix, flash}) to the canvas.

const VS2 = `#version 300 es
in vec3 aPos; in vec2 aUV; uniform vec2 uRes; out vec2 vUV;
void main(){ vUV = aUV; float w = aPos.z; gl_Position = vec4(2.0*aPos.x/uRes.x - w, w - 2.0*aPos.y/uRes.y, 0.0, w); }`;
const FS2 = `#version 300 es
precision highp float; in vec2 vUV; uniform sampler2D uTex; uniform float uAlpha; uniform vec4 uTint; out vec4 o;
void main(){ vec4 c = texture(uTex, vUV); c.rgb = mix(c.rgb, uTint.rgb * c.a, uTint.a); o = c * uAlpha; }`;
const VS1 = `attribute vec3 aPos; attribute vec2 aUV; uniform vec2 uRes; varying vec2 vUV;
void main(){ vUV = aUV; float w = aPos.z; gl_Position = vec4(2.0*aPos.x/uRes.x - w, w - 2.0*aPos.y/uRes.y, 0.0, w); }`;
const FS1 = `precision highp float; varying vec2 vUV; uniform sampler2D uTex; uniform float uAlpha; uniform vec4 uTint;
void main(){ vec4 c = texture2D(uTex, vUV); c.rgb = mix(c.rgb, uTint.rgb * c.a, uTint.a); gl_FragColor = c * uAlpha; }`;
// radial zoom blur of an FBO texture toward a centre (premultiplied), then an optional flash toward a colour
const ZVS2 = `#version 300 es
in vec2 aP; out vec2 vUV; void main(){ vUV = aP*0.5+0.5; gl_Position = vec4(aP,0.0,1.0); }`;
const ZFS2 = `#version 300 es
precision highp float; in vec2 vUV; uniform sampler2D uTex; uniform vec2 uC; uniform float uAmt; uniform vec4 uFlash; out vec4 o;
void main(){
  vec4 acc = vec4(0.0); float ws = 0.0;
  vec2 d = (vUV - uC) * vec2(2.33, 1.0); float r = length(d);
  float k = uAmt * clamp((length(d * vec2(1.0, 0.55)) - 0.05) / 0.45, 0.0, 1.0);
  for (int i = 0; i < 48; i++) { float u = float(i)/47.0; float s = 1.0 - k*u; vec2 p = uC + (vUV - uC)*s;
    float w = 1.0; acc += texture(uTex, p)*w; ws += w; }
  vec4 c = acc/ws; c.rgb = mix(c.rgb, uFlash.rgb, uFlash.a); o = vec4(c.rgb, 1.0); }`;

let inst = null;
export function getGL(W, H) {
  if (inst && inst.W === W && inst.H === H) return inst;
  inst = new GLComp(W, H);
  return inst;
}

class GLComp {
  constructor(W, H) {
    this.W = W; this.H = H;
    const c = document.createElement("canvas"); c.width = W; c.height = H; this.canvas = c;
    const attrs = { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false, alpha: true };
    let gl = c.getContext("webgl2", attrs); this.v2 = !!gl;
    if (!gl) gl = c.getContext("webgl", attrs);
    this.gl = gl;
    this.aniso = gl.getExtension("EXT_texture_filter_anisotropic");
    const prog = (vs, fs) => {
      const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
      const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
      gl.bindAttribLocation(p, 0, "aPos"); gl.bindAttribLocation(p, 1, "aUV"); gl.bindAttribLocation(p, 0, "aP");
      gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p;
    };
    this.p = this.v2 ? prog(VS2, FS2) : prog(VS1, FS1);
    this.u = { res: gl.getUniformLocation(this.p, "uRes"), tex: gl.getUniformLocation(this.p, "uTex"), alpha: gl.getUniformLocation(this.p, "uAlpha"), tint: gl.getUniformLocation(this.p, "uTint") };
    if (this.v2) {
      this.pz = prog(ZVS2, ZFS2);
      this.uz = { tex: gl.getUniformLocation(this.pz, "uTex"), c: gl.getUniformLocation(this.pz, "uC"), amt: gl.getUniformLocation(this.pz, "uAmt"), flash: gl.getUniformLocation(this.pz, "uFlash") };
    }
    this.vb = gl.createBuffer(); this.ub = gl.createBuffer(); this.ib = gl.createBuffer(); this.qb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.qb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.uint = this.v2 || !!gl.getExtension("OES_element_index_uint");
    this.texes = new Map();
    this.fbo = null;
  }
  // texture from a canvas (built once per key by paint(); pass a canvas-returning function)
  tex(key, make, { mip = true } = {}) {
    let r = this.texes.get(key);
    if (r) return r;
    const src = make();
    r = this._upload(src, mip);
    r.key = key;
    this.texes.set(key, r);
    return r;
  }
  _upload(src, mip, r = null) {
    const gl = this.gl;
    if (!r) r = { tex: gl.createTexture(), w: src.width, h: src.height };
    r.w = src.width; r.h = src.height;
    gl.bindTexture(gl.TEXTURE_2D, r.tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    const pot = (v) => (v & (v - 1)) === 0;
    const canMip = mip && (this.v2 || (pot(r.w) && pot(r.h)));
    if (canMip) gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, canMip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (canMip && this.aniso) gl.texParameterf(gl.TEXTURE_2D, this.aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    return r;
  }
  // re-upload a dynamic texture (same key) from a canvas every frame
  dyn(key, src, { mip = false } = {}) {
    let r = this.texes.get(key);
    r = this._upload(src, mip, r || null);
    this.texes.set(key, r);
    return r;
  }
  release(prefix = "") {
    for (const [k, r] of this.texes) if (!prefix || k.startsWith(prefix)) { this.gl.deleteTexture(r.tex); this.texes.delete(k); }
  }
  begin() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this._target || null);
    gl.viewport(0, 0, this.W, this.H);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
  }
  // render into an offscreen texture instead of the canvas (for the zoom blur)
  beginFBO() {
    const gl = this.gl;
    if (!this.fbo) {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.W, this.H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
      const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      this.fbo = { f, t };
    }
    this._target = this.fbo.f;
    this.begin();
  }
  // zoom blur the FBO onto the canvas. c: centre in frame px; amt: fraction of the radius smeared toward the centre
  zoomBlur(cx, cy, amt, flash = [1, 1, 1, 0]) {
    const gl = this.gl;
    this._target = null;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.W, this.H);
    gl.disable(gl.BLEND);
    gl.useProgram(this.pz);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.fbo.t);
    gl.uniform1i(this.uz.tex, 0);
    gl.uniform2f(this.uz.c, cx / this.W, 1 - cy / this.H);
    gl.uniform1f(this.uz.amt, amt);
    gl.uniform4f(this.uz.flash, flash[0], flash[1], flash[2], flash[3]);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.qb);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.disableVertexAttribArray(1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.enable(gl.BLEND);
  }
  _draw(r, pos, uv, idx, alpha = 1, tint = null) {
    const gl = this.gl;
    gl.useProgram(this.p);
    gl.uniform2f(this.u.res, this.W, this.H);
    gl.uniform1f(this.u.alpha, alpha);
    const T = tint || [0, 0, 0, 0];
    gl.uniform4f(this.u.tint, T[0], T[1], T[2], T[3]);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, r.tex); gl.uniform1i(this.u.tex, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vb); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ub); gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ib);
    const big = pos.length / 3 > 65535;
    const I = big ? new Uint32Array(idx) : new Uint16Array(idx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, I, gl.STREAM_DRAW);
    gl.drawElements(gl.TRIANGLES, I.length, big ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0);
  }
  // Draw texture rect (sx,sy,sw,sh in texture px; default whole) through homography H (texture px -> frame px),
  // perspective-correct. H: [h11,h12,h13,h21,h22,h23,h31,h32,h33].
  quadH(r, H, { alpha = 1, src = null, tint = null } = {}) {
    const [sx, sy, sw, sh] = src || [0, 0, r.w, r.h];
    const P = [[sx, sy], [sx + sw, sy], [sx + sw, sy + sh], [sx, sy + sh]];
    const pos = new Float32Array(12), uv = new Float32Array(8);
    P.forEach(([u, v], i) => {
      const X = H[0] * u + H[1] * v + H[2], Y = H[3] * u + H[4] * v + H[5], Wh = H[6] * u + H[7] * v + H[8];
      pos[i * 3] = X; pos[i * 3 + 1] = Y; pos[i * 3 + 2] = Wh;
      uv[i * 2] = u / r.w; uv[i * 2 + 1] = v / r.h;
    });
    this._draw(r, pos, uv, [0, 1, 2, 0, 2, 3], alpha, tint);
  }
  // Draw a texture through an arbitrary mesh: xy = frame positions [x0,y0,x1,y1,...], uv = texture px, idx = triangles.
  mesh(r, xy, uv, idx, { alpha = 1, tint = null } = {}) {
    const n = xy.length / 2, pos = new Float32Array(n * 3), tuv = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { pos[i * 3] = xy[i * 2]; pos[i * 3 + 1] = xy[i * 2 + 1]; pos[i * 3 + 2] = 1; tuv[i * 2] = uv[i * 2] / r.w; tuv[i * 2 + 1] = uv[i * 2 + 1] / r.h; }
    this._draw(r, pos, tuv, idx, alpha, tint);
  }
  end() { this.gl.flush(); return this.canvas; }
}

// ---------- homography helpers ----------
// 3x3 as flat arrays, row-major
export function hmul(A, B) {
  const C = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
  return C;
}
export function hinv(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}
export function happly(H, x, y) {
  const w = H[6] * x + H[7] * y + H[8];
  return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
}
// homography mapping 4 source points to 4 destination points
export function hquad(src, dst) {
  // solve 8x8
  const A = [], b = [];
  for (let k = 0; k < 4; k++) {
    const [x, y] = src[k], [u, v] = dst[k];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const n = 8;
  for (let i = 0; i < n; i++) {
    let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
    for (let r = i + 1; r < n; r++) { const f = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; }
  }
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; }
  return [x[0], x[1], x[2], x[3], x[4], x[5], x[6], x[7], 1];
}
export const hscale = (sx, sy = sx) => [sx, 0, 0, 0, sy, 0, 0, 0, 1];
export const htrans = (tx, ty) => [1, 0, tx, 0, 1, ty, 0, 0, 1];
export const haff = (a, b, c, d, e, f) => [a, b, c, d, e, f, 0, 0, 1];
