import sys; sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import numpy as np,cv2,frames,glob,math
f=sys.argv[1]; t=float(sys.argv[2]); k=math.ceil(t*25-1e-6); C=int(sys.argv[3]) if len(sys.argv)>3 else 150
a=cv2.imread(f).astype(np.float32).mean(2); b=frames.frame(k).mean(2)*255
kk=lambda x,s: cv2.GaussianBlur(x,(0,0),s)
d=kk(a,2)-kk(b,2)
print('      '+''.join(f'{x:>9d}' for x in range(0,2206,C)))
for y in range(0,946,C):
  print(f'{y:5d} '+' '.join(f'{d[y:y+C,x:x+C].mean():+4.0f}/{np.abs(d[y:y+C,x:x+C]).mean():3.0f}' for x in range(0,2206,C)))
