// s01 laptop pages. Page units: 1000 x 508 = the laptop screen (content quad, see screen.js).
// Every position below was measured on the source (plate coordinates at t=0 mapped back through the
// screen homography): snapshots/s01-fix1-meas/pgconv.py.
//   sōko      the full-frame sōko page (sites.js, 2206x946) shown squeezed on the screen: x 0.4306, y 0.551, at (25, 6)
//   letters   "Letters, cut by hand." type-foundry page (light)
//   machines  "Machines for small hours." synth store (dark)
//   issue     "ISSUE 14 / THE QUIET / ISSUE" editorial page (light)
import { rng } from "../../lib/rng.js";

export const PU_W = 1000, PU_H = 508;

// ---------- text fitting: place a line so its ink spans [x0, x1] with cap top / baseline as measured ----------
function capHeight(g, font) {
  g.font = font;
  const m = g.measureText("H");
  return m.actualBoundingBoxAscent || 70;
}
// size the font from the cap height (capTop..baseline), then stretch horizontally so the ink spans x0..x1
function fitLine(g, text, family, x0, x1, capTop, baseline, color, { stretch = "normal", ref = null, opsz = 0 } = {}) {
  g.save();
  g.fontStretch = stretch;
  const probe = `${family.replace("{s}", 100)}`;
  const ch = capHeight(g, probe);
  const size = ((baseline - capTop) / ch) * 100;
  // opsz: set the face at a small size (a low optical size: a heavier, lower-contrast text cut) and scale it up
  const fs = opsz > 0 ? opsz : size, k = size / fs;
  g.font = family.replace("{s}", fs.toFixed(2));
  const m = g.measureText(text);
  const inkL = -m.actualBoundingBoxLeft * k, inkR = m.actualBoundingBoxRight * k;
  const sx = x1 != null ? (x1 - x0) / (inkR - inkL) : 1;
  g.translate(x0, baseline);
  g.scale(sx * k, k);
  g.fillStyle = color;
  g.fillText(text, -inkL / k, 0);
  g.restore();
  return { size, sx, opsz };
}
// same font as a fitted line (size, sx), placed by its left ink edge and baseline
function placeLine(g, text, family, size, sx, x0, baseline, color, { stretch = "normal", x1 = null, opsz = 0 } = {}) {
  g.save();
  g.fontStretch = stretch;
  const fs = opsz > 0 ? opsz : size, kk = size / fs;
  g.font = family.replace("{s}", fs.toFixed(2));
  const m = g.measureText(text);
  const inkL = -m.actualBoundingBoxLeft * kk, inkR = m.actualBoundingBoxRight * kk;
  const k = x1 != null ? (x1 - x0) / (inkR - inkL) : sx;
  g.translate(x0, baseline); g.scale(k * kk, kk);
  g.fillStyle = color; g.fillText(text, -inkL / kk, 0);
  g.restore();
}
// scale one glyph (or word) so its ink box is exactly [x0,x1] x [y0,y1]
function fitBox(g, text, font, x0, y0, x1, y1, color, fs = 100) {
  g.save();
  g.font = font.replace("{s}", fs);
  const m = g.measureText(text);
  const L = -m.actualBoundingBoxLeft, R = m.actualBoundingBoxRight, A = m.actualBoundingBoxAscent, D = m.actualBoundingBoxDescent;
  g.translate(x0, y0); g.scale((x1 - x0) / (R - L), (y1 - y0) / (A + D));
  g.fillStyle = color; g.fillText(text, -L, A);
  g.restore();
}
function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
// a line of body copy (fix pass 2r): real small text (Geist, cap height ~h) so it blurs into continuous grey lines like
// the source's, instead of dashed placeholder bars; the words are generic filler, fitted to [x0, x1]
const COPY = "Each face is drawn by hand, proofed on paper and cut again until the rhythm of the line sits right in small sizes and large ones alike the studio keeps its drawings open late into the night";
function copyLine(g, x0, x1, y, h, color, seed) {
  const r = rng(seed), words = COPY.split(" "), k = Math.floor(r() * words.length);
  const text = words.slice(k).concat(words.slice(0, k)).join(" ");
  g.save();
  g.font = `400 ${(h * 1.45).toFixed(2)}px Geist`;
  let t = text; while (t.length > 4 && g.measureText(t).width > (x1 - x0) * 1.08) t = t.slice(0, t.lastIndexOf(" "));
  const w = g.measureText(t).width;
  g.translate(x0, y); g.scale((x1 - x0) / w, 1);
  g.fillStyle = color; g.fillText(t, 0, 0);
  g.restore();
}

