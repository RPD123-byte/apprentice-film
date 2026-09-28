import cv2, numpy as np, math
from scipy.optimize import minimize
import fgx
C,A=fgx.stripLayer(); P=fgx.plate('H1')
def M(p):
    s,rd,tx,ty=p; r=math.radians(rd); a=s*math.cos(r); b=s*math.sin(r)
    return np.float32([[a,-b,tx],[b,a,ty]])
def fit(k,p0):
    F=fgx.load(k)
    d0=np.abs(F-P).max(-1)>0.06
    ROI=cv2.dilate(d0.astype(np.uint8),np.ones((7,7),np.uint8))>0
    ROI[:, :1300]=False
    def err(x):
        p=[x[0],x[1],x[2],x[3]]
        Cw=cv2.warpAffine(C,M(p),(2206,946)); Aw=cv2.warpAffine(A,M(p),(2206,946))
        m=Cw+P*(1-Aw[...,None])
        d=np.abs(m-F).mean(-1)[ROI]
        return float(np.minimum(d,0.25).mean())
    r=minimize(err,np.array(p0,float),method='Powell',options={'xtol':0.05,'ftol':1e-5,'maxfev':3000})
    return r.x,r.fun,err(np.array(p0,float))
for k,p0 in [(2145,[1.001,12.0,1388.2,-290.1]),(2146,[0.9962,11.75,1414.6,-280.6]),(2147,[0.9984,18.08,1529.8,-388.7]),(2148,[0.9984,22,1700,-520]),(2149,[0.9984,24,1850,-640])]:
    x,f,f0=fit(k,p0)
    print(k,'err %.4f -> %.4f'%(f0,f),np.round(x,3).tolist())
