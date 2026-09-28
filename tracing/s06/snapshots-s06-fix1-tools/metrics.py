#!/usr/bin/env python3
# s06 r3 metrics: compare render frames (frame-*-at-T s.png) with the SOURCE frame the render actually shows
# (hyperframes snapshot floors T to the 30 fps grid; the shot rounds to the nearest 25 fps frame).
# Usage: metrics.py DIR [--crops]   -> per-frame, per-region MAE at sigma 5 / 1.5 and SSIM-ish detail score
import cv2, numpy as np, glob, re, sys, os
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
R={'full':(0,0,2206,946),'face':(780,180,1330,760),'mouth':(1000,600,1320,760),'brows':(800,180,1320,300),
   'eyes':(780,280,1330,420),'hand':(560,350,1000,800),'hair':(700,120,1450,560),'beanie':(560,0,1450,200),
   'owl':(1450,150,1900,650),'owleye':(1560,330,1860,480),'hoodieL':(50,400,560,800),'hoodieR':(1300,550,2100,860),
   'roomL':(0,0,560,400),'roomR':(1900,0,2206,946),'laptop':(450,800,1900,946)}
d=sys.argv[1]; cap=cv2.VideoCapture(V)
def src(i):
    cap.set(1,i); ok,f=cap.read(); return cv2.cvtColor(f,cv2.COLOR_BGR2GRAY).astype(np.float32)
def ssim(a,b,s=1.5):
    C1,C2=(0.01*255)**2,(0.03*255)**2
    ma,mb=cv2.GaussianBlur(a,(0,0),s),cv2.GaussianBlur(b,(0,0),s)
    va=cv2.GaussianBlur(a*a,(0,0),s)-ma*ma; vb=cv2.GaussianBlur(b*b,(0,0),s)-mb*mb; cv=cv2.GaussianBlur(a*b,(0,0),s)-ma*mb
    return ((2*ma*mb+C1)*(2*cv+C2))/((ma*ma+mb*mb+C1)*(va+vb+C2))
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
keys=[a for a in sys.argv[2].split(',')] if len(sys.argv)>2 and not sys.argv[2].startswith('--') else list(R); acc={k:[] for k in keys}
print('T      frame '+' '.join(f'{k:>12s}' for k in keys))
for f in fs:
    T=float(re.search(r'at-([\d.]+)s',f).group(1)); k=int(np.floor(T*30+1e-6)); i=int(np.floor(k/30*25+1e-3))
    a=cv2.imread(f,0).astype(np.float32); b=src(i)
    b5,a5=cv2.GaussianBlur(b,(0,0),5),cv2.GaussianBlur(a,(0,0),5); b1,a1=cv2.GaussianBlur(b,(0,0),1.5),cv2.GaussianBlur(a,(0,0),1.5)
    S=ssim(a,b)
    row=[]
    for kk in keys:
        x0,y0,x1,y1=R[kk]; m5=np.abs(a5-b5)[y0:y1,x0:x1].mean(); m1=np.abs(a1-b1)[y0:y1,x0:x1].mean(); ss=S[y0:y1,x0:x1].mean()
        acc[kk].append((m5,m1,ss)); row.append(f'{m5:4.1f}/{m1:4.1f}/{ss:.2f}')
    print(f'{T:6.3f} {i:4d} '+' '.join(f'{r:>12s}' for r in row))
    if '--crops' in sys.argv:
        os.makedirs(d+'/crops',exist_ok=True)
        A=cv2.imread(f); B=cv2.cvtColor(b.astype(np.uint8),cv2.COLOR_GRAY2BGR)
        for kk in ('face','owl','hand','hair','beanie'):
            x0,y0,x1,y1=R[kk]; cv2.imwrite(f'{d}/crops/{kk}-{T:.2f}.jpg',np.hstack([A[y0:y1,x0:x1],B[y0:y1,x0:x1]]),[cv2.IMWRITE_JPEG_QUALITY,92])
print('mean   ---- '+' '.join(f'{np.mean([v[0] for v in acc[k]]):4.1f}/{np.mean([v[1] for v in acc[k]]):4.1f}/{np.mean([v[2] for v in acc[k]]):.2f}' for k in keys))
