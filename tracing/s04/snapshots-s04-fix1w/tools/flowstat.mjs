// node flowstat.mjs NNNN : per flow offset of key K NNNN: mean / p95 / max displacement (px) and mean vector
const n = process.argv[2];
const m = await import(`../../../src/shots/s04/tk/k${n}.js`); const K = m["K" + n];
const ALPHA = []; for (let c = 35; c < 127; c++) if (c !== 92) ALPHA.push(String.fromCharCode(c));
const IDX = new Int16Array(128).fill(-1); ALPHA.forEach((ch, i) => { IDX[ch.charCodeAt(0)] = i; });
const d1 = (s, i) => IDX[s.charCodeAt(i)], d2 = (s, i) => d1(s, i) * 91 + d1(s, i + 1);
const [nx, ny] = K.fgrid, N = nx * ny;
for (const off of Object.keys(K.flows).map(Number).sort((a, b) => a - b)) {
  const s = K.flows[String(off)], f = new Float32Array(2 * N); let i = 0;
  for (let p = 0; p < 2; p++) { let v = 0; for (let k = 0; k < N; k++) { const c = d1(s, i); if (c < 81) { v += c - 40; i += 1; } else { v = d2(s, i + 1) - 4000; i += 3; } f[2 * k + p] = v / 4; } }
  const mags = []; let sx = 0, sy = 0; for (let k = 0; k < N; k++) { mags.push(Math.hypot(f[2 * k], f[2 * k + 1])); sx += f[2 * k]; sy += f[2 * k + 1]; }
  mags.sort((a, b) => a - b);
  console.log(off, "mean", (mags.reduce((a, b) => a + b) / N).toFixed(2), "p95", mags[Math.floor(N * 0.95)].toFixed(2), "max", mags[N - 1].toFixed(2), "vec", (sx / N).toFixed(2), (sy / N).toFixed(2));
}
