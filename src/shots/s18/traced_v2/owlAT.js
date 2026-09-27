// s18 shot A owl, drawn from its outline traces (owlATrace.js, made by trace/trace_owlA.py from the source frames
// registered on PATH_A): the rigid head/body/wing drawing per wing phase (level, up, level, down on the source's
// 24-fps content frames), the legs and feet traced per frame, and the smeared fly-in (1331-1337) traced per frame.
// The traces sit at the frame-1356 placement; PATH_A moves them.
import { OWL_A_TRACE } from "./owlATrace.js";
import { drawTrace, decodeTrace } from "./traced.js";
import { owlAOffset, wingPhase } from "./owlA.js";
import { softCanvas } from "./soft.js";

export const FLY_T = 1341;   // first frame drawn from the phase traces (the fly-in and landing are smeared, traced whole)
let D = null;
function dec() {
  if (D) return D;
  D = { phase: {}, feet: {}, fly: {} };
  for (const k of ["phase", "feet", "fly"]) for (const [n, raw] of Object.entries(OWL_A_TRACE[k])) D[k][n] = decodeTrace(raw);
  return D;
}
// the owl is drawn into its own layer and softened a little (the source's owl is softer than the room; the smeared
// fly-in frames more so, along the travel), then placed with PATH_A
const LX = 344, LY = 44, LW = 772, LH = 632;
let layerC = null;
export function drawOwlAT(ctx, f) {
  const d = dec(), [dx, dy] = owlAOffset(f);
  if (!layerC) { layerC = document.createElement("canvas"); layerC.width = LW; layerC.height = LH; }
  const g = layerC.getContext("2d", { willReadFrequently: true });
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, LW, LH); g.translate(-LX, -LY);
  if (f < FLY_T) { if (d.fly[f]) drawTrace(g, d.fly[f]); }
  else {
    drawTrace(g, d.phase[wingPhase(f)]);
    if (d.feet[f]) drawTrace(g, d.feet[f]);
  }
  softCanvas(layerC, SMEAR[f] || 0.7, f < FLY_T ? 1.2 : 0.7);
  ctx.drawImage(layerC, LX + dx, LY + dy);
}
// horizontal softening per frame: on the traced fly-in/landing frames on top of the smear the trace keeps; on the
// first standing frames (still sliding, 48-23 px a frame) the fitted motion blur of the phase drawing
const SMEAR = { 1331: 3, 1332: 3, 1333: 3, 1334: 2.6, 1335: 2.4, 1336: 2.2, 1337: 1.8, 1338: 1.6, 1339: 1.6, 1340: 1.4,
  1341: 2.5, 1342: 2, 1343: 2, 1344: 1.2, 1345: 1.2, 1346: 1 };
export function releaseOwlAT() { D = null; layerC = null; }
