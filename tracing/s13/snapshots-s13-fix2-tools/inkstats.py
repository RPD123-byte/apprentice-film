# inkstats.py DIR frame : per-region ink coverage (<110 within lit area), high-pass (sigma 1.5) std, whites (>=225) for render vs source
import cv2, numpy as np, sys
S='/Users/computer/rootline/apprentice-film/snapshots/s13-w3-src'
d,f=sys.argv[1],sys.argv[2]
R={'wing':(1650,300,2050,620),'coverts':(1480,320,1700,520),'belly':(1150,760,1550,870),'tail':(1600,650,1850,940),'chest':(1000,520,1400,760),'headC':(900,150,1350,420)}
def st(im,box):
    x0,y0,x1,y1=box; I=im.astype(np.float32); c=I[y0:y1,x0:x1]
    lit=cv2.GaussianBlur(I,(0,0),6)[y0:y1,x0:x1]>90
    hp=(I-cv2.GaussianBlur(I,(0,0),1.5))[y0:y1,x0:x1]
    return (c[lit]<110).mean()*100, hp[lit].std(), (c[lit]>=225).mean()*100, c[lit].mean()
r=cv2.imread(f'{d}/r{f}.png',0); s=cv2.imread(f'{S}/f{f}.png',0)
print('region    ink%  R/S      hp R/S       white% R/S     mean R/S')
for k,b in R.items():
    a=st(r,b); c=st(s,b)
    print(f'{k:8s} {a[0]:5.2f}/{c[0]:5.2f}  {a[1]:5.1f}/{c[1]:5.1f}  {a[2]:5.1f}/{c[2]:5.1f}  {a[3]:5.1f}/{c[3]:5.1f}')
