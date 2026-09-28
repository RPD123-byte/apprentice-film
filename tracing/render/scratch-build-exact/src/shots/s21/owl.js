// s21's owl, drawn in code: a side-on (facing right) white owl with an angry V brow, a small hooked beak, dark
// headphones on the back of the head, a plump feathered body, a pointed layered tail, feathered legs with splayed
// talons, and wings made of separate layered feathers (a big front wing wrapped round the scissors' grip while it
// walks and cuts; two spread "angel" wings in flight). Built from the owl kit's parts (eye, beak, bandage, plumage,
// ink) but with its own silhouette, because the kit's rounded "chick" does not match this shot's drawing.
//
// Units: head radius = 100; origin = the head centre; x right (the way it faces), y down. A pose is placed in the
// frame by (x, y) = the head centre in frame px and s = frame px per unit.
import { plumage, softShade, ink, flick, drawBeak, drawBandage, headGeom, setPPU, gv, LINE, V, rimHatch, fringe } from "../../lib/owlInk.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { taper } from "../../lib/ink.js";
import { rng, clamp, lerp, noise2 } from "../../lib/rng.js";

const { add, sub, mul, nrm, perp } = V;
const TAU = Math.PI * 2;
const blob = (pts) => (c) => smoothPath(c, pts, true);
const LIGHT = [-0.6, -0.8];

// ---------------------------------------------------------------- pose interpolation
// Deep linear blend of two poses (numbers and arrays of numbers; other values come from b when u > 0.5).
export function mixPose(a, b, u) {
  if (u <= 0) return a;
  if (u >= 1) return b;
  if (typeof a === "number" && typeof b === "number") return a + (b - a) * u;
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.map((v, i) => mixPose(v, b[i], u));
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const o = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = k in a && k in b ? mixPose(a[k], b[k], u) : (k in b ? b[k] : a[k]);
    return o;
  }
  return u < 0.5 ? a : b;
}
export function over(a, b) {
  if (!b) return a;
  const o = { ...a };
  for (const k of Object.keys(b)) {
    const v = b[k];
    o[k] = v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k]) ? over(a[k], v) : v;
  }
  return o;
}

// ---------------------------------------------------------------- feathers
// A pointed leaf of a feather from `root` along `dir`: length L, half-width w, tip bent sideways by `bend` (× L).
function featherPts(root, dir, L, w, bend = 0, pointy = 0) {
  const n = perp(dir);
  const P = (a, b) => add(add(root, mul(dir, L * a)), mul(n, w * b * (a > 0.6 ? 1 - pointy * (a - 0.6) * 1.6 : 1) + bend * L * a * a));
  return [P(-0.02, -0.55), P(0.3, -0.98), P(0.72, -0.85), P(0.94, -0.42), P(1, 0.05), P(0.92, 0.5), P(0.65, 0.95), P(0.25, 0.98), P(-0.02, 0.55)];
}
// Paint one feather: a pale fill shaded across its width, a grey keyline (darker on the side away from the light),
// a faint shaft.
function paintFeather(g, f, o = {}) {
  const { base = 0.95, dark = 0.82, line = 0.42, lw = 1.1, shaft = true, alpha = 0.6 } = o;
  const pts = featherPts(f.root, f.dir, f.L, f.w, f.bend || 0, f.pointy || 0);
  const n = perp(f.dir), c = add(f.root, mul(f.dir, f.L * 0.5));
  const lightSide = n[0] * LIGHT[0] + n[1] * LIGHT[1] > 0 ? 1 : -1;
  const gr = g.createLinearGradient(c[0] + n[0] * f.w * lightSide, c[1] + n[1] * f.w * lightSide, c[0] - n[0] * f.w * lightSide, c[1] - n[1] * f.w * lightSide);
  gr.addColorStop(0, gv(base)); gr.addColorStop(0.55, gv(base - 0.02)); gr.addColorStop(1, gv(dark));
  g.beginPath(); smoothPath(g, pts, true); g.fillStyle = gr; g.fill();
  g.lineJoin = "round";
  // a faint keyline all round, and a firmer tapered edge along the shadow side and round the tip
  g.strokeStyle = gv(line, alpha * 0.35); g.lineWidth = lw * 0.8; g.stroke();
  const edge = lightSide > 0 ? pts.slice(1, 6) : pts.slice(3, 8).reverse();
  ink(g, edge, lw * 1.5, gv(line, alpha), { end: 0.15, bias: 0.6 });
  if (shaft && f.L > 40) ink(g, [add(f.root, mul(f.dir, f.L * 0.12)), add(add(f.root, mul(f.dir, f.L * 0.55)), mul(n, (f.bend || 0) * f.L * 0.25)), add(add(f.root, mul(f.dir, f.L * 0.85)), mul(n, (f.bend || 0) * f.L * 0.7))], lw * 0.6, gv(0.55, 0.45), { end: 0.1 });
}

