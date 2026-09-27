import cv2,numpy as np,json,re
from scipy.optimize import minimize
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
st=json.load(open('card3d.json')); f=st['f']; ka=st['ka']; cx,cy=1103.,473.
Kc=np.array([[f,0,cx],[0,f,cy],[0,0,1.]])
src=open('/Users/computer/rootline/apprentice-film/src/shots/s19/card.js').read()
rows=[[float(v) for v in re.findall(r'-?\d+\.?\d*',l)] for l in src.split('\n') if l.strip().startswith('[6') or l.strip().startswith('[5')]
rows={round(r[0],2):r[1:] for r in rows if len(r)==9}
U=np.float32([[0,0],[465,0],[465,648],[0,648]])
X3=np.c_[U[:,0],U[:,1]*ka,np.zeros(4)].astype(np.float64)
def proj(p,UV):
    UV=np.asarray(UV,float); R,_=cv2.Rodrigues(p[:3]); X=np.c_[UV[:,0],UV[:,1]*ka,np.zeros(len(UV))]
    Q=(R@X.T).T+p[3:6]; return np.c_[f*Q[:,0]/Q[:,2]+cx,f*Q[:,1]/Q[:,2]+cy]
# owl lower-body exclusion boxes (root x,y from the animation, frame px)
OWL={}
for line in open('/Users/computer/rootline/apprentice-film/src/shots/s19/anim.js'):
    m=re.match(r'\s*\[(6[12]\.\d+), (\d+), (\d+), 1\.3',line)
    if m: OWL[round(float(m.group(1)),2)]=(float(m.group(2)),float(m.group(3)))
m=re.search(r'const CARRY = \[(.*?)\];',open('/Users/computer/rootline/apprentice-film/src/shots/s19/anim.js').read(),re.S)
for a,b,cc in re.findall(r'\[(\d+\.\d+), (\d+), (\d+)\]',m.group(1)): OWL[round(float(a),2)]=(float(b),float(cc)-30)
def owlat(t):
    ks=sorted(OWL); 
    xs=[OWL[k][0] for k in ks]; ys=[OWL[k][1] for k in ks]
    return np.interp(t,ks,xs),np.interp(t,ks,ys)
S=4
ANCH=np.float32([[51,160],[423,160],[92,201],[373,201],[196,80]])
prev=None; out={}
for t in sorted(rows):
    if t<61.76: out[t]=rows[t]; continue
    Q0=np.float32(np.array(rows[t]).reshape(4,2))
    ok,rv,tv=cv2.solvePnP(X3,Q0.astype(np.float64),Kc,None,flags=cv2.SOLVEPNP_IPPE)
    p0=np.r_[rv.ravel(),tv.ravel()]
    A0=proj(p0,ANCH)
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); _,fr=c.read(); g=cv2.cvtColor(fr,cv2.COLOR_BGR2GRAY)
    g=cv2.resize(g,(2206//S+1,946//S+1),interpolation=cv2.INTER_AREA)
    M=(g>150).astype(np.float32)
    W=np.ones_like(M); ox,oy=owlat(t)
    W[int((oy+40)/S):, int((ox-190)/S):int((ox+190)/S)]=0     # the owl's body/legs below the card
    def cost(p):
        Q=proj(p,U)
        if not np.all(np.isfinite(Q)): return 1e12
        R=np.zeros_like(M); cv2.fillPoly(R,[np.round(Q/S).astype(np.int32)],1)
        xor=(np.abs(R-M)*W).sum()
        A=proj(p,ANCH); vis=(A[:,1]>-10)&(A[:,0]<2216)
        anc=((A-A0)**2).sum(1)[vis].sum()/(S*S)
        return xor+0.08*anc
    best=None
    for init in ([p0] + ([prev] if prev is not None else [])):
        sc=np.array([0.02,0.02,0.02,20,20,20])
        sim=np.array([init]+[init+np.eye(6)[i]*sc[i] for i in range(6)])
        r=minimize(cost,init,method='Nelder-Mead',options={'maxiter':2500,'xatol':1e-4,'fatol':0.5,'initial_simplex':sim})
        if best is None or r.fun<best.fun: best=r
    prev=best.x
    Q=proj(best.x,U); out[t]=Q.ravel().tolist()
    print(t,'cost %.0f -> %.0f'%(cost(p0),best.fun),' '.join(f'({x:.0f},{y:.0f})' for x,y in Q))
json.dump({str(k):v for k,v in out.items()},open('rigidfit.json','w'))
