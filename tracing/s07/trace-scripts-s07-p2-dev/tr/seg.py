import cv2, numpy as np, sys, time
from skimage.segmentation import slic, felzenszwalb
T = np.load('../T.npy'); g = (T.mean(axis=2)*255).astype(np.float32); H,W=g.shape
base = cv2.medianBlur(np.clip(g,0,255).astype(np.uint8), 11).astype(np.float32)
base = cv2.GaussianBlur(base,(0,0),2)
yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
def fit(lab, deg=1):
  out=np.zeros_like(g)
  n=lab.max()+1
  idx=[np.nonzero(lab.ravel()==i)[0] for i in range(n)] if n<50 else None
  order=np.argsort(lab.ravel()); ls=lab.ravel()[order]; bounds=np.searchsorted(ls,np.arange(n+1))
  X=xx.ravel(); Y=yy.ravel(); B=base.ravel(); O=out.ravel()
  for i in range(n):
    ii=order[bounds[i]:bounds[i+1]]
    if len(ii)==0: continue
    x=(X[ii]-X[ii].mean())/100; y=(Y[ii]-Y[ii].mean())/100
    cols=[np.ones_like(x)]
    if deg>=1 and len(ii)>20: cols+=[x,y]
    if deg>=2 and len(ii)>200: cols+=[x*x,x*y,y*y]
    A=np.stack(cols,1); c,*_=np.linalg.lstsq(A,B[ii],rcond=None); O[ii]=A@c
  return out
for n in [int(v) for v in sys.argv[1:]]:
  t0=time.time()
  lab=slic(np.dstack([base/255]*3), n_segments=n, compactness=8, sigma=0, start_label=0, channel_axis=-1)
  for deg in (1,2):
    F=fit(lab,deg)
    e=[np.abs(cv2.GaussianBlur(F,(0,0),s)-cv2.GaussianBlur(base,(0,0),s)).mean() for s in (2,8)]
    e2=[np.abs(cv2.GaussianBlur(F,(0,0),s)-cv2.GaussianBlur(g,(0,0),s)).mean() for s in (2,8)]
    print(n,lab.max()+1,'deg',deg,'vs base %.2f %.2f   vs T %.2f %.2f'%(*e,*e2),'%.1fs'%(time.time()-t0))
  np.save('lab%d.npy'%n,lab)
