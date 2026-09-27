// The colour owl of the morning room (cream face, grey-brown cap and wings, orange headphones, a pink crossed
// plaster, big brown eyes, orange beak and feet). Drawn in code in "owl units" = frame px at 127.4 s, origin at the
// midpoint between its eyes (frame (1372, 505) at 127.4 s). All shapes were measured on the 127.4 s source frame
// (zoom crops with a 10 px grid) and are drawn here with canvas paths.
//   drawOwl(ctx, { x, y, s, rot, sy, wings, eyes, feet, look })
//     wings: 0 folded · 1 spread level · 2 raised (V) · between = blend; eyes: "open" | "happy" (^^) | "wink"
//     feet: 0 perched · 1 dangling
import { spath, path } from "./paint.js";
import { OWL_FRAMES, OWL_TAIL } from "./owlTrace.js";
import { poly as dec } from "./codec.js";

const LINE = "#3f2c26", LINE_S = "rgba(63,44,38,0.55)";
const FACE = "#efe5cf", FACE_SH = "#ddd0bb", CAP = "#b9a799", CAP_D = "#a18f82", BELLY = "#ece0c8", BELLY_SH = "#d3c1aa";
const WING = "#ad9c92", WING_D = "#8c796f", WING_L = "#c5b6ab";
const CUP = "#e2a255", CUP_L = "#f1c47a", CUP_RIM = "#c4662f", CUSH = "#5d4944", BAND = "#56463f";
const BEAK = "#dc8c58", BEAK_D = "#b8663c", FOOT = "#d77d48", IRIS = "#7b5039", IRIS_L = "#a87a58", PUPIL = "#2b1a14";
const PLASTER = "#e7ab9d", PLASTER_D = "#cf8b7c";

function sh(g, pts, fill, lw = 2.2, smooth = true, line = LINE) {
  g.beginPath(); (smooth ? spath : path)(g, pts, true);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (lw) { g.lineWidth = lw; g.strokeStyle = line; g.lineJoin = "round"; g.stroke(); }
}
function ln(g, pts, lw = 1.6, col = LINE, smooth = true) {
  g.beginPath(); (smooth ? spath : path)(g, pts, false); g.lineWidth = lw; g.strokeStyle = col; g.lineCap = "round"; g.lineJoin = "round"; g.stroke();
}
function ell(g, x, y, rx, ry, fill, lw = 0, rot = 0, line = LINE) {
  g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  if (fill) { g.fillStyle = fill; g.fill(); }
  if (lw) { g.lineWidth = lw; g.strokeStyle = line; g.stroke(); }
}
const lerp = (a, b, u) => a + (b - a) * u;
const lerpP = (A, B, u) => A.map((p, i) => [lerp(p[0], B[i][0], u), lerp(p[1], B[i][1], u)]);

// ---- wings: point lists (owl units) for the viewer's-right wing; the left one is mirrored ----
// folded: hugging the body side; spread: level, feathers fanned; raised: tips up and out (a V)
const WING_FOLD = [[58, 50], [96, 58], [128, 84], [142, 116], [140, 142], [128, 156], [112, 142], [96, 118], [74, 94], [60, 78]];
const WING_SPREAD = [[56, 48], [110, 30], [168, 22], [214, 32], [236, 54], [214, 66], [224, 84], [196, 90], [200, 108], [168, 106], [150, 118], [112, 106], [74, 96], [58, 78]];
const WING_RAISE = [[56, 50], [92, 14], [130, -34], [168, -70], [196, -84], [196, -56], [214, -46], [188, -20], [198, 0], [166, 8], [150, 34], [116, 60], [80, 88], [60, 80]];
function wingPts(w) {
  if (w <= 1) return lerpP(WING_FOLD, WING_SPREAD, w);
  return lerpP(WING_SPREAD, WING_RAISE, Math.min(1, w - 1));
}
function drawWing(g, w, side) {
  const P = wingPts(w).map(([x, y]) => [x * side + (side < 0 ? -2 : 0), y]);
  sh(g, P, WING, 2.2);
  // feather separations toward the tip
  if (w > 0.2) {
    const n = P.length, tipI = [4, 6, 8, 10];
    for (const i of tipI) {
      const a = P[Math.min(n - 1, i)], b = [P[0][0] * 0.4 + a[0] * 0.6, P[0][1] * 0.4 + a[1] * 0.6];
      ln(g, [a, b], 1.4, LINE_S, false);
    }
    // darker covert band near the shoulder
    const c = P[0], d = P[Math.floor(n / 2)];
    ln(g, [[c[0], c[1] + 8], [(c[0] + d[0]) / 2, (c[1] + d[1]) / 2 + 6]], 1.2, LINE_S, false);
  } else {
    // folded: a few feather lines down the wing
    ln(g, [[side * 96, 92], [side * 118, 128], [side * 126, 150]], 1.3, LINE_S);
    ln(g, [[side * 80, 104], [side * 102, 138]], 1.3, LINE_S);
    g.save(); g.beginPath(); spath(g, P, true); g.clip();
    ell(g, side * 128, 150, 30, 26, WING_D); g.restore();
    sh(g, P, null, 2.2);
  }
}

