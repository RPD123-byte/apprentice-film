// s06 (26.72–29.04): front view across the laptop lid. The designer, heavy-lidded and sweating, rests his cheek on the
// fist holding a pencil; the owl in headphones sits on his right shoulder (frame right) and looks at him.
//
// Measured on the source (camera locked off: camtrack s = 1.0000, drift < 0.2 px; cuts on frames 668 and 726).
// Every layer is an r3 layer measured by s06/trace3/ (see its README): a soft ground of nested value outlines, solid
// darks and calibrated pen strokes, stored as numbers in data/r3_*.js — no source pixels are stored or loaded.
// States: the neutral mean (26.76–27.04), the held smile (28.44–28.96) for the face, brows and mouth; the owl still
// before (26.76–27.04) and after (28.56–29.00) its blink, and its head measured on each blink frame (28.04–28.52).
// What moves:
//   - the mouth eases into a small smile 27.08 -> 28.40: its line is fitted on every source frame (data/mouth.js), with
//     the lip comb re-attached to it; the brow and mouth patches move with the optical flow of each frame
//     (data/flow.js); the lower face morphs from its neutral to its smile drawing (each warped toward the other by the
//     measured smile field, data/lift.js FACE, while one dissolves into the other); the right hair locks, the neck
//     under the jaw and the fist lift with the smile (data/lift.js R, F), and the hair over the right brow's end
//     follows the flow (Z2);
//   - the owl blinks 28.04–28.52 (lids lower, shut 28.20–28.36, half 28.40–28.48, open 28.52) while its head rolls up
//     to ~2 deg: each of those frames draws that frame's own measured head over the still body, and the still owl's
//     right earcup moved with the head's measured rigid motion.
// Caches: `under` (room, hoodie, neutral face), `faceS` (the smile face, box-sized), `over` (nape, hair, beanie, fist,
// pencil, laptop) and `overS` (the same with the lifting parts cut out), the still owls. Per frame: under (+ face morph)
// -> neutral brows + mouth (flow) -> [smile face (morphed) + brows + mouth, faded in] -> mouth line + comb -> lid seam
// band -> brow end / hair strand -> over (+ lift) -> laptop rim -> owl (+ blink head, earcup, catchlights) -> exposure.
// Fix pass 1 (2026-09-26) added the parts marked "fix pass 1" below; see fidelity/s06.md.
import { W, H } from "../config.js";
import { mk } from "./s06/kit.js";
import { taper } from "../lib/ink.js";
import { sampleCurve } from "../lib/paths.js";
import { drawMouthLayer, drawMouthTop, flowMap, flowMapRel } from "./s06/motion3.js";
import { drawR3, release3, decodeR3 } from "./s06/face3.js";
import { L as R3FACE } from "./s06/data/r3_face.js";
import { L as R3FACE_S } from "./s06/data/r3_face_s.js";
import { L as R3BROW } from "./s06/data/r3_brow.js";
import { L as R3BROW_S } from "./s06/data/r3_brow_s.js";
import { L as R3MOUTH } from "./s06/data/r3_mouth.js";
import { L as R3MOUTH_S } from "./s06/data/r3_mouth_s.js";
import { L as R3HAIR } from "./s06/data/r3_hair.js";
import { L as R3BEANIE } from "./s06/data/r3_beanie.js";
import { L as R3HAND } from "./s06/data/r3_hand.js";
import { L as R3BODY } from "./s06/data/r3_body.js";
import { L as R3NAPE } from "./s06/data/r3_nape.js";
import { L as R3PENCIL } from "./s06/data/r3_pencil.js";
import { L as R3LAPTOP } from "./s06/data/r3_laptop.js";
import { L as R3ROOM } from "./s06/data/r3_room.js";
import { L as R3OWL } from "./s06/data/r3_owl.js";
import { L as R3OWL_POST } from "./s06/data/r3_owl_post.js";
import { BLINK3 } from "./s06/owl3.js";
import { LIFT } from "./s06/data/lift.js";
import { EXPO } from "./s06/data/expo.js";
import { meshWarp, cellsLive, zoneOf, drawZone } from "./s06/warp.js";
import { releaseScratch } from "./s06/ink.js";
import { edges, holePatch, zoneA, hairPatchA, strandsA, hk, MODE, edgeBand, drawEdgeBand, notchR, inkHair, cupRim, footCrease, rimLow, wristLine, lidRows, darkCast, owlTintBuild, owlTint, beads } from "./s06/fix2.js";

