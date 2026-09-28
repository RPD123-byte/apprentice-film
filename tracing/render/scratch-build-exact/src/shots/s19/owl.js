// s19 owl: for most of the shot the owl is seen from BEHIND (it sits and stands facing the card), which the kit's
// rig does not draw, so this module paints a back view from the kit's parts (plumage, hatching, cups, band,
// bandage, feet, wing painter). Poses are plain numbers so two poses can be interpolated.
import {
  plumage, softShade, rimHatch, edgeFlicks, featherRow, flick, ink, screentone, setPPU, gv, LINE, V, fringe,
  headGeom, tuftShape, bodyOutline, tailShape, foldedWing, spreadWing, featherShape, drawCup, drawBand, drawBandage, drawFoot,
} from "../../lib/owlInk.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { taper } from "../../lib/ink.js";
import { rng, clamp } from "../../lib/rng.js";

const TAU = Math.PI * 2;
const { add, sub, mul, nrm, perp } = V;
const blobPath = (pts) => (c) => smoothPath(c, pts, true);

// ---------------------------------------------------------------- pose interpolation
// Numbers interpolate, arrays of equal length interpolate element-wise, objects key-wise; anything else snaps at 0.5.
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

// ---------------------------------------------------------------- the back-view painter
// pose (owl units, root = middle of the body, y down) + placement { x, y, s, rot }.
let SCR = null;
export function backOwlLayer(P, canvas = null) {
  const s = P.s, rot = P.rot || 0, res = P.res || 1;
  const ca = Math.cos(rot), sa = Math.sin(rot);
  const toF = ([ux, uy]) => [P.x + s * (ca * ux - sa * uy), P.y + s * (sa * ux + ca * uy)];
  const L0 = P.light || [0.35, -0.9];
  const Lu = nrm([ca * L0[0] + sa * L0[1], -sa * L0[0] + ca * L0[1]]);
  const plu = { light: Lu };
  const H = headGeom({ ...P.head, yaw: 0, pitch: 0 });
  const body = bodyOutline(P.body);
  const tufts = (P.tufts || []).map((t) => tuftShape(H, t));
  const wings = (P.wings || []).map((w) => ({ ...w, g: w.type === "folded" ? foldedWing(w) : spreadWing(w) }));
  const tail = P.tail ? tailShape(P.tail) : [];
  // bounds
  const all = [...H.out, ...body, ...tufts.flatMap((t) => t.pts)];
  tail.forEach((f) => all.push(...f));
  wings.forEach((w) => { if (w.type === "folded") all.push(...w.g.outline); else { all.push(w.S, w.Wr, w.T); w.g.feathers.forEach((f) => all.push(add(f.root, mul(f.dir, f.L)))); } });
  (P.cups || []).forEach((c) => all.push([c.x - c.r * 1.2, c.y - c.r * 1.3], [c.x + c.r * 1.2, c.y + c.r * 1.2]));
  if (P.band) all.push(...P.band.pts);
  (P.feet || []).forEach((f) => all.push([f.x - f.size * 1.8, f.y - f.size * 2.2], [f.x + f.size * 1.8, f.y + f.size * 1.2]));
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of all) { const f = toF(p); x0 = Math.min(x0, f[0]); y0 = Math.min(y0, f[1]); x1 = Math.max(x1, f[0]); y1 = Math.max(y1, f[1]); }
  const m = 16 * s + 6;
  x0 = Math.floor(x0 - m); y0 = Math.floor(y0 - m); x1 = Math.ceil(x1 + m); y1 = Math.ceil(y1 + m);
  const cw = Math.max(1, Math.round((x1 - x0) * res)), ch = Math.max(1, Math.round((y1 - y0) * res));
  const cv = canvas || document.createElement("canvas");
  if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
  const g = cv.getContext("2d", { willReadFrequently: true });
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch);
  g.setTransform(res * s * ca, res * s * sa, -res * s * sa, res * s * ca, res * (P.x - x0), res * (P.y - y0));
  setPPU(s * res);
  const hatchCol = gv(0.3, 0.5);
  const cupAt = (c) => drawCup(g, { x: c.x, y: c.y, r: c.r, rot: c.rot || 0, open: c.open ?? 0.7, side: c.side ?? 1 });
  const bandAt = () => {
    if (!P.band.dark) return drawBand(g, P.band.pts, { w: P.band.w || 16, ends: P.band.ends || [true, true], ribs: true });
    // knocked down round the neck: seen as a thick dark strap with a pale edge and the sliders
    const q = sampleCurve(P.band.pts, 8);
    taper(g, q, () => P.band.w * 1.15, "#0b0b0b");
    taper(g, q.map(([x, y]) => [x, y - P.band.w * 0.32]), () => P.band.w * 0.16, gv(0.75, 0.9));
    for (const f of [0.2, 0.8]) { const i = Math.floor(q.length * f), p = q[i]; g.fillStyle = gv(0.6); g.strokeStyle = LINE; g.lineWidth = 1.5; g.beginPath(); g.roundRect(p[0] - 9, p[1] - P.band.w * 0.6, 18, P.band.w * 1.2, 3); g.fill(); g.stroke(); }
  };

  // 1. things behind the head
  for (const c of P.cups || []) if (!c.front) cupAt(c);
  if (P.band && !P.band.front) bandAt();
  // 2. wings behind the body
  for (const w of wings) if (w.layer === "back") paintWing(g, w, plu, 1);
  // 3. tail
  tail.forEach((f, i) => {
    plumage(g, blobPath(f), { base: 0.93, shade: 0.7, depth: 8, blur: 5, ...plu });
    ink(g, [f[3], f[4], f[5]], 1.8, LINE, { end: 0.2, bias: 0.3 });
    ink(g, [f[0], f[1], f[2], f[3]], 1.4, gv(0.25, 0.8), { end: 0.3, bias: 0.7 });
    ink(g, [V.mix(f[0], f[6], 0.45), V.mix(f[1], f[5], 0.45), V.mix(f[2], f[4], 0.4)], 0.8, gv(0.35, 0.5));
  });
  // 4. feet (squashed: seen from behind and low, the toes point away)
  for (const f of P.feet || []) {
    g.save(); g.translate(f.x, f.y); g.scale(1, f.sy ?? 0.55);
    drawFoot(g, { x: 0, y: 0, rot: f.rot ?? Math.PI, size: f.size, mode: f.mode || "stand", toes: f.toes || 3, spread: f.spread ?? 0.5, leg: f.leg ?? 0, seed: f.seed || 3 });
    g.restore();
  }
  // 5. body: soft white, shadow-side hatching, scalloped feather rows down the back
  const bp = blobPath(body), b = P.body;
  plumage(g, bp, { base: 0.97, shade: 0.78, depth: b.a * 0.35, blur: b.a * 0.1, ...plu });
  softShade(g, bp, (c) => { const q = add([b.x, b.y], V.rot([b.a * 0.55, 0], b.rot)); c.ellipse(q[0], q[1], b.b * 0.9, b.a * 0.4, 0, 0, TAU); }, 0.7, 0.35, b.a * 0.2);
  rimHatch(g, body, { light: Lu, flow: [0, 1], len: b.a * 0.14, step: 2.6, w: 1.0, color: hatchCol, seed: 12, density: 1, bend: 0.5 });
  edgeFlicks(g, body, { step: 8, len: b.a * 0.08, w: 0.9, color: gv(0.4, 0.45), ang: 0.9, seed: 19 });
  // fine feather strokes over the back, combing down and fanning out, denser and darker toward the edges
  g.save(); g.beginPath(); bp(g); g.clip();
  const rr = rng(15);
  const bw = b.b, bh = b.a;
  for (let i = 0; i < 620; i++) {
    const a = rr() * TAU, d = Math.pow(rr(), 0.45);
    const p = [b.x + Math.cos(a) * bw * d, b.y + Math.sin(a) * bh * d];
    const fan = (p[0] - b.x) / bw;
    const dir = V.rot([0, 1], -fan * 0.9 + (rr() - 0.5) * 0.35);
    flick(g, p, dir, 8 + rr() * 12, 0.75 + 0.4 * rr(), gv(0.32, 0.12 + 0.45 * d * d), 0.12 * Math.sign(fan || 1));
  }
  g.restore();
  fringe(g, body, { step: 9, len: 7, w: 5, color: gv(0.93), ang: 0.5, seed: 17, from: 0.05, to: 0.45 });
  // 6. folded wings on the back
  for (const w of wings) if (w.layer !== "back") paintWing(g, w, plu, 1);
  // 7. head: plumage, hatching, feathers combing down from the crown, tufts
  const hp = blobPath(H.out);
  tufts.forEach((t) => plumage(g, blobPath(t.pts), { base: 0.95, shade: 0.76, depth: 10, blur: 4, ...plu }));
  plumage(g, hp, { base: 0.97, shade: 0.8, depth: H.ry * 0.35, blur: H.ry * 0.1, ...plu });
  rimHatch(g, H.out, { light: Lu, flow: [0, 1], len: H.ry * 0.2, step: 2.4, w: 1.0, color: hatchCol, seed: 22, density: 0.9, thr: 0.1 });
  edgeFlicks(g, H.out, { step: 14, len: 8, w: 0.9, color: gv(0.45, 0.4), ang: 1.0, seed: 23 });
  g.save(); g.beginPath(); hp(g); g.clip();
  const crown = P.crown || [H.x, H.y - H.ry * 0.5];
  const rh = rng(27);
  for (let i = 0; i < 360; i++) {
    const a = rh() * TAU, d = Math.pow(rh(), 0.45);
    const p = [H.x + Math.cos(a) * H.rx * d, H.y + Math.sin(a) * H.ry * d];
    const dir = nrm(sub(p, crown));
    flick(g, p, V.rot(dir, (rh() - 0.5) * 0.3), 6 + rh() * 11, 0.75 + 0.3 * rh(), gv(0.34, 0.12 + 0.4 * d * d), 0.08);
  }
  g.restore();
  tufts.forEach((t) => {
    for (let k = 0; k < 4; k++) { const b0 = V.mix(t.inner, t.outer, 0.25 + k * 0.17); flick(g, b0, nrm(sub(V.mix(t.tip, t.tip2, k / 4), b0)), V.len(sub(t.tip, b0)) * (0.55 + 0.1 * k), 1.0, gv(0.35, 0.5), 0.05 * t.side); }
    ink(g, [t.pts[1], t.pts[2], t.pts[3]], 1.2, gv(0.25, 0.7), { end: 0.1 });
  });
  ink(g, sampleCurve(H.out, 3, true).slice(0, 999), 1.4, gv(0.2, 0.55), { end: 0.6, per: 1 });
  // 8. bandage
  if (P.bandage) drawBandage(g, P.bandage);
  if (P.crest) drawCrest(g, P.crest, plu);
  // 9. band and cups in front
  if (P.band && P.band.front) bandAt();
  for (const c of P.cups || []) if (c.front) cupAt(c);
  setPPU(1);
  if (P.tone !== false) { g.setTransform(1, 0, 0, 1, 0, 0); screentone(cv, { pitch: 4.2 * res }); }
  g.setTransform(1, 0, 0, 1, 0, 0);
  outlineLayer(cv, (P.outline ?? 2.6) * res);
  return { canvas: cv, x: x0, y: y0, w: x1 - x0, h: y1 - y0, toF };
}
// A dark contour round the whole silhouette: the layer's alpha, dilated by w px, filled with ink, drawn behind.
let OUT = null;
export function outlineLayer(cv, w) {
  if (w <= 0) return;
  if (!OUT) OUT = document.createElement("canvas");
  if (OUT.width !== cv.width || OUT.height !== cv.height) { OUT.width = cv.width; OUT.height = cv.height; }
  const o = OUT.getContext("2d");
  o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = "source-over"; o.clearRect(0, 0, OUT.width, OUT.height);
  const n = 12;
  for (let i = 0; i < n; i++) { const a = (i / n) * TAU; o.drawImage(cv, Math.cos(a) * w, Math.sin(a) * w); }
  o.globalCompositeOperation = "source-in"; o.fillStyle = "#0d0c0b"; o.fillRect(0, 0, OUT.width, OUT.height);
  const g = cv.getContext("2d");
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "destination-over"; g.drawImage(OUT, 0, 0); g.restore();
}
export function drawBackOwl(ctx, P) {
  if (!SCR) SCR = document.createElement("canvas");
  const L = backOwlLayer(P, SCR);
  ctx.drawImage(L.canvas, L.x, L.y, L.w, L.h);
  return L;
}

