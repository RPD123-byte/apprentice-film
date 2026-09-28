# ECC affine between render frame k and source frame k (both output coords): source(x) ~ render(C x)
import cv2,numpy as np,sys
rd=sys.argv[1]
pts=np.array([[x,y,1] for y in (15,470,945) for x in (0,1100,2205)],float)
for k in [int(a) for a in sys.argv[2].split(',')]:
    s=cv2.GaussianBlur(cv2.cvtColor(cv2.imread(f'snapshots/s08-p4-src/f{k}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.5)
    r=cv2.GaussianBlur(cv2.cvtColor(cv2.imread(f'{rd}/r{k}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),1.5)
    mask=np.full(s.shape,255,np.uint8)
    # exclude the logo corner (original mark), the crop strip
    mask[:200,:520]=0; mask[:16]=0
    for mode,name in ((cv2.MOTION_TRANSLATION,'T'),(cv2.MOTION_AFFINE,'A')):
        C=np.eye(2,3,dtype=np.float32)
        try: cc,C=cv2.findTransformECC(s,r,C,mode,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,300,1e-8),mask,5)
        except cv2.error: print(k,name,'fail'); continue
        d=(pts@C.T.astype(float))-pts[:,:2]
        print(k,name,round(cc,5),' '.join(f'({a:+.2f},{b:+.2f})' for a,b in d))
