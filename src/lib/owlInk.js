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
//
// F4c added the source's front-view parts (glossy / tired / sly / scowl / pin / shut eyes, the heart facial disc,
// shield / grin beaks, spiky tufts, featherEdge silhouettes, sweat, slim band + edge-on cups, layered / raised /
// scalloped / feathered-arm wings, gripping talons, solid ink over the print mesh, merged head + body) and six presets
// fitted to source frames (perch, perchTired, flyFront, flyToward, startle3q, hipsSmug; FIT_PLACE). All F4c options
// are opt-in: the first-pass presets render exactly as before.
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
const bbox2 = (pts) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } return [x0, y0, x1, y1]; };

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
// point in polygon (even-odd)
export function inPoly(p, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c;
  }
  return c;
}
// the longest run of a closed outline's points lying outside `other` (a polygon), as an open polyline (F4c merge:
// the edges of the head / body that are not buried in the other mass)
export function outsideRun(outline, other) {
  const n = outline.length, out = outline.map((p) => !inPoly(p, other));
  if (out.every(Boolean)) return { pts: outline, closed: true };
  let best = [], cur = [];
  const start = out.indexOf(false);
  for (let k = 1; k <= n; k++) { const i = (start + k) % n; if (out[i]) cur.push(outline[i]); else { if (cur.length > best.length) best = cur; cur = []; } }
  if (cur.length > best.length) best = cur;
  return { pts: best, closed: false };
}

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

// A cluster of n near-parallel tapered strokes (the source's feather marks come in twos and threes). p = start,
// dir = unit direction, len/w in units, gap = spacing across, curve = bend (fraction of len), seed.
export function strokeGroup(g, p, dir, { n = 3, len = 20, w = 1, gap = 3, color = gv(0.35, 0.8), curve = 0.08, seed = 1, jit = 0.25 } = {}) {
  const r = rng(seed), nn = perp(dir);
  for (let i = 0; i < n; i++) {
    const o = (i - (n - 1) / 2) * gap * (0.8 + 0.4 * r());
    const q = add(add(p, mul(nn, o)), mul(dir, len * 0.15 * (r() - 0.3)));
    const d = V.rot(dir, (r() - 0.5) * jit * 0.4);
    flick(g, q, d, len * (0.65 + 0.5 * r()), w * (0.7 + 0.5 * r()), color, curve * (0.6 + 0.8 * r()));
  }
}
// Scattered stroke groups inside a clip, following a flow field. box [x0,y0,x1,y1]; dir(p, r) -> unit vector;
// keep(p, r) -> false to skip; density = groups per 1000 unit^2.
export function plumageStrokes(g, clipPath, box, dir, o = {}) {
  const { density = 0.5, len = [10, 26], w = [0.7, 1.2], color = gv(0.38, 0.75), n = [2, 3], gap = 3, seed = 71, keep = null, curve = 0.1 } = o;
  const r = rng(seed), A = (box[2] - box[0]) * (box[3] - box[1]), N = Math.round((A / 1000) * density);
  g.save(); if (clipPath) { g.beginPath(); clipPath(g); g.clip(); }
  for (let i = 0; i < N; i++) {
    const p = [box[0] + r() * (box[2] - box[0]), box[1] + r() * (box[3] - box[1])];
    if (keep && !keep(p, r)) continue;
    const L = len[0] + r() * (len[1] - len[0]);
    strokeGroup(g, p, dir(p, r), { n: n[0] + Math.floor(r() * (n[1] - n[0] + 1)), len: L, w: w[0] + r() * (w[1] - w[0]), gap, color, curve, seed: 1000 + i * 7 + seed });
  }
  g.restore();
}
// Long thin strokes running ALONG an outline on its shadow side (the source's feathered back edges): each starts
// just inside the edge (up to `depth` units in) and follows the tangent for `len` units. from/to limit the run.
export function contourStrokes(g, outline, o = {}) {
  const { light = [-0.55, -0.83], thr = 0.0, step = 5, depth = 10, len = 30, w = 0.9, color = gv(0.3, 0.75), seed = 29, closed = true, from = 0, to = 1, density = 1, inwardBias = 0.06 } = o;
  const poly = sampleCurve(outline, 6, closed);
  const cw = area(poly) > 0;
  walk(poly, step, seed, (p, t, u, r) => {
    const n = inward(t, cw), facing = n[0] * light[0] + n[1] * light[1];
    const k = (facing - thr) / (1 - thr);
    if (k <= 0 || r() > density * (0.3 + 0.7 * k)) return;
    const dir = nrm(add(t, mul(n, inwardBias + r() * 0.06)));
    flick(g, add(p, mul(n, 1 + r() * depth * (0.4 + 0.6 * k))), r() < 0.5 ? dir : mul(dir, 1), len * (0.5 + 0.8 * r()) * (0.5 + 0.5 * k), w * (0.6 + 0.7 * r()), color, (r() - 0.5) * 0.08);
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
// Values above `white` stay clean; ink (dark) is left alone. grain > 0 (e.g. 8/255) also adds the source's seeded
// paper mottle (2 px speckle + 5 px blotches, skewed bright) to the lit plumage; cross < 1 weakens the second mesh
// family. The defaults (grain 0, cross 1) reproduce the original mesh exactly.
let GRAIN = null;
export function grainTile() {
  if (GRAIN) return GRAIN;
  const N = 128, r = rng(907), a = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) a[i] = r() - 0.5;
  const box = (src, rad) => { const o = new Float32Array(N * N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { let t = 0, c = 0; for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) { t += src[((y + dy + N) % N) * N + ((x + dx + N) % N)]; c++; } o[y * N + x] = t / c; } return o; };
  const norm = (b) => { let v = 0; for (let i = 0; i < N * N; i++) v += b[i] * b[i]; v = Math.sqrt(v / (N * N)) || 1; for (let i = 0; i < N * N; i++) b[i] /= v; return b; };
  const fine = norm(box(a, 1)), blob = norm(box(box(a, 2), 2)), out = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) out[i] = 0.62 * fine[i] + 0.78 * Math.max(-0.6, blob[i]);
  return (GRAIN = norm(out));
}
export function screentone(canvas, { pitch = 4.2, amp = 0.2, white = 0.93, range = 0.3, x = 0, y = 0, w = canvas.width, h = canvas.height, grain = 0, cross = 1, keepInk = 0, floor = 0.22 } = {}) {
  const g = canvas.getContext("2d");
  w = Math.min(w, canvas.width - x); h = Math.min(h, canvas.height - y);
  if (w <= 0 || h <= 0) return;
  const img = g.getImageData(x, y, w, h), d = img.data;
  const k = 1 / (pitch * Math.SQRT2), G = grain ? grainTile() : null;
  // keepInk > 0 (F4c): pixels darker than their 7x7 neighbourhood mean by more than keepInk are ink (strokes, lines)
  // and stay solid; the mesh then only cuts the smooth tone, as in the source's print
  let S = null;
  if (keepInk > 0) {
    S = new Float64Array((w + 1) * (h + 1));
    for (let j = 0; j < h; j++) { let row = 0; for (let i = 0; i < w; i++) { row += d[(j * w + i) * 4]; S[(j + 1) * (w + 1) + i + 1] = S[j * (w + 1) + i + 1] + row; } }
  }
  const mean = (i, j) => { const a = Math.max(0, i - 3), b = Math.max(0, j - 3), c = Math.min(w, i + 4), e = Math.min(h, j + 4); return (S[e * (w + 1) + c] - S[b * (w + 1) + c] - S[e * (w + 1) + a] + S[b * (w + 1) + a]) / ((c - a) * (e - b) * 255); };
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const o = (j * w + i) * 4;
      if (d[o + 3] < 8) continue;
      const L = d[o] / 255;
      if (S && mean(i, j) - L > keepInk) continue;
      const X = i + x, Y = j + y;
      const gr = grain && L > 0.8 ? grain * G[(Y & 127) * 128 + (X & 127)] * Math.min(1, (L - 0.8) / 0.12) : 0;
      if (L > white || L < floor) { if (gr) d[o] = d[o + 1] = d[o + 2] = Math.max(0, Math.min(255, (L + gr) * 255)); continue; }
      const t = Math.min(1, (white - L) / range) * Math.min(1, (L - floor) / 0.2);
      const fa = Math.abs(((X + Y) * k) % 1 - 0.5) * 2, fb = Math.abs(((X - Y + 8192) * k) % 1 - 0.5) * 2;
      const m = Math.max(cross * (1 - Math.min(1, fa * 2.6)), 1 - Math.min(1, fb * 2.6));
      const v = Math.max(0, Math.min(255, (L + gr - amp * t * (m - 0.3)) * 255));
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
  if (t.spikes) return spikyTuft(H, t);
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

// F4c: a spiky ear tuft (the shoulder owl's right tuft, 19–29 s: three or four points curving up and out). spikes =
// count, fan = spread of the points (radians), size = longest point, curl bends the points toward the outer flank.
// Returns the same fields as tuftShape (tip = the longest point, tip2 = the outermost).
function spikyTuft(H, t) {
  const { at = 0.8, size = 34, width = 0.34, lean = 0, spikes = 3, fan = 0.8, curl = 0.25, seed = 7 } = t;
  const side = Math.sign(at) || 1, r = rng(seed);
  const A = H.at(at - width / 2), B = H.at(at + width / 2), M = H.at(at);
  const inner = side > 0 ? A : B, outer = side > 0 ? B : A;
  const pts = [sub(inner.p, mul(inner.n, 8))];
  let tip = null, tip2 = null, best = -1;
  for (let k = 0; k < spikes; k++) {
    const f = spikes === 1 ? 0.5 : k / (spikes - 1);
    const base = V.mix(inner.p, outer.p, 0.15 + 0.7 * f);
    const dir = V.rot(M.n, lean + side * (f - 0.35) * fan);
    const L = size * (1 - 0.55 * Math.abs(f - 0.3)) * (0.85 + 0.3 * r());
    const tp = add(add(base, mul(dir, L)), mul(perp(dir), side * L * curl));
    const vb = V.mix(inner.p, outer.p, 0.15 + 0.7 * Math.min(1, f + 0.5 / Math.max(1, spikes - 1)));
    pts.push(add(V.mix(base, tp, 0.55), mul(perp(dir), -side * L * 0.08)), tp);
    if (k < spikes - 1) pts.push(add(vb, mul(nrm(add(M.n, dir)), L * (t.valley ?? 0.42))));
    if (L > best) { best = L; tip = tp; }
    tip2 = tp;
  }
  pts.push(sub(outer.p, mul(outer.n, 8)));
  return { pts, tip, tip2, dir: M.n, base: M.p, side, inner: inner.p, outer: outer.p, spiky: true };
}

// F4c feather-edge helper: a serrated copy of an outline (points, owl units): every `step` units a feather tip pushed
// `depth` units out (lean = tangential slant, + along the walk), only between from..to (fractions of the outline).
// Fill the result with straight segments (polyPathFn) for a spiky, fluffed silhouette (startled, ruffled, tumbling).
export function featherEdge(outline, { step = 14, depth = 7, lean = 0.4, from = 0, to = 1, seed = 11, closed = true, jit = 0.5, base = 0.55 } = {}) {
  const poly = sampleCurve(outline, 8, closed), cw = area(poly) > 0, out = [];
  const L = [0]; for (let i = 1; i < poly.length; i++) L.push(L[i - 1] + V.len(sub(poly[i], poly[i - 1])));
  const T = L[L.length - 1], r = rng(seed);
  // each tip is a little triangle of plumage: its base (base x depth wide) replaces that run of the outline
  let next = from * T + step * r(), skip = -1;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], d = L[i];
    if (d < skip) continue;
    out.push(p);
    if (d >= next && d <= to * T) {
      const t = nrm(sub(poly[Math.min(poly.length - 1, i + 1)], poly[Math.max(0, i - 1)])), o = mul(inward(t, cw), -1);
      const dd = depth * (0.6 + 0.8 * r()), bw = dd * base * (0.8 + 0.4 * r());
      out.push(add(add(p, mul(o, dd)), mul(t, bw + dd * lean * (0.6 + 0.8 * r()))));
      let j = i; while (j < poly.length - 1 && L[j] < d + bw * 2) j++;
      out.push(poly[j]); skip = L[j] + 1e-6;
      next = d + step * (1 - jit / 2 + jit * r());
    }
  }
  return out;
}
export const polyPathFn = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };

// F4c: a sweat drop (startled / worried, 36.0 and 44.8 s): pointed top at (x, y - size), round bottom, fine dark
// outline, pale fill, a highlight. rot tilts it.
export function drawSweat(g, { x, y, size = 16, rot = 0 } = {}) {
  g.save(); g.translate(x, y); g.rotate(rot);
  const s2 = size, pts = [[0, -s2], [s2 * 0.3, -s2 * 0.35], [s2 * 0.42, s2 * 0.12], [s2 * 0.24, s2 * 0.42], [0, s2 * 0.5], [-s2 * 0.24, s2 * 0.42], [-s2 * 0.42, s2 * 0.12], [-s2 * 0.3, -s2 * 0.35]];
  g.fillStyle = gv(0.95); g.beginPath(); smoothPath(g, pts, true); g.fill();
  g.strokeStyle = LINE; g.lineWidth = wmin(size * 0.09); g.lineJoin = "round"; g.beginPath(); smoothPath(g, pts, true); g.stroke();
  ink(g, [[-s2 * 0.18, -s2 * 0.1], [-s2 * 0.22, s2 * 0.12], [-s2 * 0.1, s2 * 0.3]], size * 0.08, gv(0.6, 0.8), { end: 0.2 });
  g.restore();
}

