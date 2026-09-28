# pupil.py T cx cy r [img]: dark pupil blob inside the eye disc (centroid, equivalent radius)
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
t=float(sys.argv[1]); cx,cy,r=map(float,sys.argv[2:5])
if len(sys.argv)>5: f=cv2.imread(sys.argv[5])
else:
    c=cv2.VideoCapture(V); c.set(1,round(t*25)); ok,f=c.read()
g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
S=8; x0,y0=int(cx-r-2),int(cy-r-2); cr=g[y0:int(cy+r+3),x0:int(cx+r+3)]
up=cv2.resize(cr,None,fx=S,fy=S,interpolation=cv2.INTER_CUBIC)
yy,xx=np.mgrid[0:up.shape[0],0:up.shape[1]]
X=x0+(xx+0.5)/S-0.5; Y=y0+(yy+0.5)/S-0.5
inside=((X-cx)**2+(Y-cy)**2)<(r*0.8)**2
d=(up<110)&inside
if d.sum()==0: print('none'); sys.exit()
n,lab,st,cen=cv2.connectedComponentsWithStats(d.astype(np.uint8))
i=1+np.argmax(st[1:,4]); m=lab==i
px,py=X[m].mean(),Y[m].mean(); pr=np.sqrt(m.sum()/S/S/np.pi)
print(f'{t:.2f} pupil ({px:.1f},{py:.1f}) r={pr:.1f}  rel=({(px-cx)/r:.2f},{(py-cy)/r:.2f})')
