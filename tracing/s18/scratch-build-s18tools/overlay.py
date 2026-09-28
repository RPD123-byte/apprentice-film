import cv2,sys,glob,re,numpy as np
# usage: overlay.py dir out.jpg x0 y0 x1 y1 [scale]  -> per time: render | source | overlay(R=render,G=source)
d=sys.argv[1]; out=sys.argv[2]; x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]
sc=float(sys.argv[7]) if len(sys.argv)>7 else 1.0
fr=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
rows=[]
for f in fr:
    t=re.search(r'at-([\d.]+)s',f).group(1)
    a=cv2.imread(f,0)[y0:y1,x0:x1]; b=cv2.imread(f.replace('frame-','ref-'),0)[y0:y1,x0:x1]
    ov=np.dstack([b//2,b,a])
    ims=[cv2.cvtColor(a,cv2.COLOR_GRAY2BGR),cv2.cvtColor(b,cv2.COLOR_GRAY2BGR),ov]
    ims=[cv2.resize(i,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC) for i in ims]
    cv2.putText(ims[0],'render '+t,(6,20),0,0.6,(0,255,255),2); cv2.putText(ims[1],'source',(6,20),0,0.6,(0,255,255),2); cv2.putText(ims[2],'R=render G=src',(6,20),0,0.6,(255,255,255),2)
    rows.append(np.hstack([ims[0],np.full((ims[0].shape[0],4,3),128,np.uint8),ims[1],np.full((ims[0].shape[0],4,3),128,np.uint8),ims[2]]))
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,90]); print(out)
