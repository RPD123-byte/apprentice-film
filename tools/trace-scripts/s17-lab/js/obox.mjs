// whole-owl bounding box (page px) at film times, from the pose (head, body, wings, feet)
import { owlFrame } from "../../../src/shots/s17/owl.js";
for (const t of process.argv.slice(2).map(Number)) {
  const P = owlFrame(t), s = P.s, F = ([x, y]) => [P.x + s * x, P.y + s * y];
  const pts = [];
  for (const W of P.wings) pts.push(...W.lead, ...W.tips);
  const h = P.head; pts.push([h.x - h.rx, h.y - h.ry * 1.3], [h.x + h.rx, h.y + h.ry]);
  if (P.body) pts.push([P.body.x - P.body.a, P.body.y - P.body.b], [P.body.x + P.body.a, P.body.y + P.body.b]);
  const q = pts.map(F), xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
  console.log(t.toFixed(2), [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(Math.round).join(","));
}
