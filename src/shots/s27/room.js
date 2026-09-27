// s27 room paintings. Two views of the same sunny morning room, each painted in the frame coordinates of the source
// frame it was measured on (the source "orbits" with AI-style morphing, so the far wall and the props change between
// views; the swap happens behind the designer's head):
//   A = frame @119.6 (frontal: laptop centred, speakers on a low cabinet, three pots on the left shelf)
//   B = frame @125.0 (side view: shelves, boxes and books behind the mug, the window on the right) — extended to the
//       left for the pan at the end (a second window beyond the plant shelf).
// Wall and desk are painted separately (they move differently): wallA/deskA, wallB/deskB. Pre-grade colours.
import { canvas, path, spath, fill, stroke, shape, rect, rrect, ellipse, lin, rad, soft, clipped, leaf, speckle, mixHex, rgba, INKC } from "./paint.js";
import { rng } from "../../lib/rng.js";
import { ROOM_A_REGIONS, ROOM_A_INK } from "./roomA.js";
import { poly as dec } from "./codec.js";
import { ROOM_B_REGIONS, ROOM_B_INK } from "./roomB.js";
import { ROOM_C_REGIONS, ROOM_C_INK } from "./roomC.js";

export const C = {
  wall: "#e6e5d6", wallSh: "#d9d1c6", wallWarm: "#efe3d2",
  wood: "#c8a488", woodTop: "#d8b89c", woodSh: "#a8866f", woodLine: "#6e5446",
  potTerra: "#c49079", potTerraSh: "#a8735f", potWhite: "#ddd3c2", potWhiteSh: "#c4b8a6",
  leaf: "#98a07e", leafD: "#7c8466", leafL: "#b2b894",
  box: "#d6c2a6", boxTop: "#e2d2ba", boxSh: "#bfa98d", boxWhite: "#dcdcd0", boxWhiteSh: "#c8c8bb",
  book1: "#d9c4a8", book2: "#cdb79a", book3: "#c5c9c2", book4: "#e0cfb6",
  spk: "#b39079", spkSide: "#9c7b67", spkDark: "#5a4640", spkCone: "#e0b25a", spkConeL: "#f0cc7a",
  cab: "#d9b99a", cabTop: "#e3c6a8", cabSh: "#c4a283",
  glass: "#f2f2e8", frame: "#e6d9c8", frameSh: "#d6c5b2",
  desk: "#dcb793", deskL: "#ebcca6", deskSh: "#c89f7e", deskFront: "#b0826c", deskEdge: "#946a57",
};
const LW = 2.2;

