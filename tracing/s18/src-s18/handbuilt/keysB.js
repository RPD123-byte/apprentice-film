// s18 shot B plates (55.28–57.28): the extreme close-up of the synth keys, locked off.
//   background (never moves): black wall, the lit slatted panel, the dark box, the striped box with its round knob
//   keyboard (tips away at the end): knob row, black keys, lit white keys, dark front panel, the left cheek block
// Geometry measured on the source (median of 1382–1416 with the owl removed; the panel from 57.12 when the keys
// have rotated out of the way). The keyboard is the one in shot A seen ~3.36x closer (B = 3.357 * A - 1662).
import { Plate } from "../../../lib/engrave.js";
import { poly, blob, rect, lin, ink, blk, line, curve, stripes, rng, smoothPath, PI, taper } from "./kit.js";

const V = PI / 2;
const KB_R = 3000;   // the keyboard layer runs this far right (the tipping brings plate x up to ~2960 into frame)
export const KB = {
  front: 790, back: 546,
  // measured to 2183; beyond the frame (seen only when the synth tips away) the pattern continues at ~140 px
  gaps: [664, 800, 933, 1071, 1202, 1348, 1488, 1618, 1753, 1895, 2035, 2183, 2323, 2463, 2603, 2743, 2883, 3023],
  // black keys: [front right end, left end at the back]
  blacks: [[660, 392], [1000, 705], [1202, 1010], [1445, 1205], [1728, 1500], [1913, 1735], [2157, 1925], [2400, 2170], [2640, 2410], [2885, 2655]],
};
// white key i spans gaps[i-1]..gaps[i]; key 0 starts at the cheek (x 500)
export const keySpan = (i) => [i === 0 ? 500 : KB.gaps[i - 1], i < KB.gaps.length ? KB.gaps[i] : 2300];
export function keyAt(x) { let i = 0; while (i < KB.gaps.length && x > KB.gaps[i]) i++; return i; }

// ---------------------------------------------------------------- background
function paintBG(P) {
  const o = P.o, r = rng(501);
  // slatted panel: bright slats between wide ragged black grooves (dry brush), running the full height (the keys
  // hide its lower part); groove edges measured on the median of 1428-1432 with the keys tipped out of the way
  const PN = [[1138, -4], [1462, -4], [1462, 950], [1138, 950]];
  P.fill(poly(PN), lin(1138, 0, 1462, 0, [[0, 0.95], [0.6, 0.92], [1, 0.85]]), V, { spacing: 0.1, style: 2 });
  const grooves = [[1120, 1140], [1172, 1195], [1223, 1242], [1277, 1300], [1325, 1357], [1380, 1420], [1438, 1480]];
  for (const [a, b] of grooves) {
    // a black core with dry-brush edges: short ragged bites out of the slats on both sides
    const pts = []; for (let y = -8; y <= 950; y += 24) pts.push([(a + b) / 2 + (r() - 0.5) * 2.5, y]);
    taper(o, pts, () => (b - a) * 0.86, "#050505");
    for (const side of [-1, 1]) {
      const ex = side < 0 ? a : b;
      for (let y = -4; y < 950; y += 3 + r() * 4) {
        const d = 1 + r() * r() * 7, h = 2 + r() * 5;
        o.fillStyle = blk(0.85 + 0.15 * r()); o.fillRect(side < 0 ? ex + (b - a) * 0.07 - d : ex - (b - a) * 0.07, y, d + (b - a) * 0.07, h);
      }
    }
  }
  // fine dry-brush flecks inside the grooves (a few pale specks)
  o.fillStyle = ink(0.35);
  for (let i = 0; i < 120; i++) { const [a, b] = grooves[1 + Math.floor(r() * 5)]; o.fillRect(a + 4 + r() * (b - a - 8), r() * 900, 1.2 + r() * 1.5, 1.5 + r() * 2); }
  // the slatted wall far right, seen between the knobs: broken white vertical strokes
  for (const [x, y0, y1, w] of [[1715, 368, 430, 8], [1792, 352, 420, 4], [1838, 356, 426, 5], [1866, 352, 430, 6], [1890, 356, 430, 5], [1920, 350, 430, 7],
    [1985, 360, 425, 4], [2012, 342, 432, 9], [2062, 344, 452, 7], [2082, 350, 450, 6], [2108, 340, 400, 12], [2136, 344, 390, 8], [2160, 350, 440, 6], [2190, 346, 420, 7]]) {
    broken(o, [x, y0], [x + (r() - 0.5) * 2, y1], w, 0.85, r, { gap: 0.18 });
  }
  // faint dotted line right of the panel, and the thin double line on the dark box
  o.fillStyle = ink(0.35);
  for (let y = 0; y < 400; y += 5) { o.fillRect(1466 + (r() - 0.5) * 2, y, 2.2, 3); if (r() < 0.6) o.fillRect(1476, y + 2, 1.6, 2); }
  line(o, [[1745, -4], [1745, 322]], 2.4, ink(0.45), 503); line(o, [[1760, -4], [1760, 322]], 1.6, ink(0.3), 504);
  // striped box, top right, with a round black knob
  const SB = [[2006, -4], [2210, -4], [2210, 300], [2006, 300]];
  P.fill(poly(SB), 0.03, 0, { spacing: 0.4 });
  for (let k = 0; k < 17; k++) {
    const y = 8 + k * 17.5 + (r() - 0.5) * 2, h = 7 + r() * 5;
    taper(o, [[2008, y], [2110, y + (r() - 0.5) * 2], [2210, y]], () => h, ink(0.75 + 0.2 * r()));
  }
  o.fillStyle = "#050505"; o.beginPath(); o.ellipse(2160, 150, 60, 64, 0, 0, 7); o.fill();
  curve(o, [[2126, 128], [2136, 104], [2160, 96], [2178, 110], [2170, 130], [2156, 140], [2152, 160]], 7, ink(0.9), 505);
  o.fillStyle = ink(0.9); o.beginPath(); o.arc(2152, 176, 4, 0, 7); o.fill();
  line(o, [[2006, -4], [2006, 300]], 2, ink(0.5), 506);
  // shelf under it
  P.fill(rect(1880, 300, 330, 30), 0.02, 0);
  line(o, [[1880, 322], [2210, 318]], 2.2, ink(0.55), 507);
}

