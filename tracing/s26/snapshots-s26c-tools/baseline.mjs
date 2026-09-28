import { rigSilhouette, unpack } from "../../src/shots/s26/rig.js";
import { POSES_C, POSES_C_KEYS } from "../../src/shots/s26/posesC.js";
import { POSES_D, POSES_D_KEYS } from "../../src/shots/s26/posesD.js";
import { POSES_F, POSES_F_KEYS } from "../../src/shots/s26/posesF.js";
import { loadMask, raster, iou } from "./fitlib.mjs";
const base = { head: { x: 0, y: 0, r: 90, rot: 0, yaw: 0, tuft: 0.4 }, eyes: {}, body: { x: 0, y: 0, rx: 100, ry: 100, rot: 0 },
  wings: [{ S: [0, 0], Wr: [0, 0], T: [0, 0], trail: 2, sec: 120 }, { S: [0, 0], Wr: [0, 0], T: [0, 0], trail: 1, sec: 120 }], feet: [{ x: 0, y: 0, ang: 0, size: 58 }, { x: 0, y: 0, ang: 0, size: 58 }] };
const r = [];
for (const [P, K] of [[POSES_C, POSES_C_KEYS], [POSES_D, POSES_D_KEYS], [POSES_F, POSES_F_KEYS]]) {
  for (const F of Object.keys(P).map(Number)) {
    const pose = unpack(K, P[F], base), m = loadMask(F); if (!m) continue;
    const s = raster(rigSilhouette(pose));
    const B = pose.body, f0 = pose.feet[0], f1 = pose.feet[1];
    r.push(`F${F} IoU=${iou(s, m).toFixed(3)} head=(${pose.head.x.toFixed(0)},${pose.head.y.toFixed(0)},r${pose.head.r.toFixed(0)}) body=(${B.x.toFixed(0)},${B.y.toFixed(0)},${B.rx.toFixed(0)}x${B.ry.toFixed(0)},rot${B.rot.toFixed(2)}) feet=(${f0.x.toFixed(0)},${f0.y.toFixed(0)}) (${f1.x.toFixed(0)},${f1.y.toFixed(0)}) size=${(f0.size||58).toFixed(0)}`);
  }
}
console.log(r.join("\n"));
