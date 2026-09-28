// s25 (100.48–110.52): the framed sōko page, the colour banner on top, cut to pieces — white crack lines all over
// it like shattered glass. Measured beats (source frames, 25 fps):
//   100.48  a white band (122 px, −23°) wipes down-right over the tail of s24 (speed lines, the charging owl)
//   100.56  one negative frame (the whole frame inverted, grey)
//   100.60–103.04  chaos: the owl dives from top-left to bottom-right leaving smoke; echo owls; white slash arcs
//          (100.64–101.32); a V-sign at the bottom right (101.52–101.80); a dash (101.84); it hovers mid-page
//          (101.88–102.60) inside a big slash ellipse round the page (102.16–102.72); echo owls converge; the burst
//          (102.64–102.96); paper chips everywhere. Crack network A (traced) the whole time.
//   103.00–103.04  pop: wings spread, scissors raised;  103.08 lands crouched in a dust cloud (eyes shut, smug);
//          crack network B (traced) from here; the page is cut off at y ≈ 912
//   103.44–103.56  rises to stand, hands on hips, scissors at the hips; eyes open 103.56
//   105.48–105.56  the left scissors grow into a huge pair held up in the wing; 105.60–105.84 it opens; 105.88 snip;
//          an eight-point glint on the blade 105.92–106.48
//   106.68–106.88  the shears swing out;  106.92–108.48  both wings up, the two pairs thrown and spinning above
//   108.08  the page squashes vertically (y' ≈ 0.982·y + 13; the room's glow stays put) and stays so
//   108.52  hands back on hips; the two scissors hang in the air by the headline to the end
// Every owl in the shot (the standing owl 103.00–110.48, the chaos owls, the echoes, the burst) is a TRACED drawing
// (s25/tr_*.js: outline rings, value iso-contours and ink centre-lines measured on one source frame each — vector
// data, no pixels), redrawn by s25/owlTrace.js, chosen per source frame and placed with its measured affine
// (s25/timeline.js). Smoke, dust, paper chips, slash arcs, the glint, the room glow and the page light are measured
// per frame too (timeline.js, smoke.js). The page floats by ≤ 2.5 px and squashes at 108.08 (CAM). The tracer
// scripts are in s25/trace/ (see its README).
import { drawFramedPage, sokoPageCanvas, HEADER, FRAMED, releaseSoko } from "../lib/sites.js";
import { hippieBannerCanvas, releaseHippie } from "../lib/hippie.js";
import { CRACKS_CHAOS, CRACKS_STAND } from "./s25/cracks.js";
import { chaos, chips, drawChips, bandY0, bandPath, BAND_W, releaseSprites } from "./s25/fx.js";
import { traceLayer, decXY } from "./s25/owlTrace.js";
import { SMOKE2, SMOKE2_F0 } from "./s25/smoke.js";
import { gv } from "../lib/owlInk.js";
import { TRACES } from "./s25/traces.js";
import { CAM, CAM_F0, SCHED, SCHED_F0, SPIN, SPIN_F0, SCX, SCX_F0, SMOKE, SMOKE_F0, GLOW, GLOW_F0, CHAOS_OWL, CHAOS_F0, ECHO, ECHO_F0, GAIN, GAIN_W, GAIN_H, SLASH, SLASH_F0, CHIPS, CHIPS_F0 } from "./s25/timeline.js";
import { rng } from "../lib/rng.js";

const W = 2206, H = 946;
let PAGE = null, STAGE = null, FX = null, TMP = null, LAYERS = null, SMK = null, SMKTEX = null;
const canvas = (w = W, h = H) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

