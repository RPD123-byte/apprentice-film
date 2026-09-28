import { headGeom } from "/Users/computer/rootline/apprentice-film/src/lib/owlInk.js";
const [place, pose] = [JSON.parse(process.argv[2]), JSON.parse(process.argv[3])];
const H = headGeom(pose.head);
const toF = ([ux, uy]) => { const c = Math.cos(place.rot || 0), s = Math.sin(place.rot || 0); return [place.x + place.s * (c * ux - s * uy), place.y + place.s * (s * ux + c * uy)]; };
const E = pose.eyes;
for (const sd of [-1, 1]) { const q = H.P(sd * E.spread, E.el); console.log("eye", sd, toF([q.x, q.y]).map(v => v.toFixed(1)).join(","), "nz", q.nz.toFixed(2)); }
const b = H.P(0, pose.beak.el, pose.beak.lift); console.log("beak", toF([b.x, b.y]).map(v => v.toFixed(1)).join(","));
const bd = H.P(pose.bandage.az, pose.bandage.el); console.log("band", toF([bd.x, bd.y]).map(v => v.toFixed(1)).join(","));
let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of H.out) { const f = toF(p); x0 = Math.min(x0, f[0]); x1 = Math.max(x1, f[0]); y0 = Math.min(y0, f[1]); y1 = Math.max(y1, f[1]); }
console.log("head bbox", x0.toFixed(0), y0.toFixed(0), x1.toFixed(0), y1.toFixed(0));
