// The feedback note card (the page's comment widget) and the red selection rectangle.
// Seen on the laptop (25.5–30.5 s), full-screen in the close-up s08 (30.56–32.60, "This is really good" typed in),
// and later as a physical card propped up in the black-and-white room (57–69 s).
//
// Geometry is measured on the close-up in CARD UNITS: the card is 465 units wide and 648 tall (the close-up's
// first frame shows it 465 px wide); every call scales that to the requested width.
//
//   drawNoteCard(ctx, { x, y, w | h, text, caret, ... }) paint the card with its top-left at (x, y), width w (or height h)
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

// Colour sets. "screen" = the web widget (close-up; with its dark offset rim); "room" = the physical card in the B&W
// room (warm paper, maroon-brown ink, no speech-bubble notch, the smiley stays yellow). "ink" = pure white/black line
// art for plates.
const THEMES = {
  screen: { paper: "#dddcd2", paperTop: "#cecec3", paperBot: "#bfbfb5", ink: "#262624", text: "#51514e", muted: "#747470", outline: "rgba(20,16,14,0.55)", smiley: "#ad993b", smileyHi: "#bdad50", glow: "214,92,62", face: "#3b3222", rim: { dx: -3.5, dy: -1.5, color: "rgba(10,11,8,0.92)" } },
  room: { paper: "#ece8e0", paperTop: "#e2ddd4", ink: "#4a3036", text: "#4f3a3e", muted: "#7a6468", outline: "rgba(40,20,24,0.8)", smiley: "#e6d25a", smileyHi: "#f0e27c", glow: "226,110,80", face: "#4a3228" },
  ink: { paper: "#f2f0ea", paperTop: "#f2f0ea", ink: "#0a0a0a", text: "#1a1a1a", muted: "#555", outline: "#0a0a0a", smiley: "#f2f0ea", smileyHi: "#f2f0ea", glow: null, face: "#0a0a0a" },
};

function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

// The speech-bubble nub on the card's left edge, in card units, traced on the close-up's first frame: a round head
// (centre (-26.5, 327.9), r 17.7) joined to the card by a wide neck (card edge y 299–356.5), with a small V where the
// neck's top edge meets the head. The neck runs 4 units into the card so the fills overlap.
const NUB_TOP = [[4, 297.5], [0.1, 299.3], [-3.4, 300.8], [-7.4, 302.8], [-10.4, 304.8], [-13.5, 306.8], [-15.5, 308.8], [-17.0, 311.3]];
const NUB_BOT = [[-21.5, 343.9], [-16.5, 345.9], [-14.5, 347.9], [-12.5, 349.9], [-9.4, 351.8], [-6.4, 353.4], [-3.4, 354.4], [-1.4, 355.0], [0.9, 356.5], [4, 357.5]];
function notchPath(ctx, dx = 0, dy = 0) {
  ctx.beginPath();
  NUB_TOP.forEach(([x, y], i) => (i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy)));
  ctx.arc(-26.5 + dx, 327.9 + dy, 17.7, (-62 * Math.PI) / 180, (76 * Math.PI) / 180, true);
  NUB_BOT.forEach(([x, y]) => ctx.lineTo(x + dx, y + dy));
  ctx.closePath();
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
    const gr = th.glowR || 1.28;
    const g = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * gr);
    for (const [t, a] of th.glowStops || [[0, 0.95], [0.45, 0.55], [1, 0]]) g.addColorStop(t, `rgba(${th.glow},${a * active})`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * (gr + 0.02), 0, 7); ctx.fill();
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

