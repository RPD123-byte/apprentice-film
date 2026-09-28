// s19 card: the note card as a physical, glowing object in the room. The card is drawn once (notecard.js, room
// theme, "This is really good") at 2 px per card unit and warped onto its measured perspective quad every frame.
import { noteCardCanvas, releaseNoteCards, CARD_W, CARD_H } from "../../lib/notecard.js";
import { homography, mul3, warp } from "./warp.js";

const K = 2;                                   // canvas px per card unit
let CARD = null;
export function cardCanvas() {
  if (!CARD) CARD = noteCardCanvas(CARD_W * K, { theme: "room", text: "This is really good", smiley: 1, edge: 6 * K });
  return CARD;
}
export function releaseCard() { CARD = null; releaseNoteCards(); }

// The card's outer corners (TL, TR, BR, BL of the 465 x 648 card) in frame px, per source frame.
// 57.32–61.44: static (fitted to the text-box corners and the card edges; residual ~5 px).
// 61.48–61.72: a homography fitted jointly to the card's upper band (ECC against the rectified 57.32 card) and its
//   straight edges (Hough on the paper mask).
// 61.76–62.80: a rigid card in 3D (focal 1312 px, fitted on the static pose) whose projected outline best overlaps
//   the bright paper mask (the owl's body below the card excluded), held to the ECC-tracked text line.
// 62.84–63.08: the 62.80 shape translated with the ECC-tracked text line (the card is mostly off frame).
// Lightly smoothed [1/4 1/2 1/4]. The source repeats a frame at 61.56 and 62.56; so does the table.
export const CARD_TAB = [
  [57.32, 1086.7, 77.2, 1584.6, 48.7, 1690.4, 804.2, 986.4, 775.0],
  [61.44, 1086.7, 77.2, 1584.6, 48.7, 1690.4, 804.2, 986.4, 775.0],
  [61.48, 1085.8, 39.5, 1581.8, 7.3, 1686.2, 801.8, 994.4, 782.8],
  [61.52, 1078.7, -5.3, 1599.1, -45.1, 1669.0, 803.9, 994.6, 773.3],
  [61.56, 1078.7, -5.3, 1599.1, -45.1, 1669.0, 803.9, 994.6, 773.3],
  [61.60, 1023.0, -61.8, 1583.1, -122.2, 1660.8, 799.6, 992.7, 774.3],
  [61.64, 962.3, -90.4, 1554.6, -171.6, 1649.1, 777.3, 992.2, 763.8],
  [61.68, 877.5, -103.8, 1495.0, -203.4, 1635.1, 737.3, 991.8, 741.5],
  [61.72, 774.4, -98.7, 1424.7, -249.2, 1620.9, 732.8, 1005.3, 735.5],
  [61.76, 683.9, -79.9, 1390.5, -309.4, 1607.8, 760.6, 1031.8, 740.0],
  [61.80, 624.4, -68.2, 1367.0, -351.3, 1605.1, 759.0, 1045.1, 736.0],
  [61.84, 582.0, -63.2, 1321.0, -389.0, 1618.1, 740.0, 1052.7, 731.6],
  [61.88, 553.4, -56.2, 1285.0, -415.6, 1632.1, 732.8, 1061.6, 731.0],
  [61.92, 541.6, -49.6, 1274.0, -418.5, 1636.7, 728.6, 1065.3, 730.1],
  [61.96, 532.8, -50.8, 1269.0, -424.1, 1636.3, 722.8, 1064.9, 725.9],
  [62.00, 521.4, -57.2, 1265.0, -436.6, 1634.9, 719.0, 1061.6, 722.3],
  [62.04, 505.5, -65.3, 1242.2, -470.9, 1641.4, 717.0, 1061.7, 723.5],
  [62.08, 485.6, -74.7, 1201.3, -522.7, 1654.5, 712.9, 1066.3, 724.7],
  [62.12, 475.5, -79.0, 1189.2, -554.4, 1669.7, 700.8, 1075.8, 719.4],
  [62.16, 491.1, -71.7, 1208.2, -560.5, 1696.4, 683.7, 1099.6, 711.8],
  [62.20, 524.7, -59.0, 1229.9, -555.9, 1728.0, 667.9, 1130.5, 706.7],
  [62.24, 566.9, -46.0, 1227.2, -554.2, 1759.9, 651.9, 1163.6, 706.1],
  [62.28, 619.3, -30.0, 1211.5, -555.8, 1801.1, 635.3, 1204.7, 711.0],
  [62.32, 671.7, -16.8, 1228.0, -549.0, 1845.6, 622.5, 1246.8, 711.1],
  [62.36, 723.4, -5.6, 1268.5, -530.3, 1888.3, 618.0, 1286.9, 708.1],
  [62.40, 772.7, -4.2, 1307.5, -531.6, 1935.8, 616.0, 1324.5, 709.0],
  [62.44, 810.6, -18.8, 1332.5, -564.8, 1991.6, 618.7, 1362.9, 700.9],
  [62.48, 841.4, -40.1, 1356.5, -603.8, 2046.3, 630.2, 1400.2, 683.0],
  [62.52, 867.2, -55.0, 1393.6, -624.9, 2080.0, 637.2, 1422.0, 674.0],
  [62.56, 867.2, -55.0, 1393.6, -624.9, 2080.0, 637.2, 1422.0, 674.0],
  [62.60, 931.0, -44.1, 1479.4, -597.2, 2131.5, 638.8, 1461.4, 683.4],
  [62.64, 973.3, -55.8, 1521.4, -622.9, 2180.6, 637.4, 1490.6, 686.8],
  [62.68, 1013.9, -72.5, 1556.0, -658.9, 2232.7, 635.0, 1520.8, 686.4],
  [62.72, 1070.6, -71.1, 1587.1, -653.9, 2292.8, 639.0, 1570.7, 683.9],
  [62.76, 1144.3, -56.2, 1608.1, -623.3, 2378.7, 647.0, 1649.0, 678.6],
  [62.80, 1208.4, -45.4, 1642.2, -606.1, 2471.6, 646.5, 1726.5, 672.6],
  [62.84, 1260.9, -44.4, 1693.4, -605.9, 2539.9, 642.1, 1785.9, 668.9],
  [62.88, 1317.0, -43.4, 1749.5, -604.8, 2596.0, 643.2, 1842.0, 669.9],
  [62.92, 1376.3, -40.3, 1808.7, -601.7, 2655.3, 646.3, 1901.3, 673.1],
  [62.96, 1436.3, -39.9, 1868.7, -601.3, 2715.3, 646.7, 1961.2, 673.5],
  [63.00, 1495.8, -41.3, 1928.2, -602.7, 2774.7, 645.3, 2020.7, 672.1],
  [63.04, 1554.5, -40.8, 1987.0, -602.2, 2833.5, 645.8, 2079.5, 672.6],
  [63.08, 1613.2, -36.9, 2045.6, -598.3, 2892.2, 649.7, 2138.1, 676.5],
];
export const CORNERS = [[0, 0], [CARD_W, 0], [CARD_W, CARD_H], [0, CARD_H]];
export function cardQuad(t) {
  const T = CARD_TAB;
  let row;
  if (t <= T[1][0]) row = T[0];
  else if (t >= T[T.length - 1][0]) {
    // after the last measured frame (63.08): keep moving at the last measured velocity
    const a = T[T.length - 2], b = T[T.length - 1], u = (t - b[0]) / (b[0] - a[0]);
    row = b.map((v, i) => (i === 0 ? t : v + (v - a[i]) * u));
  } else {
    let i = 1; while (T[i + 1][0] < t) i++;
    const a = T[i], b = T[i + 1], u = (t - a[0]) / (b[0] - a[0]);
    row = a.map((v, k) => v + (b[k] - v) * u);
  }
  return [[row[1], row[2]], [row[3], row[4]], [row[5], row[6]], [row[7], row[8]]];
}
export const cardH = (t) => homography(CORNERS, cardQuad(t));

// Warp the card with H (units -> frame) into a frame-sized transparent canvas (reused).
export function warpCard(H, W, Hh) {
  const c = cardCanvas(), pad = c.__pad;
  const T = [1 / K, 0, -pad / K, 0, 1 / K, -pad / K, 0, 0, 1];   // canvas px -> card units
  return warp(c, mul3(H, T), W, Hh);
}
