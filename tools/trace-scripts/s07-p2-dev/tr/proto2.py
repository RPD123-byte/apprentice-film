import cv2, numpy as np, json, time, sys
sys.path.insert(0,'.')
from ridge import trace
from skimage.segmentation import slic
T = np.load('../T.npy'); g = (T.mean(axis=2)*255).astype(np.float32); H,W=g.shape
NZ=int(sys.argv[1]) if len(sys.argv)>1 else 600
t0=time.time()
sf = cv2.medianBlur(np.clip(g,0,255).astype(np.uint8), 11).astype(np.float32)   # stroke-free
sf = cv2.GaussianBlur(sf,(0,0),2)
lab=slic(np.dstack([sf/255]*3), n_segments=NZ, compactness=10, sigma=0, start_label=0, channel_axis=-1)
yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
Z=np.zeros_like(g); n=lab.max()+1
order=np.argsort(lab.ravel(),kind='stable'); ls=lab.ravel()[order]; bnd=np.searchsorted(ls,np.arange(n+1))
X=xx.ravel();Y=yy.ravel();B=sf.ravel();O=Z.ravel()
for i in range(n):
  ii=order[bnd[i]:bnd[i+1]]
  x=X[ii]-X[ii].mean(); y=Y[ii]-Y[ii].mean(); A=np.stack([np.ones_like(x),x,y],1)
  c,*_=np.linalg.lstsq(A,B[ii],rcond=None); O[ii]=A@c
Zb=cv2.GaussianBlur(Z,(0,0),2.0)
def rs(base, strokes, S=4, soft=0):
  c = cv2.resize(base, (W*S, H*S), interpolation=cv2.INTER_LINEAR) if soft==0 else np.zeros((H*S,W*S),np.float32)
  cnt = None
  for key in ('b','d'):
    for s in strokes.get(key,[]):
      for i in range(len(s)-1):
        x0,y0,w0,v0 = s[i]; x1,y1,w1,v1 = s[i+1]
        w = max(1, int(round((w0+w1)/2*S))); v = (v0+v1)/2*255
        cv2.line(c, (int(x0*S), int(y0*S)), (int(x1*S), int(y1*S)), float(v), w, cv2.LINE_8)
  return cv2.resize(c, (W, H), interpolation=cv2.INTER_AREA)
def mae(A,s=8): return np.abs(cv2.GaussianBlur(A,(0,0),s)-cv2.GaussianBlur(g,(0,0),s)).mean()
print('zones',n,'mae8 %.2f mae2 %.2f'%(mae(Zb),mae(Zb,2)))
# broad strokes: ridges at sigma 4 of the stroke-free image against the zone base
bd = trace(sf, Zb, 'd', sig=4, hi=4, lo=2, minlen=12, eps=1.5, maxw=40, smooth=9)
bb = trace(sf, Zb, 'b', sig=4, hi=4, lo=2, minlen=12, eps=1.5, maxw=40, smooth=9)
# render broad strokes as soft (blur) deltas: draw on the base, then blur the difference
R1 = rs(Zb,{'d':bd,'b':bb})
R1 = Zb + cv2.GaussianBlur(R1-Zb,(0,0),3)
print('broad', len(bd), len(bb), sum(len(s) for s in bd+bb),'mae8 %.2f mae2 %.2f'%(mae(R1),mae(R1,2)))
dk = trace(g, R1, 'd', sig=1.2, hi=5, lo=2.5)
bk = trace(g, R1, 'b', sig=1.2, hi=5, lo=2.5)
R2 = rs(R1,{'d':dk,'b':bk})
print('fine', len(dk), len(bk), sum(len(s) for s in dk+bk),'mae8 %.2f mae2 %.2f mae0 %.2f'%(mae(R2),mae(R2,2),np.abs(R2-g).mean()), '%.0fs'%(time.time()-t0))
cv2.imwrite('p2_zones.png',np.clip(Zb,0,255).astype(np.uint8)); cv2.imwrite('p2_broad.png',np.clip(R1,0,255).astype(np.uint8)); cv2.imwrite('p2_full.png',np.clip(R2,0,255).astype(np.uint8))
