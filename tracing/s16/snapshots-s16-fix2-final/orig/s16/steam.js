// s16 steam: the two ribbons rising from the mug, one measured drawing per source frame where it changes
// (./data/steam.js: pale centre-lines in plate px, from src/shots/s16/trace/steam.py), redrawn as tapered strokes:
// a soft glow (the halo's path, blurred 2 px, added at 0.35), a soft ribbon at a little under half the measured
// brightness and a thin core at full brightness on top (the source's steam has a brilliant white core line inside a
// soft edge). Fix 1: ribbons 1.6x wider (the source's are 3-5 px, it carries ~20% more light), and each line's lower
// end runs on 11 px toward the mug (the measured lines stopped 11 px short of the rim, y ~688).
// Drawn in the room's coordinates (the caller's transform carries the camera).
import { drawStrokes } from "./room.js";
import { DRAWINGS, FRAME } from "./data/steam.js";

export const TUNE = { halo: 1.75, haloV: 0.45, core: 0.65, glow: 0.3, glowBlur: 2, ext: 13 };

const scale = (S, kw, kv) => S.map((s) => { const o = s.slice(); for (let i = 0; i < o.length; i += 4) { o[i + 2] *= kw; o[i + 3] *= kv; } return o; });
// extend each line's lower end (the one nearer the mug) along its last segment, by ext px
function extend(S, ext) {
  return S.map((s) => {
    const n = s.length / 4;
    if (n < 2 || ext <= 0) return s;
    const lowEnd = s[4 * (n - 1) + 1] >= s[1];
    const a = lowEnd ? n - 1 : 0, b = lowEnd ? n - 2 : 1;
    let dx = s[4 * a] - s[4 * b], dy = s[4 * a + 1] - s[4 * b + 1];
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    if (dy < 0.3) { dx *= 0.5; dy = 1; const e = Math.hypot(dx, dy); dx /= e; dy /= e; }
    const p = [s[4 * a] + dx * ext, s[4 * a + 1] + dy * ext, s[4 * a + 2], s[4 * a + 3]];
    return lowEnd ? s.concat(p) : p.concat(s);
  });
}
const CACHE = new Map();
export function drawSteam(g, F) {
  const i = FRAME[Math.max(1143, Math.min(1192, F))];
  if (i === undefined) return;
  if (!CACHE.has(i)) {
    const D = extend(DRAWINGS[i], TUNE.ext);
    CACHE.set(i, [scale(D, TUNE.halo, TUNE.haloV), scale(D, TUNE.core, 1)]);
  }
  const [halo, core] = CACHE.get(i);
  if (TUNE.glow > 0) {
    g.save(); g.globalAlpha = TUNE.glow; g.filter = `blur(${TUNE.glowBlur}px)`;
    drawStrokes(g, halo, true, { end: 4, wMin: 1.0 });
    g.restore();
  }
  drawStrokes(g, halo, true, { end: 4, wMin: 1.0 });
  drawStrokes(g, core, true, { end: 3, wMin: 0.7 });
}
export function releaseSteam() { CACHE.clear(); }
