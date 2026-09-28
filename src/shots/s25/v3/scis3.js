// s25 v3 (end targeted fix) — a copy of v2/scis.js restyled to the source's chrome: v2 drew them as wire outlines (2.8 px
// near-black outlines, a dark 3.4 px rim in each ring, narrow blades apart), which read as black line-art next to the
// source's bright silver pairs. Measured on 3x grid crops of the floating left pair (109.60): ~1.5 px grey outlines,
// white metal with a soft grey shade on the lower side of each ring and along the blade seam, shanks ~12 px of metal,
// the blades nearly closed into one long white leaf with a thin seam line.
// (v2 header:) the owl's scissors, drawn by code from a measured design (the clean floating pair at 109.40, left):
//   pivot screw r 5.5; blades 153 px pivot → tip, 15 px wide at the root; two oval finger rings (31 × 22 and 32 × 21 px,
//   7 px of metal), 95 and 110 px from the pivot; each half bends ~13° at the pivot (ring side vs blade side).
// A placement is { P: [x, y] pivot, a: [θA, θB] blade directions (radians, frame, y down), s: scale, m: ±1 mirror
// (which way the rings sit), rr: extra ring rotation, rd: extra ring distance, rb: extra ring bend } — fitted per
// placement on the source (snapshots/s25-tools/scisfit.py: chamfer to the source edges + brightness inside). Pure geometry + fills; values are pre-grade.
import { gray } from "../v2/draw.js";

export const DESIGN = {
  L: 153, w: 25, D: [110, 95], bend: [0.227, -0.227], ring: [[35, 23, 0], [34, 24, 0.13]], t: 9.5, screw: 6.5, shankW: [17, 12],
};
// fix pass 1: the source pairs are bold solid silver (blades ~25 px at the root, rings with 11–12 px of metal and a
// thick dark outline, measured at 109.48); the per-placement blade-width fits (0.63–0.98) under-read the blades, so
// they are floored here
const WS_MIN = 0.94;

function blade(g, P, th, s, side, D, ws = 1) {
  const L = D.L * s, w = D.w * s * ws, c = Math.cos(th), n = Math.sin(th);
  const ux = c, uy = n, nx = -n * side, ny = c * side; // normal toward the blade's back
  const pt = (t, k) => [P[0] + ux * t + nx * k, P[1] + uy * t + ny * k];
  // fix pass 2: the source's blades are straight-backed with a sharp point (not leaf-shaped): the back holds ~0.95 w
  // to ~0.6 L then runs to the point; the cutting edge is straight along the axis
  g.moveTo(...pt(-0.06 * L, -0.12 * w));
  const b1 = pt(0.18 * L, 0.95 * w), b2 = pt(0.62 * L, 0.95 * w), tip = pt(L, 0.02 * w);
  g.bezierCurveTo(...pt(0.02 * L, 1.0 * w), ...b1, ...pt(0.3 * L, 0.95 * w));
  g.bezierCurveTo(...b2, ...pt(0.9 * L, 0.2 * w), ...tip);
  g.bezierCurveTo(...pt(0.7 * L, -0.05 * w), ...pt(0.3 * L, -0.05 * w), ...pt(-0.06 * L, -0.12 * w));
  g.closePath();
}
function ringCentre(P, th, s, k, m, D, pl) {
  const a = th + Math.PI + (D.bend[k] + (pl.rb ? pl.rb[k] : 0)) * m, d = (D.D[k] + (pl.rd ? pl.rd[k] : 0)) * s;
  return [P[0] + Math.cos(a) * d, P[1] + Math.sin(a) * d, a];
}

