import cv2, numpy as np
from ug import ungrade
def U(k): return ungrade(cv2.imread('src/%05d.png'%k), k/25)
B=np.load('plateB.npy')
top=np.median(np.stack([U(k) for k in range(2296,2315)]),0).astype(np.float32)
B2=B.copy(); B2[:370]=top[:370]
for i,y in enumerate(range(370,380)):
    w=i/9; B2[y]=top[y]*(1-w)+B[y]*w
np.save('plateB2.npy',B2)
