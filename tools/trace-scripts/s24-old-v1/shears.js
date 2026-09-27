// Scissors for s24 (frame px, Canvas2D): long silver dressmaker's shears as the source draws them in the flurry —
// near-white blades with a thin dark keyline and a dark bevel line, a small screw at the pivot, short shanks and two
// oval finger loops (one longer), plus the four-point glint the source puts on a blade tip.
//   drawShears(g, { x, y, ang, L, open, loop, flip, squash, lw, alpha })
//     (x, y) pivot; ang = direction the blades point (radians); L = pivot -> tip; open = angle between blades;
//     loop = loop size factor; flip mirrors which loop is the big one; squash (0..1) foreshortens across the axis
//     (the scissors seen turning edge-on); lw = keyline width.
//   spinShears(g, o, { spread, n }) — a motion-smeared copy (several faint copies fanned round the pivot).
//   glint(g, x, y, R, rot) — the four-point star.
const TAU = Math.PI * 2;
const DARK = "#101010";
const WHITE = "#eeeeea";

function bladePath(g, L, w, k) {
  // one blade along +x from the pivot: straight back, a gently curved cutting edge, fine point at (L, 0)
  g.beginPath();
  g.moveTo(-0.04 * L, -k * w * 0.9);
  g.bezierCurveTo(0.3 * L, -k * w * 1.05, 0.72 * L, -k * w * 0.62, L, k * w * 0.05);
  g.bezierCurveTo(0.7 * L, k * w * 0.32, 0.3 * L, k * w * 0.62, -0.04 * L, k * w * 0.72);
  g.closePath();
}

function half(g, L, open, k, loopK, lw, bigLoop, bw) {
  const a = k * open / 2;
  g.save(); g.rotate(a);
  const w = bw * L;
  // shank + loop (behind the blade). Measured on the flurry's spinning pair (L ≈ 192 px): loop centres ≈ 0.6 L
  // behind the pivot and 0.3 L to the side, loops ≈ 0.6 L long and 0.38 L wide (the bigger one a little larger).
  const lat = (bigLoop ? 0.3 : 0.27) * L * loopK, along = 0.6 * L * loopK;
  const loopC = [-along, -k * lat];
  const rx = (bigLoop ? 0.3 : 0.26) * L * loopK, ry = (bigLoop ? 0.19 : 0.16) * L * loopK;
  const ringW = Math.max(2.2, 0.04 * L * loopK);
  const tilt = k * 0.25;
  g.lineCap = "round"; g.lineJoin = "round";
  // shank: from the pivot bending out to the loop's front
  const front = [loopC[0] + Math.cos(tilt) * rx * 0.92, loopC[1] + Math.sin(tilt) * rx * 0.92];
  g.beginPath(); g.moveTo(0.02 * L, 0); g.quadraticCurveTo(-0.14 * L, -k * 0.02 * L, front[0], front[1]);
  g.lineWidth = 0.055 * L + lw * 2; g.strokeStyle = DARK; g.stroke();
  g.lineWidth = 0.055 * L; g.strokeStyle = WHITE; g.stroke();
  // loop ring
  g.save(); g.translate(loopC[0], loopC[1]); g.rotate(tilt);
  g.lineWidth = ringW + lw * 2.2; g.strokeStyle = DARK; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.stroke();
  g.lineWidth = ringW; g.strokeStyle = WHITE; g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU); g.stroke();
  g.lineWidth = Math.max(0.8, ringW * 0.22); g.strokeStyle = "rgba(60,60,60,0.8)"; g.beginPath(); g.ellipse(0, 0, rx - ringW * 0.25, ry - ringW * 0.25, 0, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
  g.restore();
  // blade
  bladePath(g, L, w, k);
  g.fillStyle = WHITE; g.fill();
  g.lineWidth = lw; g.strokeStyle = DARK; g.stroke();
  // bevel: a thin dark line down the blade, and a softer grey tone on the cutting side
  g.save(); bladePath(g, L, w, k); g.clip();
  g.fillStyle = "rgba(150,150,146,0.35)"; g.beginPath(); g.moveTo(0, k * w * 0.1); g.lineTo(L, k * w * 0.05); g.lineTo(0.3 * L, k * w * 0.8); g.lineTo(0, k * w * 0.8); g.fill();
  g.restore();
  g.lineWidth = Math.max(0.7, lw * 0.6); g.strokeStyle = "rgba(30,30,30,0.85)";
  g.beginPath(); g.moveTo(0.06 * L, -k * w * 0.2); g.quadraticCurveTo(0.5 * L, -k * w * 0.18, 0.9 * L, 0); g.stroke();
  g.restore();
}

export function drawShears(g, o) {
  const { x, y, ang = 0, L = 200, open = 0.35, loop = 1, flip = false, squash = 1, lw = 2, alpha = 1, bw = 0.07 } = o;
  g.save();
  g.globalAlpha *= alpha;
  g.translate(x, y); g.rotate(ang);
  if (squash !== 1) g.scale(1, squash);
  const k0 = flip ? -1 : 1;
  half(g, L, open, -k0, loop, lw, false, bw);
  half(g, L, open, k0, loop, lw, true, bw);
  // pivot screw
  const r = Math.max(2.5, 0.035 * L);
  g.fillStyle = WHITE; g.strokeStyle = DARK; g.lineWidth = Math.max(1, lw * 0.8);
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(-r * 0.6, r * 0.3); g.lineTo(r * 0.6, -r * 0.3); g.stroke();
  g.restore();
}

// Motion-smeared spin: faint copies fanned round the pivot (the source's in-between frames).
export function spinShears(g, o, { spread = 0.9, n = 6, squash = 1 } = {}) {
  for (let i = 0; i < n; i++) {
    const f = n === 1 ? 0 : i / (n - 1) - 0.5;
    drawShears(g, { ...o, ang: o.ang + f * spread, alpha: (o.alpha ?? 1) * (i === n - 1 ? 0.75 : 0.32), squash: squash * (1 - 0.3 * Math.abs(f)) });
  }
}

// The four-point glint: long thin rays, a bright core.
export function glint(g, x, y, R, rot = 0, col = "rgb(246,246,242)") {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.fillStyle = col;
  const w = R * 0.1;
  const tip = (i) => { const a = i * Math.PI / 2, Ri = i % 2 ? R * 0.7 : R; return [Math.cos(a) * Ri, Math.sin(a) * Ri]; };
  g.beginPath();
  const t0 = tip(0); g.moveTo(t0[0], t0[1]);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4, n = tip(i + 1);
    g.quadraticCurveTo(Math.cos(a) * w, Math.sin(a) * w, n[0], n[1]);
  }
  g.closePath(); g.fill();
  g.beginPath(); g.arc(0, 0, R * 0.12, 0, TAU); g.fill();
  g.restore();
}
