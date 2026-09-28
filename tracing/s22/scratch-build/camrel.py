import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
tref=float(sys.argv[1]); ts=[float(x) for x in sys.argv[2].split(',')] if ',' in sys.argv[2] else None
if ts is None:
    a,b,st=float(sys.argv[2]),float(sys.argv[3]),float(sys.argv[4]); ts=list(np.arange(a,b+1e-6,st))
roi=[int(v) for v in sys.argv[5:9]] if len(sys.argv)>=9 else None
c=cv2.VideoCapture(V)
def grab(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
ref=grab(tref)
mask=None
if roi: mask=np.zeros_like(ref); mask[roi[1]:roi[3],roi[0]:roi[2]]=255
orb=cv2.ORB_create(6000); kr,dr=orb.detectAndCompute(ref,mask)
bf=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True)
for t in ts:
    g=grab(t); k,d=orb.detectAndCompute(g,mask)
    m=sorted(bf.match(dr,d),key=lambda x:x.distance)[:1000]
    A=np.float32([kr[x.queryIdx].pt for x in m]); B=np.float32([k[x.trainIdx].pt for x in m])
    M,inl=cv2.estimateAffine2D(A,B,ransacReprojThreshold=2)
    # report as x' = sx*x + tx ; y' = sy*y + ty
    print(f"t={t:6.2f} a={M[0,0]:.4f} b={M[0,1]:+.4f} tx={M[0,2]:7.1f} c={M[1,0]:+.4f} d={M[1,1]:.4f} ty={M[1,2]:7.1f} inl={int(inl.sum())}")
