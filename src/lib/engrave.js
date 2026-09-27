// Scratchboard engraving. A layer is painted twice: a grey value study (how bright each place is) and a
// direction map (which way the knife runs there). A shader cuts white lines whose width follows the value:
// hairlines in shadow, fat lines that merge into white in the light. Contours are drawn on top.
//
// dir map encoding (RGBA8): R = angle/π, G = spacing scale (0..1 -> 0.55x..1.9x), B = style, A = 255.
//   style: 0 lines, 1 cross-hatch, 2 flat (value shown as a smooth tone, no lines), 3 knit (short ticks)
const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D val, dir;
uniform vec2 res; uniform float spacing, seed, contrast, ink;
float h21(vec2 p){ p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y);
}
float family(vec2 px, float ang, float sp, float w, float jit){
  vec2 n = vec2(-sin(ang), cos(ang)), t = vec2(cos(ang), sin(ang));
  float c = dot(px, n) / sp;
  // gentle drift only: large shared waves read as moire, so most irregularity is per line
  c += (vnoise(px * 0.0022 + seed) - 0.5) * 0.35 * jit + (vnoise(px * 0.03 + seed * 1.7) - 0.5) * 0.14 * jit;
  float row = floor(c);
  float along = dot(px, t);
  float rh = h21(vec2(row, seed));
  // every carved line has its own weight, and breaks up along its length, most in the mid-tones
  float brk = vnoise(vec2(along / (sp * (5.0 + rh * 6.0)) + rh * 40.0, row * 3.1));
  float ww = w * (0.8 + 0.4 * rh);
  ww = clamp(ww + (brk - 0.5) * 0.6 * (1.0 - w) * min(1.0, w * 3.0) * jit, 0.0, 1.0);
  float f = abs(fract(c) - 0.5) * 2.0;           // 0 on the line's spine, 1 between lines
  float aa = max(fwidth(c) * 2.2, 0.02);
  return (1.0 - smoothstep(ww - aa, ww + aa, f)) * smoothstep(0.0, 0.06, ww);
}
void main(){
  vec2 px = uv * res;
  float v = texture(val, uv).r;
  vec4 d = texture(dir, uv);
  float style = floor(d.b * 255.0 + 0.5);
  v = clamp((v - 0.5) * contrast + 0.5, 0.0, 1.0);
  float ang = d.r * 3.14159265;
  float sp = spacing * mix(0.55, 1.9, d.g);
  float white;
  if (style == 2.0) {
    white = v;
  } else if (style == 1.0) {
    float c = 1.0 - sqrt(max(0.0, 1.0 - v));    // two families whose union covers v
    white = max(family(px, ang, sp, c, 1.0), family(px, ang + 1.05, sp * 1.1, c * 0.9, 1.0));
  } else if (style == 3.0) {
    // knit: short ticks along the direction, staggered rows
    vec2 n = vec2(-sin(ang), cos(ang)), t = vec2(cos(ang), sin(ang));
    float a = dot(px, n) / sp, b = dot(px, t) / (sp * 1.6) + floor(a) * 0.5;
    float fa = abs(fract(a) - 0.5) * 2.0, fb = abs(fract(b) - 0.5) * 2.0;
    float w = v;
    white = (1.0 - smoothstep(w - 0.08, w + 0.08, fa)) * (1.0 - smoothstep(0.75, 0.95, fb) * (1.0 - v));
  } else {
    white = family(px, ang, sp, v, 1.0);
  }
  vec3 inkc = vec3(0.949, 0.941, 0.918) * ink;
  o = vec4(inkc * white, 1.0);
}`;

let GL = null;
function gl2() {
  if (GL) return GL;
  const c = document.createElement("canvas");
  const gl = c.getContext("webgl2", { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false });
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
  gl.bindAttribLocation(pr, 0, "p"); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const tex = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t; };
  GL = { c, gl, pr, tVal: tex(), tDir: tex() };
  return GL;
}

// Run the shader over a value canvas + direction canvas; returns a new 2D canvas with the cut lines.
export function engraveCanvases(valC, dirC, { spacing = 5, seed = 1, contrast = 1, ink = 1 } = {}, out = null) {
  const { c, gl, pr, tVal, tDir } = gl2();
  const w = valC.width, h = valC.height;
  c.width = w; c.height = h;
  gl.viewport(0, 0, w, h);
  gl.useProgram(pr);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tVal); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, valC);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tDir);
  // direction must not be interpolated across region seams more than necessary
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, dirC);
  gl.uniform1i(gl.getUniformLocation(pr, "val"), 0);
  gl.uniform1i(gl.getUniformLocation(pr, "dir"), 1);
  gl.uniform2f(gl.getUniformLocation(pr, "res"), w, h);
  gl.uniform1f(gl.getUniformLocation(pr, "spacing"), spacing);
  gl.uniform1f(gl.getUniformLocation(pr, "seed"), seed);
  gl.uniform1f(gl.getUniformLocation(pr, "contrast"), contrast);
  gl.uniform1f(gl.getUniformLocation(pr, "ink"), ink);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  // pass `out` to reuse one canvas per animated layer instead of allocating every frame
  if (!out) out = document.createElement("canvas");
  if (out.width !== w || out.height !== h) { out.width = w; out.height = h; }
  const og = out.getContext("2d");
  og.setTransform(1, 0, 0, 1, 0, 0);
  og.clearRect(0, 0, w, h);
  og.drawImage(c, 0, 0);
  return out;
}

// A plate: paint value + direction together, add contour lines, then engrave.
// Coordinates are frame coordinates; `scale` supersamples the plate (for later zooms).
export class Plate {
  constructor(w, h, scale = 1) {
    this.w = w; this.h = h; this.scale = scale;
    const mk = (fill) => { const c = document.createElement("canvas"); c.width = Math.round(w * scale); c.height = Math.round(h * scale); const g = c.getContext("2d"); g.fillStyle = fill; g.fillRect(0, 0, c.width, c.height); g.scale(scale, scale); return [c, g]; };
    [this.valC, this.v] = mk("#000");
    [this.dirC, this.d] = mk("rgb(0,128,0)");
    [this.overC, this.o] = mk("rgba(0,0,0,0)");
    this.o.clearRect(0, 0, w, h);
    this.v.imageSmoothingEnabled = true;
  }
  // Encode a direction as a dir-map colour.
  static dirColor(angle, spacing = 0.35, style = 0) {
    let a = angle % Math.PI; if (a < 0) a += Math.PI;
    return `rgb(${Math.round((a / Math.PI) * 255)},${Math.round(Math.max(0, Math.min(1, spacing)) * 255)},${style})`;
  }
  // Fill a region. value: a number 0..1, or (g) => CanvasGradient/pattern made on the value context.
  fill(path, value, angle, { spacing = 0.35, style = 0, alpha = 1 } = {}) {
    const { v, d } = this;
    v.save(); d.save();
    v.globalAlpha = alpha;
    v.beginPath(); path(v);
    v.fillStyle = typeof value === "number" ? grey(value) : value(v);
    v.fill();
    if (alpha > 0.5) { d.beginPath(); path(d); d.fillStyle = Plate.dirColor(angle, spacing, style); d.fill(); }
    v.restore(); d.restore();
  }
  // Paint value only (lighting passes: glows, shadows) keeping the directions already set.
  light(path, value, op = "source-over", alpha = 1) {
    const v = this.v;
    v.save(); v.globalCompositeOperation = op; v.globalAlpha = alpha;
    v.beginPath(); path(v); v.fillStyle = typeof value === "number" ? grey(value) : value(v); v.fill();
    v.restore();
  }
  // Clear all three layers so one Plate can be repainted every frame (animated layers).
  reset() {
    for (const [c, g, fill] of [[this.valC, this.v, "#000"], [this.dirC, this.d, "rgb(0,128,0)"], [this.overC, this.o, null]]) {
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
      if (fill) { g.fillStyle = fill; g.fillRect(0, 0, c.width, c.height); } else g.clearRect(0, 0, c.width, c.height);
      g.restore();
    }
    return this;
  }
  // out: optional canvas to reuse (animated layers). Returns the cut canvas with contour overlay composited.
  engrave(opts, out = null) {
    const cut = engraveCanvases(this.valC, this.dirC, opts, out);
    const g = cut.getContext("2d");
    g.drawImage(this.overC, 0, 0);
    cut.__scale = this.scale;
    return cut;
  }
}

export const grey = (v) => { const c = Math.round(Math.max(0, Math.min(1, v)) * 255); return `rgb(${c},${c},${c})`; };
