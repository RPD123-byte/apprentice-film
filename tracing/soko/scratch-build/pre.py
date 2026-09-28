# pre.py img x0 y0 x1 y1 [pct]  -> estimated pre-grade colour (undo vignette + S-curve; ignores halation/grain)
import cv2, numpy as np, sys
im=cv2.imread(sys.argv[1]).astype(np.float64)/255
x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; pct=[float(v) for v in sys.argv[6:]] or [50]
H,W=im.shape[:2]
yy,xx=np.mgrid[0:H,0:W]; q=((xx/W-0.5)*2)**2+((yy/H-0.5)*2)**2; vig=1-0.38*np.clip(q/2,0,1)**1.15
lut_x=np.linspace(0,1,4001); lut_y=lut_x*0.65+0.35*lut_x*lut_x*(3-2*lut_x)
def inv(v): return np.interp(v,lut_y,lut_x)
r=im[y0:y1,x0:x1]/vig[y0:y1,x0:x1,None]
r=inv(np.clip(r,0,1)).reshape(-1,3)
for p in pct:
    v=np.percentile(r,p,axis=0)[::-1]
    print('p%g'%p,'RGB',(v*255).round().astype(int).tolist(),'#%02x%02x%02x'%tuple((v*255).round().astype(int)))
