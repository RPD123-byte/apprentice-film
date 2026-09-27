import cv2, glob, sys, numpy as np, re
d=sys.argv[1]
fs=sorted(glob.glob(f'{d}/frame-*.png'))
tot=[]
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    a=cv2.imread(f,0).astype(np.float32); b=cv2.imread(f.replace('/frame-','/ref-'),0).astype(np.float32)
    A=cv2.resize(a,(2206//8,946//8),interpolation=cv2.INTER_AREA); B=cv2.resize(b,(2206//8,946//8),interpolation=cv2.INTER_AREA)
    e=np.abs(A-B).mean(); tot.append((t,e,a.mean(),b.mean()))
    print(f"t={t:5.2f} mae8={e:5.1f} mean render={a.mean():5.1f} src={b.mean():5.1f}")
print('avg', np.mean([x[1] for x in tot if x[0]<6.04]))
