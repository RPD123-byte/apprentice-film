# zoom of each pull-back frame relative to a reference frame, for render and source separately (ORB+RANSAC),
# owl + steam masked; also the direct render->source similarity per frame
import cv2, numpy as np, glob
P = '/Users/computer/rootline/apprentice-film/snapshots/'
def get(t, kind):
    tt = ('%.2f' % t).rstrip('0').rstrip('.')
    for d in ('s17-rev2-a', 's17-rev2-b', 's17-rev2-c'):
        g = glob.glob(P + d + '/%s-*-at-%ss.png' % (kind, tt))
        if g: return cv2.imread(g[0], 0)
orb = cv2.ORB_create(8000); bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
def fit(a, b, mask=None, maskb=None):
    ka, da = orb.detectAndCompute(a, mask); kb, db = orb.detectAndCompute(b, maskb)
    m = sorted(bf.match(da, db), key=lambda x: x.distance)[:1500]
    A = np.float32([ka[x.queryIdx].pt for x in m]); B = np.float32([kb[x.trainIdx].pt for x in m])
    M, inl = cv2.estimateAffinePartial2D(A, B, ransacReprojThreshold=2, maxIters=5000, confidence=0.999)
    s = np.hypot(M[0, 0], M[1, 0]); return s, M, int(inl.sum())
FX, FY = 865, 341
mask = np.full((946, 2206), 255, np.uint8); mask[300:600, 400:900] = 0  # owl, steam, mug
T = [round(0.04 * n, 2) for n in range(1195, 1222)]
refR, refS = get(49.00, 'frame'), get(49.00, 'ref')
print('t     zoomR   zoomS   diff%   | render->source: s, dx@corners')
for t in T:
    r, s = get(t, 'frame'), get(t, 'ref')
    # frame -> ref(49.0) : x49 = s*x_t + tx  => zoom of frame relative to 49 = 1/s
    sr, Mr, nr = fit(r, refR, None, None)
    ss, Ms, ns = fit(s, refS, None, None)
    zr, zs = 1 / sr, 1 / ss
    s2, M2, n2 = fit(r, s)
    # displacement of the 4 corners and centre under M2 (render px -> source px)
    pts = np.float32([[0, 0], [2205, 0], [0, 945], [2205, 945], [1103, 473]])
    q = pts @ M2[:, :2].T + M2[:, 2]
    dmax = np.abs(q - pts).max()
    print(f'{t:.2f} {zr:.4f} {zs:.4f} {100*(zr/zs-1):+.2f}  | {s2:.4f} maxcorner {dmax:.1f}px inl {nr},{ns},{n2}')
