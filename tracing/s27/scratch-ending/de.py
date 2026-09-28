import cv2, glob, re, sys, numpy as np
d=sys.argv[1]
def lab(im,s):
    im=cv2.GaussianBlur(im,(0,0),s); return cv2.cvtColor(im.astype(np.float32)/255,cv2.COLOR_BGR2LAB)
rows=[]
for f in sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1))):
    t=re.search(r'at-([\d.]+)s',f).group(1); r=glob.glob(f'{d}/ref-*-at-{t}s.png')
    if not r: continue
    A=cv2.imread(f); B=cv2.imread(r[0])
    if A.shape!=B.shape: B=cv2.resize(B,(A.shape[1],A.shape[0]),interpolation=cv2.INTER_AREA)
    e8=np.linalg.norm(lab(A,8)-lab(B,8),axis=2).mean(); e2=np.linalg.norm(lab(A,2)-lab(B,2),axis=2).mean()
    ma=A.reshape(-1,3).mean(0)[::-1]; mb=B.reshape(-1,3).mean(0)[::-1]
    rows.append((float(t),e8,e2)); print(f'{t:>8} dE8 {e8:5.2f} dE2 {e2:5.2f}  meanRGB r {ma.round(0)} s {mb.round(0)}  shape {A.shape} {cv2.imread(r[0]).shape}')
a=np.array(rows); print('mean dE8 %.2f dE2 %.2f n=%d'%(a[:,1].mean(),a[:,2].mean(),len(a)))