// ---------------------------------------------------------------- Letters, cut by hand.
export function drawLettersPage(g) {
  g.fillStyle = "#f3f3ef"; g.fillRect(0, 0, PU_W, PU_H);
  // header: logo, nav, rule
  fitLine(g, "O&I", "700 {s}px Fraunces", 17.7, 69.8, 18.5, 43.5, "#141414");
  g.font = "500 13px Geist"; g.fillStyle = "#4a4a48"; g.fillText("Type Foundry", 88, 36);
  g.fillStyle = "#8d8c88";
  for (const [x, w] of [[205, 34], [262, 62], [352, 40], [414, 30]]) copyLine(g, x, x + w, 36, 8, "#a4a39f", x);
  g.fillStyle = "#c9c8c3"; g.fillRect(0, 57, PU_W, 1.6);
  // specimen tiles
  g.strokeStyle = "#cfcec9"; g.lineWidth = 1.8;
  const cols = [[583, 753], [765, 937], [950, 1120]];
  for (const [a, b] of cols) { g.beginPath(); g.moveTo(a, 58); g.lineTo(a, 85); g.lineTo(b, 85); g.lineTo(b, 58); g.stroke(); }
  for (const [a, b] of cols) g.strokeRect(a, 98, b - a, 184);
  for (const [a, b] of cols.slice(1)) g.strokeRect(a, 305, b - a, 176);
  // specimens: a heavier, low-optical-size cut (source ink coverage in the "g" box 0.28), same fitted boxes
  const glyph = "480 {s}px Fraunces";
  // "a" (x-height 130..187), "g", "R" (cap 326..452)
  fitBox(g, "R", glyph, 782, 326, 906, 452, "#1f1f1e", 14);
  fitBox(g, "a", glyph, 637, 130, 701, 187, "#1f1f1e", 14);
  fitBox(g, "g", glyph, 801, 134, 899, 263, "#1f1f1e", 14);
  g.fillStyle = "#2b2b2a"; g.beginPath(); g.arc(968, 176, 5, 0, 7); g.fill();
  // headline
  // headline: weight 560 at a low optical size (the source's serif is heavier and lower in contrast; ink coverage
  // in the "Letters," box 0.28 vs 0.21 for the 600 display cut), fitted to the same boxes
  // fix pass 2r: weight 640 (the source's dark-ink coverage in the headline box is ~0.176; 560 gave 0.149)
  const hl = fitLine(g, "Letters,", "640 {s}px Fraunces", 65, 442, 100.5, 180, "#141413", { opsz: 14 });
  placeLine(g, "cut by hand.", "640 {s}px Fraunces", hl.size, hl.sx, 66, 303, "#141413", { x1: 698, opsz: 14 });
  // body copy and the button
  copyLine(g, 73, 424, 380, 7, "#8a8a8a", 11);
  copyLine(g, 73, 420, 400, 7, "#8a8a8a", 12);
  copyLine(g, 73, 330, 420, 7, "#8a8a8a", 13);
  g.fillStyle = "#1e1e1e"; rr(g, 75, 450, 160, 36, 18); g.fill();
  copyLine(g, 104, 206, 472, 6, "#8e8e8a", 14);
}

