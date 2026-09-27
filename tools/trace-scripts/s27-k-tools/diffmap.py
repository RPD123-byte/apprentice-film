# diffmap.py outdir T [sigma]: signed blurred dL (render - source) map as colour image + dE map, side by side
import cv2, sys, numpy as np
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s27-meas')
from common import load
out=sys.argv[1]; t=float(sys.argv[2]); sig=float(sys.argv[3]) if len(sys.argv)>3 else 8
a=cv2.imread(f'{out}/r-{t:.2f}.png').astype(np.float32)/255; b=load(t).astype(np.float32)/255
A=cv2.cvtColor(cv2.GaussianBlur(a,(0,0),sig),cv2.COLOR_BGR2LAB); B=cv2.cvtColor(cv2.GaussianBlur(b,(0,0),sig),cv2.COLOR_BGR2LAB)
d=A-B
def sgn(x,s):
    x=np.clip(x/s,-1,1); im=np.zeros(x.shape+(3,),np.uint8)
    im[...,2]=(np.clip(x,0,1)*255).astype(np.uint8); im[...,0]=(np.clip(-x,0,1)*255).astype(np.uint8); im[...,1]=0
    return im
L=sgn(d[...,0],20); Aa=sgn(d[...,1],15); Bb=sgn(d[...,2],15)
g=cv2.cvtColor((b*255).astype(np.uint8),cv2.COLOR_BGR2GRAY); g=cv2.cvtColor(g,cv2.COLOR_GRAY2BGR)
ov=lambda m: cv2.addWeighted(g,0.45,m,0.8,0)
top=np.hstack([ov(L),ov(Aa)]); bot=np.hstack([ov(Bb),(cv2.GaussianBlur(a,(0,0),sig)*255).astype(np.uint8)])
im=np.vstack([top,bot]); im=cv2.resize(im,None,fx=0.4,fy=0.4)
cv2.putText(im,f'{t} dL(red=render brighter) | da(red=render redder)',(8,20),0,0.6,(0,255,255),2)
cv2.putText(im,'db (red=render yellower) | render blurred',(8,20+im.shape[0]//2),0,0.6,(0,255,255),2)
cv2.imwrite(f'{out}/d-{t:.2f}.jpg',im)
print(f'meanL {d[...,0].mean():+.2f} mean a {d[...,1].mean():+.2f} mean b {d[...,2].mean():+.2f}')
