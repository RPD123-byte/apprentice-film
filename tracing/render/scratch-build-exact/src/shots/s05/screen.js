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

const PW = 800, PH = 500;          // composite canvas: half a page unit per px (the quad is ~520 px wide)
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
const PAGE_QUAD = [[320.7, 246.0], [834.7, 168.7], [900.9, 521.2], [411.9, 644.8]];
const HP = homog(PAGE_QUAD);
const hp = (x, y) => HP(x / 1600, y / 1000);

// ---- the window that zooms open at 23.72: an original, generic mail/file list in a browser window (dark tab strip,
// toolbar, a sidebar, rows of square coloured avatars with a title and a grey second line), laid out from the
// rectified source at 23.96 (snapshots/s05-study/files.jpg); everything is soft, like the source's screen capture
let FILES = null;
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
  // toolbar
  g.fillStyle = "#9d9d99"; for (const x of [40, 88, 140, 200, 268, 318]) { g.beginPath(); g.arc(x, 72, 12, 0, 7); g.fill(); }
  g.fillStyle = "#6e6e6a"; g.fillRect(352, 66, 86, 14);
  g.fillStyle = "#a5a5a1"; for (const x of [1365, 1420, 1475, 1535]) { g.beginPath(); g.arc(x, 80, 13, 0, 7); g.fill(); }
  g.fillStyle = "#dededa"; g.fillRect(0, 108, 1600, 3); g.fillRect(230, 111, 3, 889);
  // sidebar
  for (let i = 0; i < 10; i++) { const y = 142 + i * 34; g.fillStyle = "#9a9a96"; g.beginPath(); g.roundRect(28, y - 8, 16, 16, 4); g.fill(); g.fillStyle = "#b5b5b1"; g.fillRect(64, y - 4, 40 + r() * 70, 9); }
  // header of the list
  g.fillStyle = "#8a8a86"; g.beginPath(); g.arc(268, 160, 12, 0, 7); g.fill();
  g.fillStyle = "#7c7c78"; g.fillRect(300, 154, 40, 12); g.fillStyle = "#a9a9a5"; g.fillRect(352, 154, 250, 10); g.fillRect(290, 184, 240, 8);
  // rows
  const cols = ["#d6a64e", "#c65a74", "#8b8467", "#8f86c3", "#9189c4", "#8c8878", "#8a82bf", "#8d86c2", "#8b85c0", "#85807a", "#bdb9b6", "#77736f", "#9a8f79", "#8d8fae", "#a9a7a4", "#76726e"];
  const ys = [232, 285, 340, 392, 443, 490, 540, 588, 640, 708, 768, 800, 860, 915, 965, 1000];
  ys.forEach((y, i) => {
    g.fillStyle = cols[i]; g.beginPath(); g.roundRect(298, y - 18, 40, 36, 6); g.fill();
    g.fillStyle = "#7b7b77"; g.fillRect(356, y - 12, 60 + r() * 80, 10);
    g.fillStyle = "#adadA9"; g.fillRect(356, y + 6, 160 + r() * 260, 8);
  });
  // the window's right edge
  g.fillStyle = "#1a1a1a"; g.fillRect(1584, 0, 16, 1000);
  // soften like the capture
  const s2 = document.createElement("canvas"); s2.width = PW; s2.height = PH;
  const q = s2.getContext("2d"); q.filter = "blur(1.2px)"; q.drawImage(c, 0, 0);
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
  if (page) SOKO = c;
  return c;
}

// window rectangle (page units) and content blur (page units) per source frame while it zooms open, measured on
// the rectified source against the last sōko frame (edges sharp, ~6 units; the list inside smeared by the zoom)
const ZOOM = [[23.72, 612, 150, 1504, 879, 7], [23.76, 394, 93, 1545, 968, 6], [23.80, 249, 55, 1568, 1000, 4], [23.84, 139, 27, 1579, 1000, 3], [23.88, 59, 13, 1583, 1000, 2], [23.92, 11, 9, 1584, 1000, 1], [23.96, 0, 16, 1584, 1000, 0]];
const FADE = [[24.0, 0.94], [24.04, 0.7], [24.08, 0.69], [24.12, 0.43], [24.16, 0]];
const WIN = [0, 16, 1584, 1000];      // the window's final rect (a dark strip stays at the right edge)

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
    g.save(); g.beginPath(); g.rect(x0 * K, y0 * K, (x1 - x0) * K, (y1 - y0) * K); g.clip();
    g.fillStyle = "#efefec"; g.fill();
    if (bl > 0) g.filter = `blur(${(bl * K).toFixed(1)}px)`;
    g.drawImage(filesCanvas(), x0 * K, y0 * K, (x1 - x0) * K, (y1 - y0) * K);
    g.restore(); g.filter = "none";
  } else {
    let a = 0;
    for (const [tt, v] of FADE) if (f >= tt - 1e-6) a = v;
    if (pure) {
      const st = pure.pureStateAt(t);
      g.drawImage(pure.purePageCanvas(PW, PH, st.page), 0, 0);
      g.save(); g.scale(K, K); pure.drawPureOverlay(g, st.overlay); g.restore();
    } else { g.fillStyle = "#1c1d1a"; g.fillRect(0, 0, PW, PH); }
    if (a > 0) { g.globalAlpha = a; g.drawImage(filesCanvas(), WIN[0] * K, WIN[1] * K, (WIN[2] - WIN[0]) * K, (WIN[3] - WIN[1]) * K); g.globalAlpha = 1; }
  }
  return COMP;
}

// Map the composite onto the screen quad (ctx in settled frame coordinates), as a grid of affine triangles.
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
  ctx.beginPath(); T.SCREEN.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip();
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

export function releaseScreen() { FILES = null; SOKO = null; COMP = null; SOFT = null; }
