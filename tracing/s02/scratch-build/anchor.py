import cv2,numpy as np,re,sys
SP=sys.argv[1]
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); cl=cv2.createCLAHE(3.0,(8,8))
def rd(fn):
    o={}
    for L in open(fn):
        m=re.match(r'(\d+) t=\S+ s=\S+ (?:rot=\S+ )?tx=\s*(\S+) ty=\s*(\S+)',L)
        if m: o[int(m.group(1))]=np.array([float(m.group(2)),float(m.group(3))])
    return o
p1=rd(SP+'/pan1.txt'); p2=rd(SP+'/pan2.txt')
base=p1[max(p1)]
excl={}
for a in open(SP+'/excl.txt').read().split():
    r,fr=a.split('@'); f=int(fr.split('-')[0]); excl[f]=list(map(int,r.split(',')))
def grab(f):
    c.set(1,f); ok,im=c.read(); return cl.apply(cv2.cvtColor(im,cv2.COLOR_BGR2GRAY))
orb=cv2.ORB_create(8000); bf=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True)
cache={}
def feat(f,mask=None):
    k=(f,tuple(mask) if mask else None)
    if k not in cache:
        g=grab(f); M=None
        if mask: M=np.full_like(g,255); x0,y0,x1,y1=mask; M[y0:y1,x0:x1]=0
        cache[k]=orb.detectAndCompute(g,M)
    return cache[k]
p1f=sorted(p1)
for f in range(414,479):
    pred=base+p2[f]
    # nearest pan1 frame by offset (only frames with real motion, prefer non-dark)
    best=min(p1f,key=lambda g:np.hypot(*(p1[g]-pred)))
    ka,da=feat(best); kb,db=feat(f,excl.get(f))
    m=sorted(bf.match(da,db),key=lambda x:x.distance)[:800]
    P=np.float32([ka[x.queryIdx].pt for x in m]); Q=np.float32([kb[x.trainIdx].pt for x in m])
    M,inl=cv2.estimateAffinePartial2D(P,Q,ransacReprojThreshold=4)
    n=int(inl.sum()) if M is not None else 0
    s=np.hypot(M[0,0],M[1,0]) if M is not None else 0
    absoff=p1[best]+M[:,2] if M is not None else None
    print(f"{f} t={f/25:.2f} chain={pred[0]:8.1f},{pred[1]:8.1f} ref={best} direct={absoff[0]:8.1f},{absoff[1]:8.1f} s={s:.3f} inl={n} err={absoff[0]-pred[0]:6.1f},{absoff[1]-pred[1]:6.1f}")
