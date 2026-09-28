import numpy as np, cv2, sys, glob
d=sys.argv[1]; C=int(sys.argv[2]) if len(sys.argv)>2 else 100
for f in sorted(glob.glob(f'{d}/frame-*.png')):
    r=cv2.imread(f).astype(np.float32); s=cv2.imread(f.replace('frame-','ref-')).astype(np.float32)
    if r.shape!=s.shape: s=cv2.resize(s,(r.shape[1],r.shape[0]))
    rb=cv2.GaussianBlur(r,(0,0),3); sb=cv2.GaussianBlur(s,(0,0),3)
    e=np.abs(rb-sb).mean(-1); sg=(rb-sb).mean(-1)
    H,W=e.shape
    cells=[]
    for y in range(0,H-C+1,C//2):
        for x in range(0,W-C+1,C//2):
            cells.append((e[y:y+C,x:x+C].mean(),x,y,sg[y:y+C,x:x+C].mean()))
    cells.sort(reverse=True)
    print(f.split('/')[-1],'MAE',round(e.mean(),2),'dmean',round(sg.mean(),2),'top cells:',' '.join(f'({x},{y}):{m:.1f}{s:+.1f}' for m,x,y,s in cells[:8]))