// ---------------------------------------------------------------- keyboard
// knob row on the black panel behind the keys: black cylinders on black — only their highlights read (measured on
// the owl-free median of 1382-1416 and on single frames): the rear row shows a thin dim-grey cap and two to four
// broken, knurled vertical ridges down the side; the front row, left of the panel, a ragged bright cap block with
// three or four short horizontal dashes on its face; right of the panel (x > 1450) a grey cap and vertical ridges.
// Cap heights follow the keyboard's slant. [x, row (0 rear, 1 front)]
const KNOBS = [
  ...[110, 285, 495, 705, 900, 1100, 1300, 1525, 1665, 1800, 1950, 2100, 2260, 2420, 2580, 2740, 2900, 3060].map((x) => [x, 0]),
  ...[190, 385, 595, 805, 995, 1188, 1390, 1560, 1720, 1897, 2045, 2190, 2340, 2490, 2640, 2790, 2940].map((x) => [x, 1]),
];
const capY = (x, row) => (row ? 445 + 0.011 * (x - 385) : 366 + 0.012 * (x - 250));
export const KNOB_W = [56, 58], KNOB_H = [92, 110];
// a broken stroke from a to b: dashes of 5-14 px with small gaps, width w, ragged
function broken(o, a, b, w, alpha, r, { gap = 0.3 } = {}) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  let d = r() * 4;
  while (d < L) {
    const s = 5 + r() * 10, e = Math.min(L, d + s), u0 = d / L, u1 = e / L;
    if (r() > gap) {
      const p0 = [a[0] + (b[0] - a[0]) * u0 + (r() - 0.5), a[1] + (b[1] - a[1]) * u0], p1 = [a[0] + (b[0] - a[0]) * u1 + (r() - 0.5), a[1] + (b[1] - a[1]) * u1];
      const ww = w * (0.6 + 0.6 * r());
      taper(o, [p0, [(p0[0] + p1[0]) / 2 + (r() - 0.5) * 0.8, (p0[1] + p1[1]) / 2], p1], (u) => ww * (0.55 + 0.45 * Math.sin(Math.PI * u)), ink(alpha * (0.6 + 0.4 * r())));
    }
    d = e + 1.5 + r() * 4;
  }
}
// a ragged horizontal highlight bar centred on (x, y)
function raggedBar(o, x, y, w, h, color, r) {
  const top = [], bot = [], n = 7;
  for (let i = 0; i <= n; i++) {
    const u = i / n, xx = x - w / 2 + w * u, e = Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u))), 0.35);
    top.push([xx, y - (h / 2) * e + (r() - 0.5) * 1.8]);
    bot.push([xx, y + (h / 2) * e + (r() - 0.5) * 1.8]);
  }
  o.fillStyle = color; o.beginPath(); smoothPath(o, [...top, ...bot.reverse()], true, 0.3); o.fill();
}
function paintKnob(o, x, row, seed) {
  const r = rng(seed), y = capY(x, row), right = x > 1450;
  if (row === 0) {
    // rear: thin dim cap, knurled ridges
    raggedBar(o, x, y, 46 + r() * 10, 6 + r() * 3, ink(0.5 + 0.15 * r()), r);
    const n = 2 + Math.floor(r() * 2.5), span = 38;
    for (let k = 0; k < n; k++) {
      const gx = x - span / 2 + span * (n === 1 ? 0.5 : k / (n - 1)) + (r() - 0.5) * 6;
      broken(o, [gx, y + 18 + r() * 8], [gx + (r() - 0.5) * 2, y + 62 + r() * 26], 3.2 + r() * 2.2, 0.75 + 0.2 * r(), r, { gap: 0.25 });
    }
  } else if (!right) {
    // front, left: a bright ragged cap block, dashes across the face
    raggedBar(o, x, y + 2, 50 + r() * 8, 15 + r() * 4, ink(0.9 + 0.08 * r()), r);
    for (const dy of [30, 42, 52, 62]) {
      if (r() < 0.25) continue;
      const hw = 16 + r() * 12, cx = x + (r() - 0.5) * 8;
      broken(o, [cx - hw, y + dy], [cx + hw, y + dy + (r() - 0.5) * 1.5], 2.6 + r() * 1.6, 0.7 + 0.25 * r(), r, { gap: 0.15 });
    }
  } else {
    // front, right: grey cap, vertical ridges
    raggedBar(o, x, y + 2, 50 + r() * 8, 8 + r() * 3, ink(0.55 + 0.15 * r()), r);
    for (const dx of [-17, -2, 12]) {
      const gx = x + dx + (r() - 0.5) * 5;
      broken(o, [gx, y + 22 + r() * 6], [gx + (r() - 0.5) * 2, y + 72 + r() * 14], 3.6 + r() * 2.4, 0.7 + 0.25 * r(), r, { gap: 0.2 });
    }
  }
}
function paintKB(P) {
  const o = P.o, r = rng(601);
  // black synth panel behind the knobs and keys
  P.fill(rect(-10, 440, KB_R + 10, 130), 0.01, 0, { spacing: 0.4 });
  for (const [x, row] of KNOBS) paintKnob(o, x, row, 610 + x + row * 7);
  // lit key bed
  P.fill(poly([[440, KB.back], [KB_R, KB.back], [KB_R, KB.front], [500, KB.front], [470, 700]]), 0.97, 0, { spacing: 0.1, style: 2 });
  // bevel lines: the raised top of each white key ends in a thin dark double line running down-right from the black
  // key above it to the top of the gap, where it hooks into the gap line
  for (const g of [...KB.gaps, KB_R + 100]) {
    line(o, [[g - 160, 632], [g - 70, 662], [g - 14, 684]], 3, "rgba(20,20,20,0.85)", 620 + g, 0.3);
    line(o, [[g - 170, 612], [g - 70, 646], [g - 20, 664]], 2, "rgba(20,20,20,0.6)", 621 + g, 0.3);
  }
  // white-key gaps: short hook at the top, then straight down to the front
  for (const g of KB.gaps) {
    line(o, [[g - 16, 682], [g - 4, 688], [g, 698], [g + 1, 740], [g, KB.front - 2]], 6, "rgba(18,18,18,0.92)", 640 + g, 0.7);
  }
  // black keys: big dark blocks, the rounded front end on the right, a bright sliver along the top face
  for (const [e, l] of KB.blacks) {
    const q = [[l, KB.back], [e - 60, KB.back], [e - 22, 560], [e - 6, 590], [e, 626], [e - 6, 652], [e - 28, 664], [e - 80, 662], [l + 20, 646], [l, 634]];
    o.fillStyle = "#050505"; o.beginPath(); smoothPath(o, q, true, 0.3); o.fill();
    o.fillStyle = ink(0.95); o.beginPath(); smoothPath(o, [[e - 140, KB.back + 4], [e - 22, 562], [e - 12, 586], [e - 140, KB.back + 12]], true, 0.2); o.fill();
    // soft cast shadow on the white key below its front end
    o.fillStyle = "rgba(10,10,10,0.3)"; o.beginPath(); smoothPath(o, [[e - 40, 662], [e - 6, 654], [e + 14, 670], [e - 30, 676]], true); o.fill();
  }
  // keys' front edge and the dark front panel with pale horizontal grain
  P.fill(rect(470, KB.front, KB_R - 470, 420), 0.03, 0, { spacing: 0.4 });
  line(o, [[500, KB.front + 1], [KB_R, KB.front + 1]], 4, "#060606", 660);
  for (let i = 0; i < 120; i++) {
    const y = 804 + r() * 142 + (r() < 0.3 ? 150 * r() : 0), x = 480 + r() * (KB_R - 500), L = 40 + r() * 360;
    line(o, [[x, y], [x + L, y + (r() - 0.5) * 2]], 1.4 + r() * 2.6, ink(0.35 + 0.45 * r()), 661 + i, 0.1);
  }
  // left cheek block: lit top bevel with hatching, dark inner face, pale edge line, front face with bright grain
  P.fill(poly([[-10, 452], [165, 441], [186, 538], [372, 538], [440, 600], [520, 622], [520, 704], [-10, 478]]), 0.94, 0.45, { spacing: 0.1, style: 2 });
  for (let k = 0; k < 4; k++) line(o, [[-10, 462 + k * 5], [180, 520 + k * 6], [440, 626 + k * 6]], 1.6 + r() * 1.4, "rgba(15,15,15,0.8)", 670 + k, 0.2);
  P.fill(poly([[-10, 478], [520, 704], [520, 950], [-10, 950]]), 0.01, 0);
  line(o, [[-10, 490], [200, 578], [440, 690]], 2.4, ink(0.6), 680);
  const LS = [[-10, 700], [380, 866], [384, 882], [-10, 716]];
  P.fill(poly(LS), 0.8, 0.4, { spacing: 0.15 });
  for (let k = 0; k < 14; k++) { const u = k / 13; line(o, [[-10 + 390 * u, 703 + 166 * u], [-10 + 390 * u + 14, 716 + 166 * u]], 2.2, blk(0.8), 681 + k, 0.5); }
  P.fill(poly([[436, 670], [500, 700], [500, 950], [436, 950]]), 0.06, V);
  for (const [x, w, a] of [[442, 5, 0.9], [452, 3, 0.6], [470, 6, 0.85], [488, 4, 0.7]]) line(o, [[x, 684 + (x - 436) * 0.4], [x + 1, 950]], w, ink(a), 700 + x, 0.3);
}

