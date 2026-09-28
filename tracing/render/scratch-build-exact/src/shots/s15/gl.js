// s15 corridor renderer: a small WebGL2 engine that draws the box corridor as engraved 3D geometry.
// Every face carries its own engraving (white knife lines in the face's own world-unit plane, so the cuts stay glued
// to the surface as the camera flies past), lit by a lamp at the camera and a glow round the owl; far away everything
// falls to black. A frame is the average of several sub-frames along the camera path (the source's heavy motion blur).
//
// Geometry: faces = { q: [p0,p1,p2,p3] (u,v = 0,0 / 1,0 / 1,1 / 0,1), n, su, sv (world size), atlas rect, albedo,
//                     angle (stroke direction in face uv), spacing (world units between cuts), style, ink }
//   style 0 = engraved lines, 1 = flat tone (atlas picture shown as is), 2 = cross-hatch
const VS = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec2 aW; layout(location=3) in vec2 aT;
layout(location=4) in vec4 aA; layout(location=5) in vec4 aQ; layout(location=6) in vec4 aS;
uniform mat4 uVP;
out vec3 vP; out vec3 vN; out vec2 vW; out vec2 vT; out vec4 vA; out vec4 vQ; out vec4 vS;
void main(){ vP = aP; vN = aN; vW = aW; vT = aT; vA = aA; vQ = aQ; vS = aS; gl_Position = uVP * vec4(aP, 1.0); }`;

const FS = `#version 300 es
precision highp float;
in vec3 vP; in vec3 vN; in vec2 vW; in vec2 vT; in vec4 vA; in vec4 vQ; in vec4 vS;
uniform sampler2D uAtlas; uniform vec3 uCam; uniform vec3 uOwl; uniform vec4 uLight; uniform vec4 uLight2; uniform float uSeed; uniform vec4 uTex; uniform vec4 uGrade; uniform vec4 uFace;
out vec4 o;
float h21(vec2 p){ p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y);
}
// one family of knife cuts in face space (p in world units); returns coverage of white, and the line density
float family(vec2 p, float ang, float sp, float w, float seed, out float dens){
  vec2 n = vec2(-sin(ang), cos(ang)), t = vec2(cos(ang), sin(ang));
  float c = dot(p, n) / sp;
  float al = dot(p, t) / sp;
  c += (vnoise(vec2(al * 0.05, c * 0.05) + seed) - 0.5) * 0.5 + (vnoise(vec2(al * 0.4, c * 0.9) + seed * 1.7) - 0.5) * 0.22;
  float row = floor(c);
  float rh = h21(vec2(row, seed));
  float brk = vnoise(vec2(al / (4.0 + rh * 7.0) + rh * 40.0, row * 3.1));
  float ww = w * (0.75 + 0.5 * rh);
  ww = clamp(ww + (brk - 0.5) * 0.9 * (1.0 - w) * min(1.0, w * 3.0), 0.0, 1.0);
  float f = abs(fract(c) - 0.5) * 2.0;
  dens = fwidth(c);
  float aa = max(dens * 1.2, 0.03);
  return (1.0 - smoothstep(ww - aa, ww + aa, f)) * smoothstep(0.0, 0.05, ww);
}
void main(){
  vec3 n = normalize(vN);
  vec3 tc = uCam - vP; float d = length(tc);
  float facing = abs(dot(n, tc / d));
  bool isFloor = vQ.w < 0.01;
  // the lamp is low (at the owl's height): high stacks fall into black
  // lamp at the camera: soft falloff with distance; grazing faces a little darker
  float fall = 1.0 / (1.0 + pow(max(d - uLight.y, 0.0) / uLight.x, uLight.z));
  float L = fall * mix(1.0 - uLight.w, 1.0, facing);
  if (!isFloor) L *= mix(uFace.x, 1.0, clamp(-n.z, 0.0, 1.0)) * (n.y > 0.5 ? uFace.y : 1.0);
  else L *= uFace.z;
  L *= mix(1.0, 0.12, smoothstep(0.85, 1.9, vP.y));
  // contact shadow at the foot of every vertical face, a thinner one under its top edge
  if (abs(n.y) < 0.5) L *= mix(0.45, 1.0, smoothstep(0.0, 0.14, vT.y)) * mix(0.7, 1.0, smoothstep(0.0, 0.05, 1.0 - vT.y));
  // glow round the owl (the light the bird carries into the corridor), strongest on the floor under it
  vec3 to = vP - uOwl; float dd = dot(to, to);
  float gl = exp(-dd / (uLight2.y * uLight2.y));
  L += (isFloor ? uFace.w : uLight2.x) * gl * mix(0.5, 1.0, max(dot(n, -normalize(to)), 0.0));
  vec4 tex = texture(uAtlas, vA.xy + clamp(vT, 0.002, 0.998) * vA.zw);
  float v = clamp(vQ.x * tex.r * L * uGrade.x, 0.0, 1.0);
  v = pow(v, uGrade.y);
  float white;
  float style = vS.w;
  if (style > 0.5 && style < 1.5) {
    white = v;
  } else {
    // charcoal-like engraving: fine broken dark strokes along the face (strongest in the mid tones, none on
    // bright faces), over a soft mottled tone
    float sd = uSeed + vS.z * 1.37;
    vec2 nn = vec2(-sin(vQ.y), cos(vQ.y)), tt = vec2(cos(vQ.y), sin(vQ.y));
    float c = dot(vW, nn) / vQ.z, al = dot(vW, tt) / vQ.z;
    float dens = fwidth(c);
    float cw = c + (vnoise(vec2(al * 0.04, c * 0.04) + sd) - 0.5) * 0.6 + (vnoise(vec2(al * 0.3, c * 0.7) + sd * 1.7) - 0.5) * 0.25;
    float row = floor(cw), rh = h21(vec2(row, sd));
    float f = abs(fract(cw) - 0.5) * 2.0;
    float brk = vnoise(vec2(al / (3.0 + rh * 6.0) + rh * 40.0, row * 3.1));
    float lw = uTex.x * (0.5 + 0.9 * rh) * smoothstep(0.25, 0.75, brk);
    float aa = max(dens * 1.3, 0.05);
    float ln = (1.0 - smoothstep(lw - aa, lw + aa, f)) * (1.0 - smoothstep(0.3, 0.75, dens)) * smoothstep(0.035, 0.1, dens);
    float k = uTex.y * (1.0 - smoothstep(0.55, 0.95, v)) * smoothstep(0.0, 0.1, v) * (isFloor ? 1.3 : 1.0);
    float m = (vnoise(vec2(al * 0.02 + sd * 2.3, c * 0.18)) - 0.5) * uTex.z + (vnoise(vec2(al * 0.006 + sd * 5.1, c * 0.04)) - 0.5) * uTex.w;
    white = clamp((v + m * (1.0 - v * 0.45)) * (1.0 - ln * k), 0.0, 1.0);
  }
  // ink drawn into the atlas (dark marks: handle holes, tape edges, keys) and the inked box edges
  white *= 1.0 - tex.g;
  white = max(white, tex.b * v * 1.6);
  vec2 e = min(vT, 1.0 - vT) * vS.xy;
  float ed = min(e.x, e.y);
  float pw = fwidth(ed);
  if (!isFloor) {
    // inked edges: a world-width band (~7 mm) that never gets thinner than ~2 px
    float ew = max(0.006 * vQ.w, pw * 2.0 * vQ.w);
    float edge = smoothstep(ew * 0.55, ew * 1.1, ed);
    white *= mix(uLight2.w, 1.0, edge);
  }
  o = vec4(vec3(white), 1.0);
}`;

const VS_Q = `#version 300 es
layout(location=0) in vec2 p; out vec2 uv;
void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
const FS_ADD = `#version 300 es
precision highp float; in vec2 uv; uniform sampler2D src; uniform float wgt; out vec4 o;
void main(){ o = vec4(texture(src, uv).rgb * wgt, wgt); }`;
const FS_OUT = `#version 300 es
precision highp float; in vec2 uv; uniform sampler2D src; out vec4 o;
void main(){ vec3 c = texture(src, uv).rgb; o = vec4(c, 1.0); }`;

