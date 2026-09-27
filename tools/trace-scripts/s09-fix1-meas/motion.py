import cv2, numpy as np, glob, re, sys
d=sys.argv[1]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
def load(p): return cv2.imread(p,0).astype(np.float32)
regs={'beanie':(20,20,420,540),'slab':(600,730,940,940)}
def shift(a,b,r):
    x0,y0,x1,y1=r; A=cv2.GaussianBlur(a[y0:y1,x0:x1],(0,0),1.5); B=cv2.GaussianBlur(b[y0:y1,x0:x1],(0,0),1.5)
    win=cv2.createHanningWindow((x1-x0,y1-y0),cv2.CV_32F)
    (dx,dy),_=cv2.phaseCorrelate(A,B,win); return dx,dy
R0=load(fs[0]); S0=load(fs[0].replace('frame-','ref-'))
print('t      beanie ren(dx,dy)  src(dx,dy)   | slab ren(dx,dy)  src(dx,dy)')
errs={'beanie':[],'slab':[]}
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    R=load(f); S=load(f.replace('frame-','ref-'))
    out=f'{t:6.2f} '
    for k,r in regs.items():
        a=shift(R0,R,r); b=shift(S0,S,r); errs[k].append(np.hypot(a[0]-b[0],a[1]-b[1]))
        out+=f' {k}: {a[0]:5.1f},{a[1]:5.1f}  {b[0]:5.1f},{b[1]:5.1f} |'
    print(out)
for k,v in errs.items(): print(k,'mean err',round(float(np.mean(v)),2),'max',round(float(np.max(v)),2))
