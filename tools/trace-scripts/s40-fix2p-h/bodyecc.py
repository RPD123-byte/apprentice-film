import cv2, numpy as np, sys
rdir=sys.argv[1]
def S(n): return cv2.imread(f'src/f{n}.png',0).astype(np.float32)
def R(n): return cv2.imread(f'{rdir}/r-{n/25:.3f}.png',0).astype(np.float32)
x0,y0,x1,y1=1490,330,1690,440
def ecc(get,n0,n):
    a=cv2.GaussianBlur(get(n0),(0,0),1.5)[y0:y1,x0:x1]; b=cv2.GaussianBlur(get(n),(0,0),1.5)[y0:y1,x0:x1]
    m=np.full(a.shape,255,np.uint8); m[0:18,:]=0  # the lower face edge / cups
    W=np.eye(2,3,dtype=np.float32)
    try: cc,W=cv2.findTransformECC(a,b,W,cv2.MOTION_EUCLIDEAN,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,200,1e-6),m,5)
    except cv2.error: return None
    ang=np.degrees(np.arctan2(W[1,0],W[0,0]))
    out=[ang]
    for (px,py) in [(1590,370),(1590,425),(1515,360),(1660,370)]:
        c=np.array([px-x0,py-y0,1.0]); out.append(W@c-c[:2])
    return out,cc
for n in [3474,3478,3480,3482,3484,3486,3488,3490,3495,3500]:
    a=ecc(S,3474,n); b=ecc(R,3474,n)
    f=lambda r: 'fail' if r is None else f'ang {r[0][0]:+.2f} mid {r[0][1].round(1)} feet {r[0][2].round(1)} L {r[0][3].round(1)} R {r[0][4].round(1)}'
    print(f'{n/25:.2f} SRC {f(a)} | REN {f(b)}')
