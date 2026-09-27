// s26 (110.52–117.52) — the shattered page blows out into colour and the finished colour site is revealed.
// Beats (film time, measured on the source frame by frame; see fidelity/s26.md for the numbers):
//   A 110.52–111.52  the framed page on the lit screen, un-squashed after s25's 108.08 squash: crack network and two
//                    impact stars (measured segment coordinates), a pair of scissors stuck in each, the colour banner in
//                    the header, the owl standing with its wings on its hips (drawn: s26/owlColour.js in B&W inks, posed
//                    from 2x grids of the 111.00 frame). Camera: the ORB zoom s 1.0029 → 1.0 about (1150, 950).
//   B 111.56         one jolt frame: the page thrown up and shrunk (x' = 0.9911x − 8.5, y' = 0.9905y − 19.6), no glow.
//   C 111.60–112.68  the blast: the traced shard field (outlines + per-cell content: our B&W or colour page under a
//                    measured similarity) under its measured per-frame affine; the colour page shows through the gaps;
//                    the frame's own speed lines; the two scissors flung to the top corners (finger loops tracked per
//                    frame); the owl throws its wings open (pose per frame from the silhouette + iris fits, drawn with
//                    the owl painter in B&W inks); 111.80 is a double-exposed shake frame; eyes shut 112.64–112.68.
//   D 112.72–113.68  cut: the colour page arrives (hippie pageArrival) through a ring of B&W shards: everything outside
//                    the measured colour window, moving with the ring's measured zoom (black shards + traced cells
//                    showing measured / tone-matched pieces of our page); the white owl hovers over the designer, head
//                    turned to the viewer's right, winking to 113.04.
//   E 113.68–114.12  a huge out-of-focus shard sweeps across the lens from lower left to upper right (outline and
//                    tones measured per frame); behind it the owl turns into the colour owl (first seen 114.08).
//   F 114.08–117.52  the colour owl (s26/owlColour.js; wings from the per-frame fits, head / body / feet refitted,
//                    face features measured per frame) flies up to the top-right box by the nav and perches from
//                    117.04; the page camera settles at 114.9.
import { drawFramedPage, sokoPageCanvas, HEADER, releaseSoko } from "../lib/sites.js";
import { hippieBannerCanvas, hippiePageCanvas, pageArrival, releaseHippie } from "../lib/hippie.js";
import { rng } from "../lib/rng.js";
import { CRACKS_A, STARS_A } from "./s26/cracksA.js";
import { unpack, headGeom } from "./s26/rig.js";
import { POSES_C, POSES_C_KEYS } from "./s26/posesC.js";
import { POSES_D, POSES_D_KEYS } from "./s26/posesD.js";
import { FIELD_C } from "./s26/fieldC.js";
import { FIELD_LOOK } from "./s26/fieldLook.js";
import { POSES_F, POSES_F_KEYS } from "./s26/posesF.js";
import { FEAT_F, FEAT_F_KEYS } from "./s26/featF.js";
import { drawColourOwl, INK, eyeHalfSpacing, EYE_SHIFT } from "./s26/owlColour.js";
import { SC_KEYS, SPEED } from "./s26/fx.js";
import { RING_CELLS, RING_SEGS } from "./s26/ringD.js";
import { WINDOW_D } from "./s26/windowD.js";
import { SLAB_E } from "./s26/slabE.js";
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
  FIELD_C.cells.forEach((r, k) => {
    const [lab, dx, dy, R, G, B] = r, pth = new Path2D();
    pth.moveTo(r[6], r[7]); for (let i = 8; i < r.length; i += 2) pth.lineTo(r[i], r[i + 1]); pth.closePath();
    const o = FIELD_LOOK[k];
    if (o) (o[0] === 3 ? bw : col).push({ pth, M: new DOMMatrix([o[1], o[4], o[2], o[5], o[3], o[6]]) });
    else if (lab === 0) bw.push({ pth, dx, dy });
    else if (lab === 1) col.push({ pth, dx, dy });
    else blk.push({ pth, col: `rgb(${R},${G},${B})` });
  });
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
  for (const q of P.bw) { c.patBWp.setTransform(q.M ?? new DOMMatrix().translate(q.dx, q.dy).multiply(Mb)); ctx.fillStyle = c.patBWp; ctx.fill(q.pth); }
  // colour cells: shifted pieces of the colour page travel with the field; the unshifted ones are gaps onto the colour
  // page, which stays put behind the field
  for (const q of P.col) {
    if (!q.M && !q.dx && !q.dy) continue;
    c.patCol.setTransform(q.M ?? new DOMMatrix().translate(q.dx, q.dy).multiply(Mc));
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
// the white owl of the blast: the rig's per-frame pose (wings, body, feet) and its face landmarks (eyes pinned by
// the tracked pupils; beak, plaster and cups placed as measured at 112.00 / 112.88), drawn with the owl painter of
// beat F in B&W inks (s26/owlColour.js INK). rigToPainter converts the rig's face landmarks into the painter's head
// frame (eye midpoint at (0.4 yaw, 0.1) head units, half eye spacing 0.4 + 0.03|yaw|).
function rigToPainter(P, rk = 1) {
  const G = headGeom(P.head), yaw = P.head.yaw ?? 0;
  const [a, b] = G.eyes.map((e) => e.c), d = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const sp = eyeHalfSpacing(yaw), r = d / (2 * sp) * rk;
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], ex = EYE_SHIFT * yaw * r, ey = 0.1 * r;
  const cx = mid[0] - (ex * Math.cos(ang) - ey * Math.sin(ang)), cy = mid[1] - (ex * Math.sin(ang) + ey * Math.cos(ang));
  const loc = (p) => { const dx = p[0] - cx, dy = p[1] - cy, c = Math.cos(-ang), s = Math.sin(-ang); return [(dx * c - dy * s) / r, (dx * s + dy * c) / r]; };
  const cupL = G.cups.find((q) => q.k === -1), cupR = G.cups.find((q) => q.k === 1);
  const head = { x: cx, y: cy, r, rot: ang, yaw };
  return { head, fx: { eyeSp: sp / rk, beak: loc(G.beak.c), plaster: loc(G.bandage.c), cupL: loc(cupL.c), cupR: loc(cupR.c), plS: 0.95, beakS: 1.15, plAng: -0.45 } };
}
function owlC(t) {
  const c = caches();
  if (!c.owlCc) c.owlCc = mk(W, H);
  const F = Math.min(2817, Math.max(2791, FR(t)));
  if (c.owlCF !== F) {
    const g = c.owlCc.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    const P = unpack(POSES_C_KEYS, POSES_C[F], C_BASE);
    const { head, fx } = rigToPainter(P, 0.88);   // skull scale: silhouette IoU over C/D 0.782 at 1.0 -> 0.791 at 0.88
    P.head = head;
    // the dangling feet: ankles measured on 2x crops (FEET_C), toes down
    const [x0, y0, x1, y1] = interp(FEET_C.map((k) => k), F);
    P.feet = [{ x: x0, y: y0, ang: 0.15, size: 34 }, { x: x1, y: y1, ang: -0.1, size: 34 }];
    const ang = { s: "open", almond: 0.55, brow: 1 };
    fx.eyes = F >= 2816 ? { both: { s: "shut" } } : { L: ang, R: ang, lookL: [0.75, 0], lookR: [0.75, 0], catchSide: -1 };
    fx.cap = 1;   // the crown under the band is black at 112.00
    drawColourOwl(g, P, fx, INK);
    c.owlCF = F;
  }
  return c.owlCc;
}
// the standing owl of beat A, drawn with the owl painter in B&W inks, posed from measurements of the 111.00 frame
// (2x gridded crops; stage px = frame px there): eyes (995, 460) / (1097.5, 452.5), plaster (1007, 385), beak top
// (1017, 467), cups (1195, 430) near / (922, 430) far, band apex y 287; body 945–1195 x 520–800; wing-arms bent onto
// the hips (elbows out to x 865 / 1287 at y 615, hands at (945, 720) / (1160, 685)); tail to (1290, 780); feet
// standing at y ≈ 860–885. (The previous build drew a traced copy of s25's owl here; replaced by this drawing.)
const POSE_A_OWL = {
  head: { x: 1050, y: 446, r: 118, rot: -0.073, yaw: -0.1 },
  body: { x: 1072, y: 668, rx: 136, ry: 150, rot: 0, pear: 0.12 },
  wings: [
    { type: "arm", layer: "mid", S: [952, 548], E: [852, 632], T: [960, 716], th: 100, fDir: [-0.3, 1], fLen: 70, nf: 4 },
    { type: "arm", layer: "mid", S: [1150, 548], E: [1300, 616], T: [1160, 688], th: 104, fDir: [0.6, 1], fLen: 78, nf: 4 },
  ],
  tail: { x: 1175, y: 745, ang: 0.28, len: 118, spread: 0.32, n: 3 },
  feet: [{ x: 1010, y: 852, size: 54, mode: "stand", legW: 1.0 }, { x: 1180, y: 858, size: 54, mode: "stand", legW: 1.0 }],
};
const FX_A = { cap: 1, tuft: 0.45, bot: 0.98, cupS: 1.1, bandW: 1.2, eyeSp: 0.43, eyeR: 0.25, beak: [-0.22, 0.38], plaster: [-0.38, -0.5], plAng: -0.5, plS: 1.1, cupL: [-1.08, -0.2], cupR: [1.28, -0.04],
  bandY: -1.4, beakS: 1.9, grin: 1, eyes: { both: { s: "open", almond: 0.5, brow: 1 }, look: [0.15, 0.05], catchSide: -1 } };
