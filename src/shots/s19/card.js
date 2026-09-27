// s19 card: the note card as a physical, glowing object in the room. The card is drawn once (notecard.js, room
// theme, "This is really good") at 2 px per card unit and warped onto its measured perspective quad every frame.
import { noteCardCanvas, releaseNoteCards, CARD_W, CARD_H } from "../../lib/notecard.js";
import { homography, mul3, warp, warpMesh, apply } from "./warp.js";
import { rng } from "../../lib/rng.js";

const K = 2;                                   // canvas px per card unit
// The physical card in the room, measured on the rectified 57.32/57.36 source card (card units): the room theme's
// warm paper a touch brighter (source paper 244 / 216 graded at the left / top vs 240 / 207 before), a 3-unit dark
// keyline all round just outside the paper (source minimum ≈ 70 graded, 2–3 units wide), no thick bottom edge; text
// box (44.8, 153.8)–(424.1, 601.2), button line v 538.8, divider u 239.8; "This is really good" in a monospace at
// 16.73 units per character, cap height 22.2, baseline 205.5, first glyph at u 76.8, heavier and darker than the
// widget's (darkest 87 graded vs 107).
const THEME = {
  paper: "#f4f1ea", paperTop: "#eeeae2", ink: "#4a3036", text: "#3b2a2e", muted: "#7a6468", outline: "rgba(40,20,24,0.8)",
  smiley: "#dccb6c", smileyHi: "#e8da8e", glow: "226,110,80", face: "#4a3228",
  area: { x0: 44.8, y0: 153.8, x1: 424.1, y1: 601.2, btnY: 538.8, divX: 239.8 },
};
let CARD = null;
export function cardCanvas() {
  if (CARD) return CARD;
  const base = noteCardCanvas(CARD_W * K, { theme: THEME, text: "", smiley: 1, edge: 0 });
  const pad = base.__pad, c = document.createElement("canvas"); c.width = base.width; c.height = base.height; c.__pad = pad;
  const g = c.getContext("2d");
  g.save(); g.translate(pad, pad); g.scale(K, K);
  // keyline: a dark rounded rect 3 units larger than the paper, under it
  g.fillStyle = "#3a2629"; g.beginPath(); g.roundRect(-3, -3, CARD_W + 6, CARD_H + 6, 48); g.fill();
  g.restore();
  g.drawImage(base, 0, 0);
  g.save(); g.translate(pad, pad); g.scale(K, K);
  // button labels re-set as measured: CANCEL centred at u 142.2, SAVE at u 333, baselines 577.2 / 578, cap height
  // 16.4–16.8 units; CANCEL a light grey (darkest 164 graded), SAVE dark but lighter in weight than the widget's
  g.fillStyle = THEME.paper; g.fillRect(48, 542, 188, 56); g.fillRect(243.5, 542, 177, 56);
  g.textAlign = "center"; g.textBaseline = "alphabetic";
  g.letterSpacing = "2.3px"; g.font = "400 22.6px 'Geist Mono'"; g.fillStyle = "#857477"; g.fillText("CANCEL", 142.2, 577.2);
  g.letterSpacing = "1.7px"; g.font = "620 22.6px 'Geist Mono'"; g.fillStyle = "#3a2629"; g.fillText("SAVE", 333, 578);
  g.letterSpacing = "0px"; g.textAlign = "left";
  g.font = "430 27.9px 'Geist Mono'"; g.fillStyle = THEME.text; g.textBaseline = "alphabetic";
  g.translate(76.3, 205.5); g.scale(1, 1.116); g.fillText("This is really good", 0, 0);
  g.restore();
  // paper grain (fix pass 3): low-frequency seeded mottle, about ±4 levels, laid over the card in overlay mode; it
  // breaks up the 8-bit banding of the paper gradient that read as faint horizontal ruling once warped
  const gw = Math.ceil(CARD_W / 7), gh = Math.ceil(CARD_H / 7), N = document.createElement("canvas"); N.width = gw; N.height = gh;
  const ng = N.getContext("2d"), id = ng.createImageData(gw, gh), rr = rng(4242);
  for (let i = 0; i < gw * gh; i++) { const v = 128 + Math.round((rr() + rr() + rr() - 1.5) * 52); id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
  ng.putImageData(id, 0, 0);
  g.save(); g.globalCompositeOperation = "overlay"; g.globalAlpha = 0.16; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  g.drawImage(N, pad, pad, CARD_W * K, CARD_H * K); g.restore();
  // and the paper's fine tooth: a speckle of 2.5-unit cells (≈ 1.8 frame px on the standing card) multiplied in, a few
  // levels deep (source: high-pass std ≈ 2 levels on blank paper)
  const fw = Math.ceil(CARD_W / 2.5), fh = Math.ceil(CARD_H / 2.5), F = document.createElement("canvas"); F.width = fw; F.height = fh;
  const fg = F.getContext("2d"), fd = fg.createImageData(fw, fh);
  for (let i = 0; i < fw * fh; i++) { const v = 255 - Math.round(Math.abs(rr() + rr() + rr() - 1.5) * 26); fd.data[i * 4] = fd.data[i * 4 + 1] = fd.data[i * 4 + 2] = v; fd.data[i * 4 + 3] = 255; }
  fg.putImageData(fd, 0, 0);
  g.save(); g.globalCompositeOperation = "multiply"; g.globalAlpha = 0.5; g.imageSmoothingEnabled = false;
  g.drawImage(F, pad, pad, CARD_W * K, CARD_H * K); g.restore();
  g.save(); g.globalCompositeOperation = "destination-in"; g.drawImage(base, 0, 0); g.restore();
  // the keyline under the paper must survive the mask above: redraw it behind
  g.save(); g.globalCompositeOperation = "destination-over"; g.translate(pad, pad); g.scale(K, K);
  g.fillStyle = "#3a2629"; g.beginPath(); g.roundRect(-3, -3, CARD_W + 6, CARD_H + 6, 48); g.fill(); g.restore();
  CARD = c;
  return CARD;
}
export function releaseCard() { CARD = null; releaseNoteCards(); }

// The card's outer corners (TL, TR, BR, BL of the 465 x 648 card) in frame px, per source frame (fix pass 2).
// 57.32–61.40: static, fitted to the paper's four straight edges on 57.36 (line fits, residual 0.2–0.9 px).
// 61.44–63.08: per-frame homographies measured by direct alignment of the source's own standing card (57.32/57.36,
//   rectified) to each frame on high-passed intensities, robust loss (the owl in front is rejected), coarse to fine,
//   started from key poses measured on the card's keylines (paper edges, text box, button line) at 61.44–61.88,
//   62.04, 62.12, and from the extrapolated previous frame elsewhere (snapshots/s19b-prev/src-legacy/trace/linemeas.py, direct.py,
//   rundirect.py). Checked by overlaying the keylines on every frame (snapshots/s19-fix2-ref/kc/dr-*.jpg): within
//   ~2–5 px where the card is visible. Frames the source repeats (61.56, 62.00, 62.56) repeat here.
// The source card is not a rigid plane while it is carried: its lower right corner sags away from the perspective of
// the upper part (the card looks longer down its right edge). From 61.72 each row holds TWO homographies: the first
// (upper) from the direct alignment (it pins the text, box and smiley); the second (lower) is the same quad with its
// bottom-right corner moved to the paper's sharp corner = the intersection of the right edge (last bright pixel per
// row) and the bottom edge (per column) fitted beside the owl, away from the rounded corner (snapshots/s19b-prev/src-legacy/trace/corner.py; line
// residuals 0.3–0.6 px at 61.72, 61.76, 62.24–62.48, 62.60; offsets from the upper BR up to (86, 146) px). Frames where
// the owl hides an edge are interpolated; once the corner leaves the frame the offset is held. The bottom-left
// corner stays the upper one's (checked at 62.28 against the left edge and the bottom edge's slope, −0.18). The card
// is drawn as a mesh whose points blend the two by v (smoothstep over v 300–550 units).
export const CARD_TAB = [
  [57.32, 1093.2, 86.9, 1578.4, 50.7, 1686.5, 802.5, 995.7, 774.1,   1093.2, 86.9, 1578.4, 50.7, 1686.5, 802.5, 995.7, 774.1],
  [61.40, 1093.2, 86.9, 1578.4, 50.7, 1686.5, 802.5, 995.7, 774.1,   1093.2, 86.9, 1578.4, 50.7, 1686.5, 802.5, 995.7, 774.1],
  [61.44, 1093.7, 78.8, 1578.2, 49.3, 1685.1, 801.6, 996.1, 773.0,   1093.7, 78.8, 1578.2, 49.3, 1685.1, 801.6, 996.1, 773.0],
  [61.48, 1091.7, 52.4, 1587.1, 14.1, 1677.4, 805.5, 994.3, 775.4,   1091.7, 52.4, 1587.1, 14.1, 1677.4, 805.5, 994.3, 775.4],
  [61.52, 1081.4, -3.7, 1601.1, -48.1, 1666.6, 810.1, 993.2, 780.1,   1081.4, -3.7, 1601.1, -48.1, 1666.6, 810.1, 993.2, 780.1],
  [61.56, 1081.4, -3.7, 1601.1, -48.1, 1666.6, 810.1, 993.2, 780.1,   1081.4, -3.7, 1601.1, -48.1, 1666.6, 810.1, 993.2, 780.1],
  [61.60, 1029.6, -50.3, 1586.9, -118.4, 1656.5, 804.0, 992.0, 786.3,   1029.6, -50.3, 1586.9, -118.4, 1656.5, 804.0, 992.0, 786.3],
  [61.64, 981.3, -74.8, 1562.3, -165.5, 1647.1, 794.9, 992.3, 789.2,   981.3, -74.8, 1562.3, -165.5, 1647.1, 794.9, 992.3, 789.2],
  [61.68, 891.4, -103.4, 1509.7, -217.6, 1639.1, 790.6, 1001.1, 782.1,   891.4, -103.4, 1509.7, -217.6, 1639.1, 790.6, 1001.1, 782.1],
  [61.72, 773.3, -116.7, 1402.5, -268.2, 1628.4, 789.7, 1012.8, 772.4,   773.3, -116.7, 1402.5, -268.2, 1628.4, 789.7, 1012.8, 772.4],
  [61.76, 657.4, -117.2, 1291.9, -301.0, 1625.8, 764.7, 1030.6, 758.8,   657.4, -117.2, 1291.9, -301.0, 1635.8, 767.7, 1030.6, 758.8],
  [61.80, 603.4, -114.0, 1234.1, -329.1, 1629.2, 736.3, 1042.2, 744.7,   603.4, -114.0, 1234.1, -329.1, 1634.2, 732.3, 1042.2, 744.7],
  [61.84, 553.2, -105.6, 1177.2, -329.2, 1638.1, 709.6, 1055.2, 738.4,   553.2, -105.6, 1177.2, -329.2, 1638.1, 697.6, 1055.2, 738.4],
  [61.88, 521.7, -99.6, 1144.5, -335.3, 1642.5, 692.4, 1063.4, 733.9,   521.7, -99.6, 1144.5, -335.3, 1642.5, 680.4, 1063.4, 733.9],
  [61.92, 503.3, -92.2, 1125.9, -339.9, 1642.9, 680.7, 1071.4, 734.2,   503.3, -92.2, 1125.9, -339.9, 1642.9, 668.7, 1071.4, 734.2],
  [61.96, 500.0, -87.6, 1113.7, -342.8, 1645.8, 676.7, 1072.8, 734.1,   500.0, -87.6, 1113.7, -342.8, 1645.8, 664.7, 1072.8, 734.1],
  [62.00, 500.0, -87.6, 1113.7, -342.8, 1645.8, 676.7, 1072.8, 734.1,   500.0, -87.6, 1113.7, -342.8, 1645.8, 664.7, 1072.8, 734.1],
  [62.04, 480.4, -87.5, 1075.7, -376.8, 1660.9, 666.8, 1076.0, 735.3,   480.4, -87.5, 1075.7, -376.8, 1660.9, 654.8, 1076.0, 735.3],
  [62.08, 467.7, -90.8, 1056.4, -399.4, 1662.4, 658.2, 1074.3, 736.2,   467.7, -90.8, 1056.4, -399.4, 1662.4, 663.2, 1074.3, 736.2],
  [62.12, 451.1, -99.7, 1049.0, -436.4, 1677.2, 647.1, 1076.6, 732.1,   451.1, -99.7, 1049.0, -436.4, 1677.2, 672.1, 1076.6, 732.1],
  [62.16, 465.7, -99.0, 1062.1, -446.8, 1686.9, 587.1, 1115.8, 732.9,   465.7, -99.0, 1062.1, -446.8, 1691.9, 637.1, 1115.8, 732.9],
  [62.20, 499.8, -92.5, 1072.2, -458.8, 1707.3, 540.8, 1157.6, 740.9,   499.8, -92.5, 1072.2, -458.8, 1732.3, 626.8, 1157.6, 740.9],
  [62.24, 534.9, -81.2, 1085.3, -486.6, 1718.6, 516.6, 1193.5, 753.4,   534.9, -81.2, 1085.3, -486.6, 1789.6, 631.6, 1193.5, 753.4],
  [62.28, 588.0, -69.5, 1088.5, -561.1, 1740.2, 493.2, 1237.1, 755.4,   588.0, -69.5, 1088.5, -561.1, 1826.2, 629.2, 1237.1, 755.4],
  [62.32, 641.0, -62.0, 1092.6, -618.2, 1805.0, 472.8, 1274.4, 742.7,   641.0, -62.0, 1092.6, -618.2, 1870.0, 617.8, 1274.4, 742.7],
  [62.36, 681.5, -59.3, 1092.9, -637.9, 1854.0, 471.0, 1305.1, 731.3,   681.5, -59.3, 1092.9, -637.9, 1908.0, 614.0, 1305.1, 731.3],
  [62.40, 724.8, -60.0, 1121.8, -649.3, 1901.1, 473.7, 1341.8, 730.2,   724.8, -60.0, 1121.8, -649.3, 1948.1, 617.7, 1341.8, 730.2],
  [62.44, 772.2, -63.1, 1170.1, -657.5, 1950.8, 473.1, 1393.2, 727.7,   772.2, -63.1, 1170.1, -657.5, 1998.8, 617.1, 1393.2, 727.7],
  [62.48, 815.2, -65.7, 1221.6, -663.7, 1993.3, 474.2, 1439.7, 728.6,   815.2, -65.7, 1221.6, -663.7, 2046.3, 620.2, 1439.7, 728.6],
  [62.52, 863.8, -67.7, 1262.8, -667.1, 2047.8, 477.5, 1486.6, 725.7,   863.8, -67.7, 1262.8, -667.1, 2099.8, 622.5, 1486.6, 725.7],
  [62.56, 863.8, -67.7, 1262.8, -667.1, 2047.8, 477.5, 1486.6, 725.7,   863.8, -67.7, 1262.8, -667.1, 2099.8, 622.5, 1486.6, 725.7],
  [62.60, 910.2, -71.3, 1332.3, -665.4, 2087.8, 481.2, 1535.8, 728.1,   910.2, -71.3, 1332.3, -665.4, 2139.8, 626.2, 1535.8, 728.1],
  [62.64, 964.5, -74.6, 1381.3, -678.3, 2142.0, 478.4, 1588.4, 722.4,   964.5, -74.6, 1381.3, -678.3, 2194.0, 623.9, 1588.4, 722.4],
  [62.68, 1014.0, -77.2, 1419.0, -695.0, 2201.1, 473.9, 1640.3, 720.6,   1014.0, -77.2, 1419.0, -695.0, 2253.1, 619.9, 1640.3, 720.6],
  [62.72, 1059.4, -78.4, 1492.4, -679.9, 2245.1, 485.5, 1688.7, 722.9,   1059.4, -78.4, 1492.4, -679.9, 2297.1, 631.5, 1688.7, 722.9],
  [62.76, 1111.1, -77.6, 1566.6, -669.1, 2292.9, 493.4, 1737.5, 724.6,   1111.1, -77.6, 1566.6, -669.1, 2344.9, 639.4, 1737.5, 724.6],
  [62.80, 1174.2, -76.3, 1597.6, -656.4, 2369.6, 482.7, 1797.6, 721.2,   1174.2, -76.3, 1597.6, -656.4, 2421.6, 628.7, 1797.6, 721.2],
  [62.84, 1235.7, -71.7, 1645.0, -625.2, 2441.4, 472.4, 1852.4, 727.1,   1235.7, -71.7, 1645.0, -625.2, 2493.4, 618.4, 1852.4, 727.1],
  [62.88, 1292.6, -65.0, 1705.0, -581.8, 2508.7, 463.9, 1911.0, 734.6,   1292.6, -65.0, 1705.0, -581.8, 2560.7, 609.9, 1911.0, 734.6],
  [62.92, 1352.1, -55.4, 1788.6, -498.7, 2596.6, 482.3, 1962.0, 734.9,   1352.1, -55.4, 1788.6, -498.7, 2648.6, 628.3, 1962.0, 734.9],
  [62.96, 1411.4, -49.2, 1877.7, -438.5, 2692.0, 469.8, 2013.6, 724.3,   1411.4, -49.2, 1877.7, -438.5, 2744.0, 615.8, 2013.6, 724.3],
  [63.00, 1472.5, -43.4, 1941.5, -428.7, 2701.0, 409.7, 2053.8, 707.0,   1472.5, -43.4, 1941.5, -428.7, 2753.0, 555.7, 2053.8, 707.0],
  [63.04, 1528.9, -38.0, 1969.9, -409.8, 2667.7, 366.3, 2109.0, 712.7,   1528.9, -38.0, 1969.9, -409.8, 2719.7, 512.3, 2109.0, 712.7],
  [63.08, 1583.1, -33.2, 2009.8, -360.8, 2686.9, 361.7, 2169.1, 727.5,   1583.1, -33.2, 2009.8, -360.8, 2738.9, 507.7, 2169.1, 727.5]
];
export const CORNERS = [[0, 0], [CARD_W, 0], [CARD_W, CARD_H], [0, CARD_H]];
// the card's rounded outline in card units (for its glow)
export const CARD_OUTLINE = (() => {
  const R = 45, o = [], arc = (cx, cy, a0) => { for (let k = 0; k <= 6; k++) { const a = a0 + (k / 6) * Math.PI / 2; o.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); } };
  arc(CARD_W - R, R, -Math.PI / 2); arc(CARD_W - R, CARD_H - R, 0); arc(R, CARD_H - R, Math.PI / 2); arc(R, R, Math.PI);
  return o;
})();
// Row (17 numbers: t, upper TL TR BR BL, lower TL TR BR BL) at time t; linear between rows, extrapolated after 63.08.
function cardRow(t) {
  const T = CARD_TAB;
  if (t <= T[1][0]) return T[0];
  if (t >= T[T.length - 1][0]) {
    const a = T[T.length - 2], b = T[T.length - 1], u = (t - b[0]) / (b[0] - a[0]);
    return b.map((v, i) => (i === 0 ? t : v + (v - a[i]) * u));
  }
  let i = 1; while (T[i + 1][0] < t) i++;
  const a = T[i], b = T[i + 1], u = (t - a[0]) / (b[0] - a[0]);
  return a.map((v, k) => v + (b[k] - v) * u);
}
const quadOf = (r, o) => [[r[o], r[o + 1]], [r[o + 2], r[o + 3]], [r[o + 4], r[o + 5]], [r[o + 6], r[o + 7]]];
// the card's visible outline: top corners from the upper homography, bottom corners from the lower one
export function cardQuad(t) {
  const r = cardRow(t), up = quadOf(r, 1), lo = quadOf(r, 9);
  return [up[0], up[1], lo[2], lo[3]];
}
export const cardH = (t) => homography(CORNERS, quadOf(cardRow(t), 1));
export function cardMap(t) {
  const r = cardRow(t), H1 = homography(CORNERS, quadOf(r, 1)), H2 = homography(CORNERS, quadOf(r, 9));
  return (u, v) => {
    let w = Math.min(1, Math.max(0, (v - 300) / 250)); w = w * w * (3 - 2 * w);
    const a = apply(H1, [u, v]); if (w <= 0) return a;
    const b = apply(H2, [u, v]); return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w];
  };
}

