// s07 laptop screen: the Pure Imagination page (src/lib/pureimg.js) warped onto the laptop's screen quad, with the
// selection and the note card, and the text typed into the ticket button (29.16–30.52, measured widths, pureStateAt).
import { purePageCanvas, drawPureOverlay, pureStateAt, releasePure, PAGE_W, PAGE_H } from "../../lib/pureimg.js";

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
  const src = purePageCanvas(PAGE_W, PAGE_H, { ticketText: "", ticketCaret: false });
  base = document.createElement("canvas");
  base.width = Math.round(PAGE_W * K); base.height = Math.round(PAGE_H * K);
  const g = base.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.filter = "blur(0.5px)";
  g.drawImage(src, 0, 0, base.width, base.height);
  g.filter = "none";
  g.save(); g.scale(K, K); drawPureOverlay(g, st.overlay); g.restore();
  // the laptop screen is seen through air and glass: blacks lifted, whites a touch brighter (measured on the
  // rectified source screen: dark ground ~+20, lights ~+15 after the grade)
  // (the source's dark ground reads neutral grey, not green, and the middle of the screen glows a little)
  // (whites measured cream, not pink: brightest 5% BGR (232,240,245) on the source)
  g.globalCompositeOperation = "multiply"; g.fillStyle = "rgb(255,247,245)"; g.fillRect(0, 0, base.width, base.height);
  g.globalCompositeOperation = "screen"; g.fillStyle = "rgb(20,20,20)"; g.fillRect(0, 0, base.width, base.height);
  const gl = g.createRadialGradient(base.width * 0.42, base.height * 0.5, 0, base.width * 0.42, base.height * 0.5, base.width * 0.5);
  gl.addColorStop(0, "rgb(34,30,30)"); gl.addColorStop(1, "rgb(0,0,0)");
  g.fillStyle = gl; g.fillRect(0, 0, base.width, base.height);
  g.globalCompositeOperation = "source-over";
  // a touch more contrast: lifts the whites ~8 levels toward the source's cream and keeps the ground as dark
  { const t = document.createElement("canvas"); t.width = base.width; t.height = base.height; t.getContext("2d").drawImage(base, 0, 0);
    g.globalCompositeOperation = "copy"; g.filter = "contrast(1.09)"; g.drawImage(t, 0, 0); g.filter = "none"; g.globalCompositeOperation = "source-over"; }
  pageC = document.createElement("canvas"); pageC.width = base.width; pageC.height = base.height;
}
// Ticket-button typing. The right edge of the typed run is pureimg's measured per-frame table (copied here);
// the source's glyphs are smaller than pureimg's 34 px button label (about 17 characters fill the run by 30.52),
// so the original line is revealed in a 25 px face to the same widths.
const TICKET_EDGE = [[29.16, 694], [29.24, 703], [29.28, 719], [29.36, 722], [29.4, 732], [29.44, 751], [29.56, 766], [29.64, 780], [29.72, 802], [29.84, 809],
  [29.92, 827], [30.04, 831], [30.08, 848], [30.2, 866], [30.24, 872], [30.28, 876], [30.36, 891], [30.44, 903], [30.52, 919]];
const TICKET_LINE = "Seen this, really good!";
const TFONT = "700 26px Poppins";
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
function ticketText(g, text, caret) {
  g.save(); g.translate(800, 828); g.rotate(-0.03);
  g.font = TFONT; g.fillStyle = "#26221f";
  if (text) g.fillText(text, -122, 10);
  if (caret) { const w = text ? g.measureText(text).width : 0; g.fillRect(-120 + w, -12, 2.6, 27); }
  g.restore();
}
// The warped screen for film time t, cached per typed state (the page only changes when a letter appears).
// Returns { canvas, x, y } in frame pixels.
const SX0 = 300, SY0 = 150, SW = 620, SH = 520;
const warped = new Map();
export function screenAt(t) {
  if (!base) buildBase();
  const g0 = pageC.getContext("2d");
  g0.save(); g0.scale(K, K); const key = typedAt(g0, t); g0.restore();
  let c = warped.get(key);
  if (!c) {
    const page = pageAt(t);
    c = document.createElement("canvas"); c.width = SW; c.height = SH;
    const g = c.getContext("2d");
    g.translate(-SX0, -SY0);
    warpPage(g, page);
    warped.set(key, c);
  }
  return { canvas: c, x: SX0, y: SY0 };
}
// Page canvas for film time t (pre-warp): base + typed ticket text.
export function pageAt(t) {
  if (!base) buildBase();
  const g = pageC.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(base, 0, 0);
  g.scale(K, K);
  const typed = typedAt(g, t);
  if (typed !== null) ticketText(g, typed, true);
  g.setTransform(1, 0, 0, 1, 0, 0);
  return pageC;
}
export function releaseScreen() { base = null; pageC = null; warped.clear(); releasePure(); }
