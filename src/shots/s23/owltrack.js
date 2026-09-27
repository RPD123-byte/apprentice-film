// s23 owl placement per source frame (frame px of the owl kit's root = middle of the body; s = px per owl unit).
// Measured in this pass on the source frames (snapshots/s23r-tools/): the carries from the owl's body span in the
// band y 300–352 under the load (root x = span centre − 5), the flights and landings from labelled 2–3x crops and
// difference-mask bounding boxes against clean plates.

// the old strip carried off (84.12–85.76): [k, span x0, span x1]; the owl walks along the hole's lower lip (y fixed)
export const STRIP_WALK = [[2103, 1253, 1445], [2105, 1258, 1421], [2107, 1258, 1421], [2109, 1265, 1422], [2111, 1315, 1437], [2113, 1324, 1445], [2115, 1354, 1461],
  [2118, 1370, 1477], [2120, 1390, 1500], [2122, 1402, 1522], [2124, 1432, 1542], [2126, 1443, 1555], [2128, 1477, 1589], [2130, 1489, 1621], [2132, 1540, 1649],
  [2134, 1577, 1684], [2136, 1612, 1720], [2138, 1631, 1750], [2139, 1635, 1750]];
// the banner carried in (86.72–88.32)
export const BAN_WALK = [[2168, 1569, 1688], [2169, 1536, 1656], [2170, 1512, 1633], [2171, 1491, 1612], [2172, 1450, 1568], [2173, 1431, 1549], [2174, 1409, 1528],
  [2175, 1387, 1507], [2176, 1346, 1462], [2177, 1320, 1439], [2178, 1295, 1413], [2179, 1267, 1384], [2180, 1203, 1322], [2181, 1174, 1292], [2182, 1145, 1263],
  [2183, 1116, 1234], [2184, 1060, 1177], [2185, 1035, 1152], [2186, 1012, 1128], [2187, 989, 1103], [2188, 939, 1057], [2189, 917, 1033], [2190, 893, 1010],
  [2191, 876, 987], [2193, 844, 931], [2194, 833, 919], [2195, 803, 917], [2196, 787, 902], [2197, 751, 865], [2198, 733, 847], [2199, 716, 829], [2200, 698, 811],
  [2201, 668, 779], [2202, 658, 768], [2203, 654, 765]];
export const WALK_Y = 312;
// flights: [k, x, y] of the root (read off tiles, ±10 px)
export const STRIP_EXIT = [[2145, 1868, 300], [2146, 1881, 300], [2147, 1965, 245], [2148, 2040, 140], [2149, 2115, 95], [2150, 2190, 55]];
export const BAN_ENTRY = [[2163, 2130, 40], [2164, 2010, 80], [2165, 1900, 125], [2166, 1800, 168], [2167, 1800, 168]];
// the hop off the banner and down onto the gear boxes (89.60–90.28): root, from the difference-mask boxes
export const HOP = [[2240, 718, 300], [2241, 712, 270], [2242, 712, 262], [2243, 706, 262], [2244, 700, 255], [2245, 700, 256], [2246, 700, 256],
  [2247, 698, 282], [2248, 700, 336], [2249, 700, 425], [2250, 690, 505], [2251, 690, 522], [2252, 690, 522], [2253, 690, 522]];
// hold the last sample at or before k
export function at(tab, k) {
  let r = tab[0];
  for (const q of tab) { if (q[0] <= k) r = q; else break; }
  return r;
}
// linear interpolation between samples (k may fall between them)
export function lerpTab(tab, k) {
  if (k <= tab[0][0]) return tab[0].slice(1);
  for (let i = 1; i < tab.length; i++) if (tab[i][0] >= k) {
    const a = tab[i - 1], b = tab[i], u = (k - a[0]) / (b[0] - a[0]);
    return a.slice(1).map((v, j) => v + (b[j + 1] - v) * u);
  }
  return tab[tab.length - 1].slice(1);
}