function eye(g, x, y, r, state, look = [0, 0]) {
  if (state === "happy") {                       // ^^ closed arcs
    ln(g, [[x - r * 0.85, y + r * 0.25], [x, y - r * 0.45], [x + r * 0.85, y + r * 0.25]], 3.2);
    return;
  }
  if (state === "wink") {                        // a flat heavy lid line
    ln(g, [[x - r * 0.9, y], [x, y + r * 0.25], [x + r * 0.9, y - 0.1 * r]], 3.4);
    return;
  }
  ell(g, x, y, r, r, "#fbf6ea", 0);
  ell(g, x + look[0] * r * 0.15, y + look[1] * r * 0.15, r * 0.86, r * 0.86, IRIS, 0);
  g.save(); g.beginPath(); g.ellipse(x, y, r * 0.86, r * 0.86, 0, 0, 7); g.clip();
  ell(g, x - r * 0.1, y + r * 0.45, r * 0.7, r * 0.45, IRIS_L); g.restore();
  ell(g, x + look[0] * r * 0.2, y + look[1] * r * 0.2, r * 0.55, r * 0.55, PUPIL, 0);
  ell(g, x + r * 0.3, y - r * 0.32, r * 0.24, r * 0.24, "#ffffff", 0);
  ell(g, x - r * 0.32, y + r * 0.36, r * 0.09, r * 0.09, "#ffffff", 0);
  ell(g, x, y, r, r, null, 2.4);
}

export function drawOwl(ctx, o) {
  const { x, y, s = 1, rot = 0, sx = 1, sy = 1, wings = 0, eyes = "open", feet = 0, look = [0, 0], alpha = 1 } = o;
  const g = ctx;
  g.save();
  g.globalAlpha *= alpha;
  g.translate(x, y); g.rotate(rot); g.scale(s * sx, s * sy);
  g.lineCap = "round"; g.lineJoin = "round";
  // band (behind the head)
  ln(g, [[-58, -52], [-24, -100], [38, -118], [88, -100], [114, -60]], 11, LINE);
  ln(g, [[-56, -54], [-24, -99], [38, -116], [87, -99], [112, -60]], 6.5, BAND);
  // left cup (mostly behind the head)
  ell(g, -73, -9, 14, 31, CUP_RIM, 2.2); ell(g, -68, -9, 9, 27, CUSH, 0);
  // wings behind the body when raised/spread
  if (wings > 0.2) { drawWing(g, wings, 1); drawWing(g, wings, -1); }
  // feet (behind the belly edge)
  const fy = lerp(0, 14, feet);
  for (const [fx, fyy] of [[-10, 169], [48, 172]]) {
    for (let k = -1; k <= 1; k++) {
      g.save(); g.translate(fx + k * 11, fyy + fy); g.rotate(k * 0.35 + (feet ? 0.1 : 0));
      ell(g, 0, 4, 6.5, 10, FOOT, 1.8); g.restore();
    }
  }
  // body
  const BODY = [[-66, 40], [-82, 86], [-80, 130], [-58, 162], [0, 176], [64, 175], [112, 157], [136, 117], [128, 72], [98, 44], [20, 34]];
  sh(g, BODY, BELLY, 2.4);
  g.save(); g.beginPath(); spath(g, BODY, true); g.clip();
  ell(g, -72, 108, 20, 64, BELLY_SH); ell(g, 20, 178, 96, 16, BELLY_SH);
  if (wings <= 0.2) {
    // left wing edge (narrow, grey) along the body side
    sh(g, [[-76, 64], [-66, 66], [-62, 108], [-64, 142], [-72, 140], [-80, 106]], WING, 1.4);
  }
  g.restore();
  // chest feather ticks
  for (const [cx, cy] of [[-30, 70], [2, 88], [36, 78], [-18, 112], [22, 118], [-40, 138], [60, 110]]) ln(g, [[cx - 7, cy - 3], [cx, cy + 3], [cx + 7, cy - 3]], 1.3, LINE_S, false);
  if (wings <= 0.2) drawWing(g, 0, 1);
  // head
  const HEAD = [[-80, 40], [-86, -10], [-78, -50], [-50, -78], [-2, -90], [50, -88], [80, -72], [92, -40], [90, 0], [80, 32], [40, 48], [-20, 50]];
  sh(g, HEAD, CAP, 0);
  g.beginPath(); spath(g, HEAD, true); g.lineWidth = 1.4; g.strokeStyle = LINE_S; g.stroke();
  ln(g, [[-82, 30], [-86, -10], [-78, -50], [-50, -78], [-2, -90], [50, -88], [80, -72], [92, -40], [90, 0], [82, 28]], 2.4, LINE);
  // tuft top right
  sh(g, [[70, -80], [88, -96], [92, -72]], CAP, 2.0);
  g.save(); g.beginPath(); spath(g, HEAD, true); g.clip();
  ell(g, -60, -40, 30, 40, CAP_D);
  // facial disc: two lobes
  g.beginPath(); g.ellipse(-34, -8, 40, 42, 0, 0, 7); g.ellipse(38, -2, 48, 48, 0, 0, 7); g.rect(-90, 4, 190, 60); g.fillStyle = FACE; g.fill();
  // the grey cap comes down between the eyes in a soft V toward the beak
  g.beginPath(); g.moveTo(-8, -46); g.quadraticCurveTo(2, -20, -2, 6); g.quadraticCurveTo(4, -22, 16, -46); g.closePath(); g.fillStyle = CAP; g.fill();
  ell(g, -44, 24, 16, 9, "rgba(222,150,140,0.35)"); ell(g, 54, 28, 18, 10, "rgba(222,150,140,0.35)");
  g.beginPath(); g.moveTo(-10, 36); g.quadraticCurveTo(4, 50, 30, 42); g.lineTo(30, 30); g.lineTo(-10, 30); g.fillStyle = FACE; g.fill();
  g.restore();
  // disc rim lines (thin)
  ln(g, [[-64, -10], [-52, -38], [-28, -46], [-6, -38], [2, -44], [26, -48], [56, -42], [80, -20]], 1.5, LINE_S);
  ln(g, [[-60, 22], [-36, 38], [-6, 42], [26, 46], [58, 38], [80, 16]], 1.3, LINE_S);
  // feather flecks on the cap
  for (const [a, b, c2, d] of [[10, -78, 24, -66], [30, -80, 40, -68], [52, -76, 60, -64], [-30, -74, -20, -62]]) ln(g, [[a, b], [c2, d]], 1.2, LINE_S, false);
  // bandage (crossed plasters)
  g.save(); g.translate(-15, -63);
  for (const r of [0.5, -0.45]) {
    g.save(); g.rotate(r);
    g.beginPath(); g.roundRect(-15, -6, 30, 12, 5); g.fillStyle = PLASTER; g.fill(); g.lineWidth = 1.6; g.strokeStyle = LINE; g.stroke();
    g.fillStyle = PLASTER_D; g.fillRect(-4, -4, 8, 8);
    g.restore();
  }
  g.restore();
  // eyes
  const eL = eyes === "wink" ? "wink" : eyes, eR = eyes === "wink" ? "happy" : eyes;
  eye(g, -34, -10, 18, eL, look); eye(g, 36, -3, 22, eR, look);
  if (eyes === "open") { ln(g, [[-50, -26], [-36, -30], [-24, -26]], 1.4, LINE_S); ln(g, [[20, -28], [36, -32], [52, -27]], 1.4, LINE_S); }
  // beak
  sh(g, [[-18, 18], [8, 16], [-7, 40]], BEAK, 2.0, false);
  g.beginPath(); g.moveTo(-5, 20); g.lineTo(6, 18); g.lineTo(-6, 36); g.fillStyle = BEAK_D; g.globalAlpha *= 0.5; g.fill(); g.globalAlpha /= 0.5;
  // right cup + cushion (in front of the head)
  ell(g, 94, -5, 13, 39, CUSH, 2.2);
  ell(g, 117, -7, 19, 43, CUP_RIM, 2.4);
  ell(g, 120, -7, 14, 36, CUP, 0);
  ell(g, 124, -12, 7, 20, CUP_L, 0);
  ln(g, [[110, -48], [112, -58]], 5, LINE);
  g.restore();
}

