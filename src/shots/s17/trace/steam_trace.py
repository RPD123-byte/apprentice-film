# Steam tracer for s17 (a measurement tool, not loaded by the film). For each drawing tick the source frame is
# mapped to page coordinates (undoing the pull-back zoom), and the thin bright steam strands above the mug are
# traced: Hessian ridge measure (bright lines), hysteresis threshold, skeleton, paths split at junctions and
# re-joined where their ends line up, smoothed, RDP-simplified; width from the perpendicular brightness profile,
# value = peak brightness with the film's S-curve inverted (pre-grade). The owl (large bright areas) is masked.
# Output: steam_data.js with centre lines only (x, y, width, value per point) — no pixels are stored.
# usage: python3 steam_trace.py OUT.js
import cv2, numpy as np, json, sys
from skimage.morphology import skeletonize, remove_small_objects
from skimage.filters import apply_hysteresis_threshold
from skimage.feature import hessian_matrix, hessian_matrix_eigvals
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
TICKS=[float(x) for x in "47.84 47.92 48.00 48.08 48.16 48.24 48.32 48.40 48.48 48.56 48.64 48.72 48.80 48.88 48.96 49.04 49.12 49.20 49.28 49.36 49.44 49.52 49.64 49.72 49.80 49.88 49.96 50.04 50.12 50.20 50.28 50.36 50.44 50.52 50.64 50.72 50.80 50.88 50.96 51.04 51.12 51.20 51.28 51.36 51.44 51.52 51.64 51.72 51.80 51.88 51.96 52.04 52.12 52.20 52.28 52.36 52.44 52.52 52.56 52.60 52.64 52.68 52.72 52.76 52.80 52.84 52.88 52.92 52.96 53.00 53.08 53.12 53.16 53.20".split()]
Z=[(-0.04,2.1718),(0,1.9529),(0.04,1.7763),(0.08,1.6346),(0.12,1.5126),(0.16,1.4111),(0.2,1.3299),(0.24,1.2619),(0.28,1.207),(0.32,1.1592),(0.36,1.122),(0.4,1.0911),(0.44,1.0673),(0.48,1.0471),(0.52,1.0319),(0.56,1.0204),(0.6,1.0124),(0.64,1.0066),(0.68,1.0029),(0.72,1.0)]
def zoom(l):
    if l<=Z[0][0]: return Z[0][1]
    for i in range(1,len(Z)):
        if l<=Z[i][0]+1e-9:
            a,va=Z[i-1]; b,vb=Z[i]; return va+(vb-va)*(l-a)/(b-a)
    return 1.0
FX,FY=865,341
X0,Y0,X1,Y1=795,325,905,464
S=4
cap=cv2.VideoCapture(V)
def page_region(t):
    cap.set(1,round(t*25)); ok,f=cap.read(); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)/255
    z=zoom(round(t-47.84,2))
    xs=X0+(np.arange((X1-X0)*S)+0.5)/S-0.5; ys=Y0+(np.arange((Y1-Y0)*S)+0.5)/S-0.5
    mx,my=np.meshgrid(FX+z*(xs-FX),FY+z*(ys-FY))
    return cv2.remap(g,mx.astype(np.float32),my.astype(np.float32),cv2.INTER_CUBIC),z
def inv_s(v):
    lo,hi=0.0,1.0
    for _ in range(30):
        m=(lo+hi)/2; s=0.65*m+0.35*m*m*(3-2*m)
        lo,hi=(m,hi) if s<v else (lo,m)
    return (lo+hi)/2
def rdp(P,eps):
    if len(P)<3: return list(P)
    a,b=P[0],P[-1]; ab=b-a; L=np.linalg.norm(ab)+1e-9
    dd=np.abs(ab[0]*(P[1:-1,1]-a[1])-ab[1]*(P[1:-1,0]-a[0]))/L
    i=int(np.argmax(dd))+1
    if dd[i-1]>eps: return rdp(P[:i+1],eps)[:-1]+rdp(P[i:],eps)
    return [a,b]
