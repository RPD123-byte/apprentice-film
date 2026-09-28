// s16 scene: the designer at his desk seen straight on at eye level (steady framing of 46.08–47.48).
// Everything is in frame px of that steady frame (measured on the source with tools/grid.py at 46.80).
// paintScene(P) paints the engraving plate (value + stroke direction) and the crisp ink on P.o.
// The eyes are not in the plate: drawEyes(ctx, look) paints them every frame (the pupils move 46.16–46.28).
import { grey } from "../../lib/engrave.js";
import { taper, INK } from "../../lib/ink.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";

export const poly = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
export const blob = (pts) => (c) => smoothPath(c, pts, true);
const linear = (x0, y0, x1, y1, stops) => (g) => { const r = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, v]) => r.addColorStop(o, grey(v))); return r; };
const radial = (x, y, r0, r1, stops) => (g) => { const r = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, v]) => r.addColorStop(o, typeof v === "number" ? grey(v) : v)); return r; };
const DARK = "#080808";
// a swelling ink line through control points
export function line(o, pts, w, color, per = 6, prof = 0.5) {
  const q = sampleCurve(pts, per);
  taper(o, q, (u) => w * (0.25 + 0.75 * Math.pow(Math.sin(Math.PI * u), prof)), color);
}
// a line that starts full and tapers to a point (hair strands, flicks)
function strand(o, pts, w, color, per = 6, head = 0.12) {
  const q = sampleCurve(pts, per);
  taper(o, q, (u) => w * Math.min(1, 0.35 + u / head) * Math.pow(1 - u, 0.8), color);
}
function soft(g, clip, fn, blur) {
  g.save(); g.beginPath(); clip(g); g.clip(); g.filter = `blur(${blur}px)`; fn(g); g.filter = "none"; g.restore();
}

// ---------------------------------------------------------------- measured outlines (frame px)
export const FACE = [[1276, 196], [1276, 230], [1276, 298], [1281, 332], [1300, 378], [1328, 410], [1368, 436], [1408, 452], [1456, 440], [1504, 408], [1536, 370], [1550, 330], [1553, 270], [1550, 205], [1520, 120], [1410, 100], [1300, 120]];
const NECK = [[1352, 420], [1466, 420], [1462, 520], [1470, 604], [1410, 612], [1356, 604], [1360, 520]];
const BEANIE = [[1190, 205], [1188, 150], [1196, 95], [1214, 50], [1240, 20], [1290, 2], [1350, -8], [1420, -12], [1490, -8], [1552, 4], [1596, 30], [1618, 70], [1628, 120], [1626, 170], [1620, 212], [1590, 200], [1552, 170], [1500, 128], [1450, 108], [1410, 104], [1360, 108], [1300, 126], [1250, 160], [1215, 200]];
const FOLD = [[1196, 92], [1240, 66], [1300, 50], [1370, 40], [1420, 38], [1480, 41], [1540, 50], [1590, 68], [1622, 96]];
const HAIR_L = [[1188, 150], [1240, 150], [1282, 170], [1296, 230], [1284, 300], [1292, 360], [1300, 400], [1284, 440], [1250, 470], [1210, 470], [1180, 430], [1172, 360], [1178, 260]];
const HAIR_R = [[1640, 150], [1590, 150], [1546, 170], [1540, 240], [1552, 300], [1546, 360], [1530, 400], [1560, 430], [1612, 440], [1650, 420], [1660, 330], [1652, 230]];
// shirt: the lit body from the laptop up over both shoulders, round the right arm to the books
const SHIRT = [[994, 650], [1010, 610], [1032, 548], [1060, 510], [1100, 478], [1150, 448], [1210, 422], [1262, 414], [1330, 450], [1410, 470], [1490, 450], [1560, 412], [1620, 430], [1680, 464], [1740, 500], [1772, 540], [1790, 600], [1808, 660], [1850, 700], [1872, 716], [1874, 756], [1760, 760], [1720, 805], [1590, 808], [1575, 850], [1480, 850], [1440, 652]];
const TSHIRT = [[1352, 600], [1410, 614], [1468, 600], [1512, 618], [1548, 626], [1530, 700], [1560, 800], [1575, 850], [1500, 850], [1450, 700], [1440, 652], [1250, 652], [1262, 626], [1310, 606]];
// laptop lid (back), the right edge seen as a white band
export const LID = [[993, 655], [1442, 650], [1514, 846], [996, 848]];
const DESK_Y = 849;

