// the synth keyboard on a flight-case table, seen from the front-left; the knob module above it; cables.
// Measured at 2.5x (50 s).
function keyboardLeft(g) {
  // knob module: a dark side, a pale wooden front with a 3x7 grid of knobs, darker toward its lower right
  fillPoly(g, [[334, 474], [370, 470], [370, 560], [334, 560]], grey(0.04));
  ink(g, [[334, 474], [370, 470]], 1.3, grey(0.4), { seed: 701 });
  face(g, [[370, 470], [508, 476], [508, 560], [370, 560]], [0.5, 0.42, 0.22, 0.36], "h", { per: 3.4, seed: 702, brk: 0.2 });
  ink(g, [[370, 470], [508, 476], [508, 560], [370, 560]], 1.6, BLK, { closed: true, seed: 703 });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) {
    const x = 394 + c * 16.5, y = 490 + r * 25 + c * 0.3;
    dot(g, x + 0.5, y + 1.5, 6.4, grey(0.02)); ring(g, x, y, 5, 1.2, grey(0.4, 0.9)); soft(g, E(x - 1, y - 1.5, 3, 2.4, 0), grey(0.5)); dot(g, x - 1.8, y - 2.4, 1.3, grey(0.95));
  }
  // cables from the bottom row, hanging down in loops
  for (const [x, dx, dy] of [[411, 8, 0], [429, 14, 10], [446, 22, -4], [477, 30, 6], [493, 10, 20]]) cable(g, [[x, 546], [x + 2, 562], [x + dx * 0.5, 594 + dy], [x + dx, 640 + dy], [x + dx + 6, 700]], 2.2, x, 0.6);
  // the keyboard: dark top panel with a knob row, the key bed, a dark lip, the big left cheek
  fillPoly(g, [[172, 558], [428, 556], [430, 600], [426, 626], [236, 626], [190, 624], [174, 602]], grey(0.03));
  face(g, [[174, 558], [428, 556], [428, 572], [236, 574]], [0.1, 0.18, 0.15, 0.14], "h", { per: 3, seed: 704 });
  for (let i = 0; i < 16; i++) { const x = 188 + i * 15.2, y = 563 - i * 0.1; fillPoly(g, [[x - 3, y - 4], [x + 3, y - 4], [x + 3, y + 2], [x - 3, y + 2]], grey(0.08)); g.fillStyle = grey(0.8); g.beginPath(); g.ellipse(x, y - 4, 3, 1.3, 0, 0, PI * 2); g.fill(); }
  const K = [[238, 574], [424, 572], [424, 597], [240, 598]], at = (u, v) => bil(K, u, v), nw = 22;
  fillPoly(g, K, grey(0.03));
  for (let i = 0; i < nw; i++) {
    const u0 = (i + 0.08) / nw, u1 = (i + 0.92) / nw, lit = 0.62 + 0.3 * Math.sin(PI * clamp(i / nw * 1.1));
    soft(g, pth([at(u0, 0.05), at(u1, 0.05), at(u1, 1), at(u0, 1)], false), lg(g, 0, 574, 0, 598, [[0, grey(lit * 0.6)], [0.5, grey(lit)], [1, grey(lit * 0.95)]]));
  }
  for (let i = 0; i < nw - 1; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) {
    const u = (i + 1) / nw, w = 0.32 / nw;
    fillPoly(g, [at(u - w, 0), at(u + w, 0), at(u + w, 0.6), at(u - w, 0.6)], grey(0.02));
    ink(g, [at(u - w * 0.7, 0.58), at(u + w * 0.7, 0.58)], 1.1, grey(0.55, 0.8), { seed: 720 + i });
  }
  face(g, [[240, 598], [424, 597], [424, 626], [236, 626]], [0.16, 0.26, 0.34, 0.08], "h", { per: 3, seed: 730 });
  ink(g, [[240, 598], [424, 597]], 1.2, grey(0.75, 0.8), { seed: 731 });
  face(g, [[172, 558], [238, 574], [240, 626], [190, 624]], [0.22, 0.25, 0.1, 0.02], "v", { per: 3.4, seed: 732 });
  ink(g, [[172, 558], [238, 574]], 1.4, grey(0.7), { seed: 733 });
  ink(g, [[172, 558], [176, 602], [190, 624]], 1.2, grey(0.45), { seed: 734 });
  // the control box at the keyboard's right end
  fillPoly(g, [[424, 585], [492, 583], [494, 624], [426, 626]], grey(0.05));
  ink(g, [[424, 585], [492, 583]], 1.4, grey(0.6), { seed: 735 });
  for (let i = 0; i < 4; i++) { dot(g, 437 + i * 16.5, 582, 3, grey(0.04)); dot(g, 437 + i * 16.5, 580.5, 1.8, grey(0.8)); }
  // the flight-case table: a lit rail, metal corner brackets, a lit leg
  face(g, [[146, 626], [488, 622], [490, 644], [146, 648]], [0.45, 0.8, 0.5, 0.3], "h", { per: 3.2, seed: 740, brk: 0.3 });
  ink(g, [[146, 626], [488, 622]], 1.3, grey(0.8), { seed: 741 });
  ink(g, [[146, 648], [490, 644]], 1.5, BLK, { seed: 742 });
  face(g, [[312, 648], [338, 648], [340, 826], [314, 826]], [0.8, 0.62, 0.45, 0.62], "v", { per: 3, seed: 743, brk: 0.25 });
  ink(g, [[338, 648], [340, 826]], 1.4, BLK, { seed: 744 });
  for (const [pts, bx, by] of [[[[298, 624], [352, 622], [354, 648], [340, 664], [318, 666], [300, 650]], 333, 638], [[[470, 622], [492, 621], [492, 660], [474, 658]], 484, 632]]) {
    soft(g, pth(pts, false), lg(g, pts[0][0], 622, pts[1][0], 664, [[0, 0.9], [1, 0.55]])); ink(g, pts, 1.5, BLK, { closed: true, seed: bx });
    dot(g, bx, by, 4.5, grey(0.07)); ring(g, bx, by, 4.5, 1.2, grey(0.5)); dot(g, bx - 1, by - 1, 1.4, grey(0.85));
  }
  fillPoly(g, [[146, 628], [164, 628], [164, 648], [146, 648]], grey(0.65));
  // cable loops round the keyboard's left end and down over the cartons
  curve(g, [[153, 534], [172, 540], [180, 560]], 2.4, "rgba(215,215,210,0.8)", { seed: 750 });
  cable(g, [[172, 652], [196, 660], [206, 690], [204, 722], [198, 746]], 3.4, 751, 0.8);
}
function face(g, q, [a, b, c, d], dir = "v", o = {}) { stripes(g, q, { cov: bl(a, b, c, d), lum: 1, dir, ...o }); }
