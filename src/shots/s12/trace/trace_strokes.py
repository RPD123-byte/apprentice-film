#!/usr/bin/env python3
# trace2.py src.png geo.json out.json dbg.png [high low minlen]
import cv2, numpy as np, json, sys, os
from skimage.morphology import skeletonize, remove_small_objects
from skimage.filters import apply_hysteresis_threshold
src,geo,out,dbg=sys.argv[1:5]
HI=float(sys.argv[5]) if len(sys.argv)>5 else 26; LO=float(sys.argv[6]) if len(sys.argv)>6 else 12; MINL=float(sys.argv[7]) if len(sys.argv)>7 else 14
g0=cv2.imread(src,0).astype(np.float32); H,W=g0.shape
g=cv2.GaussianBlur(g0,(0,0),1.2)
blur=cv2.GaussianBlur(g0,(0,0),5)
owl=(blur>120).astype(np.uint8)
n,lab,st,_=cv2.connectedComponentsWithStats(owl)
keep=np.zeros_like(owl)
for i in range(1,n):
  if st[i,4]>20000: keep[lab==i]=1
owl=cv2.erode(keep,np.ones((7,7),np.uint8))
bg=cv2.dilate(g,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(13,13))); bg=cv2.GaussianBlur(bg,(0,0),3)
d=(bg-g)*(owl>0)
G=json.load(open(geo))
ex=np.zeros((H,W),np.uint8)
def poly(pts,grow=0):
  m=np.zeros((H,W),np.uint8); cv2.fillPoly(m,[np.array(pts,np.int32)],1)
  if grow: m=cv2.dilate(m,np.ones((2*grow+1,2*grow+1),np.uint8))
  return m
for e in (G['eyeR'],G['eyeL']):
  cx,cy,rx,ry=e['ring']; cv2.ellipse(ex,(int(cx),int(cy)),(int(rx+8),int(ry+8)),0,0,360,1,-1); ex|=poly(e['lid'],9)
ex|=poly(G['beak']['out'],5)
a,b,w=G['bandage']['long']; dd=np.array(b)-np.array(a); dd=dd/np.linalg.norm(dd); nn=np.array([-dd[1],dd[0]])
ex|=poly([np.array(a)-dd*6+nn*(w/2+6),np.array(b)+dd*6+nn*(w/2+6),np.array(b)+dd*6-nn*(w/2+6),np.array(a)-dd*6-nn*(w/2+6)])
ex|=poly(G['bandage']['pad'],7)
for k in ('cup','arm','block','collar'): ex|=poly(G['hp'][k],6)
for k in ('top','low'): ex|=poly(G['farBand'][k],6)
ex[0:70,780:1000]=1; ex[0:75,1270:1380]=1; ex[850:946,1060:1200]=1; ex[890:946,1270:1450]=1
d[ex>0]=0
from skimage.feature import hessian_matrix, hessian_matrix_eigvals
SIG=float(sys.argv[8]) if len(sys.argv)>8 else 1.3
ridge=None
for sg in [SIG]+[float(v) for v in os.environ.get('SIGS','2.4').split(',') if v]:
  Hm=hessian_matrix(g0, sigma=sg, order='rc', use_gaussian_derivatives=True)
  ev=hessian_matrix_eigvals(Hm)
  rr=np.maximum(0,ev[0])*sg*sg
  ridge=rr if ridge is None else np.maximum(ridge,rr)
ridge[(d<8)]=0; ridge[ex>0]=0; ridge[owl==0]=0
np.save(dbg+'.ridge.npy',ridge)
m=apply_hysteresis_threshold(ridge,LO,HI)

