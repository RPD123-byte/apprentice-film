import cv2, numpy as np, sys
# usage: runs.py render ref x0 x1 y... [--v] : dark runs (<60) per row, or with --v per column
r,f=sys.argv[1],sys.argv[2]; x0,x1=int(sys.argv[3]),int(sys.argv[4]); ys=[int(v) for v in sys.argv[5:] if not v.startswith('-')]
col='--v' in sys.argv
for lab,fn in (('R',r),('S',f)):
    a=cv2.imread(fn,0)
    for y in ys:
        row=a[x0:x1,y] if col else a[y,x0:x1]
        runs=[];s=None
        for i,v in enumerate(row<70):
            if v and s is None: s=i
            if not v and s is not None: runs.append((s,i-1)); s=None
        if s is not None: runs.append((s,len(row)-1))
        print(lab, y, [(x0+a_,x0+b_) for a_,b_ in runs if b_-a_>=2])
