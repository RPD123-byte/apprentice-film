// ---------- the rainbows low in the scene, and the floor ----------
// Band boundaries measured on vertical scans every ~25 px (y at each station x), drawn as smooth curves.
function vbands(ctx, xs, B, cls, ink = RIB_INK, lw = 2.2) {
  const curve = (ys) => sampleCurve(xs.map((x, i) => [x, ys[i]]), 8);
  const C = B.map(curve);
  for (let k = 0; k < cls.length; k++) { ctx.beginPath(); poly(ctx, [...C[k], ...C[k + 1].slice().reverse()]); ctx.fillStyle = ink[cls[k]]; ctx.fill(); }
  ctx.strokeStyle = HC.line; ctx.lineCap = "round"; ctx.lineJoin = "round";
  C.forEach((pts, k) => { ctx.lineWidth = k === 0 || k === C.length - 1 ? lw + 0.6 : lw; ctx.beginPath(); poly(ctx, pts, false); ctx.stroke(); });
}
// behind the left speaker and his raised arm: V O Y C O V O, level from x 640 to 720, then curving down to the right
// (boundaries read on vertical scans every 20 px)
const RB_C = {
  xs: [612, 640, 660, 680, 700, 720, 740, 760, 780, 800, 830],
  B: [[622, 626, 617, 615, 614, 617, 624, 630, 645, 688, 712], [640, 644, 645, 643, 643, 646, 654, 666, 686, 735, 752],
    [666, 668, 670, 669, 669, 673, 683, 698, 715, 750, 768], [688, 690, 691, 691, 691, 696, 709, 727, 740, 765, 782],
    [710, 712, 712, 712, 713, 718, 725, 739, 752, 775, 792], [723, 725, 725, 724, 727, 731, 740, 750, 760, 785, 800],
    [748, 750, 750, 749, 753, 758, 765, 770, 778, 790, 810], [764, 765, 765, 764, 771, 775, 785, 790, 795, 800, 820]],
  cls: "VOYCOVO",
};
// behind the desk lamp (the right ribbon coming down behind the gear)
const RB_E = {
  xs: [1270, 1290, 1320, 1340, 1360, 1385, 1410],
  B: [[586, 577, 565, 557, 543, 522, 505], [606, 598, 594, 584, 557, 533, 514], [628, 622, 621, 611, 578, 560, 545], [650, 646, 642, 642, 608, 594, 580]],
  cls: "VOY",
};
// under the lamp table (behind its braces): orange, magenta, orange, gold
const RB_F = {
  xs: [1325, 1360, 1400, 1440, 1475],
  B: [[670, 670, 670, 670, 670], [700, 692, 686, 684, 690], [712, 710, 696, 690, 697], [745, 730, 722, 712, 705], [800, 780, 770, 766, 712]],
  cls: "OPOY",
};
function lowRainbows(ctx) {
  vbands(ctx, RB_C.xs, RB_C.B, RB_C.cls);
  vbands(ctx, RB_E.xs, RB_E.B, RB_E.cls);
  vbands(ctx, RB_F.xs, RB_F.B, RB_F.cls, { ...RIB_INK, O: "#d9604e", P: "#c13e86", Y: "#e3b25a" });
  ribbonN(ctx, RIB_STRIPS.nL3);
}
// the mug on the desk and its steam (the wavy cream wisp in the ribbon's gold, the faint wisps just above the rim)
function mug(ctx) {
  const wisp = (pts, w0, w1, col, alpha = 1) => {
    const P = sampleCurve(pts, 10), n = P.length, L = [], R = [];
    for (let i = 0; i < n; i++) {
      const p = P[Math.max(0, i - 1)], q = P[Math.min(n - 1, i + 1)];
      let dx = q[0] - p[0], dy = q[1] - p[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const hw = (w0 + (w1 - w0) * i / (n - 1)) / 2;
      L.push([P[i][0] - dy * hw, P[i][1] + dx * hw]); R.push([P[i][0] + dy * hw, P[i][1] - dx * hw]);
    }
    ctx.save(); ctx.globalAlpha = alpha; ctx.beginPath(); poly(ctx, [...L, ...R.reverse()]); ctx.fillStyle = col; ctx.fill(); ctx.restore();
  };
  wisp([[808, 700], [822, 676], [806, 652], [822, 628], [806, 604], [820, 580], [808, 556]], 16, 8, "#f1e2b8");
  wisp([[782, 768], [772, 744], [786, 722], [776, 700]], 16, 10, "#f0dcc4", 0.8);
  wisp([[806, 768], [812, 746], [802, 726]], 12, 8, "#f0dcc4", 0.6);
  // handle, body, rim
  ctx.save();
  ctx.beginPath(); ctx.ellipse(752, 802, 16, 22, 0, 0, TAU); ctx.lineWidth = 9; ctx.strokeStyle = HC.line; ctx.stroke();
  ctx.lineWidth = 5; ctx.strokeStyle = "#ece2d8"; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(757, 768); ctx.lineTo(757, 824); ctx.quadraticCurveTo(758, 833, 766, 833); ctx.lineTo(818, 833);
  ctx.quadraticCurveTo(826, 833, 826, 824); ctx.lineTo(826, 768); ctx.closePath();
  ctx.fillStyle = "#efe6dc"; ctx.fill(); ctx.lineWidth = 2.8; ctx.strokeStyle = HC.line; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(791.5, 768, 34.5, 5, 0, 0, TAU); ctx.fillStyle = "#d9cfc6"; ctx.fill(); ctx.stroke();
  ctx.fillStyle = "rgba(160,140,130,0.35)"; ctx.fillRect(810, 774, 13, 56);
  ctx.restore();
}
function floor(ctx) {
  const P = (pts, col) => quadFill(ctx, pts, col, 2.2);
  P([0, 903, 272, 900, 262, 946, 0, 946], "#8a58ab");
  P([262, 880, 562, 878, 562, 946, 262, 946], "#bf3f82");
  P([1320, 905, 1382, 905, 1442, 946, 1330, 946], "#d64a96");
  P([1382, 905, 1462, 905, 1522, 946, 1442, 946], "#ecc79f");
  P([1462, 905, 1602, 905, 1602, 946, 1522, 946], "#d5a787");
  // the floor on the right: an orange-red to cream gradient, a purple band running in from the right
  const fg = ctx.createLinearGradient(1600, 0, 2214, 0);
  for (const [u, c] of [[0, "#d64f60"], [0.3, "#dc5a5f"], [0.5, "#e27a63"], [0.75, "#e6cfa3"], [1, "#f5d6ae"]]) fg.addColorStop(u, c);
  flatPath(ctx, [1600, 900, 2214, 880, 2214, 946, 1600, 946]); ctx.fillStyle = fg; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = HC.line; ctx.stroke();
  P([2060, 890, 2214, 868, 2214, 905, 2120, 904], "#614aa5");
}
