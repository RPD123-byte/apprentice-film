// IoU of the painter silhouette in C/D for a range of skull scales rk (scratch)
import { colourSilhouette } from "../../src/shots/s26/owlColour.js";
import { unpack, headGeom } from "../../src/shots/s26/rig.js";
import { POSES_C, POSES_C_KEYS } from "../../src/shots/s26/posesC.js";
import { POSES_D, POSES_D_KEYS } from "../../src/shots/s26/posesD.js";
import { loadMask, raster, iou } from "./fitlib.mjs";
const C_BASE = { head: { x: 0, y: 0, r: 90, rot: 0, yaw: -0.3, tuft: 0.4 }, body: { x: 0, y: 0, rx: 100, ry: 100, rot: 0 }, wings: [{ S: [0, 0], Wr: [0, 0], T: [0, 0], trail: 2, sec: 120 }, { S: [0, 0], Wr: [0, 0], T: [0, 0], trail: 1, sec: 120 }], feet: [{ x: 0, y: 0, ang: 0, size: 58 }, { x: 0, y: 0, ang: 0, size: 58 }] };
function rigToPainter(P, rk = 1) {
  const G = headGeom(P.head), yaw = P.head.yaw ?? 0;
  const [a, b] = G.eyes.map((e) => e.c), d = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const sp = 0.435 + 0.03 * Math.abs(yaw), r = d / (2 * sp) * rk;
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], ex = 0.12 * yaw * r, ey = 0.1 * r;
  const cx = mid[0] - (ex * Math.cos(ang) - ey * Math.sin(ang)), cy = mid[1] - (ex * Math.sin(ang) + ey * Math.cos(ang));
  const loc = (p) => { const dx = p[0] - cx, dy = p[1] - cy, c = Math.cos(-ang), s = Math.sin(-ang); return [(dx * c - dy * s) / r, (dx * s + dy * c) / r]; };
  const cupL = G.cups.find((q) => q.k === -1), cupR = G.cups.find((q) => q.k === 1);
  return { head: { x: cx, y: cy, r, rot: ang, yaw }, fx: { eyeSp: sp / rk, cupL: loc(cupL.c), cupR: loc(cupR.c) } };
}
const sets = [[POSES_C, POSES_C_KEYS, -0.3], [POSES_D, POSES_D_KEYS, 0.3]];
for (const rk of [0.8, 0.85, 0.9, 0.95, 1.0, 1.05]) {
  let t = 0, n = 0, tr = 0;
  for (const [PS, K, yaw] of sets) for (const F of Object.keys(PS).map(Number)) {
    const m = loadMask(F); if (!m) continue;
    const P = unpack(K, PS[F], { ...C_BASE, head: { ...C_BASE.head, yaw } });
    const R = raster((() => { const q = JSON.parse(JSON.stringify(P)); const { head, fx } = rigToPainter(q, rk); q.head = head; q.feet = q.feet.map((f) => ({ ...f, size: 34 })); return colourSilhouette(q, fx); })());
    t += iou(R, m); n++;
  }
  console.log("rk", rk, "mean IoU", (t / n).toFixed(3));
}
