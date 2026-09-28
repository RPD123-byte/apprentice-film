// s20 (fix pass 1): the source owl's own parts, drawn in owl units through the kit's `extra` hook (after the kit
// has painted body, wings, head and face): glossy dark headphone cups with a lit rim, the thick dark band arch
// (clipped out of the head where it passes behind it), broad feathered wings with pointed primaries, a fan tail
// (clipped out of the body, so it sits behind it), long legs with three-toed taloned feet, and the grey feather
// ticks / shading on the flanks and belly. All seeded; the kit's screentone pass runs over them afterwards.
import { ink, flick, plumage, gv, LINE, V, featherShape, bodyOutline } from "../../../lib/owlInk.js";
import { taper } from "../../../lib/ink.js";
import { sampleCurve, smoothPath } from "../../../lib/paths.js";
import { rng, clamp, lerp } from "../../../lib/rng.js";

const { add, sub, mul, nrm, perp } = V;
const TAU = Math.PI * 2;
const blob = (pts) => (c) => smoothPath(c, pts, true);
const poly = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
const LIGHT = [-0.5, -0.86];
let PX = 1;                                  // units per device pixel (set by begin())
const px = (n) => n * PX;                    // n device px in units
export function begin(geo) { const a = geo.toF([0, 0]), b = geo.toF([100, 0]); PX = 100 / Math.hypot(b[0] - a[0], b[1] - a[1]); return PX; }

// clip helpers: keep drawing outside a closed outline (evenodd with a huge rect)
function clipOut(g, pts, smooth = true) {
  g.beginPath(); g.rect(-1e4, -1e4, 2e4, 2e4);
  if (smooth) smoothPath(g, pts, true); else poly(pts)(g);
  g.clip("evenodd");
}

