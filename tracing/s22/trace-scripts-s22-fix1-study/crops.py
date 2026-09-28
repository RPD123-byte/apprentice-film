# crops.py DIR "t:x0,y0,x1,y1;..." out.jpg [scale]  — render|source crops stacked
import cv2, numpy as np, glob, sys, re
d=sys.argv[1]; specs=sys.argv[2].split(';'); out=sys.argv[3]; k=float(sys.argv[4]) if len(sys.argv)>4 else 1
rows=[]
for sp in specs:
    t,box=sp.split(':'); x0,y0,x1,y1=[int(v) for v in box.split(',')]
    f=[p for p in glob.glob(d+'/frame-*.png') if re.search(r'-at-'+re.escape(t)+r's\.png$',p)]
    r=[p for p in glob.glob(d+'/ref-*.png') if re.search(r'-at-'+re.escape(t)+r's\.png$',p)]
    a=cv2.imread(f[0])[y0:y1,x0:x1]; b=cv2.imread(r[0])[y0:y1,x0:x1]
    sep=np.zeros((a.shape[0],4,3),np.uint8); sep[:,:,2]=255; row=np.hstack([a,sep,b])
    row=cv2.resize(row,None,fx=k,fy=k,interpolation=cv2.INTER_AREA if k<1 else cv2.INTER_CUBIC)
    cv2.putText(row,t,(4,16),0,0.5,(0,0,255),1)
    rows.append(row)
w=max(r.shape[1] for r in rows)
rows=[np.pad(r,((0,4),(0,w-r.shape[1]),(0,0))) for r in rows]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,90])
