import cv2, numpy as np, json, time, sys
sys.path.insert(0,'.')
from ridge import trace
from skimage.segmentation import slic
T = np.load('../T.npy'); g = (T.mean(axis=2)*255).astype(np.float32); H,W=g.shape
NZ=int(sys.argv[1]); DEG=int(sys.argv[2]); HI=float(sys.argv[3]); LO=float(sys.argv[4]); ZB=float(sys.argv[5])
t0=time.time()
k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9))
light_env = cv2.GaussianBlur(cv2.morphologyEx(g, cv2.MORPH_CLOSE, k),(0,0),1.5)   # dark thin lines removed
dark_env  = cv2.GaussianBlur(cv2.morphologyEx(g, cv2.MORPH_OPEN, k),(0,0),1.5)    # bright thin lines removed
dk = trace(g, light_env, 'd', sig=1.2, hi=HI, lo=LO)
bk = trace(g, dark_env, 'b', sig=1.2, hi=HI, lo=LO)
S=4
def rs(strokes):
  c = np.zeros((H*S,W*S),np.float32); m = np.zeros((H*S,W*S),np.uint8)
  for key in ('b','d'):
    for s in strokes[key]:
      for i in range(len(s)-1):
        x0,y0,w0,v0 = s[i]; x1,y1,w1,v1 = s[i+1]
        w = max(1, int(round((w0+w1)/2*S))); v = (v0+v1)/2*255
        p0=(int(x0*S), int(y0*S)); p1=(int(x1*S), int(y1*S))
        cv2.line(c, p0, p1, float(v), w, cv2.LINE_8); cv2.line(m, p0, p1, 1, w, cv2.LINE_8)
  cov = cv2.resize(m.astype(np.float32),(W,H),interpolation=cv2.INTER_AREA)
  col = cv2.resize(c,(W,H),interpolation=cv2.INTER_AREA)
  return col, cov
col, cov = rs({'d':dk,'b':bk})
print('strokes', len(dk), len(bk), sum(len(s) for s in dk+bk), '%.0fs'%(time.time()-t0))
free = cov < 0.05
sf = cv2.medianBlur(np.clip(g,0,255).astype(np.uint8), 11).astype(np.float32)
lab=slic(np.dstack([cv2.GaussianBlur(sf,(0,0),2)/255]*3), n_segments=NZ, compactness=10, sigma=0, start_label=0, channel_axis=-1)
yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
Z=np.zeros_like(g); n=lab.max()+1
order=np.argsort(lab.ravel(),kind='stable'); ls=lab.ravel()[order]; bnd=np.searchsorted(ls,np.arange(n+1))
X=xx.ravel();Y=yy.ravel();G=g.ravel();F=free.ravel();O=Z.ravel()
def basis(x,y,deg):
  c=[np.ones_like(x)]
  if deg>=1: c+=[x,y]
  if deg>=2: c+=[x*x,x*y,y*y]
  return np.stack(c,1)
for i in range(n):
  ii=order[bnd[i]:bnd[i+1]]; ff=ii[F[ii]]
  if len(ff)<30: ff=ii
  mx,my=X[ii].mean(),Y[ii].mean()
  d=DEG if len(ff)>300 else (1 if len(ff)>40 else 0)
  A=basis((X[ff]-mx)/100,(Y[ff]-my)/100,d); c,*_=np.linalg.lstsq(A,G[ff],rcond=None)
  O[ii]=basis((X[ii]-mx)/100,(Y[ii]-my)/100,d)@c
Zb=cv2.GaussianBlur(Z,(0,0),ZB) if ZB>0 else Z
R = Zb*(1-cov) + col
def mae(A,s=8): return np.abs(cv2.GaussianBlur(A,(0,0),s)-cv2.GaussianBlur(g,(0,0),s)).mean()
print('NZ',n,'deg',DEG,'zb',ZB,'mae8 %.2f mae4 %.2f mae2 %.2f mae0 %.2f'%(mae(R),mae(R,4),mae(R,2),np.abs(R-g).mean()),'%.0fs'%(time.time()-t0))
cv2.imwrite('p3.png',np.clip(R,0,255).astype(np.uint8))
json.dump({'d':dk,'b':bk},open('p3_strokes.json','w'))
