# masks.py tag t1,t2,... : reviewer-style background-difference owl masks (render vs source), IoU/centroid/bbox + overlay sheet
import sys; sys.path.insert(0, '.')
from lab import *
import numpy as np, cv2
tag=sys.argv[1]; ts=[float(v) for v in sys.argv[2].split(',')]
L=Lab()
bgR=cv2.GaussianBlur(cv2.cvtColor(L.render(57.36),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),3)
bgS=cv2.GaussianBlur(src(57.36,True).astype(np.float32),(0,0),3)
def mask(im,bg):
    m=(np.abs(cv2.GaussianBlur(im,(0,0),3)-bg)>40).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((5,5),np.uint8)); m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((15,15),np.uint8)); m[850:]=0
    n,lab,st,_=cv2.connectedComponentsWithStats(m)
    if n<2: return m*0
    k=1+np.argmax(st[1:,4]); return (lab==k).astype(np.uint8)
tiles=[]
for t in ts:
    r=L.render(t); s=src(t)
    mr=mask(cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).astype(np.float32),bgR); ms=mask(cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(np.float32),bgS)
    def st(m):
        ys,xs=np.nonzero(m); return (xs.min(),ys.min(),xs.max(),ys.max(),xs.mean(),ys.mean()) if len(xs) else (0,0,0,0,0,0)
    a=st(mr); b=st(ms); iou=(mr&ms).sum()/max(1,(mr|ms).sum())
    print(f'{t:.2f} R bb {a[:4]} c=({a[4]:.0f},{a[5]:.0f}) | S bb {b[:4]} c=({b[4]:.0f},{b[5]:.0f}) | IoU {iou:.2f} mae {mae(r,s,8):.2f}',flush=True)
    im=s.copy()
    for m,col in [(ms,(0,255,0)),(mr,(0,0,255))]:
        cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE); cv2.drawContours(im,cs,-1,col,3)
    c=cv2.resize(im[380:946,850:1750],None,fx=0.5,fy=0.5); cv2.putText(c,f'{t:.2f} {iou:.2f}',(4,20),0,0.6,(0,255,255),2); tiles.append(c)
L.close()
while len(tiles)%4: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(f'../s19-fix2-{tag}.jpg',np.vstack([np.hstack(tiles[i:i+4]) for i in range(0,len(tiles),4)]),[cv2.IMWRITE_JPEG_QUALITY,85])
