globalThis.Path2D = class { constructor(){ this.n=0; this.bad=0; this.minx=1e9; this.maxx=-1e9; this.miny=1e9; this.maxy=-1e9;} moveTo(x,y){this.p(x,y)} lineTo(x,y){this.p(x,y)} closePath(){} p(x,y){ this.n++; if(!isFinite(x)||!isFinite(y)) this.bad++; this.minx=Math.min(this.minx,x); this.maxx=Math.max(this.maxx,x); this.miny=Math.min(this.miny,y); this.maxy=Math.max(this.maxy,y);} };
const { celOf } = await import('/Users/computer/rootline/apprentice-film/src/shots/s23/celdraw.js');
for (const k of process.argv.slice(2).map(Number)) {
  const c = celOf(k);
  console.log(k, c && c.bbox, c && c.levels.map(L => `${L.color} n${L.path.n} bad${L.path.bad} x${L.path.minx.toFixed(0)}-${L.path.maxx.toFixed(0)} y${L.path.miny.toFixed(0)}-${L.path.maxy.toFixed(0)}`).join(' | '));
}
