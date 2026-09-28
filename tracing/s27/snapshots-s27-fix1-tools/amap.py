# ascii class map of a source region: '#' ink/hair (dark), 's' skin, 'g' green/grey (jacket/beanie), '.' light bg, 'o' other
import cv2, sys, numpy as np
from src import frame
t=float(sys.argv[1]); x0,y0,x1,y1,st=[int(v) for v in sys.argv[2:7]]
f=cv2.GaussianBlur(frame(t),(0,0),1.5)
hsv=cv2.cvtColor(f,cv2.COLOR_BGR2HSV)
print('     '+''.join(str((x//100)%10) if x%100==0 else ' ' for x in range(x0,x1,st)))
for y in range(y0,y1,st):
    row=''
    for x in range(x0,x1,st):
        b,g,r=[int(v) for v in f[y,x]]; h,s,v=hsv[y,x]
        L=0.3*r+0.59*g+0.11*b
        if L<60: c='#'
        elif r>g+18 and r>b+25: c='s' if L>150 else 'd'
        elif abs(r-g)<22 and g>b-5 and L<185: c='g'
        elif L>200: c='.'
        else: c='o'
        row+=c
    print(f'{y:4d} '+row)
