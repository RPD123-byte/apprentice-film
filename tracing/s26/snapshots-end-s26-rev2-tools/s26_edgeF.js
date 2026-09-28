// s26 (110.52–117.52) — the shattered page blows out into colour and the finished colour site is revealed.
// End fix round 1 (2026-09-27): per the user's decision for the colour ending (STYLE.md), everything in this shot except
// the standing owl of beat A is TRACED from the source — vector traces (colour regions + ink lines, stored as numbers /
// polygon strings in s26/*.js and painted by code; no source pixels). See fidelity/s26.md for method and numbers.
// End fix round 2: every traced colour (and s26's copy of the colour page) goes through a measured tone lift
// (s26/tone.js; the traces were 4–10 code values dark in the midtones); the jolt frame shows the source's owl; 111.60 is
// its own key with a tight owl zone; the lens shard's last tail at 114.16; the source's once-a-second held frames hold.
// Beats (film time, measured on the source frame by frame):
//   A 110.52–111.52  the cracked page on the lit screen (crack web, impact stars, stuck scissors, the owl's shadow, room
//                    glow: one trace of the median A frame, s26/pageKeyA.js) under s25's own standing owl drawing (so
//                    the owl is the same on both sides of the 110.52 cut). Camera: the ORB zoom s 1.0029 → 1.0 about
//                    (1150, 950).
//   B 111.56         the jolt frame: the page thrown up and shrunk (x' = 0.9911x − 8.5, y' = 0.9905y − 19.6), no glow,
//                    and the source's own owl (in the traced key) instead of s25's drawing.
//   C 111.60–112.68  the blast: the shard field traced at key frames (s26/fieldKeysC.js, owl and scissors removed) and
//                    carried by the field's measured affine (s26/fieldCam.js); 111.60 (the first blast frame) and 111.80
//                    (the shake) are their own keys; the
//                    flung scissors (s26/scissorsTrace.js) and the white owl throwing its wings open
//                    (s26/owlTraceCD.js) traced on every frame.
//   D 112.72–113.64  the colour page arrives (hippie pageArrival) through the ring of B&W shards, traced at key frames
//                    (s26/ringKeysD.js) and carried by the ring's measured zoom RING_D; the white owl hovering over the
//                    designer and the scissors traced per frame.
//   E 113.68–114.16  the huge out-of-focus shard across the lens and the ring's last shards, traced per frame
//                    (s26/lensTraceE.js; the lens shard traced coarse from a blurred copy and painted blurred; 114.16 is
//                    its last dark tail over the top-right corner).
//   F 114.08–117.52  the colour owl (cream, orange headphones — the same character as s27 / s40) climbs to the top-right
//                    box by the nav and perches: traced per frame (s26/owlTraceF.js) over the settling colour page.
import { hippiePageCanvas, pageArrival, releaseHippie } from "/src/lib/hippie.js";
import { rng } from "/src/lib/rng.js";
import { FIELD_CAM } from "/src/shots/s26/fieldCam.js";
import { tracedLayer, paintTrace, toneMap } from "/src/shots/s26/trace.js";
import { TONE } from "/src/shots/s26/tone.js";
import { PAGEA } from "/src/shots/s26/pageKeyA.js";
import { FIELDK, FIELDK_KEYS } from "/src/shots/s26/fieldKeysC.js";
import { FIELDK90 } from "/src/shots/s26/fieldKey2790.js";
import { RINGK, RINGK_KEYS } from "/src/shots/s26/ringKeysD.js";
import { LENS_E, LENS_E_F0 } from "/src/shots/s26/lensTraceE.js";
import { OWL_CD, OWL_CD_F0 } from "/src/shots/s26/owlTraceCD.js";
import { OWL_F, OWL_F_F0 } from "/src/shots/s26/owlTraceF.js";
import { SC_T, SC_T_F0 } from "/src/shots/s26/scissorsTrace.js";
// beat A's owl is s25's standing drawing (read-only imports from s25's own modules), so the same drawing is on both
// sides of the 110.52 cut (the source only un-squashes the frame there)
import { paintDrawing, blitLayer } from "/src/shots/s25/v2/draw.js";
import { DRAW } from "/src/shots/s25/v2/drawings.js";
import { SCHED, SCHED_F0 } from "/src/shots/s25/v2/sched.js";
import { HEAD, HEAD_F0 } from "/src/shots/s25/v2/headtrack.js";
import { face, headphonesBack, headphonesFront, headOutline } from "/src/shots/s25/v2/head.js";
import { D_HEAD } from "/src/shots/s25/v2/data/head.js";
import { W, H } from "/src/config.js";

