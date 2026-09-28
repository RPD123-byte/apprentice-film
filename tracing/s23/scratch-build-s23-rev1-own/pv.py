# pv.py OUT k[,k...] [x0 y0 x1 y1] [--w W] [--h]  stacked render|source (exact frames) crops
import sys, cv2, numpy as np
R='/Users/computer/rootline/apprentice-film/snapshots/s23-rev1-exact/r%05d.png'; S='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s23-rev1-own/src/s%05d.jpg'
a=sys.argv[1:]; W=1400; horiz=False
if '--w' in a: i=a.index('--w'); W=int(a[i+1]); del a[i:i+2]
if '--h' in a: a.remove('--h'); horiz=True
out=a[0]; ks=[int(x) for x in a[1].split(',')]; box=[int(x) for x in a[2:6]] if len(a)>=6 else [0,0,2206,946]
x0,y0,x1,y1=box; rows=[]
for k in ks:
    r=cv2.imread(R%k); s=cv2.imread(S%k)
    if r is None: print('missing',k); continue
    rc=r[y0:y1,x0:x1]; sc=s[y0:y1,x0:x1]
    w=W//2 if horiz else W; h=int(w*(y1-y0)/(x1-x0))
    rc=cv2.resize(rc,(w,h),interpolation=cv2.INTER_AREA); sc=cv2.resize(sc,(w,h),interpolation=cv2.INTER_AREA)
    cv2.putText(rc,'R %d %.2f'%(k,k/25),(8,26),0,0.8,(0,0,255),2); cv2.putText(sc,'S %d'%k,(8,26),0,0.8,(0,0,255),2)
    sep=np.full((h,4,3),255,np.uint8) if horiz else np.full((4,w,3),255,np.uint8)
    rows.append(np.hstack([rc,sep,sc]) if horiz else np.vstack([rc,sep,sc]))
    rows.append(np.full((6,rows[-1].shape[1],3),(0,200,255),np.uint8))
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,88])