// ---------- the traced owl (owlTrace.js): one traced drawing per source frame 125.40-129.00 ----------
const OWL_T0 = 125.4;
// the traced frame for film time t (on the 25 fps grid), with its offset; null outside 125.40-129.28
export function owlTraceAt(t) {
  const i = Math.round((t - OWL_T0) * 25);
  if (i < 0) return null;
  if (i < OWL_FRAMES.length) return { f: OWL_FRAMES[i], dx: 0, dy: 0 };
  const k = i - OWL_FRAMES.length;
  if (k < OWL_TAIL.length) return { f: OWL_FRAMES[OWL_FRAMES.length - 1], dx: OWL_TAIL[k][1], dy: OWL_TAIL[k][2] };
  return null;
}
function tpath(g, a) { const p = dec(a); g.moveTo(p[0] / 2, p[1] / 2); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i] / 2, p[i + 1] / 2); g.closePath(); }
export function paintOwlTrace(g, tr) {
  const [, REG, INK] = tr.f;
  g.save(); g.translate(tr.dx, tr.dy); g.lineJoin = "round";
  for (const r of REG) { g.beginPath(); tpath(g, r[1]); for (let k = 2; k < r.length; k++) tpath(g, r[k]); g.fillStyle = r[0]; g.fill("evenodd"); g.lineWidth = 0.9; g.strokeStyle = r[0]; g.stroke(); }
  for (const grp of INK) { g.beginPath(); for (let k = 1; k < grp.length; k++) for (const p of grp[k]) tpath(g, p); g.fillStyle = grp[0]; g.fill("evenodd"); }
  g.restore();
}
