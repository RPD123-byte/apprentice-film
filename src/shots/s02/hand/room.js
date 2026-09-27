// s02: the dark room behind him, scratched white into black. World coords = the 6.04 s frame.
// Stare view: layout read off 1.1-1.4x grid crops of the stare average (posts, shelf boards, cables, woven panels).
// Fix pass 1: the panels are a woven line grid (scratch.js mesh) and the cables solid ribbed strokes; the carton stack
// the pan stops on is its own module (cartons.js), calibrated face by face.
import { mk, gv, poly, blob, fillPath, withClip, ribbon, P_SWELL, PI } from "./pen.js";
import { wood, mesh, wline, beads, cable, glow, rect } from "./scratch.js";
import { sampleCurve } from "../../../lib/paths.js";
import { applyTone } from "./tone.js";
import { ROOM_TONE } from "./tonedata.js";
import { paintHold, paintFlightBack, FLIGHT_BACK } from "./cartons.js";
import { rng } from "../../../lib/rng.js";


function paintNear(g) {
  // ---- left: a wide upright post at the frame edge (wood grain), a thin upright, mesh behind the cables
  const LP = poly([[-60, 95], [0, 100], [100, 132], [104, 1000], [-60, 1000]]);
  wood(g, LP, [-60, 90, 106, 1000], { sp: 5.2, v: 0.42, seed: 301, len: [80, 500], val: (x) => 0.55 - Math.max(0, x - 40) * 0.004 });
  mesh(g, rect(72, -460, 152, 250), [72, -460, 152, 250], { yfade: 0, v: 0.16, pitch: 6.4, seed: 302 });
  mesh(g, rect(0, -460, 72, 95), [0, -460, 72, 95], { yfade: 0, v: 0.1, pitch: 6.4, seed: 303 });
  for (const x of [190, 212]) wline(g, [[x, -460], [x + 1, 100], [x, 430]], 2.6, 0.8);
  // shelf board and the mesh panels under it
  wood(g, rect(228, 360, 610, 418), [228, 360, 610, 418], { dir: 1, sp: 8.5, v: 0.36, seed: 304, len: [100, 380] });
  mesh(g, rect(230, 418, 330, 650), [230, 418, 330, 650], { yfade: 0, v: 0.22, pitch: 6.4, seed: 305 });
  mesh(g, rect(330, 418, 470, 490), [330, 418, 470, 490], { yfade: 0, v: 0.18, pitch: 6.4, seed: 306 });
  mesh(g, rect(230, 330, 330, 360), [230, 330, 330, 360], { yfade: 0, v: 0.12, pitch: 6.4, seed: 307 });
  // cables hanging from above
  wline(g, [[276, -460], [276, -200], [272, 0], [262, 120], [235, 230], [195, 330], [150, 400], [112, 445]], 7, 0.85, 0.8, 0.8);
  ribbon(g, sampleCurve([[276, -460], [276, -200], [272, 0], [262, 120], [235, 230], [195, 330], [150, 400], [112, 445]], 8), 2.4, gv(0.02));
  cable(g, [[520, -460], [512, -200], [505, 0], [495, 60], [470, 130], [430, 190], [380, 230], [320, 265], [260, 300], [215, 330]], { w: 5.2, seed: 1 });
  cable(g, [[430, -460], [428, -200], [428, 0], [425, 80], [430, 160], [435, 240], [438, 300], [434, 345]], { w: 4.8, seed: 2 });
  cable(g, [[172, 440], [166, 500], [168, 560], [176, 630], [182, 700]], { w: 4.6, seed: 3 });
  wline(g, [[100, 275], [150, 290], [190, 320]], 3, 0.7); wline(g, [[100, 355], [150, 370], [185, 380]], 3, 0.7);

  // ---- right: mesh panels (books, boxes), an upright post, shelf boards, a box with a knob
  mesh(g, rect(1480, -460, 1650, 232), [1480, -460, 1650, 232], { yfade: 0, v: 0.26, pitch: 6.2, seed: 311 });
  mesh(g, rect(1650, -460, 1782, 520), [1650, -460, 1782, 520], { yfade: 0, v: 0.24, pitch: 6.2, seed: 312, val: (x, y) => 0.24 * (0.6 + 0.4 * Math.abs(Math.sin(x * 0.07))) * (y > 250 ? 0.8 : 1) });
  mesh(g, rect(2030, -460, 2640, 232), [2030, -460, 2640, 232], { yfade: 0, v: 0.26, pitch: 6.2, seed: 313 });
  wood(g, rect(1850, -460, 1902, 560), [1850, -460, 1902, 560], { sp: 5.5, v: 0.45, seed: 314, len: [100, 600] });
  wood(g, rect(1905, 240, 2640, 292), [1905, 240, 2640, 292], { dir: 1, sp: 7.5, v: 0.48, seed: 315, len: [120, 500] });
  wline(g, [[1905, 241], [2640, 238]], 2.2, 0.9); wline(g, [[1905, 291], [2640, 290]], 1.6, 0.6);
  // the lower-right panel (fix pass 2, rebuilt on the source's row profile at f152, x 1950-2200): a lit edge at y 431, a
  // dark band to ~470, the weave with dark shelf lines at ~510 and ~550, brightest 556-625 and fading to 700, a dark gap
  // 700-716, a lit board 716-764, dark to ~796, the weave again below
  wline(g, [[1910, 431], [2640, 433]], 2, 0.7);
  const bandV = (y) => (y < 470 ? 0.08 : y < 505 ? 0.25 : y < 516 ? 0.05 : y < 545 ? 0.21 : y < 557 ? 0.04 : y < 625 ? 0.3 : 0.3 - 0.2 * (y - 625) / 75);
  mesh(g, rect(1910, 440, 2640, 700), [1910, 440, 2640, 700], { yfade: 0, v: 0.25, pitch: 6.4, seed: 316, strips: false, val: (x, y) => bandV(y) * (1 - 0.25 * Math.max(0, x - 2150) / 400) });
  g.beginPath(); g.arc(1972, 478, 12, 0, 2 * PI); g.lineWidth = 2.4; g.strokeStyle = gv(0.7, 0.8); g.stroke();
  wood(g, rect(1905, 716, 2640, 764), [1905, 716, 2640, 764], { dir: 1, sp: 7, v: 0.42, seed: 318 });
  wline(g, [[1905, 717], [2640, 719]], 1.8, 0.7);
  mesh(g, rect(1990, 796, 2640, 1000), [1990, 796, 2640, 1000], { yfade: 0, v: 0.2, pitch: 6.4, seed: 319, strips: false });
  // above the frame (seen as the pan starts): the upper shelf continues
  wood(g, rect(1400, -140, 1850, -108), [1400, -140, 1850, -108], { dir: 1, sp: 8, v: 0.35, seed: 320 });
  wood(g, rect(150, -140, 640, -108), [150, -140, 640, -108], { dir: 1, sp: 8, v: 0.35, seed: 321 });
  mesh(g, rect(640, -460, 1480, -140), [640, -460, 1480, -140], { yfade: 0, v: 0.12, pitch: 6.4, seed: 322 });
}

