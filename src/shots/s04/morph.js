// Mesh warp for the designer key drawings: a moving-least-squares (affine) deformation driven by landmark pairs,
// evaluated on a coarse grid and drawn as a textured triangle mesh in WebGL (one draw per key, alpha-blended).
const VS = `#version 300 es
in vec2 pos; in vec2 uv; out vec2 v;
uniform vec2 res;
void main(){ v = uv; vec2 c = pos / res * 2.0 - 1.0; gl_Position = vec4(c.x, -c.y, 0.0, 1.0); }`;
const FS = `#version 300 es
precision highp float;
in vec2 v; out vec4 o; uniform sampler2D tex; uniform float alpha;
void main(){ o = texture(tex, v) * alpha; }`;

export class Warper {
  constructor(w, h) {
    this.w = w; this.h = h;
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const gl = c.getContext("webgl2", { premultipliedAlpha: true, alpha: true, antialias: true, preserveDrawingBuffer: true });
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.bindAttribLocation(pr, 0, "pos"); gl.bindAttribLocation(pr, 1, "uv"); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    this.c = c; this.gl = gl; this.pr = pr;
    this.bPos = gl.createBuffer(); this.bUV = gl.createBuffer(); this.bIdx = gl.createBuffer();
    this.texes = new Map();
    this.idxKey = null;
  }
  texture(canvas) {
    let t = this.texes.get(canvas);
    if (t) return t;
    const gl = this.gl;
    t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.texes.set(canvas, t);
    return t;
  }
  forget(canvas) { const t = this.texes.get(canvas); if (t) { this.gl.deleteTexture(t); this.texes.delete(canvas); } }
  clear() { const gl = this.gl; gl.viewport(0, 0, this.w, this.h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
  // grid: { cols, rows, pos: Float32Array(2*(cols+1)*(rows+1)) frame px, uv: Float32Array (0..1) }
  // add: accumulate (ONE, ONE) instead of 'over' -- a weighted sum of several warped keys (weights summing to 1)
  draw(canvas, grid, alpha = 1, add = false) {
    const gl = this.gl;
    gl.useProgram(this.pr);
    gl.enable(gl.BLEND); if (add) gl.blendFunc(gl.ONE, gl.ONE); else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.texture(canvas));
    gl.uniform1i(gl.getUniformLocation(this.pr, "tex"), 0);
    gl.uniform1f(gl.getUniformLocation(this.pr, "alpha"), alpha);
    gl.uniform2f(gl.getUniformLocation(this.pr, "res"), this.w, this.h);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bPos); gl.bufferData(gl.ARRAY_BUFFER, grid.pos, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bUV); gl.bufferData(gl.ARRAY_BUFFER, grid.uv, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    const key = grid.cols + "x" + grid.rows;
    if (this.idxKey !== key) {
      const idx = [];
      const n = grid.cols + 1;
      for (let j = 0; j < grid.rows; j++) for (let i = 0; i < grid.cols; i++) {
        const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bIdx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(idx), gl.STATIC_DRAW);
      this.idxKey = key; this.nIdx = idx.length;
    } else gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.bIdx);
    gl.drawElements(gl.TRIANGLES, this.nIdx, gl.UNSIGNED_INT, 0);
  }
}

