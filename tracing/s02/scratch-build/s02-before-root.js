// Shot 2 (6.04–19.12): one continuous camera.
//   6.04–10.52  the stare: a hard front close-up of the designer lit from below by the laptop; his eyes scan in small
//               flicks (measured iris track), then snap to screen-right at 8.72–8.84 and hold; three sweat beads slide.
//   10.52–14.44 the pan: the camera swings up-right off his face (he slides out bottom-left), through the dark
//               shelves, accelerating (on twos at first — the source's ramped frames), and stops dead on the cartons.
//   14.44–16.52 locked on the carton stack: the owl sits on the top box; slow blink 15.20–15.68; wings open 15.88.
//   16.12–19.12 it takes off, rises, drops toward us and flies right; the camera pans back down-left with it and his
//               face slides in again from the left (still looking right) as the owl flaps at upper right. Cut at 19.12.
// Camera: per-frame translation measured with chained ORB tracks (owl masked), anchored by direct matches back to the
// stare frame (src/shots/s02/cam.js). No zoom or rotation in the source (s = 1.000 ± 0.003).
// Layers (world coords = the 6.04 frame): room plates (engraved: face room full-res, cartons full-res, the whole
// world at half res under both), the designer (Canvas2D ink), eyes + sweat per frame, the owl (kit) on top.
import { W, H } from "../config.js";
import { Plate } from "../lib/engrave.js";
import { clamp, lerp, smooth } from "../lib/rng.js";
import { CAM, CAM0 } from "./s02/cam.js";
import { paintWorld, BOX_OFF } from "./s02/room.js";
import { DROPS, drop } from "./s02/designer.js";
import { paintBase, paintEyes, paintIris, DOPTS, shapeSet } from "./s02/designer2.js";
import { gv } from "./s02/designer.js";
import { STARE, STARE_PAPER, BOXES, BOXES_PAPER } from "./s02/roomInk.js";
import { SIT, SIT_HALF, SIT_SHUT, FLY } from "./s02/owlInk.js";
import { PAN_OUT, PAN_BACK, PAN_X0, PAN_Y0, PAN_W, PAN_H, PAN_PAPER } from "./s02/panInk.js";
import { RET, RET_X0, RET_Y0, RET_W, RET_H } from "./s02/retInk.js";
import { wingPolys, drawWing, drawWingInk } from "./s02/wingDraw.js";
import { WING_F0 } from "./s02/wings.js";

const T0 = 6.04;
const frameOf = (t) => Math.floor(t * 25 + 0.5);

// ---------- camera ----------
function camAt(f) {
  if (f < CAM0) return [0, 0];
  const i = Math.min(CAM.length / 2 - 1, f - CAM0);
  return [CAM[2 * i], CAM[2 * i + 1]];
}
// the source repeats a frame here and there during the take-off and the return pan (frame diff ~1, grain only):
// 16.08 = 16.04, 17.08 = 17.04, 18.08 = 18.04, 19.08 = 19.04 — everything (camera, owl, wings) holds on them
const REPEAT = new Set([402, 427, 452, 477]);
// camera direction of travel (unit), from the last real step (held frames on twos keep the previous one)
function panDir(f) {
  for (let k = f; k > CAM0 && k > f - 4; k--) {
    const a = camAt(k - 1), b = camAt(k), d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d > 0.8) return [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
  }
  const a = camAt(f), b = camAt(f + 1), d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return d > 0.8 ? [(b[0] - a[0]) / d, (b[1] - a[1]) / d] : [0, 0];
}
// blur of the source during both pans, fitted per frame (scratchpad s02fix1/blurfit.py): the shifted sharp stare /
// carton frame, smeared along the pan by L px and blurred by a gaussian of sigma px, best matches each pan frame.
// [t, L, sigma]. Sharp while the step is under ~8 px/frame; soft right through the fast parts of both pans.
const BLUR_OUT = [[10.9, 0, 0], [10.96, 4, 0.3], [11.2, 4, 0.8], [11.44, 7, 1.0], [11.6, 8, 1.4], [11.8, 8, 2.0], [12.0, 10, 2.2], [12.3, 14, 2.5],
  [12.6, 16, 3.0], [13.0, 18, 3.5], [13.5, 20, 3.8], [13.8, 20, 3.2], [14.0, 18, 2.6], [14.2, 16, 2.2], [14.42, 16, 2.0]];
