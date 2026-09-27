# crop.py render.png source.png x0 y0 x1 y1 out.jpg [scale] [--grid step]  -> render | source crop, gridded
import cv2, sys, numpy as np
a=cv2.imread(sys.argv[1]); b=cv2.imread(sys.argv[2])
x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]
sc=float(sys.argv[8]) if len(sys.argv)>8 and not sys.argv[8].startswith('--') else 1.0
step=int(sys.argv[sys.argv.index('--grid')+1]) if '--grid' in sys.argv else 50
def prep(im):
    c=im[y0:y1,x0:x1].copy()
    c=cv2.resize(c,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC if sc>1 else cv2.INTER_AREA)
    for x in range((x0//step+1)*step,x1,step):
        X=int((x-x0)*sc); cv2.line(c,(X,0),(X,c.shape[0]),(0,0,255) if x%(step*2)==0 else (0,120,255),1)
        cv2.putText(c,str(x),(X+2,12),cv2.FONT_HERSHEY_SIMPLEX,0.35,(0,255,255),1)
    for y in range((y0//step+1)*step,y1,step):
        Y=int((y-y0)*sc); cv2.line(c,(0,Y),(c.shape[1],Y),(0,0,255) if y%(step*2)==0 else (0,120,255),1)
        cv2.putText(c,str(y),(2,Y-2),cv2.FONT_HERSHEY_SIMPLEX,0.35,(0,255,255),1)
    return c
A=prep(a); B=prep(b)
sep=np.zeros((A.shape[0],6,3),np.uint8); sep[:]=(0,200,0)
vert='--vert' in sys.argv
img=np.vstack([A,np.zeros((6,A.shape[1],3),np.uint8),B]) if vert else np.hstack([A,sep,B])
cv2.imwrite(out,img,[cv2.IMWRITE_JPEG_QUALITY,90])
