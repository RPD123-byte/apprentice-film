// s22's copy of src/shots/s21/owl.js (owned by the s21 agent; copied 2026-09-25T15:26), so that s22 draws the same bird as
// s21 across the 74.52 cut without depending on another shot's module. s22 changes are marked "(s22)".
// s21's owl, drawn in code: a side-on (facing right) white owl with an angry V brow, a small hooked beak, dark
// headphones on the back of the head, a plump feathered body, a pointed layered tail, feathered legs with splayed
// talons, and wings made of separate layered feathers (a big front wing wrapped round the scissors' grip while it
// walks and cuts; two spread "angel" wings in flight). Built from the owl kit's parts (eye, beak, bandage, plumage,
// ink) but with its own silhouette, because the kit's rounded "chick" does not match this shot's drawing.
//
// Units: head radius = 100; origin = the head centre; x right (the way it faces), y down. A pose is placed in the
// frame by (x, y) = the head centre in frame px and s = frame px per unit.
import { plumage, softShade, ink, flick, drawBeak, drawBandage, headGeom, tuftShape, setPPU, gv, LINE, V, rimHatch, fringe } from "../../lib/owlInk.js";
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
  g.save(); g.lineJoin = "round"; g.strokeStyle = gv(keyline, o.keyA ?? 0.4); g.lineWidth = lw * 2.0;
  for (const sh of shapes) { g.beginPath(); smoothPath(g, sh, true); g.stroke(); }
  g.beginPath(); smoothPath(g, W.band, true); g.stroke();
  g.restore();
  for (const f of W.feathers) paintFeather(g, f, { base: f.k === "c" ? base + 0.01 : base, dark: f.k === "p" ? base - 0.16 : base - 0.12, lw: f.k === "c" ? lw * 0.8 : lw, line: f.k === "c" ? 0.55 : 0.36, alpha: f.k === "c" ? 0.22 : 0.7, shaft: f.k === "p" });
  plumage(g, blob(W.band), { base: base + 0.02, shade: base - 0.06, light: LIGHT, depth: 10, blur: 6 });
  ink(g, W.lead, lw * 1.3, gv(0.35, 0.4), { end: 0.2 });
}

