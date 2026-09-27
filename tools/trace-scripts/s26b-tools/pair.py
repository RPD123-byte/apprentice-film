# pair.py outdir : renders frame-*.png -> r-F.jpg + ref-F.jpg (q95) + pair-F.jpg, σ8 ΔE printed; PNGs removed (disk)
import cv2, glob, re, sys, os, numpy as np
out=sys.argv[1]
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
cap=cv2.VideoCapture(V)
rows=[]
for p in sorted(glob.glob(out+'/frame-*.png')):
    tau=float(re.search(r'at-([\d.]+)s',p).group(1)); F=2700+int(round(tau))
    cap.set(cv2.CAP_PROP_POS_FRAMES,F); ok,ref=cap.read()
    a=cv2.imread(p); os.remove(p)
    A=cv2.cvtColor(cv2.GaussianBlur(a,(0,0),8).astype(np.float32)/255,cv2.COLOR_BGR2Lab)
    B=cv2.cvtColor(cv2.GaussianBlur(ref,(0,0),8).astype(np.float32)/255,cv2.COLOR_BGR2Lab)
    e=np.sqrt(((A-B)**2).sum(2)).mean()
    cv2.imwrite(f'{out}/r-{F}.jpg',a,[cv2.IMWRITE_JPEG_QUALITY,95]); cv2.imwrite(f'{out}/ref-{F}.jpg',ref,[cv2.IMWRITE_JPEG_QUALITY,95])
    pr=cv2.resize(np.hstack([a,ref]),(2206,473))
    cv2.putText(pr,f'F{F} t={F/25:.2f} dE8={e:.1f}',(10,30),0,1,(0,255,255),2)
    cv2.imwrite(f'{out}/pair-{F}.jpg',pr,[cv2.IMWRITE_JPEG_QUALITY,85])
    rows.append((F,e)); print(f'F{F} t={F/25:.2f} dE8={e:.2f}')
for p in glob.glob(out+'/contact-sheet*'): os.remove(p)
if rows: print('mean dE8', np.mean([e for _,e in rows]))
