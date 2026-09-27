# metric.py outdir [sigma]: mean blurred colour error (CIE76 dE in Lab) render vs source for each r-T.png, plus a heat grid
import cv2, glob, sys, re, numpy as np
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s27-meas')
from common import load
out=sys.argv[1]; sig=float(sys.argv[2]) if len(sys.argv)>2 else 8
tot=[]
for f in sorted(glob.glob(out+'/r-*.png')):
    t=float(re.search(r'r-([\d.]+)\.png',f).group(1))
    a=cv2.imread(f).astype(np.float32)/255; b=load(t).astype(np.float32)/255
    A=cv2.cvtColor(cv2.GaussianBlur(a,(0,0),sig),cv2.COLOR_BGR2LAB); B=cv2.cvtColor(cv2.GaussianBlur(b,(0,0),sig),cv2.COLOR_BGR2LAB)
    d=np.linalg.norm(A-B,axis=2)
    g=d.reshape(4,946//4 if False else 1,1,1) if False else None
    rows=[' '.join(f'{d[y0:y0+189,x0:x0+315].mean():5.1f}' for x0 in range(0,2205,315)) for y0 in range(0,946,189)]
    dL=(A[...,0]-B[...,0]).mean()
    print(f"{t:.2f} dE={d.mean():5.1f}  meanL(render-src)={dL:+5.1f}"); 
    if '-v' in sys.argv: print('   '+'\n   '.join(rows))
    tot.append(d.mean())
print('mean',np.mean(tot))
