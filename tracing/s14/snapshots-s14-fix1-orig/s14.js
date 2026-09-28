// Shot 14 (36.92–40.72): the owl alone in the dark. Far off to the upper right one lit gap shows a corridor of
// boxes and gear. The owl (front, wings still half up) swings round to face it, stares, then flies at it from behind;
// the camera's long-lens zoom follows into the gap, which opens until the room fills the frame, and the camera
// dollies on down the corridor after the owl as it hops along the floor.
//
// Measured on the source (tools: camtrack.py on the gap, optical flow on the room, luma blobs for the owl):
//   36.92–38.48  locked off (camtrack s = 1.0000 ± 0.0001). Room seen at 0.438x of its 40.00 framing.
//   38.52–39.96  a 2D zoom of the room image, s 1 -> 2.215 (vs 38.48); its fixed point slides from ~(1890,400)
//                to ~(1105,640). The gap (a soft ellipse fixed on the room at ~(1225,410)) widens, then opens fully
//                by 40.00.
//   40.00–40.72  a straight dolly toward C = (1104.5, 642.9): p' = C + (p - C)/(1 - d*w). d per frame from a
//                bundle fit (median error 1.3 px); w = inverse depth per layer (1 = the keyboard).
// Round 3: the room is redrawn (s14/room3.js: traced faces from s14/geo3.js, fitted tones in s14/tone3.js, drawn as
// ink-wash with dry-brush grain and ink contours) and composited by s14/gl3.js (per-layer depth planes, motion blur,
// the gap's mask). The owl: s14/owl.js (front, turn, side) and s14/back.js (from behind, per-frame table).
import { W, H } from "../config.js";
import { createCompositor } from "./s14/gl3.js";
import { buildLayers3 } from "./s14/room3.js";
import { drawOwlAt, releaseOwl } from "./s14/owl.js";
import { LIGHT } from "./s14/light3.js";
import { GAPL } from "./s14/gaplight3.js";
import { FG3 } from "./s14/facegain3.js";

