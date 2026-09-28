# track the white owl in C/D: bright low-sat blob mask per frame; also ECC-align the owl crop of each frame to a key
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
def grab(F): c.set(1,F); ok,f=c.read(); return f
def mask(f):
    hsv=cv2.cvtColor(cv2.GaussianBlur(f,(0,0),2),cv2.COLOR_BGR2HSV)
    m=((hsv[...,2]>170)&(hsv[...,1]<40)).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((9,9),np.uint8))
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((15,15),np.uint8))
    n,lab,st,cen=cv2.connectedComponentsWithStats(m)
    # the owl: the biggest component overlapping the centre region
    best=None
    for i in range(1,n):
        x,y,w,h,a=st[i]
        if a<5000: continue
        if not (700<cen[i][0]<1600 and 250<cen[i][1]<800): continue
        if best is None or a>st[best][4]: best=i
    if best is None: return None
    return lab==best, st[best], cen[best]
key=int(sys.argv[1]); Fs=range(int(sys.argv[2]),int(sys.argv[3]))
K=grab(key); mk,stk,ck=mask(K)
Kg=cv2.cvtColor(K,cv2.COLOR_BGR2GRAY).astype(np.float32)
x,y,w,h,_=stk; pad=20
tpl=Kg[y-pad:y+h+pad,x-pad:x+w+pad]; tm=mk[y-pad:y+h+pad,x-pad:x+w+pad].astype(np.float32)
for F in Fs:
    f=grab(F); r=mask(f)
    g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
    if r is None: print(F,'none'); continue
    m,st,cc=r
    iou=(m&mk).sum()/(m|mk).sum()
    # ECC similarity of key crop into frame (init translation by centroid difference)
    warp=np.array([[1,0,x-pad+cc[0]-ck[0]],[0,1,y-pad+cc[1]-ck[1]]],np.float32)
    try:
        cc2,warp=cv2.findTransformECC(tpl,g,warp,cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,80,1e-5),tm.astype(np.uint8),5)
    except cv2.error: cc2=float('nan')
    s=np.sqrt(abs(np.linalg.det(warp[:,:2]))); rot=np.degrees(np.arctan2(warp[1,0],warp[0,0]))
    # key-crop point (pad+ck-xy) -> frame
    px=warp@np.array([ck[0]-x+pad,ck[1]-y+pad,1])
    print(f'F{F} t={F/25:.2f} area={st[4]} bbox=({st[0]},{st[1]},{st[0]+st[2]},{st[1]+st[3]}) cen=({cc[0]:.0f},{cc[1]:.0f}) iouKey={iou:.2f} ecc={cc2:.3f} s={s:.3f} rot={rot:+.1f} keyCen->({px[0]:.0f},{px[1]:.0f})')
