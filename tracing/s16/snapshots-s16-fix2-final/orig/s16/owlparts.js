// s16 owl parts, authored: the headphone cups of the flying owl (from fitted ellipses) and the seated owl's graphic
// parts (headphones, far wing hatching, feet), drawn with canvas primitives from measured landmarks.
import { grey } from "../../lib/engrave.js";
import { rng } from "../../lib/rng.js";
import { taper } from "../../lib/ink.js";

// a flying owl's headphone cup seen from the side: cp = [cx, cy, a, b, deg, ux, uy, vpad, vface, vhi]
// (the fitted ellipse of the whole cup, u pointing from its outer face toward the head, measured tones).
// Drawn as three offset ellipses along u: the dark cushion against the head, a rim ring, the outer face with a
// soft gradient and a specular streak.
export function drawCup(g, cp) {
  const [cx, cy, a, b, deg, ux, uy, vpad, vface, vhi] = cp;
  const th = (deg * Math.PI) / 180;
  // the cup's frame: u toward the head, v along the cup's long side
  const vx = -uy, vy = ux;
  const A = [Math.cos(th), Math.sin(th)], B = [-Math.sin(th), Math.cos(th)];
  const rad = (dx, dy) => { const p = dx * A[0] + dy * A[1], q = dx * B[0] + dy * B[1]; return 1 / Math.sqrt((p / a) ** 2 + (q / b) ** 2); };
  const tu = rad(ux, uy), tv = rad(vx, vy);           // half extents along u and along v
  const ang = Math.atan2(vy, vx);
  const far = a * b < 600 || cp[10] === 1;             // the far cup behind the head, or a sliver: a plain tone
  const EL = (ou, ru, rv) => { g.beginPath(); g.ellipse(cx + ux * ou, cy + uy * ou, Math.max(1, rv), Math.max(1, ru), ang, 0, Math.PI * 2); };
  g.save();
  g.lineJoin = "round"; g.lineCap = "round";
  // the whole cup in the cushion's tone
  EL(0, tu, tv); g.fillStyle = grey(cp[10] === 1 ? vface : far ? Math.min(vpad, vface) * 0.8 : vpad * 0.8); g.fill();
  if (cp[10] === 1) { g.restore(); return; }
  if (!far) {
    // the cushion (head side): short pale ribs across it
    g.save(); EL(0, tu, tv); g.clip();
    g.strokeStyle = grey(Math.min(0.9, vpad + 0.08)); g.lineWidth = 1.0;
    for (let k = -10; k <= 10; k++) {
      const px = cx + ux * tu * 0.55 + vx * tv * k / 11, py = cy + uy * tu * 0.55 + vy * tv * k / 11;
      g.beginPath(); g.moveTo(px - ux * tu * 0.25, py - uy * tu * 0.25); g.lineTo(px + ux * tu * 0.25, py + uy * tu * 0.25); g.stroke();
    }
    g.restore();
    // the rim between cushion and face: a thin dark ellipse
    EL(tu * 0.05, tu * 0.62, tv * 0.97); g.strokeStyle = grey(0.1); g.lineWidth = 1.3; g.stroke();
    // the outer face: narrow along u (seen edge-on), on the outer side, lit toward its outer edge
    const fu = -tu * 0.33, fx = cx + ux * fu, fy = cy + uy * fu;
    EL(fu, tu * 0.62, tv * 0.93);
    const gr = g.createLinearGradient(fx - ux * tu * 0.6, fy - uy * tu * 0.6, fx + ux * tu * 0.6, fy + uy * tu * 0.6);
    gr.addColorStop(0, grey(Math.min(0.95, vface + 0.1))); gr.addColorStop(1, grey(Math.max(0, vface - 0.05)));
    g.fillStyle = gr; g.fill();
    EL(fu, tu * 0.62, tv * 0.93); g.strokeStyle = grey(0.1); g.lineWidth = 1.2; g.stroke();
    // specular: two soft pale streaks along the face's long side
    g.save(); EL(fu, tu * 0.62, tv * 0.93); g.clip();
    g.filter = "blur(1px)"; g.strokeStyle = grey(vhi);
    for (const [o, l, w] of [[-0.25, 0.42, 2.6], [0.12, 0.3, 1.8]]) {
      const px = fx + ux * tu * o - vx * tv * 0.12, py = fy + uy * tu * o - vy * tv * 0.12;
      g.lineWidth = w; g.beginPath(); g.moveTo(px - vx * tv * l, py - vy * tv * l); g.lineTo(px + vx * tv * l, py + vy * tv * l); g.stroke();
    }
    g.filter = "none";
    g.restore();
  }
  // the cup's dark outline
  EL(0, tu, tv); g.strokeStyle = grey(0.06); g.lineWidth = 1.4; g.stroke();
  g.restore();
}

