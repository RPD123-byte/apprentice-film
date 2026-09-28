#!/usr/bin/env python3
# sheet.py DIR out.jpg [cols] [w]: pack pair-*.jpg (render | source) into one sheet, labelled
import cv2, glob, sys, re, numpy as np
d=sys.argv[1]; out=sys.argv[2]; cols=int(sys.argv[3]) if len(sys.argv)>3 else 2; w=int(sys.argv[4]) if len(sys.argv)>4 else 1000
fs=sorted(glob.glob(d+'/pair-*.jpg'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
ims=[]
for p in fs:
    im=cv2.imread(p); h=int(im.shape[0]*w/im.shape[1]); im=cv2.resize(im,(w,h),interpolation=cv2.INTER_AREA)
    t=re.search(r'at-([\d.]+)s',p).group(1); cv2.putText(im,t,(6,20),0,0.6,(0,255,255),2); ims.append(im)
while len(ims)%cols: ims.append(np.zeros_like(ims[0]))
rows=[np.hstack(ims[i:i+cols]) for i in range(0,len(ims),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,85]); print(out,len(fs))
