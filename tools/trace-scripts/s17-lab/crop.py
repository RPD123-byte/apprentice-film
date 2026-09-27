# crop.py DIR T1,T2,... x0,y0,x1,y1 SCALE OUT : render|source crops stacked (rows = times), scaled
import cv2, numpy as np, sys
d=sys.argv[1]; ts=[float(v) for v in sys.argv[2].split(',')]; x0,y0,x1,y1=map(int,sys.argv[3].split(',')); k=float(sys.argv[4]); out=sys.argv[5]
rows=[]
for t in ts:
    r=cv2.imread(f'{d}/r-{t:.2f}.png'); s=cv2.imread(f'{d}/s-{t:.2f}.png')
    a=r[y0:y1,x0:x1]; b=s[y0:y1,x0:x1]
    a=cv2.resize(a,None,fx=k,fy=k,interpolation=cv2.INTER_CUBIC); b=cv2.resize(b,None,fx=k,fy=k,interpolation=cv2.INTER_CUBIC)
    sep=np.full((a.shape[0],4,3),(0,0,255),np.uint8)
    row=np.hstack([a,sep,b]); cv2.putText(row,f'{t:.2f}',(6,22),cv2.FONT_HERSHEY_SIMPLEX,0.7,(0,255,255),2); rows.append(row)
    rows.append(np.full((4,row.shape[1],3),(0,0,255),np.uint8))
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,90])
