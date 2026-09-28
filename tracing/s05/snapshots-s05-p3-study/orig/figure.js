// s05 designer layer (beanie, hair, face, pencil, back, left sleeve, chair) and his right forearm ("arm", its own layer:
// it slides with the hand). Measured ink layers (./layers.js); painters + masks keep the interface s04's tail uses.
import { paintInto, outlinePath } from "./layers.js";
export function paintFigure(P) { paintInto(P, "fig"); }
export const FIG_MASK = [outlinePath("fig")];
// s04 draws the forearm on its figure plate (box x 1140-1600) shifted by (35, -13.7); this shift brings the pose-B
// forearm close to where s05 draws it at 23.12 (x held back 28 px so the cuff stays inside s04's plate)
const SH_A = [-75, 22];
export function paintArm(P) { paintInto(P, "armB", SH_A); }
export const ARM_MASK = [outlinePath("armB", SH_A)];
