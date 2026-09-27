// Owl startled (35.36–36.92): a big close-up of the owl on black — saucer eyes with pin-prick pupils, a sweat drop,
// beak hanging open, one wing flung up and out to the right.
//
// Beats (measured on the source; 25 fps, frame index = floor(t * 25 + 1e-3)):
//   884–885 (35.36)  pose A: the far (viewer-left) wing raised as a long paddle behind the head
//   886–887 (35.44)  pose B: the far wing dropped to a leaf; head 30 px, body 22, toes 10 px higher than C
//   888–889 (35.52)  the settle
//   890–898 (35.60)  pose C held — the master drawing
//   899–900 (35.96)  C with the head starting to turn
//   901–911 (36.04)  pose D: the head redrawn facing camera (band over the crown, both cups); head drifts up to 10 px
//   912     (36.48)  pose E: an in-between drawing of the front head
//   913–922 (36.52)  back to C
// No camera move. Each part is a cached layer placed per frame by measured affine fits (./s13/placeC.js).
//
// Fix pass 1b (method): EVERYTHING here is authored drawing code. The earlier passes' posterised cel traces
// (./s13/celHP.js, 111k vertices of the source's own tones) and ridge-traced ink strokes (strokesC / strokesD / headE
// strokes / farC strokes / chestC / feetC tone + strokes / cupC) are no longer imported or used (the files are left in
// place, unused). What is measured on the source and kept as data:
//   - part outlines (./s13/silC.js, silD.js, silX.js: lit silhouettes as simplified rings; silX.SILTAIL closed),
//   - per-frame placements (placeC.js + FIX below), a ridge-regularised cubic value study per part (toneF.js), 21 wing
//     vane-sheen centre lines (sheenC.js),
//   - coarse hatching statistics on a 40 px grid (flowM.js: stroke direction, coverage, median length / width / value,
//     strokes per area, two tiers) that steer seeded stroke rules (./s13/fur.js), per-anchor density multipliers
//     calibrated on the render's sigma-8 tone (flowCal.js), and coarse cel-tone zones (zonesM.js: 5 px control
//     polygons + one value each),
//   - key lines (wingC.js): 71 hand-picked feather / face lines, each measured as ONE quadratic curve (3 control
//     points) + a width + a value (snapshots/s13-fix1-tools/fitline.py),
//   - hand-measured control points of the parts: eyes, beaks, bandages, headphones (edge-fitted ellipses, snapped
//     points, measured material values), talons, tufts, the fan under the cup (./s13/gear.js and below).
// Measurement scripts: snapshots/s13-fix1-tools/ (see fidelity/s13.md).
import { plumage, softShade, ink, flick, setPPU, gv, LINE, V } from "../lib/owlInk.js";
import { taper } from "../lib/ink.js";
import { rng, noise2 } from "../lib/rng.js";
import { brush, swellStroke, wedge } from "./s13/brush.js";
import { SILC } from "./s13/silC.js";
import { SILD } from "./s13/silD.js";
import { SILE, SILFAR, SILFEET, SILTAIL } from "./s13/silX.js";
import { TONE } from "./s13/toneF.js";
import { PLACE } from "./s13/placeC.js";
import { SHEEN } from "./s13/sheenC.js";
import { FLOW } from "./s13/flowM.js";
import { ZONES } from "./s13/zonesM.js";
import { WINGLINES, TAILLINES, HEADLINES, FACELINES_D } from "./s13/wingC.js";
import { FCAL } from "./s13/flowCal.js";
import { field, hair, raggedEdge } from "./s13/fur.js";
import * as G from "./s13/gear.js";
import { paintFeet2 } from "./s13/feet2.js";
import { paintBand2, paintCup2, underWedge, BAND2_D, CUP2_DL, CUP2_DR, WEDGE_D, BAND2_E, CUP2_EL, CUP2_ER, WEDGE_E, WEDGE_C } from "./s13/front.js";
import { TAU, mixPath, shp, blob, clipTo, ringsPath, sampleCurve, smoothPath, offsetLine, softEll } from "./s13/util.js";

const { add, sub, mul, nrm, perp } = V;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------- value study
// the fitted value study (./s13/toneF.js): add the part's polynomial tone correction inside its silhouette, plus the
// print's seeded paper mottle on the lit plumage (faded out on near-white: the source's flat whites are clean)
// (fix 2) 9 -> 11: the chest read smoother than the source (high-pass 5.5 vs 6.7)
const MOTTLE = 11;
// the paper mottle as a seeded 256 px tile (2 px speckle + 5 px blotches), built once
let MOT = null;
function mottleAt(x, y) {
  if (!MOT) { MOT = new Float32Array(256 * 256); for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) MOT[j * 256 + i] = 0.6 * noise2(i / 2.2, j / 2.2, 91) + 0.8 * Math.max(-0.6, noise2(i / 5, j / 5, 92)); }
  return MOT[((Math.floor(y) & 255) << 8) | (Math.floor(x) & 255)];
}
function applyTone(g, key, path, { mottle = true } = {}) {
  const c = TONE[key];
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
      const dt = c ? Math.max(-0.15, Math.min(0.15, c[0] + c[1] * u + c[2] * v + c[3] * u * u + c[4] * u * v + c[5] * v * v + c[6] * u * u * u + c[7] * u * u * v + c[8] * u * v * v + c[9] * v * v * v)) : 0;
      const L0 = d[o] / 255, mw = mottle && L0 > 0.55 ? Math.min(1, (L0 - 0.55) / 0.25) * (1 - smooth(0.86, 0.95, L0)) : 0;
      const mot = mw ? mottleAt(i + ox, j + oy) * MOTTLE * mw : 0;
      const k = (dt * 255 * a) / 255 + (mot * a) / 255;
      d[o] = Math.max(0, Math.min(255, d[o] + k)); d[o + 1] = Math.max(0, Math.min(255, d[o + 1] + k)); d[o + 2] = Math.max(0, Math.min(255, d[o + 2] + k));
    }
  }
  g.putImageData(img, 0, 0);
}
// the measured cel-tone zones of a part (./s13/zonesM.js), lightest first, as soft flat fills
function zones(g, key, clip, { soft = 1.5, gain = 1, keep = null } = {}) {
  const Z = ZONES[key] || [];
  if (!Z.length) return;
  const order = Z.map((z, i) => i).sort((a, b) => Z[b][0] - Z[a][0]);
  // composed crisp off-screen, then laid down once through one blur (one filter pass instead of one per zone)
  const cv = g.canvas, tr = g.getTransform(), off = document.createElement("canvas"); off.width = cv.width; off.height = cv.height;
  const o = off.getContext("2d"); o.setTransform(tr);
  for (const i of order) {
    const [v, p] = Z[i];
    if (keep && !keep(p[0], p[1])) continue;
    o.fillStyle = gv(1 - (1 - v) * gain); o.beginPath(); o.moveTo(p[0], p[1]); for (let k = 2; k < p.length; k += 2) o.lineTo(p[k], p[k + 1]); o.closePath(); o.fill();
  }
  g.save(); g.beginPath(); clip(g); g.clip("evenodd");
  g.setTransform(1, 0, 0, 1, 0, 0); g.filter = `blur(${soft}px)`; g.drawImage(off, 0, 0); g.filter = "none";
  g.restore();
}
// the part's hatching: seeded strokes steered by its measured coarse statistics (./s13/flowM.js via ./s13/fur.js)
const FIELDS = {};
function flowOf(key, si = 6) {
  const id = key + si;
  if (!FIELDS[id]) {
    const C = FCAL[key], A = FLOW[key].map((a, i) => { const k = C && C.length === FLOW[key].length ? C[i] : 1; const b = a.slice(); b[9] *= k; b[13] *= k;
      // (fix 2) the belly: the source is cleaner white above the hem (65 % of it >= 225 against the render's 57 %) and
      // densely hatched along the hem (y 800-875): halve the faint tier above, raise the dark tier 2.5x along the hem
      if (key === "body" && b[0] >= 1140 && b[0] <= 1570) { if (b[1] >= 660 && b[1] < 800) b[13] *= 0.5; else if (b[1] >= 800 && b[1] <= 880) b[9] *= 2.5; }
      return b; });
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const a of A) { x0 = Math.min(x0, a[0]); y0 = Math.min(y0, a[1]); x1 = Math.max(x1, a[0]); y1 = Math.max(y1, a[1]); }
    FIELDS[id] = field(A, [x0 - 60, y0 - 60, x1 + 60, y1 + 60], { eps: 30, minCoh: 0.02, si });
  }
  return FIELDS[id];
}
// both tiers of a part's hatching: the faint grey strokes (0.06-0.18 under the paper), then the dark ones
function hatching(g, clip, key, seed, o = {}) {
  const H = HAIR[key] || {};
  hair(g, clip, flowOf(key, 10), { seed: seed + 5, ...HAIR_BASE.faint, ...(H.faint || {}), ...(o.faint || {}) });
  hair(g, clip, flowOf(key, 6), { seed, ...HAIR_BASE.dark, ...(H.dark || {}), ...(o.dark || {}) });
}
// (the tail's four small inner rings are dark ink lines the outline measurement took for gaps: left out)
const sil = (k) => ringsPath(k === "tail" ? SILTAIL : SILC[k]);
// per-part calibration of the hatching rules against the same statistics measured on the render
const HAIR_BASE = { dark: { densK: 1.0, lenK: 1.5, wK: 0.9, dv: -0.04 }, faint: { densK: 1.0, lenK: 1.5, wK: 0.8, dv: -0.02 } };
const HAIR = { head: { dark: { densK: 0.45, lenK: 2.0, dv: 0.03 }, faint: { densK: 0.5 } }, headF: { dark: { densK: 0.85, lenK: 2.4, dv: 0.03 }, faint: { densK: 0.85, lenK: 2 } }, headE: { dark: { densK: 0.85, lenK: 2.4, dv: 0.03 }, faint: { densK: 0.85, lenK: 2 } },
  body: { dark: { densK: 0.7, lenK: 1.6, dv: 0.02 }, faint: { densK: 0.6 } }, wing: { dark: { wK: 0.75, densK: 1.6, lenK: 1.8 } }, tail: { dark: { densK: 1.3, lenK: 1.8, maxLen: 160 } }, nub: {}, farA: { dark: { densK: 1.1, lenK: 2.4 }, faint: { densK: 0.8 } }, farB: { dark: { densK: 1.6, lenK: 1.8 } } };

