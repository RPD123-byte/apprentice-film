// s16's copy of the scratchboard engraver (src/lib/engrave.js), with two changes for a plate whose hatch
// direction changes from region to region:
//  - the line anti-aliasing uses the analytic width of the line family (|n|/spacing) instead of fwidth(), so a
//    change of direction between two regions is a clean switch, not a grey seam;
//  - style 5: stipple (pale specks on a jittered grid, the mug's speckled glaze);
//  - style 4: sparse strands (hair): every other line family row is dropped by its hash, the rest are thin;
//  - style 6: mesh (the knit T-shirt): dark lines in two crossing families, white cells between (this pass);
//  - style 7: knit ribs (the beanie, fix 1): lines along the ribs, cross-hatched where the tone is low;
//  - lit areas (fix 1): above flatLo..flatHi the line styles fade into flat tone with a fine seeded stipple;
//  - line contrast: B = style + 16 * c, c = 0..15; the cut lines are mixed with the flat tone by 1 - c/16 (the
//    source's drawing is soft: its hatching sits on grey, not on black), mean tone unchanged.
// Same dir-map encoding as engrave.js otherwise: R = angle/pi, G = spacing scale (0..1 -> 0.55x..1.9x).
const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D val, dir;
uniform vec2 res; uniform float spacing, seed, contrast, ink, flatLo, flatHi, stip, blackLo;
float h21(vec2 p){ p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y);
}
float family(vec2 px, float ang, float sp, float w, float jit, float sparse){
  vec2 n = vec2(-sin(ang), cos(ang)), t = vec2(cos(ang), sin(ang));
  float c = dot(px, n) / sp;
  c += (vnoise(px * 0.0022 + seed) - 0.5) * 0.35 * jit + (vnoise(px * 0.03 + seed * 1.7) - 0.5) * 0.14 * jit;
  float row = floor(c);
  float along = dot(px, t);
  float rh = h21(vec2(row, seed));
  float brk = vnoise(vec2(along / (sp * (5.0 + rh * 6.0)) + rh * 40.0, row * 3.1));
  float ww = w * (0.8 + 0.4 * rh);
  ww = clamp(ww + (brk - 0.5) * 0.6 * (1.0 - w) * min(1.0, w * 3.0) * jit, 0.0, 1.0);
  if (sparse > 0.5) { ww = (rh < 0.5 ? 0.0 : clamp(w * 2.0 * (0.6 + 0.8 * brk), 0.0, 1.0)); }
  float f = abs(fract(c) - 0.5) * 2.0;
  // analytic anti-aliasing: one pixel is 1/sp of a period across the lines (x2: f spans half a period)
  float aa = max(2.2 / sp, 0.02);
  return (1.0 - smoothstep(ww - aa, ww + aa, f)) * smoothstep(0.0, 0.06, ww);
}
void main(){
  vec2 px = uv * res;
  float v = texture(val, uv).r;
  vec4 d = texture(dir, uv);
  float bb = floor(d.b * 255.0 + 0.5);
  float style = mod(bb, 16.0), kc = 1.0 - floor(bb / 16.0) / 16.0;
  v = clamp((v - 0.5) * contrast + 0.5, 0.0, 1.0);
  // fix 1: the empty dark is black (the value study's faintest rings printed as a static blotchy fleck there)
  v *= smoothstep(blackLo, blackLo * 2.0, v);
  float ang = d.r * 3.14159265;
  float sp = spacing * mix(0.55, 1.9, d.g);
  float white;
  if (style == 2.0) {
    white = v;
  } else if (style == 1.0) {
    float c = 1.0 - sqrt(max(0.0, 1.0 - v));
    white = max(family(px, ang, sp, c, 1.0, 0.0), family(px, ang + 1.05, sp * 1.1, c * 0.9, 1.0, 0.0));
  } else if (style == 3.0) {
    vec2 n = vec2(-sin(ang), cos(ang)), t = vec2(cos(ang), sin(ang));
    float a = dot(px, n) / sp, b = dot(px, t) / (sp * 1.6) + floor(a) * 0.5;
    float fa = abs(fract(a) - 0.5) * 2.0, fb = abs(fract(b) - 0.5) * 2.0;
    float w = v;
    white = (1.0 - smoothstep(w - 0.08, w + 0.08, fa)) * (1.0 - smoothstep(0.75, 0.95, fb) * (1.0 - v));
  } else if (style == 5.0) {
    // stipple (the mug's speckled glaze): pale specks on a jittered grid whose size follows v, over the flat tone
    vec2 q = px / (sp * 0.8); vec2 cell = floor(q); vec2 fq = fract(q) - 0.5;
    vec2 jt = vec2(h21(cell + seed), h21(cell * 1.7 + 3.1 + seed)) - 0.5;
    float r = length(fq - jt * 0.6);
    float rad = 0.18 + 0.2 * h21(cell * 2.3 + 7.7);
    float dotw = 1.0 - smoothstep(rad - 0.08, rad + 0.08, r);
    white = clamp(v * 0.75 + dotw * (1.0 - v * 0.75) * 0.9 - (1.0 - dotw) * 0.0, 0.0, 1.0);
    white = mix(white, v, smoothstep(0.75, 0.95, v));
  } else if (style == 6.0) {
    // mesh (his knit T-shirt): two families of dark lines crossing, the white cells between them; cell area ~ v
    float w6 = sqrt(v) * 1.02;
    white = min(family(px, ang, sp, w6, 0.6, 0.0), family(px, 3.14159265 - ang, sp, w6, 0.6, 0.0));
  } else if (style == 7.0) {
    // knit ribs (the beanie, fix 1): one family of lines along the ribs, a second crossing family fading in where the
    // tone falls below ~0.45 (the source cross-hatches the beanie's shaded side)
    float c = 1.0 - sqrt(max(0.0, 1.0 - v));
    float r1 = family(px, ang, sp, v * (1.0 + 0.35 * smoothstep(0.6, 1.0, v)), 1.0, 0.0);
    float xh = 1.0 - smoothstep(0.3, 0.48, v);
    white = mix(r1, max(family(px, ang, sp, c, 1.0, 0.0), family(px, ang + 1.1, sp * 1.15, c * 0.9, 1.0, 0.0)), xh);
  } else if (style == 4.0) {
    white = family(px, ang, sp, v, 1.0, 1.0);
  } else {
    // the line family's mean white falls short of v near white (its widest rows clip): lift the top end
    // (by more on fine spacings, whose anti-aliasing ramp is a larger part of a period)
    white = family(px, ang, sp, v * (1.0 + (0.3 + 2.2 / sp) * smoothstep(0.6, 1.0, v)), 1.0, 0.0);
  }
  // the faint glow in the dark background is a smooth tone, not lines
  white = mix(v, white, kc * smoothstep(0.07, 0.15, v));
  // the lit areas are clean paper (fix 1): above flatLo the cut lines fade into the flat tone, with a fine seeded
  // stipple (a speck of about a pixel, denser where the tone is lower) instead of the line pattern
  if ((style <= 1.0 || style == 7.0) && flatHi > flatLo) {
    float fl = smoothstep(flatLo, flatHi, v);
    float sp = h21(floor(px) + seed * 3.7);
    float speck = step(sp, stip * (0.02 + 0.6 * max(0.0, 1.0 - v)) * fl);
    white = mix(white, v, fl) * (1.0 - 0.22 * speck);
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

export function engraveCanvases(valC, dirC, { spacing = 5, seed = 1, contrast = 1, ink = 1, flatLo = 2, flatHi = 2, stip = 0, blackLo = 0 } = {}, out = null) {
  const { c, gl, pr, tVal, tDir } = gl2();
  const w = valC.width, h = valC.height;
  c.width = w; c.height = h;
  gl.viewport(0, 0, w, h);
  gl.useProgram(pr);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tVal); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, valC);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tDir);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, dirC);
  gl.uniform1i(gl.getUniformLocation(pr, "val"), 0);
  gl.uniform1i(gl.getUniformLocation(pr, "dir"), 1);
  gl.uniform2f(gl.getUniformLocation(pr, "res"), w, h);
  gl.uniform1f(gl.getUniformLocation(pr, "spacing"), spacing);
  gl.uniform1f(gl.getUniformLocation(pr, "seed"), seed);
  gl.uniform1f(gl.getUniformLocation(pr, "contrast"), contrast);
  gl.uniform1f(gl.getUniformLocation(pr, "ink"), ink);
  gl.uniform1f(gl.getUniformLocation(pr, "flatLo"), flatLo);
  gl.uniform1f(gl.getUniformLocation(pr, "flatHi"), flatHi);
  gl.uniform1f(gl.getUniformLocation(pr, "stip"), stip);
  gl.uniform1f(gl.getUniformLocation(pr, "blackLo"), blackLo);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  if (!out) out = document.createElement("canvas");
  if (out.width !== w || out.height !== h) { out.width = w; out.height = h; }
  const og = out.getContext("2d");
  og.setTransform(1, 0, 0, 1, 0, 0);
  og.clearRect(0, 0, w, h);
  og.drawImage(c, 0, 0);
  return out;
}

