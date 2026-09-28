// the headphone band's crown height per key: bisect headphones.bandH so the band's outer edge at the crown matches
import { KEYS, toUnits } from "../../../src/shots/s17/owl.js";
import { headGeom, headphoneGeom } from "../../../src/lib/owlInk.js";
const targets = { 48.72: 414.5, 49.08: 414.5, 49.88: 414.5, 50.4: 409.5, 50.88: 400.5, 51.36: 388.5, 51.8: 378.5, 52.44: 363.5 };
for (const k of KEYS) {
  const T = targets[k.t]; if (T == null) continue;
  const top = (bH) => {
    const K = { ...k.p, headphones: { ...k.p.headphones, bandH: bH } }, P = toUnits(K);
    const H = headGeom(P.head), hp = headphoneGeom(H, P.headphones);
    const ys = hp.band.map((b) => P.y + P.s * b.p[1]);
    return Math.min(...ys) - K.headphones.w / 2;
  };
  let lo = 0.8, hi = 2.2;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (top(m) > T) lo = m; else hi = m; }
  console.log(k.t, "bandH", k.p.headphones.bandH, "->", ((lo + hi) / 2).toFixed(3), "top now", top(k.p.headphones.bandH).toFixed(1), "target", T);
}
