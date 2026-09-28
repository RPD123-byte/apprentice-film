// s15 scratch: draw only the owl of s15 at time t (black background), no grade
import { drawOwlFront } from "../../../src/shots/s15/owlFront.js";
import { drawOwlBack } from "../../../src/shots/s15/owl.js";
import { owlTrack } from "../../../src/shots/s15/track.js";
import { SETS } from "../../../src/shots/s15/sets.js";
const c = document.getElementById("out"), g = c.getContext("2d");
window.S15 = {
  render(t) {
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#000"; g.fillRect(0, 0, c.width, c.height);
    const T = performance.now();
    let set = SETS[0]; for (const x of SETS) if (t >= x.t0 - 1e-6) set = x;
    const ot = owlTrack(t);
    if (!drawOwlFront(g, t, ot)) { const o = set.owl(t); if (o) drawOwlBack(g, o.x, o.y, o.s, o.pose); }
    window.__ms = performance.now() - T;
    return c.toDataURL("image/png");
  },
};
window.S15ready = true;
