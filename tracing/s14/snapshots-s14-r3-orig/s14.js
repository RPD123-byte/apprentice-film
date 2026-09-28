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
// Owl: s14/owl.js (front, turn, side) and s14/back.js (from behind, per-frame table). The room: s14/room.js (painted
// layers, packed by s14/paint.js, ink lines traced from the 40.00 frame in s14/strokes.js, per-fill tone gains in
// s14/tone.js and per dolly frame in s14/tone2.js) + s14/gl.js (WebGL compositor: per-layer depth plane, focus of
// expansion, light gain and shutter; since fix pass 1 it also computes the charcoal finish per screen pixel and
// re-strokes every ink line as a vector each frame, so neither magnifies into scribbles as the camera closes in).
import { W, H } from "../config.js";
import { createCompositor } from "./s14/gl.js";
import { buildLayers } from "./s14/room.js";
import { drawOwlAt, releaseOwl } from "./s14/owl.js";
import { FT } from "./s14/tone2.js";

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
  // (fix pass 1: column means at 39.84/39.92 had the render's lit area ~100 px too wide on both sides -> narrower)
  [39.88, 1184, 400, 930, 360, 0.9, 2.2], [39.96, 1150, 400, 1080, 430, 0.95, 2.2], [40.0, 1150, 380, 4000, 3000, 1.0, 2],
];
// build 2: per-layer light as the camera closes in (the desk group passes out of the light, the ceiling planks catch
// it): visible-region mean luma per layer, render vs source, every frame 40.08-40.64 (scratch tool layerratio.py)
// [t, under, deskBase, deskTop, right wall, ceiling, left wall, floor]
const LATE = [[40.08, 1, 1, 1, 1, 1, 1, 1], [40.16, 1, 1, 1, 1, 1.25, 1, 1], [40.24, 1, 1, 1, 1, 1.8, 1, 1], [40.36, 1, 1, 1, 1, 1.8, 1, 1], [40.44, 0.92, 0.97, 1.02, 1, 1.8, 1, 1],
  [40.48, 0.75, 0.92, 1.0, 0.92, 1.8, 1.02, 1.03], [40.52, 0.7, 0.85, 0.96, 0.95, 1.8, 1.04, 1.06], [40.56, 0.7, 0.72, 0.9, 1.05, 1.8, 1.07, 1.08], [40.6, 0.7, 0.66, 0.85, 1.14, 1.8, 1.07, 1.1],
  [40.64, 0.4, 0.4, 0.82, 1.24, 1.8, 1.08, 1.12], [40.72, 0.4, 0.4, 0.82, 1.24, 1.8, 1.08, 1.12]];
// the desk group's shutter (the rest of the room keeps 0.3 of a frame)
// (fix pass 1: review 1 found the source's desk crisp through 40.60, its smear only at 40.64: the cables slung over
// the plank ghosted into parallel copies with a 0.3-frame shutter early in the move)
const SHUT = [[40.0, 0.08], [40.6, 0.08], [40.64, 0.4], [40.72, 0.4]];
// the desk group's vertical focus of expansion (see room.js LAYERS): fitted per frame from the plank's front face
const DESK_CY = [[40.0, 626], [40.2, 624], [40.32, 614], [40.44, 614], [40.52, 608], [40.6, 600], [40.64, 597.5], [40.72, 596]];
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
const GAP_CURVE = [1.45, 1.9];
const DOLLY_CURVE = [1.15, 1.12, 1];
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

// fix pass 1: per-fill tone gains for this frame (s14/tone2.js, fitted per source frame of the dolly; the gap view
// before 40.0 holds the 40.00 column)
function fillGains(t) {
  const T = FT.t, n = T.length;
  let k = 0, f = 0;
  if (t >= T[n - 1]) { k = n - 2; f = 1; } else if (t > T[0]) { k = Math.min(n - 2, Math.floor((t - T[0]) / 0.04 + 1e-6)); f = Math.max(0, Math.min(1, (t - T[k]) / (T[k + 1] - T[k]))); }
  const out = {};
  for (const [name, ids] of Object.entries(FT.g)) {
    const a = new Float32Array(256).fill(1);
    for (const id in ids) { const v = ids[id]; a[+id] = v[k] + (v[k + 1] - v[k]) * f; }
    out[name] = a;
  }
  return out;
}

