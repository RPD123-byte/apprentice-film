// s02: the owl on the cartons and in flight, drawn with the B&W owl kit (src/lib/owlInk.js).
//   sitting (hold frame): the kit's `perch`, placed on its measured eyes (s 0.70), glossy eyes; blink read frame by
//   frame (380 heavy lids, 381-389 shut, 390-391 heavy, 392 nearly open); crouch 397-404 (measured head track);
//   take-off 398-406: wings open from the sides (measured right-wing tips, mirrored); flight 405-477: the kit's
//   `flyFront` with each wing's tip set per frame from the measured silhouette extremes (owltrack.js), root / scale /
//   bank on the measured track.
import { owlLayer, owlPose, POSES } from "../../../lib/owlInk.js";
import { TIPS, TIPS_F0, OWL_ROOT, OWL_F0, WLIFT, WLIFT_F0 } from "./owltrack.js";
import { applyTone } from "./tone.js";
import { OWL_TONE } from "./tonedata.js";

// sitting placement in hold-frame px: silhouette IoU fit against the hold average (snapshots/s02-r3-lab/owlfit*.py)
export const SIT = { x: 1090, y: 272, s: 0.68 };
// perch re-proportioned to this frame's silhouette (IoU 0.86 -> 0.91 against the hold average): a lower, flatter head,
// a body fuller at the shoulders and narrower at the bottom
const SIT_HEAD = { y: -150, ry: 88, rx: 116 }, SIT_BODY = { b: 130, a: 100, egg: 0.12 };
// crouch before the jump, head track (px, hold frame), frames 397..404
const CROUCH = { 397: 10, 398: 15, 399: 19, 400: 21, 401: 19, 402: 19, 403: 13, 404: 2 };

const SIT_FEET = [{ x: -86, y: 80, rot: 0.1, size: 34, mode: "grip", toes: 3, spread: 0.6, claw: "dark", front: true, seed: 2 }, { x: 74, y: 80, rot: -0.1, size: 34, mode: "grip", toes: 3, spread: 0.6, claw: "dark", front: true, seed: 5 }];
export function sitEyes(f) {
  if (f === 380 || f === 390 || f === 400) return { state: "tired", lid: 0.62, droop: 0.05 };
  if (f === 391) return { state: "tired", lid: 0.5, droop: 0.05 };
  if (f === 392) return { state: "tired", lid: 0.25, droop: 0.05 };
  if ((f >= 381 && f <= 389) || f >= 401) return { state: "shut" };
  return { state: "glossy" };
}
const v2 = (a, b) => [a, b];
function wingFromTip(S, tip, side, k, base, arch = 0.22) {
  // T on the S->tip line (the rendered feathers overshoot T by ~20%), the wrist arched above the line, trail rotated with the wing
  const T = [S[0] + (tip[0] - S[0]) * k, S[1] + (tip[1] - S[1]) * k];
  const d = [T[0] - S[0], T[1] - S[1]], L = Math.hypot(d[0], d[1]) || 1, e = [d[0] / L, d[1] / L];
  const nUp = side < 0 ? [-e[1], e[0]] : [e[1], -e[0]];
  const Wr = [S[0] + d[0] * 0.55 + nUp[0] * L * arch, S[1] + d[1] * 0.55 + nUp[1] * L * arch];
  const th = Math.atan2(d[1], d[0]), th0 = Math.atan2(base.T[1] - base.S[1], base.T[0] - base.S[0]);
  const da = th - th0 + side * -(WT.tr || 0), c = Math.cos(da), s = Math.sin(da), tr = base.trail;
  return { ...base, S, Wr, T, trail: [tr[0] * c - tr[1] * s, tr[0] * s + tr[1] * c] };
}
const tipsAt = (f) => { const i = Math.max(0, Math.min(TIPS.length / 4 - 1, f - TIPS_F0)); return TIPS.slice(4 * i, 4 * i + 4); };
// flight wing tuning (fitted by silhouette IoU on flight frames, snapshots/s02-r3-lab/flyfit.py)
export const WT = { sy: 0, ty: 0, kL: 0.79, kR: 0.84, len: 1, arch: 0.22, tr: 0, tyL: null, tyR: null };
export const rootAt = (f) => { const i = Math.max(0, Math.min(OWL_ROOT.length / 4 - 1, f - OWL_F0)); return OWL_ROOT.slice(4 * i, 4 * i + 4); };

