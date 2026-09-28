// Owl startled (35.36–36.92): a big close-up of the owl on black — saucer eyes with pin-prick pupils, a sweat drop,
// beak hanging open, one wing flung up and out to the right.
//
// Measured on the source (frame diffs + ORB similarity tracking of head / wing / body / tail / toes regions, each
// measured directly against the settled frame 35.80; 25 fps, frame index = floor(t * 25 + 1e-3)):
//   884–885 (35.36)  pose A: the far (viewer-left) wing raised as a long paddle behind the head, near wing ~10° lower
//   886–887 (35.44)  pose B: far wing dropped to a nub, near wing swung up; head 30 px, body 22, toes 10 px higher than C
//   888–889 (35.52)  the settle: head 22 / 12.5 px above C, wing 28 / 11, body 15 / 9, toes 7 / 4; the tail barely moves
//   890–898 (35.60)  pose C held — the master drawing below
//   899–900 (35.96)  C with the head starting to turn: head (-10, +2.6) rot -1.1°
//   901–911 (36.04)  pose D: the head redrawn facing camera (band over the crown, both cups); head drifts up to 7 px
//   912     (36.48)  in-between: the front drawing re-parameterised, face ~70 px left, right eye opening up
//   913–922 (36.52)  back to C (head starts +4.8 px right and drifts home by 36.72)
// No camera move. All geometry is authored in frame pixels for pose C; the other poses are C's cached part layers
// moved per frame, plus dedicated drawings for A's raised wing, B's far-wing leaf and the front heads.
// Pass 2 (MEAS, the s12 method; measurement scripts in ./s13/trace/, data modules in ./s13/*.js — control points only,
// no source pixels): part silhouettes measured from the lit outline (silC / silD), the feather ink traced as stroke
// centre-lines with width and value (strokesC / strokesD / farC) and redrawn with the taper engine, the talons as
// measured outline rings with their flat grey shading shapes (feetC), a fitted cubic value study per part (toneC) plus
// a seeded paper mottle, and per-frame affine placements of every layer from ECC fits on the source (placeC).
// The eyes, beak, bandage, sweat drop and headphones stay hand-built from measurements. PROC = the first-pass
// procedural fur (kept as a fallback, off).
// Fix pass 1 (CEL): the headphones (C, D, E), beaks, bandages, E's eyes, and zones of plumage where the source's grey
// tone and hatching carry the drawing (the wing root and shoulder, the flank, the tail, the talons, the crown, the nub,
// the cheek over it, the fur under the D/E cups, and what A and B redraw) are measured cel traces (./s13/celHP.js,
// ./s13/trace/cel.py): crisp flat-value polygons, no blur fills. E (912) has its own measured silhouette and strokes.
import { plumage, softShade, edgeFlicks, featherRow, ink, flick, setPPU, drawBandage, gv, LINE, V } from "../lib/owlInk.js";
import { smoothPath, sampleCurve } from "../lib/paths.js";
import { taper } from "../lib/ink.js";
import { rng, noise2 } from "../lib/rng.js";
import { brush, swellStroke, clumpRim, clumpField, brushRim, angInterp, leather, wedge } from "./s13/brush.js";
import { SC } from "./s13/strokesC.js";
import { SILC } from "./s13/silC.js";
import { FEET } from "./s13/feetC.js";
import { CUP } from "./s13/cupC.js";
import { SILD } from "./s13/silD.js";
import { SD } from "./s13/strokesD.js";
import { TONE } from "./s13/toneC.js";
import { PLACE } from "./s13/placeC.js";
import { FAR } from "./s13/farC.js";
import { CELHP } from "./s13/celHP.js";
import { drawCel } from "./s13/cel.js";
import { SILE, SE } from "./s13/headE.js";
import { SCH } from "./s13/chestC.js";
import { SHEEN } from "./s13/sheenC.js";
// Pass w3 (snapshots/s13-w3-tools/, fidelity/s13.md): the cheek trace hlC split off the nub (it floated in the black
// in A/B), a D-pose body island clipped, the sweat drop re-measured as a grey outline, per-layer sub-pixel registration
// (SUBPX) and per-frame residual placement (FIX), the dark-biased cel traces grown 0.2-0.38 px, the wing's measured
// vane sheen (./s13/sheenC.js), the belly hem's strokes thinned.
// CEL: the headphones (and beaks) as measured cel traces (./s13/celHP.js, fix pass 1) instead of the hand-built parts
const CEL = true;
// (w3) the cel traces whose dark levels measured too large (headphones, talons, beaks, bandages, nub): their groups
// are grown by 0.38 px, the beaks by 0.2 (see ./s13/cel.js; 0.7 overshot: cup +1.9, talons +2.3 levels). The zones feathered into the plumage (wing root, flank, tail, eyes, fur
// under the cups, crown, cheek) measured right as they are and are left alone.
for (const k of ["hpC", "hpD", "hpE", "feetC", "bgC", "bgD", "bgE", "nubC", "ovA3", "ovB2"]) if (CELHP[k]) CELHP[k].grow = 0.38;
CELHP.hpC.growSkip = [1415, 392, 1545, 485];   // the traced shadow under the 3/4 cup measured right (+2 when grown)
for (const k of ["beakC", "beakE"]) if (CELHP[k]) CELHP[k].grow = 0.2;   // (beakD measured +1.1 already: left as traced)

const TAU = Math.PI * 2;
const { add, sub, mul, nrm, perp } = V;

