# mean grey profile across each LIDQ edge (outward positive, -24..+24 px), middle 70% of the edge
import sys; sys.path.insert(0,'.')
from geo import *
def prof(g,A,B,out_sign):
    d=(B-A)/np.linalg.norm(B-A); n=np.array([d[1],-d[0]])*out_sign
    ss=np.linspace(0.15,0.85,60); oo=np.arange(-24,25)
    P=A[None,None,:]+(ss[:,None,None]*(B-A)[None,None,:])+oo[None,:,None]*n[None,None,:]
    v=cv2.remap(g,P[...,0].astype(np.float32),P[...,1].astype(np.float32),cv2.INTER_LINEAR,borderValue=-1)
    ok=(P[...,0]>=0)&(P[...,0]<W)&(P[...,1]>=0)&(P[...,1]<H-4)
    v=np.where(ok,v,np.nan)
    return np.nanmedian(v,0)
ts=[float(x) for x in sys.argv[1].split(',')]
for t in ts:
    g=cv2.cvtColor(frame(round(t*25)),cv2.COLOR_BGR2GRAY).astype(np.float32)
    q=lidQuad(min(t,131.4)); TL,TR,BR,BL=q
    c=q.mean(0)
    for nm,(A,B) in {'top':(TL,TR),'right':(TR,BR),'left':(BL,TL)}.items():
        d=(B-A); n=np.array([d[1],-d[0]]); s=1 if np.dot(n,(A+B)/2-c)>0 else -1
        p=prof(g,A,B,s)
        # darkest points
        print(f"{t:.2f} {nm:5s}", ' '.join('..' if np.isnan(v) else f'{int(v):3d}' for v in p[::2]))
