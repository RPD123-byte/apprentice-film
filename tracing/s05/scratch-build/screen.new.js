// s05 laptop screen, frame by frame from the rectified source screen (snapshots/s05-study/rect*.jpg, luminance per
// frame in page columns):
//   –23.68  his own site (sōko, "MIXING DOWN, LATE AT NIGHT."), the page stretched to the 16:10 screen
//   23.72–23.96  a white file window zooms open from the right (left edge 620 → 410 → 260 → 150 → 70 → 20 → 0,
//                heavy zoom blur on the first frames)
//   24.00–24.12  dissolve to Pure Imagination (file window weight 0.93, 0.69, 0.68, 0.42), gone at 24.16
//   24.16–       Pure Imagination; the red selection pops at 25.16, the note card at 25.44 (pureStateAt)
import { sampleCurve } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";
import * as T from "./trace.js";
import { drawLaptopPage, drawLaptopOverlay } from "./pure.js";

const PW = 800, PH = 500;          // composite canvas: half a page unit per px (the quad is ~520 px wide)
const LAPTOP_PAGE = true;          // Pure Imagination from s05/pure.js with s07's screen tone (false: F3's page + the fitted LUTs)
const K = PW / 1600;

// homography page units -> frame (settled camera), from the traced screen quad
function homog(q) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, f = y0;
  return (u, v) => { const w = g * u + h * v + 1; return [(a * u + b * v + c) / w, (d * u + e * v + f) / w]; };
}
// the page is mapped a few px inside the traced glass (fitted by homography, render -> source, on the static Pure
// page at 24.6, 25.2 and 25.6 s: residual 1.1 px)
// (fix pass 1d: its left corners 3 px further left: the dark seam between the bezel's rim and the page measured 6 px
// here against the source's 3)
const PAGE_QUAD = [[317.7, 246.0], [834.7, 168.7], [900.9, 521.2], [408.9, 644.8]];
const HP = homog(PAGE_QUAD);
const hp = (x, y) => HP(x / 1600, y / 1000);

// ---- the window that zooms open at 23.72: an original, generic mail/file list in a browser window (dark tab strip,
// toolbar, a sidebar, rows of square coloured avatars with a title and a grey second line), laid out from the
// rectified source at 23.96 (snapshots/s05-study/files.jpg); everything is soft, like the source's screen capture
let FILES = null;
const XS = 14;
function filesCanvas() {
  if (FILES) return FILES;
  const c = document.createElement("canvas"); c.width = PW; c.height = PH;
  const g = c.getContext("2d"); g.scale(K, K);
  const r = rng(701);
  g.fillStyle = "#ededea"; g.fillRect(0, 0, 1600, 1000);
  // tab strip
  g.fillStyle = "#26272a"; g.fillRect(0, 0, 1600, 38);
  g.fillStyle = "#8d8e90"; for (let x = 12; x < 1560; x += 140 + r() * 40) g.fillRect(x, 14, 90 + r() * 60, 8);
  g.fillStyle = "#dcdcd8"; g.fillRect(0, 38, 1600, 8);
  // toolbar (the right-hand circles stay; the rest of the layout sits XS units right, pass 3: measured on the
  // rectified source at 23.92-23.96, the avatars, their titles, the sidebar and the divider ~14 units right of pass 2's)
  g.fillStyle = "#a5a5a1"; for (const x of [1365, 1420, 1475, 1535]) { g.beginPath(); g.arc(x, 80, 13, 0, 7); g.fill(); }
  g.save(); g.translate(XS, 0);
  g.fillStyle = "#9d9d99"; for (const x of [40, 88, 140, 200, 268, 318]) { g.beginPath(); g.arc(x, 72, 12, 0, 7); g.fill(); }
  g.fillStyle = "#6e6e6a"; g.fillRect(352, 66, 86, 14);
  g.fillStyle = "#dededa"; g.fillRect(-XS, 108, 1600, 3); g.fillRect(230, 111, 3, 889);
  // sidebar
  for (let i = 0; i < 10; i++) { const y = 142 + i * 34; g.fillStyle = "#9a9a96"; g.beginPath(); g.roundRect(28, y - 8, 16, 16, 4); g.fill(); g.fillStyle = "#b5b5b1"; g.fillRect(64, y - 4, 40 + r() * 70, 9); }
  // header of the list
  g.fillStyle = "#8a8a86"; g.beginPath(); g.arc(268, 160, 12, 0, 7); g.fill();
  g.fillStyle = "#7c7c78"; g.fillRect(300, 154, 40, 12); g.fillStyle = "#a9a9a5"; g.fillRect(352, 154, 250, 10); g.fillRect(290, 184, 240, 8);
  // rows
  // (fix pass 1d: rows ~10 % tighter and more of them, the avatars half as saturated, as the source's list reads)
  const cols = ["#d6a64e", "#c65a74", "#8b8467", "#8f86c3", "#9189c4", "#8c8878", "#8a82bf", "#8d86c2", "#8b85c0", "#85807a", "#bdb9b6", "#77736f", "#9a8f79", "#8d8fae", "#a9a7a4", "#76726e", "#8f8aa8", "#9b9690"];
  const desat = (hex) => { const n = parseInt(hex.slice(1), 16), R = n >> 16, G = (n >> 8) & 255, B = n & 255, L = (R + G + B) / 3; return `rgb(${Math.round(L + (R - L) * 0.5)},${Math.round(L + (G - L) * 0.5)},${Math.round(L + (B - L) * 0.5)})`; };
  for (let i = 0; i < 17; i++) {
    const y = 230 + i * 46.5;
    g.fillStyle = desat(cols[i]); g.beginPath(); g.roundRect(298, y - 16, 36, 32, 6); g.fill();
    g.fillStyle = "#7b7b77"; g.fillRect(352, y - 11, 60 + r() * 80, 9);
    g.fillStyle = "#adadA9"; g.fillRect(352, y + 5, 160 + r() * 260, 7);
  }
  g.restore();
  // the window's right edge
  g.fillStyle = "#1a1a1a"; g.fillRect(1584, 0, 16, 1000);
  // soften like the capture
  const s2 = document.createElement("canvas"); s2.width = PW; s2.height = PH;
  const q = s2.getContext("2d"); q.filter = "blur(1.2px) brightness(0.94)"; q.drawImage(c, 0, 0);
  FILES = s2;
  return s2;
}

