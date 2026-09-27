// s16 room: the designer at his desk seen straight on (the steady framing of 46.08–47.48), with the laptop, mug,
// books and cables. Drawn as an engraving plate (src/lib/engrave.js, s16's copy in ./engrave16.js):
//   - value study: outlines of the light measured on the source blurred (./data/room.js LEVELS), painted as soft grey
//     regions; the engraver cuts white lines whose width follows that value; ./data/roomfix.js corrects it where this
//     pass changed the drawing (light matching)
//   - hatch direction per region (DIRS), measured as the source's dominant stroke direction; classes set the line
//     spacing and style (hair sparser, the laptop lid flat); the knit T-shirt is a mesh (style 6)
//   - the drawing's major ink lines on top (DARK on lit areas, PALE on dark ones): centre-lines measured on the
//     source with the s12 method and redrawn as tapered strokes (those along the desk front and inside the T-shirt
//     are left out: the desk and the mesh draw them)
// Drawn over the engraving (this pass): the desk plank (./data/desk.js: its light, its grain traced column by column,
// open where the cables cross), the mug (authored from measured outline and tone), the laptop lid's bright rim, the
// headphone cups round his neck (./data/cel.js, fine cel levels), and the crisp details (logo dot, sweat drops,
// stubble, mug handles). His irises are drawn per frame (./eyes.js).
// Coordinates are frame px of the steady framing; the plate reaches M px past every edge (camera jolt, pull-back).
import { W, H } from "../../config.js";
import { grey } from "../../lib/engrave.js";
import { engraveCanvases, rasterRegions, dirRGB } from "./engrave16.js";
import { taper } from "../../lib/ink.js";
import { sampleCurve, smoothPath } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";
import { LEVELS, DIRS, DARK as DARK0, PALE as PALE0 } from "./data/room.js";
import { PLANK, GX0, GY0, BASE, GRAIN, UNDER, CUT } from "./data/desk.js";
import { FIX } from "./data/roomfix.js";
import { CEL } from "./data/cel.js";
import { MX0, MY0, MUGG } from "./data/mug.js";
import { SX0, SY0, SC, SHIRTG } from "./data/shirt.js";
import { HAIRZ, HAIRS } from "./data/hair.js";
import { drawLids } from "./eyes.js";

// the desk front is drawn by paintDesk (its grain traced column by column, ./trace/desk.py): the room's traced
// lines that run along it are left out here (the cables that cross it stay)
const inDesk = (s) => {
  const n = s.length / 4, a = 0, b = (n - 1) * 4;
  let my = 0; for (let i = 1; i < s.length; i += 4) my += s[i]; my /= n;
  const dx = Math.abs(s[b] - s[a]), dy = Math.abs(s[b + 1] - s[a + 1]);
  return my > 844 && s[a] > 590 && s[b] > 590 && dy < 0.35 * Math.max(dx, 1);
};
// his knit T-shirt (the dark mesh between the headphones and down the right of the laptop), outline read off a 3x grid
// of 47.00: engraved as a mesh (engrave16 style 6); the traced lines inside it (a tangle of mesh fragments) are left out
export const TSHIRT = [[1362, 648], [1362, 606], [1385, 611], [1410, 614], [1440, 610], [1465, 603], [1490, 602], [1512, 608], [1528, 625],
  [1534, 660], [1540, 700], [1550, 760], [1560, 810], [1566, 846], [1520, 846], [1453, 657], [1446, 650]];
