// s18 shot B plates (55.28–57.28): the extreme close-up of the synth keys.
//   background (never moves): black wall, the lit slatted panel, the dark box, the striped box with its round knob
//   keyboard (tips away at the end): knob row, black keys, lit white keys, dark front panel, the left cheek block
// Both are outline traces of the source (trace/README.md): traceBbg.js = the static background (the owl-free,
// keyboard-free plate assembled from the tip frames 1424-1432 and the pre-tip median), traceBkb.js = the keyboard in
// its canvas coords (plate x + M), from the pre-tip median plus the tipped frames for what the belly always hid and
// for the part right of the frame (seen only while the synth tips away).
import { drawTrace, decodeTrace } from "./traced.js";
import { TRACE_B_BG } from "./traceBbg.js";
import { TRACE_B_KB } from "./traceBkb.js";
import { softCanvas } from "./soft.js";
import { SOFT } from "./roomA.js";

const KB_R = 3000;   // the keyboard layer runs this far right (the tipping brings plate x up to ~2960 into frame)
// the knob row (rear 0 / front 1): x positions and cap heights (they follow the keyboard's slant), measured on the
// owl-free median of 1382-1416 — only used for the keyboard layer's outline (knobs + everything below)
const KNOBS = [
  ...[110, 285, 495, 705, 900, 1100, 1300, 1525, 1665, 1800, 1950, 2100, 2260, 2420, 2580, 2740, 2900, 3060].map((x) => [x, 0]),
  ...[190, 385, 595, 805, 995, 1188, 1390, 1560, 1720, 1897, 2045, 2190, 2340, 2490, 2640, 2790, 2940].map((x) => [x, 1]),
];
const capY = (x, row) => (row ? 445 + 0.011 * (x - 385) : 366 + 0.012 * (x - 250));
export const KNOB_W = [56, 58], KNOB_H = [92, 110];

const poly = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
function kbMask(g) {
  g.fillStyle = "#fff";
  g.fillRect(-10, 440, KB_R + 10, 800);
  for (const [x, row] of KNOBS) { const w = KNOB_W[row], y = capY(x, row); g.beginPath(); g.roundRect(x - w / 2, y - 10, w, KNOB_H[row], 8); g.fill(); }
  g.beginPath(); poly([[-10, 440], [165, 436], [505, 590], [505, 700], [-10, 700]])(g); g.fill();
}
let L = null;
export function keysBLayers() {
  if (L) return L;
  const M = 260, KW = M + KB_R, KH = 946 + M;
  const bg = document.createElement("canvas"); bg.width = 2206; bg.height = 946;
  const bgc = bg.getContext("2d"); bgc.fillStyle = "#000"; bgc.fillRect(0, 0, 2206, 946);
  drawTrace(bgc, decodeTrace(TRACE_B_BG));
  softCanvas(bg, SOFT);
  const kb = document.createElement("canvas"); kb.width = KW; kb.height = KH;
  const kg = kb.getContext("2d");
  // the keyboard's own black (its outline), then the traced ink shapes
  kg.save(); kg.translate(M, 0); kbMask(kg); kg.restore();
  kg.globalCompositeOperation = "source-in"; kg.fillStyle = "#000"; kg.fillRect(0, 0, KW, KH); kg.globalCompositeOperation = "source-over";
  drawTrace(kg, decodeTrace(TRACE_B_KB));
  softCanvas(kb, SOFT);
  L = { bg, kb, M };
  return L;
}
export function releaseKeysB() { L = null; }
