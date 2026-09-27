// s26 (110.52–117.52) — the shattered page blows out into colour and the finished colour site is revealed.
// Beats (film time, measured on the source frame by frame; see fidelity/s26.md for the numbers):
//   A 110.52–111.52  the framed page on the lit screen, un-squashed after s25's 108.08 squash: the crack web
//                    (connected polylines, s26/cracksA2.js) with long spokes from the two impact stars, a pair of
//                    scissors stuck in each, the colour banner in the header, and s25's own standing owl drawing (wings
//                    on its hips), so the same owl is on both sides of the cut. Camera: the ORB zoom s 1.0029 → 1.0
//                    about (1150, 950).
//   B 111.56         one jolt frame: the page thrown up and shrunk (x' = 0.9911x − 8.5, y' = 0.9905y − 19.6), no glow.
//   C 111.60–112.68  the blast: a field of straight-edged, outlined glass shards (s26/fieldC2.js: the measured shard
//                    edges extended to meet, each shard a tone-matched piece of our B&W page, colour strip or colour
//                    page) under the field's measured per-frame affine; the colour page shows through the blast hole
//                    with the blast's white streaks; the frame's own speed lines; the two scissors flung to the top
//                    corners (finger loops tracked per frame); the white owl throws its wings open (the shared B&W owl
//                    kit, s26/owlCD.js, posed per source frame); 111.80 is a double-exposed shake frame; eyes squeezed
//                    shut 112.64–112.68.
//   D 112.72–113.68  cut: the colour page arrives (hippie pageArrival) through a ring of outlined B&W glass shards
//                    (s26/ringD2.js) moving with the ring's measured zoom; the white owl hovers over the designer,
//                    head turned to the viewer's right, winking to 113.04; a dark motion ghost of it in the upper right.
//   E 113.68–114.12  a huge out-of-focus shard sweeps across the lens from lower left to upper right (outline and
//                    tones measured per frame); behind it the owl turns into the colour owl (first seen 114.08).
//   F 114.08–117.52  the colour owl (s26/owlColour.js; wings from the per-frame fits, head / body / feet refitted,
//                    face features measured per frame) flies up to the top-right box by the nav and perches from
//                    117.04; the page camera settles at 114.9.
import { drawFramedPage, sokoPageCanvas, HEADER, releaseSoko } from "../lib/sites.js";
import { hippieBannerCanvas, hippiePageCanvas, pageArrival, releaseHippie } from "../lib/hippie.js";
import { rng } from "../lib/rng.js";
import { STARS_A } from "./s26/cracksA.js";
import { unpack } from "./s26/rig.js";
import { FIELD_CAM } from "./s26/fieldCam.js";
import { FIELD_C2, STREAKS_C } from "./s26/fieldC2.js";
import { POSES_F, POSES_F_KEYS } from "./s26/posesF.js";
import { FEAT_F, FEAT_F_KEYS } from "./s26/featF.js";
import { drawColourOwl } from "./s26/owlColour.js";
import { drawOwlCD, cdPose } from "./s26/owlCD.js";
import { SC_KEYS, SPEED } from "./s26/fx.js";
import { RING_D2 } from "./s26/ringD2.js";
import { RING_CLEAR } from "./s26/ringClear.js";
import { SLAB_E } from "./s26/slabE.js";
import { drawScissors as drawScissorsF } from "./s26/scissorsFlung.js";
import { CRACK_WEB } from "./s26/cracksA2.js";
// beat A's owl is s25's standing drawing (read-only imports from s25's own modules), so the same drawing is on both
// sides of the 110.52 cut (the source only un-squashes the frame there)
import { paintDrawing, blitLayer } from "./s25/v2/draw.js";
import { DRAW } from "./s25/v2/drawings.js";
import { SCHED, SCHED_F0 } from "./s25/v2/sched.js";
import { HEAD, HEAD_F0 } from "./s25/v2/headtrack.js";
import { face, headphonesBack, headphonesFront, headOutline } from "./s25/v2/head.js";
import { D_HEAD } from "./s25/v2/data/head.js";
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
// crack web (s26/cracksA2.js): connected polylines. Source cross-profile (median over 990 samples, graded): peak
// ≈ 190–205 on ≈ 20, FWHM ≈ 3.3 px — a bright core with a soft shoulder
function crackWebPath() {
  const c = caches();
  if (!c.webP) {
    c.webP = new Path2D();
    for (const p of CRACK_WEB) { c.webP.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.webP.lineTo(p[i], p[i + 1]); }
  }
  return c.webP;
}
function drawCracksA(g) {
  g.save();
  g.lineCap = "round"; g.lineJoin = "round";
  const P = crackWebPath();
  for (const [w, col] of [[5.2, "rgba(210,210,208,0.28)"], [3.0, "rgb(242,242,240)"]]) { g.strokeStyle = col; g.lineWidth = w; g.stroke(P); }
  // the spokes: wide white wedges leaving each star, tapering to a crack (18 per star, measured on the median A frame:
  // direction, reach and width at 72 px from the star centre)
  g.fillStyle = "rgb(244,244,242)";
  STAR_C.forEach(([cx, cy], k) => {
    for (const [deg, L, w] of SPOKES[k]) {
      const a = (deg * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
      const q = (r, hw, s) => [cx + ux * r + nx * hw * s, cy + uy * r + ny * hw * s];
      const pts = [q(24, w * 0.75, 1), q(72, w * 0.5, 1), q(72 + (L - 72) * 0.45, Math.max(1.6, w * 0.22), 1), q(L, 0.9, 1), q(L, 0.9, -1), q(72 + (L - 72) * 0.45, Math.max(1.6, w * 0.22), -1), q(72, w * 0.5, -1), q(24, w * 0.75, -1)];
      g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
    }
  });
  g.restore();
}
const STAR_C = [[645, 391], [1522, 364]];
// [angle (deg, y down), reach (px from the star centre), width at 72 px]
const SPOKES = [
  [[82, 284, 5], [96, 92, 5], [105, 84, 7], [132, 224, 6], [151, 300, 11], [163, 92, 6], [173, 68, 4], [191, 160, 5], [214, 212, 7], [226, 128, 7], [239, 300, 11], [248, 192, 6], [260, 264, 5], [288, 216, 7], [307, 212, 10], [321, 132, 9], [349, 284, 8], [359, 244, 8]],
  [[16, 412, 10], [31, 200, 6], [59, 264, 6], [68, 328, 8], [78, 184, 9], [98, 352, 6], [119, 120, 10], [170, 248, 6], [194, 124, 6], [206, 184, 8], [216, 204, 5], [235, 272, 9], [246, 120, 5], [280, 108, 4], [292, 252, 10], [300, 216, 11], [338, 96, 6], [358, 236, 6]],
];
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
    // (the source bursts are ≈ 1.3x the traced outline with a heavy jagged black border)
    g.save();
    path(1.7, 0.25); g.fillStyle = "rgba(6,6,6,0.95)"; g.fill();
    path(1.3, 0); g.fillStyle = "rgb(244,244,242)"; g.fill();
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
  // (the owl sits under the screen glow here: drawing it after the glow, as s25 does, matched s25's last frame better
  // (owl box σ8 9.4 -> 8.0) but the source worse (7.8 -> 8.2); the drawing is the same on both sides either way)
  g.drawImage(owlAStage(), 0, 0);
}
function stageA(glow) {
  const c = caches(), k = glow ? "frameA" : "jolt";
  if (!c[k]) {
    c[k] = mk(W, H); const g = c[k].getContext("2d");
    drawFramedPage(g, pageWithBanner(), { glow, over: paintA });
    // the source's B&W page carries a faint green cast (graded BGR ≈ 71, 76, 71 against our neutral 72) that the
    // colour strip does not: R, B × 0.97 and G + 3 outside the strip (frame y 186–360)
    g.save(); g.beginPath(); g.rect(0, 0, W, 186); g.rect(0, 361, W, H - 361); g.clip();
    g.globalCompositeOperation = "multiply"; g.fillStyle = "rgb(247,255,247)"; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = "lighter"; g.fillStyle = "rgb(0,3,0)"; g.fillRect(0, 0, W, H);
    g.restore();
  }
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
// (fix #1: the flung pairs' rings are thinner chrome loops (t 0.05) whose holes show the background dimmed, with a
// slotted pivot screw, as in the source; the stuck pairs of A keep the heavier loops they were measured with)
function flungPair(ctx, piv, ang, L, lo, up, alpha, flung = false) {
  const h = [-Math.cos(ang), -Math.sin(ang)], e2 = [-h[1], h[0]];
  const ring = (p) => { const d = [p[0] - piv[0], p[1] - piv[1]]; return { u: (d[0] * h[0] + d[1] * h[1]) / L, v: (d[0] * e2[0] + d[1] * e2[1]) / L, rx: flung ? 0.15 : 0.16, ry: flung ? 0.21 : 0.22, rot: 0.1, t: flung ? 0.05 : 0.075, hole: flung ? "rgba(0,0,0,0.32)" : null }; };
  ctx.save(); ctx.globalAlpha = alpha;
  drawScissorsF(ctx, { x: piv[0], y: piv[1], ang, L: L * 0.95, open: 0.03, bw: 0.1, rings: [ring(up), ring(lo)], slot: flung });
  ctx.restore();
}
function scAt(F) {
  const i = Math.max(0, Math.min(SC_KEYS.length - 1, F - SC_KEYS[0][0]));
  return SC_KEYS[i];
}
function flungScissors(ctx, t) {
  const F = FR(t);
  if (F > SC_KEYS[SC_KEYS.length - 1][0]) return;
  // (the source trails each pair with faint echoes of its rings and a grey smoke of curls; two echoes here)
  for (const [k, alpha] of [[4, 0.1], [2, 0.2], [0, 1]]) {
    const r = scAt(F - k);
    flungPair(ctx, [r[1], r[2]], r[3], r[4], [r[9], r[10]], [r[11], r[12]], alpha, true);
    flungPair(ctx, [r[5], r[6]], r[7], r[8], [r[13], r[14]], [r[15], r[16]], alpha, true);
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
function bwPlain() {
  const c = caches();
  if (!c.bwPlain) { c.bwPlain = mk(W, H); drawFramedPage(c.bwPlain.getContext("2d"), pageWithBanner(), { glow: 1.4 }); }
  return c.bwPlain;
}
// the shard field (s26/fieldC2.js): straight-edged shards, each holding a piece of our B&W page, colour page or black,
// every shard outlined (a bright ≈2.4 px core with a soft halo, as the source's glass edges); the blast hole between them
// shows the colour page, which stays put behind the field. The whole field moves under its measured per-frame affine.
function fieldPaths() {
  const c = caches();
  if (c.fieldP) return c.fieldP;
  const cells = FIELD_C2.map((r) => {
    const p = new Path2D(); p.moveTo(r[7], r[8]); for (let i = 9; i < r.length; i += 2) p.lineTo(r[i], r[i + 1]); p.closePath();
    let cx = 0, cy = 0; for (let i = 7; i < r.length; i += 2) { cx += r[i]; cy += r[i + 1]; }
    const n = (r.length - 7) / 2;
    return { t: r[0], p, cx: cx / n, cy: cy / n, M: r[0] === 2 ? null : new DOMMatrix([r[1], r[4], r[2], r[5], r[3], r[6]]) };
  });
  const edges = new Path2D(), bw = new Path2D();
  for (const q of cells) { edges.addPath(q.p); if (q.t === 0) bw.addPath(q.p); }
  c.fieldP = { cells, edges, bw };
  return c.fieldP;
}
const mat = (m) => new DOMMatrix([m[0], m[3], m[1], m[4], m[2], m[5]]);
function drawFieldC(ctx, F) {
  const c = caches(), P = fieldPaths(), cam = FIELD_CAM.cam[Math.min(2817, Math.max(2790, F))];
  if (!c.patBWp) { c.patBWp = ctx.createPattern(bwPlain(), "no-repeat"); c.patCol = ctx.createPattern(hippiePageCanvas(), "no-repeat"); }
  ctx.save();
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  // the colour page stays put behind the field (the blast hole shows it)
  ctx.setTransform(mat(FIELD_CAM.Mc)); ctx.drawImage(hippiePageCanvas(), 0, 0);
  ctx.setTransform(mat(cam));
  for (const q of P.cells) {
    if (q.t === 2) ctx.fillStyle = "#050505";
    else { const pat = q.t === 0 ? c.patBWp : c.patCol; pat.setTransform(q.M); ctx.fillStyle = pat; }
    ctx.fill(q.p);
  }
  // the source's B&W shards are darker than our lit page (lower half mean V 68–80 vs 83–93 at 112.00)
  ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.fill(P.bw);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(210,210,208,0.35)"; ctx.lineWidth = 4.2; ctx.stroke(P.edges);
  ctx.strokeStyle = "rgb(232,232,230)"; ctx.lineWidth = 2.4; ctx.stroke(P.edges);
  // the blast's white streaks over the hole: thin wedges, fine toward the blast centre, ≈4 px at the outer end
  if (!c.streakP) {
    c.streakP = new Path2D();
    for (let i = 0; i < STREAKS_C.length; i += 4) {
      const [x0, y0, x1, y1] = STREAKS_C.slice(i, i + 4), L = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / L, ny = (x1 - x0) / L;
      c.streakP.moveTo(x0 + nx * 0.6, y0 + ny * 0.6); c.streakP.lineTo(x1 + nx * 2.1, y1 + ny * 2.1);
      c.streakP.lineTo(x1 - nx * 2.1, y1 - ny * 2.1); c.streakP.lineTo(x0 - nx * 0.6, y0 - ny * 0.6); c.streakP.closePath();
    }
  }
  ctx.fillStyle = "rgb(236,236,234)"; ctx.fill(c.streakP);
  ctx.restore();
}
function paintCBack(ctx, t) {
  drawFieldC(ctx, FR(t));
  speedLinesF(ctx, FR(t));
  flungScissors(ctx, t);
}
function paintC(ctx, t) {
  const shake = FR(t) === FR(111.8);
  if (shake) {
    // 111.80: a shake frame. Fix #2 (measured on a 2x grid of the source): the ghost of the page (the headline's "Mix"
    // at ≈ (700–845, 60–140) against the real one at (740–880, 190–280), "own" likewise) shows only inside some of the
    // shards, thrown ≈ (−35, −130); the whole frame is smeared horizontally (letter edges doubled ≈ 15 px apart)
    const c = caches();
    if (!c.tmp) { c.tmp = mk(W, H); c.tmp2 = mk(W, H); }
    const g = c.tmp.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    paintCBack(g, t);
    const P = fieldPaths(), cam = FIELD_CAM.cam[Math.min(2817, Math.max(2790, FR(t)))], r = rng(2795);
    const g2 = c.tmp2.getContext("2d");
    g2.setTransform(1, 0, 0, 1, 0, 0); g2.drawImage(c.tmp, 0, 0);
    g2.save(); g2.setTransform(mat(cam));
    const clip = new Path2D();
    for (const q of P.cells) if (r() < 0.3 && q.cy < 560) clip.addPath(q.p);
    g2.clip(clip); g2.setTransform(1, 0, 0, 1, 0, 0); g2.globalAlpha = 0.8; g2.drawImage(c.tmp, -35, -130);
    g2.restore();
    // horizontal smear: faint copies ±10 px either side
    ctx.drawImage(c.tmp2, 0, 0);
    for (const dx of [-10, 10]) { ctx.save(); ctx.globalAlpha = 0.25; ctx.drawImage(c.tmp2, dx, 0); ctx.restore(); }
  } else paintCBack(ctx, t);
  // the owl: the rig, posed per source frame (fits in s26/posesC.js); 111.60 still the standing drawing
  if (t < 111.62) {
    ctx.save(); ctx.translate(0, -25); ctx.drawImage(owlAStage(), 0, 0); ctx.restore();
  } else {
    const O = owlCD(t);
    // (the shake frame smears the owl too: faint copies ±12 / ±24 px either side)
    if (shake) for (const dx of [-24, -12, 12, 24]) { ctx.save(); ctx.globalAlpha = 0.15; ctx.drawImage(O, dx, 0); ctx.restore(); }
    ctx.drawImage(O, 0, 0);
  }
}
// The white owl of the blast (C) and the hover (D): the shared B&W owl kit (s26/owlCD.js) — engraved-white plumage,
// layered wing feathers, merged head + body, scowl / sly / shut eyes, hooked beak, black cups on a slim band, talons —
// posed per source frame (head on the tracked eyes, body + wings refitted to the source silhouette: s26/owlCDfit.js).
// Eyes per source frame (2x crops): C angry, looking to the viewer's right; squeezed shut under furrowed brows at
// 112.64–112.68. D: winking (its left eye = the viewer's right squeezed shut) to 113.04, half open 113.08, then both
// open, sly.
const SQUEEZE = { state: "scowl", top: 0.07, bot: 0.05, iris: 0.001, tilt: 0.4, brow: 1.45, browSlant: 0.95 };
function eyesCD(F) {
  if (F <= 2815) return { state: "scowl", look: [0.75, 0], over: { lookX: 0, lookGain: 1.2 } };
  if (F <= 2817) return { state: "scowl", over: SQUEEZE };
  const sly = { state: "sly", look: [0.35, 0], over: { lookX: 0, iris: 0.58, brow: 1.1, browSlant: 0.7 } };
  if (F <= 2826) return { ...sly, right: SQUEEZE };
  if (F === 2827) return { ...sly, right: { top: 0.22, bot: 0.2 } };
  return sly;
}
function owlCD(t) {
  const c = caches();
  if (!c.owlCDc) { c.owlCDc = mk(W, H); c.owlCDl = mk(8, 8); }
  const F = Math.min(2847, Math.max(2791, FR(t)));
  if (c.owlCDF !== F) {
    const g = c.owlCDc.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    drawOwlCD(g, F, { eyes: eyesCD(F), canvas: c.owlCDl });
    c.owlCDF = F;
  }
  return c.owlCDc;
}
// The standing owl of beat A is s25's own drawing of this pose (s25/v2: the "hips2" body drawing and the head layer
// with sly eyes), placed with s25's measured affines of its last frame (110.48, F2762) in stage px. s25 then squashes
// its whole frame by 0.9836; the source un-squashes at the cut and the owl holds (its head and body move with the
// page to < 2 px through A), so drawing it here un-squashed gives the identical owl on both sides of the cut.
const A_F = 2762;
function owlAStage() {
  const c = caches();
  if (!c.owlAS) {
    c.owlAS = mk(W, H);
    const g = c.owlAS.getContext("2d");
    const row = SCHED[Math.min(SCHED.length - 1, A_F - SCHED_F0)];
    blitLayer(g, paintDrawing(DRAW[row[0]]), row.slice(1));
    const HL = paintDrawing(D_HEAD, { bb: [900, 250, 1285, 560], pre: headphonesBack, post: (q) => { headOutline(q, D_HEAD.hull); face(q, "sly"); headphonesFront(q); }, fade: [522, 552] });
    blitLayer(g, HL, HEAD[Math.min(HEAD.length - 1, A_F - HEAD_F0)]);
  }
  return c.owlAS;
}

// ================================================================ D: the colour page arrives through the shards
// D: the colour page arrives (hippie pageArrival) through a ring of shards flying apart.
//   * RING_D: the ring's own motion per source frame, measured (ORB similarity frame to frame on the ring, left and
//     right halves, chained): zoom s and translation (tx, ty) relative to 112.72 — it creeps out slowly, then
//     accelerates (1.09 by 113.28, 1.33 by 113.68).
//   * the ring = straight-edged shards over everything outside the measured colour window (s26/ringD2.js).
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
function ringAt(F) {
  if (F <= 2842) return interp(RING_D, F);
  // (review #1 suggested driving the right half by rows 2843–2851; tried in fix #1: those rows hold the right half
  // far too long — 113.80: σ8 ΔE 13.3 -> 13.8, 113.96: 11.6 -> 14.8 — so the measured-then-accelerating fling stays)
  let [s0] = interp(RING_D, 2842), s = s0;
  for (let f = 2843; f <= F; f++) s *= 1.04 + 0.01 * (f - 2842);
  return [s, 1091 * (1 - s), 424 * (1 - s)];
}
// the ring (s26/ringD2.js): straight-edged shards covering everything outside the measured colour window, each a piece
// of our B&W page, of the colour page, black, or clear glass (the arriving page shows through), every shard outlined;
// carried by the ring's measured motion
// fix #2: RING_CLEAR (s26/ringClear.js) marks the shards that stop covering the arriving page, fitted per shard against
// the source: from 112.72 = clear glass (outline + a faint dark tint); later = flung outward and faded over 3 frames.
const RING_TINT = 0.12;
function ringPaths() {
  const c = caches();
  if (c.ringP) return c.ringP;
  const L = [], R = [];
  RING_D2.forEach((r, k) => {
    const p = new Path2D(); p.moveTo(r[7], r[8]); let cx = 0, cy = 0, n = 0;
    for (let i = 9; i < r.length; i += 2) p.lineTo(r[i], r[i + 1]);
    for (let i = 7; i < r.length; i += 2) { cx += r[i]; cy += r[i + 1]; n++; }
    p.closePath();
    const Fc = RING_CLEAR[k] ?? 0, glass = Fc === 2818;
    (cx / n > 1091 ? R : L).push({ k, t: glass ? 3 : r[0], tint: glass, fling: Fc > 2818 ? Fc : 0, cx: cx / n, cy: cy / n, p,
      M: r[0] >= 2 ? null : new DOMMatrix([r[1], r[4], r[2], r[5], r[3], r[6]]) });
  });
  const edges = (A) => { const e = new Path2D(); for (const q of A) e.addPath(q.p); return e; };
  const still = (A) => A.filter((q) => !q.fling);
  c.ringP = { L, R, eL: edges(still(L)), eR: edges(still(R)), bL: edges(still(L).filter((q) => q.t === 0)), bR: edges(still(R).filter((q) => q.t === 0)),
    tL: edges(L.filter((q) => q.tint)), tR: edges(R.filter((q) => q.tint)) };
  return c.ringP;
}
function ringCell(ctx, c, q) {
  if (q.t === 3) return;                           // clear glass: the arriving page shows through, outline only
  if (q.t === 2) ctx.fillStyle = "#050505";
  else { const pat = q.t === 0 ? c.patBWp : c.patCol; pat.setTransform(q.M); ctx.fillStyle = pat; }
  ctx.fill(q.p);
  if (q.t === 0 && q.fling) { ctx.fillStyle = "rgba(0,0,0,0.13)"; ctx.fill(q.p); }
}
function ringEdges(ctx, e, rs) {
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(210,210,208,0.35)"; ctx.lineWidth = 4.2 / rs; ctx.stroke(e);
  ctx.strokeStyle = "rgb(234,234,232)"; ctx.lineWidth = 2.2 / rs; ctx.stroke(e);
}
function drawRingD(ctx, F) {
  const c = caches(), P = ringPaths();
  if (!c.patBWp) { c.patBWp = ctx.createPattern(bwPlain(), "no-repeat"); c.patCol = ctx.createPattern(hippiePageCanvas(), "no-repeat"); }
  const [rs, rtx, rty] = ringAt(F);
  for (const [cells, edges, right] of [[P.L, P.eL, false], [P.R, P.eR, true]]) {
    ctx.save(); ctx.setTransform(rs, 0, 0, rs, rtx, rty);
    for (const q of cells) if (!q.fling) ringCell(ctx, c, q);
    ctx.fillStyle = `rgba(0,0,0,${RING_TINT})`; ctx.fill(right ? P.tR : P.tL);
    // the source's B&W shards are a little darker than our lit page (ring mean V 75 vs 85 at 112.72)
    ctx.fillStyle = "rgba(0,0,0,0.13)"; ctx.fill(right ? P.bR : P.bL);
    ringEdges(ctx, edges, rs);
    ctx.restore();
    // flung shards: pushed outward from the ring's centre (1091, 424) and faded over the 3 frames up to their fitted frame
    for (const q of cells) {
      if (!q.fling || F > q.fling) continue;
      const u = Math.max(0, F - (q.fling - 3)), a = Math.min(1, (q.fling + 1 - F) / 3);
      const fx = q.cx * rs + rtx - 1091, fy = q.cy * rs + rty - 424, fl = Math.hypot(fx, fy) || 1, d = 14 * u * u;
      ctx.save(); ctx.globalAlpha = a; ctx.setTransform(rs, 0, 0, rs, rtx + (fx / fl) * d, rty + (fy / fl) * d);
      ringCell(ctx, c, q); ringEdges(ctx, q.p, rs);
      ctx.restore();
    }
  }
}
// the dark motion ghost of the owl in the upper right (113.08–113.88): a smoky, darkened, soft copy of the owl, its
// head measured on 2x grids at ≈ (1510, 230) at 113.08 drifting to ≈ (1805, 265) by 113.72; drawn at half resolution
const GHOST = [[2827, 1510, 230], [2835, 1650, 245], [2843, 1805, 265], [2847, 1880, 275]];
function owlGhost(ctx, t) {
  const F = FR(t);
  if (F < 2827 || F > 2847) return;
  const c = caches(), w = W >> 1, h = H >> 1;
  if (!c.ghost) c.ghost = mk(w, h);
  const g = c.ghost.getContext("2d"), hd = cdPose(F).head, [gx, gy] = interp(GHOST.map((r) => r), F), k = 0.85;
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, h); g.globalCompositeOperation = "source-over";
  g.filter = "blur(3px)";
  g.setTransform(k / 2, 0, 0, k / 2, (gx - hd.x * k) / 2, (gy - hd.y * k) / 2); g.drawImage(owlCD(t), 0, 0);
  g.filter = "none"; g.setTransform(1, 0, 0, 1, 0, 0);
  // (a translucent grey version read closer by eye but scored worse at σ8 — 113.64: 12.5 -> 13.0 — so it stays dark)
  g.globalCompositeOperation = "source-in"; g.fillStyle = "rgb(38,38,40)"; g.fillRect(0, 0, w, h); g.globalCompositeOperation = "source-over";
  const fade = Math.min(1, (F - 2826) / 3, (2848 - F) / 3);
  ctx.save(); ctx.globalAlpha = 0.38 * fade; ctx.imageSmoothingEnabled = true; ctx.drawImage(c.ghost, 0, 0, w, h, 0, 0, W, H); ctx.restore();
}
function paintD(ctx, t) {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const A = pageArrival(Math.max(112.7, t));
  drawColourPage(ctx, A.s, A.tx, A.ty);
  drawRingD(ctx, FR(t));
  owlGhost(ctx, t);
  flungScissors(ctx, t);
  ctx.drawImage(owlCD(t), 0, 0);
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
  // (fix #1: a faint green cast (G +4 %) and a floor under the dark base so the notches are never pitch black. Lifting
  // the whole slab toward the source's zone means (graded 50–66 against our 25–57) was tried and scored worse at σ8
  // (E 11.5 -> 12.0): our lit parts do not sit where the source's do, so the lift adds error in its dark parts)
  const grey = (v) => { const k = Math.max(0, Math.min(1, v)) * 255; return `rgb(${Math.round(k * 0.98)},${Math.round(Math.min(255, k * 1.04))},${Math.round(k)})`; };
  const path = (g, P) => { g.beginPath(); P.forEach(([x, y], i) => (i ? g.lineTo(x / 4, y / 4) : g.moveTo(x / 4, y / 4))); g.closePath(); };
  A.setTransform(1, 0, 0, 1, 0, 0); A.clearRect(0, 0, w, h);
  path(A, E.poly); A.fillStyle = grey(Math.max(E.vD, 0.04)); A.fill();
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
  B.filter = "blur(3.5px)"; B.drawImage(c.slabA, 0, 0); B.filter = "none";
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
// viewer's right) to 114.56; an angry blink 114.60; half 114.64–114.68; open; a half-shut beat 115.96–116.04; happy
// closed 116.52–116.92; half 116.96; open
const EO = { s: "open" }, EH = { s: "open", lid: 0.5, low: 0.1 };
function eyesF(F) {
  const ang = { s: "open", almond: 0.62, brow: 1 };
  if (F <= 2864) return { L: ang, R: ang, lookL: [0.75, 0], lookR: [0.6, 0] };
  if (F === 2865) return { both: { s: "shut", brow: 1 } };   // an angry blink: both squeezed shut under the brows
  if (F <= 2867) return { both: EH };
  if (F <= 2898) return { both: EO, look: [0.05, 0] };
  if (F === 2899) return { L: EO, R: EH };
  if (F <= 2901) return { both: EH };
  if (F <= 2912) return { both: EO };                          // (116.48 is still open; happy-closed from 116.52)
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
      // the lid's front edge is at y ≈ 232 (117.04–117.52): three toes per foot hook over it
      P.feet.forEach((f) => { f.mode = "perch"; f.ang = 0; f.size = Math.max(f.size, 30); f.lid = 232 - f.y; });
    }
    const E = eyesF(F);
    // the band: thick, padded, hugging the crown; the cups smaller than the measured blob extents suggested (review #1)
    drawColourOwl(g, P, { eyeSp: Q.eyeSp, beak: [Q.beak.x, Q.beak.y], plaster: [Q.plaster.x, Q.plaster.y], cupL: [Q.cupL.x, Q.cupL.y], cupR: [Q.cupR.x, Q.cupR.y],
      bandW: 2.4, bandY: -1.08, cupS: 0.8,
      eyes: { ...E, catchSide: Q.head.yaw > 0 ? -1 : 1 } });
    c.owlFF = F;
  }
  return c.owlFc;
}
// the fine white glitter the owl sheds as it climbs (115.28–115.96): each source frame from 115.28 to 115.72 drops a
// seeded puff of 1–2 px specks round the owl's lower body (FEAT_F), which stay where they fell, sink a little and fade
// over 6 frames — so they trail below and behind the owl
function drawGlitter(ctx, F) {
  ctx.save(); ctx.fillStyle = "#fffaf0";
  for (let e = Math.max(2882, F - 6); e <= Math.min(2893, F); e++) {
    const Q = unpack(FEAT_F_KEYS, FEAT_F[e], {}), B = Q.body, age = F - e, r = rng(9000 + e);
    ctx.globalAlpha = 0.75 * (1 - age / 7);
    for (let i = 0; i < 40; i++) {
      const u = r(), v = r(), x = B.x + (u * 2.6 - 2.2) * B.rx, y = B.y + (-0.2 + v * 2.2) * B.ry + age * 1.5, sz = 1 + r() * 1.2;
      ctx.fillRect(x, y, sz, sz);
    }
  }
  ctx.restore();
}
function paintF(ctx, t) {
  const A = pageArrival(t);
  drawColourPage(ctx, A.s, A.tx, A.ty);
  if (t < 114.2) drawRingD(ctx, FR(t));
  drawGlitter(ctx, FR(t));
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
