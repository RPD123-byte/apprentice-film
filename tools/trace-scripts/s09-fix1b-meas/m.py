# metrics: python3 m.py DIR  -> per-region stats for render vs ref (frame-*/ref-*)
import cv2, numpy as np, glob, sys, re
d = sys.argv[1]
sel = sys.argv[2].split(',') if len(sys.argv) > 2 else None
R = {
 'room1545-2030': (1545,0,2030,946), 'roomLow': (1760,600,2030,946), 'case': (1800,500,1960,610), 'cables': (1770,230,1870,330),
 'roomAll1540': (1540,0,2206,946), 'plant': (1980,180,2140,330),
 'cuff': (20,300,150,520), 'beanie': (0,0,480,560), 'crownR': (330,0,395,250), 'cuffR': (380,300,470,500), 'crownL': (20,20,200,240),
 'slab': (560,700,1600,946), 'slabRp': (1150,880,1300,946), 'belly': (960,820,1050,900), 'slabTop': (780,720,900,790), 'slabL': (640,850,800,946),
 'hairMid': (330,810,560,946), 'hairUp': (350,600,650,820), 'neck': (180,830,320,946), 'litTip': (90,660,150,720), 'cheek': (0,650,200,946),
 'spkGrain': (2080,400,2130,600), 'tweet': (2130,450,2190,510), 'woofLow': (2100,790,2190,870),
 'footL': (1060,820,1160,946), 'footR': (1280,870,1450,946), 'whole': (0,0,2206,946),
}
def g(p): return cv2.cvtColor(cv2.imread(p), cv2.COLOR_BGR2GRAY).astype(np.float32)
def stats(a):
    hf = np.abs(a - cv2.GaussianBlur(a, (0,0), 2)).mean()
    m = cv2.GaussianBlur(a, (0,0), 3); s = np.sqrt(np.maximum(cv2.GaussianBlur(a*a, (0,0), 3) - m*m, 0)).mean()
    return dict(mean=a.mean(), med=np.median(a), p5=np.percentile(a,5), p10=np.percentile(a,10), p90=np.percentile(a,90), p95=np.percentile(a,95), blk=(a<20).mean()*100, hf=hf, lc=s)
fr = sorted(glob.glob(d + '/frame-*.png'))
for f in fr:
    t = re.search(r'at-([\d.]+)s', f).group(1)
    ref = f.replace('frame-', 'ref-')
    A, B = g(f), g(ref)
    Ab, Bb = cv2.GaussianBlur(A, (0,0), 6), cv2.GaussianBlur(B, (0,0), 6)
    print(f'== t={t}')
    for k, (x0,y0,x1,y1) in R.items():
        if sel and k not in sel: continue
        a, b = A[y0:y1, x0:x1], B[y0:y1, x0:x1]
        sa, sb = stats(a), stats(b)
        mae = np.abs(Ab[y0:y1,x0:x1] - Bb[y0:y1,x0:x1]).mean()
        print(f'{k:14s} bMAE {mae:5.1f} | ' + ' '.join(f'{n} {sa[n]:5.1f}/{sb[n]:5.1f}' for n in sa))
