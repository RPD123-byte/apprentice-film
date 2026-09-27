// End card (PLAN 136.0–140.8). Measured on the source: the card dissolves in over the sleeping room from 135.72 to 136.96
// along a measured per-frame curve (cardAlpha in ./s40/card.js; letters, sky and clouds at the same rate), so at the cut
// (136.0) it is already ~21% in.
// main.js's own xfade is a smoothstep that starts at the cut, so this shot does its own dissolve instead (xfade: 0):
// it paints the previous shot (s28) underneath and fades the card in at the measured rate. The 135.78–136.0 part
// lies inside s28's time; s28 can call overlayEndCard(ctx, t) from ./s40/card.js to match it.
// Static camera (camtrack s = 1.0000, drift < 0.2 px). The final fade to black is done here, before the grade (FADE_K).
import { W, H } from "../config.js";
import { paintCard, cardAlpha, CARD_FULL, releaseCard, grainBase } from "./s40/card.js";
import { drawGrain, drawGrainFaded, releaseGrain } from "./s40/grain.js";

// The shot underneath the dissolve, loaded with the shot table (a missing s28 just leaves black).
const prev = await import("./s28.js").then((m) => m.shot ?? m.s28 ?? null).catch(() => null);

// The final fade (fix pass 4). Measured per 25 fps frame, the source fades BEFORE its grade: its sky keeps its red while
// green and blue drop faster (sky ratios at 140.32 R/G/B 0.860 / 0.751 / 0.743), which is what a pre-grade darkening does
// through the S-curve, and its grain keeps the strength its grain-vs-brightness curve gives at the darkened brightness.
// So grade() leaves post.js's fade at 1, and draw() darkens the card by FADE_K (pre-grade) and adds the grain after that.
// FADE_K is the pre-grade factor whose graded least-squares alpha (owl masked, against the 139.80-140.16 mean, with the
// grade's flicker taken out) matches the source's: 0.948 / 0.879 / 0.807 / 0.725 / 0.637 / 0.544 / 0.454 / 0.368 / 0.364 /
// 0.285 / 0.210 / 0.143 / 0.081 / 0.028 at 140.24 ... 140.76 (140.52 and 140.56 are the same frame in the source).
const FADE_K = [[140.2, 1], [140.24, 0.929], [140.28, 0.8596], [140.32, 0.787], [140.36, 0.7167], [140.4, 0.643], [140.44, 0.568],
  [140.48, 0.498], [140.52, 0.419], [140.56, 0.4195], [140.6, 0.345], [140.64, 0.271], [140.68, 0.2], [140.72, 0.124],
  [140.76, 0.052], [140.8, 0]];
// the grain's strength through the fade, as a factor on the grain-vs-brightness curve, per source frame: the high-pass std
// of the top of the sky (x 800-1300, y 20-150) rendered / source, measured once (the sky's saturated orange reads a little
// off the card-wide curve at 100-150 levels)
const FADE_GRAIN = [[140.2, 1], [140.24, 0.98], [140.28, 0.94], [140.32, 0.98], [140.36, 0.92], [140.4, 0.87], [140.44, 0.85],
  [140.48, 0.86], [140.52, 0.96], [140.56, 0.98], [140.6, 1.06], [140.64, 1.04], [140.68, 0.985], [140.72, 0.97], [140.76, 0.94], [140.8, 0.94]];
const interp = (T, t) => {
  if (t <= T[0][0]) return T[0][1];
  if (t >= T[T.length - 1][0]) return T[T.length - 1][1];
  let i = 1; while (T[i][0] < t) i++;
  const [ta, a] = T[i - 1], [tb, b] = T[i];
  return a + (b - a) * (t - ta) / (tb - ta);
};
const fadeK = (t) => interp(FADE_K, t);

// Fix pass 5: over 138.6-139.2 the source's colours drift slightly and then hold: a least-squares per-channel fit of the
// 139.52-140.16 mean against the 137.6-138.40 mean (owl masked) gives graded R' = 0.988 R + 0.3, G' = 0.974 G + 2.8,
// B' = 0.965 B + 3.9 (the oranges lose ~2 of red and gain ~3 of blue, the lights darken ~2). Pre-grade (linearised through the
// grade's local slope) that is R' = 0.970 R + 2.0, G' = 0.962 G + 4.1, B' = 0.954 B + 5.4 levels; DRIFT is its progress, read
// off the frame-mean blue offset per source frame.
// (the final fade was fitted without it -- its own colour split covers those frames -- so it hands over to FADE_K by 140.36)
const DRIFT = [[138.6, 0], [138.72, 0.25], [138.88, 0.7], [139.04, 0.9], [139.2, 1.0], [139.52, 0.95], [139.84, 0.95], [140.0, 1.1], [140.2, 1.1], [140.36, 0]];
const DRIFT_A = [0.9696, 0.9618, 0.9542], DRIFT_B = [1.96, 4.11, 5.42];
function colourDrift(ctx, t) {
  const k = interp(DRIFT, t);
  if (k <= 0) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = `rgb(${DRIFT_A.map((v) => Math.round(255 * (1 - k * (1 - v)))).join(",")})`; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = `rgb(${DRIFT_B.map((v) => Math.round(k * v)).join(",")})`; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

let layer = null;
export const s40 = {
  id: "s40-endcard",
  start: 136.0,
  end: 140.8,
  xfade: 0,
  draw(ctx, local, t) {
    const a = cardAlpha(t);
    if (a >= 1 || t >= CARD_FULL) {
      paintCard(ctx, t);
      colourDrift(ctx, t);
      const kf = fadeK(t);
      if (kf >= 1) { drawGrain(ctx, t, grainBase, 1); return; }
      // final fade: darken the card before the grade, then the grain at the darkened brightness
      // (a touch more red is kept and a touch more blue lost than a neutral darkening gives: sky R/B ratios 0.683/0.600
      // against the source's 0.695/0.579 at 140.40 with a neutral one)
      const c = (e) => Math.round(255 * Math.pow(kf, e));
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = `rgb(${c(0.975)},${c(1)},${c(1.045)})`; ctx.fillRect(0, 0, W, H); ctx.restore();
      drawGrainFaded(ctx, t, grainBase, kf, interp(FADE_GRAIN, t));
      return;
    }
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
    // the card's own grain comes in with the card (its variance at the card's alpha; post.js's grain carries the rest)
    drawGrain(ctx, t, grainBase, a);
  },
  // Grain: the source's is isotropic 2–3 px blotches; post.js's is pixel-fine and streaks along x, so once the card is
  // up post.js's grain is off and grain.js draws the card's own (matched to the source's grain-vs-brightness curve).
  // During the dissolve post.js's grain fades out as the card's fades in (variances cross linearly), and the halo blends
  // from the room's grade (s28's own, or the default) to the card's at the card's alpha, so nothing jumps at the cut.
  grade(local, t) {
    const a = cardAlpha(t);
    let g = {};
    if (a < 1 && prev && typeof prev.grade === "function") { try { g = prev.grade(t - (prev.start ?? 129.3), t) ?? {}; } catch (e) { g = {}; } }
    const halo0 = g.halo ?? 0.5, grain0 = g.grain ?? 6 / 255;
    // fade: 1 -- the card does its own final fade, before the grade (see FADE_K)
    return { halo: halo0 + (0.5 - halo0) * a, grain: grain0 * Math.sqrt(Math.max(0, 1 - a)), fade: 1 };
  },
  release() { layer = null; releaseCard(); releaseGrain(); },
};
