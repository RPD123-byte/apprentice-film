# labels.py RDIR frames : phase-correlation offset (render -> source) of the CANCEL / SAVE labels, text box corners, smiley
import cv2,numpy as np,sys
sys.path.insert(0,'snapshots/s08-fix2-tools')
from cam import f0, card2f0u
rd=sys.argv[1]; fr=[int(v) for v in sys.argv[2].split(',')]
L=lambda im: (im[...,2]*0.299+im[...,1]*0.587+im[...,0]*0.114).astype(np.float32)
S=L(np.mean([f0(cv2.imread(f'snapshots/s08-p4-src/f{k}.png').astype(np.float32),k) for k in fr],0))
R=L(np.mean([f0(cv2.imread(f'{rd}/r{k}.png').astype(np.float32),k) for k in fr],0))
def box(u0,v0,u1,v1):
    x0,y0=card2f0u(u0,v0); x1,y1=card2f0u(u1,v1); return int(x0),int(y0),int(x1),int(y1)
for nm,(u0,v0,u1,v1) in {'CANCEL':(85,550,200,588),'SAVE':(290,550,366,588),'smiley':(150,35,242,125)}.items():
    x0,y0,x1,y1=box(u0,v0,u1,v1)
    a=R[y0:y1,x0:x1]; b=S[y0:y1,x0:x1]
    win=cv2.createHanningWindow((a.shape[1],a.shape[0]),cv2.CV_32F)
    (dx,dy),resp=cv2.phaseCorrelate(a,b,win)
    ink=lambda im: np.clip(np.median(im)-im,0,None).sum()
    print(f'{nm:7s} src-render shift dx {dx:+.2f} dy {dy:+.2f} (resp {resp:.2f})  ink R/S {ink(a)/ink(b):.3f}  box {x0},{y0},{x1},{y1}')
# ink centroids (x, y) of each label, render - source
for nm,(u0,v0,u1,v1) in {'CANCEL':(85,550,200,588),'SAVE':(290,550,366,588)}.items():
    x0,y0,x1,y1=box(u0,v0,u1,v1)
    def cen(im):
        w=np.clip(np.median(im)-im-20,0,None); yy,xx=np.mgrid[0:w.shape[0],0:w.shape[1]]
        return (w*xx).sum()/w.sum(),(w*yy).sum()/w.sum()
    a=cen(R[y0:y1,x0:x1]); b=cen(S[y0:y1,x0:x1]); print(f'{nm} centroid render-source dx {a[0]-b[0]:+.2f} dy {a[1]-b[1]:+.2f}')
# ink extents at half depth (column profile of ink), render vs source
for nm,(u0,v0,u1,v1) in {'CANCEL':(85,550,200,588),'SAVE':(290,550,366,588)}.items():
    x0,y0,x1,y1=box(u0,v0,u1,v1)
    def ext(im):
        w=np.clip(np.median(im)-im,0,None).sum(0); h=w.max()*0.25; idx=np.where(w>h)[0]
        def sub(i,j): return i+(h-w[i])/(w[j]-w[i]) if w[j]!=w[i] else i
        return x0+sub(idx[0]-1,idx[0]), x0+sub(idx[-1],idx[-1]+1), w.sum()
    a=ext(R[y0:y1,x0:x1]); b=ext(S[y0:y1,x0:x1]); print(f'{nm} ink x-extent render {a[0]:.2f}-{a[1]:.2f} source {b[0]:.2f}-{b[1]:.2f}')
