// s21 (69.44–74.52): the sōko page, shrunk onto the lit screen in the dark room. The owl walks in from the
// frame's left edge along the floor of the page carrying a huge pair of scissors over its shoulder, stops, looks up,
// crouches, flies up the left side of the page, lands on the header's top edge (under the rail) and starts cutting:
// a dashed line appears along the header's top edge behind the blades. Camera locked (camtrack s = 1.0000).
// All positions below are frame px measured on the source (template tracking of the head, head-centred unit grids,
// gridded zooms); see fidelity/s21.md. The owl itself is drawn by s21/owl.js.
// Round 3: the room re-lit for F1's finish-pass glow (ROOM_G, OWN_KEYS, WHOLE_KEYS), the head parts, bodies, landing
// face (LAND, SQUINT, CUP_LIT) and top-edge grip (RINGS_CUT, drawFinger) re-fitted; DBG holds measuring knobs only.
import { drawFramedPage, sokoPageCanvas, FRAMED, releaseSoko } from "../lib/sites.js";
import { V } from "../lib/owlInk.js";
import { lerp, smooth, clamp } from "../lib/rng.js";
import { owlSprite, mixPose, over, landmarks, silhouette } from "./s21/owl.js";
import { drawScissors, ringCentres, gripPoint, scissorsBox, ringPos } from "./s21/scissors.js";
import { softenCanvas, releaseSoft } from "./s21/soft.js";
import { WALK as WALK0, LOOK as LOOK0, CROUCH as CROUCH0, FLY as FLY0, TOP as TOP0, W_UP, W_LEVEL, W_DOWN } from "./s21/poses.js";

// ---------------------------------------------------------------- helpers
// keys: [[t, a, b, ...], ...] sorted by t; linear interpolation of every column
function interp(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  const n = keys.length;
  if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0;
  while (keys[i + 1][0] < t) i++;
  const a = keys[i], b = keys[i + 1], u = (t - a[0]) / (b[0] - a[0]);
  return a.slice(1).map((v, k) => v + (b[k + 1] - v) * u);
}
// smooth (cubic Hermite / Catmull-Rom) interpolation for paths
function spline(keys, t) {
  const n = keys.length;
  if (t <= keys[0][0]) return keys[0].slice(1);
  if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0;
  while (keys[i + 1][0] < t) i++;
  const p0 = keys[Math.max(0, i - 1)], p1 = keys[i], p2 = keys[i + 1], p3 = keys[Math.min(n - 1, i + 2)];
  const h = p2[0] - p1[0], u = (t - p1[0]) / h;
  const u2 = u * u, u3 = u2 * u;
  return p1.slice(1).map((v, k) => {
    const m1 = ((p2[k + 1] - p0[k + 1]) / Math.max(1e-6, p2[0] - p0[0])) * h;
    const m2 = ((p3[k + 1] - p1[k + 1]) / Math.max(1e-6, p3[0] - p1[0])) * h;
    return (2 * u3 - 3 * u2 + 1) * v + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2[k + 1] + (u3 - u2) * m2;
  });
}
// ---------------------------------------------------------------- scissors (frame px; drawn by s21/scissors.js)
// The rings sit at measured offsets from the pivot screw in the scissors' own frame (u along the handles, v across,
// both × L): carried (source 70.40/71.20), vertical in the swing (72.88: the ring holes at (272,108) / (297,103)
// round the pivot (276,60)), and cutting (hole ellipses fitted at 73.60/74.00/74.20/74.48 — they hold still relative
// to the screw: upper (−38.2, −29.3) px, 7 × 12 px hole tilted 38°; lower (−53.4, −1.7) px, 8 × 14 px tilted 15°).
// Ring 0 stays on the same side (v < 0) through the whole turn (an in-plane rotation, no flip).
const RINGS_CARRY = [{ u: 0.52, v: -0.155, rx: 0.17, ry: 0.092, rot: -0.3, t: 0.045 }, { u: 0.6, v: 0.03, rx: 0.165, ry: 0.1, rot: 0.02, t: 0.045 }];
const RINGS_SWING = [{ u: 0.453, v: -0.221, rx: 0.205, ry: 0.13, rot: 0, t: 0.05 }, { u: 0.505, v: 0.042, rx: 0.158, ry: 0.11, rot: 0, t: 0.05 }];
// (the lower loop runs on under the wing's primaries to x ≈ 337 at 74.00; the upper loop's outline is ~34 px round,
// thick on its lit left side)
// (round 3: the upper ring 4 px lower and its rim ~4 px, not 6 — pixel profiles across it at 74.00: source hole
// x 378–392 / y 120–138, right rim 393–396, top rim 115–119)
// (and bigger than pass 2 drew it: its outline is ~34–37 × 29–30 px at 73.60 / 74.00, x 316–350 / 360–397 — the
// "hole" pass 2 measured is only the part right of the wing's finger, which runs through the ring's left half)
const RINGS_CUT = [{ u: 0.63, v: -0.19, rx: 0.26, ry: 0.115, rot: -0.41, t: 0.056 }, { u: 0.546, v: 0.128, rx: 0.19, ry: 0.16, rot: 0.35, t: 0.04 }];
// The rings keep their distance from the pivot in frame px while the blades' apparent length changes (in flight
// the blades read 125–135 px, but the rings stay ~58–62 px from the screw: source 72.04, 72.20). Each set is given
// in units of its own reference length and rescaled to the current L.
const RING_LREF = { carry: 115, swing: 95, cut: 89 };
function ringsAt(t, L) {
  const S = (R, Lr) => R.map((r) => ({ ...r, u: (r.u * Lr) / L, v: (r.v * Lr) / L, rx: (r.rx * Lr) / L, ry: (r.ry * Lr) / L, t: ((r.t ?? 0.05) * Lr) / L }));
  const C = S(RINGS_CARRY, RING_LREF.carry), W = S(RINGS_SWING, RING_LREF.swing), K = S(RINGS_CUT, RING_LREF.cut);
  if (t <= 72.76) return C;
  if (t < 72.88) return C.map((r, i) => mixPose(r, W[i], smooth((t - 72.76) / 0.12)));
  if (t <= 72.96) return W;
  return W.map((r, i) => mixPose(r, K[i], smooth((t - 72.96) / 0.34)));
}

// (fix pass) while the scissors swing from vertical down to the line (73.00–73.20) the rings, read off 3x crops of
// the source (hole centres), sit up to 17 px higher than the swing → cut blend puts them: frame-px corrections for
// the upper and the lower ring [t, upper dx, dy, lower dx, dy]
const RING_FIX = [[72.94, 0, 0, 0, 0], [73.0, -12, -9, -12, -9], [73.04, -3, -5, -1, -7], [73.08, 0, -13, 1, 0], [73.12, -1, -16, -1, -5], [73.16, -4, -3, -5, 0], [73.22, 0, 0, 0, 0]];
function ringFix(sc, t) {
  if (t <= 72.94 || t >= 73.22) return sc;
  const [ux, uy, lx, ly] = interp(RING_FIX, t);
  const c = sc.rings.map((r) => ringPos(sc, r)), up = c[0][1] <= c[1][1] ? 0 : 1;
  return { ...sc, rings: sc.rings.map((r, i) => ({ ...r, dx: i === up ? ux : lx, dy: i === up ? uy : ly })) };
}

