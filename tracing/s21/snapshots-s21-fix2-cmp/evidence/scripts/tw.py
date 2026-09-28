# tw.py x0 y0 x1 y1 DIR1 [DIR2 ...] -- t1,t2 : per dir: MAE σ1.5, NCC, p10/p50/p90, detail |I-σ2| (render / source)
import cv2, numpy as np, sys
a=sys.argv[1:]; i=a.index('--'); x0,y0,x1,y1=map(int,a[:4]); dirs=a[4:i]; ts=a[i+1].split(',')
G=lambda q: cv2.cvtColor(cv2.imread(q),cv2.COLOR_BGR2GRAY).astype(np.float32)
SRC='/Users/computer/rootline/apprentice-film/snapshots/s21-r3-src'
def st(im):
    w=im[y0:y1,x0:x1]; d=np.abs(im-cv2.GaussianBlur(im,(0,0),2))[y0:y1,x0:x1]
    return np.percentile(w,10),np.percentile(w,50),np.percentile(w,90),d.mean()
for d in dirs:
    out=[]
    for t in ts:
        t=float(t); R=G(f'{d}/r-{t:.2f}.png'); S=G(f'{SRC}/f{round(t*25):04d}.png')
        r=cv2.GaussianBlur(R,(0,0),1.5)[y0:y1,x0:x1]; s=cv2.GaussianBlur(S,(0,0),1.5)[y0:y1,x0:x1]
        u=r-r.mean(); v=s-s.mean(); ncc=(u*v).sum()/np.sqrt((u*u).sum()*(v*v).sum())
        a1=st(R); b1=st(S)
        out.append((np.abs(r-s).mean(),ncc)+a1+b1)
    m=np.array(out).mean(0)
    print(f'{d.split("/")[-1]:10s} MAE {m[0]:5.1f} NCC {m[1]:.3f} | R p10/50/90 {m[2]:.0f}/{m[3]:.0f}/{m[4]:.0f} det {m[5]:.2f} | S {m[6]:.0f}/{m[7]:.0f}/{m[8]:.0f} det {m[9]:.2f}')
