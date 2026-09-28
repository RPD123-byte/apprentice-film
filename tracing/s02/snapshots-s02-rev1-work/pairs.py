import cv2, numpy as np, glob, re, sys, math, os
SRC='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
dirs=sys.argv[1:]
cap=cv2.VideoCapture(SRC)
cache={}
def src(f):
    if f not in cache:
        cap.set(cv2.CAP_PROP_POS_FRAMES,f); ok,im=cap.read(); cache[f]=im
    return cache[f]
def blur(a): return cv2.GaussianBlur(a.astype(np.float32),(0,0),8)
out='/Users/computer/rootline/apprentice-film/snapshots/s02-rev1-work'
rows=[]
for d in dirs:
    for p in glob.glob(d+'/frame-*.png'):
        t=float(re.search(r'at-([\d.]+)s',p).group(1))
        f=math.floor(t*25+0.5)
        r=cv2.imread(p)
        ref=cv2.imread(p.replace('frame-','ref-'))
        # which cv2 frame is the tool's ref
        refidx=None
        for k in range(f-2,f+3):
            if np.abs(ref.astype(np.int16)-src(k).astype(np.int16)).mean()<0.5: refidx=k
        br=blur(r)
        errs={o:float(np.abs(br-blur(src(f+o))).mean()) for o in range(-3,4)}
        best=min(errs,key=errs.get)
        mean_r=float(r.mean()); mean_s=float(src(f).mean())
        rows.append((t,f,refidx,errs[0],best,errs[best],mean_r,mean_s))
        pair=np.hstack([r,src(f)])
        cv2.putText(pair,f'render f{f} t={t:.2f}',(20,40),cv2.FONT_HERSHEY_SIMPLEX,1.2,(0,0,255),2)
        cv2.putText(pair,f'source f{f}',(2206+20,40),cv2.FONT_HERSHEY_SIMPLEX,1.2,(0,0,255),2)
        cv2.imwrite(f'{out}/p{f:04d}.jpg',cv2.resize(pair,(2206,473)),[cv2.IMWRITE_JPEG_QUALITY,88])
rows.sort()
print('t f toolref mae0 bestoff maebest meanR meanS')
for r in rows: print(f'{r[0]:6.2f} {r[1]:4d} {r[2]} {r[3]:6.2f} {r[4]:+d} {r[5]:6.2f} {r[6]:6.1f} {r[7]:6.1f}')
