// s27 laptop: the lid comes from the measured page->frame homography of the screen (SIFT, every frame), the base from
// its chamfer-fitted top-face corners. Textures are painted here; the shot maps them with gl.quadH / gl.mesh.
import { canvas, stroke, rrect, ellipse, lin, rgba, mixHex, INKC } from "./paint.js";

export const F = 2520, CX = 1103, CY = 473;   // focal length measured from the page homographies (f_norm, 120.4–128)
// lid in page px (the colour page is 2206 x 946 and sits in the display, letterboxed under a black bar)
export const LID = { x0: -92, y0: -228, x1: 2260, y1: 1163, r: 70 };
export const DISP = { x0: -66, y0: -133, x1: 2242, y1: 1150 };
export const LID_SC = 0.5;                    // lid texture px per page px
export const BW = 32.4, BD = 22.5;            // base top face, cm (texture x -BW/2..BW/2, z 0 (hinge) .. BD (front))
export const BASE_PX = 40;                    // base texture px per cm
// keyboard and trackpad, back-projected onto the base plane from the 119.6 and 125.0 frames
export const KB = { x0: -14.4, x1: 14.4, z0: 1.3, z1: 13.4 };
export const TP = { x0: -5.6, x1: 5.6, z0: 14.6, z1: 21.5 };

const SILVER = "#cfc8c1", SILVER_L = "#e2ddd6", BEZEL = "#57504f", DISPLAY = "#040505", KEY = "#2e2927";

