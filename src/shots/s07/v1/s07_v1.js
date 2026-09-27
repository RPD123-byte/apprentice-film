// s07 (29.04–30.56): over the shoulder again. The laptop shows the Pure Imagination page with the selection and
// the note card; text is typed into the ticket button while his hands type; the owl sits on his right shoulder
// wearing the headphones, seen from behind. The camera is locked off (camtrack 29.04–30.52: s = 1.0000, 0.0 px).
//
// Layers: one engraved static plate (room, desk, laptop body, the designer: s07/room.js + s07/figure.js), the
// colour screen warped onto the measured screen quad (s07/screen.js), the typing hands (s07/hands.js, a pose per
// source frame) and the owl from behind (s07/owl.js, finished pixels, on top).
import { W, H } from "../../../config.js";
import { Plate, engraveCanvases } from "../../../lib/engrave.js";
import { paintRoom, paintChairRail } from "./room.js";
import { paintFigure } from "./figure.js";
import { screenAt, releaseScreen } from "../screen.js";
import { handsLayer, releaseHands } from "./hands.js";
import { owlBack, releaseOwl } from "./owl.js";

let plate = null;
function staticPlate() {
  if (plate) return plate;
  const P = new Plate(W, H, 1);
  paintRoom(P);
  paintFigure(P);
  paintChairRail(P);
  // cut the lines, then blend the flat value study back over the soft regions (cloth, wood, card: the source's
  // texture there is fine and low in contrast), then the contours and details on top
  const E = engraveCanvases(P.valC, P.dirC, { spacing: 4.2, seed: 7, contrast: 1.0 });
  const eg = E.getContext("2d");
  if (P.soft) {
    const mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c; };
    const mask = mk(), mg = mask.getContext("2d");
    for (const [path, k] of P.soft) {
      mg.save(); mg.globalCompositeOperation = "destination-out"; mg.beginPath(); path(mg); mg.fill(); mg.restore();
      if (k > 0) { mg.fillStyle = `rgba(0,0,0,${k})`; mg.beginPath(); path(mg); mg.fill(); }
    }
    const flat = mk(), fg = flat.getContext("2d");
    fg.drawImage(P.valC, 0, 0);
    fg.globalCompositeOperation = "multiply"; fg.fillStyle = "rgb(242,240,234)"; fg.fillRect(0, 0, W, H);
    fg.globalCompositeOperation = "destination-in"; fg.drawImage(mask, 0, 0);
    eg.drawImage(flat, 0, 0);
  }
  eg.drawImage(P.overC, 0, 0);
  plate = E;
  return plate;
}

export const shot = {
  draw(ctx, local, t) {
    ctx.drawImage(staticPlate(), 0, 0);
    const sc = screenAt(t);
    ctx.drawImage(sc.canvas, sc.x, sc.y);
    const f = Math.floor(local * 25 + 1e-6);
    const h = handsLayer(f);
    ctx.drawImage(h.canvas, h.x, h.y);
    const o = owlBack();
    ctx.drawImage(o.canvas, o.x, o.y);
  },
  release() { plate = null; releaseScreen(); releaseHands(); releaseOwl(); },
};