m=remove_small_objects(m,20)
sk=skeletonize(m).astype(np.uint8)
dt=cv2.distanceTransform(m.astype(np.uint8),cv2.DIST_L2,3)
ys,xs=np.nonzero(sk); pts=set(zip(xs.tolist(),ys.tolist()))
nb=lambda p:[(p[0]+dx,p[1]+dy) for dx in (-1,0,1) for dy in (-1,0,1) if (dx or dy) and (p[0]+dx,p[1]+dy) in pts]
deg={p:len(nb(p)) for p in pts}
used=set(); paths=[]
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
# merge paths: link ends that are close and aligned (KD-tree candidates, greedy by score, then chain)
from scipy.spatial import cKDTree
def endinfo(P,which):
  if which==0: p=P[0]; q=P[min(len(P)-1,5)]
  else: p=P[-1]; q=P[max(0,len(P)-6)]
  t=p-q; return p, t/(np.linalg.norm(t)+1e-9)
E=[]
for i,P in enumerate(paths):
  for wh in (0,1): p,t=endinfo(P,wh); E.append((i,wh,p,t))
tree=cKDTree(np.array([e[2] for e in E]))
cand=[]
for a,b in tree.query_pairs(9.0):
  i,wi,pi,ti=E[a]; j,wj,pj,tj=E[b]
  if i==j: continue
  dv=pj-pi; dist=np.linalg.norm(dv)
  if np.dot(ti,-tj)<0.75: continue
  if dist>1.5:
    u=dv/dist
    if np.dot(ti,u)+(-np.dot(tj,u))<1.3: continue
  cand.append((dist-3*np.dot(ti,-tj),a,b))
cand.sort()
link={}
for sc,a,b in cand:
  if a in link or b in link: continue
  link[a]=b; link[b]=a
# chains: start from ends without link (or any unvisited for loops)
seen=set(); chains=[]
for start in range(len(E)):
  i,wh=E[start][0],E[start][1]
  if i in seen or start in link: continue
  cur_e=start; parts=[]
  while True:
    i,wh=E[cur_e][0],E[cur_e][1]
    if i in seen: break
    seen.add(i)
    P=paths[i] if wh==0 else paths[i][::-1]
    parts.append(P)
    other=2*i+(1-wh)
    if other in link: cur_e=link[other]
    else: break
  chains.append(np.vstack(parts))
for i,P in enumerate(paths):
  if i not in seen: chains.append(P)
paths=chains
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
  if len(P)>7:
    k=np.ones(7)/7; A=P.copy(); A[3:-3,0]=np.convolve(P[:,0],k,'valid'); A[3:-3,1]=np.convolve(P[:,1],k,'valid'); P=A
  S=rdp(P,0.7)
  S=np.array(S)
  row=[]
  D0=(bg-g0)
  for k in range(len(S)):
    x,y=S[k]
    t=S[min(len(S)-1,k+1)]-S[max(0,k-1)]; t=t/(np.linalg.norm(t)+1e-9); nrm=np.array([-t[1],t[0]])
    prof=[]
    for o in np.arange(-6,6.01,0.5):
      px,py=x+nrm[0]*o,y+nrm[1]*o
      xi,yi=int(round(px)),int(round(py))
      prof.append(max(0.0,float(D0[yi,xi])) if 0<=xi<W and 0<=yi<H else 0.0)
    prof=np.array(prof); c=len(prof)//2
    pk=prof[c-3:c+4].max()
    # contiguous run around the centre above 15% of the peak
    lo=c; 
    while lo>0 and prof[lo-1]>0.15*pk: lo-=1
    hi=c
    while hi<len(prof)-1 and prof[hi+1]>0.15*pk: hi+=1
    I=prof[lo:hi+1].sum()*0.5
    w=min(I/max(pk,1), 2*float(dt[int(round(y)),int(round(x))])+1.5)
    bgv=float(bg[int(round(y)),int(round(x))])
    v=(bgv-pk)/255
    row.append([round(float(x),1),round(float(y),1),round(max(0.6,w),1),round(max(0,v),2)])
  res.append(row)
json.dump(res,open(out,'w'))
im=cv2.cvtColor(g0.astype(np.uint8),cv2.COLOR_GRAY2BGR)//3
for row in res:
  for i in range(1,len(row)): cv2.line(im,(int(row[i-1][0]),int(row[i-1][1])),(int(row[i][0]),int(row[i][1])),(0,0,255),1)
cv2.imwrite(dbg,im)
print(len(res),'strokes',sum(len(r) for r in res),'points')
