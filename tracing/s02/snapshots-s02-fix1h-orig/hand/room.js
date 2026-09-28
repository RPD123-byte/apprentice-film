// s02: the dark room behind him, scratched white into black. World coords = the 6.04 s frame.
// Stare view: layout read off 1.1-1.4x grid crops of the stare average (posts, shelf boards, cables, mesh panels).
import { mk, gv, poly, blob, fillPath, withClip, ribbon, P_SWELL, PI } from "./pen.js";
import { wood, mesh, wline, beads, glow, rect } from "./scratch.js";
import { sampleCurve } from "../../../lib/paths.js";
import { applyTone } from "./tone.js";
import { ROOM_TONE, HOLD_TONE } from "./tonedata.js";


function paintNear(g) {
  // ---- left: a wide upright post at the frame edge (wood grain), a thin upright, mesh behind the cables
  const LP = poly([[-60, 95], [0, 100], [100, 132], [104, 1000], [-60, 1000]]);
  wood(g, LP, [-60, 90, 106, 1000], { sp: 5.2, v: 0.42, seed: 301, len: [80, 500], val: (x) => 0.55 - Math.max(0, x - 40) * 0.004 });
  mesh(g, rect(72, -460, 152, 250), [72, -460, 152, 250], { v: 0.16, pitch: 6.4, seed: 302 });
  mesh(g, rect(0, -460, 72, 95), [0, -460, 72, 95], { v: 0.1, pitch: 6.4, seed: 303 });
  for (const x of [190, 212]) wline(g, [[x, -460], [x + 1, 100], [x, 430]], 2.6, 0.8);
  // shelf board and the mesh panels under it
  wood(g, rect(228, 360, 610, 418), [228, 360, 610, 418], { dir: 1, sp: 8.5, v: 0.36, seed: 304, len: [100, 380] });
  mesh(g, rect(230, 418, 330, 650), [230, 418, 330, 650], { v: 0.22, pitch: 6.4, seed: 305 });
  mesh(g, rect(330, 418, 470, 490), [330, 418, 470, 490], { v: 0.18, pitch: 6.4, seed: 306 });
  mesh(g, rect(230, 330, 330, 360), [230, 330, 330, 360], { v: 0.12, pitch: 6.4, seed: 307 });
  // cables hanging from above
  wline(g, [[276, -460], [276, -200], [272, 0], [262, 120], [235, 230], [195, 330], [150, 400], [112, 445]], 7, 0.85, 0.8, 0.8);
  ribbon(g, sampleCurve([[276, -460], [276, -200], [272, 0], [262, 120], [235, 230], [195, 330], [150, 400], [112, 445]], 8), 2.4, gv(0.02));
  beads(g, [[520, -460], [512, -200], [505, 0], [495, 60], [470, 130], [430, 190], [380, 230], [320, 265], [260, 300], [215, 330]], { w: 5, len: 4, gapL: 3.5 });
  beads(g, [[430, -460], [428, -200], [428, 0], [425, 80], [430, 160], [435, 240], [438, 300], [434, 345]], { w: 4.6, len: 4, gapL: 3.5 });
  beads(g, [[172, 440], [166, 500], [168, 560], [176, 630], [182, 700]], { w: 4.4, len: 4, gapL: 3.5 });
  wline(g, [[100, 275], [150, 290], [190, 320]], 3, 0.7); wline(g, [[100, 355], [150, 370], [185, 380]], 3, 0.7);

  // ---- right: mesh panels (books, boxes), an upright post, shelf boards, a box with a knob
  mesh(g, rect(1480, -460, 1650, 232), [1480, -460, 1650, 232], { v: 0.26, pitch: 6.2, seed: 311 });
  mesh(g, rect(1650, -460, 1782, 520), [1650, -460, 1782, 520], { v: 0.24, pitch: 6.2, seed: 312, val: (x, y) => 0.24 * (0.6 + 0.4 * Math.abs(Math.sin(x * 0.07))) * (y > 250 ? 0.8 : 1) });
  mesh(g, rect(2030, -460, 2640, 232), [2030, -460, 2640, 232], { v: 0.26, pitch: 6.2, seed: 313 });
  wood(g, rect(1850, -460, 1902, 560), [1850, -460, 1902, 560], { sp: 5.5, v: 0.45, seed: 314, len: [100, 600] });
  wood(g, rect(1905, 240, 2640, 292), [1905, 240, 2640, 292], { dir: 1, sp: 7.5, v: 0.48, seed: 315, len: [120, 500] });
  wline(g, [[1905, 241], [2640, 238]], 2.2, 0.9); wline(g, [[1905, 291], [2640, 290]], 1.6, 0.6);
  const BOX = rect(1910, 440, 2640, 782);
  mesh(g, BOX, [1910, 440, 2640, 782], { v: 0.25, pitch: 6.2, seed: 316, val: (x, y) => 0.27 * (1 - Math.max(0, y - 600) / 400) });
  wood(g, rect(1910, 442, 2640, 480), [1910, 442, 2640, 480], { dir: 1, sp: 9, v: 0.3, seed: 317 });
  wline(g, [[1910, 442], [2640, 446]], 2, 0.8);
  g.beginPath(); g.arc(1972, 482, 12, 0, 2 * PI); g.lineWidth = 2.4; g.strokeStyle = gv(0.85, 0.8); g.stroke();
  wood(g, rect(1968, 780, 2640, 832), [1968, 780, 2640, 832], { dir: 1, sp: 8, v: 0.4, seed: 318 });
  mesh(g, rect(2050, 832, 2640, 1000), [2050, 832, 2640, 1000], { v: 0.2, pitch: 6.2, seed: 319 });
  // above the frame (seen as the pan starts): the upper shelf continues
  wood(g, rect(1400, -140, 1850, -108), [1400, -140, 1850, -108], { dir: 1, sp: 8, v: 0.35, seed: 320 });
  wood(g, rect(150, -140, 640, -108), [150, -140, 640, -108], { dir: 1, sp: 8, v: 0.35, seed: 321 });
  mesh(g, rect(640, -460, 1480, -140), [640, -460, 1480, -140], { v: 0.12, pitch: 6.4, seed: 322 });
}

