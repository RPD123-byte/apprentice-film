import cv2, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(t):
    c.set(1,int(round(t*25))); ok,f=c.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
CT={37.6:(1,0,0),38.8:(1.1682,-316.3,-67.3),39.2:(1.5352,-1003.1,-220.7),39.6:(1.8697,-1633.7,-337.8),39.8:(2.0159,-1868.1,-396.0),39.88:(2.1564,-2074.9,-475.9)}
S40=(2.2834,-2263.2,-540.3)
ref=grab(40.0); refb=cv2.GaussianBlur(ref,(0,0),10)
for t,(s,tx,ty) in CT.items():
    a=s/S40[0]; bx=tx-a*S40[1]; by=ty-a*S40[2]
    # compare in ROOM coords: warp source(t) back to R40
    Minv=np.float32([[1/a,0,-bx/a],[0,1/a,-by/a]])
    src=cv2.GaussianBlur(grab(t),(0,0),10*a)
    back=cv2.warpAffine(src,Minv,(2206,946),borderValue=0)
    r=np.where(refb>30,back/np.maximum(refb,1),np.nan)
    # horizontal profile at y=380..440 (median), vertical at x=1150..1300
    hp=np.nanmedian(r[360:440,:],axis=0); vp=np.nanmedian(r[:,1250:1400],axis=1)
    print(f't={t} a={a:.3f}')
    print(' H x:'+' '.join(f'{x}:{hp[x]:.2f}' for x in range(100,2206,100) if not np.isnan(hp[x])))
    print(' V y:'+' '.join(f'{y}:{vp[y]:.2f}' for y in range(40,946,60) if not np.isnan(vp[y])))
