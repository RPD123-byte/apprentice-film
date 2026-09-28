# maskov.py RDIR OUT.jpg t1,t2 x0 y0 x1 y1 [scale] [cols]: owl masks, source red / render green / both yellow, over source grey
import cv2, numpy as np, sys
R,out,ts=sys.argv[1],sys.argv[2],sys.argv[3]; x0,y0,x1,y1=map(int,sys.argv[4:8])
sc=float(sys.argv[8]) if len(sys.argv)>8 else 2; cols=int(sys.argv[9]) if len(sys.argv)>9 else 3
SRC='/Users/computer/rootline/apprentice-film/snapshots/s21-r3-src'
ms=np.load(SRC+'/median.npy'); mr=np.load(R+'/median.npy')
B=lambda a,s: cv2.GaussianBlur(a,(0,0),s); g=lambda p: cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY).astype(np.float32)
tiles=[]
for t in ts.split(','):
    t=float(t); f=round(t*25); r=g(f'{R}/r-{t:.2f}.png'); s=g(f'{SRC}/f{f:04d}.png')
    k=np.ones((3,3),np.uint8)
    mS=cv2.morphologyEx((np.abs(B(s,1.5)-B(ms,1.5))>22).astype(np.uint8),cv2.MORPH_OPEN,k)
    mR=cv2.morphologyEx((np.abs(B(r,1.5)-B(mr,1.5))>22).astype(np.uint8),cv2.MORPH_OPEN,k)
    base=(s*0.5).astype(np.uint8); im=cv2.cvtColor(base,cv2.COLOR_GRAY2BGR)
    im[(mS>0)&(mR==0)]=(0,0,230); im[(mR>0)&(mS==0)]=(0,220,0); im[(mR>0)&(mS>0)]=(0,200,220)
    c=im[y0:y1,x0:x1]; c=cv2.resize(c,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST)
    iou=((mS&mR)[y0:y1,x0:x1].sum())/max(1,((mS|mR)[y0:y1,x0:x1]).sum())
    cv2.putText(c,f'{t:.2f} IoU {iou:.2f}',(6,22),cv2.FONT_HERSHEY_SIMPLEX,0.65,(255,255,255),2); tiles.append(c)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack([np.pad(x,((2,2),(2,2),(0,0))) for x in tiles[i:i+cols]]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,90])