const C = [1104.5, 642.9];
// camera before 40.0: similarity of the room image vs its 38.48 framing, per source frame [t, s, tx, ty]
const ZOOM = [
  [38.48, 1.0, 0, 0], [38.52, 1.0029, -5.1, -1.4], [38.56, 1.0121, -22.8, -4.2], [38.60, 1.0271, -51.0, -10.4], [38.64, 1.0443, -83.1, -18.8],
  [38.68, 1.0650, -122.1, -25.8], [38.72, 1.0879, -163.8, -39.3], [38.76, 1.1359, -255.3, -55.5], [38.80, 1.1682, -316.3, -67.3],
  [38.84, 1.2016, -378.8, -79.9], [38.88, 1.2383, -447.1, -96.8], [38.92, 1.2752, -518.2, -109.2], [38.96, 1.3147, -592.8, -127.6],
  [39.00, 1.3147, -592.8, -127.6], [39.04, 1.4066, -765.1, -156.5], [39.08, 1.4066, -765.1, -156.5], [39.12, 1.4482, -844.9, -174.9],
  [39.16, 1.4902, -923.1, -188.1], [39.20, 1.5352, -1003.1, -220.7], [39.24, 1.5736, -1078.9, -222.0], [39.28, 1.6146, -1155.1, -242.2],
  [39.32, 1.6700, -1259.4, -265.7], [39.36, 1.7108, -1335.3, -278.4], [39.40, 1.7483, -1404.6, -293.2], [39.44, 1.7899, -1484.8, -308.5],
  [39.48, 1.8243, -1550.3, -319.9], [39.52, 1.8442, -1585.9, -330.7], [39.56, 1.8513, -1599.0, -331.4], [39.60, 1.8697, -1633.7, -337.8],
  [39.64, 1.8893, -1669.3, -345.8], [39.68, 1.9098, -1706.8, -347.1], [39.72, 1.9404, -1752.3, -369.7], [39.76, 1.9732, -1804.2, -374.7],
  [39.80, 2.0159, -1868.1, -396.0], [39.84, 2.0626, -1937.0, -420.4], [39.88, 2.1564, -2074.9, -475.9], [39.92, 2.1564, -2074.9, -475.9],
  [39.96, 2.2148, -2161.2, -506.1],
];
const Z40 = [2.2834, -2263.2, -540.3];   // the same similarity at 40.00 (chained 38.48 -> 39.88 -> 40.00)
// dolly after 40.0: d per source frame (bundle fit on the room's middle, 40.00–40.60, median error 1.3 px). The move
// eases off at the end: the keyboard grows only 1.22x from 40.52 to 40.68 (d = 0.549), and 40.64/40.68 are the
// same source frame.
const DOLLY = [0, 0.03, 0.06, 0.091, 0.1221, 0.1714, 0.2052, 0.2395, 0.2726, 0.3076, 0.3413, 0.3769, 0.4122, 0.4495, 0.4857, 0.5223, 0.549, 0.549, 0.57];
// the gap: a rounded rectangle (superellipse p = 3) on the room image (R40 px) with a flat plateau and a ~12% soft
// edge; [t, cx, cy, rx, ry, gain]. Measured as source(t) / source(40.00) warped back onto the room (maskprof.py):
// edges at x 700/1700, y 170/630 until 39.6 s, then opening; the plateau gain 0.48 -> 1.
// (fix pass 1: the lit gap measured 36 px too far right and 14 px short on the right at 36.9-38.5 -> wider, a hair left)
const GAP = [
  [36.9, 1174, 398, 541, 234, 0.45, 3], [38.5, 1174, 398, 541, 234, 0.47, 3], [38.8, 1180, 398, 534, 236, 0.53, 3], [39.2, 1190, 400, 521, 240, 0.6, 3],
  [39.6, 1200, 398, 512, 252, 0.62, 3], [39.72, 1210, 396, 560, 262, 0.65, 3], [39.8, 1225, 392, 625, 262, 0.7, 3],
  // (fix pass 1: at 39.88/39.92 the source's lit area is an ellipse, frame x 237-2130, y ~85-770, its lower corners dark)
  // (fix pass 1: column means at 39.84/39.92 had the render's lit area ~100 px too wide on both sides -> narrower)
  [39.88, 1184, 400, 930, 360, 0.9, 2.2], [39.96, 1150, 400, 1080, 430, 0.95, 2.2], [40.0, 1150, 380, 4000, 3000, 1.0, 2],
];
// camera side-shift per dolly frame (px at w = 1), fitted jointly with the layer planes (trace3/jointfit.py,
// smoothed): the camera drifts up and a little left as it closes in, so near layers shift more than far ones
const EOFF = [[0, 0], [0.5, 0], [0.9, -0.2], [1.1, -0.5], [1.0, -0.8], [0.7, -1.0], [0.5, -1.3], [0.3, -1.7], [0.1, -2.1], [-0.3, -2.4], [-0.6, -2.8],
  [-1.0, -3.2], [-1.4, -3.6], [-2.2, -4.0], [-3.2, -4.5], [-3.8, -5.0], [-3.8, -5.2], [-3.8, -5.2], [-3.8, -5.2]];
function eAt(t) {
  const f = Math.max(0, (t - 40.0) / 0.04), i = Math.min(EOFF.length - 2, Math.floor(f)), u = Math.min(1, f - i);
  return [EOFF[i][0] + (EOFF[i + 1][0] - EOFF[i][0]) * u, EOFF[i][1] + (EOFF[i + 1][1] - EOFF[i][1]) * u];
}
// the desk group's shutter (the rest of the room keeps 0.3 of a frame)
// (fix pass 1: review 1 found the source's desk crisp through 40.60, its smear only at 40.64: the cables slung over
// the plank ghosted into parallel copies with a 0.3-frame shutter early in the move)
const SHUT = [[40.0, 0.08], [40.6, 0.08], [40.64, 0.4], [40.72, 0.4]];
// the desk group's focus of expansion: its plank's front face measured on every dolly frame (left end, top and bottom
// edges; round 3): x 1105, y drifting up from 640 to 600 (the camera rises relative to the desk)
const DESK_CY = [[40.0, 640], [40.04, 637], [40.08, 634], [40.12, 632], [40.16, 630], [40.2, 628], [40.24, 626], [40.28, 622], [40.32, 619], [40.36, 618],
  [40.4, 617], [40.44, 614], [40.48, 611], [40.52, 609], [40.56, 607], [40.6, 603], [40.64, 600], [40.72, 598]];
