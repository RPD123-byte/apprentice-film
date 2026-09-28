// The owl's performance in s20, keyed per source frame (first frame of each drawing; a key holds until the next).
// Poses are the owl2 rig (s20/owl2.js, s20/owlposes.js). Placement = { x, y (frame px of the body centre), s, rot,
// flip }; setup A keys are in A's frame; setup B keys (≥ 66.84) are in B's own frame unless `inA` (then they are drawn
// through the room's B transform, like the carried-over stare). Positions measured on the source (cup-centre track
// and per-frame grids, snapshots/s20-fix1-ref):
//   63.12–63.64 rear view, right wing fanned against the card, sliding right with it (cup x 1300 at 63.20)
//   63.68 rear 3/4 to the right, wing out;  63.72 profile to the right, eyes shut;  63.76 3/4;  63.80 front glancing
//   right;  63.84–64.24 front, eyes left (sweat drop 63.88–64.24);  64.28 eyes right;  64.32 wings dropped;
//   64.36 running left;  64.40–65.52 at the scissors, wing beating (static head 64.60–65.40, cup x 974), backing
//   off 65.44–65.56 (cup 984 → 1031, the last flap held at 65.56);  65.60 turning;  65.64 profile, eye open;
//   65.68–65.76 settling (cup 1120 → 1147);  65.80–66.56 stare (cup 1149);  66.60–66.80 head leans back
//   (cup 1154 → 1172) and the eye rolls back;  66.84 (B) the same;  67.12–67.16 crouch;  67.20–67.24 lunge;
//   67.28 grab;  67.32 pull;  67.36 upright;  67.40–67.68 whirl;  67.72–67.76 smirk with the scissors still swinging;
//   67.80 on held.
import { FRONT, SIDE, REAR, FLAP, TURN1, TURN2, TURN3, FRONTLOOK, DROP, RUN, HOLD, merge } from "./owlposes.js";

export const OWL_CUT = 66.84;
const A = (x, y, s = 1) => ({ x, y, s });
// the flap beat from 64.60 on ones: low, mid, high, mid (65.00 = high, 65.04 = mid, 65.08 = low)
const BEAT = ["low", "mid", "high", "mid"];
const beat = (t) => BEAT[((Math.round(t * 25) - Math.round(64.6 * 25)) % 4 + 4) % 4];
// stare in profile with the head leaning back by dx (units) and the eye rolling back
const STARE = (dx = 0, look = [-0.75, -0.1]) => SIDE({ head: { x: -21 + dx }, eyes: { look } });

