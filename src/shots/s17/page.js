// s17's page: the sōko foundation's full-frame page (F1: sites.js / sokoIll.js, gaze "owl") — the same illustration the
// framed shots s21–s25 use — built here layer by layer (fix pass 1) so this shot can repaint a few layers itself
// (s17/designer.js: the designer's head, headphones, shirt with the laptop's bloom, trousers, boots; s17/gear.js: the
// guitar case, the amp's handle, the backpack, the looping cables, the gear's engraving contrast), then softened by
// F1's SOKO_SOFT like F1's cached page. Over it: this shot's own mug (the source's mug seen from level: grey left
// side, bright centre-right, one bright handle and a faint one, no coffee showing; the page's mug and static steam
// wisps are covered, the steam is animated by s17/steam.js), and the head patch for the head-turn beat.
import { SOKO_LAYERS, PAGE_W, PAGE_H, SOKO_SOFT, SOKO_BG, drawSokoRail, drawSokoHeadline, drawSokoCounter } from "../../lib/sites.js";
import { paintSokoIll, blurCanvas } from "../../lib/sokoIll.js";
import { taper } from "../../lib/ink.js";
import { smoothPath } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";
import { REPAINT, AFTER, finishIll } from "./gear.js";
import { EYE } from "./designer.js";
import { freeScratch } from "./kit.js";

