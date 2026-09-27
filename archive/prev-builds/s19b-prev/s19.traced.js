// s19 (57.32–63.12): low on the floor among the gear. Locked-off camera (camtrack < 0.3 px over the whole shot).
// The note card stands propped against the speaker, glowing and lighting the floor with fine rays; the owl tumbles
// in from the right as a ball, skids on its belly (dust cloud), sits up with its back to us and looks up at the
// card, gets up (a wing sweeps down: dusting off), stands, throws its wings open, then lifts the card, turns to
// three-quarter view and carries it off to the right, revealing the scissors leaning on the plank behind it.
// Fix pass 2 (TRACED): the room and every frame of the owl are vector tracings of the source frames (s19/roomdata.js,
// s19/owldata.js; strokes + posterised tone outlines, no pixels), redrawn by s19/roomtrace.js; the card is drawn
// from notecard.js and warped per frame by the measured two-homography table (s19/card.js). See fidelity/s19.md.
import { W, H } from "../config.js";
import { clamp } from "../lib/rng.js";
import { Plate } from "../lib/engrave.js";
import { paintRoom, paintFloorRays } from "./s19/room.js";
import { traceLayer, owlKey, releaseTrace } from "./s19/roomtrace.js";
import { cardQuad, cardMap, warpCardAt, releaseCard, CARD_OUTLINE } from "./s19/card.js";
import { releaseWarp } from "./s19/warp.js";
import { drawOwlAt, drawDust, owlShadow, releaseOwl } from "./s19/anim.js";

// TRACED = true: the room and the owl's held drawings are the vector tracings of the source frames (s19/roomdata.js,
// s19/owldata.js; see fidelity/s19.md). false: the hand-built engraved room (s19/room.js) and the painted owl rig
// everywhere (the fix-pass-1 drawing).
const TRACED = true;
let L = null;
function layers() {
  if (L) return L;
  let room, rays;
  if (TRACED) {
    // the room traced from the source (dark floor), and the floor as lit by the standing card
    room = traceLayer("room");
    rays = traceLayer("lit");
  } else {
    const P = new Plate(W, H, 1); paintRoom(P);
    room = P.engrave({ spacing: 5.5, seed: 19, contrast: 1.05 });
    rays = document.createElement("canvas"); rays.width = W; rays.height = H; paintFloorRays(rays.getContext("2d"));
  }
  const glow = document.createElement("canvas"); glow.width = Math.round(W / 4); glow.height = Math.round(H / 4);
  const acc = document.createElement("canvas"); acc.width = W; acc.height = H;
  L = { room, rays, glow, acc };
  return L;
}

// The floor light comes from the card and goes as it is lifted. Measured per source frame (floor means at x 300–900 and
// 1700–2100, y 840–946, normalised between the lit 61.40 and the dark 61.80 frames): 0.96 at 61.44, 0.76, 0.53,
// 0.52 (61.56 repeats 61.52), 0.35, 0.18, 0.09, 0.01 at 61.72, then dark.
const FLOOR = [[61.40, 1], [61.44, 0.96], [61.48, 0.76], [61.52, 0.53], [61.56, 0.52], [61.60, 0.35], [61.64, 0.18], [61.68, 0.09], [61.72, 0.01], [61.76, 0]];
const floorLight = (t) => {
  if (t <= FLOOR[0][0]) return 1;
  for (let i = 1; i < FLOOR.length; i++) if (t <= FLOOR[i][0]) { const [a, va] = FLOOR[i - 1], [b, vb] = FLOOR[i]; return va + (vb - va) * (t - a) / (b - a); }
  return 0;
};


