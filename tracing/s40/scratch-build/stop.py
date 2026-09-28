import cv2, numpy as np, sys
from skimage.morphology import skeletonize
from skimage.measure import label
f=cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s40-fix1-ref/src-138.0.png').astype(np.float32)
b=cv2.GaussianBlur(f,(0,0),1.0)
B,G,R=b[...,0],b[...,1],b[...,2]
x0,y0,x1,y1=[int(v) for v in sys.argv[1:5]]
dark=((R<150)&(G<85))[y0:y1,x0:x1]
sk=skeletonize(dark)
k=np.ones((3,3),np.uint8); s8=sk.astype(np.uint8); nb=(cv2.filter2D(s8,-1,k)-1)*s8
seg=s8.copy(); seg[cv2.dilate((nb>2).astype(np.uint8),np.ones((3,3),np.uint8))>0]=0
lab=label(seg,connectivity=2)
for i in range(1,lab.max()+1):
    ys,xs=np.where(lab==i)
    if len(xs)<15: continue
    xs=xs+x0; ys=ys+y0
    A=np.c_[2*xs,2*ys,np.ones(len(xs))]; bb=xs**2+ys**2.
    c=np.linalg.lstsq(A,bb,rcond=None)[0]; cx,cy=c[0],c[1]; r=np.sqrt(max(c[2]+cx*cx+cy*cy,1))
    res=np.abs(np.hypot(xs-cx,ys-cy)-r).mean()
    print('n%4d x%4d-%4d y%4d-%4d  circle (%.1f,%.1f) r %.1f res %.2f'%(len(xs),xs.min(),xs.max(),ys.min(),ys.max(),cx,cy,r,res))
