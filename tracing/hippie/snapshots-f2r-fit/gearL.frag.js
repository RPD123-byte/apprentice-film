// ---------- gear, left side ----------
// Guitar case, drum machine, keyboard, flight case, speaker, books, devices, crates, the daisy and its sprouts.
// Placed from 2.4x grids of the source; inks sampled pre-grade.
const GR = { dark: "#262328", dark2: "#332c33", dark3: "#44393f", metal: "#d9bda5", cream: "#e8cdbb", creamD: "#bfa393",
  teal: "#456a6c", tealD: "#34504f", ring: "#e18544", ringD: "#b8672f", pink: "#d7547d", magenta: "#b0266f", crate: "#8a2764" };
function quadFill(ctx, P, col, lw = 2.6) { flatPath(ctx, P); ctx.fillStyle = col; ctx.fill(); if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = HC.line; ctx.lineJoin = "round"; ctx.stroke(); } }
function rr(ctx, x, y, w, h, r, col, lw = 2.6) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = col; ctx.fill(); if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = HC.line; ctx.stroke(); } }
function knob(ctx, x, y, r, col = GR.dark2, ring = GR.dark3) { circle(ctx, x, y, r, col, 1.8, HC.line); circle(ctx, x - r * 0.25, y - r * 0.3, r * 0.35, ring); }
function cable(ctx, pts, w = 4.5, col = "#211d22", hi = "rgba(120,110,120,0.5)") {
  strokeSp(ctx, pts, w + 2, HC.line); strokeSp(ctx, pts, w, col);
  ctx.save(); ctx.translate(-w * 0.18, -w * 0.18); strokeSp(ctx, pts, Math.max(0.8, w * 0.22), hi); ctx.restore();
}
// a stack of books seen from the spine side: [x0, x1, yTop, thickness, cover ink, page ink]
function books(ctx, list) {
  for (const [x0, x1, y, t, cov, pg, tilt = 0] of list) {
    quadFill(ctx, [x0, y + tilt, x1, y, x1, y + t, x0, y + t + tilt], cov, 2.2);
    quadFill(ctx, [x0 + 6, y + t * 0.3 + tilt, x1 - 4, y + t * 0.3, x1 - 4, y + t * 0.72, x0 + 6, y + t * 0.72 + tilt], pg, 0);
  }
}
function speaker(ctx, front, side, woof, tw, rOut = 35) {
  quadFill(ctx, side, GR.teal); quadFill(ctx, front, GR.dark);
  const [wx, wy] = woof;
  circle(ctx, wx, wy, rOut + 5, "#1b181b", 2, HC.line);
  circle(ctx, wx, wy, rOut, GR.ring, 2.2, HC.line);
  circle(ctx, wx, wy, rOut * 0.44, "#221f22", 2, HC.line);
  circle(ctx, wx - rOut * 0.12, wy - rOut * 0.14, rOut * 0.1, "#3a353a");
  circle(ctx, tw[0], tw[1], tw[2], "#1b181b", 2, HC.line); circle(ctx, tw[0], tw[1], tw[2] * 0.55, "#2c282c");
  circle(ctx, tw[0] - tw[2] * 0.2, tw[1] - tw[2] * 0.25, tw[2] * 0.18, "#8a848a");
}
function gearL(ctx) {
  // --- the salmon box low at the far left (mostly behind the daisy)
  quadFill(ctx, [-8, 727, 115, 727, 115, 812, -8, 812], "#cc5150", 2.6);
  // --- the guitar case leaning at the far left (rounded, piping, two latches)
  fillSp(ctx, [[0, 522], [14, 511], [60, 508], [88, 516], [100, 534], [100, 640], [97, 726], [0, 728]], GR.dark, 2.8);
  strokeSp(ctx, [[54, 512], [36, 526], [29, 545], [28, 620], [31, 718]], 2.6, "#cdb9ac");
  rr(ctx, 66, 575, 24, 26, 3, GR.metal, 2); rr(ctx, 72, 580, 12, 16, 2, GR.dark3, 0);
  rr(ctx, 56, 662, 24, 26, 3, GR.metal, 2); rr(ctx, 62, 667, 12, 16, 2, GR.dark3, 0);
  rr(ctx, 83, 620, 4, 14, 1, "#bfb0a8", 0);
  // --- papers on the gold box
  quadFill(ctx, [176, 528, 247, 524, 294, 540, 226, 548], "#e2d8d6", 2.2);
  // --- the blue device (a small mixer-amp) on the drum machine
  quadFill(ctx, [288, 546, 368, 541, 372, 600, 291, 605], "#8aa0c4", 2.6);
  quadFill(ctx, [368, 541, 394, 546, 396, 598, 372, 600], "#6f86ad", 2.4);
  rr(ctx, 331, 553, 30, 16, 2, GR.dark2, 1.8); rr(ctx, 335, 572, 22, 8, 1, GR.dark2, 1.4);
  rr(ctx, 375, 556, 12, 30, 2, GR.dark2, 1.6);
  // --- the drum machine: dark box, 3 x 6 pads
  quadFill(ctx, [252, 597, 407, 604, 410, 677, 254, 672], GR.dark, 2.8);
  quadFill(ctx, [407, 604, 418, 610, 420, 674, 410, 677], GR.dark2, 2);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) knob(ctx, 293 + c * 20 + r * 0.5, 614 + r * 20, 7);
  // --- the keyboard synth: black body with the knob row on top, a lighter panel stripe, white keys
  fillSp(ctx, [[102, 668], [120, 662], [230, 666], [330, 678], [392, 690], [396, 712], [330, 724], [110, 724], [100, 700]], GR.dark, 2.8);
  for (let k = 0; k < 9; k++) circle(ctx, 134 + k * 12.5, 662 + k * 0.2, 5.4, GR.dark2, 1.6, HC.line);
  quadFill(ctx, [120, 672, 173, 676, 173, 683, 120, 680], "#4a4549", 0);
  quadFill(ctx, [173, 694, 327, 699, 327, 712, 173, 708], "#e4dcd6", 2);
  ctx.strokeStyle = "#2a252a"; ctx.lineWidth = 1.2;
  for (let k = 0; k < 25; k++) { const x = 176 + k * 6.1; ctx.beginPath(); ctx.moveTo(x, 695 + k * 0.2); ctx.lineTo(x, 708 + k * 0.16); ctx.stroke(); }
  for (let k = 0; k < 25; k++) if (k % 7 !== 2 && k % 7 !== 6) rr(ctx, 178 + k * 6.1, 695 + k * 0.2, 3.2, 7, 0.6, "#1f1b20", 0);
  // --- the flight case under the keyboard: salmon-cream top trim, black body, cream corner brackets and strap
  quadFill(ctx, [110, 740, 410, 740, 410, 900, 110, 900], GR.dark, 2.8);
  quadFill(ctx, [110, 729, 410, 731, 410, 741, 110, 741], "#d7a494", 2.2);
  quadFill(ctx, [222, 741, 245, 741, 245, 880, 222, 880], "#e1d3c6", 2);
  for (const [x0, x1] of [[210, 257], [373, 395]]) quadFill(ctx, [x0, 730, x1, 730, x1 - 4, 760, x0 + 4, 760], "#e1d3c6", 2);
  circle(ctx, 236, 742, 4, "#9a8478", 1.2, HC.line);
  // --- the speaker (books and a tape deck on it), the tall cream gadget beside it
  speaker(ctx, [425, 645, 545, 645, 545, 870, 425, 870], [545, 645, 610, 657, 610, 870, 545, 870], [490, 750], [490, 686, 15], 35);
  books(ctx, [[443, 572, 628, 14, "#6b3f3a", "#e4c4b4", 3], [438, 575, 614, 14, "#3d3136", "#dabcaa", 2], [450, 568, 601, 13, "#8d4a4d", "#e6cfbd", 2],
    [452, 566, 589, 12, "#3a3036", "#e2c6b0", 1]]);
  quadFill(ctx, [500, 560, 598, 558, 600, 584, 502, 586], GR.dark, 2.4);
  rr(ctx, 592, 604, 34, 88, 6, "#e3cfa8", 2.4); rr(ctx, 600, 618, 18, 20, 3, GR.dark2, 1.6); knob(ctx, 609, 656, 5.5); knob(ctx, 609, 673, 4);
  // --- in front of the speaker: the gold box, the cream device (a slot and an eye), the pink box under it
  quadFill(ctx, [275, 797, 332, 797, 332, 907, 275, 907], "#e6b26b", 2.6);
  quadFill(ctx, [275, 797, 332, 797, 332, 812, 275, 812], "#efc88a", 2);
  quadFill(ctx, [330, 812, 495, 816, 495, 832, 330, 830], "#615658", 2.2);
  quadFill(ctx, [330, 830, 495, 832, 495, 870, 330, 870], "#e6cbbb", 2.6);
  fillSp(ctx, [[378, 853], [384, 844], [392, 853], [385, 856]], "#3a3036"); circle(ctx, 351, 842, 3, GR.dark2); circle(ctx, 420, 862, 2.4, GR.dark2);
  quadFill(ctx, [330, 870, 495, 870, 495, 942, 330, 942], "#d14e7a", 2.6);
  // --- the lower book stack, the tape deck, the magenta crate, the small orange box
  books(ctx, [[555, 692, 860, 16, "#caa9a0", "#efdccb"], [558, 688, 845, 16, "#3c3037", "#e8d0bf"], [560, 690, 830, 15, "#7a5f5f", "#efd9c9"],
    [555, 684, 815, 15, "#b2968e", "#f0dccb"], [565, 690, 800, 15, "#3c3037", "#eed7c3"]]);
  quadFill(ctx, [588, 781, 672, 781, 672, 800, 588, 800], "#d5b58d", 2.4); rr(ctx, 600, 785, 30, 11, 2, GR.dark3, 1.4);
  quadFill(ctx, [545, 876, 695, 876, 695, 942, 545, 942], GR.crate, 2.8);
  ctx.save(); flatPath(ctx, [545, 876, 695, 876, 695, 942, 545, 942]); ctx.clip();
  ctx.strokeStyle = "#1a0712"; ctx.lineWidth = 5;
  for (let x = 540; x < 710; x += 26) { ctx.beginPath(); ctx.moveTo(x, 903); ctx.lineTo(x + 26, 944); ctx.moveTo(x + 26, 903); ctx.lineTo(x, 944); ctx.stroke(); }
  quadFill(ctx, [545, 876, 695, 876, 695, 898, 545, 898], "#a0337a", 2);
  ctx.restore();
  quadFill(ctx, [497, 906, 545, 906, 545, 946, 497, 946], "#d05344", 2.4);
}

