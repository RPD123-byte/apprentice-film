// dump the C/D owl pose numbers per frame (eyes, head, body, wings, feet) as JSON
import { cdPose, rigPose } from "../../src/shots/s26/owlCD.js";
import { headGeom as rigHeadGeom } from "../../src/shots/s26/rig.js";
const out = {};
for (let F = 2791; F <= 2847; F++) {
  const p = cdPose(F), G = rigHeadGeom(rigPose(F).head);
  out[F] = { eyes: G.eyes.map((e) => e.c), head: p.head, body: p.body, wings: p.wings.map((w) => ({ S: w.S, Wr: w.Wr, T: w.T, len: w.len, trail: w.trail, spread: w.spread })), feet: p.feet.map((f) => [f.x, f.y, f.size]) };
}
console.log(JSON.stringify(out));
