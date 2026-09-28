// s04 (19.12–23.12): the owl lands on his shoulder, then the camera arcs round his left side, past his profile,
// to over his shoulder at the laptop (MIXING DOWN on the screen). One continuous move in the source (no cut at
// either end: s02 runs into it and it runs on into s05).
//
// Measured beats (snapshots/s04-study, snapshots/s04-fix1-study):
//   19.12–19.56  2D pan, content moves (+157, −121) px, ease-out (camtrack, 0.04 s steps); the owl glides in, eyes shut
//   19.68        feet on the shoulder; 19.72 wings up; 19.76 eyes half open, 19.80 open; 19.84–20.20 wings fold
//   20.10–20.80  held still (frame diff = grain only)
//   20.84–23.12  the arc: camera orbits ~115° round his left side (fit: 14° → 131° about the head, rising, pitching
//                down); the laptop lid slides out left (20.9–21.9); his eyes swing from the owl to the lens 21.28–21.48;
//                profile ≈ 22.0–22.3; the speaker enters left 22.25; the laptop screen enters left 22.56
// Joins: before the arc the picture is s02's own world (its engraved room, imported live, and its designer drawing,
// copied into s04/designer02.js), carried on by the measured pan from s02's last camera offset, so 19.12 → 19.16 is
// only camera motion. Key A of the arc morph is that same drawing.
// Layers: room → designer (key drawings A–E warped along measured landmark tracks, hard switches between keys) →
// pencil (per frame) → owl (one continuous build) → laptop lid (in front of him until ~22.3).
import { W, H } from "../config.js";
import { makePlate, maskTo } from "./s04/kit.js";
import { paintFigure } from "./s04/figure.js";
import { SPEC_B, SIL_B } from "./s04/keyB.js";
import { SPEC_C, SIL_C, SPEC_D, SIL_D, SPEC_E, SIL_E } from "./s04/keyCDE.js";
import { SPANS } from "./s04/tracks.js";
import { Warper, mlsGrid, mlsPoints } from "./s04/morph.js";
import { camAt, drawRoom, drawLaptop, roomBlur, releaseRoom, drawBackdrop } from "./s04/room.js";
import { landing, carried, drawOwlState } from "./s04/owl.js";
import { drawPencil, pencilAt } from "./s04/pencil.js";
import { room02, worldOff, HOLD, smearAt, paintKeyA02, paintEyes02, keyCanvasA, drawLid02, releaseWorld02 } from "./s04/world02.js";

const TA = 20.84;                    // the arc starts here; before it the picture only pans
const M = 180;                       // key canvas margin (px)

// key drawings: the time each is drawn at, and the hard switch time between consecutive keys (never two keys at once)
const KEYS = { A: 20.84, B: 21.64, C: 22.04, D: 22.48, E: 23.04 };
const SPAN_LIST = [
  { key: "20.84-21.64", a: "A", b: "B", cut: 21.52 },
  { key: "21.64-22.04", a: "B", b: "C", cut: 21.86 },
  { key: "22.04-22.48", a: "C", b: "D", cut: 22.26 },
  { key: "22.48-23.04", a: "D", b: "E", cut: 22.76 },
  { key: "23.04-23.12", a: "E", b: "E", cut: 99 },
];
const sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

let C = null;
function keyCanvas(paint, sil) {
  const P = makePlate(W, H, M, paint);
  const cut = P.engrave({ spacing: 4.2, seed: 7, contrast: 1.0 });
  return maskTo(cut, M, sil, 1.5, null);
}
function build() {
  if (C) return C;
  C = {
    keys: {
      A: keyCanvasA(M, paintKeyA02),
      B: keyCanvas((P) => paintFigure(P, SPEC_B), SIL_B),
      C: keyCanvas((P) => paintFigure(P, SPEC_C), SIL_C),
      D: keyCanvas((P) => paintFigure(P, SPEC_D), SIL_D),
      E: keyCanvas((P) => paintFigure(P, SPEC_E), SIL_E),
    },
    eyes: null, eyesLook: -1,
    warper: new Warper(W, H),
    owlC: document.createElement("canvas"),
    scratch: null,
    spans: {},
  };
  for (const [k, s] of Object.entries(SPANS)) {
    const rows = s.rows.map((r) => Float32Array.from(r));
    C.spans[k] = { ...s, rows };
  }
  return C;
}
// key A's eyes (a separate layer: the irises swing from the owl to the lens at 21.28–21.48)
function eyesLayer(look) {
  const q = Math.round(look * 8) / 8;
  if (C.eyes && C.eyesLook === q) return C.eyes;
  if (C.eyes) C.warper.forget(C.eyes);
  C.eyes = keyCanvasA(M, (g) => paintEyes02(g, q));
  C.eyesLook = q;
  return C.eyes;
}
const glanceLook = (t) => 1 - sm((t - 21.28) / 0.2);

