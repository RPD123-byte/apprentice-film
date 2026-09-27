// The big dressmaker's shears (s20): broad chrome handles with thick finger loops, a slotted pivot screw, two broad
// blades in a slight V. Local units: pivot at (0,0), blades run down +y (tips (−18,292) and (20,312)); the big finger
// loop centre (−70,−232), the thumb loop centre (46,−187). Measured on the clean frame 66.40 (pivot (745,568), axis
// tilted −0.328 rad) and the grimy one 63.60 (same geometry).
// grime 1 = the dusty, cobwebbed state before the owl cleans them (duller steel, mottled spots); grime 0 = bright chrome.
import { taper } from "../../lib/ink.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { rng, clamp } from "../../lib/rng.js";

const TAU = Math.PI * 2;
const DARK = "#0a0a0a";
export const SCISSORS_LEAN = { x: 745, y: 568, rot: -0.328, s: 1 };
export const SC = { ring1: [-70, -232], ring2: [46, -187], tip: [0, 300], pivot: [0, 0], grip: [-8, -120] };
const grey = (v, a = 1) => { const c = Math.round(clamp(v) * 255); return a >= 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`; };

// metal fill: chrome (light with dark reflection bands) blended toward dull steel by grime
function metal(g, x0, y0, x1, y1, grime, bands = [[0, 0.95], [0.28, 0.82], [0.4, 0.35], [0.5, 0.9], [0.78, 0.97], [1, 0.62]]) {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [o, v] of bands) gr.addColorStop(o, grey(v * (1 - grime) + (0.42 + 0.22 * v) * grime));
  return gr;
}
function ringShape(cx, cy, rx, ry, rot, hrx, hry, hdx = 0, hdy = 0) {
  return (c) => { c.ellipse(cx, cy, rx, ry, rot, 0, TAU); c.moveTo(cx + hdx + hrx, cy + hdy); c.ellipse(cx + hdx, cy + hdy, hrx, hry, rot, 0, TAU, true); };
}
function loop(g, L, grime, r) {
  const { cx, cy, rx, ry, rot, hrx, hry, hdx = 0, hdy = 0 } = L;
  const shape = ringShape(cx, cy, rx, ry, rot, hrx, hry, hdx, hdy);
  g.fillStyle = metal(g, cx - rx, cy - ry, cx + rx, cy + ry * 0.6, grime);
  g.beginPath(); shape(g); g.fill("evenodd");
  // inner bevel shadow and a bright rim on the upper-left of the band
  g.save(); g.beginPath(); shape(g); g.clip("evenodd");
  g.strokeStyle = grey(0.15, 0.55); g.lineWidth = 5; g.beginPath(); g.ellipse(cx + hdx, cy + hdy, hrx + 3, hry + 3, rot, 0.2, Math.PI * 0.9); g.stroke();
  g.strokeStyle = grey(1, 0.85 * (1 - grime) + 0.3); g.lineWidth = 3; g.beginPath(); g.ellipse(cx, cy, rx - 4, ry - 4, rot, Math.PI * 0.95, Math.PI * 1.55); g.stroke();
  g.strokeStyle = grey(0.1, 0.5); g.lineWidth = 2.5; g.beginPath(); g.ellipse(cx, cy, rx - 5, ry - 5, rot, 0.05, 0.8); g.stroke();
  g.restore();
  g.strokeStyle = DARK; g.lineWidth = 3.2; g.beginPath(); g.ellipse(cx, cy, rx, ry, rot, 0, TAU); g.stroke();
  g.lineWidth = 2.6; g.beginPath(); g.ellipse(cx + hdx, cy + hdy, hrx, hry, rot, 0, TAU); g.stroke();
}
function plate(g, pts, grime, bands, w = 3) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  g.fillStyle = metal(g, x0, y0, x1, y0 + (y1 - y0) * 0.15, grime, bands);
  g.beginPath(); smoothPath(g, pts, true, 0.3); g.fill();
  g.strokeStyle = DARK; g.lineWidth = w; g.stroke();
}

// opts: x, y (pivot), rot, s (scale), open (radians between blades), alpha, grime (0..1), blade (length stretch),
// ringY (handle squash along the axis), noRings (blades only)
export function drawScissors(ctx, o) {
  const { x, y, rot = 0, s = 1, open = 0, alpha = 1, grime = 1, blade = 1, bladeW = 1, ringY = 1, handles = true, blades = true, flip = false } = o;
  const g = ctx;
  g.save(); g.globalAlpha *= alpha; g.translate(x, y); g.rotate(rot); g.scale(flip ? -s : s, s);
  g.lineJoin = "round"; g.lineCap = "round";
  const r = rng(5);
  // ---- blades (stretched by `blade` along the axis)
  if (blades) {
  g.save(); g.scale(bladeW, blade);
  // back blade (the lower one of the pair, seen as a strip along the left)
  g.save(); g.rotate(open / 2);
  const back = [[-30, 8], [-6, 6], [-4, 60], [-8, 170], [-14, 262], [-18, 292], [-24, 258], [-30, 170], [-36, 74]];
  plate(g, back, grime, [[0, 0.7], [0.4, 0.9], [0.7, 0.5], [1, 0.8]], 2.8);
  g.restore();
  // front blade: broad, a fine hatched bevel down its inner side, a ridge line, grime spots low down
  g.save(); g.rotate(-open / 2);
  const front = [[-10, 10], [30, 12], [36, 60], [34, 150], [28, 240], [20, 312], [10, 250], [0, 160], [-6, 70]];
  plate(g, front, grime, [[0, 0.62], [0.2, 0.96], [0.45, 0.88], [0.7, 0.98], [1, 0.55]], 3.2);
  g.save(); g.beginPath(); smoothPath(g, front, true, 0.3); g.clip();
  g.strokeStyle = grey(0.25, 0.55); g.lineWidth = 0.9;
  for (let k = 0; k < 26; k++) { const yy = 22 + k * 4.2; g.beginPath(); g.moveTo(-6, yy); g.lineTo(6, yy - 7); g.stroke(); }
  taper(g, sampleCurve([[8, 20], [11, 120], [12, 230], [16, 300]], 6), (u) => 2.2 * (1 - u * 0.6), grey(0.2, 0.7));
  taper(g, sampleCurve([[22, 30], [24, 130], [20, 250]], 6), (u) => 3.2 * (1 - u), grey(1, 0.9 - 0.5 * grime));
  if (grime > 0.01) {
    for (let i = 0; i < 46; i++) {
      const t = 0.18 + r() * 0.75, yy = t * 300, cx = 4 + 18 * (1 - t) + (r() - 0.5) * 26 * (1 - t * 0.6);
      g.fillStyle = `rgba(40,36,32,${(0.3 + r() * 0.45) * grime})`;
      g.beginPath(); g.ellipse(cx, yy, 1.5 + r() * 3.5, 1 + r() * 2.5, r() * 3, 0, TAU); g.fill();
    }
    g.fillStyle = `rgba(60,58,54,${0.35 * grime})`; g.fillRect(-12, 0, 52, 320);
  }
  g.restore();
  g.restore();
  g.restore();
  }
  if (handles) {
    // ---- shanks and loops (squashed by `ringY` along the axis)
    g.save(); g.scale(1, ringY);
    // thumb side (drawn first, behind): shank from the pivot up to the thumb loop
    g.save(); g.rotate(-open / 2);
    plate(g, [[4, -8], [26, -30], [40, -84], [44, -112], [20, -112], [12, -60], [-12, -18]], grime, [[0, 0.9], [0.35, 0.6], [0.6, 0.95], [1, 0.7]], 2.8);
    loop(g, { cx: 46, cy: -187, rx: 37, ry: 80, rot: -0.04, hrx: 24, hry: 60, hdx: 3, hdy: -4 }, grime, r);
    g.restore();
    // finger side: broad shank from the pivot up-left to the big loop, finger tang on its top
    g.save(); g.rotate(open / 2);
    plate(g, [[16, -6], [8, -40], [-24, -104], [-40, -138], [-66, -140], [-54, -104], [-26, -48], [-14, 4]], grime, [[0, 0.95], [0.3, 0.75], [0.55, 0.4], [0.75, 0.9], [1, 0.8]], 3);
    loop(g, { cx: -70, cy: -232, rx: 46, ry: 96, rot: -0.05, hrx: 31, hry: 72, hdx: 2, hdy: 2 }, grime, r);
    g.fillStyle = metal(g, -90, -350, -50, -320, grime); g.beginPath(); smoothPath(g, [[-52, -318], [-66, -348], [-74, -352], [-78, -326]], true, 0.3); g.fill();
    g.strokeStyle = DARK; g.lineWidth = 2.4; g.stroke();
    g.restore();
    g.restore();
  }
  // ---- pivot screw with its slot
  g.fillStyle = grey(0.82 - 0.3 * grime); g.beginPath(); g.ellipse(0, 0, 11, 9, 0.3, 0, TAU); g.fill();
  g.strokeStyle = DARK; g.lineWidth = 2.4; g.stroke();
  g.beginPath(); g.moveTo(-7, 4); g.lineTo(7, -4); g.stroke();
  g.fillStyle = DARK; g.beginPath(); g.arc(-12, -26, 2.6, 0, TAU); g.fill();
  g.restore();
}

// Cobwebs strung over the resting scissors (between the loops, inside the thumb loop, from the blades out to the
// right and down to the floor). Frame px (setup A). Drawn over the scissors; alpha fades them out as they're cleaned.
let WEB = null;
export function drawCobwebs(ctx, alpha = 1) {
  if (alpha <= 0.01) return;
  if (!WEB) {
    WEB = document.createElement("canvas"); WEB.width = 520; WEB.height = 700;
    const o = WEB.getContext("2d"), r = rng(51);
    o.translate(-520, -250);                               // canvas covers frame x 520..1040, y 250..950
    o.lineCap = "round";
    const strand = (pts, a = 0.6, w = 1.1) => { o.globalAlpha = a; taper(o, sampleCurve(pts, 6), (u) => w * (0.4 + 0.6 * Math.sin(Math.PI * u)), "#e8e6e0"); };
    // between the two loops and across the thumb-loop hole
    for (let i = 0; i < 12; i++) strand([[640 + r() * 30, 300 + r() * 110], [680 + r() * 20, 330 + r() * 90], [712 + r() * 20, 310 + r() * 110]], 0.35 + r() * 0.4, 0.9 + r() * 0.6);
    for (let i = 0; i < 9; i++) { const a = r() * TAU; strand([[730, 368], [730 + Math.cos(a) * 18, 368 + Math.sin(a) * 40], [730 + Math.cos(a) * 24, 368 + Math.sin(a) * 58]], 0.5 + r() * 0.3, 1.0); }
    for (let k = 1; k < 4; k++) { const pts = []; for (let i = 0; i <= 12; i++) { const a = (i / 12) * TAU; pts.push([730 + Math.cos(a) * 7 * k, 368 + Math.sin(a) * 16 * k]); } strand(pts, 0.4, 0.8); }
    // from the loops down over the shanks
    for (let i = 0; i < 7; i++) strand([[600 + r() * 60, 430 + r() * 40], [650 + r() * 60, 480 + r() * 60], [700 + r() * 40, 540 + r() * 60]], 0.3 + r() * 0.3, 0.9);
    // the big web from the blades out to the right and down to the floor
    const hubs = [[800, 720], [840, 800]];
    for (const [hx, hy] of hubs) {
      for (let i = 0; i < 12; i++) { const a = -2.6 + i * 0.4; const L = 70 + r() * 90; strand([[hx, hy], [hx + Math.cos(a) * L * 0.5, hy + Math.sin(a) * L * 0.5 + 8], [hx + Math.cos(a) * L, hy + Math.sin(a) * L + 22]], 0.4 + r() * 0.35, 1.0 + r() * 0.5); }
      for (let k = 1; k < 5; k++) { const pts = []; for (let i = 0; i <= 11; i++) { const a = -2.6 + i * 0.4; pts.push([hx + Math.cos(a) * 18 * k, hy + Math.sin(a) * 16 * k + 4 * k]); } strand(pts, 0.32, 0.8); }
    }
    for (let i = 0; i < 10; i++) { const x0 = 770 + r() * 60, y0 = 580 + r() * 200; strand([[x0, y0], [x0 + 30 + r() * 40, y0 + 40 + r() * 60], [x0 + 60 + r() * 60, y0 + 100 + r() * 90]], 0.35 + r() * 0.35, 1.0); }
    for (let i = 0; i < 6; i++) { const x0 = 760 + r() * 80; strand([[x0, 700 + r() * 100], [x0 + (r() - 0.5) * 30, 820 + r() * 40], [x0 + (r() - 0.5) * 50, 900 + r() * 40]], 0.35, 0.9); }
    o.globalAlpha = 1;
  }
  ctx.save(); ctx.globalAlpha *= alpha; ctx.drawImage(WEB, 520, 250); ctx.restore();
}
export function releaseScissors() { WEB = null; }
