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
const DARK = DARK0.filter((s) => !inDesk(s) && !midIn(s, TSHIRT)), PALE = PALE0.filter((s) => !inDesk(s) && !midIn(s, TSHIRT));

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
export const ENGRAVE = { spacing: 4.4, seed: 16, contrast: 1.0, ink: 1.06 };
export const TUNE = { blur: 1.2, soft: 0.6, darkW: 1.0, paleW: 1.0, darkDv: 0.0, paleDv: 0.0, grainW: 0.9, underV: -1, meshAng: 1.0, meshSp: 0.25, meshK: 1, celSoft: 0.45 };

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
  paintMug(g);
  // the mug's handles (measured on an 8x grid of 46.12): the near one a thick white loop, the far one a thin grey loop
  g.lineCap = "round";
  const loop = (pts, w, v) => { g.strokeStyle = grey(v); g.lineWidth = w; g.beginPath(); smoothPath(g, pts, false); g.stroke(); };
  loop([[873, 754], [895, 754], [906, 762], [910, 778], [910, 800], [906, 818], [896, 830], [874, 833]], 7, 0.93);
  loop([[732, 748], [712, 752], [700, 765], [695, 785], [698, 805], [710, 822], [731, 832]], 3, 0.42);
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
const MUG = [[733, 725.5], [748, 719.5], [765, 715], [790, 712], [830, 711], [855, 713.5], [873, 719.5], [866, 846], [800, 847.5], [741, 848]];
const MUG_V = [[731, 0.3], [735, 0.46], [740, 0.36], [748, 0.27], [756, 0.35], [764, 0.42], [772, 0.54], [780, 0.64], [788, 0.8],
  [796, 0.87], [806, 0.9], [816, 0.95], [832, 0.97], [846, 0.95], [852, 0.92], [860, 0.95], [866, 0.9], [870, 0.7]];
// inside the handle loops the source is black (the value study there carries a little glow the engraver would cut)
const LOOPS = [[[912, 758], [905, 752], [874, 752], [870, 834], [896, 831], [910, 812], [914, 780]],
  [[733, 745], [712, 750], [698, 764], [692, 786], [696, 808], [710, 826], [733, 836]],
  [[738, 846], [868, 843], [868, 850.5], [738, 850.5]], [[872, 740], [905, 740], [905, 752], [872, 752]]];
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
      const v = Math.round(Math.max(0, Math.min(1, MUGG[j][i])) * 255), k = 4 * (j * nx + i);
      img.data[k] = v * 0.949; img.data[k + 1] = v * 0.941; img.data[k + 2] = v * 0.918; img.data[k + 3] = 255;
    }
    bg.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    g.drawImage(b, MX0 - 2, MY0 - 5, nx * 4, ny * 10);
  }
  const r = rng(1602);
  // pale speckles in the shadowed glaze (fine, soft)
  for (let i = 0; i < 3200; i++) {
    const x = 736 + r() * 58, y = 712 + r() * 134, d = 1 - mugV(x);
    if (r() > d * 1.4 - 0.15) continue;
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
      const v = mugV(x + l / 2) - 0.1 - 0.12 * r();
      g.strokeStyle = grey(Math.max(0.28, v)); g.lineWidth = 0.8 + 0.7 * r();
      const y1 = y + (r() - 0.5) * 0.8;
      g.beginPath(); g.moveTo(x, y1); g.quadraticCurveTo(x + l / 2, y1 + (r() - 0.5) * 0.8, Math.min(end, x + l), y1 + (r() - 0.5) * 0.8); g.stroke();
      x += l + 1.5 + r() * 6;
    }
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
  g.strokeStyle = grey(0.88); g.lineWidth = 1.3;
  g.beginPath(); g.moveTo(733.5, 726); g.lineTo(748, 720); g.bezierCurveTo(775, 712, 835, 710, 872.5, 720); g.stroke();
  return (MUGC = c);
}
function paintMug(g) {
  g.save();
  g.fillStyle = "#000";
  for (const L of LOOPS) { g.beginPath(); g.moveTo(L[0][0], L[0][1]); for (const p of L) g.lineTo(p[0], p[1]); g.closePath(); g.fill(); }
  g.filter = "blur(0.55px)";
  g.drawImage(mugLayer(), 700, 700);
  g.filter = "none";
  g.restore();
}

// the desk's front plank: its measured light between the grain lines (a coarse grid, smoothly scaled up), the
// traced grain on it, open where the cables cross; the fine pale lines in the dark under it
function paintDesk(g) {
  const ny = BASE.length, nx = BASE[0].length;
  const b = document.createElement("canvas"); b.width = nx; b.height = ny;
  const bg = b.getContext("2d"), img = bg.createImageData(nx, ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const v = Math.round(Math.max(0, Math.min(1, BASE[j][i])) * 255), k = 4 * (j * nx + i);
    img.data[k] = v * 0.949; img.data[k + 1] = v * 0.941; img.data[k + 2] = v * 0.918; img.data[k + 3] = 255;
  }
  bg.putImageData(img, 0, 0);
  g.save();
  g.beginPath();
  g.moveTo(PLANK[0][0], PLANK[0][1]); for (const p of PLANK) g.lineTo(p[0], p[1]); g.closePath();
  for (const r of CUT) { g.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1]); g.closePath(); }
  g.clip("evenodd");
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  g.drawImage(b, GX0 - 20, GY0 - 2, nx * 40, ny * 4);
  drawStrokes(g, GRAIN, false, { wk: TUNE.grainW, end: 6, wMin: 0.7 });
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

// the headphone cups round his neck: fine cel levels (./data/cel.js, the s13 method) over the engraving, feathered in
function paintCel(g) {
  for (const z of CEL) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < z.zone.length; i += 2) { x0 = Math.min(x0, z.zone[i]); x1 = Math.max(x1, z.zone[i]); y0 = Math.min(y0, z.zone[i + 1]); y1 = Math.max(y1, z.zone[i + 1]); }
    x0 = Math.floor(x0) - 6; y0 = Math.floor(y0) - 6; x1 = Math.ceil(x1) + 6; y1 = Math.ceil(y1) + 6;
    const w = x1 - x0, h = y1 - y0;
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const lg = c.getContext("2d");
    const s = document.createElement("canvas"); s.width = w; s.height = h;
    const sg = s.getContext("2d"); sg.translate(-x0, -y0);
    sg.fillStyle = grey(z.base); sg.fillRect(x0, y0, w, h);
    for (const it of z.L) { ringsPath(sg, it, 1); sg.fillStyle = grey(it[0] / 1000); sg.fill("evenodd"); }
    lg.filter = `blur(${TUNE.celSoft}px)`; lg.drawImage(s, 0, 0); lg.filter = "none";
    const m = document.createElement("canvas"); m.width = w; m.height = h;
    const mg = m.getContext("2d"); mg.translate(-x0, -y0);
    mg.beginPath(); mg.moveTo(z.zone[0], z.zone[1]); for (let i = 2; i < z.zone.length; i += 2) mg.lineTo(z.zone[i], z.zone[i + 1]); mg.closePath();
    mg.fillStyle = "#fff"; mg.fill();
    lg.globalCompositeOperation = "destination-in"; lg.filter = "blur(2px)"; lg.drawImage(m, 0, 0); lg.filter = "none";
    g.drawImage(c, x0, y0);
  }
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
  paintCel(g);
  paintDetails(g);
  g.restore();
  // the source's print is soft: a slight blur of the finished plate
  if (view !== "sharp") blurCanvas(cut, TUNE.soft);
  ROOM = cut;
  return cut;
}
export function releaseRoom() { ROOM = null; MUGC = null; }
