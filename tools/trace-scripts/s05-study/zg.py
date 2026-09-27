# zoomed grid: zg.py T x0 y0 x1 y1 Z step out.jpg  (labels every line, frame coords)
import cv2, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
t=float(sys.argv[1]); x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; Z=float(sys.argv[6]); st=int(sys.argv[7]); out=sys.argv[8]
c=cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,f=c.read()
f=cv2.resize(f[y0:y1,x0:x1],None,fx=Z,fy=Z,interpolation=cv2.INTER_CUBIC)
for x in range((x0//st+1)*st,x1,st):
    X=int((x-x0)*Z); col=(0,0,255) if x%100==0 else (0,200,255)
    cv2.line(f,(X,0),(X,f.shape[0]),col,1); cv2.putText(f,str(x),(X+2,12),0,0.4,(0,255,0),1)
for y in range((y0//st+1)*st,y1,st):
    Y=int((y-y0)*Z); col=(0,0,255) if y%100==0 else (0,200,255)
    cv2.line(f,(0,Y),(f.shape[1],Y),col,1); cv2.putText(f,str(y),(2,Y-2),0,0.4,(0,255,0),1)
cv2.imwrite(out,f,[cv2.IMWRITE_JPEG_QUALITY,90])
