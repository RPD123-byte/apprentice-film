import cv2, numpy as np, sys
from ungrade import ungrade
k=int(sys.argv[1]); P=np.load(sys.argv[2])
F=ungrade(cv2.imread('src/%05d.png'%k), k/25)
d=np.abs(F-P).max(-1)
d=cv2.GaussianBlur(d,(0,0),1.0)
for thr in [0.04,0.06,0.1]:
    m=(d>thr).astype(np.uint8)
    print(thr, m.sum())
m=(d>0.06).astype(np.uint8)*255
x0,y0,x1,y1=map(int,sys.argv[3:7])
Y=(cv2.cvtColor((F*255).astype(np.uint8),cv2.COLOR_BGR2GRAY))
vis=np.hstack([cv2.cvtColor(Y[y0:y1,x0:x1],cv2.COLOR_GRAY2BGR), cv2.cvtColor(m[y0:y1,x0:x1],cv2.COLOR_GRAY2BGR), cv2.applyColorMap(np.clip(d[y0:y1,x0:x1]*1000,0,255).astype(np.uint8),cv2.COLORMAP_JET)])
cv2.imwrite(sys.argv[7],vis)
print('Y stats in mask', np.percentile(Y[m>0],[5,25,50,75,95]))
