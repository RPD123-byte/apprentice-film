import cv2,numpy as np,sys,glob
d,t=sys.argv[1],sys.argv[2]
f=[p for p in glob.glob(d+'/frame-*.png') if f'-at-{t}s' in p][0]
a=cv2.cvtColor(cv2.imread(f),cv2.COLOR_BGR2GRAY).astype(np.float32); b=cv2.cvtColor(cv2.imread(f.replace('frame-','ref-')),cv2.COLOR_BGR2GRAY).astype(np.float32)
cw,ch=int(sys.argv[3]) if len(sys.argv)>3 else 100, int(sys.argv[4]) if len(sys.argv)>4 else 60
print('ren/ref mean',a.mean(),b.mean())
print('diff = render - ref (cell means)')
print('     '+' '.join(f'{x:4d}' for x in range(0,2206,cw)))
for y in range(0,946,ch):
  print(f'{y:4d} '+' '.join(f'{a[y:y+ch,x:x+cw].mean()-b[y:y+ch,x:x+cw].mean():+4.0f}' for x in range(0,2206,cw)))
