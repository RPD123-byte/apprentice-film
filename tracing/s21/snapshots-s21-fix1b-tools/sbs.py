# sbs.py RDIR OUT t1,t2,.. x0 y0 x1 y1 [scale] : render | source crops with a 10 px grid, one row per time
import cv2, numpy as np, sys
R,out,ts=sys.argv[1],sys.argv[2],sys.argv[3]; x0,y0,x1,y1=map(int,sys.argv[4:8])
sc=float(sys.argv[8]) if len(sys.argv)>8 else 4
SRC='/Users/computer/rootline/apprentice-film/snapshots/s21-r3-src'
rows=[]
def grid(im):
    for x in range(x0-x0%10+10,x1,10):
        X=int((x-x0)*sc); c=(0,200,0) if x%50 else (0,255,255)
        cv2.line(im,(X,0),(X,6 if x%50 else 12),c,1)
        if x%20==0: cv2.putText(im,str(x),(X+1,20),0,0.33,c,1)
    for y in range(y0-y0%10+10,y1,10):
        Y=int((y-y0)*sc); c=(0,200,0) if y%50 else (0,255,255)
        cv2.line(im,(0,Y),(6 if y%50 else 12,Y),c,1)
        if y%20==0: cv2.putText(im,str(y),(14,Y+4),0,0.33,c,1)
    return im
for t in ts.split(','):
    t=float(t); r=cv2.imread(f'{R}/r-{t:.2f}.png')[y0:y1,x0:x1]; s=cv2.imread(f'{SRC}/f{round(t*25):04d}.png')[y0:y1,x0:x1]
    a=grid(cv2.resize(r,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)); b=grid(cv2.resize(s,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC))
    cv2.putText(a,f'R {t:.2f}',(6,a.shape[0]-8),0,0.6,(0,255,255),2); cv2.putText(b,f'S {t:.2f}',(6,b.shape[0]-8),0,0.6,(0,255,255),2)
    rows.append(np.hstack([a,np.full((a.shape[0],4,3),(0,120,255),np.uint8),b]))
cv2.imwrite(out,np.vstack([np.pad(r,((0,4),(0,0),(0,0))) for r in rows]),[cv2.IMWRITE_JPEG_QUALITY,92])
