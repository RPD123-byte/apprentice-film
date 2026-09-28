// Key A — the front close-up (source frame 20.40, held 20.1–20.84; 19.12–20.1 is the same drawing under the pan).
// Everything in frame coordinates of that source frame. `look` sets the irises: toward the owl (default), or at the
// camera for the variant used across the glance (21.28–21.48), which differs from the default only in the irises.
import { SHAPES } from "./shapes.js";
import { hairStrands } from "./figure.js";
import { ink, lock, strands, hatch, combStrokes, stubble, softValue, sweat, poly, blob, ell, linear, radial, rng, taper, INK, DARK, TAU, sampleCurve, smoothPath } from "./kit.js";

// ---------- measured outlines ----------
export const TORSO = [[-170, 1120], [-40, 980], [20, 946], [60, 820], [100, 700], [165, 645], [250, 590], [400, 540], [500, 505], [585, 470], [760, 460],
  [1300, 460], [1450, 500], [1500, 540], [1575, 565], [1650, 580], [1725, 578], [1800, 590], [1875, 625], [1930, 675], [1970, 750], [1990, 825], [2010, 925], [2040, 1120]];
export const HAIR_L = [[590, 330], [566, 380], [552, 450], [548, 520], [556, 580], [578, 632], [612, 682], [652, 718], [705, 736], [760, 700], [770, 560], [740, 400], [700, 300]];
export const HAIR_R = [[1330, 250], [1440, 250], [1488, 320], [1506, 400], [1512, 480], [1502, 560], [1484, 636], [1462, 690], [1418, 706], [1372, 690], [1320, 640], [1300, 500], [1305, 350]];
export const FACE = [[700, 200], [800, 140], [900, 105], [1000, 88], [1100, 95], [1200, 118], [1300, 165], [1330, 240], [1338, 340], [1332, 450], [1318, 560], [1300, 650], [1275, 720], [1240, 790], [1200, 840],
  [1100, 870], [1000, 872], [900, 858], [840, 805], [800, 725], [770, 640], [746, 540], [735, 440], [722, 340], [706, 262]];
export const HAIRLINE = [[590, 350], [612, 290], [652, 232], [720, 172], [820, 122], [920, 96], [1000, 86], [1080, 90], [1180, 108], [1280, 145], [1370, 200], [1440, 262], [1486, 330]];
export const BEANIE_TOP = [[1486, 330], [1506, 250], [1510, 150], [1494, 50], [1452, -50], [1372, -140], [1252, -210], [1100, -240], [950, -240], [800, -202], [690, -130], [624, -50], [584, 40], [558, 130], [554, 220], [564, 300]];
export const CUFF_TOP = [[556, 200], [596, 112], [678, 40], [800, -6], [950, -28], [1100, -28], [1250, -2], [1372, 54], [1452, 122], [1504, 206]];
export const EYES = [
  { c: [895, 332], r: 36, look: [0.62, -0.05], open: [[748, 322], [790, 292], [850, 274], [905, 284], [940, 314], [946, 346], [905, 362], [850, 372], [792, 362]] },
  { c: [1272, 322], r: 36, look: [0.62, -0.1], open: [[1143, 346], [1172, 312], [1238, 285], [1296, 285], [1330, 303], [1322, 322], [1298, 342], [1240, 364], [1180, 360]] },
];
export const SIL = [poly(TORSO), blob(FACE), blob([...HAIRLINE, ...BEANIE_TOP]), ...SHAPES.A.hair.map((h) => poly(h))];
export const BOUNDS = [-170, -260, 2060, 1120];

