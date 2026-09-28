import { owlS17Layer } from "../../src/shots/s17/owlDraw.js";
import { owlFrame } from "../../src/shots/s17/owl.js";
const out = {};
const r1 = (p) => p.map((v) => Math.round(v));
for (const t of window.LAB.times) {
  const p = owlFrame(t);
  const L = owlS17Layer({ ...p });
  out[t] = { head: r1(L.toF([L.H.x, L.H.y])), r: Math.round(L.H.ry * p.s), eyes: L.eyes.map((e) => r1(L.toF([e.x, e.y])).concat([+e.nz.toFixed(2)])), beak: r1(L.toF([L.bq.x, L.bq.y])), cups: L.cups.map((c) => r1(L.toF([c.x, c.y])).concat([+c.z.toFixed(2)])) };
}
document.body.innerHTML = "<pre id=o>" + JSON.stringify(out) + "</pre>";
