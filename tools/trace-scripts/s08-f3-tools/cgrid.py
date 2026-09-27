import numpy as np, cv2, sys
# cgrid.py render.png x0 y0 x1 y1 cell  -> per-cell mean RGB of source vs render on pixels that are 'flat' in both
p=sys.argv[1]; x0,y0,x1,y1,c=map(int,sys.argv[2:7])
S=cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s08-f3-src/f764.png').astype(np.float32); Rn=cv2.imread(p).astype(np.float32)
def flat(im):
    L=cv2.GaussianBlur(im.mean(-1),(0,0),1); g=np.hypot(cv2.Sobel(L,cv2.CV_32F,1,0),cv2.Sobel(L,cv2.CV_32F,0,1))
    return cv2.erode((g<25).astype(np.uint8),np.ones((5,5),np.uint8))>0
m=flat(S)&flat(Rn)&(S.mean(-1)>45)&(Rn.mean(-1)>45)
for y in range(y0,y1,c):
    row=[]
    for x in range(x0,x1,c):
        mm=m[y:y+c,x:x+c]
        if mm.sum()>c*c*0.15:
            s=S[y:y+c,x:x+c][mm].mean(0)[::-1]; r=Rn[y:y+c,x:x+c][mm].mean(0)[::-1]
            row.append('%+3d%+3d%+3d'%tuple((s-r).round()))
        else: row.append('    .    ')
    print('%4d '%y+' '.join(row))
