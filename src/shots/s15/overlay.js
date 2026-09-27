// s15 floor props drawn over the corridor (fix pass 1b): things lying on the floor that the roto faces cannot carry
// (they are not flat four-cornered faces).
//  - the coiled cable of take H (44.00–44.16): a loose coil of dark cable lying on the boards in front of the gear
//    wall, measured on the source frames as a bounding box per frame (frame px, x0 y0 x1 y1; snapshots/s15-fix1c/m/
//    coil.jpg, rackgrid.jpg); drawn as the same loops scaled into each frame's box, so it slides with the camera.
//  - the cable coiled on the gear room's floor in front of the leaning keyboard (44.44–44.84), measured the same way.
import { rng } from "../../lib/rng.js";

const COIL = [[1100, 400, 755, 633, 844], [1101, 455, 771, 694, 882], [1102, 458, 795, 737, 908], [1103, 330, 815, 752, 950], [1104, 400, 868, 755, 985]];
// the cable coiled on the gear room's floor (44.44–44.84), in front of the leaning keyboard, its lead running up to
// the keyboard's foot: [frame, x0, y0, x1, y1] (snapshots/s15-fix1c/m/cable.jpg; even frames interpolated)
const COIL2 = [[1111, 1210, 748, 1350, 780], [1113, 1233, 778, 1383, 817], [1115, 1244, 804, 1422, 849], [1117, 1250, 832, 1439, 871],
  [1119, 1261, 859, 1483, 909], [1121, 1250, 876, 1506, 933]];
function coil2At(f) {
  if (f < COIL2[0][0] || f > COIL2[COIL2.length - 1][0]) return null;
  for (let i = 0; i < COIL2.length; i++) {
    if (COIL2[i][0] === f) return COIL2[i];
    if (COIL2[i][0] > f) { const a = COIL2[i - 1], b = COIL2[i], u = (f - a[0]) / (b[0] - a[0]); return a.map((v, k) => v + (b[k] - v) * u); }
  }
  return null;
}

// loops in the unit box (u 0..1 across, v 0..1 down): [cx, cy, rx, ry, rot, width]
let LOOPS = null;
function loops() {
  if (LOOPS) return LOOPS;
  const r = rng(4411);
  LOOPS = [];
  for (let i = 0; i < 6; i++) LOOPS.push([0.47 + (r() - 0.5) * 0.12, 0.5 + (r() - 0.5) * 0.16, 0.36 + r() * 0.12, 0.3 + r() * 0.12, (r() - 0.5) * 0.25, 5 + r() * 3.5]);
  return LOOPS;
}

// (fix 2) the cables hanging from the top of the frame at 42.40-42.56, measured on the source (strip 42.40-42.68, grid
// 42.52): [frame, x0, y0, x1, y1, kind]: kind 0 = two thin pale strands hanging in long curves (42.40-42.48), 1 = one
// thick grey ribbed rope arcing down and to the right, behind the lit box (42.52-42.56)
const HANG = [[1060, 1200, -40, 1300, 260, 0], [1061, 1205, -40, 1320, 300, 0], [1062, 1225, -30, 1360, 300, 0], [1063, 1335, -20, 1480, 215, 1],
  [1064, 1440, -60, 1610, 70, 1]];
function drawHang(ctx, row) {
  const [, x0, y0, x1, y1, kind] = row, w = x1 - x0, h = y1 - y0;
  const P = (u, v) => [x0 + u * w, y0 + v * h];
  const strands = kind ? [[P(0.02, 0), P(0.06, 0.5), P(0.3, 0.92), P(0.7, 1.0), P(1.0, 0.8)]]
    : [[P(0.95, 0), P(0.7, 0.35), P(0.35, 0.7), P(0.1, 1.0)], [P(1.0, 0.1), P(0.8, 0.45), P(0.5, 0.8), P(0.28, 1.0)]];
  const lw = kind ? Math.max(16, w * 0.25) : 7;
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.filter = "blur(1.5px)";
  for (const pts of strands) {
    const path = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length - 1; i++) { const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2]; ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); } ctx.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]); };
    ctx.strokeStyle = "rgba(6,6,6,0.95)"; ctx.lineWidth = lw + (kind ? 5 : 3); path(); ctx.stroke();
    ctx.strokeStyle = kind ? "rgb(92,92,90)" : "rgb(150,150,146)"; ctx.lineWidth = lw; path(); ctx.stroke();
    // (the thick rope's ribs: a wide dashed stroke, each dash a lighter band across it)
    if (kind) { ctx.setLineDash([5, 7]); ctx.strokeStyle = "rgba(175,175,170,0.45)"; ctx.lineWidth = lw * 0.8; path(); ctx.stroke(); ctx.setLineDash([]); }
  }
  ctx.restore();
}

export function drawFloorProps(ctx, tf) {
  const f = Math.round(tf * 25);
  const hg = HANG.find((c) => c[0] === f);
  if (hg) drawHang(ctx, hg);
  const row = COIL.find((c) => c[0] === f);
  if (row) drawCoil(ctx, row, -1);
  // (s15.js resolves held frames first, so 44.68 arrives as 44.64)
  const r2 = coil2At(f);
  if (r2) drawCoil(ctx, r2, 1);
}
// loops scaled into the box [f, x0, y0, x1, y1]; lead: -1 = off to the upper left, 1 = up to the upper right
function drawCoil(ctx, row, lead) {
  const [, x0, y0, x1, y1] = row, w = x1 - x0, h = y1 - y0;
  ctx.save();
  ctx.lineCap = "round";
  // (the source frames here are soft with the camera's motion)
  ctx.filter = "blur(1.2px)";
  for (const [cx, cy, rx, ry, rot, lw] of loops()) {
    const X = x0 + cx * w, Y = y0 + cy * h, RX = rx * w, RY = ry * h;
    ctx.strokeStyle = "rgba(10,10,10,0.92)"; ctx.lineWidth = lw * (w / 280);
    ctx.beginPath(); ctx.ellipse(X, Y, RX, RY, rot, 0, Math.PI * 2); ctx.stroke();
    // a thin lit edge along the top of each loop
    ctx.strokeStyle = "rgba(200,200,196,0.55)"; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.ellipse(X, Y - lw * 0.35, RX, RY, rot, Math.PI * 1.1, Math.PI * 1.85); ctx.stroke();
  }
  // the lead running off toward the gear wall (up and to the left)
  ctx.strokeStyle = "rgba(10,10,10,0.92)"; ctx.lineWidth = 6 * (w / 280);
  if (lead < 0) { ctx.beginPath(); ctx.moveTo(x0 + 0.12 * w, y0 + 0.45 * h); ctx.bezierCurveTo(x0 - 0.05 * w, y0 + 0.2 * h, x0 + 0.02 * w, y0 - 0.1 * h, x0 - 0.06 * w, y0 - 0.25 * h); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(x1 - 0.1 * w, y0 + 0.2 * h); ctx.bezierCurveTo(x1 + 0.02 * w, y0 - 0.3 * h, x1 - 0.12 * w, y0 - 0.9 * h, x1 - 0.02 * w, y0 - 1.6 * h); ctx.stroke(); }
  ctx.restore();
}
