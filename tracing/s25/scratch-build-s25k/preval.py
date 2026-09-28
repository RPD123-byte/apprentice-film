# preval.py RDIR frame trace.json -> pre-grade error inside the traced mask (render vs ungraded source)
import cv2,numpy as np,json,sys
from grade import ungrade
from segm import L
rd,f,tj=sys.argv[1],int(sys.argv[2]),sys.argv[3]
r=cv2.imread(f'{rd}/r-{f:05d}.png')[...,::-1].astype(np.float32)/255
S=L(f)[...,::-1]/255.0
P=ungrade(S.astype(np.float32),f/25)
T=json.load(open(tj))
m=np.zeros(r.shape[:2],np.uint8)
for ring in T['mask']: cv2.fillPoly(m,[np.array(ring).reshape(-1,2).round().astype(np.int32)],1)
m=cv2.erode(m,np.ones((5,5),np.uint8))>0
rg=r.mean(2); pg=P.mean(2)
for s_ in [0.7,2,6]:
    a=cv2.GaussianBlur(rg,(0,0),s_); b=cv2.GaussianBlur(pg,(0,0),s_)
    print(f'sigma {s_}: MAE {np.abs(a-b)[m].mean()*255:.2f}  bias {(a-b)[m].mean()*255:+.2f}')
