// The colour version of the sōko site ("Mixing down, late at night." in the groovy 1970s style), drawn in code.
//
// Coordinates: "colour page" pixels = the source frame at 115.1–117.4 s, where the finished colour site fills the
// 2206 x 946 frame (camera locked off after 115.1 s; measured). The illustration is authored a little wider than the
// page (x −470 … 2680) because the header banner (86.5–110.5 s) is a scaled strip of the same artwork that reaches past
// both page edges.
//
// Public API (see docs/hippie.md):
//   hippiePageCanvas({headline, nav, scale})  cached 2206 x 946 (x scale) canvas: the whole colour page.
//   hippieLayer(name, scale)   "illustration" | "backdrop" | "scene" | "designer" | "headline" | "nav" (page coords).
//   hippiePageSmall(w)         the page pre-shrunk to width w (laptop screen, 117.5–129 s).
//   hippieBannerCanvas()       the header strip (2x); drawHippieBanner(ctx) blits it into BANNER on the B&W page.
//   BANNER, BANNER_MAP         the strip's slot on the sōko page and the colour→page mapping of its artwork.
//   pageArrival(t), PAGE_ARRIVAL   the colour page's measured arrival camera in s26 (112.7–114.9 s).
//   OWL_PERCH                  where the colour owl (owlColor.js, not drawn here) sits on the page.
//   drawHippieWorld(ctx, opts) paint the artwork directly (colour-page coordinates); releaseHippie() frees caches.
import { smoothPath, sampleCurve } from "./paths.js";
import { rng } from "./rng.js";

export const PAGE_W = 2206, PAGE_H = 946;
export const WORLD_X0 = -470, WORLD_X1 = 2680;

// ---------- palette (pre-grade: the global grade's S-curve + vignette are undone from source samples) ----------
export const HC = {
  sky: "#23232f", skyHi: "#2c2a38", line: "#1e1519", lineSoft: "#3a2a2c",
  cream: "#f6e8d2", creamSh: "#e9d5b4", paper: "#f7e8d6",
  gold: "#f2bd5e", yellow: "#e6bc40", orange: "#e8603f", orangeL: "#f08a4e", peach: "#f39a6c",
  magenta: "#d8338c", pink: "#e56db5", pinkL: "#f09ccc", purple: "#7a47a0", lav: "#ad7cc3", lavL: "#c5a0d8",
  green: "#8fbf3f", greenD: "#4f8a2a", greenL: "#b4d863",
  teal: "#2f5f63", blue: "#6f97d0", navy: "#1f2a4a",
  skin: "#f0c39e", skinSh: "#d99b78", hair: "#1b1417", beanie: "#7a4a2c", beanieD: "#5b331d",
  jacket: "#56704c", jacketD: "#3f5638", jacketL: "#64805a", tee: "#cc9242", teeD: "#a8742e",
  laptop: "#7b7275", laptopD: "#5f5b64", desk: "#d8b48c", deskD: "#a57f5c", gear: "#262126", gearL: "#3b353c",
};

// ---------- small drawing helpers ----------
const TAU = Math.PI * 2;
function poly(ctx, pts, close = true) {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
}
// filled shape with an ink outline. pts: polygon; o.smooth: Catmull-Rom through the points.
function shape(ctx, pts, fill, o = {}) {
  const { lw = 2.6, line = HC.line, smooth = false, alpha = 1 } = o;
  ctx.beginPath();
  if (smooth) smoothPath(ctx, pts, true); else poly(ctx, pts);
  if (fill) { ctx.globalAlpha = alpha; ctx.fillStyle = fill; ctx.fill(); ctx.globalAlpha = 1; }
  if (lw) { ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.lineWidth = lw; ctx.strokeStyle = line; ctx.stroke(); }
}
function rect(ctx, x, y, w, h, fill, lw = 2.6, line = HC.line) {
  ctx.beginPath(); ctx.rect(x, y, w, h);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw) { ctx.lineJoin = "round"; ctx.lineWidth = lw; ctx.strokeStyle = line; ctx.stroke(); }
}
function rrect(ctx, x, y, w, h, r, fill, lw = 2.6, line = HC.line) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = line; ctx.stroke(); }
}
function circle(ctx, x, y, r, fill, lw = 0, line = HC.line) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = line; ctx.stroke(); }
}
function line(ctx, pts, lw = 2.4, col = HC.line, smooth = false) {
  ctx.beginPath();
  if (smooth) smoothPath(ctx, pts, false); else poly(ctx, pts, false);
  ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
}
// a stroke that swells in the middle and tapers to points (brows, lashes)
function taperLine(ctx, pts, w, col) {
  const P = sampleCurve(pts, 8), n = P.length, Lf = [], Rt = [];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const hw = (w / 2) * Math.pow(Math.sin(Math.PI * (0.08 + 0.84 * i / (n - 1))), 0.7);
    Lf.push([P[i][0] - dy * hw, P[i][1] + dx * hw]); Rt.push([P[i][0] + dy * hw, P[i][1] - dx * hw]);
  }
  ctx.beginPath(); poly(ctx, [...Lf, ...Rt.reverse()]); ctx.fillStyle = col; ctx.fill();
}
// soft airbrushed blob, clipped by the caller
function glow(ctx, x, y, rx, ry, col, a = 1) {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, col); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save(); ctx.translate(x, y); ctx.scale(rx, ry); ctx.globalAlpha = a; ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill(); ctx.restore();
}
function withAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

// ---------- sky, stars ----------
function sky(ctx) {
  ctx.fillStyle = HC.sky;
  ctx.fillRect(WORLD_X0, -20, WORLD_X1 - WORLD_X0, PAGE_H + 40);
  // the print is not flat: broad soft mottling, slightly warmer toward the middle
  const r = rng(71);
  for (let i = 0; i < 70; i++) {
    const x = WORLD_X0 + r() * (WORLD_X1 - WORLD_X0), y = r() * PAGE_H, s = 60 + r() * 160;
    glow(ctx, x, y, s, s * (0.6 + r() * 0.6), r() < 0.5 ? "rgba(52,46,60,0.35)" : "rgba(22,20,28,0.4)");
  }
}
// four-point sparkle with concave sides
export function sparkle(ctx, x, y, R, col, thin = 0.2) {
  const k = R * thin;
  ctx.beginPath();
  ctx.moveTo(x, y - R);
  ctx.quadraticCurveTo(x + k, y - k, x + R, y);
  ctx.quadraticCurveTo(x + k, y + k, x, y + R);
  ctx.quadraticCurveTo(x - k, y + k, x - R, y);
  ctx.quadraticCurveTo(x - k, y - k, x, y - R);
  ctx.closePath(); ctx.fillStyle = col; ctx.fill();
}
// measured sparkles: [x, y, radius, colour]
const STARS = [
  [422, 73, 19, "cream"], [340, 230, 13, "pink"], [541, 243, 15, "cream"], [689, 350, 19, "gold"], [849, 446, 14, "pink"],
  [686, 535, 15, "gold"], [1473, 352, 16, "cream"], [1347, 446, 14, "gold"], [1741, 85, 21, "gold"], [1643, 217, 14, "pink"],
  [1851, 235, 19, "cream"], [2133, 62, 12, "pink"], [28, 22, 14, "gold"],
  // off-page (banner only)
  [-183, 140, 15, "orange"], [2312, 128, 15, "orange"],
];
const DOTS = [[610, 296, 3], [745, 405, 3], [549, 452, 3], [1612, 285, 3], [1763, 328, 3], [1332, 539, 3], [360, 18, 3], [555, 540, 2.5], [2095, 175, 2.5], [2200, 34, 2.5],
  [-345, 95, 3.5], [-275, 190, 2.5], [-110, 50, 2.5], [2365, 180, 3]];
function stars(ctx) {
  const col = { cream: HC.cream, pink: HC.magenta, gold: HC.gold, orange: HC.orangeL };
  for (const [x, y, R, c] of STARS) sparkle(ctx, x, y, R, col[c], 0.26);
  ctx.fillStyle = HC.cream;
  for (const [x, y, r] of DOTS) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
}

// ---------- ribbons ----------
// Each band is its own outlined polygon (traced from column/row scans of the source), painted back to front:
// the shared edges of neighbouring bands read as the thin ink line between stripes.
// Band given as two edges sampled at the same stations: [[x, yTop, yBottom], ...] (column form) or
// [[y, xLeft, xRight], ...] (row form).
function bandCols(ctx, cols, fill, lw = 2.2) {
  const top = cols.map(([x, a]) => [x, a]), bot = cols.map(([x, , b]) => [x, b]).reverse();
  shape(ctx, [...sampleCurve(top, 6), ...sampleCurve(bot, 6)], fill, { lw });
}
function bandRows(ctx, rows, fill, lw = 2.2) {
  const l = rows.map(([y, a]) => [a, y]), r = rows.map(([y, , b]) => [b, y]).reverse();
  shape(ctx, [...sampleCurve(l, 6), ...sampleCurve(r, 6)], fill, { lw });
}
function bandPts(ctx, a, b, fill, lw = 2.2) {
  shape(ctx, [...sampleCurve(a, 6), ...sampleCurve(b.slice().reverse(), 6)], fill, { lw });
}

// A band from stations along it: ["r", y, x0, x1] (a row cut: x0 on the lower-left side), ["c", x, y0, y1] (a column
// cut: y0 on the upper side), ["p", x, y] (the band tapers to a point).
function track(ctx, st, fill, lw = 1.7) {
  const L = [], R = [];
  for (const [k, a, b, c] of st) {
    if (k === "r") { L.push([b, a]); R.push([c, a]); }
    else if (k === "c") { L.push([a, c]); R.push([a, b]); }
    else { L.push([a, b]); R.push([a, b]); }
  }
  shape(ctx, [...sampleCurve(R, 6), ...sampleCurve(L, 6).reverse()], fill, { lw });
}

