// s26 — steel scissors, frame px (copied from s21.js drawScissors so this shot owns its variant).
import { gv, LINE } from "../../lib/owlInk.js";

// Pivot at (x, y); blades point along `ang`; L = blade length (pivot → tip); open = angle between the blades.
function scissorsHalf(g, x, y, ang, L, open, k, ringK) {
  const a = ang + k * open / 2;
  const c = Math.cos(a), s = Math.sin(a);
  const P = (u, v) => [x + c * u - s * v, y + s * u + c * v];
  const w0 = 0.07 * L, inner = -k;
  const blade = [P(-0.03 * L, -inner * w0 * 0.9), P(0.3 * L, -inner * w0 * 1.0), P(0.62 * L, -inner * w0 * 0.78), P(0.88 * L, -inner * w0 * 0.34), P(L, inner * w0 * 0.05),
    P(0.8 * L, inner * w0 * 0.3), P(0.45 * L, inner * w0 * 0.62), P(0.08 * L, inner * w0 * 0.85), P(-0.03 * L, inner * w0 * 0.85)];
  const hw = 0.034 * L;
  const shank = [P(0.02 * L, -hw), P(-0.36 * L, -hw - k * 0.03 * L), P(-0.38 * L, hw - k * 0.03 * L), P(0.02 * L, hw)];
  const rc = P(-0.53 * L * ringK, -k * 0.075 * L);
  const rx = 0.17 * L * ringK, ry = 0.1 * L * ringK, rw = Math.max(1.6, 0.04 * L);
  g.lineJoin = "round";
  g.save();
  g.translate(rc[0], rc[1]); g.rotate(a + k * 0.1);
  g.lineWidth = rw + 2.2; g.strokeStyle = LINE; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.stroke();
  g.lineWidth = rw; g.strokeStyle = gv(0.8); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); g.stroke();
  g.lineWidth = Math.max(0.6, rw * 0.3); g.strokeStyle = gv(0.96, 0.9); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, Math.PI * 1.05, Math.PI * 1.75); g.stroke();
  g.restore();
  const poly = (pts, fill) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fillStyle = fill; g.fill(); g.lineWidth = 1.0; g.strokeStyle = gv(0.12, 0.85); g.stroke(); };
  poly(shank, gv(0.78));
  poly(blade, gv(0.88));
  g.lineWidth = Math.max(0.7, 0.012 * L); g.strokeStyle = gv(0.97, 0.9);
  g.beginPath(); const h0 = P(0.05 * L, -inner * w0 * 0.5), h1 = P(0.7 * L, -inner * w0 * 0.42), h2 = P(0.92 * L, -inner * w0 * 0.06); g.moveTo(h0[0], h0[1]); g.quadraticCurveTo(h1[0], h1[1], h2[0], h2[1]); g.stroke();
  g.lineWidth = Math.max(0.6, 0.008 * L); g.strokeStyle = gv(0.42, 0.8);
  g.beginPath(); const e0 = P(0.12 * L, inner * w0 * 0.42), e1 = P(0.85 * L, inner * w0 * 0.1); g.moveTo(e0[0], e0[1]); g.lineTo(e1[0], e1[1]); g.stroke();
}
export function drawScissors(g, { x, y, ang, L, open = 0.1, top = 1, ring = 1 }) {
  g.save();
  scissorsHalf(g, x, y, ang, L, open, -top, ring);
  scissorsHalf(g, x, y, ang, L, open, top, ring);
  const r = Math.max(1.5, 0.028 * L);
  g.fillStyle = gv(0.88); g.strokeStyle = LINE; g.lineWidth = 1;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = gv(0.3); g.beginPath(); g.arc(x, y, r * 0.4, 0, Math.PI * 2); g.fill();
  g.restore();
}
