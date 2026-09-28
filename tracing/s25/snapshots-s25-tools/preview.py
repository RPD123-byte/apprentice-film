# preview.py KEY [x0 y0 x1 y1 scale] -- quick python render of a pose json (parts flat-shaded, ink shapes) next to the source
import cv2,numpy as np,json,sys
key=sys.argv[1]
d=json.load(open(f'../s25-meas/pose-{key}.json'))
f=d['frame']
x0,y0,x1,y1,sc=[float(v) for v in sys.argv[2:7]] if len(sys.argv)>6 else (860,280,1260,600,2)
x0,y0,x1,y1=int(x0),int(y0),int(x1),int(y1)
W,H=int((x1-x0)*sc),int((y1-y0)*sc)
img=np.full((H,W),30,np.uint8)
def P(p): return (np.array(p)-[x0,y0])*sc*8
for part in d['parts']:
    t=part['tone']; v=int(255*(t['a'] if t else 0.9))
    cv2.fillPoly(img,[P(p).astype(np.int32) for p in part['polys']],v,cv2.LINE_AA,shift=3)
    cv2.polylines(img,[P(p).astype(np.int32) for p in part['polys']],True,40,max(1,int(2*sc)),cv2.LINE_AA,shift=3)
for s in d['ink']:
    cv2.fillPoly(img,[P(q).astype(np.int32) for q in s['p']],int(255*s['v']),cv2.LINE_AA,shift=3)
src=cv2.imread(f'../s25-src/f{f:05d}.png',0)[y0:y1,x0:x1]
src=cv2.resize(src,(W,H),interpolation=cv2.INTER_CUBIC)
cv2.imwrite(f'../s25-meas/prev-{key}.jpg',np.hstack([img,src]))
