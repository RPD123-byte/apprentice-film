# runs.py img x0 x1 y0 y1 step [thr] : dark runs (value<thr after 3px blur) per row, as x ranges
import cv2, sys, numpy as np
im=cv2.GaussianBlur(cv2.imread(sys.argv[1],0).astype(float),(0,0),1.5)
x0,x1,y0,y1,st=map(int,sys.argv[2:7]); thr=float(sys.argv[7]) if len(sys.argv)>7 else 70
for y in range(y0,y1,st):
    row=im[y,x0:x1]<thr
    runs=[];i=0
    while i<len(row):
        if row[i]:
            j=i
            while j<len(row) and row[j]: j+=1
            if j-i>=3: runs.append(f"{x0+i}-{x0+j-1}")
            i=j
        else: i+=1
    print(y,' '.join(runs))
