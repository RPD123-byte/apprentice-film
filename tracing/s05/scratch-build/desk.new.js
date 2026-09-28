// s05 desk layer (desk, laptop, cables, the left speaker; the screen is drawn over it by ./screen.js). The drawing is
// the measured ink layer "desk" (./layers.js); the painter + mask keep the interface s04's tail uses.
import { paintInto, outlinePath } from "./layers.js";
// (pass 3: with the keyboard under the left hand re-drawn, s05/kbfill.js: s04's tail moves the hand over it)
export function paintDeskLayer(P) { paintInto(P, "deskK"); }
export const DESK_MASK = [outlinePath("desk")];
