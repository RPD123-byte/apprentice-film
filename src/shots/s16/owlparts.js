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

// fix 2: a flying owl's headphone cup as the source draws it: a soft grey cylinder seen from the side, built from
// ellipses offset along u (u points from the outer face toward the head; t = offset in units of the half extent):
// the dark outer edge, the pale cushion against the head, a dark groove, the lit side wall (brightest at mid-height,
// dark toward both ends: shaded as a cylinder along v) and the grey outer face. Tones from the centre-line profiles
// of the near cups on 1148, 1153, 1157, 1160 (pre-grade): face 0.25-0.42, wall 0.7-0.97, groove 0.12-0.33,
// cushion 0.55-0.84, inner edge 0.23-0.38. No specular streaks, no rim ticks.
export const CUP2 = { fw: 0.25, face: 0.42, faceEdge: 0.24, gain: 1.0, soft: 0.6 };
// the wall's value against depth d (0 = the outer face's rim, 1 = the head side) at mid-height, from the measured
// centre-line profiles: the face's bright rim, a valley, the lit wall, the dark groove, the cushion, its dark inner edge
const WALL = [[0, 0.84], [0.1, 0.62], [0.22, 0.95], [0.36, 0.7], [0.5, 0.3], [0.62, 0.58], [0.74, 0.55], [0.86, 0.3], [1, 0.34]];
const wallAt = (d) => {
  if (d <= 0) return WALL[0][1];
  for (let i = 1; i < WALL.length; i++) if (d <= WALL[i][0]) { const [a, va] = WALL[i - 1], [b, vb] = WALL[i]; return va + (vb - va) * (d - a) / (b - a); }
  return WALL[WALL.length - 1][1];
};
function cupFrame(cp) {
  const [cx, cy, a, b, deg, ux, uy] = cp;
  const th = (deg * Math.PI) / 180, vx = -uy, vy = ux;
  const A = [Math.cos(th), Math.sin(th)], B = [-Math.sin(th), Math.cos(th)];
  const rad = (dx, dy) => { const p = dx * A[0] + dy * A[1], q = dx * B[0] + dy * B[1]; return 1 / Math.sqrt((p / a) ** 2 + (q / b) ** 2); };
  return { cx, cy, ux, uy, vx, vy, tu: rad(ux, uy), tv: rad(vx, vy), ang: Math.atan2(vy, vx), th, a, b };
}
// the cup as a short cylinder seen from the side (its axis along u): the outer face is the ellipse of half width
// fw (in units of the cup's half extent along u) at the outer end; a pixel right of it lies on the wall at depth d.
// The wall is lit at mid-height and dark toward both ends (cylinder shading along v, measured on 1157: a narrow
// bright band at |v| < 0.2, 0.45 of it at |v| = 0.5, 0.2 at the ends). Shaded per pixel, alpha from the fitted
// ellipse with a soft edge; then a 1.6 px dark outline. No specular streaks, no rim ticks.
const CUPC = new Map();
export function drawCup2(g, cp, target) {
  const F = cupFrame(cp), { cx, cy, ux, uy, vx, vy, tu, tv, th, a, b } = F, K = CUP2;
  const key = cp.join(",") + "|" + target;
  let E = CUPC.get(key);
  if (!E) {
    const R = Math.ceil(Math.max(a, b)) + 3, x0 = Math.floor(cx - R), y0 = Math.floor(cy - R), w = 2 * R + 2, h = 2 * R + 2;
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const cg = c.getContext("2d"), img = cg.createImageData(w, h), D = img.data;
    const ca = Math.cos(th), sa = Math.sin(th), fw = K.fw;
    const VV = new Float32Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const X = x0 + i + 0.5 - cx, Y = y0 + j + 0.5 - cy;
      // alpha: inside the fitted ellipse, ~1 px soft edge
      const p = X * ca + Y * sa, q = -X * sa + Y * ca, r = Math.sqrt((p / a) ** 2 + (q / b) ** 2);
      const al = Math.max(0, Math.min(1, (1 - r) * Math.min(a, b) / 1.2 + 0.5));
      if (al <= 0) continue;
      const U = (X * ux + Y * uy) / tu, V = Math.max(-1, Math.min(1, (X * vx + Y * vy) / tv));
      const sq = Math.sqrt(1 - V * V), cf = -1 + fw;
      const env = (0.42 + 0.58 * Math.exp(-((V / 0.22) ** 2))) * Math.sqrt(sq);
      let v;
      const ef = ((U - cf) / fw) ** 2 + V * V;
      if (ef <= 1) {
        // the outer face: darker toward its edge
        v = K.faceEdge + (K.face - K.faceEdge) * (1 - ef) * (0.6 + 0.4 * sq);
      } else {
        const d = (U - cf - fw * sq) / (2 - 2 * fw);
        const wv = wallAt(d);
        // the metal wall (d < 0.45) takes the cylinder shading fully, the cushion half of it
        const k = d < 0.45 ? 1 : 0.5;
        v = wv * (1 - k + k * env);
      }
      VV[j * w + i] = v * K.gain; D[4 * (j * w + i) + 3] = Math.round(al * 255);
    }
    // scaled so its mean inside the ellipse matches the source's (./data/band.js CUPM)
    let sv = 0, sw = 0;
    for (let i = 0; i < w * h; i++) { const al = D[4 * i + 3] / 255; sv += VV[i] * al; sw += al; }
    const k = target > 0 && sv > 0 ? Math.max(0.6, Math.min(1.6, target / (sv / sw))) : 1;
    for (let i = 0; i < w * h; i++) {
      if (!D[4 * i + 3]) continue;
      const x = Math.round(Math.max(0, Math.min(1, VV[i] * k)) * 255); D[4 * i] = D[4 * i + 1] = D[4 * i + 2] = x;
    }
    cg.putImageData(img, 0, 0);
    E = { c, x0, y0 };
    CUPC.set(key, E);
    if (CUPC.size > 12) CUPC.delete(CUPC.keys().next().value);
  }
  g.save();
  if (K.soft > 0) g.filter = `blur(${K.soft}px)`;
  g.drawImage(E.c, E.x0, E.y0);
  g.filter = "none";
  g.beginPath(); g.ellipse(cx, cy, a - 0.6, b - 0.6, th, 0, Math.PI * 2);
  g.strokeStyle = grey(0.1); g.lineWidth = 1.6; g.stroke();
  g.restore();
}
// fix 2: a far cup that sits behind the head (its ellipse fit is poor): only a thin dark sliver shows, the part of
// the ellipse inside the dark headphone shape (the caller clips to it), darkest toward both ends
export function drawCupSliver(g, cp, mid = 0.34) {
  const { cx, cy, vx, vy, tv, ang } = cupFrame(cp);
  const gr = g.createLinearGradient(cx - vx * tv, cy - vy * tv, cx + vx * tv, cy + vy * tv);
  gr.addColorStop(0, grey(0.06)); gr.addColorStop(0.5, grey(mid)); gr.addColorStop(1, grey(0.06));
  g.save(); g.filter = "blur(1.2px)";
  g.beginPath(); g.ellipse(cx, cy, cp[2], cp[3], (cp[4] * Math.PI) / 180, 0, Math.PI * 2);
  g.fillStyle = gr; g.fill();
  g.restore();
}

