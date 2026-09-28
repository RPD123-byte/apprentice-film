# f2f.py DIR [DIR..] : frame-to-frame change (mean abs, sigma 1 blur) in the owl region, render vs source, frames 700-718
import cv2,numpy as np,sys
B=(1450,150,1900,650)
def ch(p,q):
    a=cv2.GaussianBlur(cv2.imread(p,0).astype(float),(0,0),1); b=cv2.GaussianBlur(cv2.imread(q,0).astype(float),(0,0),1)
    x0,y0,x1,y1=B; return np.abs(a-b)[y0:y1,x0:x1].mean()
S='/Users/computer/rootline/apprentice-film/snapshots/s06-fix1-src/s-%d.png'
print('src ',' '.join(f'{n}:{ch(S%n,S%(n-1)):.1f}' for n in range(701,719)))
for d in sys.argv[1:]:
    print(d.split('/')[-1][:4],' '.join(f'{n}:{ch(f"{d}/f-{n}.png",f"{d}/f-{n-1}.png"):.1f}' for n in range(701,719)))
