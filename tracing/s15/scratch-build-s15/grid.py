# grid.py T out.jpg [scale] [x0 y0 x1 y1] : source frame (or an image path via --img) with labelled grid in frame px
import cv2, sys
args=sys.argv[1:]
img=None
if args[0]=='--img': img=args[1]; args=args[2:]
t=float(args[0]); out=args[1]; sc=float(args[2]) if len(args)>2 else 0.5
f=cv2.imread(img) if img else cv2.imread('src/f%04d.png'%round(t*25))
crop=[int(v) for v in args[3:7]] if len(args)>=7 else [0,0,f.shape[1],f.shape[0]]
x0,y0,x1,y1=crop
f=f[y0:y1,x0:x1]
f=cv2.resize(f,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
step=100 if sc<0.9 else 50
for X in range((x0//step)*step,x1,step):
    if X<x0: continue
    x=int((X-x0)*sc); major=X%500==0
    cv2.line(f,(x,0),(x,f.shape[0]),(0,0,255) if major else (0,180,255),1)
    cv2.putText(f,str(X),(x+2,12),0,0.4,(0,255,255),1)
for Y in range((y0//step)*step,y1,step):
    if Y<y0: continue
    y=int((Y-y0)*sc); major=Y%500==0
    cv2.line(f,(0,y),(f.shape[1],y),(0,0,255) if major else (0,180,255),1)
    cv2.putText(f,str(Y),(2,y-2),0,0.4,(0,255,255),1)
cv2.putText(f,f'{t:.2f}',(f.shape[1]-80,f.shape[0]-10),0,0.6,(0,0,255),2)
cv2.imwrite(out,f,[cv2.IMWRITE_JPEG_QUALITY,88])
