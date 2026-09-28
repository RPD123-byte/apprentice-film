import cv2,numpy as np,json
from scipy.optimize import least_squares
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
U=np.float32([[51,160],[423,160],[423,600.5],[51,600.5]]); S=np.float32([[1124,206],[1550,188],[1612,725],[1065,708]])
H0=cv2.getPerspectiveTransform(U,S).astype(np.float64)
ref=grab(57.32)
tmpl=cv2.warpPerspective(ref,H0,(465,648),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP)
# hand readings (frame px): textbox TL, TR, BR, and y of the card bottom edge at x~1300, x of left/right edges at a y
obs={
 61.56:dict(TL=(1110,150),TR=(1560,124),BR=(1594,720),bot=790,L=(1060,300),R=(1660,400)),
 61.60:dict(TL=(1070,130),TR=(1550,84),BR=(1580,720),bot=790,L=(994,400),R=(1654,400)),
 61.64:dict(TL=(1040,110),TR=(1530,60),BR=(1580,716),bot=790,L=(990,300),R=(1644,400)),
 61.68:dict(TL=(980,90),TR=(1530,30),BR=(1560,710),bot=780,L=(940,300),R=(1630,400)),
 61.72:dict(TL=(910,110),TR=(1460,26),BR=(1560,716),bot=774,L=(860,450)),
 61.76:dict(TL=(860,130),TR=(1390,10),BR=(1570,712),bot=770),
}
def Hof(p): return np.array([[p[0],p[1],p[2]],[p[3],p[4],p[5]],[p[6],p[7],1.0]])
def P(H,u): q=H@np.array([u[0],u[1],1.0]); return q[:2]/q[2]
out={}
Hprev=None
crit=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,300,1e-7)
Y0,Y1=140,330
T=tmpl[Y0:Y1].copy(); Hc=np.array([[1,0,0],[0,1,Y0],[0,0,1]],np.float64)
for t,o in obs.items():
    Hi=cv2.getPerspectiveTransform(np.float32([[51,160],[423,160],[423,600.5],[0,648]]),np.float32([o['TL'],o['TR'],o['BR'],[ (o['L'][0] if 'L' in o else o['TL'][0]-60)-20, o['bot']-5]]))
    p0=(Hi/Hi[2,2]).ravel()[:8]
    def res(p):
        H=Hof(p); r=[]
        for k,u in [('TL',(51,160)),('TR',(423,160)),('BR',(423,600.5))]: r+=list(P(H,u)-np.array(o[k]))
        # bottom edge y at the card's bottom middle
        b=P(H,(300,648)); r.append((b[1]-o['bot']))
        if 'L' in o:
            a0,a1=P(H,(0,0)),P(H,(0,648)); y=o['L'][1]; f=(y-a0[1])/(a1[1]-a0[1]); r.append((a0[0]+(a1[0]-a0[0])*f-o['L'][0]))
        if 'R' in o:
            a0,a1=P(H,(465,0)),P(H,(465,648)); y=o['R'][1]; f=(y-a0[1])/(a1[1]-a0[1]); r.append((a0[0]+(a1[0]-a0[0])*f-o['R'][0]))
        return np.array(r)
    sol=least_squares(res,p0,x_scale='jac')
    H=Hof(sol.x)
    # ECC refine on the upper band, keep if it agrees
    img=grab(t)
    try:
        W=(H@Hc).astype(np.float32)
        cc,W=cv2.findTransformECC(T,img,W,cv2.MOTION_HOMOGRAPHY,crit,None,5)
        He=W.astype(np.float64)@np.linalg.inv(Hc); He/=He[2,2]
        d=max(np.linalg.norm(P(He,u)-P(H,u)) for u in [(51,160),(423,160),(196,80)])
    except cv2.error: cc,He,d=0,H,999
    use=He if (cc>0.6 and d<40) else H
    C=[P(use,u) for u in [(0,0),(465,0),(465,648),(0,648)]]
    print(t,'hand rms %.1f'%np.sqrt(np.mean(sol.fun**2)),'ecc %.3f d=%.0f'%(cc,d),'use','ecc' if use is He else 'hand',' '.join(f'({x:.0f},{y:.0f})' for x,y in C), 'smiley',P(use,(196,80)).round())
    out[t]=[v for q in C for v in q]
json.dump(out,open('liftfit.json','w'))
