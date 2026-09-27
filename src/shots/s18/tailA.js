// s18 shot A: the owl's tail, hand-drawn (fix pass 1b). The traced wing-phase drawings are medians of the standing
// frames, and the source's tail wags (+-10 deg about its root, up to 9 px) from frame to frame, so their tail was a
// smeared white blob with a grey rim. It is cut out of the phase drawings (tailCut) and drawn per frame instead:
// four long white feathers pointing right (the second the longest), dark gaps between them opening out to the
// background, a faint grey line splitting the long one, the lowest one shaded. Geometry read off source frame 1356
// (registered = frame coords there) from a per-pixel value table (edges at the half-value point); the per-frame pose
// was measured by ECC (euclidean) of each registered source frame's tail against 1356's (masked to the tail).
import { smoothPath } from "../../lib/paths.js";
import { cpuCanvas } from "./inkdraw.js";
import { gv, line } from "./handdraw.js";

// [angle deg, tx, ty]: tail point p (registered) -> R(p - O) + O + t, O = (880, 380). ECC correlation >= 0.84 on the
// standing frames; 1334-1337 fitted with the fly-in smear applied to the template; 1339-1340 (plain ECC failed: the owl is
// landing; grid search then ECC); 1331-1333 not measurable (heavy smear) -> the tail rode the body's fly-in affine.
// Fix pass 2 (review 2): 1331-1333, 1336, 1338-1341, 1345, 1347, 1349, 1352 and 1379 re-fitted by a coordinate search of
// [angle, tx, ty, spread] on the graded render against the source frame (blurred error round the tail,
// snapshots/s18-fix2-h/tailfit.*); pose[3] is the feathers' spread (deg, see tailPaint).
export const TAIL_O = [880, 380];
export const TAIL_POSE = {
  1331: [-15, -24, -15, 0], 1332: [-15, -24, -15, 0], 1333: [11.25, -21.75, -3, -16], 1334: [-0.61, -4.0, -22.5], 1335: [-4.51, -10.25, -20.95],
  1336: [-4.24, -4.69, -22.09, 1], 1337: [0.12, 2.78, -10.21], 1338: [7.75, 4.2, -1.12, 0], 1339: [11.91, 2.79, 1.12, 0.5], 1340: [10.44, 9.74, 5.07, 1],
  1341: [8.35, 7.95, 0.97, 0], 1342: [6.32, 2.07, -1.58], 1343: [3.76, -0.05, -2.68], 1344: [3.65, -0.6, -3.51], 1345: [7.35, 7.94, -2.73, 1],
  1346: [10.48, 7.11, -6.2], 1347: [9.14, 8.66, -4.49, 0], 1348: [6.44, 5.84, -4.75], 1349: [0.09, -2.63, -0.91, -0.5], 1350: [-2.43, -2.21, -1.23],
  1351: [-2.43, -2.21, -1.23], 1352: [1.3, 1.51, -1.83, 0], 1353: [-5.89, -5.81, 1.64], 1354: [-5.92, -6.65, 2.14], 1355: [-3.69, -3.15, -0.01],
  1356: [0, 0, 0], 1357: [5.42, 3.09, -3.84], 1358: [0.66, -3.07, -0.4], 1359: [-1.6, -3.0, -2.18], 1360: [6.36, 3.77, -3.14],
  1361: [10.31, 9.35, -5.42], 1362: [2.19, -0.59, -6.49], 1363: [3.31, -1.68, -4.61], 1364: [2.33, 0.48, -0.45], 1365: [0.88, -1.71, -2.19],
  1366: [-5.32, -6.06, -1.33], 1367: [-3.5, -5.06, -1.95], 1368: [4.15, 0.58, -2.01], 1369: [10.96, 7.82, -3.76], 1370: [8.02, 8.44, -4.55],
  1371: [-3.89, -5.68, -3.62], 1372: [-2.08, -1.73, 0.41], 1373: [4.01, 5.52, -0.91], 1374: [1.24, 2.11, -0.74], 1375: [-3.94, -3.64, -1.46],
  1376: [-3.94, -3.64, -1.46], 1377: [-4.7, -4.64, 0.95], 1378: [2.63, 2.87, -0.93], 1379: [5.9, 2.83, -2.71, 0], 1380: [-0.07, -2.46, -3.75],
  1381: [-2.02, -2.72, -1.1],
};
export function tailTransform(g, pose) {
  const [a, tx, ty] = pose, r = (a * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r), [ox, oy] = TAIL_O;
  // p' = R (p - O) + O + t   (canvas: x' = c x - s y + e, y' = s x + c y + f)
  g.transform(c, s, -s, c, ox + tx - (c * ox - s * oy), oy + ty - (s * ox + c * oy));
}

// the region of the phase drawings that held the traced tail (registered): right of the rump's edge at x ~921
export const TAIL_CUT = [[921, 407], [1050, 396], [1050, 482], [921, 476]];
export function tailCut(canvas, ox, oy, softHalf) {
  const t = cpuCanvas(canvas.width, canvas.height), tg = t.getContext("2d");
  tg.translate(-ox, -oy); tg.fillStyle = "#000"; tg.beginPath();
  tg.moveTo(TAIL_CUT[0][0], TAIL_CUT[0][1]); for (const [x, y] of TAIL_CUT.slice(1)) tg.lineTo(x, y); tg.closePath(); tg.fill();
  softHalf(t, 1, 3);   // a ~1.2 px feather on the cut
  const g = canvas.getContext("2d");
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "destination-out"; g.drawImage(t, 0, 0); g.restore();
}

