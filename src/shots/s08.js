// s08 (30.56–32.60): screen close-up. The "Pure Imagination" page fills the frame: the red selection round the
// wordmark, the note card on the right, and "This is really good" typed into it letter by letter while the camera
// creeps in toward the card (a digital push-in anchored on the right edge of frame).
//
// Measured on the source:
//  - page mapping: the first frame shows page units x 670.6–1594.4, y 106.5–505 (2.388 px per unit, SIFT fit of the
//    close-up against the rectified laptop screen), with a black strip above F0 y ~11 (the edge of the source's
//    crop, it scrolls out of frame by 30.88);
//  - camera: tools/camtrack.py 30.56 32.60 0.04 to start, then refit per frame by ECC of every source frame against
//    the first one (affine, card text masked), composed with the first frame's own placement and reduced to a
//    similarity: [local time, s, tx, ty, rot deg], frame(t) = s R(rot) frame(t0) + (tx, ty). The source's push-in has
//    no roll (|rot| < 0.006 deg); the older render-vs-source fit had drifted to a 0.028 deg roll, ~1.3 px at the far
//    edge by the end;
//  - typing: per-frame crops of the card (stabilised with the camera track): one letter every 3–4 frames;
//  - the first frame (F0) itself: most of the page is redrawn from shapes traced/refined on it (s08/ornaments.js:
//    lower left, cloud, ribbon), with colours solved through the screen light + film grade model, a fitted second
//    light pass, the card's light fall-off, and the capture's own texture (noise, mottle, scan striation) baked in.
// Everything is composed once at F0 resolution and the push-in scales that image (as the source does).
import { W, H } from "../config.js";
import { rng } from "../lib/rng.js";
import { purePageRegion, releasePure, PURE_SEL, PURE_CARD, PC } from "../lib/pureimg.js";
import { sampleCurve } from "../lib/paths.js";
import { MARK } from "./s08/mark.js";
import { drawTrash2, TRASH2, drawSmiley2, SMILEY2, drawNub2, drawCardBody } from "./s08/card.js";
import { ORN, ORN_ZONE, CLOUD, CLOUD_ZONE, CLOUD_SPARKLE, RIB_B, RIB_C, RIB_ZONE, NUB_IDX, NUB_PALE, NUB_LINE } from "./s08/ornaments.js";

// frame(t0) -> page, measured: page = A0 * frame0 (tiny rotation included)
const A = 0.418768349, B = 0.00105950832, TX = 670.585031, TY = 106.503905;

