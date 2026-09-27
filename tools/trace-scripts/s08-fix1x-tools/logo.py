import cv2,numpy as np,sys
TH=70
rd=sys.argv[1]; k=int(sys.argv[2]) if len(sys.argv)>2 else 765
s=cv2.imread(f'snapshots/s08-f3-src/f{k}.png'); r=cv2.imread(f'{rd}/r{k}.png')
for name,im in [('src',s),('ren',r)]:
  im=im.astype(np.float32); g=im.mean(-1)
  x0,y0,x1,y1=150,8,520,200
  m=(g[y0:y1,x0:x1]>TH).astype(np.uint8)
  for lab,(a,b) in [('l1',(8,60)),('l2',(60,200))]:
    mm=m.copy(); mm[:a-y0]=0; mm[b-y0:]=0
    ys,xs=np.nonzero(mm)
    core=cv2.erode(mm,np.ones((5,5),np.uint8))
    col=im[y0:y1,x0:x1][core>0].mean(0)[::-1]
    dt=cv2.distanceTransform(mm,cv2.DIST_L2,5)
    print(name,lab,'lit',mm.sum(),'x',xs.min()+x0,xs.max()+x0,'y',ys.min()+y0,ys.max()+y0,'core RGB',np.round(col,1),'dt p90',np.percentile(dt[mm>0],90))
  # keyline: mean of pixels within 1-5 px outside the mask
  mk=(g[y0:y1,x0:x1]>60).astype(np.uint8)
  ring=cv2.dilate(mk,np.ones((7,7),np.uint8))-mk
  print(name,'ring mean',g[y0:y1,x0:x1][ring>0].mean(), 'ground',g[165:195,460:510].mean())
a=cv2.GaussianBlur(s.astype(np.float32),(0,0),3); b=cv2.GaussianBlur(r.astype(np.float32),(0,0),3)
d=np.abs(a-b).mean(-1)[0:200,150:500]
print('blurred MAE logo region',d.mean())
