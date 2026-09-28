# fitglow.py: per-frame non-negative LSQ for the whole-owl glow (B, walkConst 0.2) and the outside-owl glow (C, ownConst 0.3)
import cv2, numpy as np, os
H='/Users/computer/rootline/apprentice-film/snapshots/s21-r3-h'; SRC='/Users/computer/rootline/apprentice-film/snapshots/s21-r3-src'
g=lambda p: cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(np.float32)
B6=lambda a: cv2.GaussianBlur(a,(0,0),6)
ms=np.load(SRC+'/median.npy')
out=np.zeros((946,2206),bool); out[:118,:]=True; out[:,:133]=True; out[:,2034:]=True
for f in range(1736,1863,2):
    t=f/25; k=f'r-{t:.2f}.png'
    A=g(f'{H}/glA/{k}'); Bv=g(f'{H}/glB/{k}'); Cv=g(f'{H}/glC/{k}'); S=g(f'{SRC}/f{f:04d}.png')
    own=(np.abs(cv2.GaussianBlur(S,(0,0),1.5)-cv2.GaussianBlur(ms,(0,0),1.5))>40)|(A>90)
    own=cv2.dilate(own.astype(np.uint8),np.ones((13,13),np.uint8))>0
    m=out&~own
    a0=B6(A); T=(B6(S)-a0)[m]; dB=(B6(Bv)-a0)[m]; dC=(B6(Cv)-a0)[m]
    # weight the pixels near the owl's response more (where either response is > 0.5)
    w=((dB>0.3)|(dC>0.3)).astype(np.float32)+0.05
    M=np.stack([dB,dC],1)*w[:,None]; y=T*w
    best=None
    for mask in ([1,1],[1,0],[0,1]):
        cols=[i for i in range(2) if mask[i]]
        if not cols: continue
        sol,_,_,_=np.linalg.lstsq(M[:,cols],y,rcond=None)
        x=np.zeros(2); x[cols]=sol
        if (x<0).any(): continue
        r=((y-M@x)**2).sum()
        if best is None or r<best[0]: best=(r,x)
    x=best[1] if best else np.zeros(2)
    r0=((y)**2).sum(); r1=best[0] if best else r0
    print(f'{t:6.2f}  walk {x[0]*0.2:5.3f}  own {x[1]*0.3:5.3f}   resid {np.sqrt(r0/w.sum()):4.2f} -> {np.sqrt(r1/w.sum()):4.2f}   maxresp {dB.max():4.1f} {dC.max():4.1f}')
