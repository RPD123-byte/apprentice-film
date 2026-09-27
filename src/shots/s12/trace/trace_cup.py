#!/usr/bin/env python3
# trace lines inside a polygon region: mode dark (dark lines on light) or bright (light lines on dark)
# trace_cup.py src.png polyjson mode hi lo minlen sigma grow out.json
import cv2, numpy as np, json, sys
from skimage.morphology import skeletonize, remove_small_objects
from skimage.filters import apply_hysteresis_threshold
from skimage.feature import hessian_matrix, hessian_matrix_eigvals
from scipy.spatial import cKDTree
src,polyj,mode=sys.argv[1:4]; HI,LO,MINL,SIG=[float(v) for v in sys.argv[4:8]]; grow=int(sys.argv[8]); out=sys.argv[9]
g0=cv2.imread(src,0).astype(np.float32); H,W=g0.shape
if mode=='bright': gi=255-g0
else: gi=g0
m=np.zeros((H,W),np.uint8)
polys=json.loads(polyj)
for P in polys['in']: cv2.fillPoly(m,[np.array(P,np.int32)],1)
for P in polys.get('out',[]): cv2.fillPoly(m,[np.array(P,np.int32)],0)
for E in polys.get('outE',[]): cv2.ellipse(m,(int(E[0]),int(E[1])),(int(E[2]),int(E[3])),0,0,360,0,-1)
if grow<0: m=cv2.erode(m,np.ones((-2*grow+1,-2*grow+1),np.uint8))
Hm=hessian_matrix(gi, sigma=SIG, order='rc', use_gaussian_derivatives=True)
ev=hessian_matrix_eigvals(Hm); ridge=np.maximum(0,ev[0])*SIG*SIG; ridge[m==0]=0
mk=apply_hysteresis_threshold(ridge,LO,HI); mk=remove_small_objects(mk,max_size=12)
sk=skeletonize(mk).astype(np.uint8)
dt=cv2.distanceTransform(mk.astype(np.uint8),cv2.DIST_L2,3)
ys,xs=np.nonzero(sk); pts=set(zip(xs.tolist(),ys.tolist()))
nb=lambda p:[(p[0]+dx,p[1]+dy) for dx in (-1,0,1) for dy in (-1,0,1) if (dx or dy) and (p[0]+dx,p[1]+dy) in pts]
deg={p:len(nb(p)) for p in pts}; used=set(); paths=[]
def walkp(p0,p1):
  path=[p0,p1]; used.add((p0,p1)); used.add((p1,p0))
  while True:
    cur=path[-1]
    if deg[cur]!=2: break
    nx=[q for q in nb(cur) if q!=path[-2] and (cur,q) not in used]
    if not nx: break
    q=nx[0]; used.add((cur,q)); used.add((q,cur)); path.append(q)
  return path
for p in sorted(pts):
  if deg[p]!=2:
    for q in nb(p):
      if (p,q) not in used: paths.append(walkp(p,q))
for p in sorted(pts):
  for q in nb(p):
    if (p,q) not in used: paths.append(walkp(p,q))
paths=[np.array(P,float) for P in paths if len(P)>=3]
bg=cv2.dilate(gi,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(11,11))); bg=cv2.GaussianBlur(bg,(0,0),2)
D0=bg-gi
def rdp(P,eps):
  if len(P)<3: return list(P)
  a,b=P[0],P[-1]; ab=b-a; L=np.linalg.norm(ab)+1e-9
  dd=np.abs(ab[0]*(P[1:-1,1]-a[1])-ab[1]*(P[1:-1,0]-a[0]))/L
  i=int(np.argmax(dd))+1
  if dd[i-1]>eps: return rdp(P[:i+1],eps)[:-1]+rdp(P[i:],eps)
  return [a,b]
res=[]
for P in paths:
  L=np.sum(np.hypot(*np.diff(P,axis=0).T))
  if L<MINL: continue
  if len(P)>5:
    k=np.ones(5)/5; A=P.copy(); A[2:-2,0]=np.convolve(P[:,0],k,'valid'); A[2:-2,1]=np.convolve(P[:,1],k,'valid'); P=A
  S=np.array(rdp(P,0.6)); row=[]
  for k in range(len(S)):
    x,y=S[k]; t=S[min(len(S)-1,k+1)]-S[max(0,k-1)]; t=t/(np.linalg.norm(t)+1e-9); nr=np.array([-t[1],t[0]])
    prof=[]
    for o in np.arange(-5,5.01,0.5):
      xi,yi=int(round(x+nr[0]*o)),int(round(y+nr[1]*o)); prof.append(max(0.0,float(D0[yi,xi])) if 0<=xi<W and 0<=yi<H else 0.0)
    prof=np.array(prof); c=len(prof)//2; pk=prof[c-3:c+4].max()
    lo=c
    while lo>0 and prof[lo-1]>0.15*pk: lo-=1
    hi=c
    while hi<len(prof)-1 and prof[hi+1]>0.15*pk: hi+=1
    w=min(prof[lo:hi+1].sum()*0.5/max(pk,1), 2*float(dt[int(round(y)),int(round(x))])+1.5)
    bgv=float(bg[int(round(y)),int(round(x))]); v=(bgv-pk)/255
    if mode=='bright': v=1-v
    row.append([round(float(x),1),round(float(y),1),round(max(0.6,w),1),round(min(1,max(0,v)),2)])
  res.append(row)
json.dump(res,open(out,'w')); print(len(res),'strokes')
