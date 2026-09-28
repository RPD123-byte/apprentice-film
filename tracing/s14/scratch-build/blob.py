import cv2, glob, re, sys, numpy as np
d=sys.argv[1]; thr=int(sys.argv[2]) if len(sys.argv)>2 else 150
def blob(p, region=None):
  g=cv2.imread(p,0)
  m=(g>thr).astype(np.uint8)
  if region: x0,y0,x1,y1=region; mm=np.zeros_like(m); mm[y0:y1,x0:x1]=m[y0:y1,x0:x1]; m=mm
  m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((7,7),np.uint8))
  n,l,st,cen=cv2.connectedComponentsWithStats(m)
  if n<2: return None
  i=1+np.argmax(st[1:,4]); x,y,w,h,a=st[i]
  return (x,y,x+w,y+h,a,cen[i][0],cen[i][1])
reg=tuple(map(int,sys.argv[3:7])) if len(sys.argv)>6 else None
for p in sorted(glob.glob(d+'/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s',p).group(1))):
  t=float(re.search(r'at-([\d.]+)s',p).group(1))
  a=blob(p,reg); b=blob(p.replace('frame-','ref-'),reg)
  f=lambda v: 'none' if v is None else f'bb=({v[0]:4d},{v[1]:4d},{v[2]:4d},{v[3]:4d}) area={v[4]:6d} c=({v[5]:6.1f},{v[6]:6.1f})'
  dc='' if a is None or b is None else f'  dC=({a[5]-b[5]:+.0f},{a[6]-b[6]:+.0f}) areaR={a[4]/b[4]:.2f}'
  print(f'{t:.2f} R {f(a)} | S {f(b)}{dc}')
