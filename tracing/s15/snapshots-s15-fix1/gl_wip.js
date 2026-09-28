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
layout(location=4) in vec4 aA; layout(location=5) in vec4 aQ; layout(location=6) in vec4 aS; layout(location=7) in vec4 aV; layout(location=8) in vec4 aH;
layout(location=9) in vec4 aE; layout(location=10) in vec4 aD;
uniform mat4 uVP;
out vec3 vP; out vec3 vN; out vec2 vW; out vec2 vT; out vec4 vA; out vec4 vQ; out vec4 vS; out vec4 vV; out vec4 vH; out vec4 vE; out vec4 vD;
void main(){ vP = aP; vN = aN; vW = aW; vT = aT; vA = aA; vQ = aQ; vS = aS; vV = aV; vH = aH; vE = aE; vD = aD; gl_Position = uVP * vec4(aP, 1.0); }`;

const FS = `#version 300 es
precision highp float;
in vec3 vP; in vec3 vN; in vec2 vW; in vec2 vT; in vec4 vA; in vec4 vQ; in vec4 vS; in vec4 vV; in vec4 vH; in vec4 vE; in vec4 vD;
uniform sampler2D uAtlas; uniform vec3 uCam; uniform vec3 uOwl; uniform vec4 uLight; uniform vec4 uLight2; uniform float uSeed; uniform vec4 uTex; uniform vec4 uGrade; uniform vec4 uFace;
uniform vec4 uFloor; uniform vec4 uFloor2;
// pass 4: the measured floor (roto takes): node values on a coarse screen grid (13 x 7), bilinear between nodes
uniform float uFG[91]; uniform float uFGx[13]; uniform float uFGy[7]; uniform vec4 uFGd;
out vec4 o;
float fgrid(vec2 p){
  int ix = 0, iy = 0;
  for (int i = 0; i < 11; i++) if (p.x >= uFGx[i + 1]) ix = i + 1;
  for (int j = 0; j < 5; j++) if (p.y >= uFGy[j + 1]) iy = j + 1;
  float fx = clamp((p.x - uFGx[ix]) / max(1.0, uFGx[ix + 1] - uFGx[ix]), 0.0, 1.0);
  float fy = clamp((p.y - uFGy[iy]) / max(1.0, uFGy[iy + 1] - uFGy[iy]), 0.0, 1.0);
  float a = uFG[iy * 13 + ix], b = uFG[iy * 13 + ix + 1], c = uFG[(iy + 1) * 13 + ix], d = uFG[(iy + 1) * 13 + ix + 1];
  return mix(mix(a, b, fx), mix(c, d, fx), fy);
}
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
// dark hatch lines at octave k: rows at integer multiples of 2^-k (world line spacing / 2^k); coarse rows survive
// into the finer octave; breaks and widths hashed per row
float hatch(float c0, float al0, float k, float sd, float wid){
  float s = exp2(k);
  float c = c0 * s, al = al0 * s;
  float row = floor(c + 0.5);
  float rh = h21(vec2(row / s, sd));
  float f = abs(c - row) * 2.0;
  float brk = vnoise(vec2(al / (1.5 + rh * 4.0) + rh * 40.0, row * 3.1));
  float lw = wid * (0.55 + 0.9 * rh) * smoothstep(0.25, 0.6, brk);
  float aa = max(fwidth(c) * 1.2, 0.06);
  return (1.0 - smoothstep(lw - aa, lw + aa, f));
}
// fix pass 5 (review 1): long charcoal strokes for the roto faces. Rows ~uTex.w px apart on screen (octaves as in
// hatch); along each row the strokes are long (20-50 row spacings, 75-98% of their period drawn, so the gaps are
// short), taper only over their last ~8% at either end, swell and thin along their length, drift a little across the
// row, and get heavier in the shade (dk = 0..1)
float stroke(float c0, float al0, float k, float sd, float wid, float dk, float dc0){
  float s = exp2(k);
  float c = c0 * s, al = al0 * s;
  float row = floor(c + 0.5);
  float rh = h21(vec2(row / s, sd)), rh2 = h21(vec2(row / s + 7.3, sd * 1.9));
  float L = 20.0 + 30.0 * rh;
  float x = al / L + rh2 * 13.0;
  float ci = floor(x), fx = fract(x);
  float ch = h21(vec2(ci, row + sd * 3.0)), ch2 = h21(vec2(ci * 1.3 + 2.0, row * 0.7 + sd));
  float len = 0.75 + 0.23 * ch2;
  float t = fx / len;
  float inD = 1.0 - step(1.0, t);
  // (brush wedge: heavy at the start, thinning toward the end, either way round; soft ends over the last ~8%)
  float tt = ch > 0.5 ? t : 1.0 - t;
  float taper = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.92, 1.0, t)) * mix(1.0, 0.4, tt * tt);
  float sw = vnoise(vec2(al / (5.0 + 7.0 * rh) + rh * 40.0, row * 3.1 + ci));
  float off = (vnoise(vec2(al * 0.025 + rh2 * 9.0, row * 1.7)) - 0.5) * 0.4 + (rh2 - 0.5) * 0.2;
  float f = abs(c - row - off) * 2.0;
  float lw = wid * (0.45 + 0.8 * rh) * (0.45 + 0.8 * sw) * dk * taper;
  float aa = max(dc0 * s * 1.6, 0.1);
  return inD * (1.0 - smoothstep(lw - aa, lw + aa, f)) * clamp(lw / aa, 0.0, 1.0) * (0.75 + 0.25 * ch2);
}
// broken charcoal ink along a face edge: 1 = full ink at the edge. edPx = px from the edge, along = px along it
float edgeInk(float edPx, float along, float side, float sd, float ink){
  float n1 = vnoise(vec2(along / 38.0 + side * 17.0 + sd, sd * 0.3 + side));
  float n2 = vnoise(vec2(along / 95.0 + side * 5.0 + sd * 0.7, sd * 1.7 + 3.0));
  float wpx = (2.0 + 4.0 * n1) * ink;
  float lift = smoothstep(0.62, 0.9, n2);            // breaks: the ink lifts off here and there
  float core = 1.0 - smoothstep(wpx * 0.5, wpx * 1.15, edPx);
  return core * (1.0 - 0.75 * lift) * (0.75 + 0.25 * n1);
}
void main(){
  vec3 n = normalize(vN);
  vec3 tc = uCam - vP; float d = length(tc);
  float facing = abs(dot(n, tc / d));
  bool isFloor = vQ.w < 0.01 && n.y > 0.5;
  // Light (fix pass 1): the glowing owl carries the light into the corridor. Faces turned toward the bird are lit pale
  // (box fronts beyond it, the corridor sides it runs past), faces turned away (fronts of the stacks the camera passes
  // before reaching the owl) fall into shade and take the hatching; a weak fill rides with the camera; everything
  // fades to black with distance from the lens (the black void ahead) and up the stacks.
  vec3 lo = uOwl - vP; float dl = length(lo); lo /= max(dl, 1e-4);
  float fo = 1.0 / (1.0 + pow(dl / uLight2.y, uLight2.z));
  float wrap = clamp(dot(n, lo) * 0.5 + 0.5, 0.0, 1.0);
  wrap = pow(wrap, uFace.w);
  float key = uLight2.x * fo * (isFloor ? uFace.z : wrap);
  float fc = 1.0 / (1.0 + pow(max(d - uLight.y, 0.0) / uLight.x, uLight.z));
  float fill = uFace.x * fc * mix(0.55, 1.0, facing);
  float L = (key + fill) * fc * (n.y > 0.5 && !isFloor ? uFace.y : 1.0);
  float hf = uLight.w > 0.0 ? uLight.w : 0.8;
  L *= mix(1.0, 0.1, smoothstep(hf, hf + 1.1 + hf * 0.6, vP.y));
  // contact shadow at the foot of every vertical face, a thinner one under its top edge
  if (abs(n.y) < 0.5) L *= mix(0.5, 1.0, smoothstep(0.0, 0.12, vT.y)) * mix(0.75, 1.0, smoothstep(0.0, 0.04, 1.0 - vT.y));
  vec4 tex = texture(uAtlas, vA.xy + clamp(vT, 0.002, 0.998) * vA.zw);
  float v = clamp(vQ.x * tex.r * L * uGrade.x, 0.0, 1.0);
  v = pow(v, uGrade.y);
  // a measured face value (keyed boxes: the brightness of this face in the source frame) replaces the lighting;
  // the surface picture still modulates it, and it keeps the contact shadows
  // fix pass 3: the continuous floor (marker value -2): one smooth value field over the whole floor (no per-tile
  // values): a pool of light round the owl's feet [uFloor.x at its centre, radius uFloor.y] over a base value
  // uFloor.z, fading to black by uFloor.w units ahead of the lens; the board grain comes from the hatching below
  // (rows of constant z in world units, so it runs on unbroken across the tiles)
  if (vV.x < -1.5) {
    vec2 dq = (vP.xz - uOwl.xz) * vec2(1.0, uFloor2.z);
    float pool = exp(-dot(dq, dq) / max(1e-4, uFloor.y * uFloor.y));
    float dz = vP.z - uCam.z;
    float fall = 1.0 - smoothstep(uFloor.w * 0.3, uFloor.w, dz);
    float mv = mix(uFloor.z, uFloor.x, pool) * fall * (1.0 + (vnoise(vP.xz * vec2(1.3, 0.9) + 3.0) - 0.5) * 0.35);
    if (uFGd.z > 0.5) mv = fgrid(vec2(gl_FragCoord.x, uFGd.w - gl_FragCoord.y)) * (1.0 + (vnoise(vP.xz * vec2(1.3, 0.9) + 3.0) - 0.5) * 0.2);
    // (uFloor2.w: how far the floor has dimmed, 0 = not at all; pass 4, the end of take J)
    v = clamp(mv * (0.8 + 0.4 * vnoise(vec2(vP.x * 5.0, vP.z * 60.0))) * (1.0 - uFloor2.w), 0.0, 1.0);
  }
  // (markers: -1 = lit by the shader, -2 = the continuous floor; measured corner values may dip a little below 0)
  if (vV.x > -0.95) {
    // corner values (u,v) = (0,0), (1,0), (1,1), (0,1), bilinear over the face
    float mv = mix(mix(vV.x, vV.y, vT.x), mix(vV.w, vV.z, vT.x), vT.y);
    // (roto faces, flagged by vQ.y = 1, often run off-frame: no contact shadow in face units there)
    float cs = abs(n.y) < 0.5 && vQ.y < 0.5 ? mix(0.6, 1.0, smoothstep(0.0, 0.12, vT.y)) : 1.0;
    // (roto faces: vQ.x = 0.88 / the picture's mean value, so a dark picture keeps the measured mean brightness)
    v = clamp(mv * (tex.r / 0.88) * (vQ.y > 6.5 ? vQ.x : 1.0) * cs * uGrade.z, 0.0, 1.0);
  }
  float white;
  float style = vS.w;
  float sd = uSeed + vS.z * 1.37;
  // fine grain glued to the surface (static: the drawing does not boil)
  float grain = (vnoise(vW * 330.0 + sd * 3.1) - 0.5) * 0.1 + (vnoise(vW * 61.0 + sd) - 0.5) * 0.06;
  bool roto = vQ.y > 6.5;
  if (style > 0.5 && style < 1.5) {
    white = v;
  } else if (roto) {
    // pass 4: roto faces (the source's box faces, measured): rubbed charcoal tone (soft blotches in the face's own
    // uv), dashed hand strokes along the face's u where it is in shade, rubbed lighter between them
    vec2 fu = vT;
    float sm = (vnoise(fu * vec2(3.0, 2.2) + sd * 1.3) - 0.5) * 0.34 + (vnoise(fu * vec2(9.0, 6.0) + sd * 2.1) - 0.5) * 0.16;
    // (vH.x: the stroke direction measured on the source face, as an angle in the face's uv; vH.y: measured hatch gain)
    vec2 ru = vec2(cos(vH.x), sin(vH.x));
    vec2 wr = vec2(dot(vW, ru), dot(vW, vec2(-ru.y, ru.x)));
    float c0 = wr.y / vQ.z, al0 = wr.x / vQ.z;
    c0 += (vnoise(vec2(al0 * 0.03, c0 * 0.05) + sd) - 0.5) * 0.9;
    float d0 = max(fwidth(c0), 1e-5);
    float lv = -log2(d0 * uTex.w);
    float k0 = floor(lv), fr = lv - k0;
    // (fix 1: stroke weight follows the shade: dk 1 in the dark, ~0.4 on the lit faces)
    float dk = 0.4 + 0.6 * (1.0 - smoothstep(0.08, 0.7, v));
    // (the two octaves are blended by max with overlapping weights, not mixed: a plain mix halves the ink of every
    // stroke mid-way between octaves and leaves a grey haze of faint lines)
    float ln = max(stroke(c0, al0, k0, sd, uTex.x, dk, d0) * clamp(2.0 - 2.0 * fr, 0.0, 1.0), stroke(c0, al0, k0 + 1.0, sd, uTex.x, dk, d0) * clamp(2.0 * fr, 0.0, 1.0));
    // the cross strokes of the darkest faces (the source cross-hatches its deep shade): a second family at right
    // angles, fading in below v ~ 0.3
    float xw = 1.0 - smoothstep(0.12, 0.32, v);
    float c1 = wr.x / vQ.z, al1 = -wr.y / vQ.z;
    c1 += (vnoise(vec2(al1 * 0.03, c1 * 0.05) + sd * 2.3) - 0.5) * 0.9;
    float d1 = max(fwidth(c1), 1e-5);
    if (xw > 0.001) {
      float lv1 = -log2(d1 * uTex.w * 1.3), k1 = floor(lv1), fr1 = lv1 - k1;
      float ln2 = max(stroke(c1, al1, k1, sd + 5.0, uTex.x * 0.8, dk, d1) * clamp(2.0 - 2.0 * fr1, 0.0, 1.0), stroke(c1, al1, k1 + 1.0, sd + 5.0, uTex.x * 0.8, dk, d1) * clamp(2.0 * fr1, 0.0, 1.0));
      ln = max(ln, ln2 * xw);
    }
    float kk = uTex.y * (1.0 - smoothstep(0.34, 0.8, v)) * smoothstep(0.012, 0.09, v);
    // (measured gain; the lit faces of the source stay smooth, so the strokes fade out above v ~ 0.55)
    if (vH.y >= 0.0) kk = min(1.6, uTex.y * vH.y * smoothstep(0.012, 0.09, v) * (1.0 - 0.85 * smoothstep(0.5, 0.85, v)));
    // (the strokes' mean coverage ~0.4 * width * dk, lifted back between them so the face keeps its measured mean)
    float E = min(0.6, 0.95 * kk * 0.45 * uTex.x * dk);
    // faint vertical rub streaks (the source's lit cardboard), px-sized in the face's own uv
    float rub = (vnoise(vec2(fu.x * max(vE.x, 1.0) / 34.0, fu.y * max(vE.y, 1.0) / 300.0) + sd * 0.7) - 0.5) * 0.12 * smoothstep(0.35, 0.75, v);
    white = clamp(v * (1.0 + sm + rub) / (1.0 - E) * (1.0 - 0.95 * min(1.0, ln * kk)), 0.0, 1.0);
  } else {
    // charcoal hatching along the face's world horizontal (u), only where the face is in shade: dense broken dark
    // strokes ~uTex.w px apart on screen whatever the distance (two octaves of world-space lines blended by the local
    // line density, so the strokes stay glued to the surface and new ones appear between them as it comes near);
    // lit faces stay a near-flat pale tone with grain
    float c0 = vW.y / vQ.z, al0 = vW.x / vQ.z;
    c0 += (vnoise(vec2(al0 * 0.05, c0 * 0.05) + sd) - 0.5) * 0.7 + (vnoise(vec2(al0 * 0.3, c0 * 0.4) + sd * 1.7) - 0.5) * 0.25;
    float d0 = max(fwidth(c0), 1e-5);
    float lv = -log2(d0 * uTex.w);
    float k0 = floor(lv), fr = lv - k0;
    float ln = mix(hatch(c0, al0, k0, sd, uTex.x), hatch(c0, al0, k0 + 1.0, sd, uTex.x), fr);
    float k = uTex.y * (1.0 - smoothstep(0.3, 0.62, v)) * smoothstep(0.02, 0.12, v) * (isFloor ? 0.85 : 1.0);
    // charcoal drag: faint vertical streaks in the shade (the source's rubbed tone under the strokes)
    float drag = (vnoise(vec2(al0 * 0.9, c0 * 0.02) + sd * 0.7) - 0.5) * 0.35 * k;
    float m = (vnoise(vec2(al0 * 0.02 + sd * 2.3, c0 * 0.15)) - 0.5) * uTex.z;
    white = clamp((v + m * v + drag * v) * (1.0 - 0.7 * ln * k), 0.0, 1.0);
  }
  white = clamp(white + grain * min(1.0, white * 2.0), 0.0, 1.0);
  if (vV.x < -1.5 && uFloor2.y > 0.0) {
    // the source screens the lit floor with a fine dot pattern (a ~5 px halftone), strongest in the mid-tones
    vec2 fc = gl_FragCoord.xy / 5.2; vec2 cell = fract(vec2(fc.x + 0.5 * floor(fc.y), fc.y)) - 0.5;
    float dot0 = smoothstep(0.34, 0.2, length(cell));
    float mid = smoothstep(0.08, 0.3, white) * (1.0 - smoothstep(0.6, 0.9, white));
    white *= 1.0 - uFloor2.y * mid * (1.0 - dot0);
  }
  // ink drawn into the atlas (dark marks: handle slots, tape edges, keys) and the inked box edges / seams
  white *= 1.0 - tex.g;
  white = max(white, tex.b * v * 1.6);
  vec2 e = min(vT, 1.0 - vT) * vS.xy;
  float ed = min(e.x, e.y);
  float pw = fwidth(ed);
  if (roto) {
    // fix 1: broken charcoal edges, 2-6 px wide, their width and darkness wandering along the edge, the ink lifting
    // here and there, over a soft rubbed shadow a few px further in (vE.xy: px per face u / v at the face's centre)
    float edPx = ed / max(pw, 1e-6);
    bool uE = e.x < e.y;
    float along = uE ? vT.y * max(vE.y, 1.0) : vT.x * max(vE.x, 1.0);
    float side = uE ? step(0.5, vT.x) : 2.0 + step(0.5, vT.y);
    float ei = edgeInk(edPx, along, side, sd, vQ.w);
    white *= mix(1.0, uLight2.w, ei);
    white *= 1.0 - 0.22 * (1.0 - smoothstep(3.0, 16.0 * vQ.w, edPx));
  } else if (!isFloor && vS.w < 2.5) {
    // inked edges: a world-width band (~6 mm) that never gets thinner than ~2.5 px (the seams between stacked boxes)
    float ew = max(0.006 * vQ.w, pw * 2.5 * vQ.w);
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

// a face's measured value: -1 (lit by the shader), a number, or four corner values
const Z4 = [0, 0, 0, 0];
const tv4 = (tv) => (tv === undefined || tv === null || tv === -1 ? [-1, -1, -1, -1] : typeof tv === "number" ? (tv < 0 ? [-1, -1, -1, -1] : [tv, tv, tv, tv]) : tv);
const FLOATS = 38;   // per vertex: pos3 nrm3 uvw2 uvt2 atlas4 par4 size4 value4 hatch4 edge4 decal4

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
    this.U = {}; for (const n of ["uVP", "uAtlas", "uCam", "uOwl", "uLight", "uLight2", "uSeed", "uTex", "uGrade", "uFace", "uFloor", "uFloor2", "uFG", "uFGx", "uFGy", "uFGd"]) this.U[n] = gl.getUniformLocation(this.pScene, n);
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
  upload(key, faces, opts = {}) {
    const gl = this.gl;
    if (!faces.length) { const old = this.sets.get(key); if (old) { gl.deleteVertexArray(old.vao); gl.deleteBuffer(old.b); this.sets.delete(key); } return; }
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
          f.su, f.sv, f.seed ?? 0, f.style ?? 0, ...tv4(f.tv), f.ha ?? 0, f.hk ?? -1, 0, 0, ...(f.pe ?? Z4), ...(f.dc ?? Z4)], k);
        k += FLOATS;
      }
    }
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const S = FLOATS * 4;
    const attr = (loc, n, off) => { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, S, off * 4); };
    attr(0, 3, 0); attr(1, 3, 3); attr(2, 2, 6); attr(3, 2, 8); attr(4, 4, 10); attr(5, 4, 14); attr(6, 4, 18); attr(7, 4, 22); attr(8, 4, 26); attr(9, 4, 30); attr(10, 4, 34);
    gl.bindVertexArray(null);
    const old = this.sets.get(key);
    if (old) { gl.deleteVertexArray(old.vao); gl.deleteBuffer(old.b); }
    this.sets.set(key, { vao, b, n: faces.length * 6, noDepth: !!opts.noDepth });
  }
  // Render `subs` = [{ key, vp (Float32Array 16), cam [x,y,z], owl [x,y,z], light, light2 }] averaged; returns the canvas.
  render(subs, seed = 1) {
    const gl = this.gl, W = this.W, H = this.H;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fAcc);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    const w = 1 / subs.length;
    for (const s of subs) {
      const sets = (s.keys ?? [s.key]).map((k) => this.sets.get(k)).filter(Boolean);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fScene);
      gl.viewport(0, 0, W, H);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (sets.length) {
        gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.disable(gl.BLEND);
        gl.useProgram(this.pScene);
        gl.uniformMatrix4fv(this.U.uVP, false, s.vp);
        gl.uniform3fv(this.U.uCam, s.cam); gl.uniform3fv(this.U.uOwl, s.owl);
        gl.uniform4fv(this.U.uLight, s.light); gl.uniform4fv(this.U.uLight2, s.light2);
        gl.uniform1f(this.U.uSeed, seed); gl.uniform4fv(this.U.uTex, s.tex ?? [0.26, 0.85, 0.24, 0.18]); gl.uniform4fv(this.U.uGrade, s.grade ?? [1.38, 1.3, 0, 0]); gl.uniform4fv(this.U.uFace, s.face ?? [0.45, 1.25, 0.5, 0.8]);
        gl.uniform4fv(this.U.uFloor, s.floor ?? [0.5, 0.6, 0.15, 3.0]); gl.uniform4fv(this.U.uFloor2, s.floor2 ?? [0, 0, 1, 0]);
        if (s.fg) { gl.uniform1fv(this.U.uFG, s.fg.v); gl.uniform1fv(this.U.uFGx, s.fg.x); gl.uniform1fv(this.U.uFGy, s.fg.y); gl.uniform4fv(this.U.uFGd, [13, 7, 1, H]); }
        else gl.uniform4fv(this.U.uFGd, [13, 7, 0, H]);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.atlas); gl.uniform1i(this.U.uAtlas, 0);
        // (roto sets: screen-space faces measured on the source, drawn after the 3D set in their own order)
        for (const set of sets) { if (set.noDepth) gl.disable(gl.DEPTH_TEST); else gl.enable(gl.DEPTH_TEST); gl.bindVertexArray(set.vao); gl.drawArrays(gl.TRIANGLES, 0, set.n); }
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
