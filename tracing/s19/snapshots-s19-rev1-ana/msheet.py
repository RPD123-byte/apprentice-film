import cv2,sys,glob,re,numpy as np
# msheet.py dir t0 t1 x0 y0 x1 y1 scale out
d=sys.argv[1]; t0,t1=float(sys.argv[2]),float(sys.argv[3]); x0,y0,x1,y1=map(int,sys.argv[4:8]); sc=float(sys.argv[8]); out=sys.argv[9]
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
rows=[]
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    if t<t0-1e-6 or t>t1+1e-6: continue
    a=cv2.imread(f)[y0:y1,x0:x1]; b=cv2.imread(f.replace('/frame-','/ref-'))[y0:y1,x0:x1]
    a=cv2.resize(a,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA); b=cv2.resize(b,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
    cv2.putText(a,'%.2f R'%t,(4,16),0,0.5,(0,255,255),1); cv2.putText(b,'%.2f S'%t,(4,16),0,0.5,(0,255,255),1)
    rows.append(np.hstack([a,np.full((a.shape[0],4,3),(0,0,255),np.uint8),b]))
cv2.imwrite(out,np.vstack([np.vstack([r,np.zeros((3,r.shape[1],3),np.uint8)]) for r in rows]),[cv2.IMWRITE_JPEG_QUALITY,88])
print(len(rows))
