// s01 laptop screen: the three-finger page carousel, read off the source frame by frame.
//
// The screen shows a horizontal tape of pages seen through a window one page wide. p(t) is the window's left
// edge in page widths (tape slot i = page i). Every value below is a measured SOURCE frame (0.04 s steps): the
// light/dark page boundaries were located per frame in plate coordinates (snapshots/s01-fix1-meas/edges.py), then
// refined by fitting each rectified frame's column profile against the four pages (pfit2.py; mostly within ±0.01).
// The source's own quirks are kept: pages always come in from the right except the last move (sōko returns
// from the left); two slots change page mid-move (machines -> sōko) the way the source cuts them; and
// 2.44/2.48, 3.44/3.48 are repeated frames.
// Motion blur is horizontal only: a continuous box whose width is measured per source frame (LTAB, blurWidth).
import { PU_W, PU_H, drawLettersPage, drawMachinesPage, drawIssuePage, drawSokoLaptop } from "./pages.js";

const P = [
  [0, 0], [0.6, 0], [0.64, 0.005], [0.68, 0.095], [0.72, 0.281], [0.76, 0.443], [0.8, 0.557], [0.84, 0.619], [0.88, 0.648],
  [0.92, 0.662], [0.96, 0.663], [1.0, 0.665], [1.04, 0.667], [1.08, 0.691], [1.12, 0.823], [1.16, 1.24], [1.2, 1.646],
  [1.24, 1.83], [1.28, 1.915], [1.32, 1.975], [1.36, 1.998], [1.4, 2.0], [1.52, 2.003], [1.56, 2.085], [1.6, 2.204], [1.64, 2.399],
  [1.68, 2.508], [1.72, 2.565], [1.76, 2.591], [1.8, 2.6], [1.84, 2.605], [1.88, 2.637], [1.92, 2.744], [1.96, 3.0],
  [2.0, 3.45], [2.04, 3.716], [2.08, 3.862], [2.12, 3.945], [2.16, 3.982], [2.2, 3.998], [2.24, 4.0], [2.32, 4.0], [2.36, 4.03],
  [2.4, 4.155], [2.44, 4.415], [2.48, 4.415], [2.52, 4.646], [2.56, 4.76], [2.6, 4.818], [2.64, 4.834], [2.68, 4.835],
  [2.76, 4.835], [2.8, 4.845], [2.84, 4.924], [2.88, 4.966], [2.92, 5.11], [2.96, 5.606], [3.0, 5.818], [3.04, 5.912], [3.08, 5.975],
  [3.12, 6.0], [3.16, 6.003], [3.2, 6.045], [3.24, 6.158], [3.28, 6.364], [3.32, 6.618], [3.36, 6.81], [3.4, 7.2], [3.44, 7.726],
  [3.48, 7.726], [3.52, 7.965], [3.56, 7.997], [3.6, 8.035], [3.64, 8.234], [3.68, 8.618], [3.72, 8.824], [3.76, 8.918], [3.8, 8.968],
  [3.84, 8.994], [3.88, 9.0], [4.12, 9.0], [4.16, 8.71], [4.2, 8.376], [4.24, 8.205], [4.28, 8.123], [4.32, 8.081],
  [4.36, 8.04], [4.4, 8.012], [4.44, 8.003], [4.48, 8.0], [6.1, 8.0],
];
function pAt(t) {
  if (t <= P[0][0]) return P[0][1];
  for (let i = 1; i < P.length; i++) if (t <= P[i][0]) { const [a, va] = P[i - 1], [b, vb] = P[i]; return va + (vb - va) * ((t - a) / (b - a)); }
  return P[P.length - 1][1];
}
// the page in each tape slot (0 sōko, 1 letters, 2 machines, 3 issue)
function slotPage(i, t) {
  switch (i) {
    case 0: case 8: return 0;
    case 1: case 3: case 7: case 9: return 1;
    case 2: return t < 1.58 ? 2 : 0;
    case 4: return t < 2.5 ? 2 : 0;
    case 5: return 3;
    case 6: return 2;
    default: return -1;
  }
}

// ---------- screen geometry (plate coordinates, measured at 8x on the corners) ----------
// BEZEL: the lit screen as clipped by the lid. CONTENT: the quad the page is mapped to — the page carries less
// perspective than the bezel (interior page edges lean ~40% as much as the bezel's sides), so its bottom
// corners run under the bezel.
export const BEZEL = [[855, 62], [1288, 62], [1265.5, 280], [878, 280]];
const HM = [[0.433, 0.102143, 855.0], [0.0, 0.4578893, 62.0], [0.0, 9.53e-05, 1.0]];   // page units -> plate
const hp = (x, y) => { const w = HM[2][0] * x + HM[2][1] * y + HM[2][2]; return [(HM[0][0] * x + HM[0][1] * y + HM[0][2]) / w, (HM[1][0] * x + HM[1][1] * y + HM[1][2]) / w]; };

