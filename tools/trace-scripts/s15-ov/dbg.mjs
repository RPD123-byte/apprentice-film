import { SETS, resolveT } from "../../src/shots/s15/sets.js";
import { viewOf } from "../../src/shots/s15/author.js";
const key = process.argv[2], t = +process.argv[3];
const set = SETS.find((s) => s.key === key);
const F = set.faces(); const dyn = F.dyn(t);
const v = viewOf(set.cam(t));
console.log('static', F.length, 'dyn faces', dyn.length, 'eye', set.cam(t).eye.map(x=>x.toFixed(3)));
dyn.forEach((f, i) => { const P = f.q.map((p) => v.project(p).map((x) => Math.round(x * 100) / 100)); if (Math.abs(f.n[2]) > 0.7) console.log(i, 'front', JSON.stringify(P), 'alb', f.alb); });
