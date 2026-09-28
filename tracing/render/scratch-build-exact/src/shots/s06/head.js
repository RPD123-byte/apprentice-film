// Beanie, the hand with the pencil (the hair is in hair.js). Frame coordinates measured on the source at 27.0 s.
import { taper } from "../../lib/ink.js";
import { sampleCurve, smoothPath } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";
import { poly, blob, gv, line, lock, ribbon, hatch, comb, flecks, soft } from "./kit.js";
import { SKIN } from "./face.js";

// ---------------------------------------------------------------- beanie
const EDGE = [[592, 398], [600, 362], [612, 322], [626, 286], [642, 256], [660, 232], [680, 206], [700, 189], [722, 175], [760, 150], [800, 136], [840, 122], [910, 104], [1000, 86], [1100, 82], [1200, 97], [1250, 107], [1300, 124], [1340, 158], [1380, 190], [1410, 215], [1440, 250], [1460, 290], [1475, 340], [1482, 400], [1484, 420]];
const TOP = [[592, 398], [580, 340], [575, 280], [575, 225], [576, 175], [582, 125], [597, 78], [622, 40], [660, 8], [700, -8], [1380, -8], [1415, 20], [1452, 62], [1480, 110], [1495, 165], [1502, 225], [1504, 290], [1500, 350], [1494, 400], [1484, 420]];
export const BEANIE = [...TOP, ...EDGE.slice().reverse()];
function resample(P, n) {
  const acc = [0]; for (let i = 1; i < P.length; i++) acc.push(acc[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const T = acc[acc.length - 1], out = []; let j = 0;
  for (let k = 0; k < n; k++) { const d = (k / (n - 1)) * T; while (j < acc.length - 2 && acc[j + 1] < d) j++; const f = (d - acc[j]) / Math.max(1e-6, acc[j + 1] - acc[j]); out.push([P[j][0] + (P[j + 1][0] - P[j][0]) * f, P[j][1] + (P[j + 1][1] - P[j][1]) * f]); }
  return out;
}

export function drawBeanie(g) {
  const r = rng(51);
  const clip = (c) => { c.moveTo(BEANIE[0][0], BEANIE[0][1]); for (const p of BEANIE) c.lineTo(p[0], p[1]); c.closePath(); };
  g.save(); g.beginPath(); clip(g); g.clip();
  // value: mid grey in the middle, turning dark at the sides (source means: centre ~0.5, sides ~0.25)
  const lg = g.createLinearGradient(570, 0, 1500, 0);
  lg.addColorStop(0, gv(0.34)); lg.addColorStop(0.1, gv(0.52)); lg.addColorStop(0.25, gv(0.63)); lg.addColorStop(0.5, gv(0.66)); lg.addColorStop(0.75, gv(0.65)); lg.addColorStop(0.9, gv(0.6)); lg.addColorStop(1, gv(0.42));
  g.fillStyle = lg; g.fillRect(560, -10, 950, 360);
  // mottled wool
  for (let i = 0; i < 700; i++) { const x = 570 + r() * 930, y = r() * 330; g.fillStyle = `rgba(${r() < 0.5 ? "20,20,20" : "230,230,225"},${0.05 + 0.08 * r()})`; g.beginPath(); g.ellipse(x, y, 4 + r() * 10, 2 + r() * 6, r() * 3, 0, 7); g.fill(); }
  // ribs: spaced evenly in angle round the head (≈21 px apart in the middle, crowding at the sides), each a thin
  // wavy dark groove from the brim up to the crown, bowing outward on the sides
  const yEdge = (x) => { for (let k = 0; k < EDGE.length - 1; k++) if (x >= EDGE[k][0] && x <= EDGE[k + 1][0]) return EDGE[k][1] + (EDGE[k + 1][1] - EDGE[k][1]) * (x - EDGE[k][0]) / (EDGE[k + 1][0] - EDGE[k][0]); return 330; };
  const N = 66;
  for (let i = 0; i < N; i++) {
    const ph = (-0.5 + i / (N - 1)) * Math.PI * 0.94, sn = Math.sin(ph), side = Math.abs(sn);
    const bx = 1036 + 455 * sn + (r() - 0.5) * 4, by = yEdge(bx);
    const pts = [];
    for (let k = 0; k <= 10; k++) {
      const f = k / 10, y = by + (-20 - by) * f;
      const x = bx - sn * 60 * Math.sin(Math.PI * f * 0.8) * side + Math.sin(f * 9 + i * 1.7) * 1.6;
      pts.push([x, y]);
    }
    const w = 2.2 + 1.6 * side + r() * 0.8;
    taper(g, sampleCurve(pts, 4), (q) => w * (0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, q * 1.2))), `rgba(18,18,18,${0.62 + 0.3 * r()})`);
    const hp = pts.map(([x, y]) => [x + 4 + 2 * side, y]);
    g.globalAlpha = (0.12 + 0.2 * r()) * (1 - side);
    taper(g, sampleCurve(hp, 4), (q) => 2.4 * Math.sin(Math.PI * q), "#dedcd6");
    g.globalAlpha = 1;
  }
  // knit courses: short scratchy dark ticks between the ribs, stronger toward the sides
  for (let y = -4; y < 420; y += 7) {
    for (let x = 575; x < 1500; x += 9) {
      const side = Math.min(1, Math.abs((x - 1036) / 455));
      if (r() > 0.18 + side * 0.25) { r(); r(); continue; }
      const L = 6 + r() * 8, yy = y + (r() - 0.5) * 3;
      taper(g, [[x, yy], [x + L * 0.5, yy + 1 + r()], [x + L, yy + (r() - 0.5) * 2]], (q) => (0.8 + side) * Math.sin(Math.PI * q), `rgba(20,20,20,${0.25 + 0.4 * side})`);
    }
  }
  // the knit on the turning sides: short horizontal course ticks between the ribs (a rectangular knit grid) and
  // dark mottled patches
  for (const [x0, x1, sgn] of [[560, 830, -1], [1260, 1510, 1]]) {
    const dens = (x) => Math.max(0, Math.min(1, sgn < 0 ? (830 - x) / 170 : (x - 1260) / 170));
    for (let y = -2; y < 430; y += 6.5) {
      for (let x = x0; x < x1; x += 7 + r() * 4) {
        const d = dens(x);
        if (r() > 0.25 + 0.6 * d) { r(); r(); continue; }
        const L = 4 + r() * 5, yy = y + (r() - 0.5) * 2;
        taper(g, [[x, yy], [x + L * 0.5, yy + 0.8], [x + L, yy]], (q) => (1.2 + 0.8 * d) * Math.sin(Math.PI * q), `rgba(16,16,16,${0.3 + 0.35 * d * r()})`);
        if (r() < 0.35) taper(g, [[x, yy + 3], [x + L * 0.5, yy + 3.6], [x + L, yy + 3]], (q) => 1.1 * Math.sin(Math.PI * q), `rgba(225,223,217,${0.18 + 0.2 * d})`);
      }
    }
    for (let i = 0; i < 40; i++) {
      const x = x0 + r() * (x1 - x0), y = r() * 420, d = dens(x);
      if (d < 0.2) continue;
      g.fillStyle = `rgba(12,12,12,${0.1 + 0.18 * d})`; g.beginPath(); g.ellipse(x, y, 8 + r() * 14, 5 + r() * 9, r() * 3, 0, 7); g.fill();
    }
  }
  // the cuff turning under on the left: ribs curving round in "C" loops
  for (let k = 0; k < 14; k++) {
    const cx = 612 + k * 11 - (k > 8 ? (k - 8) * 3 : 0), cy = 262 - k * 12;
    const R = 26 + (k % 3) * 4;
    const pts = [];
    for (let j = 0; j <= 8; j++) { const a = 2.2 + (j / 8) * 2.2; pts.push([cx + Math.cos(a) * R * 0.7, cy + Math.sin(a) * R]); }
    taper(g, sampleCurve(pts, 3), (q) => 2.2 * Math.sin(Math.PI * q), "rgba(14,14,14,0.55)");
    taper(g, sampleCurve(pts.map(([x, y]) => [x + 4, y - 2]), 3), (q) => 1.6 * Math.sin(Math.PI * q), "rgba(220,218,212,0.25)");
  }
  // shadow along the brim
  soft(g, null, (c) => { smoothPath(c, [...EDGE, ...EDGE.slice().reverse().map(([x, y]) => [x, y - 22])], true); }, "rgba(10,10,10,0.4)", 8);
  // outer sides fall off into the dark
  soft(g, null, (c) => { c.rect(540, -10, 44, 420); c.rect(1488, -10, 40, 420); }, "rgba(0,0,0,0.65)", 14);
  g.restore();
  line(g, EDGE.slice(3, -2), 4, "#0a0a0a", { a: 0.5 });
}

