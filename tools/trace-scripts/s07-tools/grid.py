# print blurred luminance grid: ren/ref over a region. usage: grid.py DIR idx x0 x1 dx y0 y1 dy [sigma]
import cv2, numpy as np, sys, glob
d,idx=sys.argv[1],sys.argv[2]; x0,x1,dx,y0,y1,dy=[int(v) for v in sys.argv[3:9]]; sg=float(sys.argv[9]) if len(sys.argv)>9 else 12
fr=glob.glob(f'{d}/frame-{idx}-at-*.png')[0]; rf=fr.replace('/frame-','/ref-')
a=cv2.GaussianBlur(cv2.imread(fr,0).astype(np.float32),(0,0),sg); b=cv2.GaussianBlur(cv2.imread(rf,0).astype(np.float32),(0,0),sg)
print('      '+' '.join('%7d'%x for x in range(x0,x1,dx)))
for y in range(y0,y1,dy):
  print('%5d '%y+' '.join('%3d/%-3d'%(a[y,x],b[y,x]) for x in range(x0,x1,dx)))
