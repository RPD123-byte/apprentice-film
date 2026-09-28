# texmap.py NAME [cell]: fine-detail energy ratio ours/source per cell (pre-grade): E = mean |I - G(I, 1.5)|; <1 = ours too smooth
import cv2, sys, numpy as np
nm=sys.argv[1]; cell=int(sys.argv[2]) if len(sys.argv)>2 else 50
r=cv2.imread(f'../f1-p3/{nm}_raw.png',0).astype(np.float32); u=cv2.imread('../f1-p3/clean_u.png',0).astype(np.float32)
def E(a): 
    return np.abs(a-cv2.GaussianBlur(a,(0,0),2.0))
er, eu = E(r), np.abs(u-cv2.GaussianBlur(u,(0,0),2.0))
H,W=r.shape
print('      '+''.join(f'{x:5d}' for x in range(0,W,cell)))
for y in range(0,H,cell):
    row=''
    for x in range(0,W,cell):
        a=er[y:y+cell,x:x+cell].mean(); b=eu[y:y+cell,x:x+cell].mean()
        row+=f'{(a/b if b>1.5 else 0):5.1f}' if b>1.5 else '    .'
    print(f'{y:5d} '+row)
print('global ratio', er.mean()/eu.mean())
