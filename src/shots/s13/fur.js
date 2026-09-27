// s13 fur engine (fix pass 1b): authored, rule-based plumage marks. Nothing here is traced: strokes are placed by a
// seeded jittered grid and grown along a smooth direction field that is interpolated from a few dozen measured
// anchors per part ([x, y, angle, coherence, coverage, depth] — coarse statistics of the source's hatching read on a
// 30-60 px grid by snapshots/s13-fix1-tools/flow.py). Tone zones are authored polygons (a few dozen control points)
// with a rule-generated ragged fur edge. Deterministic (rng seeds only).
import { taper } from "../../lib/ink.js";
import { sampleCurve } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";
import { gv, V } from "../../lib/owlInk.js";

const { add, sub, mul, nrm, perp } = V;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// A smooth field over a box from anchors [x, y, ang, coh, cov, dep, len, w, v, dens]: undirected direction
// (doubled-angle IDW, weighted by coherence) and scalar channels (IDW; the stroke length / width / value channels only
// from anchors that have strokes), precomputed on a coarse grid and looked up bilinearly.
export function field(anchors, box, { cell = 8, eps = 24, pow = 2, minCoh = 0.05, dirs = null, si = 6 } = {}) {
  const [x0, y0, x1, y1] = box, nx = Math.ceil((x1 - x0) / cell) + 1, ny = Math.ceil((y1 - y0) / cell) + 1, N = nx * ny;
  const C2 = new Float32Array(N), S2 = new Float32Array(N), COV = new Float32Array(N), DEP = new Float32Array(N);
  const LEN = new Float32Array(N), WID = new Float32Array(N), VAL = new Float32Array(N), DEN = new Float32Array(N);
  const D = dirs || [];   // authored direction anchors [x, y, ang, weight] (always coherent)
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i * cell, y = y0 + j * cell;
    let c = 0, s = 0, wd = 0, cv = 0, dp = 0, ws = 0, ln = 0, wi = 0, va = 0, wk = 0, de = 0;
    for (const a of anchors) {
      const d2 = (a[0] - x) ** 2 + (a[1] - y) ** 2, w = 1 / Math.pow(d2 + eps * eps, pow / 2);
      const k = w * Math.max(minCoh, a[3] ?? 1);
      c += k * Math.cos(2 * a[2]); s += k * Math.sin(2 * a[2]); wd += k;
      if (a.length > 4) { cv += w * a[4]; dp += w * a[5]; ws += w; }
      if (a.length > si + 3) { de += w * a[si + 3]; if (a[si + 3] > 0) { ln += w * a[si]; wi += w * a[si + 1]; va += w * a[si + 2]; wk += w; } }
    }
    for (const a of D) { const d2 = (a[0] - x) ** 2 + (a[1] - y) ** 2, w = (a[3] ?? 1) / Math.pow(d2 + eps * eps, pow / 2); c += w * Math.cos(2 * a[2]); s += w * Math.sin(2 * a[2]); wd += w; }
    const o = j * nx + i; C2[o] = c / (wd || 1); S2[o] = s / (wd || 1); COV[o] = ws ? cv / ws : 0; DEP[o] = ws ? dp / ws : 0;
    DEN[o] = ws ? de / ws : 0; LEN[o] = wk ? ln / wk : 0; WID[o] = wk ? wi / wk : 0; VAL[o] = wk ? va / wk : 0;
  }
  const at = (arr, x, y) => {
    const fx = clamp01((x - x0) / (x1 - x0)) * (nx - 1), fy = clamp01((y - y0) / (y1 - y0)) * (ny - 1);
    const i = Math.min(nx - 2, Math.floor(fx)), j = Math.min(ny - 2, Math.floor(fy)), u = fx - i, v = fy - j, o = j * nx + i;
    return (arr[o] * (1 - u) + arr[o + 1] * u) * (1 - v) + (arr[o + nx] * (1 - u) + arr[o + nx + 1] * u) * v;
  };
  return {
    box,
    dir: (x, y) => { const c = at(C2, x, y), s = at(S2, x, y), a = 0.5 * Math.atan2(s, c); return [Math.cos(a), Math.sin(a)]; },
    cov: (x, y) => at(COV, x, y), dep: (x, y) => at(DEP, x, y),
    len: (x, y) => at(LEN, x, y), wid: (x, y) => at(WID, x, y), val: (x, y) => at(VAL, x, y), dens: (x, y) => at(DEN, x, y),
  };
}

