// s19 owl seen from BEHIND (58.00–62.28: it lands, skids, sits, gets up, stands and lifts the card with its back to
// us). The kit's rig draws front and three-quarter views only, so this painter builds the back view from the kit's
// parts (plumage, softShade, strokes, flicks, feet) plus its own headphones and bandage.
// Poses are in ABSOLUTE FRAME PX (each measured on its own source frame) and share one structure, so any two
// interpolate number by number (lerpPose). Wings are always fans (a folded wing is a fan with its feathers hanging
// down the flank), so folded -> open interpolates too.
import { plumage, softShade, flick, ink, screentone, setPPU, gv, LINE, V, drawFoot, drawWing, wingGeom, rimHatch } from "../../../lib/owlInk.js";
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
  (o.wings || []).forEach((w) => { for (const k of Object.keys(w)) if (PTS.has(k)) w[k] = mv(w[k]); if (w.floor) { w.lead = w.lead.map(mv); w.trail = w.trail.map(mv); } });
  if (o.tail) { o.tail.base = mv(o.tail.base); o.tail.tip = mv(o.tail.tip); }
  if (o.band) { o.band.pts = o.band.pts.map(mv); o.band.arm = o.band.arm.map(mv); if (o.band.cut) { o.band.cut.x += dx; o.band.cut.y += dy; } }
  return o;
}
// turn a whole pose by ang radians (clockwise, y down) about c (default: the body centre), then move it by (dx, dy)
export function rotatePose(p, ang, dx = 0, dy = 0, c = null) {
  const o = JSON.parse(JSON.stringify(p));
  const C = c || [o.body.x, o.body.y], ca = Math.cos(ang), sa = Math.sin(ang);
  const R = (q) => [C[0] + ca * (q[0] - C[0]) - sa * (q[1] - C[1]) + dx, C[1] + sa * (q[0] - C[0]) + ca * (q[1] - C[1]) + dy];
  const RO = (q) => { const r = R([q.x, q.y]); q.x = r[0]; q.y = r[1]; };
  RO(o.head); o.head.roll = (o.head.roll || 0) + ang;
  RO(o.body); o.body.rot = (o.body.rot || 0) + ang;
  if (o.crest) { RO(o.crest); o.crest.dir += ang; }
  if (o.bandage) { RO(o.bandage); o.bandage.rot = (o.bandage.rot || 0) + ang; }
  if (o.crown) o.crown = R(o.crown);
  (o.cups || []).forEach((q) => { RO(q); q.rot = (q.rot || 0) + ang; });
  (o.feet || []).forEach((q) => { RO(q); q.rot = (q.rot || 0) + ang; });
  (o.wings || []).forEach((w) => { for (const k of ["S", "Wr", "T"]) w[k] = R(w[k]); });
  if (o.tail) { o.tail.base = R(o.tail.base); o.tail.tip = R(o.tail.tip); }
  if (o.band) { o.band.pts = o.band.pts.map(R); o.band.arm = o.band.arm.map(R); if (o.band.cut) { RO(o.band.cut); o.band.cut.rot = (o.band.cut.rot || 0) + ang; } }
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
  if (o.band) { o.band.pts = o.band.pts.map(T); o.band.arm = o.band.arm.map(T); o.band.w *= sc; if (o.band.cut) { TO(o.band.cut); o.band.cut.rx *= sc; o.band.cut.ry *= sc; } }
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
  // the cushion: a dark padded ring against the head (x < 0), fine ribs across it (the source's pleated leather)
  const ccx = -0.12 * r, crx = (0.34 + 0.22 * open) * r, cry = 1.0 * r;
  const cush = (q) => q.ellipse(ccx, 0, crx, cry, 0, 0, TAU);
  g.fillStyle = "#101010"; g.beginPath(); cush(g); g.fill();
  g.save(); g.beginPath(); cush(g); g.clip();
  for (let i = -26; i <= 26; i++) {
    const t = i / 26, yy = t * cry, hw = Math.sqrt(Math.max(0, 1 - t * t)) * crx;
    g.strokeStyle = gv(0.28 + 0.22 * rr(), 0.7); g.lineWidth = 1.0 + 0.5 * rr();
    g.beginPath(); g.moveTo(ccx - hw * 0.95, yy); g.quadraticCurveTo(ccx - hw * 0.2, yy + 1.5, ccx + hw * 0.4, yy - 0.5); g.stroke();
  }
  g.restore();
  g.strokeStyle = gv(0.55, 0.8); g.lineWidth = Math.max(1, r * 0.025); g.beginPath(); g.ellipse(ccx, 0, crx * 0.96, cry * 0.97, 0, 2.2, 4.1); g.stroke();
  // the shell: a pale domed cap facing out, lit from the upper right, engraved arcs, dark keyline and a bright rim
  const sx = (0.16 + 0.2 * open) * r, srx = (0.1 + 0.5 * open) * r, sry = 0.9 * r;
  const shell = (q) => q.ellipse(sx, 0, srx, sry, 0, 0, TAU);
  g.save(); g.beginPath(); shell(g); g.clip();
  const gr = g.createLinearGradient(sx + srx, -sry, sx - srx, sry);
  // (fix pass 4: a touch darker, metal rather than a white disc: measured 154 against the render's 166 at 60.52)
  gr.addColorStop(0, gv(0.88)); gr.addColorStop(0.45, gv(0.66)); gr.addColorStop(1, gv(0.3));
  g.fillStyle = gr; g.fillRect(sx - srx - 2, -sry - 2, srx * 2 + 4, sry * 2 + 4);
  for (let i = 0; i < 7; i++) { const k = 0.35 + 0.1 * i; g.strokeStyle = gv(0.3, 0.45); g.lineWidth = 1; g.beginPath(); g.ellipse(sx + srx * 0.1, 0, srx * k, sry * k, 0, 1.7, 4.4); g.stroke(); }
  for (let i = 0; i < 10; i++) { g.strokeStyle = gv(1, 0.5); g.lineWidth = 1; const a = -1.3 + rr() * 1.2; g.beginPath(); g.ellipse(sx, 0, srx * (0.5 + 0.4 * rr()), sry * (0.5 + 0.4 * rr()), 0, a, a + 0.6); g.stroke(); }
  g.restore();
  g.strokeStyle = gv(0.1); g.lineWidth = Math.max(1.6, r * 0.04); g.beginPath(); shell(g); g.stroke();
  g.strokeStyle = gv(0.98, 0.95); g.lineWidth = Math.max(2.4, r * 0.055); g.beginPath(); g.ellipse(sx, 0, srx * 0.9, sry * 0.93, 0, 4.75, 6.25); g.stroke();
  g.strokeStyle = LINE; g.lineWidth = Math.max(1.6, r * 0.04); g.beginPath(); cush(g); g.stroke();
  g.restore();
}
// the headband: on the head a slim dark band with a paler inner strip; knocked round the neck (dark = 1) a broad
// dark strap with a pale top edge; arm = the slider from the strap's end up into the near cup
function drawBandB(g, b) {
  const q = sampleCurve(b.pts, 10), w = b.w, d = clamp(b.dark ?? 0);
  const off = (k) => q.map(([x, y], i) => { const a = q[Math.max(0, i - 1)], c = q[Math.min(q.length - 1, i + 1)], dx = c[0] - a[0], dy = c[1] - a[1], L = Math.hypot(dx, dy) || 1; return [x + dy / L * w * k, y - dx / L * w * k]; });
  if (d > 0.5) {
    // knocked round the neck / wrapped round the head (fix pass 4): one solid dark padded strap, a keyline, a slightly
    // lighter soft middle and a single thin highlight along one edge (the source's; no stripes, no stitching).
    // b.tone: the strap's grey (the landing's band round the head reads lighter, ≈ 0.3, than the sit's strap)
    const tn = b.tone ?? 0.13;
    taper(g, q, () => w + 3.5, "#0b0b0b");
    taper(g, q, () => w, gv(tn));
    taper(g, off(-0.06), () => w * 0.5, gv(tn + 0.07, 0.55));
    taper(g, off(0.34), () => Math.max(1.3, w * 0.055), gv(0.82, 0.8));
  } else {
    taper(g, q, () => w, "#121212");
    // on the head: a padded dark band (fix pass 4: ≈ 16 px), a soft grey cushion strip along its inner side and a
    // bright highlight along its outer edge
    taper(g, off(-0.18), () => w * 0.42, gv(0.3, 0.85));
    taper(g, off(0.05), () => w * 0.22, gv(0.2, 0.9));
    taper(g, off(0.32), () => Math.max(1.4, w * 0.12), gv(0.9, 0.9));
  }
  if (b.arm && d > 0.2) {
    // the slider from the strap's end up into the cup: a wide segmented metal bar
    const a = b.arm, t = nrm(sub(a[2], a[0])), n = perp(t), L = V.len(sub(a[2], a[0])), sw = w * (b.armW ?? 1.15);
    const body = [add(a[0], mul(n, -sw / 2)), add(a[2], mul(n, -sw / 2)), add(a[2], mul(n, sw / 2)), add(a[0], mul(n, sw / 2))];
    g.fillStyle = "#121212"; g.beginPath(); g.moveTo(...body[0]); for (const p of body) g.lineTo(...p); g.closePath(); g.fill();
    const seg = Math.max(2, Math.round(L / 16));
    for (let k = 0; k < seg; k++) {
      const p0 = V.mix(a[0], a[2], (k + 0.12) / seg), p1 = V.mix(a[0], a[2], (k + 0.88) / seg), hw = sw * 0.36;
      const quad = [add(p0, mul(n, -hw)), add(p1, mul(n, -hw)), add(p1, mul(n, hw)), add(p0, mul(n, hw))];
      const gr = g.createLinearGradient(...add(p0, mul(n, -hw)), ...add(p0, mul(n, hw)));
      gr.addColorStop(0, gv(0.45)); gr.addColorStop(0.5, gv(0.85)); gr.addColorStop(1, gv(0.5));
      g.fillStyle = gr; g.beginPath(); g.moveTo(...quad[0]); for (const p of quad) g.lineTo(...p); g.closePath(); g.fill();
    }
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
// the crest: a wispy tuft of 4–6 thin tapered strands sweeping off the top of the head (the source's hair-like
// feathers, not a leaf): each strand is a pale sliver with a dark keyline along its lower side, curling at the tip
function drawCrestB(g, c, light) {
  // (fix pass 4: bolder: 4–5 broad tapered strands that sweep out past the head's outline (the source's swoosh), each a
  // pale sliver with dark keylines on both sides, the longest in the middle)
  const n = Math.max(4, Math.min(5, Math.round((c.n || 4))));
  const r = rng(c.seed || 23);
  for (let i = n - 1; i >= 0; i--) {
    const f = i / (n - 1);
    const a = c.dir + (f - 0.5) * (c.fan ?? 0.6) * 0.7 + (r() - 0.5) * 0.08;
    const dir = [Math.cos(a), Math.sin(a)], nn = perp(dir);
    const root = add([c.x, c.y], mul(nn, (f - 0.5) * c.w * 0.8));
    const L = c.len * (0.8 + 0.5 * (1 - Math.abs(f - 0.45) * 1.6) * (0.85 + 0.3 * r()));
    const curl = (c.curl ?? 0.12) * (0.6 + 0.8 * r()) + 0.14;
    const up = nn[1] <= 0 ? nn : mul(nn, -1);                         // the tip curls upward
    const P = (u) => add(add(root, mul(dir, L * u)), mul(up, curl * L * u * u));
    const wd = c.w * (0.46 + 0.14 * r());
    const L1 = [], R1 = [];
    for (let k = 0; k <= 12; k++) { const u = k / 12, p = P(u), q = P(Math.min(1, u + 0.05)), d = nrm(sub(q, p)), m = perp(d), hw = wd * 0.5 * Math.pow(1 - u, 0.7) * Math.min(1, 0.55 + u * 3); L1.push(add(p, mul(m, hw))); R1.push(sub(p, mul(m, hw))); }
    const shape = [...L1, ...R1.slice().reverse()];
    g.fillStyle = gv(0.95 - 0.05 * f); g.beginPath(); g.moveTo(shape[0][0], shape[0][1]); for (const p of shape) g.lineTo(p[0], p[1]); g.closePath(); g.fill();
    ink(g, L1.slice(2), 2.4, gv(0.1), { end: 0.05, bias: 0.35 });
    ink(g, R1.slice(3), 1.8, gv(0.12), { end: 0.05, bias: 0.35 });
    ink(g, [P(0.2), P(0.55), P(0.85)], 0.8, gv(0.5, 0.55), { end: 0.1 });
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

// a folded wing on the flank, seen from behind: its outer edge is the body's silhouette; inside it, the stacked
// flight feathers show as long soft pointed shapes, each with a hatch-weight keyline along its inner edge, their tips
// fanning past the body at the bottom (the source's soft layered wing)
function paintFolded(g, w, union, light) {
  const side = Math.sign((w.dS && w.dS[0]) || 1) || 1;
  const S = w.S, Wr = w.Wr, T = w.T, width = w.width ?? 34;
  const inn = (p, k) => [p[0] - side * width * k, p[1]];
  const outer = sampleCurve([S, Wr, T], 8), inner = sampleCurve([inn(S, 0.5), inn(Wr, 1), inn(T, 0.9)], 8);
  const shape = [...outer, ...inner.slice().reverse()];
  g.save(); g.beginPath(); union(g); g.clip();
  plumage(g, blobPath(shape), { base: 0.92, shade: 0.74, light, depth: width * 0.3, blur: width * 0.2 });
  g.restore();
  const r = rng(w.seed || 13);
  // coverts: a short row of soft scallops just under the shoulder
  for (let i = 0; i < 3; i++) {
    const u0 = 0.08 + i * 0.12, a = V.mix(inner[Math.round(u0 * (inner.length - 1))], outer[Math.round(u0 * (outer.length - 1))], 0.1);
    const b = V.mix(inner[Math.round((u0 + 0.14) * (inner.length - 1))], outer[Math.round((u0 + 0.14) * (outer.length - 1))], 0.25);
    ink(g, [a, add(V.mix(a, b, 0.5), [side * 6, 4]), b], 1.2, gv(0.3, 0.6), { end: 0.15 });
  }
  // flight feathers: 4 long pointed feathers stacked down the flank, from the inner edge toward the tip
  const nF = 4;
  for (let i = 0; i < nF; i++) {
    const f = i / (nF - 1);
    const root = V.mix(V.mix(inn(S, 0.4), inn(Wr, 0.9), 0.55), V.mix(Wr, T, 0.2), f * 0.8);
    const tip = add(V.mix(inn(T, 0.7), T, 0.2 + 0.8 * f), [side * (4 + 6 * f), 14 - 4 * f + 6 * r()]);
    const mid = add(V.mix(root, tip, 0.5), [-side * (6 + 4 * r()), 0]);
    // (fix pass 4: the source's folded wing reads as layered, inked feather edges down the flank)
    ink(g, [root, mid, tip], 2.1, gv(0.2, 0.85), { end: 0.08, bias: 0.6 });
    ink(g, [add(tip, [0, -2]), add(V.mix(tip, root, 0.25), [side * 12, 0])], 1.5, gv(0.24, 0.7), { end: 0.2 });
    for (let k = 0; k < 3; k++) { const p = V.mix(root, tip, 0.25 + 0.2 * k + 0.05 * r()); flick(g, add(p, [side * 3, 0]), nrm([side * 0.45, 1]), 12 + 6 * r(), 0.8, gv(0.4, 0.4), 0.1); }
  }
}
// a wing lying along the floor (the skid and the push up, 58.24–58.40, fix pass 4): a broad soft white wing, its
// leading edge lead = [shoulder, mid, tip] on top, its trailing edge trail = [..] along the floor; two rows of covert
// scallops across it and 5 layered, rounded-pointed primaries toward the tip, each inked round its edge (no shafts:
// the source's soft wing, not a quill). w = { floor: 1, lead, trail, seed }
function paintFloorWing(g, w, light) {
  const lead = sampleCurve(w.lead, 8), trail = sampleCurve(w.trail, 8), T = w.lead[2];
  const mass = [...lead, ...trail.slice().reverse()];
  const r = rng(w.seed || 19);
  const tipDir = nrm(sub(T, w.lead[1]));
  const At = (arr, u) => arr[Math.round(clamp(u) * (arr.length - 1))];
  // primaries: rooted along the coverts' lower edge, their tips spread from the wing tip back along the floor; drawn
  // from the floor upward so each upper feather overlaps the one below
  const nP = 5;
  for (let i = nP - 1; i >= 0; i--) {
    const f = i / (nP - 1);
    const root = V.mix(At(lead, 0.3 + 0.1 * f), At(trail, 0.3 + 0.1 * f), 0.2 + 0.55 * f);
    const tip = add(add(V.mix(T, At(lead, 0.58), 0.92 * (1 - f)), [0, 16 * (1 - f)]), mul(tipDir, 4 + 3 * r()));
    const d = nrm(sub(tip, root)), L = V.len(sub(tip, root)), fw = Math.min(44, 22 + L * 0.2);
    const pts = pointedFeather(root, d, L, fw, 0.03 * (0.5 - f));
    plumage(g, blobPath(pts), { base: 0.95, shade: 0.72, light, depth: fw * 0.5, blur: fw * 0.25 });
    ink(g, [pts[1], pts[2], pts[3], pts[4], pts[5], pts[6], pts[7]], 1.9, OUT, { end: 0.15, bias: 0.4 });
    ink(g, [pts[3], pts[4], pts[5]], 3.4, gv(0.1), { end: 0.3 });          // the dark inked tip
    flick(g, V.mix(root, tip, 0.45), d, L * 0.3, 0.9, gv(0.45, 0.4), 0.05);
  }
  // the covert mass over the feathers' roots (the first 3/4 of the wing, thinning to the leading edge)
  const cl = lead.filter((_, i) => i <= Math.round(0.6 * (lead.length - 1)));
  const cov = [...cl, ...cl.slice().reverse().map((p, i, arr) => { const u = 0.6 * (1 - i / (arr.length - 1)); return V.mix(At(lead, u), At(trail, u), 0.5 * (1 - u / 0.6) + 0.1); })];
  plumage(g, blobPath(cov), { base: 0.97, shade: 0.8, light, depth: 18, blur: 10 });
  const cb = cov.slice(cl.length);
  ink(g, cb, 1.5, gv(0.28, 0.75), { end: 0.2 });
  // a row of scallops across the coverts
  for (let j = 0; j < 4; j++) {
    const u0 = 0.06 + 0.12 * j, u1 = u0 + 0.11;
    const P = (u) => V.mix(At(lead, u), At(trail, u), 0.3 * (1 - u));
    const pa = P(u0), pb = P(u1), m = V.mix(pa, pb, 0.5);
    ink(g, [pa, add(m, [2, 8]), pb], 1.3, gv(0.32, 0.7), { end: 0.2 });
  }
  ink(g, lead, 2.4, OUT, { end: 0.3, bias: 0.4 });
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
// legs seen from behind: a tarsus (pale, dark keylines, scale ticks) from under the feathers down to the ankle, the
// toes spread flat left and right along the floor with dark hooked claws, a short hind toe toward us. A lifted foot
// (raised = 1) hangs its toes down and curls the claws. L = [ankle x, ankle y, top y, reach left, reach right, raised, a]
export function drawLegB(g, L, seed = 3) {
  const [x, y, top, rl, rr, raised = 0, a = 1] = L;
  if (a < 0.05) return;
  const r = rng(seed);
  g.save(); g.globalAlpha = clamp(a); g.lineCap = "round"; g.lineJoin = "round";
  const tw = 11, ow = 2.4;
  // the tarsus, a touch wider at the top
  const tq = [[x + 1.5, top - 14], [x + 0.5, (top + y) / 2], [x, y]];
  taper(g, sampleCurve(tq, 6), (u) => tw + 2 * ow + 3 * (1 - u), OUT);
  taper(g, sampleCurve(tq, 6), (u) => tw + 3 * (1 - u), gv(0.86));
  for (let k = 1; k < 3; k++) { const yy = y - (y - top) * k / 3.2; ink(g, [[x - tw * 0.3, yy], [x + tw * 0.3, yy + 1.5]], 0.8, gv(0.45, 0.35), { end: 0.4 }); }
  // toes: [end dx, end dy, bend] ; planted toes lie flat, lifted ones hang
  const toes = raised > 0.5
    ? [[-rl, 10, -6], [rr, 4, -8], [rr * 0.45, 22, 4]]
    : [[-rl, 6, -3], [rr, 8, -3], [6, 13, 0]];
  toes.forEach(([dx, dy, bend], i) => {
    const e = [x + dx, y + dy], m = [x + dx * 0.5, y + dy * 0.5 + bend];
    const q = sampleCurve([[x, y], m, e], 6);
    const w0 = i === 2 ? 8 : 10;
    taper(g, q, (u) => w0 * (1 - 0.3 * u) + 2 * ow, OUT);
    taper(g, q, (u) => w0 * (1 - 0.3 * u), gv(0.88 - 0.04 * r()));
    // knuckle pads: small dark ticks across the toe
    const n = 1;
    for (let k = 1; k <= n; k++) { const p = q[Math.round(k / (n + 1) * (q.length - 1))], b = q[Math.min(q.length - 1, Math.round(k / (n + 1) * (q.length - 1)) + 1)], d = V.nrm(sub(b, p)), nn = perp(d); ink(g, [add(p, mul(nn, -w0 * 0.35)), add(p, mul(nn, w0 * 0.35))], 0.9, gv(0.4, 0.4), { end: 0.4 }); }
    // the claw: a dark hook off the toe's end, curling down
    const d = V.nrm(sub(e, q[q.length - 3])), hook = raised > 0.5 ? 1.4 : 1;
    const c0 = add(e, mul(d, -1)), c1 = add(add(e, mul(d, 7 * hook)), [0, 3 * hook]), c2 = add(add(e, mul(d, 9 * hook)), [0, 10 * hook]);
    ink(g, [c0, c1, c2], 5.0, "#0b0a0a", { end: 0.1, bias: 0.3 });
  });
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
    ink(g, [add(f.root, mul(n, side * f.w * 0.3)), add(add(f.root, mul(f.dir, f.L * 0.55)), mul(n, side * f.w * 0.42)), add(f.root, mul(f.dir, f.L * 0.98))], Math.max(0.9, f.w * 0.05), gv(0.3, 0.6), { end: 0.1, bias: 0.45 });
  }
}
const wingGeomKit = (w) => wingGeom({ type: "spread", style: "layered", S: w.S, Wr: w.Wr, T: w.T, trail: w.trail || [0, 1], len: w.len || 80, n: Math.round(w.n || 7), m: Math.round(w.m || 5), spread: w.spread ?? 1, fw: w.fw ?? 1.1, cov: Math.round(w.cov ?? 2), seed: w.seed || 17, point: w.point ?? 0.55, secLen: w.secLen ?? 1, bulge: 0.08 });
// ---------------------------------------------------------------- the layer
// P = pose (absolute frame px) + { s: scale about (ox, oy), ox, oy, res, light }. Returns { canvas, x, y, w, h }.
export function backLayer(P, canvas = null) {
  const res = P.res || 1, light = P.light || [0.42, -0.9];
  const H = headOutline(P.head), B = bodyOutline(P.body);
  const wings = P.wings.map((w) => ({ ...w, g: w.kit || w.floor ? null : wingFan(w) }));
  // bounds
  const all = [...H, ...B];
  wings.forEach((w) => { if (w.floor) { all.push(...w.lead, ...w.trail); return; } all.push(w.S, w.Wr, w.T); if (w.kit) { const L = (w.len || 80) * 1.4; all.push(add(w.T, [L, L]), add(w.T, [-L, -L]), add(w.Wr, [L, L]), add(w.Wr, [-L, L]), add(w.S, [0, L])); } else [...w.g.prim, ...w.g.sec].forEach((f) => all.push(add(f.root, mul(f.dir, f.L)))); });
  (P.cups || []).forEach((c) => all.push([c.x - c.r * 1.3, c.y - c.r * 1.3], [c.x + c.r * 1.3, c.y + c.r * 1.3]));
  if (P.band) all.push(...P.band.pts);
  if (P.tail) all.push(P.tail.base, P.tail.tip);
  if (P.crest) all.push([P.crest.x + Math.cos(P.crest.dir) * P.crest.len * 1.2, P.crest.y + Math.sin(P.crest.dir) * P.crest.len * 1.2]);
  (P.feet || []).forEach((f) => all.push([f.x - f.size * 2, f.y - f.size * 2 - (f.leg || 0)], [f.x + f.size * 2, f.y + f.size * 2]));
  (P.legs || []).forEach((L) => all.push([L[0] - L[3] - 16, L[2] - 20], [L[0] + L[4] + 16, L[1] + 34]));
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
  for (const w of wings) if (w.layer === "back") {
    const paint = (q) => { if (w.kit) kitWing(q, w, light, res); else paintFan(q, w.g, light, { seed: w.seed }); };
    if (P.wblur > 0.01) rotBlur(g, cv, paint, w.S, P.wblur * (w.T[0] > w.S[0] ? -1 : 1), res, x0, y0);
    else if (w.kit) softWing(g, cv, paint, res, x0, y0);
    else paint(g);
  }
  if (P.tail) {
    // the tail: one soft broad tuft (a fan of feathers drawn as a single mass with two inner feather lines)
    const tb = P.tail, d = nrm(sub(tb.tip, tb.base)), L = V.len(sub(tb.tip, tb.base)), n = perp(d), w = tb.w * 1.25;
    const Pt = (u, v) => add(add(tb.base, mul(d, L * u)), mul(n, v));
    const pts = [Pt(0, -w * 0.5), Pt(0.45, -w * 0.62), Pt(0.85, -w * 0.3), Pt(1.02, 0.04 * w), Pt(0.88, w * 0.28), Pt(0.5, w * 0.6), Pt(0, w * 0.5)];
    plumage(g, blobPath(pts), { base: 0.92, shade: 0.72, light, depth: w * 0.2, blur: w * 0.12 });
    ink(g, pts.slice(1, 6), 1.8, OUT, { end: 0.15 });
    for (const v of [-0.22, 0.2]) ink(g, [Pt(0.2, v * w), Pt(0.6, v * w * 1.1), Pt(0.9, v * w * 0.4)], 1.0, gv(0.35, 0.6), { end: 0.15 });
  }
  if (P.legs) P.legs.forEach((L, i) => drawLegB(g, L, 3 + i * 4));
  else for (const f of P.feet || []) if ((f.a ?? 1) > 0.05) footB(g, f);
  // 3. body + head. Light comes from the card on the right: the right flank and the top of the back stay near white,
  // the left flank, the bottom and the head's underside go grey (measured, blurred: 0.93–0.97 in the middle, 0.45–0.7
  // along the shadow edges). The head is painted over the body so that its lower rim and its shadow on the body read
  // as a ruff: a round head sitting on a plump body.
  const hb = P.head, bb = P.body;
  // the neck only bridges the junction (a waist ≈ 0.84 of the head's width), so the head reads as a round head
  // sitting on the body, not as one column
  const nk = V.mix([hb.x, hb.y], [bb.x, bb.y], hb.ry / (hb.ry + bb.ry)), nd = sub([bb.x, bb.y], [hb.x, hb.y]), nL = V.len(nd) || 1;
  const nrx = Math.min(hb.rx, bb.rx) * (P.neck ?? 0.84), nry = nL * 0.32, na = Math.atan2(nd[1], nd[0]) - Math.PI / 2;
  const bodyP = (c) => { polyPath(B)(c); c.moveTo(nk[0] + nrx * Math.cos(na), nk[1] + nrx * Math.sin(na)); c.ellipse(nk[0], nk[1], nrx, nry, na, 0, TAU); };
  const headP = polyPath(H);
  const union = (c) => { bodyP(c); headP(c); };
  // the feathered bottom: soft pointed tips along the lower edge of the body (drawn first; the outline pass inks them)
  // the lift's skirt: long soft pointed feathers under the lower left of the body (drawn behind it, so only their
  // tips show past the silhouette as a feathered hem, pointing down and left)
  if (P.skirt) {
    const rs = rng(41);
    for (let i = 3; i >= 0; i--) {
      const a = (92 + i * 12) * Math.PI / 180 + (rs() - 0.5) * 0.06;
      const root = add([bb.x, bb.y], V.rot([Math.cos(a) * bb.rx * 0.86, Math.sin(a) * bb.ry * 0.86], bb.rot));
      const dir = nrm(V.rot([Math.cos(a), Math.sin(a)], 0.45));
      const L = bb.ry * (0.46 + 0.1 * rs()), w = 36 + 8 * rs();
      const pts = pointedFeather(root, dir, L, w, 0.14);
      plumage(g, blobPath(pts), { base: 0.93, shade: 0.78, light, depth: w * 0.3, blur: w * 0.25 });
      ink(g, pts.slice(1, 7), 1.3, gv(0.22, 0.75), { end: 0.1, bias: 0.6 });
      for (let k = 0; k < 3; k++) flick(g, add(root, mul(dir, L * (0.15 + 0.2 * k))), V.rot(dir, 0.15), L * 0.4, 0.8, gv(0.4, 0.45), 0.1);
    }
  }
  bottomTips(g, B, bb, light, 0);
  plumage(g, union, { base: 0.97, shade: 0.8, light, depth: Math.min(bb.rx, bb.ry) * 0.2, blur: Math.min(bb.rx, bb.ry) * 0.3, keep: [0, -bb.ry * 0.2] });
  edgeBand(g, cv, union, res, gv(0.5), 0.6, 13);
  softShade(g, union, (c) => c.ellipse(bb.x - bb.rx * 0.1, bb.y + bb.ry * 1.05, bb.rx * 1.0, bb.ry * 0.34, bb.rot, 0, TAU), 0.58, 0.45, bb.ry * 0.16);
  // the lower half of the body away from the light: a broad soft grey (measured 0.65–0.75 over the lower back)
  softShade(g, bodyP, (c) => c.ellipse(bb.x - bb.rx * 0.25, bb.y + bb.ry * 0.55, bb.rx * 0.95, bb.ry * 0.62, bb.rot, 0, TAU), 0.66, 0.35, bb.ry * 0.3);
  softShade(g, union, (c) => { c.ellipse(bb.x - bb.rx * 1.0, bb.y + bb.ry * 0.15, bb.rx * 0.32, bb.ry * 0.95, bb.rot, 0, TAU); }, 0.6, 0.45, bb.rx * 0.14);
  // the head's shadow on the body (the ruff under the head)
  softShade(g, bodyP, (c) => { c.save(); c.translate(0, hb.ry * 0.14); headP(c); c.restore(); }, 0.6, 0.36, hb.ry * 0.1);
  // feather strokes down the body: clusters of fine strokes, fanning out round the flanks; denser and darker toward
  // the edges and on the shadow side (the source's scratched plumage)
  const r = rng(15);
  const bc = [bb.x, bb.y], dn = V.rot([0, 1], bb.rot);
  const shadeAt = (p) => clamp(0.5 - 0.5 * ((p[0] - bb.x) / bb.rx * light[0] + (p[1] - bb.y) / bb.ry * light[1]));
  g.save(); g.beginPath(); bodyP(g); g.clip();
  for (let i = 0; i < 950; i++) {
    const a = r() * TAU, d = Math.pow(r(), 0.4);
    const p = add(bc, V.rot([Math.cos(a) * bb.rx * d, Math.sin(a) * bb.ry * d], bb.rot));
    const fan = Math.cos(a) * d;
    const dir = V.rot(dn, -fan * 0.7 + (r() - 0.5) * 0.3);
    const L = 12 + r() * 28, n = 2 + Math.floor(r() * 2), sh = shadeAt(p);
    if (r() < 0.3) continue;
    for (let k = 0; k < n; k++) flick(g, add(p, mul(perp(dir), (k - (n - 1) / 2) * 3.2)), V.rot(dir, (r() - 0.5) * 0.1), L * (0.7 + 0.4 * r()), 0.75 + 0.45 * r(), gv(0.3, 0.1 + 0.42 * Math.pow(d, 1.6) * (0.35 + 0.9 * sh)), 0.1 * Math.sign(fan || 1));
  }
  g.restore();
  // the shadow-side rim hatch round the body
  g.save(); g.beginPath(); bodyP(g); g.clip();
  rimHatch(g, B, { light, flow: [0, 1], len: 30, step: 3.2, w: 1.0, color: gv(0.3, 0.6), seed: 12, density: 1, bend: 0.45, thr: -0.1 });
  g.restore();
  // the head, over the body: its own soft fill, a grey rim (darkest along its underside), strokes fanning from the crown
  plumage(g, headP, { base: 0.97, shade: 0.8, light, depth: hb.ry * 0.2, blur: hb.ry * 0.28, keep: [0, -hb.ry * 0.25] });
  edgeBand(g, cv, headP, res, gv(0.5), 0.5, 9);
  softShade(g, headP, (c) => c.ellipse(hb.x - hb.rx * 0.1, hb.y + hb.ry * 1.0, hb.rx * 0.95, hb.ry * 0.3, hb.roll || 0, 0, TAU), 0.6, 0.34, hb.ry * 0.12);
  const crown = P.crown || [hb.x, hb.y - hb.ry * 0.55];
  g.save(); g.beginPath(); headP(g); g.clip();
  for (let i = 0; i < 380; i++) {
    const a = r() * TAU, d = Math.pow(r(), 0.4);
    const p = [hb.x + Math.cos(a) * hb.rx * d, hb.y + Math.sin(a) * hb.ry * d];
    const dir = nrm(sub(p, crown));
    const L = 8 + r() * 15, n = 2 + Math.floor(r() * 2);
    if (r() < 0.4) continue;
    const low = clamp((p[1] - hb.y) / hb.ry);
    for (let k = 0; k < n; k++) flick(g, add(p, mul(perp(dir), (k - (n - 1) / 2) * 3)), V.rot(dir, (r() - 0.5) * 0.15), L, 0.7 + 0.35 * r(), gv(0.28, 0.14 + 0.5 * d * d * (0.5 + 0.8 * low)), 0.08);
  }
  rimHatch(g, H, { light, flow: [0, 1], len: 18, step: 3.4, w: 0.9, color: gv(0.3, 0.55), seed: 22, density: 0.9, bend: 0.3, thr: 0.0 });
  g.restore();
  // the head's lower edge where it sits on the body: a soft broken keyline
  // the head's lower edge where it sits on the body: the ruff, an inked crease with short feather strokes hanging
  // from it onto the body
  const under = H.filter((q) => q[1] > hb.y + hb.ry * 0.3 && (inPolyB(q, B) || Math.abs(q[0] - hb.x) < hb.rx * 0.8));
  if (under.length > 3) {
    under.sort((p1, p2) => p1[0] - p2[0]);
    ink(g, under, 2.2, gv(0.22, 0.7), { end: 0.1, bias: 0.55 });
    const rr = rng(33);
    for (let i = 1; i < under.length - 1; i++) {
      const p = under[i];
      if (rr() < 0.25) continue;
      flick(g, add(p, [0, 2]), nrm([(p[0] - hb.x) / hb.rx * 0.5 + (rr() - 0.5) * 0.3, 1]), 10 + 10 * rr(), 1.1, gv(0.3, 0.5), 0.1);
    }
  }
  // 4. front wings (folded on the flanks, or raised)
  for (const w of wings) if (w.layer !== "back") {
    if (w.floor) { paintFloorWing(g, w, light); continue; }
    if ((w.open ?? 1) < 0.5) { paintFolded(g, w, union, light); continue; }
    const paint = (q) => { if (w.kit) kitWing(q, w, light, res); else paintFan(q, w.g, light, { seed: w.seed }); };
    if (P.wblur > 0.01) rotBlur(g, cv, paint, w.S, P.wblur * (w.T[0] > w.S[0] ? -1 : 1), res, x0, y0);
    else if (w.kit) softWing(g, cv, paint, res, x0, y0);
    else paint(g);
  }
  // 5. crest, bandage, band and near cups
  if (P.crest && (P.crest.a ?? 1) > 0.05) drawCrestB(g, P.crest, light);
  if (P.bandage && (P.bandage.a ?? 1) > 0.05 && P.bandage.size > 4) drawBandageB(g, P.bandage);
  if (P.band && P.band.front) { if (P.band.cut) bandCut(g, cv, P.band, res, x0, y0); else drawBandB(g, P.band); }
  for (const c of cupsFront) drawCupB(g, c);
  setPPU(1);
  g.setTransform(1, 0, 0, 1, 0, 0);
  if (P.tone !== false) screentone(cv, { pitch: 3.7 * res, grain: 3 / 255, cross: 0.6, keepInk: 0.05, floor: 0.5, amp: 0.035 });
  outline(cv, 2.3 * res);
  return { canvas: cv, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
// a wing swung fast about its shoulder: painted once on a scratch layer, then laid down as 12 copies rotated about
// the shoulder over `ang` radians (progressive average: copy k at alpha 1/(k+1))
let RB = null;
function rotBlur(g, cv, paint, S, ang, res, x0, y0) {
  if (!RB) RB = document.createElement("canvas");
  if (RB.width !== cv.width || RB.height !== cv.height) { RB.width = cv.width; RB.height = cv.height; }
  const q = RB.getContext("2d");
  q.setTransform(1, 0, 0, 1, 0, 0); q.clearRect(0, 0, RB.width, RB.height);
  q.setTransform(res, 0, 0, res, -x0 * res, -y0 * res);
  paint(q);
  const K = 12, cx = (S[0] - x0) * res, cy = (S[1] - y0) * res;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  for (let k = 0; k < K; k++) {
    const a = ang * (k / (K - 1) - 0.5);
    g.globalAlpha = 1 / (k + 1);
    g.setTransform(Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), cx - Math.cos(a) * cx + Math.sin(a) * cy, cy - Math.sin(a) * cx - Math.cos(a) * cy);
    g.drawImage(RB, 0, 0);
  }
  g.restore();
}
// the band wrapped round the back of a head that is down on the floor (the landing, 57.96–58.24): it runs in front of
// the head but its far end goes behind the body's round back. Painted on a scratch layer, the part inside the body
// mass (band.cut, an ellipse) is erased, and the body's contour is inked across the band where it disappears.
function bandCut(g, cv, b, res, x0, y0) {
  if (!RB) RB = document.createElement("canvas");
  if (RB.width !== cv.width || RB.height !== cv.height) { RB.width = cv.width; RB.height = cv.height; }
  const q = RB.getContext("2d"), c = b.cut;
  q.setTransform(1, 0, 0, 1, 0, 0); q.globalCompositeOperation = "source-over"; q.clearRect(0, 0, RB.width, RB.height);
  q.setTransform(res, 0, 0, res, -x0 * res, -y0 * res);
  drawBandB(q, b);
  q.globalCompositeOperation = "destination-out"; q.fillStyle = "#000";
  q.beginPath(); q.ellipse(c.x, c.y, c.rx, c.ry, c.rot || 0, 0, TAU); q.fill();
  q.globalCompositeOperation = "source-over";
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(RB, 0, 0); g.restore();
  // the body's edge across the band: the cut ellipse's arc where the band passes
  const bq = sampleCurve(b.pts, 10), near = (p) => bq.some((s) => Math.hypot(s[0] - p[0], s[1] - p[1]) < b.w * 0.62);
  const ca = Math.cos(c.rot || 0), sa = Math.sin(c.rot || 0), arc = [];
  for (let i = 0; i <= 180; i++) { const a = (i / 180) * TAU, ex = Math.cos(a) * c.rx, ey = Math.sin(a) * c.ry, p = [c.x + ex * ca - ey * sa, c.y + ex * sa + ey * ca]; if (near(p)) arc.push(p); else if (arc.length > 1) break; else arc.length = 0; }
  if (arc.length > 1) ink(g, arc, 2.2, OUT, { end: 0.3 });
}
// a kit wing softened: painted on a scratch layer, laid down blurred (1.6 px) and then sharp at 0.5, so its feather
// keylines read as hatch-weight lines and the feathers as soft layers (the source's wings), not crisp clip-art fans
function softWing(g, cv, paint, res, x0, y0) {
  if (!RB) RB = document.createElement("canvas");
  if (RB.width !== cv.width || RB.height !== cv.height) { RB.width = cv.width; RB.height = cv.height; }
  const q = RB.getContext("2d");
  q.setTransform(1, 0, 0, 1, 0, 0); q.clearRect(0, 0, RB.width, RB.height);
  q.setTransform(res, 0, 0, res, -x0 * res, -y0 * res);
  paint(q);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
  g.filter = `blur(${(1.6 * res).toFixed(1)}px)`; g.drawImage(RB, 0, 0); g.filter = "none";
  g.globalAlpha = 0.5; g.drawImage(RB, 0, 0);
  g.restore();
}
// soft pointed feather tips along the lower edge of the body (angles 25°–155°, 0° = right, y down)
// skirt > 0: the long pointed feathers hanging off the lower left of the body during the lift (the source's)
function bottomTips(g, B, bb, light, skirt = 0) {
  const r = rng(29), n = B.length;
  g.save();
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    if (t < 0.45 || t > 2.7 || i % 3) continue;
    const p = B[i], q = B[(i + 3) % n], m = V.mix(p, q, 0.5);
    const sk = skirt * clamp((t - 1.2) / 0.5) * clamp((3.0 - t) / 0.5);
    const out = nrm(sub(m, [bb.x, bb.y])), tip = add(m, add(mul(out, (9 + 7 * r()) * (1 + 2.2 * sk)), [-14 * sk, 3 + 16 * sk]));
    const pts = [add(p, mul(out, -12)), p, add(V.mix(p, tip, 0.55), mul(out, 2)), tip, add(V.mix(q, tip, 0.55), mul(out, 2)), q, add(q, mul(out, -12))];
    g.fillStyle = gv(0.8); g.beginPath(); smoothPath(g, pts, true); g.fill();
    ink(g, [add(q, mul(out, -10)), add(V.mix(q, tip, 0.3), mul(out, -2))], 1.1, gv(0.3, 0.6), { end: 0.2 });
  }
  g.restore();
}
function inPolyB(p, poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c; }
  return c;
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
