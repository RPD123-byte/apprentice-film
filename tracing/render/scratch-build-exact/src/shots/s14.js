// Shot 14 (36.92–40.72): the owl alone in the dark. Far off to the upper right one lit gap shows a corridor of
// boxes and gear. The owl (front, wings still half up) swings round to face it, stares, then flies at it from behind;
// the camera's long-lens zoom follows into the gap, which opens until the room fills the frame, and the camera
// dollies on down the corridor after the owl as it hops along the floor.
//
// Measured on the source (tools: camtrack.py on the gap, optical flow on the room, luma blobs for the owl):
//   36.92–38.48  locked off (camtrack s = 1.0000 ± 0.0001). Room seen at 0.438x of its 40.00 framing.
//   38.52–39.96  a 2D zoom of the room image, s 1 -> 2.215 (vs 38.48); its fixed point slides from ~(1890,400)
//                to ~(1105,640). The gap (a soft ellipse fixed on the room at ~(1225,410)) widens, then opens fully
//                by 40.00. Its brightness gain rises 0.58 -> 1.
//   40.00–40.72  a straight dolly toward C = (1104.5, 642.9): p' = C + (p - C)/(1 - d*w). d per frame from a
//                bundle fit (median error 1.3 px); w = inverse depth per layer (1 = the keyboard). Near layers blur.
// Owl: see s14/owl.js. The room: s14/room.js (painted layers) + s14/gl.js (WebGL compositor).
import { W, H } from "../config.js";
import { createCompositor } from "./s14/gl.js";
import { buildLayers } from "./s14/room.js";
import { drawOwlAt, releaseOwl } from "./s14/owl.js";

const C = [1104.5, 642.9];
const GAP_LIFT = 1.08;   // the gap view before 40.0 (its tone was already matched: mean 7.6 vs 6.7 at 37.6)
const LIFT = 1.15;   // the room plates print a little dark after the tone/line mix (fix pass 1: mean 68 vs 81 at 40.24 at 1.08)
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
  [39.88, 1184, 400, 1006, 372, 0.9, 2.2], [39.96, 1150, 400, 1150, 440, 0.95, 2.2], [40.0, 1150, 380, 4000, 3000, 1.0, 2],
];
const lerpTab = (T, t) => {
  if (t <= T[0][0]) return T[0].slice(1);
  for (let i = 1; i < T.length; i++) if (t <= T[i][0]) { const a = T[i - 1], b = T[i], f = (t - a[0]) / (b[0] - a[0]); return a.slice(1).map((v, k) => v + (b[k + 1] - v) * f); }
  return T[T.length - 1].slice(1);
};
const rowAt = (T, t) => { let r = T[0]; for (const x of T) if (x[0] <= t + 1e-4) r = x; return r; };
// the time of the first source frame of a held run (a duplicated source frame repeats its original exactly)
const heldT = (T, t) => { let i = T.indexOf(rowAt(T, t)); while (i > 0 && T[i - 1].slice(1).every((v, k) => v === T[i][k + 1])) i--; return T[i][0]; };

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

let R = null;
function room() {
  if (R) return R;
  const comp = createCompositor(W, H);
  for (const L of buildLayers()) comp.addLayer(L.canvas, L.rect, L.plane, L.name, L.blurK ?? 1, L.slices ?? 1);
  R = comp;
  return R;
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
      // the gap is lit from its right (the glowing monitor): its plateau gain climbs ~25% across it (maskprof.py)
      const tilt = 0.08 * Math.max(0, Math.min(1, (39.96 - th) / 0.2));   // fix pass 1: 0.25 left the left group ~20% dim
      img = comp.render({ ds: [0], C, sim, mask: [a * gx + bx, a * gy + by, a * rx, a * ry, 0.86, 1.12, pw], gain: gain * 1.12 * GAP_LIFT, tilt });
      ctx.save(); ctx.filter = th > 39.7 ? "blur(0.8px)" : "none"; ctx.drawImage(img, 0, 0); ctx.restore();
      beam(ctx, sim, th < 39.9 ? 1 - Math.max(0, (th - 39.5) / 0.4) : 0);
    } else {
      const d = dollyAt(t);
      // shutter: the last ~0.3 frame of travel, always 5 samples (no pops as the speed changes); each layer smears
      // by its own blurK (the near desk fully, the far walls a little)
      let dv = d - dollyAt(t - 0.04);
      if (dv < 1e-4) dv = (d - dollyAt(t - 0.08)) / 2;       // a held source frame keeps the previous frame's smear
      const d0 = d - dv * 0.3;
      const ds = Array.from({ length: 5 }, (_, i) => d0 + (d - d0) * (i / 4));
      // the source room is still coming up at 40.00-40.04: the frame's lower corners and bottom are dark (ratio to
      // the lit room at 40.08 ~0.3 at the bottom, ~0.3-0.7 at the side edges) and clear by 40.08
      const vig = t < 40.02 ? [1150, 420, 1250, 450, 0.72, 1.22, 2.2] : t < 40.06 ? [1150, 420, 1450, 560, 0.72, 1.22, 2.2] : null;
      img = comp.render({ ds, d0: d, C, sim: [1, 0, 0], mask: vig, gain: LIFT });
      // the source room is soft painted ink: take the edge off the engraved hairlines
      ctx.save(); ctx.filter = "blur(0.9px)"; ctx.drawImage(img, 0, 0); ctx.restore();
    }
    drawOwlAt(ctx, t);
  },
  release() { if (R) R.dispose(); R = null; releaseOwl(); },
};
