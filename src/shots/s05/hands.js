// s05 hands: the left hand curled on the keys, the right hand at the trackpad (each its own layer so it can move per
// frame). Measured ink layers (./layers.js); boxes, painters and masks keep the interface s04's tail uses.
// s04's tail carries both hands on its desk plate (the right hand also shifted by its HAND0 = (35, -13.7)); the shifts
// below put them where s05 draws them at 23.12 (the right hand in its pose-B drawing, as in the source there).
import { paintInto, outlinePath } from "./layers.js";
const SH_L = [34.9, 4.4], SH_R = [-28.9, 13.1];
export const LHAND_BOX = [540, 600, 420, 340];     // x, y, w, h (frame px) of the plates s04 builds
export const RHAND_BOX = [800, 540, 480, 280];
export function paintLeftHand(P) { paintInto(P, "lh", SH_L); }
export function paintRightHand(P) { paintInto(P, "rhB", SH_R); }
export const LHAND_MASK = [outlinePath("lh", SH_L)];
export const RHAND_MASK = [outlinePath("rhB", SH_R)];
