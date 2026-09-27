// s19 carry owl (62.32–63.12): three-quarter view facing right, walking off to the right under the lifted card.
// A dedicated drawing (the kit has no pose like it), painted from the kit's parts in FRAME PX around the near
// headphone cup's centre C, measured on the source at 62.40 (C = (1477, 445)):
//   head centre C+(48,-33), rx 135, ry 100; eye C+(140,-33) r 30; beak C+(173..223, -20..40); bandage C+(70,-103);
//   crest tuft C+(-122..-57, -110..-50); band top C+(-27..43, -180); body C+(38,195) rx 165, ry 130;
//   far wing (behind): shoulder C+(-70,70), tip C+(-362,-20), trailing edge C+(-317,95)…(-127,165);
//   near wing (raised to the card): shoulder C+(120,95), tip C+(363,-85), lower feathers to C+(383,65);
//   tail C+(-167..-77, 265..315); feet C+(-77..133, 335..405).
// The source holds this one drawing for the whole carry (it slides right); the eye is a happy closed arc on the
// first frame (62.32) and open from 62.36, and the feet step.
import { plumage, softShade, rimHatch, edgeFlicks, flick, ink, setPPU, gv, V, drawBandSlim } from "../../../lib/owlInk.js";
import { smoothPath, sampleCurve } from "../../../lib/paths.js";
import { taper } from "../../../lib/ink.js";
import { rng, clamp } from "../../../lib/rng.js";
import { wingFan, paintWing, pointedFeather } from "./feathers.js";

const TAU = Math.PI * 2;
const { add, mul, nrm } = V;
const blobPath = (pts) => (c) => smoothPath(c, pts, true);
const LIGHT = [0.42, -0.9];
const LN = gv(0.16);            // outline ink (reads dark grey on the glowing owl, like the source)

// ---------------------------------------------------------------- shapes (px, relative to C)
const HEAD = [[-62, -118], [-10, -131], [45, -134], [105, -124], [150, -100], [176, -62], [184, -18], [178, 22], [150, 55], [100, 72], [30, 76], [-40, 66], [-84, 30], [-96, -20], [-88, -78]];
// (fix pass 3: the right side pulled in ≈ 30 px; the source's near wing hangs over the body's upper right)
const BODY = [[-60, 40], [60, 56], [135, 92], [166, 160], [168, 235], [140, 296], [70, 324], [-10, 328], [-90, 306], [-132, 250], [-134, 170], [-104, 90]];
const CREST = [[-44, -124], [-78, -122], [-112, -140], [-96, -118], [-128, -110], [-100, -98], [-126, -84], [-92, -78], [-80, -60]];
const TAIL = [
  { root: [-58, 282], dir: nrm([-0.95, 0.12]), L: 112, w: 34 },
  { root: [-50, 292], dir: nrm([-0.9, 0.35]), L: 100, w: 32 },
  { root: [-40, 300], dir: nrm([-0.75, 0.6]), L: 80, w: 28 },
];
const FAR = wingFan({ S: [-60, 70], Wr: [-150, 30], T: [-235, -4], nP: 9, nS: 6, dS: [-0.72, 0.7], dWr: [-0.9, 0.44], dT: [-0.995, -0.04], LP: [104, 130], LS: 96, wP: 0.4, wS: 0.42, cov: 0.75, bend: -0.05, seed: 21 });
// (fix pass 3: the leading edge passes ≈ 30 px under the beak, as in the source, so it no longer reads as a headset boom)
const NEAR = wingFan({ S: [128, 104], Wr: [242, 46], T: [318, -44], nP: 9, nS: 6, dS: [0.45, 0.89], dWr: [0.9, 0.42], dT: [0.82, -0.57], LP: [100, 116], LS: 100, wP: 0.4, wS: 0.42, cov: 0.8, bend: 0.05, seed: 23 });

