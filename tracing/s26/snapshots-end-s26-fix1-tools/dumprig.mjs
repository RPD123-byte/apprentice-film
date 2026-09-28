import { rigPose, cdPose } from "../../archive/prev-builds/s26-end1-prev/s26/owlCD.js";
import { headGeom } from "../../archive/prev-builds/s26-end1-prev/s26/rig.js";
const out = {};
for (let F = 2791; F <= 2847; F++) {
  const P = rigPose(F), G = headGeom(P.head);
  const K = cdPose(F);
  out[F] = { eyes: G.eyes.map((e) => e.c), cups: G.cups.map((c) => ({ c: c.c, k: c.k, rx: c.rx, ry: c.ry })), head: P.head, kh: K.head, feet: K.feet, body: K.body };
}
console.log(JSON.stringify(out));
