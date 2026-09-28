// s27 (drawn) — the colour owl (the user's character): cream face disc, soft grey cap and wings, big brown glossy eyes,
// small orange beak, a crossed plaster on its brow, dark headband with orange/yellow cups, orange feet.
// Drawn in owl units = frame px at the perched size of 127.2 s, origin = midway between the eyes (eye spacing 75).
// Proportions measured on a 3x gridded crop of the source at 127.2 s (perched) and 126.6 s (flying).
import { smoothPath } from "../../../lib/paths.js";

const O = {
  ink: "#4a3b39", inkSoft: "rgba(74,59,57,0.55)",
  white: "#f0e2c8", cream: "#f3e5ce", shade: "#d9bca6",
  cap: "#bfa89e", capD: "#a18c84", capL: "#cdb9ae",
  wing: "#ad9990", wingD: "#89716f", wingL: "#c4b1a5",
  iris: "#7c4e32", irisD: "#4f3020", irisL: "#a87048", pupil: "#2b1a14",
  beak: "#e88a45", beakD: "#c86a2e", foot: "#e8904a", footD: "#c56d33",
  band: "#3c3537", bandL: "#6a6264", cupO: "#e3903a", cupY: "#f2c257", cupD: "#b8662a",
  plaster: "#efc7ad", plasterD: "#d9a88b",
};

function sp(g, pts, closed = true) { g.beginPath(); smoothPath(g, pts, closed); }
function inkS(g, w) { g.lineWidth = w; g.strokeStyle = O.ink; g.lineJoin = "round"; g.lineCap = "round"; g.stroke(); }
const mirror = (pts) => pts.map(([x, y]) => [-x, y]);

// ---------------------------------------------------------------- shapes (perched, 127.2 s)
const HEAD = [[-82, -5], [-76, -46], [-54, -72], [-10, -82], [35, -80], [70, -66], [89, -36], [93, 0], [83, 32], [52, 54], [0, 60], [-47, 54], [-74, 30]];
const DISC = [[0, -50], [-32, -64], [-64, -48], [-79, -10], [-72, 26], [-44, 51], [0, 58], [44, 51], [75, 26], [84, -10], [70, -48], [36, -64]];
const BODY = [[-78, 30], [-98, 80], [-100, 130], [-86, 168], [-55, 190], [0, 198], [55, 197], [96, 180], [116, 142], [114, 90], [98, 45], [40, 52], [-30, 50]];
const WING_FOLD = [[66, 50], [98, 62], [122, 98], [138, 140], [148, 182], [128, 180], [106, 168], [86, 146], [72, 110], [64, 78]];
const WING_FOLD_L = [[-72, 56], [-88, 96], [-90, 140], [-80, 172], [-70, 160], [-68, 108]];

function drawWingSpread(g, side, lift, s) {
  // a spread wing from the shoulder, raised by `lift` (0 = level, 1 = up); feathers fan to the tip
  const sh = [side * 62, 72];
  const ang = (side > 0 ? -0.35 : Math.PI + 0.35) + (side > 0 ? -1 : 1) * lift * 0.55;
  const L = 150;
  const tip = [sh[0] + Math.cos(ang) * L, sh[1] + Math.sin(ang) * L];
  const nx = -Math.sin(ang), ny = Math.cos(ang);  // perpendicular (downward-ish for the trailing edge)
  const pd = side > 0 ? 1 : -1;
  const lead = [sh, [sh[0] + Math.cos(ang) * L * 0.45 - nx * pd * 14, sh[1] + Math.sin(ang) * L * 0.45 - ny * pd * 14], tip];
  const feathers = [];
  const n = 5;
  for (let i = 0; i < n; i++) {
    const u = 0.35 + (i / (n - 1)) * 0.65;
    const base = [sh[0] + Math.cos(ang) * L * u, sh[1] + Math.sin(ang) * L * u];
    const fl = 34 + 26 * (1 - Math.abs(u - 0.7));
    const fa = ang + pd * (1.2 - 0.6 * u);
    feathers.push([base, [base[0] + Math.cos(fa) * fl, base[1] + Math.sin(fa) * fl]]);
  }
  // wing body: leading edge then back along the feather tips to the shoulder
  const outline = [sh, lead[1], tip];
  for (let i = feathers.length - 1; i >= 0; i--) outline.push(feathers[i][1]);
  outline.push([sh[0] + side * 4, sh[1] + 40]);
  sp(g, outline, true); g.fillStyle = O.wing; g.fill();
  // lighter coverts near the leading edge
  const cov = [sh, lead[1], [tip[0] * 0.85 + sh[0] * 0.15, tip[1] * 0.85 + sh[1] * 0.15], [sh[0] + (tip[0] - sh[0]) * 0.5 + nx * pd * 16, sh[1] + (tip[1] - sh[1]) * 0.5 + ny * pd * 16], [sh[0] + side * 6, sh[1] + 24]];
  sp(g, cov, true); g.fillStyle = O.wingL; g.fill();
  sp(g, outline, true); inkS(g, 2.4 / s);
  // feather separations
  for (const [b, e] of feathers) { g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo(e[0] * 0.8 + b[0] * 0.2, e[1] * 0.8 + b[1] * 0.2); inkS(g, 1.5 / s); }
}

