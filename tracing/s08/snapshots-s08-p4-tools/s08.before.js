// s08 (30.56–32.60): screen close-up. The "Pure Imagination" page fills the frame: the red selection round the
// wordmark, the note card on the right, and "This is really good" typed into it letter by letter while the camera
// creeps in toward the card (a digital push-in anchored on the right edge of frame).
//
// Measured on the source:
//  - page mapping: the first frame shows page units x 670.6–1594.4, y 106.5–505 (2.388 px per unit, SIFT fit of the
//    close-up against the rectified laptop screen), with a black strip above F0 y ~11 (the edge of the source's
//    crop, it scrolls out of frame by 30.88);
//  - camera: tools/camtrack.py 30.56 32.60 0.04, then refit per frame by ECC (render vs source, similarity incl. the
//    source's slow ~0.03 deg roll): [local time, s, tx, ty, rot deg], frame(t) = s R(rot) frame(t0) + (tx, ty);
//  - typing: per-frame crops of the card (stabilised with the camera track): one letter every 3–4 frames;
//  - the first frame (F0) itself: most of the page is redrawn from shapes traced/refined on it (s08/ornaments.js:
//    lower left, cloud, ribbon), with colours solved through the screen light + film grade model, a fitted second
//    light pass, the card's light fall-off, and the capture's own texture (noise, mottle, scan striation) baked in.
// Everything is composed once at F0 resolution and the push-in scales that image (as the source does).
import { W, H } from "../config.js";
import { rng } from "../lib/rng.js";
import { purePageRegion, releasePure, PURE_SEL, PURE_CARD, PC } from "../lib/pureimg.js";
import { drawNoteCard } from "../lib/notecard.js";
import { sampleCurve } from "../lib/paths.js";
import { MARK } from "./s08/mark.js";
import { drawTrash2, TRASH2, drawSmiley2, SMILEY2, drawNub2 } from "./s08/card.js";
import { ORN, ORN_ZONE, CLOUD, CLOUD_ZONE, CLOUD_SPARKLE, RIB_B, RIB_C, RIB_ZONE } from "./s08/ornaments.js";

// frame(t0) -> page, measured: page = A0 * frame0 (tiny rotation included)
const A = 0.418768349, B = 0.00105950832, TX = 670.585031, TY = 106.503905;

// camera track (local time, s, tx, ty, rot in degrees): frame(t) = s * R(rot) * frame(t0) + (tx, ty); residual vs the
// source after the ECC refit < 0.05 px per frame
const CAM = [
  [0.00, 1.00019, -0.40, -0.23, -0.0022], [0.04, 1.00018, -0.38, -0.23, -0.0021], [0.08, 1.00055, -1.16, -0.56, -0.0003], [0.12, 1.00159, -3.48, -1.60, -0.0013],
  [0.16, 1.00333, -7.35, -3.21, -0.0019], [0.20, 1.00573, -12.56, -5.51, -0.0003], [0.24, 1.00869, -19.19, -8.32, 0.0002], [0.28, 1.01232, -27.23, -10.46, -0.0003],
  [0.32, 1.01658, -36.55, -10.53, 0.0002], [0.36, 1.02134, -47.08, -10.57, 0.0002], [0.40, 1.02668, -58.85, -10.63, 0.0028], [0.44, 1.03255, -71.84, -10.70, 0.0021],
  [0.48, 1.03898, -86.02, -10.75, 0.0007], [0.52, 1.04593, -101.27, -10.85, 0.0025], [0.56, 1.05333, -117.64, -10.90, 0.0023], [0.60, 1.06121, -135.10, -10.97, 0.0027],
  [0.64, 1.06957, -153.54, -11.05, 0.0037], [0.68, 1.07838, -172.98, -11.09, 0.0045], [0.72, 1.08770, -193.46, -11.22, 0.0034], [0.76, 1.09736, -214.77, -11.29, 0.0051],
  [0.80, 1.10734, -236.92, -11.29, 0.0062], [0.84, 1.11781, -259.93, -11.48, 0.0095], [0.88, 1.11781, -259.95, -11.47, 0.0091], [0.92, 1.12864, -283.79, -13.87, 0.0089],
  [0.96, 1.13982, -308.39, -18.66, 0.0086], [1.00, 1.15127, -333.59, -23.59, 0.0084], [1.04, 1.16298, -359.40, -28.68, 0.0092], [1.08, 1.17494, -385.80, -33.85, 0.0089],
  [1.12, 1.18686, -412.46, -38.79, 0.0102], [1.16, 1.19921, -439.68, -44.12, 0.0108], [1.20, 1.21158, -467.04, -49.44, 0.0109], [1.24, 1.22414, -494.65, -54.92, 0.0121],
  [1.28, 1.23662, -522.27, -60.30, 0.0135], [1.32, 1.24918, -549.93, -65.68, 0.0133], [1.36, 1.26162, -577.26, -71.12, 0.0170], [1.40, 1.27393, -604.40, -76.48, 0.0170],
  [1.44, 1.28602, -631.04, -81.77, 0.0191], [1.48, 1.29789, -657.16, -86.94, 0.0186], [1.52, 1.30921, -682.26, -91.83, 0.0202], [1.56, 1.32022, -706.53, -96.58, 0.0199],
  [1.60, 1.33074, -729.66, -101.17, 0.0215], [1.64, 1.34077, -751.62, -105.55, 0.0205], [1.68, 1.35009, -772.04, -109.62, 0.0214], [1.72, 1.35885, -790.87, -113.64, 0.0256],
  [1.76, 1.36652, -807.71, -116.95, 0.0241], [1.80, 1.37321, -822.45, -119.89, 0.0251], [1.84, 1.37887, -834.85, -122.39, 0.0263], [1.88, 1.37882, -834.80, -122.35, 0.0259],
  [1.92, 1.38331, -844.72, -124.27, 0.0255], [1.96, 1.38667, -852.02, -125.80, 0.0275], [2.00, 1.38871, -856.55, -126.68, 0.0278],
];
function cam(u) {
  const e = (c) => [c[0], c[1], c[2], c[3], c[4] || 0];
  if (u <= 0) return e(CAM[0]);
  for (let i = 1; i < CAM.length; i++) if (u <= CAM[i][0]) {
    const a = e(CAM[i - 1]), b = e(CAM[i]), f = (u - a[0]) / (b[0] - a[0]);
    return [u, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f, a[4] + (b[4] - a[4]) * f];
  }
  return e(CAM[CAM.length - 1]);
}

// Typing, read frame by frame: [local time the letter first shows, characters shown]. 30.56 already reads "This is r".
const FULL = "This is really good";
const TYPE = [[0, 9], [0.20, 10], [0.32, 11], [0.44, 12], [0.56, 13], [0.72, 14], [0.84, 15], [1.00, 16], [1.12, 17], [1.28, 18], [1.40, 19]];
const CARET_OFF = 1.52;   // the caret is steady while typing and gone from 32.08
function typed(u) {
  let n = TYPE[0][1];
  for (const [t, k] of TYPE) if (u + 0.001 >= t) n = k;
  return FULL.slice(0, n);
}

