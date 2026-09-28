// s19 room: redraws the traced scratchboard (roomdata.js) — broad lit areas as posterised even-odd outlines, then
// the dark strokes ('darken') and the white strokes ('lighten'), each stroke a chain of quads whose width and value
// follow the measured spine; round joints only at sharp turns. Values are pre-grade (post.js grades the frame).
// A 0.6 px blur stands in for the source's softness. The Python twin (trace/render.py) scores a trace the same way.
import { W, H } from "../../config.js";
import { ROOM } from "./roomdata.js";
import { OWLKEYS } from "./owldata.js";

const TINT = [1.02, 1.0, 0.96];               // the source's ink is faintly warm (R − B ≈ 5 % in the mid-tones)
const col = (v) => `rgb(${Math.round(Math.min(255, v * TINT[0]))},${Math.round(Math.min(255, v * TINT[1]))},${Math.round(Math.min(255, v * TINT[2]))})`;

function bytes(b64) {
  const s = atob(b64), a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return new DataView(a.buffer);
}
function readStrokes(b64) {
  const d = bytes(b64); let o = 0;
  const n = d.getUint32(o, true); o += 4;
  const out = [];
  for (let i = 0; i < n; i++) {
    const m = d.getUint16(o, true); o += 2;
    const s = new Float32Array(m * 4);
    for (let k = 0; k < m; k++) {
      s[k * 4] = d.getUint16(o, true) / 8; s[k * 4 + 1] = d.getUint16(o + 2, true) / 8;
      s[k * 4 + 2] = d.getUint8(o + 4) / 10; s[k * 4 + 3] = d.getUint8(o + 5); o += 6;
    }
    out.push(s);
  }
  return out;
}
function readBase(b64) {
  const d = bytes(b64); let o = 0;
  const nl = d.getUint8(o); o += 1;
  const out = [];
  for (let l = 0; l < nl; l++) {
    const v = d.getUint8(o), nr = d.getUint16(o + 1, true); o += 3;
    const rings = [];
    for (let r = 0; r < nr; r++) {
      const m = d.getUint16(o, true); o += 2;
      const p = new Float32Array(m * 2);
      for (let k = 0; k < m; k++) { p[k * 2] = d.getUint16(o, true) / 8; p[k * 2 + 1] = d.getUint16(o + 2, true) / 8; o += 4; }
      rings.push(p);
    }
    out.push([v, rings]);
  }
  return out;
}

// stroke end taper (matches render.py): 0.7 at the ends, full in the middle
const taperF = (u) => 0.7 + 0.3 * Math.pow(Math.sin(Math.PI * u), 0.5);
function drawStrokes(g, strokes, op, xf) {
  const groups = new Map();
  const grp = (v) => { const k = Math.round(v / 255 * 63); if (!groups.has(k)) groups.set(k, new Path2D()); return groups.get(k); };
  for (const s of strokes) {
    const n = s.length / 4;
    if (n < 2) continue;
    const P = [];
    for (let i = 0; i < n; i++) { const [x, y] = xf ? xf(s[i * 4], s[i * 4 + 1]) : [s[i * 4], s[i * 4 + 1]]; P.push([x, y, s[i * 4 + 2] * taperF(i / (n - 1)), s[i * 4 + 3]]); }
    for (let i = 0; i < n - 1; i++) {
      const [x0, y0, w0, v0] = P[i], [x1, y1, w1, v1] = P[i + 1];
      let dx = x1 - x0, dy = y1 - y0; const d = Math.hypot(dx, dy) || 1; const nx = -dy / d, ny = dx / d;
      const p = grp((v0 + v1) / 2);
      p.moveTo(x0 + nx * w0 / 2, y0 + ny * w0 / 2); p.lineTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2);
      p.lineTo(x1 - nx * w1 / 2, y1 - ny * w1 / 2); p.lineTo(x0 - nx * w0 / 2, y0 - ny * w0 / 2); p.closePath();
    }
    for (let i = 1; i < n - 1; i++) {
      const ax = P[i][0] - P[i - 1][0], ay = P[i][1] - P[i - 1][1], bx = P[i + 1][0] - P[i][0], by = P[i + 1][1] - P[i][1];
      const ca = (ax * bx + ay * by) / ((Math.hypot(ax, ay) * Math.hypot(bx, by)) || 1);
      if (ca < 0.7) { const p = grp(P[i][3]); p.moveTo(P[i][0] + P[i][2] / 2, P[i][1]); p.arc(P[i][0], P[i][1], P[i][2] / 2, 0, Math.PI * 2, true); }
    }
  }
  g.save(); g.globalCompositeOperation = op;
  for (const [k, p] of groups) { g.fillStyle = col(k / 63 * 255); g.fill(p, "nonzero"); }
  g.restore();
}
function drawBase(g, base) {
  for (const [v, rings] of base) {
    const p = new Path2D();
    for (const r of rings) { p.moveTo(r[0], r[1]); for (let k = 2; k < r.length; k += 2) p.lineTo(r[k], r[k + 1]); p.closePath(); }
    g.fillStyle = col(v); g.fill(p, "evenodd");
  }
}

