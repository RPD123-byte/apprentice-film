// scratch shot for the s26c harness: page layers alone (measurement renders, not part of the film)
import { drawFramedPage, sokoPageCanvas, HEADER } from "../../src/lib/sites.js";
import { hippieBannerCanvas, hippiePageCanvas, pageArrival } from "../../src/lib/hippie.js";
const mk = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
let pwb = null;
function pageWithBanner() {
  if (!pwb) { const src = sokoPageCanvas({ gaze: "down" }); pwb = mk(src.width, src.height); const g = pwb.getContext("2d"); g.drawImage(src, 0, 0); g.drawImage(hippieBannerCanvas(), HEADER.x, HEADER.y, HEADER.w, HEADER.h); }
  return pwb;
}
export const shot = {
  draw(ctx, local, t) {
    if (t >= 112.69 && t < 115) {
      const A = pageArrival(Math.max(112.7, t));
      ctx.setTransform(A.s, 0, 0, A.s, A.tx, A.ty); ctx.imageSmoothingQuality = "high"; ctx.drawImage(hippiePageCanvas(), 0, 0);
    } else if (t < 101) {                       // the B&W page on the screen, glow 1.4 (s26 bwPlain)
      drawFramedPage(ctx, pageWithBanner(), { glow: 1.4 });
    } else if (t < 102) {                       // the plain B&W page (page px)
      ctx.drawImage(pageWithBanner(), 0, 0);
    } else if (t < 103) {
      ctx.drawImage(hippiePageCanvas(), 0, 0);
    }
  },
};