function inPoly(x, y, P) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i], [xj, yj] = P[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const midIn = (s, P) => {
  const k = 4 * Math.floor(s.length / 8);
  let L = 0; for (let i = 4; i < s.length; i += 4) L += Math.hypot(s[i] - s[i - 4], s[i + 1] - s[i - 3]);
  return L < 120 && inPoly(s[k], s[k + 1], P);          // long lines (the laptop's rim) stay
};
// the beanie's outline (read off a 2x grid of 47.00; the crown runs out of the frame)
export const BEANIE = [[1210, 200], [1196, 205], [1190, 170], [1193, 130], [1203, 100], [1208, 80], [1209, 60], [1212, 40], [1216, 20], [1227, 0], [1240, -40],
  [1570, -40], [1580, 0], [1591, 20], [1603, 40], [1601, 60], [1597, 80], [1606, 100], [1612, 120], [1618, 160], [1616, 195], [1604, 205],
  [1585, 178], [1560, 140], [1530, 118], [1500, 107], [1450, 103], [1400, 102], [1350, 104], [1300, 111], [1275, 128], [1250, 150], [1228, 175]];
// the beanie's brim band and its lower left corner (fix 1): vertical ribs there (the measured directions had a
// horizontal strip along the brim and none at the corner, which engraved as a comb)
const BRIM_EDGE = [[1616, 200], [1604, 205], [1585, 178], [1560, 140], [1530, 118], [1500, 107], [1450, 103], [1400, 102], [1350, 104],
  [1300, 111], [1275, 128], [1250, 150], [1228, 175], [1210, 200], [1196, 205]];
const BRIM = BRIM_EDGE.concat([[1188, 170], [1190, 120], [1215, 110], [1240, 118]],
  BRIM_EDGE.slice(4, 12).reverse().map(([x, y]) => [x, y - 16]), [[1575, 128], [1600, 160], [1612, 185]]);
// traced fragments dropped by hand (fix 1; indices into data/room.js): the zig-zag and the tangle crossing the knit
// T-shirt by the lapel, the short fragment strokes on the lapel, the grey bar along the beanie's brim (PALE 72) and the
// white bar at the chin (PALE 99), and the long pale line along the beanie's fold (PALE 45: over the ribs it printed as a dotted zipper)
// fix 2: his eye sockets and bags (from the crease to below the bag, read off 6x grids of 1175): flat tone there (the
// engraved line field printed as vertical pinstripes), and the traced lid / bag fragments inside them are left out
// (the lids are authored in ./eyes.js); near-vertical strokes (hair strands crossing the eyes) stay
const EYEZ = [[[1270, 214], [1276, 196], [1290, 186], [1320, 182], [1345, 184], [1362, 194], [1368, 214], [1364, 234], [1340, 241], [1300, 241], [1278, 232]],
  [[1446, 214], [1452, 194], [1470, 183], [1500, 180], [1525, 182], [1536, 192], [1538, 212], [1534, 232], [1510, 239], [1470, 239], [1450, 230]]];
const inEyes = (s) => {
  const n = s.length / 4, k = 4 * Math.floor(n / 2), dx = Math.abs(s[4 * (n - 1)] - s[0]), dy = Math.abs(s[4 * (n - 1) + 1] - s[1]);
  return EYEZ.some((Z) => inPoly(s[k], s[k + 1], Z)) && dy < 1.2 * Math.max(dx, 4);
};
// fix 2: the desk's right end (4x grids of 1175): the two cables hanging over the desk front and the pale block with
// its cord. Flat tone inside their boxes (the horizontal stroke field smeared them into a striped ladder and a grey
// blob); the cables' traced fragments are left out and the cables authored on top (paintProps)
const PROPZ = [[[1962, 834], [2016, 834], [2016, 912], [1962, 912]], [[1962, 782], [2162, 782], [2162, 842], [2016, 842], [2016, 812], [1962, 812]]];
const inProps = (s) => { const k = 4 * Math.floor(s.length / 8); return inPoly(s[k], s[k + 1], PROPZ[0]); };
const DROP_DARK = new Set([426, 518, 521, 533, 539, 546, 547, 561, 563, 568, 576, 580, 582, 585, 613, 624, 631, 645]);
const DROP_PALE = new Set([45, 72, 99, 151, 153, 155, 156, 158, 159, 161, 164, 166, 172, 173, 174, 179, 180]);
const DARK = DARK0.filter((s, i) => !DROP_DARK.has(i) && !inDesk(s) && !midIn(s, TSHIRT) && !inEyes(s) && !inProps(s)),
  PALE = PALE0.filter((s, i) => !DROP_PALE.has(i) && !inDesk(s) && !midIn(s, TSHIRT) && !inEyes(s) && !inProps(s));

export const M = 90;
// class -> engraving spacing scale (0..1 -> 0.55x..1.9x of the base spacing) and style (0 lines, 1 cross, 2 flat, 3 knit)
export const CLASSES = {
  0: { sp: 0.35, style: 0, k: 0.6 },   // default
  1: { sp: 0.62, style: 0, k: 0.35 },  // hair: sparse, faint strands (its bright strands are traced)
  2: { sp: 0.62, style: 0, k: 0.15 },  // beanie (its rib lines are traced; the cut lines only a faint knit)
  3: { sp: 0.35, style: 2, k: 1 },     // flat (laptop lid)
  4: { sp: 0.15, style: 0, k: 0.3 },   // skin: fine, faint lines (~3.3 px)
  5: { sp: 0.4, style: 0, k: 0.7 },    // desk grain
  6: { sp: 0.35, style: 0, k: 0.6 },   // shirt
  7: { sp: 0.35, style: 2, k: 1 },     // clean (the whites of his eyes)
  8: { sp: 0.18, style: 0, k: 0.75 },  // the mug's fine vertical hatching
  9: { sp: 0.2, style: 5, k: 1 },      // the mug's speckled shadow side
};
export const ENGRAVE = { spacing: 4.4, seed: 16, contrast: 1.0, ink: 1.06, flatLo: 0.84, flatHi: 0.94, stip: 1.0, blackLo: 0.02 };
export const TUNE = { blur: 1.2, soft: 0.6, darkW: 1.0, paleW: 1.0, darkDv: 0.0, paleDv: 0.0, grainW: 0.9, underV: -1, meshAng: 1.0, meshSp: 0.25, meshK: 1, celSoft: 0.45, ribSp: 0.2, ribK: 0, shirtC: 1.0, shirtWall: 0.45, collarW: 12, collarV: 0.1, plankDark: 0.4, plankLineV: 0.9, plankK: 0.85, shirtRot: 0.12, hairFlat: 1, hairW: 0.8, pgA: 0.15, pgK: 0, celPw: 0.7, celDw: 1.0, celLv: 2.5, beanieDir: 1 };

function ringsPath(g, item, from) {
  g.beginPath();
  for (let k = from; k < item.length; k++) {
    const r = item[k];
    g.moveTo(r[0], r[1]);
    for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1]);
    g.closePath();
  }
}

function blurCanvas(c, s) {
  if (s <= 0) return;
  const t = document.createElement("canvas"); t.width = c.width; t.height = c.height;
  const tg = t.getContext("2d");
  tg.filter = `blur(${s}px)`; tg.drawImage(c, 0, 0); tg.filter = "none";
  const g = c.getContext("2d");
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); g.drawImage(t, 0, 0); g.restore();
}

