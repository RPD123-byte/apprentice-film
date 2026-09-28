# source frame cache: frame k (25 fps) of the source as BGR uint8, cached as .npy in snapshots/s05-p3-study/cache
import cv2, numpy as np, os
SRC='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
CD=os.path.join(os.path.dirname(__file__),'cache'); os.makedirs(CD,exist_ok=True)
_cap=None
def frame(k):
    global _cap
    p=os.path.join(CD,f'{k}.png')
    if os.path.exists(p): return cv2.imread(p)
    if _cap is None: _cap=cv2.VideoCapture(SRC)
    _cap.set(cv2.CAP_PROP_POS_FRAMES,k); ok,f=_cap.read()
    cv2.imwrite(p,f); return f