// ---------------------------------------------------------------- hand and pencil
const HAND = [[540, 482], [547, 466], [565, 460], [590, 463], [612, 468], [629, 459], [643, 436], [656, 427], [675, 426], [693, 431], [711, 439], [720, 450], [734, 465], [747, 461], [766, 463], [784, 472], [797, 486], [803, 496], [822, 523], [838, 532], [856, 545], [875, 568], [888, 586], [897, 600], [900, 627], [897, 655], [890, 682], [883, 691], [870, 700], [900, 730], [940, 790], [960, 818], [700, 818], [680, 777], [647, 747], [613, 720], [583, 687], [563, 647], [557, 607], [550, 540]];

export function drawHand(g) {
  const r = rng(61);
  g.fillStyle = SKIN; g.beginPath(); smoothPath(g, HAND, true); g.fill();
  g.save(); g.beginPath(); smoothPath(g, HAND, true); g.clip();
  // form shading: the left side of the index finger and the wrist, the gaps between fingers
  hatch(g, null, [540, 470, 610, 720], { dir: () => 1.45, dens: (x) => Math.max(0, 1 - (x - 545) / 45), sp: 4, len: 40, w: 1, color: "rgba(30,30,30,0.55)", seed: 62 });
  hatch(g, (c) => { c.moveTo(583, 687); c.lineTo(700, 818); c.lineTo(760, 818); c.lineTo(640, 690); c.closePath(); }, [580, 680, 760, 818], { dir: () => 0.85, dens: () => 0.55, sp: 4, len: 30, w: 0.9, color: "rgba(30,30,30,0.45)", seed: 63 });
  hatch(g, (c) => { smoothPath(c, [[800, 540], [850, 548], [880, 575], [897, 620], [893, 670], [870, 690], [840, 660], [828, 620], [812, 580]], true); }, [790, 530, 905, 700], { dir: () => 1.35, dens: (x) => 0.15 + 0.35 * Math.min(1, Math.max(0, (x - 840) / 60)), sp: 4.2, len: 20, w: 1, color: "rgba(25,25,25,0.4)", seed: 65 });
  hatch(g, (c) => { smoothPath(c, [[610, 640], [660, 610], [720, 630], [760, 700], [720, 760], [640, 720]], true); }, [600, 600, 770, 770], { dir: () => 0.95, dens: () => 0.35, sp: 4, len: 30, w: 1, color: "rgba(25,25,25,0.4)", seed: 66 });
  hatch(g, (c) => { smoothPath(c, [[630, 470], [660, 500], [690, 540], [670, 600], [640, 620], [615, 560], [620, 500]], true); }, [600, 460, 700, 630], { dir: () => 1.6, dens: () => 0.3, sp: 4, len: 26, w: 0.9, color: "rgba(25,25,25,0.4)", seed: 67 });
  g.restore();
  const INKC = "#141414";
  // shadow where the fist presses into the cheek, and under the curled finger
  comb(g, [[852, 590], [868, 600], [886, 620], [896, 650], [890, 684]], { step: 4, len: 12, ang: 0.3, side: 1, w: 1.2, color: "rgba(20,20,20,0.55)", seed: 69 });
  // outer contour pieces (heavy, tapering)
  line(g, [[540, 482], [545, 518], [554, 573], [561, 627], [563, 659], [574, 677], [597, 696], [625, 718], [652, 746], [680, 778], [706, 812]], 4.4, INKC, { a: 0.3 });
  line(g, [[541, 480], [547, 468], [565, 461], [588, 464], [606, 468]], 3.4, INKC, { a: 0.3 });
  line(g, [[629, 459], [643, 436], [656, 427], [675, 426], [693, 432], [711, 439], [720, 450]], 3.8, INKC, { a: 0.25 });
  line(g, [[720, 477], [734, 466], [747, 461], [766, 464], [784, 473], [797, 486], [802, 496]], 3.6, INKC, { a: 0.25 });
  line(g, [[788, 546], [802, 534], [820, 530], [838, 532], [856, 546], [875, 568], [888, 586], [897, 600], [900, 627], [897, 655], [890, 682], [883, 691]], 4.4, INKC, { a: 0.25 });
  // finger separations
  line(g, [[627, 482], [618, 527], [606, 573], [599, 596], [588, 636], [584, 655], [590, 682], [604, 700]], 3.4, INKC, { a: 0.15 });
  line(g, [[720, 450], [711, 473], [702, 500], [688, 536], [675, 573], [656, 600], [650, 606]], 3.6, INKC, { a: 0.15 });
  line(g, [[802, 496], [793, 518], [779, 546], [761, 577], [747, 596], [729, 618], [720, 628]], 3.4, INKC, { a: 0.15 });
  line(g, [[766, 455], [790, 478], [810, 500], [826, 524]], 2.8, INKC, { a: 0.2 });
  line(g, [[788, 546], [770, 566], [748, 590], [722, 625]], 2.2, "rgba(20,20,20,0.75)", { a: 0.2 });
  // curled fingertip under the knuckle, by the chin
  line(g, [[848, 584], [846, 612], [838, 632], [830, 640]], 3.6, INKC, { a: 0.3 });
  line(g, [[828, 642], [846, 662], [860, 682], [883, 691]], 4.2, INKC, { a: 0.3 });
  line(g, [[810, 646], [826, 641], [840, 640]], 2.2, "rgba(20,20,20,0.8)", { a: 0.2 });
  // knuckle creases
  for (const [x, y, a] of [[662, 452, 0.2], [752, 480, 0.1], [826, 552, 0.3], [590, 478, 0.1]]) {
    for (let k = 0; k < 3; k++) line(g, [[x - 10 + k * 3, y + k * 4], [x, y + 2 + k * 4], [x + 10 - k * 2, y + k * 4 - 1]], 1, "rgba(30,30,30,0.45)", { a: 0.1 });
  }
  // shade on the far side of each finger along its crease, and the second knuckles
  for (const [pts, sd] of [[[[627, 482], [618, 527], [606, 573], [599, 596], [588, 636]], -1], [[[720, 450], [711, 473], [702, 500], [688, 536], [675, 573], [656, 600]], -1], [[[802, 496], [793, 518], [779, 546], [761, 577], [747, 596], [729, 618]], -1], [[[848, 584], [846, 612], [838, 632]], -1]]) {
    comb(g, pts, { step: 3.2, len: (u) => 8 + 8 * Math.sin(Math.PI * u), ang: -0.5, side: sd, w: 1.1, color: "rgba(25,25,25,0.5)", seed: 68 + pts.length });
  }
  line(g, [[606, 604], [636, 622], [668, 626], [696, 614]], 1.3, "rgba(30,30,30,0.45)", { a: 0.1 });
  line(g, [[694, 642], [722, 656], [752, 652]], 1.3, "rgba(30,30,30,0.45)", { a: 0.1 });
  line(g, [[762, 664], [790, 672], [812, 664]], 1.2, "rgba(30,30,30,0.4)", { a: 0.1 });
  // soft lines on the palm side
  line(g, [[675, 605], [656, 636], [643, 673], [638, 718]], 1.4, "rgba(30,30,30,0.4)", { a: 0.1 });
  line(g, [[565, 659], [588, 691], [624, 718]], 1.6, "rgba(30,30,30,0.6)", { a: 0.1 });
}

