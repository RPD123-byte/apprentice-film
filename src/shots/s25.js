// s25 (100.48–110.52): the framed sōko page, the colour strip on top, cut to pieces — white crack lines all over it
// like shattered glass — and the owl. Beats (source frames, 25 fps; measured):
//   100.48  a white band (122 px, −23°) wipes down-right over the tail of s24 (speed lines, the charging owl)
//   100.56  one negative frame
//   100.60–103.04  chaos: the owl dives from the top left to the bottom right trailing smoke; echo owls; white slash
//          arcs; a V-sign at the bottom right (101.52–101.80); a dash (101.84); it hovers mid-page (101.88–102.60)
//          inside a big slash ellipse; echo owls converge; the burst (102.64–102.96); paper chips everywhere
//   103.00  pop: wings spread, scissors raised;  103.08 it lands crouched in a dust cloud (eyes shut, smug)
//   103.44–103.56  rises to stand, hands on hips, scissors at the hips; eyes open 103.56
//   105.48–105.56  the left scissors grow into a huge pair held up in the wing; 105.60–105.84 it opens; 105.88 snip;
//          an eight-point glint on the blade 105.92–106.48
//   106.68–106.88  the shears swing out;  106.92–108.48  both wings up, the two pairs thrown and spinning above
//   108.08  the page squashes vertically (y' ≈ 0.982·y + 13; the room's glow stays) and stays so
//   108.52  hands back on hips; the two scissors float by the headline to the end
// Everything is drawn by code; the source is used only for measurements (numbers, outlines, polylines — no pixels):
//   owl bodies (s25/v2/data/*.js, one per distinct source pose): the figure's outline, its major light areas and dark
//     pieces as smoothed outlines with one linear tone plane each, the major ink lines as coarse polylines (one width
//     and value each) and compact dark dots, measured on one source frame per pose (snapshots/s25-tools/extract3.py),
//     painted by s25/v2/draw.js with a seeded feather texture; placed per frame by the measured affines (s25/v2/sched.js)
//   the standing owl's head (103.08–110.48): a head plumage outline + the face (bandage, brows, sly / shut eyes, grin
//     beak) and the headphones drawn by hand from grid measurements (s25/v2/head.js), moved by the head's measured
//     affine (s25/v2/headtrack.js)
//   scissors: a parametric model (s25/v2/scis.js) fitted per placement; smoke: fitted rotated gaussian puffs; cracks:
//     measured straight segments refined on the source's ridge map; page light / room glow: fitted gain grid / gains
// End targeted fix (2026-09-27, s25/v3/): the standing owl's head redrawn in the source's manner (thinner grey ink, the
// smirk's beak, face modelling, feathered plumage edge, darker ribbed headphones; v3/head3.js painted by v3/paint3.js);
// the scissors restyled as closed silver pairs (v3/scis3.js); the four echo owls at 102.64–102.68 (v3/burst3.js).
// (A v3 repaint of the standing bodies — thin ink, no dark ring, feather texture — looked softer but scored 0.2 worse
// σ4 over the standing phase and at the 110.52 cut, so the bodies stay v2's; see fidelity/s25.md.)
// Previous version (per-frame traced vectorisations) archived in snapshots/s25-prev/.
import { drawFramedPage, sokoPageCanvas, HEADER, FRAMED, releaseSoko } from "../lib/sites.js";
import { hippieBannerCanvas, releaseHippie } from "../lib/hippie.js";
import { CRACKS_A as CRACKS_CHAOS, CRACKS_B as CRACKS_STAND } from "./s25/v2/cracks2.js";
import { CAM, CAM_F0, GLOW, GLOW_F0, SPIN, SPIN_F0, PIV_L, PIV_R, DUST, DUST_F0, SLASH, SLASH_F0, CHIPS, CHIPS_F0 } from "./s25/v2/motion.js";
import { drawPuffs, smokeLayer, drawSmokeLayer, shadow, sparkle, bandY0, bandPath, BAND_W, negLut, drawSlashes, drawChips, releaseFx } from "./s25/v2/fx2.js";
import { paintDrawing, blitLayer, bboxOf, gray } from "./s25/v2/draw.js";
import { SCHED, SCHED_F0, CHAOS, CHAOS_F0, ECHO, ECHO_F0 } from "./s25/v2/sched.js";
import { DRAW } from "./s25/v2/drawings.js";
import { blitScissors } from "./s25/v3/scis3.js";
import { FSC, SCX, SCX_F0 } from "./s25/v2/scisdata.js";
import { SMOKE, SMOKE_F0 } from "./s25/v2/smoke.js";
import { LIGHT, LIGHT_FIX, LIGHT_FIX2, PAGE_TINT, PAGE_OFFSET } from "./s25/v2/light.js";
import { drawLoop, LOOP_F0, LOOP_F1, releaseLoop } from "./s25/v2/loop.js";
import { ECHOES2, echoAffine, drawTrail } from "./s25/v2/echo2.js";
import { drawBurst, releaseBurst } from "./s25/v2/burst.js";
import { drawBurst3, releaseBurst3 } from "./s25/v3/burst3.js";
import { HEAD, HEAD_F0 } from "./s25/v2/headtrack.js";
import { D_HEAD } from "./s25/v2/data/head.js";
import { CHEAD, chaosHead } from "./s25/v2/chead.js";
import { FEATH, bodyFeathers } from "./s25/v2/feathers.js";
import { paintOwl3 } from "./s25/v3/paint3.js";
import { face3, headOutline3, headphonesBack3, nearCup3 } from "./s25/v3/head3.js";


