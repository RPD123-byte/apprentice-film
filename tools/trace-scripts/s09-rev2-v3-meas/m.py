# python3 m.py DIR [regions]  -> per-region stats, render (frame-*) vs my own extracted source frame at round(tr*25)
import cv2, numpy as np, glob, sys, re, math
d = sys.argv[1]
sel = sys.argv[2].split(',') if len(sys.argv) > 2 else None
SRC='/Users/computer/rootline/apprentice-film/snapshots/s09-rev2-v3-src/f%04d.png'
R = {
 'whole': (0,0,2206,946),
 'room1545-2030': (1545,0,2030,946), 'roomLow': (1760,600,2030,946), 'case': (1800,500,1960,610), 'cables': (1770,230,1870,330),
 'roomAll1540': (1540,0,2206,946), 'plant': (1980,180,2140,330), 'roomTop': (1545,0,2030,230),
 'beanie': (0,0,480,560), 'crownL': (20,20,200,240), 'crownR': (330,0,395,250), 'cuff': (20,300,150,520), 'cuffR': (380,300,470,500),
 'hair': (120,560,700,946), 'hairMid': (330,810,560,946), 'hairUp': (350,600,650,820), 'neck': (180,830,320,946), 'litTip': (90,660,150,720), 'cheek': (0,650,200,946),
 'slab': (560,700,1600,946), 'slabL': (640,850,800,946), 'slabTop': (780,720,900,790), 'belly': (960,820,1050,900), 'slabRp': (1150,880,1300,946),
 'footL': (1060,820,1160,946), 'footR': (1280,870,1450,946),
 'owlHead': (800,100,1300,600), 'owlBody': (900,400,1700,800), 'cushion': (1235,170,1300,420),
 'spk': (2026,366,2206,946), 'spkGrain': (2080,400,2130,600), 'tweet': (2130,450,2190,510), 'woofLow': (2100,790,2190,870),
}
def g(p): return cv2.cvtColor(cv2.imread(p), cv2.COLOR_BGR2GRAY).astype(np.float32)
def stats(a):
    hf = np.abs(a - cv2.GaussianBlur(a, (0,0), 2)).mean()
    m = cv2.GaussianBlur(a, (0,0), 3); s = np.sqrt(np.maximum(cv2.GaussianBlur(a*a, (0,0), 3) - m*m, 0)).mean()
    return dict(mean=a.mean(), med=np.median(a), p10=np.percentile(a,10), p90=np.percentile(a,90), blk=(a<20).mean()*100, hf=hf, lc=s)
fr = sorted(glob.glob(d + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1)))
for f in fr:
    t = float(re.search(r'at-([\d.]+)s', f).group(1))
    tr = math.floor(t*30+1e-6)/30; k = int(round(tr*25))
    A, B = g(f), g(SRC % k)
    Ab, Bb = cv2.GaussianBlur(A, (0,0), 6), cv2.GaussianBlur(B, (0,0), 6)
    print(f'== t={t} render@{tr:.4f} src frame {k} ({k/25:.2f}) {"EXACT" if abs(tr*25-k)<1e-3 else "off %.2f fr"%(tr*25-k)}')
    for key, (x0,y0,x1,y1) in R.items():
        if sel and key not in sel: continue
        a, b = A[y0:y1, x0:x1], B[y0:y1, x0:x1]
        sa, sb = stats(a), stats(b)
        mae = np.abs(Ab[y0:y1,x0:x1] - Bb[y0:y1,x0:x1]).mean()
        print(f'{key:14s} bMAE {mae:5.1f} | ' + ' '.join(f'{n} {sa[n]:5.1f}/{sb[n]:5.1f}' for n in sa))
