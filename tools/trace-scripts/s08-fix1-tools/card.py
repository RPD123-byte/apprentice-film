import cv2,numpy as np,sys
rd=sys.argv[1]; fr=int(sys.argv[2]) if len(sys.argv)>2 else 765
a=cv2.imread(f'{rd}/r{fr}.png'); b=cv2.imread(f'snapshots/s08-rev1-src/f{fr}.png')
def L(im): return cv2.cvtColor(im,cv2.COLOR_BGR2GRAY).astype(float)
la,lb=L(a),L(b)
for (y0,y1) in [(200,260),(420,560),(600,700),(780,830)]:
  print('y',y0,y1)
  xs=list(range(1460,1915,20))
  print(' x  ',' '.join('%4d'%x for x in xs))
  print(' ren',' '.join('%4d'%np.median(la[y0:y1,x-3:x+4]) for x in xs))
  print(' src',' '.join('%4d'%np.median(lb[y0:y1,x-3:x+4]) for x in xs))