// below "down" (u < 0, to −1): the wing swung on down about the shoulder by up to 0.45 rad (the source's deepest
// down-strokes, e.g. 72.36, hang ~35° below level)
const rotAbout = (p, c, a) => V.add(c, V.rot(V.sub(p, c), a));
const W_DEEP = W_DOWN.map((w, i) => { const a = i === 0 ? -0.45 : 0.45; return { ...w, Wr: rotAbout(w.Wr, w.S, a), T: rotAbout(w.T, w.S, a), trail: V.rot(w.trail, a) }; });
// (fix pass: the feathers' chord ×1.1 — the source's spread wings are shorter and broader than pass 2's, about the
// same area; kFar folds the far wing in as it lands)
function wingsAt(uNear, uFar, k = 1, kFar = 1) {
  const at = (u, i) => (u < 0 ? mixPose(W_DOWN[i], W_DEEP[i], -u) : u < 0.35 ? mixPose(W_DOWN[i], W_LEVEL[i], u / 0.35) : mixPose(W_LEVEL[i], W_UP[i], (u - 0.35) / 0.65));
  const sc = (w, kk) => { const o = { ...w, pw: 0.165, sw: 0.21 }; return kk === 1 ? o : { ...o, Wr: V.add(w.S, V.mul(V.sub(w.Wr, w.S), kk)), T: V.add(w.S, V.mul(V.sub(w.T, w.S), kk)), len: w.len * kk }; };
  return [sc(at(uNear, 0), k), sc(at(uFar, 1), k * kFar)];
}

// ---------------------------------------------------------------- measured motion (frame px)
// A) walk: the tracked head point moves at 246 px/s (template track 69.56–70.84, (205, 790) at 70.20), bobbing
// 2.5 px once per step (0.165 s). The head centre sits (+3, −1.5) px from the tracked point.
// (pass 2: bob re-fitted to the scissors screw tracked frame by frame 69.52–70.80: period 0.170 s, lowest at 69.649,
// ±2.0 px — rms 1.2 px against 1.7 with the first pass's 0.165 s, which drifted out of phase by 70.1)
const WALK_HEAD = (t) => [205 + 246 * (Math.min(t, 70.845) - 70.2), 790 + 2.0 * Math.cos((2 * Math.PI * (t - 69.649)) / 0.17)];
// hold / look up / crouch (tracked head): [t, x, y]
// the owl's head CENTRE on the floor, template-matched frame by frame (head template from 70.44, score 0.6–0.84);
// y keeps the step bob of the tracked point. Walking it lags the linear track by ~6 px at 69.96–70.20.
const WALK_CX = [[69.44, 20], [69.56, 49], [69.64, 69], [69.72, 91], [69.8, 109], [69.88, 130], [69.96, 145], [70.04, 163], [70.12, 182], [70.2, 203], [70.28, 225],
  [70.36, 245], [70.44, 266], [70.52, 288], [70.6, 308], [70.68, 328], [70.76, 347], [70.845, 366]];
const HOLD_CENTRE = [[70.845, 366, 788.5], [70.92, 367, 786], [71.08, 364, 783.5], [71.64, 364, 783.5], [71.72, 376, 791], [71.8, 387, 800], [71.98, 388, 800]];
const HOLD_HEAD = [[70.845, 364, 790], [70.92, 366, 787], [71.04, 365, 783], [71.64, 365, 783], [71.72, 377, 790], [71.8, 388, 796], [71.98, 390, 795]];
// scissors while walking/holding: [t, dx, dy (pivot − tracked head), ang − π, open, L]
const SC_WALK = [[69.44, -9, 15.5, 0.46, 0.18, 114], [70.8, -9.5, 16.5, 0.44, 0.18, 115], [70.92, -9, 19, 0.37, 0.18, 117], [71.04, -7, 18, 0.3, 0.2, 118], [71.64, -7, 18, 0.3, 0.2, 118],
  [71.76, -15, 14.5, 0.72, 0.2, 120], [71.98, -15, 14.5, 0.75, 0.2, 120]];
// B) flight: tracked head point (template track + the head-centre offset checked on 4x grids at 72.16 / 72.40)
const FLY_HEAD = [
  [71.98, 390, 795], [72.0, 395, 790], [72.04, 415, 729], [72.08, 426, 679], [72.12, 433, 632], [72.16, 427, 587], [72.2, 417, 547], [72.24, 399, 516],
  [72.28, 370, 479], [72.32, 336, 443], [72.36, 308, 411], [72.4, 282, 381], [72.44, 260, 344], [72.48, 238, 306], [72.52, 233, 253],
  [72.56, 230, 213], [72.6, 236, 153], [72.64, 230, 96], [72.68, 235, 63], [72.72, 237, 52], [72.76, 240, 44], [72.8, 237, 48], [72.84, 240, 50], [72.92, 240, 64], [73.0, 240, 76], [73.04, 244, 84],
];
// the head CENTRE in flight (template match of the head at 72.44, offset to the centre on unit grids at 72.12, 72.44,
// 72.60–72.84; 72.80 read by eye)
const FLY_CENTRE = [
  [71.98, 388, 800], [72.0, 390, 790], [72.04, 403, 736], [72.08, 417, 686], [72.12, 424, 635], [72.16, 420, 585], [72.2, 411, 544], [72.24, 393, 513],
  [72.28, 367, 478], [72.32, 331, 441], [72.36, 304, 410], [72.4, 279, 382], [72.44, 253, 349], [72.48, 233, 308], [72.52, 226, 261], [72.56, 220, 215],
  [72.6, 221, 157], [72.64, 222, 114], [72.68, 227, 79], [72.72, 231, 56], [72.76, 233, 40], [72.8, 236, 44], [72.84, 233, 38], [72.92, 243, 63], [73.0, 247, 74], [73.04, 250, 80],
];
// wing position per source frame, near (viewer-left) and far wing separately (1 = up in a V, 0.35 = level,
// 0 = down), read frame by frame 72.00–73.00 on head-centred crops
const WING_KEYS = [[71.96, 0.7, 0.8], [72.0, 0.9, 0.6], [72.04, 0.2, 0], [72.08, 0.3, 0.25], [72.12, 1, 1], [72.16, 0.2, 0.1], [72.2, 0, 0.1], [72.24, 0.1, 0],
  [72.28, 0.3, 0.7], [72.32, 0.6, 0.9], [72.36, 0, 0.3], [72.4, 0.25, 0.35], [72.44, 0.85, 1], [72.48, 0.1, 0], [72.52, 0.35, 0.35], [72.56, 1, 0.9],
  [72.6, 0.4, 0], [72.64, 0.1, -1], [72.68, 0.5, 0.1], [72.72, 0.9, 0.9], [72.76, 0.8, 0.3], [72.8, 0.4, 0.1], [72.84, 0.9, 0.6], [72.88, 1, 1],
  [72.92, 1, 0.8], [72.96, 0.95, 0.95], [73.0, 0.8, 0.5]];