function ribbonsBack(ctx) {
  // ----- left ribbon: enters top-left, sweeps down-right behind the sign, twisting on the way -----
  // Upper run (upper-right → lower-left): purple, magenta, orange, gold, cream. Purple ends at x ~390, magenta at
  // ~445, orange at ~505, gold at ~650; a second set (magenta, orange, gold, cream) emerges below them and carries
  // the ribbon on toward the mug. Stations measured on the source (pre-grade colour runs).
  const LC = [["r", -15, 49, 79], ["r", 0, 56, 85], ["r", 10, 61, 90], ["r", 20, 66, 97], ["r", 40, 80, 111], ["r", 60, 102, 128], ["r", 70, 113, 138], ["r", 80, 124, 149], ["r", 90, 137, 161], ["r", 100, 151, 175], ["r", 110, 167, 191], ["r", 120, 185, 210], ["r", 130, 206, 234], ["r", 140, 231, 262], ["r", 150, 267, 292],
    ["c", 360, 175, 178], ["c", 380, 186, 190], ["c", 400, 196, 204], ["c", 420, 210, 223], ["c", 440, 232, 248], ["c", 460, 258, 282], ["c", 480, 293, 303], ["c", 500, 318, 330], ["p", 512, 340]];
  const LG = [["r", -15, 79, 117], ["r", 0, 86, 123], ["r", 10, 91, 128], ["r", 20, 98, 133], ["r", 40, 112, 146], ["r", 60, 129, 164], ["r", 70, 139, 175], ["r", 80, 150, 187], ["r", 90, 162, 201], ["r", 100, 176, 216], ["r", 110, 192, 238], ["r", 120, 211, 263], ["r", 130, 235, 294], ["r", 140, 263, 321], ["r", 150, 293, 346],
    ["c", 380, 166, 185], ["c", 400, 176, 195], ["c", 420, 189, 205], ["c", 440, 203, 218], ["c", 460, 220, 237], ["c", 480, 241, 259], ["c", 500, 264, 286], ["c", 520, 291, 315], ["c", 540, 317, 341], ["c", 560, 340, 362], ["c", 580, 358, 380], ["c", 600, 376, 394], ["c", 620, 392, 404], ["c", 640, 407, 411], ["p", 652, 415]];
  const LO = [["r", -15, 117, 167], ["r", 0, 124, 172], ["r", 10, 129, 176], ["r", 20, 134, 182], ["r", 40, 147, 197], ["r", 60, 165, 218], ["r", 70, 176, 231], ["r", 80, 188, 246], ["r", 90, 202, 263], ["r", 100, 217, 284], ["r", 110, 239, 308], ["r", 120, 264, 333], ["r", 130, 295, 357], ["r", 140, 322, 377], ["r", 150, 347, 398],
    ["c", 420, 163, 189], ["c", 440, 178, 203], ["c", 460, 196, 220], ["c", 480, 223, 241], ["c", 500, 258, 264], ["p", 508, 272]];
  const LM = [["r", -15, 167, 215], ["r", 0, 173, 220], ["r", 10, 177, 224], ["r", 20, 183, 230], ["r", 40, 198, 242], ["r", 60, 219, 262], ["r", 70, 232, 274], ["r", 80, 247, 289], ["r", 90, 264, 305], ["r", 100, 285, 324], ["r", 110, 309, 346], ["r", 120, 334, 368], ["r", 130, 358, 387], ["r", 140, 378, 403], ["r", 150, 399, 415],
    ["c", 420, 153, 163], ["c", 440, 173, 178], ["p", 448, 183]];
  const LP = [["r", -15, 215, 267], ["r", 0, 221, 272], ["r", 10, 225, 275], ["r", 20, 231, 279], ["r", 40, 243, 291], ["r", 60, 263, 306], ["r", 70, 275, 316], ["r", 80, 290, 328], ["r", 90, 306, 339], ["r", 100, 325, 351], ["r", 110, 347, 364], ["r", 120, 369, 377], ["p", 392, 131]];
  const LM2 = [["p", 432, 214], ["c", 440, 218, 228], ["c", 460, 237, 256], ["c", 480, 259, 290], ["c", 500, 286, 318], ["c", 520, 315, 342], ["c", 540, 341, 372], ["c", 560, 362, 396], ["c", 580, 380, 412], ["c", 600, 394, 423], ["c", 620, 404, 431], ["c", 640, 411, 436],
    ["c", 660, 420, 441], ["c", 680, 427, 445], ["c", 700, 433, 450], ["c", 720, 441, 456], ["c", 740, 449, 463], ["c", 760, 460, 474], ["c", 780, 473, 485], ["c", 800, 489, 500], ["p", 818, 514]];
  const LO2 = [["p", 588, 421], ["c", 600, 423, 428], ["c", 620, 431, 440], ["c", 640, 436, 449], ["c", 660, 441, 458], ["c", 680, 445, 467], ["c", 700, 450, 471], ["c", 720, 456, 478], ["c", 740, 463, 487], ["c", 760, 474, 498], ["c", 780, 485, 511], ["c", 800, 500, 531], ["c", 820, 518, 562], ["c", 840, 542, 596], ["c", 860, 585, 640]];
  const LG2 = [["p", 688, 468], ["c", 700, 471, 480], ["c", 720, 478, 493], ["c", 740, 487, 509], ["c", 760, 498, 531], ["c", 780, 511, 569], ["c", 800, 531, 600], ["c", 815, 560, 640]];
  const LCB = [["p", 540, 398], ["c", 560, 400, 418], ["c", 580, 417, 431], ["c", 600, 430, 442], ["c", 620, 441, 451], ["c", 640, 450, 459], ["c", 660, 460, 468], ["c", 680, 468, 479], ["c", 700, 480, 491], ["c", 720, 493, 508], ["c", 740, 509, 530], ["c", 760, 531, 572], ["c", 780, 569, 612], ["c", 795, 600, 660]];
  for (const [st, col] of [[LC, HC.cream], [LG, HC.gold], [LO, HC.orange], [LM, HC.magenta], [LP, HC.purple], [LCB, HC.cream], [LG2, HC.gold], [LO2, HC.orange], [LM2, HC.magenta]]) track(ctx, st, col);

  // ----- lower-left rainbow arcs behind the speaker and the mug (x 600–800, y 585–800) -----
  const arcs = [
    [HC.pink, 584, 614], [HC.purple, 617, 642], [HC.orange, 645, 666], [HC.gold, 667, 690], [HC.cream, 691, 712],
    [HC.orange, 713, 724], [HC.purple, 725, 750], [HC.magenta, 750, 766], [HC.orange, 768, 792], [HC.pink, 792, 812],
  ];
  // the arcs sag toward the mug: extra depth at column x (added to both edges)
  const sag = (x) => (x < 690 ? 0 : Math.pow((x - 690) / 100, 2) * 34);
  for (const [col, a, b] of arcs) {
    const xs = [560, 600, 640, 680, 720, 760, 790, 812];
    bandCols(ctx, xs.map((x) => [x, a + sag(x) - (x < 640 ? (640 - x) * 0.05 : 0), b + sag(x)]), col, 2);
  }

  // ----- right ribbon: from the top edge past the nav, down behind the lamp to the desk -----
  bandRows(ctx, [[-12, 1904, 1954], [0, 1900, 1951], [15, 1893, 1945], [60, 1863, 1905], [75, 1848, 1888], [90, 1830, 1863], [105, 1811, 1833], [118, 1795, 1802], [124, 1790, 1791]], HC.purple);
  bandRows(ctx, [[-12, 1954, 1998], [0, 1952, 1994], [15, 1946, 1990], [60, 1906, 1947], [75, 1889, 1930], [90, 1864, 1903], [105, 1834, 1873], [120, 1801, 1834], [135, 1773, 1798], [150, 1753, 1769], [165, 1736, 1745], [172, 1729, 1731]], HC.magenta);
  bandRows(ctx, [[-12, 1998, 2050], [0, 1997, 2047], [15, 1991, 2038], [60, 1948, 2007], [75, 1931, 1994], [90, 1904, 1969], [105, 1874, 1945], [120, 1835, 1905], [135, 1799, 1862], [150, 1770, 1821], [165, 1746, 1787], [180, 1723, 1760], [195, 1710, 1738], [210, 1697, 1719], [225, 1686, 1703], [240, 1677, 1688], [255, 1670, 1676], [262, 1667, 1668]], HC.orange);
  bandRows(ctx, [[-12, 2050, 2088], [0, 2048, 2084], [15, 2039, 2081], [60, 2008, 2040], [75, 1995, 2025], [90, 1970, 2019], [105, 1946, 1991], [120, 1906, 1964], [135, 1863, 1925], [150, 1822, 1878], [165, 1788, 1833], [180, 1761, 1797], [195, 1739, 1770], [210, 1720, 1748], [225, 1704, 1734], [240, 1689, 1713], [255, 1677, 1698], [270, 1665, 1686], [285, 1655, 1676], [300, 1644, 1666], [315, 1633, 1656], [330, 1621, 1645], [345, 1607, 1632], [360, 1592, 1620], [375, 1576, 1602], [390, 1559, 1581], [400, 1548, 1566], [408, 1540, 1542]], HC.gold);
  bandRows(ctx, [[232, 1716, 1718], [240, 1713, 1722], [255, 1699, 1712], [270, 1687, 1702], [285, 1677, 1694], [300, 1666, 1686], [315, 1657, 1679], [330, 1645, 1669], [345, 1633, 1659], [360, 1621, 1647], [375, 1603, 1635], [390, 1582, 1620], [405, 1547, 1605], [420, 1509, 1586], [435, 1475, 1564], [450, 1446, 1535], [465, 1428, 1508], [480, 1412, 1470], [495, 1398, 1440]], HC.magenta);
  bandRows(ctx, [[412, 1590, 1592], [420, 1576, 1586], [435, 1526, 1564], [450, 1497, 1535], [465, 1470, 1508], [480, 1430, 1470], [495, 1400, 1432], [510, 1389, 1412], [525, 1377, 1410], [540, 1368, 1400], [555, 1363, 1392], [570, 1355, 1386], [585, 1342, 1376], [600, 1316, 1356], [615, 1308, 1332], [640, 1300, 1320], [700, 1330, 1370], [760, 1360, 1400], [840, 1380, 1420]], HC.orange);
  bandRows(ctx, [[490, 1398, 1426], [510, 1409, 1428], [525, 1407, 1432], [540, 1397, 1432], [555, 1389, 1424], [570, 1383, 1416], [585, 1374, 1408], [600, 1356, 1400], [615, 1330, 1380], [630, 1317, 1370], [645, 1322, 1370], [700, 1370, 1430], [760, 1400, 1450], [840, 1420, 1470]], HC.gold);
  bandRows(ctx, [[-12, 2088, 2112], [0, 2085, 2109], [15, 2082, 2105], [60, 2041, 2066], [75, 2026, 2047], [90, 2020, 2035], [105, 1992, 2009], [120, 1965, 1988], [135, 1926, 1956], [150, 1879, 1909], [165, 1834, 1851], [180, 1798, 1810], [195, 1771, 1787], [210, 1749, 1765], [225, 1735, 1750], [240, 1723, 1737], [255, 1713, 1727], [270, 1703, 1717], [285, 1695, 1710], [300, 1687, 1702], [315, 1679, 1695], [330, 1669, 1685], [345, 1659, 1675], [360, 1647, 1663], [375, 1635, 1650], [390, 1620, 1637], [405, 1605, 1621], [420, 1586, 1603], [435, 1564, 1581], [450, 1535, 1555], [465, 1508, 1524], [480, 1470, 1490], [495, 1432, 1446], [510, 1428, 1447], [525, 1431, 1459], [540, 1432, 1448], [555, 1424, 1439], [570, 1416, 1433], [585, 1408, 1420], [600, 1400, 1412], [645, 1370, 1386], [700, 1430, 1450], [760, 1450, 1470], [840, 1470, 1490]], HC.cream);
  bandRows(ctx, [[548, 1350, 1360], [555, 1345, 1362], [570, 1308, 1354], [585, 1294, 1342], [600, 1290, 1316], [615, 1288, 1310], [640, 1285, 1300], [700, 1300, 1330], [760, 1330, 1360], [840, 1350, 1380]], HC.purple);
}