// F4c facial disc as the source's front views draw it (19–29 s): two fine grey lobes round the eyes meeting in a V
// notch above the beak (a heart), a few feather ticks along them. o: { w (line weight, units), v (value), ticks }.
export function discLine(g, H, eyes, o = {}) {
  const { w = 1.2, v = 0.5, ticks = 1, seed = 61 } = o;
  const vis = eyes.filter((e) => e.nz > 0.2);
  if (!vis.length) return;
  const mid = vis.length === 2 ? V.mix([vis[0].x, vis[0].y], [vis[1].x, vis[1].y], 0.5) : null;
  const r = rng(seed);
  for (const e of vis) {
    const R = e.r, sd = e.side, sx = e.sx;
    const toF = ([px, py]) => add([e.x, e.y], V.rot([sd * px * R * sx, py * R], H.roll));
    const lobe = [[0.05, -1.72], [1.0, -1.58], [1.72, -0.95], [1.95, 0.05], [1.72, 1.02], [1.05, 1.62], [0.15, 1.8], [-0.62, 1.55]].map(toF);
    const notch = mid ? add(mid, V.rot([0, -R * 1.05], H.roll)) : toF([-1.5, -1.2]);
    const q = [notch, V.mix(notch, lobe[0], 0.55), ...lobe];
    // the arch over the eye and down the outer side at full weight; the lower rim under the eye fades out
    ink(g, q.slice(0, 7), w, gv(v, 0.9), { end: 0.2, bias: 0.3 });
    ink(g, q.slice(5), w * 0.7, gv(v + 0.12, 0.55), { end: 0.1, bias: 0.3 });
    if (ticks) {
      const poly = sampleCurve(q, 6), cw = area(poly) > 0;
      walk(poly, R * 0.32, seed + sd, (p, t, u2, rr) => {
        if (u2 < 0.12 || rr() < 0.35) return;
        const n = mul(inward(t, cw), sd > 0 ? -1 : 1);
        flick(g, add(p, mul(n, -R * 0.03)), nrm(add(V.rot(n, sd * 0.6), mul(t, 0.3))), R * (0.18 + 0.2 * rr()), w * 0.8, gv(v + 0.05, 0.7), 0.1);
      });
    }
  }
  if (mid) { const a = add(mid, V.rot([0, -R0(vis) * 1.05], H.roll)); ink(g, [add(a, V.rot([0, -R0(vis) * 0.35], H.roll)), a], w * 0.8, gv(v + 0.08, 0.7), { end: 0.1 }); }
}
const R0 = (vis) => vis.reduce((a, e) => a + e.r, 0) / vis.length;

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
// Geometry for any pose wing. type "raised" (a wing flung up) and spread wings with style "layered" use the F4c
// layered wing below; "folded" / "arm" / plain "spread" as before.
export function wingGeom(w) {
  if (w.type === "folded") return foldedWing(w);
  if (w.type === "arm") return null;
  if (w.type === "raised" || w.style === "layered") return layeredWing(w);
  return spreadWing(w);
}
// F4c layered spread wing (the flying owl, 16–19 s, 44 s): rows of overlapping round-tipped feathers like the source —
// long primary "fingers" fanning off the hand (Wr -> T), shorter secondaries hanging off the arm (S -> Wr) toward
// `trail`, two rows of small coverts along the leading edge, a soft band over the roots. n primaries, m secondaries,
// len = primary length (units), spread 0..1 opens the fan, fw = feather width factor, cov = covert rows (0..2).
export function layeredWing(w) {
  const raised = w.type === "raised";
  const { S, Wr, T, trail = [0, 1], len = 70, spread = 1, n = 7, m = 6, fw = raised ? 0.62 : 1.3, cov = 2, seed = 17, bulge = 0.12, point = raised ? 0.8 : 0, secLen = 1 } = w;
  const r = rng(seed), tr = nrm(trail), hand = nrm(sub(T, Wr)), arm = nrm(sub(Wr, S));
  const pa = perp(arm), bu = mul(pa, -(Math.sign(pa[0] * tr[0] + pa[1] * tr[1]) || 1) * V.len(sub(Wr, S)) * bulge);   // bow away from the trail
  const lead = sampleCurve([S, add(V.mix(S, Wr, 0.5), bu), Wr, V.mix(Wr, T, 0.5), T], 8);
  const at = (u) => { const f = clamp(u) * (lead.length - 1), i = Math.min(lead.length - 2, Math.floor(f)); return V.mix(lead[i], lead[i + 1], f - i); };
  const ua = 0.5;                     // lead parameter of the wrist (S..Wr = 0..0.5, Wr..T = 0.5..1)
  const feathers = [];
  // secondaries: along the arm, hanging toward trail, body side first
  for (let i = 0; i < m; i++) {
    const f = (i + 0.5) / m, root = add(at(0.04 + f * (ua - 0.04)), mul(tr, len * 0.08));
    const dir = nrm(add(tr, mul(arm, -0.12 + 0.2 * f)));
    feathers.push({ row: "sec", root, dir, L: len * (0.7 + 0.06 * f) * secLen * (0.94 + 0.12 * r()), w: len * 0.33 * fw });
  }
  // primaries: off the hand, fanning from trail toward the hand direction, the tip-most on top
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n, root = add(at(ua + f * 0.46), mul(tr, len * 0.06 * (1 - f)));
    const dir = nrm(V.mix(tr, hand, clamp(0.08 + 0.92 * Math.pow(f, 0.85) * spread)));
    feathers.push({ row: "pri", root, dir, L: len * (0.95 + 0.3 * Math.sin(Math.PI * Math.min(1, f * 1.15))) * (0.94 + 0.12 * r()), w: len * 0.28 * fw });
  }
  // coverts: two rows of small round feathers along the leading edge, tip side first so the body side overlaps
  const rows = [];
  for (let k = 0; k < cov; k++) {
    const cnt = Math.round((m + n) * (k === 0 ? 0.85 : 0.7)), Lc = len * (k === 0 ? 0.42 : 0.26), off = len * (k === 0 ? 0.1 : 0.02);
    for (let i = cnt - 1; i >= 0; i--) {
      const u = 0.03 + (i + 0.5) / cnt * 0.82, p = at(u), dl = u < ua ? tr : nrm(V.mix(tr, hand, clamp((u - ua) / 0.5) * 0.8 * spread));
      rows.push({ row: k === 0 ? "gc" : "lc", root: add(p, mul(dl, off)), dir: dl, L: Lc * (0.9 + 0.2 * r()) * (u > 0.85 ? 0.7 : 1), w: Lc * 0.75 * fw });
    }
  }
  feathers.push(...rows);
  return { layered: true, lead, feathers, S, Wr, T, tr, len, at, point };
}
// paint the layered wing: every feather a soft white paddle with a fine grey edge round its tip; the leading-edge band
function paintLayered(g, w, plu, dl) {
  const W = w.g, len = W.len;
  for (const f of W.feathers) {
    const fs = featherShape(f.root, f.dir, f.L, f.w, W.point), fp = blobPath(fs);
    const base = f.row === "pri" ? 0.955 : f.row === "sec" ? 0.945 : 0.965, sh = f.row === "pri" ? 0.8 : 0.78;
    plumage(g, fp, { base, shade: sh, depth: f.w * 0.3, blur: f.w * 0.18, ...plu });
    // the edge: a soft grey line round the tip and down the sides (the source's feathers read as soft white paddles)
    ink(g, fs.slice(1, 6), Math.max(0.7, f.w * 0.03), gv(f.row === "lc" ? 0.6 : 0.52, 0.85), { end: 0.2, bias: 0.5 });
    if (dl > 0.8 && f.row === "pri") ink(g, [add(f.root, mul(f.dir, f.L * 0.2)), add(f.root, mul(f.dir, f.L * 0.7))], Math.max(0.5, f.w * 0.015), gv(0.6, 0.35), { end: 0.1 });
    if (W.point && dl > 0.4 && (f.row === "pri" || f.row === "sec")) {
      // the raised wing's engraved look: a dark keyline down one side of each long feather, fine barbs along it
      ink(g, [add(f.root, mul(perp(f.dir), f.w * 0.3)), add(add(f.root, mul(f.dir, f.L * 0.5)), mul(perp(f.dir), f.w * 0.36)), add(f.root, mul(f.dir, f.L * 0.97))], Math.max(0.8, f.w * 0.06), gv(0.2, 0.85), { end: 0.1, bias: 0.4 });
      const rr = rng(Math.round(f.root[0] * 7 + f.root[1] * 13));
      for (let k = 0; k < 4; k++) { const a = 0.2 + rr() * 0.6, p = add(add(f.root, mul(f.dir, f.L * a)), mul(perp(f.dir), f.w * (rr() - 0.5) * 0.4)); flick(g, p, nrm(add(f.dir, mul(perp(f.dir), 0.12))), f.L * (0.15 + 0.15 * rr()), Math.max(0.5, f.w * 0.025), gv(0.4, 0.5), 0.05); }
    }
  }
  // leading-edge band (the wrist and forearm), a darker keyline along the front
  const band = [...W.lead];
  for (let i = W.lead.length - 1; i >= 0; i--) band.push(add(W.lead[i], mul(W.tr, len * 0.16 * (1 - 0.6 * i / W.lead.length))));
  plumage(g, blobPath(band), { base: 0.97, shade: 0.84, depth: len * 0.08, blur: len * 0.05, ...plu });
  ink(g, W.lead, Math.max(0.9, len * 0.022), gv(0.42, 0.8), { end: 0.3, bias: 0.4 });
}
// F4c arm wing, style "feathered" (hands on hips, holding, V-sign; s20 / s25): a wing bent at the wrist like an arm —
// thick and soft at the shoulder, tapering to the wrist and hand, the outer edge broken into covert scallops, a fan of
// pointed primaries past the hand (fingers) toward `fingers` (unit vector, default: on along Wr -> T), fine grey
// outline. len = half-thickness at the shoulder (units), nf = finger count.
function paintArmV2(g, w, plu, dl) {
  const len = w.len ?? 30, nf = w.nf ?? 4;
  const pts = sampleCurve([w.S, w.Wr, w.T], 10), m = pts.length;
  const nAt = (i) => perp(nrm(sub(pts[Math.min(m - 1, i + 1)], pts[Math.max(0, i - 1)])));
  const hw = (i) => len * (1.0 - 0.62 * Math.pow(i / (m - 1), 0.8));
  const outline = [];
  for (let i = 0; i < m; i++) outline.push(add(pts[i], mul(nAt(i), hw(i))));
  for (let i = m - 1; i >= 0; i--) outline.push(add(pts[i], mul(nAt(i), -hw(i))));
  // fingers: pointed primaries fanning past the hand
  const d = nrm(w.fingers || sub(w.T, w.Wr)), fl = len * (w.fingerLen ?? 1.5);
  for (let k = 0; k < nf; k++) {
    const a = (k / Math.max(1, nf - 1) - 0.5) * 0.7, dir = V.rot(d, a), root = add(w.T, mul(perp(d), (k / Math.max(1, nf - 1) - 0.5) * len * 0.5));
    const fs = featherShape(add(root, mul(dir, -fl * 0.3)), dir, fl * (0.85 + 0.25 * Math.sin(Math.PI * k / Math.max(1, nf - 1))), len * 0.42, 0.8);
    plumage(g, blobPath(fs), { base: 0.95, shade: 0.8, depth: len * 0.12, blur: len * 0.08, ...plu });
    ink(g, fs.slice(1, 6), Math.max(0.7, len * 0.03), gv(0.3, 0.85), { end: 0.2 });
  }
  const path = blobPath(outline);
  plumage(g, path, { base: 0.96, shade: 0.78, depth: len * 0.35, blur: len * 0.15, ...plu });
  // covert scallops along the outer (+normal) side and a few feather lines
  if (dl > 0.3) {
    g.save(); g.beginPath(); path(g); g.clip();
    for (let k = 1; k < 5; k++) {
      const i = Math.floor((m - 1) * (0.12 + k * 0.17)), p = pts[i], n = nAt(i), t = nrm(sub(pts[Math.min(m - 1, i + 2)], p)), hh = hw(i);
      const q = [add(p, mul(n, hh * 0.9)), add(add(p, mul(n, hh * 0.35)), mul(t, hh * 0.35)), add(p, mul(n, -hh * 0.2))];
      ink(g, q, Math.max(0.7, len * 0.03), gv(0.4, 0.8), { end: 0.2 });
    }
    g.restore();
  }
  ink(g, outline.slice(0, m), Math.max(0.9, len * 0.05), gv(0.2, 0.9), { end: 0.2, bias: 0.6 });
  ink(g, outline.slice(m), Math.max(0.7, len * 0.03), gv(0.35, 0.8), { end: 0.2 });
}

