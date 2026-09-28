// s26 (110.52–117.52) — the shattered page blows out into colour and the finished colour site is revealed.
// Beats (film time, measured on the source; see fidelity/s26.md):
//   A 110.52–111.52  the framed page on the lit screen: cracked all over, two scissors stuck in it at white impact
//                    stars, the colour banner in the header, the owl in the middle, wings on hips, smirking.
//                    Camera: a 0.3 % creep out (camtrack s 1 → 0.9972) — reproduced.
//   B 111.56         one jolt frame: the same picture scaled 0.9912, thrown (−7, −20) px, the room light gone.
//   C 111.60–112.68  the blast: the shards are thrown outward and keep zooming slowly about the owl (camtrack
//                    1 → 1.056 from 111.80); the centre is cleared to the colour page behind them (ORB: page s ≈ 0.83,
//                    fixed); white speed lines flicker every frame; the scissors are flung out to the top corners;
//                    the owl (hands on hips at 111.60) throws its wings open at 111.64; 111.80 is a smeared shake
//                    frame; eyes squeezed shut 112.64–112.68.
//   D 112.72–113.72  cut: the colour page arrives (hippie pageArrival, s .82 → .96) through a ring of big B&W shards
//                    that fly out past the frame; the white owl hovers over the designer, wings up, head turned, smug.
//   E 113.72–114.12  a huge out-of-focus shard sweeps across the lens from lower left to upper right; behind it the
//                    owl turns into the colour owl (first seen 114.08).
//   F 114.12–117.52  the colour owl flies up to the top-right box by the nav and perches; page camera settles at 114.9.
import { drawFramedPage, sokoPageCanvas, HEADER, FRAMED, releaseSoko } from "../lib/sites.js";
import { hippieBannerCanvas, hippiePageCanvas, pageArrival, releaseHippie } from "../lib/hippie.js";
import { owlLayer, owlPose } from "../lib/owlInk.js";
import { rng, clamp, lerp } from "../lib/rng.js";
import { tiling, webStrokes, polyPath, impactStar, IMPACTS } from "./s26/shards.js";
import { drawScissors } from "./s26/scissors.js";
import { drawColorOwl, colorOwlAt } from "./s26/owlc.js";
import { W, H } from "../config.js";

const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
let C = null; // caches, built lazily inside draw
const caches = () => (C || (C = {}));
const FR = (t) => Math.round(t * 25); // source frame index

// piecewise-linear keys [[t, a, b, ...], ...]
function interp(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  const n = keys.length;
  if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0;
  while (keys[i + 1][0] < t) i++;
  const a = keys[i], b = keys[i + 1], u = (t - a[0]) / (b[0] - a[0]);
  return a.slice(1).map((v, k) => v + (b[k + 1] - v) * u);
}

// ================================================================ pages
// the B&W page with the colour banner pasted into the header (page coordinates)
function pageWithBanner() {
  const c = caches();
  if (!c.pageWB) {
    const src = sokoPageCanvas({ gaze: "down" });
    const k = mk(src.width, src.height), g = k.getContext("2d");
    g.drawImage(src, 0, 0);
    g.drawImage(hippieBannerCanvas(), HEADER.x, HEADER.y, HEADER.w, HEADER.h);
    c.pageWB = k;
  }
  return c.pageWB;
}
// shard contents in frame coordinates: the framed B&W page, and the colour page laid over the same screen
function shardSources() {
  const c = caches();
  if (!c.srcBW) {
    c.srcBW = mk(W, H);
    const g = c.srcBW.getContext("2d");
    g.fillStyle = "#050505"; g.fillRect(0, 0, W, H);
    g.drawImage(pageWithBanner(), FRAMED.x, FRAMED.y, FRAMED.w, FRAMED.h);
    c.srcCol = mk(W, H);
    const h = c.srcCol.getContext("2d");
    h.fillStyle = "#23232f"; h.fillRect(0, 0, W, H);
    h.drawImage(hippiePageCanvas(), FRAMED.x - 60, FRAMED.y - 20, FRAMED.w * 1.06, FRAMED.h * 1.06);
    c.patBW = g.createPattern(c.srcBW, "no-repeat");
    c.patCol = h.createPattern(c.srcCol, "no-repeat");
  }
  return c;
}
// the colour page under a page->frame similarity
function drawColourPage(ctx, s, tx, ty) {
  ctx.save();
  ctx.setTransform(s, 0, 0, s, tx, ty);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(hippiePageCanvas(), 0, 0);
  ctx.restore();
}

