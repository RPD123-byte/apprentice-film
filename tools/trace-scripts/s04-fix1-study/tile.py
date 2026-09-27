# tile.py DIR out.jpg [--ref] [--cols N] [--w PX] [x0 y0 x1 y1]: tile frame-*.png (or ref-*.png) with timestamps
import cv2, glob, re, sys, numpy as np
a=[];o={};i=1
while i<len(sys.argv):
    s=sys.argv[i]
    if s=='--ref': o['ref']=1; i+=1
    elif s.startswith('--'): o[s]=sys.argv[i+1]; i+=2
    else: a.append(s); i+=1
d,out=a[0],a[1]; roi=[int(v) for v in a[2:6]] if len(a)>=6 else None
cols=int(o.get('--cols',3)); tw=int(o.get('--w',700))
pat='ref-*.png' if o.get('ref') else 'frame-*.png'
fs=sorted(glob.glob(d+'/'+pat),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
tiles=[]
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1)); im=cv2.imread(f)
    if roi: im=im[roi[1]:roi[3],roi[0]:roi[2]]
    th=int(im.shape[0]*tw/im.shape[1]); im=cv2.resize(im,(tw,th),interpolation=cv2.INTER_AREA)
    cv2.putText(im,f"{t:.2f}",(4,18),0,0.6,(0,255,255),1); tiles.append(im)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88]); print(out,len(fs))
