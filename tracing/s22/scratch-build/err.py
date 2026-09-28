import cv2, glob, re, sys, numpy as np
d=sys.argv[1]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
for f in fs:
    t=re.search(r'at-([\d.]+)s',f).group(1)
    r=cv2.imread(f).astype(np.float32); s=cv2.imread(f.replace('frame-','ref-')).astype(np.float32)
    rb=cv2.GaussianBlur(r,(0,0),3); sb=cv2.GaussianBlur(s,(0,0),3)
    e=np.abs(rb-sb).mean(axis=2)
    # cell grid 8x4
    H,W=e.shape; cells=[]
    gy,gx=4,8
    worst=[]
    for j in range(gy):
        for i in range(gx):
            c=e[j*H//gy:(j+1)*H//gy, i*W//gx:(i+1)*W//gx].mean(); worst.append((c,i,j))
    worst.sort(reverse=True)
    print(f"t={t} mae={e.mean():.2f} meanR={r.mean():.2f} meanS={s.mean():.2f} rgbR={r.reshape(-1,3).mean(0)[::-1].round(1)} rgbS={s.reshape(-1,3).mean(0)[::-1].round(1)} worst={[(round(c,1),i,j) for c,i,j in worst[:4]]}")
