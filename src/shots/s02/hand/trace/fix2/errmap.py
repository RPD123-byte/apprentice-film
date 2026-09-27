# per-region blurred error change between two render dirs: python3 errmap.py DIRA DIRB f [cell]
import cv2,numpy as np,sys
A,B,f=sys.argv[1],sys.argv[2],int(sys.argv[3]); c=int(sys.argv[4]) if len(sys.argv)>4 else 200
s=cv2.GaussianBlur(cv2.imread('../s02-fix1h-src/%04d.png'%f,0).astype(np.float32),(0,0),8)
ea=np.abs(cv2.GaussianBlur(cv2.imread(f'{A}/r{f:04d}.png',0).astype(np.float32),(0,0),8)-s)
eb=np.abs(cv2.GaussianBlur(cv2.imread(f'{B}/r{f:04d}.png',0).astype(np.float32),(0,0),8)-s)
print('total',ea.mean(),eb.mean())
H,W=s.shape
for y in range(0,H,c):
    print('%4d '%y+' '.join('%+5.1f'%((eb[y:y+c,x:x+c]-ea[y:y+c,x:x+c]).mean()) for x in range(0,W,c)))
