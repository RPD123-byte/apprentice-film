# ovl.py WITH NOOWL x0,y0,x1,y1 scale out [times]: source frame crop with our owl's silhouette contour (red)
import cv2, numpy as np, sys, glob, re
SRC=sys.argv[1].replace('raw','') if 'raw' in sys.argv[1] else sys.argv[1]
d,dn,box,sc,out=sys.argv[1],sys.argv[2],[int(v) for v in sys.argv[3].split(',')],float(sys.argv[4]),sys.argv[5]
fs=sorted(glob.glob(d+'/r-*.png'))
if len(sys.argv)>6: fs=[f for f in fs if re.search(r'r-([\d.]+)\.png',f).group(1) in sys.argv[6:]]
x0,y0,x1,y1=box; rows=[]
for f in fs:
    t=re.search(r'r-([\d.]+)\.png',f).group(1)
    a=cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2GRAY).astype(np.float32); n=cv2.cvtColor(cv2.imread(f'{dn}/r-{t}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
    m=(np.abs(a-n)>8).astype(np.uint8)
    m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
    src=cv2.imread(f.replace('/r-','/s-').replace(d+'/',SRC+'/'))
    cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    big=cv2.resize(src[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
    for c in cs:
        if len(c)<20: continue
        c=((c.astype(np.float32)-[x0,y0])*sc).astype(np.int32)
        cv2.polylines(big,[c],True,(0,0,255),1,cv2.LINE_AA)
    cv2.putText(big,t,(5,20),0,0.6,(0,255,255),1); rows.append(big)
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,90]); print(out)
