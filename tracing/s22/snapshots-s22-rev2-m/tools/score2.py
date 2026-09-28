import cv2, numpy as np, glob, re, sys, os
D=sys.argv[1]
SRC='/Users/computer/rootline/apprentice-film/snapshots/s25-fix1-src/f%05d.png'
fs=sorted(glob.glob(D+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
def g(im): return cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32)
for p in fs:
    t=float(re.search(r'at-([\d.]+)s',p).group(1))
    r=cv2.imread(p); ref=cv2.imread(p.replace('frame-','ref-'))
    # which source frame is ref?
    best=None
    for k in range(int(t*25)-2,int(t*25)+3):
        s=cv2.imread(SRC%k)
        if s is None: continue
        d=np.abs(g(s)-g(ref)).mean()
        if best is None or d<best[1]: best=(k,d)
    # which source frame best matches render (sigma8)
    rb=cv2.GaussianBlur(g(r),(0,0),8); sc=[]
    for k in range(int(t*25)-2,int(t*25)+3):
        s=cv2.imread(SRC%k)
        if s is None: continue
        sc.append((np.abs(rb-cv2.GaussianBlur(g(s),(0,0),8)).mean(),k))
    sc.sort()
    fint=int(np.ceil(t*25-1e-3))
    s=cv2.imread(SRC%fint)
    m8=np.abs(rb-cv2.GaussianBlur(g(s),(0,0),8)).mean() if s is not None else -1
    sg=(g(r)-g(s)).mean() if s is not None else 0
    print(f'{t:7.2f} ref=f{best[0]}({best[1]:.1f}) intended f{fint} s8={m8:5.1f} signed={sg:+5.1f} bestmatch f{sc[0][1]} {sc[0][0]:.1f}')
