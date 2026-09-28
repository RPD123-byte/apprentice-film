import { K, GEO, toF, toU, nm } from "./fit.mjs";
const head = { ...K.POSES.sit3q.head, x: -115.759, y: -122.316, rx: 119.289, ry: 97.003, roll: -0.279, square: 2.433, jowl: 0.101 };
const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
// eyes: yaw, pitch, spread, el
const RT = [1022, 356], LT = [797, 386], BT = [896, 457];
const lossE = (v) => { const H = K.headGeom({ ...head, yaw: v[0], pitch: 0 }); if (v[1] !== 0) {} const r = H.P(v[2], v[3]), l = H.P(-v[2], v[3]); return d2(toF([r.x, r.y]), RT) + d2(toF([l.x, l.y]), LT); };
let e = nm(lossE, [-0.25, 0, 0.4365, -0.19], [0.1, 0, 0.05, 0.05], 400); e = nm(lossE, e.x, [0.03, 0, 0.02, 0.02], 400);
console.log('eyes err px', Math.sqrt(e.f / 2).toFixed(1), JSON.stringify(e.x.map((v) => +v.toFixed(4))));
const H = K.headGeom({ ...head, yaw: e.x[0], pitch: 0 });
for (const sd of [-1, 1]) { const q = H.P(sd * e.x[2], e.x[3]); console.log(' eye', sd, 'nz', q.nz.toFixed(3), 'frame', toF([q.x, q.y]).map((v) => v.toFixed(0))); }
// beak: el, lift
const lossB = (v) => { const q = H.P(0, v[0], v[1]); return d2(toF([q.x, q.y]), BT); };
let b = nm(lossB, [-0.41, 1.32], [0.05, 0.05], 300); console.log('beak err', Math.sqrt(b.f).toFixed(1), JSON.stringify(b.x.map((v) => +v.toFixed(4))));
// bandage centre (813,148)
const lossD = (v) => { const q = H.P(v[0], v[1]); return d2(toF([q.x, q.y]), [813, 148]); };
let dd = nm(lossD, [-0.55, 0.82], [0.1, 0.1], 300); const qd = H.P(dd.x[0], dd.x[1]); console.log('bandage err', Math.sqrt(dd.f).toFixed(1), JSON.stringify(dd.x.map((v) => +v.toFixed(4))), 'nz', qd.nz.toFixed(2));
// headphones
const HP0 = K.POSES.sit3q.headphones;
const mkHP = (v) => ({ ...HP0, yaw: v[0], dx: v[1], dy: v[2], lift: v[3], cupEl: v[4], bandR: v[5], bandH: v[6], tilt: v[7] });
const cross = (pts, y, side) => { let best = null; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], c = pts[i]; if ((a[1] - y) * (c[1] - y) <= 0 && a[1] !== c[1]) { const x = a[0] + (c[0] - a[0]) * (y - a[1]) / (c[1] - a[1]); if (side < 0 ? (best === null || x < best) : (best === null || x > best)) best = x; } } return best; };
const lossH = (v) => { if (v[3] < 0.5 || v[5] < 0.5 || v[6] < 0.8) return 1e9; const g = K.headphoneGeom(H, mkHP(v)); const near = g.cups.reduce((a, c) => (c.z > a.z ? c : a)); const pts = g.band.map((p) => toF(p.p));
  const xf = cross(pts, 40, -1), xn = cross(pts, 40, 1); let L = d2(toF([near.x, near.y]), [1327, 285]); L += xf === null ? 1e5 : (xf - 845) ** 2; L += xn === null ? 1e5 : (xn - 1305) ** 2; const top = Math.min(...pts.map((p) => p[1])); L += top > -60 ? (top + 60) ** 2 : 0; return L; };
let h = nm(lossH, [HP0.yaw, HP0.dx, HP0.dy, HP0.lift, HP0.cupEl, HP0.bandR, HP0.bandH, HP0.tilt], [0.1, 0.1, 0.05, 0.1, 0.05, 0.1, 0.2, 0.05], 600); h = nm(lossH, h.x, [0.03, 0.03, 0.02, 0.03, 0.02, 0.03, 0.05, 0.02], 600);
console.log('hp loss', Math.sqrt(h.f).toFixed(1), JSON.stringify(h.x.map((v) => +v.toFixed(4))));
const g = K.headphoneGeom(H, mkHP(h.x)); console.log(' cups', g.cups.map((c) => [toF([c.x, c.y]).map((v) => v.toFixed(0)), c.z.toFixed(2), c.side, c.open.toFixed(2)]));
