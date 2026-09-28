// Shot 1 (0.00–6.04): 3:07 AM, high above and behind the designer. The camera creeps in while his right hand
// flicks between websites with three-finger swipes; he lifts it onto the keys for a moment, then lands back on
// his own site (sōko) and stops.
//
// Layers, all in plate coordinates (= the t=0 source frame), under the measured camera:
//   room    engraved once at 1.25x (the push-in peaks at 1.21x): desk, laptop without hands, gear, floor
//   screen  the page carousel, per-frame from the source (s01/screen.js)
//   hand    the right hand, its own small engraved layer (two traced poses, s01/hands.js), moved per frame by the
//           similarity fitted to the measured fingertip/knuckle/wrist track (s01/motion.js)
//   figure  shirt, hood, beanie, hair, left hand, chair: engraved once and masked, so no room line crosses him;
//           during the swipes the right arm and hood bend with the hand (a measured displacement field, s01/warp.js)
// Helpers: src/shots/s01/*.js. Measurements and tools: snapshots/s01-fix1-meas/, snapshots/s01-fix2-meas/.
import { W, H } from "../config.js";
import { Plate } from "../lib/engrave.js";
import { paintRoom, KEYS, DECK_PATH } from "./s01/room.js";
import { paintFigure, FIG_MASKS } from "./s01/figure.js";
import { paintRightHand, paintRightHand2, handMask, hand2Mask, handShadow } from "./s01/hands.js";
import { armAt, handSim, figField } from "./s01/motion.js";
import { Warper } from "./s01/warp.js";
import { drawScreen, releaseScreen } from "./s01/screen.js";

// The sōko page comes from the shared site module; it is being rewritten by its owner, so load it defensively.
let SITES = null;
try { SITES = await import("../lib/sites.js"); } catch (e) { console.warn("[s01] sites.js unavailable, sōko page falls back:", e); }
// Canvas text never triggers font loading: load the faces the laptop pages use before the first frame.
try {
  await Promise.all(["900 79px Archivo", "800 40px Archivo", "600 20px Geist", "500 20px Geist", "400 20px 'Geist Mono'", "300 20px Geist", "400 20px Fraunces", "500 20px Fraunces", "700 20px Fraunces"].map((f) => document.fonts.load(f)));
} catch (e) { /* the screen caches pages only once document.fonts.check passes */ }

// ---------- camera: measured similarity per 0.12 s (ORB+RANSAC on the room with the screen and right hand masked),
// lightly smoothed; frame = s * plate + (tx, ty). Held from 5.04 s.
const CAM = [
  [0.00, 1.0000, 0.00, 0.00], [0.12, 1.0052, -4.38, 0.02], [0.24, 1.0106, -8.92, -0.04], [0.36, 1.0157, -13.36, -0.12],
  [0.48, 1.0204, -17.51, -0.13], [0.60, 1.0256, -22.09, -0.59], [0.72, 1.0314, -27.21, -1.33], [0.84, 1.0373, -32.70, -1.90],
  [0.96, 1.0433, -38.48, -2.50], [1.08, 1.0492, -44.27, -3.07], [1.20, 1.0548, -49.95, -3.57], [1.32, 1.0606, -55.74, -4.28],
  [1.44, 1.0661, -61.21, -5.39], [1.56, 1.0709, -66.00, -6.45], [1.68, 1.0762, -71.45, -7.21], [1.80, 1.0819, -77.53, -8.03],
  [1.92, 1.0875, -83.39, -8.88], [2.04, 1.0932, -89.46, -9.76], [2.16, 1.0990, -95.54, -10.92], [2.28, 1.1048, -101.60, -12.14],
  [2.40, 1.1101, -107.33, -13.00], [2.52, 1.1148, -112.46, -13.79], [2.64, 1.1202, -118.29, -14.91], [2.76, 1.1262, -124.73, -16.20],
  [2.88, 1.1319, -130.78, -17.44], [3.00, 1.1376, -136.87, -18.56], [3.12, 1.1435, -143.26, -19.78], [3.24, 1.1493, -149.43, -21.08],
  [3.36, 1.1544, -154.86, -22.16], [3.48, 1.1593, -160.21, -23.06], [3.60, 1.1646, -165.96, -24.36], [3.72, 1.1701, -171.59, -25.98],
  [3.84, 1.1755, -177.32, -27.17], [3.96, 1.1808, -183.00, -28.31], [4.08, 1.1857, -188.22, -29.59], [4.20, 1.1902, -193.03, -30.66],
  [4.32, 1.1946, -197.66, -31.71], [4.44, 1.1984, -201.70, -32.57], [4.56, 1.2010, -204.49, -33.11], [4.68, 1.2034, -207.03, -33.61],
  [4.80, 1.2059, -209.59, -34.09], [4.92, 1.2078, -211.45, -34.46], [5.04, 1.2091, -212.82, -34.55],
];
function cam(t) {
  if (t <= 0) return CAM[0].slice(1);
  const n = CAM.length;
  if (t >= CAM[n - 1][0]) return CAM[n - 1].slice(1);
  let i = 1; while (CAM[i][0] < t) i++;
  const p0 = CAM[Math.max(0, i - 2)], p1 = CAM[i - 1], p2 = CAM[i], p3 = CAM[Math.min(n - 1, i + 1)];
  const u = (t - p1[0]) / (p2[0] - p1[0]), u2 = u * u, u3 = u2 * u;
  return [1, 2, 3].map((k) => 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3));
}

