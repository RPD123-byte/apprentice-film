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

// Wing (back view), fix pass 1: measured on 1.5x crops of 41.00 / 42.00 / 43.00. The root sits just under the head
// (S ~ (+-55, -5)); the leading edge rises ~20 deg to the wrist (+-130, -42) and runs out to the tip (+-185, -48); long
// pointed feathers hang off it, the inner ones pointing down (~55 long), the outer ones swinging round to point out
// along the hand, so the trailing tips reach ~(+-155, +20) and the span is ~390 at 41.00. rot turns the whole wing
// about S (flap); spread opens/closes the fan.
function wing(g, S, Wr, T, side, rot, spread, seed, fl = 1, fold = 1) {
  const r = rng(seed);
  // (fix 1b: fold < 1 draws the hand and wrist pulled in toward the shoulder: a folded, foreshortened wing)
  if (fold < 1) { Wr = [S[0] + (Wr[0] - S[0]) * (0.55 + 0.45 * fold), S[1] + (Wr[1] - S[1]) * (0.55 + 0.45 * fold)]; T = [S[0] + (T[0] - S[0]) * fold, S[1] + (T[1] - S[1]) * fold]; fl *= 0.8 + 0.2 * fold; }
  const c = Math.cos(rot), sn = Math.sin(rot);
  const R = ([x, y]) => [S[0] + (x - S[0]) * c - (y - S[1]) * sn, S[1] + (x - S[0]) * sn + (y - S[1]) * c];
  const w2 = R(Wr), t2 = R(T);
  const lead = sampleCurve([S, [(S[0] + w2[0]) / 2, (S[1] + w2[1]) / 2 - 6], w2, [(w2[0] + t2[0]) / 2, (w2[1] + t2[1]) / 2 - 2], t2], 10);
  const hand = [t2[0] - w2[0], t2[1] - w2[1]], hl = Math.hypot(hand[0], hand[1]);
  const down = [0.25 * side, 1];
  const n = 9, feathers = [];
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);                              // 0 at the body, 1 at the tip
    const p = lead[Math.min(lead.length - 1, Math.round((0.12 + 0.88 * f) * (lead.length - 1)))];
    const k = Math.pow(f, 1.3) * 0.95 * spread;
    let dx = down[0] * (1 - k) + (hand[0] / hl) * k, dy = down[1] * (1 - k) + (hand[1] / hl) * k;
    const dl = Math.hypot(dx, dy); dx /= dl; dy /= dl;
    const L = (48 + 16 * Math.pow(f, 0.8)) * (0.92 + 0.16 * r()) * fl;
    feathers.push({ p, d: [dx, dy], L, w: 27 - 6 * f });   // (pass 4: wider, overlapping, as in the source)
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
    g.fillStyle = G(0.95 - 0.04 * (i % 2)); blob(g, sh); g.fill();
    // keyline down the trailing side and round the tip (the side away from the body)
    const edge = side < 0 ? [sh[3], sh[4], sh[5], sh[6]] : [sh[3], sh[2], sh[1], sh[0]];
    line(g, edge, 1.4, G(0.3, 0.8), 4, 0.1);
    line(g, [feathers[i].p, [(sh[2][0] + sh[4][0]) / 2, (sh[2][1] + sh[4][1]) / 2]], 0.8, G(0.6, 0.45), 3, 0.2);
  }
  // covert band: soft white along the leading edge, scalloped below
  const band = lead.slice();
  for (let i = lead.length - 1; i >= 0; i--) {
    const f = i / (lead.length - 1), q = lead[i];
    const dd = 20 + 12 * (1 - f) + 4 * Math.sin(i * 1.9);
    band.push([q[0] + down[0] * dd, q[1] + down[1] * dd]);
  }
  soft(g, (c2) => { c2.beginPath(); smoothPath(c2, band, true); }, { base: 0.995, rim: 0.9, lx: 0, ly: -4, blur: 5, shrink: 1 });
  line(g, lead, 1.2, G(0.4, 0.55), 4, 0.2);
}

