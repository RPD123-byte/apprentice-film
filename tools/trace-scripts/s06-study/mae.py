import cv2,glob,re,sys,numpy as np
d=sys.argv[1]
for f in sorted(glob.glob(d+'/frame-*.png')):
    idx=re.search(r'frame-(\d+)',f).group(1); t=re.search(r'at-([\d.]+)s',f).group(1)
    a=cv2.imread(f,0).astype(float); b=cv2.imread(glob.glob(f'{d}/ref-{idx}-*.png')[0],0).astype(float)
    ab=cv2.GaussianBlur(a,(0,0),6); bb=cv2.GaussianBlur(b,(0,0),6)
    R={'all':(0,0,2206,946),'face':(740,90,1360,820),'owl':(1500,120,1850,600),'bgR':(1850,0,2206,946),'bgL':(0,0,560,600),'hood':(0,480,560,946)}
    out=[f"{k}={np.abs(ab[y0:y1,x0:x1]-bb[y0:y1,x0:x1]).mean():5.1f}" for k,(x0,y0,x1,y1) in R.items()]
    print(t, ' '.join(out))
