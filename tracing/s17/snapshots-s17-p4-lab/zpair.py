import cv2,numpy as np,sys
sys.path.insert(0,'.')
from lab import src
# zpair.py dir t x0,y0,x1,y1 scale out [grid]
d=sys.argv[1]; t=float(sys.argv[2]); x0,y0,x1,y1=[int(v) for v in sys.argv[3].split(',')]; sc=float(sys.argv[4]); out=sys.argv[5]
grid=int(sys.argv[6]) if len(sys.argv)>6 else 0
f=cv2.imread(f'{d}/f{t:.2f}.jpg') if d!='-' else None
s=src(t)
def prep(im):
    a=cv2.resize(im[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
    if grid:
        for x in range((x0//grid+1)*grid,x1,grid):
            X=int((x-x0)*sc); cv2.line(a,(X,0),(X,a.shape[0]),(0,160,255),1); cv2.putText(a,str(x),(X+2,12),0,0.4,(0,255,255),1)
        for y in range((y0//grid+1)*grid,y1,grid):
            Y=int((y-y0)*sc); cv2.line(a,(0,Y),(a.shape[1],Y),(0,160,255),1); cv2.putText(a,str(y),(2,Y-2),0,0.4,(0,255,255),1)
    return a
ims=[prep(s)] if f is None else [prep(f),np.full(((y1-y0)*int(sc) if False else prep(s).shape[0],6,3),90,np.uint8),prep(s)]
cv2.imwrite(out,np.hstack(ims),[cv2.IMWRITE_JPEG_QUALITY,92])
