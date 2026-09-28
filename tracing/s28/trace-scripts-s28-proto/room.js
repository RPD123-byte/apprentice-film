// The sunlit room behind the sleeping designer, as the final (locked) camera of s28 sees it (131.36–136.0 s).
// Painted once in frame coordinates (2206 x 946 + margins); positions measured on the 132.4 s source frame
// (gridded zooms), colours sampled pre-grade (post.js inverted). No figure, laptop or desk here: those are layers.
import { rng } from "../../lib/rng.js";
import { INKC, poly, spath, fill, stroke, shape, rect, ink, hatch, hatchIn, ticks, lin, rad, blob, grain } from "./draw.js";

const C = {
  wall: "#ece4cc", wallWarm: "#e8d4ab", wallTop: "#e3c8a7",
  wood: "#e3b690", woodDark: "#c99a78", shelfBack: "#b58a80", shadow: "#2a1812",
  yellow: "#e4c071", yellowS: "#d2ac6a", white: "#ded3b6", magenta: "#d7809c", purple: "#bf90bc", green: "#9fb99c",
  teal: "#8db7a0", pinkBoard: "#ce7492", jar: "#e3a482", jarLid: "#d47582", drawer: "#ecddb1", crate: "#e3af8d",
  folder: "#dca1ae", tealB: "#99c7ab", frame: "#ce9d8c", leaf: "#8f9a62", leafL: "#b3b77f", books: "#b87c7f",
  pinkBox: "#c97c86", curtain: "#e9c2a8", glass: "#f3ead8", winFrame: "#d8b8a8", slat: "#d2a597",
  cab: "#e8c7a8", cabLit: "#efd9a0", thermos: "#a47bb0", pot: "#f1dfc6", bin: "#a8917e",
};

