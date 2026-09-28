import cv2, glob, re, sys, numpy as np
# seq.py dir t0 t1 x0 y0 x1 y1 out [scale] [gain]
d=sys.argv[1]; t0,t1=float(sys.argv[2]),float(sys.argv[3]); x0,y0,x1,y1=map(int,sys.argv[4:8]); out=sys.argv[8]
sc=float(sys.argv[9]) if len(sys.argv)>9 else 1.0; gain=float(sys.argv[10]) if len(sys.argv)>10 else 1.0
rows=[]
for p in sorted(glob.glob(d+'/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s',p).group(1))):
  t=float(re.search(r'at-([\d.]+)s',p).group(1))
  if t<t0-1e-6 or t>t1+1e-6: continue
  r=p.replace('frame-','ref-')
  a=cv2.imread(p)[y0:y1,x0:x1].astype(np.float32)*gain; b=cv2.imread(r)[y0:y1,x0:x1].astype(np.float32)*gain
  row=np.clip(np.hstack([a,np.full((a.shape[0],4,3),120),b]),0,255).astype(np.uint8)
  row=cv2.resize(row,None,fx=sc,fy=sc)
  cv2.putText(row,f'{t:.2f}',(6,22),0,0.7,(0,0,255),2)
  rows.append(row)
rows=[np.vstack([r,np.full((3,r.shape[1],3),120,np.uint8)]) for r in rows]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,90]); print(len(rows))
