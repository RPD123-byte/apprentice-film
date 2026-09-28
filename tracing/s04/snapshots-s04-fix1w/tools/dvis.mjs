// node dvis.mjs NNNN out.json : dump a key's dgrid fields (dv angle 0..90 -> 0..pi, dw weight, ds soft) as JSON
import fs from "fs";
const n = process.argv[2]; const m = await import(`../../../src/shots/s04/tk/k${n}.js`); const K = m["K" + n];
const ALPHA = []; for (let c = 35; c < 127; c++) if (c !== 92) ALPHA.push(String.fromCharCode(c));
const IDX = new Int16Array(128).fill(-1); ALPHA.forEach((ch, i) => { IDX[ch.charCodeAt(0)] = i; });
const dec = (s) => Array.from(s, (ch) => IDX[ch.charCodeAt(0)]);
fs.writeFileSync(process.argv[3], JSON.stringify({ g: K.dgrid, dv: dec(K.dv), dw: dec(K.dw), ds: dec(K.ds) }));
