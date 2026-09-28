# crop compare: cc.py DIR x0 y0 x1 y1 scale out [idx]  -> render | ref side by side (or stacked if wide)
import cv2, sys, glob, numpy as np
d=sys.argv[1]; x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; s=float(sys.argv[6]); out=sys.argv[7]; idx=sys.argv[8] if len(sys.argv)>8 else '*'
fr=sorted(glob.glob(f'{d}/frame-{idx}-at-*.png'))[0]; rf=fr.replace('/frame-','/ref-')
a=cv2.imread(fr)[y0:y1,x0:x1]; b=cv2.imread(rf)[y0:y1,x0:x1]
a=cv2.resize(a,None,fx=s,fy=s,interpolation=cv2.INTER_AREA if s<1 else cv2.INTER_CUBIC); b=cv2.resize(b,a.shape[1::-1],interpolation=cv2.INTER_AREA if s<1 else cv2.INTER_CUBIC)
if (x1-x0)>(y1-y0)*1.3: im=np.vstack([a,np.full((4,a.shape[1],3),(0,0,255),np.uint8),b])
else: im=np.hstack([a,np.full((a.shape[0],4,3),(0,0,255),np.uint8),b])
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,90])
ga=cv2.cvtColor(a,cv2.COLOR_BGR2GRAY).astype(np.float32); gb=cv2.cvtColor(b,cv2.COLOR_BGR2GRAY).astype(np.float32)
hf=lambda g: np.abs(g-cv2.GaussianBlur(g,(0,0),3)).mean()
print(fr.split('/')[-1],'mean ren %.1f ref %.1f | std %.1f %.1f | hf %.1f %.1f'%(ga.mean(),gb.mean(),ga.std(),gb.std(),hf(ga),hf(gb)))