const DESK = ["synth", "under", "deskBase", "deskTop"];
const lerpTab = (T, t) => {
  if (t <= T[0][0]) return T[0].slice(1);
  for (let i = 1; i < T.length; i++) if (t <= T[i][0]) { const a = T[i - 1], b = T[i], f = (t - a[0]) / (b[0] - a[0]); return a.slice(1).map((v, k) => v + (b[k + 1] - v) * f); }
  return T[T.length - 1].slice(1);
};
const rowAt = (T, t) => { let r = T[0]; for (const x of T) if (x[0] <= t + 1e-4) r = x; return r; };
// the time of the first source frame of a held run (a duplicated source frame repeats its original exactly)
const heldT = (T, t) => { let i = T.indexOf(rowAt(T, t)); while (i > 0 && T[i - 1].slice(1).every((v, k) => v === T[i][k + 1])) i--; return T[i][0]; };

// the gap view's overall gain (before 40.0 s; the GAP table's plateau gain rides on it)
const GAPK = { gain: 1.2, curve: [1.3, 1.6] };

// room image -> frame similarity before 40.0 s
// The held room image measured ~3% small against the source (template match, 36.9-38.5); the error fades out as the
// zoom closes in (aligned within ~3 px by 39.8). Scale about the gap's centre in the frame.
const GAPC = [1515, 420];
function roomSim(t) {
  const [s, tx, ty] = t < 38.48 ? [1, 0, 0] : rowAt(ZOOM, t).slice(1);
  const a = s / Z40[0];
  const k = 1 + 0.03 * Math.max(0, Math.min(1, (39.8 - t) / 1.32));
  const Q = [GAPC[0] * s + tx, GAPC[1] * s + ty];
  return [k * a, Q[0] * (1 - k) + k * (tx - a * Z40[1]), Q[1] * (1 - k) + k * (ty - a * Z40[2])];
}
function dollyAt(t) {
  const f = (t - 40.0) / 0.04;
  const i = Math.max(0, Math.min(DOLLY.length - 2, Math.floor(f)));
  const u = Math.max(0, Math.min(1, f - i));
  return DOLLY[i] + (DOLLY[i + 1] - DOLLY[i]) * u;
}
// per-layer light over time (s14/light3.js: fitted per source frame, trace3/light3.py): gain and a screen-space
// linear ramp [g, gx, gy] about the frame centre
function lightAt(t) {
  const T = LIGHT.t, n = T.length, G = {}, F = {};
  let k = 0, f = 0;
  if (t >= T[n - 1]) { k = n - 2; f = 1; } else if (t > T[0]) { k = Math.min(n - 2, Math.floor((t - T[0]) / 0.04 + 1e-6)); f = Math.max(0, Math.min(1, (t - T[k]) / (T[k + 1] - T[k]))); }
  for (const [name, rows] of Object.entries(LIGHT.g)) {
    const a = rows[k], b = rows[Math.min(n - 1, k + 1)];
    const v = a.map((x, i) => x + (b[i] - x) * f);
    G[name] = v[0]; F[name] = [v[1] / v[0], v[2] / v[0], W / 2, H / 2];
  }
  return { G, F };
}