const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
let C = null; // caches, built lazily inside draw
const caches = () => (C || (C = {}));
// the tone lift (s26/tone.js): AE on the traces of beats A-E, F on the colour owl and the colour page
const tone = (k) => { const c = caches(); return c["tone" + k] || (c["tone" + k] = toneMap(TONE[k])); };
const FR = (t) => Math.round(t * 25); // source frame index
const mat = (m) => new DOMMatrix([m[0], m[3], m[1], m[4], m[2], m[5]]);

// piecewise-linear keys [[t, a, b, ...], ...]
function interp(keys, t) {
  if (t <= keys[0][0]) return keys[0].slice(1);
  const n = keys.length;
  if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0;
  while (keys[i + 1][0] < t) i++;
  const a = keys[i], b = keys[i + 1], u = (t - a[0]) / (b[0] - a[0]);
  return a.slice(1).map((v, k) => v + (b[k + 1] - v) * u);
}
// the nearest key frame (ties to the earlier one)
function nearestKey(keys, F) {
  let K = keys[0];
  for (const k of keys) if (Math.abs(k - F) < Math.abs(K - F)) K = k;
  return K;
}
// a traced frame painted once into a cached full-frame canvas (opaque black under it, or transparent)
function keyCanvas(slot, fr, opaque) {
  const c = caches();
  if (c[slot + "K"] !== fr) {
    if (!c[slot]) c[slot] = mk(W, H);
    const g = c[slot].getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    if (opaque) { g.fillStyle = "#000"; g.fillRect(0, 0, W, H); }
    paintTrace(g, fr, { col: tone("AE") });
    c[slot + "K"] = fr;
  }
  return c[slot];
}
// a per-frame traced layer (owl, scissors), feathered at its zone's edge
function layer(slot, frames, F0, F, feather, po) {
  const i = Math.min(frames.length - 1, Math.max(0, F - F0)), c = caches();
  if (!c[slot]) c[slot] = {};
  if (c[slot + "F"] !== i) { tracedLayer(frames[i], W, H, c[slot], feather, po); c[slot + "F"] = i; }
  return c[slot].c;
}
// the colour page (s26's own copy with the F tone lift, built once) under a page->frame similarity
const PM = 32; // review variant: the page's edges mirrored out by PM px, so the settling page (s < 1) never shows black
function colourPage() {
  const c = caches();
  if (!c.page) {
    const p = hippiePageCanvas(), w = p.width, h = p.height;
    const e = mk(w + 2 * PM, h + 2 * PM), g = e.getContext("2d");
    g.drawImage(p, PM, PM);
    g.save(); g.translate(PM, 0); g.scale(-1, 1); g.drawImage(p, 0, 0, PM, h, 0, PM, PM, h); g.restore();
    g.save(); g.translate(PM + w, 0); g.scale(-1, 1); g.drawImage(p, w - PM, 0, PM, h, -PM, PM, PM, h); g.restore();
    const r = mk(e.width, e.height); r.getContext("2d").drawImage(e, 0, 0);
    g.save(); g.translate(0, PM); g.scale(1, -1); g.drawImage(r, 0, PM, e.width, PM, 0, 0, e.width, PM); g.restore();
    g.save(); g.translate(0, PM + h); g.scale(1, -1); g.drawImage(r, 0, h, e.width, PM, 0, -PM, e.width, PM); g.restore();
    c.page = e; tone("F").canvas(c.page);
  }
  return c.page;
}
function drawColourPage(ctx, s, tx, ty, margin = false) {
  ctx.save();
  ctx.setTransform(s, 0, 0, s, tx, ty);
  ctx.imageSmoothingQuality = "high";
  // D/E: the page's edge is a real edge (the ring / black round it), so only the page itself; F: with the mirrored margin
  if (margin) ctx.drawImage(colourPage(), -PM, -PM);
  else ctx.drawImage(colourPage(), PM, PM, colourPage().width - 2 * PM, colourPage().height - 2 * PM, 0, 0, colourPage().width - 2 * PM, colourPage().height - 2 * PM);
  ctx.restore();
}