function drawEye(g, cx, cy, r, state, look, s) {
  if (state === "happy" || state === "wink") {
    // ^ shaped closed eye (happy squint)
    g.beginPath(); g.moveTo(cx - r * 0.75, cy + r * 0.2); g.quadraticCurveTo(cx, cy - r * 0.55, cx + r * 0.75, cy + r * 0.2);
    inkS(g, 3.2 / s + 1.2);
    return;
  }
  const [lx, ly] = look;
  g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fillStyle = "#fbf8f2"; g.fill();
  const ix = cx + lx * r * 0.12, iy = cy + ly * r * 0.12, ir = r * 0.86;
  const gr = g.createRadialGradient(ix, iy + ir * 0.35, ir * 0.1, ix, iy, ir);
  gr.addColorStop(0, O.irisL); gr.addColorStop(0.55, O.iris); gr.addColorStop(1, O.irisD);
  g.beginPath(); g.arc(ix, iy, ir, 0, 7); g.fillStyle = gr; g.fill();
  g.beginPath(); g.arc(ix, iy, ir * 0.52, 0, 7); g.fillStyle = O.pupil; g.fill();
  g.beginPath(); g.arc(ix + ir * 0.3, iy - ir * 0.28, ir * 0.24, 0, 7); g.fillStyle = "#ffffff"; g.fill();
  g.beginPath(); g.arc(ix - ir * 0.32, iy + ir * 0.36, ir * 0.1, 0, 7); g.fillStyle = "rgba(255,255,255,0.85)"; g.fill();
  g.beginPath(); g.arc(cx, cy, r, 0, 7); inkS(g, 2.4 / s + 0.6);
}

function drawPlaster(g, x, y, s) {   // one small sticking plaster, tilted (as on the source at 127.2 s)
  g.save(); g.translate(x, y); g.rotate(-0.42);
  g.beginPath(); g.roundRect(-17, -6.5, 34, 13, 6); g.fillStyle = O.plaster; g.fill(); inkS(g, 1.5 / s + 0.3);
  g.fillStyle = O.plasterD; g.beginPath(); g.roundRect(-5, -4, 10, 8, 2); g.fill();
  g.restore();
}

function drawFoot(g, x, y, s, spread = 1) {
  for (let k = -1; k <= 1; k++) {
    g.save(); g.translate(x + k * 9 * spread, y); g.rotate(k * 0.35 * spread);
    g.beginPath(); g.ellipse(0, 3, 5.5, 10, 0, 0, 7); g.fillStyle = O.foot; g.fill(); inkS(g, 1.5 / s);
    g.restore();
  }
}

