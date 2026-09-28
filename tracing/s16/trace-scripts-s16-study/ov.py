# overlay/side-by-side of render vs ref. usage: ov.py dir idx out [x0 y0 x1 y1] [mode]
import cv2,numpy as np,sys,glob
d,idx,out=sys.argv[1],int(sys.argv[2]),sys.argv[3]
fr=sorted(glob.glob(f'{d}/frame-{idx:02d}-*.png'))[0]; rf=sorted(glob.glob(f'{d}/ref-{idx:02d}-*.png'))[0]
a=cv2.imread(fr,0); b=cv2.imread(rf,0)
if len(sys.argv)>=8: x0,y0,x1,y1=map(int,sys.argv[4:8]); a=a[y0:y1,x0:x1]; b=b[y0:y1,x0:x1]
mode=sys.argv[8] if len(sys.argv)>8 else 'both'
ov=np.dstack([b*0, b, a])  # render red, ref green
if mode=='ov': res=ov
elif mode=='sbs': res=np.hstack([cv2.cvtColor(a,cv2.COLOR_GRAY2BGR),cv2.cvtColor(b,cv2.COLOR_GRAY2BGR)])
else: res=np.vstack([np.hstack([cv2.cvtColor(a,cv2.COLOR_GRAY2BGR),cv2.cvtColor(b,cv2.COLOR_GRAY2BGR)]), np.hstack([ov, cv2.cvtColor(cv2.absdiff(cv2.GaussianBlur(a,(0,0),6),cv2.GaussianBlur(b,(0,0),6))*3,cv2.COLOR_GRAY2BGR)])])
mw=float(sys.argv[9]) if len(sys.argv)>9 else 2000
if res.shape[1]>mw: res=cv2.resize(res,(int(mw),int(res.shape[0]*mw/res.shape[1])),interpolation=cv2.INTER_AREA)
cv2.imwrite(out,res,[cv2.IMWRITE_JPEG_QUALITY,88])
