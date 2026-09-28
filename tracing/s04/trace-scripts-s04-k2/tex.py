# tex.py DIR [DIR2] -- sigma-2 MAE and band-pass texture energy (render vs source) per frame
import cv2, glob, re, sys, numpy as np
for d in sys.argv[1:]:
    fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
    out=[]
    for f in fs:
        t=re.search(r'at-([\d.]+)s',f).group(1)
        a=cv2.imread(f,0).astype(np.float32); b=cv2.imread(f.replace('frame-','ref-'),0).astype(np.float32)
        m2=np.abs(cv2.GaussianBlur(a,(0,0),2)-cv2.GaussianBlur(b,(0,0),2)).mean()
        bp=lambda x: np.abs(cv2.GaussianBlur(x,(0,0),1)-cv2.GaussianBlur(x,(0,0),3)).mean()
        out.append(f"{t}: s2 {m2:4.1f} tex {bp(a):4.1f}/{bp(b):4.1f}")
    print(d, ' | '.join(out))
