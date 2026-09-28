import { DRAWINGS, FRAME } from "../../../src/shots/s16/data/steam.js";
import fs from "fs";
const src = fs.readFileSync("../../../src/shots/s16/steam.js", "utf8");
const body = src.slice(src.indexOf("function extend"), src.indexOf("const CACHE"));
const extend = new Function(body + "; return extend;")();
const S = DRAWINGS[FRAME[1175]];
for (const s of extend(S, 18)) { let ymax = -1, at = null; for (let k = 0; k < s.length; k += 4) if (s[k + 1] > ymax) { ymax = s[k + 1]; at = [s[k], s[k + 2], s[k + 3]]; } console.log('ymax', ymax.toFixed(1), 'at x,w,v', at.map(v => v.toFixed(2)).join(' '), 'pts', s.length / 4); }
console.log('--- raw');
for (const s of S) { const n = s.length / 4; console.log('first', s[0].toFixed(0), s[1].toFixed(0), 'last', s[4*(n-1)].toFixed(0), s[4*(n-1)+1].toFixed(0), 'ymax', Math.max(...Array.from({length:n},(_,k)=>s[4*k+1])).toFixed(1)); }