// One stroke in one tone (its darkest value for dark ink, brightest for pale); the width at each point is scaled so
// the ink mass matches the measurement, which tapers the paler ends; short end tapers.
export function drawStrokes(g, S, pale = false, { wk = 1, dv = 0, end = 4, wMin = 0.6 } = {}) {
  for (const s of S) {
    const n = s.length / 4;
    if (n < 2) continue;
    const pts = [], w = [], v = [];
    for (let i = 0; i < s.length; i += 4) { pts.push([s[i], s[i + 1]]); w.push(s[i + 2]); v.push(s[i + 3]); }
    let ve = pale ? 0 : 1;
    for (const x of v) ve = pale ? Math.max(ve, x) : Math.min(ve, x);
    ve = Math.max(0, Math.min(1, ve + dv));
    const wm = w.map((x, i) => pale ? x * v[i] / Math.max(0.05, ve) : x * (1 - v[i]) / Math.max(0.05, 1 - ve));
    const per = 4, q = sampleCurve(pts, per);
    const L = [0];
    for (let i = 1; i < q.length; i++) L.push(L[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
    const len = L[L.length - 1];
    const wAt = (i) => { const f = i / per, a = Math.min(n - 1, Math.floor(f)), b = Math.min(n - 1, a + 1), t = f - a; return wm[a] + (wm[b] - wm[a]) * t; };
    g.globalCompositeOperation = pale ? "lighten" : "darken";   // ink lines only ever darken / lighten
    taper(g, q, (u) => {
      const i = Math.round(u * (q.length - 1)), d = L[i];
      const e = Math.min(1, d / end, (len - d) / end);
      return Math.max(wMin, wAt(i) * wk) * (0.35 + 0.65 * Math.sqrt(Math.max(0, e)));
    }, grey(ve));
  }
  g.globalCompositeOperation = "source-over";
}

// light-matching corrections of the value study (./data/roomfix.js), bilinear over 16 px cells
function applyFix(valC) {
  if (!FIX.nx) return;
  const w = valC.width, h = valC.height, g = valC.getContext("2d");
  const img = g.getImageData(0, 0, w, h), d = img.data, { cell, nx, ny } = FIX, F = FIX.d;
  for (let y = 0; y < h; y++) {
    const fy = Math.max(0, Math.min(ny - 1.001, (y + 0.5) / cell - 0.5)), j = Math.floor(fy), ty = fy - j;
    for (let x = 0; x < w; x++) {
      const fx = Math.max(0, Math.min(nx - 1.001, (x + 0.5) / cell - 0.5)), i = Math.floor(fx), tx = fx - i;
      const a = F[j * nx + i], b = F[j * nx + i + 1], c = F[(j + 1) * nx + i], e = F[(j + 1) * nx + i + 1];
      if (!a && !b && !c && !e) continue;
      const dv = (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + e * tx) * ty;
      const k = 4 * (y * w + x), v = Math.max(0, Math.min(255, d[k] + dv * 255));
      d[k] = d[k + 1] = d[k + 2] = v;
    }
  }
  g.putImageData(img, 0, 0);
}

// the value study (value canvas) and the hatch directions (dir canvas, rasterised without anti-aliasing) of the
// room; both canvases have their origin at frame (-M, -M)
export function paintRoomMaps(valC, dirC) {
  const v = valC.getContext("2d");
  v.save(); v.setTransform(1, 0, 0, 1, M, M);
  for (const it of LEVELS) { ringsPath(v, it, 1); v.fillStyle = grey(it[0] / 1000); v.fill("evenodd"); }
  v.restore();
  applyFix(valC);
  const regions = DIRS.map((it) => {
    const c = CLASSES[it[1]] || CLASSES[0];
    return { rings: it.slice(2), rgb: dirRGB((it[0] * Math.PI) / 12, c.sp, c.style, c.k) };
  });
  regions.push({ rings: [TSHIRT.flat()], rgb: dirRGB(TUNE.meshAng, TUNE.meshSp, 6, TUNE.meshK) });
  // the loose hair on his right (fix 1): a flat dark ground (the cut lines read as blocky streaks there), the strands
  // drawn on top (HAIRS)
  if (TUNE.hairFlat) regions.push({ rings: [HAIRZ.flat()], rgb: dirRGB(Math.PI / 2, 0.35, 2, 1) });
  // fix 2: the eye sockets and bags as flat tone
  for (const Z of EYEZ) regions.push({ rings: [Z.flat()], rgb: dirRGB(0, 0.35, 2, 1) });
  regions.push({ rings: [PROPZ[0].flat()], rgb: dirRGB(0, 0.35, 2, 1) });
  // the block: engraved with vertical strokes (flat tone measured worse there: the value study is soft)
  regions.push({ rings: [PROPZ[1].flat()], rgb: dirRGB(Math.PI / 2, CLASSES[0].sp, 0, CLASSES[0].k) });
  // the beanie (fix 1): its ribs run vertically over the whole hat. The measured direction regions had a horizontal
  // strip along the brim (it engraved as a flat grey bar) and none at its lower left corner (a horizontal comb there)
  if (TUNE.ribK > 0) regions.push({ rings: [BEANIE.flat()], rgb: dirRGB(Math.PI / 2, TUNE.ribSp, 7, TUNE.ribK) });
  else if (TUNE.beanieDir) regions.push({ rings: [BRIM.flat()], rgb: dirRGB(Math.PI / 2, CLASSES[2].sp, CLASSES[2].style, CLASSES[2].k) });
  dirC.getContext("2d").putImageData(rasterRegions(dirC.width, dirC.height, regions, M, M), 0, 0);
}

// crisp authored details on top of the engraving (measured on 8x grids of 47.00): the lid's logo dot, the sweat
// drops (a grey U with its tail), the stubble on his chin and jaw (seeded short flecks)
const DROPS = [[1352.6, 136, 124], [1455.6, 139, 124], [1444, 262.4, 252], [1309, 314.8, 298], [1517, 310.5, 294], [1507, 359, 347]];
const STUBBLE = [[1318, 400], [1340, 402], [1362, 425], [1400, 440], [1440, 441], [1478, 425], [1500, 402], [1520, 398],
  [1512, 425], [1490, 452], [1445, 468], [1395, 467], [1350, 448], [1325, 425]];
// the laptop lid's bright rim along its top and down its right side (centre-line and width from column / row profiles
// of 47.00: 6.5 px at half height, 0.97; its left end fades in over 996-1044)
const RIM = [[997, 656.6], [1044, 655.6], [1100, 654.5], [1200, 652.8], [1300, 651.2], [1400, 649.8], [1422, 649.4], [1433, 650.6], [1440, 654],
  [1446, 664], [1462, 700], [1477, 750], [1496, 800], [1509.5, 840], [1511.5, 846]];
function paintRim(g) {
  g.save(); g.lineCap = "butt"; g.lineJoin = "round";
  const gr = g.createLinearGradient(996, 0, 1046, 0);
  gr.addColorStop(0, grey(0.55)); gr.addColorStop(1, grey(0.97));
  g.strokeStyle = gr; g.lineWidth = 6.4;
  g.beginPath(); smoothPath(g, RIM, false); g.stroke();
  g.restore();
}
function paintDetails(g) {
  paintRim(g);
  drawLids(g);
  g.fillStyle = "#f4f2ec";
  g.beginPath(); g.ellipse(1245, 765, 23.5, 24, 0, 0, Math.PI * 2); g.fill();
  g.save();
  g.lineCap = "round"; g.lineJoin = "round";
  for (const [x, yb, yt] of DROPS) {
    const h = yb - yt, hw = 2.7;
    g.strokeStyle = grey(0.42); g.lineWidth = 1.25;
    g.beginPath();
    g.moveTo(x + 0.3, yt);
    g.bezierCurveTo(x - 0.5, yt + h * 0.45, x - hw, yb - 4.5, x - hw, yb - 2.2);
    g.bezierCurveTo(x - hw, yb + 0.6, x + hw, yb + 0.6, x + hw, yb - 2.2);
    g.bezierCurveTo(x + hw, yb - 4.5, x + 1.2, yt + h * 0.45, x + 0.3, yt);
    g.stroke();
    g.fillStyle = "rgba(252,252,248,0.9)"; g.beginPath(); g.ellipse(x - 0.8, yb - 3.2, 0.9, 1.4, 0, 0, Math.PI * 2); g.fill();
  }
  drawMug(g);
  // stubble: short flecks, denser toward the jaw's lower edge
  g.beginPath(); g.moveTo(STUBBLE[0][0], STUBBLE[0][1]); for (const p of STUBBLE) g.lineTo(p[0], p[1]); g.closePath(); g.clip();
  const r = rng(1616);
  for (let i = 0; i < 900; i++) {
    const x = 1318 + r() * 202, y = 398 + r() * 72;
    const low = Math.max(0, Math.min(1, (y - 405) / 50));
    if (r() > 0.25 + 0.75 * low) continue;
    const a = Math.PI / 2 + (r() - 0.5) * 1.2, l = 1.2 + r() * 2.2;
    g.strokeStyle = grey(0.28 + 0.3 * r()); g.lineWidth = 0.7 + 0.5 * r();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  g.restore();
}

// the mug (authored; outline and tone measured on 3x crops and column means of 46.12, where nothing covers it):
// a slightly tapered white enamel cup, its left third in grey shadow with pale speckles in the glaze, the shadow
// breaking into short horizontal dry-brush dashes toward the lit side, a column of short dashes by the right edge,
// a pale rim line down the left side and round the top.
const MUG = [[733, 724], [748, 718], [765, 713.5], [790, 710.5], [830, 709.5], [855, 712], [873, 718], [866, 846], [800, 847.5], [741, 848]];
const MUG_V = [[731, 0.3], [735, 0.46], [740, 0.36], [748, 0.27], [756, 0.35], [764, 0.42], [772, 0.54], [780, 0.64], [788, 0.8],
  [796, 0.87], [806, 0.9], [816, 0.95], [832, 0.97], [846, 0.95], [852, 0.92], [860, 0.96], [866, 0.95], [870, 0.8]];  // fix 2: right edge +0.07
// inside the handle loops the source is black (the value study there carries a little glow the engraver would cut)
const LOOPS = [[[912, 758], [905, 752], [874, 752], [870, 834], [896, 831], [910, 812], [914, 780]],
  [[733, 745], [712, 750], [698, 764], [692, 786], [696, 808], [710, 826], [733, 836]],
  [[738, 846], [868, 843], [868, 850.5], [738, 850.5]], [[872, 740], [905, 740], [905, 752], [872, 752]],
  // above the rim (fix 1): the dark room (the plate's engraved glow there read as a jagged band)
  [[873.3, 719], [883, 719], [877, 846], [866.3, 846]], [[724, 727], [733.2, 725.5], [741.2, 848], [732, 848]],
  [[728, 724], [733, 712], [760, 704], [850, 703], [878, 711], [878, 719.5], [872, 718], [855, 712], [830, 709.5], [790, 710.5], [765, 713.5], [748, 718], [733, 724]]];
function mugV(x) {
  if (x <= MUG_V[0][0]) return MUG_V[0][1];
  for (let i = 1; i < MUG_V.length; i++) if (x <= MUG_V[i][0]) { const [a, va] = MUG_V[i - 1], [b, vb] = MUG_V[i]; return va + (vb - va) * (x - a) / (b - a); }
  return MUG_V[MUG_V.length - 1][1];
}
let MUGC = null;
function mugLayer() {
  if (MUGC) return MUGC;
  const c = document.createElement("canvas"); c.width = 200; c.height = 160;
  const g = c.getContext("2d");
  g.translate(-700, -700);
  g.beginPath(); g.moveTo(MUG[0][0], MUG[0][1]);
  for (let i = 1; i < MUG.length; i++) g.lineTo(MUG[i][0], MUG[i][1]);
  g.closePath(); g.clip();
  // the enamel's light: the measured tone grid (./data/mug.js), smoothly scaled up
  {
    const ny = MUGG.length, nx = MUGG[0].length, b = document.createElement("canvas"); b.width = nx; b.height = ny;
    const bg = b.getContext("2d"), img = bg.createImageData(nx, ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      // fix 1: the top two rows on the lit half are the white rim (the grid read the dark opening into them)
      let mv = j < 2 && MX0 + 4 * i >= 775 ? Math.max(MUGG[j][i], 0.92) : MUGG[j][i];
      if (mv > 0.8) mv = Math.min(0.99, mv + 0.05);   // fix 2: the lit enamel ~17 levels (graded) too dark on 1175
      const v = Math.round(Math.max(0, Math.min(1, mv)) * 255), k = 4 * (j * nx + i);
      img.data[k] = v * 0.949; img.data[k + 1] = v * 0.941; img.data[k + 2] = v * 0.918; img.data[k + 3] = 255;
    }
    bg.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    // upsampled, then blurred sigma 3 (the grid's cells showed as blocks and bands)
    const u = document.createElement("canvas"); u.width = nx * 4 + 16; u.height = ny * 10 + 16;
    const ug = u.getContext("2d"); ug.imageSmoothingEnabled = true; ug.imageSmoothingQuality = "high";
    ug.drawImage(b, 8, 8, nx * 4, ny * 10);
    ug.drawImage(b, 0, 0, 1, ny, 0, 8, 8, ny * 10); ug.drawImage(b, nx - 1, 0, 1, ny, nx * 4 + 8, 8, 8, ny * 10);
    g.filter = "blur(3px)"; g.drawImage(u, MX0 - 2 - 8, MY0 - 5 - 8); g.filter = "none";
  }
  const r = rng(1602);
  // pale speckles in the shadowed glaze (fine, soft)
  for (let i = 0; i < 3200; i++) {
    const x = 736 + r() * 58, y = 712 + r() * 134, d = 1 - mugV(x);
    if (r() > d * 1.4 - 0.15 || r() < 0.4) continue;
    const rad = 0.35 + r() * 0.45;
    g.fillStyle = grey(Math.min(0.9, mugV(x) + 0.12 + 0.28 * r()));
    g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  }
  // dry-brush dashes where the shadow breaks up toward the light
  g.lineCap = "round";
  for (let y = 715; y < 846; y += 2.2 + r() * 1.4) {
    let x = 760 + r() * 16;
    const end = 796 + r() * 24;
    while (x < end) {
      const l = 2 + r() * 10;
      const v = mugV(x + l / 2) - 0.05 - 0.08 * r();
      g.strokeStyle = grey(Math.max(0.36, v)); g.lineWidth = 0.7 + 0.5 * r();
      const y1 = y + (r() - 0.5) * 0.8;
      g.beginPath(); g.moveTo(x, y1); g.quadraticCurveTo(x + l / 2, y1 + (r() - 0.5) * 0.8, Math.min(end, x + l), y1 + (r() - 0.5) * 0.8); g.stroke();
      x += l + 3 + r() * 9;
    }
  }
  // fix 2: fine vertical brush grain in the shadowed third (1-1.5 px, ~3 px pitch)
  for (let x = 745; x < 800; x += 2.2 + r() * 1.6) {
    let y = 716 + r() * 20;
    while (y < 844) {
      const l = 6 + r() * 18, v = mugV(x) - 0.04 + (r() - 0.5) * 0.1;
      g.strokeStyle = grey(Math.max(0.15, Math.min(0.95, v))); g.lineWidth = 1 + 0.5 * r();
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 1.2, Math.min(845, y + l)); g.stroke();
      y += l + 2 + r() * 10;
    }
  }
  // crisp white specks in the dark glaze (fix 1)
  for (let i = 0; i < 80; i++) {   // fix 2: 60 % fewer, dimmer (0.68-0.78)
    const x = 737 + r() * 42, y = 716 + r() * 128;
    if (mugV(x) > 0.55) continue;
    g.fillStyle = grey(0.68 + 0.1 * r());
    g.beginPath(); g.arc(x, y, 0.5 + r() * 0.3, 0, Math.PI * 2); g.fill();
  }
  // the column of dark dashes at x ~858-864 (fix 1)
  for (let k = 0; k < 9; k++) {
    const y = 732 + k * 12.5 + (r() - 0.5) * 3, x = 858 + r() * 2.5, l = 3 + r() * 3;
    g.strokeStyle = grey(0.35 + 0.15 * r()); g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + 0.4); g.stroke();
  }
  // the column of short dashes by the right edge
  for (let y = 730; y < 842; y += 3 + r() * 6) {
    if (r() < 0.35) continue;
    const x = 849 + r() * 9, l = 2 + r() * 4;
    g.strokeStyle = grey(0.55 + 0.2 * r()); g.lineWidth = 1.0;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y); g.stroke();
  }
  g.restore();
  g.setTransform(1, 0, 0, 1, -700, -700);
  // rim: a pale line down the left side and along the top
  g.lineCap = "round"; g.lineJoin = "round";
  g.strokeStyle = grey(0.7); g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(735, 726); g.lineTo(742.3, 846); g.stroke();
  // the rim (fix 1): the opening seen almost edge-on, a clean ellipse (dark inside, a pale lip)
  g.strokeStyle = grey(0.93); g.lineWidth = 2;
  g.beginPath(); g.ellipse(805, 714.5, 69.5, 4.6, -0.02, Math.PI, Math.PI * 2); g.stroke();
  g.strokeStyle = grey(0.86); g.lineWidth = 1.1;   // fix 2: the band under the rim is lit (source 0.83-0.97 at y 712-716)
  g.beginPath(); g.ellipse(805, 717.5, 67, 3.2, -0.02, Math.PI * 0.05, Math.PI * 0.95); g.stroke();
  return (MUGC = c);
}
// the mug with its handles (measured on an 8x grid of 46.12: the near one a thick white loop, the far one a thin grey
// loop); s16.js also redraws it over the jolt frames' blur (the source's mug stays crisp there)
export function drawMug(g, soft = 0) {
  paintMug(g, soft);
  g.save();
  if (soft > 0) g.filter = `blur(${soft}px)`;
  g.lineCap = "round"; g.lineJoin = "round";
  const loop = (pts, w, v) => { g.strokeStyle = grey(v); g.lineWidth = w; g.beginPath(); smoothPath(g, pts, false); g.stroke(); };
    // (fix 2: tapered toward both ends; ~6.5 px at its outer side, centred at x ~906.5 on row 790 of 1175)
  taper(g, sampleCurve([[873, 752], [893, 751], [902.5, 759], [906.8, 775], [906.8, 795], [902.5, 811], [892, 821], [875, 826]], 6),
    (u) => 6.5 * (0.7 + 0.3 * Math.sin(Math.PI * u)), grey(0.94));
  loop([[732, 748], [712, 752], [700, 765], [695, 785], [698, 805], [710, 822], [731, 832]], 3, 0.42);
  g.restore();
}
function paintMug(g, soft = 0) {
  g.save();
  g.fillStyle = "#000";
  for (const L of LOOPS) { g.beginPath(); g.moveTo(L[0][0], L[0][1]); for (const p of L) g.lineTo(p[0], p[1]); g.closePath(); g.fill(); }
  g.filter = `blur(${0.55 + soft}px)`;
  g.drawImage(mugLayer(), 700, 700);
  g.filter = "none";
  g.restore();
}