let R = null;
function room() {
  if (R) return R;
  const comp = createCompositor(W, H);
  for (const L of buildLayers()) comp.addLayer(L.pk, L.rect, L.plane, L.name, L.blurK ?? 1, L.slices ?? 1, L.fin);
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
      // build 2: in the gap view the source keeps everything below the desk plank dark (the spill of the lit room
      // stops at the plank); the under-desk layers were toned for the lit room at 40.08, so dim them here
      // (fix pass 1: the source stays black below the plank until ~39.84: 2-7 luma at 38.00 x 1250-1400, y 480-520,
      // 12 at 38.96 x 1150 -> deeper dimming, held longer)
      const kd = Math.max(0, Math.min(1, (th - 39.84) / 0.12));
      // fix pass 1: the synth reads nearly black in the gap view (33 vs 60 at 38.00, x 1650-1700, y 360-420): lift it
      const Gmap = { under: 0.08 + 0.92 * kd, deskBase: 0.25 + 0.75 * kd, floor: 0.35 + 0.65 * kd, synth: 1.8 - 0.8 * Math.max(0, Math.min(1, (th - 39.8) / 0.16)) };
      // fix pass 1: the gap view's highlights were compressed (inside the lit gap p50/p95/p99 28/93/111 against the
      // source's 21/119/142 at 38.00): a highlight-expanding curve before the grade (gapstats.py)
      // (full strength while the gap is small and dim, about half once the zoom has opened it: gapstats.py)
      const curve = [GAP_CURVE[0], GAP_CURVE[1], lerpTab([[38.6, 1], [39.2, 0.45], [39.84, 0.45], [39.96, 0]], th)[0]];
      // the lamp's halo (inside the gap mask, so it never spills into the dark): a soft glow round the slab
      const glow = [a * 1672 + bx, a * 385 + by, 120 * a, 0.12 * (1 - Math.max(0, Math.min(1, (th - 39.84) / 0.12)))];
      img = comp.render({ ds: [0], C, sim, Fmap: fillGains(40.0), mask: [a * gx + bx, a * gy + by, a * rx, a * ry, 0.86, 1.12, pw], gain: gain * 1.12 * GAP_LIFT, tilt, Gmap, curve, glow, curve0: DOLLY_CURVE });
      ctx.save(); ctx.filter = th > 39.7 ? "blur(0.8px)" : "none"; ctx.drawImage(img, 0, 0); ctx.restore();
      beam(ctx, sim, th < 39.9 ? 1 - Math.max(0, (th - 39.5) / 0.4) : 0);
    } else {
      const d = dollyAt(t);
      // shutter: the last ~0.3 frame of travel, always 5 samples (no pops as the speed changes); each layer smears
      // by its own blurK (the near desk fully, the far walls a little)
      let dv = d - dollyAt(t - 0.04);
      if (dv < 1e-4) dv = (d - dollyAt(t - 0.08)) / 2;       // a held source frame keeps the previous frame's smear
      // build 2: the source's own blur is not steady: the plank is crisp at 40.48-40.60 (vertical gradient energy
      // 6.6-8.3 against 3.9-4.6 with a steady shutter) and smeared at 40.64
      const shut = lerpTab(SHUT, t)[0];
      const d0 = d - dv * 0.3;
      // (fix pass 1: at 40.64 the desk smears ~80 px; 5 crisp sub-samples read as ghost copies: 14 there)
      const ns = t > 40.62 ? 14 : 5;
      const ds = Array.from({ length: ns }, (_, i) => d0 + (d - d0) * (i / (ns - 1)));
      // the source room is still coming up at 40.00-40.04: the frame's lower corners and bottom are dark (ratio to
      // the lit room at 40.08 ~0.3 at the bottom, ~0.3-0.7 at the side edges) and clear by 40.08
      const vig = t < 40.02 ? [1150, 420, 1250, 450, 0.72, 1.22, 2.2] : t < 40.06 ? [1150, 420, 1450, 560, 0.72, 1.22, 2.2] : null;
      const cy = lerpTab(DESK_CY, t)[0], Cd = [1105, cy];
      // build 2: the source keeps brightening as the camera closes in (frame means 1.4% over the render at 40.08,
      // ~6% by 40.24-40.60 with the room toned at 40.08-40.24)
      const lift = LIFT * (1 + 0.06 * Math.max(0, Math.min(1, (t - 40.16) / 0.16)));
      const [gU, gB, gT, gR, gC, gL, gF] = lerpTab(LATE, t);
      const early = t < 40.46;
      // fix pass 1: at 40.64 the source's plank reaches x ~1575 at its left end and y ~162 at its top (plank.py): the
      // desk group is a hair closer than the room's dolly fit gives (d 0.556 against 0.549)
      // (the smear then sits on the far side of that position: the plank's left end reads at ~1560-1595, not trailing
      // back to ~1520 as a full 0.4-frame shutter behind it put it)
      const dd = t > 40.62 ? 0.010 : 0;
      const kLate = t > 40.62 ? 0.56 * 0.3 / shut : 1;
      // fix pass 1: inside regions the room was flatter than the source (p95 186-215 against 201-222 with the region
      // means fitted): a mild highlight-expanding curve before the grade
      img = comp.render({ ds, d0: d, C, sim: [1, 0, 0], mask: vig, Fmap: fillGains(t), curve: DOLLY_CURVE, Dmap: { deskTop: dd, deskBase: dd, under: dd }, gain: lift, Cmap: { deskTop: Cd, deskBase: Cd, under: Cd },
        Gmap: { under: gU, deskBase: gB, deskTop: gT, right: gR, ceiling: gC, left: gL, floor: gF },
        // fix pass 1: the source is crisp under the desk and on the synth early in the move (|Laplacian| 4.1-4.5 under the
        // desk at 40.08-40.24): little smear there before 40.46; from 40.48 all desk layers share SHUT (crisp to 40.60)
        Bmap: early ? { deskTop: shut / 0.3, deskBase: 0.35, under: 0.3, synth: 0.25 } : { deskTop: kLate * shut / 0.3, deskBase: kLate * 0.9 * shut / 0.3, under: kLate * 0.8 * shut / 0.3, synth: 0.8 * shut / 0.3 } });
      // the source room is soft painted ink (fix pass 1: the per-pixel finish printed crisper than the source, left-half
      // |Laplacian| 5.6 against 3.9 at 40.00; a 0.7 px softening brings it to ~4.1)
      ctx.save(); ctx.filter = "blur(0.7px)"; ctx.drawImage(img, 0, 0); ctx.restore();
    }
    drawOwlAt(ctx, t);
  },
  release() { if (R) R.dispose(); R = null; releaseOwl(); },
};
