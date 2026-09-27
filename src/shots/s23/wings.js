// s23 wings: the source's wings in this segment are big fans of long pointed feathers with thin grey separations
// and fine barbs (much bigger and pointier than the kit's paddle wings). Two kinds, both in owl units, viewer-left
// given and mirrored:
//  - fan:  feathers radiate from a hinge (the shoulder) between angle a0 (the trailing / lower edge) and a1 (the
//          leading edge); lengths L0 (trailing) -> Lpk (peak at fraction fpk) -> L1 (leading); a covert patch hides the
//          roots. Raised wings (carrying, hopping, powering up) and the reaching wing.
//  - band: secondaries hanging off an arm S -> W toward `sa`, primaries fanning off the hand; a covert band along the
//          leading edge. Level wings (pressing, landing).
// Adapted from this shot's earlier procedural pass (s23/owl.js, no longer imported).
import { gv, V } from "../../lib/owlInk.js";
import { lerp, rng } from "../../lib/rng.js";

const D = Math.PI / 180;
export function FW(hinge, a0, a1, L0, Lpk, L1, o = {}) {
  return { type: "fan", hinge, a0: a0 * D, a1: a1 * D, L0, Lpk, L1, fpk: o.fpk ?? 0.6, n: o.n ?? 12, hr: o.hr ?? 30, fw: o.fw ?? 0.32, cover: o.cover ?? 90, back: o.back ?? 30, seed: o.seed ?? 3, bend: o.bend ?? 0.06, side: -1, rows: o.rows ?? 1, soft: o.soft ?? 0 };
}
export function LW(S, W, pa0, pa1, pL0, pL1, sa, sL, o = {}) {
  return { type: "band", S, W, pa0: pa0 * D, pa1: pa1 * D, pL0, pL1, sa: sa * D, sL, n: o.n ?? 10, m: o.m ?? 6, hand: o.hand ?? [-30, -10], side: -1, cover: o.cover, seed: o.seed ?? 3, bend: o.bend ?? 0.05, sfan: o.sfan ?? 0.25, pw: o.pw ?? 0.27, sw: o.sw ?? 0.36 };
}
// mirror a viewer-left wing to the viewer-right side (over: replacements, in degrees for angles)
export function mirrorW(w, over = {}) {
  const m = (p) => (p ? [-p[0], p[1]] : p), o = { ...over };
  for (const k of ["a0", "a1", "pa0", "pa1", "sa"]) if (o[k] !== undefined) o[k] *= D;
  if (w.type === "fan") return { ...w, hinge: m(w.hinge), a0: Math.PI - w.a0, a1: Math.PI - w.a1, side: 1, seed: w.seed + 1, ...o };
  return { ...w, S: m(w.S), W: m(w.W), hand: m(w.hand), pa0: Math.PI - w.pa0, pa1: Math.PI - w.pa1, sa: Math.PI - w.sa, side: 1, seed: w.seed + 1, ...o };
}
// move / scale / rotate a wing about its root (for small per-frame variations)
export function shiftW(w, dx, dy, da = 0) {
  if (w.type === "fan") return { ...w, hinge: [w.hinge[0] + dx, w.hinge[1] + dy], a0: w.a0 + da, a1: w.a1 + da };
  return { ...w, S: [w.S[0] + dx, w.S[1] + dy], W: [w.W[0] + dx, w.W[1] + dy], pa0: w.pa0 + da, pa1: w.pa1 + da, sa: w.sa + da };
}

