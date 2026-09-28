// s26 (110.52–117.52) — the shattered page blows out into colour and the finished colour site is revealed.
// Beats (film time, measured on the source frame by frame; see fidelity/s26.md for the numbers):
//   A 110.52–111.52  the framed page on the lit screen, un-squashed after s25's 108.08 squash: traced crack network,
//                    two traced impact stars with a pair of scissors stuck in each, the colour banner in the header,
//                    the owl (s25's traced "hips2" drawing, refitted) with its wings on its hips. Camera: the ORB
//                    zoom s 1.0029 → 1.0 about (1150, 950).
//   B 111.56         one jolt frame: the page thrown up and shrunk (x' = 0.9911x − 8.5, y' = 0.9905y − 19.6), no glow.
//   C 111.60–112.68  the blast: a traced shard field (outlines + per-cell page content) under its measured per-frame
//                    affine; the colour page shows through the gaps; the frame's own speed lines (traced per frame);
//                    the two scissors flung out to the top corners (finger loops tracked per frame); the owl throws
//                    its wings open (rig posed per frame by silhouette + iris fits); 111.80 is a double-exposed shake
//                    frame; eyes squeezed shut 112.64–112.68.
//   D 112.72–113.88  cut: the colour page arrives (hippie pageArrival) through a ring of B&W shards (traced cells,
//                    moving with the ring's measured zoom); the white owl hovers over the designer, head turned to the
//                    viewer's right, winking to 113.04 (rig per frame).
//   E 113.72–114.12  a huge out-of-focus shard sweeps across the lens from lower left to upper right; behind it the
//                    owl turns into the colour owl (first seen 114.08).
//   F 114.08–117.52  the colour owl (rig in its colour look, posed per frame) flies up to the top-right box by the
//                    nav and perches from 117.04; the page camera settles at 114.9.
import { drawFramedPage, sokoPageCanvas, HEADER, FRAMED, releaseSoko } from "../lib/sites.js";
import { hippieBannerCanvas, hippiePageCanvas, pageArrival, releaseHippie } from "../lib/hippie.js";
import { rng, clamp } from "../lib/rng.js";
import { tiling, polyPath } from "./s26/shards.js";
import { CRACKS_A, STARS_A } from "./s26/cracksA.js";
import { drawRig, unpack } from "./s26/rig.js";
import { POSES_C, POSES_C_KEYS } from "./s26/posesC.js";
import { POSES_D, POSES_D_KEYS } from "./s26/posesD.js";
import { FIELD_C } from "./s26/fieldC.js";
import { POSES_F, POSES_F_KEYS } from "./s26/posesF.js";
import { SC_KEYS, SPEED } from "./s26/fx.js";
import { RING_CELLS, RING_SEGS } from "./s26/ringD.js";
import { POSE_A } from "./s26/poseA.js";
import { paintOwl } from "./s26/owlA.js";
import { drawScissors as drawScissorsF } from "./s26/scissorsFlung.js";
// (the previous flat colour rig, s26/owlc.js, is kept only as the source of the initial fit poses)
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
// the colour page under a page->frame similarity
function drawColourPage(ctx, s, tx, ty) {
  ctx.save();
  ctx.setTransform(s, 0, 0, s, tx, ty);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(hippiePageCanvas(), 0, 0);
  ctx.restore();
}

