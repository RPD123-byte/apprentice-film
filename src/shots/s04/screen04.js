// s04: the laptop screen from 22.44 to 23.12 — the page quad per source frame, MEASURED: SIFT matches inside the
// screen (the page itself), RANSAC homographies chained frame to frame back from 23.12, where the quad is s05's page
// quad under s05's own 23.12 settle (snapshots/s04-k2/tr/screen_track.py; median residual 0.1-1.2 px per step).
// 22.48 and 22.44 (the screen's first sliver at the left edge): fix1 measured them (they were extrapolated from
// 22.52-22.56 and sat 50-70 px too far left): an ECC affine of the page sliver from 22.52 to 22.48 (correlation 0.77)
// and on to 22.44 (0.95); the same step 22.56 -> 22.52 reproduces the measured 22.52 quad to within 1-10 px.
// (snapshots/s04-fix1w/tools/entryquad.py)
// The page itself is s05's (his site, MIXING DOWN: s05/screen.js's sokoCanvas, copied below), mapped through each
// frame's homography.
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
// ---- the page (purity fix): s05/screen.js's sokoCanvas as of the published render, copied (s04 no longer draws
// into s05's module state). The laptop view of the sōko page: stretched to the 16:10 screen, re-fitted, toned, soft.
const PW = 800, PH = 500, K = PW / 1600;
const knots = (K, x) => { const f = Math.max(0, Math.min(1, x)) * (K.length - 1), i = Math.min(K.length - 2, Math.floor(f)); return K[i] + (K[i + 1] - K[i]) * (f - i); };
let SOKO = null;
function sokoCanvas(sites) {
  if (SOKO) return SOKO;
  const c = document.createElement("canvas"); c.width = PW; c.height = PH;
  const g = c.getContext("2d");
  g.fillStyle = "#030303"; g.fillRect(0, 0, PW, PH);
  let page = null;
  try { page = sites && sites.sokoPageCanvas({ gaze: "down", scale: 1 }); } catch (e) { page = null; }
  g.imageSmoothingQuality = "high";
  // the page stretched to the screen, then the small affine fitted on the rectified source at 23.60
  // (page units: x' = 0.9957x - 0.0132y + 21.4, y' = 0.0037x + 1.0194y + 3.1)
  g.setTransform(K * 0.9957, K * 0.0037, K * -0.0132, K * 1.0194, K * 21.36, K * 3.14);
  g.filter = "brightness(0.92)";
  if (page) g.drawImage(page, 0, 0, page.width, page.height, 0, 6, 1600, 994);
  g.filter = "none"; g.setTransform(1, 0, 0, 1, 0, 0);
  if (!page) { g.fillStyle = "#f1f0ec"; g.font = "900 40px Archivo"; g.fillText("MIXING DOWN,", 30, 70); g.fillText("LATE AT NIGHT.", 30, 110); }
  if (!page) return c;
  // pass 3: the page as the source shows it at 23.56-23.68 (camera at rest), re-fitted to F1's current page: a
  // homography of the shown page, source page units -> this canvas's page units (ECC on the rectified screen, coarse to
  // fine, sigma 6/3/1.5; blurred error on the rectified page 22.6 -> 15.6, the headline and nav within 1-2 units).
  // The source page sits ~2.5 % larger and 10-15 units further left than the stretched page, a dark strip at the right.
  const c2 = document.createElement("canvas"); c2.width = PW; c2.height = PH;
  const q = c2.getContext("2d");
  q.fillStyle = "#030303"; q.fillRect(0, 0, PW, PH); q.imageSmoothingEnabled = true; q.imageSmoothingQuality = "high";
  const [[a, b, cc], [d, e, f], [gx, gy]] = SOKO_H;
  const Hs = (u, v) => { const w = gx * u + gy * v + 1; return [(a * u + b * v + cc) / w, (d * u + e * v + f) / w]; };
  const NX = 16, NY = 10;
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const u0 = (i / NX) * 1600, u1 = ((i + 1) / NX) * 1600, v0 = (j / NY) * 1000, v1 = ((j + 1) / NY) * 1000;
    const S = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => Hs(u, v).map((z) => z * K));
    const D = [[u0 * K, v0 * K], [u1 * K, v0 * K], [u1 * K, v1 * K], [u0 * K, v1 * K]];
    tri(q, c, [S[0], S[1], S[2]], [D[0], D[1], D[2]]);
    tri(q, c, [S[0], S[2], S[3]], [D[0], D[2], D[3]]);
  }
  // ... and its tone as the laptop shows it (pass 3): lifted darks, dimmer lit parts (quantile match of the rectified
  // screen at 23.56-23.68, render vs source, taken back through the grade to this canvas's values; 17 knots)
  { const id = q.getImageData(0, 0, PW, PH), d = id.data, T = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) T[v] = Math.round(knots(SOKO_TONE, v / 255));
    for (let i = 0; i < d.length; i += 4) { d[i] = T[d[i]]; d[i + 1] = T[d[i + 1]]; d[i + 2] = T[d[i + 2]]; }
    q.putImageData(id, 0, 0); }
  // fix pass 1d: the laptop shows the page soft and dim, the figure glowing in its screen's light (rectified source,
  // 23.56-23.68): a 1.5 px soften and a warm radial glow round the figure at page (0.52, 0.55), ~40 screen px across
  { const c3 = document.createElement("canvas"); c3.width = PW; c3.height = PH; const q3 = c3.getContext("2d");
    q3.filter = "blur(1.5px)"; q3.drawImage(c2, 0, 0); q3.filter = "none";
    q.globalCompositeOperation = "copy"; q.drawImage(c3, 0, 0); q.globalCompositeOperation = "source-over";
    const cx = 0.52 * PW, cy = 0.55 * PH, R = 62, gl = q.createRadialGradient(cx, cy, 0, cx, cy, R);
    gl.addColorStop(0, "rgba(40,40,38,1)"); gl.addColorStop(0.5, "rgba(22,22,21,1)"); gl.addColorStop(1, "rgba(0,0,0,1)");
    q.globalCompositeOperation = "lighter"; q.fillStyle = gl; q.fillRect(cx - R, cy - R, 2 * R, 2 * R); q.globalCompositeOperation = "source-over"; }
  SOKO = c2;
  return c2;
}
const SOKO_TONE = [1.5, 22.0, 36.2, 48.1, 61.0, 74.8, 88.4, 102.6, 117.3, 134.1, 154.1, 174.6, 193.8, 209.1, 222, 236, 250];
const SOKO_H = [[0.975366, -0.010991, 15.03], [-0.0035, 0.971431, 4.7676], [-2.0987e-5, -3.391e-6]];

