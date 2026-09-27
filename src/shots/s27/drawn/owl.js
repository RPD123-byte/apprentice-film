// s27 (drawn) — the colour owl (the user's character): a round chibi owl — wide head with a warm-grey cap, a small ear
// tuft, a heart-shaped cream facial disc with a grey V between big brown glossy eyes, a small orange beak, crossed
// plasters on its brow, a dark headband with orange cups; a smaller pear-shaped cream body, grey wings, orange feet.
// Drawn in owl units = frame px at the perched size (eye spacing 75), origin = midway between the eyes (frontal).
// Proportions measured on 2–3.5x gridded crops of the source at 127.2 s (perched, snapshots/s27-fix1-tools/o1,o2.jpg),
// 126.6 / 126.92 s (flying / landing, o3,o4.jpg) and 129.0 / 129.28 s (three-quarter view, o5,o6.jpg).
// Fix pass 1: new silhouette (bigger head, pear body), wings that swing between spread and folded at full opacity
// (no cross-fade), orange cups with a dark rim, a real three-quarter turn (features ride a sphere; far eye and cup hide).
import { smoothPath } from "../../../lib/paths.js";

const O = {
  ink: "#3e302e", inkSoft: "rgba(74,59,57,0.55)",
  disc: "#f0e0c6", belly: "#eedcc0", shade: "#dcc6b0",
  cap: "#b4a296", capL: "#c2b1a6", capD: "#9c8a80",
  wing: "#a8948c", wingD: "#83706a", wingL: "#bdaba1",
  iris: "#6b4535", irisD: "#3e261c", irisL: "#a8744c", pupil: "#2b1a14",
  beak: "#e68c52", beakD: "#c9743a", foot: "#e8894a",
  band: "#3c3537", bandL: "#6a6264", cupO: "#e8a13a", cupL: "#f3c060", cupRim: "#3a2a26",
  plaster: "#ecb9a6", plasterD: "#d69a88",
};

function sp(g, pts, closed = true) { g.beginPath(); smoothPath(g, pts, closed); }
function inkS(g, w) { g.lineWidth = w; g.strokeStyle = O.ink; g.lineJoin = "round"; g.lineCap = "round"; g.stroke(); }
const lerp = (a, b, u) => a + (b - a) * u;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------- shapes (perched, 127.2 s, owl units)
// (fix pass 2) re-measured on a 2x gridded crop of the source at 127.2 s (snapshots/s27-fix2-meas/owl_src.jpg; frame px
// -> owl units: (x - 1370) / 0.91, (y - 509) / 0.91): the head is wide and short and runs straight into a wider, fluffy
// pear body with no seam (the left side is one near-straight contour); the head sits a little right of the eye midpoint.
const OUTLINE = [[-88, -10], [-77, -43], [-60, -70], [-33, -85], [0, -89], [33, -87], [66, -79], [93, -63], [108, -37], [112, -4], [110, 29],
  [106, 52], [114, 82], [120, 124], [110, 168], [80, 198], [36, 212], [-18, 212], [-62, 200], [-88, 174], [-98, 132], [-96, 88], [-88, 44]];
const HEAD_R = 95;   // sphere radius the face features ride when the owl turns
// the cream facial disc: two lobes over the eyes with the grey V notch between them, running down into the chest
const DISC = [[2, -12], [-5, -34], [-27, -47], [-55, -45], [-77, -32], [-88, -6], [-86, 34], [-72, 56], [-44, 64], [2, 70], [55, 66], [88, 52],
  [106, 23], [106, -10], [90, -34], [64, -47], [33, -47], [11, -34]];
// the chest seam under the face (a faint line), the cream belly
const CHIN = [[-80, 44], [-44, 62], [2, 68], [55, 64], [96, 46]];
// the folded wing tucked along the right side (grey, 1455–1510 x 560–690 frame px)
// (fix pass 2b) the folded wing lies ON the body's right side (its outer edge is the silhouette), broad and rounded
const WING_R_FOLD = [[66, 46], [96, 52], [114, 76], [124, 116], [124, 156], [114, 186], [96, 206], [74, 210], [66, 184], [62, 140], [60, 96]];
const WING_L_EDGE = [[-84, 60], [-92, 100], [-92, 150], [-84, 180], [-76, 172], [-80, 130], [-80, 90]];

