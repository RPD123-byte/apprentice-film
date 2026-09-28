// s28 locked view: the room as seen from the locked camera (131.36-136.00), drawn in locked-frame px.
// Positions read off gridded source frames (snapshots/s28d-study) and colours sampled from the ungraded estimate of
// the source (pre-grade values). Painted once and cached; the orbit re-projects it per plane (BACK / RIGHT / DESK).
import { canvas, shape, poly, rect, ink, line, hatch, lin, rad, vlines, speckle, trace } from "./kit.js";
import { rng } from "../../../lib/rng.js";

const INK = "#3a2320", INK2 = "rgba(58,35,32,0.55)", INK3 = "rgba(58,35,32,0.3)";
export const CORNER_X = 1612;          // BACK | RIGHT wall corner in the locked view (projected world corner line)

function leaf(g, x, y, len, wid, ang, col, edge = INK, curl = 0.15) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const P = (u, v) => [x + c * u - s * v, y + s * u + c * v];
  const pts = [P(0, 0), P(len * 0.3, -wid * 0.55), P(len * 0.7, -wid * 0.45 + curl * len * 0.2), P(len, curl * len * 0.3), P(len * 0.65, wid * 0.4 + curl * len * 0.2), P(len * 0.3, wid * 0.5)];
  shape(g, pts, col);
  ink(g, [...pts, pts[0]], 1.4, edge, { taper: 0.5 });
  ink(g, [P(len * 0.05, 0), P(len * 0.5, curl * len * 0.1), P(len * 0.85, curl * len * 0.25)], 0.9, "rgba(40,50,25,0.7)");
}
function plant(g, seed, cx, cy, n, spread, lenR, cols) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * spread;
    const L = lenR[0] + r() * (lenR[1] - lenR[0]);
    const x = cx + (r() - 0.5) * 16, y = cy + (r() - 0.5) * 8;
    const col = cols[Math.floor(r() * cols.length)];
    ink(g, [[cx, cy + 10], [x + Math.cos(a) * L * 0.3, y + Math.sin(a) * L * 0.3]], 1.6, "#4a5a30");
    leaf(g, x + Math.cos(a) * L * 0.25, y + Math.sin(a) * L * 0.25, L * 0.75, L * 0.3, a + (r() - 0.5) * 0.4, col, INK, (r() - 0.5) * 0.6);
  }
}

