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
    g.lineWidth = w * 0.1; g.strokeStyle = INK; g.stroke();
    g.lineWidth = w * 0.07; g.strokeStyle = "#e6e0d7"; g.stroke(); g.restore();
  }
  const P = [[x0, y], [x1, y], [x1, yB - ry * 1.5], [x1 - w * 0.04, yB], [x0 + w * 0.04, yB], [x0, yB - ry * 1.5]];
  fillPoly(g, P, "#ebe6de");
  g.save(); poly(g, P); g.clip();
  const gr = g.createLinearGradient(x0, 0, x1, 0);
  gr.addColorStop(0, "rgba(150,135,125,0.35)"); gr.addColorStop(0.3, "rgba(150,135,125,0.08)"); gr.addColorStop(0.62, "rgba(255,255,250,0.25)"); gr.addColorStop(0.8, "rgba(150,135,125,0.05)"); gr.addColorStop(1, "rgba(150,135,125,0.25)");
  g.fillStyle = gr; g.fillRect(x0, y, w, h);
  g.restore();
  strokePoly(g, P, Math.max(1.6, w * 0.016));
  g.beginPath(); g.ellipse(x, y, r, ry, 0, 0, 7); g.fillStyle = "#cfc6bb"; g.fill();
  g.lineWidth = Math.max(1.5, w * 0.015); g.strokeStyle = INK; g.stroke();
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
  fillPoly(g, cover.map(([x, y]) => [x - 18, y + th + 6]), "rgba(110,70,55,0.28)");
  g.restore();
  for (const [i, p, q] of faces) {
    const f = [p, q, [q[0], q[1] + th], [p[0], p[1] + th]];
    const spine = i === 3;   // D -> A
    fillPoly(g, f, spine ? "#8b5a44" : "#ddd2c0");
    if (!spine) {
      // page lines + the bottom cover's edge
      for (let k = 1; k < 5; k++) { const u = k / 5.6; line(g, [p[0], p[1] + th * u], [q[0], q[1] + th * u], 0.8, "rgba(120,100,90,0.45)"); }
      fillPoly(g, [[p[0], p[1] + th * 0.84], [q[0], q[1] + th * 0.84], [q[0], q[1] + th], [p[0], p[1] + th]], "#8e5c46");
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
export function drawPencil(g, a, b, wd = 8.5) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
  if (L < 5) return;
  g.save(); g.translate(a[0], a[1]); g.rotate(Math.atan2(dy, dx));
  const w = wd / 2, fer = 16, cone = Math.min(30, L * 0.14);
  // soft cast shadow
  g.save(); g.filter = "blur(3px)"; g.fillStyle = "rgba(110,70,55,0.3)"; g.fillRect(4, w + 1, L - 6, 5); g.restore();
  g.lineWidth = 1.4; g.strokeStyle = INK;
  g.beginPath(); g.roundRect(0, -w, 12, 2 * w, 3); g.fillStyle = "#d99a93"; g.fill(); g.stroke();
  g.fillStyle = "#b9b1a8"; g.fillRect(11, -w - 0.5, fer - 4, 2 * w + 1); g.strokeRect(11, -w - 0.5, fer - 4, 2 * w + 1);
  const x1 = L - cone;
  g.fillStyle = "#e8b54f"; g.fillRect(fer + 7, -w, x1 - fer - 7, 2 * w);
  g.fillStyle = "rgba(255,240,190,0.55)"; g.fillRect(fer + 7, -w + 1, x1 - fer - 7, w * 0.6);
  g.fillStyle = "rgba(160,100,40,0.35)"; g.fillRect(fer + 7, w * 0.35, x1 - fer - 7, w * 0.65);
  g.beginPath(); g.rect(fer + 7, -w, x1 - fer - 7, 2 * w); g.stroke();
  g.beginPath(); g.moveTo(x1, -w); g.lineTo(L - 8, -1.6); g.lineTo(L - 8, 1.6); g.lineTo(x1, w); g.closePath();
  g.fillStyle = "#e3c29a"; g.fill(); g.stroke();
  g.beginPath(); g.moveTo(L - 9, -1.9); g.lineTo(L, 0); g.lineTo(L - 9, 1.9); g.closePath(); g.fillStyle = "#3e3434"; g.fill();
  g.restore();
}
