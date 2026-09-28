import cv2, numpy as np, json, time, sys
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s07/trace')
from ridge import trace
from raster import *
from layer import zones_of
T=np.load('../w/T.npy'); g=(T.mean(axis=2)*255).astype(np.float32); H,W=g.shape
TD,TB=float(sys.argv[1]),float(sys.argv[2]); tag=sys.argv[3]
t0=time.time()
sf=gblur(cv2.medianBlur(np.clip(g,0,255).astype(np.uint8),11).astype(np.float32),2)
zones,ids=zones_of(sf,1000); nz=len(zones)
shd=ink_shapes(g,TD,'d'); shb=ink_shapes(g,TB,'b')
Dm=shape_mask(shd,H,W)>0.5; Bm=shape_mask(shb,H,W)>0.5
out=~(Dm|Bm)
c0=fit_zone_coeffs(ids,nz,sf,out,fallback=[z['c'] for z in zones])
gt=gblur(g,1.0)
cd=fit_zone_coeffs(ids,nz,gt,Dm); cb=fit_zone_coeffs(ids,nz,gt,Bm)
def field(cs):
  zz=[dict(z,c=c) for z,c in zip(zones,cs)]; return zone_field(ids,zz,H,W)
Z0=field(c0); Zd=np.minimum(field(cd),TD+10); Zb_=np.maximum(field(cb),TB-10)
mae=lambda A,s=8: np.abs(gblur(A,s)-gblur(g,s)).mean()
Zb=gblur(Z0,3)
bd=trace(sf,Zb,'d',sig=4,hi=4,lo=2,minlen=12,eps=1.5,maxw=40,smooth=9); bb=trace(sf,Zb,'b',sig=4,hi=4,lo=2,minlen=12,eps=1.5,maxw=40,smooth=9)
R1=gblur(render_strokes_over(Z0,bb+bd),3)
print('R1 %.2f'%mae(R1))
md=shape_mask(shd,H,W,4); mb=shape_mask(shb,H,W,4)
R1b=R1*(1-md-mb)+Zd*md+Zb_*mb
print('shapes',len(shd)+len(shb),'R1b mae %.2f %.2f'%(mae(R1b),mae(R1b,2)))
dk=trace(g,R1b,'d',sig=1.2,hi=5,lo=2.5); bk=trace(g,R1b,'b',sig=1.2,hi=5,lo=2.5)
R2=render_strokes_over(R1b,bk+dk)
print(tag,'fine',len(dk)+len(bk),'mae8 %.2f mae4 %.2f mae2 %.2f mae0 %.2f'%(mae(R2),mae(R2,4),mae(R2,2),np.abs(R2-g).mean()),'%.0fs'%(time.time()-t0))
cv2.imwrite(tag+'.png',np.clip(R2,0,255).astype(np.uint8))
