import cv2,glob,re,numpy as np,sys
sys.path.insert(0,'.')
OWL=eval(open('src/shots/s15/track.js').read().split('export const OWL = ')[1].split(';')[0])
ow={round(r[0],2):r for r in OWL}
fs=sorted(glob.glob('snapshots/s15-k22/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
S='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/src/'
orb=cv2.ORB_create(4000); bf=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True)
def load(p):
    g=cv2.imread(p,0); return cv2.resize(g,(1103,473))
def mask(t):
    m=np.full((473,1103),255,np.uint8); r=ow.get(round(t,2))
    if r:
        cx,cy,w,h=r[1]/2,r[2]/2,r[3]/2,r[4]/2
        cv2.rectangle(m,(int(cx-w*0.75),int(cy-h*1.0)),(int(cx+w*0.75),int(cy+h*0.9)),0,-1)
    return m
def fit(a,b,ma,mb):
    ka,da=orb.detectAndCompute(a,ma); kb,db=orb.detectAndCompute(b,mb)
    if da is None or db is None: return None
    m=sorted(bf.match(da,db),key=lambda x:x.distance)[:600]
    if len(m)<20: return None
    A=np.float32([ka[x.queryIdx].pt for x in m]); B=np.float32([kb[x.trainIdx].pt for x in m])
    M,inl=cv2.estimateAffinePartial2D(A,B,ransacReprojThreshold=2.5)
    if M is None: return None
    s=np.hypot(M[0,0],M[1,0]); return s,M[0,2]*2,M[1,2]*2,int(inl.sum())
T=[float(re.search(r'at-([\d.]+)s',f).group(1)) for f in fs]
prevR=prevS=None
for i,f in enumerate(fs):
    t=T[i]; r=load(f); s=load(S+'f%04d.png'%round(t*25))
    if i>0:
        fr=fit(prevR,r,mask(T[i-1]),mask(t)); fsr=fit(prevS,s,mask(T[i-1]),mask(t))
        def fmt(x): return '   ---                ' if x is None else 's=%.3f tx=%6.0f ty=%5.0f n=%3d'%x
        print('%.2f R %s | S %s'%(t,fmt(fr),fmt(fsr)))
    prevR,prevS=r,s