// leg from the hip (x,y) to the foot (fx,fy): a short feathered thigh, a thin pale tarsus, three long toes with dark
// claws (toes spread by `splay`, curled when `curl` > 0)
function leg(g, x, y, fx, fy, s, splay = 0.55, curl = 0, clawV = 0.1) {
  const dx = fx - x, dy = fy - y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  taper(g, [[x, y], [x + dx * 0.35, y + dy * 0.35], [x + dx * 0.55, y + dy * 0.55]], (u) => 30 - 14 * u, G(0.95));
  taper(g, [[x + dx * 0.45, y + dy * 0.45], [fx, fy]], (u) => 12 - 3 * u, G(0.9));
  line(g, [[x + dx * 0.5 + 4, y + dy * 0.5], [fx + 3, fy]], 1.0, G(0.5, 0.6), 3, 0.2);
  const a = Math.atan2(uy, ux);
  for (const k of [-splay, 0, splay]) {
    const tl = 30 * s * (k === 0 ? 1.1 : 0.9);
    const ak = a + k, ac = ak + curl * Math.sign(k || 1);
    const mx = fx + Math.cos(ak) * tl * 0.55, my = fy + Math.sin(ak) * tl * 0.55;
    const ex = mx + Math.cos(ac) * tl * 0.45, ey = my + Math.sin(ac) * tl * 0.45;
    taper(g, [[fx, fy], [mx, my], [ex, ey]], (u) => (10 - 4 * u) * Math.min(1, s * 1.1), G(0.92));
    line(g, [[fx + (mx - fx) * 0.4, fy + (my - fy) * 0.4], [ex, ey]], 1.0, G(0.4, 0.7), 3, 0.2);
    g.fillStyle = G(clawV); g.beginPath(); g.ellipse(ex + Math.cos(ac) * 3 * s, ey + Math.sin(ac) * 3 * s, 2.4 * s, 4 * s, ac - Math.PI / 2, 0, TAU); g.fill();
  }
}