// ---------------------------------------------------------------- pose C painters
// far wing nub (C): a grey leaf left of the head, dense parallel barbs running down-right, a pale lower-left rim
function paintNub(g) {
  const p = sil("nub");
  plumage(g, p, { base: 0.8, shade: 0.62, light: [0.6, -0.3], depth: 14, blur: 8 });
  zones(g, "nub", p);
  applyTone(g, "nub", p);
  barbs(g, p, SILC.nub, BARBS.nub);
  hatching(g, p, "nub", 131);
}
// the far wing raised in pose A / dropped in B (outlines measured on those frames) and the C nub: a pale leaf (lit
// mean ~0.8-0.84 pre-grade) with dense parallel barbs along its length (axis and spacing read on 884 / 886 / the C hold)
// and a pale lower-left rim
// (fix 2) farA: the source's raised paddle has fewer, thinner lines than 1b drew (gap 6.5 -> 8.5, values lifted a little)
const BARBS = { farA: { ang: 0.82, gap: 8.5, v: [0.42, 0.58], w: [0.9, 1.4], seed: 141 }, farB: { ang: 1.2, gap: 6, v: [0.38, 0.55], w: [1.0, 1.5], seed: 133 },
  nub: { ang: 1.02, gap: 6, v: [0.36, 0.52], w: [1.0, 1.6], seed: 131 } };
