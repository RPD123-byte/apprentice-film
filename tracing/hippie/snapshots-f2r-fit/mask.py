import cv2, numpy as np
im = cv2.imread('../f2r-meas/page-pre.png')
X0,Y0,X1,Y1 = 630,80,1510,380
c = im[Y0:Y1, X0:X1].astype(np.float32)
lab = cv2.cvtColor(c/255, cv2.COLOR_BGR2Lab)
L,A,B = lab[...,0],lab[...,1],lab[...,2]
cream = (L>82)&(np.abs(A)<9)&(B>-2)&(B<22)
hsv = cv2.cvtColor(c.astype(np.uint8), cv2.COLOR_BGR2HSV)
yellow = (hsv[...,0]>15)&(hsv[...,0]<32)&(hsv[...,1]>120)&(hsv[...,2]>170)
m = (cream|yellow).astype(np.uint8)
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3,3),np.uint8))
n, lb, st, cen = cv2.connectedComponentsWithStats(m)
keep = np.zeros_like(m)
for i in range(1,n):
    if st[i,4] > 60: keep[lb==i]=1
cv2.imwrite('face-mask.png', keep*255)
cv2.imwrite('yellow-mask.png', (yellow&(keep>0)).astype(np.uint8)*255)
n, lb, st, cen = cv2.connectedComponentsWithStats(keep)
for i in range(1,n):
    x,y,w,h,a = st[i]; print(i, x+X0, y+Y0, w, h, a)
