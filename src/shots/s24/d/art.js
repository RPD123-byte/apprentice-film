// s24 drawing kit: the inked, white-plumaged owl of the flurry drawn from measured landmarks (frame / plate px).
// Everything here is procedural: smooth outlines through control points, soft plumage fills, tapered ink,
// lanceolate feathers, covert scallops, seeded hatching. Shots describe a drawing as a list of parts (see owlF.js).
import { taper } from "../../../lib/ink.js";
import { sampleCurve, smoothPath } from "../../../lib/paths.js";
import { rng } from "../../../lib/rng.js";
import { gv } from "../../../lib/owlInk.js";

export const INK = "rgb(18,17,16)";
const TAU = Math.PI * 2;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], add = (a, b) => [a[0] + b[0], a[1] + b[1]], mul = (a, k) => [a[0] * k, a[1] * k];
const len = (a) => Math.hypot(a[0], a[1]), nrm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; }, perp = (a) => [-a[1], a[0]];

export const curve = (pts, closed = false, per = 10) => sampleCurve(pts, per, closed);
export const polyPath = (poly) => (g) => { g.moveTo(poly[0][0], poly[0][1]); for (let i = 1; i < poly.length; i++) g.lineTo(poly[i][0], poly[i][1]); g.closePath(); };
export const smoothFn = (pts) => (g) => smoothPath(g, pts, true);

// tapered ink along a (smoothed) polyline. w = mid width; a, b = start/end widths as fractions; pow shapes the swell
export function inkLine(g, pts, w, { a = 0.25, b = 0.15, color = INK, per = 8, smooth = true, pow = 0.6 } = {}) {
  if (pts.length < 2) return;
  const q = smooth && pts.length > 2 ? sampleCurve(pts, per) : pts;
  taper(g, q, (u) => {
    const s = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u))), pow);
    const e = u < 0.5 ? a : b;
    return Math.max(0.6, w * (e + (1 - e) * s));
  }, color);
}
// constant-ish ink round a closed outline, heavier on the side away from the light
export function inkOutline(g, poly, w, { light = [-0.6, -0.8], k = 0.7, color = INK, closed = true, cw = null } = {}) {
  const n = poly.length;
  let A = 0; for (let i = 0; i < n; i++) { const p = poly[i], q = poly[(i + 1) % n]; A += p[0] * q[1] - q[0] * p[1]; }
  const isCw = cw ?? (A > 0);
  const pts = [], ws = [];
  const idx = (i) => closed ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i));
  const last = closed ? n : n - 1;
  for (let i = 0; i <= last; i++) {
    const p = poly[idx(i)], a = poly[idx(i - 1)], b = poly[idx(i + 1)];
    const t = nrm(sub(b, a)), out = isCw ? [t[1], -t[0]] : [-t[1], t[0]];
    const f = -(out[0] * light[0] + out[1] * light[1]);        // 1 = facing away from the light
    pts.push(p); ws.push(w * (1 - k * 0.5 + k * 0.5 * (f + 1)));
  }
  taper(g, pts, (u) => ws[Math.min(ws.length - 1, Math.round(u * (ws.length - 1)))], color);
}
// soft white plumage: rim value `rim`, a blurred core pushed toward the light at `base`
export function softFill(g, path, { base = 0.94, rim = 0.8, light = [-0.6, -0.8], depth = 30, blur = 14 } = {}) {
  g.save();
  g.beginPath(); path(g); g.clip();
  g.fillStyle = gv(rim); g.beginPath(); path(g); g.fill();
  g.filter = `blur(${blur}px)`;
  g.fillStyle = gv(base);
  g.translate(light[0] * depth, light[1] * depth);
  g.beginPath(); path(g); g.fill();
  g.restore();
}
// a soft grey patch inside a clip (shadow under the head, belly shade)
export function shade(g, clip, shape, v, alpha, blur) {
  g.save(); g.beginPath(); clip(g); g.clip();
  g.filter = `blur(${blur}px)`; g.fillStyle = gv(v, alpha); g.beginPath(); shape(g); g.fill();
  g.restore();
}

// engraved hatching: seeded strokes inside a clip, direction dir(p) (unit), density = strokes per 1000 px²,
// kept where tone(p) (0..1) wins a coin toss; each stroke tapers at both ends
export function hatch(g, clip, box, { dir = () => [1, 0], tone = () => 1, density = 1, len: L = [14, 34], w = [0.8, 1.4], color = gv(0.35, 0.8), seed = 7, curve: cv = 0.1 } = {}) {
  const r = rng(seed), A = (box[2] - box[0]) * (box[3] - box[1]), N = Math.round(A / 1000 * density);
  g.save(); if (clip) { g.beginPath(); clip(g); g.clip(); }
  for (let i = 0; i < N; i++) {
    const p = [box[0] + r() * (box[2] - box[0]), box[1] + r() * (box[3] - box[1])];
    const tv = tone(p);
    if (r() > tv) continue;
    const d = dir(p), l = L[0] + r() * (L[1] - L[0]), ww = w[0] + r() * (w[1] - w[0]);
    const n = perp(d), c = (r() - 0.5) * cv * l;
    const q = [add(p, mul(d, -l / 2)), add(add(p, mul(n, c)), [0, 0]), add(p, mul(d, l / 2))];
    taper(g, sampleCurve(q, 5), (u) => Math.max(0.5, ww * Math.pow(Math.sin(Math.PI * u), 0.7)), color);
  }
  g.restore();
}

