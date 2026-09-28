#!/usr/bin/env python3
# crop.py OUT.jpg x0 y0 x1 y1 scale n1,n2,... [--diff]  -> rows: render | source | diff
import cv2, numpy as np, sys
out=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); sc=float(sys.argv[6]); ns=[int(v) for v in sys.argv[7].split(',')]
diff='--diff' in sys.argv
R='/Users/computer/rootline/apprentice-film/snapshots/s06-rev2-f1/f-%d.png'; S='/Users/computer/rootline/apprentice-film/snapshots/s06-rev2-src/s-%d.png'
rows=[]
for n in ns:
    a=cv2.imread(R%n)[y0:y1,x0:x1]; b=cv2.imread(S%n)[y0:y1,x0:x1]
    parts=[a,b]
    if diff:
        d=(a.astype(int).mean(2)-b.astype(int).mean(2)); d=np.clip(128+d*2,0,255).astype(np.uint8); parts.append(cv2.cvtColor(d,cv2.COLOR_GRAY2BGR))
    sep=np.full((a.shape[0],4,3),(0,0,255),np.uint8)
    row=np.hstack(sum([[p,sep] for p in parts],[])[:-1])
    row=cv2.resize(row,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST if sc>=2 else cv2.INTER_AREA if sc<1 else cv2.INTER_LINEAR)
    cv2.putText(row,str(n),(5,20),cv2.FONT_HERSHEY_SIMPLEX,0.6,(0,255,255),2)
    rows.append(row); rows.append(np.full((4,row.shape[1],3),(0,0,255),np.uint8))
cv2.imwrite(out,np.vstack(rows[:-1]),[cv2.IMWRITE_JPEG_QUALITY,92]); print(out)
