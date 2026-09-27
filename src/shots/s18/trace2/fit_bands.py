# fit_bands.py : fix pass 4. Stripe wedges (pressed keys' side walls) for the frames where the trace missed them.
# For each hand-read wedge polygon (read off 3x gridded source crops), fits the stripe angle, pitch and phase that
# maximise the stripes' contrast inside the polygon on the pre-grade frame, then the two tones and the line width
# (from the fraction of the polygon darker than the mid tone). Prints band entries in shotB.js drawBand format:
# [poly, angle, pitch, offset, lineWidth, lineTone, paperTone]. Measurement only.
import sys, os, json, numpy as np, cv2, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('S18SRC', '/Users/computer/rootline/apprentice-film/snapshots/s18-fix1-src/')
from common import pre
W = {
  1383: [[998, 655], [1062, 677], [1067, 683], [1067, 727], [1060, 727], [998, 707]],
  1394: [[998, 656], [1063, 678], [1067, 684], [1067, 728], [1060, 728], [998, 710]],
  1384: [[1000, 641], [1197, 689], [1199, 736], [1060, 688], [1000, 662]],
  1400: [[1003, 634], [1197, 683], [1199, 737], [1066, 694], [1003, 662]],
}
out = {}
for n, poly in W.items():
    P = pre(n)
    m = np.zeros_like(P, np.uint8); cv2.fillPoly(m, [np.int32(np.round(poly))], 1)
    m = cv2.erode(m, np.ones((3, 3), np.uint8)) > 0
    yy, xx = np.nonzero(m); v = P[yy, xx] - P[yy, xx].mean()
    best = None
    for a in np.arange(0.18, 0.46, 0.005):
        s = -xx * math.sin(a) + yy * math.cos(a)
        for per in np.arange(7.0, 12.5, 0.125):
            z = (v * np.exp(2j * math.pi * s / per)).mean()
            if best is None or abs(z) > best[0]: best = (abs(z), a, per, z)
    _, a, per, z = best
    # phase: the darkest line centre sits at s0 (cos(2 pi (s - s0) / per) = -1 at the dark centre)
    ph = math.atan2(z.imag, z.real)          # v ~ A cos(2 pi s / per - ph)
    s_light = ph * per / (2 * math.pi); s_dark = s_light + per / 2
    vals = P[yy, xx]; lo, hi = np.percentile(vals, 12), np.percentile(vals, 88)
    frac_dark = (vals < (lo + hi) / 2).mean()
    w = float(np.clip(frac_dark * per, 1.5, per - 1.5))
    off = s_dark % per
    out[n] = [poly, round(a, 4), round(per, 3), round(off, 2), round(w, 2), int(round(lo * 255)), int(round(hi * 255))]
    print(n, 'ang %.3f per %.2f off %.2f w %.2f dark %d paper %d contrast %.3f' % (a, per, off, w, lo * 255, hi * 255, abs(z)))
json.dump(out, open(sys.argv[1] if len(sys.argv) > 1 else '/dev/stdout', 'w'))
