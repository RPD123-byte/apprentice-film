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
  band: "#3c3537", bandL: "#6a6264", cupO: "#dc7a32", cupL: "#eca052", cupRim: "#3a2a26",
  plaster: "#ecb9a6", plasterD: "#d69a88",
};

function sp(g, pts, closed = true) { g.beginPath(); smoothPath(g, pts, closed); }
function inkS(g, w) { g.lineWidth = w; g.strokeStyle = O.ink; g.lineJoin = "round"; g.lineCap = "round"; g.stroke(); }
const lerp = (a, b, u) => a + (b - a) * u;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------- shapes (perched, 127.2 s, owl units)
const HEAD = [[-84, 0], [-80, -38], [-64, -68], [-36, -84], [0, -89], [36, -86], [66, -74], [90, -50], [100, -14], [98, 22], [86, 50], [58, 70], [18, 79], [-24, 77], [-58, 64], [-78, 36]];
const HEAD_R = 95;   // sphere radius the face features ride when the owl turns
// heart-shaped facial disc: two lobes over the eyes and a V notch between them (grey cap shows in the notch)
const DISC = [[-3, -20], [-12, -40], [-30, -50], [-52, -48], [-70, -36], [-80, -12], [-80, 16], [-72, 42], [-50, 62], [-14, 73], [22, 73], [56, 64], [80, 46], [92, 18], [94, -10], [86, -32], [70, -46], [48, -51], [26, -48], [8, -38]];
const BODY = [[-72, 55], [-86, 90], [-92, 128], [-86, 158], [-66, 176], [-30, 187], [12, 190], [52, 186], [82, 172], [100, 148], [104, 115], [96, 84], [82, 58]];
const WING_L_FOLD = [[-66, 60], [-84, 94], [-90, 130], [-85, 162], [-72, 152], [-66, 120], [-62, 86]];

