import sys; sys.path.insert(0,'.')
import cv2, numpy as np
from run import src, gray
d=sys.argv[1]; E=[]; B=[]; T=[]
for F in [1983,1986,1988,1990,1993]:
    r=gray(cv2.imread(f'{d}/r{F:04d}.png')); s=gray(src(F))
    bright=cv2.dilate(((r>120)|(s>120)).astype(np.uint8),np.ones((31,31),np.uint8))>0
    D=cv2.GaussianBlur(r,(0,0),3)-cv2.GaussianBlur(s,(0,0),3)
    m=np.zeros_like(bright); m[130:800,0:140]=True; m&=~bright
    E.append(np.abs(D[m]).mean()); B.append(D[m].mean())
    m2=np.zeros_like(bright); m2[0:125,0:600]=True; m2&=~bright; T.append(np.abs(D[m2]).mean())
print(d,'left margin |d| %.2f bias %+.2f'%(np.mean(E),np.mean(B)),' top-left |d| %.2f'%np.mean(T))
