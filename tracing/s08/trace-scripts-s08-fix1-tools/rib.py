# Trace the U ribbon and the pastel tail (first frame, F0 px) into polygons with a linear page-space colour fit.
import cv2,numpy as np,json,sys
sys.path.insert(0,'snapshots/s08-fix1-tools')
from gmodel import *
a=cv2.imread('snapshots/s08-rev1-src/f764.png').astype(float); b=cv2.imread('snapshots/s08-rev1-src/f765.png').astype(float)
src=(a+b)/2
sm=cv2.bilateralFilter(src.astype(np.uint8),9,40,5)
hsv=cv2.cvtColor(sm,cv2.COLOR_BGR2HSV).astype(float); Hh=hsv[...,0]*2; S=hsv[...,1]; V=hsv[...,2]
yy,xx=np.mgrid[0:H,0:W]
L=sm.astype(float).mean(-1)
cls=np.zeros((H,W),np.uint8)
cls[(V>60)&(S<40)&(L>95)]=6                                   # cream / white (tail cream band, stars, card)
cls[(V>45)&(S>=28)&(Hh>215)&(Hh<290)]=2                        # violet / lavender
cls[(V>50)&(S>=40)&((Hh>=290)|(Hh<9))]=3                       # pink
cls[(V>50)&(S>=50)&(Hh>=9)&(Hh<34)]=4                          # orange / peach
cls[(V>60)&(S>=50)&(Hh>=34)&(Hh<70)]=5                         # yellow
unk=np.zeros((H,W),np.uint8)
cv2.rectangle(unk,(1446,178),(1920,840),1,-1)                  # the card (+ its notch)
cv2.circle(unk,(1435,508),34,1,-1)                             # the card's notch
cv2.circle(unk,(1006,65),52,1,-1)                              # big star (redrawn in s08.js)
cv2.circle(unk,(860,212),32,1,-1)                              # violet star (redrawn)
cv2.rectangle(unk,(0,476),(W,500),1,-1)                        # red selection line (horizontal)
cv2.rectangle(unk,(1372,476),(1390,946),1,-1)                  # red selection line (vertical)
cv2.rectangle(unk,(0,0),(W,14),1,-1)                           # the black crop strip
# the pills
cv2.rectangle(unk,(1255,0),(1500,50),1,-1); cv2.rectangle(unk,(1535,0),(1850,50),1,-1)
known=(unk==0).astype(np.uint8)
d,lab=cv2.distanceTransformWithLabels(1-known,cv2.DIST_L2,5,labelType=cv2.DIST_LABEL_PIXEL)
ys,xs=np.nonzero(known); idx=np.zeros(int(known.sum())+1,np.int64); idx[1:]=ys*W+xs
fill=cls.reshape(-1)[idx[lab.reshape(-1)]].reshape(cls.shape)
cls=np.where(unk==1,fill,cls)
out=np.zeros_like(cls)
for c in [2,3,4,5,6]:
  m=(cls==c).astype(np.uint8)
  m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8)); m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
  out[m==1]=c
