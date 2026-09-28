# pops2.py DIR [REFDIR] : render vs source frame-to-frame change (s2) for consecutive frames present in DIR; optional
# comparison with REFDIR (same frames). Also a region variant via env REG=x0,y0,x1,y1.
import cv2,numpy as np,sys,glob,re,os
sys.path.insert(0,os.path.dirname(__file__)); from reg import src
def frames(d): return sorted(round(float(re.search(r'r-([\d.]+)\.png',p).group(1))*25) for p in glob.glob(d+'/r-*.png'))
reg=[int(v) for v in os.environ.get('REG','0,0,2206,946').split(',')]
def ld(p): return cv2.GaussianBlur(cv2.imread(p,0).astype(np.float32),(0,0),2)[reg[1]:reg[3],reg[0]:reg[2]]
def run(d):
    fr=frames(d); R={f:ld(f'{d}/r-{f/25:.2f}.png') for f in fr}; out={}
    for f in fr:
        if f-1 in R:
            S0=cv2.GaussianBlur(cv2.cvtColor(src(f-1),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),2)[reg[1]:reg[3],reg[0]:reg[2]]
            S1=cv2.GaussianBlur(cv2.cvtColor(src(f),cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),2)[reg[1]:reg[3],reg[0]:reg[2]]
            out[f]=(np.abs(R[f]-R[f-1]).mean(), np.abs(S1-S0).mean())
    return out
a=run(sys.argv[1]); b=run(sys.argv[2]) if len(sys.argv)>2 else None
for f in sorted(a):
    r,s=a[f]; line=f'{f/25:.2f} render {r:5.2f} source {s:5.2f} excess {r-s:+.2f}'
    if b and f in b: line+=f'   | ref excess {b[f][0]-b[f][1]:+.2f}'
    print(line)
