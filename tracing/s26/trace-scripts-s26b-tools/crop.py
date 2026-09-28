# crop.py dir F x0 y0 x1 y1 [out] [--w W] : render | source crop side by side
import cv2, sys, numpy as np
a=sys.argv[1:]; W=int(a[a.index('--w')+1]) if '--w' in a else 1000
if '--w' in a: i=a.index('--w'); a=a[:i]+a[i+2:]
d,F=a[0],int(a[1]); x0,y0,x1,y1=map(int,a[2:6]); out=a[6] if len(a)>6 else f'{d}/crop-{F}.jpg'
r=cv2.imread(f'{d}/r-{F}.jpg')[y0:y1,x0:x1]; s=cv2.imread(f'{d}/ref-{F}.jpg')[y0:y1,x0:x1]
h=int((y1-y0)*W/(x1-x0))
im=np.hstack([cv2.resize(r,(W,h),interpolation=cv2.INTER_AREA),cv2.resize(s,(W,h),interpolation=cv2.INTER_AREA)])
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,90]); print(out)