// landmark positions of a span at time t (row interpolation)
function spanRow(S, t) {
  const f = (t - S.t0) / 0.04, i = Math.max(0, Math.min(S.rows.length - 1, Math.floor(f))), j = Math.min(S.rows.length - 1, i + 1), u = Math.max(0, Math.min(1, f - i));
  const a = S.rows[i], b = S.rows[j], out = new Float32Array(a.length);
  for (let k = 0; k < a.length; k++) out[k] = a[k] + (b[k] - a[k]) * u;
  return out;
}
// the grid mapping a key canvas (drawn at key time tk) to frame time t, chaining span warps between tk and t
function keyGrid(tk, t) {
  const c = C.keys.A;
  const cw = c.width, ch = c.height;
  let grid = null;
  const legs = [];
  const spans = SPAN_LIST.map((s) => C.spans[s.key]);
  if (t >= tk) { for (const S of spans) { if (S.t1 <= tk + 1e-6 || S.t0 >= t - 1e-6) continue; legs.push([S, Math.max(S.t0, tk), Math.min(S.t1, t)]); } }
  else { for (const S of spans.slice().reverse()) { if (S.t0 >= tk - 1e-6 || S.t1 <= t + 1e-6) continue; legs.push([S, Math.min(S.t1, tk), Math.max(S.t0, t)]); } }
  for (const [S, from, to] of legs) {
    const src = spanRow(S, from), dst = spanRow(S, to);
    if (!grid) grid = mlsGrid(src, dst, cw, ch, M);
    else {
      const pts = []; for (let k = 0; k < grid.pos.length; k += 2) pts.push([grid.pos[k], grid.pos[k + 1]]);
      const q = mlsPoints(src, dst, pts);
      q.forEach((p, k) => { grid.pos[2 * k] = p[0]; grid.pos[2 * k + 1] = p[1]; });
    }
  }
  if (!grid) grid = mlsGrid(new Float32Array([0, 0, 1000, 0, 0, 1000]), new Float32Array([0, 0, 1000, 0, 0, 1000]), cw, ch, M);
  return grid;
}
// which key is on screen at t: one key only, switching hard at each span's cut time
function keyAt(t) {
  let k = "A";
  for (const s of SPAN_LIST) if (t >= s.cut) k = s.b;
  return k;
}
function drawDesigner(ctx, t) {
  const Wp = C.warper;
  Wp.clear();
  const k = keyAt(t);
  const g = keyGrid(KEYS[k], t);
  Wp.draw(C.keys[k], g, 1);
  if (k === "A") Wp.draw(eyesLayer(glanceLook(t)), g, 1);
  ctx.drawImage(Wp.c, 0, 0);
}

// the s02 world (room, figure, eyes, pencil, lid) at the world offset o
function drawWorld(g, t, o) {
  const R = room02();
  g.drawImage(R.c, R.x0 + o[0], R.y0 + o[1]);
  const dx = o[0] - HOLD[0], dy = o[1] - HOLD[1];
  g.drawImage(C.keys.A, -M + dx, -M + dy);
  g.drawImage(eyesLayer(1), -M + dx, -M + dy);
  g.save(); g.translate(dx, dy); drawPencil(g, pencilAt(TA)); g.restore();
  drawLid02(g, o[0], o[1]);
}

export const shot = {
  draw(ctx, local, t) {
    build();
    if (t < TA) {
      // ---- the landing: s02's world under the measured pan, smeared along the pan as the source is
      const o = worldOff(t), sm0 = smearAt(t);
      if (sm0.len < 2) drawWorld(ctx, t, o);
      else {
        const m = Math.ceil(sm0.len) + 4;
        if (!C.scratch) C.scratch = document.createElement("canvas");
        const S = C.scratch;
        if (S.width !== W + 2 * m || S.height !== H + 2 * m) { S.width = W + 2 * m; S.height = H + 2 * m; }
        const sg = S.getContext("2d");
        sg.setTransform(1, 0, 0, 1, 0, 0); sg.globalCompositeOperation = "source-over"; sg.globalAlpha = 1;
        sg.fillStyle = "#000"; sg.fillRect(0, 0, S.width, S.height);
        drawWorld(sg, t, [o[0] + m, o[1] + m]);
        const N = Math.min(8, 2 + Math.round(sm0.len / 2));
        const bh = Math.hypot(sm0.d[0], sm0.d[1]) || 1, ux = sm0.d[0] / bh, uy = sm0.d[1] / bh;
        ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 1 / N;
        for (let k = 0; k < N; k++) { const s = (k / (N - 1) - 0.5) * sm0.len; ctx.drawImage(S, -m + ux * s, -m + uy * s); }
        ctx.restore();
      }
      drawOwlState(ctx, landing(t), C.owlC);
      return;
    }
    // ---- the arc
    const cam = camAt(t);
    drawRoom(ctx, cam, roomBlur(t));
    drawBackdrop(ctx, cam, t, room02(), HOLD);
    const lapFront = t < 22.3;
    if (!lapFront) drawLaptop(ctx, cam, t);
    drawDesigner(ctx, t);
    drawPencil(ctx, pencilAt(t));
    drawOwlState(ctx, carried(t), C.owlC);
    if (lapFront) drawLaptop(ctx, cam, t);
  },
  release() { C = null; releaseRoom(); releaseWorld02(); },
};
