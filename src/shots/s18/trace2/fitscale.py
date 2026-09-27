#!/usr/bin/env python3
# fitscale.py owlphase.npz owlstack.npz f0 f1 - per frame, the similarity (scale about the owl, shift) that maps the
# phase drawing onto the frame's owl (ECC, affine then reduced to s + shift), on blurred images, masked to the owl
import sys, numpy as np, cv2, math
PH = np.load(sys.argv[1]); ST = np.load(sys.argv[2])
cf = lambda f: f - (f - 1) // 25
ph = lambda f: ['level', 'up', 'level', 'down'][cf(f) % 4]
X0, Y0 = 360, 60
for n in range(int(sys.argv[3]), int(sys.argv[4]) + 1):
    p = ph(n); T = PH[p + '_P'].astype(np.float32); sil = (PH[p + '_sil'] > 0).astype(np.uint8)
    # the head + body only (wings flap, legs move): the silhouette minus its outer 25 px band on the wing side
    m = cv2.erode(sil, np.ones((9, 9), np.uint8))
    m[:, 420:] = 0   # head/body are left of x 420 in the crop (wing and tail to the right)
    F = ST[f'P{n}'].astype(np.float32)
    b = lambda a: cv2.GaussianBlur(a, (0, 0), 3.0)
    W = np.eye(2, 3, dtype=np.float32)
    try:
        cc, W = cv2.findTransformECC(b(F), b(T), W, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-6), m, 1)
    except cv2.error: cc = 0
    # ECC(template=F, input=T): T(W x) ~ F(x), so W maps frame -> template; the drawing needs W^-1 (template -> frame)
    A = W[:, :2]; s = math.sqrt(abs(np.linalg.det(A))); rot = math.degrees(math.atan2(A[1, 0], A[0, 0]))
    print(n, p, f'cc {cc:.3f} s {s:.4f} rot {rot:.2f} W', np.round(W, 4).tolist())
