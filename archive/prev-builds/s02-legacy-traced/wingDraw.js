// s02 owl in flight: the wings are the source's measured silhouettes (wings.js, one pair per frame 16.00–19.12 s, in owl
// units with the bank removed), drawn behind the kit body. Inside each silhouette, the feathering is built from the
// outline itself: a soft grey toward the shoulder, a grey separation running in from every notch of the trailing
// edge (between two feather tips), two scalloped covert rows spanning neighbouring tips, and a thin grey outline.
import { WINGS, WING_F0, WING_INK } from "./wings.js";
import { gv } from "./designer.js";
import { taper } from "../../lib/ink.js";

const CACHE = new Map();
function decode(row) {
  const out = []; let i = 0;
  for (let w = 0; w < 2; w++) {
    const n = row[i++]; let x = row[i++], y = row[i++]; const q = [[x, y]];
    for (let k = 1; k < n; k++) { x += row[i++]; y += row[i++]; q.push([x, y]); }
    out.push(q);
  }
  return out;
}
export const WING_F1 = WING_F0 + WINGS.length - 1;
export function wingPolys(f) {
  const k = Math.max(0, Math.min(WINGS.length - 1, f - WING_F0));
  if (!CACHE.has(k)) CACHE.set(k, decode(WINGS[k]));
  return CACHE.get(k);
}
// the wing's reach along a ray from the shoulder: the farthest crossing of the outline
function reach(q, H, a) {
  const dx = Math.cos(a), dy = Math.sin(a); let best = 0;
  for (let i = 0; i < q.length; i++) {
    const p = q[i], r = q[(i + 1) % q.length];
    const ex = r[0] - p[0], ey = r[1] - p[1], den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const wx = p[0] - H[0], wy = p[1] - H[1];
    const t = (wx * ey - wy * ex) / den, u = (wx * dy - wy * dx) / den;
    if (t > 0 && u >= 0 && u <= 1) best = Math.max(best, t);
  }
  return best;
}
// feathering built on the silhouette's angular span round the shoulder: N primaries (soft grey partings along rays,
// from ~45% of the reach out to the tips), two scalloped covert rows between the rays, a grey base toward the shoulder
export function drawWing(g, q, sd, ppu = 1) {
  if (!q || q.length < 3) return;
  const H = [sd * 96, -40];
  // angles of the outline round H, unwrapped about the wing's main direction
  let cx = 0, cy = 0; for (const p of q) { cx += p[0]; cy += p[1]; } cx /= q.length; cy /= q.length;
  const a0 = Math.atan2(cy - H[1], cx - H[0]);
  let lo = 1e9, hi = -1e9, rmax = 0;
  for (const p of q) {
    let d = Math.atan2(p[1] - H[1], p[0] - H[0]) - a0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    const r = Math.hypot(p[0] - H[0], p[1] - H[1]);
    if (r > 60) { lo = Math.min(lo, d); hi = Math.max(hi, d); }
    rmax = Math.max(rmax, r);
  }
  if (!(hi > lo)) { lo = -0.5; hi = 0.5; }
  const path = (c) => { c.moveTo(q[0][0], q[0][1]); for (let i = 1; i < q.length; i++) c.lineTo(q[i][0], q[i][1]); c.closePath(); };
  const u = Math.max(1, 1 / Math.max(0.3, ppu) * 0.8);        // at least a frame pixel wide
  g.save();
  g.beginPath(); path(g);
  const rg = g.createRadialGradient(H[0], H[1], 0, H[0], H[1], rmax);
  rg.addColorStop(0, gv(0.8)); rg.addColorStop(0.4, gv(0.72)); rg.addColorStop(1, gv(0.7));
  g.fillStyle = rg; g.fill();
  g.clip();
  const span = hi - lo, N = Math.max(7, Math.min(14, Math.round(span / 0.11)));
  const rays = [];
  for (let k = 0; k <= 2 * N; k++) { const a = a0 + lo + span * k / (2 * N); rays.push([a, reach(q, H, a)]); }
  const P = (a, r) => [H[0] + Math.cos(a) * r, H[1] + Math.sin(a) * r];
  // a rounded lobe along angle a from radius r0 to r1, half-widths w0 (root) .. w1 (tip)
  const lobe = (a, r0, r1, w0, w1) => {
    const c = Math.cos(a), sn = Math.sin(a), nx = -sn, ny = c;
    const e = P(a, r1 - w1), b = P(a, r0);
    g.beginPath();
    g.moveTo(b[0] + nx * w0, b[1] + ny * w0);
    g.lineTo(e[0] + nx * w1, e[1] + ny * w1);
    g.arc(e[0], e[1], w1, Math.atan2(ny, nx), Math.atan2(-ny, -nx), sn * 0 + (a > 0 ? false : false));
    g.lineTo(b[0] - nx * w0, b[1] - ny * w0);
    g.closePath();
  };
  // primaries: puffy lobes on the odd rays, from 40% of the reach to the outline, drawn from one edge of the fan to the
  // other so each overlaps the next (the source's stacked fingers)
  const order = []; for (let k = 1; k < 2 * N; k += 2) order.push(k);
  if (sd < 0) order.reverse();
  for (const k of order) {
    const [a, R] = rays[k]; if (R < 50) continue;
    const dA = span / N, w1 = Math.max(4, 0.5 * R * dA), w0 = w1 * 0.8;
    lobe(a, R * 0.4, R + 1, w0, w1);
    g.fillStyle = gv(0.95); g.fill(); g.lineWidth = 1.5 * u; g.strokeStyle = gv(0.5, 0.85); g.stroke();
    // a soft grey along the lobe's trailing side
    g.save(); g.clip();
    const c = Math.cos(a), sn = Math.sin(a), nx = -sn * sd, ny = c * sd;
    const m = P(a, R * 0.7), gr = g.createLinearGradient(m[0] - nx * w1, m[1] - ny * w1, m[0] + nx * w1, m[1] + ny * w1);
    gr.addColorStop(0, gv(0.72, 0.55)); gr.addColorStop(0.45, gv(0.9, 0)); gr.addColorStop(1, gv(0.9, 0));
    g.fillStyle = gr; g.fillRect(m[0] - R, m[1] - R, 2 * R, 2 * R);
    g.restore();
  }
  // coverts: two rows of rounded scallops over the primaries' roots (at ~50% and ~32% of the reach)
  for (const [kf, len, col] of [[0.52, 0.2, 0.52], [0.34, 0.17, 0.56]]) {
    const ord = []; for (let k = 1; k < 2 * N; k += 2) ord.push(k);
    if (sd < 0) ord.reverse();
    for (const k of ord) {
      const [a, R] = rays[k]; if (R < 50) continue;
      const dA = span / N, w = Math.max(4, 0.55 * R * kf * dA * 1.9);
      lobe(a, R * (kf - len), R * kf, w * 0.9, w);
      g.fillStyle = gv(0.96); g.fill(); g.lineWidth = 1.4 * u; g.strokeStyle = gv(col, 0.8); g.stroke();
    }
  }
  // the shoulder: soft white round the root
  { const rg2 = g.createRadialGradient(H[0], H[1], 0, H[0], H[1], rmax * 0.3); rg2.addColorStop(0, gv(0.97)); rg2.addColorStop(0.7, gv(0.95)); rg2.addColorStop(1, gv(0.95, 0));
    g.fillStyle = rg2; g.fillRect(H[0] - rmax, H[1] - rmax, 2 * rmax, 2 * rmax); }
  g.restore();
  g.beginPath(); path(g); g.lineWidth = 1.6 * u; g.lineJoin = "round"; g.strokeStyle = gv(0.42, 0.8); g.stroke();
}

// the measured interior of one wing on frame f (side 0 = viewer-left, 1 = right): levels of shapes in owl units
export function drawWingInk(g, f, side) {
  const k = Math.max(0, Math.min(WING_INK.length - 1, f - WING_F0));
  for (const lev of WING_INK[k][side]) {
    for (const s of lev) {
      let i = 2; g.beginPath();
      for (let r = 0; r < s[1]; r++) {
        const n = s[i++]; let x = s[i++], y = s[i++]; g.moveTo(x, y);
        for (let j = 1; j < n; j++) { x += s[i++]; y += s[i++]; g.lineTo(x, y); }
        g.closePath();
      }
      g.fillStyle = gv(s[0] / 1000); g.fill("evenodd");
    }
  }
}