// F4c folded wing, style "scallop" (the front-view shoulder owl, 19–29 s): a teardrop of plumage hanging from the
// shoulder, two or three rows of round covert tips (scallops) across it, long primaries converging on the tip, a finer
// grey outline heavier on the outer edge. Uses the folded wing's S, T, width, back, dir; rows = number of scallop rows.
function paintScallop(g, w, plu, dl) {
  const W = w.g, path = blobPath(W.outline), rows = w.rows ?? 3;
  plumage(g, path, { base: 0.955, shade: 0.8, depth: W.width * 0.4, blur: W.width * 0.15, ...plu });
  const Q = (t, v) => W.P(t, lerp(W.width * W.low(clamp(t)), -W.back * W.high(clamp(t)), v));
  g.save(); g.beginPath(); path(g); g.clip();
  for (let k = 0; k < rows; k++) {
    const t = 0.3 + k * 0.17, nk = 3 - (k > 1 ? 1 : 0);
    for (let j = 0; j < nk; j++) {
      const v0 = (j + 0.08) / nk, v1 = (j + 0.92) / nk;
      const q = []; for (let i = 0; i <= 10; i++) { const a = i / 10, v = lerp(v0, v1, a); q.push(Q(t + 0.07 * Math.sin(Math.PI * a), v)); }
      ink(g, q, Math.max(0.8, W.width * 0.03), gv(0.36, 0.85), { end: 0.15 });
    }
  }
  const t0 = 0.3 + rows * 0.17;
  for (let j = 0; j < 3; j++) { const v = 0.2 + j * 0.3; ink(g, [Q(t0 - 0.02, v), Q((t0 + 1) / 2, v * 0.8 + 0.1), Q(0.99, 0.45)], Math.max(0.8, W.width * 0.03), gv(0.33, 0.85), { end: 0.1, bias: 0.3 }); }
  g.restore();
  // outline: a fine grey line all round, heavier along the outer (back) edge
  const top = []; for (let i = 0; i <= 16; i++) top.push(Q(i / 16, 1));
  const low = []; for (let i = 0; i <= 16; i++) low.push(Q(i / 16, 0));
  ink(g, top, Math.max(1, W.width * 0.05), gv(0.2, 0.9), { end: 0.2, bias: 0.6 });
  ink(g, low, Math.max(0.8, W.width * 0.03), gv(0.35, 0.8), { end: 0.2, bias: 0.6 });
}
// Outline of one rounded feather (a paddle) from root along dir.
export function featherShape(root, dir, L, w, point = 0) {
  if (point) {   // F4c: a lanceolate feather, widest a third of the way out, tapering to a point (point 0..1 = sharpness)
    const n = perp(dir), e = add(root, mul(dir, L)), k = 1 - 0.5 * point;
    return [add(root, mul(n, -w * 0.35)), add(add(root, mul(dir, L * 0.35)), mul(n, -w * 0.5)), add(add(root, mul(dir, L * 0.75)), mul(n, -w * 0.34 * k)), add(e, mul(n, -w * 0.06)), add(add(root, mul(dir, L * 0.75)), mul(n, w * 0.34 * k)), add(add(root, mul(dir, L * 0.35)), mul(n, w * 0.5)), add(root, mul(n, w * 0.35))];
  }
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
  // F4c — the source's front-view faces (21.0 / 27.5 / 36.0 / 105 s). Drawn by their own painters (see drawEye):
  // glossy: round dark iris filling the eye inside a thin white rim and a fine dark ring, lighter low in the iris, a big
  //         round catchlight upper-left and a small one lower-right (the shoulder owl, 19–29 s)
  // tired:  glossy under a heavy straight upper lid that droops toward the outer corner (26.7–29 s)
  // sly:    almond opening, heavy upper lid, thin lower lid, partial glossy iris looking sideways, heavy brow (s20, s25)
  // scowl:  sly narrowed, brow slanted hard down to the beak (angry, scissors)
  // pin:    startled wide white eye in a heavy ring, a dot pupil inside a fine iris ring (s13, s16)
  // shut:   closed as a soft downward arc with a lash tick (the flying / sleeping owl, 16–19 s, 117–136 s)
  glossy: { glossy: true, iris: 0.76, lid: 0, droop: 0 },
  tired: { glossy: true, iris: 0.76, lid: 0.43, droop: 0.2 },
  sly: { almond: true, top: 0.44, bot: 0.3, iris: 0.5, tilt: 0.14, brow: 1.1, browSlant: 0.6, lookX: 0.55 },
  scowl: { almond: true, top: 0.34, bot: 0.32, iris: 0.46, tilt: 0.32, brow: 1.2, browSlant: 0.75, lookX: 0.1 },
  pin: { pin: true, pupil: 0.075, ringW: 0.1 },
  shut: { shut: true },
};

