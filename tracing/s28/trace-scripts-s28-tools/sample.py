# Sample pre-grade colours (median of a (2r+1)^2 window) at named points of a source frame.
import sys,json,numpy as np
sys.path.insert(0,'snapshots/s28-tools')
from grade import pre_frame,hexc
import cv2
t=float(sys.argv[1]); pts=json.loads(sys.argv[2]); r=int(sys.argv[3]) if len(sys.argv)>3 else 4
p=pre_frame(t)
p=cv2.medianBlur((p*255).astype(np.uint8),5).astype(np.float32)/255
for name,(x,y) in pts.items():
    w=p[max(0,y-r):y+r+1,max(0,x-r):x+r+1].reshape(-1,3)
    m=np.median(w,0)
    print(f"{name:14s} ({x},{y}) {hexc(m)}  rgb={tuple(int(v*255) for v in m)}")
