// s22 (74.52–84.04): the sōko page, framed on the lit screen. The owl walks round the header strip with the
// scissors — along the top (left → right), down the right side, along the bottom (right → left, upside down), up the
// left side — leaving a dashed cut line; at 79.76 the dashes turn into a solid outline and the strip jumps up and
// settles; the owl flies up onto it, brandishes and throws away the scissors, faces us, reaches for the strip's
// top-left corner and walks right along the top edge peeling it: the strip's blank white back swings over, leaving a
// black hole with a torn rim. Camera locked except a small settle at the cut (74.52–74.80).
// Every number is measured on the source (frame px, 25 fps); see fidelity/s22.md.
import { drawFramedPage, sokoPageCanvas, sokoHeaderCanvas, FRAMED, HEADER_FRAMED, releaseSoko } from "../lib/sites.js";
import { owlLayer, owlPose, mergePose, gv, LINE, V } from "../lib/owlInk.js";
import { lerp, smooth, clamp, rng } from "../lib/rng.js";
import { interp, hold, drawScissors, gripPoint, drawHand, myPhones, drawLeg, tornRect, owlGlow, releaseKit } from "./s22/kit.js";

const W = 2206, H = 946;

// ---------------------------------------------------------------- source timing quirks
// The source was converted 24 → 25 fps by repeating one frame a second: 75.20, 76.20 … 80.20 repeat the frame before.
function srcT(t) {
  const n = Math.floor(t + 1e-6), fr = t - n;
  if (n >= 75 && n <= 80 && fr > 0.18 - 1e-6 && fr < 0.22 - 1e-6) return t - 0.04;
  return t;
}
// camera settle at the cut: x' = a·x + tx, y' = d·y + ty (ORB fit of the page against 76.0)
const BUMP = [[74.52, 0.9884, -0.3, 0.9747, -2.3], [74.56, 0.9906, 0, 0.9798, -1.6], [74.60, 0.9928, 0, 0.9842, -0.9], [74.64, 0.9947, 0.7, 0.9881, -0.3],
  [74.68, 0.9962, 0.5, 0.9925, -0.2], [74.72, 0.9975, 0.5, 0.9957, 0.1], [74.76, 0.9989, 0.5, 0.9974, 0.6], [74.80, 1, 0, 1, 0]];

// ---------------------------------------------------------------- the cut line
// Dashes: capsules 15 × 5 px. Top: from x 192 every 20.706 px (86), centred y 185.3. Right: from y 184 every 20.4 (9,
// the last 11 long), centred x 1974. Bottom: from x 1976 leftwards every 20.68 (86), centred y 361. Left: from y 364
// upwards every 20.6 (9), centred x 193.5. Counts per frame measured on the source.
const TOP_N = [[74.52, 19], [74.56, 20], [74.6, 21], [74.64, 22], [74.68, 23], [74.72, 25], [74.76, 26], [74.8, 27], [74.84, 29], [74.88, 30], [74.92, 32], [74.96, 33], [75.0, 35], [75.04, 36],
  [75.08, 38], [75.12, 39], [75.16, 41], [75.24, 42], [75.28, 44], [75.32, 45], [75.36, 47], [75.4, 48], [75.44, 50], [75.48, 52], [75.52, 53], [75.56, 55], [75.6, 56], [75.64, 58],
  [75.68, 59], [75.72, 61], [75.76, 62], [75.8, 64], [75.84, 65], [75.88, 67], [75.92, 68], [75.96, 70], [76.0, 71], [76.04, 72], [76.08, 74], [76.12, 75], [76.16, 77], [76.24, 78],
  [76.28, 80], [76.32, 81], [76.36, 83], [76.4, 84], [76.44, 86]];
const RIGHT_N = [[76.56, 6], [76.96, 7], [77.0, 8], [77.08, 9]];
const BOT_N = [[77.48, 8], [77.52, 10], [77.56, 11], [77.6, 13], [77.64, 15], [77.68, 17], [77.72, 19], [77.76, 21], [77.8, 22], [77.84, 24], [77.88, 26], [77.92, 28], [77.96, 30],
  [78.0, 31], [78.04, 33], [78.08, 35], [78.12, 37], [78.16, 39], [78.24, 40], [78.28, 43], [78.32, 44], [78.36, 46], [78.4, 48], [78.44, 50], [78.48, 52], [78.52, 54], [78.56, 55],
  [78.6, 57], [78.64, 59], [78.68, 61], [78.72, 63], [78.76, 65], [78.8, 67], [78.84, 68], [78.88, 70], [78.92, 72], [78.96, 74], [79.0, 76], [79.04, 78], [79.08, 80], [79.12, 82],
  [79.16, 83], [79.24, 86]];
