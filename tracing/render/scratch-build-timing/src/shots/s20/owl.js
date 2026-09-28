// The owl's performance in s20, keyed per source frame (positions measured on 2x grids of the source; see
// fidelity/s20.md). A key holds until the next one (the source animates on ones/twos with held drawings).
// Setup A keys are in A's frame; setup B keys (≥ 66.84) are in B's own frame (no transform applied).
//   63.12–63.64 rear view, right wing raised against the card, sliding right with it, then holding
//   63.68–63.76 turning round through profile (right) to three-quarter
//   63.80–64.28 front, standing, big round eyes glancing left, then right at the card
//   64.32       front, wings dropped, about to run;  64.36 profile left, off towards the scissors
//   64.40–65.56 profile left at the scissors, eyes squeezed shut, wing sweeping (the dust cloud)
//   65.60–65.64 turning back;  65.68–66.84 profile left by the card, staring at the scissors
//   66.84–67.16 (B) the same stare;  67.20–67.24 lunge;  67.28 grabs;  67.32–67.36 pulls them upright
//   67.40–67.68 whirl (motion blur);  67.72–69.44 the smirk: scissors up behind the head, wing on hip, glint
import { owlPose, drawBandage, gv, LINE, plumage, ink, flick, V } from "../../lib/owlInk.js";
import { smoothPath } from "../../lib/paths.js";
import { taper } from "../../lib/ink.js";
import { sampleCurve } from "../../lib/paths.js";

export const OWL_CUT = 66.84;
function mergeDeep(a, b) {
  const out = { ...a };
  for (const k of Object.keys(b)) out[k] = b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k]) ? mergeDeep(a[k], b[k]) : b[k];
  return out;
}