function barbs(g, clip, rings, B) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const r of rings) for (let i = 0; i < r.length; i += 2) { x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i]); y0 = Math.min(y0, r[i + 1]); y1 = Math.max(y1, r[i + 1]); }
  const c = [(x0 + x1) / 2, (y0 + y1) / 2], R = Math.hypot(x1 - x0, y1 - y0) / 2 + 8, d = [Math.cos(B.ang), Math.sin(B.ang)], n = perp(d), r = rng(B.seed);
  clipTo(g, clip, () => {
    for (let k = -R; k < R; k += B.gap * (0.75 + 0.5 * r())) {
      const o = add(c, mul(n, k)), L = R * (0.9 + r() * 0.8), s0 = -R * (0.3 + r() * 0.7), bend = (r() - 0.5) * 6;
      const p0 = add(o, mul(d, s0)), p1 = add(o, mul(d, s0 + L));
      const w = B.w[0] + r() * (B.w[1] - B.w[0]);
      taper(g, sampleCurve([p0, add(V.mix(p0, p1, 0.5), mul(n, bend)), p1], 6), (u) => w * Math.pow(Math.sin(Math.PI * clamp01(u)), 0.5), gv(B.v[0] + r() * (B.v[1] - B.v[0]), 0.85));
    }
  });
}
function paintFar(g, key, rings, base) {
  const p = ringsPath(rings);
  plumage(g, p, { base: 0.95, shade: base - 0.1, light: [-0.6, 0.6], depth: 16, blur: 10 });
  zones(g, key, p);
  barbs(g, p, rings, BARBS[key]);
  hatching(g, p, key, key === "farA" ? 141 : 133);
}
// the tail: a pale blade under the wing reaching down-right out of frame
function paintTail(g) {
  const tp = sil("tail");
  plumage(g, tp, { base: 0.84, shade: 0.55, light: [-0.8, -0.4], depth: 30, blur: 14 });
  zones(g, "tail", tp);
  clipTo(g, tp, () => softEll(g, 1662, 842, 70, 42, -0.5, 0.52, 0.85, 18));
  applyTone(g, "tail", tp);
  hatching(g, tp, "tail", 151);
  clipTo(g, tp, () => keyLines(g, TAILLINES, WING_INK));
}
function paintBody(g) {
  const bp = sil("body");
  // (1b) the belly's rim turned away from the light falls to grey (source: ~0.8 along the lower edge, clean white chest)
  plumage(g, bp, { base: 0.975, shade: 0.8, light: [-0.35, -0.94], depth: 34, blur: 22 });
  clipTo(g, bp, () => {
    softEll(g, 1470, 930, 250, 60, 0.05, 0.6, 0.55, 30);
    softEll(g, 1662, 710, 40, 180, 0.2, 0.62, 0.35, 24);
    softShade(g, bp, (c) => c.ellipse(955, 490, 36, 64, -0.7, 0, TAU), 0.64, 0.5, 14);
    softShade(g, bp, (c) => c.ellipse(1600, 600, 70, 150, 0.35, 0, TAU), 0.6, 0.6, 26);
    softShade(g, bp, (c) => c.ellipse(1670, 780, 40, 150, -0.35, 0, TAU), 0.62, 0.55, 20);
  });
  zones(g, "body", bp);
  applyTone(g, "body", bp);
  // (fix 2) the belly's lower-left stays white to its edge on the source (x 1150-1250, y 780-820: 63-91 % >= 225
  // against the render's 6-56 %): lift the rim shade there
  clipTo(g, bp, () => softEll(g, 1195, 792, 75, 34, -0.35, 0.975, 0.85, 14));
  hatching(g, bp, "body", 161);
  clipTo(g, bp, () => { softEll(g, 1640, 850, 60, 40, -0.5, 0.55, 0.8, 16); paintRootC(g, 'smiles'); flankHatch(g);
    // (fix 2) a band of short dark strokes rooted on the chest's left edge (C hold: x 1030-1085, y 548-600), running
    // down-right
    const r = rng(519);
    for (let i = 0; i < 12; i++) { const y = 546 + i * 4.2 + r() * 3, x = 1026 + (y - 546) * 0.32 + r() * 5, L = 16 + r() * 16;
      brush(g, [[x, y], [x + L * 0.6, y + L * 0.3], [x + L * 0.9, y + L * 0.5]], 1.1 + r() * 0.6, gv(0.2 + r() * 0.12, 0.9), { head: 0.25, pow: 0.7 }); } });
  hemFringe(g, bp);
  // (fix 2) the ragged black chip between the belly and the tail (1600-1625, 862-885): the source is dense dark hatching
  // there (mean ~97 on screen, not black): a grey ground, dark strokes along the fur (down-right) and one thin dark line
  { const CH = [[1594, 874], [1603, 861], [1614, 864], [1623, 859], [1632, 868], [1633, 889], [1620, 899], [1605, 897], [1596, 889]];
    g.save(); g.filter = "blur(1.5px)"; g.fillStyle = gv(0.46); g.beginPath(); smoothPath(g, CH, true, 0.3); g.fill(); g.restore();
    clipTo(g, (c) => smoothPath(c, CH, true, 0.3), () => { const r = rng(655); for (let i = 0; i < 9; i++) { const x = 1590 + r() * 36, y = 858 + r() * 30; brush(g, [[x, y], [x + 9 + r() * 6, y + 9 + r() * 7], [x + 18 + r() * 8, y + 22 + r() * 8]], 1.4 + r() * 1.2, gv(0.08 + r() * 0.1, 0.9), { head: 0.2, pow: 0.7 }); } });
    swellStroke(g, [[1597, 890], [1612, 879], [1629, 868]], 1.5, gv(0.15), { end: 0.2 }); }
}
// (fix 2) the hem over the feet. Between the feet (x 1290-1440) the source's belly ends in a fringe of grey tufts hanging
// 10-25 px below its lit edge (edge read by columns on the C hold: (1290,858) .. (1434,889)) over a darker hatched band;
// over the right foot the hem strokes curl down onto the toes (hooked strokes, 25-45 px).
const HEM_EDGE = [[1288, 857], [1306, 861], [1322, 867], [1338, 873], [1354, 877], [1370, 881], [1386, 884], [1402, 886], [1418, 889], [1436, 889]];
function hemFringe(g, bp) {
  const q = sampleCurve(HEM_EDGE, 6), r = rng(677), N = q.length;
  clipTo(g, bp, () => {
    g.save(); g.filter = "blur(6px)"; ink(g, offsetLine(q, -9), 16, gv(0.6, 0.7), { end: 0.4 }); g.restore();
    for (let i = 0; i < 46; i++) { const k = Math.floor(r() * N), p = add(q[k], [(r() - 0.5) * 6, -4 - r() * 18]), L = 16 + r() * 22;
      brush(g, [p, add(p, [L * 0.45, L * 0.5]), add(p, [L * 0.75, L * 0.95])], 1.2 + r() * 1.2, gv(0.18 + r() * 0.22, 0.9), { head: 0.25, pow: 0.8 }); }
    // hooked strokes curling down onto the right foot
    for (let i = 0; i < 16; i++) { const x = 1412 + r() * 70 + (i > 10 ? 110 : 0), y = 815 + r() * 30 + (i > 10 ? 15 : 0), L = 26 + r() * 20;
      brush(g, [[x, y], [x + L * 0.5, y + L * 0.35], [x + L * 0.7, y + L * 0.8]], 1.4 + r() * 0.8, gv(0.28 + r() * 0.15, 0.85), { head: 0.2, pow: 0.7 }); }
  });
  // the fringe: tufts hanging below the edge (drawn outside the outline)
  for (let i = 0; i < 90; i++) {
    const k = 2 + Math.floor(r() * (N - 4)), p = add(q[k], [(r() - 0.5) * 3, -4]), L = 12 + r() * 20, d = V.rot([0.42, 0.91], (r() - 0.5) * 0.5);
    brush(g, [p, add(add(p, mul(d, L * 0.5)), [2, 0]), add(p, mul(d, L))], 2.6 + r() * 2.4, gv(0.25 + r() * 0.3, 0.95), { head: 0.2, pow: 0.9 });
  }
}
// the flank (the body's shadow side under the wing, C hold: paper ~0.8, dense dark hatching, mean ~0.7 pre-grade):
// a grey band and long strokes that follow the body's measured right edge, dense near it and thinning inward
const FLANK = [[1575, 530], [1592, 575], [1625, 625], [1655, 690], [1675, 750], [1690, 800], [1682, 850], [1652, 885]];
const FLANK_H = { n: 120, reach: 62, w: [1.2, 2.4], v: [0.26, 0.5], shade: 0.7 };
function flankHatch(g) {
  const q = sampleCurve(FLANK, 10), N = q.length, r = rng(631);
  g.save(); g.filter = "blur(14px)"; ink(g, offsetLine(q, 16), 34, gv(FLANK_H.shade, 0.7), { end: 0.4 }); g.restore();
  for (let k = 0; k < FLANK_H.n; k++) {
    const o = 2 + Math.pow(r(), 2.2) * FLANK_H.reach, i0 = Math.floor(r() * N * 0.85), i1 = Math.min(N - 1, i0 + 5 + Math.floor(r() * 9));
    const seg = offsetLine(q.slice(i0, i1 + 1), o + (r() - 0.5) * 3);
    if (seg.length < 3) continue;
    const fade = 1 - o / (FLANK_H.reach + 5), w = FLANK_H.w[0] + (FLANK_H.w[1] - FLANK_H.w[0]) * r() * fade;
    taper(g, seg, (u) => w * Math.pow(Math.sin(Math.PI * clamp01(u)), 0.6), gv(FLANK_H.v[0] + (FLANK_H.v[1] - FLANK_H.v[0]) * (1 - fade) + (r() - 0.5) * 0.08, 0.95));
  }
}
// ---- the wing root under the cup (pose C; drawn in both the body and the wing layers, clipped to each): the cup's cast
// shadow as a fan of bold dark strokes swept down-left from the cushion's lower rim (two measured on the C hold:
// (1500,392)->(1415,471) and (1519,397)->(1427,466)), and rows of hooked "smile" arcs (scapular and covert edges) on
// a grey ground. Rows: [left end, right end, count] read on the ink map; arcs seeded.
const FAN = { base: [[1436, 398], [1528, 395]], n: 16, dir: [-0.7, 0.71], len: [55, 120], w: [2.4, 4.8], v: [0.1, 0.3], bow: 0.07, seed: 611 };
// D / E: the same fan under the right cup, narrower (two strokes measured on 901-902: (1498,400)->(1456,449),
// (1516,403)->(1471,442); on 912 (1474,399)->(1431,449))
const FAN_D = { base: [[1462, 402], [1516, 402]], n: 10, dir: [-0.66, 0.75], len: [36, 66], w: [2.4, 4.2], v: [0.1, 0.3], seed: 612 };
const FAN_E = { ...FAN_D, base: [[1436, 400], [1492, 400]], dir: [-0.7, 0.72] };
const SMILES = [
  [[1565, 452], [1625, 446], 3], [[1520, 474], [1610, 470], 4], [[1490, 496], [1605, 492], 5], [[1480, 522], [1625, 516], 5],
  [[1490, 548], [1645, 546], 5], [[1520, 575], [1665, 572], 4],
];
function paintRootC(g, fanOnly = false, FANP = FAN) {
  const FAN_ = FANP, r = rng(FAN_.seed);
  if (fanOnly !== 'smiles') {
  for (let i = 0; i < FAN_.n; i++) {
    const u = i / (FAN_.n - 1), b = V.mix(FAN_.base[0], FAN_.base[1], u);
    const L = FAN_.len[0] + (FAN_.len[1] - FAN_.len[0]) * u + (r() - 0.5) * 16, d = V.rot(FAN_.dir, (r() - 0.5) * 0.12);
    const e = add(b, mul(d, L)), m = add(V.mix(b, e, 0.5), mul(perp(d), -L * (FAN_.bow ?? 0.07)));
    brush(g, [add(b, [r() * 3, -2]), m, e], FAN_.w[0] + (FAN_.w[1] - FAN_.w[0]) * (1 - u) * r(), gv(FAN_.v[0] + (FAN_.v[1] - FAN_.v[0]) * r(), 0.95), { head: 0.1, pow: 0.9 });
  }
  }
  if (fanOnly === true) return;
  // (fix 2) the covert rows as overlapping scallops, not evenly spaced ribs: per row, arcs staggered by half a feather
  // against the row above, each a curve sagging down and hooking up at its right end, 30-55 px, 1.1-1.7 px, jittered
  // +-3 px / +-8 deg; lighter toward the wing root on the left (the source is pale grey there)
  const rs = rng(613);
  SMILES.forEach(([a, b, n], row) => { const m = n + 1;
    for (let k = 0; k < m; k++) {
      const u = (k + (row % 2 ? 0.5 : 0.1) + (rs() - 0.5) * 0.2) / m, c = add(V.mix(a, b, u), [(rs() - 0.5) * 6, (rs() - 0.5) * 6]);
      if (c[0] > b[0] + 10) continue;
      const L = 30 + rs() * 25, sag = L * (0.12 + rs() * 0.08), rot = (rs() - 0.5) * 0.28, R = (d) => add(c, V.rot(d, rot));
      const p0 = R([-L * 0.6, -sag * 0.6]), p1 = R([-L * 0.15, sag * 0.5]), p2 = R([L * 0.25, sag * 0.3]), p3 = R([L * 0.4, -sag * 0.9]);
      const lt = clamp01((1600 - c[0]) / 110);
      brush(g, [p0, p1, p2, p3], 1.4 + rs() * 0.8, gv(0.18 + lt * 0.16 + rs() * 0.12, 0.9), { head: 0.6, pow: 0.4 });
    } });
}
// (w3) the vane sheen: the source's near wing is cel-lit — a bright streak runs down each covert and primary vane
// (~+15 levels over the plumage, 5-15 px wide); 21 measured centre lines drawn as soft tapered strokes
const SHEEN_CAL = { v: 0.94, blur: 1, ratio: 6, maxW: 12, minL: 20 };
// (fix 2) drawn as long pale streaks, not soft ovals: each entry's centre line (its mean value only picks brighter /
// dimmer streaks), width capped at length / 8 (and 7 px), a sine taper, a 1 px feather; streaks under 20 px dropped
function paintSheen(g) {
  const cv = g.canvas, tr = g.getTransform(), off = document.createElement("canvas"); off.width = cv.width; off.height = cv.height;
  const o = off.getContext("2d"); o.setTransform(tr);
  for (const s of SHEEN) {
    const pts = [], W = [];
    for (let i = 1; i < s.length; i += 3) { pts.push([s[i], s[i + 1]]); W.push(s[i + 2]); }
    let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (L < SHEEN_CAL.minL) continue;
    const wMax = Math.min(SHEEN_CAL.maxW, L / SHEEN_CAL.ratio, Math.max(...W) * 0.85), v = Math.min(0.97, SHEEN_CAL.v + ((s[0] - 230) / 255) * 0.6);
    // extend the streak 15 % at each end along its axis (the source's streaks run most of the vane's length)
    const d0 = nrm(sub(pts[1], pts[0])), d1 = nrm(sub(pts[pts.length - 1], pts[pts.length - 2]));
    const q = sampleCurve([sub(pts[0], mul(d0, L * 0.15)), ...pts.slice(1, -1), add(pts[pts.length - 1], mul(d1, L * 0.15))], 4);
    taper(o, q, (u) => wMax * Math.pow(Math.sin(Math.PI * clamp01(u)), 0.7), gv(v));
  }
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.filter = `blur(${SHEEN_CAL.blur}px)`; g.drawImage(off, 0, 0); g.filter = "none"; g.restore();
}
// (fix 2) three more long primary separation lines (lines.py found them on the ink map of the C hold, fitline.py measured
// each as one quadratic + width + value); the long silhouette-edge runs it also found are left out
const WINGLINES2 = [
  [[1897, 448], [1974, 528], [2031, 615], 4.6, 0.45],
  [[1930, 573], [1969, 627], [2005, 682], 4.6, 0.32],
  [[1733, 522], [1769, 569], [1806, 618], 4.6, 0.3],
];
// measured key lines (3-point curves) drawn as tapered ink: width = measured width x k, value = measured + dv
const WING_INK = { k: 0.55, dv: 0.0, end: 0.12 };
function keyLines(g, L, { k = 0.55, dv = 0, end = 0.12, pow = 0.6 } = {}) {
  for (const [p0, p1, p2, w, v] of L) {
    const q = []; for (let i = 0; i <= 16; i++) { const t = i / 16; q.push([(1 - t) * (1 - t) * p0[0] + 2 * t * (1 - t) * p1[0] + t * t * p2[0], (1 - t) * (1 - t) * p0[1] + 2 * t * (1 - t) * p1[1] + t * t * p2[1]]); }
    taper(g, q, (u) => Math.max(0.7, w * k) * (end + (1 - end) * Math.pow(Math.sin(Math.PI * clamp01(u)), pow)), gv(clamp01(v + dv)));
  }
}
function paintWing(g) {
  const wp = sil("wing");
  // (fix 2) a brighter ground under the heavier lines: the source's lit wing has more whites (33 % >= 225 vs 25 %)
  g.fillStyle = gv(0.86); g.beginPath(); wp(g); g.fill("evenodd");
  clipTo(g, wp, () => {
    softEll(g, 1720, 320, 180, 60, 0.45, 0.96, 0.8, 30);
    softEll(g, 1570, 520, 60, 150, 0.25, 0.7, 0.7, 30);
  });
  // (fix 2) the wing's cel zones laid down softer (the zone edge at x ~1532 read as a cut-paper step)
  zones(g, "wing", wp, { soft: 5 });
  applyTone(g, "wing", wp);
  // (fix 2) the coverts right of the wing root hold ~224 on the source (row medians y 430-500), the render ~235
  clipTo(g, wp, () => softEll(g, 1630, 462, 70, 90, 0, 0.8, 0.45, 26));
  clipTo(g, wp, () => paintSheen(g));
  hatching(g, wp, "wing", 171);
  clipTo(g, wp, () => paintRootC(g, 'smiles'));
  // (fix 2) the source's wing ink is ~2x the render's (dark pixels in the lit wing 4.3 % vs 2.1 %): heavier key lines
  clipTo(g, wp, () => keyLines(g, WINGLINES, { ...WING_INK, k: 0.72, dv: -0.06 }));
  clipTo(g, wp, () => keyLines(g, WINGLINES2, { ...WING_INK, k: 0.5, dv: 0.04 }));
}
// talons: ./s13/feet2.js (fix pass 2)
// ---- head, 3/4 (pose C)
// the far run of the band (measured column profiles at 35.80): the pale outer rim, its dark mesh inner face below it
const BAND_BACK = [[1098, 84], [1112, 58], [1126, 40], [1157, 19], [1198, 1], [1240, -8], [1300, -10], [1350, -2], [1380, 6], [1401, 16], [1444, 33], [1463, 64]];
function paintBandBack(g) {
  const bq = sampleCurve(BAND_BACK, 8);
  const bw = (u) => (u < 0.3 ? 28 : u < 0.5 ? 28 - (u - 0.3) * 100 : 8 + (u - 0.5) * 8);
  const inner = bq.map(([x, y], i) => { const a = bq[Math.max(0, i - 1)], b = bq[Math.min(bq.length - 1, i + 1)], n = nrm(perp(sub(b, a))), o = 3 + bw(i / (bq.length - 1)) / 2; return [x + n[0] * o, y + n[1] * o]; });
  taper(g, inner, (u) => bw(u) + 5, LINE);
  const ip = (c) => { const L = inner.map(([x, y], i) => { const a = inner[Math.max(0, i - 1)], b = inner[Math.min(inner.length - 1, i + 1)], n = nrm(perp(sub(b, a))), o = bw(i / (inner.length - 1)) / 2; return [x + n[0] * o, y + n[1] * o]; }); const R = inner.map(([x, y], i) => { const a = inner[Math.max(0, i - 1)], b = inner[Math.min(inner.length - 1, i + 1)], n = nrm(perp(sub(b, a))), o = bw(i / (inner.length - 1)) / 2; return [x - n[0] * o, y - n[1] * o]; }); c.moveTo(L[0][0], L[0][1]); for (const p of L) c.lineTo(p[0], p[1]); for (const p of R.reverse()) c.lineTo(p[0], p[1]); c.closePath(); };
  G.mesh(g, ip, [1080, -30, 1470, 110], { lo: 0.16, hi: 0.52, w: 1.0, seed: 21 });
  taper(g, bq, () => 8, LINE);
  taper(g, bq, () => 4, gv(0.84));
  // (fix 2) the band's lit face under the rim on the right (column profiles of the C hold: screen ~190 at (1380, 16-26),
  // (1400, 30-42), (1360, 8-14)); 1b drew it dark there
  taper(g, sampleCurve([[1338, 2], [1362, 11], [1380, 21], [1400, 36], [1414, 47]], 6), (u) => 9 * Math.pow(Math.sin(Math.PI * clamp01(u * 0.9 + 0.05)), 0.4), gv(0.74));
}
// the band's mesh inner face shows between the rim and the crown's tufts on the left (the outline measurement took
// it for head): drawn over the head plumage as a strip from the rim down to a ragged tuft line (flames leaning up-right)
const BAND_MESH_TUFTS = [[1252, 22], [1216, 40], [1180, 52], [1146, 62], [1116, 74], [1103, 86]];
function paintBandMeshC(g) {
  const rim = sampleCurve(BAND_BACK.slice(0, 6), 8), top = offsetLine(rim, -5).filter((p) => p[0] < 1258);
  const bot = raggedEdge(BAND_MESH_TUFTS, { step: 26, len: [12, 26], depth: 3, lean: 0.9, side: -1, seed: 671 });
  const poly = [...top, ...bot];
  const pp = (c) => { c.moveTo(poly[0][0], poly[0][1]); for (const q of poly) c.lineTo(q[0], q[1]); c.closePath(); };
  G.mesh(g, pp, [1090, -20, 1270, 100], { lo: 0.16, hi: 0.52, w: 1.0, seed: 22 });
  g.strokeStyle = gv(0.1, 0.9); g.lineWidth = 1.6; g.beginPath(); g.moveTo(bot[0][0], bot[0][1]); for (const q of bot) g.lineTo(q[0], q[1]); g.stroke();
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
function paintHead3q(g) {
  paintBandBack(g);
  const hp = sil("head");
  g.fillStyle = gv(0.975); g.beginPath(); hp(g); g.fill("evenodd");
  clipTo(g, hp, () => {
    softEll(g, 1380, 330, 40, 120, 0, 0.84, 0.5, 22);
  });
  zones(g, "head", hp);
  softShade(g, hp, (c) => c.ellipse(925, 470, 22, 70, -0.6, 0, TAU), 0.66, 0.6, 10);
  applyTone(g, "head", hp);
  hatching(g, hp, "head", 181);
  clipTo(g, hp, () => keyLines(g, HEADLINES, { ...WING_INK, dv: -0.14 }));
  // (fix 2) the brow "V": a fan of grey strokes between the eyes converging down on (1032, 290) (C hold, 4x zoom), and
  // strokes from under the near eye down-left to the beak base (x 1020-1075, y 372-400)
  { const r = rng(347), V0 = [1032, 291];
    for (const x of [1004, 1012, 1020, 1028, 1036, 1046, 1056, 1066]) { const p0 = [x + (r() - 0.5) * 4, 244 + r() * 10];
      brush(g, [p0, add(V.mix(p0, V0, 0.5), [(r() - 0.5) * 3, 0]), add(V0, [(r() - 0.5) * 8, -2 - r() * 6])], 1.6 + r() * 0.7, gv(0.5 + r() * 0.15, 0.85), { head: 0.3, pow: 0.6 }); }
    for (let i = 0; i < 7; i++) { const p0 = [1048 + i * 4.5 + r() * 3, 372 + r() * 8];
      brush(g, [p0, add(p0, [-12, 9]), add(p0, [-22 - r() * 6, 20 + r() * 4])], 1.5 + r() * 0.8, gv(0.45 + r() * 0.15, 0.85), { head: 0.3, pow: 0.7 }); } }
  paintBandMeshC(g);
  softShade(g, hp, (c) => c.ellipse(1470, 405, 60, 14, -0.1, 0, TAU), 0.35, 0.6, 8);
  // (fix 2) the fan of parallel dark strokes under the cup replaced by the source's wedge: pale underside streaks, dark
  // strokes converging down-left, long curved strokes off the rim
  underWedge(g, WEDGE_C);
  G.eye(g, EYE_L, 341); G.eye(g, EYE_R, 342);
  G.paintBeak3q(g);
  G.bandageC(g);
  G.drop(g, [0.5 - SUBPX.head[0], 0.5 - SUBPX.head[1]]);
  G.cup3q(g);
}

// ---- head, facing camera (pose D, measured at 36.04-36.08; E = 36.48, its own outline, same parts re-placed)
const FRONT_D = {
  face: [0, 0], beak: [0, 0], band: [0, 0], bandage: [0, 0],
  eyes: [{ x: 1108, y: 343.5, rx: 65, ry: 68, rot: 0, W: [3.8, 4.2, 4.6, 5.0, 5.3, 5.3, 5.1, 4.7, 4.3, 3.8, 3.5, 3.4, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.5], tick: [[1166, 368], [1171, 376], [1174, 384]], lash: [[1.8, 3.2, 6], [0.4, 1.4, 5]], pupil: { x: 1138, y: 340, rx: 9, ry: 9, dot: [3.8, 3.8], arcs: [[1.95, 4.35, 1.8], [-1.05, 1.05, 1.5]] } },
    { x: 1335, y: 320, rx: 56, ry: 64.7, rot: 0.01, W: [3.3, 3.3, 3.3, 3.3, 3.3, 3.4, 3.6, 3.9, 4.4, 4.8, 5.1, 5.3, 5.2, 5.0, 4.5, 4.1, 3.7, 3.4, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3], tick: [[1293, 354], [1289, 362], [1285, 369]], lash: [[1.6, 2.8, 6], [-0.8, 0.5, 5]], pupil: { x: 1348, y: 318, rx: 7, ry: 7, dot: [2.9, 2.9], arcs: [[1.95, 4.35, 1.8], [-1.05, 1.05, 1.5]] } }],
  // cups (measured on 901-902: dark runs along rows, snap.py): cushion outline, its lit patch, the three chrome bands
  // seen edge-on [x0, x1, y0, y1], outermost last
  cups: [
    { side: -1, cush: [[884, 232], [892, 220], [935, 216], [950, 226], [948, 300], [957, 420], [963, 452], [955, 466], [905, 462], [888, 440], [882, 340]],
      patch: [900, 285, 925, 370], bands: [[868, 884, 195, 445], [854, 868, 225, 435], [838, 854, 285, 410]], bandV: [0.62, 0.2, 0.47], cushV: 0.14, patchV: 0.6, lean: 0.04, seed: 471 },
    { side: 1, cush: [[1426, 190], [1434, 176], [1472, 172], [1484, 182], [1496, 280], [1506, 352], [1500, 368], [1472, 376], [1461, 370], [1446, 280]],
      patch: [1446, 200, 1476, 300], bands: [[1488, 1506, 182, 372], [1506, 1522, 192, 362], [1522, 1540, 208, 348]], bandV: [0.35, 0.4, 0.34], cushV: 0.12, patchV: 0.5, lean: 0.2, blotch: true, seed: 472 },
  ],
  shadow: [1488, 392], fan: FAN_D,
  // (fix 2) the authored crescent cups, the wide band rail with its slider blocks, the wedge under the right cup
  band2: BAND2_D, cups2: [CUP2_DL, CUP2_DR], wedge: WEDGE_D,
  shoulder: [[1446, 398], [1528, 394], [1560, 352], [1600, 338], [1650, 350], [1660, 420], [1600, 480], [1480, 492], [1432, 452]],
  // the pale cheek tuft sticking out left of the left cup (measured by rows on 901-902: lit 0.8-0.87 pre-grade)
  tuft: [[846, 300], [843, 320], [843, 345], [845, 370], [849, 398], [838, 388], [827, 374], [819, 356], [815, 335], [817, 315], [823, 303], [834, 298]],
};
const FRONT_E = {
  face: [-70, 2], beak: [-72, 2], band: [0, 0], bandage: [-46, -6],
  eyes: [{ x: 1035.6, y: 344.6, rx: 62, ry: 70, rot: -0.16, W: [3.8, 4.2, 4.6, 5.0, 5.3, 5.3, 5.1, 4.7, 4.3, 3.8, 3.5, 3.4, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.5], lash: [[1.8, 3.2, 6], [0.4, 1.4, 5]], pupil: { x: 1044, y: 344, rx: 8, ry: 8, dot: [3.4, 3.4], arcs: [[1.95, 4.35, 1.8], [-1.05, 1.05, 1.5]] } },
    { x: 1277, y: 325, rx: 66.5 * 1.03, ry: 71.5 * 1.03, rot: 0.4, W: [3.3, 3.3, 3.3, 3.3, 3.3, 3.4, 3.6, 3.9, 4.4, 4.8, 5.1, 5.3, 5.2, 5.0, 4.5, 4.1, 3.7, 3.4, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3, 3.3], lash: [[1.6, 2.8, 6], [-0.8, 0.5, 5]], pupil: { x: 1270, y: 328, rx: 7.5, ry: 7.5, dot: [3.1, 3.1], arcs: [[1.95, 4.35, 1.8], [-1.05, 1.05, 1.5]] } }],
  // cups (measured on 912 the same way): both ~30 px left of D, the left cushion narrower (turned further away)
  cups: [
    { side: -1, cush: [[872, 215], [880, 205], [895, 205], [902, 220], [903, 340], [900, 440], [890, 452], [876, 450], [870, 440], [870, 340]],
      patch: [876, 290, 896, 370], bands: [[854, 872, 196, 445], [834, 854, 222, 432], [814, 834, 280, 405]], bandV: [0.45, 0.32, 0.5], cushV: 0.12, patchV: 0.5, seed: 473 },
    { side: 1, cush: [[1400, 178], [1408, 166], [1450, 164], [1468, 176], [1476, 280], [1478, 360], [1470, 372], [1440, 372], [1428, 360], [1414, 280]],
      patch: [1414, 190, 1444, 290], bands: [[1474, 1492, 178, 355], [1492, 1512, 190, 335], [1512, 1532, 205, 315]], bandV: [0.4, 0.43, 0.38], cushV: 0.1, patchV: 0.4, lean: 0.06, seed: 474 },
  ],
  shadow: [1462, 392], fan: FAN_E,
  band2: BAND2_E, cups2: [CUP2_EL, CUP2_ER], wedge: WEDGE_E,
  bandRim: [[884, 176], [893, 152], [903, 130], [931, 96], [964, 69], [1021, 32], [1089, 9], [1155, 3], [1231, 2], [1302, 16], [1363, 32], [1409, 54], [1431, 80], [1440, 104], [1446, 130], [1449, 156]],
  sliders: [[[900, 112], [922, 140]], [[1420, 60], [1442, 92]]],
  tuft: [[846, 266], [844, 290], [844, 318], [834, 336], [826, 354], [820, 350], [815, 330], [814, 310], [820, 296], [834, 282]],
};
const off = (pts, [dx, dy]) => pts.map((p) => [p[0] + dx, p[1] + dy, p[2]]);
function paintBeakFront(g, F) {
  const bo = (pts) => off(pts, F.beak);
  // (fix 2) re-read by rows on 905 / 901-902: the upper mandible is pale (0.9-0.95) with a grey left edge and a heavy
  // dark hooked right outline (x 1265-1277); the gape is a dark wedge at y 452-468 from x 1196 to ~1230, the lower
  // mandible pale (0.85) below it; a small grey nostril dot at (1237, 418) (source: ~5 px, screen ~90).
  const up = bo([[1222, 402], [1234, 396], [1246, 398], [1261, 407], [1272, 424], [1276, 445], [1272, 465], [1263, 481], [1252, 493, 1], [1244, 474], [1232, 458], [1216, 453], [1202, 452], [1206, 432], [1213, 414]]);
  g.fillStyle = gv(0.89); g.beginPath(); mixPath(g, up, true); g.fill();
  clipTo(g, (c) => mixPath(c, up, true), () => {
    g.filter = "blur(4px)";
    ink(g, bo([[1216, 408], [1208, 430], [1203, 450]]), 14, gv(0.72, 0.85), { end: 0.4 });
    ink(g, bo([[1262, 412], [1270, 440], [1262, 474]]), 10, gv(0.8, 0.7), { end: 0.4 });
    g.filter = "none";
  });
  // the gape: a heavy dark upper lip over a pale-grey inner lip (a lens), not a solid black wedge
  const gape = bo([[1195, 455], [1212, 455], [1228, 459], [1240, 468], [1248, 483], [1236, 474], [1220, 470], [1204, 469], [1195, 463]]);
  g.fillStyle = gv(0.48); g.beginPath(); smoothPath(g, gape, true, 0.3); g.fill();
  swellStroke(g, bo([[1195, 457], [1212, 456], [1228, 460], [1240, 469], [1248, 483]]), 7.5, gv(0.06), { end: 0.35, pow: 0.4 });
  const jaw = bo([[1199, 468], [1216, 468], [1232, 473], [1244, 484], [1250, 494], [1232, 493], [1216, 489], [1205, 481]]);
  g.fillStyle = gv(0.64); g.beginPath(); smoothPath(g, jaw, true, 0.3); g.fill();
  clipTo(g, (c) => smoothPath(c, jaw, true, 0.3), () => { g.filter = "blur(2px)"; ink(g, bo([[1204, 472], [1222, 474], [1240, 484]]), 4, gv(0.62, 0.8)); g.filter = "none"; });
  swellStroke(g, bo([[1219, 404], [1211, 422], [1205, 440], [1201, 452]]), 2.0, gv(0.3, 0.9), { end: 0.2 });
  swellStroke(g, bo([[1246, 398], [1261, 407], [1272, 424], [1276, 445], [1272, 465], [1263, 481], [1252, 493]]), 3.6, LINE, { end: 0.3 });
  swellStroke(g, bo([[1194, 452], [1212, 451], [1229, 455], [1241, 466], [1249, 482]]), 3.0, LINE, { end: 0.3, pow: 0.4 });
  swellStroke(g, bo([[1198, 469], [1210, 480], [1222, 489], [1238, 494], [1252, 494]]), 2.4, LINE, { end: 0.3 });
  { const q = bo([[1237, 418]])[0]; g.fillStyle = gv(0.33); g.beginPath(); g.ellipse(q[0], q[1], 2.8, 2.6, 0.3, 0, TAU); g.fill(); }
  // rictal bristles: short grey strokes fanning down-right over the beak's left edge (source: x 1195-1225, y 395-460)
  const r = rng(468);
  for (let i = 0; i < 12; i++) { const p0 = bo([[1192 + r() * 26, 394 + i * 5.2 + r() * 3]])[0], L = 12 + r() * 10;
    brush(g, [p0, add(p0, [L * 0.5, L * 0.45]), add(p0, [L * 0.8, L * 0.95])], 1.4 + r() * 0.9, gv(0.3 + r() * 0.2, 0.85), { head: 0.2, pow: 0.7 }); }
}
// the headband over the crown (D, measured: its outer rim snapped at 10 points on 901-902): a black band ~19 px wide
// inside the rim, a thin bright highlight along the rim, a faint grey inner edge, the slider blocks at both ends
const BAND_F = [[889, 186], [893, 168], [901, 146], [935, 104], [977, 74], [1037, 38], [1118, 10], [1200, 4], [1282, 10], [1362, 37], [1416, 75], [1445, 97], [1462, 122], [1470, 146], [1474, 168]];
function paintBandFront(g, F) {
  const bq = sampleCurve(F.bandRim || off(BAND_F, F.band), 8);
  const inner = offsetIn(bq, 10);
  taper(g, inner, () => 21, LINE);
  taper(g, offsetIn(bq, 1.2), () => 2.2, gv(0.82, 0.95));
  taper(g, offsetIn(bq, 19), () => 1.4, gv(0.45, 0.8));
}
// offset a sampled curve toward the inside of the arc (left of travel for a clockwise arc over the head)
function offsetIn(q, d) { return q.map(([x, y], i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)], t = nrm(sub(b, a)); return [x - t[1] * d, y + t[0] * d]; }); }
// the cheek tuft behind the left cup: pale fur, 3-4 grey hairlines along its long axis, a soft grey right edge
function paintTuft(g, pts) {
  const p = (c) => smoothPath(c, pts, true, 0.35);
  g.fillStyle = gv(0.88); g.beginPath(); p(g); g.fill();
  // (fix 2) the source's tuft edge is ragged: 6 small dark notches (3-6 px deep) cut into its outer (left) edge
  { const r = rng(483), n = pts.length, h = Math.floor(n / 2), side = pts.slice(h - 1).concat([pts[0]]);
    for (let k = 0; k < 6; k++) { const u = 0.12 + k * 0.14 + (r() - 0.5) * 0.05, f = u * (side.length - 1), i = Math.floor(f), a = V.mix(side[i], side[Math.min(side.length - 1, i + 1)], f - i);
      const t = nrm(sub(side[Math.min(side.length - 1, i + 1)], side[i])), nn = perp(t), d = 3 + r() * 3;
      g.fillStyle = gv(0.03); g.beginPath(); g.moveTo(...add(a, mul(t, -3))); g.lineTo(...add(add(a, mul(nn, -d)), mul(t, 1))); g.lineTo(...add(a, mul(t, 3))); g.lineTo(...add(a, mul(nn, 3))); g.closePath(); g.fill(); } }
  clipTo(g, p, () => {
    g.filter = "blur(3px)"; ink(g, pts.slice(0, 5).map(([x, y]) => [x - 2, y]), 6, gv(0.68, 0.8), { end: 0.4 }); g.filter = "none";
    const r = rng(481); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    for (let k = 0; k < 4; k++) { const x = x0 + 6 + k * (x1 - x0 - 10) / 3 + (r() - 0.5) * 3; ink(g, [[x + 4, y0 + 8 + r() * 6], [x, (y0 + y1) / 2], [x - 5, y1 - 10 - r() * 8]], 1.1, gv(0.55, 0.8), { end: 0.2 }); }
    // (fix 2) the source's tuft is hatched darker in its lower half: long grey hairlines running down-left
    for (let k = 0; k < 6; k++) { const x = x0 + 8 + r() * (x1 - x0 - 8), y = y0 + (y1 - y0) * (0.4 + r() * 0.3); ink(g, [[x, y], [x - 6, y + 14], [x - 11, y + 30]], 1.3, gv(0.38, 0.85), { end: 0.2 }); }
  });
}
// D / E: the shoulder under the right cup is redrawn bright (the C drawing's wing-root hatching sits there): a soft
// white patch (outline read on 901-902 / 912: from the cup's lower rim out to the black past the shoulder) under the fan
function paintShoulderF(g, pts) {
  g.save(); g.filter = "blur(8px)"; g.fillStyle = gv(0.95); g.beginPath(); smoothPath(g, pts, true, 0.3); g.fill(); g.filter = "none"; g.restore();
  const r = rng(485);
  clipTo(g, (c) => smoothPath(c, pts, true, 0.3), () => { for (let i = 0; i < 26; i++) { const x = pts[0][0] + r() * 160, y = 400 + r() * 80; brush(g, [[x, y], [x - 14 - r() * 10, y + 16 + r() * 14]], 1.4, gv(0.55 + r() * 0.2, 0.7)); } });
}
function paintHeadFront(g, F, key, rings) {
  if (F.tuft) paintTuft(g, F.tuft);
  if (F.shoulder) paintShoulderF(g, F.shoulder);
  if (F.band2) paintBand2(g, F.band2); else paintBandFront(g, F);
  const hp = ringsPath(rings);
  g.fillStyle = gv(0.975); g.beginPath(); hp(g); g.fill("evenodd");
  zones(g, key, hp);
  softShade(g, hp, (c) => c.ellipse(975 + F.face[0] * 0.5, 488, 60, 42, 0.6, 0, TAU), 0.55, 0.75, 18);
  applyTone(g, "headF", hp);
  hatching(g, hp, key, key === "headF" ? 191 : 193);
  { const o = F.face[0] ? [F.face[0] * 0.94, F.face[1]] : [0, 0];   // (E: the disc re-placed with the face)
    clipTo(g, hp, () => keyLines(g, FACELINES_D.map(([a, b, c, w, v]) => [add(a, o), add(b, o), add(c, o), w, v]), { ...WING_INK, dv: -0.1 })); }
  G.eye(g, F.eyes[0], 421); G.eye(g, F.eyes[1], 422);
  paintBeakFront(g, F);
  G.bandageFront(g, G.BAND_D, F.bandage);
  const r = rng(461);
  if (F.wedge) underWedge(g, F.wedge); else paintRootC(g, true, F.fan);
  if (F.cups2) for (const C of F.cups2) paintCup2(g, C); else for (const C of F.cups) G.paintCupD(g, C);
}

