import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap=cv2.VideoCapture(V)
def fr(i): cap.set(cv2.CAP_PROP_POS_FRAMES,i); ok,f=cap.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
H,W=946,2206; yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
bl=lambda x:cv2.GaussianBlur(x.astype(np.float32),(0,0),3)
def grid(fl,step=24):
    sm=cv2.GaussianBlur(fl,(0,0),step/2); nx,ny=W//step+2,H//step+2
    xs=np.minimum(np.arange(nx)*step,W-1); ys=np.minimum(np.arange(ny)*step,H-1); g=sm[ys][:,xs]
    fx=cv2.remap(g[...,0].astype(np.float32),xx/step,yy/step,cv2.INTER_LINEAR); fy=cv2.remap(g[...,1].astype(np.float32),xx/step,yy/step,cv2.INTER_LINEAR)
    return fx,fy
def ev(A,B,fl,step=24):
    fx,fy=grid(fl,step); Wp=cv2.remap(A,xx+fx,yy+fy,cv2.INTER_LINEAR); return np.abs(bl(Wp)-bl(B)).mean()
for (k,o) in [(568,-2),(572,2),(564,-2),(564,-1)]:
    A=fr(k); B=fr(k+o)
    r=[]
    for name,mk in [('medium',lambda: cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM))]:
        d=mk(); r.append((name,ev(A,B,d.calc(B,A,None))))
    d=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM); d.setFinestScale(0); d.setPatchSize(12); d.setPatchStride(4); d.setGradientDescentIterations(40); d.setVariationalRefinementIterations(10)
    r.append(('dis-fine',ev(A,B,d.calc(B,A,None))))
    f=cv2.calcOpticalFlowFarneback(B,A,None,0.5,6,31,5,7,1.5,0); r.append(('farneback',ev(A,B,f)))
    # chained: via intermediate frames
    if abs(o)==2:
        M=fr(k+o//2); d=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
        f1=d.calc(B,M,None); f2=d.calc(M,A,None)
        f2w=cv2.remap(f2,xx+f1[...,0],yy+f1[...,1],cv2.INTER_LINEAR); r.append(('chained',ev(A,B,f1+f2w)))
    for step in (12,):
        d=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM); r.append(('medium-step12',ev(A,B,d.calc(B,A,None),12)))
    print(k,o,'unwarped',round(float(np.abs(bl(A)-bl(B)).mean()),1),[(n,round(float(v),1)) for n,v in r])
