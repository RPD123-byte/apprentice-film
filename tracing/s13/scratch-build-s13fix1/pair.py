# pair.py dir idx x0 y0 x1 y1 out [scale] [grid]
import cv2, sys, glob, numpy as np
d, idx = sys.argv[1], sys.argv[2]
x0,y0,x1,y1 = map(int, sys.argv[3:7]); out = sys.argv[7]
sc = float(sys.argv[8]) if len(sys.argv)>8 else 1.0
grid = int(sys.argv[9]) if len(sys.argv)>9 else 0
f = glob.glob(f"{d}/frame-{idx}-*.png")[0]; r = glob.glob(f"{d}/ref-{idx}-*.png")[0]
A = cv2.imread(f); B = cv2.imread(r)
def prep(im):
    c = im[y0:y1, x0:x1].copy()
    c = cv2.resize(c,None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC) if sc!=1 else c
    if grid:
        for gx in range((x0//grid+1)*grid, x1, grid):
            X=int((gx-x0)*sc); cv2.line(c,(X,0),(X,8),(0,0,255),1); cv2.line(c,(X,c.shape[0]-8),(X,c.shape[0]),(0,0,255),1)
            if gx%(grid*2)==0: cv2.putText(c,str(gx),(X+1,18),cv2.FONT_HERSHEY_SIMPLEX,0.33,(0,0,255),1)
        for gy in range((y0//grid+1)*grid, y1, grid):
            Y=int((gy-y0)*sc); cv2.line(c,(0,Y),(8,Y),(0,0,255),1); cv2.line(c,(c.shape[1]-8,Y),(c.shape[1],Y),(0,0,255),1)
            if gy%(grid*2)==0: cv2.putText(c,str(gy),(10,Y+4),cv2.FONT_HERSHEY_SIMPLEX,0.33,(0,0,255),1)
    return c
a,b = prep(A), prep(B)
sep = np.full((a.shape[0],6,3),(0,160,0),np.uint8)
cv2.imwrite(out, np.hstack([a,sep,b]))
