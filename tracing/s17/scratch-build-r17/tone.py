import cv2, numpy as np, glob, re, sys
d=sys.argv[1]
R={'full':(0,0,2206,946),'headline':(60,70,860,290),'face':(990,190,1160,400),'shirt':(900,380,1260,560),'jeans':(900,560,1260,860),
   'owlbox':(540,300,960,600),'left':(0,300,540,946),'right':(1300,300,2206,946),'floor':(0,840,2206,946),'wallTop':(900,0,1800,160)}
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
print('t      '+' '.join(f'{k:>16s}' for k in R))
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    a=cv2.imread(f,0).astype(np.float32); b=cv2.imread(f.replace('frame-','ref-'),0).astype(np.float32)
    ab=cv2.GaussianBlur(a,(0,0),6); bb=cv2.GaussianBlur(b,(0,0),6)
    row=[]
    for k,(x0,y0,x1,y1) in R.items():
        ma=a[y0:y1,x0:x1].mean(); mb=b[y0:y1,x0:x1].mean(); e=np.abs(ab-bb)[y0:y1,x0:x1].mean()
        row.append(f'{ma:5.1f}/{mb:5.1f} e{e:4.1f}')
    print(f'{t:6.2f} '+' '.join(row))
