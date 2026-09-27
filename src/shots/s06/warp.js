// s06 fix pass 1: piecewise-affine (triangle mesh) warp of a cached canvas region by a measured displacement grid.
// F = { box: [x0, y0, x1, y1], step, nx, ny, d: [dx, dy, ...] } (grid point (i, j) at x0 + i*step, y0 + j*step; d is
// the displacement from the neutral to the smile, frame px). meshWarp draws the region of `src` inside F.box with each
// grid point moved by s * d (s = the smile amount, or s - 1 to go back from a smile drawing). Every triangle is drawn
// through its own affine transform, clipped to itself grown 0.6 px so neighbours overlap (no anti-aliasing cracks).
// Cells whose source has no pixels (`live`, from cellsLive) are skipped. `off`: where the source canvas sits in the
// frame (a box-sized cache). Deterministic: pure geometry.

const GROW = 0.6;
function affine(s0, s1, s2, d0, d1, d2) {
  // the transform [a b c d e f] mapping triangle s -> triangle d
  const sx1 = s1[0] - s0[0], sy1 = s1[1] - s0[1], sx2 = s2[0] - s0[0], sy2 = s2[1] - s0[1];
  const dx1 = d1[0] - d0[0], dy1 = d1[1] - d0[1], dx2 = d2[0] - d0[0], dy2 = d2[1] - d0[1];
  const det = sx1 * sy2 - sx2 * sy1;
  const a = (dx1 * sy2 - dx2 * sy1) / det, c = (dx2 * sx1 - dx1 * sx2) / det;
  const b = (dy1 * sy2 - dy2 * sy1) / det, d = (dy2 * sx1 - dy1 * sx2) / det;
  return [a, b, c, d, d0[0] - a * s0[0] - c * s0[1], d0[1] - b * s0[0] - d * s0[1]];
}
function tri(ctx, src, S, D, off) {
  const cx = (D[0][0] + D[1][0] + D[2][0]) / 3, cy = (D[0][1] + D[1][1] + D[2][1]) / 3;
  ctx.save();
  ctx.beginPath();
  D.forEach(([x, y], i) => {
    const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1, gx = x + (dx / l) * GROW, gy = y + (dy / l) * GROW;
    i ? ctx.lineTo(gx, gy) : ctx.moveTo(gx, gy);
  });
  ctx.closePath(); ctx.clip();
  const [a, b, c, d, e, f] = affine(S[0], S[1], S[2], D[0], D[1], D[2]);
  ctx.transform(a, b, c, d, e, f);
  let x0 = Math.min(S[0][0], S[1][0], S[2][0]), x1 = Math.max(S[0][0], S[1][0], S[2][0]);
  let y0 = Math.min(S[0][1], S[1][1], S[2][1]), y1 = Math.max(S[0][1], S[1][1], S[2][1]);
  // (source canvas px = frame px - off)
  x0 = Math.max(off[0], Math.floor(x0 - 3)); y0 = Math.max(off[1], Math.floor(y0 - 3));
  x1 = Math.min(src.width + off[0], Math.ceil(x1 + 3)); y1 = Math.min(src.height + off[1], Math.ceil(y1 + 3));
  if (x1 > x0 && y1 > y0) ctx.drawImage(src, x0 - off[0], y0 - off[1], x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
}
// which cells of the grid have any pixels in `src` (alpha > 0) within `pad` px: Uint8Array (nx-1)*(ny-1)
export function cellsLive(src, F, pad = 8, off = [0, 0]) {
  const x0 = F.box[0] - off[0], y0 = F.box[1] - off[1], st = F.step, cw = F.nx - 1, ch = F.ny - 1;
  const w = cw * st + 2 * pad, h = ch * st + 2 * pad;
  const bx = Math.max(0, x0 - pad), by = Math.max(0, y0 - pad);
  const img = src.getContext("2d").getImageData(bx, by, w, h).data;
  const live = new Uint8Array(cw * ch);
  for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
    const cx0 = x0 + i * st - pad - bx, cy0 = y0 + j * st - pad - by;
    let any = 0;
    for (let y = Math.max(0, cy0); y < Math.min(h, cy0 + st + 2 * pad) && !any; y += 2)
      for (let x = Math.max(0, cx0); x < Math.min(w, cx0 + st + 2 * pad); x += 2) if (img[(y * w + x) * 4 + 3]) { any = 1; break; }
    live[j * cw + i] = any;
  }
  return live;
}
export function meshWarp(ctx, src, F, s, live = null, off = [0, 0]) {
  const [x0, y0] = F.box, st = F.step, nx = F.nx, ny = F.ny, d = F.d;
  const P = (i, j) => [x0 + i * st, y0 + j * st];
  const Q = (i, j) => { const o = (j * nx + i) * 2; return [x0 + i * st + s * d[o], y0 + j * st + s * d[o + 1]]; };
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    if (live && !live[j * (nx - 1) + i]) continue;
    const p00 = P(i, j), p10 = P(i + 1, j), p01 = P(i, j + 1), p11 = P(i + 1, j + 1);
    const q00 = Q(i, j), q10 = Q(i + 1, j), q01 = Q(i, j + 1), q11 = Q(i + 1, j + 1);
    tri(ctx, src, [p00, p10, p11], [q00, q10, q11], off);
    tri(ctx, src, [p00, p11, p01], [q00, q11, q01], off);
  }
}

