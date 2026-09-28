import cv2, sys, numpy as np
f=sys.argv[1]; out=sys.argv[2]; sig=float(sys.argv[3]) if len(sys.argv)>3 else 2
r=cv2.imread(f).astype(np.float32); s=cv2.imread(f.replace('frame-','ref-')).astype(np.float32)
rl=cv2.GaussianBlur(r.mean(2),(0,0),sig); sl=cv2.GaussianBlur(s.mean(2),(0,0),sig)
d=rl-sl
# signed: red = render brighter, blue = render darker, scale +-40
v=np.clip(d/40,-1,1)
im=np.zeros(r.shape,np.uint8)
im[...,2]=(np.clip(v,0,1)*255).astype(np.uint8)
im[...,0]=(np.clip(-v,0,1)*255).astype(np.uint8)
im[...,1]=(s.mean(2)*0.25).astype(np.uint8)
im=cv2.resize(im,(1103,473),interpolation=cv2.INTER_AREA)
cv2.imwrite(out,im)