// ------------------------------------------------------------------------------------------------ headphones
// A cup: cushion ring + domed shell, near-black and glossy with a thin lit rim and a small specular spot, a dark
// yoke rising to the band. face 1 = seen square-on (side views), ~0.3 = edge-on (front views); side +1 = the shell
// bulges toward viewer's right. r = cushion radius (units).
export function cupGloss(g, { x, y, r, rot = 0, face = 1, side = 1, yoke = true, yokeLen = 0.32, spec = 1, plate = 0.3, brush = 0.5, seed = 4 }) {
  g.save(); g.translate(x, y); g.rotate(rot);
  const rx = r * (0.3 + 0.7 * face), ry = r;
  const sx = side * (1 - face) * r * 0.42, srx = rx * (0.62 + 0.2 * face), sry = ry * 0.84;
  if (yoke) {
    // the yoke: a dark block from the top of the cup up to the band
    const yy0 = -ry * 0.78, yy1 = -ry * (1.0 + yokeLen), hw = r * 0.15;
    g.fillStyle = gv(0.16); g.beginPath(); g.roundRect(sx * 0.5 - hw, yy1, hw * 2, yy0 - yy1, hw * 0.4); g.fill();
    g.strokeStyle = LINE; g.lineWidth = px(2); g.stroke();
    ink(g, [[sx * 0.5 - hw * 0.35, yy1 + r * 0.04], [sx * 0.5 - hw * 0.4, yy0 - r * 0.02]], px(2.2), gv(0.5, 0.8), { end: 0.4 });
  }
  // cushion
  g.fillStyle = gv(0.07); g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.fill();
  g.strokeStyle = LINE; g.lineWidth = px(2.6); g.stroke();
  // cushion sheen along the lit (upper-left) edge
  g.strokeStyle = gv(0.34, 0.9); g.lineWidth = px(2);
  g.beginPath(); g.ellipse(0, 0, rx * 0.9, ry * 0.93, 0, Math.PI * 1.02, Math.PI * 1.55); g.stroke();
  // shell dome
  const gr = g.createRadialGradient(sx - srx * 0.35, -sry * 0.4, r * 0.05, sx, 0, Math.max(srx, sry) * 1.05);
  gr.addColorStop(0, gv(plate + 0.2)); gr.addColorStop(0.5, gv(plate)); gr.addColorStop(1, gv(Math.max(0.05, plate - 0.2)));
  g.fillStyle = gr; g.beginPath(); g.ellipse(sx, 0, srx, sry, 0, 0, TAU); g.fill();
  if (brush > 0) {
    // brushed plate: fine vertical strokes, darker low right
    const rr = rng(seed);
    g.save(); g.beginPath(); g.ellipse(sx, 0, srx * 0.96, sry * 0.96, 0, 0, TAU); g.clip();
    for (let i = 0; i < 26; i++) {
      const xx = sx + (rr() * 2 - 1) * srx, y0 = (rr() * 2 - 1) * sry * 0.8, L = sry * (0.3 + 0.7 * rr());
      ink(g, [[xx, y0], [xx + (rr() - 0.5) * r * 0.05, y0 + L]], px(1 + rr()), gv(rr() < 0.6 ? 0.12 : 0.7, 0.45 * brush), { end: 0.1 });
    }
    g.restore();
    g.strokeStyle = gv(0.08, 0.8); g.lineWidth = px(3); g.beginPath(); g.ellipse(sx, 0, srx * 0.8, sry * 0.8, 0, 0, TAU); g.stroke();
  }
  g.strokeStyle = LINE; g.lineWidth = px(2.2); g.beginPath(); g.ellipse(sx, 0, srx, sry, 0, 0, TAU); g.stroke();
  // lit rim: a thin bright arc round the upper-left of the shell, a fainter one low right
  g.lineCap = "round";
  g.strokeStyle = gv(0.62); g.lineWidth = px(2.4);
  g.beginPath(); g.ellipse(sx, 0, srx * 0.93, sry * 0.94, 0, Math.PI * 0.95, Math.PI * 1.62); g.stroke();
  g.strokeStyle = gv(0.42, 0.9); g.lineWidth = px(1.6);
  g.beginPath(); g.ellipse(sx, 0, srx * 0.9, sry * 0.9, 0, Math.PI * 0.08, Math.PI * 0.45); g.stroke();
  // specular spot
  if (spec) {
    g.fillStyle = gv(0.86, 0.85 * spec); g.beginPath(); g.ellipse(sx - srx * 0.42, -sry * 0.45, Math.max(px(2.5), srx * 0.13), Math.max(px(1.5), sry * 0.07), -0.7, 0, TAU); g.fill();
  }
  g.restore();
}
// The band: a thick dark strip (w units) with a lit streak along its outer edge and dark sliders near the ends.
// behind: an outline (units) the band passes behind (drawn only outside it).
export function bandArch(g, pts, { w = 13, behind = null, sliders = [0.12, 0.12], fill = 0.28 } = {}) {
  const q = sampleCurve(pts, 8);
  g.save();
  if (behind) clipOut(g, behind);
  const off = (k) => q.map((p, i) => { const a = q[Math.max(0, i - 1)], b = q[Math.min(q.length - 1, i + 1)], n = perp(nrm(sub(b, a))); return add(p, mul(n, k)); });
  taper(g, q, () => w + px(3.2), LINE);
  taper(g, q, () => w, gv(fill));
  taper(g, off(-w * 0.22), () => w * 0.14, gv(0.7, 0.9));
  taper(g, off(w * 0.15), () => w * 0.1, gv(0.45, 0.7));
  const seg = (u0, u1) => {
    const n0 = Math.floor((q.length - 1) * u0), n1 = Math.max(n0 + 1, Math.ceil((q.length - 1) * u1)), sq = q.slice(n0, n1 + 1);
    taper(g, sq, () => w * 1.18 + px(2.6), LINE);
    taper(g, sq, () => w * 1.18, gv(0.26));
    taper(g, sq.map((p, i) => { const a = sq[Math.max(0, i - 1)], b = sq[Math.min(sq.length - 1, i + 1)], n = perp(nrm(sub(b, a))); return add(p, mul(n, -w * 0.25)); }), () => w * 0.18, gv(0.58, 0.8));
  };
  if (sliders[0]) seg(0, sliders[0]);
  if (sliders[1]) seg(1 - sliders[1], 1);
  g.restore();
}

