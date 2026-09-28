# Measurement aid: the lid (back / edge-on) as a quadrilateral, from the dark low-saturation region right of the owl
# in the end orbit; fits a 4-gon to the convex hull (min-area style via approxPolyDP with growing epsilon).
import cv2, numpy as np, sys, json
from src import frame
out={}
for a in sys.argv[1:]:
    t=float(a); f=frame(t); hsv=cv2.cvtColor(f,cv2.COLOR_BGR2HSV)
    m=((hsv[...,2]<150)&(hsv[...,1]<90)).astype(np.uint8)*255
    roi=np.zeros_like(m); cv2.fillPoly(roi,[np.int32([(1180,180),(2000,180),(2000,946),(1180,946)])],255); m&=roi
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((5,5),np.uint8)); m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((15,15),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(m)
    k=1+np.argmax(st[1:,4]); comp=(lab==k).astype(np.uint8)
    cs,_=cv2.findContours(comp,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); c=max(cs,key=cv2.contourArea)
    hull=cv2.convexHull(c)
    eps=2; q=cv2.approxPolyDP(hull,eps,True)
    while len(q)>4 and eps<200: eps+=2; q=cv2.approxPolyDP(hull,eps,True)
    q=q.reshape(-1,2)
    out[t]=q.tolist()
    ov=f.copy(); cv2.polylines(ov,[q.astype(np.int32)],True,(0,255,0),2); cv2.drawContours(ov,[hull],-1,(255,0,255),1)
    cv2.imwrite(f'../s27d-study/lq_{t:.2f}.jpg',cv2.resize(ov[150:946,1100:2100],None,fx=0.7,fy=0.7))
    print(t,'area',st[k,4],'quad',q.tolist())
json.dump(out,open('../s27d-meas/lidquad.json','w'))
