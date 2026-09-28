// ----- the designer -----
// Head on his right fist, green overshirt over a mustard tee, headphones round the neck, a brown knit beanie, the
// laptop in front and his left hand on its keys. Drawn by hand: every outline is a spline through points read off
// 2.4–5x coordinate grids of the source (117.4 s); inks sampled pre-grade.
const DS = {
  skin: "#ddb493", skinM: "#d2a584", skinS: "#bf8a74", skinD: "#9c5f52", hair: "#140a0d", hairHi: "#3a3140",
  beanie: "#714530", beanieD: "#553220", beanieL: "#865840",
  jacket: "#52704f", jacketM: "#486346", jacketD: "#30432e", jacketL: "#5c7c57", tee: "#c28e4b", teeD: "#9d6d34",
  phones: "#27252a", phonesM: "#45424a", phonesL: "#77737c",
  laptop: "#6d666a", laptopL: "#8e868b", laptopD: "#4c464b", logo: "#302d31",
  desk: "#cfa680", deskD: "#a57f5c", deskL: "#dcb690", under: "#1b1819",
  ink: "#1e1418", lid: "#1c1014", white: "#f1ece4", iris: "#4a2a1e",
};
const sp = (ctx, pts, closed = true) => { ctx.beginPath(); smoothPath(ctx, pts, closed); };
function fillSp(ctx, pts, col, lw = 0, line = DS.ink) {
  sp(ctx, pts, true);
  if (col) { ctx.fillStyle = col; ctx.fill(); }
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = line; ctx.lineJoin = "round"; ctx.stroke(); }
}
function strokeSp(ctx, pts, lw, col = DS.ink) {
  sp(ctx, pts, false); ctx.lineWidth = lw; ctx.strokeStyle = col; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke();
}
// a stroke that swells in the middle and tapers to points (lids, brows, folds, strands)
function taperSp(ctx, pts, w, col = DS.ink, a0 = 0.08, a1 = 0.92) {
  const P = sampleCurve(pts, 8), n = P.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const p = P[Math.max(0, i - 1)], q = P[Math.min(n - 1, i + 1)];
    let dx = q[0] - p[0], dy = q[1] - p[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const hw = (w / 2) * Math.pow(Math.sin(Math.PI * (a0 + (a1 - a0) * i / (n - 1))), 0.6);
    L.push([P[i][0] - dy * hw, P[i][1] + dx * hw]); R.push([P[i][0] + dy * hw, P[i][1] - dx * hw]);
  }
  ctx.beginPath(); poly(ctx, [...L, ...R.reverse()]); ctx.fillStyle = col; ctx.fill();
}
function clipSp(ctx, pts) { sp(ctx, pts, true); ctx.clip(); }
// a lock of hair: a tapered blade from root to tip, width w at the root
function lock(ctx, root, tip, w, bend = 0, col = DS.hair) {
  const mx = (root[0] + tip[0]) / 2, my = (root[1] + tip[1]) / 2, dx = tip[0] - root[0], dy = tip[1] - root[1];
  const L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const c = [mx + nx * bend, my + ny * bend];
  ctx.beginPath();
  ctx.moveTo(root[0] + nx * w / 2, root[1] + ny * w / 2);
  ctx.quadraticCurveTo(c[0] + nx * w * 0.3, c[1] + ny * w * 0.3, tip[0], tip[1]);
  ctx.quadraticCurveTo(c[0] - nx * w * 0.3, c[1] - ny * w * 0.3, root[0] - nx * w / 2, root[1] - ny * w / 2);
  ctx.closePath(); ctx.fillStyle = col; ctx.fill();
}

const D_FACE = [[985, 410], [982, 430], [981, 452], [984, 478], [994, 494], [1012, 516], [1034, 544], [1060, 559], [1088, 563], [1112, 556],
  [1131, 540], [1143, 520], [1149, 492], [1151, 460], [1150, 430], [1147, 400], [1138, 380], [1110, 366], [1062, 361], [1015, 370], [994, 388]];
const D_JACKET_L = [[952, 548], [914, 557], [881, 577], [872, 602], [856, 644], [847, 686], [835, 727], [827, 773], [822, 834], [906, 834],
  [927, 725], [936, 706], [956, 668], [976, 626], [990, 588], [976, 558]];
const D_JACKET_R = [[1146, 500], [1172, 522], [1215, 540], [1257, 562], [1287, 591], [1303, 645], [1320, 695], [1345, 737], [1366, 774],
  [1387, 812], [1397, 836], [1316, 835], [1298, 815], [1264, 801], [1216, 792], [1172, 789], [1145, 789], [1141, 774], [1149, 712], [1162, 657], [1168, 620], [1162, 560]];
