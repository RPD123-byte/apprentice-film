// node applyfit.mjs fit.json [more.json...]  -> merges fitted feet into src/shots/s18/data/feetA2.js (rounded)
import fs from "fs";
const P = "../../src/shots/s18/data/feetA2.js";
const txt = fs.readFileSync(P, "utf8"); const head = txt.slice(0, txt.indexOf("export const FEET_A2"));
eval(txt.replace("export const FEET_A2 =", "globalThis.FEET_A2 =")); const D = globalThis.FEET_A2;
for (const f of process.argv.slice(2)) Object.assign(D, JSON.parse(fs.readFileSync(f)));
const r = (v) => typeof v === "number" ? Math.round(v * 100) / 100 : Array.isArray(v) ? v.map(r) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, r(x)])) : v;
let out = head + "export const FEET_A2 = {\n"; for (const k of Object.keys(D).sort()) out += `  ${k}: ${JSON.stringify(r(D[k]))},\n`; out += "};\n";
fs.writeFileSync(P, out); console.log("wrote", Object.keys(D).length);
