import cv2,numpy as np,json,sys
sys.path.insert(0,'snapshots/s08-fix1-tools')
from gmodel import *
a=cv2.imread('snapshots/s08-rev1-src/f764.png').astype(float); b=cv2.imread('snapshots/s08-rev1-src/f765.png').astype(float)
src=(a+b)/2
sm=cv2.bilateralFilter(src.astype(np.uint8),9,40,5)
hsv=cv2.cvtColor(sm,cv2.COLOR_BGR2HSV).astype(float); Hh=hsv[...,0]*2; S=hsv[...,1]; V=hsv[...,2]
yy,xx=np.mgrid[0:H,0:W]
cls=np.zeros((H,W),np.uint8)
cls[(S<64)&(V>55)]=6
cls[(Hh>=8)&(Hh<26)&(S>100)&(V>55)]=4
cls[(Hh>=26)&(Hh<36)&(S>90)&(V>90)]=7   # peach
cls[(Hh>=36)&(Hh<65)&(S>120)&(V>60)]=5
cls[(Hh>=215)&(Hh<295)&(S>25)&(V>50)]=2
# the card (drawn on top every frame) -> unknown, filled from the nearest known label
card=np.zeros((H,W),np.uint8); cv2.rectangle(card,(1440,170),(1925,845),1,-1)
unk=card
known=(unk==0).astype(np.uint8)
d,lab=cv2.distanceTransformWithLabels(1-known,cv2.DIST_L2,5,labelType=cv2.DIST_LABEL_PIXEL)
ys,xs=np.nonzero(known); idx=np.zeros(int(known.sum())+1,np.int64); idx[1:]=ys*W+xs
fill=cls.reshape(-1)[idx[lab.reshape(-1)]].reshape(cls.shape)
cls=np.where(unk==1,fill,cls)
lobe=(xx<1718)&(yy>918)
cls[(cls==7)&~lobe]=4
out=np.zeros_like(cls)
for c in [2,4,5,6,7]:
  m=(cls==c).astype(np.uint8)
  m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8)); m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
  out[m==1]=c
np.save('snapshots/s08-fix1-tools/cls_cloud.npy',out)
# page-space target colours
raw=cv2.imread('snapshots/s08-fix1-h3raw/r765.png').astype(float) if len(sys.argv)<2 else cv2.imread(sys.argv[1]).astype(float)
f0s=Sinv(np.clip(src/255/(vign(xx,yy)[...,None]*flick(30.6)),0,1)); est=raw
for it in range(4):
  hb=halo_map(est); f=np.clip(1-(1-f0s)/(1-0.5*hb),0,1); est=f*255
m1,add=light(xx,yy); m2,dd=lightfix(xx,yy)
dd_=np.sqrt((xx-950)**2+(yy-480)**2); aa=np.clip(1-dd_/700,0,1)
addimg=np.stack([8/255*aa,10/255*aa,9/255*aa],-1)
f0=np.clip((f*(1-dd[...,None])/m2[...,None]-addimg)/m1[...,None],0,1)*255
zone=np.array([[1600,690],[2206,690],[2206,946],[1600,946]],np.int32)
zm=np.zeros((H,W),np.uint8); cv2.fillPoly(zm,[zone],1)
em=cv2.dilate(zm,np.ones((25,25),np.uint8))
res=[]
for c in [6,4,7,5,2]:
  mk=((out==c)&(em==1)).astype(np.uint8)
  n,lab,stats,_=cv2.connectedComponentsWithStats(mk,8)
  for i in range(1,n):
    if stats[i,4]<120: continue
    comp=(lab==i).astype(np.uint8)
    comp=(cv2.GaussianBlur(comp.astype(np.float32),(0,0),3.0)>0.5).astype(np.uint8)
    if (comp&zm).sum()<30: continue
    cs,_=cv2.findContours(comp,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    cnt=max(cs,key=cv2.contourArea)
    ap=cv2.approxPolyDP(cnt,1.8,True)[:,0,:]
    er=cv2.erode(comp,np.ones((5,5),np.uint8))&zm&(1-card)
    if er.sum()<10: er=comp&zm
    col=np.median(f0[er==1],axis=0)[::-1]; scol=np.median(src[er==1],axis=0)[::-1]
    res.append({'cls':int(c),'area':int(stats[i,4]),'pts':ap.tolist(),'f0':[int(round(v)) for v in col],'src':[int(round(v)) for v in scol],'bbox':stats[i,:4].tolist()})
    print(c,stats[i,4],len(ap),stats[i,:4],'f0',res[-1]['f0'],'src',res[-1]['src'])
json.dump(res,open('snapshots/s08-fix1-tools/cloud.json','w'))
cols=np.array([[25,35,25],[0,0,0],[200,80,90],[150,70,220],[50,100,240],[60,200,240],[235,235,235],[120,170,230]],np.uint8)
vis=src.astype(np.uint8).copy()
for r in res: cv2.polylines(vis,[np.array(r['pts'],np.int32)],True,(0,255,0),1)
cv2.imwrite('snapshots/s08-fix1-tools/cloudover.png',vis[640:946,1560:2206])
