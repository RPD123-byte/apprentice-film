// s22's copy of src/shots/s21/poses.js (owned by the s21 agent; copied 2026-09-25T15:26), so that s22 draws the same bird as
// s21 across the 74.52 cut without depending on another shot's module. s22 changes are marked "(s22)".
// s21's owl poses (units of s21/owl.js: head radius 100, origin = head centre, facing right), measured on the source
// (see fidelity/s21.md). Kept apart from the shot so a neighbouring shot (s22 continues the cutting walk in the same
// framing) can draw the same bird: import { TOP } from "./s21/poses.js" and { owlSprite } from "./s21/owl.js".
import { over } from "./owl21.js";

// ---------------------------------------------------------------- owl poses (s21/owl.js units: head r = 100,
// origin = head centre, facing right). Measured on head-centred unit grids of the source (70.44, 71.20, 71.92,
// 72.00, 72.12, 72.20, 72.44, 72.92, 74.00).
// pass 2: the eye's white fuller (the lid covers less), the brow shorter toward the beak; the band ~7 px wide
// like the source's (was ~4); the head's top a little flatter (square 2.5)
export const FACE = {
  // (fix pass: a narrow slit of a white under a heavy brow wedge, sunk in a grey socket — see owl.js paintEye)
  // (the brow: an arch that starts low behind the eye, peaks over its back third and falls heavily to the front
  // corner — source 70.40 at 7x: (253, 787) → (262, 784) → (272, 790))
  eye: { az: 0.5, el: -0.2, rx: 24, ry: 19, slit: 1.2, brow: 0.85, look: [0.45, 0.15], pupil: 0.5, open: 0, vbrow: 0, tilt: 0.08, reach: 1.15, browFrom: -1.3, b0y: 0.45, b1x: 0.3, b1y: 1.75, b2y: 0.05 },
  // (fix pass: a side-on hooked beak ~12 × 10 px, projecting from the face (source 71.00: root (385, 787), tip (395, 796)))
  beak: { side: true, el: -0.35, lift: 0.98, w: 32, l: 38, dir: 0.35 },
  // the band stands up off the head in a loop (source 69.48–71.20: its apex ~10 px above the crown)
  phones: { cupAz: -0.05, cupEl: 0.1, r: 44, lit: 0, bandW: 22, bandLift: 1.1, bandH: 1.35, bandTilt: 0.2 },
  bandage: { az: -1.1, el: 0.95, size: 34, rot: 0.3 },
};
// A) walking in (70.44): head 3/4 to the right, body behind and below it, the tail out to the lower left
// (pass 2, measured on source/probe overlays at 70.44: the cup is smaller and ~3 px lower than FACE gives, the eye
// ~5 px higher)
export const WALK = {
  ...FACE,
  // (fix pass: ~2–4 px lower than pass 2 put it — lmk overlays at 70.40 / 71.00 put its centre on the source's lid)
  eye: { ...FACE.eye, el: -0.17 },
  // the band: a grey loop standing ~13 px up off the back of the head (source 70.80), not an arc over the crown
  phones: { ...FACE.phones, cupEl: -0.02, r: 38, bandSq: 0.6, bandTone: 1, bandH: 1.3 },
  // (the source's walking head is lower-topped: its crown sits 5–9 px under ours over 69.5–71.9 while eye and cup
  // line up — squashed to 0.8 in height)
  head: { yaw: 0.9, nod: 0, roll: 0.05, r: 90, bump: 12, square: 2.5, sy: 0.8 },
  shade: 0.8,
  // (fix pass: fitted by silhouette IoU over 69.80–70.80 with the fan wing and the measured legs in place —
  // 0.681 → 0.703: the body stands more upright and reaches further down at the back, the tail hangs lower)
  body: { x: -45, y: 128, a: 167, b: 102, rot: 2.31, egg: 0.4 },
  tail: { base: [-157, 217], tip: [-235, 265], w: 34, n: 2 },
  // (pass 2: the source's carrying wing sweeps its feathers forward-down toward the rings — the first pass hung a
  // comb of long secondaries straight down)
  // (fix pass: a FAN of long pointed feathers, measured on a 6x crop at 70.40: shoulder (215, 815), hand tip (300, 812)
  // just inside the upper ring, lower-edge tips at (240, 843) (250, 847) (262, 845) (275, 840) (288, 830))
  // (9x crop at 70.40: shoulder (215, 815), hand tip (300, 812) just inside the upper ring, lowest back tip (230, 848),
  // the serrated lower edge 16 px under the straight tip line; secondaries point 60° down, primaries 29° up)
  grip: { type: "fan", S: [-135, 94], B: [-85, 204], sag: 55, thB: 60, thP: -29, n: 8, aim: "upper", off: [-16, -7] },
};
// looking up (71.20): more upright, the head tipped back, the eye rolled up (the brow stays angry)
export const LOOK = over(WALK, {
  head: { yaw: 0.9, nod: -0.4, roll: -0.05 },
  // (fix pass: silhouette fit over 71.20–71.60, IoU 0.756 → 0.764)
  body: { x: -15, y: 165, a: 159, b: 102, rot: 2.23, egg: 0.06 },
  tail: { base: [-118, 244], tip: [-185, 314], w: 42 },
  eye: { look: [0.3, -0.55], open: 0.9, el: -0.28, browLift: 0.5 },
  beak: { dir: 0.08 },
  // the cup stays low at the back while the head tips up (source 71.20: ~6 px lower, 4 px further forward)
  phones: { cupAz: -0.03, cupEl: -0.3, r: 40 },
  // (71.40: shoulder (330, 810), hand tip (412, 802), lowest back tip (343, 842), the lower edge 22 px under the tip line)
  grip: { S: [-113, 88], B: [-70, 195], sag: 73, thB: 55, thP: -30, off: [-15, -12] },
});
// crouched for take-off (71.92): low and forward, the head down over the rings
export const CROUCH = over(WALK, {
  head: { yaw: 0.95, nod: 0.25, roll: 0.08 },
  // (fix pass: silhouette fit over 71.84–71.96, IoU 0.658 → 0.700)
  body: { x: -85, y: 136, a: 170, b: 121, rot: 2.57, egg: 0.4 },
  tail: { base: [-222, 213], tip: [-310, 240], w: 46 },
  // (71.92: shoulder (340, 832), hand tip (422, 840) in the upper ring, lowest back tip (345, 856), sag 13 px)
  grip: { S: [-159, 107], B: [-142, 187], sag: 43, thB: 60, thP: -11, off: [-13, -10] },
  eye: { el: -0.2 },
  beak: { dir: 0.6 },
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
  // (in flight the source's eye is a slit under a heavy brow in a dark socket, 72.16–72.60)
  eye: { el: -0.14, slit: 0.55, brow: 1.7, socket: 0.5, socketA: 0.55 },
  beak: { dir: 0.5 },
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
  // (fix pass: the fan, from a 9x crop at 74.00: the leading edge from the chest (305, 108) down to the hand tip
  // (372, 151) under the lower ring, the lowest back tip (293, 151); secondaries 70° down, primaries 15°)
  grip: { type: "fan", S: [-100, 60], A: [106, 180], B: [-126, 180], sag: 30, thB: 70, thP: 15, n: 8 },
  // the big hooked beak angled down to the upper ring (source 74.00: from under the eye (347, 106) to the tip (356, 128))
  // (fix pass: drawn side-on, hooked: root under the eye, tip (356, 129) on the upper ring)
  // (source 74.00 at 7x: root under the front of the eye (349, 110), tip (356, 127) on the upper ring, ~10 px wide)
  beak: { side: true, front: true, el: -0.336, lift: 0.66, off: [6, 12], w: 25, l: 46, dir: 1.1 },
  // (the band a thick grey arch whose top sits ~11 px over the crown: fitted to its apex (345, 47) at 74.00)
  phones: { ...FACE.phones, cupAz: -0.47, cupEl: 0.047, lit: 1, r: 50, fxMin: 0.68, bandW: 30, bandLift: 1.12, bandH: 1.15, bandTilt: -0.05 },
  shade: 0.92,
  // the source's head reads as bright as the body up here (p50 213 vs our 198 before)
  headShade: 0.95,
  // (7x at 74.00: a round, open white ~12 × 9 px, the iris low in its front, the brow a short heavy wedge over its
  // front half)
  eye: { ...FACE.eye, az: 0.527, el: 0.074, look: [0.2, 0.45], pupil: 0.6, tilt: -0.05, slit: 1.0, browFrom: -0.3, reach: 1.05, brow: 1.25, b0y: 1.35, b1y: 1.1, b2y: 0.3, socketA: 0.2 },
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