// per-layer light in the gap view (s14/gaplight3.js, fitted per source frame by trace3/gaplight.py): the lit gap is
// not an even window on the room: the far boxes and the lamp's corner stay lit, the desk and floor stay dark
function gapLightAt(t) {
  const T = GAPL.t, out = {};
  if (!T.length) return out;
  for (const [name, v] of Object.entries(GAPL.g)) {
    let g = v[0];
    if (t >= T[T.length - 1]) g = v[T.length - 1];
    else for (let i = 1; i < T.length; i++) if (t <= T[i]) { const f = (t - T[i - 1]) / (T[i] - T[i - 1]); g = v[i - 1] + (v[i] - v[i - 1]) * Math.max(0, f); break; }
    out[name] = g;
  }
  return out;
}

let R = null, IDS = null;
function room() {
  if (R) return R;
  const comp = createCompositor(W, H);
  IDS = {};
  for (const L of buildLayers3()) { comp.addLayer(L); IDS[L.name] = L.ids; }
  R = comp;
  return R;
}
// per-face gains for this frame (s14/facegain3.js: fitted per source frame over the dolly by trace3/facegain.py,
// the visible part of each face, source / render); the gap view holds the 40.08 column
function faceGains(t) {
  const T = FG3.t, n = T.length, out = {};
  if (!n) return out;
  let k = 0, f = 0;
  if (t >= T[n - 1]) { k = n - 1; f = 0; } else if (t > T[0]) { k = Math.min(n - 2, Math.floor((t - T[0]) / 0.04 + 1e-6)); f = Math.max(0, Math.min(1, (t - T[k]) / (T[k + 1] - T[k]))); }
  for (const [layer, faces] of Object.entries(FG3.g)) {
    const a = new Float32Array(256).fill(1), ids = IDS[layer] || {};
    for (const [name, v] of Object.entries(faces)) { const id = ids[name]; if (id) a[id] = v[k] + ((v[Math.min(n - 1, k + 1)] ?? v[k]) - v[k]) * f; }
    out[layer] = a;
  }
  return out;
}

// the faint spill of the gap's light across the floor toward the owl: a narrow streak (half-max width ~250-300 px) whose
// ridge runs from under the gap straight into the owl's feet, flat at luma ~6.5 down to the frame bottom (measured on
// the source at 37.6: ridge (1350,600) (1215,650) (1124,700) (1027,750) (908,800) (834,930)). Held-frame coordinates;
// it rides on the room image during the zoom.
const RIDGE = [[1350, 600], [1215, 650], [1124, 700], [1010, 750], [885, 800], [770, 930], [730, 990]];
function beam(ctx, sim, k) {
  if (k <= 0) return;
  const s0 = roomSim(38.0);
  const [a, bx, by] = sim;
  const P = ([x, y]) => { const u = (x - s0[1]) / s0[0], v = (y - s0[2]) / s0[0]; return [a * u + bx, a * v + by]; };
  const hw = (i) => 20 + 95 * Math.min(1, i / 2);           // narrow where it leaves the gap, ~110 px on the floor
  const L = [], R = [];
  for (let i = 0; i < RIDGE.length; i++) {
    const p = RIDGE[i], q = RIDGE[Math.min(RIDGE.length - 1, i + 1)], o = RIDGE[Math.max(0, i - 1)];
    const dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy) || 1, n = [-dy / l, dx / l];
    L.push(P([p[0] + n[0] * hw(i), p[1] + n[1] * hw(i)])); R.push(P([p[0] - n[0] * hw(i), p[1] - n[1] * hw(i)]));
  }
  ctx.save();
  ctx.globalAlpha = k;
  ctx.filter = `blur(${(40 * a / s0[0]).toFixed(1)}px)`;
  ctx.fillStyle = "rgb(10,10,10)";
  ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]); for (const p of L) ctx.lineTo(p[0], p[1]); for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]); ctx.closePath(); ctx.fill();
  ctx.restore();
}

