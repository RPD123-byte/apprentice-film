import cv2, numpy as np, sys
a=cv2.imread(sys.argv[1]); b=cv2.imread(sys.argv[2])
pts=sys.argv[3:]
for i in range(0,len(pts),3):
    n=pts[i]; x=int(pts[i+1]); y=int(pts[i+2]); r=4
    pa=np.median(a[y-r:y+r+1,x-r:x+r+1].reshape(-1,3),0); pb=np.median(b[y-r:y+r+1,x-r:x+r+1].reshape(-1,3),0)
    print(f"{n:10s} ({x},{y}) render #{int(pa[2]):02x}{int(pa[1]):02x}{int(pa[0]):02x}  source #{int(pb[2]):02x}{int(pb[1]):02x}{int(pb[0]):02x}  diff {(pb-pa)[::-1].astype(int)}")