const LEFT_N = [[79.24, 4], [79.28, 6], [79.4, 7], [79.48, 8], [79.56, 9]];
const DASH = "#f7f7f3";
function dashCounts(T) {
  const at = (keys, t0) => (T < t0 ? 0 : hold(keys, T)[0]);
  return [T < 74.52 ? 0 : hold(TOP_N, T)[0], at(RIGHT_N, 76.56), at(BOT_N, 77.48), at(LEFT_N, 79.24)];
}
function drawDashes(g, [nT, nR, nB, nL]) {
  g.save();
  g.fillStyle = DASH;
  g.beginPath();
  for (let i = 0; i < nT; i++) g.roundRect(192 + i * 20.706, 183.6, 15, 5, 2.5);
  for (let i = 0; i < nR; i++) g.roundRect(1971.5, 184 + i * 20.4, 5, i === 8 ? 11 : 15, 2.5);
  for (let i = 0; i < nB; i++) g.roundRect(1976 - i * 20.68 - 15, 358.5, 15, 5, 2.5);
  for (let i = 0; i < nL; i++) g.roundRect(191, 364 - i * 20.6 - 15, 5, 15, 2.5);
  g.fill();
  g.restore();
}

// ---------------------------------------------------------------- the solid outline and the strip's jump (79.76–80.76)
// Outline: vertical sides at x 193.5 / 1979.5; top and bottom measured at x 600 and 1800 every frame.
const OUT = [[79.76, 169, 350, 159, 339.5], [79.8, 158, 339, 145, 325], [79.84, 146, 326.5, 131.5, 312], [79.88, 135.5, 317, 116.5, 298], [79.92, 146.5, 327.5, 135, 314.5],
  [79.96, 160.5, 341.5, 152.5, 332], [80.0, 173.5, 355, 166, 346], [80.04, 186, 368, 179, 359], [80.08, 182.5, 363.5, 174, 354], [80.12, 179, 360.5, 170, 351],
  [80.16, 176, 357.5, 166, 347], [80.24, 178.5, 359.5, 168.5, 350], [80.28, 181, 362.5, 173, 353.5], [80.32, 182, 363.5, 173, 354.5], [80.56, 182, 363.5, 173, 354.5],
  [80.6, 182.5, 364, 173.5, 355], [80.64, 184, 364.5, 176, 357], [80.68, 185, 364.5, 178, 358], [80.72, 186, 365, 180, 359.5], [80.76, 187, 365, 181, 359.5]];
const OUT_X0 = 193.5, OUT_X1 = 1979.5;
function outlineQuad(T) {
  const [t6, b6, t18, b18] = T >= 80.76 ? OUT[OUT.length - 1].slice(1) : interp(OUT, T);
  const yAt = (a, b, x) => a + ((x - 600) * (b - a)) / 1200;
  return [[OUT_X0, yAt(t6, t18, OUT_X0)], [OUT_X1, yAt(t6, t18, OUT_X1)], [OUT_X1, yAt(b6, b18, OUT_X1)], [OUT_X0, yAt(b6, b18, OUT_X0)]];
}
function strokeQuad(g, q, w, col) {
  g.save(); g.strokeStyle = col; g.lineWidth = w; g.lineJoin = "miter";
  g.beginPath(); q.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.stroke(); g.restore();
}
// The strip's content moves with it: [t, dy at x 660, dy at x 1825, dx] (template tracks of headline and counter).
const LIFT = [[79.72, 0, 0, 0], [79.76, -15, -23, 2], [79.8, -25, -37, 3], [79.84, -37, -50, 4], [79.88, -47, -65, 4], [79.92, -37, -48, 3], [79.96, -23, -30, 3], [80.0, -10, -16, 3],
  [80.04, 3, -4, 4], [80.08, -1, -8, 4], [80.12, -4, -12, 4], [80.16, -7, -15, 4], [80.24, -5, -13, 4], [80.28, -2, -10, 4], [80.32, -1, -9, 4], [80.56, -1, -9, 4],
  [80.6, -1, -8, 3], [80.64, 0, -8, 3], [80.68, 1, -8, 2], [80.72, 1, 0.5, 1], [80.76, 0, 0, 0]];
function drawStrip(g, T, alpha = 1) {
  const [d6, d18, dx] = T >= 80.76 ? [0, 0, 0] : interp(LIFT, T);
  const k = (d18 - d6) / 1165, f = d6 - 660 * k;
  const hc = sokoHeaderCanvas({ gaze: "down" });
  g.save();
  g.globalAlpha = alpha;
  g.transform(1, k, 0, 1, dx, f);
  g.drawImage(hc, HEADER_FRAMED.x, HEADER_FRAMED.y, HEADER_FRAMED.w, HEADER_FRAMED.h);
  g.restore();
}