// ------------------------------------------------------------------ BACK wall (x < CORNER_X)
function backWall(g) {
  // cream wall; the sun lays a yellow patch on the upper left and a peach band beside it (measured zones, ~20 deg edges)
  rect(g, 380, 0, 1240, 946, "#eceacf");
  g.fillStyle = lin(g, 1250, 0, 1612, 300, [[0, "rgba(236,232,206,0)"], [1, "rgba(234,220,186,1)"]]); g.fillRect(1250, 0, 362, 946);
  g.save(); g.filter = "blur(5px)";
  poly(g, [[380, -20], [930, -20], [930, 138], [875, 160], [825, 180], [725, 205], [675, 232], [600, 262], [380, 330]], "#e7d6a9");
  poly(g, [[930, -20], [1262, -20], [1240, 5], [1175, 30], [1110, 58], [1040, 90], [980, 118], [930, 140]], "#ebcbab");
  g.restore();
  // wall panel seams
  for (const x of [897, 928, 1232]) line(g, [[x, 0], [x, 340]], 1.2, "rgba(90,55,45,0.5)");
  line(g, [[575, 0], [575, 110]], 1, "rgba(70,45,35,0.35)");
  // mesh board top-left of the plants (cross-hatch)
  g.save(); g.beginPath(); g.rect(392, 0, 80, 150); g.clip();
  for (let x = 392; x < 472; x += 9) line(g, [[x, 0], [x, 150]], 1.1, "rgba(70,40,35,0.5)");
  for (let y = 4; y < 150; y += 11) line(g, [[392, y], [472, y]], 1, "rgba(70,40,35,0.45)");
  g.restore();
}
function bookshelf(g) {
  // carcass
  rect(g, 0, 0, 392, 946, "#d8b590");
  // compartments: back panel hatched dark
  const comp = [[0, 0, 300, 100], [0, 122, 300, 178], [0, 322, 300, 70]];
  for (const [x, y, w, h] of comp) {
    rect(g, x, y, w, h, "#b98f70");
    vlines(g, x + 2, x + w - 2, y, y + h, { sp: 5, w: 1.3, color: "rgba(80,40,30,0.75)", seed: 11 + y });
  }
  // under-shelf shadows
  rect(g, 0, 122, 300, 26, "#140b08"); rect(g, 0, 322, 300, 26, "#6a4a40");
  // shelf boards
  for (const y of [100, 300, 390]) {
    rect(g, 0, y, 305, 22, "#e2c39e");
    line(g, [[0, y], [305, y]], 1.6, INK); line(g, [[0, y + 22], [305, y + 22]], 1.4, INK);
  }
  // top: books + white box
  rect(g, 0, 0, 32, 100, "#cc7a97"); rect(g, 26, 0, 24, 100, "#8a5a78"); rect(g, 50, 0, 32, 100, "#77707e"); rect(g, 82, 0, 56, 100, "#6f8f78");
  line(g, [[33, 0], [33, 100]], 1.4, INK); line(g, [[92, 0], [92, 100]], 1.4, INK); line(g, [[136, 0], [136, 100]], 1.4, INK);
  rect(g, 44, 84, 12, 12, "rgba(40,20,30,0.25)"); line(g, [[44, 84], [56, 84], [56, 96], [44, 96], [44, 84]], 1, INK);
  rect(g, 140, 44, 150, 56, "#e3d8bd"); rect(g, 138, 12, 156, 34, "#ece2c8");
  line(g, [[138, 12], [294, 12], [294, 46], [138, 46], [138, 12]], 1.5, INK); line(g, [[142, 46], [142, 100]], 1.4, INK); line(g, [[288, 46], [288, 100]], 1.4, INK);
  // middle: yellow file boxes, jars
  poly(g, [[0, 158], [118, 150], [135, 168], [135, 300], [0, 300]], "#e4c070");
  poly(g, [[0, 150], [115, 145], [138, 166], [0, 172]], "#c9a45a");
  hatch(g, [[0, 150], [115, 145], [138, 166], [0, 172]], { angle: 0.25, sp: 4, w: 0.9, color: "rgba(70,45,20,0.6)", seed: 21, smooth: false });
  shape(g, [[14, 182], [60, 182], [62, 192], [58, 200], [14, 200], [10, 192]], "#3a2616", { smooth: false });
  poly(g, [[135, 172], [198, 172], [200, 300], [135, 300]], "#dab463");
  line(g, [[135, 168], [135, 300]], 1.5, INK); line(g, [[200, 172], [200, 300]], 1.4, INK);
  line(g, [[142, 184], [156, 184], [156, 200], [142, 200], [142, 184]], 1.1, INK);
  vlines(g, 160, 196, 180, 298, { sp: 6, w: 0.8, color: "rgba(90,60,20,0.35)", seed: 5 });
  // jars
  const jar = (x0, x1, y0, y1, col, lid) => {
    shape(g, [[x0 + 4, y0 + 18], [x1 - 4, y0 + 18], [x1, y0 + 30], [x1, y1 - 4], [x1 - 6, y1], [x0 + 6, y1], [x0, y1 - 4], [x0, y0 + 30]], col);
    shape(g, [[x0 + 2, y0], [x1 - 2, y0], [x1, y0 + 12], [x1 - 2, y0 + 20], [x0 + 2, y0 + 20], [x0, y0 + 12]], lid);
    ink(g, [[x0 + 2, y0], [x1 - 2, y0], [x1, y0 + 12], [x1 - 2, y0 + 20], [x0 + 2, y0 + 20], [x0, y0 + 12], [x0 + 2, y0]], 1.3, INK, { smooth: false });
    ink(g, [[x0, y0 + 30], [x0, y1 - 4], [x0 + 6, y1], [x1 - 6, y1], [x1, y1 - 4], [x1, y0 + 30]], 1.3, INK, { smooth: false });
    line(g, [[x0 + 8, y0 + 40], [x0 + 8, y1 - 16]], 1, "rgba(60,30,20,0.45)");
  };
  jar(220, 262, 192, 298, "#dca077", "#c76d82");
  jar(260, 300, 214, 300, "#d99773", "#c76d82");
  // lower: teal books lying, pink box
  poly(g, [[0, 352], [104, 350], [110, 360], [110, 388], [0, 388]], "#8cb99f");
  line(g, [[0, 366], [110, 366]], 1, "rgba(40,60,50,0.6)"); line(g, [[0, 352], [104, 350], [110, 360], [110, 388]], 1.3, INK);
  poly(g, [[116, 348], [290, 348], [290, 390], [116, 390]], "#a2745f");
  vlines(g, 120, 288, 350, 388, { sp: 9, w: 1, color: "rgba(60,30,25,0.5)", seed: 91 });
  poly(g, [[0, 400], [238, 400], [238, 445], [0, 445]], "#c7738c");
  poly(g, [[238, 400], [300, 400], [300, 445], [238, 445]], "#5e4038");
  line(g, [[0, 400], [300, 400]], 1.4, INK); line(g, [[0, 445], [300, 445]], 1.4, INK);
  for (const [x, y] of [[26, 412], [206, 412]]) { g.beginPath(); g.arc(x, y, 4, 0, 6.3); g.fillStyle = "#8a4458"; g.fill(); }
  rect(g, 0, 445, 300, 60, "#e6d5ba");
  // below the lid line (seen during the orbit): more compartments
  // below the lid line (measured bands at x < 200 on 131.60): cream, a shelf edge, shadow, books, a pink box, the board
  rect(g, 0, 505, 300, 42, "#e5d5b8");
  rect(g, 0, 547, 300, 18, "#827865"); rect(g, 0, 565, 300, 30, "#30201a");
  rect(g, 0, 595, 300, 205, "#8c6258");
  for (const [x0, x1, col] of [[0, 22, "#d38d80"], [22, 48, "#9e7774"], [48, 70, "#694641"], [70, 100, "#a57c70"], [100, 130, "#a77772"], [130, 160, "#8e6b67"], [160, 200, "#9f7971"]])
    poly(g, [[x0, 600 + (x0 % 3) * 6], [x1, 600 + (x0 % 5) * 4], [x1, 750], [x0, 750]], col);
  vlines(g, 2, 198, 600, 750, { sp: 6, w: 1.1, color: "rgba(50,25,22,0.55)", seed: 31 });
  poly(g, [[0, 750], [200, 750], [200, 800], [0, 800]], "#b86f74");
  rect(g, 118, 740, 60, 60, "#d88e92");
  rect(g, 0, 800, 300, 40, "#e3c7a0"); line(g, [[0, 800], [300, 800]], 1.5, INK);
  rect(g, 0, 840, 300, 30, "#c9a07b"); line(g, [[0, 840], [300, 840]], 1.3, INK2);
  rect(g, 0, 870, 300, 24, "#463c37");
  rect(g, 0, 894, 300, 60, "#e3c2a0");
  // uprights
  rect(g, 300, 0, 22, 800, "#dfb393"); rect(g, 322, 0, 28, 800, "#bb957d");
  line(g, [[300, 0], [300, 800]], 1.8, INK); line(g, [[350, 0], [350, 800]], 1.5, INK); line(g, [[322, 0], [322, 800]], 1, INK3);
  rect(g, 350, 0, 42, 800, "#a2806a");
  vlines(g, 352, 390, 0, 800, { sp: 5, w: 1, color: "rgba(70,40,30,0.45)", seed: 42, broken: 0.3 });
  rect(g, 348, 120, 38, 32, "#20120c"); rect(g, 348, 322, 38, 26, "#20120c");
  vlines(g, 348, 386, 150, 322, { sp: 5, w: 1.1, color: "rgba(80,40,30,0.6)", seed: 41 });
  line(g, [[390, 0], [390, 946]], 1.6, INK);
  // ink detail: board grain, box side hatching, book spines, post grain (seeded)
  for (const y of [100, 300, 390]) { line(g, [[4, y + 8], [300, y + 9]], 0.9, INK3); line(g, [[20, y + 15], [260, y + 14]], 0.8, INK3); }
  hatch(g, [[0, 158], [118, 150], [135, 168], [135, 300], [0, 300]], { angle: 1.57, sp: 7, w: 0.8, color: "rgba(90,60,20,0.25)", seed: 81, len: 60, density: 0.6 });
  hatch(g, [[140, 44], [290, 44], [290, 100], [140, 100]], { angle: 1.57, sp: 6, w: 0.8, color: "rgba(80,60,40,0.3)", seed: 82, len: 40, density: 0.7, smooth: false });
  for (const [x0, x1] of [[0, 32], [34, 92], [92, 136]]) vlines(g, x0 + 3, x1 - 3, 2, 98, { sp: 9, w: 0.9, color: "rgba(40,20,30,0.35)", seed: 83 + x0 });
  vlines(g, 304, 340, 0, 946, { sp: 11, w: 0.8, color: "rgba(90,60,40,0.3)", seed: 84, broken: 0.4 });
  hatch(g, [[0, 400], [300, 400], [300, 445], [0, 445]], { angle: 0.1, sp: 6, w: 0.8, color: "rgba(90,30,50,0.3)", seed: 85, len: 50, density: 0.6, smooth: false });
  // shelf-top edge highlights
  g.beginPath(); g.arc(325, 318, 3, 0, 6.3); g.fillStyle = INK; g.fill();
}
function plantCabinet(g) {
  // cabinet (cream) with a drawer, continuing under the hoodie
  poly(g, [[350, 398], [720, 398], [720, 946], [350, 946]], "#e8e0b0");
  rect(g, 350, 396, 370, 10, "#efe8c8");
  line(g, [[350, 398], [720, 398]], 1.6, INK); line(g, [[352, 408], [720, 408]], 1.1, INK2);
  poly(g, [[366, 414], [548, 414], [548, 505], [366, 505]], "#ebe3b8");
  rect(g, 352, 406, 368, 6, "rgba(90,70,40,0.12)");
  hatch(g, [[366, 470], [548, 470], [548, 505], [366, 505]], { angle: 0, sp: 5, w: 0.8, color: "rgba(80,60,40,0.3)", seed: 87, len: 40, density: 0.6, smooth: false });
  ink(g, [[366, 414], [548, 414], [548, 505], [366, 505], [366, 414]], 1.5, INK, { smooth: false });
  ink(g, [[432, 440], [486, 440], [486, 450], [432, 450], [432, 440]], 1.4, INK, { smooth: false });
  line(g, [[560, 414], [560, 505]], 1, INK3);
  for (let y = 520; y < 946; y += 95) { ink(g, [[366, y], [548, y], [548, y + 80], [366, y + 80], [366, y]], 1.4, INK, { smooth: false }); ink(g, [[432, y + 30], [486, y + 30], [486, y + 40], [432, y + 40], [432, y + 30]], 1.3, INK, { smooth: false }); }
  // leaning picture frame
  poly(g, [[352, 226], [400, 216], [440, 398], [392, 402]], "#cfb08c");
  poly(g, [[362, 240], [396, 233], [430, 392], [398, 395]], "#e6d6b4");
  ink(g, [[352, 226], [400, 216], [440, 398], [392, 402], [352, 226]], 1.8, INK, { smooth: false });
  ink(g, [[362, 240], [396, 233], [430, 392], [398, 395], [362, 240]], 1.1, INK2, { smooth: false });
  hatch(g, [[362, 240], [396, 233], [430, 392], [398, 395]], { angle: 1.35, sp: 5, w: 0.8, color: "rgba(80,60,40,0.3)", seed: 86, len: 30, density: 0.6, smooth: false });
  g.beginPath(); g.arc(382, 240, 2.5, 0, 6.3); g.fillStyle = INK; g.fill();
  // glass jar with brushes
  poly(g, [[442, 290], [488, 290], [490, 398], [440, 398]], "rgba(200,184,158,0.85)");
  ink(g, [[442, 290], [440, 398], [490, 398], [488, 290]], 1.3, INK, { smooth: false });
  for (const x of [452, 462, 474]) line(g, [[x, 270], [x + 2, 396]], 1.4, "rgba(60,40,30,0.7)");
  // tall vase + plant
  shape(g, [[478, 250], [506, 250], [512, 300], [508, 398], [476, 398], [472, 300]], "#e0d2ba");
  ink(g, [[478, 250], [472, 300], [476, 398]], 1.4, INK); ink(g, [[506, 250], [512, 300], [508, 398]], 1.4, INK);
  plant(g, 101, 492, 250, 18, 2.2, [45, 95], ["#7f9450", "#6f8646", "#95a660"]);
  // wooden crate + small plant
  plant(g, 202, 572, 312, 16, 2.6, [30, 65], ["#7f9450", "#8c9e58", "#6f8646"]);
  poly(g, [[492, 312], [625, 312], [625, 400], [492, 400]], "#c69c7c");
  for (const y of [330, 350, 368, 386]) line(g, [[500, 0 + y], [618, y]], 1.2, "rgba(90,50,30,0.6)");
  ink(g, [[492, 312], [625, 312], [625, 400], [492, 400], [492, 312]], 1.6, INK, { smooth: false });
  g.beginPath(); g.arc(585, 342, 5, 0, 6.3); g.strokeStyle = INK; g.lineWidth = 1.3; g.stroke();
  // pink book standing + mint bottle
  poly(g, [[618, 268], [700, 268], [704, 398], [618, 398]], "#cea197");
  ink(g, [[618, 268], [700, 268], [704, 398]], 1.5, INK, { smooth: false });
  g.beginPath(); g.arc(630, 284, 6, 0, 6.3); g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke();
  shape(g, [[628, 316], [666, 316], [672, 334], [672, 398], [624, 398], [624, 334]], "#a1c4a6");
  rect(g, 636, 296, 26, 20, "#c76db0"); ink(g, [[636, 296], [662, 296], [662, 316], [636, 316], [636, 296]], 1.2, INK, { smooth: false });
  ink(g, [[628, 316], [624, 334], [624, 398]], 1.3, INK); ink(g, [[666, 316], [672, 334], [672, 398]], 1.3, INK);
  for (let y = 340; y < 392; y += 8) line(g, [[632, y], [646, y]], 0.8, "rgba(40,80,60,0.5)");
}