// ------------------------------------------------------------------ left shelving unit (x 0–390)
function shelving(g) {
  // back panel of the compartments: pinkish brown with dense vertical hatching
  fill(g, rect(0, 0, 345, 545), C.shelfBack);
  g.save(); g.beginPath(); poly(g, rect(0, 118, 305, 400)); g.clip();
  hatch(g, [0, 118, 305, 400], { angle: Math.PI / 2, spacing: 5.2, lw: 1.3, col: "#5a3028", seed: 11, jitter: 0.25, len: [0.9, 1], alpha: 0.75 });
  g.restore();
  // top compartment: binders + white box
  fill(g, rect(0, 0, 36, 101), C.magenta);
  fill(g, rect(36, 0, 66, 101), C.purple);
  fill(g, rect(66, 0, 104, 101), C.green);
  fill(g, rect(104, 0, 140, 101), "#8fb3a4");
  for (const x of [36, 66, 104, 140]) stroke(g, [[x, 0], [x, 101]], INKC, 1.8);
  for (const x of [80, 90, 118, 128]) stroke(g, [[x, 4], [x, 99]], "#3d4a40", 1, { alpha: 0.6 });
  g.beginPath(); g.ellipse(50, 88, 4, 6, 0, 0, 7); g.strokeStyle = INKC; g.lineWidth = 1.6; g.stroke();
  // white storage box with lid
  shape(g, [[140, 42], [298, 42], [298, 101], [140, 101]], C.white, 2);
  shape(g, [[137, 16], [301, 16], [301, 43], [137, 43]], "#e8ddc2", 2);
  stroke(g, [[290, 46], [290, 98]], INKC, 1, { alpha: 0.5 });
  // shelf boards (front faces) with the black shadow under each
  const board = (y0, y1, x1 = 305) => {
    fill(g, rect(0, y1, x1, y1 + 30), C.shadow);
    fill(g, rect(0, y0, x1, y1), C.wood);
    stroke(g, [[0, y0], [x1, y0]], INKC, 2); stroke(g, [[0, y1], [x1, y1]], INKC, 1.6);
    g.save(); g.globalAlpha = 0.35; fill(g, rect(0, y1 - 5, x1, y1), C.woodDark); g.restore();
  };
  // middle compartment contents first (they stand on shelf 2)
  // stack of grey-green folders lying on top
  shape(g, [[0, 150], [150, 146], [190, 160], [186, 176], [0, 178]], "#a9b4a0", 1.8);
  for (let i = 0; i < 5; i++) stroke(g, [[4, 156 + i * 4], [182, 158 + i * 3.6]], INKC, 0.9, { alpha: 0.55 });
  shape(g, [[0, 172], [135, 172], [135, 301], [0, 301]], C.yellow, 2.2);
  g.save(); g.globalAlpha = 0.5; fill(g, rect(118, 174, 135, 300), C.yellowS); g.restore();
  g.beginPath(); g.roundRect(10, 183, 52, 13, 6.5); g.fillStyle = "#6a4a2a"; g.fill(); g.strokeStyle = INKC; g.lineWidth = 1.8; g.stroke();
  shape(g, [[135, 176], [210, 180], [212, 301], [135, 301]], C.yellowS, 2.2);
  shape(g, [[142, 186], [160, 186], [160, 206], [142, 206]], "#e6cf8c", 1.4);
  g.beginPath(); g.arc(150, 290, 3, 0, 7); g.strokeStyle = INKC; g.lineWidth = 1.2; g.stroke();
  // glass jars with pink lids
  const jar = (x0, x1, y0, y1) => {
    shape(g, [[x0 + 3, y0 + 18], [x1 - 3, y0 + 18], [x1, y0 + 30], [x1, y1], [x0, y1], [x0, y0 + 30]], C.jar, 2);
    g.save(); g.globalAlpha = 0.45; fill(g, rect(x0 + 4, y0 + 34, x0 + 14, y1 - 6), "#f4d2b8"); g.restore();
    shape(g, [[x0 + 2, y0], [x1 - 2, y0], [x1 - 1, y0 + 18], [x0 + 1, y0 + 18]], C.jarLid, 2);
    stroke(g, [[x0 + 4, y0 + 60], [x1 - 6, y0 + 60]], INKC, 1, { alpha: 0.4 });
  };
  jar(218, 290, 190, 301);
  jar(262, 302, 215, 301);
  board(300, 320);
  // lower compartment: teal flat box, papers, magenta drawer board
  shape(g, [[0, 350], [146, 350], [146, 386], [0, 386]], C.teal, 2);
  for (let x = 6; x < 146; x += 7) stroke(g, [[x, 352], [x, 384]], "#3b5a4d", 0.8, { alpha: 0.55 });
  shape(g, [[0, 384], [292, 380], [300, 392], [0, 396]], "#e7dcc5", 1.6);
  shape(g, [[0, 396], [300, 396], [300, 470], [0, 470]], C.pinkBoard, 2.2);
  fill(g, rect(0, 396, 300, 404), "#e39ab0");
  for (const [x, y] of [[22, 412], [205, 412]]) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fillStyle = "#6a2a3a"; g.fill(); }
  shape(g, [[235, 404], [300, 404], [300, 470], [235, 470]], "#d98aa0", 1.6);
  shape(g, [[252, 438], [282, 438], [282, 446], [252, 446]], "#5a2432", 1.2);
  hatchIn(g, rect(236, 404, 300, 470), { angle: Math.PI / 2, spacing: 5, lw: 1, col: "#5a2432", seed: 4, alpha: 0.45 });
  board(100, 118);
  // front post + shadowed side of the unit
  fill(g, rect(345, 0, 392, 545), "#a88275");
  g.save(); g.beginPath(); poly(g, rect(345, 0, 392, 545)); g.clip();
  hatch(g, [345, 0, 392, 545], { angle: Math.PI / 2, spacing: 4.2, lw: 1.2, col: "#4a2a24", seed: 12, alpha: 0.7 });
  g.restore();
  shape(g, rect(302, -4, 346, 548), C.wood, 2.2);
  g.save(); g.globalAlpha = 0.4; fill(g, rect(334, 0, 346, 546), C.woodDark); g.restore();
  g.beginPath(); g.arc(321, 314, 2.6, 0, 7); g.fillStyle = INKC; g.fill();
  stroke(g, [[392, 0], [392, 545]], INKC, 1.6);
  // lower-left, behind the laptop: a thin shelf, books, pink boxes
  fill(g, rect(0, 470, 118, 545), C.wall);
  shape(g, [[0, 540], [110, 540], [110, 549], [0, 549]], C.wood, 1.4);
  fill(g, rect(0, 549, 150, 800), "#d8a1a4");
  const r = rng(77);
  for (let x = 0; x < 140;) {
    const w = 10 + r() * 12, top = 578 + r() * 18;
    shape(g, [[x, top], [x + w, top + 2], [x + w, 722], [x, 722]], r() < 0.5 ? C.books : "#a86a70", 1.4);
    stroke(g, [[x + w * 0.5, top + 10], [x + w * 0.5, 712]], "#4a2226", 0.9, { alpha: 0.5 });
    x += w;
  }
  fill(g, rect(0, 722, 170, 728), "#e7c9b8");
  shape(g, [[0, 728], [110, 728], [110, 800], [0, 800]], C.pinkBox, 2);
  shape(g, [[110, 736], [172, 736], [172, 800], [110, 800]], "#d9909a", 2);
  g.beginPath(); g.roundRect(-4, 786, 38, 12, 6); g.fillStyle = "#4a2226"; g.fill();
  hatchIn(g, rect(110, 736, 172, 800), { angle: Math.PI / 2, spacing: 5, lw: 1, col: "#5a2432", seed: 5, alpha: 0.4 });
}

