p='/Users/computer/rootline/apprentice-film/src/shots/s14.js'; s=open(p).read()
s=s.replace('''import { LIGHT } from "./s14/light3.js";''','''import { LIGHT } from "./s14/light3.js";
import { GAPL } from "./s14/gaplight3.js";''')
s=s.replace('''let R = null;
function room() {''','''// per-layer light in the gap view (s14/gaplight3.js, fitted per source frame by trace3/gaplight.py): the lit gap is
// not an even window on the room: the far boxes and the lamp's corner stay lit, the desk and floor stay dark
function gapLightAt(t) {
  const T = GAPL.t, out = {};
  if (!T.length) return out;
  for (const [name, v] of Object.entries(GAPL.g)) {
    let g = v[0];
    if (t >= T[T.length - 1]) g = v[T.length - 1];
    else for (let i = 1; i < T.length; i++) if (t <= T[i]) { const f = (t - T[i - 1]) / (T[i] - T[i - 1]); g = v[i - 1] + (v[i] - v[i - 1]) * Math.max(0, f); break; }
    out[name] = g;
  }
  return out;
}

let R = null;
function room() {''')
s=s.replace('''      const { G, F } = lightAt(40.0);
      img = comp.render({ ds: [0], C, sim, mask: [a * gx + bx, a * gy + by, a * rx, a * ry, 0.86, 1.12, pw], gain: gain * GAPK.gain, Gmap: G, dots: 0.5 });''','''      const { G } = lightAt(40.0), GL = gapLightAt(th), Gm = { ...G };
      for (const n in GL) Gm[n] = (Gm[n] ?? 1) * GL[n];
      img = comp.render({ ds: [0], C, sim, mask: [a * gx + bx, a * gy + by, a * rx, a * ry, 0.86, 1.12, pw], gain: gain * GAPK.gain, Gmap: Gm, dots: 0.5 });''')
open(p,'w').write(s)
print('patched')
