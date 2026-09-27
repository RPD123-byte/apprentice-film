import cv2,numpy as np,sys
b=cv2.imread('rs_24.png').astype(float); a=cv2.imread(sys.argv[1]).astype(float)
gb=b.mean(2); ga=a.mean(2)
m=(ga<70)&(gb<75)&(cv2.GaussianBlur(ga,(0,0),6)<62)
for y in range(50,1000,125):
  row=[]
  for x in range(0,1600,200):
    mm=m[y:y+125,x:x+200]
    row.append('%+5.1f'%((gb[y:y+125,x:x+200][mm]-ga[y:y+125,x:x+200][mm]).mean()) if mm.sum()>500 else '  ---')
  print('y%4d'%y,' '.join(row))
print('BGR diff all ground', (b[m]-a[m]).mean(0).round(1))
