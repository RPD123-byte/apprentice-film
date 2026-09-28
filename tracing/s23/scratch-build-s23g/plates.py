# ungraded clean plates (per-pixel medians of source frames), saved as npy
import cv2, numpy as np
from ungrade import ungrade
def U(k): return ungrade(cv2.imread('src/%05d.png'%k), k/25)
def med(ks): return np.median(np.stack([U(k) for k in ks]),0).astype(np.float32)
H2=med(range(2156,2163))
M1=med(range(2103,2153,1))
H1=H2.copy()
# rim-1 drawing: take the 2103-2152 median in the rim bands
band=np.zeros(H2.shape[:2],bool); band[170:212,:]=True; band[335:380,:]=True; band[170:380,180:205]=True; band[170:380,1960:1995]=True
dif=(np.abs(H2-M1).max(-1)>0.03)
dif=cv2.dilate(dif.astype(np.uint8),np.ones((5,5),np.uint8))>0
sel=band&dif
H1[sel]=M1[sel]
np.save('plateH1.npy',H1); np.save('plateH2.npy',H2)
top=med(range(2262,2301,2)); bot=med(range(2218,2239,1))
B=bot.copy(); B[:362]=top[:362]
# blend 6 px
for i,y in enumerate(range(356,368)):
    w=i/11; B[y]=top[y]*(1-w)+bot[y]*w
np.save('plateB.npy',B)
for n,P in [('H1',H1),('H2',H2),('B',B)]: cv2.imwrite('plate%s.png'%n,np.clip(P*255,0,255).astype(np.uint8))
