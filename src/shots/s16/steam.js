// s16 steam: the two ribbons rising from the mug, one measured drawing per source frame where it changes
// (./data/steam.js: pale centre-lines in plate px, from src/shots/s16/trace/steam.py), redrawn as tapered strokes:
// a soft glow (the halo's path, blurred 2 px, added at 0.35), a soft ribbon at a little under half the measured
// brightness and a thin core at full brightness on top (the source's steam has a brilliant white core line inside a
// soft edge). Fix 1: ribbons 1.6x wider (the source's are 3-5 px, it carries ~20% more light), and each line's lower
// end runs on 11 px toward the mug (the measured lines stopped 11 px short of the rim, y ~688). Fix 2: runs on 18 px
// at the ribbon's own brightness (the dim end and the taper ate the first extension: the lowest lit pixel was still 11-17 px short), the core softened 0.8 px, and
// the short fork strokes by the ribbon at (803, 575) dropped.
// Drawn in the room's coordinates (the caller's transform carries the camera).
import { drawStrokes } from "./room.js";
import { DRAWINGS, FRAME } from "./data/steam.js";

export const TUNE = { halo: 1.75, haloV: 0.45, core: 0.65, glow: 0.3, glowBlur: 2, ext: 18, coreBlur: 0.8 };
// fix 2: the short fork / tick strokes (< 30 px) measured beside the ribbon at about (803, 575) are left out
const strokeLen = (s) => { let L = 0; for (let i = 4; i < s.length; i += 4) L += Math.hypot(s[i] - s[i - 4], s[i + 1] - s[i - 3]); return L; };
const isFork = (s) => { if (strokeLen(s) >= 30) return false; for (let i = 0; i < s.length; i += 4) if (Math.hypot(s[i] - 803, s[i + 1] - 575) < 12) return true; return false; };

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
    // (fix 2: the extension carries the brightness and width of the ribbon's last few points, not its dim end)
    let vm = 0, wm = 0, c = 0;
    for (let k = 0; k < Math.min(5, n); k++) { const j = lowEnd ? n - 1 - k : k; vm = Math.max(vm, s[4 * j + 3]); wm += s[4 * j + 2]; c++; }
    wm /= c;
    const mid = [s[4 * a] + dx * ext * 0.5, s[4 * a + 1] + dy * ext * 0.5, wm, vm];
    const p = [s[4 * a] + dx * ext, s[4 * a + 1] + dy * ext, wm * 0.8, vm * 0.9];
    if (lowEnd) { const o = s.slice(); o[4 * a + 2] = wm; o[4 * a + 3] = vm; return o.concat(mid, p); }
    const o = s.slice(); o[2] = wm; o[3] = vm; return p.concat(mid, o);
  });
}
// fix 2: a centre-line that dips to its lowest point between two higher ends (a U through the ribbons' bottom) is
// split there, so the half that comes down to the mug can be extended toward the rim
function splitLow(S) {
  const out = [];
  for (const s of S) {
    const n = s.length / 4;
    let k = 0; for (let i = 1; i < n; i++) if (s[4 * i + 1] > s[4 * k + 1]) k = i;
    if (k > 1 && k < n - 2 && s[4 * k + 1] > s[1] + 8 && s[4 * k + 1] > s[4 * (n - 1) + 1] + 8) {
      out.push(s.slice(0, 4 * (k + 1)), s.slice(4 * k));
    } else out.push(s);
  }
  return out;
}
const CACHE = new Map();
export function drawSteam(g, F) {
  const i = FRAME[Math.max(1143, Math.min(1192, F))];
  if (i === undefined) return;
  if (!CACHE.has(i)) {
    const D = extend(splitLow(DRAWINGS[i].filter((st) => !isFork(st))), TUNE.ext);
    CACHE.set(i, [scale(D, TUNE.halo, TUNE.haloV), scale(D, TUNE.core, 1)]);
  }
  const [halo, core] = CACHE.get(i);
  if (TUNE.glow > 0) {
    g.save(); g.globalAlpha = TUNE.glow; g.filter = `blur(${TUNE.glowBlur}px)`;
    drawStrokes(g, halo, true, { end: 4, wMin: 1.0 });
    g.restore();
  }
  drawStrokes(g, halo, true, { end: 4, wMin: 1.0 });
  g.save(); if (TUNE.coreBlur > 0) g.filter = `blur(${TUNE.coreBlur}px)`;
  drawStrokes(g, core, true, { end: 3, wMin: 0.7 });
  g.restore();
}
export function releaseSteam() { CACHE.clear(); }
