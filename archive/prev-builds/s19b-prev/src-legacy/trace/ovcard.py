# overlay projected card features (card units) for one or more fitted tables onto source frames
import json,sys,numpy as np,cv2
from common import frame
CW,CH=465,648
C=np.float32([[0,0],[CW,0],[CW,CH],[0,CH]])
AREA=dict(x0=44.8,y0=153.8,x1=424.1,y1=601.2,btnY=538.8,divX=239.8)
feat=[[(0,0),(465,0),(465,648),(0,648),(0,0)],[(AREA['x0'],AREA['y0']),(AREA['x1'],AREA['y0']),(AREA['x1'],AREA['y1']),(AREA['x0'],AREA['y1']),(AREA['x0'],AREA['y0'])],[(85,215),(380,215)],[(AREA['x0'],AREA['btnY']),(AREA['x1'],AREA['btnY'])],[(AREA['divX'],AREA['btnY']),(AREA['divX'],AREA['y1'])]]
def dense(f,n=40):
  out=[]
  for a,b in zip(f[:-1],f[1:]):
    for k in range(n): out.append((a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n))
  out.append(f[-1]); return out
times=[float(t) for t in sys.argv[1].split(',')]; tabs=sys.argv[2:-1]; out=sys.argv[-1]
cols=[(0,0,255),(0,255,0),(255,128,0)]
T=[{round(r[0],2):r[1:] for r in json.load(open(p))} for p in tabs]
ims=[]
for t in times:
  s=frame(int(round(t*25)),gray=False)
  for k,tab in enumerate(T):
    if round(t,2) not in tab: continue
    H=cv2.getPerspectiveTransform(C,np.float32(tab[round(t,2)]).reshape(4,2))
    for f in feat:
      p=cv2.perspectiveTransform(np.float32(dense(f)).reshape(-1,1,2),H).reshape(-1,2)
      cv2.polylines(s,[np.round(np.clip(p,-5000,5000)).astype(np.int32)],False,cols[k],2)
  cv2.putText(s,f'{t:.2f}',(20,50),0,1.5,(0,255,255),3)
  ims.append(cv2.resize(s,None,fx=0.4,fy=0.4))
while len(ims)%2: ims.append(np.zeros_like(ims[0]))
cv2.imwrite(out,np.vstack([np.hstack(ims[i:i+2]) for i in range(0,len(ims),2)]))
