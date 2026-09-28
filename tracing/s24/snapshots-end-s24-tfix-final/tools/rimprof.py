# rimprof.py RDIR k -> median luminance inside the owl vs distance from its silhouette (source mask), render vs source
import sys, cv2, numpy as np
SRC = "/Users/computer/rootline/apprentice-film/snapshots/end-s24-tfix-src"
rd, k = sys.argv[1], int(sys.argv[2])
r = cv2.imread(f"{rd}/k{k:02d}.png", 0).astype(np.float32); s = cv2.imread(f"{SRC}/f{2420+k:04d}.png", 0).astype(np.float32)
b = cv2.GaussianBlur(s, (0, 0), 6); m = (b > 150).astype(np.uint8)
n, l, st, _ = cv2.connectedComponentsWithStats(m); i = 1 + np.argmax(st[1:, 4]); M = (l == i).astype(np.uint8)
M = cv2.morphologyEx(M, cv2.MORPH_CLOSE, np.ones((15, 15)))
D = cv2.distanceTransform(M, cv2.DIST_L2, 5)
for a, bnd in ((4, 10), (10, 20), (20, 35), (35, 60), (60, 100), (100, 400)):
    sel = (D >= a) & (D < bnd)
    print(f"d {a:3d}-{bnd:3d}: render p50 {np.median(r[sel]):5.1f} mean {r[sel].mean():5.1f} | source p50 {np.median(s[sel]):5.1f} mean {s[sel].mean():5.1f}")