// A per-pixel remap of a small cached region (the brows' ends under the hair): out(p) = src(p - s * D(p)), D bilinear
// from a fine grid F (step 4), sampled bilinearly in premultiplied RGBA. zoneOf caches the region's pixels once.
const mkc = (w, h) => (typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h }));
export function zoneOf(src, F) {
  const [x0, y0] = F.box, w = (F.nx - 1) * F.step + 1, h = (F.ny - 1) * F.step + 1;
  const px = src.getContext("2d").getImageData(x0, y0, w, h).data, pm = new Float32Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { const a = px[i * 4 + 3] / 255; pm[i * 4] = px[i * 4] * a; pm[i * 4 + 1] = px[i * 4 + 1] * a; pm[i * 4 + 2] = px[i * 4 + 2] * a; pm[i * 4 + 3] = a; }
  const canvas = mkc(w, h);
  return { x0, y0, w, h, pm, canvas, g: canvas.getContext("2d"), img: new ImageData(w, h) };
}
export function drawZone(ctx, Z, F, s, cap = Infinity) {
  const { w, h, pm, img } = Z, out = img.data, st = F.step, nx = F.nx, d = F.d;
  for (let y = 0; y < h; y++) {
    const gv = Math.min(F.ny - 1.0001, y / st), j = Math.floor(gv), b = gv - j;
    for (let x = 0; x < w; x++) {
      const gu = Math.min(nx - 1.0001, x / st), i = Math.floor(gu), a = gu - i;
      const o00 = (j * nx + i) * 2, o10 = o00 + 2, o01 = o00 + nx * 2, o11 = o01 + 2;
      let dx = (d[o00] * (1 - a) + d[o10] * a) * (1 - b) + (d[o01] * (1 - a) + d[o11] * a) * b;
      let dy = (d[o00 + 1] * (1 - a) + d[o10 + 1] * a) * (1 - b) + (d[o01 + 1] * (1 - a) + d[o11 + 1] * a) * b;
      // (fix pass 2) the displacement is capped at `cap` px (the hair strand itself stays put)
      const dl = Math.hypot(dx, dy); if (dl > cap) { dx *= cap / dl; dy *= cap / dl; }
      const sx = Math.max(0, Math.min(w - 1.0001, x - s * dx)), sy = Math.max(0, Math.min(h - 1.0001, y - s * dy));
      const xi = Math.floor(sx), yi = Math.floor(sy), fx = sx - xi, fy = sy - yi;
      const p00 = (yi * w + xi) * 4, p10 = p00 + 4, p01 = p00 + w * 4, p11 = p01 + 4;
      const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
      const al = pm[p00 + 3] * w00 + pm[p10 + 3] * w10 + pm[p01 + 3] * w01 + pm[p11 + 3] * w11, q = (y * w + x) * 4;
      if (al < 1e-4) { out[q] = out[q + 1] = out[q + 2] = out[q + 3] = 0; continue; }
      for (let c = 0; c < 3; c++) out[q + c] = (pm[p00 + c] * w00 + pm[p10 + c] * w10 + pm[p01 + c] * w01 + pm[p11 + c] * w11) / al;
      out[q + 3] = al * 255;
    }
  }
  Z.g.putImageData(img, 0, 0);
  ctx.drawImage(Z.canvas, Z.x0, Z.y0);
}
