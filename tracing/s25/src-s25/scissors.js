// s25 scissors — the owl's big silver dressmaker's scissors, drawn in frame px.
// Pivot at (x, y); the blades point along `ang` (radians, frame coords, y down); L = pivot → blade tip.
// open = angle between the two blades. Measured on the source at 104.6 (left pair: pivot (831, 747), tips (696, 822)
// and (750, 874), L ≈ 154): lens-shaped blades ~0.13·L wide with a dark bevel line, shanks to two big oval finger
// loops ~0.49·L behind the pivot and ~0.2·L either side of the axis (0.21·L × 0.13·L, ring ~0.05·L thick), pale
// grey-white metal, dark ~2 px ink outline, a small pivot screw.
import { LINE, gv } from "../../lib/owlInk.js";

const TAU = Math.PI * 2;

function blade(g, L, k, w, lw, tone, blunt) {
  // blade toward +u, its back (convex) edge on side k, cutting edge along the axis; blunt: the huge pair's broad
  // rounded blade (widest ~40 % out, round tip)
  const W = w * L;
  g.beginPath();
  g.moveTo(-0.04 * L, -k * W * 0.25);
  if (blunt) {
    g.bezierCurveTo(0.12 * L, k * W * 1.25, 0.72 * L, k * W * 1.3, 0.97 * L, k * W * 0.35);
    g.quadraticCurveTo(L, k * W * 0.1, 0.96 * L, -k * W * 0.02);
  } else g.bezierCurveTo(0.1 * L, k * W * 1.05, 0.55 * L, k * W * 1.0, L, k * W * 0.06);
  g.bezierCurveTo(0.7 * L, -k * W * 0.08, 0.3 * L, -k * W * 0.12, -0.04 * L, -k * W * 0.25);
  g.closePath();
  const gr = g.createLinearGradient(0, k * W, 0, -k * W * 0.2);
  gr.addColorStop(0, gv(0.62 * tone)); gr.addColorStop(0.5, gv(0.88 * tone)); gr.addColorStop(1, gv(0.96 * tone));
  g.fillStyle = gr; g.fill();
  g.lineJoin = "round"; g.lineWidth = lw; g.strokeStyle = LINE; g.stroke();
  // bevel: a dark line down the blade, a bright edge along the cut
  g.lineWidth = Math.max(0.8, lw * 0.55); g.strokeStyle = gv(0.22, 0.8);
  g.beginPath(); g.moveTo(0.08 * L, k * W * 0.5); g.bezierCurveTo(0.35 * L, k * W * 0.6, 0.7 * L, k * W * 0.45, 0.94 * L, k * W * 0.08); g.stroke();
}

function handle(g, L, k, o, lw, tone) {
  // shank from the pivot back to the loop on side k, then the loop ring
  const d = o.loopD * L, off = o.loopOff * L, rx = o.loopRx * L, ry = o.loopRy * L, th = o.ring * L;
  const cx = -d, cy = k * off;
  const sw = 0.045 * L;
  g.beginPath();
  g.moveTo(0.03 * L, -k * sw * 0.3);
  g.quadraticCurveTo(-0.2 * L, k * off * 0.3 - k * sw, cx + rx * 0.55, cy - k * ry * 0.6);
  g.lineTo(cx + rx * 0.7, cy + k * ry * 0.1);
  g.quadraticCurveTo(-0.18 * L, k * off * 0.4 + k * sw, 0.03 * L, k * sw * 0.9);
  g.closePath();
  g.fillStyle = gv(0.88 * tone); g.fill(); g.lineWidth = lw; g.strokeStyle = LINE; g.stroke();
  g.save(); g.translate(cx, cy); g.rotate(k * o.loopAng);
  g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.ellipse(0, 0, rx - th, ry - th, 0, 0, TAU, true);
  const gr = g.createLinearGradient(-rx, -ry, rx, ry); gr.addColorStop(0, gv(0.97 * tone)); gr.addColorStop(0.6, gv(0.86 * tone)); gr.addColorStop(1, gv(0.7 * tone));
  g.fillStyle = gr; g.fill("evenodd");
  g.lineWidth = lw; g.strokeStyle = LINE;
  g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.stroke();
  g.beginPath(); g.ellipse(0, 0, rx - th, ry - th, 0, 0, TAU); g.stroke();
  g.lineWidth = Math.max(0.7, lw * 0.45); g.strokeStyle = gv(0.3, 0.6);
  g.beginPath(); g.ellipse(0, 0, rx - th * 0.5, ry - th * 0.5, 0, Math.PI * 0.1, Math.PI * 0.9); g.stroke();
  g.restore();
}

// drawScissors(g, { x, y, ang, L, open, w, loopD, loopOff, loopRx, loopRy, loopAng, ring, lw, tone, alpha, flip })
export function drawScissors(g, o) {
  const { x, y, ang, L, open = 0.12, lw = 2.6, tone = 1, alpha = 1, flip = 1, w = 0.12 } = o;
  const h = { loopD: 0.49, loopOff: 0.2, loopRx: 0.21, loopRy: 0.14, loopAng: 0.5, ring: 0.07, ...o };
  g.save();
  g.globalAlpha *= alpha;
  g.translate(x, y); g.rotate(ang); if (flip < 0) g.scale(1, -1);
  // the half whose blade is on side -1 carries the loop on side +1 (they cross at the pivot)
  g.save(); g.rotate(-open / 2); handle(g, L, 1, h, lw, tone); g.restore();
  g.save(); g.rotate(open / 2); handle(g, L, -1, h, lw, tone); g.restore();
  g.save(); g.rotate(open / 2); blade(g, L, 1, w, lw, tone, o.blunt); g.restore();
  g.save(); g.rotate(-open / 2); blade(g, L, -1, w, lw, tone, o.blunt); g.restore();
  const r = Math.max(2, 0.035 * L);
  g.fillStyle = gv(0.92 * tone); g.strokeStyle = LINE; g.lineWidth = Math.max(1, lw * 0.7);
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.stroke();
  g.fillStyle = gv(0.25); g.beginPath(); g.arc(0, 0, r * 0.35, 0, TAU); g.fill();
  g.restore();
}
