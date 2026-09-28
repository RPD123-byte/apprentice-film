// render a CUT_FIT F as the sprite on black, in the crop frame (330x172 at cup (115,60)), Z x
const C = await imp("./src/shots/s22/cut.js");
const F = arg.F, Z = arg.Z || 3, X0 = -115, Y0 = -60, MW = 330, MH = 172;
const B = C.cutSprite(F, { res: Z });
const oc = document.createElement("canvas"); oc.width = MW * Z; oc.height = MH * Z; const og = oc.getContext("2d");
og.fillStyle = arg.bg || "#000"; og.fillRect(0, 0, oc.width, oc.height);
og.setTransform(Z, 0, 0, Z, 0, 0); og.drawImage(B.canvas, B.x - X0 - 0.5, B.y - Y0 - 0.5, B.w, B.h);
return { images: { [arg.out || "view"]: oc.toDataURL() } };