const interp = (tab, t) => {
  if (t <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) if (t <= tab[i][0]) { const a = tab[i - 1], b = tab[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); }
  return tab[tab.length - 1][1];
};
// smile amount (right mouth corner, y 693 -> 657 px) per source frame, normalised
const SMILE = [[26.72, 0], [27.06, 0], [27.12, 0.06], [27.2, 0.17], [27.28, 0.25], [27.36, 0.36], [27.44, 0.44], [27.52, 0.55], [27.6, 0.64], [27.68, 0.7], [27.76, 0.78], [27.84, 0.83], [27.92, 0.89], [28.0, 0.92], [28.08, 0.97], [28.16, 1], [29.1, 1]];
// each time shows the source frame on screen at that time (frame floor(t * 25); t = n / 25 in the film render)
const frameT = (t) => Math.floor(t * 25 + 1e-3) / 25;

// every measured coordinate is a pixel-centre (numpy) coordinate: canvas pixel i covers [i, i+1], so the data is
// drawn half a pixel down-right to land on the source's pixels
const HALF = 0.5;
// the box of the face layers (the smile state is drawn into a canvas of this size)
const FB = R3FACE_S.box, FBW = FB[2] - FB[0], FBH = FB[3] - FB[1];

// The hair layer's small island at the left brow's inner end (hair clipRings[1], x 837-853, y 202-219) is the brow's
// own dark end, caught by the round-2 hair outline: static in `over`, it stayed behind as a black comma when the brow
// rose with the smile (fix pass 1). It is drawn as part of the neutral brow instead: moved by the brow flow, faded out
// with the smile (the smile brow carries its own inner end).
const ISLE = 1, IB = [826, 192, 864, 230], IC = [845, 210];
// Once the brow has risen, the dark hair strand that crossed the island shows again (measured on the held smile,
// frames 712-725: centre (822,238) -> (836,222) -> (843,212) -> (853,200), about 4 px wide, as dark as the strand below
// it): a hand-set tapered stroke, faded in with the smile.
const STRAND_S = [[834.5, 225], [838, 220], [841.5, 215], [844.5, 211], [847.5, 207], [850.5, 203], [853.5, 199]];
const STRAND_V = 0.05, STRAND_W = 4.2;
const hairWithout = (L, j) => { decodeR3(L); return { ...L, clipRings: L.clipRings.filter((_, i) => i !== j) }; };
const hairOnly = (L, j) => { decodeR3(L); return { ...L, clipRings: [L.clipRings[j]] }; };

// Traced items dropped (fix pass 1, measured): five wide (up to 9 px) "pale on dark" strokes on the laptop lid's rim
// (y 825-834) were fitted darker (tone 0.27-0.42) than the bright bevel they sit on, and read as a chain of grey blobs
// across the rim at x 1229-1246, 1355-1473 and 357-375.
const PRUNE = [[R3LAPTOP, { light: [13, 54, 63, 66, 69] }]];
function prune(L, P) {
  decodeR3(L);
  if (L.__pruned) return;
  for (const key of ["ink", "light"]) if (P[key]) { const drop = new Set(P[key]); L[key] = L[key].filter((_, i) => !drop.has(i)); }
  L.__pruned = true;
}