// a spread wing from the shoulder toward the tip, in the image plane (right wing; mirror for left)
//   w: 0 folded .. 1 spread out; lift: raise of the spread wing (0 level .. 1 up). (fix pass 2) broad, rounded, with
//   scalloped primaries (source 126.6–126.9: wide soft wings, not blades)
function wingPts(w, lift) {
  const S = [74, 60];
  const aF = Math.atan2(196 - 60, 140 - 74), aS = -(0.12 + 0.62 * lift);
  const a = lerp(aF, aS, w), L = lerp(140, 165, w), W = lerp(52, 92, w), fan = lerp(0.35, 1, w);
  const ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;
  const P = (u, v) => [S[0] + ux * u + vx * v, S[1] + uy * u + vy * v];
  const pts = [P(-6, -10), P(L * 0.4, -W * lerp(0.3, 0.26, w)), P(L * 0.8, -W * lerp(0.16, 0.14, w)), P(L, 0)];
  // five rounded primaries along the trailing edge, tip to root
  for (let i = 0; i < 5; i++) {
    const u = L * (1 - 0.16 * i), v = W * (0.14 + 0.19 * i * fan + 0.1 * (1 - fan) * i);
    pts.push(P(u - L * 0.03, v)); pts.push(P(u - L * 0.1, v * lerp(0.97, 0.84, w)));
  }
  pts.push(P(L * 0.1, W * 0.95)); pts.push(P(-4, W * 0.6));
  return { pts, P, L, W, fan };
}
function drawWing(g, side, w, lift, s, lw) {
  const { pts, P, L, W, fan } = wingPts(w, lift);
  g.save(); g.scale(side, 1);
  sp(g, pts, true); g.fillStyle = O.wing; g.fill();
  g.save(); sp(g, pts, true); g.clip();
  sp(g, [P(-6, -10), P(L * 0.4, -W * 0.26), P(L * 0.75, -W * 0.1), P(L * 0.6, W * 0.3), P(L * 0.25, W * 0.45), P(0, W * 0.32)], true); g.fillStyle = O.wingL; g.fill();
  sp(g, [P(L * 0.55, W * 0.4), P(L * 0.95, W * 0.08), P(L, W * 0.3), P(L * 0.7, W * 1.1)], true); g.fillStyle = O.wingD; g.globalAlpha = 0.35; g.fill(); g.globalAlpha = 1;
  g.restore();
  sp(g, pts, true); inkS(g, lw * 0.9);
  g.strokeStyle = O.inkSoft; g.lineWidth = 1.4 / s + 0.3;
  for (let i = 0; i < 4; i++) {
    const u = L * (0.9 - 0.16 * i), v = W * (0.22 + 0.19 * i * fan);
    const a = P(u - L * 0.22, v * 0.4), b = P(u - L * 0.08, v * 0.95);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  }
  const c0 = P(L * 0.1, W * 0.36), c1 = P(L * 0.42, W * 0.3), c2 = P(L * 0.72, W * 0.05);
  g.beginPath(); g.moveTo(c0[0], c0[1]); g.quadraticCurveTo(c1[0], c1[1], c2[0], c2[1]); g.stroke();
  g.restore();
}

