// s02 designer: the front close-up (knit beanie, black hair, staring eyes, sweat, a pencil in his teeth, stubble,
// pale hoodie, the laptop lid as a black bar). World coordinates = the 6.04 s source frame (the stare framing).
// Traced from 2x grids of the source at 8.0 s (snapshots/s02-study/g-*.jpg). Dark ink on white: the designer is
// drawn straight onto a Canvas2D layer (not engraved) — the source draws him as manga ink, not scratchboard.
// The eyes are drawn separately (eye(g, state)) because they move.
import { taper } from "../../lib/ink.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { rng, clamp } from "../../lib/rng.js";

const PI = Math.PI;
export const INKC = "#0b0b0b";
const gv = (v, a = 1) => { const c = Math.round(clamp(v) * 255); return a >= 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`; };
const wv = (a) => `rgba(246,245,241,${a})`;

// ---------- shapes (world px) ----------
export const HOODIE = [
  [0, 946], [30, 946], [44, 910], [60, 862], [100, 756], [140, 682], [180, 636], [220, 620], [260, 599], [340, 566], [420, 538], [500, 496], [560, 474], [640, 450],
  [700, 440], [1000, 430], [1300, 440], [1490, 512], [1530, 500], [1610, 545], [1690, 570], [1770, 586], [1850, 623], [1890, 652], [1930, 686], [1970, 745], [1995, 810], [2010, 868], [2028, 946], [2060, 946],
];
export const SKIN = [
  [700, 80], [1000, 60], [1400, 80], [1420, 300], [1400, 520], [1370, 640], [1330, 700], [1300, 760], [1270, 815],
  [850, 815], [810, 760], [770, 690], [735, 600], [700, 450],
];
// beanie: outer outline (crown above the frame) then the cuff's lower edge back to the start
export const BEANIE = [
  [590, 365], [575, 300], [566, 200], [568, 100], [580, 0], [606, -81], [645, -160], [693, -218], [760, -268], [830, -300], [920, -326],
  [1000, -334], [1090, -328], [1170, -306], [1240, -276], [1310, -226], [1370, -166], [1420, -90], [1460, -20], [1488, 60], [1502, 180],
  [1504, 290], [1492, 365], [1480, 372],
  [1462, 345], [1435, 265], [1400, 200], [1336, 150], [1260, 118], [1183, 102], [1100, 95], [1000, 92], [900, 104], [806, 130],
  [740, 150], [705, 180], [670, 240], [645, 300], [615, 355],
];
const CUFF_EDGE = [[615, 355], [645, 300], [670, 240], [705, 180], [740, 150], [806, 130], [900, 104], [1000, 92], [1100, 95], [1183, 102], [1260, 115], [1336, 150], [1400, 200], [1435, 265], [1462, 345], [1480, 372]];
const FOLD = [[590, -50], [700, -100], [850, -128], [1000, -135], [1150, -128], [1300, -104], [1446, -50]];
export const HAIR_L = [
  [806, 128], [760, 142], [705, 180], [670, 240], [645, 300], [615, 355], [592, 368], [578, 420], [566, 480], [558, 530],
  [566, 570], [592, 610], [632, 655], [690, 700], [742, 722], [778, 708], [784, 650], [770, 570], [757, 490], [750, 410],
  [750, 335], [760, 262], [786, 196], [826, 150],
];
export const HAIR_R = [
  [1250, 112], [1336, 150], [1400, 200], [1435, 265], [1462, 345], [1486, 385], [1502, 440], [1506, 492], [1496, 545],
  [1478, 598], [1446, 648], [1398, 692], [1352, 714], [1318, 700], [1322, 640], [1340, 560], [1344, 470], [1338, 390],
  [1326, 318], [1306, 250], [1280, 190], [1262, 150],
];
export const FORELOCK = [
  [966, 104], [1030, 98], [1112, 104], [1108, 150], [1094, 192], [1066, 218], [1058, 252], [1040, 280], [1024, 310], [1003, 336], [985, 360],
  [962, 382], [944, 398], [952, 370], [968, 340], [980, 300], [990, 262], [998, 232], [1002, 196], [986, 160], [966, 140],
];
export const LAPTOP = { x0: 230, x1: 1888, y: 812, r: 30 };

const poly = (pts) => (c) => { c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); };
const blob = (pts) => (c) => smoothPath(c, pts, true);
function fillPath(g, path, style) { g.beginPath(); path(g); g.fillStyle = style; g.fill(); }
function clipTo(g, path, fn) { g.save(); g.beginPath(); path(g); g.clip(); fn(); g.restore(); }

// a tapered ink stroke through control points: full weight near the start, tapering to a hair
export function strand(g, pts, w, color, { per = 6, head = 0.12, pow = 0.8 } = {}) {
  const q = sampleCurve(pts, per);
  taper(g, q, (u) => w * Math.min(1, u / head + 0.25) * Math.pow(1 - u, pow), color);
}
// a swelling ink line (thin ends)
export function line(g, pts, w, color, { per = 6, end = 0.25, pow = 0.6 } = {}) {
  const q = pts.length > 2 ? sampleCurve(pts, per) : pts;
  taper(g, q, (u) => w * (end + (1 - end) * Math.pow(Math.sin(PI * u), pow)), color);
}
// hatch strokes: n short strokes scattered in an ellipse, all along a direction
function hatchPatch(g, cx, cy, rx, ry, ang, n, len, w, color, seed, jit = 0.25) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    let x, y;
    do { x = r() * 2 - 1; y = r() * 2 - 1; } while (x * x + y * y > 1);
    const a = ang + (r() - 0.5) * jit, L = len * (0.6 + 0.8 * r());
    const px = cx + x * rx, py = cy + y * ry;
    strand(g, [[px, py], [px + Math.cos(a) * L * 0.5, py + Math.sin(a) * L * 0.5], [px + Math.cos(a) * L, py + Math.sin(a) * L]], w * (0.6 + 0.6 * r()), color, { per: 3, head: 0.3 });
  }
}
// parallel strokes that follow a guide curve (offset rows), clipped by the caller
function combRows(g, guide, rows, gap, len, ang, w, color, seed, { step = 7, jitter = 0.4, skip = 0.15 } = {}) {
  const r = rng(seed);
  const q = sampleCurve(guide, 12);
  for (let k = 0; k < rows; k++) {
    let acc = 0;
    for (let i = 1; i < q.length; i++) {
      const dx = q[i][0] - q[i - 1][0], dy = q[i][1] - q[i - 1][1], d = Math.hypot(dx, dy) || 1;
      acc += d;
      if (acc < step) continue;
      acc = 0;
      if (r() < skip) continue;
      const nx = -dy / d, ny = dx / d;
      const px = q[i][0] + nx * gap * k + (r() - 0.5) * step * jitter, py = q[i][1] + ny * gap * k + (r() - 0.5) * step * jitter;
      const a = Math.atan2(dy, dx) + ang + (r() - 0.5) * 0.2, L = len * (0.6 + 0.7 * r());
      strand(g, [[px, py], [px + Math.cos(a) * L * 0.5, py + Math.sin(a) * L * 0.5], [px + Math.cos(a) * L, py + Math.sin(a) * L]], w * (0.6 + 0.6 * r()), color, { per: 3, head: 0.25 });
    }
  }
}

// ---------- the hoodie ----------
function paintHoodie(g) {
  const path = poly(HOODIE);
  fillPath(g, path, (() => { const r = g.createLinearGradient(0, 450, 0, 946); r.addColorStop(0, gv(0.9)); r.addColorStop(1, gv(0.84)); return r; })());
  clipTo(g, path, () => {
    // the far sides turn away from the light: heavier diagonal hatching toward the outer edges
    const sides = [
      { pts: [[30, 946], [60, 860], [100, 756], [150, 680], [230, 640], [260, 720], [180, 830], [140, 946]], ang: -1.1, seed: 11 },
      { pts: [[2028, 946], [2000, 830], [1960, 740], [1900, 680], [1830, 650], [1800, 730], [1890, 840], [1920, 946]], ang: -2.0, seed: 12 },
    ];
    for (const s of sides) {
      g.save(); g.beginPath(); blob(s.pts)(g); g.clip();
      g.fillStyle = gv(0.62, 0.18); g.fill();
      const r = rng(s.seed);
      for (let i = 0; i < 110; i++) {
        const x = s.pts.reduce((m, p) => Math.min(m, p[0]), 1e9) + r() * 320, y = 600 + r() * 360, L = 30 + r() * 60;
        strand(g, [[x, y], [x + Math.cos(s.ang) * L, y + Math.sin(s.ang) * L]], 1.3 + r(), gv(0.1, 0.55), { per: 2, head: 0.3 });
      }
      g.restore();
    }
    // the cross-hatched band along the top of each shoulder
    const bandL = [[100, 758], [140, 684], [180, 638], [260, 601], [340, 568], [420, 540], [500, 498], [560, 476], [600, 470], [610, 520], [520, 545], [430, 580], [340, 612], [250, 645], [180, 690], [130, 770]];
    const bandR = [[1530, 502], [1610, 547], [1690, 572], [1770, 588], [1850, 625], [1890, 654], [1930, 688], [1970, 747], [1995, 812], [1950, 800], [1900, 740], [1830, 680], [1740, 640], [1640, 610], [1560, 580]];
    // a regular cross-hatch mesh (two families of parallel strokes, ~6 px apart), densest at the top edge
    for (const [pts, seed, a] of [[bandL, 21, -0.45], [bandR, 22, 0.42]]) {
      g.save(); g.beginPath(); blob(pts)(g); g.clip();
      const r = rng(seed);
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, R = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2 + 10;
      for (const [ang, sp, w] of [[a + PI / 2 - 0.25, 6, 1.5], [a + PI / 2 + 0.55, 7, 1.2]]) {
        const ca = Math.cos(ang), sa = Math.sin(ang);
        for (let o = -R; o < R; o += sp) {
          const px = cx - sa * o + (r() - 0.5) * 2, py = cy + ca * o;
          line(g, [[px - ca * R, py - sa * R], [px + ca * R, py + sa * R]], w * (0.8 + 0.4 * r()), gv(0.06, 0.55), { end: 0.6 });
        }
      }
      g.restore();
    }
    // long feathery fold strokes running down from the shoulder line
    const r = rng(31);
    const edgeL = sampleCurve([[100, 758], [140, 684], [180, 638], [260, 601], [340, 568], [420, 540], [500, 498], [560, 476]], 20);
    const edgeR = sampleCurve([[1530, 502], [1610, 547], [1690, 572], [1770, 588], [1850, 625], [1930, 688], [1970, 747], [1995, 812]], 20);
    for (const [edge, dirx] of [[edgeL, 0.25], [edgeR, -0.2]]) {
      for (let i = 0; i < 220; i++) {
        const p = edge[Math.floor(r() * edge.length)];
        const x = p[0] + (r() - 0.5) * 30, y = p[1] + 10 + r() * 50, L = 40 + r() * 120;
        const a = PI / 2 + dirx * (0.6 + r()) + (r() - 0.5) * 0.4;
        strand(g, [[x, y], [x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.5 + 3], [x + Math.cos(a) * L, y + Math.sin(a) * L]], 0.9 + 0.7 * r(), gv(0.12, 0.3 + 0.3 * r()), { per: 3, head: 0.15 });
      }
    }
    // seams along the shoulders
    line(g, [[150, 740], [230, 680], [420, 600], [560, 530]], 2.4, gv(0.05, 0.8));
    line(g, [[1540, 560], [1690, 610], [1850, 670], [1950, 790]], 2.4, gv(0.05, 0.8));
    // a few big folds on the chest
    for (const f of [[[420, 640], [470, 720], [520, 790]], [[330, 680], [360, 760], [400, 812]], [[1600, 640], [1580, 720], [1560, 800]], [[1700, 660], [1690, 740], [1700, 812]], [[640, 700], [660, 760]], [[1480, 700], [1460, 760]]]) {
      line(g, f, 1.6, gv(0.1, 0.55));
    }
  });
  // outline of the shoulders
  line(g, [[30, 946], [44, 910], [60, 862], [100, 756], [140, 682], [180, 636], [220, 620], [260, 599], [340, 566], [420, 538], [500, 496], [560, 474], [640, 450]], 3.2, INKC);
  line(g, [[1490, 512], [1530, 500], [1610, 545], [1690, 570], [1770, 586], [1850, 623], [1890, 652], [1930, 686], [1970, 745], [1995, 810], [2010, 868], [2028, 946]], 3.2, INKC);
}

// ---------- the face (skin, bags, brows, nose, mouth, stubble, jaw) ----------
function paintFace(g) {
  fillPath(g, poly(SKIN), gv(0.975));
  // a faint grey on the forehead under the cuff, the temples and the jaw edges
  const r = rng(41);
  // cheek / temple contour hatching along the hair edges
  for (const [cx, cy, rx, ry, a, n, L] of [[775, 560, 25, 120, 1.75, 90, 40], [1320, 560, 22, 120, 1.4, 90, 40], [800, 700, 30, 60, 1.2, 50, 36], [1290, 700, 30, 60, 1.95, 50, 36]]) {
    hatchPatch(g, cx, cy, rx, ry, a, n, L, 1.1, gv(0.1, 0.5), 42 + n + cx);
  }
  // hollow eye sockets (measured tones at 8.0 s): the inner corners toward the nose are the darkest (cross-hatch,
  // ~0.55), a hatched band under the brow (~0.72), a dark smudge right under the lower lid (~0.85); the cheek below
  // y 400 stays light
  for (const [cx, cy, sgn] of [[852, 322, -1], [1232, 317, 1]]) {
    const inX = cx - sgn * 118;                         // inner corner side (toward the nose)
    // a soft grey ring round the eye, darkest at the inner corner and just under the lid
    g.save(); g.filter = "blur(14px)";
    g.fillStyle = gv(0.35, 0.6); g.beginPath(); g.ellipse(inX + sgn * 6, cy - 6, 28, 46, 0, 0, 2 * PI); g.fill();
    g.fillStyle = gv(0.5, 0.45); g.beginPath(); g.ellipse(cx, cy - 58, 100, 18, 0, 0, 2 * PI); g.fill();
    g.fillStyle = gv(0.3, 0.55); g.beginPath(); g.ellipse(cx + sgn * 12, cy + 56, 90, 13, 0, 0, 2 * PI); g.fill();
    g.fillStyle = gv(0.5, 0.35); g.beginPath(); g.ellipse(cx + sgn * 104, cy + 4, 16, 34, 0, 0, 2 * PI); g.fill();
    g.restore();
    // a sunken ring hugging the eye (the lids and sockets are shaded in the source), and cross-hatching wedged
    // between the inner corner and the bridge of the nose
    {
      const E = EYES[sgn < 0 ? 0 : 1];
      g.save(); g.filter = "blur(9px)"; g.strokeStyle = gv(0.3, 0.5); g.lineWidth = 34; g.lineJoin = "round";
      g.beginPath(); const q = sampleCurve(E.up0, 6); g.moveTo(q[0][0], q[0][1]); for (const p of q) g.lineTo(p[0], p[1]);
      for (const p of sampleCurve(E.lo0, 6).reverse()) g.lineTo(p[0], p[1]); g.closePath(); g.stroke(); g.restore();
    }
    hatchPatch(g, inX + sgn * 2, cy - 22, 20, 34, sgn > 0 ? 2.2 : 0.95, 40, 30, 1.1, gv(0.05, 0.5), 97 + cx, 0.2);
    hatchPatch(g, inX + sgn * 2, cy - 22, 20, 34, sgn > 0 ? 1.1 : 2.05, 30, 26, 1.0, gv(0.05, 0.45), 98 + cx, 0.2);
    // under the brow: strokes combing down toward the lid crease
    const brow = [[cx - 95, cy - 58], [cx - 45, cy - 72], [cx, cy - 76], [cx + 45, cy - 72], [cx + 95, cy - 58]];
    combRows(g, brow, 3, 7, 18, PI / 2 - 0.2 * sgn, 1.1, gv(0.06, 0.45), 70 + cx, { step: 5 });
    // under the lower lid: short curved strokes hanging from the lid
    const bag = [[cx - 90, cy + 34], [cx - 45, cy + 46], [cx, cy + 50], [cx + 45, cy + 47], [cx + 92, cy + 34]];
    combRows(g, bag, 2, 6, 22, 1.3 + 0.2 * sgn, 1.2, gv(0.05, 0.5), 50 + cx, { step: 3.6 });
    // outer corner: a few lines fanning out
    hatchPatch(g, cx + sgn * 104, cy + 6, 14, 26, sgn > 0 ? 2.5 : 0.65, 18, 24, 1.0, gv(0.08, 0.5), 90 + cx);
  }
  // brows: dense short hairs along a band
  for (const [pts, seed, a] of [[[[806, 196], [840, 186], [880, 190], [915, 205], [944, 224]], 101, 0.35], [[[1112, 224], [1140, 205], [1175, 190], [1215, 186], [1255, 194]], 102, -0.35]]) {
    const q = sampleCurve(pts, 16), rb = rng(seed);
    for (let i = 0; i < 300; i++) {
      const p = q[Math.floor(rb() * q.length)], x = p[0] + (rb() - 0.5) * 6, y = p[1] + (rb() - 0.5) * 18, L = 14 + rb() * 16;
      const aa = a + (rb() - 0.5) * 0.6 + (p[0] < 1000 ? -0.2 : 0.2);
      strand(g, [[x, y + 6], [x + Math.cos(aa) * L, y + 6 - Math.sin(Math.abs(aa)) * L * 0.4]], 2.2 + rb() * 1.6, INKC, { per: 2, head: 0.2 });
    }
  }
  // nose: bridge hatching, alae, nostrils, the shadow under the tip
  hatchPatch(g, 995, 480, 14, 70, PI / 2 + 0.1, 40, 28, 1.1, gv(0.1, 0.45), 111);
  hatchPatch(g, 1105, 470, 10, 60, PI / 2 - 0.05, 26, 26, 1.0, gv(0.1, 0.35), 112);
  line(g, [[985, 512], [968, 545], [966, 572], [982, 586], [996, 588]], 2.6, INKC);
  line(g, [[1112, 515], [1130, 548], [1132, 572], [1116, 586], [1102, 589]], 2.6, INKC);
  line(g, [[1020, 596], [1050, 600], [1080, 596]], 1.8, gv(0.1, 0.7));
  for (const [x0, x1, s] of [[994, 1020, 1], [1080, 1106, -1]]) {
    g.beginPath();
    smoothPath(g, [[x0, 585], [(x0 + x1) / 2, 581], [x1, 586], [(x0 + x1) / 2, 589]], true);
    g.fillStyle = gv(0.1, 0.85); g.fill();
  }
  hatchPatch(g, 1050, 610, 45, 6, 0.08, 40, 20, 1.0, gv(0.1, 0.5), 113);
  // nasolabial and cheek lines
  line(g, [[942, 575], [932, 610], [936, 645]], 1.4, gv(0.1, 0.5));
  line(g, [[1158, 575], [1168, 612], [1162, 648]], 1.4, gv(0.1, 0.5));
  // philtrum
  line(g, [[1040, 650], [1036, 675]], 1.2, gv(0.1, 0.5));
  line(g, [[1062, 650], [1066, 675]], 1.2, gv(0.1, 0.5));
  // mouth: the upper lip over the teeth, the teeth biting the pencil
  g.beginPath(); smoothPath(g, [[950, 699], [990, 694], [1050, 697], [1110, 694], [1155, 699], [1110, 712], [1050, 712], [990, 712]], true);
  g.fillStyle = gv(0.62); g.fill();
  // teeth
  const teeth = [[985, 1010], [1012, 1047], [1049, 1090], [1092, 1125]];
  for (const [a, b] of teeth) {
    g.beginPath(); g.moveTo(a, 703); g.quadraticCurveTo((a + b) / 2, 699, b, 703); g.lineTo(b, 716); g.lineTo(a, 716); g.closePath();
    g.fillStyle = gv(0.96); g.fill(); g.strokeStyle = gv(0.1, 0.8); g.lineWidth = 1.4; g.stroke();
  }
  line(g, [[940, 695], [980, 689], [1020, 692], [1050, 695], [1080, 692], [1120, 689], [1165, 696]], 2.6, INKC);
  // lip shading above the mouth (upper lip)
  hatchPatch(g, 1050, 683, 70, 6, 0.0, 40, 22, 1.0, gv(0.1, 0.45), 114);
  // lower lip under the pencil and the chin shadow
  line(g, [[960, 752], [1000, 758], [1050, 760], [1100, 757], [1140, 750]], 1.8, gv(0.1, 0.7));
  g.save(); g.beginPath(); g.ellipse(1055, 783, 75, 12, 0, 0, 2 * PI); g.clip();
  hatchPatch(g, 1055, 783, 75, 12, 0.05, 90, 24, 1.1, gv(0.08, 0.6), 115);
  g.restore();
  line(g, [[985, 772], [1020, 790], [1055, 794], [1090, 790], [1130, 772]], 2.2, INKC);
  // jaw lines down to the laptop
  line(g, [[828, 742], [860, 780], [892, 812]], 3.2, INKC, { end: 0.4 });
  line(g, [[1300, 742], [1262, 780], [1222, 812]], 3.2, INKC, { end: 0.4 });
  // stubble: short dark ticks round the mouth and on the chin
  const rs = rng(121);
  for (const [cx, cy, rx, ry, n] of [[905, 690, 45, 50, 110], [1195, 690, 45, 50, 110], [1055, 800, 140, 16, 140], [880, 770, 40, 30, 60], [1230, 770, 40, 30, 60], [1050, 660, 90, 12, 70]]) {
    for (let i = 0; i < n; i++) {
      let x, y; do { x = rs() * 2 - 1; y = rs() * 2 - 1; } while (x * x + y * y > 1);
      const px = cx + x * rx, py = cy + y * ry, L = 5 + rs() * 7, a = PI / 2 + (px - 1050) * 0.002 + (rs() - 0.5) * 0.5;
      strand(g, [[px, py], [px + Math.cos(a) * L, py + Math.sin(a) * L]], 1.3 + rs() * 0.8, gv(0.08, 0.7), { per: 2, head: 0.3 });
    }
  }
  // eye-lid creases above the eyes
  line(g, [[758, 290], [800, 262], [850, 254], [905, 262], [936, 283]], 2.0, gv(0.08, 0.85));
  line(g, [[1146, 285], [1180, 262], [1232, 254], [1285, 262], [1318, 290]], 2.0, gv(0.08, 0.85));
}

// ---------- hair ----------
// solid caps under the beanie, then separate locks hanging to pointed tips (gaps between them), skin showing at the
// temples; white partings run down the black. Traced from 2x grids (g-hairL2.jpg, g-hairR2.jpg, g-hairC.jpg).
// dark-run measurements of the source at 8.0 s (row by row) set these outlines
const CAP_L = [[897, 128], [806, 128], [740, 150], [705, 180], [670, 240], [645, 300], [615, 355], [592, 368], [566, 400], [560, 440], [578, 490], [600, 522],
  [616, 560], [640, 608], [680, 646], [712, 690], [770, 690], [760, 640], [748, 600], [738, 560], [728, 520], [722, 470], [720, 420], [728, 372], [746, 338],
  [776, 310], [764, 280], [792, 250], [820, 222], [866, 192], [868, 160]];
const CAP_R = [[1250, 110], [1336, 150], [1400, 200], [1435, 265], [1462, 345], [1500, 370], [1515, 420], [1530, 462], [1494, 490], [1484, 520], [1484, 552],
  [1452, 582], [1444, 612], [1446, 640], [1398, 672], [1344, 706], [1331, 670], [1343, 640], [1353, 610], [1359, 580], [1365, 550], [1390, 520], [1422, 492],
  [1362, 452], [1360, 400], [1358, 342], [1348, 310], [1316, 282], [1312, 250], [1307, 220], [1314, 190], [1280, 160], [1262, 132]];
const LOCKS = [
  // [root, mid, tip, width]: pointed locks along the lower edges of the masses
  [[600, 500], [590, 560], [585, 610], 24], [[640, 560], [652, 620], [660, 668], 26], [[690, 600], [700, 660], [712, 718], 28],
  [[730, 600], [748, 670], [770, 730], 22], [[752, 560], [770, 640], [790, 700], 12], [[700, 470], [690, 540], [672, 590], 14],
  [[1350, 600], [1340, 670], [1332, 728], 26], [[1380, 600], [1390, 660], [1402, 700], 24], [[1420, 580], [1450, 640], [1478, 682], 20],
  [[1460, 540], [1500, 590], [1530, 620], 16], [[1340, 560], [1325, 640], [1312, 690], 10], [[1480, 470], [1520, 500], [1552, 516], 12],
];
// one lock of hair: a black blade along a centre curve, full at the root and pointed at the tip, with a couple of
// thin white partings running along it (the ink's sheen); `bias` shifts the partings toward one edge
function lock(g, pts, w, seed, { part = 2, bias = 0, pow = 0.85 } = {}) {
  const q = sampleCurve(pts, 10);
  taper(g, q, (u) => w * Math.min(1, 0.55 + u * 4) * Math.pow(1 - u, pow), INKC);
  const r = rng(seed);
  const n = q.length;
  for (let k = 0; k < part; k++) {
    const off = (r() - 0.5 + bias) * 0.7, i0 = Math.floor(n * (0.05 + 0.25 * r())), i1 = Math.floor(n * (0.55 + 0.4 * r()));
    const pp = [];
    for (let i = i0; i <= i1; i++) {
      const a = q[Math.max(0, i - 1)], b = q[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      const u = i / (n - 1), hw = w * 0.5 * Math.min(1, 0.55 + u * 4) * Math.pow(1 - u, pow);
      pp.push([q[i][0] - dy / d * off * hw * 2, q[i][1] + dx / d * off * hw * 2]);
    }
    if (pp.length > 2) taper(g, pp, (u) => (0.9 + 1.4 * r()) * Math.pow(Math.sin(PI * u), 0.7), wv(0.55 + 0.4 * r()));
  }
}
// hair locks (root, mid, tip, width), laid out so their union fills the dark-run measurements of the source at
// 8.0 s; the outer ones first so the inner ones overlap them
const HAIR = [
  // left mass (his left temple, viewer's left)
  [[606, 362], [566, 430], [576, 500], 44], [[630, 336], [586, 440], [602, 540], 50], [[652, 290], [610, 440], [640, 650], 56],
  [[680, 232], [648, 410], [690, 690], 58], [[712, 186], [690, 410], [722, 720], 54], [[744, 156], [728, 390], [772, 720], 44],
  [[722, 330], [736, 480], [758, 644], 26], [[786, 138], [752, 250], [744, 370], 46], [[826, 128], [790, 206], [760, 316], 40],
  [[866, 122], [836, 170], [798, 236], 30], [[896, 120], [880, 150], [866, 190], 22], [[700, 440], [690, 520], [676, 580], 22],
  // right mass
  [[1256, 112], [1284, 170], [1302, 250], 30], [[1300, 128], [1318, 230], [1344, 360], 44], [[1344, 150], [1360, 300], [1368, 452], 50],
  [[1392, 190], [1396, 330], [1392, 440], 52], [[1432, 246], [1452, 360], [1444, 462], 46], [[1466, 330], [1506, 400], [1520, 470], 40],
  [[1354, 360], [1368, 530], [1338, 730], 44], [[1396, 470], [1410, 600], [1396, 710], 48], [[1440, 440], [1468, 560], [1452, 680], 44],
  [[1478, 452], [1500, 510], [1486, 572], 30], [[1332, 290], [1348, 420], [1366, 540], 24],
];
const FORE = [
  // the forelock: strands leave the cuff across x 960–1110 and gather into one lock that ends at (944, 398)
  [[972, 104], [990, 200], [966, 330], [944, 398], 30], [[1010, 100], [1020, 210], [990, 330], [956, 380], 34], [[1050, 100], [1044, 220], [1008, 320], 32],
  [[1088, 104], [1064, 210], [1030, 290], 30], [[1108, 106], [1090, 170], [1062, 230], 20],
  // loose strands across the brow
  [[950, 110], [948, 200], [942, 312], 12], [[930, 110], [912, 170], [896, 222], 12], [[902, 114], [880, 150], [860, 190], 10],
  [[1150, 102], [1166, 170], [1170, 240], [1160, 300], 10], [[1182, 104], [1196, 180], [1200, 250], 9], [[1210, 108], [1222, 160], [1226, 200], 9],
  [[1232, 112], [1254, 172], [1278, 226], [1290, 256], 12],
];
function paintHair(g) {
  const r = rng(201);
  // the solid core of each side mass (the measured dark runs, pulled in ~15 px so the lock tips make the edge)
  fillPath(g, blob([[897, 128], [806, 128], [740, 150], [705, 180], [670, 240], [645, 300], [615, 355], [592, 372], [576, 410], [580, 450], [600, 500],
    [626, 546], [660, 590], [700, 610], [744, 600], [738, 560], [730, 520], [724, 470], [722, 420], [730, 372], [746, 338], [770, 306], [764, 280], [790, 250],
    [818, 222], [860, 190], [866, 160]]), INKC);
  fillPath(g, blob([[1250, 112], [1336, 150], [1400, 200], [1435, 265], [1462, 345], [1496, 376], [1508, 420], [1500, 460], [1476, 500], [1466, 540],
    [1440, 580], [1400, 610], [1364, 600], [1366, 550], [1392, 520], [1418, 492], [1364, 452], [1360, 400], [1358, 342], [1348, 310], [1318, 282],
    [1312, 250], [1308, 220], [1312, 190], [1280, 160], [1262, 132]]), INKC);
  HAIR.forEach(([a, m, b, w], i) => lock(g, [a, m, b], w * 1.25, 220 + i, { part: w > 30 ? 3 : 1, bias: a[0] < 1000 ? 0.15 : -0.15 }));
  // skin at the temples: small light gaps between the locks (measured)
  fillPath(g, poly([[664, 482], [688, 474], [708, 494], [720, 522], [702, 530], [684, 514]]), gv(0.95));
  fillPath(g, poly([[1394, 440], [1414, 436], [1426, 454], [1424, 480], [1404, 474]]), gv(0.95));
  // thin flyaways at the lock ends
  for (let i = 0; i < 80; i++) {
    const left = i % 2 === 0;
    const x0 = left ? 580 + r() * 190 : 1330 + r() * 170, y0 = 380 + r() * 240;
    const dx = (left ? -1 : 1) * (5 + r() * 40) + (r() - 0.5) * 30, dy = 60 + r() * 130;
    strand(g, [[x0, y0], [x0 + dx * 0.4, y0 + dy * 0.5], [x0 + dx, y0 + dy]], 1.5 + r() * 3.5, INKC, { per: 6, head: 0.05 });
  }
  FORE.forEach((L, i) => { const w = L[L.length - 1]; lock(g, L.slice(0, -1), w * (w > 20 ? 1.35 : 1), 260 + i, { part: w > 20 ? 2 : 0, pow: 0.6 }); });
  for (let i = 0; i < 16; i++) {
    const x0 = (i % 2 ? 1120 + r() * 160 : 880 + r() * 70), y0 = 100 + r() * 16;
    const dx = (x0 - 1040) * (0.3 + r() * 0.5), dy = 80 + r() * 160;
    strand(g, [[x0, y0], [x0 + dx * 0.4, y0 + dy * 0.5], [x0 + dx, y0 + dy]], 1.5 + r() * 3, INKC, { per: 6, head: 0.05 });
  }
}

// ---------- beanie ----------
function paintBeanie(g) {
  const path = (c) => { const q = sampleCurve(BEANIE, 6, true); c.moveTo(q[0][0], q[0][1]); for (const p of q) c.lineTo(p[0], p[1]); c.closePath(); };
  // grey knit, lit in the middle, falling to dark at both sides
  fillPath(g, path, (() => { const r = g.createLinearGradient(560, 0, 1505, 0); r.addColorStop(0, gv(0.3)); r.addColorStop(0.14, gv(0.62)); r.addColorStop(0.35, gv(0.95)); r.addColorStop(0.55, gv(0.97)); r.addColorStop(0.75, gv(0.85)); r.addColorStop(0.9, gv(0.5)); r.addColorStop(1, gv(0.2)); return r; })());
  clipTo(g, path, () => {
    // the crown above the fold is a little darker; the cuff darkens toward its lower edge
    g.beginPath(); g.moveTo(540, -400); for (const p of FOLD) g.lineTo(p[0], p[1]); g.lineTo(1540, -400); g.closePath();
    g.fillStyle = gv(0.1, 0.3); g.fill();
    const low = g.createLinearGradient(0, 0, 0, 140); low.addColorStop(0, gv(0.1, 0)); low.addColorStop(1, gv(0.1, 0.2));
    g.fillStyle = low; g.fillRect(540, 0, 1000, 400);
    // ribs: alternating dark and pale bands, ~12 px period, fanning round the curve of the head
    const r = rng(301);
    const O = [1030, 1400];
    for (let i = 0; i < 106; i++) {
      const f = i / 105, x = 400 + f * 1260;
      const pts = [];
      for (let k = 0; k <= 16; k++) {
        const y = -360 + k * 48, u = (y + 360) / (O[1] + 360);
        pts.push([x + (O[0] - x) * u * 0.6 + Math.sin(k * 1.9 + i * 0.7) * 1.6, y]);
      }
      const edge = Math.min(1, Math.abs(x - 1030) / 480);
      line(g, pts, 4.0 + 1.6 * edge, gv(0.04, 0.45 + 0.35 * edge), { end: 0.8 });
      if (edge < 0.8) line(g, pts.map(([px, py]) => [px + 5.5, py]), 2.2, gv(0.97, 0.35 * (1 - edge)), { end: 0.8 });
    }
    // knit courses: rows of short dark stitches across the ribs, denser toward the lower edge of the cuff
    const rk = rng(306);
    for (let y = -340; y < 380; y += 8) {
      const dens = y > 20 ? 0.75 : 0.45;
      for (let x = 420; x < 1650; x += 12) {
        if (rk() > dens) continue;
        const u = (y + 360) / (O[1] + 360), xx = x + (O[0] - x) * u * 0.6 + (rk() - 0.5) * 3;
        g.strokeStyle = gv(0.05, 0.3 + 0.25 * rk()); g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(xx - 4, y - 2); g.lineTo(xx, y + 2.5); g.lineTo(xx + 4, y - 2); g.stroke();
      }
    }
    // cross-hatched patches across the crown (the source's knit shading)
    for (const [cx, cy, rx, ry, a, n, seed] of [[760, 20, 60, 50, 0.9, 60, 313], [1320, 0, 60, 50, 2.2, 60, 314], [640, -120, 50, 80, 1.2, 80, 316], [1400, -120, 50, 80, 1.9, 80, 317], [700, -250, 60, 60, 0.7, 70, 311], [1330, -250, 60, 60, 2.4, 70, 312]]) {
      hatchPatch(g, cx, cy, rx, ry, a, n, 30, 1.4, gv(0.03, 0.5), seed, 0.2);
      hatchPatch(g, cx, cy, rx, ry, a + 1.3, Math.round(n * 0.7), 26, 1.2, gv(0.03, 0.45), seed + 50, 0.2);
    }
    // cross-hatching on the dark sides
    for (const [cx, a, seed] of [[610, 1.2, 302], [1462, 1.95, 303], [630, 0.35, 304], [1440, 2.8, 305], [700, 0.9, 307], [1380, 2.25, 308]]) hatchPatch(g, cx, 170, 70, 230, a, 260, 30, 1.5, gv(0.02, 0.55), seed, 0.2);
  });
  // fold line between crown and cuff, and the cuff edge over the hair
  line(g, FOLD, 5, INKC, { end: 0.5 });
  line(g, CUFF_EDGE, 7, INKC, { end: 0.5 });
  line(g, BEANIE.slice(0, 23), 3, INKC, { end: 0.6, per: 10 });
}

// ---------- sweat drops (drawn per frame; y offset animates) ----------
export const DROPS = [
  { x: 820, y: 527, s: 1.0, slide: [6.04, 8.1, 28] },
  { x: 1275, y: 522, s: 0.95, slide: [6.04, 8.1, 25] },
  { x: 1116, y: 418, s: 1.0, slide: [6.04, 7.25, 12] },
  { x: 803, y: 443, s: 0.5 },
  { x: 1147, y: 113, s: 0.8 },
  { x: 1185, y: 100, s: 0.7 },
  { x: 868, y: 148, s: 0.8 },
];
export function drop(g, x, y, s) {
  // a bead: a pointed top, round belly, dark outline heavier on the lower right, a white glint
  const h = 30 * s, w = 12 * s;
  g.beginPath();
  g.moveTo(x, y - h * 0.55);
  g.bezierCurveTo(x + w * 0.2, y - h * 0.1, x + w * 0.55, y + h * 0.05, x + w * 0.5, y + h * 0.25);
  g.bezierCurveTo(x + w * 0.45, y + h * 0.5, x - w * 0.45, y + h * 0.5, x - w * 0.5, y + h * 0.25);
  g.bezierCurveTo(x - w * 0.55, y + h * 0.05, x - w * 0.2, y - h * 0.1, x, y - h * 0.55);
  g.fillStyle = gv(0.9); g.fill();
  g.lineWidth = 1.6 * s + 0.6; g.strokeStyle = gv(0.1, 0.85); g.stroke();
  g.beginPath(); g.arc(x + w * 0.1, y + h * 0.28, w * 0.28, -0.2, PI * 0.9); g.lineWidth = 2.2 * s + 0.6; g.strokeStyle = INKC; g.stroke();
}

// ---------- pencil ----------
function paintPencil(g) {
  const y0 = 711, y1 = 746, yc = (y0 + y1) / 2;
  // body (pale wood with a faint grain), from the sharpened cone to the ferrule
  g.beginPath(); g.moveTo(795, y0 + 1); g.lineTo(1312, y0 - 1); g.lineTo(1312, y1 - 1); g.lineTo(795, y1 + 1); g.closePath();
  const bg = g.createLinearGradient(0, y0, 0, y1); bg.addColorStop(0, gv(0.93)); bg.addColorStop(0.35, gv(0.85)); bg.addColorStop(0.7, gv(0.7)); bg.addColorStop(1, gv(0.55));
  g.fillStyle = bg; g.fill();
  line(g, [[800, 722], [1305, 720]], 1.2, gv(0.3, 0.6));
  line(g, [[800, 736], [1305, 734]], 1.2, gv(0.25, 0.6));
  const r = rng(401);
  for (let i = 0; i < 40; i++) { const x = 820 + r() * 470, y = y0 + 4 + r() * (y1 - y0 - 8); line(g, [[x, y], [x + 20 + r() * 40, y + (r() - 0.5)]], 1, gv(0.3, 0.4)); }
  // sharpened cone and the lead
  g.beginPath(); g.moveTo(795, y0 + 1); g.lineTo(707, yc + 1); g.lineTo(795, y1 + 1); g.closePath();
  const cg = g.createLinearGradient(0, y0, 0, y1); cg.addColorStop(0, gv(0.92)); cg.addColorStop(1, gv(0.72));
  g.fillStyle = cg; g.fill();
  g.beginPath(); g.moveTo(735, yc - 6); g.lineTo(707, yc + 1); g.lineTo(735, yc + 7); g.closePath(); g.fillStyle = gv(0.15); g.fill();
  // scalloped edge where the paint meets the cone
  g.strokeStyle = INKC; g.lineWidth = 2;
  g.beginPath(); g.moveTo(795, y0 + 1); for (let k = 0; k <= 4; k++) { const yy = y0 + 1 + k * (y1 - y0) / 4; g.lineTo(k % 2 ? 788 : 796, yy); } g.stroke();
  // ferrule (metal band, ringed) and eraser
  g.beginPath(); g.rect(1312, y0 - 3, 48, y1 - y0 + 5);
  const fg = g.createLinearGradient(0, y0 - 3, 0, y1 + 2); fg.addColorStop(0, gv(0.95)); fg.addColorStop(0.4, gv(0.75)); fg.addColorStop(0.8, gv(0.45)); fg.addColorStop(1, gv(0.6));
  g.fillStyle = fg; g.fill();
  for (const x of [1318, 1326, 1344, 1352]) line(g, [[x, y0 - 2], [x, y1 + 1]], 1.4, gv(0.15, 0.8));
  g.beginPath(); g.roundRect(1360, y0 - 1, 32, y1 - y0 + 1, [0, 6, 6, 0]);
  const eg = g.createLinearGradient(0, y0, 0, y1); eg.addColorStop(0, gv(0.9)); eg.addColorStop(1, gv(0.62));
  g.fillStyle = eg; g.fill();
  // outline
  g.strokeStyle = INKC; g.lineWidth = 2.2; g.lineJoin = "round";
  g.beginPath(); g.moveTo(707, yc + 1); g.lineTo(795, y0 + 1); g.lineTo(1312, y0 - 1); g.moveTo(707, yc + 1); g.lineTo(795, y1 + 1); g.lineTo(1312, y1 - 1); g.stroke();
  g.strokeRect(1312, y0 - 3, 48, y1 - y0 + 5);
  g.beginPath(); g.roundRect(1360, y0 - 1, 32, y1 - y0 + 1, [0, 6, 6, 0]); g.stroke();
}

// ---------- laptop lid ----------
function paintLaptop(g) {
  const { x0, x1, y, r } = LAPTOP;
  g.beginPath(); g.moveTo(x0, 960); g.lineTo(x0, y + r); g.quadraticCurveTo(x0, y, x0 + r, y); g.lineTo(x1 - r, y); g.quadraticCurveTo(x1, y, x1, y + r); g.lineTo(x1, 960); g.closePath();
  g.fillStyle = "#040404"; g.fill();
  // the lit bevel along the top edge: a pale band (~0.7) with a thin darker line inside it (measured 8.0 s)
  g.fillStyle = gv(0.7); g.fillRect(x0 + 8, y + 3, x1 - x0 - 16, 14);
  g.fillStyle = gv(0.3, 0.8); g.fillRect(x0 + 8, y + 9, x1 - x0 - 16, 1.6);
  const r2 = rng(501);
  for (let i = 0; i < 30; i++) { const x = x0 + 40 + r2() * (x1 - x0 - 80), yy = y + 4 + r2() * 11; line(g, [[x, yy], [x + 30 + r2() * 90, yy]], 1.2, gv(0.95, 0.5)); }
  { const pts = []; for (let i = 0; i <= 60; i++) pts.push([x0 + r * 0.4 + (x1 - x0 - r * 0.8) * i / 60, y + 2]); taper(g, [[x0 + 2, y + r + 10], [x0 + 2, y + r * 0.4], ...pts, [x1 - 2, y + r * 0.4], [x1 - 2, y + r + 10]], 3, INKC); }
}

// ---------- the eyes ----------
// state: { dx, dy (iris offset px), look: 0 (stare) .. 1 (the narrowed look to screen-right) }
const EYES = [
  { c: [852, 322], side: -1,
    up0: [[749, 323], [772, 300], [805, 284], [850, 277], [895, 283], [925, 300], [942, 338]],
    lo0: [[749, 326], [775, 346], [806, 358], [850, 364], [900, 358], [928, 350], [942, 341]],
    up1: [[749, 330], [775, 312], [805, 302], [850, 298], [898, 302], [928, 314], [942, 339]],
    lo1: [[749, 328], [775, 348], [806, 360], [850, 366], [900, 360], [928, 351], [942, 342]],
    iris1: [894, 335] },
  { c: [1232, 317], side: 1,
    up0: [[1140, 336], [1158, 306], [1192, 286], [1232, 277], [1272, 280], [1302, 294], [1326, 318]],
    lo0: [[1140, 339], [1170, 352], [1210, 360], [1250, 362], [1292, 351], [1318, 334], [1326, 321]],
    up1: [[1140, 336], [1160, 314], [1195, 300], [1235, 294], [1275, 296], [1305, 305], [1326, 322]],
    lo1: [[1140, 339], [1170, 353], [1210, 361], [1250, 363], [1292, 352], [1318, 335], [1326, 322]],
    iris1: [1266, 320] },
];
const mixPts = (a, b, t) => a.map((p, i) => [p[0] + (b[i][0] - p[0]) * t, p[1] + (b[i][1] - p[1]) * t]);
export const EYE_BOX = [[730, 250, 230, 140], [1120, 245, 230, 140]];

export function paintEye(g, E, st) {
  const k = st.look;
  const up = mixPts(E.up0, E.up1, k), lo = mixPts(E.lo0, E.lo1, k);
  const ic = [E.c[0] + st.dx + (E.iris1[0] - E.c[0]) * k, E.c[1] + st.dy + (E.iris1[1] - E.c[1]) * k];
  const ir = 28, pr = 6 + 1 * k;
  const opening = (c) => { const q = sampleCurve(up, 8); c.moveTo(q[0][0], q[0][1]); for (const p of q) c.lineTo(p[0], p[1]); const l = sampleCurve(lo, 8).reverse(); for (const p of l) c.lineTo(p[0], p[1]); c.closePath(); };
  // the white, faintly shaded under the upper lid, with a few veins at the corners
  g.save(); g.beginPath(); opening(g); g.clip();
  g.fillStyle = gv(0.97); g.fillRect(E.c[0] - 120, E.c[1] - 70, 240, 140);
  const sh = g.createLinearGradient(0, E.c[1] - 45, 0, E.c[1] + 10); sh.addColorStop(0, gv(0.55, 0.55)); sh.addColorStop(1, gv(0.9, 0));
  g.fillStyle = sh; g.fillRect(E.c[0] - 120, E.c[1] - 70, 240, 80);
  const rv = rng(E.side > 0 ? 601 : 602);
  for (let i = 0; i < 9; i++) {
    const corner = rv() < 0.5 ? up[0] : up[up.length - 1], cx = corner[0] + (corner === up[0] ? 1 : -1) * (8 + rv() * 20), cy = E.c[1] + (rv() - 0.3) * 20;
    const a = (corner === up[0] ? 0 : PI) + (rv() - 0.5) * 1.2;
    line(g, [[cx, cy], [cx + Math.cos(a) * 12, cy + Math.sin(a) * 12 + (rv() - 0.5) * 6], [cx + Math.cos(a) * 22, cy + Math.sin(a) * 22]], 1.0, gv(0.3, 0.5));
  }
  // iris: pale with radial striations (stare) or grey (the narrowed look), dark limbal ring, black pupil
  g.beginPath(); g.arc(ic[0], ic[1], ir, 0, 2 * PI);
  g.fillStyle = gv(0.86 - 0.28 * k); g.fill();
  const rs = rng(E.side > 0 ? 611 : 612);
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * 2 * PI + rs() * 0.05, r0 = pr + 3 + rs() * 3, r1 = ir * (0.72 + rs() * 0.25);
    line(g, [[ic[0] + Math.cos(a) * r0, ic[1] + Math.sin(a) * r0], [ic[0] + Math.cos(a) * r1, ic[1] + Math.sin(a) * r1]], 1.3, gv(0.2, 0.5 + 0.2 * k));
  }
  g.beginPath(); g.arc(ic[0], ic[1], ir - 2, 0, 2 * PI); g.lineWidth = 4; g.strokeStyle = INKC; g.stroke();
  g.beginPath(); g.arc(ic[0], ic[1], ir * 0.55, 0, 2 * PI); g.lineWidth = 1; g.strokeStyle = gv(0.2, 0.4); g.stroke();
  g.beginPath(); g.arc(ic[0], ic[1], pr, 0, 2 * PI); g.fillStyle = INKC; g.fill();
  if (k > 0.5) { g.beginPath(); g.arc(ic[0] - pr * 0.6, ic[1] - pr * 0.7, 2.6, 0, 2 * PI); g.fillStyle = gv(0.97); g.fill(); }
  // the upper lid's shadow on the eyeball
  const ls = g.createLinearGradient(0, E.c[1] - 45 + 10 * k, 0, E.c[1] - 20 + 10 * k); ls.addColorStop(0, gv(0.1, 0.5)); ls.addColorStop(1, gv(0.1, 0));
  g.fillStyle = ls; g.fillRect(E.c[0] - 120, E.c[1] - 70, 240, 70);
  g.restore();
  // inner corner (caruncle): a small dark wedge
  const ic0 = E.side < 0 ? up[up.length - 1] : up[0], dirIn = E.side < 0 ? -1 : 1;
  g.beginPath(); g.moveTo(ic0[0], ic0[1] + 2); g.quadraticCurveTo(ic0[0] + dirIn * 14, ic0[1] - 8, ic0[0] + dirIn * 22, ic0[1] + 2); g.quadraticCurveTo(ic0[0] + dirIn * 12, ic0[1] + 8, ic0[0], ic0[1] + 2);
  g.fillStyle = gv(0.35, 0.8); g.fill();
  // heavy upper lid line, extended as a flick past the outer corner; the lower rim, then the lower lid with lashes
  // heavy upper lid (no flick: the source's outer corner is rounded), a heavy lower rim, a second lower lid line
  line(g, up, 9 + 2 * k, INKC, { end: 0.35, pow: 0.4 });
  line(g, lo, 5, INKC, { end: 0.35, pow: 0.5 });
  const lo2 = lo.map((p, i) => [p[0], p[1] + 10 + 6 * Math.sin(PI * i / (lo.length - 1))]);
  line(g, lo2, 2.6, gv(0.08, 0.9), { end: 0.2 });
  // the lid crease above: a thinner line following the lid ~26 px higher
  line(g, up.map((p, i) => [p[0] + (i - 3) * 2, p[1] - 22 - 8 * Math.sin(PI * i / (up.length - 1))]), 2.2, gv(0.08, 0.8), { end: 0.1 });
  const q = sampleCurve(lo2, 6), rl = rng(E.side > 0 ? 621 : 622);
  for (let i = 2; i < q.length - 2; i += 2) {
    const p = q[i];
    line(g, [[p[0], p[1] - 4], [p[0] + (rl() - 0.5) * 3, p[1] + 3]], 2.2, gv(0.08, 0.8));
  }
}
export const EYE_DEFS = EYES;

// ---------- the whole static drawing ----------
export function paintDesigner(g) {
  g.lineCap = "round"; g.lineJoin = "round";
  paintHoodie(g);
  paintFace(g);
  paintHair(g);
  paintBeanie(g);
  paintPencil(g);
  paintLaptop(g);
}
