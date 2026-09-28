import cv2,numpy as np,glob,re,os
S='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s24rev'
rows=[]
for p in sorted(glob.glob(S+'/rend/k*.*')):
    k=int(re.search(r'k(\d+)',os.path.basename(p)).group(1))
    r=cv2.imread(p); s=cv2.imread(f'{S}/src/n{2420+k}.jpg')
    rg=cv2.cvtColor(r,cv2.COLOR_BGR2GRAY).astype(float); sg=cv2.cvtColor(s,cv2.COLOR_BGR2GRAY).astype(float)
    e1=np.abs(cv2.GaussianBlur(rg,(0,0),1)-cv2.GaussianBlur(sg,(0,0),1)).mean()
    rq=cv2.resize(rg,(551,236),interpolation=cv2.INTER_AREA); sq=cv2.resize(sg,(551,236),interpolation=cv2.INTER_AREA)
    e8=np.abs(cv2.GaussianBlur(rq,(0,0),2)-cv2.GaussianBlur(sq,(0,0),2)).mean()
    # best matching source frame (timing check) among k-3..k+3
    best=min(range(max(5,k-3),min(94,k+4)),key=lambda j: np.abs(cv2.resize(cv2.cvtColor(cv2.imread(f'{S}/src/n{2420+j}.jpg'),cv2.COLOR_BGR2GRAY),(551,236),interpolation=cv2.INTER_AREA).astype(float)-rq).mean())
    # colour cast: mean B,G,R
    mr=r.reshape(-1,3).mean(0); ms=s.reshape(-1,3).mean(0)
    # high-frequency energy ratio
    hr=np.abs(rg-cv2.GaussianBlur(rg,(0,0),2)).mean(); hs=np.abs(sg-cv2.GaussianBlur(sg,(0,0),2)).mean()
    rows.append((k,e1,e8,best,rg.mean(),sg.mean(),hr,hs,mr,ms))
    print(f'k{k:02d} e1 {e1:5.1f} e8 {e8:5.1f} best k{best:02d} {"" if best==k else "<<"} meanL r {rg.mean():6.1f} s {sg.mean():6.1f}  HF r {hr:4.1f} s {hs:4.1f}  BGR r {mr.round(1)} s {ms.round(1)}')