// ---------- shared furniture pieces ----------
function board(g, x0, x1, yTop, yFront, yBot, bevel = 26) {
  // shelf plank seen slightly from below/front: thin top strip, front face
  shape(g, [[x0, yTop], [x1 - bevel, yTop], [x1, yFront], [x0, yFront]], C.woodTop, LW);
  shape(g, [[x0, yFront], [x1, yFront], [x1, yBot], [x0, yBot]], C.wood, LW);
}
function bracket(g, x, yTop, h, w, dir = -1) {
  // L bracket under a shelf: vertical plate on the wall + diagonal brace
  const pl = [[x, yTop], [x + 12, yTop], [x + 12, yTop + h], [x + 2, yTop + h + 4], [x, yTop + h]];
  shape(g, [[x + 12, yTop], [x + 12 + dir * -w, yTop], [x + 12 + dir * -w + dir * -4, yTop + 6], [x + 14, yTop + h * 0.8], [x + 12, yTop + h * 0.8]], C.woodSh, LW);
  shape(g, pl, C.wood, LW);
  ellipse(g, x + 7, yTop + h * 0.55, 1.8, 1.8, C.woodLine);
}
function castShadow(g, pts, blur = 10, a = 0.22, dx = -14, dy = 6) {
  soft(g, (h) => { h.translate(dx, dy); fill(h, pts, `rgba(120,96,86,${a})`); }, blur);
}
function pot(g, x0, x1, yTop, yBot, col, colSh, rimH = 12, taper = 8) {
  // flowerpot: rim band + tapered body
  const cx = (x0 + x1) / 2;
  shape(g, [[x0 + taper, yTop + rimH], [x1 - taper, yTop + rimH], [x1 - taper * 2, yBot], [x0 + taper * 2, yBot]], col, LW);
  clipped(g, [[x0 + taper, yTop + rimH], [x1 - taper, yTop + rimH], [x1 - taper * 2, yBot], [x0 + taper * 2, yBot]], (h) => {
    h.fillStyle = lin(h, x0, 0, x1, 0, [[0, rgba("#000000", 0.12)], [0.35, rgba("#ffffff", 0.0)], [0.8, rgba("#ffffff", 0.08)], [1, rgba("#000000", 0.05)]]);
    h.fillRect(x0, yTop, x1 - x0, yBot - yTop);
  });
  shape(g, [[x0, yTop], [x1, yTop], [x1 - 2, yTop + rimH], [x0 + 2, yTop + rimH]], col, LW);
  stroke(g, [[x0 + 3, yTop + rimH * 0.45], [x1 - 3, yTop + rimH * 0.45]], 1.2, rgba(INKC, 0.35));
  // saucer line
  stroke(g, [[x0 + taper * 2 - 4, yBot], [x1 - taper * 2 + 4, yBot]], LW);
}
// a leafy plant: fan of leaves from a base point
function plant(g, bx, by, leaves, seed, col = C.leaf, colD = C.leafD) {
  const R = rng(seed);
  for (const [ang, len, wid, dark] of leaves) {
    // stem
    const a = ang * Math.PI / 180;
    const sx = bx + Math.cos(a) * len * 0.35, sy = by + Math.sin(a) * len * 0.35;
    stroke(g, [[bx, by], [sx, sy]], 1.6, rgba(INKC, 0.8));
    leaf(g, sx, sy, a + (R() - 0.5) * 0.15, len * 0.75, wid, dark ? colD : col, 1.5);
  }
}
function smallLeafPlant(g, bx, by, w, h, seed) {
  // herb with many small rounded leaves (left pot)
  const R = rng(seed);
  for (let i = 0; i < 7; i++) {
    const ex = bx + (R() - 0.5) * w * 0.9, ey = by - h * (0.35 + R() * 0.65);
    stroke(g, [[bx + (R() - 0.5) * 10, by], [ (bx + ex) / 2 + (R() - 0.5) * 12, (by + ey) / 2], [ex, ey]], 1.4, rgba(INKC, 0.8), { smooth: true });
    for (let k = 0; k < 5; k++) {
      const u = 0.35 + k * 0.15, lx = bx + (ex - bx) * u, ly = by + (ey - by) * u;
      const side = k % 2 ? 1 : -1, a = Math.atan2(ey - by, ex - bx) + side * 1.0;
      leaf(g, lx, ly, a, 16 + R() * 8, 6 + R() * 2, R() < 0.3 ? C.leafD : C.leaf, 1.3, INKC, false);
    }
  }
}
function boxWithLid(g, x0, x1, yTop, yBot, lidH, col, colTop, colSh, bevel = 10) {
  shape(g, [[x0, yTop + lidH], [x1, yTop + lidH], [x1, yBot], [x0, yBot]], col, LW);
  shape(g, [[x0 - 3, yTop + lidH * 0.35], [x1 + 3, yTop + lidH * 0.35], [x1 + 3, yTop + lidH + 3], [x0 - 3, yTop + lidH + 3]], col, LW);
  shape(g, [[x0 + bevel - 3, yTop], [x1 + 3, yTop], [x1 + 3, yTop + lidH * 0.35], [x0 - 3, yTop + lidH * 0.35]], colTop, LW);
  // soft shade on the left face side
  clipped(g, [[x0, yTop + lidH], [x1, yTop + lidH], [x1, yBot], [x0, yBot]], (h) => {
    h.fillStyle = lin(h, x0, 0, x1, 0, [[0, rgba("#6a5448", 0.14)], [0.3, rgba("#6a5448", 0.0)]]); h.fillRect(x0, yTop, x1 - x0, yBot - yTop);
  });
}
function bookRow(g, books) {
  // books: [x0,x1,yTop,yBot,col,lean(px at top)]
  for (const [x0, x1, yT, yB, col, lean = 0] of books) {
    shape(g, [[x0 + lean, yT], [x1 + lean, yT], [x1, yB], [x0, yB]], col, LW);
    stroke(g, [[x0 + lean + (x1 - x0) * 0.5, yT + 8], [x0 + (x1 - x0) * 0.5, yB - 8]], 1, rgba(INKC, 0.25));
  }
}
function speaker(g, x0, x1, xs, yT, yB, cx, tweY, wooY) {
  // front face x0..x1, side face x1..xs
  shape(g, [[x1, yT], [xs, yT + 4], [xs, yB - 2], [x1, yB]], C.spkSide, LW);
  rrect(g, x0, yT, x1 - x0, yB - yT, 5, C.spk, LW);
  ellipse(g, cx, tweY, 17, 17, C.spkDark, LW); ellipse(g, cx, tweY, 9, 9, "#7a6258", 1.2); ellipse(g, cx, tweY, 3, 3, "#e8d9c8");
  ellipse(g, cx, wooY, 34, 34, C.spkDark, LW); ellipse(g, cx, wooY, 26, 26, C.spkCone, 1.4);
  g.save(); g.beginPath(); g.ellipse(cx, wooY, 26, 26, 0, 0, 7); g.clip();
  g.fillStyle = rad(g, cx + 8, wooY - 8, 26, [[0, C.spkConeL], [1, rgba(C.spkCone, 0)]]); g.fillRect(cx - 30, wooY - 30, 60, 60); g.restore();
  ellipse(g, cx, wooY, 10, 10, C.spkDark, 1.4);
  ellipse(g, x1 - 12, yB - 11, 4, 4, C.spkDark, 1.2);
}
function lowCabinet(g, x0, x1, yT, yF, yB) {
  shape(g, [[x0 + 8, yT], [x1, yT], [x1, yF], [x0, yF], [x0, yT + 4]], C.cabTop, LW);
  shape(g, [[x0, yF], [x1, yF], [x1, yB], [x0, yB]], C.cab, LW);
  stroke(g, [[x0 + 16, yF + 14], [x0 + 16, yB]], 1.4, rgba(INKC, 0.7));
  stroke(g, [[x1 - 16, yF + 14], [x1 - 16, yB]], 1.4, rgba(INKC, 0.7));
  stroke(g, [[x0 + 16, yF + 14], [x1 - 16, yF + 14]], 1.4, rgba(INKC, 0.7));
}
function pothos(g, pts, seed, n = 14) {
  // hanging vine with heart leaves along a polyline
  const R = rng(seed);
  stroke(g, pts, 1.6, rgba(INKC, 0.85), { smooth: true });
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1), k = Math.min(pts.length - 2, Math.floor(u * (pts.length - 1))), f = u * (pts.length - 1) - k;
    const x = pts[k][0] + (pts[k + 1][0] - pts[k][0]) * f, y = pts[k][1] + (pts[k + 1][1] - pts[k][1]) * f;
    const side = i % 2 ? 1 : -1, a = Math.PI / 2 + side * (0.6 + R() * 0.5);
    leaf(g, x, y, a, 20 + R() * 8, 8 + R() * 3, R() < 0.35 ? C.leafD : C.leaf, 1.4);
  }
}

