// s19 owl: picks the phase for the source frame and draws it. Beats (source frame times, read at 0.04 s):
//   57.40–57.96  tumbles in from the right rolled into a ball, rolling left (ball.js)
//   58.00–58.04  lands head-down, tail up (the source repeats 58.00 at 58.04)
//   58.08–58.24  tips forward onto its belly and skids left, wings and tail splayed on the floor
//   58.28–58.40  pushes itself up into a sit, back to us, head turned right to the card
//   58.40–59.56  sits looking up at the card; the headphones have slipped down round its neck
//   59.60–59.92  leans right and bows, one wing sweeping down along the floor (dusting off); the headphones
//                ride back up onto the head
//   59.96–60.20  straightens, the wing sweeps back
//   60.20–61.04  stands looking up at the card
//   61.04–61.40  steps right to the middle of the card and throws its wings open
//   61.44–62.24  lifts the card, wings up, swaying left then right with it
//   62.28–63.08  turns three-quarter to the right and carries the card off to the right (carry.js)
import { drawBall, ballShadow, releaseBall } from "./ball.js";
import { drawCarry, releaseCarry } from "./carry.js";
import { smooth } from "../../../lib/rng.js";
import { backLayer as back2Layer, lerpPose as lerp2, shiftPose, transformPose, rotateHead } from "./back2.js";
import * as NP from "./poses.js";
import { FIT } from "./posefit.js";

