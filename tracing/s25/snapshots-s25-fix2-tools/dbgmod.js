import { DRAW } from "../../src/shots/s25/v2/drawings.js";
import { paintDrawing } from "../../src/shots/s25/v2/draw.js";
import { chaosHead } from "../../src/shots/s25/v2/chead.js";
export function paintChaosDrawing(key) { return paintDrawing(DRAW[key], { post: (g) => chaosHead(g, key) }); }
