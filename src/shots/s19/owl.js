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
import { wingFan, paintWing as paintFan } from "./feathers.js";

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
  const wings = (P.wings || []).map((w) => ({ ...w, g: w.type === "folded" ? foldedWing(w) : w.type === "fan" ? wingFan(w) : spreadWing(w) }));
  const tail = P.tail ? tailShape(P.tail) : [];
  // bounds
  const all = [...H.out, ...body, ...tufts.flatMap((t) => t.pts)];
  tail.forEach((f) => all.push(...f));
  wings.forEach((w) => { if (w.type === "folded") all.push(...w.g.outline); else if (w.type === "fan") { all.push(w.S, w.Wr, w.T); [...w.g.prim, ...w.g.sec].forEach((f) => all.push(add(f.root, mul(f.dir, f.L)))); } else { all.push(w.S, w.Wr, w.T); w.g.feathers.forEach((f) => all.push(add(f.root, mul(f.dir, f.L)))); } });
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
  const cupAt = (c) => backCup(g, c);
  const bandAt = () => {
    if (!P.band.dark) return drawBand(g, P.band.pts, { w: P.band.w || 16, ends: P.band.ends || [true, true], ribs: true, halftone: 0, slider: 0.1 });
    // knocked down round the neck: seen as a thick dark strap with a pale edge and the sliders
    const q = sampleCurve(P.band.pts, 8);
    taper(g, q, () => P.band.w * 1.15, "#0b0b0b");
    taper(g, q.map(([x, y]) => [x, y - P.band.w * 0.32]), () => P.band.w * 0.16, gv(0.75, 0.9));
    // the slider arm from the strap's right end up into the near cup (no clips)
    if (P.band.arm) { const a = P.band.arm; ink(g, a, P.band.w * 0.72, LINE, { end: 0.9, pow: 0.3 }); ink(g, a, P.band.w * 0.44, gv(0.72), { end: 0.9, pow: 0.3 }); ink(g, a.map(([x, y]) => [x - 2, y]), P.band.w * 0.1, gv(0.95, 0.8), { end: 0.5 }); }
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
    drawFoot(g, { x: 0, y: 0, rot: f.rot ?? Math.PI, size: f.size, mode: f.mode || "stand", toes: f.toes || 3, spread: f.spread ?? 0.5, leg: (f.leg ?? 0) / (f.sy ?? 0.55), seed: f.seed || 3 });
    g.restore();
  }
  // 5. body: soft white, shadow-side hatching, scalloped feather rows down the back
  const bp = blobPath(body), b = P.body;
  plumage(g, bp, { base: 0.97, shade: 0.78, depth: b.a * 0.35, blur: b.a * 0.1, ...plu });
  softShade(g, bp, (c) => { const q = add([b.x, b.y], V.rot([b.a * 0.55, 0], b.rot)); c.ellipse(q[0], q[1], b.b * 0.9, b.a * 0.4, 0, 0, TAU); }, 0.7, 0.35, b.a * 0.2);
  rimHatch(g, body, { light: Lu, flow: [0, 1], len: b.a * 0.09, step: 3.4, w: 0.9, color: gv(0.34, 0.42), seed: 12, density: 0.8, bend: 0.6, thr: 0.25 });
  edgeFlicks(g, body, { step: 8, len: b.a * 0.08, w: 0.9, color: gv(0.4, 0.45), ang: 0.9, seed: 19 });
  // fine feather strokes over the back, combing down and fanning out, denser and darker toward the edges
  g.save(); g.beginPath(); bp(g); g.clip();
  const rr = rng(15);
  const bw = b.b, bh = b.a;
  const dn = V.rot([0, 1], (b.rot || Math.PI / 2) - Math.PI / 2);
  for (let i = 0; i < 420; i++) {
    const a = rr() * TAU, d = Math.pow(rr(), 0.45);
    const p = [b.x + Math.cos(a) * bw * d, b.y + Math.sin(a) * bh * d];
    const fan = (p[0] - b.x) / bw;
    const dir = V.rot(dn, -fan * 0.8 + (rr() - 0.5) * 0.3);
    flick(g, p, dir, 12 + rr() * 22, 0.8 + 0.5 * rr(), gv(0.3, 0.1 + 0.45 * d * d), 0.16 * Math.sign(fan || 1));
  }
  // rows of feather tips (short curved hooks) down the back, like the source's scratched plumage
  for (let row = 0; row < 5; row++) for (let k = 0; k < 7; k++) {
    const u = (k + 0.5 + (row % 2) * 0.5) / 7.5 - 0.5, v = -0.55 + row * 0.3;
    const p = [b.x + u * bw * 1.7 * Math.sqrt(1 - v * v * 0.6), b.y + v * bh + (rr() - 0.5) * 6];
    ink(g, [[p[0] - 8, p[1] - 4], [p[0], p[1] + 3], [p[0] + 8, p[1] - 3]], 0.9, gv(0.36, 0.22 + 0.2 * Math.abs(u)), { end: 0.1 });
  }
  g.restore();
  softShade(g, bp, (c) => c.ellipse(b.x - bw * 0.85, b.y + bh * 0.1, bw * 0.45, bh * 0.9, 0, 0, TAU), 0.72, 0.35, bw * 0.25);
  fringe(g, body, { step: 16, len: 5, w: 5, color: gv(0.93), ang: 0.5, seed: 17, from: 0.1, to: 0.35 });
  // 6. folded wings on the back
  for (const w of wings) if (w.layer !== "back") paintWing(g, w, plu, 1);
  // 7. head: plumage, hatching, feathers combing down from the crown, tufts
  const hp = blobPath(H.out);
  tufts.forEach((t) => plumage(g, blobPath(t.pts), { base: 0.95, shade: 0.76, depth: 10, blur: 4, ...plu }));
  plumage(g, hp, { base: 0.97, shade: 0.8, depth: H.ry * 0.35, blur: H.ry * 0.1, ...plu });
  softShade(g, hp, (c) => c.ellipse(H.x, H.y + H.ry * 0.95, H.rx * 0.95, H.ry * 0.42, H.roll || 0, 0, TAU), 0.96, 0.9, H.ry * 0.14);
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
  { const N = H.out.length, up = [...H.out.slice(Math.round(N * 0.64)), ...H.out.slice(0, Math.round(N * 0.36) + 1)]; ink(g, up, 1.5, gv(0.2, 0.6), { end: 0.1, per: 3 }); }
  // 8. bandage
  if (P.bandage && P.bandage.size > 5) bandageCross(g, P.bandage);
  // 9. band and cups in front, the crest sweeping over the band
  if (P.band && P.band.front) bandAt();
  for (const c of P.cups || []) if (c.front) cupAt(c);
  if (P.crest) drawCrest(g, P.crest, plu);
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

