# Verify the colour page's arrival camera: similarity (s, tx, ty) colour page -> frame at t (SIFT + RANSAC on the
# lower 60 % of the page, where the headline/owl do not move).
import sys, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/f2r-tools')
from grade import frame
ref = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/page-graded.png')
sift = cv2.SIFT_create(8000)
m1 = np.zeros(ref.shape[:2], np.uint8); m1[380:946, :] = 255
k1, d1 = sift.detectAndCompute(cv2.cvtColor(ref, cv2.COLOR_BGR2GRAY), m1)
for t in [float(v) for v in sys.argv[1:]]:
    f = frame(t); k2, d2 = sift.detectAndCompute(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), None)
    ms = cv2.BFMatcher().knnMatch(d1, d2, k=2); good = [a for a, b in ms if a.distance < 0.72 * b.distance]
    P = np.float32([k1[a.queryIdx].pt for a in good]); Q = np.float32([k2[a.trainIdx].pt for a in good])
    M, inl = cv2.estimateAffinePartial2D(P, Q, method=cv2.RANSAC, ransacReprojThreshold=2.0)
    s = np.hypot(M[0, 0], M[1, 0]); rot = np.degrees(np.arctan2(M[1, 0], M[0, 0]))
    print(f"t {t:7.2f}: inl {int(inl.sum()):4d}  s {s:.4f} rot {rot:+.2f}  tx {M[0,2]:7.1f} ty {M[1,2]:6.1f}")
