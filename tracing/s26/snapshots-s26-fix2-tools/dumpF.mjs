import { unpack } from "../../src/shots/s26/rig.js";
import { POSES_F, POSES_F_KEYS } from "../../src/shots/s26/posesF.js";
import { FEAT_F, FEAT_F_KEYS } from "../../src/shots/s26/featF.js";
const B = { head: { x: 0, y: 0, r: 100, rot: 0, yaw: 0 }, body: { x: 0, y: 0, rx: 100, ry: 100, rot: 0 },
  wings: [{ S: [0, 0], Wr: [0, 0], T: [0, 0], trail: 2, sec: 120 }, { S: [0, 0], Wr: [0, 0], T: [0, 0], trail: 1, sec: 120 }],
  feet: [{ x: 0, y: 0, ang: 0, size: 40 }, { x: 0, y: 0, ang: 0, size: 40 }] };
for (const F of process.argv.slice(2).map(Number)) {
  const P = unpack(POSES_F_KEYS, POSES_F[F], B), Q = unpack(FEAT_F_KEYS, FEAT_F[F], {});
  const r = (v) => Array.isArray(v) ? v.map((x) => Math.round(x)) : Math.round(v);
  console.log(F, "wings", JSON.stringify(P.wings.map((w) => ({ S: r(w.S), Wr: r(w.Wr), T: r(w.T), trail: +w.trail.toFixed?.(2) || w.trail, sec: r(w.sec) }))),
    "feet", JSON.stringify(Q.feet.map((f) => [r(f.x), r(f.y), r(f.size ?? 0)])), "body", JSON.stringify(Q.body && [r(Q.body.x), r(Q.body.y), r(Q.body.rx), r(Q.body.ry)]), "head", JSON.stringify([r(Q.head.x), r(Q.head.y), r(Q.head.r)]));
}
