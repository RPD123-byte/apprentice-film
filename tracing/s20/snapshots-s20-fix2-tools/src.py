#!/usr/bin/env python3
# measurement only: dump source frames (by frame index) as png into s20-fix2-src/f_NNNN.png (cached)
import cv2, sys, os
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
D='/Users/computer/rootline/apprentice-film/snapshots/s20-fix2-src'
c=cv2.VideoCapture(V)
def get(fr):
    p=f'{D}/f_{fr}.png'
    if os.path.exists(p): return cv2.imread(p)
    c.set(cv2.CAP_PROP_POS_FRAMES,fr); ok,f=c.read(); cv2.imwrite(p,f); return f
if __name__=='__main__':
    for a in sys.argv[1:]:
        if '-' in a: s,e=map(int,a.split('-')); [get(i) for i in range(s,e+1)]
        else: get(int(a))
