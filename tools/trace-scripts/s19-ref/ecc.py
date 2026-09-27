import cv2,numpy as np,sys,json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
U=np.float32([[51,160],[423,160],[423,600.5],[51,600.5]]); S=np.float32([[1124,206],[1550,188],[1612,725],[1065,708]])
H0=cv2.getPerspectiveTransform(U,S)
K=1.0
ref=grab(57.32)
Tw,Th=int(465*K),int(648*K)
Hs=np.diag([1/K,1/K,1]).astype(np.float64)
tmpl=cv2.warpPerspective(ref,H0@Hs,(Tw,Th),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP)
cv2.imwrite('ecc_tmpl.png',tmpl)
y0,y1=int(float(sys.argv[4])*K),int(float(sys.argv[5])*K)
T=tmpl[y0:y1].copy()
Hcrop=np.array([[1,0,0],[0,1,y0],[0,0,1]],np.float64)
t0,t1,st=float(sys.argv[1]),float(sys.argv[2]),float(sys.argv[3])
Hcur=H0@Hs@Hcrop
Hprev=Hcur.copy()
out={}
t=t0
crit=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,300,1e-6)
while t<=t1+1e-6:
    img=grab(t)
    # predict: constant velocity in homography space (simple)
    guess=Hcur@np.linalg.inv(Hprev)@Hcur if t>t0 else Hcur
    best=None
    for init in [Hcur,guess]:
        W=(init/init[2,2]).astype(np.float32)
        try:
            for blur in [9,5,1]:
                cc,W=cv2.findTransformECC(T,img,W,cv2.MOTION_HOMOGRAPHY,crit,None,blur)
            if best is None or cc>best[0]: best=(cc,W.copy())
        except cv2.error as e:
            pass
    if best is None: print(f'{t:.2f} fail'); t+=st; continue
    cc,W=best
    Hprev,Hcur=Hcur,W.astype(np.float64)
    Hunits=Hcur@np.linalg.inv(Hcrop)@np.linalg.inv(Hs)
    C=cv2.perspectiveTransform(np.float32([[0,0],[465,0],[465,648],[0,648]]).reshape(-1,1,2),Hunits).reshape(-1,2)
    out[round(t,2)]=(Hunits/Hunits[2,2]).tolist()
    print(f'{t:.2f} cc={cc:.3f} corners '+' '.join(f'({x:.0f},{y:.0f})' for x,y in C))
    t+=st
json.dump(out,open(sys.argv[6],'w'))
