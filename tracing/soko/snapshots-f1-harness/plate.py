import numpy as np, cv2, sys
sys.path.insert(0,'.')
from common import *
A=[src(48.6+0.04*i) for i in range(46)]   # 48.6 .. 50.4
medA=np.median(np.stack(A),0)
B=[src(t) for t in (53.12,53.16,53.2)]
medB=np.median(np.stack(B),0)
P=medA.copy()
x0,x1,y0,y1=555,905,300,612
m=np.zeros(P.shape[:2],np.float32); m[y0:y1,x0:x1]=1; m=cv2.GaussianBlur(m,(0,0),3)[...,None]
P=P*(1-m)+medB*m
cv2.imwrite('../f1-p3/clean_g.png',np.clip(P,0,255).astype(np.uint8))
# ungrade: use each frame's t for flicker ~ average; flicker at 49.5 vs 53.2 differs slightly; use 50.0
U=ungrade(P,50.0)
cv2.imwrite('../f1-p3/clean_u.png',np.clip(U,0,255).astype(np.uint8))
print('ok')