// ------------------------------------------------------------------------------------------------ wings
// A broad wing: the arm (shoulder S -> wrist E -> hand Hd), thick and soft, its trailing edge in gentle covert
// bumps, with nf long pointed primaries fanning off the hand toward fdir (spread fan radians, length flen) and secs
// secondaries hanging off the trailing side. w = half-thickness at the shoulder (units). trail: +1/-1 = the side of
// S->E->Hd (+perp) the feathers hang from. shadow: a soft cast shade on what is under the wing.
export function broadWing(g, { S, E, Hd, w = 28, fdir = null, nf = 5, flen = 90, fan = 0.8, trail = 1, seed = 5, shade = 0.8, base = 0.96, cov = 2, secs = 0, secLen = 1, fw = 0.62, shadow = 0.3, taperK = 0.35 }) {
  const r = rng(seed);
  const pts = sampleCurve([S, E, Hd], 12), m = pts.length;
  const tan = (i) => nrm(sub(pts[Math.min(m - 1, i + 1)], pts[Math.max(0, i - 1)]));
  const nAt = (i) => mul(perp(tan(i)), trail);          // toward the trailing side
  const hw = (i) => w * (1 - taperK * Math.pow(i / (m - 1), 0.9));
  const fd = nrm(fdir || sub(Hd, E));
  const plu = { light: LIGHT };
  const lead = [], back = [];
  for (let i = 0; i < m; i++) lead.push(add(pts[i], mul(nAt(i), -hw(i))));
  for (let i = m - 1; i >= 0; i--) back.push(add(pts[i], mul(nAt(i), hw(i) * (1 + (i % 3 === 1 ? 0.12 : 0)))));
  const outline = [...lead, ...back];
  const path = blob(outline);
  // cast shade on the body under the wing
  if (shadow > 0) {
    g.save(); g.filter = `blur(${(w * 0.35 / PX).toFixed(1)}px)`;
    g.fillStyle = gv(0.45, shadow); g.translate(w * 0.12, w * 0.3); g.beginPath(); path(g); g.fill();
    g.restore();
  }
  // secondaries hanging off the arm (behind it)
  for (let k = 0; k < secs; k++) {
    const i = Math.floor((m - 1) * (0.15 + 0.6 * (k + 0.5) / secs)), p = pts[i];
    const dir = nrm(add(nAt(i), mul(tan(i), -0.25 + 0.2 * k / Math.max(1, secs - 1))));
    const L = w * 2.1 * secLen * (0.9 + 0.2 * r());
    const fs = featherShape(add(p, mul(nAt(i), hw(i) * 0.2)), dir, L, w * 0.75, 0.8);
    plumage(g, blob(fs), { base: 0.94, shade: 0.74, depth: w * 0.2, blur: w * 0.1, ...plu });
    ink(g, fs.slice(1, 6), px(1.8), gv(0.16, 0.9), { end: 0.2 });
    ink(g, [add(p, mul(dir, L * 0.3)), add(p, mul(dir, L * 0.9))], px(1), gv(0.5, 0.6), { end: 0.1 });
  }
  // primaries: far ones first
  for (let k = 0; k < nf; k++) {
    const f = nf === 1 ? 0 : k / (nf - 1) - 0.5, dir = V.rot(fd, f * fan);
    const root = add(add(Hd, mul(perp(fd), f * w * 0.7)), mul(fd, -flen * 0.22));
    const L = flen * (0.8 + 0.28 * Math.sin(Math.PI * (k + 0.5) / nf)) * (0.94 + 0.12 * r());
    const fs = featherShape(root, dir, L, w * fw, 0.95);
    plumage(g, blob(fs), { base: 0.95, shade: 0.76, depth: w * 0.12, blur: w * 0.08, ...plu });
    ink(g, fs.slice(1, 6), px(2), gv(0.12, 0.92), { end: 0.15 });
    ink(g, [add(root, mul(dir, L * 0.3)), add(root, mul(dir, L * 0.85))], px(1.1), gv(0.5, 0.7), { end: 0.1 });
  }
  plumage(g, path, { base, shade, depth: w * 0.4, blur: w * 0.18, ...plu });
  // covert scallops: small arcs bulging toward the trailing side, in rows along the arm
  g.save(); g.beginPath(); path(g); g.clip();
  for (let row = 0; row < cov; row++) {
    const v = row === 0 ? -0.1 : 0.45, nk = 4;
    for (let k = 0; k < nk; k++) {
      const u0 = 0.1 + (k + row * 0.5) * (0.8 / nk), u1 = u0 + 0.8 / nk * 0.85;
      if (u1 > 0.98) continue;
      const i0 = Math.floor((m - 1) * u0), i1 = Math.floor((m - 1) * u1), im = Math.floor((i0 + i1) / 2);
      const a = add(pts[i0], mul(nAt(i0), hw(i0) * v)), b = add(pts[i1], mul(nAt(i1), hw(i1) * v));
      const mid = add(V.mix(a, b, 0.5), mul(nAt(im), w * 0.22));
      ink(g, [a, mid, b], px(1.5), gv(0.32, 0.85), { end: 0.2 });
    }
  }
  g.restore();
  ink(g, lead, px(2.6), LINE, { end: 0.3, bias: 0.4 });
  ink(g, back, px(2.1), gv(0.14, 0.95), { end: 0.2 });
  return { outline };
}

