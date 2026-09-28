import cv2, numpy as np, sys, glob, math
sys.path.insert(0,'.')
from src_frames import get
d,P=sys.argv[1],float(sys.argv[2]); T=int(sys.argv[3]) if len(sys.argv)>3 else 128
f=[f for f in glob.glob(d+'/frame-*.png') if abs(float(f.split('-at-')[1][:-5])-P)<1e-4][0]
k=math.ceil(math.floor(P*30+1e-6)/30*25-1e-6)
a=cv2.imread(f).astype(np.float32).mean(2); b=get(k).astype(np.float32).mean(2)
a=cv2.GaussianBlur(a,(0,0),1.5); b=cv2.GaussianBlur(b,(0,0),1.5)
win=cv2.createHanningWindow((T,T),cv2.CV_32F)
rows=[]
bad=[]
for y in range(0,946-T+1,T//2):
    row=[]
    for x in range(0,2206-T+1,T//2):
        A=a[y:y+T,x:x+T]; B=b[y:y+T,x:x+T]
        if B.std()<6 or A.std()<6: row.append('   .   '); continue
        (dx,dy),r=cv2.phaseCorrelate(B,A,win)
        if r<0.08: row.append('   ?   '); continue
        row.append(f'{dx:+3.0f},{dy:+3.0f}')
        if math.hypot(dx,dy)>=3 and r>0.15: bad.append((x+T//2,y+T//2,round(dx,1),round(dy,1),round(r,2)))
    rows.append(f'y{y+T//2:4d} '+' '.join(row))
print(f'P {P} k {k}: shift of render vs source (px), tile {T}, step {T//2}; x centres from {T//2}')
print('\n'.join(rows))
print('tiles with |shift|>=3:',bad)
