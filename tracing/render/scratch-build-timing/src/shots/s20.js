// s20 (63.12–69.44): the wide room. Two locked-off setups (camtrack: s = 1.0000, no drift within each):
//   A 63.12–66.84  the owl props the note card against the synth, turns, runs to the big scissors leaning on the
//                  speaker, flaps at them in a cloud of dust, retreats and stares at them;
//   B 66.84–69.44  the same drawing re-framed (measured affine vs A: x' = 0.9841x + 0.0015y + 0.3,
//                  y' = −0.0015x + 0.9841y − 11.45; residual ≈ 1 px): the owl lunges, grabs the scissors, a whirl of
//                  motion blur, then holds them up with a glint and a smirk, one wing on its hip.
//   69.40 (last frame) is a light-leak flash into s21.
// Everything is drawn: the room is one engraved plate (painted without the scissors, which are a separate
// Canvas2D prop so the owl can take them), the card is the notecard lib warped onto measured perspective quads.
import { W, H } from "../config.js";
import { Plate } from "../lib/engrave.js";
import { clamp, lerp } from "../lib/rng.js";
import { owlLayer } from "../lib/owlInk.js";
import { noteCardCanvas, CARD_W, CARD_H } from "../lib/notecard.js";
import { paintRoom, paintSynth, SYNTH_CLIP } from "./s20/room.js";
import { drawScissors, SCISSORS_LEAN } from "./s20/scissors.js";
import { owlAt } from "./s20/owl.js";
import { drawPuffs } from "./s20/puffs.js";

const CUT = 66.84;
const M = 60;                                             // plate margin (setup B shrinks the plate by 1.6 %)
const AFF_B = [0.9841, -0.0015, 0.0015, 0.9841, 0.3, -11.45]; // canvas setTransform(a,b,c,d,e,f) for setup B

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
  // the static card (after the push) pre-warped onto its own layer
  const cardStatic = document.createElement("canvas"); cardStatic.width = W; cardStatic.height = H;
  const cg = cardStatic.getContext("2d");
  drawCardEdge(cg, CARD_Q1); warpCard(cg, card, CARD_Q1);
  C = { room, synth, card, cardStatic, owls: new Map(), scratch: document.createElement("canvas") };
  return C;
}

function owlLayerCached(key, optsFn) {
  const m = C.owls;
  if (!m.has(key)) {
    if (m.size > 48) m.delete(m.keys().next().value);
    m.set(key, owlLayer(optsFn()));
  }
  return m.get(key);
}