// A wing as layered feathers along the bones S → Wr → T. trail: unit direction the feathers hang (away from the
// leading edge); len: primary length; fan 0..1: how far the primaries swing from `trail` toward the hand direction.
// Returns { feathers (back to front), band (leading-edge coverts outline), lead }.
export function wingGeom(w) {
  const { S, Wr, T, trail, len = 100, nP = 7, nS = 5, fan = 0.8, cov = 0.42, secL = 0.72, seed = 5, bend = 0.06, tipX = 0.25 } = w;
  const r = rng(seed);
  const tr = nrm(trail), hand = nrm(sub(T, Wr)), arm = nrm(sub(Wr, S));
  // which way the feathers bend: toward the wing's outer end
  const side = Math.sign(tr[0] * hand[1] - tr[1] * hand[0]) || 1;
  const P = [], Sd = [], C = [];
  for (let i = 0; i < nP; i++) {
    const f = nP === 1 ? 1 : i / (nP - 1);
    const root = V.mix(Wr, T, 0.08 + 0.92 * f);
    const dir = nrm(V.mix(tr, hand, clamp(lerp(0.15, 1.0, Math.pow(f, 0.85)) * fan)));
    P.push({ root, dir, L: len * (0.8 + tipX * f + 0.08 * r()) * (1 - 0.08 * (1 - f)), w: len * (w.pw ?? 0.15), bend: -side * bend, pointy: w.pointy ?? 0.55 });
  }
  for (let j = 0; j < nS; j++) {
    const f = (j + 0.5) / nS;
    const root = V.mix(S, Wr, 0.12 + 0.88 * f);
    const dir = nrm(V.mix(tr, hand, 0.1 * f));
    Sd.push({ root, dir, L: len * secL * (0.9 + 0.12 * f + 0.08 * r()), w: len * (w.sw ?? 0.19), bend: -side * bend * 0.5, pointy: (w.pointy ?? 0.55) * 0.6 });
  }
  const lead = sampleCurve([S, V.mix(S, Wr, 0.5), Wr, V.mix(Wr, T, 0.5), T], 5);
  const nC = nS + Math.ceil(nP * 0.6);
  for (let k = 0; k < nC; k++) {
    const f = (k + 0.5) / nC;
    const i = Math.min(lead.length - 1, Math.floor(f * (lead.length - 1) * 0.85));
    const dir = nrm(V.mix(tr, hand, 0.25 * f));
    C.push({ root: lead[i], dir, L: len * cov * (1 - 0.35 * f) * (0.9 + 0.2 * r()), w: len * 0.18 * (1 - 0.3 * f), bend: -side * bend * 0.4 });
  }
  // the covert band: from the lead line out to ~0.26·len toward trail, thinning to the tip
  const band = [...lead];
  for (let i = lead.length - 1; i >= 0; i--) { const f = i / (lead.length - 1); band.push(add(lead[i], mul(nrm(V.mix(tr, hand, 0.2 * f)), len * (w.band ?? 0.3) * (1 - 0.7 * f) + 4))); }
  // back to front: the outer primaries first, then inward; the secondaries from the hand to the body; the coverts
  const feathers = [...P.slice().reverse().map((f) => ({ ...f, k: "p" })), ...Sd.slice().reverse().map((f) => ({ ...f, k: "s" })), ...C.map((f) => ({ ...f, k: "c" }))];
  return { feathers, band, lead, tr, hand };
}
function paintWing(g, W, o = {}) {
  const { base = 0.95, lw = 1.1, shadow = null, keyline = 0.28 } = o;
  const shapes = W.feathers.map((f) => featherPts(f.root, f.dir, f.L, f.w, f.bend || 0, f.pointy || 0));
  const all = (c) => { for (const sh of shapes) smoothPath(c, sh, true); smoothPath(c, W.band, true); };
  // the wing's shadow on the body under it (soft, down and away from the light)
  if (shadow) {
    g.save(); g.beginPath(); shadow(g); g.clip();
    g.filter = `blur(${Math.max(0.5, 5 * o.ppu).toFixed(2)}px)`;
    g.translate(8, 12); g.fillStyle = gv(0.5, 0.35); g.beginPath(); all(g); g.fill();
    g.filter = "none"; g.restore();
  }
  // one keyline round the whole wing (drawn under the fills, so only the outer edge shows)
  g.save(); g.lineJoin = "round"; g.strokeStyle = gv(keyline, 0.75); g.lineWidth = lw * 2.2;
  for (const sh of shapes) { g.beginPath(); smoothPath(g, sh, true); g.stroke(); }
  g.beginPath(); smoothPath(g, W.band, true); g.stroke();
  g.restore();
  for (const f of W.feathers) paintFeather(g, f, { base: f.k === "c" ? base + 0.01 : base, dark: f.k === "p" ? base - 0.16 : base - 0.12, lw: f.k === "c" ? lw * 0.8 : lw, line: f.k === "c" ? 0.55 : 0.36, alpha: f.k === "c" ? 0.22 : 0.7, shaft: f.k === "p" });
  plumage(g, blob(W.band), { base: base + 0.02, shade: base - 0.06, light: LIGHT, depth: 10, blur: 6 });
  ink(g, W.lead, lw * 1.5, gv(0.3, 0.7), { end: 0.2 });
}

