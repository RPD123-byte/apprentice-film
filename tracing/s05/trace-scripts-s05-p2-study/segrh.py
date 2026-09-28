import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import numpy as np, cv2, json
from seg import *
T=np.load('avg25_pre.npy'); Y=T.mean(2).astype(np.float32)
m=np.load('seg_rh.npy').astype(np.uint8)
for p in [[(940,674),(952,668),(988,660),(1008,664),(1026,688),(1022,702),(1008,710),(980,714),(964,714),(950,700)],[(926,722),(952,718),(974,722),(976,746),(930,747)]]:
  cv2.fillPoly(m,[np.array(p,np.int32)],1)
k=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)); m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,k)
np.save('seg_rh2.npy',m>0)
a=cv2.imread('avg25.png'); x0,y0,x1,y1=820,580,1230,800
ov=a.copy(); mm=m>0; ov[mm]=(ov[mm]*0.6+np.array([0,0,255])*0.4).astype(np.uint8)
cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); cv2.drawContours(ov,cs,-1,(0,255,255),1)
cv2.imwrite('seg_rh2.jpg',cv2.resize(ov[y0:y1,x0:x1],None,fx=2.5,fy=2.5,interpolation=cv2.INTER_NEAREST))
