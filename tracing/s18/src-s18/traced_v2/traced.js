// Renderer for the outline traces written by trace/trace_plate.py: layers of ink shapes (outline + holes, even-odd)
// stacked in order, each filled with its measured grey or linear ramp. Deterministic; drawn once into a cached canvas.
const AL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const LUT = new Int8Array(128).fill(-1);
for (let i = 0; i < 64; i++) LUT[AL.charCodeAt(i)] = i;

// ring string -> flat [x0,y0,x1,y1,...] in px
export function decodeRing(s) {
  const out = []; let i = 0, x = 0, y = 0, k = 0;
  while (i < s.length) {
    let z = 0, sh = 0, c;
    do { c = LUT[s.charCodeAt(i++)]; z += (c & 31) * 2 ** sh; sh += 5; } while (c >= 32);
    const n = z % 2 ? -(z + 1) / 2 : z / 2;
    if (k++ % 2 === 0) { x += n; out.push(x / 4); } else { y += n; out.push(y / 4); }
  }
  return out;
}
const gry = (v) => { const c = Math.max(0, Math.min(255, Math.round(v))); return `rgb(${c},${c},${c})`; };

function fillFor(g, v) {
  if (typeof v === "number") return gry(v);
  const [x0, y0, v0, x1, y1, v1] = v;
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  // the plane may leave 0..255 inside the shape: add stops where it crosses the limits
  const st = [[0, v0]];
  for (const lim of [0, 255]) { const u = (lim - v0) / (v1 - v0); if (u > 0 && u < 1) st.push([u, lim]); }
  st.push([1, v1]); st.sort((a, b) => a[0] - b[0]);
  for (const [u, val] of st) gr.addColorStop(u, gry(val));
  return gr;
}

// draw decoded layers into g (context already transformed as wanted). opts.gain scales values (e.g. dimming).
export function drawTrace(g, layers, { gain = 1, from = 0, to = Infinity } = {}) {
  for (let li = from; li < Math.min(to, layers.length); li++) {
    for (const [v, rings] of layers[li]) {
      const vv = gain === 1 ? v : typeof v === "number" ? v * gain : [v[0], v[1], v[2] * gain, v[3], v[4], v[5] * gain];
      g.fillStyle = fillFor(g, vv);
      g.beginPath();
      for (const r of rings) {
        g.moveTo(r[0], r[1]);
        for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1]);
        g.closePath();
      }
      g.fill("evenodd");
    }
  }
}

// decode a raw trace (from the generated module) once
export function decodeTrace(raw) { return raw.map((lay) => lay.map(([v, rs]) => [v, rs.map(decodeRing)])); }
