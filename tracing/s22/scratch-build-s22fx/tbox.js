const D = await imp("./src/shots/s22/owlData.js");
const dec = (str) => { const p = str.split(","), o = []; let x = 0, y = 0; for (let i = 0; i < p.length; i += 2) { x += parseInt(p[i], 36); y += parseInt(p[i + 1], 36); o.push([x / 10, y / 10]); } return o; };
const out = {};
for (const [k, T] of Object.entries(D.TRACED)) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, area = 0;
  for (const r of T.sil) { const P = dec(r); let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); } area += a / 2; }
  out[k] = { o: T.o, w: T.w, h: T.h, box: [x0 + T.o[0], y0 + T.o[1], x1 + T.o[0], y1 + T.o[1]].map((v) => Math.round(v)), area: Math.round(Math.abs(area)), n: T.sil.length, meta: T.meta ? Object.keys(T.meta) : null };
}
return { json: out };