const W = 2206, H = 946;
let PAGE = null, STAGE = null, FXC = null, TMP = null, LAYERS = null;
const canvas = (w = W, h = H) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

// the page as it stands after s23: the sōko page (his gaze down) with the colour strip in HEADER
function pageCanvas() {
  if (PAGE) return PAGE;
  const src = sokoPageCanvas({ gaze: "down" });
  const c = canvas(src.width, src.height), g = c.getContext("2d");
  g.drawImage(src, 0, 0);
  g.drawImage(hippieBannerCanvas(), HEADER.x, HEADER.y, HEADER.w, HEADER.h);
  // the measured light of the page in this shot (LIGHT, a gain grid in frame px): scale every page pixel by it
  const id = g.getImageData(0, 0, c.width, c.height), d = id.data, k = src.width / 2206;
  const { nx, ny, x0, y0, x1, y1 } = LIGHT, G = LIGHT.g.map((v, i) => v * LIGHT_FIX[i] * LIGHT_FIX2[i]);
  for (let y = 0, i = 0; y < c.height; y++) {
    const fy = FRAMED.y + (FRAMED.sy * y) / k, v = Math.max(0, Math.min(ny - 1, ((fy - y0) / (y1 - y0)) * (ny - 1)));
    const j0 = Math.min(ny - 2, Math.floor(v)), vv = v - j0;
    for (let x = 0; x < c.width; x++, i += 4) {
      const fx = FRAMED.x + (FRAMED.sx * x) / k, u = Math.max(0, Math.min(nx - 1, ((fx - x0) / (x1 - x0)) * (nx - 1)));
      const i0 = Math.min(nx - 2, Math.floor(u)), uu = u - i0, b = j0 * nx + i0;
      const gg = (G[b] * (1 - uu) + G[b + 1] * uu) * (1 - vv) + (G[b + nx] * (1 - uu) + G[b + nx + 1] * uu) * vv;
      const r0 = d[i] * gg * PAGE_TINT[0], g0 = d[i + 1] * gg * PAGE_TINT[1], b0 = d[i + 2] * gg * PAGE_TINT[2];
      const dk = Math.pow(Math.max(0, 1 - (r0 + g0 + b0) / 450), 3);   // the offset lives in the darks only
      d[i] = r0 + PAGE_OFFSET[0] * dk; d[i + 1] = g0 + PAGE_OFFSET[1] * dk; d[i + 2] = b0 + PAGE_OFFSET[2] * dk;
    }
  }
  g.putImageData(id, 0, 0);
  PAGE = c;
  return c;
}

// crack lines: median cross-profile measured at 104.56 (post-grade): a soft core ~4.5 px FWHM; three nested strokes
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