// ---------------------------------------------------------------- layers + transforms
const LAYERS = {
  nub: [800, 270, 925, 470, paintNub],
  nubB: [770, 190, 970, 430, (g) => paintFar(g, "farB", SILFAR.B, 0.8)],
  raised: [750, 240, 1090, 650, (g) => paintFar(g, "farA", SILFAR.A, 0.84)],
  tail: [1540, 580, 1840, 946, paintTail],
  body: [880, 350, 1700, 946, paintBody],
  wing: [1500, 225, 2110, 740, paintWing],
  feet: [1140, 800, 1620, 990, (g) => paintFeet2(g, ringsPath(SILFEET))],
  head: [860, -60, 1600, 560, paintHead3q],
  headF: [800, -20, 1680, 560, (g) => paintHeadFront(g, FRONT_D, "headF", SILD.headF)],
  headE: [780, -20, 1680, 560, (g) => paintHeadFront(g, FRONT_E, "headE", SILE)],
};
const EDGE_FEATHER = 1.6, EDGE_PULL = [0.35, 0.85], GLOW = { blur: 7, a: 0 };
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
    const sg = soft.getContext("2d"); sg.filter = "blur(0.3px)"; sg.drawImage(c, 0, 0); sg.filter = "none";
    // (review) the source's silhouette edges fall off over 1-3 px, and the measured outlines (threshold contours) sit
    // ~1.5 px outside its edge: the layer's alpha edge is pulled in and feathered — alpha x smoothstep(lo, hi, alpha
    // blurred by EDGE_FEATHER px)
    { const fm = document.createElement("canvas"); fm.width = c.width; fm.height = c.height; const fg = fm.getContext("2d"); fg.filter = `blur(${EDGE_FEATHER}px)`; fg.drawImage(c, 0, 0);
      const bd = fg.getImageData(0, 0, c.width, c.height).data, im = sg.getImageData(0, 0, c.width, c.height), dd = im.data, [lo, hi] = EDGE_PULL;
      for (let i = 3; i < dd.length; i += 4) { if (!dd[i]) continue; const t = Math.max(0, Math.min(1, (bd[i] / 255 - lo) / (hi - lo))); dd[i] = Math.round(dd[i] * t * t * (3 - 2 * t)); }
      sg.putImageData(im, 0, 0); }
    // (review) the source's glow hugs the silhouette (+2-3 levels 6-15 px out, less far out than the grade's halation):
    // a soft white copy of the layer's alpha baked in under it
    if (GLOW.a > 0) {
      const gl = document.createElement("canvas"); gl.width = c.width; gl.height = c.height; const gg = gl.getContext("2d");
      gg.filter = `blur(${GLOW.blur}px)`; gg.drawImage(soft, 0, 0); gg.filter = "none";
      gg.globalCompositeOperation = "source-in"; gg.fillStyle = `rgba(255,255,255,${GLOW.a})`; gg.fillRect(0, 0, gl.width, gl.height);
      sg.globalCompositeOperation = "destination-over"; sg.drawImage(gl, 0, 0); sg.globalCompositeOperation = "source-over";
    }
    // the front heads end on the chest in a soft fade, not a cut (the body layer carries on underneath)
    if (k === "headF" || k === "headE") {
      const m = document.createElement("canvas"); m.width = c.width; m.height = c.height;
      const mg = m.getContext("2d"); mg.fillStyle = "#fff"; mg.fillRect(0, 0, m.width, m.height);
      mg.translate(-x0, -y0); mg.globalCompositeOperation = "destination-out"; mg.filter = "blur(10px)"; mg.fillStyle = "#000";
      const dx = k === "headE" ? -40 : 0;
      mg.beginPath(); smoothPath(mg, [[1000 + dx, 520], [1120 + dx, 560], [1250, 558], [1362, 510], [1398, 478], [1404, 600], [990 + dx, 600]], true, 0.3); mg.fill();
      sg.globalCompositeOperation = "destination-in"; sg.drawImage(m, 0, 0); sg.globalCompositeOperation = "source-over";
    }
    cache[k] = { canvas: soft, x: x0, y: y0 };
  }
  return cache[k];
}
// transform of a layer: move the region centre (cx, cy) by (dx, dy), rotate by r degrees and scale by s about it
const CEN = { nubB: [905, 455], tail: [1715, 783], head: [1190, 270], headF: [1190, 270], headE: [1190, 270], wing: [1860, 485], body: [1250, 650], feet: [1400, 883], nub: [905, 455], raised: [905, 455] };
const T0 = { dx: 0, dy: 0, r: 0, s: 1 };
// every pose measured directly against C (ORB similarity per region, 35.80 -> t): dx, dy of the region centre,
// rotation in degrees, scale (used where no ECC placement is kept)
const A = { tail: { dx: -2.1, dy: -9.5, r: 1.26, s: 1.002 }, head: { dx: -1.0, dy: -32.8, r: 0.33, s: 1 }, wing: { dx: 0.6, dy: 26.9, r: 10.5, s: 1.0 }, body: { dx: 4.7, dy: -26.4, r: 0.83, s: 1.036 }, feet: { dx: -2.3, dy: -15.1, r: 0.66, s: 0.993 } };
const B = { tail: { dx: -2.3, dy: 1.0, r: 3.38, s: 0.984 }, head: { dx: 1.5, dy: -29.8, r: 0.49, s: 1 }, wing: { dx: -4.0, dy: -32, r: -2.0, s: 1.01 }, body: { dx: 5.7, dy: -22.1, r: 1.26, s: 1.037 }, feet: { dx: -2.4, dy: -10.3, r: 0.7, s: 0.994 }, nub: { dx: 49, dy: -52, r: -10.6, s: 1.06 } };
const SETTLE = {
  888: { tail: { dx: -1.4, dy: -0.9, r: 1.81, s: 0.999 }, head: { dx: 0.8, dy: -21.7, r: 0.33, s: 1 }, wing: { dx: -2.5, dy: -28, r: -1.53, s: 1.014 }, body: { dx: 4, dy: -15.3, r: 1.27, s: 1.027 }, feet: { dx: -1.5, dy: -7.1, r: 0.47, s: 0.995 }, nub: { dx: 35.8, dy: -38, r: -7.7, s: 1.044 } },
  889: { tail: { dx: -0.1, dy: -1.8, r: 0.68, s: 1.014 }, head: { dx: 0.3, dy: -12.5, r: 0.16, s: 1 }, wing: { dx: -1.5, dy: -11, r: -0.73, s: 1.009 }, body: { dx: 2, dy: -9.4, r: 0.47, s: 1.013 }, feet: { dx: -0.9, dy: -3.7, r: 0.32, s: 0.996 }, nub: { dx: 5, dy: -6, r: -1.2, s: 1.01 } },
};
const DRIFT_D = { 901: 0, 902: 0, 903: 1.3, 904: 1.5, 905: 0.6, 906: -0.1, 907: -2.4, 908: -2.4, 909: -10.0, 910: -10.1, 911: -3.8 };
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
    const w = WING_D[fi] || [0, 0, 0], hy = DRIFT_DY[fi] || [0, 0];
    st.T = { ...st.T, head: { dx: DRIFT_D[fi] ?? 0, dy: hy[0], r: hy[1], s: 1 }, wing: { dx: w[0], dy: w[1], r: w[2], s: 1 }, tail: TAIL_D[fi] || T0 };
    if (fi === 912) { st.head = "headE"; st.T.head = T0; }
  } else {
    const h = END_HEAD[fi] || [0, 0], w = END_WING[fi] || [0, 0, 0];
    st.T = { ...st.T, head: { dx: h[0], dy: h[1], r: 0, s: 1 }, wing: { dx: w[0], dy: w[1], r: w[2], s: 1 } };
  }
  // the per-frame affine placements measured by ECC on the source (./s13/placeC.js) replace the rig's numbers wherever
  // the fit was good; the held frames 891-898 stay exactly on the reference drawing
  const P = !(fi >= 891 && fi <= 898) ? PLACE[fi] : null;
  if (P) {
    for (const k of ["wing", "body", "tail", "feet", "nub"]) if (P[k] && !(k === "nub" && st.far !== "nub")) st.T[k] = { m: P[k] };
    const hk = st.head === "headF" ? "headF" : st.head === "head" ? "head" : null;
    if (hk && P[hk]) st.T.head = { m: P[hk] };
  }
  if (st.far === "nub" && !(P && P.nub) && NUB_SHIFT[fi]) st.T.nub = { dx: NUB_SHIFT[fi][0], dy: NUB_SHIFT[fi][1], r: 0, s: 1 };
  // (fix 2) the feet barely move on the source from 890 to 922 (phase correlation against 894: within 0.3 px); the
  // per-frame fits made them crawl 0.2-0.5 px: hold them on the reference drawing plus the source's own small offsets
  if (fi >= 890 && fi <= 922) { const o = FEET_SRC[fi] || [0, 0]; st.T.feet = { dx: o[0], dy: o[1], r: 0, s: 1 }; }
  // (fix 2) 885: the source's head holds (0.17 px from 884), the fit moved it 0.6 px: keep 884's placement
  if (fi === 885) st.T.head = PLACE[884] && PLACE[884].head ? { m: PLACE[884].head } : A.head;
  if (fi === 890) st.T.body = T0;
  return st;
}
// the source's feet offsets against 894 (phase correlation, px), where above ~0.1 px
const FEET_SRC = { 899: [-0.16, -0.02], 900: [-0.19, -0.05], 903: [0.09, 0.07], 904: [0.11, 0.09], 905: [0.08, 0.08], 909: [-0.27, -0.12], 910: [-0.28, -0.06], 911: [-0.1, 0], 913: [0.07, 0.17], 914: [0.08, 0.15], 915: [0.04, 0.11] };
// sub-pixel registration (w3, measured): layers drawn from the measured outlines (pixel-index coordinates) land about
// half a pixel right of and below the source
const SUBPX = { head: [-0.45, -0.5], headF: [-0.45, -0.5], headE: [-0.45, -0.5], feet: [-0.5, -0.5], nub: [-0.5, -0.55] };
// (w3) per-frame residual placement, measured (dx, dy[, degrees about (1250, 650)]); the hold 891-898 gets one constant
const HOLD = { wing: [-0.344, -0.344], tail: [-0.25, -0.281], body: [0.22, -0.189, 0.056] };
const FIX = {
  884: { wing: [0.0, -0.25], tail: [-0.5, -0.5], feet: [0.0, -0.25], body: [0.12, -0.3, -0.006] },
  885: { tail: [-0.5, -0.5], body: [0.13, -0.39, 0.007] },
  886: { wing: [0.5, 0.75], tail: [-0.25, 0.25], body: [0.37, -0.51, 0.166] },
  887: { wing: [0.25, 0.5], tail: [-0.25, 0.25], body: [0.37, -0.51, 0.166] },
  888: { wing: [-0.25, 0.5], tail: [0.0, 0.5], body: [0.36, -0.37, 0.152] },
  889: { wing: [-0.25, 0.25], tail: [0.0, 0.5], feet: [0.0, -0.25], body: [0.29, -0.47, 0.14] },
  890: { wing: [-0.5, -0.5], tail: [-0.5, -0.5], feet: [-0.25, 0.0], body: [0.06, -0.57, 0.084] },
  891: HOLD, 892: HOLD, 893: HOLD, 894: HOLD, 895: HOLD, 896: HOLD, 897: HOLD, 898: HOLD,
  899: { wing: [-0.5, -0.5], tail: [-0.5, -0.25], feet: [-0.25, 0.0], body: [0.51, -1.12, 0.191] },
  900: { wing: [-0.5, -0.5], tail: [-0.75, -0.5], feet: [-0.25, -0.25], body: [0.32, -1.17, 0.185] },
  901: { wing: [-0.5, -0.25], tail: [-0.75, -1.0], feet: [-0.25, 0.0], body: [-0.09, -0.26, 0.048] },
  902: { wing: [-0.5, -0.25], tail: [-0.75, -1.0], feet: [-0.25, -0.25], body: [-0.25, -0.63, 0.083] },
  903: { wing: [-0.5, -0.25], tail: [-0.75, -0.75], feet: [-0.25, 0.25], body: [0.05, -0.23, 0.067] },
  904: { wing: [-0.5, -0.25], tail: [-0.75, -0.75], feet: [-0.25, 0.0], body: [-0.19, -0.44, 0.081] },
  905: { wing: [-0.25, -0.25], tail: [-0.75, -0.75], feet: [-0.25, 0.25], body: [0.37, -0.06, 0.075] },
  906: { wing: [-0.5, -0.25], tail: [-0.5, -0.5], feet: [-0.25, 0.25], body: [0.23, -0.15, 0.056] },
  907: { wing: [-0.5, -0.25], tail: [-0.75, -1.0], feet: [-0.25, 0.25], body: [0.26, -0.03, 0.02] },
  908: { wing: [-0.5, -0.25], tail: [-0.75, -0.75], feet: [-0.25, 0.0], body: [0.34, -0.05, 0.034] },
  909: { wing: [-0.5, -0.5], tail: [-0.5, -0.75], feet: [-1.0, 0.0] },
  910: { wing: [-0.75, -0.75], tail: [-0.5, -0.75], feet: [-0.25, 0.0] },
  911: { wing: [-0.75, -0.75], tail: [-0.5, -0.75], feet: [-0.5, -0.25], body: [0.01, -0.21, 0.016] },
  912: { wing: [-0.75, -0.75], tail: [-0.75, -0.75], feet: [-0.5, 0.25], body: [0.08, -0.37, 0.114] },
  913: { wing: [-0.5, -0.25], tail: [0.0, 0.25], feet: [0.25, 0.25], body: [0.2, -0.87, 0.192] },
  914: { wing: [-0.5, -0.25], tail: [0.0, 0.25], feet: [-0.25, 0.0], body: [0.13, -0.79, 0.183] },
  915: { wing: [-0.25, -0.25], tail: [0.0, 0.25], feet: [-0.25, 0.25], body: [0.24, -0.57, 0.164] },
  916: { wing: [-0.75, -0.5], feet: [-0.75, 0.0], body: [0.18, -0.64, 0.168] },
  917: { wing: [-0.25, -0.25], tail: [-0.25, -0.25], body: [0.23, -0.54, 0.141] },
  918: { wing: [-0.5, -0.5], tail: [-0.25, -0.5], feet: [-0.25, 0.0], body: [0.12, -0.65, 0.17] },
  919: { wing: [-0.75, -0.75], tail: [-0.5, -0.75], feet: [-0.25, 0.25], body: [0.02, -0.57, 0.121] },
  920: { wing: [-0.75, -0.75], tail: [-0.5, -0.75], feet: [0.5, 0.0], body: [0.08, -0.55, 0.112] },
  921: { wing: [-0.75, -0.75], tail: [-0.25, -0.5], feet: [0.25, 0.25], body: [-0.04, -0.57, 0.124] },
  922: { wing: [-0.75, -0.75], tail: [-0.5, -0.75], feet: [-0.25, 0.25], body: [-0.01, -0.69, 0.161] },
};
const BODY_CUT_D = [[898, 464], [909, 466], [919, 480], [921, 488], [898, 488]];
// (review) in the turn frames 899-900 the source redraws the lower-left belly contour 3-5 px inward: the body's
// measured outline along that arc (x 1000-1300, y 600-870) is cut back 1.5 px there (4 px overshot: lit-mask mismatch 915 -> 130 render-only but 208 -> 2520 source-only)
let BELLY_CUT = null;
// (fix 2) on at 3 px for the two turn frames (review: the visible lit band matters more than a small sigma-8 cost)
const BELLY_ON = true;
function bellyInset() {
  if (BELLY_CUT) return BELLY_CUT;
  const r = SILC.body[0], pts = [];
  for (let i = 0; i < r.length; i += 2) if (r[i] >= 1110 && r[i] <= 1305 && r[i + 1] >= 740 && r[i + 1] <= 875) pts.push([r[i], r[i + 1]]);
  pts.sort((a, b) => a[0] - b[0]);
  const q = sampleCurve(pts.filter((p, i) => i % 3 === 0), 4);
  // (fix 2) the arc runs left -> right down the lower-left edge, so offsetLine(+) is OUTSIDE the body: the cut runs from
  // 3 px inside (-3) to 24 px outside (1b had both offsets outside, so its inset never cut anything)
  const inner = offsetLine(q, -1.5), outer = offsetLine(q, 24);
  // (the offset side is chosen so that "inner" lies inside the body: the arc runs left to right along the lower-left edge)
  BELLY_CUT = [...inner, ...outer.reverse()];
  return BELLY_CUT;
}
// (fix 2) in D the far-wing nub sits ~10 px lower and 3-7 px further left than in C (tops at x 828-842: 297/296/293 vs
// 287/285/283; bottoms ~11 px lower; left edge at y 340: 816 vs 822)
const NUB_SHIFT = { 899: [-7, 5], 900: [-7, 5], 901: [-4, 10], 902: [-4, 10], 903: [-4, 10], 904: [-4, 10], 905: [-4, 10], 906: [-4, 10], 907: [-4, 10], 908: [-4, 10], 909: [-8, 11], 910: [-8, 11], 911: [-5, 8], 913: [5, -2], 914: [4, -1], 915: [4, -1] };
let fixFor = null;
// (fix 2) pose A (884-885): the source spreads the primaries ~9 px lower (and ~2 px right) than the C wing moved by
// the frame's affine (lit edge (1780, 650) .. (2040, 790) source-only by 6-10 px). The wing is drawn as a linear blend
// of itself and a shifted copy, the copy's weight ramping from 0 to 1 across x 1720 -> 1800 and y 540 -> 600 (screen),
// so the hatching bends instead of breaking at a seam.
const A_PRIM = { shift: [-2, 10], x: [1720, 1800], y: [540, 600] };
let WARP = null;
function blitWarp(ctx, key, T, W) {
  if (!WARP) { WARP = { a: document.createElement("canvas"), b: document.createElement("canvas") }; for (const c of [WARP.a, WARP.b]) { c.width = 2206; c.height = 946; } }
  const ga = WARP.a.getContext("2d"), gb = WARP.b.getContext("2d");
  for (const [g, sh, inv] of [[ga, [0, 0], true], [gb, W.shift, false]]) {
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.clearRect(0, 0, 2206, 946);
    g.save(); g.translate(sh[0], sh[1]); blit(g, key, T); g.restore();
    // weight a(x, y) = smooth(x) * smooth(y): the base keeps 1 - a, the shifted copy a (two passes of destination-in)
    g.globalCompositeOperation = "destination-in";
    const gx = g.createLinearGradient(W.x[0], 0, W.x[1], 0), gy = g.createLinearGradient(0, W.y[0], 0, W.y[1]);
    if (inv) {
      // 1 - a = 1 - ax * ay: drawn as a mask canvas (union of "left of the x ramp" and "above the y ramp")
      const m = WARP.m || (WARP.m = Object.assign(document.createElement("canvas"), { width: 2206, height: 946 })), mg = m.getContext("2d");
      mg.setTransform(1, 0, 0, 1, 0, 0); mg.globalCompositeOperation = "source-over"; mg.clearRect(0, 0, 2206, 946);
      gx.addColorStop(0, "rgba(0,0,0,1)"); gx.addColorStop(1, "rgba(0,0,0,1)"); mg.fillStyle = "#000"; mg.fillRect(0, 0, 2206, 946);
      mg.globalCompositeOperation = "destination-out";
      const hx = mg.createLinearGradient(W.x[0], 0, W.x[1], 0); hx.addColorStop(0, "rgba(0,0,0,0)"); hx.addColorStop(1, "rgba(0,0,0,1)");
      mg.fillStyle = hx; mg.fillRect(0, 0, 2206, 946);
      // (the x ramp removed alpha on the right everywhere; restore it above the y ramp)
      mg.globalCompositeOperation = "source-over";
      const hy = mg.createLinearGradient(0, W.y[0], 0, W.y[1]); hy.addColorStop(0, "rgba(0,0,0,1)"); hy.addColorStop(1, "rgba(0,0,0,0)");
      mg.fillStyle = hy; mg.fillRect(0, 0, 2206, 946);
      g.drawImage(m, 0, 0);
    } else {
      gx.addColorStop(0, "rgba(0,0,0,0)"); gx.addColorStop(1, "rgba(0,0,0,1)"); g.fillStyle = gx; g.fillRect(0, 0, 2206, 946);
      gy.addColorStop(0, "rgba(0,0,0,0)"); gy.addColorStop(1, "rgba(0,0,0,1)"); g.fillStyle = gy; g.fillRect(0, 0, 2206, 946);
    }
    g.globalCompositeOperation = "source-over";
  }
  // the two weighted copies summed (premultiplied add), then laid over the frame
  ga.globalCompositeOperation = "lighter"; ga.drawImage(WARP.b, 0, 0); ga.globalCompositeOperation = "source-over";
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(WARP.a, 0, 0); ctx.restore();
}
function blit(ctx, key, T, cenKey = key, clipOut = null) {
  const L = layer(key), c = CEN[cenKey];
  ctx.save();
  if (clipOut) { ctx.beginPath(); ctx.rect(0, 0, 2206, 946); ctx.moveTo(clipOut[0][0], clipOut[0][1]); for (const q of clipOut.slice(1)) ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.clip("evenodd"); }
  const sp = SUBPX[key]; if (sp) ctx.translate(sp[0], sp[1]);
  const fx = fixFor && fixFor[key];
  if (fx) { ctx.translate(fx[0], fx[1]); if (fx[2]) { ctx.translate(1250, 650); ctx.rotate((fx[2] * Math.PI) / 180); ctx.translate(-1250, -650); } }
  if (T.m) ctx.transform(T.m[0], T.m[3], T.m[1], T.m[4], T.m[2], T.m[5]);
  else { ctx.translate(c[0] + T.dx, c[1] + T.dy); ctx.rotate((T.r * Math.PI) / 180); ctx.scale(T.s, T.s); ctx.translate(-c[0], -c[1]); }
  ctx.drawImage(L.canvas, L.x, L.y);
  ctx.restore();
}

