# Planar tracking by ECC image alignment against the reference frame pre-warped by the running estimate:
# H(t) maps ref-frame coords (T_REF) -> frame t. Region = polygon in the reference frame (eroded, masked).
# usage: ecc_track.py name tref tend quad [--blur=1.5] [--ignore=x0,y0,x1,y1@ta-tb;...] [--init=track.json]
import cv2, numpy as np, sys, json
from src import frame
name=sys.argv[1]; tref=float(sys.argv[2]); tend=float(sys.argv[3])
poly=np.float32([float(v) for v in sys.argv[4].split(',')]).reshape(-1,2)
opts={a.split('=')[0]:a.split('=',1)[1] for a in sys.argv[5:] if a.startswith('--')}
blur=float(opts.get('--blur',1.5))
ign=[]
if '--ignore' in opts:
    for s in opts['--ignore'].split(';'):
        r,tr=s.split('@'); x0,y0,x1,y1=[float(v) for v in r.split(',')]; ta,tb=[float(v) for v in tr.split('-')]
        ign.append((x0,y0,x1,y1,ta,tb))
init=None
if '--init' in opts:
    init={round(r[0],2):np.array(r[1:]).reshape(3,3) for r in json.load(open(opts['--init']))['H']}
Wd,Hd=2206,946
def prep(g): return cv2.GaussianBlur(g.astype(np.float32)/255,(0,0),blur)
ref=prep(frame(tref,True))
rm=np.zeros((Hd,Wd),np.uint8); cv2.fillPoly(rm,[np.int32(poly)],255); rm=cv2.erode(rm,np.ones((9,9),np.uint8))
step=0.04 if tend>tref else -0.04
ts=[round(tref+i*step,2) for i in range(int(round(abs(tend-tref)/0.04))+1)]
Hc=np.eye(3); out={tref:np.eye(3)}; prevH=np.eye(3); prev2=np.eye(3)
crit=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,80,1e-5)
for t in ts[1:]:
    g=prep(frame(t,True))
    # predict: constant velocity in H (compose last delta)
    D=prevH@np.linalg.inv(prev2) if len(out)>2 else np.eye(3)
    Hp=D@prevH
    if init is not None and round(t,2) in init and len(out)<=2: Hp=init[round(t,2)]
    # align: warp the frame back into the reference frame with Hp, then find the residual homography E (ref->ref)
    best=None
    for pyr in (0.5,1.0):
        W=cv2.warpPerspective(g,np.linalg.inv(Hp),(Wd,Hd),flags=cv2.INTER_LINEAR)
        m=rm.copy()
        for x0,y0,x1,y1,ta,tb in ign:
            if ta<=t<=tb:
                q=np.float32([[x0,y0],[x1,y0],[x1,y1],[x0,y1]]); q=cv2.perspectiveTransform(q[None],np.linalg.inv(Hp))[0]; cv2.fillPoly(m,[np.int32(q)],0)
        vis=cv2.warpPerspective(np.full((Hd,Wd),255,np.uint8),np.linalg.inv(Hp),(Wd,Hd),flags=cv2.INTER_NEAREST)
        m=m&cv2.erode(vis,np.ones((5,5),np.uint8))
        if pyr<1:
            a=cv2.resize(ref,None,fx=pyr,fy=pyr); b=cv2.resize(W,None,fx=pyr,fy=pyr); mm=cv2.resize(m,None,fx=pyr,fy=pyr,interpolation=cv2.INTER_NEAREST)
        else: a,b,mm=ref,W,m
        E=np.eye(3,dtype=np.float32)
        try:
            cc,E=cv2.findTransformECC(a,b,E,cv2.MOTION_HOMOGRAPHY,crit,mm,5)
        except cv2.error as e:
            print(name,t,'ecc fail',str(e)[:60]); cc=None
        if cc is None: continue
        if pyr<1:
            S=np.diag([pyr,pyr,1]); E=np.linalg.inv(S)@E@S
        # E maps ref coords -> W coords (W = frame warped by Hp^-1), so frame = Hp E ref
        Hp=Hp@E; Hp/=Hp[2,2]; best=cc
    prev2=prevH; prevH=Hp; out[t]=Hp
    c=cv2.perspectiveTransform(poly[None],Hp)[0]
    print(f"{name} {t:.2f} cc={best if best is None else round(best,4)} "+" ".join(f"({x:.1f},{y:.1f})" for x,y in c),flush=True)
old={}
try: old={round(r[0],2):r for r in json.load(open(f'../s27d-meas/ecc_{name}.json'))['H']}
except Exception: pass
for k,v in out.items(): old[round(k,2)]=[round(k,2)]+[round(float(x),9) for x in v.flatten()]
json.dump({'name':name,'tref':tref,'poly':poly.tolist(),'H':[old[k] for k in sorted(old)]},open(f'../s27d-meas/ecc_{name}.json','w'))
