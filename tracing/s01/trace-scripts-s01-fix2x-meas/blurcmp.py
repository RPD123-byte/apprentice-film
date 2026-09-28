# blurcmp.py DIR IDX x0 y0 x1 y1 out.jpg [sigma] [k]: render | source, both gaussian-blurred (value study check), grid 50px
import cv2, glob, sys, numpy as np
d,i=sys.argv[1],int(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]
sg=float(sys.argv[8]) if len(sys.argv)>8 else 5; k=float(sys.argv[9]) if len(sys.argv)>9 else 1.5
f=sorted(glob.glob(f'{d}/frame-{i:02d}-*.png'))[0]
ims=[]
for p in (f,f.replace('/frame-','/ref-')):
    g=cv2.GaussianBlur(cv2.imread(p,0).astype(np.float32),(0,0),sg)[y0:y1,x0:x1]
    g=cv2.resize(g,None,fx=k,fy=k); g=cv2.cvtColor(np.clip(g,0,255).astype(np.uint8),cv2.COLOR_GRAY2BGR)
    for x in range((x0//50+1)*50,x1,50): cv2.line(g,(int((x-x0)*k),0),(int((x-x0)*k),g.shape[0]),(0,0,200),1); cv2.putText(g,str(x),(int((x-x0)*k)+2,12),0,0.4,(0,200,255),1)
    for y in range((y0//50+1)*50,y1,50): cv2.line(g,(0,int((y-y0)*k)),(g.shape[1],int((y-y0)*k)),(0,0,200),1); cv2.putText(g,str(y),(2,int((y-y0)*k)-2),0,0.4,(0,200,255),1)
    ims.append(g)
cv2.imwrite(out,np.hstack([ims[0],np.full((ims[0].shape[0],6,3),(0,0,255),np.uint8),ims[1]]),[cv2.IMWRITE_JPEG_QUALITY,88])