// ---------------------------------------------------------------- feathers
// A lanceolate feather from root r to tip t: widest (w) at ~35 %, root w·rootK, pointed tip; bend = midline offset
// (fraction of length, + to the left of r→t)
export function featherPoly(r, t, w, { bend = 0, rootK = 0.7, widest = 0.35, tipPow = 0.75, n = 16 } = {}) {
  const d = sub(t, r), L = len(d), u0 = nrm(d), nn = perp(u0);
  const M = (u) => add(add(r, mul(d, u)), mul(nn, bend * L * Math.sin(Math.PI * u)));
  const hw = (u) => (w / 2) * (u < widest ? rootK + (1 - rootK) * Math.sin((u / widest) * Math.PI / 2) : Math.pow((1 - u) / (1 - widest), tipPow));
  const Lp = [], Rp = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = M(Math.max(0, u - 0.01)), b = M(Math.min(1, u + 0.01)), tn = perp(nrm(sub(b, a)));
    Lp.push(add(M(u), mul(tn, hw(u)))); Rp.push(add(M(u), mul(tn, -hw(u))));
  }
  return { poly: [...Lp, ...Rp.slice(0, -1).reverse()], L, M, hw, left: Lp, right: Rp };
}
// ---------------------------------------------------------------- face parts
// an angry almond eye: upper lid (heavy), lower lid (fine), black pupil with a catchlight, white between the lids
export function eye(g, e) {
  const { up, lo, pupil, pr, cat = null, lidW = 5, loW = 2, brow = null, browW = 7, sclera = 0.97 } = e;
  // sclera between the lids
  const lid = [...curve(up, false, 8), ...curve([...lo].reverse(), false, 8)];
  g.fillStyle = gv(sclera); g.beginPath(); polyPath(lid)(g); g.fill();
  // pupil clipped to the opening
  g.save(); g.beginPath(); polyPath(lid)(g); g.clip();
  g.fillStyle = INK; g.beginPath(); g.ellipse(pupil[0], pupil[1], pr[0], pr[1], pr[2] || 0, 0, TAU); g.fill();
  if (cat) { g.fillStyle = gv(0.97); g.beginPath(); g.ellipse(cat[0], cat[1], cat[2], cat[3] ?? cat[2], 0, 0, TAU); g.fill(); }
  g.restore();
  inkLine(g, up, lidW, { a: 0.35, b: 0.2 });
  inkLine(g, lo, loW, { a: 0.3, b: 0.3 });
  if (brow) inkLine(g, brow, browW, { a: 0.2, b: 0.25 });
}

