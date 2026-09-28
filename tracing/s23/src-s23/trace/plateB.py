import cv2, numpy as np
from ug import ungrade
def U(k): return ungrade(cv2.imread('src/%05d.png'%k), k/25)
def med(ks): return np.median(np.stack([U(k) for k in ks]),0).astype(np.float32)
top=med(range(2262,2301,2)); bot=med(range(2234,2240))
B=bot.copy(); B[:362]=top[:362]
for i,y in enumerate(range(356,368)):
    w=i/11; B[y]=top[y]*(1-w)+bot[y]*w
np.save('plateB.npy',B); cv2.imwrite('plateB.png',np.clip(B*255,0,255).astype(np.uint8))
cv2.imwrite('plateB_s.jpg', cv2.resize(cv2.imread('plateB.png'),None,fx=0.5,fy=0.5))