// The owl (TRACED): on key frames it is the key drawing traced on that very frame (s19/owldata.js); on the frames
// between keys, a neighbouring key moved by an affine map [a, b, c, d, e, f] (x' = a x + b y + c, y' = d x + e y + f)
// found by ECC alignment of the key frame's owl onto that frame (trace/keyplan.py, keytrack.py, owltrack.py), kept
// only where the moved key silhouette overlaps the frame's own owl silhouette with IoU >= 0.82 (card standing), or,
// in the first 0.36 s of the lift (61.44–61.80, the 61.36 key; no silhouette to check against), where the head and
// body alignment stays good (ECC >= 0.84; checked by overlay). Any other frame falls back to the painted rig.
import { OWLKEYS } from "./s19/owldata.js";
const OWLAFF = [
  [57.44, "57.48", 1.2500, -0.5861, -10.6, 0.6851, 0.8772, -1387.5],   // IoU 0.933
  [57.52, "57.56", 0.7676, -0.6358, 1001.5, 0.6084, 0.8244, -1135.6],   // IoU 0.943
  [57.60, "57.56", 0.8284, 0.6039, -155.5, -0.6345, 0.8294, 1424.8],   // IoU 0.908
  [57.72, "57.68", 0.8654, 0.5727, -208.2, -0.4798, 0.8292, 1013.2],   // IoU 0.908
  [57.76, "57.68", 0.5514, 0.8273, 144.0, -0.8308, 0.4964, 1898.9],   // IoU 0.855
  [58.04, "58.00", 0.9998, 0.0006, -0.2, -0.0000, 0.9998, 0.1],   // IoU 0.987
  [58.16, "58.12", 0.9557, 0.2081, -135.3, -0.1943, 0.9872, 267.9],   // IoU 0.896
  [58.20, "58.24", 1.0610, -0.1889, 131.5, 0.1402, 0.9921, -149.8],   // IoU 0.834
  [58.40, "58.36", 0.9836, 0.1324, -98.6, -0.2429, 1.0973, 199.7],   // IoU 0.852
  [58.44, "58.48", 0.9936, -0.1199, 103.1, 0.1636, 0.9177, -114.9],   // IoU 0.871
  [58.52, "58.48", 0.9835, 0.1092, -67.1, -0.1159, 1.0472, 88.9],   // IoU 0.957
  [58.56, "58.48", 0.9678, 0.2180, -129.7, -0.1948, 1.0557, 164.6],   // IoU 0.941
  [58.60, "58.72", 1.0022, -0.0253, 18.0, 0.0259, 0.9931, -21.1],   // IoU 0.974
  [58.64, "58.72", 1.0011, -0.0048, 2.8, 0.0042, 0.9993, -3.6],   // IoU 0.993
  [58.68, "58.72", 1.0001, 0.0002, -0.3, -0.0004, 1.0000, 0.4],   // IoU 0.998
  [58.76, "58.72", 1.0009, -0.0026, 1.2, 0.0018, 0.9996, -1.6],   // IoU 0.997
  [58.80, "58.72", 1.0012, -0.0094, 6.2, 0.0104, 0.9985, -9.8],   // IoU 0.986
  [58.84, "58.72", 1.0019, -0.0194, 13.4, 0.0216, 0.9965, -20.1],   // IoU 0.975
  [58.88, "59.00", 0.9959, 0.0433, -29.9, -0.0497, 1.0060, 47.7],   // IoU 0.968
  [58.92, "59.00", 0.9976, 0.0305, -21.6, -0.0344, 1.0037, 33.4],   // IoU 0.974
  [58.96, "59.00", 0.9994, 0.0139, -10.3, -0.0154, 1.0013, 15.2],   // IoU 0.987
  [59.04, "59.00", 0.9998, -0.0000, 0.2, 0.0002, 1.0000, -0.1],   // IoU 0.999
  [59.08, "59.00", 1.0011, -0.0129, 9.1, 0.0125, 0.9986, -12.2],   // IoU 0.984
  [59.12, "59.00", 1.0013, -0.0212, 15.4, 0.0206, 0.9971, -19.5],   // IoU 0.977
  [59.16, "59.00", 1.0014, -0.0289, 21.5, 0.0289, 0.9955, -27.0],   // IoU 0.969
  [59.20, "59.36", 1.0001, 0.0001, -0.2, -0.0001, 0.9999, 0.2],   // IoU 0.997
  [59.24, "59.36", 1.0000, 0.0001, -0.1, -0.0001, 0.9999, 0.1],   // IoU 0.998
  [59.28, "59.36", 1.0000, 0.0001, -0.1, -0.0001, 0.9999, 0.1],   // IoU 0.999
  [59.32, "59.36", 1.0001, 0.0001, -0.1, -0.0001, 1.0000, 0.1],   // IoU 0.999
  [59.40, "59.36", 1.0000, -0.0002, 0.1, 0.0001, 1.0000, -0.1],   // IoU 0.999
  [59.44, "59.36", 1.0001, -0.0000, -0.0, -0.0000, 1.0001, -0.0],   // IoU 0.999
  [59.48, "59.36", 1.0000, -0.0001, 0.1, -0.0000, 1.0001, -0.1],   // IoU 0.999
  [59.52, "59.60", 0.9545, 0.2082, -113.6, -0.2361, 1.0636, 215.1],   // IoU 0.865
  [59.56, "59.60", 0.9588, 0.1785, -95.7, -0.1980, 1.0618, 174.0],   // IoU 0.871
  [59.72, "59.80", 0.9584, 0.2447, -169.7, -0.1777, 0.9501, 237.7],   // IoU 0.876
  [59.76, "59.80", 0.9695, 0.2931, -203.6, -0.0708, 0.9062, 157.7],   // IoU 0.908
  [59.84, "59.92", 0.9523, 0.0645, -24.2, -0.0070, 0.9598, 51.8],   // IoU 0.918
  [59.88, "59.92", 0.9785, 0.0026, 6.6, -0.0091, 0.9836, 30.0],   // IoU 0.951
  [60.00, "60.04", 0.9794, -0.1592, 132.6, 0.1206, 0.9597, -101.8],   // IoU 0.879
  [60.08, "60.04", 0.9191, 0.1418, -8.7, -0.1170, 1.0462, 100.9],   // IoU 0.876
  [60.12, "60.16", 1.0053, -0.1008, 65.8, 0.1012, 0.9828, -102.7],   // IoU 0.917
  [60.28, "60.44", 0.9971, 0.0355, -24.2, -0.0317, 0.9998, 35.9],   // IoU 0.98
  [60.32, "60.44", 0.9989, 0.0115, -7.6, -0.0102, 0.9992, 12.1],   // IoU 0.991
  [60.36, "60.44", 1.0002, 0.0004, -0.6, -0.0000, 0.9993, 0.6],   // IoU 0.997
  [60.40, "60.44", 1.0014, -0.0020, 0.1, 0.0018, 0.9995, -1.6],   // IoU 0.997
  [60.48, "60.44", 0.9999, 0.0052, -3.9, -0.0062, 1.0003, 6.7],   // IoU 0.888
  [60.52, "60.56", 1.0000, -0.0000, 0.0, 0.0000, 1.0000, -0.0],   // IoU 0.999
  [60.60, "60.56", 0.9993, 0.0045, -2.6, -0.0059, 1.0000, 6.7],   // IoU 0.995
  [60.64, "60.56", 0.9987, 0.0082, -4.7, -0.0111, 1.0000, 12.5],   // IoU 0.992
  [60.68, "60.76", 1.0000, 0.0001, -0.1, 0.0001, 0.9999, -0.1],   // IoU 0.997
  [60.72, "60.76", 1.0000, 0.0001, -0.1, -0.0001, 1.0000, 0.1],   // IoU 0.999
  [60.80, "60.76", 1.0000, 0.0000, 0.0, 0.0001, 1.0000, -0.1],   // IoU 0.999
  [60.84, "60.76", 1.0000, 0.0000, 0.0, 0.0001, 1.0000, -0.1],   // IoU 0.998
  [60.88, "60.76", 1.0000, 0.0000, -0.0, -0.0002, 1.0000, 0.2],   // IoU 0.998
  [60.92, "61.00", 0.9979, 0.0165, -27.8, -0.0178, 0.9971, 25.2],   // IoU 0.843
  [60.96, "61.00", 0.9979, 0.0070, -12.9, -0.0115, 1.0004, 14.8],   // IoU 0.848
  [61.04, "61.08", 1.0035, 0.0172, -32.0, -0.0099, 1.0126, 2.9],   // IoU 0.877
  [61.20, "61.16", 0.9845, -0.0134, 47.6, 0.0112, 0.9842, -0.2],   // IoU 0.849
  [61.24, "61.16", 0.9702, -0.0150, 79.8, -0.0067, 0.9642, 37.0],   // IoU 0.825
  [61.28, "61.36", 0.9999, -0.0000, 0.1, 0.0001, 1.0001, -0.2],   // IoU 0.998
  [61.32, "61.36", 1.0000, 0.0000, -0.0, 0.0000, 1.0000, -0.0],   // IoU 0.999
  [61.40, "61.36", 1.0001, -0.0001, -0.0, -0.0001, 1.0001, 0.0],   // IoU 0.999
  [61.44, "61.36", 1.0018, 0.0019, -3.7, -0.0007, 1.0021, -0.8],   // lift, ECC
  [61.48, "61.36", 1.0145, 0.0303, -44.9, -0.0206, 1.0244, 7.6],   // lift, ECC
  [61.52, "61.36", 1.0166, 0.0781, -88.3, -0.0540, 1.0641, 19.9],   // lift, ECC
  [61.56, "61.36", 1.0164, 0.0782, -87.9, -0.0539, 1.0640, 19.8],   // lift, ECC
  [61.60, "61.36", 1.0222, 0.1140, -126.4, -0.0918, 1.0893, 50.2],   // lift, ECC
  [61.64, "61.36", 1.0561, 0.1172, -183.1, -0.1058, 1.1094, 51.7],   // lift, ECC
  [61.68, "61.36", 1.0727, 0.1440, -227.8, -0.1230, 1.1184, 63.2],   // lift, ECC
  [61.72, "61.36", 1.0820, 0.1616, -257.6, -0.1172, 1.1486, 33.1],   // lift, ECC
  [61.76, "61.36", 1.0829, 0.1763, -273.3, -0.1095, 1.1721, 5.3],   // lift, ECC
  [61.80, "61.36", 1.0956, 0.2163, -316.3, -0.1641, 1.1538, 85.4],   // lift, ECC
];
function owlState(t) {
  if (!TRACED) return { base: "P" };
  const key = t.toFixed(2);
  if (OWLKEYS[key]) return { base: key };
  for (const r of OWLAFF) if (Math.abs(t - r[0]) < 0.005) return { base: r[1], aff: r.slice(2, 8) };
  return { base: "P" };
}
function drawKey(ctx, key, alpha, aff = null, clipY = null) {
  const k = owlKey(key);
  ctx.save(); ctx.globalAlpha = alpha;
  if (aff) ctx.transform(aff[0], aff[3], aff[1], aff[4], aff[2], aff[5]);
  // once the floor goes dark (the lift) the key's patch of lit floor under the feet is cut away (key coordinates)
  if (clipY != null) { ctx.beginPath(); ctx.rect(k.x, k.y, k.canvas.width, clipY - k.y); ctx.clip(); }
  ctx.drawImage(k.canvas, k.x, k.y); ctx.restore();
}

