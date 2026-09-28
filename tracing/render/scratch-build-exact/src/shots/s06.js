// s06 (26.72–29.04): front view across the laptop lid. The designer, heavy-lidded and sweating, rests his cheek on the
// fist holding a pencil; the owl in headphones sits on his right shoulder (frame right) and looks at him.
// Measured on the source: the camera is locked off (camtrack s = 1.0000, drift < 0.2 px); the designer holds still
// (face/hand tracks < 2 px). Two things move:
//   - his mouth eases from a flat, slightly down-turned line into a small smile, 27.08 -> 28.16 (mouth corner track);
//   - the owl blinks: lids lower 28.04–28.16, shut 28.20–28.36, half 28.40–28.48, open again 28.52; during the
//     blink its head rolls clockwise up to 2.1 deg about the head centre (camtrack on the owl head, peak 28.24–28.28).
import { W, H } from "../config.js";
import { owlLayer } from "../lib/owlInk.js";
import { drawRoom } from "./s06/room.js";
import { drawBody, drawLaptop } from "./s06/body.js";
import { drawFace, drawMouth, drawNeck, drawBrows } from "./s06/face.js";
import { drawBeanie, drawHand, drawPencil } from "./s06/head.js";
import { drawHair } from "./s06/hair.js";
import { mk } from "./s06/kit.js";
import { OWL_PLACE, owlState, drawHeadphones, rollAt } from "./s06/owl.js";

// smile amount p(t): measured from the right mouth corner (y 693 -> 657 px) per source frame
const SMILE = [[26.72, 0], [27.06, 0], [27.12, 0.06], [27.2, 0.17], [27.28, 0.25], [27.36, 0.36], [27.44, 0.44], [27.52, 0.55], [27.6, 0.64], [27.68, 0.7], [27.76, 0.78], [27.84, 0.83], [27.92, 0.89], [28.0, 0.92], [28.08, 0.97], [28.16, 1], [29.1, 1]];
const interp = (tab, t) => {
  if (t <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) if (t <= tab[i][0]) { const a = tab[i - 1], b = tab[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); }
  return tab[tab.length - 1][1];
};

// the brows rise with the smile, a little behind it (template tracking of the left brow's middle, 26.76 -> 28.2:
// dy -12.9 px, normalised)
const BROW = [[26.72, 0], [27.04, 0], [27.08, 0.04], [27.16, 0.08], [27.24, 0.15], [27.32, 0.19], [27.4, 0.27], [27.48, 0.3], [27.56, 0.47], [27.64, 0.56], [27.72, 0.65], [27.8, 0.68], [27.88, 0.78], [27.96, 0.88], [28.04, 0.9], [28.12, 0.98], [28.2, 1], [29.1, 1]];

let cache = null;
function build() {
  if (cache) return cache;
  // under: everything behind the moving brows and mouth; over: the hair, beanie, fist, pencil and laptop in front
  const [under, g] = mk(W, H);
  drawRoom(g);
  drawBody(g);
  drawNeck(g);
  drawFace(g);
  const [over, o] = mk(W, H);
  drawHair(o);
  drawBeanie(o);
  drawHand(o);
  drawPencil(o);
  drawLaptop(o);
  cache = { under, over, owls: new Map() };
  return cache;
}
function owl(key, roll) {
  const id = key + "|" + roll;
  if (!cache.owls.has(id)) cache.owls.set(id, owlLayer({ ...owlState(key, roll), ...OWL_PLACE }));
  return cache.owls.get(id);
}

export const shot = {
  draw(ctx, local, t) {
    const L = build();
    ctx.drawImage(L.under, 0, 0);
    drawBrows(ctx, interp(BROW, t));
    drawMouth(ctx, interp(SMILE, t));
    ctx.drawImage(L.over, 0, 0);
    const k = owlKeyAt(t), roll = rollAt(t), o = owl(k, roll);
    ctx.drawImage(o.canvas, o.x, o.y, o.w, o.h);
    drawHeadphones(ctx, roll, k);
  },
  release() { cache = null; },
};

// owl eye state per source frame (25 fps): measured from the mean darkness of the owl's eye box
function owlKeyAt(t) {
  const f = Math.round(t * 25 + 1e-6) / 25;
  if (f < 28.04 - 1e-6) return "sad";
  if (f < 28.08 - 1e-6) return "low1";
  if (f < 28.16 - 1e-6) return "low2";
  if (f < 28.2 - 1e-6) return "slit";
  if (f < 28.4 - 1e-6) return f < 28.36 - 1e-6 ? "shut" : "shut2";
  if (f < 28.48 - 1e-6) return "half";
  if (f < 28.52 - 1e-6) return "half2";
  return "sad";
}