const KEYS = [
  // rear, sliding with the card (x from the old per-frame track + cup-track check at 63.20)
  [63.12, "rear", () => REAR(), A(1182, 681, 1.05)],
  [63.16, "rear", () => REAR(), A(1194, 675, 1.05)],
  [63.2, "rear", () => REAR(), A(1205, 670, 1.05)],
  [63.24, "rear", () => REAR(), A(1216, 665, 1.05)],
  [63.28, "rear", () => REAR(), A(1225, 661, 1.05)],
  [63.32, "rear", () => REAR(), A(1234, 659, 1.05)],
  [63.36, "rear", () => REAR(), A(1241, 662, 1.05)],
  [63.4, "rear", () => REAR(), A(1246, 666, 1.05)],
  [63.44, "rear", () => REAR(), A(1248, 667, 1.05)],
  [63.64, "rearLow", () => REAR({ wings: [{ type: "fan", lead: [[48, -24], [100, -70], [140, -110]], tips: [[150, -120], [175, -85], [186, -45], [182, -5], [160, 30], [115, 50]], fw: 20, cov: 0.34, reach: 0.95, notch: 0.3 }] }), A(1248, 667, 1.05)],
  [63.68, "turn1", () => TURN1(), A(1210, 680, 1.05)],
  [63.72, "turn2", () => TURN2(), A(1200, 680, 1.05), { blur: 7 }],
  [63.76, "turn3", () => TURN3(), A(1195, 675, 1.0)],
  [63.8, "front1", () => FRONT({ head: { yaw: 0.15, x: 20 }, eyes: { look: [0.75, -0.05] } }), A(1160, 668, 1.0)],
  [63.84, "front", () => FRONTLOOK([-0.8, -0.05]), A(1150, 660, 1.0)],
  [63.88, "frontSweat", () => FRONTLOOK([-0.8, -0.05], { sweat: [-76, 15] }), A(1150, 660, 1.0)],
  [64.24, "frontSweatR", () => FRONTLOOK([0.2, -0.05], { sweat: [-76, 15] }), A(1150, 660, 1.0)],
  [64.28, "frontR", () => FRONTLOOK([0.85, -0.05], { head: { roll: -0.04 } }), A(1140, 662, 1.0)],
  [64.32, "drop", () => DROP(), A(1105, 670, 1.05)],
  [64.36, "run", () => RUN(), A(1070, 680, 1.1), { blur: 6 }],
  [64.4, "flap-mid", () => FLAP("mid"), A(1000, 690, 1.09), { blur: 3 }],
  [64.44, "flap-high", () => FLAP("high"), A(985, 690, 1.09)],
  [64.48, "flap-mid", () => FLAP("mid"), A(1000, 690, 1.09)],
  [64.52, "flap-mid", () => FLAP("mid"), A(985, 690, 1.09)],
  ...(() => { const out = []; for (let i = 0; i < 21; i++) { const t = +(64.6 + i * 0.04).toFixed(2), k = beat(t); out.push([t, "flap-" + k, () => FLAP(k), A(980, 690, 1.09)]); } return out; })(),
  // backing off while still beating (cup 984, 1005, 1031), the last flap held at 65.56
  [65.44, "flap-" + beat(65.44), () => FLAP(beat(65.44)), A(990, 690, 1.09)],
  [65.48, "flap-" + beat(65.48), () => FLAP(beat(65.48)), A(1011, 690, 1.09)],
  [65.52, "flap-" + beat(65.52), () => FLAP(beat(65.52)), A(1037, 690, 1.09)],
  [65.6, "back1", () => FLAP("low", { head: { yaw: -1.25, pitch: -0.05 }, wings: [{ type: "fan", rootLine: [[-69, -40], [-28, 40]], lead: [[-69, -40], [-120, 10], [-150, 60]], tips: [[-150, 60], [-125, 80], [-95, 90], [-60, 88]], fw: 26, cov: 0.16, notch: 0.05 }] }), A(1070, 688, 1.09), { blur: 3 }],
  [65.64, "back2", () => STARE(0, [-0.8, -0.15]), A(1092, 684, 1.09)],
  [65.68, "stare", () => STARE(), A(1116, 680, 1.09)],
  [65.72, "stare", () => STARE(), A(1135, 680, 1.09)],
  [65.76, "stare", () => STARE(), A(1143, 680, 1.09)],
  [65.8, "stare", () => STARE(), A(1145, 680, 1.09)],
  [66.6, "stare+1", () => STARE(3), A(1145, 680, 1.09)],
  [66.64, "stare+2", () => STARE(9, [-0.6, -0.25]), A(1145, 680, 1.09)],
  [66.68, "stare+3", () => STARE(14, [-0.4, -0.35]), A(1145, 680, 1.09)],
  [66.72, "stare+4", () => STARE(18, [-0.3, -0.4]), A(1145, 680, 1.09)],
  // setup B: the same drawing through the B transform, then the lunge (measured in B's frame)
  [66.84, "stare+4", () => STARE(18, [-0.3, -0.4]), { ...A(1145, 680, 1.09), inA: true }],
  [67.12, "crouch1", () => STARE(14, [-0.5, -0.2]), { ...A(1140, 686, 1.09), inA: true, rot: -0.03 }],
  [67.16, "crouch2", () => STARE(0, [-0.85, 0]), { ...A(1115, 690, 1.09), inA: true, rot: -0.08 }, { blur: 3 }],
  [67.2, "lunge1", () => SIDE({ head: { x: -40, y: -118, yaw: -1.2 }, body: { rot: -0.1 }, eyes: { look: [-0.8, 0] }, wings: [{ type: "fan", rootLine: [[-60, -60], [-40, 20]], lead: [[-60, -60], [-150, -90], [-230, -100]], tips: [[-230, -100], [-215, -60], [-180, -30], [-140, -10], [-100, 5], [-60, 15]], fw: 26, cov: 0.16, notch: 0.05 }] }), { x: 1050, y: 645, s: 1.07, rot: -0.35 }, { blur: 10 }],
  [67.24, "lunge2", () => SIDE({ head: { x: -40, y: -118, yaw: -1.2 }, body: { rot: -0.1 }, eyes: { look: [-0.8, 0] }, wings: [{ type: "fan", rootLine: [[-60, -60], [-40, 20]], lead: [[-60, -60], [-170, -80], [-270, -80]], tips: [[-270, -80], [-255, -45], [-220, -15], [-175, 5], [-125, 15], [-75, 20]], fw: 28, cov: 0.16, notch: 0.05 }] }), { x: 975, y: 655, s: 1.07, rot: -0.3 }, { blur: 8 }],
  [67.28, "grab", () => HOLD({ head: { x: -20, y: -150, yaw: -0.55, ry: 80 }, eyes: { look: [0.8, 0.1] }, body: { rot: -0.2 }, wings: [{ type: "fan", rootLine: [[-80, -60], [-60, 20]], lead: [[-80, -60], [-150, -80], [-230, -85]], tips: [[-230, -85], [-225, -40], [-200, 0], [-160, 25], [-115, 35]], fw: 26, cov: 0.2, notch: 0.05 }] }), { x: 930, y: 650, s: 1.05, rot: -0.12 }],
  [67.32, "pull", () => HOLD({ head: { x: -15, y: -150, yaw: -0.4 }, eyes: { look: [0.8, 0.1] }, wings: [{ type: "fan", rootLine: [[-80, -60], [-60, 20]], lead: [[-80, -60], [-140, -90], [-200, -110]], tips: [[-200, -110], [-205, -70], [-185, -30], [-150, 0], [-110, 15]], fw: 26, cov: 0.2, notch: 0.05 }] }), { x: 935, y: 648, s: 1.05, rot: -0.08 }, { blur: 5 }],
  [67.36, "pull2", () => HOLD({ head: { yaw: -0.1 }, eyes: { look: [0.3, 0.1] } }), { x: 960, y: 650, s: 1.05 }, { blur: 6 }],
  // whirl (67.40–67.68): a full turn on the spot; each frame is drawn as a swept (rotational) motion blur in s20.js
  [67.4, "w1", () => SIDE({ head: { yaw: 1.3, x: 10 }, eyes: { look: [0.8, 0] }, beak: { dir: 1 }, hp: { bandYaw: 1.57, bandDx: -30 }, tufts: [{ phi: -1.18, size: 50, lean: -0.55, w: 1.3 }, { phi: -1.75, size: 40, lean: -0.35, w: 1.2 }], wings: [], tail: null }), { x: 1010, y: 620, s: 1.05 }, { spin: [1060, 480, 0.55] }],
  [67.44, "w2", () => REAR({ head: { yaw: 3.0 }, wings: [], bandS: null }), { x: 1060, y: 620, s: 1.05 }, { spin: [1060, 470, 0.9] }],
  [67.48, "w3", () => SIDE({ head: { yaw: 1.1, x: 10 }, eyes: { look: [0.8, 0] }, beak: { dir: 1 }, hp: { bandYaw: 1.57, bandDx: -30 }, tufts: [{ phi: -1.18, size: 50, lean: -0.55, w: 1.3 }], wings: [], tail: null }), { x: 1070, y: 615, s: 1.05 }, { spin: [1110, 400, 0.6] }],
  [67.52, "w4", () => REAR({ head: { yaw: 3.3 }, wings: [], bandS: null }), { x: 1150, y: 625, s: 1.02 }, { spin: [1220, 330, 0.5] }],
  [67.56, "w4", () => REAR({ head: { yaw: 3.3 }, wings: [], bandS: null }), { x: 1150, y: 625, s: 1.02 }, { spin: [1220, 330, 0.5] }],
  [67.6, "w5", () => REAR({ head: { yaw: 3.14 }, wings: [], bandS: null, hp: { cupOv: {} } }), { x: 1150, y: 630, s: 1.02 }, { spin: [1230, 330, 0.45] }],
  [67.64, "w6", () => REAR({ head: { yaw: 2.4 }, wings: [], bandS: null }), { x: 1110, y: 640, s: 1.02 }, { spin: [950, 300, 0.5] }],
  [67.68, "w7", () => STARE(0, [0.2, 0]), { x: 1100, y: 648, s: 1.05 }, { spin: [960, 420, 0.4] }],
  [67.72, "hold", () => HOLD(), { x: 1085, y: 655, s: 1.07 }],
];

export function owlAt(t) {
  let k = KEYS[0];
  for (const e of KEYS) if (t >= e[0] - 1e-6) k = e;
  const [t0, key, fn, place, fx = {}] = k;
  return { t0, key: key + "|" + JSON.stringify(place), pose: fn, place, fx, inA: !!place.inA };
}
