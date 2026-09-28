// s19 helpers: 3x3 homographies and a WebGL2 projective warp (a flat canvas mapped onto any quad in the frame).
// Pure: the same inputs always give the same pixels.

// Solve the homography that maps 4 source points to 4 destination points (like cv2.getPerspectiveTransform).
// Returns a row-major 3x3 as a flat array of 9.
export function homography(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const h = solve(A, b);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}
function solve(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}
export function mul3(A, B) {
  const C = new Array(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) C[i * 3 + j] += A[i * 3 + k] * B[k * 3 + j];
  return C;
}
export function inv3(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}
export function apply(H, p) {
  const w = H[6] * p[0] + H[7] * p[1] + H[8];
  return [(H[0] * p[0] + H[1] * p[1] + H[2]) / w, (H[3] * p[0] + H[4] * p[1] + H[5]) / w];
}

// ---------------------------------------------------------------- WebGL2 warp
const VS = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
const FS = `#version 300 es
precision highp float;
uniform sampler2D tex; uniform mat3 Hinv; uniform vec2 srcSize; uniform float outH;
out vec4 o;
void main(){
  vec2 fp = vec2(gl_FragCoord.x, outH - gl_FragCoord.y);
  vec3 s = Hinv * vec3(fp, 1.0);
  vec2 uv = (s.xy / s.z) / srcSize;
  if (s.z <= 0.0 || uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) { o = vec4(0.0); return; }
  o = texture(tex, uv);
}`;
let G = null;
function gl2(w, h) {
  if (!G) {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2", { premultipliedAlpha: true, preserveDrawingBuffer: true, antialias: false, alpha: true });
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.bindAttribLocation(pr, 0, "p"); gl.linkProgram(pr);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const tex = gl.createTexture();
    G = { c, gl, pr, tex, src: null };
  }
  if (G.c.width !== w || G.c.height !== h) { G.c.width = w; G.c.height = h; }
  return G;
}
// Warp `src` (a canvas) by H (src px -> frame px) into a w x h transparent canvas (reused, returned).
// The texture is only re-uploaded when `src` changes (pass the same cached canvas every frame).
export function warp(src, H, w, h) {
  const { c, gl, pr, tex } = gl2(w, h);
  gl.viewport(0, 0, w, h);
  gl.useProgram(pr);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  if (G.src !== src) {
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    G.src = src;
  }
  const Hi = inv3(H);
  // GLSL mat3 is column-major
  gl.uniformMatrix3fv(gl.getUniformLocation(pr, "Hinv"), false, [Hi[0], Hi[3], Hi[6], Hi[1], Hi[4], Hi[7], Hi[2], Hi[5], Hi[8]]);
  gl.uniform2f(gl.getUniformLocation(pr, "srcSize"), src.width, src.height);
  gl.uniform1f(gl.getUniformLocation(pr, "outH"), h);
  gl.uniform1i(gl.getUniformLocation(pr, "tex"), 0);
  gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  return c;
}
export function releaseWarp() { if (G) { G.src = null; } }
