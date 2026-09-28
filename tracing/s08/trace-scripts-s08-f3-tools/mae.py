import cv2,numpy as np,sys,glob
rd=sys.argv[1]; S='snapshots/s08-f3-src/'
tot=[]
rows=[]
for k in range(764,815):
    try: a=cv2.imread(f'{rd}/r{k}.png').astype(np.float32)
    except: continue
    b=cv2.imread(f'{S}f{k}.png').astype(np.float32)
    ab=cv2.GaussianBlur(a,(0,0),3); bb=cv2.GaussianBlur(b,(0,0),3)
    d=np.abs(ab-bb).mean(-1)
    m=d.mean(); tot.append(m)
    # region breakdown: 4x3 tiles
    th,tw=946//3,2206//4
    tiles=[d[j*th:(j+1)*th,i*tw:(i+1)*tw].mean() for j in range(3) for i in range(4)]
    rows.append((k,m,a.mean()-b.mean(),tiles))
for k,m,dm,t in rows:
    print(k,f'{m:5.2f} dmean {dm:+5.1f} |',' '.join(f'{x:4.1f}' for x in t))
print('avg',np.mean(tot))