// fix 1: the plank's fine pale grain (the source's plank carries many fine pale lines between the dark ones): lines
// at ~3.5 px pitch between its top and bottom edges, following them, with a seeded wobble, broken into runs; fainter
// on the smooth left end under the owl. And the dark smudges at x ~865-945 (GRAIN 1, 4, 5) are left out.
const GRAIN_DROP = new Set([1, 4, 5]);
function paleGrain(g) {
  const n2 = PLANK.length / 2, top = PLANK.slice(0, n2), bot = PLANK.slice(n2).reverse();
  const edgeY = (E, x) => {
    for (let i = 1; i < E.length; i++) if (E[i][0] >= x) { const [a, ya] = E[i - 1], [b, yb] = E[i]; return ya + (yb - ya) * (x - a) / Math.max(1e-6, b - a); }
    return E[E.length - 1][1];
  };
  const R = rng(1661);
  g.save(); g.lineCap = "round";
  for (let k = 1; k < 10; k++) {
    const t = k / 10 + (R() - 0.5) * 0.04;
    let x = 560 + R() * 30;
    while (x < 2200) {
      const len = 25 + R() * 110, x1 = Math.min(2200, x + len);
      const left = x < 830;
      if (!left || R() < 0.55) {
        g.strokeStyle = `rgba(242,240,234,${TUNE.pgA * (left ? 0.5 : 1) * (0.6 + 0.6 * R())})`;
        g.lineWidth = 0.8 + 0.4 * R();
        g.beginPath();
        const ph = R() * 6.28, amp = 0.4 + 0.5 * R();
        for (let xx = x; xx <= x1; xx += 6) {
          const y = edgeY(top, xx) * (1 - t) + edgeY(bot, xx) * t + Math.sin(ph + xx * 0.02) * amp;
          if (xx === x) g.moveTo(xx, y); else g.lineTo(xx, y);
        }
        g.stroke();
      }
      x = x1 + 4 + R() * 30;
    }
  }
  g.restore();
}

