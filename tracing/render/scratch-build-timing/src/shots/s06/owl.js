// The owl on his shoulder in s06: the kit's "front" pose re-proportioned to the source (round head sitting low on a
// broad egg body), with the parts that differ from the kit drawn here in frame px from measurements at 27.0 / 28.0–28.56:
// sad heavy-lidded glossy eyes and the blink states, the pale diamond beak, the three-spike tuft, side-on headphones
// (dark ribbed cushions, lit shell rim, thin band), the near wing and the pencil texture on the body.
import { owlPose } from "../../lib/owlInk.js";
import { taper } from "../../lib/ink.js";
import { sampleCurve, smoothPath } from "../../lib/paths.js";
import { line, gv } from "./kit.js";
import { rng } from "../../lib/rng.js";

export const OWL_PLACE = { x: 1667, y: 452, s: 1.13, tone: false };
export const HEAD_C = [1662, 318];          // roll centre (camtrack fit on the owl head during the blink)
const D = Math.PI / 180;

export const ROLL = { sad: 0, low1: 0.23, low2: 0.8, slit: 1.38, shut: 2.0, shut2: 1.42, half: 0.98, half2: 0.82 };

export function owlState(key) {
  // the kit draws the body, plumage, bandage and feet; its eyes are pushed round the back of the head (the eyes,
  // beak, tuft and headphones are drawn in drawHeadphones below, in frame px from the source measurements)
  return owlPose("front", {
    head: { x: -4, y: -121, rx: 112, ry: 94, roll: (ROLL[key] || 0) * D, yaw: 0, square: 1.8, jowl: 0.12 },
    tufts: [],
    body: { x: 12, y: 4, a: 104, b: 124, egg: -0.08 },
    wings: [
      { type: "folded", layer: "front", S: [-102, -24], T: [-84, 84], width: 10, back: 6, dir: -1 },
      { type: "folded", layer: "front", S: [100, -64], T: [114, 76], width: 50, back: 24, dir: 1 },
    ],
    feet: [{ x: -42, y: 94, rot: 0.1, size: 23, mode: "perch", toes: 3, spread: 0.5, seed: 2 }, { x: 30, y: 102, rot: -0.1, size: 23, mode: "perch", toes: 3, spread: 0.5, seed: 5 }],
    eyes: { state: "stare", r: 0.3, spread: 3.0, el: -0.22 },
    beak: { el: -0.5, lift: 1.25, w: 20, l: 22 },
    bandage: { az: -0.68, el: 0.8, size: 66, rot: -0.6 },
    headphones: { on: false },
    disc: 0,
  });
}

