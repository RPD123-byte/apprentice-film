import cv2, glob, re, numpy as np, sys
d='snapshots/s19-rev2-cmp'
ts=sys.argv[1].split(',')
C=100
acc=None; accs=None
for t in ts:
    f=glob.glob(f'{d}/frame-*-at-{t}s.png')[0]
    r=cv2.GaussianBlur(cv2.imread(f,0).astype(np.float32),(0,0),8); s=cv2.GaussianBlur(cv2.imread(f.replace('frame-','ref-'),0).astype(np.float32),(0,0),8)
    a=np.abs(r-s); sd=r-s
    acc=a if acc is None else acc+a; accs=sd if accs is None else accs+sd
acc/=len(ts); accs/=len(ts)
H,W=acc.shape
cells=[]
for y in range(0,H,C):
    for x in range(0,W,C):
        cells.append((acc[y:y+C,x:x+C].mean(),accs[y:y+C,x:x+C].mean(),x,y))
cells.sort(reverse=True)
for c in cells[:int(sys.argv[2]) if len(sys.argv)>2 else 15]: print('cell x%4d-%4d y%3d-%3d  |d|=%5.1f  signed(r-s)=%+6.1f'%(c[2],c[2]+C,c[3],c[3]+C,c[0],c[1]))
v=np.clip(acc*4,0,255).astype(np.uint8); v=cv2.applyColorMap(v,cv2.COLORMAP_JET)
cv2.imwrite(sys.argv[3] if len(sys.argv)>3 else 'snapshots/s19-rev2-ana/heat.jpg',cv2.resize(v,None,fx=0.4,fy=0.4))
