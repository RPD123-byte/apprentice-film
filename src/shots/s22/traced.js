// s22: redraws a traced owl drawing (s22/owlData.js) as a soft sprite. A drawing is its silhouette (even-odd rings),
// a quadratic base-value field for the plumage and nested tone regions (even-odd rings, one grey each), all in drawing
// px, pre-grade. Built once per drawing at `res` × and softened with a premultiplied gaussian (the source's line is
// soft), then only transformed per frame.
const grey = (v) => { const c = Math.round(255 * Math.max(0, Math.min(1, v))); return `rgb(${c},${c},${c})`; };

// "x0,y0,dx1,dy1,..." (base-36 signed ints, 0.1 px, delta-encoded) -> flat Float32Array
function decode(str) {
  const parts = str.split(","), out = new Float32Array(parts.length);
  let x = 0, y = 0;
  for (let i = 0; i < parts.length; i += 2) {
    x += parseInt(parts[i], 36); y += parseInt(parts[i + 1], 36);
    out[i] = x / 10; out[i + 1] = y / 10;
  }
  return out;
}
const DEC = new WeakMap();
function decoded(T) {
  let d = DEC.get(T);
  if (!d) { d = { sil: T.sil.map(decode), lv: T.lv.map((L) => ({ v: L[0], r: L.slice(1).map(decode) })) }; DEC.set(T, d); }
  return d;
}
function ringsPath(g, rings) {
  g.beginPath();
  for (const r of rings) {
    g.moveTo(r[0], r[1]);
    for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1]);
    g.closePath();
  }
}

// premultiplied separable gaussian on RGBA bytes (edges fade to transparent, no dark fringe)
function blurPremult(d, w, h, sigma) {
  if (!(sigma > 0.05)) return;
  const r = Math.max(1, Math.ceil(sigma * 3)), k = new Float32Array(2 * r + 1);
  let s = 0; for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-0.5 * (i * i) / (sigma * sigma)); s += k[i + r]; }
  for (let i = 0; i < k.length; i++) k[i] /= s;
  const n = w * h, A = new Float32Array(n), C = new Float32Array(n), tA = new Float32Array(n), tC = new Float32Array(n);
  for (let i = 0; i < n; i++) { const a = d[i * 4 + 3] / 255; A[i] = a; C[i] = (d[i * 4] / 255) * a; }
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let a = 0, c = 0; const lo = Math.max(-r, -x), hi = Math.min(r, w - 1 - x);
      for (let i = lo; i <= hi; i++) { const kk = k[i + r], j = row + x + i; a += A[j] * kk; c += C[j] * kk; }
      tA[row + x] = a; tC[row + x] = c;
    }
  }
  for (let y = 0; y < h; y++) {
    const lo = Math.max(-r, -y), hi = Math.min(r, h - 1 - y);
    for (let x = 0; x < w; x++) {
      let a = 0, c = 0;
      for (let i = lo; i <= hi; i++) { const kk = k[i + r], j = (y + i) * w + x; a += tA[j] * kk; c += tC[j] * kk; }
      const o = (y * w + x) * 4, v = a > 1e-4 ? Math.min(1, c / a) : 0;
      d[o] = d[o + 1] = d[o + 2] = Math.round(v * 255); d[o + 3] = Math.round(Math.min(1, a) * 255);
    }
  }
}

// separable gaussian of an opaque grey RGBA layer's red channel -> Float32Array of 0..1
function blurGrey(d, w, h, sigma) {
  const n = w * h, A = new Float32Array(n);
  for (let i = 0; i < n; i++) A[i] = d[i * 4] / 255;
  if (!(sigma > 0.05)) return A;
  const r = Math.max(1, Math.ceil(sigma * 3)), k = new Float32Array(2 * r + 1);
  let s = 0; for (let i = -r; i <= r; i++) { k[i + r] = Math.exp(-0.5 * (i * i) / (sigma * sigma)); s += k[i + r]; }
  for (let i = 0; i < k.length; i++) k[i] /= s;
  const T = new Float32Array(n), O = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let c = 0;
      for (let i = -r; i <= r; i++) { const xx = Math.min(w - 1, Math.max(0, x + i)); c += A[row + xx] * k[i + r]; }
      T[row + x] = c;
    }
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let c = 0;
    for (let i = -r; i <= r; i++) { const yy = Math.min(h - 1, Math.max(0, y + i)); c += T[yy * w + x] * k[i + r]; }
    O[y * w + x] = c;
  }
  return O;
}

