# per-face stroke measurement: dominant stroke direction (structure tensor), coherence, high-frequency texture energy
import os
for _k in ('OPENBLAS_NUM_THREADS','OMP_NUM_THREADS','VECLIB_MAXIMUM_THREADS'): os.environ.setdefault(_k,'1')
import sys; sys.path.insert(0,os.path.dirname(__file__))
from common import *
def measure(img,faces,f):
    g=gray(img).astype(np.float32)/255
    gs=cv2.GaussianBlur(g,(0,0),1.2)
    gx=cv2.Sobel(gs,cv2.CV_32F,1,0,ksize=3); gy=cv2.Sobel(gs,cv2.CV_32F,0,1,ksize=3)
    hf=g-cv2.GaussianBlur(g,(0,0),4)
    lo=cv2.GaussianBlur(g,(0,0),6)
    ids=idmap(faces); om=owlmask(f)>0
    out={}
    for i,(fid,q,opt) in enumerate(faces):
        m=((ids==i)&~om).astype(np.uint8)
        m=cv2.erode(m,np.ones((9,9),np.uint8))>0
        n=int(m.sum())
        if n<400: continue
        a,b,c=(gx[m]**2).sum(),(gx[m]*gy[m]).sum(),(gy[m]**2).sum()
        w,v=np.linalg.eigh(np.array([[a,b],[b,c]])); coh=(w[1]-w[0])/(w[1]+w[0]+1e-9)
        gd=v[:,1]; sd=np.array([-gd[1],gd[0]])
        out[fid]=dict(dir=sd,coh=float(coh),hf=float(hf[m].std()),mean=float(lo[m].mean()),n=n,cen=np.array(np.nonzero(m)[::-1]).mean(1))
    return out