// ---------- clouds ----------
// A cloud layer's top edge is a chain of scallops: cusps [[x, y], ...] and the peak height of each lobe between two
// cusps (tops[i] between cusps i and i+1). Each lobe is two cubic arcs with vertical tangents at the cusps, so the
// edge has the printed look: round puffs meeting in sharp notches. A soft layer ("s": polyline) is used for the
// airbrushed floors (blurred). Layers are clipped to the outer silhouette. Traced on the source at 117.0 s (page)
// and 92.0 s (the parts beyond the page edges that only the header banner shows).
function scallops(ctx, cusps, tops, base) {
  ctx.moveTo(cusps[0][0], base);
  ctx.lineTo(cusps[0][0], cusps[0][1]);
  for (let i = 0; i < tops.length; i++) {
    const [x0, y0] = cusps[i], [x1, y1] = cusps[i + 1], t = tops[i], xm = (x0 + x1) / 2;
    ctx.bezierCurveTo(x0, t + (y0 - t) * 0.2, xm - (xm - x0) * 0.56, t, xm, t);
    ctx.bezierCurveTo(xm + (x1 - xm) * 0.56, t, x1, t + (y1 - t) * 0.2, x1, y1);
  }
  ctx.lineTo(cusps[cusps.length - 1][0], base);
  ctx.closePath();
}
function softEdge(ctx, pts, base) {
  ctx.moveTo(pts[0][0], base);
  ctx.lineTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
  }
  const L = pts[pts.length - 1];
  ctx.lineTo(L[0], L[1]); ctx.lineTo(L[0], base); ctx.closePath();
}
function layerPath(ctx, L, base) {
  ctx.beginPath();
  if (L.s) softEdge(ctx, L.s, base); else scallops(ctx, L.c, L.t, base);
}
// keyline only along the top edge (the bottom and sides are hidden or cut by the frame)
function strokeTop(ctx, L, lw) {
  ctx.beginPath();
  const { c, t } = L;
  ctx.moveTo(c[0][0], c[0][1]);
  for (let i = 0; i < t.length; i++) {
    const [x0, y0] = c[i], [x1, y1] = c[i + 1], tt = t[i], xm = (x0 + x1) / 2;
    ctx.bezierCurveTo(x0, tt + (y0 - tt) * 0.2, xm - (xm - x0) * 0.56, tt, xm, tt);
    ctx.bezierCurveTo(xm + (x1 - xm) * 0.56, tt, x1, tt + (y1 - tt) * 0.2, x1, y1);
  }
  ctx.lineWidth = lw; ctx.strokeStyle = HC.line; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();
}
function cloud(ctx, C) {
  const { base, layers } = C;
  const outer = layers[0];
  ctx.save();
  layerPath(ctx, outer, base);
  let fill = outer.fill;
  if (outer.grad) { const g = ctx.createLinearGradient(0, outer.grad[0], 0, outer.grad[1]); g.addColorStop(0, outer.fill); g.addColorStop(1, outer.fill2); fill = g; }
  ctx.fillStyle = fill; ctx.fill();
  ctx.clip();
  for (let i = 1; i < layers.length; i++) {
    const L = layers[i];
    ctx.save();
    if (L.blur) ctx.filter = `blur(${L.blur}px)`;
    layerPath(ctx, L, base + 40);
    ctx.fillStyle = L.fill; ctx.fill();
    ctx.restore();
    if (L.lw) strokeTop(ctx, L, L.lw);
  }
  ctx.restore();
  if (outer.lw) strokeTop(ctx, outer, outer.lw);
}
const CL_PINK = "#e680b8", CL_PINK2 = "#d4549a", CL_CREAM = "#f8e1c0", CL_GOLD = "#f0b868", CL_CORAL = "#dc6a7e", CL_MAG = "#e2508e", CL_PEACH = "#f39a6c";
const CLOUDS = [
  // the long bank at top left: from beyond the page's left edge (header banner only) to behind the plant and the sign
  { base: 372, layers: [
    { c: [[-490, 150], [-334, 222], [-288, 232], [-170, 228], [-124, 220], [-76, 176], [18, 135], [148, 162], [218, 212], [266, 248], [334, 290], [462, 348]],
      t: [134, 218, 205, 214, 172, 116, 95, 176, 222, 254, 282], fill: CL_PINK, fill2: CL_PINK2, grad: [110, 330], lw: 2.4 },
    { c: [[-490, 226], [-346, 292], [-290, 304], [-152, 334], [-92, 242], [-38, 224], [14, 189], [134, 204], [206, 230], [262, 264], [330, 305]],
      t: [220, 279, 272, 236, 212, 184, 145, 199, 235, 262], fill: CL_CREAM, lw: 2 },
    { s: [[-490, 257], [-424, 257], [-400, 259], [-384, 271], [-368, 283], [-352, 296], [-340, 305], [-312, 307], [-296, 322], [-288, 327], [-270, 318], [-248, 308], [-224, 308], [-200, 317], [-184, 329], [-168, 351], [-144, 346], [-122, 349], [-115, 300], [-110, 264], [-96, 259], [-80, 256], [-64, 242], [-48, 239], [-32, 235], [-24, 218], [-8, 210], [0, 209], [20, 212], [30, 209], [40, 195], [60, 183], [75, 182], [90, 186], [100, 193], [110, 206], [118, 228], [150, 230], [200, 238], [260, 262], [330, 300], [470, 330]], fill: CL_GOLD, blur: 6 },
    { s: [[-490, 300], [-400, 302], [-352, 322], [-300, 345], [-232, 352], [-200, 360], [-160, 366], [-120, 354], [-112, 272], [-64, 266], [-32, 268], [-8, 254], [0, 251], [20, 244], [60, 238], [80, 237], [100, 247], [120, 249], [140, 266], [180, 273], [230, 282], [330, 305], [470, 340]], fill: CL_CORAL, blur: 8 },
    { s: [[-490, 343], [-400, 349], [-384, 362], [-340, 361], [-300, 382], [-200, 392], [-122, 378], [-108, 288], [-60, 280], [0, 273], [20, 262], [50, 256], [60, 248], [80, 254], [100, 268], [130, 272], [160, 276], [185, 282], [250, 292], [330, 300], [470, 320]], fill: CL_MAG, blur: 8 },
  ] },
  // centre-left cream cloud over the gear, airbrushed peach-orange to magenta
  { base: 760, layers: [
    { c: [[424, 530], [548, 490], [612, 526], [672, 570], [742, 604]], t: [447, 478, 540, 566], fill: CL_CREAM },
    { s: [[424, 500], [446, 488], [470, 480], [500, 484], [518, 505], [548, 509], [572, 518], [596, 545], [640, 575], [700, 600], [742, 620]], fill: CL_PEACH, blur: 10 },
    { s: [[424, 540], [470, 548], [520, 556], [560, 562], [600, 572], [650, 590], [700, 612], [742, 630]], fill: CL_MAG, blur: 12 },
  ] },
  // right: pink cloud rising behind the headphones box
  { base: 660, layers: [
    { c: [[1540, 500], [1600, 470], [1645, 450], [1722, 405], [1792, 352], [1906, 332]], t: [462, 442, 396, 345, 296], fill: CL_PINK, fill2: CL_PINK2, grad: [300, 520] },
    { c: [[1736, 440], [1830, 398], [1906, 392]], t: [378, 372], fill: CL_CREAM },
    { s: [[1736, 470], [1800, 440], [1850, 436], [1906, 440]], fill: CL_PEACH, blur: 9 },
  ] },
  // right: cream cloud low behind the lamp arm and the second speaker
  { base: 720, layers: [
    { c: [[1440, 600], [1500, 558], [1560, 540], [1640, 540], [1684, 572]], t: [552, 532, 512, 545], fill: CL_CREAM },
    { s: [[1440, 590], [1500, 572], [1545, 566], [1580, 560], [1620, 558], [1684, 580]], fill: CL_PEACH, blur: 8 },
    { s: [[1440, 610], [1520, 600], [1570, 590], [1610, 586], [1684, 600]], fill: "#e8704e", blur: 9 },
    { s: [[1440, 640], [1540, 630], [1620, 628], [1684, 640]], fill: CL_MAG, blur: 11 },
  ] },
  // beyond the right page edge (header banner only): pink bank with a keylined cream heart and an airbrushed floor
  { base: 480, layers: [
    { c: [[2226, 230], [2300, 212], [2430, 214], [2476, 210], [2700, 160]], t: [184, 193, 205, 118], fill: CL_PINK, fill2: CL_PINK2, grad: [120, 380], lw: 2.4 },
    { c: [[2226, 330], [2300, 320], [2432, 290], [2490, 272], [2700, 220]], t: [300, 259, 263, 203], fill: CL_CREAM, lw: 2 },
    { s: [[2226, 340], [2318, 334], [2334, 310], [2366, 295], [2390, 293], [2414, 300], [2438, 313], [2454, 293], [2486, 288], [2502, 274], [2526, 249], [2550, 240], [2574, 237], [2600, 244], [2700, 250]], fill: CL_GOLD, blur: 6 },
    { s: [[2226, 380], [2320, 372], [2400, 330], [2440, 345], [2500, 318], [2560, 280], [2700, 290]], fill: "#e8704e", blur: 8 },
    { s: [[2226, 410], [2300, 400], [2422, 362], [2486, 344], [2518, 346], [2600, 330], [2700, 335]], fill: CL_MAG, blur: 8 },
  ] },
  // far right: cream cloud behind the owl's tower (overlaps the pink bank's left end)
  { base: 480, layers: [
    { c: [[2094, 240], [2150, 200], [2266, 196]], t: [172, 140], fill: CL_CREAM },
    { s: [[2094, 200], [2124, 184], [2140, 206], [2160, 208], [2176, 199], [2192, 185], [2206, 179], [2222, 181], [2254, 184], [2266, 200]], fill: CL_PEACH, blur: 6 },
    { s: [[2094, 222], [2124, 221], [2160, 228], [2180, 233], [2204, 229], [2246, 222], [2266, 230]], fill: "#e8704e", blur: 8 },
    { s: [[2094, 290], [2200, 280], [2266, 290]], fill: CL_MAG, blur: 10 },
  ] },
  { base: 560, layers: [
    { c: [[2136, 380], [2210, 332], [2300, 360]], t: [352, 318], fill: CL_CREAM },
    { s: [[2136, 380], [2166, 369], [2190, 359], [2210, 356], [2300, 370]], fill: CL_PEACH, blur: 7 },
    { s: [[2136, 400], [2166, 390], [2200, 389], [2300, 400]], fill: "#e8704e", blur: 8 },
  ] },
];
function clouds(ctx) { for (const c of CLOUDS) cloud(ctx, c); }

// ---------- headline ----------
// Two lines of chunky retro lettering: a cream face (yellow for "late") with a thin ink line, over a stacked
// extrusion stepping down-right in orange, magenta and purple, each step keylined. Letterforms: Shrikhand with its
// 14° slant taken out, each glyph fitted to the ink box measured on the source (left, right, top, bottom) — the
// source letters are narrower than Shrikhand's and bounce along a gently waving baseline (the "M" leans back).
// Outlines are made by dilating the rendered silhouettes, so they stay even under the per-glyph squash.
const SLANT = 0.2493; // tan 14°
// Shrikhand ink bounds with the slant removed (font units, y up): [xmin, ymin, xmax, ymax]
const GLYPH_BOX = {
  M: [-11, 0, 959, 666], i: [-48, 0, 294, 750], x: [-52, -4, 531, 529], n: [-48, -9, 649, 529], g: [-82, -200, 593, 692],
  d: [-47, -3, 588, 739], o: [-48, -9, 578, 529], w: [-62, -9, 851, 529], ",": [-32, -154, 189, 202], l: [-53, 0, 289, 739],
  a: [-42, -3, 587, 529], t: [-82, -9, 374, 638], e: [-48, -3, 488, 534], h: [-53, -9, 643, 739], ".": [-18, -3, 190, 202],
};
// [char, left, right, top, bottom, rotation, colour] measured at 117.0 s (page px)
export const HEADLINE_GLYPHS = [
  ["M", 682, 819, 91, 217, -0.15, "cream"], ["i", 822, 860, 94, 195, 0, "cream"], ["x", 852, 932, 126, 197, 0, "cream"],
  ["i", 933, 962, 93, 194, 0, "cream"], ["n", 964, 1035, 118, 194, 0, "cream"], ["g", 1030, 1115, 114, 235, 0, "cream"],
  ["d", 1130, 1205, 95, 198, 0, "cream"], ["o", 1202, 1275, 122, 197, 0, "cream"], ["w", 1271, 1372, 120, 202, 0, "cream"],
  ["n", 1367, 1440, 126, 210, 0.03, "cream"], [",", 1437, 1465, 185, 230, 0, "cream"],
  ["l", 740, 784, 236, 335, 0.06, "yellow"], ["a", 793, 853, 262, 325, 0, "yellow"], ["t", 852, 900, 237, 322, 0, "yellow"],
  ["e", 895, 967, 250, 322, 0, "yellow"],
  ["a", 989, 1052, 251, 320, 0, "cream"], ["t", 1050, 1099, 237, 320, 0, "cream"],
  ["n", 1117, 1182, 260, 320, 0, "cream"], ["i", 1185, 1215, 227, 320, 0, "cream"], ["g", 1212, 1287, 245, 350, 0, "cream"],
  ["h", 1289, 1352, 235, 330, 0, "cream"], ["t", 1352, 1405, 249, 337, 0, "cream"], [".", 1408, 1437, 311, 340, 0, "cream"],
];
// extrusion steps (dx, dy, colour), back to front
export const HEADLINE_STEPS = [[22, 27, "purple"], [17, 22, "magenta"], [10, 12, "orange"]];
const HB = { x: 640, y: 60, w: 900, h: 330 }; // working box for the headline layers (page px)
const FIT = 1.8, FAT = 1.8, KEY = 2.4; // box inset, face dilation (chunkier strokes), keyline width

function glyphPaint(g, color, only) {
  const col = { cream: HC.paper, yellow: HC.yellow };
  g.textBaseline = "alphabetic";
  g.font = "400 100px Shrikhand";
  for (const [ch, l, r, t, b, rot, c] of HEADLINE_GLYPHS) {
    const [x0, y0, x1, y1] = GLYPH_BOX[ch];
    const sx = (r - l) / ((x1 - x0) * 0.1), sy = (b - t) / ((y1 - y0) * 0.1);
    const cx = (l + r) / 2, cy = (t + b) / 2;
    g.save();
    // fit inside the measured ink box less the dilation + keyline added afterwards (FIT px per side)
    g.translate(cx - HB.x, cy - HB.y); g.rotate(rot); g.scale((r - l - 2 * FIT) / (r - l), (b - t - 2 * FIT) / (b - t)); g.translate(-(r - l) / 2, (b - t) / 2);
    // ink box → (0..w, -h..0): x = (X - x0) * 0.1 * sx ; y = -(Y - y0) * 0.1 * sy
    g.scale(sx, sy); g.translate(-x0 * 0.1, y0 * 0.1);
    g.transform(1, 0, SLANT, 1, 0, 0);
    g.fillStyle = color || col[c];
    g.fillText(ch, 0, 0);
    g.restore();
  }
}
let headCache = null;
const HS = 2; // headline layers are built at 2x (the banner draws them enlarged)
function headlineLayers() {
  if (headCache) return headCache;
  const W2 = HB.w * HS, H2 = HB.h * HS;
  const mk = () => { const c = document.createElement("canvas"); c.width = W2; c.height = H2; return c; };
  const face0 = mk(), mask0 = mk();
  { const g = face0.getContext("2d"); g.scale(HS, HS); glyphPaint(g); }
  { const g = mask0.getContext("2d"); g.scale(HS, HS); glyphPaint(g, "#fff"); }
  // dilate: the source letters are fatter than Shrikhand's
  const fatten = (src) => { const c = mk(), g = c.getContext("2d"); for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; g.drawImage(src, Math.cos(a) * FAT * HS, Math.sin(a) * FAT * HS); } g.drawImage(src, 0, 0); return c; };
  const face = fatten(face0), mask = fatten(mask0);
  const tint = (col) => { const c = mk(), g = c.getContext("2d"); g.drawImage(mask, 0, 0); g.globalCompositeOperation = "source-in"; g.fillStyle = col; g.fillRect(0, 0, W2, H2); return c; };
  const dark = tint(HC.line);
  const out = mk(), g = out.getContext("2d");
  const ring = (dx, dy, r) => { for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; g.drawImage(dark, (dx + Math.cos(a) * r) * HS, (dy + Math.sin(a) * r) * HS); } };
  const col = { purple: HC.purple, magenta: HC.magenta, orange: HC.orange };
  for (const [dx, dy, c] of HEADLINE_STEPS) {
    ring(dx, dy, KEY);
    g.drawImage(tint(col[c]), dx * HS, dy * HS);
  }
  ring(0, 0, KEY);
  g.drawImage(face, 0, 0);
  headCache = out;
  return out;
}
function headline(ctx) {
  ctx.drawImage(headlineLayers(), HB.x, HB.y, HB.w, HB.h);
}

