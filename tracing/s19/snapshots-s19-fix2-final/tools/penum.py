# penumbra rows: per frame k, rows y where blurred(frame)/blurred(owl-free 57.36) < THR; largest run near the owl
import cv2, numpy as np, json
from lab import src
THR=0.62; YS=[850,865,880,900,920,940]
bg=cv2.GaussianBlur(np.median(np.stack([src(57.32,True),src(57.36,True)]).astype(np.float32),0),(0,0),7)
def rows(k):
    f=cv2.GaussianBlur(src(k/25,True).astype(np.float32),(0,0),7)
    r=f/np.maximum(bg,8)
    out={}
    for y in YS:
        m=(r[y]<THR)&(bg[y]>20); m[:560]=False; m[1950:]=False
        # runs
        runs=[]; x=0
        while x<2206:
            if m[x]:
                x0=x
                while x<2206 and m[x]: x+=1
                runs.append((x0,x-1))
            x+=1
        runs=[q for q in runs if q[1]-q[0]>=25]
        if runs: out[y]=max(runs,key=lambda q:q[1]-q[0])
    return out
R={k:rows(k) for k in range(1440,1538)}
T={}
for k in range(1441,1537):
    rr=[]
    for y in YS:
        vals=[R[j][y] for j in (k-1,k,k+1) if y in R[j]]
        if len(vals)>=2 and y in R[k]:
            rr.append([y,int(np.median([v[0] for v in vals])),int(np.median([v[1] for v in vals]))])
    if len(rr)>=2: T[k]=rr
print(len(T))
open('penum.json','w').write(json.dumps(T))
for k in [1452,1456,1460,1475,1500,1534]: print(k, T.get(k))
