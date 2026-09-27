// s05 (pass 3): the keyboard under his left hand. The tracer never saw the desk layer there (the hand covers it in
// every frame it used), so the layer held a smooth hand-shaped fill; through the camera settle (23.12-23.36) the hand
// slides up to ~20 px right across the keys (its ECC track against the desk's settle grid) and that fill showed as a
// pale ghost hand round the fingers. Here the hidden part is re-drawn from the layer's own drawing: each pixel under
// the hand (the left hand's outline, grown) takes the colour one key pitch back along its key row, filled in order
// along the row, so the rows of keys, the keyboard well and the palm rest run on under the hand. Row direction and key
// pitch measured on the settled source frame (row angle 15-16.5 deg by projection variance; key gaps of the function
// and number rows every 39 px at x' 536 falling to 31 px at x' 920, x' along the rows).
import { decodeRings } from "./ink.js";

const TH = (15.7 * Math.PI) / 180;             // the key rows rise to the right at this angle (frame px)
const DX = Math.cos(TH), DY = -Math.sin(TH);    // unit vector along a row
const C = [760, 680];                           // origin of the row coordinate x' (rotated frame, as measured)
const pitchAt = (xr) => Math.max(30, Math.min(40, 39 - 0.0205 * (xr - 536)));
const Y_MAX = 790;                              // row coordinate y' of the palm rest's front edge: below it, left alone
const GROW = 5, SWEEP = 18, HAND_GROW = 3;
// the keyboard well in row coordinates (x', y'): its left edge runs from (480, 612) at the function row to (565, 715)
// at the bottom row; its bottom edge lies at y' 727 at x' 515 and 719 at x' 850
const wellLeft = (yr) => 480 + 0.825 * (yr - 612);
const wellBottom = (xr) => 727 - 0.024 * (xr - 515);

// The desk layer's hidden fill under the hand (frame px): the smooth region of the desk layer drawn alone (local sd
// < 6 of 7x7 px, value > 45) round the hand, closed and simplified to 1.2 px (from a render of this layer, not the source)
const BLOB = [623,742, 623,746, 632,749, 643,749, 655,758, 663,759, 674,765, 709,798, 719,803, 734,803, 753,808, 756,813, 762,815, 767,820, 768,833, 779,834, 780,842, 787,852, 795,852, 797,855, 802,857, 806,867, 806,881, 801,895, 793,902, 788,902, 787,927, 785,930, 785,936, 790,941, 790,945, 864,945, 864,938, 876,914, 884,914, 898,927, 919,941, 919,945, 959,945, 959,876, 957,871, 944,864, 942,857, 935,853, 927,844, 927,838, 916,836, 890,812, 876,808, 863,797, 861,793, 857,751, 839,740, 835,727, 828,722, 823,715, 815,712, 811,708, 805,694, 794,692, 784,687, 777,679, 775,673, 771,673, 765,668, 764,663, 746,665, 741,662, 736,662, 731,667, 726,669, 718,669, 712,662, 702,663, 702,665, 695,671, 694,676, 689,683, 679,691, 669,694, 659,703, 656,708, 654,720, 647,726, 646,730, 640,734, 630,734];

