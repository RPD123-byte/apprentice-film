import { hquad, hinv, happly } from "/Users/computer/rootline/apprentice-film/src/shots/s27/gl.js";
const BW = 32.4, BD = 22.5;
const H = hquad([[-BW/2, BD],[BW/2, BD],[BW/2,0],[-BW/2,0]], [[1043.1,663],[1084.1,767.1],[1705.2,752.5],[1432.8,674]]);
const Hi = hinv(H);
for (const x of [1492,1547,1557,1567,1597,1607,1617,1645]) {
  // point on the edge from (1084.1,767.1) to (1705.2,752.5)
  const u = (x-1084.1)/(1705.2-1084.1), y = 767.1 + (752.5-767.1)*u;
  const p = happly(Hi, x, y); console.log(x, p.map(v=>v.toFixed(2)).join(','));
}
