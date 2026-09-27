// s17 — 47.84–53.24: his site full-frame (MIXING DOWN, LATE AT NIGHT.), with the owl inside the illustration.
// Camera: the shot opens 1.97x in on the page and pulls back to 1:1 by 48.56 (ORB track of the source, fixed point
// (865, 341) page px), then holds; the headline fades in over the pull-back (47.78–48.16).
// Page: the sōko foundation's illustration (F1, sokoIll.js, gaze "owl"), built layer by layer by s17/page.js with this
// shot's own repaints of the designer (s17/designer.js: hair, eyes, sweat, face shading, the headphones round his
// neck, the shirt and the laptop's bloom, engraved trousers, boots) and of some gear (s17/gear.js: looping cables, the
// backpack, the gear's contrast); this shot's mug, the traced steam (s17/steam.js) and his head turn after the owl
// (52.80–53.20).
// Owl (s17/owl.js + s17/owlDraw.js): clinging to the desk edge by the mug, it spreads its wings and rises upright
// (on twos, 49.12–52.44), then launches and dashes off to the left, flapping (on ones, 52.52–53.20). Poses are
// measured key poses; each drawing's silhouette, wing outlines and the dash's face are traced from the source
// (s17/trace/*.py -> sil_data.js, wing_data.js, and tables in owl.js): centre lines and outlines only, no pixels.
// Fix pass 1 (this cycle): the pull-back at 1:1 page resolution with an 11-tap shutter; the opening zoom re-measured;
// flat concentric face-on cups, unevenly spaced side-on cup rings, small grey dash / launch bills, the launch eyes, the
// feathers' outlined tips and belly keyline, the tracer's junction slit filled; the page repaints above; the steam's
// values keyed per strand. Fix pass 2: the trousers re-engraved as straight strands along each leg with the plate's lit
// fold planes (s17/legs.js); crisp shirt folds, shoulder outlines and a brighter shirt, heavier lids set lower; the amp's
// dark side, the pedals, the patch cables, the right speaker's shorter cabinet, thick mixer cables, ribbed backpack
// straps; the dash's headband hugging the crown (no dangling band, no stroke down the face); smooth launch cups, brow
// arcs, ink-weighted keylines and feet; hand-set steam values; the headline fade re-fitted. See fidelity/s17.md.
import { PAGE_W, PAGE_H } from "../lib/sites.js";
import { drawS17Page, headPatch, HEAD_BOX, releaseS17Page } from "./s17/page.js";
import { owlFrame, drawTick } from "./s17/owl.js";
import { drawOwlS17 } from "./s17/owlDraw.js";
import { drawSteam } from "./s17/steam.js";

// zoom relative to the settled page, one sample per source frame (ORB + RANSAC against 48.80, owl and steam masked;
// fixed point (865, 341) page px). Local -0.04 = 47.80, the frame s16 borrows from this shot. (fix pass 1) 47.80 /
// 47.84 / 47.88 re-measured against 47.92 and 47.96 (the blurred first frames fit poorly against 48.80): 2.150 / 1.966 /
// 1.786 (were 2.172 / 1.953 / 1.776).
const Z = [[-0.04, 2.150], [0, 1.966], [0.04, 1.786], [0.08, 1.6346], [0.12, 1.5126], [0.16, 1.4111], [0.2, 1.3299], [0.24, 1.2619],
  [0.28, 1.207], [0.32, 1.1592], [0.36, 1.122], [0.4, 1.0911], [0.44, 1.0673], [0.48, 1.0471], [0.52, 1.0319], [0.56, 1.0204],
  [0.6, 1.0124], [0.64, 1.0066], [0.68, 1.0029], [0.72, 1.0]];
const FX = 865, FY = 341;
function zoomAt(t) {
  if (t <= Z[0][0]) return Z[0][1];
  for (let i = 1; i < Z.length; i++) if (t <= Z[i][0]) { const [a, va] = Z[i - 1], [b, vb] = Z[i]; return va + (vb - va) * ((t - a) / (b - a)); }
  return 1;
}

// 52.80–53.20: he turns his head a little toward the owl dashing off to the left (template matches of the source
// against 52.72, 8x): the head slides left (HEAD_DX) and the irises a little further (EYE_DX, relative to the head).
const HEAD_DX = [[52.8, -0.25], [52.84, -1.0], [52.88, -2.0], [52.92, -2.5], [52.96, -3.0], [53.0, -3.5], [53.08, -3.6], [53.12, -3.75]];
const EYE_DX = [[52.8, -0.55], [52.84, -0.9], [52.88, -1.05], [52.92, -1.1], [52.96, -1.2]];
const stepAt = (T, t) => { let v = 0; for (const [a, d] of T) if (t >= a - 1e-6) v = d; return v; };

