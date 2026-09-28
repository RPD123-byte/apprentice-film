// s17 — 47.84–53.24: his site full-frame (MIXING DOWN, LATE AT NIGHT.), with the owl inside the illustration.
// Camera: the shot opens 1.95x in on the page and pulls back to 1:1 by 48.56 (ORB track of the source, fixed point
// (865, 341) page px), then holds; the headline fades in over the pull-back (47.78–48.16).
// Page: the sōko foundation's own page (sites.js sokoPageCanvas, gaze "owl"), the same page the framed shots use,
// with this shot's mug, the traced steam (s17/steam.js) and his head turn after the owl (52.80–53.20) — s17/page.js.
// Owl (s17/owl.js + s17/owlDraw.js): clinging to the desk edge by the mug, it spreads its wings and rises upright
// (on twos, 49.12–52.44), then launches and dashes off to the left, flapping (on ones, 52.52–53.20). Poses are
// measured key poses; each drawing's silhouette, wing outlines and the dash's face are traced from the source
// (s17/trace/*.py -> sil_data.js, wing_data.js, and tables in owl.js): centre lines and outlines only, no pixels.
// Pass 4: the dash's measured faces are applied on every frame (a key-lookup bug had dropped 52.80, 53.00/53.04 and
// 53.20) and were re-measured; ringed side-on cups and a face-on cup; the line weight follows the source's drift
// through the shot (P.ink); body fluff, covert rows and the facial disc's chin; two stray smudges in F1's page on the
// owl's path are covered from our own page (s17/page.js). See fidelity/s17.md.
import { PAGE_W, PAGE_H } from "../lib/sites.js";
import { drawS17Page, headPatch, HEAD_BOX, releaseS17Page } from "./s17/page.js";
import { owlFrame, drawTick } from "./s17/owl.js";
import { drawOwlS17 } from "./s17/owlDraw.js";
import { drawSteam } from "./s17/steam.js";

