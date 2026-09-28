import cv2, numpy as np, sys
r=cv2.imread(sys.argv[1],0).astype(np.float32); s=cv2.imread(sys.argv[2],0).astype(np.float32)
st=int(sys.argv[3]) if len(sys.argv)>3 else 50
x0,y0,x1,y1=[int(v) for v in sys.argv[4:8]] if len(sys.argv)>7 else (650,0,1960,946)
a=cv2.GaussianBlur(r,(0,0),10); b=cv2.GaussianBlur(s,(0,0),10)
print('     '+' '.join(f'{x:4d}' for x in range(x0,x1,st)))
for y in range(y0+st//2,y1,st):
  print(f'{y:4d} '+' '.join(f'{int(round(a[y,x]-b[y,x])):4d}' for x in range(x0+st//2,x1,st)))
