import cv2,numpy as np,json,re
from scipy.optimize import minimize
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
src=open('/Users/computer/rootline/apprentice-film/src/shots/s19/card.js').read()
rows=[[float(v) for v in re.findall(r'-?\d+\.?\d*',l)] for l in src.split('\n') if l.strip().startswith('[6') or l.strip().startswith('[5')]
rows={round(r[0],2):r[1:] for r in rows if len(r)==9}
U=np.float32([[0,0],[465,0],[465,648],[0,648]])
K=4
def rast(Q):
    m=np.zeros((946//K+1,2206//K+1),np.uint8)
    # rounded card: approximate by the quad
    cv2.fillPoly(m,[np.round(Q/K).astype(np.int32)],1); return m
ANCH=np.float32([[51,160],[423,160],[92,201],[373,201],[196,80]])
out={}
for t in sorted(rows):
    if t<61.76: out[t]=rows[t]; continue
    Q0=np.float32(np.array(rows[t]).reshape(4,2))
    H0=cv2.getPerspectiveTransform(U,Q0)
    A0=cv2.perspectiveTransform(ANCH.reshape(-1,1,2),H0).reshape(-1,2)
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
    g=cv2.resize(g,(2206//K+1,946//K+1),interpolation=cv2.INTER_AREA)
    M=(g>150).astype(np.float32)
    def cost(x):
        Q=x.reshape(4,2).astype(np.float32)
        R=rast(Q).astype(np.float32)
        xor=np.abs(R-M).sum()
        H=cv2.getPerspectiveTransform(U,Q); A=cv2.perspectiveTransform(ANCH.reshape(-1,1,2),H).reshape(-1,2)
        vis=(A[:,1]>-20)&(A[:,0]<2226)
        anc=((A-A0)**2).sum(1)[vis].sum()/(K*K)
        return xor+0.05*anc
    r=minimize(cost,Q0.ravel(),method='Nelder-Mead',options={'maxiter':3000,'xatol':0.5,'fatol':0.5,'initial_simplex':None})
    Q=r.x.reshape(4,2)
    out[t]=Q.ravel().tolist()
    print(t,'cost %.0f -> %.0f'%(cost(Q0.ravel()),r.fun),' '.join(f'({x:.0f},{y:.0f})' for x,y in Q))
json.dump({str(k):v for k,v in out.items()},open('ioufit.json','w'))