export function drawPencil(g) {
  // from the tip (490,305) down-right into the fist; hexagonal body, sharpened wood cone, graphite point
  const tip = [490, 305], dir = [0.618, 0.786], n = [-dir[1], dir[0]];
  const at = (s, o) => [tip[0] + dir[0] * s + n[0] * o, tip[1] + dir[1] * s + n[1] * o];
  const hw = 10;
  // body
  g.fillStyle = "#e9e8e3";
  g.beginPath(); const b0 = at(52, -hw), b1 = at(240, -hw), b2 = at(240, hw), b3 = at(52, hw);
  g.moveTo(...b0); g.lineTo(...b1); g.lineTo(...b2); g.lineTo(...b3); g.closePath(); g.fill();
  // facet shading: the lower facet grey, a dark facet line
  g.fillStyle = "rgba(120,120,120,0.55)"; g.beginPath(); g.moveTo(...at(52, 3)); g.lineTo(...at(240, 3)); g.lineTo(...at(240, hw)); g.lineTo(...at(52, hw)); g.closePath(); g.fill();
  line(g, [at(54, 3), at(240, 3)], 1.4, "rgba(30,30,30,0.6)", { a: 0.4 });
  line(g, [at(52, -hw), at(240, -hw)], 2.2, "#161616", { a: 0.5 });
  line(g, [at(52, hw), at(240, hw)], 2.4, "#161616", { a: 0.5 });
  // sharpened cone: pale wood with scalloped collar, graphite tip
  g.fillStyle = "#dcdad4";
  g.beginPath(); g.moveTo(...at(6, -2.5)); g.lineTo(...at(52, -hw));
  for (let k = 0; k <= 4; k++) { const o = -hw + (2 * hw * k) / 4; const p = at(54 + (k % 2 ? 6 : 0), o); g.lineTo(...p); }
  g.lineTo(...at(52, hw)); g.lineTo(...at(6, 2.5)); g.closePath(); g.fill();
  hatch(g, (c) => { c.moveTo(...at(6, 0)); c.lineTo(...at(52, 0)); c.lineTo(...at(52, hw)); c.lineTo(...at(6, 2.5)); c.closePath(); }, [480, 300, 540, 360], { dir: () => Math.atan2(dir[1], dir[0]), dens: () => 0.9, sp: 2.2, len: 14, w: 0.8, color: "rgba(40,40,40,0.6)", seed: 64 });
  line(g, [at(6, -2.5), at(52, -hw)], 1.8, "#161616", { a: 0.5 });
  line(g, [at(6, 2.5), at(52, hw)], 1.8, "#161616", { a: 0.5 });
  const col = []; for (let k = 0; k <= 4; k++) col.push(at(52 + (k % 2 ? 6 : 0), -hw + (2 * hw * k) / 4));
  line(g, col, 1.6, "#161616", { a: 0.5, per: 2 });
  g.fillStyle = "#2a2a2a"; g.beginPath(); g.moveTo(...at(-2, 0)); g.lineTo(...at(12, -3.6)); g.lineTo(...at(12, 3.6)); g.closePath(); g.fill();
}