function owlAStage() {
  const c = caches();
  if (!c.owlAS) {
    c.owlAS = mk(W, H);
    drawColourOwl(c.owlAS.getContext("2d"), JSON.parse(JSON.stringify(POSE_A_OWL)), FX_A, INK);
  }
  return c.owlAS;
}

// ================================================================ D: the colour page arrives through the shards
// D: the colour page arrives (hippie pageArrival) through a ring of shards flying apart.
//   * RING_D: the ring's own motion per source frame, measured (ORB similarity frame to frame on the ring, left and
//     right halves, chained): zoom s and translation (tx, ty) relative to 112.72 — it creeps out slowly, then
//     accelerates (1.09 by 113.28, 1.33 by 113.68).
//   * the ring = everything outside the measured colour window at 112.72 (s26/windowD.js): a black backing (the
//     untraced cells are black shards), the traced cells with their page similarities (s26/ringD.js) and the traced
//     outlines, all carried by RING_D.
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
function drawRingD(ctx, F) {
  const c = caches();
  if (!c.patBWp) { c.patBWp = ctx.createPattern(bwPlain(), "no-repeat"); c.patCol = ctx.createPattern(hippiePageCanvas(), "no-repeat"); }
  const [rs, rtx, rty] = ringAt(F);
  // the ring's black backing: everything outside the measured colour window (s26/windowD.js) is the ring — the cells
  // that were not traced are black shards in the source (max channel ≈ 1)
  if (!c.winP) {
    c.winP = new Path2D(); c.winP.rect(-3000, -3000, W + 6000, H + 6000);
    c.winP.moveTo(WINDOW_D[0], WINDOW_D[1]); for (let i = 2; i < WINDOW_D.length; i += 2) c.winP.lineTo(WINDOW_D[i], WINDOW_D[i + 1]); c.winP.closePath();
  }
  ctx.save(); ctx.setTransform(rs, 0, 0, rs, rtx, rty); ctx.fillStyle = "#020202"; ctx.fill(c.winP, "evenodd"); ctx.restore();
  drawRingCells(ctx, rs, rtx, rty);
}
// the traced ring cells (s26/ringD.js), carried by the ring's measured motion
function drawRingCells(ctx, rs, rtx, rty) {
  const c = caches();
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
    const { head, fx } = rigToPainter(P, 0.88);
    P.head = head;
    // the feet hang under the belly, apart (2x grids at 112.88 and 113.60: ankles at body + (−159, 165) / (−95, 165),
    // then + (−178, 133) / (−103, 158)); feathered legs up into the belly
    const u = Math.max(0, Math.min(1, (F - 2822) / 18)), B = P.body;
    const off = [[-159 + u * (-19), 165 - u * 32], [-95 - u * 8, 165 - u * 7]];
    P.feet = off.map(([dx, dy], i) => ({ x: B.x + dx, y: B.y + dy, size: 42, legW: 0.75, ang: i ? -0.05 : 0.1, hip: [B.x + dx * 0.55, B.y + dy * 0.45] }));
    fx.grin = 0.8;
    // winking (its left eye, the viewer's right, shut) to 113.04, half at 113.08, then open; looking to the right
    const L = { s: "open", almond: 0.6, brow: 1 };
    fx.eyes = { L, R: F <= 2826 ? { s: "shut" } : F === 2827 ? { s: "open", almond: 0.3, brow: 1 } : L, lookL: [0.8, 0], lookR: [0.8, 0], catchSide: -1 };
    drawColourOwl(g, P, fx, INK);
    c.owlDF = F;
  }
  return c.owlDc;
}

