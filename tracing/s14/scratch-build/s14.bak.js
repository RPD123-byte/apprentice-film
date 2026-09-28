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
const GAP = [
  [36.9, 1200, 398, 500, 232, 0.48], [38.5, 1200, 398, 500, 232, 0.5], [38.8, 1200, 398, 500, 235, 0.58], [39.2, 1200, 400, 505, 240, 0.68],
  [39.6, 1200, 398, 510, 252, 0.72], [39.72, 1210, 396, 560, 262, 0.76], [39.8, 1225, 392, 625, 262, 0.8], [39.88, 1180, 372, 900, 390, 0.93],
  [39.96, 1150, 380, 1400, 700, 1.0], [40.0, 1150, 380, 4000, 3000, 1.0],
];
const lerpTab = (T, t) => {
  if (t <= T[0][0]) return T[0].slice(1);
  for (let i = 1; i < T.length; i++) if (t <= T[i][0]) { const a = T[i - 1], b = T[i], f = (t - a[0]) / (b[0] - a[0]); return a.slice(1).map((v, k) => v + (b[k + 1] - v) * f); }
  return T[T.length - 1].slice(1);
};
const rowAt = (T, t) => { let r = T[0]; for (const x of T) if (x[0] <= t + 1e-4) r = x; return r; };

// room image -> frame similarity before 40.0 s
function roomSim(t) {
  const [s, tx, ty] = t < 38.48 ? [1, 0, 0] : rowAt(ZOOM, t).slice(1);
  const a = s / Z40[0];
  return [a, tx - a * Z40[1], ty - a * Z40[2]];
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
  for (const L of buildLayers()) comp.addLayer(L.canvas, L.rect, L.plane, L.name);
  R = comp;
  return R;
}

// the faint spill of the gap's light across the floor toward the owl (luma 5–8 in the source)
function beam(ctx, sim, k) {
  if (k <= 0) return;
  const [a, bx, by] = sim;
  const P = ([x, y]) => [a * x + bx, a * y + by];
  const g0 = P([700, 560]), g1 = P([1500, 580]);
  ctx.save();
  ctx.globalAlpha = k;
  ctx.filter = "blur(40px)";
  const grd = ctx.createLinearGradient(g0[0], g0[1], 500, 900);
  grd.addColorStop(0, "rgba(11,11,11,1)"); grd.addColorStop(1, "rgba(7,7,7,1)");
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.moveTo(g0[0], g0[1]); ctx.lineTo(g1[0], g1[1]); ctx.lineTo(1150, 946); ctx.lineTo(560, 946); ctx.lineTo(420, 860); ctx.closePath(); ctx.fill();
  ctx.restore();
}

export const shot = {
  draw(ctx, local, t) {
    t = Math.ceil(t * 25 - 1e-6) / 25;          // hold each 25 fps source frame
    const comp = room();
    let img;
    if (t < 40.0 - 1e-6) {
      const sim = roomSim(t);
      const [gx, gy, rx, ry, gain] = lerpTab(GAP, t);
      const [a, bx, by] = sim;
      // the gap is lit from its right (the glowing monitor): its plateau gain climbs ~25% across it (maskprof.py)
      const tilt = 0.25 * Math.max(0, Math.min(1, (39.96 - t) / 0.2));
      img = comp.render({ ds: [0], C, sim, mask: [a * gx + bx, a * gy + by, a * rx, a * ry, 0.86, 1.12], gain: gain * 1.12, tilt });
      ctx.drawImage(img, 0, 0);
      beam(ctx, sim, t < 39.9 ? 1 - Math.max(0, (t - 39.5) / 0.4) : 0);
    } else {
      const d = dollyAt(t);
      // shutter: the last ~0.3 frame of travel; only the fast end of the move smears (desk, left shelves)
      let dv = d - dollyAt(t - 0.04);
      if (dv < 1e-4) dv = (d - dollyAt(t - 0.08)) / 2;       // a held source frame keeps the previous frame's smear
      const d0 = d - dv * 0.3, n = d > 0.44 ? 5 : d > 0.3 ? 3 : 1;
      const ds = n === 1 ? [d] : Array.from({ length: n }, (_, i) => d0 + (d - d0) * (i / (n - 1)));
      img = comp.render({ ds, C, sim: [1, 0, 0], mask: null, gain: 1 });
      ctx.drawImage(img, 0, 0);
    }
    drawOwlAt(ctx, t);
  },
  release() { if (R) R.dispose(); R = null; releaseOwl(); },
};