// ---------------------------------------------------------------- headphones (the s24 drawing: dark matte cups)
// cup: { c: [x, y], rx, ry, rot (rad), cush: offset of the cushion toward the head [dx, dy], ribs }
export function cup(g, C) {
  const { c, rx, ry, rot = 0, cush = [-0.35, 0], shellV = 0.2, plateV = 0.3, hi = 0.62, seed = 5 } = C;
  const r = rng(seed);
  g.save(); g.translate(c[0], c[1]); g.rotate(rot);
  // cushion ring (darker, ribbed) on the head side
  const cx = cush[0] * rx, cy = cush[1] * ry;
  g.fillStyle = INK; g.beginPath(); g.ellipse(cx, cy, rx * 0.95, ry * 1.02, 0, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.ellipse(cx, cy, rx * 0.95, ry * 1.02, 0, 0, TAU); g.clip();
  g.strokeStyle = gv(0.3, 0.7); g.lineCap = "round";
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TAU, x0 = cx + Math.cos(a) * rx * 0.9, y0 = cy + Math.sin(a) * ry * 0.95;
    g.lineWidth = 1 + r() * 1.2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(cx + Math.cos(a) * rx * 0.7, cy + Math.sin(a) * ry * 0.76); g.stroke();
  }
  g.restore();
  // shell
  g.fillStyle = gv(shellV); g.beginPath(); g.ellipse(0, 0, rx * 0.86, ry * 0.9, 0, 0, TAU); g.fill();
  g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke();
  // plate with a soft highlight (upper left) and a bright rim arc
  g.save(); g.beginPath(); g.ellipse(rx * 0.06, 0, rx * 0.68, ry * 0.74, 0, 0, TAU); g.clip();
  g.fillStyle = gv(plateV); g.fillRect(-rx, -ry, rx * 2, ry * 2);
  g.filter = `blur(${Math.max(2, rx * 0.18)}px)`;
  g.fillStyle = gv(hi, 0.8); g.beginPath(); g.ellipse(-rx * 0.2, -ry * 0.25, rx * 0.35, ry * 0.42, 0, 0, TAU); g.fill();
  g.fillStyle = gv(0.08, 0.7); g.beginPath(); g.ellipse(rx * 0.5, ry * 0.45, rx * 0.4, ry * 0.4, 0, 0, TAU); g.fill();
  g.restore();
  g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.ellipse(rx * 0.06, 0, rx * 0.68, ry * 0.74, 0, 0, TAU); g.stroke();
  g.strokeStyle = gv(0.75, 0.8); g.lineWidth = 1.6; g.beginPath(); g.ellipse(0, 0, rx * 0.8, ry * 0.84, 0, Math.PI * 1.05, Math.PI * 1.6); g.stroke();
  g.restore();
}
// band: a dark strip along pts with a pale ridge line, width w
export function band(g, pts, { w = 14, v = 0.12, ridge = 0.62, ridgeOff = -0.18 } = {}) {
  const q = sampleCurve(pts, 8);
  taper(g, q, () => w + 2.5, INK);
  taper(g, q, () => w, gv(v));
  const nq = q.map((p, i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)], n = perp(nrm(sub(b, a))); return add(p, mul(n, w * ridgeOff)); });
  taper(g, nq, (u) => Math.max(0.6, w * 0.16 * Math.pow(Math.sin(Math.PI * u), 0.4)), gv(ridge, 0.9));
}

// the source's feather style: white vane, ink along ONE edge (the leading edge, `side` "l" | "r") from `from` to the
// tip and round it, hooking back up the other edge for `hook` of its length; fine grey barbs from the root
export function feather(g, f, o = {}) {
  const { base = 0.95, rootV = 0.84, ink = 2.6, side = "l", from = 0.12, hook = 0.22, barbs = 5, barbLen = 0.45, barbV = 0.5, seed = 1, rim = 0, rimV = 0.3 } = o;
  const F = featherPoly(f.r, f.t, f.w, { bend: f.bend || 0, rootK: f.rootK ?? 0.85, widest: f.widest ?? 0.5, tipPow: f.tipPow ?? 0.55, n: 24 });
  const path = polyPath(F.poly);
  const gr = g.createLinearGradient(f.r[0], f.r[1], f.t[0], f.t[1]);
  gr.addColorStop(0, gv(rootV)); gr.addColorStop(0.4, gv(base)); gr.addColorStop(1, gv(base));
  g.fillStyle = gr; g.beginPath(); path(g); g.fill();
  const r = rng(seed * 131 + 7);
  g.save(); g.beginPath(); path(g); g.clip();
  for (let i = 0; i < barbs; i++) {
    const s = i % 2 ? 1 : -1, off = (0.1 + 0.75 * r()) * s;
    const u0 = 0.04 + r() * 0.2, u1 = Math.min(0.95, u0 + barbLen * (0.5 + 0.7 * r()));
    const pts = [];
    for (let j = 0; j <= 6; j++) { const u = u0 + (u1 - u0) * j / 6, m = F.M(u), a = F.M(Math.max(0, u - 0.02)), b = F.M(Math.min(1, u + 0.02)); const tn = perp(nrm(sub(b, a))); pts.push(add(m, mul(tn, off * F.hw(u)))); }
    taper(g, pts, (u) => Math.max(0.5, (0.6 + 0.6 * r()) * Math.pow(Math.sin(Math.PI * u), 0.8)), gv(barbV, 0.7));
  }
  if (rim > 0) { g.strokeStyle = gv(rimV, 0.35); g.lineWidth = rim; g.beginPath(); path(g); g.stroke(); }
  g.restore();
  // ink: leading edge from `from` to the tip, then back along the other edge for `hook`
  const n = F.left.length - 1, A = side === "l" ? F.left : F.right, B = side === "l" ? F.right : F.left;
  const i0 = Math.round(from * n), i1 = Math.round((1 - hook) * n);
  const run = [...A.slice(i0), ...B.slice(i1, n).reverse()];
  const m = run.length;
  taper(g, run, (u) => { const k = u * (m - 1); const inTip = k > (n - i0) - 2; const s = Math.min(1, u * 6); return Math.max(0.6, ink * (0.25 + 0.75 * s) * (inTip ? 0.9 : 1) * (u > 0.85 ? (1 - u) / 0.15 * 0.8 + 0.2 : 1)); }, INK);
  return F;
}
