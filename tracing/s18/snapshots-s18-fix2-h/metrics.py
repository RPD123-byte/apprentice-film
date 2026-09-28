import cv2, numpy as np, sys, re, argparse
# metrics.py DIR [--box x0 y0 x1 y1] [--reg] [--frames a-b] [--q]   (reg: box registered on PATH_A, shot A frames)
ap=argparse.ArgumentParser(); ap.add_argument('d'); ap.add_argument('--box',nargs=4,type=int); ap.add_argument('--reg',action='store_true')
ap.add_argument('--frames',default='1331-1432'); ap.add_argument('--q',action='store_true'); a=ap.parse_args()
txt=open('../../src/shots/s18/shotA.js').read()
PATH=eval(re.search(r'PATH_A = (\[.*?\]);', txt, re.S).group(1)); P={r[0]:(r[1],r[2]) for r in PATH}
fr=[]
for p in a.frames.split(','):
    if '-' in p: x,y=map(int,p.split('-')); fr+=list(range(x,y+1))
    else: fr.append(int(p))
rows=[]
for n in fr:
    r=cv2.imread('%s/r%d.png'%(a.d,n),0); s=cv2.imread('../s18-fix2-src/f%04d.png'%n,0)
    if r is None or s is None: continue
    r=r.astype(np.float32); s=s.astype(np.float32)
    if a.box:
        x0,y0,x1,y1=a.box
        if a.reg and n in P: dx,dy=P[n]; x0+=dx;x1+=dx;y0+=dy;y1+=dy
        x0=max(0,x0);y0=max(0,y0);x1=min(2206,x1);y1=min(946,y1)
        if x1<=x0 or y1<=y0: continue
        sl=(slice(y0,y1),slice(x0,x1))
    else: sl=(slice(None),slice(None))
    if a.box:
        X0=max(0,x0-40);Y0=max(0,y0-40);X1=min(2206,x1+40);Y1=min(946,y1+40)
        rc=r[Y0:Y1,X0:X1]; sc_=s[Y0:Y1,X0:X1]; sl2=(slice(y0-Y0,y1-Y0),slice(x0-X0,x1-X0))
    else: rc=r; sc_=s; sl2=sl
    e6=np.abs(cv2.GaussianBlur(rc,(0,0),6)-cv2.GaussianBlur(sc_,(0,0),6))[sl2].mean()
    e2=np.abs(cv2.GaussianBlur(rc,(0,0),2)-cv2.GaussianBlur(sc_,(0,0),2))[sl2].mean()
    rows.append((n,e6,e2,r[sl].mean()-s[sl].mean()))
    if not a.q: print(f"{n} s6={e6:5.2f} s2={e2:5.2f} dmean={r[sl].mean()-s[sl].mean():+6.2f}")
A=np.array([x[1:] for x in rows])
print('%s n=%d mean s6 %.2f max %.2f | s2 %.2f | dmean %+.2f'%(a.d,len(rows),A[:,0].mean(),A[:,0].max(),A[:,1].mean(),A[:,2].mean()))
