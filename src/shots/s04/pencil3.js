// s04 (fix2): the pencil end-on (22.16-22.32) and his upper teeth on it (22.12-22.52), as authored shapes.
// The review: 'teeth are missing 22.12-22.52: the source shows upper teeth on the pencil in every one of these frames';
// and 22.16-22.32 had no pencil model (the traced drawing broke into doubled lines there).
// Measured on each source frame at 3x on a 10 px grid (snapshots/s04-fix2-cmp/measure/pencilC_grid.jpg, teeth_grid.jpg), frame px.
//   PENCIL_C: the pencil seen along its length, pointing down at the lens: T = the middle of its top edge where it goes
//     in under the teeth, B = the middle of the eraser end, wT / wB = its width there, cap = the eraser end's ellipse
//     half-axes [rx, ry]. Pale shaft (paint ~205) with a lit facet down its left (~240) and a shaded one on its right
//     (~150), a dark outline, two ferrule grooves above the end and a grey end face with a dark rim.
//   TEETH: per frame, the upper lip's lower edge (x0, y0) -> (x1, y1) and the teeth hanging from it [xa, xb, depth].
import { hash } from "../../lib/rng.js";
const grey = (v) => { const c = Math.max(0, Math.min(255, Math.round(v))); return `rgb(${c},${c},${c})`; };
export const PENCIL_C = {
  "22.16": { T: [1252.5, 599.5], B: [1279, 671], wT: 24, wB: 32, cap: [15, 10] },
  "22.20": { T: [1257, 590], B: [1264, 670], wT: 24, wB: 34, cap: [16.5, 12] },
  "22.24": { T: [1256, 587], B: [1253.5, 665], wT: 27, wB: 32, cap: [15, 12] },
  "22.28": { T: [1257, 577], B: [1239.5, 661], wT: 28, wB: 30, cap: [14, 12] },
  "22.32": { T: [1255, 569], B: [1222, 659], wT: 22, wB: 27, cap: [13, 10.5] },
};
export const TEETH = {
  "22.12": { lip: [[1178, 596], [1262, 603]], t: [[1180, 1200, 13], [1200, 1227, 14], [1227, 1250, 14], [1250, 1261, 7]] },
  "22.16": { lip: [[1199, 583], [1268, 590]], t: [[1201, 1219, 12], [1219, 1238, 14], [1238, 1255, 12], [1255, 1267, 8]] },
  "22.20": { lip: [[1203, 577], [1272, 584]], t: [[1204, 1222, 16], [1222, 1240, 17], [1240, 1257, 15], [1257, 1271, 10]] },
  "22.24": { lip: [[1210, 570], [1275, 576]], t: [[1211, 1229, 13], [1229, 1247, 15], [1247, 1263, 13], [1263, 1274, 9]] },
  "22.28": { lip: [[1217, 561], [1275, 567]], t: [[1218, 1235, 14], [1235, 1253, 16], [1253, 1266, 13], [1266, 1275, 8]] },
  "22.32": { lip: [[1221, 554], [1275, 559]], t: [[1222, 1240, 13], [1240, 1257, 14], [1257, 1274, 11]] },
  "22.36": { lip: [[1229, 550], [1288, 556]], t: [[1230, 1250, 16], [1250, 1270, 12], [1270, 1287, 6]] },
  "22.40": { lip: [[1231, 543], [1275, 549]], t: [[1232, 1250, 16], [1250, 1270, 10]] },
  "22.44": { lip: [[1236, 537], [1275, 541]], t: [[1237, 1257, 13], [1257, 1273, 8]] },
  "22.48": { lip: [[1239, 530], [1279, 533]], t: [[1240, 1257, 13], [1257, 1277, 8]] },
  "22.52": { lip: [[1247, 523], [1285, 527]], t: [[1248, 1267, 14], [1267, 1283, 8]] },
};
// the end-on pencil's outline (frame px): the shaft's quad plus the end's half ellipse
export function pencilCPoly(t, grow = 0) {
  const P = PENCIL_C[t.toFixed(2)];
  if (!P) return null;
  const { T, B, wT, wB, cap } = P, dx = B[0] - T[0], dy = B[1] - T[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const hT = wT / 2 + grow, hB = wB / 2 + grow, out = [[T[0] - nx * hT - ux * grow, T[1] - ny * hT - uy * grow], [T[0] + nx * hT - ux * grow, T[1] + ny * hT - uy * grow]];
  for (let k = 0; k <= 8; k++) { const a = (Math.PI * k) / 8; out.push([B[0] + nx * hB * Math.cos(a) + ux * (cap[1] + grow) * Math.sin(a), B[1] + ny * hB * Math.cos(a) + uy * (cap[1] + grow) * Math.sin(a)]); }
  return out;
}
// the teeth's outline (frame px), for dropping the traced lines under them
export function teethPoly(t, grow = 0) {
  const Q = TEETH[t.toFixed(2)];
  if (!Q) return null;
  const [[x0, y0], [x1, y1]] = Q.lip, yl = (x) => y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  const xa = Q.t[0][0] - grow, xb = Q.t[Q.t.length - 1][1] + grow, d = Math.max(...Q.t.map((q) => q[2]));
  return [[xa, yl(xa) - 2 - grow], [xb, yl(xb) - 2 - grow], [xb, yl(xb) + d + grow], [xa, yl(xa) + d + grow]];
}
function paintC(g, P) {
  const { T, B, wT, wB, cap } = P, dx = B[0] - T[0], dy = B[1] - T[1], L = Math.hypot(dx, dy);
  g.save(); g.translate(T[0], T[1]); g.rotate(Math.atan2(dy, dx) - Math.PI / 2);   // local: y down the pencil, x across
  const shaft = () => { g.beginPath(); g.moveTo(-wT / 2, 0); g.lineTo(wT / 2, 0); g.lineTo(wB / 2, L); g.lineTo(-wB / 2, L); g.closePath(); };
  const sg = g.createLinearGradient(-wB / 2, 0, wB / 2, 0);
  sg.addColorStop(0, grey(120)); sg.addColorStop(0.12, grey(222)); sg.addColorStop(0.3, grey(214)); sg.addColorStop(0.36, grey(186));
  sg.addColorStop(0.64, grey(178)); sg.addColorStop(0.7, grey(140)); sg.addColorStop(0.92, grey(126)); sg.addColorStop(1, grey(80));
  shaft(); g.fillStyle = sg; g.fill();
  // facet edges, faint
  g.strokeStyle = grey(150); g.lineWidth = 0.9; g.globalAlpha = 0.7;
  for (const f of [-0.2, 0.22]) { g.beginPath(); g.moveTo(f * wT, 2); g.lineTo(f * wB, L - cap[1] * 0.6); g.stroke(); }
  g.globalAlpha = 1;
  // ferrule grooves above the end, following the end's curve
  g.strokeStyle = grey(70); g.lineWidth = 1.3;
  for (const off of [7, 12]) { g.beginPath(); g.ellipse(0, L - off, wB / 2 - 0.5, cap[1] * 0.9, 0, 0.1, Math.PI - 0.1); g.stroke(); }
  // outline of the shaft's sides
  g.strokeStyle = grey(34); g.lineWidth = 1.6; g.lineCap = "round";
  g.beginPath(); g.moveTo(-wT / 2, 0); g.lineTo(-wB / 2, L); g.stroke();
  g.beginPath(); g.moveTo(wT / 2, 0); g.lineTo(wB / 2, L); g.stroke();
  // the eraser end: grey face, lit upper left, dark rim
  const cg = g.createLinearGradient(-cap[0], -cap[1] + L, cap[0], cap[1] + L);
  cg.addColorStop(0, grey(215)); cg.addColorStop(0.5, grey(172)); cg.addColorStop(1, grey(128));
  g.beginPath(); g.ellipse(0, L, cap[0], cap[1], 0, 0, Math.PI * 2); g.fillStyle = cg; g.fill();
  g.lineWidth = 1.8; g.strokeStyle = grey(38); g.stroke();
  g.restore();
}
function paintTeeth(g, Q, seed) {
  const [[x0, y0], [x1, y1]] = Q.lip, yl = (x) => y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  for (let i = 0; i < Q.t.length; i++) {
    const [xa, xb, d] = Q.t[i], ya = yl(xa), yb = yl(xb), r = Math.min(6, (xb - xa) / 2.4, d / 1.8);
    const dd = d * (0.95 + 0.1 * hash(i, seed));
    g.beginPath(); g.moveTo(xa + 0.6, ya - 2); g.lineTo(xb - 0.6, yb - 2);
    g.lineTo(xb - 0.6, yb + dd - r); g.quadraticCurveTo(xb - 0.6, yb + dd, xb - 0.6 - r, yb + dd);
    g.lineTo(xa + 0.6 + r, ya + dd); g.quadraticCurveTo(xa + 0.6, ya + dd, xa + 0.6, ya + dd - r); g.closePath();
    const tg = g.createLinearGradient(0, Math.min(ya, yb), 0, Math.max(ya, yb) + dd);
    tg.addColorStop(0, grey(200)); tg.addColorStop(0.35, grey(238)); tg.addColorStop(1, grey(232));
    g.fillStyle = tg; g.fill(); g.lineWidth = 0.9; g.strokeStyle = grey(128); g.stroke();
  }
  // the upper lip's lower edge over the teeth's roots
  g.lineWidth = 1.7; g.lineCap = "round"; g.strokeStyle = grey(62);
  g.beginPath(); g.moveTo(x0 - 3, y0 - 1.5); g.lineTo(x1 + 3, y1 - 1.5); g.stroke();
}
// the open mouth's dark inside under the teeth (drawn before the pencil): a soft dark band below the teeth's row
export function paintMouth(g, M, t) {
  const Q = TEETH[t.toFixed(2)];
  if (!Q) return false;
  const [[x0, y0], [x1, y1]] = Q.lip, yl = (x) => y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  const xa = Q.t[0][0] + 2, xb = Q.t[Q.t.length - 1][1] + 4, d = Math.max(...Q.t.map((q) => q[2]));
  g.save(); g.setTransform(1, 0, 0, 1, M + 0.5, M + 0.5); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.filter = "blur(1.5px)";
  g.beginPath(); g.moveTo(xa, yl(xa) + d * 0.5); g.lineTo(xb, yl(xb) + d * 0.4);
  g.quadraticCurveTo(xb + 2, yl(xb) + d * 0.9, xb - 8, yl(xb) + d + 5); g.lineTo(xa + 8, yl(xa) + d + 8);
  g.quadraticCurveTo(xa - 3, yl(xa) + d + 4, xa, yl(xa) + d * 0.5); g.closePath();
  g.fillStyle = grey(58); g.fill();
  g.restore();
  return true;
}
// draw the end-on pencil and/or the teeth of key time t into key canvas context g (margin M), over the traced drawing
export function paintPencil3(g, M, t, withC = true) {
  const k = t.toFixed(2), P = PENCIL_C[k], Q = TEETH[k];
  if (!P && !Q) return false;
  g.save(); g.setTransform(1, 0, 0, 1, M + 0.5, M + 0.5); g.globalAlpha = 1; g.globalCompositeOperation = "source-over"; g.filter = "none";
  if (P && withC) paintC(g, P);
  if (Q) paintTeeth(g, Q, Math.round(t * 25));
  g.restore();
  return true;
}
