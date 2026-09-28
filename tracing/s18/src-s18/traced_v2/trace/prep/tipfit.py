import sys; sys.path.insert(0,'.')
from tipcommon import *
KB=np.load('KBB_P.npy'); km=np.load('KBB_mask.npy')
Sh=np.array([[1,0,-M],[0,1,0],[0,0,1]],np.float64)
def warp_kb(T3, img):   # T3: plate->frame 3x3
    C=np.linalg.inv(T3@Sh)[:2].astype(np.float32)   # frame -> canvas
    return cv2.warpAffine(img.astype(np.float32),C,(2206,946),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP,borderValue=0)
res={}
for n in range(1418,1433):
    F=inverse(frame(n,True).astype(np.float32)/255,n/25).astype(np.float32)
    T0=np.vstack([tipmat(n).astype(np.float64),[0,0,1]])
    W0=warp_kb(T0,KB); m0=warp_kb(T0,km)>0.5
    xs=np.arange(2206)[None,:]
    lim={1418:1350,1419:1350,1420:1300,1421:1450,1422:1250,1423:1400,1424:600,1425:600,1426:600,1427:600}.get(n,0)
    tm=(cv2.erode(m0.astype(np.uint8),np.ones((9,9),np.uint8))&(xs>lim)).astype(np.uint8)
    e0=float(np.abs(W0-F)[tm>0].mean()*255)
    D=np.eye(2,3,dtype=np.float32)
    try:
        cc,D=cv2.findTransformECC(cv2.GaussianBlur(F,(0,0),1.5),cv2.GaussianBlur(W0,(0,0),1.5),D,cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,300,1e-7),tm,5)
    except cv2.error as e: print(n,'fail'); cc=0
    # D maps template(frame F) coords -> input (W0) coords: W0(D x) ~ F(x). W0 = KB warped by T0, so F(x) ~ KB(T0^-1 D x) => new plate->frame = D^-1 T0
    D3=np.vstack([D.astype(np.float64),[0,0,1]]); T1=np.linalg.inv(D3)@T0
    W1=warp_kb(T1,KB); e1=float(np.abs(W1-F)[tm>0].mean()*255)
    a,b,tx=T1[0]; c,d,ty=T1[1]
    print(n,'cc %.3f err %.1f -> %.1f'%(cc,e0,e1),'rot %.2f s %.4f/%.4f t %.1f %.1f'%(np.degrees(np.arctan2(c,a)),np.hypot(a,c),np.hypot(b,d),tx,ty))
    res[n]=T1[:2]
np.save('tipfit.npy',{k:v for k,v in res.items()},allow_pickle=True)
