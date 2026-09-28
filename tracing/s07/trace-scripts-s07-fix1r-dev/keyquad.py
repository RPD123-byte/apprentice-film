import sys; sys.path.insert(0,'.')
from pdata import *
import cv2,numpy as np
D=load('../../src/shots/s07/data/plate.js')
S=shapes(D['SHAPES'])
KEYS=np.array([[452,692],[962,543],[1050,640],[600,797]],np.float32)
def reduce_quad(h):
  h=[tuple(p) for p in h]
  while len(h)>4:
    best=None
    for i in range(len(h)):
      a,b,c=h[i-1],h[i],h[(i+1)%len(h)]
      ar=abs((b[0]-a[0])*(c[1]-a[1])-(c[0]-a[0])*(b[1]-a[1]))/2
      if best is None or ar<best[0]: best=(ar,i)
    h.pop(best[1])
  return np.array(h,np.float32)
T=np.clip(np.load('../s07-p2-dev/w/T.npy')*255,0,255).astype(np.uint8)
x0,y0,x1,y1=440,530,1070,810; s=3
vis=cv2.resize(T[y0:y1,x0:x1],None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC)
good=0; bad=0
for v,rings in S:
  c=rings[0].astype(np.float32)
  cx,cy=c.mean(0)
  if v>0.25 or cv2.pointPolygonTest(KEYS,(float(cx),float(cy)),False)<0: continue
  area=abs(cv2.contourArea(c))
  if area<40: continue
  h=cv2.convexHull(c)[:,0,:]
  q=reduce_quad(h); qa=abs(cv2.contourArea(q))
  r=area/max(qa,1)
  ok=r>0.82 and 60<area<1600
  col=(0,200,0) if ok else (0,0,255)
  if ok: good+=1
  else: bad+=1
  cv2.polylines(vis,[((q-[x0,y0])*s).astype(np.int32)],True,col,1)
print('good',good,'bad',bad)
cv2.imwrite('kquad.png',vis)
