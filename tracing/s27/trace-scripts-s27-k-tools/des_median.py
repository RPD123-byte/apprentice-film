# grain-free designer reference: frames 124.72-125.28 registered onto 125.0 by dense DIS flow inside his silhouette, median
import cv2, numpy as np, json, sys
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s27-meas')
from common import load
ref=load(125.0); g0=cv2.cvtColor(ref,cv2.COLOR_BGR2GRAY)
sil=np.array(json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s27-meas/sil125.json')),float)
H,W=g0.shape; m=np.zeros((H,W),np.uint8); cv2.fillPoly(m,[np.int32(np.round(sil))],1)
dis=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM); dis.setFinestScale(0); dis.setPatchSize(12); dis.setPatchStride(3)
yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
stack=[ref]
for k in range(-7,8):
    if k==0: continue
    t=round(125.0+k*0.04,2); f=load(t); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY)
    fl=dis.calc(cv2.GaussianBlur(g0,(0,0),1.2),cv2.GaussianBlur(g,(0,0),1.2),None)
    for c in range(2): fl[...,c]=cv2.GaussianBlur(fl[...,c],(0,0),4)
    wr=cv2.remap(f,xx+fl[...,0],yy+fl[...,1],cv2.INTER_LINEAR)
    stack.append(wr); d=np.abs(cv2.cvtColor(wr,cv2.COLOR_BGR2GRAY).astype(float)-g0)[m>0].mean(); print(t,'mean |diff| after reg',round(d,1))
med=np.median(np.stack(stack),0).astype(np.uint8)
out=ref.copy(); out[m>0]=med[m>0]
cv2.imwrite(sys.argv[1],out)
mk=np.zeros((H,W,3),np.uint8); mk[m>0]=(255,0,255); cv2.imwrite(sys.argv[2],mk)
