# ovl.py out.jpg RDIR x0 y0 x1 y1 zoom t1 t2 ... : per time: render | source | overlay(source red, render cyan)
import cv2,numpy as np,sys
out=sys.argv[1]; RD=sys.argv[2]; x0,y0,x1,y1=map(int,sys.argv[3:7]); z=float(sys.argv[7]); ts=[float(a) for a in sys.argv[8:]]
SRC='/Users/computer/rootline/apprentice-film/snapshots/s21-r3-src'
rows=[]
for t in ts:
    f=round(t*25)
    R=cv2.imread(f'{RD}/r-{t:.2f}.png')[y0:y1,x0:x1]; S=cv2.imread(f'{SRC}/f{f:04d}.png')[y0:y1,x0:x1]
    r=cv2.cvtColor(R,cv2.COLOR_BGR2GRAY); s=cv2.cvtColor(S,cv2.COLOR_BGR2GRAY)
    O=np.dstack([r,r,s])
    ims=[cv2.resize(im,None,fx=z,fy=z,interpolation=cv2.INTER_CUBIC) for im in (R,S,O)]
    for im,l in zip(ims,('R','S','ovl')):
        cv2.putText(im,f'{l} {t:.2f}',(4,16),0,0.5,(0,255,0),1)
        for gx in range((x0//10+1)*10,x1,10):
            X=int((gx-x0)*z); cv2.line(im,(X,im.shape[0]-(8 if gx%50==0 else 3)),(X,im.shape[0]),(0,255,255),1)
        for gy in range((y0//10+1)*10,y1,10):
            Y=int((gy-y0)*z); cv2.line(im,(0,Y),((8 if gy%50==0 else 3),Y),(0,255,255),1)
    rows.append(np.hstack([ims[0],np.full((ims[0].shape[0],3,3),255,np.uint8),ims[1],np.full((ims[0].shape[0],3,3),255,np.uint8),ims[2]]))
cv2.imwrite(out,np.vstack([np.vstack([r,np.full((3,r.shape[1],3),255,np.uint8)]) for r in rows]),[cv2.IMWRITE_JPEG_QUALITY,90])