let cache = null;
function build() {
  if (cache) return cache;
  for (const [Lr, P] of PRUNE) prune(Lr, P);
  const [under, g] = mk(W, H);
  g.translate(HALF, HALF);
  drawR3(g, R3ROOM);
  if (!(globalThis.__S06X || {}).noBeads) { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); beads(g); g.restore(); }   // fix pass 2
  drawR3(g, R3BODY);
  drawR3(g, R3FACE);
  const [faceS, s] = mk(FBW, FBH);
  s.translate(HALF - FB[0], HALF - FB[1]);
  drawR3(s, R3FACE_S);
  const [over, o] = mk(W, H);
  o.translate(HALF, HALF);
  drawR3(o, R3NAPE);
  drawR3(o, hairWithout(R3HAIR, ISLE));
  drawR3(o, R3BEANIE);
  drawR3(o, R3HAND);
  drawR3(o, R3PENCIL);
  drawR3(o, R3LAPTOP);
  // fix pass 2: the hair and beanie ink deepened and sharpened inside their own coverage (s06/fix2.js inkHair)
  { const X = globalThis.__S06X || {};
    const [hc, hg] = mk(W, H), [ac, ag] = mk(W, H), [bc, bg] = mk(W, H), [cc, cg] = mk(W, H);
    hg.translate(HALF, HALF); drawR3(hg, R3NAPE); drawR3(hg, hairWithout(R3HAIR, ISLE));
    ag.translate(HALF, HALF); drawR3(ag, R3BEANIE); drawR3(ag, R3HAND); drawR3(ag, R3PENCIL); drawR3(ag, R3LAPTOP);
    inkHair(over, hc, ac, { DK: X.hD ?? 0.8, SA: X.hS ?? 0.3, SR: X.hR ?? 0.8, skip: X.hSkip ?? [940, 280, 1110, 420, 12] });
    bg.translate(HALF, HALF); drawR3(bg, R3BEANIE);
    cg.translate(HALF, HALF); drawR3(cg, R3HAND); drawR3(cg, R3PENCIL); drawR3(cg, R3LAPTOP);
    inkHair(over, bc, cc, { DK: X.bD ?? 1, SA: X.bS ?? 0, SR: X.hR ?? 1.5, T0: X.bT0 ?? 0.1, T1: X.bT1 ?? 0.25 }); }
  // fix pass 2: the wrist and fist's outer contour, darker, on the source's line (lifts with the fist)
  if (!(globalThis.__S06X || {}).noWrist) wristLine(o);
  // fix pass 2: the source's blacks are green (s06/fix2.js darkCast)
  darkCast([under, over], [R3FACE.clip, R3HAND.clip]);
  const [mix, m] = mk(FBW, FBH);
  // the hair island (brow end), box-sized: IB = its box in frame px
  const [isle, ig] = mk(IB[2] - IB[0], IB[3] - IB[1]);
  ig.translate(HALF - IB[0], HALF - IB[1]); drawR3(ig, hairOnly(R3HAIR, ISLE));
  // `over` with the two lift boxes cleared: the right hair locks and neck (LIFT.R) and the fist (LIFT.F) are drawn
  // through the measured smile lift instead (see draw)
  const [overS, os] = mk(W, H);
  os.drawImage(over, 0, 0);
  const zones = [LIFT.Z2];
  const zc = zones.map((F) => zoneOf(over, F));
  for (const F of [LIFT.R, LIFT.F]) os.clearRect(F.box[0], F.box[1], (F.nx - 1) * F.step, (F.ny - 1) * F.step);
  for (const F of zones) os.clearRect(F.box[0], F.box[1], (F.nx - 1) * F.step + 1, (F.ny - 1) * F.step + 1);
  const live = [cellsLive(over, LIFT.R), cellsLive(over, LIFT.F)];
  // the smile face with the morph box cleared (the box is drawn through the morph while the smile fades in)
  const FF = LIFT.FACE, [faceSS, fs] = mk(FBW, FBH);
  fs.drawImage(faceS, 0, 0); fs.clearRect(FF.box[0] - FB[0], FF.box[1] - FB[1], (FF.nx - 1) * FF.step, (FF.ny - 1) * FF.step);
  const liveS = cellsLive(faceS, FF, 8, FB);
  cache = { under, faceS, faceSS, liveS, over, overS, live, zones, zc, expoM: expoMask(), expoS: mk(W, H), mix, m, isle, lidA: mk(160, 40), lidB: mk(160, 40) };
  // fix pass 2: the hair's enclosed holes above the left brow show the neutral drawing (under + the neutral brow, still)
  { const [nb, ng] = mk(W, H); ng.drawImage(under, 0, 0); ng.save(); ng.translate(HALF, HALF); drawR3(ng, R3BROW); ng.restore();
    cache.hole = holePatch(over, nb); }
  cache.za = zoneA(under, cache.hole, over);
  cache.eb = edgeBand(over);
  // the owl, still before and after its blink (box-sized)
  for (const [k, Lr] of [["owlPre", R3OWL], ["owlPost", R3OWL_POST]]) {
    const b = Lr.box, [c, og] = mk(b[2] - b[0], b[3] - b[1]);
    og.translate(HALF - b[0], HALF - b[1]); drawR3(og, Lr); cache[k] = [c, b[0], b[1]];
  }
  cache.owlT = owlTintBuild(cache.owlPre);
  return cache;
}

