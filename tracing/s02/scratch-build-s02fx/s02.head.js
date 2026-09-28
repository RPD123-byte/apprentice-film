// Shot 2 (6.04–19.12): one continuous camera.
//   6.04–10.52  the stare: a hard front close-up of the designer lit from below by the laptop; his eyes scan in small
//               flicks (measured iris track), then snap to screen-right at 8.72–8.84 and hold; three sweat beads slide.
//   10.52–14.44 the pan: the camera swings up-right off his face (he slides out bottom-left), through the dark
//               shelves, accelerating (on twos at first), and stops dead on the cartons.
//   14.44–16.52 locked on the carton stack: the owl sits on the top box; blink 15.20–15.64; the wings lift at 15.88.
//   16.00–19.12 it takes off (the feet let go of the lid at 16.20), rises, drops toward us and flies right; the camera
//               pans back down-left with it and his face slides in again from the left, still looking right. Cut 19.12.
// Camera: per-frame translation measured with chained ORB tracks (src/shots/s02/cam.js), corrected in fix pass 1 by a
// direct fit of every pan frame against the sharp stare / carton views (src/shots/s02/track.js: shift + smear + blur;
// the old track drifted up to 22 px during the arrival and 16 px late in the return). No zoom or rotation.
// Motion blur, measured per frame and per layer (track.js): the room (mosaic + the two sharp views) is blurred more than
// the characters in the source, so the room, the sitting owl and the designer are each smeared along the pan and
// softened with their own fitted values; the pan mosaic already carries the pans' blur and gets only the difference.
// Drawn from measurements of the source (scripts in src/shots/s02/trace/, README there) as vector shapes with values
// (no pixels are stored; see fidelity/s02.md for the method caveat). World coords = the 6.04 frame. Back to front:
//   the pans' world mosaic (panInk.js), the two sharp room views (roomInk.js: shelves round his head, the carton stack at
//   the hold), the sitting owl (owlInk.js) and its wings, the designer (designer2.js: faceInk.js outlines on measured
//   grounds; the stare and the look; irises per frame; sweat beads), the flying owl (owlInk.js body + wings.js per frame,
//   on the measured root track), the colour lift.
import { W, H } from "../config.js";
import { clamp, lerp, smooth } from "../lib/rng.js";
import { CAM, CAM0 } from "./s02/cam.js";
import { CAMFIX0, CAMFIX, ROOMB0, ROOMB, DESB0, DESB, OWLB0, OWLB, MOSB } from "./s02/track.js";
import { DROPS, HOODIE, BEANIE, SKIN, EYES, gv } from "./s02/designer.js";
import { paintBase, paintEyes, paintIris, DOPTS, shapeSet } from "./s02/designer2.js";
import { STARE, STARE_PAPER, BOXES, BOXES_PAPER } from "./s02/roomInk.js";
import { SIT, SIT_HALF, SIT_SHUT, FLY } from "./s02/owlInk.js";
import { PAN_OUT, PAN_BACK, PAN_X0, PAN_Y0, PAN_W, PAN_H, PAN_PAPER } from "./s02/panInk.js";
import { drawWingInk } from "./s02/wingDraw.js";
import { WING_F0 } from "./s02/wings.js";
import { sampleCurve } from "../lib/paths.js";

const frameOf = (t) => Math.floor(t * 25 + 0.5);

// ---------- camera ----------
function camRaw(f) {
  if (f < CAM0) return [0, 0];
  const i = Math.min(CAM.length / 2 - 1, f - CAM0);
  return [CAM[2 * i], CAM[2 * i + 1]];
}
function camAt(f) {
  const c = camRaw(f), k = f - CAMFIX0;
  return k >= 0 && k < CAMFIX.length / 2 ? [c[0] + CAMFIX[2 * k], c[1] + CAMFIX[2 * k + 1]] : c;
}
// the source repeats a frame here and there during the take-off and the return pan (frame diff ~1, grain only):
// 16.08 = 16.04, 17.08 = 17.04, 18.08 = 18.04, 19.08 = 19.04 — everything (camera, owl, wings) holds on them
const REPEAT = new Set([402, 427, 452, 477]);
// camera direction of travel (unit), from the last real step of the (smooth) chained track
function panDir(f) {
  for (let k = f; k > CAM0 && k > f - 4; k--) {
    const a = camRaw(k - 1), b = camRaw(k), d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d > 0.8) return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
  }
  const a = camRaw(f), b = camRaw(f + 1), d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return d > 0.8 ? [(b[0] - a[0]) / d, (b[1] - a[1]) / d] : [0, 0];
}
// per-frame rows of track.js: [L, sigma] (smear length along the pan, gaussian) for a layer; 0 outside its range
const rowAt = (T, f0, f, n) => { const k = f - f0; return k >= 0 && k < T.length / n ? T.slice(k * n, k * n + n) : null; };
