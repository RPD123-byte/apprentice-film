# usage: crops.py renderdir out.jpg x0 y0 x1 y1 [scale] [cols]  -> pairs (render | source) per frame, labelled
import cv2, glob, re, sys, numpy as np, math
S='/private/tmp/claude-501/-Users-computer-rootline/6f944872-83e8-49ee-aa42-9b1aaf1ef7e8/scratchpad/s17f/'
d,out=sys.argv[1],sys.argv[2]; x0,y0,x1,y1=map(int,sys.argv[3:7]); sc=float(sys.argv[7]) if len(sys.argv)>7 else 2; cols=int(sys.argv[8]) if len(sys.argv)>8 else 2
fs=sorted(glob.glob(d+'/frame-*.png'),key=lambda p:float(re.search(r'at-([\d.]+)s',p).group(1)))
sel=[float(x) for x in sys.argv[9].split(',')] if len(sys.argv)>9 else None
tiles=[]
for f in fs:
    t=float(re.search(r'at-([\d.]+)s',f).group(1))
    if sel and not any(abs(t-x)<0.005 for x in sel): continue
    q=math.floor(t*30+1e-9)/30; n=math.ceil(q*25-0.01)
    a=cv2.imread(f); b=cv2.imread(S+'src/f%04d.png'%n)
    if b is None: continue
    A=cv2.resize(a[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC); B=cv2.resize(b[y0:y1,x0:x1],None,fx=sc,fy=sc,interpolation=cv2.INTER_CUBIC)
    T=np.hstack([A,np.full((A.shape[0],4,3),80,np.uint8),B])
    cv2.putText(T,'%.2f r|s f%d'%(t,n),(6,22),cv2.FONT_HERSHEY_SIMPLEX,0.7,(0,200,255),2)
    tiles.append(T)
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
rows=[np.hstack([np.pad(t,((0,6),(0,6),(0,0))) for t in tiles[i:i+cols]]) for i in range(0,len(tiles),cols)]
sheet=np.vstack(rows)
if sheet.shape[1]>2400: sheet=cv2.resize(sheet,(2400,int(sheet.shape[0]*2400/sheet.shape[1])))
cv2.imwrite(out,sheet,[cv2.IMWRITE_JPEG_QUALITY,88]); print(out,sheet.shape)
