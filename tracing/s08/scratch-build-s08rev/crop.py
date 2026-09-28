import cv2, sys, numpy as np
# usage: crop.py render.png ref.png x0 y0 x1 y1 out.jpg [scale] [mode: v|h] [diff]
r=cv2.imread(sys.argv[1]); s=cv2.imread(sys.argv[2])
x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]
sc=float(sys.argv[8]) if len(sys.argv)>8 else 1.0
mode=sys.argv[9] if len(sys.argv)>9 else 'v'
dif=len(sys.argv)>10
a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
parts=[a,b]
if dif:
    d=(a.astype(int)-b.astype(int)).mean(2)
    dd=np.clip(128+d*4,0,255).astype(np.uint8)
    parts.append(cv2.cvtColor(dd,cv2.COLOR_GRAY2BGR))
sep=np.full((4,a.shape[1],3),(0,200,255),np.uint8) if mode=='v' else np.full((a.shape[0],4,3),(0,200,255),np.uint8)
seq=[]
for p in parts: seq+= [p,sep]
im=np.vstack(seq[:-1]) if mode=='v' else np.hstack(seq[:-1])
if sc!=1: im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST if sc>1 else cv2.INTER_AREA)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,92])
