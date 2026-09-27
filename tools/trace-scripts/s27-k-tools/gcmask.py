# gcmask.py T out.png json_polys [scale]: object mask on a source frame from rough hand polygons refined by GrabCut
# (measurement only). Output: magenta = room, black = objects (same convention as the layer mask renders).
import cv2, sys, json, numpy as np
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s27-meas')
from common import load
t=float(sys.argv[1]); out=sys.argv[2]; P=json.load(open(sys.argv[3])); sc=float(sys.argv[4]) if len(sys.argv)>4 else 1.0
f=load(t); H,W=f.shape[:2]
f=cv2.bilateralFilter(f,7,30,5)
m=np.full((H,W),cv2.GC_BGD,np.uint8)
inside=np.zeros((H,W),np.uint8); rigid=np.zeros((H,W),np.uint8)
for name,pts in P.items():
    p=np.int32(np.array(pts,float).reshape(-1,2)*sc)
    if name.startswith('gc_'): cv2.fillPoly(inside,[p],1)
    else: cv2.fillPoly(rigid,[p],1)
near=cv2.dilate(inside,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(61,61)))
core=cv2.erode(inside,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(31,31)))
m[near>0]=cv2.GC_PR_BGD; m[inside>0]=cv2.GC_PR_FGD; m[core>0]=cv2.GC_FGD; m[rigid>0]=cv2.GC_BGD
bg=np.zeros((1,65),np.float64); fg=np.zeros((1,65),np.float64)
cv2.grabCut(f,m,None,bg,fg,6,cv2.GC_INIT_WITH_MASK)
obj=((m==cv2.GC_FGD)|(m==cv2.GC_PR_FGD)).astype(np.uint8)
obj=cv2.morphologyEx(obj,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
n,cc,st,_=cv2.connectedComponentsWithStats(obj)
keep=np.zeros_like(obj)
for i in range(1,n):
    if st[i,4]>400: keep[cc==i]=1
# fill holes
cnts,_=cv2.findContours(keep,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); keep2=np.zeros_like(keep); cv2.drawContours(keep2,cnts,-1,1,-1)
keep2|=rigid
o=np.full((H,W,3),(255,0,255),np.uint8); o[keep2>0]=0; cv2.imwrite(out,o)
ov=load(t).copy(); ov[keep2>0]=(ov[keep2>0]*0.4+np.array([0,0,255])*0.6).astype(np.uint8)
cv2.imwrite(out.replace('.png','_ov.jpg'),cv2.resize(ov,None,fx=0.5,fy=0.5))
