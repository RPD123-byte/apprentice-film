// ---------- gear, right side ----------
// The desk lamp, pencil cup, radio-mixer and books on the side table, the right speaker, the upright synth, the
// flight case, the backpack, books, the devices on the floor, headphones and cable coils on the boxes.
function lamp(ctx) {
  // arm and post
  strokeSp(ctx, [[1497, 488], [1545, 545]], 7, HC.line); strokeSp(ctx, [[1497, 488], [1545, 545]], 3.2, "#3a3438");
  strokeSp(ctx, [[1545, 545], [1528, 574]], 7, HC.line); strokeSp(ctx, [[1545, 545], [1528, 574]], 3.2, "#3a3438");
  strokeSp(ctx, [[1494, 490], [1494, 566]], 7, HC.line); strokeSp(ctx, [[1494, 490], [1494, 566]], 3.2, "#3a3438");
  circle(ctx, 1545, 545, 7, GR.dark2, 2, HC.line); circle(ctx, 1545, 545, 2.5, "#8a848a");
  ctx.beginPath(); ctx.ellipse(1495, 568, 17, 6, 0, 0, TAU); ctx.fillStyle = GR.dark; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = HC.line; ctx.stroke();
  // shade: black cone, lit gold mouth, bulb
  fillSp(ctx, [[1491, 452], [1503, 462], [1500, 488], [1470, 528], [1440, 530], [1398, 498], [1405, 478], [1440, 462]], GR.dark, 2.6);
  ctx.save(); ctx.translate(1432, 511); ctx.rotate(0.42);
  ctx.beginPath(); ctx.ellipse(0, 0, 38, 20, 0, 0, TAU); ctx.fillStyle = "#e3ab58"; ctx.fill(); ctx.lineWidth = 2.6; ctx.strokeStyle = HC.line; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-4, -6, 12, 8, 0, 0, TAU); ctx.fillStyle = "#f6efe2"; ctx.fill(); ctx.lineWidth = 1.6; ctx.stroke();
  ctx.restore();
  circle(ctx, 1497, 488, 7, GR.dark2, 2, HC.line); circle(ctx, 1497, 488, 2.5, "#8a848a");
}
function gearR(ctx) {
  // --- the side table: tan top, a slanted front leg and a straight right leg (cream), dark back legs crossing
  for (const [x0, y0, x1, y1] of [[1420, 667, 1470, 800], [1470, 667, 1425, 800], [1340, 667, 1330, 800]]) { strokeSp(ctx, [[x0, y0], [x1, y1]], 12, HC.line); strokeSp(ctx, [[x0, y0], [x1, y1]], 7, "#3a2f2c"); }
  quadFill(ctx, [1391, 667, 1405, 667, 1380, 800, 1366, 800], "#d9b088", 2.2);
  quadFill(ctx, [1497, 667, 1512, 667, 1514, 800, 1499, 800], "#d9b088", 2.2);
  circle(ctx, 1507, 717, 3, "#8a6a4a", 1.2, HC.line);
  quadFill(ctx, [1327, 650, 1562, 650, 1562, 667, 1327, 667], "#d4ac86", 2.4);
  books(ctx, [[1434, 1509, 575, 13, "#c7a24c", "#eadcb4"], [1440, 1512, 563, 12, "#e2c07a", "#f2e6c8"]]);
  lamp(ctx);
  quadFill(ctx, [1361, 598, 1399, 596, 1399, 634, 1362, 636], GR.dark, 2.4);
  ctx.beginPath(); ctx.ellipse(1380, 598, 19, 5, 0, 0, TAU); ctx.fillStyle = "#3d363c"; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = HC.line; ctx.stroke();
  for (const [x0, y0, x1, y1, c] of [[1368, 598, 1363, 568, "#3a3438"], [1376, 598, 1377, 562, "#4e474b"], [1384, 598, 1390, 566, "#3a3438"], [1391, 598, 1402, 574, "#4e474b"]]) {
    strokeSp(ctx, [[x0, y0], [x1, y1]], 5.5, HC.line); strokeSp(ctx, [[x0, y0], [x1, y1]], 2.6, c);
  }
  quadFill(ctx, [1334, 636, 1415, 632, 1418, 650, 1336, 652], "#e8e2de", 2.2);
  strokeSp(ctx, [[1378, 642], [1398, 636], [1420, 638]], 1.4, "#6a6268");
  quadFill(ctx, [1426, 593, 1543, 593, 1543, 651, 1426, 651], GR.dark, 2.6);
  for (const [x, c] of [[1438, 0], [1457, 0], [1478, 1], [1499, 0]]) c ? circle(ctx, x, 611, 4.5, "#eee6e0", 1.6, HC.line) : knob(ctx, x, 611, 5);
  rr(ctx, 1512, 605, 22, 11, 2, "#d6d0cc", 1.6);
  for (const x of [1441, 1457, 1474, 1491, 1508, 1525]) knob(ctx, x, 632, 5.5);
  // --- the right speaker and the audio interface in front of it
  quadFill(ctx, [1516, 686, 1688, 686, 1688, 902, 1516, 902], GR.dark, 2.8);
  circle(ctx, 1628, 778, 38, "#1b181b", 2, HC.line); circle(ctx, 1628, 778, 31.5, GR.ring, 2.2, HC.line);
  circle(ctx, 1628, 778, 12.5, "#221f22", 2, HC.line); circle(ctx, 1624, 774, 3.5, "#3a353a");
  circle(ctx, 1628, 717, 10, "#1b181b", 2, HC.line); circle(ctx, 1628, 717, 5.5, "#2c282c"); circle(ctx, 1626, 715, 1.8, "#8a848a");
  // the audio interface on the desk edge: five jacks
  quadFill(ctx, [1437, 798, 1588, 798, 1588, 834, 1437, 834], "#242126", 2.6);
  for (const x of [1455, 1485, 1512, 1541, 1570]) { circle(ctx, x, 818, 9, "#131114", 1.6, HC.line); ctx.beginPath(); ctx.arc(x, 818, 7, Math.PI * 1.1, Math.PI * 1.9); ctx.lineWidth = 1.6; ctx.strokeStyle = "#cfc7c9"; ctx.stroke(); circle(ctx, x, 819, 3, "#2a262a"); }
  // --- cable coils hanging behind the synth (left of it)
  for (let k = 0; k < 5; k++) {
    ctx.beginPath(); ctx.ellipse(1700 + k * 3, 690 + k * 8, 18, 80 - k * 6, 0.05, 0, TAU);
    ctx.lineWidth = 4.4; ctx.strokeStyle = HC.line; ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = "#2c282c"; ctx.stroke();
  }
  // --- the upright synth (measured corners): navy body, LED panel, a narrow strip of keys, dark right side
  quadFill(ctx, [1723, 579, 1846, 569, 1834, 802, 1708, 797], "#26304e", 2.8);
  quadFill(ctx, [1810, 573, 1846, 569, 1834, 802, 1800, 800], "#1b2134", 2.4);
  quadFill(ctx, [1776, 609, 1810, 606, 1800, 800, 1762, 797], "#ece6df", 2.2);
  for (let k = 0; k < 22; k++) {
    const u = k / 21, y = 612 + u * 180, x0 = 1775 - u * 13;
    if (k % 7 === 2 || k % 7 === 6) continue;
    quadFill(ctx, [x0, y, x0 + 16, y - 0.5, x0 + 16, y + 4.5, x0, y + 5], "#1c1f2c", 0);
  }
  ctx.strokeStyle = "#39364a"; ctx.lineWidth = 1;
  for (let k = 0; k < 26; k++) { const u = k / 25, y = 612 + u * 186, x0 = 1776 - u * 14; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + 33, y - 1); ctx.stroke(); }
  quadFill(ctx, [1730, 583, 1768, 580, 1768, 604, 1729, 607], "#1f2742", 1.6);
  ctx.fillStyle = "#d8cf9e";
  for (let r = 0; r < 20; r++) for (let c = 0; c < 3; c++) if ((r * 5 + c * 3) % 7 !== 0) {
    const u = r / 19; ctx.beginPath(); ctx.arc(1734 + c * 11 - u * 12, 616 + u * 170, 1.6, 0, TAU); ctx.fill();
  }
  // --- the flight case: black body, cream edge trim and corners, handle strap, middle band, latch, hinges
  quadFill(ctx, [1851, 609, 1990, 609, 1990, 726, 1851, 726], GR.dark, 2.8);
  for (const P of [[1851, 609, 1990, 609, 1990, 617, 1851, 617], [1851, 718, 1990, 718, 1990, 726, 1851, 726], [1851, 609, 1859, 609, 1859, 726, 1851, 726],
    [1982, 609, 1990, 609, 1990, 726, 1982, 726], [1859, 670, 1982, 670, 1982, 679, 1859, 679]]) quadFill(ctx, P, "#dcd1c2", 1.6);
  for (const [x, y] of [[1851, 609], [1976, 609], [1851, 712], [1976, 712]]) rr(ctx, x - 1, y - 1, 16, 16, 2, "#e8dfd2", 1.6);
  rr(ctx, 1880, 594, 64, 12, 5, GR.dark2, 2.2);
  rr(ctx, 1937, 662, 28, 33, 4, "#e8dfd2", 2); rr(ctx, 1943, 668, 16, 21, 3, GR.dark2, 1.4);
  for (const x of [1856, 1968]) rr(ctx, x, 665, 26, 20, 3, "#d8cdbd", 1.6);
  // --- books stacked by the backpack (blue on top)
  books(ctx, [[1942, 2087, 862, 18, "#3c3037", "#eadbc8"], [1946, 2080, 846, 17, "#8a7a6e", "#efe1cf"], [1944, 2082, 830, 17, "#3c3037", "#e9d7c4"],
    [1946, 2078, 814, 16, "#b89a6a", "#efe0cc"], [1943, 2064, 799, 14, "#3a4a7a", "#d8d2da"]]);
  // --- the backpack
  fillSp(ctx, [[2050, 702], [2100, 698], [2140, 712], [2170, 745], [2188, 800], [2192, 860], [2170, 884], [2110, 886], [2060, 884], [2034, 870], [2028, 820], [2030, 760], [2036, 722]], "#211e24", 2.8);
  strokeSp(ctx, [[2045, 712], [2080, 706], [2112, 728], [2135, 770]], 2.4, "#3d3840");
  strokeSp(ctx, [[2060, 760], [2110, 770], [2150, 800]], 2.2, "#3d3840");
  strokeSp(ctx, [[2120, 740], [2138, 800], [2148, 870]], 2, "#3d3840");
  for (const [x, y] of [[2112, 772], [2158, 778]]) { rr(ctx, x - 10, y - 15, 20, 30, 5, "#2e2a30", 2); strokeSp(ctx, [[x - 4, y - 8], [x - 4, y + 9]], 2.2, "#bdb4b8"); strokeSp(ctx, [[x - 4, y - 8], [x + 3, y - 8]], 2.2, "#bdb4b8"); }
  // --- the cameras / devices on the floor and the white card
  quadFill(ctx, [1673, 818, 1829, 818, 1829, 896, 1673, 896], "#2e2b2e", 2.6);
  quadFill(ctx, [1688, 822, 1760, 822, 1760, 838, 1688, 838], "#4a4549", 1.6);
  quadFill(ctx, [1740, 840, 1823, 840, 1823, 879, 1740, 879], "#cfc9c7", 2);
  rr(ctx, 1696, 843, 33, 25, 3, "#d9d4d0", 2); rr(ctx, 1702, 848, 21, 15, 2, "#2c2a2c", 0);
  quadFill(ctx, [1812, 857, 1879, 857, 1879, 884, 1812, 884], "#8f8a8b", 2.2);
  rr(ctx, 1822, 863, 14, 14, 2, "#2c2a2c", 0);
  quadFill(ctx, [1640, 887, 1695, 887, 1698, 905, 1640, 905], "#e8e2de", 2);
  // --- cables snaking across the floor from the devices
  cable(ctx, [[1700, 900], [1760, 910], [1840, 905], [1900, 895], [1960, 905], [2040, 912]], 4);
  cable(ctx, [[1780, 896], [1850, 888], [1920, 880], [1990, 886], [2050, 900]], 3.6);
  cable(ctx, [[1650, 870], [1690, 852], [1760, 830], [1840, 822], [1880, 850], [1905, 895]], 3.6);
  // --- headphones lying on the gold box, the big cable coil on the cream box, cables hanging down its side
  strokeSp(ctx, [[1695, 402], [1720, 385], [1760, 383], [1790, 398]], 8, HC.line); strokeSp(ctx, [[1695, 402], [1720, 385], [1760, 383], [1790, 398]], 4, "#2c282c");
  for (const [x, y, rx, ry, a] of [[1706, 413, 17, 21, -0.4], [1752, 406, 18, 21, -0.3]]) {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, a, 0, TAU); ctx.fillStyle = "#1f1c20"; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = HC.line; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x - 2, y, rx * 0.55, ry * 0.62, a, 0, TAU); ctx.fillStyle = "#3b363b"; ctx.fill();
  }
  for (let k = 0; k < 8; k++) {
    ctx.beginPath(); ctx.ellipse(1858 + k * 2.2, 452 + k * 3, 26 - k * 0.8, 40 - k * 1.5, 0.12, 0, TAU); ctx.lineWidth = 4.2; ctx.strokeStyle = HC.line; ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = "#2c282c"; ctx.stroke();
  }
  cable(ctx, [[1880, 490], [1905, 520], [1915, 560], [1930, 600]], 3.6);
  cable(ctx, [[1890, 492], [1925, 510], [1945, 545], [1955, 600]], 3.4);
}