// (fix pass: 72.64 is the source's deep down-stroke — the far wing's tip droops to (317, 225); the far wing
// state −1 = W_DEEP, IoU 0.61 → 0.64)
// (pass 2: 15 of these re-fitted by silhouette — our head/body/tail/scissors outline plus each candidate wing state,
// IoU against the source's owl mask (the room margins demand brighter pixels, so the owl's halo there is not taken
// for owl), adopted where it gained ≥ 0.02. From 72.4 the spread wings grow to 1.12× by 72.68, fitted the same way.)
// (fix pass: the growth now fades out again by 72.72 — the ×1.12 made the spread wings 24–34 px too wide in the top
// margin at 72.7–73.0, while at 72.52–72.64 the source's wings are as long as pass 2 fitted them: IoU 0.75 → 0.67
// at 72.60 without it)
const WING_GROW = (t) => 1 + 0.12 * smooth((t - 72.4) / 0.2) * (1 - smooth((t - 72.62) / 0.1));
// the far wing folds in as it comes down onto the edge (source 73.00: its tip at x 347, not spread)
const FAR_FOLD = (t) => 1 - 0.25 * smooth((t - 72.94) / 0.08);
// scissors in flight: [t, pivot x, pivot y, ang, open, L] — the pivot from a rotated-template search (score 0.8–0.9,
// 72.00–72.76); blade angle and length from the blade tips on 2–3.2× crops (72.40 π+0.49 / 136 px, 72.44 128 px
// 72.52 π+0.55 / 125, 72.60 π+0.64, 72.64 π+0.69 / 125); 72.80–73.00 (the swing to vertical) read on 4–6x crops:
// the handles' neck and the ring holes (72.88: holes (272,108) / (297,103), the blades vertical), the screw ~12 px
// up the blades from the neck
const SC_FLY = [[71.98, 368, 814, Math.PI + 0.72, 0.2, 118], [72.0, 376, 808, Math.PI + 0.66, 0.19, 120], [72.04, 392, 759, Math.PI + 0.56, 0.18, 125],
  [72.08, 406, 709, Math.PI + 0.52, 0.17, 127], [72.12, 414, 658, Math.PI + 0.48, 0.17, 129], [72.16, 412, 610, Math.PI + 0.45, 0.16, 130], [72.2, 405, 569, Math.PI + 0.44, 0.16, 131],
  [72.24, 386, 537, Math.PI + 0.43, 0.16, 132], [72.28, 362, 502, Math.PI + 0.42, 0.16, 133], [72.32, 324, 465, Math.PI + 0.42, 0.16, 134], [72.36, 301, 436, Math.PI + 0.42, 0.16, 135],
  [72.4, 272, 405, Math.PI + 0.46, 0.2, 135], [72.44, 245, 371, Math.PI + 0.45, 0.17, 128], [72.48, 225, 331, Math.PI + 0.48, 0.17, 122], [72.52, 217, 283, Math.PI + 0.55, 0.16, 125],
  [72.56, 209, 237, Math.PI + 0.6, 0.18, 123], [72.6, 209, 183, Math.PI + 0.64, 0.2, 121], [72.64, 210, 137, Math.PI + 0.69, 0.19, 125], [72.68, 214, 100, Math.PI + 0.68, 0.17, 122],
  [72.72, 219, 78, Math.PI + 0.64, 0.15, 118], [72.76, 222, 60, Math.PI + 0.64, 0.14, 115], [72.8, 237, 48, Math.PI + 0.92, 0.05, 110], [72.84, 256, 52, Math.PI + 1.25, 0.04, 104],
  [72.88, 276, 60, 1.5 * Math.PI, 0.03, 100], [72.92, 289, 72, 1.5 * Math.PI + 0.02, 0.03, 98], [72.96, 288, 75, 1.5 * Math.PI + 0.05, 0.03, 96], [73.0, 307, 113, 1.5 * Math.PI + 0.32, 0.12, 112]];
// C) on the top edge: the head centre = the near headphone cup + (20.5, 4) (template-tracked cup, 73.08–74.48; the
// cup holds y = 81 while it walks) [t, x, y]
const TOP_CENTRE = [[73.0, 247, 74], [73.08, 252, 90], [73.16, 252, 89], [73.2, 256.5, 86], [73.24, 264.5, 84], [73.28, 271.5, 84], [73.32, 276.5, 84], [73.36, 279.5, 85],
  [73.56, 282.5, 85], [73.6, 287.5, 85], [73.68, 296.5, 85], [73.76, 305.5, 85], [73.84, 315.5, 85], [73.92, 327.5, 85], [73.96, 327.5, 85], [74.0, 332.5, 85],
  [74.08, 343.5, 85], [74.16, 352.5, 85], [74.24, 363.5, 85], [74.32, 375.5, 85], [74.4, 388.5, 85], [74.48, 400.5, 85], [74.52, 406, 85]];
// scissors on the top edge: [t, pivot x, pivot y, ang, L]. From 73.24 the pivot SCREW is tracked frame by frame with
// a rotated template centred on it (score 0.91–1.0; the first pass had tracked the flange ~13 px behind it). 73.00–
// 73.20, while the scissors swing down (the template slid along the blades there), read on 2.5x crops and value maps:
// the handles' neck, the screw ~12 px up the blades from it, the tips (73.00: neck (303, 124), rings at y 136–168).
const SC_TOP = [[73.0, 307, 113, -1.25, 112], [73.04, 323, 110, -1.04, 106], [73.08, 335, 89, -0.91, 96], [73.12, 339, 93, -0.91, 94], [73.16, 355, 87, -0.76, 92],
  [73.2, 358, 91, -0.47, 90], [73.24, 372, 114, -0.2, 89], [73.28, 374, 136, 0.02, 89], [73.32, 372, 150, 0.228, 89], [73.36, 372, 156, 0.288, 89],
  [73.44, 372, 156, 0.288, 89], [73.48, 371, 157, 0.288, 89], [73.52, 370, 160, 0.318, 89], [73.56, 369, 161, 0.348, 89], [73.6, 375, 162, 0.348, 89],
  [73.64, 379, 162, 0.348, 89], [73.68, 386, 159, 0.318, 89], [73.72, 392, 156, 0.288, 89], [73.76, 398, 156, 0.288, 89], [73.8, 402, 156, 0.288, 89],
  [73.84, 408, 155, 0.288, 89], [73.88, 414, 156, 0.288, 89], [73.92, 419, 157, 0.288, 89], [73.96, 419, 157, 0.288, 89], [74.0, 421, 158, 0.318, 89],
  [74.04, 425, 161, 0.348, 89], [74.08, 430, 161, 0.348, 89], [74.12, 434, 161, 0.348, 89], [74.16, 439, 161, 0.348, 89], [74.2, 449, 158, 0.29, 89],
  [74.24, 456, 156, 0.288, 89], [74.28, 462, 155, 0.288, 89], [74.32, 468, 156, 0.288, 89], [74.36, 475, 156, 0.288, 89], [74.4, 481, 157, 0.288, 89],
  [74.44, 486, 158, 0.318, 89], [74.48, 488, 160, 0.348, 89], [74.52, 494, 159, 0.33, 89]];
// the snip: the angle between the blades, from the two blades' centres 60 px out along the axis (rad): a slow cut,
// closed at 73.56–73.64 and 74.08–74.16, wide open (0.41) at 73.84 and 74.34 — ~0.52 s a cut
const SNIP = [[72.84, 0.03], [72.96, 0.03], [73.04, 0.2], [73.16, 0.15], [73.28, 0.25], [73.32, 0.275], [73.36, 0.31], [73.4, 0.32], [73.44, 0.325], [73.48, 0.28],
  [73.52, 0.175], [73.56, 0.03], [73.64, 0.03], [73.68, 0.195], [73.72, 0.31], [73.76, 0.37], [73.8, 0.4], [73.84, 0.41], [73.88, 0.4], [73.92, 0.32],
  [73.96, 0.33], [74.0, 0.23], [74.04, 0.12], [74.08, 0.03], [74.16, 0.03], [74.2, 0.25], [74.24, 0.33], [74.28, 0.39], [74.32, 0.42], [74.36, 0.42],
  [74.4, 0.375], [74.44, 0.29], [74.48, 0.17], [74.52, 0.1]];

