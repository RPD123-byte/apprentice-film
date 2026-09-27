# gridsheet.py out x0 y0 x1 y1 step scale cols t1,t2,...  : labelled crops (true frame coords) tiled
import cv2, numpy as np, sys
from common import load
out=sys.argv[1]; x0,y0,x1,y1,step=[int(v) for v in sys.argv[2:7]]; sc=float(sys.argv[7]); cols=int(sys.argv[8]); ts=[float(v) for v in sys.argv[9].split(',')]
tiles=[]
for t in ts:
    f=load(t)[y0:y1,x0:x1].copy(); f=cv2.resize(f,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
    for x in range((x0//step+1)*step,x1,step):
        X=int((x-x0)*sc); cv2.line(f,(X,0),(X,f.shape[0]),(0,0,255) if x%(step*2)==0 else (0,200,255),1)
        if x%(step*2)==0: cv2.putText(f,str(x),(X+2,14),0,0.45,(0,0,255),1)
    for y in range((y0//step+1)*step,y1,step):
        Y=int((y-y0)*sc); cv2.line(f,(0,Y),(f.shape[1],Y),(0,0,255) if y%(step*2)==0 else (0,200,255),1)
        if y%(step*2)==0: cv2.putText(f,str(y),(2,Y-2),0,0.45,(0,0,255),1)
    cv2.putText(f,f"{t:.2f}",(f.shape[1]-90,f.shape[0]-10),0,0.8,(255,0,0),2); tiles.append(f)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]))
