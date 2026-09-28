import * as R from "/Users/computer/rootline/apprentice-film/src/shots/s26/rig.js";
import * as M from "/Users/computer/rootline/apprentice-film/src/shots/s26/posesC.js";
const grad = { addColorStop(o, c) { if (!(o >= 0 && o <= 1)) throw new Error("bad stop " + o); } };
const g = new Proxy({}, { get(t, k) {
  if (k === "ellipse") return (x, y, rx, ry) => { if (!(rx >= 0 && ry >= 0)) throw new Error(`ellipse radius ${rx} ${ry}`); };
  if (k === "arc") return (x, y, r) => { if (!(r >= 0)) throw new Error(`arc radius ${r}`); };
  if (k === "roundRect") return (x, y, w, h, r) => { if (!(r >= 0)) throw new Error(`roundRect r ${r}`); };
  if (k === "createRadialGradient") return (a, b, r0, c, d, r1) => { if (!(r0 >= 0 && r1 >= 0)) throw new Error(`radial r ${r0} ${r1}`); return grad; };
  if (k === "createLinearGradient") return () => grad;
  if (k in t) return t[k];
  return () => {};
}, set(t, k, v) { t[k] = v; return true; } });
const base = { look: "ink", head: { x: 0, y: 0, r: 90, rot: 0, yaw: -0.3, tuft: 0.4 }, eyes: { L: "angry", R: "angry", lookL: [1.3, 0.1], lookR: [0.1, 0.05] }, body: { x: 0, y: 0, rx: 100, ry: 100, rot: 0 }, wings: [{ S: [0, 0], Wr: [0, 0], T: [0, 0], trail: 2, sec: 120 }, { S: [0, 0], Wr: [0, 0], T: [0, 0], trail: 1, sec: 120 }], tail: null, feet: null };
for (const F of Object.keys(M.POSES_C)) { try { R.drawRig(g, R.unpack(M.POSES_C_KEYS, M.POSES_C[F], base)); } catch (e) { console.log(F, e.message, e.stack.split("\n")[1]); } }
console.log("done");
