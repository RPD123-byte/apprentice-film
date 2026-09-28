import cv2, numpy as np, sys
f=cv2.imread(sys.argv[1]).astype(np.float32)
out=sys.argv[2]; x0,y0,x1,y1,z=[int(v) for v in sys.argv[3:8]]
f=cv2.GaussianBlur(f,(0,0),1.5)
pal={ # BGR source-space
 'sky':(40,30,34),'cream':(185,205,215),'gold':(90,170,215),'orange':(60,80,210),'mag':(120,40,200),'purple':(140,50,90),
 'pink':(170,110,220),'green':(60,150,120),'black':(20,18,22)}
names=list(pal); P=np.array([pal[k] for k in names],np.float32)
show={'sky':(60,40,40),'cream':(230,240,245),'gold':(60,200,240),'orange':(40,90,240),'mag':(150,30,210),'purple':(160,40,90),'pink':(200,140,250),'green':(60,180,90),'black':(0,0,0)}
c=f[y0:y1,x0:x1]
d=((c[:,:,None,:]-P[None,None])**2).sum(-1); idx=d.argmin(-1)
img=np.array([show[n] for n in names],np.uint8)[idx]
img=cv2.resize(img,None,fx=z,fy=z,interpolation=cv2.INTER_NEAREST)
g=50
for x in range(x0-x0%g+g,x1,g):
    cv2.line(img,((x-x0)*z,0),((x-x0)*z,img.shape[0]),(0,0,255) if x%100==0 else (0,120,255),1); 
    if x%100==0: cv2.putText(img,str(x),((x-x0)*z+2,12),0,0.4,(255,255,255),1)
for y in range(y0-y0%g+g,y1,g):
    cv2.line(img,(0,(y-y0)*z),(img.shape[1],(y-y0)*z),(0,0,255) if y%100==0 else (0,120,255),1)
    if y%100==0: cv2.putText(img,str(y),(2,(y-y0)*z-2),0,0.4,(255,255,255),1)
cv2.imwrite(out,img)
