// s02: the designer, drawn by hand in code (manga ink on paper). World coords = the 6.04 s source frame.
// Geometry: control points read off 2-4x grid crops of the stare / look averages (snapshots/s02-r3-meas/z/*),
// drawn as pen lines, filled shapes and field hatching (pen.js). Nothing is traced automatically.
// The canvas covers world x 0..W, y -DY..H (the pan reveals the beanie crown up to y -352).
import { W, H } from "../../../config.js";
import { rng, hash, noise1 } from "../../../lib/rng.js";
import { sampleCurve, smoothPath } from "../../../lib/paths.js";
import { HAIR_SIL } from "./hairsil.js";
import { applyTone } from "./tone.js";
import { DES_TONE, CROWN_TONE, SOFT_TONE } from "./tonedata.js";
import { gv, PAPER, INKV, mk, poly, blob, fillPath, withClip, ribbon, pen, P_SWELL, P_HANG, P_TIP2, hatch, comb, distField, inside, smoothstep, PI } from "./pen.js";

export const DY = 420;
// the pans redraw his face in a softer, cleaner manner (no cheek hatching or stubble, lighter rings); SOFT switches it
let SOFT = false;
const INK = gv(INKV);
const ink = (a) => gv(INKV, a);

// ---------------- silhouettes ----------------
export const HOODIE = [
  [-10, 946], [22, 946], [48, 888], [76, 808], [100, 744], [125, 702], [148, 662], [172, 640], [200, 620], [256, 592], [336, 568], [400, 552],
  [464, 528], [512, 500], [560, 480], [600, 462], [640, 452], [700, 440], [1000, 430], [1300, 440], [1420, 468], [1492, 484], [1564, 520], [1636, 560],
  [1716, 592], [1796, 624], [1860, 648], [1908, 680], [1940, 712], [1964, 760], [1988, 824], [2012, 888], [2032, 946], [2060, 946],
];
// the face (skin) region, generous under the hair; the hair is painted over it
const FACE = [
  [740, 150], [900, 90], [1100, 84], [1300, 140], [1330, 300], [1345, 420], [1350, 520], [1330, 620], [1300, 705], [1250, 790], [1200, 830],
  [880, 830], [830, 780], [790, 700], [760, 620], [742, 520], [735, 420], [730, 300],
];
// beanie: crown outline (pan frames 12.0–12.8 s), cuff lower edge (stare)
export const CUFF_LOW = [[596, 318], [606, 290], [624, 256], [650, 222], [680, 192], [714, 164], [750, 140], [800, 118], [850, 105], [900, 97], [950, 92],
  [1000, 87], [1050, 84], [1100, 87], [1150, 94], [1200, 104], [1250, 117], [1300, 131], [1350, 150], [1400, 175], [1430, 196], [1452, 218], [1472, 248], [1488, 282], [1494, 310]];
const CROWN = [[596, 318], [584, 290], [575, 250], [571, 200], [571, 140], [576, 80], [588, 20], [604, -40], [622, -100], [646, -160], [690, -228], [746, -266], [796, -290],
  [846, -310], [896, -332], [946, -346], [996, -353], [1046, -355], [1096, -352], [1146, -343], [1196, -324], [1246, -300], [1296, -270], [1346, -232],
  [1396, -172], [1438, -104], [1468, -30], [1486, 40], [1497, 110], [1502, 180], [1502, 250], [1498, 290], [1494, 310]];
export const BEANIE = CROWN.concat(CUFF_LOW.slice().reverse().slice(1));
const FOLD = [[574, 60], [600, 8], [650, -36], [720, -72], [800, -97], [850, -108], [946, -128], [1046, -137], [1146, -131], [1246, -112], [1330, -76], [1400, -36], [1458, 18], [1494, 92]];
// laptop lid: the black bar at the bottom with a lit bevel above it
export const LAPTOP = { x0: 226, x1: 1890, top: 813, bev: 834, r: 34 };

// ---------------- eyes ----------------
// per eye: whites outline (upper lid edge L→R, lower edge L→R), crease, iris centre/radius, the look's lids and iris
export const EYES = [
  { // viewer's left
    up: [[762, 323], [776, 305], [800, 293], [830, 287], [860, 286], [890, 290], [915, 300], [932, 316], [938, 338]],
    lo: [[762, 323], [778, 339], [808, 355], [850, 361], [892, 357], [922, 349], [938, 338]],
    crease: [[758, 290], [790, 270], [830, 262], [870, 262], [905, 272], [932, 294]],
    rim: [[757, 340], [790, 360], [840, 371], [890, 369], [930, 356]],
    iris: [852.5, 323, 28], pupil: 7,
    lookUp: [[762, 323], [776, 307], [798, 296], [830, 291], [860, 291], [890, 295], [915, 305], [932, 318], [938, 338]],
    lookIris: [893, 338, 36], lookPupil: [894, 334, 6.5],
    sock: [846, 330, 120, 72],
  },
  { // viewer's right
    up: [[1143, 342], [1152, 322], [1170, 298], [1195, 283], [1232, 277], [1270, 282], [1300, 297], [1317, 316], [1321, 322]],
    lo: [[1143, 342], [1182, 351], [1232, 354], [1282, 347], [1306, 337], [1321, 322]],
    crease: [[1150, 292], [1182, 265], [1232, 256], [1282, 262], [1312, 282]],
    rim: [[1150, 356], [1190, 364], [1240, 366], [1290, 358], [1320, 340]],
    iris: [1232.8, 319, 27.7], pupil: 7,
    lookUp: [[1143, 342], [1152, 325], [1170, 302], [1195, 288], [1232, 283], [1270, 287], [1300, 300], [1317, 317], [1321, 322]],
    lookIris: [1272, 327, 35], lookPupil: [1272, 322, 6.5],
    sock: [1234, 322, 118, 70],
  },
];
function whitesPath(E, look) {
  const up = look ? E.lookUp : E.up;
  const a = sampleCurve(up, 8), b = sampleCurve(E.lo, 8).reverse();
  const pts = a.concat(b);
  return (g) => { g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); g.closePath(); };
}
export const WHITES = [0, 1].map((i) => [whitesPath(EYES[i], false), whitesPath(EYES[i], true)]);