// ---------------------------------------------------------------- the scissors' timeline
// lean (A, and B until the grab) -> 67.32 wrenched off the speaker -> 67.36 held upright -> 67.40–67.68 swung
// round (smears) -> 67.72 raised (vertical smear) -> 67.80 held up behind the head (HELD), glint 67.92–69.00.
// Smear keys: [hand x, hand y, from angle, to angle, alpha] — the blade direction sweeps about the hand (B frame).
const SMEAR = {
  67.4: [880, 480, -1.9, -1.3, 1], 67.44: [1000, 380, -2.9, -0.8, 1], 67.48: [1060, 330, -2.6, 0.3, 1],
  67.52: [1150, 440, -1.8, -1.2, 1], 67.56: [1150, 440, -1.8, -1.2, 1], 67.6: [1230, 470, -1.65, -1.2, 1],
  67.64: [1100, 400, -2.4, -1.7, 1], 67.68: [900, 430, -0.7, -0.3, 1, 0.6], 67.72: [870, 520, -1.4, -1.1, 1, 0.7], 67.76: [855, 560, -1.05, -0.85, 1, 0.85],
};
const GRIP = [6.5, -209];            // local point between the loops, where a wing holds them
function scissorsAt(dirAngle, hand, extra = {}) {
  // blade direction angle (radians, frame) -> rot; place the scissors so GRIP sits on the hand
  const rot = dirAngle - Math.PI / 2, c = Math.cos(rot), s = Math.sin(rot), sc = extra.s ?? 1;
  const gx = GRIP[0] * sc, gy = GRIP[1] * sc * (extra.ringY ?? 1);
  return { x: hand[0] - (gx * c - gy * s), y: hand[1] - (gx * s + gy * c), rot, s: sc, ...extra };
}
// held up behind the head (68.40): loops centred (860,615), blades up at -52.5° to the tips at ≈ (1252,100)
const HELD = scissorsAt(-0.9, [858, 588], { ringY: 0.72, blade: 1.55, open: 0.06 });
function drawGlint(ctx, k) {
  if (k <= 0) return;
  const x = 1170, y = 157;
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const R = 64 * (0.35 + 0.65 * k);
  const g = ctx.createRadialGradient(x, y, 0, x, y, R);
  g.addColorStop(0, `rgba(255,255,255,${0.95 * k})`); g.addColorStop(0.25, `rgba(250,250,246,${0.75 * k})`); g.addColorStop(0.6, `rgba(230,230,226,${0.25 * k})`); g.addColorStop(1, "rgba(220,220,216,0)");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
  const ray = (dx, dy, L, w) => {
    const gr = ctx.createLinearGradient(x, y, x + dx * L, y + dy * L);
    gr.addColorStop(0, `rgba(255,255,255,${0.9 * k})`); gr.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gr; ctx.beginPath();
    ctx.moveTo(x - dy * w, y + dx * w); ctx.lineTo(x + dx * L, y + dy * L); ctx.lineTo(x + dy * w, y - dx * w); ctx.closePath(); ctx.fill();
  };
  const L = 122 * (0.3 + 0.7 * k), V = 125 * (0.3 + 0.7 * k);
  ray(1, 0, L, 3.4); ray(-1, 0, L, 3.4); ray(0, -1, V, 2.8); ray(0, 1, V * 0.5, 2.8);
  ray(0.7, -0.7, 34 * k, 1.6); ray(-0.7, 0.7, 34 * k, 1.6); ray(0.7, 0.7, 30 * k, 1.4); ray(-0.7, -0.7, 30 * k, 1.4);
  ctx.restore();
}
const GLINT = [[67.88, 0], [67.92, 0.15], [68.0, 0.3], [68.08, 0.5], [68.16, 0.7], [68.24, 0.9], [68.32, 1], [68.4, 1], [68.48, 0.95], [68.56, 0.9], [68.64, 0.75], [68.72, 0.6], [68.8, 0.5], [68.88, 0.35], [68.96, 0.2], [69.04, 0]];
function glintAt(t) {
  for (let i = 1; i < GLINT.length; i++) if (t <= GLINT[i][0] + 1e-6) { const [a, ka] = GLINT[i - 1], [b, kb] = GLINT[i]; return t < a ? 0 : ka + (kb - ka) * clamp((t - a) / (b - a)); }
  return 0;
}

