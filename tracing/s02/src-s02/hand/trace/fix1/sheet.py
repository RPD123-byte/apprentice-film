import cv2, sys, numpy as np, glob
# sheet.py DIR FRAMES OUT [width]
d=sys.argv[1]; fr=[int(x) for x in sys.argv[2].split(',')]; out=sys.argv[3]; w=int(sys.argv[4]) if len(sys.argv)>4 else 1400
rows=[]
for f in fr:
    p=cv2.imread(f'{d}/pair-{f:04d}.jpg')
    if p is None: continue
    p=cv2.resize(p,(w,int(w*p.shape[0]/p.shape[1])),interpolation=cv2.INTER_AREA)
    cv2.putText(p,str(f),(8,24),0,0.8,(0,255,255),2); rows.append(p)
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,85])