// The owl layer's clip ends on the hoodie under its feet (x 1550-1800, y 585-622), where the hoodie layer was filled
// in pale under the owl's region: the anti-aliased clip edge let that pale fill through as a thin white arc. Under the
// bottom edge the owl's own drawing is laid down again, shifted 1-2 px down, so the edge pixels mix with its own
// hatching (fix pass 1).
const SEAM = [1545, 580, 1810, 630];
function owlSeam(ctx, oc, ox, oy) {
  ctx.save();
  ctx.beginPath(); ctx.rect(SEAM[0], SEAM[1], SEAM[2] - SEAM[0], SEAM[3] - SEAM[1]); ctx.clip();
  for (const d of [2, 1]) ctx.drawImage(oc, ox, oy + d);
  ctx.restore();
}

// The upper lids: the lid hatching is split between the brow layer (inside the brow region, which the tracer cut off
// with straight rows: y 284 on the left, 278 on the right) and the face layer below it, so a straight pale row (+10-17)
// with a dark one under it ran across both lids. The seam band is softened with a vertical 5-tap blur, feathered in
// over 3 rows at each end (fix pass 1; measured row profiles in fidelity/s06.md).
const LIDS = [[806, 945, 284.5], [1124, 1188, 278.5]];   // x0, x1, seam row
const LID_H = 6;   // half-height of the band
function lidSeams(ctx, L) {
  const hh = LID_H;
  for (const [x0, x1, yc] of LIDS) {
    const y0 = Math.floor(yc - hh), h = 2 * hh + 1, w = x1 - x0;
    const [c, g] = L.lidA, [b, q] = L.lidB;
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "copy";
    g.drawImage(ctx.canvas, x0, y0 - 2, w, h + 4, 0, 0, w, h + 4);
    // 5-tap vertical box blur (successive src-over at 1/2, 1/3, 1/4, 1/5 = equal weights)
    q.setTransform(1, 0, 0, 1, 0, 0); q.globalCompositeOperation = "copy"; q.globalAlpha = 1;
    q.drawImage(c, 0, 0, w, h, 0, 0, w, h);                                         // rows y0-2 ..
    q.globalCompositeOperation = "source-over";
    [[1, 1 / 2], [2, 1 / 3], [3, 1 / 4], [4, 1 / 5]].forEach(([d, a]) => { q.globalAlpha = a; q.drawImage(c, 0, d, w, h, 0, 0, w, h); });
    // feather: full strength on the middle rows, fading to 0 at the band's ends
    q.globalAlpha = 1; q.globalCompositeOperation = "destination-in";
    const gr = q.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.3, "rgba(0,0,0,1)"); gr.addColorStop(0.7, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    q.fillStyle = gr; q.fillRect(0, 0, w, h);
    q.globalCompositeOperation = "source-over";
    ctx.drawImage(b, 0, 0, w, h, x0, y0, w, h);
  }
}

// The still owl switches from its pre- to its post-blink drawing on the first shut-eye frame (28.20), where the blink
// hides the change (at 28.56 it popped: owl frame-to-frame change 2.3 against the source's 2.0; now 2.1) (fix pass 1).
const OWL_SWITCH = 28.2;