// ================================================================ A / B: the cracked page on the screen
// Everything in A is drawn in STAGE px = the pre-squash frame of s25 (s25 squashes its whole frame vertically by 0.9836
// at 108.08; the source un-squashes at the 110.52 cut). The A camera (ORB affine against the pre-squash frame 107.88,
// per frame): s 1.0029 at 110.52 easing to 1.0 by 111.52, fixed point ≈ (1150, 950).
const CAM_A = [[110.52, 1.0029], [110.64, 1.0027], [110.8, 1.0015], [111.0, 1.0008], [111.2, 1.0006], [111.4, 1.0003], [111.52, 1.0]];
// The page, cracks, stars, stuck scissors, the owl's shadow: PAGEA[0], the median of the 26 A frames moved to the
// settled camera, traced (stage px). The room glow round the screen: PAGEA[1], traced from a blurred copy in fine tone
// steps and softened 4 px (traced with the page it came out in visible bands). The jolt frame (B) has no room light:
// the page alone, clipped to the screen (stage x 143–2020, y 128–914, measured on the median and on 111.56).
// (The source's own owl is in the traced key too. Drawn without s25's drawing on top, A scores 2.71 against 3.05 at
// σ8, but then the owl would change design at the 110.52 cut, since s25 draws its own. So s25's drawing is on top.)
const SCREEN_A = [143, 128, 1877, 786];
const A_OWL_FROM_S25 = true;
function stageA(glow) {
  const c = caches(), k = glow ? "frameA" : "jolt";
  if (!c[k]) {
    c[k] = mk(W, H); const g = c[k].getContext("2d");
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    if (glow) {
      const t = mk(W, H), q = t.getContext("2d");
      q.fillStyle = "#000"; q.fillRect(0, 0, W, H); paintTrace(q, PAGEA[1], { col: tone("AE") });
      g.save(); g.beginPath(); g.rect(0, 0, W, H); g.rect(...SCREEN_A); g.clip("evenodd");
      g.filter = "blur(4px)"; g.drawImage(t, 0, 0); g.filter = "none"; g.restore();
    }
    g.save(); g.beginPath(); g.rect(...SCREEN_A); g.clip();
    paintTrace(g, PAGEA[0], { col: tone("AE") });
    g.restore();
    // s25's owl drawing only in A: the jolt frame shows the source's own owl, which is in the traced key (the owl's
    // redesign then lands on the jolt, the first frame of the blow-out, instead of on the 110.52 cut). Once s25 draws the
    // traced owl up to its cut too, set A_OWL_FROM_S25 = false and A shows the traced owl as well (σ4 on the owl 5.1 → 2.85).
    if (glow && A_OWL_FROM_S25) g.drawImage(owlAStage(), 0, 0);
  }
  return c[k];
}
function drawA(ctx, t) {
  const [s] = interp(CAM_A, t);
  ctx.save();
  ctx.setTransform(s, 0, 0, s, (1 - s) * 1150, (1 - s) * 950);
  ctx.drawImage(stageA(1), 0, 0);
  ctx.restore();
}