// the daisy with a smile and the sprouts round it
const SPROUTS = [
  [177, 779, 96, 30, -1.45, "L"], [150, 842, 58, 26, 2.8, "L"], [208, 852, 50, 24, -0.3, "L"], [260, 825, 70, 26, -0.45, "L"],
  [135, 887, 60, 26, 3.3, "M"], [60, 915, 70, 24, 3.4, "L"], [18, 868, 60, 22, 1.9, "M"], [115, 925, 60, 20, 0.2, "L"],
];
function sproutLeaf(ctx, [x, y, L, W, a, shade = "L"]) {
  const [c1, c2] = LEAF_INK[shade] || LEAF_INK.L;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.beginPath(); ctx.moveTo(-L / 2, 0); ctx.bezierCurveTo(-L * 0.2, -W * 0.75, L * 0.25, -W * 0.55, L / 2, 0);
  ctx.bezierCurveTo(L * 0.25, W * 0.55, -L * 0.2, W * 0.75, -L / 2, 0); ctx.closePath();
  ctx.fillStyle = c1; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = HC.line; ctx.stroke();
  ctx.save(); ctx.clip(); ctx.fillStyle = c2; ctx.fillRect(-L / 2, 0, L, W); ctx.restore();
  ctx.beginPath(); ctx.moveTo(-L / 2, 0); ctx.quadraticCurveTo(0, W * 0.05, L * 0.4, 0); ctx.lineWidth = 1.3; ctx.strokeStyle = "rgba(40,55,20,0.6)"; ctx.stroke();
  ctx.restore();
}
function daisy(ctx) {
  // stems
  stem(ctx, [[60, 840], [40, 880], [20, 930]], 3.2, "#6f8d35");
  stem(ctx, [[190, 830], [192, 870], [195, 905]], 3, "#6f8d35");
  for (const l of SPROUTS) sproutLeaf(ctx, l);
  // the pedal in front of the sprouts
  quadFill(ctx, [167, 878, 267, 876, 267, 904, 167, 906], "#e3c6b3", 2.4);
  for (const x of [190, 206, 222]) rr(ctx, x - 5, 862, 10, 16, 3, GR.dark, 1.6);
  for (const x of [186, 200, 245, 258]) circle(ctx, x, 892, 2.2, GR.dark2);
  // the daisy
  const cx = 77, cy = 802;
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * TAU) / 10 + 0.12;
    ctx.save(); ctx.translate(cx + Math.cos(a) * 46, cy + Math.sin(a) * 43); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(0, 0, 25, 15, 0, 0, TAU); ctx.fillStyle = "#eee0d5"; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = HC.line; ctx.stroke();
    ctx.restore();
  }
  circle(ctx, cx, cy, 28, "#d99b4f", 2.6, HC.line);
  ctx.fillStyle = "#3a2218";
  ctx.beginPath(); ctx.ellipse(cx - 7, cy - 5, 2.6, 4, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(cx + 8, cy - 5, 2.6, 4, 0, 0, TAU); ctx.fill();
  strokeSp(ctx, [[cx - 14, cy + 5], [cx, cy + 13], [cx + 15, cy + 5]], 2.2, "#3a2218");
}