// ---- sōko on the laptop: the full page stretched to the screen (the source squeezes it the same way)
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

// window rectangle (page units) and content blur (page units) per source frame while it zooms open, measured on
// the rectified source against the last sōko frame (edges sharp, ~6 units; the list inside smeared by the zoom)
const ZOOM = [[23.72, 612, 150, 1504, 879, 7], [23.76, 394, 93, 1545, 968, 6], [23.80, 249, 55, 1568, 1000, 4], [23.84, 139, 27, 1579, 1000, 3], [23.88, 59, 13, 1583, 1000, 2], [23.92, 11, 9, 1584, 1000, 1], [23.96, 0, 16, 1584, 1000, 0]];
const FADE = [[24.0, 0.94], [24.04, 0.62], [24.08, 0.61], [24.12, 0.39], [24.16, 0]];
const WIN = [0, 16, 1584, 1000];      // the window's final rect (a dark strip stays at the right edge)
const SMEAR_W = [[23.72, 30], [23.76, 15], [23.80, 6], [23.84, 2]];

// How the laptop shows Pure Imagination: the page seen at this angle, lifted blacks and softer whites. Per-channel
// cubic fitted by quantile matching of the screen region (render vs the settled source frame, grade undone):
// value' = a x^3 + b x^2 + c x + d on the shown value (drawScreen then lifts by 1.07, so the LUT is taken before it)
const PURE_CURVE = { r: [2.076, -3.2275, 2.148, -0.042], g: [0.9817, -1.4214, 1.4227, -0.0054], b: [1.2635, -1.533, 1.2153, 0.0517] };
// ... then a second, monotone correction (17 knots over the shown value 0..1) fitted on the parts of the page whose
// drawing agrees with the source's (local correlation > 0.7 or flat, isotonic regression per channel)
const PURE_CURVE2 = {
  r: [0.167, 0.172, 0.176, 0.214, 0.265, 0.318, 0.374, 0.430, 0.510, 0.578, 0.630, 0.715, 0.773, 0.832, 0.834, 0.839, 0.849],
  g: [0.177, 0.181, 0.186, 0.211, 0.251, 0.316, 0.378, 0.435, 0.488, 0.544, 0.595, 0.658, 0.748, 0.829, 0.877, 0.891, 0.920],
  b: [0.166, 0.170, 0.176, 0.211, 0.256, 0.338, 0.390, 0.444, 0.461, 0.524, 0.588, 0.690, 0.744, 0.782, 0.803, 0.852, 0.928],
};
const knots = (K, x) => { const f = Math.max(0, Math.min(1, x)) * (K.length - 1), i = Math.min(K.length - 2, Math.floor(f)); return K[i] + (K[i + 1] - K[i]) * (f - i); };
let PLUT = null;
function pureLUT() {
  if (PLUT) return PLUT;
  PLUT = ["r", "g", "b"].map((ch) => {
    const [a, b, c, d] = PURE_CURVE[ch], L = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) { const x = Math.min(1, (1.07 * v) / 255), y = ((a * x + b) * x + c) * x + d; L[v] = Math.round((knots(PURE_CURVE2[ch], Math.min(1, y)) / 1.07) * 255); }
    return L;
  });
  return PLUT;
}
function applyLUT(g, w, h, L) {
  const id = g.getImageData(0, 0, w, h), p = id.data;
  for (let i = 0; i < p.length; i += 4) { p[i] = L[0][p[i]]; p[i + 1] = L[1][p[i + 1]]; p[i + 2] = L[2][p[i + 2]]; }
  g.putImageData(id, 0, 0);
}

