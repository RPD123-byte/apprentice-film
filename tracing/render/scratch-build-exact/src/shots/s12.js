// The stare (33.60–35.36): the room drops away and the owl holds still on black, eyes fixed on him.
// Locked-off in the source (camtrack: s = 1.0000, no drift). The owl is held for 1.60 s, then two 2-frame pops
// before the cut (source frames 880–881 and 882–883): a glare (lids down, head rolled -2.63°) and eyes shut
// (head rolled -5.15° and dropped, the chest pulled down with it). All three drawings are built from one set of
// measured control points (s12/geo.js) by s12/hero.js and cached.
import { heroLayer } from "./s12/hero.js";

const POPS = [[35.2, "glare"], [35.28, "closed"]];

let cache = null;
function layer(key) {
  if (!cache) cache = new Map();
  if (!cache.has(key)) cache.set(key, heroLayer(key));
  return cache.get(key);
}

export const shot = {
  draw(ctx, local, t) {
    let key = "stare";
    for (const [t0, k] of POPS) if (t >= t0 - 1e-6) key = k;
    const L = layer(key);
    ctx.drawImage(L.canvas, L.x, L.y, L.w, L.h);
  },
  // halation measured in bands off the owl's silhouette: 0.38 matches the source at 60–100 px and on the dim right
  // side; the lit left side's 2–35 px glow is still ~20% under. s09 inherits this through S12.grade (continuous cut).
  grade: () => ({ halo: 0.38 }),
  release() { cache = null; },
};
