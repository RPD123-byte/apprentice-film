// dev only: paint one s04 key (raw paint, no warp) with options from ?kopt=JSON {key:"2184", opts:{...}, noInk:bool}
import { paintKey } from "../../../src/shots/s04/tkey.js";
import { TCORR } from "../../../src/shots/s04/tcorr.js";
const q = new URLSearchParams(location.search);
const KO = JSON.parse(q.get("kopt") || "{}");
export const shot = {
  async draw() {},
};
shot.draw = function (ctx, local, t) {
  const name = String(Math.round(t * 100));
  const K = window.__K[name];
  const c = paintKey(K, 180, { tcorr: KO.notc ? null : TCORR[K.t.toFixed(2)], ...(KO.opts || {}) });
  ctx.drawImage(c, -180, -180);
};
const names = (KO.keys || "2184").split(",");
window.__K = {};
for (const n of names) { const m = await import(`../../../src/shots/s04/tk/k${n}.js`); window.__K[n] = m["K" + n]; }
