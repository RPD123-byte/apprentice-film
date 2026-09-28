# pair renders r-T.png in a dir with source frames: pair-T.jpg (render | source), vertical stack option, and blurred MAE.
import cv2,numpy as np,sys,glob,re,os
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
d=sys.argv[1]; mode=sys.argv[2] if len(sys.argv)>2 else 'h'
c=cv2.VideoCapture(V)
rows=[]
for p in sorted(glob.glob(d+'/r-*.png'),key=lambda p: float(re.search(r'r-([\d.]+)\.png',p).group(1))):
    t=float(re.search(r'r-([\d.]+)\.png',p).group(1))
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*25))); ok,s=c.read()
    r=cv2.imread(p)
    br=cv2.GaussianBlur(cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),8)
    bs=cv2.GaussianBlur(cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(np.float32),(0,0),8)
    mae=np.abs(br-bs).mean()
    print(f'{t:.2f} blurMAE={mae:.1f} meanR={br.mean():.1f} meanS={bs.mean():.1f}')
    a=cv2.resize(r,None,fx=0.5,fy=0.5,interpolation=cv2.INTER_AREA); b=cv2.resize(s,None,fx=0.5,fy=0.5,interpolation=cv2.INTER_AREA)
    cv2.putText(a,f'R {t:.2f}',(10,24),0,0.7,(0,255,0),2); cv2.putText(b,f'S {t:.2f}',(10,24),0,0.7,(0,255,255),2)
    im=np.vstack([a,b]) if mode=='v' else np.hstack([a,b])
    cv2.imwrite(os.path.join(d,f'pair-{t:.2f}.jpg'),im,[cv2.IMWRITE_JPEG_QUALITY,85])
