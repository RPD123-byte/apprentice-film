# shiftmap.py OUTDIR k [T] : phase-correlation shift (render vs source) per tile for exact frame k from rend.sh output
import cv2, numpy as np, sys, glob, math, re
sys.path.insert(0,'/Users/computer/rootline/apprentice-film/src/shots/s05/trace')
import frames
d,k=sys.argv[1],int(sys.argv[2]); T=int(sys.argv[3]) if len(sys.argv)>3 else 96
f=[f for f in glob.glob(d+'/frame-*.png') if 578+math.floor(float(re.search(r'at-([\d.]+)s',f).group(1))*30+1e-6)==k][0]
a=cv2.imread(f).astype(np.float32).mean(2); b=(frames.frame(k)*255).astype(np.float32).mean(2)
a=cv2.GaussianBlur(a,(0,0),1.5); b=cv2.GaussianBlur(b,(0,0),1.5)
win=cv2.createHanningWindow((T,T),cv2.CV_32F)
rows=[]
for y in range(0,946-T+1,T//2):
    row=[]
    for x in range(0,2206-T+1,T//2):
        A=a[y:y+T,x:x+T]; B=b[y:y+T,x:x+T]
        if B.std()<6 or A.std()<6: row.append('   .   '); continue
        (dx,dy),r=cv2.phaseCorrelate(B,A,win)
        if r<0.08: row.append('   ?   '); continue
        row.append(f'{dx:+3.0f},{dy:+3.0f}')
    rows.append(f'y{y+T//2:4d} '+' '.join(row))
print(f'k {k}: render shift vs source, tile {T}, x centres ' + ' '.join(f'{x+T//2}' for x in range(0,2206-T+1,T//2)))
print('\n'.join(rows))
