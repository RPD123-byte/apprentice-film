import sys; sys.path.insert(0,'.')
import numpy as np, cv2
from owlB_prep import TB
Z=np.load('owlB_frames.npz')
RW,RH,RY0=2206+620,946+90,-45
def reg(img,n,fill=np.nan):
    dx,dy=TB[n]
    Mt=np.float32([[1,0,-dx],[0,1,-dy-RY0]])
    return cv2.warpAffine(img.astype(np.float32),Mt,(RW,RH),flags=cv2.INTER_NEAREST,borderValue=fill)
def owlmask(n):
    P=Z[f'P{n}']; E=Z[f'E{n}']
    d=np.abs(cv2.GaussianBlur(P,(0,0),1.5)-cv2.GaussianBlur(E,(0,0),1.5))
    return (d>0.12).astype(np.float32)
fs=[n for n in range(1382,1417) if n!=1401]
Ps=[];Ms=[]
for n in fs:
    Ps.append(reg(Z[f'P{n}'],n)); Ms.append(reg(owlmask(n),n))
Ps=np.array(Ps); Ms=np.array(Ms)
valid=~np.isnan(Ms)
cons=np.nansum(Ms,0)/np.maximum(valid.sum(0),1)
body=np.nanmedian(np.where(Ms>0.5,Ps,np.nan),0)
np.save('B_cons.npy',cons.astype(np.float32)); np.save('B_body.npy',np.nan_to_num(body).astype(np.float32)); np.save('B_nvalid.npy',valid.sum(0))
v=np.hstack([(np.clip(cons,0,1)*255).astype(np.uint8),(np.clip(np.nan_to_num(body),0,1)*255).astype(np.uint8)])
cv2.imwrite('B_body_view.jpg',cv2.resize(v,None,fx=0.35,fy=0.35,interpolation=cv2.INTER_AREA))
