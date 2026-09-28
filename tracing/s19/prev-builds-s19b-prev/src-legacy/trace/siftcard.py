# SIFT + RANSAC homography of the source's standing card (57.36, rectified) onto a lift frame: an initial guess
# for fitcard.py's direct alignment (measurement only).
import numpy as np, cv2, json, sys
from common import frame
CW, CH, M = 465, 648, 14
C = np.float32([[0, 0], [CW, 0], [CW, CH], [0, CH]])
QS = np.float32([[1093.2, 86.9], [1578.4, 50.7], [1686.5, 802.5], [995.7, 774.1]])
Hs = cv2.getPerspectiveTransform(C, QS).astype(np.float64)
Tm = np.array([[1, 0, -M], [0, 1, -M], [0, 0, 1]], np.float64)
UP = 2.0   # template at 2 px / unit for more features
Tu = np.array([[1 / UP, 0, 0], [0, 1 / UP, 0], [0, 0, 1]]) 
src = np.mean([frame(1433), frame(1434)], 0).astype(np.float32)
Ht = Hs @ Tm @ Tu
T = cv2.warpPerspective(src, Ht, (int((CW + 2 * M) * UP), int((CH + 2 * M) * UP)), flags=cv2.WARP_INVERSE_MAP | cv2.INTER_CUBIC)
T8 = np.clip(T, 0, 255).astype(np.uint8)
sift = cv2.SIFT_create(nfeatures=6000, contrastThreshold=0.01)
kt, dt = sift.detectAndCompute(T8, None)
def fit(n, prior=None):
    I = frame(n).astype(np.float32); I8 = np.clip(I, 0, 255).astype(np.uint8)
    ki, di = sift.detectAndCompute(I8, None)
    m = cv2.BFMatcher().knnMatch(dt, di, k=2)
    good = [a for a, b in m if a.distance < 0.8 * b.distance]
    pt = np.float32([kt[g.queryIdx].pt for g in good]); pi = np.float32([ki[g.trainIdx].pt for g in good])
    if prior is not None:
        # keep matches consistent with the prior (within 150 px)
        pp = cv2.perspectiveTransform(pt.reshape(-1, 1, 2), prior.astype(np.float32)).reshape(-1, 2)
        k = np.hypot(*(pp - pi).T) < 150; pt, pi = pt[k], pi[k]
    Hm, inl = cv2.findHomography(pt, pi, cv2.RANSAC, 3.0, maxIters=20000, confidence=0.999)
    # template px -> frame; card units -> frame = Hm @ inv(Tm@Tu)
    Hc = Hm @ np.linalg.inv(Tm @ Tu)
    q = cv2.perspectiveTransform(C.reshape(-1, 1, 2), Hc).reshape(4, 2)
    return q, int(inl.sum()), len(good), Hc
if __name__ == '__main__':
    tab = json.load(open(sys.argv[1])); out = []
    for row in tab:
        t = row[0]; n = int(round(t * 25))
        prior = cv2.getPerspectiveTransform(C, np.float32(row[1:]).reshape(4, 2)).astype(np.float64) @ Tm @ Tu
        q, ni, ng, Hc = fit(n, prior)
        out.append([t] + [round(float(v), 1) for v in q.ravel()])
        print(t, 'inliers', ni, '/', ng, np.round(q, 1).tolist(), flush=True)
    json.dump(out, open(sys.argv[2], 'w'))