// ------------------------------------------------------------------ RIGHT wall (x >= CORNER_X)
function rightWall(g) {
  // corner strip, curtain folds, salmon panel, window frame and glass (colours measured across the frame)
  rect(g, CORNER_X, 0, 50, 560, "#e8d6b0");
  rect(g, 1655, 0, 48, 560, "#c9a18d");
  vlines(g, 1656, 1700, 0, 560, { sp: 6, w: 2.4, color: "rgba(120,45,40,0.7)", seed: 51, broken: 0.2 });
  g.fillStyle = lin(g, 1700, 0, 1850, 0, [[0, "#e2b597"], [0.5, "#e1b395"], [1, "#dbac90"]]);
  g.fillRect(1700, 0, 150, 560);
  for (let y = 70; y < 240; y += 22) line(g, [[1770, y], [1770, y + 14]], 2, "rgba(140,40,40,0.8)");
  for (const x of [1846, 1856]) line(g, [[x, 0], [x, 560]], 1.8, "rgba(120,40,40,0.55)");
  g.save(); g.beginPath(); g.rect(1650, 0, 215, 470); g.clip(); g.filter = "blur(4px)";
  for (const y0 of [80, 215, 345]) poly(g, [[1640, y0 + 55 + 18], [1640, y0 + 55 - 18], [1880, y0 - 65 - 18], [1880, y0 - 65 + 18]], "rgba(255,226,200,0.55)");
  g.restore();
  rect(g, 1860, 0, 60, 470, "#d9b8a4");
  for (const x of [1872, 1884, 1904, 1914]) line(g, [[x, 0], [x, 468]], 1.4, "rgba(110,50,45,0.6)");
  g.fillStyle = lin(g, 1920, 0, 2090, 460, [[0, "#ebe5d2"], [1, "#efe8d4"]]);
  g.fillRect(1920, 0, 172, 466);
  rect(g, 2090, 0, 22, 492, "#a88a78");
  for (const x of [2090, 2111]) line(g, [[x, 0], [x, 492]], 1.6, "rgba(90,40,35,0.8)");
  rect(g, 2112, 0, 50, 488, "#d3cfbb"); rect(g, 2162, 0, 44, 488, "#f0e9d3");
  for (const x of [2140, 2150]) line(g, [[x, 0], [x, 470]], 1.2, "rgba(110,50,45,0.35)");
  // handle
  rect(g, 2114, 128, 10, 50, "#d8cdb8");
  ink(g, [[2112, 128], [2124, 128], [2126, 178], [2116, 182], [2110, 174], [2112, 128]], 1.5, INK, { smooth: false });
  // sill
  rect(g, 1880, 460, 212, 16, "#e2cdb8"); line(g, [[1880, 460], [2092, 460]], 1.4, INK2); line(g, [[1880, 476], [2092, 476]], 1.4, INK2);
  rect(g, 2092, 486, 114, 20, "#a88272"); line(g, [[2092, 486], [2206, 486]], 1.8, INK);
  // wainscot slats below the window (and behind the cabinet)
  rect(g, 1655, 476, 551, 470, "#b89a88");
  g.fillStyle = lin(g, 1900, 500, 2206, 800, [[0, "#b99c89"], [1, "#b09380"]]); g.fillRect(1900, 500, 306, 446);
  g.save(); g.filter = "blur(8px)";
  poly(g, [[1965, 946], [2206, 946], [2206, 510], [2150, 510], [1965, 760]], "rgba(214,180,160,0.55)");
  g.restore();
  vlines(g, 1655, 2206, 476, 946, { sp: 5.5, w: 1.4, color: "rgba(100,45,38,0.5)", seed: 61 });
  line(g, [[1880, 500], [2206, 500]], 2, INK);
  // the sun: bright stripes across the curtain and the window, ~37 deg
  g.save(); g.globalCompositeOperation = "screen";
  g.beginPath(); g.rect(CORNER_X, 0, 594, 500); g.clip();
  for (const [x0, w, a] of [[1830, 34, 0.28], [1900, 26, 0.2], [2020, 44, 0.24], [2150, 30, 0.2], [2260, 50, 0.2]]) {
    g.save(); g.translate(x0, 0); g.rotate(Math.PI - 0.66);
    g.fillStyle = `rgba(255,236,200,${a})`; g.fillRect(-900, -w / 2, 900, w);
    g.restore();
  }
  g.restore();
}
// the big sun shaft on the right: a ~45 deg band from the window down across the wainscot and the cabinet (measured edges
// (2041,450)-(1681,804) and (2206,520)-(1888,804) on 131.60), warm yellow; the cabinet's front in it goes bright yellow
function rightShaft(g) {
  g.save(); g.globalCompositeOperation = "screen"; g.filter = "blur(6px)";
  poly(g, [[1590, 812], [1720, 812], [1900, 560], [2040, 420], [1960, 420], [1790, 560]], "rgba(255,232,170,0.38)");
  poly(g, [[1960, 420], [2040, 420], [2206, 250], [2206, 170]], "rgba(255,240,200,0.25)");
  poly(g, [[2206, 0], [2400, 0], [2206, 170]], "rgba(255,235,190,0.10)");
  g.restore();
}
function rightCabinet(g) {
  // small box on the cabinet left of the canister
  poly(g, [[1580, 490], [1636, 490], [1636, 562], [1580, 562]], "#c9a38b");
  ink(g, [[1580, 490], [1636, 490], [1636, 562]], 1.3, INK, { smooth: false });
  // cabinet
  poly(g, [[1552, 556], [1885, 556], [1885, 800], [1552, 800]], "#ecd098");
  rect(g, 1552, 552, 336, 12, "#efe2b8");
  ink(g, [[1552, 552], [1888, 552], [1888, 564], [1552, 564]], 1.5, INK, { smooth: false });
  ink(g, [[1885, 564], [1885, 800]], 1.4, INK, { smooth: false });
  // left bay with a dark grid basket
  poly(g, [[1558, 568], [1700, 568], [1700, 800], [1558, 800]], "#e2b5a0");
  g.save(); g.beginPath(); g.rect(1566, 578, 124, 76); g.clip();
  rect(g, 1566, 578, 124, 76, "#b98a7a");
  for (let x = 1566; x < 1690; x += 8) line(g, [[x, 578], [x, 654]], 1.2, "rgba(40,20,15,0.65)");
  for (let y = 580; y < 654; y += 9) line(g, [[1566, y], [1690, y]], 1.1, "rgba(40,20,15,0.65)");
  g.restore();
  poly(g, [[1566, 660], [1690, 660], [1690, 795], [1566, 795]], "#dfae9c");
  vlines(g, 1566, 1690, 660, 795, { sp: 7, w: 1, color: "rgba(120,60,60,0.35)", seed: 71 });
  line(g, [[1700, 568], [1700, 800]], 1.5, INK);
  // purple canister
  shape(g, [[1640, 446], [1700, 446], [1702, 556], [1638, 556]], "#b47fc0", { smooth: false });
  rect(g, 1640, 436, 60, 12, "#c89ad0");
  ink(g, [[1640, 436], [1700, 436], [1702, 556], [1638, 556], [1640, 436]], 1.5, INK, { smooth: false });
  vlines(g, 1650, 1690, 452, 552, { sp: 7, w: 1.2, color: "rgba(80,30,90,0.5)", seed: 73 });
  // plant pot + plant
  plant(g, 303, 1780, 500, 16, 2.6, [50, 110], ["#9dbb73", "#b5cf8a", "#86a860"]);
  shape(g, [[1738, 498], [1826, 498], [1816, 560], [1746, 560]], "#efe9da", { smooth: false });
  ink(g, [[1738, 498], [1826, 498], [1816, 560], [1746, 560], [1738, 498]], 1.5, INK, { smooth: false });
  for (let y = 512; y < 556; y += 9) line(g, [[1748, y], [1790, y]], 1, "rgba(90,70,50,0.4)");
  // bin
  shape(g, [[1757, 745], [1935, 745], [1926, 800], [1768, 800]], "#8f8a74", { smooth: false });
  vlines(g, 1770, 1925, 748, 798, { sp: 6, w: 1.2, color: "rgba(40,40,30,0.7)", seed: 77 });
  g.beginPath(); g.ellipse(1846, 744, 89, 8, 0, 0, 6.3); g.fillStyle = "#6f6a58"; g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
}