// painted drawings, cached; "key~s" = a softened copy (the motion-smeared echo owls)
function layer(key) {
  if (!LAYERS) LAYERS = new Map();
  if (!LAYERS.has(key)) {
    if (key.endsWith("~s")) {
      const L = layer(key.slice(0, -2)), c = canvas(L.canvas.width, L.canvas.height), g = c.getContext("2d");
      g.filter = "blur(2.5px)"; g.drawImage(L.canvas, 0, 0); g.filter = "none";
      LAYERS.set(key, { ...L, canvas: c });
    } else LAYERS.set(key, paintDrawing(DRAW[key], CHEAD[key] ? { post: (g) => chaosHead(g, key) } : FEATH[key] ? { post: (g) => bodyFeathers(g, key) } : {}));
  }
  return LAYERS.get(key);
}
const blit = (g, key, m, a = 1) => { if (DRAW[key.replace("~s", "")]) blitLayer(g, layer(key), m, a); };
// the speed lines of a drawing alone (its light pieces, value ≥ 0.55, and its light ink lines; transparent elsewhere)
function linesLayer(key) {
  const k = key + ":lines";
  if (!LAYERS.has(k)) {
    const D = DRAW[key];
    const parts = D.parts.filter((q) => q.tier === 1 && q.t[0] >= 0.55), lines = (D.lines || []).filter((l) => l.v >= 0.5);
    LAYERS.set(k, paintDrawing({ ...D, hull: [], parts, lines, ink: [], dots: [], edge: [0, 2] }, { bb: bboxOf(D), grain: 0, feathers: 0 }));
  }
  return LAYERS.get(k);
}
// the head layer (104.60 page px): the band and far cup, the head's plumage, the face (eye state st), the near cup;
// its lower edge fades into the body below the neck
function headLayer(st) {
  const key = "head:" + st;
  if (!LAYERS) LAYERS = new Map();
  if (!LAYERS.has(key)) LAYERS.set(key, paintOwl3(D_HEAD, { bb: [900, 250, 1285, 560], pre: headphonesBack3, post: (g) => { headOutline3(g, D_HEAD.hull); face3(g, st); nearCup3(g); }, fade: [522, 552], rim: [0.1, 8], edge: [0.22, 2] }));
  return LAYERS.get(key);
}
const GLOW_TINT_L = [0.89, 0.915, 0.88], GLOW_TINT_R = [0.93, 0.955, 0.92];
// fix pass 2: the fitted chaos smoke reads too bright where the echo owls converge and in the burst (all four
// quadrants +3…+8 levels over the source at 102.44–102.56, σ8) and in the burst, where the owl-built smear
// (s25/v2/burst.js) now carries part of the light; scaled down there (tried 0.7–1.0 on 7 burst frames)
const smokeGain = (f) => (f < 2559 ? 1 : f < 2566 ? 0.85 : f < 2568 ? 1 : 0.85);
const eyeState = (f) => (f <= 2588 ? "shut" : f === 2589 ? "half" : "sly");

// scissors placements moved rigidly (pivot PIV to (x, y), rotated by th) or by an affine [a, b, c, d, e, f]
function moved(pl, piv, x, y, th) {
  const c = Math.cos(th), s = Math.sin(th), dx = pl.P[0] - piv[0], dy = pl.P[1] - piv[1];
  return { ...pl, P: [x + c * dx - s * dy, y + s * dx + c * dy], a: [pl.a[0] + th, pl.a[1] + th] };
}
function affPl(pl, m) {
  const [a, b, c, d, e, f] = m, th = Math.atan2(b, a), k = Math.sqrt(Math.abs(a * d - b * c));
  return { ...pl, P: [a * pl.P[0] + c * pl.P[1] + e, b * pl.P[0] + d * pl.P[1] + f], a: [pl.a[0] + th, pl.a[1] + th], s: (pl.s || 1) * k };
}
const SCX_PL = { scCL: "scCL", scCR: "scCR", scH1L: "h1L", scH1R: "h1R" };
// fix pass 2: the source's pairs are nearly closed (~10° between the blades held at the hips, ~8–10° floating); the
// fitted placements open them 13–25°: the two blades are brought symmetrically to at most `max` rad apart
function tighten(pl, max) {
  let d = pl.a[1] - pl.a[0];
  d = Math.atan2(Math.sin(d), Math.cos(d));
  if (Math.abs(d) <= max) return pl;
  const mid = pl.a[0] + d / 2, h = (Math.sign(d) * max) / 2;
  return { ...pl, a: [mid - h, mid + h] };
}
// and the left pair in the crouch (103.12–103.40) lies ~8° flatter on the source (tip ≈ (620, 880) at 103.24)
const turn = (pl, th) => ({ ...pl, a: [pl.a[0] + th, pl.a[1] + th] });
// the glint on the big blade (105.92–106.48): centre (606, 677) (measured at 106.00); reach per frame measured against the clean 106.60
// frame (left spike): 42 67 80 80 60 80 80 80 80 69 64 54 43 26 13 px
const GLINT_F0 = 2648, GLINT = [42, 67, 80, 80, 60, 80, 80, 80, 80, 69, 64, 54, 43, 26, 13];

