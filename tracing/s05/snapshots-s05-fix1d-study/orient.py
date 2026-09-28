#!/usr/bin/env python3
# orient.py REF x0 y0 x1 y1 [cell]: dominant line orientation (deg, 0 = horizontal, + = descending to the right in image
# coords) per cell from the structure tensor of the ungraded reference; coherence in brackets
import sys, numpy as np, cv2
a=sys.argv; ref=a[1]; x0,y0,x1,y1=[int(v) for v in a[2:6]]; cell=int(a[6]) if len(a)>6 else 60
u=np.load(f'{ref}_u.npy').mean(2).astype(np.float32) if not ref.endswith('.png') else cv2.imread(ref).mean(2).astype(np.float32)/255
gx=cv2.Sobel(u,cv2.CV_32F,1,0,ksize=3); gy=cv2.Sobel(u,cv2.CV_32F,0,1,ksize=3)
for y in range(y0,y1,cell):
    row=[]
    for x in range(x0,x1,cell):
        Jxx=(gx[y:y+cell,x:x+cell]**2).sum(); Jyy=(gy[y:y+cell,x:x+cell]**2).sum(); Jxy=(gx[y:y+cell,x:x+cell]*gy[y:y+cell,x:x+cell]).sum()
        th=0.5*np.arctan2(2*Jxy,Jxx-Jyy)   # gradient orientation
        line=np.degrees(th)+90             # line direction is perpendicular
        if line>90: line-=180
        coh=np.sqrt((Jxx-Jyy)**2+4*Jxy**2)/(Jxx+Jyy+1e-9)
        row.append(f'{line:+4.0f}({coh:.2f})')
    print(y,' '.join(row))
