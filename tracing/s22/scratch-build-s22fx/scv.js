const C = await imp("./src/shots/s22/cut.js");
const S = await imp("./src/shots/s22/sc21.js");
const sc = C.cutScissors(arg.F);
const Z = 5, oc = document.createElement("canvas"); oc.width = 110 * Z; oc.height = 75 * Z; const g = oc.getContext("2d");
g.fillStyle = "#000"; g.fillRect(0, 0, oc.width, oc.height);
g.setTransform(Z, 0, 0, Z, -20 * Z, -25 * Z);
S.drawScissors(g, sc);
return { json: sc, images: { scv: oc.toDataURL() } };