// zoom relative to the settled page, one sample per source frame (ORB + RANSAC against 48.80, owl and steam masked;
// fixed point (865, 341) page px). Local -0.04 = 47.80, the frame s16 borrows from this shot.
const Z = [[-0.04, 2.1718], [0, 1.9529], [0.04, 1.7763], [0.08, 1.6346], [0.12, 1.5126], [0.16, 1.4111], [0.2, 1.3299], [0.24, 1.2619],
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
// S-curve; the DO NOT KNOCK plate under it measures steady). Frame times -> alpha.
const HEAD_A = [[47.76, 0], [47.8, 0.07], [47.84, 0.25], [47.88, 0.43], [47.92, 0.59], [47.96, 0.69], [48.0, 0.8], [48.04, 0.87], [48.08, 0.93], [48.12, 0.96], [48.16, 1]];
function ramp(T, t) {
  if (t <= T[0][0]) return T[0][1];
  for (let i = 1; i < T.length; i++) if (t <= T[i][0] + 1e-6) { const [a, va] = T[i - 1], [b, vb] = T[i]; return va + (vb - va) * (t - a) / (b - a); }
  return 1;
}
function drawPageOpening(g, t, scale) {
  const ha = ramp(HEAD_A, t);
  if (ha >= 1) { drawS17Page(g, scale); return; }
  drawS17Page(g, scale, false);
  if (ha > 0) drawS17Page(g, scale, true, ha);
}

// The pull-back (to 48.56) carries radial motion blur in the source: build the page + steam + owl once per frame into
// a 2x page-coordinate canvas, then average N copies spread over the shutter's range of zooms.
const SHUTTER = 0.005, NBLUR = 3, CS = 2;
// measurement hook for the lab harness (snapshots/s17-lab): { noowl } — never set in the film
const DBG = () => globalThis.__S17 || {};
let COMP = null;
function composite(t) {
  if (!COMP) { COMP = document.createElement("canvas"); COMP.width = PAGE_W * CS; COMP.height = PAGE_H * CS; }
  const g = COMP.getContext("2d");
  g.setTransform(CS, 0, 0, CS, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  g.imageSmoothingQuality = "high";
  drawPageOpening(g, t, CS);
  drawSteam(g, drawTick(t));
  const p = DBG().noowl ? null : owlFrame(t);
  if (p) drawOwlS17(g, { ...p, res: CS });
  g.setTransform(1, 0, 0, 1, 0, 0);
  return COMP;
}

function openGain(local) { return local < 0 ? 1.02 + 0.06 * Math.min(1, -local / 0.04) : 1 + 0.02 * Math.max(0, 1 - local / 0.16); }
// Gaussian sigma (frame px) for the opening frames, local time -0.04 (47.80, drawn for s16) .. 0.08
function openBlur(local) { return local < 0.02 ? 1.5 : local < 0.06 ? 1.0 : local < 0.1 ? 0.5 : 0; }
let SOFT = null;
function softCanvas() {
  if (!SOFT) { SOFT = document.createElement("canvas"); SOFT.width = PAGE_W; SOFT.height = PAGE_H; }
  return SOFT.getContext("2d");
}

export const shot = {
  draw(ctx, local, t0) {
    // the source is drawn per frame: snap to the frame. ceil(t*25 - 0.01) is right both for exact n/25 seeks and for
    // the snapshot tool's 30 fps-floored seeks (same convention as s16).
    const t = Math.ceil(t0 * 25 - 0.01) / 25;
    local = t - 47.84;
    const z = zoomAt(local);
    if (local < 0.7) {
      const comp = composite(t);
      // the source's first frames of the pull-back are soft (an upscaled picture): blur them to match
      const sig = openBlur(local);
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
      // (fix pass 1) the source's first frames are a little brighter in the mid-tones and highlights (graded frame
      // means 55.8 / 49.3 / 51.7 against ours 48.7 / 46.4 / 49.0 at 47.80 / 47.84 / 48.00, p95 235 / 232 / 198 against
      // 223 / 217 / 187): a multiplicative gain (the canvas added onto itself): 1.08 at 47.80, 1.02 at 47.84, 1 by 48.00
      const gain = openGain(local);
      if (gain > 1.001) {
        dst.save(); dst.setTransform(1, 0, 0, 1, 0, 0); dst.globalCompositeOperation = "lighter"; dst.globalAlpha = gain - 1;
        dst.drawImage(dst.canvas, 0, 0); dst.restore();
      }
      if (sig > 0) { ctx.save(); ctx.filter = `blur(${sig}px)`; ctx.drawImage(SOFT, 0, 0); ctx.restore(); }
      return;
    }
    if (COMP) { COMP.width = COMP.height = 0; COMP = null; }
    if (SOFT) { SOFT.width = SOFT.height = 0; SOFT = null; }
    ctx.save();
    ctx.translate(FX, FY); ctx.scale(z, z); ctx.translate(-FX, -FY);
    ctx.imageSmoothingQuality = "high";
    drawS17Page(ctx, 1);
    // the steam: cover the page's static wisps and draw the animated ones (page coordinates)
    drawSteam(ctx, drawTick(t));
    const hx = stepAt(HEAD_DX, t);
    if (hx) ctx.drawImage(headPatch(hx, stepAt(EYE_DX, t)), HEAD_BOX[0], HEAD_BOX[1]);
    ctx.restore();
    // the owl, placed in page px, drawn at frame resolution under the same camera
    const p = DBG().noowl ? null : owlFrame(t);
    if (p) {
      const q = { ...p, x: FX + z * (p.x - FX), y: FY + z * (p.y - FY), s: p.s * z };
      if (p.blur) q.blur = [p.blur[0] * z, p.blur[1] * z];
      drawOwlS17(ctx, q);
    }
  },
  release() { releaseS17Page(); if (COMP) { COMP.width = COMP.height = 0; COMP = null; } },
};
