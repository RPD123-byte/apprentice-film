# blurred dE (sigma 8) per 150-px block for a render/source pair, printed as a grid (for finding the worst areas)
import cv2, numpy as np, sys, re, glob, os
from src import frame
f=sys.argv[1]; t=float(re.search(r'at-([\d.]+?)s?\.png',f).group(1))
R=cv2.imread(f); S=frame(t)
def lab(im): return cv2.cvtColor(cv2.GaussianBlur(im,(0,0),8).astype(np.float32)/255,cv2.COLOR_BGR2Lab)
d=np.linalg.norm(lab(R)-lab(S),axis=2)
# also signed L and b differences
dl=(lab(R)[...,0]-lab(S)[...,0])
print(f"t={t} mean dE8 {d.mean():.2f}  meanL diff {dl.mean():+.2f}")
bs=150
for y in range(0,946,bs):
    print(' '.join(f"{d[y:y+bs,x:x+bs].mean():5.1f}" for x in range(0,2206,bs)))
print('L diff')
for y in range(0,946,bs):
    print(' '.join(f"{dl[y:y+bs,x:x+bs].mean():+5.0f}" for x in range(0,2206,bs)))
