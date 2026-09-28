# reg.py T x0,y0,x1,y1 dir1 dir2 ... : region ΔE at σ2/4/8/12
import cv2, numpy as np, sys, glob, re, os
t=float(sys.argv[1]); x0,y0,x1,y1=[int(v) for v in sys.argv[2].split(',')]
S=cv2.imread(f'hipR-ref/src-{t:.1f}.png')
def find(d):
    p=os.path.join(d,f'film-{t:.1f}.png')
    if os.path.exists(p): return p
    for f in glob.glob(os.path.join(d,'frame-*-at-*.png')):
        m=re.search(r'at-([\d.]+)s',f)
        if m and abs(float(m.group(1))-t)<0.01: return f
def lab(im,s): return cv2.cvtColor(cv2.GaussianBlur(im,(0,0),s).astype(np.float32)/255,cv2.COLOR_BGR2Lab)
for d in sys.argv[3:]:
    R=cv2.imread(find(d))
    print(f'{d:18s}', '  '.join(f's{s}:{np.linalg.norm(lab(R,s)-lab(S,s),axis=2)[y0:y1,x0:x1].mean():5.2f}' for s in (2,4,8,12)))
