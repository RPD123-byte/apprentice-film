# hole-page plates. The torn rim is redrawn twice: rim A until 85.56 (2139), rim B (about 1 px higher) from the
# 85.60 dissolve to 86.12 (2140-2153), rim C from 86.16 (2154). H2 = rim C (median 2156-2162); H1a / H1b = H2 with
# the rim bands replaced by medians of the frames showing rim A / rim B.
import cv2, numpy as np
from ug import ungrade
def U(k): return ungrade(cv2.imread('src/%05d.png'%k), k/25)
def med(ks): return np.median(np.stack([U(k) for k in ks]),0).astype(np.float32)
H2=med(range(2156,2163))
band=np.zeros(H2.shape[:2],bool); band[170:212,185:1995]=True; band[335:380,185:1995]=True; band[170:380,180:205]=True; band[170:380,1960:1995]=True
for name,ks in [('H1a',range(2103,2140)),('H1b',range(2150,2154))]:
    M=med(ks); P=H2.copy()
    dif=(np.abs(H2-M).max(-1)>0.03)
    dif=cv2.dilate(dif.astype(np.uint8),np.ones((5,5),np.uint8))>0
    sel=band&dif; P[sel]=M[sel]
    np.save('plate%s.npy'%name,P)
np.save('plateH2.npy',H2)
