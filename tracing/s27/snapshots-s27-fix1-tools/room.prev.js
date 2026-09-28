// s27 (drawn) — the morning room's back wall, drawn in code in REFERENCE coordinates (= frame px of the held view at
// 119.6 s). One measured wall homography (tracks.js WALL) carries it through the whole shot: masked KLT on the source
// shows shelves, speakers, books and window all ride one plane to within ~2 px during the turn.
// Positions and sizes were read off 2.2–3x gridded crops of the source (snapshots/s27d-study/c118_*.jpg); colours are
// pre-grade samples (snapshots/s27d-tools/samp.py). Parts the held view cannot see (behind the laptop, right of the
// frame, far left) were measured on later frames and mapped back through the wall homography.
import { canvas, poly, spoly, fillPoly, strokePoly, line, inkLine, leaf, stem, softShadow, INK, rng } from "./draw.js";

export const WALL_BOX = { x: -2400, y: -260, w: 5100, h: 1220 };   // ref px covered by the wall canvas (scale 1)

const C = {
  wall: "#e8e2d3", wallWarm: "#ece3d4", wallShade: "#d9d0c2",
  wood: "#d7ae98", woodFront: "#c79a86", woodDark: "#a88070", woodLight: "#e6c3ae",
  terracotta: "#b98b78", terracottaD: "#a07565", potW: "#e0d3c0", potWD: "#cbbca8",
  leaf: "#8f9272", leafD: "#767a5c", leafL: "#a7a88a",
  box: "#cfbba2", boxD: "#b9a287", boxW: "#d9d2c6", boxWD: "#c3b9ab",
  spk: "#b58f78", spkD: "#a07c68", spkSide: "#a47f6b", cone: "#cf9a6c", coneL: "#e2b688", coneD: "#58414a",
  glass: "#f3f3e9", frame: "#e3d6c4", frameD: "#cdbba8",
};

// ------------------------------------------------------------------ pieces
function shelf(g, x0, x1, yTop, thick, brackets, { endDepth = 28, endDrop = 12, dark = false } = {}) {
  const wl = dark ? "#b89483" : C.woodLight, wf = dark ? "#a68674" : C.woodFront;
  // soft shadow under the plank on the wall
  softShadow(g, [[x0, yTop + thick], [x1, yTop + thick], [x1 - 10, yTop + thick + 26], [x0, yTop + thick + 30]], "rgba(120,90,75,0.16)", 9);
  // top surface (thin sliver seen from slightly above) and front face
  fillPoly(g, [[x0, yTop], [x1, yTop], [x1 + endDepth, yTop + endDrop], [x0, yTop + endDrop]], wl);
  fillPoly(g, [[x0, yTop + endDrop], [x1 + endDepth, yTop + endDrop], [x1 + endDepth, yTop + thick], [x0, yTop + thick]], wf);
  strokePoly(g, [[x0, yTop], [x1, yTop], [x1 + endDepth, yTop + endDrop], [x1 + endDepth, yTop + thick], [x0, yTop + thick]], 2.2, INK, false);
  line(g, [x0, yTop + endDrop], [x1 + endDepth, yTop + endDrop], 1.4, "rgba(74,58,51,0.7)");
  line(g, [x1, yTop], [x1, yTop + endDrop], 1.2, "rgba(74,58,51,0.5)");
  for (const bx of brackets) {
    // L bracket: arm under the plank, vertical plate on the wall, screw dots
    const y0 = yTop + thick;
    softShadow(g, [[bx - 2, y0], [bx + 24, y0], [bx + 20, y0 + 70], [bx - 6, y0 + 70]], "rgba(110,80,70,0.18)", 5);
    fillPoly(g, [[bx - 22, y0], [bx + 16, y0], [bx + 16, y0 + 64], [bx + 12, y0 + 68], [bx + 2, y0 + 68], [bx - 1, y0 + 64], [bx - 1, y0 + 14], [bx - 18, y0 + 6]], C.woodFront);
    strokePoly(g, [[bx - 22, y0], [bx + 16, y0], [bx + 16, y0 + 64], [bx + 12, y0 + 68], [bx + 2, y0 + 68], [bx - 1, y0 + 64], [bx - 1, y0 + 14], [bx - 18, y0 + 6]], 1.8);
    g.fillStyle = INK; for (const yy of [y0 + 24, y0 + 54]) { g.beginPath(); g.arc(bx + 8, yy, 2, 0, 7); g.fill(); }
  }
}