export const shot = {
  draw(ctx, local, t) {
    t = Math.ceil(t * 25 - 1e-6) / 25;          // hold each 25 fps source frame
    const L = layers();
    ctx.drawImage(L.room, 0, 0, W, H);
    // floor spill from under the card, and the floor going dark once the card is lifted
    const fl = floorLight(t);
    if (TRACED) { if (fl > 0) { ctx.save(); ctx.globalCompositeOperation = "lighten"; ctx.globalAlpha = fl; ctx.drawImage(L.rays, 0, 0); ctx.restore(); } }
    else {
      if (fl > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.9 * fl; ctx.drawImage(L.rays, 0, 0); ctx.restore(); }
      if (fl < 1) { ctx.save(); ctx.globalAlpha = 0.85 * (1 - fl); ctx.fillStyle = "#000"; ctx.fillRect(0, 786, W, H - 786); ctx.restore(); }
    }
    // the floor right under the standing card is brighter than the traced rays carry (measured value residual +0.06–0.12
    // within 10 px of the edge, +0.03–0.05 to 50 px, 0 by 70 px, over x 1000–1700): a soft band along the edge
    if (TRACED && fl > 0) {
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = fl;
      ctx.translate(995, 772 + 4); ctx.rotate(Math.atan(0.04));
      const gb = ctx.createLinearGradient(0, 0, 0, 70);
      [[0, 0.09], [0.14, 0.07], [0.3, 0.045], [0.7, 0.035], [1, 0]].forEach(([o, v]) => gb.addColorStop(o, `rgba(255,255,255,${v})`));
      ctx.fillStyle = gb; ctx.beginPath(); ctx.rect(-10, 0, 715, 70); ctx.clip();
      ctx.fillRect(-10, 0, 715, 70);
      ctx.restore();
    }
    // the card: motion-blurred over half a frame when it moves; a soft glow round it
    const q0 = cardQuad(t), q1 = cardQuad(t - 0.006);
    const move = Math.max(...q0.map((p, i) => Math.hypot(p[0] - q1[i][0], p[1] - q1[i][1])));
    let card;
    if (move < 1.5) card = warpCardAt(t, W, H);
    else {
      const g = L.acc.getContext("2d"), N = Math.min(8, 3 + Math.round(move / 5));
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; g.clearRect(0, 0, W, H);
      g.globalCompositeOperation = "lighter"; g.globalAlpha = 1 / N;
      for (let k = 0; k < N; k++) g.drawImage(warpCardAt(t - 0.006 * k / (N - 1), W, H), 0, 0);   // a quarter-frame shutter: the source's card stays legible
      g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
      card = L.acc;
    }
    // the card's glow on the room, measured in value space round the standing card (0.31 at 10 px, 0.24 at 20, 0.18 at
    // 30, 0.12 at 45, 0.067 at 60, 0.023 at 80) and about the same round the lifted card at 62.96–63.08: fitted by the
    // card's silhouette blurred with sigma 43 px at 0.75 (added before the grade; the card is drawn over it)
    const gg = L.glow.getContext("2d"), m = cardMap(t), k = L.glow.width / W;
    gg.setTransform(1, 0, 0, 1, 0, 0); gg.clearRect(0, 0, L.glow.width, L.glow.height);
    gg.filter = `blur(${(43 * k).toFixed(2)}px)`; gg.fillStyle = "#fff"; gg.beginPath();
    CARD_OUTLINE.forEach(([u, v], i) => { const p = m(u, v); if (i) gg.lineTo(p[0] * k, p[1] * k); else gg.moveTo(p[0] * k, p[1] * k); });
    gg.closePath(); gg.fill(); gg.filter = "none";
    if (fl > 0) {
      // the lit floor under the standing card carries its own light (the traced 'lit' layer): no glow below the edge
      gg.save(); gg.globalCompositeOperation = "destination-out"; gg.globalAlpha = fl; gg.fillStyle = "#000"; gg.beginPath();
      gg.moveTo(0, (772 - 995 * 0.04 - 4) * k); gg.lineTo(W * k, (772 + (W - 995) * 0.04 - 4) * k); gg.lineTo(W * k, H * k); gg.lineTo(0, H * k); gg.closePath(); gg.fill(); gg.restore();
    }
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.75; ctx.drawImage(L.glow, 0, 0, W, H); ctx.restore();
    ctx.drawImage(card, 0, 0);
    // (fix pass 1 darkened the lifted card's lower band; re-measured with the new card table the source paper is not
    // shaded there — removing it lowered the blurred MAE at every frame 61.80–62.68 by 0.1–0.4)
    // the owl's shadow on the lit floor, then the owl, then the dust
    const os = owlState(t);
    // 61.48–61.68: the owl's drawings for these frames are cut out by GrabCut and carry no floor; its shadow on the
    // fading lit floor is the 61.36 key's floor part (below y 848) moved with the owl (OWLAFF) at the floor light
    if (TRACED && t > 61.46 && t < 61.70) {
      const r = OWLAFF.find((q) => Math.abs(q[0] - t) < 0.005 && q[1] === "61.36");
      if (r) { const k = owlKey("61.36"); const a = r.slice(2, 8);
        ctx.save(); ctx.globalAlpha = fl; ctx.transform(a[0], a[3], a[1], a[4], a[2], a[5]);
        ctx.beginPath(); ctx.rect(k.x, 848, k.canvas.width, k.y + k.canvas.height - 848); ctx.clip();
        ctx.drawImage(k.canvas, k.x, k.y); ctx.restore(); }
    }
    if (os.base === "P") {
      const st = owlShadow(t);
      if (st && fl > 0) {
        ctx.save(); ctx.globalAlpha = fl * st.a; ctx.filter = "blur(12px)"; ctx.fillStyle = "#000";
        ctx.beginPath(); ctx.ellipse(st.x, st.y, st.w, st.h, 0, 0, 7); ctx.fill(); ctx.restore();
      }
      drawOwlAt(ctx, t);
    } else drawKey(ctx, os.base, 1, os.aff, os.aff && os.base === "61.36" && t >= 61.46 ? 862 : null);
    drawDust(ctx, t);
  },
  release() { L = null; releaseTrace(); releaseCard(); releaseWarp(); releaseOwl(); },
};