// ---------------------------------------------------------------- legs
// hip → foot (units); toe = toe length; face = +1 facing right. lift 0..1 lifts the toes (walking swing / flight).
function paintLeg(g, L, o = {}) {
  const { hip, foot, toe = 34, w = 12, lift = 0, curl = 0, thigh = 30 } = L;
  const face = 1;
  const d = sub(foot, hip), len = V.len(d), u = nrm(d), n = perp(u);
  const knee = add(V.mix(hip, foot, 0.35), mul(n, face * len * 0.06));
  // tarsus: pale, dark keyline, a few scale rings
  const q = sampleCurve([knee, V.mix(knee, foot, 0.5), foot], 5);
  taper(g, q, (t) => w * (1.25 - 0.3 * t) + 2.4, LINE);
  taper(g, q, (t) => w * (1.25 - 0.3 * t), gv(0.84));
  for (let k = 1; k < 4; k++) { const p = V.mix(knee, foot, 0.25 + k * 0.18); ink(g, [add(p, mul(n, -w * 0.5)), add(p, mul(n, w * 0.5))], 1.0, gv(0.35, 0.6)); }
  // toes: three forward (splayed), one back; lifted toes point down, curled ones hang
  const fw = V.rot([face, 0], lift * 0.9 + curl * 1.2);
  const toes = [[-0.42, 1.0], [0.02, 1.12], [0.4, 0.9]];
  for (const [a, k] of toes) {
    const dir = nrm(add(V.rot(fw, a * 0.55 * (1 - 0.4 * curl)), [0, 0.28 + 0.4 * curl]));
    const e = add(foot, mul(dir, toe * k)), m = add(add(foot, mul(dir, toe * k * 0.5)), mul(perp(dir), -toe * 0.06));
    const tq = sampleCurve([foot, m, e], 4);
    taper(g, tq, (t) => w * (0.95 - 0.35 * t) + 2.2, LINE);
    taper(g, tq, (t) => w * (0.95 - 0.35 * t), gv(0.86));
    // claw
    const cd = V.rot(dir, 0.6), tip = add(e, mul(cd, toe * 0.28));
    ink(g, [add(e, mul(dir, -2)), add(e, mul(cd, toe * 0.14)), tip], w * 0.5, LINE, { end: 0.1, bias: 0.2 });
  }
  const bd = nrm(add(V.rot([-face, 0], -lift * 0.5), [0, 0.35]));
  const be = add(foot, mul(bd, toe * 0.55));
  const bq = sampleCurve([foot, V.mix(foot, be, 0.5), be], 3);
  taper(g, bq, (t) => w * (0.85 - 0.3 * t) + 2.2, LINE);
  taper(g, bq, (t) => w * (0.85 - 0.3 * t), gv(0.84));
  ink(g, [be, add(be, mul(V.rot(bd, -0.6), toe * 0.2))], w * 0.45, LINE, { end: 0.1 });
  // feathered thigh ("trousers") over the top of the leg
  const tc = V.mix(hip, knee, 0.55);
  const th = [add(hip, mul(n, -thigh * 0.8)), add(tc, mul(n, -thigh * 0.75)), add(knee, mul(n, -w * 0.9)), add(add(knee, mul(u, w * 0.8)), mul(n, w * 0.2)), add(knee, mul(n, w * 1.0)), add(tc, mul(n, thigh * 0.7)), add(hip, mul(n, thigh * 0.8))];
  g.beginPath(); smoothPath(g, th, true); g.fillStyle = gv(0.9); g.fill();
  ink(g, th.slice(1, 6), 1.2, gv(0.3, 0.6), { end: 0.2 });
  for (let k = 0; k < 3; k++) flick(g, add(knee, mul(n, (k - 1) * w * 0.7)), nrm(add(mul(u, -1), mul(n, (k - 1) * 0.2))), thigh * 0.6, 1.0, gv(0.45, 0.5));
}

