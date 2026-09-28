import cv2, glob, sys, numpy as np
# strip.py dir t1,t2,... x0 y0 x1 y1 out scale cols
d=sys.argv[1]; ts=sys.argv[2].split(','); x0,y0,x1,y1=map(int,sys.argv[3:7]); out=sys.argv[7]; sc=float(sys.argv[8]); cols=int(sys.argv[9])
tiles=[]
for t in ts:
    f=glob.glob(f'{d}/frame-*-at-{t}s.png')[0]
    r=cv2.imread(f)[y0:y1,x0:x1]; s=cv2.imread(f.replace('frame-','ref-'))[y0:y1,x0:x1]
    im=np.vstack([r,np.full((4,r.shape[1],3),(0,200,255),np.uint8),s])
    im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
    cv2.putText(im,t,(4,18),0,0.55,(0,0,255),2)
    im=cv2.copyMakeBorder(im,0,0,0,4,cv2.BORDER_CONSTANT,value=(40,40,40))
    tiles.append(im)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])
