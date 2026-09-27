// s20 (63.12–69.44): the wide room. Two locked-off setups:
//   A 63.12–66.84  the owl props the note card against the synth, turns, runs to the big grimy scissors leaning on
//                  the speaker, beats the dust and cobwebs off them (they come up bright chrome), backs off and stares;
//   B 66.84–69.44  the same drawing re-framed (measured per frame, see B1/B2 below): the owl crouches, lunges, grabs
//                  the scissors, whirls with them, then holds them up with a glint and a smirk, one wing on its hip.
//   69.40 (last frame) is a light-leak flash into s21.
// Everything is drawn: the room is one engraved plate (painted without the scissors, which are a separate Canvas2D
// prop so the owl can clean and take them), the cobwebs are their own layer over the scissors, the card is the
// notecard lib warped onto measured perspective quads, the owl is the s20 owl2 rig (s20/owl2.js, owlposes.js).
import { W, H } from "../config.js";
import { Plate } from "../lib/engrave.js";
import { clamp, lerp, smooth } from "../lib/rng.js";
import { noteCardCanvas, CARD_W, CARD_H } from "../lib/notecard.js";
import { paintRoom, paintSynth, SYNTH_CLIP } from "./s20/room.js";
import { drawScissors, drawCobwebs, SCISSORS_LEAN, releaseScissors } from "./s20/scissors.js";
import { owlAt } from "./s20/owl.js";
import { owl2Layer } from "./s20/owl2.js";
import { drawPuffs, releasePuffs } from "./s20/puffs.js";

const CUT = 66.84;
const M = 60;                                             // plate margin (setup B shrinks the plate by ≈ 1.5–3.5 %)
// Setup B camera, measured per frame (ORB + RANSAC affine fit of the static room, source frame 66.40 → frame t,
// residual ≈ 0.8 px): canvas setTransform(a, b, c, d, e, f) with x' = a·x + c·y + e, y' = b·x + d·y + f.
// B1 66.84–67.36 is anisotropic; a second nudge 67.40–67.48 settles into B2, held 67.52–69.40.
const B1 = [0.9846, -0.0002, 0.0000, 0.9703, 0.95, -3.6];
const B2 = [0.9910, -0.0004, -0.0004, 0.9646, -8.15, 1.3];
const CAM = [[67.4, [0.9862, -0.0002, -0.0011, 0.9690, -0.42, -2.61]], [67.44, [0.9888, -0.0003, -0.0001, 0.9669, -5.16, -0.39]], [67.48, [0.9908, -0.0006, -0.0005, 0.9648, -7.93, 1.73]]];
function camAt(tq) {
  if (tq < CUT - 1e-6) return null;
  if (tq < 67.4 - 1e-6) return B1;
  for (const [t, m] of CAM) if (Math.abs(tq - t) < 0.005) return m;
  return B2;
}

// ---------------------------------------------------------------- homography + mesh warp
function homography(src, dst) {
  // solve for h (8 unknowns) mapping src[i] -> dst[i]
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  for (let c = 0; c < 8; c++) {
    let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < 8; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; b[r] -= f * b[c]; }
  }
  const h = b.map((v, i) => v / A[i][i]);
  return (x, y) => { const w = h[6] * x + h[7] * y + 1; return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w]; };
}
function tri(ctx, img, s0, s1, s2, d0, d1, d2) {
  // affine map of source triangle onto dest triangle, clipped to the (slightly grown) dest triangle
  const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3, g = 0.6;
  const grow = (p) => { const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * g, p[1] + dy / l * g]; };
  const a = grow(d0), bb = grow(d1), c = grow(d2);
  ctx.save(); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(bb[0], bb[1]); ctx.lineTo(c[0], c[1]); ctx.closePath(); ctx.clip();
  const [x0, y0] = s0, [x1, y1] = s1, [x2, y2] = s2;
  const den = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
  const m11 = ((d1[0] - d0[0]) * (y2 - y0) - (d2[0] - d0[0]) * (y1 - y0)) / den;
  const m12 = ((d2[0] - d0[0]) * (x1 - x0) - (d1[0] - d0[0]) * (x2 - x0)) / den;
  const m21 = ((d1[1] - d0[1]) * (y2 - y0) - (d2[1] - d0[1]) * (y1 - y0)) / den;
  const m22 = ((d2[1] - d0[1]) * (x1 - x0) - (d1[1] - d0[1]) * (x2 - x0)) / den;
  ctx.transform(m11, m21, m12, m22, d0[0] - m11 * x0 - m12 * y0, d0[1] - m21 * x0 - m22 * y0);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}