const BLUR_BACK = [[16.52, 0, 0], [16.6, 3, 0.4], [16.68, 4, 1.0], [16.76, 5, 1.5], [16.88, 8, 2.0], [17.0, 12, 2.4], [17.24, 14, 2.8], [17.4, 16, 3.0],
  [18.0, 16, 3.0], [18.3, 14, 2.8], [18.6, 12, 2.8], [18.84, 12, 2.8], [19.0, 8, 3.0], [19.12, 8, 3.0]];
function blurAt(t) {
  const T = t >= 10.9 && t < 14.43 ? BLUR_OUT : t >= 16.52 && t < 19.2 ? BLUR_BACK : null;
  if (!T) return [0, 0];
  return [tab2(T, t, 1), tab2(T, t, 2)];
}
// colour of the source's grade (G-(R+B)/2 and R-B measured per frame, scratchpad s02fix1): a faint green lift in
// everything but pure black, rising through the pan to ~+6 and ~+4.7 on the cartons, cut at 15.88 to a slight warm
// (red in the mids). [t, green add, red add] in 1/255 before the global grade.
const TINT = [[6.04, 2.4, 1.0], [10.5, 2.6, 1.0], [11.2, 3.3, 0.6], [12.4, 5.2, 0.3], [13.4, 6.4, 0], [14.1, 6.8, 0], [14.44, 5.4, 0], [15.86, 5.4, 0],
  [15.87, 1.4, 2.4], [19.12, 1.2, 2.6]];

// ---------- the eyes (measured iris offsets during the scan, then the look) ----------
const SCAN = [[6.04, 0], [7.0, 0], [7.04, -2], [7.08, -6], [7.12, -10], [7.16, -10], [7.2, -16], [7.24, -20], [7.28, -22], [7.36, -22], [7.4, -20], [7.44, -16], [7.48, -11], [7.52, -2], [7.56, 5], [7.68, 5], [7.72, 4], [7.76, 0], [7.8, -5], [7.84, -13], [7.88, -19], [7.92, -21], [8.0, -21], [8.04, -20], [8.08, -16], [8.12, -11], [8.16, -11], [8.2, -2], [8.24, 2], [8.32, 2], [8.36, 0], [8.4, -4], [8.44, -8], [8.48, -13], [8.52, -20], [8.56, -21], [8.68, -21], [8.72, -8]];
function tab(T, t) {
  if (t <= T[0][0]) return T[0][1];
  for (let i = 1; i < T.length; i++) if (t <= T[i][0] + 1e-6) { const a = T[i - 1], b = T[i]; return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0]); }
  return T[T.length - 1][1];
}
// the snap (measured frame by frame): 8.72 still the stare, 8.76 an in-between (the iris swung right, the lids still
// open), 8.80 the look
function eyeState(t) {
  if (t < 8.74) return { dx: tab(SCAN, t), dy: 0, look: 0 };
  if (t < 8.78) return { dx: 16, dy: 3, look: 0 };      // the in-between: the stare's iris already swung right
  if (t < 8.82) return { dx: 20, dy: 3, look: 0.85 };   // nearly the look
  return { dx: 0, dy: 0, look: 1 };
}
// sweat beads: measured slide (px below the rest position at 6.04)
const SLIDE_A = [[6.04, 0], [6.28, 3], [6.52, 7], [6.76, 11], [7.0, 15], [7.24, 18], [7.48, 22], [7.72, 25], [7.96, 27], [8.2, 28]];

