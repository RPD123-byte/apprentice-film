// s15 owl facing the camera (44.44–45.12), pass 4: built on the owlInk preset fitted to this very segment
// (POSES.flyToward, fitted at 44.80 s; FIT_PLACE.flyToward = { x 1190, y 650, s 0.65 }).
//   44.44          a wink: viewer-right eye shut, the other tired-lidded; wings flung wide
//   44.48–44.84    running straight at the camera: glossy wide eyes, sweat drop, wings spread level, feet pumping
//   44.88          mid-turn (blurred in the source)
//   44.92–45.12    3/4: head and body turned to the viewer's right, the near wing raised back, the far wing folded on
//                  the body, the near foot planted, the far one kicked back
// Placement per frame from the head, template-tracked on the source (the eyes' midpoint and the scale relative to
// 44.80; numbers only): the preset's root sits (+22, +118) px from the eyes' midpoint at s 0.65.
import { drawOwl, owlPose } from "../../lib/owlInk.js";

// [film frame, eyes' midpoint x, y, scale vs 44.80] (matchTemplate on the source head, 0.80–1.25 scale search)
const HEAD = [
  [1111, 1091, 554, 1.03], [1112, 1127, 546, 1.025], [1113, 1154, 541, 1.025], [1114, 1172, 541, 1.0], [1115, 1182, 541, 1.0],
  [1116, 1185, 539, 1.0], [1117, 1185, 539, 1.0], [1118, 1183, 537, 1.0], [1119, 1177, 535, 1.0], [1120, 1168, 532, 1.0],
  [1121, 1168, 532, 1.0],
  // 3/4 (template from 44.96)
  [1122, 1163, 486, 0.95], [1123, 1150, 471, 1.0], [1124, 1149, 462, 1.0], [1125, 1149, 461, 1.0], [1126, 1149, 459, 1.0],
  [1127, 1149, 459, 1.0], [1128, 1149, 458, 1.0],
];
function headAt(t) {
  const f = t * 25;
  let a = HEAD[0], b = HEAD[HEAD.length - 1];
  if (f <= a[0]) return a;
  for (let i = 1; i < HEAD.length; i++) if (f <= HEAD[i][0]) { a = HEAD[i - 1]; b = HEAD[i]; break; }
  if (f >= b[0]) return b;
  const u = (f - a[0]) / (b[0] - a[0]);
  return a.map((v, k) => v + (b[k] - v) * u);
}

const FT = () => owlPose("flyToward");
// wing-tip heights (owl units, y of T for the viewer-left / viewer-right wing), from the extreme left / right points of
// the owl's white silhouette on the source, taken relative to the placed root
const TIPS = [[1111, -118, -140], [1112, -128, -143], [1114, -118, -148], [1116, -115, -146], [1118, -115, -145], [1119, -112, -140],
  [1120, -65, -109], [1121, -65, -109]];