// e: { x, y, r (eye radius, units), sx (foreshortening across the face), rot (head roll), side (-1 = viewer-left eye,
//      +1 = right), state, look [lx,ly] (-1..1), pupil/lid/slant/curve/brow/low overrides, plumage (lid value) }
export function drawEye(g, e) {
  const st = { ...EYE_STATES[e.state || "stare"] };
  for (const k of ["lid", "pupil", "slant", "curve", "brow", "low", "lidW", "ext", "peak"]) if (e[k] !== undefined) st[k] = e[k];
  if (st.glossy || st.almond || st.pin || st.shut) {
    for (const k of ["iris", "droop", "top", "bot", "tilt", "browSlant", "lookX", "ringW", "catch"]) if (e[k] !== undefined) st[k] = e[k];
    return drawEyeV2(g, e, st);
  }
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
  // look moves the pupil by up to (1 - pupil) eye radii; lookGain > 1 lets it slide further (clipped by the opening)
  const lg = e.lookGain ?? 1, px = look[0] * (1 - pr) * 0.95 * lg, py = look[1] * (1 - pr) * 0.95 * lg;
  g.save(); g.beginPath(); opening(g); g.clip();
  g.fillStyle = "#060606"; g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
  // hood 0..1: the black runs on up under the inner half of the lid (the hero's hooded stare), leaving the white
  // crescent only under the outer half of the lid
  const hood = e.hood ?? st.hood ?? 0;
  if (hood > 0) { g.beginPath(); g.ellipse(px - side * 0.1 * hood, py - 0.3 * hood, pr * (0.95 + 0.05 * hood), pr * (0.92 + 0.12 * hood), 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(px - side * pr, py); g.lineTo(-side * 1.05, -1.2); g.lineTo(side * 0.2 * (1 - hood), -1.25); g.lineTo(px + side * pr * 0.2, py - pr * 0.6); g.closePath(); g.fill(); }
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

// The F4c eye painters (glossy / tired / sly / scowl / pin / shut), in eye-radius units like drawEye. Options besides
// drawEye's: iris (radius, eye radii), droop (tired lid lowering toward the outer corner), top/bot (almond opening
// half-heights), tilt (almond slant: + lowers the inner corner), browSlant, lookX (default sideways look of the almond
// iris, toward the outer corner when +), ringW (pin ring weight), catch (false = no catchlights), plumage (lid value).
function drawEyeV2(g, e, st) {
  const r = e.r, side = e.side || 1, sx = e.sx ?? 1, outer = side > 0 ? 1 : -1;
  const PPU0 = PPU; PPU = PPU0 * r;
  const u = (w) => wmin(w / r);          // owl units -> eye units
  const ew = (w) => Math.max(w, MINW / PPU);   // eye units, with the hairline minimum
  const look = e.look || [0, 0], lg = e.lookGain ?? 1, pl = e.plumage ?? 0.955;
  const circ = (c, x, y, rr) => { c.moveTo(x + rr, y); c.arc(x, y, rr, 0, TAU); };
  g.save();
  g.translate(e.x, e.y); g.rotate(e.rot || 0); g.scale(sx * r, r);
  g.lineCap = "round"; g.lineJoin = "round";
  const iris = (x, y, ir, clip) => {
    // dark glossy iris: near-black at the top, lifting to a mid grey crescent low down, a crisp edge, catchlights
    g.save(); if (clip) { g.beginPath(); clip(g); g.clip(); }
    const gr = g.createLinearGradient(0, y - ir, 0, y + ir);
    gr.addColorStop(0, gv(0.1)); gr.addColorStop(0.45, gv(0.16)); gr.addColorStop(0.8, gv(0.28)); gr.addColorStop(1, gv(0.42));
    g.fillStyle = gr; g.beginPath(); circ(g, x, y, ir); g.fill();
    g.filter = `blur(${Math.max(0.3, ir * 0.12 * PPU).toFixed(2)}px)`;
    g.fillStyle = gv(0.42, 0.45); g.beginPath(); g.ellipse(x + 0.12 * ir * outer, y + ir * 0.62, ir * 0.62, ir * 0.26, 0, 0, TAU); g.fill();
    g.filter = "none";
    g.strokeStyle = gv(0.03); g.lineWidth = ew(0.035); g.beginPath(); circ(g, x, y, ir); g.stroke();
    if (st.catch !== false) {
      g.fillStyle = gv(0.99); g.beginPath(); circ(g, x - 0.34 * ir, y - 0.36 * ir, 0.27 * ir); g.fill();
      g.beginPath(); circ(g, x + 0.4 * ir, y + 0.42 * ir, 0.1 * ir); g.fill();
    }
    g.restore();
  };
  if (st.shut) {
    // a soft downward arc (lid line) heavier in the middle, a small lash tick at the outer end, faint lid contour above
    const q = []; for (let i = 0; i <= 16; i++) { const t = -0.95 + 1.9 * i / 16; q.push([t * outer, 0.05 + 0.28 * (1 - t * t)]); }
    ink(g, q, ew(0.13), LINE, { end: 0.15, bias: 0.5 });
    ink(g, [[0.93 * outer, 0.07], [1.08 * outer, -0.08]], ew(0.05), LINE, { end: 0.1 });
    g.globalAlpha = 0.35; ink(g, [[-0.8, -0.3], [0, -0.62], [0.8, -0.3]], ew(0.045), gv(0.4)); g.globalAlpha = 1;
  } else if (st.pin) {
    // startled: big white eye, heavy ring (fuller low down), a dot pupil in a fine ring
    g.fillStyle = gv(0.985); g.beginPath(); circ(g, 0, 0, 1); g.fill();
    const lx = look[0] * 0.35 * lg, ly = look[1] * 0.35 * lg, pp = st.pupil ?? 0.075;
    g.fillStyle = gv(0.04); g.beginPath(); circ(g, lx, ly, pp); g.fill();
    g.strokeStyle = gv(0.1); g.lineWidth = ew(0.028); g.beginPath(); circ(g, lx, ly, pp * 2.7); g.stroke();
    const ringPts = []; for (let i = 0; i <= 48; i++) { const a = (i / 48) * TAU; ringPts.push([Math.cos(a), Math.sin(a)]); }
    const rw = st.ringW ?? 0.1;
    taper(g, ringPts, (t) => ew(rw * (0.75 + 0.45 * Math.max(0, Math.sin(t * TAU)))), LINE);
  } else if (st.glossy) {
    // round eye: white rim, iris, fine dark ring; optional heavy upper lid (tired)
    const ir = st.iris ?? 0.8, px = look[0] * (1 - ir) * 0.95 * lg, py = look[1] * (1 - ir) * 0.95 * lg;
    g.fillStyle = gv(0.975); g.beginPath(); circ(g, 0, 0, 1); g.fill();
    iris(px, py, ir, (c) => circ(c, 0, 0, 0.985));
    const lid = st.lid ?? 0, droop = st.droop ?? 0;
    const ly = (x) => -1 + 2 * lid + droop * (x * outer + 1) * 0.5 - 0.06 * (1 - x * x);
    if (lid > 0.02) {
      g.save(); g.beginPath(); circ(g, 0, 0, 1.02); g.clip();
      g.fillStyle = gv(pl); g.beginPath(); g.moveTo(-1.1, -1.2); for (let i = 0; i <= 20; i++) { const x = -1.1 + 2.2 * i / 20; g.lineTo(x, ly(x)); } g.lineTo(1.1, -1.2); g.closePath(); g.fill();
      g.restore();
    }
    // the fine ring, a little heavier along the top; under a lid only the part below the lid shows
    const rp = []; for (let i = 0; i <= 56; i++) { const a = (i / 56) * TAU; rp.push([Math.cos(a), Math.sin(a)]); }
    g.save(); if (lid > 0.02) { g.beginPath(); g.moveTo(-1.3, 1.3); for (let i = 0; i <= 20; i++) { const x = -1.3 + 2.6 * i / 20; g.lineTo(x, ly(Math.max(-1, Math.min(1, x)))); } g.lineTo(1.3, 1.3); g.closePath(); g.clip(); }
    taper(g, rp, (t) => ew(0.04 + 0.035 * Math.max(0, -Math.sin(t * TAU))), gv(0.13));
    g.restore();
    if (lid > 0.02) {
      const q = []; for (let i = 0; i <= 18; i++) { const x = (-1.02 + 2.16 * i / 18) * outer; q.push([x, ly(x)]); }
      const seq = q;   // inner -> outer
      ink(g, seq, ew(0.15), gv(0.05), { end: 0.2, bias: 0.62 });
      g.globalAlpha = 0.45; ink(g, seq.map(([x, y]) => [x * 0.9, y - 0.22 - 0.05 * (1 - x * x)]), ew(0.04), gv(0.35), { end: 0.1 }); g.globalAlpha = 1;
    }
    // accent at the outer-lower corner
    ink(g, [[0.93 * outer, 0.3], [1.02 * outer, 0.4], [1.08 * outer, 0.5]], ew(0.06), gv(0.1), { end: 0.1 });
  } else {
    // almond (sly / scowl)
    const T = st.top ?? 0.44, Bt = st.bot ?? 0.3, tl = st.tilt ?? 0.14, inn = -outer;
    const top = (x) => -T * Math.pow(Math.max(0, 1 - x * x), 0.55) + tl * (x * inn + 1) * 0.5;
    const bot = (x) => Bt * Math.pow(Math.max(0, 1 - x * x), 0.75) + tl * 0.35 * (x * inn + 1) * 0.5;
    const open = (c) => { c.moveTo(-1, top(-1)); for (let i = 1; i <= 24; i++) { const x = -1 + 2 * i / 24; c.lineTo(x, top(x)); } for (let i = 24; i >= 0; i--) { const x = -1 + 2 * i / 24; c.lineTo(x, bot(x)); } c.closePath(); };
    g.fillStyle = gv(0.975); g.beginPath(); open(g); g.fill();
    const ir = st.iris ?? 0.5, lx = ((look[0] || 0) * 0.45 * lg + (st.lookX ?? 0.5) * 0.35 * outer), lyy = (look[1] || 0) * 0.15 + (top(lx) + bot(lx)) * 0.5 + ir * 0.12;
    iris(lx, lyy, ir, open);
    const tq = []; for (let i = 0; i <= 20; i++) { const x = (-1.02 + 2.14 * i / 20) * outer; tq.push([x, top(Math.max(-1, Math.min(1, x))) - (Math.abs(x) > 1 ? (Math.abs(x) - 1) * 0.6 : 0)]); }
    ink(g, tq, ew(0.12), gv(0.04), { end: 0.25, bias: 0.55 });   // inner -> outer, past the outer corner
    const bq = []; for (let i = 0; i <= 14; i++) { const x = -0.9 + 1.8 * i / 14; bq.push([x, bot(x) + 0.02]); }
    ink(g, bq, ew(0.045), gv(0.15), { end: 0.1 });
    if (st.brow) {
      // heavy brow above, slanting down toward the inner (beak) side, heavier at the inner end
      const b = st.brow, s2 = st.browSlant ?? 0.4, y0 = -T - 0.42;
      const bw = [[1.15 * outer, y0 - 0.1], [0.3 * outer, y0 - 0.12 + s2 * 0.3], [-0.55 * outer, y0 + s2 * 0.7], [-0.95 * outer, y0 + s2 * 0.95]];
      ink(g, bw, ew(0.17 * b), gv(0.04), { end: 0.18, bias: 0.72, pow: 0.45 });
    }
  }
  g.restore();
  PPU = PPU0;
}

// ---------------------------------------------------------------- beak
// b: { x, y (top centre), w, l, rot (axis tilt), turn (-1..1: which cheek shows), open (0..1), smirk (0..1) }
export function drawBeak(g, b) {
  if (b.style === "shield" || b.style === "grin") return drawBeakV2(g, b);
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

// F4c beaks. style "shield": the front-view beak of the shoulder / flying owl (19–29 s): a small pale rounded
// triangle pointing down, a fine dark outline, the far side a little darker, two nostril ticks; open 0..1 parts it
// (a dark gape and a lower mandible). style "grin": the smirk (s20 / s25): a hooked upper beak whose sharp tip curls
// down and toward -side, the mouth line sweeping up to +side into a grin over a pale lower mandible (side = sign of
// smirk, default +1; open widens the grin). turn -1..1 shows one cheek (shifts the ridge).
function drawBeakV2(g, b) {
  const { x, y, w = 28, l = 30, rot = 0, turn = 0, open = 0, smirk = 1 } = b;
  const k = clamp(turn, -1, 1), sd = smirk < 0 ? -1 : 1;
  g.save(); g.translate(x, y); g.rotate(rot);
  g.lineCap = "round"; g.lineJoin = "round";
  if (b.style === "shield") {
    const tip = [k * w * 0.08, l];
    const sh = [[-w * 0.5, 0.02 * l], [-w * 0.22, -0.05 * l], [w * 0.22, -0.05 * l], [w * 0.5, 0.02 * l], [w * 0.36, 0.42 * l], [w * 0.12, 0.84 * l], tip, [-w * 0.12, 0.84 * l], [-w * 0.36, 0.42 * l]];
    if (open > 0.02) {
      const o = open;
      g.fillStyle = gv(0.12); g.beginPath(); smoothPath(g, [[-w * 0.3, 0.5 * l], [w * 0.3, 0.5 * l], [w * 0.1, l * (1 + 0.5 * o)], [-w * 0.1, l * (1 + 0.5 * o)]], true); g.fill();
      const lo = [[-w * 0.26, 0.62 * l], [w * 0.26, 0.62 * l], [w * 0.08, l * (0.95 + 0.55 * o)], [-w * 0.08, l * (0.95 + 0.55 * o)]];
      g.fillStyle = gv(0.8); g.beginPath(); smoothPath(g, lo, true); g.fill();
      ink(g, [lo[1], lo[2], lo[3], lo[0]], w * 0.05, LINE, { end: 0.4 });
    }
    const path = blobPath(sh);
    g.save(); g.beginPath(); path(g); g.clip();
    const gr = g.createLinearGradient(-w * 0.5, 0, w * 0.5, l * 0.6);
    gr.addColorStop(0, gv(0.93)); gr.addColorStop(0.55, gv(0.88)); gr.addColorStop(1, gv(0.72));
    g.fillStyle = gr; g.fillRect(-w, -l, 2 * w, 3 * l);
    g.restore();
    ink(g, [sh[0], sh[8], sh[7], tip, sh[5], sh[4], sh[3]], w * 0.065, LINE, { end: 0.35, bias: 0.55 });
    ink(g, [sh[0], sh[1], sh[2], sh[3]], w * 0.03, gv(0.35, 0.7), { end: 0.3 });
    ink(g, [[k * w * 0.1, 0.1 * l], [k * w * 0.1, 0.5 * l], tip], w * 0.025, gv(0.5, 0.35), { end: 0.1 });
    g.fillStyle = gv(0.25);
    for (const sx of [-1, 1]) { g.beginPath(); g.ellipse(sx * w * 0.16 + k * w * 0.05, 0.16 * l, w * 0.035, w * 0.022, sx * 0.4, 0, TAU); g.fill(); }
    g.restore();
    return;
  }
  // grin: upper beak (hook) + grin mouth + lower mandible
  const o = open;
  const hookTip = [-sd * w * 0.12, l * 1.02];
  const up = [[-w * 0.5, 0], [-w * 0.2, -0.08 * l], [w * 0.25, -0.06 * l], [w * 0.5, 0.05 * l], [sd * w * 0.52, 0.42 * l], [sd * w * 0.18, 0.62 * l], hookTip, [-sd * w * 0.3, 0.72 * l], [-sd * w * 0.48, 0.36 * l]];
  const mouth = [[-sd * w * 0.05, 0.66 * l], [sd * w * 0.35, 0.66 * l - 0.04 * l], [sd * w * 0.75, 0.5 * l], [sd * w * 1.0, 0.3 * l - o * 0.05 * l], [sd * w * 1.08, 0.2 * l]];
  const low = [[-sd * w * 0.02, 0.7 * l], [sd * w * 0.4, 0.74 * l], [sd * w * 0.8, 0.58 * l], [sd * w * 1.0, 0.36 * l], [sd * w * 0.9, 0.62 * l + o * 0.1 * l], [sd * w * 0.5, 0.86 * l + o * 0.2 * l], [sd * w * 0.08, 0.86 * l + o * 0.12 * l]];
  if (o > 0.02) { g.fillStyle = gv(0.12); g.beginPath(); smoothPath(g, [...mouth.slice(0, 4), ...low.slice(3, 6).reverse().slice(0, 2)], true); g.fill(); }
  g.fillStyle = gv(0.84); g.beginPath(); smoothPath(g, low, true); g.fill();
  ink(g, low.slice(3), w * 0.05, LINE, { end: 0.3 });
  const path = blobPath(up);
  g.save(); g.beginPath(); path(g); g.clip();
  const gr = g.createLinearGradient(-sd * w * 0.4, 0, sd * w * 0.4, l);
  gr.addColorStop(0, gv(0.93)); gr.addColorStop(1, gv(0.72));
  g.fillStyle = gr; g.fillRect(-w, -l, 2 * w, 3 * l);
  g.restore();
  ink(g, [up[0], up[8], up[7], hookTip, up[5], up[4], up[3]], w * 0.07, LINE, { end: 0.3, bias: 0.4 });
  ink(g, mouth, w * 0.07, LINE, { end: 0.25, bias: 0.4 });
  ink(g, [up[0], up[1], up[2], up[3]], w * 0.03, gv(0.35, 0.7), { end: 0.3 });
  g.fillStyle = gv(0.2); g.beginPath(); g.ellipse(-sd * w * 0.08 + k * w * 0.05, 0.2 * l, w * 0.04, w * 0.03, 0, 0, TAU); g.fill();
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
// F4c: a cup seen edge-on from the front (the shoulder owl, 19–29 s): the dark leather cushion on the head side with
// pale pleat highlights, the metal shell as a bright curved rim on the outer side, a short yoke up to the band.
// Same options as drawCup (open widens the shell rim a little).
export function drawCupSide(g, c) {
  const { x, y, r = 50, rot = 0, open = 0.45, side = 1 } = c;
  const s = side, rr = rng(43);
  g.save(); g.translate(x, y); g.rotate(rot);
  g.lineCap = "round"; g.lineJoin = "round";
  const cw = 0.36 * r, sw = (0.2 + 0.2 * clamp(open)) * r, cx = -s * 0.12 * r, shx = cx + s * (cw * 0.5 + sw * 0.35);
  // cushion
  const cush = (q) => q.ellipse(cx, 0, cw * 0.55, r * 0.98, 0, 0, TAU);
  g.fillStyle = gv(0.07); g.beginPath(); cush(g); g.fill();
  g.save(); g.beginPath(); cush(g); g.clip();
  for (let i = -6; i <= 6; i++) {
    if (rr() < 0.25) continue;
    const yy = i / 6 * r * 0.8 + (rr() - 0.5) * r * 0.06, hw = Math.sqrt(Math.max(0, 1 - (yy / (r * 0.98)) ** 2)) * cw * 0.36;
    const zig = [[cx - hw, yy - r * 0.04], [cx - hw * 0.1, yy + r * 0.04], [cx + hw * 0.6, yy - r * 0.02]];
    ink(g, zig, wmin(r * 0.02 * (0.7 + 0.5 * rr())), gv(0.4 + 0.3 * rr(), 0.8), { end: 0.3 });
  }
  g.restore();
  g.strokeStyle = LINE; g.lineWidth = wmin(r * 0.03); g.beginPath(); cush(g); g.stroke();
  // shell rim: a crescent of polished metal on the outside
  const outerPts = [], innerPts = [];
  for (let i = 0; i <= 20; i++) { const a = -Math.PI / 2 + Math.PI * i / 20; outerPts.push([shx + s * Math.cos(a) * sw, Math.sin(a) * r * 0.96]); innerPts.push([shx + s * Math.cos(a) * sw * 0.25 - s * sw * 0.3, Math.sin(a) * r * 0.9]); }
  const rim = (q) => { q.moveTo(outerPts[0][0], outerPts[0][1]); for (const p of outerPts) q.lineTo(p[0], p[1]); for (let i = innerPts.length - 1; i >= 0; i--) q.lineTo(innerPts[i][0], innerPts[i][1]); q.closePath(); };
  const gr = g.createLinearGradient(shx - s * sw * 0.3, 0, shx + s * sw, 0);
  gr.addColorStop(0, gv(0.25)); gr.addColorStop(0.35, gv(0.7)); gr.addColorStop(0.55, gv(0.95)); gr.addColorStop(0.75, gv(0.55)); gr.addColorStop(1, gv(0.2));
  g.fillStyle = gr; g.beginPath(); rim(g); g.fill();
  g.strokeStyle = LINE; g.lineWidth = wmin(r * 0.035); g.beginPath(); rim(g); g.stroke();
  ink(g, outerPts.map(([px, py]) => [px - s * sw * 0.35, py * 0.93]).slice(3, 18), r * 0.025, gv(0.99, 0.8), { end: 0.2 });
  // yoke: a short grey arm from the top of the cup up toward the band
  ink(g, [[shx - s * sw * 0.2, -r * 0.9], [shx - s * sw * 0.1, -r * 1.12], [shx - s * sw * 0.25, -r * 1.3]], r * 0.13, LINE, { end: 0.8, pow: 0.3 });
  ink(g, [[shx - s * sw * 0.2, -r * 0.9], [shx - s * sw * 0.1, -r * 1.12], [shx - s * sw * 0.25, -r * 1.3]], r * 0.08, gv(0.6), { end: 0.8, pow: 0.3 });
  g.restore();
}
// F4c: the slim headband of the front views: a thin dark band with a pale highlight line, grey metal sliders with
// dark ribs near the ends. Same arguments as drawBand.
export function drawBandSlim(g, pts, { w = 12, slider = 0.2, ends = [true, true], ribs = true } = {}) {
  if (pts.length < 2) return;
  const q = sampleCurve(pts, 6);
  taper(g, q, () => wmin(w), gv(0.1));
  taper(g, q.map((p, i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)], n = perp(nrm(sub(b, a))); return add(p, mul(n, -w * 0.18)); }), () => wmin(w * 0.14), gv(0.55, 0.8));
  const seg = (u0, u1) => {
    const n0 = Math.floor((q.length - 1) * u0), n1 = Math.max(n0 + 1, Math.floor((q.length - 1) * u1)), sq = q.slice(n0, n1 + 1);
    taper(g, sq, () => wmin(w * 1.25), LINE);
    taper(g, sq, () => wmin(w * 0.95), gv(0.62));
    if (ribs) for (let i = 1; i < sq.length - 1; i += 2) { const a = sq[i], n = perp(nrm(sub(sq[i + 1], sq[i - 1]))); ink(g, [add(a, mul(n, w * 0.5)), add(a, mul(n, -w * 0.5))], w * 0.12, gv(0.15, 0.9), { end: 0.6 }); }
  };
  if (ends[0]) seg(0, slider);
  if (ends[1]) seg(1 - slider, 1);
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

// The whole headphone rig on a head, in two layers so the head can go between them: "back" = the band behind the
// crown and the far cup, "front" = the band over the crown and the near cup, "both". H = headGeom(head spec),
// HP = pose.headphones. Returns the geometry (band points, cups) in the same units.
export function drawHeadphones(g, H, HP, layer = "both", geo = null) {
  const hp = geo || headphoneGeom(H, HP);
  const cupAt = (c) => (HP.cupStyle === "side" ? drawCupSide : drawCup)(g, { x: c.x, y: c.y, r: HP.r ?? 50, rot: H.roll + (HP.cupRot ?? 0) * c.side, open: c.open, side: c.side });
  const bandAt = (sg, o) => (HP.slim ? drawBandSlim : drawBand)(g, sg.pts, { w: HP.w ?? 16, ends: sg.ends, ...o });
  if (layer !== "front" && HP.far !== false) { for (const sg of hp.segs) if (!sg.front) bandAt(sg, {}); for (const c of hp.cups) if (c.z < -0.02) cupAt(c); }
  if (layer !== "back") { for (const sg of hp.segs) if (sg.front) bandAt(sg, { ribs: HP.nearRibs ?? false }); for (const c of hp.cups) if (c.z >= -0.02) cupAt(c); }
  return hp;
}

// ---------------------------------------------------------------- feet
// foot: { x, y (ankle), rot (radians; 0 = toes point down), size, mode: 'perch' (curled over an edge) | 'stand'
// (splayed flat) | 'dangle' (hanging in flight), toes (3|4), leg (visible leg length, 0 = hidden in feathers) }
export function drawFoot(g, f) {
  if (f.mode === "grip") return drawGrip(g, f);
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
    // scale creases across the toe (the source's padded, ridged toes)
    for (const f of [0.38, 0.66]) {
      const j = Math.floor((q.length - 1) * f), p = q[j], t = nrm(sub(q[Math.min(q.length - 1, j + 1)], p)), n = perp(t);
      ink(g, [add(p, mul(n, -tw * 0.34)), add(p, mul(t, -tw * 0.12)), add(p, mul(n, tw * 0.34))], size * 0.04, gv(0.28, 0.8), { end: 0.2 });
    }
    // claw: a long pale hook curling toward the perch, a dark nail-bed crescent where it leaves the toe, a heavier
    // keyline on its inner curve and a dark point
    const e = q[q.length - 1], t = nrm(sub(e, q[q.length - 3])), n = perp(t), cl = size * (mode === "stand" ? 0.62 : 0.8);
    const hook = mode === "stand" ? -1 : 1;
    const tip = add(add(e, mul(t, cl * 0.72)), mul(n, hook * cl * 0.62));
    const bl = add(e, mul(n, -tw * 0.34)), br = add(e, mul(n, tw * 0.34));
    const claw = [bl, add(add(e, mul(t, cl * 0.5)), mul(n, -tw * 0.2 * hook)), add(add(e, mul(t, cl * 0.82)), mul(n, hook * cl * 0.3)), tip, add(add(e, mul(t, cl * 0.42)), mul(n, tw * 0.22 * hook)), br];
    g.fillStyle = f.claw === "dark" ? gv(0.14) : gv(0.9); g.beginPath(); smoothPath(g, claw, true); g.fill();   // F4c: claw "dark" = the front views' dark talons
    g.strokeStyle = LINE; g.lineWidth = wmin(size * 0.05); g.beginPath(); smoothPath(g, claw, true); g.stroke();
    const big = clamp((size * PPU - 8) / 14);   // the heavier accents only where the talon is big enough to read
    ink(g, hook > 0 ? [br, claw[4], tip] : [bl, claw[1], tip], size * (0.035 + 0.04 * big), LINE, { end: 0.15, bias: 0.4 });
    if (big > 0) ink(g, [add(bl, mul(t, tw * 0.05)), add(e, mul(t, tw * 0.28)), add(br, mul(t, tw * 0.05))], size * 0.07 * big, LINE, { end: 0.3 });
    ink(g, [add(add(e, mul(t, cl * 0.25)), mul(n, -tw * 0.08 * hook)), add(add(e, mul(t, cl * 0.6)), mul(n, hook * cl * 0.1))], size * 0.035, f.claw === "dark" ? gv(0.62, 0.8) : gv(0.99, 0.8), { end: 0.2 });
    g.fillStyle = LINE; g.beginPath(); g.arc(tip[0], tip[1], wmin(size * 0.05), 0, TAU); g.fill();
  }
  g.restore();
}

// F4c foot mode "grip": a perched foot seen from the front (the shoulder owl, 19–29 s): short plump pale toes side by
// side curling forward over the perch, a crease each, dark hooked claws curving down and back under them.
// size = toe length (units), toes, spread (fan, radians), claw "dark" | "pale".
function drawGrip(g, f) {
  const { x, y, rot = 0, size = 20, toes = 3, spread = 0.5, seed = 3, claw = "dark" } = f;
  const r = rng(seed);
  g.save(); g.translate(x, y); g.rotate(rot);
  g.lineCap = "round"; g.lineJoin = "round";
  for (let i = 0; i < toes; i++) {
    const f0 = toes === 1 ? 0 : i / (toes - 1) - 0.5, d = V.rot([0, 1], -f0 * spread), n = perp(d);
    const root = [f0 * size * 1.05, -Math.abs(f0) * size * 0.1], L = size * (1 - Math.abs(f0) * 0.25) * (0.92 + 0.16 * r()), hw = size * 0.27;
    const tip = add(root, mul(d, L));
    const toe = [add(root, mul(n, -hw)), add(add(root, mul(d, L * 0.55)), mul(n, -hw * 1.05)), add(tip, mul(n, -hw * 0.7)), add(tip, mul(d, hw * 0.35)), add(tip, mul(n, hw * 0.7)), add(add(root, mul(d, L * 0.55)), mul(n, hw * 1.05)), add(root, mul(n, hw))];
    // claw: from under the toe tip, hooking down and back
    const c0 = add(tip, mul(d, hw * 0.1)), ct = add(add(c0, mul(d, size * 0.42)), mul([0, 1], size * 0.05)), cb = add(add(c0, mul(d, size * 0.2)), mul(n, f0 * size * 0.1));
    const cl = [add(c0, mul(n, -hw * 0.45)), add(cb, mul(n, -hw * 0.28)), ct, add(cb, mul(n, hw * 0.12)), add(c0, mul(n, hw * 0.45))];
    g.fillStyle = claw === "dark" ? gv(0.12) : gv(0.88); g.beginPath(); smoothPath(g, cl, true); g.fill();
    g.strokeStyle = LINE; g.lineWidth = wmin(size * 0.04); g.beginPath(); smoothPath(g, cl, true); g.stroke();
    if (claw === "dark") ink(g, [add(c0, mul(n, -hw * 0.18)), add(cb, mul(n, -hw * 0.12)), V.mix(cb, ct, 0.5)], size * 0.03, gv(0.6, 0.8), { end: 0.2 });
    // toe pad
    const tp = blobPath(toe);
    g.save(); g.beginPath(); tp(g); g.clip();
    g.fillStyle = gv(0.93); g.fill();
    g.filter = `blur(${Math.max(0.4, hw * 0.35 * PPU).toFixed(2)}px)`;
    g.fillStyle = gv(0.66, 0.6); g.beginPath(); g.ellipse(tip[0] + n[0] * hw * 0.3, tip[1] + hw * 0.2, hw * 0.9, hw * 0.55, 0, 0, TAU); g.fill();
    g.filter = "none"; g.restore();
    ink(g, toe.slice(1, 6), size * 0.05, gv(0.18, 0.95), { end: 0.4 });
    const cq = add(root, mul(d, L * 0.5));
    ink(g, [add(cq, mul(n, -hw * 0.7)), add(add(cq, mul(d, hw * 0.15)), mul(n, 0)), add(cq, mul(n, hw * 0.7))], size * 0.03, gv(0.35, 0.8), { end: 0.2 });
  }
  g.restore();
}

// ---------------------------------------------------------------- pose presets
// The hero pose: sitting three-quarter, head turned to viewer's left, tail to the right (s09/s12, 32.6–35.4 s).
// Placement in those shots: HERO_PLACE (measured on the source at 34.0 s).
export const HERO_PLACE = { x: 1296, y: 636, s: 2.6 };
// First-pass sit3q, kept frozen because POSES.walk is derived from it.
const SIT3Q_V1 = {
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
// sit3q re-fitted (Nelder-Mead on silhouette IoU / feature positions) to the measured s12 hero geometry at
// HERO_PLACE: head IoU 0.948, head+body 0.957, wing 0.954, tail 0.84; eye centres, beak top, plaster centre and the
// near cup centre land on the measured points (the eyes need a small per-eye `off`: the face is rolled less than
// the skull outline).
const SIT3Q = {
  light: [-0.85, -0.5],
  head: { x: -115.76, y: -122.32, rx: 119.29, ry: 97.0, yaw: -0.348, pitch: 0, roll: -0.279, square: 2.433, jowl: 0.101 },
  tufts: [{ at: -0.459, size: 30.8, width: 0.178, lean: 0.439, second: 0.594, curl: 0.095 }, { at: 0.95, size: 46, width: 0.28, lean: -0.62, second: 0.45, curl: 0.3 }],
  body: { x: 5.54, y: -4.92, a: 165.5, b: 94.3, rot: 0.31, egg: 0.118, sag: 0.118 },
  tail: { base: [164.4, 47.7], tip: [254.2, 78.4], w: 25.5, n: 3, spread: 0.0 },
  wings: [{ type: "folded", layer: "front", S: [-2.5, -81.7], T: [176.0, 53.2], width: 67.7, back: 45.5, dir: 1 }],
  feet: [{ x: -60, y: 86, rot: 0.65, size: 26, mode: "perch", toes: 4, spread: 0.35, seed: 4 }, { x: 30, y: 98, rot: 0.4, size: 28, mode: "perch", toes: 4, spread: 0.35, seed: 9 }],
  eyes: { state: "stare", r: 25, spread: 0.3977, el: -0.1089, look: [-0.45, -0.3], right: { off: [0.1, 6.5], sx: 1.08, pupil: 0.83, hood: 0.8, lidW: 0.26 }, left: { off: [-0.1, -6.5], r: 21.5, sx: 0.99, slant: 0.2, pupil: 0.86, look: [0.5, -0.3], hood: 0.9, lidW: 0.24 } },
  beak: { el: -0.322, lift: 1.332, w: 31, l: 39.6, rot: 0.153 },
  bandage: { az: -0.542, el: 1.01, size: 73.5, rot: -0.259 },
  headphones: { on: true, yaw: -0.933, dx: 0.292, dy: 0.108, lift: 1.287, r: 51, bandR: 1.308, bandH: 2.235, tilt: 0.207, open: 0.85, cupEl: -0.129, w: 21 },
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
POSES.walk = mergePose(SIT3Q_V1, {
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
// ---------------------------------------------------------------- F4c presets fitted to source frames
// Each is posed from measurements of one source frame (grid crops, 2x), drawn with the F4c parts (glossy / sly / pin
// eyes, heart facial disc, shield / grin beak, spiky tuft, slim band + edge-on cups, layered / scalloped wings, dark
// talons, solid ink over the print mesh). FIT_PLACE[name] = the frame placement ({ x, y, s }) and source time used
// for the fit, so a shot can start from the measured size and move it.
export const FIT_PLACE = {};
const V2 = { ink: "solid", disc: "line", flow: [0, 1] };
// the shoulder owl, sitting facing us (source 21.0 s, s04 / s06)
POSES.perch = {
  ...V2, light: [-0.5, -0.86], grain: 2.5,
  head: { x: -2, y: -163, rx: 113, ry: 96, yaw: 0, pitch: 0, roll: 0, square: 2.45, jowl: 0.3 },
  tufts: [{ at: 0.84, size: 54, width: 0.5, lean: -0.3, spikes: 3, fan: 0.6, curl: 0.4, seed: 5, valley: 0.6 }, { at: -0.98, size: 14, width: 0.2, lean: 0.2, second: 0.4, curl: 0.1 }],
  body: { x: -6, y: -8, a: 110, b: 134, rot: Math.PI / 2, egg: -0.04, sag: 0 },
  tail: { base: [96, 84], tip: [126, 104], w: 18, n: 2 },
  wings: [
    { type: "folded", layer: "front", style: "scallop", S: [96, -70], T: [128, 76], width: 26, back: 30, dir: 1, rows: 2 },
    { type: "folded", layer: "front", style: "scallop", S: [-116, -52], T: [-126, 52], width: 14, back: 4, dir: -1, rows: 1 },
  ],
  feet: [{ x: -64, y: 80, rot: 0.15, size: 27, mode: "grip", toes: 3, spread: 0.55, claw: "dark", front: true, seed: 2 }, { x: 44, y: 94, rot: -0.05, size: 27, mode: "grip", toes: 3, spread: 0.55, claw: "dark", front: true, seed: 5 }],
  eyes: { state: "glossy", r: 30.8, spread: 0.51, el: -0.37, look: [0, 0], over: { sx: 1 } },
  beak: { el: -0.6, lift: 1.1, w: 29, l: 35, style: "shield" },
  merge: true,
  bandage: { az: -0.67, el: 0.74, size: 64, rot: -0.5 },
  headphones: { on: true, yaw: 0, lift: 1.13, r: 52, bandR: 1.26, bandH: 1.74, tilt: 0, cupEl: 0.05, w: 8, slim: true, cupStyle: "side", open: 0.5 },
};
FIT_PLACE.perch = { x: 1690, y: 470, s: 1, t: 21.0 };

// flying toward us, wings spread, eyes shut (source 18.5 s, s02)
POSES.flyFront = {
  ...V2, light: [-0.5, -0.86], grain: 2.5, merge: true,
  head: { x: 7, y: -150, rx: 117, ry: 90, yaw: -0.1, pitch: 0, roll: 0, square: 2.45, jowl: 0.3 },
  tufts: [{ at: 0.8, size: 44, width: 0.46, lean: -0.3, spikes: 3, fan: 0.6, curl: 0.4, seed: 5, valley: 0.6 }],
  body: { x: 0, y: 0, a: 97, b: 124, rot: Math.PI / 2, egg: -0.05, sag: 0 },
  tail: { base: [80, 60], tip: [134, 108], w: 30, n: 3 },
  wings: [
    { type: "spread", style: "layered", layer: "back", S: [-112, -84], Wr: [-238, -228], T: [-392, -216], trail: [0.22, 1], len: 122, spread: 0.95, n: 7, m: 6, seed: 21 },
    { type: "spread", style: "layered", layer: "back", S: [122, -78], Wr: [298, -132], T: [452, -64], trail: [-0.25, 1], len: 108, spread: 0.9, n: 7, m: 6, seed: 23 },
  ],
  feet: [{ x: -55, y: 96, rot: 0.1, size: 20, mode: "dangle", toes: 3, spread: 0.45, seed: 2 }, { x: 30, y: 106, rot: -0.05, size: 20, mode: "dangle", toes: 3, spread: 0.45, seed: 5 }],
  eyes: { state: "shut", r: 29, spread: 0.49, el: -0.46, look: [0, 0], over: { sx: 1 } },
  beak: { el: -0.53, lift: 1.1, w: 30, l: 34, style: "shield" },
  bandage: { az: -0.7, el: 0.8, size: 64, rot: -0.5 },
  headphones: { on: true, yaw: -0.1, lift: 1.14, r: 58, bandR: 1.3, bandH: 1.8, tilt: 0, cupEl: 0.02, w: 8, slim: true, cupStyle: "side", open: 0.5 },
};
FIT_PLACE.flyFront = { x: 1605, y: 395, s: 1, t: 18.5 };

// the shoulder owl, tired (source 27.5 s, s06): perch with heavy lids, looking down
POSES.perchTired = mergePose(POSES.perch, { eyes: { state: "tired", r: 29.5, spread: 0.52, look: [0.15, 0.35] } });
FIT_PLACE.perchTired = { x: 1672, y: 482, s: 1, t: 27.5 };
// startled three-quarter, wing flung up, beak open, sweat drop (source 36.0 s, s13)
POSES.startle3q = {
  ...V2, light: [-0.55, -0.83], grain: 4, merge: true, disc: 1,
  head: { x: -58, y: -150, rx: 100, ry: 90, yaw: -0.5, pitch: 0.05, roll: -0.09, square: 2.3, jowl: 0.2, edge: { step: 22, depth: 13, lean: 0.9, from: 0.55, to: 0.97, seed: 3 } },
  tufts: [{ at: -0.62, size: 48, width: 0.3, lean: 0.25, spikes: 2, fan: 0.5, curl: 0.15, seed: 3, valley: 0.5 }, { at: 0.58, size: 58, width: 0.36, lean: -0.1, spikes: 2, fan: 0.4, curl: 0.2, seed: 4, valley: 0.55 }],
  body: { x: 12, y: 8, a: 122, b: 126, rot: Math.PI / 2 - 0.75, egg: -0.05, sag: 0.08, edge: { step: 26, depth: 15, lean: 1.0, from: 0.25, to: 0.6, seed: 5 } },
  tail: null,
  wings: [
    { type: "folded", layer: "back", S: [70, 20], T: [171, 91], width: 34, back: 26, dir: 1 },
    { type: "raised", layer: "back", S: [70, -100], Wr: [121, -176], T: [236, -110], trail: [0.42, 0.9], len: 138, secLen: 1.45, spread: 0.3, n: 8, m: 7, seed: 31 },
  ],
  feet: [{ x: -42, y: 84, rot: 0.2, size: 27, mode: "perch", toes: 4, spread: 0.4, front: true, seed: 4 }, { x: 66, y: 80, rot: 0.1, size: 28, mode: "perch", toes: 4, spread: 0.4, front: true, seed: 9 }],
  eyes: { state: "pin", r: 27, spread: 0.45, el: -0.1, look: [-0.2, 0], right: { r: 29, sx: 1.07 }, left: { r: 26, sx: 0.72, look: [0, 0] } },
  beak: { el: -0.5, lift: 1.25, w: 36, l: 46, open: 0.6, rot: 0.05 },
  bandage: { az: -0.72, el: 0.72, size: 58, rot: -0.55 },
  sweat: { az: 0.18, el: 0.3, size: 15 },
  headphones: { on: true, yaw: -0.5, dx: 0, lift: 1.2, r: 50, bandR: 1.25, bandH: 1.45, tilt: 0.1, open: 0.72, cupEl: 0.05, w: 18, far: false },
};
FIT_PLACE.startle3q = { x: 1330, y: 700, s: 2.6, t: 36.0 };

// standing, wings on the hips, sly smirk (source 105.0 s, s25)
POSES.hipsSmug = {
  ...V2, light: [-0.5, -0.86], grain: 3, merge: true,
  head: { x: -10, y: -221, rx: 98, ry: 72, yaw: -0.12, pitch: 0, roll: -0.06, square: 2.4, jowl: 0.3 },
  tufts: [{ at: -0.8, size: 34, width: 0.3, lean: 0.15, spikes: 2, fan: 0.4, curl: 0.2, seed: 3, valley: 0.55 }, { at: 0.86, size: 30, width: 0.3, lean: -0.2, spikes: 2, fan: 0.4, curl: 0.25, seed: 4, valley: 0.55 }],
  body: { x: 0, y: -18, a: 168, b: 172, rot: Math.PI / 2, egg: 0.16, sag: 0 },
  tail: null,
  wings: [
    { type: "arm", style: "feathered", layer: "front", S: [-128, -104], Wr: [-181, -30], T: [-122, 12], len: 36, fingers: [0.35, 1], nf: 4 },
    { type: "arm", style: "feathered", layer: "front", S: [146, -112], Wr: [186, -40], T: [110, -4], len: 36, fingers: [-0.3, 1], nf: 4 },
  ],
  feet: [{ x: -62, y: 140, rot: 0.1, size: 30, mode: "stand", toes: 3, leg: 24, spread: 0.5, claw: "dark", seed: 2 }, { x: 92, y: 150, rot: -0.1, size: 30, mode: "stand", toes: 3, leg: 24, spread: 0.5, claw: "dark", seed: 5 }],
  eyes: { state: "sly", r: 26, spread: 0.47, el: -0.29, look: [0, 0], over: { sx: 1 } },
  beak: { el: -0.5, lift: 1.1, w: 36, l: 34, style: "grin", smirk: 1 },
  bandage: { az: -0.63, el: 0.6, size: 50, rot: -0.45 },
  headphones: { on: true, yaw: -0.12, lift: 1.12, r: 46, bandR: 1.25, bandH: 1.75, tilt: 0.05, cupEl: 0.02, w: 11, slim: true, open: 0.55 },
};
FIT_PLACE.hipsSmug = { x: 1100, y: 690, s: 1.2, t: 105.0 };

// flying at us down the corridor, wings out, glossy eyes wide, sweat drop, feet reaching (source 44.8 s, s15)
POSES.flyToward = {
  ...V2, light: [-0.5, -0.86], grain: 2.5, merge: true,
  head: { x: -23, y: -200, rx: 115, ry: 100, yaw: -0.05, pitch: 0, roll: 0, square: 2.45, jowl: 0.25 },
  tufts: [{ at: 0.82, size: 40, width: 0.4, lean: -0.3, spikes: 3, fan: 0.6, curl: 0.4, seed: 5, valley: 0.6 }, { at: -0.85, size: 26, width: 0.3, lean: 0.2, spikes: 2, fan: 0.4, curl: 0.3, seed: 6, valley: 0.6 }],
  body: { x: 0, y: -5, a: 108, b: 108, rot: Math.PI / 2, egg: -0.05, sag: 0 },
  tail: null,
  wings: [
    { type: "spread", style: "layered", layer: "back", S: [-108, -77], Wr: [-215, -95], T: [-323, -88], trail: [0.12, 1], len: 90, spread: 0.7, n: 7, m: 5, seed: 41 },
    { type: "spread", style: "layered", layer: "back", S: [100, -85], Wr: [208, -108], T: [315, -123], trail: [-0.12, 1], len: 86, spread: 0.7, n: 7, m: 5, seed: 43 },
  ],
  feet: [{ x: -62, y: 118, rot: 0.25, size: 28, mode: "dangle", toes: 3, spread: 0.7, claw: "dark", seed: 2 }, { x: 62, y: 112, rot: -0.25, size: 28, mode: "dangle", toes: 3, spread: 0.7, claw: "dark", seed: 5 }],
  eyes: { state: "glossy", r: 29, spread: 0.46, el: -0.17, look: [0, 0], over: { sx: 1 } },
  beak: { el: -0.46, lift: 1.1, w: 31, l: 35, open: 0.35, style: "shield" },
  bandage: { az: -0.7, el: 0.76, size: 48, rot: -0.5 },
  sweat: { az: 0.95, el: 0.02, size: 13 },
  headphones: { on: true, yaw: -0.05, lift: 1.15, r: 54, bandR: 1.28, bandH: 1.6, tilt: 0, cupEl: 0.05, w: 10, slim: true, open: 0.5 },
};
FIT_PLACE.flyToward = { x: 1190, y: 650, s: 0.65, t: 44.8 };

// the two pops before the s12 cut, as measured rigid head moves (ECC fit on the source): glare -2.63 deg, shut -5.15 deg
// startled with one wing flung up (s13), the other still folded
POSES.wingUp = mergePose(POSES.front, {
  eyes: { state: "startled", look: [0, 0] }, beak: { open: 0.7 },
  wings: [
    { type: "folded", layer: "front", S: [-86, -34], T: [-70, 110], width: 30, back: 14, dir: -1 },
    { type: "spread", layer: "back", S: [80, -40], Wr: [170, -120], T: [240, -200], trail: [-0.35, 1], len: 62, spread: 0.75 },
  ],
});
// tumbling: startled, wings thrown out unevenly, the whole bird rotated (animate rot)
POSES.tumble = mergePose(POSES.startled, {
  rot: 2.3,
  wings: [
    { type: "spread", layer: "back", S: [-80, -30], Wr: [-170, -40], T: [-250, 10], trail: [0.3, 1], len: 60, spread: 0.6 },
    { type: "spread", layer: "back", S: [80, -40], Wr: [150, -140], T: [190, -240], trail: [-0.5, 0.9], len: 56, spread: 0.8 },
  ],
  feet: [{ x: -26, y: 104, rot: 0.6, size: 13, mode: "dangle", seed: 2 }, { x: 26, y: 104, rot: -0.4, size: 13, mode: "dangle", seed: 5 }],
});
// standing, both wings brought forward as arms to hold something in front of the chest (draw the prop via extra;
// anchors.wingTips are the two hands)
POSES.hold = mergePose(POSES.frontStand, {
  wings: [
    { type: "arm", layer: "front", S: [-84, -40], Wr: [-110, 30], T: [-40, 40], len: 26 },
    { type: "arm", layer: "front", S: [84, -40], Wr: [110, 30], T: [40, 40], len: 26 },
  ],
  eyes: { state: "stare", look: [0, 0.5] }, head: { pitch: -0.08 },
});
POSES.sleep = mergePose(SIT3Q, { eyes: { state: "closed" }, head: { x: SIT3Q.head.x - 8.7, y: SIT3Q.head.y + 21.4, roll: SIT3Q.head.roll - 0.0899 }, headphones: { dy: 0.108 + 0.2 } });
POSES.glare = mergePose(SIT3Q, { eyes: { state: "glare" }, head: { x: SIT3Q.head.x - 5, y: SIT3Q.head.y + 10.6, roll: SIT3Q.head.roll - 0.0459 }, headphones: { dy: 0.108 + 0.1 } });

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
  const wings = (P.wings || []).map((w) => ({ ...w, g: wingGeom(w) }));
  const tufts = (P.tufts || []).map((t) => tuftShape(H, t));
  const E = P.eyes || {};
  const eyes = [-1, 1].map((sd) => {
    const q0 = H.P(sd * (E.spread ?? 0.44), E.el ?? -0.15), ov = (sd < 0 ? E.left : E.right) || {};
    const of = ov.off ? V.rot(ov.off, H.roll) : [0, 0], q = { ...q0, x: q0.x + of[0], y: q0.y + of[1] };
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

  // --- far side: the band behind the crown, and a far cup (mostly hidden by the head)
  if (hp) drawHeadphones(g, H, HP, "back", hp);
  // --- back wings
  for (const w of wings) if (w.layer === "back") paintWing(g, w, plu, dl, flow);
  // --- tail
  paintTail(g, tail, plu, dl);
  // --- feet (behind the belly: the plumage overlaps the toe roots and legs)
  (P.feet || []).forEach((f) => { if (!f.front) drawFoot(g, f); });
  // --- body
  if (body) {
    const b = P.body, bp = b.edge ? polyPathFn(featherEdge(body, b.edge)) : blobPath(body);
    if (P.merge) {
      // F4c merge: head and body as ONE soft mass (the front views have no seam under the head)
      const hp0 = P.head.edge ? polyPathFn(featherEdge(H.out, P.head.edge)) : blobPath(H.out);
      const cwp = (pts) => (area(pts) > 0 ? pts : pts.slice().reverse());
      const un = (c) => { bp(c); hp0(c); tufts.forEach((t) => blobPath(cwp(t.pts))(c)); };
      plumage(g, un, { base: 0.97, shade: 0.8, depth: b.a * 0.34, blur: b.a * 0.1, keep: [0, b.a * 0.3], ...plu });
    } else
    plumage(g, bp, { base: 0.97, shade: 0.8, depth: b.a * 0.3, blur: b.a * 0.08, ...plu });
    // the belly turns away from the light: a toned band along the underside
    softShade(g, bp, (c) => { const q = add([b.x || 0, b.y || 0], V.rot([b.a * 0.05, b.b * 1.0], b.rot)); c.ellipse(q[0], q[1], b.a * 0.85, b.b * 0.32, b.rot, 0, TAU); }, 0.62, 0.45, b.b * 0.18);
    if (dl > 0.25 && P.texture === "classic") {
      rimHatch(g, body, { light: Lu, flow, len: b.a * 0.09, step: 3.2, w: 1.0, color: hatchCol, seed: 12, density: 0.9, bend: 0.6 });
      edgeFlicks(g, body, { step: 10, len: b.a * 0.06, w: 0.9, color: gv(0.4, 0.4), ang: 0.9, seed: 19 });
      for (let k = 0; k < 3; k++) {
        const c = add([b.x || 0, b.y || 0], V.rot([-b.a * (0.2 - k * 0.25), 0], b.rot));
        const pts = [];
        for (let j = 0; j <= 6; j++) { const t = Math.PI * (0.35 + j * 0.06); pts.push(add(c, V.rot([Math.cos(t) * b.a * 0.4, Math.sin(t) * b.b * (0.55 + k * 0.12)], b.rot))); }
        featherRow(g, pts, { step: 6, len: b.a * 0.07, w: 1.0, color: gv(0.42, 0.4), ang: 2.2, seed: 14 + k, gap: 0.35 });
      }
    } else if (dl > 0.25) {
      // the hero's plumage language: a clean silhouette, long fine strokes along the shadow-side edge, sparse
      // clusters of 2-3 soft strokes following the feather flow, a few fur tips at the belly edge
      const bo = P.merge ? outsideRun(body, H.out) : { pts: body, closed: true }, keepB = P.merge ? (q) => !inPoly(q, H.out) : null;
      if (bo.pts.length > 2) contourStrokes(g, bo.pts, { light: Lu, thr: 0.05, step: 7, depth: b.b * 0.22, len: b.a * 0.2, w: 0.6, color: gv(0.36, 0.6), seed: 12, closed: bo.closed });
      const fl = nrm(flow), bb = bbox2(body);
      plumageStrokes(g, bp, bb, (q, r) => nrm(add(fl, [(r() - 0.5) * 0.35, (r() - 0.5) * 0.2])), { density: 0.35 * dl, len: [b.a * 0.07, b.a * 0.16], w: [0.55, 0.9], color: gv(0.4, 0.7), seed: 14, keep: keepB });
      if (dl > 0.5 && bo.pts.length > 2) edgeFlicks(g, bo.pts, { step: 16, len: b.a * 0.07, w: 0.7, color: gv(0.32, 0.6), ang: 0.7, seed: 19, jit: 0.3, closed: bo.closed });
    }
  }
  // --- front wings, feet
  for (const w of wings) if (w.layer !== "back") paintWing(g, w, plu, dl, flow);
  (P.feet || []).forEach((f) => { if (f.front) drawFoot(g, f); });   // F4c: front = gripping over the belly (perched, facing us)

  // --- head
  const hpth = P.head.edge ? polyPathFn(featherEdge(H.out, P.head.edge)) : blobPath(H.out);
  if (!P.merge || !body) {
    tufts.forEach((t) => plumage(g, blobPath(t.pts), { base: 0.96, shade: 0.78, depth: 12, blur: 5, ...plu }));
    plumage(g, hpth, { base: 0.97, shade: 0.8, depth: H.ry * 0.36, blur: H.ry * 0.1, keep: [0, H.ry * 0.5], ...plu });
  }
  if (hp) {
    const nc = hp.cups.find((c) => c.z >= 0);
    if (nc && !(P.ink === "solid" && Math.abs(HP.yaw ?? H.yaw) < 0.2)) softShade(g, hpth, (c) => c.ellipse(nc.x - nc.side * (HP.r ?? 50) * 0.9, nc.y + 5, (HP.r ?? 50) * 0.55, (HP.r ?? 50) * 1.3, H.roll, 0, TAU), 0.62, 0.5, 14);
  }
  if (dl > 0.25 && P.texture === "classic") {
    rimHatch(g, H.out, { light: Lu, flow, len: H.ry * 0.2, step: 2.4, w: 1.0, color: hatchCol, seed: 22, density: 0.9, thr: 0.1 });
    edgeFlicks(g, H.out, { step: 24, len: 9, w: 0.9, color: gv(0.5, 0.3), ang: 1.1, seed: 23 });
  } else if (dl > 0.25) {
    const ho = P.merge && body ? outsideRun(H.out, body) : { pts: H.out, closed: true };
    if (ho.pts.length > 2) {
      contourStrokes(g, ho.pts, { light: Lu, thr: 0.1, step: 5, depth: H.ry * 0.12, len: H.ry * 0.3, w: 0.65, color: gv(0.3, 0.7), seed: 22, closed: ho.closed });
      // crown fringe: fine strokes combing along the top of the head
      contourStrokes(g, ho.pts, { light: [0, 1], thr: 0.35, step: 6, depth: H.ry * 0.1, len: H.ry * 0.22, w: 0.55, color: gv(0.35, 0.6), seed: 24, density: 0.7 * dl, closed: ho.closed });
      if (dl > 0.5) edgeFlicks(g, ho.pts, { step: 22, len: H.ry * 0.08, w: 0.6, color: gv(0.4, 0.45), ang: 1.0, seed: 23, closed: ho.closed });
    }
  }
  tufts.forEach((t) => {
    // feather lines up the tuft and a dark shadow stroke under its inner edge
    if (t.spiky) {   // F4c: soft grey strokes up each point, no dark keyline
      if (dl > 0.25) for (let k = 1; k < t.pts.length - 1; k++) { const q = t.pts[k], b = V.mix(t.inner, t.outer, clamp(k / (t.pts.length - 1))), d = sub(q, b); if (V.len(d) > t.pts.length) flick(g, add(b, mul(d, 0.1)), nrm(d), V.len(d) * 0.75, 1.1, gv(0.45, 0.6), 0.08 * t.side); }
      return;
    }
    if (dl > 0.3) for (let k = 0; k < 5; k++) { const b = V.mix(t.inner, t.outer, 0.2 + k * 0.15); flick(g, b, nrm(sub(V.mix(t.tip, t.tip2, k / 5), b)), V.len(sub(t.tip, b)) * (0.55 + 0.1 * k), 1.0, gv(0.35, 0.55), 0.05 * t.side); }
    ink(g, [V.mix(t.inner, t.base, 0.2), V.mix(t.base, t.tip2, 0.5), t.tip2], 1.6, LINE, { end: 0.05, bias: 0.3 });
  });
  if (P.disc === "line") { if (dl > 0.15) discLine(g, H, eyes, P.discOpts || {}); }
  else if ((P.disc ?? 1) && dl > 0.25) paintDisc(g, H, eyes, bq, dl);
  for (const e of eyes) {
    if (e.nz < 0.12) continue;
    drawEye(g, { x: e.x, y: e.y, r: e.r, sx: e.sx, rot: H.roll, side: e.side, state: E.state, look: E.look, ...(E.over || {}), ...(e.side < 0 ? E.left : E.right) });
  }
  drawBeak(g, { x: bq.x, y: bq.y, w: B.w ?? 30, l: B.l ?? 40, rot: H.roll + (B.rot ?? 0), turn: H.yaw * 2, open: B.open ?? 0, smirk: B.smirk ?? 0, style: B.style });
  if (P.sweat) { const sw = P.sweat, q = H.P((sw.az ?? 0.7) * fl, sw.el ?? 0.3, 1.0); if (q.nz > 0) drawSweat(g, { x: q.x, y: q.y, size: sw.size ?? 16, rot: H.roll + (sw.rot ?? 0) }); }
  if (P.bandage) {
    const bd = P.bandage, q = H.P((bd.az ?? -0.55) * fl, bd.el ?? 0.82);
    if (q.nz > 0.05) drawBandage(g, { x: q.x, y: q.y, size: bd.size ?? 78, rot: H.roll + (bd.rot ?? -0.55) * fl, sx: bd.sx ?? 1, sy: bd.sy ?? 1 });
  }
  // --- near headphones
  if (hp) drawHeadphones(g, H, HP, "front", hp);
  if (P.extra) P.extra(g, { H, eyes, beak: bq, wings, hp, toF });   // hook: draw props in owl units, on top
  PPU = prevPPU;
  if (P.tone !== false && dl > 0.3) { g.setTransform(1, 0, 0, 1, 0, 0); screentone(cv, P.texture === "classic" ? { pitch: 4.2 * res } : { pitch: 3.7 * res, grain: (P.grain ?? 6) / 255 * clamp((dl - 0.45) / 0.5), cross: 0.8, ...(P.ink === "solid" ? { keepInk: 0.05, floor: 0.5 } : {}) }); }
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
// Tail: long pale spear feathers, back to front; each has a dark keyline (the dark gaps between feathers in the
// source), a fine rachis and a couple of barb lines along its upper side.
function paintTail(g, tail, plu, dl) {
  tail.forEach((f, i) => {
    const path = blobPath(f);
    g.save(); g.strokeStyle = gv(0.06); g.lineJoin = "round"; g.lineWidth = wmin(2.4); g.beginPath(); path(g); g.stroke(); g.restore();
    plumage(g, path, { base: 0.9, shade: 0.72, depth: 10, blur: 5, ...plu });
    ink(g, [f[3], f[4], f[5], f[6]], 1.6, gv(0.06), { end: 0.15, bias: 0.35 });
    ink(g, [f[0], f[1], f[2], f[3]], 0.8, gv(0.25, 0.8), { end: 0.3, bias: 0.7 });
    if (dl > 0.4) {
      ink(g, [V.mix(f[0], f[6], 0.5), V.mix(f[1], f[5], 0.5), V.mix(f[2], f[4], 0.45), f[3]], 0.5, gv(0.35, 0.55), { end: 0.1 });
      for (const k of [0.22, 0.36]) ink(g, [V.mix(f[0], f[6], k), V.mix(f[1], f[5], k), V.mix(f[2], f[4], k * 0.8)], 0.4, gv(0.4, 0.45), { end: 0.1 });
    }
  });
}
// Draw one wing on its own (a part): spec = a pose wing ({ type: 'folded'|'spread'|'arm', ... }), o = { light, detail }.
export function drawWing(g, spec, o = {}) {
  const w = { ...spec, g: wingGeom(spec) };
  paintWing(g, w, { light: o.light || [-0.55, -0.83] }, o.detail ?? 1, o.flow || [0, 1]);
  return w.g;
}
// Draw a tail on its own: spec = { base, tip, w, n }.
export function drawTail(g, spec, o = {}) { paintTail(g, tailShape(spec), { light: o.light || [-0.55, -0.83] }, o.detail ?? 1); }
function paintWing(g, w, plu, dl, flow) {
  if (w.g && w.g.layered) return paintLayered(g, w, plu, dl);
  if (w.type === "folded" && w.style === "scallop") return paintScallop(g, w, plu, dl);
  if (w.type === "folded") {
    const W = w.g, path = blobPath(W.outline);
    plumage(g, path, { base: 0.955, shade: 0.8, depth: W.width * 0.5, blur: W.width * 0.15, ...plu });
    // a toned band just above the lower edge (the tucked secondaries), fading toward the shoulder
    softShade(g, path, (c) => { const q = W.P(0.62, W.width * 0.72); c.ellipse(q[0], q[1], W.L * 0.36, W.width * 0.3, Math.atan2(W.u[1], W.u[0]), 0, TAU); }, 0.66, 0.4, W.width * 0.22);
    if (w.style === "classic") return paintFoldedClassic(g, W, path, plu, dl);
    // Feather map measured on the s12 hero wing: v = 0 on the lower edge .. 1 on the back edge, t = shoulder .. tip.
    const Q = (t, v) => W.P(t, lerp(W.width * W.low(clamp(t)), -W.back * W.high(clamp(t)), v));
    const run = (t0, t1, v0, v1, n = 12) => { const q = []; for (let i = 0; i <= n; i++) { const f = i / n; q.push(Q(t0 + (t1 - t0) * f, v0 + (v1 - v0) * f)); } return q; };
    const r = rng(w.seed ?? 33);
    g.save(); g.beginPath(); path(g); g.clip();
    // back edge: long thin strokes running along the contour
    if (dl > 0.45) for (let i = 0; i < 16; i++) {
      const v = 0.88 + r() * 0.1, t0 = 0.28 + r() * 0.38, t1 = Math.min(0.99, t0 + 0.22 + r() * 0.4);
      ink(g, run(t0, t1, v, v - 0.02, 14), 0.35 + r() * 0.45, gv(0.18 + r() * 0.25, 0.55 + r() * 0.3), { end: 0.05, bias: 0.4 });
    }
    // covert rows: overlapping lanceolate feathers; each lower edge sweeps toward the tip and hooks back up
    const rows = dl > 0.35 ? [[0.36, [0.42, 0.56, 0.7]], [0.5, [0.38, 0.52, 0.66, 0.8]], [0.63, [0.46, 0.6, 0.74]], [0.75, [0.55, 0.7, 0.84]]] : [[0.4, [0.45, 0.65]], [0.62, [0.5, 0.72]]];
    for (const [v, ts] of rows) for (const t0 of ts) {
      const du = 0.13 + r() * 0.07, tt = t0 + (r() - 0.5) * 0.04, t1 = Math.min(0.97, tt + du);
      const q = run(tt, t1, v + 0.06, v - 0.015, 12);
      q.push(Q(t1 + 0.003, v + 0.01), Q(t1 - 0.007, v + 0.028));
      ink(g, q, 0.75 + r() * 0.35, gv(0.14 + r() * 0.14, 0.85), { end: 0.08, bias: 0.62 });
      if (dl > 0.55) ink(g, run(tt + 0.01, tt + du * 0.8, v + 0.1, v + 0.045, 8), 0.35, gv(0.45, 0.4), { end: 0.1 });
    }
    // primaries: long strokes near the lower edge converging on the tip
    for (let i = 0; i < (dl > 0.35 ? 6 : 3); i++) {
      const v = 0.05 + i * 0.045 + r() * 0.02, t0 = 0.5 + r() * 0.2;
      ink(g, run(t0, 0.995, v, v * 0.45, 18), 0.5 + r() * 0.5, gv(0.14 + r() * 0.18, 0.8), { end: 0.06, bias: 0.55 });
    }
    // fine barbs toward the tip
    if (dl > 0.6) for (let i = 0; i < 28; i++) {
      const t = 0.3 + r() * 0.65, v = r() * 0.85, p = Q(t, v), d = nrm(sub(Q(t + 0.03, v - 0.015), p));
      flick(g, p, d, W.L * (0.04 + 0.06 * r()), 0.35, gv(0.42, 0.35), 0.04);
    }
    g.restore();
    // lower edge: heavy ink swelling toward the secondaries' end (measured profile), with the notch where they end
    const HW = [0.2, 0.9, 1.3, 1.7, 2.1, 2.9, 3.4, 3.5, 2.8, 2.4, 2.1, 1.6, 0.8];
    const lo = []; for (let i = 0; i <= 12; i++) lo.push(Q(0.12 + i * 0.073, 0.01));
    const k = Math.min(1, Math.max(0.5, dl * 1.4));
    taper(g, sampleCurve(lo, 5), (u) => { const f = u * 12, i = Math.min(11, Math.floor(f)); return wmin((HW[i] + (HW[i + 1] - HW[i]) * (f - i)) * k); }, gv(0.08));
    const nt = Q(0.52, 0.02);
    ink(g, [add(nt, mul(W.u, -W.L * 0.05)), add(add(nt, mul(W.u, W.L * 0.015)), mul(W.n, -W.width * 0.04)), add(add(nt, mul(W.u, W.L * 0.005)), mul(W.n, -W.width * 0.12))], 1.0, LINE, { end: 0.2 });
    // soft front edge up to the shoulder
    const fr = []; for (let i = 0; i <= 7; i++) { const t = -0.02 + i * 0.03; fr.push(W.P(t, W.width * W.low(t) * 0.97)); }
    ink(g, fr, 0.9, gv(0.35, 0.55), { end: 0.1 });
    if (dl > 0.45) contourStrokes(g, W.outline, { light: plu.light, thr: -0.1, step: 7, depth: W.back * 0.12, len: W.L * 0.12, w: 0.6, color: gv(0.25, 0.6), seed: (w.seed ?? 33) + 5, from: 0.02, to: 0.5 });
    return;
  }
  if (w.type === "arm" && w.style === "feathered") return paintArmV2(g, w, plu, dl);
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


// the original (first-pass) folded-wing texture, kept for wings that set style: "classic"
function paintFoldedClassic(g, W, path, plu, dl) {
    if (dl > 0.25) rimHatch(g, W.outline, { light: plu.light, flow: W.u, len: W.width * 0.25, step: 3.5, w: 0.9, color: gv(0.3, 0.42), seed: 32, bend: 0.75, thr: 0.2 });
    if (dl > 0.35) {
      const rb = rng(34);
      g.save(); g.beginPath(); path(g); g.clip();
      for (let i = 0; i < 70; i++) {
        const t = 0.1 + rb() * 0.8, k = W.width * (0.1 + 0.8 * rb()) * W.low(t) - W.back * 0.2 * rb();
        flick(g, W.P(t, k), V.rot(W.u, 0.08 + (rb() - 0.5) * 0.1), W.L * (0.06 + 0.08 * rb()), 0.9, gv(0.35, 0.35), 0.05);
      }
      g.restore();
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
    const lowPts = []; for (let i = 0; i <= 12; i++) { const t = 0.16 + i * 0.07; lowPts.push(W.P(t, W.width * W.low(t) - 1.5)); }
    ink(g, lowPts, 3.2, LINE, { end: 0.1, bias: 0.6 });
    const n1 = W.P(0.55, W.width * W.low(0.55) - 2);
    ink(g, [add(n1, mul(W.u, -18)), add(add(n1, mul(W.u, 2)), mul(W.n, -3)), add(add(n1, mul(W.u, 12)), mul(W.n, -8))], 1.4, LINE, { end: 0.2 });
    const lo2 = []; for (let i = 0; i <= 6; i++) { const t = 0.6 + i * 0.065; lo2.push(W.P(t, W.width * W.low(t) - 8)); }
    ink(g, lo2, 1.6, LINE, { end: 0.1, bias: 0.7 });
    const fr = []; for (let i = 0; i <= 7; i++) { const t = -0.02 + i * 0.03; fr.push(W.P(t, W.width * W.low(t) * 0.97)); }
    ink(g, fr, 1.2, gv(0.4, 0.5), { end: 0.1 });
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
  if (page === 3) {
    // the kit's own hero pose at the s12 placement (compare with the source frame at 34.0 s)
    drawOwl(ctx, { ...owlPose("sit3q"), ...HERO_PLACE });
    ctx.restore(); return;
  }
  if (page === 4) {
    // parts at close-up scale: a folded wing, a tail, talons, and the headphone rig from three sides
    setPPU(2.2); ctx.save(); ctx.translate(40, 60); ctx.scale(2.2, 2.2);
    drawWing(ctx, { type: "folded", layer: "front", S: [30, 60], T: [260, 200], width: 58, back: 55, dir: 1 }, { detail: 1 });
    drawTail(ctx, { base: [220, 200], tip: [330, 240], w: 26, n: 3 }, { detail: 1 });
    ctx.restore(); label("drawWing folded + drawTail (n 3)", 40, 40);
    setPPU(3); ctx.save(); ctx.translate(900, 120); ctx.scale(3, 3);
    ctx.fillStyle = gv(0.95); ctx.fillRect(-30, -40, 260, 30);
    [["perch", 0], ["stand", 90], ["dangle", 180]].forEach(([m, x]) => drawFoot(ctx, { x: x + 20, y: -12, size: 26, mode: m, toes: m === "perch" ? 4 : 3, leg: m === "stand" ? 26 : 0 }));
    ctx.restore(); label("drawFoot perch / stand / dangle", 900, 40);
    [["front", 0], ["sit3q", 0.35], ["walk", 0]].forEach(([n, yaw], i) => {
      drawOwl(ctx, { ...owlPose(n), x: 1560 + i * 230 + (n === "sit3q" ? 30 : 0), y: 700, s: n === "sit3q" ? 0.4 : 0.48 });
    });
    label("headphones: front / 3-4 / side", 1560, 440);
    // eye states large
    setPPU(1);
    Object.keys(EYE_STATES).forEach((st, i) => {
      const x = 110 + i * 150, y = 820;
      ctx.fillStyle = gv(0.95); ctx.beginPath(); ctx.arc(x, y, 66, 0, TAU); ctx.fill();
      drawEye(ctx, { x, y, r: 44, side: 1, state: st, look: [-0.3, 0.1] });
      label(st, x - 50, 915);
    });
    ctx.restore(); return;
  }
  if (page >= 10 && page < 10 + Object.keys(FIT_PLACE).length) {
    // F4c fit pages: one fitted preset at its measured source placement (compare with the source frame FIT_PLACE.t)
    const name = Object.keys(FIT_PLACE)[page - 10];
    drawOwl(ctx, { ...owlPose(name), ...FIT_PLACE[name] });
    ctx.restore(); return;
  }
  if (page === 7) {
    // F4c presets (fitted to the source) and variations: sizes, flips, rotations, eye / beak swaps
    const cells = [
      ["perch", {}, 0.62, "perch (21.0)"], ["perchTired", {}, 0.62, "perchTired (27.5)"], ["flyFront", {}, 0.36, "flyFront (18.5)"], ["flyToward", {}, 0.5, "flyToward (44.8)"],
      ["startle3q", {}, 0.24, "startle3q (36.0)"], ["hipsSmug", {}, 0.42, "hipsSmug (105)"], ["perch", { eyes: { state: "sly" }, beak: { style: "grin" } }, 0.62, "perch + sly + grin"], ["perch", { eyes: { state: "pin" }, beak: { open: 0.6 }, sweat: { az: 0.75, el: 0.35, size: 14 } }, 0.62, "perch + pin + sweat"],
      ["perch", { flip: true, eyes: { look: [0.8, 0], over: { lookGain: 1.6 } } }, 0.62, "perch flip, look"], ["flyFront", { rot: -0.35, eyes: { state: "glossy" } }, 0.3, "flyFront bank, glossy"], ["flyToward", { eyes: { state: "scowl" } }, 0.5, "flyToward scowl"], ["hipsSmug", { eyes: { state: "scowl" }, head: { roll: 0.12 } }, 0.42, "hipsSmug scowl"],
      ["perch", { head: { yaw: 0.35 }, headphones: { yaw: 0.35 } }, 0.62, "perch yaw 0.35"], ["perch", {}, 0.25, "perch s=0.25"], ["flyFront", {}, 0.14, "flyFront s=0.14"], ["startle3q", { flip: true }, 0.24, "startle3q flip"],
    ];
    const cols = 8, cw = W / cols, ch = H / 2;
    cells.forEach(([name, over, sc, text], i) => {
      const c = i % cols, r = Math.floor(i / cols), cx = c * cw + cw / 2, cy = r * ch + ch * 0.6;
      const P0 = owlPose(name, over);
      drawOwl(ctx, { ...P0, x: cx + (name === "startle3q" ? (over.flip ? 25 : -25) : 0), y: cy + (name.startsWith("fly") ? -30 : 0), s: sc });
      label(text, c * cw + 12, r * ch + 26);
    });
    ctx.restore(); return;
  }
  if (page === 8) {
    // F4c parts at close-up scale
    const at = (x, y, k, fn) => { setPPU(k); ctx.save(); ctx.translate(x, y); ctx.scale(k, k); fn(); ctx.restore(); setPPU(1); };
    at(40, 60, 1.1, () => drawWing(ctx, { type: "spread", style: "layered", S: [330, 150], Wr: [200, 40], T: [20, 50], trail: [0.2, 1], len: 110, spread: 0.95 }, { detail: 1 }));
    label("layered spread wing", 40, 36);
    at(420, 40, 1.1, () => drawWing(ctx, { type: "raised", S: [20, 240], Wr: [60, 60], T: [200, 140], trail: [0.45, 0.9], len: 120, secLen: 1.4, spread: 0.3 }, { detail: 1 }));
    label("raised wing", 440, 36);
    at(780, 50, 1.6, () => drawWing(ctx, { type: "folded", style: "scallop", S: [40, 20], T: [70, 190], width: 30, back: 32, dir: 1, rows: 3 }, { detail: 1 }));
    label("folded scallop", 790, 36);
    at(980, 50, 1.4, () => drawWing(ctx, { type: "arm", style: "feathered", S: [40, 20], Wr: [110, 110], T: [40, 160], len: 36, fingers: [-0.2, 1], nf: 4 }, { detail: 1 }));
    label("arm feathered", 990, 36);
    at(1200, 70, 2.2, () => { ctx.fillStyle = gv(0.3); ctx.fillRect(-10, 10, 150, 50); drawFoot(ctx, { x: 30, y: 10, size: 24, mode: "grip", toes: 3, claw: "dark" }); drawFoot(ctx, { x: 100, y: 10, size: 24, mode: "grip", toes: 3, claw: "pale" }); });
    label("foot grip dark / pale", 1200, 36);
    at(1620, 60, 1.6, () => { drawCupSide(ctx, { x: 60, y: 120, r: 60, side: -1 }); drawCupSide(ctx, { x: 200, y: 120, r: 60, side: 1 }); drawBandSlim(ctx, [[40, 40], [80, 0], [180, -10], [240, 30]], { w: 9 }); });
    label("drawCupSide + drawBandSlim", 1620, 36);
    // beaks, sweat, tuft, feather edge
    [["shield", 0, 0], ["shield", 0.6, 0], ["grin", 0, 1], ["grin", 0.6, -1]].forEach(([st, op, sm], i) => {
      const x = 110 + i * 150, y = 560;
      ctx.fillStyle = gv(0.95); ctx.fillRect(x - 65, y - 30, 130, 150);
      at(x, y, 2, () => drawBeak(ctx, { x: 0, y: 0, w: 30, l: 34, style: st, open: op, smirk: sm }));
      label(`${st} open ${op}${sm < 0 ? " left" : ""}`, x - 65, y + 150);
    });
    ctx.fillStyle = gv(0.95); ctx.fillRect(650, 530, 110, 150); drawSweat(ctx, { x: 705, y: 610, size: 40 }); label("drawSweat", 650, 710);
    at(900, 600, 1.4, () => {
      const H0 = headGeom({ x: 90, y: 90, rx: 100, ry: 90, square: 2.45, jowl: 0.3 });
      const T0 = tuftShape(H0, { at: 0.84, size: 54, width: 0.5, lean: -0.3, spikes: 3, fan: 0.6, curl: 0.4, seed: 5, valley: 0.6 });
      const E = featherEdge(H0.out, { step: 22, depth: 13, lean: 0.9, from: 0.55, to: 0.97, seed: 3 });
      plumage(ctx, polyPathFn(E), { base: 0.97, shade: 0.8, depth: 30, blur: 10 });
      plumage(ctx, blobPath(T0.pts), { base: 0.96, shade: 0.8, depth: 10, blur: 5 });
      const eyes = [-1, 1].map((sd) => { const q = H0.P(sd * 0.47, -0.3); return { x: q.x, y: q.y, nz: q.nz, side: sd, r: 24, sx: 1 }; });
      discLine(ctx, H0, eyes, {});
      for (const e of eyes) drawEye(ctx, { ...e, state: "glossy" });
    });
    label("featherEdge head + spiky tuft + discLine", 900, 560);
    ctx.restore(); return;
  }
  if (page === 6) {
    // F4c parts: the new eye states at two sizes, looks, on a plumage patch
    setPPU(1);
    const st6 = ["glossy", "tired", "sly", "scowl", "pin", "shut"];
    st6.forEach((st, i) => {
      const x = 150 + i * 330, y = 190;
      ctx.fillStyle = gv(0.955); ctx.fillRect(x - 150, y - 150, 300, 300);
      drawEye(ctx, { x: x - 62, y, r: 52, side: -1, state: st, look: [0.2, 0.1] });
      drawEye(ctx, { x: x + 62, y, r: 52, side: 1, state: st, look: [0.2, 0.1] });
      label(st, x - 140, y + 175);
    });
    [[-1, 0], [1, 0], [0, -1], [0, 1], [0.7, 0.7]].forEach((lk, i) => {
      const x = 150 + i * 200, y = 560;
      ctx.fillStyle = gv(0.955); ctx.fillRect(x - 90, y - 80, 180, 160);
      drawEye(ctx, { x: x - 40, y, r: 34, side: -1, state: "glossy", look: lk, lookGain: 2 });
      drawEye(ctx, { x: x + 40, y, r: 34, side: 1, state: "glossy", look: lk, lookGain: 2 });
      label(`glossy [${lk}]`, x - 85, y + 110);
    });
    ["sly", "scowl", "tired"].forEach((st, i) => [[-1, 0], [1, 0]].forEach((lk, j) => {
      const x = 1180 + (i * 2 + j) * 170, y = 560;
      ctx.fillStyle = gv(0.955); ctx.fillRect(x - 80, y - 80, 160, 160);
      drawEye(ctx, { x: x - 36, y, r: 30, side: -1, state: st, look: lk });
      drawEye(ctx, { x: x + 36, y, r: 30, side: 1, state: st, look: lk });
      label(`${st} ${lk[0]}`, x - 75, y + 110);
    }));
    ctx.restore(); return;
  }
  if (page === 5) {
    const cells = [
      ["wingUp", {}, 0.62, "wingUp (s13)"], ["tumble", {}, 0.55, "tumble (rot 2.3)"], ["hold", {}, 0.7, "hold (arms forward)"],
      ["angry", { extra: (g, geo) => { g.save(); g.translate(geo.beak.x + 8, geo.beak.y + 36); g.rotate(-0.5); g.strokeStyle = LINE; g.lineWidth = 3; g.fillStyle = gv(0.9); for (const sx of [-1, 1]) { g.beginPath(); g.moveTo(0, 0); g.lineTo(sx * 90, -18); g.lineTo(sx * 90, -8); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.ellipse(-sx * 18, 10, 12, 8, 0, 0, TAU); g.stroke(); } g.restore(); } }, 0.5, "angry + extra (prop)"],
      ["front", { eyes: { look: [-0.9, 0], over: { lookGain: 2.4 } } }, 0.62, "look left (lookGain 2.4)"], ["front", { eyes: { state: "wide", look: [0.9, -0.5] } }, 0.62, "wide, look up-right"],
      ["front", { eyes: { state: "half" }, head: { roll: 0.2 } }, 0.62, "half + roll"], ["smirk", { flip: true }, 0.62, "smirk flip"],
      ["fly", { rot: -0.5 }, 0.4, "fly banking"], ["flyDown", { rot: 0.4 }, 0.4, "flyDown banking"], ["walk", { flip: true }, 0.62, "walk flip (left)"],
      ["hips", { eyes: { state: "glare" } }, 0.62, "hips + glare"], ["startled", {}, 0.2, "startled s=0.2"], ["sit3q", { eyes: { state: "sleepy" } }, 0.45, "sit3q sleepy"],
      ["frontStand", { head: { yaw: 0.45 }, headphones: { yaw: 0.45 } }, 0.62, "head yaw 0.45"], ["carry", { rot: 0.2 }, 0.5, "carry tilted"],
    ];
    const cols = 8, cw = W / cols, ch = H / 2;
    cells.forEach(([name, over, sc, text], i) => {
      const c = i % cols, r = Math.floor(i / cols), cx = c * cw + cw / 2, cy = r * ch + ch * 0.58;
      drawOwl(ctx, { ...owlPose(name, over), x: cx + (name === "sit3q" ? 40 : 0), y: cy, s: sc });
      label(text, c * cw + 12, r * ch + 26);
    });
    ctx.restore(); return;
  }
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