// ---------------------------------------------------------------- Machines for small hours.
export function drawMachinesPage(g) {
  g.fillStyle = "#1f201f"; g.fillRect(0, 0, PU_W, PU_H);
  g.fillStyle = "#e9e9e6"; rr(g, 41, 15.5, 20, 20, 3); g.fill();
  copyLine(g, 66, 100, 25, 4, "#6b6c6b", 3); copyLine(g, 66, 92, 33, 4, "#5a5b5a", 4);
  for (const [x, w] of [[705, 50], [775, 40], [855, 22], [925, 16]]) {
    g.fillStyle = "#d8d8d5"; g.beginPath(); g.arc(x, 31, 3.2, 0, 7); g.fill();
    copyLine(g, x + 8, x + 8 + w, 34, 5, "#7a7b7a", x);
  }
  fitLine(g, "Machines for small hours.", "700 {s}px Geist", 82, 925, 94, 143.5, "#f2f2ef");
  // the synth, a product shot seen from above and in front: a top face (panel + keys) drawn in slight perspective
  // (the far edge narrower), a darker front lip under the keys, and its shadow on the page (pg-synth.jpg)
  g.fillStyle = "rgba(0,0,0,0.6)"; g.beginPath(); g.moveTo(196, 274); g.lineTo(820, 274); g.lineTo(826, 286); g.lineTo(190, 286); g.closePath(); g.fill();
  const lip = g.createLinearGradient(0, 262, 0, 275); lip.addColorStop(0, "#8c8d8b"); lip.addColorStop(1, "#5d5e5c");
  g.fillStyle = lip; g.beginPath(); g.moveTo(186, 262); g.lineTo(826, 262); g.lineTo(822, 275); g.lineTo(190, 275); g.closePath(); g.fill();
  g.save();
  // perspective: map the flat top face (x 191..822, y 188..262) onto a trapezoid 6 units narrower at the back
  g.beginPath(); g.moveTo(197, 188); g.lineTo(816, 188); g.lineTo(826, 262); g.lineTo(186, 262); g.closePath(); g.clip();
  // a grey controller (fix pass 2r, rectified source at 2.20: a grey body, a row of dark controls along the top over
  // the whole width with a break toward the right, greyer keys with black keys, a small screen and two dark pads at the
  // left end)
  const body = g.createLinearGradient(0, 188, 0, 262); body.addColorStop(0, "#a6a6a2"); body.addColorStop(1, "#b8b8b4");
  g.fillStyle = body; g.fillRect(180, 186, 660, 80);
  g.fillStyle = "#2a2a2a"; g.fillRect(203, 196, 40, 9);
  for (const [x, y] of [[208, 218], [224, 218], [240, 218]]) { g.fillStyle = "#3a3a39"; g.beginPath(); g.arc(x, y, 4.6, 0, 7); g.fill(); }
  g.fillStyle = "#262626"; g.fillRect(203, 232, 16, 16); g.fillRect(224, 232, 16, 16);
  const k0 = 258, k1 = 814, nW = 40;
  const xb = (x) => 506 + (x - 506) * 0.985;
  // the control row: dark faders / buttons
  for (let x = 262; x < 806; x += 13.6) { if (x > 628 && x < 660) continue; g.fillStyle = "#262626"; g.fillRect(xb(x), 192, 8.4, 11); g.fillStyle = "#6e6e6c"; g.fillRect(xb(x) + 2.5, 194, 3.4, 2); }
  for (let i = 0; i < nW; i++) {
    const x0 = k0 + ((k1 - k0) * i) / nW, x1 = k0 + ((k1 - k0) * (i + 1)) / nW;
    g.fillStyle = "#d9d9d6"; g.beginPath(); g.moveTo(xb(x0) + 0.6, 208); g.lineTo(xb(x1) - 0.6, 208); g.lineTo(x1 - 0.6, 257); g.lineTo(x0 + 0.6, 257); g.closePath(); g.fill();
  }
  for (let i = 0; i < nW - 1; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) {
    const x = k0 + ((k1 - k0) * (i + 1)) / nW, w = ((k1 - k0) / nW) * 0.62, xx = xb(x);
    g.fillStyle = "#1a1a1a"; g.fillRect(xx - w / 2, 208, w, 28);
    g.fillStyle = "rgba(0,0,0,0.3)"; g.fillRect(xx - w / 2 + 1, 236, w, 6);
  }
  g.restore();
  // outline button and the small line under it
  g.strokeStyle = "#dcdcd8"; g.lineWidth = 3; rr(g, 372, 347, 256, 57, 28.5); g.stroke();
  fitLine(g, "See the machines", "600 {s}px Geist", 408, 592, 366, 384, "#e4e4e1");
  copyLine(g, 453, 545, 464, 5, "#5d5e5d", 9);
}