// fix 2: between x ~835 and 1000 the source's plank is dark wood with bright grain lines (column samples of 1175:
// 0.8-0.97 lines on 0.05-0.25, ~3.5 px pitch), where the render had dark lines on light grey (the same mean). A
// darkening there, then pale 1 px lines following the plank's edges, broken into seeded runs.
function darkPlankEnd(g) {
  const n2 = PLANK.length / 2, top = PLANK.slice(0, n2), bot = PLANK.slice(n2).reverse();
  const edgeY = (E, x) => {
    for (let i = 1; i < E.length; i++) if (E[i][0] >= x) { const [a, ya] = E[i - 1], [b, yb] = E[i]; return ya + (yb - ya) * (x - a) / Math.max(1e-6, b - a); }
    return E[E.length - 1][1];
  };
  g.save();
  const gr = g.createLinearGradient(828, 0, 1015, 0);
  gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(0.12, `rgba(0,0,0,${TUNE.plankDark})`);
  gr.addColorStop(0.9, `rgba(0,0,0,${TUNE.plankDark})`); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(828, 840, 187, 60);
  // each line's value follows the plank's measured light (BASE, 40 x 4 px cells) so every row keeps its mean:
  // with lines covering ~37 % and the gaps darkened by plankDark, line = m (1 - 0.63 (1 - plankDark)) / 0.37
  const ny = BASE.length, nx = BASE[0].length;
  const baseAt = (x, y) => BASE[Math.max(0, Math.min(ny - 1, Math.floor((y - GY0 + 2) / 4)))][Math.max(0, Math.min(nx - 1, Math.floor((x - GX0 + 20) / 40)))];
  const kL = TUNE.plankK * (1 - 0.63 * (1 - TUNE.plankDark)) / 0.37;
  const R = rng(1667); g.lineCap = "round";
  for (let k = 1; k < 13; k++) {
    const t = k / 13 + (R() - 0.5) * 0.03;
    let x = 836 + R() * 12;
    while (x < 1002) {
      const len = 45 + R() * 110, x1 = Math.min(1004, x + len), lw = 1.0 + 0.5 * R(), dv = 0.06 * R();
      const ph = R() * 6.28, amp = 0.3 + 0.4 * R();
      let px = null, py = null;
      for (let xx = x; xx <= x1; xx += 5) {
        const y = edgeY(top, xx) * (1 - t) + edgeY(bot, xx) * t + Math.sin(ph + xx * 0.03) * amp;
        if (px !== null) {
          const m = baseAt(xx, y);
          if (m > 0.12) { g.strokeStyle = grey(Math.min(0.97, m * kL - dv)); g.lineWidth = lw; g.beginPath(); g.moveTo(px, py); g.lineTo(xx, y); g.stroke(); }
        }
        px = xx; py = y;
      }
      x = x1 + 2 + R() * 5;
    }
  }
  g.restore();
}

