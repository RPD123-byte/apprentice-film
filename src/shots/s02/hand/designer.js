// s02: the designer, drawn by hand in code (manga ink on paper). World coords = the 6.04 s source frame.
// Geometry: control points read off 2-4x grid crops of the stare / look averages (snapshots/s02-r3-meas/z/*),
// drawn as pen lines, filled shapes and field hatching (pen.js). Nothing is traced automatically.
// The canvas covers world x 0..W, y -DY..H (the pan reveals the beanie crown up to y -352).
import { W, H } from "../../../config.js";
import { rng, hash, noise1 } from "../../../lib/rng.js";
import { sampleCurve, smoothPath } from "../../../lib/paths.js";
import { HAIR_SIL } from "./hairsil.js";
import { applyTone } from "./tone.js";
import { DES_TONE, SOFT_TONE } from "./tonedata.js";
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
// the open face (skin not under the hair or the beanie), for the tone mask (fix pass 2)
export const FACE_OVAL = [[760, 300], [790, 200], [860, 130], [960, 108], [1100, 104], [1240, 128], [1310, 190], [1335, 320], [1345, 520], [1325, 620], [1290, 690],
  [800, 690], [765, 620], [748, 520], [745, 400]];
// beanie: crown outline (pan frames 12.0–12.8 s), cuff lower edge (stare)
export const CUFF_LOW = [[596, 318], [606, 290], [624, 256], [650, 222], [680, 192], [714, 164], [750, 140], [800, 118], [850, 105], [900, 97], [950, 92],
  [1000, 87], [1050, 84], [1100, 87], [1150, 94], [1200, 104], [1250, 117], [1300, 131], [1350, 150], [1400, 175], [1430, 196], [1452, 218], [1472, 248], [1488, 282], [1494, 310]];
const CROWN0 = [[596, 318], [584, 290], [575, 250], [571, 200], [571, 140], [576, 80], [588, 20], [604, -40], [622, -100], [646, -160], [690, -228], [746, -266], [796, -290],
  [846, -310], [896, -332], [946, -346], [996, -353], [1046, -355], [1096, -352], [1146, -343], [1196, -324], [1246, -300], [1296, -270], [1346, -232],
  [1396, -172], [1438, -104], [1468, -30], [1486, 40], [1497, 110], [1502, 180], [1502, 250], [1498, 290], [1494, 310]];
// fix pass 1: the crown 12 px wider on each side above the cuff (return pan f474: source 333-1267 vs 349-1251), easing in
// toward the cuff's lower corners
const CROWN = CROWN0.map(([x, y]) => [x + Math.sign(x - 1035) * 12 * smoothstep(300, 150, y), y]);
export const BEANIE = CROWN.concat(CUFF_LOW.slice().reverse().slice(1));
const FOLD = [[574, 60], [600, 8], [650, -36], [720, -72], [800, -97], [850, -108], [946, -128], [1046, -137], [1146, -131], [1246, -112], [1330, -76], [1400, -36], [1458, 18], [1494, 92]];
// laptop lid: the black bar at the bottom with a lit bevel above it
export const LAPTOP = { x0: 226, x1: 1890, top: 813, bev: 834, r: 34 };

