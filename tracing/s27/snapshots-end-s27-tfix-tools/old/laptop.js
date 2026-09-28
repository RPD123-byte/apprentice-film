// s27 laptop: the lid comes from the measured page->frame homography of the screen (SIFT, every frame), the base from
// its chamfer-fitted top-face corners. Textures are painted here; the shot maps them with gl.quadH / gl.mesh.
import { canvas, stroke, rrect, ellipse, lin, rgba, mixHex, INKC } from "./paint.js";

export const F = 2520, CX = 1103, CY = 473;   // focal length measured from the page homographies (f_norm, 120.4–128)
// lid in page px (the colour page is 2206 x 946 and sits in the display, letterboxed under a black bar)
export const LID = { x0: -93, y0: -234, x1: 2268, y1: 1170, r: 70 };   // (s27t) outer edge re-measured
export const DISP = { x0: -22, y0: -136, x1: 2200, y1: 1078 };        // (s27t) black glass, re-measured
export const LID_SC = 0.5;                    // lid texture px per page px
export const BW = 32.4, BD = 22.5;            // base top face, cm (texture x -BW/2..BW/2, z 0 (hinge) .. BD (front))
export const BASE_PX = 40;                    // base texture px per cm
// keyboard and trackpad on the base plane. (s27t pass) re-measured on the source hold rectified into base cm
// (tools/trace-scripts/s27t-tools/baserect.py): keyboard well x -13.9..14.0, z 0.4..12.7, six rows (gaps at z 1.8, 3.8, 6.0, 8.1,
// 10.3); trackpad x -5.2..5.4, z 13.8..20.9.
export const KB = { x0: -13.9, x1: 14.0, z0: 0.4, z1: 12.7 };
export const KB_ROWS = [0.4, 1.8, 3.8, 6.0, 8.1, 10.3, 12.7];
export const TP = { x0: -5.2, x1: 5.4, z0: 13.8, z1: 20.9 };

const SILVER = "#cfc8c1", SILVER_L = "#e2ddd6", BEZEL = "#57504f", DISPLAY = "#040505", KEY = "#2e2927";

