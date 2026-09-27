// s16 (45.72–47.84): the owl flies into his face, tumbles back onto the desk beside the mug and sits there dazed;
// a jittery pull-back, a white flash, then the cut to the page illustration.
//
// Measured on the source, frame by frame (25 fps; frame n = n/25 s; see fidelity/s16.md and src/shots/s16/trace/):
//   1143–1149  the owl hits his face and bounces back; the camera jolts (affine per frame, data/cams.js)
//   1149–1157  it flies left and down toward the mug; 1158–1164 it lands on the desk corner and settles
//   1165–1187  held: the dazed owl by the mug (data/hold.js); only the steam moves (redrawn every ~3 frames)
//   1153–1161  his irises slide from the right onto the owl (data/eyes.js: two traced irises moved per frame; the
//              in-between drawings 1154–1159, the soft jolt frames and the pull-back carry their own eyes in data/dyn.js)
//   1188–1192  pull-back: the whole frame scales down (anisotropic, 0.98/0.97 -> 0.96/0.945) and drifts right
//   1193–1194  white flash; 1195 (47.80) is already the next shot's first drawing (borrowed from s17)
//
// Drawing: everything static is one plate (data/plate.js: value-study levels + ink centre-lines measured on the
// source, ./s16/vec.js); what changes on a frame (the owl, the steam, in-between eye drawings) is that frame's own
// measured drawing (data/dyn.js), laid over the plate with a soft edge.
import { W, H } from "../config.js";
import { paintDrawing, decode } from "./s16/vec.js";
import { plateCanvas, drawIrises, releaseScene, M } from "./s16/scene.js";
import { DYN, FRAME } from "./s16/data/dyn.js";
import { HOLD } from "./s16/data/hold.js";
import { CAM } from "./s16/data/cams.js";

// The first frame of the next shot is inside this segment: borrow the s17 module's drawing for it if it loads.
let NEXT = null;
try { NEXT = (await import("./s17.js")).shot || null; } catch (e) { NEXT = null; }

// Source frame index for a time. The film renders at exactly n/25. The snapshot tool renders t = floor(T*30)/30 (up to
// 1/30 s before the asked time T) while its reference is the source frame at or after T, so round up.
export const frameOf = (t) => Math.ceil(t * 25 - 0.01);

// The source is soft during the jolt (it sharpens again by 1151) and a little soft in the pull-back: the Gaussian
// blur (px) that best turns the sharp plate into each frame (snapshots/s16-p2-tools/blurfit.py, mean of x and y).
const BLUR = { 1143: 1.85, 1144: 1.7, 1145: 1.25, 1146: 1.25, 1147: 1.25, 1148: 0.95, 1149: 0.95, 1150: 0.8,
  1153: 0.5, 1154: 0.5, 1155: 0.5, 1188: 0.65, 1189: 0.65, 1190: 0.65, 1191: 0.65, 1192: 0.8 };

// A drawing with a soft edge: painted into its own canvas, then masked by its outline blurred a little, so it sits
// on the plate without a seam (the outline runs ~5 px outside what actually differs from the plate).
function softLayer(dw, feather = 2.2) {
  const [x0, y0, x1, y1] = dw.box, pad = 8;
  const w = x1 - x0 + 2 * pad, h = y1 - y0 + 2 * pad;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.translate(pad - x0, pad - y0);
  paintDrawing(g, dw, { cal: "dyn" });
  const O = decode(dw, "dyn").O;
  if (O.length) {
    const m = document.createElement("canvas"); m.width = w; m.height = h;
    const mg = m.getContext("2d");
    mg.translate(pad - x0, pad - y0);
    mg.beginPath();
    for (const r of O) { mg.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) mg.lineTo(r[i], r[i + 1]); mg.closePath(); }
    mg.fillStyle = "#fff"; mg.fill("evenodd");
    // blurred outline as alpha: fully opaque ~2 sigma inside it, which still covers every measured difference
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "destination-in";
    g.filter = `blur(${feather}px)`;
    g.drawImage(m, 0, 0);
    g.filter = "none";
    g.globalCompositeOperation = "source-over";
  }
  return { c, x: x0 - pad, y: y0 - pad };
}
const LAYERS = new Map();           // id -> soft layer (a few kept; renders run out of order)
function layer(id, dw) {
  if (LAYERS.has(id)) { const v = LAYERS.get(id); LAYERS.delete(id); LAYERS.set(id, v); return v; }
  const v = softLayer(dw);
  LAYERS.set(id, v);
  while (LAYERS.size > 4) LAYERS.delete(LAYERS.keys().next().value);
  return v;
}

export const shot = {
  draw(ctx, local, t) {
    const F = frameOf(t);
    // 47.72–47.76: white flash, a flat pre-grade tone (the grade adds the vignette); the source's flash has a faint
    // green cast. Blurred mean after the grade: render 219.3/223.6 vs source 219.0/223.3 (R/G) on 1193.
    if (F === 1193 || F === 1194) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "rgb(240,249,240)"; ctx.fillRect(0, 0, W, H); return;
    }
    // 47.80: the source has already cut to the next shot (one frame before PLAN's cut): draw s17's opening frame
    if (F >= 1195) {
      let ok = false;
      if (NEXT) { try { NEXT.draw(ctx, t - 47.84, t); ok = true; } catch (e) { ok = false; } }
      if (!ok) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); }
      return;
    }
    const f = Math.max(1143, F);
    const c = CAM[f] || [1, 0, 0, 0, 1, 0];
    ctx.save();
    ctx.setTransform(c[0], c[3], c[1], c[4], c[2], c[5]);
    if (BLUR[f]) ctx.filter = `blur(${BLUR[f]}px)`;
    ctx.drawImage(plateCanvas(), -M, -M);
    drawIrises(ctx, f);
    if (f >= 1165) { const L = layer("hold", HOLD); ctx.drawImage(L.c, L.x, L.y); }
    ctx.filter = "none";
    // the per-frame drawings were measured in frame px (they already include the camera)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const id = FRAME[f];
    if (id > 0 && DYN[id]) { const L = layer(id, DYN[id]); ctx.drawImage(L.c, L.x, L.y); }
    ctx.restore();
  },
  release() {
    releaseScene(); LAYERS.clear();
    // drop the decoded geometry too (it is decoded again on first use)
    for (const dw of [HOLD, ...Object.values(DYN)]) delete dw._dec;
  },
};
