// s16 (45.72–47.84): the owl flies into his face, tumbles back onto the desk beside the mug and sits there dazed;
// a jittery pull-back, a white flash, then the cut to the page illustration.
//
// Measured on the source, frame by frame (25 fps; frame n = n/25 s; see fidelity/s16.md and src/shots/s16/trace/):
//   1143–1149  the owl hits his face and bounces back; the camera jolts (affine per frame, s16/data/cams.js)
//   1149–1157  it flies left and down toward the mug; 1158–1164 it lands on the desk corner and settles
//   1165–1187  held: the dazed owl by the mug; only the steam moves
//   1154–1160  his irises slide from the right onto the owl (s16/eyes.js)
//   1188–1192  pull-back: the whole frame scales down (anisotropic, 0.98/0.97 -> 0.96/0.945) and drifts right
//   1193–1194  white flash; 1195 (47.80) is already the next shot's first drawing (borrowed from s17)
//
// Drawing (authored in code from measurements; no source pixels): the room is one engraving plate (s16/room.js:
// a soft value study of the light + measured hatch directions, cut by src/lib/engrave.js, with the drawing's major
// ink lines redrawn as tapered strokes); his irises are drawn per frame; the owl is one drawing per source frame
// (s16/owl.js: measured silhouette, soft shading, ink strokes); the steam is redrawn from its measured centre-lines.
import { W, H } from "../config.js";
import { roomCanvas, releaseRoom, M } from "./s16/room.js";
import { drawIrises } from "./s16/eyes.js";
import { CAM } from "./s16/data/cams.js";

let OWL = null, STEAM = null;
try { OWL = await import("./s16/owl.js"); } catch (e) { OWL = null; }
try { STEAM = await import("./s16/steam.js"); } catch (e) { STEAM = null; }

// The first frame of the next shot is inside this segment: borrow the s17 module's drawing for it if it loads.
let NEXT = null;
try { NEXT = (await import("./s17.js")).shot || null; } catch (e) { NEXT = null; }

// Source frame index for a time. Exact on the film's 25 fps grid (t = n/25). Off the grid it rounds UP: the snapshot
// tool renders t = floor(T*30)/30 (up to 1/30 s before the asked time T) while its reference is the source frame at or
// after T (the same convention as s15 and s17). Scrubbing between grid times therefore shows the next frame early.
export const frameOf = (t) => Math.ceil(t * 25 - 0.01);

// The source is soft during the jolt (sharp again by 1151) and a little soft in the pull-back. Measured as the
// anisotropic Gaussian [sigma x, sigma y] (px) that best turns the steady source frame 1175, moved by the frame's
// camera, into that frame on the room (src/shots/s16/trace/blurfit_dir.py): mostly horizontal, as the camera's jolt.
const BLUR = { 1143: [2.25, 1.25], 1144: [2.0, 1.25], 1145: [1.5, 0.75], 1146: [1.5, 0.75], 1147: [1.5, 0.75],
  1148: [1.25, 0.5], 1149: [1.0, 0.5], 1150: [1.0, 0.25], 1151: [0.25, 0.25],
  1188: [0.5, 0.5], 1189: [0.5, 0.5], 1190: [0.5, 0.5], 1191: [0.5, 0.5], 1192: [0.75, 0.5] };

// the flying owl's own softness on the jolt frames (px, isotropic; see fidelity/s16.md)
const OWL_BLUR = { 1143: 1.0, 1144: 0.9, 1145: 0.6, 1146: 0.6, 1147: 0.6, 1148: 0.4, 1149: 0.3 };

// an anisotropic Gaussian blur of a frame-sized canvas into ctx: squeeze x by sy/sx, blur by sy, stretch back
let SQ = null, FR = null;
function blurAniso(ctx, src, sx, sy) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (Math.abs(sx - sy) < 0.05) {
    ctx.filter = `blur(${sx}px)`; ctx.drawImage(src, 0, 0); ctx.restore(); return;
  }
  // the squeeze and stretch resampling itself softens x by ~0.6 px: take it off the x blur
  const k = sy / Math.sqrt(Math.max(sy * sy, sx * sx - 0.36)), w = Math.ceil(W * k);
  if (!SQ) SQ = document.createElement("canvas");
  if (SQ.width !== w || SQ.height !== H) { SQ.width = w; SQ.height = H; }
  const g = SQ.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, w, H);
  g.imageSmoothingQuality = "high";
  g.filter = `blur(${sy}px)`; g.setTransform(k, 0, 0, 1, 0, 0); g.drawImage(src, 0, 0); g.filter = "none";
  ctx.imageSmoothingQuality = "high";
  ctx.setTransform(1 / k, 0, 0, 1, 0, 0); ctx.drawImage(SQ, 0, 0);
  ctx.restore();
}
function frameCanvas() {
  if (!FR) { FR = document.createElement("canvas"); FR.width = W; FR.height = H; }
  const g = FR.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  return g;
}

export const shot = {
  draw(ctx, local, t) {
    const F = frameOf(t);
    // 47.72–47.76: white flash, a flat pre-grade tone (the grade adds the vignette); the source's flash has a faint
    // green cast. Blurred mean after the grade: 219.3/223.6 vs source 219.0/223.3 (R/G) on 1193.
    if (F === 1193 || F === 1194) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "rgb(240,249,240)"; ctx.fillRect(0, 0, W, H); return;
    }
    // 47.80: the source has already cut to the next shot (one frame before PLAN's cut): draw s17's opening frame
    if (F >= 1195) {
      let ok = false;
      if (NEXT) { try { NEXT.draw(ctx, t - 47.84, t); ok = true; } catch (e) { ok = false; } }
      if (!ok) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); }
      return;
    }
    const f = Math.max(1143, F);
    const c = CAM[f] || [1, 0, 0, 0, 1, 0];
    const bl = BLUR[f];
    const g = bl ? frameCanvas() : ctx;       // soft frames are composed sharp, then blurred as a whole
    g.save();
    g.setTransform(c[0], c[3], c[1], c[4], c[2], c[5]);
    g.drawImage(roomCanvas(), -M, -M);
    drawIrises(g, f);
    // the steam and the seated owl belong to the room (they move with its camera)
    if (STEAM) STEAM.drawSteam(g, f);
    if (OWL && OWL.inPlatePx(f)) OWL.drawOwl16(g, f);
    g.restore();
    if (bl) blurAniso(ctx, FR, bl[0], bl[1]);
    // the flying owl was measured in frame px (its drawings already include the camera); its drawings are traced from
    // the soft frames, so it takes only its own (smaller) blur
    if (OWL && !OWL.inPlatePx(f)) {
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const ob = OWL_BLUR[f] || 0;
      if (ob > 0) ctx.filter = `blur(${ob}px)`;
      OWL.drawOwl16(ctx, f);
      ctx.restore();
    }
  },
  release() {
    releaseRoom(); FR = null; SQ = null;
    if (OWL && OWL.releaseOwl) OWL.releaseOwl();
  },
};