// ---------------------------------------------------------------- the head: a sphere with the kit's projection
// (yaw, then pitch about the screen's x axis, then roll in the screen plane) plus a NOD about the head's own
// ear-to-ear axis applied first (+ = the face drops; in near-profile the cups stay put while the beak goes down).
// X right, Y down, Z toward the viewer when the head faces us (yaw 0).
function P3(H, X, Y, Z, lift = 1) {
  const cn = Math.cos(H.nod), sn = Math.sin(H.nod);
  const Y0 = Y * cn + Z * sn, Z0 = -Y * sn + Z * cn;
  const x1 = X * Math.cos(H.yaw) + Z0 * Math.sin(H.yaw), z1 = -X * Math.sin(H.yaw) + Z0 * Math.cos(H.yaw);
  const y2 = Y0 * Math.cos(H.pitch) - z1 * Math.sin(H.pitch), z2 = Y0 * Math.sin(H.pitch) + z1 * Math.cos(H.pitch);
  const p = H.toFrame(x1 * H.rx * lift, y2 * H.ry * lift);
  return { x: p[0], y: p[1], z: z2 };
}
function headModel(h) {
  const H = headGeom({ x: 0, y: 0, rx: h.r ?? 100, ry: h.r ?? 100, yaw: h.yaw, pitch: h.pitch || 0, roll: h.roll || 0, square: 2.0, jowl: 0.08 });
  H.nod = h.nod || 0;
  // P(az, el, lift) through the nod as well; nx/ny/nz as in headGeom (nz > 0 faces the viewer)
  H.P = (az, el, lift = 1) => { const n = sph(az, el), q = P3(H, n[0], n[1], n[2], lift); return { x: q.x, y: q.y, nz: q.z }; };
  return H;
}
const sph = (az, el) => [Math.sin(az) * Math.cos(el), -Math.sin(el), Math.cos(az) * Math.cos(el)];

// ---------------------------------------------------------------- headphones
// The near cup sits on the ear (az = −π/2 + cupAz); the band runs from ear to ear over the crown in a plane tilted
// back by bandTilt (the source wears them tipped back, so the band crosses behind the top of the head).
function cupGeom(H, hp) {
  const az = -Math.PI / 2 + (hp.cupAz ?? 0.05), el = hp.cupEl ?? 0.05;
  const n = sph(az, el), c = P3(H, n[0], n[1], n[2], hp.cupLift ?? 1.0), o = P3(H, 0, 0, 0);
  // the disc faces along the ear normal: foreshortened along its projected direction
  const dx = c.x - o.x, dy = c.y - o.y;
  const fx = Math.max(0.3, Math.abs(c.z));
  return { c, nz: c.z, fx, ang: Math.hypot(dx, dy) > 1e-3 ? Math.atan2(dy, dx) : H.roll };
}
function paintCup(g, H, hp) {
  const { c, fx, ang } = cupGeom(H, hp);
  const r = hp.r ?? 44, lit = hp.lit ?? 0, th = r * 0.25;
  const out = [Math.cos(ang), Math.sin(ang)];
  const E = (x, y, a, b) => (q) => q.ellipse(x, y, Math.max(1, a), Math.max(1, b), ang, 0, TAU);
  // the cushion against the head, the shell pushed out along the ear normal (shows as a crescent on one side)
  const k = 1 - fx;
  const cx = c.x - out[0] * th * k * 0.5, cy = c.y - out[1] * th * k * 0.5;
  const sx = c.x + out[0] * th * k, sy = c.y + out[1] * th * k;
  g.fillStyle = gv(lerp(0.08, 0.3, lit)); g.beginPath(); E(cx, cy, r * fx + 5, r * 1.02 + 5)(g); g.fill();
  g.fillStyle = gv(lerp(0.2, 0.62, lit)); g.beginPath(); E(cx, cy, r * fx, r * 1.0)(g); g.fill();
  g.fillStyle = gv(lerp(0.1, 0.3, lit)); g.beginPath(); E(sx, sy, r * fx * 0.84 + 4, r * 0.86 + 4)(g); g.fill();
  const shell = E(sx, sy, r * fx * 0.84, r * 0.86);
  g.fillStyle = gv(lerp(0.3, 0.72, lit)); g.beginPath(); shell(g); g.fill();
  // plate: lit from the upper left, a darker rim ring
  softShade(g, shell, E(sx - r * 0.25, sy - r * 0.3, r * fx * 0.45, r * 0.45), lerp(0.42, 0.86, lit), 0.8, r * 0.22);
  g.strokeStyle = gv(lerp(0.14, 0.45, lit), 0.9); g.lineWidth = r * 0.06; g.beginPath(); E(sx, sy, r * fx * 0.6, r * 0.62)(g); g.stroke();
  if (lit > 0.3) { g.strokeStyle = gv(0.95, 0.6 * lit); g.lineWidth = r * 0.05; g.beginPath(); g.ellipse(sx, sy, r * fx * 0.76, r * 0.8, ang, Math.PI * 0.95, Math.PI * 1.55); g.stroke(); }
}
function bandPts(H, hp) {
  const az0 = -Math.PI / 2 + (hp.cupAz ?? 0.05), el = hp.cupEl ?? 0.05;
  const c0 = sph(az0, el), c1 = sph(-az0, el);
  const e = nrm3(sub3(c1, c0)), mid = mul3(add3(c0, c1), 0.5), half = len3(sub3(c1, c0)) / 2;
  // "up" (Y is down) tilted back (−Z) by bandTilt, made orthogonal to the ear axis
  const tau = hp.bandTilt ?? 0.4;
  let u = [0, -Math.cos(tau), -Math.sin(tau)];
  u = nrm3(sub3(u, mul3(e, dot3(u, e))));
  const lift = hp.bandLift ?? 1.1, R = hp.bandH ?? 1.02;
  const pts = [];
  for (let i = 0; i <= 36; i++) {
    const ph = Math.PI * (1 - i / 36);
    const q = add3(add3(mid, mul3(e, half * Math.cos(ph) * lift)), mul3(u, R * Math.sin(ph) * lift));
    const f = P3(H, q[0], q[1], q[2]);
    pts.push({ p: [f.x, f.y], z: f.z, u: i / 36 });
  }
  return pts;
}
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul3 = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len3 = (a) => Math.hypot(a[0], a[1], a[2]), nrm3 = (a) => mul3(a, 1 / (len3(a) || 1));
function paintBand(g, H, hp, front) {
  const pts = bandPts(H, hp), w = hp.bandW ?? 14, lit = hp.lit ?? 0;
  const segs = [];
  let cur = null;
  for (const b of pts) {
    const f = b.z >= -0.02;
    if (!cur || cur.f !== f) { cur = { f, pts: cur ? [cur.pts[cur.pts.length - 1]] : [] }; segs.push(cur); }
    cur.pts.push(b.p);
  }
  for (const sg of segs) {
    if (sg.f !== front || sg.pts.length < 2) continue;
    taper(g, sg.pts, () => w + 5, gv(lerp(0.06, 0.25, lit)));
    taper(g, sg.pts, () => w, gv(lerp(0.26, 0.6, lit)));
    taper(g, sg.pts.map((p) => add(p, mul(nrm(sub(p, [H.x, H.y])), w * 0.25))), () => w * 0.28, gv(lerp(0.45, 0.88, lit), 0.8));
  }
}

