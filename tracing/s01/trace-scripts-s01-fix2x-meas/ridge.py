# ridge.py x0 y0 x1 y1 out.jpg [k] : source t=0 dark-line map (black-hat) with a 10 px grid, labels in plate px
import cv2, sys, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
x0,y0,x1,y1=map(int,sys.argv[1:5]); out=sys.argv[5]; k=float(sys.argv[6]) if len(sys.argv)>6 else 3
c=cv2.VideoCapture(V); ok,f=c.read()
g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
g=cv2.GaussianBlur(g,(0,0),0.8)
bh=cv2.morphologyEx(g,cv2.MORPH_BLACKHAT,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
m=np.clip(255-bh*2.5,0,255).astype(np.uint8)[y0:y1,x0:x1]
m=cv2.cvtColor(cv2.resize(m,None,fx=k,fy=k,interpolation=cv2.INTER_CUBIC),cv2.COLOR_GRAY2BGR)
st=10
for x in range((x0//st+1)*st,x1,st):
    X=int((x-x0)*k); mj=x%50==0
    cv2.line(m,(X,0),(X,m.shape[0]),(0,0,255) if mj else (120,200,255),1)
    if mj: cv2.putText(m,str(x),(X+2,12),0,0.45,(0,0,255),1)
for y in range((y0//st+1)*st,y1,st):
    Y=int((y-y0)*k); mj=y%50==0
    cv2.line(m,(0,Y),(m.shape[1],Y),(0,0,255) if mj else (120,200,255),1)
    if mj: cv2.putText(m,str(y),(2,Y-3),0,0.45,(0,0,255),1)
cv2.imwrite(out,m,[cv2.IMWRITE_JPEG_QUALITY,90])
