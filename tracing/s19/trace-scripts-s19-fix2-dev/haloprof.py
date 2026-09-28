import cv2,numpy as np,sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
d=sys.argv[1]; t=float(sys.argv[2])
c=cv2.VideoCapture(V); c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,s=c.read(); s=cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(float)
r=cv2.cvtColor(cv2.imread(f'{d}/r-{t:.2f}.png'),cv2.COLOR_BGR2GRAY).astype(float)
H,W=s.shape
m=np.zeros((H,W),np.uint8); cv2.fillPoly(m,[np.round(np.array([[1093.2,86.9],[1578.4,50.7],[1686.5,802.5],[995.7,774.1]])*4).astype(np.int32)],1,shift=2)
dA=cv2.distanceTransform(1-m,cv2.DIST_L2,5)
yy,xx=np.mgrid[0:H,0:W]
for side,msk in [('left',(xx<1150)&(yy>150)&(yy<700)),('right',(xx>1600)&(yy>150)&(yy<700)),('below',(yy>790)&(xx>1050)&(xx<1650))]:
  row=[]
  for dd in [3,6,10,15,20,30,45,60,80,100,130]:
    mm=msk&(np.abs(dA-dd)<2.5)
    row.append(f'{dd}:{np.median(s[mm]):.0f}/{np.median(r[mm]):.0f}')
  print(side,' '.join(row))