// ---------- the lift onto the keys: pose 2 eases into place (template track of the pose-2 hand, plate px) ----------
const POSE2 = new Map([[96, [-10, 11]], [97, [-5, 5]], [98, [-1.5, 1.5]], [99, [0, 0]], [100, [0, 0]], [101, [0, 0]], [102, [0, 0]]]);

// ---------- the deck and keycaps dim while dark pages are up (less light from the screen) ----------
// D per source frame = 1 - (deck top brightness / its resting value), measured in plate coordinates
// (snapshots/s01-fix2-meas/deck.py). The keys dim ~1.45x as much as the deck top; the deck fades toward the front.
const DECKDARK = new Map([[17, 0.09], [18, 0.1], [19, 0.08], [29, 0.37], [30, 0.38], [31, 0.27], [32, 0.23], [33, 0.21], [34, 0.21], [35, 0.22], [36, 0.22], [37, 0.22], [38, 0.26], [39, 0.29], [50, 0.41], [51, 0.42], [52, 0.42], [53, 0.39], [54, 0.37], [55, 0.35], [56, 0.37], [57, 0.37], [58, 0.34], [59, 0.33], [60, 0.3], [74, 0.25], [75, 0.24], [76, 0.23], [77, 0.24], [78, 0.25], [79, 0.26], [80, 0.26], [86, 0.44], [87, 0.42], [88, 0.41], [89, 0.19], [90, 0.19], [91, 0.23]]);
const deckDark = (t) => DECKDARK.get(Math.round(t * 25)) || 0;
// the beanie is lit by the screen too: its brightness per frame (1 - top-of-head mean / resting mean, headlight.txt)
const HEADDARK = new Map([[29, 0.37], [30, 0.38], [31, 0.32], [32, 0.29], [33, 0.29], [34, 0.28], [35, 0.28], [36, 0.29], [37, 0.3], [38, 0.29], [39, 0.3], [50, 0.41], [51, 0.43], [52, 0.42], [53, 0.39], [54, 0.37], [55, 0.36], [56, 0.35], [57, 0.34], [58, 0.34], [59, 0.35], [60, 0.35], [74, 0.33], [75, 0.32], [76, 0.33], [77, 0.34], [78, 0.33], [79, 0.33], [80, 0.35], [81, 0.1], [84, 0.06], [86, 0.42], [87, 0.42], [88, 0.41], [89, 0.34], [90, 0.33], [91, 0.32]]);
const headDark = (t) => HEADDARK.get(Math.round(t * 25)) || 0;

// ---------- layers (built once, on first draw) ----------
const S = 1.25;
let L = null;
function maskLayer(cut, pathFns, scale, ox = 0, oy = 0) {
  const m = document.createElement("canvas"); m.width = cut.width; m.height = cut.height;
  const g = m.getContext("2d"); g.scale(scale, scale); g.translate(-ox, -oy); g.fillStyle = "#fff";
  g.lineWidth = 5; g.strokeStyle = "#fff"; g.lineJoin = "round";
  for (const f of pathFns) { f(g); g.fill(); g.stroke(); }     // the stroke keeps the inked contours that sit on the edge
  const c = cut.getContext("2d");
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = "destination-in"; c.drawImage(m, 0, 0); c.restore();
  return cut;
}
const HAND_BOX = [1050, 390, 240, 216];      // x, y, w, h of the right hand's layers
function layers() {
  if (L) return L;
  // room
  let P = new Plate(W, H, S);
  paintRoom(P);
  const room = P.engrave({ spacing: 5.2, seed: 7, contrast: 1.05 });
  // figure (masked)
  P = new Plate(W, H, S);
  paintFigure(P);
  const fig = maskLayer(P.engrave({ spacing: 5.2, seed: 11, contrast: 1.05 }), FIG_MASKS, S);
  const figW = new Warper(fig, S, 740, 360, 760, 586, 16);
  // right hand (small plate, frame coordinates through an offset)
  const [hx, hy, hw, hh] = HAND_BOX;
  P = new Plate(hw, hh, S);
  for (const g of [P.v, P.d, P.o]) g.translate(-hx, -hy);
  paintRightHand(P);
  const hand = maskLayer(P.engrave({ spacing: 5.2, seed: 13, contrast: 1.05 }), [(g) => handMask(g)], S, hx, hy);
  P = new Plate(hw, hh, S);
  for (const g of [P.v, P.d, P.o]) g.translate(-hx, -hy);
  paintRightHand2(P);
  const hand2 = maskLayer(P.engrave({ spacing: 5.2, seed: 17, contrast: 1.05 }), [(g) => hand2Mask(g)], S, hx, hy);
  // keycaps and deck (for the darkening while dark pages are up)
  const keys = document.createElement("canvas"); keys.width = Math.round(480 * S); keys.height = Math.round(225 * S);
  const kg = keys.getContext("2d"); kg.scale(S, S); kg.translate(-834, -300);
  // the deck dims from the hinge down (less light from the screen), the keycaps a little more
  kg.save(); kg.beginPath(); DECK_PATH(kg); kg.clip();
  // baked at half strength: drawn with globalAlpha 2D, the deck gets D * f(y) and the keys 1.32 D
  const dg = kg.createLinearGradient(0, 303, 0, 522);
  for (const [y, f] of [[303, 1.0], [320, 0.88], [380, 0.42], [440, 0.2], [470, 0.18], [505, 0.3], [522, 0.4]]) dg.addColorStop((y - 303) / 219, `rgba(0,0,0,${(0.5 * f).toFixed(3)})`);
  kg.fillStyle = dg; kg.fillRect(834, 300, 480, 225); kg.restore();
  for (const op of ["destination-out", "source-over"]) {
    kg.globalCompositeOperation = op; kg.fillStyle = op === "source-over" ? "rgba(0,0,0,0.66)" : "#000";
    for (const [x, y, w, h] of KEYS) { kg.beginPath(); kg.roundRect(x + 0.6, y + 0.6, w - 1.2, h - 1.2, 2.5); kg.fill(); }
  }
  kg.globalCompositeOperation = "source-over";
  P = null;
  L = { room, figW, hand, hand2, keys };
  return L;
}

