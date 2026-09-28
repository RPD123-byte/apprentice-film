# Per-band colour along the ribbon (page space), from the refined bounds; emit the ribbon data module section.
import numpy as np,cv2,json
from scipy.ndimage import gaussian_filter1d
bounds=list(np.load('snapshots/s08-fix1-tools/rib_bounds.npy',allow_pickle=True))
f0=np.load('snapshots/s08-fix1-tools/f0target.npy').astype(float)
H,W=946,2206
a=cv2.imread('snapshots/s08-rev1-src/f764.png').astype(float); b=cv2.imread('snapshots/s08-rev1-src/f765.png').astype(float)
src=(a+b)/2; sm=cv2.bilateralFilter(src.astype(np.uint8),9,40,5)
hsv=cv2.cvtColor(sm,cv2.COLOR_BGR2HSV).astype(float); Hh=hsv[...,0]*2; S=hsv[...,1]; V=hsv[...,2]; L=sm.astype(float).mean(-1)
unk=np.zeros((H,W),np.uint8)
cv2.rectangle(unk,(1449,180),(1918,842),1,-1); cv2.circle(unk,(1437,508),30,1,-1)
cv2.rectangle(unk,(0,474),(W,502),1,-1); cv2.rectangle(unk,(1370,474),(1392,946),1,-1)
cv2.rectangle(unk,(0,0),(W,16),1,-1); cv2.rectangle(unk,(1250,0),(1505,54),1,-1); cv2.rectangle(unk,(1530,0),(1855,54),1,-1)
cv2.circle(unk,(1006,65),54,1,-1); cv2.circle(unk,(860,212),34,1,-1)
# not a keyline: bright enough and saturated or light (a band pixel)
bandpix=(L>60)
cls=np.zeros((H,W),np.uint8)
cls[(V>60)&(S<40)&(L>95)]=6
cls[(V>45)&(S>=28)&(Hh>215)&(Hh<290)]=2
cls[(V>80)&(S>=40)&((Hh>=290)|(Hh<9))]=3
cls[(V>60)&(S>=50)&(Hh>=9)&(Hh<34)]=4
cls[(V>60)&(S>=50)&(Hh>=34)&(Hh<70)]=5
xx=np.arange(W)[None,:].repeat(H,0)
expect=[np.full((H,W),3,np.uint8),np.full((H,W),2,np.uint8),np.full((H,W),4,np.uint8),np.where(xx>1500,6,5).astype(np.uint8)]
bands=[]
for i in range(4):
  B0,B1=bounds[i],bounds[i+1]
  poly=np.concatenate([B0,B1[::-1]])
  mk=np.zeros((H,W),np.uint8); cv2.fillPoly(mk,[np.round(poly*4).astype(np.int32)],1,shift=2)
  mk=cv2.erode(mk,np.ones((5,5),np.uint8))&(1-unk)&bandpix.astype(np.uint8)
  ok=(cls==expect[i]) | ((i==0)&(cls==6)&(xx>1500))     # the tail's pale pink reads as cream
  mk=mk&ok.astype(np.uint8)
  mk[184:846,1422:1449]=0      # the source's card shadow (the render draws its own)
  mk[150:184,1440:1935]=0
  cen=[]
  for p in B0:
    d=np.hypot(B1[:,0]-p[0],B1[:,1]-p[1]); j=d.argmin(); q=B1[j]
    cen.append(((p+q)/2,d[j]))
  cen=cen[::5]   # every ~20 px along the outer bound
  rows=[]
  for (m,w) in cen:
    r=max(4,0.45*w)
    x0,x1=int(max(0,m[0]-r)),int(min(W,m[0]+r+1)); y0,y1=int(max(0,m[1]-r)),int(min(H,m[1]+r+1))
    colr=[np.nan]*3
    if x1>x0 and y1>y0:
      sub=mk[y0:y1,x0:x1]
      if sub.sum()>15:
        colr=list(np.median(f0[y0:y1,x0:x1][sub==1],0)[::-1])
    rows.append([m[0],m[1],w]+colr)
  R=np.array(rows,float)
  from scipy.ndimage import median_filter
  for k in (3,4,5):
    v=R[:,k]; fin=np.isfinite(v); idx=np.arange(len(v))
    if fin.sum()>3:
      mv=median_filter(np.interp(idx,idx[fin],v[fin]),size=7,mode='nearest')
      R[fin&(np.abs(v-mv)>18),3:6]=np.nan
  for k in (3,4,5):
    v=R[:,k]; fin=np.isfinite(v); idx=np.arange(len(v))
    if fin.any(): v=np.interp(idx,idx[fin],v[fin])
    R[:,k]=gaussian_filter1d(v,1.5,mode='nearest')
  bands.append(R)
  print('band',i,'samples',len(R),'measured',np.isfinite(np.array(rows,float)[:,3]).sum())
  for r in R[::10]: print('   (%d,%d) w%.0f  %3d,%3d,%3d'%(r[0],r[1],r[2],r[3],r[4],r[5]))
np.save('snapshots/s08-fix1-tools/rib_bands.npy',np.array(bands,dtype=object),allow_pickle=True)