// The standing owl of beat A is s25's own drawing of this pose (s25/v2: the "hips2" body drawing and the head layer
// with sly eyes), placed with s25's measured affines of its last frame (110.48, F2762) in stage px. s25 then squashes
// its whole frame by 0.9836; the source un-squashes at the cut and the owl holds (its head and body move with the
// page to < 2 px through A), so drawing it here un-squashed gives the identical owl on both sides of the cut.
const A_F = 2762;
function owlAStage() {
  const c = caches();
  if (!c.owlAS) {
    c.owlAS = mk(W, H);
    const g = c.owlAS.getContext("2d");
    const row = SCHED[Math.min(SCHED.length - 1, A_F - SCHED_F0)];
    blitLayer(g, paintDrawing(DRAW[row[0]]), row.slice(1));
    const HL = paintDrawing(D_HEAD, { bb: [900, 250, 1285, 560], pre: headphonesBack, post: (q) => { headOutline(q, D_HEAD.hull); face(q, "sly"); headphonesFront(q); }, fade: [522, 552] });
    blitLayer(g, HL, HEAD[Math.min(HEAD.length - 1, A_F - HEAD_F0)]);
  }
  return c.owlAS;
}


// ================================================================ C: the blast
// The shard field (with the frame's speed lines and the blast's white streaks) is the source's own, traced at key
// frames with the owl and the scissors removed (s26/fieldKeysC.js), carried to each frame by the field's measured
// affine FIELD_CAM (key -> frame). 111.80 is a double-exposed shake frame: its own key, drawn as traced. 111.60 (the first
// blast frame, the owl still standing) is its own key too (s26/fieldKey2790.js): key 2792's filled owl hole left a dark
// smear round the standing owl there.
const SHAKE_F = 2795, BLAST_F = 2790;
function drawFieldC(ctx, F) {
  const Fc = Math.min(2817, Math.max(2790, F));
  if (Fc === BLAST_F) { ctx.drawImage(keyCanvas("fk", FIELDK90[0], true), 0, 0); return; }
  const K = Fc === SHAKE_F ? SHAKE_F : nearestKey(FIELDK_KEYS.filter((k) => k !== SHAKE_F), Fc);
  const M = mat(FIELD_CAM.cam[Fc]).multiply(mat(FIELD_CAM.cam[K]).inverse());
  ctx.save();
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  ctx.setTransform(M); ctx.imageSmoothingQuality = "high";
  ctx.drawImage(keyCanvas("fk", FIELDK[FIELDK_KEYS.indexOf(K)], true), 0, 0);
  ctx.restore();
}
// the two flung pairs of scissors with their loop echoes (111.60–113.68) and the white owl (111.60–113.92), traced on
// every source frame
function scissorsT(ctx, F) {
  if (F < SC_T_F0 || F >= SC_T_F0 + SC_T.length) return;
  ctx.drawImage(layer("scT", SC_T, SC_T_F0, F, 3, { col: tone("AE") }), 0, 0);
}
const owlCD = (F) => layer("owlCD", OWL_CD, OWL_CD_F0, F, 3, { col: tone("AE") });
function paintC(ctx, F) {
  drawFieldC(ctx, F);
  scissorsT(ctx, F);
  ctx.drawImage(owlCD(F), 0, 0);
}

