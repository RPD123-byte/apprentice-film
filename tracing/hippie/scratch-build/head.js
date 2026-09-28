  // raised forearm (sleeve rolled): elbow on the desk, fist under the chin
  shape(ctx, [[972, 548], [1016, 552], [1022, 590], [1004, 640], [982, 690], [960, 730], [926, 736], [918, 706], [940, 660], [958, 600]], HC.skin, { lw: 2.6 });
  ctx.save(); ctx.globalAlpha = 0.55; shape(ctx, [[1004, 580], [1020, 592], [1002, 642], [978, 694], [964, 690], [986, 636]], HC.skinSh, { lw: 0 }); ctx.restore();
  // sleeve bunched at the elbow
  shape(ctx, [[858, 690], [918, 698], [956, 728], [948, 786], [884, 800], [846, 764]], "#587450", { lw: 2.8 });
  line(ctx, [[880, 720], [915, 760]], 2, "#2b3d27"); line(ctx, [[870, 760], [905, 790]], 2, "#2b3d27");
  // hair behind the head: dark mass framing the face, messy locks down both sides
  shape(ctx, [[946, 404], [990, 372], [1060, 356], [1130, 358], [1178, 380], [1190, 430], [1184, 480], [1176, 520], [1166, 540], [1158, 506], [1150, 470], [990, 470], [982, 500], [972, 512], [962, 488], [950, 452]], HC.hair, { lw: 2, smooth: true });
  // head: ear, face
  shape(ctx, [[1150, 446], [1164, 440], [1172, 452], [1170, 476], [1160, 490], [1148, 488]], HC.skin, { lw: 2.4, smooth: true });
  line(ctx, [[1156, 452], [1162, 466], [1156, 480]], 1.6, "rgba(120,60,50,0.7)", true);
  shape(ctx, [[986, 414], [983, 450], [990, 482], [1004, 514], [1026, 544], [1052, 562], [1078, 568], [1104, 556], [1126, 532], [1140, 506], [1148, 474], [1151, 440], [1146, 400], [1100, 382], [1040, 384], [1000, 398]], HC.skin, { lw: 2.8, smooth: true });
  // skin shading: nose bridge, the far cheek, under the jaw
  ctx.save(); ctx.globalAlpha = 0.45;
  shape(ctx, [[1048, 412], [1056, 440], [1054, 470], [1046, 474], [1044, 440]], HC.skinSh, { lw: 0, smooth: true });
  shape(ctx, [[1132, 440], [1149, 440], [1146, 486], [1134, 520], [1126, 494]], HC.skinSh, { lw: 0, smooth: true });
  shape(ctx, [[1040, 552], [1104, 548], [1080, 566]], HC.skinSh, { lw: 0, smooth: true });
  ctx.restore();
  // fringe: black locks from under the brim over the forehead and down the temples
  const lock = (pts, w) => { ctx.beginPath(); smoothPath(ctx, pts, false); ctx.lineWidth = w; ctx.strokeStyle = HC.hair; ctx.lineCap = "round"; ctx.stroke(); };
  shape(ctx, [[960, 398], [1000, 380], [1060, 368], [1120, 368], [1172, 384], [1180, 404], [1150, 392], [1120, 384], [1086, 386], [1050, 392], [1022, 394], [996, 408], [976, 424], [962, 440]], HC.hair, { lw: 0, smooth: true });
  lock([[1004, 388], [1012, 404], [1006, 422]], 6); lock([[1030, 386], [1044, 398], [1040, 414]], 5); lock([[1140, 384], [1150, 400], [1152, 420]], 6);
  lock([[1164, 392], [1172, 430], [1168, 470]], 8); lock([[980, 420], [972, 450], [976, 486]], 9); lock([[990, 430], [986, 460], [992, 478]], 5);
  // beanie: rounded knit dome with a ribbed turn-up (its crown hides behind the lettering)
  const bean = [[944, 432], [940, 390], [944, 350], [960, 320], [1060, 300], [1160, 312], [1184, 340], [1186, 380], [1182, 410], [1172, 390], [1150, 372], [1110, 360], [1060, 362], [1010, 382], [985, 396], [960, 416]];
  shape(ctx, bean, HC.beanie, { lw: 3, smooth: true });
  ctx.save(); ctx.beginPath(); smoothPath(ctx, bean, true); ctx.clip();
  ctx.strokeStyle = "rgba(40,20,12,0.5)"; ctx.lineWidth = 2;
  for (let x = 940; x < 1190; x += 8.5) { ctx.beginPath(); ctx.moveTo(x, 300); ctx.quadraticCurveTo(x + (x - 1065) * 0.06, 360, x - (x - 1065) * 0.05, 440); ctx.stroke(); }
  ctx.fillStyle = "rgba(255,210,170,0.10)"; ctx.beginPath(); ctx.ellipse(1060, 345, 70, 30, 0, 0, TAU); ctx.fill();
  ctx.restore();
  // brows
  const brow = (pts, w) => { ctx.beginPath(); smoothPath(ctx, pts, false); ctx.lineWidth = w; ctx.strokeStyle = HC.hair; ctx.lineCap = "round"; ctx.stroke(); };
  brow([[994, 409], [1016, 402], [1044, 404]], 8); brow([[1082, 397], [1108, 389], [1136, 395]], 9);
  // eyes: almond whites, big brown irises with a catch-light, heavy upper lid line, thin lower lid
  const eye = (cx, cy, w, h) => {
    const up = (c) => { c.moveTo(cx - w, cy + 2); c.bezierCurveTo(cx - w * 0.5, cy - h, cx + w * 0.45, cy - h * 1.05, cx + w, cy - 1); };
    ctx.save();
    ctx.beginPath(); up(ctx); ctx.bezierCurveTo(cx + w * 0.5, cy + h * 0.8, cx - w * 0.5, cy + h * 0.8, cx - w, cy + 2); ctx.closePath();
    ctx.fillStyle = "#fcf5ee"; ctx.fill(); ctx.clip();
    circle(ctx, cx, cy - 1, h * 0.95, "#4a2a1c"); circle(ctx, cx, cy - 1, h * 0.5, "#140b09"); circle(ctx, cx + h * 0.35, cy - h * 0.4, h * 0.26, "#fff");
    ctx.restore();
    ctx.beginPath(); up(ctx); ctx.lineWidth = 3.8; ctx.strokeStyle = L; ctx.lineCap = "round"; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - w * 0.72, cy + h * 0.72); ctx.quadraticCurveTo(cx, cy + h * 1.05, cx + w * 0.7, cy + h * 0.6); ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(90,50,40,0.75)"; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - w * 0.6, cy + h * 1.35); ctx.quadraticCurveTo(cx, cy + h * 1.7, cx + w * 0.55, cy + h * 1.3); ctx.lineWidth = 1.2; ctx.strokeStyle = "rgba(150,90,70,0.45)"; ctx.stroke();
  };
  eye(1021, 433, 23, 11); eye(1111, 423, 25, 11.5);
  // nose: bridge line, round tip with a nostril
  line(ctx, [[1052, 418], [1054, 450], [1050, 472]], 1.6, "rgba(120,70,50,0.55)", true);
  ctx.beginPath(); smoothPath(ctx, [[1050, 474], [1046, 484], [1058, 491], [1074, 490], [1088, 483]], false); ctx.lineWidth = 2.6; ctx.strokeStyle = L; ctx.stroke();
  line(ctx, [[1062, 484], [1068, 487]], 2, L);
  // mouth: a small smile turning up at the right, the lower lip hinted
  line(ctx, [[1036, 512], [1070, 516], [1100, 509], [1110, 502]], 2.8, L, true);
  line(ctx, [[1062, 528], [1080, 527]], 2, "rgba(140,70,60,0.6)");
  // the fist under the chin: back of the hand to the left, curled fingers, thumb along the jaw
  shape(ctx, [[952, 500], [966, 488], [990, 486], [1010, 494], [1022, 508], [1028, 530], [1026, 552], [1012, 562], [988, 562], [966, 552], [954, 530]], HC.skin, { lw: 2.8, smooth: true });
  for (const pts of [[[954, 506], [980, 500], [1004, 504], [1016, 512]], [[954, 524], [978, 520], [998, 524]], [[958, 542], [980, 540], [996, 544]], [[1004, 506], [1012, 530], [1024, 546]], [[1016, 512], [1010, 520], [1004, 518]]]) line(ctx, pts, 2.2, L, true);
  ctx.save(); ctx.globalAlpha = 0.4; shape(ctx, [[952, 530], [966, 552], [988, 562], [970, 540]], HC.skinSh, { lw: 0, smooth: true }); ctx.restore();
