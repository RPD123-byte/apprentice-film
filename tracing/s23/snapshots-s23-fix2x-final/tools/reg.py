import cv2,numpy as np,glob,re,sys
SP='/private/tmp/claude-501/-Users-computer-vibe-check/9d8e3a22-605d-469a-804c-e2a05ae8a7e5/scratchpad/s23f2'
d=sys.argv[1]
R={'all':(0,0,2206,946),'top':(300,0,1900,110),'left':(0,200,180,900),'right':(2030,200,2206,900),'hdr':(200,185,1990,300),'room':(200,320,1990,880),'floor':(0,880,2206,946)}
ks=sorted(int(re.search(r'r(\d+)',p).group(1)) for p in glob.glob(d+'/r0*.png'))
print('k    '+' '.join('%11s'%n for n in R))
acc={n:[] for n in R}
for k in ks:
    a=cv2.cvtColor(cv2.imread(f'{d}/r{k:05d}.png'),cv2.COLOR_BGR2GRAY).astype(float); b=cv2.cvtColor(cv2.imread(f'{SP}/src/{k:05d}.png'),cv2.COLOR_BGR2GRAY).astype(float)
    row=[]
    for n,(x0,y0,x1,y1) in R.items():
        ma=a[y0:y1,x0:x1].mean(); mb=b[y0:y1,x0:x1].mean(); acc[n].append(ma-mb); row.append('%5.1f/%5.1f'%(ma,mb))
    if k%6==1 or len(sys.argv)>2: print(k,' '.join(row))
print('mean diff',' '.join('%s %+.1f'%(n,np.mean(v)) for n,v in acc.items()))