// T = { w, h, o, base[6], sil[rings], lv[{v, r[rings]}] } -> { canvas, res, pad, w, h, o }
// opts: res (supersample), blur (drawing px), gain (multiplies every value: the drawing's whites vs the grade),
// lift (adds to every value)
// lines: [[u, v, w, k, ...], ...] fine dark lines (s22/trace/trace_lines.py) in anchor-local px (drawing x = u − o[0]):
// each point a width (px) and a multiply factor; drawn as one darken-merged layer multiplied into the drawing
// extra (fix pass 1): { paint, face, add } (g, base) drawn in anchor-local px before the softening: `paint` inside
// the silhouette; `face` and `add` over everything (a redrawn face — the trace left the dark eye as a hole in the
// silhouette — and a blade tip or toes the trace cut off where they crossed the bright cut line); base(u, v) = the
// drawing's plumage value there (pre-grade)
// padExtra (fix pass 2): more room round the drawing for `extra.add` parts outside its box
// lineSoft (fix pass 2): when set, the line layer is softened on its own by that σ (drawing px) and multiplied in
// AFTER the drawing's softening instead of before it (the source's strokes are crisper than its tone regions)
export function tracedSprite(T, { res = 2, blur = 0.7, gain = 1, lift = 0, keyline = 0, lines = null, lineGain = 1, extra = null, lineSoft = null, lines2 = null, padExtra = 0 } = {}) {
  const pad = Math.ceil(blur * 3 + 2) + padExtra, W = Math.ceil((T.w + 2 * pad) * res), H = Math.ceil((T.h + 2 * pad) * res);
  const D = decoded(T);
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true });
  // base field
  const id = g.createImageData(W, H), d = id.data, b = T.base;
  for (let py = 0; py < H; py++) {
    const y = (py + 0.5) / res - pad - 0.5, yn = y / T.h;
    for (let px = 0; px < W; px++) {
      const x = (px + 0.5) / res - pad - 0.5, xn = x / T.w;
      const v = Math.max(0, Math.min(1, (b[0] + b[1] * xn + b[2] * yn + b[3] * xn * xn + b[4] * xn * yn + b[5] * yn * yn) * gain + lift));
      const o = (py * W + px) * 4; d[o] = d[o + 1] = d[o + 2] = Math.round(v * 255); d[o + 3] = 255;
    }
  }
  g.putImageData(id, 0, 0);
  // drawing coordinates are pixel indices (pixel i's centre at i): drawing x -> sprite canvas (x + pad + 0.5)·res
  g.setTransform(res, 0, 0, res, (pad + 0.5) * res, (pad + 0.5) * res);
  // cut to the silhouette
  g.globalCompositeOperation = "destination-in";
  ringsPath(g, D.sil); g.fillStyle = "#fff"; g.fill("evenodd");
  // the drawing's soft dark keyline just outside the silhouette (it only shows against a lit background: measured
  // at 77.9–78.9 over the page, a dip of ~0.2 at +1 px falling to 0 by +5 px)
  if (keyline > 0) {
    g.globalCompositeOperation = "destination-over";
    ringsPath(g, D.sil); g.lineJoin = "round";
    g.lineWidth = 4.5; g.strokeStyle = `rgba(0,0,0,${keyline})`; g.stroke();
    g.lineWidth = 9; g.strokeStyle = `rgba(0,0,0,${0.45 * keyline})`; g.stroke();
  }
  // tone regions, darkest last
  g.globalCompositeOperation = "source-atop";
  for (const L of D.lv) { ringsPath(g, L.r); g.fillStyle = grey(L.v * gain + lift); g.fill("evenodd"); }
  g.globalCompositeOperation = "source-over";
  // line layers: `lines` (darken-merged in one layer) and `lines2` (fix pass 2: residual lines measured on top of the
  // first layer, so multiplied as a second layer: their factors are relative to the drawing WITH the first layer)
  const lineLayers = [];
  for (const [set, gainL] of [[lines, lineGain], [lines2, 1]]) {
    if (!set || !set.length) continue;
    const L = document.createElement("canvas"); L.width = W; L.height = H;
    // (fix pass 2) a CPU canvas like the sprite's: as a GPU canvas (the film renderer: ANGLE Metal, GPU raster) it was
    // silently dropped when drawn into the sprite — the film had shown none of these lines
    const lg = L.getContext("2d", { willReadFrequently: true });
    lg.fillStyle = "#fff"; lg.fillRect(0, 0, W, H);
    lg.setTransform(res, 0, 0, res, (pad + 0.5 - T.o[0]) * res, (pad + 0.5 - T.o[1]) * res);
    lg.globalCompositeOperation = "darken"; lg.lineCap = "round";
    for (const P of set) {
      const n = P.length / 4;
      for (let i = 0; i + 1 < n; i++) {
        const a = i * 4, b = a + 4;
        // taper at the line's two ends
        const ta = i === 0 ? 0.55 : 1, tb = i + 1 === n - 1 ? 0.55 : 1;
        const w = 0.5 * (P[a + 2] * ta + P[b + 2] * tb), k = 1 - gainL * (1 - 0.5 * (P[a + 3] + P[b + 3]));
        lg.lineWidth = w; lg.strokeStyle = grey(k);
        lg.beginPath(); lg.moveTo(P[a], P[a + 1]); lg.lineTo(P[b], P[b + 1]); lg.stroke();
      }
    }
    if (lineSoft == null) {
      ringsPath(g, D.sil); g.save(); g.clip("evenodd");
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "multiply"; g.drawImage(L, 0, 0);
      g.restore(); g.globalCompositeOperation = "source-over";
    } else {
      // outside the silhouette the layer is white (the lines stay inside the drawing)
      lg.setTransform(res, 0, 0, res, (pad + 0.5) * res, (pad + 0.5) * res);
      lg.globalCompositeOperation = "destination-in"; ringsPath(lg, D.sil); lg.fillStyle = "#fff"; lg.fill("evenodd");
      lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = "destination-over"; lg.fillRect(0, 0, W, H);
      lineLayers.push(lg.getImageData(0, 0, W, H).data);
    }
  }
  if (extra) {
    const base = (u, v) => {
      const xn = (u - T.o[0]) / T.w, yn = (v - T.o[1]) / T.h;
      return Math.max(0, Math.min(1, (b[0] + b[1] * xn + b[2] * yn + b[3] * xn * xn + b[4] * xn * yn + b[5] * yn * yn) * gain + lift));
    };
    g.setTransform(res, 0, 0, res, (pad + 0.5 - T.o[0]) * res, (pad + 0.5 - T.o[1]) * res);
    if (extra.paint) { g.save(); g.globalCompositeOperation = "source-atop"; extra.paint(g, base); g.restore(); }
    for (const k of ["face", "add"]) if (extra[k]) { g.save(); g.globalCompositeOperation = "source-over"; extra[k](g, base); g.restore(); }
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  const img = g.getImageData(0, 0, W, H);
  blurPremult(img.data, W, H, blur * res);
  for (const layer of lineLayers) {
    const k = blurGrey(layer, W, H, lineSoft * res), d2 = img.data;
    for (let i = 0, n = W * H; i < n; i++) { const m = k[i]; if (m < 0.999) { const o = i * 4; d2[o] = d2[o + 1] = d2[o + 2] = Math.round(d2[o] * m); } }
  }
  g.putImageData(img, 0, 0);
  return { canvas: c, res, pad, w: T.w, h: T.h, o: T.o };
}

// draw a sprite with its drawing (0,0) at anchor + o, under the affine m = [a, b, c, d] about the anchor
// (anchor in frame pixel-index coordinates, like the measured tracks: pixel i's centre at i)
export function drawSprite(g, S, ax, ay, m = [1, 0, 0, 1], alpha = 1) {
  g.save();
  g.transform(m[0], m[1], m[2], m[3], ax + 0.5, ay + 0.5);
  if (alpha !== 1) g.globalAlpha *= alpha;
  g.drawImage(S.canvas, S.o[0] - S.pad - 0.5, S.o[1] - S.pad - 0.5, S.canvas.width / S.res, S.canvas.height / S.res);
  g.restore();
}