// ---------- nav rail ----------
export const NAV = [
  // label, dot colour, sub, pill x0, x1
  ["objects", "#e8603f", "instruments · tools · spares", 1532, 1710],
  ["radio", "#d8338c", "live · archive · zine", 1726, 1862],
  ["store", "#6a4fb0", "cart · offers · gift", 1878, 1996],
  ["index", "#e9b43a", "manuals · support", 2022, 2161],
];
function nav(ctx) {
  ctx.save();
  // brand: quartered disc with a cream pill, and the wordmark
  ctx.save(); ctx.translate(41, 39);
  const q = [HC.orange, HC.gold, HC.purple, HC.magenta];
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 17, -Math.PI / 2 + (i * Math.PI) / 2, (i * Math.PI) / 2); ctx.closePath(); ctx.fillStyle = q[i]; ctx.fill(); }
  ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.lineWidth = 3.5; ctx.strokeStyle = HC.cream; ctx.stroke();
  ctx.restore();
  rrect(ctx, 58, 18, 22, 42, 11, HC.cream, 0);
  ctx.font = "600 21px Poppins"; ctx.fillStyle = withAlpha("#f6ecd6", 0.72);
  ctx.fillText("sōko", 95, 34); ctx.fillText("objects", 95, 56);
  // pills
  for (const [label, dot, sub, x0, x1] of NAV) {
    const y0 = 16, h = 42;
    ctx.beginPath(); ctx.roundRect(x0, y0, x1 - x0, h, h / 2);
    ctx.fillStyle = "rgba(34,31,39,0.82)"; ctx.fill();
    ctx.lineWidth = 2.2; ctx.strokeStyle = "rgba(246,236,214,0.62)"; ctx.stroke();
    circle(ctx, x0 + 22, y0 + 21, 10.5, dot, 2.6, HC.cream);
    ctx.font = "600 20px Poppins"; ctx.fillStyle = HC.cream; ctx.fillText(label, x0 + 42, y0 + 22);
    ctx.font = "500 8.5px Poppins"; ctx.fillStyle = "rgba(246,236,214,0.55)"; ctx.fillText(sub, x0 + 42, y0 + 34);
  }
  ctx.restore();
}

// ---------- print texture: fine grain + faint dust, over everything ----------
let grainTile = null;
function grain(ctx, x0, y0, w, h) {
  if (!grainTile) {
    grainTile = document.createElement("canvas"); grainTile.width = grainTile.height = 256;
    const g = grainTile.getContext("2d"), im = g.createImageData(256, 256), r = rng(907);
    for (let i = 0; i < 256 * 256; i++) { const v = r(); const a = v < 0.5 ? 0 : 255; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = a; im.data[i * 4 + 3] = Math.floor(Math.abs(v - 0.5) * 2 * 60); }
    g.putImageData(im, 0, 0);
  }
  // soft-light: the grain shows on the light inks and barely touches the dark sky (as in the print)
  ctx.save(); ctx.globalCompositeOperation = "soft-light"; ctx.fillStyle = ctx.createPattern(grainTile, "repeat"); ctx.fillRect(x0, y0, w, h); ctx.restore();
}