// ---------- page canvases ----------
const K = 1.25;                          // canvas px per page unit
let pageCache = null, strip = null, tmp = null, sokoFailed = false;
// blur model (fitted to the source mid-swipe sharpness, snapshots/s01-fix2-meas/sharp.py)
export const BLUR = { fac: 1, cap: 300, rest: 0 };
// resting softness per page (canvas px of blur baked into the cached page): the source screen is a soft photograph;
// measured against the source's resting sharpness (grain-free): machines was too crisp, letters/issue slightly soft
const SOFT = [1.1, 0, 2.2, 0.2];
const FONTS = ["900 79px Archivo", "800 40px Archivo", "600 20px Geist", "500 20px Geist", "400 20px 'Geist Mono'", "400 20px Fraunces", "700 20px Fraunces"];
const fontsReady = () => { try { return FONTS.every((f) => document.fonts.check(f)); } catch (e) { return true; } };
function mk(draw) {
  const c = document.createElement("canvas");
  c.width = Math.round(PU_W * K); c.height = Math.round(PU_H * K);
  const g = c.getContext("2d"); g.scale(K, K); draw(g);
  return c;
}
function soften(c, px) {
  if (!(px > 0)) return c;
  const o = document.createElement("canvas"); o.width = c.width; o.height = c.height;
  const g = o.getContext("2d"); g.fillStyle = "#000"; g.fillRect(0, 0, o.width, o.height);
  g.filter = `blur(${px}px)`; g.drawImage(c, 0, 0); g.filter = "none";
  return o;
}
function pages(sites) {
  const ready = fontsReady();
  if (pageCache && pageCache.ready) return pageCache.list;
  let soko = null;
  if (sites && !sokoFailed) {
    try { soko = sites.sokoPageCanvas({ gaze: "down", scale: 1 }); } catch (e) { sokoFailed = String(e && e.stack || e); console.warn("[s01] sōko page unavailable:", e); }
  }
  const fallback = (g) => {
    g.fillStyle = "#f1f0ec"; g.font = "900 79px Archivo"; g.fontStretch = "expanded"; g.letterSpacing = "-1.75px";
    g.fillText("MIXING DOWN,", 64, 148); g.fillText("LATE AT NIGHT.", 64, 222); g.letterSpacing = "0px"; g.fontStretch = "normal";
    if (typeof sokoFailed === "string" && globalThis.__S01_DEBUG) { g.font = "400 30px 'Geist Mono'"; g.fillStyle = "#f55"; sokoFailed.split("\n").slice(0, 8).forEach((l, i) => g.fillText(l.slice(0, 110), 40, 400 + i * 40)); }
  };
  const list = [mk((g) => drawSokoLaptop(g, soko, fallback)), mk(drawLettersPage), mk(drawMachinesPage), mk(drawIssuePage)].map((c, i) => soften(c, SOFT[i]));
  // cache only once the faces are in (a seek can land here before the fonts finish loading)
  pageCache = { ready, list };
  return list;
}