np.save('snapshots/s08-fix1-tools/cls_rib.npy',out)
f0=np.load('snapshots/s08-fix1-tools/f0target.npy').astype(float)   # page-space target (BGR)
zones=json.loads(sys.argv[1])
res=[]
for z in zones:
  zm=np.zeros((H,W),np.uint8); cv2.fillPoly(zm,[np.array(z['poly'],np.int32)],1)
  em=cv2.dilate(zm,np.ones((25,25),np.uint8))
  for c in z['classes']:
    mk=((out==c)&(em==1)).astype(np.uint8)
    n,lb,stats,_=cv2.connectedComponentsWithStats(mk,8)
    for i in range(1,n):
      if stats[i,4]<z.get('minarea',150): continue
      comp=(lb==i).astype(np.uint8)
      comp=(cv2.GaussianBlur(comp.astype(np.float32),(0,0),z.get('smooth',3.0))>0.5).astype(np.uint8)
      if (comp&zm).sum()<40: continue
      cs,_=cv2.findContours(comp,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
      cnt=max(cs,key=cv2.contourArea)
      sg=z.get('arcsmooth',0)
      if sg>0 and len(cnt)>8*sg:
        q=cnt[:,0,:].astype(np.float64); n_=len(q); k=int(3*sg); w_=np.exp(-0.5*(np.arange(-k,k+1)/sg)**2); w_/=w_.sum()
        qq=np.stack([np.convolve(np.concatenate([q[-k:,j],q[:,j],q[:k,j]]),w_,'valid') for j in range(2)],1)
        cnt=np.round(qq*4).astype(np.int32).reshape(-1,1,2)   # quarter-pixel precision
        ap=(cv2.approxPolyDP(cnt,z.get('eps',1.8)*4,True)[:,0,:]/4.0)
        ap=np.round(ap,1)
      else:
        ap=cv2.approxPolyDP(cnt,z.get('eps',1.8),True)[:,0,:]
      er=cv2.erode(comp,np.ones((7,7),np.uint8))&zm&(1-unk)
      if er.sum()<30: er=comp&zm&(1-unk)
      if er.sum()<30: er=comp&zm
      ys_,xs_=np.nonzero(er); C=f0[ys_,xs_][:,::-1]
      card=np.zeros((H,W),np.uint8); cv2.rectangle(card,(1446,178),(1920,840),1,-1)
      if (comp&card).sum()>0.7*comp.sum(): continue
      if (0.3*C[:,0]+0.59*C[:,1]+0.11*C[:,2]).mean()<70 and c!=2: continue
      # robust linear fit c = c0 + gx*x + gy*y (per channel), then gradient along the luminance gradient direction
      A=np.stack([np.ones_like(xs_),xs_,ys_],1).astype(float)
      coef=[]
      for k in range(3):
        cc=np.linalg.lstsq(A,C[:,k],rcond=None)[0]
        r=C[:,k]-A@cc; keep=np.abs(r)<2.5*np.std(r)+1
        cc=np.linalg.lstsq(A[keep],C[keep,k],rcond=None)[0]; coef.append(cc)
      coef=np.array(coef)
      gl=0.3*coef[0,1:]+0.59*coef[1,1:]+0.11*coef[2,1:]
      pts=ap.astype(float)
      if np.hypot(*gl)*max(pts[:,0].ptp(),pts[:,1].ptp())<6:   # less than ~6 levels across: flat
        col=np.median(C,0); grad=None
      else:
        u=gl/np.hypot(*gl); proj=xs_*u[0]+ys_*u[1]; p0,p1=np.percentile(proj,2),np.percentile(proj,98)
        cx,cy=xs_.mean(),ys_.mean(); base=cx*u[0]+cy*u[1]
        P0=(cx+(p0-base)*u[0],cy+(p0-base)*u[1]); P1=(cx+(p1-base)*u[0],cy+(p1-base)*u[1])
        c0=[coef[k,0]+coef[k,1]*P0[0]+coef[k,2]*P0[1] for k in range(3)]; c1=[coef[k,0]+coef[k,1]*P1[0]+coef[k,2]*P1[1] for k in range(3)]
        grad=[round(P0[0],1),round(P0[1],1),round(P1[0],1),round(P1[1],1),[int(np.clip(round(v),0,255)) for v in c0],[int(np.clip(round(v),0,255)) for v in c1]]
        col=np.median(C,0)
      res.append({'zone':z['name'],'cls':int(c),'area':int(stats[i,4]),'pts':ap.tolist(),'col':[int(round(v)) for v in col],'grad':grad,'bbox':stats[i,:4].tolist()})
      print(z['name'],c,stats[i,4],len(ap),stats[i,:4],'col',res[-1]['col'],'grad',grad)
json.dump(res,open('snapshots/s08-fix1-tools/rib.json','w'))
vis=src.astype(np.uint8).copy()
for r in res: cv2.polylines(vis,[np.array(r['pts'],np.int32)],True,(0,255,0),1)
cv2.imwrite('snapshots/s08-fix1-tools/ribover.png',vis[0:760,760:2206])
