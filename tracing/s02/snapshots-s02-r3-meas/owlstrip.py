import cv2, numpy as np, re, sys
txt=open('../s02-r3-orig/s02.js.orig').read()
rows=re.findall(r'\[(1[6-9]\.\d\d), ([\d.]+), ([\d.]+), ([\d.]+), (-?[\d.]+)\]', txt)
ROOT={int(round(float(r[0])*25)):[float(v) for v in r[1:]] for r in rows}
f0,f1,st=int(sys.argv[1]),int(sys.argv[2]),int(sys.argv[3]); out=sys.argv[4]
tiles=[]
for f in range(f0,f1+1,st):
    im=cv2.imread(f'../s02-r3-src/{f:04d}.png')
    x,y,s,_=ROOT.get(f,ROOT[400]) if f>=400 else (1084,250,0.65,0)
    w=int(1300*s); h=int(900*s); x0=int(x-w/2); y0=int(y-h*0.6)
    pad=cv2.copyMakeBorder(im,1000,1000,1000,1000,cv2.BORDER_CONSTANT)
    c=pad[y0+1000:y0+1000+h, x0+1000:x0+1000+w]
    c=cv2.resize(c,(390,270)); cv2.putText(c,f'{f} {f/25:.2f}',(4,16),0,0.5,(0,255,255),1); tiles.append(c)
cols=5
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(out,np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]),[cv2.IMWRITE_JPEG_QUALITY,85])
