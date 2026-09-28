import cv2,numpy as np,json,re
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
U=np.float32([[51,160],[423,160],[423,600.5],[51,600.5]]); S=np.float32([[1124,206],[1550,188],[1612,725],[1065,708]])
H0=cv2.getPerspectiveTransform(U,S).astype(np.float64)
ref=grab(57.32)
tmpl=cv2.warpPerspective(ref,H0,(465,648),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP)
Y0,Y1=140,330
T=tmpl[Y0:Y1].copy(); Hc=np.array([[1,0,0],[0,1,Y0],[0,0,1]],np.float64)
ecc3=json.load(open('ecc3.json'))
rows=[]
for line in open('card_table.js'):
    m=re.findall(r'-?\d+\.?\d*',line)
    if len(m)==9: rows.append([float(v) for v in m])
Cu=np.float32([[0,0],[465,0],[465,648],[0,648]])
def tabH(t):
    r=min(rows,key=lambda r:abs(r[0]-t)); return cv2.getPerspectiveTransform(Cu,np.float32(np.array(r[1:]).reshape(4,2))).astype(np.float64)
def P(H,u): q=H@np.array([u[0],u[1],1.0]); return q[:2]/q[2]
crit=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,400,1e-7)
prev=np.array(ecc3['62.56']); res={}
for i,t in enumerate([round(62.60+0.04*k,2) for k in range(13)]):
    img=grab(t)
    # init: previous H shifted by the table's text-start motion (positions in the table are reliable)
    d=P(tabH(t),(85,205))-P(tabH(round(t-0.04,2)),(85,205))
    Tm=np.array([[1,0,d[0]],[0,1,d[1]],[0,0,1.0]])
    best=None
    for A in [Tm@prev, prev]:
        try:
            W=(A@Hc).astype(np.float32)
            for blur in [11,5,3]: cc,W=cv2.findTransformECC(T,img,W,cv2.MOTION_HOMOGRAPHY,crit,None,blur)
            if best is None or cc>best[0]: best=(cc,W.astype(np.float64)@np.linalg.inv(Hc))
        except cv2.error: pass
    cc,H=best; H/=H[2,2]; prev=H; res[t]=H.tolist()
    a,b=P(H,(85,205)),P(H,(381,205))
    print(t,'cc %.3f'%cc,'text',a.round(),b.round(),'ang %.1f'%np.degrees(np.arctan2(b[1]-a[1],b[0]-a[0])))
json.dump(res,open('lateecc.json','w'))
