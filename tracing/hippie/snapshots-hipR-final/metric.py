# ΔE (CIE76 on Gaussian-blurred frames) in the page/banner region and full frame, for several render sets vs source.
# usage: metric.py setname=dir[,prefix] ...   (dir contains frame-*-at-T*.png from hyperframes snapshot, or film-T.png)
import cv2, numpy as np, sys, glob, os, re
REF = os.path.dirname(os.path.abspath(__file__))
TS=[88.6,90,92,95,96.8,97.2,98.4,100.2,100.4,101,104,107,110.4,114,115.4,117.4,118,120,124,128]
BAN=(193,185,1976,362)
REG={}
for t in TS:
    if t < 98 or 100.5 < t < 111: REG[t]=BAN
    elif t < 101: REG[t]=None
    elif t < 117.6: REG[t]=(0,0,2206,946)
    elif t < 121: REG[t]=(620,170,1780,740)
    else: REG[t]=(1230,150,1650,740)
def lab(im, s):
    f = cv2.GaussianBlur(im, (0, 0), s) if s > 0 else im
    return cv2.cvtColor(f.astype(np.float32) / 255, cv2.COLOR_BGR2Lab)
def find(d, t):
    if os.path.exists(os.path.join(d, f'film-{t:.1f}.png')): return os.path.join(d, f'film-{t:.1f}.png')
    for f in glob.glob(os.path.join(d, 'frame-*-at-*.png')):
        m = re.search(r'at-([\d.]+)s', f)
        if m and abs(float(m.group(1)) - t) < 0.01: return f
    return None
sets=[a.split('=') for a in sys.argv[1:]]
print('T      region            ' + '  '.join(f'{n:>22}' for n,_ in sets) + '   (σ4/σ8/σ12 region | σ8 full)')
for t in TS:
    S = cv2.imread(os.path.join(REF, f'src-{t:.1f}.png'))
    row=[]
    for n,d in sets:
        f=find(d,t)
        if not f: row.append(f'{"-":>22}'); continue
        R=cv2.imread(f)
        vals=[]
        for s in (4,8,12):
            dd=np.linalg.norm(lab(R,s)-lab(S,s),axis=2)
            if s==8: full=dd.mean()
            r=REG[t]
            vals.append(dd[r[1]:r[3],r[0]:r[2]].mean() if r else float('nan'))
        row.append(f'{vals[0]:5.2f}/{vals[1]:5.2f}/{vals[2]:5.2f}|{full:5.2f}')
    print(f'{t:6.1f} {str(REG[t]):18s} ' + '  '.join(row))
