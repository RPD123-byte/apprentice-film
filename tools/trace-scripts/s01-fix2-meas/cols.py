# cols.py T x0 x1 step y0 y1 [thr] : per plate column, y of dark-line centres (local minima below thr) in the SOURCE at T
import sys, cv2, numpy as np
exec(open('/Users/computer/rootline/apprentice-film/snapshots/s01-fix1-meas/camlib.py').read())
T=float(sys.argv[1]); x0,x1,st,y0,y1=[int(v) for v in sys.argv[2:7]]; thr=int(sys.argv[7]) if len(sys.argv)>7 else 110
Z=4
g=cv2.cvtColor(plate_frame(T,x0-5,y0,x1+5,y1,Z),cv2.COLOR_BGR2GRAY).astype(float)
g=cv2.GaussianBlur(g,(0,0),1.5)
for x in range(x0,x1+1,st):
    col=g[:,int((x-x0+5)*Z)]
    ys=[]
    for i in range(2,len(col)-2):
        if col[i]<thr and col[i]<=col[i-1] and col[i]<=col[i+1] and col[i]<=col[i-2] and col[i]<=col[i+2]:
            y=y0+i/Z
            if not ys or y-ys[-1][0]>2: ys.append((y,int(col[i])))
    print(x, ' '.join(f'{y:.0f}:{v}' for y,v in ys))
