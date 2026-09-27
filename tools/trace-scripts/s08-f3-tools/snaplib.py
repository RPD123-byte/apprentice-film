# Edge snapping: measure, per vertex of a traced polyline/polygon, the normal shift that registers the render's local
# profile onto the source's (both graded output frames at 30.56), then smooth and apply.
import numpy as np, cv2
SRC='/Users/computer/rootline/apprentice-film/snapshots/s08-f3-src/f764.png'
def luma(p, s=0.8):
    im=cv2.imread(p).astype(np.float32)
    return cv2.GaussianBlur(im,(0,0),s).mean(-1), im
def bil(img, x, y):
    x=np.clip(x,0,img.shape[1]-1.001); y=np.clip(y,0,img.shape[0]-1.001)
    x0=np.floor(x).astype(int); y0=np.floor(y).astype(int); fx=x-x0; fy=y-y0
    return (img[y0,x0]*(1-fx)*(1-fy)+img[y0,x0+1]*fx*(1-fy)+img[y0+1,x0]*(1-fx)*fy+img[y0+1,x0+1]*fx*fy)
def normals(P, closed):
    n=len(P); N=np.zeros_like(P)
    for i in range(n):
        a=P[(i-1)%n] if closed else P[max(i-1,0)]; b=P[(i+1)%n] if closed else P[min(i+1,n-1)]
        t=b-a; L=np.hypot(*t) or 1; N[i]=[-t[1]/L, t[0]/L]
    return N
def measure(P, N, R, S, win=8, rng=7, step=0.25, red=None):
    """shift d per vertex (NaN if unreliable). R,S = render/source luma."""
    ss=np.arange(-win-rng-1, win+rng+1+1e-6, 0.5)
    ds=np.arange(-rng, rng+1e-6, step)
    out=np.full(len(P), np.nan); conf=np.zeros(len(P))
    for i,(p,n) in enumerate(zip(P,N)):
        xs=p[0]+n[0]*ss; ys=p[1]+n[1]*ss
        if xs.min()<1 or ys.min()<1 or xs.max()>2204 or ys.max()>944: continue
        wts=np.ones(len(ss))
        if red is not None:
            rr=red(xs, ys)
            if isinstance(rr,(bool,np.bool_)):
                if rr: continue
            else: wts=(~rr).astype(float)
        rp=bil(R,xs,ys); sp=bil(S,xs,ys)
        core=np.abs(ss)<=win
        target=sp[core]; cw=wts[core]
        if cw.sum()<0.6*core.sum(): continue
        if target[cw>0].std()<6: continue
        costs=[]
        for d in ds:
            rv=np.interp(ss[core]-d, ss, rp)
            rw=np.interp(ss[core]-d, ss, wts)
            ww=cw*(rw>0.5)
            costs.append(np.sum(ww*(rv-target)**2)/max(ww.sum(),1))
        costs=np.array(costs); k=int(np.argmin(costs))
        if k in (0,len(ds)-1): continue
        # parabola refine
        c0,c1,c2=costs[k-1],costs[k],costs[k+1]; den=c0-2*c1+c2
        off=0.5*(c0-c2)/den if den>0 else 0
        out[i]=ds[k]+off*step
        conf[i]=(np.median(costs)-c1)/(np.median(costs)+1)
    return out, conf
def smooth(d, closed, sig=2.0, maxgap=4):
    n=len(d); v=d.copy()
    # median 5 (robust)
    m=np.full(n,np.nan)
    for i in range(n):
        idx=[(i+k)%n if closed else i+k for k in range(-2,3)]
        idx=[j for j in idx if 0<=j<n]
        w=v[idx]; w=w[~np.isnan(w)]
        if len(w)>=2: m[i]=np.median(w)
    # gaussian with NaN handling; NaN stays NaN if no data within maxgap
    out=np.full(n,np.nan); r=int(3*sig)+1
    for i in range(n):
        acc=0; ws=0; near=False
        for k in range(-r,r+1):
            j=(i+k)%n if closed else i+k
            if not (0<=j<n) or np.isnan(m[j]): continue
            w=np.exp(-0.5*(k/sig)**2); acc+=w*m[j]; ws+=w
            if abs(k)<=maxgap: near=True
        if ws>0 and near: out[i]=acc/ws
    return out
