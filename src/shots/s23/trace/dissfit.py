import cv2, numpy as np, math, sys, json
from scipy.optimize import minimize
import fgx
SC=0.5
C,A=fgx.stripLayer()
P=fgx.plate('H1')
W,H=2206,946
w2,h2=int(W*SC),int(H*SC)
Cs=cv2.resize(C,(w2,h2),interpolation=cv2.INTER_AREA); As=cv2.resize(A,(w2,h2),interpolation=cv2.INTER_AREA); Ps=cv2.resize(P,(w2,h2),interpolation=cv2.INTER_AREA)
def M(p):
    s,rd,tx,ty=p; r=math.radians(rd); a=s*math.cos(r); b=s*math.sin(r)
    # full-res similarity -> half-res: x' = SC*(a*(x/SC) - b*(y/SC) + tx)
    return np.float32([[a,-b,tx*SC],[b,a,ty*SC]])
def comp(p):
    Cw=cv2.warpAffine(Cs,M(p),(w2,h2)); Aw=cv2.warpAffine(As,M(p),(w2,h2))
    return Cw+Ps*(1-Aw[...,None]), Aw
def run(k, pa, pb, w0):
    F=fgx.load(k); Fs=cv2.resize(F,(w2,h2),interpolation=cv2.INTER_AREA)
    # region of interest: union of both strips, minus the owl (bright blobs below y 180 excluded roughly by robust loss)
    d0=np.abs(Fs-Ps).max(-1)>0.06
    ROI=cv2.dilate(d0.astype(np.uint8),np.ones((5,5),np.uint8))>0
    ROI[:, :int(900*SC)]=False
    def err(x):
        A_=[x[0],x[1],x[2],x[3]]; B_=[x[4],x[5],x[6],x[7]]; w=min(1,max(0,x[8]))
        ca,aa=comp(A_); cb,ab=comp(B_)
        m=(1-w)*ca+w*cb
        d=np.abs(m-Fs).mean(-1)[ROI]
        d=np.minimum(d,0.25)     # robust: the owl ghosts
        return float(d.mean())
    x0=np.array(pa+pb+[w0],float)
    r=minimize(err,x0,method='Powell',options={'xtol':0.05,'ftol':1e-5,'maxfev':4000})
    return r.x, r.fun, err(x0)
if __name__=='__main__':
    out={}
    prevA=[1.0018,6.75,1142.2,-234.1]; prevB=[1.0018,6.75,1150,-240]
    guesses={2140:([1.0038,6.75,1141.2,-235.2],[1.0,8.0,1180,-250],0.3),2141:([1.0,6.75,1141,-235],[1.0,9,1220,-260],0.5),
             2142:([1.0,6.75,1141,-235],[1.0,10,1260,-270],0.6),2143:([1.0,6.75,1141,-235],[0.9928,12.46,1322.9,-291.6],0.8),
             2144:([1.0,6.75,1141,-235],[0.9986,12.11,1353.0,-291.8],0.9),2139:([1.0018,6.75,1142.2,-234.1],[1.0,7,1150,-238],0.12)}
    for k in [2139,2140,2141,2142,2143,2144]:
        pa,pb,w0=guesses[k]
        x,f,f0=run(k,pa,pb,w0)
        print(k,'err %.4f -> %.4f'%(f0,f),'A',np.round(x[:4],3).tolist(),'B',np.round(x[4:8],3).tolist(),'w %.3f'%x[8])