// The crest: a sweep of pointed feathers off the crown (x, y = root, dir = angle, len, w = fan width, n feathers).
// Measured: at 59.0 it sweeps to the left over x 800–880 at y ≈ 550 (≈ 90 px long).
function drawCrest(g, c, plu) {
  const n = c.n || 5, d0 = c.dir, L = c.len, w = c.w;
  const fs = [];
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0.5 : i / (n - 1);
    const a = d0 + (f - 0.5) * (c.fan ?? 0.9);
    const dir = [Math.cos(a), Math.sin(a)], nn = [-dir[1], dir[0]];
    const root = [c.x + nn[0] * (f - 0.5) * w, c.y + nn[1] * (f - 0.5) * w];
    const len = L * (1 - 0.45 * Math.abs(f - 0.35) * 1.5);
    const bend = (c.curl ?? 0.12) * (f < 0.5 ? -1 : 1) * 0.5 + (c.curl ?? 0.12);
    const P = (u, v) => [root[0] + dir[0] * len * u + nn[0] * (v + bend * len * u * u), root[1] + dir[1] * len * u + nn[1] * (v + bend * len * u * u)];
    const ww = w * 0.55;
    fs.push([P(-0.1, -ww * 0.5), P(0.35, -ww * 0.5), P(0.75, -ww * 0.25), P(1, 0), P(0.7, ww * 0.25), P(0.3, ww * 0.5), P(-0.1, ww * 0.5)]);
  }
  // back feathers first
  for (let i = fs.length - 1; i >= 0; i--) {
    const pts = fs[i];
    plumage(g, blobPath(pts), { base: 0.96, shade: 0.78, depth: w * 0.15, blur: w * 0.12, ...plu });
    ink(g, pts.slice(1, 6), 1.5, LINE, { end: 0.12, bias: 0.6 });
    ink(g, [V.mix(pts[0], pts[6], 0.5), pts[3]], 0.7, gv(0.4, 0.5), { end: 0.1 });
  }
}
// The bandage on the back of the head: two broad pads crossed (≈ 70 px at s 1.3), outlined, a quilted centre.
function bandageCross(g, c) {
  const L = c.size, Wd = c.size * 0.36;
  g.save(); g.translate(c.x, c.y); g.rotate(c.rot || 0); g.scale(c.sx ?? 1, c.sy ?? 1);
  const pad = (rot, l, wd) => {
    g.save(); g.rotate(rot);
    g.fillStyle = gv(0.9); g.beginPath(); g.roundRect(-l / 2, -wd / 2, l, wd, wd * 0.45); g.fill();
    g.save(); g.clip(); g.fillStyle = gv(0.6, 0.35); g.fillRect(-l / 2, wd * 0.15, l, wd * 0.4); g.restore();
    g.strokeStyle = LINE; g.lineWidth = 1.5; g.beginPath(); g.roundRect(-l / 2, -wd / 2, l, wd, wd * 0.45); g.stroke();
    g.fillStyle = gv(0.25, 0.8);
    for (const e of [-1, 1]) for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(e * (l * 0.38 - k * 4), (k % 2 ? 0.2 : -0.2) * wd, 0.9, 0, TAU); g.fill(); }
    g.restore();
  };
  pad(0, L, Wd); pad(1.25, L * 0.86, Wd * 1.05);
  g.fillStyle = gv(0.8); g.beginPath(); g.roundRect(-Wd * 0.5, -Wd * 0.45, Wd, Wd * 0.9, Wd * 0.2); g.fill();
  g.strokeStyle = gv(0.3); g.lineWidth = 1.1; g.stroke();
  g.fillStyle = gv(0.3);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { g.beginPath(); g.arc((i - 1) * Wd * 0.26, (j - 1) * Wd * 0.24, 0.9, 0, TAU); g.fill(); }
  g.restore();
}
// A headphone cup seen from behind the owl: a dark ribbed cushion against the head and a pale metal cap facing out.
// c = { x, y, r, rot, side (+1 = viewer-right cup: cap faces right), open (0 = edge-on .. 1 = cap facing us) }
function backCup(g, c) {
  const { x, y, r, rot = 0, side = 1 } = c, open = c.open ?? 0.6;
  const rr = rng(side > 0 ? 41 : 43);
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(side, 1);
  const cush = (q) => q.ellipse(-0.08 * r, 0.02 * r, (0.34 + 0.24 * open) * r, 1.0 * r, 0, 0, TAU);
  g.fillStyle = "#0b0b0b"; g.beginPath(); cush(g); g.fill();
  g.save(); g.beginPath(); cush(g); g.clip();
  for (let i = -16; i <= 16; i++) {
    const t = i / 16, yy = t * r * 0.95, hw = Math.sqrt(Math.max(0, 1 - t * t)) * (0.3 + 0.2 * open) * r;
    g.strokeStyle = gv(0.5 + 0.3 * rr(), 0.7); g.lineWidth = 0.9 + 0.5 * rr();
    g.beginPath(); g.moveTo(-0.08 * r - hw * 0.95, yy); g.lineTo(-0.08 * r + hw * 0.3, yy + 1); g.stroke();
  }
  g.restore();
  // shell: dark metal ring, then the cap
  const sx = (0.18 + 0.2 * open) * r, srx = (0.1 + 0.5 * open) * r;
  g.fillStyle = gv(0.24); g.beginPath(); g.ellipse(sx, 0, srx, 0.94 * r, 0, 0, TAU); g.fill();
  g.strokeStyle = LINE; g.lineWidth = 1.8; g.stroke();
  const cx = sx + 0.05 * r, crx = srx * 0.74, cry = 0.78 * r;
  g.save(); g.beginPath(); g.ellipse(cx, -0.02 * r, crx, cry, 0, 0, TAU); g.clip();
  const gr = g.createLinearGradient(cx - crx, -cry, cx + crx, cry);
  gr.addColorStop(0, gv(0.95)); gr.addColorStop(0.45, gv(0.78)); gr.addColorStop(1, gv(0.45));
  g.fillStyle = gr; g.fillRect(cx - crx - 2, -cry - 2, crx * 2 + 4, cry * 2 + 4);
  for (let i = 0; i < 14; i++) { g.strokeStyle = gv(rr() < 0.5 ? 0.35 : 1, 0.35); g.lineWidth = 0.9; const a = -2.6 + rr() * 2.4; g.beginPath(); g.ellipse(cx, -0.02 * r, crx * (0.45 + 0.5 * rr()), cry * (0.45 + 0.5 * rr()), 0, a, a + 0.7); g.stroke(); }
  g.restore();
  g.strokeStyle = LINE; g.lineWidth = 1.6; g.beginPath(); g.ellipse(cx, -0.02 * r, crx, cry, 0, 0, TAU); g.stroke();
  // yoke hinge on top
  g.fillStyle = gv(0.7); g.strokeStyle = LINE; g.lineWidth = 1.4;
  g.beginPath(); g.roundRect(sx - r * 0.18, -r * 1.1, r * 0.36, r * 0.18, r * 0.05); g.fill(); g.stroke();
  g.restore();
}