const FLOATS = 24;   // per vertex: pos3 nrm3 uvw2 uvt2 atlas4 par4 size4 (+2 pad)

export class CorridorGL {
  constructor(W, H) {
    this.W = W; this.H = H;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const gl = c.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false, premultipliedAlpha: false, alpha: false });
    if (!gl) throw new Error("s15: WebGL2 unavailable");
    this.c = c; this.gl = gl;
    this.half = !!gl.getExtension("EXT_color_buffer_float");
    const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x)); return x; };
    const prog = (v, f) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, v)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, f)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
    this.pScene = prog(VS, FS); this.pAdd = prog(VS_Q, FS_ADD); this.pOut = prog(VS_Q, FS_OUT);
    this.U = {}; for (const n of ["uVP", "uAtlas", "uCam", "uOwl", "uLight", "uLight2", "uSeed", "uTex", "uGrade", "uFace"]) this.U[n] = gl.getUniformLocation(this.pScene, n);
    // quad
    this.qvao = gl.createVertexArray(); gl.bindVertexArray(this.qvao);
    const qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    // targets: scene (RGBA8 + depth), accumulator (half float if possible)
    const tex = (ifmt, fmt, type) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, W, H, 0, fmt, type, null); for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.NEAREST], [gl.TEXTURE_MAG_FILTER, gl.NEAREST], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t; };
    this.tScene = tex(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
    this.fScene = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.fScene);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tScene, 0);
    const rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, W, H);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
    this.tAcc = this.half ? tex(gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT) : tex(gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE);
    this.fAcc = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, this.fAcc);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.tAcc, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    this.sets = new Map();
    this.atlas = null;
  }
  setAtlas(canvas) {
    const gl = this.gl;
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.atlas = t;
  }
  // Upload one set of faces (a sub-shot's scenery) as a static buffer.
  upload(key, faces) {
    const gl = this.gl;
    const data = new Float32Array(faces.length * 6 * FLOATS);
    let k = 0;
    for (const f of faces) {
      const [p0, p1, p2, p3] = f.q;
      const n = f.n;
      const uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
      const P = [p0, p1, p2, p3];
      const ox = f.uo || 0, oy = f.vo || 0;
      for (const i of [0, 1, 2, 0, 2, 3]) {
        const p = P[i], t = uv[i];
        data.set([p[0], p[1], p[2], n[0], n[1], n[2], t[0] * f.su + ox, t[1] * f.sv + oy, t[0], t[1],
          f.at[0], f.at[1], f.at[2], f.at[3], f.alb, f.ang ?? 0, f.sp ?? 0.006, f.ink ?? 1,
          f.su, f.sv, f.seed ?? 0, f.style ?? 0, 0, 0], k);
        k += FLOATS;
      }
    }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const S = FLOATS * 4;
    const attr = (loc, n, off) => { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, S, off * 4); };
    attr(0, 3, 0); attr(1, 3, 3); attr(2, 2, 6); attr(3, 2, 8); attr(4, 4, 10); attr(5, 4, 14); attr(6, 4, 18);
    gl.bindVertexArray(null);
    const old = this.sets.get(key);
    if (old) { gl.deleteVertexArray(old.vao); gl.deleteBuffer(old.b); }
    this.sets.set(key, { vao, b, n: faces.length * 6 });
  }
  // Render `subs` = [{ key, vp (Float32Array 16), cam [x,y,z], owl [x,y,z], light, light2 }] averaged; returns the canvas.
  render(subs, seed = 1) {
    const gl = this.gl, W = this.W, H = this.H;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fAcc);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    const w = 1 / subs.length;
    for (const s of subs) {
      const set = this.sets.get(s.key);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fScene);
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (set) {
        gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.BLEND);
        gl.useProgram(this.pScene);
        gl.uniformMatrix4fv(this.U.uVP, false, s.vp);
        gl.uniform3fv(this.U.uCam, s.cam); gl.uniform3fv(this.U.uOwl, s.owl);
        gl.uniform4fv(this.U.uLight, s.light); gl.uniform4fv(this.U.uLight2, s.light2);
        gl.uniform1f(this.U.uSeed, seed); gl.uniform4fv(this.U.uTex, s.tex ?? [0.26, 0.85, 0.24, 0.18]); gl.uniform4fv(this.U.uGrade, s.grade ?? [1.38, 1.3, 0, 0]); gl.uniform4fv(this.U.uFace, s.face ?? [0.45, 1.25, 0.5, 0.8]);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.atlas); gl.uniform1i(this.U.uAtlas, 0);
        gl.bindVertexArray(set.vao); gl.drawArrays(gl.TRIANGLES, 0, set.n);
        gl.disable(gl.DEPTH_TEST);
      }
      // add into the accumulator
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fAcc);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(this.pAdd);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tScene);
      gl.uniform1i(gl.getUniformLocation(this.pAdd, "src"), 0);
      gl.uniform1f(gl.getUniformLocation(this.pAdd, "wgt"), w);
      gl.bindVertexArray(this.qvao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.disable(gl.BLEND);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.useProgram(this.pOut);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tAcc);
    gl.uniform1i(gl.getUniformLocation(this.pOut, "src"), 0);
    gl.bindVertexArray(this.qvao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindVertexArray(null);
    return this.c;
  }
  dispose() {
    const ext = this.gl.getExtension("WEBGL_lose_context");
    if (ext) ext.loseContext();
    this.sets.clear();
  }
}