// ---- the drawing (registered coords of frame 1356)
// feather outlines: F1 the top one (tip 981,415), F2 the long one with the short F3 under it (tip 1010,425; one
// lower edge), F4 the lowest (tip 969,451); ROOT the rump's end the feathers grow from (hidden under the body)
const F1 = [[914, 421], [922, 417.8], [932, 415], [946, 414.8], [958, 413.8], [966, 413.1], [972, 413.1], [976.5, 414.1], [979.5, 415.6],
  [976, 417.2], [970, 419], [962, 420.3], [952, 421.8], [940, 423.8], [930, 426], [918, 428]];
const F2 = [[916, 429], [926, 428.2], [938, 426.6], [952, 425], [964, 423.3], [976, 422.4], [990, 421.9], [1000, 422.2], [1006, 423.8], [1010.5, 425.8],
  [1005, 428.6], [1000, 431.2], [994, 434.6], [988, 437.6], [980, 440.2], [970, 442.6], [958, 444.4], [946, 445.5], [932, 446.4], [916, 447]];
const F4 = [[914, 448.6], [930, 447.9], [946, 447.8], [958, 447.4], [964, 447.8], [968, 449.6], [969.6, 451.6], [966, 454], [960, 455.8], [952, 457.5],
  [944, 458.8], [936, 461.2], [926, 462.2], [914, 462]];
const ROOT = [[905, 415], [924, 414], [930, 424], [930, 450], [924, 463], [905, 464]];
const TV = { f1: 234, f2: 244, f4: 204, rim: 30 };
// fix pass 2 (review 2): the source's feathers spread and close from frame to frame; pose[3] (deg) turns the top feather
// up by it and the lowest one down by it about the root (the gaps by half), the long middle one staying put
const ROOT_P = [912, 440];
function tailPaint(g, spread = 0) {
  const rot = (k, fn) => { if (!spread) { fn(); return; } const r = (k * spread * Math.PI) / 180, c = Math.cos(r), sn = Math.sin(r), [ox, oy] = ROOT_P;
    g.save(); g.transform(c, sn, -sn, c, ox - (c * ox - sn * oy), oy - (sn * ox + c * oy)); fn(); g.restore(); };
  g.lineJoin = "round"; g.lineCap = "round";
  // a dark rim round the feathers (the half of it outside the fill shows: ~2.4 px, as against the slats at 1356)
  g.strokeStyle = gv(TV.rim); g.lineWidth = 4.8;
  for (const [F, k] of [[F1, -1], [F2, 0], [F4, 1]]) rot(k, () => { g.beginPath(); smoothPath(g, F, true); g.stroke(); });
  g.fillStyle = gv(238); g.beginPath(); smoothPath(g, ROOT, true); g.fill();
  rot(0, () => { g.fillStyle = gv(TV.f2); g.beginPath(); smoothPath(g, F2, true); g.fill(); });
  rot(-1, () => { g.fillStyle = gv(TV.f1); g.beginPath(); smoothPath(g, F1, true); g.fill(); });
  // the lowest feather: shaded, lighter along its top
  rot(1, () => { g.save(); g.beginPath(); smoothPath(g, F4, true); g.clip();
    const sh = g.createLinearGradient(0, 447, 0, 462); sh.addColorStop(0, gv(240)); sh.addColorStop(0.3, gv(TV.f4)); sh.addColorStop(1, gv(182));
    g.fillStyle = sh; g.fillRect(900, 440, 80, 30); g.restore(); });
  // the gaps: grey where they start at the root, dark where they open out to the background
  rot(-0.5, () => line(g, [[926, 427.4], [938, 425.4], [948, 424.1], [958, 422.4], [968, 421.2], [978, 420.4], [986, 420.2]], 3.2, 34, { w0: 0.25, w1: 0.9 }));
  rot(0.5, () => line(g, [[924, 447.3], [936, 447.1], [948, 446.6], [958, 446.2], [968, 446.1]], 3.0, 36, { w0: 0.2, w1: 0.9 }));
  // the faint line splitting the long feather, a fainter one under it, the lowest feather's shaft
  line(g, [[930, 437.6], [942, 437], [950, 436.2], [958, 435.7], [966, 434.4], [974, 432.4]], 2.5, 160, { w0: 0.4, w1: 0.2 });
  line(g, [[932, 441.8], [942, 441.6], [954, 440.6]], 1.8, 196, { w0: 0.3, w1: 0.3 });
  rot(1, () => line(g, [[922, 453.4], [936, 452.8], [950, 452.2]], 1.3, 196, { w0: 0.3, w1: 0.3 }));
}
// draw the tail at a frame's pose into a small softened layer (the source's edges are ~2 px ramps)
const BX = 890, BY = 395, BW = 140, BH = 90;
let tl = null;
export function drawTailA(g, pose, softHalf) {
  if (!tl) tl = cpuCanvas(BW + 60, BH + 60);
  const t = tl.getContext("2d");
  t.setTransform(1, 0, 0, 1, 0, 0); t.globalCompositeOperation = "source-over"; t.globalAlpha = 1; t.clearRect(0, 0, tl.width, tl.height);
  t.translate(30 - BX, 30 - BY);
  if (pose) tailTransform(t, pose);
  tailPaint(t, pose ? pose[3] || 0 : 0);
  t.setTransform(1, 0, 0, 1, 0, 0);
  softHalf(tl, 1, 1);
  g.drawImage(tl, BX - 30, BY - 30);
}
export function releaseTailA() { tl = null; }
