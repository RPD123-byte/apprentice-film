# sharp.py dir [x0 y0 x1 y1]: horizontal-gradient sharpness (mean |dI/dx|) of render vs source per time in a frame box
import cv2, glob, re, sys, numpy as np
d=sys.argv[1]; x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]] if len(sys.argv)>5 else (880,75,1260,265)
def sh(p):
    g=cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(float)[y0:y1,x0:x1]
    g=cv2.GaussianBlur(g,(0,0),1.2); return np.abs(np.diff(g,axis=1)).mean()*3
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
tot=[]
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1)); r=f.replace('frame-','ref-')
    a,b=sh(f),sh(r); tot.append((t,a,b))
    print(f"{t:5.2f} render {a:5.2f} source {b:5.2f}  ratio {a/b:4.2f}")