// ---------- the owl in flight: measured by template-matching the owl's head (with headphones, from the 18.64 s
// frame) over scale 0.66–1.06 and rotation −0.45…+0.2 rad, every frame 16.12–19.12 (scores 0.85–0.98; the motion-blurred
// frames 16.88–16.96 and 17.04–17.08 dropped). Converted to the rig: [t, root x, root y, px per owl unit, bank rad]
// (root offset and scale calibrated on the last sitting frame, 16.08; scale and bank lightly smoothed).
const ROOT = [
  [16.00, 1087, 247, 0.650, 0.000], [16.04, 1087, 247, 0.650, -0.006], [16.08, 1088, 247, 0.650, -0.012], [16.12, 1088, 241, 0.655, -0.018], [16.16, 1088, 231, 0.661, -0.024], [16.20, 1089, 215, 0.666, -0.030], [16.24, 1091, 194, 0.671, -0.030], [16.28, 1092, 186, 0.677, -0.030], [16.32, 1093, 189, 0.682, -0.030], [16.36, 1095, 197, 0.687, -0.030], [16.40, 1098, 212, 0.687, -0.040], [16.44, 1098, 233, 0.687, -0.050], [16.48, 1101, 258, 0.687, -0.060], [16.52, 1104, 283, 0.687, -0.070], [16.56, 1110, 307, 0.692, -0.090], [16.60, 1119, 330, 0.698, -0.110], [16.64, 1126, 352, 0.703, -0.130], [16.68, 1141, 369, 0.703, -0.150], [16.72, 1155, 387, 0.708, -0.170], [16.76, 1169, 401, 0.714, -0.190], [16.80, 1185, 413, 0.719, -0.220], [16.84, 1203, 419, 0.719, -0.250], [17.00, 1286, 429, 0.719, -0.270], [17.12, 1320, 425, 0.703, -0.290], [17.16, 1336, 421, 0.692, -0.300], [17.20, 1352, 415, 0.677, -0.290], [17.24, 1352, 411, 0.671, -0.290], [17.28, 1365, 406, 0.671, -0.270], [17.32, 1377, 403, 0.671, -0.260], [17.36, 1403, 396, 0.671, -0.250], [17.40, 1422, 398, 0.687, -0.240], [17.44, 1435, 401, 0.703, -0.220], [17.48, 1449, 404, 0.719, -0.230], [17.52, 1460, 404, 0.724, -0.230], [17.56, 1469, 402, 0.724, -0.210], [17.60, 1479, 400, 0.730, -0.200], [17.64, 1494, 391, 0.735, -0.200], [17.68, 1496, 394, 0.746, -0.200], [17.72, 1509, 394, 0.756, -0.210], [17.76, 1517, 395, 0.772, -0.240], [17.80, 1532, 403, 0.788, -0.270], [17.84, 1538, 404, 0.804, -0.290], [17.88, 1545, 403, 0.820, -0.300], [17.92, 1548, 400, 0.836, -0.310], [17.96, 1552, 395, 0.846, -0.310], [18.00, 1556, 390, 0.857, -0.300], [18.04, 1559, 384, 0.862, -0.280], [18.08, 1558, 385, 0.868, -0.260], [18.12, 1559, 380, 0.878, -0.220], [18.16, 1562, 375, 0.883, -0.190], [18.20, 1564, 369, 0.889, -0.150], [18.24, 1571, 362, 0.894, -0.110], [18.28, 1576, 355, 0.899, -0.080], [18.32, 1580, 348, 0.905, -0.050], [18.36, 1585, 340, 0.910, -0.020], [18.40, 1588, 334, 0.910, 0.010], [18.44, 1595, 328, 0.910, 0.030], [18.48, 1599, 325, 0.910, 0.050], [18.52, 1606, 321, 0.915, 0.070], [18.56, 1612, 316, 0.921, 0.090], [18.60, 1623, 307, 0.926, 0.100], [18.64, 1632, 304, 0.931, 0.110], [18.68, 1639, 299, 0.937, 0.120], [18.72, 1646, 294, 0.942, 0.120], [18.76, 1653, 290, 0.947, 0.130], [18.80, 1658, 287, 0.947, 0.140], [18.84, 1667, 282, 0.947, 0.150], [18.88, 1674, 277, 0.947, 0.160], [18.92, 1680, 271, 0.947, 0.170], [18.96, 1686, 266, 0.947, 0.170], [19.00, 1693, 259, 0.947, 0.170], [19.04, 1700, 253, 0.947, 0.170], [19.08, 1700, 253, 0.947, 0.170], [19.12, 1706, 251, 0.947, 0.170]];