// ---------------------------------------------------------------- measured ink strokes (./s13/strokes*.js)
// PROC: the first-pass procedural fur (clumps, rows, flicks). Off: the traced strokes replace it.
const PROC = false;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const INK_CAL = { w: 1.0, wMin: 0.7, dv: -0.02, end: 4 };
// Each stroke in one tone (its darkest measured value); the width at each point scaled so the ink mass
// (width x darkness) matches the measurement: a stroke's pale ends come out as a natural taper (as s12/hero.js).
function drawStrokes(g, list, { gain = 1, dv = INK_CAL.dv } = {}) {
  for (const s of list) {
    const pts = [], W = [], Vv = [];
    for (let i = 0; i < s.length; i += 4) { pts.push([s[i], s[i + 1]]); W.push(s[i + 2]); Vv.push(s[i + 3]); }
    const n = pts.length; if (n < 2) continue;
    let vm = 1; for (const v of Vv) vm = Math.min(vm, v);
    const vd = clamp01(vm + dv), wm = W.map((w, i) => (w * (1 - Vv[i])) / Math.max(0.05, 1 - vd));
    const per = 4, q = sampleCurve(pts, per);
    const S = [0]; for (let i = 1; i < q.length; i++) S.push(S[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
    const L = S[S.length - 1];
    const wAt = (i) => { const f = i / per, a = Math.min(n - 1, Math.floor(f)), b = Math.min(n - 1, a + 1), t = f - a; return wm[a] + (wm[b] - wm[a]) * t; };
    taper(g, q, (u) => {
      const i = Math.round(u * (q.length - 1)), sd = S[i];
      const e = Math.min(1, sd / INK_CAL.end, (L - sd) / INK_CAL.end);
      return Math.max(INK_CAL.wMin, wAt(i) * INK_CAL.w * gain) * (0.35 + 0.65 * Math.sqrt(Math.max(0, e)));
    }, gv(vd));
  }
}

// the fitted value study (./s13/toneC.js): add the part's polynomial tone correction to what is painted so far,
// inside the part's silhouette (antialiased by the mask's alpha). Pixel pass over the layer; deterministic.
const MOTTLE = 12;
function applyTone(g, key, path) {
  const c = TONE[key]; if (!c) return;
  const cv = g.canvas, W = cv.width, H = cv.height, tr = g.getTransform();
  const mk = document.createElement("canvas"); mk.width = W; mk.height = H;
  const mg = mk.getContext("2d"); mg.setTransform(tr); mg.fillStyle = "#fff"; mg.beginPath(); path(mg); mg.fill("evenodd");
  const md = mg.getImageData(0, 0, W, H).data, img = g.getImageData(0, 0, W, H), d = img.data;
  const ox = -tr.e, oy = -tr.f;
  for (let j = 0; j < H; j++) {
    const v = (j + oy - 470) / 300;
    for (let i = 0; i < W; i++) {
      const o = (j * W + i) * 4, a = md[o + 3];
      if (!a || d[o + 3] < 8) continue;
      const u = (i + ox - 1300) / 300;
      const dt = c[0] + c[1] * u + c[2] * v + c[3] * u * u + c[4] * u * v + c[5] * v * v + c[6] * u * u * u + c[7] * u * u * v + c[8] * u * v * v + c[9] * v * v * v;
      // plus the print's paper mottle (measured in flat plumage: sigma-3 texture ~3-4 levels in the source against
      // ~2 from the grade's grain alone): ~2 px speckle and ~5 px blotches, seeded, bright areas only
      const L0 = d[o] / 255, mw = L0 > 0.55 ? Math.min(1, (L0 - 0.55) / 0.25) : 0;
      const mot = mw ? (0.6 * noise2((i + ox) / 2.2, (j + oy) / 2.2, 91) + 0.8 * Math.max(-0.6, noise2((i + ox) / 5, (j + oy) / 5, 92))) * MOTTLE * mw : 0;
      const k = (dt * 255 * a) / 255 + (mot * a) / 255;
      d[o] = Math.max(0, Math.min(255, d[o] + k)); d[o + 1] = Math.max(0, Math.min(255, d[o + 1] + k)); d[o + 2] = Math.max(0, Math.min(255, d[o + 2] + k));
    }
  }
  g.putImageData(img, 0, 0);
}
// the paper mottle alone (as in applyTone) over a traced zone: the cel traces are flat, the print is not.
// Restricted to the trace's own region when given (the rest of the part already has it).
function mottle(g, path, C = null) {
  const cv = g.canvas, W = cv.width, H = cv.height, tr = g.getTransform();
  const mk = document.createElement("canvas"); mk.width = W; mk.height = H;
  const mg = mk.getContext("2d"); mg.setTransform(tr); mg.fillStyle = "#fff"; mg.beginPath(); path(mg); mg.fill("evenodd");
  if (C) { mg.globalCompositeOperation = "destination-in"; mg.beginPath(); for (const r of C.region) { mg.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) mg.lineTo(r[i], r[i + 1]); mg.closePath(); } mg.fill("evenodd"); }
  const md = mg.getImageData(0, 0, W, H).data, img = g.getImageData(0, 0, W, H), d = img.data, ox = -tr.e, oy = -tr.f;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const o = (j * W + i) * 4, a = md[o + 3];
    if (!a || d[o + 3] < 8) continue;
    const L0 = d[o] / 255, mw = L0 > 0.55 ? Math.min(1, (L0 - 0.55) / 0.25) : 0;
    if (!mw) continue;
    const k = ((0.6 * noise2((i + ox) / 2.2, (j + oy) / 2.2, 91) + 0.8 * Math.max(-0.6, noise2((i + ox) / 5, (j + oy) / 5, 92))) * MOTTLE * mw * a) / 255;
    d[o] = Math.max(0, Math.min(255, d[o] + k)); d[o + 1] = Math.max(0, Math.min(255, d[o + 1] + k)); d[o + 2] = Math.max(0, Math.min(255, d[o + 2] + k));
  }
  g.putImageData(img, 0, 0);
}
// pale strokes on a dark ground (cushion folds, chrome streaks): each drawn in its brightest measured value
function drawBright(g, list, { gain = 1, minLen = 0, wk = 0.9 } = {}) {
  for (const s of list) {
    const pts = [], W = [], Vv = [];
    for (let i = 0; i < s.length; i += 4) { pts.push([s[i], s[i + 1]]); W.push(s[i + 2]); Vv.push(s[i + 3]); }
    const n = pts.length; if (n < 2) continue;
    let L = 0; for (let i = 1; i < n; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (L < minLen) continue;
    let vm = 0; for (const v of Vv) vm = Math.max(vm, v);
    const q = sampleCurve(pts, 4);
    taper(g, q, (u) => { const a = Math.min(n - 1, Math.floor(u * (n - 1))); return Math.max(0.7, W[a] * wk) * (0.35 + 0.65 * Math.sqrt(Math.min(1, u * 6, (1 - u) * 6))); }, gv(clamp01(vm * gain)));
  }
}
// the cup's metal mesh (measured: two line families at +-45 deg, 3.2 px apart)
let MESH = null;
function meshPat(g, light = 0.78, dark = 0.14, w = 1.35) {
  const key = light + "/" + dark + "/" + w;
  if (!MESH) MESH = {};
  if (!MESH[key]) {
    const T = 9, c = document.createElement("canvas"); c.width = c.height = T;
    const d = c.getContext("2d"); d.fillStyle = gv(light); d.fillRect(0, 0, T, T);
    d.strokeStyle = gv(dark); d.lineWidth = w;
    for (let k = -3; k <= 3; k++) { const o = k * 4.5; d.beginPath(); d.moveTo(o - 2, -2); d.lineTo(o + T + 2, T + 2); d.stroke(); d.beginPath(); d.moveTo(o - 2, T + 2); d.lineTo(o + T + 2, -2); d.stroke(); }
    MESH[key] = c;
  }
  return g.createPattern(MESH[key], "repeat");
}
// ---------------------------------------------------------------- path helpers
// Closed/open curve through [x, y, sharp] points: Catmull-Rom, but a point flagged sharp becomes a corner
// (feather spikes on a ragged silhouette).
function mixPath(c, pts, closed = true) {
  const n = pts.length, k = 1 / 6;
  const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  c.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    if (p1[2] === 2 || p2[2] === 2) {
      // a flame tip (flag 2, [x, y, 2, bulge, hook]): the flank into it bows out by `bulge`, the flank out of it
      // bows in by `hook` (a tuft leaning along the outline; negative values flip the bows). Outline is clockwise.
      const d = sub(p2, p1), L = Math.hypot(d[0], d[1]) || 1, out = [d[1] / L, -d[0] / L], m = V.mix(p1, p2, 0.5);
      const q = p2[2] === 2 ? add(m, mul(out, L * (p2[3] ?? 0.2))) : sub(m, mul(out, L * (p1[4] ?? 0.25)));
      c.quadraticCurveTo(q[0], q[1], p2[0], p2[1]);
      continue;
    }
    const c1 = p1[2] ? [p1[0] + (p2[0] - p1[0]) * 0.28, p1[1] + (p2[1] - p1[1]) * 0.28] : [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2 = p2[2] ? [p2[0] - (p2[0] - p1[0]) * 0.28, p2[1] - (p2[1] - p1[1]) * 0.28] : [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    c.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]);
  }
  if (closed) c.closePath();
}
// A ragged run of flame tufts along a base polyline (clockwise outline): notch, tip, notch, tip ... Tips lean by
// `lean` radians from the outward normal toward the direction of travel (negative: backward).
function ragged(base, { step = 24, len = [16, 30], lean = 0.4, depth = 3, bulge = 0.18, hook = 0.25, seed = 1, jit = 0.35 } = {}) {
  const poly = sampleCurve(base, 8), out = [];
  const Ls = [0]; for (let i = 1; i < poly.length; i++) Ls.push(Ls[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
  const total = Ls[Ls.length - 1], r = rng(seed);
  const at = (d) => { let i = 1; while (i < Ls.length - 1 && Ls[i] < d) i++; const a = poly[i - 1], b = poly[i], f = (d - Ls[i - 1]) / Math.max(1e-6, Ls[i] - Ls[i - 1]); return [[a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], nrm(sub(b, a))]; };
  for (let d = step * 0.3; d < total - step * 0.3; d += step * (0.75 + 0.5 * r())) {
    const [p, t] = at(d), o = [t[1], -t[0]];
    const nq = sub(p, mul(o, depth * (0.4 + r())));
    out.push([nq[0], nq[1], 1]);
    const [pb, tb] = at(Math.min(total, d + step * 0.5)), ob = [tb[1], -tb[0]];
    const a = lean + (r() - 0.5) * jit, L = len[0] + r() * (len[1] - len[0]);
    const tip = add(pb, mul(add(mul(ob, Math.cos(a)), mul(tb, Math.sin(a))), L));
    out.push([tip[0], tip[1], 2, bulge * (0.7 + 0.6 * r()), hook * (0.7 + 0.6 * r())]);
  }
  return out;
}
const shp = (pts) => (c) => mixPath(c, pts, true);
const blob = (pts) => (c) => smoothPath(c, pts, true);
function clipTo(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip("evenodd"); fn(); g.restore(); }
// (w3) a cel trace split by a mask: keep = "in" draws only the part inside maskFn, "out" only the part outside it
function drawCelMasked(g, C, maskFn, keep) {
  const cv = g.canvas, tr = g.getTransform();
  const mk = () => { const c = document.createElement("canvas"); c.width = cv.width; c.height = cv.height; const x = c.getContext("2d"); x.setTransform(tr); return x; };
  const off = mk(), m = mk();
  drawCel(off, C);
  maskFn(m);
  off.setTransform(1, 0, 0, 1, 0, 0); off.globalCompositeOperation = keep === "in" ? "destination-in" : "destination-out"; off.drawImage(m.canvas, 0, 0);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(off.canvas, 0, 0); g.restore();
}
// the part of the far-wing nub the head does not cover (hlC, traced on the C hold, reaches over it: that part belongs
// to the nub, not the head — drawn with the head it floated in the black in poses A / B and moved wrongly in the settle)
function nubOnlyMask(m) {
  m.fillStyle = "#fff"; m.beginPath(); sil("nub")(m); m.fill("evenodd");
  m.globalCompositeOperation = "destination-out"; m.beginPath(); sil("head")(m); m.fill("evenodd"); m.globalCompositeOperation = "source-over";
}
// MEAS: parts use the silhouettes measured on the source (./s13/silC.js) instead of the hand-fitted outlines
const MEAS = true;
const sil = (k) => (c) => { for (const r of SILC[k]) { c.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) c.lineTo(r[i], r[i + 1]); c.closePath(); } };
// a thin dark keyline riding the silhouette (its outer half falls on black, its inner half darkens the rim)
function keyline(g, pts, w = 2.4, color = gv(0.2, 0.75)) {
  const q = pts.map((p) => [p[0], p[1]]);
  for (let i = 0; i < q.length - 1; i += 6) ink(g, q.slice(i, Math.min(q.length, i + 8)), w, color, { end: 0.3 });
}
// ---------------------------------------------------------------- pose C geometry (frame px, measured at 35.80)
// head silhouette (clockwise): up the left side over the nub (soft tufts hanging down-left), the ear tufts above
// the bandage, the crown under the band (flame tufts leaning right, tips measured on 35.80 at 3x), the big right
// ear tuft, tufts reaching toward the slider, then down behind the cup and back along the chin
const FT = (x, y, b = 0.12, h = 0.2) => [x, y, 2, b, h];
const NT = (x, y) => [x, y, 1];
let HEAD_PTS = null;
function headPts() {
  if (HEAD_PTS) return HEAD_PTS;
  HEAD_PTS = [
    [924, 484],
    ...ragged([[918, 474], [910, 440], [904, 400], [898, 360], [894, 320], [892, 286]], { step: 16, len: [3, 9], lean: -0.75, depth: 1, bulge: -0.1, hook: -0.15, seed: 901 }),
    [893, 262], FT(889, 246, 0.05, 0.2), NT(894, 238), FT(887, 218, 0.08, 0.2), NT(899, 206), FT(878, 178, 0.1, 0.2), NT(904, 191), FT(898, 166, 0.08, 0.2), NT(914, 182), [920, 174], [928, 165], [938, 150],
    NT(942, 133), FT(947, 93, 0.08, 0.12), NT(955, 110), FT(967, 62, 0.08, 0.14), NT(975, 83), FT(1013, 10, 0.06, 0.1), NT(1008, 58), FT(1016, 50, 0.06, 0.12), NT(1023, 82),
    [1045, 78], [1068, 75], [1092, 71], [1119, 65],
    // crown (source contour at 35.80): each flame rises gently to a tip on its right, then drops back steeply to a
    // notch left of the tip, so the black wedges between flames point down-left into the fur
    FT(1158, 46, 0.1, 0.3), NT(1148, 66), FT(1187, 55, 0.1, 0.3), NT(1177, 67), [1210, 55], FT(1239, 39, 0.08, 0.3), NT(1224, 63), [1250, 62], FT(1285, 46, 0.08, 0.3), NT(1268, 72),
    [1290, 75], FT(1308, 76, 0.05, 0.2), NT(1298, 94), [1318, 76], FT(1345, 58, 0.08, 0.3), NT(1341, 69), [1396, 54], [1439, 33], FT(1464, 13, 0.04, 0.06),
    [1445, 49], [1427, 73], NT(1412, 89), FT(1438, 80, 0.1, 0.3), NT(1413, 103), FT(1429, 96, 0.1, 0.3), NT(1402, 124), FT(1429, 131, 0.1, 0.3), NT(1414, 138),
    FT(1436, 160, 0.1, 0.2), NT(1420, 172), [1422, 200], [1424, 260], [1428, 330], [1446, 380],
    [1500, 410], [1520, 440], [1450, 480], [1340, 520], [1200, 548], [1060, 548],
    ...ragged([[1060, 548], [1014, 540], [974, 522], [936, 498]], { step: 16, len: [3, 8], lean: 0.6, depth: 1, bulge: 0.1, hook: 0.15, seed: 902 }),
  ];
  return HEAD_PTS;
}
const EYE_L = { x: 964, y: 332, rx: 46, ry: 69, rot: -0.1, lash: [[3.4, 4.6, 7], [-0.5, 0.7, 5]],
  R: [0.939, 0.984, 1.046, 1.05, 1.071, 1.091, 1.086, 1.074, 1.056, 1.047, 1.035, 1.011, 1.0, 1.001, 0.994, 0.987, 0.984, 0.995, 0.972, 0.991, 0.98, 0.981, 0.99, 0.986, 0.954, 0.945, 0.927, 0.914, 0.909, 0.925, 0.92, 0.93],
  W: [5.1, 4.2, 5.5, 4.4, 7.2, 6.9, 7.4, 5.8, 7.2, 4.2, 4.1, 3.8, 3.6, 3.2, 2.6, 2.6, 3.0, 4.6, 4.9, 5.4, 6.3, 6.9, 8.2, 8.2, 7.9, 7.8, 7.6, 7.6, 6.5, 7.0, 5.1, 4.6],
  segs: [[-0.4, 2.6, 0], [2.3, 4.9, 0.006], [4.6, 6.6, -0.004]],
  pupil: { x: 964.5, y: 337, rx: 6.5, ry: 10, dot: [2.3, 4], arcs: [[1.95, 4.4, 1.8], [-1.0, 1.0, 1.4]] } };
const EYE_R = { x: 1177, y: 323, rx: 74.5, ry: 75, rot: 0.05, lash: [[2.2, 3.9, 9], [1.6, 2.4, 5]],
  R: [1.001, 0.987, 1.002, 1.01, 1.006, 0.995, 0.997, 0.991, 0.995, 1.0, 1.004, 1.03, 1.054, 1.06, 1.05, 1.031, 1.015, 1.017, 1.017, 1.037, 1.045, 1.044, 1.047, 1.045, 1.041, 1.037, 1.032, 1.034, 1.022, 1.019, 1.03, 1.03],
  W: [6.0, 4.3, 3.2, 2.4, 4.6, 5.8, 5.4, 5.6, 6.0, 6.4, 6.2, 6.2, 6.4, 4.4, 3.6, 3.4, 3.6, 4.4, 5.6, 6.2, 7.2, 7.2, 7.3, 7.6, 7.3, 7.0, 7.4, 7.8, 7.8, 7.8, 7.6, 6.1],
  segs: [[-0.25, 3.0, 0], [2.75, 6.05, 0.004], [5.85, 6.35, -0.004]], tick: [[1237, 292], [1247, 298], [1255, 307]],
  pupil: { x: 1152, y: 328.5, rx: 10, ry: 11.5, dot: [3.8, 3.8], notch: true, arcs: [[1.8, 4.5, 2.2], [-1.2, 1.1, 1.6]] } };
// far wing nub peeking out left of the head
const NUB = [[912, 462], [893, 440], [868, 412], [846, 382], [826, 350], [816, 322], [818, 300], [834, 285], [858, 282], [882, 288], [900, 300], [915, 380]];
// body (clockwise): the top under the head, down the right flank under the wing, left along the belly, then up the
// chest rim, whose tufts hang down-left with black notches between them (source contour at 35.80)
const BODY = [
  [950, 380], [1150, 380], [1380, 380], [1470, 368], [1540, 400], [1580, 480], [1600, 600], [1632, 632], [1656, 690], [1672, 736], [1688, 770], [1686, 812],
  [1666, 852], [1640, 880],
  [1610, 884], [1570, 866], [1520, 852], [1470, 858], [1428, 878], [1395, 891], [1350, 890], [1316, 880], [1284, 856], [1250, 842], [1212, 825], [1180, 802],
  [1152, 772], [1126, 742], NT(1110, 712), FT(1100, 716, 0.1, 0.2), NT(1092, 688), FT(1086, 719, 0.1, 0.2), NT(1078, 697), [1072, 676], NT(1068, 652),
  FT(1042, 667, 0.08, 0.16), NT(1051, 631), NT(1047, 598), FT(1036, 614, 0.08, 0.2), [1037, 578], [1027, 563], NT(1004, 543), FT(998, 551, 0.1, 0.2), [990, 530],
  [960, 510], [930, 488], [900, 440],
];
// the flank's contour (source 35.80): the body's shadow side, hatched along its curve
const FLANK = [[1582, 520], [1600, 600], [1632, 632], [1656, 690], [1672, 736], [1688, 770], [1686, 812], [1666, 852], [1640, 880]];
const CHEST = [[1126, 742], [1092, 700], [1068, 660], [1050, 620], [1038, 580], [1010, 548]];
// tail feathers under the wing, reaching down-right out of frame
const TAIL = [[1560, 600], [1619, 622], [1652, 660], [1654, 686], [1681, 742], [1735, 810], [1789, 875], [1822, 946], [1700, 946], [1640, 900], [1600, 800], [1570, 700]];
// the near wing, flung up and out to the right
const WING = [
  [1520, 400], [1548, 350], [1588, 290], [1616, 262], [1654, 240, 1], [1648, 260], [1713, 251, 1], [1692, 268], [1760, 294], [1820, 322, 1], [1812, 330],
  [1870, 360], [1928, 397, 1], [1893, 396], [1935, 440], [1968, 474], [2000, 512], [2026, 552], [2046, 590], [2062, 632], [2078, 680], [2092, 722, 1],
  [2073, 716], [2040, 690, 1], [2035, 723, 1], [2000, 700], [1969, 688, 1], [1969, 703, 1], [1940, 696], [1905, 674], [1876, 654, 1], [1840, 640], [1826, 637, 1],
  [1810, 618], [1790, 630, 1], [1784, 654, 1], [1760, 646], [1735, 641, 1], [1735, 661, 1], [1710, 650], [1683, 638, 1], [1679, 657, 1], [1660, 654, 1], [1640, 640], [1600, 600], [1560, 520],
];
// ---------------------------------------------------------------- painters (pose C)
// far wing nub (C): a grey leaf left of the head, dense parallel barbs running down-right, a pale lower-left rim
function paintNubShape(g, pts, seed, shade = 0.62) {
  const p = blob(pts);
  plumage(g, p, { base: 0.8, shade, light: [0.6, -0.3], depth: 14, blur: 8 });
  clipTo(g, p, () => {
    const r = rng(seed), bb = [Infinity, Infinity, -Infinity, -Infinity];
    for (const [x, y] of pts) { bb[0] = Math.min(bb[0], x); bb[1] = Math.min(bb[1], y); bb[2] = Math.max(bb[2], x); bb[3] = Math.max(bb[3], y); }
    // barbs: long thin lines at ~1.0 rad, 5-7 px apart across the leaf
    const d = [Math.cos(1.0), Math.sin(1.0)], n = perp(d), c = [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2], R = Math.hypot(bb[2] - bb[0], bb[3] - bb[1]) / 2 + 10;
    for (let k = -R; k < R; k += 5 + r() * 2.5) {
      const o = add(c, mul(n, k)), L = R * (0.5 + r() * 0.6), s0 = -R * (0.2 + r() * 0.8);
      const p0 = add(o, mul(d, s0)), p1 = add(o, mul(d, s0 + L));
      brush(g, [p0, add(V.mix(p0, p1, 0.5), mul(n, (r() - 0.5) * 4)), p1], 1.4 + r() * 0.8, gv(0.22 + r() * 0.15, 0.75), { head: 0.3, pow: 0.6 });
    }
    g.filter = "blur(10px)"; g.fillStyle = gv(0.35, 0.5); g.beginPath(); g.ellipse(bb[2], (bb[1] + bb[3]) / 2, 18, (bb[3] - bb[1]) * 0.45, 0, 0, TAU); g.fill(); g.filter = "none";
  });
}
function paintNub(g) {
  if (PROC) paintNubShape(g, NUB, 131);
  else { const p = MEAS ? sil("nub") : blob(NUB); plumage(g, p, { base: 0.8, shade: 0.62, light: [0.6, -0.3], depth: 14, blur: 8 }); applyTone(g, "nub", p); clipTo(g, p, () => drawStrokes(g, SC.nub)); }
  if (CEL) { drawCel(g, CELHP.nubC); mottle(g, sil("nub"), CELHP.nubC); drawCelMasked(g, CELHP.hlC, nubOnlyMask, "in"); return; }   // (fix pass 1) the nub, measured cel trace
  // pale lower-left rim and its dark keyline
  ink(g, [[906, 454], [876, 422], [848, 386], [826, 350], [818, 318]], 5, gv(0.93, 0.8), { end: 0.2 });
  ink(g, [[912, 463], [878, 428], [846, 386], [820, 336], [822, 300], [846, 284]], 2.2, gv(0.15, 0.8), { end: 0.1 });
}
// pose B: the far wing dropped to a pointed leaf (measured at 35.47, 3x): rounded top at y 235-245, tip at (888,370)
const NUB_B = [[835, 243], [847, 237], [867, 235], [887, 238], [898, 246], [905, 290], [900, 330], [888, 370, 1], [870, 342], [852, 315], [838, 290], [832, 267], [833, 250]];
// MEAS: the far wing of poses A / B as measured on those frames (./s13/farC.js)
function paintFarMeasured(g, F, seed, base) {
  const p = (c) => { for (const r of F.rings) { c.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) c.lineTo(r[i], r[i + 1]); c.closePath(); } };
  plumage(g, p, { base, shade: base - 0.14, light: [0.3, -0.9], depth: 14, blur: 8 });
  clipTo(g, p, () => drawStrokes(g, F.strokes));
}
function paintNubB(g) {
  if (MEAS) return paintFarMeasured(g, FAR.B, 133, 0.8);
  paintNubShape(g, NUB_B, 133, 0.68);
  ink(g, [[886, 368], [868, 340], [850, 314], [837, 290], [832, 266], [835, 246], [848, 237], [868, 235]], 2.2, gv(0.15, 0.8), { end: 0.15 });
}
// pose A: the far wing raised as a long paddle behind the head: ~28 dense parallel barbs along it, dark lower edge
const RAISED = [[1050, 590], [1000, 560], [950, 534], [900, 496], [858, 452], [822, 404], [796, 364], [785, 340], [788, 322], [800, 311], [826, 308], [860, 312], [890, 320], [980, 420], [1040, 520]];
function paintRaised(g) {
  if (MEAS) return paintFarMeasured(g, FAR.A, 141, 0.84);
  const p = blob(RAISED);
  plumage(g, p, { base: 0.82, shade: 0.6, light: [0.3, -0.9], depth: 14, blur: 8 });
  clipTo(g, p, () => {
    const r = rng(141), d = [Math.cos(0.78), Math.sin(0.78)], n = perp(d);
    for (let k = -150; k < 150; k += 8 + r() * 2) {
      const o = add([905, 455], mul(n, k)), p0 = add(o, mul(d, -260)), p1 = add(o, mul(d, 260));
      brush(g, [p0, add(V.mix(p0, p1, 0.5), mul(n, (r() - 0.5) * 6)), p1], 1.6, gv(0.25, 0.8), { head: 0.4, pow: 0.4 });
    }
  });
  // pale rim along the lower edge, dark line under it
  ink(g, [[800, 350], [840, 420], [900, 482], [960, 522], [1030, 560]], 8, gv(0.95, 0.9), { end: 0.2 });
  ink(g, [[790, 344], [832, 420], [895, 490], [960, 532], [1040, 575]], 2.6, gv(0.1, 0.9), { end: 0.1 });
  ink(g, [[788, 322], [800, 311], [826, 308], [860, 312]], 1.6, gv(0.25, 0.7), { end: 0.2 });
}
// the tail: a pale blade under the wing reaching down-right out of frame; fluffy clumped fur, a few feather-edge
// lines near its right edge (its own layer: it stays put while the body bobs)
const TAIL_EDGE = [[1654, 686], [1681, 742], [1735, 810], [1789, 875], [1822, 946]];
function paintTail(g) {
  const tp = MEAS ? sil("tail") : blob(TAIL);
  plumage(g, tp, { base: 0.84, shade: 0.55, light: [-0.8, -0.4], depth: 30, blur: 14 });
  clipTo(g, tp, () => {
    softShade(g, tp, (c) => c.ellipse(1742, 846, 22, 60, -0.62, 0, TAU), 0.45, 0.7, 12);
    if (!PROC) { applyTone(g, "tail", tp); drawStrokes(g, SC.tail); if (CEL) { drawCel(g, CELHP.tailC); mottle(g, tp, CELHP.tailC); } return; }
    // long feather lines running the length of the blade, unevenly spaced, most within 40 px of its right edge
    const q = sampleCurve(TAIL_EDGE, 8);
    for (const [o, w, v, s0, s1] of [[7, 2.4, 0.1, 0.02, 1], [13, 1.4, 0.3, 0.3, 1], [21, 2.0, 0.15, 0.1, 0.95], [30, 1.6, 0.25, 0.2, 1], [41, 2.2, 0.12, 0.05, 0.9], [55, 1.5, 0.3, 0.35, 1]]) {
      const pts = q.map(([x, y], i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)], t = nrm(sub(b, a)); return [x - t[1] * o, y + t[0] * o]; });
      brush(g, pts.slice(Math.floor(pts.length * s0), Math.ceil(pts.length * s1)), w, gv(v, 0.85), { head: 0.1, pow: 0.4 });
    }
    clumpField(g, tp, [1620, 640, 1720, 800], 8, () => 1.1, 72, { n: [3, 4], len: [30, 45], w: [1.6, 2.6], color: gv(0.3, 0.7), spread: 8 });
  });
  if (!MEAS) keyline(g, sampleCurve(TAIL_EDGE, 4), 2.2);
}
function paintBody(g) {
  const bp = MEAS ? sil("body") : shp(BODY);
  g.fillStyle = gv(0.84); g.beginPath(); bp(g); g.fill("evenodd");
  clipTo(g, bp, () => {
    g.filter = "blur(44px)";
    g.fillStyle = gv(0.975); g.beginPath(); g.ellipse(1250, 590, 330, 250, 0.35, 0, TAU); g.fill();
    g.filter = "blur(30px)";
    g.fillStyle = gv(0.6, 0.55); g.beginPath(); g.ellipse(1470, 930, 250, 60, 0.05, 0, TAU); g.fill();
    g.fillStyle = gv(0.62, 0.5); g.beginPath(); g.ellipse(1640, 700, 60, 200, 0.2, 0, TAU); g.fill();
    g.filter = "none";
    // notches along the chest rim: dark ink wedges pointing up-right into the fur
    const r = rng(80), NB = BODY.length, at = (i) => BODY[(i + NB) % NB];
    if (!MEAS) BODY.forEach((p, i) => { if (p[2] !== 1 || p[0] > 1130) return; const a = at(i - 1), b = at(i + 1), t = nrm(sub(b, a)), o = [t[1], -t[0]]; wedge(g, p, nrm(add(mul(o, -1), [0.5, -0.4])), 6 + r() * 6, 2.5 + r() * 1.5, gv(0.08, 0.9)); });
  });
  if (!MEAS) keyline(g, sampleCurve(CHEST, 4), 1.8, gv(0.2, 0.6));
  if (!PROC) {
    clipTo(g, bp, () => {
      softShade(g, bp, (c) => c.ellipse(955, 490, 36, 64, -0.7, 0, TAU), 0.64, 0.5, 14);
      softShade(g, bp, (c) => c.ellipse(1600, 600, 70, 150, 0.35, 0, TAU), 0.6, 0.6, 26);
      softShade(g, bp, (c) => c.ellipse(1670, 780, 40, 150, -0.35, 0, TAU), 0.62, 0.55, 20);
      applyTone(g, "body", bp);
      // (w3) the belly hem over the right talons (x 1320-1620, y 800-900) measured 4-7 levels darker than the source:
      // its traced strokes drawn thinner there (the source's hem strokes are finer)
      const hem = (st) => { let x = 0, y = 0, n = 0; for (let i = 0; i < st.length; i += 4) { x += st[i]; y += st[i + 1]; n++; } x /= n; y /= n; return x > HEM.box[0] && x < HEM.box[2] && y > HEM.box[1] && y < HEM.box[3]; };
      drawStrokes(g, SC.body.filter((st) => !hem(st))); drawStrokes(g, SC.body.filter(hem), { gain: HEM.gain });
      if (CEL) { drawStrokes(g, SCH.filter((st) => !hem(st))); drawStrokes(g, SCH.filter(hem), { gain: HEM.gain }); }   // (fix pass 1) the fainter chest strokes
    });
    if (CEL) { drawCel(g, CELHP.flankC); drawCel(g, CELHP.wrB); mottle(g, bp, CELHP.flankC); mottle(g, bp, CELHP.wrB); }   // (fix pass 1) the flank and the shadow under the wing root, measured cel traces
    return;
  }
  clipTo(g, bp, () => {
    // chest rim: bold clumps combing down-left toward the tufts
    clumpRim(g, CHEST, { step: 24, inset: 10, seed: 81, flow: () => 1.3, n: [3, 5], len: [30, 52], w: [2.2, 3.4], color: gv(0.34, 0.8), spread: 10 });
    clumpRim(g, CHEST, { step: 30, inset: 40, seed: 82, flow: () => 1.05, n: [2, 4], len: [26, 42], w: [1.8, 2.8], color: gv(0.45, 0.7), spread: 10 });
    // the upper chest edge under the chin (hidden by the 3/4 head, seen in D/E): shaded, long dark strokes down-right
    softShade(g, bp, (c) => c.ellipse(955, 490, 36, 64, -0.7, 0, TAU), 0.64, 0.5, 14);
    clumpRim(g, [[905, 446], [930, 484], [962, 510], [992, 530], [1010, 548]], { step: 16, inset: 6, seed: 92, flow: () => 0.9, n: [3, 5], len: [30, 50], w: [2.0, 3.0], color: gv(0.2, 0.8), spread: 9 });
    // the ruff line under the head
    featherRow(g, [[1015, 556], [1080, 572], [1160, 575], [1240, 566]], { step: 11, len: 24, w: 2.2, color: gv(0.42, 0.7), ang: 2.4, seed: 83, gap: 0.3 });
    // belly texture: loose rows of short light-grey strokes hanging down across the chest and belly
    for (let k = 0; k < 7; k++) {
      const y = 600 + k * 42, row = [[1040 + k * 22, y], [1180, y + 30 - k * 2], [1330, y + 20 - k * 4], [1480, y - 10 - k * 6], [1560, y - 30 - k * 8]];
      featherRow(g, row, { step: 16, len: 26, w: 1.6, color: gv(0.55, 0.5), ang: 1.25, seed: 95 + k, gap: 0.45 });
    }
    // belly: sparse clumps; the low belly darker toward the feet
    clumpField(g, bp, [1100, 600, 1560, 860], 16, () => 2.2, 84, { n: [2, 4], len: [22, 38], w: [1.8, 2.8], color: gv(0.45, 0.6) });
    clumpField(g, bp, [1200, 800, 1620, 900], 22, () => 1.35, 85, { n: [3, 5], len: [24, 40], w: [2, 3.2], color: gv(0.3, 0.75) });
    clumpRim(g, [[1130, 760], [1180, 802], [1250, 842], [1316, 872], [1395, 884], [1470, 860], [1570, 866], [1640, 900]], { step: 18, inset: 16, seed: 89, flow: (p) => 0.45 + (p[0] - 1130) * 0.0006, n: [3, 5], len: [30, 52], w: [1.6, 2.6], color: gv(0.24, 0.8), spread: 12 });
    clumpRim(g, [[1130, 760], [1180, 802], [1250, 842], [1316, 872], [1395, 884], [1470, 860], [1570, 866], [1640, 900]], { step: 22, inset: 46, seed: 90, flow: (p) => 0.5, n: [2, 4], len: [26, 44], w: [1.5, 2.3], color: gv(0.32, 0.7), spread: 12 });
    // the flank under the wing root: long dark strokes sweeping down-right along the body's shadow side
    softShade(g, bp, (c) => c.ellipse(1600, 600, 70, 150, 0.35, 0, TAU), 0.6, 0.6, 26);
    softShade(g, bp, (c) => c.ellipse(1670, 780, 40, 150, -0.35, 0, TAU), 0.62, 0.55, 20);
    { const fq = sampleCurve(FLANK, 10), rr = rng(91);
      for (let k = 0; k < 26; k++) {
        const off = 5 + k * 4.2 + rr() * 3, i0 = Math.floor(rr() * fq.length * 0.7), i1 = Math.min(fq.length - 1, i0 + 6 + Math.floor(rr() * 14));
        const pts = fq.slice(i0, i1 + 1).map((p, i, a) => { const q0 = a[Math.max(0, i - 1)], q1 = a[Math.min(a.length - 1, i + 1)], t = nrm(sub(q1, q0)); return [p[0] - t[1] * off, p[1] + t[0] * off]; });
        if (pts.length > 2) brush(g, pts, 1.5 + rr() * 1.2 - k * 0.02, gv(0.16 + k * 0.012 + rr() * 0.1, 0.85), { head: 0.2, pow: 0.6 });
      } }
    const r = rng(87);
    for (let i = 0; i < 46; i++) {
      const u = r(), x0 = 1500 + u * 120 + r() * 20, y0 = 440 + u * 190 + r() * 40;
      const a = 1.2 + u * 0.55 + (r() - 0.5) * 0.2, L = 50 + r() * 60;
      const p0 = [x0, y0], p1 = add(p0, mul([Math.cos(a), Math.sin(a)], L * 0.5)), p2 = add(p1, mul([Math.cos(a + 0.25), Math.sin(a + 0.25)], L * 0.5));
      brush(g, [p0, p1, p2], 1.6 + r() * 1.2, gv(0.28 + r() * 0.2, 0.75), { head: 0.15, pow: 0.7 });
    }
    clumpField(g, bp, [1560, 620, 1660, 880], 14, (x, y) => 1.25 + (y - 620) * 0.002, 88, { n: [3, 5], len: [34, 56], w: [2, 3.2], color: gv(0.22, 0.8), spread: 8, fan: 0.12 });
  });
}
// the near wing: a light grey fan of long blade feathers under rows of thin hooked coverts; the feathers read as
// thin dark edge lines, pale streaks along the vanes, and dark notches between the tips
const PRIM_LINES = [
  [[1905, 470], [1968, 590], [2035, 712]], [[1950, 490], [2010, 600], [2076, 712]], [[1880, 500], [1935, 600], [1992, 694]],
  [[1845, 520], [1900, 600], [1950, 676]], [[1800, 540], [1840, 600], [1878, 648]], [[1760, 555], [1785, 595], [1808, 632]],
  [[1712, 566], [1728, 610], [1742, 652]], [[1668, 580], [1678, 620], [1688, 652]], [[1930, 460], [2000, 560], [2060, 660]],
  [[1990, 560], [2030, 630], [2062, 690]], [[1860, 470], [1920, 560], [1972, 650]], [[1820, 490], [1870, 570], [1915, 640]],
];
const MARGINAL = [
  [[1617, 319], [1701, 344]], [[1651, 321], [1747, 357]], [[1697, 336], [1797, 377]], [[1755, 348], [1830, 386]], [[1817, 352], [1897, 382]],
  [[1612, 350], [1690, 382]], [[1660, 368], [1745, 405]], [[1600, 392], [1670, 420]], [[1640, 400], [1720, 438]], [[1590, 430], [1650, 460]],
];
// coverts (measured at 35.80, 2x): narrow hooked feathers in rows — [tip (lower-right end), length, half width, angle]
const LOOPS = [
  [[1750, 500], 118, 9, 0.73], [[1805, 505], 130, 9.5, 0.63], [[1855, 500], 132, 9.5, 0.58], [[1900, 497], 128, 9, 0.57], [[1948, 508], 118, 9, 0.62],
  [[1700, 470], 92, 8, 0.75], [[1652, 470], 80, 7.5, 0.8], [[1745, 452], 86, 7.5, 0.62], [[1800, 455], 90, 7.5, 0.58],
  [[1710, 532], 104, 9, 0.9], [[1662, 522], 94, 8.5, 0.92], [[1695, 566], 96, 9, 0.78], [[1640, 560], 84, 8, 0.85], [[1760, 548], 96, 8.5, 0.8],
];
// primary tips along the trailing edge (from the measured edge profile): long overlapping blades
const PRIM_TIPS = [[1734, 658], [1782, 653], [1866, 651], [1968, 700], [2034, 722], [2088, 722], [1800, 624]];
const HEM = { box: [1320, 800, 1620, 900], gain: 0.7 };
// (w3) the vane sheen: the source's near wing is cel-lit — a bright streak runs down each covert and primary vane
// (~+15 levels over the plumage, 5-15 px wide); measured streaks (./s13/sheenC.js) drawn as soft tapered strokes
const SHEEN_CAL = { base: 0.85, gain: 1.3, pad: 3, blur: 1.5 };
function paintSheen(g) {
  g.save(); g.filter = `blur(${SHEEN_CAL.blur}px)`;
  for (const s of SHEEN) {
    const pts = [], W = [];
    for (let i = 1; i < s.length; i += 3) { pts.push([s[i], s[i + 1]]); W.push(s[i + 2]); }
    const n = pts.length, q = sampleCurve(pts, 4);
    const v = Math.min(1, SHEEN_CAL.base + ((s[0] - 222) / 255) * SHEEN_CAL.gain);
    taper(g, q, (u) => { const f = u * (n - 1), i = Math.min(n - 2, Math.floor(f)), k = f - i, w = W[i] * (1 - k) + W[i + 1] * k; return w > 1 ? w + SHEEN_CAL.pad : w; }, gv(v));
  }
  g.restore();
}
function paintWing(g) {
  const wp = MEAS ? sil("wing") : shp(WING);
  g.fillStyle = gv(0.83); g.beginPath(); wp(g); g.fill("evenodd");
  clipTo(g, wp, () => {
    g.filter = "blur(30px)";
    g.fillStyle = gv(0.96, 0.8); g.beginPath(); g.ellipse(1720, 320, 180, 60, 0.45, 0, TAU); g.fill();
    g.fillStyle = gv(0.7, 0.7); g.beginPath(); g.ellipse(1570, 520, 60, 150, 0.25, 0, TAU); g.fill();
    g.filter = "blur(24px)";
    g.fillStyle = gv(0.74, 0.4); g.beginPath(); smoothPath(g, [[1660, 660], [1800, 650], [1950, 700], [2080, 740], [2080, 780], [1660, 720]], true); g.fill();
    g.filter = "none";
    if (!PROC) { applyTone(g, "wing", wp); paintSheen(g); drawStrokes(g, SC.wing); return; }
    // primaries: long blades, each with a pale stripe down the vane, a dark edge line and a finer second line
    PRIM_LINES.forEach((pts, i) => {
      const r2 = rng(270 + i);
      ink(g, pts.map(([x, y]) => [x - 14, y + 2]), 7 + r2() * 5, gv(0.97, 0.7), { end: 0.1 });
      ink(g, pts, 2.2 + r2() * 1.0, gv(0.1, 0.9), { end: 0.08, bias: 0.6 });
      ink(g, pts.map(([x, y]) => [x - 22 - r2() * 6, y + 6]), 1.2, gv(0.3, 0.6), { end: 0.1 });
    });
    // the long overlapping primary tips: a dark separation line running up from each notch into the wing
    PRIM_TIPS.forEach(([x, y], i) => { const r2 = rng(290 + i); brush(g, [[x + 3, y - 8], [x - 28, y - 48 - r2() * 10], [x - 58, y - 100 - r2() * 20]], 2.6, gv(0.08, 0.9), { head: 0.05, pow: 0.5 }); });
    // marginal coverts: rows of short hooked strokes following the leading edge
    for (let k = 0; k < 4; k++) {
      const row = WING.slice(2, 16).map(([x, y]) => [x - 18 - k * 26, y + 26 + k * 30]);
      featherRow(g, row, { step: 11, len: 26, w: 1.7, color: gv(0.25, 0.7), ang: 0.35, seed: 262 + k, gap: 0.3 });
    }
    MARGINAL.forEach(([a, b]) => { const m = add(V.mix(a, b, 0.5), [0, 4]); ink(g, [a, m, b, add(b, [-6, 5])], 1.8, gv(0.2, 0.7), { end: 0.1, bias: 0.4 }); });
    // coverts: the lower edge inked and hooked round the tip, a fine grey upper edge
    LOOPS.forEach(([tip, L, w, ang], i) => {
      const d = [Math.cos(ang), Math.sin(ang)], n = perp(d), S = sub(tip, mul(d, L));
      const P = (t, k) => add(add(S, mul(d, L * t)), mul(n, k * w));
      g.fillStyle = gv(0.92, 0.5); g.beginPath(); smoothPath(g, [P(0, -0.5), P(0.5, -1), P(0.92, -0.7), P(1, 0), P(0.92, 0.75), P(0.5, 1), P(0, 0.5)], true); g.fill();
      brush(g, [P(0.05, 0.8), P(0.5, 1.02), P(0.88, 0.85), P(1.0, 0.2), P(0.97, -0.45), P(0.86, -0.75)], 2.1, gv(0.1, 0.9), { head: 0.3, pow: 0.4 });
      ink(g, [P(0.1, -0.6), P(0.5, -1), P(0.8, -0.85)], 1.1, gv(0.35, 0.6), { end: 0.1 });
    });
    // the root of the wing against the body: clumped swept strokes
    clumpField(g, wp, [1510, 380, 1660, 640], 34, (x, y) => 1.2 + (y - 380) * 0.002, 253, { n: [3, 5], len: [28, 46], w: [1.8, 3], color: gv(0.22, 0.75), spread: 9 });
  });
  if (!MEAS) keyline(g, sampleCurve(WING.slice(0, 46), 4), 2.6);
  if (CEL) { drawCel(g, CELHP.wrW); mottle(g, wp, CELHP.wrW); }   // (fix pass 1) the wing root and shoulder, measured cel trace
}
// talons (measured at 35.80, 3x): each toe a knobby tube of three segments narrowing to the claw, scale bands across
// it, a heavy outline (heavier underneath) and a long pale hooked claw; the left foot's long pale back toe runs right
// behind its toes. [centerline base -> claw root], [widths], claw tip
const TOES = [
  { c: [[1270, 884], [1300, 890], [1328, 896], [1352, 902]], w: [28, 25, 20, 12], claw: null, back: true },
  { c: [[1266, 884], [1262, 900], [1253, 914], [1242, 925]], w: [48, 46, 40, 28], claw: [1236, 946] },
  { c: [[1230, 886], [1226, 902], [1217, 915], [1206, 925]], w: [44, 42, 37, 26], claw: [1198, 947] },
  { c: [[1192, 902], [1189, 915], [1183, 926], [1175, 933]], w: [38, 36, 32, 22], claw: [1170, 950] },
  { c: [[1562, 894], [1558, 909], [1551, 921], [1542, 930]], w: [46, 44, 39, 27], claw: [1538, 950] },
  { c: [[1460, 884], [1456, 900], [1449, 913], [1440, 923]], w: [46, 44, 39, 27], claw: [1433, 947] },
  { c: [[1516, 882], [1512, 898], [1503, 911], [1491, 921]], w: [54, 51, 45, 31], claw: [1484, 946] },
];
// below the frame edge in C: the far toes' claws curling under the perch (they come into view when the feet rise 15 px in A/B)
const UNDER = [[1182, 946, 1198, 972], [1236, 944, 1250, 970], [1446, 944, 1462, 972], [1494, 942, 1508, 970], [1546, 946, 1560, 972]];
function toe(g, T, seed) {
  const r = rng(seed), c = T.c, w = T.w;
  const q = sampleCurve(c, 8), n = q.length;
  const wAt = (u) => { const f = u * (w.length - 1), i = Math.min(w.length - 2, Math.floor(f)), k = f - i; return w[i] * (1 - k) + w[i + 1] * k; };
  const tan = (i) => nrm(sub(q[Math.min(n - 1, i + 1)], q[Math.max(0, i - 1)]));
  // knobby outline: the width bulges at each knuckle (the control points) and pinches between; rounded top cap
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), t = tan(i), nn = perp(t);
    const knob = 1 + 0.05 * Math.cos(u * (c.length - 1) * TAU) - 0.02;
    const hw = (wAt(u) / 2) * knob;
    L.push(add(q[i], mul(nn, hw))); R.push(sub(q[i], mul(nn, hw)));
  }
  const t0 = tan(0), n0 = perp(t0), hw0 = (w[0] / 2) * 1.07;
  const capArc = []; for (let k = 1; k < 8; k++) { const th = (k / 8) * Math.PI; capArc.push(add(add(q[0], mul(n0, -Math.cos(th) * hw0)), mul(t0, -Math.sin(th) * hw0 * 0.85))); }
  const cap = capArc[3];
  const tipP = add(q[n - 1], mul(tan(n - 1), wAt(1) * 0.45));
  const body = (cx) => { smoothPath(cx, [...R.slice().reverse(), ...capArc, ...L, tipP], true, 0.45); };
  g.fillStyle = gv(T.back ? 0.76 : 0.9); g.beginPath(); body(g); g.fill();
  clipTo(g, body, () => {
    g.filter = "blur(5px)";
    const mid = q[Math.floor(n * 0.35)], nn = perp(t0);
    g.fillStyle = gv(0.97, 0.85); g.beginPath(); g.ellipse(mid[0] + nn[0] * w[0] * 0.18, mid[1] + nn[1] * w[0] * 0.18 - 4, w[0] * 0.2, w[0] * 0.55, Math.atan2(t0[1], t0[0]) - Math.PI / 2, 0, TAU); g.fill();
    g.fillStyle = gv(0.62, 0.6); g.beginPath(); g.ellipse(mid[0] - nn[0] * w[0] * 0.34, mid[1] - nn[1] * w[0] * 0.34 + 6, w[0] * 0.13, w[0] * 0.7, Math.atan2(t0[1], t0[0]) - Math.PI / 2, 0, TAU); g.fill();
    g.filter = "none";
    // knuckle creases: curved arcs across the toe at each joint, plus a short scale tick or two per segment
    for (let j = 1; j < c.length; j++) {
      const u = j / (c.length - 1) - 0.06, i = Math.min(n - 1, Math.round(u * (n - 1))), t = tan(i), nn = perp(t), hw = wAt(u) / 2;
      const p0 = add(q[i], mul(nn, hw * 0.75)), p2 = sub(q[i], mul(nn, hw * 0.55)), p1 = add(V.mix(p0, p2, 0.5), mul(t, hw * 0.35));
      swellStroke(g, [p0, p1, p2], 1.8 + r() * 0.5, gv(0.18, 0.9));
      if (T.back || r() < 0.7) {
        const u2 = (j - 0.5) / (c.length - 1), i2 = Math.round(u2 * (n - 1)), t2 = tan(i2), n2 = perp(t2), h2 = wAt(u2) / 2;
        const s0 = add(q[i2], mul(n2, h2 * (0.2 + r() * 0.4))), s2 = add(s0, mul(n2, -h2 * 0.5)), s1 = add(V.mix(s0, s2, 0.5), mul(t2, h2 * 0.2));
        swellStroke(g, [s0, s1, s2], 1.2, gv(0.35, 0.7));
      }
    }
    if (T.back) for (let k = 0; k < 7; k++) { const u = 0.15 + k * 0.11, i = Math.round(u * (n - 1)), t = tan(i), nn = perp(t), hw = wAt(u) / 2; swellStroke(g, [add(q[i], mul(nn, hw * 0.1)), add(add(q[i], mul(nn, -hw * 0.45)), mul(t, 3)), sub(q[i], mul(nn, hw * 0.95))], 1.6, gv(0.25, 0.8)); }
  });
  // outline: heavier on the underside (R, away from the light) than on top
  taper(g, [...capArc.slice(3), ...L], (u) => 1.8 + u * 1.4, LINE);
  taper(g, [...capArc.slice(0, 4).reverse(), ...R, tipP], (u) => 2.6 + u * 1.6, LINE);
  // the claw: a long pale hooked blade out of the toe tip
  if (T.claw) {
    const root = q[n - 1], d = nrm(sub(T.claw, root)), nn = perp(d), cw = wAt(1) * 0.4;
    const claw = [add(root, mul(nn, cw)), add(V.mix(root, T.claw, 0.55), mul(nn, cw * 0.6)), [T.claw[0], T.claw[1], 1], add(V.mix(root, T.claw, 0.5), mul(nn, -cw * 0.7)), add(root, mul(nn, -cw))];
    g.fillStyle = gv(0.9); g.beginPath(); mixPath(g, claw, true); g.fill();
    clipTo(g, (cx) => mixPath(cx, claw, true), () => { g.filter = "blur(2px)"; const m = V.mix(root, T.claw, 0.5); g.fillStyle = gv(0.5, 0.6); g.beginPath(); g.ellipse(m[0] - nn[0] * cw * 0.5, m[1], cw * 0.3, 10, 0, 0, TAU); g.fill(); g.filter = "none"; });
    g.strokeStyle = LINE; g.lineWidth = 2; g.beginPath(); mixPath(g, claw, true); g.stroke();
  }
}
const ringsPath = (rings) => (c) => { for (const r of rings) { c.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) c.lineTo(r[i], r[i + 1]); c.closePath(); } };
// measured talons (./s13/feetC.js): pale toes with flat grey shading shapes, the traced knuckle lines and outlines
const FEET_TONE = { lit: 0.97, mid: 0.8 };
function paintFeetMeasured(g) {
  const lp = ringsPath(FEET.lit);
  g.fillStyle = gv(FEET_TONE.lit); g.beginPath(); lp(g); g.fill("evenodd");
  clipTo(g, lp, () => {
    g.fillStyle = gv(FEET_TONE.mid); g.beginPath(); ringsPath(FEET.mid)(g); g.fill("evenodd");
    applyTone(g, "feet", lp);
    drawStrokes(g, FEET.strokes);
  });
  if (CEL) drawCel(g, CELHP.feetC);   // (fix pass 1) the talons, measured cel trace
}
function paintFeet(g) {
  if (MEAS) return paintFeetMeasured(g);
  const r = rng(281);
  // feathered legs: dark hair strokes at the top of each foot
  for (const [x0, x1, y0] of [[1170, 1300, 846], [1430, 1590, 838]]) {
    for (let i = 0; i < 18; i++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * 28; brush(g, [[x, y], [x + 4, y + 12], [x + 8 + r() * 6, y + 22 + r() * 18]], 2.2, gv(0.15, 0.75)); }
  }
  for (const [x0, y0, x1, y1] of UNDER) {
    const c = [[x0 - 10, y0 - 6], [x0 + 12, y0 - 4], [x1 + 4, y1 - 8], [x1, y1, 1], [x0 - 6, y0 + 12]];
    g.fillStyle = gv(0.88); g.beginPath(); mixPath(g, c, true); g.fill();
    g.strokeStyle = LINE; g.lineWidth = 2.6; g.beginPath(); mixPath(g, c, true); g.stroke();
  }
  TOES.forEach((t, i) => toe(g, t, 290 + i));
  // the back toe's fuzzy dark underside (scaly shadow below it)
  const r2 = rng(299);
  for (let i = 0; i < 22; i++) { const x = 1262 + r2() * 110, y = 896 + (x - 1262) * 0.08 + r2() * 8; brush(g, [[x, y], [x + 2, y + 10 + r2() * 12]], 2, gv(0.12, 0.8)); }
}
// ---- head, 3/4 (pose C)
// the far run of the band (measured column profiles at 35.80): the pale outer rim from (1100,60) up through (1190,2),
// out of frame over 1250-1320, back in at (1340,0) and down to the clamp; its dark mesh inner face shows below the
// rim, wide on the left (~28 px) where the band turns toward us, narrow on the right
const BAND_BACK = [[1088, 74], [1130, 36], [1160, 16], [1190, 2], [1230, -12], [1280, -24], [1330, -6], [1370, 6], [1400, 14], [1432, 30], [1462, 62]];
function paintHead3q(g) {
  // the far run of the headband behind the crown: we see its inner face (a dark mesh strip) under a pale rim
  if (!CEL) {
    const bq = sampleCurve(BAND_BACK, 8);
    const bw = (u) => (u < 0.3 ? 28 : u < 0.5 ? 28 - (u - 0.3) * 100 : 8 + (u - 0.5) * 8);
    const inner = bq.map(([x, y], i) => { const a = bq[Math.max(0, i - 1)], b = bq[Math.min(bq.length - 1, i + 1)], n = nrm(perp(sub(b, a))), o = 3 + bw(i / (bq.length - 1)) / 2; return [x + n[0] * o, y + n[1] * o]; });
    taper(g, inner, (u) => bw(u) + 5, LINE);
    taper(g, inner, bw, halftonePat(g, 3.4, 0.08, MEAS ? 0.34 : 0.42));
    taper(g, bq, () => 8, LINE);
    taper(g, bq, () => 5, gv(MEAS ? 0.6 : 0.8));
    paintSlider3q(g);
  }
  const HP = headPts(), hp = MEAS ? sil("head") : shp(HP);
  // plumage: glowing white, light grey along the crown and in the tufts
  g.fillStyle = gv(0.975); g.beginPath(); hp(g); g.fill();
  clipTo(g, hp, () => {
    g.filter = "blur(22px)";
    g.fillStyle = gv(0.8, 0.7); g.beginPath(); smoothPath(g, [[1000, 30], [1200, 25], [1470, 10], [1470, 110], [1250, 105], [1060, 120], [990, 100]], true); g.fill();
    g.fillStyle = gv(0.72, 0.7); g.beginPath(); smoothPath(g, [[940, 0], [1030, 0], [1030, 90], [950, 140]], true); g.fill();
    g.fillStyle = gv(0.86, 0.5); g.beginPath(); g.ellipse(1060, 215, 60, 40, 0, 0, TAU); g.fill();
    g.fillStyle = gv(0.84, 0.45); g.beginPath(); g.ellipse(1380, 330, 40, 120, 0, 0, TAU); g.fill();
    g.filter = "none";
    // tufts: 1-2 grey strokes along each flame toward its tip, a dark ink wedge down into every notch
    const r = rng(311);
    const NH = HP.length, at = (i) => HP[(i + NH) % NH];
    HP.forEach((p, i) => {
      if (p[2] === 2) {
        const a = at(i - 1), b = at(i + 1), base = V.mix(a, b, 0.5), d = sub(p, base), L = Math.hypot(d[0], d[1]);
        const back = sub(base, mul(d, 0.6 + r() * 0.4));
        if (PROC) brush(g, [back, V.mix(back, p, 0.5), V.mix(back, p, 0.92)], 2.4 + r() * 1.4, gv(0.34 + r() * 0.2, 0.8));
        if (PROC && L > 25 && r() < 0.7) { const o = mul(perp(nrm(d)), (r() - 0.5) * L * 0.25); brush(g, [add(back, o), add(V.mix(back, p, 0.6), o)], 1.8 + r(), gv(0.4, 0.7)); }
      } else if (!MEAS && p[2] === 1 && p[1] < 280) {   // (the lower-left and chin runs are soft fur edges: no black wedges)
        const a = at(i - 1), b = at(i + 1), t = nrm(sub(b, a)), o = [t[1], -t[0]];
        const fl = a[2] === 2 ? nrm(sub(p, a)) : mul(o, -1);
        const dir = nrm(add(mul(o, -1), mul(fl, 0.6)));
        const big = p[1] < 100 && p[0] > 1100 ? 1.4 : 1;
        wedge(g, p, dir, (7 + r() * 9) * big, (3 + r() * 2.5) * big, gv(0.05, 0.95), (r() - 0.5) * 0.2);
      }
    });
  });
  if (!MEAS) { const i1 = HP.findIndex((p) => p[0] === 1446 && p[1] === 380); keyline(g, sampleCurve(HP.slice(0, i1).map((p) => [p[0], p[1]]), 3), 1.6, gv(0.25, 0.55)); }
  if (!PROC) {
    clipTo(g, hp, () => { softShade(g, hp, (c) => c.ellipse(925, 470, 22, 70, -0.6, 0, TAU), 0.66, 0.6, 10); applyTone(g, "head", hp); drawStrokes(g, SC.head); });
    if (CEL) { drawCel(g, CELHP.wrH); drawCelMasked(g, CELHP.hlC, nubOnlyMask, "out"); drawCel(g, CELHP.crC); mottle(g, hp, CELHP.hlC); mottle(g, hp, CELHP.crC); }   // (+ the cheek tufts over the nub, the crown and ear tufts)
  } else {
  // left side: bold clumps combing down-left toward the tufts; the cheek below the left eye shaded with strokes
  clipTo(g, hp, () => {
    // (measured: along the lower-left edge the strokes run parallel to it, down-right; above the nub they hang left)
    clumpRim(g, [[912, 470], [904, 420], [898, 370], [894, 320], [890, 270], [890, 225]], { step: 24, inset: 9, seed: 312, flow: (p) => (p[1] > 380 ? 1.2 : 2.3), n: [3, 5], len: [24, 42], w: [2.0, 3.2], color: gv(0.32, 0.8), spread: 9 });
    clumpRim(g, [[936, 498], [974, 522], [1014, 540]], { step: 24, inset: 8, seed: 313, flow: () => 0.95, n: [3, 5], len: [22, 38], w: [2.0, 3.2], color: gv(0.34, 0.8), spread: 9 });
    clumpField(g, hp, [915, 410, 1000, 470], 4, () => 1.0, 314, { n: [2, 4], len: [22, 34], w: [1.8, 2.6], color: gv(0.5, 0.6) });
    softShade(g, hp, (c) => c.ellipse(925, 470, 22, 70, -0.6, 0, TAU), 0.66, 0.6, 10);
    // a fuzzy dark rim hugging the lower-left edge: fine strokes running along it
    { const edge = sampleCurve([[892, 290], [896, 340], [902, 400], [912, 460], [940, 500], [980, 526], [1030, 546]], 10), rr = rng(317);
      for (let i = 0; i < edge.length - 6; i += 2) { if (rr() < 0.35) continue; const a = edge[i], b = edge[Math.min(edge.length - 1, i + 3 + Math.floor(rr() * 4))], t = nrm(sub(b, a)), n = [-t[1], t[0]], o = 2 + rr() * 5; brush(g, [add(a, mul(n, -o)), add(b, mul(n, -o - rr() * 2))], 1.4 + rr() * 1.2, gv(0.25 + rr() * 0.2, 0.75), { head: 0.3, pow: 0.6 }); } }
    // under the ear tufts, over the bandage: strokes pointing up into the tufts
    clumpRim(g, [[900, 200], [925, 168], [950, 140], [975, 110], [1010, 90]], { step: 26, inset: 14, seed: 315, flow: (p) => -1.9 - (p[0] - 900) * 0.002, n: [2, 4], len: [24, 40], w: [2, 3.2], color: gv(0.34, 0.8), spread: 9 });
    // crown: strokes combing up-right into the flames
    clumpRim(g, [[1100, 92], [1170, 84], [1240, 80], [1300, 92], [1350, 100]], { step: 30, inset: 12, seed: 316, flow: () => -0.55, n: [2, 4], len: [30, 55], w: [2, 3.2], color: gv(0.35, 0.8), spread: 10 });
  });
  // forehead: long diagonal strokes up to the crown (measured groups at 1090-1330, 110-230)
  const FH = [[1098, 178, 1196, 124], [1126, 196, 1216, 146], [1150, 214, 1236, 160], [1170, 170, 1262, 112], [1105, 158, 1168, 122], [1222, 128, 1300, 92], [1254, 142, 1334, 102], [1190, 232, 1272, 180], [1280, 170, 1352, 130]];
  FH.forEach(([x0, y0, x1, y1], i) => { const q = rng(320 + i); brush(g, [[x0, y0], [(x0 + x1) / 2 - 2, (y0 + y1) / 2 - 3], [x1, y1]], 1.8 + q() * 0.9, gv(0.36 + q() * 0.12, 0.8)); });
  // right tuft: strokes toward the tip
  clipTo(g, hp, () => { for (let k = 0; k < 6; k++) { const b = [1372 + k * 8, 128 - k * 6]; brush(g, [b, V.mix(b, [1462, 16], 0.5), V.mix(b, [1462, 16], 0.9)], 2.2, gv(0.34, 0.7)); } });
  // facial disc: the V of brow strokes converging over the beak, rows over the eyes and under them
  featherRow(g, [[958, 214], [990, 236], [1020, 262], [1046, 290]], { step: 7, len: 28, w: 2.4, color: gv(0.34, 0.8), ang: 2.5, seed: 321, gap: 0.1 });
  featherRow(g, [[1124, 214], [1100, 240], [1078, 264], [1058, 290]], { step: 7, len: 26, w: 2.4, color: gv(0.34, 0.8), ang: -2.5, seed: 322, gap: 0.1 });
  featherRow(g, [[1090, 222], [1160, 208], [1240, 212], [1290, 232]], { step: 8, len: 22, w: 1.8, color: gv(0.42, 0.6), ang: -0.5, seed: 323, gap: 0.3 });
  featherRow(g, [[912, 250], [930, 238], [960, 230], [990, 236]], { step: 8, len: 18, w: 1.6, color: gv(0.42, 0.6), ang: 0.6, seed: 324, gap: 0.3 });
  featherRow(g, [[1100, 404], [1160, 420], [1230, 414], [1290, 384]], { step: 8, len: 22, w: 2.0, color: gv(0.4, 0.65), ang: -2.4, seed: 325, gap: 0.25 });
  featherRow(g, [[915, 404], [950, 422], [990, 420]], { step: 8, len: 20, w: 2.0, color: gv(0.38, 0.7), ang: -2.2, seed: 326, gap: 0.2 });
  // chin: rows of short strokes under the beak
  featherRow(g, [[1060, 520], [1130, 505], [1210, 498], [1290, 490]], { step: 12, len: 22, w: 2.0, color: gv(0.45, 0.6), ang: 2.6, seed: 327, gap: 0.35 });
  featherRow(g, [[1130, 452], [1200, 462], [1280, 452], [1360, 430]], { step: 12, len: 22, w: 1.8, color: gv(0.48, 0.55), ang: 2.7, seed: 328, gap: 0.4 });
  // the right side of the face toward the cup: long soft strokes down
  clumpField(g, hp, [1300, 240, 1410, 420], 6, () => 1.9, 329, { n: [2, 4], len: [30, 50], w: [1.8, 2.8], color: gv(0.45, 0.6) });
  }
  // under the cup: its cast shadow on the neck (CEL: part of the measured headphone trace)
  if (!CEL) paintCupShadow(g, hp);
  paintEyes3q(g);
  paintBeak3q(g);
  paintBandage3q(g);
  // sweat drop. (w3) re-measured on the C hold (median 891-898, ridge per row): a grey outline, not a filled white
  // drop — a fine tail from (1296, 231) down the left side at x 1303, the round bottom at (1311, 301), up the right
  // side to fade out at (1313, 264); no fill (the plumage shows through), a faint grey dab inside the bottom
  paintDrop(g);
  if (CEL) drawCel(g, CELHP.hpC); else paintCup3q(g);
}
const DROP = [[1295.5, 231], [1298.5, 238], [1300.5, 244], [1302, 250], [1303, 257], [1303.3, 266], [1303.3, 276], [1303.4, 286], [1304, 293], [1305.5, 297], [1308, 299.8], [1311, 300.5], [1314, 299.3], [1316.3, 296.5], [1317.6, 292], [1318, 285], [1317.2, 279], [1315.8, 273], [1314.3, 268], [1313, 264]];
const DROP_W = [0.3, 0.8, 1.3, 1.7, 1.9, 2.1, 2.4, 2.8, 3.0, 3.1, 3.1, 3.1, 3.1, 3.0, 2.8, 2.4, 1.5, 0.8, 0.4, 0.2];
const DROP_INK = { v: 0.2, dab: 0.72 };
function paintDrop(g) {
  // DROP is in source pixel indices (pixel centre = index + 0.5), drawn in the head layer, which is shifted by
  // SUBPX.head: move it back onto the measured ridge
  const o = [0.5 - SUBPX.head[0], 0.5 - SUBPX.head[1]];
  const q = sampleCurve(DROP.map(([x, y]) => [x + o[0], y + o[1]]), 4), n = DROP.length;
  taper(g, q, (u) => { const f = u * (n - 1), i = Math.min(n - 2, Math.floor(f)), k = f - i; return DROP_W[i] * (1 - k) + DROP_W[i + 1] * k; }, gv(DROP_INK.v));
  ink(g, [[1308.6 + o[0], 285 + o[1]], [1308.4 + o[0], 290 + o[1]], [1308.6 + o[0], 295 + o[1]]], 2.6, gv(DROP_INK.dab, 0.7), { end: 0.3 });
}
// the bandage (measured at 35.80, 3x): a long thin strip from the left cap (938,157) up to the right cap (1093,80),
// and over it a short wide pad strip from (978,100) down to its rounded end at (1060,160)
function paintBandage3q(g) {
  if (CEL) return drawCel(g, CELHP.bgC, { feather: 1.5 });
  const strip = (a, b, w, rEnd0, rEnd1) => (c) => {
    const d = sub(b, a), L = Math.hypot(d[0], d[1]), t = mul(d, 1 / L), n = perp(t);
    const P = (u, v) => add(add(a, mul(t, u)), mul(n, v));
    const p0 = P(rEnd0, -w / 2);
    c.moveTo(p0[0], p0[1]);
    let q = P(L - rEnd1, -w / 2); c.lineTo(q[0], q[1]);
    let c1 = P(L, -w / 2), e1 = P(L, -w / 2 + rEnd1); c.quadraticCurveTo(c1[0], c1[1], e1[0], e1[1]);
    q = P(L, w / 2 - rEnd1); c.lineTo(q[0], q[1]);
    c1 = P(L, w / 2); e1 = P(L - rEnd1, w / 2); c.quadraticCurveTo(c1[0], c1[1], e1[0], e1[1]);
    q = P(rEnd0, w / 2); c.lineTo(q[0], q[1]);
    c1 = P(0, w / 2); e1 = P(0, w / 2 - rEnd0); c.quadraticCurveTo(c1[0], c1[1], e1[0], e1[1]);
    q = P(0, -w / 2 + rEnd0); c.lineTo(q[0], q[1]);
    c1 = P(0, -w / 2); c.quadraticCurveTo(c1[0], c1[1], p0[0], p0[1]);
    c.closePath();
  };
  const dots = (pts) => { g.fillStyle = gv(0.12, 0.9); for (const [x, y] of pts) { g.beginPath(); g.arc(x, y, 1.7, 0, TAU); g.fill(); } };
  const long = strip([940, 156], [1092, 82], 29, 14, 14);
  g.fillStyle = gv(0.9); g.beginPath(); long(g); g.fill();
  clipTo(g, long, () => { g.filter = "blur(4px)"; g.fillStyle = gv(0.7, 0.6); g.beginPath(); g.moveTo(935, 170); g.lineTo(1100, 92); g.lineTo(1100, 102); g.lineTo(935, 180); g.fill(); g.filter = "none"; });
  g.strokeStyle = LINE; g.lineWidth = 2.2; g.beginPath(); long(g); g.stroke();
  dots([[952, 150], [958, 142], [966, 146], [962, 154], [970, 138], [975, 132], [972, 150], [1036, 98], [1046, 92], [1054, 88], [1060, 97], [1068, 84], [1074, 92], [1080, 88]]);
  const pad = strip([974, 102], [1060, 156], 48, 8, 22);
  g.fillStyle = gv(0.92); g.beginPath(); pad(g); g.fill();
  clipTo(g, pad, () => { g.filter = "blur(5px)"; g.fillStyle = gv(0.66, 0.6); g.beginPath(); g.ellipse(1000, 140, 34, 10, 0.55, 0, TAU); g.fill(); g.filter = "none"; });
  g.strokeStyle = LINE; g.lineWidth = 2.2; g.beginPath(); pad(g); g.stroke();
  ink(g, [[978, 118], [1004, 110], [1024, 104]], 1.4, gv(0.3, 0.8), { end: 0.3 });
  dots([[1012, 140], [1024, 132], [1030, 146], [1040, 136], [1046, 148], [1020, 152], [1036, 124]]);
}
// pupil: a small dark dot inside a ring broken into two arcs, like a pair of parentheses
function pupil(g, e) {
  const P = e.pupil || { x: e.px, y: e.py, rx: e.pr * (e.prx ?? 1), ry: e.pr * (e.pry ?? 1), dot: [e.pr * 0.42, e.pr * 0.42], arcs: [[1.95, 4.35, 1.8], [-1.05, 1.05, 1.5]] };
  for (const [a0, a1, w] of P.arcs) {
    const pts = []; for (let i = 0; i <= 16; i++) { const a = a0 + ((a1 - a0) * i) / 16; pts.push([P.x + Math.cos(a) * P.rx, P.y + Math.sin(a) * P.ry]); }
    taper(g, pts, (u) => w * (0.3 + 0.7 * Math.pow(Math.sin(Math.PI * u), 0.5)), gv(0.1, 0.95));
  }
  g.fillStyle = LINE; g.beginPath(); g.ellipse(P.x, P.y + 0.5, P.dot[0], P.dot[1], 0, 0, TAU); g.fill();
  if (P.notch) { g.fillStyle = gv(0.99); g.beginPath(); g.moveTo(P.x - 1.2, P.y - P.dot[1] - 0.5); g.lineTo(P.x + 1.2, P.y - P.dot[1] - 0.5); g.lineTo(P.x, P.y - P.dot[1] * 0.3); g.fill(); }
}
// a big startled eye: white inside a rim drawn as 2-3 overlapping brush strokes (radius and weight measured round
// the eye at 32 angles on the source), fine grey lashes outside it, and the pupil
function eye(g, e, seed) {
  const R = e.R ? angInterp(e.R) : () => 1;
  const Wd = e.W ? angInterp(e.W) : (a) => 4.4 + 2 * Math.pow(Math.max(0, Math.sin(a)), 1.2) + 1.2 * Math.max(0, -Math.cos(a));
  const cr = Math.cos(e.rot), sr = Math.sin(e.rot);
  const at = (a, k) => { const x = Math.cos(a) * e.rx * k, y = Math.sin(a) * e.ry * k; return [e.x + x * cr - y * sr, e.y + x * sr + y * cr]; };
  g.fillStyle = gv(0.99); g.beginPath();
  for (let i = 0; i <= 64; i++) { const a = (i / 64) * TAU, q = at(a, R(a)); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }
  g.fill();
  const r = rng(seed);
  for (const [a0, a1, n0] of e.lash) {
    const n = Math.round(n0 * 1.3);
    for (let i = 0; i < n; i++) {
      const a = a0 + (a1 - a0) * r(), k = R(a) + 0.07 + r() * 0.08, span = 0.25 + r() * 0.35;
      swellStroke(g, [at(a, k), at(a + span * 0.5, k + 0.015), at(a + span, k)], 1.1 + r() * 0.9, gv(0.32, 0.65));
    }
  }
  brushRim(g, e, R, Wd, e.segs || [[-0.35, 3.35, 0], [3.0, 6.1, 0.004], [5.75, 6.75, -0.003]], gv(0.07));
  if (e.tick) brush(g, e.tick, 4.5, gv(0.07));
  pupil(g, e);
}
function paintEyes3q(g) {
  if (CEL) { drawCel(g, CELHP.eyeC0, { feather: 1.5 }); drawCel(g, CELHP.eyeC1, { feather: 1.5 }); return; }   // (fix pass 1) measured cel traces
  eye(g, EYE_L, 341); eye(g, EYE_R, 342);
}
function paintBeak3q(g) {
  if (CEL) return drawCel(g, CELHP.beakC, { feather: 1.5 });
  // measured on 35.80 (6x zoom): a pale hooked upper mandible with smooth grey washes, the mouth a dark lens under
  // a heavy upper lip with a grey tongue in it, and the lower mandible hanging open as a pale wedge (tip 1048,512)
  const up = [[1008, 396], [1034, 392], [1062, 398], [1070, 420], [1067, 444], [1060, 457], [1053, 462], [1045, 468], [1038, 477], [1035, 487], [1032.5, 495, 1], [1025, 488], [1015, 473], [1006, 453], [1004, 430], [1005, 410]];
  const p = shp(up);
  g.fillStyle = gv(0.74); g.beginPath(); p(g); g.fill();
  clipTo(g, p, () => {
    g.filter = "blur(7px)";
    g.fillStyle = gv(0.93); g.beginPath(); g.ellipse(1016, 436, 8, 40, 0.2, 0, TAU); g.fill();
    g.fillStyle = gv(0.84, 0.7); g.beginPath(); g.ellipse(1030, 412, 22, 14, 0, 0, TAU); g.fill();
    g.fillStyle = gv(0.6, 0.85); g.beginPath(); g.ellipse(1057, 452, 12, 14, 0.4, 0, TAU); g.fill();
    g.fillStyle = gv(0.84, 0.7); g.beginPath(); g.ellipse(1026, 482, 8, 10, 0.5, 0, TAU); g.fill();
    g.filter = "none";
  });
  g.save(); g.filter = "blur(4px)"; swellStroke(g, [[1066, 398], [1075, 420], [1072, 444], [1066, 455]], 7, gv(0.97, 0.8), { end: 0.6 }); g.restore();
  // mouth: the dark cavity (a lens under the upper lip running down the left side of the tongue to the hinge)
  const cav = [[1049, 468], [1054, 461], [1064, 454], [1076, 451], [1090, 454], [1104, 459], [1113, 465], [1119, 471], [1104, 466], [1090, 463.5], [1078, 464], [1068, 467], [1063, 474], [1061.5, 484], [1060, 492], [1058, 494], [1056, 484], [1052, 472]];
  g.fillStyle = gv(0.04); g.beginPath(); smoothPath(g, cav, true); g.fill();
  // tongue: grey, a couple of pale streaks along it
  const tongue = [[1063, 478], [1068, 469.5], [1080, 466], [1096, 465.5], [1111, 467.5], [1118, 471], [1104, 477], [1088, 482], [1074, 489], [1062, 494]];
  g.fillStyle = gv(0.42); g.beginPath(); smoothPath(g, tongue, true); g.fill();
  clipTo(g, (c) => smoothPath(c, tongue, true), () => {
    g.filter = "blur(2px)"; g.fillStyle = gv(0.18, 0.8); g.beginPath(); g.ellipse(1086, 467, 26, 3.5, 0.05, 0, TAU); g.fill(); g.filter = "none";
    swellStroke(g, [[1072, 475], [1092, 471], [1112, 470]], 2.8, gv(0.86, 0.85));
    swellStroke(g, [[1068, 485], [1086, 478], [1105, 474]], 2.0, gv(0.72, 0.8));
  });
  // lower mandible: a pale wedge hanging from the hinge, inner lip along its top
  const jaw = [[1057, 497], [1072, 489], [1088, 481], [1104, 475], [1118, 471], [1113, 482], [1104, 493], [1088, 504], [1070, 509], [1047.5, 513, 1]];
  g.fillStyle = gv(0.9); g.beginPath(); mixPath(g, jaw, true); g.fill();
  clipTo(g, (c) => mixPath(c, jaw, true), () => {
    g.filter = "blur(5px)"; g.fillStyle = gv(0.62, 0.8); g.beginPath(); g.ellipse(1057, 505, 9, 7, 0.3, 0, TAU); g.fill();
    g.fillStyle = gv(0.78, 0.6); g.beginPath(); g.ellipse(1098, 496, 14, 5, -0.5, 0, TAU); g.fill(); g.filter = "none";
  });
  // the jaw's near side between the cavity and its outer edge
  const side = [[1051, 469], [1055, 486], [1058, 498], [1047.5, 513], [1049, 490]];
  g.fillStyle = gv(0.7); g.beginPath(); smoothPath(g, side, true); g.fill();
  // ink: mandible outline and hook, the heavy upper lip, the jaw outline and inner lip
  swellStroke(g, [[1008, 402], [1004, 430], [1006, 453], [1015, 473], [1025, 488], [1032.5, 495]], 3.3, LINE, { end: 0.35 });
  swellStroke(g, [[1032.5, 496], [1035.5, 486], [1038, 477], [1045, 468]], 2.8, LINE, { end: 0.5 });
  swellStroke(g, [[1044, 469], [1053, 462], [1066, 453], [1078, 450.5], [1092, 454], [1106, 460], [1119, 470]], 4.6, LINE, { end: 0.25, pow: 0.4 });
  swellStroke(g, [[1052, 468], [1049, 490], [1047.5, 513]], 2.6, LINE, { end: 0.5 });
  swellStroke(g, [[1047.5, 513], [1070, 509.5], [1088, 505], [1104, 494], [1113, 483], [1119, 471]], 2.8, LINE, { end: 0.3 });
  swellStroke(g, [[1057, 497], [1072, 489], [1088, 481], [1104, 475], [1117, 471]], 1.7, gv(0.12), { end: 0.3 });
  // the facial feathers overlap the root of the beak
  const r = rng(391);
  for (let i = 0; i < 30; i++) { const x = 1000 + r() * 70, y = 376 + r() * 14; flick(g, [x, y], nrm([0.25 * (r() - 0.5), 1]), 18 + r() * 14, 3.0, gv(0.97), 0.1); }
  // rictal bristles: dark tapered strokes sweeping down-right across the beak base to the mouth corner
  const BR = [[1052, 398, 1061, 421], [1057, 395, 1067, 423], [1063, 403, 1074, 433], [1068, 408, 1083, 440], [1075, 414, 1091, 443], [1082, 428, 1098, 452], [1090, 432, 1108, 459],
    [1098, 440, 1115, 463], [1107, 444, 1123, 463], [1115, 447, 1130, 462], [1046, 400, 1052, 418]];
  BR.forEach(([x0, y0, x1, y1], i) => { const q = rng(395 + i); brush(g, [[x0, y0], [(x0 + x1) / 2 + 1.5, (y0 + y1) / 2 - 1], [x1, y1]], 2.2 + q() * 0.8, gv(0.2 + q() * 0.15, 0.95)); });
  g.fillStyle = LINE; g.beginPath(); g.ellipse(1041, 418.5, 3.6, 2.9, 0.3, 0, TAU); g.fill();
}
// the near headphone cup, seen from the side: ribbed dark cushion against the head, brushed shell, mesh plate,
// a pale yoke bar down the front and the mesh slider running up to the band
function halftonePat(g, pitch = 4, dark = 0.1, light = 0.82) {
  const c = document.createElement("canvas"); c.width = c.height = pitch * 2;
  const d = c.getContext("2d");
  d.fillStyle = gv(light); d.fillRect(0, 0, pitch * 2, pitch * 2);
  d.fillStyle = gv(dark);
  for (const [px, py] of [[pitch * 0.5, pitch * 0.5], [pitch * 1.5, pitch * 1.5]]) { d.beginPath(); d.arc(px, py, pitch * 0.34, 0, TAU); d.fill(); }
  return g.createPattern(c, "repeat");
}
// the band's near run coming down to the slider clamp (drawn before the head: the right tuft overlaps it)
function paintSlider3q(g) {
  const bd = sampleCurve([[1392, -8], [1422, 18], [1444, 40], [1456, 56]], 8);
  taper(g, bd, () => 16, LINE);
  taper(g, bd, () => 10, gv(0.72));
}
// The near cup in 3/4 (measured at 35.80, 3x zooms): a black leather cushion against the head with crumpled
// highlights, the chrome shell ring round a mesh plate, the mesh arm running up to the hatched clamp, and a chrome
// J-strip (yoke) coming out of the arm at y~97 and hooking right under the plate.
const CUSH = { x: 1455, y: 287, rx: 77, ry: 121, rot: 0.1 };
const SHELL = { x: 1488, y: 290, rx: 72, ry: 104, rot: 0.08 };
const PLATE = { x: 1514, y: 278, rx: 37, ry: 66, rot: 0.08 };
const ell = (e, k = 1, dx = 0, dy = 0) => (c) => c.ellipse(e.x + dx, e.y + dy, e.rx * k, e.ry * k, e.rot, 0, TAU);
const YOKE = [[1451, 97], [1455, 118], [1459, 140], [1463, 167], [1465, 196], [1461, 215], [1455, 235], [1451, 257], [1450, 280], [1452, 295], [1461, 304], [1480, 306]];
function paintCup3qMeasured(g) {
  // cushion: black leather, a grey lit face down its middle, the measured pale folds, stitch dots low
  const cu = ell(CUSH);
  g.fillStyle = gv(0.06); g.beginPath(); cu(g); g.fill();
  clipTo(g, cu, () => {
    g.filter = "blur(9px)"; g.fillStyle = gv(0.34, 0.6); g.beginPath(); g.ellipse(1398, 282, 13, 92, 0.05, 0, TAU); g.fill(); g.filter = "none";
    // pleats: pale wedges lying radially along the cushion's left side (tips out at the rim), dark creases between
    const rf = rng(353);
    for (let y = 184; y < 394; y += 5.5 + rf() * 5) {
      const t = (y - 287) / 121, xl = 1455 - 77 * Math.sqrt(Math.max(0, 1 - t * t)) + 3 + rf() * 3;
      if (Math.abs(t) > 0.62 && rf() < 0.5) continue;
      const L = (20 + rf() * 16) * (1 - 0.5 * Math.abs(t)), hw = 2.2 + rf() * 3.2, tip = [xl, y + t * 4], base = [xl + L, y - t * 6];
      const v = 0.4 + 0.38 * (1 - Math.abs(t)) * (0.4 + rf() * 0.6);
      g.filter = "blur(1.2px)"; g.fillStyle = gv(v, 0.85); g.beginPath(); g.moveTo(tip[0], tip[1]);
      g.quadraticCurveTo((tip[0] + base[0]) / 2, (tip[1] + base[1]) / 2 - hw * 1.3, base[0], base[1] - hw); g.lineTo(base[0], base[1] + hw);
      g.quadraticCurveTo((tip[0] + base[0]) / 2, (tip[1] + base[1]) / 2 + hw, tip[0], tip[1]); g.fill(); g.filter = "none";
    }
    const r = rng(352); g.fillStyle = gv(0.62, 0.9);
    for (let row = 0; row < 5; row++) for (let k = 0; k < 5; k++) { const x = 1402 + k * 8 + row * 5 + r() * 2, y = 340 + row * 8 + k * 1.2; if (r() < 0.2) continue; g.beginPath(); g.ellipse(x, y, 2.4, 1.3, 0.2, 0, TAU); g.fill(); }
  });
  // shell: dark chrome ring round the plate; bright on its left, dim along the bottom, black behind the plate
  const sh = ell(SHELL);
  g.fillStyle = gv(0.14); g.beginPath(); sh(g); g.fill();
  clipTo(g, sh, () => {
    // two concentric silver bands on the lit left and lower side (measured at 35.80: the outer band ~0.8, a dark
    // line, the inner band ~0.55), fading out behind the plate on the right
    const band = (k0, k1, a0, a1, v, al) => {
      g.beginPath();
      for (let j = 0; j <= 40; j++) { const a = a0 + ((a1 - a0) * j) / 40; const x = Math.cos(a) * 72 * k1, y = Math.sin(a) * 104 * k1; g.lineTo(1488 + x * Math.cos(0.08) - y * Math.sin(0.08), 290 + x * Math.sin(0.08) + y * Math.cos(0.08)); }
      for (let j = 40; j >= 0; j--) { const a = a0 + ((a1 - a0) * j) / 40; const x = Math.cos(a) * 72 * k0, y = Math.sin(a) * 104 * k0; g.lineTo(1488 + x * Math.cos(0.08) - y * Math.sin(0.08), 290 + x * Math.sin(0.08) + y * Math.cos(0.08)); }
      g.closePath(); g.fillStyle = gv(v, al); g.fill();
    };
    g.filter = "blur(3px)";
    band(0.83, 0.97, 1.3, 4.75, 0.72, 0.95);
    band(0.6, 0.79, 1.6, 4.6, 0.66, 0.9);
    band(0.6, 0.83, 0.7, 1.7, 0.36, 0.8);
    band(0.86, 0.99, -0.95, 0.95, 0.42, 0.9);
    g.filter = "blur(10px)";
    g.fillStyle = gv(0.95, 0.7); g.beginPath(); g.ellipse(1430, 292, 10, 80, 0.05, 0, TAU); g.fill();
    g.fillStyle = gv(0.05, 0.8); g.beginPath(); g.ellipse(1470, 200, 30, 20, 0.4, 0, TAU); g.fill();
    g.filter = "none";
    // concentric streaks round the plate on the lit left side (a few bright, a few dark)
    const rs = rng(356);
    for (let i = 0; i < 16; i++) {
      const k = 0.62 + rs() * 0.34, a0 = 1.5 + rs() * 0.6, a1 = 3.6 + rs() * 1.1, q = [];
      for (let j = 0; j <= 16; j++) { const a = a0 + ((a1 - a0) * j) / 16; q.push([1488 + Math.cos(a) * 72 * k, 290 + Math.sin(a) * 104 * k]); }
      taper(g, q, (u) => (0.8 + rs() * 0.2) * (i % 3 === 0 ? 1.2 : 1.8) * Math.pow(Math.sin(Math.PI * u), 0.6), i % 3 === 0 ? gv(0.2, 0.7) : gv(0.97, 0.55));
    }
    drawStrokes(g, CUP.shellD);
  });
  g.strokeStyle = LINE; g.lineWidth = 2.6; g.beginPath(); sh(g); g.stroke();
  // the mesh arm: from the clamp down, widening into the shell top, and down beside the plate to the hook
  const arm = [[1446, 95], [1488, 93], [1491, 122], [1503, 142], [1510, 180], [1519, 203], [1500, 210], [1486, 222], [1480, 250], [1480, 290], [1484, 306], [1462, 306], [1456, 285], [1457, 245], [1464, 210], [1467, 180], [1461, 140], [1452, 118]];
  const ap = (c) => smoothPath(c, arm, true, 0.2);
  g.fillStyle = meshPat(g, 0.86, 0.24); g.beginPath(); ap(g); g.fill();
  clipTo(g, ap, () => { g.filter = "blur(8px)"; g.fillStyle = gv(0.05, 0.4); g.beginPath(); g.ellipse(1500, 175, 14, 40, 0.3, 0, TAU); g.fill(); g.filter = "none"; ink(g, [[1449, 122], [1470, 121], [1492, 123]], 3, LINE, { end: 0.6 }); });
  swellStroke(g, [[1488, 93], [1491, 122], [1503, 142], [1510, 180], [1519, 204]], 3, LINE, { end: 0.5 });
  // plate: thick dark rim, mesh face, dots along the rim's right edge
  g.fillStyle = LINE; g.beginPath(); g.ellipse(1511, 271, 38, 71, 0.08, 0, TAU); g.fill();
  g.fillStyle = meshPat(g, 0.93, 0.3); g.beginPath(); g.ellipse(1512, 271, 32, 65, 0.08, 0, TAU); g.fill();
  g.fillStyle = gv(0.55, 0.9); for (let k = 0; k < 14; k++) { const a = -0.9 + k * 0.13; g.beginPath(); g.arc(1512 + Math.cos(a) * 36, 271 + Math.sin(a) * 69, 1.3, 0, TAU); g.fill(); }
  paintYokeClamp(g);
}
function paintYokeClamp(g) {
  const yq = sampleCurve(YOKE, 8);
  const yw = (u) => (u < 0.08 ? 7 + (u / 0.08) * 7 : u > 0.88 ? 14 - ((u - 0.88) / 0.12) * 6 : 14);
  taper(g, yq, (u) => yw(u) + 5, LINE);
  taper(g, yq, yw, gv(0.92));
  taper(g, yq.map(([x, y], i) => { const a = yq[Math.max(0, i - 1)], b = yq[Math.min(yq.length - 1, i + 1)], n = nrm(perp(sub(b, a))); return [x - n[0] * 3.5, y - n[1] * 3.5]; }), (u) => yw(u) * 0.35, gv(0.55, 0.9));
  const cl = [[1437, 66], [1454, 47], [1487, 87], [1470, 89], [1447, 84]];
  g.fillStyle = meshPat(g, 0.7, 0.15); g.beginPath(); smoothPath(g, cl, true, 0.1); g.fill();
  g.strokeStyle = LINE; g.lineWidth = 2.4; g.beginPath(); smoothPath(g, cl, true, 0.1); g.stroke();
  ink(g, [[1440, 90], [1465, 91], [1489, 92]], 6, LINE, { end: 0.7 });
  ink(g, [[1446, 90.5], [1468, 91], [1486, 91.5]], 1.6, gv(0.7, 0.8), { end: 0.4 });
}
function paintCup3q(g) {
  if (MEAS) return paintCup3qMeasured(g);
  // cushion: black leather; pale crumples stacked down its left side, crease wedges between them, stitch dashes low
  const cu = ell(CUSH);
  g.fillStyle = gv(0.1); g.beginPath(); cu(g); g.fill();
  clipTo(g, cu, () => {
    const r = rng(351);
    for (let i = 0; i < 12; i++) {
      const y = 196 + i * 12.5 + (r() - 0.5) * 6, x0 = 1383 + Math.pow(Math.abs(y - 290) / 120, 2) * 30 + r() * 4;
      const L = 14 + r() * 20, h = 5 + r() * 5;
      const blob = [[x0, y - h * 0.5], [x0 + L * 0.5, y - h * (0.6 + r() * 0.3)], [x0 + L, y - 1 + r() * 2], [x0 + L * 0.45, y + h * (0.5 + r() * 0.3)], [x0 - 2, y + h * 0.4]];
      g.fillStyle = gv(0.3 + r() * 0.25, 0.9); g.beginPath(); smoothPath(g, blob, true); g.fill();
      brush(g, [[x0 + L + 4, y + (r() - 0.5) * 3], [x0 + L * 0.5, y + (r() - 0.5) * 3], [x0 + 2, y + h * 0.3]], 2.4, gv(0.08, 0.9));
    }
    leather(g, cu, [1380, 190, 1418, 340], 10, Math.PI / 2 + 0.1, 352, { lo: 0.35, hi: 0.62, len: [15, 45], w: [1.6, 3.2] });
    g.fillStyle = gv(0.72, 0.9);
    for (let row = 0; row < 5; row++) for (let k = 0; k < 4; k++) { const x = 1400 + k * 9 + row * 5 + r() * 2, y = 338 + row * 8; if (r() < 0.2) continue; g.fillRect(x, y, 4 + r() * 2, 2); }
  });
  // shell: a chrome ring round the plate (left and bottom), fine concentric bright and dark streaks; the far side dark
  const sh = ell(SHELL);
  g.fillStyle = gv(0.4); g.beginPath(); sh(g); g.fill();
  clipTo(g, sh, () => {
    const bands = [[0.995, 0.1, 3.5], [0.965, 0.85, 3], [0.94, 0.28, 2.5], [0.915, 0.72, 4], [0.88, 0.24, 2], [0.85, 0.62, 3], [0.81, 0.92, 2.5], [0.77, 0.28, 2], [0.73, 0.82, 4], [0.69, 0.35, 2], [0.66, 0.72, 2.5]];
    for (const [k, v, w] of bands) {
      const f = (k - 0.6) / 0.4, cx = PLATE.x + (SHELL.x - PLATE.x) * f, cy = PLATE.y + (SHELL.y - PLATE.y) * f;
      const rx = PLATE.rx * 1.15 + (SHELL.rx - PLATE.rx * 1.15) * f, ry = PLATE.ry * 1.15 + (SHELL.ry - PLATE.ry * 1.15) * f;
      g.strokeStyle = gv(v, 0.9); g.lineWidth = w; g.beginPath(); g.ellipse(cx, cy, rx, ry, SHELL.rot, 0, TAU); g.stroke();
    }
    const r = rng(355);
    for (let i = 0; i < 30; i++) { const a = 1.3 + r() * 3.1, k = 0.7 + r() * 0.28; const pa = [SHELL.x + Math.cos(a) * SHELL.rx * k, SHELL.y + Math.sin(a) * SHELL.ry * k]; brush(g, [pa, add(pa, [Math.sin(a) * (10 + r() * 18), -Math.cos(a) * (10 + r() * 18)])], 1.2 + r() * 0.8, gv(r() < 0.5 ? 0.2 : 0.95, 0.6)); }
    g.filter = "blur(8px)";
    g.fillStyle = gv(0.05, 0.95); g.beginPath(); g.ellipse(1566, 290, 22, 115, 0.08, 0, TAU); g.fill();
    g.fillStyle = gv(0.12, 0.8); g.beginPath(); g.ellipse(1492, 384, 44, 9, 0.12, 0, TAU); g.fill();
    g.filter = "none";
  });
  // the mesh arm: from the clamp down, widening into the shell top, and down beside the plate to the hook
  const arm = [[1446, 95], [1488, 93], [1491, 122], [1503, 142], [1510, 180], [1519, 203], [1500, 210], [1486, 222], [1480, 250], [1480, 290], [1484, 306], [1462, 306], [1456, 285], [1457, 245], [1464, 210], [1467, 180], [1461, 140], [1452, 118]];
  g.fillStyle = halftonePat(g, 3, 0.12, 0.52); g.beginPath(); smoothPath(g, arm, true, 0.2); g.fill();
  clipTo(g, (c) => smoothPath(c, arm, true, 0.2), () => {
    g.filter = "blur(8px)"; g.fillStyle = gv(0.1, 0.35); g.beginPath(); g.ellipse(1500, 175, 14, 40, 0.3, 0, TAU); g.fill(); g.filter = "none";
    ink(g, [[1449, 122], [1470, 121], [1492, 123]], 3, LINE, { end: 0.6 });
  });
  swellStroke(g, [[1488, 93], [1491, 122], [1503, 142], [1510, 180], [1519, 204]], 3, LINE, { end: 0.5 });
  // plate: thick dark rim, light mesh face, a soft highlight top-left
  const pl = ell(PLATE);
  g.fillStyle = LINE; g.beginPath(); g.ellipse(PLATE.x - 2, PLATE.y, PLATE.rx + 5, PLATE.ry + 4, PLATE.rot, 0, TAU); g.fill();
  g.fillStyle = halftonePat(g, 3, 0.1, 0.58); g.beginPath(); pl(g); g.fill();
  clipTo(g, pl, () => { g.filter = "blur(8px)"; g.fillStyle = gv(0, 0.2); g.beginPath(); g.ellipse(1532, 318, 16, 30, 0.1, 0, TAU); g.fill(); g.filter = "none"; });
  // yoke: a chrome J-strip, dark edges both sides, a grey reflection down its right half
  const yq = sampleCurve(YOKE, 8);
  const yw = (u) => (u < 0.08 ? 7 + (u / 0.08) * 7 : u > 0.88 ? 14 - ((u - 0.88) / 0.12) * 6 : 14);
  taper(g, yq, (u) => yw(u) + 5, LINE);
  taper(g, yq, yw, gv(0.92));
  taper(g, yq.map(([x, y], i) => { const a = yq[Math.max(0, i - 1)], b = yq[Math.min(yq.length - 1, i + 1)], n = nrm(perp(sub(b, a))); return [x - n[0] * 3.5, y - n[1] * 3.5]; }), (u) => yw(u) * 0.35, gv(0.55, 0.9));
  // the clamp: a hatched block over a dark bar
  const cl = [[1437, 66], [1454, 47], [1487, 87], [1470, 89], [1447, 84]];
  g.fillStyle = gv(0.42); g.beginPath(); smoothPath(g, cl, true, 0.1); g.fill();
  clipTo(g, (c) => smoothPath(c, cl, true, 0.1), () => {
    g.strokeStyle = gv(0.75, 0.8); g.lineWidth = 1.1;
    for (let k = -8; k < 12; k++) { g.beginPath(); g.moveTo(1430 + k * 5, 40); g.lineTo(1470 + k * 5, 100); g.stroke(); g.beginPath(); g.moveTo(1430 + k * 5, 100); g.lineTo(1490 + k * 5, 30); g.stroke(); }
  });
  g.strokeStyle = LINE; g.lineWidth = 2.4; g.beginPath(); smoothPath(g, cl, true, 0.1); g.stroke();
  ink(g, [[1440, 90], [1465, 91], [1489, 92]], 6, LINE, { end: 0.7 });
  ink(g, [[1446, 90.5], [1468, 91], [1486, 91.5]], 1.6, gv(0.7, 0.8), { end: 0.4 });
}
// the cast shadow of the cup on the neck feathers: a crescent of dark strokes swept down-left under the cup
function paintCupShadow(g, hp) {
  // measured (35.80, 3x): a crescent of grey strokes swept from under the cup's right end (1515,395) down-left to
  // (1400,440), closed below by a long dark tapered wedge from (1522,398) to (1412,470)
  softShade(g, hp, (c) => c.ellipse(1488, 410, 78, 24, -0.18, 0, TAU), 0.3, 0.7, 14);
  const r = rng(333);
  clipTo(g, hp, () => {
    for (let i = 0; i < 24; i++) {
      const u = r(), p0 = [1518 - u * 40 + r() * 6, 392 + u * 14 + r() * 10];
      const a = 2.72 + (r() - 0.5) * 0.18, L = 45 + r() * 50;
      flick(g, p0, [Math.cos(a), Math.sin(a)], L, 2.4 + r() * 1.6, gv(0.22 + r() * 0.3, 0.9), (r() - 0.5) * 0.15);
    }
    brush(g, [[1530, 394], [1500, 410], [1466, 430], [1436, 450], [1414, 466]], 12, gv(0.06, 0.95), { head: 0.04, pow: 1.1 });
    brush(g, [[1470, 424], [1440, 446], [1415, 462]], 3, gv(0.2, 0.8));
  });
}

