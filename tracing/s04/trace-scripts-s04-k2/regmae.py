# regmae.py DIR -> blurred MAE per pair in a 4x3 grid of regions
import cv2, glob, re, sys, numpy as np
d=sys.argv[1]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
for f in fs:
    t=re.search(r'at-([\d.]+)s',f).group(1)
    a=cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2GRAY).astype(np.float32); b=cv2.cvtColor(cv2.imread(f.replace('frame-','ref-')),cv2.COLOR_BGR2GRAY).astype(np.float32)
    ba=cv2.GaussianBlur(a,(0,0),6); bb=cv2.GaussianBlur(b,(0,0),6)
    e=np.abs(ba-bb); s=(ba-bb)
    H,W=e.shape; out=[]
    for j in range(3):
        row=[]
        for i in range(4):
            blk=e[j*H//3:(j+1)*H//3, i*W//4:(i+1)*W//4]; sb=s[j*H//3:(j+1)*H//3, i*W//4:(i+1)*W//4]
            row.append(f"{blk.mean():4.0f}{sb.mean():+4.0f}")
        out.append(' '.join(row))
    print(f"{t:>6} tot {e.mean():4.1f} | "+' | '.join(out))
