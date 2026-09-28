// s21's owl poses (units of s21/owl.js: head radius 100, origin = head centre, facing right), measured on the source
// (see fidelity/s21.md). Kept apart from the shot so a neighbouring shot (s22 continues the cutting walk in the same
// framing) can draw the same bird: import { TOP } from "./s21/poses.js" and { owlSprite } from "./s21/owl.js".
import { over } from "./owl.js";

// ---------------------------------------------------------------- owl poses (s21/owl.js units: head r = 100,
// origin = head centre, facing right). Measured on head-centred unit grids of the source (70.44, 71.20, 71.92,
// 72.00, 72.12, 72.20, 72.44, 72.92, 74.00).
// pass 2: the eye's white fuller (the lid covers less), the brow shorter toward the beak; the band ~7 px wide
// like the source's (was ~4); the head's top a little flatter (square 2.5)
export const FACE = {
  eye: { az: 0.5, el: -0.2, rx: 25, ry: 19, brow: 1.3, look: [0.9, 0.1], pupil: 0.5, open: 0, vbrow: 0.6, tilt: 0.08, reach: 1.15 },
  beak: { el: -0.4, lift: 1.16, w: 32, l: 40 },
  // the band stands up off the head in a loop (source 69.48–71.20: its apex ~10 px above the crown)
  phones: { cupAz: -0.05, cupEl: 0.1, r: 44, lit: 0, bandW: 22, bandLift: 1.1, bandH: 1.35, bandTilt: 0.2 },
  bandage: { az: -1.1, el: 0.95, size: 34, rot: 0.3 },
};
// A) walking in (70.44): head 3/4 to the right, body behind and below it, the tail out to the lower left
// (pass 2, measured on source/probe overlays at 70.44: the cup is smaller and ~3 px lower than FACE gives, the eye
// ~5 px higher)
export const WALK = {
  ...FACE,
  eye: { ...FACE.eye, el: -0.08 },
  // the band: a grey loop standing ~13 px up off the back of the head (source 70.80), not an arc over the crown
  phones: { ...FACE.phones, cupEl: -0.02, r: 38, bandSq: 0.6, bandTone: 1, bandH: 1.3 },
  // (the source's walking head is lower-topped: its crown sits 5–9 px under ours over 69.5–71.9 while eye and cup
  // line up — squashed to 0.8 in height)
  head: { yaw: 0.9, nod: 0, roll: 0.05, r: 90, bump: 12, square: 2.5, sy: 0.8 },
  shade: 0.8,
  body: { x: -45, y: 152, a: 135, b: 102, rot: 2.55, egg: 0.2 },
  tail: { base: [-150, 205], tip: [-275, 250], w: 34, n: 2 },
  // (pass 2: the source's carrying wing sweeps its feathers forward-down toward the rings — the first pass hung a
  // comb of long secondaries straight down)
  grip: { S: [-115, 62], trail: [0.5, 0.87], len: 104, nP: 6, nS: 5, fan: 0.9, secL: 0.9, cov: 0.55, pw: 0.16, sw: 0.18, pointy: 0.72, band: 0.26, aim: "upper", off: [-15, 6] },
};
// looking up (71.20): more upright, the head tipped back, the eye rolled up (the brow stays angry)
export const LOOK = over(WALK, {
  head: { yaw: 0.9, nod: -0.4, roll: -0.05 },
  body: { x: -15, y: 165, a: 128, b: 102, rot: 2.05, egg: 0.06 },
  tail: { base: [-118, 250], tip: [-205, 292], w: 42 },
  eye: { look: [0.2, -1], open: 1.2, el: -0.2, browLift: 0.5 },
  beak: { rot: -0.8 },
  // the cup stays low at the back while the head tips up (source 71.20: ~6 px lower, 4 px further forward)
  phones: { cupAz: -0.03, cupEl: -0.3, r: 40 },
  grip: { S: [-60, 110] },
});
// crouched for take-off (71.92): low and forward, the head down over the rings
export const CROUCH = over(WALK, {
  head: { yaw: 0.95, nod: 0.25, roll: 0.08 },
  body: { x: -85, y: 160, a: 142, b: 112, rot: 2.75, egg: 0.12 },
  tail: { base: [-185, 225], tip: [-290, 255], w: 46 },
  grip: { S: [-95, 95] },
  eye: { el: -0.2 },
  phones: { cupEl: 0.1, r: 44, bandSq: 1, bandTone: 0.5, bandH: 1.3 },
});
// B) flying: the body hangs under the head, legs dangle
export const FLY = over(WALK, {
  head: { yaw: 0.9, nod: 0, roll: 0, sy: 1 },
  // (pass 2: the flying body is much plumper than the first pass drew it — fitted by silhouette IoU over 72.04–72.40
  // and 72.68–72.96 with the wings and legs in place: ×1.3 long, ×1.44 wide, 28 units lower)
  body: { x: -35, y: 188, a: 146, b: 138, rot: 1.95, egg: 0.14 },
  tail: { base: [-88, 295], tip: [-188, 345], w: 40, n: 3 },
  grip: null,
  shade: 0.85,
  eye: { el: -0.14 },
  phones: { cupEl: 0.1, r: 44, bandSq: 1, bandTone: 0.3, bandH: 1.3 },
  tufts: [{ at: -0.42, size: 26, width: 0.3, lean: -0.25 }, { at: 0.95, size: 20, width: 0.26, lean: 0.2 }],
});
// C) on the header's top edge (74.00): hunched forward, the head rolled down over the blades, the back high
// pass 2: the head centre sits (+6.5, +4.9) px from the first pass's (fitted to the source's cup, eye, beak tip, head
// top and face front at 74.00); the body, tail and grip are moved back by the same amount so the silhouette stays
export const TOP = {
  ...FACE,
  head: { yaw: 1.0, nod: 0.45, roll: 0.1, r: 94, bump: 12, square: 2.4 },
  body: { x: -101, y: 108, a: 138, b: 124, rot: 2.52, egg: 0.1 },
  tail: { base: [-204, 178], tip: [-331, 186], w: 40, n: 2 },
  // the grip wing (source 73.60/74.00): long primaries fanned to the right along the lower ring, the outermost one
  // hooked into the upper ring
  // (shoulder (285, 108), wrist (336, 138), hand tip (352, 146) frame px at 74.00)
  grip: { S: [-150, 53], Wr: [-4, 140], T: [38, 160], trail: [0.2, 0.98], len: 102, nP: 7, nS: 6, fan: 0.9, tipX: 0.3, secL: 0.78, cov: 0.5, pw: 0.15, sw: 0.17, pointy: 0.75, band: 0.26 },
  // the big hooked beak angled down to the upper ring (source 74.00: from under the eye (347, 106) to the tip (356, 128))
  beak: { el: -0.336, lift: 0.66, w: 36, l: 70, rot: -0.445 },
  // (the band a thick grey arch whose top sits ~11 px over the crown: fitted to its apex (345, 47) at 74.00)
  phones: { ...FACE.phones, cupAz: -0.47, cupEl: 0.047, lit: 1, r: 50, fxMin: 0.68, bandW: 30, bandLift: 1.12, bandH: 1.15, bandTilt: -0.05 },
  shade: 0.92,
  // the source's head reads as bright as the body up here (p50 213 vs our 198 before)
  headShade: 0.95,
  eye: { ...FACE.eye, az: 0.527, el: 0.074, look: [0.2, 0.25], pupil: 0.6, tilt: -0.05 },
  // two short pointed ear tufts either side of the band (source 74.00: tips at (320, 48) and (356, 60))
  tufts: [{ at: -0.36, size: 30, width: 0.3, lean: -0.2 }, { at: 0.66, size: 22, width: 0.24, lean: 0.1 }],
};
// spread wings in flight (near = viewer-left, over the body; far = viewer-right, behind it), blended
// DOWN (0) → LEVEL (0.35) → UP (1)
export const W_UP = [
  { layer: "mid", S: [-80, 100], Wr: [-193, 22], T: [-284, -26], trail: [-0.55, 0.84], len: 135, nP: 7, nS: 5, fan: 0.9, tipX: 0.3, seed: 3 },
  { layer: "back", S: [70, 60], Wr: [152, 11], T: [214, -30], trail: [0.5, 0.87], len: 95, nP: 6, nS: 3, fan: 0.9, tipX: 0.3, seed: 7 },
];
export const W_LEVEL = [
  { layer: "mid", S: [-80, 120], Wr: [-202, 96], T: [-302, 78], trail: [-0.15, 0.99], len: 133, nP: 7, nS: 5, fan: 0.9, tipX: 0.3, seed: 3 },
  { layer: "back", S: [70, 90], Wr: [168, 83], T: [246, 75], trail: [0.15, 0.99], len: 98, nP: 6, nS: 3, fan: 0.9, tipX: 0.3, seed: 7 },
];
export const W_DOWN = [
  { layer: "mid", S: [-70, 150], Wr: [-174, 185], T: [-261, 220], trail: [0.35, 0.94], len: 126, nP: 7, nS: 5, fan: 0.9, tipX: 0.3, seed: 3 },
  { layer: "back", S: [70, 120], Wr: [168, 153], T: [250, 169], trail: [-0.25, 0.97], len: 98, nP: 6, nS: 3, fan: 0.9, tipX: 0.3, seed: 7 },
];