// ---------------- eyes ----------------
// per eye, measured on the stare / look averages (dark-run column scans every 10 px, snapshots/s02-fix1h-lab/runs.py):
// up / lo = the white's top and bottom edges (the upper lid band sits wholly above `up`), rim = the second line under the
// lower lid, crease = the thin double fold above the lid; lidT = [outer, middle, inner] thickness of the upper lid band;
// iris / pupil (Hough fit + radial profile: pupil r 6, a pale ring round it, darkening outward to a thin dark rim at
// r 25-27.5); the look: lids lowered 9-10 px, iris swung into the inner corner (grid crops, 4x)
export const EYES = [
  { // viewer's left (outer corner on the left)
    up: [[764, 326], [772, 316], [785, 305], [800, 295], [815, 289], [830, 285], [850, 283.5], [870, 286], [885, 291], [897, 300], [907, 310], [917, 324], [927, 337], [933, 342]],
    lo: [[764, 326], [775, 331], [787, 339], [805, 351], [825, 358.5], [850, 362], [875, 360.5], [895, 354], [915, 345], [933, 342]],
    rim: [[770, 342], [782, 352], [797, 362], [815, 370], [850, 372.5], [885, 369.5], [903, 364], [918, 357]],
    crease: [[776, 285], [790, 273], [805, 268], [825, 263.5], [850, 261], [875, 263], [895, 271], [912, 283], [925, 299]],
    lidT: [16, 7.5, 20],
    iris: [851.5, 323.5, 27.5], pupil: 6,
    lookUp: [[764, 326], [772, 318], [785, 310], [800, 302], [815, 297], [830, 294], [850, 293], [870, 294.5], [885, 299], [897, 309], [907, 319], [917, 330], [927, 339], [933, 342]],
    lookIris: [894, 336, 36], lookPupil: [895, 334, 7.5],
    sock: [846, 330, 120, 72],
  },
  { // viewer's right (outer corner on the right)
    up: [[1147, 340], [1155, 332], [1165, 319], [1175, 307], [1185, 296], [1195, 288], [1205, 283], [1220, 279], [1235, 277.5], [1255, 279], [1268, 284], [1285, 291], [1297, 300], [1306, 309], [1314, 318], [1318, 323]],
    lo: [[1147, 340], [1165, 340.5], [1185, 347], [1205, 353], [1225, 355.5], [1245, 355], [1265, 350], [1285, 339], [1300, 328], [1311, 321], [1318, 323]],
    rim: [[1160, 350], [1185, 356], [1205, 361.5], [1235, 365.5], [1265, 361], [1285, 353], [1300, 343], [1311, 333]],
    crease: [[1160, 289], [1172, 276], [1185, 267], [1205, 259.5], [1225, 256.5], [1245, 257], [1265, 261.5], [1282, 267], [1300, 278], [1314, 292]],
    lidT: [11, 7.5, 16],
    iris: [1233, 318.5, 27.5], pupil: 6,
    lookUp: [[1147, 340], [1155, 334], [1165, 325], [1175, 313], [1185, 303], [1195, 296], [1205, 292], [1220, 289], [1235, 288], [1255, 289], [1268, 292], [1285, 298], [1297, 306], [1306, 313], [1314, 320], [1318, 323]],
    lookIris: [1270, 326, 35], lookPupil: [1269, 325, 7.5],
    sock: [1234, 322, 118, 70],
  },
];
function whitesPath(E, look) {
  const up = look ? E.lookUp : E.up;
  const a = sampleCurve(up, 6), b = sampleCurve(E.lo, 6).reverse();
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
    // (thinned and spaced ~1.5x this pass: the source's hoodie hatching is sparse and fine)
    comb(g, OL, { sp: 4.6, seed: 101, ang: (x, y, u) => (u < 0.3 ? -0.2 + u : 1.05), len: (u, r) => (u < 0.3 ? 24 : 18) + r() * 24, wid: (u, r) => 0.9 + r() * 0.6, off: 1, bend: 0.25 });
    comb(g, OL, { sp: 10, seed: 102, ang: (x, y, u) => (u < 0.3 ? 0.15 + u : 1.2), len: (u, r) => 16 + r() * 26, wid: (u, r) => 0.8 + r() * 0.5, off: 10, bend: 0.3, keep: (u, r) => r() < 0.8 });
    comb(g, OL, { sp: 6.3, seed: 103, ang: (x, y, u) => (u < 0.3 ? -1.2 : -0.35), len: (u, r) => 10 + r() * 18, wid: () => 1.1, off: 4, prof: (w) => P_TIP2(w, 0.3, 0.4), keep: (u, r) => r() < 0.7 });
    // seam: long comb hanging below it
    const SL = [[150, 686], [240, 640], [330, 610], [448, 568], [522, 544], [590, 520]];
    comb(g, SL, { sp: 9, seed: 104, ang: () => 1.33, len: (u, r) => 20 + r() * 40, wid: (u, r) => 0.8 + r() * 0.5, off: 2, bend: 0.3, prof: (w) => P_HANG(w, 0.06, 1.3) });
    comb(g, SL, { sp: 6.0, seed: 105, ang: () => -1.6, len: (u, r) => 8 + r() * 20, wid: () => 1.1, off: 1, prof: (w) => P_HANG(w, 0.1, 1) });
    // RIGHT shoulder
    comb(g, OR, { sp: 4.6, seed: 111, ang: (x, y, u) => (u > 0.7 ? PI + 0.2 - (1 - u) : PI - 1.05), len: (u, r) => (u > 0.7 ? 24 : 18) + r() * 24, wid: (u, r) => 0.9 + r() * 0.6, off: 1, bend: 0.25 });
    comb(g, OR, { sp: 11, seed: 112, ang: (x, y, u) => (u > 0.7 ? PI - 0.15 - (1 - u) : PI - 1.2), len: (u, r) => 16 + r() * 26, wid: (u, r) => 0.8 + r() * 0.5, off: 10, bend: 0.3, keep: (u, r) => r() < 0.8 });
    comb(g, OR, { sp: 6.3, seed: 113, ang: (x, y, u) => (u > 0.7 ? PI + 1.2 : PI + 0.35), len: (u, r) => 10 + r() * 18, wid: () => 1.1, off: 4, prof: (w) => P_TIP2(w, 0.3, 0.4), keep: (u, r) => r() < 0.7 });
    const SR = [[1500, 530], [1564, 568], [1640, 590], [1720, 612], [1800, 636], [1860, 664], [1916, 712], [1950, 780]];
    comb(g, SR, { sp: 10.5, seed: 114, ang: () => PI - 1.33, len: (u, r) => 20 + r() * 40, wid: (u, r) => 0.8 + r() * 0.5, off: 2, bend: 0.3, prof: (w) => P_HANG(w, 0.06, 1.3) });
    comb(g, SR, { sp: 6.0, seed: 115, ang: () => PI + 1.6, len: (u, r) => 8 + r() * 20, wid: () => 1.1, off: 1, prof: (w) => P_HANG(w, 0.1, 1) });
    // an even layer of long strokes over the whole shoulder (the source's hoodie is hatched all over, lighter low down)
    const dE = distField(hp, [0, 420, 2080, 946], 0.25);
    hatch(g, null, [0, 440, 2080, 946], {
      sp: 10.5, seed: 106, cov: (x, y) => (x > 780 && x < 1290 ? 0 : (x > 1290 ? 0.2 : 0.36) * (0.1 + 0.1 * Math.exp(-dE(x, y) / 140))),
      ang: (x, y) => (x < 1035 ? 1.28 - (x < 250 ? 0.25 : 0) : PI - 1.28 + (x > 1820 ? 0.25 : 0)), len: (x, y, r) => 14 + r() * 26, wid: (x, y, r) => 0.7 + r() * 0.5, bend: 0.3,
      prof: (w) => P_TIP2(w, 0.25, 0.4),
    });
    // fix pass 2 (review low: long fur-like strokes): the source's hoodie tone is short cross-hatch concentrated in a band
    // 40-80 px under the shoulder outline and along the folds; the lit chest stays clean
    hatch(g, null, [0, 440, 2080, 946], {
      sp: 5.5, seed: 107, cov: (x, y) => (x > 760 && x < 1310 ? 0 : 0.2 * smoothstep(12, 26, dE(x, y)) * (1 - smoothstep(72, 92, dE(x, y)))),
      ang: (x) => (x < 1035 ? 2.35 : PI - 2.35), len: (x, y, r) => 10 + r() * 14, wid: (x, y, r) => 0.8 + r() * 0.5, prof: (w) => P_TIP2(w, 0.25, 0.4),
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
  // the cheeks are clean paper (source): only a few fine loose hairs cross them from the side locks
  {
    const rh = rng(26);
    for (const [x0, y0, x1, y1, n] of [[742, 420, 800, 560, 3], [752, 560, 812, 670, 3], [1340, 430, 1300, 560, 3], [1332, 560, 1284, 660, 2]]) {
      for (let k = 0; k < n; k++) {
        const ox = (rh() - 0.5) * 30, oy = (rh() - 0.5) * 40, bx = (x1 - x0) * 0.1 * (rh() - 0.5);
        const q = sampleCurve([[x0 + ox, y0 + oy], [(x0 + x1) / 2 + ox + bx + 6 * Math.sign(x1 - x0), (y0 + y1) / 2 + oy], [x1 + ox * 0.6, y1 + oy]], 8);
        ribbon(g, q, P_HANG(1.3 + rh() * 0.9, 0.08, 0.8), ink(0.55 + rh() * 0.2));
      }
    }
  }
  // ---- nose (source 3x crop, snapshots/s02-fix1h-z/znose): a line drawing. Two bundles of fine grey strokes down the
  // bridge sides (from y ~400, denser 470-560), the alae as curved "(" ")" lines, the nostrils as one tapered gull-wing
  // line (thick at each nostril, thin under the tip), fine hatching under it; the tip itself left white
  {
    const rn = rng(31);
    // long faint bridge lines
    for (const [xa, xb, sd] of [[992, 978, -1], [1098, 1112, 1]]) for (let k = 0; k < 3; k++) {
      const o = k * 5 * sd;
      ribbon(g, sampleCurve([[xa + o, 405 + k * 18], [xa + o + (xb - xa) * 0.4, 470], [xb + o, 540 - k * 8]], 8), P_TIP2(1.0 + rn() * 0.5, 0.3, 0.3), ink(0.35 + rn() * 0.15));
    }
    // the bridge-side bundles: parallel fine strokes leaning out and down
    for (const [cx0, cy0, ang, n, sd] of [[996, 474, 1.95, 13, -1], [1090, 482, 1.2, 12, 1]]) {
      for (let k = 0; k < n; k++) {
        const x = cx0 + sd * k * 3.1 + (rn() - 0.5) * 2, y = cy0 + k * 3.0 + (rn() - 0.5) * 6, L = 36 + rn() * 32 - k * 1.2;
        ribbon(g, [[x, y], [x + Math.cos(ang) * L * 0.5 + sd * 1.5, y + Math.sin(ang) * L * 0.5], [x + Math.cos(ang) * L, y + Math.sin(ang) * L]], P_TIP2(1.3 + rn() * 0.8, 0.3, 0.35), ink(0.55 + rn() * 0.2));
      }
    }
    // the top of the bridge between the eyes: a few short vertical strokes
    for (let k = 0; k < 7; k++) { const x = 1012 + k * 5 + (rn() - 0.5) * 3, y = 468 + rn() * 8; ribbon(g, [[x, y], [x - 1, y + 16 + rn() * 14]], P_TIP2(1.0, 0.3, 0.3), ink(0.35 + rn() * 0.15)); }
    // alae
    pen(g, [[980, 536], [972, 552], [968, 570], [971, 585], [980, 596], [991, 601]], 2.8, ink(0.9), P_SWELL(2.8, 0.15, 0.7));
    pen(g, [[1121, 528], [1130, 548], [1135, 568], [1132, 585], [1122, 596], [1113, 600]], 2.8, ink(0.9), P_SWELL(2.8, 0.15, 0.7));
    // nostrils + columella: the gull wing
    const gw = sampleCurve([[992, 587], [1003, 580.5], [1016, 582], [1030, 591], [1045, 599], [1052, 600.5], [1060, 599], [1074, 591], [1088, 583], [1100, 580.5], [1108, 584]], 10);
    ribbon(g, gw, (u) => { const d = Math.min(Math.abs(u - 0.14), Math.abs(u - 0.86)); return 1.4 + 5.6 * Math.exp(-Math.pow(d / 0.11, 2)); }, ink(0.92));
    hatch(g, null, [998, 596, 1100, 620], { sp: 3.0, seed: 34, cov: (x, y) => 0.32 * Math.exp(-Math.pow((y - 606) / 6, 2)) * Math.exp(-Math.pow((x - 1045) / 42, 2)), ang: () => 0.3, len: (x, y, r) => 10 + r() * 12, wid: () => 1.0, color: ink(0.7) });
    // the alae's inner shading: a few strokes following each wing
    for (const [pts, sd] of [[[[986, 548], [978, 566], [982, 584]], 1], [[[1116, 544], [1124, 562], [1120, 582]], -1]]) for (let k = 1; k <= 3; k++) ribbon(g, sampleCurve(pts.map(([x, y]) => [x + sd * k * 4.5, y + k]), 5), P_TIP2(1.0, 0.3, 0.3), ink(0.3 + 0.05 * k));
  }
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
    ribbon(g, [[x, y], [x + Math.cos(a) * L, y + Math.sin(a) * L]], P_TIP2(0.9 + r() * 0.5, 0.3, 0.5), ink(0.6));
  }
  }
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
  // the upper lip (source 3.5x crop, zlip): a fringe of fine ticks fanning up from the mouth line, a faint top edge
  { const rl = rng(42);
    for (let x = 962; x <= 1138; x += 3.4) {
      const u = (x - 1050) / 90, y0 = 699 + Math.pow(Math.abs(u), 3) * 5, a = -PI / 2 + u * 0.75 + (rl() - 0.5) * 0.2, L = 7 + rl() * 7 - Math.abs(u) * 2;
      ribbon(g, [[x, y0 - 1], [x + Math.cos(a) * L, y0 - 1 + Math.sin(a) * L]], P_TIP2(1.0 + rl() * 0.5, 0.2, 0.6), ink(0.55 + rl() * 0.2));
    }
    pen(g, [[968, 692], [1000, 686], [1030, 684], [1045, 686], [1060, 684], [1090, 686], [1132, 692]], 1.1, ink(0.35), P_SWELL(1.1, 0.2)); }
  // lower lip: shadow under the pencil + ticks + chin line
  pen(g, [[985, 750], [1020, 755], [1050, 757], [1080, 755], [1110, 750]], 3.4, INK, P_SWELL(3.4, 0.3));
  hatch(g, null, [985, 752, 1115, 775], { sp: 3, seed: 43, dens: (x, y) => 0.8 * Math.exp(-Math.pow((y - 760) / 5, 2)), ang: (x) => (x < 1050 ? 1.9 : 1.2), len: (x, y, r) => 6 + r() * 6, wid: () => 1.1 });
  pen(g, [[975, 772], [1000, 784], [1040, 790], [1080, 787], [1115, 775]], 2.2, ink(0.85), P_SWELL(2.2, 0.2));
  // jaw / neck edges running down to the laptop
  pen(g, [[815, 770], [850, 795], [885, 815]], 2.4, INK);
  pen(g, [[1325, 725], [1290, 770], [1250, 805]], 2.4, INK);
}

