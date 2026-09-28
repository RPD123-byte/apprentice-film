import sys; sys.path.insert(0,'.')
import numpy as np, cv2
from owlB_prep import TB
_Z=np.load('owlB_frames.npz')
body=np.load('B_body.npy'); cons=np.load('B_cons.npy')
RW,RH,RY0=2206+620,946+90,-45
sil=(cons>0.7).astype(np.uint8); sil=cv2.erode(sil,np.ones((15,15),np.uint8))
out={}
for n in range(1382,1417):
    P=_Z[f'P{n}']
    dx,dy=TB[n]; Mt=np.float32([[1,0,dx],[0,1,dy+RY0]])
    b=cv2.warpAffine(body,Mt,(2206,946),flags=cv2.INTER_LINEAR); s=cv2.warpAffine(sil,Mt,(2206,946),flags=cv2.INTER_NEAREST)
    s[400:]=0
    W=np.eye(2,3,dtype=np.float32)
    try:
        cc,W=cv2.findTransformECC(cv2.GaussianBlur(P,(0,0),1.2),cv2.GaussianBlur(b,(0,0),1.2),W,cv2.MOTION_TRANSLATION,(cv2.TERM_CRITERIA_EPS|cv2.TERM_CRITERIA_COUNT,100,1e-5),s,5)
    except cv2.error: cc=-1
    # W maps template(P) coords -> input(b) coords: b(x + t) ~ P(x) => the body must move by -t
    out[n]=(-float(W[0,2]),-float(W[1,2]),float(cc))
    print(n,'shift %.2f %.2f cc %.3f'%out[n])
import json; json.dump(out,open('bellyreg.json','w'))