// The page as the published render shows it, a pure function of the frame. It used to be built in two canvases that
// were never cleared: s05's composite (the sōko page drawn over it with source-over every frame) and this module's
// SOFT (the composite, lifted, drawn over it twice). The page's blurred border is semi-transparent, so it built up
// with every screen frame drawn since those canvases were made, and a frame's pixels depended on how many screen
// frames came before it (22.44-22.56 in order; any screen frame drawn first after s05's release). The film render
// draws every frame in order from a fresh page, so the screen's k-th frame (22.44 + (k - 1) / 25) showed the page built
// up k times: that is rebuilt here from k alone (the chain from empty canvases; the cursor only saves repeating the
// steps it has already done, and its state at step k is the same however it got there).
const FIRST = Math.round(SCREEN_Q[0][0] * 25);
let PAGE = null;
function pageAt(k, soft, blur) {
  if (!PAGE || PAGE.k > k || PAGE.soft !== soft || PAGE.blur !== blur) {
    const mk = () => { const c = document.createElement("canvas"); c.width = PW; c.height = PH; return c; };
    PAGE = { k: 0, soft, blur, comp: mk(), out: mk() };
  }
  const img = sokoCanvas(SITES), g = PAGE.comp.getContext("2d"), s = PAGE.out.getContext("2d");
  while (PAGE.k < k) {
    // (as s05's screenCanvas drew it for a time before 23.72) ...
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.filter = "none"; g.drawImage(img, 0, 0);
    // ... and as this module then lifted it
    s.setTransform(1, 0, 0, 1, 0, 0); s.globalAlpha = 1; s.filter = "brightness(1.07)"; s.drawImage(PAGE.comp, 0, 0);
    s.filter = `blur(${soft + blur}px) brightness(1.07)`; s.globalAlpha = blur > 0 ? 1 : 0.6; s.drawImage(PAGE.comp, 0, 0); s.globalAlpha = 1; s.filter = "none";
    PAGE.k++;
  }
  return PAGE.out;
}
// the page on the screen at frame t (false when the screen is not in frame / not measured)
export function drawScreen04(ctx, t, { soft = 0.6, blur = 0, dim = 1 } = {}) {
  const q = screenQuadAt(t);
  if (!q) return false;
  const img = pageAt(Math.round(t * 25) - FIRST + 1, soft, blur);
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
export function releaseScreen04() { PAGE = null; SOKO = null; }