// one half: blade + shank + ring (outer minus inner), filled as one metal piece
function half(g, pl, k, D, style) {
  const s = pl.s || 1, m = pl.m || 1, th = pl.a[k], P = pl.P;
  const rsk = pl.rs ? pl.rs[k] : 1;
  let [rx, ry, rr] = D.ring[k]; rx *= rsk; ry *= rsk;
  const [cx, cy, ra] = ringCentre(P, th, s, k, m, D, pl);
  const rot = ra + (rr + (pl.rr ? pl.rr[k] : 0)) * m;
  const side = (k === 0 ? 1 : -1) * m;
  const metal = style.metal, ink = style.ink;
  // shank: from the pivot to the ring's near side
  const nx = Math.cos(ra), ny = Math.sin(ra), px = -ny, py = nx;
  const w0 = D.shankW[0] * s / 2, w1 = D.shankW[1] * s / 2, e = (D.D[k] + (pl.rd ? pl.rd[k] : 0) - rx * 0.8) * s;
  g.beginPath();
  g.moveTo(P[0] + px * w0, P[1] + py * w0);
  g.quadraticCurveTo(P[0] + nx * e * 0.5 + px * w1 * 0.8, P[1] + ny * e * 0.5 + py * w1 * 0.8, P[0] + nx * e + px * w1 * 1.6, P[1] + ny * e + py * w1 * 1.6);
  g.lineTo(P[0] + nx * e - px * w1 * 1.6, P[1] + ny * e - py * w1 * 1.6);
  g.quadraticCurveTo(P[0] + nx * e * 0.5 - px * w1 * 0.8, P[1] + ny * e * 0.5 - py * w1 * 0.8, P[0] - px * w0, P[1] - py * w0);
  g.closePath();
  blade(g, P, th, s, side, D, Math.max(WS_MIN, pl.ws || 1));
  g.ellipse(cx, cy, rx * s, ry * s, rot, 0, Math.PI * 2);
  g.fillStyle = metal; g.fill("nonzero");
  g.lineWidth = style.lw * s; g.strokeStyle = ink; g.lineJoin = "round"; g.stroke();
  // the finger hole: cut out, with a darker inner rim
  const t = D.t * s * rsk;
  g.save();
  g.globalCompositeOperation = "destination-out";
  g.beginPath(); g.ellipse(cx, cy, rx * s - t, ry * s - t, rot, 0, Math.PI * 2); g.fill();
  g.restore();
  // the ring's metal shaded on its lower side (a soft grey crescent inside the metal)
  g.save(); g.beginPath(); g.ellipse(cx, cy, rx * s, ry * s, rot, 0, Math.PI * 2); g.ellipse(cx, cy, rx * s - t, ry * s - t, rot, 0, Math.PI * 2); g.clip("evenodd");
  g.lineWidth = 3.2 * s; g.strokeStyle = style.rim; g.beginPath(); g.ellipse(cx, cy + 1.2 * s, rx * s - t + 2.4 * s, ry * s - t + 2.4 * s, rot, 0.15 * Math.PI, 0.95 * Math.PI); g.stroke();
  g.restore();
  g.lineWidth = style.lw * s * 0.8; g.strokeStyle = ink; g.beginPath(); g.ellipse(cx, cy, rx * s - t, ry * s - t, rot, 0, Math.PI * 2); g.stroke();
  // bevel line along the blade
  const c = Math.cos(th), n = Math.sin(th), bx = -n * side, by = c * side, L = D.L * s, w = D.w * s * Math.max(WS_MIN, pl.ws || 1);
  if (!style.bevel) return;
  g.lineWidth = 1.2 * s; g.strokeStyle = style.bevel;
  g.beginPath(); g.moveTo(P[0] + c * 0.12 * L + bx * 0.45 * w, P[1] + n * 0.12 * L + by * 0.45 * w);
  g.quadraticCurveTo(P[0] + c * 0.55 * L + bx * 0.5 * w, P[1] + n * 0.55 * L + by * 0.5 * w, P[0] + c * 0.93 * L + bx * 0.1 * w, P[1] + n * 0.93 * L + by * 0.1 * w);
  g.stroke();
}

const STYLE = { metal: gray(0.85), ink: gray(0.14), rim: gray(0.55, 0.8), bevel: null, lw: 1.8 };

// draw a pair into g (its own canvas is needed for the destination-out holes: pass a layer context)
export function drawScissors(g, pl, D = DESIGN, style = STYLE) {
  g.save();
  half(g, pl, 1, D, style);
  half(g, pl, 0, D, style);
  const s = pl.s || 1;
  g.beginPath(); g.arc(pl.P[0], pl.P[1], D.screw * s, 0, Math.PI * 2);
  g.fillStyle = gray(0.82); g.fill(); g.lineWidth = 1.1 * s; g.strokeStyle = gray(0.25); g.stroke();
  g.beginPath(); g.moveTo(pl.P[0] - 2.5 * s, pl.P[1] + 1.5 * s); g.lineTo(pl.P[0] + 2.5 * s, pl.P[1] - 1.5 * s); g.stroke();
  g.restore();
}

// draw a pair onto g through its own temporary layer (so the finger holes show what g already holds)
let TMP = null;
export function blitScissors(g, pl, D = DESIGN) {
  const L = scissorsLayer(pl, D);
  g.drawImage(L.canvas, L.x, L.y);
}
// a pair on its own layer (so the finger holes show what is behind): { canvas, x, y, w, h }
export function scissorsLayer(pl, D = DESIGN, pad = 40) {
  const s = pl.s || 1, R = (D.L + 30) * s + pad;
  const x = Math.floor(pl.P[0] - R), y = Math.floor(pl.P[1] - R), w = Math.ceil(2 * R), h = Math.ceil(2 * R);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d"); g.translate(-x, -y);
  drawScissors(g, pl, D);
  return { canvas: c, x, y, w, h };
}
