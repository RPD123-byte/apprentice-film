// s24 engraving pass (ending fix, 2026-09-27): the source's owls are engraved — the white plumage carries clusters of
// fine parallel strokes (fur tufts) that follow the feather flow and gather toward the shadowed edges, the face is
// ringed by a ruff of short radial strokes, and the wing bases are hatched grey. Everything here is procedural and
// seeded: the owl specs give a direction field and a tone field made of hand-placed ellipses (placed by comparing
// blurred ink-density maps of render and source; nothing of the source is stored).
import { taper } from "../../../lib/ink.js";
import { sampleCurve } from "../../../lib/paths.js";
import { rng } from "../../../lib/rng.js";
import { gv } from "../../../lib/owlInk.js";
import { polyPath, smoothFn } from "./art.js";

const add = (a, b) => [a[0] + b[0], a[1] + b[1]], mul = (a, k) => [a[0] * k, a[1] * k];
const nrm = (a) => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; }, perp = (a) => [-a[1], a[0]];

// tone field: base + Σ w·exp(−r²) over ellipses [cx, cy, rx, ry, w, rot?], clamped to 0..1
export function blobTone(list, base = 0) {
  return (p) => {
    let t = base;
    for (const b of list) {
      const c = Math.cos(b[5] || 0), s = Math.sin(b[5] || 0), dx = p[0] - b[0], dy = p[1] - b[1];
      const u = (c * dx + s * dy) / b[2], v = (-s * dx + c * dy) / b[3];
      t += b[4] * Math.exp(-(u * u + v * v));
    }
    return Math.max(0, Math.min(1, t));
  };
}
// direction field: a constant flow, bent round centres [cx, cy, radius, mode] where mode "r" = radial (strokes
// point away from the centre), "t" = tangential; the pull of each centre falls off over its radius
export function flowDir(flow, centres = []) {
  const f0 = nrm(flow);
  return (p) => {
    let d = [f0[0], f0[1]];
    for (const [cx, cy, R, mode, k = 1] of centres) {
      const v = [p[0] - cx, p[1] - cy], l = Math.hypot(v[0], v[1]) || 1, wgt = k * Math.exp(-((l / R) ** 2));
      let e = [v[0] / l, v[1] / l]; if (mode === "t") e = perp(e);
      if (e[0] * d[0] + e[1] * d[1] < 0 && mode === "t") e = mul(e, -1);
      d = nrm(add(mul(d, 1 - wgt), mul(e, wgt)));
    }
    return d;
  };
}

// fur tufts: on a jittered grid (cell px), where tone(p) wins a coin toss, a cluster of k fine parallel strokes
// (longest in the middle, fanned a little, bent together), along dir(p). Darker and fuller where the tone is high.
export function tufts(g, clip, box, o = {}) {
  const { dir = () => [1, 0], tone = () => 1, cell = 26, n = [2, 6], len = [12, 30], gap = 3.4, w = [0.55, 1.25], v = [0.5, 0.3], alpha = 0.85,
    bend = 0.16, jit = 0.9, seed = 1, keep = 1 } = o;
  const r = rng(seed);
  g.save();
  if (clip) { g.beginPath(); clip(g); g.clip(); }
  for (let y = box[1]; y < box[3]; y += cell) {
    for (let x = box[0]; x < box[2]; x += cell) {
      const p = [x + cell * (0.5 + (r() - 0.5) * jit), y + cell * (0.5 + (r() - 0.5) * jit)];
      const t = tone(p), coin = r(), q1 = r(), q2 = r(), q3 = r();
      if (coin > t * keep) continue;
      const d = dir(p), nn = perp(d);
      const k = Math.max(1, Math.round(n[0] + (n[1] - n[0]) * Math.min(1, t) * (0.55 + 0.45 * q1)));
      const L = (len[0] + (len[1] - len[0]) * q2) * (0.8 + 0.3 * t);
      const bb = (q3 - 0.5) * 2 * bend * L;
      const val = v[0] + (v[1] - v[0]) * Math.min(1, t);
      const col = gv(val, alpha);
      for (let i = 0; i < k; i++) {
        const c = k === 1 ? 0 : i - (k - 1) / 2, fall = k === 1 ? 1 : 1 - Math.abs(c) / (k / 2 + 0.5);
        const li = L * (0.5 + 0.5 * fall) * (0.85 + 0.3 * r());
        const off = c * gap * (0.8 + 0.4 * r()), s = (r() - 0.5) * 0.25 * L;
        const base = add(p, mul(nn, off));
        const a = add(base, mul(d, s - li / 2)), b = add(base, mul(d, s + li / 2)), m = add(add(base, mul(d, s)), mul(nn, bb));
        const ww = w[0] + (w[1] - w[0]) * r() * (0.6 + 0.4 * t);
        taper(g, sampleCurve([a, m, b], 5), (u) => Math.max(0.3, ww * Math.pow(Math.sin(Math.PI * u), 0.7)), col);
      }
    }
  }
  g.restore();
}

