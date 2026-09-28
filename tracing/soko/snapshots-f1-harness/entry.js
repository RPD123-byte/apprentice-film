// F1 scratch harness entry (not part of the film)
import * as S from "./src/lib/sites.js";
import * as I from "./src/lib/sokoIll.js";
import { createPost } from "./src/lib/post.js";
window.F1 = { S, I, createPost };
window.F1ready = (async () => {
  await Promise.all(["900 100px Archivo", "400 20px Geist", "300 20px Geist", "500 20px 'Geist Mono'"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  return true;
})();
