// The big dressmaker's scissors (s20): silver, closed, finger loops up. Drawn in Canvas2D in local units:
// pivot at (0,0), the blades run down +y to the tip at (8, 313), the big finger loop at (−52, −221), the thumb loop
// at (65, −197) (all measured on the source at 64.12: pivot (742, 560), axis tilted 20.7° from vertical).
import { taper, INK } from "../../lib/ink.js";
import { smoothPath, sampleCurve } from "../../lib/paths.js";
import { rng } from "../../lib/rng.js";

const TAU = Math.PI * 2;
const DARK = "#0a0a0a";
export const SCISSORS_LEAN = { x: 742, y: 560, rot: -0.361, s: 1 };
// local anchors (for holding): the loops and the tip
export const SC = { ring1: [-52, -221], ring2: [65, -197], tip: [8, 313], pivot: [0, 0] };

function ring(g, cx, cy, ax, by, rot, hole) {
  g.save(); g.translate(cx, cy); g.rotate(rot);
  // metal loop: outer ellipse minus hole, silver gradient
  const gr = g.createLinearGradient(-ax, -by, ax, by);
  gr.addColorStop(0, "rgb(236,234,228)"); gr.addColorStop(0.45, "rgb(206,204,198)"); gr.addColorStop(0.7, "rgb(150,148,144)"); gr.addColorStop(1, "rgb(222,220,214)");
  g.fillStyle = gr;
  g.beginPath(); g.ellipse(0, 0, ax, by, 0, 0, TAU); g.ellipse(0, 0, ax * hole, by * (hole + 0.06), 0, 0, TAU, true); g.fill("evenodd");
  g.strokeStyle = DARK; g.lineWidth = 3;
  g.beginPath(); g.ellipse(0, 0, ax, by, 0, 0, TAU); g.stroke();
  g.lineWidth = 2.4; g.beginPath(); g.ellipse(0, 0, ax * hole, by * (hole + 0.06), 0, 0, TAU); g.stroke();
  // a bright rim highlight and a dark inner bevel
  g.strokeStyle = "rgba(255,255,252,0.9)"; g.lineWidth = 2;
  g.beginPath(); g.ellipse(0, 0, ax * 0.9, by * 0.94, 0, Math.PI * 0.95, Math.PI * 1.6); g.stroke();
  g.strokeStyle = "rgba(20,20,20,0.55)"; g.lineWidth = 2.2;
  g.beginPath(); g.ellipse(0, 0, ax * (hole + 0.09), by * (hole + 0.13), 0, Math.PI * 0.1, Math.PI * 0.9); g.stroke();
  g.restore();
}

// opts: x, y (pivot), rot, s (scale), open (radians between blades), alpha, grime (0..1)
export function drawScissors(ctx, o) {
  const { x, y, rot = 0, s = 1, open = 0, alpha = 1, grime = 1, blade = 1, ringY = 1 } = o;
  const g = ctx;
  g.save(); g.globalAlpha *= alpha; g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.lineJoin = "round"; g.lineCap = "round";
  const r = rng(5);
  // blades (stretched by `blade` along the axis)
  g.save(); g.scale(1, blade);
  g.save(); g.rotate(open / 2);
  const bladeB = [[-26, -14], [10, -18], [16, 40], [12, 150], [4, 250], [-2, 306], [-10, 250], [-20, 140], [-27, 40]];
  g.fillStyle = "rgb(168,166,160)"; g.beginPath(); smoothPath(g, bladeB, true); g.fill();
  g.strokeStyle = DARK; g.lineWidth = 3; g.stroke();
  g.restore();
  g.save(); g.rotate(-open / 2);
  // front blade: bright silver with a dark bevel down the cutting edge and grime spots low down
  const bladeA = [[-20, -18], [20, -20], [27, 30], [24, 120], [16, 230], [8, 313], [-4, 244], [-14, 130], [-20, 36]];
  const ga = g.createLinearGradient(-20, 0, 27, 0);
  ga.addColorStop(0, "rgb(210,208,202)"); ga.addColorStop(0.35, "rgb(246,244,238)"); ga.addColorStop(0.62, "rgb(214,212,206)"); ga.addColorStop(1, "rgb(128,126,122)");
  g.fillStyle = ga; g.beginPath(); smoothPath(g, bladeA, true); g.fill();
  g.strokeStyle = DARK; g.lineWidth = 3.2; g.stroke();
  taper(g, sampleCurve([[6, 10], [8, 120], [6, 220], [4, 300]], 6), (u) => 2.4 * (1 - u * 0.7), "rgba(40,40,40,0.8)");
  taper(g, sampleCurve([[-12, 20], [-10, 130], [-4, 240]], 6), (u) => 3 * (1 - u), "rgba(255,255,250,0.85)");
  if (grime > 0) for (let i = 0; i < 26; i++) {
    const t = 0.45 + r() * 0.45, yy = t * 300, half = 20 * (1 - t) + 4;
    g.fillStyle = `rgba(70,64,58,${(0.25 + r() * 0.4) * grime})`;
    g.beginPath(); g.ellipse(-half * 0.6 + r() * half * 1.4, yy, 1.5 + r() * 3, 1 + r() * 2, r() * 3, 0, TAU); g.fill();
  }
  g.restore();
  g.restore();
  // shanks and loops (squashed by `ringY` along the axis)
  g.save(); g.scale(1, ringY);
  // shanks from the pivot up to the loops
  const shank = (pts, w) => { const q = sampleCurve(pts, 8); taper(g, q, w + 5, DARK); taper(g, q, w, "rgb(214,212,206)"); taper(g, q.map(([a, b]) => [a - w * 0.2, b]), w * 0.3, "rgba(255,255,250,0.8)"); };
  g.save(); g.rotate(open / 2); shank([[8, -12], [30, -60], [52, -110], [58, -138]], 16); g.restore();
  g.save(); g.rotate(-open / 2); shank([[-6, -14], [-20, -60], [-36, -112], [-42, -146]], 18); g.restore();
  // loops
  g.save(); g.rotate(open / 2); ring(g, 65, -197, 30, 64, 0.05, 0.62); g.restore();
  g.save(); g.rotate(-open / 2); ring(g, -52, -221, 44, 82, -0.02, 0.66);
  // the finger rest tang on the big loop
  g.fillStyle = "rgb(200,198,192)"; g.beginPath(); smoothPath(g, [[-86, -178], [-110, -150], [-118, -140], [-96, -160]], true); g.fill(); g.strokeStyle = DARK; g.lineWidth = 2; g.stroke();
  g.restore();
  g.restore();
  // pivot screw
  g.fillStyle = "rgb(190,188,182)"; g.beginPath(); g.arc(0, 0, 11, 0, TAU); g.fill();
  g.strokeStyle = DARK; g.lineWidth = 2.4; g.stroke();
  g.beginPath(); g.moveTo(-7, 3); g.lineTo(7, -3); g.stroke();
  g.fillStyle = DARK; g.beginPath(); g.arc(-10, -22, 3, 0, TAU); g.fill();
  g.restore();
}
