import cv2,numpy as np,glob,re,sys
d=sys.argv[1]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
tot=[]
for p in fs:
    t=float(re.search(r'at-([\d.]+)s',p).group(1)); q=p.replace('frame-','ref-')
    a=cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(np.float32); b=cv2.cvtColor(cv2.imread(q),cv2.COLOR_BGR2GRAY).astype(np.float32)
    ab=cv2.GaussianBlur(a,(0,0),6); bb=cv2.GaussianBlur(b,(0,0),6)
    m=np.abs(ab-bb).mean(); tot.append(m)
    # region means
    regs={'owl':(900,150,1500,850),'left':(0,0,900,946),'right':(1500,0,2206,946)}
    s=' '.join(f"{k}:{np.abs(ab[y0:y1,x0:x1]-bb[y0:y1,x0:x1]).mean():.1f}" for k,(x0,y0,x1,y1) in regs.items())
    print(f"{t:6.2f} fr{round(t*25)} mae {m:5.1f}  mean r {a.mean():5.1f} s {b.mean():5.1f}  {s}")
print('mean',np.mean(tot))
