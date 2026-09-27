// s18 shot A (53.24-55.24, source frames 1331-1381): the synth corner, locked off (camtrack s = 1.0000, drift
// < 0.2 px). The plate is an ink drawing of the owl-free plate (data/roomA.js). The owl is one rigid drawing per
// wing phase (level, up, level, down on the source's 24-fps content frames) carried along PATH_A, with the legs and
// feet drawn per frame, a seeded line boil per content frame, and a horizontal motion blur while it flies in.
// Fix pass 4: from 1338 the feet are hand-drawn rigs (data/feetA.js, handdraw.js footRig) over the frame's traced key
// marks (softened, grey islands dropped); the beak and an inked outline are hand-drawn into the
// cached phase drawings; the speaker's side panel is re-engraved as fine vertical grain.
import { decodeInk, drawInk, softHalf, drawnCanvas, cpuCanvas, ringsBBox } from "./inkdraw.js";
import { softCanvas } from "./soft.js";
import { ROOM_A } from "./data/roomA.js";
import { OWL_A } from "./data/owlA.js";
import { boilMap, boilTone, contentFrame, boilVariant } from "./boil.js";
import { applyTone } from "./tone.js";
import { TONE_A } from "./data/toneA.js";
import { TONE_OWL_A } from "./data/toneOwlA.js";
import { CUSH_TONE } from "./data/cushTone.js";
import { inpaintPoly, drawSoft, beakA, BEAK_COVER, outline, drawFoot, footMask, engraveRegion } from "./handdraw.js";
import { FEET_A } from "./data/feetA.js";
import { FEET_A2 } from "./data/feetA2.js";
import { drawFoot2, footMask2, drawShankTop } from "./feet2.js";
import { TAIL_POSE, tailCut, drawTailA, releaseTailA } from "./tailA.js";
// debugging / fitting hooks for the measurement harness (never changed by the film): layers "all" | "under" (plate,
// key marks, feet) | "over" (tail + body, transparent); noFeet skips the feet (and their cut in the key marks)
export const DBG = { layers: "all", noFeet: false, feet: null, noCut: false };
const FEET2 = true;   // fix pass 2 (review 2): the redrawn feet (feet2.js, data/feetA2.js)
const TAIL = true;   // fix pass 1b: the tail hand-drawn per frame (tailA.js) instead of the phase drawings' smeared one
const CUSH = true;   // fix pass 2 (review 2): the ear cup's measured value correction (data/cushTone.js)
const PLATE_TEX = true;
const SPK_SIDE = [[1886, 345], [2089, 391], [2089, 670], [2011, 670], [2011, 740], [1886, 741]];

// Head/body template offsets vs frame 1356, per source frame (template match on the source). [frame, dx, dy]
export const PATH_A = [
  [1331, 1224, -58], [1332, 1097, -43], [1333, 985, -39], [1334, 864, -32], [1335, 755, -21], [1336, 647, -7], [1337, 554, -4],
  [1338, 470, 0], [1339, 400, 4], [1340, 331, 4], [1341, 283, 1], [1342, 241, 4], [1343, 205, 2], [1344, 178, 5], [1345, 155, 2],
  [1346, 137, 4], [1347, 118, 0], [1348, 103, 4], [1349, 87, 1], [1350, 72, 2], [1351, 72, 2], [1352, 56, 1], [1353, 42, 4],
  [1354, 28, 1], [1355, 14, 2], [1356, 0, 0], [1357, -12, 4], [1358, -25, 0], [1359, -37, 3], [1360, -48, 1], [1361, -56, 4],
  [1362, -60, 0], [1363, -58, 4], [1364, -52, 3], [1365, -45, 3], [1366, -35, 1], [1367, -20, 4], [1368, -9, 2], [1369, -1, 2],
  [1370, 10, 0], [1371, 22, 3], [1372, 33, 2], [1373, 40, 2], [1374, 49, 0], [1375, 57, 4], [1376, 57, 4], [1377, 63, 3],
  [1378, 65, 0], [1379, 69, 2], [1380, 72, 4], [1381, 71, 1],
];
const wingPhase = (f) => ["level", "up", "level", "down"][contentFrame(f) % 4];
const offset = (f) => { const r = PATH_A[Math.max(0, Math.min(PATH_A.length - 1, f - 1331))]; return [r[1], r[2]]; };

