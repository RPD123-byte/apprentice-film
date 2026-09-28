# overlay.py render src x0 y0 x1 y1 scale out : render edges magenta, source edges green, on dim source
import cv2,numpy as np,sys
A=cv2.imread(sys.argv[1],0); B=cv2.imread(sys.argv[2],0)
x0,y0,x1,y1=map(int,sys.argv[3:7]); sc=float(sys.argv[7]); out=sys.argv[8]
a=cv2.GaussianBlur(A[y0:y1,x0:x1],(0,0),float(sys.argv[9]) if len(sys.argv)>9 else 2); b=cv2.GaussianBlur(B[y0:y1,x0:x1],(0,0),float(sys.argv[9]) if len(sys.argv)>9 else 2)
ea=cv2.Canny(a,30,70); eb=cv2.Canny(b,30,70)
img=np.zeros(a.shape+(3,),np.uint8); img[...]= (b[...,None]*0.3).astype(np.uint8)
img[ea>0]=(255,0,255); img[eb>0]=(0,255,0); img[(ea>0)&(eb>0)]=(255,255,255)
img=cv2.resize(img,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST)
for x in range((x0//50+1)*50,x1,50): cv2.putText(img,str(x),(int((x-x0)*sc),12),0,0.4,(0,200,255),1); cv2.line(img,(int((x-x0)*sc),14),(int((x-x0)*sc),22),(0,200,255),1)
for y in range((y0//50+1)*50,y1,50): cv2.putText(img,str(y),(2,int((y-y0)*sc)),0,0.4,(0,200,255),1)
cv2.imwrite(out,img)