export function paintKeyA(P, look = null) {
  const o = P.o, r = rng(404);
  // ---------- torso: the pale shirt, hatched dark across the top of each shoulder, long fold strokes down ----------
  P.fill(poly(TORSO), linear(0, 460, 0, 946, [[0, 0.86], [0.35, 0.93], [1, 0.95]]), 1.5, { style: 2 });
  softValue(P, blob([[40, 700], [180, 600], [380, 530], [560, 480], [600, 560], [420, 620], [220, 720], [80, 820]]), 0.55, 22, 0.8);
  softValue(P, blob([[1440, 490], [1600, 560], [1800, 590], [1930, 670], [1990, 800], [1900, 760], [1760, 680], [1560, 610]]), 0.62, 22, 0.8);
  softValue(P, blob([[1880, 640], [1980, 760], [2010, 900], [1940, 946], [1900, 800]]), 0.4, 16, 0.8);
  // cross-hatching on the shoulder tops (dark lines on the lit cloth)
  const shL = blob([[20, 900], [60, 780], [120, 660], [250, 580], [420, 525], [590, 470], [600, 540], [430, 580], [260, 640], [150, 740], [90, 880]]);
  hatch(o, shL, [0, 460, 620, 946], { angle: -0.55, spacing: 5.5, len: [30, 90], w: 1.3, alpha: 0.75, seed: 11 });
  hatch(o, shL, [0, 460, 620, 946], { angle: 0.95, spacing: 7, len: [20, 70], w: 1.1, alpha: 0.6, seed: 12, density: 0.8 });
  const shR = blob([[1440, 495], [1580, 560], [1760, 585], [1880, 630], [1960, 720], [2000, 850], [1930, 820], [1850, 700], [1700, 640], [1540, 610]]);
  hatch(o, shR, [1430, 480, 2010, 946], { angle: 0.6, spacing: 5.5, len: [30, 90], w: 1.3, alpha: 0.7, seed: 13 });
  hatch(o, shR, [1430, 480, 2010, 946], { angle: -0.9, spacing: 7.5, len: [20, 60], w: 1.0, alpha: 0.5, seed: 14, density: 0.7 });
  // long fold strokes falling from the shoulders
  combStrokes(o, [[60, 820], [120, 690], [250, 600], [420, 540], [560, 490]], { dir: (p) => [0.18, 1], len: [60, 190], step: 9, w: 1.5, alpha: 0.6, seed: 15, bend: 0.12 });
  combStrokes(o, [[1470, 520], [1600, 575], [1760, 598], [1880, 650], [1960, 740]], { dir: (p) => [-0.1, 1], len: [60, 200], step: 9, w: 1.5, alpha: 0.55, seed: 16, bend: 0.12 });
  // outer edge of the shoulders
  ink(o, [[20, 946], [60, 820], [100, 700], [165, 645], [250, 590], [400, 540], [500, 505], [585, 470]], 3.2, DARK);
  ink(o, [[1450, 500], [1575, 565], [1725, 578], [1875, 625], [1970, 750], [2010, 925]], 3.2, DARK);
  // a seam over the left shoulder
  ink(o, [[70, 780], [180, 690], [330, 612], [470, 560], [560, 520]], 1.6, "rgba(10,10,10,0.7)");


  // ---------- face ----------
  P.fill(blob(FACE), radial(1040, 430, 60, 420, [[0, 0.97], [0.7, 0.95], [1, 0.86]]), 1.2, { style: 2 });
  // soft greys: temples, cheek edges, under the jaw, round the eyes (dark circles)
  softValue(P, blob([[706, 262], [760, 250], [790, 420], [770, 600], [800, 725], [760, 660], [735, 440]]), 0.72, 18, 0.9);
  softValue(P, blob([[1330, 240], [1290, 260], [1270, 420], [1290, 600], [1250, 780], [1300, 650], [1332, 450]]), 0.74, 18, 0.9);
  softValue(P, ell(848, 380, 118, 44, 0.05), 0.55, 14, 0.85);
  softValue(P, ell(1238, 368, 112, 42, -0.1), 0.55, 14, 0.85);
  softValue(P, ell(1110, 282, 42, 32, 0.4), 0.7, 10, 0.7);
  softValue(P, ell(990, 520, 26, 60, 0.1), 0.82, 10, 0.7);
  softValue(P, ell(1055, 612, 70, 14), 0.8, 8, 0.7);
  softValue(P, ell(1050, 790, 110, 26), 0.72, 12, 0.8);

  // ---------- ears: lit rims between the hair ----------
  P.fill(blob([[664, 478], [690, 470], [712, 492], [708, 530], [690, 540], [672, 520]]), 0.9, 1.4, { style: 2 });
  P.fill(blob([[1376, 494], [1400, 488], [1418, 504], [1410, 522], [1390, 520]]), 0.88, 1.4, { style: 2 });

  // ---------- nose ----------
  ink(o, [[982, 410], [975, 470], [966, 525], [968, 565], [990, 585]], 1.5, "rgba(20,20,20,0.6)");
  ink(o, [[966, 525], [962, 555], [975, 578], [996, 587], [1022, 590]], 2.4, DARK);
  ink(o, [[1128, 528], [1138, 556], [1132, 576], [1110, 588], [1082, 590]], 2.4, DARK);
  o.fillStyle = DARK;
  o.beginPath(); o.ellipse(1012, 588, 16, 5, 0.1, 0, TAU); o.fill();
  o.beginPath(); o.ellipse(1092, 588, 16, 5, -0.1, 0, TAU); o.fill();
  ink(o, [[1000, 598], [1052, 606], [1104, 598]], 1.4, "rgba(20,20,20,0.5)");
  hatch(o, ell(1052, 612, 60, 10), [990, 600, 1115, 625], { angle: 0.2, spacing: 4, len: [10, 25], w: 1, alpha: 0.5, seed: 81 });
  hatch(o, ell(975, 500, 16, 50), [955, 450, 995, 560], { angle: 1.4, spacing: 4, len: [10, 30], w: 1, alpha: 0.45, seed: 82 });
  // ---------- mouth (the pencil is drawn per frame on top) ----------
  ink(o, [[1030, 676], [1052, 684], [1085, 678]], 1.5, "rgba(20,20,20,0.6)");
  o.fillStyle = "#f4f3ef"; o.beginPath(); o.roundRect(978, 696, 175, 34, 6); o.fill();
  for (const x of [1012, 1050, 1088, 1122]) ink(o, [[x, 698], [x + 1, 713], [x, 728]], 1.6, "rgba(20,20,20,0.75)");
  ink(o, [[962, 700], [1000, 692], [1052, 688], [1110, 692], [1165, 702]], 3, DARK);
  ink(o, [[985, 752], [1050, 760], [1120, 752]], 2, "rgba(20,20,20,0.7)");
  ink(o, [[995, 782], [1050, 798], [1110, 784]], 2.4, "rgba(15,15,15,0.8)");
  // stubble
  stubble(o, 1052, 650, 170, 38, 260, 91, { alpha: 0.5 });
  stubble(o, 1052, 780, 170, 40, 220, 92, { alpha: 0.5 });
  stubble(o, 880, 720, 60, 60, 80, 93, { alpha: 0.4 });
  stubble(o, 1225, 720, 60, 60, 80, 94, { alpha: 0.4 });
  // jaw lines and cheek hatching
  ink(o, [[745, 660], [772, 730], [806, 790], [830, 820]], 2.6, DARK);
  ink(o, [[1345, 660], [1310, 730], [1270, 790], [1245, 820]], 2.6, DARK);
  hatch(o, blob([[760, 560], [800, 580], [820, 700], [800, 780], [770, 700]]), [740, 540, 830, 800], { angle: 1.1, spacing: 5, len: [20, 50], w: 1.1, alpha: 0.5, seed: 95 });
  hatch(o, blob([[1330, 560], [1300, 580], [1280, 700], [1290, 780], [1320, 700]]), [1270, 540, 1340, 800], { angle: 2.0, spacing: 5, len: [20, 50], w: 1.1, alpha: 0.5, seed: 96 });
  // sweat beads
  for (const [x, y, s] of [[915, 155, 1.3], [1145, 152, 1.2], [1115, 422, 1.2], [820, 535, 1.3], [1275, 528, 1.3], [800, 440, 0.9]]) sweat(o, x, y, s);
  // ---------- brows ----------
  for (const [pts, sd, sdx] of [[[[838, 196], [880, 186], [915, 192], [945, 212]], 51, 1], [[[1112, 224], [1150, 204], [1195, 190], [1235, 188]], 52, -1]]) {
    const q = sampleCurve(pts, 10), rr = rng(sd);
    for (let i = 0; i < q.length; i++) for (let k = 0; k < 3; k++) {
      const p = q[i], L = 10 + rr() * 12, a = -0.9 * sdx + (rr() - 0.5) * 0.5;
      const x = p[0] + (rr() - 0.5) * 6, y = p[1] + (rr() - 0.5) * 12;
      taper(o, [[x, y], [x + Math.cos(a) * L / 2, y + Math.sin(a) * L / 2], [x + Math.cos(a) * L, y + Math.sin(a) * L]], (u) => 2.4 * Math.sin(Math.PI * u) + 0.3, DARK);
    }
  }
  // ---------- eyes (no irises: drawn per frame) ----------
  for (const [k, E] of EYES.entries()) {
    const op = E.open;
    // the white, and the iris (look: toward the owl at A, at the camera after the glance)
    o.fillStyle = "#f3f2ee"; o.beginPath(); smoothPath(o, op, true); o.fill();
    drawIris(o, op, E.c, E.r, look || E.look);
    // lower lid shadow line inside
    const side = k === 0 ? 1 : -1;
    const up = op.slice(0, 6), low = [op[5], op[6], op[7], op[8], op[0]];
    // upper lid: heavy
    ink(o, up, 6.5, DARK, "mid");
    // crease above
    ink(o, up.slice(1, 5).map(([x, y]) => [x + side * 4, y - 16]), 2.2, "rgba(10,10,10,0.8)");
    // lower lid and lashes
    ink(o, low, 2.4, DARK);
    ink(o, low.map(([x, y]) => [x, y + 8]), 1.3, "rgba(20,20,20,0.6)");
    combStrokes(o, low, { dir: [0, 1], len: [8, 22], step: 5, w: 1.2, alpha: 0.55, seed: 60 + k });
    // dark circles: hatched arcs under the eye
    combStrokes(o, low.map(([x, y]) => [x, y + 10]), { dir: [side * 0.2, 1], len: [14, 40], step: 4, w: 1.1, alpha: 0.45, seed: 70 + k });
  }
  // ---------- hair: the measured black masses (shapes.js), light strands along the flow, a few loose strands ----------
  for (const [i, h] of SHAPES.A.hair.entries()) {
    P.light(poly(h), 0.0);
    o.fillStyle = DARK; o.beginPath(); poly(h)(o); o.fill();
    hairStrands(o, h, (x) => (x < 800 ? 1.75 : x < 1000 ? 1.9 : x < 1250 ? 1.45 : 1.35), 30 + i, 1.3);
  }
  for (let i = 0; i < 22; i++) {
    const x0 = 720 + r() * 600, y0 = 100 + Math.abs(x0 - 1010) * 0.33 + r() * 20;
    const dx = (x0 - 1020) * (0.1 + r() * 0.25), L = 100 + r() * 180;
    ink(o, [[x0, y0], [x0 + dx * 0.4, y0 + L * 0.5], [x0 + dx, y0 + L]], 1.2 + r() * 1.4, DARK, "root");
  }

  // ---------- beanie ----------
  const beanie = blob([...HAIRLINE, ...BEANIE_TOP]);
  P.fill(beanie, linear(560, 0, 1510, 0, [[0, 0.66], [0.35, 0.8], [0.7, 0.68], [1, 0.4]]), 1.57, { style: 1, spacing: 0.25 });
  // cuff: ribbed band, knit ticks running round the head (radial ribs)
  const cuff = blob([...HAIRLINE, ...CUFF_TOP.slice().reverse()]);
  P.fill(cuff, linear(560, 0, 1510, 0, [[0, 0.62], [0.3, 0.78], [0.6, 0.74], [1, 0.42]]), 1.57, { style: 3, spacing: 0.22 });
  softValue(P, ell(1500, 240, 70, 160), 0.18, 20, 0.8);
  softValue(P, ell(570, 250, 40, 140), 0.25, 18, 0.7);
  // rib lines on the cuff: dark curves from the hairline up to the fold, fanning round the head
  o.save(); o.beginPath(); cuff(o); o.clip();
  for (let i = 0; i <= 64; i++) {
    const f = i / 64;
    const a = HAIRLINE[0], b = HAIRLINE[HAIRLINE.length - 1];
    const q = sampleCurve(HAIRLINE, 6), q2 = sampleCurve(CUFF_TOP, 6);
    const p0 = q[Math.round(f * (q.length - 1))], p1 = q2[Math.round(f * (q2.length - 1))];
    const w = 1.3 + 1.6 * Math.abs(f - 0.45) * 2;
    ink(o, [p0, [(p0[0] * 0.5 + p1[0] * 0.5) + (r() - 0.5) * 3, (p0[1] + p1[1]) / 2], p1], w, "rgba(8,8,8,0.72)", "mid", 4);
  }
  o.restore();
  // crown: loose cross-hatching and knit texture
  o.save(); o.beginPath(); smoothPath(o, [...CUFF_TOP, [1450, -50], [1372, -140], [1252, -210], [1100, -240], [950, -240], [800, -202], [690, -130], [624, -50]], true); o.clip();
  hatch(o, null, [540, -260, 1520, 60], { angle: 0.9, spacing: 9, len: [20, 60], w: 1.4, alpha: 0.55, seed: 21 });
  hatch(o, null, [540, -260, 1520, 60], { angle: -0.8, spacing: 10, len: [20, 50], w: 1.2, alpha: 0.45, seed: 22 });
  o.restore();
  ink(o, CUFF_TOP, 2.6, "rgba(6,6,6,0.85)");
  ink(o, [[1486, 330], [1506, 250], [1510, 150], [1494, 50], [1452, -50]], 3, DARK);
  ink(o, [[590, 350], [564, 300], [554, 220], [558, 130], [584, 40], [624, -50]], 2.4, "rgba(230,228,222,0.5)");

}


