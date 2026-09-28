import { buildAtlas } from "../../../src/shots/s15/atlas.js";
window.S15 = { render() { const a = buildAtlas(); const c = document.createElement("canvas"); c.width = 2048; c.height = 2048; const g = c.getContext("2d"); g.drawImage(a, 0, 0); return c.toDataURL("image/png"); } };
window.S15ready = true;
