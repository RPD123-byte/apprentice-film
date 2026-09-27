import cv2,numpy as np,sys
ren=cv2.GaussianBlur(cv2.imread('out/r-138.000.png').astype(np.float32),(0,0),1.5); src=cv2.GaussianBlur(cv2.imread('src/f3450.png').astype(np.float32),(0,0),1.5)
x0,x1=int(sys.argv[1]),int(sys.argv[2]); ys=[int(v) for v in sys.argv[3].split(',')]
def cls(p):
  b,g,r=p; L=(r+g+b)/3
  if L<95: return 'D'
  if g>175 and b>140: return 'C'   # cream/cloud
  if g>120: return 'P'  # peach / light orange
  return 'R'
for y in ys:
  for lab,im in (('ren',ren),('src',src)):
    row=[cls(im[y,x]) for x in range(x0,x1)]
    runs=[];cur=row[0];st=x0
    for i,c in enumerate(row[1:],1):
      if c!=cur: runs.append((cur,st,x0+i-1)); cur=c; st=x0+i
    runs.append((cur,st,x1-1))
    runs=[r for r in runs if r[2]-r[1]>=2]
    print(f'y{y} {lab}: '+' '.join(f'{c}{a}-{b}' for c,a,b in runs))
