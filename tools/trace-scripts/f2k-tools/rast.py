import json, numpy as np, cv2, sys
T=json.load(open(sys.argv[1])); out=sys.argv[2]
x0,y0,x1,y1=T['rect']; S=2
img=np.full(((y1-y0)*S,(x1-x0)*S,3),(47,35,35),np.uint8)
pal={p[0]:p for p in T['palette']}
from collections import defaultdict
by=defaultdict(list)
for r in T['polys']: by[(r['c'],r.get('s',0))].append(np.int32((np.array(r['p']).reshape(-1,2)-[x0,y0])*S))
for (c,sf),rings in sorted(by.items(),key=lambda kv:-kv[0][1]):
  h=pal[c][1]; col=(int(h[5:7],16),int(h[3:5],16),int(h[1:3],16))
  m=np.zeros(img.shape[:2],np.uint8)
  for rg in rings:
    t=np.zeros_like(m); cv2.fillPoly(t,[rg],1); m^=t
  img[m>0]=col
for l in T.get('lines',[]):
  pts=np.int32((np.array(l['p']).reshape(-1,2)-[x0,y0])*S)
  cv2.polylines(img,[pts],True,(25,21,30),max(1,int(round(l['w']*S))),cv2.LINE_AA)
cols={p[0]:p[1] for p in T['palette']}
for s_ in T.get('strokes',[]):
  h=cols[s_['c']]; col=(int(h[5:7],16),int(h[3:5],16),int(h[1:3],16))
  P=(np.array(s_['p']).reshape(-1,2)-[x0,y0])*S; Wd=s_['w']
  for i in range(len(P)-1):
    t=max(1,int(round((Wd[i]+Wd[i+1])/2*S)))
    cv2.line(img,tuple(np.int32(P[i]*4)),tuple(np.int32(P[i+1]*4)),col,t,cv2.LINE_AA,shift=2)
cv2.imwrite(out,img)