// ------------------------------------------------------------------ the drawer unit and what stands on it
function drawerUnit(g) {
  // mesh hatch on the wall behind (a dark grid patch above the unit)
  g.save(); g.beginPath(); poly(g, [[392, 0], [485, 0], [470, 150], [392, 160]]); g.clip();
  for (let x = 395; x < 490; x += 9) stroke(g, [[x, 0], [x - 2, 160]], "#5a4038", 1, { alpha: 0.55 });
  for (let y = 4; y < 160; y += 9) stroke(g, [[392, y], [490, y - 3]], "#5a4038", 1, { alpha: 0.55 });
  g.restore();
  // unit body
  shape(g, [[352, 398], [640, 398], [640, 520], [352, 520]], C.drawer, 2.2);
  stroke(g, [[356, 410], [636, 410]], INKC, 1.4);
  stroke(g, [[362, 486], [630, 486]], INKC, 1.4); stroke(g, [[362, 492], [630, 492]], INKC, 1.2);
  g.beginPath(); g.moveTo(428, 434); g.lineTo(430, 447); g.lineTo(484, 447); g.lineTo(486, 434); g.strokeStyle = INKC; g.lineWidth = 2; g.stroke();
  stroke(g, [[362, 410], [362, 492]], INKC, 1.2);
  // picture frame leaning on the wall
  shape(g, [[362, 226], [404, 216], [443, 396], [396, 398]], C.frame, 2.2);
  shape(g, [[374, 240], [398, 234], [430, 388], [404, 390]], "#e9c4b2", 1.4);
  g.beginPath(); g.arc(380, 242, 2.4, 0, 7); g.fillStyle = INKC; g.fill();
  // glass bottle (drawn as lines on the wall colour)
  g.save(); g.globalAlpha = 0.55; fill(g, [[446, 312], [488, 312], [490, 396], [444, 396]], "#f0ead8"); g.restore();
  stroke(g, [[446, 312], [444, 396], [490, 396], [488, 312], [476, 300], [476, 284], [458, 284], [458, 300], [446, 312]], INKC, 1.6);
  stroke(g, [[456, 330], [456, 386]], INKC, 1, { alpha: 0.6 }); stroke(g, [[466, 350], [466, 392]], INKC, 1, { alpha: 0.6 });
  // white vase + tall plant
  shape(g, [[474, 250], [506, 248], [512, 300], [470, 302]], "#efe2c8", 2);
  plant(g, 490, 250, 1.0, 21, [[-58, -130], [-20, -150], [38, -126], [80, -80], [-70, -72], [-50, -30], [60, -40], [10, -100], [30, -60], [-30, -110]]);
  // wooden crate + second plant
  plant(g, 565, 312, 0.85, 22, [[-50, -70], [-20, -90], [30, -84], [60, -50], [-40, -30], [50, -20], [0, -60], [20, -40]]);
  shape(g, [[489, 310], [613, 310], [613, 397], [489, 397]], C.crate, 2.2);
  for (const y of [334, 356, 376]) stroke(g, [[492, y], [610, y]], INKC, 1.2, { alpha: 0.7 });
  stroke(g, [[500, 342], [530, 342], [540, 346]], "#8a4a32", 1.4);
  g.beginPath(); g.arc(560, 342, 3.5, 0, 7); g.strokeStyle = INKC; g.lineWidth = 1.2; g.stroke();
  // pink folder and the teal bottle in front of it
  shape(g, [[614, 272], [716, 268], [720, 397], [614, 397]], C.folder, 2);
  stroke(g, [[704, 276], [708, 392]], INKC, 1, { alpha: 0.6 });
  shape(g, [[622, 305], [668, 305], [670, 392], [620, 392]], C.tealB, 2);
  shape(g, [[633, 290], [659, 290], [659, 306], [633, 306]], "#c77fc5", 1.8);
  for (let y = 322; y < 384; y += 6) stroke(g, [[630, y], [650, y]], "#3b5a4d", 0.9, { alpha: 0.5 });
}

