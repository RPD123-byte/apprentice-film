# usage: crop.py dir time x0 y0 x1 y1 out [scale] [--diff]  -> render (top) / source (bottom) crop
import cv2, sys, glob, numpy as np
d,t=sys.argv[1],sys.argv[2]; x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]
sc=float(sys.argv[8]) if len(sys.argv)>8 and not sys.argv[8].startswith('--') else 1.0
f=glob.glob(f'{d}/frame-*-at-{t}s.png')[0]; r=glob.glob(f'{d}/ref-*-at-{t}s.png')[0]
A=cv2.imread(f)[y0:y1,x0:x1]; B=cv2.imread(r)[y0:y1,x0:x1]
if sc!=1: A=cv2.resize(A,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA); B=cv2.resize(B,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
sep=np.full((6,A.shape[1],3),(0,0,255),np.uint8)
parts=[A,sep,B]
if '--diff' in sys.argv:
    ga=cv2.GaussianBlur(cv2.cvtColor(A,cv2.COLOR_BGR2GRAY).astype(float),(0,0),8); gb=cv2.GaussianBlur(cv2.cvtColor(B,cv2.COLOR_BGR2GRAY).astype(float),(0,0),8)
    dd=np.clip(128+(ga-gb)*2,0,255).astype(np.uint8); parts+= [sep, cv2.cvtColor(dd,cv2.COLOR_GRAY2BGR)]
cv2.imwrite(out,np.vstack(parts),[cv2.IMWRITE_JPEG_QUALITY,90])
