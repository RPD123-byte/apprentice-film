import { K, GEO, toF, iou, nm, inPoly } from "./fit.mjs";
const head = { ...K.POSES.sit3q.head, x: -115.759, y: -122.316, rx: 119.289, ry: 97.003, roll: -0.279, square: 2.433, jowl: 0.101 };
const H = K.headGeom(head), Hout = H.out.map(toF);
// compare only outside the head
function iouOut(A, B, step = 2) {
  const all = [...A, ...B].flat(); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of all) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  let i = 0, u = 0; for (let y = y0; y <= y1; y += step) for (let x = x0; x <= x1; x += step) { const p = [x, y]; if (inPoly(p, Hout)) continue; const a = A.some((P) => inPoly(p, P)), b = B.some((P) => inPoly(p, P)); if (a && b) i++; if (a || b) u++; } return u ? i / u : 0; }
const T = K.POSES.sit3q.tufts;
const res = [];
for (const [k, tgt] of [[0, [GEO.tuftL]], [1, [GEO.tuftR[0]]], [2, [GEO.tuftR[1], GEO.tuftR[2]]]]) {
  const t0 = T[k] || { at: 1.15, size: 30, width: 0.3, lean: -0.5, second: 0.5, curl: 0.2 };
  const mk = (v) => ({ at: v[0], size: v[1], width: v[2], lean: v[3], second: v[4], curl: v[5] });
  const loss = (v) => { if (v[1] < 5 || v[2] < 0.08 || v[2] > 0.8) return 2; return 1 - iouOut([K.tuftShape(H, mk(v)).pts.map(toF)], tgt); };
  let b = nm(loss, [t0.at, t0.size, t0.width, t0.lean, t0.second, t0.curl], [0.08, 6, 0.06, 0.1, 0.1, 0.05], 300);
  b = nm(loss, b.x, [0.03, 2, 0.02, 0.04, 0.04, 0.02], 300);
  console.log('tuft', k, (1 - b.f).toFixed(3), JSON.stringify(b.x.map((v) => +v.toFixed(3))));
}