// the sockets, lids and whites (no iris). look = the lowered lids of the look
// offset a polyline along its normal (+ = down for a left-to-right curve); d may be a function of u (0..1)
function offsetLine(q, d) {
  const n = q.length, out = [];
  for (let i = 0; i < n; i++) {
    const a = q[Math.max(0, i - 1)], b = q[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1;
    const dd = typeof d === "function" ? d(i / (n - 1)) : d;
    out.push([q[i][0] - dy / L * dd, q[i][1] + dx / L * dd]);
  }
  return out;
}
const sub = (q, u0, u1) => { const n = q.length - 1, i0 = Math.max(0, Math.floor(u0 * n)), i1 = Math.min(n, Math.ceil(u1 * n)); return q.slice(i0, i1 + 1); };
// the eye without its iris. Structure read off 3-4x crops of the stare average (snapshots/s02-fix1h-z/zL, zR, zringL):
// a thin double crease; the upper lid a solid black band ABOVE the white (7-8 px, thickening to 11-20 px in the corners);
// the lower lid line, then a dark waterline broken by pale ticks, then the rim; under the rim the dark ring: grey arcs
// following the socket, stacked ~40 px deep, heaviest near the rim and at the outer corner; a fine cross-hatch grid in
// the inner upper corner toward the nose; a few long arcs over the socket above the crease
function paintEyeBase(g, E, look, seed) {
  const left = E.lo[0][0] < 1000, [cx, cy, rx] = E.sock;
  const up = look ? E.lookUp : E.up;
  const U = sampleCurve(up, 8), LO = sampleCurve(E.lo, 8), RIM = sampleCurve(E.rim, 8), CR = sampleCurve(E.crease, 8);
  const wp = whitesPath(E, look);
  const r = rng(seed);
  const outer = left ? 0 : 1;                                       // u of the outer corner on the L->R curves
  // (fix pass 1: denser, darker rings: the source's crescents under the lower lids read as a dark hatched tone ~40 px
  // deep; the soft pan face keeps them too, a little lighter)
  // fix pass 2 (review medium): the rings were ~22 levels too dark with 2.4x the source's fine contrast (a doubled lower lid
  // and heavy black arcs). The source's ring is fine grey hatching: arcs half as wide, ~1.4x further apart, lighter.
  const ringK = SOFT ? 0.9 : 1.12;
  // ---- the dark ring under the eye: arcs parallel to the rim (spans biased to the two ends, the middle under the iris
  // lighter), then short diagonal strokes across them near the rim
  for (let k = 0; k < 120; k++) {
    const t = Math.pow(r(), 1.6), d = 4 + t * 50 + r() * 2;
    const end = r() < 0.5 ? 0 : 1, len = 0.18 + r() * 0.4 * (1 - 0.5 * t);
    const c0 = end === 0 ? r() * 0.2 : 1 - r() * 0.2 - len, u0 = Math.max(0, c0), u1 = Math.min(1, c0 + len);
    const curl = (r() - 0.3) * 6;
    const q = sub(offsetLine(RIM, (u) => d * (0.5 + 0.5 * Math.sin(PI * Math.min(1, Math.max(0, u)))) + curl * Math.sin(PI * (u - u0) / Math.max(0.05, u1 - u0))), u0, u1);
    if (q.length < 3) continue;
    ribbon(g, q, P_TIP2((0.6 + r() * 0.6) * (1 - 0.3 * t), 0.3, 0.3), ink(ringK * (0.62 * Math.exp(-d / 22) + 0.12 + r() * 0.1)));
  }
  for (let k = 0; k < 24; k++) {
    const u = r(), p = RIM[Math.round(u * (RIM.length - 1))], dd = 4 + r() * 20, ang = (left ? 1 : -1) * (u < 0.5 ? 0.5 : -0.5) + PI / 2 + (r() - 0.5) * 0.4;
    const x = p[0], y = p[1] + dd, L = 8 + r() * 12;
    ribbon(g, [[x - Math.cos(ang) * L / 2, y - Math.sin(ang) * L / 2], [x + Math.cos(ang) * L / 2, y + Math.sin(ang) * L / 2]], P_TIP2(0.6 + r() * 0.4, 0.3, 0.3), ink(ringK * (0.25 + r() * 0.15) * (1 - 0.6 * Math.sin(PI * u))));
  }
  // the outer corner: strokes sweeping down and out from the end of the rim onto the cheek
  {
    const o = left ? E.rim[0] : E.rim[E.rim.length - 1], sd = left ? -1 : 1;
    for (let k = 0; k < 11; k++) {
      const a0 = o[0] - sd * (4 + k * 3.2 + r() * 3), a1 = o[1] - 10 + k * 2.2 + r() * 3;
      const L = 30 + r() * 26, bend = 0.25 + r() * 0.2;
      const q = sampleCurve([[a0, a1], [a0 + sd * L * 0.45, a1 + L * 0.35], [a0 + sd * L * (0.75 - bend * 0.3), a1 + L * (0.75 + bend * 0.2)]], 6);
      ribbon(g, q, P_TIP2(0.8 + r() * 0.6, 0.25, 0.5), ink(ringK * (0.4 + r() * 0.2)));
    }
  }
  // the inner end of the ring: short arcs curling up into the tear duct
  {
    const o = left ? E.rim[E.rim.length - 1] : E.rim[0], sd = left ? 1 : -1;
    for (let k = 0; k < 7; k++) {
      const a0 = o[0] - sd * (6 + r() * 8), a1 = o[1] + 4 + k * 3.4;
      const q = sampleCurve([[a0 - sd * 16, a1 + 5], [a0, a1], [a0 + sd * 12, a1 - 8 - k * 0.8]], 5);
      ribbon(g, q, P_TIP2(0.7 + r() * 0.5, 0.3, 0.4), ink(ringK * (0.35 + r() * 0.2)));
    }
  }
  // ---- above: arcs over the socket between crease and brow (heavier toward both corners), two between lid and crease
  // (fix pass 2: the source's socket above the crease is a fine hatched grey band up to the brow, densest toward both
  // corners: 34 arcs, was 12)
  for (let k = 0; k < 64; k++) {
    const d = -(3 + Math.pow(r(), 1.5) * 38), end = r() < 0.6, inner = r() < 0.5;
    const u0 = end ? (inner === !!outer ? r() * 0.12 : 0.55 + r() * 0.15) : 0.2 + r() * 0.2, u1 = end ? (inner === !!outer ? 0.3 + r() * 0.2 : 0.9 + r() * 0.1) : 0.75 + r() * 0.2;
    ribbon(g, sub(offsetLine(CR, d), u0, u1), P_TIP2(0.8 + r() * 0.8, 0.3, 0.3), ink(0.3 + r() * 0.24 - Math.abs(d) * 0.004));
  }
  // the inner corner toward the nose: fine curved strokes sweeping down beside the bridge (source f152, 1.3x crop)
  {
    const ic = left ? E.up[E.up.length - 1] : E.up[0], sd = left ? 1 : -1;
    // (a dense grey patch of fine strokes between the corner and the bridge, x ~930-990 / 1090-1150, y 290-420)
    for (let k = 0; k < 60; k++) {
      const x0 = ic[0] + sd * (2 + Math.pow(r(), 0.8) * 50), y0 = ic[1] - 44 + r() * 90, L = 18 + r() * 30;
      const ang = PI / 2 - sd * (0.35 + r() * 0.3);
      const q = sampleCurve([[x0, y0], [x0 + Math.cos(ang) * L * 0.5 + sd * 2, y0 + Math.sin(ang) * L * 0.5], [x0 + Math.cos(ang) * L, y0 + Math.sin(ang) * L]], 6);
      ribbon(g, q, P_TIP2(0.9 + r() * 0.6, 0.3, 0.4), ink(0.45 + r() * 0.3));
    }
  }
  // the outer corner (fix pass 2): a patch of strokes fanning out and down from the corner onto the temple (source
  // f152: the outer corners are the darkest part of the socket, ~137 / ~102 graded)
  {
    const oc = left ? E.up[0] : E.up[E.up.length - 1], sd = left ? -1 : 1;
    for (let k = 0; k < 46; k++) {
      const x0 = oc[0] + sd * (Math.pow(r(), 0.9) * 40 - 12), y0 = oc[1] - 36 + r() * 76, L = 16 + r() * 30;
      const ang = PI / 2 + sd * (0.5 + r() * 0.5) * -1;
      const q = sampleCurve([[x0, y0], [x0 + Math.cos(ang) * L * 0.5 - sd * 2, y0 + Math.sin(ang) * L * 0.5], [x0 + Math.cos(ang) * L, y0 + Math.sin(ang) * L]], 6);
      ribbon(g, q, P_TIP2(0.9 + r() * 0.7, 0.3, 0.4), ink(0.42 + r() * 0.3));
    }
  }
  for (let k = 0; k < 3; k++) {
    const q = sub(offsetLine(U, (u) => -(E.lidT[1] + 3 + k * 3.5)), 0.12 + r() * 0.1, 0.78 + r() * 0.12);
    ribbon(g, q, P_TIP2(0.9 + r() * 0.6, 0.3, 0.3), ink(0.3 + r() * 0.15));
  }
  // the outer corner above the lid: a few strokes following the lid down into the corner
  for (let k = 0; k < 6; k++) {
    const q = sub(offsetLine(U, -(10 + k * 3 + r() * 2)), outer ? 0.72 + r() * 0.1 : 0, outer ? 1 : 0.18 + r() * 0.1);
    if (q.length > 2) ribbon(g, q, P_TIP2(1.1 + r() * 0.8, 0.3, 0.3), ink(0.4 + r() * 0.2));
  }
  // the inner upper corner toward the nose: a fine cross-hatch grid (two families of straight lines ~5 px apart)
  {
    const ic = left ? [E.crease[E.crease.length - 1][0] + 8, E.crease[E.crease.length - 1][1] - 4] : [E.crease[0][0] - 8, E.crease[0][1] - 4];
    // (fix pass 2: the source's grid is larger and darker, from the brow's inner end down past the corner)
    const R0 = 76, fall = (x, y) => Math.exp(-(Math.pow((x - ic[0]) / 50, 2) + Math.pow((y - ic[1] - 20) / 62, 2)));
    for (const [ang, sp, bow] of [[left ? 2.25 : 0.89, 5.0, 0.004], [left ? 1.1 : 2.04, 5.4, -0.004]]) {
      const ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca;
      for (let o = -R0; o <= R0; o += sp * (0.85 + r() * 0.3)) {
        const px = ic[0] + nx * o, py = ic[1] + ny * o;
        const pts = []; for (let s2 = -R0; s2 <= R0; s2 += 4) { const b2 = bow * s2 * s2; pts.push([px + ca * s2 + nx * b2, py + sa * s2 + ny * b2]); }
        const keep = pts.filter(([x, y]) => fall(x, y) > 0.3 + r() * 0.06);
        if (keep.length > 2) ribbon(g, keep, P_TIP2(0.9 + r() * 0.7, 0.2, 0.2), ink((left ? 0.48 : 0.56) + r() * 0.15));
      }
    }
  }
  // ---- the white: faint grey toward both corners, a few fine veins
  fillPath(g, wp, gv(0.975));
  withClip(g, wp, () => {
    for (const [ex, sd] of [[up[0][0], 1], [up[up.length - 1][0], -1]]) {
      const gr = g.createLinearGradient(ex, 0, ex + sd * rx * 0.5, 0); gr.addColorStop(0, gv(0.62, 0.55)); gr.addColorStop(1, gv(0.62, 0));
      g.fillStyle = gr; g.fillRect(Math.min(ex, ex + sd * rx * 0.5), cy - 80, rx * 0.5, 160);
    }
    const rv = rng(seed + 9);
    for (let k = 0; k < 8; k++) {
      const side = k % 2 ? 1 : -1, x = cx + side * (rx * 0.42 + rv() * rx * 0.25), y = cy + (rv() - 0.3) * 22;
      const q = [[x, y]]; let a = side > 0 ? PI + (rv() - 0.5) : (rv() - 0.5), xx = x, yy = y;
      for (let j = 0; j < 6; j++) { a += (rv() - 0.5) * 1.3; xx += Math.cos(a) * 3.2; yy += Math.sin(a) * 3.2; q.push([xx, yy]); }
      ribbon(g, q, P_SWELL(0.8, 0.3), ink(0.3));
    }
    // the lid's shadow on the top of the white
    ribbon(g, U.map(([a, b]) => [a, b + 2]), P_SWELL(4, 0.4), ink(0.1));
  });
  // ---- upper lid: a solid band above the white, thickening into both corners, a few lashes off the outer corner
  {
    const [tO, tM, tI] = E.lidT, tf = (u) => { const uo = outer ? 1 - u : u, ui = 1 - uo; return tM + (tO - tM) * Math.pow(Math.max(0, 1 - uo / 0.22), 1.6) + (tI - tM) * Math.pow(Math.max(0, 1 - ui / 0.2), 1.6); };
    const top = offsetLine(U, (u) => -tf(u) * (0.35 + 0.65 * Math.min(1, Math.min(u, 1 - u) / 0.04)));
    fillPath(g, poly(U.concat(top.slice().reverse())), INK);
    const oc = outer ? U[U.length - 1] : U[0], sd = outer ? 1 : -1;
    for (let i = 0; i < 4; i++) pen(g, [[oc[0] - sd * (2 + i * 4), oc[1] - 6 - i * 2], [oc[0] + sd * (7 + i * 2), oc[1] - 10 + i * 5]], 1.8, INK, P_HANG(1.8));
  }
  // ---- crease: a dark thin line and a fainter one above it
  pen(g, E.crease, 3.0, ink(0.88), P_SWELL(3.0, 0.2));
  ribbon(g, sub(offsetLine(CR, -5.5), 0.1, 0.88), P_SWELL(1.8, 0.2), ink(0.62));
  // ---- lower lid: the line, the waterline (dark, broken by pale ticks), the rim
  // (fix pass 1: the band between lid line and rim is light with dark ticks in the source, not a grey stripe)
  fillPath(g, poly(LO.concat(RIM.slice().reverse())), ink(0.08));
  {
    const n = Math.min(LO.length, RIM.length);
    for (let i = 3; i < n - 3; i += 2) {
      if (r() < 0.45) continue;
      const u = i / (n - 1), a = LO[Math.round(u * (LO.length - 1))], b = RIM[Math.round(u * (RIM.length - 1))];
      const m0 = [a[0] + (b[0] - a[0]) * 0.35, a[1] + (b[1] - a[1]) * 0.35], m1 = [a[0] + (b[0] - a[0]) * 0.7, a[1] + (b[1] - a[1]) * 0.7];
      ribbon(g, [m0, m1], P_TIP2(1.1 + r() * 0.9, 0.3, 0.3), ink(0.4 + r() * 0.25));
    }
  }
  pen(g, E.lo, 2.3, INK, P_SWELL(2.3, 0.3));
  // (fix pass 2: one lower-lid line; the rim below it is a faint grey line, not a second lid)
  pen(g, E.rim, 1.2, ink(0.45), P_SWELL(1.2, 0.25));
  // tear duct at the inner corner: a small pointed pink notch with a dark crease
  { const ic = left ? E.up[E.up.length - 1] : E.up[0], d = left ? -1 : 1;
    fillPath(g, poly([[ic[0], ic[1]], [ic[0] + d * 13, ic[1] - 5], [ic[0] + d * 15, ic[1] + 3], [ic[0] + d * 5, ic[1] + 6]]), gv(0.72));
    pen(g, [[ic[0] + 2 * (-d), ic[1] - 1], [ic[0] + d * 10, ic[1] - 4], [ic[0] + d * 17, ic[1] - 2]], 2.2, INK, P_SWELL(2.2, 0.3)); }
}

// the iris (stare): pale round the pupil and darkening outward to a thin dark rim (radial profile of the stare average:
// pupil r 6, ~1.0 at r 7-14, 0.8 at r 19, 0.65 at r 22, 0.47 at r 24.5, 0.3 at the rim r 26.5), fine radial striation.
// dx/dy = saccade offset; k scales the drawing (the 219 in-between)
export function paintIris(g, E, dx = 0, dy = 0, i = 0, k = 1, dark = 0) {
  const [x, y, R0] = E.iris, X = x + dx, Y = y + dy, R = R0 * k, P = E.pupil * k;
  withClip(g, WHITES[i][0], () => {
    const gr = g.createRadialGradient(X, Y, P, X, Y, R);
    for (const [u, v] of [[0, 0.97], [0.37, 0.97], [0.47, 0.92], [0.6, 0.8], [0.74, 0.66], [0.86, 0.5], [0.95, 0.3], [1, 0.36]]) gr.addColorStop(u, gv(v * (1 - dark)));
    g.beginPath(); g.arc(X, Y, R, 0, 2 * PI); g.fillStyle = gr; g.fill();
    const r = rng(77 + i);
    for (let n = 0; n < 96; n++) {
      const a = (n / 96) * 2 * PI + (r() - 0.5) * 0.05, r0 = R * (0.3 + r() * 0.12), r1 = R * (0.78 + r() * 0.17);
      ribbon(g, [[X + Math.cos(a) * r0, Y + Math.sin(a) * r0], [X + Math.cos(a) * r1, Y + Math.sin(a) * r1]], (u) => (0.35 + 0.9 * u) * (0.9 + r() * 0.5) * Math.min(1, (1 - u) / 0.15 + 0.3), ink(0.22 + r() * 0.2));
    }
    g.beginPath(); g.arc(X, Y, R - 1.2, 0, 2 * PI); g.lineWidth = 2.4; g.strokeStyle = ink(0.78); g.stroke();
    g.beginPath(); g.arc(X, Y, P, 0, 2 * PI); g.fillStyle = INK; g.fill();
    // the lid's shadow on the top of the iris
    ribbon(g, sampleCurve(E.up, 8).map(([a, b]) => [a, b + 2.5]), P_SWELL(5, 0.4), ink(0.22));
  });
}
// the 219 in-between (source: a new drawing): one dark iris ~1.25x, smeared ~16 px along x, a catchlight upper-left,
// the upper lids lowered halfway toward the look (drawn over the stare layer)
export function paintSnapIris(g, E, dx, i) {
  // fix pass 2 (review low): the source's 219 is a smeared dark iris (~1.2x, value ~0.3, smeared ~14 px along +x) with a
  // white catchlight upper-left, under the unchanged stare lids
  const x = E.iris[0] + dx + 4, y = E.iris[1] + 2, R = E.iris[2] * 1.2;
  withClip(g, WHITES[i][0], () => {
    for (let s = -7; s <= 7; s += 1.75) { g.globalAlpha = 0.22; g.beginPath(); g.arc(x + s, y, R, 0, 2 * PI); g.fillStyle = gv(0.42); g.fill(); }
    g.globalAlpha = 1;
    g.beginPath(); g.ellipse(x, y, R + 3, R, 0, 0, 2 * PI); g.fillStyle = gv(0.46, 0.75); g.fill();
    g.beginPath(); g.ellipse(x, y, R + 2, R - 1, 0, 0, 2 * PI); g.lineWidth = 3; g.strokeStyle = gv(0.25, 0.7); g.stroke();
    g.beginPath(); g.ellipse(x + 3, y + 1, 7, 6, 0, 0, 2 * PI); g.fillStyle = gv(0.08, 0.9); g.fill();
    g.beginPath(); g.ellipse(x - R * 0.45, y - R * 0.4, 9, 7, 0, 0, 2 * PI); g.fillStyle = gv(0.9, 0.5); g.fill();
    g.beginPath(); g.ellipse(x - R * 0.45, y - R * 0.4, 5, 4, 0, 0, 2 * PI); g.fillStyle = gv(0.97); g.fill();
    // the lid's shadow on the top of the iris, as in the stare
    ribbon(g, sampleCurve(E.up, 8).map(([a, b]) => [a, b + 2.5]), P_SWELL(5, 0.4), ink(0.22));
  });
}
// the look: the iris swung into the inner corner, its top under the lowered lid, a pale catchlight crescent upper-left
function paintLookIris(g, E, i) {
  const [x, y, R] = E.lookIris, [px, py, pr] = E.lookPupil;
  withClip(g, WHITES[i][1], () => {
    const gr = g.createRadialGradient(px, py, pr, x, y, R);
    for (const [u, v] of [[0, 0.82], [0.25, 0.8], [0.45, 0.62], [0.6, 0.5], [0.8, 0.46], [0.92, 0.36], [1, 0.3]]) gr.addColorStop(u, gv(v));
    g.beginPath(); g.arc(x, y, R, 0, 2 * PI); g.fillStyle = gr; g.fill();
    const r = rng(88 + i);
    for (let k = 0; k < 90; k++) {
      const a = (k / 90) * 2 * PI + (r() - 0.5) * 0.05, r0 = pr + 1.5 + r() * 3, r1 = R * (0.8 + r() * 0.17);
      ribbon(g, [[px + Math.cos(a) * r0, py + Math.sin(a) * r0], [px + Math.cos(a) * r1, py + Math.sin(a) * r1]], (u) => (0.35 + 0.9 * u) * (0.9 + r() * 0.5) * Math.min(1, (1 - u) / 0.15 + 0.3), ink(0.25 + r() * 0.25));
    }
    // catchlight: a pale crescent inside the upper-left of the iris
    fillPath(g, blob([[x - R * 0.93, y - R * 0.2], [x - R * 0.7, y - R * 0.72], [x - R * 0.25, y - R * 0.95], [x - R * 0.2, y - R * 0.72], [x - R * 0.55, y - R * 0.45], [x - R * 0.78, y - R * 0.05]], 0.45), gv(0.9, 0.85));
    g.beginPath(); g.arc(x, y, R - 1.6, 0, 2 * PI); g.lineWidth = 3.0; g.strokeStyle = ink(0.85); g.stroke();
    g.beginPath(); g.ellipse(px, py, pr, pr * 1.08, 0, 0, 2 * PI); g.fillStyle = INK; g.fill();
    ribbon(g, sampleCurve(E.lookUp, 8).map(([a, b]) => [a, b + 3]), P_SWELL(7, 0.3), ink(0.4));
    // fix pass 2 (review low): the small white catchlight at the upper left of the iris (5-7 px)
    g.beginPath(); g.ellipse(x - R * 0.38, y - R * 0.32, 5.5, 4.8, 0, 0, 2 * PI); g.fillStyle = gv(0.97); g.fill();
  });
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
  { R: [[860, 104], [905, 97]], T: [[845, 262], [884, 250]], n: 2, w: [4, 6], bend: [-0.02, -0.01], tj: 0.1, seed: 209, ink: true },
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
  // the central lock (fix pass 2, review medium: it was a broad solid fan, 36 % black on the forehead strip vs 14 %).
  // Dark-run scans of the source rows (f152) give its structure: a main bundle 26-47 px wide on the centreline
  // x 1018 (y 160) -> 1016 (200) -> 1008 (250) -> 1000 (300) -> 976 (350) -> 948 (400); a right-hand group rooted
  // 1060-1105 that sweeps in and merges with it by y ~300; thin separate strands 2-10 px across 945-1000 at the top
  {
    const rl = rng(262);
    const along = (C, o, wOf) => { const q = sampleCurve(C, 10), n = q.length, out = [];
      for (let i = 0; i < n; i++) { const a2 = q[Math.max(0, i - 1)], b2 = q[Math.min(n - 1, i + 1)], dx = b2[0] - a2[0], dy = b2[1] - a2[1], L = Math.hypot(dx, dy) || 1, u = i / (n - 1); out.push([q[i][0] - dy / L * o * wOf(u), q[i][1] + dx / L * o * wOf(u)]); }
      return out; };
    const MAIN = [[1020, 91], [1018, 160], [1016, 200], [1008, 250], [999, 300], [976, 350], [949, 400], [936, 446]];
    const mw = (u) => 1 - 0.55 * u;
    // the bundle's solid core (the source's dark runs: 26 px at y 200, 47 px at y 300, 29 px at y 350, 12 px at y 400)
    { const HW = [[0, 12], [0.14, 13], [0.28, 13], [0.43, 17], [0.57, 23], [0.71, 14], [0.86, 6], [1, 0.5]];
      const hw = (u) => { for (let i = 1; i < HW.length; i++) if (u <= HW[i][0]) { const t = (u - HW[i - 1][0]) / (HW[i][0] - HW[i - 1][0]); return HW[i - 1][1] + (HW[i][1] - HW[i - 1][1]) * t; } return 0.5; };
      const L = along(MAIN, 1, (u) => hw(u)), R = along(MAIN, -1, (u) => hw(u)).map(([x, y]) => [x + 3, y]);
      fillPath(g, poly(L.concat(R.reverse())), INK); }
    for (const [o, w, sh] of [[-15, 14, 1], [-6, 16, 0.97], [3, 15, 1], [12, 14, 0.9], [19, 11, 0.8]]) {
      const q = along(MAIN, o + (rl() - 0.5) * 3, mw), n = q.length;
      ribbon(g, q.slice(0, Math.max(3, Math.round(n * sh))), P_HANG(w + rl() * 2, 0.04, 0.55), INK);
    }
    const RG = [[1088, 91], [1084, 160], [1070, 205], [1044, 252], [1018, 292], [1004, 322]];
    for (const [o, w] of [[-12, 11], [-4, 12], [5, 11], [13, 9]]) ribbon(g, along(RG, o, (u) => 1 - 0.6 * u), P_HANG(w + rl() * 2, 0.04, 1.0), INK);
    // thin strands across the top joining the bundle lower down
    for (let k = 0; k < 7; k++) {
      const x0 = 948 + k * 8 + (rl() - 0.5) * 4, yj = 230 + rl() * 70, C = [[x0, 93], [x0 + 2, 160], [x0 + 6 + k * 2, 200], [1004 - (yj - 250) * 0.3, yj]];
      ribbon(g, sampleCurve(C, 10), P_HANG(2.5 + rl() * 4, 0.05, 0.9), INK);
    }
    for (let k = 0; k < 5; k++) {
      const x0 = 1030 + k * 8 + (rl() - 0.5) * 3, C = [[x0, 90], [x0 + 1, 150], [x0 - 4 - k, 205], [1030 - k * 3, 250 + rl() * 20]];
      ribbon(g, sampleCurve(C, 10), P_HANG(3 + rl() * 4, 0.05, 0.9), INK);
    }
    // white partings along the bundle
    for (let k = 0; k < 5; k++) {
      const q = along(MAIN, -12 + k * 7 + (rl() - 0.5) * 2, mw), n = q.length;
      ribbon(g, q.slice(Math.floor(n * (0.04 + rl() * 0.1)), Math.floor(n * (0.3 + rl() * 0.15))), P_TIP2(1.2 + rl() * 1.2, 0.3, 0.4), gv(0.92, 0.9));
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
    // fix pass 2 (review medium: the side masses read as solid blocks, 4-6 points blacker than the source): more fine
    // white strand gaps in the lower side hair (y ~480-720), following the side locks' flow
    const r2 = rng(252);
    for (const Z of HAIR_ZONES.filter((z) => z.seed === 205 || z.seed === 206)) for (const s of zoneStrands({ ...Z, n: 70, seed: Z.seed + 90 })) {
      if (r2() > 0.3) continue;
      const q = s.q, n = q.length, a0 = Math.floor((0.4 + r2() * 0.3) * n), a1 = Math.min(n, Math.floor((0.8 + r2() * 0.2) * n)), side = (r2() - 0.5) * 16;
      const pts = [];
      for (let i = a0; i < a1; i++) { const p = q[i], nx = q[Math.min(n - 1, i + 1)], pv = q[Math.max(0, i - 1)], dx = nx[0] - pv[0], dy = nx[1] - pv[1], d = Math.hypot(dx, dy) || 1; pts.push([p[0] - dy / d * side, p[1] + dx / d * side]); }
      if (pts.length > 3) ribbon(g, pts, P_TIP2(0.9 + r2() * 1.3, 0.3, 0.4), gv(0.88, 0.9));
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

// resample a polyline by arc length: n+1 points
function arcPts(Q, n) {
  const d = [0]; for (let i = 1; i < Q.length; i++) d.push(d[i - 1] + Math.hypot(Q[i][0] - Q[i - 1][0], Q[i][1] - Q[i - 1][1]));
  const out = [], L = d[d.length - 1];
  for (let k = 0, j = 0; k <= n; k++) {
    const s = (k / n) * L; while (j < d.length - 2 && d[j + 1] < s) j++;
    const t = (s - d[j]) / Math.max(1e-6, d[j + 1] - d[j]); out.push([Q[j][0] + (Q[j + 1][0] - Q[j][0]) * t, Q[j][1] + (Q[j + 1][1] - Q[j][1]) * t]);
  }
  return out;
}
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
// beanie values (fix pass 2): an even mid-grey knit; the soft (pan) layer's crown a touch darker than the stare's
const BEANIE_V = { cuff: 0.66, crown: 0.69 };
// Fix pass 2 (review high #1): the knit redrawn. The cuff is a rib knit read off 2.5-3x crops of the stare (f152):
// dark rib lines ~18 px apart at the centre (bowing slightly, closing up toward the far sides), short horizontal course
// hatches inside each rib (faint in the middle, strong at the sides), the far sides wrapped in courses running parallel
// to the lower edge plus a 45 deg cross-hatch. The crown (pans) is an even mid grey with soft vertical ribs converging to
// the top and a band of darker scribble along the top rim. The cuff region now runs right out to the beanie outline (the
// first pass left a pale sliver between the outline and the cuff: the "rim glow"). No gradients, no tone blobs.
function paintBeanie(g) {
  const bp = poly(BEANIE);
  // the fold's ends pushed out to the (widened) outline so the cuff and crown regions meet the silhouette
  const FOLDX = [[548, 78], [566, 62], ...FOLD.slice(1, -1), [1508, 98], [1530, 112]];
  const below = (gg) => { const q = sampleCurve(FOLDX, 6); gg.moveTo(q[0][0], q[0][1]); for (const p of q) gg.lineTo(p[0], p[1]); gg.lineTo(1600, 420); gg.lineTo(480, 420); gg.closePath(); };
  const above = (gg) => { const q = sampleCurve(FOLDX, 6); gg.moveTo(q[0][0], q[0][1]); for (const p of q) gg.lineTo(p[0], p[1]); gg.lineTo(1600, -420); gg.lineTo(480, -420); gg.closePath(); };
  const side = (x) => smoothstep(0.55, 0.95, Math.abs(x - 1040) / 470);   // 0 across the middle, 1 at the far sides
  // ---- crown (seen in the pans)
  withClip(g, bp, () => withClip(g, above, () => {
    // the light falls off toward the far sides of the crown (source row profiles at f312 / f464: ~125 in the middle,
    // ~90 at 40 % of the half-width, ~50 near the outline): an even value across the middle, darkening to the sides and
    // not brighter at the top (the first pass's radial glow sat high and read as a bright top)
    { const c0 = SOFT ? BEANIE_V.crown - 0.04 : BEANIE_V.crown;
      g.save(); g.translate(1040, -40); g.scale(1, 0.8);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 520);
      for (const [u, k] of [[0, 1.0], [0.3, 0.96], [0.45, 0.8], [0.6, 0.58], [0.75, 0.4], [0.88, 0.27], [1, 0.18]]) gr.addColorStop(u, gv(c0 * k));
      g.fillStyle = gr; g.fillRect(-560, -500, 1120, 700); g.restore(); }
    const r = rng(63);
    // soft vertical ribs converging on the top: a darker valley and a paler ridge beside it, ~14 px apart
    const NR = 72;
    for (let k = 0; k <= NR; k++) {
      const u = k / NR, x = 552 + u * 970, xm = 1040 + (x - 1040) * 0.6;
      const q = sampleCurve([[x, 140], [x + (xm - x) * 0.3, -120], [xm, -372]].map(([a, b2]) => [a + noise1(k * 1.7, 64) * 3, b2]), 12);
      ribbon(g, q, P_TIP2(2.4 + r() * 1.2, 0.05, 0.08), ink(0.22 + 0.12 * side(x) + r() * 0.08));
      ribbon(g, q.map(([a, b2]) => [a + 5, b2]), P_TIP2(1.6 + r() * 0.8, 0.05, 0.08), gv(0.9, 0.12 + r() * 0.06));
    }
    // courses: faint short horizontal strokes across the ribs (the knit rows)
    for (let i = 0; i < 1400; i++) {
      const x = 560 + r() * 960, y = -360 + r() * 440;
      if (r() > 0.35 + 0.6 * side(x)) continue;
      const L = 5 + r() * 7, a = (x - 1040) * 0.0004 + (r() - 0.5) * 0.15;
      ribbon(g, [[x, y], [x + Math.cos(a) * L, y + Math.sin(a) * L]], P_TIP2(1.4 + r() * 0.8, 0.3, 0.3), ink(0.18 + 0.2 * side(x) + r() * 0.1));
    }
    // the top rim: a band of darker scribbled strokes following the outline (heaviest top-left), and the far sides
    const TOP = sampleCurve(CROWN.filter((p) => p[1] < 60), 8);
    for (let i = 0; i < TOP.length - 1; i += 1) {
      const p = TOP[i], q = TOP[i + 1], dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1, nx = dy / L, ny = -dx / L;   // outward normal (clockwise path)
      const heavy = 0.35 + 0.65 * smoothstep(1300, 700, p[0]);
      for (let k = 0; k < 2; k++) {
        if (r() > 0.55 * heavy + 0.2) continue;
        const d = 3 + r() * 34 * heavy, a = Math.atan2(dy, dx) + (r() - 0.5) * 0.5, len = 10 + r() * 22;
        const cx = p[0] - nx * d, cy = p[1] - ny * d;
        ribbon(g, [[cx - Math.cos(a) * len / 2, cy - Math.sin(a) * len / 2], [cx, cy + (r() - 0.5) * 2], [cx + Math.cos(a) * len / 2, cy + Math.sin(a) * len / 2]], P_TIP2(1.6 + r() * 1.6, 0.25, 0.25), ink(0.3 + r() * 0.3));
      }
    }
  }));
  // ---- cuff: a curvilinear grid between the fold (v 0) and the lower edge (v 1)
  withClip(g, bp, () => withClip(g, below, () => {
    // the same fall-off across the cuff (source row profile at f152: ~139 in the middle, ~123 at t 0.55, ~95 at t 0.8,
    // ~50 at the outline)
    // (the pans' soft layer falls off harder: f464 row profile ~50 % of the middle at t 0.7)
    { const c0 = SOFT ? BEANIE_V.cuff - 0.03 : BEANIE_V.cuff, gr = g.createLinearGradient(560, 0, 1520, 0);
      const K = SOFT ? [[0, 1.0], [0.45, 0.95], [0.6, 0.8], [0.7, 0.6], [0.8, 0.42], [1, 0.3]] : [[0, 1.0], [0.5, 0.97], [0.72, 0.9], [0.83, 0.8], [0.94, 0.62], [1, 0.5]];
      for (let i = K.length - 1; i >= 0; i--) gr.addColorStop(0.5 - K[i][0] / 2, gv(c0 * K[i][1]));
      for (let i = 1; i < K.length; i++) gr.addColorStop(0.5 + K[i][0] / 2, gv(c0 * K[i][1]));
      g.fillStyle = gr; g.fillRect(520, -200, 1040, 560); }
    const r = rng(61), M = 400;
    const TOPq = arcPts(sampleCurve(FOLDX.slice(1, -1), 8), M), LOWq = arcPts(sampleCurve(CUFF_LOW, 8), M);
    const P = (u, v) => { const f = Math.max(0, Math.min(1, u)) * M, i = Math.min(M - 1, Math.floor(f)), t = f - i; const a = lerp2(TOPq[i], TOPq[i + 1], t), b = lerp2(LOWq[i], LOWq[i + 1], t); return lerp2(a, b, v); };
    // rib positions: mild foreshortening toward the far sides (centre spacing ~18 px on the lower edge, ~10 px at the sides)
    const A = 0.45, N = 64, um = (w) => 0.5 + Math.sin((w - 0.5) * PI * A) / (2 * Math.sin(PI * A / 2));
    const U = []; for (let k = 0; k <= N; k++) U.push(um(k / N));
    const bow = (u, v) => (u - 0.5) * 12 * Math.sin(PI * v);
    const ribPts = (k, v0 = 0, v1 = 1) => { const q = []; for (let j = 0; j <= 14; j++) { const v = v0 + (v1 - v0) * j / 14, p = P(U[k], v); q.push([p[0] + bow(U[k], v) + noise1(k * 0.9 + v * 3.1, 67) * 1.6, p[1]]); } return q; };
    // courses: short strokes inside each rib cell, leaving from its left rib; spaced ~9 px along the rib
    for (let k = 0; k < N; k++) {
      const x = P(U[k], 0.5)[0], sd = side(x);
      const a0 = P(U[k], 0), a1 = P(U[k], 1), len = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]), nC = Math.max(4, Math.round(len / 9));
      const ph = r();
      for (let j = 0; j < nC; j++) {
        if (r() > 0.28 + 0.72 * sd) continue;
        const v = (j + ph) / nC, p = P(U[k], v), q = P(U[k + 1], v), bp0 = bow(U[k], v), bq0 = bow(U[k + 1], v);
        const s0 = [p[0] + bp0 + 2, p[1]], s1 = [q[0] + bq0 - 1, q[1]], t0 = 0.05 + r() * 0.1, t1 = 0.6 + r() * 0.35;
        ribbon(g, [lerp2(s0, s1, t0), lerp2(s0, s1, (t0 + t1) / 2), lerp2(s0, s1, t1)].map(([a, b2], m) => [a, b2 + (m === 1 ? 1 : 0)]), P_TIP2(1.5 + r() * 1.0 + sd, 0.25, 0.3), ink(0.26 + 0.5 * sd + r() * 0.14));
      }
    }
    // the ribs: dark lines with a pale ridge to their right
    for (let k = 0; k <= N; k++) {
      const q = sampleCurve(ribPts(k), 3), x = q[q.length >> 1][0], sd = side(x);
      ribbon(g, q, P_SWELL(2.3 + r() * 0.9 + 0.8 * sd, 0.55, 0.5), ink(0.78 + 0.17 * sd + r() * 0.05));
      if (sd < 0.8) ribbon(g, q.map(([a, b2]) => [a + 3.2, b2]), P_SWELL(1.3, 0.4), gv(0.86, 0.22 * (1 - sd)));
    }
    // the far sides: courses running parallel to the lower edge, and a 45 deg cross-hatch deepening to the silhouette
    for (let j = 1; j <= 12; j++) {
      const v = 1 - j * 0.035;
      for (const [u0, u1] of [[0, 0.2], [0.8, 1]]) {
        const q = []; for (let m = 0; m <= 20; m++) { const u = u0 + (u1 - u0) * m / 20, p = P(u, v); q.push([p[0] + bow(u, v), p[1]]); }
        const fade = (m) => (u0 === 0 ? 1 - m : m);
        ribbon(g, q, (m) => (1.3 + 1.2 * r()) * Math.max(0, Math.min(1, fade(m) * 1.6 - 0.1)), ink(0.6 + r() * 0.25));
      }
    }
    for (const [ang, sp, sd0] of [[PI / 4, 7.5, 1], [-PI / 4, 8.5, 2]]) {
      hatch(g, null, [540, -140, 1530, 330], {
        sp, seed: 610 + sd0, dens: (x, y) => (SOFT ? 0.5 : 0.32) * smoothstep(0.7, 0.98, Math.abs(x - 1040) / 470),
        ang: (x) => (x < 1040 ? ang : PI - ang), len: (x, y, rr) => 10 + rr() * 16, wid: (x, y, rr) => 1.2 + rr() * 0.9, color: ink(0.72),
      });
    }
  }));
  // the fold: a heavy dark line with the cuff's lit edge just under it; outline and lower edge
  pen(g, FOLD, 7, INK, P_SWELL(7, 0.45));
  ribbon(g, sampleCurve(FOLD, 8).map(([a, b2]) => [a, b2 + 6]), P_SWELL(2.0, 0.3), gv(0.82, 0.45));
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
  // ferrule + eraser (source 5x crop, zfer): a metal band 1317-1352 (a rolled rim at its left end, two ribs at 1340 /
  // 1347), shaded as a cylinder (bright upper third, dark lower edge, a few dark smudges), then the eraser 1352-1395 with
  // a rounded end, grey, lighter on top; dark outlines
  const fer = (gg) => { gg.moveTo(1317, 709); gg.quadraticCurveTo(1334, 706, 1352, 708); gg.lineTo(1352, 747); gg.quadraticCurveTo(1334, 749, 1317, 747); gg.quadraticCurveTo(1312, 728, 1317, 709); gg.closePath(); };
  const cyl = (gg, x0, x1, stops) => { const gr = gg.createLinearGradient(0, 707, 0, 749); for (const [u, v] of stops) gr.addColorStop(u, gv(v)); gg.fillStyle = gr; gg.fillRect(x0, 700, x1 - x0, 56); };
  withClip(g, fer, () => {
    cyl(g, 1305, 1356, [[0, 0.4], [0.1, 0.88], [0.3, 0.96], [0.45, 0.78], [0.62, 0.6], [0.8, 0.7], [0.92, 0.5], [1, 0.3]]);
    const rf = rng(72);
    for (let i = 0; i < 9; i++) { const x = 1322 + rf() * 26, y = 716 + rf() * 26; g.beginPath(); g.ellipse(x, y, 2 + rf() * 3, 3 + rf() * 5, 0, 0, 2 * PI); g.fillStyle = gv(0.25, 0.5); g.fill(); }
    for (const x of [1340, 1347]) pen(g, [[x, 708], [x + 1, 728], [x, 748]], 1.8, ink(0.85));
    pen(g, [[1324, 709], [1322, 728], [1324, 747]], 1.4, ink(0.6));
  });
  g.beginPath(); fer(g); g.lineWidth = 2.2; g.strokeStyle = INK; g.stroke();
  const er = (gg) => { gg.moveTo(1352, 713); gg.lineTo(1383, 713); gg.quadraticCurveTo(1394, 715, 1395, 729); gg.quadraticCurveTo(1394, 743, 1383, 745); gg.lineTo(1352, 745); gg.closePath(); };
  withClip(g, er, () => cyl(g, 1350, 1398, [[0, 0.5], [0.12, 0.82], [0.35, 0.72], [0.6, 0.55], [0.85, 0.45], [1, 0.3]]));
  g.beginPath(); er(g); g.lineWidth = 2.2; g.strokeStyle = INK; g.stroke();
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
  // brows (source 3.5x crops zbrowL / zbrowR): bands of fine grey hairs lying along the brow toward its outer end
  // (fix pass 1: 8 px lower, nearer level; the source's brows sit at y ~200-230 on the 2x crop eyes152)
  browHair(g, [[944, 232], [918, 219], [890, 210], [860, 202], [830, 198], [795, 197]], 22, 81);
  browHair(g, [[1114, 234], [1140, 220], [1175, 210], [1210, 204], [1245, 199], [1272, 196]], 23, 82);
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
    // (globalThis.__S02TONE: a scratch-lab override of the tone lists, used only while refitting them; the film never sets it)
    const OV = globalThis.__S02TONE;
    // fix pass 2: no fitted tone over the beanie (the blobs read as mottled patches on the knit; CROWN_TONE is no longer
    // applied) and inside the face oval the corrections may only lighten (they airbrushed grey smudges onto the face)
    if (!globalThis.__NOTONE) { const T = OV ? (soft ? OV.soft : OV.des) : (soft ? SOFT_TONE : DES_TONE); if (T.length) applyTone(c, 0, -DY, T, { exclude: [{ path: poly(BEANIE), feather: 10, mode: "all" }, { path: poly(FACE_OVAL), feather: 16, mode: "all" }] }); }
    out[key] = c;
  }
  SOFT = false;
  return out;
}
// a brow as hair: spine from the inner end to the outer end; each hair starts low in the band and lies along the brow
// (tilted ~0.3 rad up), longest and darkest along the lower edge, the band thinning to the outer end
function browHair(g, spine, w, seed) {
  const q = sampleCurve(spine, 12), n = q.length, r = rng(seed);
  const tang = (i) => { const a = q[Math.max(0, i - 2)], b = q[Math.min(n - 1, i + 2)]; return Math.atan2(b[1] - a[1], b[0] - a[0]); };
  const sd = spine[spine.length - 1][0] > spine[0][0] ? 1 : -1;          // +1: the outer end is to the right
  for (let k = 0; k < 400; k++) {
    const u = Math.pow(r(), 0.85), i = Math.min(n - 1, Math.round(u * (n - 1))), p = q[i], t = tang(i);
    const wid = w * (u < 0.15 ? 0.55 + 3 * u : 1 - 0.75 * Math.pow(Math.max(0, u - 0.35) / 0.65, 1.2));
    const v = (r() - 0.35) * wid;                                          // across the band (+ = lower edge)
    const c = Math.cos(t) > 0 ? 1 : -1, nx = -Math.sin(t) * c, ny = Math.cos(t) * c;   // normal pointing down
    const x = p[0] + nx * v, y = p[1] + ny * v;
    const a = t - sd * (0.16 + r() * 0.14), L = 12 + r() * 12 * (1 - 0.4 * u);
    const lowEdge = v > wid * 0.2;
    ribbon(g, [[x, y], [x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.5 - 0.8], [x + Math.cos(a) * L, y + Math.sin(a) * L]], P_TIP2(1.5 + r() * 1.1, 0.25, 0.55), ink((lowEdge ? 0.8 : 0.6) + r() * 0.2));
  }
}
