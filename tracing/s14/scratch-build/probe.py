# probe.py dir t : blurred luma (sigma 12) on a grid, render / source
import cv2,numpy as np,sys,glob
d,t=sys.argv[1],sys.argv[2]
f=glob.glob(f'{d}/frame-*-at-{t}s.png')[0]; r=f.replace('frame-','ref-')
A=cv2.GaussianBlur(cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2GRAY).astype(float),(0,0),12)
B=cv2.GaussianBlur(cv2.cvtColor(cv2.imread(r),cv2.COLOR_BGR2GRAY).astype(float),(0,0),12)
xs=list(range(50,2206,100)); print('     '+''.join(f'{x:>8}' for x in xs))
for y in range(50,946,75):
    print(f'{y:>4} '+''.join(f'{int(A[y,x]):>4}/{int(B[y,x]):<3}' for x in xs))
