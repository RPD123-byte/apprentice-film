#!/usr/bin/env python3
# owltrack2.py T1,T2,... -- chained head tracking: each key time's affine (20.56 px -> T px) is the previous key's
# composed with an ECC affine fitted between consecutive frames on the (carried) head window.
import cv2, numpy as np, json, sys
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap = cv2.VideoCapture(V)
def fr(i): cap.set(1, i); ok, f = cap.read(); return cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32)
J = json.load(open("tr/owltrack.json"))
ts = sys.argv[1].split(",")
HEAD = np.array([[1570, 205], [1780, 205], [1780, 415], [1570, 415]], np.float32)   # head window at 20.56
def to3(W): return np.vstack([W, [0, 0, 1]])
t0 = ts[0]; Wc = np.array(J[t0], np.float32).reshape(2, 3)
fa = fr(int(round(float(t0) * 25)))
for ts_ in ts[1:]:
    T = float(ts_); fb = fr(int(round(T * 25)))
    poly = (np.c_[HEAD, np.ones(4)] @ to3(Wc).T)[:, :2]
    mask = np.zeros(fa.shape, np.uint8); cv2.fillPoly(mask, [np.round(poly).astype(np.int32)], 1)
    x, y, w, h = cv2.boundingRect(np.round(poly).astype(np.int32))
    # init: translation by template match of the head window of fa in fb
    tpl = fa[max(0, y):y + h, max(0, x):x + w]
    r = cv2.matchTemplate(cv2.GaussianBlur(fb, (0, 0), 2), cv2.GaussianBlur(tpl, (0, 0), 2), cv2.TM_CCOEFF_NORMED)
    _, mx, _, loc = cv2.minMaxLoc(r)
    Wi = np.array([[1, 0, loc[0] - max(0, x)], [0, 1, loc[1] - max(0, y)]], np.float32)
    try:
        cc, Wi = cv2.findTransformECC(cv2.GaussianBlur(fa, (0, 0), 1.2), cv2.GaussianBlur(fb, (0, 0), 1.2), Wi, cv2.MOTION_AFFINE,
                                      (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-6), mask, 5)
    except cv2.error: cc = -1
    Wc = (to3(Wi) @ to3(Wc))[:2].astype(np.float32)
    J[f"{T:.2f}"] = [round(float(v), 5) for v in Wc.ravel()]
    print(f"{T:.2f} tm {mx:.3f} ecc {cc:.3f} W {np.round(Wc, 3).tolist()}")
    fa = fb
json.dump(J, open("tr/owltrack.json", "w"))
