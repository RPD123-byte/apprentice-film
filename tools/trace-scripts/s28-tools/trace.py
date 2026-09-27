#!/usr/bin/env python3
# Trace a flat-colour region of a SOURCE frame into a simplified polygon (measurement only; the polygon is data).
# Usage: trace.py T x y [tol=16] [eps=1.5] [close=3] [out.png]  -> prints JSON polygon, writes overlay crop.
import cv2,numpy as np,sys,json
sys.path.insert(0,'snapshots/s28-tools')
from grade import grab
def region(t,x,y,tol=16,close=3,blur=2,frame=None):
    f=grab(t) if frame is None else frame
    g=cv2.medianBlur(f,5)
    if blur: g=cv2.GaussianBlur(g,(0,0),blur)
    lab=cv2.cvtColor(g,cv2.COLOR_BGR2LAB).astype(np.float32)
    h,w=lab.shape[:2]
    mask=np.zeros((h+2,w+2),np.uint8)
    img=np.ascontiguousarray(g)
    cv2.floodFill(img,mask,(x,y),(0,0,0),(tol,tol,tol),(tol,tol,tol),cv2.FLOODFILL_MASK_ONLY|cv2.FLOODFILL_FIXED_RANGE|(255<<8)|8)
    m=mask[1:-1,1:-1]
    if close: m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(2*close+1,2*close+1)))
    return m,f
def poly(m,eps=1.5):
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    c=max(cs,key=cv2.contourArea)
    ap=cv2.approxPolyDP(c,eps,True).reshape(-1,2)
    return ap
if __name__=='__main__':
    a=sys.argv[1:]
    t=float(a[0]); x=int(a[1]); y=int(a[2])
    tol=float(a[3]) if len(a)>3 else 16; eps=float(a[4]) if len(a)>4 else 1.5; close=int(a[5]) if len(a)>5 else 3
    m,f=region(t,x,y,tol,close)
    p=poly(m,eps)
    print(json.dumps(p.tolist()).replace(' ',''))
    print('n',len(p),'area',int(m.sum()/255),'bbox',p[:,0].min(),p[:,1].min(),p[:,0].max(),p[:,1].max(),file=sys.stderr)
    if len(a)>6:
        o=f.copy(); cv2.polylines(o,[p.reshape(-1,1,2)],True,(0,0,255),2); cv2.circle(o,(x,y),5,(255,0,0),-1)
        x0,y0,x1,y1=max(0,p[:,0].min()-40),max(0,p[:,1].min()-40),p[:,0].max()+40,p[:,1].max()+40
        cv2.imwrite(a[6],o[y0:y1,x0:x1])
