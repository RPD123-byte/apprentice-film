# pair.py T dirA [dirB ...] out.jpg [x0,y0,x1,y1] [--w W]  -> stacked: each dir's frame, then source (labelled)
import cv2, numpy as np, sys, os, glob, re
REF=os.path.dirname(os.path.abspath(__file__))
a=sys.argv[1:]; W=None
if '--w' in a: i=a.index('--w'); W=int(a[i+1]); del a[i:i+2]
t=float(a[0]); crop=None
if re.match(r'^\d+,\d+,\d+,\d+$', a[-1]): crop=[int(v) for v in a[-1].split(',')]; a=a[:-1]
out=a[-1]; dirs=a[1:-1]
def find(d):
    p=os.path.join(d,f'film-{t:.1f}.png')
    if os.path.exists(p): return p
    for f in glob.glob(os.path.join(d,'frame-*-at-*.png')):
        m=re.search(r'at-([\d.]+)s',f)
        if m and abs(float(m.group(1))-t)<0.01: return f
ims=[(os.path.basename(d.rstrip('/')),cv2.imread(find(d))) for d in dirs]+[('source',cv2.imread(os.path.join(REF,f'src-{t:.1f}.png')))]
tiles=[]
for n,im in ims:
    if crop: im=im[crop[1]:crop[3],crop[0]:crop[2]]
    if W: im=cv2.resize(im,(W,int(im.shape[0]*W/im.shape[1])),interpolation=cv2.INTER_AREA if W<im.shape[1] else cv2.INTER_CUBIC)
    im=im.copy(); cv2.putText(im,n,(8,28),0,0.9,(0,255,255),2); tiles.append(im)
cv2.imwrite(out,np.vstack(tiles),[cv2.IMWRITE_JPEG_QUALITY,88])