// a ruff: short strokes crossing a closed or open curve (the facial disc's edge, a fluffy silhouette edge), each
// leaning `lean` rad off the normal, length len, every `step` px, seeded; `side` = +1 out, −1 in, 0 across
export function ruff(g, pts, o = {}) {
  const { step = 6, len = [8, 18], w = [0.6, 1.3], v = 0.3, alpha = 0.85, lean = 0.3, side = 0, closed = false, seed = 3, skip = 0.15, per = 6 } = o;
  const q = sampleCurve(pts, per, closed), r = rng(seed);
  let acc = 0;
  for (let i = 1; i < q.length; i++) {
    const seg = Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]); acc += seg;
    if (acc < step) continue;
    acc = 0;
    if (r() < skip) continue;
    const t = nrm([q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]]), nn = perp(t);
    const a = lean + (r() - 0.5) * 0.3, dd = nrm(add(mul(nn, Math.cos(a)), mul(t, Math.sin(a))));
    const l = len[0] + (len[1] - len[0]) * r(), o0 = side === 0 ? -0.5 : side > 0 ? 0 : -1;
    const p0 = add(q[i], mul(dd, l * o0)), p1 = add(p0, mul(dd, l));
    const ww = w[0] + (w[1] - w[0]) * r();
    taper(g, sampleCurve([p0, add(mul(add(p0, p1), 0.5), mul(t, (r() - 0.5) * 2)), p1], 4), (u) => Math.max(0.3, ww * Math.pow(Math.sin(Math.PI * u), 0.6)), gv(v, alpha));
  }
}

// long barbs inside a feather: n fine lines from near the root toward the tip, spread across the vane, following
// the root→tip axis with a common bend (the source's primaries and tail feathers)
export function barbs(g, r0, t0, o = {}) {
  const { width = 30, n = 5, from = [0.05, 0.2], to = [0.55, 0.9], bend = 0.04, w = [0.6, 1.2], v = 0.35, alpha = 0.8, seed = 1, bias = 0 } = o;
  const r = rng(seed), d = [t0[0] - r0[0], t0[1] - r0[1]], L = Math.hypot(d[0], d[1]), u0 = nrm(d), nn = perp(u0);
  for (let i = 0; i < n; i++) {
    const off = ((i + 0.5) / n - 0.5 + bias) * width * (0.9 + 0.2 * r());
    const a = from[0] + (from[1] - from[0]) * r(), b = to[0] + (to[1] - to[0]) * r(), pts = [];
    for (let j = 0; j <= 6; j++) {
      const u = a + (b - a) * j / 6, taperK = 1 - 0.55 * u;
      pts.push(add(add(r0, mul(d, u)), mul(nn, off * taperK + bend * L * Math.sin(Math.PI * u))));
    }
    const ww = w[0] + (w[1] - w[0]) * r();
    taper(g, pts, (u) => Math.max(0.3, ww * Math.pow(Math.sin(Math.PI * u), 0.6)), gv(v, alpha));
  }
}

export const clipOf = (L) => L.clipPoly ? polyPath(L.clipPoly) : L.clip ? smoothFn(L.clip) : null;

