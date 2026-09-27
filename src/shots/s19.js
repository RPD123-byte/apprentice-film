// s19 (57.32–63.12): low on the floor among the gear. Locked-off camera (camtrack < 0.3 px over the whole shot).
// The note card stands propped against the speaker, glowing and lighting the floor with fine rays; the owl tumbles
// in from the right as a ball, skids on its belly (dust cloud), sits up with its back to us and looks up at the
// card, gets up (a wing sweeps down: dusting off), stands, throws its wings open, then lifts the card, turns to
// three-quarter view and carries it off to the right, revealing the scissors leaning on the plank behind it.
//
// Everything is drawn in code: the room is a hand-built engraved plate (s19/draw/room.js), the card is notecard.js
// warped by a measured per-frame card table (s19/card.js), the owl is a rig built from the owlInk kit
// (s19/draw/owl*.js) posed per source frame, the dust is procedural puffs placed from measurements.
// See fidelity/s19.md.
import { W, H } from "../config.js";
import { roomPlate, litFloor, releaseRoom } from "./s19/draw/room.js";
import { cardQuad, cardMap, warpCardShutter, releaseCard, CARD_OUTLINE } from "./s19/card.js";
import { releaseWarp } from "./s19/warp.js";
import { drawDust, releaseDust } from "./s19/draw/dust.js";
import { drawOwl19, releaseOwl19 } from "./s19/draw/owl.js";
import { drawShadow, releaseShadow } from "./s19/draw/shadow.js";

let L = null;
function layers() {
  if (L) return L;
  const glow = document.createElement("canvas"); glow.width = Math.round(W / 4); glow.height = Math.round(H / 4);
  L = { room: roomPlate(), lit: litFloor(), glow };
  return L;
}

// The floor light comes from the card and goes as it is lifted. Measured per source frame (floor means at x 300–900 and
// 1700–2100, y 840–946, normalised between the lit 61.40 and the dark 61.80 frames): 0.96 at 61.44, 0.76, 0.53,
// 0.52 (61.56 repeats 61.52), 0.35, 0.18, 0.09, 0.01 at 61.72, then dark.
const FLOOR = [[61.40, 1], [61.44, 0.96], [61.48, 0.76], [61.52, 0.53], [61.56, 0.52], [61.60, 0.35], [61.64, 0.18], [61.68, 0.09], [61.72, 0.01], [61.76, 0]];
const floorLight = (t) => {
  if (t <= FLOOR[0][0]) return 1;
  for (let i = 1; i < FLOOR.length; i++) if (t <= FLOOR[i][0]) { const [a, va] = FLOOR[i - 1], [b, vb] = FLOOR[i]; return va + (vb - va) * (t - a) / (b - a); }
  return 0;
};

export const shot = {
  draw(ctx, local, t) {
    t = Math.ceil(t * 25 - 1e-6) / 25;          // hold each 25 fps source frame
    const L = layers();
    ctx.drawImage(L.room, 0, 0, W, H);
    const fl = floorLight(t);
    if (fl > 0) { ctx.save(); ctx.globalCompositeOperation = "lighten"; ctx.globalAlpha = fl; ctx.drawImage(L.lit, 0, 0); ctx.restore(); }
    // the card: motion-blurred over a quarter frame (0.006 s) when it moves, all shutter samples in one GL pass
    const q0 = cardQuad(t), q1 = cardQuad(t - 0.006);
    const move = Math.max(...q0.map((p, i) => Math.hypot(p[0] - q1[i][0], p[1] - q1[i][1])));
    const N = move < 1.5 ? 1 : Math.min(6, 3 + Math.round(move / 6));
    const card = warpCardShutter(Array.from({ length: N }, (_, k) => t - (N > 1 ? 0.006 * k / (N - 1) : 0)), W, H);
    // the card's glow on the room (measured in value space round the standing card: 0.31 at 10 px, 0.24 at 20, 0.18 at
    // 30, 0.12 at 45, 0.067 at 60, 0.023 at 80): the card's silhouette blurred with sigma 43 px at 0.75
    const gg = L.glow.getContext("2d"), m = cardMap(t), k = L.glow.width / W;
    gg.setTransform(1, 0, 0, 1, 0, 0); gg.clearRect(0, 0, L.glow.width, L.glow.height);
    gg.filter = `blur(${(43 * k).toFixed(2)}px)`; gg.fillStyle = "#fff"; gg.beginPath();
    CARD_OUTLINE.forEach(([u, v], i) => { const p = m(u, v); if (i) gg.lineTo(p[0] * k, p[1] * k); else gg.moveTo(p[0] * k, p[1] * k); });
    gg.closePath(); gg.fill(); gg.filter = "none";
    if (fl > 0) {
      // the lit floor carries its own light: no glow below the card's foot while it stands
      gg.save(); gg.globalCompositeOperation = "destination-out"; gg.globalAlpha = fl; gg.fillStyle = "#000"; gg.beginPath();
      gg.moveTo(0, (772 - 995 * 0.04 - 4) * k); gg.lineTo(W * k, (772 + (W - 995) * 0.04 - 4) * k); gg.lineTo(W * k, H * k); gg.lineTo(0, H * k); gg.closePath(); gg.fill(); gg.restore();
    }
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.62 * fl + 0.9 * (1 - fl); ctx.drawImage(L.glow, 0, 0, W, H); ctx.restore();
    ctx.drawImage(card.canvas, 0, 0, card.w, card.h, card.x, card.y, card.w, card.h);
    // the owl's shadow pool on the lit floor (it blocks the card's light): measured per source frame (draw/shadow.js)
    drawShadow(ctx, t, L.room, fl);
    drawOwl19(ctx, t);
    drawDust(ctx, t);
  },
  // the source's grain in this static shot is finer than post.js's default: frame-to-frame change in the static room
  // (x 0–650 and 1800–2206, 60.40 -> 60.44) is 0.75 / 0.55 levels in the source, 1.2 / 1.06 at 0.6 of the default grain;
  // 0.35 of the default brings it to about the source's
  grade() { return { grain: 0.35 * 6.0 / 255.0 }; },
  release() { L = null; releaseRoom(); releaseCard(); releaseWarp(); releaseOwl19(); releaseDust(); releaseShadow(); },
};