// the desk's front plank: its measured light between the grain lines (a coarse grid, smoothly scaled up), the
// traced grain on it, open where the cables cross; the fine pale lines in the dark under it
function paintDesk(g) {
  const ny = BASE.length, nx = BASE[0].length;
  const b = document.createElement("canvas"); b.width = nx; b.height = ny;
  const bg = b.getContext("2d"), img = bg.createImageData(nx, ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const v = Math.round(Math.max(0, Math.min(1, BASE[j][i] - TUNE.pgA * TUNE.pgK)) * 255), k = 4 * (j * nx + i);
    img.data[k] = v * 0.949; img.data[k + 1] = v * 0.941; img.data[k + 2] = v * 0.918; img.data[k + 3] = 255;
  }
  bg.putImageData(img, 0, 0);
  g.save();
  g.beginPath();
  g.moveTo(PLANK[0][0], PLANK[0][1]); for (const p of PLANK) g.lineTo(p[0], p[1]); g.closePath();
  // (fix 2: cut-outs shorter than 12 px are not cable crossings: CUT 5 / 6 / 7 printed as dark smudges on the plank)
  for (const r of CUT) {
    let ya = 1e9, yb = -1e9; for (let i = 1; i < r.length; i += 2) { ya = Math.min(ya, r[i]); yb = Math.max(yb, r[i]); }
    if (yb - ya < 12) continue;
    g.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1]); g.closePath();
  }
  g.clip("evenodd");
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  g.drawImage(b, GX0 - 20, GY0 - 2, nx * 40, ny * 4);
  drawStrokes(g, GRAIN.filter((_, i) => !GRAIN_DROP.has(i)), false, { wk: TUNE.grainW, end: 6, wMin: 0.7 });
  paleGrain(g);
  darkPlankEnd(g);
  g.restore();
  // under the desk: the engraving (its value study) plus the measured fine pale lines (TUNE.underV >= 0 would
  // paint it flat dark first; tried, it loses the cables and the chair's hatching under the desk)
  if (TUNE.underV >= 0) {
  g.save();
  g.beginPath();
  const n2 = PLANK.length / 2;
  g.moveTo(PLANK[n2][0], PLANK[n2][1] + 1);
  for (let i = n2; i < PLANK.length; i++) g.lineTo(PLANK[i][0], PLANK[i][1] + 1);
  g.lineTo(PLANK[PLANK.length - 1][0], H + M); g.lineTo(PLANK[n2][0], H + M); g.closePath();
  g.fillStyle = grey(TUNE.underV); g.fill();
  g.restore();
  }
  drawStrokes(g, UNDER, true, { wk: 1.0, end: 6, wMin: 0.7 });
}

// the knit T-shirt (fix 1): a hex lattice of pale cells on dark, drawn over the engraving inside its outline. Pitch
// ~6.5 px at the collar to ~8.5 px at the bottom (the knit comes toward us); each cell's size and tone follow the
// shirt's measured light (./data/shirt.js, coarse) so the lattice's mean matches it: smaller, dimmer cells at the
// collar and in the fold, bigger and brighter where it catches the light.
function shirtAt(x, y) {
  const ny = SHIRTG.length, nx = SHIRTG[0].length;
  const fx = Math.max(0, Math.min(nx - 1.001, (x - SX0) / SC)), fy = Math.max(0, Math.min(ny - 1.001, (y - SY0) / SC));
  const i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j;
  return (SHIRTG[j][i] * (1 - tx) + SHIRTG[j][i + 1] * tx) * (1 - ty) + (SHIRTG[j + 1][i] * (1 - tx) + SHIRTG[j + 1][i + 1] * tx) * ty;
}
// the knit patch hanging right of the lapel (read off a 5x grid of 47.00)
const TSHIRT2 = [[1550, 628], [1560, 624], [1580, 628], [1592, 634], [1588, 650], [1578, 660], [1570, 680], [1562, 700], [1552, 705],
  [1548, 680], [1549, 650]];