// The room at dolly position d (the keyboard's inverse-depth units; s14 ends at 0.549) with the travel dv of the
// last frame for the shutter, lit and toned as source frame tl (held at 40.64 past the table). Exported so the next
// shot, which continues the same push, can keep this room: drawRoomDolly(ctx, d, dv, 40.64) draws the full frame
// (no owl). Its caches are freed by shot.release().
export function drawRoomDolly(ctx, d, dv, tl) {
  const comp = room();
  const t = Math.min(40.64, tl);
  const shut = lerpTab(SHUT, t)[0];
  const d0 = d - dv * 0.3;
  const ns = t > 40.62 ? 14 : 5;
  const ds = Array.from({ length: ns }, (_, i) => d0 + (d - d0) * (i / (ns - 1)));
  // the source room is still coming up at 40.00-40.04: the frame's lower corners and bottom are dark
  const vig = t < 40.02 ? [1150, 420, 1250, 450, 0.72, 1.22, 2.2] : t < 40.06 ? [1150, 420, 1450, 560, 0.72, 1.22, 2.2] : null;
  const Cd = [1105, lerpTab(DESK_CY, t)[0]], Cmap = {}, Emap = {}, Dmap = {};
  // (at 40.64 the plank measures 9.05x its 40.00 size: the desk group a hair closer than the room's dolly fit)
  for (const n of DESK) { Cmap[n] = Cd; Emap[n] = [0, 0]; Dmap[n] = t > 40.62 ? 0.006 : 0; }
  const early = t < 40.46;
  const { G, F } = lightAt(t);
  const img = comp.render({ ds, d0: d, C, sim: [1, 0, 0], mask: vig, Imap: faceGains(t), Gmap: G, Fmap: F, E: eAt(t), Cmap, Emap, Dmap,
    Bmap: early ? { deskTop: shut / 0.3, deskBase: 0.35, under: 0.3, synth: 0.25 } : { deskTop: shut / 0.3, deskBase: 0.9 * shut / 0.3, under: 0.8 * shut / 0.3, synth: 0.8 * shut / 0.3 } });
  ctx.drawImage(img, 0, 0);
}

export const shot = {
  draw(ctx, local, t) {
    t = Math.ceil(t * 25 - 1e-6) / 25;          // hold each 25 fps source frame
    if (t > 40.66) t = 40.64;                    // source 40.68 repeats 40.64
    const comp = room();
    let img;
    if (t < 40.0 - 1e-6) {
      // the camera table holds on duplicated source frames (39.88/39.92, ...): hold the gap with it
      const th = t < 38.48 ? t : heldT(ZOOM, t);
      const sim = roomSim(th);
      const [gx, gy, rx, ry, gain, pw] = lerpTab(GAP, th);
      const [a, bx, by] = sim;
      const { G } = lightAt(40.0), GL = gapLightAt(th), Gm = { ...G };
      for (const n in GL) Gm[n] = (Gm[n] ?? 1) * GL[n];
      img = comp.render({ ds: [0], C, sim, Imap: faceGains(40.08), mask: [a * gx + bx, a * gy + by, a * rx, a * ry, 0.86, 1.12, pw], gain: gain * GAPK.gain, Gmap: Gm, dots: 0.5,
        // the gap view's highlights spread wider than a plain gain gives (inside the lit gap p95 102 against the
        // source's 124 at 36.96, p50 matched): a highlight-expanding curve, strongest while the gap is small
        curve: [GAPK.curve[0], GAPK.curve[1], lerpTab([[38.6, 1], [39.2, 0.5], [39.84, 0.5], [39.96, 0]], th)[0]] });
      ctx.drawImage(img, 0, 0);
      beam(ctx, sim, th < 39.9 ? 1 - Math.max(0, (th - 39.5) / 0.4) : 0);
    } else {
      const d = dollyAt(t);
      let dv = d - dollyAt(t - 0.04);
      if (dv < 1e-4) dv = (d - dollyAt(t - 0.08)) / 2;       // a held source frame keeps the previous frame's smear
      drawRoomDolly(ctx, d, dv, t);
    }
    drawOwlAt(ctx, t);
  },
  release() { if (R) R.dispose(); R = null; releaseOwl(); },
};
