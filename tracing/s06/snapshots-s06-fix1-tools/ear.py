import cv2,numpy as np,sys
for d in sys.argv[1:]:
    out=[]
    for n in range(700,716):
        a=cv2.imread(f'{d}/f-{n}.png',0).astype(float); b=cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s06-fix1-src/s-{n}.png',0).astype(float)
        e=np.abs(cv2.GaussianBlur(a,(0,0),1.5)-cv2.GaussianBlur(b,(0,0),1.5))[250:390,1780:1860].mean()
        out.append(f'{n}:{e:.1f}')
    print(d.split('/')[-1],' '.join(out))
