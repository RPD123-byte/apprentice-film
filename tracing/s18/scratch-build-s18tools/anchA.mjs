import { headGeom, headphoneGeom } from "/Users/computer/rootline/apprentice-film/src/lib/owlInk.js";
const [x,y,s]=[705,465,1.16];
const head={ x: -100, y: -120, rx: 108, ry: 102, yaw: -0.3, pitch: 0.05, roll: -0.04, square: 2.2, jowl: 0.08 };
const H=headGeom(head);
const f=(p)=>[ Math.round(x+s*p[0]), Math.round(y+s*p[1])];
for (const hp of JSON.parse(process.argv[2]||'[]')) {
  const g=headphoneGeom(H,hp);
  console.log(JSON.stringify(hp), 'cups', g.cups.map(c=>[f([c.x,c.y]),c.z.toFixed(2)]), 'bandTop', f(g.band[20].p));
}
const b=H.P(0,-0.58,1.3); console.log('beak',f([b.x,b.y]));
for (const [az,el] of [[0.15,0.72],[0.35,0.75],[0.3,0.65]]) { const q=H.P(az,el); console.log('band',az,el,f([q.x,q.y]),q.nz.toFixed(2)); }
