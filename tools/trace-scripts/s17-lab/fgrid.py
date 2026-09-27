# fgrid.py T x0 y0 x1 y1 scale step out.jpg [render.png]: source (or a render) crop, upscaled, with a labelled grid
import cv2, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
t=float(sys.argv[1]); x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; sc=float(sys.argv[6]); st=int(sys.argv[7]); out=sys.argv[8]
if len(sys.argv)>9: f=cv2.imread(sys.argv[9])
else:
    c=cv2.VideoCapture(V); c.set(1,round(t*25)); ok,f=c.read()
f=cv2.resize(f[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
for x in range((x0//st+1)*st,x1,st):
    X=int((x-x0)*sc); cv2.line(f,(X,0),(X,f.shape[0]),(0,160,255) if x%50 else (0,0,255),1); cv2.putText(f,str(x),(X+2,12),0,0.38,(0,255,255),1)
for y in range((y0//st+1)*st,y1,st):
    Y=int((y-y0)*sc); cv2.line(f,(0,Y),(f.shape[1],Y),(0,160,255) if y%50 else (0,0,255),1); cv2.putText(f,str(y),(2,Y-2),0,0.38,(0,255,255),1)
cv2.imwrite(out,f,[cv2.IMWRITE_JPEG_QUALITY,90]); print(out)