// camera track (local time, s, tx, ty, rot in degrees): frame(t) = s * R(rot) * frame(t0) + (tx, ty). Source-to-source
// ECC (affine) per frame; the affine's departure from this similarity is < 0.11 px anywhere in frame. Render against
// source (ECC affine, top-left mark masked) then leaves 0.1-0.35 px, the same pattern on every frame (the F0 drawing's
// own placement).
const CAM = [
  [0.00, 1.00019, -0.40, -0.23, -0.0022], [0.04, 1.00017, -0.39, -0.24, -0.0019], [0.08, 1.00055, -1.19, -0.56, -0.0016], [0.12, 1.00158, -3.52, -1.57, -0.0023],
  [0.16, 1.00334, -7.35, -3.22, -0.0018], [0.20, 1.00570, -12.60, -5.47, -0.0018], [0.24, 1.00871, -19.25, -8.32, -0.0018], [0.28, 1.01236, -27.26, -10.48, -0.0017],
  [0.32, 1.01660, -36.58, -10.55, -0.0014], [0.36, 1.02135, -47.12, -10.56, -0.0022], [0.40, 1.02670, -58.91, -10.65, -0.0005], [0.44, 1.03259, -71.89, -10.72, -0.0007],
  [0.48, 1.03900, -86.06, -10.77, -0.0018], [0.52, 1.04593, -101.34, -10.85, -0.0016], [0.56, 1.05336, -117.72, -10.92, -0.0015], [0.60, 1.06127, -135.15, -11.02, -0.0007],
  [0.64, 1.06963, -153.63, -11.09, -0.0018], [0.68, 1.07846, -173.09, -11.18, -0.0016], [0.72, 1.08773, -193.52, -11.27, -0.0021], [0.76, 1.09740, -214.87, -11.37, -0.0024],
  [0.80, 1.10745, -237.07, -11.47, -0.0021], [0.84, 1.11791, -260.11, -11.62, -0.0010], [0.88, 1.11791, -260.12, -11.62, -0.0012], [0.92, 1.12871, -283.97, -13.98, -0.0021],
  [0.96, 1.13989, -308.55, -18.81, -0.0012], [1.00, 1.15129, -333.75, -23.72, -0.0017], [1.04, 1.16299, -359.56, -28.78, -0.0014], [1.08, 1.17495, -385.94, -33.96, -0.0008],
  [1.12, 1.18709, -412.74, -39.18, -0.0014], [1.16, 1.19940, -439.89, -44.46, -0.0023], [1.20, 1.21185, -467.35, -49.81, -0.0038], [1.24, 1.22437, -494.97, -55.22, -0.0031],
  [1.28, 1.23690, -522.64, -60.61, -0.0038], [1.32, 1.24947, -550.34, -66.06, -0.0030], [1.36, 1.26193, -577.80, -71.44, -0.0020], [1.40, 1.27424, -604.97, -76.71, -0.0032],
  [1.44, 1.28633, -631.64, -81.93, -0.0035], [1.48, 1.29815, -657.71, -87.01, -0.0036], [1.52, 1.30957, -682.93, -91.95, -0.0029], [1.56, 1.32061, -707.28, -96.69, -0.0037],
  [1.60, 1.33111, -730.43, -101.24, -0.0031], [1.64, 1.34101, -752.28, -105.50, -0.0035], [1.68, 1.35025, -772.69, -109.45, -0.0048], [1.72, 1.35865, -791.27, -113.08, -0.0042],
  [1.76, 1.36628, -808.07, -116.35, -0.0049], [1.80, 1.37298, -822.81, -119.25, -0.0044], [1.84, 1.37860, -835.21, -121.68, -0.0042], [1.88, 1.37860, -835.20, -121.69, -0.0039],
  [1.92, 1.38306, -845.11, -123.57, -0.0056], [1.96, 1.38641, -852.42, -125.05, -0.0038], [2.00, 1.38847, -856.99, -125.95, -0.0041],
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
  g.filter = `blur(${SOFT.page}px)`;
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
  // Fix pass 1: the source's edge is crisp (erf sigma ~0.5 output px at 30.56-30.64, the same as the resampling alone
  // gives) at F0 y ~10.1-10.45; the old 9.7-11.0 ramp left output row 0 ~20% dark on frames 771-780, where the source's
  // row 0 is only ~5% darker than row 1. A plain edge at F0 y 10.1 (row 10 at 10% black).
  g.fillStyle = "#000"; g.fillRect(0, 0, W, STRIP_Y);
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
  groundRight(g);
}
// Fix pass 2: the dark ground above and left of the card (F0 x 1460-1750, y 30-180), where groundTone does not reach,
// measured ~3 output levels dark and less green than the source (e.g. (1600-1700, 110-135): (20.6,25.3,18.6) against
// (22.1,28.6,21.7), frames 764/765), fading to nothing by x ~1900: a gain on dark pixels there, weighted by a soft ellipse.
const GROUND_R = { cx: 1560, cy: 105, rx: 360, ry: 150, gain: [1.07, 1.13, 1.16] };
function groundRight(g) {
  const { cx, cy, rx, ry, gain } = GROUND_R, x0 = Math.max(0, cx - rx), y0 = 0, x1 = Math.min(W, cx + rx), y1 = Math.min(H, cy + ry);
  const w = x1 - x0, h = y1 - y0, img = g.getImageData(x0, y0, w, h), d = img.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const q = Math.hypot((x0 + i - cx) / rx, (y0 + j - cy) / ry);
    if (q >= 1) continue;
    const o = (j * w + i) * 4, L = (d[o] + d[o + 1] + d[o + 2]) / 3;
    if (L >= 70) continue;
    const k = (0.5 + 0.5 * Math.cos(Math.PI * q)) * (L <= 40 ? 1 : (70 - L) / 30);
    for (let c = 0; c < 3; c++) d[o + c] = Math.round(d[o + c] * (1 + k * (gain[c] - 1)));
  }
  g.putImageData(img, x0, y0);
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
// Only their lower halves show, for the first ~0.4 s. Measured on frame 764 (F0 px): the bodies end ~2.5 px lower than
// the page draws them, with a thin rim and a lighter, softer grey; "Register" is 8.5 px wider than the page's pill (left
// edge 1261-1281 over y 16-38, right edge 1489-1470) and the labels are larger and bolder: the bottoms of "Register"
// span x 1291-1463 with the baseline at y ~15.2 (page y 114.3). The ground right under the pills is the page ground
// (a thin darker rim only): the drop shadow that hides the page's ribbons there is ground-coloured.
// fix pass 1: bottom edge measured 0.7 F0 px low (erf fits, frames 764-766: source 42.2, render 42.9) and the bodies
// "Register" ~9 levels dark (source 142-144 against 134; the second pill was right): y1 127.3 -> 127.0, the first pill's
// fill #d6d7cb -> #e2e3d7; the second pill's right end sat 2.5 px out (half level at rows 24-40): x1 1446 -> 1445
const PILL_FONT = 700, PILL_REG_W = 72, PILL_BASE = 114.3, PILL_FILL = ["#e2e3d7", "#d6d7cb"];
let _pillSize = 0;
function redrawPills(g) {
  g.save();
  pageToF0(g);
  g.filter = `blur(${SOFT.pills}px)`;
  if (!_pillSize) { g.font = `${PILL_FONT} 100px Poppins`; _pillSize = (100 * PILL_REG_W) / g.measureText("Register").width; }
  const y0 = 92, y1 = 127.0, r = (y1 - y0) / 2;
  // [x0, x1, label, bracket glyph, label x (null = centred)]
  for (const [x0, x1, label, glyph, lx, fill] of [[1197.5, 1296.3, "Register", false, null, PILL_FILL[0]], [1317.5, 1445, "Tix & Info", true, 1334.7, PILL_FILL[1]]]) {
    g.beginPath(); g.roundRect(x0, y0 + 7.5, x1 - x0, y1 - y0, r); g.fillStyle = PAGE_BG; g.fill();
    g.beginPath(); g.roundRect(x0, y0, x1 - x0, y1 - y0, r); g.fillStyle = fill; g.fill();
    g.beginPath(); g.roundRect(x0, y0, x1 - x0, y1 - y0, r); g.lineWidth = 1.8; g.strokeStyle = "#20231c"; g.stroke();
    g.font = `${PILL_FONT} ${_pillSize.toFixed(2)}px Poppins`; g.fillStyle = "#2a2d26";
    const tw = g.measureText(label).width;
    g.textAlign = "left";
    const tx = lx ?? (x0 + x1) / 2 - tw / 2;
    g.fillText(label, tx, PILL_BASE);
    if (glyph) {
      // "( v )": a small chevron in brackets
      const gx = tx + tw + 12;
      g.fillText("(", gx - 7, PILL_BASE); g.fillText(")", gx + 6, PILL_BASE);
      g.beginPath(); g.moveTo(gx - 3, PILL_BASE - 7.5); g.lineTo(gx + 0.5, PILL_BASE - 3.5); g.lineTo(gx + 4, PILL_BASE - 7.5);
      g.lineWidth = 2.2; g.strokeStyle = "#2a2d26"; g.lineCap = "round"; g.lineJoin = "round"; g.stroke();
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
  // fix pass 1: half-level edges against the source (frames 764-771): all three sat ~0.55 px left and 0.4-0.95 px
  // high, and the two small ones 0.3-0.9 px small
  [1007.6, 66.7, 39.75, 43.45, "rgb(212,214,207)", 11, 0, 0.42],
  [636.9, 239.3, 27.65, 29.25, "rgb(200,202,194)", 0, 36],
  [860.85, 211.15, 24.9, 22.95, "rgb(120,120,140)", 0, 32],
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
    g.filter = `blur(${SOFT.stars}px)`;
    starPath(g, x, y + STAR_P.dy, rx, ry, sw ?? STAR_P.w);
    if (lw) { g.lineJoin = "round"; g.lineWidth = lw; g.strokeStyle = KEYLINE; g.stroke(); }
    g.fillStyle = col; g.fill();
    g.restore();
  }
}

// ---------------------------------------------------------------- redrawn page regions (F0 px)
// Softness of the page layers (Gaussian sigma, F0 px, on top of the drawing's own antialiasing). Fix pass 1: the source's
// page art is softer than the card (erf fits across strong edges, frames 764/765: 'ure' 1.20, date line 1 1.37,
// 'Linden Hollow' 1.27, lobes 1.29, fan 1.13, ribbon 1.21, stars 1.25, cloud 1.13; card 0.51); the card, typed text and
// selection stay sharp.
const SOFT = { page: 1.0, orn: 1.1, cloud: 1.1, cloudEdge: 0.7, rib: 1.2, pills: 1.4, stars: 1.2 };
const STRIP_Y = 10.1;
// Fix pass 2: keyline cores measured 5-11 levels grey against the source (median line-core minima, frames 764/765 and
// 812/814: letters 23 vs 14.5, cloud 29 vs 17, tail 10-15 vs 1-6) while their half-depth widths matched: the keyline
// colour #170a05 -> #0a0503, and the lower-left and cloud keylines a touch wider (ORN_LW: 10 -> 10.8, 11 -> 11.8).
const PAGE_BG = "#1c241b", PAGE_CREAM = "#cfd0c5", KEYLINE = "#0a0503", ORN_LW = [10, 11];
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
      const l1 = col === DATE1.col, gx = fx + (c - fx) * k, [ox, oy, oa, ob, ox0] = l1 ? DATE_FIX.l1 : DATE_FIX.l2;
      // fix pass 1 offsets (F0 px -> page units): a shift plus a slight levelling of the line (the render's baseline
      // rose ~0.002 px per px to the right against the source's)
      const xf = (gx - TX) / A;
      glyphs.push([ch, gx + ox * A, base + dy + (oy + oa + ob * (xf - ox0)) * A, size * k, col, v, l1]);
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
    if (l1) { g.lineWidth = DATE_FIX.bold * (1 - 0.7 * Math.min(1, Math.max(0, (cx - 880) / 50))) + (cx < 725 ? DATE_RCH_BOLD : Math.min(0.62, Math.max(0.15, 0.2 + ((cx - 790) / 170) * 0.38))); g.strokeStyle = col; g.strokeText(ch, 0, 0); }
    else if (DATE_FIX.bold2) { g.lineWidth = cx < 846 ? DATE_FIX.bold2 : 0.1; g.strokeStyle = col; g.strokeText(ch, 0, 0); }
    // a thin dark edge over the fill: the source's glyphs are slimmer (the 0's counter is ~3 px wider) with the rim
    // eating into them
    if (DATE_ERODE[1]) { g.globalAlpha = DATE_ERODE[1]; g.lineWidth = DATE_ERODE[0]; g.strokeStyle = DATE_RIM_COL; g.strokeText(ch, 0, 0); }
  }
  g.globalAlpha = 1;
  g.filter = "none";
  g.restore();
  lobeVeil(g, glyphs, at);
}
// Where the date lines cross the lobes ("rch" over the pink and purple lobes, "Colu" over the small ones) the source's
// letters are washed with the lobe colour and have no dark rim: the lobes lie over the text. Measured on frames
// 764-771 (F0): the rim there is lobe-coloured, and the glyph cores are pinker than the white line (source core
// (152,142,145) against the render's (156,156,150) untinted). The lobes are laid over the rim at VEIL[1] and over the
// glyph fills at VEIL[0] (swept on the "rch" box: blurred error 10.9 before, 4.85 with 0.1 / 1.0 and DATE_RCH_BOLD).
const VEIL = [0.1, 1.0], VEIL_LOBES = [3, 4, 8, 9];
// "rch" (page x < 725) is bolder in the source: its glyph area above level 120 is 11% larger than the render's with
// the rest of line 1's emboldening (frames 764-771); emboldened by DATE_RCH_BOLD page units
const DATE_RCH_BOLD = 0.9;
function lobeVeil(g, glyphs, at) {
  const mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };
  const fill = mk(), rim = mk(), fg = fill.getContext("2d"), rg = rim.getContext("2d");
  for (const q of [fg, rg]) { q.textAlign = "center"; q.lineJoin = "round"; q.filter = "blur(0.8px)"; }
  for (const [ch, cx, by, sz, , v, l1] of glyphs) {
    for (const q of [fg, rg]) { at.call(null, cx, by, v); q.setTransform(g.getTransform()); q.font = `${DATE_W} ${sz.toFixed(2)}px Poppins`; }
    fg.fillStyle = "#fff"; fg.fillText(ch, 0, 0);
    rg.lineWidth = DATE_RIM * (l1 ? 1 : 0.75) + 2.4; rg.strokeStyle = "#fff"; rg.strokeText(ch, 0, 0);
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  rg.setTransform(1, 0, 0, 1, 0, 0); rg.filter = "none"; rg.globalCompositeOperation = "destination-out"; rg.drawImage(fill, 0, 0);
  for (const [mask, a] of [[fill, VEIL[0]], [rim, VEIL[1]]]) {
    const c = mk(), cg = c.getContext("2d");
    for (const i of VEIL_LOBES) { const [col, pts, fl] = ORN[i]; ornPath(cg, pts, fl === 1); cg.fillStyle = shapeFill(cg, col); cg.fill(); }
    cg.globalCompositeOperation = "destination-in"; cg.drawImage(mask, 0, 0);
    g.save(); g.globalAlpha = a; g.drawImage(c, 0, 0); g.restore();
  }
}
// k: horizontal layout scale about the fixed x; v: extra vertical glyph scale about the baseline (measured cap heights)
// Fix pass: glyph cores measured 3-10 levels brighter than the render, B more so; the source's rim is a ~3 px dip
// to ~15 outside every glyph (the render's was washed out by the blur): a wider, darker rim (page units)
const DATE1 = { k: 1.0218, dy: 0.45, v: 1.06, col: "rgb(212,215,207)" }, DATE2 = { k: 1.0525, dy: 2.0, v: 1.03, col: "rgb(210,212,205)" };
// Fix pass 1, measured as render - source glyph edge offsets (half level, frames 764-771, F0): line 1's left edges sat
// +1.0 px right and its right edges +0.15 (thinner by ~0.8 px across, ~0.4 up and down, and 0.57 px right); its
// vertical centre ran +0.86 ("rch") to -0.35 ("2023"). "Linden Hollow" sat 0.37 left and 0.48 high, "GA" 0.4 left, 0.87 high.
// [dx, dy, a, b, x0]: shift (dx, dy) plus a + b (x - x0) down, F0 px; bold: extra emboldening, page units.
const DATE_FIX = { l1: [-0.57, 0, -1.05, 0.00225, 70], l2: [0.38, 0, 0.62, 0.003, 265], bold: 0.3, bold2: 0.3 };
const DATE_RIM = 2.6, DATE_RIM_COL = "rgba(6,5,4,0.95)", DATE_W = 600, DATE_ERODE = [0.5, 0];
// Repaint a zone of the static frame from traced shapes: page ground, keylines (every stroked shape first), fills,
// then extra drawing on top; composited a touch soft like the page. shapes: [colour | "C" | gradient, flat points,
// flag]; flag 1 = straight-edged polygon, 2 = no keyline, 3 = inside a letter (keylined again right before its fill),
// 4 = keylined again right before its fill with a heavier line (a shape laid over a neighbour with a ~7 px gap).
// layered: each shape keylined then filled in order (a shape covers the ones before it).
function shapeFill(g, col) {
  if (col === "C") return PAGE_CREAM;
  if (typeof col === "string") return col;
  // [x0, y0, x1, y1, colour stops ... (evenly spaced)]
  const [x0, y0, x1, y1, ...cs] = col, gr = g.createLinearGradient(x0, y0, x1, y1);
  cs.forEach((c, i) => gr.addColorStop(i / (cs.length - 1), c));
  return gr;
}
function overpaint(dst, zonePts, shapes, after, layered = false, lw = 10, soft = 0.5, key = null, edgeSoft = 0) {
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
      // unkeylined shapes (the cloud's orange body on the ground) have a softer edge
      if (fl === 2 && edgeSoft) g.filter = `blur(${edgeSoft}px)`;
      g.fillStyle = shapeFill(g, col); g.fill();
      g.filter = "none";
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
  overpaint(dst, ORN_ZONE, ORN, (g) => { ornExtra(g); lobeSoft(g); dateLines(g); }, false, ORN_LW[0], SOFT.orn, ornKey);
  overpaint(dst, CLOUD_ZONE, CLOUD, (g) => { sparkle(g); cloudShade(g); cloudTint(g); }, true, ORN_LW[1], SOFT.cloud, null, SOFT.cloudEdge);
  overpaint(dst, RIB_ZONE, [], ribbon, false, 10, SOFT.rib);
  overpaint(dst, LOGO_ZONE, [], logoMark, false, 10, MARK_SOFT);
}
// The lobe artwork at the top left (the big purple lobe and the pink one behind "rch", the small ones behind "Colu")
// is soft in the source while the date text over it is crisp: the purple lobe's edge on the ground measures sigma
// ~4 px (render 1.0-1.4) at x 20-50, ~2.5 at x 80, ~3 on the small lobe's top at x 230, and ~1.3-1.7 on the pink
// lobe lower down (frame 764, erf fits). Blurred by LOBE_SOFT px before the text is drawn, weighted by a field that is
// 1 in the corner and falls off by x ~330 and y ~520.
const LOBE_SOFT = 3;
function lobeSoft(g) {
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const cg = c.getContext("2d");
  cg.filter = `blur(${LOBE_SOFT}px)`; cg.drawImage(g.canvas, 0, 0); cg.filter = "none";
  // weight: an ellipse about the corner (-60, 280), full inside ~0.55 of its radii
  cg.globalCompositeOperation = "destination-in";
  cg.setTransform(390, 0, 0, 250, -60, 280);
  const w = cg.createRadialGradient(0, 0, 0, 0, 0, 1);
  w.addColorStop(0, "rgba(0,0,0,1)"); w.addColorStop(0.55, "rgba(0,0,0,1)"); w.addColorStop(1, "rgba(0,0,0,0)");
  cg.fillStyle = w; cg.fillRect(-1, -1, 2, 2);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(c, 0, 0); g.restore();
}
// Keylines in the lobes and fan (upper part of the lower-left, above F0 y ~600) are no darker than the ground in the
// source (minima 15-30 against ground ~17-20; the render's were 5-11): lifted there, full black below y ~640.
function ornKey(g) {
  const k = g.createLinearGradient(0, 600, 0, 645);
  k.addColorStop(0, ORN_KEY_LIFT); k.addColorStop(1, ORN_KEY);
  return k;
}
// Fix pass 2: the lower-left keeps the old keyline colour (a darker one raised the blurred error of every region there:
// its lines' total darkness already matched); the lift is halved (the lobe and fan keylines' cores measured ~25 against
// the source's 11-16, frames 764/765)
const ORN_KEY = "#170a05", ORN_KEY_LIFT = "#141a13", FAN_KEY = "#161310";
// Two traced pieces the first pass missed (F0 px): the salmon stripe between the r's outer keyline and its yellow
// crescent (x 576-585, y 735-806, measured ~(135,105,88) out -> page colour through the light), and the near-black
// wedge at the bottom of the u (half-level edges: tip (227.5, 910), right edge ~x 227, left edge to (193, 946)).
const SALMON = [581, 735, 584, 740, 584.6, 750, 583.2, 762, 582, 775, 581.6, 788, 582.6, 798, 585.5, 806, 579.5, 807, 577.4, 796, 576.1, 786, 576.2, 772, 577.1, 760, 578.9, 748, 579.8, 739];
const WEDGE = [227.6, 909.2, 224.2, 914.6, 220.3, 920.6, 212.3, 929.6, 202.3, 938.6, 193, 945.6, 189, 950, 228.6, 950, 228, 930, 228.3, 915];
function ornExtra(g) {
  g.save();
  g.fillStyle = "#906f5e"; ornPath(g, SALMON, false); g.fill();
  g.fillStyle = "#0c0d0a"; ornPath(g, WEDGE, true); g.fill();
  // the two-toned pink nub: its paler lower piece and the dark-red line between
  ornPath(g, ORN[NUB_IDX][1], false); g.clip();
  g.fillStyle = "#8c6c6a"; ornPath(g, NUB_PALE, true); g.fill();
  g.beginPath(); for (let i = 0; i < NUB_LINE.length; i += 2) (i ? g.lineTo : g.moveTo).call(g, NUB_LINE[i], NUB_LINE[i + 1]);
  g.lineWidth = 3; g.lineCap = "round"; g.lineJoin = "round"; g.strokeStyle = "#3a0a10"; g.stroke();
  g.restore();
}
// ---------------------------------------------------------------- the top-left mark (original, s08/mark.js)
// Drawn over the page's own logo slot: the page ground, then a dark keyline (measured on the source: ~3 px of
// near-black outside the top/left edges, ~6 px below/right), then the monoline cream stroke.
const LOGO_ZONE = [[150, 0], [492, 0], [492, 180], [150, 180]];
// fix pass 1 (matched only in mass and footprint, the letterforms stay original): the source's ink core is 6-13 levels
// brighter and ~2 px narrower (frames 764-767, level > 110 area / skeleton length: 6.9 against 9.4); ink-profile
// cross-correlation puts the render's ink ~5 px right (line 1 ~12 px) and ~4 px low
// fix pass 2: strokes still ~1 px heavy (bright area / skeleton 6.8 against 5.6 at frame 764) and the ink ~4 levels
// bright (p90 144 against 140): MARK.w 11 -> 10, ink #d8dace -> #d3d5c9. Only mass and tone are matched; the
// letterforms stay the original "Wonder / Camp".
const MARK_INK = "#d3d5c9";
const MARK_KEY = "#050605", MARK_SOFT = 0.8, MARK_K = { w0: 4, w1: 6, dx: 1.6, dy: 1.8 };
function logoMark(g) {
  const { slant, lines, w, dot } = MARK, P = [];
  for (const L of lines) for (const st of L.strokes) {
    const pts = [], dx = L.dx || 0, dy = L.dy || 0;
    for (let i = 0; i < st.length; i += 2) pts.push([st[i] + dx + (L.base - st[i + 1]) * slant, st[i + 1] + dy]);
    P.push(sampleCurve(pts, 6));
  }
  const trace = (dx, dy) => {
    g.beginPath();
    for (const s of P) { g.moveTo(s[0][0] + dx, s[0][1] + dy); for (let i = 1; i < s.length; i++) g.lineTo(s[i][0] + dx, s[i][1] + dy); }
  };
  const L2 = lines[lines.length - 1], ddx = L2.dx || 0, ddy = L2.dy || 0;
  const disc = (dx, dy, r) => { g.beginPath(); g.arc(dot[0] + ddx + dx, dot[1] + ddy + dy, r, 0, Math.PI * 2); g.fill(); };
  g.save();
  g.lineCap = "round"; g.lineJoin = "round";
  g.strokeStyle = MARK_KEY; g.fillStyle = MARK_KEY;
  g.lineWidth = w + MARK_K.w1; trace(MARK_K.dx, MARK_K.dy); g.stroke();
  g.lineWidth = w + MARK_K.w0; trace(0, 0); g.stroke();
  disc(MARK_K.dx * 0.5, MARK_K.dy * 0.5, dot[2] + 2.5);
  g.strokeStyle = MARK_INK; g.fillStyle = MARK_INK;
  g.lineWidth = w; trace(0, 0); g.stroke();
  g.globalAlpha = 0.55; disc(0, 0, dot[2]); g.globalAlpha = 1;
  g.restore();
}
// The ribbon (U + pastel tail) between its five measured boundary lines: each band is painted along its length with
// the colour measured there (short overlapping strokes of the centre line, clipped to the band), then the keylines.
const RIB_KEY = 6.0, RIB_KEY_L = [5.4, "#170a05"], RIB_TAIL_X = 1450;   // the tail; the U's arms [width, colour]
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
  const keys = (q, list, w = RIB_KEY, col = KEYLINE) => {
    q.lineJoin = "round"; q.lineCap = "round"; q.lineWidth = w; q.strokeStyle = col;
    for (const b of list) { q.beginPath(); b.forEach(([x, y], k) => (k ? q.lineTo(x, y) : q.moveTo(x, y))); q.stroke(); }
  };
  // The three outer keylines (pink edge, pink/purple, purple/orange) are soft on the U's left arm and bottom in the
  // source: their depth there is 0.5-0.85 of the render's sharp line (0.9-1.1 on the right arm and for the two inner
  // lines; measured along horizontal scans every 30 px, frames 764-766 and 808-814): blurred by RIB_SOFT px left of
  // x RIB_SOFT_X (blended over RIB_SOFT_X + 90). Fix pass 2: the pastel tail's keyline cores measured 8-12 levels grey
  // (core minima 15 against the source's 6-7 over the tail, 10-12 against 0.5-1 at its right edge) while the U's arms
  // were close: the tail's keylines (right of RIB_TAIL_X, blended over 90 px) are wider and darker (RIB_KEY, KEYLINE);
  // the arms keep the old line (RIB_KEY_L), which a darker line made worse (right arm blurred error 3.84 -> 4.17).
  const mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };
  const ramp = (q, x0, a0, a1) => {
    const r = q.createLinearGradient(x0, 0, x0 + 90, 0);
    r.addColorStop(0, `rgba(0,0,0,${a0})`); r.addColorStop(1, `rgba(0,0,0,${a1})`);
    q.globalCompositeOperation = "destination-in"; q.fillStyle = r; q.fillRect(0, 0, W, H); q.globalCompositeOperation = "source-over";
  };
  const [lw, lc] = RIB_KEY_L;
  const sharp = mk(), soft = mk(), arms = mk(), tail = mk(), sg = sharp.getContext("2d"), fg = soft.getContext("2d"), ag = arms.getContext("2d"), tg = tail.getContext("2d");
  keys(sg, B.slice(0, 3), lw, lc);
  fg.filter = `blur(${RIB_SOFT}px)`; fg.drawImage(sharp, 0, 0); fg.filter = "none";
  ramp(fg, RIB_SOFT_X, 1, 0); ramp(sg, RIB_SOFT_X, 0, 1);
  ag.drawImage(soft, 0, 0); ag.drawImage(sharp, 0, 0); keys(ag, B.slice(3), lw, lc);
  keys(tg, B);
  ramp(ag, RIB_TAIL_X, 1, 0); ramp(tg, RIB_TAIL_X, 0, 1);
  g.drawImage(arms, 0, 0); g.drawImage(tail, 0, 0);
}
// fix pass 1: with the whole ribbon zone now at SOFT.rib, the extra blur on those keylines is cut 1.3 -> 0.3 (edge fits
// on the U's left arm: source 1.21, render 1.17-1.22 after)
const RIB_SOFT = 0.3, RIB_SOFT_X = 1250;
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
// Fix pass 2: the cloud's orange body left of x ~1900 is off in hue (F0 24 px patches, frames 764/765, output RGB): just
// under the card's bottom edge (y ~835-855) it is too red (render (117,77,54) against the source's (106,72,56)), and
// lower down round the sparkle it lacks green and blue ((116,75,51) against (120,85,60)). A per-pixel shift of the
// body's colour only (pixels whose hue is the body's orange), weighted by two soft ellipses; pre-grade, CLOUD_TINT_K x
// the output shift.
const CLOUD_TINT = [
  // cx, cy, rx, ry, output shift R, G, B
  [1800, 848, 95, 28, -22, -8, 5],   // in the card's shadow: the shift is scaled down by the shadow, so doubled here
  [1795, 890, 100, 32, 2, 10, 10],
];
const CLOUD_TINT_K = 1.6;
function cloudTint(g) {
  const x0 = 1680, y0 = 815, x1 = 1920, y1 = 930, w = x1 - x0, h = y1 - y0;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  const img = g.getImageData(x0, y0, w, h), d = img.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const o = (j * w + i) * 4, r = d[o], gg = d[o + 1], b = d[o + 2];
    // the body's orange: r > 90, r/g 1.3-1.9, g/b 1.15-1.7 (a soft membership, so keylines and the cream stay put)
    if (r < 70 || gg < 20) continue;
    const rg = r / gg, gb = gg / Math.max(1, b);
    const m = Math.min(1, Math.max(0, (r - 70) / 40)) * Math.min(1, Math.max(0, 1 - Math.abs(rg - 1.55) / 0.35)) * Math.min(1, Math.max(0, 1 - Math.abs(gb - 1.38) / 0.35));
    if (m <= 0) continue;
    let dr = 0, dgc = 0, db = 0;
    for (const [cx, cy, rx, ry, sr, sg, sb] of CLOUD_TINT) {
      const q = Math.hypot((x0 + i - cx) / rx, (y0 + j - cy) / ry);
      if (q >= 1) continue;
      const k = 0.5 + 0.5 * Math.cos(Math.PI * q);
      dr += k * sr; dgc += k * sg; db += k * sb;
    }
    if (!dr && !dgc && !db) continue;
    const f = m * CLOUD_TINT_K;
    d[o] = Math.round(r + f * dr); d[o + 1] = Math.round(gg + f * dgc); d[o + 2] = Math.round(b + f * db);
  }
  g.putImageData(img, x0, y0);
  g.restore();
}
// the four-point sparkle on the cloud's left shoulder (the source's slim straight-sided star), keylined
function sparkle(g) {
  const { x, y, rx, ry, w, c, col, key } = CLOUD_SPARKLE;
  starPath(g, x, y, rx, ry, w, c);
  g.lineWidth = key; g.strokeStyle = KEYLINE; g.stroke();
  g.fillStyle = col; g.fill();
}

