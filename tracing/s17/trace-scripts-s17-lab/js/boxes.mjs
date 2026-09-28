// bounding boxes (page px) of the wings / body / feet for film times (from the key poses in page px)
import { owlFrame } from "../../../src/shots/s17/owl.js";
for (const t of process.argv.slice(2).map(Number)) {
  const P = owlFrame(t), s = P.s, F = ([x, y]) => [P.x + s * x, P.y + s * y];
  const bb = (pts) => { const q = pts.map(F); const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(Math.round); };
  const w = P.wings.map((W) => bb([...W.lead, ...W.tips]));
  console.log(t.toFixed(2), "w0", w[0].join(","), "w1", w[1].join(","));
}
