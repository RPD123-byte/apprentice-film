// ---------- plants ----------
// Heart-leaf pothos, one leaf at a time: [cx, cy, length, width, tip direction (rad), shade], placed from 3x grids
// of the source. Each leaf is a two-lobed heart with its notch at the stem end, a lighter and a darker half and a
// midrib. Shades sampled pre-grade.
const LEAF_INK = { L: ["#97ad46", "#82993b"], M: ["#7e9738", "#687f30"], D: ["#647b32", "#52672a"], K: ["#465a24", "#39491d"] };
function heartPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(-0.36, 0);
  ctx.bezierCurveTo(-0.44, -0.08, -0.62, -0.36, -0.36, -0.49);
  ctx.bezierCurveTo(-0.12, -0.58, 0.2, -0.34, 0.5, 0);
  ctx.bezierCurveTo(0.2, 0.34, -0.12, 0.58, -0.36, 0.49);
  ctx.bezierCurveTo(-0.62, 0.36, -0.44, 0.08, -0.36, 0);
  ctx.closePath();
}
function leaf(ctx, [x, y, L, W, a, shade = "L"]) {
  const [c1, c2] = LEAF_INK[shade] || LEAF_INK.L;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(a); ctx.scale(L, W);
  heartPath(ctx);
  ctx.fillStyle = c1; ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = c2; ctx.fillRect(-0.6, 0, 1.2, 0.7); ctx.restore();
  ctx.restore();
  // outline and midrib in page units
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.save(); ctx.scale(L, W); heartPath(ctx); ctx.restore();
  ctx.lineWidth = 2.1; ctx.strokeStyle = HC.line; ctx.lineJoin = "round"; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-0.34 * L, 0); ctx.quadraticCurveTo(0.05 * L, 0.02 * W, 0.34 * L, 0);
  ctx.lineWidth = 1.2; ctx.strokeStyle = "rgba(40,55,20,0.55)"; ctx.stroke();
  ctx.restore();
}
function stem(ctx, pts, w = 2.2, col = "#3e5222") { strokeSp(ctx, pts, w + 1.6, HC.line); strokeSp(ctx, pts, w, col); }

// the potted pothos on the left stack, its hanging vine and the second clump beside the speaker
const LEAVES_L = [
  // behind (dark, in the shade)
  [180, 302, 50, 26, 3.0, "D"], [152, 342, 44, 26, 2.7, "K"], [205, 275, 34, 32, 2.3, "D"], [336, 326, 42, 36, 1.0, "D"],
  [285, 355, 26, 22, 1.6, "D"], [266, 335, 26, 24, 1.8, "M"],
  // front clump
  [194, 330, 40, 40, 1.2, "M"], [268, 252, 32, 30, 2.2, "L"], [243, 270, 42, 43, 1.75, "L"], [312, 278, 40, 40, 1.4, "L"],
  [283, 298, 38, 38, 1.8, "L"], [235, 338, 48, 44, 1.6, "M"], [316, 346, 36, 34, 1.8, "L"], [305, 383, 42, 38, 1.6, "L"],
  [333, 395, 32, 28, 1.5, "L"],
  // the vine hanging past the sign
  [320, 431, 38, 34, 1.6, "L"], [335, 466, 34, 30, 1.6, "L"], [316, 494, 30, 28, 1.6, "L"], [354, 487, 20, 18, 0.4, "M"],
  [354, 523, 28, 30, 1.6, "L"],
  // the clump beside the speaker
  [400, 483, 40, 30, -2.5, "M"], [438, 505, 38, 28, 0.3, "D"], [402, 528, 38, 34, 1.7, "L"], [433, 548, 44, 40, 1.3, "L"],
  [492, 556, 40, 36, 1.2, "M"], [463, 575, 36, 34, 1.6, "L"], [428, 592, 42, 36, 1.7, "L"],
];
function plantL(ctx) {
  // pot
  fillSp(ctx, [[200, 350], [278, 347], [274, 372], [204, 374]], "#6c7f97", 2.4);
  strokeSp(ctx, [[204, 356], [276, 353]], 1.6, "#8ea3c0");
  // stems
  for (const s of [[[240, 352], [245, 310], [243, 280]], [[250, 350], [270, 300], [285, 300]], [[258, 350], [300, 320], [312, 290]],
    [[262, 352], [290, 370], [305, 385], [318, 430], [335, 466], [318, 495], [352, 520]], [[236, 352], [200, 330], [180, 305]],
    [[380, 600], [400, 560], [410, 520], [400, 485]], [[395, 600], [430, 560], [440, 510]], [[410, 600], [460, 575], [490, 556]]])
    stem(ctx, s, 2);
  for (const l of LEAVES_L) leaf(ctx, l);
}

// the pothos on the right stack (pot on the cream box) and its vine hanging down the yellow boxes
const LEAVES_R = [
  [2062, 420, 30, 26, 1.2, "K"], [2195, 404, 30, 24, -0.6, "D"], [2195, 450, 40, 30, 1.8, "D"],
  [2115, 377, 45, 30, -0.85, "M"], [2052, 405, 50, 45, -2.4, "M"], [2115, 410, 32, 28, 1.6, "L"], [2163, 410, 46, 46, 1.6, "L"],
  [2090, 440, 36, 36, 1.3, "L"], [2156, 457, 48, 46, 1.6, "L"],
  [2013, 462, 48, 42, 2.4, "M"], [2050, 500, 50, 46, 1.75, "L"], [2002, 520, 46, 38, 2.0, "M"], [2050, 548, 50, 48, 1.7, "M"],
  [2012, 575, 42, 38, 1.8, "M"], [2048, 608, 48, 42, 1.7, "M"],
];
const SPROUTS_R = [[2136, 693, 52, 34, -1.17, "L"], [2174, 725, 66, 34, -1.03, "L"], [2188, 769, 46, 28, -0.76, "L"], [2196, 830, 50, 30, -1.4, "M"]];
function plantR(ctx) {
  fillSp(ctx, [[2072, 448], [2152, 446], [2146, 488], [2078, 490]], "#403c9c", 2.4);
  for (const s of [[[2100, 450], [2060, 470], [2040, 520], [2045, 560], [2040, 610]], [[2090, 450], [2030, 470], [2005, 520], [2010, 570]],
    [[2110, 450], [2115, 400], [2120, 370]], [[2120, 450], [2160, 420]]]) stem(ctx, s, 2);
  for (const l of LEAVES_R) leaf(ctx, l);
  for (const l of SPROUTS_R) sproutLeaf(ctx, l);
}
