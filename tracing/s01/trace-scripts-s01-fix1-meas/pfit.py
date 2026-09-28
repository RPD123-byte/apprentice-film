# Fit the carousel position p(t) per source frame from 1D column profiles of the rectified screen.
import cv2, numpy as np
exec(open('/Users/computer/rootline/apprentice-film/snapshots/s01-fix1-meas/camlib.py').read())
HM=np.array([[0.433,0.102143,855.0],[0.0,0.4578893,62.0],[0.0,9.53e-05,1.0]])
U,Vv=1000,508
def rect(t):
    f=frame(t); s,tx,ty=cam(t)
    C=np.array([[s,0,tx],[0,s,ty],[0,0,1]])@HM   # page -> frame
    g=cv2.warpPerspective(f,C,(U,Vv),flags=cv2.WARP_INVERSE_MAP|cv2.INTER_AREA)
    return cv2.cvtColor(g,cv2.COLOR_BGR2GRAY).astype(float)
def prof(g): return g[60:480].mean(0)   # column profile
soko=prof(rect(0.4)); letters=prof(rect(3.96)); machines=prof(rect(1.44))
iss=prof(rect(2.72)); issue=np.concatenate([iss[165:], np.full(165, np.median(iss[700:]))])
PAGES=[soko,letters,machines,issue]
def slotPage(i,t):
    return {0:0,8:0,1:1,3:1,7:1,9:1,2:(2 if t<1.58 else 0),4:(2 if t<2.5 else 0),5:3,6:2}.get(i,-1)
def comp(p,t):
    i0=int(np.floor(p)); f=p-i0; sh=int(round(f*U))
    A=PAGES[slotPage(i0,t)] if slotPage(i0,t)>=0 else np.zeros(U)
    B=PAGES[slotPage(i0+1,t)] if slotPage(i0+1,t)>=0 else np.zeros(U)
    return np.concatenate([A[sh:],B[:sh]])
def box(x,L):
    if L<2: return x
    k=np.ones(int(L))/int(L); return np.convolve(np.pad(x,(int(L),int(L)),mode='edge'),k,mode='same')[int(L):-int(L)]
import sys
prev=None
for n in range(15,113):
    t=n/25; obs=prof(rect(t))
    best=None
    for p in np.arange(-0.02,9.02,0.004):
        c=comp(p,t)
        for L in (1,20,40,80,140):
            e=np.mean((box(c,L)-obs)**2)
            if best is None or e<best[0]: best=(e,p,L)
    print(f"{t:.2f} p={best[1]:.3f} L={best[2]} err={best[0]:.0f}")
