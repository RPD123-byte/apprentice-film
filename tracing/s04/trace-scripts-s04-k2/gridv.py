# gridv.py img.png out.jpg x0 y0 x1 y1 [step] [outw]  -- labelled grid on a crop of an image file (frame px labels)
import cv2, sys
f=cv2.imread(sys.argv[1]); out=sys.argv[2]; x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]
step=int(sys.argv[7]) if len(sys.argv)>7 else 50; ow=int(sys.argv[8]) if len(sys.argv)>8 else 1800
c=f[y0:y1,x0:x1].copy(); s=ow/c.shape[1]; c=cv2.resize(c,None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC)
for x in range((x0//step)*step,x1,step):
    if x<x0: continue
    X=int((x-x0)*s); cv2.line(c,(X,0),(X,c.shape[0]),(0,200,255) if x%(step*2) else (0,0,255),1); cv2.putText(c,str(x),(X+2,14),0,0.45,(0,255,255),1)
for y in range((y0//step)*step,y1,step):
    if y<y0: continue
    Y=int((y-y0)*s); cv2.line(c,(0,Y),(c.shape[1],Y),(0,200,255) if y%(step*2) else (0,0,255),1); cv2.putText(c,str(y),(2,Y-3),0,0.45,(0,255,255),1)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,90])
