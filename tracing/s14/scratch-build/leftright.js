// ================================================================= LEFT WALL: speaker, shelving, boxes, keyboard
function paintLeft(L) {
  const o = L.o, r = rng(21);
  // --- top-left: dark carton and a vented box above the speaker
  L.fill(quad([[0, 0], [100, 0], [96, 176], [0, 186]]), 0.1, PI / 2, { spacing: 0.35, style: 1 });
  const vent = [[70, 96], [262, 124], [262, 290], [70, 250]];
  L.fill(quad(vent), 0.2, 0.14, { spacing: 0.25 });
  for (let i = 0; i < 18; i++) { const t = (i + 0.5) / 18; L.line([quadAt(vent, 0.04, t), quadAt(vent, 0.97, t)], 1.8, "rgba(0,0,0,0.75)", 300 + i); }
  for (let i = 0; i < 9; i++) { const t = (i + 0.2) / 9; L.line([quadAt(vent, 0.06, t), quadAt(vent, 0.9, t)], 1.1, "rgba(242,240,234,0.3)", 320 + i); }
  edges(L, vent, 2, "rgba(0,0,0,0.9)", 310);
  L.fill(quad([[70, 20], [258, 30], [262, 124], [70, 96]]), 0.14, 0.1, { spacing: 0.3, style: 1 });
  // lit carton standing on end above the speaker, with a stencilled frame and a squiggle
  const lb = [[262, 22], [428, 40], [428, 290], [262, 290]];
  carton(L, lb, 0.58, 330, { tape: false, lit: 0.2 });
  edges(L, [[300, 118], [392, 126], [392, 238], [300, 232]], 1.6, "rgba(0,0,0,0.7)", 340);
  edges(L, [[312, 132], [380, 138], [380, 226], [312, 220]], 1.1, "rgba(0,0,0,0.45)", 342);
  curve(o, [[322, 196], [336, 180], [352, 204], [372, 186]], 1.6, "rgba(0,0,0,0.65)", 341);
  L.fill(quad([[262, 22], [428, 40], [428, 70], [262, 52]]), 0.66, 0.1, { spacing: 0.25 });

  // --- the speaker cabinet (front face turned toward the corridor)
  const cab = [[70, 180], [438, 310], [432, 606], [38, 604]];
  L.fill(quad(cab), lin(38, 300, 438, 400, [[0, 0.36], [0.6, 0.34], [1, 0.3]]), PI / 2 + 0.05, { spacing: 0.26 });
  grain(o, cab, 36, { dir: "v", w: 1.6, color: "rgba(0,0,0,0.55)", seed: 400, len: [0.4, 1], wav: 0.01 });
  grain(o, cab, 18, { dir: "v", w: 1.2, color: "rgba(242,240,234,0.25)", seed: 401, len: [0.3, 0.8], wav: 0.01 });
  L.line([[80, 196], [432, 322]], 2.4, "rgba(242,240,234,0.75)", 402);
  L.line([[80, 196], [52, 596]], 2, "rgba(242,240,234,0.55)", 403);
  L.line([[432, 322], [426, 598]], 1.8, "rgba(242,240,234,0.45)", 404);
  edges(L, cab, 2.6, "rgba(0,0,0,0.95)", 405);
  L.fill(quad([[438, 310], [446, 308], [446, 610], [432, 606]]), 0.08, PI / 2, { spacing: 0.3 });
  // the driver: flange, surround, cone, dust cap
  const cx = 236, cy = 444;
  L.fill(ell(cx, cy, 160, 158), rad(cx - 30, cy - 40, 60, 200, [[0, 0.72], [0.5, 0.6], [1, 0.42]]), 0.4, { spacing: 0.22, style: 2 });
  for (const [dx, dy] of [[-96, -112], [108, -100], [118, 104], [-104, 118]]) {
    o.fillStyle = "rgba(10,10,10,0.9)"; o.beginPath(); o.arc(cx + dx, cy + dy, 6, 0, 7); o.fill();
    o.fillStyle = "rgba(242,240,234,0.7)"; o.beginPath(); o.arc(cx + dx - 1.5, cy + dy - 1.5, 2, 0, 7); o.fill();
  }
  // surround: a thick dark rubber ring with a sheen on its lower right
  L.fill(ell(cx - 2, cy + 2, 140, 139), rad(cx + 40, cy + 50, 60, 190, [[0, 0.3], [0.5, 0.14], [1, 0.05]]), 0.9, { spacing: 0.2, style: 2 });
  o.strokeStyle = "rgba(242,240,234,0.45)"; o.lineWidth = 5; o.beginPath(); o.ellipse(cx - 2, cy + 2, 127, 126, 0, 0.1, 1.5); o.stroke();
  // cone: radial brush streaks, lit lower right, darker upper left
  const cc = [cx - 6, cy + 4];
  L.fill(ell(cc[0], cc[1], 114, 114), rad(cc[0] + 44, cc[1] + 54, 10, 170, [[0, 0.78], [0.45, 0.55], [1, 0.12]]), 0.6, { spacing: 0.24, style: 2 });
  o.save(); o.beginPath(); o.ellipse(cc[0], cc[1], 112, 112, 0, 0, 7); o.clip();
  for (let i = 0; i < 110; i++) {
    const a = (i / 110) * 2 * PI + r() * 0.04, k = 0.5 + 0.5 * Math.cos(a - 0.9);
    const r0 = 44 + r() * 14, r1 = 96 + r() * 16;
    stroke(o, [[cc[0] + Math.cos(a) * r0, cc[1] + Math.sin(a) * r0], [cc[0] + Math.cos(a) * r1, cc[1] + Math.sin(a) * r1]], 2 + r() * 3, k > 0.45 ? `rgba(242,240,234,${0.15 + 0.45 * k * r()})` : `rgba(0,0,0,${0.3 + 0.4 * r()})`, 500 + i);
  }
  o.restore();
  o.strokeStyle = "rgba(0,0,0,0.9)"; o.lineWidth = 3; o.beginPath(); o.ellipse(cc[0], cc[1], 114, 114, 0, 0, 7); o.stroke();
  o.strokeStyle = "rgba(0,0,0,0.9)"; o.lineWidth = 2.6; o.beginPath(); o.ellipse(cx, cy, 159, 157, 0, 0, 7); o.stroke();
  // dust cap: dark dome with a hard highlight
  const dc = [cx - 20, cy - 4];
  L.fill(ell(dc[0], dc[1], 44, 43), rad(dc[0] + 12, dc[1] + 14, 2, 50, [[0, 0.22], [0.7, 0.07], [1, 0.02]]), 0.6, { spacing: 0.2, style: 2 });
  o.fillStyle = "rgba(242,240,234,0.95)"; o.beginPath(); o.ellipse(dc[0] + 6, dc[1] - 18, 11, 7, -0.5, 0, 7); o.fill();
  o.strokeStyle = "rgba(0,0,0,0.9)"; o.lineWidth = 2.4; o.beginPath(); o.ellipse(dc[0], dc[1], 44, 43, 0, 0, 7); o.stroke();

  // --- carton under the speaker: the top of it lit, the face falling into black
  const bx = [[26, 640], [478, 624], [482, 950], [20, 950]];
  L.fill(quad(bx), lin(0, 624, 0, 946, [[0, 0.5], [0.3, 0.36], [0.6, 0.12], [1, 0.0]]), PI / 2 - 0.03, { spacing: 0.3 });
  grain(o, bx, 26, { dir: "v", w: 1.6, color: "rgba(0,0,0,0.45)", seed: 600, len: [0.3, 0.8], wav: 0.008 });
  L.line([[250, 660], [252, 760]], 1.6, "rgba(0,0,0,0.5)", 602);
  L.fill(quad([[30, 604], [440, 608], [478, 624], [26, 640]]), 0.56, 0.02, { spacing: 0.3 });
  L.line([[26, 640], [478, 624]], 2.2, "rgba(0,0,0,0.85)", 601);
  edges(L, bx, 2.2, "rgba(0,0,0,0.9)", 603);

  // --- shelving unit: the wide side board, dark back, then CRT, decks, cable nest
  const post = [[446, 0], [526, 0], [526, 660], [446, 664]];
  L.fill(quad(post), lin(446, 0, 526, 0, [[0, 0.22], [0.6, 0.36], [1, 0.3]]), PI / 2, { spacing: 0.26 });
  grain(o, post, 12, { dir: "v", w: 1.5, color: "rgba(0,0,0,0.5)", seed: 610 });
  grain(o, post, 6, { dir: "v", w: 1.2, color: "rgba(242,240,234,0.3)", seed: 612, len: [0.2, 0.6] });
  edges(L, post, 2, "rgba(0,0,0,0.9)", 611);
  L.fill(quad([[500, 0], [700, 0], [706, 810], [500, 810]]), 0.035, PI / 2, { spacing: 0.35 });
  // CRT monitor facing us: pale bezel, black screen, slotted chin
  const bez = [[532, 4], [706, 10], [704, 290], [534, 264]];
  L.fill(quad(bez), lin(532, 0, 706, 290, [[0, 0.74], [0.6, 0.7], [1, 0.56]]), 0.02, { spacing: 0.24 });
  const scr = [[554, 24], [688, 32], [686, 242], [556, 224]];
  L.fill(quad(scr), lin(554, 24, 686, 242, [[0, 0.03], [0.5, 0.06], [1, 0.02]]), 1.2, { spacing: 0.3 });
  L.line([[560, 30], [600, 34]], 1.2, "rgba(242,240,234,0.3)", 619);
  edges(L, scr, 2.4, "rgba(0,0,0,0.95)", 620);
  edges(L, bez, 2.2, "rgba(0,0,0,0.9)", 621);
  for (let i = 0; i < 6; i++) L.line([[570 + i * 12, 250 + i * 1.6], [574 + i * 12, 266 + i * 1.6]], 2, "rgba(0,0,0,0.7)", 622 + i);
  // tape deck under it
  const deck = [[518, 262], [684, 280], [684, 392], [518, 386]];
  L.fill(quad(deck), lin(518, 262, 684, 392, [[0, 0.66], [1, 0.5]]), 0.05, { spacing: 0.24 });
  edges(L, deck, 2, "rgba(0,0,0,0.9)", 630);
  for (const [u0, u1] of [[0.1, 0.44], [0.54, 0.88]]) {
    const w0 = [quadAt(deck, u0, 0.4), quadAt(deck, u1, 0.4), quadAt(deck, u1, 0.74), quadAt(deck, u0, 0.74)];
    L.fill(quad(w0), 0.14, 0, { spacing: 0.3 });
    edges(L, w0, 1.6, "rgba(0,0,0,0.9)", 631);
    L.line([quadAt(deck, u0 + 0.06, 0.57), quadAt(deck, u1 - 0.06, 0.57)], 2.6, "rgba(242,240,234,0.4)", 632);
  }
  for (let i = 0; i < 9; i++) { const p = quadAt(deck, 0.08 + i * 0.1, 0.18); o.fillStyle = "rgba(0,0,0,0.75)"; o.fillRect(p[0] - 5, p[1] - 4, 9, 8); }
  L.line([quadAt(deck, 0, 0.88), quadAt(deck, 1, 0.88)], 1.2, "rgba(0,0,0,0.6)", 633);
  board(L, [[503, 386], [690, 392], [690, 408], [503, 404]], 0.6, 640, { n: 6 });
  // cavity with a nest of cables and a small box
  L.fill(quad([[503, 408], [690, 408], [690, 606], [503, 606]]), 0.05, 0, { spacing: 0.35 });
  const dev = [[580, 490], [660, 494], [660, 590], [580, 586]];
  L.fill(quad(dev), 0.56, PI / 2, { spacing: 0.26 });
  edges(L, dev, 1.8, "rgba(0,0,0,0.9)", 650);
  o.strokeStyle = "rgba(0,0,0,0.8)"; o.lineWidth = 2.4; for (const [x, y] of [[604, 520], [632, 540], [606, 556]]) { o.beginPath(); o.arc(x, y, 9, 0, 7); o.stroke(); }
  for (let i = 0; i < 14; i++) {
    const x = 540 + r() * 100, y = 440 + r() * 90, rx = 22 + r() * 34, ry = 10 + r() * 16;
    const pts = []; for (let k = 0; k <= 14; k++) { const a = (k / 14) * 2 * PI + i; pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry + k * 0.8]); }
    curve(o, pts, 3.2, "rgba(0,0,0,0.85)", 680 + i);
    curve(o, pts, 1.6, `rgba(242,240,234,${0.55 + r() * 0.35})`, 660 + i);
  }
  curve(o, [[560, 560], [548, 600], [540, 660], [530, 700]], 3, "rgba(242,240,234,0.4)", 670);
  board(L, [[476, 606], [744, 604], [744, 652], [476, 656]], 0.62, 680, { n: 10 });
  // lower cavity with a second deck
  L.fill(quad([[486, 656], [706, 652], [706, 820], [486, 820]]), 0.03, 0, { spacing: 0.35 });
  const deck2 = [[482, 668], [670, 664], [668, 800], [482, 804]];
  L.fill(quad(deck2), lin(0, 664, 0, 804, [[0, 0.6], [1, 0.34]]), 0, { spacing: 0.24 });
  edges(L, deck2, 2, "rgba(0,0,0,0.9)", 690);
  L.line([quadAt(deck2, 0.02, 0.28), quadAt(deck2, 0.98, 0.28)], 1.6, "rgba(0,0,0,0.7)", 691);
  L.line([quadAt(deck2, 0.02, 0.62), quadAt(deck2, 0.98, 0.62)], 1.6, "rgba(0,0,0,0.6)", 697);
  for (let i = 0; i < 4; i++) { const p = quadAt(deck2, 0.55 + i * 0.1, 0.45); edges(L, [[p[0] - 8, p[1] - 6], [p[0] + 8, p[1] - 6], [p[0] + 8, p[1] + 6], [p[0] - 8, p[1] + 6]], 1.4, "rgba(0,0,0,0.8)", 692 + i); }
  L.fill(quad([[500, 700], [610, 696], [610, 718], [500, 722]]), 0.12, 0, { spacing: 0.3 });

  // --- carton stack by the keyboard: dark side faces, then three pale carton fronts
  const side = [[684, 44], [726, 48], [726, 700], [690, 700]];
  L.fill(quad(side), lin(684, 0, 726, 0, [[0, 0.14], [1, 0.26]]), PI / 2, { spacing: 0.3 });
  grain(o, side, 10, { dir: "v", w: 1.8, color: "rgba(0,0,0,0.6)", seed: 700, len: [0.2, 0.7] });
  edges(L, side, 2, "rgba(0,0,0,0.9)", 702);
  carton(L, [[726, 50], [856, 60], [858, 196], [726, 194]], 0.72, 710, { label: true, lit: 0.1 });
  carton(L, [[726, 194], [880, 202], [882, 384], [726, 382]], 0.76, 720, { label: true, lit: 0.1 });
  carton(L, [[726, 382], [884, 386], [886, 612], [726, 610]], 0.66, 730, { label: true });
  carton(L, [[716, 612], [860, 616], [860, 706], [716, 706]], 0.42, 740, { tape: false });
  L.fill(quad([[856, 60], [880, 76], [880, 202], [858, 196]]), 0.36, PI / 2, { spacing: 0.3 });

  // --- more cartons and a bookshelf further down the wall
  carton(L, [[882, 122], [994, 126], [1000, 202], [882, 204]], 0.46, 750, { tape: true });
  carton(L, [[884, 204], [1004, 204], [1008, 300], [884, 300]], 0.42, 755, { tape: true });
  carton(L, [[884, 300], [960, 300], [960, 440], [884, 440]], 0.34, 760, { tape: true, label: true });
  const bs = [[960, 262], [1030, 262], [1030, 548], [962, 548]];
  L.fill(quad(bs), 0.12, PI / 2, { spacing: 0.3 });
  for (let i = 0; i < 10; i++) { const x = 966 + i * 6.5; L.line([[x, 300 + r() * 20], [x + 1, 400]], 3, `rgba(242,240,234,${0.12 + r() * 0.2})`, 770 + i); }
  for (let i = 0; i < 9; i++) { const x = 968 + i * 7; L.line([[x, 420 + r() * 20], [x + 1, 530]], 3, `rgba(242,240,234,${0.1 + r() * 0.18})`, 790 + i); }
  board(L, [[962, 404], [1030, 404], [1030, 414], [962, 414]], 0.3, 800, { n: 2 });
  edges(L, bs, 2, "rgba(0,0,0,0.9)", 801);
  // tools and bottles on the shelf behind the keyboard
  L.fill(quad([[800, 330], [890, 330], [890, 440], [800, 440]]), 0.06, PI / 2, { spacing: 0.35 });
  for (const [x, y, w, h] of [[810, 350, 18, 70], [836, 340, 14, 80], [856, 364, 24, 56], [876, 346, 12, 76]]) {
    L.fill((c) => c.roundRect(x, y, w, h, 5), 0.3 + r() * 0.2, PI / 2, { spacing: 0.26 });
    L.line([[x + 3, y + 6], [x + 3, y + h - 6]], 1.4, "rgba(242,240,234,0.5)", 810 + x);
  }
  // cartons behind the keyboard (cross-hatched, in shadow)
  const kb1 = [[884, 436], [1000, 440], [1004, 590], [884, 588]];
  L.fill(quad(kb1), 0.34, 0.6, { spacing: 0.26, style: 1 });
  edges(L, kb1, 2, "rgba(0,0,0,0.9)", 820);
  L.line([[976, 440], [980, 520]], 1.4, "rgba(0,0,0,0.6)", 821);
  const kb2 = [[870, 588], [1016, 590], [1018, 740], [870, 738]];
  L.fill(quad(kb2), 0.28, 0.6, { spacing: 0.26, style: 1 });
  edges(L, kb2, 2, "rgba(0,0,0,0.9)", 822);
  carton(L, [[1000, 520], [1050, 520], [1050, 690], [1004, 690]], 0.16, 823, { tape: false });

  // --- the synth keyboard leaning on the cartons
  const K = [[786, 410], [852, 430], [952, 724], [888, 746]];
  L.fill(quad(K), lin(786, 410, 952, 724, [[0, 0.24], [1, 0.18]]), 1.25, { spacing: 0.22 });
  edges(L, K, 2.6, "rgba(0,0,0,0.95)", 830);
  L.line([K[0], K[1]], 1.6, "rgba(242,240,234,0.6)", 831);
  L.line([K[0], K[3]], 1.6, "rgba(242,240,234,0.45)", 832);
  const kq = [quadAt(K, 0.5, 0.05), quadAt(K, 0.96, 0.05), quadAt(K, 0.96, 0.97), quadAt(K, 0.5, 0.97)];
  L.fill(quad(kq), 0.88, 0.3, { spacing: 0.2, style: 2 });
  const NK = 26;
  for (let i = 0; i <= NK; i++) { const t = 0.05 + (0.92 * i) / NK; L.line([quadAt(K, 0.5, t), quadAt(K, 0.96, t)], 1.1, "rgba(0,0,0,0.8)", 840 + i); }
  for (let i = 0; i < NK; i++) {
    if (![1, 2, 4, 5, 6].includes(i % 7)) continue;
    const t = 0.05 + (0.92 * i) / NK;
    const bq = [quadAt(K, 0.5, t - 0.012), quadAt(K, 0.76, t - 0.012), quadAt(K, 0.76, t + 0.012), quadAt(K, 0.5, t + 0.012)];
    L.fill(quad(bq), 0.03, 0.3, { spacing: 0.3, style: 2 });
  }
  for (let i = 0; i < 6; i++) { const p = quadAt(K, 0.25, 0.12 + i * 0.07); o.fillStyle = "rgba(242,240,234,0.6)"; o.beginPath(); o.arc(p[0], p[1], 3.2, 0, 7); o.fill(); }
  for (let i = 0; i < 3; i++) { const a = quadAt(K, 0.14 + i * 0.1, 0.55), b = quadAt(K, 0.14 + i * 0.1, 0.72); L.line([a, b], 3.4, "rgba(242,240,234,0.6)", 850 + i); }
  const lcd = [quadAt(K, 0.1, 0.36), quadAt(K, 0.42, 0.36), quadAt(K, 0.42, 0.44), quadAt(K, 0.1, 0.44)];
  L.fill(quad(lcd), 0.72, 1.25, { style: 2 });
  edges(L, lcd, 1.4, "rgba(0,0,0,0.8)", 855);
  for (let i = 0; i < 4; i++) { const p = quadAt(K, 0.3, 0.8 + i * 0.04); o.fillStyle = "rgba(242,240,234,0.55)"; o.fillRect(p[0] - 4, p[1] - 3, 8, 6); }
}