// the page as it stands after s23: sōko page (his gaze down, as in all framed shots) with the colour strip in HEADER
function pageCanvas() {
  if (PAGE) return PAGE;
  const src = sokoPageCanvas({ gaze: "down" });
  const c = canvas(src.width, src.height), g = c.getContext("2d");
  g.drawImage(src, 0, 0);
  g.drawImage(hippieBannerCanvas(), HEADER.x, HEADER.y, HEADER.w, HEADER.h);
  // the measured light of the page in this shot (timeline.js GAIN, frame space): multiply every page pixel by it
  const id = g.getImageData(0, 0, c.width, c.height), d = id.data, k = src.width / 2206;
  const G = new Float32Array(GAIN_W * GAIN_H);
  for (let i = 0; i < G.length; i++) G[i] = 0.6 + (GAIN.charCodeAt(i) - 48) / 74 * 1.2;
  for (let y = 0, i = 0; y < c.height; y++) {
    const fy = (FRAMED.y + FRAMED.sy * y / k) / 8 - 0.5, y0 = Math.max(0, Math.min(GAIN_H - 2, Math.floor(fy))), v = Math.max(0, Math.min(1, fy - y0));
    for (let x = 0; x < c.width; x++, i += 4) {
      const fx = (FRAMED.x + FRAMED.sx * x / k) / 8 - 0.5, x0 = Math.max(0, Math.min(GAIN_W - 2, Math.floor(fx))), u = Math.max(0, Math.min(1, fx - x0));
      const j = y0 * GAIN_W + x0;
      const gg = (G[j] * (1 - u) + G[j + 1] * u) * (1 - v) + (G[j + GAIN_W] * (1 - u) + G[j + GAIN_W + 1] * u) * v;
      d[i] *= gg; d[i + 1] *= gg; d[i + 2] *= gg;
    }
  }
  g.putImageData(id, 0, 0);
  PAGE = c;
  return c;
}

// tone curve of the negative frame: [positive luminosity, output] (measured, see draw)
const NEG = [[0, 244], [36, 245], [52, 254], [84, 250], [100, 240], [108, 211], [116, 183], [124, 137], [140, 113], [148, 109], [156, 68], [172, 50], [188, 31], [212, 18], [236, 7], [255, 5]];
let NEGLUT = null;
function negLut() {
  if (NEGLUT) return NEGLUT;
  NEGLUT = new Uint8ClampedArray(256);
  for (let v = 0, k = 0; v < 256; v++) { while (k < NEG.length - 2 && NEG[k + 1][0] < v) k++; const [a, A] = NEG[k], [b, B] = NEG[k + 1]; NEGLUT[v] = A + (B - A) * Math.min(1, Math.max(0, (v - a) / (b - a))); }
  return NEGLUT;
}

// crack lines: median cross-profile measured at 104.56 over 2600 samples (post-grade, bg 22): 41 78 141 173 178 142 77 39
// at 1 px steps — a soft core ~4.5 px FWHM; three nested strokes reproduce it
const CRACK_PEN = [[6.5, "rgba(185,185,183,0.12)"], [4.6, "rgba(195,195,193,0.3)"], [2.8, "rgb(186,186,184)"]];
function drawCracks(g, segs) {
  g.save();
  g.lineCap = "round";
  for (const [w, col] of CRACK_PEN) {
    g.strokeStyle = col; g.lineWidth = w;
    g.beginPath();
    for (let i = 0; i < segs.length; i += 4) { g.moveTo(segs[i], segs[i + 1]); g.lineTo(segs[i + 2], segs[i + 3]); }
    g.stroke();
  }
  g.restore();
}

