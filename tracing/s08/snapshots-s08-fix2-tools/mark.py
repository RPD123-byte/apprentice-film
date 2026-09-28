# mark.py RDIR frames: the top-left mark's bright-ink mass, extents and stroke width per line (source vs render, F0)
import cv2,numpy as np,sys
sys.path.insert(0,'snapshots/s08-fix2-tools')
from cam import f0
from skimage.morphology import skeletonize
rd=sys.argv[1]; fr=[int(v) for v in sys.argv[2].split(',')]
L=lambda im: (im[...,2]*0.299+im[...,1]*0.587+im[...,0]*0.114).astype(np.float32)
for k in fr:
    S=L(f0(cv2.imread(f'snapshots/s08-p4-src/f{k}.png').astype(np.float32),k)); R=L(f0(cv2.imread(f'{rd}/r{k}.png').astype(np.float32),k))
    out=[]
    for nm,(y0,y1) in (('l1',(10,62)),('l2',(62,165)),('all',(10,165))):
        row=[]
        for I in (R,S):
            b=I[y0:y1,140:500]>110; ys,xs=np.where(b)
            sk=skeletonize(b).sum()
            row.append((b.sum(), xs.min()+140 if len(xs) else -1, xs.max()+140 if len(xs) else -1, b.sum()/max(sk,1), np.percentile(I[y0:y1,140:500][b],90) if b.sum() else 0))
        (a,ax0,ax1,aw,ap),(c,cx0,cx1,cw,cp)=row
        out.append(f'{nm}: area {a}/{c} x {ax0}-{ax1} / {cx0}-{cx1} w {aw:.2f}/{cw:.2f} p90 {ap:.0f}/{cp:.0f}')
    # blurred error in the box
    d=np.abs(cv2.GaussianBlur(R,(0,0),3)-cv2.GaussianBlur(S,(0,0),3))[0:180,140:500].mean()
    print(k,' | '.join(out),'| err %.1f'%d)