// ---------------- the carton stack (the view the pan stops on, 14.44 s) ----------------
// Face polygons in HOLD-frame px (the frame at 14.44–16.5 s); world = hold + BOX_OFF. Read off 1.0–1.5x grid crops of the
// hold average (snapshots/s02-r3-meas/z/hb1, hb2, holdB, holdC). v = face value (pre-grade paint), side = shaded side face.
export const BOX_OFF = [2203.3, -1893.4];
export const HOLD_BOX = [-300, -40, 2300, 1000];   // hold-frame rect of the carton-view canvas
const FACES = [
  // left, dim cluster
  { p: [[100, 430], [240, 490], [240, 620], [100, 600]], v: 0.113 }, { p: [[240, 490], [292, 500], [292, 650], [240, 620]], v: 0.002, side: 1 },
  { p: [[62, 580], [290, 650], [346, 662], [346, 792], [62, 792]], v: 0.086 },
  { p: [[275, 780], [445, 768], [445, 1000], [275, 1000]], v: 0.021 }, { p: [[445, 768], [540, 800], [540, 1000], [445, 1000]], v: 0.006, side: 1 },
  { p: [[640, 500], [722, 490], [722, 545], [640, 548]], v: 0.039 }, { p: [[570, 600], [742, 592], [742, 650], [570, 655]], v: 0.048 },
  // right cluster
  { p: [[1735, 572], [1880, 500], [1880, 702], [1740, 720]], v: 0.456, tape: [1790, 540, 1818, 580] }, { p: [[1880, 500], [2010, 562], [2010, 700], [1880, 702]], v: 0.010, side: 1 },
  { p: [[1750, 712], [1960, 690], [1960, 1000], [1750, 1000]], v: 0.058, side: 1 },
  { p: [[1290, 525], [1435, 495], [1435, 612], [1290, 612]], v: 0.725 }, { p: [[1435, 495], [1600, 578], [1600, 690], [1435, 612]], v: 0.012, side: 1 },
  { p: [[1240, 622], [1385, 600], [1385, 692], [1240, 702]], v: 0.759 }, { p: [[1385, 600], [1545, 688], [1545, 760], [1385, 692]], v: 0.040, side: 1 },
  { p: [[1240, 705], [1305, 700], [1305, 822], [1240, 822]], v: 0.126 },
  { p: [[1330, 757], [1540, 775], [1540, 1000], [1330, 1000]], v: 0.547, tape: [1440, 767, 1476, 815] },
  { p: [[1210, 822], [1350, 862], [1350, 1000], [1210, 1000]], v: 0.580, tape: [1255, 830, 1282, 880] },
  { p: [[1237, 617], [1312, 605], [1312, 700], [1237, 705]], v: 0.500 },
  // centre stack, back to front
  { p: [[883, 293], [985, 343], [985, 500], [950, 512], [883, 492]], v: 0.515, side: 1 },
  { p: [[730, 327], [883, 293], [883, 492], [850, 490], [730, 445]], v: 0.690, tape: [783, 317, 817, 350] },
  { p: [[1158, 323], [1281, 387], [1281, 572], [1237, 563], [1160, 500]], v: 0.136, side: 1 },
  { p: [[950, 357], [1158, 323], [1160, 500], [1081, 497], [950, 513]], v: 0.779 },
  { p: [[850, 487], [950, 480], [950, 524], [850, 524]], v: 0.073 },
  { p: [[710, 440], [850, 490], [800, 545], [800, 722], [750, 727], [722, 764], [710, 575]], v: 0.666 },
  { p: [[1081, 497], [1237, 563], [1237, 742], [1197, 737], [1078, 700]], v: 0.007, side: 1 },
  { p: [[800, 543], [1081, 497], [1078, 700], [1010, 687], [800, 722]], v: 0.688, tape: [903, 523, 947, 580] },
  { p: [[750, 727], [1010, 687], [1010, 1000], [750, 1000]], v: 0.000 },
  { p: [[1010, 687], [1197, 737], [1197, 832], [1010, 1000]], v: 0.074, side: 1 },
];
// spotlight on the stack (value multiplier), centred under the owl
const spot = (x, y) => 0.45 + 0.75 * Math.exp(-(Math.pow((x - 1060) / 420, 2) + Math.pow((y - 470) / 330, 2)));

