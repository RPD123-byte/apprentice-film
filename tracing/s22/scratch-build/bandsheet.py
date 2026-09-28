import cv2, sys, glob, re, numpy as np
# bandsheet.py dir x0 y0 x1 y1 scale per_sheet outprefix [tmin tmax]
d=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); sc=float(sys.argv[6]); n=int(sys.argv[7]); op=sys.argv[8]
tmin=float(sys.argv[9]) if len(sys.argv)>9 else -1; tmax=float(sys.argv[10]) if len(sys.argv)>10 else 1e9
fs=sorted(glob.glob(d+'/frame-*-at-*s.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
fs=[p for p in fs if tmin-1e-6<=float(re.search(r'at-([\d.]+)s',p).group(1))<=tmax+1e-6]
tiles=[]
for p in fs:
    t=re.search(r'at-([\d.]+)s',p).group(1)
    a=cv2.imread(p)[y0:y1,x0:x1]; b=cv2.imread(p.replace('/frame-','/ref-'))[y0:y1,x0:x1]
    a=cv2.resize(a,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA); b=cv2.resize(b,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA)
    cv2.putText(a,'R '+t,(5,18),cv2.FONT_HERSHEY_SIMPLEX,0.55,(0,255,255),1); cv2.putText(b,'S '+t,(5,18),cv2.FONT_HERSHEY_SIMPLEX,0.55,(0,255,0),1)
    tiles.append(np.vstack([a,b,np.full((6,a.shape[1],3),(0,0,160),np.uint8)]))
for k in range(0,len(tiles),n):
    cv2.imwrite(f'{op}-{k//n}.jpg',np.vstack(tiles[k:k+n]),[cv2.IMWRITE_JPEG_QUALITY,88])
print(len(tiles))
