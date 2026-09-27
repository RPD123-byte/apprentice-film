import cv2, numpy as np
regs = {'beanie':(20,20,440,540), 'cuff':(0,280,470,560), 'hairL':(120,600,560,946), 'cheek':(0,650,200,946), 'hairR':(420,540,680,760), 'crown':(20,0,380,270)}
def g(n): return cv2.cvtColor(cv2.imread(f'../s09-rev1-r3-src/f{n:04d}.png'), cv2.COLOR_BGR2GRAY).astype(np.float32)
base = g(815)
win = {k: cv2.createHanningWindow((x1-x0, y1-y0), cv2.CV_32F) for k,(x0,y0,x1,y1) in regs.items()}
rows = []
for n in range(815, 840):
    a = g(n); A = []; b = []
    res = {}
    for k,(x0,y0,x1,y1) in regs.items():
        (dx, dy), r = cv2.phaseCorrelate(base[y0:y1,x0:x1], a[y0:y1,x0:x1], win[k])
        xc, yc = (x0+x1)/2, (y0+y1)/2
        A.append([1, 0, -yc]); b.append(dx)
        A.append([0, 1, xc]); b.append(dy)
        res[k] = (dx, dy, xc, yc)
    A = np.array(A); b = np.array(b)
    sol, *_ = np.linalg.lstsq(A, b, rcond=None)
    tx, ty, th = sol
    resid = A @ sol - b
    rows.append((n/25, tx, ty, np.degrees(th)))
    print(f'{n/25:.2f} tx {tx:6.2f} ty {ty:6.2f} rot {np.degrees(th):6.3f}  resid rms {np.sqrt((resid**2).mean()):.2f} max {np.abs(resid).max():.2f}')
print('[' + ', '.join(f'[{t:.2f}, {tx:.2f}, {ty:.2f}, {r:.3f}]' for t,tx,ty,r in rows) + ']')
