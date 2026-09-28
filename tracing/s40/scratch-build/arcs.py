import cv2, numpy as np
from skimage.measure import label
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad'
sk=np.load(SP+'/cl_sk.npy').astype(np.uint8)
k=np.ones((3,3),np.uint8); nb=cv2.filter2D(sk,-1,k)-1
nb=nb*sk
br=(nb>2)
br=cv2.dilate(br.astype(np.uint8),np.ones((5,5),np.uint8))>0
seg=sk.copy(); seg[br]=0
lab=label(seg,connectivity=2)
def fit(xs,ys):
    A=np.c_[2*xs,2*ys,np.ones(len(xs))]; bb=xs**2+ys**2
    c=np.linalg.lstsq(A,bb,rcond=None)[0]; cx,cy=c[0],c[1]; r=np.sqrt(c[2]+cx*cx+cy*cy)
    res=np.abs(np.hypot(xs-cx,ys-cy)-r).mean()
    return cx,cy,r,res
arcs=[]
for i in range(1,lab.max()+1):
    ys,xs=np.where(lab==i)
    if len(xs)<30: continue
    cx,cy,r,res=fit(xs.astype(float),ys.astype(float))
    arcs.append((xs.min(),xs.max(),ys.min(),ys.max(),len(xs),cx,cy,r,res))
arcs.sort()
for a in arcs:
    x0,x1,y0,y1,n,cx,cy,r,res=a
    print('bbox x%4d-%4d y%4d-%4d n%4d  circle (%6.0f,%6.0f) r%6.1f res%.1f'%(x0,x1,y0,y1,n,cx,cy,r,res))