// a potted plant: fan of pointed leaves around (x,y) (the pot's rim), tips given relative
function plant(g, x, y, s, seed, tips) {
  const r = rng(seed);
  for (const [tx, ty] of tips) {
    const ex = x + tx * s, ey = y + ty * s;
    const mx = (x + ex) / 2 + (r() - 0.5) * 20 * s, my = (y + ey) / 2 + (r() - 0.5) * 10 * s;
    // stem
    stroke(g, [[x + (r() - 0.5) * 8, y], [mx, my], [ex, ey]], "#4d5a2a", 1.4 * s, { smooth: true });
    // leaf at the tip: a pointed ellipse along the direction
    const a = Math.atan2(ey - my, ex - mx), L = (26 + r() * 16) * s, Wd = (9 + r() * 5) * s;
    const ca = Math.cos(a), sa = Math.sin(a);
    const P = (u, v) => [ex - ca * L * 0.5 + ca * u - sa * v, ey - sa * L * 0.5 + sa * u + ca * v];
    const leaf = [P(-L * 0.5, 0), P(-L * 0.1, -Wd), P(L * 0.35, -Wd * 0.6), P(L * 0.62, 0), P(L * 0.35, Wd * 0.6), P(-L * 0.1, Wd)];
    shape(g, leaf, r() < 0.5 ? C.leaf : C.leafL, 1.5, { smooth: true });
    stroke(g, [P(-L * 0.4, 0), P(L * 0.5, 0)], "#3d4a22", 0.9, { alpha: 0.6 });
  }
}

// ------------------------------------------------------------------ the back wall (behind the designer)
function backWall(g) {
  // base wall colour with a warm top-left
  g.fillStyle = lin(g, 0, 0, 1600, 500, [[0, "#e9d6ae"], [0.45, "#ebdfc2"], [1, "#efe7d2"]]);
  g.fillRect(-200, -200, 2000, 1400);
  // the darker upper band left of the light beam (the wall out of the sun)
  g.save();
  g.beginPath(); poly(g, [[392, -10], [1180, -10], [620, 245], [392, 330]]); g.fillStyle = "rgba(214,178,140,0.45)"; g.fill();
  g.restore();
  // panel seams
  stroke(g, [[893, 0], [893, 150], [891, 236]], "#5a4038", 1.3);
  stroke(g, [[1228, 0], [1228, 180]], "#5a4038", 1.3);
  // a few specks
  const r = rng(8);
  for (let i = 0; i < 18; i++) { g.beginPath(); g.arc(420 + r() * 1200, 60 + r() * 380, 1 + r() * 1.3, 0, 7); g.fillStyle = "rgba(60,40,30,0.55)"; g.fill(); }
  g.save(); g.strokeStyle = "#4a3028"; g.lineWidth = 1.4; g.beginPath(); g.arc(626, 130, 6, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); g.restore();
}