// ================================================================ D: the colour page arrives through the ring
// RING_D: the ring's own motion per source frame, measured (ORB similarity frame to frame on the ring, left and right
// halves, chained): zoom s and translation (tx, ty) relative to 112.72 — it creeps out slowly, then accelerates (1.09 by
// 113.28, 1.33 by 113.68).
const RING_D = [[2818, 1.0, 0.0, 0.0],
   [2819, 1.0021, 4.7, -1.4],
   [2820, 1.0033, 4.9, 1.5],
   [2821, 1.0065, 0.8, 1.2],
   [2822, 1.0119, -5.9, 0.0],
   [2823, 1.0173, -10.0, -2.4],
   [2824, 1.0206, -10.8, -4.5],
   [2825, 1.0234, -14.2, -3.2],
   [2826, 1.0292, -22.1, -8.8],
   [2827, 1.0358, -25.8, -13.4],
   [2828, 1.0431, -32.6, -15.9],
   [2829, 1.0508, -40.4, -19.4],
   [2830, 1.0629, -49.5, -26.2],
   [2831, 1.0764, -62.3, -33.6],
   [2832, 1.0896, -78.2, -38.5],
   [2833, 1.1036, -94.0, -46.2],
   [2834, 1.1227, -112.0, -57.0],
   [2835, 1.1418, -132.1, -65.8],
   [2836, 1.1627, -154.9, -77.5],
   [2837, 1.1847, -177.8, -86.5],
   [2838, 1.2124, -206.2, -102.2],
   [2839, 1.2124, -206.2, -102.3],
   [2840, 1.2406, -236.7, -115.8],
   [2841, 1.2765, -275.5, -134.2],
   [2842, 1.3215, -326.1, -155.8],
   [2843, 1.3682, -372.1, -181.4],
   [2844, 1.3736, -374.2, -188.1],
   [2845, 1.376, -372.1, -192.9],
   [2846, 1.3791, -373.2, -197.2],
   [2847, 1.3838, -374.3, -209.6],
   [2848, 1.4456, -429.8, -270.6],
   [2849, 1.4504, -434.9, -270.9],
   [2850, 1.4526, -435.2, -272.7],
   [2851, 1.4572, -440.6, -275.1]];
// The ring (and the owl's dark motion ghost) is the source's own, traced at key frames with the owl and the scissors
// removed, transparent where the arriving page shows (s26/ringKeysD.js), carried to each frame by RING_D (key -> frame).
function drawRingKeys(ctx, F) {
  const Fc = Math.min(2841, Math.max(2818, F)), K = nearestKey(RINGK_KEYS, Fc);
  const [s1, x1, y1] = interp(RING_D, K), [s2, x2, y2] = interp(RING_D, Fc), k = s2 / s1;
  ctx.save(); ctx.setTransform(k, 0, 0, k, x2 - k * x1, y2 - k * y1); ctx.imageSmoothingQuality = "high";
  ctx.drawImage(keyCanvas("rk", RINGK[RINGK_KEYS.indexOf(K)], false), 0, 0); ctx.restore();
}
function paintD(ctx, t, F) {
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const A = pageArrival(Math.max(112.7, t));
  drawColourPage(ctx, A.s, A.tx, A.ty);
  drawRingKeys(ctx, F);
  scissorsT(ctx, F);
  ctx.drawImage(owlCD(F), 0, 0);
}

// ================================================================ E: the out-of-focus shard across the lens
// 113.68–114.12 (F2842–2853): a huge B&W shard right at the lens, far out of focus, sweeps from the lower left to the
// upper right. Per source frame (s26/lensTraceE.js): [back] the ring's last shards, [front] the lens shard, traced coarse
// from a blurred copy and painted blurred 7 px over the owls.
function paintE(ctx, t, F) {
  const E = LENS_E[Math.min(LENS_E.length - 1, Math.max(0, F - LENS_E_F0))];
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  const A = pageArrival(Math.max(112.7, t));
  drawColourPage(ctx, A.s, A.tx, A.ty);
  paintTrace(ctx, E[0], { col: tone("AE") });
  scissorsT(ctx, F);
  if (F <= 2848) ctx.drawImage(owlCD(F), 0, 0);
  if (F >= 2852) ctx.drawImage(owlF(F), 0, 0);
  const c = caches();
  if (!c.lensE) c.lensE = mk(W, H);
  const g = c.lensE.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
  paintTrace(g, E[1], { seam: 1.5, col: tone("AE") });
  ctx.save(); ctx.filter = "blur(7px)"; ctx.drawImage(c.lensE, 0, 0); ctx.restore();
}

