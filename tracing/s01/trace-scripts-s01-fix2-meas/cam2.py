import cv2, numpy as np, re
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(n):
    c.set(cv2.CAP_PROP_POS_FRAMES,n); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
js=open('/Users/computer/rootline/apprentice-film/src/shots/s01_birdseye.js').read()
CAM=eval(re.search(r'const CAM = (\[.*?\]);',js,re.S).group(1))
ref=grab(0)
mask=np.full_like(ref,255); mask[40:310,830:1320]=0; mask[360:870,860:1470]=0
orb=cv2.ORB_create(8000); kr,dr=orb.detectAndCompute(ref,mask)
bf=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True)
for row in CAM:
    t=row[0]; n=round(t*25)
    g=grab(n)
    # mask the moving parts in the target frame too (they move with the camera roughly)
    s0,tx0,ty0=row[1:]
    m2=np.full_like(g,255)
    def box(x0,y0,x1,y1):
        X0=int(s0*x0+tx0); Y0=int(s0*y0+ty0); X1=int(s0*x1+tx0); Y1=int(s0*y1+ty0); m2[max(0,Y0):Y1,max(0,X0):X1]=0
    box(830,40,1320,310); box(860,360,1470,870)
    k,d=orb.detectAndCompute(g,m2)
    m=sorted(bf.match(dr,d),key=lambda x:x.distance)[:1500]
    A=np.float32([kr[x.queryIdx].pt for x in m]); B=np.float32([k[x.trainIdx].pt for x in m])
    M,inl=cv2.estimateAffinePartial2D(A,B,ransacReprojThreshold=2)
    s=np.hypot(M[0,0],M[1,0]); rot=np.degrees(np.arctan2(M[1,0],M[0,0]))
    # corner error of CAM vs measured
    err=max(np.hypot((s*x+M[0,2])-(s0*x+tx0),(s*y+M[1,2])-(s0*y+ty0)) for x,y in [(0,0),(2206,0),(0,946),(2206,946),(1103,473)])
    print(f"{t:.2f} meas s={s:.4f} tx={M[0,2]:8.2f} ty={M[1,2]:7.2f} rot={rot:+.3f} inl={int(inl.sum())} | CAM s={s0:.4f} tx={tx0:8.2f} ty={ty0:7.2f} | maxerr {err:.1f}")
