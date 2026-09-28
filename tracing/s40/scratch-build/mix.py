import cv2, numpy as np
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
c=cv2.VideoCapture(V); fps=c.get(5)
def fr(t):
    c.set(cv2.CAP_PROP_POS_FRAMES,int(round(t*fps))); ok,f=c.read(); return f.astype(np.float32)
def blur(f): return cv2.GaussianBlur(f,(0,0),3)
R=blur(sum(fr(t) for t in [135.6,135.64,135.68,135.72])/4)
E=blur(sum(fr(t) for t in [137.6,137.8,138.0,138.2])/4)
d=E-R; mag=np.abs(d).sum(2)
# masks: wordmark face (cream letters), orange bg, clouds
Eg=E.mean(2)
# region masks by position
H,W=mag.shape
yy,xx=np.mgrid[0:H,0:W]
letters=(Eg>215)&(yy>380)&(yy<560)&(xx>520)&(xx<1500)
bg=(yy>100)&(yy<330)&(xx>700)&(xx<1500)
clouds=(Eg>200)&(yy>800)&((xx<500)|(xx>1800))
print('fps',fps)
for i in range(-6,32):
    t=136.0+i*0.04
    S=blur(fr(t))
    out=[]
    for name,m in [('letters',letters),('bg',bg),('clouds',clouds),('all',mag>60)]:
        mm=m&(mag>60)
        a=((S-R)*d).sum(2)[mm].sum()/((d*d).sum(2)[mm].sum())
        out.append(f'{name}={a:.3f}')
    print(f'{t:.2f}',' '.join(out))
