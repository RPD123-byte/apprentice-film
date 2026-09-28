# gain.py DIR : per-frame least-squares channel gains source/render on static regions (B,G,R), and mean offsets
import cv2,numpy as np,sys,glob,re
d=sys.argv[1]
fs=sorted(glob.glob(d+'/f-*.png'),key=lambda p:int(re.search(r'f-(\d+)',p).group(1)))
mask=np.ones((946,2206),bool); mask[150:780,740:1360]=False   # leave out the moving face
out=[]
for f in fs:
    n=int(re.search(r'f-(\d+)',f).group(1))
    a=cv2.imread(f).astype(float); b=cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s06-fix1-src/s-{n}.png').astype(float)
    a5=cv2.GaussianBlur(a,(0,0),3); b5=cv2.GaussianBlur(b,(0,0),3)
    m=mask&(a5.mean(2)>20)&(a5.mean(2)<235)
    g=[ (b5[...,c][m]*a5[...,c][m]).sum()/(a5[...,c][m]**2).sum() for c in range(3)]
    off=[(a[...,c]-b[...,c]).mean() for c in range(3)]
    out.append((n,g,off))
    print(n,'gain B %.4f G %.4f R %.4f'%tuple(g),' off B %+.2f G %+.2f R %+.2f'%tuple(off))
g=np.array([o[1] for o in out]); print('mean gain',g.mean(0).round(4))
