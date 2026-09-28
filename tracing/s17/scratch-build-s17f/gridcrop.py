# gridcrop.py in.png out.jpg x0 y0 x1 y1 scale step
import cv2,sys
im=cv2.imread(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[3:7]); sc=float(sys.argv[7]); st=int(sys.argv[8])
c=cv2.resize(im[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
for x in range((x0//st+1)*st,x1,st):
    X=int((x-x0)*sc); cv2.line(c,(X,0),(X,c.shape[0]),(0,160,255) if x%(st*5) else (0,0,255),1)
    if x%(st*2)==0: cv2.putText(c,str(x),(X+2,12),0,0.4,(0,255,255),1)
for y in range((y0//st+1)*st,y1,st):
    Y=int((y-y0)*sc); cv2.line(c,(0,Y),(c.shape[1],Y),(0,160,255) if y%(st*5) else (0,0,255),1)
    if y%(st*2)==0: cv2.putText(c,str(y),(2,Y-2),0,0.4,(0,255,255),1)
cv2.imwrite(sys.argv[2],c,[cv2.IMWRITE_JPEG_QUALITY,90])