import { rng } from "../../../lib/rng.js";
import { P_HANG, P_TIP2 } from "./pen.js";
function paintFace(g, F, seed) {
  const pp = poly(F.p);
  const xs = F.p.map((p) => p[0]), ys = F.p.map((p) => p[1]);
  const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  const cx = (box[0] + box[2]) / 2, cy = (box[1] + box[3]) / 2;
  const r = rng(seed);
  withClip(g, pp, () => {
    // value: the face's own value under the spotlight, lighter toward its top
    const gr = g.createLinearGradient(0, box[1], 0, box[3]);
    const v0 = Math.min(0.95, F.v * spot(cx, box[1] + 20) * 1.08), v1 = Math.min(0.95, F.v * spot(cx, box[3]) * 0.8);
    gr.addColorStop(0, gv(v0)); gr.addColorStop(1, gv(v1));
    g.fillStyle = gr; g.fillRect(box[0] - 2, box[1] - 2, box[2] - box[0] + 4, box[3] - box[1] + 4);
    if (F.v > 0.25 && !F.side) {
      // lit face: dark streaks hanging from the top edge (cardboard grain / shadow drips) and a few rising from the bottom
      const top = (x) => { let best = box[1]; for (let i = 0; i < F.p.length; i++) { const a = F.p[i], b = F.p[(i + 1) % F.p.length]; if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) { const y = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]); if (y < cy) best = Math.max(best, y); } } return best; };
      for (let x = box[0] + 2; x < box[2]; x += 3 + r() * 5) {
        const y0 = top(x) - 2, L = 8 + Math.pow(r(), 1.6) * (box[3] - box[1]) * 0.75;
        ribbon(g, [[x, y0], [x + (r() - 0.5) * 2, y0 + L]], P_HANG(1.4 + r() * 2.6, 0.1, 1.2), gv(0.02, 0.5 + r() * 0.4));
      }
      for (let x = box[0] + 2; x < box[2]; x += 6 + r() * 10) {
        const L = 6 + r() * 30; ribbon(g, [[x, box[3] + 2], [x, box[3] - L]], P_HANG(1.4 + r() * 1.6, 0.1, 1.2), gv(0.02, 0.5));
      }
      // fine print mesh over the face
      mesh(g, pp, box, { v: 0.08, pitch: 4.4, seed: seed + 1, alpha: 0.35 });
    } else {
      // shaded / side face: white vertical grain lines
      if (F.v > 0.01) wood(g, pp, [box[0] - 4, box[1] - 4, box[2] + 4, box[3] + 4], { sp: 5, v: Math.min(0.9, F.v * 1.4), seed: seed + 2, len: [20, 160], gap: 0.4, alpha: 0.7 });
    }
    if (F.tape) {
      const [a, b, c, d] = F.tape;
      fillPath(g, poly([[a, b], [c, b], [c, d - 6], [c - 6, d], [a + (c - a) * 0.6, d - 4], [a + 4, d], [a, d - 4]]), gv(Math.min(0.95, F.v * 1.25)));
      ribbon(g, [[a, b], [a, d - 2], [a + 4, d], [a + (c - a) * 0.6, d - 4], [c - 6, d], [c, d - 6], [c, b]], 2.2, gv(0.02, 0.9));
    }
  });
  // edges: black outline, a thin lit line on the top edge of lit faces
  g.beginPath(); pp(g); g.lineWidth = 3; g.strokeStyle = gv(0.01); g.stroke();
}
function paintHoldRoom(g) {
  g.fillStyle = gv(0.006); g.fillRect(HOLD_BOX[0], HOLD_BOX[1], HOLD_BOX[2] - HOLD_BOX[0], HOLD_BOX[3] - HOLD_BOX[1]);
  // background shelving: dim mesh panels, posts, a board, hanging cables
  mesh(g, rect(0, 140, 700, 420), [0, 140, 700, 420], { v: 0.09, pitch: 6.2, seed: 401 });
  mesh(g, rect(1250, 90, 1500, 420), [1250, 90, 1500, 420], { v: 0.12, pitch: 6.2, seed: 402 });
  mesh(g, rect(1540, 100, 2300, 250), [1540, 100, 2300, 250], { v: 0.06, pitch: 6.2, seed: 403 });
  wood(g, rect(1495, -40, 1535, 420), [1495, -40, 1535, 420], { sp: 5, v: 0.3, seed: 404 });
  wood(g, rect(500, -40, 540, 660), [500, -40, 540, 660], { sp: 5, v: 0.18, seed: 405 });
  wood(g, rect(1540, 258, 1810, 292), [1540, 258, 1810, 292], { dir: 1, sp: 7, v: 0.3, seed: 406 });
  wood(g, rect(560, -40, 1500, 20), [560, -40, 1500, 20], { dir: 1, sp: 8, v: 0.16, seed: 407 });
  wline(g, [[470, 20], [520, 140], [610, 230], [640, 300], [650, 420]], 2.2, 0.5);
  wline(g, [[760, -40], [740, 80], [700, 200], [690, 300]], 2, 0.45);
  wline(g, [[380, 320], [460, 330], [560, 360], [640, 400]], 2, 0.4);
  FACES.forEach((F, i) => paintFace(g, F, 500 + i * 7));
  // a chair back at the bottom left
  const CH = [[620, 1000], [650, 870], [700, 790], [760, 758], [800, 770], [800, 1000]];
  fillPath(g, poly(CH), gv(0.02));
  wline(g, [[640, 990], [665, 880], [710, 800], [765, 765], [795, 775]], 3, 0.5);
  wline(g, [[690, 990], [712, 890], [750, 820], [790, 800]], 2, 0.35);
}

