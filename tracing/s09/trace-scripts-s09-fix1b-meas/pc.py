import cv2, numpy as np, sys
regs = {'beanie':(20,20,440,540), 'cuff':(0,280,470,560), 'hairL':(120,600,560,946), 'cheek':(0,650,200,946), 'hairR':(420,520,780,800)}
def g(n): return cv2.cvtColor(cv2.imread(f'../s09-rev1-r3-src/f{n:04d}.png'), cv2.COLOR_BGR2GRAY).astype(np.float32)
base = g(815)
win = {}
print('frame t ' + ' '.join(f'{k:>14s}' for k in regs))
for n in range(815, 841):
    a = g(n); row = []
    for k, (x0,y0,x1,y1) in regs.items():
        A = base[y0:y1,x0:x1]; B = a[y0:y1,x0:x1]
        if k not in win: win[k] = cv2.createHanningWindow((x1-x0, y1-y0), cv2.CV_32F)
        (dx, dy), r = cv2.phaseCorrelate(A, B, win[k])
        row.append(f'{dx:6.2f},{dy:6.2f}')
    print(n, f'{n/25:.2f}', ' '.join(f'{s:>14s}' for s in row))
