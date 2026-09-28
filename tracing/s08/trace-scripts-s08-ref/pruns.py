import cv2, numpy as np, sys
f=cv2.imread(sys.argv[1]).astype(int); K=2; X0=660; Y0=100
mode=sys.argv[2]; c=float(sys.argv[3]); a=float(sys.argv[4]); b=float(sys.argv[5])
ci=int((c-(Y0 if mode=='h' else X0))*K); ai=int((a-(X0 if mode=='h' else Y0))*K); bi=int((b-(X0 if mode=='h' else Y0))*K)
line=f[ci,ai:bi] if mode=='h' else f[ai:bi,ci]
runs=[]; start=0
for i in range(1,len(line)+1):
    if i==len(line) or np.abs(line[i]-np.median(line[start:i],0)).max()>30:
        if i-start>=3:
            m=np.median(line[start:i],0); runs.append(f"{(ai+start)/K+(X0 if mode=='h' else Y0):.0f}-{(ai+i)/K+(X0 if mode=='h' else Y0):.0f}:#{int(m[2]):02x}{int(m[1]):02x}{int(m[0]):02x}")
        start=i
print(mode,c,' '.join(runs))