function drawEye(g, cx, cy, r, sx, state, look, s) {
  // sx: horizontal squash (foreshortening when the head turns)
  g.save(); g.translate(cx, cy); g.scale(sx, 1);
  if (state === "happy") {
    g.beginPath(); g.moveTo(-r * 0.8, r * 0.2); g.quadraticCurveTo(0, -r * 0.6, r * 0.8, r * 0.2);
    inkS(g, 3.4 / s + 1.4); g.restore(); return;
  }
  const [lx, ly] = look;
  g.beginPath(); g.arc(0, 0, r, 0, 7); g.fillStyle = "#fbf7ef"; g.fill();
  const ix = lx * r * 0.1, iy = ly * r * 0.1, ir = r * 0.84;
  const gr = g.createRadialGradient(ix, iy + ir * 0.4, ir * 0.1, ix, iy, ir);
  gr.addColorStop(0, O.irisL); gr.addColorStop(0.5, O.iris); gr.addColorStop(1, O.irisD);
  g.beginPath(); g.arc(ix, iy, ir, 0, 7); g.fillStyle = gr; g.fill();
  g.beginPath(); g.arc(ix, iy, ir * 0.5, 0, 7); g.fillStyle = O.pupil; g.fill();
  g.beginPath(); g.arc(ix + ir * 0.3, iy - ir * 0.3, ir * 0.24, 0, 7); g.fillStyle = "#ffffff"; g.fill();
  g.beginPath(); g.arc(ix - ir * 0.34, iy + ir * 0.36, ir * 0.1, 0, 7); g.fillStyle = "rgba(255,255,255,0.85)"; g.fill();
  if (state === "half") {   // squint: the lid comes down over the top half, lashes on its edge
    g.beginPath(); g.moveTo(-r * 1.05, r * 0.08); g.quadraticCurveTo(0, -r * 0.25, r * 1.05, r * 0.08); g.lineTo(r * 1.05, -r * 1.1); g.lineTo(-r * 1.05, -r * 1.1); g.closePath();
    g.fillStyle = O.disc; g.fill();
    g.beginPath(); g.moveTo(-r * 0.95, r * 0.1); g.quadraticCurveTo(0, -r * 0.24, r * 0.95, r * 0.1); inkS(g, 3 / s + 1.2);
    g.beginPath(); g.arc(0, 0, r, 0.15, Math.PI - 0.15); inkS(g, 2.2 / s + 0.6);
  } else {
    g.beginPath(); g.arc(0, 0, r, 0, 7); inkS(g, 2.6 / s + 0.7);
  }
  g.restore();
}

function drawPlasters(g, x, y, s) {   // two small crossed plasters on the brow (126.92 / 127.2 s)
  for (const [a, dx, dy] of [[0.42, 0, 0], [-0.55, 4, -2]]) {
    g.save(); g.translate(x + dx, y + dy); g.rotate(a);
    g.beginPath(); g.roundRect(-18, -6.5, 36, 13, 6); g.fillStyle = O.plaster; g.fill(); inkS(g, 1.5 / s + 0.3);
    g.fillStyle = O.plasterD; g.beginPath(); g.roundRect(-5, -4, 10, 8, 2); g.fill();
    g.restore();
  }
}

function drawFoot(g, x, y, s) {
  for (let k = -1; k <= 1; k++) {
    g.save(); g.translate(x + k * 11, y); g.rotate(k * 0.45);
    g.beginPath(); g.ellipse(0, 4, 6.5, 12, 0, 0, 7); g.fillStyle = O.foot; g.fill(); inkS(g, 1.5 / s + 0.2);
    g.restore();
  }
}

function drawCup(g, x, y, rx, ry, lw, near = true) {
  // (fix pass 2) a headphone cup as on the source: a dark pad ring toward the head, a gold-orange face with a lighter
  // centre (no white glint ring); `near` = the pad is on the cup's left (the right cup), else on its right
  const k = near ? 1 : -1;
  g.beginPath(); g.ellipse(x, y, rx, ry, 0.05, 0, 7); g.fillStyle = O.cupRim; g.fill(); inkS(g, lw * 0.8);
  g.beginPath(); g.ellipse(x + k * rx * 0.3, y, rx * 0.7, ry * 0.9, 0.05, 0, 7); g.fillStyle = O.cupO; g.fill(); inkS(g, lw * 0.55);
  g.beginPath(); g.ellipse(x + k * rx * 0.38, y, rx * 0.4, ry * 0.6, 0.05, 0, 7); g.fillStyle = O.cupL; g.fill();
  g.beginPath(); g.ellipse(x + k * rx * 0.44, y - ry * 0.28, rx * 0.12, ry * 0.12, 0.05, 0, 7); g.fillStyle = "rgba(255,236,190,0.6)"; g.fill();
}

