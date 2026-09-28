import cv2, math, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
_c = None
def frame(t, gray=True):
    global _c
    if _c is None: _c = cv2.VideoCapture(V)
    i = math.ceil(t * 25 - 1e-6)
    _c.set(cv2.CAP_PROP_POS_FRAMES, i); ok, f = _c.read()
    return cv2.cvtColor(f, cv2.COLOR_BGR2GRAY) if gray else f