// The crest: a swoosh of three feather points sweeping off the head (x, y = root, dir = angle, len, w).
function drawCrest(g, c, plu) {
  const d = [Math.cos(c.dir), Math.sin(c.dir)], n = [-d[1], d[0]], L = c.len, w = c.w;
  const P = (u, v) => [c.x + d[0] * u + n[0] * v, c.y + d[1] * u + n[1] * v];
  const pts = [P(-L * 0.1, w * 0.6), P(L * 0.45, w * 0.55), P(L, w * 0.35), P(L * 0.62, w * 0.08), P(L * 0.86, -w * 0.18), P(L * 0.5, -w * 0.3), P(L * 0.62, -w * 0.62), P(L * 0.2, -w * 0.55), P(-L * 0.15, -w * 0.5)];
  plumage(g, blobPath(pts), { base: 0.97, shade: 0.82, depth: w * 0.3, blur: w * 0.2, ...plu });
  ink(g, [pts[0], pts[1], pts[2]], 1.6, LINE, { end: 0.1, bias: 0.8 });
  ink(g, [pts[2], pts[3], pts[4]], 1.3, LINE, { end: 0.1 });
  ink(g, [pts[4], pts[5], pts[6]], 1.3, LINE, { end: 0.1 });
  ink(g, [pts[6], pts[7], pts[8]], 1.4, LINE, { end: 0.1, bias: 0.2 });
  for (let k = 0; k < 4; k++) ink(g, [P(L * 0.05, w * (0.3 - k * 0.2)), P(L * (0.5 + 0.08 * k), w * (0.25 - k * 0.2))], 0.8, gv(0.35, 0.6), { end: 0.1 });
}

