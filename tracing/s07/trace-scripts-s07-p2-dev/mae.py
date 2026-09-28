# mae.py DIR -> per-frame blurred grey MAE (sigma 2,4,8) render vs ref, plus region table
import cv2,numpy as np,sys,glob,re
d=sys.argv[1]
for fr in sorted(glob.glob(d+'/frame-*.png')):
  rf=fr.replace('/frame-','/ref-')
  a=cv2.imread(fr,0).astype(np.float32); b=cv2.imread(rf,0).astype(np.float32)
  out=[]
  for s in (0,2,4,8):
    A=cv2.GaussianBlur(a,(0,0),s) if s else a; B=cv2.GaussianBlur(b,(0,0),s) if s else b
    out.append(np.abs(A-B).mean())
  print(re.search(r'at-([\d.]+)s',fr).group(1), ' '.join('%.2f'%v for v in out), 'mean %.1f vs %.1f'%(a.mean(),b.mean()))
