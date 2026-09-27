// s02 (6.04–19.12), hand-drawn rebuild: compositing and timing. See src/shots/s02.js for the beat list.
import { W, H } from "../../../config.js";
import { CAM, CAM_F0, ROOMB, ROOMB0, DESB, DESB0, OWLB, OWLB0 } from "./tracks.js";
import { buildDesigner, DY, EYES, paintIris, paintSnapIris, DROPS, paintDrop } from "./designer.js";
import { worldCanvas, WORLD, STARE_BOX, HOLD_WORLD, BOX_OFF, flightBackCanvas } from "./room.js";
import { owlLayerAt, releaseOwl, WT } from "./owl.js";

const frameOf = (t) => Math.floor(t * 25 + 0.5);
// the source repeats a frame during the take-off and the return pan: everything holds on these
const REPEAT = new Set([402, 427, 452, 477]);
export function camAt(f) {
  if (f < CAM_F0) return [0, 0];
  const i = Math.min(CAM.length / 2 - 1, f - CAM_F0);
  return [CAM[2 * i], CAM[2 * i + 1]];
}
// direction of camera travel (unit) from the last real step
function panDir(f) {
  for (let k = f + 1; k > f - 4; k--) {
    const a = camAt(k - 1), b = camAt(k), d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d > 0.8) return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
  }
  return [0, 0];
}
const rowAt = (T, f0, f) => { const k = f - f0; return k >= 0 && k < T.length / 2 ? [T[2 * k], T[2 * k + 1]] : [0, 0]; };

let L = null;
function layers() {
  if (L) return L;
  L = { des: buildDesigner(), room: worldCanvas(STARE_BOX, 1), hold: worldCanvas(HOLD_WORLD, 1), mid: worldCanvas(WORLD, 0.5), fb: flightBackCanvas(), S: null, S2: null };
  return L;
}
const onScreen = (x0, y0, w, h) => x0 < W && y0 < H && x0 + w > 0 && y0 + h > 0;