// ================================================================ E: the out-of-focus shard across the lens
// 113.68–114.12: a huge B&W shard right at the lens, far out of focus, sweeps from the lower left to the upper right.
// Per source frame (s26/slabE.js): its outline and the outlines of its lit parts, with the two measured grey levels;
// the lit parts carry soft streaks (the out-of-focus hatching of the page piece, running ~80° as in the source). Built at
// 1/4 resolution, blurred ~12 px (it is out of focus), scaled up with a soft edge.
function paintSlab(ctx, t) {
  const F = FR(t), E = SLAB_E[F];
  if (!E) return;
  const c = caches(), w = Math.round(W / 4), h = Math.round(H / 4);
  if (!c.slabA) { c.slabA = mk(w, h); c.slabB = mk(w, h); c.slabM = mk(w, h); }
  const A = c.slabA.getContext("2d"), B = c.slabB.getContext("2d"), Mk = c.slabM.getContext("2d");
  const grey = (v) => { const k = Math.round(Math.max(0, Math.min(1, v)) * 255); return `rgb(${k},${k},${k})`; };
  const path = (g, P) => { g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x / 4, y / 4) : g.moveTo(x / 4, y / 4))); g.closePath(); };
  A.setTransform(1, 0, 0, 1, 0, 0); A.clearRect(0, 0, w, h);
  path(A, E.poly); A.fillStyle = grey(E.vD); A.fill();
  // streaks: seeded soft lines at ~80°, anchored to the shard (its outline's centroid)
  let cx = 0, cy = 0; E.poly.forEach(([x, y]) => { cx += x / 4; cy += y / 4; }); cx /= E.poly.length; cy /= E.poly.length;
  for (const G of E.grey) {
    A.save(); path(A, G); A.clip();
    A.fillStyle = grey(E.vG); A.fillRect(0, 0, w, h);
    const r = rng(771), dx = Math.cos(1.4), dy = Math.sin(1.4);
    for (let i = 0; i < 150; i++) {
      const u = (r() - 0.5) * 700, L = 40 + r() * 180, v0 = (r() - 0.5) * 300, lw = 1.5 + r() * 5, lum = r() < 0.5 ? 0.5 + r() * 0.3 : 1.35 + r() * 0.4;
      const x0 = cx + u * dy + v0 * dx, y0 = cy - u * dx + v0 * dy;
      A.strokeStyle = grey(E.vG * lum); A.globalAlpha = 0.5 + r() * 0.4; A.lineWidth = lw;
      A.beginPath(); A.moveTo(x0, y0); A.lineTo(x0 + dx * L, y0 + dy * L); A.stroke();
    }
    A.globalAlpha = 1; A.restore();
  }
  B.setTransform(1, 0, 0, 1, 0, 0); B.clearRect(0, 0, w, h);
  B.filter = "blur(3px)"; B.drawImage(c.slabA, 0, 0); B.filter = "none";
  // soft-edged outline (the shard's edges are out of focus too)
  Mk.setTransform(1, 0, 0, 1, 0, 0); Mk.clearRect(0, 0, w, h);
  Mk.filter = "blur(2.5px)"; path(Mk, E.poly); Mk.fillStyle = "#fff"; Mk.fill(); Mk.filter = "none";
  B.globalCompositeOperation = "destination-in"; B.drawImage(c.slabM, 0, 0); B.globalCompositeOperation = "source-over";
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
  ctx.drawImage(c.slabB, 0, 0, w, h, 0, 0, W, H); ctx.restore();
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
// eye states per source frame (read on 2x crops): angry (heavy lids slanted to the beak, brows, looking to the
// viewer's right) to 114.56; a blink 114.60; half 114.64–114.68; open; a half-shut beat 115.96–116.04; happy closed
// 116.48–116.92; half 116.96; open
const EO = { s: "open" }, EH = { s: "open", lid: 0.5, low: 0.1 };
function eyesF(F) {
  const ang = { s: "open", almond: 0.62, brow: 1 };
  if (F <= 2864) return { L: ang, R: ang, lookL: [0.75, 0], lookR: [0.6, 0] };
  if (F === 2865) return { L: { s: "closed" }, R: { s: "shut" } };
  if (F <= 2867) return { both: EH };
  if (F <= 2898) return { both: EO, look: [0.05, 0] };
  if (F === 2899) return { L: EO, R: EH };
  if (F <= 2901) return { both: EH };
  if (F <= 2911) return { both: EO };
  if (F <= 2923) return { both: { s: "closed" } };
  if (F === 2924) return { both: EH };
  return { both: EO, look: [0, 0.05] };
}
// the colour owl (s26/owlColour.js): wings and feet from the per-frame fits (s26/posesF.js), head, face features and
// body from the cleaned per-frame measurements (s26/featF.js)
function owlF(t) {
  const c = caches();
  if (!c.owlFc) c.owlFc = mk(W, H);
  const F = Math.min(2937, Math.max(2853, FR(t)));
  if (c.owlFF !== F) {
    const g = c.owlFc.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    const P = unpack(POSES_F_KEYS, POSES_F[F], F_BASE);
    const Q = unpack(FEAT_F_KEYS, FEAT_F[F], {});
    P.head = { ...P.head, x: Q.head.x, y: Q.head.y, r: Q.head.r, rot: Q.head.rot, yaw: Q.head.yaw };
    P.body = { ...P.body, ...Q.body };
    P.feet = P.feet.map((f, i) => ({ ...f, ...Q.feet[i] }));
    // perched from 117.04: the wings fold against the body sides, the toes hook over the lid
    if (F >= 2926) {
      P.wings = P.wings.map((w, i) => ({ ...w, type: "folded", layer: "mid", ...(Q.wings?.[i]?.S?.[0] != null ? Q.wings[i] : {}) }));
      P.feet.forEach((f) => { f.mode = "perch"; f.ang = 0; });
    }
    const E = eyesF(F);
    drawColourOwl(g, P, { eyeSp: Q.eyeSp, beak: [Q.beak.x, Q.beak.y], plaster: [Q.plaster.x, Q.plaster.y], cupL: [Q.cupL.x, Q.cupL.y], cupR: [Q.cupR.x, Q.cupR.y],
      eyes: { ...E, catchSide: Q.head.yaw > 0 ? -1 : 1 } });
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
  draw(ctx, local, t0) {
    // snap to the source frame: exact at the render's k/25 times, and it pairs tools/compare.sh (whose seeks land up
    // to 1/30 s early) with the right source frame (same rule as s25)
    const t = Math.ceil(t0 * 25 - 0.001) / 25;
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
