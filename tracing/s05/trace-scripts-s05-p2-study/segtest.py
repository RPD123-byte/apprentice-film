import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import numpy as np, cv2, json
from seg import *
T=np.load('avg25_pre.npy'); Y=T.mean(2).astype(np.float32)
name=sys.argv[1]; seeds=json.loads(sys.argv[2]); box=json.loads(sys.argv[3]); tr,ta,cr,gr=map(float,sys.argv[4:8])
m=seg(Y,seeds,box,tr,ta,int(cr),int(gr))
np.save('seg_'+name+'.npy',m)
a=cv2.imread('avg25.png'); x0,y0,x1,y1=box
ov=a.copy(); ov[m]=(ov[m]*0.5+np.array([0,0,255])*0.5).astype(np.uint8)
cs,_=cv2.findContours(m.astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); cv2.drawContours(ov,cs,-1,(0,255,255),1)
c=ov[y0:y1,x0:x1]; s=float(sys.argv[8]) if len(sys.argv)>8 else 2
cv2.imwrite('seg_'+name+'.jpg',cv2.resize(c,None,fx=s,fy=s,interpolation=cv2.INTER_NEAREST))
print(m.sum())
