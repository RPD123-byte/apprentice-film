import cv2,numpy as np,json
from scipy.optimize import least_squares
from pc import P
sched=json.load(open('schedule.json')); sct=json.load(open('sctrack.json'))
def tmask(k):
    T=json.load(open(f't_{k}.json')); m=np.zeros((946,2206),np.uint8)
    for r in T['mask']: cv2.fillPoly(m,[np.array(r).reshape(-1,2).round().astype(np.int32)],1)
    return m
def owlmask(f):
    r=sched[str(f)]; k=r[0]; A=np.array(r[1:7]).reshape(2,3)
    m=cv2.warpAffine(tmask(k),A,(2206,946),flags=cv2.INTER_NEAREST)
    return m
refm=owlmask(2615)|tmask('hips1')
ref=P(2615)
S=8
K=10
res={}
prev=None
for f in range(2577,2606):
    Pf=P(f)
    E=cv2.GaussianBlur(Pf-ref,(0,0),4)
    m=(owlmask(f)|refm)
    for k,v in sct.items():
        if str(f) in v:
            A=np.array(v[str(f)][:6]).reshape(2,3); m|=cv2.warpAffine(tmask(k),A,(2206,946),flags=cv2.INTER_NEAREST)
    valid=cv2.dilate(m,np.ones((25,25),np.uint8))==0
    valid[:640]=False; valid[912:]=False; valid[:, :150]=False; valid[:, 2020:]=False
    Es=cv2.resize(E,(2206//S,946//S),interpolation=cv2.INTER_AREA); Vs=cv2.resize(valid.astype(np.float32),(2206//S,946//S),interpolation=cv2.INTER_AREA)>0.99
    ys,xs=np.nonzero(Vs); X=(xs+0.5)*S; Y=(ys+0.5)*S; Z=Es[ys,xs]
    def model(p,X,Y):
        out=np.zeros_like(X,dtype=np.float64)
        for i in range(K):
            x0,y0,sx,sy,a=p[5*i:5*i+5]
            out+=a*np.exp(-0.5*(((X-x0)/sx)**2+((Y-y0)/sy)**2))
        return out
    if prev is None:
        p0=[]
        for i in range(K):
            p0+= [450+i*125, 860, 90, 45, 0.1]
        p0=np.array(p0,float)
    else: p0=prev.copy()
    lo=[];hi=[]
    for i in range(K): lo+=[300,680,45,22,0]; hi+=[1900,960,500,160,0.8]
    p0=np.clip(p0,np.array(lo)+1e-6,np.array(hi)-1e-6)
    r=least_squares(lambda p: model(p,X,Y)-Z, p0, bounds=(lo,hi), max_nfev=400)
    prev=r.x
    rm=np.sqrt(np.mean(r.fun**2)); z=np.sqrt(np.mean(Z**2))
    res[f]=[round(float(v),3) for v in r.x]
    print(flush=True,*[f'{f/25:.2f} rms resid {rm*255:.1f} of {z*255:.1f}  total amp {sum(r.x[4::5]):.2f}  meanE {Z.mean()*255:.1f}'])
json.dump(res,open('smokefit.json','w'))
