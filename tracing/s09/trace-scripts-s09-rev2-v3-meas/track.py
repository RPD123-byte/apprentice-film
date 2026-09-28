# track.py DIR : for each render frame, phase-correlate head (beanie+cuff) and shoulder-slab-left regions against
# source frames around round(t*25); report shift of render vs each source frame
import cv2,numpy as np,glob,re,sys,math
SRC='/Users/computer/rootline/apprentice-film/snapshots/s09-rev2-v3-src/f%04d.png'
def g(p): return cv2.GaussianBlur(cv2.imread(p,0).astype(np.float32),(0,0),1.2)
REG={'beanie':(10,10,470,550),'hairL':(0,560,330,946),'slabL':(600,740,900,946),'owl':(700,150,1300,560),'room':(1545,200,2030,700)}
cache={}
def src(k):
    if k not in cache: cache[k]=g(SRC%k)
    return cache[k]
def pc(a,b):
    w=cv2.createHanningWindow((a.shape[1],a.shape[0]),cv2.CV_32F)
    (dx,dy),r=cv2.phaseCorrelate(b,a,w); return dx,dy
for f in sorted(glob.glob(sys.argv[1]+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1))):
    t=float(re.search(r'at-([\d.]+)s',f).group(1)); A=g(f); k0=int(round(t*25))
    out=[]
    for k in (k0-1,k0,k0+1):
        s=[]
        for n,(x0,y0,x1,y1) in REG.items():
            dx,dy=pc(A[y0:y1,x0:x1],src(k)[y0:y1,x0:x1]); s.append(f'{n}({dx:+.2f},{dy:+.2f})')
        out.append(f'  vs {k}: '+' '.join(s))
    print(f't={t}'); print('\n'.join(out))