// ---------------------------------------------------------------- landing dust (103.08–104.20)
// The measured brightness the dust adds to the page, as gaussian blobs (timeline.js SMOKE), drawn at quarter
// resolution with a soft gaussian profile, broken up by a fixed seeded cloud texture that drifts outward (the wisps
// the blob fit leaves out), and added to the page under the owl.
const SQ4 = 4;
function smokeTexture() {
  if (SMKTEX) return SMKTEX;
  const w = Math.ceil(W / SQ4), h = Math.ceil(H / SQ4), c = canvas(w, h), g = c.getContext("2d"), r = rng(2577);
  g.fillStyle = "#b0b0b0"; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = "lighter";
  for (let i = 0; i < 420; i++) {
    const x = r() * w, y = r() * h, rad = 4 + r() * 22, a = 0.05 + r() * 0.12;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, `rgba(255,255,255,${a})`); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad);
  }
  g.globalCompositeOperation = "source-over";
  g.filter = "blur(2px)"; g.drawImage(c, 0, 0); g.filter = "none";
  SMKTEX = c;
  return c;
}
let TEXMEAN = 0;
// build the quarter-resolution smoke density for frame f into SMK (null if none): the landing dust (blobs) or the
// chaos smoke (measured density contours, s25/smoke.js), broken up by the drifting wisp texture
function smokeLayer(f) {
  const w = Math.ceil(W / SQ4), h = Math.ceil(H / SQ4);
  const blobs = f >= SMOKE_F0 ? SMOKE[f - SMOKE_F0] : null;
  const lev = f >= SMOKE2_F0 && f < SMOKE2_F0 + SMOKE2.length ? SMOKE2[f - SMOKE2_F0] : null;
  if (!(blobs && blobs.length) && !lev) return null;
  if (!SMK) SMK = canvas(w, h);
  const sg = SMK.getContext("2d");
  sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = "source-over"; sg.filter = "none"; sg.fillStyle = "#000"; sg.fillRect(0, 0, w, h);
  if (lev) {
    const D = decodeSmoke(f);
    sg.save(); sg.scale(1 / SQ4, 1 / SQ4);
    for (const L of D) {
      if (!L.p.length) continue;
      sg.fillStyle = gv(L.v); sg.beginPath();
      for (const r of L.p) { sg.moveTo(r[0], r[1]); for (let i = 2; i < r.length; i += 2) sg.lineTo(r[i], r[i + 1]); sg.closePath(); }
      sg.fill("nonzero");
    }
    sg.restore();
    // soften the contour steps (σ ≈ 6 px full res, as measured)
    const c2 = smkTmp(w, h), g2 = c2.getContext("2d");
    g2.globalCompositeOperation = "copy"; g2.filter = "blur(1.6px)"; g2.drawImage(SMK, 0, 0); g2.filter = "none";
    sg.globalCompositeOperation = "copy"; sg.drawImage(c2, 0, 0); sg.globalCompositeOperation = "source-over";
  } else {
    sg.globalCompositeOperation = "lighter";
    for (let i = 0; i < blobs.length; i += 5) {
      const [x, y, sx, sy, a] = blobs.slice(i, i + 5);
      sg.save(); sg.translate(x / SQ4, y / SQ4); sg.scale(sx / SQ4, sy / SQ4);
      const gr = sg.createRadialGradient(0, 0, 0, 0, 0, 3);
      for (let k = 0; k <= 12; k++) { const r = k / 4; gr.addColorStop(k / 12, `rgba(255,255,255,${Math.min(1, a * Math.exp(-0.5 * r * r))})`); }
      sg.fillStyle = gr; sg.fillRect(-3, -3, 6, 6);
      sg.restore();
    }
  }
  // wisps: multiply by the cloud texture, drifting slowly; the texture's mean is divided back out when adding
  const u = (f - 2512) / 25;
  sg.globalCompositeOperation = "multiply";
  sg.drawImage(smokeTexture(), -u * 14, -u * 5, w * (1 + u * 0.03), h * (1 + u * 0.03));
  sg.globalCompositeOperation = "source-over";
  return SMK;
}
let SMKTMP = null;
function smkTmp(w, h) { if (!SMKTMP) SMKTMP = canvas(w, h); return SMKTMP; }
// add the smoke layer (lighter) to g, with the texture's mean compensated (1/mean ≈ 1.2: one full + one partial pass)
function addSmoke(g, L) {
  if (!L) return;
  if (!TEXMEAN) {
    const t = smokeTexture(), d = t.getContext("2d").getImageData(0, 0, t.width, t.height).data;
    let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i]; TEXMEAN = s / (d.length / 4) / 255;
  }
  const k = 1 / TEXMEAN;
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "lighter"; g.imageSmoothingQuality = "medium";
  g.drawImage(L, 0, 0, L.width * SQ4, L.height * SQ4);
  if (k > 1) { g.globalAlpha = Math.min(1, k - 1); g.drawImage(L, 0, 0, L.width * SQ4, L.height * SQ4); }
  g.restore();
}
let SMOKE2D = null;
function decodeSmoke(f) {
  if (!SMOKE2D) SMOKE2D = new Map();
  if (!SMOKE2D.has(f)) SMOKE2D.set(f, SMOKE2[f - SMOKE2_F0].map((L) => ({ v: L.v, p: L.p ? L.p.split(" ").map(decXY) : [] })));
  return SMOKE2D.get(f);
}

