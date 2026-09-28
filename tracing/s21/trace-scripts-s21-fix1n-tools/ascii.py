#!/usr/bin/env python3
# ascii.py IMG x0 y0 x1 y1 [step] : ASCII value map (@>205 #>175 +>130 ->80 .)
import cv2, sys
im=cv2.imread(sys.argv[1],0); x0,y0,x1,y1=[int(v) for v in sys.argv[2:6]]; st=int(sys.argv[6]) if len(sys.argv)>6 else 1
print('    '+''.join(str((x//10)%10) if x%10==0 else ' ' for x in range(x0,x1,st)))
for y in range(y0,y1,st): print(f'{y:3d}', ''.join('@' if v>205 else ('#' if v>175 else ('+' if v>130 else ('-' if v>80 else '.'))) for v in im[y,x0:x1:st]))
