// s02 value-study correction: a smooth value offset D(x, y) = sum of round Gaussians [x, y, sigma, a] (world px, a in
// 1/255), fitted offline by trace/tone_fit.py against the source's held frames (grade inverted), turned into a gain on
// the drawing's own blurred value: G = (B + D) / B. Darkening multiplies, brightening colour-dodges, so ink lines stay
// ink and the drawing is only re-toned, never redrawn. Baked once into a static layer.
import { mk } from "./pen.js";

// canvas: the layer; ox, oy: world coords of its (0,0); sc: canvas px per world px; blobs: [[x, y, s, a], ...]
// win: optional [x0, y0, x1, y1, feather] (world px): the correction fades out outside this rect (fix pass 1: the stare
// room's corrections were fitted inside the stare frame only; they must not spill onto the pan world around it)
// exclude: optional [{ path, feather, mode }] (fix pass 2): inside path (world coords, feathered by `feather` px) the
// correction is dropped ("all") or only allowed to lighten ("neg": negative offsets dropped). Used to keep the fitted
// blobs off the beanie knit (they read as blotches) and to stop them airbrushing grey onto the face.
export function applyTone(canvas, ox, oy, blobs, { q = 4, gmin = 0.35, gmax = 2.6, sc = 1, win = null, exclude = null } = {}) {
  if (!blobs || !blobs.length) return canvas;
  const W = canvas.width, H = canvas.height, w = Math.ceil(W / q), h = Math.ceil(H / q);
  // B: the layer's blurred value at 1/q (over black, so transparent = 0)
  const s0 = mk(w, h), g0 = s0.getContext("2d");
  g0.fillStyle = "#000"; g0.fillRect(0, 0, w, h); g0.drawImage(canvas, 0, 0, w, h);
  const sm = mk(w, h), sg = sm.getContext("2d");
  sg.fillStyle = "#000"; sg.fillRect(0, 0, w, h); sg.filter = `blur(${(6 / q).toFixed(2)}px)`; sg.drawImage(s0, 0, 0); sg.filter = "none";
  const B = sg.getImageData(0, 0, w, h).data;
  const D = new Float32Array(w * h);
  for (const [bx, by, s, a] of blobs) {
    const cx = (bx - ox) * sc / q, cy = (by - oy) * sc / q, sq = s * sc / q, R = Math.ceil(3 * sq), k = -0.5 / (sq * sq);
    const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(w - 1, Math.ceil(cx + R)), y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(h - 1, Math.ceil(cy + R));
    for (let y = y0; y <= y1; y++) { const dy = y + 0.5 - cy; for (let x = x0; x <= x1; x++) { const dx = x + 0.5 - cx; D[y * w + x] += a * Math.exp((dx * dx + dy * dy) * k); } }
  }
  if (win) {
    const [wx0, wy0, wx1, wy1, fe] = win;
    for (let y = 0; y < h; y++) {
      const wy = oy + (y + 0.5) * q / sc, ky = Math.max(0, Math.min(1, 1 - Math.max(wy0 - wy, wy - wy1, 0) / fe));
      for (let x = 0; x < w; x++) {
        const wx = ox + (x + 0.5) * q / sc, kx = Math.max(0, Math.min(1, 1 - Math.max(wx0 - wx, wx - wx1, 0) / fe));
        D[y * w + x] *= kx * ky;
      }
    }
  }
  if (exclude) for (const { path, feather = 12, mode = "all" } of exclude) {
    const mc = mk(w, h), mg0 = mc.getContext("2d");
    mg0.fillStyle = "#000"; mg0.fillRect(0, 0, w, h);
    mg0.filter = `blur(${(feather * sc / q).toFixed(2)}px)`;
    mg0.setTransform(sc / q, 0, 0, sc / q, -ox * sc / q, -oy * sc / q);
    mg0.fillStyle = "#fff"; mg0.beginPath(); path(mg0); mg0.fill();
    const M = mg0.getImageData(0, 0, w, h).data;
    for (let i = 0; i < w * h; i++) { const m = M[i * 4] / 255; if (m <= 0) continue; if (mode === "all" || D[i] < 0) D[i] *= 1 - m; }
  }
  const mul = mk(w, h), dod = mk(w, h), mg = mul.getContext("2d"), dg = dod.getContext("2d");
  const MI = mg.createImageData(w, h), DI = dg.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const b = Math.max(10, B[i * 4]), G = Math.min(gmax, Math.max(gmin, (b + D[i]) / b));
    const m = Math.round(Math.min(1, G) * 255), d = G > 1 ? Math.round((1 - 1 / G) * 255) : 0;
    MI.data[i * 4] = MI.data[i * 4 + 1] = MI.data[i * 4 + 2] = m; MI.data[i * 4 + 3] = 255;
    DI.data[i * 4] = DI.data[i * 4 + 1] = DI.data[i * 4 + 2] = d; DI.data[i * 4 + 3] = 255;
  }
  mg.putImageData(MI, 0, 0); dg.putImageData(DI, 0, 0);
  const keep = mk(W, H), kg = keep.getContext("2d"); kg.drawImage(canvas, 0, 0);
  const g = canvas.getContext("2d");
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  g.globalCompositeOperation = "multiply"; g.drawImage(mul, 0, 0, w * q, h * q);
  g.globalCompositeOperation = "color-dodge"; g.drawImage(dod, 0, 0, w * q, h * q);
  g.globalCompositeOperation = "destination-in"; g.drawImage(keep, 0, 0);
  g.restore();
  return canvas;
}
