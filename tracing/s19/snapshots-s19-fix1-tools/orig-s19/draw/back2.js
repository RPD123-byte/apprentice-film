// s19 owl seen from BEHIND (58.00–62.28: it lands, skids, sits, gets up, stands and lifts the card with its back to
// us). The kit's rig draws front and three-quarter views only, so this painter builds the back view from the kit's
// parts (plumage, softShade, strokes, flicks, feet) plus its own headphones and bandage.
// Poses are in ABSOLUTE FRAME PX (each measured on its own source frame) and share one structure, so any two
// interpolate number by number (lerpPose). Wings are always fans (a folded wing is a fan with its feathers hanging
// down the flank), so folded -> open interpolates too.
import { plumage, softShade, flick, ink, screentone, setPPU, gv, LINE, V, drawFoot, drawWing, wingGeom } from "../../../lib/owlInk.js";
import { smoothPath, sampleCurve } from "../../../lib/paths.js";
import { taper } from "../../../lib/ink.js";
import { rng, clamp } from "../../../lib/rng.js";
import { wingFan, pointedFeather } from "./feathers.js";

const TAU = Math.PI * 2;
const { add, sub, mul, nrm, perp } = V;
const blobPath = (pts) => (c) => smoothPath(c, pts, true);
const OUT = gv(0.16);            // outline ink: dark grey on the glowing owl

export function lerpPose(a, b, t) {
  if (typeof a === "number" && typeof b === "number") return a + (b - a) * t;
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.map((v, i) => lerpPose(v, b[i], t));
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const o = {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) o[k] = k in a && k in b ? lerpPose(a[k], b[k], t) : (t < 0.5 ? a[k] : b[k]);
    return o;
  }
  return t < 0.5 ? a : b;
}
// move a whole pose by (dx, dy) (every point-valued field)
const PTS = new Set(["S", "Wr", "T", "base", "tip"]);
export function shiftPose(p, dx, dy) {
  const mv = (q) => [q[0] + dx, q[1] + dy];
  const o = JSON.parse(JSON.stringify(p));
  for (const k of ["head", "body", "crest", "bandage"]) if (o[k]) { o[k].x += dx; o[k].y += dy; }
  (o.cups || []).forEach((c) => { c.x += dx; c.y += dy; });
  (o.feet || []).forEach((f) => { f.x += dx; f.y += dy; });
  (o.wings || []).forEach((w) => { for (const k of Object.keys(w)) if (PTS.has(k)) w[k] = mv(w[k]); });
  if (o.tail) { o.tail.base = mv(o.tail.base); o.tail.tip = mv(o.tail.tip); }
  if (o.band) { o.band.pts = o.band.pts.map(mv); o.band.arm = o.band.arm.map(mv); }
  return o;
}

// move and scale a whole pose: p' = c + s (p - c) + (dx, dy); sizes scale by s
export function transformPose(p, dx, dy, sc = 1, c = null) {
  if (!dx && !dy && sc === 1) return p;
  const o = JSON.parse(JSON.stringify(p));
  const C = c || [o.body.x, o.body.y];
  const T = (q) => [C[0] + sc * (q[0] - C[0]) + dx, C[1] + sc * (q[1] - C[1]) + dy];
  const TO = (q) => { const r = T([q.x, q.y]); q.x = r[0]; q.y = r[1]; };
  for (const k of ["head", "body"]) { TO(o[k]); o[k].rx *= sc; o[k].ry *= sc; }
  if (o.crest) { TO(o.crest); o.crest.len *= sc; o.crest.w *= sc; }
  if (o.bandage) { TO(o.bandage); o.bandage.size *= sc; }
  if (o.crown) o.crown = T(o.crown);
  (o.cups || []).forEach((q) => { TO(q); q.r *= sc; });
  (o.feet || []).forEach((q) => { TO(q); q.size *= sc; q.leg = (q.leg || 0) * sc; });
  (o.wings || []).forEach((w) => { for (const k of ["S", "Wr", "T"]) w[k] = T(w[k]); if (w.LP) w.LP = w.LP.map((v) => v * sc); if (w.LS) w.LS *= sc; if (w.width) w.width *= sc; if (w.kit && w.len) w.len *= sc; });
  if (o.tail) { o.tail.base = T(o.tail.base); o.tail.tip = T(o.tail.tip); o.tail.w *= sc; }
  if (o.band) { o.band.pts = o.band.pts.map(T); o.band.arm = o.band.arm.map(T); o.band.w *= sc; }
  return o;
}