// Owl feet as the source draws them (the kit's talons break up at this size): a short scaly leg and three long
// pale toes fanned out on the ground (foreshortened), a small back toe, dark keyline, dark hooked claws. Owl units.
function footS(g, { x, y, dir = Math.PI / 2, size = 34, spread = 0.55, leg = 16, flat = 0.5, w = 0.22 }) {
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  const tw = size * w;
  const stroke2 = (pts, wd) => {
    for (const [col, ww] of [[LINE, wd + 2.6], [gv(0.9), wd]]) { g.strokeStyle = col; g.lineWidth = ww; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) g.lineTo(p[0], p[1]); g.stroke(); }
  };
  if (leg > 0) {
    // the leg runs up into the belly (the owl is drawn over it)
    stroke2([[x, y - leg - size * 0.6], [x, y]], tw * 1.05);
    g.strokeStyle = gv(0.35, 0.75); g.lineWidth = 0.9;
    for (let k = 1; k < 4; k++) { const yy = y - leg * k / 4; g.beginPath(); g.moveTo(x - tw * 0.45, yy); g.lineTo(x + tw * 0.45, yy + 1.2); g.stroke(); }
  }
  // back toe first, then the outer front toes, the middle toe last (on top)
  const toes = [[dir + Math.PI + 0.35, 0.34], [dir - spread, 0.86], [dir + spread, 0.86], [dir, 1.0]];
  for (const [a, k] of toes) {
    const Ln = size * k;
    let d = [Math.cos(a), Math.sin(a) * flat + 0.1]; const n0 = Math.hypot(d[0], d[1]); d = [d[0] / n0, d[1] / n0];
    const nn = [-d[1], d[0]];
    const sag = (d[0] >= 0 ? 1 : -1) * 0.06 * Ln;          // toes bow down toward the ground
    const P = (f) => [x + d[0] * Ln * f + nn[0] * sag * Math.sin(Math.PI * f) * (d[0] >= 0 ? 1 : -1), y + d[1] * Ln * f + Math.abs(sag) * Math.sin(Math.PI * f)];
    const pts = [P(0), P(0.35), P(0.7), P(1)];
    // tapering segments with rounded knuckles
    for (let i = 0; i < 3; i++) stroke2([pts[i], pts[i + 1]], tw * (1 - 0.18 * i));
    g.strokeStyle = gv(0.3, 0.8); g.lineWidth = 0.9;
    for (const i of [1, 2]) { const p = pts[i]; g.beginPath(); g.moveTo(p[0] - nn[0] * tw * 0.4, p[1] - nn[1] * tw * 0.4); g.lineTo(p[0] + nn[0] * tw * 0.4, p[1] + nn[1] * tw * 0.4); g.stroke(); }
    // claw: a pale hook curling down past the toe tip, dark keyline, dark point
    const e = pts[3], cl = tw * 1.25;
    const down = [0, 1];
    const tip = [e[0] + d[0] * cl * 0.9 + down[0] * cl * 0.55, e[1] + d[1] * cl * 0.9 + down[1] * cl * 0.55];
    const b0 = [e[0] - nn[0] * tw * 0.3, e[1] - nn[1] * tw * 0.3], b1 = [e[0] + nn[0] * tw * 0.3, e[1] + nn[1] * tw * 0.3];
    const mid = [e[0] + d[0] * cl * 0.75, e[1] + d[1] * cl * 0.75 - tw * 0.1];
    g.beginPath(); g.moveTo(b0[0], b0[1]); g.quadraticCurveTo(mid[0], mid[1] - tw * 0.2, tip[0], tip[1]); g.quadraticCurveTo(mid[0] - d[0] * tw * 0.2, mid[1] + tw * 0.25, b1[0], b1[1]); g.closePath();
    g.fillStyle = gv(0.88); g.fill(); g.strokeStyle = LINE; g.lineWidth = 1.3; g.stroke();
    g.fillStyle = LINE; g.beginPath(); g.arc(tip[0], tip[1], 1.2, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}
// A hand-shaped wing (owl units), drawn the way the source inks them: long flight feathers fanned from the arm,
// each a pointed white vane with a dark keyline on its trailing edge, under a smooth white covert band along the
// leading edge. lead: points from the shoulder to the wing tip; tips: feather tips from the wing tip back to the body.
// (Legacy form { pts, tips:[[a,b],...] } = a filled outline with separation strokes.)
function featherShape2(root, tip, w) {
  const d = V.sub(tip, root), L = Math.hypot(d[0], d[1]) || 1, u = [d[0] / L, d[1] / L], n = [-u[1], u[0]];
  const at = (f, k) => [root[0] + d[0] * f + n[0] * w * k, root[1] + d[1] * f + n[1] * w * k];
  return [at(0, -0.5), at(0.45, -0.55), at(0.82, -0.38), tip, at(0.86, 0.3), at(0.5, 0.5), at(0, 0.45)];
}
function wingS(g, W) {
  const light = W.light || [-0.6, -0.8];
  if (W.pts) {
    const path = (c) => smoothPath(c, W.pts, true);
    plumage(g, path, { base: 0.97, shade: 0.72, depth: 14, blur: 6, light });
    g.beginPath(); path(g); g.lineWidth = W.edge ?? 2.4; g.strokeStyle = LINE; g.lineJoin = "round"; g.stroke();
    for (const [a, b] of W.tips || []) ink(g, [a, V.mix(a, b, 0.5), b], 1.6, gv(0.2, 0.85), { end: 0.1 });
    return;
  }
  const { lead, tips } = W, n = tips.length;
  const leadAt = (u) => { const f = u * (lead.length - 1), i = Math.min(lead.length - 2, Math.floor(f)); return V.mix(lead[i], lead[i + 1], f - i); };
  const roots = tips.map((tp, i) => V.mix(leadAt(1 - (i + 0.35) / n * (W.reach ?? 0.85)), tp, 0.15));
  // the whole wing as one soft white shape (the vanes overlap), outline = leading edge + scalloped trailing edge
  const out = [...lead];
  for (let i = 1; i < n; i++) {
    // between two tips the edge dips back toward the arm a little (the scallop)
    const a = tips[i - 1], b = tips[i], m = V.mix(a, b, 0.5), r = V.mix(roots[i - 1], roots[i], 0.5);
    out.push(a, V.mix(m, r, W.notch ?? 0.16));
  }
  out.push(tips[n - 1], V.mix(tips[n - 1], lead[0], 0.5));
  const path = (c) => smoothPath(c, out, true, 0.35);
  plumage(g, path, { base: 0.97, shade: 0.76, depth: 12, blur: 5, light });
  // the scalloped trailing edge in dark ink (it separates the wing from the white body behind it)
  ink(g, out.slice(lead.length - 1), W.edgeW ?? 2.6, LINE, { per: 5, end: 0.3, bias: 0.4, pow: 0.3 });
  // each flight feather: its trailing-edge keyline near the tip and a faint shaft
  for (let i = n - 1; i >= 0; i--) {
    const tp = tips[i], rt = roots[i];
    const d = V.sub(tp, rt), L = Math.hypot(d[0], d[1]) || 1, u = [d[0] / L, d[1] / L];
    let nn = [-u[1], u[0]];
    const nxt = tips[Math.min(n - 1, i + 1)], side = (nxt[0] - tp[0]) * nn[0] + (nxt[1] - tp[1]) * nn[1] > 0 ? 1 : -1;
    nn = V.mul(nn, side);                       // points toward the next (inner) feather = the trailing side
    const w = Math.min(L * 0.3, W.fw ?? 30);
    const edge = [V.add(V.add(rt, V.mul(d, 0.45)), V.mul(nn, w * 0.55)), V.add(V.add(rt, V.mul(d, 0.8)), V.mul(nn, w * 0.4)), tp];
    ink(g, edge, 1.9, LINE, { end: 0.15, bias: 0.75 });
    if (i < n - 1) ink(g, [V.add(rt, V.mul(d, 0.3)), V.add(rt, V.mul(d, 0.8))], 0.8, gv(0.5, 0.45), { end: 0.1 });
    for (let k = 0; k < 3; k++) { const p0 = V.add(V.add(rt, V.mul(d, 0.5 + 0.12 * k)), V.mul(nn, w * 0.2)); flick(g, p0, u, L * 0.18, 0.7, gv(0.55, 0.35), 0.05); }
  }
  // covert band along the leading edge
  const band = [...lead];
  for (let i = lead.length - 1; i >= 0; i--) { const u = i / (lead.length - 1), k = (W.cov ?? 0.38) * (1 - 0.6 * u); const tgt = tips[Math.min(n - 1, Math.round((1 - u) * (n - 1)))]; band.push(V.mix(lead[i], tgt, k)); }
  const bp = (c) => smoothPath(c, band, true);
  plumage(g, bp, { base: 0.98, shade: 0.84, depth: 10, blur: 5, light });
  // scalloped lower edge of the coverts
  for (let i = lead.length; i < band.length - 2; i++) ink(g, [band[i], V.mix(band[i], band[i + 1], 0.5), band[i + 1]], 1.2, gv(0.35, 0.6), { end: 0.2 });
  ink(g, lead, 2.2, LINE, { end: 0.3, bias: 0.7 });
}
// Everything the kit does not draw the source's way goes in one `extra` pass (on top, in owl units):
// feet (feetS), a hand-placed bandage (bandS), darker headphone cups (cupDark).
function finish(pose) {
  const P = pose;
  P.extra = (g, geo) => {
    if (P.cupDark && geo.hp) {
      const r = P.headphones.r ?? 50;
      for (const c of geo.hp.cups) {
        if (c.z < -0.02) continue;
        g.save(); g.globalCompositeOperation = "multiply"; g.fillStyle = gv(P.cupDark);
        g.beginPath(); g.ellipse(c.x, c.y, r * 0.95 * (0.35 + (c.open ?? 0.6)), r * 1.05, geo.H.roll, 0, Math.PI * 2); g.fill(); g.restore();
      }
    }
    if (P.bandS) { const [dx, dy, size, rot] = P.bandS; drawBandage(g, { x: geo.H.x + dx, y: geo.H.y + dy, size, rot }); }
    for (const w of P.wingsS || []) wingS(g, w);
  };
  // the kit sizes its layer from its own geometry: invisible zero-toe "feet" stretch the box over the extra wings
  // (the real feet are drawn outside the layer, at blit time)
  const ext = [];
  for (const w of P.wingsS || []) for (const q of (w.pts || [...w.lead, ...w.tips])) ext.push({ x: q[0], y: q[1], size: 1, toes: 0, leg: 0 });
  P.feet = ext;
  return P;
}

// ---------------------------------------------------------------- poses (owl units; root = body centre)
// rear three-quarter (63.12–63.64): head from behind, band arching over, near cup on the right, the bandage
// (drawn by hand: the source shows it on the back of the head), right wing raised against the card edge
const REAR = (over = {}) => mergeDeep(owlPose("front", {
  head: { x: 12, y: -170, rx: 112, ry: 92, yaw: 2.72, pitch: 0.05, roll: 0.03, square: 2.1 },
  eyes: { state: "closed", r: 1 },
  beak: { w: 0.01, l: 0.01, lift: 0.1 },
  bandage: null,
  disc: 0,
  tufts: [{ at: -0.98, size: 30, width: 0.34, lean: -0.5, second: 0.5, curl: 0.25 }, { at: 0.2, size: 16, width: 0.26, lean: 0.2, second: 0.4, curl: 0.1 }],
  body: { x: -4, y: -2, a: 126, b: 128, rot: Math.PI / 2, egg: -0.2 },
  tail: { base: [-86, 70], tip: [-162, 110], w: 36, n: 3, spread: 0.12 },
  wings: [],
  // the right wing raised against the card: a broad fan (frame outline at 63.20, converted to units)
  wingsS: [{ lead: [[66, -12], [115, -79], [171, -135], [228, -198]], tips: [[228, -198], [243, -176], [230, -129], [225, -85], [209, -41], [190, 2], [159, 34], [115, 40]], light: [0.6, -0.8], fw: 30 }],
  headphones: { on: true, yaw: 2.62, dx: 0.1, dy: 0.04, lift: 1.0, r: 64, tilt: 0.05, bandR: 1.0, bandH: 1.6, cupEl: 0.0, w: 12, open: 0.5 },
  bandS: [34, -4, 64, -0.85], cupDark: 0,
  feetS: [{ x: -70, y: 150, dir: 2.3, size: 52, leg: 8, w: 0.2 }, { x: 22, y: 160, dir: 1.2, size: 52, leg: 8, w: 0.2 }],
}), over);

// front, standing (63.80–64.28), measured at 64.12: head centre (1163,525) rx 88 ry 70 px, body (1145,680)
const FRONT = (over = {}) => mergeDeep(owlPose("frontStand", {
  head: { x: 22, y: -186, rx: 107, ry: 88, yaw: -0.04, roll: 0.02 },
  tufts: [{ at: -0.86, size: 24, width: 0.3, lean: -0.25, second: 0.45, curl: 0.15 }, { at: 0.86, size: 22, width: 0.3, lean: 0.25, second: 0.45, curl: 0.15 }],
  body: { x: 4, y: -10, a: 98, b: 128, rot: Math.PI / 2, egg: -0.2 },
  eyes: { state: "wide", r: 27.5, spread: 0.46, el: -0.12, look: [-0.95, 0.1], pupil: 0.36, lid: 0.02, lidW: 0.12 },
  beak: { el: -0.3, lift: 1.1, w: 28, l: 34 },
  bandage: { az: -0.39, el: 0.875, size: 56, rot: -0.5 },
  headphones: { on: true, lift: 1.2, r: 54, tilt: 0.12, bandR: 1.18, bandH: 1.62, cupEl: 0.02, w: 11, open: 0.25 },
  wings: [{ type: "folded", layer: "front", S: [-74, -100], T: [-168, 44], width: 52, back: 22, dir: -1 }],
  feetS: [{ x: -52, y: 118, dir: 1.9, size: 50, leg: 26 }, { x: 52, y: 110, dir: 0.7, size: 50, leg: 22 }], cupDark: 0,
}), over);

// profile facing left (drawn facing right, then flipped): 65.68–67.16, measured at 66.00: head centre
// (1108,520) rx 108 px, eye (1045,520) r 22, beak tip (1000,550), cup (1130,520), body (1150,680), tail to (1310,745)
const SIDE = (over = {}) => mergeDeep(owlPose("walk", {
  light: [0.6, -0.8],
  head: { x: 50, y: -163, rx: 110, ry: 88, yaw: 1.07, pitch: 0.0, roll: 0.02, square: 2.3 },
  tufts: [{ at: -0.62, size: 30, width: 0.3, lean: -0.3, second: 0.5, curl: 0.2 }, { at: -0.95, size: 26, width: 0.3, lean: -0.5, second: 0.5, curl: 0.2 }],
  body: { x: 0, y: 0, a: 96, b: 118, rot: 1.75, egg: 0.02 },
  tail: { base: [-80, 50], tip: [-135, 85], w: 26, n: 3 },
  wings: [{ type: "folded", layer: "front", S: [-20, -92], T: [-160, 60], width: 46, back: 22, dir: -1 }],
  feetS: [{ x: 34, y: 120, dir: 0.25, size: 54, leg: 26, flat: 0.35, w: 0.2 }, { x: -20, y: 128, dir: 0.1, size: 54, leg: 22, flat: 0.35, w: 0.2 }], cupDark: 0,
  eyes: { state: "wide", r: 24, spread: 0.44, el: -0.1, look: [0.9, 0.05], pupil: 0.4, left: null, right: null },
  beak: { el: -0.32, lift: 1.12, w: 26, l: 34 },
  bandage: { az: -0.25, el: 0.8, size: 54, rot: -0.3 },
  headphones: { on: true, yaw: 1.22, dx: 0, dy: 0, lift: 1.18, r: 50, bandR: 1.18, bandH: 1.6, tilt: 0.1, open: 0.62, cupEl: 0.0, w: 12 },
  flow: [0.3, 1],
}), over);

// at the scissors (64.40–65.56), rear three-quarter facing left, eyes squeezed shut, the near wing beating at the
// blades on ones in a 4-frame cycle (low, mid, high, mid; measured wing-centroid track 64.60–65.52).
// Measured at 65.00–65.08 (placement root (990,690), s 1, flipped): head centre (930,530), beak (837,585), eye
// (890,560), cup (965,535), body to y ≈ 800, tail tip (1210,705), feet (1000,810)/(1080,800).
const WING_FLAP = [
  // low (65.08): tip (755,665)
  { lead: [[30, -100], [90, -80], [170, -50], [235, -25]], tips: [[235, -25], [222, 0], [185, 10], [145, 30], [95, 35], [50, 22]] },
  // mid (65.04): tip (755,587)
  { lead: [[80, -110], [130, -110], [190, -105], [235, -103]], tips: [[235, -103], [220, -70], [185, -20], [135, 7], [85, 10], [40, 2]] },
  // high (65.00): tip (745,532)
  { lead: [[80, -105], [130, -125], [190, -142], [245, -158]], tips: [[245, -158], [230, -130], [190, -80], [145, -40], [100, -10], [60, 0]] },
];
const FLAP = (k, over = {}) => SIDE(mergeDeep({
  head: { x: 60, y: -160, rx: 102, ry: 88, yaw: 1.2, roll: -0.04, pitch: -0.02 },
  eyes: { state: "closed", spread: 0.79, el: -0.12, r: 24 },
  beak: { el: -0.3, lift: 1.12, w: 26, l: 32 },
  bandage: null, bandS: [-6, -58, 50, -0.2],
  headphones: { yaw: 1.28, lift: 1.2, r: 46, bandH: 1.7, open: 0.6 },
  body: { x: 0, y: 0, a: 108, b: 120, rot: Math.PI / 2 + 0.1, egg: 0 },
  tail: { base: [-96, 10], tip: [-220, 14], w: 30, n: 3 },
  wings: [],
  wingsS: [WING_FLAP[k]],
  feetS: [{ x: -10, y: 106, dir: 0.25, size: 52, leg: 14, flat: 0.35, w: 0.2 }, { x: -90, y: 98, dir: 0.1, size: 52, leg: 14, flat: 0.35, w: 0.2 }],
}, over));
// the 4-frame beat from 64.60: low, mid, high, mid
const beat = (t) => [0, 1, 2, 1][((Math.round(t * 25) - Math.round(64.6 * 25)) % 4 + 4) % 4];

// the smirk (67.72–69.44), measured at 68.40: head centre (1082,480) rx 109 ry 78, body (1110,650), face turned
// to the viewer's left, heavy angry lids with the pupils slid right, the beak cocked in a smirk, left wing up
// gripping the scissors' shank, right wing bent onto the hip, feet splayed (1050,775)/(1180,790)
const HOLD = (over = {}) => mergeDeep(owlPose("frontStand", {
  head: { x: -24, y: -180, rx: 115, ry: 78, yaw: -0.25, pitch: -0.04, roll: 0.02, square: 2.3 },
  tufts: [{ at: -0.8, size: 34, width: 0.3, lean: -0.3, second: 0.55, curl: 0.25 }, { at: 0.78, size: 36, width: 0.3, lean: 0.35, second: 0.55, curl: 0.25 }],
  body: { x: -5, y: 2, a: 102, b: 120, rot: Math.PI / 2, egg: -0.2 },
  eyes: { state: "angry", r: 22, spread: 0.42, el: -0.23, look: [0.75, 0.1], pupil: 0.5, lid: 0.5, brow: 1.3 },
  beak: { el: -0.4, lift: 1.1, w: 28, l: 36, smirk: 1, open: 0.15 },
  bandage: { az: -0.42, el: 0.7, size: 52, rot: -0.55 },
  headphones: { on: true, yaw: -0.3, lift: 1.18, r: 50, tilt: 0.15, bandR: 1.18, bandH: 2.2, cupEl: 0.05, w: 12, open: 0.32 },
  tail: { base: [120, 40], tip: [160, 60], w: 26, n: 3 },
  wings: [],
  // left wing raised, its tip curled round the scissors' shank; right wing bent onto the hip (measured at 68.40)
  wingsS: [
    { lead: [[-116, -96], [-126, -91], [-162, -131], [-197, -162], [-222, -184]], tips: [[-242, -174], [-232, -141], [-207, -111], [-182, -81], [-152, -51], [-121, -40]], fw: 24, cov: 0.3 },
    { pts: [[80, -100], [120, -80], [152, -48], [166, -12], [160, 12], [138, 26], [110, 34], [92, 22], [84, -4], [76, -50]],
      tips: [[[138, 24], [124, 4]], [[112, 32], [102, 10]], [[160, 8], [140, -6]]] },
  ],
  feetS: [{ x: -61, y: 128, dir: 2.0, size: 52, leg: 24, w: 0.2 }, { x: 71, y: 138, dir: 0.9, size: 52, leg: 22, w: 0.2 }], cupDark: 0,
}), over);

// ---------------------------------------------------------------- key table
// [t, key, pose, placement, fx]  (placement = { x, y, s, flip, rot }; x/y = body centre in frame px)
const R = (x, y) => ({ x, y, s: 0.8 });
const KEYS = [
  [63.12, "rear", () => REAR(), R(1185, 674)],
  [63.16, "rear", () => REAR(), R(1197, 668)],
  [63.2, "rear", () => REAR(), R(1208, 663)],
  [63.24, "rear", () => REAR(), R(1219, 658)],
  [63.28, "rear", () => REAR(), R(1228, 654)],
  [63.32, "rear", () => REAR(), R(1237, 652)],
  [63.36, "rear", () => REAR(), R(1244, 655)],
  [63.4, "rear", () => REAR(), R(1249, 659)],
  [63.44, "rear", () => REAR(), R(1251, 660)],
  [63.68, "turn1", () => REAR({ head: { yaw: 2.3 }, headphones: { yaw: 2.2 }, wingsS: [{ lead: [[80, -40], [150, -60], [220, -70], [285, -66]], tips: [[285, -66], [270, -36], [240, -10], [200, 10], [160, 20], [115, 20]], light: [0.6, -0.8], fw: 28 }] }), { x: 1240, y: 662, s: 0.82 }],
  [63.72, "turn2", () => SIDE({ head: { yaw: 0.8, x: 40, y: -165 }, headphones: { yaw: 1.0 }, eyes: { state: "closed" }, wings: [{ type: "spread", layer: "front", S: [40, -50], Wr: [170, -40], T: [290, -30], trail: [-0.15, 0.99], len: 58, spread: 0.6, n: 5, m: 4 }] }), { x: 1240, y: 662, s: 0.85 }],
  [63.76, "turn3", () => FRONT({ head: { yaw: 0.55, x: 40 }, eyes: { look: [0.8, 0.1] }, headphones: { yaw: 0.7 } }), { x: 1215, y: 672, s: 0.82 }],
  [63.8, "front1", () => FRONT({ head: { yaw: 0.15 }, eyes: { look: [0.6, 0.1] } }), { x: 1170, y: 676, s: 0.82 }],
  [63.84, "front", () => FRONT(), { x: 1145, y: 680, s: 0.82 }],
  [64.28, "frontR", () => FRONT({ eyes: { look: [0.95, 0.05] }, head: { roll: -0.04 } }), { x: 1128, y: 668, s: 0.84 }],
  [64.32, "frontRun", () => FRONT({ eyes: { look: [-0.9, 0.1] }, wings: [
    { type: "spread", layer: "front", S: [-80, -80], Wr: [-150, -10], T: [-190, 70], trail: [0.3, 0.95], len: 50, spread: 0.5, n: 5, m: 3 },
    { type: "spread", layer: "front", S: [80, -80], Wr: [150, -10], T: [190, 70], trail: [-0.3, 0.95], len: 50, spread: 0.5, n: 5, m: 3 }] }), { x: 1080, y: 670, s: 0.86 }],
  [64.36, "run", () => SIDE({ eyes: { state: "half", look: [0.9, 0] }, wings: [{ type: "spread", layer: "front", S: [30, -60], Wr: [150, -30], T: [260, 10], trail: [-0.35, 0.94], len: 60, spread: 0.7, n: 6, m: 4 }] }), { x: 1110, y: 665, s: 0.9, flip: true }],
  [64.4, "flap1", () => FLAP(1), { x: 1010, y: 690, s: 0.97, flip: true }],
  [64.44, "flap2", () => FLAP(2), { x: 995, y: 690, s: 1, flip: true }],
  [64.52, "flap1", () => FLAP(1), { x: 990, y: 690, s: 1, flip: true }],
  ...(() => { const out = []; for (let i = 0; i < 24; i++) { const t = +(64.6 + i * 0.04).toFixed(2), k = beat(t); out.push([t, "flap" + k, () => FLAP(k), { x: 990, y: 690, s: 1, flip: true }]); } return out; })(),
  [65.56, "back1", () => SIDE({ head: { yaw: 0.9 }, eyes: { state: "closed" } }), { x: 1050, y: 660, s: 0.95, flip: true }],
  [65.6, "back2", () => SIDE({ head: { yaw: 0.9 }, eyes: { state: "closed" }, wings: [{ type: "spread", layer: "front", S: [20, -60], Wr: [60, 10], T: [110, 80], trail: [-0.6, 0.8], len: 50, spread: 0.5, n: 5, m: 3 }] }), { x: 1085, y: 668, s: 0.95, flip: true }],
  [65.64, "side", () => SIDE(), { x: 1125, y: 676, s: 0.97, flip: true }],
  [65.68, "side", () => SIDE(), { x: 1155, y: 680, s: 0.98, flip: true }],
  [66.8, "side", () => SIDE(), { x: 1165, y: 680, s: 0.99, flip: true }],
  // setup B (its own frame)
  [66.84, "sideB", () => SIDE(), { x: 1140, y: 668, s: 0.99, flip: true }],
  [67.2, "lunge1", () => SIDE({ head: { yaw: 0.9 }, eyes: { state: "wide", look: [0.9, 0] }, body: { rot: 2.2 }, wings: [{ type: "spread", layer: "front", S: [30, -60], Wr: [170, -60], T: [300, -10], trail: [-0.3, 0.95], len: 66, spread: 0.7, n: 6, m: 4 }] }), { x: 1045, y: 600, s: 0.98, flip: true, rot: 0.12 }, { blur: 12 }],
  [67.24, "lunge2", () => SIDE({ head: { yaw: 0.9 }, eyes: { state: "wide", look: [0.9, 0] }, body: { rot: 2.2 }, wings: [{ type: "spread", layer: "front", S: [30, -60], Wr: [190, -50], T: [330, -40], trail: [-0.3, 0.95], len: 66, spread: 0.7, n: 6, m: 4 }] }), { x: 1010, y: 590, s: 0.98, flip: true, rot: 0.1 }, { blur: 8 }],
  [67.28, "grab", () => SIDE({ head: { yaw: 0.55, x: 30 }, eyes: { state: "angry", look: [0.4, 0.1] }, headphones: { yaw: 0.9 }, wings: [{ type: "arm", layer: "front", S: [30, -70], Wr: [200, -40], T: [290, -110], len: 34 }] }), { x: 1000, y: 632, s: 0.98, flip: true }],
  [67.32, "pull", () => SIDE({ head: { yaw: 0.35, x: 20 }, eyes: { state: "angry", look: [0.2, 0.1] }, headphones: { yaw: 0.6 }, wings: [{ type: "arm", layer: "front", S: [30, -70], Wr: [190, -30], T: [250, -110], len: 34 }] }), { x: 1005, y: 636, s: 0.98, flip: true }, { blur: 6 }],
  [67.36, "pull2", () => HOLD({ head: { yaw: -0.1, x: -10 }, eyes: { state: "angry", look: [0.2, 0.1] }, wings: [
    { type: "arm", layer: "front", S: [-100, -84], Wr: [-170, -10], T: [-150, -110], len: 34 },
    { type: "arm", layer: "front", S: [92, -76], Wr: [150, 0], T: [90, 40], len: 32 }] }), { x: 960, y: 600, s: 0.98 }, { blur: 5 }],
  // whirl (measured 67.40–67.68): a full turn on the spot — facing right, front-left, front, back (cup left),
  // back (cup right), rear three-quarter, left profile, then front again at 67.72
  [67.4, "whirl1", () => HOLD({ head: { yaw: 0.5 }, headphones: { yaw: 0.6 }, eyes: { state: "angry", look: [0.9, 0] } }), { x: 1000, y: 612, s: 0.98 }, { blur: 3 }],
  [67.44, "whirl2", () => HOLD({ head: { yaw: -0.5 }, headphones: { yaw: -0.6 }, eyes: { state: "half" } }), { x: 1040, y: 615, s: 0.98 }, { blur: 9 }],
  [67.48, "whirl3", () => HOLD({ head: { yaw: 0.25 }, headphones: { yaw: 0.3 }, eyes: { state: "angry", look: [0.6, 0] } }), { x: 1060, y: 615, s: 0.98 }, { blur: 9 }],
  [67.52, "whirl4", () => REAR({ head: { yaw: 3.45 }, headphones: { yaw: 3.45 }, wings: [], wingsS: [], tail: null, bandS: null }), { x: 1150, y: 620, s: 0.95 }, { blur: 7 }],
  [67.6, "whirl5", () => REAR({ head: { yaw: 2.8 }, headphones: { yaw: 2.75 }, wings: [], wingsS: [], tail: null, bandS: null }), { x: 1160, y: 620, s: 0.95 }, { blur: 7 }],
  [67.64, "whirl6", () => SIDE({ head: { yaw: 2.0 }, headphones: { yaw: 1.9 }, eyes: { state: "closed" }, bandage: null }), { x: 1150, y: 630, s: 0.97, flip: true }, { blur: 6 }],
  [67.68, "whirl7", () => SIDE({ eyes: { state: "angry", look: [0.9, 0.1] } }), { x: 1110, y: 640, s: 0.98, flip: true }, { blur: 4 }],
  [67.72, "hold", () => HOLD(), { x: 1105, y: 650, s: 0.99 }],
  [67.76, "hold", () => HOLD(), { x: 1108, y: 650, s: 0.99 }],
  [67.8, "hold", () => HOLD(), { x: 1110, y: 650, s: 0.99 }],
];

export function owlAt(t) {
  let k = KEYS[0];
  for (const e of KEYS) if (t >= e[0] - 1e-6) k = e;
  const [, key, fn, place, fx = {}] = k;
  return {
    fx,
    draw(ctx, { layer }) {
      const L = layer(key + JSON.stringify(place), () => finish({ ...fn(), ...place }));
      // feet first: the kit's layer is cropped to its own geometry, and the belly overlaps the tops of the legs
      const P = finish({ ...fn(), ...place });
      if (P.feetS && P.feetS.length) {
        ctx.save(); ctx.translate(place.x, place.y); ctx.rotate(place.rot || 0); ctx.scale((place.flip ? -1 : 1) * place.s, place.s);
        if (fx.blur) ctx.globalAlpha = 0.8;
        for (const f of P.feetS) footS(ctx, f);
        ctx.restore();
      }
      if (fx.blur) {
        // horizontal motion blur: a stack of offset copies
        const n = 7;
        for (let i = 0; i < n; i++) { ctx.save(); ctx.globalAlpha = i === 0 ? 1 : 0.9 / (i + 0.6); const dx = (i / (n - 1) - 0.5) * fx.blur * 2; ctx.drawImage(L.canvas, L.x + dx, L.y, L.w, L.h); ctx.restore(); }
      } else ctx.drawImage(L.canvas, L.x, L.y, L.w, L.h);
      return L.anchors;
    },
  };
}