// ---------------------------------------------------------------- wing painter (copied from the kit, trimmed)
function paintWing(g, w, plu, dl) {
  if (w.type === "folded") {
    const W = w.g, path = blobPath(W.outline);
    plumage(g, path, { base: 0.96, shade: 0.78, depth: W.width * 0.5, blur: W.width * 0.15, ...plu });
    softShade(g, path, (c) => { const q = W.P(0.62, W.width * 0.72); c.ellipse(q[0], q[1], W.L * 0.36, W.width * 0.3, Math.atan2(W.u[1], W.u[0]), 0, TAU); }, 0.66, 0.4, W.width * 0.22);
    rimHatch(g, W.outline, { light: plu.light, flow: W.u, len: W.width * 0.25, step: 3.5, w: 0.9, color: gv(0.3, 0.42), seed: 32, bend: 0.75, thr: 0.2 });
    const rb = rng(34);
    g.save(); g.beginPath(); path(g); g.clip();
    for (let i = 0; i < 60; i++) {
      const t = 0.1 + rb() * 0.8, k = W.width * (0.1 + 0.8 * rb()) * W.low(t) - W.back * 0.2 * rb();
      flick(g, W.P(t, k), V.rot(W.u, 0.08 + (rb() - 0.5) * 0.1), W.L * (0.06 + 0.08 * rb()), 0.9, gv(0.35, 0.35), 0.05);
    }
    g.restore();
    const r = rng(33), N = 6;
    for (let i = 0; i < N; i++) {
      const f = i / (N - 1);
      const t0 = 0.1 + 0.28 * f + r() * 0.04, t1 = Math.min(0.97, t0 + 0.34 + 0.28 * f);
      const k0 = -W.back * (0.55 - 0.5 * f) + W.width * 0.45 * f, k1 = k0 * 0.6 + W.width * (0.25 + 0.35 * f) * W.low(t1);
      const a = W.P(t0, k0), m = W.P((t0 + t1) / 2, (k0 + k1) / 2 + W.width * 0.08), b = W.P(t1, k1);
      ink(g, [a, m, b], f > 0.7 ? 1.8 : 1.3, f > 0.7 ? gv(0.12, 0.85) : gv(0.25, 0.65), { end: 0.06, bias: 0.7 });
    }
    const lowPts = []; for (let i = 0; i <= 12; i++) { const t = 0.16 + i * 0.07; lowPts.push(W.P(t, W.width * W.low(t) - 1.5)); }
    ink(g, lowPts, 2.8, LINE, { end: 0.1, bias: 0.6 });
    return;
  }
  // spread wing: feathers back to front, then the covert band along the leading edge
  const W = w.g;
  const fs = W.feathers.map((f) => featherShape(f.root, f.dir, f.L, f.w));
  for (let i = fs.length - 1; i >= 0; i--) {
    const f = W.feathers[i], fp = blobPath(fs[i]);
    plumage(g, fp, { base: 0.95, shade: 0.74, depth: f.w * 0.35, blur: f.w * 0.15, ...plu });
    ink(g, fs[i].slice(1, 6), 1.2, LINE, { end: 0.25 });
    ink(g, [add(f.root, mul(f.dir, f.L * 0.15)), add(f.root, mul(f.dir, f.L * 0.8))], 0.7, gv(0.35, 0.5), { end: 0.1 });
  }
  const lead = W.lead, cw = (w.len ?? 70) * 0.55, band = [...lead];
  for (let i = lead.length - 1; i >= 0; i--) band.push(add(lead[i], mul(W.tr, cw * (1 - 0.55 * i / lead.length))));
  plumage(g, blobPath(band), { base: 0.96, shade: 0.76, depth: cw * 0.4, blur: cw * 0.15, ...plu });
  for (let i = 0; i < lead.length - 3; i += 3) {
    const p = add(lead[i], mul(W.tr, cw * (1 - 0.55 * i / lead.length))), q = add(lead[i + 3], mul(W.tr, cw * (1 - 0.55 * (i + 3) / lead.length)));
    ink(g, [p, add(V.mix(p, q, 0.5), mul(W.tr, cw * 0.18)), q], 1.0, gv(0.3, 0.65), { end: 0.2 });
  }
  ink(g, lead, 2.0, LINE, { end: 0.3 });
}