// ---------------------------------------------------------------- draw
export const shot = {
  draw(ctx, local, t) {
    const L = build();
    // quantise to the source's frame grid (the source animates on ones/twos; renders land on exact frames)
    // frame index: exact frame times map to themselves; a seek up to ~0.9 frame early (as the snapshot tool does)
    // still lands on the frame it was asked for
    const fr = Math.ceil(t * 25 - 0.05), tq = fr / 25;
    const B = tq >= CUT - 1e-6;
    const at = (k) => Math.abs(tq - k) < 0.005;
    ctx.save();
    if (B) ctx.setTransform(...AFF_B);
    ctx.drawImage(L.room, -M, -M);
    // scissors leaning on the speaker until the grab (67.28 is the last frame they rest there)
    if (tq < 67.3) drawScissors(ctx, SCISSORS_LEAN);
    else if (at(67.32)) drawScissors(ctx, { x: 775, y: 513, rot: -0.14, s: 1 });
    // the card, then the synth in front of it
    if (tq < 63.44 - 1e-6) { const q = cardQuad(tq); drawCardEdge(ctx, q); warpCard(ctx, L.card, q); }
    else ctx.drawImage(L.cardStatic, 0, 0);
    ctx.save();
    ctx.beginPath(); SYNTH_CLIP.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip();
    ctx.drawImage(L.synth, -M, -M);
    ctx.restore();
    ctx.restore();

    if (!B) drawPuffs(ctx, tq, "back");
    // held scissors go behind the owl (the head covers the blades, the wing grips the shank)
    if (at(67.36)) drawScissors(ctx, { x: 795, y: 440, rot: -0.12, s: 1 });
    const sm = SMEAR[+tq.toFixed(2)];
    if (sm) {
      // motion smear: the scissors swept through [a0, a1] about the hand, drawn soft on a scratch layer
      const [hx, hy, a0, a1, al, solid = 0] = sm, n = 16;
      const sc = L.scratch; if (sc.width !== W) { sc.width = W; sc.height = H; }
      const g = sc.getContext("2d"); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
      for (let i = 0; i < n; i++) {
        const a = a0 + (a1 - a0) * (i + 0.5) / n;
        drawScissors(g, scissorsAt(a, [hx, hy], { alpha: 0.2, blade: 1.45, ringY: 0.75, grime: 0 }));
      }
      ctx.save(); ctx.filter = `blur(${solid ? 4 : 7}px)`; ctx.globalAlpha = 0.85 * al; ctx.drawImage(sc, 0, 0); ctx.restore();
      if (solid) drawScissors(ctx, scissorsAt(a1, [hx, hy], { alpha: solid, blade: 1.45, ringY: 0.75, grime: 0 }));
    } else if (tq >= 67.8 - 1e-6) drawScissors(ctx, HELD);
    const O = owlAt(tq);
    O.draw(ctx, { layer: owlLayerCached });
    if (!B) drawPuffs(ctx, tq, "front");
    if (B) drawGlint(ctx, glintAt(tq));

    // 69.40: the one-frame light leak that carries the cut into s21 (measured lift vs 69.36, in 8-bit levels):
    // a band across the top (y 0–120, sharp lower edge, up to +100 at x 1200–1600), +25–35 down the left edge,
    // +16…+70 down the right edge (strongest low down)
    if (fr === Math.round(69.4 * 25)) {
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const add = (v) => `rgb(${v},${v},${v})`;
      const TOP = [24, 46, 81, 81, 46, 74, 109, 98, 63, 18, 7, 6];
      const gx = ctx.createLinearGradient(0, 0, W, 0);
      TOP.forEach((v, i) => gx.addColorStop(Math.min(1, (i * 200 + 100) / W), add(v)));
      ctx.fillStyle = gx; ctx.fillRect(0, 0, W, 116);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 116, W, 12); ctx.clip();
      ctx.globalAlpha = 0.5; ctx.fillStyle = gx; ctx.fillRect(0, 116, W, 12); ctx.restore();
      const gl = ctx.createLinearGradient(0, 0, 210, 0); gl.addColorStop(0, add(66)); gl.addColorStop(0.5, add(40)); gl.addColorStop(1, add(0));
      ctx.fillStyle = gl; ctx.fillRect(0, 116, 210, H - 116);
      const gr = ctx.createLinearGradient(0, 120, 0, H); gr.addColorStop(0, add(10)); gr.addColorStop(0.4, add(26)); gr.addColorStop(0.75, add(70)); gr.addColorStop(1, add(44));
      ctx.save(); ctx.beginPath(); ctx.rect(1990, 116, 216, H); ctx.clip();
      ctx.fillStyle = gr; ctx.fillRect(1990, 116, 216, H);
      ctx.restore();
      ctx.restore();
    }
  },
  release() { C = null; },
};
