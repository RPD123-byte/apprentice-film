import cv2,sys,numpy as np
# gp.py frame.png ref.png out.jpg x0 y0 x1 y1 [step] [scale]
fa,fb,out=sys.argv[1:4]; x0,y0,x1,y1=[int(v) for v in sys.argv[4:8]]
step=int(sys.argv[8]) if len(sys.argv)>8 else 100; sc=float(sys.argv[9]) if len(sys.argv)>9 else 1.0
ims=[]
for f in (fa,fb):
    im=cv2.imread(f)
    for x in range(0,im.shape[1],step): cv2.line(im,(x,0),(x,im.shape[0]),(0,200,255),1); cv2.putText(im,str(x),(x+2,y0+14 if y0<im.shape[0] else 14),0,0.45,(0,255,255),1)
    for y in range(0,im.shape[0],step): cv2.line(im,(0,y),(im.shape[1],y),(0,200,255),1); cv2.putText(im,str(y),(x0+2,y-3),0,0.45,(0,255,255),1)
    ims.append(im[y0:y1,x0:x1])
c=np.hstack([ims[0],np.zeros((y1-y0,6,3),np.uint8),ims[1]])
c=cv2.resize(c,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
cv2.imwrite(out,c,[cv2.IMWRITE_JPEG_QUALITY,88])
