import cv2,sys,glob,numpy as np
# usage: crop.py dir t x0 y0 x1 y1 out [scale]
d,t=sys.argv[1],sys.argv[2]; x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]; sc=float(sys.argv[8]) if len(sys.argv)>8 else 1
f=glob.glob(f'{d}/frame-*-at-{t}s.png')[0]; r=f.replace('/frame-','/ref-')
ims=[]
for p in (f,r):
    im=cv2.imread(p)[y0:y1,x0:x1].copy()
    step=50 if (x1-x0)<800 else 100
    for x in range((x0//step+1)*step,x1,step):
        cv2.line(im,(x-x0,0),(x-x0,8),(0,255,0),1); cv2.putText(im,str(x),(x-x0+2,18),0,0.4,(0,255,0),1)
    for y in range((y0//step+1)*step,y1,step):
        cv2.line(im,(0,y-y0),(8,y-y0),(0,255,0),1); cv2.putText(im,str(y),(10,y-y0+4),0,0.4,(0,255,0),1)
    ims.append(im)
o=np.hstack([ims[0],np.full((y1-y0,6,3),(0,0,255),np.uint8),ims[1]])
if sc!=1: o=cv2.resize(o,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
cv2.imwrite(out,o,[cv2.IMWRITE_JPEG_QUALITY,90])