// fix 2: the bandage (sticking plaster) on the flying owl's head, read off 3x grids of each source frame (2.5x on
// 1144-1147; on 1143 it is hidden behind the band): its left and right ends [xL, yL, xR, yR] and its height. Drawn as
// the source draws it: two overlapping pale ovals, the left pad firmly outlined, the right lobe lighter.
export const PLASTER = {
  1144: [1167, 205, 1212, 217, 13], 1145: [1101, 232, 1146, 244, 13], 1147: [1029, 226, 1070, 236, 13],
  1148: [969, 227, 1015, 221, 15], 1149: [893, 236, 937, 228, 15], 1150: [851, 257, 895, 250, 15], 1151: [812, 262, 860, 256, 16],
  1152: [773, 277, 823, 270, 16], 1153: [739, 291, 789, 284, 16], 1154: [702, 310, 752, 302, 15], 1155: [673, 330, 723, 322, 16],
  1156: [621, 399, 660, 391, 15], 1157: [569, 465, 620, 462, 16], 1158: [512, 543, 556, 538, 15], 1159: [478, 603, 530, 594, 16],
  1160: [480, 597, 533, 596, 16], 1161: [482, 596, 535, 594, 16],
};
export const PL = { fill: 0.8, pad: 0.76, line: 0.32, lw: 1.2, padLw: 1.5, soft: 0.5, dy: 1.5, dh: -1.5 };
export function drawPlaster(g, id) {
  const P = PLASTER[id];
  if (!P) return;
  const [xl, yl0, xr, yr0, h0] = P, yl = yl0 + PL.dy, yr = yr0 + PL.dy, h = h0 + PL.dh, L = Math.hypot(xr - xl, yr - yl) + 4, a = Math.atan2(yr - yl, xr - xl);
  g.save(); if (PL.soft > 0) g.filter = `blur(${PL.soft}px)`;
  g.translate((xl + xr) / 2, (yl + yr) / 2); g.rotate(a);
  g.lineJoin = "round"; g.lineCap = "round";
  // the right lobe (lighter outline), then the left pad over it (firmer outline): two overlapping ovals as in the
  // source (1153: fill 0.65-0.83, outlines 0.2-0.4 pre-grade)
  const pw = L * 0.56, rw = L * 0.52;
  g.beginPath(); g.ellipse(L / 2 - rw / 2, 0.3, rw / 2, h / 2 - 0.8, 0, 0, Math.PI * 2);
  g.fillStyle = grey(PL.fill); g.fill(); g.strokeStyle = grey(PL.line + 0.12); g.lineWidth = PL.lw; g.stroke();
  g.beginPath(); g.ellipse(-L / 2 + pw / 2, 0, pw / 2, h / 2, 0, 0, Math.PI * 2);
  g.fillStyle = grey(PL.pad); g.fill(); g.strokeStyle = grey(PL.line); g.lineWidth = PL.padLw; g.stroke();
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
  el(CUP_PAD); g.fillStyle = grey(0.3); g.fill();
  for (let k = 0; k < 16; k++) {
    const a = -1.45 + (k / 15) * 2.75;          // from the top of the crescent round its right side to the bottom
    const ca = Math.cos(a), sa = Math.sin(a);
    const x0 = CUP_BODY[0] + ca * (CUP_BODY[2] - 2), y0 = CUP_BODY[1] + sa * (CUP_BODY[3] - 2);
    const x1 = CUP_PAD[0] + ca * (CUP_PAD[2] + 2), y1 = CUP_PAD[1] + sa * (CUP_PAD[3] + 2);
    g.strokeStyle = grey(0.8); g.lineWidth = 3.0;
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
    // fix 2: spacing randomised +-30 %, paler lines (the grain read too regular and too dark)
    const o = k * 2.3 + (R() - 0.5) * 1.4, L = CUP_FACE[3] * 1.1, w = (R() - 0.5) * 2.5;
    if (R() < 0.2) continue;
    const cx = CUP_FACE[0] + vx * o, cy = CUP_FACE[1] + vy * o;
    g.strokeStyle = grey(0.6 + 0.22 * R()); g.lineWidth = 0.6 + 0.5 * R();
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