// Iris: E: an EYES entry; frame-space opening polygon `open`, center c, radius r, look [x,y] (-1..1)
export function drawIris(g, open, c, r, look) {
  g.save(); g.beginPath(); smoothPath(g, open, true); g.clip();
  const x = c[0] + look[0] * r * 0.6, y = c[1] + look[1] * r * 0.6;
  const grd = g.createRadialGradient(x, y, r * 0.2, x, y, r);
  grd.addColorStop(0, "#9a9a98"); grd.addColorStop(0.55, "#6e6e6c"); grd.addColorStop(0.85, "#3c3c3b"); grd.addColorStop(1, "#141414");
  g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  // radial fibres
  g.strokeStyle = "rgba(20,20,20,0.35)"; g.lineWidth = 1;
  for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; g.beginPath(); g.moveTo(x + Math.cos(a) * r * 0.35, y + Math.sin(a) * r * 0.35); g.lineTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9); g.stroke(); }
  g.strokeStyle = "#101010"; g.lineWidth = 2.2; g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
  g.fillStyle = "#050505"; g.beginPath(); g.arc(x, y, r * 0.3, 0, TAU); g.fill();
  g.fillStyle = "#f6f5f1"; g.beginPath(); g.arc(x - r * 0.28, y - r * 0.3, r * 0.12, 0, TAU); g.fill();
  // the upper lid's shadow across the top of the iris
  const lg = g.createLinearGradient(0, c[1] - r * 1.1, 0, c[1] - r * 0.2);
  lg.addColorStop(0, "rgba(0,0,0,0.55)"); lg.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = lg; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  const ls = g.createLinearGradient(0, c[1] - r * 1.3, 0, c[1] - r * 0.55);
  ls.addColorStop(0, "rgba(0,0,0,0.28)"); ls.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = ls; g.fillRect(c[0] - r * 5, c[1] - r * 1.4, r * 10, r * 0.9);
  g.restore();
}
