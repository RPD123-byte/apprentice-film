// s17's page: the sōko foundation's full-frame page (sites.js sokoPageCanvas, gaze "owl", already softened by
// SOKO_SOFT) — the same page the framed shots s21–s25 use — with this shot's own mug over it (the source's mug seen
// from level: grey left side, bright centre-right, one bright handle and a faint dark one, no coffee showing; the
// page's mug and static steam wisps are covered, the steam is animated by s17/steam.js), and the eye patch for the
// eye-follow beat (52.80–53.20: his irises slide ~4 px toward the owl as it dashes off to the left).
import { sokoPageCanvas, PAGE_W, PAGE_H, SOKO_SOFT } from "../../lib/sites.js";
import { blurCanvas } from "../../lib/sokoIll.js";
import { taper } from "../../lib/ink.js";
import { smoothPath } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";

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
  g.strokeStyle = grey(0.32, 0.9); g.lineWidth = 2; g.beginPath(); g.ellipse(817, 500, 12, 11.5, 0, PI * 0.5, PI * 1.5); g.stroke();
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

// The page: F1's page (its own cached canvas, not copied) with the mug and the static steam covered (the wall there is
// black) and this shot's mug drawn over it. g in page coordinates; alpha for the opening's headline fade.
// ui: false = without the headline, counter and key.
export function drawS17Page(g, scale = 1, ui = true, alpha = 1) {
  const f = sokoPageCanvas({ gaze: "owl", scale, ui });
  g.save();
  g.globalAlpha = alpha;
  g.drawImage(f, 0, 0, PAGE_W, PAGE_H);
  for (const p of smudgeFix(f, scale)) g.drawImage(p.c, p.x, p.y, p.w, p.h);
  // cover the page's mug and its static wisps down to the desk top (y 521; the plank's lit edge starts there)
  // (fix pass 1) feathered at the left, right and top so no seam shows in the wall's grain
  coverMug(g);
  const [x0, y0, x1, y1] = MUG_BOX;
  g.drawImage(mugLayer(scale), x0, y0, x1 - x0, y1 - y0);
  g.restore();
}

// The eye-follow beat (52.80–53.20): he turns his head a little toward the owl dashing off to the left. Template
// matches of the source against 52.72 (8x): the whole head (beanie, hair, eyes, nose, mouth) slides left by up to
// 3.75 px while the shirt, the headphones round his neck and the laptop stay put; the irises go ~1.2 px further.
// headPatch(hdx, edx): the page's head region with the irises moved edx px inside their eye openings (F1's eye
// outlines; the eye interior is redrawn shifted, except in a strip at its right end), then the head moved hdx px,
// through a feathered mask round the head (beanie, hair, face down to the chin). Page px, scale 1, cached.
export const HEAD_BOX = [966, 140, 1172, 400];
const EYES = [
  [[1022.6, 285.4], [1030.8, 281.8], [1040.8, 281.2], [1048.3, 283], [1052, 287], [1049.5, 289], [1037, 290.5], [1024, 289]],
  [[1117.6, 285.6], [1112, 282], [1102, 280.6], [1092, 281.6], [1085, 285.8], [1087, 288.5], [1099.5, 290], [1115.8, 288.5]],
];
const HEAD_MASK = [[975, 148], [1162, 148], [1163, 250], [1158, 300], [1150, 336], [1136, 360], [1112, 378], [1090, 385], [1072, 388],
  [1052, 385], [1030, 378], [1008, 360], [993, 336], [984, 300], [977, 250]];
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
  const [x0, y0, x1, y1] = HEAD_BOX, page = sokoPageCanvas({ gaze: "owl", scale: 1 }), w = x1 - x0, h = y1 - y0;
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

export function releaseS17Page() { MUGS.clear(); PATCH.clear(); FIXES.clear(); MASK = null; }
export { PAGE_W, PAGE_H };