// ---------- view A (frame @119.6) ----------
export const A_BOX = { x0: -240, y0: -120, x1: 2460, y1: 1000 };
export function paintWallA() {
  const B = A_BOX, c = canvas(B.x1 - B.x0, B.y1 - B.y0), g = c.getContext("2d");
  g.translate(-B.x0, -B.y0);
  // wall
  g.fillStyle = C.wall; g.fillRect(B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0);
  g.fillStyle = rad(g, 900, 250, 1300, [[0, rgba("#f3eee4", 0.7)], [1, rgba("#d8cfc2", 0.35)]]); g.fillRect(B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0);
  speckle(g, B.x0, B.y0, B.x1 - B.x0, 800, 9000, 11, "rgba(120,100,90,0.06)", 1.6);
  // side wall + window on the right (x > 1724)
  // the window (measured on the 119.6 s frame): nested frame lines at x 1725/1788/1825/1844/1862, glass 1869–2081
  // (top rail in perspective from (1844,119) to (2081,25)), a second sash from 2094, the handle at 2119–2169,
  // the glass bottom at y 512 and several ledges receding down to the right below it; a diagonal band of sun
  g.fillStyle = "#ebe3d6"; g.fillRect(1724, B.y0, B.x1 - 1724, 700);
  stroke(g, [[1724, B.y0], [1724, 546]], 1.6, rgba(INKC, 0.45));
  windowFrame(g, [1725, 1788, 1825, 1844, 1862], [[1869, 2081], [2156, 2460]], 25, 512, [[1844, 119], [2081, 25]], [2094, 2156]);
  rrect(g, 2119, 40, 22, 100, 9, C.frame, 1.3, rgba(INKC, 0.45)); rrect(g, 2143, 34, 22, 112, 9, C.frame, 1.3, rgba(INKC, 0.45));
  ledges(g, 1724, 2460, [[525, 556], [540, 590], [556, 625], [600, 680]]);
  sunBand(g, [[1760, 300], [1960, 40], [2060, 40], [1860, 300]], 0.35);
  // the window's sill and the desk's back edge receding to the right, and a warm haze of sunlight over that side
  stroke(g, [[1724, 546], [2460, 640]], 1.5, rgba(INKC, 0.45)); stroke(g, [[1724, 560], [2460, 668]], 1.2, rgba(INKC, 0.35));
  stroke(g, [[1760, 640], [2460, 760]], 1.3, rgba(INKC, 0.35));
  soft(g, (h) => { h.fillStyle = rad(h, 1950, 380, 700, [[0, "rgba(255,238,215,0.55)"], [0.6, "rgba(250,222,200,0.25)"], [1, "rgba(250,222,200,0)"]]); h.fillRect(1100, -120, 1360, 1000); }, 4);
  // shelves left
  castShadow(g, [[-10, 187], [642, 187], [642, 215], [-10, 215]], 12, 0.25, -10, 12);
  board(g, -20, 642, 187, 200, 215, 30);
  bracket(g, 330, 215, 60, 22); bracket(g, 585, 215, 60, 22); bracket(g, 6, 215, 60, 14);
  // box + stacked flat box on the left end
  castShadow(g, [[-10, 95], [110, 95], [110, 187], [-10, 187]], 14, 0.25);
  boxWithLid(g, -12, 108, 112, 187, 18, C.box, C.boxTop, C.boxSh, 12);
  rect(g, -8, 93, 104, 20, C.boxWhite, LW);
  // pots and plants
  castShadow(g, [[120, 60], [205, 60], [205, 187], [120, 187]], 16, 0.2);
  castShadow(g, [[250, 20], [335, 20], [335, 187], [250, 187]], 16, 0.2);
  castShadow(g, [[430, 20], [515, 20], [515, 187], [430, 187]], 16, 0.2);
  smallLeafPlant(g, 162, 110, 130, 95, 5);
  pot(g, 118, 208, 107, 186, C.potTerra, C.potTerraSh, 14, 5);
  plant(g, 292, 112, [[-150, 70, 16, 0], [-120, 90, 18, 1], [-95, 110, 18, 0], [-70, 100, 17, 1], [-45, 85, 16, 0], [-25, 70, 14, 1], [-160, 55, 13, 1], [-80, 60, 13, 0]], 21);
  pot(g, 248, 338, 112, 186, C.potWhite, C.potWhiteSh, 16, 5);
  plant(g, 472, 115, [[-155, 72, 16, 1], [-130, 95, 18, 0], [-100, 115, 19, 1], [-78, 105, 18, 0], [-55, 90, 17, 1], [-30, 78, 15, 0], [-10, 60, 13, 1]], 22);
  pot(g, 428, 518, 115, 186, C.potWhite, C.potWhiteSh, 16, 5);
  // right shelf unit
  castShadow(g, [[1165, 27], [1607, 27], [1607, 65], [1165, 65]], 12, 0.22, -12, 10);
  castShadow(g, [[1165, 190], [1607, 190], [1607, 205], [1165, 205]], 12, 0.22, -12, 10);
  bookRow(g, [[1446, 1470, -40, 25, C.book2, 0], [1490, 1520, -40, 25, C.book1, 0], [1520, 1560, -40, 25, C.book3, 0], [1560, 1585, -40, 25, C.book4, 0]]);
  board(g, 1150, 1607, 25, 35, 65, 28);
  bracket(g, 1523, 65, 26, 20);
  castShadow(g, [[1250, 90], [1425, 90], [1425, 190], [1250, 190]], 14, 0.22);
  boxWithLid(g, 1252, 1424, 133, 190, 18, C.boxWhite, "#e6e6dc", C.boxWhiteSh, 12);
  boxWithLid(g, 1274, 1401, 91, 133, 15, C.boxWhite, "#e6e6dc", C.boxWhiteSh, 12);
  castShadow(g, [[1450, 75], [1595, 75], [1595, 190], [1450, 190]], 14, 0.2);
  bookRow(g, [[1452, 1468, 88, 190, C.book4, 34], [1470, 1490, 80, 190, C.book1, 22], [1505, 1522, 76, 190, C.book2, 0], [1522, 1546, 84, 190, C.book3, 0], [1548, 1596, 78, 190, C.book4, 0]]);
  board(g, 1150, 1607, 188, 196, 206, 26);
  bracket(g, 1525, 206, 72, 18);
  pothos(g, [[1195, 60], [1178, 100], [1160, 145], [1150, 175]], 31, 9);
  pothos(g, [[1225, 60], [1230, 110], [1215, 160], [1205, 200]], 32, 9);
  pothos(g, [[1255, 60], [1265, 90], [1260, 130]], 33, 5);
  // books standing right of the screen (on the low cabinet)
  castShadow(g, [[1482, 380], [1615, 380], [1615, 550], [1482, 550]], 16, 0.2);
  bookRow(g, [[1478, 1500, 395, 552, C.book4, 18], [1502, 1540, 392, 552, C.book1, 0], [1540, 1570, 388, 552, C.book2, 0], [1570, 1606, 380, 552, C.book4, 0]]);
  // low cabinet behind the laptop (speakers stand on it)
  castShadow(g, [[398, 548], [1620, 548], [1620, 648], [398, 648]], 16, 0.25, -16, 4);
  lowCabinet(g, 398, 1625, 548, 560, 648);
  // speakers
  castShadow(g, [[462, 425], [656, 425], [656, 552], [462, 552]], 18, 0.35, -22, 8);
  speaker(g, 462, 542, 552, 425, 552, 502, 451, 505);
  speaker(g, 554, 636, 656, 425, 552, 594, 451, 505);
  return c;
}
export function paintDeskA() {
  const B = A_BOX, c = canvas(B.x1 - B.x0, B.y1 - B.y0), g = c.getContext("2d");
  g.translate(-B.x0, -B.y0);
  // desk top: from the back edge (y 647) to the front edge (y 872); left end recedes to (0,739)
  const top = [[287, 647], [2460, 647], [2460, 872], [-240, 872], [-240, 800]];
  shape(g, top, C.desk, 0);
  clipped(g, top, (h) => {
    h.fillStyle = lin(h, 0, 647, 0, 872, [[0, rgba("#c8a07e", 0.45)], [0.35, rgba("#e2c19c", 0.0)], [0.75, rgba("#c09272", 0.25)], [1, rgba("#b88a68", 0.45)]]); h.fillRect(-240, 640, 2700, 240);
    // sunlight falling through the window: bright slanted patches
    soft(h, (k) => { fill(k, [[-40, 700], [560, 650], [700, 650], [260, 872], [-40, 872]], rgba(C.deskL, 0.9)); }, 6);
    soft(h, (k) => { fill(k, [[880, 800], [1150, 800], [1080, 872], [780, 872]], rgba(C.deskL, 0.7)); }, 8);
    speckle(h, -240, 640, 2700, 240, 5000, 13, "rgba(110,80,60,0.06)", 1.6);
  });
  stroke(g, [[287, 647], [-240, 820]], LW);
  stroke(g, [[287, 647], [2460, 647]], 1.6, rgba(INKC, 0.6));
  // front face
  shape(g, [[-240, 872], [2460, 872], [2460, 1000], [-240, 1000]], C.deskFront, 0);
  g.fillStyle = lin(g, 0, 872, 0, 946, [[0, rgba("#8f6250", 0.6)], [0.25, rgba("#8f6250", 0)]]); g.fillRect(-240, 872, 2700, 128);
  stroke(g, [[-240, 873], [2460, 873]], 2.6, C.deskEdge);
  return c;
}