// A wing (or any feathered mass) drawn from measured outlines: feathers [{ root, tip, w, v }] first (pointed, back to
// front), then the mass `outline` (closed, smooth) filled with plumage and inked (heavier on `heavy` = [i0, i1] of the
// outline), interior feather `lines`, and a soft grey `shadeAt` = [x, y, rx, ry] inside it.
export function shapeWing(g, { outline = null, feathers = [], lines = [], heavy = null, shadeAt = null, shadow = 0.3, lw = 2.4 }) {
  const plu = { light: LIGHT };
  if (outline && shadow > 0) {
    let x0 = 1e9, x1 = -1e9; for (const p of outline) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); }
    const k = (x1 - x0) * 0.08;
    g.save(); g.filter = `blur(${(k * 1.5 / PX).toFixed(1)}px)`; g.fillStyle = gv(0.4, shadow);
    g.translate(k * 0.5, k * 1.2); g.beginPath(); smoothPath(g, outline, true); g.fill(); g.restore();
  }
  const feather = (f) => {
    const d = sub(f.tip, f.root), L = Math.hypot(d[0], d[1]), dir = nrm(d);
    const fs = featherShape(f.root, dir, L, f.w, f.point ?? 0.9);
    plumage(g, blob(fs), { base: f.v ?? 0.95, shade: (f.v ?? 0.95) - 0.18, depth: f.w * 0.3, blur: f.w * 0.18, ...plu });
    ink(g, fs.slice(1, 6), px(f.lw ?? 2), gv(0.1, 0.92), { end: 0.15 });
    if (f.rachis !== false) ink(g, [add(f.root, mul(dir, L * 0.3)), add(f.root, mul(dir, L * 0.85))], px(1.1), gv(0.45, 0.6), { end: 0.1 });
    for (const bl of f.barbs || []) ink(g, [add(add(f.root, mul(dir, L * bl)), mul(perp(dir), -f.w * 0.3)), add(add(f.root, mul(dir, L * (bl + 0.12))), mul(perp(dir), f.w * 0.3))], px(1), gv(0.4, 0.6), { end: 0.2 });
  };
  feathers.filter((f) => !f.front).forEach(feather);
  if (outline) {
    const path = blob(outline);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of outline) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    const sz = Math.max(x1 - x0, y1 - y0);
    plumage(g, path, { base: 0.965, shade: 0.8, depth: sz * 0.14, blur: sz * 0.07, ...plu });
    if (shadeAt) { g.save(); g.beginPath(); path(g); g.clip(); g.filter = `blur(${(shadeAt[2] * 0.6 / PX).toFixed(1)}px)`; g.fillStyle = gv(0.62, 0.55); g.beginPath(); g.ellipse(shadeAt[0], shadeAt[1], shadeAt[2], shadeAt[3], 0, 0, TAU); g.fill(); g.restore(); }
    g.save(); g.beginPath(); path(g); g.clip();
    for (const L of lines) ink(g, L, px(L.w || 1.5), gv(L.v ?? 0.34, 0.85), { end: 0.15 });
    g.restore();
    const q = sampleCurve(outline, 6, true);
    ink(g, [...q, q[0]], px(lw * 0.75), gv(0.12, 0.95), { end: 0.6 });
    if (heavy) { const n = outline.length, a = Math.floor(heavy[0] / n * q.length), b = Math.ceil(heavy[1] / n * q.length); ink(g, q.slice(a, b + 1), px(lw * 1.25), LINE, { end: 0.25 }); }
  }
  feathers.filter((f) => f.front).forEach(feather);
}