// ================================================================ A / B: the cracked page on the screen
function drawCracks(g) {
  const T = tiling();
  g.save();
  g.lineJoin = "round"; g.lineCap = "round";
  g.strokeStyle = "rgba(10,10,10,0.55)"; g.lineWidth = 4.6;
  g.beginPath(); for (const s of T) polyPath(g, s.P); g.stroke();
  g.strokeStyle = "#ecebe6"; g.lineWidth = 2.5;
  g.beginPath(); for (const s of T) polyPath(g, s.P); g.stroke();
  g.lineWidth = 2.0;
  g.beginPath(); for (const [a, b] of webStrokes()) { g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); } g.stroke();
  g.restore();
}

// the owl standing with its wings on its hips (frame px, 2x grid at 111.0 s: eyes (995,460) (1100,455), head top 360,
// chin 530, body x 865–1290 y 510–815, elbows (865,650) (1290,640), feet (995,865) (1180,870))
const OWL_A = { x: 1077, y: 660, s: 0.95 };
const HIPS = {
  head: { x: -32, y: -226, rx: 112, ry: 96, yaw: -0.12, roll: -0.03 },
  eyes: { state: "angry", look: [-0.55, 0.05], r: 22, spread: 0.5, right: { state: "smug" } },
  beak: { smirk: 1, w: 34, l: 50, open: 0.25 },
  body: { x: 0, y: 0, a: 165, b: 190, egg: -0.05 },
  wings: [
    { type: "arm", layer: "front", S: [-150, -120], Wr: [-225, -10], T: [-140, 70], len: 44 },
    { type: "arm", layer: "front", S: [150, -125], Wr: [226, -20], T: [150, 80], len: 50 },
  ],
  feet: [{ x: -86, y: 200, rot: 0.25, size: 28, mode: "stand", leg: 26, seed: 2 }, { x: 108, y: 206, rot: -0.25, size: 28, mode: "stand", leg: 26, seed: 5 }],
  headphones: { cupEl: -0.05, bandH: 1.3 },
};
// wings thrown open (C, 111.64–112.68): 2x grid at 111.72 — eyes (1015,475) (1100,470), body x 1000–1250 y 540–725,
// wing tips (720,420) (1490,290), dangling feet (1230,765) (1280,780). Root (1125,632), s 0.88.
const SPREAD = {
  head: { x: -76, y: -184, yaw: -0.15, roll: -0.1 },
  eyes: { state: "angry", look: [-0.6, 0.0], r: 23, spread: 0.46 },
  beak: { smirk: 0.5, w: 32, l: 44, open: 0.2 },
  body: { x: 0, y: 0, a: 112, b: 138, rot: Math.PI / 2 + 0.25 },
  wings: [
    { type: "spread", layer: "back", S: [-125, -76], Wr: [-280, -250], T: [-460, -264], trail: [0.3, 1], len: 150, spread: 1, n: 9, m: 7 },
    { type: "spread", layer: "back", S: [114, -105], Wr: [278, -286], T: [415, -389], trail: [-0.2, 1], len: 150, spread: 1, n: 9, m: 7 },
  ],
  feet: [{ x: 119, y: 151, rot: -0.3, size: 22, mode: "dangle", seed: 2 }, { x: 176, y: 168, rot: -0.5, size: 22, mode: "dangle", seed: 5 }],
};
// hovering over the designer (D, 112.72–114.0), head turned to the viewer's right; 1x grids at 112.72 / 113.2 / 113.64
const HOVER = {
  head: { x: 60, y: -170, yaw: 0.35, roll: 0.05 },
  headphones: { yaw: 0.35 },
  eyes: { state: "smug", look: [0.6, 0.05], r: 23, spread: 0.46, right: { state: "closed" } },
  beak: { smirk: 0.8, w: 30, l: 42 },
  body: { x: 0, y: 0, a: 112, b: 112, rot: Math.PI / 2 + 0.3 },
  feet: [{ x: -130, y: 160, rot: 0.3, size: 22, mode: "dangle", seed: 2 }, { x: -70, y: 190, rot: 0.2, size: 22, mode: "dangle", seed: 5 }],
};
// [t, x, y, s, LSx, LSy, LWx, LWy, LTx, LTy, RSx, RSy, RWx, RWy, RTx, RTy]
const HOVER_KEYS = [
  [112.72, 1190, 570, 1.0, -90, -90, -240, -230, -390, -310, 110, -90, 260, -120, 410, -125],
  [113.2, 1225, 565, 1.1, -86, -77, -210, -240, -323, -377, 114, -59, 250, -130, 395, -214],
  [113.64, 1270, 530, 1.2, -92, -75, -190, -230, -283, -367, 125, -42, 240, -130, 358, -233],
  [114.02, 1290, 505, 1.24, -92, -75, -190, -230, -283, -367, 125, -42, 240, -130, 358, -233],
];
function hoverPose(t) {
  const [x, y, s, a, b, c, d, e, f, g, h, i, j, k, l] = interp(HOVER_KEYS, t);
  const eyes = t < 112.8 ? HOVER.eyes : { ...HOVER.eyes, look: [-0.5, 0.1], right: { state: "smug" } };
  return {
    ...owlPose("fly", { ...HOVER, eyes, wings: [
      { type: "spread", layer: "back", S: [a, b], Wr: [c, d], T: [e, f], trail: [0.35, 1], len: 165, spread: 1, n: 9, m: 7 },
      { type: "spread", layer: "back", S: [g, h], Wr: [i, j], T: [k, l], trail: [0.05, 1], len: 120, spread: 1, n: 9, m: 6 },
    ] }), x, y, s,
  };
}