// ---------------------------------------------------------------- mask of the keyboard layer (knobs + everything below)
function kbMask(g) {
  g.fillStyle = "#fff";
  g.fillRect(-10, 440, KB_R + 10, 800);
  for (const [x, row] of KNOBS) { const w = KNOB_W[row], y = capY(x, row); g.beginPath(); g.roundRect(x - w / 2, y - 10, w, KNOB_H[row], 8); g.fill(); }
  g.beginPath(); poly([[-10, 440], [165, 436], [505, 590], [505, 700], [-10, 700]])(g); g.fill();
}
let L = null;
export function keysBLayers() {
  if (L) return L;
  let P = new Plate(2206, 946, 1);
  paintBG(P);
  const bg = P.engrave({ spacing: 4.6, seed: 23, contrast: 1.05 });
  // the keyboard is painted with a margin so the tipping never shows an edge
  const M = 260, KW = M + KB_R, KH = 946 + M;
  P = new Plate(KW, KH, 1);
  for (const g of [P.v, P.d, P.o]) g.translate(M, 0);
  paintKB(P);
  const kb = P.engrave({ spacing: 4.6, seed: 29, contrast: 1.05 });
  const m = document.createElement("canvas"); m.width = KW; m.height = KH;
  const mg = m.getContext("2d"); mg.translate(M, 0); kbMask(mg);
  const kg = kb.getContext("2d"); kg.save(); kg.globalCompositeOperation = "destination-in"; kg.drawImage(m, 0, 0); kg.restore();
  L = { bg, kb, M };
  return L;
}
export function releaseKeysB() { L = null; }

