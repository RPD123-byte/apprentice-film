from lab import src
import cv2, numpy as np
ref=cv2.GaussianBlur(src(57.36,True).astype(float),(0,0),7)
rows=[840,850,865,880,900,920,940]
res=[]
for k in range(1441,1537):
    t=k/25
    s=cv2.GaussianBlur(src(t,True).astype(float),(0,0),7)
    rat=s/np.maximum(ref,6)
    out=[]
    for y in rows:
        row=rat[y,600:1900]; lit=ref[y,600:1900]>30
        d=np.where((row<0.3)&lit)[0]
        if len(d)<6: out.append(None); continue
        # largest contiguous run (allow gaps < 25)
        runs=[]; st=d[0]; pv=d[0]
        for v in d[1:]:
            if v-pv>25: runs.append((st,pv)); st=v
            pv=v
        runs.append((st,pv)); a,b=max(runs,key=lambda r:r[1]-r[0])
        out.append((600+int(a),600+int(b)) if b-a>20 else None)
    res.append((round(t,2),out))
    print(f'{t:.2f}', ' '.join(f'{y}:{o[0]}-{o[1]}' if o else f'{y}:-' for y,o in zip(rows,out)))
