// s15 texture atlas: every surface picture of the corridor, drawn in code into one 2048² canvas.
// Channels: R = value (how bright the surface is before light), G = ink (dark marks that stay black whatever the
// engraving does), B = unused. Engraved faces (cardboard, floor) keep R gentle and let the shader cut the lines;
// "picture" faces (keyboards, gear, the speaker) are drawn finished and shown as flat tone.
import { rng } from "../../lib/rng.js";
import * as GEAR from "./gear.js";

// (fix 2: the atlas is 4096² (cells 512 px) and every picture is drawn at 2x its 256-unit layout, so the gear pictures
// keep their fine strokes on the large faces of the gear room)
export const AT = 4096;
const CELL = 512;
const DS = 2;
// name -> [col, row, wCells, hCells]
const LAYOUT = {
  card0: [0, 0, 1, 1], card1: [1, 0, 1, 1], card2: [2, 0, 1, 1], card3: [3, 0, 1, 1], card4: [4, 0, 1, 1], card5: [5, 0, 1, 1],
  side0: [6, 0, 1, 1], side1: [7, 0, 1, 1], top0: [0, 1, 1, 1], top1: [1, 1, 1, 1], plain: [2, 1, 1, 1], dark: [3, 1, 1, 1],
  floor: [4, 1, 2, 2], wood: [6, 1, 1, 1], woodv: [7, 1, 1, 1],
  keys: [0, 2, 4, 1], kbbody: [0, 3, 4, 1], deck: [6, 3, 2, 1], deck2: [6, 4, 2, 1],
  shelfA: [0, 4, 2, 2], shelfB: [2, 4, 2, 2], speaker: [4, 4, 2, 2], synth: [4, 3, 2, 1], monitor: [6, 5, 1, 1], cables: [7, 5, 1, 1],
  shelfC: [0, 6, 2, 2], shelfD: [2, 6, 2, 2], rackE: [4, 6, 2, 2], gear: [6, 6, 2, 1], boxwall: [6, 7, 2, 1], coil: [6, 2, 2, 1],
  // (fix 2: take I's speaker, measured on its own quads; drawn over the unused card0/card1/top0/top1 cells)
  speakerI: [0, 0, 2, 2],
};
// (the same cell sampled upright on a face whose uv has v = 0 at the bottom edge: pictures drawn with canvas y down)
export function rectUp(name) { const r = rect(name); return [r[0], r[1] + r[3], r[2], -r[3]]; }
export function rect(name) {
  const [c, r, w, h] = LAYOUT[name];
  const p = 3 / AT;   // inset against mip bleed
  return [c * CELL / AT + p, r * CELL / AT + p, w * CELL / AT - 2 * p, h * CELL / AT - 2 * p];
}

