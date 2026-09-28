import cv2, glob, re, numpy as np, math, sys
S='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s17rev1/'
d='snapshots/s17-rev1-exact/'
fs=sorted(glob.glob(d+'frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
def frame_of(t):
    q=math.floor(t*30+1e-9)/30; return round(q*25), q
orb=cv2.ORB_create(4000); bf=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True)
rows=[]
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1)); n,q=frame_of(t)
    a=cv2.imread(f,0); b=cv2.imread(S+f'src/f{n}.png',0)
    ba=cv2.GaussianBlur(a.astype(np.float32),(0,0),6); bb=cv2.GaussianBlur(b.astype(np.float32),(0,0),6)
    mae=np.abs(ba-bb).mean()
    # ORB similarity render->source on the UI/text region (top 180 px) + whole
    ka,da=orb.detectAndCompute(a,None); kb,db=orb.detectAndCompute(b,None)
    s=tx=ty=float('nan'); inl=0
    if da is not None and db is not None:
        m=sorted(bf.match(da,db),key=lambda x:x.distance)[:600]
        A=np.float32([ka[x.queryIdx].pt for x in m]); B=np.float32([kb[x.trainIdx].pt for x in m])
        M,I=cv2.estimateAffinePartial2D(A,B,ransacReprojThreshold=3)
        if M is not None: s=np.hypot(M[0,0],M[1,0]); tx,ty=M[0,2],M[1,2]; inl=int(I.sum())
    print(f'n={n} t={n/25:.2f} (req {t}) blurMAE={mae:5.1f} mean r/s={a.mean():5.1f}/{b.mean():5.1f} ORB s={s:.4f} tx={tx:7.1f} ty={ty:7.1f} inl={inl}')
