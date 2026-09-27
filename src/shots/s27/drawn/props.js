// s27 (drawn) — desk props drawn in code, per frame, from measured keys (keys.js): the mug (a cylinder: rim centre,
// width, handle side), the notebook (a box: its top cover's four corners and a thickness), the pencil (eraser end and tip).
// Colours are pre-grade samples of the source at 118.5 s.
import { poly, fillPoly, strokePoly, line, inkLine, INK } from "./draw.js";

// ---------------------------------------------------------------- mug (rim centre x, rim y, body width w, handle 0 right .. 1 left)
export function drawMug(g, x, y, w, handle) {
  const r = w / 2, h = w * 1.083, ry = w * 0.042, x0 = x - r, x1 = x + r, yB = y + h;
  const hs = handle < 0.5 ? 1 : -1;                 // handle side in the image
  const hk = Math.abs(Math.cos(Math.PI * handle));   // how far out it sticks (0 when it points at / away from us)
  // handle (behind the body's edge)
  if (hk > 0.05) {
    const hx = x + hs * (r - 4), hw = 0.29 * w * hk, hh = 0.345 * w;
    g.save(); g.beginPath(); g.ellipse(hx, y + h * 0.46, hw, hh, 0, 0, 7);
    g.lineWidth = w * 0.1; g.strokeStyle = MUG_INK; g.stroke();
    g.lineWidth = w * 0.07; g.strokeStyle = "#e2d2bd"; g.stroke(); g.restore();
  }
  const P = [[x0, y], [x1, y], [x1, yB - ry * 1.5], [x1 - w * 0.04, yB], [x0 + w * 0.04, yB], [x0, yB - ry * 1.5]];
  fillPoly(g, P, "#ddcbb4");
  g.save(); poly(g, P); g.clip();
  const gr = g.createLinearGradient(x0, 0, x1, 0);
  gr.addColorStop(0, "rgba(150,135,125,0.35)"); gr.addColorStop(0.3, "rgba(150,135,125,0.08)"); gr.addColorStop(0.62, "rgba(255,255,250,0.25)"); gr.addColorStop(0.8, "rgba(150,135,125,0.05)"); gr.addColorStop(1, "rgba(150,135,125,0.25)");
  g.fillStyle = gr; g.fillRect(x0, y, w, h);
  g.restore();
  strokePoly(g, P, Math.max(2.4, w * 0.024), MUG_INK);
  g.beginPath(); g.ellipse(x, y, r, ry, 0, 0, 7); g.fillStyle = "#cbbba8"; g.fill();
  g.lineWidth = Math.max(2.2, w * 0.022); g.strokeStyle = MUG_INK; g.stroke();
}
const MUG_INK = "#3a2520";   // (fix pass 1) warm cream body and a heavier dark outline, as on the source (205,182,161; min luma 77)
// the sheet of paper the mug stands on at the end of the move (source 129.2–129.28: (1783–1933, 700–758) for a mug at
// rim centre (1816, 590)), drawn relative to the mug's rim centre and width
export function drawMugSheet(g, x, y, w, a = 1) {
  const k = w / 128, Q = [[-46, 115], [119, 110], [136, 164], [-36, 170]].map(([u, v]) => [x + u * k, y + v * k]);
  g.save(); g.globalAlpha = a;
  fillPoly(g, Q, "#f1ebdf"); strokePoly(g, Q, 1.6, "rgba(120,95,80,0.7)");
  for (let i = 1; i < 5; i++) line(g, [Q[0][0] + 10 + i * 4, Q[0][1] + 10 + i * 10], [Q[1][0] - 20 + i * 4, Q[1][1] + 10 + i * 10], 1, "rgba(150,130,115,0.35)");
  g.restore();
}

