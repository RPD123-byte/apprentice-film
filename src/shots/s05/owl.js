// s05 owl on his right shoulder, seen from behind, in headphones (plaster on the back of its head). The drawing is the
// measured ink layer "owl" (./layers.js). owlCanvases()/OWL_BOX keep the interface s04's tail uses (body + head
// canvases over OWL_BOX; the whole owl is one layer now, the head canvas is empty).
import { inkLayer, layerBox } from "./layers.js";
const [x0, y0, x1, y1] = layerBox("owl");
export const OWL_BOX = [x0, y0, x1 - x0, y1 - y0];    // x, y, w, h (frame px)
let EMPTY = null;
export function owlCanvases() {
  if (!EMPTY) { EMPTY = document.createElement("canvas"); EMPTY.width = 1; EMPTY.height = 1; }
  return { body: inkLayer("owlA").c, head: EMPTY };     // (pass 3: the first clip's drawing, as the source to 24.00)
}
export function releaseOwl() { EMPTY = null; }
