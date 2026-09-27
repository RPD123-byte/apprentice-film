// s13 brush kit: bold tapered brush strokes grouped into feather clumps, ink wedges cut into a silhouette,
// flame-shaped tufts, and brush-drawn eye rims. Everything is seeded (no boiling) and drawn in frame pixels.
import { taper } from "../../lib/ink.js";
import { sampleCurve, smoothPath } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";
import { flick, walk, area, gv, LINE, V } from "../../lib/owlInk.js";

const { add, sub, mul, nrm, perp } = V;
const TAU = Math.PI * 2;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// A brush stroke through control points: full width near the root, tapering to a hair at the tip.
export function brush(g, pts, w, color = LINE, { head = 0.12, pow = 0.85, per = 6 } = {}) {
  const q = sampleCurve(pts, per);
  taper(g, q, (u) => w * Math.min(1, 0.3 + u / head) * Math.pow(1 - u, pow), color);
}
// A stroke that swells in the middle and tapers at both ends.
export function swellStroke(g, pts, w, color = LINE, { per = 6, pow = 0.6, end = 0.1 } = {}) {
  const q = sampleCurve(pts, per);
  taper(g, q, (u) => w * (end + (1 - end) * Math.pow(Math.sin(Math.PI * clamp01(u)), pow)), color);
}

// One feather clump: n tapered strokes rooted side by side across `spread`, all following angle `ang`, fanning a
// little, the middle ones longest.
export function clump(g, root, ang, r, { n = 4, len = 40, w = 3.5, color = gv(0.25), spread = 10, fan = 0.25, jit = 0.12, curve = 0.14 } = {}) {
  const d = [Math.cos(ang), Math.sin(ang)], nn = perp(d);
  const bend = (r() - 0.5) * 2 * curve;
  for (let i = 0; i < n; i++) {
    const f = n > 1 ? i / (n - 1) - 0.5 : 0;
    const p = add(add(root, mul(nn, f * spread + (r() - 0.5) * spread * 0.35)), mul(d, (r() - 0.5) * len * 0.25));
    const a = ang + f * fan + (r() - 0.5) * jit;
    const L = len * (0.6 + 0.5 * r()) * (1 - Math.abs(f) * 0.45);
    flick(g, p, [Math.cos(a), Math.sin(a)], L, w * (0.65 + 0.45 * r()), color, bend + (r() - 0.5) * 0.08);
  }
}

// Clumps along an outline (open or closed polyline of control points). flow(p, inward) -> stroke angle.
// Between clumps, a dark ink wedge is cut into the silhouette from outside (the black between feather tufts).
export function clumpRim(g, outline, o = {}) {
  const { step = 30, inset = 4, seed = 1, closed = false, from = 0, to = 1, flow, n = [3, 6], len = [30, 50], w = [2.5, 4.5],
    color = gv(0.25), spread = 12, wedge = null, skip = 0 } = o;
  const poly = sampleCurve(outline, 6, closed);
  const cw = area(poly) > 0;
  let k = 0;
  walk(poly, step, seed, (p, t, u, r) => {
    const inw = cw ? [-t[1], t[0]] : [t[1], -t[0]];
    const ang = flow ? flow(p, inw, u) : Math.atan2(inw[1], inw[0]);
    if (r() >= skip) {
      const root = add(p, mul(inw, inset * (0.4 + r())));
      clump(g, root, ang, r, { n: Math.round(n[0] + r() * (n[1] - n[0])), len: len[0] + r() * (len[1] - len[0]), w: w[0] + r() * (w[1] - w[0]), color, spread });
    }
    if (wedge && (k++ % (wedge.every || 1)) === 0) {
      // the wedge sits half a step along, starting just outside the edge and pointing in along the flow
      const q = add(p, mul(t, step * 0.5));
      const a2 = wedge.ang != null ? wedge.ang : ang;
      const dir = nrm(add(mul(inw, 1 - (wedge.bend ?? 0.5)), mul([Math.cos(a2), Math.sin(a2)], wedge.bend ?? 0.5)));
      const L = wedge.len[0] + r() * (wedge.len[1] - wedge.len[0]);
      flick(g, sub(q, mul(inw, 3)), dir, L, wedge.w * (0.7 + 0.6 * r()), wedge.color || gv(0.05), (r() - 0.5) * 0.3);
    }
  }, { from, to, jitter: 0.5 });
}

// Clumps scattered through a region (clipped to path), e.g. the flank or tail. angFn(x, y) -> stroke angle.
export function clumpField(g, path, box, count, angFn, seed, o = {}) {
  const r = rng(seed);
  g.save(); g.beginPath(); path(g); g.clip();
  for (let i = 0; i < count; i++) {
    const x = box[0] + r() * (box[2] - box[0]), y = box[1] + r() * (box[3] - box[1]);
    const nn = o.n || [3, 5], ln = o.len || [25, 45], ww = o.w || [2, 3.5];
    clump(g, [x, y], angFn(x, y), r, { n: Math.round(nn[0] + r() * (nn[1] - nn[0])), len: ln[0] + r() * (ln[1] - ln[0]), w: ww[0] + r() * (ww[1] - ww[0]), color: o.color || gv(0.25), spread: o.spread || 10, fan: o.fan ?? 0.25, curve: o.curve ?? 0.14 });
  }
  g.restore();
}