// ---------- view B (frame @125.0): the room seen from the side, window on the right ----------
export const B_BOX = { x0: -1250, y0: -120, x1: 2460, y1: 1000 };
function sunBeams(g, x0, y0, x1, y1, beams, a = 0.18) {
  for (const [bx, w, ang] of beams) {
    soft(g, (h) => {
      h.fillStyle = `rgba(255,246,224,${a})`;
      const dx = Math.tan(ang) * (y1 - y0);
      h.beginPath(); h.moveTo(bx, y0); h.lineTo(bx + w, y0); h.lineTo(bx + w - dx, y1); h.lineTo(bx - dx, y1); h.closePath(); h.fill();
    }, 14);
  }
}
function windowPanes(g, x0, x1, y0, y1, bars, col = C.glass) {
  g.fillStyle = col; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.fillStyle = rad(g, (x0 + x1) / 2, y0 + (y1 - y0) * 0.35, (x1 - x0) * 0.7, [[0, "rgba(255,255,250,0.9)"], [1, "rgba(240,242,232,0)"]]); g.fillRect(x0, y0, x1 - x0, y1 - y0);
  for (const [bx, bw] of bars) shape(g, [[bx, y0], [bx + bw, y0], [bx + bw, y1], [bx, y1]], C.frame, 1.3, rgba(INKC, 0.45));
}
// window with nested frame lines (xs: vertical frame lines, left to right), glass panes [x0,x1], a sash rail from p to q
function windowFrame(g, xs, panes, yTop, yBot, rail, mullion) {
  const x0 = xs[0];
  g.fillStyle = C.frame; g.fillRect(x0, yTop - 200, 2460 - x0, yBot - yTop + 240);
  for (const [a, b] of panes) {
    g.fillStyle = lin(g, a, yTop, b, yBot, [[0, "#eef1e6"], [0.5, "#f3f4ec"], [1, "#e8ebdf"]]); g.fillRect(a, yTop, b - a, yBot - yTop);
    stroke(g, [[a, yTop], [a, yBot], [b, yBot], [b, yTop]], 1.4, rgba(INKC, 0.45));
    stroke(g, [[a - 6, yTop], [a - 6, yBot + 6], [b + 6, yBot + 6]], 1.0, rgba(INKC, 0.3));
  }
  for (const x of xs) stroke(g, [[x, yTop - 200], [x, yBot + 30]], x === x0 ? 1.6 : 1.1, rgba(INKC, x === x0 ? 0.5 : 0.32));
  if (mullion) { g.fillStyle = C.frame; g.fillRect(mullion[0], yTop, mullion[1] - mullion[0], yBot - yTop); stroke(g, [[mullion[0] + 8, yTop], [mullion[0] + 8, yBot]], 1.0, rgba(INKC, 0.3)); stroke(g, [[mullion[1] - 8, yTop], [mullion[1] - 8, yBot]], 1.0, rgba(INKC, 0.3)); }
  const [p, q] = rail, t = 14;
  shape(g, [[p[0], p[1]], [q[0], q[1]], [q[0], q[1] + t], [p[0], p[1] + t * 1.3]], C.frame, 1.2, rgba(INKC, 0.4));
}
function ledges(g, x0, x1, ys) {
  for (let i = 0; i < ys.length; i++) {
    const [a, b] = ys[i], [c, d] = ys[i + 1] || [a + 60, b + 60];
    shape(g, [[x0, a], [x1, b], [x1, d], [x0, c]], i % 2 ? "#e2d6c6" : "#ece2d4", 1.1, rgba(INKC, 0.38));
  }
}
function sunBand(g, quad, a) { soft(g, (h) => { h.fillStyle = `rgba(255,250,236,${a})`; h.beginPath(); path(h, quad); h.fill(); }, 10); }
export function paintRoomB() {
  const B = B_BOX, c = canvas(B.x1 - B.x0, B.y1 - B.y0), g = c.getContext("2d");
  g.translate(-B.x0, -B.y0);
  // wall: cool light grey to the left, warm near the window
  g.fillStyle = lin(g, B.x0, 0, B.x1, 0, [[0, "#e6e6d6"], [0.45, "#e7e6d6"], [0.72, "#dcd0bf"], [1, "#ece8da"]]);
  g.fillRect(B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0);
  speckle(g, B.x0, B.y0, B.x1 - B.x0, 760, 12000, 17, "rgba(120,100,90,0.06)", 1.6);
  // far left (seen at the end of the move): a tall window with three mullions and warm light
  windowPanes(g, -900, -180, -120, 560, [[-900, 18], [-835, 16], [-585, 22], [-300, 26], [-196, 16]]);
  rrect(g, -560, 120, 14, 50, 5, C.frame, 1.2, rgba(INKC, 0.4));
  shape(g, [[-980, 470], [-700, 470], [-700, 486], [-980, 486]], C.woodTop, 1.4);
  // left shelf with a box and two potted plants
  castShadow(g, [[-10, 200], [390, 200], [390, 214], [-10, 214]], 12, 0.25, -10, 12);
  board(g, -30, 392, 199, 203, 214, 12);
  bracket(g, 6, 214, 62, 12); bracket(g, 318, 214, 50, 18);
  castShadow(g, [[-20, 90], [100, 90], [100, 199], [-20, 199]], 14, 0.22);
  boxWithLid(g, -24, 98, 118, 199, 16, C.box, C.boxTop, C.boxSh, 10);
  rect(g, -20, 94, 106, 22, C.boxWhite, LW);
  castShadow(g, [[118, 60], [205, 60], [205, 199], [118, 199]], 16, 0.2);
  smallLeafPlant(g, 160, 108, 120, 92, 7);
  pot(g, 116, 206, 104, 196, C.potTerra, C.potTerraSh, 16, 5);
  castShadow(g, [[247, 40], [330, 40], [330, 199], [247, 199]], 16, 0.2);
  plant(g, 288, 112, [[-150, 64, 14, 0], [-128, 84, 17, 1], [-104, 100, 18, 0], [-80, 104, 18, 1], [-58, 92, 17, 0], [-36, 82, 16, 1], [-18, 62, 13, 0]], 23);
  pot(g, 245, 332, 110, 196, C.potWhite, C.potWhiteSh, 16, 5);
  // speakers on a low cabinet (hidden behind him until the very end)
  lowCabinet(g, 60, 560, 505, 515, 620);
  speaker(g, 140, 220, 232, 390, 505, 180, 416, 465);
  speaker(g, 236, 316, 330, 390, 505, 276, 416, 465);
  // right shelves: pothos at the top, boxes and books below
  castShadow(g, [[930, 30], [1370, 30], [1370, 45], [930, 45]], 10, 0.22, -10, 10);
  board(g, 900, 1372, 28, 32, 45, 10);
  bracket(g, 1244, 45, 40, 16);
  pothos(g, [[945, 30], [936, 80], [948, 140], [962, 196]], 41, 11);
  pothos(g, [[975, 30], [990, 90], [985, 150]], 42, 7);
  castShadow(g, [[1020, 95], [1180, 95], [1180, 192], [1020, 192]], 14, 0.2);
  boxWithLid(g, 1022, 1176, 134, 192, 16, C.boxWhite, "#e6e6dc", C.boxWhiteSh, 10);
  boxWithLid(g, 1032, 1168, 96, 134, 14, C.boxWhite, "#e6e6dc", C.boxWhiteSh, 10);
  bookRow(g, [[1210, 1232, 96, 192, C.book4, 30], [1240, 1266, 86, 192, C.book1, 12], [1276, 1300, 82, 192, C.book2, 0], [1302, 1330, 90, 192, C.book3, 0], [1330, 1352, 96, 192, C.book4, 0]]);
  castShadow(g, [[1020, 190], [1372, 190], [1372, 208], [1020, 208]], 10, 0.22, -10, 10);
  board(g, 1000, 1372, 190, 194, 208, 10);
  bracket(g, 1268, 208, 62, 18);
  // sunlit strip of wall between the shelves and the window
  soft(g, (h) => { h.fillStyle = "rgba(252,250,240,0.8)"; h.fillRect(1440, -120, 120, 700); }, 10);
  // lower cabinet with boxes and folders behind the mug
  castShadow(g, [[1030, 440], [1200, 440], [1200, 540], [1030, 540]], 14, 0.2);
  boxWithLid(g, 1032, 1200, 480, 540, 14, C.boxWhite, "#e6e6dc", C.boxWhiteSh, 8);
  boxWithLid(g, 1044, 1190, 442, 480, 12, C.boxWhite, "#e6e6dc", C.boxWhiteSh, 8);
  bookRow(g, [[1232, 1262, 400, 540, C.book4, 16], [1268, 1300, 395, 540, C.book1, 0], [1300, 1330, 398, 540, C.book2, 0], [1330, 1362, 404, 540, C.book3, 0]]);
  shape(g, [[980, 530], [1640, 530], [1640, 545], [980, 545]], C.cabTop, LW);
  shape(g, [[980, 545], [1640, 545], [1640, 640], [980, 640]], C.cab, LW);
  stroke(g, [[1100, 545], [1100, 640]], 1.4, rgba(INKC, 0.6)); stroke(g, [[1320, 545], [1320, 640]], 1.4, rgba(INKC, 0.6));
  // window on the right: jamb, sash, handle, sill, and the bright glass
  // measured on the 125.0 s frame: frame lines at 1551/1590/1609, glass 1609–1887 and 2001–2460, mullion 1887–2001,
  // top rail from (1609,114) to (1887,0), handle 1880–1950, glass bottom 514, ledges 543–629
  g.fillStyle = "#ebe3d6"; g.fillRect(1545, -120, 915, 760);
  windowFrame(g, [1551, 1575, 1590, 1609], [[1609, 1887], [2001, 2460]], -120, 514, [[1609, 114], [1887, 0]], [1887, 2001]);
  rrect(g, 1880, 12, 24, 96, 9, C.frame, 1.3, rgba(INKC, 0.45)); rrect(g, 1906, 6, 24, 104, 9, C.frame, 1.3, rgba(INKC, 0.45));
  ledges(g, 1545, 2460, [[530, 556], [543, 585], [570, 620], [600, 660]]);
  sunBand(g, [[1560, 330], [1800, 0], [1880, 0], [1640, 330]], 0.3);
  // light beams through the window, falling to the left
  sunBeams(g, -120, -120, 2460, 900, [[1700, 90, 0.55], [1860, 60, 0.55], [2020, 110, 0.55], [2300, 80, 0.55]], 0.22);
  // desk (top from the back edge ~y 640 to the bottom of the frame), warm wood with sun patches
  const top = [[-1250, 700], [2460, 640], [2460, 1000], [-1250, 1000]];
  shape(g, top, "#c9a27f", 0);
  clipped(g, top, (h) => {
    h.fillStyle = lin(h, 0, 640, 0, 1000, [[0, "rgba(214,178,140,0.9)"], [0.35, "rgba(198,160,124,0)"], [0.65, "rgba(168,124,90,0.45)"], [1, "rgba(150,104,72,0.75)"]]); h.fillRect(-1250, 620, 3710, 400);
    soft(h, (k) => {
      k.fillStyle = "rgba(236,214,178,0.85)";
      for (const q of [[[1350, 660], [1600, 650], [1340, 1000], [1060, 1000]], [[1700, 650], [2000, 645], [1760, 1000], [1450, 1000]], [[2100, 645], [2460, 640], [2460, 1000], [1880, 1000]]]) { k.beginPath(); path(k, q); k.fill(); }
    }, 10);
    speckle(h, -1250, 620, 3710, 400, 7000, 19, "rgba(110,80,60,0.07)", 1.6);
  });
  stroke(g, [[-1250, 700], [2460, 640]], 1.6, rgba(INKC, 0.55));
  return c;
}

