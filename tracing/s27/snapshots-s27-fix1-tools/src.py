# shared source-frame access for s27d measuring (frame index = round(t*25))
import cv2, numpy as np, os
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
_c=cv2.VideoCapture(V)
_cache={}
def frame(t, gray=False):
    n=int(round(t*25))
    if n not in _cache:
        _c.set(cv2.CAP_PROP_POS_FRAMES,n); ok,f=_c.read()
        if len(_cache)>200: _cache.clear()
        _cache[n]=f
    f=_cache[n]
    return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY) if gray else f.copy()
def times(t0,t1,step=0.04):
    n=int(round((t1-t0)/step))
    return [round(t0+i*step,3) for i in range(n+1)]
