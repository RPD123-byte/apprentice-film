import cv2,numpy as np,json,sys
sys.path.insert(0,'snapshots/s08-fix1-tools')
from gmodel import *
cls=np.load('snapshots/s08-fix1-tools/cls_clean.npy')
a=cv2.imread('snapshots/s08-rev1-src/f764.png').astype(float); b=cv2.imread('snapshots/s08-rev1-src/f765.png').astype(float)
src=(a+b)/2
raw=cv2.imread('snapshots/s08-fix1-h6raw/r765.png').astype(float)
yy,xx=np.mgrid[0:H,0:W]
f0s=Sinv(np.clip(src/255/(vign(xx,yy)[...,None]*flick(30.6)),0,1))
est=raw
for it in range(4):
  hb=halo_map(est)
  f=np.clip(1-(1-f0s)/(1-0.5*hb),0,1)
  est=f*255
m,add=light(xx,yy)
m2,dd=lightfix(xx,yy)
d=np.sqrt((xx-950)**2+(yy-480)**2); aa=np.clip(1-d/700,0,1)
addimg=np.stack([8/255*aa,10/255*aa,9/255*aa],-1)  # BGR
f0=np.clip((f*(1-dd[...,None])/m2[...,None]-addimg)/m[...,None],0,1)*255   # page-space colour
np.save('snapshots/s08-fix1-tools/f0target.npy',f0.astype(np.float32))
zones=json.loads(sys.argv[1])
out=[]
for z in zones:
  poly=np.array(z['poly'],np.int32)
  zm=np.zeros(cls.shape,np.uint8); cv2.fillPoly(zm,[poly],1)
  em=cv2.dilate(zm,np.ones((25,25),np.uint8))
  for c in z['classes']:
    mk=((cls==c)&(em==1)).astype(np.uint8)
    n,lab,stats,_=cv2.connectedComponentsWithStats(mk,8)
    for i in range(1,n):
      if stats[i,4]<z.get('minarea',60): continue
      comp=(lab==i).astype(np.uint8)
      sig=z.get('smooth',0)
      if sig>0: comp=(cv2.GaussianBlur(comp.astype(np.float32),(0,0),sig)>0.5).astype(np.uint8)
      # must touch the zone itself
      if (comp&zm).sum()<20: continue
      cs,_=cv2.findContours(comp,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
      cnt=max(cs,key=cv2.contourArea)
      bx=stats[i,:4]; sb=z.get('straight')
      straight=bool(sb and bx[0]>=sb[0] and bx[1]>=sb[1] and bx[0]+bx[2]<=sb[2] and bx[1]+bx[3]<=sb[3])
      ap=cv2.approxPolyDP(cnt,z.get('seps',3.5) if straight else z.get('eps',1.2),True)[:,0,:]
      er=cv2.erode(comp,np.ones((5,5),np.uint8))&zm
      if er.sum()<10: er=comp&zm
      col=np.median(f0[er==1],axis=0)[::-1]
      scol=np.median(src[er==1],axis=0)[::-1]
      out.append({'zone':z['name'],'cls':int(c),'area':int(stats[i,4]),'pts':ap.tolist(),'f0':[int(round(v)) for v in col],'src':[int(round(v)) for v in scol],'bbox':stats[i,:4].tolist(),'straight':straight})
json.dump(out,open('snapshots/s08-fix1-tools/orn.json','w'))
for o in out: print(o['zone'],o['cls'],o['area'],len(o['pts']),'bbox',o['bbox'],'f0',o['f0'],'src',o['src'])