// ---------- view C (frame @129.28): from behind the laptop, the window to the far left ----------
export const C_BOX = { x0: -120, y0: -120, x1: 2800, y1: 1070 };
export function paintRoomC() {
  const B = C_BOX, c = canvas(B.x1 - B.x0, B.y1 - B.y0), g = c.getContext("2d");
  g.translate(-B.x0, -B.y0);
  g.fillStyle = lin(g, B.x0, 0, B.x1, 0, [[0, "#e6bda3"], [0.12, "#ede4d5"], [0.3, "#f4eada"], [0.55, "#f8eede"], [0.85, "#f2eadb"], [1, "#e7e0d0"]]);
  g.fillRect(B.x0, B.y0, B.x1 - B.x0, B.y1 - B.y0);
  speckle(g, B.x0, B.y0, B.x1 - B.x0, 700, 10000, 23, "rgba(120,100,90,0.06)", 1.6);
  // window at the left: frames at x 200–250, 440–470, 700–760; handle; warm beams
  windowPanes(g, -120, 780, -120, 560, [[196, 14], [226, 22], [438, 30], [700, 22], [744, 16]], "#f4ecdc");
  soft(g, (h) => { h.fillStyle = rad(h, 60, 260, 520, [[0, "rgba(236,176,140,0.55)"], [1, "rgba(236,176,140,0)"]]); h.fillRect(-120, -120, 900, 900); }, 6);
  rrect(g, 458, 128, 14, 54, 5, C.frame, 1.2, rgba(INKC, 0.4));
  sunBeams(g, -120, -120, 900, 900, [[60, 90, -0.5], [260, 60, -0.5], [420, 120, -0.5]], 0.25);
  // ledge with a plant in a white pot; yellow cabinet below
  shape(g, [[-120, 506], [170, 506], [170, 522], [-120, 522]], C.woodTop, 1.4);
  shape(g, [[-120, 522], [64, 522], [64, 830], [-120, 830]], "#e8d49a", 1.4);
  plant(g, 95, 440, [[-150, 60, 10, 0], [-125, 80, 12, 1], [-100, 95, 12, 0], [-80, 100, 12, 1], [-60, 88, 11, 0], [-38, 76, 11, 1], [-20, 58, 10, 0]], 29);
  pot(g, 50, 140, 438, 506, C.potWhite, C.potWhiteSh, 14, 4);
  // top shelf with plants (centre)
  board(g, 850, 1330, 190, 194, 205, 10);
  bracket(g, 1255, 205, 36, 16);
  smallLeafPlant(g, 1098, 118, 100, 80, 9);
  pot(g, 1062, 1136, 112, 188, C.potTerra, C.potTerraSh, 12, 4);
  plant(g, 1220, 116, [[-150, 56, 12, 0], [-125, 72, 14, 1], [-100, 88, 15, 0], [-78, 90, 15, 1], [-55, 80, 14, 0], [-32, 70, 13, 1]], 31);
  pot(g, 1180, 1262, 112, 188, C.potWhite, C.potWhiteSh, 14, 4);
  // right shelf: pothos, two boxes, books
  pothos(g, [[1770, 0], [1762, 50], [1780, 110]], 43, 7);
  boxWithLid(g, 1862, 2030, 88, 180, 14, C.boxWhite, "#e6e6dc", C.boxWhiteSh, 8);
  boxWithLid(g, 1880, 2012, 40, 88, 12, C.boxWhite, "#e6e6dc", C.boxWhiteSh, 8);
  bookRow(g, [[2100, 2130, 20, 180, C.book4, 10], [2134, 2170, 16, 180, C.book1, 0], [2170, 2206, 22, 180, C.book2, 0]]);
  board(g, 1720, 2360, 180, 184, 196, 10);
  bracket(g, 1812, 196, 54, 18);
  // lower: speaker behind the laptop, boxes and books on the cabinet
  speaker(g, 1175, 1252, 1262, 420, 545, 1214, 446, 505);
  boxWithLid(g, 1832, 2030, 494, 546, 12, C.boxWhite, "#e6e6dc", C.boxWhiteSh, 8);
  boxWithLid(g, 1842, 2012, 440, 494, 12, C.boxWhite, "#e6e6dc", C.boxWhiteSh, 8);
  bookRow(g, [[2050, 2090, 420, 548, C.book4, 30], [2100, 2140, 410, 548, C.book1, 0], [2144, 2206, 414, 548, C.book2, 0], [2206, 2260, 416, 548, C.book3, 0]]);
  shape(g, [[1480, 546], [2800, 546], [2800, 562], [1480, 562]], C.cabTop, LW);
  shape(g, [[1480, 562], [2800, 562], [2800, 640], [1480, 640]], C.cab, LW);
  // beyond the right edge (seen while the camera still turns): the window on the right wall
  windowPanes(g, 2380, 2800, -120, 520, [[2380, 20], [2600, 18]]);
  // the chair behind him
  shape(g, [[70, 600], [150, 585], [260, 590], [250, 830], [80, 840]], "#8a5a44", 2.2);
  // desk
  const top = [[-120, 830], [1480, 640], [2800, 615], [2800, 700], [2330, 700], [1900, 1070], [-120, 1070]];
  shape(g, top, "#e2c4a0", 0);
  clipped(g, top, (h) => {
    h.fillStyle = lin(h, -120, 0, 2330, 0, [[0, "rgba(170,120,95,0.75)"], [0.3, "rgba(200,160,125,0.3)"], [0.55, "rgba(238,216,174,0.4)"], [1, "rgba(225,196,163,0.2)"]]); h.fillRect(-120, 600, 2920, 470);
    speckle(h, -120, 600, 2450, 470, 5000, 29, "rgba(110,80,60,0.07)", 1.6);
  });
  stroke(g, [[-120, 830], [1480, 640], [2330, 620]], 1.6, rgba(INKC, 0.55));
  shape(g, [[2330, 700], [1900, 1070], [2330, 1070]], "#a67c62", 1.8);
  return c;
}