function drawCupSide(g) {
  // the near cup seen from the side (62.40 grid: the whole cup rel (-64..64, -77..66)): a thick dark cushion ring, its
  // pleats showing on the face side (right), and a dark domed metal cap toward us on the left (centre (-18, -2),
  // r ≈ 42) with engraved rim arcs and a single soft highlight (fix pass 3: no bright concentric rings)
  const r = rng(71);
  g.save();
  g.fillStyle = "#0e0e0e"; g.beginPath(); g.ellipse(0, -4, 64, 71, 0, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.ellipse(0, -4, 64, 71, 0, 0, TAU); g.ellipse(-14, -3, 48, 54, 0, 0, TAU); g.clip("evenodd");
  for (let i = 0; i < 50; i++) {
    const a = -1.45 + (i / 49) * 2.9, c = Math.cos(a), sn = Math.sin(a);
    g.strokeStyle = gv(0.3 + 0.25 * r(), 0.75); g.lineWidth = 1.1 + 0.5 * r();
    g.beginPath(); g.moveTo(-14 + c * 48, -3 + sn * 54); g.lineTo(c * 62, -4 + sn * 69); g.stroke();
  }
  g.restore();
  g.strokeStyle = gv(0.55, 0.8); g.lineWidth = 1.6; g.beginPath(); g.ellipse(0, -4, 62, 69, 0, -1.2, 0.9); g.stroke();
  // shell ring and cap
  g.fillStyle = gv(0.2); g.beginPath(); g.ellipse(-14, -3, 48, 54, 0, 0, TAU); g.fill();
  g.strokeStyle = gv(0.06); g.lineWidth = 2.4; g.stroke();
  const cap = (q) => q.ellipse(-18, -2, 40, 45, 0, 0, TAU);
  g.save(); g.beginPath(); cap(g); g.clip();
  // (fix pass 4: matte brushed metal, no glossy highlight: a flat grey with a gentle fall-off and engraved rim arcs)
  const gr = g.createLinearGradient(-50, -40, 20, 40);
  gr.addColorStop(0, gv(0.5)); gr.addColorStop(0.6, gv(0.4)); gr.addColorStop(1, gv(0.3));
  g.fillStyle = gr; g.fillRect(-64, -52, 96, 104);
  for (let i = 0; i < 5; i++) { const k = 0.55 + 0.1 * i; g.strokeStyle = gv(0.1, 0.55); g.lineWidth = 1.1; g.beginPath(); g.ellipse(-18, -2, 40 * k, 45 * k, 0, 0.3, 2.8); g.stroke(); }
  g.restore();
  g.strokeStyle = gv(0.05); g.lineWidth = 2.6; g.beginPath(); cap(g); g.stroke();
  g.strokeStyle = gv(0.7, 0.6); g.lineWidth = 1.4; g.beginPath(); g.ellipse(-18, -2, 37, 42, 0, 3.4, 4.8); g.stroke();
  g.restore();
}
function drawBandArc(g) {
  // measured at 62.40: a slim dark band rising from the cup's top (yoke at (-6, -64)) straight up to (0, -150), arching
  // over to the right (top y -176) and down behind the crown at (+62, -140); a ribbed slider just above the yoke
  // the whole arc is drawn behind the head (its far end dips behind the crown), then its near half again in front
  drawBandSlim(g, [[-8, -72], [-6, -122], [2, -160], [26, -178], [52, -168], [60, -132]], { w: 21, slider: 0.25, ends: [true, false], ribs: true });
}
function drawBandNear(g) {
  g.save(); g.beginPath(); g.rect(-60, -260, 78, 220); g.clip();
  drawBandSlim(g, [[-8, -72], [-6, -122], [2, -160], [26, -178], [52, -168], [60, -132]], { w: 21, slider: 0.25, ends: [true, false], ribs: true });
  g.restore();
}
function drawBandageC(g) {
  // two broad rounded pads crossed at about 70° on the crown (≈ 65 x 48 px), outlined, with a quilted centre
  g.save(); g.translate(70, -104);
  const pad = (rot, L, Wd) => {
    g.save(); g.rotate(rot);
    g.fillStyle = gv(0.9); g.beginPath(); g.roundRect(-L / 2, -Wd / 2, L, Wd, Wd * 0.45); g.fill();
    g.strokeStyle = gv(0.25); g.lineWidth = 1.8; g.stroke();
    g.restore();
  };
  pad(-0.25, 66, 24); pad(1.0, 54, 26);
  g.fillStyle = gv(0.8); g.beginPath(); g.roundRect(-11, -10, 22, 20, 5); g.fill();
  g.strokeStyle = gv(0.35); g.lineWidth = 1.2; g.stroke();
  g.fillStyle = gv(0.35); for (const [x, y] of [[-5, -4], [3, -5], [-3, 4], [5, 3]]) { g.beginPath(); g.arc(x, y, 1.3, 0, TAU); g.fill(); }
  g.restore();
}
function drawEyeOpen(g) {
  g.save(); g.translate(140, -33);
  g.fillStyle = gv(0.98); g.beginPath(); g.ellipse(0, 0, 27, 31, 0.08, 0, TAU); g.fill();
  g.strokeStyle = LN; g.lineWidth = 2.6; g.stroke();
  g.fillStyle = "#070707"; g.beginPath(); g.ellipse(-6, -5, 10.5, 12, 0, 0, TAU); g.fill();
  g.fillStyle = gv(0.98); g.beginPath(); g.arc(-9, -9, 2.6, 0, TAU); g.fill();
  ink(g, [[-30, -30], [-8, -42], [18, -40]], 1.6, gv(0.3, 0.7), { end: 0.2 });
  g.restore();
}
function drawEyeClosed(g) {
  g.save(); g.translate(140, -30);
  ink(g, [[-24, 6], [-10, -8], [8, -10], [24, 2]], 4.2, LN, { end: 0.25, bias: 0.5 });
  ink(g, [[-30, -30], [-8, -42], [18, -40]], 1.6, gv(0.3, 0.7), { end: 0.2 });
  g.restore();
}
function drawBeakOpen(g) {
  // 62.40 grid: a small pale hooked beak rel (171..221, -27..34), the upper mandible hooking down at its tip, a little
  // open smile under it (dark gap, a grey tongue); outlined in the owl's ink
  const up = [[172, -24], [192, -28], [210, -18], [220, -2], [219, 12], [212, 18], [206, 8], [190, 4], [174, 2]];
  const lo = [[180, 14], [198, 16], [204, 22], [196, 30], [182, 27]];
  g.fillStyle = gv(0.15); g.beginPath(); smoothPath(g, [[178, 6], [204, 10], [202, 18], [182, 16]], true); g.fill();
  for (const [pts, v] of [[lo, 0.88], [up, 0.93]]) {
    const p = blobPath(pts);
    plumage(g, p, { base: v, shade: v - 0.2, light: [-0.5, -0.8], depth: 5, blur: 3 });
    ink(g, [...pts, pts[0]], 1.8, LN, { end: 0.7 });
  }
  ink(g, [[186, -14], [202, -14], [212, -4]], 1.0, gv(0.98, 0.8), { end: 0.2 });
}
// a dark contour round the whole silhouette: the layer's alpha dilated by w px, filled with ink, drawn behind
let OUT = null;
function outlineLayer(cv, w) {
  if (w <= 0) return;
  if (!OUT) OUT = document.createElement("canvas");
  if (OUT.width !== cv.width || OUT.height !== cv.height) { OUT.width = cv.width; OUT.height = cv.height; }
  const o = OUT.getContext("2d");
  o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = "source-over"; o.clearRect(0, 0, OUT.width, OUT.height);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; o.drawImage(cv, Math.cos(a) * w, Math.sin(a) * w); }
  o.globalCompositeOperation = "source-in"; o.fillStyle = "#0d0c0b"; o.fillRect(0, 0, OUT.width, OUT.height);
  const g = cv.getContext("2d");
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "destination-over"; g.drawImage(OUT, 0, 0); g.restore();
}
// ---------------------------------------------------------------- the layer (cached per eye state)
let LAYERS = {};
const PAD = { x: 420, y: 230, w: 860, h: 700 };
function carryLayer(closed) {
  const k = closed ? "c" : "o";
  if (LAYERS[k]) return LAYERS[k];
  const c = document.createElement("canvas"); c.width = PAD.w; c.height = PAD.h;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.translate(PAD.x, PAD.y);
  setPPU(1);
  const plu = { light: LIGHT };
  // far wing and tail behind the body
  paintWing(g, FAR, { light: LIGHT, line: 2.0, col: LN, shade: 0.7, seed: 31 });
  for (const f of TAIL) {
    const pts = pointedFeather(f.root, f.dir, f.L, f.w, 0.05), p = blobPath(pts);
    plumage(g, p, { base: 0.93, shade: 0.7, ...plu, depth: 10, blur: 6 });
    ink(g, pts.slice(1, 8), 2.0, LN, { end: 0.2 });
    ink(g, [add(f.root, mul(f.dir, f.L * 0.1)), add(f.root, mul(f.dir, f.L * 0.8))], 0.9, gv(0.4, 0.5), { end: 0.1 });
  }
  // body: round, soft white, darker toward the lower left, feather hatching on the shadow side
  const bp = blobPath(BODY);
  plumage(g, bp, { base: 0.98, shade: 0.8, ...plu, depth: 70, blur: 34 });
  softShade(g, bp, (q) => q.ellipse(-70, 270, 110, 60, 0.3, 0, TAU), 0.66, 0.2, 30);
  softShade(g, bp, (q) => q.ellipse(140, 260, 90, 80, 0, 0, TAU), 0.7, 0.25, 34);
  softShade(g, bp, (q) => q.ellipse(-140, 190, 50, 120, 0, 0, TAU), 0.66, 0.22, 26);
  // (fix pass 4: the shade is carried by directional hatching, not a smooth grey: short parallel strokes down-left on
  // the lower left and down the right flank)
  { const rq = rng(37); g.save(); g.beginPath(); bp(g); g.clip();
    for (const [cx, cy, rx, ry, ang, n] of [[-60, 260, 120, 70, 1.9, 150], [150, 240, 60, 110, 1.4, 110], [-125, 180, 45, 110, 1.75, 80]]) for (let i = 0; i < n; i++) {
      const a = rq() * TAU, d = Math.sqrt(rq()), p = [cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d], dir = [Math.cos(ang + (rq() - 0.5) * 0.2), Math.sin(ang + (rq() - 0.5) * 0.2)];
      flick(g, p, dir, 14 + rq() * 18, 1.0 + 0.5 * rq(), gv(0.3, 0.2 + 0.35 * (1 - d)), 0.05);
    }
    g.restore(); }
  rimHatch(g, BODY, { light: LIGHT, flow: [0.2, 1], len: 30, step: 3.2, w: 1.1, color: gv(0.35, 0.55), seed: 12, density: 1, bend: 0.5 });
  edgeFlicks(g, BODY, { step: 9, len: 12, w: 1.0, color: gv(0.45, 0.45), ang: 0.9, seed: 19 });
  g.save(); g.beginPath(); bp(g); g.clip();
  const rr = rng(15);
  for (let i = 0; i < 420; i++) {
    const a = rr() * TAU, d = Math.pow(rr(), 0.5);
    const p = [38 + Math.cos(a) * 160 * d, 195 + Math.sin(a) * 128 * d];
    const dir = V.rot([0.15, 1], (rr() - 0.5) * 0.5 + (p[0] - 38) / 400);
    flick(g, p, nrm(dir), 10 + rr() * 16, 0.8 + 0.4 * rr(), gv(0.35, 0.16 + 0.4 * d * d), 0.12);
  }
  g.restore();
  // near wing (raised to the card) in front of the body
  paintWing(g, NEAR, { light: LIGHT, line: 2.0, col: LN, shade: 0.74, seed: 33 });
  // crest tuft and head
  const cp = blobPath(CREST);
  plumage(g, cp, { base: 0.95, shade: 0.74, ...plu, depth: 12, blur: 6 });
  ink(g, CREST.slice(1, 8), 1.8, LN, { end: 0.15 });
  const hp = blobPath(HEAD);
  drawBandArc(g);
  plumage(g, hp, { base: 0.98, shade: 0.82, ...plu, depth: 44, blur: 24, keep: [30, 20] });
  softShade(g, hp, (q) => q.ellipse(-50, 40, 70, 44, 0, 0, TAU), 0.66, 0.25, 22);
  rimHatch(g, HEAD, { light: LIGHT, flow: [0, 1], len: 18, step: 3, w: 1.0, color: gv(0.35, 0.5), seed: 22, density: 0.9, thr: 0.15 });
  g.save(); g.beginPath(); hp(g); g.clip();
  const rh = rng(27);
  for (let i = 0; i < 220; i++) {
    const a = rh() * TAU, d = Math.pow(rh(), 0.5);
    const p = [48 + Math.cos(a) * 130 * d, -33 + Math.sin(a) * 96 * d];
    const dir = nrm([p[0] - 150, p[1] + 30]);
    flick(g, p, V.rot(dir, (rh() - 0.5) * 0.4), 6 + rh() * 9, 0.8, gv(0.4, 0.06 + 0.26 * d * d), 0.08);
  }
  g.restore();
  // facial disc: a faint rim curving round the eye from the brow to the cheek
  ink(g, [[92, -112], [96, -60], [108, -8], [140, 30], [172, 34]], 1.4, gv(0.35, 0.5), { end: 0.2 });
  ink(g, [HEAD[12], HEAD[13], HEAD[14], ...HEAD.slice(0, 9)], 1.8, LN, { end: 0.3, bias: 0.5 });
  // band over the crown (near half in front of the head), the cup, bandage
  drawBandNear(g);
  drawBandageC(g);
  // (fix pass 4: the cup ≈ 0.82x its old diameter and a touch lower, as measured on the dark-cup centroid)
  g.save(); g.translate(0, 10); g.scale(0.82, 0.82); drawCupSide(g); g.restore();
  (closed ? drawEyeClosed : drawEyeOpen)(g);
  drawBeakOpen(g);
  setPPU(1);
  g.setTransform(1, 0, 0, 1, 0, 0);
  outlineLayer(c, 1.8);
  LAYERS[k] = c;
  return c;
}

