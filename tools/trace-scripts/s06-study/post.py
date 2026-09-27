import cv2,numpy as np,sys
f=cv2.imread('f27.5.png',0)
x0,y0,x1,y1=[int(v) for v in sys.argv[1:5]]; out=sys.argv[5]; z=float(sys.argv[6]) if len(sys.argv)>6 else 1
th=[int(v) for v in sys.argv[7].split(',')] if len(sys.argv)>7 else [50,170]
b=cv2.GaussianBlur(f,(0,0),2.5)
lv=np.linspace(0,255,len(th)+1).astype(np.uint8)
p=np.full_like(b,lv[-1])
for i in range(len(th)-1,-1,-1): p[b<th[i]]=lv[i]
p=cv2.cvtColor(p,cv2.COLOR_GRAY2BGR)[y0:y1,x0:x1]
p=cv2.resize(p,None,fx=z,fy=z,interpolation=cv2.INTER_NEAREST)
for x in range((x0//50+1)*50,x1,50):
  X=int((x-x0)*z); cv2.line(p,(X,0),(X,p.shape[0]),(0,0,255) if x%100==0 else (0,200,255),1)
  if x%100==0: cv2.putText(p,str(x),(X+2,12),0,0.4,(0,160,0),1)
for y in range((y0//50+1)*50,y1,50):
  Y=int((y-y0)*z); cv2.line(p,(0,Y),(p.shape[1],Y),(0,0,255) if y%100==0 else (0,200,255),1)
  if y%100==0: cv2.putText(p,str(y),(2,Y-2),0,0.4,(0,160,0),1)
cv2.imwrite(out,p)
