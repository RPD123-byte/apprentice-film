import cv2,sys,numpy as np
# zc.py img x0 y0 x1 y1 out scale grid
im=cv2.imread(sys.argv[1]); x0,y0,x1,y1=map(int,sys.argv[2:6]); out=sys.argv[6]; S=float(sys.argv[7]); G=int(sys.argv[8])
im=cv2.resize(im[y0:y1,x0:x1],None,fx=S,fy=S,interpolation=cv2.INTER_CUBIC)
for x in range((x0//G+1)*G,x1,G):
    X=int((x-x0)*S); cv2.line(im,(X,0),(X,im.shape[0]),(0,200,255) if x%(2*G) else (0,0,255),1); cv2.putText(im,str(x),(X+2,12),0,0.4,(0,255,255),1)
for y in range((y0//G+1)*G,y1,G):
    Y=int((y-y0)*S); cv2.line(im,(0,Y),(im.shape[1],Y),(0,200,255) if y%(2*G) else (0,0,255),1); cv2.putText(im,str(y),(2,Y-3),0,0.4,(0,255,255),1)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,92])
