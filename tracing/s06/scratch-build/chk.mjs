import { FACE3, BROW3, INK_OPTS } from "/Users/computer/rootline/apprentice-film/src/shots/s06/data/r3face.js";
console.log(Object.keys(FACE3), FACE3.ink.length, FACE3.ink[0].slice(0,10), INK_OPTS);
let bad=0; for (const s of FACE3.ink) { if (s.length%5) bad++; for (let i=0;i<s.length;i+=5) if (!(s[i+4]>s[i+3])) { bad++; break; } }
console.log('bad', bad, 'ground items', FACE3.ground.length, 'solids', FACE3.solids.length, 'light', FACE3.light.length);