// cached B&W owl layers at a base placement; blitted at any root / scale
function owl(key, pose, base) {
  const c = caches();
  if (!c.owls) c.owls = new Map();
  if (!c.owls.has(key)) c.owls.set(key, { L: owlLayer({ ...owlPose(pose[0], pose[1]), ...base, clip: [-400, -400, W + 400, H + 400] }), base });
  return c.owls.get(key);
}
function blitOwl(ctx, O, x, y, s, alpha = 1) {
  const { L, base } = O, k = s / base.s;
  ctx.save(); ctx.globalAlpha = alpha;
  ctx.drawImage(L.canvas, x + (L.x - base.x) * k, y + (L.y - base.y) * k, L.w * k, L.h * k);
  ctx.restore();
}
// an animated owl: one reused layer canvas, re-rendered per frame
function liveOwl(ctx, pose) {
  const c = caches();
  if (!c.owlCanvas) c.owlCanvas = mk(4, 4);
  const L = owlLayer({ ...pose, canvas: c.owlCanvas, clip: [-200, -200, W + 200, H + 200] });
  ctx.drawImage(L.canvas, L.x, L.y, L.w, L.h);
}

// scissors stuck in the page, blades into the impact stars (frame px, 2x grids at 110.6 / 111.0 s)
const SCISSORS_A = [
  { x: 772, y: 477, ang: Math.atan2(385 - 477, 650 - 772), L: 185, open: 0.16, top: 1, ring: 1.2 },
  { x: 1395, y: 447, ang: Math.atan2(360 - 447, 1520 - 1395), L: 180, open: 0.16, top: -1, ring: 1.2 },
];

function paintA(g) {
  // the owl stands where the page's figure was: the source shows only dark floor round its legs
  g.save();
  const sh = g.createRadialGradient(1080, 760, 40, 1080, 760, 260);
  sh.addColorStop(0, "rgba(4,4,4,0.95)"); sh.addColorStop(0.7, "rgba(4,4,4,0.8)"); sh.addColorStop(1, "rgba(4,4,4,0)");
  g.fillStyle = sh; g.fillRect(800, 480, 560, 440);
  g.restore();
  drawCracks(g);
  for (const [i, I] of IMPACTS.entries()) impactStar(g, I.x, I.y, 62, 40 + i);
  for (const sc of SCISSORS_A) drawScissors(g, sc);
  blitOwl(g, owl("hips", ["hips", HIPS], OWL_A), OWL_A.x, OWL_A.y, OWL_A.s);
}
function drawA(ctx, t) {
  const c = caches();
  if (!c.frameA) {
    c.frameA = mk(W, H);
    drawFramedPage(c.frameA.getContext("2d"), pageWithBanner(), { glow: 1, over: paintA });
  }
  // the slow creep out measured by camtrack (s 1 → 0.9972 over the second, fixed point ≈ frame centre)
  const u = clamp((t - 110.52) / 1.0), s = 1 - 0.0028 * Math.sqrt(u);
  ctx.save();
  ctx.setTransform(s, 0, 0, s, (1 - s) * 1180, (1 - s) * 1000);
  ctx.drawImage(c.frameA, 0, 0);
  ctx.restore();
}

