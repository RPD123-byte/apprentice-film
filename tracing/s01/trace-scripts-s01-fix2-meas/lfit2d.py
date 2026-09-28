import numpy as np, re, cv2, sys
src=open('/Users/computer/rootline/apprentice-film/snapshots/s01-fix1-meas/pfit2.py').read()
src=src[:src.index('def prof')]
exec(src)
D=2  # downsample
def R(t): g=rect(t); return cv2.resize(g,(U//D,Vv//D),interpolation=cv2.INTER_AREA)[30//D:480//D]
soko=R(0.4); letters=R(3.96); machines=R(1.44); iss=R(2.72)
issue=np.concatenate([iss[:,165//D:], np.full((iss.shape[0],165//D), np.median(iss[:,700//D:]))],1)
PAGES=[soko,letters,machines,issue]
def slotPage(i,t):
    return {0:0,8:0,1:1,3:1,7:1,9:1,2:(2 if t<1.58 else 0),4:(2 if t<2.5 else 0),5:3,6:2}.get(i,-1)
W2=U//D
def comp(p,t):
    i0=int(np.floor(p)); f=p-i0; sh=int(round(f*W2))
    A=PAGES[slotPage(i0,t)] if slotPage(i0,t)>=0 else np.zeros_like(soko)
    B=PAGES[slotPage(i0+1,t)] if slotPage(i0+1,t)>=0 else np.zeros_like(soko)
    return np.concatenate([A[:,sh:],B[:,:sh]],1)
def boxc(x,L):
    n=int(round(L/D))
    if n<2: return x
    return cv2.blur(x,(n,1),borderType=cv2.BORDER_REPLICATE)
js=open('/Users/computer/rootline/apprentice-film/src/shots/s01/screen.js').read()
P=eval(re.search(r'const P = (\[.*?\]);',js,re.S).group(1))
def pAt(t):
    for i in range(1,len(P)):
        if t<=P[i][0]+1e-9:
            a,b=P[i-1],P[i]; return a[1]+(b[1]-a[1])*(t-a[0])/(b[0]-a[0])
    return P[-1][1]
ns=[int(a) for a in sys.argv[1:]] or range(15,113)
for n in ns:
    t=n/25; obs=R(t); m=pAt(t)
    best=None
    for p in np.arange(m-0.02,m+0.0201,0.004):
        c=comp(p,t)
        for L in [0,4,8,12,16,20,26,32,40,50,60,72,86,100,120,140,165,190,220,250,285,320]:
            e=np.mean((boxc(c,L)-obs)**2)
            if best is None or e<best[0]: best=(e,p,L)
    # refine L around best at best p
    c=comp(best[1],t); e0=best
    for L in range(max(0,best[2]-15),best[2]+16,3):
        e=np.mean((boxc(c,L)-obs)**2)
        if e<best[0]: best=(e,best[1],L)
    vb=abs(m-pAt(t-0.04)); vf=abs(pAt(t+0.04)-m); vc=(vb+vf)/2
    print(f"{t:.2f} p={m:.3f} fitp={best[1]:.3f} L={best[2]:3d} vb={vb:.3f} vf={vf:.3f} vc={vc:.3f} err={best[0]:.0f}", flush=True)