// ---------- the scene (boxes, gear, the designer, the desk) ----------
// A cardboard box seen from the front-left or front-right: a front face and one side face (quad), keylined, with
// optional tape patches ([x, y, w, h] in page px, drawn as darker translucent strips).
// Soft cel shading: a face darkens a little toward its lower edge and picks up a faint warm light at the top.
function shade(ctx, pts, k = 0.16) {
  let y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, "rgba(255,236,210,0.10)"); g.addColorStop(0.45, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(60,20,40,${k})`);
  ctx.beginPath(); poly(ctx, pts); ctx.fillStyle = g; ctx.fill();
}
function box(ctx, front, side, cf, cs, tapes = [], lw = 2.6) {
  if (side) { shape(ctx, side, cs, { lw: 0 }); shade(ctx, side, 0.22); shape(ctx, side, null, { lw }); }
  shape(ctx, front, cf, { lw: 0 }); shade(ctx, front); shape(ctx, front, null, { lw });
  ctx.fillStyle = "rgba(40,20,30,0.55)";
  for (const [x, y, w, h] of tapes) ctx.fillRect(x, y, w, h);
}
const R4 = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
// heart-shaped pothos leaf at (x, y) pointing along angle a (radians, 0 = right), length L
function leaf(ctx, x, y, a, L, fill = HC.green, vein = true) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  const w = L * 0.5;
  // heart: a notch at the stalk, two round lobes, a pointed tip
  const heart = () => {
    ctx.beginPath();
    ctx.moveTo(L * 0.14, 0);
    ctx.bezierCurveTo(-L * 0.06, -w * 0.35, L * 0.02, -w * 1.05, L * 0.36, -w * 0.98);
    ctx.bezierCurveTo(L * 0.66, -w * 0.92, L * 0.86, -w * 0.4, L, 0);
    ctx.bezierCurveTo(L * 0.86, w * 0.4, L * 0.66, w * 0.92, L * 0.36, w * 0.98);
    ctx.bezierCurveTo(L * 0.02, w * 1.05, -L * 0.06, w * 0.35, L * 0.14, 0);
    ctx.closePath();
  };
  heart(); ctx.fillStyle = fill; ctx.fill();
  // the shaded half
  ctx.save(); ctx.clip(); ctx.fillStyle = "rgba(60,80,20,0.38)"; ctx.fillRect(-L * 0.1, 0, L * 1.2, w * 1.2); ctx.restore();
  heart(); ctx.lineWidth = 2; ctx.strokeStyle = HC.line; ctx.lineJoin = "round"; ctx.stroke();
  if (vein) { ctx.beginPath(); ctx.moveTo(L * 0.16, 0); ctx.quadraticCurveTo(L * 0.5, -L * 0.03, L * 0.84, 0); ctx.lineWidth = 1.2; ctx.strokeStyle = "rgba(40,60,20,0.75)"; ctx.stroke(); }
  ctx.restore();
}
// a potted pothos: stems fan out of the pot mouth (cx, cy) at angles a0..a1 (deg), each ending in a heart leaf,
// with a second leaf part-way along some stems. Seeded.
function pothos(ctx, cx, cy, a0, a1, n, len, leafL, seed) {
  const r = rng(seed), list = [];
  for (let i = 0; i < n; i++) {
    const a = ((a0 + (a1 - a0) * (i + r() * 0.8) / n) * Math.PI) / 180, l = len * (0.55 + r() * 0.6);
    const ex = cx + Math.cos(a) * l, ey = cy + Math.sin(a) * l;
    line(ctx, [[cx, cy], [cx + Math.cos(a) * l * 0.5 + (r() - 0.5) * 8, cy + Math.sin(a) * l * 0.5 - 6], [ex, ey]], 1.8, "#2c3a18", true);
    // the leaves droop: they hang from the stem tip, tilted outward on the sides
    const deg = (a * 180) / Math.PI, droop = 90 + (deg + 90) * 0.45 + (r() - 0.5) * 40;
    list.push([ex, ey - leafL * 0.1, droop, leafL * (0.8 + r() * 0.35), (r() * 4) | 0]);
    if (r() < 0.5) { const u = 0.45 + r() * 0.2; list.push([cx + Math.cos(a) * l * u, cy + Math.sin(a) * l * u - 4, droop + (r() < 0.5 ? -35 : 35), leafL * 0.75, (r() * 4) | 0]); }
  }
  // back to front: the higher leaves first
  list.sort((p, q) => p[1] - q[1]);
  leaves(ctx, list);
}
// a trailing vine: leaves alternating left and right down a curve
function vine(ctx, pts, n, leafL, seed) {
  const P = sampleCurve(pts, 10), r = rng(seed), list = [];
  line(ctx, pts, 2, "#3d5222", true);
  for (let i = 0; i < n; i++) {
    const k = Math.min(P.length - 2, Math.floor(((i + 0.5) / n) * (P.length - 1)));
    const [x, y] = P[k], [x2, y2] = P[k + 1], ang = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;
    list.push([x, y, ang + (i % 2 ? 55 : -55) + (r() - 0.5) * 20, leafL * (0.85 + r() * 0.3), (r() * 4) | 0]);
  }
  leaves(ctx, list);
}
// a leafy clump: list of [x, y, angle(deg), length, shade]
function leaves(ctx, list) {
  const sh = ["#93a948", "#a3b454", "#7f963c", "#adbd5c"];
  for (const [x, y, deg, L, k = 0] of list) leaf(ctx, x, y, (deg * Math.PI) / 180, L, sh[k]);
}
function knob(ctx, x, y, r, fill = "#1a1518", rim = "#4a434a") {
  circle(ctx, x, y, r, fill, 1.4, HC.line);
  ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, TAU); ctx.lineWidth = 1; ctx.strokeStyle = rim; ctx.stroke();
}
function cable(ctx, pts, w = 5, col = "#1d1719") {
  line(ctx, pts, w + 2, HC.line, true);
  line(ctx, pts, w, col, true);
  ctx.save(); ctx.globalAlpha = 0.35; line(ctx, pts.map(([x, y]) => [x - w * 0.18, y - w * 0.22]), w * 0.25, "#6a6068", true); ctx.restore();
}

// ----- left wall of boxes, the plant, the sign -----
function sceneLeftBack(ctx) {
  // lavender box at the far left, pink box behind the cream one
  box(ctx, R4(-20, 408, 38, 480), null, HC.lav);
  box(ctx, R4(-20, 344, 60, 420), null, "#e468a5", [[30, 344, 22, 26]]);
  // box A (cream), top of the stack
  box(ctx, [[20, 298], [142, 280], [142, 372], [20, 380]], [[142, 280], [215, 292], [215, 372], [142, 372]], "#f2dcc0", "#e2c2ad", [[74, 294, 26, 24]]);
  // box B (gold front, pale side)
  box(ctx, [[40, 378], [156, 365], [156, 455], [40, 455]], [[156, 365], [252, 378], [252, 455], [156, 455]], "#f3b666", "#f1cda8", [[76, 374, 30, 34], [205, 372, 20, 30]]);
  rect(ctx, 74, 438, 38, 16, "#f6e6d4", 2);
  // box C (magenta front, peach side)
  box(ctx, R4(8, 448, 152, 575), [[152, 448], [258, 458], [258, 575], [152, 575]], "#d8378e", "#ec9370", [[70, 448, 30, 40], [205, 458, 22, 34]]);
  // coiled black cable hanging off the stack
  for (let i = 0; i < 7; i++) {
    ctx.beginPath(); ctx.ellipse(276, 400 + i * 20, 22, 30, 0.1, 0, TAU);
    ctx.lineWidth = 5; ctx.strokeStyle = HC.line; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = "#2a2226"; ctx.stroke();
  }
  // blue pot and the pothos, trailing down to the gear
  shape(ctx, [[196, 352], [276, 344], [270, 402], [206, 404]], "#6f7fb8");
  shape(ctx, [[192, 346], [280, 338], [282, 352], [194, 360]], "#8e9ed0", { lw: 2 });
  pothos(ctx, 238, 346, -178, -2, 11, 92, 52, 41);
  // trailing vine down past the coiled cable
  vine(ctx, [[292, 352], [312, 400], [318, 450], [322, 500], [318, 545]], 9, 36, 43);
  // the hanging sign: nail, two wires, cream board, screws, lettering
  line(ctx, [[360, 358], [437, 277], [523, 333]], 2.2, HC.line);
  circle(ctx, 437, 276, 4, "#3a3034", 1.5);
  shape(ctx, [[352, 353], [531, 321], [543, 403], [367, 437]], "#f7e6d2", { lw: 3 });
  for (const [x, y] of [[362, 363], [523, 333], [533, 397], [374, 426]]) circle(ctx, x, y, 3.6, "#3a3034", 1.2);
  ctx.save(); ctx.translate(448, 380); ctx.rotate(-0.18);
  ctx.fillStyle = "#e2bb6e"; ctx.textAlign = "center";
  ctx.font = "600 27px Archivo"; ctx.fontStretch = "condensed"; ctx.letterSpacing = "0.5px";
  ctx.fillText("MIXING.", 8, -8); ctx.fillText("DO NOT KNOCK.", 0, 24);
  ctx.letterSpacing = "0px"; ctx.fontStretch = "normal"; ctx.textAlign = "left";
  ctx.restore();
}

function sceneLeftMid(ctx) {
  // box D (gold) with a sheet of paper on top
  box(ctx, R4(98, 552, 242, 668), [[242, 552], [300, 560], [300, 668], [242, 668]], "#f4b55f", "#f6c98c", [[165, 552, 36, 40]]);
  shape(ctx, [[168, 536], [282, 530], [292, 548], [176, 553]], "#f6ede2", { lw: 2 });
  // guitar case, leaning at the far left
  shape(ctx, [[-10, 540], [8, 518], [40, 510], [80, 514], [100, 530], [100, 718], [92, 730], [0, 732], [-10, 724]], "#2e2428", { lw: 3 });
  line(ctx, [[34, 522], [22, 560], [18, 640], [22, 720]], 2.2, "#cfc4bf", true);
  line(ctx, [[82, 530], [86, 620], [86, 716]], 1.6, "#58505a", true);
  rrect(ctx, 64, 554, 26, 20, 3, "#d9cfc9", 1.8); rrect(ctx, 56, 660, 26, 20, 3, "#d9cfc9", 1.8);
  // blue amp box on top of the drum machine
  shape(ctx, [[286, 548], [376, 540], [396, 548], [396, 612], [290, 614]], "#7f9fd6", { lw: 2.6 });
  shape(ctx, [[286, 548], [376, 540], [396, 548], [304, 556]], "#a8c0e8", { lw: 2 });
  rect(ctx, 330, 552, 26, 18, "#1e1a22", 2); rect(ctx, 370, 556, 16, 24, "#1e1a22", 2);
  rect(ctx, 312, 590, 40, 7, "#dfe6f2", 1.4);
  // drum machine: black face with a grid of pads/knobs
  shape(ctx, [[252, 598], [398, 596], [402, 694], [254, 700]], "#2b2328", { lw: 2.8 });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) knob(ctx, 272 + c * 17.5, 614 + r * 21, 6.2);
  // keyboard synth, angled across the gold box
  shape(ctx, [[100, 662], [250, 648], [334, 662], [334, 718], [104, 726]], "#221c21", { lw: 3 });
  ctx.save();
  for (let i = 0; i < 17; i++) {
    const x = 176 + i * 9.2, y = 678 + i * 0.6;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 8, y + 1); ctx.lineTo(x + 7, y + 26); ctx.lineTo(x - 1, y + 25); ctx.closePath();
    ctx.fillStyle = "#efe2d6"; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = HC.line; ctx.stroke();
  }
  ctx.restore();
  for (let i = 0; i < 12; i++) knob(ctx, 128 + i * 15, 668 - i * 0.6, 5, "#141013");
  line(ctx, [[112, 702], [168, 694]], 1.6, "#6d6570");
  // flight case (black with cream rails and metal corners) under the keyboard
  shape(ctx, [[96, 722], [398, 718], [400, 904], [98, 906]], "#231c20", { lw: 3 });
  shape(ctx, [[98, 720], [396, 716], [398, 736], [100, 740]], "#ead0bc", { lw: 2.2 });
  rect(ctx, 220, 736, 22, 170, "#ead0bc", 2.2);
  rect(ctx, 382, 736, 16, 170, "#ead0bc", 2.2);
  for (const [x, y] of [[212, 724], [372, 720]]) { shape(ctx, [[x, y], [x + 38, y], [x + 38, y + 16], [x + 26, y + 28], [x + 12, y + 28], [x, y + 16]], "#e2d6cc", { lw: 2 }); circle(ctx, x + 19, y + 12, 3, HC.line); }
  for (const [x, y] of [[100, 890], [382, 888]]) rect(ctx, x, y, 16, 14, "#e2d6cc", 1.8);
  // box F (salmon) at the bottom left
  box(ctx, R4(-10, 725, 112, 810), null, "#ee9a7e");
  // the black speaker (yellow woofer) and its teal side
  shape(ctx, [[544, 650], [612, 658], [612, 882], [544, 882]], "#4c6f72", { lw: 2.6 });
  shape(ctx, [[428, 648], [544, 650], [546, 882], [430, 884]], "#231d21", { lw: 3 });
  knob(ctx, 487, 683, 17, "#1a1518", "#6a646c");
  circle(ctx, 487, 752, 48, "#171215", 2.6); circle(ctx, 487, 752, 39, "#eea75a", 2); circle(ctx, 487, 752, 29, "#f3bd6c", 0);
  ctx.beginPath(); ctx.arc(487, 752, 32, 0, TAU); ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(120,60,20,0.6)"; ctx.stroke();
  circle(ctx, 487, 752, 13, "#1d1719", 2);
  // books on the speaker
  const bookStack = (x0, y0, list) => { let y = y0; for (const [dx, w, h, cover] of list) { rect(ctx, x0 + dx, y - h, w, h, cover, 2); rect(ctx, x0 + dx + 4, y - h + 3, w - 8, h - 6, "#f3e4d6", 0); y -= h; } };
  bookStack(440, 650, [[4, 132, 14, "#d86f8a"], [0, 128, 12, "#e9d7c7"], [8, 120, 13, "#cf6f8f"], [2, 110, 12, "#e8d5c2"], [10, 100, 11, "#d8a1a1"]]);
  rect(ctx, 498, 574, 62, 20, "#221c21", 2);
  // a second pothos spilling over the gear in front of the cream cloud
  line(ctx, [[420, 600], [440, 560], [470, 520], [520, 500]], 2.2, "#3d5a22", true);
  line(ctx, [[430, 600], [400, 560], [380, 520]], 2.2, "#3d5a22", true);
  leaves(ctx, [[440, 596, -120, 44, 0], [452, 580, -70, 46, 1], [470, 556, -100, 44, 0], [488, 536, -60, 42, 3], [500, 516, -110, 40, 1], [516, 504, -40, 40, 0],
    [534, 506, 10, 38, 2], [420, 578, -150, 42, 1], [404, 556, -110, 40, 0], [386, 532, -140, 38, 3], [380, 506, -90, 36, 0], [456, 606, -20, 40, 2], [478, 590, -30, 38, 0],
    [410, 600, 170, 38, 2], [500, 560, 20, 36, 1], [520, 540, -20, 36, 0]]);
  // tan rack device with two dark windows, cables behind
  shape(ctx, [[590, 600], [640, 598], [642, 700], [592, 702]], "#dcb07c", { lw: 2.4 });
  rect(ctx, 600, 612, 10, 16, "#221c21", 1.5); rect(ctx, 618, 612, 10, 16, "#221c21", 1.5);
  cable(ctx, [[640, 610], [668, 640], [660, 700], [640, 760], [630, 830]], 4);
  cable(ctx, [[628, 600], [650, 660], [620, 720], [600, 790]], 4);
}

function sceneLeftFront(ctx) {
  // daisy with a smiley face
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + 0.2;
    ctx.save(); ctx.translate(78 + Math.cos(a) * 42, 805 + Math.sin(a) * 42); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(0, 0, 30, 17, 0, 0, TAU); ctx.fillStyle = "#fbe6d8"; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = HC.line; ctx.stroke();
    ctx.restore();
  }
  circle(ctx, 78, 805, 31, "#e2a45e", 2.6);
  circle(ctx, 69, 797, 3.2, HC.line); circle(ctx, 88, 797, 3.2, HC.line);
  ctx.beginPath(); ctx.arc(78, 806, 14, 0.25, Math.PI - 0.25); ctx.lineWidth = 2.4; ctx.strokeStyle = HC.line; ctx.stroke();
  // big leaves around the daisy and the pedal
  line(ctx, [[180, 905], [178, 840], [170, 790]], 3, "#4f6a2a", true);
  line(ctx, [[196, 900], [220, 860], [248, 830]], 2.6, "#4f6a2a", true);
  leaves(ctx, [[176, 842, -96, 100, 0], [214, 866, -48, 82, 1], [168, 868, -150, 72, 2], [248, 832, -40, 74, 0], [36, 930, -64, 78, 0],
    [8, 896, -104, 64, 1], [84, 936, -22, 64, 2], [292, 884, -62, 62, 3], [120, 908, -120, 56, 0]]);
  // pedal with three knobs
  shape(ctx, [[168, 880], [264, 874], [266, 904], [170, 908]], "#e7cfc0", { lw: 2.4 });
  for (const x of [196, 214, 232, 250]) { rect(ctx, x - 6, 862, 12, 16, "#221c21", 1.4); }
  for (const x of [180, 214, 248]) circle(ctx, x, 894, 3, HC.line);
  // cables spilling from the drum machine over the flight case to the floor
  cable(ctx, [[300, 690], [290, 740], [320, 800], [300, 860], [330, 920]], 4.5);
  cable(ctx, [[330, 692], [350, 760], [410, 790], [460, 830], [470, 900]], 4.5);
  cable(ctx, [[360, 694], [372, 760], [352, 820], [380, 880], [440, 930]], 4);
  cable(ctx, [[390, 690], [420, 740], [470, 760], [520, 800], [540, 880]], 4);
  cable(ctx, [[270, 940], [320, 905], [400, 900], [470, 925], [540, 915]], 4);
  // yellow box, pink box with the cream amp on it
  box(ctx, R4(274, 786, 336, 912), null, "#ecb46a");
  box(ctx, R4(330, 820, 500, 946), null, "#de4f86");
  shape(ctx, [[338, 808], [490, 804], [494, 866], [340, 868]], "#f0d9c8", { lw: 2.6 });
  rect(ctx, 344, 808, 146, 12, "#d8c2b4", 2);
  line(ctx, [[420, 842], [440, 842]], 2); circle(ctx, 381, 841, 3.4, HC.line);
  rrect(ctx, 460, 830, 26, 18, 3, null, 2);
  // magenta milk crate with an X lattice
  shape(ctx, [[548, 890], [700, 888], [702, 950], [548, 950]], "#2a1422", { lw: 2.8 });
  ctx.save(); ctx.beginPath(); ctx.rect(552, 906, 146, 44); ctx.clip();
  ctx.strokeStyle = "#c23a8e"; ctx.lineWidth = 5;
  for (let x = 552; x < 700; x += 36) { ctx.beginPath(); ctx.moveTo(x, 906); ctx.lineTo(x, 950); ctx.stroke(); }
  ctx.strokeStyle = "#e46fb3"; ctx.lineWidth = 3;
  for (let x = 540; x < 720; x += 36) { ctx.beginPath(); ctx.moveTo(x, 892); ctx.lineTo(x + 36, 950); ctx.moveTo(x + 36, 892); ctx.lineTo(x, 950); ctx.stroke(); }
  ctx.restore();
  rect(ctx, 552, 892, 146, 14, "#c9489a", 2);
  // orange block and floor
  box(ctx, R4(498, 904, 548, 950), null, "#d9584a");
  // books under the mug, a cream deck on top
  const pages = (x, y, w, h, cover) => { rect(ctx, x, y, w, h, cover, 2); rect(ctx, x + 5, y + 3, w - 10, h - 6, "#f4e8dc", 0); line(ctx, [[x + 8, y + h / 2], [x + w - 8, y + h / 2]], 1, "rgba(80,60,60,0.35)"); };
  pages(558, 872, 136, 24, "#e8dccf"); pages(552, 848, 140, 24, "#5f6a8a"); pages(562, 826, 126, 22, "#e8dccf"); pages(554, 804, 138, 22, "#46506f");
  shape(ctx, [[586, 778], [668, 776], [670, 802], [588, 804]], "#eedcc6", { lw: 2.2 });
  rect(ctx, 598, 784, 24, 12, "#3a3236", 1.2);
  shape(ctx, [[664, 790], [760, 786], [762, 830], [666, 834]], "#2d3550", { lw: 2.4 });
  // the mug
  ctx.beginPath(); ctx.ellipse(730, 800, 16, 20, 0, 0, TAU); ctx.lineWidth = 7; ctx.strokeStyle = HC.line; ctx.stroke(); ctx.lineWidth = 4; ctx.strokeStyle = "#f7ede4"; ctx.stroke();
  shape(ctx, [[740, 770], [826, 768], [824, 830], [744, 832]], "#f8eee6", { lw: 2.8 });
  ctx.beginPath(); ctx.ellipse(783, 770, 43, 6, 0, 0, TAU); ctx.fillStyle = "#e7d9cc"; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = HC.line; ctx.stroke();
  // steam: a cream wiggle rising through the gold band
  ctx.save(); ctx.globalAlpha = 0.9;
  line(ctx, [[812, 690], [826, 668], [806, 640], [826, 612], [808, 586], [824, 556], [816, 540]], 11, "#f6e2b4", true);
  ctx.restore();
}

// ----- right wall of boxes (the owl's perch on top), the plant, the gear -----
function sceneRightBack(ctx) {
  // top yellow box (the owl sits on its lid — the colour owl is drawn by the shot, not here)
  box(ctx, [[1972, 233], [2152, 238], [2152, 310], [1972, 310]], [[1895, 268], [1972, 233], [1972, 310], [1895, 322]], "#f3bd6a", "#e39a55", [[2062, 236, 28, 30], [1928, 256, 20, 28]]);
  rect(ctx, 2077, 294, 50, 15, "#f6e6d6", 2);
  // pink box under it, red-orange side box, the cream/yellow boxes by the plant
  box(ctx, [[1972, 302], [2160, 302], [2160, 402], [1972, 402]], [[1875, 332], [1972, 302], [1972, 402], [1875, 408]], "#dc4094", "#d23386", [[2050, 302, 30, 38], [1910, 326, 22, 30]]);
  rect(ctx, 1938, 386, 22, 18, "#f6e6d6", 1.8);
  box(ctx, [[1972, 402], [2090, 402], [2090, 560], [1972, 560]], [[1905, 408], [1972, 402], [1972, 560], [1905, 560]], "#f2bf62", "#e45252", [[2040, 402, 24, 34]]);
  box(ctx, R4(2098, 488, 2230, 578), null, "#f3e0c2", [[2150, 488, 26, 32]]);
  box(ctx, R4(2098, 576, 2230, 700), null, "#e658a6", [[2150, 576, 26, 34]]);
  box(ctx, R4(1958, 560, 2098, 700), null, "#e658a6", [[2005, 560, 26, 30]]);
  // the plant on the right stack
  shape(ctx, [[2074, 452], [2142, 448], [2136, 492], [2082, 494]], "#5a5fb6", { lw: 2.4 });
  pothos(ctx, 2108, 452, -178, -2, 11, 90, 56, 47);
  vine(ctx, [[2064, 468], [2046, 520], [2038, 580], [2042, 650]], 6, 50, 49);
  // left group: yellow box with headphones on it, pink box, lavender box
  box(ctx, [[1776, 428], [1852, 426], [1852, 488], [1776, 488]], [[1652, 440], [1776, 428], [1776, 488], [1652, 492]], "#fbe2c2", "#f2bd5e", [[1700, 440, 26, 30]]);
  // headphones lying on it
  ctx.lineWidth = 9; ctx.strokeStyle = HC.line; ctx.beginPath(); ctx.ellipse(1735, 420, 52, 26, 0, Math.PI, TAU); ctx.stroke();
  ctx.lineWidth = 5; ctx.strokeStyle = "#2a2328"; ctx.stroke();
  for (const [x, y] of [[1690, 422], [1782, 418]]) { ctx.beginPath(); ctx.ellipse(x, y, 20, 24, 0, 0, TAU); ctx.fillStyle = "#231d21"; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = HC.line; ctx.stroke(); ctx.beginPath(); ctx.ellipse(x, y, 11, 14, 0, 0, TAU); ctx.lineWidth = 1.5; ctx.strokeStyle = "#5a525a"; ctx.stroke(); }
  box(ctx, [[1680, 488], [1812, 486], [1812, 548], [1680, 548]], [[1812, 486], [1872, 490], [1872, 548], [1812, 548]], "#de4095", "#e97cc0", [[1740, 488, 26, 30]]);
  box(ctx, [[1650, 546], [1822, 542], [1822, 640], [1650, 640]], [[1822, 542], [1936, 548], [1936, 640], [1822, 640]], "#8d5ba1", "#b88ac7", [[1740, 544, 30, 36]]);
  // coiled black cable hanging from the stack
  { const r = rng(61);
    for (let i = 0; i < 11; i++) {
      ctx.beginPath(); ctx.ellipse(1862 + (r() - 0.5) * 16, 462 + i * 7 + (r() - 0.5) * 8, 26 + r() * 10, 36 + r() * 12, -0.25 + (r() - 0.5) * 0.5, 0, TAU);
      ctx.lineWidth = 6.5; ctx.strokeStyle = HC.line; ctx.stroke(); ctx.lineWidth = 3.4; ctx.strokeStyle = "#2c252a"; ctx.stroke();
    } }
  cable(ctx, [[1860, 520], [1880, 580], [1905, 640]], 4);
  // black cabinet with a knob behind the right speaker
  shape(ctx, [[1622, 520], [1702, 516], [1704, 700], [1624, 702]], "#231c21", { lw: 2.6 });
  circle(ctx, 1655, 553, 11, "#2d272c", 2); circle(ctx, 1655, 553, 5, "#6a646c", 0);
  cable(ctx, [[1640, 520], [1628, 600], [1650, 680]], 3.5); cable(ctx, [[1670, 516], [1690, 600], [1672, 690]], 3.5);
}

function sceneRightMid(ctx) {
  // the lamp: pole and jointed arm, black dome shade with its lit mouth facing down-left
  line(ctx, [[1489, 472], [1490, 592]], 5, HC.line); line(ctx, [[1489, 472], [1490, 592]], 2.4, "#3a3034");
  line(ctx, [[1490, 470], [1545, 540], [1520, 598]], 6.5, HC.line); line(ctx, [[1490, 470], [1545, 540], [1520, 598]], 3.2, "#3a3034");
  circle(ctx, 1545, 540, 7.5, "#2a2327", 2); circle(ctx, 1490, 469, 7, "#2a2327", 2);
  shape(ctx, [[1397, 492], [1418, 464], [1452, 446], [1480, 442], [1496, 456], [1493, 478], [1472, 504], [1452, 524], [1430, 533]], "#2b2327", { lw: 3, smooth: true });
  ctx.save(); ctx.translate(1419, 512); ctx.rotate(-0.95);
  ctx.beginPath(); ctx.ellipse(0, 0, 30, 15, 0, 0, TAU); ctx.fillStyle = "#f2c868"; ctx.fill(); ctx.lineWidth = 2.6; ctx.strokeStyle = HC.line; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(1, -1, 10, 9, 0, 0, TAU); ctx.fillStyle = "#fffaf0"; ctx.fill();
  ctx.restore();
  // books under the lamp, the black mixer, pencil cup, papers
  rect(ctx, 1420, 584, 92, 14, "#f0dcc4", 2); rect(ctx, 1426, 574, 80, 11, "#ecd4b8", 2);
  shape(ctx, [[1400, 598], [1544, 596], [1546, 652], [1402, 654]], "#2e2529", { lw: 2.8 });
  for (const x of [1434, 1458, 1482]) knob(ctx, x, 614, 7.5);
  rrect(ctx, 1500, 604, 30, 16, 3, "#e8dccd", 1.6);
  for (const x of [1432, 1456, 1480, 1504, 1528]) knob(ctx, x, 637, 7);
  shape(ctx, [[1336, 642], [1412, 636], [1420, 650], [1338, 656]], "#f5ede3", { lw: 1.8 });
  for (const [x1, y1, x2, y2, c] of [[1366, 604, 1360, 568, "#e0a53a"], [1374, 604, 1376, 562, "#d8338c"], [1382, 604, 1392, 566, "#6f97d0"], [1388, 604, 1400, 574, "#e8603f"]]) { line(ctx, [[x1, y1], [x2, y2]], 5, HC.line); line(ctx, [[x1, y1], [x2, y2]], 2.8, c); }
  shape(ctx, [[1360, 600], [1398, 600], [1396, 648], [1362, 648]], "#231d21", { lw: 2.4 });
  // side table: top and legs
  shape(ctx, [[1322, 652], [1562, 648], [1562, 668], [1322, 672]], "#deac82", { lw: 2.6 });
  shape(ctx, [[1398, 670], [1412, 670], [1372, 830], [1358, 830]], "#c9966c", { lw: 2.2 });
  rect(ctx, 1500, 668, 16, 162, "#deac82", 2.2);
  circle(ctx, 1508, 718, 3, HC.line);
  // right speaker with books on top
  rect(ctx, 1590, 676, 76, 14, "#eedcc6", 2); rect(ctx, 1596, 664, 66, 12, "#f3e6d4", 2);
  shape(ctx, [[1545, 690], [1686, 688], [1688, 882], [1547, 884]], "#231d21", { lw: 3 });
  knob(ctx, 1628, 711, 14, "#1a1518", "#6a646c");
  circle(ctx, 1628, 776, 50, "#171215", 2.6); circle(ctx, 1628, 776, 40, "#eea75a", 2); circle(ctx, 1628, 776, 30, "#f3bd6c", 0);
  ctx.beginPath(); ctx.arc(1628, 776, 33, 0, TAU); ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(120,60,20,0.6)"; ctx.stroke();
  circle(ctx, 1628, 776, 13, "#1d1719", 2);
  // tall navy synth leaning against the lavender box, keys up the right side
  ctx.save(); ctx.translate(1766, 690); ctx.rotate(0.05);
  shape(ctx, [[-50, -118], [42, -120], [44, 112], [-52, 112]], "#232544", { lw: 3 });
  shape(ctx, [[42, -120], [62, -114], [64, 112], [44, 112]], "#141320", { lw: 2.4 });
  ctx.fillStyle = "#e9d6a0";
  for (let r = 0; r < 18; r++) for (let c = 0; c < 4; c++) if ((r * 7 + c * 3) % 5 !== 0) ctx.fillRect(-40 + c * 9, -104 + r * 12, 3, 3);
  line(ctx, [[-16, -116], [-18, 110]], 2, "#3a5a9a");
  rect(ctx, 6, -80, 34, 186, "#f3ece4", 2);
  ctx.fillStyle = "#1a1518";
  for (let k = 0; k < 15; k++) if (k % 7 !== 2 && k % 7 !== 6) ctx.fillRect(4, -74 + k * 12.2, 20, 6.5);
  ctx.restore();
  // flight case on the yellow/cream box
  shape(ctx, [[1846, 622], [1990, 620], [1992, 730], [1848, 732]], "#302527", { lw: 3 });
  for (const [x0, y0, x1, y1] of [[1850, 622, 1988, 634], [1850, 720, 1988, 732], [1850, 668, 1988, 678]]) rect(ctx, x0, y0, x1 - x0, y1 - y0, "#ead0bc", 1.8);
  for (const x of [1850, 1976]) rect(ctx, x, 622, 12, 110, "#ead0bc", 1.8);
  rrect(ctx, 1932, 662, 20, 28, 3, "#d9ccc4", 2);
  cable(ctx, [[1880, 620], [1900, 600], [1940, 598], [1962, 618]], 3.5);
  box(ctx, R4(1830, 728, 1900, 884), null, "#f2bd5b");
  box(ctx, R4(1900, 728, 1986, 884), null, "#f3dfca");
  box(ctx, R4(1986, 728, 2026, 884), null, "#ec7a9d");
  rect(ctx, 1906, 732, 16, 16, "#2a2226", 0);
  // the yellow notebook leaning on the pink box, the backpack, big leaves
  shape(ctx, [[2012, 664], [2084, 648], [2096, 742], [2024, 752]], "#f1bc66", { lw: 2.6 });
  line(ctx, [[2084, 648], [2090, 652], [2102, 744], [2096, 742]], 2, HC.line);
  leaves(ctx, [[2150, 760, -70, 110, 0], [2180, 700, -40, 100, 1], [2130, 720, -110, 90, 3], [2200, 760, -20, 90, 0]]);
  shape(ctx, [[2030, 740], [2070, 708], [2120, 700], [2170, 716], [2196, 760], [2200, 860], [2180, 884], [2050, 886], [2026, 860]], "#2d242b", { lw: 3 });
  line(ctx, [[2050, 760], [2060, 860]], 1.8, "#4a4048"); line(ctx, [[2150, 740], [2170, 870]], 1.8, "#4a4048");
  for (const x of [2100, 2142]) { line(ctx, [[x, 716], [x + 2, 880]], 7, "#1a1418"); rrect(ctx, x - 7, 762, 16, 30, 4, "#8f8790", 2); rect(ctx, x - 3, 770, 8, 14, "#2d242b", 0); }
  // books stack by the backpack
  let y = 884;
  for (const [x0, w, h, c] of [[1942, 150, 18, "#5d4a3a"], [1946, 142, 16, "#6b7a8e"], [1940, 146, 16, "#e8d9c8"], [1948, 136, 16, "#8a6a4a"], [1950, 130, 14, "#2d3b6a"]]) {
    rect(ctx, x0, y - h, w, h, c, 2); rect(ctx, x0 + 6, y - h + 3, w - 12, h - 6, "#f3e7da", 0); y -= h;
  }
  // devices on the floor: camera, cassette deck, router
  shape(ctx, [[1676, 816], [1790, 812], [1792, 880], [1678, 884]], "#5a5560", { lw: 2.6 });
  rect(ctx, 1700, 832, 44, 34, "#e8dfd6", 2); rect(ctx, 1708, 840, 28, 18, "#2a2428", 1.2);
  rect(ctx, 1752, 820, 30, 12, "#d8cfc6", 1.5);
  shape(ctx, [[1806, 862], [1880, 860], [1882, 890], [1808, 892]], "#d9d0c8", { lw: 2.2 });
  circle(ctx, 1820, 876, 4, HC.line); circle(ctx, 1868, 876, 4, HC.line); rect(ctx, 1836, 866, 20, 18, "#2a2428", 1.2);
  shape(ctx, [[1622, 884], [1700, 882], [1702, 902], [1624, 904]], "#f2ece6", { lw: 2 });
  // cables: from the side-table mixer down to the floor, behind the synth, loops across the floor
  for (const pts of [
    [[1420, 652], [1412, 720], [1430, 800], [1418, 880], [1440, 940]], [[1446, 654], [1452, 740], [1440, 820], [1460, 900]], [[1470, 654], [1486, 720], [1470, 790], [1490, 870], [1480, 940]],
    [[1500, 654], [1520, 700], [1534, 760], [1520, 830]], [[1530, 652], [1560, 690], [1580, 680]], [[1690, 600], [1700, 660], [1690, 720], [1700, 800]],
    [[1706, 560], [1720, 620], [1712, 700]], [[1600, 884], [1660, 900], [1740, 906], [1820, 900], [1880, 904], [1920, 896]],
    [[1560, 900], [1600, 920], [1700, 924], [1790, 916], [1860, 918]], [[1700, 880], [1680, 900], [1720, 912], [1780, 900], [1800, 880]],
    [[1840, 732], [1830, 800], [1850, 880], [1900, 906]], [[1990, 720], [2010, 800], [1990, 880]],
  ]) cable(ctx, pts, 4);
  // mixer on the main desk front with five knobs
  shape(ctx, [[1438, 796], [1580, 792], [1582, 834], [1440, 836]], "#2b2327", { lw: 2.8 });
  for (let i = 0; i < 5; i++) knob(ctx, 1458 + i * 28, 812, 9.5);
}

// ----- the floor bands (a ribbon lying across the floor) -----
function floor(ctx) {
  // left: purple floor with a magenta swoosh
  bandCols(ctx, [[-30, 898, 950], [300, 900, 950], [700, 904, 950]], "#8c56ad", 0);
  bandCols(ctx, [[-30, 928, 950], [120, 918, 950], [300, 914, 950], [480, 920, 950], [700, 930, 950]], "#d23f8e", 0);
  // under the desk: shadow
  bandCols(ctx, [[700, 884, 950], [1500, 884, 950]], "#231b1e", 0);
  // right of centre: a magenta / cream / orange swirl on the floor
  bandCols(ctx, [[1150, 930, 950], [1250, 902, 950], [1400, 900, 950], [1520, 910, 950]], "#d8338c", 0);
  bandCols(ctx, [[1240, 914, 922], [1330, 900, 912], [1450, 902, 914], [1520, 910, 920]], "#f3dcc0", 0);
  bandCols(ctx, [[1380, 930, 950], [1460, 918, 950], [1560, 916, 950]], "#e8603f", 0);
  // right: red-orange floor, peach and cream bands, purple at the far right
  bandCols(ctx, [[1480, 900, 950], [1800, 886, 950], [2230, 876, 950]], "#dc5a63", 0);
  bandCols(ctx, [[1700, 916, 950], [2000, 904, 950], [2230, 898, 950]], "#ef8a6a", 0);
  bandCols(ctx, [[1960, 928, 950], [2100, 912, 950], [2230, 904, 950]], "#f6dcb4", 0);
  bandCols(ctx, [[1990, 882, 896], [2100, 876, 900], [2230, 870, 904]], "#8c56ad", 0);
}

// ----- the designer -----
function designer(ctx) {
  const L = HC.line;
  // jacket silhouette (shoulders, both arms down to the desk)
  shape(ctx, [[902, 560], [952, 546], [990, 575], [1030, 612], [1110, 612], [1152, 548], [1200, 540], [1262, 566], [1318, 612], [1348, 668], [1372, 732], [1396, 792], [1410, 836], [826, 836], [826, 770], [832, 700], [846, 638], [870, 590]], HC.jacket, { lw: 3 });
  // shadowed folds and seams
  ctx.save(); ctx.beginPath(); smoothPath(ctx, [[902, 560], [952, 546], [990, 575], [1030, 612], [1110, 612], [1152, 548], [1200, 540], [1262, 566], [1318, 612], [1348, 668], [1372, 732], [1396, 792], [1410, 836], [826, 836], [826, 770], [832, 700], [846, 638], [870, 590]], true); ctx.clip();
  ctx.fillStyle = HC.jacketD;
  for (const pts of [[[1250, 600], [1300, 640], [1330, 720], [1340, 800], [1300, 790], [1280, 700]], [[850, 640], [880, 600], [900, 660], [880, 760], [850, 800]], [[1150, 640], [1190, 700], [1180, 800], [1150, 780], [1160, 700]], [[1200, 760], [1300, 770], [1380, 800], [1300, 810]]]) { ctx.beginPath(); smoothPath(ctx, pts, true); ctx.fill(); }
  ctx.fillStyle = HC.jacketL;
  for (const pts of [[[1200, 560], [1260, 580], [1240, 620], [1200, 600]], [[880, 600], [920, 580], [915, 620], [885, 640]]]) { ctx.beginPath(); smoothPath(ctx, pts, true); ctx.fill(); }
  ctx.restore();
  for (const pts of [[[1245, 610], [1290, 680], [1310, 760]], [[870, 660], [880, 720], [870, 790]], [[1170, 650], [1185, 720], [1178, 790]], [[1320, 660], [1350, 720]], [[1210, 690], [1260, 700]],
    [[1216, 580], [1236, 620], [1240, 660]], [[1268, 640], [1300, 700], [1330, 780]], [[1348, 700], [1372, 760], [1380, 810]], [[1200, 780], [1260, 790], [1320, 800]], [[900, 600], [890, 660], [896, 720]],
    [[852, 700], [860, 760], [850, 820]], [[1286, 760], [1330, 790], [1370, 820]], [[1160, 560], [1190, 590]]]) line(ctx, pts, 1.8, "#27371f", true);
  // yellow tee between the lapels, with its collar
  shape(ctx, [[1030, 612], [1118, 610], [1142, 660], [1150, 740], [1130, 836], [1030, 836], [1010, 740], [1015, 660]], HC.tee, { lw: 2.6 });
  ctx.save(); ctx.globalAlpha = 0.5; shape(ctx, [[1040, 700], [1100, 690], [1120, 760], [1060, 780]], HC.teeD, { lw: 0, smooth: true }); ctx.restore();
  // lapels
  shape(ctx, [[1030, 612], [1000, 640], [990, 700], [1012, 740], [1020, 670]], "#4a6645", { lw: 2.4 });
  shape(ctx, [[1118, 610], [1152, 640], [1176, 700], [1150, 720], [1140, 660]], "#4a6645", { lw: 2.4 });
  // chest pocket
  shape(ctx, [[1172, 716], [1256, 710], [1260, 756], [1176, 762]], null, { lw: 2.2 });
  // neck and the tee collar
  shape(ctx, [[1034, 548], [1112, 544], [1116, 622], [1076, 634], [1034, 624]], HC.skin, { lw: 2.4 });
  ctx.save(); ctx.globalAlpha = 0.55; shape(ctx, [[1036, 548], [1112, 544], [1112, 580], [1036, 590]], HC.skinSh, { lw: 0 }); ctx.restore();
  line(ctx, [[1032, 622], [1076, 640], [1118, 620]], 3, L, true);
  // headphones round the neck: band behind, two cups
  line(ctx, [[1044, 610], [1080, 648], [1128, 628]], 7, L, true);
  shape(ctx, [[1030, 596], [1060, 590], [1078, 620], [1070, 652], [1040, 650], [1026, 626]], "#26222a", { lw: 2.6, smooth: true });
  shape(ctx, [[1108, 566], [1150, 552], [1178, 578], [1180, 630], [1156, 664], [1118, 660], [1102, 620]], "#2a262e", { lw: 2.8, smooth: true });
  ctx.beginPath(); ctx.ellipse(1146, 610, 22, 38, -0.15, 0, TAU); ctx.lineWidth = 3; ctx.strokeStyle = "#6c6873"; ctx.stroke();
  // raised forearm (sleeve rolled): elbow on the desk, fist under the chin
  shape(ctx, [[972, 548], [1016, 552], [1022, 590], [1004, 640], [982, 690], [960, 730], [926, 736], [918, 706], [940, 660], [958, 600]], HC.skin, { lw: 2.6 });
  ctx.save(); ctx.globalAlpha = 0.55; shape(ctx, [[1004, 580], [1020, 592], [1002, 642], [978, 694], [964, 690], [986, 636]], HC.skinSh, { lw: 0 }); ctx.restore();
  // sleeve bunched at the elbow
  shape(ctx, [[858, 690], [918, 698], [956, 728], [948, 786], [884, 800], [846, 764]], HC.jacket, { lw: 2.8 });
  line(ctx, [[880, 720], [915, 760]], 2, "#2b3d27"); line(ctx, [[870, 760], [905, 790]], 2, "#2b3d27");
  // hair behind the head: dark mass framing the face, messy locks down both sides
  shape(ctx, [[944, 400], [990, 376], [1060, 366], [1130, 368], [1180, 384], [1192, 430], [1186, 470], [1178, 492], [1168, 470], [1160, 500], [1150, 470], [990, 470], [986, 506], [972, 490], [964, 512], [956, 480], [946, 452]], HC.hair, { lw: 2 });
  // head: ear, face
  shape(ctx, [[1150, 446], [1164, 440], [1172, 452], [1170, 476], [1160, 490], [1148, 488]], HC.skin, { lw: 2.4, smooth: true });
  line(ctx, [[1156, 452], [1162, 466], [1156, 480]], 1.6, "rgba(120,60,50,0.7)", true);
  shape(ctx, [[986, 414], [983, 450], [990, 482], [1004, 514], [1026, 544], [1052, 562], [1078, 568], [1104, 556], [1126, 532], [1140, 506], [1148, 474], [1151, 440], [1146, 400], [1100, 382], [1040, 384], [1000, 398]], HC.skin, { lw: 2.8, smooth: true });
  // skin shading: soft shadow down the far side of the face and under the brows, a shadow along the nose bridge
  ctx.save(); ctx.beginPath(); smoothPath(ctx, [[986, 414], [983, 450], [990, 482], [1004, 514], [1026, 544], [1052, 562], [1078, 568], [1104, 556], [1126, 532], [1140, 506], [1148, 474], [1151, 440], [1146, 400], [1100, 382], [1040, 384], [1000, 398]], true); ctx.clip();
  glow(ctx, 1152, 470, 34, 90, "rgba(200,130,100,0.55)");
  glow(ctx, 996, 470, 18, 70, "rgba(200,130,100,0.35)");
  glow(ctx, 1075, 572, 70, 22, "rgba(190,120,95,0.5)");
  ctx.fillStyle = "rgba(205,140,110,0.45)"; ctx.beginPath(); smoothPath(ctx, [[1050, 420], [1058, 446], [1056, 472], [1048, 478], [1046, 444]], true); ctx.fill();
  ctx.restore();
  // fringe: black locks from under the brim over the forehead and down the temples
  const lock = (pts, w) => { ctx.beginPath(); smoothPath(ctx, pts, false); ctx.lineWidth = w; ctx.strokeStyle = HC.hair; ctx.lineCap = "round"; ctx.stroke(); };
  // a few spiky strands escaping the brim over the forehead, thicker locks down both temples
  shape(ctx, [[990, 396], [1004, 394], [1018, 422], [1008, 404]], HC.hair, { lw: 0 });
  shape(ctx, [[1014, 394], [1034, 392], [1046, 414], [1030, 400]], HC.hair, { lw: 0 });
  shape(ctx, [[1112, 390], [1130, 390], [1140, 412], [1124, 398]], HC.hair, { lw: 0 });
  shape(ctx, [[1136, 392], [1162, 394], [1156, 430], [1150, 408]], HC.hair, { lw: 0 });
  shape(ctx, [[952, 400], [994, 398], [990, 430], [986, 470], [990, 500], [976, 486], [968, 506], [962, 470], [950, 440]], HC.hair, { lw: 0 });
  shape(ctx, [[1146, 396], [1186, 400], [1188, 440], [1180, 480], [1172, 468], [1164, 490], [1158, 450], [1150, 420]], HC.hair, { lw: 0 });
  lock([[1000, 402], [994, 420]], 2); lock([[1044, 398], [1060, 402]], 2);
  // beanie: rounded knit dome with a ribbed turn-up (its crown hides behind the lettering)
  const bean = [[946, 414], [940, 380], [944, 345], [962, 318], [1060, 298], [1160, 310], [1186, 338], [1190, 372], [1186, 402], [1150, 392], [1100, 386], [1060, 385], [1010, 390], [975, 398]];
  shape(ctx, bean, HC.beanie, { lw: 3, smooth: true });
  ctx.save(); ctx.beginPath(); smoothPath(ctx, bean, true); ctx.clip();
  ctx.strokeStyle = "rgba(40,20,12,0.5)"; ctx.lineWidth = 2;
  for (let x = 940; x < 1190; x += 7.5) { ctx.beginPath(); ctx.moveTo(x, 300); ctx.quadraticCurveTo(x + (x - 1065) * 0.06, 360, x - (x - 1065) * 0.05, 440); ctx.stroke(); }
  // the turned-up cuff: a darker band along the brim
  ctx.fillStyle = "rgba(60,30,15,0.28)"; ctx.beginPath(); smoothPath(ctx, [[940, 372], [1060, 352], [1190, 362], [1190, 410], [1060, 390], [940, 420]], true); ctx.fill();
  ctx.fillStyle = "rgba(255,210,170,0.10)"; ctx.beginPath(); ctx.ellipse(1060, 345, 70, 30, 0, 0, TAU); ctx.fill();
  ctx.restore();
  // brows
  const brow = (pts, w) => { ctx.beginPath(); smoothPath(ctx, pts, false); ctx.lineWidth = w; ctx.strokeStyle = HC.hair; ctx.lineCap = "round"; ctx.stroke(); };
  const browT = (pts, w) => taperLine(ctx, pts, w, HC.hair);
  browT([[992, 412], [1010, 403], [1030, 401], [1046, 405]], 7); browT([[1080, 399], [1100, 390], [1122, 389], [1140, 396]], 8);
  // eyes: almond whites, big brown irises with a catch-light, heavy upper lid line, thin lower lid
  const eye = (cx, cy, w, h) => {
    const up = (c) => { c.moveTo(cx - w, cy + 2); c.bezierCurveTo(cx - w * 0.5, cy - h, cx + w * 0.45, cy - h * 1.05, cx + w, cy - 1); };
    ctx.save();
    ctx.beginPath(); up(ctx); ctx.bezierCurveTo(cx + w * 0.5, cy + h * 0.8, cx - w * 0.5, cy + h * 0.8, cx - w, cy + 2); ctx.closePath();
    ctx.fillStyle = "#fcf5ee"; ctx.fill(); ctx.clip();
    circle(ctx, cx, cy - 1, h * 0.95, "#4a2a1c"); circle(ctx, cx, cy - 1, h * 0.5, "#140b09"); circle(ctx, cx + h * 0.35, cy - h * 0.4, h * 0.26, "#fff");
    ctx.restore();
    ctx.beginPath(); up(ctx); ctx.lineWidth = 3.8; ctx.strokeStyle = L; ctx.lineCap = "round"; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - w * 0.72, cy + h * 0.72); ctx.quadraticCurveTo(cx, cy + h * 1.05, cx + w * 0.7, cy + h * 0.6); ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(90,50,40,0.75)"; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - w * 0.6, cy + h * 1.35); ctx.quadraticCurveTo(cx, cy + h * 1.7, cx + w * 0.55, cy + h * 1.3); ctx.lineWidth = 1.2; ctx.strokeStyle = "rgba(150,90,70,0.45)"; ctx.stroke();
  };
  eye(1021, 433, 23, 11); eye(1111, 423, 25, 11.5);
  // nose: bridge line, round tip with a nostril
  line(ctx, [[1052, 418], [1054, 450], [1050, 472]], 1.6, "rgba(120,70,50,0.55)", true);
  ctx.beginPath(); smoothPath(ctx, [[1050, 474], [1046, 484], [1058, 491], [1074, 490], [1088, 483]], false); ctx.lineWidth = 2.6; ctx.strokeStyle = L; ctx.stroke();
  line(ctx, [[1062, 484], [1068, 487]], 2, L);
  // mouth: a small smile turning up at the right, the lower lip hinted
  line(ctx, [[1036, 512], [1070, 516], [1100, 509], [1110, 502]], 2.8, L, true);
  line(ctx, [[1062, 528], [1080, 527]], 2, "rgba(140,70,60,0.6)");
  // the fist under the chin: back of the hand to the left, curled fingers, thumb along the jaw
  shape(ctx, [[952, 500], [966, 488], [990, 486], [1010, 494], [1022, 508], [1028, 530], [1026, 552], [1012, 562], [988, 562], [966, 552], [954, 530]], HC.skin, { lw: 2.8, smooth: true });
  for (const pts of [[[954, 506], [980, 500], [1004, 504], [1016, 512]], [[954, 524], [978, 520], [998, 524]], [[958, 542], [980, 540], [996, 544]], [[1004, 506], [1012, 530], [1024, 546]], [[1016, 512], [1010, 520], [1004, 518]]]) line(ctx, pts, 2.2, L, true);
  ctx.save(); ctx.globalAlpha = 0.4; shape(ctx, [[952, 530], [966, 552], [988, 562], [970, 540]], HC.skinSh, { lw: 0, smooth: true }); ctx.restore();
  // laptop lid (seen from behind) and his other hand on the keys
  shape(ctx, [[868, 734], [874, 727], [1098, 724], [1104, 730], [1130, 830], [892, 832]], HC.laptop, { lw: 3 });
  line(ctx, [[876, 730], [1098, 727]], 2, "#c9c4cc");
  circle(ctx, 996, 790, 17, "#3a3438", 0);
  shape(ctx, [[1120, 790], [1150, 778], [1196, 782], [1232, 800], [1236, 826], [1128, 830]], HC.skin, { lw: 2.6 });
  for (const pts of [[[1140, 800], [1170, 806]], [[1150, 790], [1190, 800]], [[1196, 810], [1228, 812]]]) line(ctx, pts, 1.8, L, true);
  // under the desk: jeans and the tee hem
  shape(ctx, [[900, 890], [1310, 890], [1330, 950], [880, 950]], "#2b272c", { lw: 0 });
  shape(ctx, [[1030, 890], [1170, 890], [1160, 925], [1040, 928]], HC.tee, { lw: 2.2 });
}

// ----- the desk: board, frame, legs, cables over the front -----
function desk(ctx) {
  // legs and frame under the top
  shape(ctx, [[736, 870], [760, 870], [752, 950], [728, 950]], "#d8ab84", { lw: 2.4 });
  shape(ctx, [[1540, 870], [1562, 870], [1566, 950], [1544, 950]], "#d8ab84", { lw: 2.4 });
  shape(ctx, [[1390, 870], [1410, 870], [1420, 950], [1400, 950]], "#c9966c", { lw: 2.2 });
  shape(ctx, [[664, 866], [1640, 866], [1640, 882], [664, 882]], "#241c1b", { lw: 2.4 });
  // the top: light surface + front edge
  shape(ctx, [[664, 832], [1640, 830], [1640, 846], [664, 848]], "#e3b48e", { lw: 2.6 });
  shape(ctx, [[664, 848], [1640, 846], [1640, 868], [664, 870]], "#d2a381", { lw: 2.6 });
  // cables draped over the front edge
  cable(ctx, [[880, 834], [872, 870], [862, 920], [858, 960]], 6);
  cable(ctx, [[902, 834], [900, 880], [910, 930], [920, 960]], 6);
  cable(ctx, [[920, 836], [940, 890], [950, 960]], 5);
  cable(ctx, [[1330, 830], [1340, 880], [1330, 960]], 6);
  cable(ctx, [[1350, 832], [1362, 900], [1372, 960]], 5);
  cable(ctx, [[1470, 834], [1480, 900], [1470, 960]], 5);
  cable(ctx, [[1520, 834], [1506, 900], [1530, 960]], 5);
  cable(ctx, [[1260, 834], [1290, 850], [1330, 840]], 4);
}

function sceneBack(ctx) { sceneLeftBack(ctx); sceneRightBack(ctx); }
function sceneMid(ctx) { floor(ctx); sceneLeftMid(ctx); sceneRightMid(ctx); }
function sceneFront(ctx) { sceneLeftFront(ctx); designer(ctx); desk(ctx); }

// ---------- composition ----------
// opts: { headline: true, nav: true, grain: true, scene: true }
export function drawHippieWorld(ctx, opts = {}) {
  const { headline: withHeadline = true, nav: withNav = true, grain: withGrain = true, scene = true, x0 = WORLD_X0, x1 = WORLD_X1 } = opts;
  sky(ctx);
  stars(ctx);
  ribbonsBack(ctx);
  clouds(ctx);
  if (scene) { sceneBack(ctx); sceneMid(ctx); sceneFront(ctx); }
  if (withGrain) grain(ctx, x0, -20, x1 - x0, PAGE_H + 40);
  if (withHeadline) headline(ctx);
  if (withNav) nav(ctx);
}

const cache = new Map();
function canvasOf(key, w, h, paint) {
  let c = cache.get(key);
  if (!c) {
    c = document.createElement("canvas"); c.width = w; c.height = h;
    paint(c.getContext("2d"));
    cache.set(key, c);
  }
  return c;
}
export function releaseHippie() { cache.clear(); headCache = null; }

// The full colour page, 2206 x 946 (x scale for supersampling; default 1).
export function hippiePageCanvas({ headline = true, nav = true, scale = 1 } = {}) {
  return canvasOf(`page:${headline}:${nav}:${scale}`, Math.round(PAGE_W * scale), Math.round(PAGE_H * scale), (g) => {
    g.scale(scale, scale);
    drawHippieWorld(g, { headline, nav, x0: 0, x1: PAGE_W });
  });
}
// Individual layers, each 2206 x 946 in page coordinates (transparent where empty):
//   "illustration"  the whole page without headline and nav (opaque)
//   "backdrop"      sky, stars, ribbons and clouds only (opaque) — what shows behind the gear and the designer
//   "scene"         boxes, gear, plants, sign, the designer and the desk (transparent)
//   "designer"      the designer and the desk only (transparent)
//   "headline"      the lettering with its extrusion (transparent)
//   "nav"           brand mark + the four nav pills (transparent)
export function hippieLayer(name, scale = 1) {
  const w = Math.round(PAGE_W * scale), h = Math.round(PAGE_H * scale);
  return canvasOf(`layer:${name}:${scale}`, w, h, (g) => {
    g.scale(scale, scale);
    if (name === "illustration") drawHippieWorld(g, { headline: false, nav: false, x0: 0, x1: PAGE_W });
    else if (name === "backdrop") { sky(g); stars(g); ribbonsBack(g); clouds(g); grain(g, 0, 0, PAGE_W, PAGE_H); }
    else if (name === "scene") { sceneBack(g); sceneMid(g); sceneFront(g); }
    else if (name === "designer") { designer(g); desk(g); }
    else if (name === "headline") headline(g);
    else if (name === "nav") nav(g);
    else throw new Error(`hippieLayer: unknown layer ${name}`);
  });
}

// The page pre-shrunk to width w (halving steps, so thin lines stay clean) — for the laptop screen in the morning
// room (117.5–129 s, where the page is ~755 px wide). Aspect 2206:946.
export function hippiePageSmall(w, { headline = true, nav = true } = {}) {
  return canvasOf(`small:${w}:${headline}:${nav}`, Math.round(w), Math.round((w * PAGE_H) / PAGE_W), (g) => {
    let src = hippiePageCanvas({ headline, nav }), cw = src.width, ch = src.height;
    while (cw / 2 > w * 1.4) {
      const c = document.createElement("canvas"); c.width = Math.round(cw / 2); c.height = Math.round(ch / 2);
      const cg = c.getContext("2d"); cg.imageSmoothingQuality = "high"; cg.drawImage(src, 0, 0, c.width, c.height);
      src = c; cw = c.width; ch = c.height;
    }
    g.imageSmoothingQuality = "high";
    g.drawImage(src, 0, 0, g.canvas.width, g.canvas.height);
  });
}

// Where the colour owl perches on the page (not drawn here): the lid of the top yellow box, between its feet, at
// 115–117.4 s. Its body spans roughly x 1945–2170, y 60–240 (wings out).
export const OWL_PERCH = { x: 2022, y: 236 };

// The colour page's camera in the source as it arrives (s26): page → frame similarity x' = s·x + tx, y' = s·y + ty,
// measured by ORB on the lower half of the page (1000–1500 inliers). Settles to identity at 114.9 s.
export const PAGE_ARRIVAL = [
  [112.7, 0.8219, 166.7, 100.5], [112.9, 0.8288, 165.8, 101.5], [113.1, 0.8505, 147.1, 91.6], [113.3, 0.8869, 110.1, 72.4],
  [113.45, 0.9211, 70.6, 52.0], [113.6, 0.9385, 55.2, 39.3], [113.8, 0.9616, 35.8, 25.7], [114.05, 0.9792, 18.9, 13.7],
  [114.3, 0.9912, 9.0, 6.7], [114.5, 0.9953, 5.1, 2.8], [114.7, 0.9992, 0.8, 0.4], [114.9, 1, 0, 0],
];
export function pageArrival(t) {
  const A = PAGE_ARRIVAL;
  if (t <= A[0][0]) return { s: A[0][1], tx: A[0][2], ty: A[0][3] };
  for (let i = 1; i < A.length; i++) if (t <= A[i][0]) {
    const [t0, s0, x0, y0] = A[i - 1], [t1, s1, x1, y1] = A[i], u = (t - t0) / (t1 - t0);
    return { s: s0 + (s1 - s0) * u, tx: x0 + (x1 - x0) * u, ty: y0 + (y1 - y0) * u };
  }
  return { s: 1, tx: 0, ty: 0 };
}

// ---------- the header banner ----------
// Where the colour strip sits on the sōko (B&W) page, in page coordinates (the full-frame page of s17/s21, 2206 x 946;
// drawSoko in sites.js). Measured from the strip's edges in the source at 92.0 s and 95.0 s through the page→frame
// affines of those frames (x' = 0.838x + 170.0 / 166.4, y' = 0.8464y + 132.3): x 27.2–2150.1, y 62.8–269.0.
// It covers the B&W headline ("MIXING DOWN, / LATE AT NIGHT.", y ~80–235) and the DO NOT KNOCK plate's top.
export const BANNER = { x: 27.2, y: 62.8, w: 2122.9, h: 206.2 };
// The strip's artwork is the colour page itself, scaled and cropped: colour→frame is a similarity measured by ORB
// (s 0.5868–0.5887; 1100–1360 inliers at 89.0, 92.0, 95.0 s). In page coordinates: page = S · colour + T
// (the page's own slight anamorphic squeeze makes sx ≠ sy). It shows colour-page x −430…2598, y 75…372.
export const BANNER_MAP = { sx: 0.701, sy: 0.694, tx: 328.7, ty: 10.6 };
const BANNER_SS = 2;
export function hippieBannerCanvas() {
  const { x, y, w, h } = BANNER, M = BANNER_MAP;
  return canvasOf("banner", Math.round(w * BANNER_SS), Math.round(h * BANNER_SS), (g) => {
    g.scale(BANNER_SS, BANNER_SS);
    g.translate(-x, -y);
    g.translate(M.tx, M.ty); g.scale(M.sx, M.sy);
    drawHippieWorld(g, { headline: true, nav: false });
  });
}
// Draw the strip into its slot, in page coordinates, under the caller's transform.
export function drawHippieBanner(ctx, alpha = 1) {
  const c = hippieBannerCanvas();
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.drawImage(c, BANNER.x, BANNER.y, BANNER.w, BANNER.h);
  ctx.restore();
}
