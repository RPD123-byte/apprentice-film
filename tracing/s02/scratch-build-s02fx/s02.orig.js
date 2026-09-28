// Shot 2 (6.04–19.12): one continuous camera.
//   6.04–10.52  the stare: a hard front close-up of the designer lit from below by the laptop; his eyes scan in small
//               flicks (measured iris track), then snap to screen-right at 8.72–8.84 and hold; three sweat beads slide.
//   10.52–14.44 the pan: the camera swings up-right off his face (he slides out bottom-left), through the dark
//               shelves, accelerating (on twos at first), and stops dead on the cartons. At ~12.2 his face is already
//               the softer drawing the return pan shows (below).
//   14.44–16.52 locked on the carton stack: the owl sits on the top box; blink 15.20–15.64; the wings lift at 15.88.
//   16.00–19.12 it takes off, rises, drops toward us and flies right; the camera pans back down-left with it and his
//               face slides in again from the left (a softer redrawing, still looking right). Cut at 19.12.
// Camera: per-frame translation measured with chained ORB tracks (owl masked), anchored by direct matches back to the
// stare frame (src/shots/s02/cam.js). No zoom or rotation in the source (s = 1.000 ± 0.003).
// Everything is drawn from measurements of the source (scripts in src/shots/s02/trace/, README there) as vector shapes
// with values — no source pixels. World coords = the 6.04 frame. Layers, back to front:
//   the pans' world mosaic (panInk.js, two value sets: outbound / return), the two sharp room views (roomInk.js: the
//   shelves round his head, the carton stack at the hold), the sitting owl (owlInk.js), the designer (designer2.js:
//   faceInk.js outlines on measured grounds; the stare and the look; irises moved per frame; sweat beads per frame);
//   then the pan blur (measured smear + softness); the soft face/return mosaic (retInk.js); the flying owl (owlInk.js
//   body + wings.js per-frame wings on the measured root track); the colour lift.
import { W, H } from "../config.js";
import { clamp, lerp, smooth } from "../lib/rng.js";
import { CAM, CAM0 } from "./s02/cam.js";
import { DROPS, drop, HOODIE, BEANIE, SKIN, gv } from "./s02/designer.js";
import { HAIR } from "./s02/hairShapes.js";
import { paintBase, paintEyes, paintIris, DOPTS, shapeSet } from "./s02/designer2.js";
import { STARE, STARE_PAPER, BOXES, BOXES_PAPER } from "./s02/roomInk.js";
import { SIT, SIT_HALF, SIT_SHUT, FLY } from "./s02/owlInk.js";
import { PAN_OUT, PAN_BACK, PAN_X0, PAN_Y0, PAN_W, PAN_H, PAN_PAPER } from "./s02/panInk.js";
import { RET, RET_X0, RET_Y0, RET_W, RET_H } from "./s02/retInk.js";
import { drawWingInk } from "./s02/wingDraw.js";
import { WING_F0 } from "./s02/wings.js";

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

