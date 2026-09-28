# gridcrop.py RDIR k x0 y0 x1 y1 scale out [step]  -> render | source side by side, F0 grid labels (frame k warped to F0)
import cv2,numpy as np,sys
sys.path.insert(0,'snapshots/s08-fix1r-tools')
from cam import f0
rd,k=sys.argv[1],int(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); sc=float(sys.argv[7]); out=sys.argv[8]; st=int(sys.argv[9]) if len(sys.argv)>9 else 20
r=f0(cv2.imread(f'{rd}/r{k}.png'),k); s=f0(cv2.imread(f'snapshots/s08-p4-src/f{k}.png'),k)
a=cv2.resize(r[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC); b=cv2.resize(s[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
im=np.hstack([a,np.full((a.shape[0],8,3),255,np.uint8),b])
for yy in range((y0//st)*st,y1,st):
    if yy<y0: continue
    Y=int((yy-y0)*sc); cv2.line(im,(0,Y),(im.shape[1],Y),(90,90,90),1); cv2.putText(im,str(yy),(2,Y+12),cv2.FONT_HERSHEY_SIMPLEX,0.4,(255,255,255),1)
for xx in range((x0//st)*st,x1,st):
    if xx<x0: continue
    X=int((xx-x0)*sc)
    for off in (0,a.shape[1]+8):
        cv2.line(im,(X+off,0),(X+off,im.shape[0]),(90,90,90),1); cv2.putText(im,str(xx),(X+off+2,24),cv2.FONT_HERSHEY_SIMPLEX,0.4,(255,255,255),1)
cv2.imwrite(out,im)
