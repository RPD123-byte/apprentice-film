// map frame-px points at time t back into locked px through the inverse of key L's track
import { trackMap, invert } from "../../src/shots/s28/drawn/trackmap.js";
const C = {
  130.16: [[650,245],[600,275],[550,330],[500,375],[475,400],[450,440],[400,500],[360,560],[325,610],[295,660],[275,725],[275,775],[285,805],[325,825],[400,832],[500,835],[585,840]],
  130.40: [[625,300],[550,375],[500,430],[450,490],[400,560],[350,640],[315,700],[300,750],[305,795],[330,815],[400,822],[460,830]],
};
for (const t in C) {
  const f = trackMap("L", +t);
  console.log(t, JSON.stringify(C[t].map(([x, y]) => invert(f, x, y).map(Math.round))));
}
// and where the current HOOD_LEFT lands
const HL = [[507, 506], [486, 540], [468, 580], [450, 630], [436, 690], [424, 750], [418, 820], [414, 946]];
for (const t of [130.16, 130.40]) { const f = trackMap("L", t); console.log("HL@" + t, JSON.stringify(HL.map(([x, y]) => f(x, y).map(Math.round)))); }
