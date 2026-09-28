// s25 (100.48–110.52): the framed sōko page, the colour banner on top, cut to pieces — white crack lines all over
// it like shattered glass. Measured beats (source frames, 25 fps):
//   100.48  a white band (122 px, −23°) wipes down-right over the tail of s24 (speed lines, the charging owl)
//   100.56  one negative frame (the whole frame inverted, grey)
//   100.60–103.04  chaos: the owl dives from top-left to bottom-right leaving smoke; echo owls; two white slash
//          ellipses (100.62–101.3); a V-sign at the bottom right (101.52–101.80); it zips up to the centre and hovers
//          (101.92–102.64) inside a big slash ellipse round the page (102.14–102.72); echo owls converge; a blurred
//          burst (102.64–103.0); paper chips everywhere. Crack network A (traced) the whole time.
//   103.04  pop: wings spread, scissors raised;  103.08 lands crouched in a dust cloud (eyes shut, smug);
//          crack network B (traced) from here; the page is cut off at y ≈ 912
//   103.40–103.56  rises to stand, hands on hips, scissors at the hips; eyes open 103.56
//   105.48–105.60  the left scissors grow into a huge pair held up at the shoulder; a sparkle on the blade ~105.9
//   106.84–106.88  swaps back, wings out;  106.92–108.48  both wings up, the scissors spin (per-frame poses traced)
//   108.08  the whole frame squashes vertically (y' = 790 + 0.9836·(y − 790)) and stays so
//   108.52  hands back on hips; the two scissors hang in the air by the headline to the end
// Camera: locked (camtrack s = 1.000 ±0.0003, drift < 1.5 px) apart from the 108.08 squash.
import { drawFramedPage, sokoPageCanvas, HEADER, FRAMED, releaseSoko } from "../lib/sites.js";
import { hippieBannerCanvas, releaseHippie } from "../lib/hippie.js";
import { CRACKS_CHAOS, CRACKS_STAND } from "./s25/cracks.js";
import { drawScissors } from "./s25/scissors.js";
import { POSES } from "./s25/poses.js";
import { paintOwl } from "./s25/owl.js";
import { chaos, chips, dust, s24Remnant, bandY0, bandPath, BAND_W, releaseSprites } from "./s25/fx.js";
import { clamp, lerp } from "../lib/rng.js";

const W = 2206, H = 946;
let PAGE = null, OWLS = null, STAGE = null, FX = null, TMP = null;
const canvas = (w = W, h = H) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

// the page as it stands after s23: sōko page (his gaze down, as in all framed shots) with the colour strip in HEADER
function pageCanvas() {
  if (PAGE) return PAGE;
  const src = sokoPageCanvas({ gaze: "down" });
  const c = canvas(src.width, src.height), g = c.getContext("2d");
  g.drawImage(src, 0, 0);
  g.drawImage(hippieBannerCanvas(), HEADER.x, HEADER.y, HEADER.w, HEADER.h);
  PAGE = c;
  return c;
}

