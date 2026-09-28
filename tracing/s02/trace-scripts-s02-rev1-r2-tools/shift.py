import cv2, glob, re, sys, numpy as np
# global translation between render and ref per pair (phase correlation on gradients), + regional blur MAE grid
d=sys.argv[1]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    a=cv2.imread(f,0).astype(np.float32); b=cv2.imread(f.replace('frame-','ref-'),0).astype(np.float32)
    ga=cv2.GaussianBlur(a,(0,0),2); gb=cv2.GaussianBlur(b,(0,0),2)
    win=cv2.createHanningWindow(a.shape[::-1],cv2.CV_32F)
    (dx,dy),r=cv2.phaseCorrelate(gb,ga,win)
    # regional MAE (sigma 8) in a 4x3 grid
    A=cv2.GaussianBlur(a,(0,0),8); B=cv2.GaussianBlur(b,(0,0),8)
    H,W=a.shape; g=[]
    for j in range(3):
        row=[]
        for i in range(4):
            sa=A[j*H//3:(j+1)*H//3,i*W//4:(i+1)*W//4]; sb=B[j*H//3:(j+1)*H//3,i*W//4:(i+1)*W//4]
            row.append(f"{(sa-sb).mean():+5.1f}")
        g.append(' '.join(row))
    print(f"t={t:6.2f} shift(render-src)=({dx:+6.1f},{dy:+6.1f}) resp={r:.2f} | signed mean diff grid (r-s): "+' / '.join(g))