// ---------------- the world between (seen in the pans, under motion blur) ----------------
// A value study authored from a study mosaic of the pan frames on the measured camera (snapshots/s02-r3-meas/
// mosaic2.py: world_pre_x3.jpg and its 100 px tone table): the bookshelf behind him (boards at y -455 / -110 / 240,
// posts at x 1866 / 2980), books and boxes between, the carton stack's lower boxes. Rects: [x0, y0, x1, y1, mean value
// (pre-grade /255), grain direction 0 vertical / 1 horizontal].
const SHELF = [
  // upper shelf: book spines
  [700, -800, 760, -470, 10], [760, -760, 850, -470, 16], [850, -800, 930, -470, 24], [930, -740, 990, -470, 14], [990, -780, 1060, -470, 10],
  [1060, -760, 1150, -470, 16], [1150, -820, 1250, -470, 30], [1250, -760, 1330, -470, 16], [1330, -790, 1420, -470, 18], [1420, -760, 1500, -470, 14],
  [1500, -800, 1580, -470, 22], [1580, -740, 1650, -470, 12], [1650, -800, 1760, -470, 28], [1760, -760, 1860, -470, 16],
  [2090, -760, 2180, -470, 14], [2180, -720, 2300, -470, 10], [2300, -680, 2420, -470, 8],
  // middle compartment (y -430..-115)
  [1300, -430, 1395, -115, 30], [1395, -435, 1640, -250, 52], [1395, -250, 1640, -115, 38], [1640, -420, 1760, -115, 24],
  [1890, -400, 1990, -115, 12], [1990, -420, 2090, -115, 14], [2090, -430, 2200, -115, 24], [2200, -420, 2400, -115, 26], [2400, -360, 2600, -115, 12],
  [2600, -300, 2800, -115, 8], [2800, -330, 2980, -115, 14], [3000, -300, 3200, -115, 18],
  // lower compartment (y -95..235)
  [1900, -95, 1990, 235, 12], [1990, -60, 2080, 235, 26], [2080, -90, 2200, 235, 40], [2200, -80, 2300, 235, 30], [2300, -60, 2400, 235, 24],
  [2400, -40, 2500, 235, 18], [2500, -70, 2600, 235, 12], [2600, -90, 2700, 235, 30], [2700, -60, 2800, 235, 24], [2800, -30, 2900, 235, 12],
  [2900, -80, 3000, 235, 18], [3000, -60, 3100, 235, 22], [3100, -40, 3250, 235, 16],
  // below the board at 240 (right of the stare view)
  [2640, 300, 2900, 1000, 10],
  // between the shelf top and the carton stack: dim clutter
  [2100, -880, 2200, -800, 12], [2200, -900, 2290, -760, 16], [3000, -890, 3120, -700, 22], [3120, -880, 3290, -760, 10],
  [3290, -900, 3460, -700, 60], [3460, -900, 3590, -760, 40], [3290, -700, 3400, -560, 26], [3590, -880, 3700, -760, 16],
  [2940, -780, 3000, -600, 12], [3700, -1000, 3800, -880, 10],
];
const BOARDS = [[550, -470, 2300, -440, 30], [150, -125, 2300, -100, 34], [1880, 225, 3000, 255, 36], [1880, 715, 2400, 745, 30], [2300, -125, 3250, -100, 24], [2980, -480, 3100, -450, 10]];
const POSTS = [[1848, -950, 1880, 1000, 30], [2968, -720, 2995, 300, 16], [2385, -1500, 2405, -300, 10]];
function tex(g, x0, y0, x1, y1, m, dir, seed, alpha = 0.8) {
  const pp = rect(x0, y0, x1, y1), mv = m / 255;
  fillPath(g, pp, gv(mv * 0.45));
  wood(g, pp, [x0, y0, x1, y1], { dir, sp: dir ? 7 : 6, v: Math.min(0.9, mv * 1.05), seed, len: dir ? [120, 500] : [40, 220], gap: 0.25, alpha });
}
// a run of book spines filling a rect: each spine its own height and value (mean ~ m), dark gaps, a lit top edge
function books(g, x0, y0, x1, y1, m, seed) {
  const r = rng(seed);
  fillPath(g, rect(x0, y0, x1, y1), gv(m / 255 * 0.25));
  let x = x0;
  while (x < x1 - 6) {
    const w = Math.min(x1 - x, 14 + r() * 30), top = y0 + (r() < 0.3 ? r() * (y1 - y0) * 0.35 : r() * 12), v = Math.max(3, m * (0.6 + r() * 0.9));
    tex(g, x + 1.5, top, x + w - 1.5, y1, v, 0, seed * 7 + Math.round(x));
    wline(g, [[x + 2, top + 1], [x + w - 2, top + 1]], 1.6, Math.min(0.9, v / 50), 0.9);
    x += w;
  }
}
function paintShelves(g) {
  SHELF.forEach(([x0, y0, x1, y1, m], i) => (y1 - y0 > 120 && x1 - x0 < 260 ? books(g, x0, y0, x1, y1, m, 700 + i) : tex(g, x0, y0, x1, y1, m, 0, 700 + i)));
  BOARDS.forEach(([x0, y0, x1, y1, m], i) => { tex(g, x0, y0, x1, y1, m, 1, 800 + i, 0.9); wline(g, [[x0, y0 + 1], [x1, y0 + 1]], 2, Math.min(0.9, m / 40), 0.9); });
  POSTS.forEach(([x0, y0, x1, y1, m], i) => tex(g, x0, y0, x1, y1, m, 0, 850 + i, 0.85));
}
// the whole world room, painted in world coords (the designer is drawn separately; the hold stack in hold coords)
export function paintWorld(g) {
  g.fillStyle = gv(0.006); g.fillRect(-200, -2100, 4800, 3200);
  paintShelves(g);
  paintNear(g);
  g.save(); g.translate(BOX_OFF[0], BOX_OFF[1]);
  g.beginPath(); g.rect(HOLD_BOX[0], HOLD_BOX[1], HOLD_BOX[2] - HOLD_BOX[0], HOLD_BOX[3] - HOLD_BOX[1]); g.clip();
  paintHoldRoom(g);
  g.restore();
}
export const WORLD = [-100, -2000, 4500, 1000];
// a canvas of a world rect at a scale
export function worldCanvas(r, s = 1) {
  const [x0, y0, x1, y1] = r, c = mk((x1 - x0) * s, (y1 - y0) * s), g = c.getContext("2d");
  g.scale(s, s); g.translate(-x0, -y0); g.lineCap = "round"; g.lineJoin = "round";
  paintWorld(g);
  // the value-study corrections of the two held views (stare room, carton stack), in world coords
  if (!globalThis.__NOTONE) { const T = ROOM_TONE.concat(HOLD_TONE); if (T.length) applyTone(c, x0, y0, T, { sc: s }); }
  return { c, x0, y0, s, w: x1 - x0, h: y1 - y0 };
}
export const STARE_BOX = [-60, -460, 2640, 1000];
export const HOLD_WORLD = [HOLD_BOX[0] + BOX_OFF[0], HOLD_BOX[1] + BOX_OFF[1], HOLD_BOX[2] + BOX_OFF[0], HOLD_BOX[3] + BOX_OFF[1]];
