# render|source crops around the owl (kit root track) for a list of frames in a rendered dir
import cv2, numpy as np, sys, re
sys.path.insert(0,'.')
d=sys.argv[1]; frames=[int(v) for v in sys.argv[2].split(',')]
T=open('../../src/shots/s02/hand/owltrack.js').read()
R=[float(v) for v in re.search(r'OWL_ROOT = \[(.*?)\]',T).group(1).split(',')]
F0=int(re.search(r'OWL_F0 = (\d+)',T).group(1))
tiles=[]
for f in frames:
    k=max(0,min(len(R)//4-1,f-F0)); x,y,s,b=R[4*k:4*k+4]
    if f<405: x,y,s=1090+2203.3-2203.3,274,0.68   # hold frame (camera still until 413)
    w=int(1100*s); h=int(760*s); x0=int(x-w/2); y0=int(y-h*0.62)
    out=[]
    for im in [cv2.imread(f'{d}/r{f:04d}.png'), cv2.imread(f'../s02-r3-src/{f:04d}.png')]:
        p=cv2.copyMakeBorder(im,800,800,800,800,cv2.BORDER_CONSTANT); c=p[y0+800:y0+800+h,x0+800:x0+800+w]
        out.append(cv2.resize(c,(440,304)))
    t=np.hstack(out); cv2.putText(t,f'{f}',(4,16),0,0.5,(0,255,255),1); tiles.append(t)
cols=2
while len(tiles)%cols: tiles.append(np.zeros_like(tiles[0]))
cv2.imwrite(f'{d}/owlpairs.jpg',np.vstack([np.hstack(tiles[i:i+cols]) for i in range(0,len(tiles),cols)]),[cv2.IMWRITE_JPEG_QUALITY,85])
