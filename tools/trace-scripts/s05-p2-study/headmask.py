import numpy as np,cv2
from scipy import ndimage as ndi
d=np.load('motseg_d.npy')
d=cv2.GaussianBlur(d,(0,0),2)
m=(d>0.012).astype(np.uint8)
m[:, :1380]=0; m[:, 1720:]=0; m[:190]=0; m[480:]=0
m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(15,15)))
lab,n=ndi.label(m); l=lab[330,1560]; m=(lab==l)
m=ndi.binary_fill_holes(m)
m=cv2.morphologyEx(m.astype(np.uint8),cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))>0
np.save('mask_head_mot.npy',m)
a=cv2.imread('avg25.png'); ov=a.copy(); ov[m]=(ov[m]*0.6+np.array([0,0,255])*0.4).astype(np.uint8)
cs,_=cv2.findContours(m.astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); cv2.drawContours(ov,cs,-1,(0,255,255),1)
cv2.imwrite('mask_head_mot.jpg',cv2.resize(ov[170:520,1370:1740],None,fx=2,fy=2,interpolation=cv2.INTER_NEAREST))
print(m.sum())