// Affine moving-least-squares deformation f with f(p_i) ≈ q_i, evaluated over a grid covering a key canvas.
// src/dst: Float32Array x0,y0,x1,y1... (frame px). The canvas spans frame [-M, W+M] x [-M, H+M].
// Returns { cols, rows, pos, uv }.
export function mlsGrid(src, dst, cw, ch, M, step = 28, alpha = 1.0, reg = 0.02) {
  const cols = Math.ceil(cw / step), rows = Math.ceil(ch / step);
  const n = src.length / 2;
  const pos = new Float32Array((cols + 1) * (rows + 1) * 2), uv = new Float32Array((cols + 1) * (rows + 1) * 2);
  const w = new Float64Array(n);
  let k = 0;
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++, k++) {
    const cx = Math.min(cw, i * step), cy = Math.min(ch, j * step);
    const vx = cx - M, vy = cy - M;
    uv[2 * k] = cx / cw; uv[2 * k + 1] = cy / ch;
    let sw = 0, px = 0, py = 0, qx = 0, qy = 0;
    for (let m = 0; m < n; m++) {
      const dx = src[2 * m] - vx, dy = src[2 * m + 1] - vy;
      const ww = 1 / Math.pow(dx * dx + dy * dy + 1, alpha);
      w[m] = ww; sw += ww; px += ww * src[2 * m]; py += ww * src[2 * m + 1]; qx += ww * dst[2 * m]; qy += ww * dst[2 * m + 1];
    }
    px /= sw; py /= sw; qx /= sw; qy /= sw;
    let a11 = 0, a12 = 0, a22 = 0, b11 = 0, b12 = 0, b21 = 0, b22 = 0;
    for (let m = 0; m < n; m++) {
      const ux = src[2 * m] - px, uy = src[2 * m + 1] - py, zx = dst[2 * m] - qx, zy = dst[2 * m + 1] - qy, ww = w[m];
      a11 += ww * ux * ux; a12 += ww * ux * uy; a22 += ww * uy * uy;
      b11 += ww * ux * zx; b12 += ww * ux * zy; b21 += ww * uy * zx; b22 += ww * uy * zy;
    }
    // regularise toward a similarity: add reg * trace to the diagonal of A and matching terms to B
    const tr = (a11 + a22) * reg;
    const s = (b11 + b22) / (a11 + a22 + 1e-9), rr = (b12 - b21) / (a11 + a22 + 1e-9);
    a11 += tr; a22 += tr; b11 += tr * s; b22 += tr * s; b12 += tr * rr; b21 -= tr * rr;
    const det = a11 * a22 - a12 * a12 || 1e-9;
    const i11 = a22 / det, i12 = -a12 / det, i22 = a11 / det;
    const m11 = i11 * b11 + i12 * b21, m12 = i11 * b12 + i12 * b22, m21 = i12 * b11 + i22 * b21, m22 = i12 * b12 + i22 * b22;
    const ex = vx - px, ey = vy - py;
    pos[2 * k] = ex * m11 + ey * m21 + qx;
    pos[2 * k + 1] = ex * m12 + ey * m22 + qy;
  }
  return { cols, rows, pos, uv };
}

// Same deformation at arbitrary points (for per-frame overlays that must follow the warp).
export function mlsPoints(src, dst, pts, alpha = 1.0, reg = 0.02) {
  const n = src.length / 2;
  return pts.map(([vx, vy]) => {
    let sw = 0, px = 0, py = 0, qx = 0, qy = 0;
    const w = new Float64Array(n);
    for (let m = 0; m < n; m++) {
      const dx = src[2 * m] - vx, dy = src[2 * m + 1] - vy;
      const ww = 1 / Math.pow(dx * dx + dy * dy + 1, alpha);
      w[m] = ww; sw += ww; px += ww * src[2 * m]; py += ww * src[2 * m + 1]; qx += ww * dst[2 * m]; qy += ww * dst[2 * m + 1];
    }
    px /= sw; py /= sw; qx /= sw; qy /= sw;
    let a11 = 0, a12 = 0, a22 = 0, b11 = 0, b12 = 0, b21 = 0, b22 = 0;
    for (let m = 0; m < n; m++) {
      const ux = src[2 * m] - px, uy = src[2 * m + 1] - py, zx = dst[2 * m] - qx, zy = dst[2 * m + 1] - qy, ww = w[m];
      a11 += ww * ux * ux; a12 += ww * ux * uy; a22 += ww * uy * uy;
      b11 += ww * ux * zx; b12 += ww * ux * zy; b21 += ww * uy * zx; b22 += ww * uy * zy;
    }
    const tr = (a11 + a22) * reg;
    const s = (b11 + b22) / (a11 + a22 + 1e-9), rr = (b12 - b21) / (a11 + a22 + 1e-9);
    a11 += tr; a22 += tr; b11 += tr * s; b22 += tr * s; b12 += tr * rr; b21 -= tr * rr;
    const det = a11 * a22 - a12 * a12 || 1e-9;
    const i11 = a22 / det, i12 = -a12 / det, i22 = a11 / det;
    const m11 = i11 * b11 + i12 * b21, m12 = i11 * b12 + i12 * b22, m21 = i12 * b11 + i22 * b21, m22 = i12 * b12 + i22 * b22;
    const ex = vx - px, ey = vy - py;
    return [ex * m11 + ey * m21 + qx, ex * m12 + ey * m22 + qy];
  });
}