// The card (the only thing that changes) is redrawn into F0 each frame, then lit by the screen light.
// Card colours: the "screen" theme with the source's darker typed ink (~#232321) and CANCEL (~#646460), measured.
const CARD_THEME = { paper: "#e4e3d9", paperTop: "#d4d4c9", paperBot: "#c5c5bb", ink: "#1b1b19", text: "#1d1d1b", muted: "#5c5c58", outline: "rgba(20,16,14,0.55)", smiley: "#b4a648", smileyHi: "#c4ba5d", glow: "210,86,58", face: "#3b3222",
  // the smiley's disc and its halo measured in rings round its centre at 30.56
  glowR: 1.4, glowStops: [[0, 1], [0.3, 0.85], [0.44, 0.63], [0.56, 0.41], [0.69, 0.22], [0.83, 0.09], [1, 0]],
  rim: { dx: -3.3, dy: -1.4, color: "rgba(10,11,8,0.8)", nub: { dx: -2.8, dy: -3.8 } },
  // card edges measured at 30.56 (subpixel, median over each side): F0 x 1451.3–1913.3, y 183.7–830.5, i.e. 0.9 unit in
  // on the left and 2 units lower at the bottom than the layout's 465 x 648
  body: [0.88, 0.53, 464.83, 650.04],
  // the text box and button row, measured (line centres, subpixel): 3.9 units of darker ink, 0.6 unit up/left of the
  // layout; the button row 1.2 lower, its divider 1 unit left
  area: { x0: 50.3, y0: 159.4, x1: 422.5, y1: 599.85, lw: 3.9, btnY: 533.7, divX: 236.5, r: 18.5 }, trashLw: 3.8 };