// a plain plumage mass (fills gaps between kit parts, e.g. the chest under a turned head)
export function plumageFill(g, outline, { base = 0.965, shade = 0.86 } = {}) {
  let x0 = 1e9, x1 = -1e9; for (const p of outline) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); }
  plumage(g, blob(outline), { base, shade, depth: (x1 - x0) * 0.1, blur: (x1 - x0) * 0.08, light: LIGHT });
}
// A fan tail of n pointed feathers from base around dir (drawn behind `behind`, e.g. the body outline).
export function fanTail(g, { base, dir, n = 6, len = 90, spread = 0.9, w = 26, behind = null, seed = 9 }) {
  const r = rng(seed), d0 = nrm(dir);
  g.save();
  if (behind) clipOut(g, behind);
  const order = [];
  for (let k = 0; k < n; k++) order.push(k);
  order.sort((a, b) => Math.abs(b - (n - 1) / 2) - Math.abs(a - (n - 1) / 2));   // outer feathers first
  for (const k of order) {
    const f = n === 1 ? 0 : k / (n - 1) - 0.5, d = V.rot(d0, f * spread);
    const root = add(base, mul(perp(d0), f * w * 0.8));
    const L = len * (1 - 0.25 * Math.abs(f) * 2) * (0.92 + 0.16 * r());
    const fs = featherShape(root, d, L, w, 0.85);
    plumage(g, blob(fs), { base: 0.93, shade: 0.72, depth: w * 0.2, blur: w * 0.12, light: LIGHT });
    ink(g, fs.slice(1, 6), px(1.7), gv(0.22, 0.9), { end: 0.15 });
    ink(g, [add(root, mul(d, L * 0.15)), add(root, mul(d, L * 0.9))], px(1), gv(0.5, 0.7), { end: 0.1 });
  }
  g.restore();
}

