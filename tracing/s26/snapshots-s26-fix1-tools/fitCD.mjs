// Fit the kit owl's body + layered wings (+ tail) per source frame to the source owl silhouette (masks from the
// previous pass: snapshots/s26b-meas/fit/m/F.bin, half res; they exclude the headphones, the feet and the dark crown).
// The head is placed from the tracked eyes and not fitted; its area is ignored in the score.
// Writes src/shots/s26/owlCDfit.js. Measurement only (numbers).  Usage: node fitCD.mjs [F0 F1]
import fs from "fs";
import { headGeom, bodyOutline, tuftShape, layeredWing, featherShape, tailShape } from "../../src/lib/owlInk.js";
import { cdPose, rigPose, CD_F0, CD_F1 } from "../../src/shots/s26/owlCD.js";
import { loadMask, raster, MW, MH } from "../s26c-tools/fitlib.mjs";

const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k], sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const nrm = (a) => { const L = Math.hypot(a[0], a[1]) || 1; return [a[0] / L, a[1] / L]; };
function wingPolys(w) {
  const W = layeredWing(w), out = W.feathers.map((f) => featherShape(f.root, f.dir, f.L, f.w, W.point));
  const band = [...W.lead]; for (let i = W.lead.length - 1; i >= 0; i--) band.push(add(W.lead[i], W.tr, W.len * 0.16 * (1 - 0.6 * i / W.lead.length)));
  out.push(band);
  return out;
}
function silhouette(pose, { head = true } = {}) {
  const H = headGeom(pose.head), polys = [bodyOutline(pose.body)];
  if (head) { polys.push(H.out); for (const t of pose.tufts || []) polys.push(tuftShape(H, t).pts); }
  for (const w of pose.wings) polys.push(...wingPolys(w));
  if (pose.tail) for (const f of tailShape(pose.tail)) polys.push(f);
  return polys;
}
import { inPoly } from "../../src/lib/owlInk.js";
function score(pose, mask, ign) {
  const R = raster(silhouette(pose, { head: false }));
  let I = 0, U = 0;
  for (let i = 0; i < R.length; i++) { if (ign[i]) continue; const p = R[i], q = mask[i]; I += p & q; U += p | q; }
  // the body must not climb into the face: penalise body outline points inside the (shrunk) head outline
  const H = headGeom(pose.head), hs = H.out.map(([x, y]) => [H.x + (x - H.x) * 0.8, H.y + (y - H.y) * 0.8]);
  const bo = bodyOutline(pose.body); let n = 0; for (const q of bo) if (inPoly(q, hs)) n++;
  return (U ? I / U : 0) - 0.08 * n / bo.length;
}
// parameter vector <-> pose
const KEYS = [];
for (const s of [0, 1]) for (const k of ["S0", "S1", "Wr0", "Wr1", "T0", "T1", "tr", "len", "spread"]) KEYS.push(`w${s}.${k}`);
KEYS.push("b.x", "b.y", "b.a", "b.b", "b.rot", "t.bx", "t.by", "t.tx", "t.ty", "t.w");
function toVec(fit) {
  const v = [];
  for (const w of fit.wings) v.push(w.S[0], w.S[1], w.Wr[0], w.Wr[1], w.T[0], w.T[1], Math.atan2(w.trail[1], w.trail[0]), w.len, w.spread);
  const b = fit.body; v.push(b.x, b.y, b.a, b.b, b.rot);
  const t = fit.tail; v.push(t.base[0], t.base[1], t.tip[0], t.tip[1], t.w);
  return v;
}
function fromVec(v) {
  const wings = [0, 1].map((s) => { const o = s * 9; return { S: [v[o], v[o + 1]], Wr: [v[o + 2], v[o + 3]], T: [v[o + 4], v[o + 5]], trail: [Math.cos(v[o + 6]), Math.sin(v[o + 6])], len: v[o + 7], spread: v[o + 8] }; });
  const body = { x: v[18], y: v[19], a: v[20], b: v[21], rot: v[22] };
  const tail = { base: [v[23], v[24]], tip: [v[25], v[26]], w: v[27], n: 3 };
  return { wings, body, tail };
}
const STEP = [8, 8, 12, 12, 16, 16, 0.12, 10, 0.1, 8, 8, 12, 12, 16, 16, 0.12, 10, 0.1, 6, 6, 8, 8, 0.08, 10, 10, 12, 12, 4];
const LO = { len: 40, spread: 0.3, a: 60, b: 50, w: 10 }, HI = { len: 260, spread: 1.0 };
function clampVec(v) {
  for (const s of [0, 1]) { const o = s * 9; v[o + 7] = Math.max(LO.len, Math.min(HI.len, v[o + 7])); v[o + 8] = Math.max(LO.spread, Math.min(HI.spread, v[o + 8])); }
  v[20] = Math.max(LO.a, v[20]); v[21] = Math.max(LO.b, v[21]); v[27] = Math.max(LO.w, Math.min(60, v[27]));
  return v;
}
// initial fit from the rig pose: the kit's primaries reach ~len past T, so pull T (and Wr) back along the hand
function initFit(F, prev) {
  if (prev) return JSON.parse(JSON.stringify(prev));
  const P = rigPose(F);
  const wings = P.wings.map((w, i) => {
    const hand = nrm(sub(w.T, w.Wr)), len = Math.max(60, w.sec * 0.85);
    return { S: w.S, Wr: w.Wr, T: add(w.T, hand, -len * 0.75), trail: [Math.cos(w.trail), Math.sin(w.trail)], len, spread: 0.85 };
  });
  const b = P.body; let rot = b.rot - Math.PI / 2; if (Math.sin(rot) < 0) rot += Math.PI;
  const body = { x: b.x, y: b.y, a: b.ry, b: b.rx, rot };
  const ax = [Math.cos(rot), Math.sin(rot)];
  const tail = { base: add([b.x, b.y], ax, b.ry * 0.55), tip: add([b.x, b.y], ax, b.ry * 1.1), w: 30, n: 3 };
  return { wings, body, tail };
}
function fitFrame(F, init, iters = 5, frozen = new Set()) {
  const mask = loadMask(F); if (!mask) return null;
  const base = cdPose(F, init);
  const H = headGeom(base.head);
  // ignore the head (+ tufts) and the region above the head top (band / crown) in the score
  const ign = raster([H.out.map(([x, y]) => [x + (x - H.x) * 0.12, y + (y - H.y) * 0.12]), ...(base.tufts || []).map((t) => tuftShape(H, t).pts)]);
  let v = toVec(init), best = score(cdPose(F, fromVec(v)), mask, ign);
  const s0 = best;
  let steps = STEP.slice();
  for (let it = 0; it < iters; it++) {
    for (let k = 0; k < v.length; k++) {
      if (frozen.has(k)) continue;
      for (const d of [1, -1]) {
        let improved = true;
        while (improved) {
          improved = false;
          const u = v.slice(); u[k] += d * steps[k]; clampVec(u);
          const sc = score(cdPose(F, fromVec(u)), mask, ign);
          if (sc > best + 1e-5) { best = sc; v = u; improved = true; }
        }
      }
    }
    steps = steps.map((s) => s * 0.55);
  }
  return { fit: fromVec(v), iou: best, iou0: s0 };
}
const args = process.argv.slice(2).map(Number);
const F0 = args[0] || CD_F0, F1 = args[1] || CD_F1;
const out = fs.existsSync("snapshots/s26-fix1-meas/cdfit.json") ? JSON.parse(fs.readFileSync("snapshots/s26-fix1-meas/cdfit.json")) : {};
// C: from 2795 forward, then 2794..2791 backward (the rig's left wing is collapsed there: start from 2795's fit);
// D: from 2818 forward (a new pose after the cut)
const order = [];
for (let F = Math.max(F0, 2795); F <= Math.min(F1, 2817); F++) order.push([F, F === 2795 ? null : F - 1]);
for (let F = Math.min(F1, 2794); F >= F0; F--) order.push([F, F + 1]);
for (let F = Math.max(F0, 2818); F <= F1; F++) order.push([F, F === 2818 ? null : F - 1]);
for (const [F, pF] of order) {
  const prev = pF && out[pF] ? out[pF].fit : null;
  let init = initFit(F, prev);
  // for the collapsed-wing frames keep this frame's own right wing / body from the rig, left wing from the neighbour
  // (the masks of 2791-2794 miss the blurred left wing: it is held from 2795's fit, moved with the rig body, and frozen)
  let frozen = new Set();
  if (F <= 2794 && out[2795]) {
    const own = initFit(F, null), w0 = out[2795].fit.wings[0], b0 = rigPose(2795).body, b1 = rigPose(F).body, dx = b1.x - b0.x, dy = b1.y - b0.y;
    const mv = (p) => [p[0] + dx, p[1] + dy];
    init = { ...own, wings: [{ ...w0, S: mv(w0.S), Wr: mv(w0.Wr), T: mv(w0.T) }, own.wings[1]] };
    frozen = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  }
  const r = fitFrame(F, init, 5, frozen);
  if (!r) continue;
  // also try from the rig init and keep the better
  if (prev && F > 2794) { const r2 = fitFrame(F, initFit(F, null)); if (r2 && r2.iou > r.iou) Object.assign(r, r2); }
  if (F <= 2794) { const i2 = loadMask(F); }
  out[F] = { fit: r.fit, iou: +r.iou.toFixed(4), iou0: +r.iou0.toFixed(4) };
  console.log(F, "IoU", r.iou0.toFixed(3), "->", r.iou.toFixed(3));
  fs.writeFileSync("snapshots/s26-fix1-meas/cdfit.json", JSON.stringify(out));
}