// ---------------------------------------------------------------- legs
// Walking on the floor (fix pass): each foot's plants are read off the source frame by frame — the toes' bright blob
// on the floor (threshold 125 on a σ1 grey, y 878–889) gives where each foot stands and from when to when; the
// swinging foot's blob (y 862–878) gives the swing. The source's gait is hand-timed, not periodic: stances of
// 0.08–0.2 s, swings of 0.12–0.24 s, one foot always in the air, reaching 10–15 px ahead of the head and lifted
// ~16 px with its toes up. [tLand, tLift, toe x] per plant; F1 = the near foot (k 0), F2 = the far one.
const GROUND = 883;
const PLANTS = [
  [[-1e9, 69.59, 5], [69.8, 70.01, 116], [70.18, 70.335, 208], [70.47, 70.645, 283.5], [70.83, 1e9, 354]],
  [[-1e9, 69.4, -16], [69.59, 69.815, 67], [70.0, 70.19, 150], [70.34, 70.43, 235], [70.66, 70.86, 336], [71.0, 1e9, 368]],
];
// the toe blob's centre sits this far ahead of the leg's foot point (calibrated on our own render with the same
// blob measure)
const TOE_DX = 2;
function walkFoot(t, k) {
  const P = PLANTS[k];
  for (let i = 0; i < P.length; i++) {
    const [t0, t1, x] = P[i];
    if (t >= t0 && t <= t1) return { x: x - TOE_DX, lift: 0, up: 0 };
    const nx = P[i + 1];
    if (nx && t > t1 && t < nx[0]) {
      const u = (t - t1) / (nx[0] - t1), e = 1 - Math.pow(1 - u, 2.4);
      const sn = Math.pow(Math.sin(Math.PI * u), 0.6);
      return { x: lerp(x, nx[2], e) - TOE_DX, lift: sn, up: Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.15)), 0.5) };
    }
  }
  return { x: P[P.length - 1][2] - TOE_DX, lift: 0, up: 0 };
}
const SWING_LIFT = 9;

// feet on the header's top edge (frame x; lift 0..1), read frame by frame 73.04–74.48: after landing at ~200 / 265
// the owl steps off at 73.54; each foot swings ~0.1–0.2 s and lands ~75 px further on
const TOP_FEET = [
  [[73.0, 200, 0], [73.54, 200, 0], [73.61, 226, 1], [73.68, 252, 0], [74.06, 252, 0], [74.16, 292, 1], [74.26, 330, 0], [74.52, 330, 0]],
  [[73.0, 265, 0], [73.72, 265, 0], [73.81, 292, 1], [73.9, 318, 0], [74.22, 320, 0], [74.32, 358, 1], [74.42, 395, 0], [74.52, 395, 0]],
];

// the cup's extra drop while the owl turns in the corner (source 72.92: the cup centre ~7 px lower and 3 px further
// back than the flight pose puts it; back on the pose by 73.2) [t, dAz, dEl]
const CUP_SHIFT = [[72.8, 0, 0], [72.88, -0.12, -0.2], [72.92, -0.14, -0.24], [73.0, -0.1, -0.16], [73.2, 0, 0]];
function cupShift(ph, t) {
  const [da, de] = interp(CUP_SHIFT, t);
  return da || de ? { ...ph, cupAz: (ph.cupAz ?? 0) + da, cupEl: (ph.cupEl ?? 0) + de } : ph;
}