// The right earcup during the blink (28.04-28.52): each blink frame's measured head drew the cup's cushion with a
// straight, soft left edge that stepped against the pattern. The cup is rigid, so it is taken from the still owl and
// moved with the head: a Euclidean transform per frame (canvas [a, b, c, d, e, f], still owl -> frame, up to 2.1 deg),
// measured on the source by ECC on the cup (x 1770-1870, y 240-395) against the pre-blink mean (frames 690-700).
// EARCUP is the cup outline on the still owl, its left side 1.5 px inside the cushion's dark rim so the join falls on
// dark (fix pass 1).
const EAR_W = {
  "28.04": [0.99999, 0.00474, -0.00474, 0.99999, 2.09, -7.67],
  "28.08": [0.99993, 0.01164, -0.01164, 0.99993, 5.17, -18.82],
  "28.12": [0.99993, 0.0114, -0.0114, 0.99993, 5.02, -18.3],
  "28.16": [0.99974, 0.0227, -0.0227, 0.99974, 9.91, -37.16],
  "28.20": [0.99936, 0.03572, -0.03572, 0.99936, 15.86, -58.11],
  "28.24": [0.9993, 0.03733, -0.03733, 0.9993, 16.89, -60.45],
  "28.28": [0.99932, 0.03694, -0.03694, 0.99932, 16.76, -59.69],
  "28.32": [0.99946, 0.03288, -0.03288, 0.99946, 14.62, -53.36],
  "28.36": [0.99965, 0.02658, -0.02658, 0.99965, 11.69, -43.23],
  "28.40": [0.99986, 0.01697, -0.01697, 0.99986, 7.4, -27.67],
  "28.44": [0.99986, 0.01675, -0.01675, 0.99986, 7.31, -27.29],
  "28.48": [0.99993, 0.01184, -0.01184, 0.99993, 5.19, -19.34],
  "28.52": [0.99999, 0.00344, -0.00344, 0.99999, 1.29, -5.9],
};
// Its right side hugs the cup shell (x 1840-1842 over y 274-340, measured on the still owl): with the dark background
// beside the cup up to x 1862 inside it, the moved cup (up to +4.4 px) covered the pale shelf line at x 1852-1854 on
// frames 704-709 (fix pass 2).
const EARCUP = [[1786, 256], [1786, 286], [1787, 300], [1788, 316], [1789, 332], [1790, 348], [1790.5, 366], [1793.5, 373],
  [1800, 379], [1846, 379], [1847, 320], [1846, 256]];

// The laptop lid's machined rim, x 300-1860 (measured on the source): the traced lid draws its dark top edge too light
// and too thin on its lower side (+7-14 at the core, +20-40 one row below), so a crisp stroke follows it, centred
// 0.4 px below the source's darkest rows (813.8 at the left -> 814.7 at the right) (fix pass 1).
const RIM_D = [[300, 814.2], [560, 814.3], [820, 814.9], [1080, 815.0], [1340, 815.2], [1600, 815.1], [1860, 815.1]];
function rim(ctx) {
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.globalAlpha = 0.5; ctx.strokeStyle = "rgb(10,10,10)"; ctx.lineWidth = 2;
  ctx.beginPath(); RIM_D.forEach(([x, y], i) => (i ? ctx.lineTo(x + HALF, y + HALF) : ctx.moveTo(x + HALF, y + HALF))); ctx.stroke();
  ctx.restore();
}

