# usage: sheet.py out.jpg frames(comma or a:b:step) [--r RDIR] [--crop x0 y0 x1 y1] [--cols N] [--w W]
import cv2, sys, numpy as np
a=sys.argv[1:]; out=a[0]; spec=a[1]; rest=a[2:]
def take(flag,n):
    global rest
    if flag in rest:
        i=rest.index(flag); v=rest[i+1:i+1+n]; rest=rest[:i]+rest[i+1+n:]; return v
rd=take('--r',1); crop=take('--crop',4); cols=take('--cols',1); W=take('--w',1)
cols=int(cols[0]) if cols else 4; W=int(W[0]) if W else 2000
if ':' in spec: s0,s1,st=map(int,spec.split(':')); fr=list(range(s0,s1+1,st))
else: fr=[int(x) if (x.isdigit() and len(x)==4) else int(round(float(x)*25)) for x in spec.split(',')]
tiles=[]
for f in fr:
    ims=[cv2.imread(f'src/f{f:05d}.png')]
    if rd: ims=[cv2.imread(f'{rd[0]}/r-{f:05d}.png')]+ims
    ims=[im for im in ims if im is not None]
    if crop:
        x0,y0,x1,y1=map(int,crop); ims=[im[y0:y1,x0:x1] for im in ims]
    t=np.vstack(ims)
    cv2.putText(t,f'{f/25:.2f}',(8,34),cv2.FONT_HERSHEY_SIMPLEX,1.1,(0,255,255),2)
    tiles.append(t)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
im=np.vstack(rows); sc=W/im.shape[1]
cv2.imwrite(out,cv2.resize(im,(W,int(im.shape[0]*sc)),interpolation=cv2.INTER_AREA),[cv2.IMWRITE_JPEG_QUALITY,88])