// The right hand: pose 1 moved by the similarity fitted to the measured track; faint ghosts toward the previous
// frame's position only while the fingertips travel > 15 px (the source hand stays crisp at the peaks); the lift
// (3.80) is pose 1 carried up with a vertical ghost; 3.84-4.08 is pose 2 easing into place.
function drawHand(ctx, t, L) {
  const [hx, hy, hw, hh] = HAND_BOX;
  const n = Math.round(t * 25);
  const p2 = POSE2.get(n);
  if (p2) { ctx.drawImage(L.hand2, hx + p2[0], hy + p2[1], hw, hh); return; }
  const d = armAt(n), dp = armAt(n - 1);
  const one = (sim, alpha, shadow) => {
    ctx.save(); ctx.globalAlpha = alpha; ctx.transform(sim[0], sim[1], -sim[1], sim[0], sim[2], sim[3]);
    if (shadow) handShadow(ctx);
    ctx.drawImage(L.hand, hx, hy, hw, hh); ctx.restore();
  };
  const sim = handSim(d);
  one(sim, 1, true);
  const tp = (x) => (x ? x.tips : [0, 0]);
  const tr = Math.hypot(tp(d)[0] - tp(dp)[0], tp(d)[1] - tp(dp)[1]);
  if (tr > 15 || n === 95) {
    const sp = handSim(dp);
    for (const [f, a] of [[0.14, 0.3], [0.28, 0.18]]) {
      const k = Math.min(f * tr, f * 70) / tr;
      one(sim.map((v, i) => v + (sp[i] - v) * k), a, false);
    }
  }
}
// The figure: at rest a plain blit; while the arm moves, the measured displacement field bends the right arm and hood.
function drawFigure(ctx, t, L) {
  const d = armAt(Math.round(t * 25));
  if (!d) { L.figW.blit(ctx); return; }
  L.figW.draw(ctx, figField(d));
}

export const shot = {
  draw(ctx, local) {
    let t = local;
    // Hold each 25 fps source frame: the film is rendered at 25 fps (a no-op there), but previews and the snapshot
    // tool sample on other grids; holding keeps every discrete event (page steps, swipes) on the source's frames.
    t = Math.ceil(t * 25 - 1e-6) / 25;
    const L = layers();
    const { room, keys } = L;
    const [s, tx, ty] = cam(t);
    ctx.save();
    ctx.transform(s, 0, 0, s, tx, ty);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.drawImage(room, 0, 0, W, H);
    const kd = deckDark(t);
    if (kd > 0) {
      ctx.globalAlpha = Math.min(1, 2 * kd); ctx.drawImage(keys, 834, 300, 480, 225);
      // the desk right of the laptop, lit by the screen, dims a little too
      ctx.globalAlpha = 1; const g = ctx.createRadialGradient(1390, 450, 20, 1390, 450, 190);
      g.addColorStop(0, `rgba(0,0,0,${(0.28 * kd).toFixed(3)})`); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(1200, 260, 380, 290);
    }
    drawScreen(ctx, t, SITES);
    drawHand(ctx, t, L);
    drawFigure(ctx, t, L);
    const hd = headDark(t);
    if (hd > 0) { ctx.fillStyle = `rgba(0,0,0,${hd.toFixed(3)})`; ctx.beginPath(); ctx.ellipse(1077, 677, 131, 159, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  },
  release() { if (L && L.figW) L.figW.release(); L = null; releaseScreen(); },
};