// The opening: the headline (with the counter and key: the page's UI) fades in over 47.78–48.16 while the picture is
// already at full light (source/ours graded ratio on the letters, converted to pre-grade alpha through the film's
// S-curve; the DO NOT KNOCK plate under it measures steady). Frame times -> alpha. (fix pass 2) 47.88–48.12 re-fitted on
// the letters' mean (x 0–340, y 0–110) at exact frame times: within ~2 of the source's (were 4–6 dim at 47.92–48.04).
const HEAD_A = [[47.76, 0], [47.8, 0.07], [47.84, 0.21], [47.88, 0.45], [47.92, 0.62], [47.96, 0.73], [48.0, 0.84], [48.04, 0.92], [48.08, 0.97], [48.12, 0.98], [48.16, 1]];
function ramp(T, t) {
  if (t <= T[0][0]) return T[0][1];
  for (let i = 1; i < T.length; i++) if (t <= T[i][0] + 1e-6) { const [a, va] = T[i - 1], [b, vb] = T[i]; return va + (vb - va) * (t - a) / (b - a); }
  return 1;
}
// near the end of the pull-back (zoom < 1.04, 48.40 on) the composite takes the less-softened page, like the direct frames after it
function drawPageOpening(g, t, z = 2) { drawS17Page(g, ramp(HEAD_A, t), z < 1.04); }

// The pull-back carries a radial motion smear in the source, and its first frames are an upscaled picture. (fix pass 1)
// The page + steam + owl are composited once per frame at 1:1 page resolution (the source's zoomed frames are
// upscales of the page, not sharper redraws: at 2x the render measured 1.2–1.33x the source's Laplacian sharpness at
// 47.92–48.00 and 1.5–2.0x beyond 800 px from the zoom's centre), then averaged over NBLUR zooms spread across a
// SHUTTER of film time (11 taps over 7.8 ms: a continuous smear; pass 4's 3 taps over 5 ms stepped into ghost copies).
// Laplacian sharpness render/source 47.84–48.56: 0.85–1.02 overall (was 0.83–1.33), 0.85–1.12 beyond 800 px from the
// zoom's centre (was 0.92–2.0); no step at the switch to direct drawing.
const SHUTTER = 0.0078, NBLUR = 11;
// (fix pass 1) In the source's first frames his head's darks are lifted and settle over ~0.5 s (the beanie graded 71 /
// 63 / 60 / 59 / 54 / 52 / 49 at 47.84 / 47.88 / 47.92 / 48.00 / 48.12 / 48.20 / 48.56, the hair 28 -> 23, while the
// wall, the gear and the trousers round him hold steady; a global lift measured worse): a gamma on the composite's
// pre-grade values inside a feathered box round his head (page x 975–1165, y 150–390), black kept black.
const GAMMA = [[-0.04, 0.7], [0, 0.75], [0.04, 0.82], [0.08, 0.85], [0.16, 0.86], [0.28, 0.9], [0.36, 0.94], [0.48, 0.98], [0.6, 1]];
function gammaAt(l) { return l <= GAMMA[0][0] ? GAMMA[0][1] : l >= GAMMA[GAMMA.length - 1][0] ? 1 : ramp(GAMMA, l); }
const HEAD_LIFT = [975, 150, 1165, 390, 18];
function applyGamma(g, gm) {
  const [x0, y0, x1, y1, f] = HEAD_LIFT, X0 = x0 - f, Y0 = y0 - f, w = x1 - x0 + 2 * f, h = y1 - y0 + 2 * f;
  const lut = new Float32Array(256); for (let i = 0; i < 256; i++) lut[i] = 255 * Math.pow(i / 255, gm);
  const id = g.getImageData(X0, Y0, w, h), d = id.data;
  const sm = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  for (let j = 0; j < h; j++) {
    const wy = sm(Math.min(j, h - 1 - j) / f);
    for (let i = 0; i < w; i++) {
      const k = wy * sm(Math.min(i, w - 1 - i) / f); if (k <= 0) continue;
      const o = (j * w + i) * 4;
      for (let c = 0; c < 3; c++) { const v = d[o + c]; d[o + c] = v + (lut[v] - v) * k; }
    }
  }
  g.putImageData(id, X0, Y0);
}
let COMP = null;
function composite(t, local) {
  if (!COMP) { COMP = document.createElement("canvas"); COMP.width = PAGE_W; COMP.height = PAGE_H; }
  const g = COMP.getContext("2d", { willReadFrequently: true });
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  g.imageSmoothingQuality = "high";
  drawPageOpening(g, t, zoomAt(local));
  drawSteam(g, drawTick(t));
  const p = owlFrame(t);
  if (p) drawOwlS17(g, { ...p, res: 1 });
  const gm = gammaAt(local);
  if (gm < 0.999) applyGamma(g, gm);
  return COMP;
}

