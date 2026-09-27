// s28 WebGL compositor: draws canvas layers through a mesh whose vertices are placed on the CPU (a plane homography
// between frames, plus optional displacements). Premultiplied alpha, mipmapped textures.
const VS = `#version 300 es
in vec4 a; in float w; out vec2 uv;
void main(){ uv = a.zw; gl_Position = vec4(a.xy * w, 0.0, w); }`;
const FS = `#version 300 es
precision highp float; in vec2 uv; out vec4 o; uniform sampler2D tex; uniform float alpha;
void main(){ o = texture(tex, uv) * alpha; }`;

export function createGL(W, H) {
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: true, preserveDrawingBuffer: true });
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.bindAttribLocation(prog, 0, "a"); gl.bindAttribLocation(prog, 1, "w"); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  const uAlpha = gl.getUniformLocation(prog, "alpha"), uTex = gl.getUniformLocation(prog, "tex");
  const vbo = gl.createBuffer(), wbo = gl.createBuffer(), ibo = gl.createBuffer();
  const texes = new Map();
  let idxKey = "";
  function tex(c) {
    let t = texes.get(c);
    if (t && !c.__dirty) return t;
    if (!t) { t = gl.createTexture(); texes.set(c, t); }
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const ext = gl.getExtension("EXT_texture_filter_anisotropic");
    if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 8);
    c.__dirty = false;
    return t;
  }
  function begin(rgba = [0, 0, 0, 0]) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.clearColor(rgba[0] * rgba[3], rgba[1] * rgba[3], rgba[2] * rgba[3], rgba[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }
  // L: { canvas, x0, y0, sc }  (the canvas covers ref-frame px x0 .. x0 + width/sc)
  // map(x, y) -> [X, Y, w?] screen px (+ optional homogeneous weight w > 0: perspective-correct texturing and clipping
  // behind the camera when w <= 0).  nx, ny: mesh resolution
  function draw(L, map, { alpha = 1, nx = 24, ny = 16 } = {}) {
    const c = L.canvas, sc = L.sc || 1, x0 = L.x0 || 0, y0 = L.y0 || 0;
    const cw = c.width / sc, ch = c.height / sc;
    const v = new Float32Array((nx + 1) * (ny + 1) * 4), ww = new Float32Array((nx + 1) * (ny + 1));
    let k = 0, q = 0;
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      const u = i / nx, w = j / ny;
      const r = map(x0 + u * cw, y0 + w * ch);
      const X = r[0], Y = r[1], hw = r.length > 2 ? r[2] : 1;
      v[k++] = X / W * 2 - 1; v[k++] = 1 - Y / H * 2; v[k++] = u; v[k++] = w;
      ww[q++] = hw;
    }
    const key = nx + "x" + ny;
    if (key !== idxKey) {
      const id = [];
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const a = j * (nx + 1) + i, b = a + 1, d = a + nx + 1, e = d + 1;
        id.push(a, b, d, b, e, d);
      }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(id), gl.STATIC_DRAW);
      idxKey = key;
    }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, v, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, wbo);
    gl.bufferData(gl.ARRAY_BUFFER, ww, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex(c));
    gl.uniform1i(uTex, 0);
    gl.uniform1f(uAlpha, alpha);
    gl.drawElements(gl.TRIANGLES, nx * ny * 6, gl.UNSIGNED_INT, 0);
  }
  function release() {
    for (const t of texes.values()) gl.deleteTexture(t);
    texes.clear();
    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
  }
  return { canvas, gl, begin, draw, release, forget: (c) => { const t = texes.get(c); if (t) { gl.deleteTexture(t); texes.delete(c); } } };
}
