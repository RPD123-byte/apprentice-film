import cv2, numpy as np, json, time, sys
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s07/trace')
from ridge import trace
from raster import *
from layer import zones_of
T=np.load('../w/T.npy'); g=(T.mean(axis=2)*255).astype(np.float32); H,W=g.shape
TD,TB,MED=float(sys.argv[1]),float(sys.argv[2]),float(sys.argv[3]); tag=sys.argv[4]
t0=time.time()
sf=gblur(cv2.medianBlur(np.clip(g,0,255).astype(np.uint8),11).astype(np.float32),2)
zones,ids=zones_of(sf,1000)
Z=zone_field(ids,zones,H,W); Zb=gblur(Z,3)
bd=trace(sf,Zb,'d',sig=4,hi=4,lo=2,minlen=12,eps=1.5,maxw=40,smooth=9); bb=trace(sf,Zb,'b',sig=4,hi=4,lo=2,minlen=12,eps=1.5,maxw=40,smooth=9)
R1=gblur(render_strokes_over(Z,bb+bd),3)
mae=lambda A,s=8: np.abs(gblur(A,s)-gblur(g,s)).mean()
print('R1 %.2f %.2f'%(mae(R1),mae(R1,2)))
sd=ink_shapes(g,TD,'d') if TD>0 else []; sb=ink_shapes(g,TB,'b') if TB<255 else []
R1b=render_shapes_over(R1,sd+sb)
print('shapes',len(sd),len(sb),sum(len(r) for s in sd+sb for r in s['rings']),'mae %.2f %.2f'%(mae(R1b),mae(R1b,2)))
if MED>0:
  MH=float(sys.argv[5]) if len(sys.argv)>5 else 5; md=trace(g,R1b,'d',sig=MED,hi=MH,lo=MH/2,minlen=8,eps=0.8,maxw=24); mb=trace(g,R1b,'b',sig=MED,hi=MH,lo=MH/2,minlen=8,eps=0.8,maxw=24)
  R1c=render_strokes_over(R1b,mb+md); print('med',len(md)+len(mb),'mae %.2f %.2f'%(mae(R1c),mae(R1c,2)))
else: R1c=R1b; md=mb=[]
dk=trace(g,R1c,'d',sig=1.2,hi=5,lo=2.5); bk=trace(g,R1c,'b',sig=1.2,hi=5,lo=2.5)
R2=render_strokes_over(R1c,bk+dk)
print(tag,'fine',len(dk)+len(bk),'mae8 %.2f mae4 %.2f mae2 %.2f mae0 %.2f'%(mae(R2),mae(R2,4),mae(R2,2),np.abs(R2-g).mean()),'%.0fs'%(time.time()-t0))
cv2.imwrite(tag+'.png',np.clip(R2,0,255).astype(np.uint8))
