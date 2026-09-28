import cv2, re, glob, numpy as np, math, sys
d=sys.argv[1]; out=sys.argv[2]
BK={}
for l in open('/Users/computer/rootline/apprentice-film/src/shots/s14/back.js'):
    for m in re.finditer(r'\[(\d\d\.\d\d), ([\d.]+), (\d+), ([\d.]+),', l): BK[round(float(m.group(1)),2)]=(float(m.group(2)),int(m.group(3)),float(m.group(4)))
tiles=[]
for f in sorted(glob.glob(d+'/frame-*.png'), key=lambda p: float(p.split('-at-')[1][:-5])):
    t=float(f.split('-at-')[1][:-5])
    if t<38.5: continue
    k=round(math.ceil(t*25-1e-6)/25,2); k=max(x for x in BK if x<=k+1e-6); hx,top,s=BK[k]
    x0=int(hx-230*s); y0=int(top-50*s); x1=int(hx+230*s); y1=int(top+330*s)
    a=cv2.imread(f)[max(0,y0):y1, max(0,x0):x1]; b=cv2.imread(f.replace('frame-','ref-'))[max(0,y0):y1, max(0,x0):x1]
    h=260; a=cv2.resize(a,(int(a.shape[1]*h/a.shape[0]),h)); b=cv2.resize(b,(a.shape[1],h))
    t2=np.hstack([a,np.full((h,4,3),(0,0,255),np.uint8),b]); cv2.putText(t2,str(t),(4,16),0,0.5,(0,255,255),1)
    tiles.append(t2)
W=max(t.shape[1] for t in tiles); tiles=[np.pad(t,((0,0),(0,W-t.shape[1]),(0,0))) for t in tiles]
rows=[np.hstack(tiles[i:i+2]) if i+1<len(tiles) else np.hstack([tiles[i],np.zeros_like(tiles[i])]) for i in range(0,len(tiles),2)]
cv2.imwrite(out, np.vstack(rows))