// calibration of the redraw (measured against the plate / the registered owl medians): dark-stroke width gain
const WK_PLATE = 0.92, WK_OWL = 0.85;
// horizontal motion blur (sigma px) of the owl layer while it flies in / lands: matched per frame to the source's
// horizontal / vertical gradient ratio inside the head and body (0.43-0.73 on 1331-1343 against ~0.9 standing)
export const SMEAR = { 1331: 1.4, 1332: 3.1, 1333: 4.2, 1334: 3.6, 1335: 3.2, 1336: 2.65, 1337: 3.2, 1338: 2.8, 1339: 2.7,
  1340: 2.3, 1341: 2.1, 1342: 1.7, 1343: 1.5, 1344: 1.0, 1345: 1.0 };   // fix pass 4: x1.3 (the ratio was still 10-20 % high)
export const OWL_SOFT = 1;   // softHalf amount for the owl layer
const BOIL = 0.8, TJIT = 0.08;
const HOLD_A = { 1351: 1350, 1376: 1375 };

let plate = null, D = null, layer = null;
function decoded() {
  if (D) return D;
  D = { phase: {}, feet: {} };
  for (const [k, v] of Object.entries(OWL_A.phase)) D.phase[k] = decodeInk(v);
  for (const [k, v] of Object.entries(OWL_A.feet)) D.feet[k] = decodeInk(v);
  return D;
}
export function roomACanvas() {
  if (plate) return plate;
  plate = cpuCanvas(2206, 946);
  const g = plate.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, 2206, 946);
  drawInk(g, decodeInk(ROOM_A), { wk: WK_PLATE });
  softHalf(plate, 1);
  applyTone(plate, TONE_A);   // the measured value-study correction (blurred values matched to the source plate)
  // the speaker's side panel: dense fine vertical grain (the trace had a grey mass with sparse blobby dashes), keeping
  // the corrected plate's local mean; outline read off the owl-free median (top edge slopes 1885,344 -> 2090,390)
  if (PLATE_TEX) { engraveRegion(plate, SPK_SIDE, { dir: "v", pitch: 5.5, w0: 1.0, w1: 2.4, amp: 0.8, wob: 1.2, brk: 0.1, seed: 181, blur: 2 }); softHalf(plate, 1, 1, [1884, 343, 208, 400]); }
  // (the mixer face was tried the same way, lines slope 0.137 at 5.5 px pitch, knobs protected: it blurred the knobs'
  // highlights and the sigma-6 error there went 5.6 -> 6.7, so it is not used)
  return plate;
}
const LX = 344, LY = 44, LW = 772, LH = 672, X0 = 360, Y0 = 60;
// per-frame head/body affine of the fly-in and landing (template -> frame, about the drawing crop origin X0, Y0),
// canvas order a, b, c, d, e, f; fitted by ECC on the source frames registered on PATH_A (identity afterwards)
export const FLY_W = {1331: [0.9862, -0.0269, 0.0169, 0.9585, -2.16, 15.17], 1332: [0.9737, -0.0478, 0.0700, 0.9761, -11.77, 17.52], 1333: [0.9895, -0.0242, 0.0158, 0.9540, -6.06, 14.67], 1334: [0.9744, -0.0355, 0.0466, 0.9767, -8.31, 13.77], 1335: [0.9873, -0.0419, 0.0409, 0.9772, -8.98, 15.05], 1336: [0.9955, -0.0506, 0.0834, 1.0167, -20.34, 10.65], 1337: [1.0043, -0.0046, 0.0012, 0.9797, -2.83, 6.17], 1338: [0.9942, -0.0099, 0.0155, 0.9925, -5.18, 4.21], 1339: [1.0028, 0.0122, -0.0211, 1.0044, 0.25, -7.41], 1340: [0.9905, 0.0095, -0.0048, 1.0050, 3.59, -3.75], 1342: [0.9990, 0.0061, -0.0108, 1.0027, 3.00, -1.87], 1343: [1.0053, 0.0047, -0.0075, 1.0009, 0.63, -1.01]};
// hand-drawn corrections painted once into each cached phase drawing (see handdraw.js)
function fixHead(dc, D, phase) {
  if (CUSH) applyTone(dc.c, CUSH_TONE, { dx: dc.x, dy: dc.y });   // fix pass 2 (review 2): the ear cup's measured value correction
  inpaintPoly(dc.c, BEAK_COVER, dc.x, dc.y);
  drawSoft(dc.c, dc.x, dc.y, [515, 375, 572, 432], beakA, 1, softHalf);
  // (the ear cushion was redrawn by hand, then tried as a cleaned-up trace: both moved its value pattern off the source,
  // sigma-6 error in the cushion box 5.0 -> 11.0 and 5.7; the traced cushion is kept)
  // the inked outline: the source draws a continuous dark contour round the owl (seen where it crosses the lit slats);
  // the traced silhouette left a grey rim there. Stroked along the silhouette's outer ring.
  const sil = D.base[0].rings[0];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < sil.length; i += 2) { x0 = Math.min(x0, sil[i]); x1 = Math.max(x1, sil[i]); y0 = Math.min(y0, sil[i + 1]); y1 = Math.max(y1, sil[i + 1]); }
  drawSoft(dc.c, dc.x, dc.y, [x0 - 4, y0 - 4, x1 + 4, y1 + 4], (g) => outline(g, sil), 1, softHalf);
  // the up / down drawings (medians of the standing frames) carry blurred legs and feet under the belly; the feet
  // are hand-drawn per frame now, so everything below the belly's underside (the level drawing's, +3 px) goes
  if (DBG.noCut) { if (TAIL) tailCut(dc.c, dc.x, dc.y, softHalf); return; }
  // (fix pass 2 of review 2: in the "down" drawing the wing's primaries hang below the belly line, x 632-712, down to
  // y ~570, as they do in the source's down frames; the cut started at x 586 and took them off. It starts right of
  // them now, at x 714, for that drawing.)
  const cx0 = phase === "down" ? 714 : BELLY_BOT[0][0], BB = BELLY_BOT.filter(([x]) => x >= cx0);
  const t = cpuCanvas(dc.c.width, dc.c.height), tg = t.getContext("2d");
  tg.translate(-dc.x, -dc.y); tg.beginPath(); tg.moveTo(cx0, 760);
  tg.lineTo(cx0, bellyY({ a: [cx0, 0] }) + 3);
  for (const [x, y] of BB) tg.lineTo(x, y + 3);
  tg.lineTo(BB[BB.length - 1][0], 760); tg.closePath(); tg.fillStyle = "#000"; tg.fill();
  softHalf(t, 1, 3);   // a ~1.2 px feather
  const g = dc.c.getContext("2d");
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "destination-out"; g.drawImage(t, 0, 0); g.restore();
  if (TAIL) tailCut(dc.c, dc.x, dc.y, softHalf);
}
// the belly's underside in registered coords (the level drawing's silhouette, read per 20 px column)
const BELLY_BOT = [[586, 492], [600, 499], [620, 512], [640, 523], [660, 534], [680, 540], [700, 547], [720, 552], [740, 558], [760, 553], [780, 555], [800, 547], [820, 540], [840, 540], [860, 538], [872, 522], [886, 500], [900, 480], [920, 468], [940, 463], [960, 458], [980, 446], [1000, 432], [1010, 420]];
// the belly's underside (registered y) at the shank's top x
export function bellyY(F) {
  const x = F.h ? F.h[0] : F.a[0];
  for (let i = 1; i < BELLY_BOT.length; i++) { const [x0, y0] = BELLY_BOT[i - 1], [x1, y1] = BELLY_BOT[i]; if (x <= x1) return y0 + (y1 - y0) * Math.max(0, Math.min(1, (x - x0) / (x1 - x0))); }
  return BELLY_BOT[BELLY_BOT.length - 1][1];
}
// the traced per-frame marks under the feet (registered coords), filtered and cut round the drawn feet
const KX = 520, KY = 440, KW = 520, KH = 260;
const massArea = (M) => { let a = 0; for (const r of M.rings) { let s = 0; for (let i = 0, n = r.length; i < n; i += 2) { const j = (i + 2) % n; s += r[i] * r[j + 1] - r[j] * r[i + 1]; } a += Math.abs(s / 2); } return a; };
const massMid = (M) => { if (typeof M.f === "number") return M.f / 255; const f = M.f[0] === "r" ? M.f[3] : M.f; if (typeof f === "number") return f / 255; const bb = ringsBBox(M.rings), x = (bb[0] + bb[2]) / 2, y = (bb[1] + bb[3]) / 2; return f[1] + f[2] * x + f[3] * y + (f.length > 4 ? f[4] * x * x + f[5] * x * y + f[6] * y * y : 0); };
let kc = null;
// The traced marks under the feet: the frame's own trace (the dark silhouettes of legs and the pressed keys' shadows,
// and the lit and grey masses in them), minus the specks and masses under 400 px2, cut away round the hand-drawn feet
// and minus the grey (0.3-0.75) masses, then SOFTENED (gaussian, sigma KM.sig): as crisp vectors they read as
// posterized islands; soft, they are the shade under the owl and the pressed keys' walls. The dark centre-lines (key
// edges, stripes) go on top, crisp. (Kept, uncut and crisp, they score better blurred, 12.0 against 12.7 sigma-6 in the
// feet box, but they are the islands the review asked to remove.)
// lit: "low" (fix pass 2 of review 2): the frame's traced LIT masses above registered y litY are no longer drawn (they
// are the source's own feet, traced; the feet are drawn by feet2.js now); the lit masses lower down (the pressed keys'
// lit faces) stay, as do the dark masses (pressed keys' shadows) and the dark centre-lines. litY scanned 568 / 580 /
// 592 (feet box sigma-6 10.38 / 10.11 / 10.40; no lit masses at all 10.81)
export const KM = { grow: 4, sig: 2.2, lit: "low", litY: 580 };
function keyMarks(g, ox, oy, ft, rigs, opts, mask = footMask) {
  const key = "_kf" + KM.lit + KM.litY;
  if (!ft[key]) {
    const E = [], big = (M) => massArea(M) >= 400, grey = (M) => massMid(M) > 0.3 && massMid(M) < 0.75;
    const keep = (M) => !grey(M) && (KM.lit === true || massMid(M) <= 0.3 || (KM.lit === "low" && ringsBBox(M.rings)[1] >= KM.litY));
    ft[key] = { soft: { base: ft.base.filter(keep), m: ft.m.filter((M) => big(M) && keep(M)), s: E, d: E, b: E, o: E }, crisp: { base: E, m: E, s: E, d: ft.d, b: E, o: E } };
  }
  const K = ft[key];
  if (!kc) kc = cpuCanvas(KW, KH);
  const k = kc.getContext("2d");
  const pass = (D, sig) => {
    k.setTransform(1, 0, 0, 1, 0, 0); k.globalCompositeOperation = "source-over"; k.clearRect(0, 0, KW, KH);
    k.translate(-KX, -KY);
    drawInk(k, D, { ...opts, cache: false });
    k.globalCompositeOperation = "destination-out";
    for (const F of rigs) mask(k, F, KM.grow);
    k.setTransform(1, 0, 0, 1, 0, 0); k.globalCompositeOperation = "source-over";
    if (sig) softCanvas(kc, sig, sig);
    g.drawImage(kc, KX + ox, KY + oy);
  };
  pass(K.soft, KM.sig);
  pass(K.crisp, 0);
}
export function drawOwlA(ctx, f) {
  const d = decoded(), [dx, dy] = offset(f), cf = contentFrame(f);
  const opts = { map: boilMap(cf, BOIL), tone: boilTone(cf, TJIT), wk: WK_OWL };
  const W = FLY_W[f], ph = d.phase[wingPhase(f)], fk = HOLD_A[f] || f, ft = d.feet[fk];
  const rigs = DBG.feet ? DBG.feet[fk] : (FEET2 ? FEET_A2 : FEET_A)[fk];
  const body = (g, ox, oy) => {
    // the phase drawing, in one of its pre-drawn boil variants (softened once); on the fly-in / landing it is also
    // turned and scaled a little (ECC fit of the head and body per frame)
    g.save(); g.translate(ox, oy);
    if (W) { g.translate(X0, Y0); g.transform(W[0], W[1], W[2], W[3], W[4], W[5]); g.translate(-X0, -Y0); }
    const v = boilVariant(cf), dc = drawnCanvas(ph, v, { map: boilMap(1000 + v, BOIL), tone: boilTone(1000 + v, TJIT), wk: WK_OWL }, OWL_SOFT);
    if (dc && !dc.toned) { applyTone(dc.c, TONE_OWL_A[wingPhase(f)], { dx: dc.x, dy: dc.y }); fixHead(dc, ph, wingPhase(f)); dc.toned = true; }
    if (dc) g.drawImage(dc.c, dc.x, dc.y);
    g.restore();
  };
  // the tail: behind the body (its root is hidden under the rump), at the frame's measured pose, or riding the fly-in
  // affine where the pose could not be measured
  const tail = (g, ox, oy) => {
    if (!TAIL) return;
    const pose = TAIL_POSE[fk];
    g.save(); g.translate(ox, oy);
    if (!pose && W) { g.translate(X0, Y0); g.transform(W[0], W[1], W[2], W[3], W[4], W[5]); g.translate(-X0, -Y0); }
    drawTailA(g, pose, softHalf);
    g.restore();
  };
  const paint = (g, ox, oy) => {
    if (!rigs) {
      tail(g, ox, oy);
      body(g, ox, oy);
      // the legs and feet were measured in the frame itself (registered by PATH_A only)
      if (ft) { g.save(); g.translate(ox, oy); drawInk(g, ft, { ...opts, cache: false }); g.restore(); }
      return;
    }
    // standing: the traced marks of the keys going down (the frame's own trace minus its grey islands and specks, and
    // cut away round the feet), the hand-drawn feet, then the body over the tops of the legs
    const L = DBG.layers, R = DBG.noFeet ? [] : rigs;
    if (L !== "over") {
      if (ft) keyMarks(g, ox, oy, ft, R, opts, FEET2 ? footMask2 : footMask);
      g.save(); g.translate(ox, oy);
      for (const F of R) FEET2 ? drawFoot2(g, F, softHalf) : drawFoot(g, F, softHalf);
      g.restore();
    }
    if (L === "under") return;
    tail(g, ox, oy);
    body(g, ox, oy);
    if (FEET2) { g.save(); g.translate(ox, oy); for (const F of R) drawShankTop(g, F, bellyY(F), softHalf); g.restore(); }
  };
  if (!(SMEAR[f] > 0.05)) { paint(ctx, dx, dy); return; }
  // flying in: the owl is motion-blurred horizontally, so it goes through its own layer
  if (!layer) layer = cpuCanvas(LW, LH);
  const g = layer.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, LW, LH);
  paint(g, -LX, -LY);
  softCanvas(layer, SMEAR[f], 0);
  ctx.drawImage(layer, LX + dx, LY + dy);
}
export function drawA(ctx, f) { if (DBG.layers !== "over") ctx.drawImage(roomACanvas(), 0, 0); drawOwlA(ctx, f); }
export function releaseA() { plate = null; D = null; layer = null; kc = null; releaseTailA(); }