// ---------------- painting ----------------
function paintHoodie(g) {
  const hp = poly(HOODIE);
  fillPath(g, hp, gv(PAPER));
  withClip(g, hp, () => {
    // LEFT shoulder: dense short strokes hanging in from the outline (a dark band along the top)
    const OL = HOODIE.slice(2, 17), OR = HOODIE.slice(18, 33);
    comb(g, OL, { sp: 3.1, seed: 101, ang: (x, y, u) => (u < 0.3 ? -0.2 + u : 1.05), len: (u, r) => (u < 0.3 ? 28 : 20) + r() * 28, wid: (u, r) => 1.2 + r() * 0.8, off: 1, bend: 0.25 });
    comb(g, OL, { sp: 6.5, seed: 102, ang: (x, y, u) => (u < 0.3 ? 0.15 + u : 1.2), len: (u, r) => 40 + r() * 60, wid: (u, r) => 1.0 + r() * 0.7, off: 10, bend: 0.3, keep: (u, r) => r() < 0.8 });
    comb(g, OL, { sp: 4.2, seed: 103, ang: (x, y, u) => (u < 0.3 ? -1.2 : -0.35), len: (u, r) => 10 + r() * 18, wid: () => 1.1, off: 4, prof: (w) => P_TIP2(w, 0.3, 0.4), keep: (u, r) => r() < 0.7 });
    // seam: long comb hanging below it
    const SL = [[150, 686], [240, 640], [330, 610], [448, 568], [522, 544], [590, 520]];
    comb(g, SL, { sp: 6, seed: 104, ang: () => 1.33, len: (u, r) => 50 + r() * 100, wid: (u, r) => 0.9 + r() * 0.8, off: 2, bend: 0.3, prof: (w) => P_HANG(w, 0.06, 1.3) });
    comb(g, SL, { sp: 4.0, seed: 105, ang: () => -1.6, len: (u, r) => 8 + r() * 20, wid: () => 1.1, off: 1, prof: (w) => P_HANG(w, 0.1, 1) });
    // RIGHT shoulder
    comb(g, OR, { sp: 3.1, seed: 111, ang: (x, y, u) => (u > 0.7 ? PI + 0.2 - (1 - u) : PI - 1.05), len: (u, r) => (u > 0.7 ? 28 : 20) + r() * 28, wid: (u, r) => 1.2 + r() * 0.8, off: 1, bend: 0.25 });
    comb(g, OR, { sp: 7.5, seed: 112, ang: (x, y, u) => (u > 0.7 ? PI - 0.15 - (1 - u) : PI - 1.2), len: (u, r) => 40 + r() * 60, wid: (u, r) => 1.0 + r() * 0.7, off: 10, bend: 0.3, keep: (u, r) => r() < 0.8 });
    comb(g, OR, { sp: 4.2, seed: 113, ang: (x, y, u) => (u > 0.7 ? PI + 1.2 : PI + 0.35), len: (u, r) => 10 + r() * 18, wid: () => 1.1, off: 4, prof: (w) => P_TIP2(w, 0.3, 0.4), keep: (u, r) => r() < 0.7 });
    const SR = [[1500, 530], [1564, 568], [1640, 590], [1720, 612], [1800, 636], [1860, 664], [1916, 712], [1950, 780]];
    comb(g, SR, { sp: 7, seed: 114, ang: () => PI - 1.33, len: (u, r) => 50 + r() * 100, wid: (u, r) => 0.9 + r() * 0.8, off: 2, bend: 0.3, prof: (w) => P_HANG(w, 0.06, 1.3) });
    comb(g, SR, { sp: 4.0, seed: 115, ang: () => PI + 1.6, len: (u, r) => 8 + r() * 20, wid: () => 1.1, off: 1, prof: (w) => P_HANG(w, 0.1, 1) });
    // an even layer of long strokes over the whole shoulder (the source's hoodie is hatched all over, lighter low down)
    const dE = distField(hp, [0, 420, 2080, 946], 0.25);
    hatch(g, null, [0, 440, 2080, 946], {
      sp: 7, seed: 106, cov: (x, y) => (x > 780 && x < 1290 ? 0 : (x > 1290 ? 0.35 : 0.6) * (0.1 + 0.1 * Math.exp(-dE(x, y) / 140))),
      ang: (x, y) => (x < 1035 ? 1.28 - (x < 250 ? 0.25 : 0) : PI - 1.28 + (x > 1820 ? 0.25 : 0)), len: (x, y, r) => 40 + r() * 70, wid: (x, y, r) => 0.9 + r() * 0.7, bend: 0.3,
      prof: (w) => P_TIP2(w, 0.25, 0.4),
    });
    // shadow of the hair on the shoulders next to the neck
    for (const [cx, a, sd] of [[700, 1.4, 121], [1340, PI - 1.4, 122]]) {
      hatch(g, null, [cx - 140, 450, cx + 140, 790], {
        sp: 5, seed: sd, cov: (x, y) => 0.4 * Math.exp(-Math.pow((x - cx) / 80, 2) - Math.pow((y - 570) / 110, 2)),
        ang: () => a, len: (x, y, r) => 30 + r() * 60, wid: (x, y, r) => 1 + r() * 0.8, bend: 0.2, prof: (w) => P_HANG(w, 0.1, 1),
      });
    }
  });
  // seams / folds
  const LINES = [
    [[[150, 686], [240, 640], [330, 610], [448, 568]], 2.0], [[[432, 570], [480, 556], [522, 544]], 1.5],
    [[[1564, 568], [1640, 590], [1720, 612], [1800, 636], [1860, 664], [1916, 712]], 2.0],
    [[[560, 700], [610, 722], [650, 736], [690, 742]], 1.3], [[[1690, 700], [1705, 740], [1712, 780]], 1.1],
  ];
  for (const [p, w] of LINES) pen(g, p, w, INK, P_SWELL(w, 0.15));
  pen(g, HOODIE.slice(1, 16), 2.4, INK, P_SWELL(2.4, 0.4));
  pen(g, HOODIE.slice(19, 33), 2.4, INK, P_SWELL(2.4, 0.4));
}

