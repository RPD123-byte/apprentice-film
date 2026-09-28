# cells.py DIR k [k...]: grid of mean (render - source) per 100x80 cell (blurred luminance)
import sys,cv2,numpy as np
sys.path.insert(0,__file__.rsplit('/',1)[0]); from src import frame
d=sys.argv[1]
for k in map(int,sys.argv[2:]):
    s=cv2.cvtColor(frame(k),cv2.COLOR_BGR2GRAY).astype(np.float32); r=cv2.cvtColor(cv2.imread(f'{d}/k{k}.png'),cv2.COLOR_BGR2GRAY).astype(np.float32)
    D=r-s; print('k',k)
    for y in range(0,946,80):
        print(' '.join('%+5.1f'%D[y:y+80,x:x+100].mean() for x in range(0,2206,100)))