// his left hand on the laptop's keys, under the sleeve: fingers to the laptop's edge, wrist under the cuff
const D_HAND = [[1128, 802], [1136, 790], [1160, 785], [1196, 789], [1240, 797], [1284, 808], [1314, 834], [1127, 835]];
const D_FOREARM = [[990, 585], [1012, 580], [1038, 578], [1034, 612], [1021, 640], [1011, 665], [1005, 700], [1003, 728], [927, 728],
  [937, 705], [955, 670], [972, 635], [984, 606]];
const D_FIST = [[948, 492], [955, 486], [975, 478], [995, 480], [1008, 496], [1024, 515], [1032, 528], [1031, 548], [1040, 572], [1030, 583],
  [1006, 600], [995, 606], [976, 586], [961, 563], [952, 540], [948, 515]];

function designer(ctx) {
  ctx.save();
  ctx.lineJoin = "round"; ctx.lineCap = "round";
  // --- hair masses behind the head (either side, and under the beanie's brim)
  fillSp(ctx, [[943, 402], [965, 398], [990, 404], [986, 430], [981, 452], [984, 478], [992, 494], [978, 502], [962, 498], [952, 480], [946, 455]], DS.hair);
  fillSp(ctx, [[1138, 382], [1172, 390], [1196, 408], [1200, 450], [1193, 490], [1181, 513], [1160, 510], [1150, 480], [1152, 440], [1146, 404]], DS.hair);
  for (const [r, t, w] of [[[1186, 470], [1178, 514], 10], [[1166, 480], [1158, 512], 9], [[1196, 440], [1194, 490], 8], [[958, 470], [956, 505], 10], [[972, 470], [975, 502], 8]])
    lock(ctx, r, t, w);
  // --- tee and neck
  fillSp(ctx, [[1040, 626], [1077, 646], [1104, 630], [1152, 640], [1150, 712], [1142, 774], [1142, 794], [1040, 794], [1044, 700]], DS.tee, 2.2);
  for (const f of [[[1060, 670], [1075, 700], [1080, 740]], [[1100, 660], [1110, 700], [1118, 760]], [[1090, 740], [1100, 780]]]) taperSp(ctx, f, 2, DS.teeD);
  fillSp(ctx, [[1050, 552], [1062, 562], [1100, 564], [1106, 600], [1104, 630], [1077, 646], [1050, 626], [1046, 590]], DS.skinM, 2.2);
  ctx.save(); clipSp(ctx, [[1046, 552], [1108, 552], [1108, 646], [1046, 646]]);
  fillSp(ctx, [[1046, 556], [1110, 556], [1106, 592], [1080, 602], [1058, 590]], DS.skinS);
  taperSp(ctx, [[1070, 605], [1078, 615], [1084, 628]], 2.2, DS.skinD);
  ctx.restore();
  strokeSp(ctx, [[1048, 624], [1077, 644], [1104, 630]], 2.4, DS.ink);
  // --- his left hand (drawn under the sleeve), then the jacket, right side (his left): body + sleeve, collar, pocket, folds
  shape(ctx, D_HAND, DS.skin, { lw: 2.4, line: DS.ink, smooth: true, tension: 0.35 });
  for (const f of [[[1132, 798], [1150, 794], [1172, 797]], [[1130, 808], [1152, 804], [1180, 808]], [[1131, 817], [1156, 814], [1186, 818]], [[1133, 825], [1160, 823], [1190, 826]]])
    strokeSp(ctx, f, 1.8, DS.skinD);
  fillSp(ctx, D_JACKET_R, DS.jacket, 2.8);
  ctx.save(); clipSp(ctx, D_JACKET_R);
  fillSp(ctx, [[1240, 640], [1290, 620], [1310, 680], [1350, 750], [1400, 830], [1300, 836], [1250, 760]], DS.jacketM);
  fillSp(ctx, [[1150, 660], [1170, 670], [1165, 760], [1150, 800], [1140, 760]], DS.jacketM);
  for (const f of [[[1242, 600], [1262, 640], [1275, 700]], [[1270, 590], [1296, 640], [1305, 700], [1322, 760]], [[1285, 680], [1300, 720], [1340, 770]],
    [[1215, 790], [1260, 770], [1300, 780], [1340, 800]], [[1300, 740], [1330, 790], [1360, 820]], [[1180, 560], [1210, 600], [1240, 620]]])
    taperSp(ctx, f, 3, DS.jacketD);
  ctx.restore();
  shape(ctx, [[1150, 518], [1178, 540], [1206, 572], [1216, 598], [1211, 634], [1190, 624], [1172, 606], [1160, 580]], DS.jacketL, { lw: 2.4, line: DS.ink });
  strokeSp(ctx, [[1162, 657], [1152, 710], [1143, 774]], 2.4, DS.ink);
  flatPath(ctx, [1170, 712, 1242, 710, 1244, 752, 1172, 754]); ctx.lineWidth = 2.2; ctx.strokeStyle = DS.ink; ctx.stroke();
  strokeSp(ctx, [[1172, 722], [1243, 720]], 2, DS.ink);
  // --- the jacket, left side: sleeve round the raised arm, the lapel beside it
  fillSp(ctx, D_JACKET_L, DS.jacket, 2.8);
  ctx.save(); clipSp(ctx, D_JACKET_L);
  fillSp(ctx, [[822, 700], [860, 690], [900, 760], [906, 834], [818, 834]], DS.jacketM);
  for (const f of [[[882, 590], [905, 630], [925, 680]], [[870, 630], [890, 680], [905, 730]], [[905, 575], [935, 610], [955, 640]], [[850, 700], [872, 750], [888, 800]],
    [[925, 560], [950, 590], [965, 615]], [[840, 760], [860, 800], [868, 834]]]) taperSp(ctx, f, 3, DS.jacketD);
  ctx.restore();
  fillSp(ctx, [[1004, 600], [1044, 622], [1052, 660], [1046, 700], [1042, 736], [995, 736], [1000, 668]], DS.jacketM, 2.4);
  strokeSp(ctx, [[1020, 640], [1030, 690], [1026, 730]], 2, DS.jacketD);
  // --- headphones round the neck: the far cup (left), the band, the near cup (right)
  fillSp(ctx, [[1040, 600], [1062, 598], [1068, 630], [1062, 658], [1044, 655], [1036, 628]], DS.phones, 2);
  strokeSp(ctx, [[1124, 562], [1138, 540], [1150, 518]], 7, DS.phones);
  ctx.save(); ctx.translate(1136, 607); ctx.rotate(-0.1);
  ctx.beginPath(); ctx.ellipse(0, 0, 36, 52, 0, 0, TAU); ctx.fillStyle = DS.phones; ctx.fill(); ctx.lineWidth = 2.6; ctx.strokeStyle = DS.ink; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(8, -2, 24, 43, 0, 0, TAU); ctx.fillStyle = DS.phonesM; ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(10, -2, 16, 33, 0, 0, TAU); ctx.fillStyle = DS.phones; ctx.fill();
  ctx.beginPath(); ctx.ellipse(13, -16, 4.5, 13, -0.2, 0, TAU); ctx.fillStyle = DS.phonesL; ctx.fill();
  ctx.restore();
  // --- the forearm (shadowed along its outer edge) and the fist under the chin
  fillSp(ctx, D_FOREARM, DS.skin, 2.6);
  ctx.save(); clipSp(ctx, D_FOREARM);
  fillSp(ctx, [[984, 606], [994, 592], [1000, 604], [985, 640], [966, 680], [948, 728], [927, 728], [937, 705], [955, 670], [972, 635]], DS.skinS);
  ctx.restore();
  // --- ears, face
  fillSp(ctx, [[964, 446], [980, 444], [986, 470], [988, 492], [972, 490], [962, 468]], DS.skinM, 2.2);
  fillSp(ctx, D_FACE, DS.skin, 2.6);
  ctx.save(); clipSp(ctx, D_FACE);
  fillSp(ctx, [[978, 440], [998, 444], [1010, 474], [1008, 500], [1030, 540], [1000, 524], [985, 494]], DS.skinM);
  fillSp(ctx, [[1098, 550], [1128, 534], [1146, 512], [1152, 540], [1112, 568]], DS.skinM);
  fillSp(ctx, [[1052, 440], [1058, 436], [1056, 470], [1050, 476], [1046, 460]], DS.skinM);
  ctx.restore();
  fillSp(ctx, [[1148, 438], [1158, 432], [1168, 438], [1172, 452], [1168, 466], [1160, 474], [1150, 474]], DS.skin, 2.4);
  strokeSp(ctx, [[1156, 444], [1163, 449], [1162, 460], [1156, 465]], 1.8, DS.skinD);
  // --- the beanie (its brim meets the hair; the crown shows between the letters)
  const bean = [[944, 440], [939, 402], [940, 370], [950, 335], [980, 305], [1060, 292], [1150, 300], [1190, 328], [1203, 368], [1199, 412],
    [1183, 410], [1170, 395], [1150, 381], [1110, 367], [1060, 362], [1012, 370], [986, 386], [966, 402], [952, 438]];
  fillSp(ctx, bean, DS.beanie, 2.8);
  ctx.save(); clipSp(ctx, bean);
  for (let x = 936; x < 1210; x += 8.5) {
    const k = (x - 1070) / 130;
    ctx.beginPath(); ctx.moveTo(x - k * 14, 290); ctx.quadraticCurveTo(x + k * 3, 345, x + k * 12, 445);
    ctx.strokeStyle = DS.beanieD; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - k * 14 + 3.5, 290); ctx.quadraticCurveTo(x + k * 3 + 3.5, 345, x + k * 12 + 3.5, 445);
    ctx.strokeStyle = DS.beanieL; ctx.lineWidth = 1.3; ctx.stroke();
  }
  ctx.restore();
  // --- fringe locks over the forehead, and the sideburn strands
  fillSp(ctx, [[976, 400], [990, 380], [1020, 366], [1056, 359], [1053, 363], [1044, 372], [1027, 383], [1000, 394], [986, 408], [983, 430]], DS.hair);
  fillSp(ctx, [[1080, 361], [1115, 362], [1140, 370], [1152, 386], [1158, 406], [1150, 400], [1147, 390], [1138, 377], [1115, 366]], DS.hair);
  lock(ctx, [1058, 362], [1054, 393], 9, 1);
  lock(ctx, [1134, 374], [1136, 395], 7, 0);
  lock(ctx, [1045, 368], [1036, 382], 5, 1);
  lock(ctx, [1140, 380], [1146, 420], 8, -2);
  lock(ctx, [990, 404], [975, 452], 10, 3);
  for (const [r, t, w, b] of [[[962, 420], [930, 462], 10, 4], [[966, 440], [938, 486], 10, 3], [[972, 455], [952, 500], 9, 2], [[948, 404], [928, 438], 9, 3],
    [[1178, 412], [1210, 446], 10, -4], [[1184, 430], [1206, 476], 9, -3], [[1176, 452], [1190, 500], 8, -2], [[1160, 404], [1176, 428], 7, -2],
    [[1170, 420], [1166, 446], 6, 1]]) lock(ctx, r, t, w, b);
  taperSp(ctx, [[1008, 383], [1022, 375], [1036, 369]], 2.2, DS.hairHi);
  taperSp(ctx, [[1142, 380], [1152, 392], [1158, 406]], 1.8, DS.hairHi);
  // --- eyes, brows, nose, mouth
  const eye = (up, low, iris, crease) => {
    ctx.save();
    sp(ctx, up, false); for (const p of sampleCurve(low.slice().reverse(), 6)) ctx.lineTo(p[0], p[1]); ctx.closePath();
    ctx.fillStyle = DS.white; ctx.fill(); ctx.clip();
    circle(ctx, iris[0], iris[1], 9, DS.iris); circle(ctx, iris[0], iris[1], 4.6, "#1a0c0a");
    ctx.fillStyle = "rgba(90,50,40,0.28)"; ctx.fillRect(iris[0] - 30, iris[1] - 12, 60, 5);
    ctx.restore();
    circle(ctx, iris[0] + 4, iris[1] - 4, 2.2, "#fbf8f2");
    taperSp(ctx, up, 3.8, DS.lid, 0.12, 0.95);
    strokeSp(ctx, low, 1.2, "rgba(110,60,48,0.85)");
    strokeSp(ctx, crease, 1.3, "rgba(120,70,55,0.7)");
  };
  eye([[997, 435], [1008, 427], [1024, 424], [1036, 427], [1043, 433]], [[1002, 438], [1020, 441], [1038, 438]], [1024, 432], [[1000, 421], [1024, 417], [1039, 421]]);
  eye([[1089, 424], [1099, 419], [1114, 417], [1130, 420], [1137, 424]], [[1092, 427], [1111, 430], [1131, 425]], [1110, 423], [[1090, 413], [1112, 409], [1130, 412]]);
  taperSp(ctx, [[989, 409], [1008, 401], [1033, 400], [1042, 406]], 6.5, DS.hair, 0.15, 0.9);
  taperSp(ctx, [[1083, 398], [1099, 391], [1118, 390], [1131, 393]], 6.5, DS.hair, 0.1, 0.85);
  strokeSp(ctx, [[1058, 434], [1054, 455], [1050, 474]], 1.8, DS.skinD);
  fillSp(ctx, [[1052, 477], [1060, 485], [1072, 489], [1084, 485], [1090, 480], [1080, 482], [1068, 483], [1058, 480]], DS.skinS);
  strokeSp(ctx, [[1049, 478], [1056, 486], [1068, 489], [1081, 485], [1089, 480]], 2, DS.skinD);
  taperSp(ctx, [[1036, 513], [1061, 516], [1086, 511], [1110, 502]], 2.8, "#5a2a22", 0.1, 0.95);
  strokeSp(ctx, [[1061, 524], [1077, 527], [1088, 523]], 1.6, "rgba(150,90,75,0.8)");
  // --- the fist over the jaw: curled fingers (knuckles to the left), the thumb up the cheek
  fillSp(ctx, D_FIST, DS.skin, 2.6);
  ctx.save(); clipSp(ctx, D_FIST);
  fillSp(ctx, [[945, 490], [962, 498], [968, 530], [980, 566], [998, 600], [980, 600], [955, 560]], DS.skinS);
  ctx.restore();
  for (const f of [[[958, 494], [960, 520], [966, 545], [975, 562]], [[972, 498], [975, 525], [982, 550]], [[988, 505], [990, 528], [996, 546]],
    [[950, 494], [958, 489], [966, 493]], [[966, 494], [976, 488], [986, 494]], [[986, 497], [995, 492], [1003, 500]],
    [[998, 500], [1014, 514], [1026, 528], [1028, 548]], [[1008, 520], [1018, 532], [1016, 545]]]) taperSp(ctx, f, 2.4, DS.ink, 0.05, 0.95);
  // --- the laptop lid, then his left hand on the keys and the cuff over it
  ctx.beginPath(); ctx.moveTo(876, 729); ctx.lineTo(1106, 723); ctx.quadraticCurveTo(1128, 723, 1130, 745); ctx.lineTo(1134, 832);
  ctx.lineTo(874, 834); ctx.lineTo(868, 745); ctx.quadraticCurveTo(866, 730, 876, 729); ctx.closePath();
  ctx.fillStyle = DS.laptop; ctx.fill(); ctx.lineWidth = 2.8; ctx.strokeStyle = DS.ink; ctx.stroke();
  strokeSp(ctx, [[874, 734], [1106, 728], [1124, 740], [1128, 830]], 2.2, DS.laptopL);
  circle(ctx, 997, 787, 16, DS.logo);
  ctx.restore();
}