function paintFace(g) {
  const fp = poly(FACE);
  fillPath(g, fp, gv(PAPER));
  // neck under the chin: soft shadow band (hatched)
  hatch(g, fp, [860, 760, 1260, 830], {
    sp: 3.2, seed: 21, cov: (x, y) => 0.3 * smoothstep(770, 815, y) * (1 - smoothstep(1180, 1240, x)),
    ang: () => 1.1, len: (x, y, r) => 10 + r() * 16, wid: () => 1.0,
  });
  if (!SOFT) {
  // sides of the face (under the hair): fine hatching
  for (const [x0, x1, a] of [[735, 830, 1.2], [1250, 1350, PI - 1.2]]) {
    hatch(g, fp, [x0, 380, x1, 760], {
      sp: 4, seed: 22 + x0, cov: (x, y) => 0.14 * (a < 1.5 ? 1 - smoothstep(x0, x1, x) : smoothstep(x0, x1, x)) * smoothstep(380, 460, y),
      ang: () => a, len: (x, y, r) => 16 + r() * 26, wid: (x, y, r) => 0.8 + r() * 0.6,
    });
  }
  // cheek hatching under the eyes (the tired bags spill down in long strokes)
  hatch(g, fp, [760, 380, 960, 470], { sp: 5, seed: 23, cov: (x, y) => 0.1 * Math.exp(-Math.pow((x - 850) / 80, 2) - Math.pow((y - 410) / 25, 2)), ang: () => 0.35, len: (x, y, r) => 20 + r() * 40, wid: () => 0.9 });
  hatch(g, fp, [1120, 380, 1320, 470], { sp: 5, seed: 24, cov: (x, y) => 0.1 * Math.exp(-Math.pow((x - 1230) / 80, 2) - Math.pow((y - 410) / 25, 2)), ang: () => PI - 0.35, len: (x, y, r) => 20 + r() * 40, wid: () => 0.9 });

  }
  // ---- nose (read off the 3x crop z/nose2.jpg): the wings as bold curved strokes, nostrils as dark crescents, the
  // columella curve with fine hatching under it, the bridge's two bundles of fine strokes and the tip's side shading
  pen(g, [[982, 522], [972, 545], [966, 566], [970, 582], [980, 593], [990, 598]], 3.4, INK, P_SWELL(3.4, 0.15, 0.7));
  pen(g, [[1112, 520], [1124, 543], [1132, 566], [1128, 584], [1117, 596]], 3.4, INK, P_SWELL(3.4, 0.15, 0.7));
  fillPath(g, blob([[993, 587], [1003, 580], [1018, 581], [1024, 587], [1012, 592], [998, 592]]), INK);
  fillPath(g, blob([[1071, 587], [1084, 580], [1100, 580], [1107, 585], [1098, 590], [1080, 591]]), INK);
  pen(g, [[1010, 594], [1026, 600], [1045, 604], [1062, 601], [1078, 593]], 2.2, INK, P_SWELL(2.2, 0.25));
  hatch(g, null, [995, 594, 1090, 622], { sp: 3.2, seed: 31, cov: (x, y) => 0.35 * Math.exp(-Math.pow((y - 606) / 7, 2)) * Math.exp(-Math.pow((x - 1042) / 40, 2)), ang: () => 0.35, len: (x, y, r) => 9 + r() * 10, wid: () => 1.1 });
  hatch(g, null, [958, 470, 1020, 560], { sp: 3.6, seed: 32, cov: (x, y) => 0.14 * Math.exp(-Math.pow((x - 990) / 20, 2)) * smoothstep(470, 500, y) * (1 - smoothstep(540, 560, y)), ang: () => -1.3, len: (x, y, r) => 18 + r() * 26, wid: () => 0.9 });
  hatch(g, null, [1078, 470, 1138, 555], { sp: 3.6, seed: 33, cov: (x, y) => 0.14 * Math.exp(-Math.pow((x - 1104) / 18, 2)) * smoothstep(470, 490, y) * (1 - smoothstep(530, 555, y)), ang: () => 1.25, len: (x, y, r) => 18 + r() * 26, wid: () => 0.9 });
  hatch(g, null, [960, 548, 990, 592], { sp: 3.4, seed: 35, cov: () => 0.3, ang: () => -1.0, len: (x, y, r) => 8 + r() * 10, wid: () => 1.1 });
  hatch(g, null, [1108, 545, 1136, 590], { sp: 3.4, seed: 36, cov: () => 0.3, ang: () => 1.9, len: (x, y, r) => 8 + r() * 10, wid: () => 1.1 });
  if (!SOFT) {
  // ---- stubble: short ticks over the upper lip, chin and jaw
  const r = rng(41);
  for (let i = 0; i < 130; i++) {
    const x = 800 + r() * 500, y = 610 + r() * 210;
    const inUp = y < 695 && Math.abs(x - 1050) < 150 + (y - 610) * 1.2 && y > 615 + Math.abs(x - 1050) * 0.12;
    const inChin = y > 760 && y < 812 && Math.abs(x - 1045) < 150 && r() < 0.45;
    const inJaw = y > 700 && y < 800 && (Math.abs(x - 1045) > 170 && Math.abs(x - 1045) < 240) && r() < 0.4;
    if (!(inUp || inChin || inJaw)) continue;
    const a = (x < 1045 ? 1.25 : PI - 1.25) + (r() - 0.5) * 0.5, L = 4 + r() * 6;
    ribbon(g, [[x, y], [x + Math.cos(a) * L, y + Math.sin(a) * L]], P_TIP2(1.2 + r() * 0.6, 0.3, 0.5), ink(0.75));
  }
  }
  // the face's edges down to the jaw, with hatching running along them on the cheeks
  const EL = [[748, 360], [745, 420], [750, 500], [761, 617], [795, 674], [824, 705]], ER = [[1362, 360], [1368, 420], [1352, 500], [1320, 600], [1300, 642], [1270, 695]];
  pen(g, EL, 2.0, ink(0.85), P_SWELL(2, 0.2)); pen(g, ER, 2.0, ink(0.85), P_SWELL(2, 0.2));
  if (!SOFT) comb(g, EL, { sp: 4.5, seed: 44, ang: (x, y, u) => 1.2 - u * 0.4 + 0.2, len: (u, r) => 20 + r() * 40, wid: () => 1.1, off: 3, prof: (w) => P_TIP2(w, 0.25, 0.45), color: ink(0.7), keep: (u, r) => u > 0.1 && r() < 0.8 });
  if (!SOFT) comb(g, ER, { sp: 4.5, seed: 45, ang: (x, y, u) => PI - 1.2 + u * 0.4 - 0.2, len: (u, r) => 20 + r() * 40, wid: () => 1.1, off: 3, prof: (w) => P_TIP2(w, 0.25, 0.45), color: ink(0.7), keep: (u, r) => u > 0.1 && r() < 0.8 });
  // philtrum
  pen(g, [[1040, 655], [1048, 668], [1062, 670], [1072, 660]], 1.2, ink(0.7));
  pen(g, [[1018, 686], [1045, 690], [1075, 686]], 1.3, ink(0.8));
  // ---- jaw lines converging under the chin (behind the pencil), neck shading along them
  const JL = [[792, 684], [812, 730], [838, 780], [868, 830]], JR = [[1338, 684], [1318, 730], [1292, 780], [1262, 830]];
  pen(g, JL, 4.2, INK, P_SWELL(4.2, 0.35)); pen(g, JR, 4.2, INK, P_SWELL(4.2, 0.35));
  comb(g, JL, { sp: 4, seed: 46, ang: () => 0.45, len: (u, r) => 14 + r() * 26, wid: () => 1.2, off: 3, prof: (w) => P_TIP2(w, 0.2, 0.5), color: ink(0.75) });
  comb(g, JR, { sp: 4, seed: 47, ang: () => PI - 0.45, len: (u, r) => 14 + r() * 26, wid: () => 1.2, off: 3, prof: (w) => P_TIP2(w, 0.2, 0.5), color: ink(0.75) });
  // ---- mouth: upper lip line, dark corners, teeth (the pencil goes between them, painted later), lower lip
  pen(g, [[942, 708], [970, 702], [1000, 699], [1050, 701], [1100, 699], [1130, 701], [1156, 707]], 3.0, INK, P_SWELL(3, 0.3));
  fillPath(g, blob([[944, 708], [975, 705], [985, 712], [960, 713]]), INK);
  fillPath(g, blob([[1118, 704], [1150, 707], [1140, 713], [1122, 712]]), INK);
  hatch(g, null, [950, 676, 1150, 700], { sp: 3, seed: 42, dens: (x, y) => 0.8 * Math.exp(-Math.pow((y - 695) / 5, 2)) * (1 - smoothstep(60, 100, Math.abs(x - 1050))), ang: (x) => (x < 1050 ? -1.2 : -1.9), len: (x, y, r) => 6 + r() * 5, wid: () => 1.1 });
  // lower lip: shadow under the pencil + ticks + chin line
  pen(g, [[985, 750], [1020, 755], [1050, 757], [1080, 755], [1110, 750]], 3.4, INK, P_SWELL(3.4, 0.3));
  hatch(g, null, [985, 752, 1115, 775], { sp: 3, seed: 43, dens: (x, y) => 0.8 * Math.exp(-Math.pow((y - 760) / 5, 2)), ang: (x) => (x < 1050 ? 1.9 : 1.2), len: (x, y, r) => 6 + r() * 6, wid: () => 1.1 });
  pen(g, [[975, 772], [1000, 784], [1040, 790], [1080, 787], [1115, 775]], 2.2, ink(0.85), P_SWELL(2.2, 0.2));
  // jaw / neck edges running down to the laptop
  pen(g, [[815, 770], [850, 795], [885, 815]], 2.4, INK);
  pen(g, [[1325, 725], [1290, 770], [1250, 805]], 2.4, INK);
}

