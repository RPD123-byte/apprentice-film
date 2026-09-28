# sc.py OUT DIR t1,t2 x0 y0 x1 y1 zoom : render(top) and source(bottom) crops per time, side by side columns; grid 5 px
import cv2,numpy as np,sys
out,R,ts=sys.argv[1],sys.argv[2],sys.argv[3].split(','); x0,y0,x1,y1=map(int,sys.argv[4:8]); z=float(sys.argv[8])
SRC='/Users/computer/rootline/apprentice-film/snapshots/s21-r3-src'
def grid(im):
    for x in range(x0-x0%5+5,x1,5):
        X=int((x-x0)*z); c=(0,255,255) if x%10==0 else (0,140,0); cv2.line(im,(X,0),(X,10 if x%10==0 else 4),c,1)
        if x%10==0: cv2.putText(im,str(x),(X+1,22),0,0.32,(0,255,0),1)
    for y in range(y0-y0%5+5,y1,5):
        Y=int((y-y0)*z); c=(0,255,255) if y%10==0 else (0,140,0); cv2.line(im,(0,Y),(10 if y%10==0 else 4,Y),c,1)
        if y%10==0: cv2.putText(im,str(y),(12,Y+4),0,0.32,(0,255,0),1)
    return im
cols=[]
for t in ts:
    t=float(t); a=cv2.imread(f'{R}/r-{t:.2f}.png')[y0:y1,x0:x1]; b=cv2.imread(f'{SRC}/f{round(t*25):04d}.png')[y0:y1,x0:x1]
    a=grid(cv2.resize(a,None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC)); b=grid(cv2.resize(b,None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC))
    cv2.putText(a,f'R {t:.2f}',(4,a.shape[0]-6),0,0.5,(0,255,255),1); cv2.putText(b,f'S {t:.2f}',(4,b.shape[0]-6),0,0.5,(0,255,255),1)
    cols.append(np.vstack([a,np.full((3,a.shape[1],3),255,np.uint8),b]))
cv2.imwrite(out,np.hstack([np.hstack([c,np.full((c.shape[0],3,3),255,np.uint8)]) for c in cols]),[cv2.IMWRITE_JPEG_QUALITY,92])
