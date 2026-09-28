# rtrack.py DIR IDX [x0 y0 x1 y1]: similarity render->source (ORB+RANSAC) on the room
import cv2, sys, glob, numpy as np
d, idx = sys.argv[1], sys.argv[2]
a = cv2.imread(glob.glob(f'{d}/frame-{idx}-*.png')[0], 0); b = cv2.imread(glob.glob(f'{d}/ref-{idx}-*.png')[0], 0)
roi = [int(v) for v in sys.argv[3:7]] if len(sys.argv) >= 7 else None
m1 = None
if roi: m1 = np.zeros_like(a); m1[roi[1]:roi[3], roi[0]:roi[2]] = 255
clahe = cv2.createCLAHE(3.0, (8, 8)); a2 = clahe.apply(a); b2 = clahe.apply(b)
orb = cv2.ORB_create(8000)
ka, da = orb.detectAndCompute(a2, m1); kb, db = orb.detectAndCompute(b2, m1)
bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
m = sorted(bf.match(da, db), key=lambda x: x.distance)[:1500]
A = np.float32([ka[x.queryIdx].pt for x in m]); B = np.float32([kb[x.trainIdx].pt for x in m])
M, inl = cv2.estimateAffinePartial2D(A, B, ransacReprojThreshold=4)
s = np.hypot(M[0, 0], M[1, 0])
print(f'render->source: s={s:.4f} rot={np.degrees(np.arctan2(M[1,0],M[0,0])):+.2f} tx={M[0,2]:.1f} ty={M[1,2]:.1f} inliers={int(inl.sum())}/{len(m)}')
for p in [(300, 300), (1100, 400), (1800, 300), (600, 800), (1600, 800)]:
    q = M @ np.array([p[0], p[1], 1.0]); print('  render', p, '-> source', q.round(1))