// grow a streamline of length L through p along the field (both ways), with a gentle bend; returns points
function streamline(F, p, L, bend, step = 3) {
  const half = (sgn) => {
    const pts = []; let q = p, d0 = null;
    for (let s = 0; s < L / 2; s += step) {
      let d = F.dir(q[0], q[1]);
      if (!d0) d0 = mul(d, sgn); else if (d[0] * d0[0] + d[1] * d0[1] < 0) d = mul(d, -1);
      d = nrm(add(d, mul(perp(d), bend * sgn)));
      q = add(q, mul(d, step)); d0 = d; pts.push(q);
    }
    return pts;
  };
  const a = half(-1).reverse(), b = half(1);
  return [...a, p, ...b];
}

// Hair strokes over a region, clipped to `clip`, following field F. spec:
//   dens: strokes per 10k px^2 (number or (x, y) => number; default: from the field's coverage / stroke area)
//   len [a, b], w [a, b] (max width, px), v [a, b] (pre-grade ink value), bend (curvature, rad per step, +-),
//   pow (taper), bias (where the swell peaks along the stroke), group [n0, n1] + gap (near-parallel companions),
//   keep(x, y) -> bool, covGain (scales the field-coverage density), seed, cell (grid cell, px).
export function furStrokes(g, clip, F, spec) {
  const { box = F.box, len = [20, 50], w = [1.2, 2.4], v = [0.35, 0.55], bend = 0.02, pow = 0.7, bias = 0.4, group = [1, 1], gap = 3.5,
    keep = null, covGain = 1, dens = null, seed = 1, cell = 14, vFn = null, wFn = null, lenFn = null } = spec;
  const r = rng(seed);
  g.save();
  if (clip) { g.beginPath(); clip(g); g.clip("evenodd"); }
  const [x0, y0, x1, y1] = box;
  for (let y = y0; y < y1; y += cell) for (let x = x0; x < x1; x += cell) {
    const cx = x + r() * cell, cy = y + r() * cell;
    const Lm = (len[0] + len[1]) / 2 * (lenFn ? lenFn(cx, cy) : 1), Wm = (w[0] + w[1]) / 2 * (wFn ? wFn(cx, cy) : 1);
    const gm = (group[0] + group[1]) / 2;
    let d = typeof dens === "function" ? dens(cx, cy) : dens;
    if (d == null) d = (F.cov(cx, cy) * covGain * 1e4) / (Lm * Wm * 0.55 * gm);
    const lam = (d * cell * cell) / 1e4;
    // Poisson count for this cell (seeded)
    let n = 0, pr = Math.exp(-lam), acc = pr; const u0 = r();
    while (u0 > acc && n < 12) { n++; pr *= lam / n; acc += pr; }
    for (let k = 0; k < n; k++) {
      const p = [x + r() * cell, y + r() * cell];
      if (keep && !keep(p[0], p[1])) { r(); r(); r(); r(); continue; }
      const L = (len[0] + r() * (len[1] - len[0])) * (lenFn ? lenFn(p[0], p[1]) : 1);
      const W = (w[0] + r() * (w[1] - w[0])) * (wFn ? wFn(p[0], p[1]) : 1);
      const val = vFn ? vFn(p[0], p[1], r()) : v[0] + r() * (v[1] - v[0]);
      const b = bend * (r() < 0.5 ? -1 : 1) * (0.4 + r());
      const ng = group[0] + Math.floor(r() * (group[1] - group[0] + 1));
      const base = streamline(F, p, L, b);
      if (base.length < 3) continue;
      for (let m = 0; m < ng; m++) {
        let pts = base;
        if (m > 0) {
          const off = gap * m * (r() < 0.5 ? -1 : 1) * (0.7 + 0.6 * r()), sh = (r() - 0.5) * L * 0.3;
          const d0 = nrm(sub(base[base.length - 1], base[0])), nn = perp(d0);
          pts = base.map((q) => add(add(q, mul(nn, off)), mul(d0, sh)));
          pts = pts.slice(Math.floor(pts.length * 0.15 * r()), pts.length - Math.floor(pts.length * 0.2 * r()));
          if (pts.length < 3) continue;
        }
        const ww = W * (m ? 0.6 + 0.3 * r() : 1);
        taper(g, pts, (u) => ww * Math.pow(Math.sin(Math.PI * clamp01(u < bias ? (u / bias) * 0.5 : 0.5 + ((u - bias) / (1 - bias)) * 0.5)), pow), gv(val + (m ? 0.08 : 0)));
      }
    }
  }
  g.restore();
}

