import cv2,numpy as np,json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
U=np.float32([[51,160],[423,160],[423,600.5],[51,600.5]]); S=np.float32([[1124,206],[1550,188],[1612,725],[1065,708]])
H0=cv2.getPerspectiveTransform(U,S).astype(np.float64)
ref=grab(57.32)
tmpl=cv2.warpPerspective(ref,H0,(465,648),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP)
Y0,Y1=30,330
T=tmpl[Y0:Y1].copy(); Hc=np.array([[1,0,0],[0,1,Y0],[0,0,1]],np.float64)
hand=json.load(open('liftfit.json'))
crit=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,400,1e-7)
def P(H,u): q=H@np.array([u[0],u[1],1.0]); return q[:2]/q[2]
Cu=np.float32([[0,0],[465,0],[465,648],[0,648]])
prev=H0; res={}
for t in [61.48,61.52,61.56,61.60,61.64,61.68,61.72,61.76,61.80,61.84,61.88]:
    img=grab(t); cands=[('prev',prev)]
    k=str(t) if str(t) in hand else None
    if k: cands.append(('hand',cv2.getPerspectiveTransform(Cu,np.float32(np.array(hand[k]).reshape(4,2))).astype(np.float64)))
    best=None
    for nm,A in cands:
        try:
            W=(A@Hc).astype(np.float32)
            for blur in [9,5,3]: cc,W=cv2.findTransformECC(T,img,W,cv2.MOTION_HOMOGRAPHY,crit,None,blur)
            if best is None or cc>best[0]: best=(cc,nm,W.astype(np.float64)@np.linalg.inv(Hc))
        except cv2.error: pass
    cc,nm,H=best; H/=H[2,2]; prev=H
    C=[P(H,u) for u in Cu]
    res[t]=[float(v) for q in C for v in q]
    print(t,'cc %.3f'%cc,nm,' '.join(f'({x:.0f},{y:.0f})' for x,y in C),'TLbox',P(H,(51,160)).round(),'TRbox',P(H,(423,160)).round())
json.dump(res,open('liftecc.json','w'))
