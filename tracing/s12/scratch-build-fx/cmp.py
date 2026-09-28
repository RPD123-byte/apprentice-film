import cv2, numpy as np, glob, re, sys, os
# cmp.py renderdir [outprefix] -> per-frame blurred MAE + sheet (render over source)
d=sys.argv[1]; pre=sys.argv[2] if len(sys.argv)>2 else None
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
rows=[]; tot=[]
for p in fs:
    t=float(re.search(r'at-([\d.]+)s',p).group(1)); f=int(round(t*25))
    if t<2: continue
    r=cv2.imread(p,0).astype(np.float32); s=cv2.imread(f'../src/f{f}.png',0).astype(np.float32)
    rb=cv2.GaussianBlur(r,(0,0),12); sb=cv2.GaussianBlur(s,(0,0),12)
    m=np.abs(rb-sb).mean(); m4=np.abs(cv2.GaussianBlur(r,(0,0),4)-cv2.GaussianBlur(s,(0,0),4)).mean()
    hi_r=(r>200).mean()*100; hi_s=(s>200).mean()*100; lo_r=(r<20).mean()*100; lo_s=(s<20).mean()*100
    tot.append(m)
    print(f'{f} {t:.2f} mae12 {m:5.1f} mae4 {m4:5.1f} mean {r.mean():5.1f}/{s.mean():5.1f} hi {hi_r:4.1f}/{hi_s:4.1f} lo {lo_r:4.1f}/{lo_s:4.1f}')
    if pre:
        a=cv2.resize(cv2.imread(p),(1103,473)); b=cv2.resize(cv2.imread(f'../src/f{f}.png'),(1103,473))
        cv2.putText(a,f'R {t:.2f} {m:.1f}',(8,26),0,0.8,(0,255,255),2); cv2.putText(b,f'S {f}',(8,26),0,0.8,(0,255,255),2)
        rows.append(np.hstack([a,b]))
print('mean mae12', np.mean(tot), 'n', len(tot))
if pre:
    for i in range(0,len(rows),6):
        cv2.imwrite(f'{pre}_{i//6:02d}.jpg',np.vstack(rows[i:i+6]),[cv2.IMWRITE_JPEG_QUALITY,80])
