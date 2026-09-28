import sys,cv2,numpy as np; sys.path.insert(0,'.')
from lab import src
# facegrid.py out sc t:x0,y0,x1,y1 ...
out=sys.argv[1]; sc=float(sys.argv[2]); tiles=[]
for a in sys.argv[3:]:
    t,b=a.split(':'); t=float(t); x0,y0,x1,y1=[int(v) for v in b.split(',')]
    im=cv2.resize(src(t)[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
    for x in range((x0//5+1)*5,x1,5):
        X=int((x-x0)*sc); col=(0,90,255) if x%10 else (0,200,255); cv2.line(im,(X,0),(X,im.shape[0]),col,1)
        if x%10==0: cv2.putText(im,str(x),(X+2,11),0,0.35,(0,255,255),1)
    for y in range((y0//5+1)*5,y1,5):
        Y=int((y-y0)*sc); col=(0,90,255) if y%10 else (0,200,255); cv2.line(im,(0,Y),(im.shape[1],Y),col,1)
        if y%10==0: cv2.putText(im,str(y),(2,Y-2),0,0.35,(0,255,255),1)
    cv2.putText(im,f'{t:.2f}',(4,im.shape[0]-6),0,0.6,(255,0,255),2)
    tiles.append(im)
h=max(t.shape[0] for t in tiles); w=max(t.shape[1] for t in tiles)
tiles=[cv2.copyMakeBorder(t,0,h-t.shape[0],0,w-t.shape[1],cv2.BORDER_CONSTANT) for t in tiles]
while len(tiles)%2: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+2]) for i in range(0,len(tiles),2)]),[cv2.IMWRITE_JPEG_QUALITY,92])
