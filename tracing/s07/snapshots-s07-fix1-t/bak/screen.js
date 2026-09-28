// s07 laptop screen: the Pure Imagination page (src/lib/pureimg.js) warped onto the laptop's screen quad, with the
// selection and the note card, and the text typed into the ticket button (29.16–30.52, measured widths, pureStateAt).
import { pureStateAt, PAGE_W, PAGE_H } from "../../lib/pureimg.js";
import { drawLaptopPage, drawLaptopOverlay } from "./page.js";
import { ctx2d } from "./tracekit.js";

// Laptop screen quad in the frame (measured, F3 docs; s05 and s07 share it): TL, TR, BR, BL.
export const QUAD = [[315, 246], [834, 168], [898, 519], [409, 648]];

// Homography page (u, v) -> frame (x, y) from four correspondences.
export function homography(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [X, Y] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); b.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); b.push(Y);
  }
  // Gaussian elimination
  const n = 8;
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < n; r++) if (r !== c) {
      const f = A[r][c] / A[c][c];
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const h = b.map((v, i) => v / A[i][i]);
  return (u, v) => { const w = h[6] * u + h[7] * v + 1; return [(h[0] * u + h[1] * v + h[2]) / w, (h[3] * u + h[4] * v + h[5]) / w]; };
}
export const PAGE_TO_FRAME = homography([[0, 0], [PAGE_W, 0], [PAGE_W, PAGE_H], [0, PAGE_H]], QUAD);

// Draw the image triangle s (image px) onto triangle d (frame px), affine, with a hair of overlap against seams.
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
  // only the source triangle's bounding box (plus a margin) is needed
  const bx0 = Math.max(0, Math.floor(Math.min(x0, x1, x2) - 2)), by0 = Math.max(0, Math.floor(Math.min(y0, y1, y2) - 2));
  const bx1 = Math.min(img.width, Math.ceil(Math.max(x0, x1, x2) + 2)), by1 = Math.min(img.height, Math.ceil(Math.max(y0, y1, y2) + 2));
  ctx.drawImage(img, bx0, by0, bx1 - bx0, by1 - by0, bx0, by0, bx1 - bx0, by1 - by0);
  ctx.restore();
}
// Warp a page-sized image (any resolution) onto the quad with an NX x NY mesh.
export function warpPage(ctx, img, NX = 12, NY = 8) {
  const sx = img.width / PAGE_W, sy = img.height / PAGE_H;
  const F = (i, j) => PAGE_TO_FRAME((i / NX) * PAGE_W, (j / NY) * PAGE_H);
  const S = (i, j) => [(i / NX) * PAGE_W * sx, (j / NY) * PAGE_H * sy];
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    tri(ctx, img, [S(i, j), S(i + 1, j), S(i + 1, j + 1)], [F(i, j), F(i + 1, j), F(i + 1, j + 1)]);
    tri(ctx, img, [S(i, j), S(i + 1, j + 1), S(i, j + 1)], [F(i, j), F(i + 1, j + 1), F(i, j + 1)]);
  }
}