// ------------------------------------------------------------------------------------------------ legs + feet
// A standing leg: fluffy feathered thigh from `hip` (inside the belly), a scaly pale tarsus down to `ankle`, three
// forward toes to `toes` (tip vectors from the ankle, units) and a short back toe `back`, each with a dark hooked
// talon curling toward `hook` (+1 = clockwise of the toe direction).
export function legFoot(g, { hip, ankle, toes, back = null, size = 30, thigh = 0.55, seed = 3, talon = 1, behind = null }) {
  const r = rng(seed);
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  if (behind) clipOut(g, behind);
  const legD = nrm(sub(ankle, hip)), ln = perp(legD), L = Math.hypot(ankle[0] - hip[0], ankle[1] - hip[1]);
  const knee = add(hip, mul(sub(ankle, hip), thigh));
  // tarsus
  const tw = size * 0.2;
  const tq = sampleCurve([knee, V.mix(knee, ankle, 0.5), ankle], 4);
  taper(g, tq, (u) => tw * (1.05 - 0.15 * u) + px(2.6), LINE);
  taper(g, tq, (u) => tw * (1.05 - 0.15 * u), gv(0.84));
  taper(g, tq.map((p) => add(p, mul(ln, -tw * 0.25))), () => tw * 0.28, gv(0.95, 0.8));
  for (let k = 1; k < 5; k++) { const p = V.mix(knee, ankle, k / 5.2); ink(g, [add(p, mul(ln, -tw * 0.45)), add(add(p, mul(legD, tw * 0.15)), mul(ln, tw * 0.1)), add(p, mul(ln, tw * 0.45))], px(1.2), gv(0.35, 0.8), { end: 0.3 }); }
  // toes
  const toe = (v, k) => {
    const len = Math.hypot(v[0], v[1]), d = nrm(v), n = perp(d);
    const tip = add(ankle, v), mid = add(add(ankle, mul(v, 0.5)), mul(n, len * 0.05 * (k % 2 ? 1 : -1)));
    const q = sampleCurve([ankle, mid, tip], 5);
    const w0 = size * 0.2;
    taper(g, q, (u) => w0 * (1.05 - 0.35 * u) + px(2.4), LINE);
    taper(g, q, (u) => w0 * (1.05 - 0.35 * u), gv(0.88 - 0.05 * r()));
    for (const f of [0.35, 0.62, 0.85]) {
      const j = Math.floor((q.length - 1) * f), p = q[j], t = nrm(sub(q[Math.min(q.length - 1, j + 1)], q[Math.max(0, j - 1)])), nn = perp(t), hw = w0 * (1.05 - 0.35 * f) * 0.5;
      ink(g, [add(p, mul(nn, -hw)), add(p, mul(t, -hw * 0.3)), add(p, mul(nn, hw))], px(1.1), gv(0.3, 0.8), { end: 0.3 });
    }
    // talon: a dark hook off the tip, curving down (toward +y) and a little back
    const cl = size * 0.42 * talon;
    const down = nrm(add(mul(d, 0.55), [0, 0.85]));
    const tt = add(add(tip, mul(d, cl * 0.55)), mul(down, cl * 0.7));
    const c = [add(tip, mul(n, -w0 * 0.32)), add(tip, mul(d, cl * 0.5)), tt, add(add(tip, mul(d, cl * 0.25)), mul(down, cl * 0.25)), add(tip, mul(n, w0 * 0.32))];
    g.fillStyle = gv(0.12); g.beginPath(); smoothPath(g, c, true); g.fill();
    g.strokeStyle = LINE; g.lineWidth = px(1.4); g.stroke();
    ink(g, [c[1], V.mix(c[1], tt, 0.6)], px(1), gv(0.65, 0.7), { end: 0.2 });
  };
  if (back) toe(back, 9);
  toes.forEach((v, k) => toe(v, k));
  if (behind) { g.restore(); return; }
  // thigh: a fluffy white tuft covering the top of the leg (serrated lower edge)
  const tl = L * thigh * 1.0, fw = size * 0.42;
  const fl = [];
  fl.push(add(hip, mul(ln, -fw)), add(add(hip, mul(legD, tl * 0.5)), mul(ln, -fw * 0.95)));
  const nz = 5;
  for (let k = 0; k <= nz; k++) { const f = k / nz - 0.5, depth = (k % 2 ? 0.82 : 1.0) * tl; fl.push(add(add(hip, mul(legD, depth)), mul(ln, f * fw * 1.7))); }
  fl.push(add(add(hip, mul(legD, tl * 0.5)), mul(ln, fw * 0.95)), add(hip, mul(ln, fw)), add(hip, mul(legD, -fw * 0.8)));
  plumage(g, poly(fl), { base: 0.95, shade: 0.8, depth: fw * 0.3, blur: fw * 0.15, light: LIGHT });
  for (let k = 0; k < 4; k++) { const p = add(add(hip, mul(legD, tl * (0.45 + 0.12 * k))), mul(ln, (r() - 0.5) * fw)); flick(g, p, nrm(add(legD, mul(ln, (r() - 0.5) * 0.5))), tl * 0.35, px(1.1), gv(0.45, 0.7), 0.1); }
  ink(g, fl.slice(2, fl.length - 3), px(1.3), gv(0.4, 0.7), { end: 0.3 });
  g.restore();
}

// A hooked beak in profile: base (where it leaves the face, upper and lower points) and tip, curving down. Pale horn
// with a dark keyline and a darker gape line.
export function profileBeak(g, { top, bot, tip, v = 0.84 }) {
  const mid = V.mix(top, tip, 0.5), c1 = add(mid, mul(nrm(perp(sub(tip, top))), -Math.hypot(tip[0] - top[0], tip[1] - top[1]) * 0.18));
  const gape = V.mix(bot, tip, 0.35);
  const pts = [top, c1, tip, add(V.mix(tip, bot, 0.5), [0, 0]), bot];
  g.save();
  g.fillStyle = gv(v); g.beginPath(); smoothPath(g, pts, true); g.fill();
  g.filter = `blur(${(Math.hypot(tip[0] - top[0], tip[1] - top[1]) * 0.12 / PX).toFixed(1)}px)`;
  g.fillStyle = gv(v - 0.25, 0.6); g.beginPath(); g.ellipse(V.mix(bot, tip, 0.4)[0], V.mix(bot, tip, 0.4)[1] + px(2), Math.hypot(tip[0] - bot[0], tip[1] - bot[1]) * 0.3, px(4), Math.atan2(tip[1] - bot[1], tip[0] - bot[0]), 0, TAU); g.fill();
  g.filter = "none";
  g.strokeStyle = LINE; g.lineWidth = px(2); g.lineJoin = "round"; g.beginPath(); smoothPath(g, pts, true); g.stroke();
  ink(g, [V.mix(top, bot, 0.55), gape, V.mix(gape, tip, 0.6)], px(1.4), gv(0.15, 0.9), { end: 0.2 });
  ink(g, [V.mix(top, c1, 0.3), V.mix(c1, tip, 0.4)], px(1.2), gv(0.98, 0.8), { end: 0.2 });
  g.restore();
}