// Draw the page carousel onto the screen (ctx in plate coordinates).
// The strip is the window onto the tape plus a margin on the left (MARGIN canvas px) so a smear can pull in the
// neighbouring page; the window itself starts at x = MARGIN.
const MARGIN = 400;
// Box width per source frame (frame index n = t*25 -> page units), measured: seeded by fitting each rectified source
// frame in 2-D against the tape composed from the source's own resting pages, box-blurred (snapshots/s01-fix2-meas/
// lfit2d.py), then calibrated over three render passes so the render's grain-free horizontal sharpness in the screen
// box matches the source's frame by frame (sharp.py, sigma 1.2 to ignore the film grain). The source smears on the
// swipe's velocity, not on the displacement between frames: onsets (0.68, 1.56, 2.36, 2.88) are already smeared.
const LTAB = new Map([[16, 8], [17, 36], [18, 70], [19, 47], [20, 21], [21, 15], [22, 12], [27, 14], [28, 62], [29, 52], [30, 120], [31, 62], [32, 12], [33, 12], [38, 12], [39, 229], [40, 85], [41, 50], [42, 24], [43, 16], [47, 24], [48, 53], [49, 150], [50, 112], [51, 117], [52, 40], [53, 12], [54, 12], [59, 38], [60, 35], [61, 61], [62, 59], [63, 55], [64, 29], [65, 16], [70, 16], [71, 32], [72, 115], [73, 95], [74, 87], [75, 46], [76, 30], [77, 6], [79, 10], [80, 43], [81, 46], [82, 70], [83, 57], [84, 59], [85, 65], [86, 81], [87, 80], [88, 49], [89, 35], [90, 35], [91, 84], [92, 70], [93, 38], [94, 16], [95, 9], [103, 6], [104, 129], [105, 98], [106, 38], [107, 26], [108, 17], [109, 12]]);
function blurWidth(t) { return Math.min(BLUR.cap, (LTAB.get(Math.round(t * 25)) || 0) * BLUR.fac); }
export function drawScreen(ctx, t, sites) {
  const list = pages(sites);
  const pw = list[0].width, ph = list[0].height, SW = pw + MARGIN;
  if (!strip) { strip = document.createElement("canvas"); strip.width = SW; strip.height = ph; tmp = document.createElement("canvas"); tmp.width = SW; tmp.height = ph; }
  const g = strip.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  g.fillStyle = "#000"; g.fillRect(0, 0, SW, ph);
  const p = pAt(t);
  const L = blurWidth(t) * K;                              // box width, canvas px
  // lay the tape: strip x = MARGIN + (slot - p) * pw, pre-shifted LEFT by L/2: the box filter below averages
  // s(x - u) for u in [0, L), so the smear lands centred on each page position
  const i0 = Math.floor(p) - 1;
  for (let slot = i0; slot <= i0 + 3; slot++) {
    const x = MARGIN + (slot - p) * pw - L / 2;
    if (x >= SW || x + pw <= 0) continue;
    const pg = slotPage(slot, t);
    if (pg >= 0) g.drawImage(list[pg], x, 0);
  }
  // resting pages: the source's screen is a photographed, slightly soft image
  if (L >= 2) boxBlur(g, L, 0);
  else if (BLUR.rest > 0) boxBlur(g, BLUR.rest * K, BLUR.rest * K * 0.6);
  g.globalAlpha = 1;
  // map the strip onto the content quad (a homography, drawn as a grid of affine triangles), clipped to the bezel
  ctx.save();
  ctx.beginPath(); BEZEL.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip();
  ctx.fillStyle = "#000"; ctx.fill();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  const NX = 6, NY = 8;
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const u0 = (i / NX) * PU_W, u1 = ((i + 1) / NX) * PU_W, v0 = (j / NY) * PU_H, v1 = ((j + 1) / NY) * PU_H;
    const a = hp(u0, v0), b = hp(u1, v0), c = hp(u1, v1), d = hp(u0, v1);
    const X = (u) => MARGIN + u * K;
    tri(ctx, strip, [[X(u0), v0 * K], [X(u1), v0 * K], [X(u1), v1 * K]], [a, b, c]);
    tri(ctx, strip, [[X(u0), v0 * K], [X(u1), v1 * K], [X(u0), v1 * K]], [a, c, d]);
  }
  ctx.restore();
  // the screen's lit edge: a fine bright line down both sides and along the bottom
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(236,235,230,0.85)"; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(855.5, 64); ctx.lineTo(878.5, 279); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(1287.5, 64); ctx.lineTo(1265, 279); ctx.stroke();
  const bl = ctx.createLinearGradient(878, 0, 1265, 0);
  bl.addColorStop(0, "rgba(236,235,230,0.9)"); bl.addColorStop(0.28, "rgba(236,235,230,0.75)"); bl.addColorStop(0.32, "rgba(236,235,230,0.3)"); bl.addColorStop(1, "rgba(236,235,230,0.3)");
  ctx.strokeStyle = bl; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(879, 279.5); ctx.lineTo(1265, 279.5); ctx.stroke();
  ctx.restore();
}

// Continuous box blur, Lx wide (canvas px) and Ly tall, by repeated doubling: each pass averages the strip with
// itself shifted by d, 2d, 4d ... (d <= 1.25 px), so the kernel is a box of 2^k taps spanning L with no ghosts.
// The horizontal kernel looks left (x - shift); the tape is laid L/2 to the left so the smear is centred.
function boxBlur(g, Lx, Ly) {
  const c = g.canvas, tg = tmp.getContext("2d");
  const pass = (dx, dy) => {
    tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalAlpha = 1; tg.globalCompositeOperation = "copy"; tg.drawImage(c, 0, 0);
    g.globalAlpha = 0.5; g.globalCompositeOperation = "source-over"; g.drawImage(tmp, dx, dy);
    g.globalAlpha = 1;
  };
  for (const [L, hor] of [[Lx, true], [Ly, false]]) {
    if (!(L > 0.3)) continue;
    const k = Math.max(1, Math.ceil(Math.log2(L / 1.25))), d = L / Math.pow(2, k);
    for (let i = 0; i < k; i++) hor ? pass(d * Math.pow(2, i), 0) : pass(0, d * Math.pow(2, i));
  }
}

// Draw the triangle s (image px) of img onto the triangle d (current ctx coordinates).
function tri(ctx, img, s, d) {
  const [[x0, y0], [x1, y1], [x2, y2]] = s, [[u0, v0], [u1, v1], [u2, v2]] = d;
  ctx.save();
  const cx = (u0 + u1 + u2) / 3, cy = (v0 + v1 + v2) / 3;
  const gr = (x, y) => { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1; return [x + (dx / l) * 0.6, y + (dy / l) * 0.6]; };
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

export function releaseScreen() { pageCache = null; strip = null; tmp = null; }
