// s06 (26.72–29.04): front view across the laptop lid. The designer, heavy-lidded and sweating, rests his cheek on the
// fist holding a pencil; the owl in headphones sits on his right shoulder (frame right) and looks at him.
//
// Measured on the source (camera locked off: camtrack s = 1.0000, drift < 0.2 px). Everything is drawn from
// measurements made by the scripts in s06/trace/ (see s06/trace/README.md): stroke centre-lines with widths and
// values, outlines of tonal masses at a few levels, motion fields — no source pixels are stored or loaded.
// What moves:
//   - the mouth eases into a small smile 27.08 -> 28.40: its line is fitted on every source frame; the lips' hatching
//     and the stubble move with the optical flow of that frame (s06/data/mouth.js, flow.js);
//   - the brows rise with it (27.08 -> 28.2), moved by the measured flow (s06/data/flow.js);
//   - the owl blinks 28.04–28.52 (lids lower, shut 28.20–28.36, half 28.40–28.48, open 28.52) while its head rolls
//     clockwise up to 1.97 deg (per-frame ECC fits); each blink frame's eyes are a measured value study.
// Layers: `under` (room, hoodie, face) and `over` (nape, hair, beanie, fist, pencil, laptop, tone veil) are cached;
// each frame draws under -> brows -> mouth -> over -> smile/brow veils -> owl (cached still, or drawn for the blink).
import { W, H } from "../config.js";
import { mk } from "./s06/kit.js";
import { drawFaceT, drawBrowsF, drawMouthT } from "./s06/face2.js";
import { drawHairT } from "./s06/hair2.js";
import { drawBodyT, drawHandT, drawBeanieT, drawRoomT, drawLaptopT, drawPencilT, drawResid, drawResidState, releaseVeils, VEIL_OUT } from "./s06/body2.js";
import { drawOwlT, blinkFrame, stillEyes, tuftClip, silClip, headMapOf } from "./s06/owl2.js";
import { releaseScratch } from "./s06/ink.js";

const interp = (tab, t) => {
  if (t <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) if (t <= tab[i][0]) { const a = tab[i - 1], b = tab[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); }
  return tab[tab.length - 1][1];
};
// smile amount (right mouth corner, y 693 -> 657 px) and brow rise (left brow middle, dy -12.9 px) per source frame,
// normalised; they fade in the smile / brow-state tone veils
const SMILE = [[26.72, 0], [27.06, 0], [27.12, 0.06], [27.2, 0.17], [27.28, 0.25], [27.36, 0.36], [27.44, 0.44], [27.52, 0.55], [27.6, 0.64], [27.68, 0.7], [27.76, 0.78], [27.84, 0.83], [27.92, 0.89], [28.0, 0.92], [28.08, 0.97], [28.16, 1], [29.1, 1]];
const BROW = [[26.72, 0], [27.04, 0], [27.08, 0.04], [27.16, 0.08], [27.24, 0.15], [27.32, 0.19], [27.4, 0.27], [27.48, 0.3], [27.56, 0.47], [27.64, 0.56], [27.72, 0.65], [27.8, 0.68], [27.88, 0.78], [27.96, 0.88], [28.04, 0.9], [28.12, 0.98], [28.2, 1], [29.1, 1]];

let cache = null;
function build() {
  if (cache) return cache;
  const [under, g] = mk(W, H);
  drawRoomT(g);
  drawBodyT(g);
  drawFaceT(g);
  const [over, o] = mk(W, H);
  drawHairT(o);
  drawBeanieT(o);
  drawHandT(o);
  drawPencilT(o);
  drawLaptopT(o);
  drawResid(o, undefined, undefined, VEIL_OUT);
  cache = { under, over };
  return cache;
}

export const shot = {
  draw(ctx, local, t) {
    const L = build();
    ctx.drawImage(L.under, 0, 0);
    drawBrowsF(ctx, t);
    drawMouthT(ctx, t, interp(SMILE, t));
    ctx.drawImage(L.over, 0, 0);
    drawResidState(ctx, "smile", interp(SMILE, t));
    drawResidState(ctx, "brow", interp(BROW, t));
    const fr = blinkFrame(t);
    if (fr) drawOwlT(ctx, fr);
    else {
      const k = t < 28.2 ? "pre" : "post";
      if (!L[k]) { const [c, og] = mk(W, H); drawOwlT(og, null, stillEyes(t)); L[k] = c; }
      ctx.drawImage(L[k], 0, 0);
    }
    ctx.save(); tuftClip(ctx, fr ? headMapOf(fr) : null); drawResidState(ctx, "owl", 1); ctx.restore();
  },
  release() { cache = null; releaseVeils(); releaseScratch(); },
};