// the seated owl's flat parts (frame px of 1175, read off 5x / 6x grids; P.d = the drawing's offset from 1175):
// the cup's shell (white), its cushion (a dark ribbed crescent against the head), the band's shaded underside.
// Their ink lines are the measured centre-lines (S).
export const CUP_BODY = [384, 709.5, 32, 37, -0.2], CUP_PAD = [405, 700, 27, 41, -0.35];
const CUP_FACE = [380, 711, 23, 28, -0.22], CUP_HUB = [375, 711, 8.5, 10.5, -0.2];
const BAND_UNDER = [[392, 586], [405, 574], [420, 567], [440, 564], [460, 566], [476, 572], [488, 580], [478, 581], [462, 575],
  [445, 573], [428, 576], [412, 582], [400, 591]];
export function drawSeatParts(g, P, id) {
  const [dx, dy] = P.d || [0, 0];
  g.save(); g.translate(dx, dy);
  g.lineCap = "round"; g.lineJoin = "round";
  const el = (e, grow = 0) => { g.beginPath(); g.ellipse(e[0], e[1], e[2] + grow, e[3] + grow, e[4], 0, Math.PI * 2); };
  // the cushion: the pad ellipse outside the cup's shell, dark grey with pale ribs across it
  g.save();
  el(CUP_PAD); g.clip();
  g.beginPath(); g.rect(300, 600, 200, 200); g.ellipse(CUP_BODY[0], CUP_BODY[1], CUP_BODY[2], CUP_BODY[3], CUP_BODY[4], 0, Math.PI * 2, true);
  g.clip("evenodd");
  el(CUP_PAD); g.fillStyle = grey(0.2); g.fill();
  for (let k = 0; k < 16; k++) {
    const a = -1.45 + (k / 15) * 2.75;          // from the top of the crescent round its right side to the bottom
    const ca = Math.cos(a), sa = Math.sin(a);
    const x0 = CUP_BODY[0] + ca * (CUP_BODY[2] - 2), y0 = CUP_BODY[1] + sa * (CUP_BODY[3] - 2);
    const x1 = CUP_PAD[0] + ca * (CUP_PAD[2] + 2), y1 = CUP_PAD[1] + sa * (CUP_PAD[3] + 2);
    g.strokeStyle = grey(0.74); g.lineWidth = 3.0;
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  g.restore();
  el(CUP_PAD); g.strokeStyle = grey(0.1); g.lineWidth = 1.8; g.stroke();
  // the cup's shell: white, inked; its face a little greyer, with wood-grain lines and a hub
  el(CUP_BODY); g.fillStyle = grey(0.93); g.fill();
  el(CUP_BODY, -0.8); g.strokeStyle = grey(0.1); g.lineWidth = 2.2; g.stroke();
  el(CUP_FACE); g.fillStyle = grey(0.84); g.fill();
  g.save(); el(CUP_FACE); g.clip();
  const R = rng(1175 + id), fa = CUP_FACE[4], ux = -Math.sin(fa), uy = Math.cos(fa), vx = Math.cos(fa), vy = Math.sin(fa);
  for (let k = -9; k <= 9; k++) {
    const o = k * 2.3 + (R() - 0.5) * 1.2, L = CUP_FACE[3] * 1.1, w = (R() - 0.5) * 2.5;
    const cx = CUP_FACE[0] + vx * o, cy = CUP_FACE[1] + vy * o;
    g.strokeStyle = grey(0.5 + 0.25 * R()); g.lineWidth = 0.7 + 0.5 * R();
    g.beginPath(); g.moveTo(cx - ux * L, cy - uy * L);
    g.quadraticCurveTo(cx + vx * w, cy + vy * w, cx + ux * L, cy + uy * L); g.stroke();
  }
  g.restore();
  el(CUP_FACE); g.strokeStyle = grey(0.22); g.lineWidth = 1.5; g.stroke();
  el(CUP_HUB); g.fillStyle = grey(0.88); g.fill();
  el(CUP_HUB); g.strokeStyle = grey(0.16); g.lineWidth = 1.6; g.stroke();
  // the band's underside, a darker strip under its white top
  g.beginPath(); g.moveTo(BAND_UNDER[0][0], BAND_UNDER[0][1]);
  for (const p of BAND_UNDER) g.lineTo(p[0], p[1]);
  g.closePath(); g.fillStyle = grey(0.38); g.fill();
  g.restore();
}