// ---------- the owl in flight: [t, root x, root y, px per owl unit, bank rad], one row per frame 16.00–19.12.
// First measured by template-matching the head (pass 1), then refit per frame (trace/fit_root.py, PART=head): each
// frame warped into the owl's frame, the similarity (shift, scale ±25%, bank −0.33…+0.15) aligning its head, cups and
// band edges with the median of the level-flight frames 17.84–19.12 (scores 0.67–0.93); smoothed 1-2-1.
const ROOT = [
  [16.00, 1084.4, 250.9, 0.6500, 0.0300], [16.04, 1085.0, 249.9, 0.6500, 0.0240], [16.08, 1085.3, 248.3, 0.6513, 0.0180], [16.12, 1085.4, 243.3, 0.6552, 0.0120], [16.16, 1085.7, 233.3, 0.6608, 0.0060], [16.20, 1086.4, 217.3, 0.6660, 0.0015], [16.24, 1087.2, 200.4, 0.6713, -0.0000], [16.28, 1088.0, 192.1, 0.6768, -0.0000], [16.32, 1089.8, 193.8, 0.6820, -0.0075], [16.36, 1092.7, 202.3, 0.6858, -0.0250], [16.40, 1095.0, 216.4, 0.6870, -0.0325], [16.44, 1096.4, 235.8, 0.6870, -0.0275], [16.48, 1099.3, 259.3, 0.6870, -0.0375], [16.52, 1104.6, 283.8, 0.6883, -0.0650], [16.56, 1111.2, 307.9, 0.6922, -0.0900], [16.60, 1118.8, 330.9, 0.6977, -0.1100], [16.64, 1128.3, 351.4, 0.7017, -0.1300], [16.68, 1140.2, 369.2, 0.7043, -0.1500], [16.72, 1154.0, 385.2, 0.7082, -0.1700], [16.76, 1168.6, 399.6, 0.7137, -0.1925], [16.80, 1184.2, 410.4, 0.7177, -0.2125], [16.84, 1201.2, 417.2, 0.7190, -0.2290], [16.88, 1219.4, 422.5, 0.7265, -0.2557], [16.92, 1237.3, 426.6, 0.7415, -0.2833], [16.96, 1259.4, 428.5, 0.7488, -0.3103], [17.00, 1287.0, 428.6, 0.7470, -0.3455], [17.04, 1305.9, 428.4, 0.7498, -0.3670], [17.08, 1314.8, 428.6, 0.7580, -0.3738], [17.12, 1326.8, 428.5, 0.7645, -0.3810], [17.16, 1343.4, 426.6, 0.7668, -0.3925], [17.20, 1360.5, 422.9, 0.7672, -0.4125], [17.24, 1375.9, 419.8, 0.7730, -0.4350], [17.28, 1390.2, 416.6, 0.7780, -0.4525], [17.32, 1404.9, 412.5, 0.7780, -0.4625], [17.36, 1420.4, 409.3, 0.7828, -0.4675], [17.40, 1437.0, 409.3, 0.7897, -0.4775], [17.44, 1452.2, 411.9, 0.7940, -0.4825], [17.48, 1465.2, 414.6, 0.8020, -0.4750], [17.52, 1477.3, 415.0, 0.8095, -0.4725], [17.56, 1488.8, 413.2, 0.8128, -0.4750], [17.60, 1498.8, 410.2, 0.8175, -0.4725], [17.64, 1507.4, 406.4, 0.8175, -0.4625], [17.68, 1515.8, 403.0, 0.8127, -0.4500], [17.72, 1524.6, 402.2, 0.8180, -0.4475], [17.76, 1533.4, 404.9, 0.8337, -0.4425], [17.80, 1541.9, 407.9, 0.8430, -0.4250], [17.84, 1548.2, 407.5, 0.8440, -0.4075], [17.88, 1551.5, 406.0, 0.8527, -0.3900], [17.92, 1553.1, 403.0, 0.8593, -0.3675], [17.96, 1554.0, 396.6, 0.8545, -0.3375], [18.00, 1555.8, 389.8, 0.8555, -0.3050], [18.04, 1557.7, 385.2, 0.8622, -0.2800], [18.08, 1558.6, 382.8, 0.8690, -0.2550], [18.12, 1560.1, 379.6, 0.8768, -0.2225], [18.16, 1562.9, 374.5, 0.8833, -0.1875], [18.20, 1566.2, 368.6, 0.8888, -0.1500], [18.24, 1570.3, 362.0, 0.8940, -0.1125], [18.28, 1574.9, 355.6, 0.8993, -0.0800], [18.32, 1579.4, 349.2, 0.9048, -0.0500], [18.36, 1584.1, 342.1, 0.9088, -0.0200], [18.40, 1589.2, 334.9, 0.9100, 0.0075], [18.44, 1594.9, 328.8, 0.9100, 0.0300], [18.48, 1600.9, 324.4, 0.9113, 0.0500], [18.52, 1606.9, 320.9, 0.9153, 0.0700], [18.56, 1614.6, 315.6, 0.9208, 0.0875], [18.60, 1623.9, 308.9, 0.9260, 0.1000], [18.64, 1631.3, 303.5, 0.9313, 0.1100], [18.68, 1637.6, 299.1, 0.9367, 0.1175], [18.72, 1644.8, 294.8, 0.9420, 0.1225], [18.76, 1651.4, 291.1, 0.9457, 0.1300], [18.80, 1658.4, 287.1, 0.9470, 0.1400], [18.84, 1666.4, 282.4, 0.9470, 0.1500], [18.88, 1673.2, 277.1, 0.9470, 0.1600], [18.92, 1679.3, 271.1, 0.9470, 0.1675], [18.96, 1686.2, 264.8, 0.9470, 0.1700], [19.00, 1693.4, 258.6, 0.9470, 0.1700], [19.04, 1699.0, 254.4, 0.9470, 0.1700], [19.08, 1702.5, 252.4, 0.9470, 0.1700], [19.12, 1707.1, 250.2, 0.9470, 0.1700]];
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
const SOFT_T0 = 12.14, SOFT_T1 = 12.3;
// the mosaic's level shapes are laid in with a little blur (the frames it measures are soft; hides the level edges)
const RET_BLUR = 1.2;
// ---------- layers ----------
let L = null;
function layers() {
  if (L) return L;
  // the two sharp views of the room, measured (roomInk.js): over the mosaic, feathered on the edges the pans reveal
  const traced = [roomTrace(STARE, STARE_PAPER, 0, 0, ["r", "t"]), roomTrace(BOXES, BOXES_PAPER, BOX_WX, BOX_WY, ["l", "b"])];
  // the pans' world mosaic (panInk.js, half resolution): under the two sharp views
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
  // the same soft drawing clipped to his silhouette (feathered ~6 px): the outbound pan already shows it (below)
  const fc = document.createElement("canvas"); fc.width = RET_W; fc.height = RET_H;
  { const g = fc.getContext("2d"); g.filter = "blur(3px)"; g.scale(0.5, 0.5); g.translate(-RET_X0, -RET_Y0); g.fillStyle = "#fff";
    for (const P of [HOODIE, SKIN, BEANIE]) { g.beginPath(); g.moveTo(P[0][0], P[0][1]); for (const p of P) g.lineTo(p[0], p[1]); g.closePath(); g.fill(); }
    for (const h of HAIR) { const o = h.o; g.beginPath(); g.moveTo(o[0], o[1]); for (let i = 2; i < o.length; i += 2) g.lineTo(o[i], o[i + 1]); g.closePath(); g.fill(); }
    // not the crown above the cuff's fold (world y < -140): the return frames hardly saw it
    g.globalCompositeOperation = "destination-out"; g.fillRect(-500, -1200, 3500, 1060);
    g.globalCompositeOperation = "source-over";
    g.filter = "none"; g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-in"; g.drawImage(rc, 0, 0); }
  ret.face = fc;
  L = { pan, ret, traced, designer: null, scratch: null, owl: new Map() };
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
// scratch-lab hook (snapshots/s02-lab only; the film never calls it): change the options (DOPTS) and rebuild the designer
export const __lab = { designer(opts) { Object.assign(DOPTS, opts); if (L) L.designer = null; } };
const visible = (r, ox, oy, m) => r.x1 + ox > -m && r.x0 + ox < W + m && r.y1 + oy > -m && r.y0 + oy < H + m;

// paint the world (room, designer, eyes, sweat) with the camera offset (ox, oy)
function drawWorld(g, t, ox, oy, m) {
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
    // the outbound pan: the source changes from the hatched stare drawing to the soft one at ~12.2 (fitted per frame
    // against both drawings; noisy under the smear); the soft face (silhouette below the crown) over the blurred world
    if (DOPTS.soft !== false && tq >= SOFT_T0 && tq < 13.6) {
      const R = L.ret; ctx.save(); ctx.globalAlpha = smooth(clamp((tq - SOFT_T0) / (SOFT_T1 - SOFT_T0)));
      // the mosaic carries the return pan's blur (~ sigma 2.8 + a 12 px smear); add what this frame has beyond it
      const ex = Math.sqrt(Math.max(0, soft * soft + blen * blen / 12 - (2.8 * 2.8 + 144 / 12))) * (DOPTS.softGain ?? 1);
      // the return pan exposed its mids a little brighter than the outbound pan (mosaics compared): dim toward 0.93
      const dim = DOPTS.softDim ?? 1 - 0.07 * smooth(clamp((tq - 12.5) / 0.3));
      ctx.filter = (ex > 0.3 ? `blur(${ex.toFixed(2)}px) ` : "") + (dim !== 1 ? `brightness(${dim})` : "") || "none";
      ctx.drawImage(R.face, R.x0 + off[0], R.y0 + off[1], R.x1 - R.x0, R.y1 - R.y0); ctx.restore();
    }
    // the return drawing over the (blurred) world, fading in over its first frames
    if (f >= RET_F0) {
      const R = L.ret; ctx.save(); ctx.globalAlpha = Math.min(1, (f - RET_F0 + 1) / 4);
      const rb = DOPTS.retBlur ?? RET_BLUR; if (rb > 0.2) ctx.filter = `blur(${rb}px)`;
      ctx.drawImage(R.c, R.x0 + off[0], R.y0 + off[1], R.x1 - R.x0, R.y1 - R.y0); ctx.restore();
    }
    // the owl in flight (from 16.00; before that it sits, drawn with the world)
    if (f >= FLY_F0) drawFlyingOwl(ctx, f, tq);
    tint(ctx, tq);
  },
  release() { L = null; },
};