// crack lines: bright core ~3 px FWHM, peak ~215/255 post-grade (median cross-profile measured at 104.6)
function drawCracks(g, segs) {
  g.save();
  g.lineCap = "round";
  for (const [w, col] of [[4.2, "rgba(200,200,198,0.35)"], [2.4, "rgb(222,222,220)"]]) {
    g.strokeStyle = col; g.lineWidth = w;
    g.beginPath();
    for (let i = 0; i < segs.length; i += 4) { g.moveTo(segs[i], segs[i + 1]); g.lineTo(segs[i + 2], segs[i + 3]); }
    g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- the standing owl
function owlCanvas(key, eyes) {
  if (!OWLS) OWLS = new Map();
  const k = key + ":" + eyes;
  if (!OWLS.has(k)) {
    const c = canvas();
    paintOwl(c.getContext("2d"), POSES[key], { eyes });
    OWLS.set(k, c);
  }
  return OWLS.get(k);
}

// scissors per standing pose (frame px, measured; see fidelity/s25.md)
const SC = {
  pop: [{ x: 872, y: 392, ang: -1.2, L: 112, open: 0.5 }, { x: 1318, y: 440, ang: -1.8, L: 112, open: 0.5 }],
  crouch: [{ x: 842, y: 800, ang: 2.8, L: 150, open: 0.12 }, { x: 1395, y: 818, ang: 0.08, L: 135, open: 0.12 }],
  hips1: [{ x: 831, y: 748, ang: 2.39, L: 147, open: 0.47 }, { x: 1342, y: 747, ang: 0.79, L: 145, open: 0.45 }],
  // the huge pair (measured at 106.2): pivot (781, 602), blade tip (525, 820), ~130 px across the closed blades,
  // two big loops ~0.29·L behind the pivot, largely hidden in the wing
  big: [{ x: 781, y: 602, ang: 2.436, L: 336, open: 0.03, w: 0.2, blunt: true, loopD: 0.29, loopOff: 0.05, loopRx: 0.27, loopRy: 0.15, loopAng: 0.3, ring: 0.045, lw: 3 },
    { x: 1342, y: 747, ang: 0.79, L: 145, open: 0.45 }],
  swing: [{ x: 850, y: 640, ang: 2.2, L: 150, open: 0.2 }, { x: 1342, y: 747, ang: 0.79, L: 145, open: 0.45 }],
  wide: [{ x: 700, y: 420, ang: 3.0, L: 160, open: 0.2 }, { x: 1440, y: 395, ang: 0.1, L: 160, open: 0.25 }],
  float: [{ x: 778, y: 348, ang: 2.946, L: 163, open: 0.25 }, { x: 1376, y: 334, ang: 0.56, L: 167, open: 0.34 }],
};
// the spinning scissors while both wings are up (106.92–108.48): per-frame [t, Lx, Ly, Lang, Lopen, Rx, Ry, Rang, Ropen]
// = the centre of each pair and its blade direction, traced per frame (null = frame not measurable; filled below)
const SPIN = [
  [106.92, 778, 355, -0.69, 0.24, 1391, 345, 0.32, 0.34], [106.96, 767, 370, -0.36, 0.34, 1399, 345, -2.08, 0.3],
  [107.0, 761, 335, -2.66, 0.32, 1406, 332, -1.2, 0.3], [107.04, 754, 329, 1.55, 0.37, null], [107.08, null, 1397, 336, 0.46, 0.29],
  [107.12, 763, 341, -2.66, 0.08, 1410, 316, 1.49, 0.37], [107.16, 764, 327, -1.41, 0.37, 1399, 309, -0.77, 0.08],
  [107.2, null, 1381, 335, -0.01, 0.29], [107.24, 772, 336, 0.38, 0.08, null], [107.28, null, 1400, 322, 1.63, 0.39],
  [107.32, 757, 335, -0.94, 0.38, 1397, 335, -0.42, 0.3], [107.36, null, 1388, 338, 0.24, 0.34], [107.4, 770, 334, -2.69, 0.34, 1399, 334, 1.15, 0.3],
  [107.44, null, 1403, 335, 1.95, 0.27], [107.48, 763, 341, -0.81, 0.33, null], [107.52, null, 1397, 345, 0.68, 0.29],
  [107.56, null, 1408, 330, 1.45, 0.29], [107.6, 764, 340, -1.03, 0.29, 1400, 335, -0.4, 0.23], [107.64, null, 1389, 338, 0.23, 0.34],
  [107.68, 762, 351, -2.62, 0.08, 1396, 335, 1.15, 0.31], [107.72, 759, 327, 1.49, 0.32, 1404, 336, 1.79, 0.08], [107.76, null, null],
  [107.8, null, null], [107.84, 773, 325, 0.17, 0.08, 1394, 346, 0.49, 0.3], [107.88, null, 1392, 334, 1.23, 0.33],
  [107.92, null, 1405, 328, -1.13, 0.45], [107.96, 766, 353, -0.91, 0.35, 1389, 343, -0.34, 0.32], [108.0, 776, 357, -0.62, 0.34, 1391, 344, 0.24, 0.36],
  [108.04, 776, 361, -0.54, 0.33, 1398, 347, 0.57, 0.34], [108.08, 773, 364, -0.56, 0.31, 1400, 353, 0.61, 0.33],
  [108.12, 766, 334, -1.4, 0.38, 1417, 330, -1.11, 0.12], [108.16, 762, 344, 0.53, 0.08, null], [108.2, 759, 354, 2.72, 0.27, null],
  [108.24, 766, 348, -1.06, 0.3, null], [108.28, null, null], [108.32, 758, 355, 2.59, 0.31, 1401, 342, 1.17, 0.32],
  [108.36, 766, 334, -1.39, 0.38, 1408, 325, -1.14, 0.38], [108.4, 775, 346, 0.44, 0.15, 1390, 352, -0.23, 0.29], [108.44, null, null],
  [108.48, 765, 349, -1.05, 0.3, 1400, 338, 1.54, 0.45],
];
// expand rows (a `null` stands for a missing 4-tuple) and fill the gaps: an unmeasured frame keeps spinning on from
// the last measured one (+2.2 rad a frame, the typical measured step)
const SPIN_ROWS = (() => {
  const rows = [];
  let last = [[767, 340, 0, 0.3], [1398, 337, 0, 0.3]];
  for (const r of SPIN) {
    const out = [r[0]]; let k = 1;
    for (let side = 0; side < 2; side++) {
      let v;
      if (r[k] === null) { v = [last[side][0], last[side][1], last[side][2] + 2.2 * (side ? -1 : 1), last[side][3]]; k += 1; }
      else { v = r.slice(k, k + 4); k += 4; }
      last[side] = v; out.push(v);
    }
    rows.push(out);
  }
  return rows;
})();
function spinAt(t) {
  let i = 0; while (i < SPIN_ROWS.length - 1 && SPIN_ROWS[i + 1][0] <= t + 1e-6) i++;
  const [, l, r] = SPIN_ROWS[i];
  // centre → pivot: the pair's midpoint sits 0.15·L ahead of the pivot along the blades
  const piv = ([cx, cy, a, op]) => ({ x: cx - Math.cos(a) * 0.15 * 172, y: cy - Math.sin(a) * 0.15 * 172, ang: a, L: 172, open: op });
  return [piv(l), piv(r)];
}

// which owl drawing, eyes, scissors set, and extra transform at film time t (t >= 103.04)
function standState(t) {
  // 103.00: the owl bursts out of the smear 196 px higher (bright-blob centroid 363 vs 559) and ~7 % smaller
  if (t < 103.04) return { key: "pop", eyes: "open", sc: SC.pop, lift: [1070, 444, 0.93, -196] };
  if (t < 103.08) return { key: "pop", eyes: "open", sc: SC.pop };
  if (t < 103.4) return { key: "crouch", eyes: "closed", sc: SC.crouch };
  if (t < 103.56) {
    // rising: the crouch at 103.40, then the standing drawing squashed about the feet so the head follows the
    // measured head track (y 579 → 550 → 518 → 489 → 444)
    const hy = t < 103.44 ? 579 : t < 103.48 ? 550 : t < 103.52 ? 518 : 489;
    if (t < 103.44) return { key: "crouch", eyes: "closed", sc: SC.crouch, dy: hy - 590 };
    return { key: "hips1", eyes: "closed", sc: SC.hips1, squash: (890 - hy) / (890 - 440) };
  }
  if (t < 105.52) return { key: "hips1", eyes: "open", sc: SC.hips1 };
  if (t < 105.56) {
    // one in-between frame: the left pair swells toward the huge pair
    const u = 0.6, a = SC.hips1[0], b = SC.big[0];
    const m = { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), ang: lerp(a.ang, b.ang, u), L: lerp(a.L, b.L, u), open: 0.3, w: lerp(0.12, 0.2, u), blunt: true, loopD: lerp(0.49, 0.29, u), loopOff: lerp(0.2, 0.05, u), loopRx: lerp(0.21, 0.27, u), loopRy: lerp(0.14, 0.15, u), ring: lerp(0.07, 0.045, u) };
    return { key: "bigsc", eyes: "open", sc: [m, SC.hips1[1]] };
  }
  // 105.56–105.84 the huge pair held open (blades ~25° apart); 105.88 snip, closed; the glint 105.92–106.44
  if (t < 105.88) return { key: "bigsc", eyes: "open", sc: [{ ...SC.big[0], x: 788, y: 600, ang: 2.36, open: t < 105.76 ? 0.16 : 0.34 }, SC.big[1]] };
  if (t < 106.84) return { key: "bigsc", eyes: "open", sc: SC.big, sparkle: t >= 105.92 && t < 106.46 };
  if (t < 106.88) return { key: "bigsc", eyes: "open", sc: SC.swing };
  if (t < 106.92) return { key: "raise", eyes: "open", sc: SC.wide };
  if (t < 108.52) return { key: "raise", eyes: "open", sc: spinAt(t) };
  return { key: "hips2", eyes: "open", sc: SC.float, post: true };
}

// a four-point sparkle (the glint on the big blade)
function sparkle(g, x, y, R) {
  g.save(); g.translate(x, y);
  g.fillStyle = "rgba(250,250,246,0.95)";
  g.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2, r = i % 2 ? R * 0.12 : (i % 4 === 0 ? R : R * 0.7); g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  g.closePath(); g.fill();
  g.restore();
}

// the 108.08 squash (whole frame, about y = 790) and its inverse for things measured after it
const SQ = 0.9836, SQY = 790;
const squashed = (t) => t >= 108.08;

function paintStanding(g, t) {
  const st = standState(t);
  const L = owlCanvas(st.key, st.eyes);
  g.save();
  if (st.post) { g.translate(0, SQY); g.scale(1, 1 / SQ); g.translate(0, -SQY); }
  if (st.dy) g.translate(0, st.dy);
  if (st.lift) { const [lx, ly, ls, dy] = st.lift; g.translate(lx, ly + dy); g.scale(ls, ls); g.translate(-lx, -ly); }
  if (st.squash) { g.translate(0, 890); g.scale(1, st.squash); g.translate(0, -890); }
  if (st.key !== "pop") {
    // the owl's shadow on the page round its feet (the source is dark there: 46–48 vs the lit page's ~95)
    const gr = g.createRadialGradient(1085, 850, 10, 1085, 850, 330);
    gr.addColorStop(0, "rgba(0,0,0,0.85)"); gr.addColorStop(0.55, "rgba(0,0,0,0.6)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.save(); g.translate(1085, 850); g.scale(1, 0.4); g.translate(-1085, -850);
    g.fillStyle = gr; g.fillRect(740, 500, 700, 700);
    g.restore();
  }
  // held scissors: at the hips and at the shoulder the loops sit inside the wing (drawn behind the owl); thrown or
  // raised pairs are drawn in front
  const behind = /^(crouch|hips1|hips2)$/.test(st.key) && !st.post;
  if (behind) for (const s of st.sc) drawScissors(g, s);
  else if (st.key === "bigsc") drawScissors(g, st.sc[1]);   // the small pair stays at the hip, behind the wing
  g.drawImage(L, 0, 0);
  if (!behind) for (const s of st.key === "bigsc" ? [st.sc[0]] : st.sc) drawScissors(g, s);
  if (st.sparkle) { const k = Math.min(1, (t - 105.9) / 0.1, (106.46 - t) / 0.2); g.save(); g.globalAlpha = Math.max(0, k); sparkle(g, 609, 672, 80); g.restore(); }
  g.restore();
}

export const shot = {
  draw(ctx, local, t) {
    // the source animates on 25 fps frames here (every beat is a frame cut): snap to the frame so the drawing is
    // exactly the source frame's state at any sample time
    t = Math.round(t * 25 + 1e-6) / 25;
    if (!STAGE) { STAGE = canvas(); FX = canvas(); }
    const sg = STAGE.getContext("2d"), fg = FX.getContext("2d");
    const stand = t >= 103.0;
    // chaos layer (owls, smoke, slashes, chips) in frame px
    fg.setTransform(1, 0, 0, 1, 0, 0); fg.clearRect(0, 0, W, H);
    if (!stand) chaos(fg, t);
    else if (t < 103.7) { dust(fg, t); chips(fg, t); }
    // the framed page; everything on the screen goes in `over` so it lights the room like the source
    sg.setTransform(1, 0, 0, 1, 0, 0);
    drawFramedPage(sg, pageCanvas(), {
      over(g) {
        if (t >= 103.08) { g.fillStyle = "#000"; g.fillRect(140, 913, 1890, 40); }
        drawCracks(g, t >= 103.08 ? CRACKS_STAND : CRACKS_CHAOS);
        if (stand) paintStanding(g, t);
        g.drawImage(FX, 0, 0);
      },
    });
    // the chaos layer again outside the screen (the owl and chips fly past the frame's edge)
    sg.save();
    const S = FRAMED.screen;
    sg.beginPath(); sg.rect(0, 0, W, H); sg.rect(S.x0, S.y0, S.x1 - S.x0, S.y1 - S.y0); sg.clip("evenodd");
    sg.drawImage(FX, 0, 0);
    sg.restore();

    // opening wipe over the tail of s24
    if (t < 100.56) {
      const y0 = bandY0(t);
      if (!TMP) TMP = canvas();
      const tg = TMP.getContext("2d");
      tg.setTransform(1, 0, 0, 1, 0, 0);
      s24Remnant(tg, t);
      sg.save();
      sg.beginPath(); sg.moveTo(-10, y0 + BAND_W + 4); sg.lineTo(W + 10, y0 + BAND_W + 4 - 0.4275 * (W + 20)); sg.lineTo(W + 10, H + 2000); sg.lineTo(-10, H + 2000); sg.closePath(); sg.clip();
      sg.drawImage(TMP, 0, 0);
      sg.restore();
      sg.fillStyle = "rgb(246,246,242)"; sg.beginPath(); bandPath(sg, y0, y0 + BAND_W); sg.fill();
    }

    // blit the stage (with the 108.08 squash)
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (squashed(t)) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); ctx.translate(0, SQY); ctx.scale(1, SQ); ctx.translate(0, -SQY); }
    ctx.drawImage(STAGE, 0, 0);
    ctx.restore();

    // the negative frame
    if (t >= 100.56 && t < 100.6) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "saturation"; ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "difference"; ctx.fillStyle = "#f0f0f0"; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  },
  release() { PAGE = null; OWLS = null; STAGE = null; FX = null; TMP = null; releaseSprites(); releaseSoko(); releaseHippie(); },
};
