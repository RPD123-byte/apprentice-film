#!/usr/bin/env python3
# owltrack.py T1,T2,... -- the owl's head motion from the hold frame (20.56) to each key time: an affine map
# (20.56 frame px -> T frame px) fitted by ECC on the head (eyes, beak, plaster, brow), started from template matching.
import cv2, numpy as np, json, sys
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap = cv2.VideoCapture(V)
def fr(i): cap.set(1, i); ok, f = cap.read(); return cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32)
A = fr(514); X0, Y0, X1, Y1 = 1570, 205, 1780, 415
tpl = A[Y0:Y1, X0:X1]
out = {}
prev = None
for ts in sys.argv[1].split(","):
    T = float(ts); B = fr(int(round(T * 25)))
    r = cv2.matchTemplate(cv2.GaussianBlur(B, (0, 0), 2), cv2.GaussianBlur(tpl, (0, 0), 2), cv2.TM_CCOEFF_NORMED)
    _, mx, _, loc = cv2.minMaxLoc(r)
    Wm = np.array([[1, 0, loc[0] - X0], [0, 1, loc[1] - Y0]], np.float32)
    # ECC on the head window: warp maps template coords (in A frame) to B coords
    Ab = cv2.GaussianBlur(A, (0, 0), 1.2); Bb = cv2.GaussianBlur(B, (0, 0), 1.2)
    mask = np.zeros(A.shape, np.uint8); mask[Y0:Y1, X0:X1] = 1
    try:
        cc, Wm = cv2.findTransformECC(Ab, Bb, Wm, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-6), mask, 5)
    except cv2.error as e:
        cc = -1
    # ECC's warp maps B coords -> A coords when used with WARP_INVERSE_MAP; findTransformECC returns W with
    # A(x) ~ B(W x) ... verify by warping
    Wp = cv2.warpAffine(B, Wm, (A.shape[1], A.shape[0]), flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP)
    e = np.abs(cv2.GaussianBlur(Wp, (0, 0), 2) - cv2.GaussianBlur(A, (0, 0), 2))[Y0:Y1, X0:X1].mean()
    out[f"{T:.2f}"] = [round(float(v), 5) for v in Wm.ravel()]
    print(f"{T:.2f} tm {mx:.3f} ecc {cc:.3f} err {e:.1f}  W {np.round(Wm, 3).tolist()}")
json.dump(out, open("tr/owltrack.json", "w"))
