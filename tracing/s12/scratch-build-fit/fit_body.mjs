import { K, GEO, toF, iou, nm } from "./fit.mjs";
const head = { ...K.POSES.sit3q.head, x: -115.759, y: -122.316, rx: 119.289, ry: 97.003, roll: -0.279, square: 2.433, jowl: 0.101 };
const Hout = K.headGeom(head).out.map(toF);
const B0 = K.POSES.sit3q.body;
const mkB = (v) => ({ x: v[0], y: v[1], a: v[2], b: v[3], rot: v[4], egg: v[5], sag: v[6] });
const tgt = [GEO.head, GEO.body];
const lossB = (v) => { if (Math.abs(v[5]) > 0.5 || v[6] < -0.2 || v[6] > 0.5) return 2; return 1 - iou([Hout, K.bodyOutline(mkB(v)).map(toF)], tgt, 4); };
let b = nm(lossB, [B0.x, B0.y, B0.a, B0.b, B0.rot, B0.egg, B0.sag], [8, 8, 10, 8, 0.05, 0.05, 0.05], 250);
b = nm(lossB, b.x, [3, 3, 3, 3, 0.02, 0.02, 0.02], 250);
console.log('head+body iou', (1 - lossB([B0.x, B0.y, B0.a, B0.b, B0.rot, B0.egg, B0.sag])).toFixed(3), '->', (1 - b.f).toFixed(3), JSON.stringify(b.x.map((v) => +v.toFixed(3))));
// wing
const W0 = K.POSES.sit3q.wings[0];
const mkW = (v) => ({ ...W0, S: [v[0], v[1]], T: [v[2], v[3]], width: v[4], back: v[5] });
const lossW = (v) => { if (v[4] < 10 || v[5] < 10) return 2; return 1 - iou([K.foldedWing(mkW(v)).outline.map(toF)], [GEO.wing], 4); };
let w = nm(lossW, [...W0.S, ...W0.T, W0.width, W0.back], [8, 8, 8, 8, 6, 6], 300);
w = nm(lossW, w.x, [3, 3, 3, 3, 2, 2], 300);
console.log('wing iou', (1 - lossW([...W0.S, ...W0.T, W0.width, W0.back])).toFixed(3), '->', (1 - w.f).toFixed(3), JSON.stringify(w.x.map((v) => +v.toFixed(2))));
// tail (3 feathers) vs GEO.tail
const T0 = K.POSES.sit3q.tail;
const mkT = (v) => ({ base: [v[0], v[1]], tip: [v[2], v[3]], w: v[4], n: 3, spread: 0 });
const lossT = (v) => 1 - iou(K.tailShape(mkT(v)).map((f) => f.map(toF)), [GEO.tail], 3);
let t = nm(lossT, [...T0.base, ...T0.tip, T0.w], [6, 6, 6, 6, 4], 300);
t = nm(lossT, t.x, [2, 2, 2, 2, 1], 300);
console.log('tail iou ->', (1 - t.f).toFixed(3), JSON.stringify(t.x.map((v) => +v.toFixed(2))));
