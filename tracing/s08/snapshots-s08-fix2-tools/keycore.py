# keycore.py RDIR frames : dark keyline core minima per region, source vs render (F0). Line points found on the source:
# horizontal or vertical profiles with a local minimum and both sides >= min + 45 within 7 px; the min within +-2 px
# is taken in each image. Prints the median core level per region (render / source) and the median half-depth width.
import cv2,numpy as np,sys
sys.path.insert(0,'snapshots/s08-fix2-tools')
from cam import f0
rd=sys.argv[1]; fr=[int(v) for v in sys.argv[2].split(',')]
L=lambda im: (im[...,2]*0.299+im[...,1]*0.587+im[...,0]*0.114).astype(np.float32)
REG={'letters':(0,610,1100,946),'lobesfan':(0,200,560,600),'Uleft':(780,20,1250,700),'Uright+tail':(1250,20,2206,360),'tailedge':(2150,200,2204,340),'cloud':(1600,700,2206,946)}
res={n:[[],[]] for n in REG}
for k in fr:
    S=L(f0(cv2.imread(f'snapshots/s08-p4-src/f{k}.png').astype(np.float32),k)); R=L(f0(cv2.imread(f'{rd}/r{k}.png').astype(np.float32),k))
    Sb=cv2.GaussianBlur(S,(0,0),0.7)
    for n,(x0,y0,x1,y1) in REG.items():
        if n=='Uright+tail': mask=lambda x,y: not (x>1440 and y>175)
        else: mask=lambda x,y: True
        sub=Sb[y0:y1,x0:x1]
        for axis in (0,1):
            A=sub if axis==1 else sub.T
            m=A.shape[1]
            mn=cv2.erode(A,np.ones((1,5),np.uint8))
            lm=(A<=mn+0.01)
            left=np.full_like(A,-1); right=np.full_like(A,-1)
            for d in range(3,8):
                sh_l=np.roll(A,d,1); sh_r=np.roll(A,-d,1)
                left=np.maximum(left,sh_l); right=np.maximum(right,sh_r)
            ok=lm&(left>=A+45)&(right>=A+45)&(A<90)
            ok[:,:8]=False; ok[:,-8:]=False
            ys,xs=np.where(ok)
            for yy,xx in zip(ys[::3],xs[::3]):
                X,Y=(xx+x0,yy+y0) if axis==1 else (yy+x0,xx+y0)
                if not mask(X,Y): continue
                if X<3 or Y<14 or X>2202 or Y>942: continue
                ws=S[Y-2:Y+3,X-2:X+3]; wr=R[Y-2:Y+3,X-2:X+3]
                res[n][0].append(wr.min()); res[n][1].append(ws.min())
for n in REG:
    r,s=np.array(res[n][0]),np.array(res[n][1])
    if len(s): print(f'{n:12s} n={len(s):5d} core median R {np.median(r):5.1f} S {np.median(s):5.1f}  diff {np.median(r-s):+5.1f}  p25 {np.percentile(r-s,25):+5.1f} p75 {np.percentile(r-s,75):+5.1f}')