// the hanging sign: nail, two wires, cream board with a dark rim and four screws, golden lettering
function sign(ctx) {
  strokeSp(ctx, [[366, 350], [438.5, 274]], 2.2, "#cdbdb3"); strokeSp(ctx, [[438.5, 274], [500, 324]], 2.2, "#cdbdb3");
  circle(ctx, 438.5, 274, 4.2, "#3a3034", 1.5);
  quadFill(ctx, [353, 354, 530, 324, 543, 408, 367.5, 439], "#2a2226", 0);
  quadFill(ctx, [357, 357, 527, 328, 539, 405, 370, 435], "#ebd5c4", 1.2);
  for (const [x, y] of [[362.5, 361], [520.5, 333], [534, 401], [375, 431]]) circle(ctx, x, y, 3.2, "#3a3034", 1.2);
  ctx.save(); ctx.fillStyle = "#d4ac5a"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "600 27px Archivo"; ctx.fontStretch = "condensed";
  const fit = (txt, x, y, w, a) => { ctx.save(); ctx.translate(x, y); ctx.rotate(a); const m = ctx.measureText(txt).width; ctx.scale(w / m, 1); ctx.fillText(txt, 0, 0); ctx.restore(); };
  fit("MIXING.", 448, 364, 92, -0.19); fit("DO NOT KNOCK.", 452.5, 405, 160, -0.186);
  ctx.fontStretch = "normal"; ctx.restore();
}
