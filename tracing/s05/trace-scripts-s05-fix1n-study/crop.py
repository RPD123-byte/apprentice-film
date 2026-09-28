# crop.py OUTDIR k x0 y0 x1 y1 [scale] [u] -> OUTDIR/crop-k-x0.jpg : render crop | source crop (stacked vertically if wide)
import sys, glob, re, math, numpy as np, cv2
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import frames
d=sys.argv[1]; k=int(sys.argv[2]); x0,y0,x1,y1=map(int,sys.argv[3:7]); sc=float(sys.argv[7]) if len(sys.argv)>7 else 1; U=len(sys.argv)>8 and sys.argv[8]=='u'
for f in glob.glob(d+'/frame-*.png'):
    P=float(re.search(r'at-([\d.]+)s',f).group(1)); n=math.floor((P-(10 if U else 0))*30+1e-6)
    if 578+n==k: break
else: sys.exit('no frame')
a=cv2.imread(f)[y0:y1,x0:x1]; b=(np.clip(frames.pre(k) if U else frames.frame(k),0,1)*255).astype(np.uint8)[y0:y1,x0:x1]
if (x1-x0)>(y1-y0)*1.3: im=np.vstack([a,np.full((6,x1-x0,3),255,np.uint8),b])
else: im=np.hstack([a,np.full((y1-y0,6,3),255,np.uint8),b])
im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST if sc>=1 else cv2.INTER_AREA)
o=f'{d}/crop-{k}-{x0}-{y0}.jpg'; cv2.imwrite(o,im,[cv2.IMWRITE_JPEG_QUALITY,92]); print(o)
