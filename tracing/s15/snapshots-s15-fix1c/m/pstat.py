# pstat.py dirs... : luma percentiles + high-pass std in given patches, render dirs vs source
import sys,cv2,numpy as np
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/snapshots/s15-p4/tools')
from common import frame
P=[(1111,20,120,240,560),(1111,300,420,640,600),(1090,760,200,880,640),(1105,20,560,560,690),(1136,10,200,180,700),(1036,1600,50,2100,380),(1060,1300,100,1700,500),(1078,200,100,700,500)]
dirs=sys.argv[1:]
def st(im,x0,y0,x1,y1):
    g=cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(np.float32)[y0:y1,x0:x1]
    hp=g-cv2.GaussianBlur(g,(0,0),6)
    p=np.percentile(g,[5,25,50,75,95])
    return '%5.0f %5.0f %5.0f %5.0f %5.0f | hp %4.1f'%(*p,hp.std())
for f,x0,y0,x1,y1 in P:
    print(f,(x0,y0,x1,y1))
    print('   SRC ',st(frame(f),x0,y0,x1,y1))
    for d in dirs:
        im=cv2.imread(f'{d}/r{f}.png')
        if im is not None: print('   %-5s'%d.split('/')[-1][:5],st(im,x0,y0,x1,y1))
