import cv2, numpy as np, glob, re, sys
sys.path.insert(0,'.')
D='snapshots/s15-rev1-takes'
fs=sorted(glob.glob(D+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
times=[float(re.search(r'at-([\d.]+)s',p).group(1)) for p in fs]
# owl track
src=open('src/shots/s15/track.js').read()
import json
OWL=json.loads(re.search(r'export const OWL = (\[.*?\]\]);',src,re.S).group(1))
def owl(t):
    best=min(OWL,key=lambda r:abs(r[0]-t)); return best
takes=[(40.96,41.64),(41.96,42.64),(42.92,43.64),(43.92,44.40),(44.48,44.84),(44.88,45.44)]
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
    s=np.hypot(M[0,0],M[1,0]); return s,M[0,2],M[1,2],int(inl.sum())
for a,b in takes:
    idx=[i for i,t in enumerate(times) if a-1e-6<=t<=b+1e-6]
    print(f'--- take {a}-{b}  (consecutive-pair fits: scale, tx, ty, inliers)  render | source')
    for i0,i1 in zip(idx[:-1],idx[1:]):
        r0=cv2.imread(fs[i0],0); r1=cv2.imread(fs[i1],0)
        s0=cv2.imread(fs[i0].replace('frame-','ref-'),0); s1=cv2.imread(fs[i1].replace('frame-','ref-'),0)
        fr=fit(r0,r1,times[i0],times[i1]); fsrc=fit(s0,s1,times[i0],times[i1])
        f=lambda x: 'nofit' if x is None else f'{x[0]:.3f} {x[1]:7.1f} {x[2]:7.1f} n={x[3]:3d}' + (f' fp=({x[1]/(1-x[0]):.0f},{x[2]/(1-x[0]):.0f})' if abs(1-x[0])>0.02 else '')
        print(f'{times[i0]:.2f}->{times[i1]:.2f}  R: {f(fr):45s} | S: {f(fsrc)}')
