# score.py outdir frames  -> per-frame |render - source| on blurred frames (graded), and a pair sheet
import cv2, numpy as np, sys, os
out=sys.argv[1]; frames=[int(v) for v in sys.argv[2].split(',')]
SRC='/Users/computer/rootline/apprentice-film/snapshots/s16-p2-src'
rows=[]
for f in frames:
    r=cv2.imread(f'{out}/r{f}.png'); s=cv2.imread(f'{SRC}/f{f}.png')
    if r is None: print(f,'missing'); continue
    r=r.astype(np.float32); s=s.astype(np.float32)
    e=[np.abs(cv2.GaussianBlur(r,(0,0),g)-cv2.GaussianBlur(s,(0,0),g)).mean() for g in (1,2,4,8)]
    rows.append((f,e))
    print(f, ' '.join('s%d %.2f'%(g,v) for g,v in zip((1,2,4,8),e)))
if rows:
    m=np.mean([e for _,e in rows],0); print('MEAN', ' '.join('s%d %.2f'%(g,v) for g,v in zip((1,2,4,8),m)))
if len(sys.argv)>3:
    tiles=[]
    for f in frames:
        r=cv2.imread(f'{out}/r{f}.png'); s=cv2.imread(f'{SRC}/f{f}.png')
        t=np.hstack([cv2.resize(r,(1103,473)),cv2.resize(s,(1103,473))]); cv2.putText(t,str(f),(8,24),0,0.8,(0,255,255),2); tiles.append(t)
    cv2.imwrite(f'{out}/sheet.jpg',np.vstack(tiles),[cv2.IMWRITE_JPEG_QUALITY,85])