// opts: x, y (top-left), w (px width; default 465 = 1 unit per px) or h (px height, when w is not given), text (typed string), caret (bool),
//   placeholder (string with "\n" for the empty widget), smiley (0 grey/inactive … 1 yellow), notch (bool),
//   theme ("screen" | "room" | "ink"), appear (0..1 pop-in scale about anchor), anchor ([u, v] card fractions),
//   alpha, textAlpha (fade the typed text), edge (px of card thickness drawn below/right, physical card),
//   body ([x0, y0, x1, y1] card-unit extents of the card body; default the full 465 x 648).
// A theme object may also carry: rim { dx, dy, color, nub?: { dx, dy } } (the widget's hard dark rim: a copy of the
//   body offset by (dx, dy) and grown 1.5 units, drawn under it; nub: its own offset for the nub's copy; with a rim
//   the nub has no keyline of its own), body, area (any of
//   { x0, y0, x1, y1, r, lw, btnY, divX }: the text box and button row), trashLw, glowR (halo outer radius / smiley
//   radius, default 1.28) and glowStops ([[t, alpha], ...] for the halo).
export function drawNoteCard(ctx, o = {}) {
  const { x = 0, y = 0, text = "", caret = false, placeholder = null, notch = false, theme = "screen", appear = 1, anchor = [0.45, 0.72], alpha = 1, edge = 0 } = o;
  // size: w (px) wins; otherwise h (px, the card keeps its 465 x 648 proportions); otherwise 1 px per card unit
  const w = o.w ?? (o.h != null ? (o.h * CARD_W) / CARD_H : CARD_W);
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
  // body extents (card units; default the full 465 × 648): the close-up's card edges sit a unit or two off the
  // layout, so s08 passes the measured ones
  const [bx0, by0, bx1, by1] = o.body || th.body || [0, 0, CARD_W, CARD_H];
  const bodyPath = (dx = 0, dy = 0) => rr(ctx, bx0 + dx, by0 + dy, bx1 - bx0, by1 - by0, R);
  ctx.save();
  // the widget's hard dark rim: a copy of the body (+ nub) offset up and left, grown by 1.5 units (measured on the
  // close-up: 5 px of near-black on the left edge, 3 on the top, only the keyline right and below)
  if (th.rim) {
    const { dx, dy, color } = th.rim;
    ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineJoin = "round";
    bodyPath(dx, dy); ctx.fill(); ctx.stroke();
    if (notch) { const n = th.rim.nub || th.rim; notchPath(ctx, n.dx, n.dy); ctx.fill(); ctx.stroke(); }
  }
  // body (+ nub) with a faint dark keyline
  // (with a rim the nub has no keyline of its own: its lower edge meets the page directly, as on the close-up)
  if (notch && !th.rim) { notchPath(ctx); ctx.lineWidth = 3; ctx.lineJoin = "round"; ctx.strokeStyle = th.outline; ctx.stroke(); }
  bodyPath(); ctx.lineWidth = 3; ctx.strokeStyle = th.outline; ctx.stroke();
  const body = ctx.createLinearGradient(0, 0, 0, CARD_H);
  body.addColorStop(0, th.paperTop); body.addColorStop(0.3, th.paper); body.addColorStop(0.62, th.paper); body.addColorStop(1, th.paperBot || th.paper);
  ctx.fillStyle = body;
  bodyPath(); ctx.fill();
  if (notch) { notchPath(ctx); ctx.fill(); }
  ctx.restore();
  smiley(ctx, th, active);
  trash(ctx, TRASH[0], TRASH[1], active > 0.5 ? th.ink : "#9d9d98", th.trashLw || 3.3);
  // text area + button row (a theme may carry its own measured geometry: th.area, any subset of AREA's fields)
  const AR = th.area ? { ...AREA, ...th.area } : AREA;
  ctx.lineWidth = AR.lw; ctx.strokeStyle = th.ink; ctx.lineJoin = "round";
  rr(ctx, AR.x0, AR.y0, AR.x1 - AR.x0, AR.y1 - AR.y0, AR.r); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(AR.x0, AR.btnY); ctx.lineTo(AR.x1, AR.btnY); ctx.moveTo(AR.divX, AR.btnY); ctx.lineTo(AR.divX, AR.y1); ctx.stroke();
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
