// s06 hair, traced version: the measured dark hair masses (data/hair_masses.js) over a grey scalp, so the gaps
// between the locks show the scalp (left/right of the face) or the skin (over the face).
import { drawMasses } from "./ink.js";
import { MASS as HAIR_MASS, LIGHT as HAIR_LIGHT, INK as HAIR_INK } from "./data/hair.js";
import { INK as NAPE_INK, MASS as NAPE_MASS } from "./data/nape.js";
import { drawInk } from "./ink.js";
import { gv } from "./kit.js";

// the scalp / hair ground beside the face, under the locks (source: gaps ~0.6 ungraded)
const SCALP = [
  [[590, 398], [600, 362], [612, 322], [626, 286], [642, 256], [660, 232], [680, 206], [700, 189], [722, 175], [760, 150], [800, 136], [790, 200], [760, 260], [748, 300], [746, 380], [752, 440], [720, 500], [600, 500]],
  [[1300, 124], [1340, 158], [1380, 190], [1410, 215], [1440, 250], [1460, 290], [1475, 340], [1482, 400], [1484, 420], [1420, 430], [1358, 420], [1356, 380], [1345, 230], [1290, 138]],
];
export const HAIRCAL = { scalp: 0.6, blur: 0.5 };
export function drawHairT(g) {
  // what shows between the locks beside the face (scalp, ear, neck): the measured value study (data/nape.js)
  drawMasses(g, NAPE_MASS.ground, { blur: 0.8 });
  drawInk(g, NAPE_INK, { end: 5, endMin: 0.15, soft: 0.6 });
  drawMasses(g, HAIR_MASS.hair, { blur: HAIRCAL.blur });
  // the lock tips and loose strands (thin dark strokes where the locks thin out over the skin)
  drawInk(g, HAIR_INK, { end: 8, endMin: 0.08, soft: 0.5 });
  // the fine pale strands inside the locks (small gaps are filled in the mass and drawn as strokes instead)
  drawInk(g, HAIR_LIGHT, { bright: true, end: 6, endMin: 0.1, wMin: 0.5, soft: 0.5 });
}
