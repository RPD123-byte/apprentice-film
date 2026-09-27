// s16 scene: the designer at his desk seen straight on (steady framing of 46.08–47.48), the laptop, mug, books and
// cables, drawn from the measured plate geometry in ./data/plate.js (value-study levels + ink centre-lines, see
// ./vec.js and ./trace/). His irises are not in the plate: drawIrises() paints them per frame.
// s15 borrows paintScene(P) / drawEyes(g) for its fade-up into this shot, so those two keep their old signatures.
import { W, H } from "../../config.js";
import { paintDrawing, decRing } from "./vec.js";
import { PLATE } from "./data/plate.js";
import { IRIS_LL, IRIS_LR, IRIS_RL, IRIS_RR, OPEN_L, OPEN_R, LOOK } from "./data/eyes.js";

export const M = 90;                        // the plate reaches this far past every frame edge
let PC = null;
// the whole plate on one canvas, origin at (-M, -M)
export function plateCanvas() {
  if (PC) return PC;
  const c = document.createElement("canvas"); c.width = W + 2 * M; c.height = H + 2 * M;
  const g = c.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height);
  g.translate(M, M);
  paintDrawing(g, PLATE);
  PC = c;
  return c;
}

// ---- irises
const IRIS = { L: { L: IRIS_LL, R: IRIS_LR }, R: { L: IRIS_RL, R: IRIS_RR } };
let OPEN = null;
const IC = {};
function irisCanvas(eye, look) {
  const k = eye + look;
  if (IC[k]) return IC[k];
  const d = IRIS[eye][look], [x0, y0, x1, y1] = d.box;
  const c = document.createElement("canvas"); c.width = x1 - x0 + 16; c.height = y1 - y0 + 16;
  const g = c.getContext("2d");
  g.translate(8 - x0, 8 - y0);
  paintDrawing(g, d, { box: [x0 - 4, y0 - 4, x1 + 4, y1 + 4] });
  IC[k] = { c, x: x0 - 8, y: y0 - 8 };
  return IC[k];
}
function openPath(g, r) {
  g.beginPath(); g.moveTo(r[0], r[1]);
  for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1]);
  g.closePath();
}
// F = source frame index (the look table covers 1143..1192; before it he looks right, after it at the owl)
export function drawIrises(g, F) {
  const row = LOOK[Math.max(1143, Math.min(1192, F))];
  ["L", "R"].forEach((eye, i) => {
    const [look, dx, dy] = row[i];
    if (look === "N") return;           // this frame's own eye drawing is in its per-frame layer
    const ic = irisCanvas(eye, look);
    if (!OPEN) OPEN = { L: decRing(OPEN_L), R: decRing(OPEN_R) };
    g.save();
    openPath(g, OPEN[eye]); g.clip();
    g.drawImage(ic.c, ic.x + dx, ic.y + dy);
    g.restore();
  });
}

// ---- for s15 (its last frames fade this room up): the old engraving-plate API. Everything goes on the overlay.
export function paintScene(P) {
  const o = P.o;
  o.save();
  o.drawImage(plateCanvas(), -M, -M);
  o.restore();
}
export function drawEyes(g) {
  // looking right, as on the steady frames before his eyes move (1150-1153)
  if (!OPEN) OPEN = { L: decRing(OPEN_L), R: decRing(OPEN_R) };
  for (const eye of ["L", "R"]) {
    const ic = irisCanvas(eye, "R");
    g.save(); openPath(g, OPEN[eye]); g.clip(); g.drawImage(ic.c, ic.x, ic.y); g.restore();
  }
}

export function releaseScene() { PC = null; for (const k of Object.keys(IC)) delete IC[k]; delete PLATE._dec; }