// The source close-up is a digital zoom of one video frame: everything is composed once at the first frame's
// resolution (F0, frame-t0 pixels) and the push-in scales that image, so it softens exactly as the source does.
let F0 = null, STATIC = null;
function pageToF0(g) {
  const det = A * A + B * B, ia = A / det, ib = B / det;
  // frame0 = Inv(A0) * (page - T)
  g.setTransform(ia, -ib, ib, ia, -(ia * TX + ib * TY), -(-ib * TX + ia * TY));
}
// The UI overlay (red selection, note card, typed text) is level in the source frame, while the page under it carries
// the page mapping's 0.145 deg rotation: the overlay is drawn with the same scale but no rotation, placed so the card
// centre stays where the rotated mapping put it (its edges were measured there), and the selection so its two visible
// runs sit on the source's line centres (measured in F0 on frames 764-771: top run y 487.4, right run x 1379.55).
const K = Math.hypot(A, B);
function uiOffsets() {
  const det = A * A + B * B, ia = A / det, ib = B / det;
  const px = PURE_CARD.x + CARD_DX + PURE_CARD.w / 2, py = PURE_CARD.y + PURE_CARD.h / 2;
  const fx = ia * (px - TX) + ib * (py - TY), fy = -ib * (px - TX) + ia * (py - TY);
  return [fx - px / K, fy - py / K];
}
function uiToF0(g) { const [ox, oy] = uiOffsets(); g.setTransform(1 / K, 0, 0, 1 / K, ox, oy); }
// geometric centres. The rendered line's red centroid lands 0.42 px up/left of them; the source's line drifts ~0.6 px up
// and ~0.5 px left against the camera track over the shot (early 487.35/1379.55, mid 486.67/1379.34, late
// 486.9/1379.0), so the static line splits the difference.
const SEL_LINE = { y: 487.55, x: 1379.8 };
function selToF0(g) { g.setTransform(1 / K, 0, 0, 1 / K, SEL_LINE.x - PURE_SEL.x1 / K, SEL_LINE.y - PURE_SEL.y0 / K); }
function buildStatic() {
  STATIC = document.createElement("canvas"); STATIC.width = W; STATIC.height = H;
  const g = STATIC.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  g.save();
  pageToF0(g);
  // page at 1:1 with the first frame (2.388 px per page unit), a touch soft like the source capture
  const region = purePageRegion(640, 96, 1606, 514, 2.39);
  g.filter = "blur(0.45px)";
  g.drawImage(region, 640, 96, 966, 418);
  g.filter = "none";
  g.restore();
  // most of the page redrawn from the first frame's shapes: the lower left ("ure", the lobes, fan and drips, the
  // date lines on top), the bottom-right cloud and the ribbon (U + pastel tail); then the stars and the pills
  overpaintLowerLeft(g);
  redrawStars(g);
  redrawPills(g);
  selectionLayer(g);
  g.save();
  uiToF0(g);
  // the card floats on a soft dark shadow thrown down and right (measured as the source / render ratio beside each
  // edge: ~0.7 near the right edge and under the bottom, fading by ~50 px; almost none left of and above the card)
  g.shadowColor = "rgba(0,0,0,0.6)"; g.shadowBlur = 44; g.shadowOffsetX = 9; g.shadowOffsetY = 16;
  g.fillStyle = "#000"; g.beginPath(); g.roundRect(PURE_CARD.x + 2, PURE_CARD.y + 2, PURE_CARD.w - 4, PURE_CARD.h - 4, 18); g.fill();
  g.shadowColor = "transparent";
  g.restore();
  // the black edge of the source's crop above the page: level in the frame, a crisp edge at F0 y ~10.3 in the render (source half-level at 9.7–9.9 after the grade) across the
  // width (half-level crossing measured every 200 px: 9.7–9.9)
  const strip = g.createLinearGradient(0, 9.7, 0, 11.0);
  strip.addColorStop(0, "rgba(0,0,0,1)"); strip.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = "#000"; g.fillRect(0, 0, W, 9.7);
  g.fillStyle = strip; g.fillRect(0, 9.7, W, 1.3);
  // screen light, measured on the source's dark background at the first frame: brighter centre-left,
  // falling off to the corners (it zooms with the picture, as in the source)
  g.save();
  g.globalCompositeOperation = "multiply";
  g.setTransform(1350, 0, 0, 700, 1150, 470);
  const v = g.createRadialGradient(0, 0, 0, 0, 0, 1.08);
  v.addColorStop(0, "#fff"); v.addColorStop(0.55, "#fff"); v.addColorStop(0.8, "#d8d8d8"); v.addColorStop(1, "#9e9e9e");
  g.fillStyle = v; g.fillRect(-2, -2, 4, 4);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const top = g.createLinearGradient(0, 0, 0, 260);
  top.addColorStop(0, "#b8b8b8"); top.addColorStop(1, "#fff");
  g.fillStyle = top; g.fillRect(0, 0, W, 260);
  g.globalCompositeOperation = "lighter";
  g.setTransform(1, 0, 0, 1, 0, 0);
  const l = g.createRadialGradient(950, 480, 0, 950, 480, 700);
  l.addColorStop(0, "rgba(9,10,8,1)"); l.addColorStop(1, "rgba(0,0,0,1)");
  g.fillStyle = l; g.fillRect(0, 0, W, H);
  g.restore();
  lightFix(g);
  groundTone(g);
}
// The dark ground left of the card is a touch warm and lifted in the render: source / render measured on flat ground
// pixels of frames 764-771 (F0), fitted as a quadratic field per channel (pre-grade, log gain / 1.14 for the grade's
// slope at these levels), applied to dark pixels only (full below luma 40, none above 70).
const GROUND_FIT = [
  [-0.2135, 0.0734, 0.4495, 0.0912, -0.364, -0.1315],    // R
  [0.0175, -0.1259, -0.1816, 0.14, -0.1101, 0.2277],     // G
  [-0.1326, 0.0771, 0.317, 0.0548, -0.1876, -0.198],     // B
];
function groundTone(g) {
  const x1 = 1460, img = g.getImageData(0, 0, x1, H), d = img.data;
  const gain = (c, u, v) => { const k = GROUND_FIT[c]; return Math.min(1.1, Math.max(0.8, Math.exp(k[0] + k[1] * u + k[2] * v + k[3] * u * u + k[4] * u * v + k[5] * v * v))); };
  const GX = 16, gw = Math.ceil(x1 / GX) + 1, gh = Math.ceil(H / GX) + 1, tab = new Float32Array(gw * gh * 3);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) for (let c = 0; c < 3; c++) tab[(j * gw + i) * 3 + c] = gain(c, (i * GX) / 1000, (j * GX) / 1000);
  for (let y = 0; y < H; y++) {
    const j = Math.min(gh - 1, Math.round(y / GX));
    for (let x = 0; x < x1; x++) {
      const o = (y * x1 + x) * 4, L = (d[o] + d[o + 1] + d[o + 2]) / 3;
      if (L >= 70) continue;
      const w = L <= 40 ? 1 : (70 - L) / 30, t = (j * gw + Math.min(gw - 1, Math.round(x / GX))) * 3;
      for (let c = 0; c < 3; c++) d[o + c] = Math.round(d[o + c] * (1 + w * (tab[t + c] - 1)));
    }
  }
  g.putImageData(img, 0, 0);
}
// Second light pass, fitted on the first frame in output space (needed pre-grade gain = source / render, from the
// cream letters and the dark ground, band by band): the lower third falls off (1.0 above y 690 to 0.845 at the
// bottom edge, the same across x), a little more at the far left, and the letters' band in the middle is ~4% brighter.
const GY = [[690, 1], [760, 0.955], [830, 0.905], [890, 0.87], [946, 0.845]];
function lightFix(g) {
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = "multiply";
  const y0 = GY[0][0], y1 = GY[GY.length - 1][0];
  const lg = g.createLinearGradient(0, y0, 0, y1);
  for (const [y, k] of GY) { const c = Math.round(255 * k); lg.addColorStop((y - y0) / (y1 - y0), `rgb(${c},${c},${c})`); }
  g.fillStyle = lg; g.fillRect(0, y0, W, H - y0);
  // far left: -4% (x < 150, from y ~560 down), soft
  const lf = g.createRadialGradient(-60, 900, 0, -60, 900, 420);
  lf.addColorStop(0, "rgb(242,242,242)"); lf.addColorStop(0.55, "rgb(245,245,245)"); lf.addColorStop(1, "rgb(255,255,255)");
  g.fillStyle = lf; g.fillRect(0, 480, 460, H - 480);
  // centre band lift (colour-dodge by d multiplies by 1/(1-d)): +4.5% round (950, 610), the e and the r
  g.globalCompositeOperation = "color-dodge";
  g.setTransform(1, 0, 0, 0.55, 950, 610);
  const lb = g.createRadialGradient(0, 0, 0, 0, 0, 380);
  lb.addColorStop(0, "rgb(11,11,11)"); lb.addColorStop(0.5, "rgb(8,8,8)"); lb.addColorStop(1, "rgb(0,0,0)");
  g.fillStyle = lb; g.fillRect(-390, -390, 780, 780);
  g.setTransform(1, 0, 0, 0.75, 1010, 800);
  const lb2 = g.createRadialGradient(0, 0, 0, 0, 0, 200);
  lb2.addColorStop(0, "rgb(9,9,9)"); lb2.addColorStop(0.5, "rgb(6,6,6)"); lb2.addColorStop(1, "rgb(0,0,0)");
  g.fillStyle = lb2; g.fillRect(-210, -210, 420, 420);
  g.restore();
}
// ---------------------------------------------------------------- the red selection
// Measured across both runs of the line at 30.56 (profiles every 300 px): an 11 px red core with a thin dark-red line
// just outside both edges, a touch heavier below and right (the source's edges also ring: a light fringe inside, a
// dark one outside, depending on the ground; variants were compared by the error along both runs, SEL_P is the best).
const SEL_P = { ow: 1.6, oo: 0.2, oa: 0.6, fr: 0, cr: 0.6, dx: 0, dy: 0 };
// The line over the dark ground on the left is dimmer in the source (it picks up the screen's fall-off there): x0.88
// at F0 x <= 100, 0.915 at 300, 0.95 at 500, 0.96 to x 900, 1 from x 1150 (measured on the red channel along the top
// run, frames 764-771). Drawn on its own layer,
// darkened there with a black source-atop ramp, then laid on the page.
const SEL_FALL = [[100, 0.88], [300, 0.915], [500, 0.95], [900, 0.96], [1150, 1]];
function selectionLayer(dst) {
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  selToF0(g);
  selection(g);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = "source-atop";
  const x0 = SEL_FALL[0][0], x1 = SEL_FALL[SEL_FALL.length - 1][0], ramp = g.createLinearGradient(x0, 0, x1, 0);
  for (const [x, k] of SEL_FALL) ramp.addColorStop((x - x0) / (x1 - x0), `rgba(0,0,0,${(1 - k).toFixed(3)})`);
  g.fillStyle = ramp; g.fillRect(0, 0, W, H);
  dst.save(); dst.setTransform(1, 0, 0, 1, 0, 0); dst.drawImage(c, 0, 0); dst.restore();
}
function selection(g) {
  const { x0, y0, x1, y1, width: w } = PURE_SEL, px = A;   // page units per F0 px
  const P = SEL_P, X = x0 + P.dx * px, Y = y0 + P.dy * px;
  g.save();
  g.lineJoin = "miter";
  g.lineWidth = w + P.ow * px; g.strokeStyle = `rgba(92,12,6,${P.oa})`;
  g.strokeRect(X + P.oo * px, Y + P.oo * px, x1 - x0, y1 - y0);
  if (P.fr) { g.lineWidth = w; g.strokeStyle = "#d4573a"; g.strokeRect(X, Y, x1 - x0, y1 - y0); }
  g.lineWidth = w - P.cr * px; g.strokeStyle = "#c63616"; g.strokeRect(X, Y, x1 - x0, y1 - y0);
  g.restore();
}

