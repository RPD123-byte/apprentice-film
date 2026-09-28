# dmap.py RDIR OUT t x0 y0 x1 y1 [scale] [sigma]: signed difference (render - source, σ) as colour: red = render lighter, blue = darker; beside the source grey
import cv2, numpy as np, sys
R,out,t=sys.argv[1],sys.argv[2],float(sys.argv[3]); x0,y0,x1,y1=map(int,sys.argv[4:8]); sc=float(sys.argv[8]) if len(sys.argv)>8 else 4; sg=float(sys.argv[9]) if len(sys.argv)>9 else 2
SRC='/Users/computer/rootline/apprentice-film/snapshots/s21-r3-src'
g=lambda p: cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(np.float32)
r=g(f'{R}/r-{t:.2f}.png'); s=g(f'{SRC}/f{round(t*25):04d}.png')
d=(cv2.GaussianBlur(r,(0,0),sg)-cv2.GaussianBlur(s,(0,0),sg))[y0:y1,x0:x1]
v=np.clip(d/60,-1,1)
im=np.zeros(d.shape+(3,),np.uint8); im[...,2]=np.clip(255*v,0,255); im[...,0]=np.clip(-255*v,0,255); im[...,1]=(s[y0:y1,x0:x1]*0.35).astype(np.uint8)
a=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST); b=cv2.resize(cv2.cvtColor(s[y0:y1,x0:x1].astype(np.uint8),cv2.COLOR_GRAY2BGR),None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
cv2.imwrite(out,np.hstack([a,b]),[cv2.IMWRITE_JPEG_QUALITY,90])