// the sockets, lids and whites (no iris). look = the lowered lids of the look
// offset a polyline along its normal (+ = to the left of travel)
function offsetLine(q, d) {
  const n = q.length, out = [];
  for (let i = 0; i < n; i++) { const a = q[Math.max(0, i - 1)], b = q[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; out.push([q[i][0] - dy / L * d, q[i][1] + dx / L * d]); }
  return out;
}
function paintEyeBase(g, E, look, seed) {
  const left = E.lo[0][0] < 1000, [cx, cy, rx, ry] = E.sock;
  const wp = whitesPath(E, look);
  const r = rng(seed);
  const crease = sampleCurve(E.crease, 10), rim = sampleCurve(E.rim, 10);
  // the dark rings: a soft grey wash round the eye (multiplied, so the ink stays), heaviest under the eye and at the
  // outer corner, fading onto the cheek
  {
    const pad = 120, sc = mk(2 * rx + 2 * pad, 2 * ry + 2 * pad + 60), sg = sc.getContext("2d");
    sg.fillStyle = "#fff"; sg.fillRect(0, 0, sc.width, sc.height);
    sg.translate(pad - (cx - rx), pad - (cy - ry));
    sg.filter = "blur(14px)";
    const oc = left ? -1 : 1;
    sg.fillStyle = gv(0.6); sg.beginPath(); sg.ellipse(cx + oc * 6, cy + 10, rx * 0.95, ry * 0.62, 0, 0, 2 * PI); sg.fill();
    sg.fillStyle = gv(0.55); sg.beginPath(); sg.ellipse(cx + oc * rx * 0.55, cy + 8, rx * 0.35, ry * 0.8, 0, 0, 2 * PI); sg.fill();
    sg.fillStyle = gv(0.74); sg.beginPath(); sg.ellipse(cx, cy - ry * 0.45, rx * 0.9, ry * 0.6, 0, 0, 2 * PI); sg.fill();
    sg.filter = "none";
    g.save(); g.globalCompositeOperation = "multiply"; g.drawImage(sc, cx - rx - pad, cy - ry - pad); g.restore();
  }
  // above the crease: grey arcs running with it, fading upward (the hollow under the brow)
  for (let k = 0; k < 4; k++) {
    const q = offsetLine(crease, -(3 + k * 3.2 + r() * 2)), a0 = Math.floor(r() * 0.25 * q.length), a1 = q.length - Math.floor(r() * 0.25 * q.length);
    ribbon(g, q.slice(a0, a1), P_SWELL(2.2 - k * 0.2, 0.1), ink(0.75 - k * 0.08));
  }
  // cross-hatch in the inner upper corner (toward the nose) and dark strokes at the outer corner
  const inner = left ? [E.up[E.up.length - 1][0] - 6, E.crease[E.crease.length - 1][1] + 4] : [E.up[0][0] + 6, E.crease[0][1] + 4];
  for (const [ang, sd] of [[left ? 2.2 : 0.95, 1], [left ? 1.2 : 1.95, 2]]) hatch(g, null, [inner[0] - 45, inner[1] - 40, inner[0] + 45, inner[1] + 40], {
    sp: 3.4, seed: seed + sd, cov: (x, y) => 0.75 * Math.exp(-(Math.pow((x - inner[0]) / 38, 2) + Math.pow((y - inner[1]) / 36, 2))), ang: () => ang, len: (x, y, rr) => 12 + rr() * 16, wid: () => 1.1,
  });
  const outer = left ? [E.up[0][0] + 4, cy + 4] : [E.up[E.up.length - 1][0] - 4, cy + 4];
  hatch(g, null, [outer[0] - 30, outer[1] - 50, outer[0] + 30, outer[1] + 50], {
    sp: 3.2, seed: seed + 3, cov: (x, y) => 0.6 * Math.exp(-(Math.pow((x - outer[0]) / 16, 2) + Math.pow((y - outer[1]) / 36, 2))), ang: () => (left ? 1.35 : PI - 1.35), len: (x, y, rr) => 18 + rr() * 24, wid: () => 1.2, bend: 0.3,
  });
  // under the eye: short diagonal strokes hanging from the lower rim (the dark rings), thinning onto the cheek
  comb(g, E.rim, { sp: 2.8, seed: seed + 11, ang: (x) => (left ? 1.25 : PI - 1.25) + (x - cx) / rx * (left ? -0.35 : 0.35), len: (u, rr) => 6 + rr() * 14 * Math.sin(PI * u), wid: () => 1.5, off: 1, prof: (w) => P_TIP2(w, 0.15, 0.6), color: ink(0.85), keep: (u, rr) => rr() < 0.9 });
  if (!SOFT) comb(g, E.rim, { sp: 5, seed: seed + 12, ang: (x) => (left ? 0.9 : PI - 0.9), len: (u, rr) => 10 + rr() * 16 * Math.sin(PI * u), wid: () => 1.1, off: 8, prof: (w) => P_TIP2(w, 0.25, 0.5), color: ink(0.5), keep: (u, rr) => rr() < 0.7 });
  // whites
  fillPath(g, wp, gv(0.975));
  // veins in the corners
  const rv = rng(seed + 9);
  for (let k = 0; k < 7; k++) {
    const side = k % 2 ? 1 : -1, x = cx + side * (rx * 0.5 + rv() * rx * 0.2), y = cy + (rv() - 0.5) * 14;
    const q = [[x, y]]; let a = side > 0 ? PI + (rv() - 0.5) : (rv() - 0.5), xx = x, yy = y;
    for (let j = 0; j < 5; j++) { a += (rv() - 0.5) * 1.2; xx += Math.cos(a) * 3.5; yy += Math.sin(a) * 3.5; q.push([xx, yy]); }
    withClip(g, wp, () => ribbon(g, q, P_SWELL(0.9, 0.3), ink(0.35)));
  }
  // the white shaded grey toward both corners
  withClip(g, wp, () => {
    for (const [ex, sd] of [[E.up[0][0], 1], [E.up[E.up.length - 1][0], -1]]) {
      const gr = g.createLinearGradient(ex, 0, ex + sd * rx * 0.55, 0); gr.addColorStop(0, gv(0.55, 0.7)); gr.addColorStop(1, gv(0.55, 0));
      g.fillStyle = gr; g.fillRect(Math.min(ex, ex + sd * rx * 0.55), cy - ry, rx * 0.55, 2 * ry);
    }
  });
  // a faint shadow under the upper lid inside the white
  const up = look ? E.lookUp : E.up;
  withClip(g, wp, () => ribbon(g, sampleCurve(up, 8).map(([a, b]) => [a, b + 3]), P_SWELL(5, 0.4), ink(0.12)));
  // lids: heavy upper lid line, the crease, the fold line between them, lower lid, the second rim with lash ticks
  pen(g, up, 6.5, INK, P_SWELL(6.5, 0.3, 0.5));
  pen(g, E.crease, 4.2, INK, P_SWELL(4.2, 0.25));
  pen(g, offsetLine(sampleCurve(E.crease, 6), -(-7)), 1.2, ink(0.5), P_SWELL(1.2, 0.2));
  { const a = sampleCurve(E.lo, 8), b = sampleCurve(E.rim, 8).reverse(); fillPath(g, poly(a.concat(b)), gv(0.86, 0.9)); }
  pen(g, E.lo, 2.6, INK, P_SWELL(2.6, 0.3));
  pen(g, E.rim, 3.4, INK, P_SWELL(3.4, 0.25));
  // tear duct at the inner corner: a small pointed notch with a dark crease
  { const ic = left ? E.up[E.up.length - 1] : E.up[0], d = left ? -1 : 1;
    fillPath(g, poly([[ic[0], ic[1]], [ic[0] + d * 14, ic[1] - 5], [ic[0] + d * 16, ic[1] + 3], [ic[0] + d * 6, ic[1] + 6]]), gv(0.7));
    pen(g, [[ic[0] + 2 * (-d), ic[1] - 1], [ic[0] + d * 10, ic[1] - 4], [ic[0] + d * 18, ic[1] - 2]], 2.4, INK, P_SWELL(2.4, 0.3)); }
  for (let i = 2; i < rim.length - 2; i += 2) {
    const p = rim[i], q = rim[i + 1], a = Math.atan2(q[1] - p[1], q[0] - p[0]) + PI / 2;
    ribbon(g, [[p[0] + Math.cos(a) * 2, p[1] + Math.sin(a) * 2], [p[0] + Math.cos(a) * 7, p[1] + Math.sin(a) * 7]], P_TIP2(2.2, 0.3, 0.6), ink(0.85));
  }
  // lashes at the outer corner
  const oc = left ? E.up[0] : E.up[E.up.length - 1];
  const dir = left ? -1 : 1;
  for (let i = 0; i < 3; i++) pen(g, [oc, [oc[0] + dir * (8 + i * 3), oc[1] - 6 + i * 5]], 1.8, INK, P_HANG(1.8));
}

// the iris (stare): striated grey ring, dark rim, pupil, small light. dx/dy = saccade offset
export function paintIris(g, E, dx = 0, dy = 0, i = 0) {
  const [x, y, R] = E.iris, X = x + dx, Y = y + dy;
  withClip(g, WHITES[i][0], () => {
    g.beginPath(); g.arc(X, Y, R, 0, 2 * PI); g.fillStyle = gv(0.93); g.fill();
    const r = rng(77 + i);
    // fine radial streaks from the pupil ring out to the light inner ring
    for (let k = 0; k < 80; k++) {
      const a = (k / 80) * 2 * PI + (r() - 0.5) * 0.04, r0 = R * (0.3 + r() * 0.08), r1 = R * (0.58 + r() * 0.2);
      ribbon(g, [[X + Math.cos(a) * r0, Y + Math.sin(a) * r0], [X + Math.cos(a) * r1, Y + Math.sin(a) * r1]], P_TIP2(1.0 + r() * 0.9, 0.3, 0.5), ink(0.35 + r() * 0.35));
    }
    // dark outer ring, a pale ring inside it, a grey ring round the pupil
    g.beginPath(); g.arc(X, Y, R - 2.2, 0, 2 * PI); g.lineWidth = 4.4; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.arc(X, Y, R * 0.76, 0, 2 * PI); g.lineWidth = 1.4; g.strokeStyle = ink(0.45); g.stroke();
    g.beginPath(); g.arc(X, Y, E.pupil + 3, 0, 2 * PI); g.lineWidth = 2.2; g.strokeStyle = ink(0.4); g.stroke();
    g.beginPath(); g.arc(X, Y, E.pupil, 0, 2 * PI); g.fillStyle = INK; g.fill();
  });
}
// the look: the iris swung to the right corner, its top under the lid's shadow, a catchlight notch upper-left
function paintLookIris(g, E, i) {
  const [x, y, R] = E.lookIris, [px, py, pr] = E.lookPupil;
  withClip(g, WHITES[i][1], () => {
    const gr = g.createRadialGradient(x - R * 0.2, y - R * 0.3, R * 0.1, x, y, R);
    gr.addColorStop(0, gv(0.6)); gr.addColorStop(0.6, gv(0.44)); gr.addColorStop(1, gv(0.26));
    g.beginPath(); g.arc(x, y, R, 0, 2 * PI); g.fillStyle = gr; g.fill();
    const r = rng(88 + i);
    for (let k = 0; k < 70; k++) {
      const a = (k / 70) * 2 * PI, r0 = R * (0.25 + r() * 0.1), r1 = R * (0.75 + r() * 0.2);
      ribbon(g, [[px + Math.cos(a) * r0, py + Math.sin(a) * r0], [px + Math.cos(a) * r1, py + Math.sin(a) * r1]], P_TIP2(1.2, 0.3, 0.4), ink(0.3 + r() * 0.3));
    }
    // catchlight: a pale wedge cut into the upper-left of the iris
    fillPath(g, poly([[x - R * 0.95, y - R * 0.55], [x - R * 0.35, y - R * 0.95], [x - R * 0.2, y - R * 0.45], [x - R * 0.7, y - R * 0.1]]), gv(0.93, 0.9));
    g.beginPath(); g.arc(x, y, R - 1.6, 0.5 * PI, 1.25 * PI); g.lineWidth = 3.4; g.strokeStyle = INK; g.stroke();
    g.beginPath(); g.arc(x, y, R - 1.6, 1.25 * PI, 2.5 * PI); g.lineWidth = 2.2; g.strokeStyle = ink(0.8); g.stroke();
    g.beginPath(); g.arc(px, py, pr, 0, 2 * PI); g.fillStyle = INK; g.fill();
    // the lid's shadow across the top of the iris
    const up = sampleCurve(E.lookUp, 8);
    ribbon(g, up.map(([a, b]) => [a, b + 10]).filter((p) => p[0] > x - R * 1.1), P_SWELL(5, 0.2), ink(0.8));
  });
  pen(g, E.lookUp, 6.5, INK, P_SWELL(6.5, 0.3, 0.5));
}

// hair: zones of strands (roots along the cuff edge, tips along a measured tip line), a black mass behind the side
// locks, then white partings running with the strands inside the masses, and loose single hairs over the face.
const at = (Q, u) => { u = Math.max(0, Math.min(1, u)); const f = u * (Q.length - 1), i = Math.min(Q.length - 2, Math.floor(f)), t = f - i; return [Q[i][0] + (Q[i + 1][0] - Q[i][0]) * t, Q[i][1] + (Q[i + 1][1] - Q[i][1]) * t]; };
function strandSpine(root, tip, bendA, bendB) {
  const dx = tip[0] - root[0], dy = tip[1] - root[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const m1 = [root[0] + dx * 0.33 + nx * bendA * L, root[1] + dy * 0.33 + ny * bendA * L];
  const m2 = [root[0] + dx * 0.68 + nx * bendB * L, root[1] + dy * 0.68 + ny * bendB * L];
  return sampleCurve([root, m1, m2, tip], 10);
}
// zone: { R: root line, T: tip line, n, w: [a,b] root width, bend: [a,b] (fraction of length, + = to the right of travel), tj: tip jitter (u), seed }
function zoneStrands(Z) {
  const r = rng(Z.seed), R = sampleCurve(Z.R, 10), T = sampleCurve(Z.T, 10), out = [];
  for (let k = 0; k < Z.n; k++) {
    const u = Z.n === 1 ? 0.5 : (k + (r() - 0.5) * 0.8) / (Z.n - 1);
    const root = at(R, u), tip0 = at(T, u + (r() - 0.5) * (Z.tj || 0.1));
    const shrink = Z.short ? 1 - r() * Z.short : 1;
    const tip = [root[0] + (tip0[0] - root[0]) * shrink, root[1] + (tip0[1] - root[1]) * shrink];
    const bA = Z.bend[0] + (r() - 0.5) * 0.06, bB = Z.bend[1] + (r() - 0.5) * 0.06;
    out.push({ q: strandSpine(root, tip, bA, bB), w: Z.w[0] + r() * (Z.w[1] - Z.w[0]) });
  }
  return out;
}
const HAIR_ZONES = [
  // central lock: from the cuff 962..1115, converging on the left eye's inner corner (right edge (1110,95)->(1000,360))
  { R: [[955, 93], [1010, 87], [1065, 86], [1118, 91]], T: [[912, 480], [945, 430], [980, 390], [1008, 352]], n: 30, w: [10, 17], bend: [-0.1, -0.07], tj: 0.1, seed: 201, short: 0.25, part: 0.25 },
  // left forehead bangs: thin, falling down-left from the cuff, mostly ending above the brow
  { R: [[800, 120], [850, 106], [900, 98], [945, 95]], T: [[770, 215], [800, 205], [835, 200], [880, 215]], n: 18, w: [6, 12], bend: [-0.05, -0.03], tj: 0.15, seed: 202, short: 0.25, part: 0.35 },
  { R: [[860, 104], [905, 97]], T: [[845, 300], [880, 330]], n: 2, w: [4, 6], bend: [-0.02, -0.01], tj: 0.1, seed: 209, ink: true },
  // thin strand down the left side of the lock, past the left eye's corner
  { R: [[936, 98], [944, 97]], T: [[950, 362], [956, 364]], n: 2, w: [5, 7], bend: [0.03, 0.02], tj: 0.02, seed: 203, ink: true },
  // right forehead: sparse strands falling down-right toward the right brow and temple
  { R: [[1150, 96], [1200, 104], [1255, 118]], T: [[1195, 180], [1245, 205], [1295, 250]], n: 10, w: [5, 10], bend: [0.05, 0.03], tj: 0.15, seed: 204, short: 0.3, part: 0.35 },
  // left side lock: roots along the cuff's lower-left edge, tips along the hanging ends (measured lower edge)
  { R: [[598, 318], [612, 280], [640, 236], [680, 192], [720, 160], [755, 140], [782, 128]], T: [[565, 520], [615, 625], [660, 690], [700, 725], [722, 722], [718, 660], [712, 590]], n: 40, w: [7, 14], bend: [0.03, 0.04], tj: 0.07, seed: 205, short: 0.25, part: 0.45 },
  // right side lock
  { R: [[1292, 126], [1335, 142], [1375, 162], [1410, 185], [1445, 212], [1470, 245], [1490, 290]], T: [[1368, 600], [1350, 735], [1385, 735], [1425, 690], [1465, 625], [1515, 530], [1560, 545]], n: 40, w: [7, 14], bend: [-0.03, -0.04], tj: 0.07, seed: 206, short: 0.25, part: 0.45 },
  // right side: strands flaring out over the hoodie shoulder
  { R: [[1440, 400], [1470, 420], [1500, 440]], T: [[1530, 600], [1570, 640], [1610, 660]], n: 8, w: [3, 6], bend: [-0.05, -0.03], tj: 0.2, seed: 207 },
  // left side: strands hanging over the hoodie shoulder
  { R: [[600, 420], [620, 440], [640, 460]], T: [[555, 580], [590, 620], [630, 660]], n: 8, w: [3, 6], bend: [0.04, 0.03], tj: 0.2, seed: 208 },
];
// the dark masses behind the side locks (the measured lower edge: left to y ~720 beside the jaw, right to ~730)
const MASS_L = [[596, 318], [606, 290], [624, 256], [650, 222], [680, 192], [714, 164], [750, 140], [760, 200], [748, 300], [718, 400], [705, 480], [708, 560], [712, 640], [712, 700], [690, 710], [660, 650], [620, 590], [585, 520], [566, 460], [572, 380]];
const MASS_R = [[1300, 131], [1350, 150], [1400, 175], [1430, 196], [1452, 218], [1472, 248], [1488, 282], [1494, 310], [1510, 380], [1530, 450], [1528, 510], [1495, 560], [1460, 610], [1425, 660], [1390, 705], [1355, 705], [1348, 640], [1352, 560], [1370, 500], [1378, 430], [1360, 340], [1335, 250], [1315, 185]];
// loose strands over the face (thin black hairs), [points, width]
const STRANDS = [
  [[[760, 400], [790, 450], [815, 500], [835, 540]], 3], [[[1320, 380], [1300, 440], [1285, 490]], 3.5], [[[1340, 420], [1325, 490], [1312, 540]], 3],
  [[[775, 480], [795, 560], [805, 620]], 3], [[[1345, 520], [1338, 600], [1325, 660]], 3],
  [[[1172, 196], [1182, 250], [1196, 300], [1212, 332]], 2.2], [[[1142, 150], [1158, 228], [1180, 290]], 2], [[[985, 320], [976, 380], [962, 440]], 3],
];
function paintHair(g) {
  // the measured silhouettes of the hair masses (hairsil.js), solid ink
  const sil = (gg) => { for (const p of HAIR_SIL) { gg.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) gg.lineTo(p[i], p[i + 1]); gg.closePath(); } };
  // (the central lock is drawn as its own strands below, so the silhouette is kept out of its zone)
  const LOCKZ = poly([[935, 80], [1125, 80], [1105, 190], [1060, 290], [1010, 380], [965, 470], [935, 470], [935, 80]]);
  g.save(); g.beginPath(); g.rect(0, -500, 3000, 2000); LOCKZ(g); g.clip("evenodd"); fillPath(g, sil, INK); g.restore();
  // the central lock: a bundle of long strands from the cuff sweeping down-left (convex to the right), tips spread
  // between the left eye's inner corner and the cheek (read off the 2.5x crop z/bangs.jpg)
  {
    const rl = rng(261);
    for (let k = 0; k < 16; k++) {
      const u = k / 15, root = [958 + u * 150, 91 - Math.sin(u * PI) * 3];
      const tip = [905 + u * 95 + (rl() - 0.5) * 16, 478 - u * 125 + (rl() - 0.5) * 30];
      const len = Math.hypot(tip[0] - root[0], tip[1] - root[1]), sh = 1 - (rl() < 0.3 ? rl() * 0.35 : 0);
      const T = [root[0] + (tip[0] - root[0]) * sh, root[1] + (tip[1] - root[1]) * sh];
      const q = strandSpine(root, T, -0.05 - 0.02 * u, -0.035 - 0.015 * u);
      ribbon(g, q, P_HANG(9 + rl() * 7, 0.05, 1.0), INK);
    }
  }
  // under the cuff at the sides the hair is solid dark right up to the cuff edge
  const under = (x0, x1) => { const q = sampleCurve(CUFF_LOW, 12).filter((p) => p[0] >= x0 && p[0] <= x1); return q.concat(q.slice().reverse().map(([x, y]) => [x, y + 42])); };
  fillPath(g, poly(under(596, 830)), INK); fillPath(g, poly(under(1255, 1494)), INK);
  // partings: thin white lines running with the flow (the strand zones) inside the black
  const r = rng(251);
  withClip(g, sil, () => {
    for (const Z of HAIR_ZONES) for (const s of zoneStrands({ ...Z, n: Math.round(Z.n * 1.6), seed: Z.seed + 50 })) {
      for (let k = 0; k < 2; k++) {
        if (r() > (Z.part ?? 0.6) * 0.62) continue;
        const q = s.q, n = q.length, a0 = Math.floor((0.02 + r() * 0.3) * n), a1 = Math.floor((0.4 + r() * 0.55) * n);
        const side = (r() - 0.5) * s.w * 1.4;
        const pts = [];
        for (let i = a0; i < a1 && i < n; i++) {
          const p = q[i], nx = q[Math.min(n - 1, i + 1)], pv = q[Math.max(0, i - 1)];
          const dx = nx[0] - pv[0], dy = nx[1] - pv[1], d = Math.hypot(dx, dy) || 1;
          pts.push([p[0] - dy / d * side, p[1] + dx / d * side]);
        }
        if (pts.length > 3) ribbon(g, pts, P_TIP2(0.8 + r() * 1.5, 0.35, 0.45), gv(0.9, 0.92));
      }
    }
  });
  for (const [p, w] of STRANDS) ribbon(g, sampleCurve(p, 10), P_HANG(w, 0.1, 0.8), INK);
  // flyaways: fine tapered hairs leaving the lower / outer edges of the masses, running down with the flow
  {
    const rf = rng(271);
    for (const P of HAIR_SIL) {
      const n = P.length / 2, pts = []; for (let i = 0; i < n; i++) pts.push([P[2 * i], P[2 * i + 1]]);
      let ar = 0; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; ar += a[0] * b[1] - b[0] * a[1]; }
      const sgn = ar > 0 ? 1 : -1;
      for (let i = 0; i < n; i++) {
        const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 1) continue;
        const nx = sgn * dy / L, ny = -sgn * dx / L;        // outward normal
        if (ny < 0.15 || a[1] < 150) continue;               // only edges facing down / out, below the cuff
        for (let t = 0; t < L; t += 7) {
          if (rf() > 0.45) continue;
          const p = [a[0] + dx * t / L, a[1] + dy * t / L], len = 14 + rf() * 34;
          const side = p[0] < 1045 ? -1 : 1, dir = [nx * 0.35 + side * 0.25, 0.9], dd = Math.hypot(dir[0], dir[1]);
          const e = [p[0] + dir[0] / dd * len, p[1] + dir[1] / dd * len], m = [(p[0] + e[0]) / 2 + side * len * 0.12, (p[1] + e[1]) / 2];
          ribbon(g, sampleCurve([[p[0] - dir[0] / dd * 6, p[1] - dir[1] / dd * 6], m, e], 6), P_HANG(2.2 + rf() * 2.2, 0.1, 0.9), INK);
        }
      }
    }
  }
  // single dark strands over the forehead and brow (zones marked ink)
  for (const Z of HAIR_ZONES) if (Z.ink) for (const s of zoneStrands(Z)) ribbon(g, s.q, P_HANG(s.w, 0.06, 0.9), INK);
}

