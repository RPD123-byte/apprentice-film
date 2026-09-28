import cv2,sys,glob,re,numpy as np
# usage: cmpcrop.py dir out.jpg x0 y0 x1 y1 [scale] [vertical]
d=sys.argv[1]; out=sys.argv[2]; x0,y0,x1,y1=[int(v) for v in sys.argv[3:7]]
sc=float(sys.argv[7]) if len(sys.argv)>7 else 1.0
vert=len(sys.argv)>8 and sys.argv[8]=='v'
fr=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
rows=[]
for f in fr:
    t=re.search(r'at-([\d.]+)s',f).group(1)
    a=cv2.imread(f); b=cv2.imread(f.replace('frame-','ref-'))
    a=cv2.resize(a[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
    b=cv2.resize(b[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA if sc<1 else cv2.INTER_CUBIC)
    for im,lab in ((a,'render '+t),(b,'source')):
        cv2.putText(im,lab,(6,20),0,0.6,(0,255,255),2)
    rows.append(np.vstack([a,b]) if vert else np.hstack([a,np.full((a.shape[0],4,3),128,np.uint8),b]))
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,90]); print(out)
