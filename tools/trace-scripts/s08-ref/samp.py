import cv2, numpy as np, sys
f=cv2.imread(sys.argv[1])
pts=sys.argv[2:]
for i in range(0,len(pts),3):
    name=pts[i]; x=int(pts[i+1]); y=int(pts[i+2]); r=3
    p=np.median(f[y-r:y+r+1,x-r:x+r+1].reshape(-1,3),0)
    b,g,rr=p; print(f"{name:12s} ({x},{y}) #{int(rr):02x}{int(g):02x}{int(b):02x}")
