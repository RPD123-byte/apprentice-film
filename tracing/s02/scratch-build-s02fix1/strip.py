# strip.py out.jpg k0 k1 x0 y0 x1 y1 [cols] [rdir]  : source (and render if rdir given) crops for frames k0..k1
import sys, cv2, numpy as np, os
out=sys.argv[1]; k0,k1=int(sys.argv[2]),int(sys.argv[3]); x0,y0,x1,y1=map(int,sys.argv[4:8])
cols=int(sys.argv[8]) if len(sys.argv)>8 else 6; rdir=sys.argv[9] if len(sys.argv)>9 else None
tiles=[]
for k in range(k0,k1+1):
    S=cv2.imread(f'src/f{k:03d}.png')[y0:y1,x0:x1].copy()
    cv2.putText(S,f'{k} {k/25:.2f}',(4,20),0,0.6,(0,255,255),2)
    if rdir:
        p=f'{rdir}/r{k:03d}.png'
        R=cv2.imread(p)[y0:y1,x0:x1].copy() if os.path.exists(p) else np.zeros_like(S)
        S=np.vstack([R,np.full((4,S.shape[1],3),(0,0,255),np.uint8),S])
    tiles.append(S)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
im=np.vstack(rows)
if im.shape[1]>2400: im=cv2.resize(im,(2400,int(im.shape[0]*2400/im.shape[1])),interpolation=cv2.INTER_AREA)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,88])