function openGain(local) { return local < 0 ? 1.02 + 0.06 * Math.min(1, -local / 0.04) : 1 + 0.02 * Math.max(0, 1 - local / 0.16); }
let SOFT = null;
function softCanvas() {
  if (!SOFT) { SOFT = document.createElement("canvas"); SOFT.width = PAGE_W; SOFT.height = PAGE_H; }
  return SOFT.getContext("2d");
}
// the composite path runs through 48.44 (zoom 1.012); from 48.48 the page is drawn directly, a hair off 1:1 until
// 48.56, with the less-softened page (fix pass 1: pass 4 switched at 48.56 with a 4 % sharpness step)
const DIRECT = 0.64 - 1e-6;

export const shot = {
  draw(ctx, local, t0) {
    // the source is drawn per frame: snap to the frame. ceil(t*25 - 0.01) is right both for exact n/25 seeks and for
    // the snapshot tool's 30 fps-floored seeks (same convention as s16).
    const t = Math.ceil(t0 * 25 - 0.01) / 25;
    local = t - 47.84;
    const z = zoomAt(local);
    if (local < DIRECT) {
      const comp = composite(t, local);
      // 47.80 (drawn for s16, the fastest frame of the zoom) is softer still in the source: a 1 px gaussian
      const sig = local < 0 ? 1.0 : 0;
      const dst = sig > 0 ? softCanvas() : ctx;
      if (sig > 0) { dst.setTransform(1, 0, 0, 1, 0, 0); dst.globalAlpha = 1; dst.fillStyle = "#000"; dst.fillRect(0, 0, PAGE_W, PAGE_H); }
      dst.save();
      dst.imageSmoothingQuality = "high";
      for (let i = 0; i < NBLUR; i++) {
        const zi = zoomAt(local + (i / (NBLUR - 1) - 0.5) * SHUTTER);
        dst.setTransform(zi, 0, 0, zi, FX - zi * FX, FY - zi * FY);
        dst.globalAlpha = 1 / (i + 1);
        dst.drawImage(comp, 0, 0, PAGE_W, PAGE_H);
      }
      dst.restore();
      // (an earlier fix pass) the source's first frames are a little brighter in the mid-tones and highlights (graded
      // frame means 55.8 / 49.3 / 51.7 against 48.7 / 46.4 / 49.0 at 47.80 / 47.84 / 48.00): a gain of 1.08 at 47.80,
      // 1.02 at 47.84, 1 by 48.00 — (fix pass 1) added as one more copy of the composite at the frame's own zoom
      // ("lighter", alpha gain - 1) instead of the canvas drawn onto itself (a full-frame readback: ~800 ms a frame)
      const gain = openGain(local);
      if (gain > 1.001) {
        dst.save(); dst.setTransform(z, 0, 0, z, FX - z * FX, FY - z * FY); dst.globalCompositeOperation = "lighter"; dst.globalAlpha = gain - 1;
        dst.drawImage(comp, 0, 0, PAGE_W, PAGE_H); dst.restore();
      }
      if (sig > 0) { ctx.save(); ctx.filter = `blur(${sig}px)`; ctx.drawImage(SOFT, 0, 0); ctx.restore(); }
      return;
    }
    if (COMP) { COMP.width = COMP.height = 0; COMP = null; }
    if (SOFT) { SOFT.width = SOFT.height = 0; SOFT = null; }
    ctx.save();
    ctx.translate(FX, FY); ctx.scale(z, z); ctx.translate(-FX, -FY);
    ctx.imageSmoothingQuality = "high";
    drawS17Page(ctx, 1, z > 1.0005);
    // the steam: cover the page's static wisps and draw the animated ones (page coordinates)
    drawSteam(ctx, drawTick(t));
    const hx = stepAt(HEAD_DX, t);
    if (hx) ctx.drawImage(headPatch(hx, stepAt(EYE_DX, t)), HEAD_BOX[0], HEAD_BOX[1]);
    ctx.restore();
    // the owl, placed in page px, drawn at frame resolution under the same camera
    const p = owlFrame(t);
    if (p) {
      const q = { ...p, x: FX + z * (p.x - FX), y: FY + z * (p.y - FY), s: p.s * z };
      if (p.blur) q.blur = [p.blur[0] * z, p.blur[1] * z];
      drawOwlS17(ctx, q);
    }
  },
  release() { releaseS17Page(); if (COMP) { COMP.width = COMP.height = 0; COMP = null; } if (SOFT) { SOFT.width = SOFT.height = 0; SOFT = null; } },
};
