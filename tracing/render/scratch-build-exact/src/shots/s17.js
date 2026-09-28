// s17 — 47.84–53.24: his site full-frame (MIXING DOWN, LATE AT NIGHT.), with the owl inside the illustration.
// Camera: the shot opens 1.95x in on the page and pulls back to 1:1 by 48.56 (ORB track of the source, fixed point
// (865, 341) page px), then holds. The page is the sōko foundation's (sites.js / sokoIll.js).
// The owl (s17/owl.js + s17/owlDraw.js): clinging to the desk edge by the mug, it spreads its wings and rises
// upright (on twos, 49.1–52.5), then turns and dashes off to the left, flapping (on ones, 52.52–53.24).
// The coffee steam curls (redrawn on twos), as in the source.
import { sokoPageCanvas, releaseSoko, PAGE_W, PAGE_H } from "../lib/sites.js";
import { owlFrame, drawTick } from "./s17/owl.js";
import { drawOwlS17 } from "./s17/owlDraw.js";
import { drawSteam } from "./s17/steam.js";
import { smoothPath } from "../lib/paths.js";

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

// 52.84–52.96: his eyes follow the owl as it dashes off to the left (irises measured: 1029/1093 -> 1025/1089).
const EYES = [[1021, 1054, 1037], [1085, 1119, 1101]];
function eyeShift(t) { return t < 52.86 ? 0 : t < 52.9 ? -2.5 : t < 52.94 ? -3.5 : -4.5; }
function eyePath(c, [x0, x1, cx]) {
  const e = [[x0, 286], [cx - 9, 281], [cx + 7, 280.5], [x1, 285], [cx + 7, 290.5], [cx - 7, 291]];
  smoothPath(c, e, true);
}
function drawEyes(ctx, page, dx) {
  for (const E of EYES) {
    ctx.save();
    ctx.beginPath(); eyePath(ctx, E); ctx.clip();
    ctx.beginPath(); ctx.rect(E[0] - 4, 270, E[1] - 8 - (E[0] - 4), 30); ctx.clip();
    ctx.drawImage(page, dx, 0, PAGE_W, PAGE_H);
    ctx.restore();
  }
}

// The pull-back (to 48.56) carries radial motion blur in the source: build the page + steam + owl once per frame into
// a 2x page-coordinate canvas, then average N copies spread over the shutter's range of zooms.
const SHUTTER = 0.005, NBLUR = 3, CS = 2;
let COMP = null;
function composite(t, page2) {
  if (!COMP) { COMP = document.createElement("canvas"); COMP.width = PAGE_W * CS; COMP.height = PAGE_H * CS; }
  const g = COMP.getContext("2d");
  g.setTransform(CS, 0, 0, CS, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
  g.imageSmoothingQuality = "high";
  g.drawImage(page2, 0, 0, PAGE_W, PAGE_H);
  drawSteam(g, drawTick(t));
  const p = owlFrame(t);
  if (p) drawOwlS17(g, { ...p, res: CS });
  g.setTransform(1, 0, 0, 1, 0, 0);
  return COMP;
}

export const shot = {
  draw(ctx, local, t0) {
    // the source is drawn per frame: snap to the frame. ceil(t*25 - 0.01) is right both for exact n/25 seeks and for
    // the snapshot tool's 30 fps-floored seeks (same convention as s16).
    const t = Math.ceil(t0 * 25 - 0.01) / 25;
    local = t - 47.84;
    const z = zoomAt(local);
    if (local < 0.7) {
      const comp = composite(t, sokoPageCanvas({ gaze: "owl", scale: CS }));
      ctx.save();
      ctx.imageSmoothingQuality = "high";
      for (let i = 0; i < NBLUR; i++) {
        const zi = zoomAt(local + (i / (NBLUR - 1) - 0.5) * SHUTTER);
        ctx.setTransform(zi, 0, 0, zi, FX - zi * FX, FY - zi * FY);
        ctx.globalAlpha = 1 / (i + 1);
        ctx.drawImage(comp, 0, 0, PAGE_W, PAGE_H);
      }
      ctx.restore();
      return;
    }
    if (COMP) { COMP.width = COMP.height = 0; COMP = null; }
    const page = sokoPageCanvas({ gaze: "owl", scale: 1 });
    ctx.save();
    ctx.translate(FX, FY); ctx.scale(z, z); ctx.translate(-FX, -FY);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(page, 0, 0, PAGE_W, PAGE_H);
    // the steam: cover the page's static wisps and draw the animated ones (page coordinates)
    drawSteam(ctx, drawTick(t));
    const ex = eyeShift(t);
    if (ex) drawEyes(ctx, page, ex);
    ctx.restore();
    // the owl, placed in page px, drawn at frame resolution under the same camera
    const p = owlFrame(t);
    if (p) {
      const q = { ...p, x: FX + z * (p.x - FX), y: FY + z * (p.y - FY), s: p.s * z };
      if (p.blur) q.blur = [p.blur[0] * z, p.blur[1] * z];
      drawOwlS17(ctx, q);
    }
  },
  release() { releaseSoko(); if (COMP) { COMP.width = COMP.height = 0; COMP = null; } },
};
