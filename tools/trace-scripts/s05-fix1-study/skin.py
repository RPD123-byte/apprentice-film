import cv2, numpy as np, sys
im=cv2.cvtColor(cv2.imread('src25.png'),cv2.COLOR_BGR2GRAY); g=cv2.GaussianBlur(im,(0,0),1.5)
x0,y0,x1,y1=1260,200,1470,530
sub=g[y0:y1,x0:x1]
m=(sub>118).astype(np.uint8)
# cut the pencil and the cup away from the skin: the pencil is a thin light band, separate it by opening
m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
n,lab,st,cen=cv2.connectedComponentsWithStats(m)
k=lab[320-y0,1350-x0]; print('comp',k,st[k])
mk=(lab==k).astype(np.uint8)*255
cs,_=cv2.findContours(mk,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
c=max(cs,key=cv2.contourArea)
a=cv2.approxPolyDP(c,1.6,True)[:,0,:]
print(len(a)); print(','.join(f'[{p[0]+x0},{p[1]+y0}]' for p in a))
cv2.imwrite('skin-mask.png',cv2.resize(mk,None,fx=2,fy=2))
