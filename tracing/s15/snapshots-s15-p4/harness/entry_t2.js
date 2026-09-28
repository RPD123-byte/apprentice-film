import { CorridorGL } from "../../../src/shots/s15/gl.js";
import { W, H } from "../../../src/config.js";
window.S15 = {
  bench() {
    const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
    const out = {};
    let T = performance.now();
    const gl = new CorridorGL(W, H); out.init = performance.now() - T;
    const q = gl.gl;
    // empty render (clear + accumulate + out) x1
    T = performance.now(); gl.render([{ key: "none", keys: [], vp: new Float32Array(16), cam: [0, 0, 0], owl: [0, 0, 0], light: [1, 1, 1, 1], light2: [1, 1, 1, 1] }], 1);
    const px = new Uint8Array(4); q.readPixels(0, 0, 1, 1, q.RGBA, q.UNSIGNED_BYTE, px); out.emptyRender = performance.now() - T;
    T = performance.now(); g.drawImage(gl.c, 0, 0); g.getImageData(0, 0, 1, 1); out.drawImage = performance.now() - T;
    T = performance.now(); g.fillStyle = "#123"; g.fillRect(0, 0, W, H); g.getImageData(0, 0, 1, 1); out.fill2d = performance.now() - T;
    T = performance.now(); c.toDataURL("image/png"); out.png = performance.now() - T;
    return out;
  },
};
window.S15ready = true;