// ================================================================ shards (C, D)
// per-shard constants (seeded)
function shardInfo() {
  const c = caches();
  if (c.sinfo) return c.sinfo;
  const T = tiling();
  c.sinfo = T.map((s, i) => {
    const r = rng(9100 + i);
    return {
      col: r() < 0.25,                    // shows the colour page instead of the B&W one (C); D uses colD
      colD: r() < 0.12,
      rot: (r() - 0.5) * 0.22, sc: 0.96 + r() * 0.08, jx: (r() - 0.5) * 30, jy: (r() - 0.5) * 30,
      spin: (r() - 0.5) * 0.9, fly: 0.85 + r() * 0.4, cut: r(), big: 1.5 + r() * 0.8,
    };
  });
  return c.sinfo;
}
// draw the shards with the placement function place(shard, info) -> {x, y, rot, s, col} or null (not drawn)
function drawShards(ctx, place, { line = 2.3, alpha = 1 } = {}) {
  const T = tiling(), I = shardInfo(), S = shardSources();
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineJoin = "round";
  for (let i = 0; i < T.length; i++) {
    const p = place(T[i], I[i]);
    if (!p) continue;
    const ca = Math.cos(p.rot) * p.s, sa = Math.sin(p.rot) * p.s, [cx, cy] = T[i].c;
    ctx.setTransform(ca, sa, -sa, ca, p.x - (ca * cx - sa * cy), p.y - (sa * cx + ca * cy));
    ctx.beginPath(); polyPath(ctx, T[i].P);
    ctx.fillStyle = p.col ? S.patCol : S.patBW; ctx.fill();
    ctx.lineWidth = line / p.s; ctx.strokeStyle = "#e9e8e2"; ctx.stroke();
  }
  ctx.restore();
}

