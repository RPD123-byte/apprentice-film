import cv2,numpy as np,sys,json
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
U=np.float32([[51,160],[423,160],[423,600.5],[51,600.5]]); S=np.float32([[1124,206],[1550,188],[1612,725],[1065,708]])
H0=cv2.getPerspectiveTransform(U,S).astype(np.float64)
ref=grab(57.32)
tmpl=cv2.warpPerspective(ref,H0,(465,648),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP)
Y0,Y1=int(sys.argv[1]),int(sys.argv[2])
T=tmpl[Y0:Y1].copy()
Hc=np.array([[1,0,0],[0,1,Y0],[0,0,1]],np.float64)
obs={
 61.52:dict(TL=(1108,150),T=(1150,183),d=(1520,167)),
 61.60:dict(TL=(1075,122),T=(1113,163),d=(1500,130)),
 61.68:dict(TL=(975,110),T=(1020,143),d=(1433,93)),
 61.76:dict(TL=(820,107),T=(870,148),d=(1292,82)),
 61.84:dict(TL=(759,105),T=(814,149),d=(1221,50)),
 61.92:dict(TL=(742,122),T=(783,163),d=(1192,47)),
 62.00:dict(TL=(725,110),T=(775,160),d=(1183,43)),
 62.08:dict(TL=(700,107),T=(750,157),d=(1158,23)),
}
UV={'TL':(51,160),'T':(92,201),'d':(373,201)}
crit=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,400,1e-7)
res={}
for t,o in obs.items():
    src=np.float32([UV[k] for k in o]); dst=np.float32([o[k] for k in o])
    M,_=cv2.estimateAffinePartial2D(src,dst)
    A=np.vstack([M,[0,0,1]])@Hc
    img=grab(t)
    W=A[:2].astype(np.float32); cc=None
    try:
        for blur in [21,11,5]:
            cc,W=cv2.findTransformECC(T,img,W,cv2.MOTION_AFFINE,crit,None,blur)
        Wh=np.vstack([W,[0,0,1]]).astype(np.float32)
        cc2,Wh=cv2.findTransformECC(T,img,Wh,cv2.MOTION_HOMOGRAPHY,crit,None,3)
    except cv2.error as e:
        print(t,'ecc fail',str(e)[:60]); continue
    Hu=Wh.astype(np.float64)@np.linalg.inv(Hc)
    C=cv2.perspectiveTransform(np.float32([[0,0],[465,0],[465,648],[0,648]]).reshape(-1,1,2),Hu).reshape(-1,2)
    Pk=cv2.perspectiveTransform(np.float32([UV[k] for k in UV]).reshape(-1,1,2),Hu).reshape(-1,2)
    print(f'{t:.2f} cc={cc:.3f}/{cc2:.3f} pts '+' '.join(f'{k}=({x:.0f},{y:.0f})' for k,(x,y) in zip(UV,Pk))+' corners '+' '.join(f'({x:.0f},{y:.0f})' for x,y in C))
    res[t]=(Hu/Hu[2,2]).tolist()
    # overlay check
    f=cv2.cvtColor(img.astype(np.uint8),cv2.COLOR_GRAY2BGR)
    cv2.polylines(f,[C.astype(np.int32)],True,(0,0,255),2)
    box=cv2.perspectiveTransform(np.float32([[51,160],[423,160],[423,600.5],[51,600.5]]).reshape(-1,1,2),Hu).reshape(-1,2)
    cv2.polylines(f,[box.astype(np.int32)],True,(0,255,0),2)
    cv2.imwrite(f'ecc2-{t:.2f}.jpg',cv2.resize(f,None,fx=0.4,fy=0.4))
json.dump(res,open('ecc2.json','w'))
