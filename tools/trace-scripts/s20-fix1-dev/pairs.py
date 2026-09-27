# pairs.py PREFIX "x0 y0 x1 y1" scale out.jpg t1 t2 ... : render|source crops (+ edge overlay if --ov), one row per time
import cv2,numpy as np,sys
P=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2].split()); sc=float(sys.argv[3]); out=sys.argv[4]; ts=sys.argv[5:]
ov='--ov' in ts; ts=[t for t in ts if t!='--ov']
rows=[]
for t in ts:
    r=cv2.imread(f'{P}-{t}.png')[y0:y1,x0:x1]; s=cv2.imread('snapshots/s20-rev1-src/n%d.png'%round(float(t)*25))[y0:y1,x0:x1]
    tiles=[r,s]
    if ov:
        e=cv2.Canny(cv2.GaussianBlur(cv2.cvtColor(r,cv2.COLOR_BGR2GRAY),(0,0),1.5),50,120); o=(s*0.75).astype(np.uint8); o[e>0]=(0,0,255); tiles.append(o)
    im=np.hstack(tiles)
    for x in range((100-x0%100)%100,im.shape[1],100):
        pass
    im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
    cv2.putText(im,t,(6,22),0,0.7,(0,255,255),2); rows.append(im)
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,85])