// A flame-shaped tuft: base b0 -> tip -> base b1, the sides bowing out/in (bulge: + bows the b0 side outward,
// hook: concave bow of the b1 side). Returns the path function.
export function flamePath(b0, tip, b1, { bulge = 0.18, hook = 0.22 } = {}) {
  return (c) => {
    const m0 = V.mix(b0, tip, 0.5), m1 = V.mix(tip, b1, 0.5);
    const n0 = perp(nrm(sub(tip, b0))), n1 = perp(nrm(sub(b1, tip)));
    const L0 = V.len(sub(tip, b0)), L1 = V.len(sub(b1, tip));
    const c0 = sub(m0, mul(n0, L0 * bulge)), c1 = add(m1, mul(n1, L1 * hook));
    c.moveTo(b0[0], b0[1]);
    c.quadraticCurveTo(c0[0], c0[1], tip[0], tip[1]);
    c.quadraticCurveTo(c1[0], c1[1], b1[0], b1[1]);
    c.closePath();
  };
}

// Eye rim drawn as overlapping brush strokes. e: {x, y, rx, ry, rot}; R(a) radius scale and Wd(a) width (px)
// as functions of the ellipse angle a; segs: [[a0, a1, dr]] angle spans (radians, may exceed 2π) with a small
// radius offset each (overshoot); each span tapers at both ends so the overlaps read as brush joins.
export function brushRim(g, e, R, Wd, segs, color = LINE) {
  const cr = Math.cos(e.rot), sr = Math.sin(e.rot);
  const at = (a, k) => { const x = Math.cos(a) * e.rx * k, y = Math.sin(a) * e.ry * k; return [e.x + x * cr - y * sr, e.y + x * sr + y * cr]; };
  for (const [a0, a1, dr, tip = 0.18] of segs) {
    const n = Math.max(8, Math.round(Math.abs(a1 - a0) * 40));
    const pts = [], ws = [];
    for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; pts.push(at(a, R(a) + dr)); ws.push(Wd(a)); }
    taper(g, pts, (u) => {
      const i = Math.round(u * n);
      const ramp = Math.min(1, u / tip, (1 - u) / tip);
      return ws[i] * (0.15 + 0.85 * Math.pow(clamp01(ramp), 0.7));
    }, color);
  }
}
// Periodic linear interpolation through samples taken at equal angles (k / N * 2π).
export function angInterp(samples) {
  const N = samples.length;
  return (a) => {
    let f = ((a % TAU) + TAU) % TAU / TAU * N;
    const i = Math.floor(f) % N, j = (i + 1) % N;
    f -= Math.floor(f);
    return samples[i] * (1 - f) + samples[j] * f;
  };
}

// Leather highlights on a dark cushion: irregular pale streaks and crumples inside clip, running along `ang`.
export function leather(g, clip, box, n, ang, seed, { lo = 0.5, hi = 0.82, len = [15, 60], w = [2, 5], curve = 0.3 } = {}) {
  const r = rng(seed);
  g.save(); g.beginPath(); clip(g); g.clip();
  for (let i = 0; i < n; i++) {
    const x = box[0] + r() * (box[2] - box[0]), y = box[1] + r() * (box[3] - box[1]);
    const a = ang + (r() - 0.5) * 0.7, L = len[0] + r() * (len[1] - len[0]);
    const d = [Math.cos(a), Math.sin(a)], nn = perp(d), b = (r() - 0.5) * curve * L;
    const p0 = [x, y], p2 = add(p0, mul(d, L)), p1 = add(V.mix(p0, p2, 0.5), mul(nn, b));
    swellStroke(g, [p0, add(V.mix(p0, p1, 0.5), mul(nn, (r() - 0.5) * 3)), p1, add(V.mix(p1, p2, 0.5), mul(nn, (r() - 0.5) * 3)), p2], w[0] + r() * (w[1] - w[0]), gv(lo + (hi - lo) * r(), 0.9), { pow: 0.5 });
  }
  g.restore();
}

// An ink wedge cut into a silhouette: full width `w` at p (just outside the edge), tapering to a point L along dir.
export function wedge(g, p, dir, L, w, color = gv(0.05), bend = 0) {
  const n = perp(dir), p0 = sub(p, mul(dir, 2)), p2 = add(p, mul(dir, L)), p1 = add(V.mix(p0, p2, 0.5), mul(n, bend * L));
  taper(g, sampleCurve([p0, p1, p2], 5), (u) => w * Math.pow(1 - u, 0.9), color);
}

export { smoothPath, rng, gv, LINE, V, TAU };
