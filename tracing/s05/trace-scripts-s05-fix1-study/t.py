# t.py img x0 y0 x1 y1 scale out [step]: crop with edge ticks every step px (default 10, labels every 50)
import cv2, sys
im=cv2.imread(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6]); s=float(sys.argv[6]); st=int(sys.argv[8]) if len(sys.argv)>8 else 10
k=cv2.resize(im[y0:y1,x0:x1],None,fx=s,fy=s,interpolation=cv2.INTER_CUBIC)
k=cv2.copyMakeBorder(k,24,0,40,0,cv2.BORDER_CONSTANT,value=(255,255,255))
for x in range((x0//st+1)*st,x1,st):
    X=int((x-x0)*s)+40; L=14 if x%50==0 else 6
    cv2.line(k,(X,24-L),(X,24),(0,0,255),1)
    if x%50==0: cv2.putText(k,str(x),(X-14,9),0,0.35,(0,0,255),1)
for y in range((y0//st+1)*st,y1,st):
    Y=int((y-y0)*s)+24; L=14 if y%50==0 else 6
    cv2.line(k,(40-L,Y),(40,Y),(0,0,255),1)
    if y%50==0: cv2.putText(k,str(y),(0,Y-2),0,0.35,(0,0,255),1)
cv2.imwrite(sys.argv[7],k,[cv2.IMWRITE_JPEG_QUALITY,92])