function paintBeanie(g) {
  const bp = poly(BEANIE);
  fillPath(g, bp, gv(0.64));
  const cuff = (gg) => { const top = sampleCurve(FOLD, 6), low = sampleCurve(CUFF_LOW, 6).reverse(); gg.moveTo(top[0][0], top[0][1]); for (const p of top) gg.lineTo(p[0], p[1]); for (const p of low) gg.lineTo(p[0], p[1]); gg.closePath(); };
  // value: light across the middle, falling off at the far sides
  withClip(g, bp, () => {
    const gr = g.createLinearGradient(560, 0, 1510, 0);
    gr.addColorStop(0, gv(0.36)); gr.addColorStop(0.1, gv(0.56)); gr.addColorStop(0.25, gv(0.66)); gr.addColorStop(0.75, gv(0.66)); gr.addColorStop(0.9, gv(0.56)); gr.addColorStop(1, gv(0.36));
    g.fillStyle = gr; g.fillRect(540, -380, 1000, 720);
    // mottled wool: soft lighter / darker patches
    const r = rng(64);
    for (let i = 0; i < 200; i++) { const x = 570 + r() * 930, y = -20 + r() * 330, rr = 4 + r() * 11; g.beginPath(); g.ellipse(x, y, rr, rr * 0.6, r() * PI, 0, 2 * PI); g.fillStyle = r() < 0.35 ? gv(0.72, 0.16) : gv(0.35, 0.16); g.fill(); }
  });
  // cuff ribs: curved lines fanning round the head, from the fold to the lower edge
  withClip(g, cuff, () => {
    const top = sampleCurve(FOLD, 30), low = sampleCurve(CUFF_LOW, 30);
    const N = 96, r = rng(61);
    const at2 = (Q, u) => { const f = u * (Q.length - 1), i = Math.min(Q.length - 2, Math.floor(f)), t = f - i; return [Q[i][0] + (Q[i + 1][0] - Q[i][0]) * t, Q[i][1] + (Q[i + 1][1] - Q[i][1]) * t]; };
    for (let k = 0; k <= N; k++) {
      // denser toward the sides (the cuff turns away); each rib a slightly wavy line
      const v = k / N, u = 0.5 + Math.sin((v - 0.5) * PI * 0.92) / (2 * Math.sin(PI * 0.46));
      const a = at2(top, u), b = at2(low, u), pts = [];
      for (let j = 0; j <= 8; j++) { const t = j / 8, w = noise1(k * 0.7 + t * 2.3, 67) * 2.2; pts.push([a[0] + (b[0] - a[0]) * t + (u - 0.5) * 14 * Math.sin(PI * t) + w, a[1] + (b[1] - a[1]) * t]); }
      ribbon(g, sampleCurve(pts, 4), P_SWELL(2.1 + r() * 0.7, 0.45), ink(0.82));
      if (r() < 0.7) ribbon(g, sampleCurve(pts.map(([x, y]) => [x + 4.5, y]), 4), P_SWELL(1.2, 0.3), gv(0.82, 0.4));
    }
    // the shaded far sides: cross strokes across the ribs
    hatch(g, null, [560, -150, 1510, 330], {
      sp: 5, seed: 62, cov: (x) => 0.5 * (1 - smoothstep(0.12, 0.42, 1 - Math.abs(x - 1035) / 470)),
      ang: (x) => (x < 1035 ? -0.5 : 0.5), len: (x, y, r) => 12 + r() * 20, wid: () => 1.8,
    });
  });
  const crownOnly = (gg) => { const top = CROWN.filter((p) => p[1] < 40 || (p[0] > 1400 && p[1] < 80)); const fold = sampleCurve(FOLD, 6).reverse(); poly(top.concat(fold))(gg); };
  // crown (seen in the pans): fine knit ribs running up to the top, shaded darker toward the sides and the top, a soft
  // highlight above the fold's middle
  withClip(g, crownOnly, () => {
    const gr = g.createRadialGradient(1000, -120, 40, 1000, -140, 540);
    gr.addColorStop(0, gv(0.56)); gr.addColorStop(0.6, gv(0.46)); gr.addColorStop(1, gv(0.12));
    g.fillStyle = gr; g.fillRect(540, -380, 1000, 520);
    const r = rng(63);
    for (let k = 0; k < 150; k++) {
      const u = k / 149, x = 575 + u * 925, xm = 1035 + (x - 1035) * 0.72;
      const pts = [[x, 130], [x + (xm - x) * 0.35, -110], [xm, -365]];
      ribbon(g, sampleCurve(pts, 10), P_SWELL(1.5 + r() * 0.7, 0.4), ink(0.5 + r() * 0.2));
    }
  });
  pen(g, FOLD, 4, INK, P_SWELL(4, 0.5));
  pen(g, CUFF_LOW, 5, INK, P_SWELL(5, 0.6));
  pen(g, CROWN, 3.4, INK, P_SWELL(3.4, 0.6));
}

