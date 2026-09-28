import { readInts } from "/Users/computer/rootline/apprentice-film/src/shots/s24/vec.js";
import { PAGE_A, PAGE_B } from "/Users/computer/rootline/apprentice-film/src/shots/s24/dataPage.js";
for (const D of [PAGE_A, PAGE_B]) {
  for (const [v, enc] of D.L) {
    let bb = [1e9, 1e9, -1e9, -1e9], n = 0;
    for (const s of enc.split(" ")) {
      const a = readInts(s); let x = a[0], y = a[1];
      const up = () => { bb[0] = Math.min(bb[0], x / D.q); bb[1] = Math.min(bb[1], y / D.q); bb[2] = Math.max(bb[2], x / D.q); bb[3] = Math.max(bb[3], y / D.q); };
      up();
      for (let i = 2; i + 1 < a.length; i += 2) { x += a[i]; y += a[i + 1]; up(); n++; }
      if (a.length % 2) console.log("odd length!", a.length);
    }
    console.log(v, bb.map((q) => q.toFixed(0)).join(","), n);
  }
}
