// s08 (30.56–32.60): screen close-up. The "Pure Imagination" page fills the frame: the red selection round the
// wordmark, the note card on the right, and "This is really good" typed into it letter by letter while the camera
// creeps in toward the card (a digital push-in anchored on the right edge of frame).
//
// Measured on the source:
//  - page mapping: the first frame shows page units x 670.6–1594.4, y 106.5–505 (2.388 px per unit, SIFT fit of the
//    close-up against the rectified laptop screen), with a black strip above page y 110.7 (the edge of the source's
//    crop, it scrolls out of frame by 30.88);
//  - camera: tools/camtrack.py 30.56 32.60 0.04 — similarity per frame (s, tx, ty) vs the first frame;
//  - typing: per-frame crops of the card (stabilised with the camera track): one letter every 3–4 frames.
import { W, H } from "../config.js";
import { purePageRegion, releasePure, PURE_SEL, PURE_CARD } from "../lib/pureimg.js";
import { drawNoteCard, drawSelection } from "../lib/notecard.js";

// frame(t0) -> page, measured: page = A0 * frame0 (tiny rotation included)
const A = 0.418768349, B = 0.00105950832, TX = 670.585031, TY = 106.503905;

// camera track (local time, s, tx, ty): frame(t) = s * frame(t0) + (tx, ty)
const CAM = [
  [0.00, 1.0000, 0.0, 0.0], [0.04, 1.0000, 0.0, 0.0], [0.08, 1.0003, -0.5, -0.1], [0.12, 1.0016, -3.2, -1.3], [0.16, 1.0030, -6.7, -3.2],
  [0.20, 1.0055, -12.1, -5.3], [0.24, 1.0086, -18.9, -8.1], [0.28, 1.0121, -26.9, -10.2], [0.32, 1.0162, -36.2, -10.1], [0.36, 1.0212, -46.7, -10.4],
  [0.40, 1.0265, -58.7, -10.1], [0.44, 1.0324, -71.6, -10.4], [0.48, 1.0389, -85.9, -10.5], [0.52, 1.0456, -100.6, -10.7], [0.56, 1.0529, -117.4, -10.4],
  [0.60, 1.0613, -134.9, -11.1], [0.64, 1.0695, -153.4, -10.7], [0.68, 1.0782, -172.6, -11.0], [0.72, 1.0876, -193.3, -11.1], [0.76, 1.0973, -214.5, -11.4],
  [0.80, 1.1074, -236.7, -11.5], [0.84, 1.1182, -260.0, -11.6], [0.88, 1.1182, -260.0, -11.4], [0.92, 1.1284, -283.7, -13.7], [0.96, 1.1393, -307.7, -18.6],
  [1.00, 1.1511, -333.4, -23.6], [1.04, 1.1628, -359.3, -28.6], [1.08, 1.1749, -385.8, -33.8], [1.12, 1.1867, -412.3, -38.7], [1.16, 1.1994, -439.7, -44.5],
  [1.20, 1.2117, -466.8, -49.9], [1.24, 1.2243, -494.8, -55.1], [1.28, 1.2368, -522.3, -60.6], [1.32, 1.2495, -550.2, -66.2], [1.36, 1.2618, -577.6, -71.1],
  [1.40, 1.2740, -604.7, -76.2], [1.44, 1.2860, -631.2, -81.7], [1.48, 1.2980, -657.3, -87.0], [1.52, 1.3104, -684.2, -91.2], [1.56, 1.3206, -707.3, -96.6],
  [1.60, 1.3315, -730.8, -101.5], [1.64, 1.3411, -752.4, -105.3], [1.68, 1.3498, -772.1, -109.2], [1.72, 1.3585, -790.9, -112.9], [1.76, 1.3657, -807.3, -116.1],
  [1.80, 1.3729, -822.5, -119.3], [1.84, 1.3791, -835.8, -121.4], [1.88, 1.3791, -835.8, -121.9], [1.92, 1.3830, -844.8, -124.0], [1.96, 1.3867, -852.4, -126.0],
  [2.00, 1.3881, -856.5, -125.8], [2.04, 1.3890, -858.5, -126.0],
];
function cam(u) {
  if (u <= 0) return CAM[0];
  for (let i = 1; i < CAM.length; i++) if (u <= CAM[i][0]) {
    const a = CAM[i - 1], b = CAM[i], f = (u - a[0]) / (b[0] - a[0]);
    return [u, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
  }
  return CAM[CAM.length - 1];
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
  drawSelection(g, PURE_SEL);
  // the card floats on a soft dark shadow
  g.shadowColor = "rgba(0,0,0,0.55)"; g.shadowBlur = 34; g.shadowOffsetY = 6;
  g.fillStyle = "#000"; g.beginPath(); g.roundRect(PURE_CARD.x + 2, PURE_CARD.y + 2, PURE_CARD.w - 4, PURE_CARD.h - 4, 18); g.fill();
  g.shadowColor = "transparent";
  // the black edge of the source's crop above the page
  g.fillStyle = "#000"; g.fillRect(560, 0, 1100, 110.7);
  g.restore();
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
}
// The card (the only thing that changes) is redrawn into F0 each frame, lit by the same screen light.
const CARD_BOX = [1440, 150, 1940, 860];
function composeF0(local) {
  if (!STATIC) buildStatic();
  if (!F0) { F0 = document.createElement("canvas"); F0.width = W; F0.height = H; }
  const g = F0.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(STATIC, 0, 0);
  g.save();
  pageToF0(g);
  drawNoteCard(g, { x: PURE_CARD.x, y: PURE_CARD.y, w: PURE_CARD.w, notch: true, text: typed(local), caret: local < CARET_OFF, smiley: 1 });
  g.restore();
  return F0;
}

export const shot = {
  draw(ctx, local) {
    // tables are per source frame (25 fps); between frames the camera interpolates and the typing holds
    const [, s, tx, ty] = cam(local);
    const f0 = composeF0(local);
    ctx.save();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.setTransform(s, 0, 0, s, tx, ty);
    ctx.drawImage(f0, 0, 0);
    ctx.restore();
  },
  grade: () => ({ grain: 10 / 255 }),
  release() { releasePure(); STATIC = null; F0 = null; },
};