// ---------------------------------------------------------------- the eye (the source's: a white almond under a
// straight lid that drops toward the beak, a dark pupil looking forward, and a heavy brow wedge above)
function paintEye(g, H, E, sd) {
  const q = H.P(sd * (E.az ?? 0.5), E.el ?? -0.2);
  const nz = q.nz;
  if (nz < (sd < 0 ? 0.08 : (E.farVis ?? 0.3))) return;
  const sx = 0.35 + 0.65 * nz, inner = sd < 0 ? 1 : -1;
  const rx = (E.rx ?? 19) * sx * (0.8 + 0.2 * nz), ry = (E.ry ?? 14) * (0.8 + 0.2 * nz);
  const open = E.open ?? 0, look = E.look || [0.7, 0.1];
  g.save(); g.translate(q.x, q.y); g.rotate(H.roll + (E.tilt ?? 0));
  // upper edge: from the outer corner (higher) to the inner corner (lower, toward the beak), bowed up a little
  const yO = -ry * ((E.outer ?? 0.35) + 0.5 * open), yI = ry * ((E.inner ?? 0.15) - 0.6 * open);
  const top = (x) => lerp(yO, yI, (x * inner / rx + 1) / 2) - ry * 0.18 * (1 - (x / rx) ** 2);
  const bot = (x) => ry * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2));
  const opening = (c) => {
    for (let i = 0; i <= 16; i++) { const x = -rx + (2 * rx * i) / 16; i ? c.lineTo(x, top(x)) : c.moveTo(x, top(x)); }
    for (let i = 16; i >= 0; i--) { const x = -rx + (2 * rx * i) / 16; c.lineTo(x, Math.max(top(x), bot(x))); }
    c.closePath();
  };
  g.fillStyle = gv(0.97); g.beginPath(); opening(g); g.fill();
  g.save(); g.beginPath(); opening(g); g.clip();
  const pr = ry * (E.pupil ?? 0.5);
  g.fillStyle = "#070707"; g.beginPath(); g.ellipse(inner * look[0] * rx * 0.5, ry * 0.05 + look[1] * ry * 0.55, pr * Math.max(0.65, sx), pr, 0, 0, TAU); g.fill();
  g.restore();
  // lower rim (thin), the lid (heavy, flicking up past the outer corner), a fold line above the lid
  const rim = []; for (let i = 0; i <= 12; i++) { const x = -rx * 0.92 + (1.84 * rx * i) / 12; rim.push([x, Math.max(top(x), bot(x))]); }
  ink(g, rim, ry * 0.16, LINE, { end: 0.25 });
  const lid = [[-inner * rx * 1.28, yO - ry * 0.3]];
  for (let i = 0; i <= 10; i++) { const x = -inner * rx + (2 * inner * rx * i) / 10; lid.push([x, top(x)]); }
  ink(g, lid, ry * (E.lidW ?? 0.42), "#070707", { end: 0.2, bias: 0.4 });
  // brow: a long dark stroke above, lower toward the beak and reaching past the eye; seen from the side the far brow
  // shows as a short stroke rising from its front end (the angry V over the beak)
  const bw = E.brow ?? 1.0;
  const bO = -ry * (E.outer ?? 0.35), bI = ry * (E.inner ?? 0.15);   // the brow follows the resting lid, not the open one
  const B = [[-inner * rx * 1.15, bO - ry * 1.55], [0, lerp(bO, bI, 0.45) - ry * 1.05], [inner * rx * 1.5, bI - ry * 0.2]];
  taper(g, sampleCurve(B, 5), (t) => ry * bw * (inner > 0 ? 0.1 + 0.34 * Math.sin(Math.PI * Math.min(1, 0.25 + t * 0.7)) : 0.44 - 0.34 * t), "#080808");
  if (E.vbrow && inner > 0) ink(g, [B[2], [inner * rx * 1.72, bI - ry * 0.8], [inner * rx * 1.9, bI - ry * 1.45]], ry * 0.34 * E.vbrow, "#080808", { end: 0.15, bias: 0.3 });
  g.restore();
}

