// The owl in colour, as it sits on the end card: cream, red headphones, a bandage, big brown eyes.
// Drawn around (0,0) = the middle of its chest, at unit scale ~ 1 frame pixel.
// lids: 0 = eyes wide open, 1 = shut. smug: 0..1 lowers the lids into the flat, knowing look.
import { smoothPath } from "./paths.js";

const LINE = "#56231c";
const CREAM = "#f1ebdd", CREAM_SH = "#ddd2bf", RED = "#e2522e", RED_D = "#b93a21", RED_L = "#f07a4c", ORANGE = "#f19a3c";

function shape(ctx, pts, fill, lw = 3) {
  ctx.beginPath(); smoothPath(ctx, pts, true);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = LINE; ctx.lineJoin = "round"; ctx.stroke(); }
}

export function drawOwlColor(ctx, x, y, s, { lids = 0, smug = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  // headphone band behind the head
  ctx.lineCap = "round";
  // the band arcs clear of the head, above the ear tuft
  ctx.lineWidth = 12; ctx.strokeStyle = LINE; ctx.beginPath(); ctx.arc(4, -72, 96, Math.PI * 1.06, Math.PI * 1.94); ctx.stroke();
  ctx.lineWidth = 7; ctx.strokeStyle = RED; ctx.beginPath(); ctx.arc(4, -72, 96, Math.PI * 1.07, Math.PI * 1.93); ctx.stroke();
  // body (pear) and wings
  shape(ctx, [[-62, -10], [-56, 40], [-34, 72], [2, 84], [40, 76], [64, 44], [70, -6], [52, -40], [0, -48], [-48, -40]], CREAM);
  shape(ctx, [[-64, -6], [-70, 30], [-58, 62], [-38, 76], [-40, 40], [-46, 6]], CREAM_SH, 2.5);
  shape(ctx, [[66, -4], [74, 30], [64, 62], [44, 76], [48, 40], [52, 4]], CREAM_SH, 2.5);
  // chest feather ticks
  ctx.strokeStyle = "rgba(120,80,60,0.55)"; ctx.lineWidth = 1.6;
  for (const [fx, fy] of [[-20, 22], [0, 30], [20, 22], [-10, 46], [12, 48], [-26, 56], [28, 56], [0, 64]]) { ctx.beginPath(); ctx.moveTo(fx - 5, fy - 3); ctx.lineTo(fx, fy + 2); ctx.lineTo(fx + 5, fy - 3); ctx.stroke(); }
  // head
  shape(ctx, [[-74, -64], [-68, -110], [-40, -134], [4, -140], [44, -134], [62, -150], [70, -124], [80, -94], [78, -52], [58, -26], [10, -16], [-40, -22], [-66, -38]], CREAM);
  // facial disc around each eye
  ctx.fillStyle = "#e9e1d0";
  ctx.beginPath(); ctx.ellipse(-22, -76, 30, 28, 0, 0, 7); ctx.ellipse(34, -70, 30, 28, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = "rgba(90,40,30,0.35)"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(-22, -76, 30, 28, 0, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.ellipse(34, -70, 30, 28, 0, 0, 7); ctx.stroke();
  // eyes
  for (const [ex, ey] of [[-22, -74], [34, -68]]) {
    ctx.fillStyle = "#fbf6ec"; ctx.beginPath(); ctx.ellipse(ex, ey, 17, 17, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#c2582c"; ctx.beginPath(); ctx.ellipse(ex, ey, 15, 15, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#7a2d16"; ctx.beginPath(); ctx.ellipse(ex, ey + 1, 10, 10, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#2a0f08"; ctx.beginPath(); ctx.ellipse(ex, ey + 1, 6, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.ellipse(ex + 5, ey - 5, 5, 5, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ex - 5, ey + 5, 2.4, 2.4, 0, 0, 7); ctx.fill();
    ctx.lineWidth = 2.4; ctx.strokeStyle = LINE; ctx.beginPath(); ctx.ellipse(ex, ey, 17, 17, 0, 0, 7); ctx.stroke();
    // lids: a cream sheet slides down over the eye; smug flattens its edge
    const L = Math.max(lids, smug * 0.55);
    if (L > 0.01) {
      ctx.save(); ctx.beginPath(); ctx.ellipse(ex, ey, 18.5, 18.5, 0, 0, 7); ctx.clip();
      const edgeY = ey - 18 + L * 38;
      ctx.fillStyle = "#e7dcc8";
      ctx.beginPath(); ctx.moveTo(ex - 22, ey - 24); ctx.lineTo(ex + 22, ey - 24); ctx.lineTo(ex + 22, edgeY + (1 - smug) * 4); ctx.quadraticCurveTo(ex, edgeY + 7 * (1 - smug), ex - 22, edgeY + (1 - smug) * 4); ctx.closePath(); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = LINE; ctx.beginPath(); ctx.moveTo(ex - 19, edgeY + (1 - smug) * 4); ctx.quadraticCurveTo(ex, edgeY + 7 * (1 - smug), ex + 19, edgeY + (1 - smug) * 4); ctx.stroke();
      ctx.restore();
    }
  }
  // brows: worried when open, flat and low when smug
  ctx.lineWidth = 3; ctx.strokeStyle = LINE;
  const b = smug;
  ctx.beginPath(); ctx.moveTo(-40, -100 + b * 6); ctx.quadraticCurveTo(-26, -106 + b * 8, -10, -100 + b * 10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(20, -96 + b * 10); ctx.quadraticCurveTo(36, -102 + b * 8, 50, -94 + b * 6); ctx.stroke();
  // beak
  shape(ctx, [[-2, -58], [16, -56], [8, -36]], ORANGE, 2.4);
  // ear tuft (right) and the crossed bandage (top left)
  shape(ctx, [[46, -134], [66, -160], [72, -128]], CREAM, 2.5);
  ctx.save(); ctx.translate(-16, -124); ctx.rotate(-0.25);
  for (const rot of [0.45, -0.45]) {
    ctx.save(); ctx.rotate(rot);
    ctx.fillStyle = "#f2c9a4"; ctx.beginPath(); ctx.roundRect(-26, -7, 52, 14, 7); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = LINE; ctx.stroke();
    ctx.fillStyle = "#e5b08a"; ctx.fillRect(-7, -5, 14, 10);
    ctx.restore();
  }
  ctx.restore();
  // ear cups
  for (const [cx, cy, sx] of [[-76, -72, -1], [84, -60, 1]]) {
    ctx.fillStyle = RED_D; ctx.beginPath(); ctx.roundRect(cx - 17, cy - 34, 34, 68, 15); ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = LINE; ctx.stroke();
    ctx.fillStyle = RED; ctx.beginPath(); ctx.roundRect(cx - 17 + sx * 7, cy - 30, 22, 60, 11); ctx.fill();
    ctx.fillStyle = RED_L; ctx.beginPath(); ctx.roundRect(cx - 17 + sx * 11, cy - 24, 8, 44, 4); ctx.fill();
    ctx.strokeStyle = "rgba(90,30,20,0.6)"; ctx.lineWidth = 1.4;
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(cx - 14, cy + k * 10); ctx.lineTo(cx + 14, cy + k * 10); ctx.stroke(); }
  }
  // talons
  for (const [fx, fy] of [[-38, 80], [26, 92]]) for (let k = 0; k < 3; k++) {
    ctx.fillStyle = ORANGE; ctx.beginPath(); ctx.ellipse(fx + (k - 1) * 9, fy, 4.5, 9, (k - 1) * 0.3, 0, 7); ctx.fill();
    ctx.lineWidth = 1.8; ctx.strokeStyle = LINE; ctx.stroke();
  }
  ctx.restore();
}
