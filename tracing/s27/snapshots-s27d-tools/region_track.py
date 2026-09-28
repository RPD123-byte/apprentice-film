# Track a planar region through the source: H(t) maps reference-frame coords (at T_REF) -> frame t coords.
# Chained frame to frame (SIFT inside the warped region polygon), with a re-anchor against the reference frame
# pre-warped by the running estimate every frame (limits drift).  model: homography | affine | similarity
# usage: region_track.py name tref t_end step model x0,y0,x1,y1,... [--exclude poly;poly] [--ignore x0,y0,x1,y1@t0-t1]
import cv2, numpy as np, sys, json
from src import frame, times
name=sys.argv[1]; tref=float(sys.argv[2]); tend=float(sys.argv[3]); step=float(sys.argv[4]); model=sys.argv[5]
poly=np.float32([float(v) for v in sys.argv[6].split(',')]).reshape(-1,2)
ign=[]
for a in sys.argv[7:]:
    if a.startswith('--ignore='):
        for s in a[9:].split(';'):
            r,tr=s.split('@'); x0,y0,x1,y1=[float(v) for v in r.split(',')]; ta,tb=[float(v) for v in tr.split('-')]
            ign.append((x0,y0,x1,y1,ta,tb))
ref=frame(tref,True)
Wd,Hd=2206,946
def polymask(P,shape=(Hd,Wd)):
    m=np.zeros(shape,np.uint8); cv2.fillPoly(m,[np.int32(np.round(P))],255); return m
sift=cv2.SIFT_create(6000); bf=cv2.BFMatcher(cv2.NORM_L2)
def fit(A,B):
    if model=='homography': M,inl=cv2.findHomography(A,B,cv2.RANSAC,2.5); return (M,inl)
    if model=='affine': M,inl=cv2.estimateAffine2D(A,B,ransacReprojThreshold=2.5)
    else: M,inl=cv2.estimateAffinePartial2D(A,B,ransacReprojThreshold=2.5)
    if M is None: return None,None
    return np.vstack([M,[0,0,1]]),inl
def step_est(src_img,src_mask,dst_img,dst_mask):
    k1,d1=sift.detectAndCompute(src_img,src_mask); k2,d2=sift.detectAndCompute(dst_img,dst_mask)
    if d1 is None or d2 is None or len(k1)<6 or len(k2)<6: return None,0
    m=bf.knnMatch(d1,d2,k=2); good=[a for a,b in (x for x in m if len(x)==2) if a.distance<0.8*b.distance]
    if len(good)<8: return None,0
    A=np.float32([k1[x.queryIdx].pt for x in good]); B=np.float32([k2[x.trainIdx].pt for x in good])
    M,inl=fit(A,B)
    if M is None: return None,0
    return M,int(inl.sum())
def ignore_mask(t):
    m=np.full((Hd,Wd),255,np.uint8)
    for x0,y0,x1,y1,ta,tb in ign:
        if ta<=t<=tb: m[int(y0):int(y1),int(x0):int(x1)]=0
    return m
out={}
for direction in (+1,-1):
    Hc=np.eye(3); prev=ref; prevP=poly.copy(); tp=tref
    tt=times(tref,tend,abs(step)) if (direction>0 and tend>tref) else []
    if direction<0:
        if len(sys.argv)>7 and any(a.startswith('--back=') for a in sys.argv):
            tb=float([a for a in sys.argv if a.startswith('--back=')][0][7:]); n=int(round((tref-tb)/abs(step))); tt=[round(tref-i*abs(step),3) for i in range(n+1)]
        else: continue
    for t in tt:
        if abs(t-tref)<1e-6: out[round(t,3)]=np.eye(3); continue
        g=frame(t,True)
        P=cv2.perspectiveTransform(prevP[None],np.eye(3))[0]
        big=cv2.dilate(polymask(P),np.ones((61,61),np.uint8))&ignore_mask(t)
        pm=polymask(prevP)&ignore_mask(tp)
        D,n1=step_est(prev,pm,g,big)
        if D is None: print(name,t,'lost'); break
        Hn=D@Hc
        # re-anchor: reference warped by Hn vs current frame
        for it in range(2):
            wr=cv2.warpPerspective(ref,Hn,(Wd,Hd)); wmask=cv2.erode(polymask(cv2.perspectiveTransform(poly[None],Hn)[0]),np.ones((7,7),np.uint8))&ignore_mask(t)
            E,n2=step_est(wr,wmask,g,big)
            if E is None: break
            Hn=E@Hn
            if np.abs(E-np.eye(3)).max()<2e-4: break
        Hn=Hn/Hn[2,2]; Hc=Hn
        prev=g; prevP=cv2.perspectiveTransform(poly[None],Hc)[0]; tp=t
        out[round(t,3)]=Hc
        c=prevP
        print(f"{name} {t:.2f} n={n1} "+" ".join(f"({x:.0f},{y:.0f})" for x,y in c[:4]),flush=True)
rows=[[k]+[round(float(v),8) for v in out[k].flatten()] for k in sorted(out)]
json.dump({'name':name,'tref':tref,'poly':poly.tolist(),'model':model,'H':rows},open(f'../s27d-meas/trk_{name}.json','w'))
