// mock canvas 2D context: every method is a no-op, gradients return stub objects
const grad = { addColorStop() {} };
const mkCtx = (cv) => new Proxy({ canvas: cv }, {
  get(t, k) {
    if (k in t) return t[k];
    if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => grad;
    if (k === 'getImageData') return (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h });
    if (k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h });
    if (k === 'measureText') return () => ({ width: 10 });
    return () => {};
  },
  set(t, k, v) { t[k] = v; return true; },
});
globalThis.document = { createElement: () => { const cv = { width: 300, height: 150 }; const c = mkCtx(cv); cv.getContext = () => c; return cv; } };
const { shot } = await import('/Users/computer/rootline/apprentice-film/src/shots/s06.js');
const cv = document.createElement('canvas'); const ctx = cv.getContext('2d');
let t0 = process.hrtime.bigint();
for (const t of [26.72, 27.5, 28.05, 28.1, 28.18, 28.22, 28.37, 28.42, 28.49, 28.6, 29.0]) shot.draw(ctx, t - 26.72, t);
console.log('ok, ms', Number(process.hrtime.bigint() - t0) / 1e6);
