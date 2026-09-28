// s25 v3 (end targeted fix) — the four echo owls at the burst's onset (102.64–102.68), from the painted owl layers.
// On the source at 102.64 four big echo owls fly round the central owl in its light column, crisp, with short motion
// streaks; at 102.68 they close in with their bodies smeared ~250–300 px back along their paths. v2 drew them softened
// and translucent inside white puffs, so they read as smoke. Placements: the dive drawing (mirrored for the two on the
// right) fitted on each source frame by NCC of blurred grey over scale 0.55–2.2 and rotation −0.5…0.2
// (snapshots/end-s25-tfix-tools/fitowl.py), cross-checked on 0.8x grid crops; heads UL (638, 282), LL (716, 612),
// UR (1402, 416), LR (1602, 625) at 102.64; (846, 326), (875, 530), (1285, 410), (1431, 530) at 102.68.
// A smear = n copies of the owl layer from just behind the owl to the tail, summed ("lighter", weights → 1: an average,
// so the owl's own dark lines and headphones streak), laid over at the smear alpha; the owl itself on top.
// The smear frames after them (102.72–102.96) stay v2's (v2/burst.js): a larger smeared owl built here the same way
// (fitted ~1.4x, head ≈ (1070–1136, 352–394)) scored 0.3–1.3 worse on every frame (σ4) and did not read closer.
import { echoAffine } from "../v2/echo2.js";

const W = 2206, H = 946;
let TMP = null;
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

// [key ("|m" = mirrored), headX, headY, scale, rot, owl alpha, smear alpha, [tailDx, tailDy], n copies, blur px]
export const BURST3 = {
  2566: [
    ["dive", 638, 282, 0.8, 0, 0.8, 0.25, [-120, -30], 6],
    ["dive", 716, 612, 0.72, -0.1, 0.8, 0.25, [-120, 30], 6],
    ["dive|m", 1402, 416, 0.72, 0, 0.8, 0.25, [120, -25], 6],
    ["dive|m", 1602, 625, 0.72, 0, 0.8, 0.25, [120, 25], 6],
  ],
  2567: [
    ["dive", 846, 326, 0.82, 0, 0.5, 0.3, [-280, -30], 12],
    ["dive", 875, 530, 0.8, -0.1, 0.5, 0.3, [-280, 50], 12],
    ["dive|m", 1285, 410, 0.8, 0, 0.5, 0.3, [280, -20], 12],
    ["dive|m", 1431, 530, 0.8, 0, 0.5, 0.3, [280, 50], 12],
  ],
};
function place(key, hx, hy, s, rot) { return echoAffine(key.split("|")[0], hx, hy, s, rot, key.endsWith("|m")); }

export function drawBurst3(g, f, blit) {
  const rows = BURST3[f];
  if (!rows) return false;
  if (!TMP) TMP = mk(W, H);
  const tg = TMP.getContext("2d");
  for (const [key, hx, hy, s, rot, ac, as, [tx, ty], n, blur = 0] of rows) {
    // the smear: n copies from just behind the owl to the tail, summed with weights → 1 (an average)
    if (as > 0) {
      tg.setTransform(1, 0, 0, 1, 0, 0); tg.globalCompositeOperation = "source-over"; tg.globalAlpha = 1; tg.clearRect(0, 0, W, H);
      tg.globalCompositeOperation = "lighter";
      let wsum = 0; const ws = [];
      for (let k = 0; k < n; k++) { const w = 1 - (0.6 * k) / Math.max(1, n - 1); ws.push(w); wsum += w; }
      for (let k = n - 1; k >= 0; k--) {
        const u = (k + 1) / n;
        blit(tg, key.split("|")[0], place(key, hx + tx * u, hy + ty * u, s, rot), ws[k] / wsum);
      }
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = as;
      if (blur > 0) g.filter = `blur(${blur}px)`;
      g.drawImage(TMP, 0, 0);
      g.restore();
    }
    if (ac > 0) blit(g, key.split("|")[0], place(key, hx, hy, s, rot), ac);
  }
  return true;
}
export function releaseBurst3() { TMP = null; }
