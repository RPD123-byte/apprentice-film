import * as S from "./dev/lib/sites.js";
import * as I from "./dev/lib/sokoIll.js";
import { createPost } from "./src/lib/post.js";
import * as HP from "./src/lib/hippie.js";
window.F1 = { S, I, createPost, HP };
window.F1ready = (async () => {
  await Promise.all(["900 100px Archivo", "400 20px Geist", "300 20px Geist", "500 20px 'Geist Mono'", "400 40px Shrikhand", "900 100px 'Fraunces Soft'", "800 40px Satoshi", "500 20px Poppins", "600 20px Poppins", "700 20px Poppins", "400 20px Fraunces", "700 20px Fraunces"].map((f) => document.fonts.load(f)));
  await document.fonts.ready;
  return true;
})();