def trace(img, HI=0.05, LO=0.018, SIG=1.3):
    H,W=img.shape
    # the owl: large bright areas (wider than a steam strand), dilated
    big=(cv2.GaussianBlur(img,(0,0),1.5*S)>0.3).astype(np.uint8)
    big=cv2.morphologyEx(big,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(int(6*S),int(6*S))))
    big=cv2.dilate(big,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(int(5*S),int(5*S))))
    Hm=hessian_matrix(1-img, sigma=SIG*S, order='rc', use_gaussian_derivatives=True)
    ev=hessian_matrix_eigvals(Hm); ridge=np.maximum(0,ev[0])*(SIG*S)**2
    ridge[big>0]=0; ridge[-2*S:]=0
    mk=apply_hysteresis_threshold(ridge,LO,HI); mk=remove_small_objects(mk,max_size=int(8*S))
    sk=skeletonize(mk)
    ys,xs=np.nonzero(sk); pts=set(zip(xs.tolist(),ys.tolist()))
    nb=lambda p:[(p[0]+dx,p[1]+dy) for dx in (-1,0,1) for dy in (-1,0,1) if (dx or dy) and (p[0]+dx,p[1]+dy) in pts]
    deg={p:len(nb(p)) for p in pts}; used=set(); paths=[]
    def walk(p0,p1):
        path=[p0,p1]; used.add((p0,p1)); used.add((p1,p0))
        while True:
            cur=path[-1]
            if deg[cur]!=2: break
            nx=[q for q in nb(cur) if q!=path[-2] and (cur,q) not in used]
            if not nx: break
            q=nx[0]; used.add((cur,q)); used.add((q,cur)); path.append(q)
        return path
    for p in sorted(pts):
        if deg[p]!=2:
            for q in nb(p):
                if (p,q) not in used: paths.append(walk(p,q))
    for p in sorted(pts):
        for q in nb(p):
            if (p,q) not in used: paths.append(walk(p,q))
    paths=[np.array(P,float) for P in paths if len(P)>=3]
    # drop the short bridges where the two strands touch (and tiny stubs) before re-joining through the junctions
    paths=[P for P in paths if np.sum(np.hypot(*np.diff(P,axis=0).T))>4.5*S]
    # re-join paths whose ends line up (gap < 7 px, directions within ~45 deg)
    def endinfo(P,end):
        if end==0: a,b=P[0],P[min(len(P)-1,3*S)]
        else: a,b=P[-1],P[max(0,len(P)-1-3*S)]
        d=a-b; return a,d/(np.linalg.norm(d)+1e-9)
    changed=True
    while changed:
        changed=False; best=None
        for i in range(len(paths)):
            for j in range(len(paths)):
                if i>=j: continue
                for ei in (0,1):
                    for ej in (0,1):
                        a,da=endinfo(paths[i],ei); b,db=endinfo(paths[j],ej)
                        gap=np.linalg.norm(b-a)
                        if gap>5*S: continue
                        if gap>1e-6:
                            u=(b-a)/gap
                            if np.dot(da,u)<0.72 or np.dot(db,-u)<0.72: continue
                        elif np.dot(da,-db)<0.5: continue
                        if best is None or gap<best[0]: best=(gap,i,j,ei,ej)
        if best:
            _,i,j,ei,ej=best
            A=paths[i] if ei==1 else paths[i][::-1]; B=paths[j] if ej==0 else paths[j][::-1]
            paths[i]=np.vstack([A,B]); del paths[j]; changed=True
    bg=cv2.erode(img,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(int(4*S)|1,int(4*S)|1))); bg=cv2.GaussianBlur(bg,(0,0),S)
    D0=img-bg
    res=[]
    for P in paths:
        L=np.sum(np.hypot(*np.diff(P,axis=0).T))/S
        if L<8: continue
        if len(P)>9:
            k=np.ones(9)/9; A=P.copy(); A[4:-4,0]=np.convolve(P[:,0],k,'valid'); A[4:-4,1]=np.convolve(P[:,1],k,'valid'); P=A
        Q=np.array(rdp(P,0.3*S))
        # densify to <= 3 px
        out=[Q[0]]
        for k in range(1,len(Q)):
            n=int(np.linalg.norm(Q[k]-Q[k-1])//(7*S))
            for s_ in range(1,n+1): out.append(Q[k-1]+(Q[k]-Q[k-1])*s_/(n+1))
            out.append(Q[k])
        Q=np.array(out); row=[]
        for k in range(len(Q)):
            x,y=Q[k]; t=Q[min(len(Q)-1,k+1)]-Q[max(0,k-1)]; t=t/(np.linalg.norm(t)+1e-9); nr=np.array([-t[1],t[0]])
            prof=[]
            for o in np.arange(-4*S,4*S+0.1,1.0):
                xi,yi=int(round(x+nr[0]*o)),int(round(y+nr[1]*o)); prof.append(max(0.0,float(D0[yi,xi])) if 0<=xi<W and 0<=yi<H else 0.0)
            prof=np.array(prof); c=len(prof)//2; win=prof[c-2*S:c+2*S+1]; j=int(np.argmax(win)); pk=win[j]; jc=c-2*S+j
            lo=jc
            while lo>0 and prof[lo-1]>0.5*pk: lo-=1
            hi=jc
            while hi<len(prof)-1 and prof[hi+1]>0.5*pk: hi+=1
            w=(hi-lo+1)/S                  # full width at half maximum (px)
            xo,yo=x+nr[0]*(jc-c),y+nr[1]*(jc-c)
            vpk=float(img[int(round(yo)),int(round(xo))]) if 0<=int(round(xo))<W and 0<=int(round(yo))<H else 0.0
            row+=[round(X0+(xo+0.5)/S-0.5,1),round(Y0+(yo+0.5)/S-0.5,1),round(min(3.5,max(0.6,w)),1),round(inv_s(min(1,vpk)),2)]
        res.append(row)
    return res
if __name__=='__main__':
    data={}
    for t in TICKS:
        img,z=page_region(t)
        st=trace(img); data[f"{t:.2f}"]=st
        print(t,'z %.3f'%z,len(st),'strokes',[len(s)//4 for s in st])
    js=("// s17 steam: centre lines traced from the source by trace/steam_trace.py (per drawing tick; per point x, y in page\n"
        "// px, width px, pre-grade value 0..1). Measurement data only: no pixels are stored.\nexport const STEAM = "+json.dumps(data,separators=(',',':'))+";\n")
    open(sys.argv[1],'w').write(js); print('bytes',len(js))