// ---------------------------------------------------------------- the whole owl
// P: {
//   head: { yaw, pitch, roll }, body: { x, y, a, b, rot, egg }, tail: { base, tip, w, n },
//   legs: [{ hip, foot, toe, w, lift, curl, far }], wings: [{ S, Wr, T, trail, len, nP, nS, fan, layer: 'back'|'mid'|'front' }],
//   eye: { state, look, az, el, r, over: {...} }, beak: { el, lift, w, l, rot }, phones: { cupAz, cupEl, r, lit },
//   bandage: { az, el, size, rot } }
// place: { x, y, s, res, canvas, extent: [x0,y0,x1,y1] frame rect that must be included (props), mid(g) — drawn in
// frame px between the head and the front wing (the scissors) }
export function owlSprite(P, place) {
  const { x, y, s, res = 2 } = place;
  const toF = (p) => [x + p[0] * s, y + p[1] * s];
  const H = headModel(P.head);
  {
    // the face pushes the outline out a little round the beak (brow ridge, cheeks)
    const fq = H.P(0, (P.beak?.el ?? -0.4) + 0.25, 1);
    const fa = Math.atan2(fq.y, fq.x), amp = (P.head.bump ?? 9) * Math.max(0, Math.hypot(fq.x, fq.y) / 100);
    H.out = H.out.map((p) => { const a = Math.atan2(p[1], p[0]); let d = a - fa; d = Math.atan2(Math.sin(d), Math.cos(d)); const k = Math.exp(-(d * d) / (2 * 0.45 * 0.45)); const l = Math.hypot(p[0], p[1]); return [p[0] * (1 + amp * k / l), p[1] * (1 + amp * k / l)]; });
  }
  const B = P.body;
  const bodyPts = [];
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * TAU;
    const v = Math.sin(t) * B.b * (1 - (B.egg || 0) * Math.cos(t));
    bodyPts.push(add([B.x, B.y], V.rot([Math.cos(t) * B.a, v], B.rot)));
  }
  const tail = P.tail ? tailFeathers(P.tail) : [];
  const wings = (P.wings || []).map((w) => ({ ...w, G: wingGeom(w) }));
  // bounds
  const all = [...H.out, ...bodyPts];
  tail.forEach((f) => all.push(add(f.root, mul(f.dir, f.L))));
  wings.forEach((w) => w.G.feathers.forEach((f) => all.push(add(f.root, mul(f.dir, f.L * 1.05)))));
  (P.legs || []).forEach((l) => { all.push(l.foot, add(l.foot, [l.toe * 1.3, l.toe * 0.6]), add(l.foot, [-l.toe * 1.3, l.toe * 0.6])); });
  const hpR = (P.phones?.r ?? 44);
  const cg = P.phones ? cupGeom(H, P.phones) : null;
  if (cg) { all.push([cg.c.x - hpR, cg.c.y - hpR * 1.1], [cg.c.x + hpR, cg.c.y + hpR * 1.1]); bandPts(H, P.phones).forEach((b) => all.push(b.p)); }
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of all) { const f = toF(p); x0 = Math.min(x0, f[0]); y0 = Math.min(y0, f[1]); x1 = Math.max(x1, f[0]); y1 = Math.max(y1, f[1]); }
  if (place.extent) { const e = place.extent; x0 = Math.min(x0, e[0]); y0 = Math.min(y0, e[1]); x1 = Math.max(x1, e[2]); y1 = Math.max(y1, e[3]); }
  const m = 6;
  x0 = Math.floor(x0 - m); y0 = Math.floor(y0 - m); x1 = Math.ceil(x1 + m); y1 = Math.ceil(y1 + m);
  const cw = Math.max(1, Math.round((x1 - x0) * res)), ch = Math.max(1, Math.round((y1 - y0) * res));
  const cv = place.canvas || document.createElement("canvas");
  if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
  const g = cv.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch);
  const unitT = () => g.setTransform(res * s, 0, 0, res * s, res * (x - x0), res * (y - y0));
  unitT();
  setPPU(s * res);
  const px = 1 / (s * res);           // one device pixel in units
  const LW = (dev) => dev * px;       // line width given in device px

  // ---- back wings, far leg, tail
  for (const w of wings) if (w.layer === "back") paintWing(g, w.G, { base: w.base ?? 0.91, lw: LW(1.3) });
  for (const l of P.legs || []) if (l.far) paintLeg(g, l);
  for (const f of tail) paintFeather(g, f, { base: 0.93, dark: 0.74, lw: LW(1.3), line: 0.3 });
  for (const l of P.legs || []) if (!l.far) paintLeg(g, l);

  // ---- trunk: head + body as one soft-white mass with a dark keyline round the union (each part is shaded as
  // part of the union, so there is no seam at the neck)
  const hpath = blob(H.out), bpath = blob(bodyPts);
  const trunk = (c) => { hpath(c); bpath(c); };
  g.save();
  g.lineJoin = "round"; g.strokeStyle = gv(0.22, 0.65); g.lineWidth = LW(1.7);
  g.beginPath(); hpath(g); g.stroke(); g.beginPath(); bpath(g); g.stroke();
  g.restore();
  const trunkFill = (clip) => { g.save(); g.beginPath(); clip(g); g.clip(); plumage(g, trunk, { base: 0.97, shade: 0.8, light: LIGHT, depth: 40, blur: 22, keep: [0, 60] }); g.restore(); };
  trunkFill(bpath);
  // the belly and the back of the body turn from the light
  softShade(g, bpath, (c) => { const q = add([B.x, B.y], V.rot([B.a * 0.1, B.b * 0.95], B.rot)); c.ellipse(q[0], q[1], B.a * 0.9, B.b * 0.35, B.rot, 0, TAU); }, 0.7, 0.2, B.b * 0.2);
  // feather texture: shadow-side hatching round the silhouette, scallops across the chest and belly
  rimHatch(g, bodyPts, { light: LIGHT, flow: [-0.3, 1], len: 22, step: 5, w: LW(1.1), color: gv(0.4, 0.5), seed: 12, density: 0.9, bend: 0.5 });
  scallops(g, bpath, B, LW(1.0), P.scallopSeed || 3);
  fringe(g, bodyPts, { step: 16, len: 7, w: 9, color: gv(0.93), ang: 0.9, seed: 5 });

  // ---- mid wings (the near spread wing: over the body, under the head)
  for (const w of wings) if (w.layer === "mid") paintWing(g, w.G, { base: w.base ?? 0.95, lw: LW(1.3), shadow: bpath, ppu: s * res });

  // ---- head: the far half of the headphone band (only its part above the crown shows), then the head
  if (P.phones) paintBand(g, H, P.phones, false);
  trunkFill(hpath);
  rimHatch(g, H.out, { light: LIGHT, flow: [-0.5, 1], len: 14, step: 5, w: LW(1.0), color: gv(0.42, 0.45), seed: 22, density: 0.8, thr: 0.15 });
  // the chin: the lower-front edge of the head over the chest
  const chin = []; for (let k = 0; k <= 8; k++) { const q = H.at((P.chin ?? 1.95) + k * 0.1); chin.push(add(q.p, mul(q.n, -3))); }
  ink(g, chin, LW(1.4), gv(0.3, 0.55), { end: 0.1 });

  // ---- face
  paintFace(g, H, P, LW);

  // ---- props between the head and the front wing (frame px)
  if (place.mid) { g.setTransform(res, 0, 0, res, -res * x0, -res * y0); setPPU(res); place.mid(g); unitT(); setPPU(s * res); }

  // ---- front wings (the grip wing over the scissors' handles)
  for (const w of wings) if (w.layer === "front") paintWing(g, w.G, { base: w.base ?? 0.97, lw: LW(1.3), shadow: trunk, ppu: s * res });

  g.setTransform(1, 0, 0, 1, 0, 0);
  // a faint painterly mottle over the whole bird (multiplied in, anchored to the head so it travels with the owl)
  mottle(cv, res * (x - x0), res * (y - y0), P.mottle ?? 0.07);
  const anchors = { head: [x, y], beak: toF(beakPoint(H, P)) };
  return { canvas: cv, x: x0, y: y0, w: x1 - x0, h: y1 - y0, anchors };
}

