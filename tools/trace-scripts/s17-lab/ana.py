# ana.py DIR x0,y0,x1,y1 scale out [times]: anaglyph (render = red, source = cyan) of saved lab frames
import cv2, numpy as np, sys, glob, re
d,box,sc,out=sys.argv[1],[int(v) for v in sys.argv[2].split(',')],float(sys.argv[3]),sys.argv[4]
fs=sorted(glob.glob(d+'/r-*.png'))
if len(sys.argv)>5: fs=[f for f in fs if re.search(r'r-([\d.]+)\.png',f).group(1) in sys.argv[5:]]
x0,y0,x1,y1=box; rows=[]
for f in fs:
    a=cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2GRAY)[y0:y1,x0:x1]; b=cv2.cvtColor(cv2.imread(f.replace('/r-','/s-')),cv2.COLOR_BGR2GRAY)[y0:y1,x0:x1]
    im=np.dstack([b,b,a])
    im=cv2.resize(im,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
    cv2.putText(im,re.search(r'r-([\d.]+)\.png',f).group(1),(5,20),0,0.6,(0,255,0),1); rows.append(im)
cv2.imwrite(out,np.vstack(rows) if len(rows)>1 else rows[0],[cv2.IMWRITE_JPEG_QUALITY,92]); print(out)
