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
MP=[[0, 0], [0.6, 0], [0.64, 0.005], [0.68, 0.095], [0.72, 0.281], [0.76, 0.439], [0.8, 0.541], [0.84, 0.599], [0.88, 0.624], [0.92, 0.638], [0.96, 0.643], [1.0, 0.645], [1.04, 0.647], [1.08, 0.671], [1.12, 0.803], [1.16, 1.285], [1.2, 1.63], [1.24, 1.842], [1.28, 1.919], [1.32, 1.95], [1.36, 1.99], [1.4, 2.0], [1.52, 2.0], [1.56, 2.077], [1.6, 2.2], [1.64, 2.383], [1.68, 2.492], [1.72, 2.545], [1.76, 2.571], [1.8, 2.58], [1.84, 2.585], [1.88, 2.617], [1.92, 2.72], [1.96, 2.95], [2.0, 3.49], [2.04, 3.72], [2.08, 3.866], [2.12, 3.93], [2.16, 3.95], [2.2, 3.99], [2.24, 4.0], [2.32, 4.0], [2.36, 4.056], [2.4, 4.174], [2.44, 4.427], [2.48, 4.427], [2.52, 4.65], [2.56, 4.76], [2.6, 4.814], [2.64, 4.83], [2.68, 4.835], [2.76, 4.835], [2.8, 4.845], [2.84, 4.92], [2.88, 4.97], [2.92, 5.05], [2.96, 5.59], [3.0, 5.81], [3.04, 5.9], [3.08, 5.94], [3.12, 6.0], [3.16, 6.0], [3.2, 6.065], [3.24, 6.158], [3.28, 6.364], [3.32, 6.606], [3.36, 6.79], [3.4, 6.97], [3.44, 7.73], [3.48, 7.73], [3.52, 7.94], [3.56, 8.0], [3.6, 8.058], [3.64, 8.234], [3.68, 8.606], [3.72, 8.8], [3.76, 8.89], [3.8, 8.94], [3.84, 8.96], [3.88, 8.98], [3.92, 9.0], [4.12, 9.0], [4.16, 8.68], [4.2, 8.376], [4.24, 8.213], [4.28, 8.123], [4.32, 8.081], [4.36, 8.058], [4.4, 8.03], [4.44, 8.01], [4.48, 8.0], [6.1, 8.0]]
def mine(t):
    for i in range(1,len(MP)):
        if t<=MP[i][0]:
            a,b=MP[i-1],MP[i]; return a[1]+(b[1]-a[1])*(t-a[0])/(b[0]-a[0])
    return MP[-1][1]
for n in range(15,113):
    t=n/25; obs=prof(rect(t))
    best=None
    m=mine(t)
    for p in np.arange(m-0.3,m+0.3,0.004):
        c=comp(p,t)
        for L in (1,20,40,80,140):
            e=np.mean((box(c,L)-obs)**2)
            if best is None or e<best[0]: best=(e,p,L)
    print(f"{t:.2f} mine={m:.3f} fit={best[1]:.3f} d={best[1]-m:+.3f} L={best[2]} err={best[0]:.0f}")