// The card at time t in a frame-sized transparent canvas (reused): a mesh through the blended map.
export function warpCardAt(t, W, Hh) {
  const c = cardCanvas(), pad = c.__pad, m = cardMap(t);
  return warpMesh(c, m, (u, v) => [(u * K + pad) / c.width, (v * K + pad) / c.height], W, Hh, CARD_W, CARD_H, pad / K);
}
// The card over a quarter-frame shutter (times ts, one pass), into a canvas covering only its bounding box:
// returns { canvas, x, y, w, h }: draw the canvas's top-left w x h at (x, y).
export function warpCardShutter(ts, W, Hh) {
  const c = cardCanvas(), pad = c.__pad, maps = ts.map((t) => cardMap(t));
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const m of maps) for (const [u, v] of [[-pad / K, -pad / K], [CARD_W + pad / K, -pad / K], [CARD_W + pad / K, CARD_H + pad / K], [-pad / K, CARD_H + pad / K], [CARD_W / 2, CARD_H + pad / K], [CARD_W + pad / K, CARD_H / 2]]) {
    const p = m(u, v); x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]);
  }
  x0 = Math.max(0, Math.floor(x0 - 4)); y0 = Math.max(0, Math.floor(y0 - 4)); x1 = Math.min(W, Math.ceil(x1 + 4)); y1 = Math.min(Hh, Math.ceil(y1 + 4));
  const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
  // the GL canvas keeps the frame size (no reallocation per frame); the card is drawn at its top-left, w x h
  const cv = warpMesh(c, maps.map((m) => (u, v) => { const p = m(u, v); return [p[0] - x0, p[1] - y0]; }), (u, v) => [(u * K + pad) / c.width, (v * K + pad) / c.height], W, Hh, CARD_W, CARD_H, pad / K);
  return { canvas: cv, x: x0, y: y0, w, h };
}
// Warp the card with H (units -> frame) into a frame-sized transparent canvas (reused).
export function warpCard(H, W, Hh) {
  const c = cardCanvas(), pad = c.__pad;
  const T = [1 / K, 0, -pad / K, 0, 1 / K, -pad / K, 0, 0, 1];   // canvas px -> card units
  return warp(c, mul3(H, T), W, Hh);
}