// a wing from the shoulder S toward the tip, in the image plane: pts for the given pose (right wing; mirror for left)
//   w: 0 folded down the side .. 1 spread out; lift: raise of the spread wing (0 level .. 1 up)
function wingPts(w, lift) {
  const S = [70, 60];
  // folded: tip hangs down-right to (158, 190); spread: out to the right and up
  const aF = Math.atan2(190 - 66, 158 - 72), aS = -(0.12 + 0.62 * lift);
  const a = lerp(aF, aS, w), L = lerp(150, 162, w), W = lerp(60, 66, w), fan = lerp(0.35, 1, w);
  const ux = Math.cos(a), uy = Math.sin(a), vx = -uy, vy = ux;   // v: the trailing side
  const P = (u, v) => [S[0] + ux * u + vx * v, S[1] + uy * u + vy * v];
  const pts = [P(0, -8), P(L * 0.45, -W * lerp(0.42, 0.22, w)), P(L * 0.85, -W * lerp(0.2, 0.12, w)), P(L, 0)];
  // five primaries along the trailing edge, tip to root: tips and notches
  for (let i = 0; i < 5; i++) {
    const u = L * (1 - 0.17 * i), v = W * (0.12 + 0.2 * i * fan + 0.1 * (1 - fan) * i);
    pts.push(P(u - L * 0.02, v));
    pts.push(P(u - L * 0.12, v * lerp(0.95, 0.72, w)));
  }
  pts.push(P(L * 0.08, W * 0.9)); pts.push(P(-4, W * 0.55));
  return { pts, P, L, W, fan };
}
function drawWing(g, side, w, lift, s, lw) {
  const { pts, P, L, W, fan } = wingPts(w, lift);
  g.save(); g.scale(side, 1);
  sp(g, pts, true); g.fillStyle = O.wing; g.fill();
  g.save(); sp(g, pts, true); g.clip();
  // lighter coverts along the leading edge, darker primaries toward the tip
  sp(g, [P(0, -8), P(L * 0.45, -W * 0.22), P(L * 0.8, -W * 0.1), P(L * 0.62, W * 0.28), P(L * 0.25, W * 0.42), P(0, W * 0.3)], true); g.fillStyle = O.wingL; g.fill();
  sp(g, [P(L * 0.55, W * 0.35), P(L * 0.95, W * 0.05), P(L, W * 0.3), P(L * 0.7, W * 1.1)], true); g.fillStyle = O.wingD; g.globalAlpha = 0.45; g.fill(); g.globalAlpha = 1;
  g.restore();
  sp(g, pts, true); inkS(g, lw);
  // feather separations and the covert edge
  g.strokeStyle = O.ink; g.lineWidth = 1.5 / s + 0.3;
  for (let i = 0; i < 4; i++) {
    const u = L * (0.9 - 0.17 * i), v = W * (0.2 + 0.2 * i * fan);
    const a = P(u - L * 0.2, v * 0.35), b = P(u - L * 0.06, v * 0.95);
    g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  }
  const c0 = P(L * 0.12, W * 0.32), c1 = P(L * 0.45, W * 0.25), c2 = P(L * 0.75, W * 0.02);
  g.beginPath(); g.moveTo(c0[0], c0[1]); g.quadraticCurveTo(c1[0], c1[1], c2[0], c2[1]); g.lineWidth = 1.3 / s + 0.3; g.strokeStyle = O.inkSoft; g.stroke();
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

function drawCup(g, x, y, rx, ry, lw) {   // a headphone cup: dark rim ring, orange face with a lighter centre
  g.beginPath(); g.ellipse(x, y, rx, ry, 0.05, 0, 7); g.fillStyle = O.cupRim; g.fill(); inkS(g, lw * 0.8);
  g.beginPath(); g.ellipse(x + rx * 0.22, y, rx * 0.74, ry * 0.86, 0.05, 0, 7); g.fillStyle = O.cupO; g.fill(); inkS(g, lw * 0.6);
  g.beginPath(); g.ellipse(x + rx * 0.3, y, rx * 0.44, ry * 0.56, 0.05, 0, 7); g.fillStyle = O.cupL; g.fill();
  g.beginPath(); g.ellipse(x + rx * 0.3, y, rx * 0.44, ry * 0.56, 0.05, 0, 7); g.lineWidth = 1.2; g.strokeStyle = "rgba(160,80,30,0.6)"; g.stroke();
  g.beginPath(); g.ellipse(x + rx * 0.36, y - ry * 0.3, rx * 0.16, ry * 0.14, 0.05, 0, 7); g.fillStyle = "rgba(255,240,205,0.75)"; g.fill();
}

// ---------------------------------------------------------------- the owl
// P: { x, y, s, rot, eyes: "open"|"happy"|"wink", look:[x,y], wings: 0 folded .. 1 spread, lift: 0..1 (wings raised),
//      feet: 0 tucked .. 1 perched/down, sy (squash), turn: 0 frontal .. 1 three-quarter view to the left }
// The turn is a redraw, as in the source (the drawing is not a rigid 3D head): every feature slides from its frontal
// place (127.2 s) to its three-quarter place (129.0 s), both measured in owl units relative to the head centre
// (o5/o6.jpg, owl_face_end.jpg): the far eye slides to the head's edge and hides, the beak ends past the left edge,
// the near cup comes round to the front of the head.
export function drawColorOwl(g, P) {
  const { x, y, s = 1, rot = 0, eyes = "open", look = [0, 0], wings = 0, lift = 0.5, feet = 1, sy = 1, turn = 0 } = P;
  g.save();
  g.translate(x, y); g.rotate(rot); g.scale(s, s * sy);
  const lw = 3.0 / s + 1.1;
  const u = clamp(turn, 0, 1), ue = u * u * (3 - 2 * u);
  const bw = clamp(wings, 0, 1);
  const wingsBehind = bw > 0.5;
  const bodyDx = -18 * u;
  // spread wings go behind the body (the far one hides once the owl has turned)
  if (wingsBehind) { g.save(); g.translate(bodyDx, 0); if (u < 0.5) drawWing(g, -1, bw, lift, s, lw); drawWing(g, 1, bw, lift, s, lw); g.restore(); }
  // body: cream, soft grey sides, chest fluff
  g.save(); g.translate(bodyDx, 0);
  sp(g, BODY); g.fillStyle = O.belly; g.fill();
  g.save(); sp(g, BODY); g.clip();
  const bg = g.createLinearGradient(-85, 0, 100, 0);
  bg.addColorStop(0, "rgba(170,150,140,0.5)"); bg.addColorStop(0.28, "rgba(0,0,0,0)"); bg.addColorStop(0.8, "rgba(0,0,0,0)"); bg.addColorStop(1, "rgba(160,140,130,0.35)");
  g.fillStyle = bg; g.fillRect(-100, 40, 220, 180);
  const bb = g.createLinearGradient(0, 150, 0, 205); bb.addColorStop(0, "rgba(0,0,0,0)"); bb.addColorStop(1, "rgba(190,160,145,0.4)");
  g.fillStyle = bb; g.fillRect(-100, 150, 220, 60);
  g.restore();
  sp(g, BODY); inkS(g, lw);
  g.strokeStyle = O.inkSoft; g.lineWidth = 1.4 / s + 0.4;
  for (const [fx, fy] of [[-34, 96], [0, 100], [30, 94], [-18, 126], [16, 128], [-44, 138]]) {
    const cx = fx - u * 14;
    g.beginPath(); g.moveTo(cx - 8, fy - 5); g.quadraticCurveTo(cx - 4, fy + 3, cx, fy - 1); g.quadraticCurveTo(cx + 4, fy + 3, cx + 8, fy - 5); g.stroke();
  }
  // folded wings lie against the sides, in front of the body (the near one comes round as the owl turns)
  if (!wingsBehind) {
    if (u < 0.5) { sp(g, WING_L_FOLD); g.fillStyle = O.wing; g.fill(); sp(g, WING_L_FOLD); inkS(g, lw * 0.85); }
    if (bw > 0.02 && u < 0.5) drawWing(g, -1, bw, lift, s, lw);
    g.save(); g.translate(-44 * u, 0); drawWing(g, 1, bw, lift, s, lw); g.restore();
  }
  g.restore();
  // feet
  if (feet > 0.05) { g.save(); g.globalAlpha = Math.min(1, feet * 2); drawFoot(g, -10 - 30 * u, 190 + (1 - feet) * -14, s); drawFoot(g, 50 - 38 * u, 193 + (1 - feet) * -14, s); g.restore(); }
  // far cup (behind the head; gone once the owl has turned)
  const cupRy = 43;
  if (u < 0.45) drawCup(g, -82 - 30 * u, -6, 11, cupRy * 0.95, lw);
  // head: cap, disc (slides left and narrows on its far side), outline, tuft, plasters
  sp(g, HEAD); g.fillStyle = O.cap; g.fill();
  g.save(); sp(g, HEAD); g.clip();
  const hg = g.createLinearGradient(0, -90, 0, 0); hg.addColorStop(0, O.capL); hg.addColorStop(1, O.cap); g.fillStyle = hg; g.fillRect(-110, -95, 220, 100);
  const disc = DISC.map(([px, py]) => [px < 0 ? px * (1 - 0.18 * u) - 34 * ue : px * (1 - 0.3 * u) - 34 * ue, py]);
  sp(g, disc); g.fillStyle = O.disc; g.fill();
  const dcx = -34 * ue;
  const dg = g.createRadialGradient(dcx, 10, 12, dcx, 10, 85); dg.addColorStop(0, "rgba(255,255,255,0)"); dg.addColorStop(1, "rgba(200,180,165,0.35)");
  sp(g, disc); g.fillStyle = dg; g.fill();
  g.restore();
  // tuft (top right): three feather points
  const tx = 62 - 30 * u;
  sp(g, [[tx - 22, -78], [tx - 2, -104], [tx + 4, -90], [tx + 18, -106], [tx + 18, -86], [tx + 32, -94], [tx + 22, -66]], true); g.fillStyle = O.cap; g.fill(); inkS(g, lw * 0.75);
  sp(g, HEAD); inkS(g, lw);
  sp(g, disc, true); g.lineWidth = 1.8 / s + 0.5; g.strokeStyle = O.ink; g.stroke();
  drawPlasters(g, -13 - 34 * u, -64, s);
  // eyes (outline centres; the irises sit a little inward): far eye -37 -> -80 (hides), near eye +39 -> -34
  const eL = eyes === "happy" ? "happy" : eyes === "wink" ? "half" : "open";
  const eR = eyes === "open" ? "open" : "happy";
  if (u < 0.93) drawEye(g, -37 - 45 * u, -2, 21, 1 - 0.55 * u, eL, look, s);
  drawEye(g, 39 - 73 * u, 2, 23, 1 - 0.12 * u, eR, look, s);
  // beak: base centre -5 -> -68, tip ends past the left edge of the head at full turn
  const bx = -5 - 63 * u, bt = 22 * u;
  sp(g, [[bx - 11 + 4 * u, 17], [bx + 11, 19], [bx + 2 - bt * 0.4, 34], [bx - 6 - bt, 48 - 8 * u]], true); g.fillStyle = O.beak; g.fill(); inkS(g, lw * 0.8);
  g.beginPath(); g.moveTo(bx - 4, 21); g.lineTo(bx - 3 - bt * 0.6, 40); g.lineWidth = 1 / s + 0.4; g.strokeStyle = "rgba(255,225,190,0.75)"; g.stroke();
  // headband over the top, then the near cup (124 -> 50, turning to face us)
  const cxL = -82 - 30 * u, cxR = 124 - 74 * u;
  g.beginPath(); g.moveTo(u < 0.45 ? cxL + 4 : -40 + 20 * u, u < 0.45 ? -32 : -70); g.bezierCurveTo(-70 + 50 * u, -170, 78 - 30 * u, -176, cxR - 2, -44);
  g.lineWidth = 11; g.strokeStyle = O.band; g.lineCap = "round"; g.stroke();
  g.lineWidth = 2.6; g.strokeStyle = O.bandL; g.stroke();
  drawCup(g, cxR, -4 + 4 * u, 28 * (1 + 0.25 * u), cupRy * (1 + 0.08 * u), lw);
  g.restore();
}
