// The finishing grade, ported from the film's own finish pass (finish2.py):
// halation (screen-blended soft copy of the highlights), a gentle filmic S-curve,
// a vignette, a breath of exposure flicker, fine moving grain, and fades.
const VS = `
attribute vec2 p; varying vec2 uv;
void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FS_HI = `
precision highp float; varying vec2 uv; uniform sampler2D src; uniform vec2 texel;
void main(){
  // box-average a 4x4 block (INTER_AREA downsample), then keep only what is above ~120/255
  vec3 s = vec3(0.0);
  for (int j = 0; j < 4; j++) for (int i = 0; i < 4; i++)
    s += texture2D(src, uv + (vec2(float(i), float(j)) - 1.5) * texel).rgb;
  s /= 16.0;
  vec3 hl = clamp((s - 120.0/255.0) / (135.0/255.0), 0.0, 1.0) * s;
  gl_FragColor = vec4(hl, 1.0);
}`;

const FS_BLUR = `
precision highp float; varying vec2 uv; uniform sampler2D src; uniform vec2 dir; uniform float sigma;
void main(){
  vec3 acc = vec3(0.0); float wsum = 0.0;
  for (int k = -48; k <= 48; k++) {
    float x = float(k);
    if (abs(x) > sigma * 3.0) continue;
    float w = exp(-0.5 * x * x / (sigma * sigma));
    acc += texture2D(src, uv + dir * x).rgb * w; wsum += w;
  }
  gl_FragColor = vec4(acc / wsum, 1.0);
}`;

const FS_FINAL = `
precision highp float; varying vec2 uv;
uniform sampler2D src; uniform sampler2D b5; uniform sampler2D b16;
uniform float t; uniform float frame; uniform float fade; uniform vec2 res;
uniform float halo; uniform float grainAmt;
float h(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
float gauss(vec2 p){ // ~N(0,1) from four hashes (Irwin-Hall), decorrelated per frame
  float s = h(p + frame * 1.37) + h(p * 1.13 + 7.1 + frame * 2.11) + h(p * 0.87 + 3.3 + frame * 0.73) + h(p * 1.31 + 11.7 + frame * 1.91);
  return (s - 2.0) * 1.732;
}
void main(){
  vec3 f = texture2D(src, uv).rgb;
  // halation: screen blend with 0.5 * soft highlights
  vec3 hb = 0.6 * texture2D(b5, uv).rgb + 0.4 * texture2D(b16, uv).rgb;
  f = 1.0 - (1.0 - f) * (1.0 - halo * hb);
  // filmic S-curve
  f = f * (1.0 - 0.35) + 0.35 * (f * f * (3.0 - 2.0 * f));
  // vignette
  vec2 q = (uv - 0.5) * 2.0;
  float r = clamp((q.x * q.x + q.y * q.y) / 2.0, 0.0, 1.0);
  f *= 1.0 - 0.38 * pow(r, 1.15);
  // exposure flicker
  f *= 1.0 + 0.018 * sin(t * 6.2831853 * 0.9) + 0.012 * sin(t * 6.2831853 * 2.3 + 1.0);
  // grain: softly blurred gaussian, a little stronger in the midtones
  vec2 px = uv * res;
  float n = (gauss(px) * 0.4 + gauss(px + vec2(1.0, 0.0)) * 0.2 + gauss(px + vec2(0.0, 1.0)) * 0.2 + gauss(px + vec2(1.0, 1.0)) * 0.2);
  float L = (f.r + f.g + f.b) / 3.0;
  f += n * grainAmt * (0.55 + 0.45 * (1.0 - abs(2.0 * L - 1.0)));
  f *= fade;
  gl_FragColor = vec4(clamp(f, 0.0, 1.0), 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function program(gl, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, VS));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, "p");
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}
function target(gl, w, h) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return { tex, fb, w, h };
}

export function createPost(canvas) {
  const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false });
  const W = canvas.width, H = canvas.height, qw = Math.round(W / 4), qh = Math.round(H / 4);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const pHi = program(gl, FS_HI), pBlur = program(gl, FS_BLUR), pFin = program(gl, FS_FINAL);
  const srcTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, srcTex);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const hi = target(gl, qw, qh), tA = target(gl, qw, qh), b5 = target(gl, qw, qh), b16 = target(gl, qw, qh);

  const draw = (prog, out, uniforms) => {
    gl.useProgram(prog);
    gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.fb : null);
    gl.viewport(0, 0, out ? out.w : W, out ? out.h : H);
    let unit = 0;
    for (const [name, v] of Object.entries(uniforms)) {
      const loc = gl.getUniformLocation(prog, name);
      if (v && v.tex !== undefined) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, v.tex); gl.uniform1i(loc, unit++); }
      else if (Array.isArray(v)) gl.uniform2f(loc, v[0], v[1]);
      else gl.uniform1f(loc, v);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  const blur = (from, sigma) => {
    draw(pBlur, tA, { src: from, dir: [1 / qw, 0], sigma });
    const out = sigma < 10 ? b5 : b16;
    draw(pBlur, out, { src: tA, dir: [0, 1 / qh], sigma });
  };

  return function grade(paint, t, opts = {}) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, srcTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, paint);
    const src = { tex: srcTex };
    draw(pHi, hi, { src, texel: [1 / W, 1 / H] });
    blur(hi, 5);
    blur(hi, 16);
    draw(pFin, null, {
      src, b5, b16, t, frame: Math.round(t * 25), fade: opts.fade ?? 1, res: [W, H],
      halo: opts.halo ?? 0.5, grainAmt: opts.grain ?? 6.0 / 255.0,
    });
  };
}
