// dev: paint the s07 plate with options from the URL (wk, corr, fine, shapes)
import { paintTraced } from "/src/shots/s07/tracekit.js";
import * as PLATE from "/src/shots/s07/data/plate.js";
const q = new URLSearchParams(location.search);
const o = { wk: Number(q.get("wk") || 1), corr: q.get("corr") !== "0", fine: q.get("fine") !== "0", shapes: q.get("shapes") !== "0" };
let p = null;
export const shot = { draw(ctx) { if (!p) p = paintTraced(PLATE, 2206, 946, o); ctx.drawImage(p, 0, 0); } };