const WROOT = (t, k) => spline(ROOT, t, k);
function spline(T, t, k) {
  // Catmull-Rom through table rows [t, v1, v2...], column k
  if (t <= T[0][0]) return T[0][k];
  const n = T.length;
  if (t >= T[n - 1][0]) return T[n - 1][k];
  let i = 1; while (T[i][0] < t) i++;
  const p0 = T[Math.max(0, i - 2)], p1 = T[i - 1], p2 = T[i], p3 = T[Math.min(n - 1, i + 1)];
  const u = (t - p1[0]) / (p2[0] - p1[0]), u2 = u * u, u3 = u2 * u;
  return 0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * u + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * u2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * u3);
}
function tab2(T, t, k) {
  if (t <= T[0][0]) return T[0][k];
  for (let i = 1; i < T.length; i++) if (t <= T[i][0] + 1e-6) { const a = T[i - 1], b = T[i]; return a[k] + (b[k] - a[k]) * (t - a[0]) / (b[0] - a[0]); }
  return T[T.length - 1][k];
}
// the sitting owl's eyes, read frame by frame (snapshots/s02-g1/blink.jpg): open to 15.16, heavy lids 15.20, shut
// 15.24–15.56, heavy lids 15.60–15.64, open 15.68–15.96 (the wings start to lift at 15.88); from 16.00 it flies
const sitEyes = (f) => (f === 380 || f === 390 || f === 391 ? "half" : f >= 381 && f <= 389 ? "shut" : "open");
const FLY_F0 = 400;
const RET_F0 = 452;
// ---------- layers ----------
let L = null;
function region(x0, y0, x1, y1, scale, feather) {
  const P = new Plate(x1 - x0, y1 - y0, scale);
  for (const g of [P.v, P.d, P.o]) g.translate(-x0, -y0);
  paintWorld(P);
  const c = P.engrave({ spacing: 4.6, seed: 23, contrast: 1.0 });
  if (feather) {
    // fade the plate's inner edges so it melts into the half-res world under it: [side, width] in world px
    const m = document.createElement("canvas"); m.width = c.width; m.height = c.height;
    const mg = m.getContext("2d"); mg.scale(scale, scale);
    const w = x1 - x0, h = y1 - y0;
    mg.fillStyle = "#fff"; mg.fillRect(0, 0, w, h);
    mg.globalCompositeOperation = "destination-out";
    for (const [side, fw] of feather) {
      const [ax, ay, bx, by, rx, ry, rw, rh] = side === "r" ? [w, 0, w - fw, 0, w - fw, 0, fw, h] : side === "l" ? [0, 0, fw, 0, 0, 0, fw, h] : side === "t" ? [0, 0, 0, fw, 0, 0, w, fw] : [0, h, 0, h - fw, 0, h - fw, w, fw];
      const gr = mg.createLinearGradient(ax, ay, bx, by); gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
      mg.fillStyle = gr; mg.fillRect(rx, ry, rw, rh);
    }
    const g = c.getContext("2d");
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "destination-in"; g.drawImage(m, 0, 0); g.restore();
  }
  return { c, x0, y0, x1, y1 };
}
function layers() {
  if (L) return L;
  const mid = region(-60, -1980, 4460, 1000, 0.5, null);
  const face = region(-40, -620, 2760, 960, 1, [["r", 140], ["t", 140]]);
  const boxes = region(1880, -1980, 4460, -300, 1, [["l", 140], ["b", 140]]);
  // the designer, drawn once (world rect x 0..W, y -400..H)
  // the two sharp views of the room, measured (roomInk.js): over the plates, feathered on the edges the pans reveal
  const traced = [roomTrace(STARE, STARE_PAPER, 0, 0, ["r", "t"]), roomTrace(BOXES, BOXES_PAPER, BOX_WX, BOX_WY, ["l", "b"])];
  // the pans' world mosaic (panInk.js, half resolution): under the two sharp views, over the plates
  // (the same shapes in two sets of values: as the outbound pan shows the room, and as the return does)
  // (its dark paper fills the whole canvas: every world point a pan frame shows is inside the mosaic)
  const mk = (set) => { const c = document.createElement("canvas"); c.width = PAN_W; c.height = PAN_H; const g = c.getContext("2d"); g.fillStyle = gv(PAN_PAPER); g.fillRect(0, 0, PAN_W, PAN_H); for (const lev of set) shapeSet(g, lev, { div: 1000 }); return c; };
  const pan = { out: mk(PAN_OUT), back: mk(PAN_BACK), x0: PAN_X0, y0: PAN_Y0, x1: PAN_X0 + PAN_W * 2, y1: PAN_Y0 + PAN_H * 2 };
  // the end of the return pan (18.08–19.12): the face comes back as a different, softer drawing than the stare's (no
  // hatching; brows and eyes redrawn). Measured as its own mosaic of those frames (retInk.js, carries their blur);
  // transparent where the frames never saw the world
  const rc = document.createElement("canvas"); rc.width = RET_W; rc.height = RET_H;
  { const g = rc.getContext("2d"); for (const lev of RET) shapeSet(g, lev, { div: 1000 }); }
  const ret = { c: rc, x0: RET_X0, y0: RET_Y0, x1: RET_X0 + RET_W * 2, y1: RET_Y0 + RET_H * 2 };
  L = { plates: [mid, face, boxes], pan, ret, traced, designer: null, scratch: null, acc: null, owl: new Map() };
  return L;
}
// the carton view's world origin = minus the camera offset at the hold (cam.js)
const BOX_WX = 2203.3, BOX_WY = -1893.4;
function roomTrace(levels, paper, x0, y0, feather, fw = 30) {
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = gv(paper); g.fillRect(0, 0, W, H);
  for (const lev of levels) shapeSet(g, lev, { div: 1000 });
  g.globalCompositeOperation = "destination-out";
  for (const side of feather) {
    const [ax, ay, bx, by, rx, ry, rw, rh] = side === "r" ? [W, 0, W - fw, 0, W - fw, 0, fw, H] : side === "l" ? [0, 0, fw, 0, 0, 0, fw, H] : side === "t" ? [0, 0, 0, fw, 0, 0, W, fw] : [0, H, 0, H - fw, 0, H - fw, W, fw];
    const gr = g.createLinearGradient(ax, ay, bx, by); gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(rx, ry, rw, rh);
  }
  g.globalCompositeOperation = "source-over";
  return { c, x0, y0, x1: x0 + W, y1: y0 + H };
}
// the designer, drawn once per phase (world rect x 0..W, y -400..H): the stare and the look
function designer() {
  if (L.designer) return L.designer;
  const mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H + 400; const g = c.getContext("2d"); g.translate(0, 400); return [c, g]; };
  const [base, bg] = mk(); paintBase(bg);
  const [stare, sg] = mk(); sg.drawImage(base, 0, -400); paintEyes(sg, 0);
  const [look, lg] = mk(); lg.drawImage(base, 0, -400); paintEyes(lg, 1);
  return (L.designer = { stare, look, x0: 0, y0: -400, x1: W, y1: H });
}
// scratch-lab hook (snapshots/s02-lab only; the film never calls it): change designer options and rebuild it
export const __lab = { designer(opts) { Object.assign(DOPTS, opts); if (L) L.designer = null; } };
const visible = (r, ox, oy, m) => r.x1 + ox > -m && r.x0 + ox < W + m && r.y1 + oy > -m && r.y0 + oy < H + m;