// The page is rendered at K px per page unit (the screen is ~520 px wide in frame: 0.6 keeps it crisp enough).
const K = 0.62;
let base = null, pageC = null;
function buildBase() {
  // static page with a blank ticket button, plus the selection and the note card (all static during s07)
  const st = pureStateAt(29.5);
  // the page is painted into our own CPU canvas: pureimg's cached GPU canvas reads back differently from one browser
  // session to the next (alpha and colour sums vary; measured), which would make the render differ between workers
  const src = document.createElement("canvas"); src.width = PAGE_W; src.height = PAGE_H;
  drawLaptopPage(ctx2d(src), { ticketText: "", ticketCaret: false });
  base = document.createElement("canvas");
  base.width = Math.round(PAGE_W * K); base.height = Math.round(PAGE_H * K);
  const g = ctx2d(base);   // CPU canvas: it is read back below (see tracekit.js ctx2d)
  g.imageSmoothingQuality = "high";
  g.filter = "blur(0.5px)";
  g.drawImage(src, 0, 0, base.width, base.height);
  g.filter = "none";
  g.save(); g.scale(K, K); drawLaptopOverlay(g, st.overlay); g.restore();
  // the laptop screen is seen through air and glass: blacks lifted, whites a touch brighter (measured on the
  // rectified source screen: dark ground ~+20, lights ~+15 after the grade)
  // (the source's dark ground reads neutral grey, not green, and the middle of the screen glows a little)
  // (whites measured cream, not pink: brightest 5% BGR (232,240,245) on the source)
  g.globalCompositeOperation = "multiply"; g.fillStyle = "rgb(255,247,245)"; g.fillRect(0, 0, base.width, base.height);
  g.globalCompositeOperation = "screen"; g.fillStyle = "rgb(20,20,20)"; g.fillRect(0, 0, base.width, base.height);
  const gl = g.createRadialGradient(base.width * 0.42, base.height * 0.5, 0, base.width * 0.42, base.height * 0.5, base.width * 0.5);
  gl.addColorStop(0, "rgb(26,23,23)"); gl.addColorStop(1, "rgb(0,0,0)");
  g.fillStyle = gl; g.fillRect(0, 0, base.width, base.height);
  // fix pass 3: the source's ground is ~10 levels brighter toward the screen's right edge (dark-ground patches,
  // rectified, source - render: -5 at page x 200-600, +10 at x 1400-1600)
  const gr = g.createLinearGradient(base.width * 0.5, 0, base.width, 0);
  gr.addColorStop(0, "rgb(0,0,0)"); gr.addColorStop(0.55, "rgb(9,9,9)"); gr.addColorStop(1, "rgb(16,16,16)");
  g.fillStyle = gr; g.fillRect(0, 0, base.width, base.height);
  g.globalCompositeOperation = "source-over";
  // a touch more contrast: lifts the whites ~8 levels toward the source's cream and keeps the ground as dark
  { const t = document.createElement("canvas"); t.width = base.width; t.height = base.height; ctx2d(t).drawImage(base, 0, 0);
    g.globalCompositeOperation = "copy"; g.filter = "contrast(1.09)"; g.drawImage(t, 0, 0); g.filter = "none"; g.globalCompositeOperation = "source-over"; }
  // fix pass 2: least-squares tone fit of the whole warped screen against the source (pre-grade, blurred 8 px):
  // v -> 0.9 v + 0.03 (the source's screen is flatter: lifted ground, softer lights)
  g.globalCompositeOperation = "multiply"; g.fillStyle = "rgb(230,230,230)"; g.fillRect(0, 0, base.width, base.height);
  g.globalCompositeOperation = "lighter"; g.fillStyle = "rgb(8,8,8)"; g.fillRect(0, 0, base.width, base.height);
  g.globalCompositeOperation = "source-over";
  // colour: robust affine fit (the 60 % of screen pixels where page and source agree, pre-grade) - the source's
  // ground is neutral where the page's is green-black, its lights a little cooler. Blurred error in the quad -0.5.
  // fix pass 3: plus a smooth ground-level field (least-squares quadratic in page u, v of the source - render
  // difference over the dark ground patches, rectified; weighted to fade out above ~120 so lit art is untouched)
  { const im = g.getImageData(0, 0, base.width, base.height), d = im.data, BW = base.width, BH = base.height;
    const GC = [9.57, -40.15, -25.7, 37.53, -9.94, 33.77];
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], gg = d[i + 1], b = d[i + 2];
      const p = i >> 2, u = (p % BW) / BW, v = Math.floor(p / BW) / BH;
      const L = (r + gg + b) / 3, w = L < 120 ? 1 - L / 120 : 0;
      const o = w * (GC[0] + GC[1] * u + GC[2] * v + GC[3] * u * u + GC[4] * u * v + GC[5] * v * v);
      // and the upper right of the screen glows ~8 % brighter on the lit art (card, ribbon tail, pills; ratio of the
      // blurred source to the render over pixels > 110), below the marquee bar
      const du = u - 0.9, dv = v - 0.17, mq = Math.max(0, Math.min(1, (v - 0.045) / 0.025)), gk = 1 + 0.085 * mq * Math.exp(-(du * du) / 0.035 - (dv * dv) / 0.03);
      d[i] = (-0.0856 * b + 0.2028 * gg + 0.9038 * r - 1.08) * gk + o;
      d[i + 1] = (-0.0393 * b + 1.1264 * gg - 0.0445 * r - 8.67) * gk + o;
      d[i + 2] = (0.8606 * b + 0.1404 * gg - 0.0435 * r + 3.26) * gk + o;
    }
    g.putImageData(im, 0, 0); }
  pageC = document.createElement("canvas"); pageC.width = base.width; pageC.height = base.height;
}
// Ticket-button typing. The right edge of the typed run is pureimg's measured per-frame table (copied here);
// the source's glyphs are smaller than pureimg's 34 px button label (about 17 characters fill the run by 30.52),
// so the original line is revealed in a 25 px face to the same widths.
const TICKET_EDGE = [[29.16, 694], [29.24, 703], [29.28, 719], [29.36, 722], [29.4, 732], [29.44, 751], [29.56, 766], [29.64, 780], [29.72, 802], [29.84, 809],
  [29.92, 827], [30.04, 831], [30.08, 848], [30.2, 866], [30.24, 872], [30.28, 876], [30.36, 891], [30.44, 903], [30.52, 919]];