// ---------------------------------------------------------------- the plate
export function paintScene(P) {
  const o = P.o, r = rng(1601);
  // ---- desk: the plank's front edge is the lit band, grain lines run along it; under it the dark rail
  const X1 = 2206 + 90;
  P.fill(poly([[626, DESK_Y], [X1, DESK_Y], [X1, 900], [626, 900]]), linear(626, 0, 2206, 0, [[0, 0.62], [0.12, 0.56], [0.2, 0.5], [0.6, 0.46], [1, 0.4]]), 0.0, { spacing: 0.06, style: 0 });
  P.fill(poly([[626, 900], [X1, 900], [X1, 1040], [626, 1040]]), 0.07, 0.0, { spacing: 0.3, style: 0 });
  // grain: long white streaks, broken, more of them toward the right where the plank goes dark between them
  for (let i = 0; i < 70; i++) {
    const y = DESK_Y + 4 + r() * 44, x0 = 626 + r() * 1650, L = 60 + r() * 360;
    o.globalAlpha = 0.35 + 0.5 * r();
    line(o, [[x0, y], [x0 + L * 0.5, y + (r() - 0.5) * 2], [x0 + L, y + (r() - 0.5) * 3]], 1.2 + r() * 2.2, INK, 4);
  }
  for (let i = 0; i < 40; i++) {
    const y = DESK_Y + 6 + r() * 42, x0 = 830 + r() * 1450, L = 40 + r() * 220;
    o.globalAlpha = 0.8;
    line(o, [[x0, y], [x0 + L, y + (r() - 0.5) * 3]], 1.5 + r() * 2, "#060606", 4);
  }
  o.globalAlpha = 1;
  // top edge: a hairline of light on the desk's lip, and the dark line under the plank
  line(o, [[626, DESK_Y + 1], [1200, DESK_Y], [2300, DESK_Y - 1]], 2.6, "rgba(242,240,234,0.9)", 4, 0.2);
  line(o, [[626, 901], [1400, 900], [2300, 899]], 3, "#050505", 4, 0.2);
  // the plank's cut end at the left, and a leg under the desk
  P.fill(poly([[618, DESK_Y + 2], [630, DESK_Y], [630, 901], [618, 903]]), 0.3, 1.57, { style: 2 });
  P.fill(poly([[724, 900], [792, 900], [792, 1040], [724, 1040]]), 0.1, 1.57, { spacing: 0.2 });
  for (let i = 0; i < 18; i++) { const y = 905 + r() * 40, x0 = 640 + r() * 1600; o.globalAlpha = 0.25; line(o, [[x0, y], [x0 + 80 + r() * 200, y]], 1.2, INK, 3); }
  o.globalAlpha = 1;

  // ---- designer: shirt, t-shirt, neck (drawn before the laptop, which hides his lower body)
  paintShirt(P, r);
  paintHead(P, r);
  paintHeadphones(P, r);
  // ---- laptop lid
  P.fill(poly(LID), 0.0, 0, { style: 2 });
  // white rim along the top and the side band on the right
  taper(o, [[995, 657], [1220, 654], [1440, 651]], (u) => 5.2 - 1.6 * u, "rgba(242,240,234,0.95)");
  o.fillStyle = "rgba(242,240,234,0.95)";
  o.beginPath(); o.moveTo(1436, 651); o.lineTo(1447, 650); o.lineTo(1518, 846); o.lineTo(1506, 846); o.closePath(); o.fill();
  o.fillStyle = "#050505"; o.beginPath(); o.moveTo(1438, 656); o.lineTo(1443, 655); o.lineTo(1511, 846); o.lineTo(1508, 846); o.closePath(); o.fill();
  // the glowing logo dot
  o.fillStyle = "#f4f2ec"; o.beginPath(); o.ellipse(1245, 765, 23.5, 24, 0, 0, 7); o.fill();
  // the hatched paper corner left of the laptop
  o.save(); o.beginPath(); o.moveTo(1013, 756); o.lineTo(1042, 830); o.lineTo(977, 842); o.closePath(); o.clip();
  for (let k = -12; k < 20; k++) { const x = 960 + k * 7; line(o, [[x, 860], [x + 40, 750]], 2.2, "rgba(242,240,234,0.85)", 2, 0.2); }
  o.restore();
  // ---- cables looping over the desk's edge
  const cables = [
    [[1034, 836], [1016, 842], [998, 866], [984, 905], [974, 960]],
    [[1024, 838], [1006, 846], [990, 872], [978, 910], [968, 960]],
    [[1112, 834], [1094, 842], [1076, 870], [1064, 910], [1058, 960]],
    [[1990, 806], [1984, 830], [1990, 880], [1998, 960]],
    [[2004, 806], [2000, 832], [2006, 880], [2014, 960]],
  ];
  for (const c of cables) { line(o, c, 9, "#070707", 6, 0.1); line(o, c.map(([x, y]) => [x - 2.5, y]), 2.2, "rgba(242,240,234,0.8)", 6, 0.3); }
  // ---- mug (two handles), steam is animated separately
  paintMug(P, r);
  // ---- books and a small device on the right of the desk
  paintBooks(P, r);
}

