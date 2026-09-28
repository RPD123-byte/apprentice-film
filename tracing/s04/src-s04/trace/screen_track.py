#!/usr/bin/env python3
# screen_track.py -- the laptop screen's plane from 23.12 back to 22.40: SIFT matches inside the screen (the page
# content), RANSAC homography frame to frame, chained back from the 23.12 frame, where the screen is s05's page quad
# placed by s05's 23.12 settle. Prints per frame the page quad (4 corners, frame px) and writes screen.json.
import cv2, numpy as np, json, math, sys
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap = cv2.VideoCapture(V)
def fr(i): cap.set(cv2.CAP_PROP_POS_FRAMES, i); ok, f = cap.read(); return cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
PAGE_QUAD = [[320.7, 246.0], [834.7, 168.7], [900.9, 521.2], [411.9, 644.8]]
SCREEN = [[315, 246], [834, 168], [898, 519], [409, 648]]
S, R, dx, dy, cx, cy = 0.0639, -2.99, -111.5, 74.9, 700, 650
def settle(p):
    a = math.radians(R); c, s = math.cos(a), math.sin(a); x, y = (p[0] - cx) * (1 + S), (p[1] - cy) * (1 + S)
    return [cx + dx + c * x - s * y, cy + dy + s * x + c * y]
Q0 = np.array([settle(p) for p in PAGE_QUAD], np.float32)
SC0 = np.array([settle(p) for p in SCREEN], np.float32)
f_end = int(round(23.12 * 25)); f_start = int(round(float(sys.argv[1]) * 25)) if len(sys.argv) > 1 else 560
sift = cv2.SIFT_create(4000)
H = np.eye(3)
out = {f"{f_end / 25:.2f}": Q0.tolist()}
prev = fr(f_end)
def mask_of(quad, shape, shrink=6):
    m = np.zeros(shape, np.uint8); c = quad.mean(0); q = c + (quad - c) * (1 - shrink / 300)
    cv2.fillPoly(m, [q.astype(np.int32)], 255); return m
for f in range(f_end - 1, f_start - 1, -1):
    cur = fr(f)
    qp = cv2.perspectiveTransform(SC0[None], H)[0]          # screen quad in the previous (later) frame
    mp = mask_of(qp, prev.shape)
    k1, d1 = sift.detectAndCompute(prev, mp)
    # search the current frame in a dilated version of the same quad (the motion per frame is < 150 px)
    mc = cv2.dilate(mp, np.ones((301, 301), np.uint8))
    k2, d2 = sift.detectAndCompute(cur, mc)
    if d1 is None or d2 is None or len(k1) < 8 or len(k2) < 8: print(f, "too few"); break
    bf = cv2.BFMatcher(); mt = bf.knnMatch(d1, d2, k=2)
    good = [m for m, n in (x for x in mt if len(x) == 2) if m.distance < 0.75 * n.distance]
    if len(good) < 8: print(f, "few matches", len(good)); break
    A = np.float32([k1[m.queryIdx].pt for m in good]); B = np.float32([k2[m.trainIdx].pt for m in good])
    Hs, inl = cv2.findHomography(A, B, cv2.RANSAC, 2.5)
    if Hs is None: print(f, "no H"); break
    H = Hs @ H
    q = cv2.perspectiveTransform(Q0[None], H)[0]
    res = np.linalg.norm(cv2.perspectiveTransform(A[None], Hs)[0] - B, axis=1)[inl[:, 0] > 0]
    out[f"{f / 25:.2f}"] = q.tolist()
    print(f"{f / 25:.2f}: {len(good)} matches, {int(inl.sum())} inliers, residual {np.median(res):.2f}px, quad {np.round(q).astype(int).tolist()}")
    prev = cur
json.dump(out, open('tr/screen.json', 'w'))
