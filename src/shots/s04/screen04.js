// s04: the laptop screen from 22.44 to 23.12 — the page quad per source frame, MEASURED: SIFT matches inside the
// screen (the page itself), RANSAC homographies chained frame to frame back from 23.12, where the quad is s05's page
// quad under s05's own 23.12 settle (snapshots/s04-k2/tr/screen_track.py; median residual 0.1-1.2 px per step).
// 22.48 and 22.44 (the screen's first sliver at the left edge): fix1 measured them (they were extrapolated from
// 22.52-22.56 and sat 50-70 px too far left): an ECC affine of the page sliver from 22.52 to 22.48 (correlation 0.77)
// and on to 22.44 (0.95); the same step 22.56 -> 22.52 reproduces the measured 22.52 quad to within 1-10 px.
// (snapshots/s04-fix1w/tools/entryquad.py)
// The page itself is s05's (screenCanvas: his site, MIXING DOWN), mapped through each frame's homography.
import * as S5 from "../s05/screen.js";
import * as SITES from "../../lib/sites.js";

// [t, x0,y0 (page top-left), x1,y1 (top-right), x2,y2 (bottom-right), x3,y3 (bottom-left)] in frame px
export const SCREEN_Q = [
  [22.44, -294.6, 653.0, -65.9, 420.2, 129.1, 929.9, -78.8, 1229.2],
  [22.48, -294.3, 629.7, -19.9, 398.0, 177.1, 901.5, -77.0, 1199.0],
  [22.52, -290.8, 617.7, 29.9, 391.1, 224.1, 874.6, -77.3, 1164.4],
  [22.56, -279.9, 564.6, 115.2, 358.5, 294.5, 823.6, -58.4, 1116.7],
  [22.60, -266.6, 539.5, 162.8, 347.1, 333.1, 802.5, -56.7, 1105.5],
  [22.64, -235.9, 510.4, 215.9, 334.3, 380.6, 776.9, -37.6, 1072.5],
  [22.68, -211.6, 481.8, 275, 306, 424.8, 755.6, -9.5, 1021.8],
  [22.72, -174.8, 460.5, 321.1, 303.5, 464.9, 729.1, 11.9, 994.5],
  [22.76, -142.6, 441.6, 369.4, 291.8, 502.6, 705.9, 38.9, 957],
  [22.80, -98.7, 420.8, 416.5, 279.2, 544.9, 684.3, 69.5, 923.4],
  [22.84, -61.5, 406.8, 464.7, 265.4, 585.9, 666.7, 99, 890],
  [22.88, -26.3, 390.7, 507, 256.2, 622.3, 649.7, 126.1, 863.2],
  [22.92, 9.3, 375.9, 546.8, 243.4, 655.1, 637.3, 156.1, 834.5],
  [22.96, 78.1, 347.6, 617.9, 223.9, 721.4, 608.4, 213.5, 787.7],
  [23.00, 106.9, 336.4, 650.4, 217.5, 746.6, 597.3, 236, 769.1],
  [23.04, 136.6, 325.3, 679.6, 211, 772.6, 585.6, 259.9, 750.6],
  [23.08, 136.6, 325.4, 679.6, 211, 772.6, 585.6, 260, 750.5],
  [23.12, 163.1, 316.7, 704.9, 206.1, 794.8, 576.9, 282.1, 735.4]
];
export function screenQuadAt(t) {
  const f = Math.round(t * 25);
  for (const r of SCREEN_Q) if (Math.round(r[0] * 25) === f) return [[r[1], r[2]], [r[3], r[4]], [r[5], r[6]], [r[7], r[8]]];
  return null;
}
function homog(q) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, f = y0;
  return (u, v) => { const w = g * u + h * v + 1; return [(a * u + b * v + c) / w, (d * u + e * v + f) / w]; };
}
function tri(ctx, img, s, d) {
  const [[x0, y0], [x1, y1], [x2, y2]] = s, [[u0, v0], [u1, v1], [u2, v2]] = d;
  ctx.save();
  const cx = (u0 + u1 + u2) / 3, cy = (v0 + v1 + v2) / 3;
  const gr = (x, y) => { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1; return [x + (dx / l) * 0.7, y + (dy / l) * 0.7]; };
  ctx.beginPath(); ctx.moveTo(...gr(u0, v0)); ctx.lineTo(...gr(u1, v1)); ctx.lineTo(...gr(u2, v2)); ctx.closePath(); ctx.clip();
  const den = x0 * (y2 - y1) - x1 * y2 + x2 * y1 + (x1 - x2) * y0;
  const a = -(y0 * (u2 - u1) - y1 * u2 + y2 * u1 + (y1 - y2) * u0) / den;
  const b = (y1 * v2 + y0 * (v1 - v2) - y2 * v1 + (y2 - y1) * v0) / den;
  const c = (x0 * (u2 - u1) - x1 * u2 + x2 * u1 + (x1 - x2) * u0) / den;
  const d2 = -(x1 * v2 + x0 * (v1 - v2) - x2 * v1 + (x2 - x1) * v0) / den;
  const e = (x0 * (y2 * u1 - y1 * u2) + y0 * (x1 * u2 - x2 * u1) + (x2 * y1 - x1 * y2) * u0) / den;
  const f = (x0 * (y2 * v1 - y1 * v2) + y0 * (x1 * v2 - x2 * v1) + (x2 * y1 - x1 * y2) * v0) / den;
  ctx.transform(a, b, c, d2, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}
let SOFT = null;
// the page on the screen at frame t (false when the screen is not in frame / not measured)
export function drawScreen04(ctx, t, { soft = 0.6, blur = 0, dim = 1 } = {}) {
  const q = screenQuadAt(t);
  if (!q || typeof S5.screenCanvas !== "function") return false;
  let img = S5.screenCanvas(t, SITES, null);
  const PW = img.width, PH = img.height;
  if (!SOFT) { SOFT = document.createElement("canvas"); SOFT.width = PW; SOFT.height = PH; }
  const s = SOFT.getContext("2d");
  s.setTransform(1, 0, 0, 1, 0, 0); s.globalAlpha = 1; s.filter = "brightness(1.07)"; s.drawImage(img, 0, 0);
  s.filter = `blur(${soft + blur}px) brightness(1.07)`; s.globalAlpha = blur > 0 ? 1 : 0.6; s.drawImage(img, 0, 0); s.globalAlpha = 1; s.filter = "none";
  img = SOFT;
  const HP = homog(q);
  ctx.save();
  ctx.beginPath(); q.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip();
  ctx.fillStyle = "#000"; ctx.fill();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.globalAlpha = dim;
  const NX = 8, NY = 6;
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const u0 = i / NX, u1 = (i + 1) / NX, v0 = j / NY, v1 = (j + 1) / NY;
    const a = HP(u0, v0), b = HP(u1, v0), c = HP(u1, v1), d = HP(u0, v1);
    tri(ctx, img, [[u0 * PW, v0 * PH], [u1 * PW, v0 * PH], [u1 * PW, v1 * PH]], [a, b, c]);
    tri(ctx, img, [[u0 * PW, v0 * PH], [u1 * PW, v1 * PH], [u0 * PW, v1 * PH]], [a, c, d]);
  }
  ctx.restore();
  return true;
}
export function releaseScreen04() { SOFT = null; }