// ---------------------------------------------------------------- the two pills cut by the top edge
// Only their lower halves show, for the first ~0.4 s. Measured: the bodies end ~2.5 px lower than the page draws
// them, with a thinner rim, a lighter, softer grey; the second label is a longer word with a bracketed glyph.
function redrawPills(g) {
  g.save();
  pageToF0(g);
  g.filter = "blur(0.8px)";
  const y0 = 92, y1 = 127.3, r = (y1 - y0) / 2;
  for (const [x0, x1, label, glyph] of [[1200, 1295, "Register", false], [1318, 1442, "Tix & Info", true]]) {
    // a hard dark drop shadow 7.5 units down hides the ribbons under the pill (bands start at F0 y ~63 below both)
    g.beginPath(); g.roundRect(x0, y0 + 7.5, x1 - x0, y1 - y0, r); g.fillStyle = "#141a13"; g.fill();
    g.beginPath(); g.roundRect(x0, y0, x1 - x0, y1 - y0, r); g.fillStyle = "#d6d7cb"; g.fill();
    g.beginPath(); g.roundRect(x0, y0, x1 - x0, y1 - y0, r); g.lineWidth = 1.8; g.strokeStyle = "#20231c"; g.stroke();
    g.font = "600 14px Poppins"; g.fillStyle = "#2a2d26"; g.textAlign = "center";
    const tw = g.measureText(label).width, gw = glyph ? 22 : 0, cx = (x0 + x1) / 2 - gw / 2;
    g.fillText(label, cx, 115.5);
    if (glyph) {
      // "( v )": a small chevron in brackets
      const gx = cx + tw / 2 + 13;
      g.fillText("(", gx - 6, 115.5); g.fillText(")", gx + 7, 115.5);
      g.beginPath(); g.moveTo(gx - 3, 108); g.lineTo(gx + 0.5, 112); g.lineTo(gx + 4, 108);
      g.lineWidth = 1.8; g.strokeStyle = "#2a2d26"; g.lineCap = "round"; g.lineJoin = "round"; g.stroke();
    }
  }
  g.restore();
}