// The owl's small lower catchlights are crisp white dots in the source (peak 229-248 on the iris's 70-110); the traced
// owl has them soft and grey (peak ~200). Crisp discs on the still owl, measured on the pre- and post-blink means
// (centres in pixel-centre coords, about 5 x 4 px) (fix pass 1).
const CATCH = [[1627.2, 359.3, 2.5, 2.0, 0.97], [1727.3, 361.3, 2.5, 2.0, 0.93]];
function catchlights(ctx) {
  const X = globalThis.__S06X || {};
  for (const [x, y, rx, ry, v] of CATCH) {
    // the traced dot's soft halo is laid back to iris tone (0.36, 1.4 px wider, blurred 0.6 px), then the crisp dot
    const hv = X.hv ?? 92, hw = X.hw ?? 1.4;
    ctx.save(); ctx.filter = "blur(0.6px)"; ctx.fillStyle = `rgb(${hv},${hv},${hv})`;
    ctx.beginPath(); ctx.ellipse(x + HALF, y + HALF, rx + hw, ry + hw * 0.8, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    const c = Math.round(v * 255); ctx.fillStyle = `rgb(${c},${c},${c})`;
    ctx.save(); if (X.cB) ctx.filter = `blur(${X.cB}px)`;
    ctx.beginPath(); ctx.ellipse(x + HALF, y + HALF, X.cRx ?? rx * 0.85, X.cRy ?? ry * 0.85, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
}

// Exposure and colour, per source frame (fix pass 1): the source's own flicker and its faint warm-green cast (B about
// 2.6 levels under G and R) differ from the shared grade's; the gains [r, g, b] (pre-grade, <= 1) are measured on the
// static parts of the frame (the face left out) by least squares against the source and refined over two passes
// (snapshots/s06-fix1-tools/expo.py -> data/expo.js). Applied as a multiply at a small alpha, so the gain resolution is
// finer than 1/255; on the face and fist (already close in level) at EXPO_FACE of the strength, feathered 24 px
// (0.2 measured best of 0, 0.2, 0.4, 1: the eyes darken with more).
const EXPO_FACE = 0.2;
function expoMask() {
  const [c, g] = mk(W, H);
  g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "destination-out"; g.filter = "blur(24px)"; g.fillStyle = `rgba(0,0,0,${1 - EXPO_FACE})`;
  for (const P of [R3FACE.clip, R3HAND.clip]) { g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); }
  return c;
}
function exposure(ctx, tf, L) {
  const e = EXPO[Math.round(tf * 25)]; if (!e) return;
  const lo = Math.min(e[0], e[1], e[2]); if (lo >= 0.99995) return;
  const a = Math.min(1, (1 - lo) * 4), c = e.map((p) => Math.round(255 * (1 - (1 - p) / a)));
  const [sc, sg] = L.expoS;
  sg.globalCompositeOperation = "copy"; sg.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; sg.fillRect(0, 0, W, H);
  sg.globalCompositeOperation = "destination-in"; sg.drawImage(L.expoM, 0, 0);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "multiply"; ctx.globalAlpha = a;
  ctx.drawImage(sc, 0, 0); ctx.restore();
}

export const shot = {
  draw(ctx, local, t) {
    const L = build();
    const tf = frameT(t), k = interp(SMILE, tf);
    ctx.drawImage(L.under, 0, 0);
    // the face morphs with the smile: the neutral face (in `under`) moves by k x the measured field, the smile face by
    // -(1 - k) x it, while one dissolves into the other (fix pass 1; data/lift.js FACE)
    const morph = k > 0.001;
    if (morph) meshWarp(ctx, L.under, LIFT.FACE, k);
    // the neutral brows and mouth, moved by the flow of the frame
    if (k < 0.999) {
      ctx.save(); ctx.translate(HALF, HALF);
      drawR3(ctx, R3BROW, flowMap(tf, "brows"));
      drawMouthLayer(ctx, R3MOUTH, flowMap(tf, "mouth"));
      ctx.restore();
    }
    // the smile state (face, brows, mouth measured on the held smile, moved by flow(t) - flow(smile)), faded in
    if (k > 0.001) {
      const m = L.m;
      m.setTransform(1, 0, 0, 1, 0, 0); m.globalAlpha = 1; m.clearRect(0, 0, FBW, FBH);
      if (morph && k < 0.999) {
        m.drawImage(L.faceSS, 0, 0);
        m.save(); m.translate(-FB[0], -FB[1]); meshWarp(m, L.faceS, LIFT.FACE, k - 1, L.liveS, FB); m.restore();
      } else m.drawImage(L.faceS, 0, 0);
      m.save(); m.translate(HALF - FB[0], HALF - FB[1]);
      drawR3(m, R3BROW_S, flowMapRel(tf, "brows"));
      drawMouthLayer(m, R3MOUTH_S, flowMapRel(tf, "mouth"));
      m.restore();
      ctx.save(); ctx.globalAlpha = Math.min(1, k); ctx.drawImage(L.mix, FB[0], FB[1]); ctx.restore();
    }
    ctx.save(); ctx.translate(HALF, HALF);
    drawMouthTop(ctx, tf, k);
    ctx.restore();
    lidSeams(ctx, L);
    lidRows(ctx, k);
    // the brow's dark inner end (see ISLE): with the neutral brow, moved by its flow, faded out with the smile
    if (k < 0.999) {
      const fm = flowMap(tf, "brows"), p = fm ? fm(IC) : IC;
      ctx.save(); ctx.globalAlpha = 1 - k; ctx.drawImage(L.isle, IB[0] + p[0] - IC[0], IB[1] + p[1] - IC[1]); ctx.restore();
    }
    if (k > 0.001) {
      ctx.save(); ctx.translate(HALF, HALF); ctx.globalAlpha = Math.min(1, k);
      const c = Math.round(STRAND_V * 255);
      taper(ctx, sampleCurve(STRAND_S, 4), (u) => STRAND_W * Math.min(1, 0.35 + u * 4, 0.3 + (1 - u) * 4), `rgb(${c},${c},${c})`);
      ctx.restore();
    }
    // the hair's enclosed holes above the left brow always show the dark neutral drawing (fix pass 2)
    ctx.drawImage(L.hole.canvas, L.hole.x, L.hole.y);
    // nape, hair, beanie, fist, pencil, lid; with the smile, the right locks, the neck under the jaw and the fist lift
    // by the measured field (data/lift.js) scaled by the smile amount
    if (k < 0.001) ctx.drawImage(L.over, 0, 0);
    else {
      ctx.drawImage(L.overS, 0, 0);
      meshWarp(ctx, L.over, LIFT.R, k, L.live[0]);
      meshWarp(ctx, L.over, LIFT.F, k, L.live[1]);
      // where the right brow's end runs under the hair, the hair layer's pixels follow the measured flow (its brow bits
      // rise); tried at the left brow's inner end too, it tore a pale hole at the strand and was dropped
      L.zones.forEach((F, i) => drawZone(ctx, L.zc[i], F, k));
      // the right brow's outer end under the hair strand (fix pass 2)
      notchR(ctx, k);
    }
    // the hair above the left brow's inner end changes with the smile (fix pass 2)
    { const a = hk(Math.round(tf * 25));
      if (MODE !== "strokes") hairPatchA(ctx, L.za, a);
      if (MODE !== "warp") strandsA(ctx, a); }
    if (k > 0.001 && !(globalThis.__S06X || {}).noEdge) drawEdgeBand(ctx, L.eb, L.mix, FB[0], FB[1], Math.min(1, k));
    rim(ctx);
    rimLow(ctx);
    // the owl: still (pre / post), or during the blink (28.04-28.52) the still body with that frame's own head
    const bl = BLINK3[tf.toFixed(2)];
    const [oc, ox, oy] = tf < OWL_SWITCH - 1e-3 ? L.owlPre : L.owlPost;
    owlSeam(ctx, oc, ox, oy);
    ctx.drawImage(oc, ox, oy);
    footCrease(ctx);
    if (bl) { ctx.save(); ctx.translate(HALF, HALF); drawR3(ctx, bl); ctx.restore(); }
    else { catchlights(ctx); cupRim(ctx); }
    // the right earcup during the blink: the still owl's cup moved with the head (see EAR_W)
    const eo = bl && EAR_W[tf.toFixed(2)];
    if (eo) {
      ctx.save(); ctx.transform(...eo);
      ctx.beginPath(); EARCUP.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip();
      ctx.drawImage(L.owlPre[0], L.owlPre[1], L.owlPre[2]); cupRim(ctx); ctx.restore();
    }
    owlTint(ctx, L.owlT);
    edges(ctx);
    exposure(ctx, tf, L);
  },
  release() { cache = null; releaseScratch(); release3(); },
};