// fix pass 2 (review 2): the text box's corners are rounder than the layout's 15 (diagonal inset from the corner point
// to the outline 7.5-7.75 F0 px against 6.25 at 30.56: r ~18.5), its divider 0.5 unit right; CANCEL 5-8% light
// Fix pass 2: the body's corner radii (card units; top-left, top-right, bottom-right, bottom-left) and the button
// labels' offset, measured on the source (s08/card.js drawCardBody)
const CARD_RADII = [49.6, 45, 45, 41.5];
// labels: phase correlation of the label boxes, source against render (frames 764-771 and 790-793, F0): CANCEL sat
// 0.47 px left and 0.35 px low, SAVE 0.87 left and 0.36 low
const CARD_LABELS = [[0.85, -0.35], [1.15, -0.36]], SAVE_W = 650;
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
// Erode 0.37: the text's ink (sum of paper minus level per letter cell, frames 800-814, F0) is 0.99 of the source's
// (0.96 at 0.42, 1.04 at 0.30).
const TXT = { x: 82.75, y: 208.5, size: 25.4, ls: 0.3, erode: 0.37, cx: 1 };
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
// Fix pass 2: in the source the striation barely touches the dark ground (sine amplitude at the stripe period 0.05-0.55
// levels on flat ground against the render's 0.5-1.4, frames 765-814) while the paper's matched (2.2-2.9): its depth is
// weighted by a mask of the static frame's blurred luma, smoothstep(STRIPE_L), carried by the camera like the noise
// gain. Per frame: T = white, the grating drawn through the camera, then screen-blended with (1 - mask), which gives
// 1 - mask (1 - grating); the page is multiplied by T and colour-dodged by A mask (T's mean darkening).
const STRIPE_L = [60, 180];
let STRIPE_M = null;
function stripeMasks() {
  const g = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  g.canvas.width = W; g.canvas.height = H;
  const base = document.createElement("canvas"); base.width = W; base.height = H;
  const bg = base.getContext("2d"); bg.drawImage(STATIC, 0, 0); drawCard(bg, 2);
  g.filter = "blur(6px)"; g.drawImage(base, 0, 0); g.filter = "none";
  const img = g.getImageData(0, 0, W, H), d = img.data;
  const inv = document.createElement("canvas"); inv.width = W; inv.height = H;
  const dm = document.createElement("canvas"); dm.width = W; dm.height = H;
  const ig = inv.getContext("2d"), dg = dm.getContext("2d"), ii = ig.createImageData(W, H), di = dg.createImageData(W, H);
  const [l0, l1] = STRIPE_L;
  for (let i = 0; i < d.length; i += 4) {
    const L = (d[i] + d[i + 1] + d[i + 2]) / 3, t = Math.min(1, Math.max(0, (L - l0) / (l1 - l0))), k = t * t * (3 - 2 * t);
    ii.data[i] = ii.data[i + 1] = ii.data[i + 2] = Math.round(255 * (1 - k)); ii.data[i + 3] = 255;
    di.data[i] = di.data[i + 1] = di.data[i + 2] = Math.round(STRIPE_A * k); di.data[i + 3] = 255;
  }
  ig.putImageData(ii, 0, 0); dg.putImageData(di, 0, 0);
  const T = document.createElement("canvas"); T.width = W; T.height = H;
  return { inv, dm, T };
}
function striation(ctx, m) {
  if (!STRIPE_C) STRIPE_C = stripeCanvas();
  if (!STRIPE_M) STRIPE_M = stripeMasks();
  const T = STRIPE_M.T, tg = T.getContext("2d");
  tg.save();
  tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = "copy"; tg.fillStyle = "#fff"; tg.fillRect(0, 0, W, H);
  tg.globalCompositeOperation = "source-over"; tg.imageSmoothingEnabled = true; tg.imageSmoothingQuality = "low";
  tg.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
  tg.drawImage(STRIPE_C, 0, 0, 1, STRIPE_C.height, -200, 0, W + 400, H);
  tg.globalCompositeOperation = "screen"; tg.imageSmoothingQuality = "high";
  tg.drawImage(STRIPE_M.inv, 0, 0);
  tg.restore();
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "multiply"; ctx.drawImage(T, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
  ctx.globalCompositeOperation = "color-dodge"; ctx.drawImage(STRIPE_M.dm, 0, 0);
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
  // F0 carries a 4 px margin right and below, filled by repeating the last column / row, so the push-in (anchored
  // on the right edge) never samples past the picture's edge (the last output column went dark by ~4 levels)
  if (!F0) { F0 = document.createElement("canvas"); F0.width = W + 4; F0.height = H + 4; }
  const g = F0.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(STATIC, 0, 0);
  drawCard(g, local);
  texture(g);
  g.drawImage(F0, W - 1, 0, 1, H, W, 0, 4, H);
  g.drawImage(F0, 0, H - 1, W + 4, 1, 0, H, W + 4, 4);
  return F0;
}
// the card, its redrawn parts, the typed text and the card's light, over the static frame
function drawCard(g, local) {
  g.save();
  uiToF0(g);
  drawCardBody(g, { x: PURE_CARD.x + CARD_DX, y: PURE_CARD.y, w: PURE_CARD.w, theme: CARD_THEME, radii: CARD_RADII, labels: CARD_LABELS, saveW: SAVE_W });
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

// Fix pass 2: the page art is still a touch crisp in the first frames (erf sigma of step edges at frames 764/765, output
// px: 'ure' 1.14 against 1.19, date line 1.27 against 1.37, lobes 1.25 against 1.29), matched by ~790 and a little soft
// late (ribbon +0.1): the F0 blur can't fix both, so the page gets an extra output-space blur of OUT_SOFT[0] px at the
// first frame, fading out by OUT_SOFT[1] s. The card, the selection line, the crop edge and the frame's own edges are
// redrawn sharp over it (the source's card and selection are crisp: sigma 0.51).
const OUT_SOFT = [0.6, 1.0];
function sharpClip(ctx, m) {
  ctx.beginPath();
  // frame edges (output px): a 3 px ring, outer clockwise and inner counter-clockwise (nonzero keeps only the ring)
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
  ctx.moveTo(3, 3); ctx.lineTo(3, H - 3); ctx.lineTo(W - 3, H - 3); ctx.lineTo(W - 3, 3); ctx.closePath();
  // F0 shapes through the camera: the card (body + rim + outline), its nub, the selection's two runs, the crop edge
  ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
  const C = CARD_F0, e = 7;
  ctx.roundRect(C.x - e, C.y - e, C.w + 2 * e, C.h + 2 * e, CARD_RADII.map((r) => r * 0.9957 + e));
  ctx.rect(1398, 470, 60, 78);
  ctx.rect(-20, SEL_LINE.y - 9, SEL_LINE.x + 29, 18);
  ctx.rect(SEL_LINE.x - 9, SEL_LINE.y - 9, 18, H + 40 - SEL_LINE.y);
  ctx.rect(-20, -20, W + 40, STRIP_Y + 23);
  ctx.clip();
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
    const ob = OUT_SOFT[0] * Math.max(0, 1 - u / OUT_SOFT[1]);
    if (ob > 0.05) {
      // early frames: the page a touch softer in output space, the card, the selection and the frame's edges sharp
      ctx.filter = `blur(${ob.toFixed(3)}px)`; ctx.drawImage(f0, 0, 0); ctx.filter = "none";
      ctx.save(); sharpClip(ctx, [c, sn, -sn, c, tx, ty]); ctx.drawImage(f0, 0, 0); ctx.restore();
    } else ctx.drawImage(f0, 0, 0);
    ctx.restore();
    striation(ctx, [c, sn, -sn, c, tx, ty]);
    captureNoise(ctx, Math.round(u * 25), [c, sn, -sn, c, tx, ty]);
  },
  // the film's finishing grain, a little under its default (measured on flat ground); the source's capture noise and mottle are baked into F0
  // (texture()), so they coarsen with the push-in as in the source
  grade: () => ({ grain: GRADE_GRAIN / 255 }),
  release() { releasePure(); STATIC = null; F0 = null; TEX = null; CARD_LF = null; STRIPE_C = null; STRIPE_M = null; NOISE = null; },
};
