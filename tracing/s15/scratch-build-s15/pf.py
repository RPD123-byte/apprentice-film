# pair fits (similarity) between consecutive frames, owl masked. usage: pf.py T0 T1 STEP [renderdir]
import cv2, numpy as np, sys, re, json, glob, os
ROOT='/Users/computer/rootline/apprentice-film'
SRC=os.path.dirname(os.path.abspath(__file__))+'/src'
src=open(ROOT+'/src/shots/s15/track.js').read()
OWL=json.loads(re.search(r'export const OWL = (\[.*?\]\]);',src,re.S).group(1))
def owl(t): return min(OWL,key=lambda r:abs(r[0]-t))
orb=cv2.ORB_create(4000); bf=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True)
def mask_for(g,t):
    m=np.full(g.shape,255,np.uint8); o=owl(t)
    x0=int(o[1]-o[3]*0.8); x1=int(o[1]+o[3]*0.8); y0=int(o[2]-o[4]*1.2); y1=int(o[2]+o[4]*1.1)
    m[max(0,y0):y1,max(0,x0):x1]=0; return m
def fit(a,b,ta,tb):
    ka,da=orb.detectAndCompute(a,mask_for(a,ta)); kb,db=orb.detectAndCompute(b,mask_for(b,tb))
    if da is None or db is None: return None
    m=sorted(bf.match(da,db),key=lambda x:x.distance)[:800]
    if len(m)<10: return None
    A=np.float32([ka[x.queryIdx].pt for x in m]); B=np.float32([kb[x.trainIdx].pt for x in m])
    M,inl=cv2.estimateAffinePartial2D(A,B,ransacReprojThreshold=3)
    if M is None: return None
    s=np.hypot(M[0,0],M[1,0]); r=np.degrees(np.arctan2(M[1,0],M[0,0])); return s,M[0,2],M[1,2],int(inl.sum()),r
def srcf(t): return cv2.imread(SRC+'/f%04d.png'%round(t*25),0)
rdir=sys.argv[4] if len(sys.argv)>4 else None
def renf(t):
    for p in glob.glob(rdir+'/frame-*.png'):
        tt=float(re.search(r'at-([\d.]+)s',p).group(1))
        if abs(tt-t)<0.005: return cv2.imread(p,0)
    return None
t0,t1,st=map(float,sys.argv[1:4])
n=int(round((t1-t0)/st))
f=lambda x: 'nofit' if x is None else f'{x[0]:.3f} rot{x[4]:+5.2f} fp=({x[1]/(1-x[0]) if abs(1-x[0])>0.01 else 0:6.0f},{x[2]/(1-x[0]) if abs(1-x[0])>0.01 else 0:6.0f}) n={x[3]:3d}'
for i in range(n):
    a=t0+i*st; b=a+st
    s=fit(srcf(a),srcf(b),a,b)
    line=f'{a:.2f}->{b:.2f} S: {f(s):45s}'
    if rdir:
        ra,rb=renf(a),renf(b)
        r=fit(ra,rb,a,b) if ra is not None and rb is not None else None
        line+=f' | R: {f(r)}'
    print(line)
