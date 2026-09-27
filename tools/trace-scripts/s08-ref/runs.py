import cv2, numpy as np, sys
f=cv2.imread(sys.argv[1]).astype(int)
mode=sys.argv[2]; c=int(sys.argv[3]); a=int(sys.argv[4]); b=int(sys.argv[5])
line=f[c,a:b] if mode=='h' else f[a:b,c]
# smooth
runs=[]; start=0
for i in range(1,len(line)+1):
    if i==len(line) or np.abs(line[i]-line[start:i].mean(0)).max()>28:
        if i-start>=4:
            m=np.median(line[start:i],0); runs.append((a+start,a+i-1,'#%02x%02x%02x'%(int(m[2]),int(m[1]),int(m[0]))))
        start=i
for r in runs: print(r)