const NOD_UP = 0.3, YAW_UP = 0.4;
// (round 3: head-window NCC fit over 73.04–73.16, 0.83 → 0.87: the landing head 10 % wider, 20 % taller and 4 px
// higher; its face bulges ~6 px further forward with the beak tucked into it, the crease eye 5 px lower than the nod
// put the open eye — from gridded 9x crops at 73.04 / 73.20)
const LAND = { sx: 1.1, sy: 1.2, off: [4, -12], bump: 20, eyeEl: -0.3, eyeAz: 0.05, beakShrink: 0.6, cupAz: 0.3, cupEl: 0.275 };
// the cup comes into the light as the owl turns in the corner (source: dark at 72.88, mid-grey at 72.96, lit from 73.04;
// round 3 — it used to pop back to dark at 73.02 and ramp up again with the settle)
const CUP_LIT = (t) => smooth((t - 72.86) / 0.16);
// the eye screws shut as it turns in the corner and stays shut while it lands (source: a dark scrunched blot at 72.88,
// a thin crease from 72.92 to 73.20, open again, scowling, by 73.28)
const SQUINT = (t) => interp([[72.86, 0], [72.92, 1], [73.19, 1], [73.27, 0]], t)[0];
const LAND_BODY = (t) => interp([[72.98, 0], [73.04, 70], [73.16, 70], [73.24, 40], [73.32, 0]], t)[0];
const LAND_UP = (t) => interp([[72.99, 0], [73.07, 1], [73.18, 1], [73.27, 0]], t)[0];
function owlState(t) {
  // (the measuring harness may override pose fields: DBG.pose = { WALK: {...}, ... })
  const O = DBG.pose || {}, WALK = over(WALK0, O.WALK), LOOK = over(LOOK0, O.LOOK), CROUCH = over(CROUCH0, O.CROUCH), FLY = over(FLY0, O.FLY), TOP = over(TOP0, O.TOP);
  if (t < 71.98) {
    // A) walking in, stopping, looking up, crouching
    const walking = t < 70.845;
    const T = walking ? WALK_HEAD(t) : interp(HOLD_HEAD, t);
    const s = 0.30;
    const [hx, hy0] = walking ? [spline(WALK_CX, t)[0], T[1] - 1.5] : interp(HOLD_CENTRE, t);
    // the head dips ~4 px as it pulls up (source crown 70.84–70.96; the scissors screw does not dip)
    const dip = interp([[70.76, 0], [70.84, 4], [70.96, 4], [71.06, 0]], t)[0], hy = hy0 + dip;
    const lookUp = smooth((t - 70.96) / 0.12) * (1 - smooth((t - 71.66) / 0.1));
    const crouch = smooth((t - 71.66) / 0.2);
    let pose = mixPose(WALK, LOOK, lookUp);
    pose = mixPose(pose, CROUCH, crouch);
    const [dx, dy, a, open, L] = interp(SC_WALK, t);
    const sc = { x: hx + dx - 3, y: hy0 + dy + 1.5, ang: Math.PI + a, L, open, rings: ringsAt(t, L) };
    // feet (frame px): planted-foot walk, then both feet set down side by side
    const hips = [[-85, 238], [-30, 245]];
    const feet = [0, 1].map((k) => {
      const w = walkFoot(t, k), fx = w.x, fy = GROUND - SWING_LIFT * w.lift;
      return { hip: hips[k], foot: [(fx - hx) / s, (fy - hy) / s], lift: 0, toeUp: w.up, far: k === 1 };
    });
    // (pass 2: thicker legs and bigger feet, as the source draws them while it walks and stands)
    // (fix pass: thinner — the source's tarsus is ~4 px, its toes long and spread)
    pose = { ...pose, legs: feet.map((f) => ({ ...f, toe: 44, w: 13, thigh: 42 })) };
    return { pose, x: hx, y: hy, s, sc };
  }
  if (t < 73.02) {
    // B) take-off and flight up the left side
    const T = spline(FLY_HEAD, t);
    const s = lerp(0.3, 0.33, smooth((t - 72.0) / 0.9));
    const [hx, hy] = spline(FLY_CENTRE, t);
    const takeoff = smooth((t - 71.98) / 0.1);
    let pose = mixPose(over(CROUCH, { grip: null }), FLY, takeoff);
    // the head bobs toward profile at 72.84 (the cup slides to the middle of the head), then back
    const yaw = 0.9 + 0.35 * Math.sin(Math.PI * clamp((t - 72.78) / 0.14));
    pose = { ...pose, eye: { ...pose.eye, squint: SQUINT(t), farVis: SQUINT(t) > 0.02 ? 1.1 : pose.eye.farVis }, head: { ...pose.head, yaw }, wings: wingsAt(...interp(WING_KEYS, t), WING_GROW(t), FAR_FOLD(t)), phones: cupShift({ ...pose.phones, lit: CUP_LIT(t) }, t) };
    const [px, py, a, open, L] = interp(SC_FLY, t);
    const sc = ringFix({ x: px, y: py, ang: a, L, open, rings: ringsAt(t, L) }, t);
    const land = smooth((t - 72.84) / 0.14), ground = 1 - smooth((t - 71.99) / 0.07);
    const legs = [0, 1].map((k) => {
      const planted = [(walkFoot(71.98, k).x - hx) / s, (GROUND - hy) / s];
      // (pass 2: the source's flying legs are short and thick, the feet tucked ~10 px higher under the plumper body)
      const dangle = [lerp(k ? 20 : -60, k ? 65 : -120, land), lerp(lerp(362, 330, smooth((t - 72.3) / 0.3)), 345, land)];
      const air = 1 - ground;
      return { hip: [k ? -25 : -75, lerp(245, 280, air)], foot: V.mix(dangle, planted, ground), toe: 34, w: lerp(16, 21, air), thigh: lerp(40, 56, air), lift: 0, curl: (1 - land) * (1 - ground), far: k === 1 };
    });
    pose.legs = legs;
    return { pose, x: hx, y: hy, s, sc };
  }
  // C) landed on the header's top edge; the scissors come down onto the line; it walks right, cutting
  const s = 0.34;
  const walking = t > 73.52;
  const settle = smooth((t - 73.02) / 0.3);
  // (pass 2: TOP's head centre is (+6.5, +4.9) px from the cup-tracked track; it settles in with the pose)
  const H0 = interp(TOP_CENTRE, t), H = [H0[0] - 3 + 6.5 * settle, H0[1] + 4.9 * settle];
  let pose = mixPose(over(FLY, { grip: TOP.grip }), TOP, settle);
  // (fix pass) while it lands and swings the scissors down (73.02–73.22) the source's face turns UP toward the
  // blades: the eye sits ~10 px further forward and 7 px higher than the settling pose puts it, the beak ~13 px right
  // and 14 px up, and the eye is squeezed to a slit (lmk overlays at 73.04–73.20)
  // (only the face features move — the cups and band stay: the eye slides forward round the head and up, the beak
  // forward and up, pointing more level)
  // (round 3: the eye is screwed shut to a thin "\" crease there, and the head reads bigger and further forward —
  // its front edge ~12 px right of ours at 73.04 — fitted as LAND below)
  { const k = LAND_UP(t), L = over(LAND, DBG.pose?.LAND); if (k) pose = { ...pose, head: { ...pose.head, sx: lerp(pose.head.sx ?? 1, L.sx, k), sy: lerp(pose.head.sy ?? 1, pose.head.sy * L.sy, k), off: V.add(pose.head.off || [0, 0], V.mul(L.off, k)), bump: (pose.head.bump ?? 9) + L.bump * k },
    eye: { ...pose.eye, az: (pose.eye.az ?? 0.5) - YAW_UP * k + L.eyeAz * k, el: (pose.eye.el ?? 0) + (NOD_UP + L.eyeEl + (pose.head.nod ?? 0)) * k, slit: lerp(pose.eye.slit ?? 1, 0.35, k) },
    beak: { ...pose.beak, az: (pose.beak.az ?? 0) + YAW_UP * k, el: (pose.beak.el ?? 0) + NOD_UP * k, dir: (pose.beak.dir ?? 0) - 0.5 * k, shrink: L.beakShrink * k },
    phones: { ...pose.phones, cupAz: (pose.phones.cupAz ?? 0) + L.cupAz * k, cupEl: (pose.phones.cupEl ?? 0) + L.cupEl * k } }; }
  // the body and tail settle faster than the head (source 73.04–73.20: already the slim standing body with the long
  // tail out to the left; the plump flying body would bulge at the lower left)
  {
    const kb = smooth((t - 73.0) / 0.1), B = mixPose(FLY.body, TOP.body, kb), T = mixPose(FLY.tail, TOP.tail, kb);
    // (TOP's body is placed relative to the fully shifted head centre; while the head is still settling, carry the
    // body the rest of the way so it stands where it will stand)
    // (fix pass: while it lands the source's owl is compact and upright — its back and tail stand ~24 px further
    // right than the settling pose puts them (silhouette fits at 73.04–73.24: +40…+70 units), easing out by 73.3)
    const ox = (6.5 * (1 - settle)) / s + LAND_BODY(t), oy = (4.9 * (1 - settle)) / s;
    pose = { ...pose, body: { ...B, x: B.x + ox * kb, y: B.y + oy * kb }, tail: { ...T, base: V.add(T.base, [ox * kb, oy * kb]), tip: V.add(T.tip, [ox * kb, oy * kb]) } };
  }
  // while the scissors swing down (73.02–73.4) the grip wing reaches for the lower ring (source 73.04–73.20: the
  // primaries wrapped round it in front of the chest), then settles into the cutting wing
  pose = { ...pose, eye: { ...pose.eye, squint: SQUINT(t), farVis: SQUINT(t) > 0.02 ? 1.1 : pose.eye.farVis }, wings: [], phones: cupShift({ ...pose.phones, lit: Math.max(pose.phones.lit ?? 0, CUP_LIT(t)) }, t), gripAim: 1 - smooth((t - 73.22) / 0.22), grip: { ...pose.grip, aim: "lower", off: [10, -20] } };
  const [px, py, a0, L] = interp(SC_TOP, t);
  // (fix pass: from 73.3 the far, lower blade is foreshortened to 0.86 L — its tip lands at 75–80 px from the screw in
  // the source, and over the newest dash — the blades open ~0.06 rad less and ride 0.025 rad lower than pass 2 drew)
  const cut = smooth((t - 73.26) / 0.1);
  const open = Math.max(Math.min(0.03, interp(SNIP, t)[0]), interp(SNIP, t)[0] - 0.06 * cut);
  // the tracked angle is biased ~0.04 low while the blades are wide open (the template straddles both blades)
  const sc = ringFix({ x: px, y: py, ang: a0 + 0.1 * interp(SNIP, t)[0] + 0.025 * cut, L, open, farK: lerp(1, 0.86, cut), rings: ringsAt(t, L) }, t);
  const legs = [0, 1].map((k) => {
    const [fx, lift] = interp(TOP_FEET[k], t);
    return { hip: [(k ? -60 : -175) - 19 * settle, 235 - 14.4 * settle], foot: [(fx - H[0]) / s, (184 - 8 * lift - H[1]) / s], toe: 40, w: 17, thigh: 44, lift: lift * 0.6, far: k === 1 };
  });
  pose.legs = legs;
  return { pose, x: H[0], y: H[1], s, sc, finger: smooth((t - 73.24) / 0.12) };
}

// ---------------------------------------------------------------- the dashed cut line along the header's top edge
// capsules 15 × 5 px every 20.67 px from x 192, centred on y 186 (measured 73.56–74.48); they appear from 73.56, whole,
// up to ~42 px behind the lower blade's tip
// how many dashes are cut, per source frame (counted on the source: a dash is whole and bright with a dark gap after
// it; the blade hides the newest ones now and then, so the count is the running maximum) — 19 at 74.52 where s22
// takes over
const DASH_N = [[73.56, 11], [73.68, 13], [73.88, 14], [74.04, 15], [74.16, 16], [74.4, 17], [74.48, 18], [74.52, 19]];
function dashCount(t) { let n = 0; for (const [k, v] of DASH_N) if (t >= k - 1e-6) n = v; return n; }
function drawDashes(g, t) {
  const n = dashCount(t);
  if (!n) return;
  g.save();
  g.fillStyle = "#e9e9e4";
  // capsules 15 × 5 px every 20.706 px from x 192, centred on y 185.5 (the same line s22 continues)
  for (let i = 0; i < n; i++) { const x0 = 192 + i * 20.706; g.beginPath(); g.roundRect(x0, 183.0, 14.5, 5, 2.5); g.fill(); }
  g.restore();
}