// ---------------------------------------------------------------- notebook: cover corners A B C D (A-D = spine side), thickness th
export function drawNotebook(g, A, B, C, D, th) {
  const cover = [A, B, C, D];
  // side faces: every cover edge whose outward side faces down in the image hangs a face of height th below it
  const cx = (A[0] + B[0] + C[0] + D[0]) / 4, cy = (A[1] + B[1] + C[1] + D[1]) / 4;
  const faces = [];
  for (let i = 0; i < 4; i++) {
    const p = cover[i], q = cover[(i + 1) % 4];
    const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
    // outward normal
    let nx = q[1] - p[1], ny = -(q[0] - p[0]);
    if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny; }
    if (ny > 0) faces.push([i, p, q]);
  }
  // shadow on the desk (soft, offset to the lower left)
  g.save(); g.filter = "blur(8px)";
  fillPoly(g, cover.map(([x, y]) => [x - 14, y + th + 14]), "rgba(110,70,55,0.36)");
  // (fix pass 2) a stronger contact shadow along the front (C–D) edge (source: the desk under the notebook's front reads
  // 124,91,68 against 139,113,84 in the render)
  fillPoly(g, [[D[0], D[1] + th - 2], [C[0], C[1] + th - 2], [C[0] - 12, C[1] + th + 30], [D[0] - 12, D[1] + th + 30]], "rgba(90,50,40,0.45)");
  g.restore();
  for (const [i, p, q] of faces) {
    const f = [p, q, [q[0], q[1] + th], [p[0], p[1] + th]];
    const spine = i === 3;   // D -> A
    fillPoly(g, f, spine ? "#8b5a44" : "#ddd2c0");
    if (!spine) {
      // (fix pass 2) a thin page strip between the dark cover edges (source 118.6: the face reads 165,143,132, not cream)
      const band = (u0, u1, col) => fillPoly(g, [[p[0], p[1] + th * u0], [q[0], q[1] + th * u0], [q[0], q[1] + th * u1], [p[0], p[1] + th * u1]], col);
      band(0, 0.3, "#7a4a36");
      for (let k = 1; k < 3; k++) { const u = 0.3 + k * 0.08; line(g, [p[0], p[1] + th * u], [q[0], q[1] + th * u], 0.8, "rgba(120,100,90,0.45)"); }
      band(0.56, 1, "#8e5c46");
      line(g, [p[0], p[1] + th * 0.3], [q[0], q[1] + th * 0.3], 1.2, "rgba(60,35,28,0.6)");
    }
    strokePoly(g, f, 2.2);
  }
  fillPoly(g, cover, "#a5725a");
  g.save(); poly(g, cover); g.clip();
  const gr = g.createLinearGradient(A[0], A[1], C[0], C[1]);
  gr.addColorStop(0, "rgba(255,230,200,0.10)"); gr.addColorStop(0.6, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(60,30,20,0.12)");
  g.fillStyle = gr; g.fillRect(Math.min(A[0], D[0]) - 20, Math.min(A[1], B[1]) - 20, 900, 400);
  g.restore();
  strokePoly(g, cover, 2.4);
  // rounded spine bump at the A-D edge
  inkLine(g, [[D[0] + (A[0] - D[0]) * 0.05, D[1] + (A[1] - D[1]) * 0.05 + 3], [D[0] + (C[0] - D[0]) * 0.03 + (A[0] - D[0]) * 0.5, D[1] + (A[1] - D[1]) * 0.5 + 3]], 1.4, "rgba(60,35,28,0.6)");
}

// ---------------------------------------------------------------- pencil (eraser end a, tip b)
export function drawPencil(g, a, b, wd = 15) {
  // (fix pass 1) pale natural wood (source: ~16 px thick in the hold, cream-tan with a grey ferrule, pink eraser), a
  // heavy dark outline and a soft pinkish shadow down-left
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
  if (L < 5) return;
  const PINK = "#3a2520";
  g.save(); g.filter = "blur(4px)"; g.fillStyle = "rgba(150,90,80,0.35)";
  g.translate(a[0] - 6, a[1] + 8); g.rotate(Math.atan2(dy, dx)); g.fillRect(2, -wd / 2, L - 4, wd); g.restore();
  g.save(); g.translate(a[0], a[1]); g.rotate(Math.atan2(dy, dx));
  const w = wd / 2, fer = 18, cone = Math.min(34, L * 0.15), x1 = L - cone;
  g.lineWidth = 2.6; g.strokeStyle = PINK; g.lineJoin = "round";
  g.beginPath(); g.roundRect(0, -w, 14, 2 * w, 4); g.fillStyle = "#dca39a"; g.fill(); g.stroke();
  g.fillStyle = "#b9b1a8"; g.fillRect(12, -w - 0.5, fer, 2 * w + 1); g.strokeRect(12, -w - 0.5, fer, 2 * w + 1);
  g.beginPath(); g.moveTo(14 + fer * 0.4, -w); g.lineTo(14 + fer * 0.4, w); g.lineWidth = 1.2; g.stroke(); g.lineWidth = 2.6;
  g.fillStyle = "#e8d6b0"; g.fillRect(fer + 12, -w, x1 - fer - 12, 2 * w);
  g.fillStyle = "#c9ab7a"; g.fillRect(fer + 12, w * 0.25, x1 - fer - 12, w * 0.75);
  g.fillStyle = "rgba(255,248,230,0.5)"; g.fillRect(fer + 12, -w + 1.5, x1 - fer - 12, w * 0.45);
  g.beginPath(); g.rect(fer + 12, -w, x1 - fer - 12, 2 * w); g.stroke();
  g.beginPath(); g.moveTo(x1, -w); g.lineTo(L - 9, -2); g.lineTo(L - 9, 2); g.lineTo(x1, w); g.closePath();
  g.fillStyle = "#ead3b0"; g.fill(); g.stroke();
  g.beginPath(); g.moveTo(L - 10, -2.4); g.lineTo(L, 0); g.lineTo(L - 10, 2.4); g.closePath(); g.fillStyle = "#3e3434"; g.fill();
  g.restore();
}
