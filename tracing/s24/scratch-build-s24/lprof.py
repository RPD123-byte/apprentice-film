import cv2,numpy as np,sys
from scipy.signal import find_peaks
from lstat import rotated
W=[];V=[];D=[];BG=[];RUN=[]
frames=range(int(sys.argv[1]),int(sys.argv[2]))
for n in frames:
  r,valid,M=rotated(n)
  big=cv2.blur((r>150).astype(np.float32),(3,31))>0.6
  ex=cv2.dilate(big.astype(np.uint8),np.ones((61,61),np.uint8))>0
  s=cv2.blur(r,(9,1))
  for x in range(200,1900,100):
    col=s[:,x]; ok=valid[:,x]&~ex[:,x]
    # take contiguous valid segment
    ys=np.nonzero(ok)[0]
    if len(ys)<200: continue
    y0,y1=ys.min(),ys.max()
    if (ok[y0:y1+1]==0).any():
      # use longest run
      seg=ok[y0:y1+1]; best=(0,0,0); st=None
      for i,v in enumerate(list(seg)+[False]):
        if v and st is None: st=i
        if not v and st is not None:
          if i-st>best[0]: best=(i-st,st,i)
          st=None
      y0,y1=y0+best[1],y0+best[2]-1
    c=col[y0:y1+1]
    if len(c)<150: continue
    bg=np.percentile(c,20); BG.append(bg)
    pk,pr=find_peaks(c,prominence=25,height=bg+30)
    D.append(len(pk)/len(c)*100)
    for p in pk:
      h=c[p]; half=(h+bg)/2
      l=p
      while l>0 and c[l]>half: l-=1
      rr=p
      while rr<len(c)-1 and c[rr]>half: rr+=1
      W.append(rr-l); V.append(h)
W=np.array(W);V=np.array(V)
print('peaks',len(W),'density per 100px',np.mean(D).round(2),'bg',np.median(BG))
print('width pct',np.percentile(W,[10,25,50,75,90,97]))
print('peak pct',np.percentile(V,[10,25,50,75,90,97]).round())
# joint: width vs value
for lo,hi in [(0,4),(4,7),(7,11),(11,30)]:
  m=(W>=lo)&(W<hi); print('w',lo,hi,'frac',m.mean().round(3),'val med',np.median(V[m]).round() if m.any() else None)