// ------------------------------------------------------------------ the window wall on the right
function windowWall(g) {
  // warm pink wall / curtain band left of the glass
  fill(g, rect(1640, -10, 1880, 480), C.curtain);
  // vertical red-brown dash lines (curtain folds / frame strokes)
  const dashes = [[1662, 0, 470, 2.4], [1672, 0, 470, 2], [1684, 0, 470, 1.8], [1694, 0, 470, 1.6], [1772, 70, 250, 1.8], [1855, 30, 470, 2.4], [1866, 30, 470, 2]];
  const r = rng(31);
  for (const [x, y0, y1, w] of dashes) {
    for (let y = y0; y < y1;) {
      const L = 30 + r() * 90; if (r() < 0.8) stroke(g, [[x, y], [x, Math.min(y1, y + L)]], "#8a3a30", w, { cap: "butt" });
      y += L + 8 + r() * 30;
    }
  }
  // window: glass panes, frame
  fill(g, rect(1880, -10, 2216, 470), C.glass);
  g.fillStyle = lin(g, 1880, 0, 2206, 0, [[0, "rgba(255,255,255,0)"], [0.4, "rgba(255,255,255,0.35)"], [1, "rgba(255,255,255,0.1)"]]);
  g.fillRect(1880, -10, 336, 480);
  fill(g, rect(1875, -10, 1905, 470), C.winFrame);
  fill(g, rect(2088, -10, 2118, 470), C.winFrame);
  for (const x of [1878, 1890, 1902, 2091, 2103, 2115, 2130]) stroke(g, [[x, -10], [x, 460]], x < 2000 ? "#7a3a30" : "#5a3a30", 1.6, { alpha: 0.8 });
  // handle
  shape(g, [[2118, 108], [2128, 108], [2130, 170], [2116, 170]], "#e9dccb", 1.6);
  shape(g, [[2108, 130], [2122, 128], [2122, 162], [2110, 162]], "#d5c3b0", 1.4);
  // sill ledge
  shape(g, [[1880, 458], [2216, 450], [2216, 470], [1880, 474]], "#e4c9b8", 1.8);
  shape(g, [[2098, 452], [2216, 446], [2216, 488], [2098, 486]], "#dbb6a6", 1.8);
  for (let y = 458; y < 486; y += 7) stroke(g, [[2102, y], [2212, y - 2]], "#6a3a30", 1, { alpha: 0.6 });
  // slatted wainscot panel below the window
  fill(g, [[1910, 478], [2216, 478], [2216, 960], [1910, 960]], C.slat);
  g.save(); g.beginPath(); poly(g, [[1910, 478], [2216, 478], [2216, 960], [1910, 960]]); g.clip();
  hatch(g, [1910, 478, 2216, 960], { angle: Math.PI / 2 + 0.01, spacing: 6.4, lw: 1.8, col: "#6a2e22", seed: 33, jitter: 0.35, len: [0.75, 1], alpha: 0.85 });
  g.restore();
  // shadowed gap / corner strip between the cabinet and the panel
  fill(g, rect(1905, 470, 1932, 830), "#5a3228");
}