// C: the blast field. Shards thrown out 1.13x about the page centre, then a slow zoom about (1071, 496).
const E_C = [1071, 496];
function zoomC(t) { return 1 + 0.056 * clamp((t - 111.8) / 0.84); }
// the hole blown in the middle (headline + the owl's upper body), ragged by each shard's seed
const inHoleC = (cx, cy, I) => { const ex = (cx - 1100) / 540, ey = (cy - 300) / 250; return ex * ex + ey * ey < 0.7 + 0.6 * I.cut; };
function placeC(t) {
  const z = zoomC(t);
  return (s, I) => {
    const [cx, cy] = s.c;
    if (inHoleC(cx, cy, I)) return null;
    const k = 1.13 * z;
    return { x: E_C[0] + (cx - E_C[0]) * k + I.jx, y: E_C[1] + (cy - E_C[1]) * k + I.jy, rot: I.rot, s: I.sc * k, col: I.col };
  };
}
// radial white speed lines round the owl's head, redrawn every frame (they flicker in the source)
function speedLines(ctx, t, cx, cy, n, r0, r1, alpha = 1) {
  const r = rng(5000 + FR(t));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(245,244,240,0.92)";
  for (let k = 0; k < n; k++) {
    const a = r() * Math.PI * 2, ra = r0 * (0.8 + r() * 0.6), rb = ra + (r1 - r0) * (0.3 + r() * 0.7), w = 1.5 + r() * 5;
    const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    ctx.beginPath();
    ctx.moveTo(cx + ux * ra, cy + uy * ra * 0.8);
    ctx.lineTo(cx + ux * rb + nx * w, cy + (uy * rb) * 0.8 + ny * w);
    ctx.lineTo(cx + ux * rb - nx * w, cy + (uy * rb) * 0.8 - ny * w);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// scissors flung out (pivot x, y, blade angle, blade length): C reads at 111.64 / 112.0 / 112.6, D at 112.72 / 113.2
const SC_L = [[111.6, 347, 320, Math.PI, 225], [112.0, 265, 303, Math.PI - 0.12, 225], [112.68, 185, 262, Math.PI - 0.45, 225],
  [112.72, 215, 150, Math.PI - 0.3, 190], [113.2, 150, 95, Math.PI - 0.45, 200], [113.44, -60, 20, Math.PI - 0.6, 210]];
const SC_R = [[111.6, 1809, 254, 0.26, 215], [112.0, 1864, 221, 0.35, 215], [112.68, 1975, 185, 0.62, 215],
  [112.72, 1880, 130, 0.55, 190], [113.2, 1960, 80, 0.7, 200], [113.44, 2220, 10, 0.85, 210]];
function flungScissors(ctx, t) {
  if (t > 113.44) return;
  for (const [keys, top] of [[SC_L, 1], [SC_R, -1]]) {
    const [x, y, ang, L] = interp(keys, t);
    const [x2, y2, a2] = interp(keys, t - 0.06);
    ctx.save(); ctx.globalAlpha = 0.25; drawScissors(ctx, { x: x2, y: y2, ang: a2, L, open: 0.2, top, ring: 1.2 }); ctx.restore();
    drawScissors(ctx, { x, y, ang, L, open: 0.2, top, ring: 1.2 });
  }
}
// the colour page seen through the hole in C (ORB on the headline 111.6–112.6: s ≈ 0.832, fixed)
const PAGE_C = { s: 0.832, tx: 160, ty: 96 };
function holeClip(ctx, t) {
  const T = tiling(), I = shardInfo(), z = zoomC(t), k = 1.13 * z;
  ctx.beginPath();
  for (let i = 0; i < T.length; i++) {
    if (!inHoleC(T[i].c[0], T[i].c[1], I[i])) continue;
    const P = T[i].P, [cx, cy] = T[i].c, sc = k * 1.1;
    const tx = E_C[0] + (cx - E_C[0]) * k - cx * sc, ty = E_C[1] + (cy - E_C[1]) * k - cy * sc;
    ctx.moveTo(P[0][0] * sc + tx, P[0][1] * sc + ty);
    for (let j = 1; j < P.length; j++) ctx.lineTo(P[j][0] * sc + tx, P[j][1] * sc + ty);
    ctx.closePath();
  }
}
function paintC(ctx, t) {
  ctx.save();
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  holeClip(ctx, t); ctx.clip();
  drawColourPage(ctx, PAGE_C.s, PAGE_C.tx, PAGE_C.ty);
  ctx.restore();
  const smear = FR(t) === FR(111.8);
  if (smear) {
    drawShards(ctx, placeC(t), { alpha: 0.6 });
    ctx.save(); ctx.translate(0, 18); drawShards(ctx, placeC(t), { alpha: 0.5 }); ctx.restore();
  } else drawShards(ctx, placeC(t));
  speedLines(ctx, t, 1080, 380, 46, 230, 640);
  flungScissors(ctx, t);
  if (t < 111.62) {
    blitOwl(ctx, owl("hips", ["hips", HIPS], OWL_A), 1077, 640, 0.95);
  } else {
    // the owl rides the slow push-in with the shards
    const z = zoomC(t), x = E_C[0] + (1125 - E_C[0]) * z, y = E_C[1] + (632 - E_C[1]) * z;
    const shut = t >= 112.62;
    const pose = shut ? { ...SPREAD, eyes: { ...SPREAD.eyes, state: "closed" } } : SPREAD;
    liveOwl(ctx, { ...owlPose("fly", pose), x, y, s: 0.88 * z });
  }
}

// ================================================================ D: the colour page arrives through the shards
const E_D = [1000, 450];
function placeD(t) {
  const u = clamp((t - 112.7) / 1.45);
  const k = 1.9 + 0.8 * u + 1.2 * u * u * u;
  // the clear window grows as the page settles
  const rx = 640 + 260 * u, ry = 400 + 160 * u;
  return (s, I) => {
    const [cx, cy] = s.c;
    const x = E_D[0] + (cx - E_D[0]) * k * I.fly + I.jx * 3, y = E_D[1] + (cy - E_D[1]) * k * I.fly + I.jy * 3;
    const ex = (x - 1010) / rx, ey = (y - 440) / ry;
    if (ex * ex + ey * ey < 0.8 + 0.5 * I.cut) return null;
    if (x < -700 || x > W + 700 || y < -600 || y > H + 600) return null;
    return { x, y, rot: I.rot + I.spin * u, s: I.big * (1 + 0.5 * u), col: I.colD };
  };
}
function paintD(ctx, t) {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const A = pageArrival(Math.max(112.7, t));
  drawColourPage(ctx, A.s, A.tx, A.ty);
  drawShards(ctx, placeD(t), { line: 2.6 });
  flungScissors(ctx, t);
  liveOwl(ctx, hoverPose(t));
}

// ================================================================ E: the out-of-focus shard across the lens
// a huge B&W shard right at the lens, far out of focus: a 1250 x 1500 rectangle at ~ -28 deg, centre fitted to the
// source's grey-slab mask per frame (IoU 0.74-0.91)
const SLAB = [
  [113.72, -140, 1560, -28], [113.76, -64, 1445, -28], [113.8, -5, 1332, -22], [113.84, 246, 1185, -28], [113.88, 393, 957, -24],
  [113.92, 620, 480, -30], [113.96, 972, 60, -32], [114.0, 1130, -81, -28], [114.04, 1367, -214, -28], [114.08, 1515, -335, -28],
  [114.12, 1876, -532, -22], [114.16, 2250, -800, -20],
];
const SLAB_W = 1250, SLAB_H = 1500;
function slabTexture() {
  const c = caches();
  if (c.slab) return c.slab;
  // a piece of the B&W page (boxes and hatching under the header), grey, blurred hard, at 1/4 resolution
  const w = Math.round(SLAB_W / 4), h = Math.round(SLAB_H / 4), pad = 24;
  const inner = mk(w, h), gi = inner.getContext("2d");
  gi.fillStyle = "#2e302e"; gi.fillRect(0, 0, w, h);
  gi.save(); gi.translate(w / 2, h / 2); gi.rotate(0.1); gi.translate(-w / 2, -h / 2);
  gi.drawImage(shardSources().srcBW, 260, 420, 620, 470, -30, -30, w + 60, h + 60);
  gi.restore();
  gi.fillStyle = "rgba(70,74,72,0.45)"; gi.fillRect(0, 0, w, h);
  const k = mk(w + 2 * pad, h + 2 * pad), g = k.getContext("2d");
  g.filter = "blur(5px)";
  g.drawImage(inner, pad, pad);
  g.filter = "none";
  c.slab = k; c.slabPad = pad;
  return k;
}
function paintSlab(ctx, t) {
  if (t < 113.74 || t > 114.14) return;
  const [cx, cy, a] = interp(SLAB, t);
  const tex = slabTexture(), pad = C.slabPad;
  const sx = SLAB_W / (tex.width - 2 * pad), sy = SLAB_H / (tex.height - 2 * pad);
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(a * Math.PI / 180); ctx.scale(sx, sy);
  ctx.drawImage(tex, -tex.width / 2, -tex.height / 2);
  ctx.restore();
}

// ================================================================ F: the colour owl over the settling page
function paintF(ctx, t) {
  const A = pageArrival(t);
  drawColourPage(ctx, A.s, A.tx, A.ty);
  if (t < 114.2) drawShards(ctx, placeD(t), { line: 2.6 });
  const o = colorOwlAt(t);
  if (o) drawColorOwl(ctx, o);
}

export const shot = {
  draw(ctx, local, t) {
    if (t < 111.54) { drawA(ctx, t); return; }
    if (t < 111.58) {
      // B: the jolt frame — the whole picture shrunk a hair and thrown up, no room light
      const c = caches();
      if (!c.jolt) {
        c.jolt = mk(W, H);
        drawFramedPage(c.jolt.getContext("2d"), pageWithBanner(), { glow: 0, over: paintA });
      }
      ctx.save(); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      ctx.setTransform(0.9912, 0, 0, 0.9912, -7, -20); ctx.drawImage(c.jolt, 0, 0); ctx.restore();
      return;
    }
    if (t < 112.7) { paintC(ctx, t); return; }
    if (t < 114.0) { paintD(ctx, t); paintSlab(ctx, t); return; }
    paintF(ctx, t);
    paintSlab(ctx, t);
  },
  release() { C = null; releaseSoko(); releaseHippie(); },
};
