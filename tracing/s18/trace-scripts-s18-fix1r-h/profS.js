import { shot as S } from "../../src/shots/s18.js";
let out = null;
export const shot = { draw(ctx) {
  if (out) { console.log(out); return; }
  const fr = globalThis.__FR || [1356, 1362, 1370, 1377, 1350, 1366];
  for (const f of fr) S.draw(ctx, 0, f / 25 + 0.012);
  const PR = (globalThis.__S18PROF = {});
  const a = performance.now();
  for (let r = 0; r < 2; r++) for (const f of fr) { S.draw(ctx, 0, f / 25 + 0.012); }
  ctx.getImageData(0, 0, 1, 1);
  const tot = (performance.now() - a) / (2 * fr.length);
  for (const k in PR) PR[k] = Math.round(PR[k] / (2 * fr.length));
  delete PR._t; out = JSON.stringify({ tot: Math.round(tot), ...PR }); console.log(out);
} };