// the desk: tan top, dark apron, legs (the gear on it is drawn elsewhere); his legs under it
function desk(ctx) {
  ctx.save();
  fillSp(ctx, [[880, 890], [1000, 884], [1100, 884], [1320, 890], [1330, 946], [870, 946]], "#252027");
  flatPath(ctx, [998, 890, 1038, 890, 1040, 908, 1004, 906]); ctx.fillStyle = DS.jacketM; ctx.fill();
  flatPath(ctx, [1168, 890, 1207, 890, 1203, 906, 1166, 908]); ctx.fillStyle = DS.jacketM; ctx.fill();
  shape(ctx, [[1032, 891], [1184, 891], [1166, 946], [1050, 946]], "#b58646", { lw: 2.4, line: DS.ink });
  strokeSp(ctx, [[1050, 903], [1100, 906], [1156, 900]], 1.6, "#7a5424"); strokeSp(ctx, [[1066, 918], [1106, 922], [1144, 914]], 1.6, "#7a5424");
  strokeSp(ctx, [[930, 900], [980, 930], [1000, 946]], 2.2, "#3a343c"); strokeSp(ctx, [[1230, 900], [1190, 930], [1175, 946]], 2.2, "#3a343c");
  flatPath(ctx, [656, 861, 1642, 861, 1642, 890, 656, 890]); ctx.fillStyle = DS.under; ctx.fill();
  flatPath(ctx, [656, 832, 1642, 831, 1642, 860, 656, 860]); ctx.fillStyle = DS.desk; ctx.fill();
  ctx.lineWidth = 2.8; ctx.strokeStyle = DS.ink; ctx.stroke();
  for (const [x0, x1] of [[700, 730], [1590, 1620]]) { flatPath(ctx, [x0, 886, x1, 886, x1 - 4, 946, x0 + 4, 946]); ctx.fillStyle = DS.deskD; ctx.fill(); ctx.stroke(); }
  ctx.restore();
}