// ================================================================= RIGHT WALL: cartons, shelving, the glowing light, monitor, synth
function paintRight(L) {
  const o = L.o, r = rng(41);
  // dark hatched column between the corridor and the cartons
  L.fill(quad([[1112, 280], [1160, 276], [1160, 560], [1114, 560]]), 0.1, 0.8, { spacing: 0.3, style: 1 });
  L.fill(quad([[1204, 286], [1238, 280], [1238, 560], [1206, 560]]), 0.12, 0.8, { spacing: 0.3, style: 1 });
  // carton stack A (mottled grey)
  const A = [
    [[1244, 134], [1350, 134], [1352, 194], [1244, 194]], [[1236, 194], [1352, 194], [1352, 250], [1236, 250]],
    [[1244, 250], [1366, 250], [1366, 330], [1244, 330]], [[1250, 330], [1380, 330], [1380, 392], [1250, 392]],
    [[1246, 392], [1380, 392], [1380, 548], [1246, 548]],
  ];
  A.forEach((q, i) => carton(L, q, 0.42 + (i % 2) * 0.05, 900 + i * 10, { tape: i % 2 === 0, label: i === 4 }));
  // carton stack B (catching the light on its right edge)
  const B = [
    [[1380, 122], [1472, 122], [1484, 180], [1380, 184]], [[1380, 184], [1484, 180], [1484, 244], [1380, 248]],
    [[1382, 248], [1484, 244], [1484, 326], [1382, 326]], [[1382, 326], [1486, 326], [1486, 470], [1382, 470]],
    [[1382, 470], [1486, 470], [1486, 548], [1382, 548]],
  ];
  B.forEach((q, i) => carton(L, q, 0.56 + (i % 2) * 0.05, 960 + i * 10, { tape: i !== 3, label: i === 2 || i === 3, lit: 0.6 }));
  // shelving: dark back and the bays
  L.fill(quad([[1486, 0], [2206, 0], [2206, 552], [1486, 552]]), lin(1486, 0, 2206, 0, [[0, 0.1], [0.4, 0.07], [1, 0.04]]), 0.5, { spacing: 0.35, style: 1 });
  carton(L, [[1508, 56], [1590, 52], [1592, 168], [1510, 172]], 0.46, 1020, { tape: false, label: true });
  // left bay: a board with cables looped over it
  board(L, [[1490, 236], [1684, 176], [1684, 198], [1492, 262]], 0.44, 1030, { ang: -0.3, n: 6, litEdge: 0.7 });
  board(L, [[1490, 330], [1684, 292], [1684, 306], [1492, 346]], 0.3, 1035, { ang: -0.2, n: 4, litEdge: 0.4 });
  // right bay: two long boards climbing to the right
  board(L, [[1710, 270], [2136, 64], [2136, 96], [1712, 300]], 0.36, 1040, { ang: -0.45, n: 10, litEdge: 0.6 });
  board(L, [[1710, 100], [2136, -90], [2136, -60], [1712, 128]], 0.24, 1041, { ang: -0.42, n: 8, litEdge: 0.4 });
  // cables: dark loops piled on the boards and hanging
  for (let i = 0; i < 22; i++) {
    const inL = i < 10;
    const x = inL ? 1506 + r() * 170 : 1740 + r() * 300;
    const y = inL ? 200 - (x - 1490) * 0.3 + r() * 40 : 250 - (x - 1710) * 0.48 + r() * 30;
    const pts = []; const rx = 14 + r() * 24, ry = 16 + r() * 40;
    for (let k = 0; k <= 12; k++) { const a = (k / 12) * 2 * PI; pts.push([x + Math.sin(a) * rx, y + (1 - Math.cos(a)) * ry]); }
    curve(o, pts, 3.2, "rgba(6,6,6,0.9)", 1050 + i);
    curve(o, pts.map(([a, b]) => [a - 1, b - 1]), 1.1, `rgba(242,240,234,${inL ? 0.4 : 0.22})`, 1080 + i);
  }
  curve(o, [[1882, 150], [1886, 220], [1878, 300]], 3, "rgba(6,6,6,0.9)", 1070);
  L.fill((c) => c.roundRect(1872, 296, 12, 36, 3), 0.5, PI / 2, { spacing: 0.3 });
  // posts
  for (const [q, v, s] of [[[[1482, 200], [1500, 196], [1500, 552], [1484, 552]], 0.4, 1090], [[[1680, 24], [1706, 20], [1708, 544], [1684, 544]], 0.34, 1091], [[[2130, 0], [2190, 0], [2196, 720], [2136, 720]], 0.24, 1092]]) {
    board(L, q, v, s, { dir: "v", ang: PI / 2, litEdge: 0.3, n: 5 });
  }
  // the light behind the monitor: the brightest thing in the room, dust sparkling in it
  L.fill(quad([[1592, 316], [1690, 312], [1690, 500], [1592, 504]]), lin(1592, 0, 1690, 0, [[0, 0.94], [0.5, 1], [1, 0.9]]), 0.2, { style: 2 });
  L.light((c) => c.ellipse(1630, 400, 110, 130, 0, 0, 7), rad(1630, 400, 0, 130, [[0, 0.45], [1, 0]]), "lighter", 1);
  L.line([[1592, 316], [1592, 504]], 2, "rgba(0,0,0,0.6)", 1095);
  for (let i = 0; i < 90; i++) {
    const x = 1530 + r() * 110, y = 290 + r() * 150, s = 0.8 + r() * 1.6;
    o.fillStyle = `rgba(250,250,245,${0.4 + r() * 0.6})`; o.beginPath(); o.arc(x, y, s, 0, 7); o.fill();
  }
  // the old monitor on the desk, screen cracked
  const mon = [[1506, 392], [1638, 386], [1640, 522], [1508, 524]];
  L.fill(quad(mon), lin(1506, 392, 1640, 522, [[0, 0.6], [1, 0.72]]), 0, { spacing: 0.22 });
  edges(L, mon, 2.2, "rgba(0,0,0,0.9)", 1100);
  const ms = [[1518, 402], [1626, 398], [1628, 504], [1520, 508]];
  L.fill(quad(ms), lin(1518, 402, 1628, 504, [[0, 0.26], [0.6, 0.18], [1, 0.36]]), 0.9, { spacing: 0.26 });
  edges(L, ms, 1.8, "rgba(0,0,0,0.9)", 1101);
  const hub = [1566, 456];
  for (let i = 0; i < 9; i++) {
    const a = r() * 2 * PI, L1 = 20 + r() * 50, p1 = [hub[0] + Math.cos(a) * L1, hub[1] + Math.sin(a) * L1 * 0.8];
    L.line([hub, [(hub[0] + p1[0]) / 2 + (r() - 0.5) * 8, (hub[1] + p1[1]) / 2 + (r() - 0.5) * 8], p1], 1.3, "rgba(242,240,234,0.7)", 1110 + i);
  }
  // keyboard and mouse on the desk
  const kb = [[1412, 532], [1540, 528], [1546, 550], [1406, 552]];
  L.fill(quad(kb), 0.5, 0.05, { spacing: 0.2 });
  for (let i = 0; i < 16; i++) { const a = quadAt(kb, (i + 0.5) / 16, 0.2), b = quadAt(kb, (i + 0.5) / 16, 0.85); L.line([a, b], 1, "rgba(0,0,0,0.6)", 1120 + i); }
  edges(L, kb, 1.6, "rgba(0,0,0,0.9)", 1140);
  L.fill(ell(1556, 540, 18, 8, -0.05), 0.72, 0, { style: 2 });
  // the synth workstation: a lit panel of knobs and a display, white keys along its near edge
  const pan = [[1636, 500], [1758, 372], [2134, 296], [2058, 446]];
  L.fill(quad(pan), lin(1636, 450, 2134, 300, [[0, 0.46], [0.5, 0.38], [1, 0.2]]), -0.2, { spacing: 0.24 });
  edges(L, pan, 2.4, "rgba(0,0,0,0.95)", 1150);
  L.line([pan[1], pan[2]], 1.8, "rgba(242,240,234,0.5)", 1151);
  for (let row = 0; row < 3; row++) for (let i = 0; i < 12; i++) {
    const p = quadAt(pan, 0.08 + i * 0.07, 0.2 + row * 0.2);
    o.fillStyle = "rgba(0,0,0,0.85)"; o.beginPath(); o.ellipse(p[0], p[1], 7, 5.5, -0.2, 0, 7); o.fill();
    o.fillStyle = "rgba(242,240,234,0.5)"; o.beginPath(); o.ellipse(p[0] - 1.5, p[1] - 1.5, 2.4, 1.8, -0.2, 0, 7); o.fill();
  }
  const disp = [quadAt(pan, 0.58, 0.1), quadAt(pan, 0.82, 0.1), quadAt(pan, 0.82, 0.36), quadAt(pan, 0.58, 0.36)];
  L.fill(quad(disp), 0.08, 0, { spacing: 0.3 });
  edges(L, disp, 1.6, "rgba(242,240,234,0.4)", 1152);
  const keys = [quadAt(pan, 0.05, 0.62), quadAt(pan, 0.75, 0.62), quadAt(pan, 0.75, 0.96), quadAt(pan, 0.05, 0.96)];
  L.fill(quad(keys), lin(1660, 480, 2000, 420, [[0, 0.9], [0.6, 0.76], [1, 0.5]]), -0.2, { spacing: 0.2, style: 2 });
  for (let i = 0; i <= 28; i++) { const a = quadAt(keys, i / 28, 0), b = quadAt(keys, i / 28, 1); L.line([a, b], 1.2, "rgba(0,0,0,0.75)", 1160 + i); }
  for (let i = 0; i < 28; i++) {
    if (![1, 2, 4, 5, 6].includes(i % 7)) continue;
    const q = [quadAt(keys, (i + 0.65) / 28, 0), quadAt(keys, (i + 1.35) / 28, 0), quadAt(keys, (i + 1.35) / 28, 0.6), quadAt(keys, (i + 0.65) / 28, 0.6)];
    L.fill(quad(q), 0.03, 0, { style: 2 });
  }
  const fr = [[1636, 500], [2058, 446], [2062, 474], [1640, 534]];
  L.fill(quad(fr), 0.16, -0.1, { spacing: 0.3 });
  edges(L, fr, 2, "rgba(0,0,0,0.9)", 1200);
  // a stand leg under the synth, the far right dark
  L.light(quad([[2040, 0], [2206, 0], [2206, 560], [2040, 560]]), 0, "source-over", 0.35);
}