// turned = false: the lid as lit in the frontal hold; true: as seen once the camera has swung round (121.2 s on), when the
// window no longer catches its rim (source, graded, 124.4–126.0: rim top 160,150,135, rim left 100,80,72, rim right
// 104,90,80, rim bottom 58,51,48; bezel top 120,106,88, bezel right ~108,95,90, bezel under the glass 62,55,52)
export function paintLidFront(page, turned = false) {
  const S = LID_SC, c = canvas((LID.x1 - LID.x0) * S + 8, (LID.y1 - LID.y0) * S + 8), g = c.getContext("2d");
  g.translate(4, 4); g.scale(S, S); g.translate(-LID.x0, -LID.y0);
  // (s27t pass) re-measured on the source hold (118.08–119.6, frames warped into page coords by the SCREEN track,
  // tools/trace-scripts/s27t-tools/lidprof.py + lidcol.py): outer ink, a light rim, an inner ink line, then a warm grey bezel
  // right up to the page on the left and right (no black margin there); the black glass only above and below the page.
  const w = LID.x1 - LID.x0, h = LID.y1 - LID.y0;
  const band = (d, rb) => { g.beginPath(); g.roundRect(LID.x0 + d, LID.y0 + d, w - 2 * d, h - 2 * d, [LID.r - d, LID.r - d, rb, rb]); };
  band(0, 18); g.fillStyle = INKC; g.fill();
  if (!turned) {
    // light rim: dim on the shaded left (150,140,136), bright toward the window (212,197,190 top; 232,213,199 right)
    band(6, 12); g.fillStyle = lin(g, LID.x0, 0, LID.x1, 0, [[0, "rgb(137,128,124)"], [0.2, "rgb(205,192,186)"], [0.55, "rgb(240,225,218)"], [1, "rgb(252,236,222)"]]); g.fill();
    g.save(); band(6, 12); g.clip(); g.fillStyle = "rgba(60,50,48,0.12)"; g.fillRect(LID.x0, LID.y1 - 30, w, 30); g.restore();   // bottom rim 178,169,165
  } else {
    band(6, 12); g.fillStyle = lin(g, LID.x0, 0, LID.x1, 0, [[0, "rgb(96,76,68)"], [1, "rgb(100,86,76)"]]); g.fill();
    g.save(); band(6, 12); g.clip();
    g.fillStyle = "rgb(165,154,138)"; g.fillRect(LID.x0 + 40, LID.y0, w - 80, 40);
    g.fillStyle = "rgb(52,45,43)"; g.fillRect(LID.x0, LID.y1 - 40, w, 40);
    g.restore();
  }
  band(16, 8); g.fillStyle = INKC; g.fill();
  // bezel: 84,69,69 on the left, 95,84,78 → 80,72,69 down the top, 136,109,86 on the lit right, 54,49,49 under the glass
  band(24, 4); g.fillStyle = turned ? lin(g, LID.x0, 0, LID.x1, 0, [[0, "rgb(112,97,84)"], [0.6, "rgb(118,104,88)"], [1, "rgb(106,93,88)"]])
    : lin(g, LID.x0, 0, LID.x1, 0, [[0, "rgb(69,62,65)"], [0.3, "rgb(73,64,64)"], [0.7, "rgb(78,69,66)"], [0.93, "rgb(108,93,82)"], [1, "rgb(124,106,88)"]]); g.fill();
  g.save(); band(24, 4); g.clip();
  g.fillStyle = lin(g, 0, LID.y0 + 24, 0, DISP.y0, [[0, "rgba(255,245,235,0.09)"], [1, "rgba(255,245,235,0)"]]); g.fillRect(LID.x0, LID.y0, w, DISP.y0 - LID.y0);
  g.fillStyle = turned ? "rgba(24,24,28,0.45)" : "rgba(24,24,28,0.3)"; g.fillRect(LID.x0, DISP.y1, w, LID.y1 - DISP.y1);
  g.restore();
  // display glass (black) with the page; the source's screen shows ~22 page px more on the left than the page's edge
  // (content aligned by the track) and 6 px less on the right: the page's edge columns are stretched over that sliver
  g.fillStyle = DISPLAY; g.fillRect(DISP.x0, DISP.y0, DISP.x1 - DISP.x0, DISP.y1 - DISP.y0);
  g.save(); g.beginPath(); g.rect(DISP.x0, DISP.y0, DISP.x1 - DISP.x0, DISP.y1 - DISP.y0); g.clip();
  g.drawImage(page, 0, 0, 2206, 946);
  g.drawImage(page, 0, 0, 3, 946, DISP.x0, 0, -DISP.x0 + 1, 946);
  g.restore();
  // the thin dark line where the glass meets the bezel at the sides (61,36,41 left; 100,58,51 right)
  g.fillStyle = "rgb(40,22,28)"; g.fillRect(DISP.x0 - 4, DISP.y0, 4, DISP.y1 - DISP.y0);
  g.fillStyle = "rgb(70,38,36)"; g.fillRect(DISP.x1, DISP.y0, 4, DISP.y1 - DISP.y0);
  // camera
  ellipse(g, 1100, -176, 9, 9, "#1c1818"); ellipse(g, 1100, -176, 4, 4, "#3d3434");
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
// (s27t pass) colours from the rectified source hold (graded): deck 201,193,185 on the left → 226,218,208 on the right,
// keys ~72,64,62 → 81,70,68 separated by darker gaps (~22), a light tick at the left edge of most keys, trackpad 206,193,185.
export function paintBaseTop(side = false) {   // side: the view from the side (122 s on), where the gaps between the keys read light
  const P = BASE_PX, c = canvas(BW * P + 8, BD * P + 8), g = c.getContext("2d");
  g.translate(4, 4); g.scale(P, P); g.translate(BW / 2, 0);
  const lw = 0.12;
  g.fillStyle = lin(g, -BW / 2, 0, BW / 2, 0, [[0, "#c2bbb6"], [0.5, "#d2cbc3"], [1, "#e5ddd2"]]); g.beginPath(); g.roundRect(-BW / 2, 0, BW, BD, [0.4, 0.4, 1.3, 1.3]); g.fill();
  g.fillStyle = lin(g, 0, 0, 0, BD, [[0, "rgba(90,70,60,0.08)"], [0.3, "rgba(90,70,60,0)"], [1, "rgba(255,250,240,0.04)"]]); g.fillRect(-BW / 2, 0, BW, BD);
  // keyboard well: dark, the keys a little lighter than the gaps between them
  // (end-s27-fix1) side view: each key outlined in dark ink with thin light gaps between (the source's keys read as black
  // keys: inside the key block at 125.04 p10/p50/p90 30/59/128 graded); before, wide flat gaps and no outlines read as a
  // pale grid
  rrect(g, KB.x0 - 0.12, KB.z0 - 0.1, KB.x1 - KB.x0 + 0.24, KB.z1 - KB.z0 + 0.2, 0.3, side ? "#221c1b" : "#161212", lw * 0.8, side ? INKC : "#6e6663");
  const gp = side ? 0.05 : 0.07;
  const units = [[14], [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5], [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], [1.8, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.7],
    [2.3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.2], [1, 1, 1, 1.1, 5.4, 1.1, 1, "ar", "ar", "ar"]];
  const kx = (x) => Math.max(0, Math.min(1, (x - KB.x0) / (KB.x1 - KB.x0)));
  for (let r = 0; r < 6; r++) {
    const z0 = KB_ROWS[r] + 0.1, z1 = KB_ROWS[r + 1] - 0.08;
    let U = units[r]; if (r === 0) U = new Array(14).fill(1);
    const tot = U.reduce((s, u) => s + (u === "ar" ? 1 : u), 0), uw = (KB.x1 - KB.x0) / tot;
    let x = KB.x0;
    U.forEach((u, i) => {
      const ww = (u === "ar" ? 1 : u) * uw;
      const col = side ? mixHex("#4a403d", "#574c48", kx(x + ww / 2)) : mixHex("#3b3432", "#4b423f", kx(x + ww / 2));
      if (u === "ar") {   // arrow cluster: half-height keys, the middle one split
        rrect(g, x + gp, z0 + (z1 - z0) * 0.5, ww - 2 * gp, (z1 - z0) * 0.5, 0.12, col, 0);
        if (i === U.length - 2) rrect(g, x + gp, z0, ww - 2 * gp, (z1 - z0) * 0.46, 0.12, col, 0);
      } else if (side) {   // grey keys in dark ink: the key top lighter on the far side, its front edge darker
        const kz0 = z0 + 0.03, kz1 = z1 - 0.03, gr = lin(g, 0, kz0, 0, kz1, [[0, "#77726f"], [0.6, "#67625f"], [1, "#56514f"]]);
        rrect(g, x + gp, kz0, ww - 2 * gp, kz1 - kz0, 0.16, gr, 0.1, "#1a1414");
      } else rrect(g, x + gp, z0, ww - 2 * gp, z1 - z0, 0.18, col, 0);
      if (!side && r < 5 && i > 0 && (r * 5 + i * 3) % 7 !== 0) { g.fillStyle = "rgba(236,231,226,0.85)"; g.fillRect(x + 0.06, z0 + 0.12, 0.08, (z1 - z0) * 0.72); }
      x += ww;
    });
  }
  // trackpad
  rrect(g, TP.x0, TP.z0, TP.x1 - TP.x0, TP.z1 - TP.z0, 0.45, "#d0c6c1", lw * 0.8, INKC);
  // outline
  g.beginPath(); g.roundRect(-BW / 2 + 0.05, 0.05, BW - 0.1, BD - 0.1, [0.4, 0.4, 1.3, 1.3]); g.lineWidth = lw * 1.4; g.strokeStyle = INKC; g.stroke();
  return c;
}
// (s27t pass) the base's side faces (u along the outline, v top → bottom): ink, a flat silver face (source front face
// 154–174 graded), ink. Separate from the lid rim's strip.
export function paintBaseSide() {
  const c = canvas(8, 64), g = c.getContext("2d");
  g.fillStyle = lin(g, 0, 0, 0, 64, [[0, INKC], [0.07, INKC], [0.1, "#b3aba8"], [0.6, "#aea6a3"], [0.86, "#a39b98"], [0.9, INKC], [1, INKC]]);
  g.fillRect(0, 0, 8, 64);
  return c;
}
// the finger notch cut into the middle of the front face (source: x -2.1..2.2 cm, a light pill with an ink edge)
export function paintNotch() {
  const c = canvas(128, 40), g = c.getContext("2d");
  g.beginPath(); g.roundRect(3, 2, 122, 33, [2, 2, 14, 14]); g.fillStyle = "#cbc3be"; g.fill(); g.lineWidth = 3; g.strokeStyle = INKC; g.stroke();
  g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(8, 5, 112, 5);
  return c;
}
// soft contact shadow on the desk under the base's lower edges (source: a band ~10 px tall, ~20 % darker)
export function paintContactShadow() {
  const c = canvas(8, 64), g = c.getContext("2d");
  g.fillStyle = lin(g, 0, 0, 0, 64, [[0, "rgba(70,38,30,0.34)"], [0.45, "rgba(70,38,30,0.2)"], [1, "rgba(70,38,30,0)"]]);
  g.fillRect(0, 0, 8, 64);
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

// (end-s27-fix1) the lid back's face as the camera swings past (128.64–129.28): the sunlit patch in its upper right over a
// darker face, fitted per source frame (s27/lidback.js). Painted into a canvas the size of the lid-back texture (same
// mapping), clipped inside the rim, laid over paintLidBack.
import { LB_U, LIDBACK } from "./lidback.js";
export function lidBackRow(t) {
  const T = LIDBACK, n = T.length;
  if (t <= T[0][0]) return T[0];
  if (t >= T[n - 1][0]) return T[n - 1];
  let i = 0; while (i < n - 2 && T[i + 1][0] <= t) i++;
  const a = T[i], b = T[i + 1], u = Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0])));
  const L = (x, y) => x + (y - x) * u;
  const pa = a[2].length ? a[2] : b[2], pb = b[2].length ? b[2] : a[2];
  return [t, a[1].map((v, k) => L(v, b[1][k])), pa.length ? pa.map((v, k) => L(v, pb[k])) : [], a[3].map((c, k) => c.map((v, j) => L(v, b[3][k][j])))];
}
let LBQ = null;
export function paintLidBackFace(c, row) {
  const S = LID_SC, g = c.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
  g.translate(4, 4); g.scale(S, S); g.translate(-LID.x0, -LID.y0);
  const w = LID.x1 - LID.x0, h = LID.y1 - LID.y0;
  g.save(); g.beginPath(); g.roundRect(LID.x0 + 18, LID.y0 + 18, w - 36, h - 28, [LID.r - 14, LID.r - 14, 8, 8]); g.clip();
  // the face: a bilinear colour field from its four corner colours (a 2 x 2 image drawn smoothed, sampled at pixel centres)
  if (!LBQ) LBQ = canvas(2, 2);
  const q = LBQ.getContext("2d"), im = q.createImageData(2, 2), [TL, TR, BR, BL] = row[3];
  [TL, TR, BL, BR].forEach((col, k) => { for (let j = 0; j < 3; j++) im.data[k * 4 + j] = Math.max(0, Math.min(255, Math.round(col[j]))); im.data[k * 4 + 3] = 255; });
  q.putImageData(im, 0, 0);
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  g.drawImage(LBQ, 0.5, 0.5, 1, 1, LID.x0, LID.y0, w, h);
  // the sunlit patch above the boundary, its edge softened like the source's
  if (row[2].length && row[1].some((v) => v > 0.01)) {
    g.filter = "blur(7px)";
    g.beginPath(); g.moveTo(LID.x0 - 40, LID.y0 - 40);
    LB_U.forEach((u, k) => g.lineTo(LID.x0 + u * w, LID.y0 + row[1][k] * h));
    g.lineTo(LID.x1 + 40, LID.y0 + row[1][LB_U.length - 1] * h); g.lineTo(LID.x1 + 40, LID.y0 - 40); g.closePath();
    g.fillStyle = `rgb(${row[2].map((v) => Math.round(v)).join(",")})`; g.fill();
    g.filter = "none";
  }
  g.restore();
  return c;
}
