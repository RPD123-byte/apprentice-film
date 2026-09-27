// s23 props: the scissors (the owl's big pair from s20–s22), drawn in code. Two long pointed pale blades crossing at a
// pivot screw, short shanks to two dark-rimmed finger rings. Works in any units: x, y = pivot, ang = blades'
// direction (pivot -> tips), L = pivot -> tip length, open = angle between the blades.
import { gv, LINE } from "../../lib/owlInk.js";

const TAU = Math.PI * 2;
function half(g, x, y, ang, L, open, k, lw) {
  const a = ang + (k * open) / 2, c = Math.cos(a), s = Math.sin(a);
  const P = (u, v) => [x + c * u - s * v, y + s * u + c * v];
  const w0 = 0.075 * L, inner = -k;
  const blade = [P(-0.04 * L, -inner * w0 * 0.9), P(0.3 * L, -inner * w0 * 1.0), P(0.62 * L, -inner * w0 * 0.78), P(0.88 * L, -inner * w0 * 0.34), P(L, inner * w0 * 0.05),
    P(0.8 * L, inner * w0 * 0.3), P(0.45 * L, inner * w0 * 0.62), P(0.08 * L, inner * w0 * 0.85), P(-0.04 * L, inner * w0 * 0.85)];
  const hw = 0.036 * L;
  const shank = [P(0.02 * L, -hw), P(-0.34 * L, -hw - k * 0.035 * L), P(-0.36 * L, hw - k * 0.035 * L), P(0.02 * L, hw)];
  const rc = P(-0.52 * L, -k * 0.08 * L), rx = 0.17 * L, ry = 0.105 * L, rw = 0.05 * L;
  g.lineJoin = "round";
  g.save(); g.translate(rc[0], rc[1]); g.rotate(a + k * 0.12);
  g.lineWidth = rw + lw * 2.2; g.strokeStyle = LINE; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.stroke();
  g.lineWidth = rw; g.strokeStyle = gv(0.86); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.stroke();
  g.restore();
  const poly = (pts, fill) => { g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.closePath(); g.fillStyle = fill; g.fill(); g.lineWidth = lw; g.strokeStyle = gv(0.1, 0.9); g.stroke(); };
  poly(shank, gv(0.8));
  poly(blade, gv(0.93));
  g.lineWidth = lw * 0.9; g.strokeStyle = gv(0.99, 0.9);
  const h0 = P(0.05 * L, -inner * w0 * 0.5), h1 = P(0.7 * L, -inner * w0 * 0.42), h2 = P(0.92 * L, -inner * w0 * 0.06);
  g.beginPath(); g.moveTo(h0[0], h0[1]); g.quadraticCurveTo(h1[0], h1[1], h2[0], h2[1]); g.stroke();
}
// scissors in the current units; lw = hairline width in those units
export function drawScissorsU(g, { x, y, ang, L, open = 0.1, lw = null, alpha = 1 }) {
  const w = lw ?? L * 0.012;
  g.save(); g.globalAlpha *= alpha;
  half(g, x, y, ang, L, open, -1, w);
  half(g, x, y, ang, L, open, 1, w);
  g.fillStyle = gv(0.9); g.strokeStyle = LINE; g.lineWidth = w;
  g.beginPath(); g.arc(x, y, 0.03 * L, 0, TAU); g.fill(); g.stroke();
  g.restore();
}
// scissors in frame px
export function drawScissors(g, o) { drawScissorsU(g, { lw: Math.max(1, o.L * 0.012), ...o }); }

// the sprout that has grown in his mug once the aura blows off (95.64 on): the steam is gone, a small green plant with
// heart leaves stands in the mug (frame px, measured: mug rim y ≈ 532, plant x 848–898, top ≈ 468)
const SPROUT_LEAVES = [[0, -58, 13, -0.2], [-15, -50, 12, -0.9], [14, -47, 12, 0.8], [-18, -34, 13, -1.2], [17, -30, 12, 1.1], [-8, -22, 10, -0.7], [8, -16, 9, 0.6]];
export function drawSprout(g, x = 873, y = 532, alpha = 1) {
  g.save(); g.globalAlpha *= alpha;
  // cover the steam (thin pale lines over the dark room behind the desk)
  g.fillStyle = "rgb(4,4,4)"; g.fillRect(x - 32, y - 92, 64, 88);
  g.strokeStyle = "rgb(58,86,40)"; g.lineWidth = 2.2; g.lineCap = "round";
  g.beginPath(); g.moveTo(x, y + 2); g.quadraticCurveTo(x - 3, y - 30, x, y - 56); g.stroke();
  for (const [dx, dy, r, a] of SPROUT_LEAVES) {
    g.save(); g.translate(x + dx, y + dy); g.rotate(a);
    g.beginPath(); g.moveTo(0, r * 0.6); g.bezierCurveTo(-r * 1.1, -r * 0.1, -r * 0.5, -r * 1.0, 0, -r * 0.45); g.bezierCurveTo(r * 0.5, -r * 1.0, r * 1.1, -r * 0.1, 0, r * 0.6); g.closePath();
    const gr = g.createLinearGradient(0, -r, 0, r); gr.addColorStop(0, "rgb(128,170,70)"); gr.addColorStop(1, "rgb(70,110,42)");
    g.fillStyle = gr; g.fill(); g.strokeStyle = "rgb(24,34,16)"; g.lineWidth = 1; g.stroke();
    g.strokeStyle = "rgba(40,60,24,0.8)"; g.beginPath(); g.moveTo(0, r * 0.5); g.lineTo(0, -r * 0.3); g.stroke();
    g.restore();
  }
  g.restore();
}
