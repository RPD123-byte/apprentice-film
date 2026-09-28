// The feedback note card (the page's comment widget) and the red selection rectangle.
// Seen on the laptop (25.5–30.5 s), full-screen in the close-up s08 (30.56–32.60, "This is really good" typed in),
// and later as a physical card propped up in the black-and-white room (57–69 s).
//
// Geometry is measured on the close-up in CARD UNITS: the card is 465 units wide and 648 tall (the close-up's
// first frame shows it 465 px wide); every call scales that to the requested width.
//
//   drawNoteCard(ctx, { x, y, w, text, caret, ... })   paint the card with its top-left at (x, y), width w
//   noteCardCanvas(w, opts)                            the same, cached on its own canvas (for warping onto quads)
//   drawSelection(ctx, { x0, y0, x1, y1, width, drag }) the red selection rectangle
//   CARD_W, CARD_H, cardTextX(n)                         card-unit constants (caret x after n characters)
import { clamp } from "./rng.js";

export const CARD_W = 465, CARD_H = 648;
const R = 45;                                   // corner radius
const SMILEY = [196, 80, 40];                    // centre + radius
const TRASH = [295, 80];                         // centre
const AREA = { x0: 51, y0: 160, x1: 423, y1: 600.5, r: 15, lw: 3.5, btnY: 532.5, divX: 237 };
const TEXT = { x: 85, y: 210, size: 26, adv: 15.6 };   // Geist Mono 26: advance 0.6 em = 15.6
const CANCEL = [142.5, 566], SAVE = [328, 566];
export const cardTextX = (n) => TEXT.x + n * TEXT.adv;

// Colour sets. "screen" = the web widget (close-up); "room" = the physical card in the B&W room (warm paper,
// maroon-brown ink, no speech-bubble notch, the smiley stays yellow). "ink" = pure white/black line art for plates.
const THEMES = {
  screen: { paper: "#dddcd2", paperTop: "#cecec3", paperBot: "#bfbfb5", ink: "#262624", text: "#51514e", muted: "#747470", outline: "rgba(20,16,14,0.55)", smiley: "#ad993b", smileyHi: "#bdad50", glow: "214,92,62", face: "#3b3222" },
  room: { paper: "#ece8e0", paperTop: "#e2ddd4", ink: "#4a3036", text: "#4f3a3e", muted: "#7a6468", outline: "rgba(40,20,24,0.8)", smiley: "#e6d25a", smileyHi: "#f0e27c", glow: "226,110,80", face: "#4a3228" },
  ink: { paper: "#f2f0ea", paperTop: "#f2f0ea", ink: "#0a0a0a", text: "#1a1a1a", muted: "#555", outline: "#0a0a0a", smiley: "#f2f0ea", smileyHi: "#f2f0ea", glow: null, face: "#0a0a0a" },
};

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

// The speech-bubble nub on the card's left edge (a small cloud of two lobes), in card units.
function notchPath(ctx) {
  ctx.beginPath();
  ctx.arc(-27, 326, 19, 0, Math.PI * 2);
  ctx.moveTo(0, 311); ctx.arc(-9, 311, 9, 0, Math.PI * 2);
  ctx.moveTo(-4, 343); ctx.arc(-11, 343, 7, 0, Math.PI * 2);
  ctx.moveTo(8, 327); ctx.arc(-6, 327, 14, 0, Math.PI * 2);
}

function trash(ctx, cx, cy, col, lw) {
  ctx.save(); ctx.translate(cx - 295, cy - 80);
  ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.beginPath(); ctx.moveTo(276.5, 67.5); ctx.lineTo(312.5, 67.5); ctx.stroke();            // lid
  ctx.beginPath(); ctx.moveTo(289, 67.5); ctx.lineTo(289, 62.5); ctx.lineTo(300.5, 62.5); ctx.lineTo(300.5, 67.5); ctx.stroke(); // handle
  ctx.beginPath(); ctx.moveTo(281.5, 71); ctx.lineTo(284.5, 93); ctx.quadraticCurveTo(285, 96.5, 288.5, 96.5); ctx.lineTo(301, 96.5);
  ctx.quadraticCurveTo(304.5, 96.5, 305, 93); ctx.lineTo(308, 71); ctx.stroke();               // can
  for (const x of [290, 295, 300]) { ctx.beginPath(); ctx.moveTo(x, 76.5); ctx.lineTo(x, 90.5); ctx.stroke(); }
  ctx.restore();
}