// ---------------------------------------------------------------- a key pressed down (drawn on the keyboard layer)
// The key's top drops: its back half falls into shadow (the neighbours' side walls show as hatched bands) and a
// dark line runs across its front where the top now sits lower.
export function drawPressed(g, i, depth = 1) {
  const [a, b] = keySpan(i);
  if (depth <= 0) return;
  g.save();
  g.globalAlpha = Math.min(1, depth);
  // the gap opened above the key's back edge: a dark band running down-right, the side wall's grain showing as
  // pale lines along it
  const band = [[a - 120, 598], [a - 70, 598], [b + 2, 688], [b + 2, 722], [a - 120, 638]];
  g.fillStyle = "#0a0a0a"; g.beginPath(); poly(band)(g); g.fill();
  g.save(); g.beginPath(); poly(band)(g); g.clip();
  g.strokeStyle = "rgba(235,233,226,0.85)"; g.lineCap = "round";
  const dx = b + 2 - (a - 120), dy = 90;
  for (let k = 0; k < 5; k++) { g.lineWidth = 2.2 + (k % 2); g.beginPath(); g.moveTo(a - 125, 606 + k * 7); g.lineTo(a - 125 + dx, 606 + k * 7 + dy); g.stroke(); }
  g.restore();
  // the key top, now lower: a line across it and a second edge down its right side
  g.fillStyle = "#141414"; g.fillRect(a + 2, 740, b - a - 10, 4);
  g.fillRect(b - 10, 700, 3.5, 90);
  g.restore();
}
