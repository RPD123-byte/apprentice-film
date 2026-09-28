import { headGeom, unpack } from "../../src/shots/s26/rig.js";
import { POSES_F, POSES_F_KEYS } from "../../src/shots/s26/posesF.js";
import { POSES_D, POSES_D_KEYS } from "../../src/shots/s26/posesD.js";
import { POSES_C, POSES_C_KEYS } from "../../src/shots/s26/posesC.js";
const F_BASE_HEAD = { x: 0, y: 0, r: 100, rot: 0, yaw: 0, tuft: 0.3, cupR: 1.18, cupW: 0.22, cupH: 0.5, bandW: 1.2, bandH: 0.76, cupY: 0.19,
  eyeSp: 0.425, eyeY: 0.17, eyeR: 0.3, eyeNear: 0.1, irisR: 0.78, discR: 0.5, discY: 0.08, chin: [0.8, 0.6, 0.6], beakS: 0.52, beakY: 0.49, beakShift: 0.5, plY: -0.6 };
const base = { head: F_BASE_HEAD, body: {}, wings: [{}, {}], feet: [{}, {}] };
const want = process.argv.slice(2).map(Number);
for (const F of want) {
  let P;
  if (POSES_F[F]) P = unpack(POSES_F_KEYS, POSES_F[F], base);
  else if (POSES_D[F]) P = unpack(POSES_D_KEYS, POSES_D[F], { ...base, head: { x: 0, y: 0, r: 90, rot: 0, yaw: 0.3, tuft: 0.4 } });
  else if (POSES_C[F]) P = unpack(POSES_C_KEYS, POSES_C[F], { ...base, head: { x: 0, y: 0, r: 90, rot: 0, yaw: -0.3, tuft: 0.4 } });
  const H = headGeom(P.head);
  const f = (p) => `(${p[0].toFixed(0)},${p[1].toFixed(0)})`;
  console.log(F, "head", f([P.head.x, P.head.y]), "r", P.head.r.toFixed(1), "rot", (P.head.rot ?? 0).toFixed(3), "yaw", (P.head.yaw ?? 0).toFixed(2),
    "eyes", H.eyes.map((e) => f(e.c) + "r" + e.r.toFixed(0)).join(" "), "beak", f(H.beak.c), "plaster", f(H.bandage.c), "cups", H.cups.map((c) => f(c.c)).join(" "));
}
