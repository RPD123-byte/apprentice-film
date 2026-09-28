import cv2, numpy as np, sys
img=cv2.imread(sys.argv[1]).astype(np.float32)/255.0
H,W=img.shape[:2]
x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; K=int(sys.argv[6])
yy,xx=np.mgrid[0:H,0:W]; qx=(xx/W-0.5)*2; qy=(yy/H-0.5)*2; r=np.clip((qx*qx+qy*qy)/2,0,1); v=1-0.38*r**1.15
lx=np.linspace(0,1,4096); ly=lx*0.65+0.35*(lx*lx*(3-2*lx))
pre=np.interp(np.clip(img/v[...,None],0,1),ly,lx)
pre=cv2.GaussianBlur(pre,(0,0),1.2)
c=pre[y0:y1,x0:x1].reshape(-1,3)[:,::-1].astype(np.float32)
crit=(cv2.TERM_CRITERIA_EPS+cv2.TERM_CRITERIA_MAX_ITER,50,0.001)
_,lab,cen=cv2.kmeans(c,K,None,crit,3,cv2.KMEANS_PP_CENTERS)
cnt=np.bincount(lab.ravel(),minlength=K)
for i in np.argsort(-cnt):
    print('#'+''.join('%02x'%int(t*255) for t in cen[i]), '%.1f%%'%(100*cnt[i]/len(lab)))