// extra landing-dust billows (fix pass 1): the fitted DUST puffs leave the cloud 15–40 levels short at x 700–900 and
// x 1200–1500 over 103.24–103.44 (measured, post-grade); a few wide billows there that rise and spread, fading by 104.1
function dustExtra(f) {
  const u = (f - 2578) / 25, a = Math.min(1, (f - 2577) / 3) * Math.max(0, 1 - Math.max(0, f - 2582) / 21);
  const out = [];
  for (const [x, y, sx, sy, k, dx, dy] of [[800, 890, 75, 34, 0.1, 10, 0], [1300, 890, 80, 36, 0.1, 15, -30], [1440, 870, 55, 45, 0.08, 25, -30], [1020, 910, 70, 26, 0.05, 0, 0]])
    out.push(x + dx * u, y + dy * u, sx * (1 + 0.5 * u), sy * (1 + 0.3 * u), k * a * (dy ? 1 : Math.max(0, 1 - Math.max(0, f - 2583) / 6)));
  return out;
}

// fix pass 2: billows in FRONT of the owl (the source's landing dust hides the scissor blades and the feet): the cloud
// was still 13–16 levels short at x 700–1000 and 3–5 short at x 1400–1750 over 103.16–103.24; wide billows there that
// rise ~30 px over 0.3 s, hold to 103.28 and fade by 103.48 (later they read 9–13 over), broken up by the wisp texture
function dustFront(f) {
  if (f < 2577 || f > 2587) return null;
  const u = Math.min(1, (f - 2577) / 7.5), a = Math.min(1, (f - 2576) / 2) * (f <= 2582 ? 1 : Math.max(0, 1 - (f - 2582) / 5));
  const out = [];
  for (const [x, y, sx, sy, k] of [[790, 858, 90, 52, 0.12], [1505, 850, 78, 46, 0.04], [650, 890, 75, 34, 0.08], [930, 880, 70, 30, 0.06], [1630, 885, 62, 30, 0.03]])
    out.push(x, y - 30 * u, sx * (1 + 0.25 * u), sy * (1 + 0.3 * u), k * a);
  return out;
}

// the grey haze round the owl on the pop frame (103.00): soft gaussians, centred over the owl's head and wings
// (measured: +26 left of the owl at x 760–880, +16 above the screen at x 800–1400, post-grade)
function popHaze(g) {
  g.save();
  for (const [x, y, sx, sy, a] of [[960, 210, 150, 220, 0.3], [1150, 40, 160, 90, 0.2], [830, 470, 90, 160, 0.16]]) {
    g.save(); g.translate(x, y); g.scale(sx / 100, sy / 100);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 250);
    for (let k = 0; k <= 10; k++) { const r = k / 4; gr.addColorStop(k / 10, `rgba(190,190,188,${(a * Math.exp(-0.5 * r * r)).toFixed(4)})`); }
    g.fillStyle = gr; g.fillRect(-250, -250, 500, 500);
    g.restore();
  }
  g.restore();
}