// l: an uncut layer { c, x, y, w, h } (frame px); hand: the left hand's layer data (box, alpha). Modifies l.c.
export function fillUnderHand(l, hand) {
  const { c, x: ox, y: oy, w, h } = l;
  const m = document.createElement("canvas"); m.width = w; m.height = h;
  const q = m.getContext("2d");
  q.fillStyle = "#fff"; q.strokeStyle = "#fff"; q.lineWidth = 2 * GROW; q.lineJoin = "round";
  // (swept SWEEP px back along the rows too, so the fill starts clear of the pale rim the tracer left round the
  // fingers on the desk layer)
  const rings = decodeRings(hand.alpha);
  for (let k = 0; k <= SWEEP; k += 2) {
    q.beginPath();
    for (let i = 0; i < BLOB.length; i += 2) { const x = BLOB[i] - ox - k * DX, y = BLOB[i + 1] - oy - k * DY; i ? q.lineTo(x, y) : q.moveTo(x, y); }
    q.closePath(); q.fill(); q.stroke();
    // ... and the hand's own outline
    q.beginPath();
    for (const r of rings) { r.forEach(([x, y], i) => { const X = x + hand.box[0] - ox - k * DX, Y = y + hand.box[1] - oy - k * DY; i ? q.lineTo(X, Y) : q.moveTo(X, Y); }); q.closePath(); }
    q.fill("evenodd"); q.stroke();
  }
  const bx0 = 600, by0 = 640, bx1 = 980, by1 = 946;
  const X0 = Math.max(0, Math.floor(bx0 - ox - GROW - 2)), Y0 = Math.max(0, Math.floor(by0 - oy - GROW - 2));
  const X1 = Math.min(w, Math.ceil(bx1 - ox + GROW + 2)), Y1 = Math.min(h, Math.ceil(by1 - oy + GROW + 2));
  const M = q.getImageData(0, 0, w, h).data;
  // the pixels actually re-drawn: the unswept mask (the sweep's extra band stays as traced; it only feeds the fill)
  const m0 = document.createElement("canvas"); m0.width = w; m0.height = h;
  const q0 = m0.getContext("2d");
  q0.fillStyle = "#fff"; q0.strokeStyle = "#fff"; q0.lineWidth = 2 * GROW; q0.lineJoin = "round";
  q0.beginPath();
  for (let i = 0; i < BLOB.length; i += 2) (i ? q0.lineTo(BLOB[i] - ox, BLOB[i + 1] - oy) : q0.moveTo(BLOB[i] - ox, BLOB[i + 1] - oy));
  q0.closePath(); q0.fill(); q0.stroke();
  q0.lineWidth = 2 * HAND_GROW; q0.beginPath();
  for (const r of rings) { r.forEach(([x, y], i) => { const X = x + hand.box[0] - ox, Y = y + hand.box[1] - oy; i ? q0.lineTo(X, Y) : q0.moveTo(X, Y); }); q0.closePath(); }
  q0.fill("evenodd"); q0.stroke();
  const M0 = q0.getImageData(0, 0, w, h).data;
  const g = c.getContext("2d");
  const id = g.getImageData(0, 0, w, h), p = id.data, orig = new Uint8ClampedArray(p);
  // the pixels to re-draw, with their row coordinates
  const list = [];
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
    const a = M[(y * w + x) * 4 + 3];
    if (a < 8) continue;
    const fx = x + ox + 0.5 - C[0], fy = y + oy + 0.5 - C[1];
    const xr = fx * DX + fy * DY + C[0], yr = -fx * DY + fy * DX + C[1];
    if (yr > Y_MAX) continue;
    list.push([xr, x, y, a / 255, Math.min(1, (Y_MAX - yr) / 6), yr]);
  }
  list.sort((u, v) => u[0] - v[0] || u[2] - v[2] || u[1] - v[1]);
  const at = (x, y, ch) => {
    const x0 = Math.floor(x), y0 = Math.floor(y), u = x - x0, v = y - y0;
    const cx0 = Math.max(0, Math.min(w - 1, x0)), cx1 = Math.max(0, Math.min(w - 1, x0 + 1));
    const cy0 = Math.max(0, Math.min(h - 1, y0)), cy1 = Math.max(0, Math.min(h - 1, y0 + 1));
    const P = (xx, yy) => p[(yy * w + xx) * 4 + ch];
    return (P(cx0, cy0) * (1 - u) + P(cx1, cy0) * u) * (1 - v) + (P(cx0, cy1) * (1 - u) + P(cx1, cy1) * u) * v;
  };
  // keys: one pitch back along the row while that stays inside the keyboard well, the rest (the row's first key)
  // afterwards from one pitch on, right to left; the palm rest below the well: carried along the row from its visible
  // edge (1 px steps: it is flat)
  const put = (x, y, sx, sy, wgt) => { const k = (y * w + x) * 4; for (let ch = 0; ch < 3; ch++) p[k + ch] = Math.round(p[k + ch] * (1 - wgt) + at(sx, sy, ch) * wgt); };
  const late = [];
  for (const e of list) {
    const [xr, x, y, a, fy] = e, yr = e[5], wgt = a * fy;
    if (yr >= wellBottom(xr)) { put(x, y, x - DX, y - DY, wgt); continue; }
    const d = pitchAt(xr - pitchAt(xr) / 2);
    if (xr - d < wellLeft(yr) + 2) { late.push([...e, d]); continue; }
    put(x, y, x - d * DX, y - d * DY, wgt);
  }
  for (let i = late.length - 1; i >= 0; i--) { const [, x, y, a, fy, , d] = late[i]; put(x, y, x + d * DX, y + d * DY, a * fy); }
  // keep the traced drawing outside the re-drawn part
  for (const e of list) { const k = (e[2] * w + e[1]) * 4, a0 = M0[k + 3] / 255; if (a0 < 1) for (let ch = 0; ch < 3; ch++) p[k + ch] = Math.round(p[k + ch] * a0 + orig[k + ch] * (1 - a0)); }
  g.putImageData(id, 0, 0);
  return l;
}