// ---- head, facing camera (pose D, measured at 36.20; the 36.48 in-between is the same drawing re-parameterised)
const HEADF = [
  [958, 440], [950, 380], [950, 320], [956, 262], [972, 210], [1000, 164], [1040, 126], [1100, 96], [1170, 82], [1240, 84], [1300, 96], [1322, 100],
  [1352, 78, 1], [1360, 104], [1420, 58, 1], [1418, 110], [1414, 150], [1432, 200], [1446, 260], [1458, 320], [1462, 370], [1440, 420], [1400, 450], [1360, 500], [1250, 548], [1120, 550], [1010, 510],
];
const FRONT_D = {
  hx: (x) => x, face: [0, 0], beak: [0, 0], band: [0, 0], bandage: [0, 0], tuft: [0, 0],
  eyes: [{ x: 1109, y: 342, rx: 65.5, ry: 68.5, rot: 0, px: 1138, py: 340, pr: 9, lash: [[1.8, 3.2, 6], [0.4, 1.4, 5]] }, { x: 1336, y: 319, rx: 56.5, ry: 64.5, rot: 0.05, px: 1348, py: 318, pr: 7, lash: [[1.6, 2.8, 6], [-0.8, 0.5, 5]] }],
  cupL: { x0: 900, x1: 960, y0: 226, y1: 466, out: 848, sy0: 176, sy1: 440 },
  cupR: { x0: 1450, x1: 1499, y0: 168, y1: 398, k: 0.2, out: 1546, sy0: 176, sy1: 368, shadow: [1492, 402] },
};
// 36.48: the face swings back toward the three-quarter view — features ~70 px left, the right eye opening up
const FRONT_E = {
  hx: (x) => 1424 + (x - 1424) * 1.105, face: [-70, 2], beak: [-72, 2], band: [-18, 6], bandage: [-46, -6], tuft: [-12, 0],
  eyes: [{ x: 1035, y: 343, rx: 63.5, ry: 69.5, rot: -0.19, px: 1044, py: 344, pr: 8, lash: [[1.8, 3.2, 6], [0.4, 1.4, 5]] }, { x: 1277, y: 325, rx: 66.5, ry: 71.5, rot: 0.4, px: 1270, py: 328, pr: 7.5, lash: [[1.6, 2.8, 6], [-0.8, 0.5, 5]] }],
  cupL: { x0: 872, x1: 918, y0: 236, y1: 440, out: 828, sy0: 200, sy1: 420 },
  cupR: { x0: 1417, x1: 1474, y0: 166, y1: 398, k: 0.12, out: 1531, sy0: 172, sy1: 380, shadow: [1470, 404] },
};
const off = (pts, [dx, dy]) => pts.map((p) => [p[0] + dx, p[1] + dy, p[2]]);
function paintHeadFront(g, F = FRONT_D) {
  // band arcs over the crown from cup to cup: black, a pale highlight along it, slider blocks near the ends
  if (!CEL) {
    const band = off([[902, 170], [926, 112], [990, 58], [1090, 18], [1180, 5], [1280, 12], [1368, 40], [1418, 70], [1462, 118], [1478, 150]], F.band);
    const bq = sampleCurve(band, 10);
    taper(g, bq, () => 24, LINE);
    taper(g, bq.map(([x, y]) => [x, y - 3]), () => 5, gv(0.78, 0.95));
    taper(g, bq.slice(0, 12).map(([x, y]) => [x + 3, y + 2]), () => 10, gv(0.6, 0.9));
    taper(g, bq.slice(bq.length - 12).map(([x, y]) => [x - 3, y + 2]), () => 10, gv(0.6, 0.9));
  }
  const H = HEADF.map((p) => [F.hx(p[0]), p[1], p[2]]);
  const isD = F === FRONT_D;
  // D: the silhouette measured on the source (./s13/silD.js); E (one in-between frame) keeps the fitted outline
  const rp = (R) => (c) => { for (const r of R) { c.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) c.lineTo(r[i], r[i + 1]); c.closePath(); } };
  // (fix pass 1) E: its own silhouette and strokes measured on frame 912 (./s13/headE.js)
  const hp = MEAS && isD ? rp(SILD.headF) : CEL ? rp(SILE) : shp(H);
  g.fillStyle = gv(0.975); g.beginPath(); hp(g); g.fill();
  clipTo(g, hp, () => {
    g.filter = "blur(24px)";
    g.fillStyle = gv(0.84, 0.5); g.beginPath(); g.ellipse(1190, 86, 260, 50, 0, 0, TAU); g.fill();
    g.fillStyle = gv(0.75, 0.5); g.beginPath(); g.ellipse(F.hx(962), 330, 26, 150, 0, 0, TAU); g.fill();
    g.fillStyle = gv(0.75, 0.5); g.beginPath(); g.ellipse(1422, 300, 26, 150, 0, 0, TAU); g.fill();
    g.filter = "none";
  });
  if (!PROC) {
    // measured strokes (E: carried along with the face)
    softShade(g, hp, (c) => c.ellipse(F.hx(975), 488, 60, 42, 0.6, 0, TAU), 0.55, 0.75, 18);
    const sd = isD ? SD : CEL ? SE : SD.map((st) => st.map((v, i) => (i % 4 === 0 ? v + F.face[0] : i % 4 === 1 ? v + F.face[1] : v)));
    applyTone(g, "headF", hp);
    clipTo(g, hp, () => drawStrokes(g, sd));
  } else {
  edgeFlicks(g, H, { step: 7, len: 22, w: 1.0, color: gv(0.38, 0.45), ang: 0.5, seed: 402 });
  // the lower-left of the face turns away into the cup's shadow: grey, with bold clumps sweeping down-right
  softShade(g, hp, (c) => c.ellipse(F.hx(975), 488, 60, 42, 0.6, 0, TAU), 0.55, 0.75, 18);
  clipTo(g, hp, () => {
    clumpRim(g, [[F.hx(958), 440], [F.hx(975), 480], [F.hx(1010), 510], [1060, 532]], { step: 20, inset: 8, seed: 405, flow: () => 0.7, n: [3, 5], len: [24, 40], w: [2.2, 3.4], color: gv(0.22, 0.85), spread: 9 });
    clumpRim(g, [[F.hx(952), 300], [F.hx(950), 360], [F.hx(958), 430]], { step: 26, inset: 10, seed: 406, flow: () => 1.7, n: [2, 4], len: [22, 36], w: [2, 3], color: gv(0.35, 0.7), spread: 9 });
  });
  clumpField(g, hp, [990, 100, 1400, 230], 14, (x) => (x < 1200 ? -1.1 : -2.0), 403, { n: [2, 4], len: [26, 44], w: [1.6, 2.6], color: gv(0.45, 0.6), spread: 9 });
  // tuft
  const tf = off([[1320, 104], [1352, 78, 1], [1360, 104], [1420, 58, 1], [1414, 120]], F.tuft);
  for (let k = 0; k < 6; k++) { const b = add([1330 + k * 12, 140 - k * 3], F.tuft); flick(g, b, nrm(sub(k < 3 ? tf[1] : tf[3], b)), 55 + k * 4, 1.3, gv(0.35, 0.55), 0.04); }
  // facial disc: brows meeting in a V over the beak, cheek rims
  const fo = (pts) => off(pts, F.face);
  featherRow(g, fo([[990, 246], [1060, 208], [1140, 200], [1215, 222]]), { step: 3.2, len: 32, w: 1.7, color: gv(0.32, 0.75), ang: 0.5, seed: 411, gap: 0.1 });
  featherRow(g, fo([[1215, 222], [1280, 200], [1360, 204], [1420, 236]]), { step: 3.2, len: 32, w: 1.7, color: gv(0.32, 0.75), ang: -0.5 + Math.PI, seed: 412, gap: 0.1 });
  ink(g, fo([[985, 250], [1040, 214], [1120, 200], [1180, 206], [1215, 224], [1250, 206], [1320, 198], [1390, 212], [1425, 240]]), 1.6, gv(0.45, 0.6), { end: 0.1 });
  featherRow(g, fo([[985, 262], [966, 330], [980, 410], [1030, 470]]), { step: 4, len: 26, w: 1.3, color: gv(0.4, 0.6), ang: -0.5, seed: 416, gap: 0.2 });
  featherRow(g, fo([[1418, 250], [1426, 320], [1410, 400], [1370, 460]]), { step: 4, len: 26, w: 1.3, color: gv(0.4, 0.6), ang: 0.5 + Math.PI, seed: 417, gap: 0.2 });
  featherRow(g, fo([[1212, 236], [1218, 300], [1226, 370]]), { step: 3.5, len: 20, w: 1.0, color: gv(0.45, 0.45), ang: 2.7, seed: 413, gap: 0.25 });
  featherRow(g, fo([[1010, 420], [1080, 450], [1170, 448]]), { step: 4, len: 22, w: 1.1, color: gv(0.45, 0.45), ang: -2.5, seed: 414, gap: 0.25 });
  featherRow(g, fo([[1290, 420], [1350, 432], [1410, 410]]), { step: 4, len: 22, w: 1.1, color: gv(0.45, 0.45), ang: -2.5, seed: 415, gap: 0.25 });
  }
  if (CEL) { const e = isD ? ["eyeD0", "eyeD1"] : ["eyeE0", "eyeE1"]; for (const k of e) drawCel(g, CELHP[k], { feather: 1.5 }); }
  else { eye(g, F.eyes[0], 421); eye(g, F.eyes[1], 422); }
  // beak (measured at 36.20, 4x): a pale hooked mandible with a heavy outer edge, the nostril, and the mouth open on
  // its left: a pale grey interior under a heavy upper lip, the inner lip line, and the pale lower jaw
  const bo = (pts) => off(pts, F.beak);
  if (CEL) drawCel(g, isD ? CELHP.beakD : CELHP.beakE, { feather: 1.5 });
  else {
  const up = bo([[1228, 396], [1250, 394], [1264, 408], [1272, 432], [1271, 462], [1264, 482], [1256, 492, 1], [1246, 474], [1236, 458], [1222, 452], [1206, 456], [1212, 432], [1218, 410]]);
  g.fillStyle = gv(0.93); g.beginPath(); mixPath(g, up, true); g.fill();
  clipTo(g, (c) => mixPath(c, up, true), () => {
    g.filter = "blur(6px)";
    g.fillStyle = gv(0.66, 0.75); let q = bo([[1230, 452]])[0]; g.beginPath(); g.ellipse(q[0], q[1], 18, 10, -0.3, 0, TAU); g.fill();
    g.fillStyle = gv(0.8, 0.6); q = bo([[1262, 468]])[0]; g.beginPath(); g.ellipse(q[0], q[1], 7, 18, 0, 0, TAU); g.fill();
    g.filter = "none";
  });
  // mouth interior (grey, darker at the back under the lip) and the lower jaw below it
  const mouth = bo([[1195, 467], [1210, 459], [1226, 456], [1240, 461], [1250, 474], [1256, 489], [1245, 481], [1228, 473], [1210, 470]]);
  g.fillStyle = gv(MEAS ? 0.34 : 0.76); g.beginPath(); smoothPath(g, mouth, true); g.fill();
  clipTo(g, (c) => smoothPath(c, mouth, true), () => { g.filter = "blur(3px)"; const q = bo([[1226, 462]])[0]; g.fillStyle = gv(0.42, 0.8); g.beginPath(); g.ellipse(q[0], q[1], 18, 5, 0.15, 0, TAU); g.fill(); g.filter = "none"; });
  const jaw = bo([[1197, 470], [1212, 474], [1230, 477], [1246, 484], [1257, 492], [1236, 494], [1218, 492], [1207, 484]]);
  g.fillStyle = gv(MEAS ? 0.74 : 0.9); g.beginPath(); smoothPath(g, jaw, true); g.fill();
  // (measured at 36.08) the mandible's near edge runs down the beak's left side to the mouth corner
  if (MEAS) swellStroke(g, bo([[1222, 398], [1212, 420], [1204, 444], [1197, 462]]), 2.0, gv(0.2, 0.9), { end: 0.2 });
  swellStroke(g, bo([[1250, 394], [1264, 408], [1272, 432], [1271, 462], [1264, 482], [1256, 493]]), 3.4, LINE, { end: 0.3 });
  swellStroke(g, bo([[1192, 467], [1205, 458], [1222, 452.5], [1238, 456], [1250, 470], [1257, 489]]), 3.6, LINE, { end: 0.3, pow: 0.4 });
  swellStroke(g, bo([[1197, 469], [1215, 471], [1233, 476], [1247, 484], [1256, 491]]), 1.8, gv(0.12), { end: 0.3 });
  swellStroke(g, bo([[1196, 470], [1206, 482], [1218, 491], [1238, 494], [1262, 495]]), 2.8, LINE, { end: 0.3 });
  { const r = rng(418); for (let i = 0; i < 7; i++) { const q = bo([[1208 + i * 4 + r() * 3, 402 + i * 6]])[0]; brush(g, [q, add(q, [-6 - r() * 6, 18 + r() * 14])], 1.8, gv(0.35, 0.7)); } }
  { const q = bo([[1236, 418]])[0]; g.fillStyle = LINE; g.beginPath(); g.ellipse(q[0], q[1], 3.4, 3, 0.3, 0, TAU); g.fill(); }
  }
  if (CEL) drawCel(g, isD ? CELHP.bgD : CELHP.bgE, { feather: 1.5 });
  else { const q = add([1094, 134], F.bandage); drawBandage(g, { x: q[0], y: q[1], size: 150, rot: -0.47, cross: 0.95 }); }
  if (CEL) { drawCel(g, isD ? CELHP.hpD : CELHP.hpE); return; }
  paintCupF(g, F.cupL, -1, 461);
  paintCupF(g, F.cupR, 1, 462);
}
// the cast shadow of the cup on the neck/shoulder below it (measured dark 90-190 under the right cup in D)
function cupShadowF(g, c, r) {
  if (!c.shadow) return;
  g.save(); g.filter = "blur(9px)"; g.fillStyle = gv(0.08, 0.7); g.beginPath(); g.ellipse(c.shadow[0], c.shadow[1], 46, 16, 0.25, 0, TAU); g.fill(); g.filter = "none"; g.restore();
  for (let i = 0; i < 12; i++) { const x = c.shadow[0] - 40 + r() * 80, y = c.shadow[1] - 8 + r() * 10; brush(g, [[x, y], [x - 8 - r() * 10, y + 16 + r() * 18]], 2.4, gv(0.1, 0.8)); }
}
// a cup seen from the front: the black leather cushion against the head (grey rib highlights) and the metal
// shell beyond it, a crescent with bright rim streaks
// D cups, measured at 36.04-36.08 (2.5x grid): a black leather cushion against the head with thin pale ribs across it
// and a soft grey lit patch in its middle, and beyond it the shell seen edge-on as three stacked chrome bands, each
// shorter than the one inside it. Frame px, no shear (the right cup's lean is in the coordinates).
const CUPS_D = [
  { side: -1, cush: [[903, 246], [909, 232], [922, 224], [950, 224], [958, 234], [960, 350], [958, 452], [950, 462], [913, 462], [905, 452], [903, 350]],
    patch: [913, 292, 940, 372], bands: [[888, 904, 228, 452], [870, 888, 250, 440], [848, 870, 282, 416]], seed: 471 },
  { side: 1, cush: [[1432, 194], [1440, 182], [1478, 180], [1488, 190], [1498, 290], [1504, 382], [1496, 394], [1464, 396], [1454, 386], [1442, 292]],
    patch: [1440, 196, 1466, 300], bands: [[1490, 1507, 196, 388], [1507, 1525, 212, 372], [1525, 1546, 232, 352]], lean: 0.06, seed: 472 },
];
function paintCupD(g, C) {
  const r = rng(C.seed), s = C.side;
  // shell bands, outermost first: dark chrome with a bright stripe and a grey one, heavy outline, convex outer edge
  for (let i = C.bands.length - 1; i >= 0; i--) {
    const [a, b, y0, y1] = C.bands[i], ym = (y0 + y1) / 2, xo = s < 0 ? a : b, xi = s < 0 ? b : a, lean = C.lean || 0;
    const L = (y) => (y - ym) * lean;
    // the band's inner edge runs straight down under the next band in (drawn later, so no gap shows); its outer
    // edge bows out, with rounded ends
    const ow = [[xi + s * 3 + L(y0 - 2), y0], [xo - s * 3 + L(y0 + 12), y0 + 10], [xo + L(ym), ym], [xo - s * 3 + L(y1 - 12), y1 - 10], [xi + s * 3 + L(y1 + 2), y1]];
    const path = (c) => { smoothPath(c, ow, false, 0.5); c.lineTo(xi - s * 6 + L(y1), y1); c.lineTo(xi - s * 6 + L(y0), y0); c.closePath(); };
    g.fillStyle = gv(0.56); g.beginPath(); path(g); g.fill();
    clipTo(g, path, () => {
      const w = Math.abs(b - a);
      for (const [f, v, ww] of [[0.3, 0.94, 0.36], [0.64, 0.7, 0.22], [0.95, 0.15, 0.08]]) {
        const x = xi + (xo - xi) * f;
        taper(g, sampleCurve([[x + L(y0), y0 + 6], [x + L(ym) - s * 1.5, ym], [x + L(y1), y1 - 6]], 10), (u) => w * ww * (0.4 + 0.6 * Math.pow(Math.sin(Math.PI * u), 0.4)), gv(v, 0.9));
      }
      for (let k = 0; k < 3; k++) { const x = xi + (xo - xi) * (0.2 + r() * 0.6), yy = y0 + 20 + r() * (y1 - y0 - 40); brush(g, [[x + L(yy), yy], [x + L(yy + 30), yy + 24 + r() * 20]], 1.2, gv(r() < 0.5 ? 0.97 : 0.1, 0.7)); }
      // (measured) the chrome dims toward the bottom of each band
      g.filter = "blur(12px)"; g.fillStyle = gv(0.12, 0.6); g.beginPath(); g.ellipse((a + b) / 2 + L(y1), y1 - (y1 - y0) * 0.12, Math.abs(b - a), (y1 - y0) * 0.32, 0, 0, TAU); g.fill(); g.filter = "none";
    });
    g.strokeStyle = LINE; g.lineWidth = 1.8; g.beginPath(); smoothPath(g, ow, false, 0.5); g.stroke();
  }
  // cushion: black; ribs = thin pale arcs across it, bowing up in the top half and down in the bottom half
  const cp = (c) => smoothPath(c, C.cush, true, 0.3);
  g.fillStyle = gv(0.05); g.beginPath(); cp(g); g.fill();
  clipTo(g, cp, () => {
    let ys = 1e9, ye = -1e9, xs = 1e9, xe = -1e9; for (const [x, y] of C.cush) { ys = Math.min(ys, y); ye = Math.max(ye, y); xs = Math.min(xs, x); xe = Math.max(xe, x); }
    const [px0, py0, px1, py1] = C.patch;
    g.filter = "blur(5px)"; g.fillStyle = gv(0.52, 0.9); g.beginPath(); g.ellipse((px0 + px1) / 2, (py0 + py1) / 2, (px1 - px0) * 0.62, (py1 - py0) * 0.56, (C.lean || 0) * -1, 0, TAU); g.fill(); g.filter = "none";
    for (let y = ys + 10; y < ye - 6; y += 9 + r() * 6) {
      const u = (y - ys) / (ye - ys), bow = (u < 0.5 ? -1 : 1) * (2 + r() * 3), L0 = (C.lean || 0) * (y - (ys + ye) / 2);
      const wc = xe - xs, fr = 0.35 + r() * 0.4, x0 = (s < 0 ? xs + 4 : xe - 4 - wc * fr) + r() * 4 + L0, x1 = x0 + wc * fr;
      if (y > py0 && y < py1 && r() < 0.5) continue;
      swellStroke(g, [[x0, y + bow], [(x0 + x1) / 2, y], [x1, y + bow]], 1.4 + r() * 1.6, gv(0.45 + 0.3 * r(), 0.85));
    }
    for (let y = py0 + 4; y < py1 - 4; y += 7 + r() * 6) { const x = px0 + r() * 6; brush(g, [[x + (px1 - px0) * 0.9, y + 2], [x + (px1 - px0) * 0.4, y + (r() - 0.5) * 3], [x, y + 3]], 2, gv(0.08, 0.8)); }
  });
  g.strokeStyle = LINE; g.lineWidth = 3; g.beginPath(); cp(g); g.stroke();
}
function paintCupF(g, c, side, seed) {
  if (MEAS && c === FRONT_D.cupL) { if (c.shadow) cupShadowF(g, c, rng(seed)); return paintCupD(g, CUPS_D[0]); }
  if (MEAS && c === FRONT_D.cupR) { cupShadowF(g, c, rng(seed)); return paintCupD(g, CUPS_D[1]); }
  const r = rng(seed);
  if (c.shadow) cupShadowF(g, c, r);
  // the right cup leans (its pad slants ~0.2 px/px): shear about the pad's middle
  const pym = (c.y0 + c.y1) / 2;
  g.save(); if (c.k) g.transform(1, 0, c.k, 1, -c.k * pym, 0);
  const xIn = side < 0 ? c.x0 : c.x1, xMid = side < 0 ? c.x0 + 6 : c.x1 - 6, ym = (c.sy0 + c.sy1) / 2;
  // shell beyond the cushion: bold chrome — a dark base, one bright band and one dark band inside a heavy rim
  const shell = [[xMid, c.sy0], [(xMid + c.out) / 2, c.sy0 + 18], [c.out, ym - 30], [c.out, ym + 30], [(xMid + c.out) / 2, c.sy1 - 14], [xMid, c.sy1]];
  g.fillStyle = gv(0.3); g.beginPath(); smoothPath(g, shell, true); g.fill();
  clipTo(g, (q) => smoothPath(q, shell, true), () => {
    const band = (f, k, w, v) => ink(g, shell.map(([x, y]) => [xMid + (x - xMid) * f, ym + (y - ym) * k]), w, gv(v, 0.95), { end: 0.25 });
    band(0.82, 0.94, 6, 0.9);
    band(0.64, 0.95, 5, 0.1);
    band(0.46, 0.96, 7, 0.82);
    band(0.3, 0.97, 4, 0.15);
    for (let i = 0; i < 8; i++) { const f = 0.35 + r() * 0.55, y0 = c.sy0 + 30 + r() * (c.sy1 - c.sy0 - 90); const x = xMid + (c.out - xMid) * f; brush(g, [[x, y0], [x + side * 2, y0 + 20 + r() * 40]], 1.4, gv(r() < 0.5 ? 0.98 : 0.2, 0.7)); }
  });
  g.strokeStyle = LINE; g.lineWidth = 3; g.beginPath(); smoothPath(g, shell, true); g.stroke();
  // cushion: black leather, crescent ribs near its top and bottom (jittered), crumpled pale streaks in the middle
  const cw = c.x1 - c.x0, rr = Math.min(26, cw * 0.45);
  const pad = (q) => q.roundRect(c.x0, c.y0, cw, c.y1 - c.y0, rr);
  g.fillStyle = gv(0.07); g.beginPath(); pad(g); g.fill();
  clipTo(g, pad, () => {
    const H = c.y1 - c.y0;
    let y = c.y0 + 10;
    while (y < c.y1 - 8) {
      const u = (y - c.y0) / H, mid = u > 0.3 && u < 0.72;
      if (!mid) {
        const L = cw * (0.3 + 0.6 * r()), x = c.x0 + cw * 0.08 + r() * (cw - L) * 0.8, bow = (u < 0.5 ? -1 : 1) * (3 + r() * 3);
        swellStroke(g, [[x, y + bow], [x + L / 2, y], [x + L, y + bow]], 2.4 + r() * 2.4, gv(0.5 + 0.35 * r(), 0.9));
      }
      y += 10 + r() * 16;
    }
    // the crumpled middle: soft grey folds stacked down the pad, dark creases between them
    for (let yy = c.y0 + H * 0.28; yy < c.y0 + H * 0.74; yy += 9 + r() * 9) {
      const x0 = c.x0 + cw * (0.1 + r() * 0.12), L = cw * (0.45 + r() * 0.4), h = 7 + r() * 8;
      const blob = [[x0, yy], [x0 + L * 0.4, yy - h * (0.5 + r() * 0.5)], [x0 + L, yy - h * 0.2 + (r() - 0.5) * 4], [x0 + L * 0.6, yy + h * (0.4 + r() * 0.4)], [x0 + L * 0.1, yy + h * 0.5]];
      g.fillStyle = gv(0.45 + r() * 0.38, 0.9); g.beginPath(); smoothPath(g, blob, true); g.fill();
      brush(g, [[x0 + L, yy + h * 0.55], [x0 + L * 0.5, yy + h * 0.6 + (r() - 0.5) * 3], [x0, yy + h * 0.4]], 2.2, gv(0.06, 0.85));
    }
    leather(g, pad, [c.x0 + cw * 0.12, c.y0 + H * 0.3, c.x1 - cw * 0.35, c.y0 + H * 0.66], 5, Math.PI / 2 + (r() - 0.5) * 0.4, seed + 7, { lo: 0.6, hi: 0.9, len: [18, 40], w: [2, 4], curve: 0.5 });
  });
  g.strokeStyle = LINE; g.lineWidth = 3; g.beginPath(); pad(g); g.stroke();
  ink(g, [[xIn - side * 3, c.y0 + 20], [xIn - side * 5, (c.y0 + c.y1) / 2], [xIn - side * 3, c.y1 - 20]], 2.5, gv(0.45, 0.7), { end: 0.2 });
  g.restore();
}