const PI = Math.PI;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const grey = (v, a = 1) => { const c = Math.round(clamp(v) * 255); return a >= 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`; };
const polyPath = (g, pts) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); };
function ink(g, pts, w = 2, color = "#040404", { closed = false, seed = 1, ends = 0.7, jit = 0.4 } = {}) {
  const r = rng(seed);
  const q = closed ? [...pts, pts[0]] : pts;
  const dense = [];
  for (let i = 0; i < q.length - 1; i++) {
    const [x0, y0] = q[i], [x1, y1] = q[i + 1], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 6));
    for (let k = 0; k < n; k++) dense.push([x0 + (x1 - x0) * (k / n) + (r() - 0.5) * jit, y0 + (y1 - y0) * (k / n) + (r() - 0.5) * jit]);
  }
  dense.push(q[q.length - 1]);
  taper(g, dense, (u) => w * (ends + (1 - ends) * Math.sin(PI * u)), color);
}
// a soft-edged fill: drawn into a scratch canvas, blurred there (exact JS gaussian), composited back
function softRect(g, x, y, w, h, fill, blur, alpha, scale) {
  const pad = Math.ceil(blur * 3 + 2);
  const c = document.createElement("canvas"); c.width = Math.ceil((w + 2 * pad) * scale); c.height = Math.ceil((h + 2 * pad) * scale);
  const t = c.getContext("2d", { willReadFrequently: true });
  t.scale(scale, scale); t.fillStyle = fill; t.fillRect(pad, pad, w, h);
  blurCanvas(c, blur * scale);
  g.save(); g.globalAlpha = alpha; g.drawImage(c, x - pad, y - pad, w + 2 * pad, h + 2 * pad); g.restore();
  c.width = c.height = 0;
}

// The mug (source 52.0 s at 6x): seen from level, a pale rim with no dark inside showing; the body shades from grey
// on the left (~110) to bright at centre-right (~240); a bright handle on the right, a faint dark-grey one on the left.
export const MUG_BOX = [798, 462, 890, 522];
function paintMug(g, scale) {
  const body = [[816, 473], [818, 470], [869, 470], [871, 473], [868, 520], [820, 520]];
  polyPath(g, body);
  const bg = g.createLinearGradient(816, 0, 871, 0);
  // (fix pass 1) source row profile at y 495 (51.0 / 53.2): a thin lit left edge (~150), a dark band 820–825 (~86),
  // then a ramp to ~245 by x 845
  bg.addColorStop(0, grey(0.4)); bg.addColorStop(0.025, grey(0.5)); bg.addColorStop(0.06, grey(0.33)); bg.addColorStop(0.15, grey(0.34));
  bg.addColorStop(0.22, grey(0.5)); bg.addColorStop(0.29, grey(0.7)); bg.addColorStop(0.38, grey(0.86)); bg.addColorStop(0.5, grey(0.93));
  bg.addColorStop(0.65, grey(0.95)); bg.addColorStop(0.9, grey(0.93)); bg.addColorStop(1, grey(0.78));
  g.fillStyle = bg; g.fill();
  g.save(); polyPath(g, body); g.clip();
  softRect(g, 816, 508, 56, 14, grey(0.55), 4, 0.35, scale);          // a little shade toward the foot
  softRect(g, 826, 474, 6, 44, grey(0.62), 3, 0.35, scale);           // a soft vertical shadow band
  // (fix pass 1) the source's mug is brushed, not smooth (6x on the owl-free plate): faint vertical streaks down the
  // body, and a darker band along its bottom ~8 px
  const rh = rng(2031);
  for (let i = 0; i < 10; i++) {
    const x = 821 + i * 4.8 + (rh() - 0.5) * 2, y0 = 474 + rh() * 6, y1 = 512 + rh() * 8;
    ink(g, [[x, y0], [x + (rh() - 0.5) * 1.2, (y0 + y1) / 2], [x + (rh() - 0.5) * 1.5, y1]], 0.8, grey(x < 834 ? 0.5 : 0.8, 0.55), { seed: 2040 + i, ends: 0.2 });
  }
  softRect(g, 816, 512, 56, 10, grey(0.72), 2, 0.6, scale);
  g.restore();
  // the rim (source 51.0, x 843: a sharp bright top line at y 470, a slightly darker band under it): a lit rim ellipse
  // and a grey inner line
  g.fillStyle = grey(0.95); g.beginPath(); g.ellipse(843.5, 471, 26.5, 2.0, 0, 0, PI * 2); g.fill();
  ink(g, [[819, 472.4], [843, 473.2], [868, 472.4]], 0.8, grey(0.62, 0.8), { seed: 2024 });
  ink(g, [[818, 470.6], [843, 469.4], [869, 470.6]], 1.0, grey(0.98, 0.9), { seed: 2026 });
  ink(g, body, 1.2, "#040404", { closed: true, seed: 2025 });
  g.lineCap = "round";
  g.strokeStyle = grey(0.05); g.lineWidth = 5.6; g.beginPath(); g.ellipse(870, 498.5, 13, 14.5, 0, -PI * 0.5, PI * 0.5); g.stroke();
  g.strokeStyle = grey(0.92); g.lineWidth = 3.6; g.beginPath(); g.ellipse(870, 498.5, 13, 14.5, 0, -PI * 0.5, PI * 0.5); g.stroke();
  g.strokeStyle = grey(0.58, 0.9); g.lineWidth = 2; g.beginPath(); g.ellipse(817, 500, 12, 11.5, 0, PI * 0.5, PI * 1.5); g.stroke();
}
// black over the page's own mug and static steam wisps: hard over x 804–884, ramps 8 px wide at the sides and top
function coverMug(g) {
  const X0 = 796, X1 = 894, Y0 = 332, Y1 = 521, F = 8;
  g.fillStyle = "#000"; g.fillRect(X0 + F, Y0 + F, X1 - X0 - 2 * F, Y1 - Y0 - F);
  const ramp = (x0, y0, x1, y1, gx0, gy0, gx1, gy1) => {
    const gr = g.createLinearGradient(gx0, gy0, gx1, gy1); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,1)");
    g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  };
  ramp(X0, Y0 + F, X0 + F, Y1, X0, 0, X0 + F, 0);
  ramp(X1 - F, Y0 + F, X1, Y1, X1, 0, X1 - F, 0);
  g.save(); g.beginPath(); g.moveTo(X0, Y0); g.lineTo(X1, Y0); g.lineTo(X1 - F, Y0 + F); g.lineTo(X0 + F, Y0 + F); g.closePath(); g.clip();
  ramp(X0, Y0, X1, Y0 + F, 0, Y0, 0, Y0 + F); g.restore();
}
// the mug on its own (transparent), softened like the page; page coordinates, MUG_BOX
const MUGS = new Map();
export function mugLayer(scale = 1) {
  let c = MUGS.get(scale);
  if (!c) {
    const [x0, y0, x1, y1] = MUG_BOX;
    c = document.createElement("canvas"); c.width = Math.round((x1 - x0) * scale); c.height = Math.round((y1 - y0) * scale);
    const g = c.getContext("2d", { willReadFrequently: true });
    g.scale(scale, scale); g.translate(-x0, -y0);
    paintMug(g, scale);
    blurCanvas(c, SOKO_SOFT * scale);
    MUGS.set(scale, c);
  }
  return c;
}

// (pass 4) Two pale smudges in F1's page lie on the owl's path and are not in the source (it is plain there at 48.6–
// 50.4 s and 53.2 s: they look like owl bits in F1's plate): one on the third book of the stack on the left speaker
// (sokoIll.js speakerLeft, around (569, 482)), one on the speaker front's top left (around (559, 522)). Each is covered
// by our own page's pixels from beside it on the same surface (the book face runs horizontally, so 26 px to the right;
// the wooden front 20 px to the left), through a feathered mask of the smudge grown a little. Cached per scale.
const SMUDGES = [
  { poly: [[560, 478], [574, 476], [578, 486], [562, 489]], grow: 4, feather: 2.2, dx: 26 },
  { poly: [[552, 512], [566, 514], [562, 532], [555, 528]], grow: 6, feather: 3, dx: -20 },
];
const FIXES = new Map();
function smudgeFix(f, scale) {
  let out = FIXES.get(scale);
  if (out) return out;
  out = SMUDGES.map((m) => {
    const xs = m.poly.map((p) => p[0]), ys = m.poly.map((p) => p[1]), pad = m.grow + 3 * m.feather + 2;
    const x0 = Math.floor(Math.min(...xs) - pad), y0 = Math.floor(Math.min(...ys) - pad), x1 = Math.ceil(Math.max(...xs) + pad), y1 = Math.ceil(Math.max(...ys) + pad);
    const w = Math.round((x1 - x0) * scale), h = Math.round((y1 - y0) * scale);
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d", { willReadFrequently: true });
    g.drawImage(f, (x0 + m.dx) * scale, y0 * scale, w, h, 0, 0, w, h);
    const k = document.createElement("canvas"); k.width = w; k.height = h;
    const kg = k.getContext("2d", { willReadFrequently: true });
    kg.scale(scale, scale); kg.translate(-x0, -y0);
    kg.fillStyle = "#fff"; kg.strokeStyle = "#fff"; kg.lineJoin = "round"; kg.lineWidth = 2 * m.grow;
    polyPath(kg, m.poly); kg.fill(); kg.stroke();
    blurCanvas(k, m.feather * scale);
    g.globalCompositeOperation = "destination-in"; g.drawImage(k, 0, 0);
    k.width = k.height = 0;
    return { c, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  });
  FIXES.set(scale, out);
  return out;
}

// The page (fix pass 1): F1's illustration painted layer by layer in F1's order, with this shot's repainted layers in
// place of F1's (REPAINT) or over them (AFTER), finishIll (the bloom and the gear's contrast), then F1's rail; the
// headline + counter + key (the UI) on a separate transparent layer so the opening can fade it in. Both softened by
// SOKO_SOFT (F1's measured page softness). Scale 1 only (the pull-back upscales it, like the source). Cached.
let PAGE = null, UI = null, RAW = null, NEAR = null;
// (purity) s17/kit.js keeps scratch canvases that grow on demand, and a value study painted into one of them is
// clipped (and its soft fills blurred) to that canvas's current size (kit devBox clamps to g.canvas): the trousers'
// and the flight case's studies came out different once the scratch was already grown by an earlier build. Each build
// starts (and ends) with kit's scratch freed, so every build — the first, or one after release() — gives the same page.
function pageCanvases() {
  if (PAGE) return;
  freeScratch();
  PAGE = document.createElement("canvas"); PAGE.width = PAGE_W; PAGE.height = PAGE_H;
  const g = PAGE.getContext("2d", { willReadFrequently: true });
  g.fillStyle = SOKO_BG; g.fillRect(0, 0, PAGE_W, PAGE_H);
  g.fillStyle = "#000"; g.fillRect(0, 0, PAGE_W, PAGE_H);
  for (const name of SOKO_LAYERS) {
    g.save();
    if (REPAINT[name]) REPAINT[name](g); else paintSokoIll(g, { gaze: "owl", only: [name], background: false });
    g.restore();
    if (AFTER[name]) { g.save(); AFTER[name](g); g.restore(); }
  }
  g.save(); finishIll(g); g.restore();
  freeScratch();
  drawSokoRail(g);
  RAW = document.createElement("canvas"); RAW.width = PAGE_W; RAW.height = PAGE_H;
  RAW.getContext("2d", { willReadFrequently: true }).drawImage(PAGE, 0, 0);
  blurCanvas(PAGE, SOKO_SOFT);
  UI = document.createElement("canvas"); UI.width = PAGE_W; UI.height = PAGE_H;
  const u = UI.getContext("2d", { willReadFrequently: true });
  drawSokoHeadline(u); drawSokoCounter(u, { counter: "000.0" });
  blurCanvas(UI, SOKO_SOFT);
}
export function s17PageCanvas() { pageCanvases(); return PAGE; }
// (fix pass 1) The last frames of the pull-back (48.40–48.52, zoom 1.03–1.003) are resampled a hair off 1:1, which
// softens the page by about a bilinear σ 0.35 px (Laplacian sharpness 0.91–0.97 of the source there against 1.00 at
// 1:1). Those frames take the page softened by 0.58 instead of SOKO_SOFT 0.65, so the sharpness does not step at the
// switch to 1:1 (0.98 / 0.98 / 1.00 / 0.98 at 48.40–48.52; σ 0.5 overshot to 1.07–1.15).
function nearPage() {
  pageCanvases();
  if (!NEAR) { NEAR = document.createElement("canvas"); NEAR.width = PAGE_W; NEAR.height = PAGE_H; NEAR.getContext("2d", { willReadFrequently: true }).drawImage(RAW, 0, 0); blurCanvas(NEAR, 0.58); }
  return NEAR;
}

// The page with this shot's mug; g in page coordinates. ui: the headline / counter / key's opacity (the opening's fade).
// resampled: drawn at a zoom a hair off 1 (see nearPage)
export function drawS17Page(g, ui = 1, resampled = false) {
  pageCanvases();
  g.save();
  g.drawImage(resampled ? nearPage() : PAGE, 0, 0, PAGE_W, PAGE_H);
  if (ui > 0) { g.globalAlpha = Math.min(1, ui); g.drawImage(UI, 0, 0, PAGE_W, PAGE_H); g.globalAlpha = 1; }
  for (const p of smudgeFix(PAGE, 1)) g.drawImage(p.c, p.x, p.y, p.w, p.h);
  // cover the page's mug and its static wisps down to the desk top (y 521; the plank's lit edge starts there)
  // (fix pass 1) feathered at the left, right and top so no seam shows in the wall's grain
  coverMug(g);
  const [x0, y0, x1, y1] = MUG_BOX;
  g.drawImage(mugLayer(1), x0, y0, x1 - x0, y1 - y0);
  g.restore();
}

// The eye-follow beat (52.80–53.20): he turns his head a little toward the owl dashing off to the left. Template
// matches of the source against 52.72 (8x): the whole head (beanie, hair, eyes, nose, mouth) slides left by up to
// 3.75 px while the shirt, the headphones round his neck and the laptop stay put; the irises go ~1.2 px further.
// headPatch(hdx, edx): the page's head region with the irises moved edx px inside their eye openings (F1's eye
// outlines; the eye interior is redrawn shifted, except in a strip at its right end), then the head moved hdx px,
// through a feathered mask round the head (beanie, hair, face down to the chin). Page px, scale 1, cached.
export const HEAD_BOX = [966, 140, 1172, 400];
// (fix pass 1) the eye openings are s17/designer.js's (a little taller than F1's)
const EYES = ["L", "R"].map((k) => [...EYE[k].up, ...EYE[k].lo.slice(1, -1)]);
// (fix pass 1) the mask takes in the side hair's ends (s17/designer.js: down to y ~370 at x 982–1000 and ~362 at 1150)
const HEAD_MASK = [[975, 148], [1162, 148], [1163, 250], [1162, 300], [1161, 340], [1152, 366], [1136, 368], [1112, 378], [1090, 385], [1072, 388],
  [1052, 385], [1030, 378], [1012, 374], [990, 372], [980, 340], [978, 300], [977, 250]];
let MASK = null;
function headMask() {
  if (MASK) return MASK;
  const [x0, y0, x1, y1] = HEAD_BOX;
  MASK = document.createElement("canvas"); MASK.width = x1 - x0; MASK.height = y1 - y0;
  const g = MASK.getContext("2d", { willReadFrequently: true });
  g.translate(-x0, -y0); g.fillStyle = "#fff"; g.beginPath(); smoothPath(g, HEAD_MASK, true); g.fill();
  blurCanvas(MASK, 2.5);
  return MASK;
}
const PATCH = new Map();
export function headPatch(hdx, edx) {
  const key = hdx.toFixed(2) + ":" + edx.toFixed(2);
  let out = PATCH.get(key);
  if (out) return out;
  const [x0, y0, x1, y1] = HEAD_BOX, page = s17PageCanvas(), w = x1 - x0, h = y1 - y0;
  // 1. the head with the irises moved
  const T = document.createElement("canvas"); T.width = w; T.height = h;
  const t = T.getContext("2d");
  t.drawImage(page, x0, y0, w, h, 0, 0, w, h);
  t.translate(-x0, -y0);
  if (edx) for (const shape of EYES) {
    const xs = shape.map((p) => p[0]), xa = Math.min(...xs), xb = Math.max(...xs);
    t.save(); t.beginPath(); smoothPath(t, shape, true); t.clip();
    t.beginPath(); t.rect(xa - 2, 270, xb - xa - Math.abs(edx) + 1, 26); t.clip();
    t.drawImage(page, xa - 4, 270, xb - xa + 8, 26, xa - 4 + edx, 270, xb - xa + 8, 26);
    t.restore();
  }
  // 2. moved by hdx through the feathered mask, over the unmoved page (the mask moves with the head; where the
  //    head leaves, the page beyond it — black background — slides in from the right)
  const S = document.createElement("canvas"); S.width = w; S.height = h;
  const sg = S.getContext("2d");
  sg.drawImage(page, x0 + 8, y0, w, h, 8, 0, w, h);          // what lies to the right comes in behind the head
  sg.fillStyle = "#000"; sg.globalCompositeOperation = "source-over";
  sg.drawImage(T, hdx, 0);
  sg.globalCompositeOperation = "destination-in"; sg.drawImage(headMask(), hdx, 0);
  sg.globalCompositeOperation = "source-over";
  out = document.createElement("canvas"); out.width = w; out.height = h;
  const o = out.getContext("2d");
  o.drawImage(page, x0, y0, w, h, 0, 0, w, h);
  o.drawImage(S, 0, 0);
  T.width = T.height = S.width = S.height = 0;
  PATCH.set(key, out);
  return out;
}

export function releaseS17Page() { MUGS.clear(); PATCH.clear(); FIXES.clear(); MASK = null; PAGE = UI = RAW = NEAR = null; }
export { PAGE_W, PAGE_H };
