# fit an affine from a key composite (A-frame coords) to other frames, masked by a box: prints warp and cc
import sys; sys.path.insert(0,'src/shots/s20/trace')
import composite2 as C, numpy as np, cv2
M=C.M
keyframes=[int(v) for v in sys.argv[1].split(',')]; box=[int(v) for v in sys.argv[2].split(',')]; targets=[int(v) for v in sys.argv[3].split(',')]
x0,y0,x1,y1=box
def frameA(n):
    f,_=C.to_margin(C.pre(n),C.affine_to(C.camA(n) if n<1685 else None)); return f
ref=np.median(np.stack([frameA(n) for n in keyframes]),axis=0)[M+y0:M+y1,M+x0:M+x1]
room=np.load(C.OUT+'/Afull.npy')[M+y0:M+y1,M+x0:M+x1]
mask=(np.abs(cv2.GaussianBlur(ref,(0,0),2)-cv2.GaussianBlur(room,(0,0),2))>0.08).astype(np.uint8)
mask=cv2.dilate(mask,np.ones((9,9),np.uint8))
for n in targets:
    cur=frameA(n)[M+y0:M+y1,M+x0:M+x1]
    best=None
    for mode,name in ((cv2.MOTION_TRANSLATION,'T'),(cv2.MOTION_AFFINE,'A')):
        w=np.eye(2,3,dtype=np.float32)
        try:
            cc,w=cv2.findTransformECC(ref,cur,w,mode,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,200,1e-6),mask,5)
            print('%.2f %s cc %.3f'%(n/25,name,cc), np.round(w,4).ravel().tolist())
        except Exception as e: print(n/25,name,'fail')
