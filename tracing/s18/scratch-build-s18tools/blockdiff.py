import cv2,sys,glob,re,numpy as np
# usage: blockdiff.py dir [S] -> per frame: table of render-source block means (blurred), and overall MAE
d=sys.argv[1]; S=int(sys.argv[2]) if len(sys.argv)>2 else 100
fr=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
for f in fr:
    t=re.search(r'at-([\d.]+)s',f).group(1)
    a=cv2.imread(f,0).astype(float); b=cv2.imread(f.replace('frame-','ref-'),0).astype(float)
    ab=cv2.GaussianBlur(a,(0,0),6); bb=cv2.GaussianBlur(b,(0,0),6)
    print(f't={t} MAE(blur6)={np.abs(ab-bb).mean():.1f}  mean r={a.mean():.1f} s={b.mean():.1f}')
    H,W=a.shape
    print('      '+''.join(f'{x:5d}' for x in range(0,W,S)))
    for y in range(0,H,S):
        print(f'{y:5d} '+''.join(f'{int(a[y:y+S,x:x+S].mean()-b[y:y+S,x:x+S].mean()):5d}' for x in range(0,W,S)))
