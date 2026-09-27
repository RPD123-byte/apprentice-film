import cv2,numpy as np,sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); ims=[]
for t in [float(v) for v in sys.argv[1].split(',')]:
  c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,s=c.read()
  a=cv2.imread(f'owlonly/r-{t:.2f}.png',cv2.IMREAD_UNCHANGED)[...,3]
  pm=(a>128).astype(np.uint8)
  mask=np.full(pm.shape,cv2.GC_BGD,np.uint8)
  mask[cv2.dilate(pm,np.ones((81,81),np.uint8))>0]=cv2.GC_PR_BGD
  mask[cv2.dilate(pm,np.ones((21,21),np.uint8))>0]=cv2.GC_PR_FGD
  mask[cv2.erode(pm,np.ones((41,41),np.uint8))>0]=cv2.GC_FGD
  bg=np.zeros((1,65),np.float64); fg=np.zeros((1,65),np.float64)
  cv2.grabCut(s,mask,None,bg,fg,6,cv2.GC_INIT_WITH_MASK)
  m=((mask==cv2.GC_FGD)|(mask==cv2.GC_PR_FGD)).astype(np.uint8)
  cv2.imwrite(f'gc-{t:.2f}.png',m*255)
  cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); cv2.drawContours(s,cs,-1,(0,0,255),2)
  ims.append(cv2.resize(s[200:946,900:2206],None,fx=0.4,fy=0.4))
cv2.imwrite('gc.jpg',np.vstack([np.hstack(ims[i:i+2]) for i in range(0,len(ims),2)]))
