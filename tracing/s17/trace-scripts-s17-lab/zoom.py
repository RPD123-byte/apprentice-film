# zoom.py OUTDIR x0,y0,x1,y1 scale out.jpg [times...]: stacks (render | source) crops of saved lab frames
import cv2, numpy as np, sys, glob, re
d,box,sc,out=sys.argv[1],[int(v) for v in sys.argv[2].split(',')],float(sys.argv[3]),sys.argv[4]
fs=sorted(glob.glob(d+'/r-*.png'),key=lambda p:float(re.search(r'r-([\d.]+)\.png',p).group(1)))
if len(sys.argv)>5: fs=[f for f in fs if re.search(r'r-([\d.]+)\.png',f).group(1) in sys.argv[5:]]
x0,y0,x1,y1=box; rows=[]
for f in fs:
    a=cv2.imread(f)[y0:y1,x0:x1]; b=cv2.imread(f.replace('/r-','/s-'))[y0:y1,x0:x1]
    row=np.hstack([a,np.full((a.shape[0],3,3),90,np.uint8),b])
    row=cv2.resize(row,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC if sc>1 else cv2.INTER_AREA)
    cv2.putText(row,re.search(r'r-([\d.]+)\.png',f).group(1),(5,20),0,0.6,(0,255,255),1); rows.append(row)
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,90]); print(out,len(rows))