// ================================================================ A / B: the cracked page on the screen
// Everything in A is drawn in STAGE px = the pre-squash frame of s25 (s25 squashes its whole frame vertically by 0.9836
// at 108.08; the source un-squashes at the 110.52 cut). The A camera (ORB affine against the pre-squash frame 107.88,
// per frame): s 1.0029 at 110.52 easing to 1.0 by 111.52, fixed point ≈ (1150, 950).
const CAM_A = [[110.52, 1.0029], [110.64, 1.0027], [110.8, 1.0015], [111.0, 1.0008], [111.2, 1.0006], [111.4, 1.0003], [111.52, 1.0]];
const SQ = 0.9836, SQY = 790;
// crack lines: bright core ~2.4 px with a faint halo (s25's measured profile); the rays that leave the two impact
// stars are wide white wedges (≈ 11 px at the star, tapering over ~150 px)
function drawCracksA(g) {
  g.save();
  g.lineCap = "round";
  for (const [w, col] of [[4.4, "rgba(200,200,198,0.35)"], [2.5, "rgb(224,224,222)"]]) {
    g.strokeStyle = col; g.lineWidth = w;
    g.beginPath();
    for (let i = 0; i < CRACKS_A.length; i += 4) { g.moveTo(CRACKS_A[i], CRACKS_A[i + 1]); g.lineTo(CRACKS_A[i + 2], CRACKS_A[i + 3]); }
    g.stroke();
  }
  // wedges: segments that start at a star and point away from it
  g.fillStyle = "rgb(226,226,224)";
  for (const [cx, cy] of STAR_C) {
    for (let i = 0; i < CRACKS_A.length; i += 4) {
      let x0 = CRACKS_A[i], y0 = CRACKS_A[i + 1], x1 = CRACKS_A[i + 2], y1 = CRACKS_A[i + 3];
      let d0 = Math.hypot(x0 - cx, y0 - cy), d1 = Math.hypot(x1 - cx, y1 - cy);
      if (d1 < d0) { [x0, y0, x1, y1] = [x1, y1, x0, y0]; [d0, d1] = [d1, d0]; }
      if (d0 > 60 || d1 < 80) continue;
      const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
      if (ux * (x0 - cx) + uy * (y0 - cy) < -10) continue;                 // must point away from the star
      const Lw = Math.min(L, 170), w0 = 5.5;
      g.beginPath();
      g.moveTo(x0 - uy * w0, y0 + ux * w0); g.lineTo(x0 + ux * Lw, y0 + uy * Lw); g.lineTo(x0 + uy * w0, y0 - ux * w0); g.closePath();
      g.fill();
    }
  }
  g.restore();
}
const STAR_C = [[645, 391], [1522, 364]];
// the impact stars: a white burst with a black jagged ring round it (comic-style), traced outlines
function drawStarsA(g) {
  STARS_A && [STARS_A.L, STARS_A.R].forEach((P, k) => {
    const [cx, cy] = STAR_C[k];
    const path = (sc, jag) => {
      g.beginPath();
      P.forEach(([x, y], i) => {
        const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy), f = sc * (1 + jag * ((i * 7) % 5) / 5);
        const X = cx + dx * f, Y = cy + dy * f;
        if (i) g.lineTo(X, Y); else g.moveTo(X, Y);
      });
      g.closePath();
    };
    g.save();
    path(1.32, 0.18); g.fillStyle = "rgba(8,8,8,0.92)"; g.fill();
    path(1.0, 0); g.fillStyle = "rgb(240,240,238)"; g.fill();
    g.restore();
  });
}
// the standing owl: s25's hips2 drawing (traced at 109.4 on the squashed frame), un-squashed into stage px
function owlA() {
  const c = caches();
  if (!c.owlA) { c.owlA = mk(W, H); paintOwl(c.owlA.getContext("2d"), POSE_A, { eyes: "open" }); }
  return c.owlA;
}
function paintA(g) {
  // the page ends at y ≈ 912 (as in s25's standing phase)
  g.fillStyle = "#000"; g.fillRect(140, 913, 1890, 40);
  drawCracksA(g);
  drawStarsA(g);
  // the owl's shadow on the page round its feet (s25)
  const gr = g.createRadialGradient(1085, 850, 10, 1085, 850, 330);
  gr.addColorStop(0, "rgba(0,0,0,0.85)"); gr.addColorStop(0.55, "rgba(0,0,0,0.6)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.save(); g.translate(1085, 850); g.scale(1, 0.4); g.translate(-1085, -850); g.fillStyle = gr; g.fillRect(740, 500, 700, 700); g.restore();
  // the stuck pairs (median A frame, 3x gridded crops): pivots, blade tips in the impact stars, finger-loop centres
  flungPair(g, [772, 477], Math.atan2(390 - 477, 640 - 772), 162, [843, 563], [868, 488], 1);
  flungPair(g, [1395, 453], Math.atan2(364 - 453, 1522 - 1395), 160, [1317, 533], [1295, 455], 1);
  // the floor round the feet is black in A (the page's figure below the owl does not show)
  g.save(); g.translate(1085, 845); g.scale(1, 0.32); g.translate(-1085, -845);
  const gr2 = g.createRadialGradient(1085, 845, 60, 1085, 845, 300);
  gr2.addColorStop(0, "rgba(3,3,3,0.97)"); gr2.addColorStop(0.7, "rgba(3,3,3,0.9)"); gr2.addColorStop(1, "rgba(3,3,3,0)");
  g.fillStyle = gr2; g.fillRect(700, 400, 800, 900); g.restore();
  g.drawImage(owlAStage(), 0, 0);
}
function stageA(glow) {
  const c = caches(), k = glow ? "frameA" : "jolt";
  if (!c[k]) { c[k] = mk(W, H); drawFramedPage(c[k].getContext("2d"), pageWithBanner(), { glow, over: paintA }); }
  return c[k];
}
function drawA(ctx, t) {
  const [s] = interp(CAM_A, t);
  ctx.save();
  ctx.setTransform(s, 0, 0, s, (1 - s) * 1150, (1 - s) * 950);
  ctx.drawImage(stageA(1), 0, 0);
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
      colD: r() < 0.08,
      rot: (r() - 0.5) * 0.22, sc: 0.96 + r() * 0.08, jx: (r() - 0.5) * 30, jy: (r() - 0.5) * 30,
      spin: (r() - 0.5) * 0.9, fly: 0.85 + r() * 0.4, cut: r(), big: 1.5 + r() * 0.8,
    };
  });
  return c.sinfo;
}
// scissors flung out to the top corners (s26/fx.js: per-frame pivots and blade angles measured from the tracked finger
// loops, 111.60–113.68); a faint ghost two frames behind (the source's motion echo)
// each pair is drawn with s21's scissors (s26/scissorsFlung.js); the rings are placed on the measured loop centres
function flungPair(ctx, piv, ang, L, lo, up, alpha) {
  const h = [-Math.cos(ang), -Math.sin(ang)], e2 = [-h[1], h[0]];
  const ring = (p) => { const d = [p[0] - piv[0], p[1] - piv[1]]; return { u: (d[0] * h[0] + d[1] * h[1]) / L, v: (d[0] * e2[0] + d[1] * e2[1]) / L, rx: 0.16, ry: 0.22, rot: 0.1, t: 0.075 }; };
  ctx.save(); ctx.globalAlpha = alpha;
  drawScissorsF(ctx, { x: piv[0], y: piv[1], ang, L: L * 0.95, open: 0.03, bw: 0.1, rings: [ring(up), ring(lo)] });
  ctx.restore();
}
function scAt(F) {
  const i = Math.max(0, Math.min(SC_KEYS.length - 1, F - SC_KEYS[0][0]));
  return SC_KEYS[i];
}
function flungScissors(ctx, t) {
  const F = FR(t);
  if (F > SC_KEYS[SC_KEYS.length - 1][0]) return;
  for (const [k, alpha] of [[2, 0.22], [0, 1]]) {
    const r = scAt(F - k);
    flungPair(ctx, [r[1], r[2]], r[3], r[4], [r[9], r[10]], [r[11], r[12]], alpha);
    flungPair(ctx, [r[5], r[6]], r[7], r[8], [r[13], r[14]], [r[15], r[16]], alpha);
  }
}
// the frame's own speed lines (s26/fx.js SPEED): tapered white wedges, outward
function speedLinesF(ctx, F) {
  const S = SPEED[F]; if (!S) return;
  ctx.save(); ctx.fillStyle = "rgb(236,236,234)";
  for (let i = 0; i < S.length; i += 6) {
    const [x0, y0, x1, y1] = S.slice(i, i + 4), w0 = Math.max(1.2, S[i + 4]) / 2, w1 = Math.max(0.6, S[i + 5]) / 2;
    const L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
    ctx.beginPath(); ctx.moveTo(x0 + nx * w0, y0 + ny * w0); ctx.lineTo(x1 + nx * w1, y1 + ny * w1); ctx.lineTo(x1 - nx * w1, y1 - ny * w1); ctx.lineTo(x0 - nx * w0, y0 - ny * w0); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// the traced shard field (s26/fieldC.js), drawn at source frame F under the field's measured affine
function bwPlain() {
  const c = caches();
  if (!c.bwPlain) { c.bwPlain = mk(W, H); drawFramedPage(c.bwPlain.getContext("2d"), pageWithBanner(), { glow: 1.4 }); }
  return c.bwPlain;
}
function fieldPaths() {
  const c = caches();
  if (c.fieldP) return c.fieldP;
  const bw = [], col = [], blk = [];
  for (const r of FIELD_C.cells) {
    const [lab, dx, dy, R, G, B] = r, pth = new Path2D();
    pth.moveTo(r[6], r[7]); for (let i = 8; i < r.length; i += 2) pth.lineTo(r[i], r[i + 1]); pth.closePath();
    if (lab === 0) bw.push({ pth, dx, dy });
    else if (lab === 1) col.push({ pth, dx, dy });
    else blk.push({ pth, col: `rgb(${R},${G},${B})` });
  }
  const segs = new Path2D(), S = FIELD_C.segs;
  for (let i = 0; i < S.length; i += 4) { segs.moveTo(S[i], S[i + 1]); segs.lineTo(S[i + 2], S[i + 3]); }
  c.fieldP = { bw, col, blk, segs };
  return c.fieldP;
}
const mat = (m) => new DOMMatrix([m[0], m[3], m[1], m[4], m[2], m[5]]);
function drawFieldC(ctx, F) {
  const c = caches(), P = fieldPaths(), cam = FIELD_C.cam[Math.min(2817, Math.max(2790, F))];
  if (!c.patBWp) { c.patBWp = ctx.createPattern(bwPlain(), "no-repeat"); c.patCol = ctx.createPattern(hippiePageCanvas(), "no-repeat"); }
  const Mb = mat(FIELD_C.Mb), Mc = mat(FIELD_C.Mc);
  ctx.save();
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const CAM = mat(cam), CAMi = CAM.inverse();
  // the colour page stays put behind the field (the gaps between the shards show it)
  ctx.setTransform(Mc); ctx.drawImage(hippiePageCanvas(), 0, 0);
  ctx.setTransform(CAM);
  for (const q of P.bw) { c.patBWp.setTransform(new DOMMatrix().translate(q.dx, q.dy).multiply(Mb)); ctx.fillStyle = c.patBWp; ctx.fill(q.pth); }
  // colour cells: shifted pieces of the colour page travel with the field; the unshifted ones are gaps onto the colour
  // page, which stays put behind the field
  for (const q of P.col) {
    if (!q.dx && !q.dy) continue;
    c.patCol.setTransform(q.dx || q.dy ? new DOMMatrix().translate(q.dx, q.dy).multiply(Mc) : CAMi.multiply(Mc));
    ctx.fillStyle = c.patCol; ctx.fill(q.pth);
  }
  for (const q of P.blk) { ctx.fillStyle = q.col; ctx.fill(q.pth); }
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(210,210,208,0.35)"; ctx.lineWidth = 4.2; ctx.stroke(P.segs);
  ctx.strokeStyle = "rgb(232,232,230)"; ctx.lineWidth = 2.4; ctx.stroke(P.segs);
  ctx.restore();
}
function paintCBack(ctx, t) {
  drawFieldC(ctx, FR(t));
  speedLinesF(ctx, FR(t));
  flungScissors(ctx, t);
}
function paintC(ctx, t) {
  if (FR(t) === FR(111.8)) {
    // 111.80: a shake frame — the background is double-exposed with a ghost thrown (-50, -120) px; the owl stays crisp
    const c = caches();
    if (!c.tmp) c.tmp = mk(W, H);
    const g = c.tmp.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    paintCBack(g, t);
    ctx.drawImage(c.tmp, 0, 0);
    ctx.save(); ctx.globalAlpha = 0.45; ctx.drawImage(c.tmp, -50, -120); ctx.restore();
  } else paintCBack(ctx, t);
  // the owl: the rig, posed per source frame (fits in s26/posesC.js); 111.60 still the standing drawing
  if (t < 111.62) {
    ctx.save(); ctx.translate(0, -25); ctx.drawImage(owlAStage(), 0, 0); ctx.restore();
  } else ctx.drawImage(owlC(t), 0, 0);
}
const C_BASE = { look: "ink", head: { x: 0, y: 0, r: 90, rot: 0, yaw: -0.3, tuft: 0.4 }, eyes: { L: "angry", R: "angry", lookL: [1.3, 0.1], lookR: [0.1, 0.05] },
  body: { x: 0, y: 0, rx: 100, ry: 100, rot: 0 }, wings: [{ S: [0, 0], Wr: [0, 0], T: [0, 0], trail: 2, sec: 120, layer: "back" }, { S: [0, 0], Wr: [0, 0], T: [0, 0], trail: 1, sec: 120, layer: "back" }], tail: null,
  feet: [{ x: 0, y: 0, ang: 0, size: 58 }, { x: 0, y: 0, ang: 0, size: 58 }] };
// the dangling feet (ankles, frame px; 2x gridded crops at 111.64 / 112.00 / 112.40 / 112.68)
const FEET_C = [[2791, 1185, 735, 1245, 705], [2800, 1195, 705, 1250, 700], [2810, 1190, 715, 1255, 705], [2817, 1185, 715, 1255, 705]];
function owlC(t) {
  const c = caches();
  if (!c.owlCc) c.owlCc = mk(W, H);
  const F = Math.min(2817, Math.max(2791, FR(t)));
  if (c.owlCF !== F) {
    const g = c.owlCc.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    const P = unpack(POSES_C_KEYS, POSES_C[F], C_BASE);
    if (F >= 2816) P.eyes = { ...P.eyes, L: "shut", R: "shut" };
    drawRig(g, P);
    c.owlCF = F;
  }
  return c.owlCc;
}
function owlAStage() {
  const c = caches();
  // hips2 un-squashed, then the small fit to the A owl's silhouette (median A frame: sx 0.995, sy 0.985 about
  // (1080, 600), +5 px down; silhouette IoU 0.915 -> 0.947)
  if (!c.owlAS) { c.owlAS = mk(W, H); const g = c.owlAS.getContext("2d"); g.translate(1081, 605); g.scale(0.995, 0.985); g.translate(-1080, -600); g.translate(0, SQY); g.scale(1, 1 / SQ); g.translate(0, -SQY); g.drawImage(owlA(), 0, 0); }
  return c.owlAS;
}

// ================================================================ D: the colour page arrives through the shards
// D: the ring of shards is the blast field (s26/fieldC.js) seen closer and flying apart.
//   * RING_D: the ring's own motion per source frame, measured (ORB similarity frame to frame on the ring, left and
//     right halves, chained): zoom s and translation (tx, ty) relative to 112.72 — it creeps out slowly, then
//     accelerates (1.09 by 113.28, 1.33 by 113.68).
//   * the field is taken to D at 1.64x (the D shards show the page at ~1.85x, the C field at ~1.13x) about (1071, 496);
//   * HOLE_D: the colour-page window through the ring (half-width of the window on the y = 450 row, measured on the
//     frames' colour-page match mask); cells whose centre falls inside it are gone.
// The individual D shards are not traced (their content could not be matched reliably); the field is a stand-in with
// the measured scale, motion and window.
const RING_D = [[2818, 1.0, 0.0, 0.0],
   [2819, 1.0021, 4.7, -1.4],
   [2820, 1.0033, 4.9, 1.5],
   [2821, 1.0065, 0.8, 1.2],
   [2822, 1.0119, -5.9, 0.0],
   [2823, 1.0173, -10.0, -2.4],
   [2824, 1.0206, -10.8, -4.5],
   [2825, 1.0234, -14.2, -3.2],
   [2826, 1.0292, -22.1, -8.8],
   [2827, 1.0358, -25.8, -13.4],
   [2828, 1.0431, -32.6, -15.9],
   [2829, 1.0508, -40.4, -19.4],
   [2830, 1.0629, -49.5, -26.2],
   [2831, 1.0764, -62.3, -33.6],
   [2832, 1.0896, -78.2, -38.5],
   [2833, 1.1036, -94.0, -46.2],
   [2834, 1.1227, -112.0, -57.0],
   [2835, 1.1418, -132.1, -65.8],
   [2836, 1.1627, -154.9, -77.5],
   [2837, 1.1847, -177.8, -86.5],
   [2838, 1.2124, -206.2, -102.2],
   [2839, 1.2124, -206.2, -102.3],
   [2840, 1.2406, -236.7, -115.8],
   [2841, 1.2765, -275.5, -134.2],
   [2842, 1.3215, -326.1, -155.8],
   [2843, 1.3682, -372.1, -181.4],
   [2844, 1.3736, -374.2, -188.1],
   [2845, 1.376, -372.1, -192.9],
   [2846, 1.3791, -373.2, -197.2],
   [2847, 1.3838, -374.3, -209.6],
   [2848, 1.4456, -429.8, -270.6],
   [2849, 1.4504, -434.9, -270.9],
   [2850, 1.4526, -435.2, -272.7],
   [2851, 1.4572, -440.6, -275.1]];
// after 112.68+1.36 s (frame 2842) the left half has left the frame and the right half's track is lost: the ring keeps
// accelerating out about its measured fixed point (1091, 424) (growth 4 % a frame at 2842, +1 % per frame)
function ringAt(F, right = false) {
  if (F <= 2842) return interp(RING_D, F);
  let [s0] = interp(RING_D, 2842), s = s0;
  // (a slower right half, as the source's last shards on the right suggest, measured worse: σ8 ΔE +1..+2)
  for (let f = 2843; f <= F; f++) s *= 1.04 + 0.01 * (f - 2842);
  return [s, 1091 * (1 - s), 424 * (1 - s)];
}
const HOLE_D = [[2818, 515], [2826, 556], [2830, 585], [2834, 607], [2836, 627], [2838, 655], [2842, 723], [2844, 805], [2846, 900], [2852, 1300]];
function drawRingD(ctx, F) {
  // the page tiling (s26/shards.js, stage px) carried by the measured ring motion: each shard shows its own piece of
  // the B&W page; ~10 % are dark; small seeded tilt and offset per shard; shards inside the window are gone
  const c = caches(), T0 = tiling(), I = shardInfo();
  if (!c.patBWp) { c.patBWp = ctx.createPattern(bwPlain(), "no-repeat"); c.patCol = ctx.createPattern(hippiePageCanvas(), "no-repeat"); }
  const [rs, rtx, rty] = ringAt(F);
  const G = new DOMMatrix([rs, 0, 0, rs, rtx, rty]).multiply(new DOMMatrix().translate(1071, 496).scale(1.64).translate(-1071, -496)).multiply(mat(FIELD_C.Mb));
  const [ha] = interp(HOLE_D, F), hb = ha * 1.05, hx = 1060, hy = 420;
  const u = clamp((F - 2818) / 30);
  const outline = new Path2D();
  ctx.save();
  for (let i = 0; i < T0.length; i++) {
    const t = T0[i], inf = I[i];
    const q = G.transformPoint(new DOMPoint(t.c[0], t.c[1]));
    const ex = (q.x - hx) / ha, ey = (q.y - hy) / hb;
    if (ex * ex + ey * ey < 1) continue;
    if (q.x < -400 || q.x > W + 400 || q.y < -400 || q.y > H + 400) continue;
    // per-shard tilt about its placed centre, a small drift outward that grows as the ring flies apart
    const ox = inf.jx * (0.5 + 1.5 * u), oy = inf.jy * (0.5 + 1.5 * u);
    const Mi = new DOMMatrix().translate(q.x + ox, q.y + oy).rotate((inf.rot + inf.spin * u * 0.5) * 57.3).translate(-q.x, -q.y).multiply(G);
    ctx.setTransform(Mi);
    const pth = new Path2D(); polyPath(pth, t.P);
    if (inf.cut < 0.1) ctx.fillStyle = "#070707";
    else { c.patBWp.setTransform(new DOMMatrix()); ctx.fillStyle = c.patBWp; }
    ctx.fill(pth);
    ctx.lineJoin = "round"; ctx.strokeStyle = "rgba(232,232,230,0.92)"; ctx.lineWidth = 2.2 / (rs * 1.85); ctx.stroke(pth);
  }
  ctx.restore();
  // the traced ring cells (s26/ringD.js) over the stand-in tiling, carried by the ring's measured motion
  if (!c.ringP) {
    c.ringP = RING_CELLS.map((r) => { const p = new Path2D(); p.moveTo(r[7], r[8]); for (let i = 9; i < r.length; i += 2) p.lineTo(r[i], r[i + 1]); p.closePath(); let x = 0, y = 0, n = 0; for (let i = 7; i < r.length; i += 2) { x += r[i]; y += r[i + 1]; n++; } return { p, r, cx: x / n, cy: y / n }; });
    c.ringS = new Path2D(); for (let i = 0; i < RING_SEGS.length; i += 4) { c.ringS.moveTo(RING_SEGS[i], RING_SEGS[i + 1]); c.ringS.lineTo(RING_SEGS[i + 2], RING_SEGS[i + 3]); }
  }
  const RM = new DOMMatrix([rs, 0, 0, rs, rtx, rty]);
  ctx.save(); ctx.setTransform(RM);
  for (const q of c.ringP) {
    const r = q.r;
    if (r[0] === 0) { c.patBWp.setTransform(new DOMMatrix([r[1], r[4], r[2], r[5], r[3], r[6]])); ctx.fillStyle = c.patBWp; }
    else if (r[0] === 2) { c.patCol.setTransform(new DOMMatrix([r[1], r[4], r[2], r[5], r[3], r[6]])); ctx.fillStyle = c.patCol; }
    else ctx.fillStyle = `rgb(${r[1]},${r[2]},${r[3]})`;
    ctx.fill(q.p);
  }
  ctx.setTransform(RM); ctx.lineCap = "round"; ctx.strokeStyle = "rgba(232,232,230,0.92)"; ctx.lineWidth = 2.4 / rs; ctx.stroke(c.ringS);
  ctx.restore();
}
function paintD(ctx, t) {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const A = pageArrival(Math.max(112.7, t));
  drawColourPage(ctx, A.s, A.tx, A.ty);
  drawRingD(ctx, FR(t));
  flungScissors(ctx, t);
  ctx.drawImage(owlD(t), 0, 0);
}
// the owl hovering over the designer (rig, per-frame fits in s26/posesD.js): head turned to the viewer's right,
// winking (right eye shut) 112.72–113.04, the right eye opening 113.08, then both open, looking right
function owlD(t) {
  const c = caches();
  if (!c.owlDc) c.owlDc = mk(W, H);
  const F = Math.min(2847, Math.max(2818, FR(t)));
  if (c.owlDF !== F) {
    const g = c.owlDc.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    const P = unpack(POSES_D_KEYS, POSES_D[F], { ...C_BASE, head: { ...C_BASE.head, yaw: 0.3 } });
    P.eyes = { L: "open", R: F <= 2826 ? "shut" : F === 2827 ? "half" : "open", lookL: [0.9, 0.05], lookR: [0.8, 0.1], browL: "arch", browR: "furrow" };
    drawRig(g, P);
    c.owlDF = F;
  }
  return c.owlDc;
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
  // a B&W shard right at the lens: dark grey with near-vertical hatching streaks (the page's gear, seen far out of
  // focus) and a few black blocks, blurred hard. Built at 1/4 resolution; streaks run ~28 deg against the slab so they
  // read vertical in the frame, as in the source (113.84–114.04). (A retuned texture with streaks along the slab and
  // a blurred crop of our own page both measured worse: σ8 ΔE +2..+6 over 113.84–114.04.)
  const w = Math.round(SLAB_W / 4), h = Math.round(SLAB_H / 4), pad = 24;
  const inner = mk(w, h), gi = inner.getContext("2d"), r = rng(4242);
  gi.fillStyle = "#353735"; gi.fillRect(0, 0, w, h);
  gi.save(); gi.translate(w / 2, h / 2); gi.rotate(0.49);
  for (let i = 0; i < 70; i++) {
    const x = (r() - 0.5) * w * 1.6, y0 = (r() - 0.5) * h * 1.6, L = h * (0.2 + r() * 0.9), bw = 1 + r() * 7, v = Math.round(70 + r() * 90);
    gi.fillStyle = `rgba(${v},${v + 2},${v},${0.35 + r() * 0.5})`;
    gi.fillRect(x, y0 - L / 2, bw, L);
  }
  for (let i = 0; i < 5; i++) {
    const x = (r() - 0.5) * w, y0 = (r() - 0.5) * h, bw = 20 + r() * 60, bh = 30 + r() * 90;
    gi.fillStyle = `rgba(8,8,8,${0.6 + r() * 0.35})`; gi.fillRect(x, y0, bw, bh);
  }
  gi.restore();
  const k = mk(w + 2 * pad, h + 2 * pad), g = k.getContext("2d");
  g.filter = "blur(4px)";
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
// The colour owl: the rig in its colour look, posed per source frame (s26/posesF.js, fitted to the source's owl
// silhouette = frame minus the clean page, plus the tracked pupils). Eye states read frame by frame on 2x crops.
const F_BASE = { look: "colour", tail: null,
  // head proportions measured on the perched owl at 117.36 (2x gridded crop; r = half the skull width, 53 px there)
  head: { x: 0, y: 0, r: 100, rot: 0, yaw: 0, tuft: 0.3, cupR: 1.18, cupW: 0.22, cupH: 0.5, bandW: 1.2, bandH: 0.76, cupY: 0.19,
    eyeSp: 0.425, eyeY: 0.17, eyeR: 0.3, eyeNear: 0.1, irisR: 0.78, discR: 0.5, discY: 0.08, chin: [0.8, 0.6, 0.6],
    beakS: 0.52, beakY: 0.49, beakShift: 0.5, plY: -0.6 },
  eyes: { L: "open", R: "open" }, body: { x: 0, y: 0, rx: 100, ry: 100, rot: 0 },
  wings: [{ S: [0, 0], Wr: [0, 0], T: [0, 0], trail: 2, sec: 120, layer: "back" }, { S: [0, 0], Wr: [0, 0], T: [0, 0], trail: 1, sec: 120, layer: "back" }],
  feet: [{ x: 0, y: 0, ang: 0, size: 40 }, { x: 0, y: 0, ang: 0, size: 40 }] };
function eyesF(F) {
  if (F <= 2864) return { L: "angry", R: "angry", shape: "almond", lookL: [0.6, 0], lookR: [0.3, 0] };
  if (F === 2865) return { L: "closed", R: "shut" };
  if (F <= 2867) return { L: "half", R: "half" };
  if (F <= 2898) return { L: "open", R: "open", look: [0.05, 0] };
  if (F === 2899) return { L: "open", R: "half" };
  if (F <= 2901) return { L: "half", R: "half" };
  if (F <= 2911) return { L: "open", R: "open" };
  if (F <= 2923) return { L: "closed", R: "closed" };
  if (F === 2924) return { L: "half", R: "half" };
  return { L: "open", R: "open", look: [0, 0.05] };
}
function owlF(t) {
  const c = caches();
  if (!c.owlFc) c.owlFc = mk(W, H);
  const F = Math.min(2937, Math.max(2853, FR(t)));
  if (c.owlFF !== F) {
    const g = c.owlFc.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    const P = unpack(POSES_F_KEYS, POSES_F[F], F_BASE);
    P.eyes = eyesF(F);
    // perched from 117.04: the wings fold against the body sides
    if (F >= 2926) { P.wings.forEach((w) => { w.type = "folded"; w.layer = "mid"; }); P.feet.forEach((f) => { f.mode = "perch"; f.ang = 0; }); }
    drawRig(g, P);
    c.owlFF = F;
  }
  return c.owlFc;
}
function paintF(ctx, t) {
  const A = pageArrival(t);
  drawColourPage(ctx, A.s, A.tx, A.ty);
  if (t < 114.2) drawRingD(ctx, FR(t));
  if (FR(t) >= 2852) ctx.drawImage(owlF(t), 0, 0);
}

export const shot = {
  draw(ctx, local, t) {
    if (t < 111.54) { drawA(ctx, t); return; }
    if (t < 111.58) {
      // B (111.56): the jolt frame — the page thrown up and shrunk (affine vs stage: x' = 0.9911x − 8.5,
      // y' = 0.9905y − 19.6), the room light gone
      ctx.save(); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      ctx.setTransform(0.9911, 0, 0, 0.9905, -8.5, -19.6); ctx.drawImage(stageA(0), 0, 0); ctx.restore();
      return;
    }
    if (t < 112.7) { paintC(ctx, t); return; }
    if (t < 114.0) { paintD(ctx, t); paintSlab(ctx, t); return; }
    paintF(ctx, t);
    paintSlab(ctx, t);
  },
  release() { C = null; releaseSoko(); releaseHippie(); },
};
