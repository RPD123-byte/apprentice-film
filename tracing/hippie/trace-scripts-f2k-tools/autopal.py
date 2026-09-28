# automatic palette for a trace region: k-means on the pre-grade frame (bilateral), excluding polygons
import cv2, numpy as np, json, sys
from ungrade import ungrade
rect=json.loads(sys.argv[1]); k=int(sys.argv[2]); excl=json.loads(sys.argv[3]) if len(sys.argv)>3 else []
x0,y0,x1,y1=rect
FR=sys.argv[5] if len(sys.argv)>5 else 'ref-117.4.png'; U=ungrade(cv2.imread(FR), float(sys.argv[6]) if len(sys.argv)>6 else 117.4)
u=(U[y0:y1,x0:x1]*255).astype(np.uint8)
u=cv2.bilateralFilter(u,7,30,4)
m=np.ones(u.shape[:2],np.uint8)
for p in excl: cv2.fillPoly(m,[np.int32(np.array(p)-[x0,y0])],0)
lab=cv2.cvtColor(u,cv2.COLOR_BGR2LAB)
X=lab[m>0].reshape(-1,3).astype(np.float32)
_,l,c=cv2.kmeans(X,k,None,(3,60,0.3),5,cv2.KMEANS_PP_CENTERS)
cb=cv2.cvtColor(c.reshape(1,-1,3).astype(np.uint8),cv2.COLOR_LAB2BGR).reshape(-1,3)
n=np.bincount(l.ravel(),minlength=k)
out=[]
for i in np.argsort(-n):
  h='#%02x%02x%02x'%(cb[i][2],cb[i][1],cb[i][0]); out.append([f'c{len(out)}',h,'hard'])
  print(out[-1], n[i], 'L',int(c[i][0]),'a',int(c[i][1])-128,'b',int(c[i][2])-128)
json.dump(out,open(sys.argv[4] if len(sys.argv)>4 else 'autopal.json','w'))
