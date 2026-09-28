// s28: the laptop lid (dark grey back of the screen) in the foreground, drawn per frame from its measured corners.
import { LIDQ } from "./measure.js";
import { lin } from "./kit.js";
import { LIDCOL } from "./lidcol.js";

export function lidQuad(t) {
  const k = Math.round((t - LIDQ[0][0]) * 25);
  const r = LIDQ[Math.max(0, Math.min(LIDQ.length - 1, k))];
  return [[r[1], r[2]], [r[3], r[4]], [r[5], r[6]], [r[7], r[8]]];
}
const mix = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
// bilinear point in the quad (u along top edge, v down)
function qp(Q, u, v) { return mix(mix(Q[0], Q[1], u), mix(Q[3], Q[2], u), v); }

// rounded quad path: corner radius r in px (top corners only, the bottom is off-frame)
function lidPath(g, Q, r, inset = 0) {
  const w = Math.hypot(Q[1][0] - Q[0][0], Q[1][1] - Q[0][1]), h = Math.hypot(Q[3][0] - Q[0][0], Q[3][1] - Q[0][1]);
  const du = inset / w, dv = inset / h, ru = r / w, rv = r / h;
  const P = (u, v) => qp(Q, du + u * (1 - 2 * du), dv + v * (1 - dv));
  const a = P(0, rv), b = P(0, 0), c = P(ru, 0), d = P(1 - ru, 0), e = P(1, 0), f = P(1, rv);
  g.moveTo(...P(0, 1));
  g.lineTo(...a); g.quadraticCurveTo(...b, ...c);
  g.lineTo(...d); g.quadraticCurveTo(...e, ...f);
  g.lineTo(...P(1, 1));
  g.closePath();
}
// the corner colours are measured with u, v in [0, 1] mapped onto [0.08, 0.92] x [0.06, 0.94] of the quad
function lidCol(t) {
  const T = LIDCOL;
  let i = 1; while (i < T.length - 1 && T[i][0] < t) i++;
  const a = T[i - 1], b = T[i], w = Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0])));
  const v = a.slice(1).map((x, k) => x + (b[k + 1] - x) * w);
  const cs = [0, 1, 2, 3].map((k) => v.slice(k * 3, k * 3 + 3));
  // extrapolate from the measured inner rectangle to the quad's corners
  const ex = (p, q, f) => p.map((x, k) => x + (x - q[k]) * f);
  const fu = 0.08 / 0.84, fv = 0.06 / 0.88;
  const TL = ex(ex(cs[0], cs[1], fu), cs[2], fv), TR = ex(ex(cs[1], cs[0], fu), cs[3], fv);
  const BL = ex(ex(cs[2], cs[3], fu), cs[0], fv), BR = ex(ex(cs[3], cs[2], fu), cs[1], fv);
  return [TL, TR, BL, BR].map((c) => c.map((x) => Math.max(0, Math.min(255, x))));
}
export function drawLid(g, t, { base = true } = {}) {
  const Q = lidQuad(t);
  const w = Math.hypot(Q[1][0] - Q[0][0], Q[1][1] - Q[0][1]);
  const r = Math.max(8, 0.03 * w);
  g.save();
  // outer keyline
  g.beginPath(); lidPath(g, Q, r + 2, -2); g.fillStyle = "#1e1716"; g.fill();
  // face: the measured bilinear colour field, painted as a grid of small cells inside the rounded outline
  g.save(); g.beginPath(); lidPath(g, Q, r, 1.5); g.clip();
  const C = lidCol(t), NU = 22, NV = 16;
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
    const u0 = i / NU, u1 = (i + 1) / NU, v0 = j / NV, v1 = (j + 1) / NV, u = (u0 + u1) / 2, v = (v0 + v1) / 2;
    const col = [0, 1, 2].map((k) => Math.round(C[0][k] * (1 - u) * (1 - v) + C[1][k] * u * (1 - v) + C[2][k] * (1 - u) * v + C[3][k] * u * v));
    const a = qp(Q, u0 - 0.002, v0 - 0.002), b = qp(Q, u1 + 0.002, v0 - 0.002), c = qp(Q, u1 + 0.002, v1 + 0.002), d = qp(Q, u0 - 0.002, v1 + 0.002);
    g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(...c); g.lineTo(...d); g.closePath();
    g.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`; g.fill();
  }
  g.restore();
  // bevel: light line just inside the top edge, then the inner dark line
  g.beginPath(); lidPath(g, Q, r, 3.5); g.strokeStyle = "rgba(125,120,116,0.8)"; g.lineWidth = 1.4; g.stroke();
  g.beginPath(); lidPath(g, Q, r * 0.8, 8); g.strokeStyle = "rgba(25,20,20,0.75)"; g.lineWidth = 2.2; g.stroke();
  g.beginPath(); lidPath(g, Q, r * 0.8, 10.5); g.strokeStyle = "rgba(110,105,102,0.35)"; g.lineWidth = 1.2; g.stroke();
  g.restore();
}