// Warp the card canvas (card units * k + pad) onto a frame quad [TL, TR, BR, BL] of the card's 465x648 face.
function warpCard(ctx, img, quad, nx = 8, ny = 12) {
  const k = (img.width - 2 * img.__pad) / CARD_W, pad = img.__pad;
  const Hm = homography([[0, 0], [CARD_W, 0], [CARD_W, CARD_H], [0, CARD_H]], quad);
  // extend the mesh over the pad so the rim/outline is not clipped
  const e = pad / k, u0 = -e, v0 = -e, u1 = CARD_W + e, v1 = CARD_H + e;
  const P = [], S = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const u = u0 + (u1 - u0) * i / nx, v = v0 + (v1 - v0) * j / ny;
    P.push(Hm(u, v)); S.push([(u + e) * k, (v + e) * k]);
  }
  const at = (i, j) => j * (nx + 1) + i;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
    tri(ctx, img, S[a], S[b], S[c], P[a], P[b], P[c]);
    tri(ctx, img, S[a], S[c], S[d], P[a], P[c], P[d]);
  }
  return Hm;
}

// ---------------------------------------------------------------- the card: measured quads (setup A frame)
// Final lean (63.44 on): corners fitted to the edges at 64.12. During the push (63.12–63.40) the card slides right
// and straightens; the smiley track (per frame) gives the progress f, with a 15 px lift mid-way.
const CARD_Q0 = [[1040, 232], [1245, 197], [1346, 748], [1144, 674]];
const CARD_Q1 = [[1305, 247], [1503, 222], [1444, 813], [1227, 722]];
const CARD_F = [[63.12, 0], [63.16, 0.063], [63.2, 0.138], [63.24, 0.224], [63.28, 0.351], [63.32, 0.48], [63.36, 0.647], [63.4, 0.99], [63.44, 1]];
function cardQuad(t) {
  let f = 1;
  if (t < 63.44) { f = 0; for (let i = 1; i < CARD_F.length; i++) if (t < CARD_F[i][0] + 1e-6) { const [ta, fa] = CARD_F[i - 1], [tb, fb] = CARD_F[i]; f = fa + (fb - fa) * clamp((t - ta) / (tb - ta)); break; } }
  const lift = -15 * Math.sin(Math.PI * f);
  return CARD_Q0.map((p, i) => [lerp(p[0], CARD_Q1[i][0], f), lerp(p[1], CARD_Q1[i][1], f) + lift]);
}
function drawCardEdge(ctx, q) {
  // the card's thickness: a grey strip along the right edge (seen side-on)
  const [, TR, BR] = q;
  ctx.save();
  ctx.fillStyle = "rgb(104,100,98)";
  ctx.beginPath(); ctx.moveTo(TR[0] - 6, TR[1] + 4); ctx.lineTo(TR[0] + 9, TR[1] + 8); ctx.lineTo(BR[0] + 9, BR[1] - 2); ctx.lineTo(BR[0] - 6, BR[1] - 6); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(20,16,16,0.9)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(TR[0] + 9, TR[1] + 8); ctx.lineTo(BR[0] + 9, BR[1] - 2); ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- caches
let C = null;
function build() {
  if (C) return C;
  const P = new Plate(W + 2 * M, H + 2 * M, 1);
  for (const g of [P.v, P.d, P.o]) g.translate(M, M);
  paintRoom(P);
  const room = P.engrave({ spacing: 5.0, seed: 20, contrast: 1.0, ink: 0.9 });
  const S = new Plate(W + 2 * M, H + 2 * M, 1);
  for (const g of [S.v, S.d, S.o]) g.translate(M, M);
  paintSynth(S);
  const synth = S.engrave({ spacing: 4.6, seed: 21, contrast: 1.0 });
  const card = noteCardCanvas(465 * 1.1, { theme: "room", text: "This is really good", smiley: 1 });
  const cardStatic = document.createElement("canvas"); cardStatic.width = W; cardStatic.height = H;
  const cg = cardStatic.getContext("2d");
  drawCardEdge(cg, CARD_Q1); warpCard(cg, card, CARD_Q1);
  // a clean scissors sprite for the motion smears: pivot at (SPX, SPY), blades pointing +y
  const sp = document.createElement("canvas"); sp.width = 300; sp.height = 760;
  drawScissors(sp.getContext("2d"), { x: 150, y: 400, rot: 0, s: 1, grime: 0, open: 0.05 });
  C = { room, synth, card, cardStatic, owls: new Map(), sprite: sp, scratch: document.createElement("canvas"), scratch2: document.createElement("canvas") };
  return C;
}
const SPX = 150, SPY = 400;
function scratch(k) { const c = k ? C.scratch2 : C.scratch; if (c.width !== W) { c.width = W; c.height = H; } const g = c.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); return [c, g]; }

