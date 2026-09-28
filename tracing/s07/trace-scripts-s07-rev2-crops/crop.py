import cv2, sys, numpy as np
# usage: crop.py render.png ref.png x0 y0 x1 y1 out.jpg [scale]
r=cv2.imread(sys.argv[1]); s=cv2.imread(sys.argv[2])
x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]; sc=float(sys.argv[8]) if len(sys.argv)>8 else 1
a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
if sc!=1:
    a=cv2.resize(a,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC); b=cv2.resize(b,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
sep=np.full((a.shape[0],6,3),(0,0,255),np.uint8)
im=np.hstack([a,sep,b])
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,92])
ga=cv2.cvtColor(r[y0:y1,x0:x1],cv2.COLOR_BGR2GRAY).astype(float); gb=cv2.cvtColor(s[y0:y1,x0:x1],cv2.COLOR_BGR2GRAY).astype(float)
hp=lambda g: np.abs(g-cv2.GaussianBlur(g,(0,0),3)).mean()
print(f"mean {ga.mean():.1f} vs {gb.mean():.1f} | std {ga.std():.1f} vs {gb.std():.1f} | hf {hp(ga):.1f} vs {hp(gb):.1f} | blurMAE {np.abs(cv2.GaussianBlur(ga,(0,0),6)-cv2.GaussianBlur(gb,(0,0),6)).mean():.1f}")