// ---------------------------------------------------------------- feet (drawn per frame: a two-drawing walk)
// Side-view foot: a short feathered leg, three long toes forward, one back, pale with dark keylines and claws.
function sideFoot(g, x, y, lift, rot, seed) {
  const r = rng(seed);
  g.save(); g.translate(x, y - lift); g.rotate(rot);
  g.lineCap = "round"; g.lineJoin = "round";
  // leg
  taper(g, [[0, -34], [2, -16], [4, 0]], () => 15, gv(0.1));
  taper(g, [[0, -34], [2, -16], [4, 0]], () => 10.5, gv(0.86));
  for (let k = 1; k < 4; k++) ink(g, [[-4, -34 + k * 8], [6, -32 + k * 8]], 0.8, gv(0.35, 0.7));
  const toes = [[[4, 0], [32, 6], [58, 10]], [[4, 0], [28, 12], [50, 22]], [[4, 0], [22, 2], [42, -3]], [[4, 0], [-12, 6], [-24, 10]]];
  toes.forEach((t, i) => {
    const q = sampleCurve(t.map(([a, b]) => [a + (r() - 0.5) * 2, b]), 5);
    taper(g, q, (u) => 15 * (1 - 0.3 * u), gv(0.08));
    taper(g, q, (u) => 11 * (1 - 0.3 * u), gv(0.9));
    for (let k = 1; k < 3; k++) { const p = q[Math.round(k / 3 * (q.length - 1))]; ink(g, [[p[0] - 1, p[1] - 4], [p[0] + 1, p[1] + 4]], 0.9, gv(0.35, 0.7)); }
    const e = q[q.length - 1], d = nrm([e[0] - q[q.length - 3][0], e[1] - q[q.length - 3][1]]);
    ink(g, [e, add(e, add(mul(d, 7), [0, 3])), add(e, add(mul(d, 10), [0, 8]))], 2.6, "#0a0a0a", { end: 0.1 });
    void i;
  });
  g.restore();
}
// cycle of 8 frames (0.32 s, ≈ 6 steps/s): each foot lifts 24 px and swings forward while the other is planted
function drawFeet(ctx, x, y, t) {
  const ph = ((t - 62.32) / 0.32) % 1, s = Math.sin(ph * TAU);
  // (fix pass 4: one foot steps high (tucked up under the body, as in the source at 62.52 / 62.76), the other planted)
  const liftA = Math.max(0, s) * 44, liftB = Math.max(0, -s) * 44;
  const swA = -Math.cos(ph * TAU) * 28, swB = Math.cos(ph * TAU) * 28;
  sideFoot(ctx, x - 30 + swA, y + 380, liftA, -0.1 - liftA * 0.006, 3);
  sideFoot(ctx, x + 62 + swB, y + 372, liftB, -0.05 - liftB * 0.006, 5);
}

