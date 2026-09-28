# cmpmask.py DIR PLATE_T x0 y0 x1 y1 : owl-mask centroid/bbox in render vs source, each against its own plate frame
import cv2, glob, re, sys, numpy as np
d=sys.argv[1]; pt=sys.argv[2]; x0,y0,x1,y1=map(int,sys.argv[3:7]); thr=int(sys.argv[7]) if len(sys.argv)>7 else 45
def ld(k,t): p=glob.glob(f'{d}/{k}-*-at-{t}s.png'); return cv2.imread(p[0]).astype(np.int16) if p else None
pr,ps=ld('frame',pt),ld('ref',pt)
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
def m(a,b):
    dd=np.abs(a-b).max(2).astype(np.uint8)[y0:y1,x0:x1]; mm=(dd>thr).astype(np.uint8)
    mm=cv2.morphologyEx(mm,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    ys,xs=np.nonzero(mm)
    if len(xs)<50: return None,mm
    return (xs.mean()+x0,ys.mean()+y0,xs.min()+x0,xs.max()+x0,ys.min()+y0,ys.max()+y0,len(xs)),mm
for f in fs:
    t=re.search(r'at-([\d.]+)s',f).group(1)
    a=cv2.imread(f).astype(np.int16); b=cv2.imread(f.replace('frame-','ref-')).astype(np.int16)
    ra,ma=m(a,pr); rb,mb=m(b,ps)
    iou=((ma>0)&(mb>0)).sum()/max(1,((ma>0)|(mb>0)).sum())
    fmt=lambda r: 'none' if r is None else f"c=({r[0]:.0f},{r[1]:.0f}) x{r[2]}-{r[3]} y{r[4]}-{r[5]} n={r[6]}"
    print(f"{t:>6} R {fmt(ra)} | S {fmt(rb)} | IoU {iou:.2f}")
