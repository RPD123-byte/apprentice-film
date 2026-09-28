import cv2, numpy as np, sys
# km.py x0 y0 x1 y1 k out.png
x0,y0,x1,y1,k=map(int,sys.argv[1:6]); out=sys.argv[6]
u=cv2.imread('ug-117.4.png')[y0:y1,x0:x1]
b=cv2.bilateralFilter(u,9,40,5)
lab=cv2.cvtColor(b,cv2.COLOR_BGR2LAB).reshape(-1,3).astype(np.float32)
crit=(cv2.TERM_CRITERIA_EPS+cv2.TERM_CRITERIA_MAX_ITER,50,0.5)
_,lbl,cen=cv2.kmeans(lab,k,None,crit,4,cv2.KMEANS_PP_CENTERS)
cen_bgr=cv2.cvtColor(cen.reshape(1,-1,3).astype(np.uint8),cv2.COLOR_LAB2BGR).reshape(-1,3)
L=lbl.reshape(b.shape[:2])
vis=cen_bgr[L]
for i,c in enumerate(cen_bgr): print(i,'#%02x%02x%02x'%(c[2],c[1],c[0]),(L==i).sum())
np.save(out.replace('.png','.npy'),L)
cv2.imwrite(out,cv2.resize(vis,None,fx=2,fy=2,interpolation=cv2.INTER_NEAREST))