// covert arches (the source's covert rows): at each tip T a rounded ∩ pointing along dir, width w, its two legs
// running back la / lb px (ink width by arc length: full round the tip, tapering down the legs). fill = the white
// vane inside (later arches overlap earlier ones); lines = fine barbs inside from the root side
export function arches(g, tips, o = {}) {
  const { dirs = null, dir = [0, -1], w = 40, la = 60, lb = 40, ink = 2.8, pow = 1.4, fill = false, v = 0.95, lines = 0, lineV = 0.4, seed = 5, ws = null, las = null, lbs = null, rev = false } = o;
  const r = rng(seed), order = [...tips.keys()]; if (rev) order.reverse();
  for (const i of order) {
    const T = tips[i], dd = nrm(dirs ? dirs[i] : dir), nn = perp(dd), W = (ws ? ws[i] : w) * (0.93 + 0.14 * r()), hw = W / 2;
    const A = (las ? las[i] : la) * (0.9 + 0.2 * r()), B = (lbs ? lbs[i] : lb) * (0.9 + 0.2 * r());
    // the arch: x across (−1..1), back distance y = hw·|x|^pow (a rounded point), then the legs straight back
    const P = (x, back) => add(add(T, mul(nn, x * hw)), mul(dd, -back));
    const pts = [];
    const M = 24, tipBack = hw * 0.95, NA = Math.max(2, Math.round(A / 4)), NB = Math.max(2, Math.round(B / 4));
    for (let j = 0; j < NA; j++) pts.push(P(-1, tipBack * pow + A * (1 - j / NA)));
    // an elliptical end (tangent to the legs), elongated by `pow` (back-depth / half-width)
    for (let j = 0; j <= M; j++) { const a = Math.PI * j / M, x = -Math.cos(a); pts.push(P(x, tipBack * pow * (1 - Math.sin(a)))); }
    for (let j = 1; j <= NB; j++) pts.push(P(1, tipBack * pow + B * j / NB));
    if (fill) { g.fillStyle = gv(v); g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.closePath(); g.fill(); }
    if (lines) {
      for (let h = 0; h < lines; h++) {
        const x = (h + 0.5) / lines * 1.5 - 0.75 + (r() - 0.5) * 0.15, b0 = tipBack * pow + Math.min(A, B) * (0.7 + 0.3 * r()), b1 = tipBack * pow * (0.5 + 0.4 * r()) + 4;
        taper(g, [P(x, b0), P(x * 0.95, (b0 + b1) / 2), P(x * 0.85, b1)], (u) => Math.max(0.3, (0.7 + 0.5 * r()) * Math.pow(Math.sin(Math.PI * u), 0.6)), gv(lineV, 0.8));
      }
    }
    // ink by arc length
    const q = pts, cum = [0];
    for (let j = 1; j < q.length; j++) cum.push(cum[j - 1] + Math.hypot(q[j][0] - q[j - 1][0], q[j][1] - q[j - 1][1]));
    const Ltot = cum[cum.length - 1], la0 = A / Ltot, lb0 = B / Ltot;
    taper(g, q, (u) => {
      const s = u; // index-parametrised → map to arc length
      const j = Math.min(q.length - 1, Math.round(s * (q.length - 1))), a = cum[j] / Ltot;
      const k = a < la0 ? Math.pow(a / la0, 0.7) : a > 1 - lb0 ? Math.pow((1 - a) / lb0, 0.7) : 1;
      return Math.max(0.4, ink * (0.25 + 0.75 * k));
    }, "rgb(18,17,16)");
  }
}