// ---------------------------------------------------------------- the traced standing owl
function layer(key) {
  if (!LAYERS) LAYERS = new Map();
  // "name~s": a softened copy (the motion-smeared echo owls)
  if (!LAYERS.has(key)) LAYERS.set(key, key.endsWith("~s") ? traceLayer(TRACES[key.slice(0, -2)], { soft: 2.5 }) : traceLayer(TRACES[key]));
  return LAYERS.get(key);
}
function blit(g, key, m) {
  const L = layer(key);
  g.save();
  if (m) g.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
  g.drawImage(L.canvas, L.x, L.y);
  g.restore();
}
// the two thrown / floating pairs: the traced floating drawings (109.40), placed by their pivot
const PIV = { fscL: [755, 350], fscR: [1376, 334] };
function scissorsAt(g, key, x, y, th) {
  const [px, py] = PIV[key], c = Math.cos(th), s = Math.sin(th);
  // translate(x,y) · rotate(th) · translate(-px,-py)
  blit(g, key, [c, s, -s, c, x - (c * px - s * py), y - (s * px + c * py)]);
}
// the glint on the big blade (105.92–106.48): an eight-point star, centre (598, 670); its reach per frame measured
// against the clean 106.60 frame (left spike): 42 67 80 80 60 80 80 80 80 69 64 54 43 26 13 px; the downward spike is
// ~1.35x longer (reaches y 778), the diagonals ~0.4x
const GLINT_F0 = 2648, GLINT = [42, 67, 80, 80, 60, 80, 80, 80, 80, 69, 64, 54, 43, 26, 13];
function sparkle(g, x, y, R) {
  g.save(); g.translate(x, y);
  const spike = (ang, len, w) => {
    g.save(); g.rotate(ang);
    g.beginPath(); g.moveTo(0, -w); g.lineTo(len * 0.3, -w * 0.45); g.lineTo(len, 0); g.lineTo(len * 0.3, w * 0.45); g.lineTo(0, w); g.closePath(); g.fill();
    g.restore();
  };
  g.fillStyle = "rgba(250,250,247,0.97)";
  for (const [a, k] of [[-Math.PI / 2, 1.05], [Math.PI, 1], [0, 1.08], [Math.PI / 2, 1.45]]) spike(a, R * k, Math.max(2.5, R * 0.075));
  for (let i = 0; i < 4; i++) spike(Math.PI / 4 + i * Math.PI / 2, R * 0.45, Math.max(1.5, R * 0.05));
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.3);
  gr.addColorStop(0, "rgba(255,255,252,1)"); gr.addColorStop(0.5, "rgba(250,250,247,0.6)"); gr.addColorStop(1, "rgba(250,250,247,0)");
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R * 0.3, 0, Math.PI * 2); g.fill();
  g.restore();
}

