// s16 (45.72–47.84): the owl flies into his face, tumbles back onto the desk beside the mug and sits there dazed;
// a white flash, then the cut to the page illustration.
//
// Measured on the source (snapshots/s16-study/*):
//   45.72        the owl hits his face (eyes shut, beak open), the camera jolts (ORB fit, table SHAKE)
//   45.76–45.88  it bounces back, eyes shut, wings up (drawings on ones; 45.80 is held for 45.84)
//   45.92        eyes pop open; 45.96–46.28 the same flying drawing is carried left and down toward the mug
//   46.32–46.44  it lands on the desk corner, wings out; 46.48 the head turns: dazed, looking up
//   46.52–47.48  held (46.52–46.56 sit 3 px higher); only the steam moves, redrawn every 3 frames
//   46.16–46.28  his pupils slide from the right to the left (onto the owl)
//   47.52–47.68  a jittery pull-back (table END); 47.72–47.76 white flash; 47.80 is already the next shot
//                (the page illustration, one frame before PLAN's cut): s17's own drawing is borrowed for it
import { W, H } from "../config.js";
import { Plate } from "../lib/engrave.js";
import { taper } from "../lib/ink.js";
import { sampleCurve } from "../lib/paths.js";
import { paintScene, drawEyes } from "./s16/scene.js";
import { owlAt, drawOwlS16 } from "./s16/owl.js";

// The first frame of the next shot is inside this segment: borrow the s17 module's drawing for it if it loads.
let NEXT = null;
try { NEXT = (await import("./s17.js")).shot || null; } catch (e) { NEXT = null; }

const M = 90;          // plate margin (the camera shakes and pulls back)
let cache = null;
function build() {
  if (cache) return cache;
  const P = new Plate(W + 2 * M, H + 2 * M, 1);
  for (const g of [P.v, P.d, P.o]) g.translate(M, M);
  paintScene(P);
  const bg = P.engrave({ spacing: 4.4, seed: 16, contrast: 1.0 });
  cache = { bg };
  return cache;
}

// ---- camera: similarity (scale, rotation in degrees, tx, ty) of each frame relative to the steady framing
// (ORB + RANSAC on the designer and desk, owl masked out). Frames not listed are identity.
const SHAKE = [
  [45.72, 1.0002, 0.089, 12.7, -15.3], [45.76, 0.9989, 0.028, 12.0, -11.5], [45.80, 1.0010, 0.033, 11.6, 8.5],
  [45.84, 0.9989, 0.015, 15.5, 11.2], [45.88, 0.9997, -0.010, 2.5, -1.3], [45.92, 1.0006, -0.001, 5.4, -8.7],
  [45.96, 1.0002, 0.008, -3.5, -8.0], [46.00, 1.0001, 0.010, -0.1, 1.1], [46.04, 0.9999, 0.011, 1.5, -0.2],
  [47.52, 0.9772, 0.345, 13.0, -15.6], [47.56, 0.9758, 0.322, 13.3, -15.4], [47.60, 0.9668, -0.192, 20.0, 1.5],
  [47.64, 0.9640, -0.211, 21.7, 3.0], [47.68, 0.9527, -0.258, 31.5, 6.6],
];
// Source frame index for a time. The film renders at exactly n/25. The snapshot tool renders t = floor(T*30)/30 (up to
// 1/30 s before the asked time T) while its reference is the source frame at or after T, so round up.
export const frameOf = (t) => Math.ceil(t * 25 - 0.01);
function cam(t) {
  const f = frameOf(t);
  for (const c of SHAKE) if (Math.round(c[0] * 25) === f) return c.slice(1);
  return [1, 0, 0, 0];
}
function applyCam(ctx, c) {
  const [s, deg, tx, ty] = c, a = (deg * Math.PI) / 180;
  ctx.setTransform(s * Math.cos(a), s * Math.sin(a), -s * Math.sin(a), s * Math.cos(a), tx, ty);
}

// ---- his pupils: [frame, x offset of the irises from their final place (px), lid opening]. Measured as the centroid
// of the dark iris pixels in his left eye on every source frame: +25 px (glancing right) until 1153, then onto the owl
// over 1154–1161 (fast at first, easing in).
const LOOKF = [[1143, 25.5, 0.9], [1154, 22.5, 0.9], [1155, 13.4, 0.95], [1156, 7.5, 1], [1157, 3.5, 1], [1158, 2.4, 1], [1159, 1.5, 1], [1160, 0.6, 1], [1161, 0, 1]];
const lookAt = (t) => { const f = frameOf(t); let v = LOOKF[0]; for (const k of LOOKF) if (f >= k[0]) v = k; return v; };

// ---- steam: two S-shaped ribbons over the mug, redrawn every 3 frames
const STEAM = [
  [[800, 690], [786, 645], [812, 608], [838, 572], [830, 540], [790, 510], [776, 490], [800, 462], [826, 440], [828, 425]],
  [[795, 692], [768, 650], [762, 625], [790, 592], [798, 572], [770, 545], [742, 520], [743, 505], [760, 488]],
];
function drawSteam(g, t) {
  const k = Math.floor((frameOf(t) - 1) / 3);   // the source redraws the steam on frames 1168, 1171, 1174, ...
  STEAM.forEach((pts, j) => {
    const q = sampleCurve(pts.map(([x, y], i) => [x + Math.sin(k * 1.7 + i * 0.9 + j * 2) * 3 * (i / pts.length), y]), 8);
    taper(g, q, (u) => 4.2 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05)), 0.7), "rgba(242,240,234,0.9)");
  });
}

export const shot = {
  draw(ctx, local, t) {
    // 47.72–47.76: white flash
    const F = frameOf(t);
    if (F === 1193 || F === 1194) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); return; }
    // 47.80: the source has already cut to the next shot (one frame before PLAN's cut): draw s17's opening frame
    if (F >= 1195) {
      let ok = false;
      if (NEXT) { try { NEXT.draw(ctx, t - 47.84, t); ok = true; } catch (e) { ok = false; } }
      if (!ok) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H); }
      return;
    }
    const L = build();
    const c = cam(t);
    ctx.save();
    applyCam(ctx, c);
    ctx.drawImage(L.bg, -M, -M);
    const [, dx, lid] = lookAt(t);
    drawEyes(ctx, dx, lid);
    drawSteam(ctx, t);
    // the owl's placements during the jolt were measured in frame coordinates (they already include the shake)
    if (F < 1188) ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawOwlS16(ctx, owlAt(F));
    ctx.restore();
  },
  release() { cache = null; },
};
