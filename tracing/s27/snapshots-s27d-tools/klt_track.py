# KLT planar tracker: H(t) maps reference-frame coords (T_REF) -> frame t. Points tracked frame to frame with pyramidal
# LK + forward/backward check; homography (or affine/similarity) by RANSAC; points re-seeded inside the warped
# region when they thin out (their reference coords back-projected through the current H).
# usage: klt_track.py name tref tend model poly [--ignore=x0,y0,x1,y1@ta-tb;...] [--maxerr=2]
import cv2, numpy as np, sys, json
from src import frame
name=sys.argv[1]; tref=float(sys.argv[2]); tend=float(sys.argv[3]); model=sys.argv[4]
poly=np.float32([float(v) for v in sys.argv[5].split(',')]).reshape(-1,2)
opts={a.split('=')[0]:a.split('=',1)[1] for a in sys.argv[6:] if a.startswith('--')}
ign=[]
if '--ignore' in opts:
    for s in opts['--ignore'].split(';'):
        r,tr=s.split('@'); x0,y0,x1,y1=[float(v) for v in r.split(',')]; ta,tb=[float(v) for v in tr.split('-')]
        ign.append((x0,y0,x1,y1,ta,tb))
Wd,Hd=2206,946
def pmask(P,erode=6):
    m=np.zeros((Hd,Wd),np.uint8); cv2.fillPoly(m,[np.int32(np.round(P))],255)
    if erode: m=cv2.erode(m,np.ones((erode*2+1,)*2,np.uint8))
    return m
def imask(t):
    m=np.full((Hd,Wd),255,np.uint8)
    for x0,y0,x1,y1,ta,tb in ign:
        if ta<=t<=tb: m[max(0,int(y0)):int(y1),max(0,int(x0)):int(x1)]=0
    return m
lk=dict(winSize=(21,21),maxLevel=4,criteria=(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,40,0.01))
def fit(A,B):
    if len(A)<6: return None,None
    if model=='homography': M,inl=cv2.findHomography(A,B,cv2.RANSAC,1.5)
    else:
        M,inl=(cv2.estimateAffine2D if model=='affine' else cv2.estimateAffinePartial2D)(A,B,ransacReprojThreshold=1.5)
        if M is not None: M=np.vstack([M,[0,0,1]])
    return M,inl
def run(direction):
    step=0.04*direction
    n=int(round(abs(tend-tref)/0.04)) if (tend-tref)*direction>0 else 0
    ts=[round(tref+i*step,3) for i in range(n+1)]
    out={}
    g0=frame(tref,True)
    m0=pmask(poly)&imask(tref)
    P=cv2.goodFeaturesToTrack(g0,1500,0.005,6,mask=m0)
    if P is None: return out
    cur=P.reshape(-1,2).astype(np.float32); refp=cur.copy()
    Hc=np.eye(3); prev=g0; out[ts[0]]=Hc.copy()
    for t in ts[1:]:
        g=frame(t,True)
        if len(cur)>=6:
            nxt,st,_=cv2.calcOpticalFlowPyrLK(prev,g,cur.reshape(-1,1,2),None,**lk)
            bck,st2,_=cv2.calcOpticalFlowPyrLK(g,prev,nxt,None,**lk)
            fb=np.linalg.norm(bck.reshape(-1,2)-cur,axis=1)
            ok=(st.ravel()==1)&(st2.ravel()==1)&(fb<0.7)
            nxt=nxt.reshape(-1,2)
            im=imask(t); inside=np.array([0<=x<Wd and 0<=y<Hd and im[int(y),int(x)]>0 for x,y in nxt]) if len(nxt) else np.zeros(0,bool)
            ok&=inside
            cur=nxt[ok]; refp=refp[ok]
        if len(cur)<8: print(name,t,'lost',len(cur)); break
        M,inl=fit(refp,cur)
        if M is None: print(name,t,'nofit'); break
        inl=inl.ravel().astype(bool)
        # drop outliers (moving parts / occluders)
        err=np.linalg.norm(cv2.perspectiveTransform(refp.reshape(-1,1,2),M).reshape(-1,2)-cur,axis=1)
        keep=err<3.0
        cur=cur[keep]; refp=refp[keep]
        Hc=M/M[2,2]; out[t]=Hc.copy()
        # reseed
        if len(cur)<500:
            wp=cv2.perspectiveTransform(poly[None],Hc)[0]
            m=pmask(wp)&imask(t)
            for x,y in cur: cv2.circle(m,(int(x),int(y)),6,0,-1)
            Q=cv2.goodFeaturesToTrack(g,1200-len(cur),0.005,6,mask=m)
            if Q is not None:
                Q=Q.reshape(-1,2).astype(np.float32)
                R=cv2.perspectiveTransform(Q.reshape(-1,1,2),np.linalg.inv(Hc)).reshape(-1,2)
                cur=np.vstack([cur,Q]); refp=np.vstack([refp,R])
        c=cv2.perspectiveTransform(poly[None],Hc)[0]
        print(f"{name} {t:.2f} pts={len(cur)} inl={int(inl.sum())} "+" ".join(f"({x:.0f},{y:.0f})" for x,y in c[:4]),flush=True)
        prev=g
    return out
out=run(+1); out.update(run(-1))
rows=[[k]+[round(float(v),8) for v in out[k].flatten()] for k in sorted(out)]
json.dump({'name':name,'tref':tref,'poly':poly.tolist(),'model':model,'H':rows},open(f'../s27d-meas/klt_{name}.json','w'))
