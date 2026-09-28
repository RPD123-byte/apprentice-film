import cv2, numpy as np, glob, re, sys
from src import frame
d=sys.argv[1]; out=sys.argv[2]
C={126.2:(1650,390),126.6:(1470,420),127.0:(1370,560),127.2:(1370,540),128.0:(1370,560),128.8:(1370,590),129.0:(1360,600),129.2:(1320,610),126.4:(1560,420),126.8:(1400,500),126.92:(1370,560),128.4:(1380,560),128.6:(1390,570)}
tiles=[]
for f in sorted(glob.glob(d+'/frame-*.png')):
    t=float(re.search(r'at-([\d.]+?)s\.png',f).group(1))
    if t not in C: continue
    R=cv2.imread(f); S=frame(t); cx,cy=C[t]; x0,y0=cx-220,cy-230
    a=R[y0:y0+440,x0:x0+440]; b=S[y0:y0+440,x0:x0+440]
    tl=np.hstack([a,b]); cv2.putText(tl,f"{t}",(5,25),0,0.8,(0,255,255),2); tiles.append(tl)
while len(tiles)%2: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+2]) for i in range(0,len(tiles),2)]),[cv2.IMWRITE_JPEG_QUALITY,85])