let NOISE = null, MOT = null;
function mottle(cv, ox, oy, amt) {
  if (!NOISE) {
    NOISE = document.createElement("canvas"); NOISE.width = NOISE.height = 256;
    const n = NOISE.getContext("2d"), id = n.createImageData(256, 256), d = id.data;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      // tileable: sample the noise on a torus-ish wrap by blending the four shifted copies
      const f = (u, v) => 0.6 * noise2(u / 2.6, v / 2.6, 7) + 0.4 * noise2(u / 8, v / 8, 11);
      const wx = x / 256, wy = y / 256;
      const v = f(x, y) * (1 - wx) * (1 - wy) + f(x - 256, y) * wx * (1 - wy) + f(x, y - 256) * (1 - wx) * wy + f(x - 256, y - 256) * wx * wy;
      const i = (y * 256 + x) * 4; d[i] = d[i + 1] = d[i + 2] = Math.round(255 * (1 - (0.5 + 0.5 * v))); d[i + 3] = 255;
    }
    n.putImageData(id, 0, 0);
    MOT = document.createElement("canvas");
  }
  if (MOT.width !== cv.width || MOT.height !== cv.height) { MOT.width = cv.width; MOT.height = cv.height; }
  const m = MOT.getContext("2d");
  m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = "copy"; m.drawImage(cv, 0, 0);
  m.globalCompositeOperation = "source-in";
  const pat = m.createPattern(NOISE, "repeat"); pat.setTransform(new DOMMatrix().translate(Math.round(ox), Math.round(oy)));
  m.fillStyle = pat; m.fillRect(0, 0, cv.width, cv.height);
  // the noise canvas holds 1 − n; multiply by (1 − amt·n): lerp the pattern toward white first
  m.globalCompositeOperation = "source-atop"; m.fillStyle = `rgba(255,255,255,${(1 - amt).toFixed(3)})`; m.fillRect(0, 0, cv.width, cv.height);
  const g = cv.getContext("2d");
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "multiply"; g.drawImage(MOT, 0, 0); g.restore();
}
function beakPoint(H, P) { const b = P.beak || {}; const q = H.P(0, b.el ?? -0.35, b.lift ?? 1.1); return [q.x, q.y]; }