// ---------------------------------------------------------------- the grip wing's finger through the upper ring
// (round 3) on the top edge the source's grip wing puts its outermost primary THROUGH the upper ring: a white pointed
// feather ~7 px wide entering over the ring's upper-left rim and curling down to the ring's bottom (73.60 at 8x: from
// (312, 125) over (325, 131) to the tip (333, 148), round the ring whose outline spans x 316–350, y 118–147). Placed in
// frame px from the upper ring's centre; a = 0..1 fades it in as the scissors come down onto the line.
function drawFinger(g, sc, a) {
  const C = ringCentres(sc)[0];
  const P = (dx, dy) => [C[0] + dx, C[1] + dy];
  const spine = [P(-26, -9), P(-16, -4), P(-9, 3), P(-4, 10), P(-1, 16)];
  const wf = (u) => 4.6 * (1 - Math.pow(u, 1.8)) + 0.3;
  g.save(); g.globalAlpha = a; g.lineJoin = "round";
  // outline, then the white body of the feather
  const L = [], R = [];
  for (let i = 0; i < spine.length; i++) {
    const p = spine[i], q = spine[Math.min(spine.length - 1, i + 1)], o = spine[Math.max(0, i - 1)];
    const d = V.nrm(V.sub(q, o)), n = [-d[1], d[0]], w = wf(i / (spine.length - 1));
    L.push(V.add(p, V.mul(n, w))); R.push(V.sub(p, V.mul(n, w)));
  }
  const shape = [...L, ...R.reverse()];
  g.beginPath(); g.moveTo(shape[0][0], shape[0][1]); for (const p of shape.slice(1)) g.lineTo(p[0], p[1]); g.closePath();
  g.fillStyle = "rgb(222,222,218)"; g.fill();
  g.strokeStyle = "rgba(60,60,60,0.75)"; g.lineWidth = 0.9; g.stroke();
  // the shaft: a faint grey line down its middle
  g.strokeStyle = "rgba(120,120,118,0.5)"; g.lineWidth = 0.6;
  g.beginPath(); g.moveTo(spine[0][0], spine[0][1]); for (const p of spine.slice(1, 4)) g.lineTo(p[0], p[1]); g.stroke();
  g.restore();
}

// ---------------------------------------------------------------- the owl sprite (owl + scissors, one per frame)
let owlCanvas = null;
// the pose with the grip wing (if any) resolved into a front wing reaching the scissors' rings
function withGrip(st) {
  const pose = st.pose;
  const wings = [...(pose.wings || [])];
  if (pose.grip) {
    // the near wing reaches forward and wraps its primaries round the scissors' grip
    const g = pose.grip;
    const rcs = ringCentres(st.sc);
    const gp = g.aim === "upper" ? rcs[0] : g.aim === "lower" ? rcs[1] : gripPoint(st.sc);
    // the outermost primary's tip lands on the aim point (+ off): pull the hand back by the feather length
    const aim = V.add([(gp[0] - st.x) / st.s, (gp[1] - st.y) / st.s], g.off || [0, 0]);
    const hand = V.nrm(V.sub(aim, g.S)), reach = g.len * (0.84 + (g.tipX ?? 0.25));
    const T = V.sub(aim, V.mul(hand, reach * 0.92));
    const Wr = V.add(V.mix(g.S, T, 0.55), [0, 6]);
    // (a pose may instead give the wrist and hand tip directly, in units; pose.gripAim 0..1 blends those toward the
    // aimed reach — while the scissors swing down onto the line the wing follows the rings)
    const k = pose.gripAim ?? 0;
    if (g.type === "fan") wings.push({ ...g, layer: "front", A: g.A ? V.mix(g.A, aim, k) : aim });
    else wings.push(g.T ? { ...g, layer: "front", Wr: V.mix(g.Wr, Wr, k), T: V.mix(g.T, T, k) } : { ...g, layer: "front", Wr, T });
  }
  return { ...pose, wings };
}
function buildOwl(st) {
  // (fix pass: every canvas this shot reads back or composites is opened CPU-backed (willReadFrequently) before
  // anything draws on it — a canvas first opened plainly and then read with getImageData every frame can be moved
  // from GPU to CPU raster mid-run, which changed the owl's anti-aliasing with render history)
  if (!owlCanvas) { owlCanvas = document.createElement("canvas"); owlCanvas.getContext("2d", { willReadFrequently: true }); }
  const pose = withGrip(st);
  const B = owlSprite(pose, { x: st.x, y: st.y, s: st.s, res: 2, canvas: owlCanvas, extent: scissorsBox(st.sc), mid: (g) => { drawScissors(g, st.sc); if (st.finger > 0.01) drawFinger(g, st.sc, st.finger); } });
  // the source's owl is soft: a σ 0.6 frame-px gaussian over the finished sprite (premultiplied; fine-band energy
  // inside the owl: 1.35× the source's unsoftened, 0.86× at σ 0.7)
  softenCanvas(B.canvas, SOFT * 2);
  return B;
}
let OWL_BRIGHT = 1;
// The owl's brightness multiplier, per source frame: the ratio of the source's to our median owl value (inside
// both owl masks, eroded), measured on a 10 fps pass with the first pass's factors in place and folded into them.
// The source's owl is 3–7 % brighter than ours through most of the shot, ~12 % while it walks in along the dark
// lower-left edge, and up to ~20 % up in the vignetted top-left corner (72.7–73.3). Whites clip, so the brightest
// corner parts still stay a little under the source.
// (fix pass: the top edge 73.24–74.52 raised to 1.16 — the body there was 6–7 levels darker than the source's, and
// the heavier mottle and belly shade of this pass darken it a little more)
const GAIN = [[69.44, 1.13], [69.94, 1.13], [70.06, 1.05], [70.94, 1.04], [71.1, 1.07], [71.68, 1.07], [71.8, 1.03], [72.46, 1.03], [72.54, 1.08],
  [72.62, 1.08], [72.74, 1.18], [72.84, 1.16], [72.94, 1.2], [73.14, 1.19], [73.24, 1.17], [73.34, 1.16], [73.44, 1.16], [74.52, 1.16]];
// (round 3: ×1.025 — with the room re-lit, the owl's median value inside both masks was 4 levels under the source's
// (161 / 165); now 163 / 163, p90 210 / 212)
function owlGain(t) { return interp(GAIN, t)[0] * 1.025 * (DBG.gainK ?? 1); }
const SOFT = 0.6;
// (multiplicative, so the dark accents stay dark)
const blitOwl = (g, B) => {
  if (OWL_BRIGHT !== 1) g.filter = `brightness(${OWL_BRIGHT.toFixed(3)})`;
  g.drawImage(B.canvas, B.x, B.y, B.w, B.h);
  if (OWL_BRIGHT !== 1) g.filter = "none";
};