// ================================================================ F: the colour owl over the settling page
// the colour owl, traced on every source frame 114.08–117.48 (s26/owlTraceF.js); its traced ink lines at 0.75 opacity
// (traced at full strength they read as a heavy brown-black contour next to the source's thin line)
const owlF = (F) => layer("owlF", OWL_F, OWL_F_F0, F, 1.5, { col: tone("F"), inkAlpha: 0.75 });
// the fine white glitter the owl sheds as it climbs (115.28–115.96): each source frame from 115.28 to 115.72 drops a
// seeded puff of 1–2 px specks round the owl's lower body, which stay where they fell, sink a little and fade over 6
// frames. GLITTER_BODY: [F, x, y, rx, ry] of the owl's body (measured in the earlier fix passes)
const GLITTER_BODY = [[2882,1488.3,429.7,83,106.7],[2883,1499.4,419.1,83,104.1],[2884,1509.6,403.1,82.1,101.6],[2885,1518.2,383.6,80.4,97.5],[2886,1536.1,367.8,78.4,93.8],[2887,1563.4,357.9,76.2,90.4],[2888,1582.6,349,74.6,88.7],[2889,1595.3,338.9,73.8,87.1],[2890,1608,327.9,73.1,83.8],[2891,1624.4,318.2,70.4,81.6],[2892,1644,308.1,65.9,79.7],[2893,1661.6,294.5,63.4,77.6]];
function drawGlitter(ctx, F) {
  ctx.save(); ctx.fillStyle = "#fffaf0";
  for (let e = Math.max(2882, F - 6); e <= Math.min(2893, F); e++) {
    const [, bx, by, rx, ry] = GLITTER_BODY[e - 2882], age = F - e, r = rng(9000 + e);
    ctx.globalAlpha = 0.75 * (1 - age / 7);
    for (let i = 0; i < 40; i++) {
      const u = r(), v = r(), x = bx + (u * 2.6 - 2.2) * rx, y = by + (-0.2 + v * 2.2) * ry + age * 1.5, sz = 1 + r() * 1.2;
      ctx.fillRect(x, y, sz, sz);
    }
  }
  ctx.restore();
}
function paintF(ctx, t, F) {
  const A = pageArrival(t);
  drawColourPage(ctx, A.s, A.tx, A.ty, true);
  drawGlitter(ctx, F);
  ctx.drawImage(owlF(F), 0, 0);
}

const HOLDS = new Set([2814, 2839, 2864, 2889, 2914]);
export const shot = {
  draw(ctx, local, t0) {
    // snap to the source frame: exact at the render's k/25 times, and it pairs tools/compare.sh (whose seeks land up
    // to 1/30 s early) with the right source frame (same rule as s25)
    let t = Math.ceil(t0 * 25 - 0.001) / 25, F = FR(t);
    // the source repeats one frame a second here (a 24 -> 25 fps pulldown): 112.56, 113.56, 114.56, 115.56, 116.56 are
    // exact copies of the frame before, so every layer holds too
    if (HOLDS.has(F)) { F -= 1; t = F / 25; }
    if (F <= 2788) { drawA(ctx, t); return; }
    if (F === 2789) {
      // B (111.56): the jolt frame — the page thrown up and shrunk (affine vs stage: x' = 0.9911x − 8.5,
      // y' = 0.9905y − 19.6), the room light gone
      ctx.save(); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      ctx.setTransform(0.9911, 0, 0, 0.9905, -8.5, -19.6); ctx.drawImage(stageA(0), 0, 0); ctx.restore();
      return;
    }
    if (F <= 2817) { paintC(ctx, F); return; }
    if (F <= 2841) { paintD(ctx, t, F); return; }
    if (F <= 2854) { paintE(ctx, t, F); return; }   // 2854: the lens shard's last dark tail (s26/lensTraceE.js)
    paintF(ctx, t, F);
  },
  release() { C = null; releaseHippie(); },
};