function owlCached(o) {
  const m = C.owls;
  if (!m.has(o.key)) {
    if (m.size > 40) m.delete(m.keys().next().value);
    m.set(o.key, owl2Layer(o.pose(), o.place));
  }
  return m.get(o.key);
}

// ---------------------------------------------------------------- the scissors' state
// grime: dusty until 65.52, cleaned to bright chrome by 65.72 (blade brightness track 140 → 168); the cobwebs
// strung over them fade out 65.44–65.72 and never come back.
const grimeAt = (t) => 1 - smooth(clamp((t - 65.52) / 0.2));
const webAt = (t) => 1 - smooth(clamp((t - 65.44) / 0.28));
// held up behind the head from 67.80 (68.40, B frame): blades from a pivot hidden behind the crown (≈ (985,430)) up
// to the tips (1233,93)/(1271,106); the handles are foreshortened, loops side by side at (821,566)/(898,629) below
// the wing's grip. The blades settle 67.80–67.96: the top blade tip tracks (1296,151) → (1268,132) → (1249,112) →
// (1239,97) → (1233,95) held, i.e. a pivot-to-tip direction of −0.68, −0.76, −0.83, −0.87, −0.88 rad.
const BLADE_DIR = [[67.8, -0.68], [67.84, -0.76], [67.88, -0.83], [67.92, -0.87], [67.96, -0.88]];
function bladeDir(t) { let a = BLADE_DIR[0][1]; for (const [k, v] of BLADE_DIR) if (t >= k - 1e-6) a = v; return a; }
function drawHeld(ctx, t, blades = true, handles = true) {
  const dir = bladeDir(t);
  if (blades) drawScissors(ctx, { x: 985, y: 430, rot: dir - Math.PI / 2, s: 1, blade: 1.36, bladeW: 1.35, open: 0.12, grime: 0, flip: true, handles: false });
  if (handles) drawScissors(ctx, { x: 945, y: 512, rot: -0.9 - Math.PI / 2, s: 1.08, ringY: 0.6, open: 0.0, grime: 0, flip: true, blades: false });
}
// motion smears (B frame): the whole scissors swept about a hand point from angle a0 to a1 (blade direction, frame
// radians), as one continuous wedge: 56 low-alpha samples, then blurred. [hx, hy, a0, a1, alpha, sharp end]
const SMEAR = {
  67.4: [960, 430, -2.3, -1.6, 1], 67.44: [1080, 420, -2.0, -0.4, 1], 67.48: [1100, 400, -2.6, -1.0, 1],
  67.52: [1130, 400, -1.9, -1.1, 1], 67.56: [1130, 400, -1.9, -1.1, 1], 67.6: [1150, 410, -1.9, -1.0, 1],
  67.64: [1110, 410, -2.6, -1.5, 1], 67.68: [960, 450, -0.85, -0.3, 1, 0.2],
  67.72: [930, 520, -1.5, -1.1, 1, 0.3], 67.76: [930, 510, -1.2, -1.0, 1, 0.6],
};
function drawSmear(ctx, sm) {
  const [hx, hy, a0, a1, al, sharp = 0] = sm, n = 56;
  const [sc, g] = scratch(1);
  const sp = C.sprite;
  // hand point on the sprite: the shank just above the loops (local (−8,−120) → sprite (142,280))
  for (let i = 0; i < n; i++) {
    const a = a0 + (a1 - a0) * (i + 0.5) / n;
    g.save(); g.globalAlpha = 0.12; g.translate(hx, hy); g.rotate(a - Math.PI / 2); g.scale(1.15, 1.25);
    g.drawImage(sp, -(SPX - 8), -(SPY - 120)); g.restore();
  }
  ctx.save(); ctx.filter = "blur(7px)"; ctx.globalAlpha = Math.min(1, al * 1.1); ctx.drawImage(sc, 0, 0); ctx.restore();
  if (sharp) { ctx.save(); ctx.globalAlpha = sharp; ctx.translate(hx, hy); ctx.rotate(a1 - Math.PI / 2); ctx.scale(1.15, 1.25); ctx.drawImage(sp, -(SPX - 8), -(SPY - 120)); ctx.restore(); }
}

