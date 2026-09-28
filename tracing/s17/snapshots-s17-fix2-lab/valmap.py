# valmap.py dir t x0 y0 x1 y1 scale out [sigma] : posterized sigma-blurred value maps, render | source, gridded
import sys,cv2,numpy as np
d,t=sys.argv[1],float(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); sc=float(sys.argv[7]); out=sys.argv[8]; sg=float(sys.argv[9]) if len(sys.argv)>9 else 3
ims=[]
for k in 'rs':
    p=cv2.cvtColor(cv2.imread(f'{d}/{k}{t:.2f}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
    b=cv2.GaussianBlur(p,(0,0),sg); q=(np.clip(b/255,0,0.999)*6).astype(int)/6*255
    c=cv2.applyColorMap(q[y0:y1,x0:x1].astype(np.uint8),cv2.COLORMAP_JET); c=cv2.resize(c,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST)
    for x in range((x0//10+1)*10,x1,10):
        X=int((x-x0)*sc); cv2.line(c,(X,0),(X,c.shape[0]),(255,255,255) if x%50==0 else (90,90,90),1)
        if x%50==0: cv2.putText(c,str(x),(X+2,12),cv2.FONT_HERSHEY_SIMPLEX,0.4,(255,255,255),1)
    for y in range((y0//10+1)*10,y1,10):
        Y=int((y-y0)*sc); cv2.line(c,(0,Y),(c.shape[1],Y),(255,255,255) if y%50==0 else (90,90,90),1)
        if y%50==0: cv2.putText(c,str(y),(2,Y-2),cv2.FONT_HERSHEY_SIMPLEX,0.4,(255,255,255),1)
    ims.append(c)
sep=np.full((ims[0].shape[0],6,3),255,np.uint8)
cv2.imwrite(out,np.hstack([ims[0],sep,ims[1]]) if (x1-x0)<(y1-y0)*1.2 else np.vstack([ims[0],np.full((6,ims[0].shape[1],3),255,np.uint8),ims[1]]))