// ---------------------------------------------------------------- layers + transforms
const LAYERS = {
  nub: [800, 270, 925, 470, paintNub],
  nubB: [770, 190, 970, 430, paintNubB],
  raised: [750, 240, 1090, 650, paintRaised],
  tail: [1540, 580, 1840, 946, paintTail],
  body: [880, 350, 1700, 946, paintBody],
  wing: [1500, 225, 2110, 740, paintWing],
  feet: [1140, 800, 1620, 990, paintFeet],
  head: [860, -60, 1600, 560, paintHead3q],
  headF: [800, -20, 1600, 560, (g) => paintHeadFront(g, FRONT_D)],
  headE: [780, -20, 1600, 560, (g) => paintHeadFront(g, FRONT_E)],
  // (fix pass 1) D / E: the fur the front head uncovers under the cups (the lower-left cheek and the shoulder under the
  // right cup), measured cel traces; placed with the head
  sideD: [840, 370, 1540, 680, (g) => { drawCel(g, CELHP.lfD); drawCel(g, CELHP.shD); }],
  sideE: [800, 370, 1520, 680, (g) => { drawCel(g, CELHP.lfE); drawCel(g, CELHP.shE); }],
  // (fix pass 1) poses A (884-885) and B (886-887): where the source redraws rather than moves the C drawing — A's raised
  // far wing and its seam with the head, A's spread primaries, the cup's underside, the toes lifted clear of the frame
  // edge; B's far-wing leaf, toes and wing tip — measured cel traces of those frames, drawn over the moved layers
  ovA: [760, 190, 2120, 946, (g) => { for (const k of ["ovA1", "ovA2", "ovA3", "ovA4"]) drawCel(g, CELHP[k]); }],
  ovB: [800, 210, 2120, 946, (g) => { for (const k of ["ovB1", "ovB2", "ovB3"]) drawCel(g, CELHP[k]); }],
};
let cache = null;
function layer(k) {
  if (!cache) cache = {};
  if (!cache[k]) {
    const [x0, y0, x1, y1, paint] = LAYERS[k];
    const c = document.createElement("canvas"); c.width = x1 - x0; c.height = y1 - y0;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.translate(-x0, -y0); setPPU(1); g.lineCap = "round"; g.lineJoin = "round";
    paint(g);
    g.setTransform(1, 0, 0, 1, 0, 0);
    // the source's ink is soft-edged (a slightly soft print): bake a fine blur into every layer
    const soft = document.createElement("canvas"); soft.width = c.width; soft.height = c.height;
    const sg = soft.getContext("2d"); sg.filter = "blur(0.4px)"; sg.drawImage(c, 0, 0); sg.filter = "none";
    // the front heads end on the chest in a soft fade, not a cut (the body layer carries on underneath)
    if (MEAS && (k === "headF" || k === "headE")) {
      const m = document.createElement("canvas"); m.width = c.width; m.height = c.height;
      const mg = m.getContext("2d"); mg.fillStyle = "#fff"; mg.fillRect(0, 0, m.width, m.height);
      mg.translate(-x0, -y0); mg.globalCompositeOperation = "destination-out"; mg.filter = "blur(10px)"; mg.fillStyle = "#000";
      const dx = k === "headE" ? -40 : 0;
      mg.beginPath(); smoothPath(mg, [[1000 + dx, 520], [1120 + dx, 560], [1250, 558], [1362, 510], [1404, 462], [1436, 432], [1460, 600], [990 + dx, 600]], true, 0.3); mg.fill();
      sg.globalCompositeOperation = "destination-in"; sg.drawImage(m, 0, 0); sg.globalCompositeOperation = "source-over";
    }
    cache[k] = { canvas: soft, x: x0, y: y0 };
  }
  return cache[k];
}
// transform of a layer: move the region centre (cx, cy) by (dx, dy), rotate by r degrees and scale by s about it
const CEN = { sideD: [1190, 270], sideE: [1190, 270], nubB: [905, 455], tail: [1715, 783], head: [1190, 270], headF: [1190, 270], headE: [1190, 270], wing: [1860, 485], body: [1250, 650], feet: [1400, 883], nub: [905, 455], raised: [905, 455] };
const T0 = { dx: 0, dy: 0, r: 0, s: 1 };
// every pose is measured directly against C (ORB similarity per region, 35.80 -> t): dx, dy of the region centre,
// rotation in degrees, scale
const A = { tail: { dx: -2.1, dy: -9.5, r: 1.26, s: 1.002 }, head: { dx: -1.0, dy: -32.8, r: 0.33, s: 1 }, wing: { dx: 0.6, dy: 26.9, r: 10.5, s: 1.0 }, body: { dx: 4.7, dy: -26.4, r: 0.83, s: 1.036 }, feet: { dx: -2.3, dy: -15.1, r: 0.66, s: 0.993 } };
const B = { tail: { dx: -2.3, dy: 1.0, r: 3.38, s: 0.984 }, head: { dx: 1.5, dy: -29.8, r: 0.49, s: 1 }, wing: { dx: -4.0, dy: -32, r: -2.0, s: 1.01 }, body: { dx: 5.7, dy: -22.1, r: 1.26, s: 1.037 }, feet: { dx: -2.4, dy: -10.3, r: 0.7, s: 0.994 }, nub: { dx: 49, dy: -52, r: -10.6, s: 1.06 } };
const SETTLE = {
  888: { tail: { dx: -1.4, dy: -0.9, r: 1.81, s: 0.999 }, head: { dx: 0.8, dy: -21.7, r: 0.33, s: 1 }, wing: { dx: -2.5, dy: -28, r: -1.53, s: 1.014 }, body: { dx: 4, dy: -15.3, r: 1.27, s: 1.027 }, feet: { dx: -1.5, dy: -7.1, r: 0.47, s: 0.995 }, nub: { dx: 35.8, dy: -38, r: -7.7, s: 1.044 } },
  889: { tail: { dx: -0.1, dy: -1.8, r: 0.68, s: 1.014 }, head: { dx: 0.3, dy: -12.5, r: 0.16, s: 1 }, wing: { dx: -1.5, dy: -11, r: -0.73, s: 1.009 }, body: { dx: 2, dy: -9.4, r: 0.47, s: 1.013 }, feet: { dx: -0.9, dy: -3.7, r: 0.32, s: 0.996 }, nub: { dx: 5, dy: -6, r: -1.2, s: 1.01 } },
};
// head drift inside each pose (measured, px / degrees)
const DRIFT_D = { 901: 0, 902: 0, 903: 1.3, 904: 1.5, 905: 0.6, 906: -0.1, 907: -2.4, 908: -2.4, 909: -10.0, 910: -10.1, 911: -3.8 };
// ECC against the source (review pass): the head also drops and tips at 907-910, the tail tip drifts up-left
const DRIFT_DY = { 907: [1.4, -0.29], 908: [1.4, -0.29], 909: [2.8, -0.58], 910: [2.8, -0.58] };
const TAIL_D = { 907: { dx: -0.4, dy: -2, r: -0.33, s: 1 }, 908: { dx: -0.4, dy: -2, r: -0.33, s: 1 }, 909: { dx: -1.4, dy: -5, r: -0.95, s: 1 }, 910: { dx: -1.4, dy: -5, r: -0.95, s: 1 } };
const WING_D = { 901: [0.5, 3.8, 0.52], 902: [0.5, 3.8, 0.52], 903: [1.9, 6.9, 0.93], 904: [1.8, 7.1, 0.92], 905: [1.6, 7.3, 0.86], 906: [1.1, 5.6, 0.81], 907: [0.1, 3.1, 0.47], 908: [0.6, 3.5, 0.58], 909: [-3, -3.6, -0.27], 910: [-3.5, -3.6, -0.37], 911: [-1.8, -2.3, -0.23], 912: [-1.5, -1.9, -0.21] };
const END_HEAD = { 913: [4.8, 1.3], 914: [4.7, 2.0], 915: [3.8, 1.7], 916: [2.1, 1.4], 917: [2.0, 1.3], 918: [0.9, 0.9], 919: [0.4, 0.7], 920: [0.5, 0.6], 921: [0.6, 0.8], 922: [0.3, 0.4] };
const END_WING = { 913: [2.5, 3.8, 0.35], 914: [2.4, 3.9, 0.35], 915: [2.3, 3.9, 0.34], 916: [1.2, 2.4, 0.14], 917: [1.4, 2.4, 0.23], 918: [0.6, 0.9, 0.08], 919: [0.1, 0.2, -0.07], 920: [0.1, 0.3, 0.02], 921: [0.2, 0.3, 0.05], 922: [0.4, 0.5, 0.05] };