// turn the head and everything on it (crest, crown, bandage, band, cups) by ang radians about the neck (the head's
// lower middle), clockwise positive (y down)
export function rotateHead(p, ang) {
  if (!ang) return p;
  const o = JSON.parse(JSON.stringify(p)), h = o.head, c = [h.x, h.y + h.ry * 0.85], ca = Math.cos(ang), sa = Math.sin(ang);
  const R = (q) => [c[0] + ca * (q[0] - c[0]) - sa * (q[1] - c[1]), c[1] + sa * (q[0] - c[0]) + ca * (q[1] - c[1])];
  const RO = (q) => { const r = R([q.x, q.y]); q.x = r[0]; q.y = r[1]; };
  RO(h); h.roll = (h.roll || 0) + ang;
  if (o.crest) { RO(o.crest); o.crest.dir += ang; }
  if (o.bandage) { RO(o.bandage); o.bandage.rot = (o.bandage.rot || 0) + ang; }
  if (o.crown) o.crown = R(o.crown);
  (o.cups || []).forEach((q) => { RO(q); q.rot = (q.rot || 0) + ang; });
  if (o.band && !(o.band.dark > 0.5)) { o.band.pts = o.band.pts.map(R); o.band.arm = o.band.arm.map(R); }
  return o;
}

// ---------------------------------------------------------------- shapes
function headOutline(h, n = 48) {
  const { x, y, rx, ry, roll = 0, sq = 2.3 } = h, c = Math.cos(roll), s = Math.sin(roll), q = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU, ct = Math.cos(t), st = Math.sin(t), e = st < 0 ? sq : 2.1, kk = kAt(h.k, t);
    const px = Math.sign(ct) * Math.pow(Math.abs(ct), 2 / e) * rx * kk, py = Math.sign(st) * Math.pow(Math.abs(st), 2 / e) * ry * kk;
    q.push([x + px * c - py * s, y + px * s + py * c]);
  }
  return q;
}
// k: optional 8 radial factors at 0°, 45°, … 315° (0° = right, 90° = down), blended smoothly (a measured silhouette)
const kAt = (k, t) => { if (!k) return 1; const f = ((t / TAU) * 8 % 8 + 8) % 8, i = Math.floor(f), u = f - i, w = (1 - Math.cos(Math.PI * u)) / 2; return clamp(k[i] * (1 - w) + k[(i + 1) % 8] * w, 0.55, 1.7); };
function bodyOutline(b, n = 48) {
  const { x, y, rx, ry, rot = 0, egg = 0 } = b, c = Math.cos(rot), s = Math.sin(rot), q = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU, ct = Math.cos(t), st = Math.sin(t);
    // egg: the +ry end (bottom when rot = 0) fuller than the -ry end
    const k = (1 + egg * st) * kAt(b.k, t);
    const px = ct * rx * k, py = st * ry * kAt(b.k, t);
    q.push([x + px * c - py * s, y + px * s + py * c]);
  }
  return q;
}
const polyPath = (pts) => (c) => smoothPath(c, pts, true);