// paint the world (room, designer, eyes, sweat) with the camera offset (ox, oy)
function drawWorld(g, t, ox, oy, m) {
  for (const p of L.plates) if (visible(p, ox, oy, m)) g.drawImage(p.c, p.x0 + ox, p.y0 + oy, p.x1 - p.x0, p.y1 - p.y0);
  { const p = L.pan; g.drawImage(t < 15.5 ? p.out : p.back, p.x0 + ox, p.y0 + oy, p.x1 - p.x0, p.y1 - p.y0); }
  for (const p of L.traced) if (visible(p, ox, oy, m)) g.drawImage(p.c, p.x0 + ox, p.y0 + oy);
  const f = frameOf(t);
  if (f < FLY_F0 && t >= 13.6) {
    // 15.88–15.96: the wings leave the sides (measured silhouettes behind the sitting owl; the camera is still)
    if (f >= WING_F0) drawOwlWings(g, f, t);
    g.drawImage(sitCanvas(sitEyes(f)), BOX_WX + SIT_BOX[0] + ox, BOX_WY + SIT_BOX[1] + oy);
  }
  const D = designer();
  if (visible(D, ox, oy, m)) {
    const st = eyeState(t);
    if (st.look < 1) {
      g.drawImage(D.stare, D.x0 + ox, D.y0 + oy);
      g.save(); g.translate(ox, oy); g.lineCap = "round"; g.lineJoin = "round"; paintIris(g, st.dx, st.dy); g.restore();
    }
    if (st.look > 0) { g.save(); g.globalAlpha = st.look; g.drawImage(D.look, D.x0 + ox, D.y0 + oy); g.restore(); }
    g.save(); g.translate(ox, oy);
    g.lineCap = "round"; g.lineJoin = "round";
    const sa = tab(SLIDE_A, t) / 28, sb = smooth(clamp((t - 6.04) / (7.25 - 6.04)));
    for (const d of DROPS) {
      const u = d.slide === "a" ? sa : d.slide === "b" ? sb : 0;
      const ox = (d.dx || 0) * u, oy = (d.dy || 0) * u, gy = (d.grow || 0) * u;
      drop(g, [d.top[0] + ox, d.top[1] + oy - gy], [d.bot[0] + ox, d.bot[1] + oy], d.small ? 0.5 : 1);
    }
    g.restore();
  }
}