// ---------------------------------------------------------------- glint (B frame)
function drawGlint(ctx, k) {
  if (k <= 0) return;
  const x = 1170, y = 157;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const R = 64 * (0.35 + 0.65 * k), ka = Math.min(1, 1.3 * k);
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, `rgba(255,255,255,${ka})`); g.addColorStop(0.25, `rgba(250,250,246,${0.95 * ka})`); g.addColorStop(0.6, `rgba(230,230,226,${0.33 * ka})`); g.addColorStop(1, "rgba(220,220,216,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
  const ray = (dx, dy, L, w, a = 0.95) => {
    const gr = ctx.createLinearGradient(x, y, x + dx * L, y + dy * L);
    gr.addColorStop(0, `rgba(255,255,255,${a * ka})`); gr.addColorStop(0.7, `rgba(255,255,255,${0.45 * a * ka})`); gr.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gr; ctx.beginPath();
    ctx.moveTo(x - dy * w, y + dx * w); ctx.lineTo(x + dx * L, y + dy * L); ctx.lineTo(x + dy * w, y - dx * w); ctx.closePath(); ctx.fill();
  };
  const L = 122 * (0.3 + 0.7 * k);
  ray(1, 0, L, 3.6); ray(-1, 0, L, 3.6); ray(0, -1, 122 * (0.4 + 0.6 * k), 6.5, 1); ray(0, 1, 62 * (0.3 + 0.7 * k), 3.2);
  ray(0.7, -0.7, 34 * k, 1.6); ray(-0.7, 0.7, 34 * k, 1.6); ray(0.7, 0.7, 30 * k, 1.4); ray(-0.7, -0.7, 30 * k, 1.4);
  ctx.restore();
}
const GLINT = [[67.96, 0], [68.0, 0.15], [68.08, 0.3], [68.16, 0.5], [68.24, 0.7], [68.32, 0.9], [68.36, 1], [68.48, 1], [68.56, 0.9], [68.64, 0.75], [68.72, 0.6], [68.8, 0.45], [68.88, 0.3], [68.96, 0.15], [69.04, 0]];
function glintAt(t) {
  for (let i = 1; i < GLINT.length; i++) if (t <= GLINT[i][0] + 1e-6) { const [a, ka] = GLINT[i - 1], [b, kb] = GLINT[i]; return t < a ? 0 : ka + (kb - ka) * clamp((t - a) / (b - a)); }
  return 0;
}

