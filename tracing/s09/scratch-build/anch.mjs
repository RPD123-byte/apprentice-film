import { headGeom, headphoneGeom } from "/Users/computer/rootline/apprentice-film/src/lib/owlInk.js";
const [x,y,s]=[705,465,1.16];
const head={ x: -100, y: -120, rx: 108, ry: 102, yaw: -0.3, pitch: 0.05, roll: -0.04, square: 2.2, jowl: 0.08 };
const H=headGeom(head);
const f=(p)=>[ (x+s*p[0]).toFixed(0), (y+s*p[1]).toFixed(0)];
for (const sd of [-1,1]) { const q=H.P(sd*0.42,-0.3); console.log('eye',sd,f([q.x,q.y]),q.nz.toFixed(2)); }
const b=H.P(0,-0.62,1.3); console.log('beak',f([b.x,b.y]));
console.log('head c',f([H.x,H.y]),'top',f(H.at(0).p),'left',f(H.at(-Math.PI/2).p));