// ---------------------------------------------------------------- the owl's own light in the margins
// The source lights the room around the owl even where it stands outside the screen (the top margin at 72.6–74.5 is
// brighter around it than drawFramedPage's screen glow gives). Same recipe as sites.js addScreenGlow (8× shrink,
// blurred at 1/8 scale, ×4.5, capped at 120, added outside the screen through a σ10 mask), fed with only the owl's
// pixels outside the screen, and drawn UNDER the owl's outside copy.
let OG = null;
function blurGrey(src, w, h, sigma) {
  const n = 3, wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let wl = Math.floor(wIdeal); if (wl % 2 === 0) wl--;
  const wu = wl + 2, m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
  let cur = Float32Array.from(src), tmp = new Float32Array(w * h);
  const box = (inp, out, r, horiz) => {
    const len = horiz ? w : h, lines = horiz ? h : w, stride = horiz ? 1 : w, k = 1 / (2 * r + 1);
    for (let l = 0; l < lines; l++) {
      const base = horiz ? l * w : l;
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += inp[base + Math.min(len - 1, Math.max(0, i)) * stride];
      for (let i = 0; i < len; i++) {
        out[base + i * stride] = acc * k;
        acc += inp[base + Math.min(len - 1, i + r + 1) * stride] - inp[base + Math.max(0, i - r) * stride];
      }
    }
  };
  for (let i = 0; i < n; i++) { const r = ((i < m ? wl : wu) - 1) / 2; box(cur, tmp, r, true); box(tmp, cur, r, false); }
  return cur;
}
function owlGlow(ctx, paint, gain, mixNear = 0.3, whole = false) {
  const W = ctx.canvas.width, H = ctx.canvas.height, sw = Math.round(W / 8), sh = Math.round(H / 8);
  const S = FRAMED.screen, G = FRAMED.glowRect;
  if (!OG) {
    const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; c.getContext("2d", { willReadFrequently: true }); return c; };
    OG = { full: mk(W, H), h2: mk(Math.round(W / 2), Math.round(H / 2)), h4: mk(Math.round(W / 4), Math.round(H / 4)), small: mk(sw, sh), up: mk(W, H), mask: mk(W, H) };
    const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
    const Phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
    const fx = new Float32Array(W), fy = new Float32Array(H);
    for (let x = 0; x < W; x++) fx[x] = Phi((x + 0.5 - G.x0) / 10) - Phi((x + 0.5 - G.x1) / 10);
    for (let y = 0; y < H; y++) fy[y] = Phi((y + 0.5 - G.y0) / 10) - Phi((y + 0.5 - (G.y1 + 60)) / 10);
    const m = OG.mask.getContext("2d"), id = m.createImageData(W, H), d = id.data;
    for (let y = 0, i = 3; y < H; y++) for (let x = 0; x < W; x++, i += 4) d[i] = Math.round(255 * (1 - fx[x] * fy[y]));
    m.putImageData(id, 0, 0);
  }
  const f = OG.full.getContext("2d");
  f.setTransform(1, 0, 0, 1, 0, 0); f.clearRect(0, 0, W, H);
  f.save(); if (!whole) { f.beginPath(); f.rect(0, 0, W, H); f.rect(S.x0, S.y0, S.x1 - S.x0, S.y1 - S.y0); f.clip("evenodd"); } paint(f); f.restore();
  const half = (dst, src) => { const g = dst.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, dst.width, dst.height); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "low"; g.drawImage(src, 0, 0, dst.width, dst.height); };
  half(OG.h2, OG.full); half(OG.h4, OG.h2);
  const sg = OG.small.getContext("2d", { willReadFrequently: true });
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.clearRect(0, 0, sw, sh); sg.imageSmoothingEnabled = true; sg.imageSmoothingQuality = "low"; sg.drawImage(OG.h4, 0, 0, sw, sh);
  const img = sg.getImageData(0, 0, sw, sh), d = img.data, grey = new Float32Array(sw * sh);
  let any = 0;
  for (let i = 0, j = 0; j < grey.length; i += 4, j++) { grey[j] = (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) * (d[i + 3] / 255); any += grey[j]; }
  if (any < 1) return;
  const a = blurGrey(grey, sw, sh, 7), b = blurGrey(grey, sw, sh, 26);
  for (let i = 0, j = 0; j < grey.length; i += 4, j++) { const v = Math.min(120, (mixNear * a[j] + (1 - mixNear) * b[j]) * 4.5 * gain); d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
  sg.putImageData(img, 0, 0);
  const u = OG.up.getContext("2d");
  u.setTransform(1, 0, 0, 1, 0, 0); u.globalCompositeOperation = "copy"; u.imageSmoothingEnabled = true; u.imageSmoothingQuality = "low";
  u.drawImage(OG.small, 0, 0, W, H);
  u.globalCompositeOperation = "destination-in"; u.drawImage(OG.mask, 0, 0); u.globalCompositeOperation = "source-over";
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "lighter"; ctx.drawImage(OG.up, 0, 0); ctx.restore();
}

// the screen's border line and the left rivet (drawFramedPage's, drawn here so the owl can pass in front of them)
function drawBorder(ctx) {
  const S = FRAMED.screen;
  ctx.save();
  ctx.strokeStyle = "rgba(62,64,62,0.62)"; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(S.x0, S.y1 + 2); ctx.lineTo(S.x0, S.y0); ctx.lineTo(S.x1, S.y0); ctx.lineTo(S.x1, S.y1 + 2); ctx.stroke();
  ctx.restore();
}
function drawRivet(g) { g.fillStyle = "rgba(200,202,200,0.8)"; g.beginPath(); g.arc(147.5, 154.5, 3.3, 0, Math.PI * 2); g.fill(); }