// ---------------------------------------------------------------- the grip wing as a fan (fix pass)
// Measured on 9x crops of the source at 70.40, 71.40, 71.92 and 74.00: the wing that holds the scissors is a white
// leaf pointing forward to the rings. Its top edge runs from the shoulder S to the hand tip A (the fingertips on the
// rings); its lower edge is serrated — a row of pointed feather tips from B (the lowest, back tip) round to A, sagging
// `sag` units below the straight B–A line. The feathers at the back (secondaries) point down-forward (θB), the long
// primaries along the lower edge sweep up to the hand (θP), the top one runs along the top edge. Each tip carries a
// grey separating line back into the wing along its feather; nothing else is outlined (the wing merges with the chest).
const DEG = Math.PI / 180;
export function fanGeom(w) {
  const { S, A, B, sag = 40, n = 8, thB = 60, thP = -25, lead = 0.02, notch = 0.4 } = w;
  const top = (v) => { const m = V.mix(S, A, 0.5), d = sub(A, S), nn = perp(nrm(d)), up = nn[1] > 0 ? mul(nn, -1) : nn; const c = add(m, mul(up, lead * V.len(d) * 2)); return bez2(S, c, A, v); };
  const dBA = sub(A, B); let nB = perp(nrm(dBA)); if (nB[1] < 0) nB = mul(nB, -1);
  const C = add(V.mix(B, A, 0.5), mul(nB, 2 * sag));
  const Q = (u) => bez2(B, C, A, u);
  const thT = Math.atan2(A[1] - S[1], A[0] - S[0]) / DEG;
  const ang = (u) => (u < 0.55 ? lerp(thB, thP, u / 0.55) : lerp(thP, thT, (u - 0.55) / 0.45)) * DEG;
  const Lb = V.len(sub(A, S));
  const len = (u) => (u < 0.55 ? lerp(0.22, 0.55, u / 0.55) : lerp(0.55, 0.62, (u - 0.55) / 0.45)) * Lb;
  const tips = [], F = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), t = Q(u), a = ang(u), d = [Math.cos(a), Math.sin(a)];
    tips.push(t); F.push({ tip: t, dir: d, L: len(u), u });
  }
  // the outline: S, the top edge to A, then back along the lower edge through the tips and the notches between them,
  // and up the (hidden) back edge to S
  const out = []; for (let k = 0; k <= 10; k++) out.push(top(k / 10));
  const notchP = (i) => { const um = (F[i].u + F[i + 1].u) / 2, m = Q(um), a = ang(um), d = [Math.cos(a), Math.sin(a)]; const gap = V.len(sub(F[i + 1].tip, F[i].tip)); return sub(m, mul(d, gap * notch * lerp(0.8, 1.8, um))); };
  const lower = [];
  for (let i = n - 1; i >= 0; i--) { lower.push({ p: F[i].tip, tip: true }); if (i > 0) lower.push({ p: notchP(i - 1), tip: false }); }
  const back = bez2(B, add(V.mix(B, S, 0.5), mul(nrm(sub(S, A)), 0.12 * Lb)), S, 0.5);
  return { S, A, B, top: out, lower, back, F, Q, Lb, notchP };
}
const bez2 = (a, c, b, t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
function fanPath(c, W) {
  c.moveTo(W.top[0][0], W.top[0][1]);
  for (const p of W.top.slice(1)) c.lineTo(p[0], p[1]);
  // pointed tips: straight into each tip, a slightly convex curve out of it into the notch
  let prev = W.top[W.top.length - 1];
  for (let k = 1; k < W.lower.length; k++) {
    const q = W.lower[k], p = W.lower[k - 1];
    const m = V.mix(p.p, q.p, 0.5), dd = sub(q.p, p.p), nn = perp(nrm(dd));
    // bulge outward (away from the wing's middle)
    const mid = V.mix(W.S, W.A, 0.5), out = V.len(sub(add(m, nn), mid)) > V.len(sub(m, mid)) ? nn : mul(nn, -1);
    const cp = add(m, mul(out, V.len(dd) * (q.tip ? 0.08 : 0.22)));
    c.quadraticCurveTo(cp[0], cp[1], q.p[0], q.p[1]);
    prev = q.p;
  }
  c.quadraticCurveTo(W.back[0], W.back[1], W.S[0], W.S[1]);
  c.closePath();
}
function paintFan(g, W, o = {}) {
  const { base = 0.96, lw = 1.1, shadow = null } = o;
  const path = (c) => fanPath(c, W);
  if (shadow) {
    // the fan's soft shadow on the chest under its lower edge
    g.save(); g.beginPath(); shadow(g); g.clip();
    g.filter = `blur(${Math.max(0.5, 6 * o.ppu).toFixed(2)}px)`;
    g.translate(3, 9); g.fillStyle = gv(0.55, 0.3); g.beginPath(); path(g); g.fill();
    g.filter = "none"; g.restore();
  }
  // a faint hairline round the outside (under the fill)
  // (s22) topLine: false leaves the top edge unlined, so the wing merges with the chest as in s22's drawing
  if (o.topLine === false) {
    g.save(); g.lineJoin = "round"; g.strokeStyle = gv(0.35, 0.3); g.lineWidth = lw * 1.6; g.beginPath();
    g.moveTo(W.lower[0].p[0], W.lower[0].p[1]); for (const q of W.lower.slice(1)) g.lineTo(q.p[0], q.p[1]); g.stroke(); g.restore();
  } else { g.save(); g.lineJoin = "round"; g.strokeStyle = gv(0.35, 0.3); g.lineWidth = lw * 1.6; g.beginPath(); path(g); g.stroke(); g.restore(); }
  // soft white, shaded down toward the serrated lower edge
  plumage(g, path, { base: base + 0.01, shade: base - 0.1, light: [0.15, -1], depth: W.Lb * 0.12, blur: W.Lb * 0.06 });
  // the feathers: a grey line from each notch back into the wing along the feather above it, and a fainter one
  // along each tip's lower side
  const r = rng(11);
  for (let i = 0; i < W.F.length - 1; i++) {
    const f = W.F[i + 1], m = W.notchP(i), L = f.L * (0.55 + 0.1 * r());
    const e = sub(m, mul(f.dir, L)), c = add(V.mix(m, e, 0.5), mul(perp(f.dir), L * 0.05));
    ink(g, [m, c, e], lw * 1.4 * (o.sepW ?? 1), gv(o.sepV ?? 0.34, 0.85), { end: 0.08, bias: 0.25 });
  }
  for (const f of W.F) {
    const t = f.tip, e = sub(t, mul(f.dir, f.L * 0.3));
    ink(g, [t, V.mix(t, e, 0.5), e], lw * 0.8, gv(0.5, 0.35), { end: 0.4, bias: 0.2 });
  }
  // a faint row of covert tips across the upper wing
  const cv = []; for (let k = 0; k <= 8; k++) { const v = 0.08 + 0.7 * (k / 8); cv.push(V.mix(bez2(W.S, W.S, W.A, v), W.Q(v * 0.8), 0.38)); }
  ink(g, cv, lw * 0.8, gv(0.55, 0.3), { end: 0.3 });
}

// ---------------------------------------------------------------- legs
// hip → foot (units); toe = toe length; face = +1 facing right. lift 0..1 lifts the toes (walking swing / flight).
function paintLeg(g, L, o = {}) {
  const { hip, foot, toe = 34, w = 12, lift = 0, curl = 0, thigh = 30, toeUp = 0 } = L;
  const face = 1;
  const d = sub(foot, hip), len = V.len(d), u = nrm(d), n = perp(u);
  const knee = add(V.mix(hip, foot, 0.35), mul(n, face * len * 0.06));
  // tarsus: pale, dark keyline, a few scale rings
  const q = sampleCurve([knee, V.mix(knee, foot, 0.5), foot], 5);
  taper(g, q, (t) => w * (1.25 - 0.3 * t) + 2.4, LINE);
  taper(g, q, (t) => w * (1.25 - 0.3 * t), gv(0.84));
  for (let k = 1; k < 4; k++) { const p = V.mix(knee, foot, 0.25 + k * 0.18); ink(g, [add(p, mul(n, -w * 0.5)), add(p, mul(n, w * 0.5))], 1.0, gv(0.35, 0.6)); }
  // toes: three forward (splayed), one back; lifted toes point down, curled ones hang
  // (toeUp: a stepping foot reaching forward with its toes raised — the source's walking swing)
  const fw = V.rot([face, 0], lift * 0.9 + curl * 1.2 - toeUp * 0.75);
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
  const H = headGeom({ x: 0, y: 0, rx: (h.r ?? 100) * (h.sx ?? 1), ry: (h.r ?? 100) * (h.sy ?? 1), yaw: h.yaw, pitch: h.pitch || 0, roll: h.roll || 0, square: h.square ?? 2.0, jowl: 0.08 });
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
  const fx = Math.max(hp.fxMin ?? 0.3, Math.abs(c.z));
  return { c, nz: c.z, fx, ang: Math.hypot(dx, dy) > 1e-3 ? Math.atan2(dy, dx) : H.roll };
}
// Cup tones: dark = the walk (the source's cup reads a flat dark grey, ~0.3 pre-grade, no black rim), lit = up in
// the light at the top margin (a soft mid-grey disc, ~0.65, only a faint rim ring)
const CUP_DARK = { edge: 0.16, cushion: 0.27, shellEdge: 0.2, shell: 0.33, hi: 0.42, rim: 0.25, gloss: 0 };
const CUP_LIT = { edge: 0.4, cushion: 0.6, shellEdge: 0.5, shell: 0.68, hi: 0.8, rim: 0.56, gloss: 0.35 };
function paintCup(g, H, hp) {
  const { c, fx, ang } = cupGeom(H, hp);
  const r = hp.r ?? 44, lit = hp.lit ?? 0, th = r * 0.25;
  const T = {}; for (const k of Object.keys(CUP_DARK)) T[k] = lerp(CUP_DARK[k], CUP_LIT[k], lit);
  const out = [Math.cos(ang), Math.sin(ang)];
  const E = (x, y, a, b) => (q) => q.ellipse(x, y, Math.max(1, a), Math.max(1, b), ang, 0, TAU);
  // the cushion against the head, the shell pushed out along the ear normal (shows as a crescent on one side)
  const k = 1 - fx;
  const cx = c.x - out[0] * th * k * 0.5, cy = c.y - out[1] * th * k * 0.5;
  const sx = c.x + out[0] * th * k, sy = c.y + out[1] * th * k;
  g.fillStyle = gv(T.edge); g.beginPath(); E(cx, cy, r * fx + 4, r * 1.02 + 4)(g); g.fill();
  g.fillStyle = gv(T.cushion); g.beginPath(); E(cx, cy, r * fx, r * 1.0)(g); g.fill();
  g.fillStyle = gv(T.shellEdge); g.beginPath(); E(sx, sy, r * fx * 0.84 + 3, r * 0.86 + 3)(g); g.fill();
  const shell = E(sx, sy, r * fx * 0.84, r * 0.86);
  g.fillStyle = gv(T.shell); g.beginPath(); shell(g); g.fill();
  // plate: lit from the upper left, a faint rim ring
  softShade(g, shell, E(sx - r * 0.25, sy - r * 0.3, r * fx * 0.45, r * 0.45), T.hi, 0.8, r * 0.22);
  g.strokeStyle = gv(T.rim, 0.8); g.lineWidth = r * 0.05; g.beginPath(); E(sx, sy, r * fx * 0.6, r * 0.62)(g); g.stroke();
  if (T.gloss > 0.02) { g.strokeStyle = gv(0.95, T.gloss); g.lineWidth = r * 0.05; g.beginPath(); g.ellipse(sx, sy, r * fx * 0.76, r * 0.8, ang, Math.PI * 0.95, Math.PI * 1.55); g.stroke(); }
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
  let pts = bandPts(H, hp);
  const w = hp.bandW ?? 14, lit = hp.lit ?? 0, tone = hp.bandTone ?? 0;
  // squeeze: pull the band's sideways spread in toward the near cup (the source draws it as a narrow loop standing
  // up off the back of the head while it walks, not a wide arc over the crown)
  if (hp.bandSq != null && hp.bandSq !== 1) {
    const cx = pts[0].p[0], k = hp.bandSq;
    pts = pts.map((b) => ({ ...b, p: [cx + (b.p[0] - cx) * k, b.p[1]] }));
  }
  const segs = [];
  let cur = null;
  for (const b of pts) {
    const f = b.z >= -0.02;
    if (!cur || cur.f !== f) { cur = { f, pts: cur ? [cur.pts[cur.pts.length - 1]] : [] }; segs.push(cur); }
    cur.pts.push(b.p);
  }
  for (const sg of segs) {
    if (sg.f !== front || sg.pts.length < 2) continue;
    taper(g, sg.pts, () => w + 4, gv(lerp(lerp(0.1, 0.42, lit), 0.26, tone)));
    taper(g, sg.pts, () => w, gv(lerp(lerp(0.24, 0.62, lit), 0.44, tone)));
    taper(g, sg.pts.map((p) => add(p, mul(nrm(sub(p, [H.x, H.y])), w * 0.25))), () => w * 0.28, gv(lerp(0.45, 0.88, lit), 0.8));
  }
}

// ---------------------------------------------------------------- the eye (pass 2, redrawn from 9x crops of the
// source at 70.80 / 71.20 / 74.00): a fully outlined white almond — the upper edge peaks behind the middle and falls
// to the front corner, the lower edge a round arc — with the pupil pushed into the front corner (or rolled up), and
// ONE heavy dark stroke on top of it (brow and lid in one) that starts above the back corner, swells along the top
// and ends past the front corner, where the far brow rises from it in the angry V.
// fix pass: redrawn again from 7–9x crops of the source at 70.40 / 70.80 / 71.00 / 71.20 / 71.92 / 74.00. The source's
// eye is a SCOWL, not a cartoon almond: a narrow, thinly outlined white slit (~12 × 6 px walking, ~40 % less tall than
// pass 2's) with a small dark iris hard in its front corner, sunk in a soft grey socket under a heavy dark brow
// WEDGE that runs from above the back corner down to the beak base (thickest over the front of the eye), with two
// short furrow strokes over it and a faint crease under the eye.
function paintEye(g, H, E, sd) {
  const q = H.P(sd * (E.az ?? 0.5), E.el ?? -0.2);
  const nz = q.nz;
  if (nz < (sd < 0 ? 0.08 : (E.farVis ?? 0.3))) return;
  const sx = 0.35 + 0.65 * nz, f = sd < 0 ? 1 : -1;      // f: the eye's front (beak side) along x
  const rx = (E.rx ?? 20) * sx * (0.8 + 0.2 * nz), ry = (E.ry ?? 15) * (0.8 + 0.2 * nz);
  const open = E.open ?? 0, look = E.look || [0.7, 0.1], lift = (E.browLift ?? 0) * ry;
  const slit = E.slit ?? 0.6;                            // the white's height relative to pass 2's almond
  const hy = ry * slit;
  g.save(); g.translate(q.x, q.y); g.rotate(H.roll + (E.tilt ?? 0));
  // the socket: a soft grey patch round the eye, pushed up-back under the brow
  if ((E.socket ?? 0.68) < 0.99) {
    g.save(); g.filter = `blur(${Math.max(0.5, ry * 0.45 * PPUget()).toFixed(2)}px)`;
    g.fillStyle = gv(E.socket ?? 0.68, E.socketA ?? 0.4);
    g.beginPath(); g.ellipse(-f * rx * 0.1, -ry * 0.35 - lift * 0.5, rx * 1.35, ry * 0.95, -f * 0.12, 0, TAU); g.fill();
    g.fillStyle = gv(0.72, 0.35); g.beginPath(); g.ellipse(-f * rx * 0.45, ry * 0.55, rx * 0.9, ry * 0.45, 0, 0, TAU); g.fill();
    g.filter = "none"; g.restore();
  }
  const back = [-f * rx, -0.05 * hy], front = [f * rx * 0.95, -(E.frontY ?? 0.2) * hy];
  const cTop = [-f * rx * 0.1, -hy * ((E.top ?? 1.25) + 0.9 * open)], cBot = [f * rx * 0.1, hy * ((E.bot ?? 1.15) + 0.35 * open)];
  const almond = (c) => { c.moveTo(back[0], back[1]); c.quadraticCurveTo(cTop[0], cTop[1], front[0], front[1]); c.quadraticCurveTo(cBot[0], cBot[1], back[0], back[1]); c.closePath(); };
  g.fillStyle = gv(E.white ?? 0.9); g.beginPath(); almond(g); g.fill();
  g.save(); g.beginPath(); almond(g); g.clip();
  // the iris: small and dark, hard in the front corner (rolled up when it looks up)
  const pr = ry * (E.pupil ?? 0.55) * (E.iris ?? 0.8);
  g.fillStyle = "#070707"; g.beginPath(); g.ellipse(f * (0.35 + 0.45 * look[0]) * rx, look[1] * 0.7 * hy - hy * 0.1, pr * Math.max(0.75, sx), pr, 0, 0, TAU); g.fill();
  g.restore();
  g.lineJoin = "round"; g.strokeStyle = gv(0.25, 0.85); g.lineWidth = ry * 0.1; g.beginPath(); almond(g); g.stroke();
  const bez = (a, c, b, t) => [(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
  // the upper lid: a dark line along the top of the white, heavier toward the front
  const lid = []; for (let i = 0; i <= 8; i++) lid.push(bez(back, cTop, front, i / 8));
  taper(g, lid, (t) => ry * (0.06 + (E.lidW ?? 0.3) * Math.pow(t, 1.6)), "#0b0b0b");
  // the brow wedge: from above the back corner, over the eye, down past the front corner toward the beak base
  const bw = E.brow ?? 1.0, reach = E.reach ?? 1.2;
  // (a scowl: one stroke falling from above the back of the eye down to its front corner — "\" toward the beak —
  // thin at the back, heaviest over the front third, ending in a point at the front corner)
  const bf = E.browFrom ?? -1.2;
  const b0 = [f * rx * bf, -ry * (E.b0y ?? 1.05) - lift], b2 = [f * rx * reach, -ry * (E.b2y ?? 0.1) - lift * 0.3];
  const b1 = [f * rx * lerp(bf, reach, E.b1x ?? 0.5), -ry * (E.b1y ?? 1.25) - lift * 1.1];
  const brow = []; for (let i = 0; i <= 14; i++) brow.push(bez(b0, b1, b2, i / 14));
  taper(g, brow, (t) => { const k = t < 0.65 ? Math.pow(t / 0.65, 1.3) : 1 - Math.pow((t - 0.65) / 0.35, 2) * 0.85; return ry * bw * (0.06 + 0.5 * k); }, "#080808");
  // the ridge over the brow catches the light; two short furrows above it, a crease under the eye
  const nb = (p, k) => [p[0], p[1] - ry * k];

  if (E.furrow ?? 1) {
    // a wrinkle over the brow, parallel to it, and a short upright crease rising from its heavy front part
    const fr = E.furrow ?? 1;
    ink(g, [nb(brow[1], 0.5), nb(brow[5], 0.55), nb(brow[9], 0.5)], ry * 0.09 * fr, gv(0.3, 0.6), { end: 0.15 });
    const c0 = brow[10];
    ink(g, [nb(c0, 0.2), [c0[0] - f * rx * 0.05, c0[1] - ry * 0.7], [c0[0] - f * rx * 0.02, c0[1] - ry * 1.05]], ry * 0.1 * fr, gv(0.25, 0.65), { end: 0.1, bias: 0.3 });
  }
  ink(g, [[back[0] + f * rx * 0.1, hy * 1.0], [f * rx * 0.2, hy * 1.45 + ry * 0.15], [f * rx * 0.85, hy * 0.9 + ry * 0.1]], ry * 0.07, gv(0.4, 0.55), { end: 0.2 });
  if (E.vbrow && f > 0) ink(g, [b2, [b2[0] + f * rx * 0.2, b2[1] - ry * 0.55], [b2[0] + f * rx * 0.34, b2[1] - ry * 1.15]], ry * 0.32 * E.vbrow, "#080808", { end: 0.15, bias: 0.3 });
  g.restore();
}
// (the kit keeps PPU private; mirror what owlSprite passes to setPPU)
let PPU_ = 1;
const PPUget = () => PPU_;
const setPPU2 = (v) => { PPU_ = v; setPPU(v); };

// A side-on hooked beak (fix pass, from 8x crops at 70.80 / 71.00 / 71.20 / 74.00): a pale, thinly outlined upper
// mandible that projects from the face and hooks down at the tip, a darker underside and a gape line running back.
// b: { x, y (root, units), h (height at the root), l (length), dir (rad: 0 = straight out along +x, + = down) }
function paintBeakSide(g, b) {
  const { x, y, h = 32, l = 38, dir = 0.3 } = b;
  g.save(); g.translate(x, y); g.rotate(dir);
  const P = (u, v) => [u * l, v * h];
  const upper = [P(-0.15, -0.5), P(0.25, -0.56), P(0.62, -0.42), P(0.9, -0.14), P(1.02, 0.18), P(0.98, 0.42), P(0.9, 0.5)];
  const gape = [P(0.9, 0.5), P(0.78, 0.33), P(0.5, 0.28), P(0.2, 0.3), P(-0.05, 0.36)];
  const lower = [P(0.72, 0.36), P(0.52, 0.5), P(0.22, 0.58), P(-0.1, 0.52)];
  const outline = [...upper, ...gape.slice(1)];
  // lower mandible (tucked under), then the upper
  g.beginPath(); smoothPath(g, [P(0.78, 0.33), ...lower, P(-0.05, 0.36)], true); g.fillStyle = gv(b.lowV ?? 0.66); g.fill();
  g.strokeStyle = gv(0.28, 0.7); g.lineWidth = h * 0.05; g.stroke();
  g.save(); g.beginPath(); smoothPath(g, outline, true); g.clip();
  g.fillStyle = gv(b.v ?? 0.88); g.fill();
  const gr = g.createLinearGradient(0, -0.5 * h, 0, 0.5 * h);
  gr.addColorStop(0, gv(0.95, 0.9)); gr.addColorStop(0.55, gv(0.85, 0)); gr.addColorStop(1, gv(0.55, 0.8));
  g.fillStyle = gr; g.fillRect(-0.3 * l, -0.7 * h, 1.5 * l, 1.4 * h);
  g.restore();
  g.lineJoin = "round"; g.strokeStyle = gv(0.24, 0.8); g.lineWidth = h * 0.06; g.beginPath(); smoothPath(g, outline, true); g.stroke();
  // the hooked tip and the gape
  ink(g, [P(0.62, -0.42), P(0.92, -0.12), P(1.02, 0.2), P(0.92, 0.48)], h * 0.1, gv(0.15, 0.85), { end: 0.2, bias: 0.6 });
  ink(g, gape, h * 0.09, gv(0.12, 0.85), { end: 0.25, bias: 0.3 });
  // nostril
  g.fillStyle = gv(0.3, 0.8); g.beginPath(); g.ellipse(l * 0.22, -h * 0.22, h * 0.07, h * 0.05, 0.2, 0, TAU); g.fill();
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
  const wings = (P.wings || []).map((w) => ({ ...w, G: w.type === "fan" ? fanGeom(w) : wingGeom(w) }));
  const drawW = (w, o) => (w.type === "fan" ? paintFan(g, w.G, { ...o, topLine: w.topLine, sepW: w.sepW, sepV: w.sepV }) : paintWing(g, w.G, o));
  // bounds
  const all = [...H.out, ...bodyPts, ...(P.tufts || []).flatMap((tf) => tuftShape(H, { second: 0, curl: 0.1, ...tf }).pts)];
  tail.forEach((f) => all.push(add(f.root, mul(f.dir, f.L))));
  wings.forEach((w) => (w.type === "fan" ? [...w.G.top, ...w.G.lower.map((q) => q.p), w.G.back].forEach((p) => all.push(p)) : w.G.feathers.forEach((f) => all.push(add(f.root, mul(f.dir, f.L * 1.05))))));
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
  const cv = place.canvas || (() => { const c = document.createElement("canvas"); c.getContext("2d", { willReadFrequently: true }); return c; })();
  if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
  const g = cv.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch);
  const unitT = () => g.setTransform(res * s, 0, 0, res * s, res * (x - x0), res * (y - y0));
  unitT();
  setPPU2(s * res);
  const px = 1 / (s * res);           // one device pixel in units
  const LW = (dev) => dev * px;       // line width given in device px

  // ---- back wings, far leg, tail
  for (const w of wings) if (w.layer === "back") drawW(w, { base: w.base ?? 0.93, lw: LW(1.3) });
  for (const l of P.legs || []) if (l.far) paintLeg(g, l);
  for (const f of tail) paintFeather(g, f, { base: 0.93, dark: 0.74, lw: LW(1.3), line: 0.3 });
  for (const l of P.legs || []) if (!l.far) paintLeg(g, l);

  // ---- trunk: head + body as one soft-white mass with a dark keyline round the union (each part is shaded as
  // part of the union, so there is no seam at the neck)
  const hpath = blob(H.out), bpath = blob(bodyPts);
  const trunk = (c) => { hpath(c); bpath(c); };
  // (fix pass: no uniform keyline round the trunk — the source's silhouette goes from white to dark through a
  // soft grey rim, it is not outlined; only a faint hairline remains to hold the edge against bright page stripes)
  g.save();
  g.lineJoin = "round"; g.strokeStyle = gv(0.3, P.keyA ?? 0.22); g.lineWidth = LW(1.3);
  g.beginPath(); hpath(g); g.stroke(); g.beginPath(); bpath(g); g.stroke();
  g.restore();
  const trunkFill = (clip, shade = P.shade ?? 0.8) => { g.save(); g.beginPath(); clip(g); g.clip(); plumage(g, trunk, { base: 0.97, shade, light: LIGHT, depth: 40, blur: 22, keep: [0, 60] }); g.restore(); };
  trunkFill(bpath);
  // the belly and the back of the body turn from the light (fix pass: a real shade along the underside, ~0.75)
  softShade(g, bpath, (c) => { const q = add([B.x, B.y], V.rot([B.a * 0.1, B.b * 0.95], B.rot)); c.ellipse(q[0], q[1], B.a * 0.9, B.b * 0.38, B.rot, 0, TAU); }, P.bellyV ?? 0.72, P.bellyA ?? 0.5, B.b * 0.22);
  softShade(g, bpath, (c) => { const q = add([B.x, B.y], V.rot([B.a * 0.85, -B.b * 0.2], B.rot)); c.ellipse(q[0], q[1], B.a * 0.35, B.b * 0.7, B.rot, 0, TAU); }, 0.78, 0.35, B.b * 0.2);
  // feather texture: shadow-side hatching round the silhouette, scallops across the chest and belly, and sparse
  // fine grey feather strokes that follow the body's flow (down and back)
  // (s22) P.rim scales the shadow-side hatching (0 = none), P.fringe: false drops the feather fringe (s22's drawing
  // has a smooth, soft outline)
  if ((P.rim ?? 1) > 0) rimHatch(g, bodyPts, { light: LIGHT, flow: [-0.3, 1], len: 22, step: 5, w: LW(1.0), color: gv(0.45, 0.42 * (P.rim ?? 1)), seed: 12, density: 0.9, bend: 0.5 });
  scallops(g, bpath, B, LW(1.0), P.scallopSeed || 3);
  featherStrokes(g, bpath, B, LW(0.9), P.strokeSeed || 7, P.strokes ?? 1);
  if (P.fringe !== false) fringe(g, bodyPts, { step: 16, len: 7, w: 9, color: gv(0.93), ang: 0.9, seed: 5 });

  // ---- mid wings (the near spread wing: over the body, under the head)
  for (const w of wings) if (w.layer === "mid") drawW(w, { base: w.base ?? 0.96, lw: LW(1.3), shadow: bpath, ppu: s * res });

  // ---- head: the far half of the headphone band (only its part above the crown shows), then the head
  if (P.phones) paintBand(g, H, P.phones, false);
  // ear tufts (the source's two short pointed tufts either side of the band, seen from 72.9 on the top margin)
  for (const tf of P.tufts || []) {
    const T = tuftShape(H, { second: 0, curl: 0.1, ...tf });
    g.beginPath(); smoothPath(g, T.pts, true);
    g.fillStyle = gv(0.95); g.fill(); g.lineJoin = "round"; g.strokeStyle = gv(0.3, 0.55); g.lineWidth = LW(1.2); g.stroke();
  }
  trunkFill(hpath, P.headShade ?? P.shade ?? 0.8);
  if ((P.rim ?? 1) > 0) rimHatch(g, H.out, { light: LIGHT, flow: [-0.5, 1], len: 14, step: 5, w: LW(1.0), color: gv(0.42, 0.45 * (P.rim ?? 1)), seed: 22, density: 0.8, thr: 0.15 });
  // a few fine feather marks on the crown and cheek (the source's head is mottled, not a clean disc)
  headStrokes(g, hpath, H, LW(0.85), P.headSeed || 4);
  // the chin: the lower-front edge of the head over the chest
  const chin = []; for (let k = 0; k <= 8; k++) { const q = H.at((P.chin ?? 1.95) + k * 0.1); chin.push(add(q.p, mul(q.n, -3))); }
  ink(g, chin, LW(1.4), gv(0.3, 0.55), { end: 0.1 });

  // (s22) extra ink lines placed by measurement (feather separations, the face disc's edge): P.lines
  const lines = (layer) => { for (const L of P.lines || []) if ((L.layer || "trunk") === layer) ink(g, L.pts, LW(L.w ?? 1.2), gv(L.v ?? 0.35, L.a ?? 0.7), { end: L.end ?? 0.15, bias: L.bias ?? 0.3 }); };
  lines("trunk");
  // ---- face
  paintFace(g, H, P, LW);
  // (s22) the face drawn by measured shapes (frame px): place.face(g)
  if (place.face) { g.setTransform(res, 0, 0, res, -res * x0, -res * y0); setPPU2(res); place.face(g); unitT(); setPPU2(s * res); }

  // the beak behind the scissors while it walks and flies (the blades cross in front of the lower face)
  const beak = () => { const b = P.beak || {}, bq0 = H.P(b.az ?? 0, b.el ?? -0.35, b.lift ?? 1.1), bq = { x: bq0.x + (b.off?.[0] ?? 0), y: bq0.y + (b.off?.[1] ?? 0), nz: bq0.nz };
    if (bq.nz > -0.6) {
      if (b.side) paintBeakSide(g, { x: bq.x, y: bq.y, h: b.w ?? 32, l: b.l ?? 38, dir: H.roll + (b.dir ?? 0.3), v: b.v, lowV: b.lowV });
      else drawBeak(g, { x: bq.x, y: bq.y, w: b.w ?? 26, l: b.l ?? 34, rot: H.roll + (b.rot ?? 0), turn: clamp(H.yaw * 1.2, -1, 1), open: b.open ?? 0 });
    } };
  if (P.beak?.hide) { /* (s22) the beak is drawn by place.face */ } else if (!P.beak?.front) beak();
  // ---- props between the head and the front wing (frame px)
  if (place.mid) { g.setTransform(res, 0, 0, res, -res * x0, -res * y0); setPPU2(res); place.mid(g); unitT(); setPPU2(s * res); }
  // the beak over the scissors (the source draws it in front of the blades and rings)
  if (P.beak?.front && !P.beak?.hide) beak();

  // ---- front wings (the grip wing over the scissors' handles)
  for (const w of wings) if (w.layer === "front") drawW(w, { base: w.base ?? 0.97, lw: LW(1.3), shadow: trunk, ppu: s * res });
  lines("top");
  // (s22) props drawn over everything (frame px): place.top(g)
  if (place.top) { g.setTransform(res, 0, 0, res, -res * x0, -res * y0); setPPU2(res); place.top(g); unitT(); setPPU2(s * res); }

  g.setTransform(1, 0, 0, 1, 0, 0);
  // a faint painterly mottle over the whole bird (multiplied in, anchored to the head so it travels with the owl)
  mottle(cv, res * (x - x0), res * (y - y0), P.mottle ?? 0.13);
  const anchors = { head: [x, y], beak: toF(beakPoint(H, P)) };
  return { canvas: cv, x: x0, y: y0, w: x1 - x0, h: y1 - y0, anchors };
}

let NOISE = null, MOT = null;
function mottle(cv, ox, oy, amt) {
  if (!NOISE) {
    NOISE = document.createElement("canvas"); NOISE.width = NOISE.height = 256;
    const n = NOISE.getContext("2d", { willReadFrequently: true }), id = n.createImageData(256, 256), d = id.data;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      // tileable: sample the noise on a torus-ish wrap by blending the four shifted copies
      const f = (u, v) => 0.6 * noise2(u / 2.6, v / 2.6, 7) + 0.4 * noise2(u / 8, v / 8, 11);
      const wx = x / 256, wy = y / 256;
      const v = f(x, y) * (1 - wx) * (1 - wy) + f(x - 256, y) * wx * (1 - wy) + f(x, y - 256) * (1 - wx) * wy + f(x - 256, y - 256) * wx * wy;
      const i = (y * 256 + x) * 4; d[i] = d[i + 1] = d[i + 2] = Math.round(255 * (1 - (0.5 + 0.5 * v))); d[i + 3] = 255;
    }
    n.putImageData(id, 0, 0);
    MOT = document.createElement("canvas"); MOT.getContext("2d", { willReadFrequently: true });
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
function beakPoint(H, P) { const b = P.beak || {}; const q = H.P(b.az ?? 0, b.el ?? -0.35, b.lift ?? 1.1); return [q.x + (b.off?.[0] ?? 0), q.y + (b.off?.[1] ?? 0)]; }

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
  if (!E.hide) for (const sd of [-1, 1]) paintEye(g, H, E, sd);   // (s22) eye.hide: the face is drawn by place.face
  if (hp) {
    const { c } = cupGeom(H, hp);
    paintBand(g, H, hp, true);
    if (c.z > -0.35) paintCup(g, H, hp);
    // (s22) phones.both: the far cup too (seen from the front)
    if (hp.both) { const hp2 = { ...hp, cupAz: Math.PI - (hp.cupAz ?? 0.05), ...(hp.far || {}) }; if (cupGeom(H, hp2).c.z > -0.35) paintCup(g, H, hp2); }
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

// sparse fine grey strokes over the body following its flow (down and back, toward the tail): the source's plumage
// shows many faint feather edges; kept faint so the bird stays white
function featherStrokes(g, bpath, B, lw, seed, amt) {
  if (!(amt > 0)) return;
  const r = rng(seed);
  g.save(); g.beginPath(); bpath(g); g.clip();
  const ax = [Math.cos(B.rot), Math.sin(B.rot)];
  for (let k = 0; k < Math.round(34 * amt); k++) {
    const u = (r() - 0.5) * 1.7, v = (r() - 0.5) * 1.6;
    const p = add([B.x, B.y], V.rot([u * B.a, v * B.b], B.rot));
    // flow: along the body axis toward the tail, curving down on the belly
    const d = nrm(add(mul(ax, 0.8), [0, 0.6 + 0.3 * v]));
    const L = 10 + 16 * r();
    const n = 1 + Math.floor(r() * 3);
    for (let j = 0; j < n; j++) flick(g, add(p, mul(perp(d), (j - (n - 1) / 2) * 4.5)), V.rot(d, (r() - 0.5) * 0.3), L * (0.7 + 0.5 * r()), lw * (0.8 + 0.5 * r()), gv(0.5, 0.16 + 0.18 * r()), (r() - 0.5) * 0.4);
  }
  g.restore();
}
function headStrokes(g, hpath, H, lw, seed) {
  const r = rng(seed);
  g.save(); g.beginPath(); hpath(g); g.clip();
  for (let k = 0; k < 16; k++) {
    const a = -Math.PI * (0.15 + 0.85 * r()), rr = 0.35 + 0.55 * r();
    const p = [Math.cos(a) * H.rx * rr * 0.9 - H.rx * 0.2, -Math.sin(a) * 0 + Math.sin(a) * H.ry * rr * 0.85];
    const d = nrm([-0.6 - 0.3 * r(), 0.5 + 0.4 * r()]);
    flick(g, p, d, 8 + 10 * r(), lw * (0.8 + 0.4 * r()), gv(0.5, 0.12 + 0.14 * r()), (r() - 0.5) * 0.5);
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

// Frame-px landmarks of a pose placed at { x, y, s } (pure geometry, no drawing): the head centre, the near cup
// (centre and outer radii), the near eye, the beak point. Used by the shot's probe() to compare with the source.
export function landmarks(P, place) {
  const { x, y, s } = place;
  const toF = (p) => [x + p[0] * s, y + p[1] * s];
  const H = headModel(P.head);
  const out = { head: [x, y] };
  if (P.phones) {
    const { c, fx } = cupGeom(H, P.phones), r = P.phones.r ?? 44;
    out.cup = toF([c.x, c.y]); out.cupR = [(r * fx + 4) * s, (r * 1.02 + 4) * s];
  }
  const E = P.eye || {};
  const q = H.P(-(E.az ?? 0.5), E.el ?? -0.2);
  out.eye = toF([q.x, q.y]);
  out.beak = toF(beakPoint(H, P));
  { const b = P.beak || {}, w = b.w ?? 26, l = b.l ?? 34, rot = (P.head.roll || 0) + (b.rot ?? 0), k = clamp(H.yaw * 1.2, -1, 1);
    const bp = beakPoint(H, P), tx = w * 0.05 + k * w * 0.05;
    if (b.side) { const a = (P.head.roll || 0) + (b.dir ?? 0.3), h = b.w ?? 32, L = b.l ?? 38; out.beakTip = toF(add(bp, V.rot([L * 1.02, h * 0.2], a))); }
    else out.beakTip = toF([bp[0] + tx * Math.cos(rot) - l * Math.sin(rot), bp[1] + tx * Math.sin(rot) + l * Math.cos(rot)]); }
  // the band's highest point (frame px)
  if (P.phones) { const bp = bandPts(H, P.phones); const top = bp.reduce((a, b) => (b.p[1] < a.p[1] ? b : a)); out.bandTop = toF(top.p); }
  // the head outline's top point and front-most point (frame px)
  { const o = H.out.map(toF); out.top = o.reduce((a, q) => (q[1] < a[1] ? q : a)); out.front = o.reduce((a, q) => (q[0] > a[0] ? q : a)); }
  return out;
}

// Frame-px outline polygons of a pose (pure geometry): head, body, tail feathers, and each wing's feathers + covert
// band. Used by the shot's probe to fit poses to the source's owl silhouette (smooth outlines approximated by their
// control polygons).
export function silhouette(P, place) {
  const { x, y, s } = place;
  const toF = (p) => [x + p[0] * s, y + p[1] * s];
  const H = headModel(P.head), B = P.body, body = [];
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * TAU, v = Math.sin(t) * B.b * (1 - (B.egg || 0) * Math.cos(t));
    body.push(toF(add([B.x, B.y], V.rot([Math.cos(t) * B.a, v], B.rot))));
  }
  const tail = (P.tail ? tailFeathers(P.tail) : []).map((f) => featherPts(f.root, f.dir, f.L, f.w, f.bend || 0, f.pointy || 0).map(toF));
  const wings = (P.wings || []).map((w) => {
    if (w.type === "fan") { const G = fanGeom(w); return { layer: w.layer, polys: [[...G.top, ...G.lower.map((q) => q.p), G.back].map(toF)] }; }
    const G = wingGeom(w);
    return { layer: w.layer, polys: [...G.feathers.map((f) => featherPts(f.root, f.dir, f.L, f.w, f.bend || 0, f.pointy || 0).map(toF)), G.band.map(toF)] };
  });
  const legs = (P.legs || []).map((L) => {
    const { hip, foot, toe = 34, w = 12, lift = 0, curl = 0, thigh = 30 } = L;
    const d = sub(foot, hip), u = nrm(d), n = perp(u), knee = add(V.mix(hip, foot, 0.35), mul(n, V.len(d) * 0.06));
    const fw = V.rot([1, 0], lift * 0.9 + curl * 1.2 - (L.toeUp || 0) * 0.75);
    const toes = [[-0.42, 1.0], [0.02, 1.12], [0.4, 0.9]].map(([a, k]) => { const dir = nrm(add(V.rot(fw, a * 0.55 * (1 - 0.4 * curl)), [0, 0.28 + 0.4 * curl])); return [toF(foot), toF(add(foot, mul(dir, toe * k)))]; });
    return { pts: [toF(hip), toF(knee), toF(foot)], w: w * 2.4 * s, thigh: thigh * 1.5 * s, toes, tw: w * 1.6 * s };
  });
  return { head: H.out.map(toF), body, tail, wings, legs };
}