function paintStanding(g, f, t) {
  if (f <= 2575) {
    // 103.00: the owl bursts out of the smear, higher and smaller: the 103.04 drawing under the affine measured on
    // this frame (rotation/scale-searched template match + ECC, cc 0.84)
    blit(g, "pop", [0.9147, 0.0024, -0.0101, 0.8988, 87.16, -135.77]);
    return;
  }
  const row = SCHED[Math.min(SCHED.length - 1, f - SCHED_F0)];
  const key = row[0];
  if (key !== "pop") {
    // the owl's shadow on the page round its feet (the source is dark there: 46–48 vs the lit page's ~95)
    const gr = g.createRadialGradient(1085, 850, 10, 1085, 850, 330);
    gr.addColorStop(0, "rgba(0,0,0,0.85)"); gr.addColorStop(0.55, "rgba(0,0,0,0.6)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.save(); g.translate(1085, 850); g.scale(1, 0.4); g.translate(-1085, -850);
    g.fillStyle = gr; g.fillRect(740, 500, 700, 700);
    g.restore();
  }
  if (f >= SMOKE_F0) addSmoke(g, smokeLayer(f));
  blit(g, key, row.slice(1));
  // landing, rise and settle: the held scissors as their own traced layers on their own measured tracks
  if (f >= SCX_F0 && f < SCX_F0 + SCX.length) for (const [k, ...m] of SCX[f - SCX_F0]) blit(g, k, m);
  if (f >= SPIN_F0 && f < SPIN_F0 + SPIN.length) {
    const [lx, ly, lr, rx, ry, rr] = SPIN[f - SPIN_F0];
    scissorsAt(g, "fscL", lx, ly, lr);
    scissorsAt(g, "fscR", rx, ry, rr);
  } else if (f >= SPIN_F0 + SPIN.length) {
    blit(g, "fscL", null);
    blit(g, "fscR", null);
  }
  if (f >= GLINT_F0 && f < GLINT_F0 + GLINT.length) sparkle(g, 599, 674, GLINT[f - GLINT_F0]);
}

export const shot = {
  draw(ctx, local, t) {
    // the source animates on 25 fps frames here (every beat is a frame cut): snap to the frame so the drawing is
    // exactly the source frame's state at any sample time
    // frame index: exact at the render's k/25 sample times; a time just before a frame (the snapshot tool seeks on a
    // 1/30 s grid, up to 0.033 s early) still shows that frame, so compares pair with the right source frame
    const f = Math.min(2762, Math.ceil(t * 25 - 1e-3));
    t = f / 25;
    if (!STAGE) { STAGE = canvas(); FX = canvas(); }
    const sg = STAGE.getContext("2d"), fg = FX.getContext("2d");
    const stand = t >= 103.0;
    // chaos layer (owls, smoke, slashes, chips) in frame px
    fg.setTransform(1, 0, 0, 1, 0, 0); fg.clearRect(0, 0, W, H);
    const chipRow = f >= CHIPS_F0 && f < CHIPS_F0 + CHIPS.length ? CHIPS[f - CHIPS_F0] : null;
    if (f >= 2566 && f <= 2574) {
      // the burst (102.64–102.96): the whole moving layer (converging owls, smear, slash) is a traced drawing per frame,
      // with the measured paper chips over it
      blit(fg, "b" + f, null);
      if (chipRow) drawChips(fg, chipRow);
    } else if (!stand) chaos(fg, t, (g) => {
      // the main owl in the chaos: traced drawings (dive, V-sign, crouch, hover) on their per-frame measured tracks
      const er = f >= ECHO_F0 ? ECHO[f - ECHO_F0] : null;
      if (er) for (const [k, ...m] of er) blit(g, k, m);
      const row = f >= CHAOS_F0 ? CHAOS_OWL[f - CHAOS_F0] : null;
      if (!row) return false;
      blit(g, row[0], row.slice(1));
      return true;
    }, f >= SMOKE2_F0 && f < SMOKE2_F0 + SMOKE2.length, (g, e) => {
      // the converging echoes (102.38–102.74): the traced owls (the top-right one flying left, the dive flying
      // right), softened, on the measured blob paths; sized to the source's ~290 px span
      const key = e.flip ? "eTR" : "dive", T = TRACES[key], [x0, y0, x1, y1] = T.box;
      const k = (e.flip ? 0.6 : 0.56) * e.s / 0.46, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const c = Math.cos(e.rot) * k, sn = Math.sin(e.rot) * k;
      g.save(); g.globalAlpha *= Math.min(1, e.alpha * 1.5);
      blit(g, key + "~s", [c, sn, -sn, c, e.x - (c * cx - sn * cy), e.y - (sn * cx + c * cy)]);
      g.restore();
      return true;
    }, f >= SLASH_F0 && f < SLASH_F0 + SLASH.length ? SLASH[f - SLASH_F0] : null, chipRow);
    else if (t < 103.7) { if (chipRow) drawChips(fg, chipRow); }
    // the framed page; everything on the screen goes in `over` so it lights the room like the source
    sg.setTransform(1, 0, 0, 1, 0, 0);
    const SL = !stand ? smokeLayer(f) : null;
    const glow = GLOW[Math.max(0, Math.min(GLOW.length - 1, f - GLOW_F0))];
    drawFramedPage(sg, pageCanvas(), {
      glow,
      over(g) {
        if (t >= 103.08) { g.fillStyle = "#000"; g.fillRect(140, 913, 1890, 40); }
        drawCracks(g, t >= 103.08 ? CRACKS_STAND : CRACKS_CHAOS);
        if (stand) paintStanding(g, f, t);
        else addSmoke(g, SL);
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
      // the tail of s24 below the band (speed lines, the charging owl): traced from 100.48 / 100.52
      tg.fillStyle = "#000"; tg.fillRect(0, 0, W, H);
      blit(tg, f <= 2512 ? "rem48" : "rem52", null);
      sg.save();
      sg.beginPath(); sg.moveTo(-10, y0 + BAND_W + 4); sg.lineTo(W + 10, y0 + BAND_W + 4 - 0.4275 * (W + 20)); sg.lineTo(W + 10, H + 2000); sg.lineTo(-10, H + 2000); sg.closePath(); sg.clip();
      sg.drawImage(TMP, 0, 0);
      sg.restore();
      sg.fillStyle = "rgb(246,246,242)"; sg.beginPath(); bandPath(sg, y0, y0 + BAND_W); sg.fill();
    }

    // blit the stage through the measured camera (drift ≤ 2.5 px; the 108.08 squash)
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (f >= CAM_F0) {
      // the page (the screen and its border) floats and squashes with the measured affine; the room's glow stays put
      // (measured at 108.08+: the glow above the screen keeps its rows while the screen's top edge drops 10 px,
      // leaving a dark gap)
      const m = CAM[Math.min(CAM.length - 1, f - CAM_F0)], S = FRAMED.screen;
      ctx.drawImage(STAGE, 0, 0);
      ctx.fillStyle = "#000"; ctx.fillRect(S.x0 - 2, S.y0 - 2, S.x1 - S.x0 + 4, H - S.y0 + 2);
      ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
      ctx.beginPath(); ctx.rect(S.x0 - 2, S.y0 - 2, S.x1 - S.x0 + 4, H - S.y0 + 2); ctx.clip();
    }
    ctx.drawImage(STAGE, 0, 0);
    ctx.restore();

    // the negative frame (100.56): a hard, contrasty negative of the stage — a tone curve measured on the source
    // frame (its ungraded grey against our positive frame's luminosity, medians per 8 levels)
    if (t >= 100.56 && t < 100.6) {
      const id = ctx.getImageData(0, 0, W, H), d = id.data, lut = negLut();
      for (let i = 0; i < d.length; i += 4) { const v = lut[Math.round(0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2])]; d[i] = d[i + 1] = d[i + 2] = v; }
      ctx.putImageData(id, 0, 0);
    }
  },
  release() { PAGE = null; STAGE = null; FX = null; TMP = null; LAYERS = null; SMK = null; SMKTEX = null; SMKTMP = null; SMOKE2D = null; TEXMEAN = 0; releaseSprites(); releaseSoko(); releaseHippie(); },
};
