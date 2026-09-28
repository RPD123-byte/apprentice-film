// lid corners per frame exactly as s27.js lidCorners(t) computes them (front coords TL,TR,BR,BL), printed as JSON
import { SCREEN } from "../../src/shots/s27/data.js";
import { LID_END } from "../../src/shots/s27/data2.js";
const LID = { x0: -93, y0: -234, x1: 2268, y1: 1170 };
function seg(T, t) { let i = 1; while (i < T.length - 1 && T[i][0] < t) i++; return i; }
function crRows(T, t) {
  const n = T.length;
  if (t <= T[0][0]) return T[0].slice(1);
  if (t >= T[n - 1][0]) return T[n - 1].slice(1);
  const i = seg(T, t), p0 = T[Math.max(0, i - 2)], p1 = T[i - 1], p2 = T[i], p3 = T[Math.min(n - 1, i + 1)];
  const u = (t - p1[0]) / (p2[0] - p1[0]), u2 = u * u, u3 = u2 * u;
  return p1.slice(1).map((_, k0) => { const k = k0 + 1; return 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3); });
}
const happly = (H, x, y) => { const w = H[6] * x + H[7] * y + H[8]; return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w]; };
const RECT = [[LID.x0, LID.y0], [LID.x1, LID.y0], [LID.x1, LID.y1], [LID.x0, LID.y1]];
function lidCorners(t) {
  if (t <= 128.44) { const Hs = crRows(SCREEN, Math.max(118, t)); return RECT.map(([x, y]) => happly(Hs, x, y)); }
  if (t >= 128.8) { const c = crRows(LID_END, t); return [[c[0], c[1]], [c[2], c[3]], [c[4], c[5]], [c[6], c[7]]]; }
  const a = lidCorners(128.44), b = lidCorners(128.8), u = (t - 128.44) / 0.36;
  return a.map((p, i) => [p[0] + (b[i][0] - p[0]) * u, p[1] + (b[i][1] - p[1]) * u]);
}
const out = {};
for (const F of process.argv[2].split(",").map(Number)) out[F] = lidCorners(Math.round(F) / 25);
console.log(JSON.stringify(out));