export function paintLidFront(page) {
  const S = LID_SC, c = canvas((LID.x1 - LID.x0) * S + 8, (LID.y1 - LID.y0) * S + 8), g = c.getContext("2d");
  g.translate(4, 4); g.scale(S, S); g.translate(-LID.x0, -LID.y0);
  const w = LID.x1 - LID.x0, h = LID.y1 - LID.y0;
  // silver rim + dark bezel
  rrect(g, LID.x0, LID.y0, w, h, [LID.r, LID.r, 18, 18], SILVER, 7, INKC);
  rrect(g, LID.x0 + 12, LID.y0 + 12, w - 24, h - 20, [LID.r - 12, LID.r - 12, 10, 10], BEZEL, 5, "#2a2322");
  // display: black, with the page letterboxed under a black bar at the top
  g.fillStyle = DISPLAY; g.fillRect(DISP.x0, DISP.y0, DISP.x1 - DISP.x0, DISP.y1 - DISP.y0);
  g.drawImage(page, 0, 0, 2206, 946);
  // camera
  ellipse(g, 1100, -180, 9, 9, "#1c1818"); ellipse(g, 1100, -180, 4, 4, "#3d3434");
  // hinge line at the bottom
  stroke(g, [[LID.x0 + 30, LID.y1 - 6], [LID.x1 - 30, LID.y1 - 6]], 5, "#221c1b");
  return c;
}
export function paintLidBack() {
  // the lid's back (measured at 129.28 s: #6c6459 body, darker toward the hinge #5a5251, lighter top #968676,
  // a pale rim #cbb8ab). Painted as seen from behind (the shot mirrors it).
  const S = LID_SC, c = canvas((LID.x1 - LID.x0) * S + 8, (LID.y1 - LID.y0) * S + 8), g = c.getContext("2d");
  g.translate(4, 4); g.scale(S, S); g.translate(-LID.x0, -LID.y0);
  const w = LID.x1 - LID.x0, h = LID.y1 - LID.y0;
  rrect(g, LID.x0, LID.y0, w, h, [LID.r, LID.r, 18, 18], "#cbb8ab", 0);
  g.save(); g.beginPath(); g.roundRect(LID.x0 + 16, LID.y0 + 16, w - 32, h - 24, [LID.r - 12, LID.r - 12, 10, 10]); g.clip();
  g.fillStyle = lin(g, LID.x1, LID.y0, LID.x0 + w * 0.3, LID.y1, [[0, "#968676"], [0.3, "#71695e"], [0.7, "#665e55"], [1, "#58504f"]]);
  g.fillRect(LID.x0, LID.y0, w, h);
  for (let i = 0; i < 9000; i++) { const x = LID.x0 + ((i * 7919) % 2352), y = LID.y0 + ((i * 104729) % 1391); g.fillStyle = i % 2 ? "rgba(255,245,230,0.05)" : "rgba(20,15,10,0.06)"; g.fillRect(x, y, 3, 3); }
  g.restore();
  rrect(g, LID.x0, LID.y0, w, h, [LID.r, LID.r, 18, 18], null, 7, INKC);
  rrect(g, LID.x0 + 16, LID.y0 + 16, w - 32, h - 24, [LID.r - 12, LID.r - 12, 10, 10], null, 3, rgba(INKC, 0.6));
  return c;
}
// base top face (texture: x from -BW/2, z 0..BD), px per cm = BASE_PX
export function paintBaseTop() {
  const P = BASE_PX, c = canvas(BW * P + 8, BD * P + 8), g = c.getContext("2d");
  g.translate(4, 4); g.scale(P, P); g.translate(BW / 2, 0);
  const lw = 0.12;
  // warm silver, shaded darker on the left (-x) and lighter toward the window side (+x), as measured at 119.6 and 125.0
  g.fillStyle = lin(g, -BW / 2, 0, BW / 2, 0, [[0, "#bdb2a7"], [0.5, "#c9beb2"], [1, "#d6ccc1"]]); g.beginPath(); g.roundRect(-BW / 2, 0, BW, BD, [0.4, 0.4, 1.3, 1.3]); g.fill();
  g.fillStyle = lin(g, 0, 0, 0, BD, [[0, "rgba(90,70,60,0.10)"], [0.5, "rgba(90,70,60,0)"], [1, "rgba(255,250,240,0.08)"]]); g.fillRect(-BW / 2, 0, BW, BD);
  // keyboard: dark keys set into the silver deck (the deck shows as light gaps between them, as in the source)
  rrect(g, KB.x0 - 0.25, KB.z0 - 0.25, KB.x1 - KB.x0 + 0.5, KB.z1 - KB.z0 + 0.5, 0.35, "#aaa29c", lw * 0.7, rgba(INKC, 0.8));
  const rows = 6, rowH = (KB.z1 - KB.z0) / rows;
  for (let r = 0; r < rows; r++) {
    const z = KB.z0 + r * rowH + 0.14, n = r === 0 ? 14 : r === 5 ? 9 : 13 + (r % 2);
    const kw = (KB.x1 - KB.x0) / n, kh = rowH - (r === 0 ? 0.62 : 0.3);
    for (let k = 0; k < n; k++) {
      // bottom row: a wide space bar in the middle
      let x = KB.x0 + k * kw + 0.15, ww = kw - 0.3;
      if (r === 5 && k === 3) ww = kw * 3 - 0.3; else if (r === 5 && (k === 4 || k === 5)) continue;
      rrect(g, x, z, ww, kh, 0.2, mixHex("#2c2726", "#564c47", Math.max(0, Math.min(1, (x - KB.x0) / (KB.x1 - KB.x0)))), lw * 0.35, "#1c1817");
      g.fillStyle = rgba("#ffffff", 0.10); g.fillRect(x + 0.08, z + 0.06, ww - 0.16, 0.16);
      // the small bright glint on each key top (legend/reflection), seen as white ticks in the source
      if ((r * 7 + k * 3) % 4 !== 0) { g.fillStyle = rgba("#f4f1ec", 0.75); g.fillRect(x + ww * 0.18, z + kh * 0.22, 0.2, kh * 0.34); }
    }
  }
  // trackpad
  rrect(g, TP.x0, TP.z0, TP.x1 - TP.x0, TP.z1 - TP.z0, 0.5, "#c8bdb7", lw * 0.8, INKC);
  // front notch
  rrect(g, -2.2, BD - 0.55, 4.4, 0.8, 0.35, "#bdb3ad", lw * 0.7, INKC);
  // outline
  g.beginPath(); g.roundRect(-BW / 2 + 0.05, 0.05, BW - 0.1, BD - 0.1, [0.4, 0.4, 1.3, 1.3]); g.lineWidth = lw * 1.4; g.strokeStyle = INKC; g.stroke();
  return c;
}
export function baseTopH(Hcm) {
  // texture px -> cm (x - BW/2 offset) -> frame
  const P = BASE_PX, o = 4 / P;
  return mulH(Hcm, [1 / P, 0, -BW / 2 - o, 0, 1 / P, -o, 0, 0, 1]);
}
// the right-side ports, painted on the side face: u = z from 10.2 cm (left) to 2.5 cm (right), v = side height
export function paintPorts() {
  const P = 60, c = canvas(7.7 * P, 64), g = c.getContext("2d");
  const u = (z) => (10.2 - z) * P;
  const slot = (z0, z1, v0, v1, col) => { g.beginPath(); g.roundRect(u(z0), v0 * 64, u(z1) - u(z0), (v1 - v0) * 64, (v1 - v0) * 32); g.fillStyle = col; g.fill(); g.lineWidth = 3; g.strokeStyle = INKC; g.stroke(); };
  slot(9.71, 7.47, 0.34, 0.56, "#2a2423");
  slot(6.61, 5.28, 0.27, 0.63, "#3a3331"); slot(4.36, 3.04, 0.27, 0.63, "#3a3331");
  g.fillStyle = "#e9e4de"; for (const [z0, z1] of [[6.61, 5.28], [4.36, 3.04]]) { g.beginPath(); g.roundRect(u(z0) + 12, 0.38 * 64, u(z1) - u(z0) - 24, 0.14 * 64, 4); g.fill(); }
  for (const z of [7.04, 4.83]) ellipse(g, u(z), 0.45 * 64, 4, 4, "#2a2423");
  return c;
}
// side strip texture (u along the outline, v from top edge to bottom edge): ink edge, light highlight, silver, ink
export function paintSideStrip() {
  const c = canvas(8, 64), g = c.getContext("2d");
  g.fillStyle = lin(g, 0, 0, 0, 64, [[0, INKC], [0.06, INKC], [0.08, SILVER_L], [0.3, "#bdb4ae"], [0.8, "#9f9590"], [0.9, INKC], [1, INKC]]);
  g.fillRect(0, 0, 8, 64);
  return c;
}

export function mulH(A, B) {
  const C = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
  return C;
}
export const proj = (p) => [p[0] / p[2], p[1] / p[2]];

// rounded-rect outline polygon in plane coords
export function rrPoly(x0, y0, x1, y1, r, n = 6) {
  const pts = [], cs = [[x1 - r, y0 + r, -Math.PI / 2], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, Math.PI / 2], [x0 + r, y0 + r, Math.PI]];
  for (const [cx, cy, a0] of cs) for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * Math.PI / 2; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return pts;
}
