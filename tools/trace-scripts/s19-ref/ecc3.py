import cv2,numpy as np,sys,json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
U=np.float32([[51,160],[423,160],[423,600.5],[51,600.5]]); S=np.float32([[1124,206],[1550,188],[1612,725],[1065,708]])
H0=cv2.getPerspectiveTransform(U,S).astype(np.float64)
ref=grab(57.32)
tmpl=cv2.warpPerspective(ref,H0,(465,648),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP)
Y0,Y1=140,330
T=tmpl[Y0:Y1].copy()
Hc=np.array([[1,0,0],[0,1,Y0],[0,0,1]],np.float64)
obs={
 61.52:dict(TL=(1108,150),T=(1150,183),d=(1520,167)), 61.60:dict(TL=(1075,122),T=(1113,163),d=(1500,130)),
 61.68:dict(TL=(975,110),T=(1020,143),d=(1433,93)), 61.76:dict(TL=(820,107),T=(870,148),d=(1292,82)),
 61.84:dict(TL=(759,105),T=(814,149),d=(1221,50)), 61.92:dict(TL=(742,122),T=(783,163),d=(1192,47)),
 62.00:dict(TL=(725,110),T=(775,160),d=(1183,43)), 62.08:dict(TL=(700,107),T=(750,157),d=(1158,23)),
 62.16:dict(TL=(713,100),T=(767,142),ang=-21), 62.24:dict(TL=(775,97),T=(825,138),ang=-24),
 62.32:dict(TL=(850,60),T=(900,110),ang=-25), 62.40:dict(TL=(925,82),T=(975,123),ang=-30),
 62.48:dict(TL=(1033,75),T=(1083,117),ang=-29), 62.56:dict(TL=(1083,72),T=(1133,122),ang=-29),
 62.64:dict(TL=(1175,60),T=(1233,110),ang=-29), 62.72:dict(TL=(1275,82),T=(1333,132),ang=-29),
 62.80:dict(TL=(1383,75),T=(1442,117),ang=-29), 62.88:dict(TL=(1500,63),T=(1558,122),ang=-29),
 62.96:dict(TL=(1608,68),T=(1667,127),ang=-29), 63.04:dict(TL=(1708,73),T=(1767,123),ang=-29),
}
UV={'TL':(51,160),'T':(92,201),'d':(373,201)}
def coarse(o):
    if 'd' in o:
        src=np.float32([UV[k] for k in ['TL','T','d']]); dst=np.float32([o[k] for k in ['TL','T','d']])
        M,_=cv2.estimateAffinePartial2D(src,dst); return np.vstack([M,[0,0,1]])
    a=np.radians(o['ang']); s=1.25
    R=np.array([[s*np.cos(a),-s*np.sin(a)],[s*np.sin(a),s*np.cos(a)]])
    tl=np.array(o['TL'],float); t=tl-R@np.array([51,160.])
    return np.vstack([np.hstack([R,t[:,None]]),[0,0,1]])
crit=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,400,1e-7)
def refine(img,A):
    W=(A@Hc)[:2].astype(np.float32)
    for blur in [21,11,5]:
        cc,W=cv2.findTransformECC(T,img,W,cv2.MOTION_AFFINE,crit,None,blur)
    Wh=np.vstack([W,[0,0,1]]).astype(np.float32)
    cc2,Wh=cv2.findTransformECC(T,img,Wh,cv2.MOTION_HOMOGRAPHY,crit,None,3)
    return cc2,Wh.astype(np.float64)@np.linalg.inv(Hc)
res={}; prev=None; prev2=None
ts=[round(61.44+0.04*i,2) for i in range(42)]
for t in ts:
    img=grab(t); cands=[]
    if prev is not None: cands.append(prev)
    if prev2 is not None: cands.append(prev@np.linalg.inv(prev2)@prev)
    near=min(obs,key=lambda k:abs(k-t))
    if abs(near-t)<0.045: cands.append(coarse(obs[near]))
    if t<=61.48: cands.append(H0)
    best=None
    for A in cands:
        try:
            cc,Hu=refine(img,A/A[2,2])
            if best is None or cc>best[0]: best=(cc,Hu)
        except cv2.error: pass
    if best is None: print(t,'fail'); continue
    cc,Hu=best; Hu=Hu/Hu[2,2]
    prev2,prev=prev,Hu
    res[t]=Hu.tolist()
    P=cv2.perspectiveTransform(np.float32([[51,160],[423,160],[92,201],[373,201],[196,80]]).reshape(-1,1,2),Hu).reshape(-1,2)
    print(f'{t:.2f} cc={cc:.3f} '+' '.join(f'({x:.0f},{y:.0f})' for x,y in P))
json.dump(res,open('ecc3.json','w'))