function smiley(ctx, th, active) {
  const [x, y, r] = SMILEY;
  if (th.glow && active > 0) {
    const g = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 1.28);
    g.addColorStop(0, `rgba(${th.glow},${0.95 * active})`); g.addColorStop(0.45, `rgba(${th.glow},${0.55 * active})`); g.addColorStop(1, `rgba(${th.glow},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.3, 0, 7); ctx.fill();
  }
  const mix = (a, b) => (active >= 1 ? a : active <= 0 ? b : a);
  const g2 = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, 2, x, y, r);
  g2.addColorStop(0, active > 0.5 ? th.smileyHi : "#dcdcd6"); g2.addColorStop(1, active > 0.5 ? th.smiley : "#cfcfc9");
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = mix(g2, g2); ctx.fill();
  if (th === THEMES.ink) { ctx.lineWidth = 2.5; ctx.strokeStyle = th.ink; ctx.stroke(); }
  ctx.strokeStyle = active > 0.5 ? th.face : "#a9a9a4"; ctx.lineWidth = 2.6; ctx.lineCap = "round";
  for (const ex of [x - 11.5, x + 14.5]) { ctx.beginPath(); ctx.arc(ex, y - 7, 7, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); }
  ctx.beginPath(); ctx.arc(x, y - 9, 28, 0.55, Math.PI - 0.55); ctx.stroke();
}

// opts: x, y (top-left), w (px width; default 465 = 1 unit per px), text (typed string), caret (bool),
//   placeholder (string with "\n" for the empty widget), smiley (0 grey/inactive … 1 yellow), notch (bool),
//   theme ("screen" | "room" | "ink"), appear (0..1 pop-in scale about anchor), anchor ([u, v] card fractions),
//   alpha, textAlpha (fade the typed text), edge (px of card thickness drawn below/right, physical card).
export function drawNoteCard(ctx, o = {}) {
  const { x = 0, y = 0, w = CARD_W, text = "", caret = false, placeholder = null, notch = false, theme = "screen", appear = 1, anchor = [0.45, 0.72], alpha = 1, edge = 0 } = o;
  const th = typeof theme === "string" ? THEMES[theme] : theme;
  const active = o.smiley ?? 1;
  if (appear <= 0 || alpha <= 0) return;
  const s = w / CARD_W;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (appear < 1) {
    const ax = anchor[0] * CARD_W, ay = anchor[1] * CARD_H, k = Math.max(0.001, appear);
    ctx.translate(ax, ay); ctx.scale(k, k); ctx.translate(-ax, -ay);
  }
  // thickness (physical card): a darker rim peeking out below and right
  if (edge > 0) { const e = edge / s; rr(ctx, e * 0.6, e, CARD_W, CARD_H, R); ctx.fillStyle = th.outline; ctx.fill(); }
  // body (+ nub) with a faint dark keyline
  ctx.save();
  if (notch) { notchPath(ctx); ctx.lineWidth = 5; ctx.strokeStyle = th.outline; ctx.stroke(); }
  rr(ctx, 0, 0, CARD_W, CARD_H, R); ctx.lineWidth = 3; ctx.strokeStyle = th.outline; ctx.stroke();
  const body = ctx.createLinearGradient(0, 0, 0, CARD_H);
  body.addColorStop(0, th.paperTop); body.addColorStop(0.3, th.paper); body.addColorStop(0.62, th.paper); body.addColorStop(1, th.paperBot || th.paper);
  ctx.fillStyle = body;
  rr(ctx, 0, 0, CARD_W, CARD_H, R); ctx.fill();
  if (notch) { notchPath(ctx); ctx.fill(); }
  ctx.restore();
  smiley(ctx, th, active);
  trash(ctx, TRASH[0], TRASH[1], active > 0.5 ? th.ink : "#9d9d98", 3.3);
  // text area + button row
  ctx.lineWidth = AREA.lw; ctx.strokeStyle = th.ink; ctx.lineJoin = "round";
  rr(ctx, AREA.x0, AREA.y0, AREA.x1 - AREA.x0, AREA.y1 - AREA.y0, AREA.r); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(AREA.x0, AREA.btnY); ctx.lineTo(AREA.x1, AREA.btnY); ctx.moveTo(AREA.divX, AREA.btnY); ctx.lineTo(AREA.divX, AREA.y1); ctx.stroke();
  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = "1.6px";
  ctx.font = "400 24px 'Geist Mono'"; ctx.fillStyle = th.muted; ctx.fillText("CANCEL", CANCEL[0], CANCEL[1] + 8.5);
  ctx.font = "700 24px 'Geist Mono'"; ctx.fillStyle = th.ink; ctx.fillText("SAVE", SAVE[0], SAVE[1] + 8.5);
  ctx.letterSpacing = "0px"; ctx.textAlign = "left";
  // typed text / placeholder
  ctx.font = `360 ${TEXT.size}px 'Geist Mono'`;
  if (text) {
    ctx.save(); ctx.globalAlpha *= o.textAlpha ?? 1; ctx.fillStyle = th.text; ctx.fillText(text, TEXT.x, TEXT.y); ctx.restore();
  } else if (placeholder) {
    ctx.font = "400 22px 'Geist Mono'"; ctx.fillStyle = "#a3a39d";
    placeholder.split("\n").forEach((line, i) => ctx.fillText(line, TEXT.x, TEXT.y + i * 34));
  }
  if (caret) { ctx.fillStyle = "#1e1e1c"; ctx.fillRect(cardTextX(text.length) + 1, TEXT.y - 21, 2.4, 28); }
  ctx.restore();
}

const _cards = new Map();
export function noteCardCanvas(w, opts = {}) {
  const key = JSON.stringify([w, opts]);
  let c = _cards.get(key);
  if (!c) {
    const s = w / CARD_W, pad = Math.ceil(52 * s);
    c = document.createElement("canvas"); c.width = Math.ceil(w + pad * 2); c.height = Math.ceil(CARD_H * s + pad * 2);
    drawNoteCard(c.getContext("2d"), { ...opts, x: pad, y: pad, w });
    c.__pad = pad;
    _cards.set(key, c);
  }
  return c;
}
export function releaseNoteCards() { _cards.clear(); }

// The red selection rectangle. drag (0..1, optional): the rectangle being dragged out from (x0, y0).
export function drawSelection(ctx, o) {
  const { x0, y0, width = 5, color = "#c62e12", shadow = "rgba(110,10,0,0.9)" } = o;
  let { x1, y1 } = o;
  if (o.drag != null) { const d = clamp(o.drag); x1 = x0 + (x1 - x0) * d; y1 = y0 + (y1 - y0) * d; }
  ctx.save();
  ctx.lineJoin = "miter";
  // a thin darker rim on the lower/right side of the line (as on the close-up)
  ctx.lineWidth = width; ctx.strokeStyle = shadow;
  ctx.strokeRect(x0 + width * 0.1, y0 + width * 0.12, x1 - x0, y1 - y0);
  ctx.strokeStyle = color;
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
}
