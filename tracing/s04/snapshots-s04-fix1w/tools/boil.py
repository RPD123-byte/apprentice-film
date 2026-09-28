# boil.py DIR x0 y0 x1 y1 T1,T2,... : motion-compensated frame-to-frame residual, render vs source, in a region.
# The flow is measured on the SOURCE (DIS, t-1 -> t) and applied to both, so the excess is change the motion does not explain.
import cv2, sys, os, numpy as np
sys.path.insert(0, os.path.dirname(__file__)); from reg import src
d=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); ts=[float(t) for t in sys.argv[6].split(',')]
dis=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
def g(p): return cv2.imread(p,0).astype(np.float32)
tot=[]
for t in ts:
    fi=round(t*25); ta=f'{(fi-1)/25:.2f}'; tb=f'{fi/25:.2f}'
    pa,pb=f'{d}/r-{ta}.png',f'{d}/r-{tb}.png'
    if not (os.path.exists(pa) and os.path.exists(pb)): continue
    sa=cv2.cvtColor(src(fi-1),cv2.COLOR_BGR2GRAY); sb=cv2.cvtColor(src(fi),cv2.COLOR_BGR2GRAY)
    fl=dis.calc(cv2.GaussianBlur(sb,(0,0),1.5),cv2.GaussianBlur(sa,(0,0),1.5),None)   # for each pixel of b, where it is in a
    h,w=sb.shape; gx,gy=np.meshgrid(np.arange(w),np.arange(h)); mx=(gx+fl[...,0]).astype(np.float32); my=(gy+fl[...,1]).astype(np.float32)
    def res(A,B):
        A=cv2.GaussianBlur(A,(0,0),2); B=cv2.GaussianBlur(B,(0,0),2)
        Aw=cv2.remap(A,mx,my,cv2.INTER_LINEAR); return np.abs(Aw-B)[y0:y1,x0:x1].mean()
    r=res(g(pa),g(pb)); s=res(sa.astype(np.float32),sb.astype(np.float32))
    tot.append((r,s)); print(f'{t:.2f} render {r:.2f} source {s:.2f} excess {r-s:+.2f}')
if tot: v=np.array(tot); print(f'MEAN render {v[:,0].mean():.2f} source {v[:,1].mean():.2f} excess {(v[:,0]-v[:,1]).mean():+.2f}')