// the sitting owl: measured drawings (owlInk.js) in hold-frame coords, world-locked beside the carton view
const SIT_BOX = [930, 36, 1250, 372];
function sitCanvas(eyes) {
  const k = "sit-" + eyes;
  if (L.owl.has(k)) return L.owl.get(k);
  const [x0, y0, x1, y1] = SIT_BOX, c = document.createElement("canvas"); c.width = x1 - x0; c.height = y1 - y0;
  const g = c.getContext("2d");
  for (const lev of SIT) shapeSet(g, lev, { div: 1000, dx: -x0, dy: -y0 });
  if (eyes !== "open") for (const lev of eyes === "half" ? SIT_HALF : SIT_SHUT) shapeSet(g, lev, { div: 1000, dx: -x0, dy: -y0 });
  L.owl.set(k, c);
  return c;
}
// the flying owl: this frame's measured wings, then the measured body, placed by the root track (x, y, scale, bank)
function drawOwlWings(ctx, f, tq) {
  const x = WROOT(tq, 1), y = WROOT(tq, 2), s = WROOT(tq, 3), rot = WROOT(tq, 4);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  drawWingInk(ctx, f, 0); drawWingInk(ctx, f, 1);
  ctx.restore();
}
// the source's owl is a little soft in flight (edge blur measured along the wing outlines, frames 397..478, minus the
// sharpest frames' 1.0 px; smoothed): sigma px
const OWL_SOFT = [0.00,0.00,0.00,0.16,0.49,0.66,0.69,0.75,0.73,0.63,0.50,0.43,0.54,0.67,0.73,0.85,0.95,0.95,0.91,0.88,0.84,0.80,0.76,0.71,0.64,0.55,0.37,0.24,0.44,0.60,0.45,0.40,0.62,0.66,0.41,0.22,0.30,0.28,0.36,0.79,1.08,1.19,1.22,1.15,1.02,0.95,0.99,0.98,0.91,0.95,1.05,1.08,1.05,1.03,1.11,1.19,1.16,1.07,0.96,0.93,1.09,1.22,1.15,1.10,1.26,1.36,1.26,1.19,1.26,1.31,1.15,1.03,1.22,1.31,1.09,0.97,1.19,1.36,1.24,1.10,1.18,1.41];
function drawFlyingOwl(ctx, f, tq) {
  const x = WROOT(tq, 1), y = WROOT(tq, 2), s = WROOT(tq, 3);
  // drawn offscreen round the root, then laid in with the measured softness
  const bw = Math.ceil(1100 * s), bh = Math.ceil(900 * s), bx = Math.floor(x - bw / 2), by = Math.floor(y - bh * 0.55);
  if (!L.owlBuf) L.owlBuf = document.createElement("canvas");
  const B = L.owlBuf; if (B.width !== bw || B.height !== bh) { B.width = bw; B.height = bh; }
  const g = B.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, bw, bh); g.translate(-bx, -by);
  drawOwlWings(g, f, tq);
  const rot = WROOT(tq, 4);
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s);
  for (const lev of FLY) shapeSet(g, lev, { div: 1000 });
  g.restore();
  const sg = Math.hypot(OWL_SOFT[Math.max(0, Math.min(OWL_SOFT.length - 1, f - WING_F0))], DOPTS.owlBlur || 0);
  ctx.save(); if (sg > 0.25) ctx.filter = `blur(${sg.toFixed(2)}px)`; ctx.drawImage(B, bx, by); ctx.restore();
}

