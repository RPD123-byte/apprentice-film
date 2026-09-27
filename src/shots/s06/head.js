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

// The beanie is a knit crown with a thick turned-up cuff (~95 px) along the brim. The cuff's ribs run across the band
// (vertical at the front, arcing round on the sides); the crown shows at the upper sides as a crossing knit.
export function drawBeanie(g) {
  const r = rng(51);
  const clip = (c) => { c.moveTo(BEANIE[0][0], BEANIE[0][1]); for (const p of BEANIE) c.lineTo(p[0], p[1]); c.closePath(); };
  g.save(); g.beginPath(); clip(g); g.clip();
  // value: mid grey in the middle, darker toward the sides
  const lg = g.createLinearGradient(570, 0, 1500, 0);
  lg.addColorStop(0, gv(0.36)); lg.addColorStop(0.1, gv(0.52)); lg.addColorStop(0.25, gv(0.62)); lg.addColorStop(0.5, gv(0.66)); lg.addColorStop(0.75, gv(0.65)); lg.addColorStop(0.9, gv(0.6)); lg.addColorStop(1, gv(0.44));
  g.fillStyle = lg; g.fillRect(560, -10, 950, 420);
  for (let i = 0; i < 700; i++) { const x = 570 + r() * 930, y = r() * 400; g.fillStyle = `rgba(${r() < 0.5 ? "20,20,20" : "230,230,225"},${0.05 + 0.08 * r()})`; g.beginPath(); g.ellipse(x, y, 4 + r() * 10, 2 + r() * 6, r() * 3, 0, 7); g.fill(); }
  // the cuff band: the brim edge and its inner offset
  const E = resample(EDGE, 160), NB = E.map((p, i) => {
    const a = E[Math.max(0, i - 2)], b = E[Math.min(E.length - 1, i + 2)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    return [ty, -tx];
  });
  const bwAt = (x) => 64 + 40 * Math.pow(1 - Math.min(1, Math.abs((x - 1036) / 455)), 2);
  const TOPB = E.map((p, i) => { const bw = bwAt(p[0]); return [p[0] + NB[i][0] * bw, p[1] + NB[i][1] * bw]; });
  // crown above the cuff: a crossing knit (two diagonal line sets) with dark mottling
  g.save(); g.beginPath(); g.moveTo(TOPB[0][0], TOPB[0][1]); for (const p of TOPB) g.lineTo(p[0], p[1]); g.lineTo(1700, -60); g.lineTo(400, -60); g.closePath(); g.clip();
  g.fillStyle = "rgba(20,20,20,0.3)"; g.fillRect(540, -20, 1000, 300);
  hatch(g, null, [540, -20, 1540, 280], { dir: () => 0.85, dens: () => 0.85, sp: 8, len: 40, w: 1.6, color: "rgba(14,14,14,0.55)", seed: 52, bend: 0.05, lenJit: 0.3 });
  hatch(g, null, [540, -20, 1540, 280], { dir: () => -0.85, dens: () => 0.85, sp: 8, len: 40, w: 1.6, color: "rgba(14,14,14,0.5)", seed: 53, bend: 0.05, lenJit: 0.3 });
  hatch(g, null, [540, -20, 1540, 280], { dir: () => 0.85, dens: () => 0.5, sp: 8, len: 30, w: 1.4, color: "rgba(226,224,218,0.28)", seed: 54, bend: 0.05, lenJit: 0.3 });
  g.restore();
  // ribs across the cuff, evenly spaced in angle round the head (about 21 px apart at the front, crowding at the sides)
  const nearest = (x) => { let k = 0, d = 1e9; for (let i = 0; i < E.length; i++) { const dd = Math.abs(E[i][0] - x); if (dd < d) { d = dd; k = i; } } return k; };
  const N = 70;
  for (let i = 0; i < N; i++) {
    const ph = (-0.5 + i / (N - 1)) * Math.PI * 0.96, sn = Math.sin(ph), side = Math.abs(sn);
    const k = nearest(1036 + 455 * sn + (r() - 0.5) * 4), B = E[k], n = NB[k];
    const L = bwAt(B[0]), pts = [];
    for (let j = 0; j <= 8; j++) {
      const f = j / 8, bow = Math.sin(Math.PI * f) * 5 * sn;
      pts.push([B[0] + n[0] * L * f + n[1] * bow + Math.sin(f * 8 + i * 1.7) * 1.2, B[1] + n[1] * L * f - n[0] * bow]);
    }
    const w = 2.2 + 1.4 * side + r() * 0.8;
    taper(g, sampleCurve(pts, 4), (q) => w * (0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, q * 1.2))), `rgba(18,18,18,${0.62 + 0.3 * r()})`);
    const hp = pts.map(([x, y]) => [x - n[1] * (5 + 2 * side), y + n[0] * (5 + 2 * side)]);
    g.globalAlpha = (0.3 + 0.2 * r()) * (1 - 0.35 * side);
    taper(g, sampleCurve(hp, 4), (q) => (3.6 + 1.5 * side) * Math.sin(Math.PI * Math.min(1, q * 1.1)), "#dedcd6");
    g.globalAlpha = 1;
  }
  // knit courses on the cuff: short ticks running along the band between the ribs, stronger toward the sides
  for (let k = 2; k < E.length - 2; k += 1) {
    const B = E[k], n = NB[k], side = Math.min(1, Math.abs((B[0] - 1036) / 455)), tx = -n[1], ty = n[0];
    for (let d = 6; d < bwAt(B[0]); d += 7) {
      if (r() > 0.2 + 0.35 * side) { r(); r(); continue; }
      const x = B[0] + n[0] * d + (r() - 0.5) * 3, y = B[1] + n[1] * d, L = 4 + r() * 5;
      taper(g, [[x, y], [x + tx * L * 0.5, y + ty * L * 0.5 + 0.6], [x + tx * L, y + ty * L]], (q) => (0.9 + 0.8 * side) * Math.sin(Math.PI * q), `rgba(16,16,16,${0.28 + 0.35 * side * r()})`);
    }
  }
  // dark mottled patches on the turning sides
  for (let i = 0; i < 60; i++) {
    const x = 560 + r() * 950, y = r() * 420, side = Math.min(1, Math.abs((x - 1036) / 455));
    if (side < 0.45) continue;
    g.fillStyle = `rgba(12,12,12,${0.08 + 0.16 * side})`; g.beginPath(); g.ellipse(x, y, 8 + r() * 14, 5 + r() * 9, r() * 3, 0, 7); g.fill();
  }
  // the fold at the top of the cuff and the shadow along the brim
  line(g, TOPB.filter(([x, y]) => y > -10), 2.2, "rgba(12,12,12,0.6)", { a: 0.3 });
  soft(g, null, (c) => { smoothPath(c, [...EDGE, ...EDGE.slice().reverse().map(([x, y]) => [x, y - 22])], true); }, "rgba(10,10,10,0.4)", 8);
  soft(g, null, (c) => { c.rect(540, -10, 44, 420); c.rect(1488, -10, 40, 420); }, "rgba(0,0,0,0.65)", 14);
  g.restore();
  line(g, EDGE.slice(3, -2), 4, "#0a0a0a", { a: 0.5 });
}

