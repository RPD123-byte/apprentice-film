// The black-and-white owl kit. One parametric rig draws the owl in any pose and size: a soft, glowing,
// nearly-white bird with fine dark ink accents (big hooded black eyes, crossed bandage, headphones with a
// halftone cup, small hooked beak, talons). Full guide with examples: docs/owl.md.
//
// Coordinates: a pose is built in OWL UNITS around the root (0,0) = the middle of the body; the head's vertical
// radius is 100 units. drawOwl(ctx, pose) puts the root at frame (pose.x, pose.y), scales by pose.s (frame px per
// unit), rotates by pose.rot and mirrors with pose.flip. Face features ride on the head as on a sphere
// (yaw / pitch / roll): the far eye foreshortens, the headphone band arcs over the crown, the bandage stays on
// the owl's own right side even when mirrored.
//
// Everything is seeded: the same pose always gives the same pixels (static poses never boil).
import { taper } from "./ink.js";
import { smoothPath, sampleCurve } from "./paths.js";
import { rng, clamp, lerp } from "./rng.js";

export const LINE = "#0f0e0d";          // the dark ink on the white bird
export const gv = (v, a = 1) => { const c = Math.round(clamp(v) * 255); return a >= 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`; };

// ---------------------------------------------------------------- vectors
export const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
  mul: (a, k) => [a[0] * k, a[1] * k],
  len: (a) => Math.hypot(a[0], a[1]),
  nrm: (a) => { const l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; },
  perp: (a) => [-a[1], a[0]],
  rot: (a, t) => { const c = Math.cos(t), s = Math.sin(t); return [a[0] * c - a[1] * s, a[0] * s + a[1] * c]; },
  mix: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
};
const { add, sub, mul, nrm, perp } = V;
const TAU = Math.PI * 2;
const blobPath = (pts) => (c) => smoothPath(c, pts, true);

// Pixels per owl unit of the context being drawn. drawOwl sets it; set it yourself (setPPU) when calling part
// functions directly on a scaled context, so blur radii and minimum line widths come out right.
let PPU = 1;
export function setPPU(v) { PPU = v; }
const MINW = 0.7;                       // thinnest line, in device pixels
const wmin = (w) => Math.max(w, MINW / PPU);

// ---------------------------------------------------------------- line primitives
// A dark ink line through control points with a swelling, tapering weight. w in units.
export function ink(g, pts, w, color = LINE, { per = 6, end = 0.2, bias = 0.5, pow = 0.55 } = {}) {
  if (pts.length < 2) return;
  const q = sampleCurve(pts.length > 2 ? pts : [pts[0], pts[1]], pts.length > 2 ? per : 4);
  const W = wmin(w);
  taper(g, q, (u) => {
    const k = Math.pow(Math.sin(Math.PI * clamp(u < bias ? (u / bias) * 0.5 : 0.5 + ((u - bias) / (1 - bias)) * 0.5)), pow);
    return W * (end + (1 - end) * k);
  }, color);
}
// A feather flick: a short stroke, full at the root, tapering to a hair at the tip.
export function flick(g, p, dir, L, w, color, curve = 0.12) {
  const n = perp(dir);
  const q = [p, add(add(p, mul(dir, L * 0.5)), mul(n, L * curve)), add(p, mul(dir, L))];
  const W = wmin(w);
  taper(g, sampleCurve(q, 4), (u) => W * Math.pow(1 - u, 0.7) * Math.min(1, 0.35 + u * 5), color);
}
// Walk along a polyline at a spacing, calling fn(p, tangent, u, r) (r = the seeded stream).
export function walk(poly, step, seed, fn, { from = 0, to = 1, jitter = 0.6 } = {}) {
  const L = [0];
  for (let i = 1; i < poly.length; i++) L.push(L[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
  const total = L[L.length - 1];
  if (total <= 0) return;
  const r = rng(seed);
  let d = from * total + step * r(), i = 1;
  while (d < to * total) {
    while (i < L.length - 1 && L[i] < d) i++;
    const a = poly[i - 1], b = poly[i], f = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
    fn([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], nrm(sub(b, a)), d / total, r);
    d += step * (1 - jitter / 2 + jitter * r());
  }
}
// Signed area (>0: clockwise on screen, y down).
export function area(pts) { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; }
const inward = (t, cw) => (cw ? [-t[1], t[0]] : [t[1], -t[0]]);

// Feather-edge helper: grey flicks along an outline pointing inward. o: step, len, w, color, ang (turn off the
// normal), inset, from/to (fraction of the outline), seed.
export function edgeFlicks(g, outline, o = {}) {
  const { step = 7, len = 12, w = 1.2, color = gv(0.45, 0.5), ang = 0.6, inset = 1.5, seed = 3, closed = true, from = 0, to = 1, jit = 0.5 } = o;
  const poly = sampleCurve(outline, 6, closed);
  const cw = area(poly) > 0;
  walk(poly, step, seed, (p, t, u, r) => {
    const n = inward(t, cw);
    flick(g, add(p, mul(n, inset * (0.5 + r()))), V.rot(n, ang + (r() - 0.5) * jit), len * (0.55 + 0.9 * r()), w * (0.7 + 0.6 * r()), color, (r() - 0.5) * 0.3);
  }, { from, to });
}
// Shadow-side hatching: along the part of an outline that faces away from the light, strokes run inward (bent
// toward the feather direction `flow`), longer and denser the more the edge turns from the light.
export function rimHatch(g, outline, o = {}) {
  const { light = [-0.55, -0.83], thr = 0.05, step = 4, len = 20, w = 1.0, color = gv(0.33, 0.55), flow = [0, 1], bend = 0.35, seed = 9, closed = true, from = 0, to = 1, density = 1 } = o;
  const poly = sampleCurve(outline, 6, closed);
  const cw = area(poly) > 0;
  const fl = nrm(flow);
  walk(poly, step, seed, (p, t, u, r) => {
    const n = inward(t, cw);
    const facing = n[0] * light[0] + n[1] * light[1];   // inward·light = outward·(-light): 1 when the edge faces away
    const k = (facing - thr) / (1 - thr);
    if (k <= 0 || r() > density * (0.25 + 0.75 * k)) return;
    const d = nrm(add(mul(n, 1 - bend), mul(fl, bend)));
    flick(g, add(p, mul(n, 0.5 + r() * 2)), V.rot(d, (r() - 0.5) * 0.35), len * (0.35 + 0.9 * k) * (0.6 + 0.7 * r()), w * (0.7 + 0.6 * r()), color, (r() - 0.5) * 0.25);
  }, { from, to });
}
// A row of feather strokes along a curve (facial-disc rims, chest rows): each stroke leaves the curve at `ang`
// from its tangent. pts: control points of the curve.
export function featherRow(g, pts, o = {}) {
  const { step = 6, len = 12, w = 1.0, color = gv(0.4, 0.5), ang = 0.5, seed = 13, gap = 0.15 } = o;
  const poly = sampleCurve(pts, 8);
  walk(poly, step, seed, (p, t, u, r) => {
    if (r() < gap) return;
    const fade = Math.sin(Math.PI * clamp(u));
    flick(g, p, V.rot(t, ang + (r() - 0.5) * 0.3), len * (0.5 + 0.7 * r()) * (0.5 + 0.5 * fade), w * (0.6 + 0.6 * r()) * (0.6 + 0.4 * fade), color, (r() - 0.5) * 0.2);
  });
}
// Short strokes scattered in an ellipse along an angle (chest fluff, belly feathers).
export function regionFlicks(g, cx, cy, rx, ry, angle, n, len, seed, { w = 1.1, color = gv(0.5, 0.35), spread = 0.4 } = {}) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = r() * TAU, d = Math.sqrt(r());
    const ang = angle + (r() - 0.5) * spread;
    flick(g, [cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d], [Math.cos(ang), Math.sin(ang)], len * (0.6 + 0.8 * r()), w * (0.7 + 0.6 * r()), color, (r() - 0.5) * 0.4);
  }
}
// Feathery silhouette: tiny spikes of the plumage colour pushed out past the outline (use sparingly).
export function fringe(g, outline, o = {}) {
  const { step = 14, len = 3, w = 4, color = gv(0.95), ang = 0.6, seed = 5, closed = true, from = 0, to = 1 } = o;
  const poly = sampleCurve(outline, 6, closed);
  const cw = area(poly) > 0;
  g.fillStyle = color;
  walk(poly, step, seed, (p, t, u, r) => {
    const out = mul(inward(t, cw), -1), d = V.rot(out, ang + (r() - 0.5) * 0.5);
    const L = len * (0.3 + r() * r() * 1.6), ww = w * (0.6 + 0.6 * r());
    const b0 = sub(sub(p, mul(t, ww / 2)), mul(out, 1.5)), b1 = sub(add(p, mul(t, ww / 2)), mul(out, 1.5)), tip = add(p, mul(d, L));
    g.beginPath(); g.moveTo(b0[0], b0[1]); g.quadraticCurveTo(p[0] + d[0] * L * 0.4, p[1] + d[1] * L * 0.4, tip[0], tip[1]); g.lineTo(b1[0], b1[1]); g.closePath(); g.fill();
  }, { from, to });
}

// ---------------------------------------------------------------- plumage
// Soft white fill. The core (the part pushed `depth` units toward the light, blurred by `blur`) stays at `base`;
// the rim turned away from the light falls to `shade`. keep: [dx,dy] also pushes the core that way (a side that
// must stay bright, e.g. the chin where the head meets the chest).
export function plumage(g, path, o = {}) {
  const { base = 0.97, shade = 0.8, light = [-0.55, -0.83], depth = 30, blur = 12, keep = null } = o;
  g.save();
  g.beginPath(); path(g); g.clip();
  g.fillStyle = gv(shade); g.fill();
  g.filter = `blur(${Math.max(0.4, blur * PPU).toFixed(2)}px)`;
  g.fillStyle = gv(base);
  for (const off of keep ? [[light[0] * depth, light[1] * depth], [light[0] * depth * 0.4 + keep[0], light[1] * depth * 0.4 + keep[1]]] : [[light[0] * depth, light[1] * depth]]) {
    g.save(); g.translate(off[0], off[1]); g.beginPath(); path(g); g.fill(); g.restore();
  }
  g.filter = "none";
  g.restore();
}
// A soft shadow or glow inside a clip path (value only). shape(g) adds a path; alpha 0..1; blur in units.
export function softShade(g, clipPath, shape, value, alpha, blur) {
  g.save();
  g.beginPath(); clipPath(g); g.clip();
  g.filter = `blur(${Math.max(0.4, blur * PPU).toFixed(2)}px)`;
  g.fillStyle = gv(value, alpha); g.beginPath(); shape(g); g.fill();
  g.filter = "none";
  g.restore();
}

// Print screentone: a fine diagonal mesh cut into the mid-greys of a finished owl layer (device pixels).
// Values above `white` stay clean; ink (dark) is left alone.
export function screentone(canvas, { pitch = 4.2, amp = 0.2, white = 0.93, range = 0.3, x = 0, y = 0, w = canvas.width, h = canvas.height } = {}) {
  const g = canvas.getContext("2d");
  w = Math.min(w, canvas.width - x); h = Math.min(h, canvas.height - y);
  if (w <= 0 || h <= 0) return;
  const img = g.getImageData(x, y, w, h), d = img.data;
  const k = 1 / (pitch * Math.SQRT2);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const o = (j * w + i) * 4;
      if (d[o + 3] < 8) continue;
      const L = d[o] / 255;
      if (L > white || L < 0.22) continue;
      const t = Math.min(1, (white - L) / range) * Math.min(1, (L - 0.22) / 0.2);
      const X = i + x, Y = j + y;
      const fa = Math.abs(((X + Y) * k) % 1 - 0.5) * 2, fb = Math.abs(((X - Y + 8192) * k) % 1 - 0.5) * 2;
      const m = Math.max(1 - Math.min(1, fa * 2.6), 1 - Math.min(1, fb * 2.6));
      const v = Math.max(0, Math.min(255, (L - amp * t * (m - 0.3)) * 255));
      d[o] = d[o + 1] = d[o + 2] = v;
    }
  }
  g.putImageData(img, x, y);
}

// ---------------------------------------------------------------- head
// Head spec: { x, y, rx, ry, yaw, pitch, roll, square }. yaw + turns the face toward viewer's right, pitch + looks
// up, roll + tilts clockwise. Returns geometry with a sphere projector P(az, el, lift) and the outline.
export function headGeom(h) {
  const { x = 0, y = 0, rx = 109, ry = 100, yaw = 0, pitch = 0, roll = 0, square = 2.6, jowl = 0.05 } = h;
  const cr = Math.cos(roll), sr = Math.sin(roll);
  const toFrame = (px, py) => [x + px * cr - py * sr, y + px * sr + py * cr];
  // sphere point: az + toward viewer's right (the owl's left) when facing us, el + up
  const P = (az, el, lift = 1) => {
    const nx = Math.sin(az) * Math.cos(el), ny = -Math.sin(el), nz = Math.cos(az) * Math.cos(el);
    const x1 = nx * Math.cos(yaw) + nz * Math.sin(yaw), z1 = -nx * Math.sin(yaw) + nz * Math.cos(yaw);
    const y2 = ny * Math.cos(pitch) - z1 * Math.sin(pitch), z2 = ny * Math.sin(pitch) + z1 * Math.cos(pitch);
    const p = toFrame(x1 * rx * lift, y2 * ry * lift);
    return { x: p[0], y: p[1], nx: x1, ny: y2, nz: z2 };
  };
  const shape = (t) => {        // t: angle, 0 = right, -pi/2 = top
    const c = Math.cos(t), s = Math.sin(t), n = s < 0 ? square : 2.15;
    let px = Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * rx;
    const py = Math.sign(s) * Math.pow(Math.abs(s), 2 / n) * ry;
    if (s > 0) px *= 1 + jowl * Math.sin(Math.PI * s);
    return [px, py];
  };
  const out = [];
  const N = 56;
  for (let i = 0; i < N; i++) { const q = shape((i / N) * TAU - Math.PI / 2); out.push(toFrame(q[0], q[1])); }
  // outline point + outward normal at a polar angle from the top (+ toward viewer's right)
  const at = (phi) => {
    const t = phi - Math.PI / 2, a = shape(t), b = shape(t + 0.01);
    const tan = V.rot(nrm(sub(b, a)), roll);
    return { p: toFrame(a[0], a[1]), n: [tan[1], -tan[0]] };
  };
  return { x, y, rx, ry, yaw, pitch, roll, P, out, at, toFrame };
}

// Ear tuft: a leaf of feathers rising from the outline at polar angle `at` (from the top, + = viewer's right),
// leaning by `lean`, with a smaller second point on its outer flank.
export function tuftShape(H, t) {
  const { at = 0.8, size = 34, width = 0.34, lean = 0, second = 0.55, curl = 0.18 } = t;
  const side = Math.sign(at) || 1;
  const A = H.at(at - width / 2), B = H.at(at + width / 2), M = H.at(at);
  const dir = V.rot(M.n, lean);
  const n = mul(perp(dir), side);            // points toward the outer flank
  const tip = add(add(M.p, mul(dir, size)), mul(n, size * curl));
  const inner = side > 0 ? A : B, outer = side > 0 ? B : A;
  const m2 = V.mix(M.p, outer.p, 0.55);
  const tip2 = add(add(m2, mul(dir, size * second * 0.8)), mul(n, size * second * 0.35));
  const pts = [
    sub(inner.p, mul(inner.n, 8)),
    add(V.mix(inner.p, tip, 0.5), mul(n, -size * 0.14)),
    tip,
    add(V.mix(tip, m2, 0.5), mul(n, size * 0.02)),
    tip2,
    add(V.mix(tip2, outer.p, 0.5), mul(n, size * 0.08)),
    sub(outer.p, mul(outer.n, 8)),
  ];
  return { pts: side > 0 ? pts : pts, tip, tip2, dir, base: M.p, side, inner: inner.p, outer: outer.p };
}

// ---------------------------------------------------------------- body, tail
// Egg-shaped body: { x, y, a (half length along the axis), b (half width), rot (axis angle, pointing at the tail
// end), egg (+ = tail end narrower), sag (extra fullness on the belly side) }.
export function bodyOutline(b) {
  const { x = 0, y = 0, a = 150, b: hb = 100, rot = 0, egg = 0, sag = 0 } = b;
  const pts = [];
  const N = 44;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * TAU;
    let v = Math.sin(t) * hb * (1 - egg * Math.cos(t));
    if (v > 0) v *= 1 + sag * Math.sin(Math.PI * (0.5 + 0.5 * Math.cos(t)));
    pts.push(add([x, y], V.rot([Math.cos(t) * a, v], rot)));
  }
  return pts;
}
// Tail: long overlapping feathers from `base` toward `tip` (back to front).
export function tailShape(t) {
  const { base, tip, w = 24, n = 3, spread = 0.06, bend = 0.04 } = t;
  const d = sub(tip, base), L = V.len(d), u = nrm(d), nn = perp(u);
  const out = [];
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0 : i / (n - 1) - 0.5;
    const uu = nrm(sub(sub(tip, mul(nn, f * w * 0.1)), add(base, mul(nn, f * w * 0.35)))), pp = perp(uu);
    const len = L * (1 - 0.04 * i);
    const b0 = add(base, mul(nn, f * w * 0.35)), e = add(b0, mul(uu, len)), hw = w * 0.5;
    out.push([
      add(b0, mul(pp, -hw)), add(add(b0, mul(uu, len * 0.55)), mul(pp, -hw * 0.8 + len * bend)), add(add(e, mul(uu, -hw * 0.7)), mul(pp, -hw * 0.3 + len * bend * 0.5)), e,
      add(add(e, mul(uu, -hw * 1.2)), mul(pp, hw * 0.35)), add(add(b0, mul(uu, len * 0.5)), mul(pp, hw * 0.75 + len * bend)), add(b0, mul(pp, hw)),
    ]);
  }
  return out;
}

// ---------------------------------------------------------------- wings
// Folded wing along the body: shoulder S, tip T; `width` = drop below the S→T chord (belly side), `back` = rise
// above it. dir = +1 when the belly side is clockwise from S→T (tail pointing right), -1 when mirrored.
export function foldedWing(w) {
  const { S, T, width = 50, back = 60, dir = 1, front = 0.3 } = w;
  const d = sub(T, S), L = V.len(d), u = nrm(d), n = mul(perp(u), dir);
  const low = (t) => (t < 0.35 ? Math.pow(Math.sin((Math.PI / 2) * Math.min(1, Math.max(0, t) / front)), 0.6) : Math.pow(Math.max(0, Math.cos((Math.PI / 2) * (t - 0.35) / 0.65)), 0.7));
  const high = (t) => Math.pow(Math.sin(Math.PI * Math.pow(clamp(t), 0.8)), 0.85);
  const P = (t, k) => add(add(S, mul(u, L * t)), mul(n, k));
  const top = [], bot = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16; top.push(P(t, -back * high(t))); }
  for (let i = 15; i >= 1; i--) { const t = i / 16; bot.push(P(t, width * low(t))); }
  return { outline: [...top, ...bot, P(-0.03, width * 0.35), P(-0.02, -back * 0.15)], S, T, u, n, L, P, low, high, width, back, dir };
}
// Spread wing: shoulder S, wrist Wr, tip T; feathers fan behind the leading edge toward `trail` (unit vector).
// spread 0..1 opens the fan; n primaries on the hand, m secondaries on the arm; len = feather length.
export function spreadWing(w) {
  const { S, Wr, T, trail = [0, 1], len = 70, spread = 1, n = 6, m = 5, seed = 17 } = w;
  const r = rng(seed);
  const lead = sampleCurve([S, V.mix(S, Wr, 0.5), Wr, V.mix(Wr, T, 0.5), T], 6);
  const feathers = [];
  const tr = nrm(trail);
  for (let i = 0; i < m; i++) {
    const f = (i + 0.5) / m;
    feathers.push({ root: V.mix(S, Wr, 0.15 + f * 0.85), dir: nrm(add(tr, mul(nrm(sub(Wr, S)), -0.15))), L: len * (0.72 + 0.12 * r()), w: len * 0.42 });
  }
  const hand = nrm(sub(T, Wr));
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n;
    const dir = nrm(V.mix(tr, hand, lerp(0.15, 0.95, Math.pow(f, 0.9)) * spread + (1 - spread) * 0.1));
    feathers.push({ root: V.mix(Wr, T, f * 0.8), dir, L: len * (0.95 + 0.4 * f) * (0.9 + 0.2 * r()), w: len * 0.36 });
  }
  return { lead, feathers, S, Wr, T, tr };
}
// Outline of one rounded feather (a paddle) from root along dir.
export function featherShape(root, dir, L, w) {
  const n = perp(dir), e = add(root, mul(dir, L));
  return [add(root, mul(n, -w * 0.4)), add(add(root, mul(dir, L * 0.55)), mul(n, -w * 0.5)), add(add(e, mul(dir, -w * 0.45)), mul(n, -w * 0.42)), e, add(add(e, mul(dir, -w * 0.45)), mul(n, w * 0.42)), add(add(root, mul(dir, L * 0.55)), mul(n, w * 0.5)), add(root, mul(n, w * 0.4))];
}

// ---------------------------------------------------------------- eyes
// lid: fraction of the eye covered at the corners; curve lifts the middle of the lid edge; slant lowers the inner
// end (angry); lidW = lid line weight (eye radii); low = lower lid raised (smug); scale = eye size multiplier.
export const EYE_STATES = {
  stare: { pupil: 0.8, lid: 0.2, curve: 0.35, slant: 0.35, lidW: 0.2, low: 0, ext: 0.22 },
  glare: { pupil: 0.82, lid: 0.34, curve: 0.2, slant: 0.34, lidW: 0.17, low: 0, ext: 0.1 },
  half: { pupil: 0.76, lid: 0.46, curve: 0.06, slant: 0, lidW: 0.15, low: 0, ext: 0 },
  angry: { pupil: 0.62, lid: 0.42, curve: 0.0, slant: 0.5, lidW: 0.18, low: 0.06, brow: 1, ext: 0 },
  smug: { pupil: 0.58, lid: 0.52, curve: -0.04, slant: 0.1, lidW: 0.16, low: 0.2, brow: 0.6, ext: 0 },
  sleepy: { pupil: 0.66, lid: 0.56, curve: 0.12, slant: -0.1, lidW: 0.13, low: 0.04, ext: 0 },
  wide: { pupil: 0.62, lid: 0.0, curve: 0.2, slant: 0.1, lidW: 0.1, low: 0, ext: 0 },
  startled: { pupil: 0.12, lid: 0.0, curve: 0.2, slant: 0, lidW: 0.07, low: 0, scale: 1.12, ext: 0 },
  closed: { closed: true },
};

// e: { x, y, r (eye radius, units), sx (foreshortening across the face), rot (head roll), side (-1 = viewer-left eye,
//      +1 = right), state, look [lx,ly] (-1..1), pupil/lid/slant/curve/brow/low overrides, plumage (lid value) }
export function drawEye(g, e) {
  const st = { ...EYE_STATES[e.state || "stare"] };
  for (const k of ["lid", "pupil", "slant", "curve", "brow", "low", "lidW", "ext", "peak"]) if (e[k] !== undefined) st[k] = e[k];
  const r = e.r * (st.scale || 1), side = e.side || 1, sx = e.sx ?? 1, outer = side > 0 ? 1 : -1;
  // inside the eye the context is scaled to eye radii: PPU follows, so minimum widths stay right
  const PPU0 = PPU; PPU = PPU0 * r;
  const u = (w) => wmin(w / r);   // owl units -> eye units (for line widths)
  g.save();
  g.translate(e.x, e.y); g.rotate(e.rot || 0); g.scale(sx * r, r);
  g.lineCap = "round"; g.lineJoin = "round";
  if (st.closed) {
    // shut: a line sagging in the middle, heavier at the centre, a lash flick at the outer end; a faint socket crease
    ink(g, [[-1.05, 0.02], [-0.45, 0.26], [0.15, 0.3], [0.65, 0.16], [1.05, -0.08]].map(([a, b]) => [a * outer, b]), u(4.4), LINE, { end: 0.1, bias: 0.45 });
    ink(g, [[1.0, -0.04], [1.18, -0.2]].map(([a, b]) => [a * outer, b]), u(1.6), LINE, { end: 0.1 });
    g.globalAlpha = 0.3;
    ink(g, [[-0.95, -0.25], [-0.5, -0.75], [0.2, -0.9], [0.85, -0.55]], u(1.4), gv(0.35));
    g.globalAlpha = 1;
    g.restore();
    PPU = PPU0;
    return;
  }
  // The eye opening: the lower rim is the circle; the upper edge is the lid curve ey(x), which may cut into the
  // circle (inner side, lowered lids) or rise a little above it (up to `ext`, the white wedge under a raised lid).
  const ey = (x) => -1 + 2 * st.lid - st.curve * (1 - x * x) + st.slant * x * -side;
  const ext = st.ext ?? 0.22;
  const ringTop = (xx) => -Math.sqrt(Math.max(0, 1 - xx * xx));
  const topY = (xx) => Math.min(Math.sqrt(Math.max(0, 1 - xx * xx)), Math.max(ey(xx), ringTop(xx) - ext * (1 - xx * xx)));
  const xOut = outer * (st.outX ?? 0.94), xIn = -outer * 0.99;
  const N = 28;
  const lidPts = [];
  for (let i = 0; i <= N; i++) { const xx = xIn + (xOut - xIn) * i / N; lidPts.push([xx, topY(xx)]); }
  const opening = (c) => {
    c.moveTo(lidPts[0][0], lidPts[0][1]);
    for (const p of lidPts) c.lineTo(p[0], p[1]);
    // down the outer side and round the bottom back to the inner end
    const aO = Math.atan2(Math.max(lidPts[N][1], -0.99), lidPts[N][0]), aI = Math.atan2(Math.max(0, lidPts[0][1]), lidPts[0][0]);
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      let a;
      if (outer > 0) { const A0 = aO, A1 = aI + (aI < A0 ? TAU : 0); a = A0 + (A1 - A0) * i / steps; }
      else { const A0 = aO, A1 = aI - (aI > A0 ? TAU : 0); a = A0 + (A1 - A0) * i / steps; }
      c.lineTo(Math.cos(a), Math.sin(a));
    }
    c.closePath();
  };
  g.fillStyle = gv(0.97); g.beginPath(); opening(g); g.fill();
  const pr = st.pupil, look = e.look || [0, 0];
  const px = look[0] * (1 - pr) * 0.95, py = look[1] * (1 - pr) * 0.95;
  g.save(); g.beginPath(); opening(g); g.clip();
  g.fillStyle = "#060606"; g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
  if (st.scale) { // startled: a thin iris ring and a pin-prick highlight
    g.strokeStyle = LINE; g.lineWidth = u(1.1); g.beginPath(); g.arc(px, py, pr * 1.9, 0, TAU); g.stroke();
    g.fillStyle = gv(0.97); g.beginPath(); g.arc(px - pr * 0.3, py - pr * 0.3, pr * 0.3, 0, TAU); g.fill();
  }
  if (st.low > 0) { g.fillStyle = gv(e.plumage ?? 0.95); g.fillRect(-1.3, 1 - 2 * st.low, 2.6, 2 * st.low + 0.4); }
  g.restore();
  // rim: round the bottom, fuller low down, plus a hairline inside the lower rim on the inner side
  const arcPts = (a0, a1, rr, n = 20) => { const q = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; q.push([Math.cos(a) * rr, Math.sin(a) * rr]); } return q; };
  const rw = u(e.ringW ?? 2.3);
  const aOut = Math.atan2(lidPts[N][1], lidPts[N][0]);
  const rimPts = outer > 0 ? arcPts(aOut, Math.PI + 0.05, 1.0, 34) : arcPts(aOut < 0 ? aOut + TAU : aOut, -0.05, 1.0, 34);
  taper(g, rimPts, (t) => rw * (0.45 + 0.95 * Math.pow(Math.sin(Math.PI * t), 1.3)), LINE);
  if (!st.scale) taper(g, arcPts(0.55, 1.65, 0.9, 14).map(([a, b]) => [-a * outer, b]), (t) => rw * 0.45 * Math.sin(Math.PI * t), LINE);
  // upper lid: one heavy stroke along the top of the opening, from a hairline tail past the inner corner to a
  // pointed flick up and out past the outer corner
  const p0 = lidPts[0], p1 = lidPts[N], q1 = lidPts[N - 3];
  const td = nrm(sub(p1, q1));
  const seq = [[p0[0] - outer * 0.17, p0[1] + 0.1], ...lidPts, add(p1, add(mul(td, 0.1), [0, -0.06])), add(p1, add(mul(td, 0.2), [outer * 0.06, -0.2]))];
  const pk = st.peak ?? 0.45;
  taper(g, seq, (t) => {
    const k = t < pk ? Math.pow(t / pk, 0.8) : t > 0.86 ? Math.pow(Math.max(0, (1 - t) / 0.14), 0.8) : 1 - 0.3 * (t - pk) / (0.86 - pk);
    return st.lidW * (0.05 + 0.95 * k) + u(0.35);
  }, "#070707");
  if (st.low > 0) ink(g, [[-0.9, 1 - 2 * st.low + 0.12], [0, 1 - 2 * st.low - 0.02], [0.9, 1 - 2 * st.low + 0.12]], u(1.8), LINE, { end: 0.1 });
  g.restore();
  PPU = PPU0;
  // brow: a heavy wedge above the eye, lowered toward the beak when angry (drawn unscaled)
  if (st.brow) {
    g.save(); g.translate(e.x, e.y); g.rotate(e.rot || 0);
    const b = st.brow, inner = -side;
    const y0 = -r * (1.25 - 0.2 * b), yIn = y0 + r * 0.5 * b * (st.slant > 0.2 ? 1 : 0.3);
    ink(g, [[-inner * r * 1.05 * sx, y0 - r * 0.08], [0, y0 + (yIn - y0) * 0.4], [inner * r * 0.95 * sx, yIn]], r * 0.14 * b + 1.2, LINE, { end: 0.25, bias: 0.6 });
    g.restore();
  }
}

// ---------------------------------------------------------------- beak
// b: { x, y (top centre), w, l, rot (axis tilt), turn (-1..1: which cheek shows), open (0..1), smirk (0..1) }
export function drawBeak(g, b) {
  const { x, y, w = 30, l = 40, rot = 0, turn = 0, open = 0, smirk = 0 } = b;
  g.save(); g.translate(x, y); g.rotate(rot);
  const k = clamp(turn, -1, 1);
  const tip = [w * 0.05 + k * w * 0.05, l];
  const Lft = [[-w * 0.48, l * 0.02], [-w * 0.53, l * 0.3], [-w * 0.38, l * 0.68], tip];
  const Rt = [tip, [w * 0.22, l * 0.76], [w * 0.46, l * 0.44], [w * 0.5, l * 0.12], [w * 0.3, -l * 0.04], [-w * 0.05, -l * 0.06]];
  const path = blobPath([...Lft, ...Rt.slice(1)]);
  g.save(); g.beginPath(); path(g); g.clip();
  g.fillStyle = gv(0.86); g.fill();
  g.filter = `blur(${Math.max(0.4, w * 0.1 * PPU).toFixed(2)}px)`;
  g.fillStyle = gv(0.58, 0.85); g.beginPath(); g.ellipse(w * 0.42, l * 0.6, w * 0.3, l * 0.32, -0.5, 0, TAU); g.fill();
  g.fillStyle = gv(0.98, 0.9); g.beginPath(); g.ellipse(-w * 0.15, l * 0.22, w * 0.2, l * 0.22, 0.2, 0, TAU); g.fill();
  g.filter = "none";
  g.restore();
  if (open > 0.02) {
    const o = open;
    g.fillStyle = "#151515"; g.beginPath(); smoothPath(g, [[w * 0.5, l * 0.4], [w * 0.3, l * 0.72], tip, [w * 0.05, l * (0.95 + 0.45 * o)], [w * 0.44, l * (0.7 + 0.25 * o)]], true); g.fill();
    g.fillStyle = gv(0.82); g.beginPath(); smoothPath(g, [[w * 0.12, l * (0.9 + 0.3 * o)], [w * 0.4, l * (0.72 + 0.25 * o)], [w * 0.48, l * (0.82 + 0.3 * o)], [w * 0.1, l * (1.08 + 0.42 * o)]], true); g.fill();
    ink(g, [[w * 0.48, l * (0.72 + 0.25 * o)], [w * 0.3, l * (0.95 + 0.35 * o)], [w * 0.06, l * (1.08 + 0.42 * o)]], w * 0.07, LINE);
  } else {
    // closed: the lower mandible tucked in, a dark wedge with a pale lip, and the mouth line
    g.fillStyle = gv(0.3, 0.92);
    g.beginPath(); smoothPath(g, [[w * 0.5, l * 0.38], [w * 0.36, l * 0.56], [w * 0.16, l * 0.8], [w * 0.28, l * 0.58]], true); g.fill();
    g.fillStyle = gv(0.7, 0.9);
    g.beginPath(); smoothPath(g, [[w * 0.42, l * 0.5], [w * 0.3, l * 0.6], [w * 0.2, l * 0.72], [w * 0.3, l * 0.56]], true); g.fill();
    ink(g, [[w * 0.56 + smirk * w * 0.1, l * 0.36 - smirk * l * 0.14], [w * 0.36, l * 0.58], [w * 0.14, l * 0.84], tip], w * 0.07, LINE, { end: 0.15 });
  }
  ink(g, [[-w * 0.44, l * 0.0], ...Lft.slice(1)], w * 0.085, LINE, { end: 0.35, bias: 0.55 });
  ink(g, Rt.slice(0, 4), w * 0.05, LINE, { end: 0.2 });
  ink(g, [[-w * 0.44, 0], [-w * 0.1, -l * 0.07], [w * 0.3, -l * 0.04]], w * 0.03, gv(0.3, 0.5), { end: 0.2 });
  g.fillStyle = LINE; g.beginPath(); g.ellipse(-w * 0.04 - k * w * 0.1, l * 0.28, w * 0.065, w * 0.05, 0, 0, TAU); g.fill();
  g.restore();
}

// ---------------------------------------------------------------- bandage
// Two crossed sticking plasters, the short padded one on top. c: { x, y, size (length of the long strip), rot,
// cross (angle between strips), sx, sy (foreshortening) }.
export function drawBandage(g, c) {
  const { x, y, size = 80, rot = -0.6, sx = 1, sy = 1, cross = 1.25 } = c;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(sx, sy);
  const W = size, h = size * 0.19, lw = wmin(size * 0.011);
  const strip = (len, wd, dx, dy, a, pad, dots) => {
    g.save(); g.translate(dx, dy); g.rotate(a);
    g.fillStyle = gv(0.92); g.beginPath(); g.roundRect(-len / 2, -wd / 2, len, wd, wd / 2); g.fill();
    g.save(); g.clip(); g.fillStyle = gv(0.62, 0.3); g.fillRect(-len / 2, wd * 0.2, len, wd * 0.4); g.restore();
    if (pad) {
      g.fillStyle = gv(0.95); g.beginPath(); g.roundRect(-wd * 0.62, -wd * 0.46, wd * 1.2, wd * 0.92, wd * 0.14); g.fill();
      g.strokeStyle = gv(0.2, 0.85); g.lineWidth = lw * 0.8; g.beginPath(); g.roundRect(-wd * 0.62, -wd * 0.46, wd * 1.2, wd * 0.92, wd * 0.14); g.stroke();
      g.strokeStyle = gv(0.45, 0.4); g.lineWidth = lw * 0.5;
      for (const yy of [-0.2, 0.16]) { g.beginPath(); g.moveTo(-wd * 0.5, wd * yy); g.lineTo(wd * 0.45, wd * (yy + 0.06)); g.stroke(); }
    }
    g.fillStyle = LINE;
    for (const [dxx, dyy] of dots) { g.beginPath(); g.arc(dxx * len / 2, dyy * wd / 2, Math.max(0.6 / PPU, size * 0.011), 0, TAU); g.fill(); }
    g.strokeStyle = LINE; g.lineWidth = lw; g.beginPath(); g.roundRect(-len / 2, -wd / 2, len, wd, wd / 2); g.stroke();
    g.restore();
  };
  const dotsA = [];
  for (let i = 0; i < 8; i++) { const t = -0.84 + i * 0.075; dotsA.push([t, -0.32 + (i % 2) * 0.6]); dotsA.push([-t, 0.3 - (i % 2) * 0.6]); }
  strip(W, h, 0, 0, 0, false, dotsA);
  const dotsB = [];
  for (const t of [-0.74, -0.6, -0.46, 0.46, 0.6, 0.74]) { dotsB.push([t, -0.3]); dotsB.push([t + 0.06, 0.28]); }
  strip(W * 0.62, h * 1.55, W * 0.1, h * 0.55, cross, true, dotsB);
  g.restore();
}

// ---------------------------------------------------------------- headphones
let DOTS = null;
function dotPattern(g, scale = 1) {
  if (!DOTS) {
    DOTS = document.createElement("canvas"); DOTS.width = DOTS.height = 6;
    const d = DOTS.getContext("2d");
    d.fillStyle = gv(0.84); d.fillRect(0, 0, 6, 6);
    d.fillStyle = gv(0.1);
    for (const [px, py] of [[1.5, 1.5], [4.5, 4.5]]) { d.beginPath(); d.arc(px, py, 1.05, 0, TAU); d.fill(); }
  }
  return g.createPattern(DOTS, "repeat");
}
// Fill the current clip with print-scale halftone dots (device pixels), then darken toward `dark` (units) softly.
function halftone(g, clip, darkShape, darkAlpha = 0.4, blurU = 10) {
  g.save(); g.beginPath(); clip(g); g.clip();
  const T = g.getTransform();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = dotPattern(g); g.fillRect(0, 0, g.canvas.width, g.canvas.height);
  g.setTransform(T);
  if (darkShape) { g.filter = `blur(${Math.max(0.4, blurU * PPU).toFixed(2)}px)`; g.fillStyle = `rgba(0,0,0,${darkAlpha})`; g.beginPath(); darkShape(g); g.fill(); g.filter = "none"; }
  g.restore();
}
// A cup seen at an angle. c = { x, y, r (half height, units), rot, open (how much of the plate face shows, 0.4..0.85),
// side (+1: the plate faces viewer's right) }. Cushion (dark, ribbed) on the head side, a brushed metal shell,
// a dark-rimmed halftone plate, and the pale yoke arm hooking round the plate.
export function drawCup(g, c) {
  const { x, y, r = 50, rot = 0, open = 0.72, side = 1 } = c;
  const s = side, k = open / 0.72;
  g.save(); g.translate(x, y); g.rotate(rot);
  const cushX = -s * 0.5 * r, shellX = s * 0.04 * r, plX = s * 0.2 * r * Math.sqrt(k), plY = -0.02 * r;
  const shRx = 0.9 * r * open, plRx = 0.72 * r * open, plRy = 0.78 * r;
  const rr = rng(41);
  // cushion
  const cush = (q) => q.ellipse(cushX, 0.03 * r, 0.42 * r, 1.02 * r, 0, 0, TAU);
  g.fillStyle = "#0a0a0a"; g.beginPath(); cush(g); g.fill();
  g.save(); g.beginPath(); cush(g); g.clip();
  g.lineCap = "round";
  for (let i = -18; i <= 18; i++) {
    const t = i / 18, yy = t * r * 0.95, half = Math.sqrt(Math.max(0, 1 - t * t)) * 0.36 * r;
    g.strokeStyle = gv(0.55 + 0.35 * rr(), 0.85); g.lineWidth = wmin(r * 0.022 * (0.6 + rr()));
    const xa = cushX - s * half * 0.92, xb = cushX - s * half * (0.1 + 0.35 * rr());
    g.beginPath(); g.moveTo(xa, yy); g.lineTo(xb, yy + r * 0.015); g.stroke();
  }
  g.restore();
  // shell
  const shell = (q) => q.ellipse(shellX, 0, shRx, 0.96 * r, 0, 0, TAU);
  g.fillStyle = gv(0.8); g.beginPath(); shell(g); g.fill();
  g.save(); g.beginPath(); shell(g); g.clip();
  g.filter = `blur(${Math.max(0.4, r * 0.07 * PPU).toFixed(2)}px)`;
  g.fillStyle = gv(0.97, 0.9); g.beginPath(); g.ellipse(shellX - s * shRx * 0.45, -r * 0.25, shRx * 0.2, r * 0.6, 0, 0, TAU); g.fill();
  g.fillStyle = gv(0.25, 0.75); g.beginPath(); g.ellipse(shellX + s * shRx * 0.95, r * 0.1, shRx * 0.25, r * 0.9, 0, 0, TAU); g.fill();
  g.fillStyle = gv(0.3, 0.55); g.beginPath(); g.ellipse(shellX, r * 0.95, shRx * 0.8, r * 0.22, 0, 0, TAU); g.fill();
  g.filter = "none";
  // brushed streaks following the rim
  for (let i = 0; i < 22; i++) {
    g.strokeStyle = gv(rr() < 0.5 ? 0.25 : 0.98, 0.45); g.lineWidth = wmin(r * 0.012);
    const f = 0.78 + rr() * 0.2, a = -Math.PI / 2 + (rr() - 0.5) * 2.6;
    g.beginPath(); g.ellipse(shellX, 0, shRx * f, 0.96 * r * f, 0, a, a + 0.3 + rr() * 0.6); g.stroke();
  }
  g.restore();
  g.strokeStyle = LINE; g.lineWidth = wmin(r * 0.04); g.beginPath(); shell(g); g.stroke();
  // plate: dark rim, halftone face darker toward the lower outer edge
  g.fillStyle = "#0c0c0c"; g.beginPath(); g.ellipse(plX, plY, plRx + r * 0.05, plRy + r * 0.05, 0, 0, TAU); g.fill();
  halftone(g, (q) => q.ellipse(plX + s * r * 0.01, plY, plRx, plRy, 0, 0, TAU), (q) => q.ellipse(plX + s * plRx * 0.6, plY + plRy * 0.55, plRx * 0.7, plRy * 0.6, 0, 0, TAU), 0.45, r * 0.12);
  // yoke arm
  const ay = [[shellX + s * shRx * 0.05, -r * 1.02], [plX - s * plRx * 1.05, -r * 0.55], [plX - s * plRx * 1.12, r * 0.05], [plX - s * plRx * 0.8, r * 0.42]];
  ink(g, ay, r * 0.15, LINE, { end: 0.85, pow: 0.3 });
  ink(g, ay, r * 0.095, gv(0.9), { end: 0.85, pow: 0.3 });
  ink(g, ay.map(([a, b]) => [a - s * r * 0.02, b]), r * 0.025, gv(0.55, 0.7), { end: 0.5 });
  // hinge block at the top
  g.fillStyle = gv(0.75); g.strokeStyle = LINE; g.lineWidth = wmin(r * 0.035);
  g.beginPath(); g.roundRect(shellX - r * 0.2, -r * 1.12, r * 0.4, r * 0.16, r * 0.04); g.fill(); g.stroke();
  g.restore();
}
// The band: a metal strip along pts with a dark keyline, a halftone inner face, and knurled sliders at the ends.
export function drawBand(g, pts, { w = 18, slider = 0.2, ends = [true, true], halftone: ht = 1, ribs = true } = {}) {
  if (pts.length < 2) return;
  const q = sampleCurve(pts, 6);
  const nrmAt = (i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)]; return perp(nrm(sub(b, a))); };
  const edge = (k) => q.map((p, i) => add(p, mul(nrmAt(i), k)));
  const Lp = edge(-w / 2), Rp = edge(w / 2);
  const poly = (c) => { c.moveTo(Lp[0][0], Lp[0][1]); for (const p of Lp) c.lineTo(p[0], p[1]); for (let i = Rp.length - 1; i >= 0; i--) c.lineTo(Rp[i][0], Rp[i][1]); c.closePath(); };
  g.fillStyle = gv(0.78); g.beginPath(); poly(g); g.fill();
  if (ht) {
    // halftone on the inner half
    const Mp = edge(w * 0.05);
    halftone(g, (c) => { c.moveTo(Mp[0][0], Mp[0][1]); for (const p of Mp) c.lineTo(p[0], p[1]); for (let i = Rp.length - 1; i >= 0; i--) c.lineTo(Rp[i][0], Rp[i][1]); c.closePath(); }, null);
    taper(g, Mp, () => wmin(w * 0.06), LINE);
  }
  taper(g, edge(-w * 0.28), () => wmin(w * 0.12), gv(0.98, 0.85));
  g.strokeStyle = LINE; g.lineWidth = wmin(w * 0.1); g.lineJoin = "round"; g.beginPath(); poly(g); g.stroke();
  // knurled sliders near the ends
  const seg = (u0, u1) => {
    const n0 = Math.floor((q.length - 1) * u0), n1 = Math.floor((q.length - 1) * u1);
    const sl = [...edge(-w * 0.62).slice(n0, n1 + 1)], sr = [...edge(w * 0.62).slice(n0, n1 + 1)];
    g.fillStyle = gv(0.5); g.beginPath(); g.moveTo(sl[0][0], sl[0][1]); for (const p of sl) g.lineTo(p[0], p[1]); for (let i = sr.length - 1; i >= 0; i--) g.lineTo(sr[i][0], sr[i][1]); g.closePath(); g.fill();
    g.strokeStyle = LINE; g.lineWidth = wmin(w * 0.1); g.stroke();
    for (let i = n0; i <= n1; i++) {
      const a = q[i], n = nrmAt(i);
      g.strokeStyle = i % 2 ? gv(0.85, 0.8) : gv(0.08, 0.9); g.lineWidth = wmin(w * (i % 2 ? 0.06 : 0.1));
      g.beginPath(); g.moveTo(a[0] + n[0] * w * 0.55, a[1] + n[1] * w * 0.55); g.lineTo(a[0] - n[0] * w * 0.55, a[1] - n[1] * w * 0.55); g.stroke();
    }
  };
  if (ribs && ends[0]) seg(0, slider);
  if (ribs && ends[1]) seg(1 - slider, 1);
}
// Headphone rig on a head: its own yaw (default = head yaw) and offset (head radii), cups on the side axis at
// `lift`, the band an arch of half-span bandR and height bandH (head radii) leaning back by `tilt`.
// Returns { band: [{p, z}], segs: [{pts, front, ends}], cups: [{x, y, z, side, open}] } in owl units.
export function headphoneGeom(H, HP) {
  const yaw = HP.yaw ?? H.yaw, dx = HP.dx ?? 0, dy = HP.dy ?? 0, tilt = HP.tilt ?? 0.15;
  const lift = HP.lift ?? 1.3, bR = HP.bandR ?? 1.3, bH = HP.bandH ?? 1.6, pw = HP.bandPow ?? 0.6;
  const proj = (X, Y, Z) => {
    const x1 = X * Math.cos(yaw) + Z * Math.sin(yaw), z1 = -X * Math.sin(yaw) + Z * Math.cos(yaw);
    const y2 = Y * Math.cos(H.pitch) - z1 * Math.sin(H.pitch), z2 = Y * Math.sin(H.pitch) + z1 * Math.cos(H.pitch);
    return { p: H.toFrame((x1 + dx) * H.rx, (y2 + dy) * H.ry), z: z2 };
  };
  const band = [];
  const N = 40, cupTop = (HP.r ?? 50) / H.ry * 0.85;
  for (let i = 0; i <= N; i++) {
    const ph = -Math.PI / 2 + (i / N) * Math.PI;
    const X = Math.sin(ph) * bR, Yv = -(cupTop + Math.pow(Math.cos(ph), pw) * (bH - cupTop));
    band.push(proj(X, Yv * Math.cos(tilt), Yv * Math.sin(tilt)));
  }
  const segs = [];
  let cur = null;
  for (let i = 0; i <= N; i++) {
    const front = band[i].z >= 0;
    if (!cur || cur.front !== front) { if (cur) cur.pts.push(band[i].p); cur = { front, pts: i > 0 ? [band[i - 1].p] : [] }; segs.push(cur); }
    cur.pts.push(band[i].p);
  }
  segs.forEach((sg, k) => { sg.ends = [k === 0, k === segs.length - 1]; if (sg.pts.length < 2) sg.pts.push(sg.pts[0]); });
  const cups = [-1, 1].map((sd) => {
    const c = proj(sd * lift, -Math.sin(HP.cupEl ?? 0), 0), o = proj(0, -Math.sin(HP.cupEl ?? 0), 0);
    return { sd, x: c.p[0], y: c.p[1], z: c.z, side: c.p[0] >= o.p[0] ? 1 : -1, open: HP.open ?? clamp(0.5 + 0.8 * Math.abs(Math.sin(yaw)), 0.4, 0.85) };
  });
  return { band, segs, cups };
}

// ---------------------------------------------------------------- feet
// foot: { x, y (ankle), rot (radians; 0 = toes point down), size, mode: 'perch' (curled over an edge) | 'stand'
// (splayed flat) | 'dangle' (hanging in flight), toes (3|4), leg (visible leg length, 0 = hidden in feathers) }
export function drawFoot(g, f) {
  const { x, y, rot = 0, size = 16, mode = "perch", toes = 3, leg = 0, spread = 0.35, seed = 3 } = f;
  g.save(); g.translate(x, y); g.rotate(rot);
  g.lineCap = "round"; g.lineJoin = "round";
  const r = rng(seed);
  if (leg > 0) {
    g.fillStyle = gv(0.86); g.beginPath(); g.roundRect(-size * 0.17, -leg, size * 0.34, leg + size * 0.2, size * 0.14); g.fill();
    ink(g, [[-size * 0.17, -leg], [-size * 0.19, -leg * 0.5], [-size * 0.17, 0]], size * 0.07, LINE, { end: 0.6 });
    ink(g, [[size * 0.17, -leg], [size * 0.19, -leg * 0.5], [size * 0.17, 0]], size * 0.07, LINE, { end: 0.6 });
    for (let k = 1; k < 5; k++) ink(g, [[-size * 0.14, -leg * k / 5], [size * 0.14, -leg * k / 5 + size * 0.05]], size * 0.03, gv(0.3, 0.7));
  }
  // toes sit side by side across the foot and fan only a little; the order draws the back toes first
  for (let i = 0; i < toes; i++) {
    const f0 = toes === 1 ? 0 : i / (toes - 1) - 0.5;
    const dir = V.rot([0, 1], f0 * spread);
    const root = [f0 * size * (mode === "stand" ? 0.5 : 1.25), -Math.abs(f0) * size * 0.2];
    const L = size * (mode === "stand" ? 1.3 : 0.85) * (1 - Math.abs(f0) * 0.2);
    let pts;
    if (mode === "stand") pts = [root, add(root, add(mul(V.rot([0, 1], f0 * spread * 2.2), L * 0.5), [0, size * 0.1])), add(root, add(mul(V.rot([0, 1], f0 * spread * 2.4), L), [0, size * 0.18]))];
    else if (mode === "dangle") pts = [root, add(root, mul(dir, L * 0.55)), add(add(root, mul(dir, L * 0.85)), mul(perp(dir), -L * 0.22))];
    else pts = [root, add(add(root, mul(dir, L * 0.55)), mul(perp(dir), L * 0.12)), add(add(root, mul(dir, L * 0.95)), mul(perp(dir), L * 0.05))];
    const q = sampleCurve(pts, 6);
    const tw = size * (mode === "stand" ? 0.42 : 0.4);
    taper(g, q, (u) => tw * (1.12 - 0.3 * u), LINE);
    taper(g, q, (u) => tw * (0.88 - 0.28 * u), gv(0.9 - 0.05 * r()));
    // knuckle pads
    for (let k = 1; k < 2; k++) {
      const j = Math.floor(q.length * 0.55), p = q[j], t = nrm(sub(q[Math.min(q.length - 1, j + 1)], p)), n = perp(t);
      ink(g, [add(p, mul(n, -tw * 0.34)), add(p, mul(t, -tw * 0.1)), add(p, mul(n, tw * 0.34))], size * 0.045, gv(0.25, 0.85), { end: 0.2 });
    }
    // claw: a pale hook curling down (toward the perch) with a dark keyline and a dark tip
    const e = q[q.length - 1], t = nrm(sub(e, q[q.length - 3])), n = perp(t), cl = size * (mode === "stand" ? 0.55 : 0.6);
    const hook = mode === "stand" ? -1 : 1;
    const tip = add(add(e, mul(t, cl * 0.7)), mul(n, hook * cl * 0.5));
    const claw = [add(e, mul(n, -tw * 0.32)), add(add(e, mul(t, cl * 0.55)), mul(n, -tw * 0.12 * hook)), tip, add(add(e, mul(t, cl * 0.35)), mul(n, tw * 0.28 * hook)), add(e, mul(n, tw * 0.32))];
    g.fillStyle = gv(0.9); g.beginPath(); smoothPath(g, claw, true); g.fill();
    g.strokeStyle = LINE; g.lineWidth = wmin(size * 0.07); g.beginPath(); smoothPath(g, claw, true); g.stroke();
    g.fillStyle = LINE; g.beginPath(); g.arc(tip[0], tip[1], wmin(size * 0.05), 0, TAU); g.fill();
  }
  g.restore();
}

// ---------------------------------------------------------------- pose presets
// The hero pose: sitting three-quarter, head turned to viewer's left, tail to the right (s09/s12, 32.6–35.4 s).
// Placement in those shots: HERO_PLACE (measured on the source at 34.0 s).
export const HERO_PLACE = { x: 1296, y: 636, s: 2.6 };
const SIT3Q = {
  light: [-0.85, -0.5],
  head: { x: -126, y: -122, rx: 109, ry: 100, yaw: -0.25, pitch: 0, roll: -0.136, square: 2.6, jowl: 0.05 },
  tufts: [{ at: -0.44, size: 30, width: 0.26, lean: 0.35, second: 0.45, curl: 0.12 }, { at: 0.98, size: 52, width: 0.34, lean: -0.42, second: 0.5, curl: 0.3 }],
  body: { x: -6, y: -8, a: 170, b: 99, rot: 0.384, egg: 0.0, sag: 0.0 },
  tail: { base: [134, 40], tip: [247, 76], w: 26, n: 2, spread: 0.0 },
  wings: [{ type: "folded", layer: "front", S: [-31, -75], T: [171, 52], width: 58, back: 55, dir: 1 }],
  feet: [{ x: -60, y: 86, rot: 0.65, size: 26, mode: "perch", toes: 4, spread: 0.35, seed: 4 }, { x: 30, y: 98, rot: 0.4, size: 28, mode: "perch", toes: 4, spread: 0.35, seed: 9 }],
  eyes: { state: "stare", r: 27.3, spread: 0.4365, el: -0.19, look: [-0.55, -0.6], left: { slant: 0.2, pupil: 0.84, look: [0.45, -0.5] } },
  beak: { el: -0.41, lift: 1.32, w: 32, l: 40 },
  bandage: { az: -0.55, el: 0.82, size: 80, rot: -0.5 },
  headphones: { on: true, yaw: -0.8, dx: 0.38, dy: 0.02, lift: 1.3, r: 50, bandR: 1.3, bandH: 2.0, tilt: 0.15, open: 0.72, cupEl: -0.02, w: 19 },
  flow: [-0.35, 1],
  disc: 1,
};

// A shallow deep-merge (objects merge, arrays and scalars replace).
export function mergePose(a, b) {
  if (!b) return a;
  const out = Array.isArray(a) ? [...a] : { ...a };
  for (const k of Object.keys(b)) {
    const v = b[k];
    out[k] = v && typeof v === "object" && !Array.isArray(v) && a && typeof a[k] === "object" && a[k] && !Array.isArray(a[k]) ? mergePose(a[k], v) : v;
  }
  return out;
}

export const POSES = {
  sit3q: SIT3Q,
  // sitting, facing us (on his shoulder, 20–29 s)
  front: {
    light: [-0.5, -0.86],
    head: { x: 0, y: -118, rx: 108, ry: 96, yaw: 0, pitch: 0, roll: 0, square: 2.6, jowl: 0.05 },
    tufts: [{ at: -0.8, size: 28, width: 0.3, lean: -0.1, second: 0.5, curl: 0.12 }, { at: 0.8, size: 28, width: 0.3, lean: 0.1, second: 0.5, curl: 0.12 }],
    body: { x: 0, y: 10, a: 118, b: 104, rot: Math.PI / 2, egg: -0.1, sag: 0.0 },
    tail: null,
    wings: [
      { type: "folded", layer: "front", S: [-86, -34], T: [-70, 110], width: 30, back: 14, dir: -1 },
      { type: "folded", layer: "front", S: [86, -34], T: [70, 110], width: 30, back: 14, dir: 1 },
    ],
    feet: [{ x: -34, y: 116, rot: 0, size: 16, mode: "perch", seed: 2 }, { x: 34, y: 116, rot: 0, size: 16, mode: "perch", seed: 5 }],
    eyes: { state: "stare", r: 25, spread: 0.42, el: -0.12, look: [0, -0.3] },
    beak: { el: -0.5, lift: 1.25, w: 26, l: 34 },
    bandage: { az: -0.5, el: 0.78, size: 64, rot: -0.55 },
    headphones: { on: true, lift: 1.12, r: 46, tilt: 0.25, bandR: 1.12, bandH: 1.3, cupEl: 0.1, w: 15, open: 0.5 },
    flow: [0, 1],
    disc: 1,
  },
};
// Derived presets: the rest of the film's poses (see docs/owl.md for what each is for).
POSES.frontStand = mergePose(POSES.front, { feet: [{ x: -38, y: 108, rot: 0.15, size: 15, mode: "stand", leg: 24, seed: 2 }, { x: 38, y: 108, rot: -0.15, size: 15, mode: "stand", leg: 24, seed: 5 }], body: { a: 110 } });
POSES.hips = mergePose(POSES.frontStand, {
  eyes: { state: "angry", look: [0.2, 0.15] },
  wings: [
    { type: "arm", layer: "front", S: [-84, -40], Wr: [-132, 26], T: [-80, 62], len: 30 },
    { type: "arm", layer: "front", S: [84, -40], Wr: [132, 26], T: [80, 62], len: 30 },
  ],
  beak: { smirk: 1 },
});
POSES.smirk = mergePose(POSES.frontStand, { eyes: { state: "smug", look: [0.6, 0.1] }, head: { roll: 0.08, yaw: 0.12 }, beak: { smirk: 1 } });
POSES.startled = mergePose(POSES.front, {
  eyes: { state: "startled", look: [0, 0] },
  beak: { open: 0.8 },
  wings: [
    { type: "spread", layer: "back", S: [-80, -40], Wr: [-160, -110], T: [-230, -160], trail: [0.3, 1], len: 60, spread: 0.7 },
    { type: "spread", layer: "back", S: [80, -40], Wr: [160, -110], T: [230, -160], trail: [-0.3, 1], len: 60, spread: 0.7 },
  ],
});
POSES.fly = mergePose(POSES.front, {
  eyes: { state: "stare", look: [0, 0.1] },
  body: { a: 104, b: 94, y: 0 },
  feet: [{ x: -26, y: 104, rot: 0.1, size: 13, mode: "dangle", seed: 2 }, { x: 26, y: 104, rot: -0.1, size: 13, mode: "dangle", seed: 5 }],
  wings: [
    { type: "spread", layer: "back", S: [-78, -46], Wr: [-190, -120], T: [-330, -110], trail: [0.2, 1], len: 78, spread: 1 },
    { type: "spread", layer: "back", S: [78, -46], Wr: [190, -120], T: [330, -110], trail: [-0.2, 1], len: 78, spread: 1 },
  ],
});
POSES.flyDown = mergePose(POSES.fly, {
  wings: [
    { type: "spread", layer: "back", S: [-78, -40], Wr: [-190, 10], T: [-300, 120], trail: [0.5, 0.8], len: 70, spread: 0.8 },
    { type: "spread", layer: "back", S: [78, -40], Wr: [190, 10], T: [300, 120], trail: [-0.5, 0.8], len: 70, spread: 0.8 },
  ],
});
POSES.angry = mergePose(POSES.fly, { eyes: { state: "angry", look: [-0.2, 0.2] }, head: { yaw: -0.2, roll: -0.12 }, beak: { open: 0.35 } });
// walking to the right, seen from the side: upright egg body, head turned to face the way it goes, tail down-left
POSES.walk = mergePose(SIT3Q, {
  light: [-0.6, -0.8],
  head: { x: 18, y: -128, rx: 100, ry: 92, yaw: 0.55, roll: 0.04 },
  tufts: [{ at: -0.62, size: 24, width: 0.28, lean: -0.1, second: 0.45, curl: 0.1 }, { at: 0.72, size: 26, width: 0.3, lean: 0.1, second: 0.45, curl: 0.12 }],
  body: { x: 0, y: 6, a: 112, b: 96, rot: 2.1, egg: 0.08, sag: 0.0 },
  tail: { base: [-58, 70], tip: [-150, 150], w: 22, n: 2 },
  wings: [{ type: "folded", layer: "front", S: [18, -62], T: [-96, 118], width: 34, back: 26, dir: -1 }],
  feet: [{ x: -14, y: 100, rot: -0.35, size: 14, mode: "stand", leg: 22, seed: 2 }, { x: 38, y: 94, rot: -0.1, size: 14, mode: "stand", leg: 16, seed: 5 }],
  eyes: { state: "stare", r: 24, spread: 0.42, el: -0.12, look: [0.7, 0], left: null },
  beak: { el: -0.45, lift: 1.28, w: 26, l: 34 },
  bandage: { az: -0.5, el: 0.78, size: 60, rot: -0.55 },
  headphones: { on: true, yaw: 0.55, dx: 0, dy: 0, lift: 1.12, r: 44, bandR: 1.12, bandH: 1.35, tilt: 0.2, open: null, cupEl: 0.1, w: 15 },
  flow: [0.3, 1],
});
POSES.carry = mergePose(POSES.frontStand, {
  wings: [
    { type: "spread", layer: "back", S: [-80, -40], Wr: [-150, -150], T: [-120, -250], trail: [-0.9, 0.3], len: 56, spread: 0.6 },
    { type: "spread", layer: "back", S: [80, -40], Wr: [150, -150], T: [120, -250], trail: [0.9, 0.3], len: 56, spread: 0.6 },
  ],
  eyes: { state: "stare", look: [0, -0.8] }, head: { pitch: 0.12 },
});
POSES.sleep = mergePose(SIT3Q, { eyes: { state: "closed" }, head: { y: -100, x: -131, roll: -0.23 } });
POSES.glare = mergePose(SIT3Q, { eyes: { state: "glare" }, head: { x: -130, y: -110, roll: -0.215 } });

// ---------------------------------------------------------------- the whole owl
// pose: a preset (object) merged with overrides, plus placement { x, y, s, rot, flip, res, detail, lightFrame, clip }.
// Returns { canvas, x, y, w, h, anchors }: the owl on its own transparent canvas, to draw at (x, y, w, h) in the frame.
let SCR = null;
export function owlLayer(pose) {
  const P = pose;
  const s = P.s ?? 1, res = P.res ?? 1, rot = P.rot ?? 0, fl = P.flip ? -1 : 1;
  const ca = Math.cos(rot), sa = Math.sin(rot);
  const toF = ([ux, uy]) => [P.x + s * (ca * fl * ux - sa * uy), P.y + s * (sa * fl * ux + ca * uy)];
  const Lf = P.lightFrame || P.light || [-0.55, -0.83];
  const Lu = nrm([fl * (ca * Lf[0] + sa * Lf[1]), -sa * Lf[0] + ca * Lf[1]]);
  const dl = P.detail ?? clamp((s * res) / 1.2, 0.2, 1);
  const flow = P.flow || [0, 1];

  // --- geometry (owl units)
  const H = headGeom(P.head);
  const body = P.body ? bodyOutline(P.body) : null;
  const tail = P.tail ? tailShape(P.tail) : [];
  const wings = (P.wings || []).map((w) => ({ ...w, g: w.type === "folded" ? foldedWing(w) : w.type === "arm" ? null : spreadWing(w) }));
  const tufts = (P.tufts || []).map((t) => tuftShape(H, t));
  const E = P.eyes || {};
  const eyes = [-1, 1].map((sd) => {
    const q = H.P(sd * (E.spread ?? 0.44), E.el ?? -0.15);
    const nz = Math.max(0.05, q.nz);
    return { x: q.x, y: q.y, nz, side: sd, r: (E.r ?? 27) * (1 - 0.4 * (1 - nz)), sx: 0.4 + 0.6 * nz };
  });
  const B = P.beak || {};
  const bq = H.P(0, B.el ?? -0.5, B.lift ?? 1.3);
  const HP = P.headphones || {};
  const hp = HP.on ? headphoneGeom(H, HP) : null;
  const all = [...H.out, ...tufts.flatMap((t) => t.pts)];
  if (body) all.push(...body);
  tail.forEach((f) => all.push(...f));
  wings.forEach((w) => {
    if (w.type === "folded") all.push(...w.g.outline);
    else if (w.type === "arm") all.push(w.S, w.Wr, w.T, add(w.T, [0, w.len ?? 30]));
    else { all.push(w.S, w.Wr, w.T); w.g.feathers.forEach((f) => all.push(add(f.root, mul(f.dir, f.L)))); }
  });
  (P.feet || []).forEach((f) => all.push([f.x - (f.size || 15) * 1.5, f.y + (f.size || 15) * 2.2], [f.x + (f.size || 15) * 1.5, f.y - (f.leg || 0)]));
  if (hp) { hp.band.forEach((b) => all.push(b.p)); hp.cups.forEach((c) => all.push([c.x - (HP.r ?? 50), c.y - (HP.r ?? 50) * 1.2], [c.x + (HP.r ?? 50), c.y + (HP.r ?? 50) * 1.1])); }
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of all) { const f = toF(p); x0 = Math.min(x0, f[0]); y0 = Math.min(y0, f[1]); x1 = Math.max(x1, f[0]); y1 = Math.max(y1, f[1]); }
  const m = 16 * s + 6;
  x0 = Math.floor(x0 - m); y0 = Math.floor(y0 - m); x1 = Math.ceil(x1 + m); y1 = Math.ceil(y1 + m);
  if (P.clip) { x0 = Math.max(x0, P.clip[0]); y0 = Math.max(y0, P.clip[1]); x1 = Math.min(x1, P.clip[2]); y1 = Math.min(y1, P.clip[3]); }
  if (x1 <= x0) x1 = x0 + 1; if (y1 <= y0) y1 = y0 + 1;
  const cw = Math.max(1, Math.round((x1 - x0) * res)), ch = Math.max(1, Math.round((y1 - y0) * res));
  const cv = P.canvas || document.createElement("canvas");
  if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
  const g = cv.getContext("2d", { willReadFrequently: true });
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch);
  g.setTransform(res * s * fl * ca, res * s * fl * sa, -res * s * sa, res * s * ca, res * (P.x - x0), res * (P.y - y0));
  const prevPPU = PPU; PPU = s * res;
  const plu = { light: Lu };
  const hatchCol = gv(0.3, 0.5);
  const drawCupAt = (c) => drawCup(g, { x: c.x, y: c.y, r: HP.r ?? 50, rot: H.roll, open: c.open, side: c.side });

  // --- far side: the band behind the crown, and a far cup (mostly hidden by the head)
  if (hp) {
    for (const sg of hp.segs) if (!sg.front) drawBand(g, sg.pts, { w: HP.w ?? 16, ends: sg.ends });
    for (const c of hp.cups) if (c.z < -0.02) drawCupAt(c);
  }
  // --- back wings
  for (const w of wings) if (w.layer === "back") paintWing(g, w, plu, dl, flow);
  // --- tail
  tail.forEach((f) => {
    plumage(g, blobPath(f), { base: 0.93, shade: 0.72, depth: 10, blur: 5, ...plu });
    ink(g, [f[0], f[1], f[2], f[3]], 1.2, gv(0.3, 0.7), { end: 0.3, bias: 0.7 });
    ink(g, [f[3], f[4], f[5]], 2.0, LINE, { end: 0.2, bias: 0.3 });
    if (dl > 0.5) { ink(g, [V.mix(f[0], f[6], 0.45), V.mix(f[1], f[5], 0.45), V.mix(f[2], f[4], 0.4)], 0.8, gv(0.35, 0.5)); }
  });
  // --- feet (behind the belly: the plumage overlaps the toe roots and legs)
  (P.feet || []).forEach((f) => drawFoot(g, f));
  // --- body
  if (body) {
    const bp = blobPath(body), b = P.body;
    plumage(g, bp, { base: 0.97, shade: 0.8, depth: b.a * 0.3, blur: b.a * 0.08, ...plu });
    // the belly turns away from the light: a toned band along the underside
    softShade(g, bp, (c) => { const q = add([b.x || 0, b.y || 0], V.rot([b.a * 0.05, b.b * 1.0], b.rot)); c.ellipse(q[0], q[1], b.a * 0.85, b.b * 0.32, b.rot, 0, TAU); }, 0.62, 0.45, b.b * 0.18);
    if (dl > 0.25) {
      rimHatch(g, body, { light: Lu, flow, len: b.a * 0.09, step: 3.2, w: 1.0, color: hatchCol, seed: 12, density: 0.9, bend: 0.6 });
      edgeFlicks(g, body, { step: 10, len: b.a * 0.06, w: 0.9, color: gv(0.4, 0.4), ang: 0.9, seed: 19 });
      // feather rows across the chest and belly, following the body's curve
      for (let k = 0; k < 3; k++) {
        const c = add([b.x || 0, b.y || 0], V.rot([-b.a * (0.2 - k * 0.25), 0], b.rot));
        const pts = [];
        for (let j = 0; j <= 6; j++) { const t = Math.PI * (0.35 + j * 0.06); pts.push(add(c, V.rot([Math.cos(t) * b.a * 0.4, Math.sin(t) * b.b * (0.55 + k * 0.12)], b.rot))); }
        featherRow(g, pts, { step: 6, len: b.a * 0.07, w: 1.0, color: gv(0.42, 0.4), ang: 2.2, seed: 14 + k, gap: 0.35 });
      }
    }
  }
  // --- front wings, feet
  for (const w of wings) if (w.layer !== "back") paintWing(g, w, plu, dl, flow);

  // --- head
  const hpth = blobPath(H.out);
  tufts.forEach((t) => plumage(g, blobPath(t.pts), { base: 0.96, shade: 0.78, depth: 12, blur: 5, ...plu }));
  plumage(g, hpth, { base: 0.97, shade: 0.8, depth: H.ry * 0.36, blur: H.ry * 0.1, keep: [0, H.ry * 0.5], ...plu });
  if (hp) {
    const nc = hp.cups.find((c) => c.z >= 0);
    if (nc) softShade(g, hpth, (c) => c.ellipse(nc.x - nc.side * (HP.r ?? 50) * 0.9, nc.y + 5, (HP.r ?? 50) * 0.55, (HP.r ?? 50) * 1.3, H.roll, 0, TAU), 0.62, 0.5, 14);
  }
  if (dl > 0.25) {
    rimHatch(g, H.out, { light: Lu, flow, len: H.ry * 0.2, step: 2.4, w: 1.0, color: hatchCol, seed: 22, density: 0.9, thr: 0.1 });
    edgeFlicks(g, H.out, { step: 24, len: 9, w: 0.9, color: gv(0.5, 0.3), ang: 1.1, seed: 23 });
  }
  tufts.forEach((t) => {
    // feather lines up the tuft and a dark shadow stroke under its inner edge
    if (dl > 0.3) for (let k = 0; k < 5; k++) { const b = V.mix(t.inner, t.outer, 0.2 + k * 0.15); flick(g, b, nrm(sub(V.mix(t.tip, t.tip2, k / 5), b)), V.len(sub(t.tip, b)) * (0.55 + 0.1 * k), 1.0, gv(0.35, 0.55), 0.05 * t.side); }
    ink(g, [V.mix(t.inner, t.base, 0.2), V.mix(t.base, t.tip2, 0.5), t.tip2], 1.6, LINE, { end: 0.05, bias: 0.3 });
  });
  if ((P.disc ?? 1) && dl > 0.25) paintDisc(g, H, eyes, bq, dl);
  for (const e of eyes) {
    if (e.nz < 0.12) continue;
    drawEye(g, { x: e.x, y: e.y, r: e.r, sx: e.sx, rot: H.roll, side: e.side, state: E.state, look: E.look, ...(E.over || {}), ...(e.side < 0 ? E.left : E.right) });
  }
  drawBeak(g, { x: bq.x, y: bq.y, w: B.w ?? 30, l: B.l ?? 40, rot: H.roll + (B.rot ?? 0), turn: H.yaw * 2, open: B.open ?? 0, smirk: B.smirk ?? 0 });
  if (P.bandage) {
    const bd = P.bandage, q = H.P((bd.az ?? -0.55) * fl, bd.el ?? 0.82);
    if (q.nz > 0.05) drawBandage(g, { x: q.x, y: q.y, size: bd.size ?? 78, rot: H.roll + (bd.rot ?? -0.55) * fl, sx: bd.sx ?? 1, sy: bd.sy ?? 1 });
  }
  // --- near headphones
  if (hp) {
    for (const sg of hp.segs) if (sg.front) drawBand(g, sg.pts, { w: HP.w ?? 16, ends: sg.ends, ribs: HP.nearRibs ?? false });
    for (const c of hp.cups) if (c.z >= -0.02) drawCupAt(c);
  }
  if (P.extra) P.extra(g, { H, eyes, beak: bq, wings, hp, toF });   // hook: draw props in owl units, on top
  PPU = prevPPU;
  if (P.tone !== false && dl > 0.3) { g.setTransform(1, 0, 0, 1, 0, 0); screentone(cv, { pitch: 4.2 * res }); }
  g.setTransform(1, 0, 0, 1, 0, 0);
  const anchors = {
    root: toF([0, 0]), head: toF([H.x, H.y]), beak: toF([bq.x, bq.y]), eyes: eyes.map((e) => toF([e.x, e.y])),
    wingTips: wings.map((w) => toF(w.T)), wrists: wings.map((w) => toF(w.Wr || w.S)), feet: (P.feet || []).map((f) => toF([f.x, f.y])),
    bbox: [x0, y0, x1, y1],
  };
  return { canvas: cv, x: x0, y: y0, w: x1 - x0, h: y1 - y0, anchors };
}

// Draw the owl into ctx (frame coordinates). Returns the anchors (frame px).
export function drawOwl(ctx, pose) {
  if (!SCR) SCR = document.createElement("canvas");
  const L = owlLayer({ canvas: SCR, ...pose });
  ctx.drawImage(L.canvas, L.x, L.y, L.w, L.h);
  return L.anchors;
}
// A preset by name merged with overrides: owlPose("front", { eyes: { state: "smug" } }).
export function owlPose(name, over = {}) { return mergePose(POSES[name] || POSES.sit3q, over); }

// ---------------------------------------------------------------- part painters used by owlLayer
function paintWing(g, w, plu, dl, flow) {
  if (w.type === "folded") {
    const W = w.g, path = blobPath(W.outline);
    plumage(g, path, { base: 0.96, shade: 0.8, depth: W.width * 0.5, blur: W.width * 0.15, ...plu });
    // a toned band just above the lower edge (the tucked secondaries), fading toward the shoulder
    softShade(g, path, (c) => { const q = W.P(0.62, W.width * 0.72); c.ellipse(q[0], q[1], W.L * 0.36, W.width * 0.3, Math.atan2(W.u[1], W.u[0]), 0, TAU); }, 0.66, 0.4, W.width * 0.22);
    if (dl > 0.25) rimHatch(g, W.outline, { light: plu.light, flow: W.u, len: W.width * 0.25, step: 3.5, w: 0.9, color: gv(0.3, 0.42), seed: 32, bend: 0.75, thr: 0.2 });
    if (dl > 0.35) {
      // fine barb strokes along the lower half of the wing, running toward the tip
      const rb = rng(34);
      g.save(); g.beginPath(); path(g); g.clip();
      for (let i = 0; i < 70; i++) {
        const t = 0.1 + rb() * 0.8, k = W.width * (0.1 + 0.8 * rb()) * W.low(t) - W.back * 0.2 * rb();
        flick(g, W.P(t, k), V.rot(W.u, 0.08 + (rb() - 0.5) * 0.1), W.L * (0.06 + 0.08 * rb()), 0.9, gv(0.35, 0.35), 0.05);
      }
      g.restore();
      // feather edges: long curves sweeping from the front of the wing toward the tip, stacked down the wing,
      // each ending in a small hook; the lowest ones darker (the primaries)
      const r = rng(33), N = 8;
      for (let i = 0; i < N; i++) {
        const f = i / (N - 1);
        const t0 = 0.1 + 0.28 * f + r() * 0.04, t1 = Math.min(0.97, t0 + 0.34 + 0.28 * f);
        const k0 = -W.back * (0.55 - 0.5 * f) + W.width * 0.45 * f, k1 = k0 * 0.6 + W.width * (0.25 + 0.35 * f) * W.low(t1);
        const a = W.P(t0, k0), m = W.P((t0 + t1) / 2, (k0 + k1) / 2 + W.width * 0.08), b = W.P(t1, k1);
        const hook = add(add(b, mul(W.u, -W.L * 0.025)), mul(W.n, W.width * 0.05));
        const dark = f > 0.7;
        ink(g, [a, m, b, hook], dark ? 2.0 : 1.5, dark ? gv(0.1, 0.9) : gv(0.22, 0.7), { end: 0.06, bias: 0.7 });
      }
    }
    // lower edge: heavy ink with a notch where the secondaries end; soft grey front edge
    const lowPts = []; for (let i = 0; i <= 12; i++) { const t = 0.16 + i * 0.07; lowPts.push(W.P(t, W.width * W.low(t) - 1.5)); }
    ink(g, lowPts, 3.2, LINE, { end: 0.1, bias: 0.6 });
    const n1 = W.P(0.55, W.width * W.low(0.55) - 2);
    ink(g, [add(n1, mul(W.u, -18)), add(add(n1, mul(W.u, 2)), mul(W.n, -3)), add(add(n1, mul(W.u, 12)), mul(W.n, -8))], 1.4, LINE, { end: 0.2 });
    const lo2 = []; for (let i = 0; i <= 6; i++) { const t = 0.6 + i * 0.065; lo2.push(W.P(t, W.width * W.low(t) - 8)); }
    ink(g, lo2, 1.6, LINE, { end: 0.1, bias: 0.7 });
    const fr = []; for (let i = 0; i <= 7; i++) { const t = -0.02 + i * 0.03; fr.push(W.P(t, W.width * W.low(t) * 0.97)); }
    ink(g, fr, 1.2, gv(0.4, 0.5), { end: 0.1 });
    return;
  }
  if (w.type === "arm") {
    // a wing bent like an arm (hands on hips / holding something): a feathered limb S -> Wr -> T, feather tips at T
    const len = w.len ?? 30;
    const pts = sampleCurve([w.S, w.Wr, w.T], 8);
    const outline = [];
    const nAt = (i) => perp(nrm(sub(pts[Math.min(pts.length - 1, i + 1)], pts[Math.max(0, i - 1)])));
    for (let i = 0; i < pts.length; i++) outline.push(add(pts[i], mul(nAt(i), len * (0.9 - 0.4 * i / pts.length))));
    for (let i = pts.length - 1; i >= 0; i--) outline.push(add(pts[i], mul(nAt(i), -len * (0.9 - 0.4 * i / pts.length))));
    const d = nrm(sub(w.T, w.Wr));
    for (let k = -1; k <= 1; k++) { const fs = featherShape(w.T, V.rot(d, k * 0.35), len * 0.9, len * 0.55); g.fillStyle = gv(0.9); g.beginPath(); smoothPath(g, fs, true); g.fill(); ink(g, fs.slice(1, 6), 1.1, LINE, { end: 0.2 }); }
    plumage(g, blobPath(outline), { base: 0.95, shade: 0.72, depth: len * 0.4, blur: len * 0.15, ...plu });
    rimHatch(g, outline, { light: plu.light, flow: d, len: len * 0.35, step: 3.5, w: 0.9, color: gv(0.3, 0.45), seed: 36 });
    ink(g, outline.slice(0, pts.length), 1.6, gv(0.2, 0.8), { end: 0.2 });
    return;
  }
  // spread wing: primaries and secondaries (back to front), then the covert band along the leading edge
  const W = w.g;
  const fs = W.feathers.map((f) => featherShape(f.root, f.dir, f.L, f.w));
  for (let i = fs.length - 1; i >= 0; i--) {
    const f = W.feathers[i], fp = blobPath(fs[i]);
    plumage(g, fp, { base: 0.95, shade: 0.74, depth: f.w * 0.35, blur: f.w * 0.15, ...plu });
    ink(g, fs[i].slice(1, 6), 1.2, LINE, { end: 0.25 });
    if (dl > 0.5) ink(g, [add(f.root, mul(f.dir, f.L * 0.15)), add(f.root, mul(f.dir, f.L * 0.8))], 0.7, gv(0.35, 0.5), { end: 0.1 });
  }
  const lead = W.lead, cw = (w.len ?? 70) * 0.5, band = [...lead];
  for (let i = lead.length - 1; i >= 0; i--) band.push(add(lead[i], mul(W.tr, cw * (1 - 0.55 * i / lead.length))));
  plumage(g, blobPath(band), { base: 0.96, shade: 0.76, depth: cw * 0.4, blur: cw * 0.15, ...plu });
  for (let i = 0; i < lead.length - 3; i += 3) {
    const p = add(lead[i], mul(W.tr, cw * (1 - 0.55 * i / lead.length))), q = add(lead[i + 3], mul(W.tr, cw * (1 - 0.55 * (i + 3) / lead.length)));
    ink(g, [p, add(V.mix(p, q, 0.5), mul(W.tr, cw * 0.18)), q], 1.0, gv(0.3, 0.65), { end: 0.2 });
  }
  ink(g, lead, 2.0, LINE, { end: 0.3 });
}

// Facial disc: soft feathery rims round each eye (brow above, cheek below) meeting in a V above the beak.
function paintDisc(g, H, eyes, bq, dl) {
  const col = gv(0.36, 0.6);
  const arc = (e, a0, a1, rx, ry, dy, dx = 0) => { const q = []; for (let i = 0; i <= 10; i++) { const a = a0 + (a1 - a0) * i / 10; q.push(add([e.x, e.y], V.rot([dx + Math.cos(a) * rx, dy + Math.sin(a) * ry], H.roll))); } return q; };
  for (const e of eyes) {
    if (e.nz < 0.2) continue;
    const R = e.r, sd = e.side;
    // brow: the upper rim of the disc over the eye, strokes combing down toward the eye
    const brow = sd < 0 ? arc(e, Math.PI * 1.02, Math.PI * 1.72, R * 1.6 * e.sx, R * 1.35, -R * 0.1) : arc(e, Math.PI * 1.3, Math.PI * 1.98, R * 1.6 * e.sx, R * 1.35, -R * 0.1);
    featherRow(g, brow, { step: 4, len: R * 0.42, w: 1.1, color: col, ang: sd < 0 ? 0.55 : Math.PI - 0.55, seed: 50 + sd, gap: 0.2 });
    // cheek: the lower rim of the disc
    const cheek = arc(e, Math.PI * 0.12, Math.PI * 0.88, R * 1.75 * e.sx, R * 1.5, R * 0.02);
    featherRow(g, cheek, { step: 4, len: R * 0.5, w: 1.2, color: col, ang: -0.55, seed: 60 + sd, gap: 0.15 });
    // a few fine lashes round the outer corner
    const oc = sd > 0 ? arc(e, -0.55, 0.35, R * 1.12 * e.sx, R * 1.08, 0) : arc(e, Math.PI - 0.35, Math.PI + 0.55, R * 1.12 * e.sx, R * 1.08, 0);
    featherRow(g, oc, { step: 5, len: R * 0.34, w: 0.9, color: gv(0.3, 0.5), ang: sd > 0 ? -0.9 : 0.9, seed: 70 + sd, gap: 0.3 });
    // the disc's outer rim, down the side of the face (seen on the far side of a turned head)
    if (e.nz > 0.85 && Math.abs(H.yaw) > 0.1) {
      const rim = arc(e, -1.25 * sd + (sd < 0 ? Math.PI : 0), 0.95 * sd + (sd < 0 ? Math.PI : 0), R * 2.35 * e.sx, R * 2.5, -R * 0.2, sd * R * 0.35);
      featherRow(g, rim, { step: 4, len: R * 0.5, w: 1.1, color: col, ang: sd > 0 ? 2.4 : -2.4, seed: 90 + sd, gap: 0.2 });
    }
  }
  // the V between the eyes, down to the top of the beak
  const mid = H.P(0, -0.1, 1.12);
  for (const e of eyes) {
    if (e.nz < 0.2) continue;
    const a = add([e.x, e.y], V.rot([-e.side * e.r * 0.35 * e.sx, -e.r * 1.55], H.roll));
    featherRow(g, [a, V.mix(a, [mid.x, mid.y], 0.5), [mid.x, mid.y]], { step: 3.5, len: e.r * 0.36, w: 1.0, color: col, ang: 0.35 * e.side + (e.side > 0 ? Math.PI : 0), seed: 80 + e.side, gap: 0.1 });
  }
}

// ---------------------------------------------------------------- engraving helpers
// Paint a soft-white plumage region into an engraving Plate (value + direction): the lit core is near white with
// flat tone (style 2) so it reads as a glowing bird, not hatched grey. angle = feather direction (radians).
export function plumagePlate(P, pathFn, { base = 0.97, shade = 0.74, angle = 1.3, light = [-0.55, -0.83], depth = 20, blur = 8, style = 2, spacing = 0.2 } = {}) {
  P.fill(pathFn, shade, angle, { style, spacing });
  const v = P.v;
  v.save(); v.beginPath(); pathFn(v); v.clip();
  v.filter = `blur(${blur}px)`; v.translate(light[0] * depth, light[1] * depth);
  v.fillStyle = gv(base); v.beginPath(); pathFn(v); v.fill();
  v.filter = "none"; v.restore();
}
// Drop a finished owl onto a Plate's overlay (P.o): it composites over the engraving untouched.
export function owlOnPlate(P, pose) { return drawOwl(P.o, pose); }

// ---------------------------------------------------------------- gallery (tools/owl-gallery.html)
// page 0: every preset pose; page 1: parts — eye states, look directions, beaks, headphone views, feet, a head-turn.
export function paintGallery(ctx, page = 0, W = 2206, H = 946) {
  ctx.save();
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  ctx.font = "500 18px 'Geist Mono', monospace"; ctx.fillStyle = "#8a8a8a";
  const label = (t, x, y) => { ctx.fillStyle = "#9a9a9a"; ctx.fillText(t, x, y); };
  if (page === 0) {
    const cells = [
      ["sit3q", {}, 0.62, "sit3q (s12 hero)"], ["glare", {}, 0.62, "glare"], ["sleep", {}, 0.62, "sleep (closed)"],
      ["sit3q", { flip: true }, 0.62, "sit3q flip:true"], ["front", {}, 0.8, "front"], ["frontStand", {}, 0.8, "frontStand"],
      ["hips", {}, 0.8, "hips (angry)"], ["smirk", {}, 0.8, "smirk (smug)"], ["startled", {}, 0.62, "startled"],
      ["fly", {}, 0.42, "fly"], ["flyDown", {}, 0.46, "flyDown"], ["angry", {}, 0.42, "angry (fly)"],
      ["walk", {}, 0.8, "walk"], ["carry", {}, 0.62, "carry"], ["front", { rot: 1.2 }, 0.6, "tumble (rot 1.2)"], ["front", {}, 0.28, "front s=0.28"],
    ];
    const cols = 8, rows = 2, cw = W / cols, ch = H / rows;
    cells.forEach(([name, over, s, text], i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const cx = c * cw + cw / 2, cy = r * ch + ch * 0.58;
      const pose = owlPose(name, over);
      drawOwl(ctx, { ...pose, x: cx + (name.startsWith("sit") || name === "glare" || name === "sleep" ? 45 * (over.flip ? -1 : 1) : 0), y: cy, s, flip: over.flip, rot: over.rot });
      label(text, c * cw + 12, r * ch + 26);
    });
  } else {
    // eye states
    const states = Object.keys(EYE_STATES);
    PPU = 1;
    states.forEach((st, i) => {
      const x = 90 + i * 115, y = 110;
      ctx.fillStyle = gv(0.95); ctx.beginPath(); ctx.arc(x, y, 50, 0, TAU); ctx.fill();
      drawEye(ctx, { x, y, r: 34, side: 1, state: st, look: [0, 0] });
      label(st, x - 45, 190);
    });
    // look directions
    [[-1, 0], [1, 0], [0, -1], [0, 1], [-0.7, -0.7], [0.7, 0.7]].forEach((lk, i) => {
      const x = 1180 + i * 120, y = 110;
      ctx.fillStyle = gv(0.95); ctx.beginPath(); ctx.arc(x, y, 50, 0, TAU); ctx.fill();
      drawEye(ctx, { x, y, r: 34, side: -1, state: "wide", look: lk });
      label(`[${lk}]`, x - 42, 190);
    });
    // beaks
    [[0, 0, "closed"], [0.5, 0, "open .5"], [1, 0, "open 1"], [0, 1, "smirk"], [0, 0, "turn -1", -1], [0, 0, "turn +1", 1]].forEach(([op, sm, t, turn = 0], i) => {
      const x = 90 + i * 115, y = 250;
      ctx.fillStyle = gv(0.95); ctx.fillRect(x - 50, y - 20, 100, 110);
      drawBeak(ctx, { x, y, w: 40, l: 54, open: op, smirk: sm, turn });
      label(t, x - 45, 380);
    });
    // bandage
    ctx.fillStyle = gv(0.95); ctx.fillRect(760, 230, 180, 150);
    drawBandage(ctx, { x: 850, y: 305, size: 120, rot: -0.5 });
    label("bandage", 800, 405);
    // headphone cups and band
    [[0.72, 1], [0.5, -1], [0.85, 1]].forEach(([open, side], i) => {
      drawCup(ctx, { x: 1060 + i * 150, y: 300, r: 60, open, side });
      label(`cup open ${open}`, 1000 + i * 150, 405);
    });
    drawBand(ctx, [[1520, 360], [1560, 250], [1660, 220], [1760, 250], [1800, 360]], { w: 22 });
    label("band", 1640, 405);
    // feet
    ["perch", "stand", "dangle"].forEach((m, i) => {
      drawFoot(ctx, { x: 1900 + i * 100, y: 250, size: 26, mode: m, leg: m === "stand" ? 30 : 0 });
      label(m, 1870 + i * 100, 405);
    });
    // head turns: yaw -0.6 .. 0.6 on the front pose (head only region), and pitch
    [-0.6, -0.3, 0, 0.3, 0.6].forEach((yaw, i) => {
      drawOwl(ctx, { ...owlPose("front", { head: { yaw }, headphones: { yaw } }), x: 150 + i * 300, y: 800, s: 0.95 });
      label(`yaw ${yaw}`, 90 + i * 300, 460);
    });
    [[-0.25, "pitch -0.25"], [0.25, "pitch +0.25"]].forEach(([pitch, t], i) => {
      drawOwl(ctx, { ...owlPose("front", { head: { pitch } }), x: 1700 + i * 300, y: 800, s: 0.95 });
      label(t, 1640 + i * 300, 460);
    });
  }
  ctx.restore();
}
