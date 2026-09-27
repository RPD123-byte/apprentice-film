import sys; sys.path.insert(0,'src/shots/s20/trace')
import composite2 as C, numpy as np, cv2
M=C.M; OUT=C.OUT
B=np.load(OUT+'/B2full.npy'); mk=np.load(OUT+'/holdmask.npy')
x0,y0,x1,y1=740,70,1300,840
ref=B[M+y0:M+y1,M+x0:M+x1]; msk=mk[M+y0:M+y1,M+x0:M+x1]
body=msk.copy(); body[:300-y0+70,:]=body[:300-y0+70,:]  # all
for n in range(1693,1703):
    f,_=C.to_margin(C.pre(n),C.affine_to(None)); cur=f[M+y0:M+y1,M+x0:M+x1]
    for name,mm in (('all',msk),):
        w=np.eye(2,3,dtype=np.float32)
        try:
            cc,w=cv2.findTransformECC(ref,cur,w,cv2.MOTION_AFFINE,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,200,1e-6),mm.astype(np.uint8),5)
            # map of ref point p -> cur: cur(x) = ref(W x)?  findTransformECC: template=ref, input=cur, warp maps template coords to input coords
            print('%.2f'%(n/25),name,'cc %.3f'%cc, np.round(w,4).tolist())
        except Exception as e: print(n, 'fail', e)