// ---------------------------------------------------------------- per-frame placement
// cup centre, template-tracked on the source (score 0.91–1.00): y steady at 443–451; x below. The source repeats
// the frame at 62.56. After 62.96 the cup leaves the frame: extrapolated at the last measured speed (≈ 53 px/frame).
export const CUP = [
  [62.28, 1405, 445], [62.32, 1428, 445], [62.36, 1443, 443], [62.40, 1477, 445], [62.44, 1525, 444], [62.48, 1572, 445], [62.52, 1618, 444],
  [62.56, 1618, 444], [62.60, 1665, 449], [62.64, 1720, 443], [62.68, 1770, 441], [62.72, 1820, 445], [62.76, 1872, 451],
  [62.80, 1928, 444], [62.84, 1981, 443], [62.88, 2032, 443], [62.92, 2086, 448], [62.96, 2138, 446], [63.00, 2191, 446],
  [63.04, 2244, 446], [63.08, 2297, 446], [63.12, 2350, 446],
];
export function cupAt(t) {
  const T = CUP;
  if (t <= T[0][0]) return [T[0][1], T[0][2]];
  for (let i = 1; i < T.length; i++) if (t <= T[i][0] + 1e-6) { const a = T[i - 1], b = T[i], u = (t - a[0]) / (b[0] - a[0]); return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; }
  const z = T[T.length - 1]; return [z[1], z[2]];
}
export function drawCarry(ctx, t) {
  const [x, y] = cupAt(t);
  drawFeet(ctx, x, y, t);
  const L = carryLayer(t < 62.34);   // eye shut on the first two carry frames (62.28, 62.32)
  ctx.drawImage(L, Math.round(x - PAD.x), Math.round(y - PAD.y));
  return { x: x + 40, y: y + 400, w: 300 };
}
export function releaseCarry() { LAYERS = {}; OUT = null; }
