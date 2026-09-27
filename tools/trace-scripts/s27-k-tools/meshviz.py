# meshviz.py track.json T out.jpg : draw the tracked designer mesh on the source frame
import cv2, json, sys, numpy as np
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s27-meas')
from common import load
d=json.load(open(sys.argv[1])); t=sys.argv[2]; P=np.array(d['frames'][str(float(t))]); f=load(float(t)).copy()
GX,GY=12,9
for j in range(GY):
    for i in range(GX):
        k=j*GX+i; p=tuple(np.int32(P[k]))
        if i<GX-1: cv2.line(f,p,tuple(np.int32(P[k+1])),(0,255,255),2)
        if j<GY-1: cv2.line(f,p,tuple(np.int32(P[k+GX])),(0,255,255),2)
cv2.imwrite(sys.argv[3],cv2.resize(f,None,fx=0.45,fy=0.45))
