// scratch (not loaded by the film): the colour page alone under its arrival camera, with s26's F tone lift, for zone
// measurement against the source
import { hippiePageCanvas, pageArrival } from "/src/lib/hippie.js";
import { toneMap } from "/src/shots/s26/trace.js";
import { TONE } from "/src/shots/s26/tone.js";
let P = null;
export const shot = {
  draw(ctx, local, t0) {
    const t = Math.ceil(t0 * 25 - 0.001) / 25;
    if (!P) { const p = hippiePageCanvas(); P = document.createElement("canvas"); P.width = p.width; P.height = p.height; P.getContext("2d").drawImage(p, 0, 0); toneMap(TONE.F).canvas(P); }
    const A = pageArrival(Math.max(112.7, t));
    ctx.save(); ctx.setTransform(A.s, 0, 0, A.s, A.tx, A.ty); ctx.imageSmoothingQuality = "high";
    ctx.drawImage(P, 0, 0); ctx.restore();
  },
};