function paintStanding(g, f) {
  if (f <= 2575) {
    // 103.00: the owl bursts out of the smear, higher and smaller: the 103.04 drawing under the affine measured on
    // this frame (rotation/scale-searched template match + ECC), in a grey haze left over from the smear
    popHaze(g);
    // fix pass 2: dark grey haze behind the right wing (the source shows no banner colour there: ~92 post-grade)
    g.save(); g.filter = "blur(14px)"; g.fillStyle = "rgba(80,80,79,0.6)"; g.fillRect(1195, 185, 80, 130); g.restore();
    blit(g, "pop", POP_M);
    // the two raised pairs (3x grid crops of 103.00): left pivot (835, 210), blade tips (812, 150) (860, 125); right
    // pivot (1300, 222), tips (1270, 150) (1335, 145); rings below the pivots
    blitScissors(g, { P: [835, 210], a: [-1.94, -1.3], s: 0.52, m: -1 });
    blitScissors(g, { P: [1300, 222], a: [-1.96, -1.16], s: 0.52, m: -1 });
    return;
  }
  const row = SCHED[Math.min(SCHED.length - 1, f - SCHED_F0)];
  const key = row[0];
  // the pool round the feet: the source's floor stays visibly lit round the feet (fix pass 1: 0.85 → 0.45)
  if (key !== "pop") shadow(g, 1085, 858, 300, 0.45);
  if (f >= DUST_F0 && f < DUST_F0 + DUST.length) drawPuffs(g, DUST[f - DUST_F0], (f - 2512) / 25);
  if (f >= 2578 && f < 2604) drawPuffs(g, dustExtra(f), (f - 2512) / 25);
  // the pairs held in the crouch and the rise: behind the owl, on their measured tracks
  if (f >= SCX_F0 && f < SCX_F0 + SCX.length) for (const [k, ...m] of SCX[f - SCX_F0]) {
    let pl = affPl(tighten(FSC[SCX_PL[k]], 0.17), m);
    if (k === "scCL" && f >= 2578 && f <= 2585) pl = turn(pl, 0.14);
    blitScissors(g, pl);
  }
  blit(g, key, row.slice(1));
  if (f >= HEAD_F0) blitLayer(g, headLayer(eyeState(f)), HEAD[Math.min(HEAD.length - 1, f - HEAD_F0)]);
  const df = dustFront(f);
  if (df) drawPuffs(g, df, (f - 2512) / 25);
  if (f >= GLINT_F0 && f < GLINT_F0 + GLINT.length) sparkle(g, 606, 677, GLINT[f - GLINT_F0]);
  if (f >= SPIN_F0 && f < SPIN_F0 + SPIN.length) {
    // the spinning pairs are motion-smeared on the source: two fainter copies at the previous two frames' poses
    for (const [back, al] of [[2, 0.22], [1, 0.34], [0, 1]]) {
      const i = f - SPIN_F0 - back;
      if (i < 0) continue;
      const [lx, ly, lr, rx, ry, rr] = SPIN[i];
      g.save(); g.globalAlpha = al;
      blitScissors(g, moved(tighten(FSC.fscL, 0.21), PIV_L, lx, ly, lr));
      blitScissors(g, moved(tighten(FSC.fscR, 0.21), PIV_R, rx, ry, rr));
      g.restore();
    }
  } else if (f >= SPIN_F0 + SPIN.length) {
    blitScissors(g, tighten(FSC.fscL, 0.21));
    blitScissors(g, tighten(FSC.fscR, 0.21));
  }
}

// the chaos layer (100.52–102.96) in frame px: slashes, echo owls, the main owl, chips
function paintChaos(g, f, t) {
  // the big slash loop (102.16–102.80): one static measured loop, drawn on / erased per frame (s25/v2/loop.js)
  if (f >= LOOP_F0 && f <= LOOP_F1) drawLoop(g, f);
  if (f >= 2568 && f <= 2574) {
    // the burst (102.72–102.96): the ghost column, the smeared X of wings and the owl, from the owl layers
    // (fix pass 2, s25/v2/burst.js; the fitted smoke under it is scaled down)
    drawBurst(g, f, blit);
    return;
  }
  if (f >= SLASH_F0 && f < SLASH_F0 + SLASH.length) {
    let rows = SLASH[f - SLASH_F0];
    // in the loop's frames the loop replaces the earlier ellipse-interval measurements (both of its ellipses were fits
    // of this one stroke)
    if (f >= LOOP_F0 && f <= LOOP_F1) rows = null;
    drawSlashes(g, rows, 0);
  }
  // fix pass 2: the echo owls placed by their head (s25/v2/echo2.js): the bottom-centre echo, the left echo (the
  // top-right drawing mirrored; replaces the eFl slab), the four converging echoes; translucent, with smoke trails
  for (const e of ECHOES2) {
    if (f >= 2566 && f <= 2567) continue;   // end targeted fix: the converging echoes' last two frames are burst3's
    const i = e.rows.findIndex((r) => r[0] === f);
    if (i < 0 || e.off) continue;
    const [, hx, hy, sc, rot, al0] = e.rows[i];
    if (e.trail) { e.rows.trail = e.trail; e.rows.trailA = e.trailA; }
    const al = al0;
    if (e.trail && !e.trailA) drawTrail(g, e.rows, i, al);
    const soft = e.soft || (e.softFrom && f >= e.softFrom);
    blit(g, e.key + (soft ? "~s" : ""), echoAffine(e.key, hx, hy, sc, rot, !!e.mirror), al);
    // (the left echo's smoke streak engulfs its back half on the source: drawn over it)
    if (e.trail && e.trailA) drawTrail(g, e.rows, i, al);
  }
  // the measured echo rows (top-right echo 100.68–101.32, the perched echo 100.76–101.28); eFl (the slab) is replaced
  // above; the perched echo is translucent on the source
  const er = f >= ECHO_F0 && f < ECHO_F0 + ECHO.length ? ECHO[f - ECHO_F0] : null;
  if (er) for (const [k, ...m] of er) if (k !== "eFl") blit(g, k, m, k === "eSt" ? 0.72 : 0.92);
  const row = f >= CHAOS_F0 && f < CHAOS_F0 + CHAOS.length ? CHAOS[f - CHAOS_F0] : null;
  if (row) blit(g, row[0], row.slice(1));
  else if (f >= 2566 && f <= 2567) {
    // 102.64–102.68: the hovering owl rises into a vertical smear (ghost copies above it) as the echoes close in
    const m = CHAOS[CHAOS.length - 1].slice(1);
    if (f === 2567) m[5] -= 40;
    drawBurst(g, f, blit, m, { col: 1.2 });
    // end targeted fix: the central owl at its size on the source at 102.64, then the four big echo owls with their
    // motion streaks (s25/v3/burst3.js; v2's softened converging echoes are skipped on these two frames)
    const hm = f === 2566 ? HOV_2566 : m;
    blit(g, "hov2", hm, f === 2566 ? 1 : 0.7);
    drawBurst3(g, f, blit);
  }
}

