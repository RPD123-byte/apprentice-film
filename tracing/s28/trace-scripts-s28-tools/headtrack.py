import cv2,numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
n0=int(round(131.36*25)); n1=int(round(136.0*25))
c.set(cv2.CAP_PROP_POS_FRAMES,n0)
ref=None
rows=[]
for n in range(n0,n1+1):
    ok,f=c.read(); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
    if ref is None: ref=g.copy()
    # head: nose/mouth region (avoid eyes): ECC affine on region
    def ecc(x0,y0,x1,y1):
        a=ref[y0:y1,x0:x1]; b=g
        W=np.eye(2,3,dtype=np.float32)
        tmpl=cv2.GaussianBlur(a,(0,0),1.5)
        try:
            # search: warp that maps template coords -> image coords
            W[0,2]=x0; W[1,2]=y0
            _,W=cv2.findTransformECC(tmpl,cv2.GaussianBlur(b,(0,0),1.5),W,cv2.MOTION_EUCLIDEAN,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,80,1e-5),None,5)
            return W[0,2]-x0,W[1,2]-y0,np.degrees(np.arctan2(W[1,0],W[0,0]))
        except cv2.error:
            return np.nan,np.nan,np.nan
    h=ecc(1100,480,1300,640)       # nose + mouth
    be=ecc(1150,140,1600,330)      # beanie top
    sh=ecc(560,260,900,500)        # shoulder
    hd=ecc(1180,630,1420,700)      # hand
    # eye openness: dark pixels in left eye box (hero coords shifted by head motion)
    dx,dy=(0,0) if np.isnan(h[0]) else (int(round(h[0])),int(round(h[1])))
    eb=g[395+dy:445+dy,1195+dx:1290+dx]; eo=(eb<70).sum()
    eb2=g[505+dy:555+dy,1330+dx:1420+dx]; eo2=(eb2<70).sum()
    print(f"{n/25:.2f} head dx={h[0]:6.2f} dy={h[1]:6.2f} rot={h[2]:6.2f} | beanie {be[0]:6.2f} {be[1]:6.2f} {be[2]:6.2f} | shoulder {sh[0]:6.2f} {sh[1]:6.2f} | hand {hd[0]:6.2f} {hd[1]:6.2f} | eyeL {eo:4d} eyeR {eo2:4d}")