// ---------------------------------------------------------------- wing painter (copied from the kit, trimmed)
function paintWing(g, w, plu, dl) {
  if (w.type === "fan") { paintFan(g, w.g, { light: plu.light, line: 1.7, col: LINE, shade: 0.74, seed: w.seed || 7 }); return; }
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
      ink(g, [a, m, b], f > 0.7 ? 1.3 : 1.0, f > 0.7 ? gv(0.18, 0.75) : gv(0.3, 0.55), { end: 0.06, bias: 0.7 });
    }
    const lowPts = []; for (let i = 0; i <= 12; i++) { const t = 0.16 + i * 0.07; lowPts.push(W.P(t, W.width * W.low(t) - 1.5)); }
    ink(g, lowPts, 1.8, gv(0.12, 0.85), { end: 0.1, bias: 0.6 });
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
// All back-view poses share one structure (same keys, same array lengths) so they interpolate with lerpPose.
// ROOT = THE MIDDLE OF THE BODY. Every pose below was measured on a 1:1 gridded source frame (s = 1.3 px per unit,
// frame positions in the comments) and the BACK table in anim.js places the root at the measured body centre.
const U = (x, y, rx, ry) => [(x - rx) / 1.3, (y - ry) / 1.3];     // frame px -> units about a root (rx, ry)
const folded = (S, T, width, back, dir) => ({ type: "folded", layer: "front", S, T, width, back, dir });
const fan = (o) => ({ type: "fan", layer: "front", nP: 7, nS: 4, wP: 0.34, wS: 0.4, cov: 0.6, bend: 0, seed: 7, ...o });
const noArm = [[0, 0], [0, 0], [0, 0]];