// ---------------------------------------------------------------- poses (units; placed at s px per unit)
// All back-view poses share one structure (same array lengths) so they interpolate with lerpPose.
// STAND: standing with its back to us, head tipped up at the card (measured at 60.40, s = 1.3, root (1151, 686)):
// head 1026–1266 x 362–586, body 986–1316 x 556–816, cups (1016,501) (1276,496), bandage (1191,471), feet y ≈ 826.
const band5 = (a, b, c, d, e) => ({ pts: [a, b, c, d, e], w: 10, front: true });
export const STAND = {
  light: [0.35, -0.9],
  head: { x: -4, y: -160, rx: 92, ry: 86, roll: 0.0, square: 2.3, jowl: 0.06 },
  crown: [0, -215],
  tufts: [],
  crest: { x: -62, y: -222, dir: Math.PI + 0.25, len: 58, w: 22 },
  body: { x: 0, y: -26, a: 112, b: 120, rot: Math.PI / 2, egg: -0.15, sag: 0 },
  tail: { base: [-45, 52], tip: [-122, 74], w: 30, n: 3 },
  wings: [
    { type: "folded", layer: "front", S: [72, -52], T: [122, 74], width: 34, back: 16, dir: 1 },
    { type: "folded", layer: "front", S: [-82, -52], T: [-118, 62], width: 20, back: 8, dir: -1 },
  ],
  feet: [{ x: -35, y: 104, size: 20, sy: 0.5, seed: 2 }, { x: 46, y: 106, size: 21, sy: 0.5, seed: 5 }],
  band: band5([-98, -182], [-78, -245], [-19, -264], [48, -250], [88, -190]),
  cups: [
    { x: -100, y: -142, r: 40, rot: 0.02, open: 0.45, side: -1, front: true },
    { x: 96, y: -146, r: 42, rot: -0.03, open: 0.72, side: 1, front: true },
  ],
  bandage: { x: 31, y: -165, size: 54, rot: -0.6, sx: 0.95, sy: 0.92 },
};
// SIT (58.44–59.56, measured at 59.00 with s = 1.3, root (965, 770)): sitting hunched with its back to us, head
// tipped up at the card, the headphones knocked down round the back of its neck (a thick dark strap), the left
// cup hidden behind the head, one foot sticking out on the right.
export const SIT = {
  ...STAND,
  head: { x: -5, y: -118, rx: 90, ry: 84, roll: -0.04, square: 2.3, jowl: 0.06 },
  crown: [-5, -170],
  crest: { x: -45, y: -178, dir: Math.PI + 0.45, len: 52, w: 22 },
  body: { x: 12, y: -20, a: 100, b: 104, rot: Math.PI / 2, egg: -0.2, sag: 0 },
  tail: { base: [-50, 78], tip: [-112, 100], w: 30, n: 3 },
  wings: [
    { type: "folded", layer: "front", S: [86, -80], T: [104, 66], width: 26, back: 10, dir: 1 },
    { type: "folded", layer: "front", S: [-100, -50], T: [-110, 40], width: 14, back: 6, dir: -1 },
  ],
  feet: [{ x: -30, y: 100, size: 18, sy: 0.4, seed: 2 }, { x: 142, y: 23, size: 20, sy: 0.9, rot: -2.3, seed: 5 }],
  band: { pts: [[-98, -78], [-60, -50], [-10, -42], [44, -58], [80, -95]], w: 17, front: true, dark: true },
  cups: [
    { x: -90, y: -119, r: 38, rot: 0.05, open: 0.4, side: -1, front: false },
    { x: 73, y: -126, r: 42, rot: -0.1, open: 0.75, side: 1, front: true },
  ],
  bandage: { x: 27, y: -152, size: 50, rot: -0.6, sx: 0.95, sy: 0.9 },
};
// LIE (57.96–58.32): landed on its belly and skidding left, back to us: body long and horizontal, head at the right
// end with the headphones knocked round its neck, wings and tail sticking up to the left.
export const LIE = {
  ...STAND,
  head: { x: 128, y: 6, rx: 84, ry: 80, roll: 0.25, square: 2.3, jowl: 0.06 },
  crown: [150, -40],
  crest: { x: 84, y: -58, dir: Math.PI + 0.75, len: 50, w: 22 },
  body: { x: -4, y: 14, a: 108, b: 94, rot: Math.PI, egg: 0.1, sag: 0 },
  tail: { base: [-96, -10], tip: [-170, -70], w: 30, n: 3 },
  wings: [
    { type: "folded", layer: "front", S: [58, -44], T: [-140, -90], width: 30, back: 12, dir: -1 },
    { type: "folded", layer: "front", S: [40, -16], T: [-116, 20], width: 20, back: 8, dir: -1 },
  ],
  feet: [{ x: 30, y: 98, size: 18, sy: 0.5, seed: 2 }, { x: -40, y: 96, size: 18, sy: 0.5, seed: 5 }],
  band: { pts: [[66, -44], [56, 8], [66, 56], [92, 84], [128, 90]], w: 17, front: true, dark: true },
  cups: [
    { x: 60, y: -26, r: 38, rot: 1.1, open: 0.4, side: -1, front: false },
    { x: 176, y: 44, r: 42, rot: 1.2, open: 0.62, side: 1, front: true },
  ],
  bandage: { x: 146, y: -26, size: 46, rot: 0.3, sx: 0.95, sy: 0.9 },
};
// LEAN (59.72–60.04): crouched, getting up: head bowed to the right (face down), the band back over the crown to
// the near cup at the lower right of the head, the right wing swept down to the floor (dusting off), the left out low.
export const LEAN = {
  ...STAND,
  head: { x: 50, y: -84, rx: 88, ry: 82, roll: 0.7, square: 2.3, jowl: 0.06 },
  crown: [80, -125],
  crest: { x: -12, y: -150, dir: Math.PI + 1.0, len: 50, w: 22 },
  body: { x: -14, y: -4, a: 96, b: 122, rot: Math.PI / 2 - 0.25, egg: -0.18, sag: 0 },
  wings: [
    { type: "folded", layer: "front", S: [60, -40], T: [230, 96], width: 34, back: 16, dir: 1 },
    { type: "folded", layer: "front", S: [-90, -30], T: [-170, 80], width: 22, back: 10, dir: -1 },
  ],
  feet: [{ x: -40, y: 100, size: 20, sy: 0.5, seed: 2 }, { x: 50, y: 104, size: 21, sy: 0.5, seed: 5 }],
  band: { pts: [[-40, -130], [4, -172], [66, -170], [112, -122], [124, -60]], w: 10, front: true },
  cups: [
    { x: -50, y: -100, r: 38, rot: 0.6, open: 0.4, side: -1, front: false },
    { x: 120, y: -40, r: 42, rot: 0.7, open: 0.72, side: 1, front: true },
  ],
  bandage: { x: 66, y: -104, size: 50, rot: 0.1, sx: 0.95, sy: 0.9 },
};
// SPREAD (61.16–62.20): standing with both wings spread and raised (measured at 61.36, s = 1.3, root (1277, 690)).
const spreadW = (sd, lift) => ({ type: "spread", layer: "back", S: [sd * 78, -64], Wr: [sd * 140, -100 - lift], T: [sd * 215, -104 - lift * 1.3], trail: [-sd * 0.35, 1], len: 84, spread: 0.85, n: 6, m: 4 });
export const SPREAD = { ...STAND, wings: [spreadW(-1, 26), spreadW(1, 26)] };
// SPREAD_UP (61.52–62.20, measured at 61.84, s = 1.3, root (1210, 684)): stretched up under the card: head top
// y ≈ 290, cups at x 1100 / 1320, body bottom ≈ 820; the left wing held out low, the right one raised high.
export const SPREAD_UP = {
  ...STAND,
  head: { x: 0, y: -214, rx: 80, ry: 80, roll: 0.06, square: 2.3, jowl: 0.06 },
  crown: [0, -262],
  crest: { x: -52, y: -268, dir: Math.PI + 0.3, len: 52, w: 20 },
  body: { x: 4, y: -38, a: 136, b: 104, rot: Math.PI / 2, egg: -0.18, sag: 0 },
  wings: [
    { type: "spread", layer: "back", S: [-70, -100], Wr: [-150, -110], T: [-240, -130], trail: [0.3, 1], len: 84, spread: 0.85, n: 6, m: 4 },
    { type: "spread", layer: "back", S: [70, -100], Wr: [150, -170], T: [220, -250], trail: [-0.45, 1], len: 84, spread: 0.85, n: 6, m: 4 },
  ],
  band: { pts: [[-86, -230], [-66, -290], [-6, -310], [56, -294], [80, -236]], w: 10, front: true },
  cups: [
    { x: -86, y: -196, r: 36, rot: 0.02, open: 0.45, side: -1, front: true },
    { x: 84, y: -198, r: 40, rot: -0.03, open: 0.72, side: 1, front: true },
  ],
  bandage: { x: 26, y: -223, size: 48, rot: -0.6, sx: 0.95, sy: 0.92 },
};
