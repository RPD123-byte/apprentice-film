// s19 feather wings: long pointed, layered flight feathers (the source's wings are fans of tapered primaries and
// secondaries under a band of coverts, not rounded paddles). Shared by the back view (owl.js) and the carry (carry.js).
// Coordinates are whatever the caller's context uses (owl units or frame px); widths are in the same units.
import { plumage, ink, flick, gv, V } from "../../../lib/owlInk.js";
import { smoothPath, sampleCurve } from "../../../lib/paths.js";
import { rng } from "../../../lib/rng.js";

const { add, sub, mul, nrm, perp } = V;
const blobPath = (pts) => (c) => smoothPath(c, pts, true);

// A tapered feather from root along dir: full near the root, narrowing to a point; `bend` curls the tip sideways.
export function pointedFeather(root, dir, L, w, bend = 0) {
  const n = perp(dir), P = (u, v) => add(add(root, mul(dir, L * u)), mul(n, v + bend * L * u * u));
  return [P(0, -w * 0.45), P(0.3, -w * 0.55), P(0.66, -w * 0.42), P(0.9, -w * 0.18), P(1, 0), P(0.86, w * 0.2), P(0.6, w * 0.46), P(0.28, w * 0.52), P(0, w * 0.45)];
}

// Build a wing fan. S shoulder, Wr wrist, T tip (the leading edge); nP primaries rooted along Wr→T whose directions
// turn from dWr (at the wrist) to dT (at the tip); nS secondaries along S→Wr pointing dS. Lengths LP=[wrist,tip], LS.
export function wingFan({ S, Wr, T, nP = 7, nS = 5, dS, dWr, dT, LP = [80, 110], LS = 75, wP = 0.3, wS = 0.36, cov = 0.5, bend = 0, seed = 5 }) {
  const r = rng(seed);
  const prim = [], sec = [];
  for (let i = 0; i < nP; i++) {
    const f = nP === 1 ? 1 : i / (nP - 1);
    const root = V.mix(Wr, T, 0.08 + 0.82 * f);
    const dir = nrm(V.mix(dWr, dT, Math.pow(f, 0.85)));
    const L = (LP[0] + (LP[1] - LP[0]) * f) * (0.92 + 0.16 * r());
    prim.push({ root, dir, L, w: L * wP, bend: bend * (0.6 + 0.4 * f) });
  }
  for (let i = 0; i < nS; i++) {
    const f = (i + 0.5) / nS;
    const root = V.mix(S, Wr, 0.12 + 0.86 * f);
    const dir = nrm(V.mix(dS, dWr, f * 0.5));
    const L = LS * (0.85 + 0.25 * f) * (0.92 + 0.16 * r());
    sec.push({ root, dir, L, w: L * wS, bend: bend * 0.4 });
  }
  const lead = sampleCurve([S, V.mix(S, Wr, 0.5), Wr, V.mix(Wr, T, 0.5), T], 6);
  // covert band: from the leading edge toward the trailing side, fading to a point at the tip
  const tr = nrm(V.mix(dS, dWr, 0.5));
  const cw = LS * cov;
  const band = [...lead];
  for (let i = lead.length - 1; i >= 0; i--) { const f = i / (lead.length - 1); band.push(add(lead[i], mul(tr, cw * (1 - 0.85 * f) * (0.9 + 0.1 * Math.sin(i))))); }
  return { S, Wr, T, prim, sec, lead, band, tr, cw };
}

// Paint a fan: primaries from the tip inward, then secondaries toward the body, then the coverts on top.
// o: { light, line (ink weight), col (ink colour), base, shade, seed, scale (1 = frame px; owl units: pass 1/s) }
export function paintWing(g, W, o = {}) {
  const { light = [0.3, -0.95], line = 2.0, col = gv(0.22), base = 0.96, shade = 0.74, seed = 7 } = o;
  const r = rng(seed);
  const one = (f, deep) => {
    const pts = pointedFeather(f.root, f.dir, f.L, f.w, f.bend || 0), path = blobPath(pts);
    plumage(g, path, { base, shade: shade - (deep ? 0.06 : 0), light, depth: f.w * 0.5, blur: f.w * 0.25 });
    // the edge that shows (the outer side and the tip) in ink, the shaft faint
    ink(g, [pts[1], pts[2], pts[3], pts[4], pts[5], pts[6]], line, col, { end: 0.15, bias: 0.6 });
    ink(g, [add(f.root, mul(f.dir, f.L * 0.12)), add(f.root, mul(f.dir, f.L * 0.55)), add(add(f.root, mul(f.dir, f.L * 0.86)), mul(perp(f.dir), (f.bend || 0) * f.L * 0.7))], line * 0.4, gv(0.4, 0.55), { end: 0.1 });
    // a few barbs along the inner vane
    for (let k = 0; k < 3; k++) {
      const u = 0.3 + 0.18 * k + 0.05 * r();
      const p = add(f.root, mul(f.dir, f.L * u));
      flick(g, p, nrm(add(f.dir, mul(perp(f.dir), 0.9))), f.w * 0.35, line * 0.35, gv(0.45, 0.45), 0.1);
    }
  };
  for (let i = W.prim.length - 1; i >= 0; i--) one(W.prim[i], i < W.prim.length - 2);
  for (let i = W.sec.length - 1; i >= 0; i--) one(W.sec[i], false);
  const bp = blobPath(W.band);
  plumage(g, bp, { base: 0.97, shade: 0.8, light, depth: W.cw * 0.4, blur: W.cw * 0.2 });
  // covert scallops: small feather tips along the band's trailing edge
  const n = W.lead.length;
  for (let i = 2; i < n - 3; i += 3) {
    const f = i / (n - 1), p = add(W.lead[i], mul(W.tr, W.cw * (1 - 0.85 * f) * 0.95)), q = add(W.lead[i + 3], mul(W.tr, W.cw * (1 - 0.85 * (i + 3) / (n - 1)) * 0.95));
    ink(g, [p, add(V.mix(p, q, 0.5), mul(W.tr, W.cw * 0.2)), q], line * 0.7, gv(0.3, 0.7), { end: 0.2 });
  }
  ink(g, W.lead, line * 1.25, col, { end: 0.3, bias: 0.4 });
}