function paintFace(g, H, P, LW) {
  const hp = P.phones;
  // soft shadow under the cup on the head
  if (hp) { const { c } = cupGeom(H, hp); if (c.z > -0.1) softShade(g, blob(H.out), (q) => q.ellipse(c.x + 8, c.y + 8, (hp.r ?? 44) * 0.9, (hp.r ?? 44) * 1.15, H.roll, 0, TAU), 0.6, 0.4, 12); }
  // bandage (crossed plasters) on the top of the head
  if (P.bandage) {
    const bd = P.bandage, q = H.P(bd.az, bd.el, 1.0);
    if (q.nz > -0.2) drawBandage(g, { x: q.x, y: q.y, size: bd.size ?? 36, rot: H.roll + (bd.rot ?? 0), sx: bd.sx ?? 1, sy: bd.sy ?? 0.8 });
  }
  const E = P.eye || {};
  for (const sd of [-1, 1]) paintEye(g, H, E, sd);
  const b = P.beak || {};
  const bq = H.P(0, b.el ?? -0.35, b.lift ?? 1.1);
  if (bq.nz > -0.6) drawBeak(g, { x: bq.x, y: bq.y, w: b.w ?? 26, l: b.l ?? 34, rot: H.roll + (b.rot ?? 0), turn: clamp(H.yaw * 1.2, -1, 1), open: b.open ?? 0 });
  if (hp) {
    const { c } = cupGeom(H, hp);
    paintBand(g, H, hp, true);
    if (c.z > -0.35) paintCup(g, H, hp);
  }
}

// sparse short curved feather marks across the body, following its flow (the source shows a few fine strokes, no
// regular pattern)
function scallops(g, bpath, B, lw, seed) {
  const r = rng(seed);
  g.save(); g.beginPath(); bpath(g); g.clip();
  g.lineCap = "round";
  for (let k = 0; k < 26; k++) {
    const u = (r() - 0.5) * 1.5, v = (r() - 0.35) * 1.4;
    const p = add([B.x, B.y], V.rot([u * B.a, v * B.b], B.rot));
    const d = V.rot([-0.35, 1], (r() - 0.5) * 0.6), L = 14 + 14 * r();
    flick(g, p, nrm(d), L, lw * (0.9 + 0.6 * r()), gv(0.5, 0.18 + 0.2 * r()), (r() - 0.5) * 0.5);
  }
  g.restore();
}

// tail: n pointed feathers fanned from base toward tip
function tailFeathers(t) {
  const { base, tip, w = 36, n = 3, fan = 0.1 } = t;
  const d = sub(tip, base), L = V.len(d), u = nrm(d);
  const out = [];
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0 : i / (n - 1) - 0.5;
    out.push({ root: add(base, mul(perp(u), f * w * 0.4)), dir: V.rot(u, f * fan * 2), L: L * (1 - 0.16 * Math.abs(f) * 2), w: w * 0.42, bend: f * 0.03, pointy: 0.8 });
  }
  return out;
}
