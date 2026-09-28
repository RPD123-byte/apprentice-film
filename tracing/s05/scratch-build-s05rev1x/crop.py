# crop.py dir P x0 y0 x1 y1 out [k|-] [scale]
import cv2, numpy as np, sys, glob, math
sys.path.insert(0,'/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s05rev1x')
from src_frames import get
d,P=sys.argv[1],float(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]
k=int(sys.argv[8]) if len(sys.argv)>8 and sys.argv[8]!='-' else math.ceil(math.floor(P*30+1e-6)/30*25-1e-6)
sc=float(sys.argv[9]) if len(sys.argv)>9 else 1.0
fs=[f for f in glob.glob(d+'/frame-*.png') if abs(float(f.split('-at-')[1][:-5])-P)<1e-4]
a=cv2.imread(fs[0]); b=get(k)
A=a[y0:y1,x0:x1]; Bc=b[y0:y1,x0:x1]
vert=(x1-x0)>(y1-y0)*1.3
sep=np.full((6,A.shape[1],3),(0,0,255),np.uint8) if vert else np.full((A.shape[0],6,3),(0,0,255),np.uint8)
im=np.vstack([A,sep,Bc]) if vert else np.hstack([A,sep,Bc])
if sc!=1: im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,92]); print(out,im.shape,'k',k)