// paint one layer through a smear (L px along dir) and a gaussian (sg px); straight in when both are ~0
function layer(ctx, Lb, sg, dir, paint) {
  if (Lb < 1 && sg < 0.3) { paint(ctx, 0, 0); return; }
  const m = Math.ceil(Lb / 2 + 3 * sg) + 4;
  if (!L.S) { L.S = document.createElement("canvas"); L.S2 = document.createElement("canvas"); }
  const S = L.S, S2 = L.S2;
  for (const c of [S, S2]) if (c.width !== W + 2 * m || c.height !== H + 2 * m) { c.width = W + 2 * m; c.height = H + 2 * m; }
  const g = S.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; g.filter = "none";
  g.clearRect(0, 0, S.width, S.height);
  paint(g, m, m);
  let src = S;
  if (Lb >= 1) {
    const N = Math.min(13, 2 + Math.round(Lb / 2.2));
    const g2 = S2.getContext("2d");
    g2.setTransform(1, 0, 0, 1, 0, 0); g2.filter = "none"; g2.globalAlpha = 1; g2.globalCompositeOperation = "source-over";
    g2.clearRect(0, 0, S2.width, S2.height);
    g2.globalCompositeOperation = "lighter"; g2.globalAlpha = 1 / N;
    for (let k = 0; k < N; k++) { const u = (k / (N - 1) - 0.5) * Lb; g2.drawImage(S, dir[0] * u, dir[1] * u); }
    g2.globalCompositeOperation = "source-over"; g2.globalAlpha = 1;
    src = S2;
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (sg >= 0.3) ctx.filter = `blur(${sg.toFixed(2)}px)`;
  ctx.drawImage(src, -m, -m);
  ctx.restore();
}

function paintRoom(g, ox, oy, f = 0) {
  const M = L.mid, R = L.room, Hd = L.hold;
  const sharpStare = onScreen(R.x0 + ox, R.y0 + oy, R.c.width, R.c.height), sharpHold = onScreen(Hd.x0 + ox, Hd.y0 + oy, Hd.c.width, Hd.c.height);
  // the half-resolution world wherever a sharp view does not cover the frame
  const covered = (sharpStare && R.x0 + ox <= 0 && R.y0 + oy <= 0 && R.x0 + ox + R.c.width >= W && R.y0 + oy + R.c.height >= H) ||
    (sharpHold && Hd.x0 + ox <= 0 && Hd.y0 + oy <= 0 && Hd.x0 + ox + Hd.c.width >= W && Hd.y0 + oy + Hd.c.height >= H);
  if (!covered) g.drawImage(M.c, M.x0 + ox, M.y0 + oy, M.w, M.h);
  if (sharpStare) g.drawImage(R.c, R.x0 + ox, R.y0 + oy);
  if (sharpHold) g.drawImage(Hd.c, Hd.x0 + ox, Hd.y0 + oy);
  // the dim boxes behind the flight (fix pass 2), faded in over 405-412 and out over 446-452
  const fk = Math.max(0, Math.min(1, (f - 404) / 8, (452 - f) / 6));
  if (fk > 0) { g.globalAlpha = fk; g.drawImage(L.fb.c, L.fb.x0 + ox, L.fb.y0 + oy); g.globalAlpha = 1; }
}
// the scan: iris x offset per frame (template track of both irises, snapshots/s02-r3-meas; y offset 0-2 px), the snap
// 218 (-8), 219 an in-between (+16, smeared), the look from 220
const SCAN0 = 175;
const SCAN = [0, -1.8, -5.5, -10, -10, -15, -19.4, -21.2, -21, -21, -19.6, -15.8, -10.4, -1.4, 4.9, 5.1, 5.1, 4.9, 3.9, 0, -5.1, -12.5, -18.5, -20.6, -20.4, -20.3, -19.7, -15.8, -10.2, -10.2, -1.5, 2.4, 2.2, 2.2, 0.3, -4.2, -7.9, -12.7, -19.2, -21, -21, -20.8, -20.8, -8.8];
const SCANY = (dx) => Math.max(0, -dx) / 21 * 1.5;
const slideA = (t) => 28 * (1 - Math.pow(1 - Math.min(1, Math.max(0, (t - 6.04) / 2.16)), 1.6));
const slideB = (t) => 13 * Math.min(1, Math.max(0, (t - 6.04) / 1.21));
function paintDesigner(g, f, ox, oy) {
  // the stare, the look (from the snap), and the pans' softer redrawing (outbound from 12.16 s, back from 18.08 s)
  const look = f >= 220, soft = (f >= 304 && f < 400) || f >= 452, D = soft ? L.des.soft : look ? L.des.look : L.des.stare;
  if (!onScreen(ox, oy - DY, D.width, D.height)) return;
  // the return pan's soft face is a touch darker than the source's after the tone fit (designer mean 5-7 levels low at
  // 454-462, fix pass 1): lift it slightly
  const lift = __lab.desLift ?? (f >= 446 && f <= 468 ? 1 + 0.05 * Math.min(1, (468 - f) / 4) : 1);
  if (lift !== 1) g.filter = `brightness(${lift})`;
  g.drawImage(D, ox, oy - DY);
  g.filter = "none";
  g.save(); g.translate(ox, oy); g.lineCap = "round"; g.lineJoin = "round";
  if (!look) {
    const k = f - SCAN0, dx = f === 219 ? 16 : k >= 0 && k < SCAN.length ? SCAN[k] : 0;
    if (f === 219) EYES.forEach((E, i) => paintSnapIris(g, E, dx, i));
    else EYES.forEach((E, i) => paintIris(g, E, dx, SCANY(dx), i));
  }
  const t = f / 25, sa = slideA(t) / 28, sb = slideB(t) / 13;
  for (const d of DROPS) {
    const u = d.slide === "a" ? sa : d.slide === "b" ? sb : 0, dx = (d.dx || 0) * u, dy = (d.dy || 0) * u, gy = (d.grow || 0) * u;
    paintDrop(g, [d.top[0] + dx, d.top[1] + dy - gy], [d.bot[0] + dx, d.bot[1] + dy], d.small ? 0.55 : 1);
  }
  g.restore();
}

// the room's exposure per frame: the gain on the room layer that minimises the blurred (sigma 8) error of the whole
// graded frame against the source, fitted every 4-12 frames (snapshots/s02-r3-lab/gainfit.py, candidates 0.6-1.5),
// smoothed 1-2-1 (the outbound pan refit with candidates down to 0.3). The source's room is darkest late in the outbound
// pan, and the drawn room is brighter than the source through both pans.
const GAIN = [[151, 0.800], [163, 0.759], [175, 0.748], [187, 0.748], [199, 0.747], [211, 0.746], [223, 0.744], [235, 0.743], [247, 0.726], [259, 0.689], [271, 0.671], [283, 0.675], [291, 0.645], [299, 0.605], [307, 0.565], [315, 0.51], [323, 0.47], [331, 0.44], [339, 0.40], [344, 0.45], [347, 0.8], [352, 1.005], [360, 0.993], [368, 0.980], [376, 0.974], [384, 0.973], [392, 0.983], [400, 1.004], [404, 1.016], [408, 1.016], [412, 1.017], [416, 1.016], [420, 1.017], [424, 1.027], [428, 1.042], [432, 1.054], [436, 1.044], [440, 0.991], [444, 0.877], [448, 0.720], [452, 0.685], [456, 0.707], [460, 0.709], [464, 0.676], [468, 0.654], [472, 0.689], [476, 0.715]];
function tabF(T, f) {
  if (f <= T[0][0]) return T[0][1];
  for (let i = 1; i < T.length; i++) if (f <= T[i][0]) { const a = T[i - 1], b = T[i]; return a[1] + (b[1] - a[1]) * (f - a[0]) / (b[0] - a[0]); }
  return T[T.length - 1][1];
}
function applyGain(ctx, k) {
  if (Math.abs(k - 1) < 0.005) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = "none";
  if (k < 1) { ctx.globalAlpha = 1 - k; ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); }
  else { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(1, k - 1); ctx.drawImage(ctx.canvas, 0, 0); }
  ctx.restore();
}
// fix pass 2 (review medium: the pan world between the held views was about half the source's brightness in the book
// region): the whole-frame gain fit keeps the room dark (other parts of the drawn world are brighter than the source), so
// the bookshelf region (world rect BOOKS) gets its own extra gain, fitted per frame on blurred error (snapshots/s02-fix2-lab)
const BOOKS = [1100, -1300, 3800, -120];
// (fit: only 336-349 gain from it, 1.2-1.4; elsewhere the blurred error rises, so the table stays at 1 there)
let BOOK_GAIN = [[332, 1], [338, 1.2], [344, 1.4], [347, 1.3], [349, 1.2], [351, 1]];
function applyRegionGain(ctx, k, ox, oy) {
  if (k < 1.01) return;
  const x0 = BOOKS[0] + ox, y0 = BOOKS[1] + oy, x1 = BOOKS[2] + ox, y1 = BOOKS[3] + oy;
  if (x1 < 0 || y1 < 0 || x0 > W || y0 > H) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = "none";
  ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();
  ctx.globalCompositeOperation = "lighter";
  let r = k - 1; while (r > 1e-3) { ctx.globalAlpha = Math.min(1, r); ctx.drawImage(ctx.canvas, 0, 0); r -= 1; }
  ctx.restore();
}
// the colour of the source's grade: a faint green lift in everything but black (rising through the outbound pan and on
// the cartons, cut at 15.88 s) and a slight warm (red) in the mids. Measured per frame on the source (G-(R+B)/2 and R-B
// over non-black pixels), x1.2 to pre-grade: [frame, green add, red add] in 1/255.
// fix pass 2 (review low: the green ran 1-2 units strong through the cartons, weak at the look): the green column lowered
// through 300-396 (x0.73 as the review suggested, then re-checked per frame on G-(R+B)/2 over non-black pixels: 346 kept
// higher), 420 -> 0.5, 450 -> 2.0, 240 -> 2.0
const TINT = [[151, 1.6, 1.6], [240, 2.0, 1.5], [262, 1.2, 1.4], [300, 4.0, 0.1], [330, 5.3, 0], [346, 7.0, 0], [370, 4.4, 0], [396, 4.5, 0], [397, 2.5, 2.1],
  [420, 0.5, 2.0], [450, 2.0, 0.6], [470, 1.1, 2.6], [477, 1.1, 2.6]];
