import sys; sys.path.insert(0,'.')
import cv2, numpy as np, json
from vectorize import vectorize
from common import load
T=float(sys.argv[1]) if len(sys.argv)>1 else 125.0
pts=json.load(open('sil125.json'))
mask=np.zeros((946,2206),np.uint8); cv2.fillPoly(mask,[np.int32(np.round(pts))],255)
f=load(T); lab=cv2.cvtColor(cv2.GaussianBlur(f,(5,5),0),cv2.COLOR_BGR2LAB).astype(np.float32)
chroma=np.hypot(lab[...,1]-128,lab[...,2]-128)
wall=(lab[...,0]>200)&(chroma<14)
wall=cv2.morphologyEx(wall.astype(np.uint8),cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
mask[(wall>0)]=0
mask=cv2.morphologyEx(mask,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
cv2.imwrite('des_mask125.png',mask)
regs,strokes,L,bgr=vectorize(T,mask,K=16,minarea=60,eps=1.5,inkthr=24)
# mask outline as polygon too
cnts,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
outl=[cv2.approxPolyDP(c,1.2,True).reshape(-1,2).tolist() for c in cnts if cv2.contourArea(c)>200]
print(len(regs),'regions',sum(len(r['p'])+sum(len(h) for h in r['h']) for r in regs),'pts;',len(strokes),'strokes',sum(len(s[0]) for s in strokes),'pts')
json.dump({'regions':regs,'strokes':strokes,'outline':outl},open('des125_vec.json','w'))