// ---------------- the carton stack (the view the pan stops on, 14.44 s) ----------------
// Face polygons in HOLD-frame px (the frame at 14.44–16.5 s); world = hold + BOX_OFF. Read off 1.0–1.5x grid crops of the
// hold average (snapshots/s02-r3-meas/z/hb1, hb2, holdB, holdC). v = face value (pre-grade paint), side = shaded side face.
export const BOX_OFF = [2203.3, -1893.4];
// hold-frame rect of the carton-view canvas (fix pass 1: down to 1300, the row under the hold view seen in the flight)
export const HOLD_BOX = [-300, -40, 2300, 1300];
function paintHoldRoom(g) { paintHold(g, HOLD_BOX); }

// ---------------- the world between (seen in the pans, under motion blur) ----------------
// A value study authored from a study mosaic of the pan frames on the measured camera (snapshots/s02-r3-meas/
// mosaic2.py: world_pre_x3.jpg and its 100 px tone table): the bookshelf behind him (boards at y -455 / -110 / 240,
// posts at x 1866 / 2980), books and boxes between, the carton stack's lower boxes. Rects: [x0, y0, x1, y1, mean value
// (pre-grade /255), grain direction 0 vertical / 1 horizontal].
const SHELF = [
  // upper shelf: book spines
  [700, -800, 760, -470, 10], [760, -760, 850, -470, 16], [850, -800, 930, -470, 24], [930, -740, 990, -470, 14], [990, -780, 1060, -470, 10],
  [1060, -760, 1150, -470, 16], [1150, -820, 1250, -470, 30], [1250, -760, 1330, -470, 16], [1330, -790, 1420, -470, 18], [1420, -760, 1500, -470, 14],
  [1500, -800, 1580, -470, 22], [1580, -740, 1650, -470, 12], [1650, -800, 1760, -470, 14], [1760, -760, 1860, -470, 9],
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
  // (the lit boxes under the carton view, hold y 946-1300, are drawn with the stack: cartons.js)
  [3290, -590, 3400, -560, 26],
];
const BOARDS = [[550, -470, 2300, -440, 30], [150, -125, 2300, -100, 34], [1880, 225, 3000, 255, 36], [1880, 715, 2400, 745, 30], [2300, -125, 3250, -100, 24], [2980, -480, 3100, -450, 10]];
const POSTS = [[1848, -950, 1880, 1000, 30], [2968, -720, 2995, 300, 16], [2385, -1500, 2405, -300, 10]];
function tex(g, x0, y0, x1, y1, m, dir, seed, alpha = 0.8) {
  const pp = rect(x0, y0, x1, y1), mv = m / 255;
  fillPath(g, pp, gv(mv * 0.45));
  wood(g, pp, [x0, y0, x1, y1], { dir, sp: dir ? 7 : 6, v: Math.min(0.9, mv * 1.05), seed, len: dir ? [120, 500] : [40, 220], gap: 0.25, alpha });
}
// a run of book spines filling a rect: each spine its own height and value (mean ~ m), dark gaps, a lit top edge.
// Fix pass 2 (review medium: no readable spines in the pan world): 20-42 px spines, each with a lit left edge line, a dark
// gap on the right, and a label band or two across it
function books(g, x0, y0, x1, y1, m, seed) {
  const r = rng(seed);
  fillPath(g, rect(x0, y0, x1, y1), gv(m / 255 * 0.2));
  let x = x0;
  while (x < x1 - 6) {
    const w = Math.min(x1 - x, 20 + r() * 22), top = y0 + (r() < 0.3 ? r() * (y1 - y0) * 0.35 : r() * 12), v = Math.max(3, m * (0.5 + r() * 1.0));
    tex(g, x + 2, top, x + w - 2.5, y1, v * 0.85, 0, seed * 7 + Math.round(x));
    wline(g, [[x + 3, top + 3], [x + 3.4, (top + y1) / 2], [x + 3, y1 - 3]], 1.7, Math.min(0.85, v / 42), 0.85, 0.6);
    for (let k = 0; k < (r() < 0.5 ? 1 : 2); k++) { const yb = top + (y1 - top) * (0.15 + r() * 0.6); wline(g, [[x + 4, yb], [x + w - 4, yb + (r() - 0.5) * 2]], 1.5, Math.min(0.7, v / 55), 0.8); }
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
  // the value-study corrections of the stare room, in world coords (the carton stack is calibrated face by face instead)
  if (!globalThis.__NOTONE) { const T = ROOM_TONE; if (T.length) applyTone(c, x0, y0, T, { sc: s, win: globalThis.__S02NOWIN ? null : [0, 0, 2206, 946, 60] }); }
  return { c, x0, y0, s, w: x1 - x0, h: y1 - y0 };
}
export const STARE_BOX = [-60, -460, 2640, 1000];
// the flight's backdrop layer (fix pass 2), hold px -> its own canvas (transparent where nothing is drawn)
export function flightBackCanvas() {
  const [x0, y0, x1, y1] = FLIGHT_BACK, c = mk(x1 - x0, y1 - y0), g = c.getContext("2d");
  g.translate(-x0, -y0); g.lineCap = "round"; g.lineJoin = "round"; paintFlightBack(g);
  return { c, x0: x0 + BOX_OFF[0], y0: y0 + BOX_OFF[1] };
}
export const HOLD_WORLD = [HOLD_BOX[0] + BOX_OFF[0], HOLD_BOX[1] + BOX_OFF[1], HOLD_BOX[2] + BOX_OFF[0], HOLD_BOX[3] + BOX_OFF[1]];