// ------------------------------------------------------------------------------------------------ plumage shading
// Grey feather ticks and a soft shade on the body (pose.body spec), clipped out of the head: denser toward `side`
// (a unit vector in units, e.g. [-0.6, 0.8] = lower left). amount 0..1.
export function bodyTicks(g, body, { head = null, side = [-0.6, 0.8], amount = 1, seed = 21, shadeV = 0.8, shadeA = 0.55, n = 90 } = {}) {
  const bo = bodyOutline(body), r = rng(seed);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of bo) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2;
  const sd = nrm(side);
  g.save();
  g.beginPath(); smoothPath(g, bo, true); g.clip();
  if (head) clipOut(g, head);
  // soft shade toward `side`
  g.filter = `blur(${(rx * 0.35 / PX).toFixed(1)}px)`;
  g.fillStyle = gv(shadeV, shadeA * amount);
  g.beginPath(); g.ellipse(cx + sd[0] * rx * 0.95, cy + sd[1] * ry * 0.95, rx * 0.75, ry * 0.6, Math.atan2(sd[1], sd[0]), 0, TAU); g.fill();
  g.filter = "none";
  // feather hatching: clusters of 2-4 short parallel grey strokes, combing down and out, weighted toward `side`
  for (let i = 0; i < n * amount; i++) {
    const ux = r() * 2 - 1, uy = r() * 2 - 1;
    if (ux * ux + uy * uy > 1) continue;
    const k = 0.5 + 0.5 * (ux * sd[0] + uy * sd[1]);
    if (r() > 0.12 + 0.88 * k * k) continue;
    const p = [cx + ux * rx * 0.95, cy + uy * ry * 0.95];
    const dir = nrm([ux * 0.55 + (r() - 0.5) * 0.3, 1]);
    const L = (rx + ry) * (0.05 + 0.05 * r());
    const nn = 2 + Math.floor(r() * 3), gap = L * 0.22;
    for (let j = 0; j < nn; j++) {
      const q = add(p, mul(perp(dir), (j - (nn - 1) / 2) * gap));
      flick(g, q, dir, L * (0.7 + 0.5 * r()), px(1.0 + 0.4 * r()), gv(0.48 + 0.2 * r(), 0.45 + 0.4 * k), 0.12 * (ux < 0 ? -1 : 1));
    }
  }
  g.restore();
}
// short fluffy strokes crossing a body outline between fractions from..to (fur tips at the belly edge)
export function fluffEdge(g, body, { from = 0.9, to = 1.25, step = 9, len = 16, seed = 31, v = 0.55 } = {}) {
  const bo = bodyOutline(body), r = rng(seed), N = bo.length;
  const cx = bo.reduce((s, p) => s + p[0], 0) / N, cy = bo.reduce((s, p) => s + p[1], 0) / N;
  for (let u = from; u < to; u += step / (N * 6)) {
    const i = Math.floor(((u % 1) + 1) % 1 * N), p = bo[i], d = nrm(sub(p, [cx, cy]));
    const q = add(p, mul(d, -len * (0.3 + 0.4 * r())));
    flick(g, q, nrm(add(d, [(r() - 0.5) * 0.6, 0.2])), len * (0.7 + 0.6 * r()), px(1.1), gv(v, 0.75), (r() - 0.5) * 0.3);
  }
}