// the bandage as the source draws it on the flurry owls: two equal plasters crossing in an X (each a rounded strip
// with an inked outline, a pale fill, a faint crease and a scatter of dots), the second over the first.
// o = { a: [cx, cy, len, wd, deg], b: [...], ink, v, dots, seed }
export function bandX(g, o) {
  const { ink = 2.6, v = 0.93, dots = 14, seed = 9 } = o, r = rng(seed);
  for (const S of [o.a, o.b]) {
    const [cx, cy, L, wd, deg] = S;
    g.save(); g.translate(cx, cy); g.rotate(deg * Math.PI / 180);
    g.beginPath(); g.roundRect(-L / 2, -wd / 2, L, wd, wd / 2);
    g.fillStyle = gv(v); g.fill();
    g.save(); g.clip();
    g.fillStyle = gv(0.7, 0.25); g.fillRect(-L / 2, wd * 0.12, L, wd * 0.38);
    g.strokeStyle = gv(0.55, 0.5); g.lineWidth = 1; g.beginPath(); g.moveTo(-L * 0.42, -wd * 0.05); g.lineTo(L * 0.42, -wd * 0.02); g.stroke();
    g.fillStyle = gv(0.45, 0.7);
    for (let i = 0; i < dots; i++) { const x = (r() - 0.5) * L * 0.8, y = (r() - 0.5) * wd * 0.6; if (Math.abs(x) < wd * 0.55) continue; g.beginPath(); g.arc(x, y, 1.1, 0, Math.PI * 2); g.fill(); }
    g.restore();
    g.strokeStyle = "rgb(18,17,16)"; g.lineWidth = ink; g.beginPath(); g.roundRect(-L / 2, -wd / 2, L, wd, wd / 2); g.stroke();
    g.restore();
  }
}

// contour engraving (the source's belly and back): rows of broken lines running parallel to the silhouette's edge,
// inside it, `gap` px apart; the rows thin out away from the edge (keep probability falls with the row). Only the
// stretch of outline inside `box` is used. o = { box, rows, gap, dash, skip, w, v, alpha, seed, fall, jit }
export function contourLines(g, poly, o = {}) {
  const { box = [-1e9, -1e9, 1e9, 1e9], rows = 6, gap = 7, dash = [30, 90], skip = [6, 30], w = [0.6, 1.3], v = 0.35, alpha = 0.85, seed = 1, fall = 0.8, jit = 1.5, step = 3 } = o;
  const r = rng(seed), n = poly.length;
  // resample the closed outline every `step` px
  const P = [];
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.round(L / step));
    for (let j = 0; j < m; j++) P.push([a[0] + (b[0] - a[0]) * j / m, a[1] + (b[1] - a[1]) * j / m]);
  }
  const N = P.length;
  let A = 0; for (let i = 0; i < n; i++) { const p = poly[i], q = poly[(i + 1) % n]; A += p[0] * q[1] - q[0] * p[1]; }
  const s = A > 0 ? 1 : -1;
  // smoothed inward normals (average the tangent over ±6 samples so the offsets stay smooth)
  const NR = P.map((p, i) => { const a = P[(i - 6 + N) % N], b = P[(i + 6) % N], t = nrm([b[0] - a[0], b[1] - a[1]]); return [-t[1] * s, t[0] * s]; });
  const inBox = (p) => p[0] >= box[0] && p[0] <= box[2] && p[1] >= box[1] && p[1] <= box[3];
  g.save(); g.beginPath(); polyPath(poly)(g); g.clip();
  for (let row = 0; row < rows; row++) {
    const keep = Math.pow(fall, row), d0 = gap * (row + 0.7);
    let i = 0;
    while (i < N) {
      const len = Math.round((dash[0] + (dash[1] - dash[0]) * r()) / step), sk = Math.round((skip[0] + (skip[1] - skip[0]) * r()) / step);
      const on = r() < keep, dj = (r() - 0.5) * jit, ww = w[0] + (w[1] - w[0]) * r();
      if (on) {
        const pts = [];
        for (let j = 0; j < len && i + j < N; j++) { const p = P[i + j]; if (!inBox(p)) { if (pts.length) break; continue; } const d = d0 + dj; pts.push([p[0] + NR[i + j][0] * d, p[1] + NR[i + j][1] * d]); }
        if (pts.length > 3) taper(g, pts, (u) => Math.max(0.3, ww * Math.pow(Math.sin(Math.PI * u), 0.6)), gv(v + row * 0.02, alpha));
      }
      i += len + sk;
    }
  }
  g.restore();
}
