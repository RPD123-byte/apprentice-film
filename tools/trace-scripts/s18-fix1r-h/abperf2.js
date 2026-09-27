// interleaved timing: variant 0 = direct, 1 = layered, 2 = old version
import { shot as NEW } from "../../src/shots/s18.js";
import { shot as OLD } from "../../src/shots/s18/traced_v2/s18_traced.js";
export const shot = { draw(ctx, local, t) {
  const n = Math.round((t - 0.012) * 25), v = Math.floor(n / 10000), f = n % 10000, tt = f / 25 + 0.012;
  if (v === 2) return OLD.draw(ctx, tt - 53.24, tt);
  globalThis.__S18DIRECT = v === 0;
  NEW.draw(ctx, tt - 53.24, tt);
} };
