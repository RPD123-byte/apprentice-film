import cv2,numpy as np,sys
# runs.py img x0 x1 step y0 y1 thr : dark runs (value<thr) per column (5 px wide), as y-ranges
im=cv2.imread(sys.argv[1],0).astype(float); x0,x1,st,y0,y1,thr=map(int,sys.argv[2:8])
for x in range(x0,x1+1,st):
    c=im[y0:y1,x-2:x+3].mean(1); d=c<thr; out=[]; i=0
    while i<len(d):
        if d[i]:
            j=i
            while j<len(d) and d[j]: j+=1
            out.append(f'{y0+i}-{y0+j-1}({int(c[i:j].min())})'); i=j
        else: i+=1
    print(x,' '.join(out))
