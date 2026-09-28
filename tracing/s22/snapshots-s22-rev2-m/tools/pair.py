# usage: pair.py dir k out.jpg [x0 y0 x1 y1] [width]
import cv2,numpy as np,sys
SRC='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/src/f%04d.png'
d,k,out=sys.argv[1],int(sys.argv[2]),sys.argv[3]
a=cv2.imread(d+'/k%02d.png'%k); b=cv2.imread(SRC%(2420+k))
cr=[int(v) for v in sys.argv[4:8]] if len(sys.argv)>=8 else [0,0,2206,946]
w=int(sys.argv[8]) if len(sys.argv)>=9 else 1500
x0,y0,x1,y1=cr; a=a[y0:y1,x0:x1]; b=b[y0:y1,x0:x1]
s=w/a.shape[1]; a=cv2.resize(a,None,fx=s,fy=s,interpolation=cv2.INTER_AREA); b=cv2.resize(b,None,fx=s,fy=s,interpolation=cv2.INTER_AREA)
sep=np.full((6,a.shape[1],3),(0,200,255),np.uint8)
p=np.vstack([a,sep,b]); cv2.putText(p,'k%d render (top) | source (bottom)  crop %s'%(k,cr),(8,22),0,0.6,(0,255,255),2)
cv2.imwrite(out,p,[cv2.IMWRITE_JPEG_QUALITY,90])