let DEC = null;
function decoded() {
  if (DEC) return DEC;
  DEC = {};
  for (const k of Object.keys(ROOM)) DEC[k] = { base: readBase(ROOM[k].base), dark: readStrokes(ROOM[k].dark), bright: readStrokes(ROOM[k].bright) };
  return DEC;
}
// Paint one traced layer onto a new W x H canvas. opaque: black underneath (the room); else transparent-black
// strokes for overlays (the lit floor, composited 'lighten').
export function traceLayer(name, { opaque = true, blur = 0.6 } = {}) {
  const L = decoded()[name];
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  drawBase(g, L.base);
  drawStrokes(g, L.dark, "darken");
  drawStrokes(g, L.bright, "lighten");
  if (blur > 0) {
    const b = document.createElement("canvas"); b.width = W; b.height = H;
    const bg = b.getContext("2d"); bg.filter = `blur(${blur}px)`; bg.drawImage(c, 0, 0); bg.filter = "none";
    return b;
  }
  return c;
}
// packed (owl keys): delta-coded points, see trace/tojs.py dpts()
function readPts(d, o, m, q) {
  const p = new Float32Array(m * 2);
  let x = d.getUint16(o, true), y = d.getUint16(o + 2, true); o += 4; p[0] = x / 8; p[1] = y / 8;
  for (let k = 1; k < m; k++) {
    const dx = d.getInt8(o);
    if (dx === -128) { x = d.getUint16(o + 1, true); y = d.getUint16(o + 3, true); o += 5; }
    else { x += dx * 8 / q; y += d.getInt8(o + 1) * 8 / q; o += 2; }
    p[k * 2] = x / 8; p[k * 2 + 1] = y / 8;
  }
  return [p, o];
}
function readBase2(b64) {
  const d = bytes(b64); let o = 0;
  const nl = d.getUint8(o); o += 1; const out = [];
  for (let l = 0; l < nl; l++) {
    const v = d.getUint8(o), nr = d.getUint16(o + 1, true); o += 3; const rings = [];
    for (let r = 0; r < nr; r++) { const m = d.getUint16(o, true); o += 2; let p; [p, o] = readPts(d, o, m, 2); rings.push(p); }
    out.push([v, rings]);
  }
  return out;
}
function readStrokes2(b64) {
  const d = bytes(b64); let o = 0;
  const n = d.getUint32(o, true); o += 4; const out = [];
  for (let i = 0; i < n; i++) {
    const m = d.getUint16(o, true); o += 2; let p; [p, o] = readPts(d, o, m, 4);
    const s = new Float32Array(m * 4);
    for (let k = 0; k < m; k++) { s[k * 4] = p[k * 2]; s[k * 4 + 1] = p[k * 2 + 1]; s[k * 4 + 2] = d.getUint8(o) / 10; s[k * 4 + 3] = d.getUint8(o + 1); o += 2; }
    out.push(s);
  }
  return out;
}
function readRing(b64) {
  const d = bytes(b64), m = d.getUint16(0, true), p = new Float32Array(m * 2);
  for (let k = 0; k < m; k++) { p[k * 2] = d.getUint16(2 + k * 4, true) / 8; p[k * 2 + 1] = d.getUint16(4 + k * 4, true) / 8; }
  return p;
}
// A traced owl key drawing on its own canvas (its region's bounding box): the layer clipped to its region outline
// with a 3 px feather, so it can be laid over the room. Returns { canvas, x, y }.
const OWLC = new Map();
export function owlKey(key, { blur = 0.6, feather = 1.5 } = {}) {
  if (OWLC.has(key)) { const r = OWLC.get(key); OWLC.delete(key); OWLC.set(key, r); return r; }
  // a small LRU: every source frame of the owl has its own drawing, so only the last few are kept
  while (OWLC.size >= 6) OWLC.delete(OWLC.keys().next().value);
  const K = OWLKEYS[key];
  const clip = readRing(K.clip), L = { base: readBase2(K.base), dark: readStrokes2(K.dark), bright: readStrokes2(K.bright) };
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < clip.length; i += 2) { x0 = Math.min(x0, clip[i]); x1 = Math.max(x1, clip[i]); y0 = Math.min(y0, clip[i + 1]); y1 = Math.max(y1, clip[i + 1]); }
  x0 = Math.floor(x0) - 8; y0 = Math.floor(y0) - 8; x1 = Math.ceil(x1) + 8; y1 = Math.ceil(y1) + 8;
  const w = x1 - x0, h = y1 - y0;
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  g.translate(-x0, -y0);
  g.fillStyle = "#000"; g.fillRect(x0, y0, w, h);
  drawBase(g, L.base); drawStrokes(g, L.dark, "darken"); drawStrokes(g, L.bright, "lighten");
  g.setTransform(1, 0, 0, 1, 0, 0);
  const out = document.createElement("canvas"); out.width = w; out.height = h;
  const o = out.getContext("2d");
  // feathered clip: the region filled, blurred, then the drawing kept only where it is
  o.filter = `blur(${feather}px)`; o.fillStyle = "#fff"; o.translate(-x0, -y0);
  const p = new Path2D(); p.moveTo(clip[0], clip[1]); for (let i = 2; i < clip.length; i += 2) p.lineTo(clip[i], clip[i + 1]); p.closePath();
  o.fill(p); o.setTransform(1, 0, 0, 1, 0, 0); o.filter = "none";
  o.globalCompositeOperation = "source-in";
  if (blur > 0) o.filter = `blur(${blur}px)`;
  o.drawImage(c, 0, 0); o.filter = "none"; o.globalCompositeOperation = "source-over";
  const r = { canvas: out, x: x0, y: y0 };
  OWLC.set(key, r);
  return r;
}
export function releaseTrace() { DEC = null; OWLC.clear(); }
