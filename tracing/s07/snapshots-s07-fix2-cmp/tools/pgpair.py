# pgpair.py DIR x0 y0 x1 y1 S out.jpg : rectified page crop render (frame 745) | source mean, 10-unit grid
import sys, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s07-fix2-cmp/tools'); from rect import rect
d = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2:6]); s = float(sys.argv[6]); out = sys.argv[7]
a = rect(cv2.imread(f'{d}/r0745.png')); b = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s07-bt/src_screen_mean.png')
cs = []
for im in (a, b):
    c = cv2.resize(im[y0:y1, x0:x1], None, fx=s, fy=s, interpolation=cv2.INTER_CUBIC)
    for x in range(0, c.shape[1], int(10 * s)): cv2.line(c, (x, 0), (x, c.shape[0]), (0, 255, 0) if round(x / s + x0) % 50 == 0 else (0, 70, 0), 1)
    for y in range(0, c.shape[0], int(10 * s)): cv2.line(c, (0, y), (c.shape[1], y), (0, 255, 0) if round(y / s + y0) % 50 == 0 else (0, 70, 0), 1)
    cs.append(c)
cv2.imwrite(out, np.hstack([cs[0], np.full((cs[0].shape[0], 6, 3), 255, np.uint8), cs[1]]))