const TICKET_LINE = "Seen this, really good!";
const TFONT = "700 27.5px Poppins";
const edgeAt = (t) => { const T = TICKET_EDGE; if (t <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (t <= T[i][0]) { const [a, va] = T[i - 1], [b, vb] = T[i]; return va + (vb - va) * ((t - a) / (b - a)); } return T[T.length - 1][1]; };
function typedAt(g, t) {
  const f = Math.floor(t * 25 + 1e-6) / 25;
  // the caret already blinks in the empty button on the shot's first frames (29.04–29.12)
  if (f < 29.16) return "";
  const edge = edgeAt(f);
  g.save(); g.font = TFONT;
  let best = "";
  for (let n = 1; n <= TICKET_LINE.length; n++) { const pre = TICKET_LINE.slice(0, n); if (678 + g.measureText(pre).width + 4 <= edge + 3) best = pre; else break; }
  g.restore();
  return best;
}
// Fix pass 3: the source's typed glyphs are heavier, a little larger and softer than a crisp 700 face - drawn at
// 27.5 px with a 1.1-unit stroke of the same ink (weight), softened ~0.8 frame px (1.4 page px) before the warp.
function ticketText(g, text, caret) {
  g.save(); g.translate(802, 831); g.rotate(-0.03);   // (build pass: button centre re-measured, +2, +3)
  g.font = TFONT; g.fillStyle = "#26221f"; g.strokeStyle = "#26221f"; g.lineWidth = 1.1; g.lineJoin = "round";
  g.filter = "blur(1.4px)";
  if (text) { g.fillText(text, -122, 10); g.strokeText(text, -122, 10); }
  g.filter = "none";
  if (caret) { const w = text ? g.measureText(text).width : 0; g.fillRect(-120 + w, -12, 2.6, 27); }
  g.restore();
}
// The warped screen for film time t, cached per typed state (the page only changes when a letter appears).
// Returns { canvas, x, y } in frame pixels.
const SX0 = 300, SY0 = 150, SW = 620, SH = 520;
const SCREEN_SOFT = 0.6, SOFT_MIX = 0.5;   // px; the source screen is softer than the page (s0 MAE 26.0 -> 25.0; blurred error unchanged). Build pass: mix 0.5 of a 1 px copy matches the source's < 1 px detail energy (8.7 vs 8.3; 0.6 px alone 14.0)
const warped = new Map();
// The bright rim of the display glass along the screen's top and right edges (the source catches light there; the
// page's dark marquee covered it). Measured on the pre-grade target per 5 % of each edge: [t, inward offset px,
// width px, value 0..255]. Drawn after the warp, before the softening.
const RIM = [
  [QUAD[0], QUAD[1], [[0, 0, 1.6, 40], [0.05, 0, 2, 73], [0.15, 0, 2, 98], [0.25, 0.5, 2.2, 133], [0.35, 0.5, 2.2, 155], [0.45, 0.5, 2.2, 185],
    [0.55, 0.2, 2.2, 228], [0.65, 0.8, 2.6, 225], [0.75, 0.8, 3, 233], [0.85, 1.3, 3, 235], [0.95, 1.2, 3, 244], [1, 1.2, 3, 244]]],
  [QUAD[1], QUAD[2], [[0, 2.5, 2.8, 150], [0.05, 2.5, 2.8, 78], [0.15, 2.5, 2.8, 80], [0.25, 2, 2.6, 133], [0.35, 1.6, 2.6, 194], [0.45, 1.4, 3, 211],
    [0.55, 1, 3, 227], [0.65, 1, 3.2, 241], [0.75, 0.6, 3.5, 250], [0.85, 0.5, 3.8, 248], [0.95, 0.3, 3.8, 250], [1, 0.3, 3.8, 230]]],
  // build pass (this run): the left edge (BL -> TL) and the bottom lip (BR -> BL), measured the same way on the
  // source mean (snapshots/s07-bt/rimprof.py; values pre-grade): the plate's traced line sits ~1 px outside the
  // source's rim and is ~1.5 px narrower, so a second line is laid just inside it
  [QUAD[3], QUAD[0], [[0, 0, 1.2, 40], [0.05, 0, 2.2, 92], [0.1, 0.2, 2.2, 115], [0.2, 0.2, 2.4, 137], [0.25, 0.2, 2.4, 196], [0.35, 0.2, 2.4, 207],
    [0.4, 0.2, 2.6, 238], [0.5, 0, 2.8, 247], [0.6, 0.2, 3, 251], [0.7, 0, 3.2, 250], [0.8, 0, 3.2, 254], [0.9, 0.2, 3.2, 255], [0.95, 0.2, 3.2, 251], [1, 0, 3, 218]]],
  [QUAD[2], QUAD[3], [[0.15, -1, 1.8, 134], [0.2, -1.5, 2, 184], [0.25, -1.5, 2.2, 175], [0.3, -2, 2.2, 205], [0.35, -2, 2.4, 231], [0.4, -2.5, 2.4, 240],
    [0.5, -3, 2.6, 244], [0.6, -3.5, 2.6, 250], [0.7, -4, 2.6, 250], [0.8, -5.5, 2.6, 250], [0.9, -5, 2.6, 248], [0.95, -5.5, 2.2, 230]]],
];
const RIM_W = 0.82;   // the flat stroke plus the softening reads ~20 % wider than the measured FWHM
function drawRim(g) {
  g.save(); g.lineCap = "round";
  for (const [[ax, ay], [bx, by], T] of RIM) {
    const L = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / L, ny = (bx - ax) / L;
    const at = (t) => { let i = 1; while (i < T.length - 1 && T[i][0] < t) i++; const a = T[i - 1], b = T[i], u = (t - a[0]) / (b[0] - a[0] || 1); return a.map((v, k) => v + (b[k] - v) * u); };
    const N = 48;
    for (let k = 0; k < N; k++) {
      const t0 = k / N, t1 = (k + 1) / N, m = at((t0 + t1) / 2), [, off, w, v] = m;
      const p0 = [ax + (bx - ax) * t0 + nx * off, ay + (by - ay) * t0 + ny * off], p1 = [ax + (bx - ax) * t1 + nx * off, ay + (by - ay) * t1 + ny * off];
      g.beginPath(); g.moveTo(p0[0], p0[1]); g.lineTo(p1[0], p1[1]);
      g.lineWidth = w * RIM_W; g.strokeStyle = `rgb(${(v * 1.014).toFixed(1)},${v.toFixed(1)},${(v * 0.985).toFixed(1)})`; g.stroke();
    }
  }
  g.restore();
}
export function screenAt(t) {
  if (!base) buildBase();
  const g0 = ctx2d(pageC);
  g0.save(); g0.scale(K, K); const key = typedAt(g0, t); g0.restore();
  let c = warped.get(key);
  if (!c) {
    const page = pageAt(t);
    c = document.createElement("canvas"); c.width = SW; c.height = SH;
    const g = ctx2d(c);
    g.translate(-SX0, -SY0);
    if (SCREEN_SOFT > 0) {
      // the laptop screen is seen from ~1 m through the video's own softness: measured best blur (see fidelity/s07.md)
      const tmp = document.createElement("canvas"); tmp.width = SW; tmp.height = SH;
      const tg = ctx2d(tmp); tg.translate(-SX0, -SY0); warpPage(tg, page); drawRim(tg);
      g.setTransform(1, 0, 0, 1, 0, 0); g.filter = `blur(${SCREEN_SOFT}px)`; g.drawImage(tmp, 0, 0); g.filter = "none";
      // (build pass: the source's screen is softer still at the finest scale - its < 1 px detail energy is ~0.6 of the
      // 0.6 px render's - but canvas blur is coarse between 0.6 and 1 px, so a 1 px copy is laid over at SOFT_MIX)
      if (SOFT_MIX > 0) { g.globalAlpha = SOFT_MIX; g.filter = "blur(1px)"; g.drawImage(tmp, 0, 0); g.filter = "none"; g.globalAlpha = 1; }
    } else warpPage(g, page);
    warped.set(key, c);
  }
  return { canvas: c, x: SX0, y: SY0 };
}
// Page canvas for film time t (pre-warp): base + typed ticket text.
export function pageAt(t) {
  if (!base) buildBase();
  const g = ctx2d(pageC);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(base, 0, 0);
  g.scale(K, K);
  const typed = typedAt(g, t);
  if (typed !== null) ticketText(g, typed, true);
  g.setTransform(1, 0, 0, 1, 0, 0);
  return pageC;
}
export function releaseScreen() { base = null; pageC = null; warped.clear(); }   // (no pureimg cache is used any more)
