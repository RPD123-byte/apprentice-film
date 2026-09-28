#!/usr/bin/env python3
# sheet.py dir out.jpg [cols] [width] : contact sheet of pair_*.jpg
import cv2,glob,sys,numpy as np,re
fs=sorted(glob.glob(sys.argv[1]+'/pair_*.jpg'),key=lambda p:float(re.search(r'pair_([0-9]+\.[0-9]+)',p).group(1)))
cols=int(sys.argv[3]) if len(sys.argv)>3 else 2; w=int(sys.argv[4]) if len(sys.argv)>4 else 1000
ims=[cv2.resize(cv2.imread(f),(w,int(w*473/2206))) for f in fs]
for im,f in zip(ims,fs): cv2.putText(im,re.search(r'pair_([0-9]+\.[0-9]+)',f).group(1),(5,18),0,0.6,(0,255,255),2)
while len(ims)%cols: ims.append(np.zeros_like(ims[0]))
cv2.imwrite(sys.argv[2],np.vstack([np.hstack(ims[i:i+cols]) for i in range(0,len(ims),cols)]),[cv2.IMWRITE_JPEG_QUALITY,85])