// ---------------------------------------------------------------- the owl, with its motion effects
function drawOwlLayer(ctx, O, L) {
  const fx = O.fx;
  if (fx.spin) {
    // the whirl: the whole bird swept round a spin axis (16 copies over the frame's rotation), blurred together
    const [px, py, spread] = fx.spin, n = 18;
    const [sc, g] = scratch(0);
    for (let i = 0; i < n; i++) {
      const a = -spread / 2 + spread * (i + 0.5) / n;
      g.save(); g.globalAlpha = 0.16; g.translate(px, py); g.rotate(a); g.translate(-px, -py); g.drawImage(L.canvas, L.x, L.y, L.w, L.h); g.restore();
    }
    // the drawing itself stays faintly readable at the frame's centre angle
    g.save(); g.globalAlpha = 0.45; g.drawImage(L.canvas, L.x, L.y, L.w, L.h); g.restore();
    ctx.save(); ctx.filter = "blur(3px)"; ctx.drawImage(sc, 0, 0); ctx.restore();
  } else if (fx.blur) {
    // directional (horizontal) motion blur
    // directional motion blur: offset copies along the motion (dir, default horizontal), softened, plus a fainter
    // sharp copy so the drawing still reads through the smear
    const [sc, g] = scratch(0), n = fx.blur > 12 ? 15 : 9, dir = fx.dir ?? 0, cd = Math.cos(dir), sd = Math.sin(dir);
    for (let i = 0; i < n; i++) { const d = (i / (n - 1) - 0.5) * fx.blur * 2; g.save(); g.globalAlpha = 1.6 / n; g.drawImage(L.canvas, L.x + d * cd, L.y + d * sd, L.w, L.h); g.restore(); }
    ctx.save(); ctx.filter = `blur(${fx.blur > 12 ? 3 : 1.5}px)`; ctx.drawImage(sc, 0, 0); ctx.restore();
    ctx.save(); ctx.globalAlpha = fx.sharp ?? 0.5; ctx.drawImage(L.canvas, L.x, L.y, L.w, L.h); ctx.restore();
  } else ctx.drawImage(L.canvas, L.x, L.y, L.w, L.h);
}