function state(fi) {
  const st = { head: "head", far: "nub", T: { tail: T0, head: T0, wing: T0, body: T0, feet: T0, nub: T0, raised: T0 } };
  if (fi <= 885) { st.far = "raised"; st.T = { ...st.T, ...A }; }
  else if (fi <= 887) { st.far = "nubB"; st.T = { ...st.T, ...B, nub: T0 }; }
  else if (fi <= 889) st.T = { ...st.T, ...SETTLE[fi] };
  else if (fi <= 898) { /* C */ }
  else if (fi <= 900) st.T = { ...st.T, head: { dx: -10.1, dy: 2.6, r: -1.13, s: 1 }, wing: { dx: -4.1, dy: -6.0, r: -0.74, s: 1.001 }, body: { dx: -3, dy: 0.9, r: -0.81, s: 0.998 }, tail: { dx: -0.5, dy: -2.6, r: -0.54, s: 1.003 } };
  else if (fi <= 912) {
    st.head = "headF";
    const w = WING_D[fi] || [0, 0, 0];
    const hy = DRIFT_DY[fi] || [0, 0];
    st.T = { ...st.T, head: { dx: DRIFT_D[fi] ?? 0, dy: hy[0], r: hy[1], s: 1 }, wing: { dx: w[0], dy: w[1], r: w[2], s: 1 }, tail: TAIL_D[fi] || T0 };
    if (fi === 912) { st.head = "headE"; st.T.head = T0; }
  } else {
    const h = END_HEAD[fi] || [0, 0], w = END_WING[fi] || [0, 0, 0];
    st.T = { ...st.T, head: { dx: h[0], dy: h[1], r: 0, s: 1 }, wing: { dx: w[0], dy: w[1], r: w[2], s: 1 } };
  }
  // MEAS: the per-frame affine placements measured by ECC on the source (./s13/placeC.js) replace the rig's numbers
  // wherever the fit is good; the held frames 891-898 stay exactly on the reference drawing
  const P = MEAS && !(fi >= 891 && fi <= 898) ? PLACE[fi] : null;
  if (P) {
    for (const k of ["wing", "body", "tail", "feet", "nub"]) if (P[k] && !(k === "nub" && st.far !== "nub")) st.T[k] = { m: P[k] };
    const hk = st.head === "headF" ? "headF" : st.head === "head" ? "head" : null;
    if (hk && P[hk]) st.T.head = { m: P[hk] };
  }
  // (fix pass 1) frames whose nub ECC fit failed (< 0.9) but the nub still moves: its shift measured by template search
  // against the C reference (899-900 with the turning head, 913-915 on the way back)
  if (st.far === "nub" && !(P && P.nub) && NUB_SHIFT[fi]) st.T.nub = { dx: NUB_SHIFT[fi][0], dy: NUB_SHIFT[fi][1], r: 0, s: 1 };
  return st;
}
// (w3) sub-pixel registration, measured: the traced layers (cel traces, strokes) land about half a pixel right of and
// below the source (best sigma-1.5 match per region, poses A-E: head / cups / crown / bandage / talons / nub all
// at (-0.3 .. -0.6, -0.45 .. -0.6)); the wing and chest sit on it already
const SUBPX = { head: [-0.45, -0.5], headF: [-0.45, -0.5], headE: [-0.45, -0.5], sideD: [-0.45, -0.5], sideE: [-0.45, -0.5], feet: [-0.5, -0.5], nub: [-0.5, -0.55], ovA: [-0.5, -0.5], ovB: [-0.5, -0.5] };
// (w3) per-frame residual placement, measured on the render after the SUBPX pass (best sigma-1.5 match of each
// layer's region, 0.25 px steps; the body as a similarity fit of four regions: dx, dy, degrees about (1250, 650)).
// The hold 891-898 gets one constant correction (its mean) so the held drawing does not creep.
const FIX = {
  884: {wing: [0.0, -0.25], tail: [-0.5, -0.5], feet: [0.0, -0.25], body: [0.12, -0.3, -0.006]},
  885: {tail: [-0.5, -0.5], body: [0.13, -0.39, 0.007]},
  886: {wing: [0.5, 0.75], tail: [-0.25, 0.25], body: [0.37, -0.51, 0.166]},
  887: {wing: [0.25, 0.5], tail: [-0.25, 0.25], body: [0.37, -0.51, 0.166]},
  888: {wing: [-0.25, 0.5], tail: [0.0, 0.5], body: [0.36, -0.37, 0.152]},
  889: {wing: [-0.25, 0.25], tail: [0.0, 0.5], feet: [0.0, -0.25], body: [0.29, -0.47, 0.14]},
  890: {wing: [-0.5, -0.5], tail: [-0.5, -0.5], feet: [-0.25, 0.0], body: [0.06, -0.57, 0.084]},
  891: {wing: [-0.344, -0.344], tail: [-0.25, -0.281], body: [0.22, -0.189, 0.056]},
  892: {wing: [-0.344, -0.344], tail: [-0.25, -0.281], body: [0.22, -0.189, 0.056]},
  893: {wing: [-0.344, -0.344], tail: [-0.25, -0.281], body: [0.22, -0.189, 0.056]},
  894: {wing: [-0.344, -0.344], tail: [-0.25, -0.281], body: [0.22, -0.189, 0.056]},
  895: {wing: [-0.344, -0.344], tail: [-0.25, -0.281], body: [0.22, -0.189, 0.056]},
  896: {wing: [-0.344, -0.344], tail: [-0.25, -0.281], body: [0.22, -0.189, 0.056]},
  897: {wing: [-0.344, -0.344], tail: [-0.25, -0.281], body: [0.22, -0.189, 0.056]},
  898: {wing: [-0.344, -0.344], tail: [-0.25, -0.281], body: [0.22, -0.189, 0.056]},
  899: {wing: [-0.5, -0.5], tail: [-0.5, -0.25], feet: [-0.25, 0.0], body: [0.51, -1.12, 0.191]},
  900: {wing: [-0.5, -0.5], tail: [-0.75, -0.5], feet: [-0.25, -0.25], body: [0.32, -1.17, 0.185]},
  901: {wing: [-0.5, -0.25], tail: [-0.75, -1.0], feet: [-0.25, 0.0], body: [-0.09, -0.26, 0.048]},
  902: {wing: [-0.5, -0.25], tail: [-0.75, -1.0], feet: [-0.25, -0.25], body: [-0.25, -0.63, 0.083]},
  903: {wing: [-0.5, -0.25], tail: [-0.75, -0.75], feet: [-0.25, 0.25], body: [0.05, -0.23, 0.067]},
  904: {wing: [-0.5, -0.25], tail: [-0.75, -0.75], feet: [-0.25, 0.0], body: [-0.19, -0.44, 0.081]},
  905: {wing: [-0.25, -0.25], tail: [-0.75, -0.75], feet: [-0.25, 0.25], body: [0.37, -0.06, 0.075]},
  906: {wing: [-0.5, -0.25], tail: [-0.5, -0.5], feet: [-0.25, 0.25], body: [0.23, -0.15, 0.056]},
  907: {wing: [-0.5, -0.25], tail: [-0.75, -1.0], feet: [-0.25, 0.25], body: [0.26, -0.03, 0.02]},
  908: {wing: [-0.5, -0.25], tail: [-0.75, -0.75], feet: [-0.25, 0.0], body: [0.34, -0.05, 0.034]},
  909: {wing: [-0.5, -0.5], tail: [-0.5, -0.75], feet: [-1.0, 0.0]},
  910: {wing: [-0.75, -0.75], tail: [-0.5, -0.75], feet: [-0.25, 0.0]},
  911: {wing: [-0.75, -0.75], tail: [-0.5, -0.75], feet: [-0.5, -0.25], body: [0.01, -0.21, 0.016]},
  912: {wing: [-0.75, -0.75], tail: [-0.75, -0.75], feet: [-0.5, 0.25], body: [0.08, -0.37, 0.114]},
  913: {wing: [-0.5, -0.25], tail: [0.0, 0.25], feet: [0.25, 0.25], body: [0.2, -0.87, 0.192]},
  914: {wing: [-0.5, -0.25], tail: [0.0, 0.25], feet: [-0.25, 0.0], body: [0.13, -0.79, 0.183]},
  915: {wing: [-0.25, -0.25], tail: [0.0, 0.25], feet: [-0.25, 0.25], body: [0.24, -0.57, 0.164]},
  916: {wing: [-0.75, -0.5], feet: [-0.75, 0.0], body: [0.18, -0.64, 0.168]},
  917: {wing: [-0.25, -0.25], tail: [-0.25, -0.25], body: [0.23, -0.54, 0.141]},
  918: {wing: [-0.5, -0.5], tail: [-0.25, -0.5], feet: [-0.25, 0.0], body: [0.12, -0.65, 0.17]},
  919: {wing: [-0.75, -0.75], tail: [-0.5, -0.75], feet: [-0.25, 0.25], body: [0.02, -0.57, 0.121]},
  920: {wing: [-0.75, -0.75], tail: [-0.5, -0.75], feet: [0.5, 0.0], body: [0.08, -0.55, 0.112]},
  921: {wing: [-0.75, -0.75], tail: [-0.25, -0.5], feet: [0.25, 0.25], body: [-0.04, -0.57, 0.124]},
  922: {wing: [-0.75, -0.75], tail: [-0.5, -0.75], feet: [-0.25, 0.25], body: [-0.01, -0.69, 0.161]},
};
const BODY_CUT_D = [[898, 464], [909, 466], [919, 480], [921, 488], [898, 488]];
const NUB_SHIFT = { 899: [-7, 5], 900: [-7, 5], 913: [5, -2], 914: [4, -1], 915: [4, -1] };
let fixFor = null;
function blit(ctx, key, T, cenKey = key, clipOut = null) {
  const L = layer(key), c = CEN[cenKey];
  ctx.save();
  if (clipOut) { ctx.beginPath(); ctx.rect(0, 0, 2206, 946); ctx.moveTo(clipOut[0][0], clipOut[0][1]); for (const q of clipOut.slice(1)) ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.clip("evenodd"); }
  const sp = SUBPX[key]; if (sp) ctx.translate(sp[0], sp[1]);
  const fx = fixFor && fixFor[key];   // FIX has body / wing / tail / feet entries only
  if (fx) { ctx.translate(fx[0], fx[1]); if (fx[2]) { ctx.translate(1250, 650); ctx.rotate((fx[2] * Math.PI) / 180); ctx.translate(-1250, -650); } }
  if (T.m) ctx.transform(T.m[0], T.m[3], T.m[1], T.m[4], T.m[2], T.m[5]);
  else { ctx.translate(c[0] + T.dx, c[1] + T.dy); ctx.rotate((T.r * Math.PI) / 180); ctx.scale(T.s, T.s); ctx.translate(-c[0], -c[1]); }
  ctx.drawImage(L.canvas, L.x, L.y);
  ctx.restore();
}

