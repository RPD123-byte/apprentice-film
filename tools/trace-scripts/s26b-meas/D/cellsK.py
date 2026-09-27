# cellsK.py F : outline mask + cells of one D frame
import cv2, numpy as np, json, sys
from skimage.morphology import skeletonize
from skimage.transform import probabilistic_hough_line
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V); F=int(sys.argv[1])
cap.set(1,F); ok,f=cap.read(); g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
hsv=cv2.cvtColor(f,cv2.COLOR_BGR2HSV)
th=cv2.morphologyEx(g,cv2.MORPH_TOPHAT,np.ones((9,9),np.uint8))
m=((th>40)&(g>140)&(hsv[...,1]<80)).astype(np.uint8)
sk=skeletonize(m>0)
lines=probabilistic_hough_line(sk,threshold=12,line_length=30,line_gap=5,rng=1)
O=np.zeros_like(m)
for (x0,y0),(x1,y1) in lines: cv2.line(O,(x0,y0),(x1,y1),1,5)
O=cv2.dilate(O,np.ones((5,5),np.uint8))
n,lab,st,cen=cv2.connectedComponentsWithStats((1-O).astype(np.uint8),connectivity=4)
np.save(f'lab-{F}.npy',lab); json.dump([[int(a) for a in l[0]]+[int(a) for a in l[1]] for l in lines],open(f'lines-{F}.json','w'))
print(n,'cells', 'areas>2000:',(st[1:,4]>2000).sum(),'largest',np.sort(st[1:,4])[::-1][:8])
rng=np.random.default_rng(1); col=rng.integers(40,255,(n,3)).astype(np.uint8); col[0]=0
vis=col[lab]; vis[O>0]=255
cv2.imwrite(f'cells-{F}.jpg',cv2.resize(vis,(1103,473),interpolation=cv2.INTER_NEAREST))
