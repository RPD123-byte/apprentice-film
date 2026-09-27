// s28 hair, drawn by hand: a coarse black mass, tapered locks (root -> tip centre-lines, placed from gridded source
// frames), lighter highlight strands running along each lock and along the mass's flow, and a few skin-coloured
// partings between locks. Everything is seeded (no Math.random): the drawing never boils.
import { ink, shape, sample, trace } from "./kit.js";
import { rng } from "../../../lib/rng.js";

export const HAIR_INK = "#0d0a0b";
// a lock: pts = root ... tip (3-5 points), w = width at the root; bulge = where it is widest (0..1)
export function lock(g, pts, w, color = HAIR_INK, { bulge = 0.18, tip = 0 } = {}) {
  ink(g, pts, (u) => {
    const a = u < bulge ? 0.75 + 0.25 * (u / bulge) : Math.pow(1 - (u - bulge) / (1 - bulge), 0.85);
    return Math.max(tip, w * a);
  }, color);
}
// tangent of a sampled polyline at parameter u
function along(q, u) {
  const n = q.length - 1, i = Math.min(n - 1, Math.max(0, Math.floor(u * n))), f = u * n - i;
  const a = q[i], b = q[i + 1];
  return { p: [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], d: [b[0] - a[0], b[1] - a[1]] };
}
// highlight strands along a lock: `n` thin lighter lines offset across the lock, over part of its length
export function lockShine(g, pts, w, seed, { n = 2, col = "rgba(150,128,128,0.55)", from = 0.12, to = 0.7, lw = 1.1 } = {}) {
  const q = sample(pts, false), r = rng(seed);
  for (let k = 0; k < n; k++) {
    const off = (k / Math.max(1, n - 1) - 0.5) * w * 0.5 + (r() - 0.5) * w * 0.15;
    const a = from + r() * 0.08, b = to - r() * 0.15, P = [];
    for (let s = 0; s <= 6; s++) {
      const u = a + (b - a) * s / 6, { p, d } = along(q, u), L = Math.hypot(d[0], d[1]) || 1;
      const taper = 1 - u * 0.8;
      P.push([p[0] - d[1] / L * off * taper, p[1] + d[0] / L * off * taper]);
    }
    ink(g, P, lw * (0.7 + 0.6 * r()), col, { taper: 0.95 });
  }
}
// strands inside the mass, following guide curves (each guide: points in flow order); clipped to the mass
export function massStrands(g, mass, guides, seed, { per = 18, spread = 26, col = "rgba(158,138,142,0.62)", len = [0.25, 0.6], lw = [0.9, 1.4] } = {}) {
  const r = rng(seed);
  g.save(); g.beginPath(); trace(g, mass, true, true); g.clip();
  for (const G of guides) {
    const q = sample(G, false);
    for (let i = 0; i < per; i++) {
      const off = (r() - 0.5) * 2 * spread, a = r() * (1 - len[1]), b = a + len[0] + r() * (len[1] - len[0]), P = [];
      for (let s = 0; s <= 6; s++) {
        const u = a + (b - a) * s / 6, { p, d } = along(q, Math.min(0.999, u)), L = Math.hypot(d[0], d[1]) || 1;
        P.push([p[0] - d[1] / L * off, p[1] + d[0] / L * off]);
      }
      ink(g, P, lw[0] + r() * lw[1], col, { taper: 0.95 });
    }
  }
  g.restore();
}
// the whole head of hair: mass, locks, shine; partings = skin-coloured slivers drawn over the mass (between locks)
export function drawHair(g, { mass, locks, guides = [], partings = [], seed = 1, skin = "#e7bfa6", shine = true }) {
  shape(g, mass, HAIR_INK);
  for (const P of partings) ink(g, P.pts, P.w, skin, { taper: 0.9 });
  for (const L of locks) lock(g, L[0], L[1], HAIR_INK, L[2] || {});
  if (!shine) return;
  massStrands(g, mass, guides, seed);
  let s = seed * 31;
  for (const L of locks) if (L[1] >= 9) lockShine(g, L[0], L[1], s++, { n: L[1] >= 16 ? 3 : 2 });
}
// fix 2: a lock's end broken into several tapering tips (thin strands fanning out from ~60% of the lock past its tip)
export function lockTips(g, pts, w, seed, { n = 3, spread = 0.35, reach = 0.45, color = HAIR_INK } = {}) {
  const q = sample(pts, false), r = rng(seed), N = q.length - 1;
  const i0 = Math.floor(N * 0.55), a = q[i0], b = q[N], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const dx = (b[0] - a[0]) / L, dy = (b[1] - a[1]) / L;
  for (let k = 0; k < n; k++) {
    const ang = (k / Math.max(1, n - 1) - 0.5) * spread * 2 + (r() - 0.5) * 0.12;
    const c = Math.cos(ang), s = Math.sin(ang), ex = dx * c - dy * s, ey = dx * s + dy * c;
    const len = L * (1 + reach * (0.5 + r())), off = (k / Math.max(1, n - 1) - 0.5) * w * 0.6;
    const p0 = [a[0] - dy * off, a[1] + dx * off];
    const p1 = [p0[0] + ex * len * 0.5 + (r() - 0.5) * 3, p0[1] + ey * len * 0.5 + (r() - 0.5) * 3];
    const p2 = [p0[0] + ex * len, p0[1] + ey * len];
    ink(g, [p0, p1, p2], (u) => Math.max(0.4, w * 0.42 * (1 - u) ** 0.9), color);
  }
}
// fine strands: n thin tapered lines along flow guides (root -> tip), seeded; drawn over skin and hair alike
export function fineStrands(g, guides, n, seed, { spread = 18, col = HAIR_INK, lw = [0.8, 1.2], len = [0.3, 0.7] } = {}) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const G = guides[i % guides.length], q = sample(G, false);
    const off = (r() - 0.5) * 2 * spread, a = r() * (1 - len[1]) * 0.8, b = Math.min(1, a + len[0] + r() * (len[1] - len[0])), P = [];
    for (let s = 0; s <= 6; s++) {
      const u = a + (b - a) * s / 6, { p, d } = along(q, Math.min(0.999, u)), L = Math.hypot(d[0], d[1]) || 1;
      P.push([p[0] - d[1] / L * off, p[1] + d[0] / L * off]);
    }
    const w0 = lw[0] + r() * lw[1];
    ink(g, P, (u) => w0 * (1 - 0.85 * u), col);
  }
}
