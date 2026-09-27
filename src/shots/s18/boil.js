// Line boil for the hand-redrawn owl: the source redraws its owl on every content frame, so each content frame gets
// its own seeded, smooth sub-pixel warp of the drawing's outlines and centre-lines (~+-0.8 px, 40-px scale) and a
// small per-stroke tone jitter (~+-8 % of its contrast). Held frames (the same content frame) are identical; plates
// never boil. Deterministic.
import { noise2, hash } from "../../lib/rng.js";

export const contentFrame = (f) => f - Math.floor((f - 1) / 25);

export function boilMap(cf, amp = 0.8, scale = 40, seed = 1801) {
  if (!(amp > 0)) return null;
  const s1 = seed + cf * 7, s2 = seed + cf * 7 + 3;
  return (x, y) => [x + amp * noise2(x / scale, y / scale, s1), y + amp * noise2(x / scale + 17.3, y / scale - 5.1, s2)];
}
// tone jitter for drawInk: kind 0 = dark strokes (on a light face ~ base), 1 = bright strokes (on black)
export function boilTone(cf, amt = 0.08, base = 235, seed = 911) {
  if (!(amt > 0)) return null;
  return (i, kind, t) => {
    const j = (hash(i, kind, cf, seed) * 2 - 1) * amt;
    return kind === 0 ? base - (base - t) * (1 + j) : t * (1 + j);
  };
}

// which of the few pre-drawn boil variants a content frame shows (consecutive content frames always differ)
export const NVAR = 3;
export const boilVariant = (cf) => ((cf % NVAR) + NVAR) % NVAR;
