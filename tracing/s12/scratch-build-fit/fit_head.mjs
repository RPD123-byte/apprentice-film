import { K, GEO, toF, iou, nm } from "./fit.mjs";
const P0 = K.POSES.sit3q.head;
const tgt = [GEO.head];
const mk = (v) => ({ ...P0, x: v[0], y: v[1], rx: v[2], ry: v[3], roll: v[4], square: v[5], jowl: v[6] });
const loss = (v) => { if (v[5] < 1.8 || v[5] > 4 || v[6] < -0.2 || v[6] > 0.4) return 2; const H = K.headGeom(mk(v)); return 1 - iou([H.out.map(toF)], tgt, 4); };
let best = nm(loss, [P0.x, P0.y, P0.rx, P0.ry, P0.roll, P0.square, P0.jowl], [8, 8, 8, 8, 0.05, 0.3, 0.05], 250);
best = nm(loss, best.x, [3, 3, 3, 3, 0.02, 0.1, 0.02], 250);
console.log('head iou', (1 - loss([P0.x, P0.y, P0.rx, P0.ry, P0.roll, P0.square, P0.jowl])).toFixed(3), '->', (1 - best.f).toFixed(3), JSON.stringify(best.x.map((v) => +v.toFixed(3))));