// ---------------------------------------------------------------- the three stars in the first frame
// The source's stars are slimmer (more concave arms), dimmer, and the big one on the U ribbon has a black keyline.
// The two on the ground are covered with ground and redrawn; the big one sits on the redrawn ribbon (which runs
// under it). F0 px, measured tip to tip on the first frame.
const STARS_F0 = [
  // x, y, rx, ry, colour (page space), keyline width, remove radius (centres and half-level radii along the axes and
  // diagonals measured on the first frame)
  [1006.7, 65.2, 39.6, 43.2, "rgb(212,214,207)", 11, 0, 0.42],
  [636.3, 238.9, 27.5, 29, "rgb(200,202,194)", 0, 36],
  [860.3, 210.5, 24.5, 22.5, "rgb(120,120,140)", 0, 32],
];
// star outline: four tips joined through four inner points on the diagonals (at w times the mean radius) by slightly
// concave edges (c: inward bow as a fraction of the edge length). Measured half-level radii on the first frame:
// the source's sparkles have straight-ish sides, a slim waist and full-width arms nearly to the tips.
const STAR_P = { w: 0.4, c: 0.04, k: 1.0, dy: 0 };
function starPath(g, x, y, rx, ry, w = STAR_P.w, c = STAR_P.c) {
  const k = STAR_P.k; rx *= k; ry *= k;
  const ri = w * (rx + ry) / 2, d = Math.SQRT1_2 * ri;
  const T = [[x, y - ry], [x + rx, y], [x, y + ry], [x - rx, y]];
  const I = [[x + d, y - d], [x + d, y + d], [x - d, y + d], [x - d, y - d]];
  const edge = (a, b) => {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const vx = x - mx, vy = y - my, vl = Math.hypot(vx, vy) || 1;
    g.quadraticCurveTo(mx + (vx / vl) * c * L, my + (vy / vl) * c * L, b[0], b[1]);
  };
  g.beginPath(); g.moveTo(T[0][0], T[0][1]);
  for (let q = 0; q < 4; q++) { edge(T[q], I[q]); edge(I[q], T[(q + 1) % 4]); }
  g.closePath();
}
function redrawStars(g) {
  for (const [x, y, rx, ry, col, lw, rr, sw] of STARS_F0) {
    g.save();
    if (rr) {
      // cover the old star with the page ground
      g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.clip();
      pageToF0(g);
      g.fillStyle = PAGE_BG; g.fillRect(600, 50, 1100, 600);
      const lift = g.createRadialGradient(820, 470, 60, 820, 470, 900);
      lift.addColorStop(0, "rgba(40,50,38,0.55)"); lift.addColorStop(1, "rgba(40,50,38,0)");
      g.fillStyle = lift; g.fillRect(600, 50, 1100, 600);
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
    g.filter = "blur(0.6px)";
    starPath(g, x, y + STAR_P.dy, rx, ry, sw ?? STAR_P.w);
    if (lw) { g.lineJoin = "round"; g.lineWidth = lw; g.strokeStyle = KEYLINE; g.stroke(); }
    g.fillStyle = col; g.fill();
    g.restore();
  }
}

// ---------------------------------------------------------------- redrawn page regions (F0 px)
const PAGE_BG = "#1c241b", PAGE_CREAM = "#cfd0c5", KEYLINE = "#170a05";
function ornPath(g, flat, straight) {
  const pts = [];
  for (let i = 0; i < flat.length; i += 2) pts.push([flat[i], flat[i + 1]]);
  const s = straight ? pts : sampleCurve(pts, 3, true);
  g.beginPath(); g.moveTo(s[0][0], s[0][1]);
  for (let i = 1; i < s.length; i++) g.lineTo(s[i][0], s[i][1]);
  g.closePath();
}
// The date lines, measured against the source's first frame: bold (Poppins 700) with a thin dark rim; line 1 is
// 2.2% wider than the page's own layout about page x 836.9 with 6% taller glyphs; "Linden Hollow" is 5.25% larger
// about page x 697.8 and sits 2 units lower (its feet go under the red selection line, as in the source).
let _dateSize = null;
function dateLines(g) {
  g.save();
  pageToF0(g);
  g.font = "600 100px Poppins";
  if (!_dateSize) _dateSize = (100 * 249) / g.measureText("24 - April 26, 2025").width;
  const s0 = _dateSize;
  const lines = [
    // text, page-layout font size, page-layout left x, baseline, scale, fixed x, dy, colour
    ["April 24 - April 26, 2025", s0, null, 275.5, DATE1.k, 836.9, DATE1.dy, DATE1.col, DATE1.v],
    ["Linden Hollow", s0 * 0.72, 717, 309.5, DATE2.k, 697.8, DATE2.dy, DATE2.col, DATE2.v],
  ];
  const glyphs = [];
  for (const [text, size, x0, base, k, fx, dy, col, v] of lines) {
    g.font = `600 ${size.toFixed(2)}px Poppins`;
    const x = x0 ?? 981 - g.measureText(text).width;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === " ") continue;
      const c = x + g.measureText(text.slice(0, i)).width + g.measureText(ch).width / 2;
      glyphs.push([ch, fx + (c - fx) * k, base + dy, size * k, col, v, col === DATE1.col]);
    }
  }
  g.textAlign = "center";
  g.lineJoin = "round";
  g.shadowColor = "rgba(0,0,0,0.6)"; g.shadowBlur = 4; g.shadowOffsetX = 1; g.shadowOffsetY = 1.5;
  const at = (cx, by, v) => { pageToF0(g); g.translate(cx, by); g.scale(1, v); };
  g.filter = "blur(0.8px)";
  for (const [ch, cx, by, sz, , v, l1] of glyphs) { at(cx, by, v); g.font = `${DATE_W} ${sz.toFixed(2)}px Poppins`; g.lineWidth = DATE_RIM * (l1 ? 1 : 0.75); g.strokeStyle = DATE_RIM_COL; g.strokeText(ch, 0, 0); }
  g.shadowColor = "transparent";
  // the source's letters are a touch see-through (they pick up the pink and purple lobes under "rch") and dimmer
  // toward the left: fill alpha 0.93 at page x 670 rising to 0.99 at page x 990 (measured on the glyph cores)
  for (const [ch, cx, by, sz, col, v, l1] of glyphs) {
    at(cx, by, v); g.font = `${DATE_W} ${sz.toFixed(2)}px Poppins`; g.fillStyle = col;
    g.globalAlpha = 0.93 + 0.06 * Math.min(1, Math.max(0, (cx - 670) / 320));
    g.fillText(ch, 0, 0);
    // line 1 sits between Poppins 600 and 700 in the source, bolder toward "2023" (glyph area and mean level measured
    // per word, early and late): the 600 glyphs are emboldened with a stroke of their own colour
    if (l1) { g.lineWidth = Math.min(0.62, Math.max(0.15, 0.2 + ((cx - 790) / 170) * 0.38)); g.strokeStyle = col; g.strokeText(ch, 0, 0); }
    // a thin dark edge over the fill: the source's glyphs are slimmer (the 0's counter is ~3 px wider) with the rim
    // eating into them
    if (DATE_ERODE[1]) { g.globalAlpha = DATE_ERODE[1]; g.lineWidth = DATE_ERODE[0]; g.strokeStyle = DATE_RIM_COL; g.strokeText(ch, 0, 0); }
  }
  g.globalAlpha = 1;
  g.filter = "none";
  g.restore();
}
// k: horizontal layout scale about the fixed x; v: extra vertical glyph scale about the baseline (measured cap heights)
// Fix pass: glyph cores measured 3-10 levels brighter than the render, B more so; the source's rim is a ~3 px dip
// to ~15 outside every glyph (the render's was washed out by the blur): a wider, darker rim (page units)
const DATE1 = { k: 1.0218, dy: 0.45, v: 1.06, col: "rgb(212,215,207)" }, DATE2 = { k: 1.0525, dy: 2.0, v: 1.03, col: "rgb(210,212,205)" };
const DATE_RIM = 2.6, DATE_RIM_COL = "rgba(6,5,4,0.95)", DATE_W = 600, DATE_ERODE = [0.5, 0];
// Repaint a zone of the static frame from traced shapes: page ground, keylines (every stroked shape first), fills,
// then extra drawing on top; composited a touch soft like the page. shapes: [colour | "C" | gradient, flat points,
// flag]; flag 1 = straight-edged polygon, 2 = no keyline, 3 = inside a letter (keylined again right before its fill),
// 4 = keylined again right before its fill with a heavier line (a shape laid over a neighbour with a ~7 px gap).
// layered: each shape keylined then filled in order (a shape covers the ones before it).
function shapeFill(g, col) {
  if (col === "C") return PAGE_CREAM;
  if (typeof col === "string") return col;
  const [x0, y0, x1, y1, c0, c1] = col, gr = g.createLinearGradient(x0, y0, x1, y1);
  gr.addColorStop(0, c0); gr.addColorStop(1, c1);
  return gr;
}
function overpaint(dst, zonePts, shapes, after, layered = false, lw = 10, soft = 0.5, key = null) {
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  const zone = (q) => { q.beginPath(); zonePts.forEach(([x, y], i) => (i ? q.lineTo(x, y) : q.moveTo(x, y))); q.closePath(); };
  // the page ground (as drawPurePage paints it: flat ground + the faint lift toward the middle)
  g.save(); zone(g); g.clip();
  pageToF0(g);
  g.fillStyle = PAGE_BG; g.fillRect(600, 50, 1100, 600);
  const lift = g.createRadialGradient(820, 470, 60, 820, 470, 900);
  lift.addColorStop(0, "rgba(40,50,38,0.55)"); lift.addColorStop(1, "rgba(40,50,38,0)");
  g.fillStyle = lift; g.fillRect(600, 50, 1100, 600);
  g.restore();
  g.lineJoin = "round"; g.lineWidth = lw; g.strokeStyle = key ? key(g) : KEYLINE;
  if (layered) {
    for (const [col, pts, fl] of shapes) {
      ornPath(g, pts, fl === 1);
      if (fl !== 2) g.stroke();
      g.fillStyle = shapeFill(g, col); g.fill();
    }
  } else {
    const ks = g.strokeStyle;
    for (const [, pts, fl] of shapes) if (fl !== 2) { ornPath(g, pts, fl === 1); g.strokeStyle = fl === 1 ? FAN_KEY : ks; g.stroke(); }
    g.strokeStyle = ks;
    for (const [col, pts, fl] of shapes) {
      ornPath(g, pts, fl === 1);
      if (fl === 3) g.stroke();
      if (fl === 4) { g.lineWidth = lw * 1.35; g.stroke(); g.lineWidth = lw; }
      g.fillStyle = shapeFill(g, col); g.fill();
    }
  }
  if (after) after(g);
  dst.save();
  dst.setTransform(1, 0, 0, 1, 0, 0);
  zone(dst); dst.clip();
  dst.filter = `blur(${soft}px)`;
  dst.drawImage(c, 0, 0);
  dst.filter = "none";
  dst.restore();
}
function overpaintLowerLeft(dst) {
  overpaint(dst, ORN_ZONE, ORN, (g) => { ornExtra(g); dateLines(g); }, false, 10, 0.5, ornKey);
  overpaint(dst, CLOUD_ZONE, CLOUD, (g) => { sparkle(g); cloudShade(g); }, true, 11);
  overpaint(dst, RIB_ZONE, [], ribbon, false, 10, 0.9);
  overpaint(dst, LOGO_ZONE, [], logoMark, false, 10, MARK_SOFT);
}
// Keylines in the lobes and fan (upper part of the lower-left, above F0 y ~600) are no darker than the ground in the
// source (minima 15-30 against ground ~17-20; the render's were 5-11): lifted there, full black below y ~640.
function ornKey(g) {
  const k = g.createLinearGradient(0, 600, 0, 645);
  k.addColorStop(0, ORN_KEY_LIFT); k.addColorStop(1, KEYLINE);
  return k;
}
const ORN_KEY_LIFT = "#1c241b", FAN_KEY = "#1e1a14";   // lift = the page ground colour
// Two traced pieces the first pass missed (F0 px): the salmon stripe between the r's outer keyline and its yellow
// crescent (x 576-585, y 735-806, measured ~(135,105,88) out -> page colour through the light), and the near-black
// wedge at the bottom of the u (half-level edges: tip (227.5, 910), right edge ~x 227, left edge to (193, 946)).
const SALMON = [581, 735, 584, 740, 584.6, 750, 583.2, 762, 582, 775, 581.6, 788, 582.6, 798, 585.5, 806, 579.5, 807, 577.4, 796, 576.1, 786, 576.2, 772, 577.1, 760, 578.9, 748, 579.8, 739];
const WEDGE = [227.6, 909.2, 224.2, 914.6, 220.3, 920.6, 212.3, 929.6, 202.3, 938.6, 193, 945.6, 189, 950, 228.6, 950, 228, 930, 228.3, 915];
function ornExtra(g) {
  g.save();
  g.fillStyle = "#906f5e"; ornPath(g, SALMON, false); g.fill();
  g.fillStyle = "#0c0d0a"; ornPath(g, WEDGE, true); g.fill();
  g.restore();
}
// ---------------------------------------------------------------- the top-left mark (original, s08/mark.js)
// Drawn over the page's own logo slot: the page ground, then a dark keyline (measured on the source: ~3 px of
// near-black outside the top/left edges, ~6 px below/right), then the monoline cream stroke.
const LOGO_ZONE = [[150, 0], [492, 0], [492, 180], [150, 180]];
const MARK_KEY = "#050605", MARK_SOFT = 0.8, MARK_K = { w0: 4, w1: 6, dx: 1.6, dy: 1.8 };
function logoMark(g) {
  const { slant, lines, w, dot } = MARK, P = [];
  for (const L of lines) for (const st of L.strokes) {
    const pts = [];
    for (let i = 0; i < st.length; i += 2) pts.push([st[i] + (L.base - st[i + 1]) * slant, st[i + 1]]);
    P.push(sampleCurve(pts, 6));
  }
  const trace = (dx, dy) => {
    g.beginPath();
    for (const s of P) { g.moveTo(s[0][0] + dx, s[0][1] + dy); for (let i = 1; i < s.length; i++) g.lineTo(s[i][0] + dx, s[i][1] + dy); }
  };
  const disc = (dx, dy, r) => { g.beginPath(); g.arc(dot[0] + dx, dot[1] + dy, r, 0, Math.PI * 2); g.fill(); };
  g.save();
  g.lineCap = "round"; g.lineJoin = "round";
  g.strokeStyle = MARK_KEY; g.fillStyle = MARK_KEY;
  g.lineWidth = w + MARK_K.w1; trace(MARK_K.dx, MARK_K.dy); g.stroke();
  g.lineWidth = w + MARK_K.w0; trace(0, 0); g.stroke();
  disc(MARK_K.dx * 0.5, MARK_K.dy * 0.5, dot[2] + 2.5);
  g.strokeStyle = PC.creamDim; g.fillStyle = PC.creamDim;
  g.lineWidth = w; trace(0, 0); g.stroke();
  g.globalAlpha = 0.55; disc(0, 0, dot[2]); g.globalAlpha = 1;
  g.restore();
}
// The ribbon (U + pastel tail) between its five measured boundary lines: each band is painted along its length with
// the colour measured there (short overlapping strokes of the centre line, clipped to the band), then the keylines.
const RIB_KEY = 5.4;   // keyline width: the source's measure ~6-8 px at half depth, soft
function polyPts(flat) { const p = []; for (let i = 0; i < flat.length; i += 2) p.push([flat[i], flat[i + 1]]); return p; }
function ribbon(g) {
  const B = RIB_B.map(polyPts);
  for (let i = 0; i < 4; i++) {
    g.save();
    g.beginPath();
    B[i].forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y)));
    for (let k = B[i + 1].length - 1; k >= 0; k--) g.lineTo(B[i + 1][k][0], B[i + 1][k][1]);
    g.closePath(); g.clip();
    const C = RIB_C[i], n = C.length / 6;
    g.lineCap = "round"; g.lineJoin = "round";
    for (let j = 0; j < n - 1; j++) {
      const o = j * 6, q = o + 6;
      g.strokeStyle = `rgb(${C[o + 3]},${C[o + 4]},${C[o + 5]})`;
      g.lineWidth = Math.max(C[o + 2], C[q + 2]) * 1.6 + 16;
      g.beginPath(); g.moveTo(C[o], C[o + 1]); g.lineTo(C[q], C[q + 1]); g.stroke();
    }
    g.restore();
  }
  g.lineJoin = "round"; g.lineCap = "round"; g.lineWidth = RIB_KEY; g.strokeStyle = KEYLINE;
  for (const b of B) { g.beginPath(); b.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); }
}
// the card's shadow is deepest by its bottom-right corner, on the cloud (measured source / render ~0.9 within
// ~60 px of the corner, after the general shadow)
function cloudShade(g) {
  g.save();
  g.globalCompositeOperation = "multiply";
  const r = g.createRadialGradient(1905, 812, 0, 1905, 812, 95);
  r.addColorStop(0, "rgb(232,232,232)"); r.addColorStop(0.5, "rgb(243,243,243)"); r.addColorStop(1, "rgb(255,255,255)");
  g.fillStyle = r; g.fillRect(1800, 700, 220, 220);
  g.restore();
}
// the four-point sparkle on the cloud's left shoulder (as the page draws its stars), keylined
function sparkle(g) {
  const { x, y, rx, ry, col } = CLOUD_SPARKLE, k = 0.2;
  g.beginPath();
  g.moveTo(x, y - ry);
  g.quadraticCurveTo(x + rx * k, y - ry * k, x + rx, y);
  g.quadraticCurveTo(x + rx * k, y + ry * k, x, y + ry);
  g.quadraticCurveTo(x - rx * k, y + ry * k, x - rx, y);
  g.quadraticCurveTo(x - rx * k, y - ry * k, x, y - ry);
  g.closePath();
  g.lineWidth = 7; g.strokeStyle = KEYLINE; g.stroke();
  g.fillStyle = col; g.fill();
}