// sweat beads at 6.04 s [top, bottom]; slide "a" (measured: 0 -> 28 px by 8.2 s, easing out) or "b" (13 px by 7.25 s)
export const DROPS = [
  { top: [814, 484], bot: [819, 521], dy: 27, dx: 2, slide: "a" },
  { top: [1271, 488], bot: [1275, 513], dy: 25, dx: 3, slide: "a", grow: 12 },
  { top: [1110, 398], bot: [1116, 422], dy: 13, dx: 1, slide: "b" },
  { top: [799, 441], bot: [802, 446], small: true },
  { top: [915, 145], bot: [917, 162] },
  { top: [1139, 143], bot: [1144, 167] },
  { top: [1164, 106], bot: [1168, 121], small: true },
];
export function paintDrop(g, top, bot, s = 1) {
  const h = bot[1] - top[1], w = Math.max(5, h * 0.36) * s;
  const pts = [top, [top[0] - 1, top[1] + h * 0.45], [bot[0] - w * 0.48, bot[1] - w * 0.5], [bot[0], bot[1]], [bot[0] + w * 0.48, bot[1] - w * 0.5], [bot[0] + w * 0.5, bot[1] - w * 1.2]];
  ribbon(g, sampleCurve(pts, 5), (u) => (u < 0.6 ? 0.5 + 3.0 * Math.pow(u / 0.6, 1.4) : 3.5 - 2.2 * (u - 0.6) / 0.4) * Math.max(0.6, s), ink(0.9));
}

