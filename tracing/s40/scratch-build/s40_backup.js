// End card (PLAN 136.0–140.8). Measured on the source: the card dissolves in LINEARLY over the sleeping room from
// 135.78 to 136.96 (letters, sky and clouds at the same rate), so at the cut (136.0) it is already 19% in.
// main.js's own xfade is a smoothstep that starts at the cut, so this shot does its own dissolve instead (xfade: 0):
// it paints the previous shot (s28) underneath and fades the card in at the measured rate. The 135.78–136.0 part
// lies inside s28's time; s28 can call overlayEndCard(ctx, t) from ./s40/card.js to match it.
// Static camera (camtrack s = 1.0000, drift < 0.2 px). The final fade to black is main.js's (matches to ±0.05).
import { W, H } from "../config.js";
import { paintCard, cardAlpha, CARD_FULL, releaseCard } from "./s40/card.js";

// The shot underneath the dissolve, loaded with the shot table (a missing s28 just leaves black).
const prev = await import("./s28.js").then((m) => m.shot ?? m.s28 ?? null).catch(() => null);

let layer = null;
export const s40 = {
  id: "s40-endcard",
  start: 136.0,
  end: 140.8,
  xfade: 0,
  draw(ctx, local, t) {
    const a = cardAlpha(t);
    if (a >= 1 || t >= CARD_FULL) { paintCard(ctx, t); return; }
    // dissolve: s28 at this film time, then the card over it at the measured linear alpha
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    if (prev && typeof prev.draw === "function") {
      try { prev.draw(ctx, t - (prev.start ?? 129.3), t, prev); } catch (e) { console.error("[s40] s28 underlay failed:", e); }
    }
    ctx.restore();
    if (!layer) { layer = document.createElement("canvas"); layer.width = W; layer.height = H; }
    const g = layer.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0);
    paintCard(g, t);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = a;
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  },
  release() { layer = null; releaseCard(); },
};