// STAND (60.24, root = body centre (1102, 680)): head sphere 1000–1210, top 375; left cup (995, 502) edge-on behind
// the head; right cup (1248, 480) ry ≈ 78 px, cushion on the head side and the cap facing right; band 1000,450 →
// 1100,330 → 1240,400; bandage (1162, 457) ≈ 70 px; crest (960–1030, 410–440) sweeping left; body 995–1210 x
// 560–800; feet (1085, 812) (1180, 808) on short legs.
const R0 = [1102, 680];
export const STAND = {
  light: [0.35, -0.9],
  head: { x: 2, y: -162, rx: 81, ry: 74, roll: 0.0, square: 2.2, jowl: 0.08 },
  crown: [10, -215],
  tufts: [],
  crest: { x: -40, y: -206, dir: 2.95, len: 70, w: 36, n: 5, fan: 0.75, curl: 0.1 },
  body: { x: 0, y: -28, a: 120, b: 90, rot: Math.PI / 2, egg: -0.06, sag: 0 },
  tail: { base: [-40, 70], tip: [-86, 88], w: 26, n: 3 },
  wings: [folded([70, -62], [70, 86], 20, 8, 1), folded([-70, -54], [-70, 78], 15, 6, -1)],
  feet: [{ x: -13, y: 100, size: 24, sy: 0.55, rot: 0, leg: 18, mode: "stand", spread: 1.2, seed: 2 }, { x: 60, y: 98, size: 25, sy: 0.72, rot: 0, leg: 18, mode: "stand", spread: 0.8, seed: 5 }],
  band: { pts: [U(1000, 450, ...R0), U(1010, 382, ...R0), U(1100, 332, ...R0), U(1192, 346, ...R0), U(1240, 402, ...R0)], w: 12, front: true, dark: false, arm: noArm },
  cups: [
    { x: -82, y: -137, r: 42, rot: 0, open: 0.18, side: -1, front: true },
    { x: 112, y: -154, r: 60, rot: 0, open: 0.5, side: 1, front: true },
  ],
  bandage: { x: 46, y: -172, size: 50, rot: -0.75, sx: 1, sy: 0.95 },
};
// SIT (59.00, root (965, 760)): head sphere 840–1040, top 500; crest (815–900, 540–580) sweeping left; right cup
// (1072, 600) side-on; left cup hidden; bandage (990, 582) ≈ 75 px; the headphones knocked round the neck: a dark
// strap from (840, 700) down to (940, 740) and up to (1030, 692), a slider arm up into the cup; right wing folded on
// the flank (1050–1130, 690–840); one foot sticking out at (1140, 790); tail feathers spread on the floor at the left.
const R1 = [965, 760];
export const SIT = {
  ...STAND,
  head: { x: -19, y: -123, rx: 77, ry: 76, roll: -0.03, square: 2.2, jowl: 0.08 },
  crown: [-10, -175],
  crest: { x: -48, y: -165, dir: Math.PI + 0.08, len: 66, w: 34, n: 5, fan: 0.75, curl: 0.12 },
  body: { x: 2, y: -4, a: 86, b: 100, rot: Math.PI / 2, egg: -0.2, sag: 0 },
  tail: { base: [-62, 62], tip: [-118, 76], w: 32, n: 4 },
  wings: [folded(U(1058, 690, ...R1), U(1110, 842, ...R1), 22, 8, 1), folded(U(845, 720, ...R1), U(840, 832, ...R1), 12, 5, -1)],
  feet: [{ x: -20, y: 78, size: 12, sy: 0.3, rot: 0, leg: 0, mode: "stand", seed: 2 }, { x: 132, y: 25, size: 19, sy: 0.95, rot: -2.4, leg: 0, mode: "stand", seed: 5 }],
  band: { pts: [U(840, 700, ...R1), U(890, 728, ...R1), U(940, 741, ...R1), U(990, 723, ...R1), U(1030, 692, ...R1)], w: 17, front: true, dark: true, arm: [U(1028, 694, ...R1), U(1042, 672, ...R1), U(1054, 650, ...R1)] },
  cups: [
    { x: -70, y: -120, r: 36, rot: 0, open: 0.05, side: -1, front: false },
    { x: U(1072, 590, ...R1)[0], y: U(1072, 590, ...R1)[1], r: 45, rot: 0.02, open: 0.6, side: 1, front: true },
  ],
  bandage: { x: 19, y: -137, size: 55, rot: -0.75, sx: 1, sy: 0.95 },
};
// SIT2 (59.16–59.56): the head lifts ≈ 12 px and rolls +4° (the source's frame diffs 8–13 at 58.80–59.16).
export const SIT2 = (() => {
  const d = [2, -9];
  const mv = (p) => [p[0] + d[0], p[1] + d[1]];
  return { ...SIT, head: { ...SIT.head, x: SIT.head.x + d[0], y: SIT.head.y + d[1], roll: 0.04 }, crown: mv(SIT.crown),
    crest: { ...SIT.crest, x: SIT.crest.x + d[0], y: SIT.crest.y + d[1] - 2, dir: SIT.crest.dir + 0.06 },
    cups: SIT.cups.map((c) => ({ ...c, x: c.x + d[0] + 1, y: c.y + d[1] + 2, rot: c.rot + 0.07 })),
    bandage: { ...SIT.bandage, x: SIT.bandage.x + d[0] + 1, y: SIT.bandage.y + d[1], rot: SIT.bandage.rot + 0.07 },
    band: { ...SIT.band, pts: SIT.band.pts.map((p, i) => [p[0], p[1] + d[1] * i / 6]), arm: SIT.band.arm.map(mv) } };
})();
// LIE (58.12–58.20, root = body centre, (1085, 725) at 58.20): on its belly skidding left, back to us: body
// 920–1250 x 590–850, the head at the right end (1180–1350) seen from behind with the strap round it, a crest tuft
// sticking up at (1210–1250, 580–640), wing tips and tail feathers flat along the floor at the left (830–950, 790–850).
const R2 = [1085, 725];
export const LIE = {
  ...STAND,
  head: { x: 128, y: -6, rx: 72, ry: 84, roll: 0.28, square: 2.2, jowl: 0.08 },
  crown: [150, -60],
  crest: { x: 96, y: -78, dir: -1.25, len: 42, w: 26, n: 4, fan: 0.7, curl: 0.1 },
  body: { x: -6, y: 4, a: 126, b: 98, rot: Math.PI, egg: 0.1, sag: 0 },
  tail: { base: U(935, 792, ...R2), tip: U(842, 832, ...R2), w: 30, n: 3 },
  wings: [folded(U(1180, 760, ...R2), U(960, 842, ...R2), 22, 8, -1), folded(U(1110, 640, ...R2), U(955, 700, ...R2), 16, 6, -1)],
  feet: [{ x: 88, y: 80, size: 17, sy: 0.75, rot: -2.0, leg: 0, mode: "stand", seed: 2 }, { x: -20, y: 92, size: 12, sy: 0.3, rot: 0, leg: 0, mode: "stand", seed: 5 }],
  band: { pts: [U(1090, 600, ...R2), U(1170, 582, ...R2), U(1232, 622, ...R2), U(1252, 722, ...R2), U(1240, 830, ...R2)], w: 17, front: true, dark: true, arm: [U(1240, 828, ...R2), U(1262, 812, ...R2), U(1284, 796, ...R2)] },
  cups: [
    { x: 30, y: -70, r: 34, rot: 1.2, open: 0.05, side: -1, front: false },
    { x: U(1300, 790, ...R2)[0], y: U(1300, 790, ...R2)[1], r: 38, rot: 1.25, open: 0.3, side: 1, front: true },
  ],
  bandage: { x: 130, y: -30, size: 0, rot: 0.3, sx: 0.7, sy: 0.9 },
};
// HEADSTAND (57.96–58.04, root (1415, 675)): the ball lands head-down: an upright egg (1275–1560 x 490–850), the
// tail feathers up at the top left (1300–1400, 470–560), the strap and cup wrapped round the head at the floor
// (1340–1600, 620–850), the feet sticking out at (1600–1640, 740–770) and (1250–1275, 650–700).
const R3 = [1415, 675];
export const HEADSTAND = {
  ...STAND,
  head: { x: 40, y: 98, rx: 78, ry: 66, roll: Math.PI - 0.15, square: 2.2, jowl: 0.08 },
  crown: [40, 150],
  crest: { x: -10, y: 120, dir: 2.6, len: 30, w: 20, n: 4, fan: 0.7, curl: 0.1 },
  body: { x: 0, y: -12, a: 118, b: 106, rot: -Math.PI / 2, egg: 0.08, sag: 0 },
  tail: { base: U(1350, 560, ...R3), tip: U(1310, 470, ...R3), w: 40, n: 3 },
  wings: [folded(U(1520, 560, ...R3), U(1560, 760, ...R3), 20, 8, 1), folded(U(1300, 600, ...R3), U(1290, 760, ...R3), 16, 6, -1)],
  feet: [{ x: U(1620, 755, ...R3)[0], y: U(1620, 755, ...R3)[1], size: 19, sy: 0.9, rot: -1.9, leg: 0, mode: "stand", seed: 2 }, { x: U(1258, 680, ...R3)[0], y: U(1258, 680, ...R3)[1], size: 17, sy: 0.9, rot: 1.9, leg: 0, mode: "stand", seed: 5 }],
  band: { pts: [U(1555, 630, ...R3), U(1592, 720, ...R3), U(1565, 812, ...R3), U(1480, 852, ...R3), U(1395, 846, ...R3)], w: 17, front: true, dark: true, arm: [U(1398, 846, ...R3), U(1420, 850, ...R3), U(1440, 852, ...R3)] },
  cups: [
    { x: 0, y: 60, r: 34, rot: 3.0, open: 0.05, side: -1, front: false },
    { x: U(1462, 842, ...R3)[0], y: U(1462, 842, ...R3)[1], r: 38, rot: 2.8, open: 0.3, side: 1, front: true },
  ],
  bandage: { x: 40, y: 100, size: 0, rot: 0, sx: 1, sy: 1 },
};
// LEAN (59.84, root (1090, 710)): bowed forward to the right, dusting off: head (1100–1360, 480–780) turned down to
// the right, crest up at (1210–1250, 470–530), band over the crown into the near cup (1290, 700) at the lower right,
// bandage (1265, 630); body 920–1260 x 560–840; the right wing swept down along the floor to (1380, 885).
const R4 = [1090, 710];
export const LEAN = {
  ...STAND,
  head: { x: 108, y: -69, rx: 80, ry: 75, roll: 0.7, square: 2.2, jowl: 0.08 },
  crown: [130, -120],
  crest: { x: 96, y: -146, dir: -1.55, len: 46, w: 26, n: 4, fan: 0.7, curl: 0.1 },
  body: { x: 0, y: 0, a: 100, b: 118, rot: Math.PI / 2 - 0.3, egg: -0.12, sag: 0 },
  tail: { base: [-100, 58], tip: [-160, 78], w: 28, n: 3 },
  wings: [folded(U(1180, 700, ...R4), U(1380, 885, ...R4), 34, 12, 1), folded(U(950, 700, ...R4), U(885, 762, ...R4), 18, 6, -1)],
  feet: [{ x: 60, y: 100, size: 14, sy: 0.4, rot: 0, leg: 0, mode: "stand", seed: 2 }, { x: 140, y: 100, size: 14, sy: 0.4, rot: 0, leg: 0, mode: "stand", seed: 5 }],
  band: { pts: [U(1110, 540, ...R4), U(1180, 490, ...R4), U(1280, 500, ...R4), U(1350, 590, ...R4), U(1360, 668, ...R4)], w: 12, front: true, dark: false, arm: noArm },
  cups: [
    { x: 15, y: -115, r: 36, rot: 0.6, open: 0.05, side: -1, front: false },
    { x: U(1290, 700, ...R4)[0], y: U(1290, 700, ...R4)[1], r: 46, rot: 0.55, open: 0.5, side: 1, front: true },
  ],
  bandage: { x: U(1265, 630, ...R4)[0], y: U(1265, 630, ...R4)[1], size: 50, rot: 0.2, sx: 1, sy: 0.95 },
};
// SWEEP (60.08, root (1105, 685)): straightening up, head still rolled to the right (≈ 0.17 rad: left cup (1025, 485),
// right cup (1320, 535)), bandage (1235, 485), the right wing swept out down-right to (1470, 790).
const R5 = [1105, 685];
export const SWEEP = {
  ...STAND,
  head: { x: 42, y: -165, rx: 86, ry: 76, roll: 0.17, square: 2.2, jowl: 0.08 },
  crown: [50, -215],
  crest: { x: -4, y: -219, dir: 3.0, len: 52, w: 28, n: 5, fan: 0.8, curl: 0.1 },
  wings: [folded(U(1190, 620, ...R5), U(1470, 790, ...R5), 36, 14, 1), folded(U(1010, 620, ...R5), U(1010, 780, ...R5), 16, 6, -1)],
  feet: [{ x: -8, y: 96, size: 24, sy: 0.55, rot: 0, leg: 18, mode: "stand", spread: 1.2, seed: 2 }, { x: 54, y: 96, size: 25, sy: 0.72, rot: 0, leg: 18, mode: "stand", spread: 0.8, seed: 5 }],
  band: { pts: [U(1030, 430, ...R5), U(1060, 370, ...R5), U(1160, 340, ...R5), U(1270, 380, ...R5), U(1320, 468, ...R5)], w: 12, front: true, dark: false, arm: noArm },
  cups: [
    { x: U(1025, 485, ...R5)[0], y: U(1025, 485, ...R5)[1], r: 40, rot: 0.17, open: 0.2, side: -1, front: true },
    { x: U(1320, 535, ...R5)[0], y: U(1320, 535, ...R5)[1], r: 52, rot: 0.17, open: 0.5, side: 1, front: true },
  ],
  bandage: { x: U(1235, 485, ...R5)[0], y: U(1235, 485, ...R5)[1], size: 50, rot: -0.5, sx: 1, sy: 0.95 },
};
// SPREAD (61.24–61.44, root (1277, 690)): wings open from shoulders at y ≈ 600, rising ≈ 20–30°, long pointed
// primaries: left tip (1010, 540), right tip (1660, 500), lower feathers (1040–1100, 620–650) and (1450–1600,
// 600–660); head top 420, cups (1175, 530) edge-on and (1410, 510); bandage (1332, 495); feet (1220 / 1325, 815).
const R6 = [1277, 690];
export const SPREAD = {
  ...STAND,
  head: { x: 2, y: -135, rx: 85, ry: 73, roll: 0.0, square: 2.2, jowl: 0.08 },
  crown: [10, -190],
  crest: { x: -60, y: -182, dir: 3.0, len: 52, w: 28, n: 5, fan: 0.8, curl: 0.1 },
  body: { x: 0, y: -22, a: 118, b: 108, rot: Math.PI / 2, egg: -0.1, sag: 0 },
  wings: [
    fan({ S: [-64, -58], Wr: [-108, -84], T: [-142, -100], dS: [-0.6, 0.8], dWr: [-0.92, 0.36], dT: [-0.9, -0.43], LP: [64, 78], LS: 62, nP: 8, nS: 6, wP: 0.44, wS: 0.5, cov: 0.9, seed: 11 }),
    fan({ S: [66, -58], Wr: [140, -94], T: [205, -120], dS: [0.6, 0.8], dWr: [0.9, 0.42], dT: [0.92, -0.38], LP: [70, 86], LS: 64, nP: 8, nS: 6, wP: 0.44, wS: 0.5, cov: 0.9, seed: 13 }),
  ],
  feet: [{ x: -44, y: 96, size: 24, sy: 0.55, rot: 0, leg: 18, mode: "stand", spread: 1.2, seed: 2 }, { x: 37, y: 96, size: 25, sy: 0.72, rot: 0, leg: 18, mode: "stand", spread: 0.8, seed: 5 }],
  band: { pts: [U(1175, 480, ...R6), U(1190, 410, ...R6), U(1300, 390, ...R6), U(1400, 430, ...R6), U(1420, 470, ...R6)], w: 12, front: true, dark: false, arm: noArm },
  cups: [
    { x: -78, y: -123, r: 44, rot: 0, open: 0.25, side: -1, front: true },
    { x: 102, y: -138, r: 56, rot: 0, open: 0.75, side: 1, front: true },
  ],
  bandage: { x: 42, y: -150, size: 52, rot: -0.75, sx: 1, sy: 0.95 },
};
// SPREAD_UP (61.84–62.28, root = body centre, (1225, 665) at 62.00): stretched up under the card: head sphere
// 1050–1310 (centre 45 px left of the body), top 315; cups (1068, 475) edge-on and (1335, 455); bandage (1237, 418);
// crest (1035–1080, 380–415); body 1095–1355 x 530–800; left wing out to x 860 (y 450–650), right wing raised to
// (1565, 370) with its lower primaries at (1550, 600); feet (1225, 810) (1370, 785).
const R7 = [1225, 665];
export const SPREAD_UP = {
  ...STAND,
  head: { x: -35, y: -196, rx: 92, ry: 80, roll: 0.04, square: 2.2, jowl: 0.08 },
  crown: [-30, -250],
  crest: { x: -100, y: -212, dir: 3.05, len: 56, w: 30, n: 5, fan: 0.8, curl: 0.1 },
  body: { x: 0, y: -40, a: 142, b: 104, rot: Math.PI / 2, egg: -0.1, sag: 0 },
  tail: { base: U(1150, 780, ...R7), tip: U(1108, 812, ...R7), w: 28, n: 3 },
  wings: [
    fan({ S: [-92, -62], Wr: [-148, -98], T: [-192, -132], dS: [-0.5, 0.86], dWr: [-0.85, 0.52], dT: [-0.97, -0.2], LP: [68, 84], LS: 64, nP: 8, nS: 6, wP: 0.44, wS: 0.5, cov: 0.9, seed: 11 }),
    fan({ S: [84, -62], Wr: [150, -118], T: [214, -166], dS: [0.55, 0.83], dWr: [0.95, 0.3], dT: [0.6, -0.8], LP: [72, 84], LS: 64, nP: 8, nS: 6, wP: 0.44, wS: 0.5, cov: 0.9, seed: 13 }),
  ],
  feet: [{ x: 0, y: 106, size: 24, sy: 0.55, rot: 0, leg: 18, mode: "stand", spread: 1.2, seed: 2 }, { x: 112, y: 88, size: 25, sy: 0.72, rot: 0, leg: 18, mode: "stand", spread: 0.8, seed: 5 }],
  band: { pts: [U(1060, 400, ...R7), U(1100, 320, ...R7), U(1200, 295, ...R7), U(1300, 310, ...R7), U(1340, 390, ...R7)], w: 12, front: true, dark: false, arm: noArm },
  cups: [
    { x: U(1068, 475, ...R7)[0], y: U(1068, 475, ...R7)[1], r: 44, rot: 0, open: 0.22, side: -1, front: true },
    { x: U(1335, 455, ...R7)[0], y: U(1335, 455, ...R7)[1], r: 52, rot: 0, open: 0.5, side: 1, front: true },
  ],
  bandage: { x: U(1237, 418, ...R7)[0], y: U(1237, 418, ...R7)[1], size: 55, rot: -0.75, sx: 1, sy: 0.95 },
};