// ------------------------------------------------------------------ desk
export const DESK_POLY = [[200, 800], [1552, 800], [1878, 800], [2206, 930], [2206, 1200], [200, 1200]];
function desk(g) {
  g.save(); g.beginPath(); trace(g, DESK_POLY, true, false); g.clip();
  g.fillStyle = lin(g, 0, 800, 0, 946, [[0, "#e4c7a0"], [1, "#e6cba4"]]);
  g.fillRect(-800, 780, 3100, 500);
  // white papers / sketch sheets on the right
  poly(g, [[1235, 872], [1560, 832], [1880, 800], [2206, 930], [2206, 1000], [1235, 1000]], "#f1ead0");
  poly(g, [[1000, 862], [1235, 872], [1235, 1000], [1150, 1000]], "#f2e8cf");
  ink(g, [[1000, 862], [1560, 835]], 1.2, INK2, { smooth: false });
  ink(g, [[1560, 835], [1720, 846], [1930, 946]], 1.6, INK, { smooth: false });
  ink(g, [[1560, 852], [1680, 855], [1850, 946]], 1.4, INK, { smooth: false });
  ink(g, [[1000, 875], [1150, 946]], 1.3, INK, { smooth: false });
  // left: the cable
  ink(g, [[160, 882], [220, 896], [300, 905], [420, 900]], 7, "#3a3330", { taper: 0.1 });
  g.restore();
  ink(g, [[1552, 800], [1878, 800], [2206, 930]], 2.2, INK, { smooth: false });
}