let ATLAS = null;
export function buildAtlas() {
  if (ATLAS) return ATLAS;
  const val = document.createElement("canvas"); val.width = val.height = AT;
  const ink = document.createElement("canvas"); ink.width = ink.height = AT;
  const v = val.getContext("2d"), k = ink.getContext("2d");
  v.fillStyle = "#fff"; v.fillRect(0, 0, AT, AT);
  k.fillStyle = "#000"; k.fillRect(0, 0, AT, AT);
  const cell = (name, fn) => {
    const [c, r, w, h] = LAYOUT[name];
    const X = c * CELL, Y = r * CELL, Wd = w * CELL, Hd = h * CELL;
    // (fix 2: a cell drawn again (the gear pictures redrawn over their older versions) starts clean in both channels:
    // the old picture's ink outlines were showing through the new one as black rectangles)
    v.fillStyle = "#fff"; v.fillRect(X, Y, Wd, Hd); k.fillStyle = "#000"; k.fillRect(X, Y, Wd, Hd);
    for (const g of [v, k]) { g.save(); g.beginPath(); g.rect(X, Y, Wd, Hd); g.clip(); g.translate(X, Y); g.scale(DS, DS); }
    fn(v, k, Wd / DS, Hd / DS);
    v.restore(); k.restore();
  };
  const G = (x) => { const c = Math.round(Math.max(0, Math.min(1, x)) * 255); return `rgb(${c},${c},${c})`; };
  const inkW = (a) => `rgba(255,255,255,${a})`;
  // ---- cardboard faces: soft value, flap seam, handle hole / label outline, a few streaks
  const cardFace = (seed, o = {}) => (g, q, W, H) => {
    const r = rng(seed);
    const base = o.base ?? 0.9;
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, G(base - 0.06)); gr.addColorStop(0.5, G(base)); gr.addColorStop(1, G(base - 0.1));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    // brush streaks (horizontal), mostly darker
    g.filter = "blur(2px)";
    for (let i = 0; i < 16; i++) {
      const y = r() * H, h = 2 + r() * 6;
      g.fillStyle = G(base - 0.06 - r() * 0.16); g.globalAlpha = 0.15 + r() * 0.2;
      g.fillRect(r() * W * 0.3, y, W * (0.4 + r() * 0.6), h);
    }
    g.filter = "none"; g.globalAlpha = 1;
    // corner darkening
    const vg = g.createRadialGradient(W / 2, H / 2, W * 0.2, W / 2, H / 2, W * 0.75);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.18)");
    g.fillStyle = vg; g.fillRect(0, 0, W, H);
    q.lineCap = "round";
    // flap seam near the top
    if (o.seam !== false) { q.strokeStyle = inkW(0.3); q.lineWidth = 2; q.beginPath(); q.moveTo(0, H * (o.seamY ?? 0.12)); q.lineTo(W, H * (o.seamY ?? 0.12) + (r() - 0.5) * 4); q.stroke(); }
    // handle hole or label: a rounded rectangle outline
    if (o.hole !== false) {
      const hw = W * (o.hw ?? 0.16), hh = H * (o.hh ?? 0.22);
      const hx = W * (o.hx ?? 0.5) - hw / 2, hy = H * (o.hy ?? 0.3) - hh / 2;
      q.strokeStyle = inkW(0.42); q.lineWidth = 2.2;
      q.beginPath(); q.roundRect(hx, hy, hw, hh, 3); q.stroke();
      g.fillStyle = G(base + 0.04); g.fillRect(hx + 2, hy + 2, hw - 4, hh - 4);
    }
    if (o.tape) { g.fillStyle = G(base - 0.18); g.globalAlpha = 0.5; g.fillRect(W * 0.44, 0, W * 0.12, H); g.globalAlpha = 1; q.strokeStyle = inkW(0.35); q.lineWidth = 1.5; q.beginPath(); q.moveTo(W * 0.44, 0); q.lineTo(W * 0.44, H); q.moveTo(W * 0.56, 0); q.lineTo(W * 0.56, H); q.stroke(); }
    if (o.scrawl) { q.strokeStyle = inkW(0.6); q.lineWidth = 2; for (let i = 0; i < 3; i++) { q.beginPath(); const y = H * (0.6 + i * 0.08); q.moveTo(W * 0.2, y); for (let x = 0; x < 6; x++) q.lineTo(W * (0.2 + x * 0.06), y + (r() - 0.5) * 10); q.stroke(); } }
  };
  cell("card0", cardFace(11, { hy: 0.28, hw: 0.13, hh: 0.2 }));
  cell("card1", cardFace(12, { hy: 0.32, hx: 0.5, hw: 0.18, hh: 0.14, tape: true }));
  cell("card2", cardFace(13, { hole: false, seamY: 0.1 }));
  cell("card3", cardFace(14, { hy: 0.24, hx: 0.62, hw: 0.12, hh: 0.26, base: 0.86 }));
  cell("card4", cardFace(15, { hy: 0.3, hx: 0.4, hw: 0.2, hh: 0.16, seam: false }));
  cell("card5", cardFace(16, { hole: false, tape: true, base: 0.84 }));
  cell("side0", cardFace(17, { hy: 0.2, hw: 0.1, hh: 0.3, seam: false }));
  cell("side1", cardFace(18, { hole: false, seam: false, base: 0.88 }));
  cell("top0", (g, q, W, H) => { cardFace(19, { hole: false, seamY: 0.5, base: 0.92 })(g, q, W, H); q.strokeStyle = inkW(0.5); q.lineWidth = 2; q.beginPath(); q.moveTo(W / 2, 0); q.lineTo(W / 2, H); q.stroke(); });
  cell("top1", cardFace(20, { hole: false, seam: false, tape: true, base: 0.93 }));
  cell("plain", (g, q, W, H) => { g.fillStyle = G(0.9); g.fillRect(0, 0, W, H); });
  cell("dark", (g, q, W, H) => { g.fillStyle = G(0.25); g.fillRect(0, 0, W, H); });
  // ---- floor boards: long planks with seams and grain (u across the corridor, v along it)
  cell("floor", (g, q, W, H) => {
    // worn boards: mid-grey with long dark wavy grain running across the corridor (u), lighter scuffs
    const r = rng(31);
    g.fillStyle = G(0.78); g.fillRect(0, 0, W, H);
    g.filter = "blur(8px)";
    for (let i = 0; i < 30; i++) { g.fillStyle = G(0.6 + r() * 0.4); g.globalAlpha = 0.5; g.fillRect(r() * W - 60, r() * H, 80 + r() * 260, 10 + r() * 24); }
    g.filter = "none"; g.globalAlpha = 1;
    for (let i = 0; i < 70; i++) {
      const y = r() * H, amp = 2 + r() * 6, ph = r() * 6, len = W * (0.2 + r() * 0.6), x0 = r() * W - len * 0.3;
      g.strokeStyle = G(0.18 + r() * 0.3); g.globalAlpha = 0.35 + r() * 0.4; g.lineWidth = 1 + r() * 3;
      g.beginPath();
      for (let x = 0; x <= len; x += 8) { const yy = y + Math.sin(x * 0.03 + ph) * amp; if (x === 0) g.moveTo(x0 + x, yy); else g.lineTo(x0 + x, yy); }
      g.stroke();
    }
    g.globalAlpha = 1;
  });
  cell("wood", (g, q, W, H) => {
    const r = rng(41);
    g.fillStyle = G(0.62); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { const y = r() * H; g.strokeStyle = G(0.3 + r() * 0.5); g.lineWidth = 1 + r() * 2.5; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(W * 0.3, y + (r() - 0.5) * 8, W * 0.7, y + (r() - 0.5) * 8, W, y + (r() - 0.5) * 6); g.stroke(); }
  });
  cell("woodv", (g, q, W, H) => {
    const r = rng(43);
    g.fillStyle = G(0.6); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { const x = r() * W; g.strokeStyle = G(0.3 + r() * 0.5); g.lineWidth = 1 + r() * 2.5; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 8, H * 0.3, x + (r() - 0.5) * 8, H * 0.7, x + (r() - 0.5) * 6, H); g.stroke(); }
  });
  // ---- keyboard: a 61-key strip seen from above (u = along the keyboard, v = key length); flat picture
  cell("keys", (g, q, W, H) => {
    g.fillStyle = G(0.14); g.fillRect(0, 0, W, H);
    // panel strip with buttons and two screens along the top 38%
    const py = H * 0.38;
    g.fillStyle = G(0.22); g.fillRect(0, 0, W, py);
    g.fillStyle = G(0.45);
    for (let i = 0; i < 26; i++) { g.fillRect(40 + i * 34, py * 0.25, 18, py * 0.22); }
    g.fillStyle = G(0.72); g.fillRect(W * 0.08, py * 0.58, W * 0.07, py * 0.3); g.fillRect(W * 0.2, py * 0.58, W * 0.05, py * 0.3);
    g.strokeStyle = G(0.05); g.lineWidth = 3; g.strokeRect(W * 0.08, py * 0.58, W * 0.07, py * 0.3);
    // white keys
    // (fix 1b: 20 keys along the strip, not 36: on the source's leaning keyboards (41.92, 45.40) a white key is
    // ~45-50 px across where the 36-key picture gave ~27 px, which read as a barcode)
    const n = 20, x0 = W * 0.03, x1 = W * 0.985, kw = (x1 - x0) / n;
    const ky = py + 8, kh = H - ky - 10;
    g.fillStyle = G(0.96); g.fillRect(x0, ky, x1 - x0, kh);
    g.strokeStyle = G(0.12); g.lineWidth = 2.4;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(x0 + i * kw, ky); g.lineTo(x0 + i * kw, ky + kh); g.stroke(); }
    // black keys
    g.fillStyle = G(0.05);
    for (let i = 0; i < n - 1; i++) { const m = i % 7; if (m === 2 || m === 6) continue; g.fillRect(x0 + (i + 0.7) * kw, ky, kw * 0.6, kh * 0.58); }
    // the casing: a dark lip along the keys' front edge, dark ends
    g.fillStyle = G(0.1); g.fillRect(0, H - 12, W, 12); g.fillRect(0, py, x0, H - py); g.fillRect(x1, py, W - x1, H - py);
    g.strokeStyle = G(0.05); g.lineWidth = 4; g.strokeRect(2, 2, W - 4, H - 4);
  });
  cell("kbbody", (g, q, W, H) => { g.fillStyle = G(0.3); g.fillRect(0, 0, W, H); g.fillStyle = G(0.45); g.fillRect(0, 0, W, H * 0.2); g.strokeStyle = G(0.05); g.lineWidth = 4; g.strokeRect(2, 2, W - 4, H - 4); });
  // ---- tape deck / hi-fi unit fronts
  const deck = (seed) => (g, q, W, H) => {
    const r = rng(seed);
    g.fillStyle = G(0.72); g.fillRect(0, 0, W, H);
    g.strokeStyle = G(0.1); g.lineWidth = 4; g.strokeRect(4, 4, W - 8, H - 8);
    g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(8, H * 0.42); g.lineTo(W - 8, H * 0.42); g.stroke();
    g.fillStyle = G(0.12); g.fillRect(W * 0.3, H * 0.55, W * 0.4, H * 0.25); g.fillRect(W * 0.34, H * 0.14, W * 0.2, H * 0.16);
    g.fillStyle = G(0.9); g.fillRect(W * 0.33, H * 0.6, W * 0.34, H * 0.1);
    for (let i = 0; i < 4; i++) { g.strokeRect(W * 0.06, H * (0.52 + i * 0.1), W * 0.08, H * 0.06); }
    for (let i = 0; i < 5; i++) { g.fillStyle = G(0.2 + r() * 0.3); g.fillRect(W * (0.74 + i * 0.045), H * 0.6, W * 0.03, H * 0.1); }
  };
  cell("deck", deck(51));
  cell("deck2", deck(52));
  // ---- synth on a shelf (angled front panel with knobs and a short keybed)
  cell("synth", (g, q, W, H) => {
    g.fillStyle = G(0.26); g.fillRect(0, 0, W, H);
    g.fillStyle = G(0.5); g.fillRect(0, 0, W, H * 0.45);
    g.fillStyle = G(0.1);
    for (let i = 0; i < 14; i++) for (let j = 0; j < 2; j++) { g.beginPath(); g.arc(30 + i * 32, 22 + j * 34, 9, 0, Math.PI * 2); g.fill(); }
    const ky = H * 0.55, n = 24, kw = (W - 20) / n;
    g.fillStyle = G(0.92); g.fillRect(10, ky, W - 20, H - ky - 8);
    g.strokeStyle = G(0.1); g.lineWidth = 2; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(10 + i * kw, ky); g.lineTo(10 + i * kw, H - 8); g.stroke(); }
    g.fillStyle = G(0.06); for (let i = 0; i < n; i++) { const m = i % 7; if (m === 2 || m === 6) continue; g.fillRect(10 + (i + 0.68) * kw, ky, kw * 0.64, (H - ky) * 0.55); }
  });
  cell("monitor", (g, q, W, H) => { g.fillStyle = G(0.8); g.fillRect(0, 0, W, H); g.fillStyle = G(0.08); g.fillRect(W * 0.1, H * 0.1, W * 0.8, H * 0.7); g.strokeStyle = G(0.1); g.lineWidth = 5; g.strokeRect(4, 4, W - 8, H - 8); });
  cell("cables", (g, q, W, H) => {
    const r = rng(61); g.fillStyle = G(0.12); g.fillRect(0, 0, W, H);
    g.strokeStyle = G(0.7); g.lineWidth = 3;
    for (let i = 0; i < 10; i++) { g.beginPath(); g.ellipse(W * (0.3 + r() * 0.4), H * (0.4 + r() * 0.3), W * (0.15 + r() * 0.2), H * (0.1 + r() * 0.2), r() * 3, 0, Math.PI * 2); g.stroke(); }
  });
  // ---- shelving units (front view): wooden frame, two/three shelves, gear in each bay
  const shelf = (seed, bays) => (g, q, W, H) => {
    const r = rng(seed);
    g.fillStyle = G(0.24); g.fillRect(0, 0, W, H);
    // the back of each bay: dark wood grain
    for (let i = 0; i < 50; i++) { const x = r() * W; g.strokeStyle = G(0.12 + r() * 0.2); g.lineWidth = 1 + r() * 3; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 6, H); g.stroke(); }
    const post = W * 0.07, board = H * 0.045;
    const ys = bays.map((_, i) => (i * H) / bays.length);
    bays.forEach((b, i) => {
      const y0 = ys[i] + board, y1 = (i + 1 < bays.length ? ys[i + 1] : H) - 2;
      const bx0 = post + 8, bx1 = W - post - 8, bw = bx1 - bx0, bh = y1 - y0;
      if (b === "deck") { drawSub(g, "deck", bx0 + bw * 0.08, y0 + bh * 0.38, bw * 0.84, bh * 0.52); }
      else if (b === "deck2") { drawSub(g, "deck2", bx0 + bw * 0.1, y0 + bh * 0.2, bw * 0.8, bh * 0.36); drawSub(g, "deck", bx0 + bw * 0.12, y0 + bh * 0.58, bw * 0.76, bh * 0.36); }
      else if (b === "synth") { drawSub(g, "synth", bx0 + bw * 0.02, y0 + bh * 0.25, bw * 0.96, bh * 0.66); }
      else if (b === "cables") { drawSub(g, "cables", bx0 + bw * 0.1, y0 + bh * 0.1, bw * 0.8, bh * 0.85); }
      else if (b === "mon") { drawSub(g, "monitor", bx0 + bw * 0.05, y0 + bh * 0.3, bw * 0.45, bh * 0.66); drawSub(g, "plainbox", bx0 + bw * 0.55, y0 + bh * 0.4, bw * 0.4, bh * 0.56); }
      else if (b === "boxes") { drawSub(g, "plainbox", bx0 + bw * 0.05, y0 + bh * 0.2, bw * 0.5, bh * 0.76); drawSub(g, "plainbox", bx0 + bw * 0.58, y0 + bh * 0.45, bw * 0.38, bh * 0.52); }
      // cables hanging over the edge
      if (r() < 0.6) { g.strokeStyle = G(0.55); g.lineWidth = 4; g.beginPath(); const x = bx0 + bw * (0.3 + r() * 0.5); g.moveTo(x, y0); g.bezierCurveTo(x - 30, y0 + bh * 0.4, x + 40, y0 + bh * 0.5, x + 10, y0 + bh * 0.9); g.stroke(); }
      // shelf board (lit edge)
      g.fillStyle = G(0.88); g.fillRect(0, ys[i], W, board);
      g.fillStyle = G(0.5); g.fillRect(0, ys[i] + board * 0.7, W, board * 0.3);
    });
    g.fillStyle = G(0.88); g.fillRect(0, H - board, W, board);
    // posts
    for (const x of [0, W - post]) {
      g.fillStyle = G(0.82); g.fillRect(x, 0, post, H);
      g.strokeStyle = G(0.35); g.lineWidth = 1.5; for (let i = 0; i < 6; i++) { g.beginPath(); const xx = x + post * (0.15 + r() * 0.7); g.moveTo(xx, 0); g.lineTo(xx + (r() - 0.5) * 4, H); g.stroke(); }
      g.strokeStyle = G(0.05); g.lineWidth = 3; g.strokeRect(x + 1.5, 0, post - 3, H);
    }
  };
  // tiny helper pictures used inside the shelf pictures (drawn directly, not via atlas cells)
  function drawSub(g, what, x, y, w, h) {
    g.save(); g.translate(x, y);
    if (what === "deck" || what === "deck2") {
      g.fillStyle = G(0.86); g.fillRect(0, 0, w, h);
      g.strokeStyle = G(0.08); g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
      g.fillStyle = G(0.12); g.fillRect(w * 0.32, h * 0.5, w * 0.36, h * 0.3); g.fillRect(w * 0.3, h * 0.12, w * 0.22, h * 0.18);
      g.lineWidth = 2; g.beginPath(); g.moveTo(3, h * 0.4); g.lineTo(w - 3, h * 0.4); g.stroke();
      for (let i = 0; i < 3; i++) g.strokeRect(w * 0.06, h * (0.5 + i * 0.14), w * 0.1, h * 0.08);
    } else if (what === "synth") {
      g.fillStyle = G(0.45); g.fillRect(0, 0, w, h);
      g.fillStyle = G(0.75); g.fillRect(0, 0, w, h * 0.42);
      g.fillStyle = G(0.1); for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(w * (0.06 + i * 0.08), h * 0.2, Math.min(w, h) * 0.05, 0, Math.PI * 2); g.fill(); }
      const ky = h * 0.55, n = 20, kw = w / n;
      g.fillStyle = G(0.9); g.fillRect(0, ky, w, h - ky);
      g.fillStyle = G(0.06); for (let i = 0; i < n; i++) { const m = i % 7; if (m === 2 || m === 6) continue; g.fillRect((i + 0.68) * kw, ky, kw * 0.62, (h - ky) * 0.58); }
      g.strokeStyle = G(0.1); g.lineWidth = 1.5; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * kw, ky); g.lineTo(i * kw, h); g.stroke(); }
    } else if (what === "cables") {
      g.strokeStyle = G(0.8); g.lineWidth = 3.5;
      for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(w * (0.35 + 0.3 * Math.sin(i * 1.7)), h * (0.5 + 0.2 * Math.cos(i * 2.3)), w * (0.18 + 0.1 * Math.sin(i)), h * (0.18 + 0.12 * Math.cos(i * 1.3)), i * 0.7, 0, Math.PI * 2); g.stroke(); }
    } else if (what === "monitor") {
      g.fillStyle = G(0.78); g.fillRect(0, 0, w, h); g.fillStyle = G(0.06); g.fillRect(w * 0.1, h * 0.1, w * 0.8, h * 0.66);
      g.strokeStyle = G(0.08); g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
    } else if (what === "plainbox") {
      g.fillStyle = G(0.9); g.fillRect(0, 0, w, h); g.strokeStyle = G(0.1); g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
      g.strokeRect(w * 0.4, h * 0.15, w * 0.2, h * 0.14);
    }
    g.restore();
  }
  cell("shelfA", shelf(71, ["cables", "synth", "mon"]));
  cell("shelfB", shelf(72, ["deck", "deck2"]));
  // pass 4: the two shelving units of the gear room (44.48–45.40), laid out as the source draws them (canvas y = 0 at
  // the top; roto.js maps pictures upright). shelfC, left of the corridor: cables draped over the top shelf, the synth
  // with its display and knobs on the middle shelf, a cable and a small box below. shelfD, right: the stacked tape
  // decks, a shelf of coiled cables and a small device with a knob, lit posts.
  const wood = (g, r, x, y, w, h, v0, n = 8) => {
    g.fillStyle = G(v0); g.fillRect(x, y, w, h);
    for (let i = 0; i < n; i++) { const yy = y + r() * h; g.strokeStyle = G(v0 * (0.55 + 0.3 * r())); g.lineWidth = 1 + r() * 1.6; g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy + (r() - 0.5) * 4); g.stroke(); }
  };
  const postV = (g, q, r, x, y, w, h, v0) => {
    g.fillStyle = G(v0); g.fillRect(x, y, w, h);
    for (let i = 0; i < 7; i++) { const xx = x + w * (0.1 + 0.8 * r()); g.strokeStyle = G(v0 * (0.5 + 0.3 * r())); g.lineWidth = 1.2 + r(); g.beginPath(); g.moveTo(xx, y); g.lineTo(xx + (r() - 0.5) * 5, y + h); g.stroke(); }
    q.strokeStyle = inkW(0.8); q.lineWidth = 3; q.strokeRect(x + 1.5, y, w - 3, h);
  };
  const cable = (g, q, pts, w) => {
    q.strokeStyle = inkW(0.9); q.lineWidth = w + 3; q.lineCap = "round"; q.beginPath(); q.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i + 2 < pts.length + 1; i += 3) q.bezierCurveTo(...pts[i], ...pts[i + 1], ...pts[i + 2]);
    q.stroke();
    g.strokeStyle = G(0.85); g.lineWidth = Math.max(1, w * 0.45); g.lineCap = "round"; g.beginPath(); g.moveTo(pts[0][0], pts[0][1] - 1);
    for (let i = 1; i + 2 < pts.length + 1; i += 3) g.bezierCurveTo(pts[i][0], pts[i][1] - 1, pts[i + 1][0], pts[i + 1][1] - 1, pts[i + 2][0], pts[i + 2][1] - 1);
    g.stroke();
  };
  // (pass 4, second round: the proportions below are measured on the source's shelving units rectified to their
  // face quads at 45.00 (u across, v down from the face's top edge; the quads start above the frame, so v < 0.15 is
  // never seen); shelf boards slant in perspective as drawn in the source)
  const slab = (g, q, pts, v, ink = 0.8) => {
    g.fillStyle = G(v); g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
    q.strokeStyle = inkW(ink); q.lineWidth = 2.5; q.beginPath(); pts.forEach(([x, y], i) => (i ? q.lineTo(x, y) : q.moveTo(x, y))); q.closePath(); q.stroke();
  };
  cell("shelfC", (g, q, W, H) => {
    const r = rng(173);
    const P = (u, v) => [u * W, v * H];
    g.fillStyle = G(0.09); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 110; i++) { const x = r() * W, y = r() * H; g.strokeStyle = G(0.16 + r() * 0.12); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 16 + r() * 20, y + (r() - 0.5) * 3); g.stroke(); }
    // the upper shelf's edge receding to the right, cables hanging from above
    slab(g, q, [P(0.5, 0.13), P(0.97, 0.3), P(0.97, 0.36), P(0.5, 0.18)], 0.62);
    cable(g, q, [P(0.2, 0.12), P(0.12, 0.2), P(0.1, 0.3), P(0.18, 0.36), P(0.26, 0.42), P(0.3, 0.36), P(0.34, 0.4)], 6);
    cable(g, q, [P(0.45, 0.12), P(0.48, 0.22), P(0.36, 0.26), P(0.44, 0.33), P(0.52, 0.4), P(0.56, 0.36), P(0.6, 0.42)], 5);
    cable(g, q, [P(0.3, 0.2), P(0.5, 0.25), P(0.62, 0.3), P(0.7, 0.4)], 5);
    // top shelf: a thick lit board slanting down to the right, a flat device on it
    slab(g, q, [P(0.62, 0.41), P(0.9, 0.47), P(0.9, 0.5), P(0.62, 0.45)], 0.55);
    slab(g, q, [P(0.08, 0.36), P(0.95, 0.52), P(0.95, 0.575), P(0.08, 0.425)], 0.82);
    g.fillStyle = G(0.3); g.beginPath(); [P(0.08, 0.425), P(0.95, 0.575), P(0.95, 0.6), P(0.08, 0.45)].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.fill();
    // the synth: bright panel with a display and knobs, the keys along its front edge, slanting like the shelf
    slab(g, q, [P(0.1, 0.6), P(0.55, 0.61), P(0.93, 0.74), P(0.12, 0.7)], 0.72, 0.85);
    g.fillStyle = G(0.18); g.beginPath(); [P(0.17, 0.615), P(0.34, 0.62), P(0.35, 0.655), P(0.18, 0.65)].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.fill();
    for (let i = 0; i < 10; i++) { const u = 0.4 + i * 0.05; g.fillStyle = G(0.15); g.beginPath(); g.arc(u * W, (0.63 + (u - 0.4) * 0.16 + (i % 2) * 0.02) * H, W * 0.016, 0, Math.PI * 2); g.fill(); }
    const K0 = [0.12, 0.7], K1 = [0.93, 0.76], kh = 0.075, nk = 26;
    slab(g, q, [P(K0[0], K0[1]), P(K1[0], K1[1]), P(K1[0], K1[1] + kh), P(K0[0], K0[1] + kh)], 0.93, 0.85);
    for (let i = 0; i <= nk; i++) { const t = i / nk, u = K0[0] + (K1[0] - K0[0]) * t, v = K0[1] + (K1[1] - K0[1]) * t; q.strokeStyle = inkW(0.8); q.lineWidth = 1.5; q.beginPath(); q.moveTo(u * W, v * H); q.lineTo(u * W, (v + kh) * H); q.stroke();
      const m = i % 7; if (i < nk && m !== 2 && m !== 6) { q.fillStyle = inkW(0.95); q.fillRect((u + (K1[0] - K0[0]) * 0.66 / nk) * W, v * H, (K1[0] - K0[0]) * 0.55 / nk * W, kh * 0.55 * H); } }
    // lower shelf board, cables and a small box below; a lit box at the bottom left
    slab(g, q, [P(0.06, 0.82), P(0.93, 0.8), P(0.93, 0.845), P(0.06, 0.865)], 0.8);
    cable(g, q, [P(0.55, 0.84), P(0.5, 0.92), P(0.66, 0.97), P(0.72, 0.9), P(0.78, 0.86), P(0.84, 0.92), P(0.8, 1.0)], 5);
    slab(g, q, [P(0.0, 0.9), P(0.45, 0.9), P(0.45, 1.0), P(0.0, 1.0)], 0.78, 0.6);
    // posts: the lit near post on the right, a thin lit edge on the left
    postV(g, q, r, W * 0.9, 0, W * 0.075, H, 0.72);
    postV(g, q, r, 0, 0, W * 0.04, H * 0.88, 0.7);
  });
  cell("shelfD", (g, q, W, H) => {
    // fix 1b: redrawn after the source at 45.00 (proportions as measured in pass 4): a dark, densely hatched interior
    // (the pass-4 picture's interior came out mid-grey once normalised), tape decks with depth (a lit top, a front
    // with cassette windows, reels and buttons), light rope cables looped on the lower shelf (not a black scribble),
    // lit shelf boards and posts carrying the brightness
    const r = rng(174);
    const P = (u, v) => [u * W, v * H];
    g.fillStyle = G(0.05); g.fillRect(0, 0, W, H);
    // interior hatching: fine lighter strokes on black, vertical-ish (the back boards)
    for (let i = 0; i < 260; i++) { const x = r() * W * 0.66, y = r() * H; g.strokeStyle = G(0.1 + r() * 0.14); g.lineWidth = 1 + r() * 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y + 10 + r() * 22); g.stroke(); }
    // right of the post: the dark side of the next unit, a few lit grain lines, one lit edge
    for (let i = 0; i < 40; i++) { const x = W * (0.73 + r() * 0.27); g.strokeStyle = G(0.12 + r() * 0.3); g.lineWidth = 1.2 + r() * 2; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (r() - 0.5) * 4, H); g.stroke(); }
    slab(g, q, [P(0.83, 0.35), P(0.87, 0.35), P(0.87, 0.95), P(0.83, 0.95)], 0.8);
    // shelf boards slanting up to the right, lit top edges
    const board = (y0l, y0r, t) => { slab(g, q, [P(0.03, y0l), P(0.66, y0r), P(0.66, y0r + t), P(0.03, y0l + t)], 0.86); g.fillStyle = G(0.35); g.beginPath(); [P(0.03, y0l + t), P(0.66, y0r + t), P(0.66, y0r + t + 0.015), P(0.03, y0l + t + 0.015)].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.fill(); };
    board(0.25, 0.02, 0.05);
    // a tape deck with depth: lit top face, front panel, cassette window with two reels, buttons, a meter
    const deck = (x, y, w, h, d, v) => {
      slab(g, q, [P(x, y), P(x + w, y), P(x + w + d, y - d * 0.6), P(x + d, y - d * 0.6)], Math.min(0.95, v + 0.1), 0.8);
      slab(g, q, [P(x, y), P(x + w, y), P(x + w, y + h), P(x, y + h)], v, 0.85);
      const wx = x + w * 0.36, wy = y + h * 0.3, ww = w * 0.36, wh = h * 0.42;
      g.fillStyle = G(0.14); g.fillRect(wx * W, wy * H, ww * W, wh * H);
      q.lineWidth = 1.6; q.strokeStyle = inkW(0.85); q.strokeRect(wx * W, wy * H, ww * W, wh * H);
      g.fillStyle = G(0.7); for (const f of [0.3, 0.7]) { g.beginPath(); g.arc((wx + ww * f) * W, (wy + wh * 0.5) * H, Math.min(ww * W, wh * H) * 0.18, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = G(0.2); for (let i = 0; i < 5; i++) g.fillRect((x + w * (0.08 + i * 0.05)) * W, (y + h * 0.78) * H, w * 0.035 * W, h * 0.1 * H);
      g.fillStyle = G(0.25); g.fillRect((x + w * 0.78) * W, (y + h * 0.3) * H, w * 0.14 * W, h * 0.2 * H);
      q.beginPath(); q.moveTo(x * W, (y + h * 0.16) * H); q.lineTo((x + w) * W, (y + h * 0.16) * H); q.stroke();
    };
    deck(0.3, 0.21, 0.3, 0.07, 0.03, 0.8);
    deck(0.1, 0.31, 0.5, 0.2, 0.04, 0.82);
    board(0.57, 0.49, 0.05);
    // light rope cables looped over the lower shelf and hanging down (thin lit lines with a dark keyline)
    const rope = (pts) => {
      const path = (c) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i + 2 < pts.length + 1; i += 3) c.bezierCurveTo(...pts[i], ...pts[i + 1], ...pts[i + 2]); };
      // (the keyline in the value channel: ink would also blacken the lit core)
      g.strokeStyle = G(0.02); g.lineWidth = 7; g.lineCap = "round"; path(g); g.stroke();
      g.strokeStyle = G(0.85); g.lineWidth = 3.6; path(g); g.stroke();
    };
    for (let i = 0; i < 9; i++) {
      const cx = 0.3 + 0.2 * r(), cy = 0.64 + 0.05 * r(), rx = 0.1 + 0.08 * r(), ry = 0.04 + 0.03 * r(), a0 = r() * 6;
      const pts = [];
      for (let k = 0; k <= 12; k++) { const a = a0 + (k / 12) * Math.PI * 2; pts.push(P(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry)); }
      rope([pts[0], ...pts.slice(1)]);
    }
    rope([P(0.4, 0.68), P(0.36, 0.74), P(0.44, 0.78), P(0.4, 0.86)]);
    rope([P(0.52, 0.67), P(0.56, 0.74), P(0.5, 0.8), P(0.55, 0.9)]);
    board(0.79, 0.76, 0.04);
    // a small device with a knob low down
    slab(g, q, [P(0.2, 0.84), P(0.45, 0.84), P(0.45, 0.95), P(0.2, 0.95)], 0.62, 0.75);
    g.fillStyle = G(0.9); g.beginPath(); g.arc(0.28 * W, 0.89 * H, W * 0.035, 0, Math.PI * 2); g.fill(); q.beginPath(); q.arc(0.28 * W, 0.89 * H, W * 0.035, 0, Math.PI * 2); q.stroke();
    slab(g, q, [P(0.05, 0.96), P(0.66, 0.95), P(0.66, 1.0), P(0.05, 1.0)], 0.8);
    postV(g, q, r, W * 0.65, 0, W * 0.08, H, 0.8);
    postV(g, q, r, 0, 0, W * 0.04, H, 0.6);
  });
  // fix 1b: take H's gear wall (43.92–44.44), as the source draws it: dark gear seen at a steep angle (the face's quad
  // recedes, roto.js maps it with perspective), heavy white hatching over dark fronts, a few lit edges and knobs, an
  // angled synth drawer low on the right, cables hanging at the right edge; no bright flat diagram (canvas y down)
  cell("rackE", (g, q, W, H) => {
    const r = rng(175);
    const P = (u, v) => [u * W, v * H];
    g.fillStyle = G(0.08); g.fillRect(0, 0, W, H);
    // the stacked units: dark fronts, a lit top edge, a darker slot or two, small bright knobs
    const unit = (u0, v0, u1, v1, val) => {
      g.fillStyle = G(val); g.fillRect(u0 * W, v0 * H, (u1 - u0) * W, (v1 - v0) * H);
      // white hatching across the front (the source's heavy scratched strokes), a little tilted
      for (let i = 0; i < 14; i++) {
        const y = (v0 + (v1 - v0) * r()) * H, x = (u0 + (u1 - u0) * r() * 0.6) * W, L = (u1 - u0) * W * (0.25 + 0.5 * r());
        g.strokeStyle = G(0.35 + 0.35 * r()); g.lineWidth = 1 + r() * 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + L, y + (r() - 0.5) * 6); g.stroke();
      }
      g.fillStyle = G(0.82); g.fillRect(u0 * W, v0 * H, (u1 - u0) * W, 3);
      q.strokeStyle = inkW(0.85); q.lineWidth = 2.5; q.strokeRect(u0 * W, v0 * H, (u1 - u0) * W, (v1 - v0) * H);
      g.fillStyle = G(0.06); g.fillRect((u0 + (u1 - u0) * 0.35) * W, (v0 + (v1 - v0) * 0.45) * H, (u1 - u0) * 0.35 * W, (v1 - v0) * 0.18 * H);
      g.fillStyle = G(0.85); for (let i = 0; i < 3; i++) { g.beginPath(); g.arc((u0 + (u1 - u0) * (0.1 + 0.08 * i)) * W, (v0 + (v1 - v0) * 0.55) * H, 3, 0, Math.PI * 2); g.fill(); }
    };
    unit(0.04, 0.04, 0.46, 0.2, 0.3); unit(0.5, 0.06, 0.9, 0.24, 0.24);
    unit(0.04, 0.26, 0.4, 0.46, 0.22); unit(0.44, 0.3, 0.88, 0.5, 0.34);
    unit(0.04, 0.52, 0.5, 0.72, 0.26);
    // shelf boards: thin lit lines
    for (const v of [0.235, 0.49, 0.74]) { g.fillStyle = G(0.62); g.fillRect(0, v * H, W, 4); g.fillStyle = G(0.04); g.fillRect(0, v * H + 4, W, 5); }
    // the angled synth drawer low on the right: a lit slanted panel with a row of keys
    slab(g, q, [P(0.5, 0.56), P(0.93, 0.6), P(0.98, 0.8), P(0.56, 0.74)], 0.46, 0.85);
    const K0 = [0.56, 0.74], K1 = [0.98, 0.8];
    slab(g, q, [P(K0[0], K0[1]), P(K1[0], K1[1]), P(K1[0], K1[1] + 0.05), P(K0[0], K0[1] + 0.05)], 0.82, 0.8);
    for (let i = 0; i <= 12; i++) { const t = i / 12, u = K0[0] + (K1[0] - K0[0]) * t, v = K0[1] + (K1[1] - K0[1]) * t; q.strokeStyle = inkW(0.8); q.lineWidth = 1.5; q.beginPath(); q.moveTo(u * W, v * H); q.lineTo(u * W, (v + 0.05) * H); q.stroke(); }
    // lower dark cabinet with hatching
    unit(0.02, 0.78, 0.6, 0.98, 0.16);
    // cables hanging down the right edge
    for (let i = 0; i < 3; i++) { g.strokeStyle = G(0.7); g.lineWidth = 3; g.beginPath(); const x = W * (0.9 + 0.03 * i); g.moveTo(x, H * 0.05); g.bezierCurveTo(x + 20, H * 0.25, x - 16, H * 0.4, x + 6, H * 0.55); g.stroke(); }
  });
  cell("gear", (g, q, W, H) => { drawSub(g, "deck", 6, 6, W / 2 - 12, H - 12); drawSub(g, "deck2", W / 2 + 6, 6, W / 2 - 12, H - 12); });
  // pass 4: the far stacks down the corridor (roto "FAR" faces): rows of box fronts of varied width and value, dark
  // seams and gaps between them, a handle slot here and there, darker toward the top (u across, v = 0 at the bottom)
  cell("boxwall", (g, q, W, H) => {
    const r = rng(131);
    g.fillStyle = G(0.12); g.fillRect(0, 0, W, H);
    let y = H;
    while (y > 0) {
      const bh = 22 + r() * 34;
      let x = -r() * 40;
      while (x < W) {
        const bw = 30 + r() * 70, gap = 2 + r() * 3;
        // (brighter low down, near the floor; roto.js maps canvas y = 0 to the face's top edge)
        const v = (0.35 + 0.65 * r()) * (0.55 + 0.45 * (y / H));
        if (r() > 0.12) {
          const gr = g.createLinearGradient(0, y - bh, 0, y);
          gr.addColorStop(0, G(v * 0.8)); gr.addColorStop(1, G(v));
          g.fillStyle = gr; g.fillRect(x + gap, y - bh + gap, bw - gap, bh - gap);
          if (r() > 0.55) { q.strokeStyle = inkW(0.35); q.lineWidth = 1.3; q.beginPath(); q.roundRect(x + bw * (0.35 + 0.2 * r()), y - bh * 0.72, bw * 0.22, bh * 0.2, 2); q.stroke(); }
        }
        x += bw;
      }
      y -= bh;
    }
  });
  // ---- speaker front: dark wood cabinet, big cone with a metal ring and screws, a dust cap highlight
  cell("speaker", (g, q, W, H) => {
    // fix 1b: as the source draws it (44.72–45.12): a dark wood cabinet, a lit metal frame ring with screws, a thick
    // black rubber surround, a LIGHT paper cone with a few soft swirl marks, and a dark glossy dust cap with one
    // highlight; no radial spokes (the pass-4 cone read as an eyeball)
    const r = rng(81);
    g.fillStyle = G(0.34); g.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) { const x = r() * W; g.strokeStyle = G(0.14 + r() * 0.34); g.lineWidth = 1 + r() * 2.2; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + (r() - 0.5) * 8, H * 0.3, x + (r() - 0.5) * 8, H * 0.7, x + (r() - 0.5) * 10, H); g.stroke(); }
    // the recessed front panel's lit bevel
    g.strokeStyle = G(0.62); g.lineWidth = 5; g.strokeRect(16, 16, W - 32, H - 32);
    g.strokeStyle = G(0.06); g.lineWidth = 4; g.strokeRect(10, 10, W - 20, H - 20);
    // (the cone measured on the source's speaker front rectified to its quad at 45.00: centre (0.62, 0.53), outer
    // ring 0.5 of the width across, 0.41 of the height; drawn round and squashed to fit)
    g.save(); g.translate(W * 0.62, H * 0.53); g.scale(1, 0.82); g.translate(-W * 0.62, -H * 0.53);
    const cx = W * 0.62, cy = H * 0.53, R = W * 0.5;
    // metal frame: a lit ring with a dark keyline either side, screws
    g.fillStyle = G(0.7); g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
    const fr = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
    fr.addColorStop(0, G(0.86)); fr.addColorStop(0.55, G(0.55)); fr.addColorStop(1, G(0.72));
    g.fillStyle = fr; g.beginPath(); g.arc(cx, cy, R * 0.97, 0, Math.PI * 2); g.fill();
    g.strokeStyle = G(0.06); g.lineWidth = 5; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, R * 0.88, 0, Math.PI * 2); g.stroke();
    g.fillStyle = G(0.08);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.35; g.beginPath(); g.arc(cx + Math.cos(a) * R * 0.935, cy + Math.sin(a) * R * 0.935, 5, 0, Math.PI * 2); g.fill(); }
    // rubber surround: a thick black roll, a faint sheen along its upper left
    g.fillStyle = G(0.06); g.beginPath(); g.arc(cx, cy, R * 0.87, 0, Math.PI * 2); g.fill();
    g.strokeStyle = G(0.32); g.lineWidth = R * 0.035; g.beginPath(); g.arc(cx, cy, R * 0.8, Math.PI * 0.95, Math.PI * 1.55); g.stroke();
    // the cone: pale paper, lighter to the upper left, a soft shadow ring under the surround
    const cg = g.createRadialGradient(cx - R * 0.25, cy - R * 0.25, R * 0.05, cx, cy, R * 0.72);
    cg.addColorStop(0, G(0.9)); cg.addColorStop(0.65, G(0.72)); cg.addColorStop(1, G(0.42));
    g.fillStyle = cg; g.beginPath(); g.arc(cx, cy, R * 0.72, 0, Math.PI * 2); g.fill();
    // a few soft swirl marks following the cone round (not spokes)
    g.lineCap = "round";
    for (let i = 0; i < 16; i++) {
      const a0 = r() * Math.PI * 2, rr = R * (0.36 + 0.3 * r()), da = 0.5 + r() * 0.9;
      g.strokeStyle = G(0.45 + r() * 0.2); g.lineWidth = 1.2 + r() * 1.6; g.globalAlpha = 0.55;
      g.beginPath(); g.arc(cx, cy, rr, a0, a0 + da); g.stroke();
    }
    g.globalAlpha = 1;
    // dust cap: dark and glossy, one highlight upper left
    g.fillStyle = G(0.2); g.beginPath(); g.arc(cx, cy, R * 0.3, 0, Math.PI * 2); g.fill();
    const dg = g.createRadialGradient(cx + R * 0.04, cy + R * 0.05, R * 0.02, cx, cy, R * 0.27);
    dg.addColorStop(0, G(0.3)); dg.addColorStop(1, G(0.06));
    g.fillStyle = dg; g.beginPath(); g.arc(cx, cy, R * 0.27, 0, Math.PI * 2); g.fill();
    g.fillStyle = G(0.88); g.beginPath(); g.ellipse(cx - R * 0.1, cy - R * 0.11, R * 0.07, R * 0.045, -0.6, 0, Math.PI * 2); g.fill();
    g.restore();
  });
  // ---- a coiled cable lying on the floor (seen from above, u across, v along): tapered dark loops, a lit rim
  cell("coil", (g, q, W, H) => {
    g.fillStyle = G(0.62); g.fillRect(0, 0, W, H);
    const r = rng(91);
    for (let i = 0; i < 9; i++) {
      const cx = W * (0.42 + 0.1 * Math.sin(i * 1.3)), cy = H * (0.5 + 0.08 * Math.cos(i * 2.1)), rx = W * (0.28 + 0.1 * r()), ry = H * (0.3 + 0.12 * r());
      g.lineWidth = 7 + r() * 5; g.strokeStyle = G(0.08); g.beginPath(); g.ellipse(cx, cy, rx, ry, (r() - 0.5) * 0.4, 0, Math.PI * 2); g.stroke();
      g.lineWidth = 1.6; g.strokeStyle = G(0.7); g.beginPath(); g.ellipse(cx, cy - 2, rx, ry, (r() - 0.5) * 0.4, 3.6, 5.6); g.stroke();
    }
    g.lineWidth = 8; g.strokeStyle = G(0.08); g.beginPath(); g.moveTo(W * 0.7, H * 0.5); g.bezierCurveTo(W * 0.85, H * 0.4, W * 0.9, H * 0.8, W, H * 0.7); g.stroke();
  });
  // fix 2: the gear pictures redrawn (gear.js), drawn over the older versions of the same cells
  cell("keys", GEAR.keys);
  cell("monitor", GEAR.monitor);
  cell("shelfC", GEAR.shelfC);
  cell("shelfD", GEAR.shelfD);
  cell("rackE", GEAR.rackE);
  // (take D's gear shelving, laid out on its own quad; only D's "SH" face uses this cell)
  cell("shelfA", GEAR.shelfK);
  // (the ring measured on the source and mapped into each take's quads: take J at 45.00, take I at 44.80)
  cell("speaker", GEAR.speaker({ cx: 0.6, cy: 0.576, rx: 0.467, ry: 0.437, seed: 81 }));
  cell("speakerI", GEAR.speaker({ cx: 0.544, cy: 0.542, rx: 0.4, ry: 0.39, seed: 82 }));
  // combine: R = value, G = ink
  // (fix 2: channel packing by compositing (value x red + ink x green), not a per-pixel loop over 16M pixels)
  const out = document.createElement("canvas"); out.width = out.height = AT;
  const og = out.getContext("2d");
  og.drawImage(val, 0, 0);
  og.globalCompositeOperation = "multiply"; og.fillStyle = "#ff0000"; og.fillRect(0, 0, AT, AT);
  k.globalCompositeOperation = "multiply"; k.fillStyle = "#00ff00"; k.fillRect(0, 0, AT, AT); k.globalCompositeOperation = "source-over";
  og.globalCompositeOperation = "lighter"; og.drawImage(ink, 0, 0);
  og.globalCompositeOperation = "source-over";
  ATLAS = out;
  return out;
}
export function releaseAtlas() { ATLAS = null; }