function tipsAt(t) {
  const f = t * 25;
  let a = TIPS[0], b = TIPS[TIPS.length - 1];
  if (f <= a[0]) return a.slice(1);
  for (let i = 1; i < TIPS.length; i++) if (f <= TIPS[i][0]) { a = TIPS[i - 1]; b = TIPS[i]; break; }
  if (f >= b[0]) return b.slice(1);
  const u = (f - a[0]) / (b[0] - a[0]);
  return [a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}
// the preset's wings with their tips set to measured heights (the wrist follows at 0.6)
function tipWings(P, ly, ry) {
  return P.wings.map((w, i) => {
    const dy = (i === 0 ? ly : ry) - w.T[1];
    return { ...w, Wr: [w.Wr[0], w.Wr[1] + dy * 0.6], T: [w.T[0], w.T[1] + dy] };
  });
}
// 3/4 frames: [frame, near (left) tip x, y, far (right) tip x, y or null = folded]
const TIPS34 = [[1122, -410, -45, null], [1123, -380, -80, null], [1124, -392, -129, null], [1125, -398, -149, null],
  [1126, -397, -158, null], [1127, -397, -160, null], [1128, -397, -117, [220, -142]]];
// the level spread wings of the preset, raised or lowered a little (k in -1..1) for the flap
function flapWings(P, k) {
  return P.wings.map((w, i) => {
    const sd = i === 0 ? -1 : 1, dy = -k * 38;
    return { ...w, Wr: [w.Wr[0], w.Wr[1] + dy * 0.6], T: [w.T[0] + sd * Math.abs(k) * 6, w.T[1] + dy] };
  });
}
// running feet (planted / lifted), measured: the feet sit ~150-190 units under the root, ~60 either side
function runFeet(ph) {
  const a = Math.sin(ph * Math.PI * 2);
  return [
    { x: -64, y: 150 - 26 * Math.max(0, a), rot: 0.25, size: 44, mode: "stand", toes: 3, leg: 30 - 14 * Math.max(0, a), spread: 0.75, claw: "dark", seed: 2 },
    { x: 64, y: 150 - 26 * Math.max(0, -a), rot: -0.25, size: 44, mode: "stand", toes: 3, leg: 30 - 14 * Math.max(0, -a), spread: 0.75, claw: "dark", seed: 5 },
  ];
}

function wings34(t) {
  const f = Math.max(1122, Math.min(1128, Math.round(t * 25)));
  const r = TIPS34.find((x) => x[0] === f) || TIPS34[0];
  const [ , tx, ty, far] = r;
  // near wing (viewer-left) raised up and back, its shoulder high on the body's left
  const near = { type: "spread", style: "layered", layer: "back", S: [-140, -80], Wr: [(tx - 140) * 0.55, (ty - 80) * 0.6 - 30], T: [tx, ty], trail: [0.3, 1], len: 92, spread: 0.72, n: 7, m: 5, seed: 41 };
  // far wing: folded against the body's right side (scalloped coverts), or spread again (45.12)
  const farW = far
    ? { type: "spread", style: "layered", layer: "back", S: [40, -90], Wr: [(far[0] + 40) * 0.55, (far[1] - 90) * 0.6 - 20], T: far, trail: [-0.2, 1], len: 80, spread: 0.7, n: 7, m: 5, seed: 43 }
    : { type: "folded", style: "scallop", layer: "front", S: [0, -80], T: [80, 70], width: 66, back: 24, dir: 1, rows: 3 };
  return [near, farW];
}

// t: source time. Returns true if drawn.
export function drawOwlFront(ctx, t, o) {
  if (t < 44.42 || t > 45.14) return false;
  const h = headAt(t);
  const s = 0.65 * h[3];
  let pose, x, y, rot = 0, blur = 0;
  const P = FT();
  if (t < 44.46) {
    // the wink (44.44): viewer-right eye shut, the other under a heavy lid; beak shut; wings flung a little higher
    pose = owlPose("flyToward", {
      eyes: { right: { state: "shut" }, left: { state: "tired", lid: 0.5, droop: 0.1 } },
      beak: { open: 0.05 },
      head: { roll: -0.05 }, body: { a: 118, b: 126, y: 6, egg: 0.12 }, headphones: { bandH: 1.35 },
      wings: tipWings(P, -118, -140), feet: runFeet(0.15),
    });
    x = h[1] + 22 * h[3]; y = h[2] + 118 * h[3]; rot = -0.04;
  } else if (t < 44.86) {
    const u = (t - 44.48) / 0.04;
    const [ly, ry] = tipsAt(t);
    pose = owlPose("flyToward", { body: { a: 118, b: 126, y: 6, egg: 0.12 }, headphones: { bandH: 1.35 }, wings: tipWings(P, ly, ry), feet: runFeet(u * 0.25) });
    x = h[1] + 22 * h[3]; y = h[2] + 118 * h[3]; rot = 0.015 * Math.sin(u * 1.3);
  } else {
    // 3/4 (44.88–45.12): the head turned to the viewer's right, the body swung the same way
    const k = Math.min(1, (t - 44.86) / 0.06);
    pose = owlPose("flyToward", {
      head: { x: -46, y: -196, yaw: 0.34 * k, roll: 0.04 },
      headphones: { yaw: 0.34 * k, far: false, bandH: 1.35 },
      // (measured at 45.00: the body spans x 1010-1207, y 500-660 -> units x -229..74, y -140..106)
      body: { x: -78, y: -12, a: 128, b: 150, rot: Math.PI / 2 - 0.12 * k, egg: 0.1 },
      eyes: { state: "glossy", spread: 0.44, look: [0.1, 0.05] },
      beak: { open: 0.45 },
      sweat: null,
      wings: wings34(t),
      feet: [
        // (measured at 45.00: the near foot planted at (1035, 690), the far one kicked back at (1180, 655))
        { x: -185, y: 128, rot: 0.2, size: 46, mode: "stand", toes: 3, leg: 30, spread: 0.65, claw: "dark", seed: 2 },
        { x: 40, y: 92, rot: -1.3, size: 44, mode: "dangle", toes: 3, spread: 0.75, claw: "dark", seed: 5 },
      ],
    });
    x = h[1] + 22 * h[3] - 12; y = h[2] + 118 * h[3] + 12; rot = 0.02;
    if (t < 44.9) blur = 3;
  }
  if (blur) { ctx.save(); ctx.filter = `blur(${blur}px)`; }
  drawOwl(ctx, { ...pose, x, y, s, rot, tone: false });
  if (blur) ctx.restore();
  return true;
}