// ---------------------------------------------------------------- the peel (81.44–84.04)
// The strip's blank back: a quad per source pose (the source animates on twos here) [t, TL, TR, BR, BL].
const CARD = [
  [81.44, 196, 185, 203, 184, 204, 361, 197, 362],
  [81.48, 200, 183, 212, 180, 212, 360, 201, 362],
  [81.52, 237, 185, 270, 170, 315, 345, 267, 364],
  [81.60, 264.6, 183.7, 342.7, 155.7, 386.0, 322.5, 291.8, 361.7], [81.72, 291.1, 186.9, 400.8, 147.2, 444.2, 309.5, 315.2, 362.2],
  [81.80, 306.0, 186.7, 435.9, 140.7, 480.7, 301.6, 327.8, 360.5], [81.88, 326.7, 186.4, 487.0, 137.3, 528.6, 291.1, 347.4, 360.7],
  [81.96, 359.1, 184.9, 547.2, 132.3, 586.6, 282.7, 377.9, 359.9], [82.04, 391.8, 185.7, 610.4, 133.5, 648.8, 283.8, 407.6, 358.5],
  [82.12, 425.4, 186.2, 671.9, 129.0, 707.5, 278.6, 440.2, 358.8], [82.20, 455.6, 186.5, 728.3, 130.1, 764.7, 278.9, 468.1, 360.2],
  [82.28, 482.1, 185.1, 778.6, 128.9, 813.5, 276.5, 492.4, 359.6], [82.36, 506.3, 184.7, 827.8, 127.5, 860.8, 275.4, 516.4, 359.1],
  [82.44, 532.7, 185.2, 884.4, 128.0, 915.2, 274.7, 540.4, 359.7], [82.52, 559.0, 184.9, 937.2, 129.9, 967.3, 277.9, 565.2, 360.4],
  [82.60, 581.0, 184.8, 983.4, 129.8, 1012.9, 278.1, 586.2, 360.4], [82.72, 604.4, 184.4, 1029.1, 131.3, 1056.2, 279.3, 607.8, 360.5],
  [82.80, 625.9, 184.3, 1078.1, 132.0, 1104.7, 279.4, 628.0, 360.4], [82.88, 648.6, 185.1, 1119.8, 133.6, 1145.6, 279.4, 650.3, 362.7],
  [82.96, 673.0, 185.1, 1164.8, 135.2, 1192.4, 285.0, 674.6, 360.6], [83.04, 695.4, 185.1, 1206.3, 136.0, 1232.6, 283.8, 696.9, 362.1],
  [83.12, 717.2, 184.2, 1244.7, 137.4, 1270.1, 286.2, 718.3, 361.3], [83.20, 737.1, 185.2, 1278.8, 140.4, 1303.7, 288.6, 737.9, 362.5],
  [83.28, 755.6, 185.1, 1308.9, 140.8, 1334.5, 290.4, 755.6, 361.9], [83.36, 774.5, 184.9, 1341.0, 141.9, 1365.9, 290.8, 774.4, 362.9],
  [83.44, 791.1, 184.7, 1369.8, 141.1, 1394.3, 292.0, 790.9, 362.2], [83.52, 809.4, 184.6, 1395.0, 143.8, 1418.4, 292.7, 808.9, 364.0],
  [83.60, 825.5, 184.8, 1415.5, 144.0, 1439.3, 295.1, 824.7, 363.7], [83.72, 850.4, 184.7, 1443.6, 146.2, 1465.6, 298.5, 848.1, 362.9],
  [83.80, 867.8, 184.0, 1464.0, 148.2, 1485.9, 299.0, 863.6, 363.1], [83.88, 877.5, 184.6, 1476.0, 148.6, 1497.2, 299.8, 873.7, 363.6],
  [83.96, 894.0, 183.2, 1506.3, 151.3, 1522.1, 300.0, 886.2, 363.5],
];
const PEEL_T0 = 81.44, TEAR_ALL = 82.62;
const cardAt = (T) => { const v = hold(CARD, T); return [[v[0], v[1]], [v[2], v[3]], [v[4], v[5]], [v[6], v[7]]]; };
// the half-planes left / right of the card's left edge (a nearly vertical line), as polygons
function sidePoly(g, c, left) {
  const [a, , , d] = c, sx = (d[0] - a[0]) / (d[1] - a[1]);
  const xa = a[0] + (0 - a[1]) * sx, xb = a[0] + (H - a[1]) * sx;
  g.beginPath();
  if (left) { g.moveTo(-10, -10); g.lineTo(xa, -10); g.lineTo(xb, H + 10); g.lineTo(-10, H + 10); }
  else { g.moveTo(xa, -10); g.lineTo(W + 10, -10); g.lineTo(W + 10, H + 10); g.lineTo(xb, H + 10); }
  g.closePath();
}
let TORN = null, PAPER = null;
function tornPts() { if (!TORN) TORN = tornRect(HEADER_FRAMED.x + 0.3, HEADER_FRAMED.y + 0.3, HEADER_FRAMED.x + HEADER_FRAMED.w - 1.5, HEADER_FRAMED.y + HEADER_FRAMED.h, 22, 2.6); return TORN; }
function polyPath(g, pts) { g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); }
// paper grain for the card (deterministic)
function paperPattern(g) {
  if (!PAPER) {
    PAPER = document.createElement("canvas"); PAPER.width = 256; PAPER.height = 256;
    const p = PAPER.getContext("2d"), id = p.createImageData(256, 256), d = id.data, r = rng(81);
    for (let i = 0; i < d.length; i += 4) { const v = 128 + (r() - 0.5) * 40; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    p.putImageData(id, 0, 0);
  }
  return g.createPattern(PAPER, "repeat");
}
const RIM = "rgb(247,247,242)";
function drawPeel(g, T) {
  const c = cardAt(T);
  const outline = outlineQuad(81);          // the rest outline
  const torn = tornPts();
  const tornAll = T >= TEAR_ALL;
  // strip content still in place: right of the card's left edge
  g.save(); sidePoly(g, c, false); g.clip();
  g.beginPath(); polyPath(g, outline); g.clip();
  drawStrip(g, 81);
  g.restore();
  // the hole: left of the card's left edge
  g.save(); sidePoly(g, c, true); g.clip();
  g.beginPath(); polyPath(g, torn); g.fillStyle = "#070807"; g.fill();
  g.restore();
  // rim: torn where the strip has gone, the straight outline where it is still attached
  g.save();
  if (!tornAll) { sidePoly(g, c, true); g.clip(); }
  g.beginPath(); polyPath(g, torn); g.lineJoin = "round"; g.strokeStyle = RIM; g.lineWidth = 4.5; g.stroke();
  g.restore();
  if (!tornAll) { g.save(); sidePoly(g, c, false); g.clip(); strokeQuad(g, outline, 6, RIM); g.restore(); }
  // the card: the strip's blank paper back
  g.save();
  g.beginPath(); polyPath(g, c);
  g.fillStyle = "#dee4dd"; g.fill();
  g.globalAlpha = 0.09; g.fillStyle = paperPattern(g); g.fill();
  g.globalAlpha = 1;
  g.restore();
}

// ---------------------------------------------------------------- the owl: walking the cut (74.52–79.76)
// Local frame per side: u along the cut, v across it (v < 0 = outside the strip). The owl is drawn as if walking
// right along a horizontal line and the side's transform turns it (right side 90°, bottom 180°, left side 270°).
const SIDES = [
  { O: [193.5, 185.3], d: [1, 0], m: [0, 1] },
  { O: [1974, 185.3], d: [0, 1], m: [-1, 0] },
  { O: [1974, 360.8], d: [-1, 0], m: [0, -1] },
  { O: [193.5, 360.8], d: [0, -1], m: [1, 0] },
];
// body centroid tracks (frame px; morphological-opened owl mask against a clean plate of the page)
const TOP_C = [[74.52, 410.6, 109.5], [74.56, 440.1, 108.2], [74.60, 469.7, 107.8], [74.64, 499.4, 107.5], [74.68, 531.7, 106.2], [74.72, 561.0, 105.8], [74.76, 589.2, 104.1],
  [74.80, 620.6, 104.3], [74.84, 655.2, 104.8], [74.88, 683.2, 105.1], [74.92, 713.1, 105.3], [74.96, 741.7, 106.1], [75.00, 776.0, 105.9], [75.04, 805.2, 106.3], [75.08, 835.6, 105.9],
  [75.12, 864.7, 106.5], [75.16, 897.5, 106.7], [75.24, 927.7, 106.4], [75.28, 958.0, 106.3], [75.32, 990.6, 107.3], [75.36, 1024.2, 107.1], [75.40, 1054.7, 107.1],
  [75.44, 1086.8, 107.0], [75.48, 1117.7, 107.5], [75.52, 1151.1, 108.2], [75.56, 1181.6, 107.6], [75.60, 1213.4, 106.8], [75.64, 1243.8, 106.3], [75.68, 1278.7, 107.6],
  [75.72, 1309.7, 107.1], [75.76, 1339.9, 106.4], [75.80, 1370.2, 106.5], [75.84, 1401.1, 108.0], [75.88, 1430.8, 107.6], [75.92, 1461.7, 107.6], [75.96, 1492.8, 108.2],
  [76.00, 1525.3, 108.7], [76.04, 1555.3, 108.3], [76.08, 1585.9, 107.3], [76.12, 1613.3, 107.7], [76.16, 1644.7, 108.1], [76.24, 1676.7, 108.6], [76.28, 1708.5, 108.2],
  [76.32, 1738.1, 108.8], [76.36, 1772.1, 109.1], [76.40, 1800.3, 109.5], [76.44, 1831.7, 108.6], [76.48, 1860.3, 107.8], [76.52, 1896.0, 108.4]];
const RIGHT_C = [[76.56, 2039.6, 132.3], [76.88, 2039.8, 133.4], [76.92, 2039.4, 137.3], [76.96, 2039.9, 144.6], [77.00, 2040.4, 154.6], [77.04, 2042.3, 167.1], [77.08, 2044.1, 177.4],
  [77.12, 2046.6, 191.5], [77.16, 2047.9, 209.5], [77.24, 2049.0, 226.2], [77.28, 2049.0, 240.4], [77.32, 2049.5, 254.7], [77.36, 2050.2, 270.5], [77.40, 2050.7, 285.4], [77.44, 2050.2, 299.9]];
const LEFT_C = [[79.24, 115.3, 444.0], [79.28, 115.3, 439.9], [79.32, 115.1, 433.4], [79.36, 116.7, 423.3], [79.40, 115.9, 408.3], [79.44, 116.0, 395.0], [79.48, 115.8, 377.5],
  [79.52, 116.9, 363.1], [79.56, 115.6, 347.8], [79.60, 115.5, 336.4], [79.64, 115.8, 335.6], [79.68, 115.6, 331.8], [79.72, 116.0, 332.1]];
// bottom: x = 1803 − 921.6·(t − 77.64) (fit of the clean frames 77.64–79.04), y ≈ 420
const botX = (T) => 1803 - 921.6 * (T - 77.64);

// The walking pose (s21's profile/top-edge owl): near profile, head pushed forward over the scissors.
const PROFILE = owlPose("walk", {
  light: [-0.6, -0.8],
  head: { x: 36, y: -161, rx: 96, ry: 100, yaw: 1.05, pitch: 0, roll: 0.12, square: 2.0, jowl: 0.08 },
  tufts: [{ at: -0.42, size: 30, width: 0.24, lean: -0.3, second: 0.35, curl: 0.12 }],
  body: { x: 0, y: 4, a: 150, b: 126, rot: 2.5, egg: 0.1, sag: 0.08 },
  tail: { base: [-120, 50], tip: [-236, 89], w: 30, n: 2 },
  wings: [{ type: "folded", layer: "front", S: [-10, -60], T: [190, -20], width: 85, back: 26, dir: 1, grip: true }],
  feet: [],
  eyes: { state: "angry", r: 24, spread: 0.6, el: -0.05, look: [0.6, 0.25], over: { side: -1, lid: 0.3, slant: 0.9, brow: 1.3, pupil: 0.8 } },
  beak: { el: -0.3, lift: 1.3, w: 30, l: 46 },
  bandage: { az: -0.35, el: 0.9, size: 46, rot: -0.3 },
  headphones: { on: false },
  flow: [0.3, 1],
});
// proportions from the source at 75.6: head centre (+21, −27) px from the body-blob centroid, body centre (−21, +27),
// body ≈ 96 × 92 px, tail tip (−97, +45), feet on the line (+76)
const EDGE_POSE = mergePose(PROFILE, {
  head: { x: 100, y: -142, rx: 104, ry: 106, yaw: 1.0, roll: 0.3 },
  body: { x: -5, y: -5, a: 134, b: 118, rot: 2.55, egg: 0.14 },
  tail: { base: [-105, 30], tip: [-225, 50], w: 34, n: 3 },
  wings: [{ type: "folded", layer: "front", S: [5, -75], T: [190, 10], width: 125, back: 38, dir: 1, grip: true }],
  eyes: { r: 20, look: [0.8, 0.6] },
});
const S_EDGE = 0.38;
// relative to the tracked body centroid (local px): owl root, scissors pivot
const EDGE_ROOT = [-19, 29], EDGE_PIVOT = [108, 51], EDGE_SC = { ang: 0.29, L: 88, ring: 1.1 };

function edgeState(T) {
  let side, u, v, walking = true;
  if (T < 76.54) { const [x, y] = interp(TOP_C, T); side = 0; u = x - 193.5; v = y - 185.3; }
  else if (T < 77.46) { const [x, y] = interp(RIGHT_C, T); side = 1; u = y - 185.3; v = 1974 - x; walking = T > 76.9; }
  else if (T < 79.22) { side = 2; u = 1974 - botX(T); v = 360.8 - 420; }
  else { const [x, y] = interp(LEFT_C, Math.min(T, 79.72)); side = 3; u = 360.8 - y; v = x - 193.5; walking = T < 79.6; }
  v = -79;                              // the rig stands on the line; per-side offsets are within the tracker's noise
  const s = S_EDGE;
  const root = [u + EDGE_ROOT[0], v + EDGE_ROOT[1]];
  const open = 0.05 + 0.12 * (0.5 + 0.5 * Math.cos((2 * Math.PI * (T - 73.5)) / 0.24));
  const sc = { x: u + EDGE_PIVOT[0], y: v + EDGE_PIVOT[1], ang: EDGE_SC.ang, L: EDGE_SC.L, open, top: 1, ring: EDGE_SC.ring };
  const ph = (2 * Math.PI * (T - 73.52)) / 0.34;
  const legs = [0, 1].map((k) => {
    const sw = walking ? Math.sin(ph + k * Math.PI) : 0;
    const hip = [root[0] + (k ? 40 : -50) * s, root[1] + 70 * s];
    const foot = [root[0] + ((k ? 60 : -94) + 30 * sw) * s, -2.5 - (walking ? Math.max(0, Math.cos(ph + k * Math.PI)) * 3 : 0)];
    return { hip, foot };
  });
  const S = SIDES[side];
  // light from the frame's upper left, expressed in the side's local frame
  const Lf = [-0.55, -0.83];
  const light = [Lf[0] * S.d[0] + Lf[1] * S.d[1], Lf[0] * S.m[0] + Lf[1] * S.m[1]];
  return { kind: "edge", side, pose: mergePose(EDGE_POSE, { light }), x: root[0], y: root[1], s, sc, legs, legW: 6, toe: 9, handSize: 12, phones: true };
}

// ---------------------------------------------------------------- the owl after the cut (79.76–84.04), frame coords
// body-centroid track (79.84–82.04) and, on the top edge, the owl's front x (bbox right) per source pose
const FLY_C = [[79.76, 116.6, 323.1], [79.8, 125, 175], [79.84, 172.0, 108.0], [79.88, 207.6, 54.7], [79.92, 235.2, 41.9], [79.96, 261.9, 48.3], [80.0, 292.5, 52.3],
  [80.04, 312.6, 74.4], [80.08, 327.2, 95.4]];
const FRONT_X = [[81.52, 409], [81.60, 497], [81.72, 560], [81.80, 594], [81.88, 658], [81.96, 719], [82.04, 784], [82.12, 850], [82.20, 907], [82.28, 955], [82.36, 1000],
  [82.44, 1066], [82.52, 1118], [82.60, 1166], [82.72, 1210], [82.80, 1248], [82.88, 1291], [82.96, 1331], [83.04, 1373], [83.12, 1420], [83.20, 1444], [83.28, 1471],
  [83.36, 1501], [83.44, 1533], [83.52, 1556], [83.60, 1574], [83.72, 1603], [83.80, 1628], [83.88, 1638], [83.96, 1700]];

// F) standing on the strip's top-left with the scissors raised (source 80.3: head centre (332, 68), body centre
// (345, 133), rings in front of the chest at x 375–420, blade tips at (217, 32))
const HOLD_POSE = owlPose("walk", {
  bandage: null,
  head: { x: -25, y: -178, rx: 102, ry: 100, yaw: 0.6, roll: 0.08 },
  body: { x: 0, y: 8, a: 118, b: 106, rot: 2.0, egg: 0.08 },
  eyes: { state: "angry", look: [0.6, 0.3] },
  wings: [{ type: "folded", layer: "front", S: [10, -50], T: [150, -40], width: 50, back: 26, dir: 1, grip: true }],
  feet: [{ x: -36, y: 118, rot: -0.35, size: 15, mode: "stand", leg: 22, seed: 2 }, { x: 44, y: 112, rot: -0.1, size: 15, mode: "stand", leg: 16, seed: 5 }],
  headphones: { lift: 1.02, r: 40 },
});
const FLY_POSE = owlPose("fly", {
  bandage: null,
  head: { yaw: 0.45 }, headphones: { yaw: 0.45, lift: 1.02, r: 40 }, eyes: { state: "angry", look: [0.5, 0.2] },
});
// H) facing us on the edge, wings open and down (source 81.0: head centre (313, 80), body 275–380 × 108–183)
const FRONT_POSE = owlPose("frontStand", {
  bandage: null,
  eyes: { state: "angry", look: [-0.35, 0.45] },
  head: { y: -150, rx: 104, ry: 100, yaw: -0.18, roll: -0.04 },
  body: { y: 22, a: 112, b: 100 },
  headphones: { lift: 1.0, r: 40, yaw: -0.18 },
  wings: [
    { type: "spread", layer: "back", S: [-80, -10], Wr: [-150, 40], T: [-225, 120], trail: [0.6, 0.8], len: 56, spread: 0.7 },
    { type: "spread", layer: "back", S: [80, -10], Wr: [150, 30], T: [215, 80], trail: [-0.6, 0.8], len: 56, spread: 0.7 },
  ],
  feet: [{ x: -40, y: 118, rot: 0.15, size: 15, mode: "stand", leg: 14, seed: 2 }, { x: 40, y: 118, rot: -0.15, size: 15, mode: "stand", leg: 14, seed: 5 }],
});
// I) bent over to the left, one wing reaching down to the strip's top-left corner (source 81.36: head centre
// (245, 115), body 250–365 × 98–188). Drawn as the walking owl mirrored (facing left).
const REACH_POSE = owlPose("walk", {
  bandage: null,
  head: { x: 110, y: -62, rx: 100, ry: 100, yaw: 0.45, roll: 0.35 },
  body: { x: 0, y: 5, a: 128, b: 104, rot: 2.8, egg: 0.1 },
  tail: { base: [-100, -10], tip: [-205, -60], w: 26, n: 2 },
  eyes: { state: "angry", look: [0.8, 0.6] },
  wings: [
    { type: "spread", layer: "back", S: [-30, -60], Wr: [-110, -125], T: [-185, -150], trail: [-0.3, 1], len: 55, spread: 0.7 },
    { type: "folded", layer: "front", S: [35, -45], T: [250, 110], width: 70, back: 28, dir: 1 },
  ],
  feet: [{ x: -40, y: 100, rot: 0.3, size: 15, mode: "stand", leg: 18, seed: 2 }, { x: 25, y: 98, rot: 0.2, size: 15, mode: "stand", leg: 14, seed: 5 }],
  headphones: { lift: 1.02, r: 40 },
});
// J) walking right, eyes screwed shut, the far wing spread back (source 82.4: head centre (915, 79), body centre
// (897, 125), wing tip out to x 827)
const WALKJ_POSE = owlPose("walk", {
  bandage: null,
  head: { x: 55, y: -150, rx: 104, ry: 104, yaw: 0.55, roll: 0.06 },
  eyes: { state: "closed" },
  body: { x: 0, y: 10, a: 128, b: 122, rot: 2.2, egg: 0.06 },
  tail: { base: [-80, 70], tip: [-150, 110], w: 22, n: 2 },
  wings: [
    { type: "spread", layer: "back", S: [-15, -60], Wr: [-120, -90], T: [-235, -80], trail: [0.35, 1], len: 85, spread: 1, n: 8, m: 5 },
    { type: "folded", layer: "front", S: [18, -62], T: [-80, 100], width: 34, back: 26, dir: -1 },
  ],
  headphones: { lift: 1.02, r: 40 },
});
const S_TOP = 0.38;

function frameState(T) {
  // E) 79.76–80.08: up off the left side, over the corner and down onto the strip's top-left (upright; scissors
  // swung from pointing up, to right, to down, to raised over the head)
  if (T < 80.08) {
    const [cx, cy] = interp(FLY_C, T);
    const [ox, oy, ang] = interp([[79.76, 20, -150, -1.55], [79.8, 55, -75, -1.0], [79.84, 75, -30, -0.25], [79.88, 80, -20, -0.15], [79.92, 75, 0, 1.45],
      [79.96, 20, 5, 2.3], [80.0, -22, 10, 3.1], [80.04, -5, 0, 3.78], [80.08, 3, 1, 3.598]], T);
    // 79.96–80.02: the blades swing through the plane of the frame behind the owl (only the rings show)
    const L = 118 - 70 * Math.max(0, 1 - Math.abs(T - 79.99) / 0.05);
    const sc = { x: cx + ox, y: cy + oy, ang, L, open: 0.1, top: 1, ring: 1.35 * 118 / L };
    const air = T > 79.82 && T < 80.03;
    const pose = air ? mergePose(HOLD_POSE, { feet: HOLD_POSE.feet.map((f) => ({ ...f, mode: "dangle", leg: 12, rot: 0.3 })) }) : HOLD_POSE;
    return { kind: "frame", pose, x: cx + 15.5, y: cy + 37.5, s: 0.34, rot: interp([[79.76, -1.4], [79.8, -0.35], [79.84, 0]], T)[0], sc, handSize: 12, scBehind: T > 79.95 && T < 80.03 };
  }
  // F/G) 80.08–80.80: standing on the top edge, scissors raised; swung round to the left and thrown
  if (T < 80.8) {
    const x = 343, y = 133;
    let ang = -2.685, px = 330, py = 96, blur = 0;
    if (T >= 80.56) { const u = smooth((T - 80.56) / 0.18); ang = lerp(-2.685, -3.12, u); px = lerp(330, 312, u); py = lerp(96, 108, u); blur = T < 80.78 ? 1 : 0; }
    const sc = { x: px, y: py, ang, L: 125, open: 0.08, top: 1, ring: 1.35 };
    return { kind: "frame", pose: HOLD_POSE, x, y, s: 0.34, sc, handSize: 12, blur };
  }
  // H) 80.80–81.18: facing us, wings open; the scissors fly off to the left (80.80–80.84)
  if (T < 81.18) {
    const [x, y] = interp([[80.8, 312, 138], [80.92, 316, 138], [81.04, 322, 139], [81.16, 316, 139]], T);
    const thrown = T < 80.86 ? { x: 75, y: 190, ang: 2.9, L: 100, open: 0.12, top: 1, ring: 1.3 } : null;
    const pose = T < 80.87 ? mergePose(FRONT_POSE, { wings: [
      { type: "spread", layer: "back", S: [-80, -20], Wr: [-170, -30], T: [-285, -10], trail: [0.2, 1], len: 60, spread: 0.8 }, FRONT_POSE.wings[1]] }) : FRONT_POSE;
    return { kind: "frame", pose, x, y, s: 0.36, sc: null, thrown };
  }
  // I) 81.18–81.50: leaning over to the corner
  if (T < 81.5) {
    const [x, y, rot] = interp([[81.18, 305, 140, -0.1], [81.28, 300, 146, -0.3], [81.36, 298, 146, -0.32], [81.48, 300, 144, -0.25]], T);
    return { kind: "frame", pose: REACH_POSE, x, y, s: S_TOP, flip: true, rot, sc: null };
  }
  // J) 81.50–84.04: walking right along the top edge, dragging the strip's back over (poses on twos)
  const fx = hold(FRONT_X, T)[0], c = cardAt(T);
  const x = 0.5 * (fx - 103) + 0.5 * (c[1][0] + 69) + 8;
  const step = FRONT_X.findIndex((k) => k[0] > T + 1e-6);
  const phase = (step < 0 ? FRONT_X.length : step) % 2;
  const root = [x, 133], sJ = 0.36;
  // the spread far wing fans out left over the card's top-right corner (source: tips 0–20 px right of it, 20–50 px above)
  const tip = [(c[1][0] + 12 - root[0]) / sJ, (c[1][1] - 38 - root[1]) / sJ], sh = [-15, -60];
  const wr = [sh[0] + 0.5 * (tip[0] - sh[0]), sh[1] + 0.5 * (tip[1] - sh[1]) - 35];
  const pose = mergePose(WALKJ_POSE, { wings: [{ ...WALKJ_POSE.wings[0], S: sh, Wr: wr, T: tip }, WALKJ_POSE.wings[1]], feet: [
    { x: phase ? -45 : 5, y: 135, rot: phase ? 0.5 : -0.2, size: 15, mode: "stand", leg: 26, seed: 2 },
    { x: phase ? 30 : -35, y: 132, rot: phase ? -0.3 : 0.4, size: 15, mode: "stand", leg: 22, seed: 5 },
  ] });
  if (T >= 83.94) return { kind: "frame", pose: mergePose(pose, { eyes: { state: "angry", look: [0.6, 0.3] } }), x: 1600, y: 170, s: 0.36, rot: 0.3, sc: null };
  return { kind: "frame", pose, x, y: 133, s: 0.36, sc: null };
}
function POSES_FLY_WINGS(f) {
  const up = 0.5 + 0.5 * f;
  return [
    { type: "spread", layer: "back", S: [-78, -46], Wr: [-190, lerp(10, -150, up)], T: [lerp(-300, -260, up), lerp(120, -280, up)], trail: [0.3, 1], len: 70, spread: 0.9 },
    { type: "spread", layer: "back", S: [78, -46], Wr: [190, lerp(10, -150, up)], T: [lerp(300, 260, up), lerp(120, -280, up)], trail: [-0.3, 1], len: 70, spread: 0.9 },
  ];
}

// ---------------------------------------------------------------- owl painting
let owlCanvas = null;
function buildOwl(st) {
  if (!owlCanvas) owlCanvas = document.createElement("canvas");
  let pose = st.pose, hand = null, gp = null;
  if (st.sc) {
    gp = gripPoint(st.sc);
    if (pose.wings && pose.wings.some((w) => w.grip)) {
      const rot = st.rot || 0;
      const d = V.rot([(gp[0] - st.x) / st.s, (gp[1] - st.y) / st.s], -rot);
      pose = { ...pose, wings: pose.wings.map((w) => { if (!w.grip) return w; hand = V.rot(V.nrm(V.sub(d, w.S)), rot); return { ...w, T: d }; }) };
    }
  }
  const L = owlLayer({ ...pose, x: st.x, y: st.y, s: st.s, rot: st.rot || 0, flip: !!st.flip, res: 2, detail: 1, canvas: owlCanvas, tone: false, extra: st.phones ? (gg, geo) => myPhones(gg, geo) : null });
  return { L, gp, hand };
}
function paintOwlRaw(g, st, B) {
  for (const l of st.legs || []) drawLeg(g, l.hip, l.foot, st.legW, st.toe, 1, 0);
  if (st.sc && st.scBehind) drawScissors(g, st.sc);
  g.drawImage(B.L.canvas, B.L.x, B.L.y, B.L.w, B.L.h);
  if (st.sc && !st.scBehind) {
    if (st.blur) {
      for (let k = 3; k >= 1; k--) { g.save(); g.globalAlpha = 0.22; drawScissors(g, { ...st.sc, ang: st.sc.ang + 0.18 * k }); g.restore(); }
    }
    drawScissors(g, st.sc);
    if (B.hand && st.handSize) drawHand(g, V.sub(B.gp, V.mul(B.hand, st.handSize * 0.5)), B.hand, st.handSize);
  }
  if (st.thrown) drawScissors(g, st.thrown);
}
function paintOwl(g, st, B) {
  if (st.kind === "edge") {
    const S = SIDES[st.side];
    g.save(); g.transform(S.d[0], S.d[1], S.m[0], S.m[1], S.O[0], S.O[1]); paintOwlRaw(g, st, B); g.restore();
  } else paintOwlRaw(g, st, B);
}

// ---------------------------------------------------------------- the frame
let OFF = null;
const OWL_GLOW = 0.36;
function scene(ctx, T) {
  const st = T < 79.76 ? edgeState(T) : frameState(T);
  const B = buildOwl(st);
  const uiPage = T < 79.76;
  const page = sokoPageCanvas({ gaze: "down", ui: uiPage });
  drawFramedPage(ctx, page, { glow: 1, over: (g) => {
    if (T < 79.76) drawDashes(g, dashCounts(T));
    else if (T < PEEL_T0) { drawStrip(g, T); if (T > 80.59 && T < 80.7) drawStrip(g, T - 0.06, 0.45); strokeQuad(g, outlineQuad(T), 6, RIM); }
    else drawPeel(g, T);
    paintOwl(g, st, B);
  } });
  // outside the screen: the lifted strip's top, the owl (over the room light), and the owl's own light
  const S = FRAMED.screen;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(S.x0, S.y0, S.x1 - S.x0, S.y1 - S.y0); ctx.clip("evenodd");
  if (T >= 79.76 && T < PEEL_T0) { drawStrip(ctx, T); strokeQuad(ctx, outlineQuad(T), 6, RIM); }
  paintOwl(ctx, st, B);
  ctx.restore();
  owlGlow(ctx, (g) => paintOwl(g, st, B), OWL_GLOW, 0.1, 0.75);
}

export const shot = {
  draw(ctx, local, t) {
    const T = srcT(t);
    if (T < 74.8) {
      if (!OFF) { OFF = document.createElement("canvas"); OFF.width = W; OFF.height = H; }
      const o = OFF.getContext("2d");
      o.setTransform(1, 0, 0, 1, 0, 0);
      scene(o, T);
      const [a, tx, d, ty] = interp(BUMP, T);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      ctx.setTransform(a, 0, 0, d, tx, ty); ctx.drawImage(OFF, 0, 0);
      ctx.restore();
      return;
    }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    scene(ctx, T);
    ctx.restore();
  },
  release() { owlCanvas = null; OFF = null; TORN = null; PAPER = null; releaseKit(); releaseSoko(); },
};
