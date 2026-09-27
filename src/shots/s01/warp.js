// s01 mesh warp: draws a region of a cached layer through a displaced triangle mesh in one WebGL pass
// (the right arm and hood bend with the swipes while the head and the left side stay put).
// Deterministic: the output depends only on the layer and the displacement function.
const VS = `#version 300 es
in vec2 uv; in vec2 disp;
uniform vec2 size;
out vec2 tuv;
void main(){
  tuv = uv;
  vec2 p = (uv * size + disp) / size;          // 0..1 in the region
  gl_Position = vec4(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0, 0.0, 1.0);
}`;
const FS = `#version 300 es
precision highp float;
in vec2 tuv; out vec4 o;
uniform sampler2D tex;
void main(){ o = texture(tex, tuv); }`;

export class Warper {
  // src: layer canvas drawn at `scale` px per plate px; region [x0, y0, w, h] in plate px; step: mesh cell (plate px)
  constructor(src, scale, x0, y0, w, h, step = 16) {
    this.x0 = x0; this.y0 = y0; this.w = w; this.h = h; this.scale = scale;
    const cw = Math.round(w * scale), ch = Math.round(h * scale);
    this.c = document.createElement("canvas"); this.c.width = cw; this.c.height = ch;
    const gl = this.c.getContext("webgl2", { preserveDrawingBuffer: true, premultipliedAlpha: true, antialias: false, alpha: true });
    this.gl = gl;
    const sh = (type, s) => { const o = gl.createShader(type); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.bindAttribLocation(pr, 0, "uv"); gl.bindAttribLocation(pr, 1, "disp"); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    this.pr = pr;
    // texture: the region of the layer
    const crop = document.createElement("canvas"); crop.width = cw; crop.height = ch;
    crop.getContext("2d").drawImage(src, Math.round(x0 * scale), Math.round(y0 * scale), cw, ch, 0, 0, cw, ch);
    this.crop = crop;
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, crop);
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    // mesh
    const nx = Math.ceil(w / step), ny = Math.ceil(h / step);
    this.nx = nx; this.ny = ny;
    const uv = new Float32Array((nx + 1) * (ny + 1) * 2);
    this.pts = [];
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      const k = j * (nx + 1) + i;
      uv[k * 2] = i / nx; uv[k * 2 + 1] = j / ny;
      this.pts.push([x0 + (w * i) / nx, y0 + (h * j) / ny]);
    }
    const idx = new Uint32Array(nx * ny * 6); let q = 0;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      idx[q++] = a; idx[q++] = b; idx[q++] = d; idx[q++] = a; idx[q++] = d; idx[q++] = c;
    }
    this.nIdx = q;
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    const bu = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bu); gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.disp = new Float32Array((nx + 1) * (ny + 1) * 2);
    this.bd = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.bd); gl.bufferData(gl.ARRAY_BUFFER, this.disp, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    const bi = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bi); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    this.tex = tex;
  }
  // field(x, y) -> [dx, dy] in plate px (where the content at plate (x, y) moves to). Draws the warped region
  // onto ctx (plate coordinates).
  draw(ctx, field) {
    const { gl, pts, disp, scale } = this;
    for (let k = 0; k < pts.length; k++) { const d = field(pts[k][0], pts[k][1]); disp[k * 2] = d[0] * scale; disp[k * 2 + 1] = d[1] * scale; }
    gl.viewport(0, 0, this.c.width, this.c.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.pr);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bd); gl.bufferSubData(gl.ARRAY_BUFFER, 0, disp);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(gl.getUniformLocation(this.pr, "tex"), 0);
    gl.uniform2f(gl.getUniformLocation(this.pr, "size"), this.c.width, this.c.height);
    gl.disable(gl.BLEND);
    gl.drawElements(gl.TRIANGLES, this.nIdx, gl.UNSIGNED_INT, 0);
    ctx.drawImage(this.c, this.x0, this.y0, this.w, this.h);
  }
  // the unwarped region (for frames at rest), pixel-identical source
  blit(ctx) { ctx.drawImage(this.crop, this.x0, this.y0, this.w, this.h); }
  release() { const ext = this.gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext(); this.c = null; this.crop = null; }
}