// pose: { flap: -1..1 (wings up +), bank: -1..1, run: phase 0..1 (feet), fly: 0..1 (feet dangle), roll (rad),
//         spread (fan opening), headX, lift, shadow }
// Units = frame px at s = 1 (the scale of 41.00, where the track's blob height is 241). Measured there: head 120 wide
// (crown 142 above the track centre), headphone cups outside it to +-95, the band 152 up; the body a rounder egg 150
// wide reaching 158 below; wings as above; short legs, big three-toed feet (planted ~(+20, 124), kicked back ~(-57, 176));
// a small tail tuft low on the right, inside the body outline.
export function drawOwlBack(g, x, y, s, pose = {}) {
  const { flap = 0, bank = 0, run = 0, fly = 0, roll = 0, headX = 0, spread = 1, lift = 0, shadow = 1, headRoll: hr = 0, headYaw: hy = 0, wingK = 1 } = pose;
  // ---- the floor shadow: a small dark contact shadow under the feet (stays on the floor under a hopping owl)
  // (fix 1b: the source's shadow is a separate soft dark ellipse on the floor ~120 x 25 px, 15-40 px below the feet
  // (measured at 42.16, 42.44, 42.88), not a contact smudge hidden under the toes)
  if (shadow > 0) {
    g.save();
    g.translate(x - 12 * s, y + (196 + lift) * s); g.scale(s, s);
    g.filter = `blur(${Math.max(1, 6 * s).toFixed(1)}px)`;
    // (fix 2: the source's shadow is a solid soft dark pool, the render's read faint)
    g.fillStyle = `rgba(0,0,0,${Math.min(0.8, 0.62 * shadow)})`;
    g.beginPath(); g.ellipse(0, 0, 70, 16, 0, 0, TAU); g.fill();
    g.filter = "none";
    g.restore();
  }
  g.save();
  g.translate(x, y); g.rotate(roll); g.scale(s, s);
  g.lineCap = "round"; g.lineJoin = "round";
  // ---- legs (behind the body)
  const ph = run * TAU;
  if (fly < 0.5) {
    // running: one foot planted under the body, the other kicked back and out (alternating)
    // (pass 4, measured 41.00-41.92: a stride every 3 frames; the lifted foot rises up against the body and swings
    // out a little, the planted one stays under it; run = phase, sin > 0 lifts the right foot)
    const a = Math.sin(ph);
    const up = (v) => Math.max(0, v);
    // (fix 2: the source runs, it does not stand: the legs close together, one foot planted under the body, the other
    // lifted 20-40 px and kicked out behind (up and a little out on screen), toes curled; the feet ~25% smaller than
    // before, grey claws (they were a symmetric wide stance with big black-clawed feet))
    const lift = (k) => up(k) * 34;
    leg(g, -20, 112, -18 - 16 * up(-a), 160 - lift(-a), 0.82, 0.5, 0.45 * up(-a), 0.35);
    leg(g, 20, 112, 18 + 16 * up(a), 160 - lift(a), 0.82, 0.5, 0.45 * up(a), 0.35);
  } else {
    // flying (fix 2, 45.20-45.68): both feet hang together under the body, 10-20 px apart, toes down
    leg(g, -14, 104, -9, 138, 0.8, 0.35, 0.15, 0.35);
    leg(g, 14, 104, 9, 138, 0.8, 0.35, 0.15, 0.35);
  }
  // ---- body + head: a round head on a rounder egg of a body, a slight pinch at the join
  const headPts = [], bodyPts = [];
  for (let i = 0; i < 56; i++) {
    const t = (i / 56) * TAU, c = Math.cos(t), sn = Math.sin(t);
    // (fix pass 2, measured row widths at 41.00/42.00/43.00: a domed head as wide as the body, no neck pinch)
    const n = 2.0;
    const hx = Math.sign(c) * Math.pow(Math.abs(c), 2 / n) * 68, hy = -70 + Math.sign(sn) * Math.pow(Math.abs(sn), 2 / n) * 57;
    // (fix 2: pose.headRoll turns the head about the neck (rad, + clockwise on screen))
    headPts.push([headX + hx * Math.cos(hr) - (hy + 24) * Math.sin(hr), -24 + hx * Math.sin(hr) + (hy + 24) * Math.cos(hr)]);
    const rx = sn < 0 ? 70 : 76 - 20 * sn * sn, ry = sn < 0 ? 100 : 80;
    bodyPts.push([headX * 0.25 + c * rx, 58 + sn * ry]);
  }
  const neckPts = [];
  for (let i = 0; i < 40; i++) { const t = (i / 40) * TAU; neckPts.push([headX * 0.6 + Math.cos(t) * 66, -24 + Math.sin(t) * 34]); }
  const both = (c) => { c.beginPath(); smoothPath(c, bodyPts, true); smoothPath(c, headPts, true); smoothPath(c, neckPts, true); };
  g.save(); g.lineWidth = 3.0; g.strokeStyle = G(0.3, 0.75); both(g); g.stroke(); g.restore();   // outer keyline (the fill hides the inner half)
  soft(g, both, { base: 0.99, rim: 0.8, lx: -10, ly: -14, blur: 18, shrink: 0.9 });   // (pass 4: greyer rim, as the source's soft shading)
  // the join: a faint crease where the head sits on the body
  line(g, [[headX - 36, -20], [headX - 12, -12], [headX + 16, -12], [headX + 38, -20]], 0.9, G(0.7, 0.25), 5, 0.1);
  // feather texture: short grey flicks over the back, denser toward the shadowed lower right
  const rr = rng(97);
  g.save(); both(g); g.clip();
  for (let i = 0; i < 160; i++) {
    const x0 = -75 + rr() * 150, y0 = -130 + rr() * 280, k = Math.max(0, (Math.abs(x0) * 0.8 + y0 * 0.5) / 150);
    if (rr() > 0.25 + 0.6 * k) continue;
    // (pass 4: small curved feather marks, the source's pencil texture on the back)
    const sx = Math.sign(x0) || 1, L = 7 + rr() * 8;
    line(g, [[x0, y0], [x0 + sx * L * 0.35, y0 + L * 0.5], [x0 + sx * L * 0.2, y0 + L]], 0.8 + rr() * 0.6, G(0.55, 0.22 + 0.3 * k), 3, 0.1);
  }
  g.restore();
  // ---- tail: a small tuft low on the right, inside the body outline
  const tail = [[16, 76], [46, 70], [62, 84], [58, 100], [40, 106], [20, 96]];
  soft(g, (c) => { c.beginPath(); smoothPath(c, tail, true); }, { base: 0.97, rim: 0.82, lx: -3, ly: -3, blur: 4 });
  for (const [a2, b2] of [[[28, 84], [64, 88]], [[28, 94], [62, 102]], [[26, 102], [48, 110]]]) line(g, [a2, b2], 1.2, G(0.32, 0.7), 3, 0.15);
  // ---- wings: two fans from just under the head, out and up (level and at mid-body when flying)
  const upA = flap * 0.3;
  const fy = fly > 0.5 ? 1 : 0;
  // (fix pass 2: longer and lower, tips ~(-187, -36) / (+198, -16) at 41.00, trailing feathers down to ~+50)
  const WL = fy ? [[-52, 26], [-108, 6], [-150, -6]] : [[-54, 16], [-106, -20], [-146, -36]];
  const WR = fy ? [[52, 26], [108, 6], [150, -6]] : [[54, 15], [108, -16], [150, -30]];
  // (pass 4: pose.rotL / rotR, when given, are the measured wing turns about the shoulder, rad, clockwise on screen)
  // (fix 2: wingK scales each wing about its shoulder: the running wings were 40-145 px too wide in total)
  const wk = (P) => [P[0], [P[0][0] + (P[1][0] - P[0][0]) * wingK, P[0][1] + (P[1][1] - P[0][1]) * wingK], [P[0][0] + (P[2][0] - P[0][0]) * wingK, P[0][1] + (P[2][1] - P[0][1]) * wingK]];
  const WL2 = wk(WL), WR2 = wk(WR);
  wing(g, WL2[0], WL2[1], WL2[2], -1, pose.rotL ?? (-upA + bank * 0.12), spread, 71, 1.05 * (0.4 + 0.6 * wingK));
  wing(g, WR2[0], WR2[1], WR2[2], 1, pose.rotR ?? (upA + bank * 0.12), spread, 72, 1.05 * (0.4 + 0.6 * wingK), pose.foldR ?? 1);
  // ---- head details: tuft at the upper left, cups, band (rolled with the head about the neck)
  g.save(); g.translate(headX, -24); g.rotate(hr); g.translate(0, 24);
  g.fillStyle = G(0.97);
  blob(g, [[-44, -116], [-60, -132], [-46, -126], [-44, -146], [-30, -128], [-22, -122]]); g.fill();
  line(g, [[-44, -120], [-54, -132]], 1.0, G(0.55, 0.7), 3, 0.1);
  line(g, [[-34, -124], [-38, -140]], 1.0, G(0.55, 0.7), 3, 0.1);
  const cup = (cx, cy, rx, ry, side) => {
    const gr = g.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
    // (fix 1b: the source's cups are dark shells (~0.15-0.3) with a lit rim, not mid-grey)
    gr.addColorStop(0, G(0.36)); gr.addColorStop(0.5, G(0.22)); gr.addColorStop(1, G(0.13));
    g.fillStyle = gr; g.beginPath(); g.ellipse(cx, cy, rx, ry, side * 0.06, 0, TAU); g.fill();
    g.fillStyle = G(0.17); g.beginPath(); g.ellipse(cx + side * 4, cy + 2, rx * 0.56, ry * 0.8, side * 0.06, 0, TAU); g.fill();
    g.strokeStyle = G(0.45, 0.8); g.lineWidth = 1.6; g.beginPath(); g.ellipse(cx + side * 4, cy + 2, rx * 0.56, ry * 0.8, side * 0.06, -1.4, 1.2); g.stroke();
    // lit rim round the shell's outer edge, strongest up top
    g.strokeStyle = G(0.78, 0.9); g.lineWidth = 3.2; g.beginPath(); g.ellipse(cx, cy, Math.max(0.5, rx - 2.5), ry - 2.5, side * 0.06, side > 0 ? -2.2 : Math.PI - 1.0 - 0.1, side > 0 ? 0.35 : Math.PI + 2.1); g.stroke();
    g.strokeStyle = G(0.55, 0.6); g.lineWidth = 1.4; g.beginPath(); g.ellipse(cx, cy, Math.max(0.5, rx - 5), ry - 5, side * 0.06, 3.6, 5.4); g.stroke();
    g.strokeStyle = G(0.05); g.lineWidth = 2.4; g.beginPath(); g.ellipse(cx, cy, rx, ry, side * 0.06, 0, TAU); g.stroke();
  };
  if (pose.side) {
    // pass 4, 45.16: the head turned to profile (facing right) as the owl turns away: one cup square on the side of
    // the head, the band up over the crown, the eye and the small hooked beak at the right edge (measured on 1129)
    cup(-35, -77, 27, 42, -1);
    const band = [[-40, -118], [-30, -146], [0, -156], [30, -150], [48, -130]];
    line(g, band, 9, G(0.2), 8, 0.85);
    g.fillStyle = G(0.97); g.beginPath(); g.ellipse(32, -58, 11, 15, 0.1, 0, TAU); g.fill();
    g.strokeStyle = G(0.25); g.lineWidth = 2.2; g.beginPath(); g.ellipse(32, -58, 11, 15, 0.1, 0, TAU); g.stroke();
    g.fillStyle = G(0.08); g.beginPath(); g.ellipse(35, -57, 5, 8, 0.1, 0, TAU); g.fill();
    g.fillStyle = G(0.85); g.beginPath(); g.moveTo(46, -38); g.quadraticCurveTo(62, -34, 58, -18); g.quadraticCurveTo(52, -24, 46, -24); g.closePath(); g.fill();
    line(g, [[46, -38], [60, -32], [58, -18]], 1.6, G(0.3, 0.9), 4, 0.3);
  } else {
    // (fix 2: pose.headYaw (-1..1, + = the head turned to the viewer's right, as at 44.20-44.24): the left cup swings
    // in toward the middle and shows more of its face, the right one goes edge-on at the head's right edge)
    const yl = Math.max(0, hy), yr = Math.max(0, -hy);
    const lx = -80 + 22 * yl - 6 * yr, lrx = Math.max(0, 19 + 8 * yl - 18 * yr);
    const rx2 = 81 - 22 * yr + 6 * yl, rrx = Math.max(0, 19 + 8 * yr - 18 * yl);
    if (lrx > 6) cup(lx, -60, lrx, 36, -1);
    if (rrx > 6) cup(rx2, -62, rrx, 36, 1);
    const L0 = [lx + 4, -92], R0 = [rx2 - 4, -94], ax = 2 + 14 * (yl - yr);
    const band = [L0, [L0[0] + 10, -122], [(L0[0] + ax) / 2 - 4, -146], [ax, -152], [(R0[0] + ax) / 2 + 4, -145], [R0[0] - 9, -122], R0];
    line(g, band, 8, G(0.13), 8, 0.85);
    line(g, band.map(([a2, b2]) => [a2, b2 - 2]), 2.2, G(0.55, 0.85), 8, 0.4);
  }
  g.restore();
  g.restore();
}
