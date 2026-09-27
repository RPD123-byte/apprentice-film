import numpy as np, cv2, sys
s=cv2.GaussianBlur(cv2.imread('snapshots/s08-f3-src/f764.png').astype(np.float32).mean(-1),(0,0),1.5)
r=cv2.GaussianBlur(cv2.imread(sys.argv[1]).astype(np.float32).mean(-1),(0,0),1.5)
def row(vals): return ' '.join(vals)
print('right')
for (y0,y1) in [(190,260),(260,330),(720,780),(780,830)]:
    out=[]
    for dx in [2,4,6,9,12,16,20,25,30,40,50,60,80]:
        x=int(1913.3+dx); m=(s[y0:y1,x]>60)&(r[y0:y1,x]>60)
        out.append('%.2f'%(np.median(s[y0:y1,x][m]/r[y0:y1,x][m])) if m.sum()>5 else ' -- ')
    print(y0,y1,row(out))
print('below')
for (x0,x1) in [(1750,1800),(1890,1912),(1915,1960)]:
    out=[]
    for dy in [2,4,6,9,12,16,20,25,30,40,50,60]:
        y=int(830.5+dy); m=(s[y,x0:x1]>50)&(r[y,x0:x1]>50)
        out.append('%.2f'%(np.median(s[y,x0:x1][m]/r[y,x0:x1][m])) if m.sum()>5 else ' -- ')
    print(x0,x1,row(out))
print('left')
for (y0,y1) in [(190,300),(300,460),(560,700)]:
    out=[]
    for dx in [7,9,12,16,20,25,30,40,50,60]:
        x=int(1451.3-dx); m=(s[y0:y1,x]>60)&(r[y0:y1,x]>60)
        out.append('%.2f'%(np.median(s[y0:y1,x][m]/r[y0:y1,x][m])) if m.sum()>5 else ' -- ')
    print(y0,y1,row(out))
print('above')
for (x0,x1) in [(1460,1560),(1700,1800),(1800,1910)]:
    out=[]
    for dy in [4,6,9,12,16,20,25,30,40,50]:
        y=int(183.7-dy); m=(s[y,x0:x1]>60)&(r[y,x0:x1]>60)
        out.append('%.2f'%(np.median(s[y,x0:x1][m]/r[y,x0:x1][m])) if m.sum()>5 else ' -- ')
    print(x0,x1,row(out))
