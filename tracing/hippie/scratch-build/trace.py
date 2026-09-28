#!/usr/bin/env python3
# Trace the dark ink strokes inside the owl on a source frame into centre-line polylines with width + darkness.
# Output: JSON list of strokes [[x,y,w,v],...] (frame px; w = full width px; v = ink value 0..1) and a debug image.
import cv2, numpy as np, json, sys
from skimage.morphology import skeletonize
src=sys.argv[1]; out=sys.argv[2]; dbg=sys.argv[3]
g=cv2.imread(src,0).astype(np.float32)
H,W=g.shape
blur=cv2.GaussianBlur(g,(0,0),5)
owl=(blur>120).astype(np.uint8)
# keep the big component(s) only
n,lab,st,_=cv2.connectedComponentsWithStats(owl)
keep=np.zeros_like(owl)
for i in range(1,n):
  if st[i,4]>20000: keep[lab==i]=1
owl=cv2.erode(keep,np.ones((9,9),np.uint8))
bg=cv2.dilate(g,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(15,15)))
bg=cv2.GaussianBlur(bg,(0,0),3)
d=bg-g
stroke=((d>float(sys.argv[4]) if len(sys.argv)>4 else d>32)&(owl>0)).astype(np.uint8)
# exclusion mask (parts drawn separately)
ex=np.zeros((H,W),np.uint8)
def poly(pts,grow=0):
  m=np.zeros((H,W),np.uint8); cv2.fillPoly(m,[np.array(pts,np.int32)],1)
  if grow: m=cv2.dilate(m,np.ones((2*grow+1,2*grow+1),np.uint8))
  return m
G=json.load(open(sys.argv[5])) if len(sys.argv)>5 else None
if G:
  for e in (G['eyeR'],G['eyeL']):
    cx,cy,rx,ry=e['ring']; cv2.ellipse(ex,(int(cx),int(cy)),(int(rx+9),int(ry+9)),0,0,360,1,-1)
    ex|=poly(e['lid'],10)
  ex|=poly(G['beak']['out'],6)
  a,b,w=G['bandage']['long']; 
  dd=np.array(b)-np.array(a); dd=dd/np.linalg.norm(dd); nn=np.array([-dd[1],dd[0]])
  q=[np.array(a)-dd*6+nn*(w/2+6),np.array(b)+dd*6+nn*(w/2+6),np.array(b)+dd*6-nn*(w/2+6),np.array(a)-dd*6-nn*(w/2+6)]
  ex|=poly(q)
  ex|=poly(G['bandage']['pad'],7)
  hp=G['hp']
  for k in ('cup','arm','block','collar'): ex|=poly(hp[k],6)
  for k in ('top','low'): ex|=poly(G['farBand'][k],6)
  ex[0:70,780:1000]=1; ex[0:75,1270:1380]=1
  ex[850:946,1060:1200]=1; ex[890:946,1270:1450]=1   # feet
stroke[ex>0]=0
sk=skeletonize(stroke>0).astype(np.uint8)
dt=cv2.distanceTransform(stroke,cv2.DIST_L2,3)
# trace skeleton into paths
ys,xs=np.nonzero(sk); pts=set(zip(xs.tolist(),ys.tolist()))
nb=lambda p:[(p[0]+dx,p[1]+dy) for dx in (-1,0,1) for dy in (-1,0,1) if (dx or dy) and (p[0]+dx,p[1]+dy) in pts]
deg={p:len(nb(p)) for p in pts}
used=set(); paths=[]
def walk(p0,p1):
  path=[p0,p1]; used.add((p0,p1)); used.add((p1,p0))
  while True:
    cur=path[-1]
    if deg[cur]!=2: break
    nx=[q for q in nb(cur) if q!=path[-2] and (cur,q) not in used]
    if not nx: break
    q=nx[0]; used.add((cur,q)); used.add((q,cur)); path.append(q)
  return path
for p in pts:
  if deg[p]!=2:
    for q in nb(p):
      if (p,q) not in used: paths.append(walk(p,q))
# loops
for p in pts:
  for q in nb(p):
    if (p,q) not in used: paths.append(walk(p,q))
def rdp(P,eps):
  if len(P)<3: return P
  a,b=np.array(P[0],float),np.array(P[-1],float); ab=b-a; L=np.linalg.norm(ab)+1e-9
  dmax,idx=0,0
  for i in range(1,len(P)-1):
    dd=abs(np.cross(ab,np.array(P[i],float)-a))/L
    if dd>dmax: dmax,idx=dd,i
  if dmax>eps: return rdp(P[:idx+1],eps)[:-1]+rdp(P[idx:],eps)
  return [P[0],P[-1]]
res=[]
for P in paths:
  L=sum(np.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]) for i in range(1,len(P)))
  if L<float(sys.argv[6]) if len(sys.argv)>6 else L<10: continue
  # smooth path coords a bit
  A=np.array(P,float)
  if len(A)>5:
    k=np.ones(5)/5; A2=A.copy(); A2[2:-2,0]=np.convolve(A[:,0],k,'valid'); A2[2:-2,1]=np.convolve(A[:,1],k,'valid'); A=A2
  S=rdp([tuple(p) for p in A],0.8)
  row=[]
  for (x,y) in S:
    xi,yi=int(round(x)),int(round(y))
    w=2*float(dt[yi,xi]) if 0<=yi<H and 0<=xi<W else 1
    # darkness: min of g in 3x3
    v=float(g[max(0,yi-1):yi+2,max(0,xi-1):xi+2].min())/255
    row.append([round(x,1),round(y,1),round(max(1.0,w),1),round(v,2)])
  res.append(row)
json.dump(res,open(out,'w'))
im=cv2.cvtColor(g.astype(np.uint8),cv2.COLOR_GRAY2BGR)//2
for row in res:
  for i in range(1,len(row)):
    cv2.line(im,(int(row[i-1][0]),int(row[i-1][1])),(int(row[i][0]),int(row[i][1])),(0,0,255),1)
im[ex>0,1]=np.minimum(255,im[ex>0,1].astype(int)+60)
cv2.imwrite(dbg,im)
print(len(res),'strokes',sum(len(r) for r in res),'points')
