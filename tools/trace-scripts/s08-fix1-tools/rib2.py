# Refine the page's five ribbon boundary lines (pureimg UB) onto the source's first frame (F0 px), and measure
# per-band page-space colour fields. Output: snapshots/s08-fix1-tools/rib2.json
import cv2,numpy as np,json,sys,re
sys.path.insert(0,'snapshots/s08-fix1-tools')
from gmodel import *
A_,B_,TX_,TY_=0.418768349,0.00105950832,670.585031,106.503905
def page2f0(p):
  det=A_*A_+B_*B_; ia=A_/det; ib=B_/det
  x=p[:,0]-TX_; y=p[:,1]-TY_
  return np.stack([ia*x+ib*y, -ib*x+ia*y],1)
def catmull(pts,per=10):
  pts=np.array(pts,float); n=len(pts); out=[]
  P=lambda i: pts[max(0,min(n-1,i))]
  for i in range(n-1):
    p0,p1,p2,p3=P(i-1),P(i),P(i+1),P(i+2)
    for j in range(per):
      t=j/per; t2=t*t; t3=t2*t
      out.append(0.5*(2*p1+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3))
  out.append(pts[-1]); return np.array(out)
src_js=open('src/lib/pureimg.js').read()
ub=src_js[src_js.index('const UB = ['):src_js.index('];',src_js.index('const UB = ['))]
lines=[l for l in ub.split('\n') if l.strip().startswith('[[')]
UB=[json.loads(l.strip().rstrip(',')) for l in lines]
assert len(UB)==5
curves=[page2f0(catmull(b,10)) for b in UB]
# resample each curve at ~4 px
def resample(c,step=4.0):
  d=np.r_[0,np.cumsum(np.hypot(*np.diff(c,axis=0).T))]; s=np.arange(0,d[-1],step)
  return np.stack([np.interp(s,d,c[:,0]),np.interp(s,d,c[:,1])],1)
curves=[resample(c) for c in curves]
# classes (raw, no fill) + unknown mask
a=cv2.imread('snapshots/s08-rev1-src/f764.png').astype(float); b=cv2.imread('snapshots/s08-rev1-src/f765.png').astype(float)
src=(a+b)/2; sm=cv2.bilateralFilter(src.astype(np.uint8),9,40,5)
hsv=cv2.cvtColor(sm,cv2.COLOR_BGR2HSV).astype(float); Hh=hsv[...,0]*2; S=hsv[...,1]; V=hsv[...,2]; L=sm.astype(float).mean(-1)
cls=np.zeros((H,W),np.uint8)
cls[(V>60)&(S<40)&(L>95)]=6
cls[(V>45)&(S>=28)&(Hh>215)&(Hh<290)]=2
cls[(V>80)&(S>=40)&((Hh>=290)|(Hh<9))&(L>70)]=3
cls[(V>60)&(S>=50)&(Hh>=9)&(Hh<34)&(L>75)]=4
cls[(V>60)&(S>=50)&(Hh>=34)&(Hh<70)&(L>100)]=5     # warm-dark keyline pixels are not yellow
col=np.zeros((H,W),bool); col[cls>0]=True
unk=np.zeros((H,W),np.uint8)
cv2.rectangle(unk,(1449,180),(1918,842),1,-1); cv2.circle(unk,(1437,508),30,1,-1)
cv2.rectangle(unk,(0,474),(W,502),1,-1); cv2.rectangle(unk,(1370,474),(1392,946),1,-1)
cv2.rectangle(unk,(0,0),(W,16),1,-1); cv2.rectangle(unk,(1250,0),(1505,54),1,-1); cv2.rectangle(unk,(1530,0),(1855,54),1,-1)
cv2.circle(unk,(1006,65),54,1,-1); cv2.circle(unk,(860,212),34,1,-1)
# which class pairs each boundary separates, by F0 x (U vs tail); 0 = ground
def pair(k,x):
  tail=x>1500
  inside=[3,2,4,6 if tail else 5]
  if k==0: return (0,inside[0])
  if k==4: return (inside[3],0)
  return (inside[k-1],inside[k])
def classof(v): return v
offs=[]
for k,c in enumerate(curves):
  t=np.gradient(c,axis=0); t/=np.linalg.norm(t,axis=1,keepdims=True)+1e-9
  nrm=np.stack([-t[:,1],t[:,0]],1)   # left normal
  o=np.full(len(c),np.nan)
  for i,(p,nv) in enumerate(zip(c,nrm)):
    if not (0<=p[0]<W and 0<=p[1]<H): continue
    ca,cb=pair(k,p[0])
    ss=np.arange(-28,28.5,0.5)
    q=p[None,:]+ss[:,None]*nv[None,:]
    qi=np.round(q).astype(int); ok=(qi[:,0]>=0)&(qi[:,0]<W)&(qi[:,1]>=0)&(qi[:,1]<H)
    if ok.sum()<len(ss)*0.8: continue
    qi=np.clip(qi,[0,0],[W-1,H-1])
    lab=cls[qi[:,1],qi[:,0]].copy()
    lab[unk[qi[:,1],qi[:,0]]==1]=99          # unknown: neither side (stops runs)
    if (lab==99).all(): continue
    # orientation: which side has class a? try both normal directions
    best=None
    for sgn in (1,-1):
      l=lab[::sgn] if sgn==1 else lab[::-1]
      s_=ss if sgn==1 else ss[::-1]
      # last index of class ca before first index of cb (scanning along s_)
      ia=[j for j in range(len(l)) if (l[j]==ca if ca else l[j]==0)]
      ib=[j for j in range(len(l)) if (l[j]==cb if cb else l[j]==0)]
      if not ia or not ib: continue
      # find a transition a..gap..b with gap<=16 samples (8 px)
      for j in range(len(l)-1):
        pass
      cand=[]
      for ja in ia:
        jb=next((j for j in ib if j>ja),None)
        if jb is None: continue
        if jb-ja<=20 and all(l[m] not in (ca,cb) or (ca==0 and l[m]==0) or (cb==0 and l[m]==0) for m in range(ja+1,jb)):
          # require a run of class a before and class b after (>= 3 px)
          ra=sum(1 for m in range(max(0,ja-6),ja+1) if l[m]==ca); rb=sum(1 for m in range(jb,min(len(l),jb+7)) if l[m]==cb)
          if ra>=5 and rb>=5: cand.append((ja,jb))
      for ja,jb in cand:
        if ca==0: mid=s_[jb]-sgn*2.5       # ground outside: keyline centre 2.5 px outside the colour
        elif cb==0: mid=s_[ja]+sgn*2.5
        else: mid=(s_[ja]+s_[jb])/2
        if best is None or abs(mid)<abs(best): best=mid
    if best is not None: o[i]=best
  offs.append(o)
  print('bound',k,'samples',len(c),'measured',np.isfinite(o).sum(),'median off %.1f'%np.nanmedian(o) if np.isfinite(o).any() else '')
json.dump({'curves':[c.tolist() for c in curves],'offs':[[None if not np.isfinite(v) else float(v) for v in o] for o in offs]},open('snapshots/s08-fix1-tools/rib2_raw.json','w'))
