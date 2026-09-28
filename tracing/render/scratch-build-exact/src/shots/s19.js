// s19 (57.32–63.12): low on the floor among the gear. Locked-off camera (camtrack < 0.3 px over the whole shot).
// The note card stands propped against the speaker, glowing and lighting the floor with fine rays; the owl tumbles
// in from the right as a ball, skids on its belly (dust cloud), sits up with its back to us and looks up at the
// card, gets up (a wing sweeps down: dusting off), stands, throws its wings open, then lifts the card, turns to
// three-quarter view and carries it off to the right, revealing the scissors leaning on the plank behind it.
// Timing and positions: see s19/anim.js (owl) and s19/card.js (the card's per-frame quad).
import { W, H } from "../config.js";
import { Plate } from "../lib/engrave.js";
import { clamp } from "../lib/rng.js";
import { paintRoom, paintFloorRays } from "./s19/room.js";
import { cardH, cardQuad, warpCard, releaseCard } from "./s19/card.js";
import { releaseWarp } from "./s19/warp.js";
import { drawOwlAt, drawDust, owlShadow, releaseOwl } from "./s19/anim.js";

let L = null;
function layers() {
  if (L) return L;
  const P = new Plate(W, H, 1);
  paintRoom(P);
  const room = P.engrave({ spacing: 5.5, seed: 19, contrast: 1.05 });
  const rays = document.createElement("canvas"); rays.width = W; rays.height = H;
  paintFloorRays(rays.getContext("2d"));
  const glow = document.createElement("canvas"); glow.width = Math.round(W / 4); glow.height = Math.round(H / 4);
  const acc = document.createElement("canvas"); acc.width = W; acc.height = H;
  L = { room, rays, glow, acc };
  return L;
}

// The floor light comes from the card: full until 61.44, gone by 61.76 (measured floor mean 31.6 → 1.6).
const floorLight = (t) => 1 - clamp((t - 61.44) / 0.32);

// darken the band along the card's bottom edge (BL→BR) and the lower half of its left edge
function shadeCard(ctx, q, k) {
  const [tl, tr, br, bl] = q;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(tl[0], tl[1]); ctx.lineTo(tr[0], tr[1]); ctx.lineTo(br[0], br[1]); ctx.lineTo(bl[0], bl[1]); ctx.closePath(); ctx.clip();
  const mx = (bl[0] + br[0]) / 2, my = (bl[1] + br[1]) / 2, cx = (tl[0] + tr[0] + br[0] + bl[0]) / 4, cy = (tl[1] + tr[1] + br[1] + bl[1]) / 4;
  const g = ctx.createLinearGradient(mx, my, mx + (cx - mx) * 0.45, my + (cy - my) * 0.45);
  g.addColorStop(0, `rgba(0,0,0,${0.4 * k})`); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

export const shot = {
  draw(ctx, local, t) {
    t = Math.ceil(t * 25 - 1e-6) / 25;          // hold each 25 fps source frame
    const L = layers();
    ctx.drawImage(L.room, 0, 0, W, H);
    // floor spill from under the card, and the floor going dark once the card is lifted
    const fl = floorLight(t);
    if (fl > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.9 * fl; ctx.drawImage(L.rays, 0, 0); ctx.restore(); }
    if (fl < 1) { ctx.save(); ctx.globalAlpha = 0.85 * (1 - fl); ctx.fillStyle = "#000"; ctx.fillRect(0, 786, W, H - 786); ctx.restore(); }
    // the card: motion-blurred over half a frame when it moves; a soft glow round it
    const q0 = cardQuad(t), q1 = cardQuad(t - 0.006);
    const move = Math.max(...q0.map((p, i) => Math.hypot(p[0] - q1[i][0], p[1] - q1[i][1])));
    let card;
    if (move < 1.5) card = warpCard(cardH(t), W, H);
    else {
      const g = L.acc.getContext("2d"), N = Math.min(8, 3 + Math.round(move / 5));
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; g.clearRect(0, 0, W, H);
      g.globalCompositeOperation = "lighter"; g.globalAlpha = 1 / N;
      for (let k = 0; k < N; k++) g.drawImage(warpCard(cardH(t - 0.006 * k / (N - 1)), W, H), 0, 0);   // a quarter-frame shutter: the source's card stays legible
      g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
      card = L.acc;
    }
    const gg = L.glow.getContext("2d");
    gg.setTransform(1, 0, 0, 1, 0, 0); gg.clearRect(0, 0, L.glow.width, L.glow.height);
    gg.filter = "blur(10px)"; gg.drawImage(card, 0, 0, L.glow.width, L.glow.height); gg.filter = "none";
    // measured: a ~50 px glow round the standing card (28 → 104 grey just outside its edge); none once it is lifted
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.25 + 0.35 * fl; ctx.drawImage(L.glow, 0, 0, W, H); ctx.restore();
    ctx.drawImage(card, 0, 0);
    // lifted, the card's lower edge falls into shade (measured ramp ≈ 150 px, 80 → 220 grey, at 62.40–63.08)
    const sh = clamp((t - 61.6) / 0.6);
    if (sh > 0) shadeCard(ctx, q0, sh);
    // the owl's shadow on the lit floor, then the owl, then the dust
    const st = owlShadow(t);
    if (st && fl > 0) {
      ctx.save(); ctx.globalAlpha = fl * st.a; ctx.filter = "blur(12px)"; ctx.fillStyle = "#000";
      ctx.beginPath(); ctx.ellipse(st.x, st.y, st.w, st.h, 0, 0, 7); ctx.fill(); ctx.restore();
    }
    drawOwlAt(ctx, t);
    drawDust(ctx, t);
  },
  release() { L = null; releaseCard(); releaseWarp(); releaseOwl(); },
};
