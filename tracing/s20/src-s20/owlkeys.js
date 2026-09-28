// The owl's traced drawings in s20 (s20/trace/owlkeys.py; value bands + ink centre-lines + silhouette):
//   held keys — the median of the frames that hold each drawing, placed on every frame it covers by a measured affine
//     (ECC fit of the key to that frame, table in s20/data/owlframes.js); setup-A frame (B1 through the camera);
//   single-frame traces ("screen") — the fast action frames, each traced on its own with whatever the owl holds,
//     in screen coordinates.
import { decode, traceCanvas, ringsPath } from "./tracedata.js";
import { KEYDATA as DATA } from "./data/owlkeys_index.js";
import { OWL_FRAMES } from "./data/owlframes.js";

let CACHE = new Map();
function keyLayer(name) {
  let L = CACHE.get(name);
  if (!L) {
    const src = DATA[name], D = decode(src), [x0, y0, x1, y1] = src.box;
    let canvas = traceCanvas(D, x0, y0, x1 - x0, y1 - y0, { clear: true, clip: (g) => ringsPath(g, D.mask) });
    // motion-blurred source frames (single-frame traces carry a measured softness): soften the redraw to match
    if (src.soft > 0.2) {
      const c = document.createElement("canvas"); c.width = canvas.width; c.height = canvas.height;
      const g = c.getContext("2d"); g.filter = `blur(${src.soft}px)`; g.drawImage(canvas, 0, 0); canvas = c;
    }
    if (CACHE.size > 12) CACHE.delete(CACHE.keys().next().value);   // single-frame traces are used once
    CACHE.set(name, (L = { canvas, x0, y0 }));
  }
  return L;
}
// the key (and its placement) for a frame time, or null when the rig draws the owl
export function keyAt(tq) { return OWL_FRAMES[tq.toFixed(2)] || null; }
export function drawKey(ctx, k) {
  const [name, a, b, c, d, e, f] = k, L = keyLayer(name);
  ctx.save(); ctx.transform(a, b, c, d, e, f); ctx.drawImage(L.canvas, L.x0, L.y0); ctx.restore();
}
export function releaseKeys() { CACHE = new Map(); }