// ---------------------------------------------------------------- the owl
// P: { x, y, s, rot, eyes: "open"|"happy"|"wink", look:[x,y], wings: 0 folded .. 1 spread, lift: 0..1 (wings raised),
//      feet: 0 tucked .. 1 perched/down, sy (squash), turn: 0 frontal .. 1 three-quarter view to the left }
// The turn is a redraw, as in the source: the features slide from their frontal places (127.2 s) toward the three-quarter
// places (129.0 s) and the outline itself turns (its far side draws in, the near cheek swells), so no feature slides
// past a fixed frontal contour.
export function drawColorOwl(g, P) {
  const { x, y, s = 1, rot = 0, eyes = "open", look = [0, 0], wings = 0, lift = 0.5, feet = 1, sy = 1, turn = 0 } = P;
  g.save();
  g.translate(x, y); g.rotate(rot); g.scale(s, s * sy);
  const lw = 3.0 / s + 1.1;
  const u = clamp(turn, 0, 1), ue = u * u * (3 - 2 * u);
  const bw = clamp(wings, 0, 1);
  const wingsBehind = bw > 0.5;
  // the turned outline: the far (left) side draws in toward the centre, the whole silhouette shifts left a little
  const turnPt = ([px, py]) => [px < 0 ? px * (1 - 0.06 * ue) - 6 * ue : px * (1 + 0.04 * ue) - 6 * ue, py];
  const OUT = OUTLINE.map(turnPt), DSC = DISC.map(([px, py]) => { const q = turnPt([px, py]); return [(q[0] < 0 ? q[0] * (1 - 0.2 * ue) : q[0] * (1 - 0.3 * ue)) - 22 * ue, q[1]]; });
  // spread wings go behind the body (the far one hides once the owl has turned)
  if (wingsBehind) { if (u < 0.5) drawWing(g, -1, bw, lift, s, lw); drawWing(g, 1, bw, lift, s, lw); }
  // far cup behind the head's left edge (hidden once the owl has turned)
  const cupRy = 40;
  if (u < 0.8) drawCup(g, -82 - 14 * ue, -20, 14 * (1 - 0.6 * ue), cupRy * 0.92, lw, false);
  // head + body: one silhouette, cream, the grey cap over the crown and down the back of the head
  sp(g, OUT); g.fillStyle = O.belly; g.fill();
  g.save(); sp(g, OUT); g.clip();
  const hg = g.createLinearGradient(0, -92, 0, -20); hg.addColorStop(0, O.capL); hg.addColorStop(1, O.cap);
  g.fillStyle = hg; g.fillRect(-120, -100, 250, 110);
  sp(g, DSC); g.fillStyle = O.disc; g.fill();
  const dcx = -16 * ue;
  const dg = g.createRadialGradient(dcx + 10, 10, 14, dcx + 10, 10, 90); dg.addColorStop(0, "rgba(255,255,255,0)"); dg.addColorStop(1, "rgba(200,180,165,0.3)");
  sp(g, DSC); g.fillStyle = dg; g.fill();
  // body shading: soft grey along the left edge and the bottom; a warm shade under the chin
  const bg = g.createLinearGradient(-95, 0, 110, 0);
  bg.addColorStop(0, "rgba(160,140,130,0.45)"); bg.addColorStop(0.2, "rgba(0,0,0,0)"); bg.addColorStop(0.85, "rgba(0,0,0,0)"); bg.addColorStop(1, "rgba(160,140,130,0.3)");
  g.fillStyle = bg; g.fillRect(-120, 50, 250, 170);
  const bb = g.createLinearGradient(0, 160, 0, 212); bb.addColorStop(0, "rgba(0,0,0,0)"); bb.addColorStop(1, "rgba(190,160,145,0.4)");
  g.fillStyle = bb; g.fillRect(-120, 160, 250, 60);
  // the left wing's edge showing along the body's left side
  if (!wingsBehind && u < 0.6) { sp(g, WING_L_EDGE.map(turnPt)); g.fillStyle = O.wing; g.fill(); sp(g, WING_L_EDGE.map(turnPt)); g.lineWidth = 1.4 / s + 0.4; g.strokeStyle = O.inkSoft; g.stroke(); }
  g.restore();
  // chin seam and chest fluff ticks
  g.beginPath(); smoothPath(g, CHIN.map(turnPt), false); g.lineWidth = 1.4 / s + 0.4; g.strokeStyle = O.inkSoft; g.stroke();
  g.strokeStyle = O.inkSoft; g.lineWidth = 1.4 / s + 0.4;
  for (const [fx, fy] of [[-44, 104], [-8, 110], [26, 104], [-28, 136], [8, 140], [42, 134], [-52, 150]]) {
    const cx = fx - ue * 18;
    g.beginPath(); g.moveTo(cx - 8, fy - 5); g.quadraticCurveTo(cx - 4, fy + 3, cx, fy - 1); g.quadraticCurveTo(cx + 4, fy + 3, cx + 8, fy - 5); g.stroke();
  }
  // tuft (top right): three feather points, low on the crown
  const tx = 70 - 34 * ue;
  sp(g, [[tx - 20, -72], [tx - 4, -94], [tx + 4, -82], [tx + 16, -98], [tx + 18, -80], [tx + 32, -86], [tx + 26, -58]], true); g.fillStyle = O.cap; g.fill(); inkS(g, lw * 0.7);
  sp(g, OUT); inkS(g, lw);
  sp(g, DSC, true); g.lineWidth = 1.6 / s + 0.5; g.strokeStyle = O.ink; g.globalAlpha = 0.75; g.stroke(); g.globalAlpha = 1;
  // folded wings: the near one tucked along the right side (in front of the body)
  if (!wingsBehind) {
    if (bw > 0.02) drawWing(g, 1, bw, lift, s, lw);
    else { const W = WING_R_FOLD.map(([px, py]) => [px * (1 + 0.5 * ue) - 70 * ue, py]); sp(g, W); g.fillStyle = O.wing; g.fill(); sp(g, W); inkS(g, lw * 0.85);
      g.strokeStyle = O.inkSoft; g.lineWidth = 1.4 / s + 0.4;
      for (const [a, b] of [[[84, 120], [104, 170]], [[76, 140], [92, 190]], [[92, 96], [112, 140]]]) { g.beginPath(); g.moveTo(a[0] * (1 + 0.5 * ue) - 70 * ue, a[1]); g.lineTo(b[0] * (1 + 0.5 * ue) - 70 * ue, b[1]); g.stroke(); } }
    if (bw > 0.02 && u < 0.5) drawWing(g, -1, bw, lift, s, lw);
  }
  // feet
  if (feet > 0.05) { g.save(); g.globalAlpha = Math.min(1, feet * 2); drawFoot(g, -6 - 26 * ue, 192 + (1 - feet) * -14, s); drawFoot(g, 52 - 34 * ue, 198 + (1 - feet) * -14, s); g.restore(); }
  drawPlasters(g, -13 - 30 * ue, -68, s);
  // eyes: far eye -38 -> -76 (squashes and hides at full turn), near eye +44 -> -20
  const eL = eyes === "happy" ? "happy" : eyes === "wink" ? "half" : "open";
  const eR = eyes === "open" ? "open" : "happy";
  if (u < 0.93) drawEye(g, -38 - 40 * ue, -8, 23 * (1 - 0.25 * ue), 1 - 0.5 * ue, eL, look, s);
  drawEye(g, 44 - 60 * ue, -5 + 14 * ue, 24 * (1 - 0.25 * ue), 1 - 0.1 * ue, eR, look, s);
  // beak: base centre -8 -> -62, the tip pointing a little left once turned
  const bx = -8 - 54 * ue, bt = 16 * ue;
  sp(g, [[bx - 11 + 4 * ue, 14], [bx + 11, 16], [bx + 2 - bt * 0.4, 30], [bx - 5 - bt, 44 - 6 * ue]], true); g.fillStyle = O.beak; g.fill(); inkS(g, lw * 0.8);
  g.beginPath(); g.moveTo(bx - 4, 18); g.lineTo(bx - 3 - bt * 0.6, 36); g.lineWidth = 1 / s + 0.4; g.strokeStyle = "rgba(255,225,190,0.75)"; g.stroke();
  // headband: 12 units thick, from the far cup over the crown (apex ~40 units above it) to the near cup
  const cxL = -82 - 14 * ue, cxR = 133 - 60 * ue;
  g.beginPath(); g.moveTo(u < 0.8 ? cxL + 4 : -40, u < 0.8 ? -52 : -86); g.bezierCurveTo(-64 + 30 * ue, -150, 96 - 40 * ue, -150, cxR - 6, -60);
  g.lineWidth = 12; g.strokeStyle = O.band; g.lineCap = "round"; g.stroke();
  g.lineWidth = 2.6; g.strokeStyle = O.bandL; g.stroke();
  drawCup(g, cxR, -20 + 4 * ue, 15 * (1 + 0.9 * ue), cupRy * (1 + 0.05 * ue), lw, true);
  g.restore();
}
