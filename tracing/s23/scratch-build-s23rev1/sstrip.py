import cv2, sys, numpy as np
# sstrip.py n0 n1 step out.jpg [x0 y0 x1 y1] [--cols N --w W]
SP='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s23rev1/src/'
a=sys.argv[1:]; o={}
while any(x.startswith('--') for x in a):
    i=[j for j,x in enumerate(a) if x.startswith('--')][0]; o[a[i]]=a[i+1]; del a[i:i+2]
n0,n1,st,out=int(a[0]),int(a[1]),int(a[2]),a[3]; roi=[int(v) for v in a[4:8]] if len(a)>=8 else None
cols=int(o.get('--cols',4)); tw=int(o.get('--w',540)); tiles=[]
for n in range(n0,n1+1,st):
    f=cv2.imread(SP+'n%05d.png'%n)
    if roi: f=f[roi[1]:roi[3],roi[0]:roi[2]]
    f=cv2.resize(f,(tw,int(f.shape[0]*tw/f.shape[1])),interpolation=cv2.INTER_AREA)
    cv2.putText(f,'f%d %.2f'%(n,n/25),(4,20),0,0.6,(0,255,255),2); tiles.append(f)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]),[cv2.IMWRITE_JPEG_QUALITY,88])
