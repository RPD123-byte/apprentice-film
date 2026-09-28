// s15 owl facing the camera (44.44–45.12): the shared owlInk rig, posed from the source.
//   44.44          a wink: viewer-right eye shut, the other half-lidded; wings flung wide
//   44.48–44.84    running straight at the camera: wide stare, wings spread level, flapping a little, feet pumping
//   44.88          mid-turn (a blurred 3/4)
//   44.92–45.12    3/4: face turned to viewer's right, body swinging right, near wing raised back, far wing folded
// Placement per frame: root = measured track centre (white-blob bbox), scale from the head width measured on the
// source (175 px at 44.72 -> s 0.80, the head grows as it comes nearer).
import { drawOwl, owlPose } from "../../lib/owlInk.js";

const base = (over) => owlPose("fly", {
  head: { y: -150, rx: 108, ry: 96 },
  body: { a: 104, b: 108, y: 0 },
  eyes: { state: "wide", r: 29, spread: 0.4, look: [0, 0.05] },
  beak: { el: -0.5, lift: 1.25, w: 24, l: 30 },
  ...over,
});
const WINGS = (up, spread = 1) => [
  { type: "spread", layer: "back", S: [-86, -40], Wr: [-165, -70 - up * 60], T: [-250, -95 - up * 110], trail: [0.3, 1], len: 62, spread },
  { type: "spread", layer: "back", S: [86, -40], Wr: [165, -70 - up * 60], T: [250, -95 - up * 110], trail: [-0.3, 1], len: 62, spread },
];
const FEET = (ph) => {
  const a = Math.sin(ph * Math.PI * 2);
  return [
    { x: -40, y: 172 - 30 * Math.max(0, a), rot: 0.2, size: 24, mode: "stand", leg: 50 - 24 * Math.max(0, a), seed: 2 },
    { x: 40, y: 172 - 30 * Math.max(0, -a), rot: -0.2, size: 24, mode: "stand", leg: 50 - 24 * Math.max(0, -a), seed: 5 },
  ];
};

// t: source time. o: track row [t, cx, cy, w, h]. Returns true if drawn.
export function drawOwlFront(ctx, t, o) {
  let pose, x, y, s, rot = 0;
  const u = (t - 44.44) / 0.04;
  if (t < 44.42 || t > 45.14) return false;
  if (t < 44.46) {
    pose = base({ eyes: { state: "half", r: 27, look: [0.2, 0.1], right: { state: "closed" } }, wings: WINGS(0.25), feet: FEET(0.1) });
    x = 1084; y = 652; s = 0.7; rot = -0.06;
  } else if (t < 44.86) {
    const k = Math.sin(u * 1.7);
    pose = base({ wings: WINGS(0.12 * k), feet: FEET(u * 0.23), eyes: { state: "wide", r: 27, look: [0.05, 0.1] } });
    // track centre is the white blob (body + wings); the root sits a little below it
    // scale from the measured height of the white blob (the whole bird is ~380 units tall), root below its centre
    // (fix pass 2: the white-blob track sits ~30 px right of the head; head centre measured between the eyes at
    // 44.48 / 44.60 / 44.84 = 1117 / 1173 / 1159, head ~160 px wide -> s ~0.75)
    s = o[4] / 350; x = o[1] - 28; y = o[2] + 0.15 * o[4]; rot = 0.02 * Math.sin(u * 1.3);
  } else {
    // 3/4: head toward viewer's right, near (left) wing raised back, far wing folded in front
    const k = Math.min(1, (t - 44.86) / 0.06);
    pose = base({
      head: { y: -150, rx: 108, ry: 96, yaw: 0.3 * k, roll: 0.05 },
      headphones: { yaw: 0.3 * k },
      body: { a: 104, b: 108, y: 0, rot: Math.PI / 2 - 0.08 * k },
      eyes: { state: "wide", r: 28, look: [0.1, 0.1] },
      // (fix pass 2: the source keeps both wings spread here, the near one raised up-left, the far one level)
      wings: [
        { type: "spread", layer: "back", S: [-80, -40], Wr: [-175, -110], T: [-275, -140], trail: [0.5, 1], len: 70, spread: 0.95 },
        { type: "spread", layer: "back", S: [80, -30], Wr: [175, -40], T: [270, -40], trail: [-0.3, 1], len: 62, spread: 0.95 },
      ],
      feet: [
        { x: -62, y: 176, rot: 0.6, size: 24, mode: "stand", leg: 50, seed: 2 },
        { x: 96, y: 140, rot: -1.1, size: 24, mode: "stand", leg: 30, seed: 5 },
      ],
    });
    // (fix pass 2: measured at 44.92 / 45.04 / 45.12: eyes' midpoint (1145, 475) / (1142, 458) / (1146, 458), head
    // ~155 px wide -> s 0.72; the blob track under-reads the bird here)
    s = 0.72; x = 1140; y = t < 44.98 ? 590 : 578; rot = 0.04;
  }
  drawOwl(ctx, { ...pose, x, y, s, rot, tone: false });
  return true;
}
