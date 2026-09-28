#!/usr/bin/env python3
# Evaluate crack segment sets against the source A median ridge map (stage px ~ frame px in A).
import cv2, numpy as np, re, json, sys
S = 'snapshots/s26c-meas/src/'
def load(path, name):
    t = open(path).read()
    m = re.search(r'export const %s = \[([^\]]*)\]' % name, t)
    v = [float(x) for x in m.group(1).replace('\n', '').split(',') if x.strip()]
    return np.array(v).reshape(-1, 4)
def median_A():
    ims = [cv2.imread(S + f'{F}.png', 0) for F in range(2765, 2788, 2)]
    return np.median(np.stack(ims), 0).astype(np.uint8)
def ridge(g):
    th = cv2.morphologyEx(g, cv2.MORPH_TOPHAT, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    return th
def raster(segs, w=3):
    m = np.zeros((946, 2206), np.uint8)
    for x0, y0, x1, y1 in segs: cv2.line(m, (int(round(x0)), int(round(y0))), (int(round(x1)), int(round(y1))), 255, w)
    return m
if __name__ == '__main__':
    g = median_A()
    R = ridge(g)
    cv2.imwrite('snapshots/s26-fix1-meas/ridgeA.png', R)
    mask = np.zeros_like(g); mask[128:912, 144:2023] = 1
    # owl mask (rough) excluded
    cv2.ellipse(mask, (1075, 600), (260, 380), 0, 0, 360, 0, -1)
    rid = (R > 40) & (mask > 0)
    print('ridge px', rid.sum())
    for path, name in [('src/shots/s26/cracksA.js', 'CRACKS_A'), ('src/shots/s25/v2/cracks2.js', 'CRACKS_B')]:
        s = load(path, name)
        m = raster(s, 5) > 0
        rec = (rid & m).sum() / rid.sum()
        m1 = raster(s, 2) > 0
        prec = (m1 & (cv2.dilate((R > 30).astype(np.uint8), np.ones((3, 3))) > 0) & (mask > 0)).sum() / max(1, (m1 & (mask > 0)).sum())
        L = np.hypot(s[:, 2] - s[:, 0], s[:, 3] - s[:, 1])
        print(name, path, 'n', len(s), 'len median %.0f total %.0f' % (np.median(L), L.sum()), 'recall %.3f precision %.3f' % (rec, prec))
