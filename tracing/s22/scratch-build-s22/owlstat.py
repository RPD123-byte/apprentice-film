import cv2,glob,re,sys,numpy as np
d=sys.argv[1]; boxes=eval(sys.argv[2])  # {t:(x0,y0,x1,y1)}
for t,(x0,y0,x1,y1) in boxes.items():
    f=[p for p in glob.glob(d+'/frame-*.png') if abs(float(re.search(r'at-([\d.]+)s',p).group(1))-t)<1e-3][0]
    a=cv2.imread(f).astype(np.float32).mean(2)[y0:y1,x0:x1]; b=cv2.imread(f.replace('frame-','ref-')).astype(np.float32).mean(2)[y0:y1,x0:x1]
    mb=cv2.GaussianBlur(b,(0,0),1.5)>150; ma=cv2.GaussianBlur(a,(0,0),1.5)>150
    print(t,'src owl px',mb.sum(),'render',ma.sum(),' src p25/50/75/90',np.percentile(b[mb],[25,50,75,90]).round(0),' render',np.percentile(a[ma],[25,50,75,90]).round(0),
      ' same-mask src/ren mean %.1f %.1f'%(b[mb].mean(),a[mb].mean()), 'blur3 mae %.1f'%np.abs(cv2.GaussianBlur(a,(0,0),3)-cv2.GaussianBlur(b,(0,0),3)).mean())
