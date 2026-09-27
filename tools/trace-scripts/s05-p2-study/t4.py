import numpy as np, cv2, sys
base=cv2.imread('t3_base.png',0).astype(np.float32)/255
H,W=base.shape
step=float(sys.argv[1])/255; eps=float(sys.argv[2]); bl=float(sys.argv[3])
levels=np.arange(step/2,1,step)
rec=np.zeros((H*2,W*2),np.float32); nv=0; nr=0
for k,L in enumerate(levels):
  m=(base>=L).astype(np.uint8)
  cs,h=cv2.findContours(m,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
  polys=[]
  for c in cs:
    if abs(cv2.contourArea(c))<8: continue
    a=cv2.approxPolyDP(c,eps,True)
    if len(a)<3: continue
    polys.append((a[:,0,:]*2+1).astype(np.int32)); nv+=len(a); nr+=1
  # even-odd fill of all rings
  mm=np.zeros((H*2,W*2),np.uint8)
  for p in polys:
    t=np.zeros_like(mm); cv2.fillPoly(t,[p],1); mm^=t
  rec[mm>0]=L+step/2
rec=cv2.resize(rec,(W,H),interpolation=cv2.INTER_AREA)
rec=cv2.GaussianBlur(rec,(0,0),bl)
print('levels',len(levels),'rings',nr,'verts',nv,'MAE',np.abs(rec-base).mean()*255, 'blur2', np.abs(cv2.GaussianBlur(rec-base,(0,0),2)).mean()*255)
cv2.imwrite('t4_rec.png',(rec*255).astype(np.uint8))
