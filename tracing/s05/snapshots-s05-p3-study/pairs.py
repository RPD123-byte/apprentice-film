# pairs.py DIR [--crop x0 y0 x1 y1 --out f.jpg --scale s]
# For each frame-*-at-Ts.png: source frame k = ceil(floor(T*30)/30*25) (what s05 draws), sigma-blurred MAE total and per region.
import sys, glob, re, math, cv2, numpy as np
sys.path.insert(0, __file__.rsplit('/',1)[0]); from src import frame
d=sys.argv[1]
REG={'screen':(300,160,910,660),'room':(0,0,1150,160),'right':(1780,0,2206,946),'fig':(1150,0,1780,600),'owl':(1420,220,1760,640),'hands':(500,560,1400,800),'deskL':(0,560,500,946)}
def k_of(T): return math.ceil(math.floor(T*30+1e-6)/30*25-1e-6)
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
crop=None
if '--crop' in sys.argv:
    i=sys.argv.index('--crop'); crop=tuple(int(v) for v in sys.argv[i+1:i+5])
rows=[]
for p in fs:
    T=float(re.search(r'at-([\d.]+)s',p).group(1)); k=k_of(T)
    r=cv2.imread(p).astype(np.float32); s=frame(k).astype(np.float32)
    rl=cv2.cvtColor(r,cv2.COLOR_BGR2GRAY); sl=cv2.cvtColor(s,cv2.COLOR_BGR2GRAY)
    out=[T,k]
    for sg in (1,2,4):
        e=np.abs(cv2.GaussianBlur(rl,(0,0),sg)-cv2.GaussianBlur(sl,(0,0),sg)); out.append(e.mean())
    e2=np.abs(cv2.GaussianBlur(rl,(0,0),2)-cv2.GaussianBlur(sl,(0,0),2))
    reg={n:e2[y0:y1,x0:x1].mean() for n,(x0,y0,x1,y1) in REG.items()}
    print(f'{T:6.2f} k{k} s1 {out[2]:5.2f} s2 {out[3]:5.2f} s4 {out[4]:5.2f} | '+' '.join(f'{n} {v:5.2f}' for n,v in reg.items()), f'mean r{rl.mean():.1f} s{sl.mean():.1f}')
    if crop:
        x0,y0,x1,y1=crop; a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
        sc=float(sys.argv[sys.argv.index('--scale')+1]) if '--scale' in sys.argv else 1
        im=np.hstack([a,np.full((a.shape[0],6,3),255,np.float32),b]).astype(np.uint8)
        if sc!=1: im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_NEAREST)
        o=(sys.argv[sys.argv.index('--out')+1] if '--out' in sys.argv else d+'/crop')+f'-{T:.2f}.jpg'
        cv2.imwrite(o,im,[cv2.IMWRITE_JPEG_QUALITY,92])