// ---------------------------------------------------------------- parts
// a headphone cup seen from behind / the side: dark pleated cushion against the head, a pale brushed metal shell
// with a dark rim facing out. c = { x, y, r, rot, open (0 edge-on .. 1 facing us), side (+1 = viewer-right cup) }
export function drawCupB(g, c) {
  const { x, y, r, rot = 0, side = 1 } = c, open = clamp(c.open ?? 0.5);
  const rr = rng(side > 0 ? 41 : 43);
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(side, 1);
  // cushion: a dark ring toward the head (x < 0)
  const cush = (q) => q.ellipse(-0.3 * r, 0, (0.2 + 0.25 * open) * r, 1.02 * r, 0, 0, TAU);
  g.fillStyle = "#0c0c0c"; g.beginPath(); cush(g); g.fill();
  g.save(); g.beginPath(); cush(g); g.clip();
  for (let i = -22; i <= 22; i++) {
    const t = i / 22, yy = t * r, hw = Math.sqrt(Math.max(0, 1 - t * t)) * (0.3 + 0.15 * open) * r;
    g.strokeStyle = gv(0.42 + 0.3 * rr(), 0.75); g.lineWidth = 1.1 + 0.6 * rr();
    g.beginPath(); g.moveTo(-0.3 * r - hw * 0.9, yy - 1); g.quadraticCurveTo(-0.3 * r, yy + 2, -0.3 * r + hw * 0.5, yy); g.stroke();
  }
  g.restore();
  // shell: an ellipse facing out, dark rim, pale face with brushed arcs and a bright edge
  const sx = (0.05 + 0.3 * open) * r, srx = (0.1 + 0.63 * open) * r, sry = 0.96 * r;
  g.fillStyle = gv(0.3); g.beginPath(); g.ellipse(sx, 0, srx, sry, 0, 0, TAU); g.fill();
  g.strokeStyle = LINE; g.lineWidth = Math.max(1.6, r * 0.05); g.stroke();
  const cx = sx + 0.06 * r, crx = srx * 0.8, cry = sry * 0.84;
  g.save(); g.beginPath(); g.ellipse(cx, 0, crx, cry, 0, 0, TAU); g.clip();
  const gr = g.createLinearGradient(cx - crx, -cry, cx + crx, cry);
  gr.addColorStop(0, gv(0.86)); gr.addColorStop(0.45, gv(0.6)); gr.addColorStop(1, gv(0.3));
  g.fillStyle = gr; g.fillRect(cx - crx - 2, -cry - 2, crx * 2 + 4, cry * 2 + 4);
  for (let i = 0; i < 16; i++) { g.strokeStyle = gv(rr() < 0.5 ? 0.35 : 1, 0.4); g.lineWidth = 1; const a = -2.8 + rr() * 2.6; g.beginPath(); g.ellipse(cx, 0, crx * (0.4 + 0.55 * rr()), cry * (0.4 + 0.55 * rr()), 0, a, a + 0.8); g.stroke(); }
  g.restore();
  g.strokeStyle = gv(0.12); g.lineWidth = Math.max(1.3, r * 0.035); g.beginPath(); g.ellipse(cx, 0, crx, cry, 0, 0, TAU); g.stroke();
  g.strokeStyle = gv(0.95, 0.8); g.lineWidth = Math.max(1, r * 0.03); g.beginPath(); g.ellipse(sx, 0, srx * 0.93, sry * 0.95, 0, 3.4, 4.6); g.stroke();
  g.restore();
}
// the headband: on the head a slim dark band with a paler inner strip; knocked round the neck (dark = 1) a broad
// dark strap with a pale top edge; arm = the slider from the strap's end up into the near cup
function drawBandB(g, b) {
  const q = sampleCurve(b.pts, 10), w = b.w, d = clamp(b.dark ?? 0);
  taper(g, q, () => w * (1 + 0.25 * d), LINE);
  taper(g, q.map(([x, y], i) => { const a = q[Math.max(0, i - 1)], c = q[Math.min(q.length - 1, i + 1)], dx = c[0] - a[0], dy = c[1] - a[1], L = Math.hypot(dx, dy) || 1; return [x + dy / L * w * 0.15, y - dx / L * w * 0.15]; }), () => w * (0.45 - 0.2 * d), gv(0.55 - 0.3 * d, 0.95));
  taper(g, q.map(([x, y], i) => { const a = q[Math.max(0, i - 1)], c = q[Math.min(q.length - 1, i + 1)], dx = c[0] - a[0], dy = c[1] - a[1], L = Math.hypot(dx, dy) || 1; return [x + dy / L * w * 0.42, y - dx / L * w * 0.42]; }), () => Math.max(1, w * 0.12), gv(0.85, 0.8));
  if (b.arm && d > 0.2) {
    const a = b.arm;
    ink(g, a, w * 0.8, LINE, { end: 0.9, pow: 0.3 }); ink(g, a, w * 0.46, gv(0.7), { end: 0.9, pow: 0.3 });
    for (let k = 1; k < 5; k++) { const p = V.mix(a[0], a[2], k / 5), t = nrm(sub(a[2], a[0])), n = perp(t); ink(g, [add(p, mul(n, -w * 0.25)), add(p, mul(n, w * 0.25))], 1, gv(0.35, 0.8)); }
  }
}
// the crossed sticking plasters on the back of the head
function drawBandageB(g, c) {
  const L = c.size, Wd = c.size * 0.34;
  g.save(); g.translate(c.x, c.y); g.rotate(c.rot || 0); g.scale(c.sx ?? 1, c.sy ?? 1); g.globalAlpha = clamp(c.a ?? 1);
  const pad = (rot, l, wd, seed) => {
    const r = rng(seed);
    g.save(); g.rotate(rot);
    g.fillStyle = gv(0.86); g.beginPath(); g.roundRect(-l / 2, -wd / 2, l, wd, wd * 0.48); g.fill();
    g.fillStyle = gv(0.3, 0.9);
    for (let i = 0; i < 18; i++) { const u = (r() - 0.5) * l * 0.9, v = (r() - 0.5) * wd * 0.7; if (Math.abs(u) < wd * 0.55) continue; g.beginPath(); g.arc(u, v, 0.9 + r() * 0.6, 0, TAU); g.fill(); }
    g.strokeStyle = gv(0.2); g.lineWidth = 1.6; g.beginPath(); g.roundRect(-l / 2, -wd / 2, l, wd, wd * 0.48); g.stroke();
    g.restore();
  };
  pad(1.3, L * 0.8, Wd * 0.95, 5); pad(0, L, Wd, 7);
  g.fillStyle = gv(0.78); g.beginPath(); g.roundRect(-Wd * 0.48, -Wd * 0.4, Wd * 0.96, Wd * 0.8, Wd * 0.15); g.fill();
  g.strokeStyle = gv(0.3); g.lineWidth = 1.2; g.stroke();
  g.restore();
}
// the crest: a soft tuft of rounded pointed feathers sweeping off the top of the head
function drawCrestB(g, c, light) {
  const n = Math.round(c.n || 4);
  for (let i = n - 1; i >= 0; i--) {
    const f = n === 1 ? 0.5 : i / (n - 1);
    const a = c.dir + (f - 0.5) * (c.fan ?? 0.7);
    const dir = [Math.cos(a), Math.sin(a)], nn = perp(dir);
    const root = add([c.x, c.y], mul(nn, (f - 0.5) * c.w));
    const L = c.len * (1 - 0.5 * Math.abs(f - 0.3));
    const pts = pointedFeather(root, dir, L, c.w * 0.7, (c.curl ?? 0.1) * (f - 0.2));
    plumage(g, blobPath(pts), { base: 0.94, shade: 0.76, light, depth: c.w * 0.2, blur: c.w * 0.12 });
    ink(g, [...pts.slice(1, 8)], 2.6, OUT, { end: 0.12, bias: 0.55 });
    flick(g, add(root, mul(dir, L * 0.15)), dir, L * 0.6, 0.8, gv(0.45, 0.5), 0.05);
  }
}
// a wing fan (folded or open): feathers from the tip in, the covert band on top, soft scalloped tips
function paintFan(g, W, light, o = {}) {
  const r = rng(o.seed || 7), line = o.line || 1.8;
  const one = (f, k) => {
    const pts = pointedFeather(f.root, f.dir, f.L, f.w, f.bend || 0), path = blobPath(pts);
    plumage(g, path, { base: 0.95, shade: 0.76, light, depth: f.w * 0.5, blur: f.w * 0.25 });
    ink(g, [pts[1], pts[2], pts[3], pts[4], pts[5], pts[6]], line, OUT, { end: 0.12, bias: 0.6 });
    ink(g, [add(f.root, mul(f.dir, f.L * 0.15)), add(f.root, mul(f.dir, f.L * 0.8))], line * 0.35, gv(0.45, 0.5), { end: 0.1 });
    for (let j = 0; j < 2; j++) { const p = add(f.root, mul(f.dir, f.L * (0.35 + 0.25 * j + 0.05 * r()))); flick(g, p, nrm(add(f.dir, mul(perp(f.dir), 0.8))), f.w * 0.35, line * 0.3, gv(0.5, 0.45), 0.1); }
    void k;
  };
  for (let i = W.prim.length - 1; i >= 0; i--) one(W.prim[i], i);
  for (let i = W.sec.length - 1; i >= 0; i--) one(W.sec[i], i);
  const bp = blobPath(W.band);
  plumage(g, bp, { base: 0.97, shade: 0.82, light, depth: W.cw * 0.4, blur: W.cw * 0.2 });
  const n = W.lead.length;
  for (let i = 2; i < n - 3; i += 3) {
    const f = i / (n - 1), p = add(W.lead[i], mul(W.tr, W.cw * (1 - 0.85 * f) * 0.95)), q = add(W.lead[i + 3], mul(W.tr, W.cw * (1 - 0.85 * (i + 3) / (n - 1)) * 0.95));
    ink(g, [p, add(V.mix(p, q, 0.5), mul(W.tr, W.cw * 0.18)), q], line * 0.6, gv(0.35, 0.65), { end: 0.2 });
  }
  ink(g, W.lead, line * 1.1, OUT, { end: 0.3, bias: 0.4 });
}

