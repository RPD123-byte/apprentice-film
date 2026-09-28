# study panorama (measurement only): earlier (sharper) frames win; uses the corrected camera table
import cv2,numpy as np,re,sys
exec(open(sys.argv[1]+'/camtab.py').read())
out=sys.argv[2]; sc=float(sys.argv[3]); order=sys.argv[4]
frames=[int(v) for v in sys.argv[5].split(',')] if len(sys.argv)>5 else list(range(261,479,2))
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V)
X0,Y0=-50,-2000; WW,HH=4600,3000
acc=np.zeros((int(HH*sc),int(WW*sc),3),np.float32)
if order=='early': frames=frames[::-1]
for f in frames:
    o=CAM[f]
    c.set(1,f); ok,im=c.read(); im=im.astype(np.float32)
    M=np.float32([[sc,0,(-o[0]-X0)*sc],[0,sc,(-o[1]-Y0)*sc]])
    w=cv2.warpAffine(im,M,(acc.shape[1],acc.shape[0]))
    m=cv2.warpAffine(np.ones(im.shape[:2],np.float32),M,(acc.shape[1],acc.shape[0]))[...,None]
    acc=acc*(1-m)+w*m
cv2.imwrite(out,np.clip(acc,0,255).astype(np.uint8))