export function paintRoomL() {
  const c = canvas(2206, 946), g = c.getContext("2d");
  g.fillStyle = "#e8dcc0"; g.fillRect(0, 0, 2206, 946);
  backWall(g);
  plantCabinet(g);
  bookshelf(g);
  rightWall(g);
  rightCabinet(g);
  rightShaft(g);
  desk(g);
  return c;
}

// the sun: bright diagonal bands from the window (upper right) down to the left, over the room (screen blend)
export const RAYS = { ang: -0.5, bands: [] };
// light shafts in the air (over the room AND the figure): the bright band from the window across the back wall
export const SHAFTS = [
  // [x at y=0, y slope per x (down-left), width, alpha]
  [1330, 0.42, 150, 0.22],
];
export function paintShafts(g, W = 2206, H = 946) {
  g.save(); g.globalCompositeOperation = "screen"; g.filter = "blur(18px)";
  for (const [x0, k, w, a] of SHAFTS) {
    const ang = Math.PI - Math.atan(k);
    g.save(); g.translate(x0, 0); g.rotate(ang);
    g.fillStyle = `rgba(255,248,225,${a})`; g.fillRect(-100, -w / 2, 2600, w);
    g.restore();
  }
  g.restore();
}
export function paintLightL(g) {
  // placeholder bands (fitted later)
  g.save();
  g.globalCompositeOperation = "screen";
  const bands = [];
  const a = Math.atan2(0.55, -1);
  for (const [x, w, k] of bands) {
    g.save(); g.translate(x, 0); g.rotate(a);
    g.fillStyle = `rgba(255,230,170,${k})`;
    g.fillRect(0, -w / 2, 2600, w);
    g.restore();
  }
  g.restore();
}