// the grade's halation for this shot (fix pass 1: trimmed from the default 0.5; 1b: lower still, with the in-shot glow)
const HALO = 0.42;
export const shot = {
  // the halation trimmed from the default 0.5 (fix pass 1: the glow 30-100 px outside the silhouette measured high)
  grade: () => ({ halo: HALO }),
  draw(ctx, local, t) {
    const fi = Math.floor(t * 25 + 1e-3);   // the 25 fps frame on screen at t (correct at any sampling rate)
    const st = state(fi);
    fixFor = FIX[fi] || null;
    // (fix 2) held parts take no per-frame residual: the feet from 890 on, the body at 890 (as in the hold), the head at 885
    if (fixFor && fi >= 890 && fi <= 922) fixFor = { ...fixFor, feet: undefined, ...(fi === 890 ? { body: HOLD.body } : {}) };
    blit(ctx, st.far, st.far === "nub" ? st.T.nub : T0);
    blit(ctx, "tail", st.T.tail);
    blit(ctx, "body", st.T.body, "body", st.head === "headF" ? BODY_CUT_D : (fi === 899 || fi === 900) && BELLY_ON ? bellyInset() : null);
    if (fi === 884 || fi === 885) blitWarp(ctx, "wing", st.T.wing, A_PRIM); else blit(ctx, "wing", st.T.wing);
    blit(ctx, "feet", st.T.feet);
    blit(ctx, st.head, st.T.head);
  },
  release() { cache = null; WARP = null; },
};
