import cv2,glob,sys,numpy as np
# full.py dir out t1 t2 ... ; half-res full frames stacked
d,out=sys.argv[1],sys.argv[2]; rows=[]
for t in sys.argv[3:]:
  p=glob.glob(f'{d}/frame-*-at-{t}s.png')[0]; r=p.replace('frame-','ref-')
  a=cv2.resize(cv2.imread(p),(1103,473),interpolation=cv2.INTER_AREA); b=cv2.resize(cv2.imread(r),(1103,473),interpolation=cv2.INTER_AREA)
  row=np.hstack([a,np.full((473,4,3),120,np.uint8),b]); cv2.putText(row,t,(5,25),0,0.8,(0,0,255),2); rows.append(row)
cv2.imwrite(out,np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,90])