// The card (the only thing that changes) is redrawn into F0 each frame, then lit by the screen light.
// Card colours: the "screen" theme with the source's darker typed ink (~#232321) and CANCEL (~#646460), measured.
const CARD_THEME = { paper: "#e4e3d9", paperTop: "#d4d4c9", paperBot: "#c5c5bb", ink: "#1b1b19", text: "#1d1d1b", muted: "#646460", outline: "rgba(20,16,14,0.55)", smiley: "#b4a648", smileyHi: "#c4ba5d", glow: "210,86,58", face: "#3b3222",
  // the smiley's disc and its halo measured in rings round its centre at 30.56
  glowR: 1.4, glowStops: [[0, 1], [0.3, 0.85], [0.44, 0.63], [0.56, 0.41], [0.69, 0.22], [0.83, 0.09], [1, 0]],
  rim: { dx: -3.3, dy: -1.4, color: "rgba(10,11,8,0.8)", nub: { dx: -2.8, dy: -3.8 } },
  // card edges measured at 30.56 (subpixel, median over each side): F0 x 1451.3–1913.3, y 183.7–830.5, i.e. 0.9 unit in
  // on the left and 2 units lower at the bottom than the layout's 465 x 648
  body: [0.88, 0.53, 464.83, 650.04],
  // the text box and button row, measured (line centres, subpixel): 3.9 units of darker ink, 0.6 unit up/left of the
  // layout; the button row 1.2 lower, its divider 1 unit left
  area: { x0: 50.3, y0: 159.4, x1: 422.5, y1: 599.85, lw: 3.9, btnY: 533.7, divX: 236 }, trashLw: 3.8 };
