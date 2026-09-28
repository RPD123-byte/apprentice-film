# zgrid.py RDIR OUT t x0 y0 x1 y1 [scale=8]: render | source crop at scale with a 5 px grid, labels every 10 px
import cv2, numpy as np, sys
R,out,t=sys.argv[1],sys.argv[2],float(sys.argv[3]); x0,y0,x1,y1=map(int,sys.argv[4:8]); sc=int(sys.argv[8]) if len(sys.argv)>8 else 8
SRC='/Users/computer/rootline/apprentice-film/snapshots/s21-r3-src'
def G(img):
    c=cv2.resize(img[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
    for x in range(x0 - x0%5, x1, 5):
        if x<x0: continue
        X=(x-x0)*sc; col=(0,0,255) if x%10==0 else (0,110,160); cv2.line(c,(X,0),(X,c.shape[0]),col,1)
        if x%10==0: cv2.putText(c,str(x),(X+2,12),0,0.4,(0,255,255),1)
    for y in range(y0 - y0%5, y1, 5):
        if y<y0: continue
        Y=(y-y0)*sc; col=(0,0,255) if y%10==0 else (0,110,160); cv2.line(c,(0,Y),(c.shape[1],Y),col,1)
        if y%10==0: cv2.putText(c,str(y),(2,Y-2),0,0.4,(0,255,255),1)
    return c
a=cv2.imread(f'{R}/r-{t:.2f}.png') if R!='-' else None; b=cv2.imread(f'{SRC}/f{round(t*25):04d}.png')
ims=[G(b)] if a is None else [G(a),np.full((G(b).shape[0],6,3),(0,160,255),np.uint8),G(b)]
cv2.imwrite(out,np.hstack(ims),[cv2.IMWRITE_JPEG_QUALITY,92])
