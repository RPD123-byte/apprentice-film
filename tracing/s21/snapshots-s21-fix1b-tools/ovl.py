# ovl.py RDIR OUT t1,t2,.. x0 y0 x1 y1 [scale] [cols]: colour overlay, source in RED, render in CYAN (white = both bright)
import cv2, numpy as np, sys
R,out,ts=sys.argv[1],sys.argv[2],sys.argv[3]; x0,y0,x1,y1=map(int,sys.argv[4:8])
sc=float(sys.argv[8]) if len(sys.argv)>8 else 6; cols=int(sys.argv[9]) if len(sys.argv)>9 else 2
SRC='/Users/computer/rootline/apprentice-film/snapshots/s21-r3-src'
g=lambda p: cv2.cvtColor(cv2.imread(p),cv2.COLOR_BGR2GRAY)
tiles=[]
for t in ts.split(','):
    t=float(t); r=g(f'{R}/r-{t:.2f}.png')[y0:y1,x0:x1]; s=g(f'{SRC}/f{round(t*25):04d}.png')[y0:y1,x0:x1]
    im=np.dstack([r,r,s]); im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
    for x in range(x0-x0%10+10,x1,10): X=int((x-x0)*sc); cv2.line(im,(X,0),(X,8),(0,255,0),1); cv2.putText(im,str(x),(X+1,18),0,0.35,(0,255,0),1)
    for y in range(y0-y0%10+10,y1,10): Y=int((y-y0)*sc); cv2.line(im,(0,Y),(8,Y),(0,255,0),1); cv2.putText(im,str(y),(10,Y+4),0,0.35,(0,255,0),1)
    cv2.putText(im,f'{t:.2f}',(6,im.shape[0]-8),cv2.FONT_HERSHEY_SIMPLEX,0.6,(0,255,255),2); tiles.append(im)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack([np.pad(x,((2,2),(2,2),(0,0))) for x in tiles[i:i+cols]]) for i in range(0,len(tiles),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,92])
