// The stare (33.60–35.36): the room drops away and the owl holds still on black, eyes fixed on him.
// Locked-off in the source (camtrack: s = 1.0000, no drift). The owl is held for 1.60 s, then the head dips twice on
// 2-frame pops before the cut: 35.20 a flat-lidded glare, 35.28 eyes shut, head rolled further.
import { owlLayer, owlPose } from "../lib/owlInk.js";

export const PLACE = { x: 1296, y: 636, s: 2.6 };
const HERO = () => owlPose("sit3q");
const POPS = [
  [35.2, "glare", { eyes: { state: "glare" }, head: { x: -130, y: -111, roll: -0.218 }, headphones: { dx: 0.34 } }],
  [35.28, "closed", { eyes: { state: "closed" }, head: { x: -130, y: -99, pitch: -0.16, roll: -0.223 }, headphones: { dx: 0.35, dy: -0.3, bandH: 1.75 } }],
];

let cache = null;
function layer(key, over) {
  if (!cache) cache = new Map();
  if (!cache.has(key)) cache.set(key, owlLayer({ ...PLACE, ...owlPose("sit3q", over), clip: [0, 0, 2206, 946] }));
  return cache.get(key);
}
export function heroLayer() { return layer("stare", {}); }

export const shot = {
  draw(ctx, local, t) {
    let key = "stare", over = {};
    for (const [t0, k, o] of POPS) if (t >= t0 - 1e-6) { key = k; over = o; }
    const L = layer(key, over);
    ctx.drawImage(L.canvas, L.x, L.y, L.w, L.h);
  },
  release() { cache = null; },
};