// ---------------------------------------------------------------- draw
export const shot = {
  draw(ctx, local, t) {
    const L = build();
    // quantise to the source's frame grid; exact frame times map to themselves, a seek up to ~0.9 frame early (as the
    // snapshot tool does) still lands on the frame it was asked for
    const fr = Math.ceil(t * 25 - 0.05), tq = fr / 25;
    const cam = camAt(tq), B = !!cam;
    const at = (k) => Math.abs(tq - k) < 0.005;
    const O = owlAt(tq);
    ctx.save();
    if (B) ctx.setTransform(...cam);
    ctx.drawImage(L.room, -M, -M);
    if (!B && tq >= 65.56 - 1e-6) drawPuffs(ctx, tq);             // once the beating stops the cloud is behind the blades
    // the scissors leaning on the speaker until the grab (67.28 is the last frame they rest there), with their
    // dust and cobwebs until the owl cleans them
    if (tq < 67.3) { drawScissors(ctx, { ...SCISSORS_LEAN, grime: grimeAt(tq) }); drawCobwebs(ctx, webAt(tq)); }
    // the card, then the synth in front of it
    if (tq < 63.44 - 1e-6) { const q = cardQuad(tq); drawCardEdge(ctx, q); warpCard(ctx, L.card, q); }
    else ctx.drawImage(L.cardStatic, 0, 0);
    ctx.save();
    ctx.beginPath(); SYNTH_CLIP.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip();
    ctx.drawImage(L.synth, -M, -M);
    ctx.restore();
    if (!B && tq < 65.56 - 1e-6) drawPuffs(ctx, tq);
    ctx.restore();

    // B frame from here on (the owl's B keys are measured in B's own frame)
    if (at(67.32)) drawScissors(ctx, { x: 770, y: 505, rot: -0.2, s: 1, grime: 0 });
    if (at(67.36)) drawScissors(ctx, { x: 800, y: 430, rot: -0.12, s: 1, grime: 0 });
    const sm = SMEAR[+tq.toFixed(2)];
    if (sm) drawSmear(ctx, sm);
    else if (tq >= 67.8 - 1e-6) drawHeld(ctx, tq);
    const Lo = owlCached(O);
    if (O.inA && cam) { ctx.save(); ctx.setTransform(...cam); drawOwlLayer(ctx, O, Lo); ctx.restore(); }
    else drawOwlLayer(ctx, O, Lo);
    if (B) drawGlint(ctx, glintAt(tq));

    // 69.40: the one-frame light leak that carries the cut into s21 (measured lift vs 69.36, in 8-bit levels): a soft
    // band across the top (up to +100 at x 1200–1600, feathered over y 70–150), +25–35 down the left edge, +16…+70
    // down the right edge (strongest low down), a soft glow round (1300,40)
    if (fr === Math.round(69.4 * 25)) {
      const [sc, g] = scratch(0);
      const add = (v, a = 1) => `rgba(${v},${v},${v},${a})`;
      const TOP = [24, 46, 81, 81, 46, 74, 109, 98, 63, 18, 7, 6];
      const gx = g.createLinearGradient(0, 0, W, 0);
      TOP.forEach((v, i) => gx.addColorStop(Math.min(1, (i * 200 + 100) / W), add(v)));
      g.fillStyle = gx; g.fillRect(0, 0, W, 160);
      // feather the band's lower edge: multiply by a vertical alpha ramp (1 above y 70, 0 below y 150)
      g.globalCompositeOperation = "destination-in";
      const gv = g.createLinearGradient(0, 70, 0, 150); gv.addColorStop(0, "rgba(0,0,0,1)"); gv.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gv; g.fillRect(0, 0, W, 160);
      g.globalCompositeOperation = "source-over";
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.drawImage(sc, 0, 0);
      const gl = ctx.createLinearGradient(0, 0, 160, 0); gl.addColorStop(0, add(66)); gl.addColorStop(0.45, add(38)); gl.addColorStop(1, add(0));
      ctx.fillStyle = gl; ctx.fillRect(0, 90, 160, H - 90);
      const gr = ctx.createLinearGradient(2206, 0, 2046, 0); gr.addColorStop(0, add(1, 1)); gr.addColorStop(1, add(0));
      // right band: vertical profile times a horizontal fade
      const [sc2, g2] = scratch(1);
      const gy = g2.createLinearGradient(0, 110, 0, H); gy.addColorStop(0, add(10)); gy.addColorStop(0.4, add(26)); gy.addColorStop(0.75, add(70)); gy.addColorStop(1, add(44));
      g2.fillStyle = gy; g2.fillRect(2030, 90, 176, H - 90);
      g2.globalCompositeOperation = "destination-in";
      const gh = g2.createLinearGradient(2030, 0, 2180, 0); gh.addColorStop(0, "rgba(0,0,0,0)"); gh.addColorStop(1, "rgba(0,0,0,1)");
      g2.fillStyle = gh; g2.fillRect(2030, 0, 176, H);
      g2.globalCompositeOperation = "source-over";
      ctx.drawImage(sc2, 0, 0);
      const rg = ctx.createRadialGradient(1300, 40, 0, 1300, 40, 300); rg.addColorStop(0, add(20)); rg.addColorStop(1, add(0));
      ctx.fillStyle = rg; ctx.fillRect(1000, 0, 600, 340);
      ctx.restore();
    }
  },
  release() { C = null; releaseScissors(); releasePuffs(); },
};