// the pose for frame f (sitting / take-off / flight) and its placement (in frame px of the camera the caller gives)
export function owlAt(f) {
  const FF = POSES.flyFront;
  if (f < 405) {
    // sitting on the lid: perch; from 398 the wings open from the sides as small spread wings
    // perch with this shot's measured cups (fuller, at eye level) and talons over the lid edge (hold 1015-1160, y 320-345)
    const pose = owlPose("perch", { eyes: sitEyes(f), headphones: { r: 58, open: 1.0, cupEl: -0.1 }, feet: SIT_FEET, head: SIT_HEAD, body: SIT_BODY });
    if (f >= 398) {
      const [lx, ly, rx, ry] = tipsAt(f), grow = Math.min(1, (f - 397) / 8);
      const baseL = { ...FF.wings[0], len: 40 + 80 * grow, layer: "front" }, baseR = { ...FF.wings[1], len: 38 + 70 * grow, layer: "front" };
      pose.wings = [wingFromTip([-100, -50], [lx, ly + 40], -1, 0.8, baseL), wingFromTip([100, -50], [rx, ry + 40], 1, 0.8, baseR)];
    }
    const dy = CROUCH[f] || 0;
    return { pose, place: { x: SIT.x, y: SIT.y + dy, s: SIT.s, rot: 0 }, key: `sit-${f >= 398 ? f : JSON.stringify(sitEyes(f))}` };
  }
  const [x, y, s, b] = rootAt(f);
  const [lx, ly, rx, ry] = tipsAt(f);
  // the flight headphones: both cups fuller and lower than the preset (source 17.6-19.1 s)
  const pose = owlPose("flyFront", { headphones: { yaw: 0, r: 50, open: 1.0, lift: 1.1, cupEl: -0.15 } });
  const T = WT, SL = [FF.wings[0].S[0], FF.wings[0].S[1] + T.sy], SR = [FF.wings[1].S[0], FF.wings[1].S[1] + T.sy];
  // per-frame lift of each wing's tip (units), fitted by silhouette IoU against the source frame (WLIFT, owltrack.js)
  const k = f - WLIFT_F0, dL = T.tyL ?? (k >= 0 && k < WLIFT.length / 2 ? WLIFT[2 * k] : 0), dR = T.tyR ?? (k >= 0 && k < WLIFT.length / 2 ? WLIFT[2 * k + 1] : 0);
  pose.wings = [wingFromTip(SL, [lx, ly + T.ty + dL], -1, T.kL, { ...FF.wings[0], len: FF.wings[0].len * T.len }, T.arch), wingFromTip(SR, [rx, ry + T.ty + dR], 1, T.kR, { ...FF.wings[1], len: FF.wings[1].len * T.len }, T.arch)];
  return { pose, place: { x, y, s, rot: b }, key: `fly-${f}` };
}

// cached layers: held sitting poses are built once; flight frames are built per frame (reused canvas)
const cache = new Map();
let flyCanvas = null;
export function owlLayerAt(f, ox, oy) {
  const { pose, place, key } = owlAt(f);
  const P = { ...pose, ...place, x: place.x + ox, y: place.y + oy };
  if (key.startsWith("sit-") && !key.startsWith("sit-3") && !key.startsWith("sit-4")) {
    // held sitting pose: cache in hold-frame coords and shift
    let L = cache.get(key);
    if (!L) {
      L = owlLayer({ ...pose, ...place });
      // value-study correction of the sitting owl (hold-frame coords), baked into the held layer
      if (OWL_TONE.length && !globalThis.__NOTONE) { const c = document.createElement("canvas"); c.width = L.canvas.width; c.height = L.canvas.height; c.getContext("2d", { willReadFrequently: true }).drawImage(L.canvas, 0, 0); applyTone(c, L.x, L.y, OWL_TONE, { sc: L.canvas.width / L.w }); L = { ...L, canvas: c }; }
      cache.set(key, L);
    }
    return { canvas: L.canvas, x: L.x + ox, y: L.y + oy, w: L.w, h: L.h };
  }
  if (!flyCanvas) flyCanvas = document.createElement("canvas");
  const L = owlLayer({ ...P, canvas: flyCanvas });
  return L;
}
export function releaseOwl() { cache.clear(); flyCanvas = null; }
