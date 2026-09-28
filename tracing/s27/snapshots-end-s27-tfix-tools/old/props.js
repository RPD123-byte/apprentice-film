// s27 desk props: the mug (a cylinder sprite placed by its measured outline) and the notebook with its pencil
// (top face mapped by its measured corners, page block extruded below).
import { canvas, spath, path, shape, ellipse, lin, rad, rgba, INKC } from "./paint.js";

const MUG = "#e8e0d2", MUG_SH = "#cfc3b3", MUG_D = "#b9ab99", MUG_IN = "#d8cdbd";
// mug sprite: body 100 wide x 115 tall (rim ellipse ry 7.5 at top, base arc at bottom); handle to the right (flip for left).
// Texture px = 2 x units; the body's left edge is at x = 40 units, top rim centre y = 12 units.
export const MUG_TEX = { ox: 40, oy: 12, W: 180, H: 142, S: 2 };
export function paintMug(flip = false) {
  const T = MUG_TEX, c = canvas(T.W * T.S, T.H * T.S), g = c.getContext("2d");
  g.scale(T.S, T.S); g.translate(T.ox, T.oy);
  const ry = 7.5, lw = 2.2;
  // handle
  g.beginPath(); g.ellipse(100, 52, 24, 30, 0, -Math.PI / 2 - 0.1, Math.PI / 2 + 0.1); g.lineWidth = 11; g.strokeStyle = INKC; g.stroke();
  g.beginPath(); g.ellipse(100, 52, 24, 30, 0, -Math.PI / 2 - 0.1, Math.PI / 2 + 0.1); g.lineWidth = 7; g.strokeStyle = flip ? "#c6b19d" : "#e0d4c2"; g.stroke();
  // body
  g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 115 - 6); g.ellipse(50, 115 - 6, 50, ry, 0, Math.PI, 0, true); g.lineTo(100, 0); g.ellipse(50, 0, 50, ry, 0, 0, Math.PI, false); g.closePath();
  // the window light comes from the right in both views: shaded left, lit right (measured #c4b09c / #d7c4af / #e8dfca);
  // the texture is mirrored when the handle is on the left, so the gradient is mirrored with it
  // (end-s27-fix1) behind the laptop (handle left, 123.5–129.1) the source's mug is a warmer cream than in the hold, with a
  // darker right edge (graded 127.04: 210,181,144 left, 242,225,197 highlight, 214,189,171 right edge; the render was 15–25
  // levels too light and too cool there)
  const st = flip ? [[0, "#b69a81"], [0.22, "#c4a88e"], [0.5, "#cfb69b"], [0.8, "#dcc8af"], [0.9, "#e0cfb6"], [1, "#c5af98"]]
    : [[0, "#bfa996"], [0.22, "#cdb9a5"], [0.5, "#d9c8b4"], [0.8, "#e6dccb"], [0.93, "#ebe3d4"], [1, "#d6c8b6"]];
  g.fillStyle = lin(g, flip ? 100 : 0, 0, flip ? 0 : 100, 0, st); g.fill();
  // (end-s27-fix1) the glaze's fine speckle (deterministic)
  g.save(); g.clip();
  for (let i = 0; i < 260; i++) { const x = (i * 37.17) % 100, y = (i * 61.31) % 112; g.fillStyle = i % 3 ? "rgba(120,95,70,0.16)" : "rgba(255,250,240,0.22)"; g.fillRect(x, y, 0.55, 0.55); }
  g.restore();
  g.lineWidth = lw; g.strokeStyle = INKC; g.stroke();
  // rim: opening
  ellipse(g, 50, 0, 50, ry, "#cfbfab", lw);
  ellipse(g, 50, 1.2, 46, ry - 2, "#b9a591", 0);
  // soft shade near the bottom
  g.save(); g.beginPath(); g.rect(0, 60, 100, 60); g.clip();
  g.fillStyle = lin(g, 0, 70, 0, 118, [[0, "rgba(160,140,120,0)"], [1, "rgba(150,128,108,0.25)"]]); g.fillRect(0, 60, 100, 70); g.restore();
  return c;
}
// affine (as a 3x3) from mug texture px to frame for a fitted outline (cx, ytop, w, h); flip = handle on the left
export function mugH(cx, ytop, w, h, flip) {
  const T = MUG_TEX, sx = w / 100, sy = h / 115;
  // texture px -> units: u = px/S - ox ; frame x = cx + (u - 50) * sx * (flip ? -1 : 1)
  const f = flip ? -1 : 1;
  return [f * sx / T.S, 0, cx + f * (-T.ox - 50) * sx, 0, sy / T.S, ytop + (-T.oy) * sy, 0, 0, 1];
}