function paintMug(P, r) {
  const o = P.o;
  const body = [[732, 724], [872, 720], [862, 846], [742, 848]];
  P.fill(poly(body), linear(732, 0, 872, 0, [[0, 0.3], [0.2, 0.36], [0.42, 0.72], [0.55, 0.95], [1, 0.96]]), 1.57, { spacing: 0.1, style: 2 });
  // stipple on the shaded side
  o.save(); o.beginPath(); poly(body)(o); o.clip();
  for (let i = 0; i < 700; i++) {
    const x = 734 + Math.pow(r(), 1.6) * 70, y = 726 + r() * 120;
    o.fillStyle = r() < 0.6 ? "rgba(242,240,234,0.75)" : "rgba(8,8,8,0.7)"; o.beginPath(); o.arc(x, y, 0.8 + r() * 1.3, 0, 7); o.fill();
  }
  // vertical streaks in the mid tone
  for (let i = 0; i < 26; i++) { const x = 780 + r() * 30; o.globalAlpha = 0.4; line(o, [[x, 730 + r() * 30], [x + 1, 800 + r() * 44]], 1.2, "#111", 3); }
  o.globalAlpha = 1;
  // measuring ticks near the right edge
  for (let k = 0; k < 9; k++) { const y = 738 + k * 11; o.fillStyle = "#1a1a1a"; o.fillRect(856 - (k % 2 ? 0 : 4), y, k % 2 ? 3 : 7, 1.6); }
  o.restore();
  // rim and outline
  line(o, [[731, 725], [800, 719], [873, 720]], 3, "#f4f2ec", 4, 0.2);
  line(o, [[732, 726], [742, 848]], 2.2, "#0a0a0a", 3, 0.3);
  line(o, [[742, 848], [800, 849], [862, 846]], 2.6, "#0a0a0a", 3, 0.2);
  // right handle: a thick white loop
  line(o, [[868, 747], [896, 748], [911, 770], [906, 806], [890, 824], [864, 826]], 8, "#efede7", 8, 0.25);
  line(o, [[872, 755], [893, 757], [902, 775], [898, 803], [884, 816], [866, 818]], 2, "#0a0a0a", 8, 0.3);
  // left handle: the far one, only its pale outline
  line(o, [[733, 748], [708, 752], [694, 775], [697, 806], [712, 826], [735, 832]], 2.6, "rgba(200,198,192,0.75)", 8, 0.3);
}

function paintBooks(P, r) {
  const o = P.o;
  // lower long book (the hand rests on it) and a shorter one stacked at the right
  P.fill(poly([[1582, 808], [1942, 806], [1946, 846], [1580, 848]]), linear(0, 806, 0, 846, [[0, 0.88], [1, 0.62]]), 0.0, { spacing: 0.1, style: 0 });
  P.fill(poly([[1734, 762], [1940, 764], [1942, 806], [1732, 806]]), linear(0, 762, 0, 806, [[0, 0.92], [1, 0.75]]), 0.0, { spacing: 0.1, style: 0 });
  line(o, [[1734, 762], [1940, 764]], 2.4, "#0a0a0a", 3, 0.2); line(o, [[1732, 806], [1942, 806]], 2.2, "#0a0a0a", 3, 0.2);
  line(o, [[1734, 762], [1732, 806]], 2.4, "#0a0a0a", 3, 0.2); line(o, [[1940, 764], [1943, 806]], 3, "#0a0a0a", 3, 0.2);
  line(o, [[1582, 808], [1942, 806]], 2.2, "#0a0a0a", 3, 0.2); line(o, [[1580, 848], [1946, 846]], 2.6, "#0a0a0a", 3, 0.2);
  for (let i = 0; i < 14; i++) { const y = 770 + r() * 30, x = 1760 + r() * 150; line(o, [[x, y], [x + 30 + r() * 50, y + 1]], 1.2, "rgba(10,10,10,0.6)", 3); }
  for (let i = 0; i < 16; i++) { const y = 814 + r() * 28, x = 1740 + r() * 180; line(o, [[x, y], [x + 30 + r() * 60, y + 1]], 1.2, "rgba(10,10,10,0.6)", 3); }
  // a dark spine block at the right end of the top book
  P.fill(poly([[1922, 766], [1944, 766], [1946, 846], [1922, 846]]), 0.12, 1.57, { spacing: 0.2 });
  // small device with a cable to the right
  P.fill(blob([[1966, 812], [2040, 800], [2110, 792], [2150, 796], [2156, 818], [2120, 838], [2040, 842], [1970, 840]]), linear(1966, 0, 2156, 0, [[0, 0.7], [0.6, 0.5], [1, 0.2]]), 0.1, { spacing: 0.12, style: 0 });
  line(o, [[1966, 812], [2040, 800], [2110, 792], [2150, 796]], 2.4, "rgba(242,240,234,0.7)", 5, 0.3);
  o.fillStyle = "#0a0a0a"; o.beginPath(); o.ellipse(2130, 818, 10, 7, 0, 0, 7); o.fill();
}

