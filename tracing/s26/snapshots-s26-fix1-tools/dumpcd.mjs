import { cdPose } from "../../src/shots/s26/owlCD.js";
const out = {};
for (let F = 2791; F <= 2847; F++) { const p = cdPose(F); out[F] = { head: p.head, body: p.body, wings: p.wings.map((w) => ({ S: w.S, Wr: w.Wr, T: w.T })), feet: p.feet.map((f) => [f.x, f.y, f.size]) }; }
console.log(JSON.stringify(out));