// ---- Pure Imagination as the laptop shows it: s05/pure.js (the laptop-view page s07 re-measured) with s07's measured
// screen tone (copied from src/shots/s07/screen.js buildBase: air-and-glass lift, the source's neutral ground and
// cooler lights by a robust affine colour fit, a smooth ground-level field, the brighter upper right, a touch of
// contrast), so the page reads the same in s05 and s07. Cached per selection / card state (they pop 25.16-25.72).
const ctx2d = (c) => c.getContext("2d", { willReadFrequently: true });
const LP_Q = {
  r: [0.0, 0.046, 0.092, 0.138, 0.251, 0.329, 0.38, 0.432, 0.482, 0.527, 0.581, 0.639, 0.705, 0.766, 0.839, 0.911, 1.0],
  g: [0.0, 0.054, 0.108, 0.166, 0.276, 0.347, 0.393, 0.436, 0.489, 0.548, 0.614, 0.668, 0.717, 0.786, 0.859, 0.963, 1.0],
  b: [0.0, 0.035, 0.071, 0.135, 0.243, 0.302, 0.366, 0.421, 0.478, 0.529, 0.579, 0.637, 0.727, 0.795, 0.912, 0.975, 1.0],
};
// the page as the laptop shows it is softer than s07's (pass 3: blurred error on the screen, 0.5 -> LP_BLUR px here)
const LP_BLUR = 1.5;   // (fix pass 1d: 1.2 -> 1.5, and a fixed screen grain below: the source's page is softer and noisier)
const LP_FIX_K = [0, 55, 74, 102, 138, 176, 230, 255];
const LP_FIX = [[0, -2.2, -6.3, 0, -3.5, -2, 1.5, 0], [0, -3.9, -8.3, 0.8, -3.1, -1.2, 1.5, 0], [0, 2.4, -3.4, 3.2, -2.3, -0.4, -1, 0]];
const pieceLin = (X, Y, v) => { for (let i = 1; i < X.length; i++) if (v <= X[i]) return Y[i - 1] + ((Y[i] - Y[i - 1]) * (v - X[i - 1])) / (X[i] - X[i - 1]); return Y[Y.length - 1]; };
let LP_SRC = null;
const LP = new Map();
function laptopCanvas(overlay) {
  const key = `${(overlay.sel || 0).toFixed(3)}|${overlay.card ? overlay.card.appear.toFixed(3) + "|" + overlay.card.smiley + "|" + (overlay.card.contents ?? 1).toFixed(2) : "-"}`;
  let base = LP.get(key);
  if (base) return base;
  if (!LP_SRC) { LP_SRC = document.createElement("canvas"); LP_SRC.width = 1600; LP_SRC.height = 1000; drawLaptopPage(ctx2d(LP_SRC), { ticketText: null }); }
  base = document.createElement("canvas"); base.width = PW; base.height = PH;
  const g = ctx2d(base);
  g.imageSmoothingQuality = "high";
  g.filter = `blur(${LP_BLUR}px)`; g.drawImage(LP_SRC, 0, 0, PW, PH); g.filter = "none";
  g.save(); g.scale(K, K); drawLaptopOverlay(g, overlay); g.restore();
  g.globalCompositeOperation = "multiply"; g.fillStyle = "rgb(255,247,245)"; g.fillRect(0, 0, PW, PH);
  g.globalCompositeOperation = "screen"; g.fillStyle = "rgb(20,20,20)"; g.fillRect(0, 0, PW, PH);
  const gl = g.createRadialGradient(PW * 0.42, PH * 0.5, 0, PW * 0.42, PH * 0.5, PW * 0.5);
  gl.addColorStop(0, "rgb(26,23,23)"); gl.addColorStop(1, "rgb(0,0,0)");
  g.fillStyle = gl; g.fillRect(0, 0, PW, PH);
  const gr = g.createLinearGradient(PW * 0.5, 0, PW, 0);
  gr.addColorStop(0, "rgb(0,0,0)"); gr.addColorStop(0.55, "rgb(9,9,9)"); gr.addColorStop(1, "rgb(16,16,16)");
  g.fillStyle = gr; g.fillRect(0, 0, PW, PH);
  g.globalCompositeOperation = "source-over";
  { const tq = document.createElement("canvas"); tq.width = PW; tq.height = PH; ctx2d(tq).drawImage(base, 0, 0);
    g.globalCompositeOperation = "copy"; g.filter = "contrast(1.09)"; g.drawImage(tq, 0, 0); g.filter = "none"; g.globalCompositeOperation = "source-over"; }
  g.globalCompositeOperation = "multiply"; g.fillStyle = "rgb(230,230,230)"; g.fillRect(0, 0, PW, PH);
  g.globalCompositeOperation = "lighter"; g.fillStyle = "rgb(8,8,8)"; g.fillRect(0, 0, PW, PH);
  g.globalCompositeOperation = "source-over";
  { const im = g.getImageData(0, 0, PW, PH), d = im.data;
    const GC = [9.57, -40.15, -25.7, 37.53, -9.94, 33.77];
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], gg = d[i + 1], b = d[i + 2];
      const q = i >> 2, u = (q % PW) / PW, v = Math.floor(q / PW) / PH;
      const L = (r + gg + b) / 3, w = L < 120 ? 1 - L / 120 : 0;
      const o = w * (GC[0] + GC[1] * u + GC[2] * v + GC[3] * u * u + GC[4] * u * v + GC[5] * v * v);
      const du = u - 0.9, dv = v - 0.17, mq = Math.max(0, Math.min(1, (v - 0.045) / 0.025)), gk = 1 + 0.085 * mq * Math.exp(-(du * du) / 0.035 - (dv * dv) / 0.03);
      d[i] = (-0.0856 * b + 0.2028 * gg + 0.9038 * r - 1.08) * gk + o;
      d[i + 1] = (-0.0393 * b + 1.1264 * gg - 0.0445 * r - 8.67) * gk + o;
      d[i + 2] = (0.8606 * b + 0.1404 * gg - 0.0435 * r + 3.26) * gk + o;
    }
    g.putImageData(im, 0, 0); }
  // ... and s05's own last step: per-channel quantile match of the shown screen (un-graded render vs source, 24.40,
  // 25.00, 25.60, 26.20; 17 knots, monotone): the source's page ground is a little darker here than in s07
  { const im = g.getImageData(0, 0, PW, PH), d = im.data, L = [LP_Q.r, LP_Q.g, LP_Q.b].map((Q) => { const T = new Uint8ClampedArray(256); for (let v = 0; v < 256; v++) T[v] = Math.round(knots(Q, v / 255) * 255); return T; });
    for (let i = 0; i < d.length; i += 4) { d[i] = L[0][d[i]]; d[i + 1] = L[1][d[i + 1]]; d[i + 2] = L[2][d[i + 2]]; }
    g.putImageData(im, 0, 0); }
  // ... and pass 3's: the neutral tones by band (graded render vs source on the rectified page, pixels grey in both):
  // the page's ground read 2-4 levels too green-yellow, its dark greys 4-6 (knots in this canvas's values, offsets
  // converted through the grade's slope there; the sparse mid-bright bands at half strength)
  { const im = g.getImageData(0, 0, PW, PH), d = im.data, L = LP_FIX.map((F) => { const T = new Uint8ClampedArray(256); for (let v = 0; v < 256; v++) T[v] = Math.round(v + pieceLin(LP_FIX_K, F, v)); return T; });
    for (let i = 0; i < d.length; i += 4) { d[i] = L[0][d[i]]; d[i + 1] = L[1][d[i + 1]]; d[i + 2] = L[2][d[i + 2]]; }
    g.putImageData(im, 0, 0); }
  // fix pass 1d: the screen's grain (a fixed seeded field, the same every frame so it does not boil): ~2.5 levels
  { const im = g.getImageData(0, 0, PW, PH), d = im.data;
    for (let i = 0, q = 0; i < d.length; i += 4, q++) {
      let h = Math.imul(q ^ 0x9e3779b9, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
      const n = ((h >>> 0) / 4294967296 - 0.5) * 5.5;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    g.putImageData(im, 0, 0); }
  if (LP.size > 6) LP.delete(LP.keys().next().value);
  LP.set(key, base);
  return base;
}

let COMP = null;
export function screenCanvas(t, sites, pure) {
  if (!COMP) { COMP = document.createElement("canvas"); COMP.width = PW; COMP.height = PH; }
  const g = COMP.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.filter = "none";
  const f = Math.round(t * 25 + 1e-6) / 25;      // the screen changes on source frames
  if (f < 23.72 - 1e-6) {
    g.drawImage(sokoCanvas(sites), 0, 0);
  } else if (f < 24.0 - 1e-6) {
    g.drawImage(sokoCanvas(sites), 0, 0);
    let z = ZOOM[ZOOM.length - 1];
    for (const row of ZOOM) if (f >= row[0] - 1e-6) z = row;
    const [, x0, y0, x1, y1, bl] = z;
    const sm = SMEAR_W.find((r) => Math.abs(r[0] - f) < 0.02);
    const L = (sm ? sm[1] : 0) * 1.54;      // screen px -> canvas px
    if (L < 1) {
      g.save(); g.beginPath(); g.rect(x0 * K, y0 * K, (x1 - x0) * K, (y1 - y0) * K); g.clip();
      g.fillStyle = "#e1e1de"; g.fill();
      if (bl > 0) g.filter = `blur(${(bl * K).toFixed(1)}px)`;
      g.drawImage(filesCanvas(), x0 * K, y0 * K, (x1 - x0) * K, (y1 - y0) * K);
      g.restore(); g.filter = "none";
    } else {
      // the window smeared along its zoom (horizontal), its left edge feathered over ~12 screen px
      const W = document.createElement("canvas"); W.width = PW; W.height = PH;
      const w = W.getContext("2d");
      w.save(); w.beginPath(); w.rect(x0 * K, y0 * K, (x1 - x0) * K, (y1 - y0) * K); w.clip();
      w.fillStyle = "#e1e1de"; w.fill(); w.filter = `blur(${(Math.max(bl, 3) * K).toFixed(1)}px)`;
      w.drawImage(filesCanvas(), x0 * K, y0 * K, (x1 - x0) * K, (y1 - y0) * K); w.restore(); w.filter = "none";
      w.globalCompositeOperation = "destination-out";
      const fe = w.createLinearGradient(x0 * K, 0, x0 * K + 18, 0); fe.addColorStop(0, "rgba(0,0,0,0.85)"); fe.addColorStop(1, "rgba(0,0,0,0)");
      w.fillStyle = fe; w.fillRect(x0 * K - 2, 0, 22, PH);
      // (copies summed with "lighter" at 1/N each, so the smeared window stays opaque where they all overlap)
      const A = document.createElement("canvas"); A.width = PW; A.height = PH;
      const a = A.getContext("2d"); a.globalCompositeOperation = "lighter";
      const N = Math.max(3, Math.round(L / 2));
      for (let i = 0; i < N; i++) { a.globalAlpha = 1 / N; a.drawImage(W, (i / (N - 1) - 0.5) * L, 0); }
      g.drawImage(A, 0, 0);
    }
  } else {
    let a = 0;
    for (const [tt, v] of FADE) if (f >= tt - 1e-6) a = v;
    if (pure && LAPTOP_PAGE) {
      // (s07's tone is final: take back the 1.07 lift drawScreen gives every page)
      const ov = pure.pureStateAt(t).overlay;
      if (ov.card) ov.card = { ...ov.card, contents: Math.max(0, Math.min(1, (f - 25.60) / 0.08)) };
      g.filter = "brightness(0.9346)"; g.drawImage(laptopCanvas(ov), 0, 0); g.filter = "none";
    } else if (pure) {
      const st = pure.pureStateAt(t);
      g.drawImage(pure.purePageCanvas(PW, PH, st.page), 0, 0);
      g.save(); g.scale(K, K); pure.drawPureOverlay(g, st.overlay); g.restore();
      applyLUT(g, PW, PH, pureLUT());
    } else { g.fillStyle = "#1c1d1a"; g.fillRect(0, 0, PW, PH); }
    if (a > 0) { g.globalAlpha = a; g.drawImage(filesCanvas(), WIN[0] * K, WIN[1] * K, (WIN[2] - WIN[0]) * K, (WIN[3] - WIN[1]) * K); g.globalAlpha = 1; }
  }
  return COMP;
}

// Map the composite onto the screen quad (ctx in settled frame coordinates), as a grid of affine triangles.
const SCREEN_CLIP = T.SCREEN.map(([x, y], i) => [i === 0 || i === 3 ? x - 3 : x, y]);
let SOFT = null;
export function drawScreen(ctx, t, sites, pure, { dim = 1, soft = 0.6 } = {}) {
  let img = screenCanvas(t, sites, pure);
  if (soft > 0) {
    if (!SOFT) { SOFT = document.createElement("canvas"); SOFT.width = PW; SOFT.height = PH; }
    const s = SOFT.getContext("2d");
    s.setTransform(1, 0, 0, 1, 0, 0); s.filter = "brightness(1.07)"; s.drawImage(img, 0, 0);
    s.filter = `blur(${soft}px) brightness(1.07)`; s.globalAlpha = 0.6; s.drawImage(img, 0, 0); s.globalAlpha = 1; s.filter = "none";
    img = SOFT;
  }
  ctx.save();
  ctx.beginPath(); SCREEN_CLIP.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip();
  ctx.fillStyle = "#000"; ctx.fill();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.globalAlpha = dim;
  const NX = 8, NY = 6;
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const u0 = (i / NX) * 1600, u1 = ((i + 1) / NX) * 1600, v0 = (j / NY) * 1000, v1 = ((j + 1) / NY) * 1000;
    const a = hp(u0, v0), b = hp(u1, v0), c = hp(u1, v1), d = hp(u0, v1);
    tri(ctx, img, [[u0 * K, v0 * K], [u1 * K, v0 * K], [u1 * K, v1 * K]], [a, b, c]);
    tri(ctx, img, [[u0 * K, v0 * K], [u1 * K, v1 * K], [u0 * K, v1 * K]], [a, c, d]);
  }
  ctx.restore();
}