function tint(ctx, f) {
  const gA = tabF(TINT.map((r) => [r[0], r[1]]), f), rA = tabF(TINT.map((r) => [r[0], r[2]]), f);
  if (gA < 0.2 && rA < 0.2) return;
  if (!L.tint) { L.tint = document.createElement("canvas"); L.tint.width = W >> 1; L.tint.height = H >> 1; }
  const T = L.tint, tg = T.getContext("2d");
  for (const [amt, k, col] of [[gA, 32, "#00ff00"], [rA, 3, "#ff0000"]]) {
    if (amt < 0.2) continue;
    tg.globalCompositeOperation = "source-over"; tg.filter = `grayscale(1) brightness(${k})`;
    tg.drawImage(ctx.canvas, 0, 0, T.width, T.height);
    tg.filter = "none"; tg.globalCompositeOperation = "multiply"; tg.fillStyle = col; tg.fillRect(0, 0, T.width, T.height);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = amt / 255;
    ctx.drawImage(T, 0, 0, W, H);
    ctx.restore();
  }
}
// the designer's pan blur (DESB) was fitted on blurred MAE, which cannot see blur, and drifted soft: fix pass 1 scales it
// down where the source's hair strands stay crisp (Sobel edge energy inside his silhouette, snapshots/s02-fix1-lab)
function desbK(f) { return f >= 294 && f < 400 ? DESB_K1 : f >= 440 ? DESB_K2 : 1; }
let DESB_K1 = 0.6, DESB_K2 = 0.6;
// flying-owl softness (px sigma above the sharpest frames), frames 397..478
const OWL_SOFT = [0.00,0.00,0.00,0.16,0.49,0.66,0.69,0.75,0.73,0.63,0.50,0.43,0.54,0.67,0.73,0.85,0.95,0.95,0.91,0.88,0.84,0.80,0.76,0.71,0.64,0.55,0.37,0.24,0.44,0.60,0.45,0.40,0.62,0.66,0.41,0.22,0.30,0.28,0.36,0.79,1.08,1.19,1.22,1.15,1.02,0.95,0.99,0.98,0.91,0.95,1.05,1.08,1.05,1.03,1.11,1.19,1.16,1.07,0.96,0.93,1.09,1.22,1.15,1.10,1.26,1.36,1.26,1.19,1.26,1.31,1.15,1.03,1.22,1.31,1.09,0.97,1.19,1.36,1.24,1.10,1.18,1.41];
let OWL_SOFT0 = 0, OWL_SOFTK = 1;
// scratch-lab hook (snapshots/s02-r3-lab only; the film never sets it): draw only some layers
export const __lab = { only: null, gain: null, bookK: null, desbK: null, desLift: null, wt(o) { Object.assign(WT, o); }, soft(a, k) { OWL_SOFT0 = a; OWL_SOFTK = k; }, des(look) { layers(); return L.des[look === "soft" ? "soft" : look ? "look" : "stare"]; } };
export const shot = {
  draw(ctx, local, t) {
    let f = frameOf(t);
    if (REPEAT.has(f)) f -= 1;
    layers();
    const [ox, oy] = camAt(f), dir = panDir(f);
    const rb = rowAt(ROOMB, ROOMB0, f), db0 = rowAt(DESB, DESB0, f), obl = rowAt(OWLB, OWLB0, f);
    const dk = __lab.desbK ?? desbK(f), db = [db0[0] * dk, db0[1] * dk];
    const only = __lab.only;
    if (!only || only.room) { layer(ctx, rb[0], rb[1], dir, (g, a, b) => paintRoom(g, ox + a, oy + b, f)); if (!only || !only.nogain) applyGain(ctx, __lab.gain ?? tabF(GAIN, f) * (__lab.gainK ?? 1)); applyRegionGain(ctx, __lab.bookK ?? tabF(BOOK_GAIN, f), ox, oy); }
    if (only && !only.chars) return;
    if (only && only.owlOnly) { const O = f < 405 ? owlLayerAt(f, BOX_OFF[0] + ox, BOX_OFF[1] + oy) : owlLayerAt(f, 0, 0, OWL_SOFT0 + OWL_SOFT[Math.max(0, Math.min(OWL_SOFT.length - 1, f - 397))] * OWL_SOFTK); ctx.drawImage(O.canvas, O.x, O.y, O.w, O.h); return; }
    if (only && only.desOnly) { layer(ctx, db[0], db[1], dir, (g, a, b) => paintDesigner(g, f, ox + a, oy + b)); return; }
    // the owl sitting on the cartons (hold-frame placement), with the room's pan blur on the arrival
    if (f >= 330 && f < 405) {
      layer(ctx, obl[0], obl[1], dir, (g, a, b) => {
        const O = owlLayerAt(f, BOX_OFF[0] + ox + a, BOX_OFF[1] + oy + b);
        if (onScreen(O.x, O.y, O.w, O.h)) g.drawImage(O.canvas, O.x, O.y, O.w, O.h);
      });
    }
    // the designer
    if (f < 350 || f > 435) layer(ctx, db[0], db[1], dir, (g, a, b) => paintDesigner(g, f, ox + a, oy + b));
    // the owl in flight (measured frame track)
    if (f >= 405) {
      // the source's flying owl: the wings are motion-soft (edge blur measured along the wing outlines per frame, previous
      // pass), the body and head crisp and inked. owlLayerAt softens only its wing pass.
      const sg = OWL_SOFT0 + OWL_SOFT[Math.max(0, Math.min(OWL_SOFT.length - 1, f - 397))] * OWL_SOFTK;
      const O = owlLayerAt(f, 0, 0, sg);
      if (onScreen(O.x, O.y, O.w, O.h)) ctx.drawImage(O.canvas, O.x, O.y, O.w, O.h);
    }
    tint(ctx, f);
  },
  release() { L = null; releaseOwl(); },
};
