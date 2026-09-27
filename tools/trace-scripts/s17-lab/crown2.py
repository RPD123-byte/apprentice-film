# crown2.py DIR: for each key time, the band's top/bottom and the head top at the crown (source and ours)
import cv2, numpy as np, sys
V='/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'
d=sys.argv[1]
def runs(col,y0):
    # bright runs (>90) from the top: [(start,end,peak)]
    out=[]; i=0
    while i<len(col):
        if col[i]>90:
            j=i
            while j<len(col) and col[j]>90: j+=1
            out.append((y0+i,y0+j-1,int(col[i:j].max()))); i=j
        else: i+=1
    return out
for t,x,y0,y1 in [(49.0,715,395,445),(50.4,714,390,440),(50.88,712,385,435),(51.36,712,372,420),(51.84,712,362,410),(52.44,712,352,400)]:
    for nm in ('src','ours'):
        f=cv2.imread(f'{d}/{"s" if nm=="src" else "r"}-{t:.2f}.png',0).astype(float)
        col=f[y0:y1,x-1:x+2].mean(1)
        r=runs(col,y0)
        print(t,nm,r[:3])
