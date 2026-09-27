# tiles.py DIR x0 y0 x1 y1 out.jpg [--w W] [--cols N] [--from a --to b]
import cv2, glob, sys, re, numpy as np
d=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); out=sys.argv[6]
def opt(k,dflt):
    return type(dflt)(sys.argv[sys.argv.index(k)+1]) if k in sys.argv else dflt
W=opt('--w',300); cols=opt('--cols',4); a0=opt('--from',-1.0); a1=opt('--to',99.0)
fs=sorted(glob.glob(f'{d}/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
tiles=[]
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    if t<a0 or t>a1: continue
    a=cv2.imread(f)[y0:y1,x0:x1]; b=cv2.imread(f.replace('/frame-','/ref-'))[y0:y1,x0:x1]
    h=int(W*(y1-y0)/(x1-x0)); a=cv2.resize(a,(W,h),interpolation=cv2.INTER_AREA); b=cv2.resize(b,(W,h),interpolation=cv2.INTER_AREA)
    pair=np.hstack([a,np.full((h,3,3),(0,0,200),np.uint8),b])
    lab=np.zeros((18,pair.shape[1],3),np.uint8); cv2.putText(lab,f'{t:.2f}  R | S',(4,14),cv2.FONT_HERSHEY_SIMPLEX,0.45,(255,255,255),1)
    tiles.append(np.vstack([lab,pair,np.full((4,pair.shape[1],3),60,np.uint8)]))
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack([np.hstack([t,np.full((t.shape[0],8,3),60,np.uint8)]) for t in tiles[i:i+cols]]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88]); print(out,np.vstack(rows).shape)