// ---------------------------------------------------------------- the room's light, recalibrated
// (round 3) F1's screen glow is now the source's finish-pass formula; with it, the room margins came out 2–4 levels
// brighter than the source's everywhere (post-grade, medians over all 127 frames of the shot), 2× too bright in the
// dark top-right corner. A smooth multiplicative gain outside the screen corrects that: knots = source / render
// median ratio (σ14) at these frame-px points, iterated on our own render; bilinear between knots, applied through the
// same σ10 soft mask of glowRect as the glow itself (inside the screen: 1).
const ROOM_XK = [0, 40, 90, 128, 300, 600, 900, 1200, 1500, 1800, 1950, 2040, 2080, 2130, 2206];
const ROOM_YK = [0, 30, 70, 112, 200, 350, 500, 650, 800, 946];
const ROOM_G = [
  [0.831, 0.835, 0.838, 0.875, 0.914, 0.895, 0.878, 0.793, 0.738, 0.782, 0.578, 0.501, 0.459, 0.426, 0.416],
  [0.83, 0.834, 0.846, 0.888, 0.911, 0.91, 0.894, 0.802, 0.766, 0.787, 0.615, 0.517, 0.446, 0.458, 0.4],
  [0.822, 0.829, 0.884, 0.911, 0.926, 0.923, 0.913, 0.892, 0.848, 0.846, 0.764, 0.574, 0.5, 0.449, 0.46],
  [0.825, 0.853, 0.916, 0.938, 0.929, 0.925, 0.897, 0.901, 0.88, 0.887, 0.784, 0.65, 0.573, 0.478, 0.445],
  [0.875, 0.88, 0.931, 0.923, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.763, 0.739, 0.558, 0.494],
  [0.886, 0.905, 0.924, 0.902, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.727, 0.767, 0.742, 0.726],
  [0.903, 0.924, 0.928, 0.892, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.868, 0.889, 0.827, 0.797],
  [0.915, 0.939, 0.957, 0.916, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.882, 0.9, 0.845, 0.825],
  [0.909, 0.923, 0.959, 0.937, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.749, 0.8, 0.808, 0.712],
  [0.905, 0.928, 0.925, 0.902, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.706, 0.763, 0.706, 0.7],
];
function roomGainAt(x, y) {
  const seg = (K, v) => { let i = 0; while (i < K.length - 2 && v > K[i + 1]) i++; return [i, Math.max(0, Math.min(1, (v - K[i]) / (K[i + 1] - K[i])))]; };
  const [i, u] = seg(ROOM_XK, x), [j, w] = seg(ROOM_YK, y);
  const a = ROOM_G[j][i], b = ROOM_G[j][i + 1], c = ROOM_G[j + 1][i], d = ROOM_G[j + 1][i + 1];
  return (a * (1 - u) + b * u) * (1 - w) + (c * (1 - u) + d * u) * w;
}
let ROOMGAIN = null;
function roomGain(W, H) {
  if (ROOMGAIN) return ROOMGAIN;
  const S = FRAMED.glowRect;
  const erf = (x) => { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
  const Phi = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
  ROOMGAIN = document.createElement("canvas"); ROOMGAIN.width = W; ROOMGAIN.height = H;
  const g = ROOMGAIN.getContext("2d", { willReadFrequently: true }), id = g.createImageData(W, H), d = id.data;
  const fx = new Float32Array(W);
  for (let x = 0; x < W; x++) fx[x] = Phi((x + 0.5 - S.x0) / 10) - Phi((x + 0.5 - S.x1) / 10);
  for (let y = 0; y < H; y++) {
    const fy = Phi((y + 0.5 - S.y0) / 10) - Phi((y + 0.5 - (S.y1 + 60)) / 10);
    for (let x = 0; x < W; x++) {
      const out = 1 - fx[x] * fy, i = (y * W + x) * 4;
      const v = out < 0.002 ? 255 : Math.round(255 * (1 - out * (1 - roomGainAt(x, y))));
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
  }
  g.putImageData(id, 0, 0);
  return ROOMGAIN;
}

// The owl's own light in the margins (round 3, refitted on F1's finish-pass glow). Per source frame, a non-negative
// least-squares fit over the margins (the owl itself masked out) of two responses: the glow of the owl's parts
// OUTSIDE the screen (it walks in across the left margin, flies up past it, stands in the top margin) and a weak
// glow of the whole owl; each series smoothed over 5 samples (0.2 s). Walking in 69.6–70.4 the lower-left margin was
// 3–10 levels dark without it; on the top edge the top margin 2–3 dark.
const OWN_KEYS = [[69.44, 0.003], [69.6, 0.02], [69.76, 0.063], [69.92, 0.125], [70.08, 0.186], [70.24, 0.11], [70.4, 0.053], [70.56, 0], [72.16, 0], [72.32, 0.079],
  [72.48, 0.147], [72.64, 0.167], [72.72, 0.15], [72.96, 0.15], [73.12, 0.18], [73.28, 0.18], [73.44, 0.144], [73.6, 0.126], [73.76, 0.12], [73.92, 0.127],
  [74.08, 0.112], [74.24, 0.111], [74.4, 0.11]];
// (72.72–73.28 set by hand between the fit, which wants ~0.06 there, and the owl's own near halo, which the source
// shows brighter: 0.10 left the owl region 1–3 levels dark, 0.26 lit the 30 px ring round it 6–8 levels too bright)
const WHOLE_KEYS = [[69.44, 0.014], [69.6, 0.01], [69.76, 0.017], [69.92, 0.031], [70.08, 0.034], [70.24, 0.041], [70.4, 0.012], [70.56, 0], [71.52, 0], [71.68, 0.014],
  [71.84, 0.029], [72.0, 0.031], [72.16, 0.023], [72.32, 0.018], [72.48, 0.007], [72.64, 0.007], [72.8, 0], [73.28, 0.006], [73.44, 0.031], [73.6, 0.041],
  [73.76, 0.048], [73.92, 0.044], [74.08, 0.055], [74.24, 0.061], [74.4, 0.062]];
// measuring knobs (the film never changes them; the scratch harness does)
export const DBG = { own: 1, whole: 1, gain: 1, glow: 1 };
// The source's frame grid: its film time snapped to the 25 fps frame it shows. A few source frames repeat the one
// before apart from the grain (found by differencing blurred frames: 69.48 = 69.44, 69.96 = 69.92, 70.96 = 70.92,
// 72.96 = 72.92, 73.40 = 73.44 = 73.36, 73.96 = 73.92); those draw the same state (the one the tracks were measured on).
const REPEAT = { 1736: 1737, 1748: 1749, 1774: 1773, 1824: 1823, 1835: 1834, 1836: 1834, 1849: 1848 };
function srcFrame(t0) {
  let F = Math.ceil(t0 * 25 - 1e-6);
  if (REPEAT[F]) F = REPEAT[F];
  return F / 25;
}

// measuring aid (not used by the film): frame-px landmarks of the owl and the scissors at film time t
export function probe(t0) {
  const t = srcFrame(t0), st = owlState(t);
  return { t, s: st.s, ...landmarks(st.pose, st), pivot: [st.sc.x, st.sc.y], ang: st.sc.ang, L: st.sc.L, open: st.sc.open, rings: ringCentres(st.sc) };
}

// measuring aid: the owl's outline polygons at film time t, optionally with the flight wings forced to states
// (uNear, uFar) — for fitting the wing keys to the source silhouette
export function probeShape(t0, uNear, uFar, k = 1, bo = null) {
  const t = srcFrame(t0), st = owlState(t);
  let pose = uNear == null ? withGrip(st) : { ...withGrip(st), wings: [...wingsAt(uNear, uFar, k), ...withGrip(st).wings.filter((w) => w.layer === "front")] };
  if (bo) { const B = pose.body; pose = { ...pose, body: { ...B, x: B.x + bo[0], y: B.y + bo[1], a: B.a * bo[2], b: B.b * bo[3], rot: B.rot + (bo[4] || 0), egg: (B.egg || 0) + (bo[7] || 0) } }; }
  // bo[5], bo[6]: the tail's tip moved (units); bo[8], bo[9]: its base moved
  if (bo && pose.tail) { const T = pose.tail; pose = { ...pose, tail: { ...T, tip: V.add(T.tip, [bo[5] || 0, bo[6] || 0]), base: V.add(T.base, [bo[8] || 0, bo[9] || 0]) } }; }
  return { t, ...silhouette(pose, st), pivot: [st.sc.x, st.sc.y], ang: st.sc.ang, L: st.sc.L, rings: ringCentres(st.sc) };
}

export const shot = {
  draw(ctx, local, t0) {
    // the owl moves on the source's 25 fps frames: between frames it holds the next one (the film renders at 25 fps,
    // so this only matters for off-grid previews, which then pair with the same source frame compare.sh shows)
    const t = srcFrame(t0);
    const page = sokoPageCanvas({ gaze: "down" });
    const st = owlState(t);
    const B = buildOwl(st);
    OWL_BRIGHT = owlGain(t);
    drawFramedPage(ctx, page, { glow: DBG.glow, border: false, over: (g) => { drawRivet(g); drawDashes(g, t); blitOwl(g, B); } });
    drawBorder(ctx);
    if (DBG.gain) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "multiply"; ctx.drawImage(roomGain(ctx.canvas.width, ctx.canvas.height), 0, 0); ctx.restore(); }
    const og = DBG.ownConst ?? DBG.own * interp(OWN_KEYS, t)[0];
    if (og > 0.003) owlGlow(ctx, (g) => blitOwl(g, B), og, DBG.mixNear ?? 0.3);
    const ow = DBG.wholeConst ?? DBG.whole * interp(WHOLE_KEYS, t)[0];
    if (ow > 0.003) owlGlow(ctx, (g) => blitOwl(g, B), ow, 0.3, true);
    // the parts of the owl outside the screen (the frame's left margin, the top margin), over the border line and
    // the room light: clipped to everything but the screen shrunk by 2 px, so the border hairline is covered too
    const S = FRAMED.screen;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.rect(S.x0 + 2, S.y0 + 2, S.x1 - S.x0 - 4, S.y1 - S.y0 - 2); ctx.clip("evenodd");
    blitOwl(ctx, B);
    ctx.restore();
  },
  release() { owlCanvas = null; OG = null; ROOMGAIN = null; releaseSoft(); releaseSoko(); },
};