// ---------------------------------------------------------------- the owl
// P: { x, y, s, rot, eyes: "open"|"happy"|"wink", look:[x,y], wings: 0 folded .. 1 spread, lift: 0..1 (wings raised),
//      feet: 0 tucked .. 1 perched/down, sy (squash), turn: 0 frontal .. 1 (toward three-quarter left) }
export function drawColorOwl(g, P) {
  const { x, y, s = 1, rot = 0, eyes = "open", look = [0, 0], wings = 0, lift = 0.5, feet = 1, sy = 1, turn = 0 } = P;
  g.save();
  g.translate(x, y); g.rotate(rot); g.scale(s, s * sy);
  const lw = 2.6 / s + 0.9;
  // headphone band behind the head (far half)
  // wings spread go behind the body
  if (wings > 0.02) { g.save(); g.globalAlpha = Math.min(1, wings * 1.5); drawWingSpread(g, -1, lift, s); drawWingSpread(g, 1, lift, s); g.restore(); }
  // left headphone cup (behind the head)
  // body
  sp(g, BODY); g.fillStyle = O.white; g.fill();
  g.save(); sp(g, BODY); g.clip();
  const bg = g.createLinearGradient(-80, 0, 100, 0);
  bg.addColorStop(0, "rgba(170,160,150,0.45)"); bg.addColorStop(0.3, "rgba(0,0,0,0)"); bg.addColorStop(1, "rgba(150,140,135,0.2)");
  g.fillStyle = bg; g.fillRect(-100, 20, 220, 190);
  g.restore();
  sp(g, BODY); inkS(g, lw);
  // chest feather ticks
  g.strokeStyle = O.inkSoft; g.lineWidth = 1.5 / s + 0.4;
  for (const [fx, fy] of [[-40, 95], [-12, 104], [18, 98], [-28, 128], [6, 132], [38, 122], [-8, 156], [26, 152]]) {
    g.beginPath(); g.moveTo(fx - 6, fy - 3); g.quadraticCurveTo(fx, fy + 3, fx + 6, fy - 3); g.stroke();
  }
  // folded wings
  if (wings < 0.98) {
    g.save(); g.globalAlpha = 1 - wings;
    sp(g, WING_FOLD); g.fillStyle = O.wing; g.fill();
    g.save(); sp(g, WING_FOLD); g.clip();
    g.fillStyle = O.wingL; sp(g, [[64, 52], [96, 64], [118, 96], [100, 110], [76, 96]]); g.fill();
    g.strokeStyle = O.inkSoft; g.lineWidth = 1.4 / s + 0.4;
    for (const k of [0, 1, 2]) { g.beginPath(); g.moveTo(80 + k * 10, 110 + k * 22); g.quadraticCurveTo(100 + k * 10, 120 + k * 22, 126 + k * 6, 118 + k * 22); g.stroke(); }
    g.fillStyle = O.wingD; sp(g, [[108, 150], [138, 148], [148, 182], [128, 180]]); g.fill();
    g.restore();
    sp(g, WING_FOLD); inkS(g, lw);
    sp(g, WING_FOLD_L); g.fillStyle = O.wing; g.fill(); sp(g, WING_FOLD_L); inkS(g, lw * 0.8);
    g.restore();
  }
  // feet
  if (feet > 0.05) { g.save(); g.globalAlpha = Math.min(1, feet * 2); drawFoot(g, -22, 186 + (1 - feet) * -14, s); drawFoot(g, 50, 190 + (1 - feet) * -14, s); g.restore(); }
  // head (turn shifts the face disc toward the left)
  g.save(); g.translate(-turn * 18, 0);
  sp(g, HEAD); g.fillStyle = O.cap; g.fill();
  g.save(); sp(g, HEAD); g.clip();
  const hg = g.createLinearGradient(0, -80, 0, 10);
  hg.addColorStop(0, O.capL); hg.addColorStop(1, O.cap); g.fillStyle = hg; g.fillRect(-100, -90, 200, 100);
  const disc = DISC.map(([px, py]) => [px - turn * 10 * (px > 0 ? 1.4 : 0.6), py]);
  sp(g, disc); g.fillStyle = O.white; g.fill();
  const dg = g.createRadialGradient(0, 10, 10, 0, 10, 80); dg.addColorStop(0, "rgba(255,255,255,0)"); dg.addColorStop(1, "rgba(200,190,180,0.35)");
  sp(g, disc); g.fillStyle = dg; g.fill();
  g.restore();
  // tuft (right top)
  sp(g, [[38, -84], [50, -104], [56, -88], [68, -100], [72, -76]], true); g.fillStyle = O.cap; g.fill(); inkS(g, lw * 0.8);
  sp(g, HEAD); inkS(g, lw);
  sp(g, disc, true); g.lineWidth = 1.6 / s + 0.4; g.strokeStyle = O.inkSoft; g.stroke();
  drawPlaster(g, -20, -66, s);
  // eyes
  const le = eyes === "wink" ? "open" : eyes;
  drawEye(g, -35 - turn * 8, -2, 22, le, look, s);
  drawEye(g, 38 - turn * 16, 0, 22.5, eyes, look, s);
  // beak
  const bx = -4 - turn * 12;
  sp(g, [[bx - 9, 15], [bx + 9, 16], [bx + 1, 42]], true); g.fillStyle = O.beak; g.fill(); inkS(g, lw * 0.8);
  g.beginPath(); g.moveTo(bx - 5, 18); g.lineTo(bx + 1, 38); g.lineWidth = 1 / s + 0.3; g.strokeStyle = "rgba(255,220,180,0.7)"; g.stroke();
  g.restore();
  // left cup at the side of the head (partly turned away), then the headband over the top, right cup
  g.save(); g.translate(-76 - turn * 6, 6);
  g.beginPath(); g.ellipse(0, 0, 14 * (1 - 0.4 * turn), 44, 0.05, 0, 7); g.fillStyle = O.band; g.fill(); inkS(g, lw * 0.8);
  g.beginPath(); g.ellipse(-4, 0, 9 * (1 - 0.4 * turn), 38, 0.05, 0, 7); g.fillStyle = O.cupO; g.fill();
  g.restore();
  // headband over the top, right cup
  g.beginPath(); g.moveTo(-76, -24); g.bezierCurveTo(-68, -128, 80, -138, 102, -40);
  g.lineWidth = 10; g.strokeStyle = O.band; g.lineCap = "round"; g.stroke();
  g.lineWidth = 2.4; g.strokeStyle = O.bandL; g.stroke();
  g.save(); g.translate(100 - turn * 20, 2);
  g.beginPath(); g.ellipse(-6, 0, 28, 44, 0.06, 0, 7); g.fillStyle = O.band; g.fill(); inkS(g, lw * 0.8);
  g.beginPath(); g.ellipse(2, 0, 25, 41, 0.06, 0, 7); g.fillStyle = O.cupO; g.fill(); inkS(g, lw * 0.7);
  g.beginPath(); g.ellipse(6, 0, 15, 27, 0.06, 0, 7); g.fillStyle = O.cupY; g.fill();
  g.beginPath(); g.ellipse(6, -14, 7, 12, 0.06, 0, 7); g.fillStyle = "rgba(255,245,210,0.7)"; g.fill();
  g.restore();
  g.restore();
}
