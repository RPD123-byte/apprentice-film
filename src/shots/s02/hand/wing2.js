// s02 fix pass 2: the flying owl's spread wing, drawn by this shot (the kit's layered wing read as stacked round plates).
// Read off the source's flight frames (f436 / f464, 1.6-2x crops): a smooth bright leading-edge band; two rows of
// rounded coverts over the arm (the source's only scallops); long flight feathers under them: secondaries hanging off the
// arm toward the trailing edge, 6-8 long primaries fanning off the hand, each a soft white blade with a rounded tip,
// separated by a soft grey shade along one side (no dark outline round each feather). Everything in owl units.
import { rng } from "../../../lib/rng.js";
import { sampleCurve } from "../../../lib/paths.js";

const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]], mul = (a, k) => [a[0] * k, a[1] * k];
const len = (a) => Math.hypot(a[0], a[1]), nrm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const perp = (a) => [-a[1], a[0]];
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

// spec: { S, Wr, T, trail, c (chord: secondary length, units), n, m, spread, seed }
export function wing2Geom(w) {
  const { S, Wr, T, trail = [0, 1], c = 110, n = 7, m = 7, spread = 0.95, seed = 21, bulge = 0.1, priK = 1 } = w;
  const r = rng(seed), tr = nrm(trail), hand = nrm(sub(T, Wr)), arm = nrm(sub(Wr, S));
  const pa = perp(arm), bu = mul(pa, -(Math.sign(pa[0] * tr[0] + pa[1] * tr[1]) || 1) * len(sub(Wr, S)) * bulge);
  const lead = sampleCurve([S, add(mix(S, Wr, 0.5), bu), Wr, mix(Wr, T, 0.5), T], 8);
  const at = (u) => { const f = clamp(u) * (lead.length - 1), i = Math.min(lead.length - 2, Math.floor(f)); return mix(lead[i], lead[i + 1], f - i); };
  const ua = 0.5, F = [];
  // secondaries along the arm (body side first), hanging toward the trailing edge
  for (let i = 0; i < m; i++) {
    const f = (i + 0.5) / m, root = add(at(0.03 + f * (ua - 0.03)), mul(tr, c * 0.04));
    const dir = nrm(add(tr, mul(arm, -0.14 + 0.24 * f)));
    F.push({ row: "sec", root, dir, L: c * (0.92 + 0.1 * f) * (0.96 + 0.08 * r()), w: c * 0.5 });
  }
  // primaries off the hand, fanning from the trailing direction toward the hand direction; the outer ones longest
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n, root = add(at(ua + f * 0.44), mul(tr, c * 0.03 * (1 - f)));
    const dir = nrm(mix(tr, hand, clamp(0.3 + 0.7 * Math.pow(f, 0.8) * spread)));
    F.push({ row: "pri", root, dir, L: c * priK * (1.02 + 0.5 * Math.sin(Math.PI * Math.min(1, 0.25 + f * 0.85))) * (0.96 + 0.08 * r()), w: c * 0.5 });
  }
  // coverts: greater (over the flight-feather roots) and lesser (near the leading edge), tip side first
  const cov = [];
  for (const [k, cnt, Lc, u1, off] of [[0, 12, 0.46, 0.8, 0.05], [1, 11, 0.26, 0.7, 0.01]]) {
    for (let i = cnt - 1; i >= 0; i--) {
      const u = 0.02 + (i + 0.5) / cnt * u1, p = at(u), dl = u < ua ? tr : nrm(mix(tr, hand, clamp((u - ua) / 0.5) * 0.75 * spread));
      cov.push({ row: k ? "lc" : "gc", root: add(p, mul(dl, c * off)), dir: dl, L: c * Lc * (0.92 + 0.16 * r()) * (u > 0.7 ? 0.8 : 1), w: c * Lc * (k ? 0.8 : 0.62) });
    }
  }
  return { S, Wr, T, tr, c, lead, feathers: F, coverts: cov };
}
// the outline of one feather: a blade with nearly parallel sides and a rounded (primaries: slightly pointed) tip
function blade(f, point) {
  const { root, dir, L, w } = f, p = perp(dir), hw = w / 2, out = [];
  const W = (t) => hw * (0.72 + 0.28 * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.1)));
  const P = (t, s) => add(add(root, mul(dir, (L - hw) * t)), mul(p, s * W(t)));
  for (let k = 0; k <= 6; k++) out.push(P(k / 6, -1));
  const tipC = add(root, mul(dir, L - hw)), hwT = W(1);
  for (let k = 1; k < 12; k++) { const a = -Math.PI / 2 + Math.PI * k / 12, ext = 1 + point * Math.pow(Math.cos(a), 6) * 0.35; out.push(add(tipC, add(mul(dir, Math.cos(a) * hw * ext), mul(p, Math.sin(a) * hwT)))); }
  for (let k = 6; k >= 0; k--) out.push(P(k / 6, 1));
  return out;       // 7 side points, 11 tip points (indices 7..17), 7 side points
}
function pathOf(g, pts) { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }
const gv = (v, a = 1) => { const c = Math.round(clamp(v) * 255); return `rgba(${c},${c},${c},${a})`; };
// paint one feather: white with a soft grey shade along its lead side (the overlap with its neighbour) and a faint tip edge
function paintFeather(g, f, sgn, base, shade, ppu, point) {
  const pts = blade(f, point), p = perp(f.dir);
  g.beginPath(); pathOf(g, pts);
  const a = add(f.root, mul(p, sgn * f.w / 2)), b = add(f.root, mul(p, -sgn * f.w / 2));
  const gr = g.createLinearGradient(a[0], a[1], b[0], b[1]);
  gr.addColorStop(0, gv(shade)); gr.addColorStop(0.22, gv(base - 0.02)); gr.addColorStop(0.7, gv(base)); gr.addColorStop(1, gv(base - 0.03));
  g.fillStyle = gr; g.fill();
  // the tip edge: a soft grey line round the rounded end only
  g.beginPath(); g.moveTo(pts[6][0], pts[6][1]); for (let i = 7; i <= 18; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.strokeStyle = gv(0.55, 0.45); g.lineWidth = 1.1 / ppu; g.stroke();
  // the separation: a fine grey line along the lead side, fading toward the root
  const s0 = add(f.root, mul(p, sgn * f.w * 0.46)), s1 = add(add(f.root, mul(f.dir, f.L * 0.85)), mul(p, sgn * f.w * 0.42));
  const gl = g.createLinearGradient(s0[0], s0[1], s1[0], s1[1]); gl.addColorStop(0, gv(0.5, 0)); gl.addColorStop(0.5, gv(0.5, 0.45)); gl.addColorStop(1, gv(0.5, 0.35));
  g.beginPath(); g.moveTo(s0[0], s0[1]); g.lineTo(s1[0], s1[1]); g.strokeStyle = gl; g.lineWidth = 1.0 / ppu; g.stroke();
}
// paint the wing (owl units; ppu = frame px per unit). side: -1 viewer's left wing, +1 right
export function paintWing2(g, W, side, ppu) {
  const sgn = -side;                      // the shade sits on the side toward the body (the overlap)
  const pri = W.feathers.filter((f) => f.row === "pri"), sec = W.feathers.filter((f) => f.row === "sec");
  // flight feathers: outer primaries first (the inner ones overlap them), then the secondaries from the wrist inward
  for (let i = pri.length - 1; i >= 0; i--) paintFeather(g, pri[i], sgn, 0.965, 0.66, ppu, 0.5);
  for (let i = sec.length - 1; i >= 0; i--) paintFeather(g, sec[i], sgn, 0.955, 0.64, ppu, 0);
  // coverts: rounded, lower contrast (the source's scallop rows over the arm)
  for (const f of W.coverts) paintFeather(g, f, sgn, f.row === "lc" ? 0.975 : 0.965, f.row === "lc" ? 0.8 : 0.72, ppu, 0);
  // the leading-edge band: a smooth bright strip over the covert roots with a fine grey keyline along the front
  const band = W.lead.slice(), c = W.c;
  for (let i = W.lead.length - 1; i >= 0; i--) { const u = i / (W.lead.length - 1); band.push(add(W.lead[i], mul(W.tr, c * 0.16 * (1 - 0.7 * u)))); }
  g.beginPath(); pathOf(g, band); g.fillStyle = gv(0.975); g.fill();
  g.beginPath(); g.moveTo(W.lead[0][0], W.lead[0][1]); for (const q of W.lead) g.lineTo(q[0], q[1]);
  g.strokeStyle = gv(0.45, 0.7); g.lineWidth = 1.3 / ppu; g.lineJoin = "round"; g.stroke();
}
// every point of the wing's outline (for bounding boxes and the tip fit)
export function wing2Points(W) {
  const out = W.lead.slice();
  for (const f of W.feathers.concat(W.coverts)) out.push(add(f.root, mul(f.dir, f.L)), add(f.root, mul(perp(f.dir), f.w / 2)), add(f.root, mul(perp(f.dir), -f.w / 2)));
  return out;
}
