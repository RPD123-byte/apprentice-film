import cv2,numpy as np,sys
d=sys.argv[1]; fr=[int(x) for x in sys.argv[2].split(',')]
for nm,(x0,x1) in (('L',(808,943)),('R',(1129,1183))):
    E=[]
    for n in fr:
        a=cv2.imread(f'{d}/f-{n}.png',0).astype(float); b=cv2.imread(f'/Users/computer/rootline/apprentice-film/snapshots/s06-fix1-src/s-{n}.png',0).astype(float)
        E.append((a-b)[270:294,x0:x1].mean(1))
    p=np.mean(E,0); print(nm,' '.join(f'{y}:{v:+.0f}' for y,v in zip(range(270,294),p)), ' absmean %.2f'%np.abs(p).mean())