// segments drawn with the new painter (back2.js, absolute frame px poses in poses.js): [t0, t1, key rows]
// key rows [t, pose, dx, dy]: pose at that frame, shifted; interpolated between rows
const NEW = [
  [57.94, 62.30, [
    // (fix pass 4: every landing frame is its own measured key, no pose fit: the body steps left 70, 55, 53, 52, 55 px
    // a frame, the band stays a C round the head at the right end)
    [57.96, "L96", 0, 0], [58.00, "L00", 0, 0], [58.04, "L00", 0, 0], [58.08, "L08", 0, 0], [58.12, "L12", 0, 0], [58.16, "L16", 0, 0], [58.20, "L20", 0, 0],
    [58.24, "L24", 0, 0], [58.28, "RISE", 0, 0], [58.36, "RISE2", 0, 0],
    // the sit: the head settles (ECC on the head, relative to the 58.80 key: +10° at 58.48 .. 0 at 58.84, then tips
    // back clockwise +2.7° by 59.20 and +4.4° at 59.56)
    [58.44, "SIT", 0, 0, 1, { hrot: 0.2 }], [58.48, "SIT", 0, 0, 1, { hrot: 0.176 }], [58.52, "SIT", 0, 0, 1, { hrot: 0.068 }], [58.60, "SIT", 0, 0, 1, { hrot: 0.031 }],
    [58.72, "SIT", 0, 0, 1, { hrot: 0.012 }], [58.84, "SIT", 0, 0], [58.96, "SIT", 0, 0], [59.08, "SIT", 0, 0, 1, { hrot: 0.028 }], [59.20, "SIT", 0, 0, 1, { hrot: 0.047 }],
    [59.48, "SIT", 0, 0, 1, { hrot: 0.047 }], [59.56, "SIT", 0, 0, 1, { hrot: 0.077 }], [59.64, "BOW1", 0, 0], [59.72, "BOW2", 0, 0], [59.80, "BOW3", 0, 0], [59.88, "BOW4", 0, 0],
    [59.96, "UP1", 0, 0], [60.04, "UP2", 0, 0], [60.12, "UP3", 0, 0],
    // the stand: a little settle of the head and body (ECC relative to the 60.60 key)
    [60.20, "STAND", -4.8, 2.2, 1, { hrot: -0.061 }], [60.24, "STAND", -4.8, 2.2, 1, { hrot: -0.061 }], [60.28, "STAND", -1.6, 0.6, 1, { hrot: -0.024 }],
    [60.40, "STAND", 2.2, -1.4, 1, { hrot: 0.037 }], [60.52, "STAND", 0.4, -0.3, 1, { hrot: 0.01 }], [60.64, "STAND", 0, 0], [61.04, "STAND", 0, 0],
    // the throw (re-timed on the source, fix pass 3): the wings start to open at 61.08, are out level (motion-blurred) at
    // 61.12 and raised in a V from 61.16; the owl is still stepping right (shadow and feet: ≈ -20 px at 61.12, -8 at 61.16
    // relative to where OPEN / SPREAD were fitted; overlays at 61.12, 61.16 and 61.40: -45, -42 and -15 px)
    [61.08, "STEP", 0, 0, 1, { wblur: 0.1 }], [61.12, "OPEN", -45, 0, 1, { wblur: 0.07 }], [61.16, "SPREAD0", -42, 0], [61.24, "SPREAD", -15, 0], [61.44, "SPREAD", -15, 0], [61.52, "LIFT1", 0, 0],
    [61.56, "LIFT1", 0, 0], [61.64, "LIFT2", 0, 0], [61.76, "LIFT3", 0, 0], [61.92, "LIFT4", 0, 0], [62.00, "LIFT4", 0, 0],
    [62.04, "LIFT5", 0, 0], [62.16, "LIFT6", 0, 0], [62.24, "LIFT7", 0, 0], [62.28, "LIFT8", 0, 0],
  ]],
];
// dev hook: the fitting harness sets a per-key extra offset (never set in the film)
let ADJ = null;
export function setOwlAdjust(a) { ADJ = a; cache2.clear(); }
const deep = (a, b) => { if (!b) return a; if (Array.isArray(b) || typeof b !== "object" || a == null || typeof a !== "object") return b; const o = Array.isArray(a) ? a.slice() : { ...a }; for (const k of Object.keys(b)) o[k] = deep(a[k], b[k]); return o; };
const rowPose = (r) => {
  let [t, name, dx = 0, dy = 0, sc = 1, over = null] = r;
  let base = NP[name];
  if (over) base = deep(base, over);
  const fit = FIT[name];
  if (fit && !(ADJ && ADJ.__nofit)) {
    base = deep(base, fit.over || {});
    // the fitted head factors also absorbed the cups and crest (they are part of the silhouette): keep the head round
    if (base.head && base.head.k) base = deep(base, { head: { k: base.head.k.map((v) => Math.min(1.06, Math.max(0.92, v))) } });
    base = transformPose(base, fit.d[0], fit.d[1], fit.d[2]);
  }
  const q = ADJ && ADJ[name];
  if (q) { const d = Array.isArray(q) ? q : q.d || [0, 0, 1]; dx += d[0]; dy += d[1]; sc *= d[2] ?? 1; if (q.over) base = deep(base, q.over); }
  let pose = transformPose(base, dx, dy, sc);
  if (over && over.hrot) pose = rotateHead(pose, over.hrot);
  return withLegs(pose, name, dx, dy);
};
// standing keys get their measured legs (absolute frame px); the body's bottom is lifted to sit just below where the
// legs leave the feathers (the source shows 30–45 px of tarsus; the silhouette fits had pulled the body down over it)
function withLegs(p, name, dx = 0, dy = 0) {
  const L = NP.LEGS[name], NW = NP.NEARWING[name];
  if (!L && !NW) return p;
  const o = JSON.parse(JSON.stringify(p));
  if (NW) o.wings[0] = shiftPose({ head: { x: 0, y: 0 }, wings: [JSON.parse(JSON.stringify(NW))] }, dx, dy).wings[0];
  if (!L) return o;
  o.legs = L.map((l) => { const q = l.slice(); q[0] += dx; q[1] += dy; q[2] += dy; return q; });
  const vis = L.filter((l) => l[6] > 0.5);
  if (vis.length) {
    const target = Math.max(...vis.filter((l) => !(l[5] > 0.5)).map((l) => l[2]), 0) + dy + 8, b = o.body, k = (b.k || [1, 1, 1, 1, 1, 1, 1, 1]).slice();
    const bottom = b.y + b.ry * k[2];
    if (bottom > target) {
      const f = Math.max(0.72, (target - b.y) / (b.ry * k[2]));
      k[2] *= f; k[1] *= 0.5 + 0.5 * f; k[3] *= 0.5 + 0.5 * f; b.k = k;
      const dy = (bottom - (b.y + b.ry * k[2]));
      if (o.tail) { o.tail.base = [o.tail.base[0], o.tail.base[1] - dy]; o.tail.tip = [o.tail.tip[0], o.tail.tip[1] - dy]; }
    }
  }
  return o;
}
const rowKey = (r) => { const q = ADJ && ADJ[r[1]]; return JSON.stringify(r.slice(1)) + (q ? "|" + JSON.stringify(q) : ""); };
function newState(t) {
  for (const [t0, t1, rows] of NEW) {
    if (t < t0 - 1e-6 || t > t1) continue;
    if (t <= rows[0][0]) return { pose: rowPose(rows[0]), key: rowKey(rows[0]) };
    for (let i = 1; i < rows.length; i++) if (t <= rows[i][0] + 1e-6) {
      const a = rows[i - 1], b = rows[i], u = (t - a[0]) / (b[0] - a[0]);
      if (Math.abs(t - b[0]) < 1e-6) return { pose: rowPose(b), key: rowKey(b) };
      if (rowKey(a) === rowKey(b)) return { pose: rowPose(a), key: rowKey(a) };
      return { pose: lerp2(rowPose(a), rowPose(b), a[1] === b[1] ? u : smooth(u)), key: null };
    }
    const z = rows[rows.length - 1]; return { pose: rowPose(z), key: rowKey(z) };
  }
  return null;
}
const cache2 = new Map();
let DYN2 = null;
function newLayer(st) {
  if (!st.key) { if (!DYN2) DYN2 = document.createElement("canvas"); return back2Layer(st.pose, DYN2); }
  if (!cache2.has(st.key)) { if (cache2.size > 8) cache2.delete(cache2.keys().next().value); cache2.set(st.key, back2Layer(st.pose)); }
  return cache2.get(st.key);
}
export function drawOwl19(ctx, t) {
  if (t < 57.38) return;
  if (t < 57.94) return drawBall(ctx, t);
  // (fix pass 4: the back view holds through 62.28, turned three-quarter; the carry drawing takes over at 62.32)
  if (t < 62.30) {
    const ns = newState(t);
    if (ns) { const L = newLayer(ns); ctx.drawImage(L.canvas, L.x, L.y, L.w, L.h); }
    return;
  }
  drawCarry(ctx, t);
}
// the owl's dark pool on the lit floor (only while the card stands)
export function owlShadow19(t) {
  if (t < 57.46) return null;
  if (t < 57.98) return ballShadow(t);
  if (t < 62.30) {
    const ns = newState(t); if (!ns) return null;
    const b = ns.pose.body, ft = (ns.pose.feet || []).filter((f) => (f.a ?? 1) > 0.5);
    const base = ft.length ? Math.max(...ft.map((f) => f.y)) + 6 : b.y + b.ry;
    return { x: b.x, y: Math.max(815, Math.min(870, base)), w: b.rx * 0.8, a: 1 };
  }
  return null;
}
export function releaseOwl19() { releaseBall(); releaseCarry(); cache2.clear(); DYN2 = null; }
