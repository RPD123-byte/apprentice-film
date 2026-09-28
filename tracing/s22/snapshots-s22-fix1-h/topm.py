import sys; sys.path.insert(0,'.')
import cv2, numpy as np
from run import src, gray
d=sys.argv[1]; E=[]; B=[]
for F in [1871,1879,1889,1899,1909]:
    r=gray(cv2.imread(f'{d}/r{F:04d}.png')); s=gray(src(F))
    bright=cv2.dilate(((r>120)|(s>120)).astype(np.uint8),np.ones((31,31),np.uint8))>0
    D=cv2.GaussianBlur(r,(0,0),3)-cv2.GaussianBlur(s,(0,0),3)
    m=np.zeros_like(bright); m[0:125,:]=True; m&=~bright
    E.append(np.abs(D[m]).mean()); B.append(D[m].mean())
print(d,'top margin |d| %.2f bias %+.2f'%(np.mean(E),np.mean(B)))