function pot(g, xL, xR, yTop, yBot, { taper = 6, rim = 16, col = C.potW, shade = C.potWD, saucer = 0 } = {}) {
  const P = [[xL, yTop], [xR, yTop], [xR - 2, yTop + rim], [xR - taper, yBot], [xL + taper, yBot], [xL + 2, yTop + rim]];
  softShadow(g, [[xL - 30, yTop + 8], [xL + 10, yTop + 8], [xL + 12, yBot], [xL - 26, yBot]], "rgba(100,80,70,0.16)", 8);
  fillPoly(g, P, col);
  // shading on the left (light from the window at the right)
  g.save(); poly(g, P); g.clip();
  const gr = g.createLinearGradient(xL, 0, xR, 0);
  gr.addColorStop(0, shade); gr.addColorStop(0.45, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(255,255,255,0.08)");
  g.fillStyle = gr; g.fillRect(xL - 5, yTop - 5, xR - xL + 10, yBot - yTop + 10); g.restore();
  strokePoly(g, P, 2.2);
  inkLine(g, [[xL + 2, yTop + rim], [(xL + xR) / 2, yTop + rim + 3], [xR - 2, yTop + rim]], 1.8);
  if (saucer) {
    fillPoly(g, [[xL + taper - 6, yBot - 2], [xR - taper + 6, yBot - 2], [xR - taper + 3, yBot + saucer], [xL + taper - 3, yBot + saucer]], col);
    strokePoly(g, [[xL + taper - 6, yBot - 2], [xR - taper + 6, yBot - 2], [xR - taper + 3, yBot + saucer], [xL + taper - 3, yBot + saucer]], 2);
  }
}

function box(g, x0, x1, y0, y1, { lid = 18, lidOver = 4, side = 0, col = C.boxW, colD = C.boxWD, handle = false, label = false } = {}) {
  // front face with a lid band; `side` > 0 shows the right side face receding (seen from the left)
  if (side) fillPoly(g, [[x1, y0], [x1 + side, y0 - side * 0.35], [x1 + side, y1 - side * 0.35], [x1, y1]], colD);
  fillPoly(g, [[x0, y0 + lid], [x1, y0 + lid], [x1, y1], [x0, y1]], col);
  fillPoly(g, [[x0 - lidOver, y0], [x1 + lidOver, y0], [x1 + lidOver, y0 + lid], [x0 - lidOver, y0 + lid]], col);
  g.save(); poly(g, [[x0, y0 + lid], [x1, y0 + lid], [x1, y1], [x0, y1]]); g.clip();
  const gr = g.createLinearGradient(0, y0 + lid, 0, y1); gr.addColorStop(0, "rgba(90,70,60,0.14)"); gr.addColorStop(0.3, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.restore();
  strokePoly(g, [[x0 - lidOver, y0], [x1 + lidOver, y0], [x1 + lidOver, y0 + lid], [x0 - lidOver, y0 + lid]], 1.9);
  strokePoly(g, [[x0, y0 + lid], [x0, y1], [x1, y1], [x1, y0 + lid]], 1.9, INK, false);
  if (side) strokePoly(g, [[x1 + lidOver, y0], [x1 + side, y0 - side * 0.35], [x1 + side, y1 - side * 0.35], [x1, y1]], 1.6, INK, false);
  if (handle) { g.beginPath(); g.roundRect((x0 + x1) / 2 - 14, y0 + lid + (y1 - y0 - lid) * 0.35, 28, 9, 3); g.lineWidth = 1.5; g.strokeStyle = INK; g.stroke(); }
  if (label) { g.beginPath(); g.rect((x0 + x1) / 2 - 22, y0 + lid + (y1 - y0 - lid) * 0.3, 44, 14); g.fillStyle = "rgba(255,255,255,0.35)"; g.fill(); g.lineWidth = 1.3; g.strokeStyle = INK; g.stroke(); }
}

function book(g, pts, col, { spine = null } = {}) {
  fillPoly(g, pts, col); strokePoly(g, pts, 1.7);
  if (spine) { g.save(); poly(g, pts); g.clip(); g.fillStyle = spine; g.fillRect(pts[0][0] - 50, pts[0][1] - 400, 400, 800); g.restore(); strokePoly(g, pts, 1.7); }
}

// ------------------------------------------------------------------ plants
function jadePlant(g, cx, baseY, seed) {
  // small round paired leaves on thin stems (the terracotta pot, left shelf)
  const R = rng(seed);
  const stems = [[-38, -70, -60, -95], [-15, -80, -20, -108], [5, -95, 8, -104], [22, -80, 40, -98], [40, -60, 62, -82], [-50, -40, -70, -52], [55, -30, 78, -48], [-5, -60, -40, -76]];
  for (const [mx, my, tx, ty] of stems) {
    const pts = [[cx + mx * 0.1, baseY], [cx + mx * 0.6, baseY + my * 0.6], [cx + tx, baseY + ty]];
    stem(g, pts, 2.2, "#7e7f60");
    for (let k = 0; k < 5; k++) {
      const u = 0.35 + k * 0.15;
      const px = cx + (mx * 0.1) * (1 - u) + tx * u, py = baseY + ty * u;
      for (const s of [-1, 1]) {
        const a = Math.atan2(ty, tx - mx * 0.1) + s * (0.9 + 0.2 * R());
        const L = 13 + 5 * R();
        leaf(g, [px, py], [px + Math.cos(a) * L, py + Math.sin(a) * L], 5.5 + R() * 1.5, R() < 0.5 ? C.leaf : C.leafL, { lw: 1.3, rib: false, at: 0.5 });
      }
    }
    leaf(g, [cx + tx, baseY + ty + 4], [cx + tx + (tx > 0 ? 6 : -6), baseY + ty - 12], 5.5, C.leafL, { lw: 1.3, rib: false, at: 0.5 });
  }
}
function lilyPlant(g, cx, baseY, spec, seed) {
  // broad lanceolate leaves fanning up out of the pot (spec: [angle(deg from up), length, width, bend])
  const R = rng(seed);
  for (const [ang, L, w, bend] of spec) {
    const a = (ang - 90) * Math.PI / 180;
    const b = [cx + Math.cos(a) * 8, baseY];
    const tip = [cx + Math.cos(a) * L, baseY + Math.sin(a) * L];
    stem(g, [b, [b[0] + (tip[0] - b[0]) * 0.35, b[1] + (tip[1] - b[1]) * 0.35]], 2.4, "#7a7c5c");
    const lb = [b[0] + (tip[0] - b[0]) * 0.3, b[1] + (tip[1] - b[1]) * 0.3];
    leaf(g, lb, tip, w, R() < 0.5 ? C.leaf : C.leafL, { bend, at: 0.35, lw: 1.6, shade: "rgba(90,95,65,0.28)" });
  }
}
function pothos(g, pts, seed, { leafSize = 16 } = {}) {
  // a trailing vine with heart leaves hanging off it
  const R = rng(seed);
  stem(g, pts, 1.8, "#6e7353");
  for (let i = 1; i < pts.length; i++) {
    const [x, y] = pts[i], s = i % 2 ? 1 : -1;
    const L = leafSize * (0.8 + 0.4 * R());
    leaf(g, [x, y], [x + s * L * 0.7, y + L * 0.8], L * 0.42, R() < 0.5 ? C.leaf : C.leafD, { lw: 1.3, at: 0.35, bend: s * 2 });
  }
}

// ------------------------------------------------------------------ the window (right of the held view)
function windowA(g) {
  // measured at 118.5 s (pre-grade samples): glass #f6f9ee, casing #e1d3bc, sill #d8c1bb; the wall between the shelves
  // and the window (x 1580–1722) is a warmer, darker band (#c7b7ab at the top .. #ddcebc)
  const wb = g.createLinearGradient(0, -260, 0, 650);
  wb.addColorStop(0, "#c6b5a8"); wb.addColorStop(0.35, "#d5c5b5"); wb.addColorStop(0.7, "#ddcebc"); wb.addColorStop(1, "#d6c3b8");
  g.save(); g.filter = "blur(10px)"; fillPoly(g, [[1590, -300], [1740, -300], [1740, 700], [1590, 700]], wb); g.restore();
  const gl = g.createLinearGradient(1730, 0, 2206, 0);
  gl.addColorStop(0, "#eeede1"); gl.addColorStop(0.35, "#f5f8ec"); gl.addColorStop(0.85, "#f4f7ea"); gl.addColorStop(1, "#ece8da");
  fillPoly(g, [[1728, -260], [2700, -260], [2700, 545], [1728, 545]], gl);
  // casing on the right, sash bar across the top, mullions, handle
  fillPoly(g, [[2140, -260], [2700, -260], [2700, 560], [2146, 560]], "#e1d3bc");
  fillPoly(g, [[1735, 160], [2130, 15], [2130, 40], [1740, 185]], "#e9dcc8");
  line(g, [1735, 160], [2130, 15], 1.2, "rgba(130,105,90,0.45)"); line(g, [1740, 185], [2130, 40], 1.2, "rgba(130,105,90,0.45)");
  for (const [x0, x1] of [[1722, 1735], [1785, 1795], [1808, 1816], [1830, 1838], [1862, 1872], [2085, 2095], [2128, 2140]]) {
    fillPoly(g, [[x0, -260], [x1, -260], [x1, 548], [x0, 548]], "#e6d8c4");
    line(g, [x0, -260], [x0, 548], 1.1, "rgba(130,105,90,0.5)"); line(g, [x1, -260], [x1, 548], 1.1, "rgba(130,105,90,0.5)");
  }
  g.beginPath(); g.roundRect(2102, 44, 22, 110, 8); g.fillStyle = "#e8dcca"; g.fill(); g.lineWidth = 1.3; g.strokeStyle = "rgba(130,105,90,0.6)"; g.stroke();
  // sill receding toward the lower right, then the wall below it
  fillPoly(g, [[1722, 545], [2700, 545], [2700, 600], [1722, 590]], "#dccbb9");
  fillPoly(g, [[1722, 590], [2700, 600], [2700, 660], [1722, 660]], "#d6c2b6");
  line(g, [1722, 545], [2700, 545], 1.3, "rgba(130,105,90,0.55)"); line(g, [1722, 590], [2700, 600], 1.2, "rgba(130,105,90,0.45)");
}

// ------------------------------------------------------------------ the wall canvas
export function paintWall() {
  const B = WALL_BOX, c = canvas(B.w, B.h), g = c.getContext("2d");
  g.translate(-B.x, -B.y);
  // plaster: warm cream, a touch brighter toward the window
  const wg = g.createLinearGradient(-1000, 0, 2700, 0);
  wg.addColorStop(0, "#e6e1d3"); wg.addColorStop(0.35, "#e8e3d4"); wg.addColorStop(0.62, "#ebe4d6"); wg.addColorStop(1, "#ede3d5");
  g.fillStyle = wg; g.fillRect(B.x, B.y, B.w, 650 - B.y);
  // plaster mottle (seeded)
  const R = rng(1181);
  for (let i = 0; i < 3600; i++) {
    const x = B.x + R() * B.w, y = B.y + R() * (650 - B.y), r = 1 + R() * 3;
    g.fillStyle = R() < 0.5 ? "rgba(255,255,255,0.05)" : "rgba(120,100,90,0.035)";
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  windowA(g);
  leftSide(g);

  // (the left shelf of the held view is its own layer, paintShelfA: the source swaps it for another shelf at ~122.5)

  // --- right shelves: hanging pothos, two white boxes, books (measured at 118.5 s)
  // upper shelf items peeking at the top: a pot and books
  book(g, [[1440, -40], [1458, -40], [1462, 28], [1444, 28]], "#d9cbb7");
  book(g, [[1460, -40], [1474, -40], [1476, 28], [1462, 28]], "#c8b39d");
  pot(g, 1490, 1580, -60, 28, { taper: 6, rim: 14, col: C.box, shade: C.boxD });
  shelf(g, 1170, 1580, 24, 20, [1530], { endDepth: 30, endDrop: 6, dark: true });
  box(g, 1273, 1403, 90, 132, { lid: 12, lidOver: 3, side: 0 });
  box(g, 1252, 1425, 132, 190, { lid: 16, lidOver: 4 });
  // books: two leaning, four upright
  book(g, [[1452, 190], [1486, 88], [1500, 92], [1470, 190]], "#dccab4");
  book(g, [[1472, 190], [1500, 84], [1514, 88], [1490, 190]], "#c9b199");
  book(g, [[1512, 190], [1512, 80], [1530, 80], [1530, 190]], "#c9b8a8");
  book(g, [[1530, 190], [1530, 76], [1548, 76], [1548, 190]], "#a69a98");
  book(g, [[1548, 190], [1548, 82], [1566, 82], [1566, 190]], "#bda89a");
  book(g, [[1566, 190], [1566, 74], [1590, 74], [1590, 190]], "#d4c8ba");
  shelf(g, 1170, 1580, 190, 13, [1530], { endDepth: 30, endDrop: 5 });
  pothos(g, [[1210, -40], [1205, 0], [1190, 30], [1178, 60], [1170, 95], [1178, 125], [1188, 150]], 41, { leafSize: 20 });
  pothos(g, [[1230, -40], [1240, 5], [1262, 20], [1252, 50], [1245, 80]], 43, { leafSize: 18 });
  pothos(g, [[1180, -30], [1160, 10], [1152, 50], [1160, 80]], 47, { leafSize: 17 });

  // --- two stacked storage boxes on the sideboard, hidden behind the laptop in the held view (seen from 122 s; read on
  // the 125.0 s frame warped into wall coordinates)
  box(g, 1275, 1440, 470, 535, { lid: 20, lidOver: 4, label: true });
  box(g, 1300, 1420, 415, 470, { lid: 17, lidOver: 3, label: true });
  // --- books on the low cabinet behind the mug (right of the laptop)
  book(g, [[1462, 520], [1490, 400], [1504, 404], [1480, 520]], "#dcc9b2");
  book(g, [[1484, 520], [1484, 380], [1510, 380], [1510, 520]], "#e2d8c8");
  book(g, [[1510, 520], [1510, 370], [1536, 370], [1536, 520]], "#d3c1ab");
  book(g, [[1536, 520], [1536, 380], [1575, 380], [1575, 520]], "#e0d3c1");
  fillPoly(g, [[1440, 520], [1650, 520], [1650, 600], [1440, 600]], "#dcc1a8"); strokePoly(g, [[1440, 520], [1650, 520], [1650, 600], [1440, 600]], 1.8);

  // --- low sideboard with the two speakers (left of the laptop), continuing right behind the laptop
  softShadow(g, [[415, 440], [462, 430], [462, 552], [410, 556]], "rgba(110,85,75,0.22)", 8);
  const sbTop = [[397, 558], [460, 548], [1500, 548], [1500, 560], [397, 560]];
  fillPoly(g, sbTop, C.woodLight);
  fillPoly(g, [[397, 560], [1500, 560], [1500, 650], [397, 650]], "#d5b294");
  strokePoly(g, [[397, 558], [460, 548], [1500, 548]], 2, INK, false);
  line(g, [397, 560], [1500, 560], 1.8); line(g, [397, 558], [397, 650], 2);
  for (const [a, b] of [[413, 643], [643, 900], [900, 1160], [1160, 1420]]) strokePoly(g, [[a, 572], [b, 572], [b, 650], [a, 650]], 1.4, "rgba(74,58,51,0.75)", false);
  for (const [x0, x1] of [[461, 555], [555, 657]]) speaker(g, x0, x1);
  return c;
}

// ------------------------------------------------------------------ the two left shelves
// The source's room is not rigid: the left shelf of the held view (A: box, terracotta pot, two white pots, shelf to
// x 615) is swapped, hidden behind his beanie at ~122.5 s, for a shorter one (B: box with books, terracotta pot with a
// different plant, one white pot, shelf ending at x 390) that rides its own measured track. A is drawn in wall
// reference coordinates (held view); B in frame coordinates of the 125.0 s view (read on a 2.4x grid).
export const SHELF_A_BOX = { x: -100, y: -80, w: 760, h: 380 };
export function paintShelfA() {
  const B = SHELF_A_BOX, c = canvas(B.w * 2, B.h * 2), g = c.getContext("2d");
  g.scale(2, 2); g.translate(-B.x, -B.y);
  // --- left shelf with a box, books and three potted plants (measured at 118.5 s)
  // books on the box, box
  book(g, [[-40, 95], [98, 95], [100, 104], [-40, 104]], "#ddd3c3");
  book(g, [[-40, 104], [102, 104], [104, 112], [-40, 112]], "#cfc2b0");
  box(g, -60, 108, 112, 188, { lid: 21, lidOver: 3, col: C.box, colD: C.boxD });
  g.beginPath(); g.roundRect(-6, 140, 18, 12, 3); g.lineWidth = 1.5; g.strokeStyle = INK; g.stroke();
  jadePlant(g, 162, 110, 11);
  pot(g, 118, 208, 107, 180, { taper: 6, rim: 12, col: C.terracotta, shade: C.terracottaD, saucer: 8 });
  lilyPlant(g, 292, 118, [[-62, 70, 12, -6], [-40, 100, 14, -8], [-12, 112, 12, -4], [10, 95, 14, 6], [34, 88, 13, 8], [58, 72, 12, 6], [-80, 55, 10, -4], [78, 60, 10, 4]], 21);
  pot(g, 250, 337, 112, 187, { taper: 8, rim: 20 });
  lilyPlant(g, 472, 120, [[-60, 75, 13, -6], [-36, 104, 13, -6], [-10, 118, 12, -3], [14, 100, 14, 6], [38, 90, 13, 8], [62, 70, 11, 5], [82, 52, 9, 3], [-82, 55, 9, -3]], 31);
  pot(g, 430, 517, 115, 187, { taper: 8, rim: 20 });
  shelf(g, -60, 615, 188, 27, [8, 332, 588]);
  return c;
}
export const SHELF_B_BOX = { x: -160, y: -40, w: 620, h: 340 };
export function paintShelfB() {
  const B = SHELF_B_BOX, c = canvas(B.w * 2, B.h * 2), g = c.getContext("2d");
  g.scale(2, 2); g.translate(-B.x, -B.y);
  // box with two books on top (front face x -60..65, side face 65..108 receding), lid band
  book(g, [[-70, 92], [50, 92], [92, 104], [-70, 104]], "#ddd3c3");
  book(g, [[-70, 104], [55, 104], [96, 116], [-70, 116]], "#cfc2b0");
  fillPoly(g, [[65, 120], [108, 136], [108, 185], [65, 185]], C.boxD);
  box(g, -60, 65, 118, 185, { lid: 20, lidOver: 3, col: C.box, colD: C.boxD });
  strokePoly(g, [[68, 118], [108, 134], [108, 185]], 1.8, INK, false);
  g.beginPath(); g.roundRect(-8, 140, 30, 14, 3); g.lineWidth = 1.5; g.strokeStyle = INK; g.stroke();
  jadePlant(g, 160, 108, 13);
  pot(g, 117, 205, 105, 180, { taper: 6, rim: 12, col: C.terracotta, shade: C.terracottaD, saucer: 8 });
  lilyPlant(g, 292, 112, [[-70, 80, 13, -8], [-45, 105, 14, -8], [-15, 118, 12, -4], [12, 100, 14, 6], [40, 95, 13, 8], [65, 78, 12, 6], [88, 60, 10, 4]], 23);
  pot(g, 248, 333, 110, 185, { taper: 8, rim: 24 });
  shelf(g, -160, 388, 186, 26, [4, 318], { endDepth: 6, endDrop: 10 });
  return c;
}

// ------------------------------------------------------------------ the late sill (right of the laptop, from ~121 s)
// As the camera turns, the source redraws the space right of the laptop: the window sill and the wall under it
// recede diagonally down to a desk/wall junction from (1700, 690) to (2206, 800) (125.0 s frame px, read on a 1.6x
// grid), well below where the held view's junction lands. Drawn in 125.0 s frame coordinates.
export const LATE_SILL_BOX = { x: 1600, y: 480, w: 800, h: 380 };
export function paintLateSill() {
  const B = LATE_SILL_BOX, c = canvas(B.w, B.h), g = c.getContext("2d");
  g.translate(-B.x, -B.y);
  const P = [[1690, 540], [2400, 560], [2400, 845], [2206, 800], [1700, 690]];
  const gr = g.createLinearGradient(1700, 560, 2150, 780);
  gr.addColorStop(0, "#dbcfbf"); gr.addColorStop(0.45, "#ccbeac"); gr.addColorStop(0.8, "#c1b2a4"); gr.addColorStop(1, "#b6a19d");
  fillPoly(g, P, gr);
  for (const [a, b, w] of [[[1740, 555], [2400, 628], 1.6], [[1740, 590], [2400, 685], 1.4], [[1730, 640], [2400, 745], 1.4], [[1700, 690], [2400, 845], 2.4]])
    line(g, a, b, w, "rgba(90,70,60,0.75)");
  return c;
}

// ------------------------------------------------------------------ the far left, seen only in the end orbit (128.6–129.3)
// read off the wall-reference panorama of the 128.8–129.32 frames (snapshots/s27d-study/pano_left*.jpg)
function leftSide(g) {
  // sunlit warm wall toward the far left
  const sg = g.createLinearGradient(-2400, 0, -1300, 0);
  sg.addColorStop(0, "#efd9bf"); sg.addColorStop(1, "rgba(236,227,212,0)");
  g.fillStyle = sg; g.fillRect(-2400, -260, 1100, 910);
  // window frames: pairs of light wooden strips with a latch
  for (const [x0, x1, yb] of [[-905, -872, 215], [-803, -776, 215], [-338, -305, 225], [-205, -176, 225]]) {
    fillPoly(g, [[x0, -260], [x1, -260], [x1 + 4, yb], [x0 + 4, yb]], "#dcc2a6");
    strokePoly(g, [[x0, -260], [x0 + 4, yb], [x1 + 4, yb], [x1, -260]], 1.4, "rgba(120,90,70,0.65)", false);
  }
  g.beginPath(); g.roundRect(-822, 80, 18, 34, 5); g.fillStyle = "#e3cdb6"; g.fill(); g.lineWidth = 1.2; g.strokeStyle = "rgba(120,90,70,0.6)"; g.stroke();
  // far-left window with blinds (bright, warm) and dark mullions
  fillPoly(g, [[-2400, -260], [-1960, -260], [-1960, 420], [-2400, 420]], "#f1dcc3");
  for (let y = -240; y < 420; y += 26) line(g, [-2400, y], [-1965, y + 3], 2, "rgba(170,120,95,0.35)");
  for (const x of [-1540, -1500, -1400, -1370]) line(g, [x, -110], [x + 6, 420], 5, "rgba(120,80,70,0.55)");
  // low cabinet with a lilac mug and a potted plant
  fillPoly(g, [[-2400, 560], [-1540, 560], [-1540, 960], [-2400, 960]], "#e2c7a1");
  line(g, [-2400, 560], [-1540, 560], 2.2); line(g, [-1540, 560], [-1540, 960], 2);
  fillPoly(g, [[-2400, 600], [-1540, 600], [-1540, 610], [-2400, 610]], "rgba(150,110,80,0.35)");
  g.beginPath(); g.roundRect(-2164, 395, 190, 170, 16); g.fillStyle = "#b8a5c4"; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
  lilyPlant(g, -1730, 470, [[-70, 110, 16, -8], [-40, 150, 16, -6], [-10, 170, 14, -3], [20, 150, 16, 6], [50, 130, 16, 8], [80, 100, 14, 5], [-90, 80, 12, -5]], 57);
  pot(g, -1850, -1610, 460, 555, { taper: 10, rim: 22 });
  // dark wooden chair back in front of the cabinet
  fillPoly(g, [[-1930, 700], [-1600, 664], [-1370, 700], [-1370, 960], [-1930, 960]], "#6a4a3e");
  strokePoly(g, [[-1930, 960], [-1930, 700], [-1600, 664], [-1370, 700], [-1370, 960]], 2.4, INK, false);
}

function speaker(g, x0, x1) {
  const front = x0 + (x1 - x0) * 0.79, top = 426, bot = 552;
  fillPoly(g, [[front, top + 2], [x1, top + 6], [x1, bot - 2], [front, bot]], C.spkSide);
  fillPoly(g, [[x0, top], [front, top], [front, bot], [x0, bot]], C.spk);
  strokePoly(g, [[x0, top], [front, top], [x1, top + 6], [x1, bot - 2], [front, bot], [x0, bot]], 2);
  line(g, [front, top], [front, bot], 1.6);
  const cx = (x0 + front) / 2;
  // tweeter
  g.fillStyle = "#4e3d3f"; g.beginPath(); g.arc(cx, 452, 17, 0, 7); g.fill();
  g.fillStyle = "#6e5a5b"; g.beginPath(); g.arc(cx, 452, 9, 0, 7); g.fill();
  g.fillStyle = "#e8e0d8"; g.beginPath(); g.arc(cx - 1, 451, 2.5, 0, 7); g.fill();
  // woofer: dark surround, yellow cone, dark dust cap
  g.fillStyle = C.coneD; g.beginPath(); g.arc(cx, 505, 33, 0, 7); g.fill();
  const cg = g.createRadialGradient(cx - 8, 498, 4, cx, 505, 27);
  cg.addColorStop(0, C.coneL); cg.addColorStop(1, C.cone);
  g.fillStyle = cg; g.beginPath(); g.arc(cx, 505, 26, 0, 7); g.fill();
  g.fillStyle = "#5a4648"; g.beginPath(); g.arc(cx, 505, 10, 0, 7); g.fill();
  g.lineWidth = 1.4; g.strokeStyle = INK; g.beginPath(); g.arc(cx, 505, 33, 0, 7); g.stroke();
  g.fillStyle = "#5a4648"; g.beginPath(); g.arc(front - 11, 542, 4, 0, 7); g.fill();
}

// ------------------------------------------------------------------ the desk (ref coords, rides the base track)
// top surface from the wall line (y 648 in the held view) to the front edge (y 862), then the front edge face.
// Colours: blurred pre-grade samples of the held view (118.5 s) on a 150 x 30 px grid.
export const DESK_BOX = { x: -2600, y: -400, w: 7600, h: 2440 };
// The desk top runs from the wall line (y 647) to the front edge (y 862); its back-left corner is at (291, 647) and its
// left edge runs down-left through (0, 733) — left of it the wall continues down. A diagonal shaft of window light
// crosses it through (90, 862)–(350, 750); the laptop casts a soft shadow forward-left. Colours: blurred pre-grade
// samples of the held view (118.5 s).
export function paintDesk(noFront = false) {
  const B = DESK_BOX, s = 0.5, c = canvas(B.w * s, B.h * s), g = c.getContext("2d");
  g.scale(s, s); g.translate(-B.x, -B.y);
  const yF = noFront ? 5000 : 862;
  // the desk top everywhere (in the end orbit the far parts of the desk plane come into view), except the small
  // triangle of wall the held view shows left of the desk's back-left corner
  const top = [[B.x, B.y], [B.x + B.w, B.y], [B.x + B.w, yF], [B.x, yF]];
  fillPoly(g, [[-400, 647], [291, 647], [-100, 763], [-400, 851]], "#e6e5d5");
  // warm tan on the left, cream toward the window at the right (pre-grade samples 118.5 s: x 350 #caa68b, x 1650
  // #e3c6a1, x 1900 #ecdab6; the far desk seen at 128.8–129.2 is #ebe2b9)
  const dg = g.createLinearGradient(-2600, 0, 5000, 0);
  const st = [[-2600, "#c9a78a"], [600, "#cba98c"], [1300, "#dcc09c"], [1700, "#e5cea8"], [2000, "#e6d0aa"], [2350, "#d6b692"], [5000, "#caa487"]];
  for (const [x, c] of st) dg.addColorStop((x + 2600) / 7600, c);
  g.save(); g.beginPath(); g.rect(B.x, B.y, B.w, yF - B.y); g.moveTo(-400, 647); g.lineTo(-400, 851); g.lineTo(-100, 763); g.lineTo(291, 647); g.closePath(); g.clip("evenodd");
  g.fillStyle = dg; g.fillRect(B.x, B.y, B.w, yF - B.y); g.restore();
  g.save(); poly(g, top); g.clip();
  // window-light shaft (soft) and a second fainter one to its right
  softShadow(g, [[20, 862], [180, 862], [420, 700], [330, 700]], "rgba(250,236,196,0.85)", 22);
  softShadow(g, [[1760, 700], [1900, 700], [1960, 648], [1850, 648]], "rgba(250,236,196,0.6)", 20);
  // the laptop's shadow falling forward-left of the base, notebook/mug shadows to the left
  softShadow(g, [[470, 780], [1600, 780], [1560, 812], [440, 812]], "rgba(150,90,75,0.45)", 7);
  softShadow(g, [[1630, 730], [1800, 800], [1800, 850], [1630, 790]], "rgba(140,85,70,0.3)", 10);
  softShadow(g, [[1560, 690], [1600, 690], [1600, 712], [1540, 712]], "rgba(140,85,70,0.3)", 8);
  g.restore();
  strokePoly(g, [[-400, 851], [-100, 763], [291, 647], [B.x + B.w, 647]], 2.2, INK, false);
  // front edge: a lit rounding then the darker face
  const fg = g.createLinearGradient(0, yF, 0, yF + 90);
  fg.addColorStop(0, "#bf9a84"); fg.addColorStop(0.15, "#b58c78"); fg.addColorStop(0.45, "#ab7f6f"); fg.addColorStop(1, "#9e7465");
  fillPoly(g, [[B.x, yF], [B.x + B.w, yF], [B.x + B.w, B.y + B.h], [B.x, B.y + B.h]], fg);
  line(g, [B.x, yF], [B.x + B.w, yF], 2.6);
  return { canvas: c, s };
}
