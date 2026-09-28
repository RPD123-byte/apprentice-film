import cv2,numpy as np,sys
rd=sys.argv[1]; fr=int(sys.argv[2]); x0,y0,x1,y1,st=map(int,sys.argv[3:8])
a=cv2.imread(f'{rd}/r{fr}.png'); b=cv2.imread(f'snapshots/s08-rev1-src/f{fr}.png')
la=cv2.cvtColor(a,cv2.COLOR_BGR2GRAY).astype(float); lb=cv2.cvtColor(b,cv2.COLOR_BGR2GRAY).astype(float)
la=cv2.GaussianBlur(la,(0,0),2); lb=cv2.GaussianBlur(lb,(0,0),2)
xs=list(range(x0,x1,st)); print('      '+' '.join('%5d'%x for x in xs))
for y in range(y0,y1,st):
  row=[]
  for x in xs:
    A=la[y:y+st,x:x+st]; B=lb[y:y+st,x:x+st]
    row.append('%5.0f'%(np.median(B)-np.median(A)) if sys.argv[-1]=='d' else '%5.2f'%(np.median(B)/max(1,np.median(A))))
  print('%5d '%y+' '.join(row))
