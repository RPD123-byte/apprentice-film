# coarse colour-class map of a source frame (measurement aid): 0 other, 1 dark/ink, 2 skin, 3 green (jacket/beanie), 4 grey (headphones)
import cv2, numpy as np, sys
from src import frame
t=float(sys.argv[1]); out=sys.argv[2]
f=cv2.GaussianBlur(frame(t),(0,0),2.0)
lab=cv2.cvtColor(f.astype(np.float32)/255,cv2.COLOR_BGR2Lab); L,a,b=lab[...,0],lab[...,1],lab[...,2]
C=np.zeros(L.shape,np.uint8)
C[(a>9)&(L>45)&(b>8)]=2
C[(a<1)&(b>3)&(L>30)&(L<82)]=3
C[(L<45)&(np.hypot(a,b)<9)]=4
C[L<22]=1
np.save(out.replace('.png','.npy'),C)
col=np.array([[235,235,235],[20,20,20],[150,170,240],[120,190,120],[140,120,120]],np.uint8)
v=col[C]
for x in range(0,2206,50): v[:,x]=(0,0,255) if x%100==0 else (0,200,255)
for y in range(0,946,50): v[y,:]=(0,0,255) if y%100==0 else (0,200,255)
cv2.imwrite(out,v)