// ------------------------------------------------------------------ cabinet, thermos, plant, bin
function cabinet(g) {
  // small box behind the thermos
  shape(g, [[1582, 488], [1632, 488], [1632, 548], [1582, 548]], "#d9b0a2", 1.8);
  hatchIn(g, rect(1582, 488, 1632, 548), { angle: Math.PI / 2, spacing: 5, lw: 1, col: "#6a3a30", seed: 41, alpha: 0.5 });
  // cabinet body: dark left door with a mesh, lit front
  shape(g, [[1540, 552], [1905, 552], [1905, 800], [1540, 800]], C.cab, 2.2);
  shape(g, [[1548, 560], [1668, 560], [1668, 798], [1548, 798]], "#c9908a", 1.8);
  g.save(); g.beginPath(); poly(g, rect(1562, 566, 1655, 652)); g.clip();
  for (let x = 1562; x < 1656; x += 7) stroke(g, [[x, 566], [x, 652]], INKC, 1.3, { alpha: 0.8 });
  for (let y = 568; y < 652; y += 7) stroke(g, [[1562, y], [1656, y]], INKC, 1.3, { alpha: 0.8 });
  g.restore();
  stroke(g, rect(1562, 566, 1655, 652), INKC, 1.6, { closed: true });
  hatchIn(g, rect(1550, 655, 1667, 797), { angle: Math.PI / 2, spacing: 5.5, lw: 1, col: "#6a3040", seed: 42, alpha: 0.45 });
  fill(g, rect(1560, 700, 1650, 790), "rgba(190,140,190,0.35)");
  stroke(g, [[1668, 560], [1668, 798]], INKC, 1.6);
  // thermos
  shape(g, [[1634, 440], [1698, 440], [1700, 556], [1632, 556]], C.thermos, 2.2);
  shape(g, [[1632, 432], [1700, 432], [1700, 446], [1632, 446]], "#b893c2", 1.8);
  g.save(); g.beginPath(); poly(g, rect(1634, 446, 1698, 556)); g.clip();
  hatch(g, [1634, 446, 1698, 556], { angle: Math.PI / 2, spacing: 4, lw: 1, col: "#4a2a58", seed: 43, alpha: 0.55 });
  g.restore();
  fill(g, rect(1668, 450, 1686, 550), "rgba(230,200,240,0.5)");
  stroke(g, [[1632, 540], [1700, 540]], INKC, 1.4);
  // plant in a white pot
  plant(g, 1778, 478, 1.1, 44, [[-55, -70], [-30, -110], [10, -135], [45, -100], [70, -60], [-60, -30], [55, -25], [-10, -80], [25, -60]]);
  shape(g, [[1730, 477], [1826, 477], [1818, 552], [1738, 552]], C.pot, 2);
  for (let y = 490; y < 540; y += 6) stroke(g, [[1744, y], [1790, y]], "#6a4a3a", 0.9, { alpha: 0.45 });
  // trash bin
  shape(g, [[1757, 740], [1938, 740], [1926, 822], [1768, 822]], C.bin, 2);
  g.save(); g.beginPath(); poly(g, [[1757, 740], [1938, 740], [1926, 822], [1768, 822]]); g.clip();
  hatch(g, [1757, 740, 1938, 822], { angle: Math.PI / 2, spacing: 6, lw: 1.1, col: "#3a2a20", seed: 45, alpha: 0.6 });
  g.restore();
  g.beginPath(); g.ellipse(1847, 742, 91, 9, 0, 0, 7); g.fillStyle = "#b8a088"; g.fill(); g.strokeStyle = INKC; g.lineWidth = 2; g.stroke();
}

// ------------------------------------------------------------------ sun beams (light bands over the room)
// Each beam: a quad (frame px), warm light added in "screen".
const BEAMS = [
  // across the back wall, above the designer's back: rising to the upper right
  { q: [[640, 300], [930, 238], [1690, -10], [1260, -10]], a: 0.55, col: "#fff6dc" },
  { q: [[1450, 150], [1700, 60], [1700, -10], [1520, -10]], a: 0.25, col: "#fff2c8" },
  // over the window wall and the cabinet
  { q: [[1560, 600], [1905, 490], [1905, 360], [1600, 500]], a: 0.35, col: "#fff0b8" },
  { q: [[1560, 820], [1905, 700], [1905, 560], [1560, 700]], a: 0.45, col: "#ffe89a" },
  { q: [[1930, 700], [2216, 470], [2216, 300], [1930, 560]], a: 0.28, col: "#fff0d0" },
  // lower-left wall
  { q: [[0, 530], [118, 470], [118, 440], [0, 500]], a: 0.35, col: "#fff6e0" },
];
function beams(g) {
  g.save(); g.globalCompositeOperation = "screen";
  for (const b of BEAMS) { g.globalAlpha = b.a; fill(g, b.q, b.col); }
  g.restore();
}

export function paintRoom(g) {
  backWall(g);
  shelving(g);
  drawerUnit(g);
  windowWall(g);
  cabinet(g);
  beams(g);
  grain(g, -100, -100, 2406, 1146, 0.22);
}
