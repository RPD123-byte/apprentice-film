// s26 fix #2: fit the C/D owl's body egg per source frame to the source owl silhouette (half-res masks
// snapshots/s26b-meas/fit/m/F.bin), with the head placed from the tracked eyes and the wings as fitted (owlCDfit.js)
// held fixed. Score = IoU of (body ∪ wings) against the mask over the rows from 40 px below the eyes down, false
// positives weighted 1.5x (the body must not spill past the silhouette). Measurement only; prints JSON rows
// [F, x, y, a, b, rot, egg].
import { bodyOutline, layeredWing, featherShape, headGeom } from "../../src/lib/owlInk.js";
import { cdPose } from "../../src/shots/s26/owlCD.js";
import { loadMask, raster, MW, MH } from "../s26c-tools/fitlib.mjs";
import fs from "fs";
const PROF = JSON.parse(fs.readFileSync("snapshots/s26-fix2-meas/bodyprof.json"));
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
function wingPolys(w) {
  const W = layeredWing(w), out = W.feathers.map((f) => featherShape(f.root, f.dir, f.L, f.w, W.point));
  const band = [...W.lead]; for (let i = W.lead.length - 1; i >= 0; i--) band.push(add(W.lead[i], W.tr, W.len * 0.16 * (1 - 0.6 * i / W.lead.length)));
  out.push(band); return out;
}
const out = [];
let prev = null;
for (let F = 2791; F <= 2847; F++) {
  const mask = loadMask(F); if (!mask) continue;
  const pose = cdPose(F), H = headGeom(pose.head);
  const eyeY = pose.head.y + 0.25 * pose.head.ry;   // ≈ the eye line
  const yb = PROF[F]?.yb ?? 700, y0 = Math.round(Math.max(eyeY + 40, yb - 95) * 0.5), y1 = Math.round((yb + 12) * 0.5);
  const wingR = raster(pose.wings.flatMap(wingPolys));
  const headR = raster([H.out]);
  const buf = new Uint8Array(MW * MH);
  const score = (b) => {
    const R = raster([bodyOutline({ ...b, sag: 0.05 })], buf);
    let I = 0, U = 0;
    for (let y = y0; y < Math.min(MH, y1 + 20); y++) for (let x = 0; x < MW; x++) {
      const i = y * MW + x; if (headR[i] || wingR[i]) continue;
      const p = R[i], q = y <= y1 ? mask[i] : 0;
      I += p & q; U += (p & q) ? 1 : (p ? 1.5 : q);
    }
    return U ? I / U : 0;
  };
  const B = pose.body;
  const AR = +(process.env.AR || 1.05);
  let v = prev && F !== 2818 ? prev.slice() : [B.x, B.y, B.b, Math.PI / 2];
  const toB = (v) => ({ x: v[0], y: v[1], a: v[2] * AR, b: v[2], rot: v[3], egg: -0.04 });
  let best = score(toB(v)); const s0 = best;
  let steps = [10, 10, 8, 0.08];
  const lo = [-1e9, -1e9, 70, Math.PI / 2 - 0.35], hi = [1e9, 1e9, 135, Math.PI / 2 + 0.35];
  for (let it = 0; it < 6; it++) {
    for (let k = 0; k < 4; k++) for (const d of [1, -1]) {
      let imp = true;
      while (imp) { imp = false; const u = v.slice(); u[k] = Math.max(lo[k], Math.min(hi[k], u[k] + d * steps[k])); const s = score(toB(u)); if (s > best + 1e-5) { best = s; v = u; imp = true; } }
    }
    steps = steps.map((s) => s * 0.55);
  }
  prev = v;
  const b = toB(v); out.push([F, ...[b.x, b.y, b.a, b.b, b.rot].map((x) => +x.toFixed(3))]);
  console.error(F, s0.toFixed(3), "->", best.toFixed(3), v.map((x) => x.toFixed(2)).join(" "));
}
console.log(JSON.stringify(out));
