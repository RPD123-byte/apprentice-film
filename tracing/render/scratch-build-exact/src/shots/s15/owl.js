// s15 owl seen from behind, running (and at the end flying) away from camera: a glowing white bird whose round,
// flat-topped head runs straight into the body, the headphone band over the crown and a dark cup either side,
// two fans of long pointed feathers for wings, a small tuft of tail feathers low on the right and thin running legs.
// Units = frame px at s = 1 (measured at 41.00 s: head 152 px wide, wing tips 390 px apart). Origin = the middle of
// the bird between the crown and the bottom of the body.
import { taper } from "../../lib/ink.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { rng, clamp } from "../../lib/rng.js";

const G = (v, a = 1) => { const c = Math.round(clamp(v) * 255); return a >= 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`; };
const TAU = Math.PI * 2;

function line(g, pts, w, col, per = 6, end = 0.25) {
  const q = pts.length > 2 ? sampleCurve(pts, per) : pts;
  taper(g, q, (u) => w * (end + (1 - end) * Math.pow(Math.sin(Math.PI * u), 0.5)), col);
}
function blob(g, pts) { g.beginPath(); smoothPath(g, pts, true); }
// soft white fill: grey rim, bright core pushed toward (lx, ly)
function soft(g, path, { base = 0.97, rim = 0.78, lx = -6, ly = -8, blur = 9, shrink = 0.93 } = {}) {
  g.save(); path(g); g.clip();
  g.fillStyle = G(rim); g.fillRect(-400, -400, 800, 800);
  g.filter = `blur(${blur}px)`;
  g.fillStyle = G(base); g.translate(lx, ly); g.scale(shrink, shrink); path(g); g.fill();
  g.filter = "none";
  g.restore();
}

// Wing (back view): long narrow pointed feathers hanging off the leading edge S -> Wr -> T, the distal ones
// swinging round to point along the hand, each with a thin dark keyline on its lower edge; a soft white covert band
// along the leading edge. rot turns the whole wing about S (flap); spread opens/closes the fan.
function wing(g, S, Wr, T, side, rot, spread, seed) {
  const r = rng(seed);
  const c = Math.cos(rot), sn = Math.sin(rot);
  const R = ([x, y]) => [S[0] + (x - S[0]) * c - (y - S[1]) * sn, S[1] + (x - S[0]) * sn + (y - S[1]) * c];
  const w2 = R(Wr), t2 = R(T);
  const lead = sampleCurve([S, [(S[0] + w2[0]) / 2, (S[1] + w2[1]) / 2 - 8], w2, [(w2[0] + t2[0]) / 2, (w2[1] + t2[1]) / 2 - 3], t2], 10);
  const hand = [t2[0] - w2[0], t2[1] - w2[1]], hl = Math.hypot(hand[0], hand[1]);
  const down = [0.12 * side, 1];
  const n = 8, feathers = [];
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);                              // 0 at the body, 1 at the tip
    const p = lead[Math.min(lead.length - 1, Math.round((0.08 + 0.9 * f) * (lead.length - 1)))];
    const k = Math.pow(f, 1.2) * 0.8 * spread;
    let dx = down[0] * (1 - k) + (hand[0] / hl) * k, dy = down[1] * (1 - k) + (hand[1] / hl) * k;
    const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;
    const L = (52 + 34 * Math.pow(f, 0.9)) * (0.92 + 0.16 * r());
    feathers.push({ p, d: [dx, dy], L, w: 24 - 6 * f });
  }
  const shape = ({ p, d, L, w }) => {
    const nx = -d[1], ny = d[0];
    return [[p[0] + nx * w * 0.5, p[1] + ny * w * 0.5], [p[0] + d[0] * L * 0.6 + nx * w * 0.42, p[1] + d[1] * L * 0.6 + ny * w * 0.42],
      [p[0] + d[0] * L * 0.9 + nx * w * 0.16, p[1] + d[1] * L * 0.9 + ny * w * 0.16], [p[0] + d[0] * L, p[1] + d[1] * L],
      [p[0] + d[0] * L * 0.86 - nx * w * 0.22, p[1] + d[1] * L * 0.86 - ny * w * 0.22], [p[0] + d[0] * L * 0.5 - nx * w * 0.45, p[1] + d[1] * L * 0.5 - ny * w * 0.45],
      [p[0] - nx * w * 0.5, p[1] - ny * w * 0.5]];
  };
  // the outer feathers first, the inner ones on top
  for (let i = n - 1; i >= 0; i--) {
    const sh = shape(feathers[i]);
    g.fillStyle = G(0.93 - 0.05 * (i % 2)); blob(g, sh); g.fill();
    // keyline down the trailing side and round the tip (the side away from the body)
    const edge = side < 0 ? [sh[3], sh[4], sh[5], sh[6]] : [sh[3], sh[2], sh[1], sh[0]];
    line(g, edge, 1.5, G(0.18, 0.85), 4, 0.1);
    line(g, [feathers[i].p, [(sh[2][0] + sh[4][0]) / 2, (sh[2][1] + sh[4][1]) / 2]], 0.9, G(0.55, 0.5), 3, 0.2);
  }
  // covert band: soft white along the leading edge, scalloped below
  const band = lead.slice();
  for (let i = lead.length - 1; i >= 0; i--) {
    const f = i / (lead.length - 1), q = lead[i];
    const dd = 24 + 14 * (1 - f) + 5 * Math.sin(i * 1.9);
    band.push([q[0] + down[0] * dd, q[1] + down[1] * dd]);
  }
  soft(g, (c2) => { c2.beginPath(); smoothPath(c2, band, true); }, { base: 0.99, rim: 0.86, lx: 0, ly: -4, blur: 5, shrink: 1 });
  line(g, lead, 1.3, G(0.35, 0.6), 4, 0.2);
}

function leg(g, x, y, fx, fy, s) {
  // thin feathered leg from (x,y) on the body to the foot at (fx,fy); three toes with dark claws
  const dx = fx - x, dy = fy - y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  taper(g, [[x, y], [x + dx * 0.5, y + dy * 0.5], [fx, fy]], (u) => 24 - 12 * u, G(0.93));
  line(g, [[x + 5, y], [fx + 3, fy]], 1.0, G(0.55, 0.6), 3, 0.2);
  const a = Math.atan2(uy, ux);
  for (const k of [-0.55, 0, 0.55]) {
    const tl = 22 * s * (k === 0 ? 1.1 : 0.9);
    const ex = fx + Math.cos(a + k) * tl, ey = fy + Math.sin(a + k) * tl;
    taper(g, [[fx, fy], [(fx + ex) / 2, (fy + ey) / 2], [ex, ey]], (u) => 10 - 5 * u, G(0.9));
    line(g, [[fx + (ex - fx) * 0.3, fy + (ey - fy) * 0.3], [ex, ey]], 1.0, G(0.45, 0.7), 3, 0.2);
    g.fillStyle = "#222"; g.beginPath(); g.ellipse(ex + Math.cos(a + k) * 3, ey + Math.sin(a + k) * 3, 2.2, 3.6, a + k - Math.PI / 2, 0, TAU); g.fill();
  }
}

// pose: { flap: -1..1 (wings up +), bank: -1..1, run: phase 0..1 (feet), fly: 0..1 (feet dangle), roll (rad),
//         spread (fan opening), headX, lift (hop height, units: the shadow stays on the floor) }
// Shape measured on the source at 40.80–43.30 (owl-centred crops): a round head (168 wide, crown 136 above the
// centre) sitting on a rounder, wider body (184 wide, bottom 158 below), short legs, big three-toed feet, wings from
// the shoulders fanning out and up to tips ~195 out, headphone cups at the sides of the head, a small tail tuft.
export function drawOwlBack(g, x, y, s, pose = {}) {
  const { flap = 0, bank = 0, run = 0, fly = 0, roll = 0, headX = 0, spread = 1, lift = 0, shadow = 1 } = pose;
  // ---- the floor shadow (stays on the floor under a hopping owl)
  if (shadow > 0) {
    g.save();
    g.translate(x, y + (205 + lift) * s); g.scale(s, s);
    g.filter = `blur(${Math.max(1, 9 * s).toFixed(1)}px)`;
    g.fillStyle = `rgba(0,0,0,${0.5 * shadow})`;
    g.beginPath(); g.ellipse(0, 0, 88, 17, 0, 0, TAU); g.fill();
    g.filter = "none";
    g.restore();
  }
  g.save();
  g.translate(x, y); g.rotate(roll); g.scale(s, s);
  g.lineCap = "round"; g.lineJoin = "round";
  // ---- legs (behind the body): short, the feet pumping
  const ph = run * TAU;
  if (fly < 0.5) {
    const a = Math.sin(ph), b = -a;
    const up = (v) => Math.max(0, v);
    leg(g, -34, 104, -46 + 10 * up(a), 146 - 24 * up(a), 1.3);
    leg(g, 30, 104, 42 - 8 * up(b), 146 - 24 * up(b), 1.3);
  } else {
    leg(g, -30, 104, -36, 144, 1.25); leg(g, 28, 104, 32, 144, 1.25);
  }
  // ---- tail: a short tuft low on the right
  const tail = [[30, 84], [72, 70], [96, 84], [86, 104], [54, 116], [30, 110]];
  soft(g, (c) => { c.beginPath(); smoothPath(c, tail, true); }, { base: 0.95, rim: 0.78, lx: -3, ly: -3, blur: 4 });
  for (const [a2, b2] of [[[40, 90], [88, 82]], [[40, 98], [86, 98]], [[38, 106], [72, 112]]]) line(g, [a2, b2], 1.3, G(0.3, 0.75), 3, 0.15);
  // ---- body + head: one soft white shape (round head on a rounder body)
  const headPts = [], bodyPts = [];
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * TAU, c = Math.cos(t), sn = Math.sin(t);
    const n = sn < 0 ? 2.6 : 2.1;
    headPts.push([headX + Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * 78, -66 + Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n) * 70]);
    bodyPts.push([headX * 0.3 + c * 88 * (1 + 0.05 * sn) * (sn > 0 ? 1 - 0.12 * sn : 1), 34 + sn * (sn > 0 ? 80 : 90)]);
  }
  const both = (c) => { c.beginPath(); smoothPath(c, bodyPts, true); smoothPath(c, headPts, true); };
  g.save(); g.lineWidth = 3.2; g.strokeStyle = G(0.3, 0.7); both(g); g.stroke(); g.restore();   // outer keyline (the fill hides the inner half)
  soft(g, both, { base: 0.99, rim: 0.7, lx: -14, ly: -14, blur: 20, shrink: 0.92 });
  // feather texture: short grey flicks over the back, denser toward the shadowed lower right; outline keylines
  const rr = rng(97);
  g.save(); both(g); g.clip();
  for (let i = 0; i < 90; i++) {
    const x0 = -90 + rr() * 180, y0 = -120 + rr() * 230, k = Math.max(0, (x0 + y0 * 0.6) / 150);
    if (rr() > 0.25 + 0.6 * k) continue;
    line(g, [[x0, y0], [x0 + 3 + rr() * 4, y0 + 7 + rr() * 8]], 0.9 + rr() * 0.6, G(0.55, 0.25 + 0.3 * k), 3, 0.1);
  }
  g.restore();
  line(g, [[-50, -2], [-14, 8], [30, 2]], 1.1, G(0.6, 0.45), 5, 0.1);
  // ---- wings: two fans from the shoulders, out and up
  const upA = flap * 0.34;
  wing(g, [-58, -14], [-138, -66], [-204, -44], -1, -upA + bank * 0.15, spread, 71);
  wing(g, [58, -16], [138, -68], [206, -40], 1, upA + bank * 0.15, spread, 72);
  // ---- head details: tuft at the upper left, cups, band
  g.save(); g.translate(headX, 0);
  g.fillStyle = G(0.97);
  blob(g, [[-70, -112], [-78, -138], [-62, -126], [-54, -146], [-44, -128], [-36, -120]]); g.fill();
  line(g, [[-64, -118], [-72, -134]], 1.1, G(0.55, 0.7), 3, 0.1);
  line(g, [[-52, -122], [-55, -140]], 1.1, G(0.55, 0.7), 3, 0.1);
  const cup = (cx, cy, rx, ry, side) => {
    const gr = g.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
    gr.addColorStop(0, G(0.42)); gr.addColorStop(0.5, G(0.22)); gr.addColorStop(1, G(0.12));
    g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, rx, ry, side * 0.08, 0, TAU); g.fill();
    g.fillStyle = G(0.34); g.beginPath(); g.ellipse(cx + side * 5, cy + 2, rx * 0.58, ry * 0.78, side * 0.08, 0, TAU); g.fill();
    g.strokeStyle = G(0.7, 0.9); g.lineWidth = 2.2; g.beginPath(); g.ellipse(cx + side * 5, cy + 2, rx * 0.58, ry * 0.78, side * 0.08, -1.4, 1.2); g.stroke();
    g.strokeStyle = G(0.62, 0.8); g.lineWidth = 1.6; g.beginPath(); g.ellipse(cx, cy, rx - 2, ry - 2, side * 0.08, 3.6, 5.4); g.stroke();
    g.strokeStyle = G(0.06); g.lineWidth = 2.6; g.beginPath(); g.ellipse(cx, cy, rx, ry, side * 0.08, 0, TAU); g.stroke();
  };
  cup(-82, -62, 21, 42, -1);
  cup(82, -66, 22, 43, 1);
  const band = [[-86, -100], [-70, -134], [-36, -156], [4, -161], [44, -150], [72, -128], [86, -104]];
  line(g, band, 9, G(0.13), 8, 0.85);
  line(g, band.map(([a2, b2]) => [a2, b2 - 2.2]), 2.6, G(0.55, 0.85), 8, 0.4);
  g.restore();
  g.restore();
}