// The eyes, measured per state on the source (2x crops 28.00–28.56): lid line [outer y, inner y] for each eye,
// the opening = an ellipse cut by the lid, a dark glossy iris with two highlights; shut = a sagging arc.
const EYE_GEO = [
  { c: [1615, 349], rx: 31, ry: 21, iris: [1614, 352, 20], xo: 1583, xi: 1646, side: -1 },
  { c: [1720, 349], rx: 32, ry: 21, iris: [1716, 351, 20], xo: 1753, xi: 1689, side: 1 },
];
const LIDS = {
  sad: [[343, 330], [340, 333]], low1: [[346, 336], [342, 337]], low2: [[348.5, 344], [350, 342.5]], slit: [[351, 350], [352, 348]],
  half: [[350.5, 348.5], [351.5, 347.5]], half2: [[348, 343], [349.5, 342]],
};
const LOWER = { sad: 0, low1: 1, low2: 3, slit: 6, half: 5, half2: 3 };   // the lower lid rises as the eye closes
export function drawOwlEyes(g, key) {
  const shut = key === "shut" || key === "shut2";
  EYE_GEO.forEach((E0, i) => {
    let E = E0;
    const [cx0, cy0] = E.c;
    // clear the kit's plumage marks under the eye
    if (shut) {
      const dy = key === "shut2" ? 1 : 0;
      const a = [[E.xo, cy0 + 8 + dy], [cx0, cy0 + 16 + dy], [E.xi, cy0 + 8 + dy]];
      line(g, a, 4.2, "#1c1c1c", { a: 0.35 });
      return;
    }
    const [yo, yi] = LIDS[key][i];
    E = { ...E, ry: E.ry - LOWER[key], c: [E.c[0], E.c[1] - LOWER[key] * 0.5] };
    const [cx, cy] = E.c;
    const lidY = (x) => yo + (yi - yo) * (x - E.xo) / (E.xi - E.xo);
    const open = (c) => {
      c.moveTo(E.xo, lidY(E.xo)); c.lineTo(E.xi, lidY(E.xi));
      // down the inner side and round the bottom of the ellipse back to the outer corner
      const N = 30;
      const a0 = Math.atan2((lidY(E.xi) - cy) / E.ry, (E.xi - cx) / E.rx), a1 = Math.atan2((lidY(E.xo) - cy) / E.ry, (E.xo - cx) / E.rx);
      let A0 = a0, A1 = a1;
      if (E.side < 0) { if (A1 < A0) A1 += 2 * Math.PI; } else { if (A1 > A0) A1 -= 2 * Math.PI; }
      for (let k = 0; k <= N; k++) { const a = A0 + (A1 - A0) * k / N; c.lineTo(cx + Math.cos(a) * E.rx, cy + Math.sin(a) * E.ry); }
      c.closePath();
    };
    g.save(); g.beginPath(); open(g); g.fillStyle = "#f3f2ee"; g.fill(); g.clip();
    const [ix, iy, ir] = E.iris;
    const gr = g.createLinearGradient(0, iy - ir, 0, iy + ir);
    gr.addColorStop(0, "#080808"); gr.addColorStop(0.5, "#151515"); gr.addColorStop(0.78, "#383838"); gr.addColorStop(1, "#555");
    g.fillStyle = gr; g.beginPath(); g.arc(ix, iy, ir, 0, 7); g.fill();
    g.fillStyle = "rgba(10,10,10,0.9)"; g.beginPath(); g.arc(ix, iy - 2, ir * 0.5, 0, 7); g.fill();
    // lid shadow
    const sh = g.createLinearGradient(0, lidY(ix) - 2, 0, lidY(ix) + 9);
    sh.addColorStop(0, "rgba(10,10,10,0.7)"); sh.addColorStop(1, "rgba(10,10,10,0)");
    g.fillStyle = sh; g.fillRect(E.xo - 40, lidY(ix) - 12, 110, 22);
    g.fillStyle = "#f6f5f1";
    g.beginPath(); g.arc(ix - 8, iy - 6, 5.2, 0, 7); g.fill();
    g.beginPath(); g.arc(ix + 11, iy + 8, 2.2, 0, 7); g.fill();
    g.restore();
    // lower outline, then the heavy lid line running a little past the inner corner with a small up-flick
    g.strokeStyle = "#202020"; g.lineWidth = 1.8; g.beginPath();
    const N = 30, a0 = Math.atan2((lidY(E.xi) - cy) / E.ry, (E.xi - cx) / E.rx), a1 = Math.atan2((lidY(E.xo) - cy) / E.ry, (E.xo - cx) / E.rx);
    let A0 = a0, A1 = a1; if (E.side < 0) { if (A1 < A0) A1 += 2 * Math.PI; } else { if (A1 > A0) A1 -= 2 * Math.PI; }
    for (let k = 0; k <= N; k++) { const a = A0 + (A1 - A0) * k / N; const x = cx + Math.cos(a) * E.rx, y = cy + Math.sin(a) * E.ry; k ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    const ext = -E.side * 4;
    line(g, [[E.xo + E.side * 2, lidY(E.xo) + 1], [(E.xo + E.xi) / 2, lidY((E.xo + E.xi) / 2)], [E.xi + ext, lidY(E.xi + ext)], [E.xi + ext * 1.6, lidY(E.xi + ext) - 3]], 4.4, "#141414", { a: 0.35, pow: 0.3 });
  });
}

// Headphones in frame px, rolled with the head.
export function drawHeadphones(g, rollDeg, key = "sad") {
  g.save();
  g.translate(HEAD_C[0], HEAD_C[1]); g.rotate(rollDeg * D); g.translate(-HEAD_C[0], -HEAD_C[1]);
  // the tuft: three soft spikes rising from the head's upper right
  const tuft = [[1732, 258], [1742, 236], [1752, 222], [1760, 212], [1762, 226], [1772, 212], [1780, 205], [1780, 220], [1790, 214], [1796, 226], [1790, 246], [1782, 262], [1760, 266]];
  g.fillStyle = "#efeeea"; g.beginPath(); smoothPath(g, tuft, true); g.fill();
  line(g, [[1742, 250], [1752, 226], [1760, 212]], 1.3, "rgba(80,80,80,0.6)", { a: 0.15 });
  line(g, [[1762, 240], [1772, 216], [1780, 205]], 1.3, "rgba(80,80,80,0.6)", { a: 0.15 });
  line(g, [[1778, 236], [1786, 222], [1790, 214], [1796, 226]], 1.3, "rgba(80,80,80,0.6)", { a: 0.15 });
  drawOwlEyes(g, key);
  // band: dark metal strip with a lit top edge
  const band = [[1549, 218], [1556, 194], [1580, 168], [1616, 149], [1656, 140], [1700, 144], [1745, 160], [1776, 182], [1796, 208]];
  line(g, band, 9, "#0e0e0e", { a: 0.9, pow: 0.2 });
  line(g, band, 6, gv(0.3), { a: 0.9, pow: 0.2 });
  line(g, band.map(([x, y]) => [x, y - 1.8]), 1.8, gv(0.75), { a: 0.5 });
  // sliders
  for (const [x, y, a] of [[1552, 203, -1.2], [1792, 200, 1.05]]) {
    g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = gv(0.72); g.strokeStyle = "#111"; g.lineWidth = 1.5;
    g.beginPath(); g.roundRect(-12, -5, 24, 10, 3); g.fill(); g.stroke();
    g.restore();
  }
  g.save(); g.filter = "blur(7px)"; g.fillStyle = "rgba(242,241,237,0.85)"; g.beginPath(); g.ellipse(1664, 418, 100, 16, 0, 0, 7); g.fill(); g.restore();
  // body plumage: a soft grey falloff toward the edges and fine feather flicks (the source's pencil texture)
  g.save(); g.beginPath(); g.ellipse(1680, 462, 140, 118, 0, 0, 7); g.clip();
  const rg = g.createRadialGradient(1690, 440, 60, 1680, 462, 150);
  rg.addColorStop(0, "rgba(120,120,120,0)"); rg.addColorStop(0.75, "rgba(120,120,120,0.05)"); rg.addColorStop(1, "rgba(90,90,90,0.25)");
  g.fillStyle = rg; g.fillRect(1530, 340, 300, 250);
  const rr = rng(606);
  for (let i = 0; i < 260; i++) {
    const a = rr() * Math.PI * 2, q = Math.sqrt(rr());
    const x = 1680 + Math.cos(a) * 135 * q, y = 462 + Math.sin(a) * 112 * q;
    if (y < 400 && Math.abs(x - 1666) < 60) continue;
    const L = 5 + rr() * 9, an = 1.57 + (x - 1680) * 0.004 + (rr() - 0.5) * 0.5;
    line(g, [[x, y], [x + Math.cos(an) * L, y + Math.sin(an) * L]], 0.9 + 0.5 * q, `rgba(90,90,90,${0.12 + 0.25 * q * rr()})`, { a: 0.2 });
  }
  g.restore();
  // the near (right) wing: a pale folded wing with a few feather edges, over the kit's hatched one
  g.restore(); g.save();
  const wing = [[1762, 396], [1790, 410], [1812, 430], [1826, 458], [1826, 490], [1814, 520], [1796, 546], [1778, 540], [1768, 510], [1760, 470], [1756, 430]];
  g.fillStyle = "#eeede9"; g.beginPath(); smoothPath(g, wing, true); g.fill();
  line(g, [[1790, 410], [1812, 430], [1826, 458], [1826, 490], [1814, 520], [1796, 546]], 2.2, "rgba(40,40,40,0.8)", { a: 0.3 });
  line(g, [[1762, 400], [1758, 440], [1762, 480], [1772, 520], [1790, 545]], 1.6, "rgba(60,60,60,0.6)", { a: 0.2 });
  for (const [a, b, c] of [[[1772, 440], [1792, 452], [1812, 470]], [[1770, 470], [1790, 484], [1808, 504]], [[1774, 500], [1790, 514], [1800, 532]]]) line(g, [a, b, c], 1.3, "rgba(80,80,80,0.55)", { a: 0.2 });
  g.restore(); g.save();
  g.translate(HEAD_C[0], HEAD_C[1]); g.rotate(rollDeg * D); g.translate(-HEAD_C[0], -HEAD_C[1]);
  // facial disc: two pale-grey rims meeting in a V between the eyes; faint feather V's on the chest
  line(g, [[1662, 306], [1640, 288], [1612, 281], [1585, 288], [1566, 312], [1562, 345], [1572, 378], [1595, 402]], 1.7, "rgba(120,120,120,0.35)", { a: 0.2 });
  line(g, [[1662, 306], [1686, 288], [1716, 282], [1746, 292], [1766, 318], [1770, 350], [1760, 385], [1738, 405]], 1.7, "rgba(120,120,120,0.35)", { a: 0.2 });
  for (const [x, y] of [[1618, 468], [1662, 478], [1706, 468], [1640, 502], [1688, 506], [1600, 520], [1728, 520]]) line(g, [[x - 7, y - 3], [x, y + 2], [x + 7, y - 3]], 1.2, "rgba(120,120,120,0.35)", { a: 0.3 });
  // beak: a pale diamond with a thin grey keyline, over the kit's (smaller) beak
  g.fillStyle = "#f1f0ec"; g.filter = "blur(2px)"; g.beginPath(); g.ellipse(1666, 386, 20, 24, 0, 0, 7); g.fill(); g.filter = "none";
  const bk = [[1651, 373], [1666, 369], [1682, 372], [1675, 390], [1666, 405], [1657, 390]];
  g.fillStyle = "#dedcd6"; g.beginPath(); smoothPath(g, bk, true); g.fill();
  g.strokeStyle = "rgba(60,60,60,0.8)"; g.lineWidth = 1.6; g.beginPath(); smoothPath(g, bk, true); g.stroke();
  line(g, [[1668, 375], [1672, 388], [1667, 400]], 1.1, "rgba(90,90,90,0.5)", { a: 0.2 });
  cup(g, 1536, 308, -1);
  cup(g, 1812, 306, 1);
  g.restore();
}
function cup(g, cx, cy, side) {
  // side -1: the left cup (shell on the outer/left side), +1: right cup
  const sh = [cx + side * 8, cy], cu = [cx - side * 7, cy + 4];
  // yoke from the slider down to the shell
  line(g, [[cx + side * 2 - side * 10, cy - 100], [cx + side * 6, cy - 78], [cx + side * 8, cy - 60]], 6, "#101010", { a: 0.6 });
  line(g, [[cx + side * 2 - side * 10, cy - 100], [cx + side * 6, cy - 78], [cx + side * 8, cy - 60]], 3, gv(0.6), { a: 0.6 });
  // shell: a tall ellipse, dark body with a lit outer rim
  g.fillStyle = "#1a1a1a"; g.beginPath(); g.ellipse(sh[0], sh[1], 19, 62, 0, 0, 7); g.fill();
  const lg = g.createLinearGradient(sh[0] - 19 * side, 0, sh[0] + 19 * side, 0);
  lg.addColorStop(0, "#161616"); lg.addColorStop(0.55, "#2a2a2a"); lg.addColorStop(0.85, "#707070"); lg.addColorStop(1, "#9a9a9a");
  g.fillStyle = lg; g.beginPath(); g.ellipse(sh[0], sh[1], 17, 60, 0, 0, 7); g.fill();
  g.strokeStyle = "#0c0c0c"; g.lineWidth = 2; g.beginPath(); g.ellipse(sh[0], sh[1], 19, 62, 0, 0, 7); g.stroke();
  g.strokeStyle = "rgba(200,200,195,0.5)"; g.lineWidth = 1.3; g.beginPath(); g.ellipse(sh[0] + side * 2, sh[1], 12, 52, 0, 0, 7); g.stroke();
  // cushion toward the head: dark, ribbed with pale folds
  g.fillStyle = "#121212"; g.beginPath(); g.ellipse(cu[0], cu[1], 14, 58, 0, 0, 7); g.fill();
  g.save(); g.beginPath(); g.ellipse(cu[0], cu[1], 13, 56, 0, 0, 7); g.clip();
  for (let k = -7; k <= 7; k++) {
    const y = cu[1] + k * 7.6, w = 13 * Math.sqrt(Math.max(0, 1 - (k * 7.6 / 56) ** 2));
    taper(g, [[cu[0] - w, y], [cu[0], y + 3], [cu[0] + w, y]], (u) => 2.4 * Math.sin(Math.PI * u), `rgba(170,170,170,${0.5 + 0.2 * Math.cos(k)})`);
  }
  g.restore();
  g.strokeStyle = "#0a0a0a"; g.lineWidth = 1.6; g.beginPath(); g.ellipse(cu[0], cu[1], 14, 58, 0, 0, 7); g.stroke();
}