export const shot = {
  // (fix pass 1) the halation trimmed from the default 0.5: the glow 30-100 px outside the silhouette measured +1-1.6
  // levels over the source; the cel traces' values are inverted through this same grade
  grade: () => ({ halo: 0.42 }),
  draw(ctx, local, t) {
    const fi = Math.floor(t * 25 + 1e-3);   // the 25 fps frame on screen at t (correct at any sampling rate)
    const st = state(fi);
    fixFor = FIX[fi] || null;
    blit(ctx, st.far, st.far === "nub" ? st.T.nub : T0);
    blit(ctx, "tail", st.T.tail);
    // (w3) with the front head (901-911) its dark chin outline cuts a 7 px island off the C body's lit edge at
    // (910-917, 471-478) that the source does not have (black there): leave that corner of the body out
    blit(ctx, "body", st.T.body, "body", st.head === "headF" ? BODY_CUT_D : null);
    blit(ctx, "wing", st.T.wing);
    blit(ctx, "feet", st.T.feet);
    blit(ctx, st.head, st.T.head);
    if (CEL && st.head === "headF") blit(ctx, "sideD", st.T.head);
    if (CEL && st.head === "headE") blit(ctx, "sideE", st.T.head);
    if (CEL && fi <= 885) blit(ctx, "ovA", T0, "head");
    else if (CEL && fi <= 887) blit(ctx, "ovB", T0, "head");
  },
  release() { cache = null; },
};

// Geometry for the measurement scripts in ./s13/trace/ (node: dump.mjs flattens these paths to polygons).
export const GEO = {
  paths: {
    head: (c) => shp(headPts())(c), body: shp(BODY), wing: shp(WING), tail: blob(TAIL), nub: blob(NUB), nubB: blob(NUB_B), raised: blob(RAISED),
    headF: (c) => shp(HEADF)(c), cush: ell(CUSH), shell: ell(SHELL), plate: ell(PLATE),
  },
  EYE_L, EYE_R, TOES, FRONT_D, FRONT_E,
};
