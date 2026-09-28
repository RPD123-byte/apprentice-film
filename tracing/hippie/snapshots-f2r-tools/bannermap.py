# Measure the colour strip's mapping: colour page (117.4 s owl-free ref) -> source frame at time t, restricted to the
# header strip. Fits x' = ax*x + bx, y' = ay*y + by (axis-aligned scale + translation) with RANSAC on SIFT matches.
import sys, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/f2r-tools')
from grade import frame
ref = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/page-graded.png')
sift = cv2.SIFT_create(6000)
g1 = cv2.cvtColor(ref, cv2.COLOR_BGR2GRAY)
k1, d1 = sift.detectAndCompute(g1, None)
FR = (162.36, 132.85, 0.842616, 0.847317)
for t in [float(v) for v in sys.argv[1:]]:
    f = frame(t); g2 = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
    m = np.zeros_like(g2); m[180:368, 185:1985] = 255
    k2, d2 = sift.detectAndCompute(g2, m)
    if d2 is None or len(k2) < 20: print(t, "no features"); continue
    bf = cv2.BFMatcher(); ms = bf.knnMatch(d1, d2, k=2)
    good = [a for a, b in ms if a.distance < 0.75 * b.distance]
    P = np.float32([k1[a.queryIdx].pt for a in good]); Q = np.float32([k2[a.trainIdx].pt for a in good])
    best = None
    rs = np.random.RandomState(1)
    for it in range(3000):
        i, j = rs.choice(len(P), 2, replace=False)
        if abs(P[i, 0] - P[j, 0]) < 50 or abs(P[i, 1] - P[j, 1]) < 20: continue
        ax = (Q[i, 0] - Q[j, 0]) / (P[i, 0] - P[j, 0]); bx = Q[i, 0] - ax * P[i, 0]
        ay = (Q[i, 1] - Q[j, 1]) / (P[i, 1] - P[j, 1]); by = Q[i, 1] - ay * P[i, 1]
        e = np.hypot(ax * P[:, 0] + bx - Q[:, 0], ay * P[:, 1] + by - Q[:, 1])
        inl = e < 2.0
        if best is None or inl.sum() > best[0]: best = (inl.sum(), inl)
    inl = best[1]
    A = np.vstack([P[inl, 0], np.ones(inl.sum())]).T; ax, bx = np.linalg.lstsq(A, Q[inl, 0], rcond=None)[0]
    A = np.vstack([P[inl, 1], np.ones(inl.sum())]).T; ay, by = np.linalg.lstsq(A, Q[inl, 1], rcond=None)[0]
    e = np.hypot(ax * P[inl, 0] + bx - Q[inl, 0], ay * P[inl, 1] + by - Q[inl, 1])
    # to B&W page coords: page = (frame - FR.xy) / FR.s
    sx, tx = ax / FR[2], (bx - FR[0]) / FR[2]; sy, ty = ay / FR[3], (by - FR[1]) / FR[3]
    print(f"t {t:6.2f}: inliers {inl.sum():4d} res {np.median(e):.2f}px  frame x'={ax:.4f}x+{bx:.1f} y'={ay:.4f}y+{by:.1f}  | page sx {sx:.4f} tx {tx:.1f} sy {sy:.4f} ty {ty:.1f}")