// Hair strokes from the field's measured texture statistics (count per area, length, width, value), each stroke a
// seeded streamline. o: densK / lenK / wK scale the statistics, dv shifts the value, spread = length variation,
// minLen, bend, pow / bias (taper), group [n0, n1] + gap, keep(x, y), seed, cell.
export function hair(g, clip, F, o = {}) {
  const { densK = 1, lenK = 1, wK = 1, dv = 0, spread = 0.5, minLen = 8, maxLen = 400, bend = 0.015, pow = 0.75, bias = 0.4, group = [1, 1], gap = 3,
    keep = null, seed = 1, cell = 16, box = F.box, vMin = 0.08, wMin = 0.8 } = o;
  const r = rng(seed);
  g.save();
  if (clip) { g.beginPath(); clip(g); g.clip("evenodd"); }
  const [x0, y0, x1, y1] = box;
  for (let y = y0; y < y1; y += cell) for (let x = x0; x < x1; x += cell) {
    const cx = x + cell / 2, cy = y + cell / 2;
    const lam = (F.dens(cx, cy) * densK * cell * cell) / 1e4;
    let n = 0, pr = Math.exp(-lam), acc = pr; const u0 = r();
    while (u0 > acc && n < 12) { n++; pr *= lam / n; acc += pr; }
    for (let k = 0; k < n; k++) {
      const p = [x + r() * cell, y + r() * cell];
      const e1 = r(), e2 = r(), e3 = r(), e4 = r(), e5 = r();
      if (keep && !keep(p[0], p[1])) continue;
      const Lm = F.len(p[0], p[1]); if (Lm <= 0) continue;
      const L = Math.min(maxLen, Math.max(minLen, Lm * lenK * Math.exp((e1 - 0.5) * 2 * spread)));
      const W = Math.max(wMin, F.wid(p[0], p[1]) * wK * (0.75 + 0.5 * e2));
      const val = Math.max(vMin, F.val(p[0], p[1]) + dv + (e3 - 0.5) * 0.12);
      const b = bend * (e4 < 0.5 ? -1 : 1) * (0.4 + e5);
      const ng = group[0] + Math.floor(r() * (group[1] - group[0] + 1));
      const base = streamline(F, p, L, b);
      if (base.length < 3) continue;
      for (let m = 0; m < ng; m++) {
        let pts = base;
        if (m > 0) {
          const off = gap * m * (r() < 0.5 ? -1 : 1) * (0.7 + 0.6 * r()), sh = (r() - 0.5) * L * 0.3;
          const d0 = nrm(sub(base[base.length - 1], base[0])), nn = perp(d0);
          pts = base.map((q) => add(add(q, mul(nn, off)), mul(d0, sh)));
          pts = pts.slice(Math.floor(pts.length * 0.2 * r()), pts.length - Math.floor(pts.length * 0.25 * r()));
          if (pts.length < 3) continue;
        }
        const ww = W * (m ? 0.7 : 1);
        taper(g, pts, (u) => ww * Math.pow(Math.sin(Math.PI * clamp01(u < bias ? (u / bias) * 0.5 : 0.5 + ((u - bias) / (1 - bias)) * 0.5)), pow), gv(val + (m ? 0.06 : 0)));
      }
    }
  }
  g.restore();
}

