# crop.py out.jpg x0 y0 x1 y1 n1,n2,... [--rows src,now,base] [--scale s] : grid rows=SRC/NOW/BASE, cols=frames
import cv2, numpy as np, sys
D='/Users/computer/rootline/apprentice-film/snapshots/'
out=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); ns=[int(a) for a in sys.argv[6].split(',')]
rows=['src','now','base']; sc=1.0
a=sys.argv[7:]
if '--rows' in a: rows=a[a.index('--rows')+1].split(',')
if '--scale' in a: sc=float(a[a.index('--scale')+1])
def get(k,n):
    p={'src':f'{D}end-critic-src/src-{n}.png','now':f'{D}end-critic-render/{n}.png','base':f'{D}end-critic-src/base-{n}.png'}[k]
    im=cv2.imread(p); im=cv2.imread(p[:-4]+'.jpg') if im is None else im; im=im[y0:y1,x0:x1]
    if sc!=1: im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
    cv2.rectangle(im,(0,0),(150,24),(0,0,0),-1); cv2.putText(im,f'{k.upper()} {n/25:.2f}',(4,18),cv2.FONT_HERSHEY_SIMPLEX,0.55,(255,255,255),1)
    return cv2.copyMakeBorder(im,2,2,2,2,cv2.BORDER_CONSTANT,value=(0,255,255))
g=np.vstack([np.hstack([get(k,n) for n in ns]) for k in rows])
cv2.imwrite(out,g,[cv2.IMWRITE_JPEG_QUALITY,90]); print(g.shape)
