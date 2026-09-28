# diffmap.py render.png srcframe.png out.jpg : signed blurred difference (red = render brighter, blue = render darker), plus grid
import cv2,numpy as np,sys
A=cv2.imread(sys.argv[1],0).astype(np.float32); B=cv2.imread(sys.argv[2],0).astype(np.float32)
s=float(sys.argv[4]) if len(sys.argv)>4 else 6
d=cv2.GaussianBlur(A,(0,0),s)-cv2.GaussianBlur(B,(0,0),s)
v=np.clip(np.abs(d)*4,0,255).astype(np.uint8)
img=np.zeros(A.shape+(3,),np.uint8)
img[...,2]=np.where(d>0,v,0); img[...,0]=np.where(d<0,v,0); img[...,1]=(B*0.25).astype(np.uint8)
for x in range(0,A.shape[1],100): cv2.line(img,(x,0),(x,A.shape[0]),(60,60,60),1); cv2.putText(img,str(x),(x+2,14),0,0.4,(200,200,200),1)
for y in range(0,A.shape[0],100): cv2.line(img,(0,y),(A.shape[1],y),(60,60,60),1); cv2.putText(img,str(y),(2,y+14),0,0.4,(200,200,200),1)
cv2.imwrite(sys.argv[3],img,[cv2.IMWRITE_JPEG_QUALITY,88])