// fix 2: less regular and less contrasty: seeded jitter of the cell centres (+-1 px) and sizes (+-15 %), walls at
// ~0.45 of the local light instead of black (the cells then carry less contrast for the same mean), a dark ribbed
// collar along the neck (the lattice starts under it, not on a straight line) and a darker fold crease at the right
// (the collar's top edge read off column profiles of 1175: (1380, 597), (1400, 609), (1420, 611), (1440, 603); the fold is dark
// at x ~1550 on y 650 and y 800+, paler between)
const COLLAR = [[1364, 604], [1380, 603], [1400, 614], [1420, 616], [1440, 609], [1458, 606], [1480, 609], [1500, 612]];
const FOLD = [[1551, 640], [1549, 690], [1546, 750], [1548, 800], [1553, 845]];
function paintShirt(g) {
  g.save();
  g.beginPath();
  for (const P of [TSHIRT, TSHIRT2]) { g.moveTo(P[0][0], P[0][1]); for (const p of P) g.lineTo(p[0], p[1]); g.closePath(); }
  g.clip();
  const th = TUNE.shirtRot, ca = Math.cos(th), sa = Math.sin(th), cx = 1460, cy = 720;
  const R = rng(1664);
  // the walls: a smooth tone at shirtWall x the local light (a coarse pass of big squares, blurred)
  {
    const nx = 34, ny = 34, wc = document.createElement("canvas"); wc.width = nx; wc.height = ny;
    const wg = wc.getContext("2d"), img = wg.createImageData(nx, ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const v = Math.round(255 * TUNE.shirtWall * shirtAt(1340 + 8 * i + 4, 588 + 8 * j + 4)), k = 4 * (j * nx + i);
      img.data[k] = img.data[k + 1] = img.data[k + 2] = v; img.data[k + 3] = 255;
    }
    wg.putImageData(img, 0, 0);
    g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high"; g.filter = "blur(3px)";
    g.drawImage(wc, 1340, 588, nx * 8, ny * 8); g.restore();
  }
  let y = -150, row = 0;
  while (y < 160) {
    const pitch = (yy) => 6.5 + 2.0 * Math.max(0, Math.min(1, (yy + cy - 615) / 230));
    const p = pitch(y);
    for (let x = -150 + (row % 2) * p / 2; x < 150; x += p) {
      const X = cx + x * ca - y * sa, Y = cy + x * sa + y * ca;
      if (X < 1350 || X > 1600 || Y < 595 || Y > 855) continue;
      const m = shirtAt(X, Y), wv = TUNE.shirtWall * m;
      const c = Math.max(0.3, Math.min(0.85, m * TUNE.shirtC + 0.12));
      const frac = Math.max(0, Math.min(0.88, (m - wv) / Math.max(0.05, c - wv)));
      const r = Math.max(0.5, Math.min(p / 2 - 0.4, Math.sqrt((frac * p * p * 0.866) / Math.PI))) * (0.85 + 0.3 * R());
      g.fillStyle = grey(Math.min(0.95, c * (0.94 + 0.12 * R())));
      const jx = X + (R() - 0.5) * 2, jy = Y + (R() - 0.5) * 2;
      g.beginPath();
      for (let k = 0; k < 6; k++) { const a = th + Math.PI / 6 + (k * Math.PI) / 3; g.lineTo(jx + Math.cos(a) * r * 1.08, jy + Math.sin(a) * r * 1.08); }
      g.closePath(); g.fill();
    }
    y += p * 0.866; row++;
  }
  // the fold crease on the right and the collar
  g.lineCap = "round"; g.lineJoin = "round";
  g.save(); g.filter = "blur(3px)"; g.globalAlpha = 0.6; g.strokeStyle = grey(0.1); g.lineWidth = 10;
  g.beginPath(); smoothPath(g, FOLD, false); g.stroke(); g.restore();
  g.restore();
  g.save(); g.lineCap = "round"; g.lineJoin = "round"; g.filter = "blur(1px)";
  taper(g, sampleCurve(COLLAR, 6), (u) => TUNE.collarW * (0.6 + 0.4 * Math.sin(Math.PI * u)), grey(TUNE.collarV));
  // its ribbing: short pale ticks across it
  g.filter = "none"; g.strokeStyle = grey(0.28); g.lineWidth = 1;
  const q = sampleCurve(COLLAR, 12);
  for (let i = 3; i < q.length - 3; i += 3) {
    const a = q[i - 1], b = q[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
    g.beginPath(); g.moveTo(q[i][0] - nx * 3.5, q[i][1] - ny * 3.5); g.lineTo(q[i][0] + nx * 3.5, q[i][1] + ny * 3.5); g.stroke();
  }
  g.restore();
}

// the headphone cups round his neck (./data/cel.js). Two formats:
//  - trace/cel.py (in use): 12 fine cel levels at sigma 0.9 inside hand-read zones, feathered in. NOTE (fix 1): this is
//    close to a posterised copy of the source crop; whether it is acceptable is an open decision (fidelity/s16.md);
//  - trace/cel2.py (prepared alternative): one dark base, a coarse value study (sigma 3, 8 levels) and measured
//    centre-lines (the s12 method). Measured worse (headphones sigma-2 error ~10.8 against 6.3 at 47.00).
function paintCel(g) {
  for (const z of CEL) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < z.zone.length; i += 2) { x0 = Math.min(x0, z.zone[i]); x1 = Math.max(x1, z.zone[i]); y0 = Math.min(y0, z.zone[i + 1]); y1 = Math.max(y1, z.zone[i + 1]); }
    x0 = Math.floor(x0) - 6; y0 = Math.floor(y0) - 6; x1 = Math.ceil(x1) + 6; y1 = Math.ceil(y1) + 6;
    const w = x1 - x0, h = y1 - y0;
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const lg = c.getContext("2d");
    if (z.L) {
      const s = document.createElement("canvas"); s.width = w; s.height = h;
      const sg = s.getContext("2d"); sg.translate(-x0, -y0);
      sg.fillStyle = grey(z.base); sg.fillRect(x0, y0, w, h);
      for (const it of z.L) { ringsPath(sg, it, 1); sg.fillStyle = grey(it[0] / 1000); sg.fill("evenodd"); }
      lg.filter = `blur(${TUNE.celSoft}px)`; lg.drawImage(s, 0, 0); lg.filter = "none";
    } else {
      lg.translate(-x0, -y0);
      lg.fillStyle = grey(z.base); lg.fillRect(x0, y0, w, h);
      lg.filter = `blur(${TUNE.celLv}px)`;
      for (const it of z.levels || []) { ringsPath(lg, it, 1); lg.fillStyle = grey(it[0] / 1000); lg.fill("evenodd"); }
      lg.filter = `blur(${TUNE.celSoft}px)`;
      for (const it of z.light || []) { lg.beginPath(); lg.moveTo(it[1], it[2]); for (let i = 3; i < it.length; i += 2) lg.lineTo(it[i], it[i + 1]); lg.closePath(); lg.fillStyle = grey(it[0] / 1000); lg.fill(); }
      lg.filter = "none";
      drawStrokes(lg, z.dark || [], false, { wk: TUNE.celDw, end: 3, wMin: 0.6 });
      drawStrokes(lg, z.pale || [], true, { wk: TUNE.celPw, end: 3, wMin: 0.6 });
      lg.setTransform(1, 0, 0, 1, 0, 0);
    }
    const m = document.createElement("canvas"); m.width = w; m.height = h;
    const mg = m.getContext("2d"); mg.translate(-x0, -y0);
    mg.beginPath(); mg.moveTo(z.zone[0], z.zone[1]); for (let i = 2; i < z.zone.length; i += 2) mg.lineTo(z.zone[i], z.zone[i + 1]); mg.closePath();
    mg.fillStyle = "#fff"; mg.fill();
    lg.globalCompositeOperation = "destination-in"; lg.filter = "blur(2px)"; lg.drawImage(m, 0, 0); lg.filter = "none";
    g.drawImage(c, x0, y0);
  }
}

