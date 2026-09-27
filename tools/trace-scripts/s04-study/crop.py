# crop.py DIR x0 y0 x1 y1 out.jpg [mode]  -> for each frame/ref pair in DIR: render | source | 50% overlay, stacked
import cv2, glob, re, sys, numpy as np
d=sys.argv[1]; x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; out=sys.argv[6]; tw=int(sys.argv[7]) if len(sys.argv)>7 else 600
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
rows=[]
for f in fs:
    t=re.search(r'at-([\d.]+)s',f).group(1); r=f.replace('frame-','ref-')
    a=cv2.imread(f)[y0:y1,x0:x1]; b=cv2.imread(r)[y0:y1,x0:x1]; m=cv2.addWeighted(a,0.5,b,0.5,0)
    k=tw/(x1-x0); tiles=[cv2.resize(z,(tw,int((y1-y0)*k))) for z in (a,b,m)]
    cv2.putText(tiles[0],t,(5,20),0,0.6,(0,255,0),2); rows.append(np.hstack(tiles))
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,85])