// the colour lift: masks from the frame itself at half resolution (any non-black pixel for green; the mids and up for
// red), added with "lighter"
function tint(ctx, t) {
  const gA = tab2(TINT, t, 1), rA = tab2(TINT, t, 2);
  if (gA < 0.2 && rA < 0.2) return;
  if (!L.tint) { L.tint = document.createElement("canvas"); L.tint.width = W >> 1; L.tint.height = H >> 1; }
  const T = L.tint, tg = T.getContext("2d");
  for (const [amt, k, col] of [[gA, 32, "#00ff00"], [rA, 3, "#ff0000"]]) {
    if (amt < 0.2) continue;
    tg.globalCompositeOperation = "source-over"; tg.filter = `grayscale(1) brightness(${k})`;
    tg.drawImage(ctx.canvas, 0, 0, T.width, T.height);
    tg.filter = "none"; tg.globalCompositeOperation = "multiply"; tg.fillStyle = col; tg.fillRect(0, 0, T.width, T.height);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = amt / 255;
    ctx.drawImage(T, 0, 0, W, H);
    ctx.restore();
  }
}

export const shot = {
  draw(ctx, local, t) {
    let f = frameOf(t);
    if (REPEAT.has(f)) f -= 1;
    const tq = f / 25;
    layers();
    const off = camAt(f);
    const [blen, soft] = blurAt(tq);
    if (blen < 1 && soft < 0.3) {
      drawWorld(ctx, tq, off[0], off[1], 0);
    } else {
      // the world into an offscreen buffer with a margin, smeared along the pan (N copies, premultiplied "lighter"
      // sum) into a second buffer, then one isotropic gaussian on the way to the frame
      const m = Math.ceil(blen / 2 + 3 * soft) + 4;
      if (!L.scratch) { L.scratch = document.createElement("canvas"); L.scratch2 = document.createElement("canvas"); }
      const S = L.scratch, S2 = L.scratch2;
      for (const c of [S, S2]) if (c.width !== W + 2 * m || c.height !== H + 2 * m) { c.width = W + 2 * m; c.height = H + 2 * m; }
      const sg = S.getContext("2d");
      sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = "source-over"; sg.globalAlpha = 1; sg.filter = "none";
      sg.fillStyle = "#000"; sg.fillRect(0, 0, S.width, S.height);
      drawWorld(sg, tq, off[0] + m, off[1] + m, m);
      let src = S;
      if (blen >= 1) {
        const dir = panDir(f);
        const N = Math.min(9, 2 + Math.round(blen / 2.5));
        const g2 = S2.getContext("2d");
        g2.setTransform(1, 0, 0, 1, 0, 0); g2.filter = "none";
        g2.globalCompositeOperation = "source-over"; g2.globalAlpha = 1; g2.fillStyle = "#000"; g2.fillRect(0, 0, S2.width, S2.height);
        g2.globalCompositeOperation = "lighter"; g2.globalAlpha = 1 / N;
        for (let k = 0; k < N; k++) { const u = (k / (N - 1) - 0.5) * blen; g2.drawImage(S, dir[0] * u, dir[1] * u); }
        g2.globalCompositeOperation = "source-over"; g2.globalAlpha = 1;
        src = S2;
      }
      ctx.save();
      if (soft >= 0.3) ctx.filter = `blur(${soft.toFixed(2)}px)`;
      ctx.drawImage(src, -m, -m);
      ctx.restore();
    }
    // the return drawing over the (blurred) world, fading in over its first frames
    if (f >= RET_F0) {
      const R = L.ret; ctx.save(); ctx.globalAlpha = Math.min(1, (f - RET_F0 + 1) / 4);
      ctx.drawImage(R.c, R.x0 + off[0], R.y0 + off[1], R.x1 - R.x0, R.y1 - R.y0); ctx.restore();
    }
    // the owl in flight (from 16.00; before that it sits, drawn with the world)
    if (f >= FLY_F0) drawFlyingOwl(ctx, f, tq);
    tint(ctx, tq);
  },
  release() { L = null; },
};
