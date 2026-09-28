# kpairs.py DIR [--crop x0 y0 x1 y1 --out prefix --scale s] [--sum]  (DIR holds k<frame>.png from snap.sh)
import sys, glob, re, cv2, numpy as np
sys.path.insert(0, __file__.rsplit('/',1)[0]); from src import frame
d=sys.argv[1]
REG={'screen':(300,160,910,660),'room':(0,0,1150,160),'right':(1780,0,2206,946),'fig':(1150,0,1780,600),'owl':(1420,220,1760,640),'hands':(500,560,1400,800),'deskL':(0,560,500,946)}
fs=sorted(glob.glob(d+'/k*.png'),key=lambda p:int(re.search(r'k(\d+)',p.rsplit('/',1)[1]).group(1)))
crop=None
if '--crop' in sys.argv:
    i=sys.argv.index('--crop'); crop=tuple(int(v) for v in sys.argv[i+1:i+5])
acc=[]
for p in fs:
    k=int(re.search(r'k(\d+)',p.rsplit('/',1)[1]).group(1))
    r=cv2.imread(p).astype(np.float32); s=frame(k).astype(np.float32)
    rl=cv2.cvtColor(r,cv2.COLOR_BGR2GRAY); sl=cv2.cvtColor(s,cv2.COLOR_BGR2GRAY)
    e={sg:np.abs(cv2.GaussianBlur(rl,(0,0),sg)-cv2.GaussianBlur(sl,(0,0),sg)) for sg in (1,2,4)}
    reg={n:e[2][y0:y1,x0:x1].mean() for n,(x0,y0,x1,y1) in REG.items()}
    ns=np.ones_like(e[2],bool); x0,y0,x1,y1=REG['screen']; ns[y0:y1,x0:x1]=False
    acc.append([e[1].mean(),e[2].mean(),e[4].mean(),e[2][ns].mean()])
    print(f'k{k} {k/25:6.2f} s1 {e[1].mean():5.2f} s2 {e[2].mean():5.2f} s4 {e[4].mean():5.2f} nonscr {e[2][ns].mean():5.2f} | '+' '.join(f'{n} {v:5.2f}' for n,v in reg.items()), f'mean r{rl.mean():.1f} s{sl.mean():.1f}')
    if crop:
        x0,y0,x1,y1=crop; a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
        sc=float(sys.argv[sys.argv.index('--scale')+1]) if '--scale' in sys.argv else 1
        im=np.hstack([a,np.full((a.shape[0],6,3),255,np.float32),b]).astype(np.uint8)
        if sc!=1: im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
        o=(sys.argv[sys.argv.index('--out')+1] if '--out' in sys.argv else d+'/crop')+f'-k{k}.jpg'
        cv2.imwrite(o,im,[cv2.IMWRITE_JPEG_QUALITY,92])
if len(acc)>1:
    a=np.array(acc); print('MEAN s1 %.2f s2 %.2f s4 %.2f nonscr %.2f  (n=%d)'%(*a.mean(0),len(a)))