// a folded wing on the flank, seen from behind: its outer edge is the body's silhouette, so what shows is the inner
// keyline down the back, the scalloped tips of the flight feathers at the bottom and a few feather lines
function paintFolded(g, w, union, light) {
  const side = Math.sign((w.dS && w.dS[0]) || 1) || 1;
  const S = w.S, Wr = w.Wr, T = w.T, width = w.width ?? 34;
  const inn = (p, k) => [p[0] - side * width * k, p[1]];
  const outer = sampleCurve([S, Wr, T], 8), inner = sampleCurve([inn(S, 0.5), inn(Wr, 1), inn(T, 0.9)], 8);
  const shape = [...outer, ...inner.slice().reverse()];
  g.save(); g.beginPath(); union(g); g.clip();
  plumage(g, blobPath(shape), { base: 0.9, shade: 0.72, light, depth: width * 0.3, blur: width * 0.15 });
  g.restore();
  // the wing's inner edge down the back: coverts as a row of scallops, then the long flight feathers to the tip
  const n = 6;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n, a = inner[Math.round(t0 * (inner.length - 1))], b = inner[Math.round(t1 * (inner.length - 1))];
    const m = add(V.mix(a, b, 0.5), [side * 7, 3]);
    ink(g, [a, m, b], 1.6 + 0.4 * (i / n), gv(0.18, 0.9), { end: 0.15 });
  }
  // flight-feather tips round the bottom: pointed scallops fanning from the inner edge to the outer tip
  for (let i = 0; i < 4; i++) {
    const f = i / 3, base = V.mix(inn(T, 0.9), T, f), tip = add(base, [side * 6, 22 - 8 * f]);
    ink(g, [add(base, [-side * 10, -28]), add(base, [-side * 2, -6]), tip], 1.8, gv(0.18, 0.9), { end: 0.1 });
    ink(g, [tip, add(base, [side * 12, -6])], 1.2, gv(0.25, 0.8), { end: 0.2 });
  }
  for (let k = 0; k < 3; k++) { const p = V.mix(inn(Wr, 0.8), Wr, 0.3 + 0.25 * k); ink(g, [p, add(p, [side * 3, 40 + 10 * k])], 1.0, gv(0.35, 0.6), { end: 0.1 }); }
}
// a foot seen from behind and a little above: a short feathered leg, three toes pointing away, dark claws
function footB(g, f) {
  const { x, y, size: s = 20, leg = 12, rot = 0 } = f;
  const r = rng(f.seed || 3);
  g.save(); g.translate(x, y); g.rotate(rot); g.globalAlpha = clamp(f.a ?? 1);
  g.lineCap = "round"; g.lineJoin = "round";
  if (leg > 0) { taper(g, [[0, -leg - 6], [0, -leg / 2], [0, 0]], () => s * 0.62, LINE); taper(g, [[0, -leg - 6], [0, -leg / 2], [0, 0]], () => s * 0.44, gv(0.88)); }
  const sp = f.spread ?? 1;
  for (const [dx, dy, L] of [[-0.55, 0.25, 0.8], [0.55, 0.28, 0.85], [0, 0.45, 0.9]]) {
    const tip = [dx * s * sp * 1.1, dy * s * 1.2 * (f.sy ?? 0.6) / 0.6 * 0.6 + s * 0.15];
    const q = sampleCurve([[0, 0], V.mix([0, 0], tip, 0.55), tip], 5);
    taper(g, q, (u) => s * 0.42 * (1 - 0.35 * u) + 2.4, LINE);
    taper(g, q, (u) => s * 0.42 * (1 - 0.35 * u), gv(0.88 - 0.05 * r()));
    const d = nrm(sub(tip, q[q.length - 3])), e = add(tip, mul(d, s * 0.08));
    ink(g, [e, add(e, add(mul(d, s * 0.18), [0, s * 0.06]))], s * 0.16, gv(0.1), { end: 0.2 });
  }
  g.restore();
}
// an open wing drawn by the owl kit (owlInk.js drawWing, type "raised": layered pointed feathers with dark keylines,
// the source's spread wings). w: { S, Wr, T, trail, len, n, m, spread, fw, cov, seed }
function kitWing(g, w, light, res) {
  setPPU(res);
  drawWing(g, { type: "spread", style: "layered", S: w.S, Wr: w.Wr, T: w.T, trail: w.trail || [0, 1], len: w.len || 80, n: Math.round(w.n || 7), m: Math.round(w.m || 5), spread: w.spread ?? 1, fw: w.fw ?? 1.1, cov: Math.round(w.cov ?? 2), seed: w.seed || 17, point: w.point ?? 0.55, secLen: w.secLen ?? 1, bulge: 0.08 }, { light, detail: 1 });
  if (w.keys !== false) kitKeylines(g, w);
  // the leading edge in the outline ink
  ink(g, sampleCurve([w.S, w.Wr, w.T], 6), 2.2, OUT, { end: 0.3, bias: 0.4 });
}
// dark keylines along the long feathers' outer edges (the source's inked wing feathers), drawn over the kit wing
function kitKeylines(g, w) {
  const geo = wingGeomKit(w);
  for (const f of geo.feathers) {
    if (f.row !== "pri" && f.row !== "sec") continue;
    const n = perp(f.dir), side = f.row === "pri" ? 1 : -1;
    ink(g, [add(f.root, mul(n, side * f.w * 0.3)), add(add(f.root, mul(f.dir, f.L * 0.55)), mul(n, side * f.w * 0.42)), add(f.root, mul(f.dir, f.L * 0.98))], Math.max(1, f.w * 0.07), gv(0.18, 0.85), { end: 0.1, bias: 0.45 });
  }
}
const wingGeomKit = (w) => wingGeom({ type: "spread", style: "layered", S: w.S, Wr: w.Wr, T: w.T, trail: w.trail || [0, 1], len: w.len || 80, n: Math.round(w.n || 7), m: Math.round(w.m || 5), spread: w.spread ?? 1, fw: w.fw ?? 1.1, cov: Math.round(w.cov ?? 2), seed: w.seed || 17, point: w.point ?? 0.55, secLen: w.secLen ?? 1, bulge: 0.08 });
// ---------------------------------------------------------------- the layer
// P = pose (absolute frame px) + { s: scale about (ox, oy), ox, oy, res, light }. Returns { canvas, x, y, w, h }.
export function backLayer(P, canvas = null) {
  const res = P.res || 1, light = P.light || [0.2, -1];
  const H = headOutline(P.head), B = bodyOutline(P.body);
  const wings = P.wings.map((w) => ({ ...w, g: w.kit ? null : wingFan(w) }));
  // bounds
  const all = [...H, ...B];
  wings.forEach((w) => { all.push(w.S, w.Wr, w.T); if (w.kit) { const L = (w.len || 80) * 1.4; all.push(add(w.T, [L, L]), add(w.T, [-L, -L]), add(w.Wr, [L, L]), add(w.Wr, [-L, L]), add(w.S, [0, L])); } else [...w.g.prim, ...w.g.sec].forEach((f) => all.push(add(f.root, mul(f.dir, f.L)))); });
  (P.cups || []).forEach((c) => all.push([c.x - c.r * 1.3, c.y - c.r * 1.3], [c.x + c.r * 1.3, c.y + c.r * 1.3]));
  if (P.band) all.push(...P.band.pts);
  if (P.tail) all.push(P.tail.base, P.tail.tip);
  if (P.crest) all.push([P.crest.x + Math.cos(P.crest.dir) * P.crest.len * 1.2, P.crest.y + Math.sin(P.crest.dir) * P.crest.len * 1.2]);
  (P.feet || []).forEach((f) => all.push([f.x - f.size * 2, f.y - f.size * 2 - (f.leg || 0)], [f.x + f.size * 2, f.y + f.size * 2]));
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of all) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  x0 = Math.floor(x0 - 24); y0 = Math.floor(y0 - 24); x1 = Math.ceil(x1 + 24); y1 = Math.ceil(y1 + 24);
  const cw = Math.max(1, Math.round((x1 - x0) * res)), ch = Math.max(1, Math.round((y1 - y0) * res));
  const cv = canvas || document.createElement("canvas");
  if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
  const g = cv.getContext("2d", { willReadFrequently: true });
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch);
  g.setTransform(res, 0, 0, res, -x0 * res, -y0 * res);
  setPPU(res);
  const cupsBack = (P.cups || []).filter((c) => !c.front), cupsFront = (P.cups || []).filter((c) => c.front);
  // 1. behind the head: far cup, band if it runs behind
  for (const c of cupsBack) drawCupB(g, c);
  if (P.band && !P.band.front) drawBandB(g, P.band);
  // 2. back wings, tail, feet
  for (const w of wings) if (w.layer === "back") { if (w.kit) kitWing(g, w, light, res); else paintFan(g, w.g, light, { seed: w.seed }); }
  if (P.tail) {
    const tb = P.tail, n = Math.max(1, Math.round(tb.n || 3)), d = nrm(sub(tb.tip, tb.base)), L = V.len(sub(tb.tip, tb.base));
    for (let i = 0; i < n; i++) {
      const f = n === 1 ? 0 : i / (n - 1) - 0.5, dir = V.rot(d, f * 0.5);
      const pts = pointedFeather(add(tb.base, mul(perp(d), f * tb.w)), dir, L * (1 - 0.2 * Math.abs(f)), tb.w * 0.8, 0);
      plumage(g, blobPath(pts), { base: 0.92, shade: 0.72, light, depth: 8, blur: 5 });
      ink(g, pts.slice(1, 8), 1.6, OUT, { end: 0.2 });
    }
  }
  for (const f of P.feet || []) if ((f.a ?? 1) > 0.05) footB(g, f);
  // 3. body + head: one soft mass
  const hb = P.head, bb = P.body;
  // the neck: an ellipse bridging the head's lower half and the body's top, so the two read as one pear
  const nk = V.mix([hb.x, hb.y], [bb.x, bb.y], 0.5), nd = sub([bb.x, bb.y], [hb.x, hb.y]), nL = V.len(nd) || 1;
  const nrx = Math.min(hb.rx, bb.rx) * (P.neck ?? 0.86), nry = nL * 0.55, na = Math.atan2(nd[1], nd[0]) - Math.PI / 2;
  const union = (c) => { polyPath(B)(c); polyPath(H)(c); c.moveTo(nk[0] + nrx * Math.cos(na), nk[1] + nrx * Math.sin(na)); c.ellipse(nk[0], nk[1], nrx, nry, na, 0, TAU); };
  plumage(g, union, { base: 0.975, shade: 0.84, light, depth: Math.min(bb.rx, bb.ry) * 0.18, blur: Math.min(bb.rx, bb.ry) * 0.32, keep: [0, bb.ry * 0.3] });
  // measured (60.60, un-graded): the back reads 0.93–0.96 in the middle and 0.75–0.85 along the flanks and under the
  // head; a toned band inside the whole silhouette, the underside and both flanks
  // (the band follows the OUTER silhouette only: the outside of the union is painted grey on a scratch canvas, blurred
  // in, and composited inside the union)
  edgeBand(g, cv, union, res, gv(0.62), 0.42, 7);
  softShade(g, union, (c) => c.ellipse(bb.x, bb.y + bb.ry * 1.0, bb.rx * 0.95, bb.ry * 0.3, bb.rot, 0, TAU), 0.64, 0.35, bb.ry * 0.15);
  softShade(g, union, (c) => { c.ellipse(bb.x - bb.rx * 1.02, bb.y + bb.ry * 0.1, bb.rx * 0.25, bb.ry * 0.9, bb.rot, 0, TAU); }, 0.66, 0.35, bb.rx * 0.15);
  // feather strokes: clusters of 2-3 fine strokes down the back, fanning from the crown on the head; denser and
  // darker toward the edges (the source's scratched plumage)
  const r = rng(15);
  g.save(); g.beginPath(); union(g); g.clip();
  const bc = [bb.x, bb.y], dn = V.rot([0, 1], bb.rot);
  for (let i = 0; i < 520; i++) {
    const a = r() * TAU, d = Math.pow(r(), 0.35);
    const p = add(bc, V.rot([Math.cos(a) * bb.rx * d, Math.sin(a) * bb.ry * d], bb.rot));
    const fan = Math.cos(a) * d;
    const dir = V.rot(dn, -fan * 0.6 + (r() - 0.5) * 0.3);
    const L = 14 + r() * 26, n = 2 + Math.floor(r() * 2);
    if (r() < 0.45) continue;
    for (let k = 0; k < n; k++) flick(g, add(p, mul(perp(dir), (k - (n - 1) / 2) * 3.2)), V.rot(dir, (r() - 0.5) * 0.1), L * (0.7 + 0.4 * r()), 0.7 + 0.4 * r(), gv(0.35, 0.08 + 0.5 * d * d * d), 0.1 * Math.sign(fan || 1));
  }
  const crown = P.crown || [hb.x, hb.y - hb.ry * 0.55];
  for (let i = 0; i < 300; i++) {
    const a = r() * TAU, d = Math.pow(r(), 0.35);
    const p = [hb.x + Math.cos(a) * hb.rx * d, hb.y + Math.sin(a) * hb.ry * d];
    const dir = nrm(sub(p, crown));
    const L = 8 + r() * 14, n = 2 + Math.floor(r() * 2);
    if (r() < 0.45) continue;
    for (let k = 0; k < n; k++) flick(g, add(p, mul(perp(dir), (k - (n - 1) / 2) * 3)), V.rot(dir, (r() - 0.5) * 0.15), L, 0.65 + 0.3 * r(), gv(0.35, 0.08 + 0.45 * d * d * d), 0.08);
  }
  g.restore();
  // 4. front wings (folded on the flanks, or raised)
  for (const w of wings) if (w.layer !== "back") { if ((w.open ?? 1) < 0.5) paintFolded(g, w, union, light); else if (w.kit) kitWing(g, w, light, res); else paintFan(g, w.g, light, { seed: w.seed }); }
  // 5. crest, bandage, band and near cups
  if (P.crest && (P.crest.a ?? 1) > 0.05) drawCrestB(g, P.crest, light);
  if (P.bandage && (P.bandage.a ?? 1) > 0.05 && P.bandage.size > 4) drawBandageB(g, P.bandage);
  if (P.band && P.band.front) drawBandB(g, P.band);
  for (const c of cupsFront) drawCupB(g, c);
  setPPU(1);
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (P.tone !== false) screentone(cv, { pitch: 3.7 * res, grain: 3 / 255, cross: 0.6, keepInk: 0.05, floor: 0.5, amp: 0.035 });
  outline(cv, 3.4 * res);
  return { canvas: cv, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
// grey tone fading in from the outer silhouette of `path` (value col, alpha a, blur px), clipped inside it
let EB = null;
function edgeBand(g, cv, path, res, col, a, blur) {
  if (!EB) EB = document.createElement("canvas");
  if (EB.width !== cv.width || EB.height !== cv.height) { EB.width = cv.width; EB.height = cv.height; }
  const e = EB.getContext("2d");
  e.setTransform(1, 0, 0, 1, 0, 0); e.globalCompositeOperation = "source-over"; e.clearRect(0, 0, EB.width, EB.height);
  e.fillStyle = col; e.fillRect(0, 0, EB.width, EB.height);
  e.setTransform(g.getTransform()); e.globalCompositeOperation = "destination-out"; e.fillStyle = "#000"; e.beginPath(); path(e); e.fill();
  g.save(); g.beginPath(); path(g); g.clip();
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a; g.filter = `blur(${(blur * res).toFixed(1)}px)`; g.drawImage(EB, 0, 0); g.filter = "none"; g.globalAlpha = 1;
  g.restore();
}
// a dark contour round the whole silhouette (the layer's alpha dilated, drawn behind)
let OC = null;
function outline(cv, w) {
  if (!OC) OC = document.createElement("canvas");
  if (OC.width !== cv.width || OC.height !== cv.height) { OC.width = cv.width; OC.height = cv.height; }
  const o = OC.getContext("2d");
  o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = "source-over"; o.clearRect(0, 0, OC.width, OC.height);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; o.drawImage(cv, Math.cos(a) * w, Math.sin(a) * w); }
  o.globalCompositeOperation = "source-in"; o.fillStyle = "#121110"; o.fillRect(0, 0, OC.width, OC.height);
  const g = cv.getContext("2d");
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "destination-over"; g.drawImage(OC, 0, 0); g.restore();
}