function fanFeathers(w) {
  const r = rng(w.seed), out = [];
  const Lat = (f) => { const pk = w.fpk; return f < pk ? lerp(w.L0, w.Lpk, Math.sin((Math.PI / 2) * f / pk)) : lerp(w.Lpk, w.L1, Math.pow((f - pk) / (1 - pk), 1.4)); };
  for (let i = 0; i < w.n; i++) {
    const f = i / (w.n - 1);                                   // 0 = trailing (lower) edge, 1 = leading edge
    const a = lerp(w.a0, w.a1, f) + (r() - 0.5) * 0.04;
    const L = Lat(f) * (0.95 + 0.1 * r());
    const hr = w.hr * (0.6 + 0.4 * f);
    const root = [w.hinge[0] + Math.cos(a) * hr, w.hinge[1] + Math.sin(a) * hr];
    out.push({ root, a, L, w: L * w.fw * (1.1 - 0.2 * f), bend: w.bend * w.side * (f - 0.3), kind: 1 });
  }
  // fix pass 2: a second, shorter row laid over the first between its feathers (the source's wings are layered rows
  // of overlapping feathers, not one comb)
  if (w.rows > 1) for (let i = 0; i < w.n - 1; i++) {
    const f = (i + 0.5) / (w.n - 1), a = lerp(w.a0, w.a1, f) + (r() - 0.5) * 0.05, L = Lat(f) * (0.6 + 0.08 * r());
    const hr = w.hr * (0.6 + 0.4 * f), root = [w.hinge[0] + Math.cos(a) * hr, w.hinge[1] + Math.sin(a) * hr];
    out.push({ root, a, L, w: L * w.fw * 1.25, bend: w.bend * w.side * (f - 0.3) * 1.2, kind: 2 });
  }
  return out;
}
function bandFeathers(w) {
  const r = rng(w.seed), out = [], side = w.side;
  for (let i = 0; i < w.m; i++) {
    const f = (i + 0.5) / w.m;
    const root = [lerp(w.S[0], w.W[0], 0.06 + 0.92 * f), lerp(w.S[1], w.W[1], 0.06 + 0.92 * f)];
    const L = w.sL * (0.78 + 0.28 * f) * (0.93 + 0.14 * r());
    out.push({ root, a: w.sa + (r() - 0.5) * 0.1 + w.sfan * (f - 0.5) * side, L, w: L * w.sw, bend: 0.02 * side, kind: 0 });
  }
  for (let i = 0; i < w.n; i++) {
    const f = w.n === 1 ? 1 : i / (w.n - 1);
    const root = [w.W[0] + w.hand[0] * f, w.W[1] + w.hand[1] * f];
    const L = lerp(w.pL0, w.pL1, Math.pow(f, 0.8)) * (0.93 + 0.12 * r());
    out.push({ root, a: lerp(w.pa0, w.pa1, f) + (r() - 0.5) * 0.05, L, w: L * w.pw * (1 + 0.15 * (1 - f)), bend: w.bend * side, kind: 1 });
  }
  return out;
}
export const feathersOf = (w) => (w.type === "fan" ? fanFeathers(w) : bandFeathers(w));
const tipOf = (f) => { const d = [Math.cos(f.a), Math.sin(f.a)], n = [-d[1], d[0]]; return [f.root[0] + d[0] * f.L + n[0] * f.bend * f.L, f.root[1] + d[1] * f.L + n[1] * f.bend * f.L]; };
// one long pointed feather (a lance): the leading vane narrower
function lancePts(f, round = 0) {
  const d = [Math.cos(f.a), Math.sin(f.a)], nn = [-d[1], d[0]], N = 12, L = [], R = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    // fix pass 1: softer, rounder tips (the source's wing feathers end in rounded points, not lances)
    const hw = f.w * 0.5 * Math.min(1, 0.55 + u * 2.4) * Math.pow(Math.max(0, 1 - u), round === 1 ? 0.3 : round ? 0.36 : 0.42);
    const c = [f.root[0] + d[0] * u * f.L + nn[0] * f.bend * f.L * u * u, f.root[1] + d[1] * u * f.L + nn[1] * f.bend * f.L * u * u];
    L.push([c[0] - nn[0] * hw * 0.72, c[1] - nn[1] * hw * 0.72]);
    R.push([c[0] + nn[0] * hw, c[1] + nn[1] * hw]);
  }
  return [...L, ...R.reverse()];
}
function polyPath(g, pts) { g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); }
// the extent of a wing (owl units)
export function wingPts(w) {
  const F = feathersOf(w), pts = w.type === "fan" ? [w.hinge, [w.hinge[0] - 60, w.hinge[1] - 60], [w.hinge[0] + 60, w.hinge[1] + 60]] : [w.S, w.W, [w.W[0] + w.hand[0], w.W[1] + w.hand[1]]];
  for (const f of F) { pts.push(tipOf(f)); pts.push(f.root); }
  return pts;
}
// paint one wing in owl units; px = one frame pixel in units (line widths); tone scales the grey lines
// (fix 1b: softer — lighter feather edges, faint shafts, fewer barbs, rounder tips, the web to 72 % — the fans read as
// combs before)
// the convex hull of a point set (the wing's web under its feathers)
function hull(pts) {
  const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
export function paintWing23(g, w, px, tone = 1) {
  const F = feathersOf(w), r = rng(w.seed + 101);
  g.save();
  g.lineJoin = "round"; g.lineCap = "round";
  const edge = w.soft ? gv(0.4, 0.4 * tone) : gv(0.26, 0.48 * tone), barb = gv(0.55, 0.17 * tone);
  // fix pass 1: the wing is one soft mass with separate feather tips only at its edge (the earlier fans read as
  // combs): a web under the feathers out to ~62 % of their length, with a faint grey shadow toward the trailing edge
  {
    const pts = w.type === "fan" ? [w.hinge] : [w.S, w.W];
    for (const f of F) { const t = tipOf(f); pts.push(f.root, [f.root[0] + (t[0] - f.root[0]) * 0.72, f.root[1] + (t[1] - f.root[1]) * 0.72]); }
    const H = hull(pts);
    g.beginPath(); polyPath(g, H); g.fillStyle = gv(0.94); g.fill();
    g.strokeStyle = gv(0.3, 0.35 * tone); g.lineWidth = px * 0.9; g.stroke();
  }
  for (const f of F) {
    const pts = lancePts(f, 0.5);
    g.beginPath(); polyPath(g, pts);
    const d = [Math.cos(f.a), Math.sin(f.a)];
    const gr = g.createLinearGradient(f.root[0], f.root[1], f.root[0] + d[0] * f.L, f.root[1] + d[1] * f.L);
    gr.addColorStop(0, gv(0.93)); gr.addColorStop(0.35, gv(0.975)); gr.addColorStop(0.85, gv(0.96)); gr.addColorStop(1, gv(0.9));
    g.fillStyle = gr; g.fill();
    g.strokeStyle = edge; g.lineWidth = px * 0.85; g.stroke();
    const nn = [-d[1], d[0]];
    const C = (u) => [f.root[0] + d[0] * u * f.L + nn[0] * f.bend * f.L * u * u, f.root[1] + d[1] * u * f.L + nn[1] * f.bend * f.L * u * u];
    g.strokeStyle = gv(0.52, 0.18 * tone); g.lineWidth = px * 0.6;
    g.beginPath(); const c0 = C(0.06), c1 = C(0.8); g.moveTo(c0[0], c0[1]); g.quadraticCurveTo(C(0.45)[0], C(0.45)[1], c1[0], c1[1]); g.stroke();
    g.strokeStyle = barb; g.lineWidth = px * 0.6;
    const nb = f.kind ? 3 : 2;
    for (let k = 0; k < nb; k++) {
      const u = 0.18 + 0.66 * (k + r() * 0.6) / nb, c = C(u), sd = k % 2 ? 1 : -0.7;
      const hw = f.w * 0.42 * Math.pow(1 - u, 0.6) * Math.abs(sd);
      g.beginPath(); g.moveTo(c[0], c[1]); g.lineTo(c[0] + nn[0] * hw * Math.sign(sd) + d[0] * f.L * 0.07, c[1] + nn[1] * hw * Math.sign(sd) + d[1] * f.L * 0.07); g.stroke();
    }
  }
  if (w.type === "fan") fanCoverts(g, w, px, tone, r);
  else bandCoverts(g, w, px, tone, r);
  g.restore();
}
function fanCoverts(g, w, px, tone, r) {
  const Lc = w.cover, a0 = w.a0, a1 = w.a1, pts = [], N = 14;
  for (let i = 0; i <= N; i++) { const a = lerp(a0, a1, i / N), k = Lc * (0.75 + 0.35 * Math.sin(Math.PI * i / N)); pts.push([w.hinge[0] + Math.cos(a) * k, w.hinge[1] + Math.sin(a) * k]); }
  const am = (a0 + a1) / 2;
  pts.push([w.hinge[0] - Math.cos(am) * w.back, w.hinge[1] - Math.sin(am) * w.back]);
  g.beginPath(); polyPath(g, pts); g.fillStyle = gv(0.95); g.fill();
  for (const [row, len, cnt] of [[0.62, 0.5, 9], [0.3, 0.42, 7]]) {
    for (let i = 0; i < cnt; i++) {
      const u = (i + 0.5 + (row < 0.5 ? 0.3 : 0)) / cnt, a = lerp(a0, a1, u) + (r() - 0.5) * 0.08;
      const rr = Lc * row * (0.85 + 0.2 * Math.sin(Math.PI * u)), L = Lc * len * (0.85 + 0.3 * r());
      const f = { root: [w.hinge[0] + Math.cos(a) * rr, w.hinge[1] + Math.sin(a) * rr], a, L, w: L * 0.7, bend: 0 };
      g.beginPath(); polyPath(g, lancePts(f, 1)); g.fillStyle = gv(0.96); g.fill();
      g.strokeStyle = gv(0.36, 0.5 * tone); g.lineWidth = px * 0.75; g.stroke();
    }
  }
  g.strokeStyle = gv(0.3, 0.5 * tone); g.lineWidth = px * 1.1;
  g.beginPath();
  for (let i = 0; i <= 8; i++) { const k = Lc * (0.2 + 0.9 * i / 8), p = [w.hinge[0] + Math.cos(a1) * k, w.hinge[1] + Math.sin(a1) * k]; i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); }
  g.stroke();
}
function bandCoverts(g, w, px, tone, r) {
  const H = [w.W[0] + w.hand[0], w.W[1] + w.hand[1]], lead = [];
  for (let i = 0; i <= 12; i++) { const u = i / 12; lead.push(u < 0.62 ? V.mix(w.S, w.W, u / 0.62) : V.mix(w.W, H, (u - 0.62) / 0.38)); }
  const cd = w.cover ?? w.sL * 0.5;
  const dirAt = (u) => (u < 0.62 ? w.sa : lerp(w.sa, (w.pa0 + w.pa1) / 2, (u - 0.62) / 0.38));
  const band = [...lead];
  for (let i = lead.length - 1; i >= 0; i--) {
    const u = i / (lead.length - 1), a = dirAt(u), k = cd * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, u * 1.15)));
    band.push([lead[i][0] + Math.cos(a) * k, lead[i][1] + Math.sin(a) * k]);
  }
  g.beginPath(); polyPath(g, band); g.fillStyle = gv(0.95); g.fill();
  for (const [row, len, cnt] of [[0.55, 0.62, 8], [0.12, 0.42, 9]]) {
    for (let i = 0; i < cnt; i++) {
      const u = (i + 0.5 + (row > 0.3 ? 0.25 : 0)) / cnt, a = dirAt(u);
      const p = lead[Math.min(lead.length - 1, Math.round(u * (lead.length - 1)))];
      const L = cd * len * (0.9 + 0.2 * r());
      const f = { root: [p[0] + Math.cos(a) * cd * row * 0.5, p[1] + Math.sin(a) * cd * row * 0.5], a: a + (r() - 0.5) * 0.12, L, w: L * 0.62, bend: 0 };
      g.beginPath(); polyPath(g, lancePts(f, 1)); g.fillStyle = gv(0.96); g.fill();
      g.strokeStyle = gv(0.34, 0.5 * tone); g.lineWidth = px * 0.75; g.stroke();
    }
  }
  g.strokeStyle = gv(0.3, 0.55 * tone); g.lineWidth = px * 1.1;
  g.beginPath(); lead.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.stroke();
}
