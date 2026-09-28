import cv2, numpy as np, glob, re, math, sys
SRC='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
dirs=sys.argv[1].split(',')
cap=cv2.VideoCapture(SRC)
cache={}
def src(f):
    if f not in cache:
        cap.set(cv2.CAP_PROP_POS_FRAMES,f); ok,im=cap.read(); cache[f]=im
    return cache[f]
R={}
for d in dirs:
    for p in glob.glob(d+'/frame-*.png'):
        t=float(re.search(r'at-([\d.]+)s',p).group(1)); R[math.floor(t*25+0.5)]=(t,p)
fs=sorted(R); prev=None
def g(im,s=3): return cv2.GaussianBlur(cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),s)
win=cv2.createHanningWindow((2206,946),cv2.CV_32F)
print('f   t     mae8  best  mae8best  meanR meanS  shift(dx,dy) resp  dup')
for f in fs:
    t,p=R[f]; r=cv2.imread(p)
    dup=''
    if prev is not None and prev[0]==f-1 or (prev is not None and prev[0]==f-2):
        d=np.abs(r.astype(np.int16)-prev[1].astype(np.int16)).max(2)
        if (d>3).mean()<1e-4: dup='DUP?'
    prev=(f,r)
    br=cv2.GaussianBlur(r.astype(np.float32),(0,0),8)
    errs={o:float(np.abs(br-cv2.GaussianBlur(src(f+o).astype(np.float32),(0,0),8)).mean()) for o in (-2,-1,0,1,2)}
    b=min(errs,key=errs.get)
    a=g(r); s=g(src(f))
    (dx,dy),resp=cv2.phaseCorrelate(s,a,win)
    print(f'{f} {f/25:6.2f} {errs[0]:6.2f} {b:+d} {errs[b]:6.2f} {r.mean():6.1f} {src(f).mean():6.1f}  {dx:+7.1f} {dy:+7.1f} {resp:.2f} {dup}')
