import cv2, numpy as np, pickle
from common import *
sift = cv2.SIFT_create(nfeatures=6000, contrastThreshold=0.02)
bf = cv2.BFMatcher(cv2.NORM_L2)
def m(a, b):
    ga = cv2.imread(f'{SRC}/f{a}.png', 0); gb = cv2.imread(f'{SRC}/f{b}.png', 0)
    ka, da = sift.detectAndCompute(ga, owlmask(a).astype(np.uint8) * 255); kb, db = sift.detectAndCompute(gb, owlmask(b).astype(np.uint8) * 255)
    mm = bf.knnMatch(da, db, k=2); good = [x[0] for x in mm if len(x) == 2 and x[0].distance < 0.75 * x[1].distance]
    P = np.float32([ka[x.queryIdx].pt for x in good]); Q = np.float32([kb[x.trainIdx].pt for x in good])
    return P, Q
fs = [450, 520, 600, 700, 819, 950, 1100, 1300]
tot = np.zeros(len(fs))
for a, b in [(1091, 1093), (1093, 1094), (1094, 1095), (1095, 1096), (1096, 1098), (1098, 1099), (1100, 1101), (1101, 1102), (1102, 1103), (1103, 1104), (1055, 1056), (1056, 1057), (1057, 1058)]:
    P, Q = m(a, b)
    row = []
    for k, f in enumerate(fs):
        Kf = K(f)
        # sampson error distribution with the RANSAC E (tight threshold); count inliers at 0.7 px
        E, inl = cv2.findEssentialMat(P, Q, Kf, cv2.RANSAC, 0.9999, 0.7, maxIters=5000)
        n = int(inl.sum()); row.append(n); tot[k] += n
    print(a, b, len(P), row)
print('total', dict(zip(fs, tot.astype(int))))
