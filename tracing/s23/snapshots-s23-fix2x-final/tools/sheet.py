#!/usr/bin/env python3
# sheet.py DIR out.jpg k1,k2,.. [cols] [w] [x0 y0 x1 y1]: grid of (render over source) pairs
import sys,cv2,numpy as np
SP='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/s23f2'
d,out=sys.argv[1],sys.argv[2]; ks=[int(k) for k in sys.argv[3].split(',')]
cols=int(sys.argv[4]) if len(sys.argv)>4 else 3; w=int(sys.argv[5]) if len(sys.argv)>5 else 700
box=list(map(int,sys.argv[6:10])) if len(sys.argv)>9 else [0,0,2206,946]
x0,y0,x1,y1=box; cells=[]
for k in ks:
    a=cv2.imread(f'{d}/r{k:05d}.png')[y0:y1,x0:x1]; b=cv2.imread(f'{SP}/src/{k:05d}.png')[y0:y1,x0:x1]
    h=int(w*(y1-y0)/(x1-x0)); a=cv2.resize(a,(w,h),interpolation=cv2.INTER_AREA); b=cv2.resize(b,(w,h),interpolation=cv2.INTER_AREA)
    c=np.vstack([a,np.full((3,w,3),(0,0,255),np.uint8),b]); cv2.putText(c,str(k),(6,22),cv2.FONT_HERSHEY_SIMPLEX,0.7,(0,255,255),2)
    c=cv2.copyMakeBorder(c,0,6,0,6,cv2.BORDER_CONSTANT,value=(0,0,160)); cells.append(c)
while len(cells)%cols: cells.append(np.zeros_like(cells[0]))
im=np.vstack([np.hstack(cells[i:i+cols]) for i in range(0,len(cells),cols)])
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,85]); print(im.shape)
