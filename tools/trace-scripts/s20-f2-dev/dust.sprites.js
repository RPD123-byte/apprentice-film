// The dust the owl beats out of the scissors (s20, 64.44–67.16). The source redraws its cartoon puffs on every frame,
// so the cloud is measured per frame (s20/trace/dust.py): circles [x, y, r, value, lift] packed into the dust it
// shows (the source minus the clean room, minus the owl). Each circle gets a puff: until the beating stops, an
// opaque-ish lumpy grey puff with dark speckles in the measured value; after it (65.72 on) the cloud melts into a
// translucent haze, drawn as soft light added by the measured lift. Setup-A frame px (B1 frames draw through the
// camera).
import { rng, clamp } from "../../lib/rng.js";
import { tone } from "./tracedraw.js";
import { DUST } from "./data/dust.js";

const TAU = Math.PI * 2;
const NV = 12, NS = 4, SZ = 96;
let SPR = null, HAZE = null;
// puff sprites: NS lumpy shapes × NV grey levels; each a union of discs, lighter on top, soft rim, dark speckles
function sprites() {
  if (SPR) return SPR;
  SPR = [];
  for (let s = 0; s < NS; s++) {
    const r = rng(700 + s * 13), discs = [];
    const k = 5 + Math.floor(r() * 3);
    for (let i = 0; i < k; i++) { const a = (i / k) * TAU + r() * 0.6, d = 13 + r() * 9; discs.push([SZ / 2 + Math.cos(a) * d, SZ / 2 + Math.sin(a) * d * 0.85, 14 + r() * 7]); }
    discs.push([SZ / 2, SZ / 2, 22]);
    const specks = []; for (let i = 0; i < 16; i++) { const a = r() * TAU, d = Math.sqrt(r()) * 30; specks.push([SZ / 2 + Math.cos(a) * d, SZ / 2 + Math.sin(a) * d, 0.7 + r() * 1.2]); }
    const row = [];
    for (let v = 0; v < NV; v++) {
      const c = document.createElement("canvas"); c.width = c.height = SZ;
      const g = c.getContext("2d"), val = (v + 0.5) / NV;
      const shape = () => { g.beginPath(); for (const [x, y, rr] of discs) { g.moveTo(x + rr, y); g.arc(x, y, rr, 0, TAU); } };
      // soft-edged lumpy body, lighter on top, a darker belly, a few dark specks
      const gr = g.createLinearGradient(0, SZ * 0.2, 0, SZ * 0.85);
      gr.addColorStop(0, tone(Math.min(1, val * 1.1))); gr.addColorStop(0.55, tone(val)); gr.addColorStop(1, tone(val * 0.8));
      g.filter = "blur(2.2px)"; g.fillStyle = gr; shape(); g.fill(); g.filter = "none";
      g.fillStyle = tone(val * 0.4);
      for (const [x, y, rr] of specks.slice(0, 7)) { g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); }
      row.push(c);
    }
    SPR.push(row);
  }
  // the haze: a soft white disc (drawn additively, scaled by the lift)
  HAZE = document.createElement("canvas"); HAZE.width = HAZE.height = 128;
  const h = HAZE.getContext("2d"), hg = h.createRadialGradient(64, 64, 0, 64, 64, 64);
  hg.addColorStop(0, "rgba(255,255,255,1)"); hg.addColorStop(0.45, "rgba(255,255,255,0.8)"); hg.addColorStop(0.8, "rgba(255,255,255,0.25)"); hg.addColorStop(1, "rgba(255,255,255,0)");
  h.fillStyle = hg; h.fillRect(0, 0, 128, 128);
  return SPR;
}

// t: frame time (quantised). Draws the frame's measured puffs.
export function drawDust(ctx, t) {
  const C = DUST[t.toFixed(2)];
  if (!C || !C.length) return;
  const S = sprites();
  // puffs → haze (the source's cloud softens 65.64–65.80)
  const k = clamp((t - 65.62) / 0.18);
  ctx.save();
  C.forEach(([x, y, r, v, lift], i) => {
    if (k < 1) {
      const vi = Math.max(0, Math.min(NV - 1, Math.floor(v * NV)));
      const R = r * 3.1;
      ctx.globalAlpha = 0.85 * (1 - k); ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(S[i % NS][vi], x - R / 2, y - R / 2, R, R);
    }
    // the soft smoke between and round the puffs (all along), the whole cloud once it melts
    const kh = 0.35 + 0.65 * k;
    if (lift > 0.01) {
      const R = r * 3.0;
      ctx.globalAlpha = Math.min(1, lift * 1.1) * kh * (k > 0 ? 1 : 0.6); ctx.globalCompositeOperation = "lighter";
      ctx.drawImage(HAZE, x - R / 2, y - R / 2, R, R);
    }
  });
  ctx.restore();
}
export function releaseDust() { SPR = HAZE = null; }