// the cables: a dark body ~9 px wide with a thin pale rim on its left edge (rim centre-lines read off the grid)
const CABLES = [[[1968.5, 834], [1972.5, 840], [1977.5, 852.5], [1981, 870], [1984, 887.5], [1985, 905], [1985.5, 915]],
  [[1987.5, 834], [1989, 837.5], [1994, 852.5], [1997.5, 870], [2001, 887.5], [2004, 905], [2005, 915]]];
// (sampled on 1175: a thin wedge left of x 2005 at y 805-815, the upper piece x 2005-2065, the lower right lobe x 2035-2085
// below the dark band that crosses it diagonally; the ground round it is black)
const BLOCK_U = [[1972, 809], [1992, 805], [2008, 799], [2030, 797.5], [2060, 798], [2068, 801], [2056, 813], [2044, 821], [2030, 826], [2008, 826], [2004, 816], [1990, 814]];
const BLOCK_L = [[2036, 834], [2052, 826], [2068, 818], [2082, 811], [2086, 813], [2085, 840], [2037, 841]];
const CORD = [[2078, 806], [2090, 802], [2100, 799.5], [2115, 794], [2130, 790], [2144, 789], [2150, 791.5], [2151.5, 797]];
function paintProps(g) {
  g.save(); g.lineCap = "round"; g.lineJoin = "round";
  // the dark ground round the cables (flat, under the desk's cut)
  g.fillStyle = grey(0.02);
  g.beginPath(); g.moveTo(1968, 834); g.lineTo(1998, 834); g.lineTo(2010, 870); g.lineTo(2014, 915); g.lineTo(1983, 915); g.lineTo(1979, 870); g.lineTo(1965, 835); g.closePath(); g.fill();
  for (const C of CABLES) {
    const body = C.map(([x, y]) => [x + 4.8, y]);
    taper(g, sampleCurve(body, 6), (u) => 9 * (0.85 + 0.15 * Math.min(1, u * 3)), grey(0.13));
    taper(g, sampleCurve(C, 6), (u) => 2.0 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.1)), 0.3), grey(0.62));
  }
  // (the block and its cord keep the measured value study, now flat instead of a horizontal stroke field, and their
  // traced lines: an authored block measured worse against the source's softly hatched shape)
  g.restore();
}

let ROOM = null;
export function roomCanvas() {
  if (ROOM) return ROOM;
  const mk = (fill) => { const c = document.createElement("canvas"); c.width = W + 2 * M; c.height = H + 2 * M; const g = c.getContext("2d"); g.fillStyle = fill; g.fillRect(0, 0, c.width, c.height); return c; };
  const valC = mk("#000"), dirC = mk("rgb(0,128,0)");
  paintRoomMaps(valC, dirC);
  blurCanvas(valC, TUNE.blur);
  // measurement hook for the lab harness (snapshots/s16-fix1-tools): view the value / direction maps; never set in the film
  const view = (globalThis.__S16 || {}).view;
  if (view === "val") return (ROOM = valC);
  if (view === "dir") return (ROOM = dirC);
  const cut = engraveCanvases(valC, dirC, ENGRAVE);
  if (view === "cut") return (ROOM = cut);
  const g = cut.getContext("2d");
  g.save(); g.translate(M, M);
  paintDesk(g);
  // the laptop lid is black inside its rim (the value study's glow round the rim would be cut into grey lines)
  g.fillStyle = grey(0.015);
  g.beginPath(); g.moveTo(RIM[0][0] + 2, RIM[0][1] + 3);
  for (let i = 1; i < RIM.length; i++) g.lineTo(RIM[i][0] - (i >= 8 ? 3.5 : 0), RIM[i][1] + (i < 8 ? 3.5 : 0));
  // (its lower left corner is left open: the lid's lit side face, a triangle from about (1014, 755) down, is engraved)
  g.lineTo(RIM[RIM.length - 1][0] - 4, 846); g.lineTo(1062, 846); g.lineTo(1043, 826); g.lineTo(1027, 790); g.lineTo(1011, 752);
  g.lineTo(RIM[0][0] + 2, 662); g.closePath(); g.fill();
  drawStrokes(g, DARK, false, { wk: TUNE.darkW, dv: TUNE.darkDv });
  drawStrokes(g, PALE, true, { wk: TUNE.paleW, dv: TUNE.paleDv });
  if (TUNE.shirtC > 0) paintShirt(g);
  drawStrokes(g, HAIRS, true, { wk: TUNE.hairW, end: 5, wMin: 0.6 });
  paintCel(g);
  paintDetails(g);
  paintProps(g);
  g.restore();
  // the source's print is soft: a slight blur of the finished plate
  if (view !== "sharp") blurCanvas(cut, TUNE.soft);
  ROOM = cut;
  return cut;
}
export function releaseRoom() { ROOM = null; MUGC = null; }