// A ragged fur edge along an open polyline `base` (control points): alternating notches and flame tips; tips lean
// `lean` rad off the outward normal (side +1: left of travel; -1 right). Returns a polyline (use it as part of a
// zone outline). step / len [a, b] / depth in px.
export function raggedEdge(base, { step = 14, len = [8, 18], depth = 2, lean = 0.5, side = 1, seed = 1, jit = 0.4, tipW = 0.35 } = {}) {
  const poly = sampleCurve(base, 6), S = [0];
  for (let i = 1; i < poly.length; i++) S.push(S[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
  const T = S[S.length - 1], r = rng(seed), out = [];
  const at = (d) => { let i = 1; while (i < S.length - 1 && S[i] < d) i++; const a = poly[i - 1], b = poly[i], f = (d - S[i - 1]) / Math.max(1e-6, S[i] - S[i - 1]); return [[a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], nrm(sub(b, a))]; };
  out.push(poly[0]);
  for (let d = step * 0.5; d < T - step * 0.5; d += step * (0.7 + 0.6 * r())) {
    const [p, t] = at(d), n = mul(perp(t), -side);   // outward normal
    const L = len[0] + r() * (len[1] - len[0]), a = lean + (r() - 0.5) * jit;
    const dir = nrm(add(mul(n, Math.cos(a)), mul(t, Math.sin(a))));
    const [pa] = at(Math.max(0, d - step * tipW)), [pb] = at(Math.min(T, d + step * tipW));
    out.push(sub(pa, mul(n, depth * r())));
    out.push(add(p, mul(dir, L)));
    out.push(sub(pb, mul(n, depth * r())));
  }
  out.push(poly[poly.length - 1]);
  return out;
}

// A flat tone zone: polygon of control points (a ragged edge spliced in where given), filled with value v at alpha,
// softened by `soft` px, clipped to `clip`.
export function zone(g, clip, pts, v, { alpha = 1, soft = 1 } = {}) {
  g.save();
  if (clip) { g.beginPath(); clip(g); g.clip("evenodd"); }
  if (soft > 0) g.filter = `blur(${soft}px)`;
  g.fillStyle = gv(v, alpha); g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]); g.closePath(); g.fill();
  g.filter = "none";
  g.restore();
}

// Rows of hooked feather edges (coverts / scapulars): short arcs that run along the field and hook at their lower
// end. spec as furStrokes plus hook (rad), hookAt (fraction where the hook begins).
export function hooks(g, clip, F, spec) {
  const { box = F.box, len = [30, 60], w = [1.6, 2.6], v = [0.3, 0.45], hook = 0.6, hookAt = 0.6, dens = 2, seed = 1, cell = 20, keep = null, flip = 1 } = spec;
  const r = rng(seed);
  g.save(); if (clip) { g.beginPath(); clip(g); g.clip("evenodd"); }
  const [x0, y0, x1, y1] = box;
  for (let y = y0; y < y1; y += cell) for (let x = x0; x < x1; x += cell) {
    const lam = ((typeof dens === "function" ? dens(x + cell / 2, y + cell / 2) : dens) * cell * cell) / 1e4;
    let n = 0, pr = Math.exp(-lam), acc = pr; const u0 = r();
    while (u0 > acc && n < 8) { n++; pr *= lam / n; acc += pr; }
    for (let k = 0; k < n; k++) {
      const p = [x + r() * cell, y + r() * cell];
      if (keep && !keep(p[0], p[1])) { r(); r(); r(); continue; }
      const L = len[0] + r() * (len[1] - len[0]), W = w[0] + r() * (w[1] - w[0]), val = v[0] + r() * (v[1] - v[0]);
      let d = F.dir(p[0], p[1]); if (d[0] < 0) d = mul(d, -1);
      const pts = [p]; let q = p, dd = d;
      const nstep = Math.max(4, Math.round(L / 3));
      for (let i = 1; i <= nstep; i++) {
        const u = i / nstep, turn = u > hookAt ? (hook * flip * (u - hookAt)) / (1 - hookAt) / nstep * 3 : 0;
        dd = V.rot(dd, turn); q = add(q, mul(dd, L / nstep)); pts.push(q);
      }
      taper(g, pts, (u) => W * Math.pow(Math.sin(Math.PI * clamp01(0.5 * u / 0.7 + (u > 0.7 ? (u - 0.7) / 0.3 * 0.5 - 0.5 * (u - 0.7) / 0.7 : 0))), 0.6), gv(val));
    }
  }
  g.restore();
}
export { smooth, clamp01 };
