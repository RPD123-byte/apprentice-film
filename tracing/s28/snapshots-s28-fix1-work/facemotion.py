# measure the motion of small source patches (key frame t0 -> t) by template matching, vs the figure track
import sys, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s28d-tools'); sys.path.insert(0, '.')
from lib import src; from trk import track
key, t0 = sys.argv[1], float(sys.argv[2]); ts = [float(v) for v in sys.argv[3].split(',')]
pts = [tuple(int(v) for v in p.split(',')) for p in sys.argv[4].split()]; R = int(sys.argv[5]) if len(sys.argv) > 5 else 28
g0 = cv2.cvtColor(src(t0), cv2.COLOR_BGR2GRAY)
for t in ts:
    g = cv2.cvtColor(src(t), cv2.COLOR_BGR2GRAY); row = []
    for (x, y) in pts:
        tp = g0[y - R:y + R, x - R:x + R]
        px, py = track(key, t, x, y); S = 70
        x0, y0 = int(px) - R - S, int(py) - R - S
        win = g[max(0, y0):y0 + 2 * (R + S), max(0, x0):x0 + 2 * (R + S)]
        res = cv2.matchTemplate(win, tp, cv2.TM_CCOEFF_NORMED); _, mv, _, ml = cv2.minMaxLoc(res)
        mx, my = max(0, x0) + ml[0] + R, max(0, y0) + ml[1] + R
        row.append(f'({x},{y}): src ({mx},{my}) trk ({px:.0f},{py:.0f}) d ({mx - px:+.0f},{my - py:+.0f}) c{mv:.2f}')
    print(t, ' | '.join(row))
