// s18 shot A plate (53.24–55.24): the synth corner from the illustration, locked off (camtrack: s = 1.0000,
// drift < 0.2 px). The plate is the outline trace of the source's owl-free plate (traceA.js; the median of the
// shot's frames with the owl removed; see trace/README.md), drawn once.
import { drawTrace, decodeTrace } from "./traced.js";
import { TRACE_A } from "./traceA.js";
import { softCanvas } from "./soft.js";

export const SOFT = 0.55, GAIN = 1.03;   // GAIN: the trace loses a little of the anti-aliased skirt mass
let plate = null;
export function roomACanvas() {
  if (plate) return plate;
  plate = document.createElement("canvas"); plate.width = 2206; plate.height = 946;
  const g = plate.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, 2206, 946);
  drawTrace(g, decodeTrace(TRACE_A), { gain: GAIN });
  softCanvas(plate, SOFT);   // the source plate is a little softer than crisp vector edges
  return plate;
}
export function releaseRoomA() { plate = null; }