// ---------------------------------------------------------------- ISSUE 14 · THE QUIET ISSUE
export function drawIssuePage(g) {
  g.fillStyle = "#ededea"; g.fillRect(0, 0, PU_W, PU_H);
  fitLine(g, "O&I", "700 {s}px Fraunces", 13, 58.6, 18.5, 43.5, "#141414");
  g.font = "500 13px Geist"; g.fillStyle = "#4a4a48"; g.fillText("Small Comm.", 74, 36);
  for (const [x, w] of [[180, 36], [236, 70], [330, 44], [398, 30]]) copyLine(g, x, x + w, 36, 8, "#b0afab", x + 7);
  g.fillStyle = "#c9c8c3"; g.fillRect(0, 57, PU_W, 1.6);
  // fix pass 2r: near-black and one weight heavier (source coverage ~0.375 in the headline box; 800 / #232322 gave 0.325)
  const F = "900 {s}px Archivo";
  const a = fitLine(g, "ISSUE 14", F, 39, 471, 76, 194, "#111111", { stretch: "extra-condensed" });
  placeLine(g, "THE QUIET", F, a.size, a.sx, 47, 338, "#111111", { stretch: "extra-condensed", x1: 532 });
  placeLine(g, "ISSUE", F, a.size, a.sx, 45, 476, "#111111", { stretch: "extra-condensed", x1: 317 });
  g.fillStyle = "#2a2a29"; g.fillRect(39, 486, 109, 5);
  // column rule and the right-hand columns
  g.fillStyle = "#cdccc7"; g.fillRect(541, 60, 1.6, 448);
  g.fillStyle = "#cdccc7"; g.fillRect(783, 60, 1.2, 448);
  // the right column's intro: ~20% smaller and darker than before (the source's is a small dark serif)
  const s = fitLine(g, "Notes from the", "500 {s}px Fraunces", 574, 728, 88, 104, "#444444");
  for (const [i, txt] of ["small hours of", "the studio floor.", "Three interviews"].entries())
    placeLine(g, txt, "500 {s}px Fraunces", s.size, s.sx, 574, 104 + (i + 1) * 29, "#444444");
  for (let i = 0; i < 20; i++) copyLine(g, 578, 578 + (i % 6 === 5 ? 120 : 186), 252 + i * 12.4, 4.2, "#8f8e8a", 40 + i);
  for (let i = 0; i < 34; i++) copyLine(g, 795, 795 + 140 + ((i * 37) % 50), 90 + i * 12.2, 4.2, "#9a9995", 90 + i);
}

// ---------------------------------------------------------------- sōko (the full-frame page, squeezed)
// sokoPage: canvas of the full-frame sōko page (2206 x 946 page units) or null (fallback drawn instead)
export function drawSokoLaptop(g, sokoPage, fallback) {
  g.fillStyle = "#030303"; g.fillRect(0, 0, PU_W, PU_H);
  g.save();
  g.translate(25, 6); g.scale(0.4306, 0.551);
  g.imageSmoothingQuality = "high";
  if (sokoPage) g.drawImage(sokoPage, 0, 0, 2206, 946);
  else if (fallback) fallback(g);
  g.restore();
}