function paintPencil(g) {
  // body (hexagonal: light and dark facets), behind the teeth
  const y0 = 710, y1 = 745;
  const body = poly([[752, y0 + 1], [1316, y0], [1316, y1], [752, y1 - 1]]);
  withClip(g, body, () => {
    const gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, gv(0.55)); gr.addColorStop(0.15, gv(0.93)); gr.addColorStop(0.35, gv(0.8)); gr.addColorStop(0.5, gv(0.95)); gr.addColorStop(0.7, gv(0.72)); gr.addColorStop(0.85, gv(0.9)); gr.addColorStop(1, gv(0.45));
    g.fillStyle = gr; g.fillRect(740, y0 - 2, 600, y1 - y0 + 4);
    const r = rng(71);
    for (let i = 0; i < 70; i++) { const x = 760 + r() * 550, y = y0 + 3 + r() * (y1 - y0 - 6), L = 20 + r() * 80; ribbon(g, [[x, y], [x + L, y + (r() - 0.5)]], P_TIP2(0.8 + r(), 0.3, 0.3), ink(0.35)); }
  });
  pen(g, [[752, y0 + 1], [1316, y0]], 2.2, INK, P_SWELL(2.2, 0.7));
  pen(g, [[752, y1 - 1], [1316, y1]], 2.6, INK, P_SWELL(2.6, 0.7));
  // sharpened wood + graphite tip
  const cone = poly([[707, 729], [752, y0 + 1], [746, 716], [752, 722], [745, 728], [752, 734], [746, 740], [752, y1 - 1]]);
  fillPath(g, cone, gv(0.9));
  withClip(g, cone, () => { for (let i = 0; i < 6; i++) ribbon(g, [[708, 729], [752, y0 + 3 + i * 6]], P_TIP2(1, 0.2, 0.2), ink(0.4)); });
  fillPath(g, poly([[704, 729], [724, 722], [724, 736]]), INK);
  pen(g, [[707, 729], [752, y0 + 1]], 1.6, INK); pen(g, [[707, 729], [752, y1 - 1]], 1.6, INK);
  pen(g, [[752, y0 + 1], [746, 716], [752, 722], [745, 728], [752, 734], [746, 740], [752, y1 - 1]], 1.5, INK);
  // ferrule + eraser
  fillPath(g, poly([[1316, 707], [1356, 707], [1356, 748], [1316, 748]]), gv(0.62));
  for (const x of [1322, 1334, 1346]) pen(g, [[x, 708], [x, 747]], 2.0, ink(0.8));
  withClip(g, poly([[1316, 707], [1356, 707], [1356, 748], [1316, 748]]), () => { g.fillStyle = gv(0.95, 0.8); g.fillRect(1316, 716, 40, 5); g.fillRect(1316, 732, 40, 3); });
  fillPath(g, blob([[1356, 712], [1380, 712], [1389, 720], [1390, 736], [1381, 744], [1356, 744]], 0.3), gv(0.7));
  g.beginPath(); g.rect(1316, 707, 40, 41); g.lineWidth = 2.2; g.strokeStyle = INK; g.stroke();
  pen(g, [[1356, 712], [1380, 712], [1389, 720], [1390, 736], [1381, 744], [1356, 744]], 2.2, INK, P_SWELL(2.2, 0.8));
}
function paintTeeth(g) {
  const T = [[[986, 704], [1010, 702], [1010, 718], [990, 717]], [[1010, 701], [1053, 702], [1052, 725], [1014, 723]], [[1053, 702], [1098, 701], [1096, 723], [1057, 725]], [[1098, 701], [1126, 704], [1124, 716], [1100, 718]]];
  for (const t of T) { fillPath(g, blob(t, 0.25), gv(0.97)); g.beginPath(); smoothPath(g, t, true, 0.25); g.lineWidth = 2.2; g.strokeStyle = INK; g.stroke(); }
}
function paintLaptop(g) {
  const { x0, x1, top, r } = LAPTOP;
  const lid = (gg) => { gg.moveTo(x0 - 12, 960); gg.lineTo(x0 - 8, top + r); gg.quadraticCurveTo(x0 - 6, top, x0 + r, top); gg.lineTo(x1 - r, top); gg.quadraticCurveTo(x1 + 6, top, x1 + 8, top + r); gg.lineTo(x1 + 12, 960); gg.closePath(); };
  fillPath(g, lid, gv(0.01));
  // the lit bevel (profile measured at x 300-1850): black outline 813-815, bright 816-823, grey with fine lines
  // 824-829, a bright lower line 830-832, black from 834; the band rounds the corners
  withClip(g, lid, () => {
    const gr = g.createLinearGradient(0, top + 2, 0, top + 21);
    const st = [[0, 0.02], [0.12, 0.6], [0.2, 0.86], [0.5, 0.78], [0.56, 0.52], [0.8, 0.4], [0.86, 0.72], [0.95, 0.62], [1, 0.01]];
    for (const [u, v] of st) gr.addColorStop(u, gv(v));
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(x0 - 6, top + r + 30); g.lineTo(x0 - 5, top + r * 0.6); g.quadraticCurveTo(x0 - 2, top + 3, x0 + r, top + 3); g.lineTo(x1 - r, top + 3); g.quadraticCurveTo(x1 + 2, top + 3, x1 + 5, top + r * 0.6);
    g.lineTo(x1 + 6, top + r + 30); g.lineTo(x1 - 14, top + r + 30); g.lineTo(x1 - 14, top + 22); g.lineTo(x0 + 14, top + 22); g.lineTo(x0 + 14, top + r + 30); g.closePath(); g.fill();
    const r2 = rng(73);
    for (let i = 0; i < 60; i++) { const x = x0 + 20 + r2() * (x1 - x0 - 40), y = top + 12 + r2() * 5; ribbon(g, [[x, y], [x + 30 + r2() * 90, y]], P_TIP2(0.9, 0.3, 0.3), ink(0.35)); }
  });
}