// The card sits 1.2 F0 px (0.5 page units) left of the page layout (edges and inner lines measured at 30.60 and by
// patch registration at 32.0-32.56). In F0 px: left 1451.3, right 1913.3, top 183.7, bottom 830.5.
const CARD_DX = -0.5;
const CARD_F0 = { x: 1451.3, y: 183.7, w: 462, h: 646.9, r: 44.8 };
// The card's paper as drawNoteCard paints it (card units)
function paperGrad(g) {
  const b = g.createLinearGradient(0, 0, 0, 648);
  b.addColorStop(0, CARD_THEME.paperTop); b.addColorStop(0.3, CARD_THEME.paper); b.addColorStop(0.62, CARD_THEME.paper); b.addColorStop(1, CARD_THEME.paperBot);
  return b;
}
// Parts of the card redrawn to the source's measure (s08/card.js): the nub, the trash icon, and the smiley's old
// disc and halo painted out (the new smiley is drawn in F0 px afterwards). Called in the card's page transform.
function cardParts(g) {
  const s = PURE_CARD.w / 465;
  g.translate(PURE_CARD.x + CARD_DX, PURE_CARD.y); g.scale(s, s);
  const paper = paperGrad(g);
  drawNub2(g, paper, CARD_THEME.body[0]);
  g.fillStyle = paper;
  const [tx, ty, tw, th] = TRASH2.cover; g.fillRect(tx, ty, tw, th);
  drawTrash2(g, CARD_THEME.ink);
  const [sx, sy, sr] = SMILEY2.cover; g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.fill();
}
// The typed text: the source's monospace is a plain-"r" Menlo/DejaVu-style face (Geist Mono as fallback).
function typedText(g, text, caret) {
  // card units (465 wide), same transform as drawNoteCard
  const s = PURE_CARD.w / 465;
  g.save();
  g.translate(PURE_CARD.x + CARD_DX, PURE_CARD.y); g.scale(s, s);
  g.font = `400 ${TXT.size}px Menlo, 'Geist Mono', monospace`; g.textAlign = "left"; g.textBaseline = "alphabetic";
  g.letterSpacing = `${TXT.ls}px`;
  g.fillStyle = CARD_THEME.text;
  if (text) {
    g.fillText(text, TXT.x, TXT.y);
    // the source's strokes are lighter than Menlo's: erode the glyph edges with the paper
    if (TXT.erode) { g.lineWidth = TXT.erode; g.strokeStyle = CARD_THEME.paper; g.lineJoin = "round"; g.strokeText(text, TXT.x, TXT.y); }
  }
  // caret measured in F0 on frames 770-771 and 796-798: ~1 unit right of the old one, top 3.3 higher, 26.3 tall, thinner
  if (caret) { const w = g.measureText(text).width; g.fillStyle = CARET.col; g.fillRect(TXT.x + w + TXT.cx + CARET.dx, TXT.y - CARET.top, CARET.w, CARET.h); }
  g.letterSpacing = "0px";
  g.restore();
}
// Measured against the source's glyph profiles at 31.72–32.56 (horizontal and vertical ink profiles in the text box):
// the source's face is Menlo-like but 5% shorter for the same advance (15.5 units) and lighter in weight.
const TXT = { x: 82.75, y: 208.5, size: 25.4, ls: 0.3, erode: 0.42, cx: 1 };   // (text ink measured within 0.2% of the source's)
const CARET = { dx: 1.05, top: 24.3, h: 26.3, w: 2.65, col: "#262624" };
// Screen light on the card, measured (output luma, source minus flat card at 30.60): no change within ~155 px of
// the card's left-middle (F0 1450, 510), then a linear fall to about -26 levels at the far corners (vertical
// distances count 0.8x). Converted to a pre-grade multiply through the grade's S-curve (slope ~0.87 here).
// (Built once as a pixel field that is white off the card: in the film's browser build a curved clip combined with a
// multiply draws nothing.)
const CARD_LIGHT = [[0, 1], [155, 1], [350, 238 / 255], [530, 221 / 255], [620, 213 / 255]];
let CARD_LF = null;
const CARD_FIT = [0.513, 0.012, 1.019, 3.795, 0.487, 0.429], CARD_CORNER = [3.2, 8];
function cardLightField() {
  const C = CARD_F0, w = Math.ceil(C.w + 4), h = Math.ceil(C.h + 4), x0 = Math.floor(C.x - 2), y0 = Math.floor(C.y - 2);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const cg = c.getContext("2d"), img = cg.createImageData(w, h), d = img.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const x = x0 + i + 0.5, y = y0 + j + 0.5, r = Math.hypot(x - 1450, (y - 510) * 0.8);
    let k = CARD_LIGHT[CARD_LIGHT.length - 1][1];
    for (let q = 1; q < CARD_LIGHT.length; q++) if (r <= CARD_LIGHT[q][0]) { const [ra, ka] = CARD_LIGHT[q - 1], [rb, kb] = CARD_LIGHT[q]; k = ka + (kb - ka) * (r - ra) / (rb - ra); break; }
    // only on the card: coverage of the rounded rectangle (1 px soft edge), white elsewhere
    const qx = Math.max(Math.abs(x - (C.x + C.w / 2)) - (C.w / 2 - C.r), 0), qy = Math.max(Math.abs(y - (C.y + C.h / 2)) - (C.h / 2 - C.r), 0);
    const cov = Math.min(1, Math.max(0, C.r + 1 - Math.hypot(qx, qy)));
    // residual brightness over the card, fitted (source minus render, output levels, flat paper pixels at 30.56) as a
    // quadratic: +4 at the left and right edges, ~0 in the middle; applied pre-grade (slope ~0.87), relative to the
    // paper colours, which are 3.1% lighter to leave room for it
    const fu = (x - 1682) / 230, fv = (y - 507) / 323;
    let dl = CARD_FIT[0] + CARD_FIT[1] * fu + CARD_FIT[2] * fv + CARD_FIT[3] * fu * fu + CARD_FIT[4] * fu * fv + CARD_FIT[5] * fv * fv;
    // fix pass: the right edge and the bottom-right corner measured 2-4 (edge) to ~10 (corner) levels too bright
    const sx = Math.min(1, Math.max(0, (x - 1800) / 105)), sy = Math.min(1, Math.max(0, (y - 560) / 270));
    dl -= CARD_CORNER[0] * sx * (0.6 + 0.4 * sy) + CARD_CORNER[1] * sx * sy * sy;
    k = (k * (1 + dl / 178)) / 1.031;
    k = 1 - cov * (1 - k);
    const o = (j * w + i) * 4, v = Math.round(255 * k);
    d[o] = d[o + 1] = d[o + 2] = v; d[o + 3] = 255;
  }
  cg.putImageData(img, 0, 0);
  CARD_LF = { c, x0, y0 };
}
function cardLight(g) {
  if (!CARD_LF) cardLightField();
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = "multiply";
  g.drawImage(CARD_LF.c, CARD_LF.x0, CARD_LF.y0);
  g.restore();
}
// The source frame's own texture, measured on flat ground and on the card at 30.60 (band-pass std, output levels):
// fine capture noise that grows with brightness (~0.3 on the ground, ~2.3 on the card: a multiplicative layer) and
// a mottle of 3-8 px blobs, ~1-1.5 levels on both (soft-light, two scales), and fine horizontal scan striation.
// Seeded, built once, static in F0.
let TEX = null;
function buildTexture() {
  const r = rng(80830561);
  const blobs = (cell, amp) => {
    const sw = Math.ceil(W / cell) + 1, sh = Math.ceil(H / cell) + 1;
    const small = document.createElement("canvas"); small.width = sw; small.height = sh;
    const sg = small.getContext("2d"), si = sg.createImageData(sw, sh), sd = si.data;
    for (let i = 0; i < sd.length; i += 4) {
      const n = (r() + r() + r() - 1.5) * 2;
      const v = Math.round(128 + amp * n);
      sd[i] = sd[i + 1] = sd[i + 2] = v; sd[i + 3] = 255;
    }
    sg.putImageData(si, 0, 0);
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const cg = c.getContext("2d");
    cg.imageSmoothingEnabled = true; cg.imageSmoothingQuality = "high";
    cg.drawImage(small, 0, 0, sw * cell, sh * cell);
    return c;
  };
  const mottle = [blobs(3, MOTTLE[0]), blobs(6, MOTTLE[1])];
  // fine layer (multiplicative): per-pixel noise plus a share of the 3 px blobs, so bright surfaces mottle too
  const bd = mottle[0].getContext("2d").getImageData(0, 0, W, H).data;
  const fine = document.createElement("canvas"); fine.width = W; fine.height = H;
  const fg = fine.getContext("2d"), img = fg.createImageData(W, H), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() + r() + r() - 1.5) * 2;          // ~N(0,1)
    const v = Math.round(255 * (FINE_MEAN + FINE_STD * n + FINE_BLOB * (bd[i] - 128) / MOTTLE[0]));
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  fg.putImageData(img, 0, 0);
  TEX = { fine, mottle };
}
// fix pass: the static layer carried most of the per-frame texture; with the capture's temporal noise now added per
// frame (captureNoise), it is cut to what is left of the source's spatial texture (high-pass std on flat ground ~0.5
// in the dark, ~1.8 on the paper)
const FINE_MEAN = 0.98, FINE_STD = 0.0075, FINE_BLOB = 0.008, MOTTLE = [5, 3];
// the capture's horizontal scan striation: period 2.09 px in the first frame (2.7 px by 32.0, so it is in the zoomed
// frame), ~1.7-2.3% of the level in the source, phase fitted on the card and the letters
// Fix pass: no longer baked into F0 (resampling the near-Nyquist 2.09 px pattern with the push-in made a spurious
// 2.46 px beat); drawn per frame through the camera from a finely sampled profile, so each output pixel samples the
// continuous grating: multiply by 1 - A + A sin(...), then colour-dodge by A (exactly 1 / (1 - A)). A = 11/255: a 4.5%
// modulation of 2% (measured at the expected period on the card paper, frames 770-814: the source's sine amplitude is
// 2.1-2.4 levels at ~215, 1.8-2.0x the old baked layer's).
const STRIPE_A = 5, STRIPE_P = 2.09, STRIPE_PH = (-77 * Math.PI) / 180, STRIPE_OS = 8;
let STRIPE_C = null;
function stripeCanvas() {
  const c = document.createElement("canvas"); c.width = 1; c.height = H * STRIPE_OS;
  const g = c.getContext("2d"), img = g.createImageData(1, c.height), d = img.data, A = STRIPE_A / 255;
  for (let k = 0; k < c.height; k++) {
    const y = (k + 0.5) / STRIPE_OS, v = Math.round(255 * (1 - A + A * Math.sin((2 * Math.PI * y) / STRIPE_P + STRIPE_PH)));
    d[k * 4] = d[k * 4 + 1] = d[k * 4 + 2] = v; d[k * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}
function striation(ctx, m) {
  if (!STRIPE_C) STRIPE_C = stripeCanvas();
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "low";
  ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(STRIPE_C, 0, 0, 1, STRIPE_C.height, -200, 0, W + 400, H);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "color-dodge";
  ctx.fillStyle = `rgb(${STRIPE_A},${STRIPE_A},${STRIPE_A})`; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
// The capture's temporal noise, measured on the source's held frames (785/786, 810/811: the same picture twice):
// frame-difference std 4.2 (dark) - 4.9 (bright), luma only, correlated over ~2-3 px (autocorrelation 0.79, 0.48, 0.22
// at lags 1-3), i.e. coarser and ~1.7x stronger than the film grain. Added in output space per source frame: seeded
// white noise on a 3 px grid, bilinear-upsampled, split into its positive part (added, "lighter") and negative part
// (subtracted, "difference": |dst - q| = dst - q wherever dst >= q). The grade's own grain is turned down to match.
// The source's noise is stronger on bright ground (4.9 vs 4.2 frame-difference std): the noise is scaled by a gain map
// built from the static frame's (blurred) luma, carried by the camera: NOISE_G[0] on the dark ground, 1 on the paper.
const NOISE_C = 3, NOISE_A = 6.7, NOISE_G = [0.74, 60, 160];
let NOISE = null;
function noiseGain() {
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  // from a fixed composition (the static frame + the finished card), so the map never depends on which frame a
  // worker happens to render first
  const base = document.createElement("canvas"); base.width = W; base.height = H;
  const bg = base.getContext("2d"); bg.drawImage(STATIC, 0, 0); drawCard(bg, 2);
  g.filter = "blur(6px)"; g.drawImage(base, 0, 0); g.filter = "none";
  const img = g.getImageData(0, 0, W, H), d = img.data, [g0, l0, l1] = NOISE_G;
  for (let i = 0; i < d.length; i += 4) {
    const L = (d[i] + d[i + 1] + d[i + 2]) / 3, t = Math.min(1, Math.max(0, (L - l0) / (l1 - l0))), k = g0 + (1 - g0) * t * t * (3 - 2 * t);
    d[i] = d[i + 1] = d[i + 2] = Math.round(255 * k); d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}
function captureNoise(ctx, frame, m) {
  const sw = Math.ceil(W / NOISE_C) + 2, sh = Math.ceil(H / NOISE_C) + 2;
  if (!NOISE) {
    const mk = () => { const c = document.createElement("canvas"); c.width = sw; c.height = sh; return c; };
    const big = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };
    NOISE = { P: mk(), Q: mk(), T: big(), gain: noiseGain() };
    NOISE.pi = NOISE.P.getContext("2d").createImageData(sw, sh); NOISE.qi = NOISE.Q.getContext("2d").createImageData(sw, sh);
  }
  const r = rng(0x5eed0800 + frame * 7919), pd = NOISE.pi.data, qd = NOISE.qi.data;
  for (let i = 0; i < pd.length; i += 4) {
    const n = (r() + r() + r() + r() - 2) * 1.732 * NOISE_A, v = Math.round(Math.abs(n));
    const p = n > 0 ? v : 0, q = n < 0 ? v : 0;
    pd[i] = pd[i + 1] = pd[i + 2] = p; pd[i + 3] = 255;
    qd[i] = qd[i + 1] = qd[i + 2] = q; qd[i + 3] = 255;
  }
  NOISE.P.getContext("2d").putImageData(NOISE.pi, 0, 0); NOISE.Q.getContext("2d").putImageData(NOISE.qi, 0, 0);
  const T = NOISE.T, tg = T.getContext("2d");
  for (const [src, op] of [[NOISE.P, "lighter"], [NOISE.Q, "difference"]]) {
    tg.save();
    tg.globalCompositeOperation = "copy"; tg.imageSmoothingEnabled = true; tg.imageSmoothingQuality = "low";
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.drawImage(src, -NOISE_C, -NOISE_C, sw * NOISE_C, sh * NOISE_C);
    tg.globalCompositeOperation = "multiply"; tg.imageSmoothingQuality = "high";
    tg.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]); tg.drawImage(NOISE.gain, 0, 0);
    tg.restore();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = op; ctx.drawImage(T, 0, 0); ctx.restore();
  }
}
function texture(g) {
  if (!TEX) buildTexture();
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = "multiply"; g.drawImage(TEX.fine, 0, 0);
  // undo the fine layer's mean darkening (colour-dodge by d multiplies by 1/(1-d))
  g.globalCompositeOperation = "color-dodge"; const dv = Math.round(255 * (1 - FINE_MEAN)); g.fillStyle = `rgb(${dv},${dv},${dv})`; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = "soft-light"; for (const m of TEX.mottle) g.drawImage(m, 0, 0);
  g.restore();
}
function composeF0(local) {
  if (!STATIC) buildStatic();
  if (!F0) { F0 = document.createElement("canvas"); F0.width = W; F0.height = H; }
  const g = F0.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(STATIC, 0, 0);
  drawCard(g, local);
  texture(g);
  return F0;
}
// the card, its redrawn parts, the typed text and the card's light, over the static frame
function drawCard(g, local) {
  g.save();
  uiToF0(g);
  drawNoteCard(g, { x: PURE_CARD.x + CARD_DX, y: PURE_CARD.y, w: PURE_CARD.w, notch: false, text: "", caret: false, smiley: 1, theme: CARD_THEME });
  cardParts(g);
  g.restore();
  g.save();
  drawSmiley2(g);
  g.restore();
  g.save();
  uiToF0(g);
  typedText(g, typed(local), local < CARET_OFF);
  g.restore();
  cardLight(g);
}

const GRADE_GRAIN = 2.5;
export const shot = {
  draw(ctx, local) {
    // Everything is tabled per source frame (25 fps) and held: a time between two frames shows the NEXT frame, as the
    // compare tools' reference does (ffmpeg output seeking returns the first frame at or after t). Film frames land
    // exactly on k/25, where this is the identity.
    const u = Math.max(0, Math.ceil(local * 25 - 0.05)) / 25;
    const [, s, tx, ty, rot] = cam(u);
    const f0 = composeF0(u);
    ctx.save();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    const c = s * Math.cos((rot * Math.PI) / 180), sn = s * Math.sin((rot * Math.PI) / 180);
    ctx.setTransform(c, sn, -sn, c, tx, ty);
    ctx.drawImage(f0, 0, 0);
    ctx.restore();
    striation(ctx, [c, sn, -sn, c, tx, ty]);
    captureNoise(ctx, Math.round(u * 25), [c, sn, -sn, c, tx, ty]);
  },
  // the film's finishing grain, a little under its default (measured on flat ground); the source's capture noise and mottle are baked into F0
  // (texture()), so they coarsen with the push-in as in the source
  grade: () => ({ grain: GRADE_GRAIN / 255 }),
  release() { releasePure(); STATIC = null; F0 = null; TEX = null; CARD_LF = null; STRIPE_C = null; NOISE = null; },
};