// ---------------------------------------------------------------- camera
// eye [x,y,z], yaw (+ turns right), pitch (+ up), roll (+ clockwise on screen), vertical fov (deg).
export function camMatrix(eye, yaw, pitch, roll, fov, W, H, near = 0.02, far = 60) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const f = [sy * cp, sp, cy * cp];
  let r = [cy, 0, -sy];
  let u = [-sy * sp, cp, -cy * sp];
  const cr = Math.cos(roll), sr = Math.sin(roll);
  const r2 = [r[0] * cr - u[0] * sr, r[1] * cr - u[1] * sr, r[2] * cr - u[2] * sr];
  const u2 = [r[0] * sr + u[0] * cr, r[1] * sr + u[1] * cr, r[2] * sr + u[2] * cr];
  r = r2; u = u2;
  const t = Math.tan((fov * Math.PI) / 360);
  const fy = 1 / t, fx = fy / (W / H);
  const A = (far + near) / (far - near), B = (-2 * far * near) / (far - near);
  const dx = -(r[0] * eye[0] + r[1] * eye[1] + r[2] * eye[2]);
  const dy = -(u[0] * eye[0] + u[1] * eye[1] + u[2] * eye[2]);
  const dz = -(f[0] * eye[0] + f[1] * eye[1] + f[2] * eye[2]);
  // column-major: clip = P * V * p ; rows: x = fx*(r.p+dx), y = fy*(u.p+dy), z = A*(f.p+dz)+B, w = f.p+dz
  const m = new Float32Array(16);
  m[0] = fx * r[0]; m[4] = fx * r[1]; m[8] = fx * r[2]; m[12] = fx * dx;
  m[1] = fy * u[0]; m[5] = fy * u[1]; m[9] = fy * u[2]; m[13] = fy * dy;
  m[2] = A * f[0]; m[6] = A * f[1]; m[10] = A * f[2]; m[14] = A * dz + B;
  m[3] = f[0]; m[7] = f[1]; m[11] = f[2]; m[15] = dz;
  const k = (H / 2) / t;
  const project = (p) => {
    const d = [p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]];
    const z = d[0] * f[0] + d[1] * f[1] + d[2] * f[2];
    return [W / 2 + ((d[0] * r[0] + d[1] * r[1] + d[2] * r[2]) * k) / z, H / 2 - ((d[0] * u[0] + d[1] * u[1] + d[2] * u[2]) * k) / z, z];
  };
  return { m, project, f, r, u, k };
}