// ---------------------------------------------------------------- hand and pencil
// Traced from the source at 27.0 (2x grid crop): four curled fingers seen from the knuckle side, stacked diagonally
// down to the right where the little finger curls in against the cheek.
export const HAND = [[541, 484], [550, 468], [568, 460], [592, 458], [612, 462], [630, 452], [648, 438], [670, 433], [692, 436], [710, 446], [721, 466], [738, 466], [762, 463], [785, 472], [800, 494], [812, 522], [830, 529], [852, 545], [872, 566], [887, 590], [896, 614], [898, 644], [893, 670], [884, 690], [900, 722], [940, 790], [960, 818], [704, 818], [660, 758], [620, 720], [580, 686], [562, 660], [555, 610], [548, 540]];

export function drawHand(g) {
  g.fillStyle = SKIN; g.beginPath(); smoothPath(g, HAND, true); g.fill();
  g.save(); g.beginPath(); smoothPath(g, HAND, true); g.clip();
  // form shading: the far side of each finger and the gaps between them (dark hatched wedges), the heel of the hand
  for (const pts of [[[700, 448], [722, 468], [712, 520], [698, 560], [684, 585], [676, 560], [690, 510]], [[790, 478], [812, 520], [794, 536], [772, 566], [752, 590], [760, 560], [780, 520]], [[612, 468], [626, 476], [610, 530], [596, 590], [588, 640], [580, 600], [592, 530]], [[858, 552], [884, 578], [896, 620], [896, 662], [884, 688], [870, 680], [876, 630]]]) soft(g, null, (c) => smoothPath(c, pts, true), "rgba(90,90,90,0.28)", 5);
  hatch(g, null, [540, 470, 600, 720], { dir: () => 1.45, dens: (x) => Math.max(0, 1 - (x - 545) / 30), sp: 3.5, len: 40, w: 1, color: "rgba(30,30,30,0.55)", seed: 62 });
  hatch(g, (c) => { smoothPath(c, [[700, 448], [722, 468], [712, 520], [698, 560], [684, 585], [676, 560], [690, 510]], true); }, [670, 440, 730, 600], { dir: () => 1.9, dens: () => 0.75, sp: 3, len: 18, w: 1.0, color: "rgba(25,25,25,0.5)", seed: 63 });
  hatch(g, (c) => { smoothPath(c, [[790, 478], [812, 520], [794, 536], [772, 566], [752, 590], [760, 560], [780, 520]], true); }, [745, 470, 820, 600], { dir: () => 2.0, dens: () => 0.75, sp: 3, len: 18, w: 1.0, color: "rgba(25,25,25,0.5)", seed: 64 });
  hatch(g, (c) => { smoothPath(c, [[612, 468], [626, 476], [610, 530], [596, 590], [588, 640], [580, 600], [592, 530]], true); }, [575, 460, 632, 650], { dir: () => 1.75, dens: () => 0.7, sp: 3, len: 20, w: 1.0, color: "rgba(25,25,25,0.5)", seed: 65 });
  hatch(g, (c) => { smoothPath(c, [[852, 548], [880, 572], [896, 614], [897, 660], [884, 690], [866, 690], [870, 640], [868, 600]], true); }, [845, 540, 900, 695], { dir: () => 1.4, dens: (x) => 0.35 + 0.5 * Math.min(1, Math.max(0, (x - 860) / 35)), sp: 3, len: 22, w: 1.0, color: "rgba(25,25,25,0.5)", seed: 66 });
  hatch(g, (c) => { smoothPath(c, [[846, 588], [852, 620], [852, 660], [860, 684], [846, 682], [838, 652], [840, 616]], true); }, [832, 580, 866, 692], { dir: () => 1.6, dens: () => 1, sp: 2.6, len: 14, w: 1.2, color: "rgba(15,15,15,0.7)", seed: 67 });
  hatch(g, (c) => { smoothPath(c, [[600, 640], [650, 690], [700, 740], [740, 800], [700, 810], [640, 750], [590, 690]], true); }, [585, 630, 745, 815], { dir: () => 0.85, dens: () => 0.3, sp: 4, len: 30, w: 1, color: "rgba(25,25,25,0.4)", seed: 68 });
  g.restore();
  const INKC = "#141414";
  // contours (heavy, tapering) — index finger edge and heel, finger tops, the creases between the fingers
  line(g, [[543, 482], [546, 520], [551, 570], [556, 620], [562, 660]], 4.0, INKC, { a: 0.35 });
  line(g, [[562, 658], [580, 686], [620, 720], [660, 758], [705, 806]], 5.2, INKC, { a: 0.3 });
  line(g, [[543, 482], [552, 468], [570, 460], [592, 458]], 3.6, INKC, { a: 0.3 });
  line(g, [[626, 474], [612, 520], [598, 578], [587, 628], [585, 652], [594, 672], [622, 702], [656, 736], [690, 772]], 4.6, INKC, { a: 0.1, bias: 0.4 });
  line(g, [[630, 452], [648, 438], [670, 433], [692, 436], [710, 446], [721, 468]], 4.4, INKC, { a: 0.3 });
  line(g, [[720, 470], [706, 510], [691, 558], [676, 588], [660, 604], [650, 603]], 4.4, INKC, { a: 0.15, bias: 0.4 });
  line(g, [[722, 482], [738, 468], [762, 463], [785, 472], [800, 494], [814, 524]], 4.6, INKC, { a: 0.3 });
  line(g, [[794, 518], [778, 545], [760, 572], [741, 600], [724, 620], [716, 621]], 4.0, INKC, { a: 0.15, bias: 0.4 });
  line(g, [[790, 541], [806, 528], [830, 530], [852, 546], [872, 566], [887, 590], [896, 614], [898, 644], [893, 670], [884, 690]], 5.0, INKC, { a: 0.3 });
  // the little finger curling in, the small crease under it, the palm edge against the cheek
  line(g, [[846, 584], [841, 618], [838, 650], [846, 678], [866, 690], [884, 690]], 4.4, INKC, { a: 0.3 });
  line(g, [[800, 646], [822, 642], [838, 640]], 1.8, "rgba(20,20,20,0.8)", { a: 0.2 });
  line(g, [[814, 624], [828, 633], [838, 640]], 1.5, "rgba(20,20,20,0.7)", { a: 0.2 });
  line(g, [[838, 690], [868, 704], [900, 722]], 3.2, INKC, { a: 0.3 });
  // knuckle creases
  for (const [x, y] of [[664, 470], [760, 488], [568, 488], [828, 549]]) {
    for (let k = 0; k < 3; k++) line(g, [[x - 11 + k * 3, y + k * 4], [x, y - 3 + k * 4], [x + 11 - k * 2, y + k * 4]], 1.1, "rgba(30,30,30,0.45)", { a: 0.1 });
  }
  // soft lines on the palm side
  line(g, [[602, 650], [640, 700], [688, 752]], 1.3, "rgba(30,30,30,0.35)", { a: 0.1 });
  line(g, [[650, 620], [690, 680], [736, 740]], 1.2, "rgba(30,30,30,0.3)", { a: 0.1 });
  line(g, [[706, 632], [742, 690], [780, 745]], 1.2, "rgba(30,30,30,0.3)", { a: 0.1 });
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