// ---------- notebook: brown hardcover, cream page block; top-face texture 100 x 60 units at 6 px/unit ----------
export const NB_TEX = { W: 100, D: 60, S: 6 };
export function paintNotebookTop(withPencil = true) {
  const T = NB_TEX, c = canvas(T.W * T.S, T.D * T.S), g = c.getContext("2d");
  g.scale(T.S, T.S);
  g.fillStyle = "#a9765a"; g.beginPath(); g.roundRect(0.3, 0.3, T.W - 0.6, T.D - 0.6, 1.2); g.fill();
  g.fillStyle = lin(g, 0, 0, T.W, T.D, [[0, "rgba(255,230,200,0.10)"], [1, "rgba(80,40,20,0.10)"]]); g.fillRect(0, 0, T.W, T.D);
  // (end-s27-fix1) no spine band on the top face (the source's cover is one colour; the rounded spine is drawn at the end)
  // speckle
  for (let i = 0; i < 120; i++) { const x = (i * 37.3) % T.W, y = (i * 23.9) % T.D; g.fillStyle = "rgba(255,240,220,0.12)"; g.fillRect(x, y, 0.4, 0.4); }
  g.lineWidth = 0.95; g.strokeStyle = "#3b2622"; g.beginPath(); g.roundRect(0.45, 0.45, T.W - 0.9, T.D - 0.9, 1.2); g.stroke();   // (end-s27-fix1) the source's dark keyline
  if (withPencil) paintPencil(g, [30, 6], [84, 44], 2.2);
  return c;
}
// a yellow pencil from tail a to tip b, width w (units of the context)
export function paintPencil(g, a, b, w) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy * w / 2, ny = ux * w / 2;
  const P = (t, k) => [a[0] + ux * t + nx * k, a[1] + uy * t + ny * k];
  const lw = w * 0.22;
  // body
  g.beginPath(); const p0 = P(L * 0.12, 1), p1 = P(L * 0.82, 1), p2 = P(L * 0.82, -1), p3 = P(L * 0.12, -1);
  g.moveTo(...p0); g.lineTo(...p1); g.lineTo(...p2); g.lineTo(...p3); g.closePath(); g.fillStyle = "#d7a877"; g.fill(); g.lineWidth = lw; g.strokeStyle = INKC; g.stroke();
  g.beginPath(); g.moveTo(...P(L * 0.12, 0)); g.lineTo(...P(L * 0.82, 0)); g.lineWidth = lw * 0.6; g.strokeStyle = "rgba(140,90,40,0.5)"; g.stroke();
  // wood cone + lead
  g.beginPath(); g.moveTo(...p1); g.lineTo(...P(L * 0.97, 0.18)); g.lineTo(...P(L * 0.97, -0.18)); g.lineTo(...p2); g.closePath(); g.fillStyle = "#edd3ae"; g.fill(); g.lineWidth = lw; g.strokeStyle = INKC; g.stroke();
  g.beginPath(); g.moveTo(...P(L * 0.93, 0.3)); g.lineTo(...P(L, 0)); g.lineTo(...P(L * 0.93, -0.3)); g.closePath(); g.fillStyle = "#3a302c"; g.fill();
  // ferrule + eraser
  g.beginPath(); const q0 = P(L * 0.04, 1), q1 = P(L * 0.12, 1), q2 = P(L * 0.12, -1), q3 = P(L * 0.04, -1);
  g.moveTo(...q0); g.lineTo(...q1); g.lineTo(...q2); g.lineTo(...q3); g.closePath(); g.fillStyle = "#c8b8a6"; g.fill(); g.lineWidth = lw; g.strokeStyle = INKC; g.stroke();
  g.beginPath(); g.moveTo(...P(0, 0.9)); g.lineTo(...q0); g.lineTo(...q3); g.lineTo(...P(0, -0.9)); g.closePath(); g.fillStyle = "#dc8a86"; g.fill(); g.stroke();
}
// page block side strip (u along the edge, v top->bottom)
// (end-s27-fix1) darker ink edges and the page lines of the source's page block (cream-grey pages between the brown
// boards, a few fine darker lines)
export function paintPageStrip() {
  const c = canvas(8, 48), g = c.getContext("2d");
  g.fillStyle = lin(g, 0, 0, 0, 48, [[0, "#3b2622"], [0.07, "#3b2622"], [0.09, "#8a5a44"], [0.2, "#8a5a44"], [0.23, "#3b2622"], [0.26, "#c9b8a6"], [0.7, "#b3a18f"], [0.73, "#3b2622"], [0.76, "#8a5a44"], [0.9, "#7d503d"], [0.93, "#3b2622"], [1, "#3b2622"]]);
  g.fillRect(0, 0, 8, 48);
  g.fillStyle = "rgba(90,70,60,0.35)"; for (const y of [17.5, 21.5, 26.5, 30.5]) g.fillRect(0, y, 8, 0.8);
  return c;
}
// the rounded spine's strip (u along the spine, v over the half-round from the top cover to the bottom one)
export function paintSpineStrip() {
  const c = canvas(8, 48), g = c.getContext("2d");
  g.fillStyle = lin(g, 0, 0, 0, 48, [[0, "#3b2622"], [0.08, "#3b2622"], [0.12, "#8f5d45"], [0.4, "#a26c51"], [0.7, "#80523e"], [0.9, "#6c4433"], [0.93, "#3b2622"], [1, "#3b2622"]]);
  g.fillRect(0, 0, 8, 48);
  return c;
}
