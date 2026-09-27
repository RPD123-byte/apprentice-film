import cv2,numpy as np,sys
s=cv2.imread('src/f3450.png').astype(np.float32); n=cv2.imread(sys.argv[1]).astype(np.float32)
m=cv2.imread('mask.png'); obj=m[...,1]>128; cloud=m[...,2]>128
sel={'sky':~obj,'cloud':cloud}[sys.argv[2]]
d=(n-s).mean(2)
H,W=d.shape; cy,cx=8,12
for j in range(cy):
  row=[]
  for i in range(cx):
    sl=(slice(j*H//cy,(j+1)*H//cy),slice(i*W//cx,(i+1)*W//cx)); ss=sel[sl]
    row.append(f'{d[sl][ss].mean():+5.1f}' if ss.sum()>3000 else '   . ')
  print(' '.join(row))