// the central owl at 102.64: hov2 (head (1033, 405), 124 px) scaled 1.16 about its head to (1037, 391) (source: head
// ~144 px); at 102.68 it stays v2's (tried 1.2x at (1037, 379): 1.1 worse)
const HOV_2566 = [1.16, 0, 0, 1.16, 1037 - 1.16 * 1033, 391 - 1.16 * 405];
// paper chips (fix pass 2): the per-frame detections include pieces of the owls, their scissors, dust and the slash
// arcs; on the source no chip sits on an owl or on an arc. Chaos frames: drop a chip when the chaos layer drawn so far
// (owls, echoes, slashes, the loop) is opaque (alpha > 0.3) at its centre or within 12 px of it. Standing frames: see
// below. (Dropping every chip inside the screen from 103.00 on scored worse: 103.00–103.08 do have paper flying.)
const POP_M = [0.9147, 0.0024, -0.0101, 0.8988, 87.16, -135.77];
function layerAlpha(key) {
  const L = layer(key);
  if (!L.alpha) {
    const w = L.canvas.width, h = L.canvas.height, d = L.canvas.getContext("2d").getImageData(0, 0, w, h).data, a = new Uint8Array(w * h);
    for (let i = 0; i < a.length; i++) a[i] = d[4 * i + 3];
    L.alpha = { w, h, a };
  }
  return L.alpha;
}
function filterChips(row, g, f) {
  if (!row) return null;
  // end targeted fix: in the burst the source's chips fly over the owls and the smears: keep them all
  if (f >= 2566 && f <= 2574) return row;
  const out = [];
  if (f >= 2575) {
    // standing phase: drop the chips that fall on the owl (its painted layer is opaque there, tested through the
    // inverse of this frame's placement, 14 px margin) or on the held scissors / dust (x 600–1800, y > 620 over
    // 103.08–103.56); the rest are paper flying past
    const key = f === 2575 ? "pop" : SCHED[Math.min(SCHED.length - 1, f - SCHED_F0)][0];
    const m = f === 2575 ? POP_M : SCHED[Math.min(SCHED.length - 1, f - SCHED_F0)].slice(1);
    const A = layerAlpha(key), L = layer(key), det = m[0] * m[3] - m[1] * m[2];
    const opaque = (x, y) => {
      const u = (m[3] * (x - m[4]) - m[2] * (y - m[5])) / det - L.x, v = (-m[1] * (x - m[4]) + m[0] * (y - m[5])) / det - L.y;
      const i = Math.round(u), j = Math.round(v);
      return i >= 0 && j >= 0 && i < A.w && j < A.h && A.a[j * A.w + i] > 77;
    };
    for (let i = 0; i + 5 < row.length; i += 6) {
      const x = row[i], y = row[i + 1];
      if (f >= 2577 && x > 600 && x < 1800 && y > 620) continue;
      let hit = false;
      for (let k = 0; k < 9 && !hit; k++) hit = opaque(x + (k ? 14 * Math.cos((k * Math.PI) / 4) : 0), y + (k ? 14 * Math.sin((k * Math.PI) / 4) : 0));
      if (!hit) out.push(...row.slice(i, i + 6));
    }
    return out;
  }
  const d = g.getImageData(0, 0, W, H).data;
  const at = (x, y) => { x = Math.round(x); y = Math.round(y); return x < 0 || y < 0 || x >= W || y >= H ? 0 : d[4 * (y * W + x) + 3]; };
  const OFF = [[0, 0]];
  for (let k = 0; k < 8; k++) OFF.push([12 * Math.cos((k * Math.PI) / 4), 12 * Math.sin((k * Math.PI) / 4)], [6 * Math.cos((k * Math.PI) / 4 + 0.4), 6 * Math.sin((k * Math.PI) / 4 + 0.4)]);
  for (let i = 0; i + 5 < row.length; i += 6) {
    const x = row[i], y = row[i + 1];
    if (OFF.some(([dx, dy]) => at(x + dx, y + dy) > 77)) continue;
    out.push(...row.slice(i, i + 6));
  }
  return out;
}

