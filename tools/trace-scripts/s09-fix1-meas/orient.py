import cv2, numpy as np, sys
im=cv2.imread(sys.argv[1],0).astype(np.float32)
def orient(x0,y0,x1,y1,sig=1.5):
    c=im[y0:y1,x0:x1]; c=cv2.GaussianBlur(c,(0,0),sig)
    gx=cv2.Sobel(c,cv2.CV_32F,1,0); gy=cv2.Sobel(c,cv2.CV_32F,0,1)
    J11=(gx*gx).mean(); J22=(gy*gy).mean(); J12=(gx*gy).mean()
    ang=0.5*np.degrees(np.arctan2(2*J12,J11-J22))   # gradient direction
    coh=np.sqrt((J11-J22)**2+4*J12**2)/(J11+J22+1e-6)
    line=(ang+90)%180   # line direction (0=horizontal, 90=vertical, 45 = down-right in image coords)
    return line,coh
for spec in sys.argv[2:]:
    x0,y0,x1,y1=map(int,spec.split(','))
    l,c=orient(x0,y0,x1,y1); print(spec, f'line {l:.0f} deg, coherence {c:.2f}')
