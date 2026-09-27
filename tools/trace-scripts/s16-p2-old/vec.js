// s16 vector painter. A drawing is { L: tone levels, D: dark ink strokes, B: pale ink strokes } in frame px:
//   L = [[value, ring, ring, ...], ...]   painted in order; each ring is a flat [x, y, x, y, ...] outline (even-odd holes)
//   D / B = [[x, y, w, a,  x, y, w, a, ...], ...]  centre-lines: width w px and strength a at each point
//           (dark: the fraction of the tone underneath that the ink takes away; pale: the fraction of the way to white)
// All of it is geometry measured on the source by ./trace/ (value study + ink centre-lines); nothing here is an image.
// Values are pre-grade greys (the film's grade in src/lib/post.js is applied afterwards by main.js).

// neutral grey with the source's faint green cast (G a little above R and B)
export const tone = (v) => {
  const x = Math.max(0, Math.min(1, v)) * 255;
  const r = Math.round(x), gg = Math.round(Math.min(255, x + 1.2 * Math.sin(Math.PI * Math.min(1, x / 255))));
  return `rgb(${r},${gg},${r})`;
};

function ringsPath(g, item, from = 1) {
  g.beginPath();
  for (let k = from; k < item.length; k++) {
    const r = item[k];
    g.moveTo(r[0], r[1]);
    for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1]);
    g.closePath();
  }
}

// tone levels into g (no blur here; see paintDrawing)
export function drawLevels(g, L) {
  for (const item of L) {
    ringsPath(g, item);
    g.fillStyle = tone(item[0]);
    g.fill("evenodd");
  }
}

// one centre-line stroke as a closed ribbon: offsets along the normals of (p[i+1] - p[i-1]), no caps
function ribbon(g, s) {
  const n = s.length / 4;
  if (n < 2) return false;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1) * 4, b = Math.min(n - 1, i + 1) * 4;
    let dx = s[b] - s[a], dy = s[b + 1] - s[a + 1];
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const hw = s[i * 4 + 2] / 2, x = s[i * 4], y = s[i * 4 + 1];
    L.push(x - dy * hw, y + dx * hw); R.push(x + dy * hw, y - dx * hw);
  }
  g.beginPath();
  g.moveTo(L[0], L[1]);
  for (let i = 2; i < L.length; i += 2) g.lineTo(L[i], L[i + 1]);
  for (let i = R.length - 2; i >= 0; i -= 2) g.lineTo(R[i], R[i + 1]);
  g.closePath();
  return true;
}
export function drawStrokes(g, S, pale = false) {
  g.save();
  g.fillStyle = pale ? "rgb(255,255,255)" : "rgb(0,0,0)";
  for (const s of S) {
    let a = 0; const n = s.length / 4;
    for (let i = 3; i < s.length; i += 4) a += s[i];
    a /= n;
    if (a < 0.01 || !ribbon(g, s)) continue;
    g.globalAlpha = Math.min(1, a);
    g.fill();
  }
  g.restore();
}

// Paint a drawing: its levels are laid down on a scratch canvas and blurred a little (the value study is soft), then
// the ink strokes go on top. `box` = [x0, y0, x1, y1] frame px bounds of the drawing (for the scratch canvas).
let SCR = null;
export function paintDrawing(g, dw, { blur = 0.6, box = null } = {}) {
  const [x0, y0, x1, y1] = box || dw.box;
  const w = Math.ceil(x1 - x0) + 8, h = Math.ceil(y1 - y0) + 8;
  if (!SCR) SCR = document.createElement("canvas");
  if (SCR.width < w || SCR.height < h) { SCR.width = Math.max(SCR.width, w); SCR.height = Math.max(SCR.height, h); }
  const s = SCR.getContext("2d");
  s.setTransform(1, 0, 0, 1, 0, 0);
  s.clearRect(0, 0, SCR.width, SCR.height);
  s.translate(4 - x0, 4 - y0);
  drawLevels(s, dw.L);
  g.save();
  if (blur > 0) g.filter = `blur(${blur}px)`;
  g.drawImage(SCR, 0, 0, w, h, x0 - 4, y0 - 4, w, h);
  g.restore();
  if (dw.D) drawStrokes(g, dw.D, false);
  if (dw.B) drawStrokes(g, dw.B, true);
}