// the direction map is painted without anti-aliasing: regions are rasterised into an ImageData by even-odd scanline
// fill (a pixel belongs to the region whose outline contains its centre), so no blended directions appear on seams
export function rasterRegions(w, h, regions, ox = 0, oy = 0, init = [0, 128, 0]) {
  const img = new ImageData(w, h), d = img.data;
  for (let i = 0; i < w * h; i++) { d[4 * i] = init[0]; d[4 * i + 1] = init[1]; d[4 * i + 2] = init[2]; d[4 * i + 3] = 255; }
  for (const { rings, rgb } of regions) {
    // edges
    const E = [];
    let y0 = Infinity, y1 = -Infinity;
    for (const r of rings) {
      const n = r.length / 2;
      for (let k = 0; k < n; k++) {
        const ax = r[2 * k] + ox, ay = r[2 * k + 1] + oy, bx = r[2 * ((k + 1) % n)] + ox, by = r[2 * ((k + 1) % n) + 1] + oy;
        if (ay === by) continue;
        E.push(ay < by ? [ax, ay, bx, by] : [bx, by, ax, ay]);
        y0 = Math.min(y0, ay, by); y1 = Math.max(y1, ay, by);
      }
    }
    const ya = Math.max(0, Math.ceil(y0 - 0.5)), yb = Math.min(h - 1, Math.floor(y1 - 0.5));
    const xs = [];
    for (let y = ya; y <= yb; y++) {
      const yc = y + 0.5; xs.length = 0;
      for (const e of E) if (yc >= e[1] && yc < e[3]) xs.push(e[0] + ((yc - e[1]) * (e[2] - e[0])) / (e[3] - e[1]));
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(0, Math.ceil(xs[k] - 0.5)), xb = Math.min(w - 1, Math.floor(xs[k + 1] - 0.5));
        for (let x = xa; x <= xb; x++) { const p = 4 * (y * w + x); d[p] = rgb[0]; d[p + 1] = rgb[1]; d[p + 2] = rgb[2]; }
      }
    }
  }
  return img;
}

// k = line contrast 1 (full) .. 1/16
export const dirRGB = (angle, spacing = 0.35, style = 0, k = 1) => {
  let a = angle % Math.PI; if (a < 0) a += Math.PI;
  const c = Math.max(0, Math.min(15, Math.round((1 - k) * 16)));
  return [Math.round((a / Math.PI) * 255), Math.round(Math.max(0, Math.min(1, spacing)) * 255), style + 16 * c];
};