// ---------- traced views: flat colour regions + ink lines measured on the source (room_vec.py), drawn with paths ----------
// Frame px x2. Painted on top of the hand-painted view, which only shows where the trace has holes (behind the objects).
export function paintTrace(REG, INK, B, { blur = 0 } = {}) {
  const c = canvas(B.x1 - B.x0, B.y1 - B.y0), g = c.getContext("2d");
  const poly = (h, p) => { const a = dec(p); h.moveTo(a[0] / 2, a[1] / 2); for (let i = 2; i < a.length; i += 2) h.lineTo(a[i] / 2, a[i + 1] / 2); h.closePath(); };
  let tgt = g, tmp = null;
  if (blur) { tmp = canvas(c.width, c.height); tgt = tmp.getContext("2d"); }
  tgt.save(); tgt.translate(-B.x0, -B.y0); tgt.lineJoin = "round";
  for (const r of REG) {
    tgt.beginPath(); poly(tgt, r[1]); for (let k = 2; k < r.length; k++) poly(tgt, r[k]);
    tgt.fillStyle = r[0]; tgt.fill("evenodd"); tgt.lineWidth = 1.2; tgt.strokeStyle = r[0]; tgt.stroke();
  }
  tgt.restore();
  if (blur) { g.filter = `blur(${blur}px)`; g.drawImage(tmp, 0, 0); g.filter = "none"; }
  g.save(); g.translate(-B.x0, -B.y0);
  for (const grp of INK) {
    g.beginPath(); for (let k = 1; k < grp.length; k++) for (const p of grp[k]) poly(g, p);
    g.fillStyle = grp[0]; g.fill("evenodd");
  }
  g.restore();
  return c;
}
export const KEY_BOX = { x0: -8, y0: -8, x1: 2214, y1: 954 };
export const paintTraceA = () => paintTrace(ROOM_A_REGIONS, ROOM_A_INK, A_BOX);
export const paintTraceB = () => paintTrace(ROOM_B_REGIONS, ROOM_B_INK, B_BOX);
export const paintTraceC = () => paintTrace(ROOM_C_REGIONS, ROOM_C_INK, C_BOX);
