import cv2,numpy as np,glob,re
SRC='/Users/computer/rootline/apprentice-film/snapshots/s09-rev2-v3-src/f%04d.png'
REG={'crownEdge':(250,0,480,560),'cuffL':(0,250,250,560),'hairL':(0,560,330,946),'cheek':(0,650,200,946),'hairR':(330,560,700,946),'slabL':(600,740,900,946),'owl':(700,150,1300,560)}
def g(p,s=2.0): return cv2.GaussianBlur(cv2.imread(p,0).astype(np.float32),(0,0),s)
def pc(a,b):
    w=cv2.createHanningWindow((a.shape[1],a.shape[0]),cv2.CV_32F)
    (dx,dy),r=cv2.phaseCorrelate(b,a,w); return np.array([dx,dy])
S0=g(SRC%815)
src={}
for k in range(815,841):
    B=g(SRC%k); src[k/25]={n:pc(B[y0:y1,x0:x1],S0[y0:y1,x0:x1]) for n,(x0,y0,x1,y1) in REG.items()}
fr=sorted(glob.glob('s09-rev2-v3-motion/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
R0=g(fr[0]); ts=sorted(src)
err={n:[] for n in REG}
print('t      '+'  '.join(f'{n:>22s}' for n in REG))
for i,f in enumerate(fr):
    tr=32.6+i/30; A=g(f)
    row=[]
    for n,(x0,y0,x1,y1) in REG.items():
        r=pc(A[y0:y1,x0:x1],R0[y0:y1,x0:x1])
        # interpolate source
        j=max(0,min(len(ts)-2,int((tr-ts[0])*25)))
        fa=(tr-ts[j])*25; s=src[ts[j]][n]*(1-fa)+src[ts[j+1]][n]*fa
        e=r-s; err[n].append(np.hypot(*e))
        row.append(f'r({r[0]:+5.2f},{r[1]:+5.2f})s({s[0]:+5.2f},{s[1]:+5.2f})')
    print(f'{tr:.3f} '+' '.join(row))
print('mean/max err px: '+' '.join(f'{n} {np.mean(v):.2f}/{np.max(v):.2f}' for n,v in err.items()))
print('source track per frame:')
for t in ts: print(f'{t:.2f} '+' '.join(f'{n}({v[0]:+5.2f},{v[1]:+5.2f})' for n,v in src[t].items()))
