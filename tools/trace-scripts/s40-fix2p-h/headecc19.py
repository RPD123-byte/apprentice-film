import cv2, numpy as np
def S(n): return cv2.imread(f'src/f{n}.png',0).astype(np.float32)
def R(n): return cv2.imread(f't19/r-{n/25:.3f}.png',0).astype(np.float32)
x0,y0,x1,y1=1480,185,1700,350
def ecc(get,n0,n):
    a=cv2.GaussianBlur(get(n0),(0,0),1.5)[y0:y1,x0:x1]; b=cv2.GaussianBlur(get(n),(0,0),1.5)[y0:y1,x0:x1]
    m=np.zeros(a.shape,np.uint8); m[:,:]=255
    m[262-y0:345-y0,1540-x0:1645-x0]=0   # face
    m[225-y0:262-y0,1545-x0:1610-x0]=0   # bandage
    W=np.eye(2,3,dtype=np.float32)
    try:
        cc,W=cv2.findTransformECC(a,b,W,cv2.MOTION_EUCLIDEAN,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,200,1e-6),m,5)
    except cv2.error as e: return None
    ang=np.degrees(np.arctan2(W[1,0],W[0,0])); c=np.array([1596-x0,290-y0,1.0]); d=W@c-c[:2]
    # displacement of the top of the band (1596,203) and of the tuft (1655,250)
    t=np.array([1596-x0,205-y0,1.0]); dt=W@t-t[:2]
    return ang,d,dt,cc
for n in list(range(3474,3492))+[3495,3500]:
    a=ecc(S,3474,n); b=ecc(R,3474,n)
    f=lambda r: f'ang {r[0]:+.2f} ctr ({r[1][0]:+.1f},{r[1][1]:+.1f}) bandtop ({r[2][0]:+.1f},{r[2][1]:+.1f}) cc {r[3]:.3f}' if r else 'fail'
    print(f'{n/25:.2f} SRC {f(a)} | REN {f(b)}')
