# blend.py out.jpg x0 y0 x1 y1 pairdir-frame.png ...   -> for each frame: render | source | 50% blend (crop)
import cv2, numpy as np, sys
out=sys.argv[1]; x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; rows=[]
for f in sys.argv[6:]:
    a=cv2.imread(f)[y0:y1,x0:x1]; b=cv2.imread(f.replace('frame-','ref-'))[y0:y1,x0:x1]
    m=cv2.addWeighted(a,0.5,b,0.5,0)
    row=np.hstack([a,b,m]); cv2.putText(row,f.split('at-')[-1],(5,20),0,0.6,(0,255,255),2); rows.append(row)
im=np.vstack(rows)
if im.shape[1]>2400: im=cv2.resize(im,(2400,int(2400*im.shape[0]/im.shape[1])))
cv2.imwrite(out,im)
