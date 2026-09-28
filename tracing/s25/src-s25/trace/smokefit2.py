# chaos-phase smoke: brightness the smoke adds (pre-grade), thin lines removed by an opening, owls masked; K blobs/frame
import cv2,numpy as np,json,sys
from scipy.optimize import least_squares
from pc import P
K=int(sys.argv[1]) if len(sys.argv)>1 else 16
dv=json.load(open('divetrack.json'))['dive']; ch=json.load(open('chtrack.json')); et=json.load(open('etrack.json'))
def tmask(k):
    T=json.load(open(f't_{k}.json')); m=np.zeros((946,2206),np.uint8)
    for r in T['mask']: cv2.fillPoly(m,[np.array(r).reshape(-1,2).round().astype(np.int32)],1)
    return m
TM={k:tmask(k) for k in ['dive','vs2','vs3','hov','eTR','eSt','eFl']}
def owls(f):
    m=np.zeros((946,2206),np.uint8)
    L=[]
    if f<=2537: L.append(('dive',dv[str(f)]))
    elif f<=2541: L.append(('vs2',ch['vs2'][str(f)]))
    elif f<=2545: L.append(('vs3',ch['vs3'][str(f)]))
    elif f>=2547 and str(f) in ch['hov']: L.append(('hov',ch['hov'][str(f)]))
    for k in ['eTR','eSt','eFl']:
        if str(f) in et[k]: L.append((k,et[k][str(f)]))
    for k,v in L:
        A=np.array(v[:6]).reshape(2,3); m|=cv2.warpAffine(TM[k],A,(2206,946),flags=cv2.INTER_NEAREST)
    return m
base=np.minimum.reduce([P(f) for f in [2542,2545,2555,2560,2548]])
Kop=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(15,15))
def opn(a): return cv2.morphologyEx(a,cv2.MORPH_OPEN,Kop)
B0=opn(base)
S=8; res={}; prev=None
frames=[int(a) for a in sys.argv[2].split(',')] if len(sys.argv)>2 else [f for f in range(2513,2566) if f!=2514]
for f in frames:
    E=cv2.GaussianBlur(opn(P(f))-B0,(0,0),4)
    valid=cv2.dilate(owls(f),np.ones((21,21),np.uint8))==0
    Es=cv2.resize(E,(2206//S,946//S),interpolation=cv2.INTER_AREA); Vs=cv2.resize(valid.astype(np.float32),(2206//S,946//S),interpolation=cv2.INTER_AREA)>0.99
    ys,xs=np.nonzero(Vs); X=(xs+0.5)*S; Y=(ys+0.5)*S; Z=np.maximum(Es[ys,xs],-0.05)
    def model(p):
        out=np.zeros_like(X,dtype=np.float64)
        for i in range(K):
            x0,y0,sx,sy,a=p[5*i:5*i+5]; out+=a*np.exp(-0.5*(((X-x0)/sx)**2+((Y-y0)/sy)**2))
        return out
    if prev is None:
        # seed on the largest residual peaks
        p0=[]; R=Es.copy(); R[~Vs]=0
        for i in range(K):
            yy,xx=np.unravel_index(np.argmax(R),R.shape); a=max(0.02,R[yy,xx])
            p0+=[(xx+0.5)*S,(yy+0.5)*S,90,60,a]
            cv2.circle(R,(xx,yy),12,0,-1)
        p0=np.array(p0,float)
    else: p0=prev.copy()
    lo=[];hi=[]
    for i in range(K): lo+=[-100,-100,30,20,0]; hi+=[2306,1046,600,400,0.9]
    p0=np.clip(p0,np.array(lo)+1e-6,np.array(hi)-1e-6)
    r=least_squares(lambda p: model(p)-Z, p0, bounds=(lo,hi), max_nfev=250)
    prev=r.x
    res[f]=[round(float(v),3) for v in r.x]
    print(f'{f/25:.2f} resid {np.sqrt(np.mean(r.fun**2))*255:.1f} of {np.sqrt(np.mean(Z**2))*255:.1f}', flush=True)
json.dump(res,open('smokefit2.json','w'))
