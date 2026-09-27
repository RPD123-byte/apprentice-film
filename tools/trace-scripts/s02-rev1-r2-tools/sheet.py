import cv2, numpy as np, sys, os
os.chdir('/Users/computer/rootline/apprentice-film/snapshots')
# sheet.py f0 f1 out [w] [x0 y0 x1 y1]  : rows = frames, each row render | source
f0,f1,out=int(sys.argv[1]),int(sys.argv[2]),sys.argv[3]; w=int(sys.argv[4]) if len(sys.argv)>4 else 600
box=list(map(int,sys.argv[5:9])) if len(sys.argv)>8 else None
F=sorted(set(map(int,open('s02-rev1-r2-lab/frames.txt').read().split(','))))
rows=[]
for f in F:
    if f<f0 or f>f1: continue
    a=cv2.imread(f's02-rev1-r2-labpairs/r{f:04d}.png'); b=cv2.imread(f's02-rev1-r2-src/{f:04d}.png')
    if box: a=a[box[1]:box[3],box[0]:box[2]]; b=b[box[1]:box[3],box[0]:box[2]]
    h=int(a.shape[0]*w/a.shape[1])
    a=cv2.resize(a,(w,h),interpolation=cv2.INTER_AREA); b=cv2.resize(b,(w,h),interpolation=cv2.INTER_AREA)
    r=np.hstack([a,np.full((h,4,3),(0,0,255),np.uint8),b])
    cv2.putText(r,f'f{f} {f/25:.2f}',(6,22),cv2.FONT_HERSHEY_SIMPLEX,0.6,(0,0,255),2)
    rows.append(r); rows.append(np.full((3,r.shape[1],3),(0,0,255),np.uint8))
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,85])
