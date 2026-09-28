// s16 steam: the two ribbons rising from the mug, one measured drawing per source frame where it changes
// (./data/steam.js: pale centre-lines in plate px, from src/shots/s16/trace/steam.py), redrawn as tapered strokes:
// a soft ribbon at a little under half the measured brightness and a thin core at full brightness on top (the
// source's steam has a brilliant white core line inside a soft edge; same ink mass as the measured line).
// Drawn in the room's coordinates (the caller's transform carries the camera).
import { drawStrokes } from "./room.js";
import { DRAWINGS, FRAME } from "./data/steam.js";

const scale = (S, kw, kv) => S.map((s) => { const o = s.slice(); for (let i = 0; i < o.length; i += 4) { o[i + 2] *= kw; o[i + 3] *= kv; } return o; });
const CACHE = new Map();
export function drawSteam(g, F) {
  const i = FRAME[Math.max(1143, Math.min(1192, F))];
  if (i === undefined) return;
  if (!CACHE.has(i)) CACHE.set(i, [scale(DRAWINGS[i], 1.45, 0.45), scale(DRAWINGS[i], 0.5, 1)]);
  const [halo, core] = CACHE.get(i);
  drawStrokes(g, halo, true, { end: 4, wMin: 1.0 });
  drawStrokes(g, core, true, { end: 3, wMin: 0.7 });
}
