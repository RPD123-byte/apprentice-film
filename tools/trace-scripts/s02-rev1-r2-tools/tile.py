import cv2, numpy as np, sys, os
os.chdir('/Users/computer/rootline/apprentice-film/snapshots')
# tile.py f0 f1 out w cols x0 y0 x1 y1 [frames comma list]
f0,f1,out,w,cols=int(sys.argv[1]),int(sys.argv[2]),sys.argv[3],int(sys.argv[4]),int(sys.argv[5]); box=list(map(int,sys.argv[6:10]))
F=sorted(set(map(int,open('s02-rev1-r2-lab/frames.txt').read().split(','))))
if len(sys.argv)>10: F=list(map(int,sys.argv[10].split(',')))
cells=[]
for f in F:
    if f<f0 or f>f1: continue
    a=cv2.imread(f's02-rev1-r2-labpairs/r{f:04d}.png'); b=cv2.imread(f's02-rev1-r2-src/{f:04d}.png')
    x0,y0,x1,y1=box
    a=a[max(0,y0):y1,max(0,x0):x1]; b=b[max(0,y0):y1,max(0,x0):x1]
    h=int(a.shape[0]*w/a.shape[1]); a=cv2.resize(a,(w,h),interpolation=cv2.INTER_AREA); b=cv2.resize(b,(w,h),interpolation=cv2.INTER_AREA)
    c=np.hstack([a,np.full((h,3,3),(0,0,255),np.uint8),b]); cv2.putText(c,f'{f} {f/25:.2f}',(4,18),cv2.FONT_HERSHEY_SIMPLEX,0.55,(0,0,255),2)
    c=np.pad(c,((0,4),(0,6),(0,0))); cells.append(c)
while len(cells)%cols: cells.append(np.zeros_like(cells[0]))
rows=[np.hstack(cells[i:i+cols]) for i in range(0,len(cells),cols)]
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])
print(np.vstack(rows).shape)