// Draw the triangle s (image px) of img onto the triangle d (current ctx coordinates).
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

export function releaseScreen() { FILES = null; SOKO = null; COMP = null; SOFT = null; PLUT = null; LP_SRC = null; LP.clear(); }

// The glass's lit rim: a thin bright line along the screen's inner top and right edges (the screen lights its own bezel
// edge). Measured on the un-graded source (perpendicular profiles every 0.1 of each edge, 23.60, 23.88, 24.40, 25.00,
// 26.00: the same in every frame): peak 0.33-0.88 along the top (brightest toward the top-right corner), 0.26-0.95 down
// the right side (brightest low), centred ~0.7 px inside the traced edge, about 2.5 px wide at half height.
const RIM = [
  { a: [315, 246], b: [834, 169.8], w: 2.4, v: [[0, 0.22], [0.1, 0.33], [0.3, 0.47], [0.5, 0.72], [0.7, 0.82], [0.9, 0.88], [1, 0.8]] },
  { a: [833, 168], b: [898, 519], w: 2.1, v: [[0, 0.2], [0.1, 0.26], [0.3, 0.55], [0.5, 0.86], [0.7, 0.9], [0.9, 0.95], [1, 0.9]] },
  // fix pass 1d: the bottom and left edges light up too (profiles across them at 25.00: peaks 0.76-0.87 along the bottom,
  // 0.3-0.75 down the left, brightest in its middle)
  { a: [898, 520], b: [409, 649], w: 2.6, v: [[0, 0.7], [0.3, 0.8], [0.6, 0.86], [0.85, 0.85], [1, 0.6]] },
  { a: [408, 648], b: [312, 247], w: 2.2, v: [[0, 0.3], [0.3, 0.55], [0.55, 0.74], [0.8, 0.7], [1, 0.5]] },
];
export function drawScreenRim(ctx) {
  ctx.save();
  ctx.filter = "blur(0.5px)"; ctx.lineCap = "round";
  for (const { a, b, v, w } of RIM) {
    ctx.lineWidth = w;
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = dy / L, ny = -dx / L, o = -0.7;   // (n: outward)
    const A = [a[0] + nx * o, a[1] + ny * o], B = [b[0] + nx * o, b[1] + ny * o];
    const gr = ctx.createLinearGradient(A[0], A[1], B[0], B[1]);
    for (const [u, val] of v) { const c = Math.round(val * 255); gr.addColorStop(u, `rgb(${c},${c},${c})`); }
    ctx.strokeStyle = gr; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke();
  }
  ctx.restore();
}
