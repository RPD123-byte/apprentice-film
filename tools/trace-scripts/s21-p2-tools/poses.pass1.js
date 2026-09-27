// s21's owl poses (units of s21/owl.js: head radius 100, origin = head centre, facing right), measured on the source
// (see fidelity/s21.md). Kept apart from the shot so a neighbouring shot (s22 continues the cutting walk in the same
// framing) can draw the same bird: import { TOP } from "./s21/poses.js" and { owlSprite } from "./s21/owl.js".
import { over } from "./owl.js";

// ---------------------------------------------------------------- owl poses (s21/owl.js units: head r = 100,
// origin = head centre, facing right). Measured on head-centred unit grids of the source (70.44, 71.20, 71.92,
// 72.00, 72.12, 72.20, 72.44, 72.92, 74.00).
export const FACE = {
  eye: { az: 0.5, el: -0.2, rx: 22, ry: 15, brow: 1.0, lidW: 0.24, look: [0.8, 0.15], pupil: 0.5, open: 0, outer: 0.3, inner: 0.1, vbrow: 1, tilt: 0.08 },
  beak: { el: -0.4, lift: 1.12, w: 24, l: 30 },
  phones: { cupAz: -0.05, cupEl: 0.1, r: 44, lit: 0, bandW: 13, bandLift: 1.1, bandTilt: 0.2 },
  bandage: { az: -1.1, el: 0.95, size: 34, rot: 0.3 },
};
// A) walking in (70.44): head 3/4 to the right, body behind and below it, the tail out to the lower left
export const WALK = {
  ...FACE,
  head: { yaw: 0.9, nod: 0, roll: 0.05, r: 90, bump: 12 },
  shade: 0.8,
  body: { x: -45, y: 152, a: 135, b: 102, rot: 2.55, egg: 0.2 },
  tail: { base: [-150, 205], tip: [-275, 250], w: 34, n: 2 },
  grip: { S: [-115, 62], trail: [0.22, 0.97], len: 100, nP: 5, nS: 6, fan: 1.0, secL: 1.25, cov: 0.55, pw: 0.16, sw: 0.16, pointy: 0.7, band: 0.24, aim: "upper", off: [-15, 6] },
};
// looking up (71.20): more upright, the head tipped back, the eye rolled up (the brow stays angry)
export const LOOK = over(WALK, {
  head: { yaw: 0.9, nod: -0.4, roll: -0.05 },
  body: { x: -15, y: 165, a: 128, b: 102, rot: 2.05, egg: 0.06 },
  tail: { base: [-118, 250], tip: [-205, 292], w: 42 },
  eye: { look: [0.2, -1], open: 1.2 },
  grip: { S: [-60, 110] },
});
// crouched for take-off (71.92): low and forward, the head down over the rings
export const CROUCH = over(WALK, {
  head: { yaw: 0.95, nod: 0.25, roll: 0.08 },
  body: { x: -85, y: 160, a: 142, b: 112, rot: 2.75, egg: 0.12 },
  tail: { base: [-185, 225], tip: [-290, 255], w: 46 },
  grip: { S: [-95, 95] },
});
// B) flying: the body hangs under the head, legs dangle
export const FLY = over(WALK, {
  head: { yaw: 0.9, nod: 0, roll: 0 },
  body: { x: -25, y: 160, a: 112, b: 96, rot: 1.95, egg: 0.14 },
  tail: { base: [-78, 252], tip: [-178, 305], w: 40, n: 3 },
  grip: null,
  shade: 0.85,
});
// C) on the header's top edge (74.00): hunched forward, the head rolled down over the blades, the back high
export const TOP = {
  ...FACE,
  head: { yaw: 1.0, nod: 0.45, roll: 0.1, r: 95, bump: 12 },
  body: { x: -82, y: 122, a: 138, b: 124, rot: 2.52, egg: 0.1 },
  tail: { base: [-185, 192], tip: [-312, 200], w: 40, n: 2 },
  grip: { S: [-125, 45], trail: [0.55, 0.84], len: 100, nP: 6, nS: 6, fan: 0.7, secL: 1.25, cov: 0.55, pw: 0.16, sw: 0.16, pointy: 0.7, band: 0.24, aim: "grip", off: [-25, 0] },
  phones: { ...FACE.phones, lit: 1, r: 46, bandLift: 1.18, bandTilt: -0.1 },
  shade: 0.87,
  eye: { ...FACE.eye, look: [0.8, 0.3], tilt: -0.05 },
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
