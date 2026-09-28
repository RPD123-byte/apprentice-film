#!/usr/bin/env python3
# sil.py map.npy x0 y0 x1 y1 lo hi [eps] [--min A] [--show out.jpg] : contours of lo<=v<hi inside the box (page coords),
# simplified (approxPolyDP eps px); prints each polygon (area desc) as a JS array.
import numpy as np, cv2, sys
a=[s for s in sys.argv[1:]]
show=None; mn=200
if '--show' in a: i=a.index('--show'); show=a[i+1]; a=a[:i]+a[i+2:]
if '--min' in a: i=a.index('--min'); mn=float(a[i+1]); a=a[:i]+a[i+2:]
v=np.load(a[0]); x0,y0,x1,y1=[int(t) for t in a[1:5]]; lo,hi=float(a[5]),float(a[6]); eps=float(a[7]) if len(a)>7 else 1.5
m=((v[y0:y1,x0:x1]>=lo)&(v[y0:y1,x0:x1]<hi)).astype(np.uint8)*255
m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8)); m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
cs=sorted(cs,key=cv2.contourArea,reverse=True)
for c in cs:
    A=cv2.contourArea(c)
    if A<mn: continue
    p=cv2.approxPolyDP(c,eps,True)[:,0,:]
    print('// area %d, %d pts'%(A,len(p)))
    print('['+', '.join('[%d, %d]'%(x+x0,y+y0) for x,y in p)+']')
if show:
    im=cv2.cvtColor((np.clip(v[y0:y1,x0:x1],0,1)*255).astype(np.uint8),cv2.COLOR_GRAY2BGR)
    for c in cs:
        if cv2.contourArea(c)<mn: continue
        p=cv2.approxPolyDP(c,eps,True); cv2.polylines(im,[p],True,(0,0,255),1)
    im=cv2.resize(im,None,fx=4,fy=4,interpolation=cv2.INTER_NEAREST); cv2.imwrite(show,im)
