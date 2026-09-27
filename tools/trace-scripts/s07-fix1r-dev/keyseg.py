import cv2,numpy as np
from skimage.segmentation import watershed
from skimage.feature import peak_local_max
T=np.load('../s07-p2-dev/w/T.npy').mean(2)*255
x0,y0,x1,y1=440,530,1070,810
g=cv2.GaussianBlur(T[y0:y1,x0:x1],(0,0),0.8)
poly=np.array([(458,692),(1010,545),(1060,600),(1060,700),(620,800)])-[x0,y0]
km=np.zeros(g.shape,np.uint8); cv2.fillPoly(km,[poly.astype(np.int32)],1)
# skin/hands: large bright blobs (open)
br=(cv2.GaussianBlur(g,(0,0),3)>120).astype(np.uint8)
dark=((g<95)&(km>0)).astype(np.uint8)
dist=cv2.distanceTransform(dark,cv2.DIST_L2,3)
pk=peak_local_max(dist,min_distance=6,threshold_abs=3.0,labels=dark)
mk=np.zeros(g.shape,np.int32)
for i,(y,x) in enumerate(pk): mk[y,x]=i+1
lab=watershed(-dist,mk,mask=dark)
out=[]
for i in range(1,lab.max()+1):
  m=(lab==i).astype(np.uint8); a=m.sum()
  if a<60: continue
  cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); c=max(cs,key=cv2.contourArea)
  rect=cv2.minAreaRect(c); box=cv2.boxPoints(rect)
  hull=cv2.convexHull(c); fill=a/max(1,cv2.contourArea(hull))
  bw,bh=rect[1]
  out.append((i,a,rect,box,fill,m[...,None]))
print('regions',len(out))
vis=cv2.cvtColor(np.clip(g,0,255).astype(np.uint8),cv2.COLOR_GRAY2BGR)
vis=cv2.resize(vis,None,fx=2,fy=2,interpolation=cv2.INTER_CUBIC)
rng=np.random.RandomState(1)
for (i,a,rect,box,fill,m) in out:
  col=tuple(int(v) for v in rng.randint(60,255,3))
  cv2.polylines(vis,[(box*2).astype(np.int32)],True,col,1)
cv2.imwrite('kseg.png',vis)
