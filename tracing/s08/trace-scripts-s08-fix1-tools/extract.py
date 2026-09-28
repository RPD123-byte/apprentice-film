# Trace the lower-left ornament regions of the source close-up (frame 764/765 average, F0 coords) into simplified
# polygons + a target flat colour per region (as the F0 colour needed under the s08 light + grade).
import cv2,numpy as np,json,sys
sys.path.insert(0,'snapshots/s08-fix1-tools')
from gmodel import *
a=cv2.imread('snapshots/s08-rev1-src/f764.png').astype(float); b=cv2.imread('snapshots/s08-rev1-src/f765.png').astype(float)
src=(a+b)/2
sm=cv2.bilateralFilter(src.astype(np.uint8),9,40,5).astype(float)
Bc,Gc,Rc=sm[...,0],sm[...,1],sm[...,2]
L=(Rc+Gc+Bc)/3
hsv=cv2.cvtColor(sm.astype(np.uint8),cv2.COLOR_BGR2HSV).astype(float); Hh=hsv[...,0]*2; Ss=hsv[...,1]/255; V=hsv[...,2]
yy,xx=np.mgrid[0:H,0:W]
vg=vign(xx,yy)
Ln=L/vg   # vignette-compensated luma
cls=np.zeros(L.shape,np.uint8)
cls[(V>55)&(Ss>0.22)&((Hh>215)&(Hh<290))]=2   # violet
cls[(V>60)&(Ss>0.3)&((Hh>=290)|(Hh<6))]=3     # pink
cls[(V>60)&(Ss>0.38)&(Hh>=6)&(Hh<30)]=4       # orange
cls[(V>60)&(Ss>0.38)&(Hh>=30)&(Hh<70)]=5      # yellow
cls[((Ln>120)|((L>42)&(yy>690)&(xx<260)))&(Ss<0.3)]=6   # cream (absolute threshold in the vignetted corner)
cls[(yy<300)&(cls==6)&(xx<560)]=0   # never trace the source's logo
# unknown: red selection line band and the date text (+ its shadow) -> fill from nearest known label
unk=np.zeros(L.shape,np.uint8)
unk[476:500,:]=1
tb=np.zeros(L.shape,np.uint8); tb[325:485,0:800]=1
txt=((cls==6)&(tb==1)).astype(np.uint8)
txt=cv2.dilate(txt,np.ones((9,9),np.uint8))
unk|=txt
# fill: nearest non-unknown pixel's label
known=(unk==0).astype(np.uint8)
d,lab=cv2.distanceTransformWithLabels(1-known,cv2.DIST_L2,5,labelType=cv2.DIST_LABEL_PIXEL)

# labels index known pixels in scan order
idx=np.zeros(int(known.sum())+1,np.int64)
ys,xs=np.nonzero(known)
lin=ys*W+xs
# DIST_LABEL_PIXEL numbers zero pixels (known) in row-major scan order starting at 1
idx[1:]=lin
fill=cls.reshape(-1)[idx[lab.reshape(-1)]].reshape(L.shape)
cls2=np.where(unk==1,fill,cls)
# clean speckles per class
out=np.zeros_like(cls2)
for c in [2,3,4,5,6]:
  m=(cls2==c).astype(np.uint8)
  m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
  m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
  out[m==1]=c
np.save('snapshots/s08-fix1-tools/cls_clean.npy',out)
# vis
cols=np.array([[25,35,25],[0,0,0],[200,80,90],[150,70,220],[50,100,240],[60,200,240],[235,235,235]],np.uint8)
cv2.imwrite('snapshots/s08-fix1-tools/cls_clean.png',cols[out][0:946,0:900])