// build the two static drawings (stare lids / look lids). Returns canvases in world coords (x 0..W, y -DY..H)
function paintBase(g) {
  paintHoodie(g);
  paintFace(g);
  hatchBrow(g, [[842, 190], [880, 199], [910, 207], [942, 216]], 20, 0.55, 81);
  hatchBrow(g, [[1112, 228], [1140, 210], [1175, 199], [1212, 194], [1255, 193]], 22, 2.05, 82);
}
function paintHead(cg, look) {
  EYES.forEach((E, i) => paintEyeBase(cg, E, look, 90 + i * 7));
  if (look) EYES.forEach((E, i) => paintLookIris(cg, E, i));
  paintHair(cg);
  paintBeanie(cg);
  paintPencil(cg);
  paintTeeth(cg);
  paintLaptop(cg);
}
// the three static drawings: stare lids, look lids, and the pans' soft look. Canvases in world coords (x 0..W, y -DY..H)
export function buildDesigner() {
  const out = {};
  for (const [key, look, soft] of [["stare", false, false], ["look", true, false], ["soft", true, true]]) {
    SOFT = soft;
    const c = mk(W, H + DY), cg = c.getContext("2d");
    cg.translate(0, DY); cg.lineCap = "round"; cg.lineJoin = "round";
    paintBase(cg); paintHead(cg, look);
    if (!globalThis.__NOTONE) { const T = (soft ? SOFT_TONE : DES_TONE).concat(CROWN_TONE || []); if (T.length) applyTone(c, 0, -DY, T); }
    out[key] = c;
  }
  SOFT = false;
  return out;
}
function hatchBrow(g, spine, w, ang, seed) {
  const q = sampleCurve(spine, 12), r = rng(seed);
  for (let i = 0; i < q.length; i++) for (let k = 0; k < 8; k++) {
    const p = q[i], off = (r() - 0.5) * w * (1 - Math.abs(i / q.length - 0.5)), a = ang + (r() - 0.5) * 0.3, L = 8 + r() * 10;
    const x = p[0] + off * 0.3, y = p[1] + off;
    ribbon(g, [[x - Math.cos(a) * L / 2, y - Math.sin(a) * L / 2], [x + Math.cos(a) * L / 2, y + Math.sin(a) * L / 2]], P_TIP2(1.8 + r() * 1.2, 0.3, 0.4), ink(0.72));
  }
}
