# per-pair blurred MAE (grey, 0-255) for a compare.sh output dir; optional region
import cv2, glob, re, sys, numpy as np
d=sys.argv[1]; roi=[int(v) for v in sys.argv[2:6]] if len(sys.argv)>=6 else None
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
tot=[];rows=[]
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    r=f.replace('frame-','ref-')
    a=cv2.imread(f,0).astype(np.float32); b=cv2.imread(r,0).astype(np.float32)
    if a.shape!=b.shape: b=cv2.resize(b,(a.shape[1],a.shape[0]))
    if roi: a=a[roi[1]:roi[3],roi[0]:roi[2]]; b=b[roi[1]:roi[3],roi[0]:roi[2]]
    e=[]
    for s in (1,2,4,8):
        e.append(np.abs(cv2.GaussianBlur(a,(0,0),s)-cv2.GaussianBlur(b,(0,0),s)).mean())
    fr=int(np.ceil(t*25-0.01))
    rows.append((t,fr,e,a.mean(),b.mean())); tot.append(e)
for t,fr,e,ma,mb in rows: print(f'{t:.3f} F{fr}  s1 {e[0]:.2f} s2 {e[1]:.2f} s4 {e[2]:.2f} s8 {e[3]:.2f}  mean {ma:.1f}/{mb:.1f}')
tot=np.array(tot); print('ALL', ' '.join(f'{x:.2f}' for x in tot.mean(0)))