export const shot = {
  draw(ctx, local, t) {
    // the source animates on 25 fps frames here: snap to the source frame (exact at the render's k/25 times; a
    // sample up to 0.033 s early — the snapshot tool's 1/30 s grid — still shows that frame)
    const f = Math.min(2762, Math.ceil(t * 25 - 1e-3));
    t = f / 25;
    if (!STAGE) { STAGE = canvas(); FXC = canvas(); }
    const sg = STAGE.getContext("2d"), fg = FXC.getContext("2d");
    const stand = f >= 2575;
    fg.setTransform(1, 0, 0, 1, 0, 0); fg.clearRect(0, 0, W, H);
    if (!stand) paintChaos(fg, f, t);
    if (f >= CHIPS_F0 && f < CHIPS_F0 + CHIPS.length) drawChips(fg, filterChips(CHIPS[f - CHIPS_F0], fg, f));
    const glow = GLOW[Math.max(0, Math.min(GLOW.length - 1, f - GLOW_F0))];
    const SL = !stand && f >= SMOKE_F0 && f < SMOKE_F0 + SMOKE.length ? smokeLayer(SMOKE[f - SMOKE_F0], (f - 2512) / 25, 0.93, smokeGain(f)) : null;
    sg.setTransform(1, 0, 0, 1, 0, 0);
    drawFramedPage(sg, pageCanvas(), {
      glow: f === 2514 ? 0 : glow,
      over(g) {
        if (f >= 2577) { g.fillStyle = "#000"; g.fillRect(140, 913, 1890, 40); }
        drawCracks(g, f >= 2577 ? CRACKS_STAND : CRACKS_CHAOS);
        if (stand) paintStanding(g, f);
        else drawSmokeLayer(g, SL, "screen");
        g.drawImage(FXC, 0, 0);
      },
    });
    // the chaos layer again outside the screen (owls and chips fly past the screen's edge)
    sg.save();
    const S = FRAMED.screen;
    sg.beginPath(); sg.rect(0, 0, W, H); sg.rect(S.x0, S.y0, S.x1 - S.x0, S.y1 - S.y0); sg.clip("evenodd");
    // fix pass 2: the room glow's tint. The shared glow takes the page's colour, which reads magenta-red on the wall;
    // the source's wall light is warmer and weaker (source ÷ render, x 0–100 at 105.00: 0.875 0.905 0.878; x 2100–2206
    // at 101.00: 0.84 0.89 0.82). The room is black here, so a multiply scales the glow alone.
    // Above the screen the source's wall already matches in the standing phase (the tint fades in down the side
    // walls); in the chaos the top wall is ~5 levels over the source as well (×0.94).
    if (f !== 2514) {
      const top = f < 2575 ? 0.94 : 1, T = Math.round(255 * top), y0 = S.y0 - 70;
      sg.globalCompositeOperation = "multiply";
      if (top < 1) { sg.fillStyle = `rgb(${T},${T},${T})`; sg.fillRect(0, 0, W, y0); }
      for (const [x, w, k] of [[0, S.x0, GLOW_TINT_L], [S.x1, W - S.x1, GLOW_TINT_R]]) {
        const gr = sg.createLinearGradient(0, y0, 0, S.y0 + 50);
        gr.addColorStop(0, `rgb(${T},${T},${T})`); gr.addColorStop(1, `rgb(${k.map((v) => Math.round(255 * v)).join(",")})`);
        sg.fillStyle = gr; sg.fillRect(x, y0, w, H);
      }
      sg.globalCompositeOperation = "source-over";
    }
    drawSmokeLayer(sg, SL);
    if (f === 2575) popHaze(sg);
    sg.drawImage(FXC, 0, 0);
    sg.restore();

    // opening wipe over the tail of s24 (100.48–100.52)
    if (f <= 2513) {
      const y0 = bandY0(t);
      if (!TMP) TMP = canvas();
      const tg = TMP.getContext("2d");
      tg.setTransform(1, 0, 0, 1, 0, 0);
      tg.fillStyle = "#000"; tg.fillRect(0, 0, W, H);
      const rk = f <= 2512 ? "rem48" : "rem52";
      blit(tg, rk, null);
      // fix pass 2: right of the screen edge (x > 2015) the measured drawing is posterised blotches; the source is a
      // soft grey wall (post-grade p30 profile at 100.48: 16 at x 2020, 49 at 2040, 35 at 2080, 22 at 2125, 18 at
      // 2200) with the speed lines crossing it: a gradient, then the drawing's own lines (lightened on)
      tg.save(); tg.beginPath(); tg.rect(2015, 0, W - 2015, H); tg.clip();
      const k = f <= 2512 ? 1 : 1.55, gr = tg.createLinearGradient(2015, 0, W, 0);
      for (const [x, v] of [[2015, 0.03], [2030, 0.2], [2045, 0.3], [2065, 0.27], [2095, 0.21], [2125, 0.17], [2160, 0.15], [2206, 0.14]]) gr.addColorStop((x - 2015) / (W - 2015), gray(v * k));
      tg.fillStyle = gr; tg.fillRect(2015, 0, W - 2015, H);
      tg.globalCompositeOperation = "lighten"; blitLayer(tg, linesLayer(rk));
      tg.restore();
      sg.save();
      sg.beginPath(); sg.moveTo(-10, y0 + BAND_W + 4); sg.lineTo(W + 10, y0 + BAND_W + 4 - 0.4275 * (W + 20)); sg.lineTo(W + 10, H + 2000); sg.lineTo(-10, H + 2000); sg.closePath(); sg.clip();
      sg.drawImage(TMP, 0, 0);
      sg.restore();
      sg.fillStyle = "rgb(246,246,242)"; sg.beginPath(); bandPath(sg, y0, y0 + BAND_W); sg.fill();
    }

    // the stage through the measured camera (drift ≤ 2.5 px; the 108.08 squash); the room's glow stays put
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (f >= CAM_F0) {
      const m = CAM[Math.min(CAM.length - 1, f - CAM_F0)];
      ctx.drawImage(STAGE, 0, 0);
      ctx.fillStyle = "#000"; ctx.fillRect(S.x0 - 2, S.y0 - 2, S.x1 - S.x0 + 4, H - S.y0 + 2);
      ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
      ctx.beginPath(); ctx.rect(S.x0 - 2, S.y0 - 2, S.x1 - S.x0 + 4, H - S.y0 + 2); ctx.clip();
    }
    ctx.drawImage(STAGE, 0, 0);
    ctx.restore();

    // the negative frame (100.56): a hard negative of the stage through the measured tone curve
    // fix pass 2: the curve only inside the screen; the room round it (drawn without its glow on this frame) goes
    // flat white with what flies past the screen dark (the grade's vignette gives the source's soft fall-off); in the
    // colour strip every light pixel goes black (the source's clouds and rainbow are solid black here)
    if (f === 2514) {
      const id = ctx.getImageData(0, 0, W, H), d = id.data, lut = negLut();
      const hx0 = FRAMED.x + FRAMED.sx * HEADER.x, hy0 = FRAMED.y + FRAMED.sy * HEADER.y, hx1 = hx0 + FRAMED.sx * HEADER.w, hy1 = hy0 + FRAMED.sy * HEADER.h;
      for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i += 4) {
        const p = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
        let v;
        if (x < S.x0 || x >= S.x1 || y < S.y0) v = Math.max(0, 255 - 1.15 * p);
        else { v = lut[Math.round(p)]; if (p >= 128 && x >= hx0 && x < hx1 && y >= hy0 && y < hy1) v = Math.min(v, 22); }
        d[i] = d[i + 1] = d[i + 2] = v;
      }
      ctx.putImageData(id, 0, 0);
    }
  },
  release() { PAGE = null; STAGE = null; FXC = null; TMP = null; LAYERS = null; releaseFx(); releaseLoop(); releaseBurst(); releaseBurst3(); releaseSoko(); releaseHippie(); },
};
