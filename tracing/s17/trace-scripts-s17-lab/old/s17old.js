// s17 — 47.84–53.24: his site full-frame (MIXING DOWN, LATE AT NIGHT.), with the owl inside the illustration.
// Camera: the shot opens 1.95x in on the page and pulls back to 1:1 by 48.56 (ORB track of the source, fixed point
// (865, 341) page px), then holds. The page is the sōko foundation's (sites.js / sokoIll.js).
// The owl (s17/owl.js + s17/owlDraw.js): clinging to the desk edge by the mug, it spreads its wings and rises
// upright (on twos, 49.1–52.5), then turns and dashes off to the left, flapping (on ones, 52.52–53.24).
// The coffee steam curls (redrawn on twos), as in the source.
import { drawSokoHeadline, drawSokoCounter, drawSokoRail, SOKO_BG, PAGE_W, PAGE_H, sokoPageCanvas } from "../../../src/lib/sites.js";
import { s17IllCanvas, s17EyePatch, EYE_BOX, EYE_PAD, releaseS17Ill } from "../../../src/shots/s17/ill.js";
import { owlFrame, drawTick } from "../../../src/shots/s17/owl.js";
import { drawOwlS17 } from "../../../src/shots/s17/owlDraw.js";
import { drawSteam } from "../../../src/shots/s17/steam.js";

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

// 52.80–53.0: his eyes follow the owl as it dashes off to the left: the irises slide ~3 px left and the lids drop
// a little (source frames 1320–1325). The eye region is repainted from the forked illustration (s17/ill.js).
function eyeShift(t) { return t < 52.78 ? 0 : t < 52.82 ? -1 : t < 52.86 ? -1.5 : t < 52.9 ? -2 : t < 52.94 ? -2.5 : -3; }
function eyeLid(t) { return t < 52.86 ? 0 : 1; }

// Tone curve for the softened page, from percentile matching of settled frames against the source (50.4 s, whole
// page: ours p50/75/90/95 = 12/72/147/201 after the softening, source 10/60/177/217): lower mid-darks a little,
// lift the highlights the blur averaged down. Kept mild: a full match raised the blurred MAE (the structures differ),
// so this goes halfway. Piecewise linear, applied once to the cached page.
const TONE = [[0, 0], [12, 11], [72, 70], [147, 152], [201, 205], [237, 240], [255, 255]];
function toneMatch(g, w, h) {
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    let i = 1; while (i < TONE.length - 1 && TONE[i][0] < v) i++;
    const [a, va] = TONE[i - 1], [b, vb] = TONE[i];
    lut[v] = Math.round(va + (vb - va) * (v - a) / (b - a));
  }
  const img = g.getImageData(0, 0, w, h), d = img.data;
  for (let k = 0; k < d.length; k += 4) { d[k] = lut[d[k]]; d[k + 1] = lut[d[k + 1]]; d[k + 2] = lut[d[k + 2]]; }
  g.putImageData(img, 0, 0);
}

// The page's finishing: a light blur (the crisp UI's 0.8-2 px band-pass energy was ~25 % above the source's), then
// the tone curve. Returns a new canvas (the input is freed).
function finish(c, scale) {
  const o = document.createElement("canvas"); o.width = c.width; o.height = c.height;
  const og = o.getContext("2d", { willReadFrequently: true });
  og.filter = `blur(${(0.5 * scale).toFixed(2)}px)`; og.drawImage(c, 0, 0); og.filter = "none";
  c.width = c.height = 0;
  toneMatch(og, o.width, o.height);
  return o;
}
// The eye region for the eye-follow beat, finished like the page and cropped to EYE_BOX (cached per state).
const EYES = new Map();
function eyePatch(dx, lid) {
  const key = dx + ":" + lid;
  let c = EYES.get(key);
  if (!c) {
    const p = s17EyePatch(dx, lid);
    const src = document.createElement("canvas"); src.width = p.canvas.width; src.height = p.canvas.height;
    src.getContext("2d").drawImage(p.canvas, 0, 0);
    const f = finish(src, 1);
    c = document.createElement("canvas"); c.width = EYE_BOX[2] - EYE_BOX[0]; c.height = EYE_BOX[3] - EYE_BOX[1];
    c.getContext("2d").drawImage(f, EYE_PAD, EYE_PAD, c.width, c.height, 0, 0, c.width, c.height);
    EYES.set(key, c);
  }
  return c;
}

// The page: s17's own illustration (a fork of sokoIll.js with the designer, props, lamp, desk and mug redrawn)
// under the sōko UI from sites.js (headline, counter, key, rail).
const PAGES = new Map();
function s17Page(scale) {
  let c = PAGES.get(scale);
  const DBG = globalThis.__S17 || {};
  if (!c && DBG.page === "f1") {
    const f = sokoPageCanvas({ gaze: "owl", scale, ...(DBG.soft != null ? { soft: DBG.soft } : {}) });
    c = document.createElement("canvas"); c.width = f.width; c.height = f.height;
    c.getContext("2d").drawImage(f, 0, 0);
    if (DBG.tone) { const g = c.getContext("2d", { willReadFrequently: true }); toneMatch(g, c.width, c.height); }
    PAGES.set(scale, c);
  }
  if (!c) {
    c = document.createElement("canvas"); c.width = Math.round(PAGE_W * scale); c.height = Math.round(PAGE_H * scale);
    const g = c.getContext("2d"); g.scale(scale, scale);
    g.fillStyle = SOKO_BG; g.fillRect(0, 0, PAGE_W, PAGE_H);
    g.drawImage(s17IllCanvas({ scale }), 0, 0, PAGE_W, PAGE_H);
    drawSokoHeadline(g); drawSokoCounter(g, { counter: "000.0" }); drawSokoRail(g);
    c = finish(c, scale);
    PAGES.set(scale, c);
  }
  return c;
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
      const comp = composite(t, s17Page(CS));
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
      if (sig > 0) { ctx.save(); ctx.filter = `blur(${sig}px)`; ctx.drawImage(SOFT, 0, 0); ctx.restore(); }
      return;
    }
    if (COMP) { COMP.width = COMP.height = 0; COMP = null; }
    if (SOFT) { SOFT.width = SOFT.height = 0; SOFT = null; }
    const page = s17Page(1);
    ctx.save();
    ctx.translate(FX, FY); ctx.scale(z, z); ctx.translate(-FX, -FY);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(page, 0, 0, PAGE_W, PAGE_H);
    // the steam: cover the page's static wisps and draw the animated ones (page coordinates)
    drawSteam(ctx, drawTick(t));
    const ex = eyeShift(t);
    if (ex) ctx.drawImage(eyePatch(ex, eyeLid(t)), EYE_BOX[0], EYE_BOX[1]);
    ctx.restore();
    // the owl, placed in page px, drawn at frame resolution under the same camera
    const p = (globalThis.__S17 || {}).noowl ? null : owlFrame(t);
    if (p) {
      const q = { ...p, x: FX + z * (p.x - FX), y: FY + z * (p.y - FY), s: p.s * z };
      if (p.blur) q.blur = [p.blur[0] * z, p.blur[1] * z];
      drawOwlS17(ctx, q);
    }
  },
  release() { PAGES.clear(); EYES.clear(); releaseS17Ill(); if (COMP) { COMP.width = COMP.height = 0; COMP = null; } },
};
