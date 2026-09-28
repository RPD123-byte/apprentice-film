# track.py OUT x0 y0 x1 y1 frames... : template (from the source C hold median) tracked in source and render frames
import cv2, numpy as np, sys
out = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2:6]); fr = [int(f) for f in sys.argv[6:]]
S = '/Users/computer/rootline/apprentice-film/snapshots/s13-w3-src'
C = np.median(np.stack([cv2.imread(f'{S}/f{f}.png', 0) for f in range(891, 899)]), 0).astype(np.float32)
T = C[y0:y1, x0:x1]; P = 60
def tr(I):
    best = None
    for ang in np.arange(-10, 10.1, 0.5):
        M = cv2.getRotationMatrix2D(((x0 + x1) / 2, (y0 + y1) / 2), ang, 1.0)
        Ir = cv2.warpAffine(I, M, (I.shape[1], I.shape[0]))
        W = Ir[max(0, y0 - P):y1 + P, max(0, x0 - P):x1 + P]
        res = cv2.matchTemplate(W, T, cv2.TM_CCOEFF_NORMED); _, mx, _, loc = cv2.minMaxLoc(res)
        if best is None or mx > best[0]: best = (mx, ang, loc[0] - min(P, x0), loc[1] - min(P, y0))
    return best
for f in fr:
    s = tr(cv2.imread(f'{S}/f{f}.png', 0).astype(np.float32)); r = tr(cv2.imread(f'{out}/r{f}.png', 0).astype(np.float32))
    print(f, 'src ncc %.3f ang %+.1f d %+d %+d' % s, '| rnd ncc %.3f ang %+.1f d %+d %+d' % r, '| err ang %+.1f d %+d %+d' % (r[1] - s[1], r[2] - s[2], r[3] - s[3]))
